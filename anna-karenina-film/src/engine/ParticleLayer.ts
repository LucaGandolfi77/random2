import type { EffectCue, EffectId } from '../data/types';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  opacity: number;
  drift: number;
}

const W = 1920;
const H = 1080;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParticles(count: number, seed: number, sizeMin: number, sizeMax: number): Particle[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    size: sizeMin + rnd() * (sizeMax - sizeMin),
    speed: 0.35 + rnd() * 1.2,
    phase: rnd() * Math.PI * 2,
    opacity: 0.25 + rnd() * 0.65,
    drift: 0.4 + rnd() * 1.6
  }));
}

type EffectSet = { type: EffectId; intensity: number; particles: Particle[] };

export class ParticleLayer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private effects: EffectSet[] = [];
  private readonly reduce: boolean;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'atmosphere';
    this.canvas.width = W;
    this.canvas.height = H;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D non disponibile');
    this.ctx = ctx;
    this.reduce =
      (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4);
  }

  setEffects(effects: EffectCue[] | undefined): void {
    const list = (effects ?? []).filter((e) => e.intensity !== 0);
    const next: EffectSet[] = [];
    for (const cue of list) {
      const countScale = (cue.intensity ?? 1) * (this.reduce ? 0.5 : 1);
      switch (cue.type) {
        case 'snow':
          next.push({ type: cue.type, intensity: cue.intensity ?? 1, particles: makeParticles(Math.round(190 * countScale), 11, 1, 4.2) });
          break;
        case 'steam':
          next.push({ type: cue.type, intensity: cue.intensity ?? 1, particles: makeParticles(Math.round(26 * countScale), 29, 24, 90) });
          break;
        case 'dust':
        case 'motes':
          next.push({ type: cue.type, intensity: cue.intensity ?? 1, particles: makeParticles(Math.round(90 * countScale), 47, 0.7, 2.4) });
          break;
        case 'rain':
          next.push({ type: cue.type, intensity: cue.intensity ?? 1, particles: makeParticles(Math.round(220 * countScale), 61, 8, 22) });
          break;
        case 'embers':
          next.push({ type: cue.type, intensity: cue.intensity ?? 1, particles: makeParticles(Math.round(46 * countScale), 83, 1, 3.5) });
          break;
        case 'smoke':
          next.push({ type: cue.type, intensity: cue.intensity ?? 1, particles: makeParticles(Math.round(20 * countScale), 97, 30, 120) });
          break;
      }
    }
    this.effects = next;
  }

  render(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    for (const effect of this.effects) {
      switch (effect.type) {
        case 'snow':
          this.drawSnow(effect, time);
          break;
        case 'steam':
          this.drawSteam(effect, time);
          break;
        case 'dust':
        case 'motes':
          this.drawDust(effect, time);
          break;
        case 'rain':
          this.drawRain(effect, time);
          break;
        case 'embers':
          this.drawEmbers(effect, time);
          break;
        case 'smoke':
          this.drawSmoke(effect, time);
          break;
      }
    }
  }

  private drawSnow(effect: EffectSet, time: number): void {
    const ctx = this.ctx;
    for (const p of effect.particles) {
      const x = (p.x + time * p.speed * 18 + Math.sin(time * 0.28 + p.phase) * 26) % W;
      const y = (p.y + time * p.speed * 31) % H;
      ctx.globalAlpha = p.opacity * 0.85;
      ctx.fillStyle = '#e8f1f6';
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.size > 3.4) {
        ctx.globalAlpha = p.opacity * 0.12;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawSteam(effect: EffectSet, time: number): void {
    const ctx = this.ctx;
    for (const p of effect.particles) {
      const life = (time * p.speed * 0.08 + p.phase) % 1;
      const x = p.x + Math.sin(time * 0.1 + p.phase) * 80;
      const y = H - 80 - life * 720;
      const radius = p.size * (0.7 + life * 1.7);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(226,236,240,${0.2 * effect.intensity * (1 - life)})`);
      grad.addColorStop(0.55, `rgba(198,213,221,${0.11 * effect.intensity * (1 - life)})`);
      grad.addColorStop(1, 'rgba(180,200,210,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDust(effect: EffectSet, time: number): void {
    const ctx = this.ctx;
    const gold = effect.type === 'motes';
    for (const p of effect.particles) {
      const x = (p.x + Math.sin(time * 0.14 + p.phase) * 110 + time * 5) % W;
      const y = (p.y + Math.cos(time * 0.11 + p.phase) * 80 + time * 3) % H;
      ctx.globalAlpha = p.opacity * 0.38 * effect.intensity;
      ctx.fillStyle = gold ? '#e9c27b' : '#c3d1d8';
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawRain(effect: EffectSet, time: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(180,205,220,0.26)';
    ctx.lineWidth = 1.2;
    for (const p of effect.particles) {
      const x = (p.x + time * p.speed * 120) % W;
      const y = (p.y + time * p.speed * 320) % H;
      ctx.globalAlpha = p.opacity * 0.5 * effect.intensity;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + p.size * 2.8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawEmbers(effect: EffectSet, time: number): void {
    const ctx = this.ctx;
    for (const p of effect.particles) {
      const life = (time * p.speed * 0.2 + p.phase) % 1;
      const x = p.x + Math.sin(time * 0.4 + p.phase) * 50;
      const y = H - life * H;
      ctx.globalAlpha = p.opacity * 0.6 * effect.intensity * (1 - life);
      ctx.fillStyle = '#e9a25d';
      ctx.beginPath();
      ctx.arc(x, y, p.size * (0.5 + (1 - life)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSmoke(effect: EffectSet, time: number): void {
    const ctx = this.ctx;
    for (const p of effect.particles) {
      const life = (time * p.speed * 0.06 + p.phase) % 1;
      const x = p.x + Math.sin(time * 0.08 + p.phase) * 130;
      const y = H - life * 900;
      const radius = p.size * (0.8 + life * 1.4);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(30,34,38,${0.16 * effect.intensity * (1 - life)})`);
      grad.addColorStop(0.6, `rgba(20,24,28,${0.09 * effect.intensity * (1 - life)})`);
      grad.addColorStop(1, 'rgba(10,12,15,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
