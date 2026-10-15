/*
 * Tiny WebAudio synth — no assets, no dependencies.
 * whistle(): kickoff / full time   cheer(): goal   thud(): miss   blip(): UI
 * Muted state persists in localStorage ('nss-sound').
 */
let ctx: AudioContext | null = null;
let muted = (() => {
  try { return localStorage.getItem('nss-sound') === 'off'; } catch { return false; }
})();

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try { localStorage.setItem('nss-sound', muted ? 'off' : 'on'); } catch { /* ignore */ }
  if (!muted) blip(660);
  return muted;
}

/** Referee whistle: two quick square sweeps. */
export function whistle() {
  const c = ac();
  if (!c) return;
  for (const t of [0, 0.22]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(2350, c.currentTime + t);
    o.frequency.exponentialRampToValueAtTime(2100, c.currentTime + t + 0.16);
    g.gain.setValueAtTime(0.06, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.18);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.2);
  }
}

/** Crowd cheer: filtered noise swell. */
export function cheer() {
  const c = ac();
  if (!c) return;
  const dur = 1.1;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0.001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start();
}

/** Miss / tackle thud: low triangle. */
export function thud() {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(160, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(70, c.currentTime + 0.18);
  g.gain.setValueAtTime(0.12, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.22);
}

/** Tiny UI blip. */
export function blip(freq = 520) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.05, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.12);
}
