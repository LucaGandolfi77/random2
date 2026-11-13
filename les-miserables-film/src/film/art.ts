import { H, W } from './timeline';
import { TAU, clamp, hash, lerp, mod, noise1, rgba, seeded, smooth } from './util';

const HASHED = (n: number): number => hash(n);

/* ------------------------------------------------------------------ */
/* Ink, paper and light                                               */
/* ------------------------------------------------------------------ */

export function boil(t: number): number {
  return Math.floor(t * 8);
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

export function inkLine(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  width: number,
  alpha = 1,
  seed = 1,
  t = 0,
  jitter = 1.2,
): void {
  const b = boil(t);
  const r = seeded(seed * 733 + b * 37);
  const jittered = points.map(([x, y]) => [
    x + (r() - 0.5) * jitter * 2,
    y + (r() - 0.5) * jitter * 2,
  ] as [number, number]);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  smoothPath(ctx, jittered);
  ctx.stroke();
  ctx.restore();
}

export function hatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  spacing: number,
  angle: number,
  color: string,
  alpha = 0.12,
  offset = 0,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const diag = Math.sqrt(w * w + h * h);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  for (let i = -diag; i <= diag; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i + offset, -diag);
    ctx.lineTo(i + offset, diag);
    ctx.stroke();
  }
  ctx.restore();
}

const glowSprites = new Map<string, HTMLCanvasElement>();

function glowSprite(color: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const hit = glowSprites.get(color);
  if (hit) return hit;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.18, rgba(color, 0.62));
  grad.addColorStop(0.5, rgba(color, 0.17));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowSprites.set(color, c);
  return c;
}

export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
  squash = 1,
): void {
  if (radius <= 0) return;
  const sprite = glowSprite(color);
  if (!sprite) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - radius, y - radius * squash, radius * 2, radius * 2 * squash);
  ctx.restore();
}

export function flame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  seed = 1,
  warmth = '#ffd27a',
): void {
  const flick = noise1(t * 5.5 + seed * 3.1);
  const sway = (noise1(t * 3.2 + seed * 7.7) - 0.5) * size * 0.16;
  const height = size * (1.75 + flick * 0.25);
  const width = size * (0.46 + flick * 0.06);

  glow(ctx, x, y - height * 0.55, size * 8, warmth, 0.16 + flick * 0.03);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(x, y, x, y - height);
  g.addColorStop(0, 'rgba(255, 236, 180, 0.9)');
  g.addColorStop(0.45, warmth);
  g.addColorStop(1, 'rgba(255, 120, 35, 0.06)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - width, y);
  ctx.bezierCurveTo(x - width * 1.2, y - height * 0.32, x - width * 0.35 + sway, y - height * 0.7, x + sway, y - height);
  ctx.bezierCurveTo(x + width * 0.4 + sway, y - height * 0.65, x + width * 1.15, y - height * 0.3, x + width, y);
  ctx.quadraticCurveTo(x, y + size * 0.16, x - width, y);
  ctx.fill();
  ctx.restore();
}

export function candle(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  t: number,
  seed = 1,
  lit = true,
  color = '#e8ddc6',
): void {
  const w = height * 0.13;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.lineTo(x - w / 2, baseY - height * 0.82);
  ctx.quadraticCurveTo(x - w / 2, baseY - height * 0.9, x - w / 5, baseY - height * 0.88);
  ctx.lineTo(x + w / 2, baseY - height * 0.84);
  ctx.lineTo(x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#6a583f';
  ctx.fillRect(x - w * 0.1, baseY - height * 0.8, w * 0.18, height * 0.78);

  // wax drips
  const r = seeded(seed);
  for (let i = 0; i < 3; i++) {
    const dx = (r() - 0.5) * w;
    const dh = height * (0.06 + r() * 0.12);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + dx, baseY - height * (0.4 + r() * 0.3), w * 0.08, dh, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  if (lit) {
    flame(ctx, x, baseY - height * 0.88, height * 0.055, t, seed, '#ffd27a');
  }
}

export function goldThread(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  reveal: number,
  t: number,
  color = '#e7bb68',
  width = 2.4,
): void {
  if (points.length < 2 || reveal <= 0) return;
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    total += Math.hypot(dx, dy);
    lengths.push(total);
  }
  const target = total * clamp(reveal);
  const shown: Array<[number, number]> = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (lengths[i] <= target) {
      shown.push(points[i]);
    } else {
      const prev = lengths[i - 1];
      const f = (target - prev) / Math.max(0.001, lengths[i] - prev);
      shown.push([
        lerp(points[i - 1][0], points[i][0], f),
        lerp(points[i - 1][1], points[i][1], f),
      ]);
      break;
    }
  }
  if (shown.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = rgba(color, 0.16);
  ctx.lineWidth = width * 6;
  smoothPath(ctx, shown);
  ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.38);
  ctx.lineWidth = width * 2.4;
  smoothPath(ctx, shown);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  smoothPath(ctx, shown);
  ctx.stroke();
  ctx.restore();

  const shimmer = mod(t * 0.13, 1);
  const idx = Math.min(shown.length - 1, Math.floor(shimmer * shown.length));
  const p = shown[idx];
  glow(ctx, p[0], p[1], width * 8, color, 0.24);
}

/* ------------------------------------------------------------------ */
/* Weather and particles                                              */
/* ------------------------------------------------------------------ */

export function rain(
  ctx: CanvasRenderingContext2D,
  t: number,
  count = 120,
  alpha = 0.24,
  slant = 0.18,
  color = '#d7e2e6',
  speed = 980,
  bottom = H + 60,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const seed = HASHED(i * 2.73 + 5);
    const x = mod(seed * W * 1.3 + t * 34 + hash(i * 9.1) * 90, W + 180) - 90;
    const y = mod(seed * H + t * speed * (0.7 + hash(i + 4) * 0.8), H + 160) - 80;
    const len = 12 + hash(i * 7.4) * 34;
    ctx.globalAlpha = alpha * (0.35 + hash(i * 3.3) * 0.65);
    ctx.lineWidth = 0.7 + hash(i * 8.8) * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * slant, y + len);
    ctx.stroke();
    if (y + len > bottom) break;
  }
  ctx.restore();
}

