import { heartRate } from './cells';
import { clamp, smoothstep } from './util';

type EventKind =
  | 'heart'
  | 'pad'
  | 'bass'
  | 'bell'
  | 'pizz'
  | 'noise'
  | 'sine'
  | 'shimmer'
  | 'gulp'
  | 'snap'
  | 'flatline';

interface ScoreEvent {
  time: number;
  kind: EventKind;
  freq?: number;
  dur: number;
  gain: number;
  pan?: number;
  glide?: number;
}

const NOTE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function midi(note: string): number {
  const match = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!match) return 0;
  const name = match[1]!;
  const octave = Number(match[2]);
  return (octave + 1) * 12 + (NOTE[name] ?? 0);
}

function freq(note: string): number {
  return 440 * Math.pow(2, (midi(note) - 69) / 12);
}

function buildEvents(): ScoreEvent[] {
  const events: ScoreEvent[] = [];

  // The heartbeat is the clock of the whole score.
  let t = 0.8;
  let beatIndex = 0;
  while (t < 718) {
    const bpm = heartRate(t);
    const irregular = t > 660 ? Math.sin(beatIndex * 2.1) * 0.18 : Math.sin(beatIndex * 1.7) * 0.035;
    events.push({ time: t, kind: 'heart', dur: 0.55, gain: 0.15, pan: Math.sin(t * 0.1) * 0.05 });
    t += 60 / bpm + irregular;
    beatIndex++;
  }
  // Three last beats, then nothing.
  for (const beat of [722, 726, 730]) {
    events.push({ time: beat, kind: 'heart', dur: 0.75, gain: 0.2, pan: 0 });
  }

  // Slow harmonic weather, a new chord every twelve seconds.
  const progressions: string[][][] = [
    [['D2', 'A2', 'F3'], ['Bb1', 'F2', 'D3'], ['G1', 'D2', 'Bb2'], ['A1', 'E2', 'C#3']],
    [['D2', 'A2', 'F3'], ['F2', 'C3', 'A3'], ['Bb1', 'F2', 'D3'], ['A1', 'E2', 'C#3']],
    [['D2', 'A2', 'E3'], ['Bb1', 'F2', 'D3'], ['G1', 'D2', 'Bb2'], ['A1', 'E2', 'C#3']],
    [['D2', 'F2', 'A2'], ['Bb1', 'D2', 'F2'], ['G1', 'Bb1', 'D2'], ['A1', 'C#2', 'E2']],
    [['D2', 'A2', 'F3'], ['G1', 'D2', 'Bb2'], ['Bb1', 'F2', 'D3'], ['A1', 'E2', 'C#3']],
    [['D2', 'A2', 'F3'], ['D2', 'A2', 'E3'], ['Bb1', 'F2', 'D3'], ['A1', 'E2', 'C#3']],
    [['D2', 'F2', 'A2'], ['Bb1', 'F2', 'D3'], ['G1', 'D2', 'Bb2'], ['D2', 'A2', 'F3']],
    [['F2', 'C3', 'A3'], ['Bb1', 'F2', 'D3'], ['D2', 'A2', 'F3'], ['A1', 'E2', 'C#3']],
    [['D2', 'A2', 'F3'], ['Bb1', 'F2', 'D3'], ['G1', 'D2', 'Bb2'], ['A1', 'E2', 'C#3']],
    [['D2', 'F2', 'A2'], ['G1', 'D2', 'Bb2'], ['Bb1', 'F2', 'D3'], ['D2', 'A2', 'F3']],
  ];

  for (let start = 0; start < 770; start += 12) {
    const chapterIndex = clamp(Math.floor(start / 78), 0, progressions.length - 1);
    const progression = progressions[chapterIndex] ?? progressions[0]!;
    const chord = progression[Math.floor(start / 12) % progression.length] ?? progression[0]!;
    for (const note of chord) {
      events.push({
        time: start,
        kind: 'pad',
        freq: freq(note),
        dur: 14,
        gain: 0.022,
        pan: (midi(note) % 5 - 2) * 0.06,
      });
    }
    if (Math.floor(start / 12) % 2 === 0) {
      events.push({
        time: start + 0.4,
        kind: 'bass',
        freq: freq(chord[0]!),
        dur: 10,
        gain: 0.035,
      });
    }
    // A low noise bed, like blood moving in a room.
    events.push({ time: start, kind: 'noise', dur: 12.8, gain: 0.01 });
  }

  // The body's five-note theme, at the beginning of each chapter.
  const bodyTheme = ['D4', 'A3', 'F3', 'E3', 'D3'];
  const chapterStarts = [0, 60, 160, 245, 335, 430, 525, 615, 695, 750];
  for (const start of chapterStarts) {
    bodyTheme.forEach((note, i) => {
      events.push({
        time: start + 1.2 + i * 0.62,
        kind: 'bell',
        freq: freq(note),
        dur: 3.2,
        gain: 0.028,
        pan: -0.15 + i * 0.07,
      });
    });
  }

  // The messenger's rising three-note phrase.
  for (const start of [4, 48, 336, 696, 736]) {
    ['F4', 'G4', 'A4'].forEach((note, i) => {
      events.push({
        time: start + i * 0.8,
        kind: 'sine',
        freq: freq(note),
        dur: 3.6,
        gain: 0.025,
        pan: 0.12,
      });
    });
  }

  // The residents: a curious pizzicato in odd meter.
  for (const start of [336, 354, 372, 392, 412, 486, 506]) {
    ['G3', 'Bb3', 'D4', 'F4', 'D4', 'Bb3'].forEach((note, i) => {
      events.push({
        time: start + i * 0.34,
        kind: 'pizz',
        freq: freq(note),
        dur: 0.7,
        gain: 0.026,
        pan: 0.2,
      });
    });
  }

  // Sound design beats.
  const sfx: ScoreEvent[] = [
    { time: 0.2, kind: 'sine', freq: freq('D2'), dur: 8, gain: 0.03 },
    { time: 11.5, kind: 'noise', dur: 3.2, gain: 0.03 },
    { time: 244, kind: 'noise', dur: 4.0, gain: 0.035 },
    { time: 279.4, kind: 'snap', dur: 0.5, gain: 0.11 },
    { time: 280, kind: 'noise', dur: 2.8, gain: 0.045 },
    { time: 307.5, kind: 'gulp', dur: 0.7, gain: 0.11 },
    { time: 465.4, kind: 'snap', dur: 0.4, gain: 0.1 },
    { time: 524, kind: 'sine', freq: freq('D1'), dur: 6, gain: 0.04 },
    { time: 614, kind: 'shimmer', dur: 4, gain: 0.018 },
    { time: 632, kind: 'bell', freq: freq('A4'), dur: 4, gain: 0.022 },
    { time: 650, kind: 'shimmer', dur: 6, gain: 0.016 },
    { time: 694, kind: 'sine', freq: freq('D3'), dur: 9, gain: 0.025 },
    { time: 735.4, kind: 'flatline', freq: 1000, dur: 14, gain: 0.018 },
    { time: 761.5, kind: 'shimmer', dur: 7, gain: 0.018 },
    { time: 772, kind: 'sine', freq: freq('D2'), dur: 8, gain: 0.035 },
    { time: 776, kind: 'bell', freq: freq('D4'), dur: 5, gain: 0.02 },
  ];
  events.push(...sfx);

  events.sort((a, b) => a.time - b.time);
  return events;
}

