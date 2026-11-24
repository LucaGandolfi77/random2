import * as THREE from 'three';
import { CollisionWorld, type Collider } from '../data/colliders';
import { INTERIORS, type InteriorId, type InteriorSpec } from '../data/interiors';
import { TriBatch, staticMaterial } from './batch';
import { createPerson } from './person';

export interface InteriorRuntime {
  spec: InteriorSpec;
  group: THREE.Group;
  colliders: CollisionWorld;
}

export interface InteriorWorld {
  rooms: Record<InteriorId, InteriorRuntime>;
  show(id: InteriorId): void;
  hideAll(): void;
}

const FLOOR = {
  museo: 0x76563b,
  centro: 0xcfc2aa,
  stazione: 0xb8afa0
} as const;

const WALL = {
  museo: 0xe7d8bd,
  centro: 0xe8d7bb,
  stazione: 0xe1d3b8
} as const;

const CEILING = {
  museo: 0xf0e4ce,
  centro: 0xf3e8d4,
  stazione: 0xeee3d0
} as const;

export function createInteriors(scene: THREE.Scene): InteriorWorld {
  const rooms = {} as Record<InteriorId, InteriorRuntime>;
  for (const spec of INTERIORS) {
    rooms[spec.id] = buildRoom(scene, spec);
  }
  return {
    rooms,
    show(id: InteriorId): void {
      for (const [roomId, room] of Object.entries(rooms)) {
        room.group.visible = roomId === id;
      }
    },
    hideAll(): void {
      for (const room of Object.values(rooms)) room.group.visible = false;
    }
  };
}