export function snow(
  ctx: CanvasRenderingContext2D,
  t: number,
  count = 90,
  alpha = 0.55,
  color = '#e8eef1',
): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const seed = HASHED(i * 4.17 + 2);
    const drift = Math.sin(t * 0.42 + i) * 26 + noise1(t * 0.2 + i) * 14;
    const x = mod(seed * W + drift, W + 30) - 15;
    const y = mod(seed * H + t * (20 + hash(i * 5.1) * 44), H + 40) - 20;
    const size = 0.8 + hash(i * 8.3) * 2.4;
    ctx.globalAlpha = alpha * (0.25 + hash(i * 1.9) * 0.75);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function embers(
  ctx: CanvasRenderingContext2D,
  t: number,
  count = 40,
  originY = H * 0.9,
  alpha = 0.5,
  color = '#e9b05e',
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const seed = HASHED(i * 2.31 + 8);
    const speed = 22 + hash(i * 7.7) * 64;
    const y = mod(originY - seed * 200 - t * speed, H * 0.9);
    const x = mod(seed * W + Math.sin(t * 0.8 + i * 2.3) * 30, W);
    const a = alpha * (0.2 + hash(i * 3.2) * 0.8) * (0.6 + 0.4 * Math.sin(t * 2 + i));
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + hash(i * 4.4) * 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function dust(
  ctx: CanvasRenderingContext2D,
  t: number,
  count = 55,
  alpha = 0.2,
  color = '#e7d6b6',
): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const seed = HASHED(i * 3.77 + 11);
    const x = mod(seed * W + Math.sin(t * 0.17 + i) * 44, W);
    const y = mod(seed * H + Math.cos(t * 0.11 + i * 1.7) * 24 - t * 5, H);
    ctx.globalAlpha = alpha * (0.3 + hash(i * 6.2) * 0.7);
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + hash(i * 5.9) * 1.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function stars(
  ctx: CanvasRenderingContext2D,
  t: number,
  count = 90,
  maxY = H * 0.55,
  alpha = 0.8,
  color = '#efe5c4',
): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const seed = HASHED(i * 5.31 + 19);
    const x = seed * W;
    const y = hash(i * 8.17 + 3) * maxY;
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.5 + hash(i) * 1.7) + i * 2.1));
    const r = 0.55 + hash(i * 4.9) * 1.5;
    ctx.globalAlpha = alpha * twinkle;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    if (r > 1.7) {
      ctx.globalAlpha = alpha * twinkle * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function birds(
  ctx: CanvasRenderingContext2D,
  t: number,
  color = '#1a1712',
  alpha = 0.55,
  y = 300,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 7; i++) {
    const x = mod(i * 117 + t * (8 + i), W + 120) - 60;
    const yy = y + Math.sin(i * 1.7) * 38 + Math.sin(t * 0.4 + i) * 9;
    const s = 5 + (i % 3) * 2.3;
    const flap = Math.sin(t * 5 + i * 2) * 2.4;
    ctx.beginPath();
    ctx.moveTo(x - s, yy + flap);
    ctx.quadraticCurveTo(x - s * 0.3, yy - s * 0.5, x, yy);
    ctx.quadraticCurveTo(x + s * 0.3, yy - s * 0.5, x + s, yy + flap);
    ctx.stroke();
  }
  ctx.restore();
}

