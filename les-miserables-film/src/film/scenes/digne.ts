import { H, W } from '../timeline';
import {
  candlestick,
  glow,
  goldThread,
  hatch,
  inkLine,
  paper,
  snow,
  stars,
  tree,
  windowLight,
} from '../art';
import { TAU, clamp, rgba, smooth } from '../util';
import { drawFigure, drawLyingFigure } from '../figures';
import type { SceneContext } from './common';
import {
  bed,
  finish,
  hills,
  house,
  interior,
  mountains,
  sky,
  snowyGround,
  sun,
  table,
} from './common';

function exteriorNight(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#07111a'],
    [0.4, '#12212a'],
    [0.66, '#29373d'],
    [0.78, '#d8d6c8'],
    [1, '#1b2428'],
  ]);
  stars(ctx, t, 35, 420, 0.35);
  hills(ctx, 830, '#172329', 4, 0.9);
  mountains(ctx, 820, '#101a20', 2, 180, 0.85);
  house(ctx, W * 0.58, 940, 300, 250, '#171717', '#0c0b0a', t, { warm: true, seed: 7 });
  // path
  snowyGround(ctx, 950, '#c9d4d8', '#73838c', 9);
  // stone wall / fence
  ctx.save();
  ctx.strokeStyle = 'rgba(12,10,8,0.8)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 8; i++) {
    const x = 30 + i * 38;
    ctx.beginPath();
    ctx.moveTo(x, 970);
    ctx.lineTo(x, 900 - (i % 3) * 8);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(20, 920);
  ctx.lineTo(330, 910);
  ctx.stroke();
  ctx.restore();
  const approach = smooth(t / 12);
  drawFigure(ctx, {
    x: 170 + approach * 170,
    y: 962 + approach * 18,
    h: 205,
    t,
    pose: 'walk',
    facing: 1,
    color: '#080706',
    rim: '#d4a65a',
    kind: 'man',
    hat: 'cap',
  });
  snow(ctx, t, 100, 0.48);
  paper(ctx, t, 0.45, 1);
}

