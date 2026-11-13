import { H, W } from '../timeline';
import {
  candle,
  citySkyline,
  glow,
  goldThread,
  hatch,
  lantern,
  paper,
  rain,
  smoke,
  stars,
  tree,
  windowLight,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import {
  drawCrowd,
  drawFigure,
  drawFlag,
  drawRifle,
  drawWheelbarrow,
  drawScarfOrCoatFlutter,
} from '../figures';
import type { SceneContext } from './common';
import {
  finish,
  hills,
  lampPost,
  moon,
  petals,
  sky,
  street,
  table,
} from './common';

function parisSkyline(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#0a1220'],
    [0.3, '#1b2838'],
    [0.55, '#4d4a44'],
    [0.62, '#b38a5d'],
    [0.7, '#3b3530'],
    [1, '#0a0908'],
  ]);
  glow(ctx, W * 0.68, 470, 300, '#d99a51', 0.16);
  stars(ctx, t, 40, 300, 0.25);
  // roofs rising from the bottom
  citySkyline(ctx, 750, '#161c22', 3, { minH: 110, maxH: 230, windows: true, windowColor: '#d9a354', alpha: 0.85 });
  citySkyline(ctx, 860, '#0d1115', 8, { minH: 80, maxH: 180, windows: true, windowColor: '#c58c44', alpha: 0.7 });
  // foreground zinc roof
  ctx.save();
  ctx.fillStyle = '#1b2025';
  ctx.beginPath();
  ctx.moveTo(-20, 1080);
  ctx.lineTo(250, 800);
  ctx.lineTo(540, 830);
  ctx.lineTo(W + 20, 1010);
  ctx.lineTo(W + 20, H);
  ctx.lineTo(-20, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,190,190,0.11)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(250 - i * 28, 800 + i * 31);
    ctx.lineTo(540 + i * 22, 830 + i * 21);
    ctx.stroke();
  }
  ctx.restore();
  // chimneys
  for (const [x, y, w, h] of [[190, 820, 70, 90], [610, 910, 80, 100], [480, 795, 50, 70]] as const) {
    ctx.fillStyle = '#0e1216';
    ctx.fillRect(x, y - h, w, h);
  }
  // birds
  ctx.save();
  ctx.strokeStyle = 'rgba(15,14,12,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const x = hash(i * 4.1) * W;
    const y = 260 + hash(i * 2.7) * 300;
    const flap = Math.sin(t * 3 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 7, y + flap);
    ctx.quadraticCurveTo(x - 2, y - 4, x, y);
    ctx.quadraticCurveTo(x + 2, y - 4, x + 7, y + flap);
    ctx.stroke();
  }
  ctx.restore();
  smoke(ctx, t, 600, 760, '#8d8172', 0.05, 7);
  paper(ctx, t, 0.52, 1);
}

