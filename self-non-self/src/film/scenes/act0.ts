import { PALETTE } from '../palette';
import { drawCapillary, drawHeartland, drawLivingField, drawTitleBackdrop } from '../environments';
import { drawDendriticCell, drawGlow, drawPulseRing, heartRate } from '../cells';
import { camera, drawShotEdge, withCamera, type SceneFrame } from './common';

export function renderPrologue(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette, reducedMotion } = frame;

  if (shot.id === 'p1') {
    drawTitleBackdrop(ctx, time);
    const bpm = heartRate(time);
    const beat = (time * bpm) / 60;
    const local = beat - Math.floor(beat);
    const pulse = Math.max(0, 1 - local * 3.4);
    drawGlow(ctx, {
      x: 360,
      y: 720,
      radius: 90 + pulse * 120,
      color: PALETTE.arterial,
      alpha: 0.08 + pulse * 0.12,
    });
    drawPulseRing(ctx, 360, 720, 40 + pulse * 70, 0.16 + pulse * 0.18, PALETTE.amber, 1.4);
    drawPulseRing(ctx, 360, 720, 60 + pulse * 110, 0.05 + pulse * 0.08, PALETTE.rose, 1);
    if (!reducedMotion) {
      const drift = Math.sin(time * 0.25) * 4;
      ctx.save();
      ctx.translate(drift, 0);
      drawDendriticCell(ctx, {
        x: 360,
        y: 760,
        scale: 0.32,
        time,
        tint: PALETTE.rose,
        glow: PALETTE.amber,
        alpha: 0.14,
        showAntigens: false,
      });
      ctx.restore();
    }
    return;
  }

  if (shot.id === 'p2') {
    const p = Math.min(1, shotLocal / 18);
    const cam = camera(360, 660 + p * 20, 1.38 - p * 0.4);
    withCamera(ctx, cam, () => drawHeartland(ctx, time, palette));
    drawShotEdge(frame, 0.5);
    return;
  }

  if (shot.id === 'p3') {
    const p = Math.min(1, shotLocal / 15);
    const cam = camera(360, 560 + p * 220, 1.08 + p * 0.38);
    withCamera(ctx, cam, () => drawCapillary(ctx, {
      time,
      palette,
      flow: 1,
      oxygen: 0.95,
      cells: 10,
    }));
    ctx.save();
    ctx.globalAlpha = 0.2 + p * 0.8;
    drawDendriticCell(ctx, {
      x: 360,
      y: 760,
      scale: 0.5 + p * 0.35,
      time,
      tint: palette.accent,
      glow: palette.glow,
      alpha: 0.75,
    });
    ctx.restore();
    drawBokehForeground(frame);
    drawShotEdge(frame, 0.3);
    return;
  }

  // p4 — the title card, held over the first breath of the cell.
  drawLivingField(ctx, time, palette);
  const breathe = 1 + Math.sin(time * 0.55) * 0.02;
  ctx.save();
  ctx.translate(360, 700);
  ctx.scale(breathe, breathe);
  drawDendriticCell(ctx, {
    x: 0,
    y: 0,
    scale: 1.22,
    time,
    tint: PALETTE.rose,
    glow: PALETTE.gold,
    alpha: 0.9,
  });
  ctx.restore();

  drawPulseRing(ctx, 360, 700, 220 + Math.sin(time * 0.8) * 10, 0.06, PALETTE.amber, 1);
  drawGlow(ctx, { x: 360, y: 700, radius: 300, color: PALETTE.blood, alpha: 0.08 });
  drawShotEdge(frame, 0.2);
}

function drawBokehForeground(frame: SceneFrame): void {
  const { ctx, time, palette } = frame;
  drawGlow(ctx, { x: 180, y: 360, radius: 120, color: palette.glow, alpha: 0.05 });
  drawGlow(ctx, { x: 560, y: 980, radius: 160, color: palette.accent, alpha: 0.05 });
  void time;
}
