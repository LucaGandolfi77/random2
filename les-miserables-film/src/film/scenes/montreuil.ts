import { H, W } from '../timeline';
import {
  candlestick,
  citySkyline,
  cobblestones,
  glow,
  hatch,
  paper,
  rain,
  windowLight,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import { SERIF, SANS, drawLetterSpaced } from '../text';
import {
  drawCart,
  drawCrowd,
  drawFigure,
  drawHorse,
  drawLyingFigure,
  drawTwoHands,
} from '../figures';
import type { SceneContext } from './common';
import { bed, finish, hills, sky, table } from './common';

function bigNumber(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  y = 600,
  size = 250,
  color = '#d9ad5b',
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${size}px ${SERIF}`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeText('24601', W / 2, y);
  ctx.fillStyle = rgba(color, 0.035);
  ctx.fillText('24601', W / 2, y);
  ctx.restore();
}

function town(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#8b8f88'],
    [0.36, '#b3aa93'],
    [0.58, '#d0bb95'],
    [0.7, '#c2ad89'],
    [1, '#3d423c'],
  ]);
  glow(ctx, W * 0.24, 290, 300, '#f0d6a0', 0.08);
  hills(ctx, 760, '#575e54', 5, 0.6);
  citySkyline(ctx, 820, '#3c413b', 9, { minH: 120, maxH: 280, windows: true, windowColor: '#e0b26c', alpha: 0.7 });
  // factory
  ctx.save();
  ctx.fillStyle = '#2b2d28';
  ctx.fillRect(410, 430, 290, 390);
  ctx.fillStyle = '#22241f';
  ctx.fillRect(440, 380, 42, 90);
  ctx.fillRect(600, 350, 34, 120);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = 'rgba(210,190,150,0.2)';
    ctx.fillRect(435 + (i % 4) * 64, 480 + Math.floor(i / 4) * 78, 30, 44);
  }
  // smoke
  ctx.globalAlpha = 0.09;
  for (let i = 0; i < 9; i++) {
    const x = 455 + Math.sin(t * 0.3 + i) * 40 + i * 6;
    const y = 370 - ((t * 10 + i * 34) % 240);
    ctx.fillStyle = '#d9d2c0';
    ctx.beginPath();
    ctx.arc(x, y, 20 + i * 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  cobblestones(ctx, 910, '#34362f', 13, 0.3);
  // crowd
  drawCrowd(ctx, t, 1010, 11, '#262821', 0.75, 5, 0.95);
  // mayor
  drawFigure(ctx, {
    x: 330,
    y: 1040,
    h: 360,
    t,
    pose: 'stand',
    facing: 1,
    color: '#1c1d19',
    rim: '#d9ad5b',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  // factory workers walking
  drawFigure(ctx, {
    x: 210,
    y: 1018,
    h: 285,
    t: t + 4,
    pose: 'walk',
    facing: -1,
    color: '#262720',
    alpha: 0.8,
    kind: 'woman',
    hair: 'bun',
    skirt: true,
  });
  paper(ctx, t, 0.55, 1);
}

function cartRescue(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#62665f'],
    [0.45, '#928d7c'],
    [0.62, '#796e5a'],
    [1, '#25261f'],
  ]);
  hills(ctx, 700, '#4c5046', 7, 0.6);
  citySkyline(ctx, 790, '#3a3c34', 4, { minH: 80, maxH: 220, windows: false, alpha: 0.55 });
  ctx.fillStyle = '#3a362c';
  ctx.fillRect(0, 820, W, H - 820);
  cobblestones(ctx, 880, '#211f19', 21, 0.35);
  // crowd ring
  drawCrowd(ctx, t, 955, 9, '#1b1b16', 0.65, 12, 1);
  drawHorse(ctx, 590, 980, 270, '#1a1812', t);
  // fallen cart
  ctx.save();
  ctx.translate(355, 920);
  ctx.rotate(-0.12);
  drawCart(ctx, 0, 40, 370, '#1a1610', t);
  ctx.restore();
  // Fauchelevent under the cart
  drawLyingFigure(ctx, 285, 960, 280, '#181610', 1, 1);
  // Valjean lifts
  drawFigure(ctx, {
    x: 300,
    y: 1045,
    h: 380,
    t,
    pose: 'lift',
    facing: 1,
    color: '#201d16',
    rim: '#e1bb72',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  // strain lines
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#e0c28a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(300, 760, 80 + i * 12, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.restore();
  // dust
  for (let i = 0; i < 40; i++) {
    const x = hash(i * 2.1) * W;
    const y = 760 + hash(i * 4.3) * 430;
    ctx.fillStyle = `rgba(224,208,170,${0.04 + hash(i) * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + hash(i * 7.3), 0, TAU);
    ctx.fill();
  }
  glow(ctx, 300, 820, 260, '#d9ad5b', 0.06);
  paper(ctx, t, 0.58, 1);
}

function court(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#211a13'],
    [0.52, '#2f2419'],
    [0.7, '#17110c'],
    [1, '#080605'],
  ]);
  // high windows
  for (const x of [100, 210]) {
    windowLight(ctx, x, 150, 80, 240, t, '#b9b39c', x);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const x of [140, 250]) {
    const g = ctx.createLinearGradient(x, 160, x + 260, 900);
    g.addColorStop(0, 'rgba(193,188,164,0.1)');
    g.addColorStop(1, 'rgba(193,188,164,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30, 160);
    ctx.lineTo(x + 30, 160);
    ctx.lineTo(x + 210, 900);
    ctx.lineTo(x + 20, 900);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // judge bench
  ctx.save();
  ctx.fillStyle = '#160f0a';
  ctx.fillRect(130, 470, 460, 190);
  ctx.fillStyle = '#22170f';
  ctx.fillRect(100, 440, 520, 40);
  ctx.strokeStyle = 'rgba(207,181,132,0.17)';
  ctx.lineWidth = 2;
  ctx.strokeRect(150, 490, 420, 160);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    drawFigure(ctx, {
      x: 250 + i * 110,
      y: 670,
      h: 250,
      t: t + i,
      pose: 'sit',
      facing: 1,
      color: '#090705',
      rim: '#b09262',
      kind: 'man',
      hat: 'none',
      coat: true,
      shadow: false,
      alpha: 0.9,
    });
  }
  // clerks
  ctx.save();
  ctx.fillStyle = 'rgba(10,7,5,0.85)';
  ctx.fillRect(250, 710, 220, 90);
  ctx.restore();
  // crowd
  for (let i = 0; i < 7; i++) {
    drawFigure(ctx, {
      x: 60 + i * 100,
      y: 1110,
      h: 265,
      t: t + i,
      pose: 'stand',
      facing: i < 3 ? 1 : -1,
      color: '#0b0806',
      alpha: 0.75,
      hat: i % 3 === 0 ? 'top' : 'none',
      shadow: false,
    });
  }
  // Champmathieu
  drawFigure(ctx, {
    x: 360,
    y: 1040,
    h: 275,
    t,
    pose: 'stand',
    facing: 1,
    color: '#0a0806',
    rim: '#c7b389',
    kind: 'old',
    hat: 'cap',
    coat: true,
  });
  // Valjean, standing among the crowd
  drawFigure(ctx, {
    x: 545,
    y: 1090,
    h: 320,
    t: t + 1,
    pose: 'stand',
    facing: -1,
    color: '#090705',
    rim: '#d9ad5b',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  bigNumber(ctx, 0.07, 640, 160);
  paper(ctx, t, 0.55, 1);
}

function confession(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#120e0b'],
    [0.55, '#221a13'],
    [1, '#070504'],
  ]);
  bigNumber(ctx, smooth(t - 58) * 0.16, 550, 300, '#d9ad5b');
  // bars
  ctx.save();
  ctx.strokeStyle = 'rgba(160,140,105,0.09)';
  ctx.lineWidth = 14;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(70 + i * 150, 0);
    ctx.lineTo(70 + i * 150, H);
    ctx.stroke();
  }
  ctx.restore();
  // candlelight
  candlestick(ctx, 160, 1040, 210, t, 4, true);
  candlestick(ctx, 560, 1040, 210, t, 8, true);
  glow(ctx, W / 2, 820, 440, '#d9a354', 0.11);
  // Valjean front and centre
  drawFigure(ctx, {
    x: 360,
    y: 1200,
    h: 430,
    t,
    pose: 'stand',
    facing: 1,
    color: '#050403',
    rim: '#e5c07a',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  // judges, almost swallowed by dark
  for (let i = 0; i < 4; i++) {
    drawFigure(ctx, {
      x: 110 + i * 165,
      y: 780,
      h: 180,
      t: t + i,
      pose: 'sit',
      facing: 1,
      color: '#080605',
      alpha: 0.55,
      shadow: false,
    });
  }
  hatch(ctx, 0, 900, W, 380, 10, -0.5, '#b69a6b', 0.02);
  paper(ctx, t, 0.55, 1);
}

function javertRain(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#070c11'],
    [0.5, '#111a20'],
    [0.7, '#151b1e'],
    [1, '#070808'],
  ]);
  citySkyline(ctx, 800, '#0a0e12', 19, { minH: 100, maxH: 230, windows: true, windowColor: '#c08b48', alpha: 0.5 });
  ctx.fillStyle = '#070808';
  ctx.fillRect(0, 860, W, H - 860);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const wet = ctx.createLinearGradient(0, 860, 0, H);
  wet.addColorStop(0, 'rgba(130,150,155,0.09)');
  wet.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wet;
  ctx.fillRect(0, 860, W, H - 860);
  ctx.restore();
  // wanted poster with 24601
  ctx.save();
  ctx.translate(150, 610);
  ctx.rotate(-0.035);
  ctx.fillStyle = 'rgba(206,194,164,0.62)';
  ctx.fillRect(-72, -100, 144, 200);
  ctx.fillStyle = 'rgba(20,15,10,0.8)';
  ctx.font = `600 12px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('RECHERCHÉ', 0, -72);
  ctx.font = `600 40px ${SERIF}`;
  ctx.fillText('24601', 0, -20);
  ctx.font = `500 9px ${SANS}`;
  ctx.fillText('JEAN VALJEAN', 0, 24);
  ctx.fillText('BAGNES DE TOULON', 0, 42);
  ctx.restore();
  // Javert
  drawFigure(ctx, {
    x: 420,
    y: 1040,
    h: 440,
    t,
    pose: 'stand',
    facing: -1,
    color: '#050607',
    rim: '#aebfc7',
    kind: 'soldier',
    hat: 'bicorne',
    coat: true,
  });
  glow(ctx, 560, 880, 270, '#d6a355', 0.11);
  // lantern
  ctx.save();
  ctx.fillStyle = 'rgba(255,200,110,0.75)';
  ctx.fillRect(548, 840, 24, 42);
  ctx.strokeStyle = '#100d09';
  ctx.lineWidth = 5;
  ctx.strokeRect(544, 834, 32, 54);
  ctx.restore();
  rain(ctx, t, 150, 0.36, 0.16, '#c6d2d4', 1000);
  paper(ctx, t, 0.45, 1);
}

function promise(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#171411'],
    [0.58, '#28221b'],
    [0.72, '#14100d'],
    [1, '#080605'],
  ]);
  windowLight(ctx, 70, 180, 140, 260, t, '#9fb4ba', 14);
  bed(ctx, 390, 1000, 460, 300, '#19120d', 'rgba(210,204,186,0.56)');
  drawLyingFigure(ctx, 340, 838, 280, '#080605', 0.9, 1);
  ctx.save();
  ctx.fillStyle = 'rgba(210,203,185,0.48)';
  ctx.beginPath();
  ctx.ellipse(390, 850, 150, 58, -0.03, 0, TAU);
  ctx.fill();
  ctx.restore();
  drawFigure(ctx, {
    x: 555,
    y: 1100,
    h: 330,
    t,
    pose: 'kneel',
    facing: -1,
    color: '#080605',
    rim: '#d9ad5b',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  candlestick(ctx, 620, 880, 160, t, 17, true);
  glow(ctx, 620, 760, 270, '#dfaa56', 0.13);
  drawTwoHands(ctx, 430, 915, 570, 930, 17, '#0a0806', '#e2b566', t);
  paper(ctx, t, 0.5, 1);
  const fade = smooth((t - 108) / 2);
  if (fade > 0) {
    ctx.fillStyle = `rgba(4,3,2,${fade * 0.8})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function montreuil(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 20) {
    town(ctx, t);
  } else if (t < 40) {
    cartRescue(ctx, t);
  } else if (t < 58) {
    court(ctx, t);
  } else if (t < 76) {
    confession(ctx, t);
  } else if (t < 96) {
    javertRain(ctx, t);
  } else {
    promise(ctx, t);
  }
  finish(ctx, t, s.quality, 0.5);
}
