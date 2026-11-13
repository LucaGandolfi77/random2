import { H, W } from '../timeline';
import {
  glow,
  goldThread,
  hatch,
  ironGate,
  lantern,
  paper,
  rain,
  stars,
  tree,
} from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import { drawFigure, drawProfile, drawTwoHands } from '../figures';
import type { SceneContext } from './common';
import {
  finish,
  fireflies,
  lampPost,
  moon,
  petals,
  petalsOnGround,
  rose,
  sky,
  street,
  windowFrame,
} from './common';

function gardenBase(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#050c10'],
    [0.3, '#0b1a1d'],
    [0.55, '#152a27'],
    [0.68, '#1a2c25'],
    [1, '#050806'],
  ]);
  stars(ctx, t, 45, 420, 0.4);
  moon(ctx, W * 0.72, 250, 46, '#e6e0c5', 0.75);
  // house silhouette left
  ctx.save();
  ctx.fillStyle = '#0a0e0c';
  ctx.fillRect(-40, 390, 220, 560);
  ctx.beginPath();
  ctx.moveTo(-50, 390);
  ctx.lineTo(70, 300);
  ctx.lineTo(200, 390);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(217,173,91,0.17)';
    ctx.fillRect(10, 470 + i * 110, 34, 54);
  }
  ctx.fillStyle = '#0a0e0c';
  ctx.fillRect(150, 470, 60, 460);
  ctx.restore();
  // garden wall
  ctx.save();
  ctx.fillStyle = '#121912';
  ctx.fillRect(0, 800, W, 150);
  ctx.strokeStyle = 'rgba(180,190,165,0.1)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    ctx.strokeRect(i * 56 - 4, 810 + (i % 2) * 8, 50, 128);
  }
  ctx.restore();
  // gate
  ironGate(ctx, 250, 940, 230, 280, '#060a07', 0.95);
  // roses climbing
  for (let i = 0; i < 10; i++) {
    const x = 180 + hash(i * 4.1) * 360;
    const y = 700 + hash(i * 7.3) * 200;
    ctx.save();
    ctx.strokeStyle = 'rgba(35,48,35,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 930);
    ctx.quadraticCurveTo(x - 12, 820, x + 8, y);
    ctx.stroke();
    ctx.restore();
    rose(ctx, x + 8, y, 8 + hash(i) * 6, i % 2 ? '#b56b67' : '#c88d7f', 0.7);
  }
  // shrubs
  for (let i = 0; i < 9; i++) {
    const x = hash(i * 5.3) * W;
    ctx.fillStyle = 'rgba(10,20,14,0.85)';
    ctx.beginPath();
    ctx.ellipse(x, 960 + hash(i) * 60, 50 + hash(i * 2.1) * 60, 30 + hash(i) * 20, 0, 0, TAU);
    ctx.fill();
  }
  fireflies(ctx, t, 26, '#e7c172', 0.45, 500, 1000);
  glow(ctx, 370, 800, 250, '#e5c27a', 0.05);
  petals(ctx, t, 12, '#c88d7f', 0.3, 200);
}

function gateMeeting(ctx: CanvasRenderingContext2D, t: number): void {
  gardenBase(ctx, t);
  // Cosette inside the garden
  drawFigure(ctx, {
    x: 460,
    y: 985,
    h: 400,
    t,
    pose: 'stand',
    facing: -1,
    color: '#050706',
    rim: '#e5c27c',
    kind: 'woman',
    hair: 'long',
    skirt: true,
    coat: false,
  });
  // Marius outside
  drawFigure(ctx, {
    x: 260,
    y: 1000,
    h: 410,
    t: t + 2,
    pose: 'stand',
    facing: 1,
    color: '#050606',
    rim: '#c9b47e',
    kind: 'man',
    hat: 'top',
    coat: true,
  });
  // gate bars in front
  ironGate(ctx, 330, 990, 110, 300, '#050806', 0.9);
  // hands on the bars
  if (t > 44) {
    const reach = smooth((t - 44) / 4);
    const handY = 890 - reach * 6;
    drawTwoHands(ctx, 350, handY, 420, handY + 2, 12, '#080706', '#e9c477', t);
    goldThread(ctx, [[350, handY], [385, handY - 4], [420, handY + 2]], 1, t, '#e9c477', 1.6);
  }
}

