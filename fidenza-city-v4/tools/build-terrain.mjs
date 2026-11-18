#!/usr/bin/env node
/**
 * Fidenza da Giocare — terrain builder
 *
 * Scarica gli AWS Terrain Tiles (Terrarium, Mapzen / EU-DEM Copernicus) e
 * produce una heightmap
 * compatta per il terreno attorno a Fidenza. Formato Terrarium.
 *
 * Uso: node tools/build-terrain.mjs [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');

const args = process.argv.slice(2);
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const MAP_FILE = path.resolve(ROOT, getArg('--map', 'maps/fidenza/map.json'));
const mapConfig = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : null;
const MAP_ID = mapConfig?.id || 'fidenza';

const CACHE = path.join(ROOT, '.cache', `terrain-${MAP_ID}`);
const OUT = path.resolve(ROOT, getArg('--out', 'data/terrain.json'));
const BBOX = mapConfig?.bbox || { south: 44.8500, west: 10.0400, north: 44.8820, east: 10.0850 };
const TERRAIN = mapConfig?.terrain || {};
const MARGIN = Number(TERRAIN.margin ?? 0.03); // ~3 km
const Z = Number(TERRAIN.zoom ?? 15);
const GRID = Number(TERRAIN.grid ?? 512);
const TILE_URL = TERRAIN.tileUrl || 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const TILE = 256;

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const refresh = process.argv.includes('--refresh');

function lon2tile(lon, z) {
  return Math.floor((lon + 180) / 360 * 2 ** z);
}
function lat2tile(lat, z) {
  const r = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z);
}
function tile2lon(x, z) {
  return x / 2 ** z * 360 - 180;
}
function tile2lat(y, z) {
  const n = Math.PI - 2 * Math.PI * y / 2 ** z;
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('PNG non valido');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('PNG interlacciato non supportato');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
  }
  if (bitDepth !== 8) throw new Error(`PNG bit depth ${bitDepth} non supportato`);
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`PNG color type ${colorType} non supportato`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const row = raw.subarray(p, p + stride);
    p += stride;
    const prevOff = (y - 1) * stride;
    const curOff = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[curOff + x - channels] : 0;
      const b = y > 0 ? out[prevOff + x] : 0;
      const c = (y > 0 && x >= channels) ? out[prevOff + x - channels] : 0;
      let val = row[x];
      switch (filter) {
        case 0: break;
        case 1: val = (val + a) & 255; break;
        case 2: val = (val + b) & 255; break;
        case 3: val = (val + ((a + b) >> 1)) & 255; break;
        case 4: val = (val + paeth(a, b, c)) & 255; break;
        default: throw new Error(`filtro PNG ${filter} non supportato`);
      }
      out[curOff + x] = val;
    }
  }
  return { width, height, channels, data: out };
}

async function fetchTile(x, y) {
  const file = path.join(CACHE, `${Z}-${x}-${y}.png`);
  if (fs.existsSync(file) && !refresh) return fs.readFileSync(file);
  const url = TILE_URL.replace('{z}', Z).replace('{x}', x).replace('{y}', y);
  console.log(`↓ ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf;
}

const west = BBOX.west - MARGIN;
const east = BBOX.east + MARGIN;
const south = BBOX.south - MARGIN;
const north = BBOX.north + MARGIN;

const x0 = lon2tile(west, Z), x1 = lon2tile(east, Z);
const y0 = lat2tile(north, Z), y1 = lat2tile(south, Z);

console.log(`Tile terrain z${Z}: x ${x0}..${x1}, y ${y0}..${y1}`);

const mosaicW = (x1 - x0 + 1) * TILE;
const mosaicH = (y1 - y0 + 1) * TILE;
const mosaic = new Float32Array(mosaicW * mosaicH);
mosaic.fill(-32768);

let noData = 0;
for (let ty = y0; ty <= y1; ty++) {
  for (let tx = x0; tx <= x1; tx++) {
    const png = await fetchTile(tx, ty);
    const img = decodePNG(png);
    if (img.width !== TILE || img.height !== TILE) throw new Error('dimensione tile inattesa');
    const ox = (tx - x0) * TILE;
    const oy = (ty - y0) * TILE;
    let tMin = Infinity, tMax = -Infinity, tBad = 0;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const i = (y * TILE + x) * img.channels;
        const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
        const h = (r * 256 + g + b / 256) - 32768;
        mosaic[(oy + y) * mosaicW + ox + x] = h;
        if (h <= -1000) { tBad++; noData++; }
        else { if (h < tMin) tMin = h; if (h > tMax) tMax = h; }
      }
    }
    console.log(`  tile ${tx}/${ty}: ${tBad ? `${tBad} px no-data, ` : ''}${tMin.toFixed(0)}..${tMax.toFixed(0)} m`);
  }
}

// I tile EU-DEM possono avere zone no-data ai bordi. Le riempiamo con una
// diffusione dai pixel validi più vicini, così il terreno resta continuo.
function fillNoData() {
  let remaining = noData;
  let passes = 0;
  while (remaining > 0 && passes < 200) {
    const next = new Float32Array(mosaic);
    let filled = 0;
    for (let y = 0; y < mosaicH; y++) {
      for (let x = 0; x < mosaicW; x++) {
        const idx = y * mosaicW + x;
        if (mosaic[idx] > -1000) continue;
        let sum = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= mosaicW || ny >= mosaicH) continue;
            const v = mosaic[ny * mosaicW + nx];
            if (v > -1000) { sum += v; count++; }
          }
        }
        if (count) {
          next[idx] = sum / count;
          filled++;
        }
      }
    }
    if (!filled) break;
    mosaic.set(next);
    remaining -= filled;
    passes++;
  }
  console.log(`  no-data: ${noData} px, riempiti in ${passes} passate`);
}
fillNoData();

function lonToPixel(lon) {
  return (lon - tile2lon(x0, Z)) / (tile2lon(x1 + 1, Z) - tile2lon(x0, Z)) * mosaicW;
}
function latToPixel(lat) {
  return (tile2lat(y0, Z) - lat) / (tile2lat(y0, Z) - tile2lat(y1 + 1, Z)) * mosaicH;
}

const heights = new Array(GRID * GRID);
let min = Infinity, max = -Infinity, sum = 0;
for (let j = 0; j < GRID; j++) {
  const lat = north - (north - south) * j / (GRID - 1);
  const py = Math.max(0, Math.min(mosaicH - 1, latToPixel(lat)));
  for (let i = 0; i < GRID; i++) {
    const lon = west + (east - west) * i / (GRID - 1);
    const px = Math.max(0, Math.min(mosaicW - 1, lonToPixel(lon)));
    const ix = Math.floor(px), iy = Math.floor(py);
    // bilinear
    const fx = px - ix, fy = py - iy;
    const x2 = Math.min(ix + 1, mosaicW - 1), y2 = Math.min(iy + 1, mosaicH - 1);
    const h00 = mosaic[iy * mosaicW + ix];
    const h10 = mosaic[iy * mosaicW + x2];
    const h01 = mosaic[y2 * mosaicW + ix];
    const h11 = mosaic[y2 * mosaicW + x2];
    let h = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
    if (!Number.isFinite(h) || h <= -1000) h = 70;
    h = Math.max(-20, Math.min(500, h));
    heights[j * GRID + i] = +h.toFixed(1);
    if (h < min) min = h;
    if (h > max) max = h;
    sum += h;
  }
}

const out = {
  meta: {
    source: 'AWS Open Data — Terrain Tiles (Mapzen / EU-DEM Copernicus)',
    provider: 'aws-terrarium',
    format: 'Terrarium PNG',
    url: 'https://registry.opendata.aws/terrain-tiles/',
    tileUrl: TILE_URL,
    zoom: Z,
    generated: new Date().toISOString(),
    bounds: { south, west, north, east },
    grid: GRID,
    min: +min.toFixed(1),
    max: +max.toFixed(1),
    mean: +(sum / (GRID * GRID)).toFixed(1)
  },
  heights
};

fs.writeFileSync(OUT, JSON.stringify(out));
console.log('✓ terrain.json creato');
console.log(`  griglia: ${GRID}×${GRID}`);
console.log(`  quota min/med/max: ${min.toFixed(1)} / ${(sum / (GRID * GRID)).toFixed(1)} / ${max.toFixed(1)} m`);
console.log(`  dimensione: ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB`);
