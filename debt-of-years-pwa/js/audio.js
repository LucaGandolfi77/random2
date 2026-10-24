import { readMuted, writeMuted } from './systems/save.js';

let ctx = null;
let muted = readMuted();

export function initAudio() {
  if (!ctx) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    } catch (err) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  writeMuted(muted);
  if (!muted) initAudio();
  return muted;
}

function tone(freq, duration, type = 'sine', volume = 0.04, slideTo = null) {
  if (!ctx || muted) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.03);
  } catch (err) {
    // Audio is optional.
  }
}

export function sfx(name) {
  if (!ctx || muted) return;
  switch (name) {
    case 'tap':
      tone(520, 0.05, 'sine', 0.022);
      break;
    case 'page':
      tone(760, 0.06, 'triangle', 0.016);
      break;
    case 'draw':
      tone(150, 0.42, 'sawtooth', 0.035, 62);
      break;
    case 'hit':
      tone(90, 0.13, 'square', 0.04, 55);
      break;
    case 'heal':
      tone(430, 0.2, 'sine', 0.03, 640);
      break;
    case 'win':
      tone(392, 0.14, 'triangle', 0.03);
      setTimeout(() => tone(523, 0.16, 'triangle', 0.03), 120);
      setTimeout(() => tone(659, 0.3, 'triangle', 0.03), 250);
      break;
    case 'lose':
      tone(220, 0.2, 'sawtooth', 0.03, 140);
      setTimeout(() => tone(110, 0.4, 'sawtooth', 0.03, 70), 160);
      break;
    case 'bell':
      tone(880, 0.5, 'sine', 0.025);
      break;
    default:
      break;
  }
}
