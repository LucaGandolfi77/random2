/* Every sound is synthesised at runtime. No audio files, no network. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private started = false;
  private volume = 0.7;
  private dusk = 0;
  private birdTimer = 2.5;
  private stepFlip = false;

  start(): void {
    if (this.started) {
      void this.context?.resume();
      return;
    }
    type AudioConstructor = typeof AudioContext;
    const Ctor: AudioConstructor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioConstructor }).webkitAudioContext;
    if (!Ctor) return;

    try {
      this.context = new Ctor();
      this.started = true;
      this.master = this.context.createGain();
      this.master.gain.value = this.volume * 0.9;
      this.master.connect(this.context.destination);

      this.noise = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }

      const source = this.context.createBufferSource();
      source.buffer = this.noise;
      source.loop = true;
      this.windFilter = this.context.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.value = 420;
      this.windGain = this.context.createGain();
      this.windGain.gain.value = 0.03;
      source.connect(this.windFilter).connect(this.windGain).connect(this.master);
      source.start();
      void this.context.resume();
    } catch {
      this.context = null;
      this.started = false;
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume * 0.9, this.context.currentTime, 0.04);
    }
  }

  setDusk(t: number): void {
    this.dusk = Math.max(0, Math.min(1, t));
    if (this.windGain && this.context) {
      this.windGain.gain.setTargetAtTime(0.03 + this.dusk * 0.012, this.context.currentTime, 1.5);
    }
    if (this.windFilter && this.context) {
      this.windFilter.frequency.setTargetAtTime(420 - this.dusk * 130, this.context.currentTime, 1.5);
    }
  }

  update(dt: number): void {
    if (!this.started || !this.context) return;
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.chirp();
      const base = 3.4 + Math.random() * 6;
      this.birdTimer = base * (1 + this.dusk * 1.8);
    }
  }

  footstep(running: boolean): void {
    if (!this.context || !this.noise || !this.master) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.playbackRate.value = (running ? 1.25 : 1) * (0.9 + Math.random() * 0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = this.stepFlip ? 780 : 620;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(running ? 0.075 : 0.05, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + 0.14);
    this.stepFlip = !this.stepFlip;
  }

  pickup(): void {
    this.tone(680, 0.14, 'triangle', 0.07, 0);
    this.tone(1020, 0.2, 'triangle', 0.05, 0.07);
  }

  questComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      this.tone(frequency, 0.55, 'triangle', 0.06, index * 0.09);
    });
  }

  ui(): void {
    this.tone(660, 0.06, 'sine', 0.025, 0);
  }

  deny(): void {
    this.tone(196, 0.16, 'sine', 0.04, 0);
  }

  bell(): void {
    if (!this.context || !this.master) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const partials = [
      { frequency: 196, gain: 0.09, decay: 3.6 },
      { frequency: 392.4, gain: 0.06, decay: 3.1 },
      { frequency: 588.2, gain: 0.04, decay: 2.6 },
      { frequency: 785.8, gain: 0.03, decay: 2.2 },
      { frequency: 982.5, gain: 0.018, decay: 1.7 }
    ];
    for (const partial of partials) {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = partial.frequency;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(partial.gain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + partial.decay + 0.1);
    }
    this.tone(130.8, 2.8, 'sine', 0.05, 0);
  }

  private chirp(): void {
    if (!this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime + Math.random() * 0.2;
    const base = 1900 + Math.random() * 900;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      const start = now + i * 0.11;
      oscillator.frequency.setValueAtTime(base, start);
      oscillator.frequency.exponentialRampToValueAtTime(base * 1.35, start + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(base * 0.85, start + 0.11);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.02, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      oscillator.connect(gain).connect(this.master!);
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    delay: number
  ): void {
    if (!this.context || !this.master) return;
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }
}
