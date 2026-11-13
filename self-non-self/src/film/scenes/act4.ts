import { PALETTE } from '../palette';
import { drawGut, drawMemoryField } from '../environments';
import { drawBacterium, drawGlow } from '../cells';
import {
  camera,
  drawShotEdge,
  messenger,
  withCamera,
  type SceneFrame,
} from './common';
import { clamp, seeded, smoothOpenPath, smoothstep, TAU } from '../util';

export function renderResidents(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette } = frame;

  if (shot.id === 'r1') {
    const p = Math.min(1, shotLocal / 16);
    const cam = camera(360, 650, 1.12 + p * 0.12);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.25,
      bacteria: 8,
      oxygen: 0.4,
    }));
    messenger(frame, 290, 700, 1.35, { alpha: 0.95 });
    const rx = 472 + Math.sin(time * 0.35) * 12;
    const ry = 610 + Math.cos(time * 0.3) * 16;
    drawBacterium(ctx, {
      x: rx,
      y: ry,
      angle: Math.sin(time * 0.2) * 0.6,
      size: 12,
      time,
      color: palette.accent,
      glow: PALETTE.gold,
      alpha: 0.95,
      granule: true,
      flagella: 3,
    });
    drawGlow(ctx, { x: rx, y: ry, radius: 80, color: PALETTE.gold, alpha: 0.1 });
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'r2') {
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(380, 650, 1.3 + p * 0.12);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.2,
      bacteria: 4,
      oxygen: 0.3,
    }));
    messenger(frame, 300, 690, 1.5, { alpha: 1 });
    const rx = 456 + Math.sin(time * 0.3) * 8;
    const ry = 640 + Math.cos(time * 0.26) * 10;
    drawBacterium(ctx, {
      x: rx,
      y: ry,
      angle: 1.1 + Math.sin(time * 0.2) * 0.2,
      size: 13,
      time,
      color: palette.accent,
      glow: PALETTE.gold,
      alpha: 1,
      granule: true,
      flagella: 2,
    });
    drawBridge(ctx, 380, 620, 820, time, palette, 0.35);
    drawShotEdge(frame, 0.25);
    return;
  }

  if (shot.id === 'r3') {
    // The first colonization: the body's first act was tolerance.
    const p = Math.min(1, shotLocal / 20);
    const cam = camera(360, 650, 1.02 + p * 0.1);
    withCamera(ctx, cam, () => drawMemoryField(ctx, time, palette));
    drawGlow(ctx, { x: 360, y: 660, radius: 280, color: PALETTE.gold, alpha: 0.1 });
    const rng = seeded('first-colonization');
    for (let i = 0; i < 18; i++) {
      const a = rng() * TAU;
      const r = 120 + rng() * 260;
      const x = 360 + Math.cos(a) * r;
      const y = 660 + Math.sin(a) * r * 0.7;
      const arrive = clamp((shotLocal - rng() * 6) / 10, 0, 1);
      drawBacterium(ctx, {
        x: 360 + (x - 360) * arrive,
        y: 660 + (y - 660) * arrive,
        angle: a,
        size: 3 + rng() * 5,
        time: time + i,
        color: rng() > 0.5 ? palette.accent : PALETTE.teal,
        glow: PALETTE.gold,
        alpha: 0.2 + arrive * 0.5,
        kind: rng() > 0.85 ? 'coccus' : 'rod',
        granule: rng() > 0.9,
      });
    }
    messenger(frame, 360, 760, 0.8, { alpha: 0.5, showAntigens: false });
    drawShotEdge(frame, 0.45);
    return;
  }

  if (shot.id === 'r4') {
    // The border, thinning.
    const p = Math.min(1, shotLocal / 18);
    const cam = camera(360, 660, 1.4 + p * 0.18);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.15,
      bacteria: 2,
      oxygen: 0.25,
    }));
    messenger(frame, 290, 710, 1.7, { alpha: 1, showAntigens: true });
    const rx = 458;
    const ry = 650;
    drawBacterium(ctx, {
      x: rx,
      y: ry,
      angle: 1.25,
      size: 16,
      time,
      color: palette.accent,
      glow: PALETTE.gold,
      alpha: 1,
      granule: true,
      flagella: 1,
    });
    drawGlow(ctx, { x: rx, y: ry, radius: 110, color: PALETTE.gold, alpha: 0.12 });
    drawBridge(ctx, 384, 620, 830, time, palette, 0.55 - p * 0.3);
    // Letters moving across the border
    const rng = seeded('border-letters');
    for (let i = 0; i < 7; i++) {
      const u = (time * 0.06 + rng()) % 1;
      const x = 384 + Math.sin(u * 6 + i) * 6;
      const y = 630 + u * 190;
      ctx.fillStyle = `rgba(246, 210, 138, ${0.2 + 0.2 * Math.sin(time + i)})`;
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillText(['A', 'T', 'G', 'C', '·', 'S', 'N'][i]!, x, y);
    }
    drawShotEdge(frame, 0.25);
    return;
  }

  // r5 — understanding.
  const p = Math.min(1, shotLocal / 18);
  const cam = camera(360, 650, 1.18 - p * 0.12);
  withCamera(ctx, cam, () => drawMemoryField(ctx, time, palette));
  const rx = 440;
  const ry = 640;
  messenger(frame, 290, 680, 1.3, { alpha: 0.95 });
  drawBacterium(ctx, {
    x: rx,
    y: ry,
    angle: 1.5,
    size: 13,
    time,
    color: palette.accent,
    glow: PALETTE.gold,
    alpha: 0.95,
    granule: true,
  });
  drawGlow(ctx, { x: 365, y: 660, radius: 150, color: PALETTE.gold, alpha: 0.08 + p * 0.06 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + time * 0.03;
    const r = 120 + Math.sin(time * 0.5 + i) * 8;
    const x = 365 + Math.cos(a) * r;
    const y = 660 + Math.sin(a) * r * 0.75;
    ctx.fillStyle = `rgba(246, 210, 138, ${0.16 + 0.14 * Math.sin(time + i * 1.7)})`;
    ctx.font = '12px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(['A', 'T', 'G', 'C', '·'][i % 5]!, x, y);
  }
  drawShotEdge(frame, 0.5);
}

function drawBridge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  time: number,
  palette: SceneFrame['palette'],
  strength: number,
): void {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    points.push([
      x + Math.sin(u * 5 + time * 0.6) * (6 + strength * 8),
      y1 + u * (y2 - y1),
    ]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(246, 210, 138, ${0.04 * strength})`;
  ctx.lineWidth = 10;
  smoothOpenPath(ctx, points);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = `rgba(246, 210, 138, ${0.25 * strength})`;
  ctx.lineWidth = 1;
  smoothOpenPath(ctx, points);
  ctx.stroke();
  void palette;
  void smoothstep;
}
