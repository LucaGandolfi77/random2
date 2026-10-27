/*
 * CORE 9 — sound.
 *
 * No audio files. A low reactor bed whose pitch and level follow output,
 * plus short synthesised clanks and invoices. The ambient graph starts only
 * after the first gesture, because every mobile browser insists on it.
 */

let ctx = null;
let master = null;
let humGain = null;
let humOsc = null;
let humOsc2 = null;
let humFilter = null;
let enabled = true;
let started = false;

function settings() {
  if (globalThis.R2 && typeof globalThis.R2.getSettings === "function") {
    try { return globalThis.R2.getSettings(); } catch (e) { /* ignore */ }
  }
  return { sound: true };
}

function ensure() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.55 : 0;
    master.connect(ctx.destination);
    return ctx;
  } catch (e) {
    ctx = null;
    return null;
  }
}

function tone(freq, duration, type = "sine", gain = 0.12, slideTo = null, delay = 0) {
  if (!enabled || !settings().sound) return;
  const c = ensure();
  if (!c || c.state === "suspended") return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch (e) { /* audio is optional */ }
}

function noise(duration, gain = 0.06, cutoff = 1200) {
  if (!enabled || !settings().sound) return;
  const c = ensure();
  if (!c || c.state === "suspended") return;
  try {
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.82 + white * 0.18;
      data[i] = last;
    }
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  } catch (e) { /* ignore */ }
}

export function init() {
  const c = ensure();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function startAmbient() {
  const c = ensure();
  if (!c || started) return;
  started = true;
  try {
    humFilter = c.createBiquadFilter();
    humFilter.type = "lowpass";
    humFilter.frequency.value = 180;
    humFilter.Q.value = 0.7;
    humGain = c.createGain();
    humGain.gain.value = 0.0001;
    humOsc = c.createOscillator();
    humOsc.type = "sine";
    humOsc.frequency.value = 42;
    humOsc2 = c.createOscillator();
    humOsc2.type = "triangle";
    humOsc2.frequency.value = 63;
    humOsc.connect(humGain);
    humOsc2.connect(humGain);
    humGain.connect(humFilter);
    humFilter.connect(master);
    humOsc.start();
    humOsc2.start();
  } catch (e) { started = false; }
}

export function setOutput(mw, online) {
  if (!started || !ctx || !humGain) return;
  try {
    const t = ctx.currentTime;
    const level = online ? Math.min(0.018, 0.0015 + Math.log10(1 + Math.max(0, mw)) * 0.006) : 0.0002;
    humGain.gain.setTargetAtTime(level, t, 1.2);
    if (humOsc) humOsc.frequency.setTargetAtTime(42 + Math.min(10, mw * 0.05), t, 1.5);
    if (humOsc2) humOsc2.frequency.setTargetAtTime(63 + Math.min(14, mw * 0.07), t, 1.5);
    if (humFilter) humFilter.frequency.setTargetAtTime(130 + Math.min(260, mw * 1.4), t, 1.5);
  } catch (e) { /* ignore */ }
}

export function setEnabled(on) {
  enabled = Boolean(on);
  if (master && ctx) {
    try { master.gain.setTargetAtTime(enabled ? 0.55 : 0, ctx.currentTime, 0.08); } catch (e) {}
  }
}

export function isEnabled() { return enabled; }

export const Sound = {
  ui() { tone(520, 0.045, "square", 0.035); },
  open() { tone(340, 0.06, "triangle", 0.04, 440); },
  close() { tone(300, 0.06, "triangle", 0.035, 240); },
  build() {
    noise(0.28, 0.055, 500);
    tone(90, 0.22, "triangle", 0.16, 60);
    tone(220, 0.1, "square", 0.05, 180, 0.08);
  },
  upgrade() {
    noise(0.18, 0.035, 900);
    tone(180, 0.16, "triangle", 0.12, 260);
    tone(520, 0.08, "sine", 0.06, 660, 0.1);
  },
  collect() {
    tone(880, 0.07, "sine", 0.08, 1100);
    tone(1320, 0.09, "sine", 0.06, 1560, 0.06);
  },
  research() {
    tone(440, 0.1, "sine", 0.08, 660);
    tone(660, 0.12, "sine", 0.06, 880, 0.08);
  },
  error() { tone(120, 0.14, "square", 0.07, 90); },
  alarm() {
    tone(680, 0.12, "square", 0.08, 520);
    tone(520, 0.12, "square", 0.08, 680, 0.14);
  },
  event() {
    tone(240, 0.18, "sawtooth", 0.06, 300);
    tone(180, 0.2, "sine", 0.08, 150, 0.1);
  },
  prestige() {
    [262, 330, 392, 523].forEach((f, i) => tone(f, 0.45, "sine", 0.07, null, i * 0.09));
    noise(0.6, 0.05, 620);
  },
  overclock() {
    tone(140, 0.5, "sawtooth", 0.06, 420);
    noise(0.4, 0.04, 1500);
  },
};