function supper(ctx: CanvasRenderingContext2D, t: number): void {
  interior(ctx, {
    wallTop: '#2d2116',
    wallBottom: '#18110c',
    floor: '#110c08',
    beam: '#4b3722',
  }, t, { window: true, windowX: W * 0.78, seed: 4 });
  // fireplace glow at left
  ctx.save();
  ctx.fillStyle = '#0d0906';
  ctx.fillRect(20, 600, 150, 380);
  ctx.fillStyle = 'rgba(200,110,42,0.35)';
  ctx.fillRect(45, 780, 100, 110);
  glow(ctx, 95, 830, 280, '#d97e35', 0.16);
  ctx.restore();

  table(ctx, W / 2, 930, 520, 220, '#2a1b10', 'rgba(198,177,143,0.22)');
  // plates, bread, cup
  ctx.save();
  ctx.fillStyle = '#b7ab90';
  ctx.beginPath();
  ctx.ellipse(260, 896, 34, 8, 0, 0, TAU);
  ctx.ellipse(470, 896, 30, 7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#6d4a29';
  ctx.beginPath();
  ctx.ellipse(365, 886, 34, 20, 0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8e3f2b';
  ctx.fillRect(492, 864, 16, 30);
  ctx.strokeStyle = 'rgba(220,210,190,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(500, 915, 8, 0, TAU);
  ctx.stroke();
  ctx.restore();

  candlestick(ctx, 330, 894, 140, t, 2, true);
  candlestick(ctx, 405, 894, 140, t, 5, true);
  glow(ctx, 367, 790, 260, '#e6a952', 0.14);

  drawFigure(ctx, {
    x: 240,
    y: 1130,
    h: 335,
    t,
    pose: 'stand',
    facing: 1,
    color: '#0a0806',
    rim: '#d9ad5b',
    kind: 'man',
    hair: 'short',
    hat: 'none',
    coat: true,
  });
  drawFigure(ctx, {
    x: 466,
    y: 1130,
    h: 330,
    t: t + 2,
    pose: 'stand',
    facing: -1,
    color: '#0a0806',
    rim: '#e0bd7a',
    kind: 'priest',
    hair: 'bald',
    hat: 'none',
    skirt: true,
    coat: false,
  });
  // bishop's white hair
  ctx.save();
  ctx.fillStyle = 'rgba(214,207,188,0.5)';
  ctx.beginPath();
  ctx.arc(459, 842, 18, 0, TAU);
  ctx.fill();
  ctx.restore();
  snow(ctx, t * 0.2, 12, 0.08);
  paper(ctx, t, 0.45, 1);
}

function theft(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#0b0a09'],
    [0.55, '#15110d'],
    [1, '#070605'],
  ]);
  // window with moon
  windowLight(ctx, 70, 230, 145, 260, t, '#9fb5c6', 12);
  // bed at right
  bed(ctx, 545, 1000, 390, 260, '#1b120b', 'rgba(206,199,180,0.5)');
  drawLyingFigure(ctx, 520, 824, 380, '#0b0907', 0.9, 1);
  // blanket
  ctx.save();
  ctx.fillStyle = 'rgba(188,181,161,0.4)';
  ctx.beginPath();
  ctx.ellipse(565, 835, 125, 38, -0.02, 0, TAU);
  ctx.fill();
  ctx.restore();
  // table with silver
  table(ctx, 210, 930, 280, 190, '#1b130c', 'rgba(190,175,146,0.16)');
  candlestick(ctx, 175, 900, 130, t, 3, true);
  glow(ctx, 260, 800, 330, '#d9a354', 0.13);
  // silver plates glint
  ctx.save();
  ctx.fillStyle = 'rgba(222,213,186,0.6)';
  ctx.beginPath();
  ctx.ellipse(275, 900, 44, 8, -0.05, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(315, 884, 24, 5, 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Valjean reaching
  drawFigure(ctx, {
    x: 270,
    y: 1080,
    h: 350,
    t,
    pose: 'reach',
    facing: -1,
    color: '#050403',
    rim: '#b98845',
    kind: 'man',
    hat: 'cap',
    coat: true,
  });
  // giant shadow on the wall
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(330, 1080);
  ctx.quadraticCurveTo(330, 720, 420, 560);
  ctx.quadraticCurveTo(500, 680, 520, 1080);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // moonlight shafts
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const shaft = ctx.createLinearGradient(100, 250, 430, 1030);
  shaft.addColorStop(0, 'rgba(154,184,198,0.08)');
  shaft.addColorStop(1, 'rgba(154,184,198,0)');
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(90, 240);
  ctx.lineTo(220, 240);
  ctx.lineTo(430, 1030);
  ctx.lineTo(170, 1030);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  paper(ctx, t, 0.55, 1);
}

function returnScene(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#081019'],
    [0.55, '#15212a'],
    [0.75, '#cfd4cc'],
    [1, '#1b252a'],
  ]);
  hills(ctx, 850, '#172329', 4, 0.95);
  house(ctx, W * 0.55, 950, 320, 265, '#171513', '#0b0a09', t, { warm: true, seed: 7 });
  ctx.save();
  // warm doorway
  const dg = ctx.createLinearGradient(0, 700, 0, 960);
  dg.addColorStop(0, 'rgba(232,167,77,0.06)');
  dg.addColorStop(1, 'rgba(232,167,77,0.3)');
  ctx.fillStyle = dg;
  ctx.fillRect(W * 0.55 - 82, 700, 164, 260);
  glow(ctx, W * 0.55, 860, 310, '#e2a656', 0.19);
  ctx.restore();
  // bishop in the door
  drawFigure(ctx, {
    x: W * 0.55 + 8,
    y: 960,
    h: 300,
    t: t + 1,
    pose: 'reach',
    facing: 1,
    color: '#070605',
    rim: '#f0cc84',
    kind: 'priest',
    hair: 'bald',
    hat: 'none',
    skirt: true,
    coat: false,
  });
  candlestick(ctx, W * 0.55 + 54, 935, 145, t, 8, true);
  // gendarmes with Valjean
  drawFigure(ctx, {
    x: 170,
    y: 988,
    h: 300,
    t,
    pose: 'stand',
    facing: 1,
    color: '#070605',
    rim: '#c8d1d2',
    kind: 'soldier',
    hat: 'bicorne',
    coat: true,
  });
  drawFigure(ctx, {
    x: 260,
    y: 992,
    h: 290,
    t,
    pose: 'stand',
    facing: -1,
    color: '#070605',
    rim: '#c8d1d2',
    kind: 'soldier',
    hat: 'bicorne',
    coat: true,
  });
  drawFigure(ctx, {
    x: 340,
    y: 990,
    h: 285,
    t,
    pose: 'stand',
    facing: 1,
    color: '#050403',
    rim: '#d9ad5b',
    kind: 'man',
    hat: 'cap',
    coat: true,
  });
  snow(ctx, t, 95, 0.45);
  paper(ctx, t, 0.45, 1);
}

