import type { CompiledFilm, LineCue } from '../data/types';
import { eventsBetween } from '../screenplay/queries';
import { buildScore, midiToFreq, type ScoreNote } from './score';

interface VolumeState {
  music: number;
  ambience: number;
  dialogue: number;
}

interface AmbienceNode {
  env: string;
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
}

const SPEAKER_PITCH: Record<string, number> = {
  ETIENNE: 0.82,
  ETIENNE_VO: 0.86,
  RENAUD: 0.72,
  MINA: 1.45,
  AICHA: 1.2,
  AICHA_TAPE: 1.24,
  ROSE: 1.12,
  GUARDIA: 0.78,
  PROPRIETARIO: 0.9,
  IMPIEGATO: 0.95,
  INFERMIERA: 1.1,
  PASSANTE: 0.95
};

export class AudioEngine {
  private film: CompiledFilm;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private sfxBus!: GainNode;
  private wetSend!: GainNode;
  private reverb!: ConvolverNode;
  private volumes: VolumeState = { music: 0.7, ambience: 0.75, dialogue: 1 };
  private duck = false;
  private notes: ScoreNote[] = [];
  private scheduled = new Set<number>();
  private musicNodes: AudioScheduledSourceNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private amb: AmbienceNode | null = null;
  private ambEnv = '';
  private lastT = 0;
  private currentLineId: string | null = null;
  private wasPlaying = false;
  private voicesEnabled = true;
  private lastRate = 1;
  private initialized = false;

  constructor(film: CompiledFilm) {
    this.film = film;
    this.notes = buildScore(film);
  }

  init(): boolean {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      return true;
    }
    if (typeof window === 'undefined') return false;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    try {
      this.ctx = new Ctor();
    } catch {
      return false;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.volumes.music * 0.8;
    this.musicBus.connect(this.master);

    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = this.volumes.ambience * 0.9;
    this.ambBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.6);
    this.wetSend = ctx.createGain();
    this.wetSend.gain.value = 0.28;
    this.wetSend.connect(this.reverb);
    this.reverb.connect(this.musicBus);

