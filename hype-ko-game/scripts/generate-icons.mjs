import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const OUT = path.resolve(process.cwd(), 'public', 'icons');

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
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(filename, width, height, pixelAt) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const offset = y * stride + 1 + x * 4;
      raw[offset] = clampByte(r);
      raw[offset + 1] = clampByte(g);
      raw[offset + 2] = clampByte(b);
      raw[offset + 3] = clampByte(a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  writeFileSync(path.join(OUT, filename), png);
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hex(value) {
  const clean = value.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const PINK = hex('#ff2e63');
const CYAN = hex('#08d9d6');
const YELLOW = hex('#ffd166');
const PURPLE = hex('#b14cff');
const DARK = hex('#07030d');
const DEEP = hex('#160b2b');
const WHITE = [245, 241, 255];

const K = [
  '10001',
  '10010',
  '10100',
  '11000',
  '10100',
  '10010',
  '10001'
];
const O = [
  '01110',
  '10001',
  '10001',
  '10001',
  '10001',
  '10001',
  '01110'
];

function makeIcon(size, maskable = false) {
  const center = size / 2;
  const contentScale = maskable ? 0.78 : 1;
  const ringRadius = size * 0.37 * contentScale;
  const ringWidth = Math.max(2, size * 0.028 * contentScale);
  const glyphScale = Math.max(2, Math.floor((size * 0.105 * contentScale)));
  const glyphWidth = 5 * glyphScale;
  const gap = Math.max(2, Math.floor(glyphScale * 0.7));
  const totalWidth = glyphWidth * 2 + gap;
  const glyphTop = center - (7 * glyphScale) / 2 + size * 0.01;
  const leftX = center - totalWidth / 2;
  const rightX = leftX + glyphWidth + gap;

  const inGlyph = (x, y, bitmap, originX) => {
    const gx = Math.floor((x - originX) / glyphScale);
    const gy = Math.floor((y - glyphTop) / glyphScale);
    if (gx < 0 || gx >= 5 || gy < 0 || gy >= 7) return false;
    return bitmap[gy][gx] === '1';
  };

  return (x, y) => {
    const nx = x / size;
    const ny = y / size;
    const dx = x - center;
    const dy = y - center;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    let color = mix(DEEP, DARK, Math.pow(ny, 0.8));
    const haze = Math.exp(-Math.pow(distance / (size * 0.55), 2));
    color = mix(color, PURPLE, haze * 0.16);

    const grid = (x % Math.max(8, size / 16) === 0 || y % Math.max(8, size / 16) === 0) ? 0.035 : 0;
    color = mix(color, CYAN, grid);

    const band = Math.sin((nx + ny) * Math.PI * 4 + 0.6);
    if (band > 0.93) color = mix(color, PINK, 0.12);

    const ringGlow = Math.exp(-Math.pow((distance - ringRadius) / (size * 0.07), 2));
    color = mix(color, PINK, ringGlow * 0.25);
    if (Math.abs(distance - ringRadius) < ringWidth / 2) {
      const t = (Math.sin(angle * 2 + 0.8) + 1) / 2;
      color = mix(CYAN, PINK, t);
    }

    const innerGlow = Math.exp(-Math.pow(distance / (size * 0.25), 2));
    color = mix(color, PURPLE, innerGlow * 0.14);

    if (inGlyph(x, y, K, leftX) || inGlyph(x, y, O, rightX)) {
      const edge = smoothstep(0, size * 0.01, Math.min(
        Math.abs(distance - ringRadius) + size * 0.2,
        size * 0.2
      ));
      color = mix(WHITE, color, 0.18 * edge);
    }

    const dotX = center + (totalWidth / 2 - glyphScale * 1.1);
    const dotY = glyphTop + 7 * glyphScale + glyphScale * 0.85;
    if (Math.hypot(x - dotX, y - dotY) < glyphScale * 0.55) {
      color = YELLOW;
    }

    const scan = y % Math.max(2, Math.floor(size / 128)) === 0 ? 0.04 : 0;
    color = mix(color, [0, 0, 0], scan);

    const vignette = 1 - smoothstep(0.45, 1.15, Math.hypot(nx - 0.5, ny - 0.5) / 0.7) * 0.5;
    color = [color[0] * vignette, color[1] * vignette, color[2] * vignette];

    return [color[0], color[1], color[2], 255];
  };
}

mkdirSync(OUT, { recursive: true });
writePng('icon-192.png', 192, 192, makeIcon(192, false));
writePng('icon-512.png', 512, 512, makeIcon(512, false));
writePng('maskable-512.png', 512, 512, makeIcon(512, true));
console.log('Generated icons in public/icons');
