import { H, W } from '../timeline';
import {
  citySkyline,
  cobblestones,
  glow,
  goldThread,
  hatch,
  lantern,
  paper,
  rain,
  smoke,
  stars,
  windowLight,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import {
  drawCarryingPair,
  drawCart,
  drawCrowd,
  drawFigure,
  drawFlag,
  drawLyingFigure,
  drawRifle,
  drawWheelbarrow,
} from '../figures';
import type { SceneContext } from './common';
import {
  finish,
  hills,
  moon,
  sky,
  street,
  sun,
} from './common';

function barricadePile(ctx: CanvasRenderingContext2D, t: number, low = 930): void {
  // cobblestone mound
  ctx.save();
  ctx.fillStyle = '#171411';
  ctx.beginPath();
  ctx.moveTo(60, low + 160);
  ctx.quadraticCurveTo(80, low + 20, 190, low - 20);
  ctx.quadraticCurveTo(360, low - 80, 530, low - 10);
  ctx.quadraticCurveTo(650, low + 30, 680, low + 160);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(205,184,146,0.15)';
  ctx.lineWidth = 1;
  cobblestones(ctx, low + 20, '#b7a587', 24, 0.12);
  ctx.restore();
  // carts and barrels
  ctx.save();
  ctx.translate(235, low + 10);
  ctx.rotate(-0.18);
  drawCart(ctx, 0, 0, 260, '#12100d', t);
  ctx.restore();
  ctx.save();
  ctx.translate(520, low + 15);
  ctx.rotate(0.12);
  drawCart(ctx, 0, 0, 230, '#100e0b', t);
  ctx.restore();
  drawWheelbarrow(ctx, 390, low - 20, 180, '#12100c');
  // barrels
  for (const [x, y, w, h] of [[170, low + 60, 85, 100], [600, low + 50, 70, 90]] as const) {
    ctx.save();
    ctx.fillStyle = '#100d0a';
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(205,180,130,0.17)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.2, w / 2, h * 0.16, 0, 0, TAU);
    ctx.ellipse(x, y + h * 0.2, w / 2, h * 0.16, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  // planks
  ctx.save();
  ctx.strokeStyle = '#0e0b08';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(100, low + 90);
  ctx.lineTo(330, low + 10);
  ctx.moveTo(300, low + 60);
  ctx.lineTo(580, low + 90);
  ctx.stroke();
  ctx.restore();
}

function streetBackdrop(ctx: CanvasRenderingContext2D, t: number, dusk = false): void {
  sky(ctx, dusk
    ? [
        [0, '#3b3d3c'],
        [0.35, '#756a58'],
        [0.55, '#c19a70'],
        [0.62, '#6c6152'],
        [1, '#141210'],
      ]
    : [
        [0, '#070b10'],
        [0.42, '#121a20'],
        [0.62, '#252a2a'],
        [1, '#080807'],
      ]);
  if (!dusk) stars(ctx, t, 30, 380, 0.2);
  citySkyline(ctx, 760, '#11151a', 7, { minH: 100, maxH: 240, windows: true, windowColor: '#d9a354', alpha: 0.75 });
  citySkyline(ctx, 860, '#0a0d10', 13, { minH: 80, maxH: 180, windows: true, windowColor: '#b8803f', alpha: 0.55 });
  // tavern / corinthe front
  ctx.save();
  ctx.fillStyle = '#15110d';
  ctx.fillRect(455, 480, 210, 350);
  ctx.fillStyle = '#1e1711';
  ctx.fillRect(475, 520, 170, 250);
  windowLight(ctx, 500, 560, 60, 110, t, '#d9a354', 7);
  windowLight(ctx, 575, 560, 60, 110, t, '#cf9a4a', 9);
  ctx.restore();
  ctx.fillStyle = '#151310';
  ctx.fillRect(0, 840, W, H - 840);
  cobblestones(ctx, 900, '#6b6355', 17, 0.15);
}

function construction(ctx: CanvasRenderingContext2D, t: number): void {
  streetBackdrop(ctx, t);
  barricadePile(ctx, t);
  // defenders pushing
  for (const [x, h, pose] of [[140, 300, 'lift'], [300, 320, 'lift'], [470, 300, 'carry'], [590, 290, 'lift']] as const) {
    drawFigure(ctx, {
      x,
      y: 1100,
      h,
      t: t + x,
      pose,
      facing: x < 360 ? 1 : -1,
      color: '#070605',
      rim: '#d1a55e',
      kind: 'man',
      hat: x > 400 ? 'cap' : 'top',
      coat: true,
    });
  }
  // red flag
  drawFlag(ctx, 360, 840, 330, t, '#8d2b27');
  rain(ctx, t, 100, 0.3, 0.18, '#b9c5c7', 980);
  smoke(ctx, t, 330, 850, '#8c8171', 0.08, 8);
  paper(ctx, t, 0.5, 1);
}

function enjolras(ctx: CanvasRenderingContext2D, t: number): void {
  streetBackdrop(ctx, t);
  barricadePile(ctx, t, 940);
  // students atop the barricade
  drawFigure(ctx, {
    x: 360,
    y: 900,
    h: 340,
    t,
    pose: 'raise',
    facing: 1,
    color: '#060505',
    rim: '#e6bc72',
    kind: 'student',
    hat: 'cap',
    coat: true,
  });
  drawFlag(ctx, 420, 760, 520, t, '#942c28');
  for (const [x, h] of [[230, 280], [500, 270], [600, 250]] as const) {
    drawFigure(ctx, {
      x,
      y: 950,
      h,
      t: t + x,
      pose: 'stand',
      facing: x < 360 ? 1 : -1,
      color: '#080706',
      alpha: 0.9,
      rim: '#bda06b',
      kind: 'student',
      hat: 'cap',
      coat: true,
      shadow: false,
    });
  }
  // rifles raised
  for (let i = 0; i < 5; i++) {
    drawRifle(ctx, 170 + i * 90, 940, 190, -0.35 + i * 0.06, '#090705');
  }
  rain(ctx, t, 120, 0.32, 0.18, '#c1cbcd', 1000);
  paper(ctx, t, 0.5, 1);
}

function attack(ctx: CanvasRenderingContext2D, t: number): void {
  streetBackdrop(ctx, t);
  // guards in the distance
  for (let i = 0; i < 7; i++) {
    drawFigure(ctx, {
      x: 110 + i * 88,
      y: 820,
      h: 235,
      t: t + i,
      pose: 'guard',
      facing: 1,
      color: '#0a0d10',
      alpha: 0.66,
      kind: 'soldier',
      hat: 'bicorne',
      coat: true,
      shadow: false,
    });
  }
  // soft muzzle flashes — slow, never strobing
  const flashes = [46.2, 53.4, 58.1];
  for (const ft of flashes) {
    const d = t - ft;
    if (d > 0 && d < 0.5) {
      const a = (1 - d / 0.5) * 0.5;
      glow(ctx, 260, 780, 160, '#ffd28a', a);
      glow(ctx, 560, 810, 120, '#ffcf82', a * 0.7);
    }
  }
  smoke(ctx, t, 360, 760, '#a49a88', 0.16, 18);
  barricadePile(ctx, t, 960);
  // defenders returning fire
  for (const [x, h] of [[130, 280], [300, 320], [520, 300], [620, 270]] as const) {
    drawFigure(ctx, {
      x,
      y: 1120,
      h,
      t: t + x,
      pose: 'guard',
      facing: 1,
      color: '#060504',
      rim: '#c69655',
      kind: 'student',
      hat: 'cap',
      coat: true,
      shadow: false,
    });
    drawRifle(ctx, x + 30, 1020, 180, -0.2, '#090705');
  }
  rain(ctx, t, 150, 0.35, 0.2, '#c3cccd', 1100);
  paper(ctx, t, 0.52, 1);
}

function eponineDeath(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#080809'],
    [0.4, '#141214'],
    [0.65, '#2f2221'],
    [1, '#080605'],
  ]);
  // rain and distant smoke
  rain(ctx, t, 100, 0.3, 0.15, '#b9c2c4', 900);
  smoke(ctx, t, 100, 900, '#8c7d6f', 0.06, 6);
  glow(ctx, 380, 900, 300, '#a44a42', 0.08);
  // ground
  ctx.fillStyle = '#0b0908';
  ctx.fillRect(0, 1040, W, H - 1040);
  // Marius kneeling
  drawFigure(ctx, {
    x: 420,
    y: 1070,
    h: 380,
    t,
    pose: 'kneel',
    facing: -1,
    color: '#050404',
    rim: '#d8a45e',
    kind: 'man',
    hat: 'top',
    coat: true,
    shadow: false,
  });
  // Eponine lying in his arms
  drawLyingFigure(ctx, 290, 1000, 340, '#050404', 1, 1);
  drawFigure(ctx, {
    x: 300,
    y: 1020,
    h: 260,
    t,
    pose: 'sit',
    facing: 1,
    color: '#050404',
    alpha: 0.75,
    kind: 'woman',
    hair: 'short',
    skirt: true,
    coat: false,
    shadow: false,
  });
  // red ribbon, her one bright thing
  ctx.save();
  ctx.strokeStyle = '#9d3c35';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(270, 960);
  ctx.quadraticCurveTo(340, 940, 390, 975);
  ctx.stroke();
  glow(ctx, 330, 960, 80, '#a43e36', 0.09);
  ctx.restore();
  // hand
  drawFigure(ctx, {
    x: 480,
    y: 1080,
    h: 330,
    t: t + 2,
    pose: 'reach',
    facing: -1,
    color: '#060505',
    alpha: 0.9,
    kind: 'man',
    hat: 'top',
    coat: true,
    shadow: false,
  });
  paper(ctx, t, 0.55, 1);
}

