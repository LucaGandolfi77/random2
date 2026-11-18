/**
 * Textures and materials for the realistic ground layer.
 *
 * Everything here is generated procedurally at runtime: asphalt aggregate,
 * concrete slabs, porphyry setts, grass, tilled soil, gravel and turf. Colours
 * are tileable, carefully non-square and paired with a normal map so the
 * surface reacts to the sun instead of looking like painted cardboard.
 *
 * The textures are intentionally independent from the voxel block textures:
 * buildings remain Minecraft/Arnis, the ground becomes Fidenza.
 */

import * as THREE from 'three';
import { seededRandom } from './utils.js';

export const GROUND_STYLES = {
  asphalt:  { repeat: 8,  color: '#5f6366', roughness: 0.78, normal: 0.55 },
  concrete: { repeat: 6,  color: '#b8b3a6', roughness: 0.9,  normal: 0.35 },
  porphyry: { repeat: 5,  color: '#8a8175', roughness: 0.82, normal: 0.9 },
  grass:    { repeat: 7,  color: '#5d7d3f', roughness: 0.97, normal: 0.3 },
  soil:     { repeat: 9,  color: '#6b543c', roughness: 0.97, normal: 0.7 },
  gravel:   { repeat: 5,  color: '#9a958c', roughness: 0.92, normal: 0.85 },
  turf:     { repeat: 8,  color: '#4f7a3a', roughness: 0.96, normal: 0.22 },
  cycleway: { repeat: 8,  color: '#8f4a3a', roughness: 0.82, normal: 0.55 }
};

const TEXTURE_SCALE = { high: 512, medium: 256, low: 128 };
const textureCache = new Map();
const materialCache = new Map();

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function shade(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function mix(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/* Seamless low-frequency pattern: integer frequencies make it tile. */
function fbm(x, y, size, phases) {
  let value = 0;
  let amplitude = 0.55;
  let frequency = 1;
  for (let octave = 0; octave < phases.length; octave++) {
    const [p1, p2, p3] = phases[octave];
    const a = (x / size) * Math.PI * 2 * frequency;
    const b = (y / size) * Math.PI * 2 * frequency;
    value += amplitude * (
      Math.sin(a + p1) * Math.cos(b + p2) * 0.7 +
      Math.sin((a + b) * 0.72 + p3) * 0.3
    );
    amplitude *= 0.52;
    frequency *= 2;
  }
  return value;
}

function makePhases(seed, octaves = 5) {
  const rnd = seededRandom(seed);
  return Array.from({ length: octaves }, () => [
    rnd() * Math.PI * 2,
    rnd() * Math.PI * 2,
    rnd() * Math.PI * 2
  ]);
}

/* Draw at the four wrapped positions so a mark crossing an edge continues
   correctly on the opposite side of the texture. */
function wrapDraw(ctx, size, x, y, draw) {
  const xs = [x];
  const ys = [y];
  if (x < 24) xs.push(x + size);
  if (x > size - 24) xs.push(x - size);
  if (y < 24) ys.push(y + size);
  if (y > size - 24) ys.push(y - size);
  for (const dx of xs) {
    for (const dy of ys) draw(dx, dy);
  }
}

function speckles(ctx, size, rnd, colors, count, alpha = 0.45, maxSize = 2) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.35 + rnd() * 0.65);
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    const px = rnd() * size;
    const py = rnd() * size;
    const w = 1 + (rnd() > 0.82 ? 1 : 0) * (1 + maxSize);
    const h = 1 + (rnd() > 0.9 ? 1 : 0);
    wrapDraw(ctx, size, px, py, (x, y) => ctx.fillRect(x, y, w, h));
  }
  ctx.globalAlpha = 1;
}

