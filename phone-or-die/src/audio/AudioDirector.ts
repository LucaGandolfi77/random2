import type { GameSettings } from '@/core/types';

const DRONE_FREQUENCIES = [55, 58.27, 73.42, 82.41];
const STAGE_FREQUENCIES = [110, 116.54, 98, 87.31, 65.41];

class AudioDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private droneNodes: OscillatorNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private ambientTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private stage = 0;
  private started = false;
  private scene: 'menu' | 'game' | 'ending' = 'menu';
  private settings: GameSettings = {
    musicVolume: 0.58,
    sfxVolume: 0.8,
    muted: false,
    textSize: 1,
    brightness: 1,
    reducedMotion: false,
    highContrast: false,
    showTimers: true
  };

  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = this.settings.musicVolume * 0.36;
      this.music.connect(this.master);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = this.settings.sfxVolume * 0.65;
      this.sfx.connect(this.master);
      this.noiseBuffer = this.makeNoise();
      this.started = true;
      this.startAmbient();
    } catch (error) {
      console.warn('[audio] unavailable', error);
    }
  }

  setSettings(settings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (!this.ctx || !this.master || !this.music || !this.sfx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, now, 0.08);
    this.music.gain.setTargetAtTime(this.settings.musicVolume * 0.36, now, 0.2);
    this.sfx.gain.setTargetAtTime(this.settings.sfxVolume * 0.65, now, 0.08);
  }

  setScene(scene: 'menu' | 'game' | 'ending'): void {
    if (this.scene === scene) return;
    this.scene = scene;
    this.restartAmbient();
  }

  setThreat(stage: number): void {
    if (this.stage === stage) return;
    this.stage = stage;
    this.restartAmbient();
  }

  private restartAmbient(): void {
    if (!this.started) return;
    this.stopAmbient();
    this.startAmbient();
  }

  private startAmbient(): void {
    if (!this.ctx || !this.music || !this.started) return;
    if (this.ambientTimer !== null) window.clearInterval(this.ambientTimer);
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    const now = this.ctx.currentTime;
    const base = this.scene === 'ending' ? 130.8 : this.scene === 'menu' ? 55 : 55 - this.stage * 1.8;
    const droneCount = this.scene === 'ending' ? 2 : 3;
    for (let index = 0; index < droneCount; index++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.value = base * (index === 0 ? 1 : index === 1 ? 1.5 : 2.01);
      gain.gain.value = this.scene === 'ending' ? 0.028 : 0.02 + this.stage * 0.004;
      osc.connect(gain);
      gain.connect(this.music);
      osc.start(now);
      this.droneNodes.push(osc);
    }
    this.ambientTimer = window.setInterval(() => {
      if (!this.ctx || !this.music) return;
      const note = STAGE_FREQUENCIES[Math.min(4, this.stage)] * (Math.random() > 0.5 ? 1 : 1.5);
      this.tone(note, this.ctx.currentTime, 2.2 + Math.random() * 2, this.scene === 'ending' ? 'sine' : 'triangle', 0.03, this.music, 0.8);
      if (this.scene === 'game' && this.stage >= 2 && Math.random() < 0.55) {
        this.noise(this.ctx.currentTime, 0.6, 0.01 + this.stage * 0.003, 900 + Math.random() * 1400);
      }
    }, this.scene === 'ending' ? 2600 : 2200);
    if (this.scene === 'game' && this.stage >= 1) {
      this.heartbeatTimer = window.setInterval(() => {
        if (!this.ctx || !this.music) return;
        const strength = 0.03 + this.stage * 0.014;
        const t = this.ctx.currentTime;
        this.tone(48, t, 0.15, 'sine', strength, this.music, 0.01);
        this.tone(44, t + 0.19, 0.12, 'sine', strength * 0.7, this.music, 0.01);
      }, Math.max(560, 1180 - this.stage * 140));
    }
  }

  private stopAmbient(): void {
    if (this.ambientTimer !== null) window.clearInterval(this.ambientTimer);
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.ambientTimer = null;
    this.heartbeatTimer = null;
    for (const node of this.droneNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Already stopped.
      }
    }
    this.droneNodes = [];
  }

  playSfx(name: string): void {
    if (!this.ctx || !this.sfx || !this.started || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const tone = (freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.12, delay = 0) =>
      this.tone(freq, now + delay, duration, type, gain, this.sfx!, 0.006);
    switch (name) {
      case 'click':
        tone(420, 0.04, 'triangle', 0.035);
        break;
      case 'phone-open':
        tone(540, 0.06, 'sine', 0.04);
        tone(680, 0.08, 'sine', 0.03, 0.05);
        break;
      case 'phone-close':
        tone(380, 0.06, 'sine', 0.035);
        break;
      case 'ring':
      case 'final-call':
        tone(440, 0.22, 'sine', 0.09, 0);
        tone(480, 0.22, 'sine', 0.08, 0.28);
        tone(440, 0.22, 'sine', 0.09, 0.56);
        break;
      case 'call-connect':
        tone(620, 0.08, 'sine', 0.06);
        tone(760, 0.12, 'sine', 0.05, 0.08);
        break;
      case 'call-miss':
      case 'hangup':
        tone(220, 0.18, 'triangle', 0.06);
        break;
      case 'call-end':
        tone(340, 0.12, 'sine', 0.05);
        tone(260, 0.18, 'sine', 0.04, 0.1);
        break;
      case 'message':
      case 'message-read':
        tone(880, 0.08, 'square', 0.025);
        break;
      case 'clue':
        tone(520, 0.12, 'sine', 0.05);
        tone(780, 0.2, 'sine', 0.04, 0.1);
        break;
      case 'danger':
        this.noise(now, 0.4, 0.1, 380);
        tone(72, 0.6, 'sawtooth', 0.05);
        break;
      case 'whisper':
        this.noise(now, 0.9, 0.035, 1150);
        this.tone(118, now + 0.08, 0.8, 'sine', 0.028, this.sfx!, 0.2);
        break;
      case 'chapter':
        tone(146.8, 1.2, 'sine', 0.035);
        tone(220, 1.4, 'sine', 0.025, 0.12);
        break;
      case 'capture':
        this.noise(now, 1.8, 0.18, 180);
        tone(55, 2.5, 'sawtooth', 0.09);
        tone(36.7, 2.8, 'sine', 0.08, 0.4);
        break;
      case 'ending':
        [261.6, 329.6, 392, 523.3].forEach((freq, index) => tone(freq, 2.6, 'sine', 0.05, index * 0.25));
        break;
      case 'interact':
      case 'barricade':
        this.noise(now, 0.16, 0.04, 500);
        break;
      case 'flashlight':
        tone(720, 0.05, 'square', 0.03);
        break;
      case 'battery-empty':
        tone(120, 0.3, 'sawtooth', 0.05);
        break;
      case 'event':
        tone(196, 0.6, 'triangle', 0.05);
        tone(146.8, 0.8, 'sine', 0.04, 0.2);
        break;
      case 'event-resolve':
        tone(392, 0.2, 'sine', 0.04);
        break;
      case 'start':
        tone(220, 0.8, 'sine', 0.05);
        break;
      case 'music-start':
        tone(110, 2, 'sine', 0.03);
        break;
      case 'load':
      case 'save':
        tone(450, 0.1, 'sine', 0.03);
        break;
      case 'menu':
        tone(440, 0.2, 'sine', 0.035);
        break;
      default:
        tone(360, 0.05, 'sine', 0.03);
    }
  }

  private makeNoise(): AudioBuffer | null {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  private toggleTone(freq: number, duration: number, type: OscillatorType, gain: number): void {
    if (!this.ctx || !this.sfx) return;
    this.tone(freq, this.ctx.currentTime, duration, type, gain, this.sfx, 0.02);
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
    osc.stop(when + duration + 0.08);
  }

  private noise(when: number, duration: number, gain: number, filterFrequency: number): void {
    if (!this.ctx || !this.sfx || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(this.sfx);
    source.start(when);
    source.stop(when + duration);
  }
}

export const audio = new AudioDirector();

export const initAudio = (): void => {
  audio.init();
  document.removeEventListener('pointerdown', initAudio);
  document.removeEventListener('keydown', initAudio);
  document.removeEventListener('touchstart', initAudio);
};

export const installAudioListeners = (): (() => void) => {
  const sfx = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (typeof detail === 'string') audio.playSfx(detail);
  };
  window.addEventListener('pod-sfx', sfx as EventListener);
  document.addEventListener('pointerdown', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });
  document.addEventListener('touchstart', initAudio, { once: true, passive: true });
  return () => {
    window.removeEventListener('pod-sfx', sfx as EventListener);
    document.removeEventListener('pointerdown', initAudio);
    document.removeEventListener('keydown', initAudio);
    document.removeEventListener('touchstart', initAudio);
  };
};
