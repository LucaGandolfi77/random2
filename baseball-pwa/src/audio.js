/* ===== DIAMOND POLY '99 · WebAudio Synthesized Stadium Sound Engine ===== */
let ac = null;

function ctx() {
  try {
    if (window.R2 && window.R2.getSettings && !window.R2.getSettings().sound) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ac) ac = new AC();
    if (ac.state === "suspended") ac.resume();
    return ac;
  } catch (e) {
    return null;
  }
}

export function sfxPitchWhoosh() {
  const c = ctx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(280, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(110, c.currentTime + 0.22);
    g.gain.setValueAtTime(0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.22);
  } catch (e) {}
}

export function sfxSwingMiss() {
  const c = ctx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(190, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(65, c.currentTime + 0.16);
    g.gain.setValueAtTime(0.14, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.16);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.16);
  } catch (e) {}
}

export function sfxBatCrack(power = 1.0, alloy = false) {
  const c = ctx();
  if (!c) return;
  try {
    const now = c.currentTime;
    // Percussive wooden crack / alloy ping
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = alloy ? "sine" : "square";
    o.frequency.setValueAtTime(alloy ? 1120 : 520 * power, now);
    o.frequency.exponentialRampToValueAtTime(alloy ? 680 : 120, now + (alloy ? 0.28 : 0.11));
    g.gain.setValueAtTime(Math.min(0.32, 0.22 * power), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (alloy ? 0.28 : 0.12));
    o.connect(g);
    g.connect(c.destination);
    o.start(now);
    o.stop(now + (alloy ? 0.28 : 0.12));

    if (window.R2 && window.R2.buzz) {
      window.R2.buzz(power > 1.1 ? [35, 30, 60] : 25);
    }
  } catch (e) {}
}

export function sfxMittPop() {
  const c = ctx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(48, c.currentTime + 0.09);
    g.gain.setValueAtTime(0.18, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.09);
  } catch (e) {}
}

export function sfxStep() {
  const c = ctx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(115, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(55, c.currentTime + 0.05);
    g.gain.setValueAtTime(0.07, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.05);
  } catch (e) {}
}

export function sfxSlide() {
  const c = ctx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const bufSize = c.sampleRate * 0.22;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const g = c.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(now);
    if (window.R2 && window.R2.buzz) window.R2.buzz(30);
  } catch (e) {}
}

export function sfxOrganCharge() {
  const c = ctx();
  if (!c) return;
  const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
  const durs  = [0.11,   0.11,   0.11,   0.22,   0.11,   0.38];
  let t = c.currentTime;
  notes.forEach((f, idx) => {
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + durs[idx]);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + durs[idx]);
      t += durs[idx] * 1.05;
    } catch (e) {}
  });
}

export function sfxCrowdCheer() {
  const c = ctx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const dur = 0.9;
    const bufSize = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.sin((i / bufSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.5;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1100;
    const g = c.createGain();
    g.gain.setValueAtTime(0.14, now);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(now);

    // Triumphant brass chord
    [261.63, 329.63, 392.0, 523.25].forEach((freq) => {
      const o = c.createOscillator();
      const og = c.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, now);
      og.gain.setValueAtTime(0.05, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      o.connect(og);
      og.connect(c.destination);
      o.start(now);
      o.stop(now + 0.75);
    });
  } catch (e) {}
}

export function sfxUmpireOut() {
  const c = ctx();
  if (!c) return;
  try {
    const now = c.currentTime;
    [220, 164.81].forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, now + i * 0.12);
      g.gain.setValueAtTime(0.08, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.18);
      o.connect(g);
      g.connect(c.destination);
      o.start(now + i * 0.12);
      o.stop(now + i * 0.12 + 0.18);
    });
  } catch (e) {}
}
