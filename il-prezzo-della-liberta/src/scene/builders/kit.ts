import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
  type Material,
  type Side
} from 'three';
import { mulberry32, seedFromString } from '../../utils/rng';

export interface EnvEventLookup {
  timeOf(id: string): number | null;
}

export interface BuiltEnvironment {
  group: Group;
  update(t: number, events: EnvEventLookup): void;
  dispose(): void;
}

export interface KitUpdater {
  update(t: number, events: EnvEventLookup): void;
}

const materialCache = new Map<string, MeshStandardMaterial>();

export function std(color: string, opts: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number; transparent?: boolean; opacity?: number; side?: Side; flat?: boolean } = {}): MeshStandardMaterial {
  const key = `${color}|${opts.roughness ?? 0.85}|${opts.metalness ?? 0}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 0}|${opts.transparent ? 1 : 0}|${opts.opacity ?? 1}|${opts.side ?? 0}|${opts.flat ?? 1}`;
  const existing = materialCache.get(key);
  if (existing) return existing;
  const mat = new MeshStandardMaterial({
    color: new Color(color),
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0,
    emissive: new Color(opts.emissive ?? '#000000'),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? 0,
    flatShading: opts.flat ?? true
  });
  materialCache.set(key, mat);
  return mat;
}

export function basic(color: string, opts: { transparent?: boolean; opacity?: number; side?: Side } = {}): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: new Color(color), transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1, side: opts.side ?? 0 });
}

export function box(parent: Object3D, w: number, h: number, d: number, mat: Material, x = 0, y = 0, z = 0, shadows = true): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent: Object3D, rTop: number, rBottom: number, h: number, seg: number, mat: Material, x = 0, y = 0, z = 0, shadows = true): Mesh {
  const mesh = new Mesh(new CylinderGeometry(rTop, rBottom, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function plane(parent: Object3D, w: number, h: number, mat: Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, shadows = false): Mesh {
  const mesh = new Mesh(new PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = shadows;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export interface PosterSpec {
  title: string;
  subtitle?: string;
  footer?: string;
  bg: string;
  fg: string;
  accent?: string;
  serif?: boolean;
}

export function posterMaterial(spec: PosterSpec): MeshStandardMaterial {
  const texture = canvasTexture(512, 768, (ctx, w, h) => {
    ctx.fillStyle = spec.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = spec.accent ?? spec.fg;
    ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = spec.accent ?? spec.fg;
    ctx.fillRect(28, h * 0.24, w - 56, 8);
    ctx.fillStyle = spec.fg;
    ctx.textAlign = 'center';
    ctx.font = `${spec.serif ? 'bold 72px Georgia, serif' : 'bold 66px Helvetica Neue, Arial, sans-serif'}`;
    wrapCanvasText(ctx, spec.title, w / 2, h * 0.42, w - 110, 78);
    if (spec.subtitle) {
      ctx.font = '34px Helvetica Neue, Arial, sans-serif';
      wrapCanvasText(ctx, spec.subtitle, w / 2, h * 0.62, w - 130, 44);
    }
    if (spec.footer) {
      ctx.font = '26px Helvetica Neue, Arial, sans-serif';
      ctx.fillText(spec.footer, w / 2, h - 70);
    }
  });
  if (!texture) return std(spec.bg, { roughness: 0.95 });
  return new MeshStandardMaterial({ map: texture, roughness: 0.95, side: DoubleSide });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const words = text.split(' ');
  let line = '';
  let offset = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset);
      offset += lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, y + offset);
}

export function signMaterial(text: string, bg: string, fg: string, opts: { font?: number; border?: string } = {}): MeshStandardMaterial {
  const texture = canvasTexture(512, 192, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, w - 20, h - 20);
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const family = 'Helvetica Neue, Arial, sans-serif';
    let size = opts.font ?? 86;
    const maxWidth = w * 0.86;
    do {
      ctx.font = `bold ${size}px ${family}`;
      size -= 3;
    } while (ctx.measureText(text).width > maxWidth && size > 26);
    ctx.font = `bold ${size + 3}px ${family}`;
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
  if (!texture) return std(bg, { roughness: 0.8 });
  return new MeshStandardMaterial({ map: texture, roughness: 0.8, side: DoubleSide });
}

export function makeSign(text: string, bg: string, fg: string, width: number, height: number, neon = false): Mesh {
  const mat = neon
    ? new MeshBasicMaterial({ map: canvasTexture(512, 192, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const family = 'Helvetica Neue, Arial, sans-serif';
        let size = 90;
        do {
          ctx.font = `bold ${size}px ${family}`;
          size -= 3;
        } while (ctx.measureText(text).width > w * 0.86 && size > 28);
        ctx.font = `bold ${size + 3}px ${family}`;
        ctx.shadowColor = fg;
        ctx.shadowBlur = 26;
        ctx.fillText(text, w / 2, h / 2 + 4);
        ctx.fillText(text, w / 2, h / 2 + 4);
      }) ?? undefined, transparent: true })
    : new MeshBasicMaterial({ map: signMaterial(text, bg, fg).map ?? undefined });
  if (neon && !(mat.map as Texture | null)) {
    mat.color = new Color(fg);
    mat.opacity = 0.9;
  }
  const mesh = new Mesh(new PlaneGeometry(width, height), mat);
  mesh.castShadow = false;
  return mesh;
}

export function skyDome(top: string, bottom: string, radius = 260): Mesh {
  const mat = new ShaderMaterial({
    uniforms: {
      top: { value: new Color(top) },
      bottom: { value: new Color(bottom) }
    },
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vPos; uniform vec3 top; uniform vec3 bottom; void main() { float h = clamp(normalize(vPos).y * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.85)), 1.0); }',
    side: BackSide,
    depthWrite: false,
    fog: false
  });
  const mesh = new Mesh(new SphereGeometry(radius, 16, 10), mat);
  mesh.raycast = () => undefined;
  return mesh;
}

