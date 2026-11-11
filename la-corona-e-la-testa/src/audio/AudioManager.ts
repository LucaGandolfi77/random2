import type {
  AmbienceId,
  CompiledDialogue,
  CompiledFilm,
  CompiledSfx,
} from '../data/types';
import type { Settings } from '../utils/storage';
import { generateScore } from './Music';
import type { MusicEvent } from './Music';
import { SfxPlayer } from './Sfx';
import {
  createArchitecture,
  createNoiseBuffer,
  playTone,
} from './Synth';
import { VoiceSynth } from './VoiceSynth';

type Architecture = ReturnType<typeof createArchitecture>;

interface AmbientLayer {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
}

interface AmbiencePreset {
  wind: number;
  city: number;
  crickets: number;
  water: number;
  hum: number;
  air: number;
}

const PRESETS: Record<AmbienceId, AmbiencePreset> = {
  court: { wind: 0.12, city: 0, crickets: 0, water: 0, hum: 1.25, air: 0.18 },
  crossroadsNight: { wind: 0.65, city: 0.08, crickets: 0.12, water: 0, hum: 0.28, air: 0.35 },
  viaDay: { wind: 0.7, city: 0.04, crickets: 0.85, water: 0, hum: 0.08, air: 0.4 },
  riverDusk: { wind: 0.75, city: 0, crickets: 0.45, water: 1.05, hum: 0.1, air: 0.3 },
  riverDawn: { wind: 0.5, city: 0, crickets: 0.12, water: 0.8, hum: 0.06, air: 0.36 },
  borgo: { wind: 0.32, city: 0.55, crickets: 0.05, water: 0, hum: 0.42, air: 0.22 },
  silence: { wind: 0.08, city: 0, crickets: 0, water: 0, hum: 0, air: 0.04 },
};

export class AudioManager {
  private readonly film: CompiledFilm;
  private readonly score: MusicEvent[];
  private readonly voices = new VoiceSynth();
  private context: AudioContext | null = null;
  private architecture: Architecture | null = null;
  private sfx: SfxPlayer | null = null;
  private layers: Record<'wind' | 'city' | 'crickets' | 'water' | 'hum' | 'air', AmbientLayer> | null =
    null;
  private musicIndex = 0;
  private sfxIndex = 0;
  private filmTime = 0;
  private currentAmbience: AmbienceId | null = null;
  private playing = false;
  private volume = 0.8;
  private muted = false;
  private voicesEnabled = true;
  private initialized = false;
  private activeMusic = new Set<AudioScheduledSourceNode>();
  private speed = 1;

  constructor(film: CompiledFilm, settings: Settings) {
    this.film = film;
    this.score = generateScore(film);
    this.volume = settings.volume;
    this.muted = settings.muted;
    this.voicesEnabled = settings.voices;
    this.voices.setVolume(settings.volume);
    this.voices.setEnabled(settings.voices);
    this.voices.setMuted(settings.muted);
  }

