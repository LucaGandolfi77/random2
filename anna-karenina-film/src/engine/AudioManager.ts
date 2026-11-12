import type { MusicMood, SceneDef, SfxId } from '../data/types';
import { FILM, sceneAtTime } from '../data/film';

type AudioCtor = typeof AudioContext;

const SCALES: Record<MusicMood['mode'], number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11]
};

const PROGRESSION = [0, 5, 3, 4];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function chordFor(mood: MusicMood, bar: number): number[] {
  const scale = SCALES[mood.mode];
  const degree = PROGRESSION[((bar % PROGRESSION.length) + PROGRESSION.length) % PROGRESSION.length] ?? 0;
  const base = mood.root + 12;
  const root = scale[degree] ?? 0;
  const thirdIdx = (degree + 2) % 7;
  const fifthIdx = (degree + 4) % 7;
  const third = (scale[thirdIdx] ?? 0) + (degree + 2 >= 7 ? 12 : 0);
  const fifth = (scale[fifthIdx] ?? 0) + (degree + 4 >= 7 ? 12 : 0);
  return [base + root, base + third, base + fifth];
}

function motifFor(mood: MusicMood, bar: number): number[] {
  const scale = SCALES[mood.mode];
  const base = mood.root + 24;
  const pattern = [0, 4, 2, 5, 3, 6];
  const degree = pattern[bar % pattern.length] ?? 0;
  return [base + (scale[degree % 7] ?? 0), base + (scale[(degree + 2) % 7] ?? 0)];
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private currentSceneIndex = -1;
  private currentScene: SceneDef | null = null;
  private lastTime = -1;
  private lastPlaying = false;
  private nextBeatTime = 0;
  private beatCounter = 0;
  private sfxCursor = 0;
  private sfxTimeline: Array<{ time: number; id: SfxId; gain: number }> = [];
  private activeSources = new Set<AudioScheduledSourceNode>();
  private ambienceSources = new Set<AudioScheduledSourceNode>();
  private nextClockTick = 0;
  private nextBell = 0;
  private nextFireCrackle = 0;
  private musicSilenced = false;
  private volume = 0.8;
  private muted = false;
  private initialized = false;
  private disposed = false;

  async init(): Promise<void> {
    if (this.initialized) {
      await this.resume();
      return;
    }
    const Ctor: AudioCtor | undefined =
      (globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }).AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor({ latencyHint: 'interactive' });
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.volume * 0.78;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 20;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.28;
      master.connect(compressor);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      compressor.connect(analyser);
      analyser.connect(ctx.destination);
      this.master = master;
      this.compressor = compressor;
      this.analyser = analyser;

      const musicBus = ctx.createGain();
      musicBus.gain.value = 0.34;
      musicBus.connect(master);
      this.musicBus = musicBus;
      const sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.4;
      sfxBus.connect(master);
      this.sfxBus = sfxBus;
      const ambienceBus = ctx.createGain();
      ambienceBus.gain.value = 0.22;
      ambienceBus.connect(master);
      this.ambienceBus = ambienceBus;
      const voiceBus = ctx.createGain();
      voiceBus.gain.value = 0.62;
      voiceBus.connect(master);
      this.voiceBus = voiceBus;

      const convolver = ctx.createConvolver();
      convolver.buffer = this.makeImpulse(ctx, 2.8, 2.4);
      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.42;
      const reverbReturn = ctx.createGain();
      reverbReturn.gain.value = 0.32;
      musicBus.connect(reverbSend);
      sfxBus.connect(reverbSend);
      ambienceBus.connect(reverbSend);
      voiceBus.connect(reverbSend);
      reverbSend.connect(convolver);
      convolver.connect(reverbReturn);
      reverbReturn.connect(master);
      this.reverbSend = reverbSend;
      this.convolver = convolver;
      this.noiseBuffer = this.makeNoiseBuffer(ctx, 3);
      this.initialized = true;
      await this.resume();
      this.applyGain();
    } catch {
      this.ctx = null;
    }
  }

  async resume(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      // The browser may require another user gesture.
    }
  }

  async pause(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'running') await this.ctx.suspend();
    } catch {
      // Ignore.
    }
  }

  setVolume(value: number): void {
    this.volume = clamp01(value);
    this.applyGain();
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  connectVoice(audio: HTMLAudioElement): void {
    if (!this.ctx || !this.voiceBus) return;
    try {
      const source = this.ctx.createMediaElementSource(audio);
      source.connect(this.voiceBus);
    } catch {
      // The element may already be connected; the subtitle remains.
    }
  }

  getState(): {
    ready: boolean;
    context: string;
    sceneIndex: number;
    volume: number;
    muted: boolean;
    level: number;
  } {
    let level = 0;
    if (this.analyser) {
      const data = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const sample of data) sum += sample * sample;
      level = Math.sqrt(sum / data.length);
    }
    return {
      ready: this.initialized,
      context: this.ctx?.state ?? 'none',
      sceneIndex: this.currentSceneIndex,
      volume: this.volume,
      muted: this.muted,
      level: Number(level.toFixed(6))
    };
  }

  update(time: number, playing: boolean): void {
    if (!this.ctx || !this.initialized || this.disposed) return;
    if (this.lastTime < 0) {
      this.startAt(time);
    } else if (Math.abs(time - this.lastTime) > 0.8) {
      this.hardReset(time);
    }

    if (!playing) {
      if (this.lastPlaying) {
        this.lastPlaying = false;
        void this.pause();
      }
      this.lastTime = time;
      return;
    }

    if (!this.lastPlaying) {
      this.lastPlaying = true;
      void this.resume();
      this.resetScheduler(time);
    }
    if (this.ctx.state === 'suspended') {
      void this.resume();
    }

    const info = sceneAtTime(time);
    if (info.index !== this.currentSceneIndex) {
      this.startAt(time);
    }
    const scene = this.currentScene;
    if (!scene) {
      this.lastTime = time;
      return;
    }
    const sceneLocal = info.localTime;

    if (scene.musicStopAt !== undefined && sceneLocal >= scene.musicStopAt && !this.musicSilenced) {
      this.stopMusic(1.4);
    }

    if (!this.musicSilenced && this.musicBus) {
      this.scheduleMusic(scene, sceneLocal);
    }
    this.scheduleSfx(scene, sceneLocal);
    this.scheduleAmbienceTicks(scene, sceneLocal, time);
    this.lastTime = time;
  }

  private sceneStartFor(index: number): number {
    let start = 0;
    for (let i = 0; i < index; i += 1) start += FILM.scenes[i]?.duration ?? 0;
    return start;
  }

  private startAt(time: number): void {
    const info = sceneAtTime(time);
    this.stopAll();
    this.currentSceneIndex = info.index;
    this.currentScene = info.scene;
    this.musicSilenced = Boolean(info.scene.musicStopAt !== undefined && info.localTime >= info.scene.musicStopAt);
    this.resetScheduler(time);
    this.buildSfxTimeline(info.scene);
    this.nextClockTick = Math.ceil(time * 2) / 2;
    this.nextBell = time + 4;
    this.nextFireCrackle = time + 1.2;
    this.startAmbience(info.scene, info.localTime);
    if (!this.musicSilenced) {
      const beatDuration = 60 / info.scene.music.tempo;
      const beat = Math.floor(info.localTime / beatDuration);
      const bar = Math.floor(beat / (info.scene.music.meter ?? 4));
      const chord = chordFor(info.scene.music, bar);
      const when = (this.ctx?.currentTime ?? 0) + 0.05;
      chord.forEach((note, i) => this.playStrings(note, when, beatDuration * (info.scene.music.meter ?? 4) * 1.7, 0.045 + i * 0.006));
      if (this.ctx) this.playCello(chord[0] ? chord[0] - 12 : 36, when, beatDuration * (info.scene.music.meter ?? 4) * 1.8, 0.05);
    }
  }

  private hardReset(time: number): void {
    this.stopAll();
    this.currentSceneIndex = -1;
    this.currentScene = null;
    this.lastTime = -1;
    this.startAt(time);
  }

  private resetScheduler(time: number): void {
    const info = sceneAtTime(time);
    const beatDuration = 60 / info.scene.music.tempo;
    const local = Math.ceil((info.localTime - 0.001) / beatDuration) * beatDuration;
    this.nextBeatTime = time - info.localTime + Math.max(0, local);
    this.beatCounter = Math.round(Math.max(0, local) / beatDuration);
    this.buildSfxTimeline(info.scene);
    this.sfxCursor = this.sfxTimeline.findIndex((cue) => cue.time >= info.localTime - 0.01);
    if (this.sfxCursor < 0) this.sfxCursor = this.sfxTimeline.length;
  }

  private buildSfxTimeline(scene: SceneDef): void {
    const list: Array<{ time: number; id: SfxId; gain: number }> = [];
    for (const shot of scene.shots) {
      for (const cue of shot.sfx ?? []) {
        list.push({ time: shot.start + cue.t, id: cue.id, gain: cue.gain ?? 1 });
      }
    }
    list.sort((a, b) => a.time - b.time);
    this.sfxTimeline = list;
  }

  private scheduleMusic(scene: SceneDef, localTime: number): void {
    if (!this.ctx || !this.musicBus) return;
    const mood = scene.music;
    const meter = mood.meter ?? 4;
    const beatDuration = 60 / mood.tempo;
    const now = this.ctx.currentTime;
    const sceneStart = this.sceneStartFor(this.currentSceneIndex);
    const horizon = localTime + 0.28;
    let guard = 0;
    while (this.nextBeatTime - sceneStart < horizon && guard < 32) {
      const beatLocal = this.nextBeatTime - sceneStart;
      if (beatLocal >= localTime - 0.05) {
        const when = now + Math.max(0.01, beatLocal - localTime);
        const bar = Math.floor(this.beatCounter / meter);
        const within = this.beatCounter % meter;
        const chord = chordFor(mood, bar);
        if (within === 0) {
          const padDur = beatDuration * meter * 1.6;
          chord.forEach((note, i) => this.playStrings(note, when, padDur, 0.035 + i * 0.006));
          const root = chord[0] ?? mood.root + 12;
          this.playCello(root - 12, when, padDur * 1.05, 0.04);
          if (mood.intensity > 0.46) this.playTimpani(mood.root - 12, when, 0.04 + mood.intensity * 0.05);
        }
        const arpPattern = [0, 2, 1, 2, 1, 0, 2, 1];
        const arpIndex = arpPattern[this.beatCounter % arpPattern.length] ?? 0;
        const arpNote = chord[arpIndex % chord.length] ?? chord[0] ?? 60;
        this.playPiano(arpNote + 12, when, beatDuration * 0.9, 0.028 + mood.intensity * 0.018);
        if (within === 0 && bar % 2 === 0) {
          const motif = motifFor(mood, bar);
          const useBell = mood.darkness < 0.35 || mood.id.includes('snow');
          if (useBell) {
            this.playBell((motif[0] ?? 72) + 12, when + 0.04, 0.018 + mood.intensity * 0.018);
          } else {
            this.playFlute(motif[0] ?? 72, when + 0.04, beatDuration * 1.4, 0.022);
            this.playFlute(motif[1] ?? 72, when + beatDuration * 0.72, beatDuration * 1.1, 0.016);
          }
        }
        if (within === 0 && bar % 4 === 3) {
          const motif = motifFor(mood, bar + 1);
          this.playViolin(motif[0] ?? 72, when + beatDuration * 0.4, beatDuration * 2.2, 0.02);
        }
        if (mood.id.includes('train') || mood.id.includes('race') || mood.id.includes('last')) {
          this.playTrainPulse(when, 0.012 + mood.intensity * 0.012);
        }
      }
      this.nextBeatTime += beatDuration;
      this.beatCounter += 1;
      guard += 1;
    }
  }

  private scheduleSfx(scene: SceneDef, localTime: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    while (this.sfxCursor < this.sfxTimeline.length) {
      const cue = this.sfxTimeline[this.sfxCursor];
      if (!cue) break;
      if (cue.time > localTime + 0.2) break;
      if (cue.time >= localTime - 0.08) {
        const when = now + Math.max(0.01, cue.time - localTime);
        this.triggerSfx(cue.id, cue.gain, when);
      }
      this.sfxCursor += 1;
    }
    void scene;
  }

  private scheduleAmbienceTicks(scene: SceneDef, localTime: number, globalTime: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (scene.ambience.includes('clock')) {
      while (this.nextClockTick <= globalTime + 0.2) {
        const when = now + Math.max(0.01, this.nextClockTick - globalTime);
        this.playClock(when, 0.018);
        this.nextClockTick += 1;
      }
    }
    if (scene.ambience.includes('bell')) {
      while (this.nextBell <= globalTime + 0.2) {
        const when = now + Math.max(0.01, this.nextBell - globalTime);
        this.playBell(60, when, 0.025);
        this.nextBell += 27;
      }
    }
    if (scene.ambience.includes('fire')) {
      while (this.nextFireCrackle <= globalTime + 0.2) {
        const when = now + Math.max(0.01, this.nextFireCrackle - globalTime);
        this.playCrackle(when, 0.012);
        this.nextFireCrackle += 1.7;
      }
    }
    void localTime;
  }

  private startAmbience(scene: SceneDef, localTime: number): void {
    if (!this.ctx || !this.ambienceBus) return;
    const now = this.ctx.currentTime + 0.05;
    for (const id of scene.ambience) {
      switch (id) {
        case 'wind':
          this.startNoiseLoop(now, 0.9, 420, 0.06, 0.075, 'wind');
          break;
        case 'train':
          this.startNoiseLoop(now, 0.4, 160, 0.05, 0.055, 'train');
          this.startRumble(now, 42, 0.035);
          break;
        case 'crowd':
          this.startNoiseLoop(now, 0.35, 980, 0.045, 0.04, 'crowd');
          break;
        case 'rain':
          this.startNoiseLoop(now, 0.7, 1800, 0.06, 0.05, 'rain');
          break;
        case 'fire':
          this.startNoiseLoop(now, 0.25, 280, 0.03, 0.03, 'fire');
          break;
        case 'birds':
          this.startNoiseLoop(now, 0.2, 2400, 0.012, 0.012, 'birds');
          break;
        case 'insects':
          this.startNoiseLoop(now, 0.5, 3800, 0.008, 0.008, 'insects');
          break;
        case 'horses':
          break;
        case 'bell':
          break;
        case 'clock':
          break;
      }
    }
    void localTime;
  }

  private startNoiseLoop(
    when: number,
    intensity: number,
    cutoff: number,
    gain: number,
    mod: number,
    kind: string
  ): void {
    if (!this.ctx || !this.noiseBuffer || !this.ambienceBus) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = kind === 'rain' || kind === 'birds' || kind === 'insects' ? 'highpass' : 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    const target = gain * intensity;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(target, when + 2.2);
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = kind === 'wind' ? 0.08 : kind === 'crowd' ? 0.18 : 0.11;
    lfoGain.gain.value = mod;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    source.connect(filter);
    filter.connect(g);
    g.connect(this.ambienceBus);
    source.start(when);
    lfo.start(when);
    source.stop(when + 900);
    lfo.stop(when + 900);
    this.ambienceSources.add(source);
    this.ambienceSources.add(lfo);
    source.onended = () => {
      this.ambienceSources.delete(source);
      this.ambienceSources.delete(lfo);
    };
  }

  private startRumble(when: number, freq: number, gain: number): void {
    if (!this.ctx || !this.ambienceBus) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 2.4);
    osc.connect(g);
    g.connect(this.ambienceBus);
    osc.start(when);
    osc.stop(when + 900);
    this.ambienceSources.add(osc);
    osc.onended = () => this.ambienceSources.delete(osc);
  }

  private stopMusic(fade = 1): void {
    if (!this.ctx || !this.musicBus) return;
    this.musicSilenced = true;
    const now = this.ctx.currentTime;
    const gain = this.musicBus.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0.0001, now + fade);
  }

  private stopAll(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.activeSources.clear();
    for (const source of this.ambienceSources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.ambienceSources.clear();
    if (this.ctx && this.musicBus) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(0.34, now);
    }
  }

  private triggerSfx(id: SfxId, gain: number, when: number): void {
    const g = Math.max(0, Math.min(1.4, gain));
    switch (id) {
      case 'whistle':
        this.playWhistle(when, 0.04 * g + 0.012);
        break;
      case 'steam':
        this.playNoiseHit(when, 900, 0.9, 0.035 * g + 0.01, 'highpass');
        break;
      case 'bell':
        this.playBell(60, when, 0.035 * g + 0.012);
        break;
      case 'clock':
        this.playClock(when, 0.025 * g);
        break;
      case 'steps':
        this.playSteps(when, 0.025 * g + 0.01);
        break;
      case 'door':
        this.playDoor(when, 0.035 * g + 0.012);
        break;
      case 'crowd':
        this.playNoiseHit(when, 800, 2.2, 0.025 * g + 0.008, 'bandpass');
        break;
      case 'horses':
        this.playHorses(when, 0.03 * g + 0.008);
        break;
      case 'rain':
        this.playNoiseHit(when, 1600, 2.4, 0.02 * g + 0.006, 'highpass');
        break;
      case 'glass':
        this.playGlass(when, 0.02 * g + 0.006);
        break;
      case 'paper':
        this.playNoiseHit(when, 2200, 0.35, 0.018 * g + 0.005, 'highpass');
        break;
      case 'fire':
        this.playCrackle(when, 0.02 * g);
        break;
      case 'wind':
        this.playNoiseHit(when, 380, 3.5, 0.018 * g + 0.006, 'lowpass');
        break;
      case 'applause':
        this.playNoiseHit(when, 1400, 1.6, 0.02 * g + 0.006, 'bandpass');
        break;
      case 'heartbeat':
        this.playHeartbeat(when, 0.035 * g + 0.01);
        break;
      case 'train':
        this.playTrain(when, 0.03 * g + 0.01);
        break;
      case 'carriage':
        this.playCarriage(when, 0.025 * g + 0.008);
        break;
      case 'birds':
        this.playBirds(when, 0.015 * g + 0.004);
        break;
      case 'insects':
        this.playNoiseHit(when, 4200, 1.4, 0.007 * g + 0.002, 'highpass');
        break;
      case 'samovar':
        this.playNoiseHit(when, 1200, 0.7, 0.015 * g + 0.004, 'highpass');
        break;
      case 'baby':
        this.playBaby(when, 0.02 * g + 0.005);
        break;
      case 'gasp':
        this.playNoiseHit(when, 700, 0.35, 0.015 * g + 0.004, 'bandpass');
        break;
      case 'thud':
        this.playThud(when, 0.045 * g + 0.01);
        break;
    }
  }

  private connectMusic(node: AudioNode): void {
    if (this.musicBus) node.connect(this.musicBus);
  }

  private connectSfx(node: AudioNode): void {
    if (this.sfxBus) node.connect(this.sfxBus);
  }

  private playStrings(midi: number, when: number, duration: number, velocity: number): void {
    if (!this.ctx) return;
    const freq = midiToFreq(midi);
    const bus = this.ctx.createGain();
    bus.gain.value = 0;
    const attack = Math.min(1.6, duration * 0.35);
    const release = Math.min(2.2, duration * 0.4);
    bus.gain.setValueAtTime(0.0001, when);
    bus.gain.linearRampToValueAtTime(velocity, when + attack);
    bus.gain.setValueAtTime(velocity, when + Math.max(attack, duration - release));
    bus.gain.linearRampToValueAtTime(0.0001, when + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900 + 800 * (1 - clamp01((midi - 40) / 50));
    filter.Q.value = 0.6;
    bus.connect(filter);
    this.connectMusic(filter);
    const count = 2;
    for (let i = 0; i < count; i += 1) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = i === 0 ? -5 : 6;
      const g = this.ctx.createGain();
      g.gain.value = i === 0 ? 0.55 : 0.25;
      osc.connect(g);
      g.connect(bus);
      osc.start(when);
      osc.stop(when + duration + 0.08);
      this.activeSources.add(osc);
      osc.onended = () => this.activeSources.delete(osc);
    }
  }

  private playCello(midi: number, when: number, duration: number, velocity: number): void {
    if (!this.ctx) return;
    const freq = midiToFreq(midi);
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq / 2;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(velocity, when + Math.min(1.2, duration * 0.3));
    g.gain.setValueAtTime(velocity, when + Math.max(1.2, duration - 1.5));
    g.gain.linearRampToValueAtTime(0.0001, when + duration);
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.25;
    osc.connect(filter);
    sub.connect(subGain);
    subGain.connect(filter);
    filter.connect(g);
    this.connectMusic(g);
    osc.start(when);
    sub.start(when);
    osc.stop(when + duration + 0.08);
    sub.stop(when + duration + 0.08);
    this.activeSources.add(osc);
    this.activeSources.add(sub);
    osc.onended = () => {
      this.activeSources.delete(osc);
      this.activeSources.delete(sub);
    };
  }

  private playPiano(midi: number, when: number, duration: number, velocity: number): void {
    if (!this.ctx) return;
    const freq = midiToFreq(midi);
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = freq;
    const harmonic = this.ctx.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.value = freq * 2;
    const hg = this.ctx.createGain();
    hg.gain.value = 0.18;
    const g = this.ctx.createGain();
    const end = when + Math.min(2.6, Math.max(0.45, duration));
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, velocity), when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    carrier.connect(g);
    harmonic.connect(hg);
    hg.connect(g);
    this.connectMusic(g);
    carrier.start(when);
    harmonic.start(when);
    carrier.stop(end + 0.05);
    harmonic.stop(end + 0.05);
    this.activeSources.add(carrier);
    this.activeSources.add(harmonic);
    carrier.onended = () => {
      this.activeSources.delete(carrier);
      this.activeSources.delete(harmonic);
    };
  }

  private playFlute(midi: number, when: number, duration: number, velocity: number): void {
    if (!this.ctx) return;
    const freq = midiToFreq(midi);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 5.1;
    lfoGain.gain.value = freq * 0.006;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const g = this.ctx.createGain();
    const end = when + duration;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(velocity, when + Math.min(0.8, duration * 0.25));
    g.gain.setValueAtTime(velocity, when + Math.max(0.8, duration - 0.5));
    g.gain.linearRampToValueAtTime(0.0001, end);
    osc.connect(g);
    this.connectMusic(g);
    osc.start(when);
    lfo.start(when);
    osc.stop(end + 0.05);
    lfo.stop(end + 0.05);
    this.activeSources.add(osc);
    this.activeSources.add(lfo);
    osc.onended = () => {
      this.activeSources.delete(osc);
      this.activeSources.delete(lfo);
    };
  }

  private playViolin(midi: number, when: number, duration: number, velocity: number): void {
    if (!this.ctx) return;
    const freq = midiToFreq(midi);
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const vibrato = this.ctx.createOscillator();
    const vg = this.ctx.createGain();
    vibrato.frequency.value = 4.7;
    vg.gain.value = freq * 0.008;
    vibrato.connect(vg);
    vg.connect(osc.frequency);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq * 2.2;
    filter.Q.value = 1.4;
    const g = this.ctx.createGain();
    const end = when + duration;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(velocity, when + Math.min(0.7, duration * 0.3));
    g.gain.setValueAtTime(velocity, when + Math.max(0.7, duration - 0.6));
    g.gain.linearRampToValueAtTime(0.0001, end);
    osc.connect(filter);
    filter.connect(g);
    this.connectMusic(g);
    osc.start(when);
    vibrato.start(when);
    osc.stop(end + 0.05);
    vibrato.stop(end + 0.05);
    this.activeSources.add(osc);
    this.activeSources.add(vibrato);
    osc.onended = () => {
      this.activeSources.delete(osc);
      this.activeSources.delete(vibrato);
    };
  }

  private playBell(midi: number, when: number, velocity: number): void {
    if (!this.ctx) return;
    const freq = midiToFreq(midi);
    const partials = [1, 2.01, 2.98, 4.1];
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, velocity), when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 4.2);
    this.connectMusic(g);
    partials.forEach((partial, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * partial;
      const pg = this.ctx.createGain();
      pg.gain.value = 0.5 / (i + 1);
      osc.connect(pg);
      pg.connect(g);
      osc.start(when);
      osc.stop(when + 4.3);
      this.activeSources.add(osc);
      osc.onended = () => this.activeSources.delete(osc);
    });
  }

  private playTimpani(midi: number, when: number, velocity: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(midiToFreq(midi), when);
    osc.frequency.exponentialRampToValueAtTime(midiToFreq(midi) * 0.72, when + 0.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, velocity), when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.8);
    osc.connect(g);
    this.connectMusic(g);
    osc.start(when);
    osc.stop(when + 0.85);
    this.activeSources.add(osc);
    osc.onended = () => this.activeSources.delete(osc);
  }

  private playTrainPulse(when: number, velocity: number): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(velocity, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    source.connect(filter);
    filter.connect(g);
    this.connectMusic(g);
    source.start(when);
    source.stop(when + 0.22);
    this.activeSources.add(source);
    source.onended = () => this.activeSources.delete(source);
  }

  private playNoiseHit(when: number, cutoff: number, duration: number, velocity: number, type: BiquadFilterType): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, velocity), when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(g);
    this.connectSfx(g);
    source.start(when);
    source.stop(when + duration + 0.05);
    this.activeSources.add(source);
    source.onended = () => this.activeSources.delete(source);
  }

  private playWhistle(when: number, velocity: number): void {
    if (!this.ctx) return;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(velocity, when + 0.08);
    g.gain.setValueAtTime(velocity, when + 0.7);
    g.gain.linearRampToValueAtTime(0.0001, when + 1.5);
    this.connectSfx(g);
    [0, 1].forEach((i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620 + i * 180, when);
      osc.frequency.linearRampToValueAtTime(880 + i * 220, when + 0.45);
      osc.frequency.linearRampToValueAtTime(540 + i * 160, when + 1.4);
      const og = this.ctx.createGain();
      og.gain.value = 0.4;
      osc.connect(og);
      og.connect(g);
      osc.start(when);
      osc.stop(when + 1.5);
      this.activeSources.add(osc);
      osc.onended = () => this.activeSources.delete(osc);
    });
  }

  private playClock(when: number, velocity: number): void {
    this.playNoiseHit(when, 2600, 0.05, velocity, 'highpass');
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1780;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(velocity * 0.7, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
    osc.connect(g);
    this.connectSfx(g);
    osc.start(when);
    osc.stop(when + 0.1);
    this.activeSources.add(osc);
    osc.onended = () => this.activeSources.delete(osc);
  }

  private playSteps(when: number, velocity: number): void {
    for (let i = 0; i < 4; i += 1) {
      this.playNoiseHit(when + i * 0.19, 420, 0.12, velocity * (1 - i * 0.12), 'lowpass');
    }
  }

  private playDoor(when: number, velocity: number): void {
    this.playNoiseHit(when, 220, 0.4, velocity, 'lowpass');
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(72, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(velocity * 0.8, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
    osc.connect(g);
    this.connectSfx(g);
    osc.start(when);
    osc.stop(when + 0.75);
    this.activeSources.add(osc);
    osc.onended = () => this.activeSources.delete(osc);
  }

  private playHorses(when: number, velocity: number): void {
    for (let i = 0; i < 5; i += 1) {
      this.playNoiseHit(when + i * 0.13, 260, 0.07, velocity * (1 - i * 0.1), 'lowpass');
    }
  }

  private playGlass(when: number, velocity: number): void {
    if (!this.ctx) return;
    [1760, 2350].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(velocity / (i + 1), when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
      osc.connect(g);
      this.connectSfx(g);
      osc.start(when);
      osc.stop(when + 0.65);
      this.activeSources.add(osc);
      osc.onended = () => this.activeSources.delete(osc);
    });
  }

  private playCrackle(when: number, velocity: number): void {
    this.playNoiseHit(when, 1800, 0.08, velocity, 'highpass');
  }

  private playHeartbeat(when: number, velocity: number): void {
    for (let i = 0; i < 2; i += 1) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(58, when + i * 0.18);
      osc.frequency.exponentialRampToValueAtTime(42, when + i * 0.18 + 0.15);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(velocity, when + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, when + i * 0.18 + 0.3);
      osc.connect(g);
      this.connectSfx(g);
      osc.start(when + i * 0.18);
      osc.stop(when + i * 0.18 + 0.34);
      this.activeSources.add(osc);
      osc.onended = () => this.activeSources.delete(osc);
    }
  }

  private playTrain(when: number, velocity: number): void {
    this.playNoiseHit(when, 150, 2.2, velocity, 'lowpass');
    for (let i = 0; i < 4; i += 1) {
      this.playNoiseHit(when + i * 0.34, 220, 0.12, velocity * 0.5, 'lowpass');
    }
  }

  private playCarriage(when: number, velocity: number): void {
    this.playNoiseHit(when, 300, 1.2, velocity, 'bandpass');
    for (let i = 0; i < 3; i += 1) {
      this.playNoiseHit(when + i * 0.28, 180, 0.1, velocity * 0.6, 'lowpass');
    }
  }

  private playBirds(when: number, velocity: number): void {
    if (!this.ctx) return;
    [0, 0.18, 0.42].forEach((offset, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const base = 2100 + i * 260;
      osc.frequency.setValueAtTime(base, when + offset);
      osc.frequency.exponentialRampToValueAtTime(base * 1.5, when + offset + 0.08);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(velocity, when + offset);
      g.gain.exponentialRampToValueAtTime(0.0001, when + offset + 0.12);
      osc.connect(g);
      this.connectSfx(g);
      osc.start(when + offset);
      osc.stop(when + offset + 0.15);
      this.activeSources.add(osc);
      osc.onended = () => this.activeSources.delete(osc);
    });
  }

  private playBaby(when: number, velocity: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, when);
    osc.frequency.linearRampToValueAtTime(680, when + 0.35);
    osc.frequency.linearRampToValueAtTime(430, when + 0.95);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(velocity, when + 0.06);
    g.gain.linearRampToValueAtTime(0.0001, when + 1.1);
    osc.connect(g);
    this.connectSfx(g);
    osc.start(when);
    osc.stop(when + 1.15);
    this.activeSources.add(osc);
    osc.onended = () => this.activeSources.delete(osc);
  }

  private playThud(when: number, velocity: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(74, when);
    osc.frequency.exponentialRampToValueAtTime(34, when + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(velocity, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
    osc.connect(g);
    this.connectSfx(g);
    osc.start(when);
    osc.stop(when + 0.6);
    this.activeSources.add(osc);
    osc.onended = () => this.activeSources.delete(osc);
  }

  private applyGain(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const target = this.muted ? 0.0001 : Math.max(0.0001, this.volume * 0.78);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(target, now + 0.18);
  }

  private makeImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.6;
      }
    }
    return buffer;
  }

  private makeNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  destroy(): void {
    this.disposed = true;
    this.stopAll();
    try {
      void this.ctx?.close();
    } catch {
      // Ignore.
    }
    this.ctx = null;
  }
}
