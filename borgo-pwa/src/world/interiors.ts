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
  stazione: 0xb8afa0,
  pala: 0xb98f62,
  piscina: 0xb8c2bd,
  teatro: 0x6b3f35,
  comunale: 0xd6cbb4,
  taverna: 0x6b4a32,
  bar: 0xd8cbb2
} as const;

const WALL = {
  museo: 0xe7d8bd,
  centro: 0xe8d7bb,
  stazione: 0xe1d3b8,
  pala: 0xe3d6c0,
  piscina: 0xdce5e2,
  teatro: 0xe7d2b8,
  comunale: 0xe9ddc4,
  taverna: 0xd8c4a3,
  bar: 0xe8d8bd
} as const;

const CEILING = {
  museo: 0xf0e4ce,
  centro: 0xf3e8d4,
  stazione: 0xeee3d0,
  pala: 0xf0e6d4,
  piscina: 0xeef3ee,
  teatro: 0xf3e4cf,
  comunale: 0xf4e9d6,
  taverna: 0xd9c5a6,
  bar: 0xf2e6d2
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
  else if (spec.id === 'stazione') buildStazione(batch, box, cx, cz, d, h);
  else if (spec.id === 'pala') buildPala(batch, box, cx, cz, d);
  else if (spec.id === 'piscina') buildPiscina(batch, box, cx, cz);
  else if (spec.id === 'teatro') buildTeatro(batch, box, cx, cz, d);
  else if (spec.id === 'comunale') buildPalazzo(batch, box, cx, cz, w, d);
  else if (spec.id === 'taverna') buildTaverna(batch, box, cx, cz, w, d);
  else buildBar(batch, box, cx, cz, w, d);

  /* Warm interior light. Hemi light gives the room its base, these give depth. */
  for (const offset of [-Math.min(8, w * 0.25), Math.min(8, w * 0.25)]) {
    const light = new THREE.PointLight(0xffddb0, 18, 18, 2);
    light.position.set(cx + offset, h - 0.7, cz);
    group.add(light);
    batch.box(2.2, 0.12, 0.5, cx + offset, h - 0.12, cz, 0xf3e4c0);
  }

  if (spec.id === 'taverna') {
    const fire = new THREE.PointLight(0xff9b4a, 14, 10, 2);
    fire.position.set(cx - 5, 1.5, cz - 6.2);
    group.add(fire);
  }
  if (spec.id === 'bar') {
    const daylight = new THREE.PointLight(0xd7e6e1, 6, 12, 2);
    daylight.position.set(cx + 6, 2.5, cz + 1);
    group.add(daylight);
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
        : spec.id === 'stazione'
          ? [
              ['citizen2', cx - 7, cz + 2, 1.2],
              ['citizen1', cx + 6, cz + 3, -1.8],
              ['citizen3', cx + 2, cz - 5, 0.4]
            ]
          : spec.id === 'pala'
            ? [
                ['citizen1', cx - 4, cz - 2, 1.4],
                ['citizen2', cx + 3, cz - 3, -0.6],
                ['citizen3', cx + 1, cz + 2, 2.5],
                ['citizen1', cx + 9.1, cz + 1, -1.5]
              ]
            : spec.id === 'piscina'
              ? [
                  ['citizen2', cx - 8.3, cz - 2, 1.2],
                  ['citizen1', cx + 8.3, cz + 2, -1.4],
                  ['citizen3', cx - 8.5, cz + 4, 0.5]
                ]
              : spec.id === 'teatro'
                ? [
                    ['citizen1', cx - 3, cz - 3.4, 1.2],
                    ['citizen2', cx + 3, cz - 3.4, -0.8],
                    ['citizen3', cx - 11, cz + 2, 2.4],
                    ['citizen1', cx + 11, cz + 5.5, -2.1]
                  ]
                : spec.id === 'comunale'
                  ? [
                      ['citizen2', cx - 9.5, cz + 6.2, 0.2],
                      ['citizen1', cx - 3.5, cz - 3.5, 2.6],
                      ['citizen3', cx + 7.6, cz - 1.6, -1.2],
                      ['citizen1', cx + 10.2, cz + 5.2, 2.0]
                    ]
                  : spec.id === 'taverna'
                    ? [
                        ['citizen2', cx + 10.2, cz - 1.6, -1.4],
                        ['pilgrim', cx - 7, cz - 1.0, 1.4],
                        ['citizen3', cx - 6.4, cz + 4.1, -1.8],
                        ['citizen2', cx + 7.2, cz - 3.2, -1.2]
                      ]
                    : [
                        ['citizen2', cx - 2.2, cz - 5.6, 0.4],
                        ['citizen1', cx - 4.8, cz + 1.2, 1.2],
                        ['citizen3', cx + 4.0, cz + 1.4, -0.9],
                        ['citizen1', cx + 3.2, cz - 3.4, 0.7]
                      ];
  for (const [look, x, z, rot] of people as Array<[string, number, number, number]>) {
    const person = createPerson(look as Parameters<typeof createPerson>[0]);
    person.group.position.set(x, 0.02, z);
    person.group.rotation.y = rot;
    group.add(person.group);
  }

  if (spec.id === 'taverna') {
    const musician = createPerson('citizen1');
    musician.group.position.set(cx - 2.8, 0.02, cz - 5.4);
    musician.group.rotation.y = 0.3;
    const instrument = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x9a5a33, flatShading: true });
    const darkWood = new THREE.MeshLambertMaterial({ color: 0x593a24, flatShading: true });
    const guitarBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.14), wood);
    guitarBody.position.set(0, 1.05, 0.2);
    const guitarNeck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.08), darkWood);
    guitarNeck.position.set(0.02, 1.6, 0.2);
    guitarNeck.rotation.z = -0.22;
    const soundHole = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.2, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x3a2b20, flatShading: true })
    );
    soundHole.position.set(0, 1.02, 0.28);
    instrument.add(guitarBody, guitarNeck, soundHole);
    musician.group.add(instrument);
    group.add(musician.group);
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

