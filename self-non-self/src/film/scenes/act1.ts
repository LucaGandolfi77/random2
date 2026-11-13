import { PALETTE } from '../palette';
import {
  drawCapillary,
  drawLymphCathedral,
  drawScar,
} from '../environments';
import {
  drawAntibody,
  drawGlow,
  drawPulseRing,
  drawRedCell,
  drawTCell,
} from '../cells';
import {
  camera,
  drawShotEdge,
  drift,
  messenger,
  withCamera,
  type SceneFrame,
} from './common';
import { mod, seeded } from '../util';

export function renderWatch(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette } = frame;

  if (shot.id === 'w1') {
    const d = drift(time, 12, 8, 0.08);
    const cam = camera(360 + d.x, 640 + d.y, 1.12);
    withCamera(ctx, cam, () => drawCapillary(ctx, {
      time,
      palette,
      flow: 1,
      oxygen: 0.98,
      cells: 12,
    }));
    drawAntibodies(ctx, time, 7);
    drawRedCells(ctx, time, 5, 0.35);
    messenger(frame, 360 + d.x * 0.4, 710, 1.05, { alpha: 0.95 });
    drawShotEdge(frame);
    return;
  }

  if (shot.id === 'w2') {
    const p = Math.min(1, shotLocal / 17);
    const cam = camera(360, 650 - p * 30, 1 + p * 0.12);
    withCamera(ctx, cam, () => drawLymphCathedral(ctx, {
      time,
      palette,
      lit: 1,
      emptiness: 0,
    }));
    drawTCells(ctx, time, 8, 0.85);
    messenger(frame, 360, 700, 1.08, { alpha: 1 });
    drawPulseRing(ctx, 360, 700, 110 + Math.sin(time * 1.1) * 8, 0.1, palette.glow, 1);
    drawShotEdge(frame);
    return;
  }

  if (shot.id === 'w3') {
    // The presentation: a piece of the world held up to be read.
    const p = Math.min(1, shotLocal / 18);
    dtBackground(ctx, time, palette);
    const cam = camera(360, 640, 1.35 + p * 0.15);
    withCamera(ctx, cam, () => {
      drawLymphCathedral(ctx, { time, palette, lit: 0.9, emptiness: 0, focus: 1 });
    });
    messenger(frame, 300, 760, 1.5, { alpha: 1, showAntigens: true });

    const antigenX = 440;
    const antigenY = 640;
    drawGlow(ctx, { x: antigenX, y: antigenY, radius: 90, color: PALETTE.gold, alpha: 0.16 });
    ctx.save();
    ctx.font = '300 40px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(246, 210, 138, 0.82)';
    ctx.fillText('A', antigenX, antigenY);
    ctx.restore();
    drawPulseRing(ctx, antigenX, antigenY, 42 + Math.sin(time * 1.4) * 6, 0.22, PALETTE.gold, 1);

    drawTCell(ctx, 492, 540, 34, time, palette.glow, 0.72);
    ctx.strokeStyle = 'rgba(246, 210, 138, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(antigenX + 18, antigenY - 16);
    ctx.quadraticCurveTo(460, 590, 492, 540);
    ctx.stroke();

    // The read: a pulse crosses from the antigen to the T cell.
    const read = (time * 0.55) % 1;
    drawGlow(ctx, {
      x: antigenX + (492 - antigenX) * read,
      y: antigenY - 20 + (540 - antigenY) * read,
      radius: 12,
      color: PALETTE.gold,
      alpha: 0.35,
    });
    drawShotEdge(frame, 0.25);
    return;
  }

  if (shot.id === 'w4') {
    // The first wound the body survived.
    const p = Math.min(1, shotLocal / 18);
    const cam = camera(360, 650, 1.05 + p * 0.18);
    withCamera(ctx, cam, () => drawScar(ctx, time, palette, 0.9));
    if (shotLocal < 2.8) {
      const u = shotLocal / 2.8;
      const ix = 210 + u * 300;
      const iy = 420 + u * 250;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(246, 210, 138, ${0.5 * (1 - u)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ix - 90, iy - 70);
      ctx.lineTo(ix, iy);
      ctx.stroke();
      drawGlow(ctx, { x: ix, y: iy, radius: 80 * (1 - u * 0.5), color: PALETTE.gold, alpha: 0.5 * (1 - u) });
      ctx.restore();
      void ix;
      void iy;
    }
    messenger(frame, 520, 870, 0.78, { alpha: 0.8 });
    drawPulseRing(ctx, 360, 690, 130 + Math.sin(time * 0.6) * 8, 0.06, PALETTE.gold, 1);
    drawShotEdge(frame, 0.4);
    return;
  }

  // w5 — the last ordinary day.
  const p = Math.min(1, shotLocal / 22);
  const cam = camera(360, 640 + p * 30, 1.12 - p * 0.14);
  withCamera(ctx, cam, () => drawLymphCathedral(ctx, {
    time,
    palette,
    lit: 1,
    emptiness: 0,
    focus: 0.8,
  }));
  drawTCells(ctx, time, 12, 1);
  drawRedCells(ctx, time, 10, 0.55);
  messenger(frame, 360, 700, 1.1, { alpha: 1 });
  const beat = Math.max(0, Math.sin(time * 1.15));
  drawGlow(ctx, { x: 360, y: 700, radius: 220, color: palette.glow, alpha: 0.05 + beat * 0.04 });
  drawShotEdge(frame, 0.45);
}

function dtBackground(ctx: CanvasRenderingContext2D, time: number, palette: SceneFrame['palette']): void {
  const g = ctx.createLinearGradient(0, 0, 0, 1280);
  g.addColorStop(0, palette.sky);
  g.addColorStop(0.5, palette.deep);
  g.addColorStop(1, palette.sky);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 720, 1280);
  drawGlow(ctx, { x: 420, y: 560, radius: 260, color: palette.accent, alpha: 0.08 });
  void time;
}

function drawAntibodies(
  ctx: CanvasRenderingContext2D,
  time: number,
  count: number,
): void {
  const rng = seeded('watch-antibodies');
  for (let i = 0; i < count; i++) {
    const x = 80 + rng() * 560;
    const y = mod(rng() * 1280 + time * (6 + rng() * 8), 1280);
    drawAntibody(ctx, x, y, 8 + rng() * 8, rng() * 6.28, 0.22 + rng() * 0.25, PALETTE.gold);
  }
}

function drawRedCells(
  ctx: CanvasRenderingContext2D,
  time: number,
  count: number,
  opacity: number,
): void {
  const rng = seeded('watch-red-cells');
  for (let i = 0; i < count; i++) {
    const x = 70 + rng() * 580;
    const y = mod(rng() * 1280 + time * (10 + rng() * 14), 1280);
    drawRedCell(ctx, {
      x,
      y,
      size: 8 + rng() * 8,
      angle: rng() * 6.28,
      alpha: opacity * (0.4 + rng() * 0.4),
      time,
      oxygen: 0.9,
    });
  }
}

function drawTCells(
  ctx: CanvasRenderingContext2D,
  time: number,
  count: number,
  opacity: number,
): void {
  const rng = seeded('watch-t-cells');
  for (let i = 0; i < count; i++) {
    const x = 80 + rng() * 560;
    const y = 260 + rng() * 620;
    const pulse = 0.7 + Math.sin(time * 0.9 + i * 1.8) * 0.3;
    drawTCell(ctx, x, y, 4.5 + rng() * 6, time + i, PALETTE.amber, opacity * pulse * 0.5);
  }
}
