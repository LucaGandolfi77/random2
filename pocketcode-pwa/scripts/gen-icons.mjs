import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
mkdirSync(outDir, { recursive: true });

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function canvas(size) {
  return Buffer.alloc(size * size * 4);
}

function blend(buf, width, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const i = (y * width + x) * 4;
  const a = Math.max(0, Math.min(1, alpha));
  buf[i] = Math.round(buf[i] * (1 - a) + color[0] * a);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + color[1] * a);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + color[2] * a);
  buf[i + 3] = Math.max(buf[i + 3], Math.round(a * 255));
}

function rounded(buf, width, x, y, w, h, r, color, alpha = 1) {
  for (let py = Math.floor(y); py < y + h; py += 1) {
    for (let px = Math.floor(x); px < x + w; px += 1) {
      const dx = Math.max(x + r - px, 0, px - (x + w - r));
      const dy = Math.max(y + r - py, 0, py - (y + h - r));
      if (dx * dx + dy * dy <= r * r) blend(buf, width, px, py, color, alpha);
    }
  }
}

function disc(buf, width, cx, cy, radius, color, alpha = 1) {
  for (let y = Math.floor(cy - radius); y <= cy + radius; y += 1) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) blend(buf, width, x, y, color, alpha);
    }
  }
}

function line(buf, width, x1, y1, x2, y2, thickness, color) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    disc(buf, width, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, thickness / 2, color);
  }
}

function draw(size, maskable) {
  const scale = 4;
  const s = size * scale;
  const buf = canvas(s);
  const bg = maskable ? [11, 18, 32] : [8, 11, 19];
  if (maskable) {
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) blend(buf, s, x, y, bg);
    }
  } else {
    rounded(buf, s, 0, 0, s, s, s * 0.2, bg);
  }

  const glow = [16, 42, 56];
  disc(buf, s, s * 0.22, s * 0.2, s * 0.42, glow, 0.55);
  disc(buf, s, s * 0.82, s * 0.78, s * 0.34, [33, 27, 58], 0.6);

  const inset = maskable ? 0.26 : 0.2;
  const k = s * (1 - inset * 2);
  const ox = s * inset;
  const oy = s * inset;
  const cyan = [34, 211, 238];
  const violet = [167, 139, 250];
  const green = [52, 211, 153];

  const thick = Math.max(k * 0.075, s * 0.012);
  line(buf, s, ox + k * 0.13, oy + k * 0.26, ox + k * 0.4, oy + k * 0.5, thick, cyan);
  line(buf, s, ox + k * 0.4, oy + k * 0.5, ox + k * 0.13, oy + k * 0.74, thick, cyan);
  line(buf, s, ox + k * 0.52, oy + k * 0.74, ox + k * 0.86, oy + k * 0.74, thick * 0.92, violet);
  disc(buf, s, ox + k * 0.82, oy + k * 0.23, k * 0.055, green);

  const small = canvas(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const i = ((y * scale + sy) * s + (x * scale + sx)) * 4;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
          a += buf[i + 3];
        }
      }
      const n = scale * scale;
      const j = (y * size + x) * 4;
      small[j] = Math.round(r / n);
      small[j + 1] = Math.round(g / n);
      small[j + 2] = Math.round(b / n);
      small[j + 3] = Math.round(a / n);
    }
  }
  return small;
}

for (const [name, size, maskable] of [
  ["icon-180.png", 180, false],
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-192.png", 192, true],
  ["icon-maskable-512.png", 512, true],
]) {
  writeFileSync(join(outDir, name), encodePng(size, size, draw(size, maskable)));
}
console.log("wrote 5 PNG icons");