type ActiveNode = { source: AudioScheduledSourceNode; gain: GainNode };

export class Score {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: AudioNode | null = null;
  private analyser: AnalyserNode | null = null;
  private events: ScoreEvent[] = buildEvents();
  private nextIndex = 0;
  private active: ActiveNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private volume = 0.8;
  private lastTime = -1;
  private started = false;

  get isStarted(): boolean {
    return this.started;
  }

  async start(filmTime: number): Promise<void> {
    if (!this.ctx) this.createContext();
    if (!this.ctx) return;
    this.started = true;
    this.sync(filmTime, true);
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        // Browser policy: the next user gesture will try again.
      }
    }
  }

  async resume(): Promise<void> {
    if (!this.ctx) return;
    try {
      await this.ctx.resume();
    } catch {
      // Ignore a blocked context.
    }
  }

  suspend(): void {
    if (!this.ctx) return;
    this.stopActive();
    void this.ctx.suspend();
  }

  /** Re-align the scheduler after a seek, without starting playback. */
  seek(filmTime: number): void {
    if (!this.ctx || !this.started) return;
    this.resetTo(filmTime);
    this.lastTime = filmTime;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume();
  }

  setVolume(value: number): void {
    this.volume = clamp(value, 0, 1);
    this.applyVolume();
  }

  /** Call every animation frame with the film's exact time. */
  sync(filmTime: number, playing: boolean): void {
    if (!this.ctx || !this.started) return;
    if (!playing) return;

    if (filmTime < this.lastTime - 1.2 || filmTime > this.lastTime + 2.2) {
      this.resetTo(filmTime);
    }
    this.lastTime = filmTime;

    const horizon = filmTime + 0.65;
    while (this.nextIndex < this.events.length) {
      const event = this.events[this.nextIndex]!;
      if (event.time > horizon) break;
      if (event.time >= filmTime - 0.12) {
        const when = this.ctx.currentTime + Math.max(0, event.time - filmTime);
        this.schedule(event, when);
      }
      this.nextIndex++;
    }
  }

  getLevel(): number {
    if (!this.analyser) return 0;
    const buffer = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (const value of buffer) {
      const x = (value - 128) / 128;
      sum += x * x;
    }
    return Math.sqrt(sum / buffer.length);
  }

  private createContext(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.4;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    master.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(ctx.destination);
    this.master = master;
    this.analyser = analyser;

    const dry = ctx.createGain();
    dry.gain.value = 0.82;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(ctx);
    dry.connect(master);
    wet.connect(master);
    convolver.connect(wet);
    this.dry = dry;
    this.wet = convolver;

    this.noiseBuffer = this.makeNoise(ctx);
  }

  private applyVolume(): void {
    if (!this.master || !this.ctx) return;
    const target = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  private resetTo(filmTime: number): void {
    this.stopActive();
    this.nextIndex = 0;
    while (this.nextIndex < this.events.length && this.events[this.nextIndex]!.time < filmTime - 0.12) {
      this.nextIndex++;
    }
  }

  private stopActive(): void {
    for (const node of this.active) {
      try {
        node.source.stop();
      } catch {
        // Already stopped.
      }
      try {
        node.gain.disconnect();
      } catch {
        // Already disconnected.
      }
    }
    this.active = [];
  }

  private schedule(event: ScoreEvent, when: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.dry);
    if (this.wet) bus.connect(this.wet);

    let panner: StereoPannerNode | null = null;
    if (typeof ctx.createStereoPanner === 'function' && event.pan) {
      panner = ctx.createStereoPanner();
      panner.pan.value = clamp(event.pan, -1, 1);
      panner.connect(bus);
    }
    const destination: AudioNode = panner ?? bus;

    const gain = ctx.createGain();
    gain.connect(destination);
    const attack = event.kind === 'pad' || event.kind === 'bass' ? 0.6 : 0.008;
    const release = event.kind === 'pad' || event.kind === 'bass' || event.kind === 'flatline' ? 2.4 : 0.18;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(event.gain, when + attack);
    gain.gain.setValueAtTime(event.gain, Math.max(when + attack + 0.01, when + event.dur - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + event.dur);

    if (event.kind === 'noise') {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, when);
      filter.Q.value = 0.4;
      source.connect(filter).connect(gain);
      source.start(when);
      source.stop(when + event.dur + 0.1);
      this.active.push({ source, gain: bus });
      return;
    }

    if (event.kind === 'heart') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(62, when);
      osc.frequency.exponentialRampToValueAtTime(38, when + 0.38);
      osc.connect(gain);
      osc.start(when);
      osc.stop(when + event.dur);

      const thump = ctx.createBufferSource();
      thump.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120;
      const thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(0.0001, when);
      thumpGain.gain.linearRampToValueAtTime(event.gain * 0.5, when + 0.01);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
      thump.connect(filter).connect(thumpGain).connect(gain);
      thump.start(when);
      thump.stop(when + 0.4);
      this.active.push({ source: osc, gain: bus });
      this.active.push({ source: thump, gain: bus });
      return;
    }

    if (event.kind === 'pad') {
      const root = event.freq ?? 110;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, when);
      filter.frequency.linearRampToValueAtTime(900, when + 4);
      filter.Q.value = 0.8;
      filter.connect(gain);
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = root;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(when);
        osc.stop(when + event.dur + 0.1);
        this.active.push({ source: osc, gain: bus });
      }
      return;
    }

    if (event.kind === 'pizz') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = event.freq ?? 220;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = (event.freq ?? 220) * 2.2;
      filter.Q.value = 2.4;
      osc.connect(filter).connect(gain);
      osc.start(when);
      osc.stop(when + event.dur);
      this.active.push({ source: osc, gain: bus });
      return;
    }

    if (event.kind === 'snap') {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      source.connect(filter).connect(gain);
      source.start(when);
      source.stop(when + event.dur);
      this.active.push({ source, gain: bus });

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, when);
      osc.frequency.exponentialRampToValueAtTime(420, when + 0.25);
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.4;
      osc.connect(oscGain).connect(gain);
      osc.start(when);
      osc.stop(when + event.dur);
      this.active.push({ source: osc, gain: bus });
      return;
    }

    if (event.kind === 'gulp') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, when);
      osc.frequency.exponentialRampToValueAtTime(42, when + 0.45);
      osc.connect(gain);
      osc.start(when);
      osc.stop(when + event.dur);
      this.active.push({ source: osc, gain: bus });

      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, when);
      filter.frequency.exponentialRampToValueAtTime(120, when + 0.4);
      source.connect(filter).connect(gain);
      source.start(when);
      source.stop(when + event.dur);
      this.active.push({ source, gain: bus });
      return;
    }

    if (event.kind === 'flatline' || event.kind === 'shimmer' || event.kind === 'sine' || event.kind === 'bell') {
      const base = event.freq ?? 440;
      const partials = event.kind === 'bell' ? [1, 2.01, 2.76] : event.kind === 'shimmer' ? [1, 1.5] : [1];
      const type: OscillatorType = event.kind === 'bell' ? 'sine' : 'sine';
      for (let i = 0; i < partials.length; i++) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = base * partials[i]!;
        const partialGain = ctx.createGain();
        partialGain.gain.value = i === 0 ? 1 : 0.18;
        osc.connect(partialGain).connect(gain);
        osc.start(when);
        osc.stop(when + event.dur + 0.1);
        this.active.push({ source: osc, gain: bus });
      }
      return;
    }

    // bass and any fallback
    const osc = ctx.createOscillator();
    osc.type = event.kind === 'bass' ? 'sine' : 'triangle';
    osc.frequency.value = event.freq ?? 55;
    osc.connect(gain);
    osc.start(when);
    osc.stop(when + event.dur + 0.1);
    this.active.push({ source: osc, gain: bus });
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x1234567;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = ((seed >>> 16) / 32768 - 1) * 0.5;
    }
    return buffer;
  }

  private makeImpulse(ctx: AudioContext): AudioBuffer {
    const seconds = 3.2;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let seed = 0xabcdef + channel * 17;
      for (let i = 0; i < length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const noise = (seed >>> 16) / 32768 - 1;
        const decay = Math.pow(1 - i / length, 2.6);
        data[i] = noise * decay * 0.55;
      }
    }
    return buffer;
  }

  // Keep the easing helpers referenced: the score uses the same heart curve
  // as the picture, so a later mix pass can automate against it.
  static heartCurve(time: number): number {
    return smoothstep(695, 735, time);
  }
}
