import { PALETTE } from '../palette';
import {
  drawEmptyCity,
  drawGalaxy,
  drawLung,
  drawLymphCathedral,
  drawMemoryField,
  drawScar,
} from '../environments';
import { drawGlow, drawPulseRing } from '../cells';
import {
  camera,
  drawShotEdge,
  drift,
  messenger,
  withCamera,
  type SceneFrame,
} from './common';
import { seeded, smoothstep } from '../util';

export function renderEmpty(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette } = frame;

  if (shot.id === 'e1') {
    const darkness = 0.15 + smoothstep(0, 15, shotLocal) * 0.8;
    const cam = camera(360, 640, 1.2 - shotLocal * 0.012);
    withCamera(ctx, cam, () => drawEmptyCity(ctx, { time, palette, darkness }));
    messenger(frame, 360, 720, 0.75, { alpha: 0.5, nucleusGlow: 0.4 });
    drawShotEdge(frame, 0.4);
    return;
  }

  if (shot.id === 'e2') {
    const p = Math.min(1, shotLocal / 18);
    const cam = camera(360, 650, 1.08 + p * 0.16);
    withCamera(ctx, cam, () => drawScar(ctx, time, palette, 0.55));
    messenger(frame, 520, 850, 0.82, { alpha: 0.72 });
    drawPulseRing(ctx, 360, 690, 120 + Math.sin(time * 0.5) * 10, 0.06, PALETTE.gold, 1);
    // The scar remembers a hand.
    drawGlow(ctx, { x: 360, y: 690, radius: 60, color: PALETTE.gold, alpha: 0.08 });
    drawShotEdge(frame, 0.35);
    return;
  }

  if (shot.id === 'e3') {
    const p = Math.min(1, shotLocal / 18);
    const cam = camera(360, 640, 1.02 + p * 0.12);
    withCamera(ctx, cam, () => drawLung(ctx, {
      time,
      palette,
      breath: 0.8 - p * 0.7,
      dust: 22,
      warm: 0.55,
    }));
    messenger(frame, 500, 840, 0.8, { alpha: 0.65 });
    // The last breath: a slow ring of dust.
    const u = (shotLocal / 18) % 1;
    drawPulseRing(ctx, 360, 640, 80 + u * 260, 0.1 * (1 - u), PALETTE.bone, 1);
    drawShotEdge(frame, 0.4);
    return;
  }

  if (shot.id === 'e4') {
    const p = Math.min(1, shotLocal / 18);
    const cam = camera(360, 660, 1.05 + p * 0.15);
    withCamera(ctx, cam, () => drawLymphCathedral(ctx, {
      time,
      palette,
      lit: 0.02,
      emptiness: 1,
      focus: 0,
    }));
    messenger(frame, 360, 760, 0.8, { alpha: 0.45, nucleusGlow: 0.3 });
    // One lantern, still warm.
    const flicker = 0.5 + Math.sin(time * 1.7) * 0.5;
    drawGlow(ctx, { x: 500, y: 360, radius: 26, color: PALETTE.gold, alpha: 0.08 * flicker });
    ctx.strokeStyle = `rgba(232, 180, 106, ${0.12 * flicker})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(500, 360, 7, 0, Math.PI * 2);
    ctx.stroke();
    drawShotEdge(frame, 0.5);
    return;
  }

  // e5 — the galaxy inside the cell.
  const p = Math.min(1, shotLocal / 20);
  const cam = camera(360, 660, 1.05 + p * 0.22);
  withCamera(ctx, cam, () => drawMemoryField(ctx, time, palette));
  messenger(frame, 360, 700, 1.55, { alpha: 0.9, showAntigens: false });
  drawGalaxy(ctx, {
    x: 360,
    y: 700,
    radius: 58 + p * 34,
    time,
    reveal: 0.35 + p * 0.65,
    colorA: PALETTE.gold,
    colorB: PALETTE.teal,
    spin: 0.12,
  });

  const rng = seeded('empty-galaxy-orbit');
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + time * 0.04;
    const r = 110 + rng() * 70;
    const x = 360 + Math.cos(a) * r;
    const y = 700 + Math.sin(a) * r * 0.75;
    drawGlow(ctx, {
      x,
      y,
      radius: 4 + rng() * 8,
      color: i % 3 === 0 ? PALETTE.gold : i % 3 === 1 ? PALETTE.teal : PALETTE.rose,
      alpha: 0.12 + rng() * 0.12,
    });
  }
  drawShotEdge(frame, 0.3);
  void drift;
}
