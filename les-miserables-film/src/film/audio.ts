import { CHAPTERS } from './timeline';
import { clamp } from './util';

// Original score. The four-note motif is deliberately simple; each act
// changes its mode, register and instrumentation, never quoting the musical.
const CHORDS: number[][] = [
  [0, 7, 12, 15], // prologue, D minor
  [0, 7, 12, 15], // digne
  [-2, 5, 10, 14], // fantine, Bb
  [0, 7, 12, 15], // montreuil
  [5, 12, 17, 21], // cosette, F
  [0, 7, 12, 15], // paris
  [5, 12, 17, 21], // jardin, F
  [0, 6, 12, 15], // barricade, D minor with a shadow
  [0, 7, 12, 15], // egout
  [5, 12, 17, 21], // etoile, F
  [-2, 5, 10, 14], // pardon, Bb
  [2, 9, 14, 18], // epilogue, D major, Picardy third
];

const MOTIF_SHAPES: number[][] = [
  [0, 3, 2, 7, 5],
  [0, 3, 7, 5, 2],
  [0, 2, 3, 5, 2],
  [0, 3, 2, 7, 0],
  [5, 7, 3, 2, 0],
  [0, 7, 5, 3, 2],
  [5, 8, 7, 12, 10],
  [0, 2, 1, 5, 3],
  [0, 1, 5, 3, 0],
  [5, 8, 7, 12, 15],
  [0, 3, 2, 7, 10],
  [2, 5, 9, 7, 14],
];

const NOTE_D4 = 293.66;

function noteFrequency(semitone: number): number {
  return NOTE_D4 * Math.pow(2, semitone / 12);
}

function midiHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makeImpulse(ctx: AudioContext, seconds = 3.2, decay = 2.4): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.92 + white * 0.08;
      data[i] = last * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.65 + white * 0.35;
    data[i] = last * 0.5;
  }
  return buffer;
}

export class FilmScore {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padVoices: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private bass: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private timer: number | null = null;
  private nextPluck = 0;
  private nextChord = 0;
  private step = 0;
  private chapter = 0;
  private muted = false;
  private volume = 0.62;
  private started = false;

  get enabled(): boolean {
    return this.ctx !== null && this.started;
  }

