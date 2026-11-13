import { H, W } from '../timeline';
import {
  candle,
  citySkyline,
  glow,
  goldThread,
  hatch,
  lantern,
  paper,
  snow,
  stars,
  tree,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import { drawBucket, drawDoll, drawFigure } from '../figures';
import type { SceneContext } from './common';
import {
  carriage,
  finish,
  hills,
  moon,
  sky,
  snowyGround,
  table,
  windowFrame,
} from './common';

function inn(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#241810'],
    [0.6, '#160f0a'],
    [0.72, '#0f0a07'],
    [1, '#070504'],
  ]);
  // smoke-stained ceiling beams
  ctx.save();
  ctx.fillStyle = '#0c0805';
  ctx.fillRect(0, 0, W, 110);
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(0, 110 + i * 54, W, 18);
  }
  ctx.restore();
  // hearth
  ctx.save();
  ctx.fillStyle = '#0a0705';
  ctx.fillRect(20, 600, 170, 380);
  ctx.fillStyle = 'rgba(201,111,38,0.32)';
  ctx.fillRect(48, 800, 114, 110);
  glow(ctx, 105, 850, 320, '#d97c32', 0.16);
  ctx.restore();
  // hanging pots
  ctx.save();
  ctx.strokeStyle = '#0b0805';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const x = 250 + i * 80;
    ctx.beginPath();
    ctx.moveTo(x, 190);
    ctx.lineTo(x, 255 + i * 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, 275 + i * 8, 22, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  ctx.restore();
  // table and candle
  table(ctx, 470, 900, 390, 210, '#1b110a', 'rgba(159,122,83,0.18)');
  candle(ctx, 420, 872, 105, t, 3, true);
  glow(ctx, 420, 790, 220, '#e0a24c', 0.12);
  // Thénardier and wife
  drawFigure(ctx, {
    x: 520,
    y: 1050,
    h: 390,
    t: t + 1,
    pose: 'point',
    facing: -1,
    color: '#090604',
    rim: '#b77a45',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  drawFigure(ctx, {
    x: 610,
    y: 1040,
    h: 375,
    t: t + 3,
    pose: 'stand',
    facing: -1,
    color: '#090604',
    rim: '#8d5f3e',
    kind: 'woman',
    hair: 'bun',
    skirt: true,
    coat: false,
  });
  // little Cosette with a broom
  drawFigure(ctx, {
    x: 245,
    y: 1042,
    h: 265,
    t,
    pose: 'walk',
    facing: 1,
    color: '#0a0705',
    rim: '#dba65e',
    kind: 'child',
    hair: 'short',
    skirt: true,
    coat: false,
  });
  drawBucket(ctx, 330, 1030, 80, '#1b120b', '#3d4b48');
  // broom
  ctx.save();
  ctx.strokeStyle = '#0e0906';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(265, 900);
  ctx.lineTo(210, 1050);
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(212, 1044);
    ctx.lineTo(194 + i * 8, 1062);
    ctx.stroke();
  }
  ctx.restore();
  // small stool
  ctx.save();
  ctx.fillStyle = '#0e0906';
  ctx.fillRect(160, 980, 62, 12);
  ctx.fillRect(168, 992, 8, 52);
  ctx.fillRect(208, 992, 8, 52);
  ctx.restore();
  hatch(ctx, 0, 520, W, 360, 14, -0.4, '#c08b56', 0.02);
  paper(ctx, t, 0.5, 1);
}

function forest(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#050d15'],
    [0.36, '#0e1c28'],
    [0.62, '#21313a'],
    [0.7, '#aebec5'],
    [0.82, '#26343b'],
    [1, '#080d10'],
  ]);
  stars(ctx, t, 60, 420, 0.5);
  moon(ctx, W * 0.28, 230, 42, '#e2e0ca', 0.7);
  // distant forest
  hills(ctx, 760, '#12212a', 8, 0.9);
  for (let i = 0; i < 7; i++) {
    tree(ctx, 20 + i * 118, 850, 250 + hash(i) * 160, '#091218', t, i + 2, 0.9, true);
  }
  snowyGround(ctx, 880, '#b7c5ca', '#677980', 22);
  // big foreground trees framing the child
  tree(ctx, 55, 1080, 780, '#050b0e', t, 31, 1, true);
  tree(ctx, 690, 1110, 840, '#050b0e', t, 37, 1, true);
  // Cosette, very small
  drawFigure(ctx, {
    x: 355,
    y: 985,
    h: 255,
    t,
    pose: 'stand',
    facing: 1,
    color: '#050608',
    rim: '#ccd9dc',
    kind: 'child',
    hair: 'short',
    skirt: true,
    coat: false,
  });
  drawBucket(ctx, 288, 990, 95, '#0b0c0c', '#4e686a');
  lantern(ctx, 430, 930, 30, t, 13, '#ffc36b');
  glow(ctx, 430, 930, 190, '#e5a957', 0.11);
  snow(ctx, t, 105, 0.5);
  // small footprints
  ctx.save();
  ctx.fillStyle = 'rgba(40,54,60,0.28)';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(420 + i * 17 + Math.sin(i) * 3, 1018 + i * 14, 7, 3.5, 0.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  paper(ctx, t, 0.48, 1);
}