function gorbeau(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#17110c'],
    [0.55, '#211710'],
    [0.7, '#0f0a07'],
    [1, '#060504'],
  ]);
  // window
  windowLight(ctx, 560, 190, 110, 220, t, '#7e8e92', 4);
  // fireplace
  ctx.save();
  ctx.fillStyle = '#0b0805';
  ctx.fillRect(20, 680, 150, 340);
  ctx.fillStyle = 'rgba(197,100,34,0.34)';
  ctx.fillRect(44, 850, 100, 90);
  glow(ctx, 94, 890, 300, '#d47a31', 0.15);
  ctx.restore();
  table(ctx, 380, 930, 380, 200, '#160f0a', 'rgba(157,124,82,0.15)');
  // money box / candle
  candle(ctx, 360, 900, 95, t, 5, true);
  glow(ctx, 360, 810, 200, '#d9a354', 0.13);
  // gang
  const gang: Array<[number, number, number]> = [
    [300, 1080, 350],
    [410, 1090, 330],
    [520, 1085, 345],
    [610, 1070, 315],
  ];
  gang.forEach(([x, y, h], i) => {
    drawFigure(ctx, {
      x,
      y,
      h,
      t: t + i,
      pose: i === 1 ? 'point' : i === 3 ? 'guard' : 'stand',
      facing: i < 2 ? 1 : -1,
      color: '#070504',
      rim: i === 1 ? '#c46a43' : '#9f7a4c',
      kind: i === 3 ? 'woman' : 'man',
      hat: i === 3 ? 'bonnet' : i === 2 ? 'top' : 'cap',
      skirt: i === 3,
      coat: i !== 3,
      alpha: 0.95,
    });
  });
  // Thénardier
  drawFigure(ctx, {
    x: 455,
    y: 1100,
    h: 370,
    t: t + 2,
    pose: 'point',
    facing: -1,
    color: '#080604',
    rim: '#b97845',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  // Valjean at the door, lantern
  drawFigure(ctx, {
    x: 150,
    y: 1060,
    h: 445,
    t,
    pose: 'stand',
    facing: 1,
    color: '#050403',
    rim: '#e2ba72',
    kind: 'man',
    hat: 'cap',
    coat: true,
  });
  lantern(ctx, 195, 900, 28, t, 9, '#ffc36b');
  glow(ctx, 195, 890, 190, '#e6ac5d', 0.12);
  // knives
  ctx.save();
  ctx.strokeStyle = 'rgba(226,215,194,0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(320, 930);
  ctx.lineTo(360, 900);
  ctx.moveTo(560, 940);
  ctx.lineTo(595, 905);
  ctx.stroke();
  ctx.restore();
  // shadows
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(150, 1060);
  ctx.quadraticCurveTo(120, 780, 200, 650);
  ctx.quadraticCurveTo(300, 830, 260, 1060);
  ctx.fill();
  ctx.restore();
  paper(ctx, t, 0.55, 1);
}

function rooftops(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#07101a'],
    [0.45, '#101f2b'],
    [0.68, '#23343b'],
    [1, '#050809'],
  ]);
  stars(ctx, t, 55, 420, 0.45);
  moon(ctx, W * 0.23, 220, 38, '#dfddc8', 0.6);
  citySkyline(ctx, 760, '#111a21', 6, { minH: 100, maxH: 230, windows: true, windowColor: '#d9a354', alpha: 0.75 });
  citySkyline(ctx, 900, '#090f13', 9, { minH: 80, maxH: 180, windows: true, windowColor: '#c4833d', alpha: 0.55 });
  // foreground roof slope
  ctx.save();
  ctx.fillStyle = '#0b1013';
  ctx.beginPath();
  ctx.moveTo(-20, 860);
  ctx.lineTo(300, 700);
  ctx.lineTo(760, 780);
  ctx.lineTo(W + 20, 930);
  ctx.lineTo(W + 20, H);
  ctx.lineTo(-20, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,180,184,0.1)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 11; i++) {
    ctx.beginPath();
    ctx.moveTo(-20 + i * 70, 870 + (i % 3) * 16);
    ctx.lineTo(300 + i * 38, 710 + (i % 3) * 8);
    ctx.stroke();
  }
  ctx.restore();
  // chimneys
  ctx.fillStyle = '#070a0c';
  ctx.fillRect(120, 710, 66, 120);
  ctx.fillRect(610, 730, 78, 150);
  // taut rope from chimney
  ctx.save();
  ctx.strokeStyle = 'rgba(214,200,170,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, 720);
  ctx.quadraticCurveTo(340, 760, 540, 750);
  ctx.stroke();
  ctx.restore();
  // Valjean running
  drawFigure(ctx, {
    x: 410,
    y: 810,
    h: 245,
    t,
    pose: 'run',
    facing: -1,
    color: '#050505',
    rim: '#d8b46e',
    kind: 'man',
    hat: 'cap',
    coat: true,
  });
  drawScarfOrCoatFlutter(ctx, 390, 700, 120, t, '#1e1913', 3);
  // pursuer behind
  drawFigure(ctx, {
    x: 565,
    y: 835,
    h: 235,
    t: t + 1,
    pose: 'run',
    facing: -1,
    color: '#050607',
    rim: '#9eb3bb',
    kind: 'soldier',
    hat: 'bicorne',
    coat: true,
    alpha: 0.85,
  });
  // street far below with lantern
  glow(ctx, 240, 1000, 100, '#d99a47', 0.08);
  rain(ctx, t, 90, 0.25, 0.2, '#bcc8cc', 900);
  paper(ctx, t, 0.5, 1);
}