  init(): boolean {
    if (this.initialized) return Boolean(this.context);
    this.initialized = true;

    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return false;
      const context = new AudioContextCtor();
      this.context = context;
      this.architecture = createArchitecture(context);
      const noise = createNoiseBuffer(context, 2.2, 19);
      this.sfx = new SfxPlayer(context, this.architecture.sfx, noise);
      this.layers = this.createAmbienceLayers(context, noise);
      this.applyVolume();
      return true;
    } catch {
      this.context = null;
      this.architecture = null;
      return false;
    }
  }

  start(time: number): void {
    if (!this.init() || !this.context) return;
    void this.context.resume();
    this.seek(time);
    this.playing = true;
  }

  resume(): void {
    if (!this.context) return;
    void this.context.resume();
    this.playing = true;
    this.seek(this.filmTime);
  }

  pause(): void {
    this.playing = false;
    this.voices.cancel();
    this.stopActiveSources();
    if (this.context && this.context.state === 'running') {
      void this.context.suspend();
    }
  }

  seek(time: number): void {
    this.filmTime = Math.max(0, time);
    this.stopActiveSources();
    this.voices.cancel();
    this.musicIndex = this.firstIndexAtOrAfter(this.score, this.filmTime);
    this.sfxIndex = this.firstIndexAtOrAfter(this.film.sfx, this.filmTime);
    if (this.context && this.currentAmbience) {
      this.setAmbience(this.currentAmbience, true);
    }
  }

  update(time: number, playing: boolean, speed = 1): void {
    this.filmTime = time;
    this.speed = speed;
    this.playing = playing;

    if (!this.context || !this.architecture) return;

    const ambience = this.ambienceAt(time);
    if (ambience !== this.currentAmbience) this.setAmbience(ambience, false);

    if (!playing || this.context.state !== 'running') return;

    const now = this.context.currentTime;
    const horizon = time + 0.45 * Math.max(0.75, speed);

    while (
      this.musicIndex < this.score.length &&
      this.score[this.musicIndex].time < time - 0.12
    ) {
      this.musicIndex += 1;
    }

    while (
      this.musicIndex < this.score.length &&
      this.score[this.musicIndex].time <= horizon
    ) {
      const event = this.score[this.musicIndex];
      this.musicIndex += 1;
      const delay = (event.time - time) / Math.max(0.5, speed);
      if (delay < -0.05) continue;
      const source = playTone(this.context, this.architecture.music, {
        time: now + Math.max(0.012, delay),
        frequency: event.frequency,
        duration: event.duration,
        gain: event.gain,
        type: event.type,
        attack: event.attack,
        release: event.release,
        pan: event.pan,
      });
      this.trackMusic(source);
    }

    while (
      this.sfxIndex < this.film.sfx.length &&
      this.film.sfx[this.sfxIndex].time < time - 0.12
    ) {
      this.sfxIndex += 1;
    }

    while (this.sfxIndex < this.film.sfx.length && this.film.sfx[this.sfxIndex].time <= horizon) {
      const event = this.film.sfx[this.sfxIndex];
      this.sfxIndex += 1;
      const delay = (event.time - time) / Math.max(0.5, speed);
      if (delay < -0.05) continue;
      this.sfx?.play(event.name, event.gain, now + Math.max(0.01, delay));
    }
  }

  speak(line: CompiledDialogue): void {
    if (!this.playing) return;
    this.voices.speak(line.text, line.speaker);
  }

  cancelVoice(): void {
    this.voices.cancel();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.voices.setVolume(this.volume);
    this.applyVolume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.voices.setMuted(muted);
    this.applyVolume();
  }

  setVoicesEnabled(enabled: boolean): void {
    this.voicesEnabled = enabled;
    this.voices.setEnabled(enabled);
  }

  get voiceStatus(): string {
    return this.voices.status;
  }

  get voiceAvailable(): boolean {
    return this.voices.isAvailable;
  }

  getState(): {
    initialized: boolean;
    contextState: string;
    ambience: string | null;
    voiceStatus: string;
    voiceAvailable: boolean;
  } {
    return {
      initialized: this.initialized,
      contextState: this.context?.state ?? 'unavailable',
      ambience: this.currentAmbience,
      voiceStatus: this.voices.status,
      voiceAvailable: this.voices.isAvailable,
    };
  }

  finish(): void {
    this.playing = false;
    this.voices.cancel();
    this.stopActiveSources();
    if (this.context && this.currentAmbience) this.setAmbience('silence', false);
  }

  private applyVolume(): void {
    if (!this.context || !this.architecture) return;
    const value = this.muted ? 0 : this.volume;
    this.architecture.master.gain.setTargetAtTime(value, this.context.currentTime, 0.08);
  }

  private ambienceAt(time: number): AmbienceId {
    let current: AmbienceId = 'silence';
    for (const event of this.film.ambiences) {
      if (event.time <= time) current = event.ambience;
      else break;
    }
    return current;
  }

  private setAmbience(ambience: AmbienceId, immediate: boolean): void {
    this.currentAmbience = ambience;
    if (!this.context || !this.layers) return;
    const preset = PRESETS[ambience] ?? PRESETS.silence;
    const now = this.context.currentTime;
    const timeConstant = immediate ? 0.04 : 0.9;

    const set = (layer: AmbientLayer, value: number) => {
      layer.gain.gain.setTargetAtTime(Math.max(0, value), now, timeConstant);
    };

    set(this.layers.wind, preset.wind * 0.05);
    set(this.layers.city, preset.city * 0.055);
    set(this.layers.crickets, preset.crickets * 0.022);
    set(this.layers.water, preset.water * 0.028);
    set(this.layers.hum, preset.hum * 0.018);
    set(this.layers.air, preset.air * 0.022);
  }

  private createAmbienceLayers(
    context: AudioContext,
    noise: AudioBuffer,
  ): Record<'wind' | 'city' | 'crickets' | 'water' | 'hum' | 'air', AmbientLayer> {
    const ambience = this.architecture!.ambience;

    const makeNoiseLayer = (
      filterType: BiquadFilterType,
      frequency: number,
      q: number,
      pan: number,
    ): AmbientLayer => {
      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const gain = context.createGain();
      gain.gain.value = 0;
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(ambience);
      source.start();
      return { gain, sources: [source] };
    };

    const wind = makeNoiseLayer('bandpass', 430, 0.55, -0.2);
    const city = makeNoiseLayer('lowpass', 240, 0.8, 0.15);
    const water = makeNoiseLayer('bandpass', 950, 0.7, -0.35);
    const air = makeNoiseLayer('highpass', 1600, 0.5, 0.25);

    const humGain = context.createGain();
    humGain.gain.value = 0;
    const hum = context.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 55;
    const humSecond = context.createOscillator();
    humSecond.type = 'sine';
    humSecond.frequency.value = 82.5;
    const humSecondGain = context.createGain();
    humSecondGain.gain.value = 0.35;
    hum.connect(humGain);
    humSecond.connect(humSecondGain);
    humSecondGain.connect(humGain);
    humGain.connect(ambience);
    hum.start();
    humSecond.start();

    const cricketGain = context.createGain();
    cricketGain.gain.value = 0;
    const cricketBus = context.createGain();
    cricketBus.gain.value = 0.5;
    const cricketTremolo = context.createOscillator();
    cricketTremolo.type = 'sine';
    cricketTremolo.frequency.value = 13.5;
    const tremoloGain = context.createGain();
    tremoloGain.gain.value = 0.45;
    cricketTremolo.connect(tremoloGain);
    tremoloGain.connect(cricketBus.gain);
    cricketTremolo.start();

    const cricketOscillators: AudioScheduledSourceNode[] = [cricketTremolo];
    for (const [frequency, pan] of [
      [4280, -0.4],
      [4620, 0.35],
      [3890, 0.1],
    ] as const) {
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      const oscGain = context.createGain();
      oscGain.gain.value = 0.16;
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      oscillator.connect(oscGain);
      oscGain.connect(panner);
      panner.connect(cricketBus);
      oscillator.start();
      cricketOscillators.push(oscillator);
    }

    cricketBus.connect(cricketGain);
    cricketGain.connect(ambience);

    return {
      wind,
      city,
      water,
      air,
      hum: { gain: humGain, sources: [hum, humSecond] },
      crickets: { gain: cricketGain, sources: cricketOscillators },
    };
  }

  private trackMusic(source: AudioScheduledSourceNode): void {
    this.activeMusic.add(source);
    source.addEventListener('ended', () => this.activeMusic.delete(source));
  }

  private stopActiveSources(): void {
    for (const source of this.activeMusic) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.activeMusic.clear();
    this.sfx?.stopAll();
  }

  private firstIndexAtOrAfter<T extends { time: number }>(items: T[], time: number): number {
    let low = 0;
    let high = items.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (items[middle].time < time) low = middle + 1;
      else high = middle;
    }
    return low;
  }
}
