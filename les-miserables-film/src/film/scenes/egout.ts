import { H, W } from '../timeline';
import {
  archPath,
  citySkyline,
  flame,
  glow,
  goldThread,
  hatch,
  lantern,
  paper,
  rain,
  stars,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import { drawCarryingPair, drawFigure } from '../figures';
import type { SceneContext } from './common';
import { bridge, finish, moon, sewerTunnel, sky, waterSurface } from './common';

function entrance(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#0a0d10'],
    [0.42, '#141a1c'],
    [0.68, '#1f2724'],
    [1, '#050807'],
  ]);
  stars(ctx, t, 30, 300, 0.25);
  citySkyline(ctx, 700, '#0b0e10', 5, { minH: 100, maxH: 230, windows: true, windowColor: '#c88f48', alpha: 0.55 });
  // quay wall and sewer mouth
  ctx.fillStyle = '#0a0d0b';
  ctx.fillRect(0, 670, W, H - 670);
  ctx.strokeStyle = 'rgba(150,160,140,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 700 + i * 80);
    ctx.lineTo(W, 700 + i * 80);
    ctx.stroke();
  }
  archPath(ctx, W / 2, 1000, 360, 500);
  ctx.fillStyle = '#020302';
  ctx.fill();
  ctx.strokeStyle = 'rgba(130,145,125,0.2)';
  ctx.lineWidth = 10;
  ctx.stroke();
  // grate
  ctx.save();
  ctx.strokeStyle = 'rgba(88,98,82,0.65)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(300 + i * 24, 700);
    ctx.lineTo(300 + i * 24, 1000);
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, 400, 870, 180, '#d9a354', 0.13);
  // Valjean carrying Marius
  drawCarryingPair(ctx, 390, 1240, 560, t, {
    color: '#050403',
    rim: '#d8ae62',
    hat: 'cap',
  });
  // torch
  ctx.save();
  ctx.strokeStyle = '#0a0705';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(510, 1150);
  ctx.lineTo(560, 940);
  ctx.stroke();
  flame(ctx, 560, 930, 16, t, 3, '#ffb45c');
  ctx.restore();
  rain(ctx, t * 0.6, 40, 0.16, 0.14, '#b9c5c7', 700);
  paper(ctx, t, 0.5, 1);
}