function rescue(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#07101a'],
    [0.4, '#10202b'],
    [0.65, '#223239'],
    [0.78, '#9eacb1'],
    [1, '#151e23'],
  ]);
  stars(ctx, t, 38, 380, 0.4);
  moon(ctx, W * 0.82, 240, 34, '#e4e0c8', 0.5);
  hills(ctx, 790, '#132029', 6, 0.9);
  tree(ctx, 75, 1080, 760, '#050b0d', t, 21, 1, true);
  tree(ctx, 660, 1050, 620, '#050b0d', t, 24, 1, true);
  snowyGround(ctx, 900, '#c0cccf', '#6e7f86', 27);
  // Valjean kneeling, huge and warm
  drawFigure(ctx, {
    x: 470,
    y: 1020,
    h: 530,
    t,
    pose: 'kneel',
    facing: -1,
    color: '#050607',
    rim: '#e4bc72',
    kind: 'man',
    hat: 'cap',
    coat: true,
  });
  drawFigure(ctx, {
    x: 255,
    y: 1000,
    h: 260,
    t: t + 2,
    pose: 'stand',
    facing: 1,
    color: '#050608',
    rim: '#d4e0e2',
    kind: 'child',
    hair: 'short',
    skirt: true,
    coat: false,
  });
  drawBucket(ctx, 330, 1000, 105, '#0c0a08', '#526c6e');
  lantern(ctx, 370, 910, 34, t, 5, '#ffc36b');
  glow(ctx, 400, 900, 280, '#e3ab5c', 0.14);
  // hand reaching for the bucket
  ctx.save();
  ctx.strokeStyle = '#080605';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(450, 820);
  ctx.quadraticCurveTo(400, 940, 350, 970);
  ctx.stroke();
  ctx.restore();
  snow(ctx, t, 90, 0.45);
  paper(ctx, t, 0.48, 1);
}

function dollShop(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#081018'],
    [0.35, '#131f27'],
    [0.55, '#253139'],
    [0.62, '#d5cebb'],
    [0.72, '#2b353b'],
    [1, '#090c0f'],
  ]);
  stars(ctx, t, 40, 330, 0.35);
  // village facades
  for (const [x, w, h] of [[110, 190, 300], [620, 210, 340]] as const) {
    ctx.fillStyle = '#171513';
    ctx.fillRect(x - w / 2, 650 - h + 200, w, h);
    ctx.fillStyle = '#0b0908';
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 18, 650 - h + 200);
    ctx.lineTo(x, 650 - h + 140);
    ctx.lineTo(x + w / 2 + 18, 650 - h + 200);
    ctx.fill();
  }
  // shop
  ctx.save();
  ctx.fillStyle = '#1b1711';
  ctx.fillRect(230, 430, 260, 420);
  ctx.fillStyle = '#2a2117';
  ctx.fillRect(250, 460, 220, 330);
  glow(ctx, 360, 620, 300, '#e2a34b', 0.14);
  ctx.fillStyle = 'rgba(226,163,75,0.3)';
  ctx.fillRect(270, 500, 180, 240);
  ctx.restore();
  windowFrame(ctx, 270, 500, 180, 240, '#0d0905');
  drawDoll(ctx, 360, 700, 100, '#e0b05f');
  drawDoll(ctx, 315, 715, 50, '#b98339');
  // gas lamp
  glow(ctx, 650, 800, 220, '#e0a34c', 0.1);
  // Cosette looking up
  drawFigure(ctx, {
    x: 280,
    y: 1020,
    h: 245,
    t,
    pose: 'reach',
    facing: 1,
    color: '#060505',
    rim: '#d8b068',
    kind: 'child',
    hair: 'short',
    skirt: true,
    coat: false,
  });
  // Valjean
  drawFigure(ctx, {
    x: 420,
    y: 1040,
    h: 500,
    t,
    pose: 'stand',
    facing: 1,
    color: '#050504',
    rim: '#e0b66c',
    kind: 'man',
    hat: 'cap',
    coat: true,
  });
  // she holds the bucket; he carries it now (put it at his feet, empty)
  drawBucket(ctx, 470, 1040, 60, '#0d0b08', '#5c7474');
  snow(ctx, t, 85, 0.42);
  paper(ctx, t, 0.5, 1);
}

