import * as THREE from 'three';
import { PATHS } from '../data/town';
import type { GeoBatch } from './batch';

const PATH_STONE = 0xbfae88;
const PATH_EDGE = 0xa7946e;
const EARTH = 0xa98e66;
const PIAZZA = 0xc9b58e;

export function createGround(scene: THREE.Scene): THREE.Mesh {
  const texture = makeGroundTexture();
  const material = new THREE.MeshLambertMaterial({ map: texture, color: 0xffffff });
  const geometry = new THREE.PlaneGeometry(320, 320);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

export function addTerrainDetails(batch: GeoBatch): void {
  /* Piazza. */
  batch.cylinder(17, 17, 0.08, 44, 0, 0.03, 4, PIAZZA);
  batch.cylinder(17.5, 17.5, 0.06, 44, 0, 0.02, 4, PATH_EDGE);

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    batch.box(0.18, 0.02, 13.5, Math.sin(angle) * 9.5, 0.08, 4 + Math.cos(angle) * 9.5, 0xb4a077, 0, angle, 0);
  }
  batch.cylinder(17.18, 17.18, 0.14, 44, 0, 0.1, 4, 0xa8946e);
  const innerRing = new THREE.TorusGeometry(10.6, 0.09, 4, 48);
  batch.add(
    innerRing,
    0xb4a077,
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, 0.09, 4),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      new THREE.Vector3(1, 1, 1)
    )
  );
  innerRing.dispose();

  /* Streets: a slab, a darker border and loose paving stones. */
  let seed = 9137;
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (const path of PATHS) {
    const color = path.tone === 'earth' ? EARTH : PATH_STONE;
    batch.box(path.w, 0.05, path.d, path.x, 0.04, path.z, color);
    batch.box(path.w + 0.3, 0.025, path.d + 0.3, path.x, 0.015, path.z, PATH_EDGE);

    const area = path.w * path.d;
    const stones = Math.min(140, Math.floor(area / 1.7));
    for (let i = 0; i < stones; i++) {
      const x = path.x + (random() - 0.5) * (path.w - 0.8);
      const z = path.z + (random() - 0.5) * (path.d - 0.8);
      const tone = new THREE.Color(color).offsetHSL(0, 0, (random() - 0.5) * 0.035);
      batch.box(
        0.24 + random() * 0.34,
        0.025,
        0.2 + random() * 0.28,
        x,
        0.065,
        z,
        tone.getHex(),
        0,
        random() * Math.PI,
        0
      );
    }
  }

  /* Grass and earth under the garden and the olive grove. */
  batch.cylinder(9.2, 9.2, 0.03, 26, 28, 0.015, -28, 0x71814c);
  batch.cylinder(14.5, 14.5, 0.03, 30, -34, 0.014, 31, 0x74844e);
  batch.cylinder(6.5, 6.5, 0.02, 24, -15, 0.012, 30, 0x8e8058);

  /* Soft green borders around the built edge. */
  for (const [x, z, r] of [
    [-36, -34, 7],
    [12, 30, 9],
    [44, 32, 7],
    [-45, 12, 6],
    [44, -34, 8]
  ] as const) {
    batch.cylinder(r, r, 0.02, 20, x, 0.01, z, 0x6f7f4a);
  }

  addHills(batch);
}

function makeGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = '#d5c49f';
  ctx.fillRect(0, 0, size, size);

  let seed = 20240517;
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < 60; i++) {
    const radius = 18 + random() * 60;
    ctx.fillStyle = random() > 0.5 ? 'rgba(160,140,100,0.06)' : 'rgba(255,248,225,0.06)';
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 9000; i++) {
    const shade = random();
    ctx.fillStyle =
      shade > 0.72
        ? 'rgba(255,250,232,0.35)'
        : shade > 0.42
          ? 'rgba(150,130,95,0.22)'
          : 'rgba(90,78,58,0.18)';
    const dot = 0.6 + random() * 1.6;
    ctx.fillRect(random() * size, random() * size, dot, dot);
  }

  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = 'rgba(120,104,78,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let x = random() * size;
    let y = random() * size;
    ctx.moveTo(x, y);
    for (let step = 0; step < 6; step++) {
      x += (random() - 0.5) * 28;
      y += (random() - 0.5) * 28;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(78, 78);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addHills(batch: GeoBatch): void {
  const hills = [
    { x: -110, z: -70, r: 52, h: 34, color: 0x7c8660 },
    { x: -30, z: -120, r: 64, h: 40, color: 0x747f5b },
    { x: 66, z: -118, r: 58, h: 36, color: 0x7f8963 },
    { x: 126, z: -40, r: 54, h: 30, color: 0x899268 },
    { x: 128, z: 60, r: 62, h: 38, color: 0x7c8660 },
    { x: 52, z: 126, r: 66, h: 32, color: 0x879068 },
    { x: -58, z: 126, r: 70, h: 30, color: 0x7a845e },
    { x: -128, z: 52, r: 60, h: 36, color: 0x707a58 }
  ];

  for (const hill of hills) {
    batch.cone(hill.r, hill.h, 6, hill.x, hill.h / 2 - 10, hill.z, hill.color, 0.4);
  }

  /* A handful of trulli on the ridge beyond the belvedere. */
  const trulli = [
    { x: 58, z: 44, s: 1.2 },
    { x: 64, z: 50, s: 0.9 },
    { x: 72, z: 46, s: 1.1 },
    { x: 79, z: 54, s: 0.8 },
    { x: 68, z: 60, s: 1 }
  ];
  for (const trullo of trulli) {
    const radius = 2.1 * trullo.s;
    batch.cylinder(radius, radius * 1.05, 3.2 * trullo.s, 8, trullo.x, 1.6 * trullo.s, trullo.z, 0xe8ddc2);
    batch.cone(radius * 1.18, 2.2 * trullo.s, 8, trullo.x, 4.3 * trullo.s, trullo.z, 0x8d8a83);
  }

  for (const [x, z, s] of [
    [52, 38, 1.6],
    [56, 56, 1.2],
    [74, 40, 1.4],
    [84, 50, 1.1],
    [48, 62, 1.3],
    [-56, 42, 1.4],
    [-60, 22, 1.1]
  ] as const) {
    batch.cylinder(0.16 * s, 0.24 * s, 4.4 * s, 5, x, 2.2 * s, z, 0x4a4132);
    batch.cone(0.75 * s, 3.6 * s, 6, x, 4.6 * s, z, 0x4d5b3f);
  }
}