function gavroche(ctx: CanvasRenderingContext2D, t: number): void {
  street(ctx, t, {
    skyTop: '#101925',
    skyBottom: '#3d4245',
    ground: '#0d0d0b',
    seed: 53,
    lamps: 2,
  });
  // café on the right
  ctx.save();
  ctx.fillStyle = '#241c13';
  ctx.fillRect(420, 520, 250, 340);
  ctx.fillStyle = 'rgba(232,177,90,0.42)';
  ctx.fillRect(445, 560, 195, 190);
  glow(ctx, 542, 660, 300, '#e6ad58', 0.22);
  ctx.strokeStyle = '#0c0906';
  ctx.lineWidth = 7;
  ctx.strokeRect(445, 560, 195, 190);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(542, 560);
  ctx.lineTo(542, 750);
  ctx.moveTo(445, 655);
  ctx.lineTo(640, 655);
  ctx.stroke();
  // hand-painted sign
  ctx.fillStyle = '#120d08';
  ctx.fillRect(450, 470, 190, 52);
  ctx.strokeStyle = 'rgba(217,173,91,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(455, 475, 180, 42);
  ctx.fillStyle = 'rgba(222,190,135,0.75)';
  ctx.font = '600 21px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CORINTHE', 545, 504);
  ctx.restore();
  // students inside
  for (let i = 0; i < 3; i++) {
    drawFigure(ctx, {
      x: 480 + i * 56,
      y: 748,
      h: 142,
      t: t + i,
      pose: 'sit',
      facing: i % 2 ? 1 : -1,
      color: '#0b0805',
      alpha: 0.72,
      shadow: false,
    });
  }
  // crates
  ctx.save();
  ctx.fillStyle = '#15110c';
  ctx.fillRect(140, 880, 190, 90);
  ctx.fillRect(170, 790, 140, 90);
  ctx.strokeStyle = 'rgba(210,180,130,0.12)';
  ctx.lineWidth = 3;
  ctx.strokeRect(140, 880, 190, 90);
  ctx.strokeRect(170, 790, 140, 90);
  ctx.restore();
  // Gavroche, king of the street
  drawFigure(ctx, {
    x: 300,
    y: 790,
    h: 235,
    t,
    pose: 'raise',
    facing: -1,
    color: '#060505',
    rim: '#e0b66c',
    kind: 'child',
    hair: 'short',
    hat: 'cap',
    coat: true,
  });
  // urchins
  for (const [x, h] of [[190, 150], [420, 140], [520, 160]] as const) {
    drawFigure(ctx, {
      x,
      y: 1040,
      h,
      t: t + x,
      pose: 'stand',
      facing: x > 300 ? -1 : 1,
      color: '#070606',
      alpha: 0.8,
      kind: 'child',
      hat: 'cap',
      shadow: false,
    });
  }
  // poster of Lamarque / flags
  ctx.save();
  ctx.translate(138, 620);
  ctx.rotate(-0.02);
  ctx.fillStyle = 'rgba(207,194,163,0.55)';
  ctx.fillRect(-60, -90, 120, 180);
  ctx.fillStyle = 'rgba(15,12,9,0.7)';
  ctx.font = '600 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAMARQUE', 0, -45);
  ctx.fillText('5 JUIN 1832', 0, 50);
  ctx.restore();
  drawFlag(ctx, 660, 700, 220, t, '#7d2a27');
  glow(ctx, 290, 850, 240, '#d9a354', 0.06);
  paper(ctx, t, 0.52, 1);
}

