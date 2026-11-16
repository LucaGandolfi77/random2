/*
 * Tiny WebAudio synth. No files, no network, no music that overstays.
 * The AudioContext is created only after a real gesture so iOS is happy.
 */

let ctx = null;
let soundEnabled = true;
let hapticsEnabled = true;
let master = null;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
}

export function setSoundEnabled(value) {
  soundEnabled = Boolean(value);
}

export function setHapticsEnabled(value) {
  hapticsEnabled = Boolean(value);
}

export function haptic(pattern) {
  if (!hapticsEnabled) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* Haptics are a bonus, not a contract. */
  }
}

function note(freq, duration, { type = "sine", gain = 0.045, delay = 0, endFreq = null } = {}) {
  if (!soundEnabled) return;
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, freq), start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export function sfx(name) {
  if (!soundEnabled) return;
  switch (name) {
    case "tap":
      note(640, 0.045, { type: "triangle", gain: 0.025 });
      break;
    case "place":
      note(520, 0.09, { type: "sine", gain: 0.035 });
      note(780, 0.12, { type: "sine", gain: 0.03, delay: 0.055 });
      break;
    case "hint":
      note(440, 0.08, { type: "triangle", gain: 0.025 });
      note(660, 0.16, { type: "triangle", gain: 0.022, delay: 0.07 });
      break;
    case "wrong":
      note(180, 0.16, { type: "sawtooth", gain: 0.028, endFreq: 95 });
      note(90, 0.2, { type: "triangle", gain: 0.03, delay: 0.04 });
      break;
    case "run":
      note(220, 0.18, { type: "sine", gain: 0.025, endFreq: 660 });
      break;
    case "success":
      [523.25, 659.25, 783.99].forEach((f, i) =>
        note(f, 0.3, { type: "sine", gain: 0.04, delay: i * 0.09 })
      );
      break;
    case "star":
      note(1046, 0.18, { type: "triangle", gain: 0.025 });
      break;
    case "bossHit":
      note(140, 0.2, { type: "square", gain: 0.03, endFreq: 75 });
      note(280, 0.07, { type: "triangle", gain: 0.025 });
      break;
    case "hurt":
      note(300, 0.22, { type: "sawtooth", gain: 0.025, endFreq: 120 });
      break;
    case "win":
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        note(f, 0.42, { type: "sine", gain: 0.035, delay: i * 0.12 })
      );
      break;
    case "page":
      note(880, 0.04, { type: "triangle", gain: 0.018 });
      break;
    case "modal":
      note(330, 0.08, { type: "sine", gain: 0.025 });
      break;
    default:
      break;
  }
}
