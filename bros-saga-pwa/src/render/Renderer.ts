import { AREA_BY_ID } from '../data/areas';
import { BRO_BY_ID } from '../data/bros';
import { ENEMY_BY_ID } from '../data/enemies';
import { TILE, VIEW_H, VIEW_W } from '../game/constants';
import type { EnemyDef } from '../game/types';
import type { BattleView } from '../systems/BattleSystem';
import type { MinigameView } from '../game/types';
import type { Overworld } from '../systems/Overworld';
import { broSprite, chestSprite, enemySprite } from './Sprites';

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
  }

  renderWorld(world: Overworld, time: number) {
    const g = this.ctx;
    const def = AREA_BY_ID[world.areaId];
    const cam = world.camera;
    g.fillStyle = def.sky;
    g.fillRect(0, 0, VIEW_W, VIEW_H);

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
          g.fillStyle = def.accent;
          g.globalAlpha = 0.12;
          g.fillRect(px + 2, py + 2, TILE - 4, 2);
          g.globalAlpha = 1;
        } else {
          g.fillStyle = (tx + ty) % 2 ? def.ground : this.shade(def.ground, -8);
          g.fillRect(px, py, TILE, TILE);
          if (t === 'D') {
            g.fillStyle = def.accent;
            g.fillRect(px + 3, py + 1, 10, 15);
            g.fillStyle = '#1a1a24';
            g.fillRect(px + 6, py + 5, 4, 11);
          }
        }
      }
    }

    for (const c of world.data.chests) {
      g.drawImage(chestSprite(c.opened), Math.round(c.x * TILE - cam.x), Math.round(c.y * TILE - cam.y - 2), TILE, 14);
    }
    for (const e of world.enemies) {
      const ed = ENEMY_BY_ID[e.kind];
      const s = enemySprite(ed, Math.floor(time * 3));
      g.drawImage(s, Math.round(e.x - cam.x - 12), Math.round(e.y - cam.y - 14), 24, 22);
    }

    const f = world.follower;
    const fDef = BRO_BY_ID[world.leader === 'pip' ? 'pop' : 'pip'];
    g.drawImage(broSprite(fDef, Math.floor(time * 4)), Math.round(f.x - cam.x - 8), Math.round(f.y - cam.y - 12), 16, 24);
    const lDef = BRO_BY_ID[world.leader];
    g.drawImage(broSprite(lDef, Math.floor(time * 4), world.actionFlash > 0), Math.round(world.x - cam.x - 8), Math.round(world.y - cam.y - 12), 16, 24);
  }

  renderBattle(view: BattleView, time: number) {
    const g = this.ctx;
    const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#2a3a68');
    grad.addColorStop(1, '#11182c');
    g.fillStyle = grad;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle = '#3a4a38';
    g.fillRect(0, 196, VIEW_W, 74);
    g.fillStyle = '#6a8a5a';
    g.fillRect(0, 196, VIEW_W, 4);

    const enemy = enemySprite({ id: view.enemyId, colors: view.enemyColors } as EnemyDef, Math.floor(time * 4));
    g.save();
    g.translate(240, 96 + Math.sin(time * 2) * 4);
    g.scale(3, 3);
    g.drawImage(enemy, -14, -12);
    g.restore();

    view.bros.forEach((b, i) => {
      const def = BRO_BY_ID[b.id];
      const x = i === 0 ? 92 : 168;
      g.save();
      g.globalAlpha = b.fainted ? 0.35 : 1;
      g.translate(x, 172);
      g.scale(2.4, 2.4);
      g.drawImage(broSprite(def, Math.floor(time * 4), view.phase === 'timing'), -8, -12);
      g.restore();
    });

    if (view.phase === 'timing' || view.phase === 'defend') {
      const barX = 80, barY = 232, barW = 320, barH = 14;
      g.fillStyle = '#101827';
      g.fillRect(barX, barY, barW, barH);
      g.fillStyle = '#f4c542';
      g.fillRect(barX + view.windowStart * barW, barY, (view.windowEnd - view.windowStart) * barW, barH);
      g.fillStyle = '#ffffff';
      g.fillRect(barX + view.cursor * barW - 2, barY - 3, 4, barH + 6);
      g.strokeStyle = '#8fa5c8';
      g.lineWidth = 1;
      g.strokeRect(barX, barY, barW, barH);
    }
  }

  renderMinigame(view: MinigameView, time: number) {
    const g = this.ctx;
    g.fillStyle = '#182544';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle = '#2a3c66';
    g.fillRect(0, 180, VIEW_W, 90);

    // shared timing track
    const x = 70, y = 130, w = 340;
    g.fillStyle = '#101827';
    g.fillRect(x, y, w, 18);
    g.fillStyle = '#f4c542';
    const zw = view.id === 'hammertoss' ? 24 : 34;
    g.fillRect(x + view.cursor * w - zw / 2, y, zw, 18);
    g.strokeStyle = '#dfe8f8';
    g.lineWidth = 2;
    g.strokeRect(x, y, w, 18);
    g.fillStyle = '#7fd8f0';
    g.fillRect(x + 0.5 * w - 2, y - 6, 4, 30);

    if (view.id === 'coinrush') {
      for (let i = 0; i < 8; i++) {
        const cx = 50 + ((i * 61) % 380);
        const cy = 52 + ((i * 37) % 60);
        g.fillStyle = i % 2 ? '#f4c542' : '#e8a828';
        g.fillRect(cx, cy, 12, 12);
      }
    } else if (view.id === 'hammertoss') {
      for (const tx of [110, 240, 370]) {
        g.fillStyle = '#7fd8f0';
        g.fillRect(tx, 60 + Math.sin(time * 3 + tx) * 18, 20, 20);
      }
    } else if (view.id === 'jumprope') {
      const ry = 160 + Math.sin(time * 6) * 24;
      g.strokeStyle = '#f6e3c0';
      g.lineWidth = 3;
      g.beginPath(); g.arc(240, ry, 70, Math.PI, 0); g.stroke();
      g.fillStyle = '#e05a52'; g.fillRect(210, 178, 16, 20);
      g.fillStyle = '#59c46f'; g.fillRect(254, 178, 16, 20);
    } else if (view.id === 'recipedash') {
      for (let i = 0; i < 3; i++) { g.fillStyle = ['#e05a52', '#f4c542', '#59c46b'][i]; g.fillRect(150 + i * 70, 66, 38, 30); }
    } else {
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#8f7ad8' : '#5a4a8a'; g.fillRect(120 + (i % 3) * 80, 50 + Math.floor(i / 3) * 50, 50, 36); }
    }
  }

  private shade(hex: string, amount: number) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (n & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }
}
