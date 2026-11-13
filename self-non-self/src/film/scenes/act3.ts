import { PALETTE } from '../palette';
import { drawBarrier, drawGut } from '../environments';
import { drawBacterium, drawGlow, drawPulseRing } from '../cells';
import {
  camera,
  drawShotEdge,
  messenger,
  shake,
  withCamera,
  type SceneFrame,
} from './common';
import { clamp, seeded, smoothstep } from '../util';

export function renderBreach(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette, reducedMotion } = frame;

  if (shot.id === 'b1') {
    const p = Math.min(1, shotLocal / 16);
    const cam = camera(360, 680 - p * 30, 1 + p * 0.08);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.05,
      bacteria: 12,
      oxygen: 0.6,
    }));
    messenger(frame, 360, 780, 0.95, { alpha: 0.85 });
    drawShotEdge(frame, 0.4);
    return;
  }

  if (shot.id === 'b2') {
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(360, 640, 1.05 + p * 0.06);
    withCamera(ctx, cam, () => drawBarrier(ctx, {
      time,
      palette,
      integrity: 0.92,
      crossers: 8,
    }));
    messenger(frame, 300, 800, 1.0, { alpha: 0.9 });
    const rng = seeded('breach-b2');
    for (let i = 0; i < 8; i++) {
      drawBacterium(ctx, {
        x: 60 + rng() * 600,
        y: 700 + rng() * 300,
        angle: rng() * 6.28,
        size: 2 + rng() * 3,
        time: time + i,
        color: palette.other,
        glow: palette.glow,
        alpha: 0.25 + rng() * 0.2,
        kind: rng() > 0.8 ? 'coccus' : 'rod',
      });
    }
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'b3') {
    // The hard cut: the wall gives way.
    const sh = shake(frame, 7);
    const cam = camera(360 + sh.x, 620 + sh.y, 1.04 + Math.min(0.14, shotLocal * 0.008));
    withCamera(ctx, cam, () => drawBarrier(ctx, {
      time,
      palette,
      integrity: clamp(0.55 - shotLocal * 0.05, 0.08, 0.55),
      crossers: 30,
    }));
    if (shotLocal < 1.8 && !reducedMotion) {
      ctx.fillStyle = `rgba(246, 210, 138, ${0.12 * (1 - shotLocal / 1.8)})`;
      ctx.fillRect(0, 0, 720, 1280);
    }
    messenger(frame, 420, 770, 0.9, { alpha: 0.8, wounded: false });
    drawShotEdge(frame, 0.2);
    return;
  }

  if (shot.id === 'b4') {
    // The first phagocytosis: an embrace with no way back.
    const p = smoothstep(2, 13, shotLocal);
    const cam = camera(360, 660, 1.25 + p * 0.35);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.65,
      bacteria: 6,
      oxygen: 0.45,
    }));
    messenger(frame, 330, 730, 1.55, { alpha: 1 });

    const bx = 520 - p * 130;
    const by = 610 + p * 80;
    drawBacterium(ctx, {
      x: bx,
      y: by,
      angle: -0.5 + p * 0.8,
      size: 8,
      time,
      color: palette.other,
      glow: PALETTE.gold,
      alpha: 1 - p * 0.35,
      granule: false,
    });

    if (p > 0.7) {
      const q = smoothstep(0.7, 1, p);
      drawGlow(ctx, {
        x: 360,
        y: 700,
        radius: 90 * q,
        color: PALETTE.gold,
        alpha: 0.32 * q,
      });
      drawPulseRing(ctx, 360, 700, 30 + q * 80, 0.25 * q, PALETTE.gold, 1.2);
    }
    drawShotEdge(frame, 0.25);
    return;
  }

  // b5 — the cell is not a soldier.
  const p = Math.min(1, shotLocal / 16);
  const cam = camera(360, 690, 1.05 - p * 0.05);
  withCamera(ctx, cam, () => drawGut(ctx, {
    time,
    palette,
    breach: 0.85,
    bacteria: 34,
    oxygen: 0.35,
  }));
  messenger(frame, 360, 760, 1.05, { alpha: 0.9 });
  const beat = Math.max(0, Math.sin(time * 0.9));
  drawGlow(ctx, { x: 360, y: 760, radius: 200, color: PALETTE.blood, alpha: 0.08 + beat * 0.04 });
  drawShotEdge(frame, 0.5);
}