function forgiveness(ctx: CanvasRenderingContext2D, t: number): void {
  interior(ctx, {
    wallTop: '#1c1510',
    wallBottom: '#0d0907',
    floor: '#0b0806',
    beam: '#342619',
  }, t, { window: true, windowX: 90, seed: 9 });
  glow(ctx, 360, 860, 560, '#d9a354', 0.12);
  // large candlestick between them
  candlestick(ctx, 372, 1170, 330, t, 11, true);
  glow(ctx, 372, 800, 300, '#ffcf82', 0.11);
  drawFigure(ctx, {
    x: 280,
    y: 1200,
    h: 400,
    t: t + 2,
    pose: 'kneel',
    facing: 1,
    color: '#060504',
    rim: '#d9ad5b',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  drawFigure(ctx, {
    x: 468,
    y: 1180,
    h: 365,
    t,
    pose: 'reach',
    facing: -1,
    color: '#080605',
    rim: '#f0d08c',
    kind: 'priest',
    hair: 'bald',
    hat: 'none',
    skirt: true,
    coat: false,
  });
  // halo of candlelight behind the bishop
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const halo = ctx.createRadialGradient(460, 790, 20, 460, 790, 190);
  halo.addColorStop(0, 'rgba(217,173,91,0.1)');
  halo.addColorStop(1, 'rgba(217,173,91,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(460, 790, 190, 0, TAU);
  ctx.fill();
  ctx.restore();
  hatch(ctx, 0, 470, W, 330, 10, -0.55, '#b19668', 0.02);
  paper(ctx, t, 0.55, 1);
}

function roadDawn(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#172833'],
    [0.32, '#3e4b4c'],
    [0.58, '#a3825e'],
    [0.7, '#d9ac74'],
    [0.77, '#e4d7bd'],
    [1, '#2c3333'],
  ]);
  stars(ctx, t, 25, 300, 0.25);
  mountains(ctx, 800, '#253035', 11, 230, 0.75);
  hills(ctx, 850, '#313c3b', 6, 0.8);
  sun(ctx, W * 0.68, 760, 46, '#e7b273', 0.85);
  snowyGround(ctx, 920, '#c7d2d3', '#84918f', 16);
  tree(ctx, W * 0.19, 990, 460, '#101413', t, 12, 1, true);
  tree(ctx, W * 0.87, 950, 320, '#131716', t, 15, 0.9, true);
  // stone milestone
  ctx.save();
  ctx.fillStyle = '#141817';
  ctx.fillRect(500, 930, 42, 65);
  ctx.fillStyle = 'rgba(210,200,176,0.18)';
  ctx.fillRect(500, 930, 42, 4);
  ctx.restore();
  // candlestick on the snow
  candlestick(ctx, 330, 995, 130, t, 14, true);
  glow(ctx, 330, 930, 240, '#efbd6d', 0.15);
  // Valjean kneels, then rises
  const rise = smooth((t - 96) / 5);
  if (rise < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - rise;
    drawFigure(ctx, {
      x: 350,
      y: 1000,
      h: 310,
      t,
      pose: 'kneel',
      facing: 1,
      color: '#060606',
      rim: '#d9ad5b',
      kind: 'man',
      hat: 'none',
      coat: true,
    });
    ctx.restore();
  }
  if (rise > 0) {
    ctx.save();
    ctx.globalAlpha = rise;
    drawFigure(ctx, {
      x: 350 + (t - 96) * 1.5,
      y: 1002,
      h: 310,
      t,
      pose: 'walk',
      facing: 1,
      color: '#060606',
      rim: '#e6bf77',
      kind: 'man',
      hat: 'none',
      coat: true,
    });
    ctx.restore();
  }
  snow(ctx, t * 0.8, 55, 0.3);
  // the thread finds him
  const reveal = clamp((t - 100) / 9);
  if (reveal > 0) {
    const pts: Array<[number, number]> = [
      [330, 918],
      [420, 900],
      [520, 880],
      [640, 846],
      [W + 20, 810],
    ];
    ctx.save();
    ctx.globalAlpha = 0.9;
    goldThread(ctx, pts, reveal, t, '#e9c079', 2.1);
    ctx.restore();
  }
  paper(ctx, t, 0.5, 1);
}

export function digne(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 18) {
    exteriorNight(ctx, t);
  } else if (t < 38) {
    supper(ctx, t);
  } else if (t < 56) {
    theft(ctx, t);
  } else if (t < 72) {
    returnScene(ctx, t);
  } else if (t < 88) {
    forgiveness(ctx, t);
  } else {
    roadDawn(ctx, t);
  }
  finish(ctx, t, s.quality, 0.5);
}