function returnInn(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#21160f'],
    [0.58, '#140e09'],
    [0.7, '#0d0906'],
    [1, '#060504'],
  ]);
  ctx.save();
  ctx.fillStyle = '#0b0805';
  ctx.fillRect(0, 0, W, 95);
  for (let i = 0; i < 3; i++) ctx.fillRect(0, 95 + i * 62, W, 16);
  ctx.restore();
  table(ctx, 390, 900, 430, 230, '#1a110a', 'rgba(170,133,90,0.2)');
  // coins
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.fillStyle = '#d9ad5b';
    ctx.beginPath();
    ctx.ellipse(300 + (i % 3) * 28, 868 + Math.floor(i / 3) * 9, 14, 4, 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  glow(ctx, 340, 860, 170, '#e7bb68', 0.14);
  drawFigure(ctx, {
    x: 250,
    y: 1060,
    h: 480,
    t,
    pose: 'stand',
    facing: 1,
    color: '#060504',
    rim: '#e2ba72',
    kind: 'man',
    hat: 'cap',
    coat: true,
  });
  drawFigure(ctx, {
    x: 540,
    y: 1070,
    h: 410,
    t: t + 2,
    pose: 'reach',
    facing: -1,
    color: '#090604',
    rim: '#b4763f',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  drawFigure(ctx, {
    x: 620,
    y: 1060,
    h: 390,
    t: t + 4,
    pose: 'stand',
    facing: -1,
    color: '#090604',
    rim: '#925f3d',
    kind: 'woman',
    hair: 'bun',
    skirt: true,
    coat: false,
  });
  // Cosette with doll
  drawFigure(ctx, {
    x: 355,
    y: 1040,
    h: 270,
    t,
    pose: 'embrace',
    facing: 1,
    color: '#070505',
    rim: '#e3bd75',
    kind: 'child',
    hair: 'short',
    skirt: true,
    coat: false,
  });
  drawDoll(ctx, 390, 870, 62, '#e0b05f');
  candle(ctx, 470, 862, 90, t, 8, true);
  snow(ctx, t * 0.2, 15, 0.08);
  paper(ctx, t, 0.5, 1);
}

function carriageToParis(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#08101c'],
    [0.4, '#152333'],
    [0.6, '#3c4249'],
    [0.7, '#b8b9ab'],
    [0.82, '#242c33'],
    [1, '#080b0e'],
  ]);
  stars(ctx, t, 55, 420, 0.5);
  moon(ctx, W * 0.76, 220, 42, '#e5e1ca', 0.7);
  hills(ctx, 780, '#17242c', 31, 0.8);
  citySkyline(ctx, 860, '#0b1218', 41, { minH: 90, maxH: 210, windows: true, windowColor: '#d9a354', alpha: 0.65 });
  snowyGround(ctx, 920, '#bfcace', '#6f7f86', 44);
  carriage(ctx, 345, 960, 320, '#080605', t);
  // warm carriage window
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(232,173,90,0.42)';
  ctx.fillRect(310, 860, 70, 52);
  glow(ctx, 345, 885, 120, '#e8ad5a', 0.15);
  ctx.restore();
  snow(ctx, t, 85, 0.45);
  const reveal = clamp((t - 88) / 9);
  if (reveal > 0) {
    const pts: Array<[number, number]> = [
      [345, 860],
      [430, 800],
      [520, 750],
      [640, 700],
      [W + 20, 650],
    ];
    goldThread(ctx, pts, reveal, t, '#e7bb68', 1.8);
  }
  paper(ctx, t, 0.48, 1);
}

export function cosette(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 22) {
    inn(ctx, t);
  } else if (t < 42) {
    forest(ctx, t);
  } else if (t < 58) {
    rescue(ctx, t);
  } else if (t < 72) {
    dollShop(ctx, t);
  } else if (t < 86) {
    returnInn(ctx, t);
  } else {
    carriageToParis(ctx, t);
  }
  finish(ctx, t, s.quality, 0.5);
}