function topDisc(
  batch: TriBatch,
  x: number,
  z: number,
  radius: number,
  segments: number,
  y: number,
  color: number
): void {
  const points: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
  }
  batch.polygonTop(points, y, color);
}

function buildPala(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  d: number
): void {
  box(20, 0.03, 12, cx, 0.15, cz, 0xc59b68);
  for (const z of [-5.9, 0, 5.9]) box(19, 0.03, 0.12, cx, 0.17, cz + z, 0xeee7d8);
  for (const x of [-9.9, 0, 9.9]) box(0.12, 0.03, 11.8, cx + x, 0.17, cz, 0xeee7d8);
  topDisc(batch, cx, cz, 1.8, 20, 0.18, 0xc59b68);
  topDisc(batch, cx, cz, 1.75, 20, 0.185, 0xeee7d8);
  for (const side of [-1, 1]) {
    box(0.4, 3.2, 0.4, cx + side * 9.6, 1.6, cz - 5.9, 0x4b4034);
    batch.box(1.8, 1.2, 0.18, cx + side * 8.7, 2.7, cz - 5.9, 0xf1ead7);
    batch.box(0.18, 0.18, 0.18, cx + side * 8.7, 3.3, cz - 5.9, 0xf1ead7);
    box(4.0, 0.8, 10, cx + side * 12, 0.4, cz, 0x8e5b4a);
    box(4.0, 0.7, 10, cx + side * 12, 1.0, cz, 0x9a5a46);
  }
  box(10, 2.6, 0.2, cx, 3.6, cz - d / 2 + 0.3, 0x283033);
  batch.box(8.5, 0.12, 0.05, cx, 4.45, cz - d / 2 + 0.42, 0xe9e4d4);
  batch.box(8.5, 0.12, 0.05, cx, 3.55, cz - d / 2 + 0.42, 0xe9e4d4);
  for (const side of [-1, 1]) {
    batch.box(2.0, 2.4, 0.12, cx + side * 10, 2.2, cz + d / 2 - 0.1, 0x35474d);
  }
  box(3.2, 0.9, 0.7, cx - 12, 0.45, cz - 6.5, 0x79563a, true);
  box(3.2, 0.9, 0.7, cx + 12, 0.45, cz + 6.5, 0x79563a, true);
}

