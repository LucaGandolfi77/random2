import * as THREE from 'three';
import type { PropSpec } from '../data/types';
import type { GeoBatch } from './batch';

const WOOD = 0x7d5d3d;
const DARK_WOOD = 0x5a422c;
const IRON = 0x3b3732;
const STONE = 0xc7bba3;
const STONE_DARK = 0xb3a78f;
const TERRACOTTA = 0xb56b4c;
const LEAF = 0x6d7c48;
const LEAF_LIGHT = 0x7f8e56;
const LEAF_DARK = 0x596941;
const OLIVE_BARK = 0x766b52;

export function addProp(batch: GeoBatch, glow: GeoBatch, prop: PropSpec): THREE.Object3D | null {
  const scale = prop.scale ?? 1;
  const rot = prop.rot ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const place = (lx: number, lz: number): [number, number] => [
    prop.x + lx * cos + lz * sin,
    prop.z - lx * sin + lz * cos
  ];
  const box = (
    w: number,
    h: number,
    d: number,
    lx: number,
    y: number,
    lz: number,
    color: number,
    extraRot = 0
  ): void => {
    const [x, z] = place(lx, lz);
    batch.box(w, h, d, x, y, z, color, 0, rot + extraRot, 0);
  };
  const cyl = (
    top: number,
    bottom: number,
    height: number,
    segments: number,
    lx: number,
    y: number,
    lz: number,
    color: number,
    rx = 0,
    rz = 0
  ): void => {
    const [x, z] = place(lx, lz);
    batch.cylinder(top, bottom, height, segments, x, y, z, color, rx, rot, rz);
  };

  switch (prop.kind) {
    case 'olive': {
      cyl(0.14 * scale, 0.24 * scale, 1.6 * scale, 6, 0, 0.8 * scale, 0, OLIVE_BARK);
      cyl(0.08 * scale, 0.12 * scale, 0.9 * scale, 5, 0.22 * scale, 1.35 * scale, 0.05, OLIVE_BARK, 0, -0.5);
      cyl(0.07 * scale, 0.11 * scale, 0.8 * scale, 5, -0.18 * scale, 1.3 * scale, -0.04, OLIVE_BARK, 0.35, 0.4);
      const blobs = [
        [0, 1.95, 0, 0.85, LEAF],
        [0.55, 1.75, 0.2, 0.66, LEAF_LIGHT],
        [-0.5, 1.8, -0.15, 0.6, LEAF_DARK],
        [0.1, 2.2, -0.45, 0.55, LEAF_LIGHT],
        [-0.2, 1.55, 0.5, 0.52, LEAF]
      ] as const;
      for (const [lx, ly, lz, r, color] of blobs) {
        const [x, z] = place(lx * scale, lz * scale);
        batch.sphere(r * scale, x, ly * scale, z, color, 0, 0.82);
      }
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        box(0.36, 0.14, 0.26, Math.sin(angle) * 0.55, 0.07, Math.cos(angle) * 0.55, STONE_DARK, angle);
      }
      return null;
    }

    case 'cypress': {
      cyl(0.1 * scale, 0.18 * scale, 1.6 * scale, 5, 0, 0.8 * scale, 0, OLIVE_BARK);
      const [x, z] = place(0, 0);
      batch.cone(0.62 * scale, 4.4 * scale, 7, x, 2.7 * scale, z, LEAF_DARK);
      batch.cone(0.45 * scale, 2.4 * scale, 6, x, 4.1 * scale, z, LEAF_DARK);
      return null;
    }

    case 'lantern': {
      box(0.34, 0.16, 0.34, 0, 0.08, 0, STONE_DARK);
      cyl(0.055, 0.075, 2.5, 6, 0, 1.33, 0, IRON);
      box(0.42, 0.06, 0.42, 0, 2.6, 0, IRON);
      box(0.32, 0.05, 0.32, 0, 2.28, 0, IRON);
      box(0.32, 0.05, 0.32, 0, 2.5, 0, IRON);
      for (const [lx, lz] of [
        [-0.14, -0.14],
        [0.14, -0.14],
        [-0.14, 0.14],
        [0.14, 0.14]
      ] as const) {
        box(0.04, 0.24, 0.04, lx, 2.39, lz, IRON);
      }
      const [gx, gz] = place(0, 0);
      glow.box(0.26, 0.2, 0.26, gx, 2.39, gz, 0xffd08a);
      return null;
    }

    case 'bench': {
      box(1.9, 0.12, 0.5, 0, 0.5, 0, WOOD);
      box(1.9, 0.48, 0.11, 0, 0.83, -0.2, WOOD);
      box(0.12, 0.5, 0.5, -0.82, 0.27, 0, DARK_WOOD);
      box(0.12, 0.5, 0.5, 0.82, 0.27, 0, DARK_WOOD);
      box(0.1, 0.55, 0.08, -0.9, 0.75, 0.18, DARK_WOOD);
      box(0.1, 0.55, 0.08, 0.9, 0.75, 0.18, DARK_WOOD);
      return null;
    }

    case 'pot': {
      cyl(0.34, 0.24, 0.42, 10, 0, 0.21, 0, TERRACOTTA);
      cyl(0.37, 0.37, 0.07, 10, 0, 0.43, 0, 0xa95f43);
      const [x, z] = place(0, 0);
      batch.sphere(0.32, x, 0.62, z, LEAF, 0, 0.9);
      batch.sphere(0.24, x + 0.14, 0.74, z + 0.06, LEAF_LIGHT, 0, 0.9);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const [fx, fz] = place(Math.sin(angle) * 0.24, Math.cos(angle) * 0.2);
        batch.sphere(0.07, fx, 0.85 + (i % 2) * 0.06, fz, i % 2 ? 0xd96a5a : 0xe6b05a, 0);
      }
      return null;
    }

    case 'table': {
      const w = prop.w ?? 1.2;
      const d = prop.d ?? 0.8;
      box(w, 0.09, d, 0, 0.76, 0, WOOD);
      for (const [lx, lz] of [
        [-w / 2 + 0.1, -d / 2 + 0.1],
        [w / 2 - 0.1, -d / 2 + 0.1],
        [-w / 2 + 0.1, d / 2 - 0.1],
        [w / 2 - 0.1, d / 2 - 0.1]
      ] as const) {
        box(0.09, 0.75, 0.09, lx, 0.38, lz, DARK_WOOD);
      }
      if (prop.id === 'festival-table') {
        box(w + 0.15, 0.03, d + 0.12, 0, 0.83, 0, 0xf3e6c9);
        for (const [lx, lz, color] of [
          [-0.65, -0.18, 0xd9a45c],
          [-0.32, 0.2, 0xc98e4f],
          [0.05, -0.08, 0xe0b06a],
          [0.55, 0.16, 0xa65a3d],
          [0.82, -0.2, 0x7f8e56]
        ] as const) {
          const [x, z] = place(lx, lz);
          batch.sphere(0.15, x, 0.9, z, color, 0, 0.7);
        }
        for (const [lx, lz] of [
          [-0.95, 0.28],
          [0.95, 0.28]
        ] as const) {
          const [x, z] = place(lx, lz);
          batch.cylinder(0.11, 0.08, 0.16, 8, x, 0.93, z, 0xe8dcc2);
        }
      }
      return null;
    }

    case 'chair': {
      box(0.44, 0.07, 0.44, 0, 0.46, 0, WOOD);
      box(0.44, 0.5, 0.07, 0, 0.72, -0.19, WOOD);
      for (const [lx, lz] of [
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17]
      ] as const) {
        box(0.06, 0.46, 0.06, lx, 0.23, lz, DARK_WOOD);
      }
      return null;
    }

    case 'cart': {
      const [x, z] = place(0, 0);
      box(2, 0.16, 1.2, 0, 0.68, 0, WOOD);
      box(2, 0.34, 0.08, 0, 0.88, 0.58, DARK_WOOD);
      box(2, 0.34, 0.08, 0, 0.88, -0.58, DARK_WOOD);
      box(0.08, 0.34, 1.2, -0.98, 0.88, 0, DARK_WOOD);
      box(0.08, 0.34, 1.2, 0.98, 0.88, 0, DARK_WOOD);
      box(1.5, 0.08, 0.08, 1.6, 0.55, 0.3, DARK_WOOD);
      box(1.5, 0.08, 0.08, 1.6, 0.55, -0.3, DARK_WOOD);
      for (const [lx, lz] of [
        [-0.55, 0.63],
        [0.55, 0.63],
        [-0.55, -0.63],
        [0.55, -0.63]
      ] as const) {
        const [wx, wz] = place(lx, lz);
        batch.cylinder(0.48, 0.48, 0.1, 10, wx, 0.48, wz, 0x4b3d2d, Math.PI / 2, rot, 0);
      }
      batch.sphere(0.3, x - 0.3, 1.05, z + 0.1, 0xd8c39a, 0, 0.8);
      batch.sphere(0.26, x + 0.2, 1.02, z - 0.15, 0xc9b184, 0, 0.8);
      return null;
    }

    case 'wall': {
      const w = prop.w ?? 1;
      const d = prop.d ?? 0.5;
      const h = prop.h ?? 1.2;
      box(w, h, d, 0, h / 2, 0, STONE);
      const count = Math.max(1, Math.floor(Math.max(w, d) / 0.45));
      for (let i = 0; i < count; i++) {
        const along = (i / (count - 1 || 1) - 0.5) * (Math.max(w, d) - 0.3);
        const lx = w > d ? along : 0;
        const lz = w > d ? 0 : along;
        box(
          w > d ? 0.42 : w + 0.06,
          0.14,
          w > d ? d + 0.06 : 0.42,
          lx,
          h + 0.05,
          lz,
          i % 2 ? STONE_DARK : STONE,
          (i % 3 - 1) * 0.08
        );
      }
      return null;
    }

    case 'arch': {
      const span = prop.w ?? 4.4;
      box(0.9, 3.7, 0.9, 0, 1.85, -span / 2, STONE);
      box(0.9, 3.7, 0.9, 0, 1.85, span / 2, STONE);
      const [x, z] = place(0, 0);
      const torus = new THREE.TorusGeometry(span / 2, 0.28, 6, 16, Math.PI);
      batch.add(
        torus,
        STONE,
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, 3.7, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
          new THREE.Vector3(1, 1, 1)
        )
      );
      torus.dispose();
      box(0.5, 0.65, 0.55, 0, 4.72, 0, 0xd4c8b0);
      return null;
    }

    case 'telescope': {
      const [x, z] = place(0, 0);
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const [px, pz] = place(Math.sin(angle) * 0.28, Math.cos(angle) * 0.28);
        batch.cylinder(0.035, 0.045, 1.15, 5, px, 0.58, pz, IRON, 0.18, angle, 0);
      }
      batch.cylinder(0.16, 0.22, 0.12, 8, x, 1.16, z, 0x9a7b46);
      batch.cylinder(0.09, 0.13, 0.85, 8, x, 1.43, z, 0xb08c50, 0.95, 0, Math.PI / 2);
      batch.cylinder(0.055, 0.055, 0.22, 8, x + 0.58, 1.72, z, 0x8a6a3c, 0.95, 0, Math.PI / 2);
      return null;
    }

    case 'laundry': {
      const w = prop.w ?? 6;
      box(0.1, 2.8, 0.1, -w / 2, 1.4, 0, DARK_WOOD);
      box(0.1, 2.8, 0.1, w / 2, 1.4, 0, DARK_WOOD);
      box(w, 0.04, 0.04, 0, 2.6, 0, 0xd8cbb4);
      const cloth = [
        [-w * 0.3, 0xefe4cf],
        [0, 0xe0b3a0],
        [w * 0.28, 0xd7d3c1]
      ] as const;
      for (const [lx, color] of cloth) {
        box(0.75, 0.85, 0.03, lx, 2.15, 0, color);
      }
      return null;
    }

    case 'planter': {
      const w = prop.w ?? 1.4;
      const d = prop.d ?? 0.6;
      box(w, 0.5, d, 0, 0.25, 0, STONE_DARK);
      box(w + 0.08, 0.08, d + 0.08, 0, 0.52, 0, STONE);
      const [x, z] = place(0, 0);
      batch.sphere(0.4, x, 0.72, z, LEAF, 0, 0.7);
      batch.sphere(0.3, x - 0.42, 0.66, z + 0.05, LEAF_LIGHT, 0, 0.7);
      batch.sphere(0.28, x + 0.42, 0.68, z - 0.04, LEAF, 0, 0.7);
      for (let i = 0; i < 4; i++) {
        const [fx, fz] = place((i - 1.5) * 0.32, (i % 2 ? 0.16 : -0.16));
        batch.sphere(0.07, fx, 0.92, fz, i % 2 ? 0xd96a5a : 0xe7b45a, 0);
      }
      return null;
    }

    case 'fountain': {
      cyl(2.25, 2.4, 0.55, 28, 0, 0.28, 0, STONE);
      cyl(2.05, 2.05, 0.06, 28, 0, 0.59, 0, 0x6f9fae);
      cyl(0.38, 0.45, 1.5, 10, 0, 1.25, 0, STONE_DARK);
      cyl(0.9, 0.72, 0.18, 14, 0, 2.02, 0, STONE);
      const [x, z] = place(0, 0);
      batch.sphere(0.18, x, 2.24, z, STONE);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        box(0.18, 0.55, 0.42, Math.sin(angle) * 0.75, 1.9, Math.cos(angle) * 0.75, STONE_DARK, angle);
      }
      const water = new THREE.Group();
      const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x76b4c2,
        transparent: true,
        opacity: 0.78,
        shininess: 90,
        specular: 0xffffff
      });
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.03, 28), waterMaterial);
      disc.position.y = 0.6;
      water.add(disc);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.62, 6), waterMaterial);
        jet.position.set(x + Math.sin(angle) * 0.42, 0.92, z + Math.cos(angle) * 0.42);
        jet.rotation.z = Math.sin(angle) * 0.25;
        jet.rotation.x = -Math.cos(angle) * 0.25;
        water.add(jet);
      }
      water.position.set(0, 0, 0);
      water.userData.center = new THREE.Vector3(x, 0, z);
      water.userData.disc = disc;
      return water;
    }

    default:
      return null;
  }
}
