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
import { clamp, seeded, smoothstep, TAU } from '../util';

export function renderSignal(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette, reducedMotion } = frame;

  if (shot.id === 'g1') {
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(360, 650, 1.3 - p * 0.28);
    withCamera(ctx, cam, () => drawBarrier(ctx, {
      time,
      palette,
      integrity: 0.35,
      crossers: 6,
    }));
    messenger(frame, 360, 700, 1.3, { alpha: 0.9 });
    // The warning leaves as rings. Nothing answers.
    for (let i = 0; i < 4; i++) {
      const u = ((time * 0.22 + i * 0.24) % 1);
      drawPulseRing(ctx, 360, 700, 30 + u * 320, 0.22 * (1 - u), palette.glow, 1.4);
    }
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'g2') {
    const sh = shake(frame, 4);
    const cam = camera(360 + sh.x, 680 + sh.y, 1.08);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.9,
      bacteria: 54,
      oxygen: 0.3,
    }));
    messenger(frame, 360, 740, 1.1, { alpha: 0.95 });

    // Dendrites used as whips.
    const rng = seeded('signal-lashes');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + Math.sin(time * 0.6 + i) * 0.7;
      const r = 110 + Math.sin(time * 1.1 + i * 1.8) * 42 + rng() * 30;
      const x = 360 + Math.cos(a) * r;
      const y = 740 + Math.sin(a) * r * 0.85;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(246, 210, 138, ${0.1 + 0.06 * Math.sin(time * 3 + i)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(360, 740);
      ctx.quadraticCurveTo(360 + Math.cos(a + 0.5) * r * 0.6, 740 + Math.sin(a + 0.5) * r * 0.4, x, y);
      ctx.stroke();
      ctx.restore();
      drawGlow(ctx, { x, y, radius: 22, color: PALETTE.gold, alpha: 0.16 + 0.12 * Math.sin(time * 4 + i) });
    }
    drawShotEdge(frame, 0.2);
    return;
  }

  if (shot.id === 'g3') {
    // A dendrite tears away.
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(360, 670, 1.45 + p * 0.16);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.85,
      bacteria: 24,
      oxygen: 0.25,
    }));
    messenger(frame, 360, 730, 1.7, { alpha: 0.9, wounded: true });

    if (shotLocal < 1.6) {
      ctx.fillStyle = `rgba(246, 210, 138, ${0.25 * (1 - shotLocal / 1.6)})`;
      ctx.fillRect(0, 0, 720, 1280);
    }

    const drift = Math.min(1, shotLocal / 16);
    const tx = 470 + drift * 60;
    const ty = 570 - drift * 50;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(232, 137, 138, 0.5)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(tx - 20, ty - 10);
    ctx.quadraticCurveTo(tx + 10, ty + 40, tx + 22, ty + 54);
    ctx.stroke();
    ctx.restore();
    drawGlow(ctx, { x: tx, y: ty, radius: 30, color: PALETTE.rose, alpha: 0.25 });
    drawGlow(ctx, { x: 420, y: 640, radius: 18, color: PALETTE.rose, alpha: 0.35 });
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'g4') {
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(400, 650, 1.35 + p * 0.12);
    withCamera(ctx, cam, () => drawGut(ctx, {
      time,
      palette,
      breach: 0.7,
      bacteria: 5,
      oxygen: 0.2,
    }));
    const rx = 410 + Math.sin(time * 0.2) * 5;
    const ry = 650 + Math.cos(time * 0.18) * 6;
    drawBacterium(ctx, {
      x: rx,
      y: ry,
      angle: 1.2,
      size: 22,
      time,
      color: palette.accent,
      glow: PALETTE.gold,
      alpha: 1,
      granule: true,
      flagella: 2,
    });
    drawGlow(ctx, { x: rx, y: ry, radius: 150, color: PALETTE.gold, alpha: 0.12 });
    messenger(frame, 230, 780, 0.9, { alpha: 0.45, nucleusGlow: 0.4 });
    drawShotEdge(frame, 0.3);
    return;
  }

  // g5 — the mercy.
  const p = Math.min(1, shotLocal / 20);
  const cam = camera(360, 650, 1.12 - p * 0.08);
  withCamera(ctx, cam, () => drawGut(ctx, {
    time,
    palette,
    breach: 0.5,
    bacteria: 12,
    oxygen: 0.2,
  }));
  messenger(frame, 280, 740, 1.15, { alpha: 0.7, branches: 8 });

  const travel = smoothstep(2, 17, shotLocal);
  const rx = 380 + travel * 170;
  const ry = 660 - travel * 180;
  drawGlow(ctx, { x: rx, y: ry, radius: 130 + travel * 80, color: PALETTE.gold, alpha: 0.16 });
  drawBacterium(ctx, {
    x: rx,
    y: ry,
    angle: 1.4,
    size: 14,
    time,
    color: palette.accent,
    glow: PALETTE.gold,
    alpha: 0.95 * (1 - travel * 0.35),
    granule: true,
    flagella: 2,
  });

  // The path of light.
  const rng = seeded('mercy-path');
  for (let i = 0; i < 10; i++) {
    const u = i / 10;
    const x = 380 + u * 170 + Math.sin(u * 9 + time) * 10;
    const y = 660 - u * 180 + Math.cos(u * 7 + time * 0.7) * 8;
    drawGlow(ctx, { x, y, radius: 12 + rng() * 12, color: PALETTE.gold, alpha: 0.08 * travel });
  }
  drawShotEdge(frame, 0.5);
  void reducedMotion;
  void clamp;
}