function buildPiscina(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number
): void {
  box(14, 0.12, 7, cx, 0.13, cz, 0x6f9fae, true);
  box(14.8, 0.2, 7.8, cx, 0.08, cz, 0xd8d0bb);
  for (let lane = -3; lane <= 3; lane++) {
    box(0.07, 0.03, 6.6, cx + lane * 1.0, 0.23, cz, 0xeee7d8);
  }
  for (const z of [-2.8, -2.3, 2.8, 3.3]) {
    batch.box(13.5, 0.04, 0.06, cx, 0.2, cz + z, 0xe08b4a);
  }
  for (const x of [-6.8, -4.8, 4.8, 6.8]) {
    box(0.5, 0.5, 0.5, cx + x, 0.28, cz - 3.8, 0xd9a441);
  }
  for (const side of [-1, 1]) {
    box(3.6, 0.5, 9, cx + side * 11.5, 0.25, cz, 0x7b6a58);
    box(3.6, 0.6, 9, cx + side * 11.5, 0.7, cz, 0x8e7b62);
    batch.box(3.0, 0.18, 2.2, cx + side * 11.5, 1.1, cz - 2, 0xe9e4d4);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      batch.box(2.2, 0.9, 0.18, cx + side * (10.5 + i * 0.2), 1.8 + i * 0.4, cz - 7.5, 0x9bbfc5);
    }
  }
  box(3.4, 0.8, 0.9, cx - 10, 0.4, cz + 5.5, 0x79563a, true);
  box(3.4, 0.8, 0.9, cx + 10, 0.4, cz + 5.5, 0x79563a, true);
  batch.box(1.2, 2.4, 0.2, cx - 12.5, 3.2, cz - 7.5, 0x35474d);
}

function buildTeatro(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  d: number
): void {
  batch.box(2.2, 0.025, 14.6, cx, 0.145, cz + 2.2, 0x8c3b32);
  batch.box(2.7, 0.02, 0.35, cx, 0.16, cz + 9.7, 0xd9a441);
  box(18, 0.9, 5, cx, 0.45, cz - d / 2 + 3.2, 0x6d3d30, true);
  box(19, 0.3, 5.2, cx, 1.05, cz - d / 2 + 3.2, 0x9e5b45);
  batch.box(18, 6.8, 0.2, cx, 4.4, cz - d / 2 + 0.3, 0x8b3f33);
  for (const x of [-8.5, -4.3, 0, 4.3, 8.5]) {
    batch.box(3.6, 5.8, 0.08, cx + x, 4.0, cz - d / 2 + 0.42, 0xb9553b);
  }
  box(22, 0.3, 0.2, cx, 8.0, cz - d / 2 + 0.5, 0xd9a441);
  for (const x of [-6.8, -3.4, 0, 3.4, 6.8]) {
    batch.box(0.4, 0.2, 0.5, cx + x, 7.7, cz - d / 2 + 1.0, 0xf3e4c0);
    batch.box(0.6, 0.5, 0.6, cx + x, 7.9, cz - d / 2 + 1.0, 0xd9a441);
  }
  for (let row = 0; row < 6; row++) {
    const z = cz - 1.0 + row * 2.2;
    for (const side of [-1, 1]) {
      box(8.0, 0.55, 1.0, cx + side * 5.2, 0.28, z, 0x7c2f2a, true);
      box(8.0, 0.7, 0.22, cx + side * 5.2, 0.65, z + 0.55, 0x8f3a32);
    }
  }
  batch.box(0.08, 1.4, 0.08, cx, 7.3, cz, 0x4b3b28);
  batch.disc(cx, 6.7, cz, 0.8, 10, 0xd9a441);
  for (const angle of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
    batch.box(0.18, 0.45, 0.18, cx + Math.cos(angle) * 0.62, 6.95, cz + Math.sin(angle) * 0.62, 0xf3e4c0);
  }
  for (const side of [-1, 1]) {
    batch.box(2.8, 2.2, 0.2, cx + side * 11.5, 3.6, cz - 3.0, 0x4b3b28);
    batch.box(2.4, 1.7, 0.1, cx + side * 11.5, 3.6, cz - 3.1, 0x8a6fb0);
  }
  for (const x of [-12.2, 12.2]) {
    batch.box(0.12, 8.0, 0.12, x, 4.0, cz - d / 2 + 0.6, 0x4b3b28);
  }
}

