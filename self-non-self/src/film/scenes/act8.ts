import { PALETTE } from '../palette';
import { drawGalaxy, drawMemoryField } from '../environments';
import { drawBacterium, drawFragment, drawGlow, drawPulseRing } from '../cells';
import {
  camera,
  drawShotEdge,
  messenger,
  withCamera,
  type SceneFrame,
} from './common';
import { clamp, mod, seeded, smoothstep, TAU } from '../util';

export function renderApoptosis(frame: SceneFrame): void {
  const { ctx, shot, shotLocal, time, palette } = frame;

  if (shot.id === 'a1') {
    // The cell folds inward.
    const p = Math.min(1, shotLocal / 12);
    const cam = camera(360, 680, 1.1 + p * 0.25);
    withCamera(ctx, cam, () => drawMemoryField(ctx, time, palette));
    messenger(frame, 360, 700, 1.5, {
      alpha: 0.9,
      fold: smoothstep(0, 11, shotLocal) * 0.92,
      nucleusGlow: 1 - p * 0.4,
    });
    drawGlow(ctx, { x: 360, y: 700, radius: 220, color: PALETTE.gold, alpha: 0.06 + p * 0.06 });
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'a2') {
    // The release: everything kept, given back.
    const p = Math.min(1, shotLocal / 13);
    const cam = camera(360, 680, 1.35 - p * 0.2);
    withCamera(ctx, cam, () => drawMemoryField(ctx, time, palette));
    messenger(frame, 360, 700, 1.4, {
      alpha: Math.max(0.05, 0.85 - p * 0.8),
      fold: 0.95,
      showAntigens: false,
    });
    drawGalaxy(ctx, {
      x: 360,
      y: 700,
      radius: 80 + p * 210,
      time,
      reveal: 1,
      colorA: PALETTE.gold,
      colorB: PALETTE.teal,
      spin: 0.2,
    });

    const rng = seeded('apoptosis-fragments');
    for (let i = 0; i < 46; i++) {
      const a = rng() * TAU;
      const r = 40 + Math.sqrt(rng()) * (160 + p * 260);
      const x = 360 + Math.cos(a) * r;
      const y = 700 + Math.sin(a) * r * 0.82;
      drawFragment(
        ctx,
        x,
        y,
        2 + rng() * 5,
        a + time * 0.1,
        rng() > 0.5 ? PALETTE.gold : rng() > 0.5 ? PALETTE.teal : PALETTE.rose,
        0.35 + rng() * 0.4,
      );
    }

    // The residents gather at the edge of the light.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + time * 0.04;
      const r = 300 + Math.sin(i * 2.3) * 50;
      drawBacterium(ctx, {
        x: 360 + Math.cos(a) * r,
        y: 700 + Math.sin(a) * r * 0.8,
        angle: a,
        size: 3 + (i % 4),
        time: time + i,
        color: i % 3 === 0 ? PALETTE.teal : palette.accent,
        glow: i % 3 === 0 ? PALETTE.gold : palette.glow,
        alpha: 0.35 + (i % 3) * 0.12,
        granule: i % 5 === 0,
      });
    }
    drawShotEdge(frame, 0.3);
    return;
  }

  if (shot.id === 'a3') {
    // Three last heartbeats. The garden receives.
    const cam = camera(360, 680, 1.02);
    withCamera(ctx, cam, () => drawMemoryField(ctx, time, palette));
    const beats = [0.4, 4.2, 8.2];
    for (const beat of beats) {
      const age = shotLocal - beat;
      if (age >= 0 && age < 3.8) {
        const u = age / 3.8;
        drawPulseRing(ctx, 360, 700, 40 + u * 300, 0.28 * (1 - u), PALETTE.gold, 2);
        drawPulseRing(ctx, 360, 700, 40 + u * 380, 0.12 * (1 - u), PALETTE.rose, 1);
      }
    }
    drawGalaxy(ctx, {
      x: 360,
      y: 700,
      radius: 190 + Math.sin(time * 0.3) * 20,
      time,
      reveal: 0.8,
      colorA: PALETTE.gold,
      colorB: PALETTE.teal,
      spin: 0.05,
    });

    const rng = seeded('apoptosis-receive');
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + time * 0.03;
      const r = 240 + rng() * 90;
      drawBacterium(ctx, {
        x: 360 + Math.cos(a) * r,
        y: 700 + Math.sin(a) * r * 0.78,
        angle: a + Math.PI / 2,
        size: 3 + rng() * 5,
        time: time + i,
        color: i % 2 === 0 ? PALETTE.teal : palette.accent,
        glow: PALETTE.gold,
        alpha: 0.35 + rng() * 0.3,
        granule: i % 4 === 0,
      });
    }

    // One last filament of the messenger.
    drawGlow(ctx, { x: 360, y: 700, radius: 80, color: PALETTE.gold, alpha: 0.12 });
    drawShotEdge(frame, 0.5);
    return;
  }

  // a4 — the last line, in the dark.
  const p = Math.min(1, shotLocal / 13);
  ctx.fillStyle = '#050405';
  ctx.fillRect(0, 0, 720, 1280);
  drawGlow(ctx, { x: 360, y: 620, radius: 260 - p * 80, color: PALETTE.gold, alpha: 0.05 * (1 - p) });
  const rng = seeded('apoptosis-last-fragments');
  for (let i = 0; i < 14; i++) {
    const a = rng() * TAU;
    const r = 60 + rng() * 220;
    drawFragment(
      ctx,
      360 + Math.cos(a) * r,
      620 + Math.sin(a) * r * 0.8,
      1 + rng() * 3,
      a,
      i % 2 === 0 ? PALETTE.gold : PALETTE.teal,
      0.2 * (1 - p),
    );
  }
  drawShotEdge(frame, 0.4);
  void clamp;
  void mod;
}