    this.noiseBuffer = this.makeNoise(2.0);
    this.initialized = true;
    return true;
  }

  get ready(): boolean {
    return this.initialized && this.ctx !== null;
  }

  get contextState(): string {
    return this.ctx?.state ?? 'unavailable';
  }

  hasItalianVoice(): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    return window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith('it'));
  }

  setVolumes(next: Partial<VolumeState>): void {
    this.volumes = { ...this.volumes, ...next };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const duckFactor = this.duck ? 0.38 : 1;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.8 * duckFactor, now, 0.15);
    this.ambBus.gain.setTargetAtTime(this.volumes.ambience * 0.9, now, 0.2);
  }

  setVoiceEnabled(enabled: boolean): void {
    this.voicesEnabled = enabled;
    if (!enabled) this.cancelVoice();
  }

  seek(t: number, env: string): void {
    this.lastT = t;
    this.scheduled.clear();
    this.stopMusicNodes();
    if (env) this.setAmbience(env);
    this.currentLineId = null;
    this.cancelVoice();
  }

  tick(t: number, frame: { env: string; line: LineCue | null }, playing: boolean, rate = 1): void {
    if (!this.ctx) {
      this.lastT = t;
      return;
    }
    if (frame.env && frame.env !== this.ambEnv) this.setAmbience(frame.env);
    const ctx = this.ctx;

    if (Math.abs(rate - this.lastRate) > 0.001) {
      this.lastRate = rate;
      this.scheduled.clear();
      this.stopMusicNodes();
    }

    if (playing) {
      const windowEnd = t + 1.4;
      for (let i = 0; i < this.notes.length; i += 1) {
        if (this.scheduled.has(i)) continue;
        const note = this.notes[i];
        if (note.at > windowEnd) break;
        if (note.at < t - 0.2) continue;
        if (note.at < t - 0.05) continue;
        this.scheduled.add(i);
        const delay = Math.max(0, (note.at - t) / rate);
        this.playScoreNote(note, delay);
      }
      this.pruneMusicNodes(t);

      const events = eventsBetween(this.film, this.lastT, t);
      if (t - this.lastT < 1.5) {
        for (const event of events) this.playEvent(event.type);
      }

      if (frame.line) {
        if (this.currentLineId !== frame.line.id) {
          this.currentLineId = frame.line.id;
          if (t - frame.line.start < 0.5) this.speak(frame.line);
        }
      } else {
        this.currentLineId = null;
      }
    } else {
      if (this.wasPlaying) this.cancelVoice();
    }

    this.wasPlaying = playing;
    this.lastT = t;
    void ctx;
  }

  private setAmbience(env: string): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (this.amb && this.amb.env === env) return;
    if (this.amb) {
      const old = this.amb;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), now);
      old.gain.gain.linearRampToValueAtTime(0.0001, now + 1.4);
      for (const source of old.sources) {
        try {
          source.stop(now + 1.6);
        } catch {
          void 0;
        }
      }
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.9, now + 1.8);
    gain.connect(this.ambBus);
    const sources = this.buildAmbience(env, gain);
    this.amb = { env, gain, sources };
    this.ambEnv = env;
  }

  private buildAmbience(env: string, out: GainNode): AudioScheduledSourceNode[] {
    const ctx = this.ctx as AudioContext;
    const sources: AudioScheduledSourceNode[] = [];
    const noise = (level: number, type: BiquadFilterType, freq: number, q = 0.8): AudioBufferSourceNode => {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = level;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      source.start();
      sources.push(source);
      return source;
    };
    const hum = (freq: number, level: number, type: OscillatorType = 'sine'): void => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(out);
      osc.start();
      sources.push(osc);
    };

    switch (env) {
      case 'prison':
        noise(0.16, 'lowpass', 430, 0.6);
        noise(0.04, 'bandpass', 1200, 0.8);
        hum(52, 0.012);
        break;
      case 'bakery':
        noise(0.035, 'lowpass', 320);
        hum(100, 0.018);
        hum(150, 0.008);
        break;
      case 'jobOffice':
        noise(0.03, 'highpass', 3500);
        hum(120, 0.018);
        break;
      case 'belleville':
        noise(0.12, 'lowpass', 720);
        noise(0.04, 'bandpass', 1500, 0.6);
        hum(60, 0.015);
        break;
      case 'gare':
        noise(0.12, 'lowpass', 300);
        noise(0.05, 'bandpass', 900, 0.7);
        hum(48, 0.02);
        hum(96, 0.01);
        break;
      case 'phoneCorner':
      case 'nightAvenue':
      case 'metroEntrance':
        noise(0.16, 'highpass', 1200);
        noise(0.1, 'lowpass', 300);
        hum(55, 0.012);
        break;
      case 'hospitalCorridor':
      case 'hospitalRoom':
        noise(0.025, 'highpass', 2400);
        hum(120, 0.02);
        hum(240, 0.006);
        break;
      case 'laundrette':
        noise(0.12, 'bandpass', 320, 1.2);
        noise(0.04, 'highpass', 1600);
        hum(100, 0.018);
        break;
      case 'dawnStreet':
        noise(0.08, 'lowpass', 620);
        noise(0.03, 'highpass', 2200);
        break;
      default:
        noise(0.06, 'lowpass', 500);
        break;
    }

    if (env === 'laundrette') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 2.3;
      const depth = ctx.createGain();
      depth.gain.value = 0.008;
      osc.connect(depth);
      osc.start();
      sources.push(osc);
    }

    return sources;
  }

  private playScoreNote(note: ScoreNote, delay: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const freq = midiToFreq(note.pitch);
    const dest = ctx.createGain();
    dest.gain.value = note.velocity;
    const panner = ctx.createStereoPanner();
    panner.pan.value = note.pan;
    dest.connect(panner);
    panner.connect(this.musicBus);
    panner.connect(this.wetSend);

    const envelope = (attack: number, hold: number, release: number): GainNode => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(1, start + attack);
      g.gain.setValueAtTime(1, start + Math.max(attack, note.dur * hold));
      g.gain.exponentialRampToValueAtTime(0.0001, start + note.dur + release);
      g.connect(dest);
      return g;
    };

    const osc = (type: OscillatorType, frequency: number, detune: number, gainNode: GainNode): void => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = frequency;
      o.detune.value = detune;
      o.connect(gainNode);
      o.start(start);
      o.stop(start + note.dur + 2.5);
      this.musicNodes.push(o);
    };

    switch (note.instrument) {
      case 'piano': {
        const env = envelope(0.006, 0.15, 0.8);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3200;
        filter.connect(env);
        osc('triangle', freq, 0, filter);
        const sub = ctx.createGain();
        sub.gain.value = 0.35;
        sub.connect(filter);
        osc('sine', freq * 2, 3, sub);
        break;
      }
      case 'strings': {
        const env = envelope(1.1, 0.7, 1.4);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 950;
        filter.Q.value = 0.4;
        filter.connect(env);
        osc('sawtooth', freq, -5, filter);
        osc('sawtooth', freq, 5, filter);
        break;
      }
      case 'pad': {
        const env = envelope(2.4, 0.8, 2.0);
        osc('sine', freq, 0, env);
        const g = ctx.createGain();
        g.gain.value = 0.4;
        g.connect(env);
        osc('triangle', freq * 1.5, 0, g);
        break;
      }
      case 'accordion': {
        const env = envelope(0.15, 0.7, 0.5);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 0.7;
        filter.connect(env);
        osc('square', freq, -3, filter);
        osc('sawtooth', freq, 4, filter);
        const tremolo = ctx.createOscillator();
        tremolo.frequency.value = 5.4;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.12;
        tremolo.connect(tremoloGain);
        tremoloGain.connect(env.gain);
        tremolo.start(start);
        tremolo.stop(start + note.dur + 1);
        this.musicNodes.push(tremolo);
        break;
      }
      case 'bass': {
        const env = envelope(0.08, 0.5, 0.8);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        filter.connect(env);
        osc('sine', freq, 0, filter);
        const g = ctx.createGain();
        g.gain.value = 0.35;
        g.connect(filter);
        osc('triangle', freq, 0, g);
        break;
      }
      case 'bell': {
        const env = envelope(0.004, 0.05, 0.6);
        osc('sine', freq, 0, env);
        const g = ctx.createGain();
        g.gain.value = 0.25;
        g.connect(env);
        osc('sine', freq * 2.7, 0, g);
        break;
      }
      default:
        break;
    }
  }

  private pruneMusicNodes(t: number): void {
    if (this.musicNodes.length > 120) {
      this.musicNodes = this.musicNodes.slice(-80);
    }
    void t;
  }

  private stopMusicNodes(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const node of this.musicNodes) {
      try {
        node.stop(ctx.currentTime);
      } catch {
        void 0;
      }
    }
    this.musicNodes = [];
  }

  private playEvent(type: string): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    switch (type) {
      case 'a1_gate_open':
      case 'a1_gate_close':
        this.metalClang(now, type === 'a1_gate_close');
        break;
      case 'a1_bus_arrive':
        this.engineSound(now, 5.0, 0.9);
        this.hiss(now + 4.4, 0.9);
        break;
      case 'a1_bus_leave':
        this.engineSound(now, 5.5, 0.8);
        break;
      case 'a2_door_open':
      case 'a2_door_close':
      case 'a2_office_door':
      case 'a4_hospital_door':
      case 'a5_door_open':
        this.doorSound(now, type.includes('open'));
        break;
      case 'a3_tape_out':
      case 'a3_tape_stop':
        this.tapeClick(now);
        break;
      case 'a3_paper_out':
      case 'a6_paper_handed':
        this.paperSound(now);
        break;
      case 'a3_train_pass':
        this.trainPass(now);
        break;
      case 'a4_phone_dial':
        this.dialTone(now);
        break;
      case 'a4_renaud_step':
      case 'a5_renaud_arrives':
      case 'a5_renaud_leaves':
      case 'a5_approach':
        this.steps(now, 3);
        break;
      case 'a6_window_open':
        this.windowCreak(now);
        break;
      case 'a6_end_card':
        this.endChord(now);
        break;
      default:
        break;
    }
  }

  private noiseBurst(at: number, dur: number, type: BiquadFilterType, freq: number, level: number, q = 0.8): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    source.start(at);
    source.stop(at + dur + 0.05);
  }

  private tone(at: number, freq: number, dur: number, level: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  private metalClang(at: number, low: boolean): void {
    this.noiseBurst(at, 0.5, 'bandpass', 2400, 0.22, 1.2);
    this.tone(at, low ? 118 : 164, 1.1, 0.18, 'triangle');
    this.tone(at + 0.01, low ? 187 : 247, 0.9, 0.12, 'sine');
    this.tone(at + 0.02, low ? 263 : 331, 0.7, 0.08, 'sine');
    this.tone(at + 0.3, 62, 0.8, 0.15, 'sine');
  }

  private engineSound(at: number, dur: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(42, at);
    osc.frequency.linearRampToValueAtTime(58, at + 1.5);
    osc.frequency.linearRampToValueAtTime(46, at + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.08 * level, at + 0.8);
    gain.gain.linearRampToValueAtTime(0.06 * level, at + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0.0001, at + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(at);
    osc.stop(at + dur + 0.1);
    this.noiseBurst(at, dur, 'lowpass', 220, 0.04 * level);
  }

  private hiss(at: number, level: number): void {
    this.noiseBurst(at, 0.7, 'highpass', 2600, 0.09 * level);
  }

  private doorSound(at: number, open: boolean): void {
    this.tone(at, open ? 84 : 70, 0.5, 0.1, 'sawtooth');
    this.tone(at + 0.05, open ? 118 : 96, 0.35, 0.06, 'sawtooth');
    this.tone(at + 0.22, 58, 0.5, 0.09, 'sine');
    this.noiseBurst(at + 0.3, 0.15, 'lowpass', 400, 0.05);
  }

  private tapeClick(at: number): void {
    this.noiseBurst(at, 0.05, 'highpass', 3000, 0.12);
    this.tone(at, 1800, 0.03, 0.05, 'square');
    this.noiseBurst(at + 0.04, 0.5, 'bandpass', 4000, 0.02, 0.5);
  }

  private paperSound(at: number): void {
    this.noiseBurst(at, 0.35, 'highpass', 2800, 0.05, 0.5);
  }

  private trainPass(at: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.14, at + 2.2);
    gain.gain.linearRampToValueAtTime(0.12, at + 4.0);
    gain.gain.linearRampToValueAtTime(0.0001, at + 6.2);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    source.start(at);
    source.stop(at + 6.4);
    for (let i = 0; i < 12; i += 1) {
      this.tone(at + 0.4 + i * 0.42, 64, 0.12, 0.05, 'sine');
    }
  }

  private dialTone(at: number): void {
    this.tone(at, 440, 0.6, 0.035);
    this.tone(at + 0.7, 480, 1.2, 0.03);
    this.tone(at + 2.0, 440, 0.4, 0.03);
  }

  private steps(at: number, count: number): void {
    for (let i = 0; i < count; i += 1) {
      this.noiseBurst(at + i * 0.38, 0.12, 'lowpass', 420, 0.06);
    }
  }

  private windowCreak(at: number): void {
    this.tone(at, 120, 0.9, 0.05, 'sawtooth');
    this.tone(at + 0.1, 150, 0.7, 0.035, 'sawtooth');
    this.noiseBurst(at + 0.2, 0.4, 'bandpass', 900, 0.03, 1.5);
  }

  private endChord(at: number): void {
    const pitches = [57, 60, 64, 69];
    pitches.forEach((pitch, i) => {
      this.tone(at + i * 0.12, midiToFreq(pitch), 3.6, 0.05, 'triangle');
      this.tone(at + i * 0.12, midiToFreq(pitch + 12), 3.0, 0.015, 'sine');
    });
  }

  private speak(line: LineCue): void {
    if (!this.voicesEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.lang = 'it-IT';
      utterance.rate = 0.94;
      utterance.pitch = SPEAKER_PITCH[line.speaker] ?? 1;
      utterance.volume = Math.max(0, Math.min(1, this.volumes.dialogue));
      const voices = window.speechSynthesis.getVoices();
      const italian = voices.find((v) => v.lang.toLowerCase().startsWith('it'));
      if (italian) utterance.voice = italian;
      utterance.onstart = () => this.setDuck(true);
      utterance.onend = () => this.setDuck(false);
      utterance.onerror = () => this.setDuck(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      void 0;
    }
  }

  private cancelVoice(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      void 0;
    }
    this.setDuck(false);
  }

  private setDuck(on: boolean): void {
    if (this.duck === on) return;
    this.duck = on;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.8 * (on ? 0.38 : 1), now, 0.25);
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      data[i] = last * 3 + white * 0.25;
    }
    return buffer;
  }

  private makeImpulse(seconds: number): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const decay = Math.pow(1 - i / length, 2.6);
        data[i] = (Math.random() * 2 - 1) * decay * 0.6;
      }
    }
    return buffer;
  }

  dispose(): void {
    this.cancelVoice();
    if (this.ctx) {
      this.stopMusicNodes();
      if (this.amb) {
        for (const source of this.amb.sources) {
          try {
            source.stop();
          } catch {
            void 0;
          }
        }
      }
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