export function mist(
  ctx: CanvasRenderingContext2D,
  t: number,
  y: number,
  color = '#9fb0b8',
  alpha = 0.08,
  height = 160,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const offset = Math.sin(t * 0.05 + i * 2) * 80;
    const g = ctx.createLinearGradient(0, y - height / 2, 0, y + height / 2);
    g.addColorStop(0, rgba(color, 0));
    g.addColorStop(0.5, rgba(color, alpha * (0.6 + i * 0.12)));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-100 + offset + i * 40, y - height / 2, W + 200, height);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Architecture                                                       */
/* ------------------------------------------------------------------ */

export function citySkyline(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  color: string,
  seed = 1,
  opts: {
    minH?: number;
    maxH?: number;
    width?: number;
    windows?: boolean;
    windowColor?: string;
    alpha?: number;
    chimneys?: boolean;
  } = {},
): void {
  const {
    minH = 90,
    maxH = 280,
    width = W,
    windows = true,
    windowColor = '#d9a354',
    alpha = 1,
    chimneys = true,
  } = opts;
  const r = seeded(seed * 91 + 17);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  let x = -20;
  while (x < width + 30) {
    const bw = 36 + r() * 94;
    const bh = minH + r() * (maxH - minH);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - bh, bw, bh + 30);

    // Parisian roofs: steep slate, mansard, parapet, and the odd dome.
    const roof = r();
    if (roof < 0.38) {
      const roofH = 18 + r() * 34;
      ctx.beginPath();
      ctx.moveTo(x - 4, baseY - bh);
      ctx.lineTo(x + bw * 0.5, baseY - bh - roofH);
      ctx.lineTo(x + bw + 4, baseY - bh);
      ctx.closePath();
      ctx.fill();
      if (chimneys) {
        const cw = 7 + r() * 6;
        const ch = 16 + r() * 18;
        ctx.fillRect(x + bw * (0.55 + r() * 0.25), baseY - bh - ch, cw, ch);
        ctx.fillRect(x + bw * (0.55 + r() * 0.25) - 3, baseY - bh - ch, cw + 6, 3);
      }
    } else if (roof < 0.7) {
      const roofH = 13 + r() * 22;
      const inset = bw * (0.1 + r() * 0.12);
      ctx.beginPath();
      ctx.moveTo(x - 4, baseY - bh);
      ctx.lineTo(x + inset, baseY - bh - roofH);
      ctx.lineTo(x + bw - inset, baseY - bh - roofH);
      ctx.lineTo(x + bw + 4, baseY - bh);
      ctx.closePath();
      ctx.fill();
      // dormer
      if (windows && r() > 0.35) {
        ctx.fillStyle = rgba(windowColor, 0.25 + r() * 0.4);
        ctx.fillRect(x + bw * 0.5 - 6, baseY - bh - roofH * 0.7, 12, 12);
        ctx.fillStyle = color;
      }
      if (chimneys) {
        const ch = 16 + r() * 26;
        ctx.fillRect(x + bw * (0.12 + r() * 0.15), baseY - bh - roofH - ch + 4, 8, ch);
      }
    } else if (roof < 0.9) {
      ctx.fillRect(x - 2, baseY - bh - 5, bw + 4, 5);
      if (chimneys) {
        ctx.fillRect(x + bw * (0.2 + r() * 0.6), baseY - bh - 26, 9, 26);
      }
    } else {
      // a distant dome, for the Paris silhouette
      const cx = x + bw * 0.5;
      const rad = Math.min(bw * 0.36, 34);
      ctx.beginPath();
      ctx.ellipse(cx, baseY - bh, rad, rad * 0.72, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 2, baseY - bh - rad * 0.8 - 10, 4, 14);
    }

    if (windows) {
      const cols = Math.max(1, Math.floor(bw / 19));
      const rows = Math.max(1, Math.floor(bh / 26));
      const ww = 4.5;
      const wh = 8;
      for (let c = 0; c < cols; c++) {
        for (let rr = 0; rr < rows; rr++) {
          if (r() < 0.2) {
            const wx = x + 8 + c * ((bw - 16) / Math.max(1, cols));
            const wy = baseY - bh + 14 + rr * 26;
            ctx.fillStyle = rgba(windowColor, 0.28 + r() * 0.6);
            ctx.fillRect(wx, wy, ww, wh);
            // a balcony line here and there
            if (r() > 0.72) {
              ctx.globalAlpha = alpha * 0.35;
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(wx - 3, wy + wh + 2);
              ctx.lineTo(wx + ww + 3, wy + wh + 2);
              ctx.stroke();
              ctx.globalAlpha = alpha;
            }
          }
        }
      }
      ctx.fillStyle = color;
    }

    // A few pale floor bands keep the facade from reading as a modern slab.
    ctx.globalAlpha = alpha * 0.16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let fy = baseY - bh + 40; fy < baseY - 10; fy += 46) {
      ctx.beginPath();
      ctx.moveTo(x + 3, fy);
      ctx.lineTo(x + bw - 3, fy);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;

    x += bw + 4 + r() * 8;
  }
  ctx.restore();
}

