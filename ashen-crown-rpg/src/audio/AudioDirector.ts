interface TrackConfig {
  root: number;
  scale: number[];
  chords: number[][];
  tempo: number;
  wave: OscillatorType;
  padWave: OscillatorType;
  brightness: number;
  drone: number;
}

const TRACKS: Record<string, TrackConfig> = {
  menu: {
    root: 110,
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [
      [0, 3, 7],
      [5, 8, 12],
      [3, 7, 10],
      [0, 5, 8]
    ],
    tempo: 2400,
    wave: 'sine',
    padWave: 'triangle',
    brightness: 0.18,
    drone: 55
  },
  bastion: {
    root: 92.5,
    scale: [0, 1, 3, 5, 6, 8, 10],
    chords: [
      [0, 3, 6],
      [1, 5, 8],
      [0, 3, 7],
      [-2, 3, 6]
    ],
    tempo: 2800,
    wave: 'triangle',
    padWave: 'sine',
    brightness: 0.14,
    drone: 46
  },
  village: {
    root: 130.8,
    scale: [0, 2, 3, 5, 7, 9, 10],
    chords: [
      [0, 3, 7],
      [5, 8, 12],
      [7, 10, 14],
      [0, 5, 9]
    ],
    tempo: 2100,
    wave: 'sine',
    padWave: 'triangle',
    brightness: 0.22,
    drone: 65
  },
  chapel: {
    root: 146.8,
    scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [
      [0, 4, 7],
      [2, 5, 9],
      [5, 9, 12],
      [0, 4, 9]
    ],
    tempo: 2600,
    wave: 'sine',
    padWave: 'sine',
    brightness: 0.16,
    drone: 73
  },
  forest: {
    root: 116.5,
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [
      [0, 3, 7],
      [2, 5, 10],
      [5, 7, 12],
      [0, 7, 10]
    ],
    tempo: 2300,
    wave: 'sine',
    padWave: 'triangle',
    brightness: 0.2,
    drone: 58
  },
  ruins: {
    root: 98,
    scale: [0, 1, 3, 6, 7, 8, 11],
    chords: [
      [0, 3, 7],
      [1, 6, 10],
      [0, 3, 8],
      [-1, 3, 6]
    ],
    tempo: 2700,
    wave: 'triangle',
    padWave: 'sine',
    brightness: 0.12,
    drone: 49
  },
  temple: {
    root: 87.3,
    scale: [0, 1, 4, 5, 7, 8, 11],
    chords: [
      [0, 4, 7],
      [-1, 4, 8],
      [0, 5, 7],
      [3, 8, 12]
    ],
    tempo: 3000,
    wave: 'sine',
    padWave: 'sine',
    brightness: 0.1,
    drone: 43
  },
  citadel: {
    root: 77.8,
    scale: [0, 1, 3, 4, 6, 8, 10],
    chords: [
      [0, 3, 6],
      [0, 4, 7],
      [-1, 3, 8],
      [2, 6, 9]
    ],
    tempo: 2500,
    wave: 'sawtooth',
    padWave: 'triangle',
    brightness: 0.12,
    drone: 39
  },
  combat: {
    root: 98,
    scale: [0, 2, 3, 5, 7, 8, 11],
    chords: [
      [0, 3, 7],
      [3, 7, 10],
      [5, 8, 12],
      [0, 5, 10]
    ],
    tempo: 1150,
    wave: 'triangle',
    padWave: 'sawtooth',
    brightness: 0.22,
    drone: 49
  },
  boss: {
    root: 73.4,
    scale: [0, 1, 3, 5, 6, 8, 11],
    chords: [
      [0, 3, 6],
      [1, 6, 8],
      [0, 3, 7],
      [-1, 5, 8]
    ],
    tempo: 980,
    wave: 'sawtooth',
    padWave: 'sawtooth',
    brightness: 0.18,
    drone: 36
  },
  finalboss: {
    root: 65.4,
    scale: [0, 1, 2, 5, 6, 8, 11],
    chords: [
      [0, 2, 6],
      [1, 5, 8],
      [-1, 3, 7],
      [0, 4, 9]
    ],
    tempo: 900,
    wave: 'sawtooth',
    padWave: 'square',
    brightness: 0.16,
    drone: 33
  },
  ending: {
    root: 130.8,
    scale: [0, 2, 4, 7, 9, 12, 14],
    chords: [
      [0, 4, 7],
      [2, 7, 9],
      [4, 9, 12],
      [0, 7, 12]
    ],
    tempo: 2400,
    wave: 'sine',
    padWave: 'triangle',
    brightness: 0.2,
    drone: 65
  }
};

