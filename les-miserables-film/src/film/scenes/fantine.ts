import { H, W } from '../timeline';
import {
  candle,
  citySkyline,
  glow,
  hatch,
  paper,
  snow,
  stars,
  windowLight,
} from '../art';
import { TAU, clamp, hash, smooth } from '../util';
import { drawFigure, drawLyingFigure, drawProfile, drawTwoHands } from '../figures';
import type { SceneContext } from './common';
import { bed, finish, lampPost, sky, snowyGround, street } from './common';

function goldHair(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  length: number,
  t: number,
  alpha = 0.8,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#c99a4a';
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const sway = Math.sin(t * 1.2 + i) * 6;
    ctx.lineWidth = 1.5 + hash(i) * 1.6;
    ctx.beginPath();
    ctx.moveTo(x + (i - 3) * 6, topY);
    ctx.bezierCurveTo(
      x - 24 + sway + i * 3,
      topY + length * 0.25,
      x - 34 + sway + i * 4,
      topY + length * 0.65,
      x - 26 + i * 2,
      topY + length,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function youngLove(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#07111a'],
    [0.38, '#15232c'],
    [0.62, '#37454a'],
    [1, '#0b0d0e'],
  ]);
  stars(ctx, t, 30, 300, 0.3);
  citySkyline(ctx, 720, '#0b1218', 3, { minH: 100, maxH: 240, windows: true, windowColor: '#cf9a51', alpha: 0.7 });
  // street / quay
  ctx.fillStyle = '#0b0e10';
  ctx.fillRect(0, 845, W, H - 845);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const wet = ctx.createLinearGradient(0, 845, 0, H);
  wet.addColorStop(0, 'rgba(145,167,171,0.12)');
  wet.addColorStop(1, 'rgba(30,38,40,0)');
  ctx.fillStyle = wet;
  ctx.fillRect(0, 845, W, H - 845);
  ctx.restore();
  lampPost(ctx, 95, 980, 300, t, '#0d0c0a', '#e2a14a');
  lampPost(ctx, 635, 1010, 340, t + 2, '#0d0c0a', '#e2a14a');
  // Fantine
  drawFigure(ctx, {
    x: 300,
    y: 1060,
    h: 400,
    t: t + 1,
    pose: 'stand',
    facing: 1,
    color: '#08090b',
    rim: '#b8c7ca',
    kind: 'woman',
    hair: 'long',
    skirt: true,
    coat: false,
    shadow: true,
  });
  goldHair(ctx, 322, 700, 205, t, 0.7);
  // Tholomyès, leaving with the letter
  drawFigure(ctx, {
    x: 505,
    y: 1070,
    h: 390,
    t: t + 4,
    pose: 'walk',
    facing: 1,
    color: '#07080a',
    rim: '#9fb0b4',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  // a letter in the air
  const lx = 438 + Math.sin(t * 0.7) * 8;
  const ly = 860 + Math.sin(t * 0.9 + 1) * 5;
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(-0.18 + Math.sin(t * 0.6) * 0.04);
  ctx.fillStyle = 'rgba(231,219,194,0.88)';
  ctx.fillRect(-16, -11, 32, 22);
  ctx.strokeStyle = 'rgba(60,45,32,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, -11);
  ctx.lineTo(0, 2);
  ctx.lineTo(16, -11);
  ctx.stroke();
  ctx.restore();
  glow(ctx, lx, ly, 60, '#e3c992', 0.06);
  snow(ctx, t * 0.4, 26, 0.12);
  paper(ctx, t, 0.45, 1);
}

function factory(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#363d3e'],
    [0.55, '#23282a'],
    [0.72, '#131617'],
    [1, '#0a0c0c'],
  ]);
  // tall windows
  for (const x of [90, 270, 450, 630]) {
    windowLight(ctx, x - 55, 170, 110, 360, t, '#b8c2bc', x);
    ctx.save();
    ctx.strokeStyle = 'rgba(12,12,11,0.8)';
    ctx.lineWidth = 8;
    ctx.strokeRect(x - 55, 170, 110, 360);
    ctx.restore();
  }
  // light shafts
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const x of [90, 270, 450, 630]) {
    const g = ctx.createLinearGradient(x, 180, x + 170, 950);
    g.addColorStop(0, 'rgba(185,199,193,0.08)');
    g.addColorStop(1, 'rgba(185,199,193,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 45, 180);
    ctx.lineTo(x + 45, 180);
    ctx.lineTo(x + 230, 950);
    ctx.lineTo(x + 20, 950);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // looms
  ctx.save();
  ctx.strokeStyle = 'rgba(21,22,20,0.9)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const x = 55 + i * 148;
    ctx.strokeRect(x, 640, 112, 270);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(210,210,190,0.13)';
    for (let j = 0; j < 7; j++) {
      ctx.beginPath();
      ctx.moveTo(x + 8, 660 + j * 26);
      ctx.lineTo(x + 104, 660 + j * 26);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(21,22,20,0.9)';
    ctx.lineWidth = 5;
  }
  ctx.restore();
  // workers
  for (let i = 0; i < 5; i++) {
    const x = 110 + i * 148;
    if (i === 1) continue;
    drawFigure(ctx, {
      x,
      y: 980,
      h: 245,
      t: t + i,
      pose: 'sit',
      facing: i < 2 ? 1 : -1,
      color: '#0e1110',
      alpha: 0.85,
      kind: 'woman',
      hair: i % 2 ? 'bun' : 'long',
      shadow: false,
      skirt: true,
    });
  }
  // foreman and Fantine
  drawFigure(ctx, {
    x: 455,
    y: 1020,
    h: 310,
    t,
    pose: 'point',
    facing: -1,
    color: '#090b0a',
    rim: '#aebbb7',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  drawFigure(ctx, {
    x: 280,
    y: 1032,
    h: 300,
    t: t + 2,
    pose: 'stand',
    facing: 1,
    color: '#080a09',
    rim: '#c9d3ca',
    kind: 'woman',
    hair: 'long',
    skirt: true,
    coat: false,
  });
  goldHair(ctx, 258, 784, 122, t, 0.32);
  glow(ctx, 280, 850, 200, '#c2cec4', 0.04);
  // dust
  for (let i = 0; i < 38; i++) {
    const x = hash(i * 2.3) * W;
    const y = 300 + hash(i * 5.7) * 650;
    ctx.fillStyle = `rgba(224,224,200,${0.05 + hash(i) * 0.11})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + hash(i * 7.1), 0, TAU);
    ctx.fill();
  }
  paper(ctx, t, 0.5, 1);
}

function shearing(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#0b1419'],
    [0.5, '#243138'],
    [1, '#080b0d'],
  ]);
  // cold bokeh
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 15; i++) {
    const x = hash(i * 3.1) * W;
    const y = 250 + hash(i * 7.3) * 500;
    glow(ctx, x, y, 30 + hash(i) * 60, '#9db4bd', 0.03);
  }
  ctx.restore();
  const cut = t > 48;
  drawProfile(ctx, 432, 1040, 760, -1, t, {
    color: '#070606',
    hair: cut ? '#b98b46' : '#c99a4a',
    eye: '#d8b36a',
    hairLong: !cut,
    rim: '#aabcc0',
    tears: t > 52,
  });
  // falling hair — the golden thread, cut loose
  if (cut) {
    const fall = smooth((t - 48) / 14);
    ctx.save();
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 12; i++) {
      const r = hash(i * 2.9);
      const x = 450 + (r - 0.5) * 95 + Math.sin(t * 0.9 + i) * 14;
      const y = 620 + r * 80 + fall * (260 + r * 340);
      ctx.strokeStyle = i % 3 === 0 ? '#e2b363' : '#b98b46';
      ctx.lineWidth = 1.3 + r * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 10 + r * 20, y + 40, x - 4, y + 80 + r * 100);
      ctx.stroke();
    }
    ctx.restore();
    // scissors
    const snip = smooth((t - 48) / 0.8) * clamp((54 - t) / 1.5);
    if (snip > 0) {
      ctx.save();
      ctx.globalAlpha = snip;
      ctx.strokeStyle = '#d9d2c1';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(510, 590);
      ctx.lineTo(600, 680);
      ctx.moveTo(590, 580);
      ctx.lineTo(505, 690);
      ctx.stroke();
      glow(ctx, 550, 635, 60, '#eee6d2', 0.12);
      ctx.restore();
    }
  }
  // coin / price
  if (t > 53) {
    const a = smooth((t - 53) / 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#d9ad5b';
    ctx.beginPath();
    ctx.arc(180, 880, 26, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,55,20,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    glow(ctx, 180, 880, 90, '#e8bb68', 0.18);
    ctx.restore();
  }
  snow(ctx, t * 0.4, 22, 0.1);
  paper(ctx, t, 0.5, 1);
}

function pawnStreet(ctx: CanvasRenderingContext2D, t: number): void {
  street(ctx, t, {
    skyTop: '#0a121a',
    skyBottom: '#2c3438',
    ground: '#0a0b0c',
    seed: 17,
    lamps: 2,
  });
  // pawn shop on the right
  const sx = 540;
  ctx.save();
  ctx.fillStyle = '#14110d';
  ctx.fillRect(sx - 150, 520, 300, 380);
  ctx.fillStyle = '#1d1711';
  ctx.fillRect(sx - 130, 560, 260, 260);
  glow(ctx, sx, 690, 230, '#e2a34b', 0.13);
  ctx.fillStyle = 'rgba(226,163,75,0.36)';
  ctx.fillRect(sx - 110, 590, 220, 190);
  // window grid
  ctx.strokeStyle = '#0c0906';
  ctx.lineWidth = 8;
  ctx.strokeRect(sx - 130, 560, 260, 260);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(sx, 560);
  ctx.lineTo(sx, 820);
  ctx.moveTo(sx - 130, 690);
  ctx.lineTo(sx + 130, 690);
  ctx.stroke();
  // pawnbroker + hanging objects
  ctx.fillStyle = '#100c08';
  ctx.beginPath();
  ctx.arc(sx + 30, 680, 24, 0, TAU);
  ctx.fill();
  ctx.fillRect(sx - 16, 700, 92, 100);
  for (const [ox, oy] of [[-70, 640], [-40, 630], [70, 650]]) {
    ctx.strokeStyle = '#1b140c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + ox, 560);
    ctx.lineTo(sx + ox, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx + ox, oy + 8, 14, 0, TAU);
    ctx.stroke();
  }
  // sign with three gold balls
  ctx.fillStyle = '#100d09';
  ctx.fillRect(sx - 100, 460, 200, 58);
  ctx.fillStyle = '#d9ad5b';
  for (const [bx, by] of [[-40, 489], [0, 475], [40, 489]]) {
    ctx.beginPath();
    ctx.arc(sx + bx, by, 8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // Fantine, shorn, with a coin
  drawFigure(ctx, {
    x: 245,
    y: 1030,
    h: 365,
    t: t + 2,
    pose: 'reach',
    facing: 1,
    color: '#070707',
    rim: '#c3ced0',
    kind: 'woman',
    hair: 'short',
    skirt: true,
    coat: false,
  });
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#d9ad5b';
  ctx.beginPath();
  ctx.arc(310, 844, 11, 0, TAU);
  ctx.fill();
  glow(ctx, 310, 844, 46, '#e9bf70', 0.22);
  ctx.restore();
  snow(ctx, t, 75, 0.45);
  paper(ctx, t, 0.45, 1);
}

function arrestAndRescue(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#081019'],
    [0.42, '#15232d'],
    [0.62, '#384850'],
    [0.72, '#d4d8d2'],
    [0.84, '#9eabb0'],
    [1, '#1d272c'],
  ]);
  stars(ctx, t, 45, 400, 0.45);
  citySkyline(ctx, 720, '#0b1218', 29, { minH: 90, maxH: 210, windows: true, windowColor: '#d6a155', alpha: 0.55 });
  snowyGround(ctx, 900, '#c7d2d5', '#76878e', 33);
  // one gas lamp far away
  lampPost(ctx, 90, 990, 290, t, '#0d0b09', '#e0a653');
  // Fantine crumpled in the snow, her pale shawl catching the light
  drawFigure(ctx, {
    x: 255,
    y: 1000,
    h: 305,
    t: t + 1,
    pose: 'sit',
    facing: 1,
    color: '#050608',
    rim: '#050608',
    kind: 'woman',
    hair: 'short',
    skirt: true,
    coat: false,
  });

  // Javert's lantern
  const javertIn = smooth((t - 78) / 5);
  ctx.save();
  ctx.globalAlpha = javertIn;
  drawFigure(ctx, {
    x: 555,
    y: 970,
    h: 370,
    t,
    pose: 'stand',
    facing: -1,
    color: '#050607',
    rim: '#b7c7cf',
    kind: 'soldier',
    hat: 'bicorne',
    coat: true,
  });
  const lx = 485;
  const ly = 805;
  glow(ctx, lx, ly, 300, '#e8b45e', 0.22);
  ctx.strokeStyle = '#090705';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(lx + 8, 815);
  ctx.lineTo(lx + 8, 880);
  ctx.stroke();
  ctx.fillStyle = '#ffce82';
  ctx.fillRect(lx - 7, 795, 30, 42);
  ctx.strokeStyle = '#0b0806';
  ctx.lineWidth = 5;
  ctx.strokeRect(lx - 10, 789, 36, 54);
  ctx.restore();
  // Valjean arrives
  const valjeanIn = smooth((t - 90) / 4);
  if (valjeanIn > 0) {
    ctx.save();
    ctx.globalAlpha = valjeanIn;
    drawFigure(ctx, {
      x: 405,
      y: 1020,
      h: 315,
      t,
      pose: 'sit',
      facing: -1,
      color: '#050505',
      rim: '#e8c37a',
      kind: 'man',
      hat: 'top',
      coat: true,
    });
    glow(ctx, 400, 1000, 260, '#e3b25e', 0.12);
    ctx.restore();
    // a hand reaching toward Fantine
    ctx.save();
    ctx.globalAlpha = valjeanIn;
    ctx.strokeStyle = '#0a0806';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(400, 930);
    ctx.quadraticCurveTo(365, 955, 338, 948);
    ctx.stroke();
    ctx.fillStyle = '#0a0806';
    ctx.beginPath();
    ctx.ellipse(330, 948, 16, 9, -0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,195,122,0.36)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(398, 924);
    ctx.quadraticCurveTo(365, 947, 340, 940);
    ctx.stroke();
    ctx.restore();
  }
  snow(ctx, t, 120, 0.7);
  paper(ctx, t, 0.5, 1);
}

function hospital(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#171615'],
    [0.58, '#2a2722'],
    [0.72, '#15120f'],
    [1, '#080706'],
  ]);
  // window, snow outside
  windowLight(ctx, 70, 180, 150, 280, t, '#aebfc4', 6);
  hatch(ctx, 70, 180, 150, 280, 12, -0.7, '#c7d6d8', 0.05);
  bed(ctx, 390, 1010, 470, 300, '#1b1410', 'rgba(218,212,194,0.58)');
  // Fantine on the pillow
  drawProfile(ctx, 270, 815, 260, 1, t, {
    color: '#0a0806',
    hair: '#a98643',
    eye: '#c7a25e',
    hairLong: false,
    tears: false,
  });
  ctx.save();
  ctx.fillStyle = 'rgba(210,204,188,0.5)';
  ctx.beginPath();
  ctx.ellipse(390, 850, 160, 62, -0.04, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Valjean seated
  drawFigure(ctx, {
    x: 560,
    y: 1090,
    h: 330,
    t,
    pose: 'sit',
    facing: -1,
    color: '#080605',
    rim: '#d9ad5b',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  // candle
  candle(ctx, 610, 870, 150, t, 9, true);
  glow(ctx, 610, 770, 250, '#e0a955', 0.13);
  // hands
  const fall = smooth((t - 114) / 2);
  const handY = 905 + fall * 56;
  drawTwoHands(ctx, 445, 925, 560, handY, 18, '#0a0806', '#e8bd6d', t);
  // thread rises when the hand falls
  if (fall > 0.2) {
    ctx.save();
    ctx.globalAlpha = (fall - 0.2) / 0.8;
    ctx.strokeStyle = '#e8bd6d';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(610, 720);
    ctx.bezierCurveTo(640, 560, 560, 430, 640, 290);
    ctx.stroke();
    glow(ctx, 625, 500, 100, '#e8bd6d', 0.1);
    ctx.restore();
  }
  // candle out
  if (t > 116) {
    ctx.save();
    ctx.globalAlpha = smooth((t - 116) / 2);
    ctx.fillStyle = 'rgba(5,4,3,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  paper(ctx, t, 0.5, 1);
}

export function fantine(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 20) {
    youngLove(ctx, t);
  } else if (t < 38) {
    factory(ctx, t);
  } else if (t < 56) {
    shearing(ctx, t);
  } else if (t < 72) {
    pawnStreet(ctx, t);
  } else if (t < 104) {
    arrestAndRescue(ctx, t);
  } else {
    hospital(ctx, t);
  }
  finish(ctx, t, s.quality, 0.5);
}
