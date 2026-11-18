import type { GameState } from '../game/GameState';

type Vec3 = { x: number; y: number; z: number };

/** All sounds are synthesised at runtime: no binary assets, fully offline. */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private drone: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  private breathTimer = 0;
  private stepTimer = 0;

  constructor(private state: GameState) {}

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startDrone();
    } catch (e) {
      console.warn('[PHONE OR DIE] Web Audio unavailable', e);
    }
  }

  applyVolumes() {
    if (!this.ctx) return;
    const m = this.state.muted ? 0 : 1;
    this.master.gain.value = m;
    this.musicBus.gain.value = this.state.musicVolume * 0.5;
    this.sfxBus.gain.value = this.state.sfxVolume;
  }

  private startDrone() {
    if (!this.ctx) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.11;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    gain.connect(filter);
    filter.connect(this.musicBus);
    const osc = [55, 55.6, 82.4].map((f) => {
      const o = this.ctx!.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    this.drone = { osc, gain };
  }

  setTension(value: number) {
    if (!this.ctx || !this.drone) return;
    const t = Math.max(0, Math.min(1, value / 100));
    this.drone.gain.gain.setTargetAtTime(0.09 + t * 0.22, this.ctx.currentTime, 0.8);
    this.drone.osc[1].frequency.setTargetAtTime(55.6 + t * 2.4, this.ctx.currentTime, 2);
  }

  /** one-shot SFX, optionally positioned in the 3D world */
  play(name: string, at?: Vec3, listener?: { position: Vec3; yaw: number }) {
    if (!this.ctx) return;
    let bus: AudioNode = this.sfxBus;
    if (at && listener) {
      const p = this.ctx.createPanner();
      p.panningModel = 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = 2;
      p.maxDistance = 35;
      p.rolloffFactor = 1.4;
      p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z;
      p.connect(this.sfxBus);
      bus = p;
    }
    const tempBus = bus;
    const tone = (f: number, d: number, ty: OscillatorType, v: number, del = 0) => {
      const t = this.ctx!.currentTime + del;
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = ty; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(tempBus); o.start(t); o.stop(t + d + 0.02);
    };
    const noise = (d: number, fq: number, v: number, ty: BiquadFilterType = 'lowpass') => {
      const t = this.ctx!.currentTime;
      const s = this.ctx!.createBufferSource();
      s.buffer = this.noiseBuffer;
      const f = this.ctx!.createBiquadFilter();
      f.type = ty; f.frequency.value = fq;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f); f.connect(g); g.connect(tempBus); s.start(t); s.stop(t + d);
    };

    switch (name) {
      case 'ring': tone(440, 0.35, 'sine', 0.22); tone(480, 0.35, 'sine', 0.22, 0.45); break;
      case 'busy': tone(480, 0.16, 'square', 0.08); tone(480, 0.16, 'square', 0.08, 0.25); break;
      case 'connect': tone(660, 0.1, 'sine', 0.09); break;
      case 'talk': noise(0.09, 1100, 0.035, 'bandpass'); break;
      case 'hangup': noise(0.12, 700, 0.06); break;
      case 'click': noise(0.04, 2200, 0.07); break;
      case 'door': noise(0.5, 320, 0.16); tone(90, 0.3, 'triangle', 0.08); break;
      case 'lock': noise(0.08, 1800, 0.1); break;
      case 'footstep': noise(0.12, 380, 0.08); break;
      case 'breath': noise(0.5, 700, 0.05, 'bandpass'); break;
      case 'scratch': noise(0.55, 2400, 0.1, 'highpass'); break;
      case 'knock': tone(120, 0.14, 'triangle', 0.19); tone(120, 0.14, 'triangle', 0.15, 0.2); break;
      case 'interference': noise(0.5, 1800, 0.11, 'bandpass'); tone(60, 0.5, 'sawtooth', 0.04); break;
      case 'stinger': tone(70, 1.1, 'sawtooth', 0.22); noise(0.8, 900, 0.1); break;
      case 'pickup': tone(720, 0.08, 'sine', 0.1); tone(980, 0.12, 'sine', 0.08, 0.08); break;
      case 'charge': noise(0.7, 500, 0.05); break;
      case 'capture': tone(45, 2.4, 'sawtooth', 0.3); noise(2, 300, 0.18); break;
      default: break;
    }
  }

  update(dt: number, listener: { position: Vec3; yaw: number }, threat: number, moving: boolean) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    l.positionX.value = listener.position.x;
    l.positionY.value = listener.position.y;
    l.positionZ.value = listener.position.z;
    const fx = Math.sin(listener.yaw), fz = -Math.cos(listener.yaw);
    l.forwardX.value = fx; l.forwardY.value = 0; l.forwardZ.value = fz;
    l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    this.setTension(threat);

    this.stepTimer -= dt;
    if (moving && this.stepTimer <= 0) {
      this.stepTimer = 0.46;
      this.play('footstep');
    }
    this.breathTimer -= dt;
    if (this.breathTimer <= 0) {
      this.breathTimer = threat > 70 ? 1.5 : threat > 40 ? 2.6 : 4.2;
      this.play('breath');
    }
    if (threat > 75 && Math.random() < dt * 0.14) this.play('scratch');
  }
}
