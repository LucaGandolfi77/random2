import type { StageDef } from '../data/stages';
import { GROUND_Y, VIEW_H, VIEW_W } from '../game/constants';

function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class StageRenderer {
  draw(g: CanvasRenderingContext2D, stage: StageDef, time: number) {
    const sky = g.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, stage.skyTop);
    sky.addColorStop(1, stage.skyBottom);
    g.fillStyle = sky;
    g.fillRect(0, 0, VIEW_W, VIEW_H);

    // sun / moon
    g.fillStyle = stage.accent;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.arc(stage.kind === 'prison' ? 380 : 96, 66, stage.kind === 'shore' ? 34 : 24, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    // parallax silhouettes
    this.silhouettes(g, stage, time * 5, stage.far, 0.55, 0.18);
    this.silhouettes(g, stage, time * 12, stage.near, 0.85, 0.30);

    // cloud / haze bands
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 140 + time * (3 + i)) % (VIEW_W + 120)) - 60;
      const y = 30 + i * 19;
      g.fillRect(x, y, 72, 3);
      g.fillRect(x + 14, y - 4, 44, 3);
    }

    // ground
    g.fillStyle = stage.ground;
    g.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    g.fillStyle = stage.groundTop;
    g.fillRect(0, GROUND_Y, VIEW_W, 5);
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 34; i++) {
      const x = Math.floor(rand(i + stage.id.length) * VIEW_W);
      g.fillRect(x, GROUND_Y + 7 + (i % 5) * 7, 12 + rand(i * 3) * 16, 2);
    }

    // platforms
    for (const p of stage.platforms) {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(p.x, p.y + 3, p.w, p.h + 3);
      g.fillStyle = stage.platform;
      g.fillRect(p.x, p.y, p.w, p.h);
      g.fillStyle = stage.accent;
      g.globalAlpha = 0.6;
      g.fillRect(p.x, p.y, p.w, 2);
      g.globalAlpha = 1;
    }
  }

  private silhouettes(g: CanvasRenderingContext2D, stage: StageDef, offset: number, color: string, baseY: number, alpha: number) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    const shift = -offset % 80;
    for (let i = -1; i < 8; i++) {
      const x = i * 80 + shift;
      const h = 24 + rand(i + baseY * 10) * 52;
      if (stage.kind === 'shore') {
        g.fillRect(x, GROUND_Y - h, 34, h);
        g.beginPath();
        g.moveTo(x - 4, GROUND_Y - h);
        g.lineTo(x + 17, GROUND_Y - h - 22);
        g.lineTo(x + 38, GROUND_Y - h);
        g.fill();
      } else if (stage.kind === 'prison') {
        g.fillRect(x, GROUND_Y - h, 46, h);
        g.fillStyle = 'rgba(159,232,189,.25)';
        for (let w = 0; w < 3; w++) g.fillRect(x + 6 + w * 13, GROUND_Y - h + 8, 5, 7);
        g.fillStyle = color;
      } else if (stage.kind === 'market') {
        g.fillRect(x, GROUND_Y - h * 0.7, 42, h * 0.7);
        g.fillStyle = stage.accent;
        g.fillRect(x - 3, GROUND_Y - h * 0.7 - 4, 48, 4);
        g.fillStyle = color;
      } else if (stage.kind === 'forge') {
        g.fillRect(x, GROUND_Y - h, 30, h);
        g.fillRect(x + 10, GROUND_Y - h - 24, 9, 24);
        g.fillStyle = 'rgba(255,140,70,.35)';
        g.fillRect(x + 11, GROUND_Y - h - 20, 7, 8);
        g.fillStyle = color;
      } else if (stage.kind === 'sky') {
        g.fillRect(x, GROUND_Y - h * 0.6, 46, 8);
        g.fillRect(x + 6, GROUND_Y - h * 0.6 + 8, 5, h * 0.5);
      } else if (stage.kind === 'frozen') {
        g.fillRect(x, GROUND_Y - h, 34, h);
        g.fillRect(x + 4, GROUND_Y - h - 22, 3, 22);
        g.fillRect(x + 4, GROUND_Y - h - 22, 24, 3);
      } else if (stage.kind === 'ruins') {
        g.fillRect(x, GROUND_Y - h, 12, h);
        g.fillRect(x + 20, GROUND_Y - h * 0.8, 12, h * 0.8);
        g.fillRect(x - 3, GROUND_Y - h - 3, 18, 3);
      } else {
        g.fillRect(x, GROUND_Y - h, 40, h);
        g.fillRect(x + 6, GROUND_Y - h - 18, 5, 18);
        g.fillRect(x + 26, GROUND_Y - h - 12, 5, 12);
      }
    }
    g.restore();
  }
}