function gavroche(ctx: CanvasRenderingContext2D, t: number): void {
  streetBackdrop(ctx, t);
  barricadePile(ctx, t, 960);
  // street lamp behind, cold
  glow(ctx, 570, 720, 180, '#c9a25e', 0.07);
  const fall = smooth((t - 94) / 3.4);
  ctx.save();
  ctx.globalAlpha = 1 - fall * 0.9;
  ctx.translate(0, fall * 300);
  drawFigure(ctx, {
    x: 350,
    y: 900,
    h: 235,
    t,
    pose: 'raise',
    facing: 1,
    color: '#050504',
    rim: '#e4b96d',
    kind: 'child',
    hair: 'short',
    hat: 'cap',
    coat: true,
    shadow: false,
  });
  ctx.restore();
  if (fall > 0.4) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.5 - fall * 0.2);
    glow(ctx, 350, 1080, 120, '#a44a42', 0.08);
    ctx.restore();
  }
  // bullets — sparse streaks, no strobing
  ctx.save();
  ctx.strokeStyle = 'rgba(230,210,170,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = 170 + i * 82 + Math.sin(t * 2 + i) * 8;
    const y = 660 + i * 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 34, y + 5);
    ctx.stroke();
  }
  ctx.restore();
  rain(ctx, t, 120, 0.34, 0.18, '#c0c8c8', 1050);
  smoke(ctx, t, 300, 880, '#948977', 0.1, 9);
  paper(ctx, t, 0.52, 1);
}

