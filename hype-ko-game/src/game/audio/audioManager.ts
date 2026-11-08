type Motif =
  | 'festival'
  | 'metro'
  | 'club'
  | 'stadium'
  | 'tv'
  | 'mall'
  | 'rodeo'
  | 'racing'
  | 'menu'
  | 'online';

interface MotifPreset {
  bpm: number;
  root: number;
  scale: number[];
  lead: OscillatorType;
  bass: OscillatorType;
  kick: number[];
  snare: number[];
  hat: number[];
  swing: number;
}

const MOTIFS: Record<Motif, MotifPreset> = {
  festival: {
    bpm: 128,
    root: 50,
    scale: [0, 2, 3, 7, 10],
    lead: 'sawtooth',
    bass: 'square',
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1],
    swing: 0
  },
  metro: {
    bpm: 118,
    root: 45,
    scale: [0, 2, 3, 5, 7, 10],
    lead: 'triangle',
    bass: 'sine',
    kick: [1, 0, 0, 1, 0, 0, 1, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 0, 1, 1, 1, 0, 1, 1],
    swing: 0.08
  },
  club: {
    bpm: 126,
    root: 48,
    scale: [0, 3, 5, 7, 10],
    lead: 'sawtooth',
    bass: 'square',
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1],
    swing: 0
  },
  stadium: {
    bpm: 140,
    root: 52,
    scale: [0, 2, 4, 7, 9],
    lead: 'square',
    bass: 'triangle',
    kick: [1, 0, 1, 0, 1, 0, 1, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0],
    swing: 0
  },
  tv: {
    bpm: 120,
    root: 47,
    scale: [0, 2, 3, 7, 8],
    lead: 'triangle',
    bass: 'sine',
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 1, 0, 1, 1, 1, 0, 1],
    swing: 0.04
  },
  mall: {
    bpm: 108,
    root: 53,
    scale: [0, 2, 4, 7, 11],
    lead: 'sine',
    bass: 'triangle',
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0],
    swing: 0.12
  },
  rodeo: {
    bpm: 132,
    root: 50,
    scale: [0, 2, 3, 7, 9],
    lead: 'sawtooth',
    bass: 'square',
    kick: [1, 0, 0, 1, 1, 0, 0, 1],
    snare: [0, 0, 1, 0, 0, 1, 1, 0],
    hat: [1, 1, 1, 0, 1, 1, 1, 0],
    swing: 0.06
  },
  racing: {
    bpm: 150,
    root: 45,
    scale: [0, 3, 5, 7, 10],
    lead: 'square',
    bass: 'sawtooth',
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1],
    swing: 0
  },
  menu: {
    bpm: 100,
    root: 48,
    scale: [0, 3, 5, 7, 10],
    lead: 'triangle',
    bass: 'sine',
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0],
    swing: 0.1
  },
  online: {
    bpm: 116,
    root: 46,
    scale: [0, 2, 3, 5, 7, 10],
    lead: 'sawtooth',
    bass: 'square',
    kick: [1, 0, 0, 1, 0, 0, 1, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1],
    swing: 0
  }
};

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private motif: Motif = 'menu';
  private step = 0;
  private nextNoteTime = 0;
  private masterVolume = 0.8;
  private musicVolume = 0.55;
  private sfxVolume = 0.8;
  private announcerEnabled = true;
  private disposed = false;

  private ensure(): AudioContext | null {
    if (this.disposed) return null;
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.music.gain.value = this.musicVolume;
    this.sfx.gain.value = this.sfxVolume;
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    const length = Math.floor(this.ctx.sampleRate * 0.4);
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  setVolumes(volumes: { master?: number; music?: number; sfx?: number }): void {
    if (volumes.master !== undefined) this.masterVolume = volumes.master;
    if (volumes.music !== undefined) this.musicVolume = volumes.music;
    if (volumes.sfx !== undefined) this.sfxVolume = volumes.sfx;
    if (this.master) this.master.gain.value = this.masterVolume;
    if (this.music) this.music.gain.value = this.musicVolume;
    if (this.sfx) this.sfx.gain.value = this.sfxVolume;
  }

  setAnnouncerEnabled(enabled: boolean): void {
    this.announcerEnabled = enabled;
  }

  playMusic(motif: string): void {
    const preset = MOTIFS[(motif as Motif) in MOTIFS ? (motif as Motif) : 'menu'];
    this.motif = (motif as Motif) in MOTIFS ? (motif as Motif) : 'menu';
    const ctx = this.ensure();
    if (!ctx) return;
    this.stopMusic();
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.08;
    this.musicTimer = window.setInterval(() => this.scheduler(preset), 90);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduler(preset: MotifPreset): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const stepDuration = 60 / preset.bpm / 2;
    while (this.nextNoteTime < ctx.currentTime + 0.3) {
      this.scheduleStep(this.step, this.nextNoteTime, preset, stepDuration);
      this.nextNoteTime += stepDuration;
      this.step++;
    }
  }

  private scheduleStep(step: number, when: number, preset: MotifPreset, stepDuration: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const local = step % 8;
    const bar = Math.floor(step / 8);
    const swing = preset.swing * stepDuration;
    const swingOffset = local % 2 === 1 ? swing : 0;
    const time = when + swingOffset;

    if (preset.kick[local]) {
      this.tone(110, time, 0.16, 'sine', 0.5, this.music, 42);
      this.noise(time, 0.05, 0.2, 800, this.music);
    }
    if (preset.snare[local]) {
      this.noise(time, 0.11, 0.24, 1800, this.music);
      this.tone(190, time, 0.06, 'triangle', 0.12, this.music, 120);
    }
    if (preset.hat[local]) {
      this.noise(time, 0.025, 0.08, 7000, this.music);
    }

    const bassNote = preset.root + (bar % 4 === 0 ? 0 : bar % 4 === 1 ? 5 : bar % 4 === 2 ? 3 : 7);
    if (local === 0 || local === 3 || local === 6) {
      this.tone(midiToFreq(bassNote - 12), time, stepDuration * 1.6, preset.bass, 0.18, this.music);
    }

    if (local === 0 || local === 2 || local === 5 || local === 7) {
      const melodyIndex = (bar * 3 + local) % preset.scale.length;
      const octave = local === 7 ? 12 : 0;
      const note = preset.root + 12 + preset.scale[melodyIndex] + octave;
      this.tone(midiToFreq(note), time, stepDuration * 0.9, preset.lead, 0.08, this.music);
      if (local === 0) {
        this.tone(midiToFreq(note + 12), time, stepDuration * 0.5, 'sine', 0.035, this.music);
      }
    }
  }

  private tone(
    freq: number,
    when: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    destination: AudioNode,
    freqEnd?: number
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), when);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), when + duration);
    }
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(when);
    osc.stop(when + duration + 0.03);
  }

  private noise(when: number, duration: number, gainValue: number, filterFreq: number, destination: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, gainValue), when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  private immediate(): { ctx: AudioContext; sfx: GainNode } | null {
    const ctx = this.ensure();
    if (!ctx || !this.sfx) return null;
    if (ctx.state === 'suspended') void ctx.resume();
    return { ctx, sfx: this.sfx };
  }

  click(): void {
    const audio = this.immediate();
    if (!audio) return;
    this.tone(660, audio.ctx.currentTime, 0.06, 'sine', 0.08, audio.sfx, 880);
  }

  hit(heavy = false): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(heavy ? 90 : 130, t, heavy ? 0.2 : 0.12, 'sine', heavy ? 0.5 : 0.3, audio.sfx, heavy ? 40 : 70);
    this.noise(t, heavy ? 0.14 : 0.08, heavy ? 0.35 : 0.2, heavy ? 900 : 1600, audio.sfx);
  }

  block(): void {
    const audio = this.immediate();
    if (!audio) return;
    this.tone(240, audio.ctx.currentTime, 0.08, 'square', 0.12, audio.sfx, 180);
    this.noise(audio.ctx.currentTime, 0.05, 0.12, 3200, audio.sfx);
  }

  parry(): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(1320, t, 0.18, 'sine', 0.14, audio.sfx);
    this.tone(1760, t + 0.03, 0.22, 'sine', 0.1, audio.sfx);
  }

  whoosh(): void {
    const audio = this.immediate();
    if (!audio) return;
    this.noise(audio.ctx.currentTime, 0.16, 0.1, 2400, audio.sfx);
  }

  projectile(): void {
    const audio = this.immediate();
    if (!audio) return;
    this.tone(420, audio.ctx.currentTime, 0.12, 'triangle', 0.12, audio.sfx, 780);
  }

  explosion(): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(70, t, 0.35, 'sine', 0.4, audio.sfx, 30);
    this.noise(t, 0.3, 0.35, 700, audio.sfx);
  }

  super(): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(180, t, 0.55, 'sawtooth', 0.16, audio.sfx, 1400);
    this.noise(t, 0.5, 0.18, 3000, audio.sfx);
  }

  hype(): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(330, t, 0.3, 'square', 0.12, audio.sfx);
    this.tone(440, t + 0.05, 0.3, 'square', 0.1, audio.sfx);
    this.tone(660, t + 0.1, 0.4, 'square', 0.08, audio.sfx);
  }

  ko(): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(65, t, 0.7, 'sine', 0.5, audio.sfx, 28);
    this.noise(t, 0.5, 0.3, 500, audio.sfx);
  }

  tag(): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(520, t, 0.1, 'triangle', 0.1, audio.sfx);
    this.tone(780, t + 0.08, 0.14, 'triangle', 0.1, audio.sfx);
  }

  count(): void {
    const audio = this.immediate();
    if (!audio) return;
    this.tone(880, audio.ctx.currentTime, 0.1, 'sine', 0.12, audio.sfx);
  }

  bell(): void {
    const audio = this.immediate();
    if (!audio) return;
    const t = audio.ctx.currentTime;
    this.tone(1046, t, 0.4, 'sine', 0.14, audio.sfx);
    this.tone(1568, t, 0.3, 'sine', 0.08, audio.sfx);
  }

  announce(text: string): void {
    if (!this.announcerEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    utterance.volume = Math.min(1, this.masterVolume);
    synth.speak(utterance);
  }

  dispose(): void {
    this.disposed = true;
    this.stopMusic();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