function buildRoom(scene: THREE.Scene, spec: InteriorSpec): InteriorRuntime {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const batch = new TriBatch();
  const colliders: Collider[] = [];
  const cx = spec.room.x;
  const cz = spec.room.z;
  const w = spec.room.w;
  const d = spec.room.d;
  const h = spec.room.h;
  const wallColor = WALL[spec.id];
  const floorColor = FLOOR[spec.id];
  const ceilingColor = CEILING[spec.id];

  const box = (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    color: number,
    collide = false,
    ry = 0
  ): void => {
    batch.box(width, height, depth, x, y, z, color, ry);
    if (collide) {
      colliders.push({ kind: 'box', x, z, hw: width / 2, hd: depth / 2 });
    }
  };

  const wall = (
    width: number,
    height: number,
    depth: number,
    x: number,
    z: number,
    color: number
  ): void => {
    box(width, height, depth, x, height / 2, z, color, true);
  };

  /* Shell */
  batch.box(w, 0.12, d, cx, 0.06, cz, floorColor);
  batch.box(w, 0.14, d, cx, h, cz, ceilingColor);
  wall(w, h, 0.3, cx, cz - d / 2, wallColor);
  wall(0.3, h, d, cx - w / 2, cz, wallColor);
  wall(0.3, h, d, cx + w / 2, cz, wallColor);

  const doorWidth = 2.4;
  const doorHeight = 2.8;
  const side = (w - doorWidth) / 2;
  wall(side, h, 0.3, cx - doorWidth / 2 - side / 2, cz + d / 2, wallColor);
  wall(side, h, 0.3, cx + doorWidth / 2 + side / 2, cz + d / 2, wallColor);
  batch.box(doorWidth, h - doorHeight, 0.3, cx, doorHeight + (h - doorHeight) / 2, cz + d / 2, wallColor);
  batch.box(doorWidth + 0.5, 0.16, 0.55, cx, 0.08, cz + d / 2 - 0.5, 0xc9a66f);
  batch.box(0.18, 2.9, 0.18, cx - doorWidth / 2 - 0.15, 1.45, cz + d / 2, 0x4b3b28);
  batch.box(0.18, 2.9, 0.18, cx + doorWidth / 2 + 0.15, 1.45, cz + d / 2, 0x4b3b28);
  batch.box(doorWidth + 0.6, 0.18, 0.22, cx, 2.95, cz + d / 2, 0x4b3b28);

  if (spec.id === 'museo') buildMuseum(batch, box, cx, cz, w, d);
  else if (spec.id === 'centro') buildCentro(batch, box, cx, cz, d);
  else buildStazione(batch, box, cx, cz, d, h);

  /* Warm interior light. Hemi light gives the room its base, these give depth. */
  for (const offset of [-Math.min(8, w * 0.25), Math.min(8, w * 0.25)]) {
    const light = new THREE.PointLight(0xffddb0, 18, 18, 2);
    light.position.set(cx + offset, h - 0.7, cz);
    group.add(light);
    batch.box(2.2, 0.12, 0.5, cx + offset, h - 0.12, cz, 0xf3e4c0);
  }

  /* A few low-poly people make the rooms feel inhabited. */
  const people =
    spec.id === 'museo'
      ? [
          ['citizen3', cx + 5, cz + 1.8, 2.4],
          ['citizen2', cx - 6, cz + 2.2, -1.4]
        ]
      : spec.id === 'centro'
        ? [
            ['citizen1', cx - 9, cz + 4, 1.4],
            ['citizen2', cx + 8, cz - 3, -0.8],
            ['citizen3', cx - 3, cz - 6, 0.5],
            ['citizen1', cx + 4, cz + 6, 2.2]
          ]
        : [
            ['citizen2', cx - 7, cz + 2, 1.2],
            ['citizen1', cx + 6, cz + 3, -1.8],
            ['citizen3', cx + 2, cz - 5, 0.4]
          ];
  for (const [look, x, z, rot] of people as Array<[string, number, number, number]>) {
    const person = createPerson(look as Parameters<typeof createPerson>[0]);
    person.group.position.set(x, 0.02, z);
    person.group.rotation.y = rot;
    group.add(person.group);
  }

  const mesh = batch.build(staticMaterial());
  if (mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const bounds = {
    minX: cx - w / 2 + 0.55,
    maxX: cx + w / 2 - 0.55,
    minZ: cz - d / 2 + 0.55,
    maxZ: cz + d / 2 - 0.55
  };
  const collidersWorld = new CollisionWorld(colliders, bounds);
  return { spec, group, colliders: collidersWorld };
}

function buildMuseum(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  w: number,
  d: number
): void {
  batch.box(w - 1.2, 0.02, d - 1.2, cx, 0.13, cz, 0x8b6848);
  const paintings = [0xc2603f, 0x4f8a8b, 0xd9a441, 0x7f8e56];
  for (const [index, color] of paintings.entries()) {
    box(2.6, 1.6, 0.1, cx - 6.5 + index * 4.3, 2.35, cz - d / 2 + 0.23, color);
    batch.box(2.9, 1.9, 0.05, cx - 6.5 + index * 4.3, 2.35, cz - d / 2 + 0.17, 0x4b3b28);
  }
  for (const offset of [-6, 0, 6]) {
    box(2.2, 1.15, 1.1, cx + offset, 0.65, cz - 2, 0x5b4632, true);
    batch.box(1.8, 1.5, 0.08, cx + offset, 1.65, cz - 2.5, 0x9bbfc5);
  }
  box(3.4, 1.1, 1.3, cx + 5.5, 0.62, cz + 2, 0x74533a, true);
  batch.box(3.6, 0.12, 1.5, cx + 5.5, 1.2, cz + 2, 0xd8c7a5);
  box(2.8, 0.5, 0.7, cx - 7, 0.32, cz + 3.2, 0x79563a, true);
  box(2.8, 0.5, 0.7, cx + 2, 0.32, cz + 3.2, 0x79563a, true);
  box(0.55, 2.4, 0.55, cx - 8, 1.2, cz - 3.5, 0xb9553b);
  batch.box(1.0, 1.0, 0.6, cx - 8, 2.6, cz - 3.5, 0xd8c7a5);
  box(1.8, 1.2, 0.9, cx - 2, 0.68, cz - 5.4, 0xcfc3ac, true);
  batch.box(1.6, 0.1, 0.8, cx - 2, 1.33, cz - 5.4, 0x9bbfc5);
}

function buildCentro(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  d: number
): void {
  const shopColors = [0x4f8a8b, 0xc2603f, 0xd9a441, 0x7f8e56];
  for (const [index, color] of shopColors.entries()) {
    const x = cx - 12 + index * 8;
    box(7, 2.5, 0.18, x, 1.35, cz - d / 2 + 0.28, color);
    batch.box(7.6, 0.32, 1.4, x, 2.8, cz - d / 2 + 0.65, 0xe7d1a7);
    batch.box(5.2, 0.95, 0.12, x, 1.7, cz - d / 2 + 0.22, 0xe8eadf);
    box(5.4, 1.0, 1.0, x, 0.55, cz - d / 2 + 1.25, 0x6b5338, true);
    batch.box(5.6, 0.12, 1.1, x, 1.08, cz - d / 2 + 1.25, 0xd8c7a5);
  }
  for (const [x, z] of [
    [cx - 9, cz + 2],
    [cx + 9, cz + 2],
    [cx - 9, cz - 4],
    [cx + 9, cz - 4]
  ] as const) {
    box(2.4, 0.72, 1.4, x, 0.4, z, 0x7b5b3d, true);
    batch.box(2.5, 0.1, 1.5, x, 0.79, z, 0xc7a56b);
    for (const side of [-1.2, 1.2]) {
      batch.box(0.45, 0.5, 0.45, x + side, 0.25, z + 0.8, 0x5b4632);
      batch.box(0.45, 0.5, 0.45, x + side, 0.25, z - 0.8, 0x5b4632);
    }
  }
  for (const [x, z] of [
    [cx - 13, cz - 4],
    [cx + 12, cz - 5],
    [cx - 13, cz + 6],
    [cx + 13, cz + 6]
  ] as const) {
    box(1.2, 0.8, 1.2, x, 0.42, z, 0x6b5338, true);
    batch.box(0.9, 1.3, 0.9, x, 1.45, z, 0x5f7046);
  }
  box(3.8, 1.0, 1.2, cx + 12, 0.58, cz + 9, 0x74533a, true);
  batch.box(4.0, 0.12, 1.4, cx + 12, 1.12, cz + 9, 0xd8c7a5);
  batch.box(0.5, 3.2, 0.5, cx - 15, 1.6, cz + 8.5, 0x4b4034);
  batch.box(2.4, 0.18, 2.4, cx - 15, 3.25, cz + 8.5, 0x9e5b45);
}

function buildStazione(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  d: number,
  h: number
): void {
  for (const [index, x] of [-8, 0, 8].entries()) {
    box(5.2, 1.2, 1.0, cx + x, 0.65, cz - d / 2 + 1.3, 0x6b5338, true);
    batch.box(5.4, 0.12, 1.1, cx + x, 1.3, cz - d / 2 + 1.3, 0xd8c7a5);
    batch.box(4.2, 1.6, 0.12, cx + x, 2.3, cz - d / 2 + 0.2, 0x9bbfc5);
    batch.box(1.4, 1.2, 0.12, cx + x, 2.4, cz - d / 2 + 0.14, 0x35474d);
    if (index === 1) {
      batch.box(10.5, 1.7, 0.18, cx, h - 0.75, cz - d / 2 + 0.22, 0x283033);
      for (let row = 0; row < 3; row++) {
        batch.box(8.8, 0.08, 0.05, cx, h - 1.2 + row * 0.32, cz - d / 2 + 0.34, 0xe9e4d4);
      }
    }
  }
  for (const [x, z] of [
    [cx - 11, cz + 3],
    [cx - 5, cz + 3],
    [cx + 5, cz + 3],
    [cx + 11, cz + 3]
  ] as const) {
    box(3.0, 0.5, 0.7, x, 0.32, z, 0x79563a, true);
    batch.box(3.1, 0.12, 0.8, x, 0.6, z, 0xd8c7a5);
  }
  box(7.0, 1.1, 1.2, cx + 11, 0.62, cz - 2, 0x74533a, true);
  batch.box(7.2, 0.12, 1.4, cx + 11, 1.2, cz - 2, 0xd8c7a5);
  batch.box(3.0, 2.2, 0.2, cx + 11, 2.4, cz - 5.8, 0x4f8a8b);
  box(2.2, 0.8, 1.0, cx - 11, 0.48, cz - 4, 0x6b5338, true);
  batch.box(2.4, 0.12, 1.1, cx - 11, 0.95, cz - 4, 0xd8c7a5);
  batch.box(3.6, 3.4, 0.3, cx - 13, 1.7, cz - d / 2 + 0.2, 0x5b4632);
  batch.box(2.8, 0.7, 0.05, cx - 13, 2.4, cz - d / 2 + 0.37, 0xe9e4d4);
  batch.box(2.8, 0.7, 0.05, cx - 13, 1.45, cz - d / 2 + 0.37, 0xd9a441);
}
