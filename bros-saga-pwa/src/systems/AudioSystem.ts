export class AudioSystem {
  private ctx: AudioContext | null = null;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private master: GainNode | null = null;
  private timer = 0;
  private note = 0;
  private musicOn = false;
  volume = 0.8;

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    try {
      this.ctx = new AudioContext();
      const master = this.ctx.createGain();
      master.gain.value = this.volume;
      this.master = master;
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.35;
      this.sfxBus.gain.value = 0.8;
      this.musicBus.connect(master);
      this.sfxBus.connect(master);
      master.connect(this.ctx.destination);
    } catch { /* audio unavailable */ }
  }

  setVolume(v: number) { this.volume = v; if (this.master) this.master.gain.value = v; }
  music(on: boolean) { this.musicOn = on; this.timer = 0; }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, bus?: GainNode, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus ?? this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  play(name: string) {
    if (!this.ctx) return;
    switch (name) {
      case 'select': this.tone(660, 0.06, 'square', 0.1); break;
      case 'jump': this.tone(440, 0.12, 'sine', 0.12); this.tone(660, 0.12, 'sine', 0.08, undefined, 0.06); break;
      case 'hammer': this.tone(180, 0.14, 'square', 0.12); break;
      case 'hit': this.tone(260, 0.1, 'square', 0.14); break;
      case 'heavy': this.tone(120, 0.2, 'sawtooth', 0.18); break;
      case 'timing': this.tone(880, 0.08, 'square', 0.14); break;
      case 'miss': this.tone(160, 0.12, 'triangle', 0.1); break;
      case 'counter': this.tone(720, 0.1, 'square', 0.14); this.tone(980, 0.12, 'square', 0.1, undefined, 0.07); break;
      case 'hurt': this.tone(200, 0.16, 'sawtooth', 0.12); break;
      case 'warn': this.tone(330, 0.18, 'triangle', 0.11); break;
      case 'coin': this.tone(880, 0.08, 'square', 0.12); this.tone(1180, 0.14, 'square', 0.1, undefined, 0.07); break;
      case 'victory': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'square', 0.12, undefined, i * 0.12)); break;
      default: break;
    }
  }

  update(dt: number) {
    if (!this.ctx || !this.musicOn) return;
    const melody = [262, 330, 392, 523, 392, 330, 294, 349, 440, 349, 294, 262];
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.26;
      this.tone(melody[this.note % melody.length], 0.22, 'square', 0.06, this.musicBus);
      this.note++;
    }
  }
}
