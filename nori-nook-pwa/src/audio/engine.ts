import type { Preferences } from '@/types/game';

type Mood = 'home' | 'kitchen' | 'rush' | 'zen' | 'event';

const SCALES: Record<Mood, number[]> = {
  home: [0, 2, 4, 7, 9, 12, 9, 7],
  kitchen: [0, 2, 5, 7, 9, 12, 9, 5],
  rush: [0, 3, 5, 7, 10, 12, 10, 7],
  zen: [0, 2, 5, 7, 9, 10, 7, 2],
  event: [0, 2, 4, 7, 11, 12, 9, 4],
};

const midiToFreq = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export type SfxName =
  | 'tap'
  | 'pickup'
  | 'drop'
  | 'coin'
  | 'perfect'
  | 'slice'
  | 'rice'
  | 'roll'
  | 'plate'
  | 'bell'
  | 'discovery'
  | 'upgrade'
  | 'error'
  | 'camera'
  | 'tea'
  | 'sparkle'
  | 'whisk'
  | 'step';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private prefs: Preferences | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private mood: Mood = 'home';
  private started = false;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        void this.ensure();
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true });
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) {
          void this.ctx.suspend();
        } else if (this.prefs?.musicEnabled) {
          void this.ctx.resume();
        }
      });
    }
  }

  async ensure(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      this.noiseBuffer = this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return this.ctx;
      }
    }
    return this.ctx;
  }

  setPreferences(prefs: Preferences): void {
    this.prefs = prefs;
    this.applyVolumes();
    if (prefs.musicEnabled && this.started) {
      this.startMusic(this.mood);
    } else if (!prefs.musicEnabled) {
      this.stopMusic();
    }
  }

  private applyVolumes(): void {
    if (!this.prefs || !this.master || !this.musicGain || !this.sfxGain) return;
    const time = this.ctx?.currentTime ?? 0;
    this.master.gain.setTargetAtTime(this.prefs.masterVolume, time, 0.05);
    this.musicGain.gain.setTargetAtTime(this.prefs.musicVolume * 0.35, time, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.prefs.sfxVolume * 0.8, time, 0.04);
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  async setMood(mood: Mood): Promise<void> {
    if (this.mood === mood) return;
    this.mood = mood;
    if (!this.prefs?.musicEnabled || !this.started) return;
    this.stopMusic();
    await this.startMusic(mood);
  }

  async startMusic(mood: Mood = this.mood): Promise<void> {
    this.mood = mood;
    if (!this.prefs?.musicEnabled) return;
    const ctx = await this.ensure();
    if (!ctx || !this.musicGain) return;
    this.stopMusic();
    this.started = true;
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    const interval = mood === 'rush' ? 280 : 460;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), interval);
    this.scheduleMusic();
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const horizon = ctx.currentTime + 1.6;
    const beat = this.mood === 'rush' ? 0.32 : 0.62;
    while (this.nextNoteTime < horizon) {
      const scale = SCALES[this.mood];
      if (scale.length > 0) {
        const scaleIndex = this.step % scale.length;
        const note = scale[scaleIndex] ?? 0;
        const bar = Math.floor(this.step / 8);
        const octave = bar % 3 === 2 ? 1 : 0;
        const root = this.mood === 'rush' ? 57 : this.mood === 'zen' ? 55 : 60;
        const freq = midiToFreq(root + note + octave * 12);
        const velocity = this.step % 4 === 0 ? 0.16 : 0.1;
        this.pluck(freq, this.nextNoteTime, beat * 0.85, velocity, 'triangle');
        if (this.step % 8 === 0) {
          this.pluck(midiToFreq(root - 12), this.nextNoteTime, beat * 2.2, 0.055, 'sine');
        }
        if (this.step % 4 === 2) {
          this.pluck(freq * 1.5, this.nextNoteTime + beat * 0.06, beat * 0.5, 0.045, 'sine');
        }
      }
      this.nextNoteTime += beat;
      this.step += 1;
    }
  }

  private pluck(
    frequency: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ): void {
    const ctx = this.ctx;
    const destination = this.musicGain;
    if (!ctx || !destination) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.Q.setValueAtTime(0.4, time);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  async playSfx(name: SfxName): Promise<void> {
    if (this.prefs && !this.prefs.sfxEnabled) return;
    const ctx = await this.ensure();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime + 0.01;
    const note = (freq: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    };
    const glide = (from: number, to: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    };
    const noise = (duration: number, volume: number, filterFreq: number, type: BiquadFilterType = 'bandpass') => {
      if (!this.noiseBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(filterFreq, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);
      source.start(now);
      source.stop(now + duration + 0.02);
    };

    switch (name) {
      case 'tap':
        note(660, 0.08, 0.035);
        break;
      case 'pickup':
        glide(420, 660, 0.12, 0.06);
        break;
      case 'drop':
        note(220, 0.12, 0.07, 'triangle');
        note(330, 0.1, 0.035);
        break;
      case 'coin':
        note(1040, 0.08, 0.06);
        window.setTimeout(() => void this.playSfxTone(1400, 0.1, 0.045), 70);
        break;
      case 'perfect':
        [0, 4, 7, 12].forEach((offset, index) => {
          window.setTimeout(() => void this.playSfxTone(523.25 * 2 ** (offset / 12), 0.3, 0.05), index * 85);
        });
        break;
      case 'slice':
        noise(0.12, 0.12, 2600);
        glide(900, 320, 0.12, 0.04);
        break;
      case 'rice':
        noise(0.2, 0.06, 600, 'lowpass');
        break;
      case 'roll':
        noise(0.28, 0.08, 900, 'lowpass');
        note(140, 0.3, 0.04, 'triangle');
        break;
      case 'plate':
        note(880, 0.16, 0.05);
        note(1320, 0.2, 0.028);
        break;
      case 'bell':
        note(1244, 0.7, 0.045);
        note(1866, 0.5, 0.02);
        break;
      case 'discovery':
        [0, 2, 4, 7, 12].forEach((offset, index) => {
          window.setTimeout(() => void this.playSfxTone(440 * 2 ** (offset / 12), 0.35, 0.05), index * 70);
        });
        break;
      case 'upgrade':
        [0, 5, 9, 12, 16].forEach((offset, index) => {
          window.setTimeout(() => void this.playSfxTone(392 * 2 ** (offset / 12), 0.3, 0.045), index * 65);
        });
        break;
      case 'error':
        glide(300, 180, 0.22, 0.05);
        break;
      case 'camera':
        noise(0.05, 0.09, 3000);
        note(1500, 0.08, 0.045);
        break;
      case 'tea':
        noise(0.5, 0.04, 1400);
        note(523, 0.4, 0.025);
        break;
      case 'sparkle':
        note(1600, 0.15, 0.03);
        note(2100, 0.2, 0.02);
        break;
      case 'whisk':
        noise(0.18, 0.05, 1200);
        break;
      case 'step':
        noise(0.05, 0.03, 500);
        break;
      default:
        break;
    }
  }

  private async playSfxTone(frequency: number, duration: number, volume: number): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  haptic(pattern: number | number[] = 10): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        return;
      }
    }
  }
}

export const audio = new AudioEngine();