  async start(): Promise<void> {
    if (!this.ctx) this.build();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    if (!this.started) {
      this.started = true;
      if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, ctx.currentTime, 0.4);
      this.nextChord = ctx.currentTime + 0.15;
      this.nextPluck = ctx.currentTime + 1.4;
      this.applyChapter(this.chapter, true);
      this.chime();
      this.timer = window.setInterval(() => this.tick(), 180);
    }
    if (this.muted && this.master) this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  }

  pause(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    void this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.12);
  }

  setVolume(volume: number): void {
    this.volume = clamp(volume, 0, 1) * 0.9;
    if (!this.ctx || !this.master || this.muted) return;
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.12);
  }

  setChapter(index: number, seek = false): void {
    if (index === this.chapter && !seek) return;
    this.chapter = index;
    this.applyChapter(index, seek);
    if (this.started && !seek) this.chime();
  }

  private build(): void {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.02;
    comp.release.value = 0.5;
    master.connect(comp);
    comp.connect(ctx.destination);
    this.master = master;

    const dry = ctx.createGain();
    dry.gain.value = 0.85;
    dry.connect(master);
    this.dry = dry;

    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.38;
    convolver.connect(wet);
    wet.connect(master);
    this.wet = wet;
    this.convolver = convolver;

    // Pad: four soft voices, slowly changing chord.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 680;
    padFilter.Q.value = 0.3;
    padFilter.connect(dry);
    padFilter.connect(convolver);
    this.padFilter = padFilter;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.detune.value = (i - 1.5) * 4;
      osc.frequency.value = noteFrequency(CHORDS[0][i]) / 2;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.035 : 0.017;
      osc.connect(gain);
      gain.connect(padFilter);
      osc.start();
      this.padVoices.push({ osc, gain });
    }

    // Bass
    const bass = ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = noteFrequency(CHORDS[0][0]) / 2;
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.055;
    bass.connect(bassGain);
    bassGain.connect(dry);
    bass.start();
    this.bass = bass;
    this.bassGain = bassGain;

    // Noise bed (wind, rain, dripping tunnels).
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(ctx);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 0.45;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.012;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dry);
    noise.start();
    this.noiseSource = noise;
    this.noiseFilter = noiseFilter;
    this.noiseGain = noiseGain;

    this.applyChapter(0, true);
  }

  private applyChapter(index: number, seek: boolean): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chord = CHORDS[clamp(index, 0, CHORDS.length - 1)] ?? CHORDS[0];
    const glide = seek ? 0.4 : 2.2;
    this.padVoices.forEach((voice, i) => {
      const semitone = chord[i] ?? chord[chord.length - 1];
      const target = noteFrequency(semitone) / (i === 0 ? 2 : 2);
      voice.osc.frequency.cancelScheduledValues(now);
      voice.osc.frequency.setTargetAtTime(target, now, glide);
      voice.gain.gain.setTargetAtTime(i === 0 ? 0.035 : 0.016, now, 0.6);
    });
    if (this.bass) {
      const root = noteFrequency(chord[0]) / 4;
      this.bass.frequency.cancelScheduledValues(now);
      this.bass.frequency.setTargetAtTime(root, now, glide);
    }
    if (this.padFilter) {
      const cutoff = index === 7 ? 1050 : index === 8 ? 380 : index === 9 ? 820 : index === 11 ? 1500 : 720;
      this.padFilter.frequency.cancelScheduledValues(now);
      this.padFilter.frequency.setTargetAtTime(cutoff, now, 1.1);
    }
    if (this.noiseFilter && this.noiseGain) {
      const rainActs = [2, 5, 7, 8];
      const isRain = rainActs.includes(index);
      const isSewer = index === 8;
      this.noiseFilter.frequency.setTargetAtTime(isSewer ? 260 : isRain ? 1900 : 900, now, 1.5);
      this.noiseFilter.Q.setTargetAtTime(isSewer ? 0.9 : 0.45, now, 1.5);
      this.noiseGain.gain.setTargetAtTime(isRain ? 0.034 : isSewer ? 0.022 : 0.008, now, 2.2);
    }
  }

  private chime(): void {
    if (!this.ctx || !this.dry || !this.convolver) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const freq = 196 + (this.chapter % 3) * 24.5;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const gain = ctx.createGain();
    carrier.type = 'sine';
    mod.type = 'sine';
    carrier.frequency.value = freq;
    mod.frequency.value = freq * 2.01;
    modGain.gain.value = freq * 1.4;
    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
    carrier.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.convolver);
    carrier.start(now);
    mod.start(now);
    carrier.stop(now + 4.4);
    mod.stop(now + 4.4);
  }

  private pluck(semitone: number, when: number, gainValue = 0.035, long = false): void {
    if (!this.ctx || !this.dry || !this.convolver) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.5;
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.value = noteFrequency(semitone);
    osc2.frequency.value = noteFrequency(semitone) * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    osc.connect(filter);
    osc2.connect(g2);
    g2.connect(filter);
    filter.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.convolver);
    const decay = long ? 3.6 : 1.9;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(gainValue, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + decay + 0.1);
    osc2.stop(when + decay + 0.1);
  }

  private tick(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    while (this.nextChord < now + 1.6) {
      const when = Math.max(now + 0.1, this.nextChord);
      const chord = CHORDS[this.chapter] ?? CHORDS[0];
      const root = chord[0];
      this.pluck(root - 12, when, 0.022, true);
      this.pluck(root + 7, when + 1.9, 0.012, true);
      this.nextChord += 8;
    }

    while (this.nextPluck < now + 1.8) {
      const shape = MOTIF_SHAPES[this.chapter] ?? MOTIF_SHAPES[0];
      const chord = CHORDS[this.chapter] ?? CHORDS[0];
      const semitone = shape[this.step % shape.length] + chord[0];
      const when = Math.max(now + 0.05, this.nextPluck);
      const quiet = this.chapter === 8 || this.chapter === 9;
      this.pluck(semitone, when, quiet ? 0.02 : 0.03);
      this.nextPluck += 2.4;
      this.step++;
    }
  }
}

export function initialChapterIndex(time: number): number {
  const index = CHAPTERS.findIndex((c) => time >= c.start && time < c.end);
  return index < 0 ? CHAPTERS.length - 1 : index;
}

export const score = new FilmScore();
