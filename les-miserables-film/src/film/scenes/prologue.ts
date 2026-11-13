import { H, W } from '../timeline';
import { archPath, candle, glow, goldThread, hatch, paper, snow, stars, tree } from '../art';
import { TAU, clamp, hash, rgba, smooth } from '../util';
import { SERIF, SANS, drawLetterSpaced, trackedText } from '../text';
import { drawFigure } from '../figures';
import type { SceneContext } from './common';
import { finish, hills, moon, mountains, sky, snowyGround } from './common';

function cathedral(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const base = 1130;
  // central nave arches
  for (let i = 0; i < 3; i++) {
    const w = 360 - i * 60;
    const h = 800 - i * 40;
    archPath(ctx, W / 2, base - i * 22, w, h);
    ctx.fillStyle = `rgba(10,8,6,${0.2 + i * 0.12})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,94,68,0.16)';
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  // columns
  for (const x of [92, 628]) {
    ctx.fillStyle = 'rgba(12,9,7,0.7)';
    ctx.fillRect(x - 22, 260, 44, 900);
    ctx.strokeStyle = 'rgba(150,126,84,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 18, 280, 36, 850);
  }
  // rose window suggestion
  const cx = W / 2;
  const cy = 340;
  ctx.strokeStyle = 'rgba(150,126,84,0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 116, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
    ctx.lineTo(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, TAU);
  ctx.stroke();
  ctx.restore();
  snow(ctx, t * 0.4, 26, 0.12);
}

function titleCard(ctx: CanvasRenderingContext2D, local: number): void {
  const alpha = smooth((local - 20) / 2.4) * smooth((40.5 - local) / 2.2);
  if (alpha <= 0) return;
  const rise = (1 - smooth((local - 20) / 3)) * 14;
  ctx.save();
  ctx.globalAlpha = alpha;
  const scrim = ctx.createLinearGradient(0, 280, 0, 850);
  scrim.addColorStop(0, 'rgba(5,4,3,0)');
  scrim.addColorStop(0.3, 'rgba(5,4,3,0.34)');
  scrim.addColorStop(0.75, 'rgba(5,4,3,0.24)');
  scrim.addColorStop(1, 'rgba(5,4,3,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 280, W, 570);

  drawLetterSpaced(ctx, 'D’APRÈS VICTOR HUGO', W / 2, 348 + rise, `500 18px ${SANS}`, 4.2, '#d9ad5b', alpha * 0.66);
  drawLetterSpaced(ctx, 'LES', W / 2, 402 + rise, `500 21px ${SANS}`, 9, '#d9ad5b', alpha * 0.9);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 92px ${SERIF}`;
  ctx.fillStyle = '#efe5d2';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 22;
  ctx.fillText('MISÉRABLES', W / 2, 468 + rise);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(217,173,91,0.72)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 132, 530 + rise);
  ctx.lineTo(W / 2 - 12, 530 + rise);
  ctx.moveTo(W / 2 + 12, 530 + rise);
  ctx.lineTo(W / 2 + 132, 530 + rise);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, 530 + rise);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d9ad5b';
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();

  ctx.font = `italic 500 38px ${SERIF}`;
  ctx.fillStyle = '#e8c27b';
  ctx.fillText('LE FIL D’OR', W / 2, 585 + rise);
  drawLetterSpaced(
    ctx,
    'UN FILM DESSINÉ EN CODE',
    W / 2,
    640 + rise,
    `500 14px ${SANS}`,
    5.1,
    'rgba(236,225,202,0.48)',
    alpha,
  );
  ctx.restore();
}

function threadFinale(ctx: CanvasRenderingContext2D, local: number): void {
  const a = smooth((local - 66) / 3);
  if (a <= 0) return;
  const reveal = clamp((local - 68) / 12);
  const pts: Array<[number, number]> = [
    [W / 2, 760],
    [W / 2 + 60, 742],
    [W * 0.68, 690],
    [W + 40, 630],
  ];
  ctx.save();
  ctx.globalAlpha = a;
  goldThread(ctx, pts, reveal, local, '#e7bb68', 2.2);
  ctx.restore();
}

