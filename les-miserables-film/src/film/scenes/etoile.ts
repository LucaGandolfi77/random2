import { H, W } from '../timeline';
import {
  citySkyline,
  glow,
  goldThread,
  hatch,
  paper,
  star,
  stars,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import { drawFigure, drawProfile } from '../figures';
import type { SceneContext } from './common';
import { bridge, finish, moon, sky, waterSurface } from './common';

function bridgeWide(ctx: CanvasRenderingContext2D, t: number, empty = false): void {
  bridge(ctx, 790, '#070a0e', 1010, t, 4);
  // extra stars above the bridge
  stars(ctx, t, 80, 500, 0.75);
  moon(ctx, 130, 250, 34, '#e5e0c7', 0.55);
  // bridge parapet edge
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,12,0.9)';
  ctx.fillRect(0, 730, W, 62);
  ctx.strokeStyle = 'rgba(190,200,195,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 736, W, 48);
  ctx.restore();
  if (!empty) {
    // Javert, hat in hand
    drawFigure(ctx, {
      x: 375,
      y: 800,
      h: 440,
      t,
      pose: 'stand',
      facing: 1,
      color: '#030405',
      rim: '#a6bcc7',
      kind: 'soldier',
      hat: 'none',
      hair: 'short',
      coat: true,
    });
    // hat held at his side
    ctx.save();
    ctx.fillStyle = '#040506';
    ctx.beginPath();
    ctx.ellipse(470, 720, 36, 9, -0.12, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(446, 718);
    ctx.quadraticCurveTo(466, 688, 500, 714);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    glow(ctx, 420, 760, 140, '#9db8c4', 0.03);
  }
  // river shimmer
  waterSurface(ctx, 1010, t, '#9fb7c3');
  paper(ctx, t, 0.48, 1);
}

function closeJavert(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#03060b'],
    [0.45, '#07101b'],
    [1, '#020305'],
  ]);
  stars(ctx, t, 120, 700, 0.85);
  // one great star
  const sx = 565;
  const sy = 430;
  glow(ctx, sx, sy, 110, '#f0e3b5', 0.17);
  star(ctx, sx, sy, 60, '#f3e8c2', 0.6);
  // law / bars, dissolving
  const fade = smooth((t - 20) / 18);
  ctx.save();
  ctx.globalAlpha = 0.23 * (1 - fade * 0.7);
  ctx.strokeStyle = '#c6d0d2';
  ctx.lineWidth = 9;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(70 + i * 118, 0);
    ctx.lineTo(70 + i * 118, H);
    ctx.stroke();
  }
  ctx.restore();
  // his profile, large
  drawProfile(ctx, 300, 1080, 820, 1, t, {
    color: '#020304',
    hair: '#1e272b',
    eye: '#d8c9a0',
    hairLong: false,
    rim: '#9db8c7',
  });
  // a single tear? no — a reflection of the star in his eye
  glow(ctx, 430, 800, 60, '#efe3b9', 0.06);
  // coat shoulder
  ctx.save();
  ctx.fillStyle = '#020304';
  ctx.beginPath();
  ctx.ellipse(180, 1210, 300, 90, -0.08, 0, TAU);
  ctx.fill();
  ctx.restore();
  paper(ctx, t, 0.5, 1);
}

function emptyBridge(ctx: CanvasRenderingContext2D, t: number): void {
  bridgeWide(ctx, t, true);
  // hat and notebook on the parapet
  ctx.save();
  ctx.fillStyle = '#030405';
  ctx.beginPath();
  ctx.ellipse(390, 724, 44, 11, -0.06, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(360, 722);
  ctx.quadraticCurveTo(385, 686, 420, 720);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(490, 720);
  ctx.rotate(-0.08);
  ctx.fillStyle = 'rgba(206,197,170,0.55)';
  ctx.fillRect(-26, -32, 52, 64);
  ctx.strokeStyle = 'rgba(30,25,18,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-26, -32, 52, 64);
  ctx.fillStyle = 'rgba(30,25,18,0.5)';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(-18, -20 + i * 10, 36, 1);
  }
  ctx.restore();
  glow(ctx, 440, 720, 130, '#d9ad5b', 0.05);
  // a long, low fog over the river
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const fog = ctx.createLinearGradient(0, 900, 0, 1050);
  fog.addColorStop(0, 'rgba(150,175,185,0)');
  fog.addColorStop(0.5, 'rgba(150,175,185,0.06)');
  fog.addColorStop(1, 'rgba(150,175,185,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 900, W, 150);
  ctx.restore();
}

function river(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#040810'],
    [0.35, '#07121d'],
    [0.52, '#0a1520'],
    [1, '#020406'],
  ]);
  stars(ctx, t, 90, 600, 0.85);
  moon(ctx, W * 0.22, 190, 38, '#e6e1c8', 0.7);
  // far skyline
  citySkyline(ctx, 700, '#070c12', 31, { minH: 60, maxH: 190, windows: true, windowColor: '#b8823e', alpha: 0.5 });
  // water
  const wg = ctx.createLinearGradient(0, 700, 0, H);
  wg.addColorStop(0, '#0a141d');
  wg.addColorStop(0.4, '#08121a');
  wg.addColorStop(1, '#020609');
  ctx.fillStyle = wg;
  ctx.fillRect(0, 700, W, H - 700);
  // star reflection
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 22; i++) {
    const y = 780 + i * 22;
    const w = 60 - i * 1.3;
    ctx.globalAlpha = 0.14 - i * 0.004;
    ctx.strokeStyle = '#e9dfb8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - w / 2 + Math.sin(t * 0.3 + i) * 4, y);
    ctx.lineTo(W / 2 + w / 2 + Math.sin(t * 0.3 + i) * 4, y);
    ctx.stroke();
  }
  ctx.restore();
  // ripples
  ctx.save();
  ctx.strokeStyle = 'rgba(175,195,195,0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const r = 34 + i * 26 + ((t * 20) % 26);
    ctx.globalAlpha = Math.max(0, 0.16 - i * 0.018);
    ctx.beginPath();
    ctx.ellipse(360, 960, r * 2.4, r * 0.36, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // floating hat
  ctx.save();
  ctx.fillStyle = '#020304';
  ctx.beginPath();
  ctx.ellipse(360, 930, 50, 11, 0.03, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(326, 928);
  ctx.quadraticCurveTo(355, 884, 392, 926);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // gold thread rises from the water to the stars
  const reveal = clamp((t - 67) / 9);
  if (reveal > 0) {
    goldThread(
      ctx,
      [
        [360, 930],
        [390, 800],
        [330, 640],
        [430, 470],
        [510, 310],
        [560, 180],
      ],
      reveal,
      t,
      '#e8c57c',
      2.2,
    );
  }
  // final light
  glow(ctx, 560, 180, 220, '#f0e3b5', 0.14 * reveal);
  paper(ctx, t, 0.5, 1);
}

export function etoile(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 20) {
    bridgeWide(ctx, t);
  } else if (t < 40) {
    closeJavert(ctx, t);
  } else if (t < 58) {
    emptyBridge(ctx, t);
  } else {
    river(ctx, t);
  }
  finish(ctx, t, s.quality, 0.55);
}
