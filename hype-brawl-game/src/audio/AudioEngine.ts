type MusicTrack = 'festival' | 'metro' | 'club';

interface TrackDefinition {
  bpm: number;
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  root: number;
  bass: Array<number | null>;
  lead: Array<number | null>;
  chord: number[];
  kickEvery: number;
  snareSteps: number[];
}

const TRACKS: Record<MusicTrack, TrackDefinition> = {
  festival: {
    bpm: 132,
    bassWave: 'sawtooth',
    leadWave: 'square',
    root: 41,
    bass: [0, null, 0, 12, 7, null, 5, 7],
    lead: [24, null, 19, null, 24, 27, null, 22, 24, null, 31, null, 27, 24, null, 19],
    chord: [0, 7, 12],
    kickEvery: 4,
    snareSteps: [4, 12],
  },
  metro: {
    bpm: 96,
    bassWave: 'triangle',
    leadWave: 'sine',
    root: 33,
    bass: [0, null, null, 3, null, null, 5, null],
    lead: [null, null, 24, null, null, 22, null, null, 19, null, null, 24, null, null, 27, null],
    chord: [0, 10, 15],
    kickEvery: 8,
    snareSteps: [8],
  },
  club: {
    bpm: 126,
    bassWave: 'sawtooth',
    leadWave: 'triangle',
    root: 38,
    bass: [0, 12, 0, 7, 0, 12, 10, 7],
    lead: [24, null, 27, null, 31, null, 27, null, 24, null, 34, null, 31, 27, null, 24],
    chord: [0, 12, 19],
    kickEvery: 4,
    snareSteps: [4, 12],
  },
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private currentTrack: TrackDefinition | null = null;
  private desiredTrack: MusicTrack | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private volumes = { master: 0.8, music: 0.55, sfx: 0.85 };

  get unlocked(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : this.volumes.master;
      this.musicGain.gain.value = this.volumes.music;
      this.sfxGain.gain.value = this.volumes.sfx;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.desiredTrack) this.scheduleMusic();
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    if (this.master) this.master.gain.value = this.muted ? 0 : master;
    if (this.musicGain) this.musicGain.gain.value = music;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volumes.master;
    if (muted && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  playMusic(track: MusicTrack): void {
    this.desiredTrack = track;
    if (!this.context) return;
    this.stopMusic();
    this.scheduleMusic();
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = null;
    if (this.musicGain && this.context) {
      this.musicGain.gain.cancelScheduledValues(this.context.currentTime);
      this.musicGain.gain.setTargetAtTime(this.volumes.music, this.context.currentTime, 0.1);
    }
  }

  private scheduleMusic(): void {
    if (!this.context || !this.desiredTrack) return;
    this.stopMusic();
    this.currentTrack = TRACKS[this.desiredTrack];
    this.step = 0;
    this.nextNoteTime = this.context.currentTime + 0.12;
    this.musicTimer = window.setInterval(() => this.musicTick(), 50);
    this.musicTick();
  }

  private musicTick(): void {
    const context = this.context;
    const track = this.currentTrack;
    if (!context || !track || !this.musicGain) return;
    const stepDuration = 60 / track.bpm / 4;
    while (this.nextNoteTime < context.currentTime + 0.22) {
      this.scheduleStep(track, this.step, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.step = (this.step + 1) % 32;
    }
  }

  private scheduleStep(track: TrackDefinition, step: number, time: number, stepDuration: number): void {
    if (this.musicGain === null || this.context === null) return;
    const dest = this.musicGain;
    if (step % track.kickEvery === 0) this.kick(time, dest, step % 8 === 0 ? 0.9 : 0.6);
    if (track.snareSteps.includes(step % 16)) this.noiseHit(time, dest, 0.2, 0.18, 1400);
    if (step % 2 === 0) this.noiseHit(time, dest, 0.05, 0.04, 7000);
    const bassNote = track.bass[step % 8];
    if (bassNote !== null) {
      this.tone(time, dest, midi(track.root + bassNote), stepDuration * 1.7, track.bassWave, 0.09, 420);
    }
    if (step % 8 === 0) {
      for (const chordNote of track.chord) {
        this.tone(time, dest, midi(track.root + 24 + chordNote), stepDuration * 5.5, 'triangle', 0.025, 1800);
      }
    }
    const leadNote = track.lead[step % 16];
    if (leadNote !== null) {
      this.tone(time, dest, midi(track.root + leadNote), stepDuration * 1.4, track.leadWave, 0.055, 3600);
    }
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.context) return null;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.5, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private tone(
    time: number,
    destination: AudioNode,
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    filterFrequency: number,
  ): void {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private kick(time: number, destination: AudioNode, volume: number): void {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  private noiseHit(
    time: number,
    destination: AudioNode,
    volume: number,
    duration: number,
    filterFrequency: number,
  ): void {
    if (!this.context || !this.noiseBuffer) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFrequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(time, Math.random() * 0.2, duration + 0.02);
  }

  private sfxDestination(): GainNode | null {
    return this.sfxGain;
  }

  private sfxNoise(volume: number, duration: number, frequency: number, type: BiquadFilterType = 'highpass'): void {
    const destination = this.sfxDestination();
    if (!this.context || !destination || !this.noiseBuffer) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(now, Math.random() * 0.1, duration);
  }

  private sfxTone(frequency: number, endFrequency: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
    const destination = this.sfxDestination();
    if (!this.context || !destination) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playHit(power: number, shielded: boolean, effect: string): void {
    if (!this.context) return;
    const strength = Math.min(1, 0.25 + power / 100);
    if (shielded) {
      this.sfxTone(880, 420, 0.12, 0.18, 'triangle');
      this.sfxNoise(0.1, 0.12, 3000);
      return;
    }
    this.sfxNoise(0.3 * strength, 0.14, effect === 'sound' ? 900 : 1200);
    const frequencies: Record<string, [number, number]> = {
      sound: [220, 70],
      flash: [1400, 500],
      fire: [180, 50],
      speed: [900, 200],
      pan: [420, 100],
      explosion: [120, 35],
    };
    const [start, end] = frequencies[effect] ?? [320, 80];
    this.sfxTone(start, end, 0.18, 0.22 * strength, effect === 'flash' ? 'square' : 'sawtooth');
  }

  playKO(): void {
    if (!this.context) return;
    this.sfxNoise(0.5, 0.55, 200, 'lowpass');
    this.sfxTone(180, 28, 0.7, 0.45, 'sawtooth');
    this.sfxTone(90, 24, 0.9, 0.3, 'sine');
  }

  playJump(double: boolean): void {
    this.sfxTone(double ? 520 : 340, double ? 900 : 620, 0.11, 0.1, 'square');
  }

  playLand(): void {
    this.sfxNoise(0.08, 0.08, 300, 'lowpass');
  }

  playShieldBreak(): void {
    this.sfxNoise(0.35, 0.4, 1200);
    this.sfxTone(300, 60, 0.5, 0.25, 'square');
  }

  playCharge(): void {
    this.sfxTone(180, 260, 0.16, 0.08, 'sawtooth');
  }

  playHype(): void {
    if (!this.context) return;
    const notes = [0, 7, 12, 19, 24];
    for (let i = 0; i < notes.length; i++) {
      window.setTimeout(() => this.sfxTone(440 * 2 ** (notes[i] / 12), 880 * 2 ** (notes[i] / 12), 0.18, 0.14, 'square'), i * 55);
    }
  }

  playItemSpawn(): void {
    this.sfxTone(660, 1320, 0.1, 0.07, 'triangle');
  }

  playItemPickup(): void {
    if (!this.context) return;
    const base = this.context.currentTime;
    [0, 4, 7, 12].forEach((note, index) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midi(72 + note);
      gain.gain.setValueAtTime(0.0001, base + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.12, base + index * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, base + index * 0.06 + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxDestination()!);
      osc.start(base + index * 0.06);
      osc.stop(base + index * 0.06 + 0.18);
    });
  }

  playUI(kind: 'click' | 'back' | 'hover' = 'click'): void {
    if (kind === 'hover') this.sfxTone(880, 980, 0.04, 0.03, 'sine');
    else if (kind === 'back') this.sfxTone(440, 300, 0.09, 0.08, 'triangle');
    else this.sfxTone(620, 920, 0.08, 0.1, 'square');
  }

  playVictory(): void {
    if (!this.context) return;
    const notes = [0, 4, 7, 12, 19, 24];
    notes.forEach((note, index) => {
      window.setTimeout(() => {
        this.sfxTone(midi(64 + note), midi(64 + note + 12), 0.35, 0.14, 'square');
      }, index * 100);
    });
  }

  announce(text: string): void {
    if (typeof speechSynthesis === 'undefined' || this.muted) return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.86;
      utterance.pitch = 0.55;
      utterance.volume = Math.min(1, this.volumes.master * 0.9);
      const voices = speechSynthesis.getVoices();
      const chosen = voices.find((voice) => /male|david|alex|daniel|fred/i.test(voice.name)) ?? voices[0];
      if (chosen) utterance.voice = chosen;
      speechSynthesis.speak(utterance);
    } catch {
      this.sfxTone(240, 180, 0.3, 0.1, 'square');
    }
  }
}

function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}