function buildPalazzo(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  w: number,
  d: number
): void {
  batch.box(w - 1.6, 0.02, d - 1.6, cx, 0.13, cz, 0xd9cfb8);
  batch.box(10, 0.012, 8, cx, 0.142, cz + 1.6, 0xc2b69d);
  batch.box(3.0, 0.025, 10, cx, 0.155, cz + 1.4, 0x8a3b32);
  for (const z of [-3.4, 6.2]) {
    batch.box(3.4, 0.01, 0.16, cx, 0.17, cz + z, 0xd9a441);
  }

  /* Council chamber */
  box(20, 0.3, 4.6, cx, 0.15, cz - 7.4, 0x8b7b64, true);
  box(14, 1.0, 1.6, cx, 0.5, cz - 6.0, 0x594432, true);
  batch.box(14.4, 0.12, 1.8, cx, 1.06, cz - 6.0, 0xcbb58d);
  for (const x of [-6, -4, -2, 0, 2, 4, 6]) {
    box(0.72, 0.8, 0.72, cx + x, 0.4, cz - 8.5, 0x4b3b2a, true);
    batch.box(0.9, 1.2, 0.15, cx + x, 1.05, cz - 8.9, 0x6a4b35);
  }
  box(1.6, 1.2, 1.0, cx, 0.6, cz - 9.2, 0x6a4b35, true);
  batch.box(2.2, 2.0, 0.12, cx, 3.7, cz - d / 2 + 0.24, 0xd9a441);
  batch.box(1.6, 1.4, 0.06, cx, 3.7, cz - d / 2 + 0.32, 0x8a3b32);
  for (const side of [-1, 1]) {
    batch.box(0.08, 3.2, 0.08, cx + side * 7.4, 1.6, cz - 9.0, 0x4b3b28);
    batch.box(0.06, 1.6, 1.1, cx + side * 7.4, 2.6, cz - 8.45, side < 0 ? 0x4f8a5a : 0x4f6f8a);
  }

  /* Portraits and civic crest */
  for (const [x, color] of [
    [-10, 0x6f7f4f],
    [-5, 0xc2603f],
    [5, 0x4f8a8b],
    [10, 0xd9a441]
  ] as const) {
    batch.box(2.2, 2.6, 0.12, cx + x, 3.2, cz - d / 2 + 0.22, 0x4b3b28);
    batch.box(1.8, 2.2, 0.06, cx + x, 3.2, cz - d / 2 + 0.3, color);
  }

  /* Wedding corner */
  for (const x of [8.6, 11.0]) {
    box(0.28, 2.6, 0.28, cx + x, 1.3, cz - 1.0, 0xd9c39b, true);
    for (let i = 0; i < 4; i++) {
      batch.box(0.3, 0.26, 0.3, cx + x + (i % 2 ? 0.2 : -0.2), 2.6 + i * 0.1, cz - 1.0 + (i - 1.5) * 0.25, 0xc2603f);
    }
  }
  batch.box(2.7, 0.22, 0.3, cx + 9.8, 2.65, cz - 1.0, 0xd9a441);
  box(2.4, 0.8, 1.0, cx + 9.5, 0.4, cz + 2.0, 0x6b4a32, true);
  batch.box(2.7, 0.08, 1.2, cx + 9.5, 0.86, cz + 2.0, 0xd8c7a5);
  batch.box(1.5, 0.04, 0.8, cx + 9.5, 0.91, cz + 2.0, 0xf1ead7);

  /* Information desk and benches */
  box(5.0, 1.0, 1.2, cx - 9.5, 0.5, cz + 5.2, 0x6b4a32, true);
  batch.box(5.4, 0.12, 1.4, cx - 9.5, 1.1, cz + 5.2, 0xd8c7a5);
  for (const z of [-2.8, 2.8]) {
    box(2.4, 0.5, 1.0, cx - 12.5, 0.3, cz + z, 0x6b4a32, true);
    box(2.4, 0.5, 1.0, cx + 12.5, 0.3, cz + z, 0x6b4a32, true);
  }
  for (const side of [-1, 1]) {
    box(1.1, 0.45, 1.1, cx + side * 4, 0.28, cz + 8.6, 0x8a3b32, true);
    batch.box(1.0, 0.8, 1.0, cx + side * 4, 0.8, cz + 8.6, 0x5f7046);
    batch.box(0.6, 0.55, 0.6, cx + side * 4, 1.2, cz + 8.6, 0x6f7f4f);
  }
}