function tunnel(ctx: CanvasRenderingContext2D, t: number, warm = true): void {
  sewerTunnel(ctx, t, W / 2, 700, 400);
  // torch
  glow(ctx, 490, 760, 300, '#f0b861', warm ? 0.26 : 0.06);
  ctx.save();
  ctx.fillStyle = '#ffd28a';
  ctx.beginPath();
  ctx.ellipse(500, 790, 9, 26, 0.08, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Valjean walking, seen in profile
  drawCarryingPair(ctx, 330, 1110, 430, t, {
    color: '#040403',
    rim: '#d0aa64',
    hat: 'cap',
  });
  // lantern/torch in his hand
  ctx.save();
  ctx.strokeStyle = '#0b0805';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(450, 930);
  ctx.lineTo(500, 800);
  ctx.stroke();
  ctx.restore();
  glow(ctx, 500, 790, 100, '#ffbc63', 0.24);
  // water at his feet
  waterSurface(ctx, 1030, t, '#b8c9b7');
  // drips and mist
  for (let i = 0; i < 16; i++) {
    const x = hash(i * 4.7) * W;
    const y = (t * (40 + hash(i) * 60) + hash(i * 2.3) * H) % 980;
    ctx.strokeStyle = `rgba(150,170,150,${0.08 + hash(i) * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 10 + hash(i * 3.1) * 20);
    ctx.stroke();
  }
  paper(ctx, t, 0.52, 1);
}

function theft(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#050806'],
    [0.55, '#0d140e'],
    [1, '#030504'],
  ]);
  // tunnel arches, receding into the dark
  for (let i = 2; i >= 0; i--) {
    const scale = 1 - i * 0.16;
    archPath(ctx, 340 + i * 100, 1240, 620 * scale, 880 * scale);
    ctx.strokeStyle = `rgba(132,154,126,${0.13 + i * 0.04})`;
    ctx.lineWidth = 12 * scale;
    ctx.stroke();
  }
  // light beyond, and a pool of water
  archPath(ctx, 620, 1000, 300, 500);
  ctx.fillStyle = '#070b08';
  ctx.fill();
  ctx.strokeStyle = 'rgba(132,154,126,0.24)';
  ctx.lineWidth = 10;
  ctx.stroke();
  glow(ctx, 620, 840, 320, '#c9bc85', 0.2);
  waterSurface(ctx, 1110, t, '#a8b89a');
  // torch left
  glow(ctx, 150, 760, 330, '#e8ad5a', 0.26);
  ctx.save();
  ctx.strokeStyle = '#0c0805';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(120, 1120);
  ctx.lineTo(155, 820);
  ctx.stroke();
  flame(ctx, 155, 815, 15, t, 4, '#ffca79');
  glow(ctx, 155, 805, 110, '#ffd28a', 0.34);
  ctx.restore();
  glow(ctx, 520, 930, 260, '#d9b56d', 0.08);
  // Valjean ahead, carrying Marius, unaware
  drawCarryingPair(ctx, 450, 1080, 400, t, {
    color: '#030302',
    rim: '#e0b96d',
    hat: 'cap',
  });
  // Thénardier, crouched behind
  drawFigure(ctx, {
    x: 300,
    y: 1040,
    h: 340,
    t,
    pose: 'reach',
    facing: 1,
    color: '#020302',
    rim: '#d0a662',
    kind: 'man',
    hat: 'cap',
    coat: true,
    alpha: 0.95,
  });
  // stolen ring / purse glint
  const a = smooth((t - 46) / 2);
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#d9ad5b';
    ctx.beginPath();
    ctx.arc(430, 890, 8, 0, TAU);
    ctx.fill();
    glow(ctx, 430, 890, 60, '#e7bb68', 0.24);
    ctx.restore();
  }
  // drips
  ctx.strokeStyle = 'rgba(145,165,145,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const x = hash(i * 3.7) * W;
    const y = (t * 50 + hash(i * 2.3) * H) % 1000;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 18);
    ctx.stroke();
  }
  paper(ctx, t, 0.55, 1);
}

function reflection(ctx: CanvasRenderingContext2D, t: number): void {
  sewerTunnel(ctx, t, 500, 720, 420);
  // golden light at the end of the tunnel
  glow(ctx, 420, 700, 300, '#e2c07a', 0.14);
  // tiny Valjean in the distance
  drawCarryingPair(ctx, 400, 1015, 230, t, {
    color: '#030403',
    rim: '#d9b66c',
    hat: 'cap',
  });
  // reflection of the thread in the water
  const reveal = clamp((t - 59) / 6);
  if (reveal > 0) {
    const pts: Array<[number, number]> = [
      [70, 1120],
      [210, 1090],
      [350, 1060],
      [470, 1020],
      [620, 970],
    ];
    goldThread(ctx, pts, reveal, t, '#d9b56d', 1.8);
    goldThread(
      ctx,
      pts.map(([x, y]) => [x, y + 40] as [number, number]),
      reveal * 0.9,
      t,
      '#8f7a4e',
      1.2,
    );
  }
  glow(ctx, 420, 700, 180, '#e2c07a', 0.08);
  waterSurface(ctx, 1060, t, '#c7c2a1');
  paper(ctx, t, 0.52, 1);
}

function exit(ctx: CanvasRenderingContext2D, t: number): void {
  bridge(ctx, 770, '#080c10', 940, t, 7);
  // bank
  ctx.fillStyle = '#080a08';
  ctx.fillRect(0, 1010, W, H - 1010);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#a7b3a0';
  ctx.beginPath();
  ctx.ellipse(320, 1080, 280, 30, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Valjean emerges
  drawCarryingPair(ctx, 310, 1130, 420, t, {
    color: '#040403',
    rim: '#d3ac64',
    hat: 'cap',
  });
  // Javert
  drawFigure(ctx, {
    x: 570,
    y: 1100,
    h: 400,
    t: t + 2,
    pose: 'stand',
    facing: -1,
    color: '#030405',
    rim: '#9eb4be',
    kind: 'soldier',
    hat: 'bicorne',
    coat: true,
  });
  lantern(ctx, 500, 900, 30, t, 3, '#e8b25f');
  glow(ctx, 500, 900, 190, '#e3ab5c', 0.12);
  // thread on the wet stones
  const reveal = clamp((t - 80) / 6);
  if (reveal > 0) {
    goldThread(ctx, [[100, 1120], [250, 1080], [400, 1040], [620, 980]], reveal, t, '#d9b56d', 1.5);
  }
  // rain above, river below
  rain(ctx, t, 50, 0.15, 0.12, '#aabec2', 650);
  waterSurface(ctx, 1000, t, '#8ba1a4');
  paper(ctx, t, 0.5, 1);
}

export function egout(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 18) {
    entrance(ctx, t);
  } else if (t < 38) {
    tunnel(ctx, t);
  } else if (t < 55) {
    theft(ctx, t);
  } else if (t < 72) {
    reflection(ctx, t);
  } else {
    exit(ctx, t);
  }
  finish(ctx, t, s.quality, 0.55);
}
