import { H, W } from '../timeline';
import {
  archPath,
  archWindow,
  citySkyline,
  glow,
  hatch,
  ironGate,
  lantern,
  paper,
  stars,
  tree,
  vignette,
  windowLight,
} from '../art';
import { TAU, clamp, hash, lerp, mod, rgba, seeded } from '../util';
import { drawFigure, drawHorse } from '../figures';

export interface SceneContext {
  ctx: CanvasRenderingContext2D;
  t: number;
  p: number;
  accent: string;
  quality: number;
}

export function sky(
  ctx: CanvasRenderingContext2D,
  stops: Array<[number, string]>,
  y0 = 0,
  y1 = H,
): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [p, c] of stops) g.addColorStop(clamp(p), c);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, y1 - y0);
}

export function radialSky(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  inner: string,
  outer: string,
): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function mountains(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  color: string,
  seed = 1,
  height = 260,
  alpha = 1,
): void {
  const r = seeded(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, baseY);
  let x = -20;
  while (x < W + 40) {
    const peak = baseY - height * (0.35 + r() * 0.65);
    const next = x + 90 + r() * 150;
    ctx.quadraticCurveTo((x + next) / 2 - 20, peak, next, baseY);
    x = next;
  }
  ctx.lineTo(W + 40, baseY + 300);
  ctx.lineTo(-20, baseY + 300);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function hills(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  color: string,
  seed = 1,
  alpha = 1,
): void {
  const r = seeded(seed + 5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 100);
  for (let x = 0; x <= W; x += 80) {
    ctx.quadraticCurveTo(x + 20, baseY - 60 * r(), x + 80, baseY + 10);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function moon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color = '#e9e2c7',
  alpha = 1,
): void {
  glow(ctx, x, y, r * 6, color, 0.14 * alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(70,66,55,0.12)';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.15, r * 0.22, 0, TAU);
  ctx.arc(x + r * 0.3, y + r * 0.25, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function sun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color = '#e3a65d',
  alpha = 1,
): void {
  glow(ctx, x, y, r * 9, color, 0.22 * alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function snowyGround(
  ctx: CanvasRenderingContext2D,
  y: number,
  color = '#cfdbe2',
  shade = '#9babb5',
  seed = 1,
): void {
  const r = seeded(seed);
  const g = ctx.createLinearGradient(0, y - 40, 0, H);
  g.addColorStop(0, color);
  g.addColorStop(0.4, shade);
  g.addColorStop(1, '#2d3942');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, y + 20);
  for (let x = 0; x <= W; x += 70) {
    ctx.quadraticCurveTo(x + 30, y - 16 + r() * 22, x + 70, y + 4 + r() * 12);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const x = r() * W;
    const yy = y + 40 + r() * (H - y);
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.quadraticCurveTo(x + 20, yy + 4, x + 50, yy + 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function house(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
  wall: string,
  roof: string,
  t: number,
  opts: {
    windows?: boolean;
    door?: boolean;
    warm?: boolean;
    seed?: number;
  } = {},
): void {
  const { windows = true, door = true, warm = true, seed = 1 } = opts;
  ctx.save();
  ctx.fillStyle = wall;
  ctx.fillRect(x - w / 2, baseY - h, w, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.62, baseY - h);
  ctx.lineTo(x, baseY - h - w * 0.38);
  ctx.lineTo(x + w * 0.62, baseY - h);
  ctx.closePath();
  ctx.fill();
  // beams
  ctx.strokeStyle = 'rgba(18,13,9,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - w / 2, baseY - h, w, h);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY - h * 0.55);
  ctx.lineTo(x + w / 2, baseY - h * 0.55);
  ctx.moveTo(x - w * 0.16, baseY - h);
  ctx.lineTo(x - w * 0.16, baseY);
  ctx.stroke();
  if (windows) {
    const wy = baseY - h * 0.78;
    windowLight(ctx, x - w * 0.28, wy, w * 0.18, h * 0.17, t, warm ? '#e9a84d' : '#aec5d0', seed);
    windowLight(ctx, x + w * 0.11, wy, w * 0.18, h * 0.17, t, warm ? '#e9a84d' : '#aec5d0', seed + 3);
  }
  if (door) {
    ctx.fillStyle = 'rgba(12,9,6,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.19, baseY);
    ctx.lineTo(x - w * 0.19, baseY - h * 0.3);
    ctx.quadraticCurveTo(x - w * 0.19, baseY - h * 0.38, x - w * 0.11, baseY - h * 0.38);
    ctx.quadraticCurveTo(x - w * 0.03, baseY - h * 0.38, x - w * 0.03, baseY - h * 0.3);
    ctx.lineTo(x - w * 0.03, baseY);
    ctx.closePath();
    ctx.fill();
    glow(ctx, x - w * 0.11, baseY - h * 0.18, w * 0.28, '#e9a84d', warm ? 0.09 : 0);
  }
  ctx.restore();
}

export function interior(
  ctx: CanvasRenderingContext2D,
  colors: { wallTop: string; wallBottom: string; floor: string; beam: string },
  t: number,
  opts: { window?: boolean; windowX?: number; seed?: number } = {},
): void {
  const { window: showWindow = true, windowX = W * 0.74, seed = 1 } = opts;
  sky(ctx, [
    [0, colors.wallTop],
    [0.72, colors.wallBottom],
    [0.73, colors.floor],
    [1, colors.floor],
  ], 0, H);
  // floorboards
  ctx.save();
  ctx.strokeStyle = rgba(colors.beam, 0.32);
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const y = H * 0.73 + i * i * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = W * 0.5 + (i - 4) * 90;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.73);
    ctx.lineTo(W * 0.5 + (x - W * 0.5) * 1.8, H);
    ctx.stroke();
  }
  // wall panels
  ctx.strokeStyle = rgba(colors.beam, 0.4);
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const x = 35 + i * 130;
    ctx.strokeRect(x, 220, 90, 540);
  }
  ctx.restore();

  if (showWindow) {
    windowLight(ctx, windowX, 220, 150, 250, t, '#dbe4dc', seed);
    ctx.save();
    ctx.strokeStyle = 'rgba(13,10,7,0.75)';
    ctx.lineWidth = 8;
    ctx.strokeRect(windowX, 220, 150, 250);
    ctx.restore();
  }
  glow(ctx, windowX + 75, 350, 320, '#c7d4d0', 0.05);
}

export function table(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  cloth?: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - h * 0.14, w, h * 0.12);
  ctx.fillRect(x - w * 0.42, y - h * 0.02, w * 0.05, h * 0.25);
  ctx.fillRect(x + w * 0.37, y - h * 0.02, w * 0.05, h * 0.25);
  if (cloth) {
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.52, y - h * 0.14);
    ctx.lineTo(x + w * 0.52, y - h * 0.14);
    ctx.lineTo(x + w * 0.48, y + h * 0.1);
    ctx.quadraticCurveTo(x + w * 0.22, y + h * 0.13, x, y + h * 0.07);
    ctx.quadraticCurveTo(x - w * 0.22, y + h * 0.13, x - w * 0.48, y + h * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function bed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: string,
  linen: string,
): void {
  ctx.save();
  ctx.fillStyle = frame;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = linen;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.52, y - h * 0.95);
  ctx.lineTo(x + w * 0.45, y - h * 0.95);
  ctx.quadraticCurveTo(x + w * 0.55, y - h * 0.5, x + w * 0.48, y - h * 0.34);
  ctx.quadraticCurveTo(x, y - h * 0.2, x - w * 0.52, y - h * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(238,230,214,0.75)';
  ctx.beginPath();
  ctx.ellipse(x - w * 0.23, y - h * 0.85, w * 0.2, h * 0.12, -0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,9,0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - w / 2, y - h, w, h);
  ctx.restore();
  glow(ctx, x - w * 0.23, y - h * 0.85, w * 0.7, '#d9ad5b', 0.045);
}

export function lampPost(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  h: number,
  t: number,
  color = '#12100c',
  light = '#e6a84f',
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, h * 0.018);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, baseY - h * 0.82);
  ctx.quadraticCurveTo(x, baseY - h * 0.92, x + h * 0.02, baseY - h * 0.94);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x - 12, baseY, 24, 12);
  ctx.restore();
  lantern(ctx, x + h * 0.02, baseY - h * 0.84, h * 0.032, t, x, light);
  glow(ctx, x, baseY - h * 0.8, h * 0.35, light, 0.08);
}

export function carriage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color = '#0d0a08',
  t = 0,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.45, y - w * 0.42);
  ctx.lineTo(x + w * 0.34, y - w * 0.46);
  ctx.quadraticCurveTo(x + w * 0.48, y - w * 0.24, x + w * 0.4, y - w * 0.04);
  ctx.lineTo(x - w * 0.38, y - w * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = w * 0.025;
  for (const wx of [x - w * 0.24, x + w * 0.28]) {
    ctx.beginPath();
    ctx.arc(wx, y + w * 0.02, w * 0.13, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, y + w * 0.02, w * 0.035, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.4;
      ctx.beginPath();
      ctx.moveTo(wx, y + w * 0.02);
      ctx.lineTo(wx + Math.cos(a) * w * 0.12, y + w * 0.02 + Math.sin(a) * w * 0.12);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.moveTo(x - w * 0.38, y - w * 0.2);
  ctx.lineTo(x - w * 0.7, y - w * 0.34);
  ctx.moveTo(x - w * 0.36, y - w * 0.1);
  ctx.lineTo(x - w * 0.68, y - w * 0.2);
  ctx.stroke();
  // lantern eyes
  glow(ctx, x + w * 0.31, y - w * 0.3, w * 0.18, '#e2a34b', 0.22);
  ctx.restore();
  drawHorse(ctx, x - w * 0.82, y, w * 0.55, color, t);
}

export function bridge(
  ctx: CanvasRenderingContext2D,
  y: number,
  color: string,
  waterTop: number,
  t: number,
  seed = 1,
): void {
  const r = seeded(seed);
  // river
  sky(ctx, [
    [0, '#060b14'],
    [waterTop / H, '#0d1823'],
    [1, '#050b11'],
  ], 0, H);
  // skyline far
  citySkyline(ctx, waterTop + 20, '#0a121b', seed, { minH: 30, maxH: 100, windows: true, windowColor: '#d9a354', alpha: 0.6 });
  stars(ctx, t, 70, waterTop * 0.8, 0.6);
  moon(ctx, W * 0.72, waterTop * 0.3, 44, '#e8e1c6', 0.8);
  // water shimmer
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 26; i++) {
    const yy = waterTop + 40 + r() * 380;
    const width = 40 + r() * 160;
    const xx = r() * W;
    ctx.globalAlpha = 0.04 + r() * 0.08;
    ctx.strokeStyle = '#9fb9c9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + width, yy);
    ctx.stroke();
  }
  ctx.restore();
  // bridge
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(-20, y, W + 40, 54);
  ctx.fillRect(-20, y - 58, W + 40, 10);
  for (let x = 20; x < W + 30; x += 82) {
    ctx.fillRect(x, y - 48, 12, 48);
    ctx.beginPath();
    ctx.arc(x + 6, y - 48, 12, Math.PI, 0);
    ctx.fill();
  }
  // arch leg
  ctx.fillRect(-20, y + 54, 92, H - y - 54);
  ctx.fillRect(W - 72, y + 54, 92, H - y - 54);
  ctx.restore();
}

export function sewerTunnel(
  ctx: CanvasRenderingContext2D,
  t: number,
  lightX = 360,
  lightY = 760,
  lightR = 340,
): void {
  sky(ctx, [
    [0, '#050806'],
    [0.5, '#0a100c'],
    [1, '#030504'],
  ], 0, H);
  // receding arches
  for (let i = 7; i >= 0; i--) {
    const scale = 1 - i * 0.105;
    const w = 560 * scale;
    const h = 760 * scale;
    const cx = W / 2;
    const baseY = 1080 - i * 24;
    ctx.save();
    ctx.strokeStyle = rgba('#7f9377', 0.14 + i * 0.014);
    ctx.lineWidth = 12 * scale;
    archPath(ctx, cx, baseY, w, h);
    ctx.stroke();
    ctx.restore();
  }
  // water
  const wg = ctx.createLinearGradient(0, 960, 0, H);
  wg.addColorStop(0, 'rgba(20,38,34,0.25)');
  wg.addColorStop(1, 'rgba(4,10,9,0.95)');
  ctx.fillStyle = wg;
  ctx.fillRect(0, 960, W, H - 960);
  // drips
  ctx.save();
  ctx.strokeStyle = 'rgba(145,172,154,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const x = mod(hash(i * 5.1) * W + t * 3, W);
    const len = 8 + hash(i * 2.3) * 20;
    const y = mod(t * (30 + hash(i) * 80) + hash(i * 3.7) * H, 1000);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, lightX, lightY, lightR, '#d9c48d', 0.18);
  glow(ctx, W / 2, 1080, 380, '#6a8a75', 0.09);
  // wet floor glints
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 9; i++) {
    const y = 1000 + i * 26;
    ctx.globalAlpha = 0.035 + i * 0.004;
    ctx.strokeStyle = '#bdd0b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120 + (i % 3) * 80, y);
    ctx.lineTo(560 - (i % 4) * 50, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function rose(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + x * 0.01;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.4, r * 0.55, r * 0.36, a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#3d241f', 0.55);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function petals(
  ctx: CanvasRenderingContext2D,
  t: number,
  count = 20,
  color = '#c97a7a',
  alpha = 0.5,
  originY = 0,
): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const r = hash(i * 2.7 + 1);
    const x = mod(r * W + Math.sin(t * 0.4 + i) * 50, W + 40) - 20;
    const y = mod(originY + hash(i * 4.3) * H + t * (16 + r * 24), H + 30) - 15;
    const rot = t * 0.6 + i;
    ctx.globalAlpha = alpha * (0.3 + hash(i * 7.1) * 0.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 + r * 3, 2 + r * 1.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function fireflies(
  ctx: CanvasRenderingContext2D,
  t: number,
  count = 28,
  color = '#e7c172',
  alpha = 0.6,
  top = 400,
  bottom = 1000,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const r = hash(i * 3.3 + 2);
    const x = mod(r * W + Math.sin(t * 0.35 + i * 1.7) * 55, W);
    const y = top + mod(hash(i * 5.7) * (bottom - top) + Math.cos(t * 0.28 + i) * 42, bottom - top);
    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * (1.1 + r) + i * 2.3));
    ctx.globalAlpha = alpha * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + r * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function wallShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
  color = 'rgba(0,0,0,0.3)',
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x - w * 0.2, baseY - h * 0.55, x + w * 0.05, baseY - h);
  ctx.quadraticCurveTo(x + w * 0.25, baseY - h * 0.62, x + w * 0.42, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function silhouettesInRoom(
  ctx: CanvasRenderingContext2D,
  t: number,
  y: number,
  count: number,
  color: string,
  alpha = 0.7,
): void {
  for (let i = 0; i < count; i++) {
    const x = 80 + (i / Math.max(1, count - 1)) * (W - 160);
    drawFigure(ctx, {
      x,
      y: y + hash(i * 2.1) * 8,
      h: 210 + hash(i * 4.3) * 60,
      t: t + i,
      phase: i * 2.3,
      color,
      alpha,
      pose: 'stand',
      facing: i % 2 ? 1 : -1,
      shadow: false,
    });
  }
}

export function street(
  ctx: CanvasRenderingContext2D,
  t: number,
  opts: {
    skyTop?: string;
    skyBottom?: string;
    ground?: string;
    seed?: number;
    wet?: boolean;
    lamps?: number;
  } = {},
): void {
  const {
    skyTop = '#0b111d',
    skyBottom = '#2a2c30',
    ground = '#0b0a09',
    seed = 1,
    wet = true,
    lamps = 3,
  } = opts;
  sky(ctx, [
    [0, skyTop],
    [0.5, skyBottom],
    [0.62, ground],
    [1, '#050504'],
  ], 0, H);
  citySkyline(ctx, 700, '#090d13', seed, { minH: 110, maxH: 250, windows: true, windowColor: '#e0a04d', alpha: 0.9 });
  citySkyline(ctx, 780, '#0b0f14', seed + 3, { minH: 80, maxH: 180, windows: true, windowColor: '#ca8b42', alpha: 0.65 });
  // street ground
  ctx.fillStyle = ground;
  ctx.fillRect(0, 860, W, H - 860);
  if (wet) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 20; i++) {
      const x = hash(i * 4.7 + seed) * W;
      const y = 880 + hash(i * 6.1) * 360;
      const w = 30 + hash(i * 8.3) * 130;
      ctx.globalAlpha = 0.03 + hash(i * 2.3) * 0.06;
      ctx.fillStyle = '#b8c6c8';
      ctx.fillRect(x, y, w, 2);
    }
    ctx.restore();
  }
  for (let i = 0; i < lamps; i++) {
    const x = 90 + (i / Math.max(1, lamps - 1)) * (W - 180);
    lampPost(ctx, x, 950 + hash(i + seed) * 50, 260, t + i, '#100d0a', '#e2a14a');
  }
  if (wet) {
    for (let i = 0; i < lamps; i++) {
      const x = 90 + (i / Math.max(1, lamps - 1)) * (W - 180);
      glow(ctx, x, 1080, 120, '#d99a47', 0.035, 2.4);
    }
  }
}

export function cemetery(
  ctx: CanvasRenderingContext2D,
  t: number,
  color = '#0c0c0c',
): void {
  sky(ctx, [
    [0, '#171b1e'],
    [0.6, '#282a29'],
    [1, '#080807'],
  ]);
  citySkyline(ctx, 650, '#20211f', 8, { minH: 60, maxH: 200, windows: false, alpha: 0.6 });
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 780, W, H - 780);
  for (let i = 0; i < 13; i++) {
    const x = 30 + i * 60 + hash(i) * 20;
    const h = 50 + hash(i * 2.2) * 90;
    ctx.fillRect(x, 780 - h, 8, h);
    ctx.fillRect(x - 14, 780 - h, 36, 7);
    ctx.beginPath();
    ctx.arc(x + 4, 780 - h, 18, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
  tree(ctx, W * 0.82, 820, 380, '#0a0a08', t, 8, 0.7, true);
}

export function windowFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = '#0a0705',
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 18;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.restore();
}

export function petalsOnGround(
  ctx: CanvasRenderingContext2D,
  y: number,
  color: string,
  count = 18,
  seed = 1,
): void {
  for (let i = 0; i < count; i++) {
    const x = hash(i * 4.1 + seed) * W;
    const yy = y + hash(i * 7.3) * 300;
    ctx.save();
    ctx.globalAlpha = 0.3 + hash(i) * 0.4;
    ctx.fillStyle = color;
    ctx.translate(x, yy);
    ctx.rotate(hash(i * 2.7) * TAU);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 + hash(i) * 3, 2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

export function roomCandles(
  ctx: CanvasRenderingContext2D,
  t: number,
  y: number,
  count: number,
  color = '#d9ad5b',
): void {
  for (let i = 0; i < count; i++) {
    const x = 70 + i * ((W - 140) / Math.max(1, count - 1));
    const h = 34 + hash(i * 3.3) * 40;
    glow(ctx, x, y - h, h * 3.5, color, 0.11);
    ctx.fillStyle = '#e8ddc6';
    ctx.fillRect(x - 3, y - h, 6, h);
    glow(ctx, x, y - h, 12, '#ffd27a', 0.2);
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.ellipse(x, y - h - 5, 2.4, 6, 0, 0, TAU);
    ctx.fill();
  }
}

export function finish(ctx: CanvasRenderingContext2D, t: number, quality: number, strength = 0.5): void {
  paper(ctx, t, strength, quality);
  vignette(ctx, 0.45);
}

export function waterSurface(
  ctx: CanvasRenderingContext2D,
  y: number,
  t: number,
  color = '#a8c0c0',
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 34; i++) {
    const xx = hash(i * 3.1) * W;
    const yy = y + hash(i * 5.9) * 200;
    const w = 24 + hash(i * 8.3) * 90;
    ctx.globalAlpha = 0.025 + hash(i * 2.7) * 0.05;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.quadraticCurveTo(xx + w * 0.5, yy + Math.sin(t + i) * 2, xx + w, yy);
    ctx.stroke();
  }
  ctx.restore();
}

export function windowRain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(200,220,225,0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const xx = x + mod(hash(i * 5.3) * w + t * 2, w);
    const yy = y + mod(hash(i * 2.7) * h + t * 40, h);
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + 2, yy + 18);
    ctx.stroke();
  }
  ctx.restore();
}