export interface FacadeOptions {
  x: number;
  z: number;
  length: number;
  height: number;
  depth?: number;
  front: 'x+' | 'x-' | 'z+' | 'z-';
  color: string;
  rows?: number;
  cols?: number;
  litRatio?: number;
  seed?: number;
  baseColor?: string;
  emissiveWindows?: boolean;
}

export function facade(options: FacadeOptions): Group {
  const group = new Group();
  const depth = options.depth ?? 5;
  const rows = options.rows ?? 4;
  const cols = options.cols ?? 4;
  const litRatio = options.litRatio ?? 0.35;
  const rng = mulberry32(options.seed ?? seedFromString(`${options.x}:${options.z}:${options.front}`));
  const horizontal = options.front === 'x+' || options.front === 'x-';
  const bodyW = horizontal ? depth : options.length;
  const bodyD = horizontal ? options.length : depth;

  const body = box(group, bodyW, options.height, bodyD, std(options.color, { roughness: 0.95 }), options.x, options.height / 2, options.z);
  body.receiveShadow = true;

  box(group, bodyW + 0.2, 0.35, bodyD + 0.2, std(options.baseColor ?? '#3a3632', { roughness: 0.9 }), options.x, options.height + 0.15, options.z);

  const baseHeight = 2.4;
  box(group, bodyW * 0.98, baseHeight, bodyD * 0.98, std(options.baseColor ?? '#33302c', { roughness: 0.9 }), options.x, baseHeight / 2, options.z);

  const spacing = options.length / cols;
  const winW = spacing * 0.42;
  const winH = ((options.height - baseHeight - 1.6) / rows) * 0.5;
  const litCount = Math.max(0, Math.floor(rows * cols * litRatio));
  const litIndices = new Set<number>();
  while (litIndices.size < litCount) litIndices.add(Math.floor(rng() * rows * cols));

  const litMat = new MeshBasicMaterial({ color: new Color('#ffd9a0'), transparent: true, opacity: 0.92 });
  const darkMat = std('#1c2530', { roughness: 0.35, metalness: 0.15 });

  const litPositions: Array<[number, number, number, number]> = [];
  const darkPositions: Array<[number, number, number, number]> = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const u = -options.length / 2 + spacing * (col + 0.5);
      const y = baseHeight + 1.15 + row * ((options.height - baseHeight - 1.6) / rows);
      const index = row * cols + col;
      let wx = options.x;
      let wz = options.z;
      let rotY = 0;
      if (options.front === 'z+') {
        wx += u;
        wz += depth / 2 + 0.03;
      } else if (options.front === 'z-') {
        wx += u;
        wz -= depth / 2 + 0.03;
        rotY = Math.PI;
      } else if (options.front === 'x+') {
        wx += depth / 2 + 0.03;
        wz += u;
        rotY = Math.PI / 2;
      } else {
        wx -= depth / 2 + 0.03;
        wz += u;
        rotY = -Math.PI / 2;
      }
      const entry: [number, number, number, number] = [wx, y, wz, rotY];
      if (litIndices.has(index)) litPositions.push(entry);
      else darkPositions.push(entry);
    }
  }

  const geo = new PlaneGeometry(winW, winH);
  const dummy = new Object3D();
  const matrix = new Matrix4();
  if (litPositions.length > 0) {
    const inst = new InstancedMesh(geo, litMat, litPositions.length);
    litPositions.forEach(([x, y, z, rot], i) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rot, 0);
      dummy.updateMatrix();
      matrix.copy(dummy.matrix);
      inst.setMatrixAt(i, matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }
  if (darkPositions.length > 0) {
    const inst = new InstancedMesh(geo, darkMat, darkPositions.length);
    darkPositions.forEach(([x, y, z, rot], i) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rot, 0);
      dummy.updateMatrix();
      matrix.copy(dummy.matrix);
      inst.setMatrixAt(i, matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }

  for (let row = 0; row < rows; row += 1) {
    const y = baseHeight + 0.65 + row * ((options.height - baseHeight - 1.6) / rows);
    const ledge = box(group, horizontal ? depth + 0.15 : options.length + 0.15, 0.08, horizontal ? options.length + 0.15 : depth + 0.15, std('#2c2925', { roughness: 0.95 }), options.x, y, options.z);
    ledge.castShadow = false;
  }

  return group;
}

export function streetBase(width: number, length: number, opts: { road?: string; sidewalk?: string; wet?: boolean } = {}): Group {
  const group = new Group();
  const road = box(group, width, 0.08, length, std(opts.road ?? '#2b2e33', { roughness: opts.wet ? 0.35 : 0.85, metalness: 0.08 }), 0, -0.04, 0, false);
  road.receiveShadow = true;
  const sidewalkW = Math.max(1.2, width * 0.22);
  box(group, sidewalkW, 0.16, length, std(opts.sidewalk ?? '#4a4843', { roughness: 0.95 }), -width / 2 - sidewalkW / 2, 0.04, 0, false);
  box(group, sidewalkW, 0.16, length, std(opts.sidewalk ?? '#4a4843', { roughness: 0.95 }), width / 2 + sidewalkW / 2, 0.04, 0, false);
  box(group, 0.1, 0.18, length, std('#5a5852', { roughness: 0.9 }), -width / 2, 0.05, 0, false);
  box(group, 0.1, 0.18, length, std('#5a5852', { roughness: 0.9 }), width / 2, 0.05, 0, false);
  for (let z = -length / 2 + 4; z < length / 2; z += 7) {
    box(group, 0.12, 0.01, 2.4, std('#8e8a80', { roughness: 0.8 }), 0, 0.01, z, false);
  }
  return group;
}

export function puddle(x: number, z: number, r: number, seed = 1): Mesh {
  const mesh = new Mesh(new CircleGeometry(r, 10), std('#26313c', { roughness: 0.16, metalness: 0.35, emissive: '#101821', emissiveIntensity: 0.5, transparent: true, opacity: 0.5 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(1, 1.8, 1);
  mesh.rotation.z = seed * 0.7;
  mesh.position.set(x, 0.015, z);
  mesh.receiveShadow = true;
  return mesh;
}

export function lightPoolTexture(): Texture | null {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255,214,150,0.55)');
    gradient.addColorStop(0.45, 'rgba(255,190,110,0.18)');
    gradient.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

let poolTexture: Texture | null | undefined;

export function lightPool(x: number, z: number, radius: number, color = '#ffc987'): Mesh {
  if (poolTexture === undefined) poolTexture = lightPoolTexture();
  const mat = new MeshBasicMaterial({
    map: poolTexture ?? undefined,
    color: new Color(color),
    transparent: true,
    opacity: poolTexture ? 0.9 : 0.16,
    blending: AdditiveBlending,
    depthWrite: false
  });
  const mesh = new Mesh(new PlaneGeometry(radius * 2, radius * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  return mesh;
}

export function lampPost(x: number, z: number, opts: { warm?: boolean; withLight?: boolean; height?: number } = {}): Group {
  const group = new Group();
  const h = opts.height ?? 4.6;
  const metal = std('#262a2e', { roughness: 0.55, metalness: 0.45 });
  cylinder(group, 0.05, 0.09, h, 6, metal, x, h / 2, z);
  box(group, 0.5, 0.06, 0.08, metal, x + 0.22, h - 0.05, z);
  const color = opts.warm === false ? '#cfd8e4' : '#ffc978';
  const bulb = new Mesh(new SphereGeometry(0.13, 6, 4), new MeshBasicMaterial({ color: new Color(color) }));
  bulb.position.set(x + 0.45, h - 0.12, z);
  group.add(bulb);
  group.add(lightPool(x + 0.5, z, 3.2, color));
  if (opts.withLight) {
    const light = new PointLight(new Color(color), 60, 22, 2);
    light.position.set(x + 0.45, h - 0.25, z);
    group.add(light);
  }
  return group;
}

export function rainCurtain(width: number, height: number, opacity = 0.22): { group: Group; update: (t: number) => void } {
  const group = new Group();
  const texture = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 160; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 24 + Math.random() * 60;
      ctx.strokeStyle = `rgba(200,220,240,${0.12 + Math.random() * 0.18})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + len);
      ctx.stroke();
    }
  });
  if (texture) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(2, 1.4);
  }
  const mat = new MeshBasicMaterial({
    map: texture ?? undefined,
    color: new Color('#c8d8ea'),
    transparent: true,
    opacity: texture ? opacity : opacity * 0.4,
    depthWrite: false,
    side: DoubleSide
  });
  const planes: Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const mesh = new Mesh(new PlaneGeometry(width, height), mat);
    mesh.position.set(0, height / 2, -i * 2.2);
    mesh.raycast = () => undefined;
    planes.push(mesh);
    group.add(mesh);
  }
  return {
    group,
    update: (t: number) => {
      if (texture) texture.offset.y = -((t * 0.55) % 1);
      planes.forEach((p, i) => {
        p.position.x = Math.sin(t * 0.12 + i) * 0.25;
      });
    }
  };
}

const carColors: Record<string, string> = {
  clio1: '#8f3a33',
  clio2: '#2f4a63',
  '206': '#b8b2a4',
  saxo: '#4d5a44',
  taxi: '#d9cfb8'
};

export type CarKind = keyof typeof carColors;

export function car(kind: CarKind, x: number, z: number, rotation = 0, color?: string): Group {
  const group = new Group();
  const bodyMat = std(color ?? carColors[kind], { roughness: 0.45, metalness: 0.25 });
  const glassMat = std('#1a232b', { roughness: 0.12, metalness: 0.6 });
  const tire = std('#15171a', { roughness: 0.95 });
  const isTaxi = kind === 'taxi';
  const length = kind === 'clio1' ? 3.55 : kind === 'clio2' ? 3.7 : kind === '206' ? 3.82 : kind === 'saxo' ? 3.68 : 4.35;
  const width = isTaxi ? 1.78 : 1.62;
  const bodyH = 0.62;

  box(group, width, bodyH, length, bodyMat, 0, 0.52, 0);
  const cabin = box(group, width * 0.9, 0.5, length * 0.48, bodyMat, 0, 1.02, -length * 0.04);
  cabin.scale.z = 1;
  box(group, width * 0.82, 0.38, length * 0.42, glassMat, 0, 1.04, -length * 0.04);
  box(group, width * 0.86, 0.08, length * 0.09, glassMat, 0, 1.02, length * 0.2);
  box(group, width * 1.02, 0.12, 0.25, std('#1a1a1a', { roughness: 0.8 }), 0, 0.36, length / 2 + 0.02);
  box(group, width * 1.02, 0.12, 0.25, std('#1a1a1a', { roughness: 0.8 }), 0, 0.36, -length / 2 - 0.02);

  const wheelGeo = new CylinderGeometry(0.28, 0.28, 0.18, 8);
  const wheelPositions: Array<[number, number]> = [
    [-width / 2 - 0.02, length * 0.31],
    [width / 2 + 0.02, length * 0.31],
    [-width / 2 - 0.02, -length * 0.31],
    [width / 2 + 0.02, -length * 0.31]
  ];
  for (const [wx, wz] of wheelPositions) {
    const wheel = new Mesh(wheelGeo, tire);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.29, wz);
    wheel.castShadow = true;
    group.add(wheel);
  }

  const headMat = new MeshBasicMaterial({ color: new Color('#ffe6b0') });
  const tailMat = new MeshBasicMaterial({ color: new Color('#a12c25') });
  box(group, 0.24, 0.12, 0.03, headMat, -width * 0.32, 0.62, length / 2 + 0.01, false);
  box(group, 0.24, 0.12, 0.03, headMat, width * 0.32, 0.62, length / 2 + 0.01, false);
  box(group, 0.2, 0.1, 0.03, tailMat, -width * 0.34, 0.62, -length / 2 - 0.01, false);
  box(group, 0.2, 0.1, 0.03, tailMat, width * 0.34, 0.62, -length / 2 - 0.01, false);

  if (isTaxi) {
    const signMat = signMaterial('TAXI', '#f4efe2', '#20262c', { font: 96 });
    const sign = new Mesh(new PlaneGeometry(0.7, 0.22), signMat);
    sign.position.set(0, 1.36, -0.1);
    group.add(sign);
  }

  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

export function bus(x: number, z: number, rotation = 0): Group {
  const group = new Group();
  const bodyMat = std('#c8c3b4', { roughness: 0.55, metalness: 0.15 });
  const blue = std('#2f5b7a', { roughness: 0.5, metalness: 0.1 });
  const glass = std('#1c2830', { roughness: 0.15, metalness: 0.5 });
  box(group, 2.5, 2.4, 10.5, bodyMat, 0, 1.55, 0);
  box(group, 2.54, 0.5, 10.5, blue, 0, 0.62, 0);
  box(group, 2.42, 0.9, 9.2, glass, 0, 2.15, -0.2);
  box(group, 2.3, 0.1, 10.4, blue, 0, 2.8, 0);
  box(group, 1.9, 0.9, 0.08, glass, 0, 2.0, 5.26);
  const wheelGeo = new CylinderGeometry(0.5, 0.5, 0.3, 10);
  for (const wx of [-1.25, 1.25]) {
    for (const wz of [-3.4, 3.4]) {
      const wheel = new Mesh(wheelGeo, std('#141618', { roughness: 0.95 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.5, wz);
      group.add(wheel);
    }
  }
  const routeMat = new MeshBasicMaterial({ color: new Color('#ffd28a') });
  const route = new Mesh(new PlaneGeometry(1.8, 0.34), routeMat);
  route.position.set(0, 2.55, 5.31);
  group.add(route);
  box(group, 0.28, 0.16, 0.04, new MeshBasicMaterial({ color: new Color('#ffe9bf') }), -0.95, 0.72, 5.27, false);
  box(group, 0.28, 0.16, 0.04, new MeshBasicMaterial({ color: new Color('#ffe9bf') }), 0.95, 0.72, 5.27, false);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

export interface CrowdPath {
  from: [number, number];
  to: [number, number];
  speed: number;
  offset: number;
}

export function createCrowd(count: number, paths: CrowdPath[], colors: string[], seed = 7): { group: Group; update: (t: number) => void } {
  const group = new Group();
  const rng = mulberry32(seed);
  const people: Array<{ root: Group; path: CrowdPath; phase: number; scale: number }> = [];
  const coatMats = colors.map((c) => std(c, { roughness: 0.95 }));
  const skinMats = ['#c49a7e', '#a97c61', '#d5b096', '#8a624c'].map((c) => std(c, { roughness: 0.85 }));

  for (let i = 0; i < count; i += 1) {
    const root = new Group();
    const scale = 0.92 + rng() * 0.16;
    const coat = coatMats[Math.floor(rng() * coatMats.length)];
    const skin = skinMats[Math.floor(rng() * skinMats.length)];
    const coatMesh = box(root, 0.4, 0.78, 0.24, coat, 0, 1.12, 0);
    coatMesh.castShadow = true;
    box(root, 0.34, 0.55, 0.2, std('#2a2c30', { roughness: 0.95 }), 0, 0.48, 0, false);
    box(root, 0.1, 0.62, 0.12, coat, -0.25, 1.08, 0, false);
    box(root, 0.1, 0.62, 0.12, coat, 0.25, 1.08, 0, false);
    const head = new Mesh(new SphereGeometry(0.115, 5, 4), skin);
    head.position.y = 1.63;
    root.add(head);
    if (rng() > 0.6) {
      cylinder(root, 0.13, 0.13, 0.04, 6, std('#2a2a2e', { roughness: 1 }), 0, 1.72, 0, false);
    }
    root.scale.setScalar(scale);
    group.add(root);
    people.push({ root, path: paths[Math.floor(rng() * paths.length)], phase: rng() * 2, scale });
  }

  return {
    group,
    update: (t: number) => {
      for (const person of people) {
        const total = person.phase + t * person.path.speed * 0.06;
        const u = total % 2;
        const ping = u < 1 ? u : 2 - u;
        const dir = u < 1 ? 1 : -1;
        const x = person.path.from[0] + (person.path.to[0] - person.path.from[0]) * ping;
        const z = person.path.from[1] + (person.path.to[1] - person.path.from[1]) * ping;
        person.root.position.set(x, Math.abs(Math.sin(total * 8)) * 0.02, z);
        person.root.rotation.y = Math.atan2((person.path.to[0] - person.path.from[0]) * dir, (person.path.to[1] - person.path.from[1]) * dir);
      }
    }
  };
}

export function bench(x: number, z: number, rotation = 0, length = 2.4): Group {
  const group = new Group();
  const wood = std('#5a4535', { roughness: 0.9 });
  const metal = std('#202326', { roughness: 0.5, metalness: 0.4 });
  box(group, length, 0.08, 0.5, wood, 0, 0.45, 0);
  box(group, length, 0.45, 0.07, wood, 0, 0.72, -0.26);
  for (const side of [-1, 1]) {
    box(group, 0.08, 0.45, 0.45, metal, side * (length / 2 - 0.18), 0.22, 0);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

export function trashBin(x: number, z: number): Group {
  const group = new Group();
  cylinder(group, 0.24, 0.2, 0.75, 8, std('#3a4038', { roughness: 0.8 }), 0, 0.38, 0);
  cylinder(group, 0.26, 0.26, 0.05, 8, std('#20241f', { roughness: 0.7 }), 0, 0.77, 0);
  group.position.set(x, 0, z);
  return group;
}

export function shutter(x: number, z: number, width: number, height: number, rotation = 0, color = '#5b5f62'): Group {
  const group = new Group();
  box(group, width, height, 0.08, std(color, { roughness: 0.7, metalness: 0.3 }), 0, height / 2, 0);
  for (let i = 1; i < 9; i += 1) {
    box(group, width * 0.95, 0.02, 0.02, std('#3a3d40', { roughness: 0.6 }), 0, (height / 9) * i, 0.05, false);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

export function phoneBooth(x: number, z: number, rotation = 0): Group {
  const group = new Group();
  const frame = std('#2f3b44', { roughness: 0.5, metalness: 0.4 });
  const glass = std('#9db4bd', { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.15 });
  box(group, 1.0, 2.3, 0.08, frame, 0, 1.15, -0.5);
  box(group, 0.08, 2.3, 1.0, glass, -0.46, 1.15, 0);
  box(group, 0.08, 2.3, 1.0, glass, 0.46, 1.15, 0);
  box(group, 1.0, 0.08, 1.0, frame, 0, 2.3, 0);
  box(group, 0.22, 0.34, 0.1, std('#1b2228', { roughness: 0.6 }), 0, 1.35, -0.44);
  const sign = new Mesh(new PlaneGeometry(0.72, 0.24), signMaterial('TÉLÉPHONE', '#1f2a26', '#d8e2c8', { font: 74, border: '#5f7a64' }));
  sign.position.set(0, 2.05, 0.47);
  group.add(sign);
  box(group, 0.26, 0.3, 0.12, std('#1b2228', { roughness: 0.6 }), 0, 1.2, -0.38, false);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

export function metroEntrance(x: number, z: number, rotation = 0): Group {
  const group = new Group();
  const green = std('#2e5c46', { roughness: 0.45, metalness: 0.35 });
  box(group, 4.2, 0.1, 3.2, std('#101216', { roughness: 0.95 }), 0, 0.03, 0);
  box(group, 4.4, 0.12, 0.2, green, 0, 1.02, -1.6);
  box(group, 0.2, 1.0, 3.2, green, -2.1, 0.55, 0);
  box(group, 0.2, 1.0, 3.2, green, 2.1, 0.55, 0);
  for (let i = 0; i < 7; i += 1) {
    const post = cylinder(group, 0.03, 0.03, 1.0, 5, green, -2.1 + i * 0.7, 0.55, -1.45, false);
    post.castShadow = false;
  }
  const signMat = signMaterial('MÉTRO', '#2e5c46', '#f2e9d0', { font: 88, border: '#d8c98e' });
  const sign = new Mesh(new PlaneGeometry(2.1, 0.7), signMat);
  sign.position.set(0, 2.15, -1.5);
  group.add(sign);
  cylinder(group, 0.035, 0.05, 2.0, 6, green, -1.9, 1.0, -1.5);
  cylinder(group, 0.035, 0.05, 2.0, 6, green, 1.9, 1.0, -1.5);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

export function graffiti(x: number, z: number, width: number, height: number, rotation = 0, seed = 3): Mesh {
  const rng = mulberry32(seed);
  const texture = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const colors = ['#c4553f', '#3f6fc4', '#c4b23f', '#4fae8a'];
    for (let i = 0; i < 7; i += 1) {
      ctx.strokeStyle = colors[Math.floor(rng() * colors.length)];
      ctx.lineWidth = 12 + rng() * 22;
      ctx.beginPath();
      ctx.moveTo(rng() * w, rng() * h);
      ctx.bezierCurveTo(rng() * w, rng() * h, rng() * w, rng() * h, rng() * w, rng() * h);
      ctx.stroke();
    }
    ctx.fillStyle = '#f2e9d8';
    ctx.font = 'bold 64px Helvetica Neue, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIBERTÉ', w / 2, h * 0.72);
  });
  const mat = new MeshBasicMaterial({ map: texture ?? undefined, transparent: true, opacity: texture ? 0.95 : 0.4, side: DoubleSide });
  const mesh = new Mesh(new PlaneGeometry(width, height), mat);
  mesh.position.set(x, height / 2 + 0.3, z);
  mesh.rotation.y = rotation;
  return mesh;
}

export function addFluorescent(parent: Object3D, x: number, y: number, z: number, length = 2.4, color = '#e8f4f8', intensity = 1.0): Mesh {
  const mesh = box(parent, length, 0.08, 0.18, new MeshBasicMaterial({ color: new Color(color) }), x, y, z, false);
  const light = new MeshStandardMaterial({ color: new Color('#ffffff'), emissive: new Color(color), emissiveIntensity: intensity, roughness: 1 });
  mesh.material = light;
  return mesh;
}

export function makeEnv(): { group: Group; updaters: KitUpdater[] } {
  return { group: new Group(), updaters: [] };
}

export function pointsDust(count: number, area: number, seed = 1): Points {
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (rng() - 0.5) * area;
    positions[i * 3 + 1] = rng() * area * 0.35;
    positions[i * 3 + 2] = (rng() - 0.5) * area;
  }
  const buffer = new BufferGeometry();
  buffer.setAttribute('position', new BufferAttribute(positions, 3));
  return new Points(buffer, new PointsMaterial({ color: new Color('#d9d2c1'), size: 0.03, transparent: true, opacity: 0.35, depthWrite: false }));
}

export function vector(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z);
}
