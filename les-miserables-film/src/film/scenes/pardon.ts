import { H, W } from '../timeline';
import {
  candlestick,
  candle,
  glow,
  goldThread,
  hatch,
  paper,
  windowLight,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import {
  drawClaspedHands,
  drawFigure,
  drawProfile,
  drawTwoHands,
} from '../figures';
import type { SceneContext } from './common';
import {
  archDoor,
  bed,
  finish,
  lampPost,
  petals,
  roomCandles,
  sky,
  table,
} from './common';

function wedding(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#2a2117'],
    [0.5, '#3f3222'],
    [0.7, '#241b12'],
    [1, '#0d0906'],
  ]);
  // tall windows with pale daylight
  for (const x of [90, 300]) {
    windowLight(ctx, x, 180, 110, 310, t, '#d8d4bd', x);
  }
  // arches and candles
  ctx.save();
  ctx.strokeStyle = 'rgba(217,173,91,0.2)';
  ctx.lineWidth = 6;
  for (const x of [180, 360, 540]) {
    ctx.beginPath();
    ctx.moveTo(x, 780);
    ctx.lineTo(x, 320);
    ctx.quadraticCurveTo(x, 270, x + 40, 270);
    ctx.quadraticCurveTo(x + 80, 270, x + 80, 320);
    ctx.lineTo(x + 80, 780);
    ctx.stroke();
  }
  ctx.restore();
  // long wedding table and candles
  ctx.save();
  ctx.fillStyle = '#1b130c';
  ctx.fillRect(55, 892, 610, 26);
  ctx.fillStyle = 'rgba(225,214,192,0.16)';
  ctx.beginPath();
  ctx.moveTo(65, 892);
  ctx.lineTo(655, 892);
  ctx.lineTo(635, 935);
  ctx.quadraticCurveTo(360, 955, 85, 935);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  roomCandles(ctx, t, 900, 7, '#e2b566');
  glow(ctx, 360, 800, 420, '#e2b566', 0.14);
  // flowers
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const x = 80 + i * 52;
    ctx.fillStyle = 'rgba(232,222,201,0.75)';
    ctx.beginPath();
    ctx.arc(x, 830 + Math.sin(i) * 12, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(70,98,75,0.7)';
    ctx.beginPath();
    ctx.ellipse(x + 8, 838, 7, 3, 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // guests
  for (let i = 0; i < 6; i++) {
    drawFigure(ctx, {
      x: 80 + i * 112,
      y: 1040,
      h: 300,
      t: t + i,
      pose: 'stand',
      facing: i < 3 ? 1 : -1,
      color: '#0a0806',
      alpha: 0.55,
      hat: i % 2 ? 'top' : 'bonnet',
      shadow: false,
    });
  }
  // Marius & Cosette
  drawFigure(ctx, {
    x: 310,
    y: 1020,
    h: 380,
    t,
    pose: 'stand',
    facing: 1,
    color: '#0b0906',
    rim: '#f0d08a',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  drawFigure(ctx, {
    x: 420,
    y: 1020,
    h: 350,
    t: t + 2,
    pose: 'embrace',
    facing: -1,
    color: '#0b0906',
    rim: '#f2d596',
    kind: 'woman',
    hair: 'bun',
    skirt: true,
    coat: false,
  });
  // ivory skirt, kept below the waist so the silhouette still reads
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = '#ede2cc';
  ctx.beginPath();
  ctx.moveTo(386, 870);
  ctx.quadraticCurveTo(355, 950, 365, 1035);
  ctx.quadraticCurveTo(425, 1052, 475, 1028);
  ctx.quadraticCurveTo(478, 942, 454, 868);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Valjean in the shadow at the edge
  drawFigure(ctx, {
    x: 600,
    y: 1000,
    h: 370,
    t: t + 3,
    pose: 'stand',
    facing: -1,
    color: '#050403',
    rim: '#8b6b3e',
    kind: 'man',
    hat: 'top',
    coat: true,
    alpha: 0.8,
  });
  petals(ctx, t, 16, '#e0c994', 0.35, 200);
  paper(ctx, t, 0.55, 1);
}

function thenardier(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#100c09'],
    [0.5, '#1b140f'],
    [1, '#070504'],
  ]);
  windowLight(ctx, 590, 160, 90, 190, t, '#738387', 3);
  // worn wallpaper, a picture, a shelf
  ctx.save();
  ctx.strokeStyle = 'rgba(190,160,114,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(20 + i * 92, 80);
    ctx.lineTo(20 + i * 92, 760);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(12,8,5,0.9)';
  ctx.fillRect(442, 420, 120, 155);
  ctx.strokeStyle = 'rgba(202,168,108,0.3)';
  ctx.lineWidth = 3;
  ctx.strokeRect(448, 426, 108, 143);
  ctx.fillStyle = 'rgba(198,178,140,0.16)';
  ctx.beginPath();
  ctx.arc(502, 490, 28, 0, TAU);
  ctx.fill();
  ctx.fillRect(470, 525, 64, 32);
  ctx.fillStyle = 'rgba(17,12,8,0.9)';
  ctx.fillRect(60, 500, 140, 14);
  for (const x of [78, 110, 140, 170]) {
    ctx.fillStyle = 'rgba(182,156,112,0.22)';
    ctx.fillRect(x, 460, 14, 38);
  }
  ctx.restore();
  // a low hanging lamp keeps the upper room from going dead
  ctx.save();
  ctx.strokeStyle = 'rgba(12,8,5,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(360, 0);
  ctx.lineTo(360, 285);
  ctx.stroke();
  ctx.fillStyle = '#120c08';
  ctx.beginPath();
  ctx.ellipse(360, 322, 56, 18, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(322, 320);
  ctx.quadraticCurveTo(360, 370, 398, 320);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(240,190,110,0.55)';
  ctx.beginPath();
  ctx.ellipse(360, 332, 28, 8, 0, 0, TAU);
  ctx.fill();
  glow(ctx, 360, 340, 260, '#e0a955', 0.18);
  ctx.restore();
  // soft beam from the window
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const beam = ctx.createLinearGradient(620, 200, 380, 950);
  beam.addColorStop(0, 'rgba(164,179,175,0.08)');
  beam.addColorStop(1, 'rgba(164,179,175,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(600, 180);
  ctx.lineTo(680, 180);
  ctx.lineTo(560, 950);
  ctx.lineTo(370, 950);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  table(ctx, 370, 930, 420, 220, '#170f09', 'rgba(154,121,82,0.15)');
  // a second light at the edge
  candlestick(ctx, 622, 902, 120, t, 4, true);
  glow(ctx, 622, 810, 220, '#e0aa56', 0.14);
  // Thénardier
  drawFigure(ctx, {
    x: 250,
    y: 1060,
    h: 410,
    t,
    pose: 'point',
    facing: 1,
    color: '#060503',
    rim: '#b77844',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  // Marius
  drawFigure(ctx, {
    x: 520,
    y: 1060,
    h: 390,
    t: t + 2,
    pose: 'stand',
    facing: -1,
    color: '#060504',
    rim: '#d9b36e',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  // letter, purse and ring on the table
  ctx.save();
  ctx.fillStyle = 'rgba(226,215,190,0.7)';
  ctx.fillRect(330, 892, 50, 32);
  ctx.strokeStyle = 'rgba(50,38,25,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(330, 892, 50, 32);
  ctx.fillStyle = '#d9ad5b';
  ctx.beginPath();
  ctx.arc(410, 906, 9, 0, TAU);
  ctx.fill();
  glow(ctx, 410, 906, 50, '#e7bb68', 0.16);
  ctx.restore();
  paper(ctx, t, 0.55, 1);
}

function runToValjean(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#070c11'],
    [0.5, '#131c21'],
    [0.68, '#33322c'],
    [1, '#080807'],
  ]);
  // street and house
  ctx.fillStyle = '#0a0a09';
  ctx.fillRect(0, 900, W, H - 900);
  glow(ctx, 600, 780, 300, '#d9a354', 0.11);
  ctx.fillStyle = '#171310';
  ctx.fillRect(460, 480, 250, 430);
  ctx.fillStyle = '#0d0a08';
  ctx.beginPath();
  ctx.moveTo(440, 480);
  ctx.lineTo(585, 390);
  ctx.lineTo(730, 480);
  ctx.fill();
  archDoor(ctx, 585, 910, 100, 280, 'rgba(217,163,84,0.23)', '#0a0705');
  glow(ctx, 585, 830, 180, '#d9a354', 0.13);
  // Marius running
  drawFigure(ctx, {
    x: 260,
    y: 1020,
    h: 380,
    t,
    pose: 'run',
    facing: 1,
    color: '#050504',
    rim: '#e1b96d',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  drawFigure(ctx, {
    x: 360,
    y: 1015,
    h: 370,
    t: t + 1,
    pose: 'run',
    facing: 1,
    color: '#060505',
    rim: '#c9a361',
    kind: 'man',
    hat: 'none',
    coat: true,
    alpha: 0.4,
  });
  lampPost(ctx, 90, 980, 280, t, '#0d0c0a', '#d9a354');
  paper(ctx, t, 0.5, 1);
}

function confession(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#1a130e'],
    [0.55, '#261c14'],
    [0.72, '#120d09'],
    [1, '#070504'],
  ]);
  windowLight(ctx, 560, 170, 110, 220, t, '#7b8a8b', 2);
  // simple room: chair, table
  ctx.save();
  ctx.fillStyle = '#140e0a';
  ctx.fillRect(70, 850, 170, 32);
  ctx.fillRect(85, 882, 16, 90);
  ctx.fillRect(210, 882, 16, 90);
  ctx.fillRect(80, 650, 150, 20);
  ctx.fillRect(90, 670, 14, 180);
  ctx.fillRect(206, 670, 14, 180);
  ctx.restore();
  candlestick(ctx, 180, 900, 190, t, 7, true);
  candlestick(ctx, 540, 900, 190, t, 9, true);
  glow(ctx, 360, 800, 380, '#dfaa56', 0.12);
  // Valjean seated
  drawFigure(ctx, {
    x: 240,
    y: 1080,
    h: 340,
    t,
    pose: 'sit',
    facing: 1,
    color: '#060504',
    rim: '#d7a95f',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  // Marius standing
  drawFigure(ctx, {
    x: 460,
    y: 1080,
    h: 390,
    t: t + 2,
    pose: 'reach',
    facing: -1,
    color: '#060504',
    rim: '#e2b96c',
    kind: 'man',
    hat: 'none',
    coat: true,
  });
  // papers / confession on the table
  ctx.save();
  ctx.fillStyle = 'rgba(222,211,185,0.5)';
  ctx.fillRect(290, 870, 80, 54);
  ctx.strokeStyle = 'rgba(45,34,23,0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(300, 882 + i * 9);
    ctx.lineTo(356, 882 + i * 9);
    ctx.stroke();
  }
  ctx.restore();
  hatch(ctx, 0, 500, W, 400, 12, -0.5, '#c0a06a', 0.02);
  paper(ctx, t, 0.55, 1);
}

function deathbed(ctx: CanvasRenderingContext2D, t: number, final = false): void {
  sky(ctx, [
    [0, '#20160f'],
    [0.58, '#2a1e15'],
    [0.72, '#130d08'],
    [1, '#070504'],
  ]);
  windowLight(ctx, 70, 180, 120, 240, t, '#8b9a99', 4);
  if (!final) {
    // bed frame and mattress, kept high enough to breathe above the captions
    ctx.save();
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(185, 640, 36, 330);
    ctx.fillRect(200, 858, 470, 22);
    ctx.fillRect(210, 880, 450, 82);
    ctx.fillStyle = 'rgba(222,215,198,0.4)';
    ctx.beginPath();
    ctx.moveTo(220, 858);
    ctx.lineTo(650, 858);
    ctx.lineTo(640, 892);
    ctx.lineTo(230, 892);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // pillow under the head, not around it
    ctx.save();
    ctx.fillStyle = 'rgba(232,225,207,0.5)';
    ctx.beginPath();
    ctx.ellipse(292, 834, 105, 28, -0.03, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,248,229,0.13)';
    ctx.beginPath();
    ctx.ellipse(280, 828, 64, 12, -0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
    // Valjean, eyes closed, small enough to belong to the bed
    drawProfile(ctx, 312, 805, 160, 1, t, {
      color: '#080604',
      hair: '#d3cabb',
      hairLong: false,
      rim: '#e8c47c',
    });
    // blanket over the body
    ctx.save();
    ctx.fillStyle = 'rgba(226,219,201,0.36)';
    ctx.beginPath();
    ctx.moveTo(335, 802);
    ctx.quadraticCurveTo(500, 822, 630, 836);
    ctx.quadraticCurveTo(650, 880, 620, 920);
    ctx.quadraticCurveTo(470, 940, 330, 922);
    ctx.quadraticCurveTo(302, 866, 335, 802);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,229,0.14)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(370 + i * 55, 822);
      ctx.quadraticCurveTo(460 + i * 45, 860, 600, 868);
      ctx.stroke();
    }
    ctx.restore();
    // the hand he gives to Cosette
    drawTwoHands(ctx, 350, 855, 292, 888, 13, '#080604', '#f0ca7c', t);
    // Cosette kneeling
    drawFigure(ctx, {
      x: 225,
      y: 1090,
      h: 330,
      t,
      pose: 'kneel',
      facing: 1,
      color: '#070504',
      rim: '#f0d08a',
      kind: 'woman',
      hair: 'bun',
      skirt: true,
      coat: false,
    });
    // Marius kneeling
    drawFigure(ctx, {
      x: 535,
      y: 1095,
      h: 340,
      t: t + 2,
      pose: 'kneel',
      facing: -1,
      color: '#070504',
      rim: '#e2bb70',
      kind: 'man',
      hat: 'none',
      coat: true,
    });
    candlestick(ctx, 646, 900, 210, t, 11, true);
    glow(ctx, 460, 840, 330, '#e5bc70', 0.13);
  } else {
    // the bishop's candlesticks, the last light in the room
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,4,0.2)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    glow(ctx, 360, 920, 430, '#efc477', 0.2);
    // the window at night
    ctx.save();
    ctx.beginPath();
    ctx.rect(70, 180, 120, 240);
    ctx.clip();
    ctx.fillStyle = '#0a1018';
    ctx.fillRect(70, 180, 120, 240);
    for (let i = 0; i < 13; i++) {
      const sx = 76 + hash(i * 4.7) * 108;
      const sy = 190 + hash(i * 7.3) * 220;
      ctx.fillStyle = `rgba(239,226,197,${0.15 + hash(i) * 0.5})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + hash(i * 2.1) * 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(239,226,197,0.75)';
    ctx.beginPath();
    ctx.arc(110, 242, 18, 0, TAU);
    ctx.fill();
    ctx.restore();
    // restore the window frame over the night sky
    ctx.save();
    ctx.strokeStyle = '#090705';
    ctx.lineWidth = 10;
    ctx.strokeRect(70, 180, 120, 240);
    ctx.beginPath();
    ctx.moveTo(130, 180);
    ctx.lineTo(130, 420);
    ctx.moveTo(70, 300);
    ctx.lineTo(190, 300);
    ctx.stroke();
    ctx.restore();
    // faint shapes of the two children at the edge of the light
    drawFigure(ctx, {
      x: 125,
      y: 1160,
      h: 245,
      t,
      pose: 'kneel',
      facing: 1,
      color: '#070504',
      alpha: 0.36,
      kind: 'woman',
      hair: 'bun',
      skirt: true,
      coat: false,
      shadow: false,
    });
    drawFigure(ctx, {
      x: 600,
      y: 1165,
      h: 250,
      t: t + 2,
      pose: 'kneel',
      facing: -1,
      color: '#070504',
      alpha: 0.36,
      kind: 'man',
      hat: 'none',
      coat: true,
      shadow: false,
    });
    // bedside table and the bishop's candlesticks
    ctx.save();
    ctx.fillStyle = '#0c0806';
    ctx.fillRect(0, 1118, W, H - 1118);
    ctx.fillStyle = 'rgba(222,215,198,0.14)';
    ctx.fillRect(0, 1116, W, 2);
    ctx.strokeStyle = 'rgba(180,146,92,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 1134 + i * 18);
      ctx.lineTo(W, 1134 + i * 18);
      ctx.stroke();
    }
    ctx.restore();
    candlestick(ctx, 250, 1120, 205, t, 23, true);
    candlestick(ctx, 470, 1120, 218, t, 29, true);
    // thread between the two flames, then rising
    const reveal = smooth((t - 94) / 4);
    if (reveal > 0) {
      goldThread(
        ctx,
        [
          [250, 935],
          [320, 905],
          [390, 920],
          [470, 905],
          [560, 760],
          [640, 570],
          [680, 420],
        ],
        reveal,
        t,
        '#efc477',
        2.1,
      );
    }
    glow(ctx, 360, 920, 260, '#f0ca80', 0.13);
  }
  glow(ctx, 360, 850, 350, '#e8bd6d', 0.08);
  paper(ctx, t, 0.52, 1);
}

export function pardon(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 22) {
    wedding(ctx, t);
  } else if (t < 40) {
    thenardier(ctx, t);
  } else if (t < 58) {
    runToValjean(ctx, t);
  } else if (t < 76) {
    confession(ctx, t);
  } else if (t < 94) {
    deathbed(ctx, t);
  } else {
    deathbed(ctx, t, true);
  }
  finish(ctx, t, s.quality, 0.52);
}
