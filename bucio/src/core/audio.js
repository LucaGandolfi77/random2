/**
 * Audio 100% sintetico (WebAudio): nessun file, nessun peso.
 * Un "glurp" filtrato quando divori, toni che salgono con la combo,
 * un ronzio quando cresci, tuono e jingle a fine partita.
 */
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
    this.master = null;
    this._ambientNodes = null;
  }

  /** Va chiamato dopo un gesto utente (vincolo autoplay dei browser). */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    this.master.connect(this.ctx.destination);
    this.ready = true;
    this._ambient();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) {
      this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
    }
  }

  _now() {
    return this.ctx.currentTime;
  }

  _noiseBuffer(dur = 1) {
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Onda marina di sottofondo: rumore filtrato con lentissimo LFO. */
  _ambient() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(4);
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = this.ctx.createGain();
    g.gain.value = 0.055;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 0.03;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(lp).connect(g).connect(this.master);
    src.start();
    lfo.start();
    this._ambientNodes = { src, g, lp };
  }

  /** Il rumore del buco che inghiotte: pitch down + filtro che si chiude. */
  glurp(pitch = 0, gain = 0.5) {
    if (!this.ready) return;
    const t = this._now();
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.3);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.2;
    const f0 = 420 * Math.pow(1.0595, pitch);
    bp.frequency.setValueAtTime(f0 * 1.6, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(70, f0 * 0.4), t + 0.24);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.3);
  }

  /** Nota sintetica breve, usata per combo e tier. */
  blip(freq, dur = 0.16, type = 'triangle', gain = 0.22, slide = 0) {
    if (!this.ready) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  combo(n) {
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const st = scale[Math.min(n - 1, scale.length - 1)] ?? 24;
    this.blip(392 * Math.pow(2, st / 12), 0.14, 'triangle', 0.16);
  }

  tier() {
    if (!this.ready) return;
    [0, 4, 7, 12].forEach((s, i) =>
      setTimeout(() => this.blip(392 * Math.pow(2, s / 12), 0.3, 'triangle', 0.2), i * 90)
    );
  }

  /** Tonfo quando un buco divora l'altro. */
  devour() {
    if (!this.ready) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.6);
    this.glurp(6, 0.5);
  }

  /** Morso: sei stato divorato da un rivale più grosso. */
  bite() {
    if (!this.ready) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.28);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.32);
  }

  gold() {
    if (!this.ready) return;
    [0, 5, 9, 12, 16].forEach((s, i) =>
      setTimeout(() => this.blip(523.25 * Math.pow(2, s / 12), 0.22, 'triangle', 0.2), i * 60)
    );
  }

  tick(last = false) {
    this.blip(last ? 880 : 620, last ? 0.3 : 0.08, 'square', last ? 0.22 : 0.12);
  }

  pulse() {
    if (!this.ready) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.42);
  }

  jingle(win) {
    if (!this.ready) return;
    const notes = win ? [0, 4, 7, 12, 16, 19] : [0, -2, -5, -9];
    notes.forEach((s, i) =>
      setTimeout(
        () => this.blip(392 * Math.pow(2, s / 12), 0.34, win ? 'triangle' : 'sine', 0.2),
        i * 130
      )
    );
  }

  whoosh() {
    if (!this.ready) return;
    const t = this._now();
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.5);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(300, t);
    hp.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.5);
  }
}