function addCat(batch: TriBatch, x: number, z: number): void {
  batch.box(0.5, 0.3, 0.32, x, 0.18, z, 0x8b6b4a);
  batch.box(0.28, 0.26, 0.26, x + 0.25, 0.3, z - 0.08, 0x9a7855);
  batch.box(0.07, 0.14, 0.06, x + 0.2, 0.46, z - 0.14, 0x8b6b4a);
  batch.box(0.07, 0.14, 0.06, x + 0.3, 0.46, z - 0.02, 0x8b6b4a);
  batch.box(0.06, 0.06, 0.08, x + 0.4, 0.28, z - 0.08, 0xc2603f);
  batch.box(0.5, 0.06, 0.06, x - 0.28, 0.14, z + 0.05, 0x8b6b4a);
  batch.box(0.08, 0.08, 0.28, x + 0.05, 0.08, z - 0.12, 0x6a4a32);
}

function buildTaverna(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  w: number,
  d: number
): void {
  batch.box(w - 1.4, 0.02, d - 1.4, cx, 0.13, cz, 0x6b4a32);
  for (const x of [-9, -6, -3, 0, 3, 6, 9]) {
    batch.box(0.08, 0.012, d - 2, cx + x, 0.145, cz, 0x543824);
  }
  batch.box(6.8, 0.02, 4.2, cx - 5, 0.15, cz - 4.6, 0x8a3b32);
  for (const z of [-6, -2, 2, 6]) {
    batch.box(w - 1, 0.16, 0.26, cx, 4.15, cz + z, 0x4b3b28);
  }

  /* Fireplace and chimney breast */
  box(5.2, 3.0, 1.0, cx - 5, 1.5, cz - 8.2, 0x8e806b, true);
  batch.box(3.0, 1.8, 0.12, cx - 5, 1.0, cz - 7.66, 0x2a211c);
  batch.box(2.2, 0.16, 0.26, cx - 5, 0.4, cz - 7.55, 0x5a3a22);
  batch.box(1.5, 0.5, 0.1, cx - 5, 0.7, cz - 7.45, 0xd9742e);
  batch.box(5.8, 0.18, 1.2, cx - 5, 3.02, cz - 8.2, 0x6a4b35);

  /* Bar counter, shelves and bottles */
  box(1.4, 1.1, 9, cx + 9.1, 0.55, cz + 0.8, 0x5b3d28, true);
  batch.box(1.7, 0.12, 9.4, cx + 9.1, 1.12, cz + 0.8, 0xcbb58d);
  batch.box(0.3, 2.0, 9, cx + 11.2, 1.9, cz + 0.8, 0x4b3b28);
  const bottleColors = [0x4f7f5a, 0x8a5b3d, 0x506b8a, 0xd9a441];
  for (let i = 0; i < 10; i++) {
    batch.box(0.14, 0.45, 0.14, cx + 11.0, 1.2 + (i % 2) * 0.5, cz - 3.0 + i * 0.8, bottleColors[i % bottleColors.length]);
  }

  /* Tables, stools and west bench */
  const table = (x: number, z: number): void => {
    box(0.35, 0.9, 0.35, x, 0.45, z, 0x4b3524, true);
    batch.disc(x, 1.0, z, 1.0, 12, 0x8a633f);
    batch.disc(x, 1.02, z, 0.9, 12, 0xc59b68);
    for (const [dx, dz] of [
      [-1.4, 0],
      [1.4, 0],
      [0, -1.2],
      [0, 1.2]
    ]) {
      batch.box(0.5, 0.08, 0.5, x + dx, 0.55, z + dz, 0x6a4a32);
      batch.box(0.08, 0.55, 0.08, x + dx, 0.28, z + dz, 0x4b3524);
    }
  };
  table(cx - 7, cz - 2.2);
  table(cx - 6.5, cz + 2.8);
  table(cx + 2.4, cz - 4.2);
  box(2.8, 0.5, 1.0, cx - 10.4, 0.3, cz + 4.4, 0x6a4a32, true);

  batch.box(1.1, 1.2, 1.1, cx - 10.2, 0.6, cz - 5.6, 0x6a4a32);
  batch.box(0.9, 1.0, 0.9, cx - 8.6, 0.5, cz - 6.6, 0x7a5438);
  batch.box(1.14, 0.1, 1.14, cx - 10.2, 0.9, cz - 5.6, 0x4b3524);
  batch.box(0.94, 0.1, 0.94, cx - 8.6, 0.8, cz - 6.6, 0x4b3524);
  for (const x of [-2, 0, 2]) {
    batch.box(0.08, 0.8, 0.08, cx + x, 3.5, cz - 1.5, 0x4b3b28);
    batch.box(0.24, 0.5, 0.24, cx + x, 3.0, cz - 1.5, 0x8a4b32);
  }
  addCat(batch, cx - 4.0, cz - 6.1);
}