function handClose(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, [
    [0, '#03080a'],
    [0.45, '#0a1718'],
    [0.72, '#132623'],
    [1, '#030605'],
  ]);
  // moonlight behind the bars
  glow(ctx, W / 2, 640, 380, '#c9d8c9', 0.07);
  moon(ctx, W * 0.76, 250, 34, '#e5dfc4', 0.5);
  fireflies(ctx, t, 34, '#e7c172', 0.5, 300, 1000);

  // Tall gate bars, soft in the dark.
  ctx.save();
  ctx.strokeStyle = 'rgba(5,8,6,0.95)';
  ctx.lineWidth = 11;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(115 + i * 82, 0);
    ctx.lineTo(115 + i * 82, H);
    ctx.stroke();
  }
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(40, 700);
  ctx.lineTo(W - 40, 700);
  ctx.stroke();
  ctx.restore();

  // Two forearms reach through the gate; hands meet at the centre.
  const breathe = Math.sin(t * 1.3) * 3;
  ctx.save();
  ctx.strokeStyle = '#040504';
  ctx.lineCap = 'round';
  ctx.lineWidth = 58;
  ctx.beginPath();
  ctx.moveTo(10, 1130);
  ctx.quadraticCurveTo(140, 980, 338, 812 + breathe);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 10, 1120);
  ctx.quadraticCurveTo(W - 130, 975, 392, 810 + breathe);
  ctx.stroke();
  // palms
  ctx.fillStyle = '#040504';
  ctx.beginPath();
  ctx.ellipse(344, 809 + breathe, 46, 24, -0.35, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(383, 807 + breathe, 44, 23, -0.48, 0, TAU);
  ctx.fill();
  // interlaced fingers
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = '#040504';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(334 + i * 12, 800 + breathe);
    ctx.quadraticCurveTo(340 + i * 12, 782 + breathe, 331 + i * 12, 772 + breathe);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(388 - i * 10, 799 + breathe);
    ctx.quadraticCurveTo(383 - i * 10, 784 + breathe, 391 - i * 10, 775 + breathe);
    ctx.stroke();
  }
  // warm rim along the arms and knuckles
  ctx.strokeStyle = 'rgba(226,190,120,0.5)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(20, 1090);
  ctx.quadraticCurveTo(150, 950, 330, 792 + breathe);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 20, 1080);
  ctx.quadraticCurveTo(W - 140, 945, 395, 790 + breathe);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(360, 800 + breathe, 23, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();

  // The golden thread winds through their fingers.
  const reveal = clamp((t - 45) / 4);
  if (reveal > 0) {
    goldThread(
      ctx,
      [
        [300, 884],
        [332, 840],
        [355, 806 + breathe],
        [378, 790 + breathe],
        [400, 820],
        [432, 886],
      ],
      reveal,
      t,
      '#edc679',
      2.3,
    );
  }
  glow(ctx, 368, 805 + breathe, 110, '#e9c477', 0.16);
  petals(ctx, t, 20, '#c88d7f', 0.35, 300);
  paper(ctx, t, 0.55, 1);
}

function eponineRain(ctx: CanvasRenderingContext2D, t: number): void {
  street(ctx, t, {
    skyTop: '#050b10',
    skyBottom: '#151c20',
    ground: '#070808',
    seed: 61,
    lamps: 1,
  });
  // distantly, warm window with two shadows
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(226,163,75,0.2)';
  ctx.fillRect(60, 690, 110, 90);
  glow(ctx, 115, 735, 150, '#e2a34b', 0.09);
  ctx.restore();
  const flick = 0.85 + Math.sin(t * 2.2) * 0.15;
  glow(ctx, 620, 820, 280, '#d9a354', 0.09 * flick);
  // Eponine
  drawFigure(ctx, {
    x: 400,
    y: 1030,
    h: 430,
    t,
    pose: 'stand',
    facing: -1,
    color: '#040506',
    rim: '#a8b8bd',
    kind: 'woman',
    hair: 'short',
    skirt: true,
    coat: false,
  });
  // shawl
  ctx.save();
  ctx.strokeStyle = '#0b0b0b';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(380, 820);
  ctx.quadraticCurveTo(320, 900, 345, 1000);
  ctx.stroke();
  ctx.restore();
  // rain and puddle
  rain(ctx, t, 140, 0.42, 0.16, '#bfcdd0', 1000);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.1;
  const g = ctx.createLinearGradient(0, 980, 0, 1100);
  g.addColorStop(0, 'rgba(160,180,184,0.2)');
  g.addColorStop(1, 'rgba(160,180,184,0)');
  ctx.fillStyle = g;
  ctx.fillRect(330, 980, 240, 130);
  ctx.restore();
  paper(ctx, t, 0.48, 1);
}