export function windowLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  color = '#e3a54d',
  seed = 1,
): void {
  const flick = 0.75 + 0.25 * noise1(t * 2 + seed * 4.3);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rgba(color, 0.5 * flick);
  ctx.fillRect(x, y, w, h);
  glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 3, color, 0.08 * flick);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(8,7,5,0.8)';
  ctx.lineWidth = Math.max(1.5, w * 0.06);
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.restore();
}

export function archPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
): void {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, baseY);
  ctx.lineTo(cx - w / 2, baseY - h + w / 2);
  ctx.arc(cx, baseY - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, baseY);
  ctx.closePath();
}

export function archWindow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  color: string,
  alpha = 0.3,
  t = 0,
): void {
  ctx.save();
  archPath(ctx, cx, baseY, w, h);
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,8,6,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function groundMist(
  ctx: CanvasRenderingContext2D,
  y: number,
  color: string,
  t: number,
): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, y - 100, 0, y + 160);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.55, rgba(color, 0.08));
  g.addColorStop(1, rgba(color, 0.0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 100, W, 260);
  for (let i = 0; i < 3; i++) {
    const off = Math.sin(t * 0.06 + i * 2.4) * 90;
    const gg = ctx.createRadialGradient(W * 0.5 + off, y, 0, W * 0.5 + off, y, 320);
    gg.addColorStop(0, rgba(color, 0.035));
    gg.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(0, y - 200, W, 400);
  }
  ctx.restore();
}

export function vignette(ctx: CanvasRenderingContext2D, strength = 0.55): void {
  const v = getVignette();
  if (!v) return;
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.drawImage(v, 0, 0, W, H);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Cached paper / grain / vignette                                    */
/* ------------------------------------------------------------------ */

let paperCache: HTMLCanvasElement | null = null;
let vignetteCache: HTMLCanvasElement | null = null;
let grainPattern: CanvasPattern | null = null;

function getPaper(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (paperCache) return paperCache;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  const r = seeded(8137);
  g.clearRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) {
    const x = r() * W;
    const y = r() * H;
    const a = 0.015 + r() * 0.05;
    const light = r() > 0.48;
    g.fillStyle = light ? `rgba(255, 246, 224, ${a})` : `rgba(20, 14, 8, ${a})`;
    g.fillRect(x, y, 0.6 + r() * 1.8, 0.6 + r() * 1.4);
  }
  for (let i = 0; i < 350; i++) {
    const x = r() * W;
    const y = r() * H;
    g.strokeStyle = `rgba(80, 60, 35, ${0.025 + r() * 0.06})`;
    g.lineWidth = 0.4 + r() * 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20, x + (r() - 0.5) * 120, y + (r() - 0.5) * 50);
    g.stroke();
  }
  // Subtle blotches, like old paper.
  for (let i = 0; i < 30; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 20 + r() * 110;
    const bg = g.createRadialGradient(x, y, 0, x, y, rad);
    bg.addColorStop(0, `rgba(120, 88, 42, ${0.02 + r() * 0.03})`);
    bg.addColorStop(1, 'rgba(120, 88, 42, 0)');
    g.fillStyle = bg;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  paperCache = c;
  return c;
}

