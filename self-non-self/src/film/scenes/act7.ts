import { PALETTE } from '../palette';
import { drawCollagenAscent, drawSkin } from '../environments';
import { drawGlow, drawPulseRing } from '../cells';
import {
  camera,
  drawShotEdge,
  messenger,
  withCamera,
  type SceneFrame,
} from './common';
import { smoothOpenPath, smoothstep } from '../util';

export function renderSurface(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette } = frame;

  if (shot.id === 'u1') {
    const p = Math.min(1, shotLocal / 16);
    const cam = camera(360, 860 - p * 190, 1.02 + p * 0.08);
    withCamera(ctx, cam, () => drawCollagenAscent(ctx, {
      time,
      palette,
      progress: p,
    }));
    messenger(frame, 360, 900 - p * 60, 0.9, { alpha: 0.8 });
    drawGlow(ctx, { x: 360, y: 120, radius: 280, color: palette.glow, alpha: 0.08 + p * 0.08 });
    drawShotEdge(frame, 0.35);
    return;
  }

  if (shot.id === 'u2') {
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(360, 840 - p * 180, 1.05 + p * 0.1);
    withCamera(ctx, cam, () => drawSkin(ctx, {
      time,
      palette,
      hand: 0.9,
      snow: 0.4,
      light: 0.9,
    }));
    messenger(frame, 360, 880 - p * 40, 1.0, { alpha: 0.8 });
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'u3') {
    // The hand on the other side of the glass.
    const p = Math.min(1, shotLocal / 18);
    const cam = camera(400, 620, 1.28 + p * 0.14);
    withCamera(ctx, cam, () => drawSkin(ctx, {
      time,
      palette,
      hand: 1,
      snow: 0.5,
      light: 1,
    }));
    messenger(frame, 350, 900, 1.35, { alpha: 0.92 });

    // A single dendrite reaches for the glass.
    if (shotLocal > 5) {
      const reach = smoothstep(5, 13, shotLocal);
      const tipY = 880 - reach * 390;
      const points: Array<[number, number]> = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        points.push([
          350 + Math.sin(u * 4 + time * 0.5) * (8 + (1 - u) * 14) + u * 38,
          880 + (tipY - 880) * u,
        ]);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(246, 210, 138, 0.12)';
      ctx.lineWidth = 8;
      smoothOpenPath(ctx, points);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(246, 210, 138, 0.55)';
      ctx.lineWidth = 2.2;
      smoothOpenPath(ctx, points);
      ctx.stroke();
      const tip = points[points.length - 1]!;
      drawGlow(ctx, { x: tip[0], y: tip[1], radius: 26, color: PALETTE.gold, alpha: 0.32 });
      drawPulseRing(ctx, tip[0], tip[1], 8 + Math.sin(time * 1.3) * 3, 0.25, PALETTE.gold, 1);

      // The glass is cold; the hand does not move.
      drawGlow(ctx, { x: 420, y: 250, radius: 120, color: PALETTE.bone, alpha: 0.05 * reach });
    }
    drawShotEdge(frame, 0.3);
    return;
  }

  // u4 — the hand does not move; the cell turns back.
  const p = Math.min(1, shotLocal / 20);
  const hand = Math.max(0.1, 1 - smoothstep(8, 26, shotLocal) * 0.8);
  const cam = camera(360, 700 + p * 170, 1.12 - p * 0.02);
  withCamera(ctx, cam, () => drawSkin(ctx, {
    time,
    palette,
    hand,
    snow: 0.35,
    light: 0.75,
  }));
  messenger(frame, 360, 880 - p * 40, 0.95, { alpha: 0.8 });

  // Warm light from below: the body, calling its cell home.
  drawGlow(ctx, { x: 360, y: 1180, radius: 240, color: PALETTE.arterial, alpha: 0.07 + p * 0.06 });
  drawPulseRing(ctx, 360, 760, 210 + Math.sin(time * 0.4) * 12, 0.04, PALETTE.gold, 1);
  drawShotEdge(frame, 0.5);
}
