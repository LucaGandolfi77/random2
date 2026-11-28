type AudioContextCtor = typeof AudioContext;

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private ambience: GainNode | null = null;
  private sfx: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private padOscillators: OscillatorNode[] = [];
  private timer: number | null = null;
  private enabled = true;
  private started = false;
  private weather: "clear" | "rain" | "night" = "clear";

  get isStarted(): boolean {
    return this.started;
  }

  async start(): Promise<void> {
    if (this.started) {
      await this.ctx?.resume();
      return;
    }
    const Ctor =
      (window.AudioContext as AudioContextCtor | undefined) ??
      ((window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);
    if (!Ctor) return;
    this.ctx = new Ctor();
    await this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.6 : 0;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.42;
    this.music.connect(this.master);
    this.ambience = this.ctx.createGain();
    this.ambience.gain.value = 0.3;
    this.ambience.connect(this.master);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.55;
    this.sfx.connect(this.master);
    this.buildPad();
    this.buildRain();
    this.setWeather(this.weather);
    this.started = true;
    this.scheduleNextPluck(1.2);
  }

  private buildPad(): void {
    if (!this.ctx || !this.music) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.7;
    filter.connect(this.music);
    const frequencies = [130.81, 196.0, 261.63, 329.63];
    frequencies.forEach((frequency, index) => {
      const osc = this.ctx!.createOscillator();
      osc.type = index % 2 ? "sine" : "triangle";
      osc.frequency.value = frequency;
      const gain = this.ctx!.createGain();
      gain.gain.value = 0.045 / (1 + index * 0.4);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.padOscillators.push(osc);
    });
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.padOscillators.push(lfo);
  }

  private buildRain(): void {
    if (!this.ctx || !this.ambience) return;
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.7 + white * 0.3;
      data[index] = last * 0.5;
    }
    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = buffer;
    this.rainSource.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.35;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainSource.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.ambience);
    this.rainSource.start();
  }

  private scheduleNextPluck(delay: number): void {
    this.timer = window.setTimeout(() => {
      if (!this.ctx || !this.music) return;
      const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      this.pluck(note, 0.045, this.music!);
      if (Math.random() < 0.3) {
        window.setTimeout(() => this.pluck(note * 1.5, 0.025, this.music!), 260);
      }
      this.scheduleNextPluck(2.2 + Math.random() * 3.4);
    }, delay * 1000);
  }

  private pluck(frequency: number, volume: number, destination: AudioNode): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.8);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  setWeather(weather: "clear" | "rain" | "night"): void {
    this.weather = weather;
    if (!this.ctx || !this.rainGain) return;
    const target = weather === "rain" ? 0.22 : 0.015;
    this.rainGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.rainGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 1.2);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(enabled ? 0.6 : 0, this.ctx.currentTime + 0.35);
  }

  interact(): void {
    if (!this.ctx || !this.sfx) return;
    this.pluck(523.25, 0.06, this.sfx!);
    window.setTimeout(() => this.pluck(659.25, 0.04, this.sfx!), 70);
  }

  rewind(): void {
    if (!this.ctx || !this.sfx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.75);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(now);
    osc.stop(now + 0.85);
    this.pluck(196, 0.05, this.sfx!);
  }

  chapter(): void {
    if (!this.ctx || !this.sfx) return;
    [261.63, 329.63, 392.0, 523.25].forEach((frequency, index) => {
      window.setTimeout(() => this.pluck(frequency, 0.05, this.sfx!), index * 180);
    });
  }

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.padOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
    });
    this.padOscillators = [];
    try {
      this.rainSource?.stop();
      this.rainSource?.disconnect();
    } catch {
      /* already stopped */
    }
    this.rainSource = null;
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}