function getVignette(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (vignetteCache) return vignetteCache;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(W / 2, H * 0.46, H * 0.2, W / 2, H * 0.5, H * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0.82)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  vignetteCache = c;
  return c;
}

function getGrainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (typeof document === 'undefined') return null;
  if (grainPattern) return grainPattern;
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 192;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(192, 192);
  const r = seeded(99173);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 100 + Math.floor(r() * 155);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 38;
  }
  g.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(c, 'repeat');
  return grainPattern;
}

export function paper(
  ctx: CanvasRenderingContext2D,
  t: number,
  strength = 0.5,
  quality = 1,
): void {
  // Paper now lives in a CSS overlay (see #paper-overlay), composited by the
  // browser once instead of re-blended into every canvas frame.
  void ctx;
  void t;
  void strength;
  void quality;
}

export function paperImageUrl(): string | null {
  const p = getPaper();
  return p ? p.toDataURL('image/png') : null;
}

export function letterboxShade(ctx: CanvasRenderingContext2D): void {
  const top = ctx.createLinearGradient(0, 0, 0, 260);
  top.addColorStop(0, 'rgba(4,3,2,0.6)');
  top.addColorStop(1, 'rgba(4,3,2,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 260);
  const bottom = ctx.createLinearGradient(0, H - 330, 0, H);
  bottom.addColorStop(0, 'rgba(4,3,2,0)');
  bottom.addColorStop(0.72, 'rgba(4,3,2,0.5)');
  bottom.addColorStop(1, 'rgba(4,3,2,0.92)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H - 330, W, 330);
}

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

export function lantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  seed = 1,
  color = '#ffc36b',
): void {
  glow(ctx, x, y, size * 4.4, color, 0.16);
  ctx.save();
  ctx.strokeStyle = '#1a130c';
  ctx.lineWidth = size * 0.12;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.1);
  ctx.quadraticCurveTo(x + size * 0.2, y - size * 1.5, x, y - size * 1.7);
  ctx.stroke();
  ctx.fillStyle = rgba(color, 0.85);
  ctx.fillRect(x - size * 0.45, y - size * 0.8, size * 0.9, size * 1.1);
  ctx.strokeStyle = '#241a10';
  ctx.lineWidth = size * 0.16;
  ctx.strokeRect(x - size * 0.5, y - size * 0.9, size, size * 1.3);
  ctx.restore();
}

