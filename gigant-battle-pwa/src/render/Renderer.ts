import type { StageDef } from '../data/stages';
import type { Assist } from '../entities/Assist';
import type { Fighter } from '../entities/Fighter';
import type { Projectile } from '../entities/Projectile';
import { FIGHTER_H, VIEW_H, VIEW_W } from '../game/constants';
import { spriteFactory } from './SpriteFactory';
import { StageRenderer } from './StageRenderer';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export interface RenderScene {
  stage: StageDef;
  fighters: Fighter[];
  assists: Assist[];
  projectiles: Projectile[];
  time: number;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly stageRenderer = new StageRenderer();
  particles: Particle[] = [];
  private shake = 0;
  private shakeX = 0;
  private shakeY = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
  }

  addShake(amount: number) { this.shake = Math.max(this.shake, amount); }

  burst(x: number, y: number, color: string, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 90;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.3 + Math.random() * 0.3, max: 0.6,
        color, size: 1 + Math.random() * 2
      });
    }
    if (this.particles.length > 180) this.particles.splice(0, this.particles.length - 180);
  }

  update(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 22);
    this.shakeX = (Math.random() - 0.5) * this.shake;
    this.shakeY = (Math.random() - 0.5) * this.shake * 0.6;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  render(scene: RenderScene) {
    const g = this.ctx;
    g.save();
    g.clearRect(0, 0, VIEW_W, VIEW_H);
    g.translate(this.shakeX, this.shakeY);
    this.stageRenderer.draw(g, scene.stage, scene.time);

    for (const a of scene.assists) this.drawAssist(g, a);
    for (const f of scene.fighters) this.drawFighter(g, f, scene.time);
    for (const p of scene.projectiles) this.drawProjectile(g, p);

    for (const p of this.particles) {
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.color;
      g.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    g.globalAlpha = 1;
    g.restore();
  }

  private drawFighter(g: CanvasRenderingContext2D, f: Fighter, time: number) {
    g.fillStyle = 'rgba(0,0,0,.32)';
    g.beginPath();
    g.ellipse(f.centerX, Math.min(f.y + FIGHTER_H + 2, 240), 13, 3, 0, 0, Math.PI * 2);
    g.fill();

    let frame = 0;
    if (f.state === 'run') frame = Math.floor(f.walkPhase) % 4;
    else if (f.state === 'idle') frame = Math.floor(time * 3) % 2;
    else if (f.state === 'jump' || f.state === 'fall') frame = f.vy < 0 ? 0 : 1;
    else if (f.state === 'attack' && f.attack) frame = f.attackTime < f.attack.startup ? 0 : f.attackTime < f.attack.startup + f.attack.active ? 1 : 2;
    const sprite = spriteFactory.get(f.def, f.state, frame, f.facing);
    g.save();
    g.globalAlpha = f.state === 'dodge' ? 0.45 : 1;
    g.drawImage(sprite, Math.round(f.centerX - 15), Math.round(f.y + FIGHTER_H - 40), 30, 40);
    if (f.flash > 0) {
      g.globalAlpha = Math.min(0.65, f.flash * 0.6);
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(f.centerX - 15), Math.round(f.y + FIGHTER_H - 40), 30, 40);
    }
    g.restore();

    if (f.assistCooldowns.some((c) => c > 0) && f.state !== 'ko') {
      g.fillStyle = f.team === 'player' ? '#5fd6e8' : '#ef4b5d';
      g.fillRect(Math.round(f.centerX - 10), Math.round(f.y - 8), 20, 2);
    }
  }

  private drawAssist(g: CanvasRenderingContext2D, a: Assist) {
    const sprite = spriteFactory.get(a.def, 'attack', a.timer > 0.24 ? 1 : 0, a.facing);
    g.save();
    g.globalAlpha = Math.min(1, (1.5 - a.timer) * 2);
    g.drawImage(sprite, Math.round(a.x - 12), Math.round(a.y - 32), 24, 32);
    g.restore();
  }

  private drawProjectile(g: CanvasRenderingContext2D, p: Projectile) {
    const colors: Record<string, string> = {
      stretch: '#e8473f', slash: '#e8eef5', bolt: '#8fd8ff', fire: '#ff9a3a',
      pulse: '#ffb6e6', laser: '#7fe4ff', wave: '#c79fff', charge: '#ffe9a0',
      void: '#b8c8ff', quake: '#f6df9e', star: '#fff2a8', meteor: '#ffa63a', venom: '#8ce06a'
    };
    const c = colors[p.kind] ?? '#ffffff';
    g.save();
    g.fillStyle = c;
    g.globalAlpha = 0.35;
    g.fillRect(p.x - 10, p.y - 3, 20, 6);
    g.globalAlpha = 1;
    g.fillRect(p.x - 5, p.y - 4, 10, 8);
    g.fillStyle = '#ffffff';
    g.fillRect(p.x - 2, p.y - 2, 4, 4);
    g.restore();
  }
}
