import { H, W } from '../timeline';
import {
  candlestick,
  citySkyline,
  glow,
  goldThread,
  paper,
  stars,
} from '../art';
import { TAU, clamp, smooth } from '../util';
import { drawEndTitle } from '../text';
import type { SceneContext } from './common';
import { finish, hills, sky, sun } from './common';

function dawn(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#1b1b22'],
    [0.28, '#4a3d3a'],
    [0.52, '#a67d59'],
    [0.63, '#e0b174'],
    [0.72, '#f0d5a2'],
    [0.8, '#7f7663'],
    [1, '#201c17'],
  ]);
  stars(ctx, t * 0.4, 35, 380, 0.35);
  sun(ctx, W * 0.56, 690, 64, '#f2c98a', 0.85);
  citySkyline(ctx, 820, '#3a352e', 55, { minH: 100, maxH: 260, windows: true, windowColor: '#e5b56d', chimneys: true, alpha: 0.75 });
  citySkyline(ctx, 920, '#27241f', 59, { minH: 80, maxH: 210, windows: true, windowColor: '#d9a354', alpha: 0.8 });
  hills(ctx, 980, '#242220', 61, 0.8);
  // window sill
  ctx.save();
  const sill = ctx.createLinearGradient(0, 980, 0, H);
  sill.addColorStop(0, '#191410');
  sill.addColorStop(1, '#080605');
  ctx.fillStyle = sill;
  ctx.fillRect(0, 980, W, H - 980);
  ctx.fillStyle = 'rgba(217,173,91,0.12)';
  ctx.fillRect(0, 980, W, 2);
  ctx.restore();
  // two candlesticks, the bishop's
  candlestick(ctx, 285, 1120, 300, t, 21, true);
  candlestick(ctx, 445, 1130, 320, t, 27, true);
  glow(ctx, 365, 800, 380, '#e8bd6d', 0.16);
  // golden thread rising from the two flames
  const reveal = clamp((t - 12) / 15);
  if (reveal > 0) {
    goldThread(
      ctx,
      [
        [300, 760],
        [350, 640],
        [320, 480],
        [420, 330],
        [530, 190],
        [640, 80],
      ],
      reveal,
      t,
      '#f0cc80',
      2.4,
    );
  }
  // soft embers
  for (let i = 0; i < 24; i++) {
    const x = 260 + Math.sin(t * 0.4 + i) * 220;
    const y = 1100 - ((t * 18 + i * 47) % 900);
    ctx.fillStyle = `rgba(232,189,109,${0.08 + (i % 5) * 0.02})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, TAU);
    ctx.fill();
  }
  paper(ctx, t, 0.55, 1);
}

function finalTitle(ctx: CanvasRenderingContext2D, t: number, local: number): void {
  sky(ctx, [
    [0, '#050403'],
    [1, '#020201'],
  ]);
  // a last warm circle, barely visible
  glow(ctx, W / 2, 600, 300, '#d9ad5b', 0.05 * smooth((local - 28) / 3));
  drawEndTitle(ctx, t, local);
}

export function epilogue(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 29) {
    dawn(ctx, t);
    // slow fade to the final card
    const fade = smooth((t - 26) / 3);
    if (fade > 0) {
      ctx.fillStyle = `rgba(4,3,2,${fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    finalTitle(ctx, t, t);
  }
  finish(ctx, t, s.quality, 0.35);
}