export function candlestick(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  h: number,
  t: number,
  seed = 1,
  lit = true,
  silver = '#cbbf9d',
): void {
  // base
  ctx.save();
  const g = ctx.createLinearGradient(x - h * 0.22, 0, x + h * 0.22, 0);
  g.addColorStop(0, '#6d6350');
  g.addColorStop(0.35, silver);
  g.addColorStop(0.55, '#f1e4bf');
  g.addColorStop(0.75, '#8d7e5e');
  g.addColorStop(1, '#5a4f3c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, baseY, h * 0.24, h * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - h * 0.055, baseY - h * 0.62, h * 0.11, h * 0.6);
  ctx.beginPath();
  ctx.ellipse(x, baseY - h * 0.63, h * 0.15, h * 0.045, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - h * 0.035, baseY - h * 0.78, h * 0.07, h * 0.18);
  ctx.beginPath();
  ctx.ellipse(x, baseY - h * 0.79, h * 0.07, h * 0.024, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  candle(ctx, x, baseY - h * 0.79, h * 0.38, t, seed, lit, '#efe4c8');
}

export function chair(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  h: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, h * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - h * 0.18, baseY);
  ctx.lineTo(x - h * 0.18, baseY - h * 0.52);
  ctx.lineTo(x + h * 0.18, baseY - h * 0.52);
  ctx.lineTo(x + h * 0.18, baseY);
  ctx.moveTo(x - h * 0.18, baseY - h * 0.52);
  ctx.lineTo(x - h * 0.22, baseY - h);
  ctx.moveTo(x + h * 0.18, baseY - h * 0.52);
  ctx.lineTo(x + h * 0.22, baseY - h);
  ctx.moveTo(x - h * 0.22, baseY - h);
  ctx.lineTo(x + h * 0.22, baseY - h);
  ctx.stroke();
  ctx.restore();
}

export function tree(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  h: number,
  color: string,
  t: number,
  seed = 1,
  alpha = 1,
  bare = false,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  const sway = Math.sin(t * 0.6 + seed) * h * 0.004;
  const drawBranch = (bx: number, by: number, len: number, angle: number, w: number, depth: number): void => {
    if (depth <= 0 || len < 5) return;
    const ex = bx + Math.cos(angle) * len + sway * depth;
    const ey = by + Math.sin(angle) * len;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    drawBranch(ex, ey, len * 0.68, angle - 0.38 - hash(seed + depth) * 0.2, w * 0.62, depth - 1);
    drawBranch(ex, ey, len * 0.62, angle + 0.3 + hash(seed + depth + 9) * 0.25, w * 0.58, depth - 1);
    if (!bare && depth < 3) {
      ctx.globalAlpha = alpha * 0.35;
      ctx.beginPath();
      ctx.arc(ex + (hash(depth + seed) - 0.5) * len * 0.4, ey + (hash(depth * 2 + seed) - 0.5) * len * 0.3, len * 0.35, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
  };
  drawBranch(x, baseY, h * 0.34, -Math.PI / 2, Math.max(3, h * 0.028), 5);
  ctx.restore();
}

export function ironGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
  color: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const bars = 9;
  for (let i = 0; i <= bars; i++) {
    const bx = x + (w / bars) * i;
    ctx.beginPath();
    ctx.moveTo(bx, baseY);
    ctx.lineTo(bx, baseY - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, baseY - h);
    ctx.lineTo(bx + (i % 2 === 0 ? 6 : -6), baseY - h - 12);
    ctx.stroke();
  }
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 8, baseY - h * 0.3);
  ctx.lineTo(x + w + 8, baseY - h * 0.3);
  ctx.moveTo(x - 8, baseY - h * 0.78);
  ctx.lineTo(x + w + 8, baseY - h * 0.78);
  ctx.stroke();
  ctx.restore();
}

export function cobblestones(
  ctx: CanvasRenderingContext2D,
  y: number,
  color: string,
  seed = 1,
  alpha = 0.5,
): void {
  const r = seeded(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let row = 0; row < 8; row++) {
    const yy = y + row * 16;
    for (let i = 0; i < 24; i++) {
      const xx = i * 34 + (row % 2) * 17 - 10 + (r() - 0.5) * 4;
      ctx.beginPath();
      ctx.ellipse(xx, yy + (r() - 0.5) * 4, 14 + r() * 4, 6 + r() * 2, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function smoke(
  ctx: CanvasRenderingContext2D,
  t: number,
  x: number,
  y: number,
  color = '#918678',
  alpha = 0.12,
  count = 12,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const seed = hash(i * 2.7 + 1);
    const px = x + Math.sin(t * 0.22 + i) * 55 + (seed - 0.5) * 240;
    const py = y - mod(t * (8 + seed * 14) + seed * 280, 460);
    const r = 40 + seed * 110;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(color, alpha * (0.4 + seed * 0.5)));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  ctx.restore();
}

export function progressLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  p: number,
  color = '#d9ad5b',
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(236,225,202,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, rgba(color, 0.1));
  g.addColorStop(1, color);
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * clamp(p), y);
  ctx.stroke();
  ctx.restore();
}

export function inkRevealMask(
  ctx: CanvasRenderingContext2D,
  t: number,
  color = '#060504',
  alpha = 1,
  seed = 1,
): void {
  const p = smooth(t);
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const r = seeded(seed);
  const cols = 8;
  const rows = 14;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const threshold = (row / rows) * 0.7 + r() * 0.3;
      if (threshold > p) continue;
      const x = (col + 0.5) * (W / cols) + (r() - 0.5) * 40;
      const y = (row + 0.5) * (H / rows) + (r() - 0.5) * 40;
      const radius = (W / cols) * (1.2 + r() * 1.5);
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * (0.7 + r() * 0.5), r() * TAU, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function star(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,252,238,0.95)');
  g.addColorStop(0.12, rgba(color, 0.85));
  g.addColorStop(0.4, rgba(color, 0.16));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(color, alpha * 0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.moveTo(x, y - r * 0.55);
  ctx.lineTo(x, y + r * 0.55);
  ctx.stroke();
  ctx.restore();
}

export function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  ctx.restore();
}