const semitone = (root: number, steps: number) => root * Math.pow(2, steps / 12);

class AudioDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private track = 'menu';
  private timer: number | null = null;
  private step = 0;
  private settings = { musicVolume: 0.55, sfxVolume: 0.7, muted: false };
  private started = false;
  private noiseBuffer: AudioBuffer | null = null;

  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.settings.musicVolume * 0.34;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.settings.sfxVolume * 0.6;
      this.sfxBus.connect(this.master);

      this.noiseBuffer = this.makeNoise();
      this.started = true;
      this.startMusicLoop();
      this.playTrack(this.track, true);
    } catch (error) {
      console.warn('[audio] unavailable', error);
    }
  }

  setSettings(partial: { musicVolume?: number; sfxVolume?: number; muted?: boolean }): void {
    this.settings = { ...this.settings, ...partial };
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, now, 0.08);
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.34, now, 0.12);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume * 0.6, now, 0.08);
  }

  playTrack(track: string, force = false): void {
    if (!track) return;
    if (!force && this.track === track) return;
    this.track = TRACKS[track] ? track : 'menu';
    this.step = 0;
    if (!this.ctx || !this.started) return;
    this.pulseDrone();
  }

  private startMusicLoop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    const tick = () => {
      if (!this.ctx || !this.musicBus) return;
      if (this.ctx.state !== 'running') return;
      const config = TRACKS[this.track] ?? TRACKS.menu;
      this.step += 1;
      const step = this.step;
      const chordIndex = Math.floor(step / 4) % config.chords.length;
      const chord = config.chords[chordIndex];
      const now = this.ctx.currentTime + 0.03;

      if (step % 4 === 0) {
        for (const note of chord) {
          this.tone(semitone(config.root, note) * 2, now, config.tempo / 1000 + 1.6, config.padWave, 0.055, this.musicBus, 0.9);
        }
      }
      if (step % 8 === 1) {
        this.tone(config.drone, now, config.tempo / 1000 + 3, 'sine', 0.07, this.musicBus, 0.8);
      }
      if (Math.random() < 0.55) {
        const degree = config.scale[Math.floor(Math.random() * config.scale.length)];
        const octave = Math.random() < 0.35 ? 4 : 2;
        const velocity = config.brightness * (0.45 + Math.random() * 0.45);
        this.tone(semitone(config.root, degree) * octave, now, 0.7 + Math.random() * 1.3, config.wave, velocity, this.musicBus, 0.5);
      }
      if (this.track.includes('boss') && step % 2 === 0) {
        this.tone(config.drone * 1.5, now, 0.22, 'square', 0.035, this.musicBus, 0.3);
      }
    };
    this.timer = window.setInterval(tick, 1050);
    tick();
  }

  private pulseDrone(): void {
    if (!this.ctx || !this.musicBus) return;
    const config = TRACKS[this.track] ?? TRACKS.menu;
    this.tone(config.drone, this.ctx.currentTime, 4, 'sine', 0.06, this.musicBus, 1.2);
  }

  private tone(
    frequency: number,
    when: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    destination: AudioNode,
    attack = 0.02
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(env);
    env.connect(destination);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  private makeNoise(): AudioBuffer | null {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.8, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private noise(when: number, duration: number, gain: number, filterHz: number): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(this.sfxBus);
    source.start(when);
    source.stop(when + duration);
  }

  playSfx(name: string): void {
    if (!this.ctx || !this.sfxBus) return;
    if (!this.started || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const bus = this.sfxBus;
    const beep = (freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) =>
      this.tone(freq, now, duration, type, gain, bus, 0.005);

    switch (name) {
      case 'click':
        beep(440, 0.05, 'triangle', 0.05);
        break;
      case 'hover':
        beep(660, 0.03, 'sine', 0.02);
        break;
      case 'travel':
        this.noise(now, 0.45, 0.12, 500);
        beep(130, 0.5, 'sine', 0.08);
        break;
      case 'loot':
        beep(523, 0.08, 'triangle', 0.1);
        beep(783, 0.12, 'triangle', 0.08);
        break;
      case 'coin':
        beep(880, 0.06, 'square', 0.04);
        beep(1320, 0.09, 'square', 0.03);
        break;
      case 'check-success':
        beep(523, 0.12, 'sine', 0.12);
        this.tone(659, now + 0.1, 0.2, 'sine', 0.1, bus);
        this.tone(784, now + 0.22, 0.3, 'sine', 0.08, bus);
        break;
      case 'check-fail':
        beep(180, 0.22, 'sawtooth', 0.07);
        this.tone(140, now + 0.14, 0.3, 'triangle', 0.05, bus);
        break;
      case 'combat-start':
        this.noise(now, 0.4, 0.18, 300);
        beep(82, 0.5, 'sawtooth', 0.1);
        break;
      case 'ability':
        this.noise(now, 0.22, 0.12, 1200);
        beep(300, 0.14, 'triangle', 0.06);
        break;
      case 'potion':
        beep(600, 0.08, 'sine', 0.07);
        this.tone(900, now + 0.06, 0.18, 'sine', 0.05, bus);
        break;
      case 'equip':
        beep(240, 0.05, 'square', 0.05);
        beep(360, 0.06, 'square', 0.04);
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((freq, index) =>
          this.tone(freq, now + index * 0.11, 0.5, 'triangle', 0.1, bus)
        );
        break;
      case 'defeat':
        [220, 185, 147, 110].forEach((freq, index) =>
          this.tone(freq, now + index * 0.2, 0.8, 'sine', 0.1, bus)
        );
        break;
      case 'rest':
        [392, 523, 659].forEach((freq, index) =>
          this.tone(freq, now + index * 0.18, 0.9, 'sine', 0.06, bus)
        );
        break;
      case 'trap':
        this.noise(now, 0.3, 0.2, 700);
        beep(90, 0.25, 'sawtooth', 0.1);
        break;
      case 'rune':
      case 'rune-open':
        [440, 554, 659, 880].forEach((freq, index) =>
          this.tone(freq, now + index * 0.08, 0.5, 'sine', 0.06, bus)
        );
        break;
      case 'rune-fail':
        beep(146, 0.3, 'sawtooth', 0.08);
        break;
      case 'dialogue-open':
        beep(330, 0.06, 'sine', 0.04);
        break;
      case 'dialogue-close':
        beep(260, 0.08, 'sine', 0.035);
        break;
      case 'ending':
        [261, 392, 523, 659, 784].forEach((freq, index) =>
          this.tone(freq, now + index * 0.25, 2.2, 'sine', 0.055, bus, 0.1)
        );
        break;
      default:
        beep(330, 0.08, 'sine', 0.04);
    }
  }
}

export const audio = new AudioDirector();

export const initAudio = (): void => {
  audio.init();
  if (typeof window !== 'undefined') {
    document.removeEventListener('pointerdown', initAudio);
    document.removeEventListener('keydown', initAudio);
    document.removeEventListener('touchstart', initAudio);
  }
};

export const installAudioListeners = (): (() => void) => {
  const sfx = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (typeof detail === 'string') audio.playSfx(detail);
  };
  const music = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (typeof detail === 'string') audio.playTrack(detail);
    else if (detail === null) audio.playTrack('menu');
  };
  window.addEventListener('ashen-sfx', sfx as EventListener);
  window.addEventListener('ashen-music', music as EventListener);
  document.addEventListener('pointerdown', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });
  document.addEventListener('touchstart', initAudio, { once: true, passive: true });
  return () => {
    window.removeEventListener('ashen-sfx', sfx as EventListener);
    window.removeEventListener('ashen-music', music as EventListener);
    document.removeEventListener('pointerdown', initAudio);
    document.removeEventListener('keydown', initAudio);
    document.removeEventListener('touchstart', initAudio);
  };
};