export function prologue(s: SceneContext): void {
  const { ctx, t } = s;

  if (t < 42) {
    sky(ctx, [
      [0, '#050403'],
      [0.55, '#0b0907'],
      [1, '#040302'],
    ]);
    // faint blue moonlight through the far window
    glow(ctx, W * 0.74, 360, 260, '#9fb4c0', 0.035);
    cathedral(ctx, t, t < 4 ? smooth(t / 2) : 1);
    // stone table / altar
    ctx.fillStyle = '#0b0907';
    ctx.fillRect(0, 1010, W, H - 1010);
    ctx.fillStyle = 'rgba(160,135,92,0.08)';
    ctx.fillRect(0, 1010, W, 3);
    const lit = t > 0.65;
    const candleGlow = lit ? smooth((t - 0.65) / 1.8) : 0;
    if (lit) {
      // little brass dish under the candle
      ctx.save();
      const dish = ctx.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0);
      dish.addColorStop(0, '#3b2a17');
      dish.addColorStop(0.45, '#a27b3f');
      dish.addColorStop(0.62, '#dbc18a');
      dish.addColorStop(1, '#3b2a17');
      ctx.fillStyle = dish;
      ctx.beginPath();
      ctx.ellipse(W / 2, 1045, 88, 15, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,197,124,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      candle(ctx, W / 2, 1042, 215, t, 7, true);
      glow(ctx, W / 2, 840, 520, '#d9a354', 0.1 * candleGlow);
      // a warm pool of light on the stone
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const pool = ctx.createRadialGradient(W / 2, 1046, 0, W / 2, 1046, 280);
      pool.addColorStop(0, `rgba(217,163,84,${0.12 * candleGlow})`);
      pool.addColorStop(1, 'rgba(217,163,84,0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(W / 2, 1046, 280, 70, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else {
      // match flare
      const flare = clamp((t - 1.2) / 0.5) * clamp((2.7 - t) / 0.5);
      glow(ctx, W / 2, 900, 130, '#ffb35c', 0.4 * flare);
    }
    if (t < 20) {
      ctx.save();
      ctx.globalAlpha = smooth((t - 7) / 2) * smooth((19 - t) / 2);
      drawLetterSpaced(ctx, 'D’APRÈS VICTOR HUGO', W / 2, 720, `500 17px ${SANS}`, 4.4, '#d9ad5b', 0.6);
      ctx.restore();
    }
    hatch(ctx, 0, 0, W, 300, 8, -0.6, '#c0a980', 0.015);
    titleCard(ctx, t);
    paper(ctx, t, 0.55, s.quality);
  } else if (t < 68) {
    // The road to Digne.
    sky(ctx, [
      [0, '#0a1420'],
      [0.35, '#22303a'],
      [0.62, '#9b7c55'],
      [0.73, '#c7a26c'],
      [0.78, '#d3c6a9'],
      [1, '#182027'],
    ], 0, H);
    stars(ctx, t, 55, 480, 0.55);
    moon(ctx, W * 0.75, 230, 38, '#e8e0c4', 0.75);
    hills(ctx, 850, '#26323a', 3, 0.85);
    mountains(ctx, 840, '#1b262f', 7, 240, 0.8);
    snowyGround(ctx, 900, '#b7c6cd', '#6f838e', 11);
    // far house
    const hx = W * 0.19;
    ctx.fillStyle = '#15181a';
    ctx.fillRect(hx - 55, 820, 110, 90);
    ctx.beginPath();
    ctx.moveTo(hx - 70, 820);
    ctx.lineTo(hx, 770);
    ctx.lineTo(hx + 70, 820);
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(226,163,75,0.55)';
    ctx.fillRect(hx - 22, 843, 18, 24);
    glow(ctx, hx - 13, 855, 110, '#e2a34b', 0.14);
    ctx.restore();
    tree(ctx, W * 0.84, 960, 390, '#111a1e', t, 4, 0.95, true);
    // small traveler
    const walk = smooth((t - 46) / 20);
    const x = W * 0.52 + walk * 26;
    drawFigure(ctx, {
      x,
      y: 948,
      h: 122,
      t,
      pose: 'walk',
      facing: 1,
      color: '#0b0d0e',
      rim: '#caa46a',
      kind: 'man',
      hat: 'cap',
    });
    snow(ctx, t, 70, 0.4);
    paper(ctx, t, 0.42, s.quality);
  } else {
    // Candle and the golden thread, close.
    sky(ctx, [
      [0, '#050403'],
      [0.6, '#0b0806'],
      [1, '#030202'],
    ]);
    ctx.save();
    ctx.globalAlpha = 0.9;
    archPath(ctx, W / 2, 1120, 430, 860);
    ctx.strokeStyle = 'rgba(120,100,70,0.15)';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
    glow(ctx, W / 2, 830, 500, '#d9a354', 0.13);
    candle(ctx, W / 2, 1050, 230, t, 7, true);
    glow(ctx, W / 2, 840, 300, '#ffcf82', 0.08);
    threadFinale(ctx, t);
    snow(ctx, t * 0.35, 24, 0.1);
    hatch(ctx, 0, 650, W, 500, 9, -0.5, '#b59a70', 0.012);
    paper(ctx, t, 0.5, s.quality);
    // slow closing fade
    const endFade = clamp((t - 88) / 2);
    if (endFade > 0) {
      ctx.fillStyle = `rgba(4,3,2,${endFade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  finish(ctx, t, s.quality, 0.42);
}