function softStain(ctx, size, rnd, color, count, radius) {
  for (let i = 0; i < count; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    const rx = radius * (0.45 + rnd() * 0.9);
    const ry = radius * (0.35 + rnd() * 0.7);
    wrapDraw(ctx, size, px, py, (x, y) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

function paintAsphalt(ctx, size, rnd) {
  ctx.fillStyle = '#5f6366';
  ctx.fillRect(0, 0, size, size);
  const phases = makePhases(31);
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x, y, size, phases);
      const index = (y * size + x) * 4;
      const tone = 94 + n * 9;
      image.data[index] = tone;
      image.data[index + 1] = tone + 3;
      image.data[index + 2] = tone + 4;
    }
  }
  ctx.putImageData(image, 0, 0);
  speckles(ctx, size, rnd, ['#4a4e50', '#6f7476', '#54585b', '#7c8081', '#464a4c'], 7200, 0.55, 3);
  // aggregate stones, sparse and slightly larger
  for (let i = 0; i < 950; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    const r = 0.8 + rnd() * 2.4;
    const tone = rnd() > 0.5 ? '#8b8f90' : '#474b4d';
    wrapDraw(ctx, size, px, py, (x, y) => {
      ctx.globalAlpha = 0.35 + rnd() * 0.4;
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.55 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  // cracks
  ctx.strokeStyle = 'rgba(38,41,43,.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    let x = rnd() * size;
    let y = rnd() * size;
    const points = [[x, y]];
    for (let s = 0; s < 7; s++) {
      x += (rnd() - 0.5) * 18;
      y += 4 + rnd() * 12;
      points.push([x, y]);
    }
    wrapDraw(ctx, size, points[0][0], points[0][1], (ox, oy) => {
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      for (let p = 1; p < points.length; p++) {
        ctx.lineTo(points[p][0] + (ox - points[0][0]), points[p][1] + (oy - points[0][1]));
      }
      ctx.stroke();
    });
  }
  softStain(ctx, size, rnd, 'rgba(32,35,37,.22)', 8, 38);
  softStain(ctx, size, rnd, 'rgba(112,116,114,.10)', 5, 60);
}

function paintConcrete(ctx, size, rnd) {
  ctx.fillStyle = '#b8b3a6';
  ctx.fillRect(0, 0, size, size);
  const phases = makePhases(47);
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x, y, size, phases);
      const index = (y * size + x) * 4;
      image.data[index] = 178 + n * 10;
      image.data[index + 1] = 174 + n * 10;
      image.data[index + 2] = 162 + n * 10;
    }
  }
  ctx.putImageData(image, 0, 0);
  speckles(ctx, size, rnd, ['#a7a295', '#c6c1b4', '#918d81', '#d1ccbe'], 3600, 0.35, 1);
  softStain(ctx, size, rnd, 'rgba(92,88,78,.10)', 9, 52);
  // running-bond joints, not a square grid
  const rows = 4;
  ctx.strokeStyle = 'rgba(85,82,74,.34)';
  ctx.lineWidth = Math.max(1, size / 320);
  for (let r = 0; r <= rows; r++) {
    const y = (r / rows) * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? size / 4 : 0;
    for (let c = 0; c <= 2; c++) {
      const x = (c * size) / 2 + offset;
      wrapDraw(ctx, size, x, 0, (ox) => {
        ctx.beginPath();
        ctx.moveTo(ox, (r / rows) * size);
        ctx.lineTo(ox, ((r + 1) / rows) * size);
        ctx.stroke();
      });
    }
  }
  // chips and hairline cracks
  for (let i = 0; i < 22; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    wrapDraw(ctx, size, x, y, (ox, oy) => {
      ctx.fillStyle = `rgba(120,115,104,${0.12 + rnd() * 0.2})`;
      ctx.fillRect(ox, oy, 1 + rnd() * 3, 1);
    });
  }
}

