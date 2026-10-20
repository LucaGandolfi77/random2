// ============================================================
// AUDIO — Web Audio SFX
// ============================================================
const AUD = { ctx: null };

function audioInit() {
  AUD.ctx = new (window.AudioContext || window.webkitAudioContext)();
}

function resumeAudio() {
  if (AUD.ctx && AUD.ctx.state === 'suspended') AUD.ctx.resume();
}

function beep(freq = 440, duration = 0.1, type = 'sine', vol = 0.05) {
  resumeAudio();
  const osc = AUD.ctx.createOscillator();
  const gain = AUD.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, AUD.ctx.currentTime);
  gain.gain.setValueAtTime(vol, AUD.ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, AUD.ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(AUD.ctx.destination);
  osc.start();
  osc.stop(AUD.ctx.currentTime + duration);
}

function sfxRiser() {
  resumeAudio();
  const osc = AUD.ctx.createOscillator();
  const gain = AUD.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, AUD.ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(880, AUD.ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.06, AUD.ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, AUD.ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(AUD.ctx.destination);
  osc.start();
  osc.stop(AUD.ctx.currentTime + 0.5);
}

function sfxPortal() {
  resumeAudio();
  const osc = AUD.ctx.createOscillator();
  const gain = AUD.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, AUD.ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(340, AUD.ctx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.03, AUD.ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, AUD.ctx.currentTime + 0.6);
  osc.connect(gain);
  gain.connect(AUD.ctx.destination);
  osc.start();
  osc.stop(AUD.ctx.currentTime + 0.6);
}

function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine', 0.06), i * 120));
}