function valjeanWindow(ctx: CanvasRenderingContext2D, t: number): void {
  // garden outside, as seen through a tall window
  sky(ctx, [
    [0, '#07100f'],
    [0.45, '#11211e'],
    [0.68, '#1b2a23'],
    [1, '#060a07'],
  ]);
  stars(ctx, t, 25, 300, 0.3);
  moon(ctx, W * 0.7, 300, 28, '#e3dec4', 0.4);
  ironGate(ctx, 390, 950, 210, 300, '#050806', 0.9);
  // Cosette & Marius tiny in the garden
  drawFigure(ctx, {
    x: 410,
    y: 940,
    h: 195,
    t,
    pose: 'stand',
    facing: 1,
    color: '#050606',
    rim: '#d9b772',
    kind: 'woman',
    hair: 'long',
    skirt: true,
    coat: false,
    shadow: false,
  });
  drawFigure(ctx, {
    x: 350,
    y: 940,
    h: 195,
    t: t + 2,
    pose: 'stand',
    facing: 1,
    color: '#050606',
    rim: '#b9ab7c',
    kind: 'man',
    hat: 'top',
    coat: true,
    shadow: false,
  });
  fireflies(ctx, t, 18, '#e5c172', 0.35, 480, 900);
  // room frame
  ctx.save();
  ctx.fillStyle = 'rgba(5,4,3,0.88)';
  ctx.fillRect(0, 0, 170, H);
  ctx.fillRect(600, 0, 120, H);
  ctx.fillRect(0, 0, W, 180);
  ctx.fillRect(0, 1060, W, H - 1060);
  ctx.strokeStyle = '#0a0705';
  ctx.lineWidth = 22;
  ctx.strokeRect(170, 180, 430, 880);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(385, 180);
  ctx.lineTo(385, 1060);
  ctx.moveTo(170, 620);
  ctx.lineTo(600, 620);
  ctx.stroke();
  ctx.restore();
  // Valjean, huge in the foreground, looking out
  drawProfile(ctx, 150, 1080, 900, 1, t, {
    color: '#030303',
    hair: '#2c261d',
    eye: '#d8bf86',
    hairLong: false,
    rim: '#c9a86c',
  });
  // his hand on the curtain
  ctx.save();
  ctx.fillStyle = '#050403';
  ctx.beginPath();
  ctx.ellipse(250, 930, 32, 54, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
  // curtain
  ctx.save();
  ctx.fillStyle = 'rgba(38,24,18,0.55)';
  ctx.beginPath();
  ctx.moveTo(120, 180);
  ctx.quadraticCurveTo(230, 500, 180, 1060);
  ctx.lineTo(40, 1060);
  ctx.lineTo(40, 180);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  paper(ctx, t, 0.5, 1);
}

function emptyGarden(ctx: CanvasRenderingContext2D, t: number): void {
  gardenBase(ctx, t);
  // gate ajar
  ctx.save();
  ctx.translate(370, 940);
  ctx.rotate(-0.08);
  ironGate(ctx, -120, 0, 240, 280, '#050806', 0.95);
  ctx.restore();
  // letter on the ground
  ctx.save();
  ctx.translate(430, 1040);
  ctx.rotate(0.16);
  ctx.fillStyle = 'rgba(230,219,193,0.75)';
  ctx.fillRect(-34, -24, 68, 48);
  ctx.strokeStyle = 'rgba(73,58,40,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-34, -24);
  ctx.lineTo(0, 2);
  ctx.lineTo(34, -24);
  ctx.stroke();
  ctx.restore();
  glow(ctx, 430, 1040, 150, '#d9ad5b', 0.08);
  petalsOnGround(ctx, 990, '#c88d7f', 26, 8);
  petals(ctx, t, 20, '#c88d7f', 0.4, 200);
  // bench
  ctx.save();
  ctx.fillStyle = '#0b120d';
  ctx.fillRect(120, 1000, 140, 12);
  ctx.fillRect(130, 1012, 8, 40);
  ctx.fillRect(242, 1012, 8, 40);
  ctx.restore();
  paper(ctx, t, 0.5, 1);
}

export function jardin(s: SceneContext): void {
  const { ctx, t } = s;
  if (t < 22) {
    gardenBase(ctx, t);
    drawFigure(ctx, {
      x: 450,
      y: 985,
      h: 405,
      t,
      pose: 'stand',
      facing: -1,
      color: '#050706',
      rim: '#e5c27c',
      kind: 'woman',
      hair: 'long',
      skirt: true,
      coat: false,
    });
    // she holds a rose
    rose(ctx, 390, 880, 11, '#c88d7f', 0.9);
  } else if (t < 42) {
    gateMeeting(ctx, t);
  } else if (t < 60) {
    handClose(ctx, t);
  } else if (t < 78) {
    eponineRain(ctx, t);
  } else if (t < 94) {
    valjeanWindow(ctx, t);
  } else {
    emptyGarden(ctx, t);
  }
  finish(ctx, t, s.quality, 0.5);
}
