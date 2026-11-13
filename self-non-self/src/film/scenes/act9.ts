import { PALETTE } from '../palette';
import { drawGarden, drawWindow } from '../environments';
import { drawGlow } from '../cells';
import {
  camera,
  drawShotEdge,
  withCamera,
  type SceneFrame,
} from './common';
import { drawSpacedText, rgba, smoothstep, TAU } from '../util';

export function renderGarden(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette } = frame;

  if (shot.id === 'z1') {
    const p = Math.min(1, shotLocal / 11);
    const cam = camera(360, 660, 1.02 + p * 0.1);
    withCamera(ctx, cam, () => drawGarden(ctx, time, palette));
    drawGlow(ctx, { x: 360, y: 660, radius: 280, color: PALETTE.gold, alpha: 0.06 });
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'z2') {
    const p = Math.min(1, shotLocal / 9);
    const cam = camera(360, 620, 1 + p * 0.08);
    withCamera(ctx, cam, () => drawWindow(ctx, time));
    // A last green-gold breath on the glass, from the inside.
    drawGlow(ctx, {
      x: 360,
      y: 540,
      radius: 130,
      color: PALETTE.verdigris,
      alpha: 0.05 + p * 0.03,
    });
    drawShotEdge(frame, 0.5);
    return;
  }

  // z3 — the title, and the slash becoming a comma.
  drawFinalTitle(ctx, time);
}

function drawFinalTitle(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = '#050405';
  ctx.fillRect(0, 0, 720, 1280);

  const breathe = 0.5 + Math.sin(time * 0.7) * 0.5;
  drawGlow(ctx, {
    x: 360,
    y: 600,
    radius: 260,
    color: PALETTE.verdigris,
    alpha: 0.03 + breathe * 0.02,
  });

  const appear = smoothstep(772, 773.6, time);
  const morph = smoothstep(774.2, 776.4, time);

  ctx.save();
  ctx.globalAlpha = appear;

  ctx.font = '300 52px "Cormorant Garamond", Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(PALETTE.bone, 0.92);
  drawSpacedText(ctx, 'SELF', 360, 536, 15, 'center');

  // The slash — a border. It becomes a comma — a breath.
  const cx = 360;
  const cy = 600;
  ctx.save();
  ctx.lineCap = 'round';
  if (morph < 1) {
    ctx.strokeStyle = rgba(PALETTE.gold, 0.82 * (1 - morph));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 22);
    ctx.lineTo(cx + 7, cy + 22);
    ctx.stroke();
  }
  if (morph > 0) {
    ctx.strokeStyle = rgba(PALETTE.gold, 0.82 * morph);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 22);
    ctx.quadraticCurveTo(cx + 10, cy + 2, cx + 1, cy + 19);
    ctx.quadraticCurveTo(cx - 6, cy + 32, cx + 17, cy + 36);
    ctx.stroke();
    ctx.fillStyle = rgba(PALETTE.gold, 0.82 * morph);
    ctx.beginPath();
    ctx.arc(cx + 18, cy + 39, 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = rgba(PALETTE.bone, 0.92);
  ctx.font = '300 52px "Cormorant Garamond", Georgia, serif';
  drawSpacedText(ctx, 'NON-SELF', 360, 672, 15, 'center');

  ctx.font = '400 10px "Inter", sans-serif';
  ctx.fillStyle = rgba(PALETTE.bone, 0.42);
  drawSpacedText(ctx, 'A REQUIEM FOR THE BODY’S LAST WITNESS', 360, 734, 3.4, 'center');

  ctx.restore();
}
