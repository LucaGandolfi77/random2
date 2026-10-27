/*
 * Procedural audio. No files: a low industrial drone, a four-note lullaby
 * and a handful of servo/impact sounds. The lullaby is the only motif that
 * follows the story, and it gets slower in the last chapters.
 */
export class Audio {
  constructor(settings = {}) {
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.enabled = settings.sound !== false;
    this.music = settings.music !== false;
    this.sadness = 0;
    this._started = false;
  }

  init() {
    if (this._started) {
      if (this.ctx?.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.38;
      this.master.connect(this.ctx.destination);
      this._buildAmbient();
      this._started = true;
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(on) {
    this.enabled = Boolean(on);
    if (this.master) this.master.gain.value = this.enabled ? 0.38 : 0;
  }

  setMusic(on) {
    this.music = Boolean(on);
    if (this.ambient) this.ambient.gain.value = this.music ? 0.022 : 0;
  }

  setSadness(v) {
    this.sadness = Math.max(0, Math.min(1, v));
  }

  _buildAmbient() {
    if (!this.ctx || !this.master) return;
    const g = this.ctx.createGain();
    g.gain.value = this.music ? 0.022 : 0;
    g.connect(this.master);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    filter.Q.value = 1.4;
    filter.connect(g);

    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 44;
    const o2 = this.ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = 65.7;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 7;
    lfo.connect(lfoGain);
    lfoGain.connect(o2.frequency);

    o1.connect(filter);
    o2.connect(filter);
    o1.start();
    o2.start();
    lfo.start();
    this.ambient = g;

    const pulse = this.ctx.createGain();
    pulse.gain.value = 0;
    pulse.connect(g);
    const po = this.ctx.createOscillator();
    po.type = 'square';
    po.frequency.value = 112;
    po.connect(pulse);
    po.start();
    // A slow mechanical heartbeat, almost below hearing.
    setInterval(() => {
      if (!this.ctx || !this.music) return;
      const t = this.ctx.currentTime;
      pulse.gain.cancelScheduledValues(t);
      pulse.gain.setValueAtTime(0.0001, t);
      pulse.gain.exponentialRampToValueAtTime(0.02, t + 0.02);
      pulse.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    }, 4200);
  }

  play(name) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const map = {
      tap: [520, 0.04, 'triangle', 0.035],
      click: [680, 0.05, 'square', 0.025],
      build: [120, 0.22, 'sawtooth', 0.07],
      upgrade: [740, 0.14, 'square', 0.04],
      coin: [1040, 0.08, 'triangle', 0.04],
      train: [420, 0.09, 'sine', 0.035],
      complete: [880, 0.12, 'triangle', 0.05],
      battle: [82, 0.34, 'sawtooth', 0.08],
      hit: [160, 0.08, 'square', 0.05],
      win: [523, 0.16, 'triangle', 0.05],
      lose: [180, 0.28, 'sine', 0.05],
      error: [110, 0.18, 'sawtooth', 0.05],
      story: [330, 0.32, 'sine', 0.035],
      prestige: [196, 0.8, 'sine', 0.06],
      eco: [1046, 0.2, 'church bell', 0.04],
    };
    const spec = map[name];
    if (!spec) return;
    if (spec[2] === 'church bell') {
      this.motif([1046, 1318, 1568], 0.65);
      return;
    }
    this._tone(spec[0], spec[1], spec[2], spec[3]);
    if (name === 'win') this.motif([523, 659, 784, 1047], 0.12);
    if (name === 'prestige') this.motif([196, 261, 329, 392], 0.42);
  }

  motif(notes = [440, 523, 659, 587], spacing = 0.24) {
    if (!this.enabled || !this.music) return;
    this.init();
    if (!this.ctx) return;
    const slow = 1 + this.sadness * 0.8;
    notes.forEach((f, i) => {
      const t = this.ctx.currentTime + i * spacing * slow;
      this._tone(f, 0.5 * slow, 'sine', 0.022, t);
      this._tone(f / 2, 0.65 * slow, 'triangle', 0.012, t + 0.02);
    });
  }

  _tone(freq, duration, type, gain, when = null) {
    if (!this.ctx || !this.master) return;
    const t = when ?? this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type === 'church bell' ? 'sine' : type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(Math.max(0.0001, gain), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.02);
  }
}
