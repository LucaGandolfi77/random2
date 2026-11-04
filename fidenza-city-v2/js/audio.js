import { isAudioEnabled, setAudioEnabled } from './save.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = !isAudioEnabled();
    this.engine = null;
    this.ambient = null;
    this.started = false;
    this._ambientTimer = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master.connect(comp).connect(this.ctx.destination);
    this._createAmbient();
    this.started = true;
  }

  _createAmbient() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      data[i] = last * 1.8;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this.ambient = { src, filter, gain };
  }

  setMuted(muted) {
    this.muted = !!muted;
    setAudioEnabled(!this.muted);
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime + 0.18);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setZone(zone = 'city') {
    if (!this.ctx || !this.ambient) return;
    const presets = {
      city: { gain: 0.05, freq: 430 },
      center: { gain: 0.045, freq: 520 },
      station: { gain: 0.075, freq: 260 },
      park: { gain: 0.032, freq: 900 },
      stirone: { gain: 0.038, freq: 800 },
      festival: { gain: 0.085, freq: 620 }
    };
    const preset = presets[zone] || presets.city;
    const now = this.ctx.currentTime;
    this.ambient.gain.gain.cancelScheduledValues(now);
    this.ambient.filter.frequency.cancelScheduledValues(now);
    this.ambient.gain.gain.linearRampToValueAtTime(this.muted ? 0 : preset.gain, now + 1.2);
    this.ambient.filter.frequency.linearRampToValueAtTime(preset.freq, now + 1.2);
    this.zone = zone;
  }

  stationChime() {
    if (!this.ctx || this.muted) return;
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.38, 'sine', 0.045, null, i * 0.13));
    this.tone(1046.5, 0.45, 'sine', 0.03, null, 0.42);
  }

  festivalChime() {
    if (!this.ctx || this.muted) return;
    [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.045, null, i * 0.14));
    this.tone(1046.5, 0.6, 'sine', 0.025, null, 0.6);
  }

  firework() {
    if (!this.ctx || this.muted) return;
    this.noiseBurst(0.7, 0.08, 260);
    this.tone(65, 0.55, 'sine', 0.09, 34);
    this.tone(120, 0.32, 'triangle', 0.04, 48, 0.08);
  }

  _now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(freq, duration = 0.18, type = 'sine', volume = 0.12, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noiseBurst(duration = 0.2, volume = 0.08, filterFreq = 1200) {
    if (!this.ctx || this.muted) return;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
  }

  click() {
    this.tone(660, 0.05, 'triangle', 0.045, 880);
  }

  star() {
    this.tone(880, 0.12, 'sine', 0.1, 1320);
    this.tone(1320, 0.16, 'sine', 0.07, 1760, 0.08);
  }

  place() {
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.055, null, i * 0.1));
  }

  missionComplete() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.42, 'triangle', 0.07, null, i * 0.12));
  }

  missionFail() {
    this.tone(330, 0.3, 'sawtooth', 0.06, 180);
    this.tone(220, 0.4, 'triangle', 0.05, 140, 0.18);
  }

  enterVehicle(type = 'car') {
    this.noiseBurst(0.12, 0.05, 500);
    this.tone(type === 'vespa' ? 196 : 130, 0.22, 'sawtooth', 0.06, type === 'vespa' ? 260 : 180);
  }

  exitVehicle() {
    this.noiseBurst(0.1, 0.04, 700);
    this.tone(180, 0.12, 'triangle', 0.04, 120);
  }

  horn(freq = 392) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    for (const f of [freq, freq * 1.26]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.015);
      gain.gain.setValueAtTime(0.05, t0 + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      osc.connect(gain).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + 0.42);
    }
  }

  startEngine(type = 'car') {
    if (!this.ctx) return;
    if (this.engine) this.stopEngine();
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc.frequency.value = type === 'vespa' ? 90 : 60;
    osc2.frequency.value = type === 'vespa' ? 180 : 120;
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 1.2;
    gain.gain.value = 0;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(this.master);
    osc.start();
    osc2.start();
    gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 0.2);
    this.engine = { osc, osc2, filter, gain, type };
  }

  updateEngine(speed, throttle = 0) {
    if (!this.engine || !this.ctx) return;
    const t = this.ctx.currentTime;
    const base = this.engine.type === 'vespa' ? 82 : 55;
    const f = base + Math.abs(speed) * (this.engine.type === 'vespa' ? 9 : 5.5) + throttle * 8;
    this.engine.osc.frequency.setTargetAtTime(f, t, 0.08);
    this.engine.osc2.frequency.setTargetAtTime(f * 2.02, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(360 + Math.abs(speed) * 45, t, 0.1);
    this.engine.gain.gain.setTargetAtTime(this.muted ? 0 : 0.025 + Math.abs(speed) * 0.0018, t, 0.1);
  }

  stopEngine() {
    if (!this.engine || !this.ctx) return;
    const { osc, osc2, gain } = this.engine;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, 0.08);
    try { osc.stop(t + 0.3); osc2.stop(t + 0.3); } catch { /* ignore */ }
    this.engine = null;
  }

  ambientUpdate(dt, night = false, wind = 0) {
    if (!this.ctx || !this.ambient) return;
    const t = this.ctx.currentTime;
    this.ambient.gain.gain.setTargetAtTime(this.muted ? 0 : (night ? 0.035 : 0.055) + wind * 0.02, t, 0.3);
    this.ambient.filter.frequency.setTargetAtTime(night ? 280 : 460, t, 1.0);
    this._ambientTimer -= dt;
    if (this._ambientTimer <= 0) {
      this._ambientTimer = 8 + Math.random() * 16;
      if (!this.muted && !night) {
        const base = 1800 + Math.random() * 1400;
        this.tone(base, 0.07, 'sine', 0.012, base * 1.3);
        this.tone(base * 1.1, 0.06, 'sine', 0.009, base * 1.4, 0.09);
      }
    }
  }
}