export function candleTable(
  ctx: CanvasRenderingContext2D,
  t: number,
  y: number,
  color = '#d9ad5b',
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(18,12,8,0.92)';
  ctx.fillRect(0, y, W, H - y);
  ctx.strokeStyle = 'rgba(217,173,91,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(0, y + 24 + i * 12);
    ctx.lineTo(W, y + 24 + i * 12);
    ctx.stroke();
  }
  glow(ctx, W / 2, y + 100, 500, color, 0.07, 0.5);
  ctx.restore();
}

export function archDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
): void {
  ctx.save();
  archPath(ctx, x, baseY, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

export function shadowOnWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color = 'rgba(0,0,0,0.25)',
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  drawFigure(ctx, {
    x: 0,
    y: 0,
    h,
    t: 0,
    color,
    alpha: 1,
    shadow: false,
    pose: 'stand',
  });
  ctx.restore();
}

export function litWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  color = '#e2a654',
): void {
  glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 3.5, color, 0.14);
  ctx.save();
  ctx.fillStyle = rgba(color, 0.55);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#0b0806';
  ctx.lineWidth = 6;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.restore();
  const flicker = 0.9 + Math.sin(t * 4) * 0.1;
  glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 1.4, color, 0.08 * flicker);
}

export function windowToGarden(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  sky(ctx, [
    [0, '#08131a'],
    [0.55, '#16282e'],
    [1, '#050a08'],
  ], y, y + h);
  stars(ctx, 0, 20, y + h * 0.5, 0.5);
  ironGate(ctx, x + w * 0.1, y + h, w * 0.8, h * 0.6, '#070b09', 0.8);
  ctx.restore();
  windowFrame(ctx, x, y, w, h, '#120d09');
}
