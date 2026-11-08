#!/usr/bin/env node
/**
 * Converte il PLY Gaussian Splatting del Duomo in un asset compresso di
 * riferimento per palette e texture.
 *
 * L'asset non viene caricato dal gioco: il runtime usa il Duomo low-poly
 * solido. Il PLY originale resta un sorgente locale e non viene pubblicato
 * nella PWA.
 * Formato output (little endian, 20 byte per splat):
 *   float32 x, y, z   posizione normalizzata, con base a y=0
 *   uint8   r, g, b   colore SH DC convertito
 *   uint8   opacity   alpha
 *   float32 size      dimensione lineare in unità modello
 *
 * Uso:
 *   node tools/build-duomo-splat.mjs
 *   node tools/build-duomo-splat.mjs --input assets/3d/foo.ply --out assets/3d/duomo-hd.bin
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const INPUT = path.resolve(ROOT, getArg('--input', 'assets/3d/idol-seed42-262144-3b8df9a4.ply'));
const OUTPUT = path.resolve(ROOT, getArg('--out', 'assets/3d/duomo-hd.bin'));
const META = path.resolve(ROOT, getArg('--meta', 'assets/3d/duomo-hd.json'));
const C0 = 0.28209479177387814;
const MIN_ALPHA = 0.018;
const MAX_SPLAT_SIZE = 0.022;
const MIN_SPLAT_SIZE = 0.0008;

if (!fs.existsSync(INPUT)) {
  console.error(`✗ PLY non trovato: ${INPUT}`);
  process.exit(1);
}

const file = fs.readFileSync(INPUT);
const headerEnd = file.indexOf(Buffer.from('end_header\n'));
if (headerEnd < 0) throw new Error('Header PLY non valido');
const headerLength = headerEnd + Buffer.byteLength('end_header\n');
const header = file.subarray(0, headerLength).toString('utf8');
const vertexMatch = header.match(/element vertex (\d+)/);
if (!vertexMatch) throw new Error('element vertex mancante');
const count = Number(vertexMatch[1]);
const props = [...header.matchAll(/property\s+float\s+(\w+)/g)].map(match => match[1]);
const stride = props.length * 4;
const expected = count * stride;
const data = new DataView(file.buffer, file.byteOffset + headerLength, expected);
if (data.byteLength < expected) throw new Error('Dati PLY incompleti');

const indexOf = name => {
  const index = props.indexOf(name);
  if (index < 0) throw new Error(`Proprietà PLY mancante: ${name}`);
  return index;
};
const px = indexOf('x'), py = indexOf('y'), pz = indexOf('z');
const pr = indexOf('f_dc_0'), pg = indexOf('f_dc_1'), pb = indexOf('f_dc_2');
const po = indexOf('opacity');
const s0 = indexOf('scale_0'), s1 = indexOf('scale_1'), s2 = indexOf('scale_2');
const read = (i, property) => data.getFloat32(i * stride + property * 4, true);

let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (let i = 0; i < count; i++) {
  const x = read(i, px), y = read(i, py), z = read(i, pz);
  if (x < minX) minX = x;
  if (y < minY) minY = y;
  if (z < minZ) minZ = z;
  if (x > maxX) maxX = x;
  if (y > maxY) maxY = y;
  if (z > maxZ) maxZ = z;
}
const cx = (minX + maxX) / 2;
const cz = (minZ + maxZ) / 2;
const width = maxX - minX;
const height = maxY - minY;
const depth = maxZ - minZ;

const splats = [];
let filtered = 0;
let minSize = Infinity, maxSize = -Infinity;
for (let i = 0; i < count; i++) {
  const opacity = 1 / (1 + Math.exp(-read(i, po)));
  if (opacity < MIN_ALPHA) {
    filtered++;
    continue;
  }
  const r = Math.max(0, Math.min(1, 0.5 + C0 * read(i, pr)));
  const g = Math.max(0, Math.min(1, 0.5 + C0 * read(i, pg)));
  const b = Math.max(0, Math.min(1, 0.5 + C0 * read(i, pb)));
  const rawSize = Math.max(
    Math.exp(read(i, s0)),
    Math.exp(read(i, s1)),
    Math.exp(read(i, s2))
  );
  const size = Math.max(MIN_SPLAT_SIZE, Math.min(MAX_SPLAT_SIZE, rawSize));
  minSize = Math.min(minSize, rawSize);
  maxSize = Math.max(maxSize, rawSize);
  splats.push({
    x: read(i, px) - cx,
    // Il PLY usa l'asse Y rovesciato rispetto a Three.js: riportiamo la base a y=0.
    y: maxY - read(i, py),
    z: read(i, pz) - cz,
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    opacity: Math.round(opacity * 255),
    size
  });
}

// Ordine back-to-front per la vista dalla piazza (lato +X del modello),
// conservato nel sorgente come metadato utile per eventuali bake futuri.
splats.sort((a, b) => a.x - b.x);

const recordSize = 20;
const buffer = Buffer.alloc(splats.length * recordSize);
let offset = 0;
for (const splat of splats) {
  buffer.writeFloatLE(splat.x, offset); offset += 4;
  buffer.writeFloatLE(splat.y, offset); offset += 4;
  buffer.writeFloatLE(splat.z, offset); offset += 4;
  buffer.writeUInt8(splat.r, offset++);
  buffer.writeUInt8(splat.g, offset++);
  buffer.writeUInt8(splat.b, offset++);
  buffer.writeUInt8(splat.opacity, offset++);
  buffer.writeFloatLE(splat.size, offset); offset += 4;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, buffer);

const metadata = {
  format: 'fidenza-splat-v1',
  source: path.relative(ROOT, INPUT),
  generated: new Date().toISOString(),
  count: splats.length,
  sourceCount: count,
  filtered,
  recordSize,
  bounds: {
    min: [+minX.toFixed(5), +minY.toFixed(5), +minZ.toFixed(5)],
    max: [+maxX.toFixed(5), +maxY.toFixed(5), +maxZ.toFixed(5)],
    size: [+width.toFixed(5), +height.toFixed(5), +depth.toFixed(5)]
  },
  normalized: {
    centerX: +cx.toFixed(5),
    baseY: 0,
    centerZ: +cz.toFixed(5),
    flippedY: true
  },
  sortedBy: 'x:asc',
  splatSize: {
    min: +minSize.toFixed(6),
    max: +maxSize.toFixed(6),
    clampedMax: MAX_SPLAT_SIZE
  },
  outputBytes: buffer.length
};
fs.writeFileSync(META, JSON.stringify(metadata, null, 2) + '\n');

console.log('✓ Duomo splat compilato');
console.log(`  sorgente: ${count} splat · ${(file.length / 1e6).toFixed(2)} MB`);
console.log(`  output: ${splats.length} splat · ${(buffer.length / 1e6).toFixed(2)} MB`);
console.log(`  filtrati: ${filtered} · bbox ${width.toFixed(2)} × ${height.toFixed(2)} × ${depth.toFixed(2)}`);
console.log(`  file: ${path.relative(ROOT, OUTPUT)}`);
