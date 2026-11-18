export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private musicTimer = 0;
  private note = 0;
  private musicOn = false;
  private muted = false;
  musicVolume = 0.45;
  sfxVolume = 0.8;

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch { /* Web Audio unavailable */ }
  }

  setVolumes(music: number, sfx: number, muted: boolean) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.musicBus.gain.value = this.musicVolume;
    this.sfxBus.gain.value = this.sfxVolume;
  }

  startMusic() { this.musicOn = true; this.musicTimer = 0; }
  stopMusic() { this.musicOn = false; }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, bus: GainNode | null = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus ?? this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  private noise(dur: number, freq: number, vol: number, type: BiquadFilterType = 'bandpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(t); s.stop(t + dur);
  }

  play(name: string) {
    if (!this.ctx) return;
    switch (name) {
      case 'hit': this.noise(0.1, 900, 0.28); this.tone(180, 0.09, 'square', 0.09); break;
      case 'heavy': this.noise(0.18, 420, 0.38); this.tone(90, 0.2, 'sawtooth', 0.16); break;
      case 'special': this.tone(220, 0.22, 'sawtooth', 0.14); this.tone(440, 0.2, 'square', 0.08, 0.05); break;
      case 'assist': this.tone(330, 0.1, 'square', 0.11); this.tone(660, 0.16, 'square', 0.09, 0.08); break;
      case 'fight': this.tone(523, 0.12, 'square', 0.14); this.tone(784, 0.22, 'square', 0.12, 0.1); break;
      case 'round': this.tone(392, 0.12, 'square', 0.12); break;
      case 'ko': this.noise(0.4, 250, 0.35); this.tone(70, 0.45, 'sawtooth', 0.2); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'square', 0.13, i * 0.14)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.13, i * 0.2)); break;
      case 'select': this.tone(620, 0.07, 'square', 0.09); break;
      case 'menu': this.tone(440, 0.06, 'square', 0.07); break;
      case 'charge': this.tone(180, 0.25, 'sawtooth', 0.07); break;
      default: break;
    }
  }

  update(dt: number) {
    if (!this.ctx || !this.musicOn) return;
    const melody = [262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 523, 494, 392, 349, 294];
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = 0.21;
      const f = melody[this.note % melody.length];
      this.tone(f, 0.18, 'square', 0.055, 0, this.musicBus);
      if (this.note % 4 === 0) this.tone(f / 2, 0.2, 'triangle', 0.045, 0, this.musicBus);
      this.note++;
    }
  }
}