function stonePolygon(ctx, cx, cy, radius, angle, rnd) {
  const points = [];
  const sides = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < sides; i++) {
    const a = angle + (i / sides) * Math.PI * 2;
    const r = radius * (0.72 + rnd() * 0.35);
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function paintPorphyry(ctx, size, rnd) {
  ctx.fillStyle = '#5f5a52';
  ctx.fillRect(0, 0, size, size);
  const cells = 7;
  const cell = size / cells;
  const tones = ['#8a8175', '#958b7d', '#7d7468', '#a0978a', '#756d62', '#8f8578', '#9c9182'];
  for (let row = -1; row <= cells; row++) {
    for (let col = -1; col <= cells; col++) {
      const jitterX = (rnd() - 0.5) * cell * 0.35;
      const jitterY = (rnd() - 0.5) * cell * 0.35;
      const cx = col * cell + cell / 2 + jitterX;
      const cy = row * cell + cell / 2 + jitterY;
      const radius = cell * (0.46 + rnd() * 0.08);
      const angle = rnd() * Math.PI * 2;
      const tone = tones[Math.floor(rnd() * tones.length)];
      ctx.fillStyle = tone;
      ctx.strokeStyle = 'rgba(48,45,40,.38)';
      ctx.lineWidth = Math.max(1, size / 340);
      wrapDraw(ctx, size, cx, cy, (x, y) => {
        stonePolygon(ctx, x, y, radius, angle, seededRandom(Math.floor(cx * 131 + cy * 977)));
        ctx.stroke();
      });
    }
  }
  speckles(ctx, size, rnd, ['#6d655b', '#b3a89a', '#8d8376'], 3800, 0.3, 1);
  softStain(ctx, size, rnd, 'rgba(54,50,44,.14)', 10, 46);
  softStain(ctx, size, rnd, 'rgba(197,185,166,.08)', 6, 60);
  // subtle wet/dark grout pooling
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#3f3b35';
  for (let i = 0; i < 30; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.globalAlpha = 1;
}

function paintGrass(ctx, size, rnd) {
  const phases = makePhases(71, 6);
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x, y, size, phases);
      const m = fbm(x + size * 0.37, y - size * 0.21, size, phases);
      const t = 0.5 + n * 0.32 + m * 0.18;
      const index = (y * size + x) * 4;
      image.data[index] = 62 + t * 38;
      image.data[index + 1] = 92 + t * 42;
      image.data[index + 2] = 44 + t * 22;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  // blades and clumps
  const greens = ['#4f7038', '#5d7d3f', '#6f8f4d', '#7d9a56', '#45642f', '#87a15c'];
  for (let i = 0; i < 7200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const h = 1 + rnd() * 3;
    const lean = (rnd() - 0.5) * 2.5;
    ctx.globalAlpha = 0.25 + rnd() * 0.5;
    ctx.strokeStyle = greens[Math.floor(rnd() * greens.length)];
    ctx.lineWidth = 1;
    wrapDraw(ctx, size, x, y, (ox, oy) => {
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + lean, oy - h);
      ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
  softStain(ctx, size, rnd, 'rgba(38,62,28,.16)', 14, 58);
  softStain(ctx, size, rnd, 'rgba(154,164,92,.09)', 8, 48);
  // sparse tiny flowers
  for (let i = 0; i < 42; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.globalAlpha = 0.5 + rnd() * 0.4;
    ctx.fillStyle = rnd() > 0.5 ? '#e7d77a' : '#e8e2d2';
    wrapDraw(ctx, size, x, y, (ox, oy) => ctx.fillRect(ox, oy, 1, 1));
  }
  ctx.globalAlpha = 1;
}

function paintSoil(ctx, size, rnd) {
  const phases = makePhases(97);
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x, y, size, phases);
      const index = (y * size + x) * 4;
      image.data[index] = 99 + n * 16;
      image.data[index + 1] = 78 + n * 13;
      image.data[index + 2] = 56 + n * 10;
    }
  }
  ctx.putImageData(image, 0, 0);
  speckles(ctx, size, rnd, ['#4f3c2a', '#82684a', '#b09066', '#5d4833'], 5600, 0.4, 1);
  // furrows: wavy horizontal lines
  ctx.strokeStyle = 'rgba(63,46,31,.32)';
  ctx.lineWidth = Math.max(1, size / 300);
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const baseY = (r / rows) * size + size / (rows * 2);
    ctx.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = baseY + Math.sin((x / size) * Math.PI * 4 + r) * 2.2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  softStain(ctx, size, rnd, 'rgba(44,32,21,.18)', 10, 42);
  softStain(ctx, size, rnd, 'rgba(161,133,92,.10)', 6, 50);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(120,96,68,${0.15 + rnd() * 0.25})`;
    wrapDraw(ctx, size, x, y, (ox, oy) => ctx.fillRect(ox, oy, 1 + rnd() * 2, 1));
  }
}

function paintGravel(ctx, size, rnd) {
  ctx.fillStyle = '#8f8a80';
  ctx.fillRect(0, 0, size, size);
  const tones = ['#a8a299', '#817b72', '#bcb6ab', '#6f6a62', '#969086', '#cfc8bb'];
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.8 + rnd() * 2.6;
    ctx.globalAlpha = 0.4 + rnd() * 0.5;
    ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
    wrapDraw(ctx, size, x, y, (ox, oy) => {
      ctx.beginPath();
      ctx.ellipse(ox, oy, r, r * (0.6 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  softStain(ctx, size, rnd, 'rgba(52,48,42,.16)', 8, 44);
}

function paintTurf(ctx, size, rnd) {
  const phases = makePhases(113, 5);
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x, y, size, phases);
      const index = (y * size + x) * 4;
      image.data[index] = 53 + n * 20;
      image.data[index + 1] = 88 + n * 26;
      image.data[index + 2] = 42 + n * 15;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const greens = ['#426b32', '#4f7a3a', '#5d8844', '#39602c'];
  for (let i = 0; i < 6400; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.globalAlpha = 0.2 + rnd() * 0.35;
    ctx.strokeStyle = greens[Math.floor(rnd() * greens.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 2, y - 1 - rnd() * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  softStain(ctx, size, rnd, 'rgba(30,48,24,.12)', 8, 50);
}

function paintCycleway(ctx, size, rnd) {
  ctx.fillStyle = '#8f4a3a';
  ctx.fillRect(0, 0, size, size);
  const phases = makePhases(131);
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x, y, size, phases);
      const index = (y * size + x) * 4;
      image.data[index] = 128 + n * 12;
      image.data[index + 1] = 72 + n * 9;
      image.data[index + 2] = 60 + n * 8;
    }
  }
  ctx.putImageData(image, 0, 0);
  speckles(ctx, size, rnd, ['#71362b', '#a45b48', '#5e2b23', '#b06a55'], 5600, 0.45, 2);
  softStain(ctx, size, rnd, 'rgba(50,24,19,.16)', 7, 40);
}

const PAINTERS = {
  asphalt: paintAsphalt,
  concrete: paintConcrete,
  porphyry: paintPorphyry,
  grass: paintGrass,
  soil: paintSoil,
  gravel: paintGravel,
  turf: paintTurf,
  cycleway: paintCycleway
};

function normalMap(source, size, strength) {
  const canvasEl = canvas(size);
  const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const out = ctx.createImageData(size, size);
  const luminance = (x, y) => {
    const index = ((((y + size) % size) * size) + ((x + size) % size)) * 4;
    return (pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (luminance(x + 1, y) - luminance(x - 1, y)) * strength * 4.2;
      const dy = (luminance(x, y + 1) - luminance(x, y - 1)) * strength * 4.2;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * size + x) * 4;
      out.data[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      out.data[index + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      out.data[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      out.data[index + 3] = 255;
    }
  }
  const normalCanvas = canvas(size);
  normalCanvas.getContext('2d').putImageData(out, 0, 0);
  return normalCanvas;
}

export function groundRepeat(style) {
  return (GROUND_STYLES[style] || GROUND_STYLES.concrete).repeat;
}

export function getGroundTextureSet(style, quality = 'high') {
  const key = `${style}:${quality}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const definition = GROUND_STYLES[style] || GROUND_STYLES.concrete;
  const size = TEXTURE_SCALE[quality] || TEXTURE_SCALE.high;
  const painter = PAINTERS[style] || PAINTERS.concrete;
  const colorCanvas = canvas(size);
  const ctx = colorCanvas.getContext('2d');
  painter(ctx, size, seededRandom(0x51f1 + style.length * 97 + size));
  const color = new THREE.CanvasTexture(colorCanvas);
  color.wrapS = color.wrapT = THREE.RepeatWrapping;
  color.colorSpace = THREE.SRGBColorSpace;
  color.magFilter = THREE.LinearFilter;
  color.minFilter = THREE.LinearMipmapLinearFilter;
  color.generateMipmaps = true;
  color.anisotropy = quality === 'low' ? 1 : quality === 'medium' ? 4 : 8;

  let normal = null;
  if (quality !== 'low') {
    const normalCanvas = normalMap(colorCanvas, Math.max(64, Math.floor(size / 2)), definition.normal);
    normal = new THREE.CanvasTexture(normalCanvas);
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    normal.colorSpace = THREE.NoColorSpace;
    normal.magFilter = THREE.LinearFilter;
    normal.minFilter = THREE.LinearMipmapLinearFilter;
    normal.generateMipmaps = true;
    normal.anisotropy = color.anisotropy;
  }
  const set = { color, normal, repeat: definition.repeat, roughness: definition.roughness };
  textureCache.set(key, set);
  return set;
}