function javertSpared(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#080807'],
    [0.55, '#151310'],
    [0.72, '#241a12'],
    [1, '#070605'],
  ]);
  // post
  ctx.save();
  ctx.fillStyle = '#2b1b10';
  ctx.fillRect(474, 430, 48, 720);
  ctx.fillStyle = 'rgba(198,150,92,0.18)';
  ctx.fillRect(480, 438, 10, 704);
  ctx.strokeStyle = 'rgba(217,173,91,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(478, 436, 40, 708);
  ctx.strokeStyle = 'rgba(72,46,24,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(488 + i * 8, 448);
    ctx.lineTo(485 + i * 8, 1136);
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, 520, 900, 420, '#c58a43', 0.08);
  smoke(ctx, t, 760, 1020, '#8f7c62', 0.05, 6);
  // lantern hanging from the post
  lantern(ctx, 558, 715, 30, t, 5, '#f0bc6c');
  glow(ctx, 558, 715, 310, '#e8b25f', 0.22);
  ctx.save();
  ctx.strokeStyle = '#0a0705';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(532, 560);
  ctx.quadraticCurveTo(556, 610, 558, 675);
  ctx.stroke();
  ctx.restore();
  // Javert tied
  drawFigure(ctx, {
    x: 495,
    y: 1100,
    h: 430,
    t,
    pose: 'stand',
    facing: -1,
    color: '#050505',
    rim: '#a9bbc2',
    kind: 'soldier',
    hat: 'bicorne',
    coat: true,
  });
  // rope binding his wrists behind the post
  ctx.save();
  ctx.strokeStyle = 'rgba(224,204,164,0.75)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(452, 792);
  ctx.lineTo(544, 836);
  ctx.moveTo(544, 792);
  ctx.lineTo(452, 836);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(452, 836);
  ctx.lineTo(430, 855);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(498, 814, 13, 0, TAU);
  ctx.stroke();
  ctx.restore();
  glow(ctx, 400, 930, 260, '#d9a354', 0.06);
  // Valjean, knife
  drawFigure(ctx, {
    x: 250,
    y: 1080,
    h: 470,
    t,
    pose: 'reach',
    facing: 1,
    color: '#050403',
    rim: '#e2b86c',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  ctx.save();
  // knife in his outstretched hand
  ctx.strokeStyle = 'rgba(230,220,196,0.85)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(370, 824);
  ctx.lineTo(438, 774);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20,14,9,0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(355, 836);
  ctx.lineTo(374, 821);
  ctx.stroke();
  glow(ctx, 405, 800, 60, '#f0d9a0', 0.13);
  ctx.restore();
  // debris and smoke to anchor the scene
  ctx.save();
  ctx.fillStyle = 'rgba(9,7,6,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, 1160);
  ctx.lineTo(120, 1080);
  ctx.lineTo(260, 1120);
  ctx.lineTo(320, 1200);
  ctx.lineTo(0, 1220);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  smoke(ctx, t, 600, 1080, '#8a7c69', 0.06, 7);
  // gold thread on the blade
  const reveal = clamp((t - 108) / 4);
  if (reveal > 0) {
    goldThread(ctx, [[300, 860], [335, 835], [370, 812]], reveal, t, '#e8bd6d', 1.7);
  }
  rain(ctx, t, 100, 0.25, 0.16, '#b4c1c4', 900);
  paper(ctx, t, 0.52, 1);
}

function dawnAfter(ctx: CanvasRenderingContext2D, t: number): void {
  streetBackdrop(ctx, t, true);
  // ruins and smoke
  barricadePile(ctx, t, 990);
  smoke(ctx, t, 360, 830, '#c4b7a2', 0.13, 13);
  // distant sun
  sun(ctx, 560, 700, 44, '#f0c885', 0.75);
  // Valjean carrying Marius
  drawCarryingPair(ctx, 380, 1080, 390, t, {
    color: '#050403',
    rim: '#e4bc72',
    facing: -1,
    hat: 'cap',
  });
  // gold thread, from the barricade toward the future
  const reveal = clamp((t - 122) / 7);
  if (reveal > 0) {
    goldThread(
      ctx,
      [
        [150, 980],
        [250, 900],
        [370, 830],
        [500, 780],
        [W + 20, 720],
      ],
      reveal,
      t,
      '#e8bd6d',
      2,
    );
  }
  rain(ctx, t * 0.4, 40, 0.12, 0.1, '#c4c8c2', 600);
  paper(ctx, t, 0.52, 1);
}

export function barricade(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 22) {
    construction(ctx, t);
  } else if (t < 40) {
    enjolras(ctx, t);
  } else if (t < 60) {
    attack(ctx, t);
  } else if (t < 80) {
    eponineDeath(ctx, t);
  } else if (t < 100) {
    gavroche(ctx, t);
  } else if (t < 118) {
    javertSpared(ctx, t);
  } else {
    dawnAfter(ctx, t);
  }
  finish(ctx, t, s.quality, 0.5);
}
