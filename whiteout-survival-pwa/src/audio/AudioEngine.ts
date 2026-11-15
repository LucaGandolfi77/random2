/**
 * Synthesised ambience and interface sound. Wind and furnace fire are filtered
 * noise loops; cues are short oscillators. No audio files are fetched, and the
 * context is only created after a user gesture so mobile browsers allow it.
 */
type WeatherPhase = 'calm' | 'warning' | 'blizzard';
type FurnaceMode = 'off' | 'normal' | 'overdrive';

interface Scene {
  weather: WeatherPhase;
  intensity: number;
  furnace: FurnaceMode;
  temperature: number;
  enabled: boolean;
}

const SILENCE = 0.0001;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private furnaceGain: GainNode | null = null;
  private furnaceFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private unlocked = false;
  private enabled = true;
  private scene: Scene = {
    weather: 'calm',
    intensity: 0.9,
    furnace: 'normal',
    temperature: 0,
    enabled: true,
  };
  private globalSoundsInstalled = false;
  private crackleTimer: number | null = null;
  private ambientStarted = false;

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.unlocked = true;
    this.startAmbient();
    this.applyScene();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.scene = { ...this.scene, enabled };
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? 0.85 : SILENCE, this.ctx.currentTime, 0.2);
    }
    if (enabled) {
      if (this.unlocked) {
        this.unlock();
        this.startCrackleLoop();
      }
    } else {
      this.stopCrackleLoop();
    }
  }

  setScene(next: Partial<Scene>): void {
    this.scene = { ...this.scene, ...next };
    this.applyScene();
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended' && this.unlocked) void this.ctx.resume();
  }

  installGlobalUiSounds(): void {
    if (this.globalSoundsInstalled || typeof document === 'undefined') return;
    this.globalSoundsInstalled = true;
    document.addEventListener(
      'pointerdown',
      (event) => {
        this.unlock();
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, [role="button"]')) {
          this.click();
        }
      },
      { passive: true },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        this.unlock();
        if (event.key === 'Enter' || event.key === ' ') {
          const target = event.target as HTMLElement | null;
          if (target?.closest('button, a, [role="button"]')) this.click();
        }
      },
      { passive: true },
    );
  }

  click(): void {
    if (!this.canPlay()) return;
    this.tone(360, 0.045, 'triangle', 0.035, -60);
  }

  back(): void {
    if (!this.canPlay()) return;
    this.tone(260, 0.05, 'sine', 0.028, -30);
  }

  success(): void {
    if (!this.canPlay()) return;
    this.tone(440, 0.12, 'sine', 0.045, 8);
    window.setTimeout(() => this.tone(660, 0.2, 'sine', 0.04, 6), 75);
  }

  error(): void {
    if (!this.canPlay()) return;
    this.tone(150, 0.16, 'square', 0.025, -20);
    window.setTimeout(() => this.tone(110, 0.2, 'square', 0.02, -15), 100);
  }

  warning(): void {
    if (!this.canPlay()) return;
    this.tone(392, 0.38, 'sawtooth', 0.025, -4);
    window.setTimeout(() => this.tone(311, 0.55, 'sawtooth', 0.03, -4), 330);
  }

  blizzardHit(): void {
    if (!this.canPlay() || !this.ctx) return;
    const ctx = this.ctx;
    const noise = this.makeNoiseSource(2.2);
    if (!noise) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 2);
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENCE, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(SILENCE, ctx.currentTime + 2.1);
    noise.connect(filter).connect(gain).connect(this.master ?? ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 2.2);
  }

  battleHit(heavy = false): void {
    if (!this.canPlay()) return;
    this.tone(heavy ? 96 : 180, heavy ? 0.13 : 0.05, 'triangle', heavy ? 0.04 : 0.018, -30);
  }

  victory(): void {
    if (!this.canPlay()) return;
    [392, 523, 659, 784].forEach((frequency, index) =>
      window.setTimeout(() => this.tone(frequency, 0.3, 'sine', 0.035, 5), index * 90),
    );
  }

  defeat(): void {
    if (!this.canPlay()) return;
    [240, 200, 150].forEach((frequency, index) =>
      window.setTimeout(() => this.tone(frequency, 0.32, 'triangle', 0.025, -10), index * 130),
    );
  }

  private canPlay(): boolean {
    return Boolean(this.enabled && this.unlocked && this.ctx && this.master && !document.hidden);
  }

  private init(): void {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.85 : SILENCE;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(3);
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  private makeNoiseSource(duration = 3): AudioBufferSourceNode | null {
    if (!this.ctx || !this.noiseBuffer) return null;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    source.loopEnd = duration;
    return source;
  }

  private createNoiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      data[i] = last * 3.2 + white * 0.12;
    }
    return buffer;
  }

  private startAmbient(): void {
    if (!this.ctx || !this.master || this.ambientStarted) return;
    this.ambientStarted = true;
    const ctx = this.ctx;

    const wind = this.makeNoiseSource();
    if (wind) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      filter.Q.value = 1.8;
      const gain = ctx.createGain();
      gain.gain.value = 0.03;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.085;
      lfoGain.gain.value = 130;
      lfo.connect(lfoGain).connect(filter.frequency);
      wind.connect(filter).connect(gain).connect(this.master);
      wind.start();
      lfo.start();
      this.windGain = gain;
      this.windFilter = filter;
    }

    const furnace = this.makeNoiseSource();
    if (furnace) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 220;
      filter.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0.02;
      furnace.connect(filter).connect(gain).connect(this.master);
      furnace.start();
      this.furnaceFilter = filter;
      this.furnaceGain = gain;
    }

    this.startCrackleLoop();
  }

  private startCrackleLoop(): void {
    if (this.crackleTimer !== null) return;
    const schedule = () => {
      if (!this.enabled || document.hidden || !this.unlocked) {
        this.crackleTimer = window.setTimeout(schedule, 1400);
        return;
      }
      if (this.scene.furnace !== 'off') {
        this.crackle();
      }
      const delay =
        this.scene.furnace === 'overdrive' ? 180 + Math.random() * 480 : 420 + Math.random() * 900;
      this.crackleTimer = window.setTimeout(schedule, delay);
    };
    this.crackleTimer = window.setTimeout(schedule, 700);
  }

  private stopCrackleLoop(): void {
    if (this.crackleTimer !== null) {
      window.clearTimeout(this.crackleTimer);
      this.crackleTimer = null;
    }
  }

  private crackle(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const source = this.makeNoiseSource();
    if (!source) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 500 + Math.random() * 800;
    const gain = ctx.createGain();
    const level =
      this.scene.furnace === 'overdrive'
        ? 0.025 + Math.random() * 0.035
        : 0.01 + Math.random() * 0.025;
    gain.gain.setValueAtTime(SILENCE, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(SILENCE, ctx.currentTime + 0.08 + Math.random() * 0.1);
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    source.stop(ctx.currentTime + 0.22);
  }

  private applyScene(): void {
    if (!this.ctx || !this.windGain || !this.windFilter || !this.furnaceGain) return;
    const enabled = this.enabled && this.scene.enabled;
    const weather = this.scene.weather;
    const gust = weather === 'blizzard' ? 0.16 : weather === 'warning' ? 0.085 : 0.035;
    const targetWind = enabled ? gust * this.scene.intensity : SILENCE;
    this.windGain.gain.setTargetAtTime(targetWind, this.ctx.currentTime, 1.2);
    this.windFilter.frequency.setTargetAtTime(
      weather === 'blizzard' ? 1050 : weather === 'warning' ? 700 : 430,
      this.ctx.currentTime,
      1.5,
    );
    if (this.furnaceFilter) {
      this.furnaceFilter.frequency.setTargetAtTime(
        this.scene.furnace === 'overdrive' ? 360 : 220,
        this.ctx.currentTime,
        0.8,
      );
    }
    const furnaceTarget =
      !enabled || this.scene.furnace === 'off'
        ? SILENCE
        : this.scene.furnace === 'overdrive'
          ? 0.055
          : 0.025;
    this.furnaceGain.gain.setTargetAtTime(furnaceTarget, this.ctx.currentTime, 0.9);
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    detune = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(SILENCE, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(SILENCE, ctx.currentTime + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + 0.03);
  }
}

export const audio = new AudioEngine();
