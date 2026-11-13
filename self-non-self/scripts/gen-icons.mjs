#!/usr/bin/env node
/*
 * Generates the PWA icons with no image dependencies: a tiny software
 * rasteriser and a hand-written PNG encoder (RGBA, filter 0, zlib).
 * Run: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, '..', 'public');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const body = Buffer.concat([name, data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width * 4; x++) raw[row + 1 + x] = rgba[y * width * 4 + x];
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;

function parseHex(hex) {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const BG = parseHex('#050405');
const BG_WARM = parseHex('#2c0b11');
const BLOOD = parseHex('#4a0d16');
const ARTERIAL = parseHex('#b7353f');
const ROSE = parseHex('#e8898a');
const AMBER = parseHex('#e8b46a');
const GOLD = parseHex('#f6d28a');
const TEAL = parseHex('#6fb7a8');

function render(size) {
  const S = 2;
  const w = size * S;
  const data = new Uint8ClampedArray(w * w * 4);

  const put = (x, y, color, alpha) => {
    if (x < 0 || y < 0 || x >= w || y >= w) return;
    const i = (y * w + x) * 4;
    const a = clamp01(alpha);
    data[i] = mix(data[i], color[0], a);
    data[i + 1] = mix(data[i + 1], color[1], a);
    data[i + 2] = mix(data[i + 2], color[2], a);
    data[i + 3] = 255;
  };

  const line = (x0, y0, x1, y1, width, color, alpha) => {
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - width));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1) + width));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - width));
    const maxY = Math.min(w - 1, Math.ceil(Math.max(y0, y1) + width));
    const vx = x1 - x0;
    const vy = y1 - y0;
    const len2 = vx * vx + vy * vy || 1;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = clamp01(((x - x0) * vx + (y - y0) * vy) / len2);
        const dx = x - (x0 + vx * t);
        const dy = y - (y0 + vy * t);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= width) put(x, y, color, alpha * (1 - (d / width) * 0.75));
      }
    }
  };

  const disc = (cx, cy, r, color, alpha, wobble = 0) => {
    const minX = Math.max(0, Math.floor(cx - r * 1.2));
    const maxX = Math.min(w - 1, Math.ceil(cx + r * 1.2));
    const minY = Math.max(0, Math.floor(cy - r * 1.2));
    const maxY = Math.min(w - 1, Math.ceil(cy + r * 1.2));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const a = Math.atan2(dy, dx);
        const rr = r * (1 + Math.sin(a * 7 + 1.2) * wobble + Math.sin(a * 3 - 0.4) * wobble * 0.5);
        if (d <= rr) {
          const fade = 1 - Math.min(1, d / rr) * 0.22;
          put(x, y, color, alpha * fade);
        }
      }
    }
  };

  // Background: a warm, almost-black field.
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w - 0.5;
      const ny = y / w - 0.52;
      const d = Math.sqrt(nx * nx + ny * ny);
      const warm = Math.max(0, 1 - d / 0.62);
      const c = [
        mix(BG[0], BG_WARM[0], warm * 0.55),
        mix(BG[1], BG_WARM[1], warm * 0.55),
        mix(BG[2], BG_WARM[2], warm * 0.55),
      ];
      put(x, y, c, 1);
    }
  }

  const cx = w * 0.5;
  const cy = w * 0.54;
  const unit = w * 0.23;

  // Outer halo
  disc(cx, cy, unit * 1.55, ARTERIAL, 0.055);
  disc(cx, cy, unit * 1.1, ROSE, 0.06);

  // Dendrites: wide bloom + bright core + tips.
  const branches = [
    [-2.45, 1.05], [-2.0, 1.15], [-1.4, 1.25], [-0.85, 1.2], [-0.3, 1.32],
    [0.25, 1.18], [0.8, 1.24], [1.35, 1.18], [1.95, 1.12], [2.5, 1.0],
  ];
  for (let i = 0; i < branches.length; i++) {
    const [angle, length] = branches[i];
    const sway = Math.sin(i * 1.7 + 0.8) * 0.18;
    const x1 = cx + Math.cos(angle + sway) * unit * length;
    const y1 = cy + Math.sin(angle + sway) * unit * length * 0.9;
    const midX = cx + Math.cos(angle + sway * 0.5) * unit * length * 0.58;
    const midY = cy + Math.sin(angle + sway * 0.5) * unit * length * 0.58;
    line(cx, cy, midX, midY, w * 0.014, ROSE, 0.16);
    line(midX, midY, x1, y1, w * 0.009, ROSE, 0.16);
    line(cx, cy, midX, midY, w * 0.0028, GOLD, 0.62);
    line(midX, midY, x1, y1, w * 0.0018, GOLD, 0.55);
    disc(x1, y1, w * 0.011, GOLD, 0.22);
    disc(x1, y1, w * 0.004, GOLD, 0.8);

    // A small fork
    const forkAngle = angle + (i % 2 === 0 ? 0.55 : -0.55);
    const fx = midX + Math.cos(forkAngle) * unit * 0.38;
    const fy = midY + Math.sin(forkAngle) * unit * 0.38;
    line(midX, midY, fx, fy, w * 0.0016, GOLD, 0.38);
    disc(fx, fy, w * 0.0025, GOLD, 0.6);
  }

  // Body
  disc(cx, cy, unit, AMBER, 0.25, 0.055);
  disc(cx - unit * 0.12, cy - unit * 0.16, unit * 0.74, ROSE, 0.3, 0.045);
  disc(cx - unit * 0.18, cy - unit * 0.22, unit * 0.42, GOLD, 0.36, 0.03);
  // Rim
  disc(cx, cy, unit * 1.01, GOLD, 0.12, 0.055);

  // Nucleus
  disc(cx + unit * 0.08, cy + unit * 0.06, unit * 0.34, BLOOD, 0.9, 0.02);
  disc(cx + unit * 0.08, cy + unit * 0.06, unit * 0.13, AMBER, 0.55);
  disc(cx + unit * 0.08, cy + unit * 0.06, unit * 0.045, GOLD, 0.8);

  // Organelles
  const organelles = [
    [-0.42, 0.2, 0.035], [0.34, -0.3, 0.03], [0.42, 0.34, 0.026],
    [-0.18, 0.45, 0.022], [0.12, -0.46, 0.02],
  ];
  for (const [ox, oy, r] of organelles) {
    disc(cx + unit * ox, cy + unit * oy, unit * r, GOLD, 0.6);
  }

  // The resident: a small teal rod crossing the lower right.
  const bx = cx + unit * 0.78;
  const by = cy + unit * 0.9;
  const ba = -0.52;
  const bl = unit * 0.5;
  const b0x = bx - Math.cos(ba) * bl * 0.5;
  const b0y = by - Math.sin(ba) * bl * 0.5;
  const b1x = bx + Math.cos(ba) * bl * 0.5;
  const b1y = by + Math.sin(ba) * bl * 0.5;
  line(b0x, b0y, b1x, b1y, w * 0.028, TEAL, 0.07);
  line(b0x, b0y, b1x, b1y, w * 0.012, TEAL, 0.65);
  disc(bx, by, w * 0.008, GOLD, 0.9);
  line(b0x, b0y, b0x - Math.cos(ba - 0.5) * unit * 0.3, b0y - Math.sin(ba - 0.5) * unit * 0.3, w * 0.0015, TEAL, 0.3);

  // Vignette
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w - 0.5;
      const ny = y / w - 0.5;
      const d = Math.sqrt(nx * nx + ny * ny);
      const v = Math.max(0, (d - 0.36) / 0.34);
      if (v > 0) put(x, y, [0, 0, 0], v * 0.5);
    }
  }

  // Downsample (box filter)
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const i = ((y * S + sy) * w + (x * S + sx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
        }
      }
      const n = S * S;
      const j = (y * size + x) * 4;
      out[j] = r / n;
      out[j + 1] = g / n;
      out[j + 2] = b / n;
      out[j + 3] = a / n;
    }
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
for (const size of [180, 192, 512]) {
  const png = encodePng(size, size, render(size));
  const target = join(OUT, `icon-${size}.png`);
  writeFileSync(target, png);
  console.log(`wrote ${target} (${png.length} bytes)`);
}