function buildBar(
  batch: TriBatch,
  box: (w: number, h: number, d: number, x: number, y: number, z: number, color: number, collide?: boolean) => void,
  cx: number,
  cz: number,
  w: number,
  d: number
): void {
  for (let ix = 0; ix < 8; ix++) {
    for (let iz = 0; iz < 6; iz++) {
      batch.box(
        1.2,
        0.02,
        1.2,
        cx - 4.2 + ix * 1.2,
        0.13,
        cz - 3.0 + iz * 1.2,
        (ix + iz) % 2 ? 0xe7ddc7 : 0x53625d
      );
    }
  }
  batch.box(w - 2, 0.01, d - 2, cx, 0.12, cz, 0xb8a98e);

  /* Counter, espresso machine and pastries */
  box(11, 1.1, 1.1, cx, 0.55, cz - 4.6, 0x5b402e, true);
  batch.box(11.4, 0.12, 1.4, cx, 1.12, cz - 4.6, 0xcbb58d);
  batch.box(10, 1.7, 0.35, cx, 2.3, cz - 6.6, 0x5b4632);
  const bottleColors = [0x4f7f5a, 0x8a5b3d, 0x506b8a, 0xd9a441];
  for (let i = 0; i < 12; i++) {
    batch.box(0.12, 0.45, 0.12, cx - 4.8 + (i % 6) * 1.8, 1.55 + Math.floor(i / 6) * 0.55, cz - 6.45, bottleColors[i % bottleColors.length]);
  }
  batch.box(1.0, 0.62, 0.7, cx - 2.2, 1.5, cz - 4.6, 0x3f4a4d);
  batch.box(0.8, 0.2, 0.5, cx - 2.2, 1.9, cz - 4.6, 0x9aa2a6);
  batch.box(1.8, 0.75, 0.9, cx + 2.2, 1.5, cz - 4.6, 0xbfd4d4);
  for (const x of [-0.5, 0, 0.5]) {
    batch.box(0.3, 0.18, 0.3, cx + 2.2 + x, 1.25, cz - 4.6, 0xc2603f);
  }

  /* Window and pendant light */
  batch.box(0.1, 2.2, 4.6, cx + 8.9, 1.9, cz + 1.0, 0x9bbfc5);
  batch.box(0.14, 0.16, 4.9, cx + 8.94, 3.0, cz + 1.0, 0x6b4a32);
  batch.box(0.14, 0.16, 4.9, cx + 8.94, 0.8, cz + 1.0, 0x6b4a32);
  for (const z of [-1.2, 1.0, 3.2]) {
    batch.box(0.14, 2.2, 0.12, cx + 8.94, 1.9, cz + z, 0x6b4a32);
  }
  batch.box(0.08, 0.5, 0.08, cx, 3.25, cz, 0x4b3b28);
  batch.box(0.8, 0.12, 0.8, cx, 3.0, cz, 0xf3e4c0);

  const table = (x: number, z: number): void => {
    box(0.32, 0.8, 0.32, x, 0.4, z, 0x4b3524, true);
    batch.disc(x, 0.92, z, 0.8, 12, 0x8a633f);
    batch.disc(x, 0.94, z, 0.7, 12, 0xc59b68);
    for (const [dx, dz] of [
      [-1.2, 0],
      [1.2, 0],
      [0, -1.0],
      [0, 1.0]
    ]) {
      batch.box(0.44, 0.08, 0.44, x + dx, 0.5, z + dz, 0x6a4a32);
      batch.box(0.08, 0.5, 0.08, x + dx, 0.25, z + dz, 0x4b3524);
    }
  };
  table(cx - 5.2, cz + 2.2);
  table(cx + 4.4, cz + 2.6);
  table(cx - 4.6, cz - 1.5);
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
