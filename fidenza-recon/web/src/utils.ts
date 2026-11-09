import * as THREE from 'three';

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shade(hex: string, factor: number): string {
  const value = hex.replace('#', '');
  const components = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  return `#${components
    .map((component) => Math.max(0, Math.min(255, Math.round(component * factor))))
    .map((component) => component.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function mixColor(a: string, b: string, t: number): string {
  const av = a.replace('#', '');
  const bv = b.replace('#', '');
  const result = [0, 2, 4].map((offset) => {
    const ca = parseInt(av.slice(offset, offset + 2), 16);
    const cb = parseInt(bv.slice(offset, offset + 2), 16);
    return Math.round(ca + (cb - ca) * t)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${result.join('')}`;
}

export function color(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export interface TextureSet {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

const textureCache = new Map<string, TextureSet>();

function noise(ctx: CanvasRenderingContext2D, random: () => number, amount: number, alpha: number): void {
  ctx.save();
  for (let index = 0; index < amount; index += 1) {
    const value = Math.floor(180 + random() * 70);
    ctx.fillStyle = `rgba(${value},${value},${value},${alpha})`;
    const size = 0.5 + random() * 2.5;
    ctx.fillRect(random() * 256, random() * 256, size, size);
  }
  ctx.restore();
}

function drawPattern(kind: string, ctx: CanvasRenderingContext2D, random: () => number): void {
  const base = 236;
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'brick') {
    const row = 22;
    for (let y = 0; y < 256 + row; y += row) {
      const offset = (Math.floor(y / row) % 2) * 28;
      for (let x = -56; x < 256 + 56; x += 56) {
        const tone = Math.floor(222 + random() * 24);
        ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
        ctx.fillRect(x + offset + 2, y + 2, 52, row - 4);
      }
    }
    ctx.strokeStyle = 'rgba(180,180,180,0.85)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += row) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  } else if (kind === 'stone') {
    ctx.strokeStyle = 'rgba(190,190,190,0.8)';
    ctx.lineWidth = 2;
    const rows = [0, 48, 92, 150, 198, 256];
    for (let r = 0; r < rows.length - 1; r += 1) {
      const y0 = rows[r];
      const y1 = rows[r + 1];
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(256, y0);
      ctx.stroke();
      let x = r % 2 === 0 ? 0 : 40;
      while (x < 256) {
        const width = 50 + random() * 50;
        const tone = Math.floor(220 + random() * 26);
        ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
        ctx.fillRect(x + 1, y0 + 1, width - 2, y1 - y0 - 2);
        ctx.strokeStyle = 'rgba(188,188,188,0.75)';
        ctx.strokeRect(x, y0, width, y1 - y0);
        x += width;
      }
    }
    noise(ctx, random, 800, 0.1);
  } else if (kind === 'tiles') {
    const row = 26;
    for (let y = 0; y < 256 + row; y += row) {
      for (let x = 0; x < 256 + 24; x += 24) {
        const tone = Math.floor(218 + random() * 30);
        ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
        ctx.beginPath();
        ctx.arc(x + 12, y + row / 2, 11, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,180,180,0.7)';
        ctx.stroke();
      }
    }
  } else if (kind === 'concrete' || kind === 'plaster') {
    noise(ctx, random, kind === 'concrete' ? 2400 : 1200, 0.12);
    for (let index = 0; index < 6; index += 1) {
      ctx.fillStyle = `rgba(200,200,200,${0.05 + random() * 0.05})`;
      ctx.fillRect(random() * 256, random() * 256, 40 + random() * 100, 20 + random() * 60);
    }
  } else if (kind === 'asphalt' || kind === 'paving') {
    const tone = kind === 'asphalt' ? 78 : 182;
    ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
    ctx.fillRect(0, 0, 256, 256);
    noise(ctx, random, 3400, 0.18);
    if (kind === 'paving') {
      ctx.strokeStyle = 'rgba(150,150,150,0.9)';
      ctx.lineWidth = 3;
      for (let index = 0; index <= 256; index += 64) {
        ctx.beginPath();
        ctx.moveTo(index, 0);
        ctx.lineTo(index, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, index);
        ctx.lineTo(256, index);
        ctx.stroke();
      }
    }
  } else if (kind === 'wood') {
    for (let index = 0; index < 40; index += 1) {
      ctx.strokeStyle = `rgba(${180 + random() * 40},${180 + random() * 40},${180 + random() * 40},0.35)`;
      ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath();
      const x = random() * 256;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + random() * 12 - 6, 80, x + random() * 12 - 6, 170, x, 256);
      ctx.stroke();
    }
  } else if (kind === 'metal') {
    ctx.fillStyle = 'rgb(225,225,225)';
    ctx.fillRect(0, 0, 256, 256);
    for (let index = 0; index < 120; index += 1) {
      ctx.strokeStyle = `rgba(190,190,190,${0.15 + random() * 0.2})`;
      ctx.beginPath();
      const y = random() * 256;
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + random() * 2 - 1);
      ctx.stroke();
    }
  }
}

export function textureSet(kind: string, seed = 1): TextureSet {
  const key = `${kind}:${seed}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  drawPattern(kind, ctx, mulberry32(seed));
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(canvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.colorSpace = THREE.NoColorSpace;
  const set = { map, bump };
  textureCache.set(key, set);
  return set;
}

export function canvasLabel(text: string, background: string, foreground = '#ffffff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const paddingX = 18;
  const radius = 18;
  ctx.beginPath();
  ctx.roundRect(2, 8, canvas.width - 4, canvas.height - 16, radius);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.strokeStyle = 'rgba(235,228,214,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  let size = 46;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > canvas.width - paddingX * 2 && size > 20) {
    size -= 2;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
  }
  ctx.fillStyle = foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];

  addTriangle(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    uvA: [number, number] = [0, 0],
    uvB: [number, number] = [1, 0],
    uvC: [number, number] = [1, 1],
  ): void {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
    for (const [point, uv] of [
      [a, uvA],
      [b, uvB],
      [c, uvC],
    ] as [THREE.Vector3, [number, number]][]) {
      this.positions.push(point.x, point.y, point.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.uvs.push(uv[0], uv[1]);
    }
  }

  addQuad(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    uvs: [[number, number], [number, number], [number, number], [number, number]] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ): void {
    this.addTriangle(a, b, c, uvs[0], uvs[1], uvs[2]);
    this.addTriangle(a, c, d, uvs[0], uvs[2], uvs[3]);
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.computeBoundingSphere();
    return geometry;
  }
}

export function basisMatrix(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  normal: THREE.Vector3,
): THREE.Matrix4 {
  const xAxis = dir.clone().normalize();
  const yAxis = new THREE.Vector3(0, 1, 0);
  let zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  if (zAxis.dot(normal) < 0) {
    xAxis.negate();
    zAxis.negate();
  }
  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  matrix.setPosition(origin);
  return matrix;
}

export function quilt(matrix: THREE.Matrix4, position: THREE.Vector3, scale: THREE.Vector3): THREE.Matrix4 {
  const translation = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
  const scaling = new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z);
  return matrix.clone().multiply(translation).multiply(scaling);
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('it-IT', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
