import { AREA_BY_ID } from '../data/areas';
import { BRO_BY_ID } from '../data/bros';
import { ENEMY_BY_ID } from '../data/enemies';
import { TILE, VIEW_H, VIEW_W } from '../game/constants';
import type { EnemyDef } from '../game/types';
import type { BattleView } from '../systems/BattleSystem';
import type { Overworld } from '../systems/Overworld';
import { broSprite, chestSprite, enemySprite } from './Sprites';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Popup { x: number; y: number; text: string; life: number; color: string }

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private shake = 0;
  private shakeX = 0;
  private shakeY = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
  }

  burst(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 90;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.3 + Math.random() * 0.35, max: 0.65, color, size: 1 + Math.random() * 2 });
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  }

  popup(text: string, x: number, y: number, color = '#f4c542') {
    this.popups.push({ x, y, text, life: 1.2, color });
  }

  kick(amount = 4) { this.shake = Math.max(this.shake, amount); }

  update(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 24);
    this.shakeX = (Math.random() - 0.5) * this.shake;
    this.shakeY = (Math.random() - 0.5) * this.shake * 0.6;
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 180 * dt; p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) { p.y -= 24 * dt; p.life -= dt; }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  private drawEffects(g: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;
    g.font = 'bold 14px monospace';
    g.textAlign = 'center';
    for (const p of this.popups) {
      g.globalAlpha = Math.min(1, p.life * 2);
      g.fillStyle = '#161a28';
      g.fillText(p.text, Math.round(p.x) + 1, Math.round(p.y) + 1);
      g.fillStyle = p.color;
      g.fillText(p.text, Math.round(p.x), Math.round(p.y));
    }
    g.globalAlpha = 1;
  }

  renderWorld(world: Overworld, time: number) {
    const g = this.ctx;
    const def = AREA_BY_ID[world.areaId];
    const cam = world.camera;
    g.save();
    g.translate(this.shakeX, this.shakeY);
    g.fillStyle = def.sky;
    g.fillRect(-8, -8, VIEW_W + 16, VIEW_H + 16);

    // parallax layers: far hills, mid structures
    this.parallax(g, cam, def.sky, def.wall, def.accent, 0.12, 58, 0.35);
    this.parallax(g, cam, def.ground, def.wall, def.accent, 0.3, 32, 0.45);

    const startX = Math.floor(cam.x / TILE);
    const startY = Math.floor(cam.y / TILE);
    const cols = Math.ceil(VIEW_W / TILE) + 1;
    const rows = Math.ceil(VIEW_H / TILE) + 1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tx = startX + x, ty = startY + y;
        if (tx < 0 || ty < 0 || tx >= world.data.width || ty >= world.data.height) continue;
        const t = world.data.tiles[ty][tx];
        const px = tx * TILE - cam.x, py = ty * TILE - cam.y;
        if (t === '#') {
          g.fillStyle = def.wall;
          g.fillRect(px, py, TILE, TILE);
          g.fillStyle = this.shade(def.wall, 26);
          g.fillRect(px, py, TILE, 3);
          g.fillStyle = this.shade(def.wall, -26);
          g.fillRect(px, py + TILE - 3, TILE, 3);
          // brick joints
          g.fillStyle = 'rgba(0,0,0,.12)';
          g.fillRect(px + ((tx % 2) * 7), py + 7, TILE, 1);
        } else {
          g.fillStyle = (tx + ty) % 2 ? def.ground : this.shade(def.ground, -8);
          g.fillRect(px, py, TILE, TILE);
          // small deterministic decorations
          const h = (tx * 73856093 ^ ty * 19349663) >>> 0;
          if (h % 11 === 0) {
            g.fillStyle = this.shade(def.ground, 24);
            g.fillRect(px + 4, py + 9, 2, 3);
            g.fillRect(px + 10, py + 6, 2, 4);
          } else if (h % 13 === 0) {
            g.fillStyle = def.accent;
            g.fillRect(px + 7, py + 7, 2, 2);
          }
          if (t === 'D') {
            g.fillStyle = def.accent;
            g.fillRect(px + 3, py + 1, 10, 15);
            g.fillStyle = '#1a1a24';
            g.fillRect(px + 6, py + 5, 4, 11);
            g.fillStyle = this.shade(def.accent, 40);
            g.fillRect(px + 7, py + 7, 2, 2);
          }
        }
      }
    }

    for (const c of world.data.chests) {
      g.drawImage(chestSprite(c.opened), Math.round(c.x * TILE - cam.x), Math.round(c.y * TILE - cam.y - 2), TILE, 16);
    }
    for (const e of world.enemies) {
      const ed = ENEMY_BY_ID[e.kind];
      const s = enemySprite(ed, Math.floor(time * 3));
      g.fillStyle = 'rgba(10,12,22,.3)';
      g.beginPath(); g.ellipse(Math.round(e.x - cam.x), Math.round(e.y - cam.y + 7), 11, 3, 0, 0, Math.PI * 2); g.fill();
      g.drawImage(s, Math.round(e.x - cam.x - 16), Math.round(e.y - cam.y - 16), 32, 28);
    }
    if (world.npc) {
      g.fillStyle = '#f4c542';
      g.fillRect(Math.round(world.npc.x - cam.x - 6), Math.round(world.npc.y - cam.y - 14), 12, 16);
      g.fillStyle = '#10182b';
      g.fillRect(Math.round(world.npc.x - cam.x - 1), Math.round(world.npc.y - cam.y - 11), 2, 6);
      g.fillRect(Math.round(world.npc.x - cam.x - 1), Math.round(world.npc.y - cam.y - 3), 2, 2);
    }

    const f = world.follower;
    const fDef = BRO_BY_ID[world.leader === 'pip' ? 'pop' : 'pip'];
    this.drawBro(g, fDef, f.x - cam.x, f.y - cam.y, time, false);
    const lDef = BRO_BY_ID[world.leader];
    this.drawBro(g, lDef, world.x - cam.x, world.y - cam.y, time, world.actionFlash > 0);

    this.drawEffects(g);
    g.restore();
  }

  private drawBro(g: CanvasRenderingContext2D, def: (typeof BRO_BY_ID)[string], x: number, y: number, time: number, action: boolean) {
    g.fillStyle = 'rgba(10,12,22,.32)';
    g.beginPath(); g.ellipse(Math.round(x), Math.round(y + 10), 9, 3, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(broSprite(def, Math.floor(time * 6), action), Math.round(x - 10), Math.round(y - 13), 20, 28);
  }

  private parallax(g: CanvasRenderingContext2D, cam: { x: number; y: number }, sky: string, wall: string, accent: string, factor: number, height: number, alpha: number) {
    g.save();
    g.globalAlpha = alpha;
    const off = (cam.x * factor) % 96;
    for (let i = -1; i < VIEW_W / 96 + 2; i++) {
      const x = i * 96 - off;
      const h = height + ((i * 37) % 22);
      g.fillStyle = i % 2 ? wall : this.shade(wall, 16);
      g.fillRect(x, VIEW_H - h - 30, 86, h);
      g.fillStyle = accent;
      g.globalAlpha = alpha * 0.4;
      g.fillRect(x + 18, VIEW_H - h - 34, 8, 8);
      g.globalAlpha = alpha;
    }
    g.restore();
    void sky;
  }

  renderBattle(view: BattleView, time: number) {
    const g = this.ctx;
    g.save();
    g.translate(this.shakeX, this.shakeY);
    const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#33498a');
    grad.addColorStop(0.6, '#5a6ba8');
    grad.addColorStop(1, '#1b2748');
    g.fillStyle = grad;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    // layered hills
    g.fillStyle = '#3d5a72';
    for (let i = 0; i < 8; i++) {
      const x = i * 70 - ((time * 6) % 70);
      g.beginPath(); g.moveTo(x, 170); g.lineTo(x + 35, 118 - (i % 3) * 10); g.lineTo(x + 70, 170); g.fill();
    }
    g.fillStyle = '#405c38';
    g.fillRect(0, 196, VIEW_W, 74);
    g.fillStyle = '#6e9a52';
    g.fillRect(0, 196, VIEW_W, 5);
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = 0; i < 40; i++) g.fillRect((i * 53) % VIEW_W, 200 + ((i * 29) % 60), 12, 2);

    const enemy = enemySprite({ id: view.enemyId, colors: view.enemyColors } as EnemyDef, Math.floor(time * 4));
    g.fillStyle = 'rgba(10,12,22,.35)';
    g.beginPath(); g.ellipse(240, 162, 44, 7, 0, 0, Math.PI * 2); g.fill();
    g.save();
    g.translate(240, 96 + Math.sin(time * 2) * 4);
    g.scale(3.2, 3.2);
    g.drawImage(enemy, -16, -14);
    g.restore();

    view.bros.forEach((b, i) => {
      const def = BRO_BY_ID[b.id];
      const x = i === 0 ? 92 : 168;
      g.save();
      g.globalAlpha = b.fainted ? 0.35 : 1;
      this.drawBro(g, def, x, 172, time, view.phase === 'timing');
      g.restore();
    });

    if (view.status) {
      g.fillStyle = view.status.startsWith('BURN') ? '#ff9a4a' : view.status.startsWith('SHOCK') ? '#8fd8ff' : '#c8f0a0';
      g.font = 'bold 11px monospace';
      g.textAlign = 'left';
      g.fillText(view.status, 16, 24);
    }

    if (view.phase === 'timing' || view.phase === 'defend') {
      const barX = 80, barY = 232, barW = 320, barH = 14;
      g.fillStyle = '#101827';
      g.fillRect(barX, barY, barW, barH);
      g.fillStyle = view.phase === 'defend' ? '#7fd8f0' : '#f4c542';
      g.fillRect(barX + view.windowStart * barW, barY, (view.windowEnd - view.windowStart) * barW, barH);
      g.fillStyle = '#ffffff';
      g.fillRect(barX + view.cursor * barW - 2, barY - 3, 4, barH + 6);
      g.strokeStyle = '#8fa5c8';
      g.lineWidth = 1;
      g.strokeRect(barX, barY, barW, barH);
    }
    this.drawEffects(g);
    g.restore();
  }

  renderMinigame(view: import('../game/types').MinigameView, time: number) {
    const g = this.ctx;
    g.save();
    g.fillStyle = '#182544';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = i % 2 ? 'rgba(244,197,66,.14)' : 'rgba(127,216,240,.14)';
      g.fillRect((i * 97) % VIEW_W, (i * 53) % 120, 18, 10);
    }
    g.fillStyle = '#2a3c66';
    g.fillRect(0, 180, VIEW_W, 90);
    const x = 70, y = 130, w = 340;
    g.fillStyle = '#101827'; g.fillRect(x, y, w, 18);
    g.fillStyle = '#f4c542';
    const zw = view.id === 'hammertoss' ? 24 : 34;
    g.fillRect(x + view.cursor * w - zw / 2, y, zw, 18);
    g.strokeStyle = '#dfe8f8'; g.lineWidth = 2; g.strokeRect(x, y, w, 18);
    g.fillStyle = '#7fd8f0'; g.fillRect(x + 0.5 * w - 2, y - 6, 4, 30);
    const rng = (i: number) => ((i * 73) % 100) / 100;
    if (view.id === 'coinrush') {
      for (let i = 0; i < 8; i++) {
        const cx = 50 + rng(i) * 380, cy = 46 + rng(i + 9) * 62;
        g.fillStyle = i % 2 ? '#f4c542' : '#e8a828';
        g.fillRect(cx, cy, 13, 13);
        g.fillStyle = '#fff2b0'; g.fillRect(cx + 4, cy + 3, 3, 5);
      }
    } else if (view.id === 'hammertoss') {
      for (const tx of [110, 240, 370]) {
        g.fillStyle = '#7fd8f0'; g.fillRect(tx, 56 + Math.sin(time * 3 + tx) * 20, 22, 22);
        g.fillStyle = '#dff6ff'; g.fillRect(tx + 4, 60 + Math.sin(time * 3 + tx) * 20, 6, 6);
      }
    } else if (view.id === 'jumprope') {
      const ry = 158 + Math.sin(time * 6) * 24;
      g.strokeStyle = '#f6e3c0'; g.lineWidth = 3;
      g.beginPath(); g.arc(240, ry, 72, Math.PI, 0); g.stroke();
      g.fillStyle = '#e05a52'; g.fillRect(210, 178, 18, 20);
      g.fillStyle = '#59c46f'; g.fillRect(252, 178, 18, 20);
    } else if (view.id === 'recipedash') {
      const cols = ['#e05a52', '#f4c542', '#59c46b'];
      for (let i = 0; i < 3; i++) { g.fillStyle = cols[i]; g.fillRect(150 + i * 70, 62, 42, 34); g.fillStyle = '#ffffff'; g.globalAlpha = 0.25; g.fillRect(154 + i * 70, 66, 34, 6); g.globalAlpha = 1; }
    } else {
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#8f7ad8' : '#5a4a8a'; g.fillRect(120 + (i % 3) * 80, 46 + Math.floor(i / 3) * 50, 54, 38); g.fillStyle = '#f4c542'; g.fillRect(142 + (i % 3) * 80, 58 + Math.floor(i / 3) * 50, 10, 10); }
    }
    this.drawEffects(g);
    g.restore();
  }

  private shade(hex: string, amount: number) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v: number) => Math.max(0, Math.min(255, v));
    return `rgb(${c((n >> 16) + amount)},${c(((n >> 8) & 255) + amount)},${c((n & 255) + amount)})`;
  }
}
