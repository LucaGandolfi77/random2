// Generates icons/icon-512.png (and resizes to 192 via sips) without dependencies.
// Pure-node PNG encoder: gradient sky, sun, sea, fish, hook — matches icons/*.svg
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { execSync } = require('child_process')

const N = 512
const px = new Uint8Array(N * N * 4)

function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] }
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const SKY_TOP = hex('#ffd9a0'), SKY_MID = hex('#ffb98a'), SKY_LOW = hex('#7ecfd6')
const SEA_TOP = hex('#3aa8bd'), SEA_BOT = hex('#0e3a4d'), SUN = hex('#fff3d6')
const FISH = hex('#ff8a5c'), FIN = hex('#ffb08a'), DARK = hex('#0e3a4d'), RIP = hex('#bff0f2'), LINE = hex('#f6feff')

const R = N * 0.22
function inRR(x, y) {
  const cx = Math.min(Math.max(x, R), N - R), cy = Math.min(Math.max(y, R), N - R)
  return (x - cx) ** 2 + (y - cy) ** 2 <= R * R || (x >= R && x <= N - R) || (y >= R && y <= N - R)
}
function put(x, y, c, a = 1) {
  if (x < 0 || y < 0 || x >= N || y >= N) return
  const i = (y * N + x) * 4, p = [px[i], px[i + 1], px[i + 2]]
  px[i] = p[0] + (c[0] - p[0]) * a; px[i + 1] = p[1] + (c[1] - p[1]) * a; px[i + 2] = p[2] + (c[2] - p[2]) * a; px[i + 3] = 255
}
function disc(cx, cy, r, c, a = 1) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, c, a)
}
function thickLine(x1, y1, x2, y2, w, c, a = 1) {
  const len = Math.hypot(x2 - x1, y2 - y1), steps = Math.ceil(len * 2)
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t
    disc(x, y, w / 2, c, a)
  }
}
function seg(cx, cy, r, a0, a1, w, c, a = 1) { // arc outline
  const steps = Math.ceil(Math.abs(a1 - a0) * r)
  let prev = null
  for (let s = 0; s <= steps; s++) {
    const ang = a0 + (a1 - a0) * (s / steps)
    const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r
    if (prev) thickLine(prev[0], prev[1], x, y, w, c, a)
    prev = [x, y]
  }
}

// --- paint ---
const HOR = N * 0.585
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (!inRR(x, y)) continue
    let c
    if (y < HOR) {
      const t = y / HOR
      c = t < 0.45 ? mix(SKY_TOP, SKY_MID, t / 0.45) : mix(SKY_MID, SKY_LOW, (t - 0.45) / 0.55)
      const d = Math.hypot(x - N * 0.293, y - N * 0.332)
      if (d < N * 0.125) c = mix(c, SUN, 0.92)
    } else {
      c = mix(SEA_TOP, SEA_BOT, (y - HOR) / (N - HOR))
    }
    put(x, y, c)
  }
}
// crest foam
for (let x = 0; x < N; x++) {
  const yy = HOR + Math.sin(x / 40) * 4
  for (let y = yy - 3; y <= yy + 3; y++) put(x, y, RIP, 0.5)
}
// ripples
thickLine(N * 0.18, N * 0.72, N * 0.37, N * 0.72, N * 0.023, RIP, 0.5)
thickLine(N * 0.58, N * 0.82, N * 0.79, N * 0.82, N * 0.023, RIP, 0.5)
thickLine(N * 0.29, N * 0.89, N * 0.45, N * 0.89, N * 0.023, RIP, 0.5)
// fish (rotated ellipse) + tail + fin + eye
const fx = N * 0.586, fy = N * 0.727, rx = N * 0.18, ry = N * 0.109, rot = -8 * Math.PI / 180
for (let y = Math.floor(fy - ry * 2); y <= fy + ry * 2; y++)
  for (let x = Math.floor(fx - rx * 2); x <= fx + rx * 2; x++) {
    const dx = x - fx, dy = y - fy
    const u = (dx * Math.cos(rot) + dy * Math.sin(rot)) / rx
    const v = (-dx * Math.sin(rot) + dy * Math.cos(rot)) / ry
    if (u * u + v * v <= 1) put(x, y, FISH)
  }
const t1 = [fx + N * 0.152, fy], t2 = [fx + N * 0.266, fy - N * 0.082], t3 = [fx + N * 0.266, fy + N * 0.082]
for (let y = Math.floor(t3[1]); y <= t2[1]; y++)
  for (let x = Math.floor(t1[0]); x <= t3[0]; x++) {
    const f1 = (y - t1[1]) / (t2[1] - t1[1]), f2 = (y - t1[1]) / (t3[1] - t1[1])
    const xa = t1[0] + (t2[0] - t1[0]) * f1, xb = t1[0] + (t3[0] - t1[0]) * f2
    if (x >= Math.min(xa, xb) && x <= Math.max(xa, xb)) put(x, y, FISH)
  }
thickLine(fx - N * 0.09, fy - N * 0.02, fx - N * 0.17, fy + N * 0.1, N * 0.05, FIN, 0.9)
disc(fx - N * 0.074, fy - N * 0.023, N * 0.021, DARK)
// hook line + bottom-half arc + barb
thickLine(N * 0.332, N * 0.078, N * 0.332, N * 0.486, N * 0.031, LINE)
seg(N * 0.434, N * 0.486, N * 0.102, 0, Math.PI, N * 0.031, LINE)
thickLine(N * 0.536, N * 0.486, N * 0.536, N * 0.44, N * 0.031, LINE)

// --- encode PNG ---
const CRC_T = []
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0 }
function crc(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_T[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, crcB])
}
const raw = Buffer.alloc(N * (N * 4 + 1))
for (let y = 0; y < N; y++) {
  raw[y * (N * 4 + 1)] = 0
  Buffer.from(px.buffer, y * N * 4, N * 4).copy(raw, y * (N * 4 + 1) + 1)
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])
const out = path.join(__dirname, '..', 'icons', 'icon-512.png')
fs.writeFileSync(out, png)
try { execSync(`sips -z 192 192 "${out}" --out "${path.join(__dirname, '..', 'icons', 'icon-192.png')}"`, { stdio: 'pipe' }) } catch (e) { console.log('sips resize skipped:', e.message) }
console.log('icons written:', fs.readdirSync(path.join(__dirname, '..', 'icons')).join(', '))
