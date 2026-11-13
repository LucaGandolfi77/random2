import { PALETTE } from '../palette';
import { drawCapillary, drawLymphCathedral, drawMarrow } from '../environments';
import { drawGlow, drawPulseRing, drawRedCell } from '../cells';
import {
  camera,
  drawShotEdge,
  drift,
  messenger,
  withCamera,
  type SceneFrame,
} from './common';
import { mod, seeded } from '../util';

export function renderSilence(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette } = frame;

  if (shot.id === 's1') {
    const d = drift(time, 8, 5, 0.06);
    const cam = camera(360 + d.x, 640 + d.y, 1.13);
    withCamera(ctx, cam, () => drawCapillary(ctx, {
      time,
      palette,
      flow: 0.35,
      oxygen: 0.88,
      cells: 6,
      blocked: 0.15,
    }));
    drawSlowCells(ctx, time, 0.5);
    messenger(frame, 360, 720, 1.02, { alpha: 0.92 });
    drawShotEdge(frame, 0.35);
    return;
  }

  if (shot.id === 's2') {
    const p = Math.min(1, shotLocal / 16);
    const cam = camera(360, 620 + p * 150, 1.06 + p * 0.3);
    withCamera(ctx, cam, () => drawCapillary(ctx, {
      time,
      palette,
      flow: 0.08,
      oxygen: 0.55,
      cells: 4,
      blocked: 1,
    }));
    // The last cells stop moving.
    const rng = seeded('silence-beached');
    for (let i = 0; i < 9; i++) {
      drawRedCell(ctx, {
        x: 190 + rng() * 340,
        y: 760 + rng() * 180,
        size: 9 + rng() * 7,
        angle: rng() * 6.28,
        alpha: 0.15 + rng() * 0.2,
        time,
        oxygen: 0.25,
      });
    }
    messenger(frame, 520, 880, 0.85, { alpha: 0.7 });
    drawShotEdge(frame, 0.4);
    return;
  }

  if (shot.id === 's3') {
    const p = Math.min(1, shotLocal / 16);
    const cam = camera(360, 660 + p * 20, 1.05 + p * 0.1);
    withCamera(ctx, cam, () => drawMarrow(ctx, time, palette, 0.82));
    // One last stem cell, then none.
    if (shotLocal < 11) {
      const flicker = Math.max(0, Math.sin(shotLocal * 2.1) * 0.5 + 0.5) * (1 - shotLocal / 11);
      drawGlow(ctx, { x: 482, y: 470, radius: 40, color: PALETTE.gold, alpha: 0.25 * flicker });
      ctx.fillStyle = `rgba(246, 210, 138, ${0.4 * flicker})`;
      ctx.beginPath();
      ctx.arc(482, 470, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    messenger(frame, 280, 840, 0.72, { alpha: 0.65 });
    drawShotEdge(frame, 0.45);
    return;
  }

  if (shot.id === 's4') {
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(360, 640, 1.02 + p * 0.12);
    withCamera(ctx, cam, () => drawLymphCathedral(ctx, {
      time,
      palette,
      lit: 0.28,
      emptiness: 0.7,
      focus: 0.2,
    }));
    messenger(frame, 360, 700, 1.15, { alpha: 0.9 });
    // The call leaves; the echo comes back as a thinner ring.
    const t = (time * 0.24) % 1;
    drawPulseRing(ctx, 360, 700, 40 + t * 300, 0.26 * (1 - t), palette.glow, 1.4);
    const echoT = (t + 0.48) % 1;
    drawPulseRing(ctx, 360, 700, 40 + echoT * 260, 0.07 * (1 - echoT), PALETTE.slate, 1);
    drawShotEdge(frame, 0.3);
    return;
  }

  // s5 — the node, nearly dark.
  const cam = camera(360, 650, 1.02);
  withCamera(ctx, cam, () => drawLymphCathedral(ctx, {
    time,
    palette,
    lit: 0.04,
    emptiness: 1,
    focus: 0,
  }));
  messenger(frame, 360, 720, 0.85, { alpha: 0.45, nucleusGlow: 0.5 });
  const pulse = Math.max(0, Math.sin(time * 0.75));
  drawGlow(ctx, { x: 360, y: 720, radius: 140, color: PALETTE.blood, alpha: 0.06 + pulse * 0.05 });
  drawShotEdge(frame, 0.55);
}

function drawSlowCells(ctx: CanvasRenderingContext2D, time: number, opacity: number): void {
  const rng = seeded('silence-slow-cells');
  for (let i = 0; i < 6; i++) {
    const x = 120 + rng() * 480;
    const y = mod(rng() * 1280 + time * 5, 1280);
    drawRedCell(ctx, {
      x,
      y,
      size: 7 + rng() * 7,
      angle: rng() * 6.28,
      alpha: opacity * (0.2 + rng() * 0.3),
      time,
      oxygen: 0.5,
    });
  }
}