/**
 * Shared StandardMaterial for a ground style. Meshes should carry vertex
 * colours (see paintGroundGeometry) so large areas do not visibly repeat.
 */
export function getGroundMaterial(style, {
  quality = 'high',
  renderer = null,
  vertexColors = true,
  side = THREE.FrontSide,
  normalScale = null
} = {}) {
  const anisotropy = Math.min(
    quality === 'low' ? 2 : 8,
    renderer?.capabilities?.getMaxAnisotropy?.() || 1
  );
  const key = `${style}:${quality}:${vertexColors ? 1 : 0}:${side}:${normalScale ?? 'auto'}`;
  if (materialCache.has(key)) return materialCache.get(key);
  const definition = GROUND_STYLES[style] || GROUND_STYLES.concrete;
  const textures = getGroundTextureSet(style, quality);
  textures.color.anisotropy = anisotropy;
  if (textures.normal) textures.normal.anisotropy = anisotropy;
  const scale = normalScale ?? definition.normal;
  const material = new THREE.MeshStandardMaterial({
    map: textures.color,
    normalMap: textures.normal,
    normalScale: new THREE.Vector2(scale, scale),
    roughness: definition.roughness,
    metalness: 0.0,
    vertexColors,
    side
  });
  material.name = `ground-${style}`;
  material.userData.groundStyle = style;
  materialCache.set(key, material);
  return material;
}

/** Add gentle world-space colour variation so the repeat disappears. */
export function paintGroundGeometry(geometry, { variation = 0.055, tint = '#ffffff', scale = 1 } = {}) {
  if (!geometry?.attributes?.position) return geometry;
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const [tr, tg, tb] = hexToRgb(tint).map(v => v / 255);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 0.021 + z * 0.017) * 0.5 +
      Math.sin(x * 0.007 - z * 0.031) * 0.3 +
      Math.sin((x + z) * 0.043) * 0.2;
    const factor = 1 + n * variation * scale;
    colors[i * 3] = Math.max(0, Math.min(1, tr * factor));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, tg * factor));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, tb * factor));
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function clearGroundTextureCache() {
  textureCache.clear();
  materialCache.clear();
}