function luxembourg(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#182a2a'],
    [0.4, '#3d4c3d'],
    [0.6, '#9b8d63'],
    [0.8, '#2e3a2d'],
    [1, '#0b100c'],
  ]);
  glow(ctx, W * 0.48, 520, 340, '#e7bd7a', 0.11);
  // rows of trees
  for (let i = 0; i < 5; i++) {
    tree(ctx, 40 + i * 80, 900, 330 + (i % 2) * 80, '#0d1711', t, i + 2, 0.85, false);
    tree(ctx, 700 - i * 80, 900, 300 + (i % 2) * 70, '#0d1711', t, i + 9, 0.85, false);
  }
  // path
  ctx.save();
  const path = ctx.createLinearGradient(0, 850, 0, H);
  path.addColorStop(0, '#6f654c');
  path.addColorStop(1, '#191a14');
  ctx.fillStyle = path;
  ctx.beginPath();
  ctx.moveTo(W * 0.38, 830);
  ctx.lineTo(W * 0.62, 830);
  ctx.lineTo(W * 0.92, H);
  ctx.lineTo(W * 0.08, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // bench
  ctx.save();
  ctx.fillStyle = '#152018';
  ctx.fillRect(70, 930, 160, 16);
  ctx.fillRect(80, 946, 10, 44);
  ctx.fillRect(210, 946, 10, 44);
  ctx.restore();
  // Marius & Cosette, distant
  drawFigure(ctx, {
    x: 320,
    y: 980,
    h: 260,
    t,
    pose: 'stand',
    facing: 1,
    color: '#070707',
    rim: '#e4c17c',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  drawFigure(ctx, {
    x: 420,
    y: 980,
    h: 250,
    t: t + 1,
    pose: 'stand',
    facing: -1,
    color: '#070707',
    rim: '#d8b16c',
    kind: 'woman',
    hair: 'long',
    skirt: true,
    coat: false,
  });
  // golden thread between them
  const reveal = clamp((t - 84) / 5);
  if (reveal > 0) {
    goldThread(ctx, [[340, 880], [380, 870], [420, 880]], reveal, t, '#e8bd6d', 2);
  }
  // floating leaves
  ctx.save();
  ctx.fillStyle = 'rgba(204,180,112,0.4)';
  for (let i = 0; i < 18; i++) {
    const x = (hash(i * 4.1) * W + t * 8) % W;
    const y = (hash(i * 7.3) * H + t * 18) % H;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t + i);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  petals(ctx, t, 18, '#c9a45e', 0.3, 200);
  paper(ctx, t, 0.5, 1);
}

function funeral(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#1b1c1d'],
    [0.4, '#51504a'],
    [0.62, '#b5a184'],
    [0.7, '#7c7162'],
    [1, '#161513'],
  ]);
  citySkyline(ctx, 800, '#242521', 17, { minH: 110, maxH: 260, windows: true, windowColor: '#c89450', alpha: 0.5 });
  ctx.fillStyle = '#24231f';
  ctx.fillRect(0, 830, W, H - 830);
  // crowd
  drawCrowd(ctx, t, 1000, 24, '#131311', 0.9, 23, 1.05);
  // coffin
  ctx.save();
  ctx.fillStyle = '#0b0a08';
  ctx.beginPath();
  ctx.moveTo(270, 840);
  ctx.lineTo(450, 840);
  ctx.lineTo(470, 890);
  ctx.lineTo(250, 890);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,173,91,0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // pallbearers
  for (const x of [250, 470]) {
    drawFigure(ctx, {
      x,
      y: 980,
      h: 280,
      t: t + x,
      pose: 'carry',
      facing: x < 360 ? 1 : -1,
      color: '#0a0908',
      alpha: 0.9,
      coat: true,
      hat: 'top',
      shadow: false,
    });
  }
  // flags
  for (const [x, h] of [[140, 300], [350, 360], [570, 330], [680, 280]] as const) {
    drawFlag(ctx, x, 900, h, t + x, '#8d2b27');
  }
  // smoke and tension
  smoke(ctx, t, 520, 780, '#9a907f', 0.09, 9);
  // rifles
  for (let i = 0; i < 5; i++) {
    drawRifle(ctx, 70 + i * 130, 920 + i * 7, 210, -0.16 + i * 0.05, '#0a0907');
  }
  paper(ctx, t, 0.52, 1);
}

export function paris(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 22) {
    parisSkyline(ctx, t);
  } else if (t < 42) {
    gorbeau(ctx, t);
  } else if (t < 60) {
    rooftops(ctx, t);
  } else if (t < 78) {
    gavroche(ctx, t);
  } else if (t < 96) {
    luxembourg(ctx, t);
  } else {
    funeral(ctx, t);
  }
  finish(ctx, t, s.quality, 0.5);
}
