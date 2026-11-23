import * as THREE from 'three';
import type { Collider } from '../data/colliders';
import { buildColliders } from '../data/colliders';
import { BELL_SPOT, BUILDINGS, FLOWERS, LETTERS, NPCS, PROPS, TILES } from '../data/town';
import { GeoBatch as Batch, glowMaterial, staticMaterial } from './batch';
import { addBuilding, createSign } from './buildings';
import { createLighting } from './lighting';
import { createNpcActor, type NpcActor } from './npcs';
import { addProp } from './props';
import { createSky } from './sky';
import { addTerrainDetails, createGround } from './terrain';

export type ItemKind = 'tile' | 'letter' | 'flower' | 'table' | 'bell';

export interface WorldItem {
  id: string;
  kind: ItemKind;
  x: number;
  z: number;
  group: THREE.Group | null;
  visual: THREE.Object3D | null;
  phase: number;
}

export interface World {
  colliders: Collider[];
  staticMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  sky: ReturnType<typeof createSky>;
  lighting: ReturnType<typeof createLighting>;
  npcs: NpcActor[];
  items: WorldItem[];
  setDusk(t: number): void;
  update(dt: number, time: number, player: THREE.Vector3): void;
  ringBell(): void;
}

export function buildWorld(scene: THREE.Scene, mobile: boolean): World {
  createGround(scene);

  const batch = new Batch();
  addTerrainDetails(batch);

  const glowBatch = new Batch();
  for (const building of BUILDINGS) {
    addBuilding(batch, building);
    const sign = createSign(building);
    if (sign) scene.add(sign);
  }

  const water: THREE.Object3D[] = [];
  for (const prop of PROPS) {
    const waterMesh = addProp(batch, glowBatch, prop);
    if (waterMesh) water.push(waterMesh);
  }

  const staticMesh = batch.build(staticMaterial());
  if (!staticMesh) throw new Error('The town has no geometry');
  staticMesh.castShadow = true;
  staticMesh.receiveShadow = true;
  scene.add(staticMesh);

  const glowMesh = glowBatch.build(glowMaterial());
  if (!glowMesh) throw new Error('The lanterns have no glass');
  glowMesh.visible = false;
  glowMesh.castShadow = false;
  glowMesh.receiveShadow = false;
  scene.add(glowMesh);

  for (const mesh of water) scene.add(mesh);

  const sky = createSky(scene);
  const lighting = createLighting(scene, mobile);

  const npcs = NPCS.map((spec) => {
    const actor = createNpcActor(spec);
    scene.add(actor.group);
    return actor;
  });

  const items = createItems(scene);
  const bell = createBell(scene);

  let duskValue = 0;
  let bellSwing = 0;

  return {
    colliders: buildColliders(),
    staticMesh,
    glowMesh,
    sky,
    lighting,
    npcs,
    items,
    setDusk(t: number): void {
      duskValue = THREE.MathUtils.clamp(t, 0, 1);
      lighting.setDusk(duskValue);
      sky.setDusk(duskValue);
      glowMesh.visible = duskValue > 0.12;
    },
    update(dt: number, time: number, player: THREE.Vector3): void {
      for (const item of items) {
        if (!item.group?.visible || !item.visual) continue;
        if (item.kind === 'tile') {
          item.visual.rotation.y += dt * 1.4;
          item.visual.position.y = 0.4 + Math.sin(time * 2.2 + item.phase) * 0.06;
        } else if (item.kind === 'letter') {
          item.visual.rotation.y += dt * 0.9;
          item.visual.position.y = 0.6 + Math.sin(time * 1.9 + item.phase) * 0.07;
        } else if (item.kind === 'flower') {
          item.visual.rotation.z = Math.sin(time * 1.6 + item.phase) * 0.06;
        }
      }

      for (const mesh of water) {
        mesh.rotation.y += dt * 0.18;
        const disc = mesh.userData.disc as THREE.Mesh | undefined;
        if (disc) {
          const wave = 1 + Math.sin(time * 1.3) * 0.008;
          disc.scale.set(wave, 1, wave);
        }
      }

      for (const npc of npcs) npc.update(dt, time, player);

      if (bellSwing > 0.001) {
        bellSwing = Math.max(0, bellSwing - dt * 0.12);
        bell.group.rotation.z = Math.sin(time * 7.5) * 0.32 * bellSwing;
      } else {
        bell.group.rotation.z = 0;
      }
    },
    ringBell(): void {
      bellSwing = 1;
    }
  };
}

/* The glow batch has to exist before the props are added; this keeps the
   construction order inside buildWorld readable without a second pass. */

function createItems(scene: THREE.Scene): WorldItem[] {
  const items: WorldItem[] = [];
  const tileColors = [0xd9a441, 0x4f8a8b, 0xc2603f, 0x7f8e56];

  TILES.forEach((spot, index) => {
    const group = new THREE.Group();
    group.position.set(spot.x, 0.04, spot.z);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.06, 0.62),
      new THREE.MeshLambertMaterial({ color: 0xb7a78a, flatShading: true })
    );
    base.receiveShadow = true;
    group.add(base);
    for (let i = 0; i < 4; i++) {
      const color = tileColors[(index + i) % tileColors.length];
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.24),
        new THREE.MeshLambertMaterial({ color, flatShading: true })
      );
      tile.position.set((i % 2 ? 0.13 : -0.13), 0.04, (i > 1 ? 0.13 : -0.13));
      group.add(tile);
    }
    const glint = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      new THREE.MeshBasicMaterial({ color: 0xffe1a1, toneMapped: false })
    );
    glint.position.y = 0.42;
    group.add(glint);
    scene.add(group);
    items.push({ id: spot.id, kind: 'tile', x: spot.x, z: spot.z, group, visual: glint, phase: index });
  });

  LETTERS.forEach((spot, index) => {
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);
    const holder = new THREE.Group();
    holder.position.y = 0.6;
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.025, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xf6eedb, flatShading: true })
    );
    holder.add(paper);
    const seal = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xa53f32 })
    );
    seal.position.set(0.13, 0.03, 0.05);
    holder.add(seal);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.028, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x9a8b6f, flatShading: true })
    );
    band.position.x = -0.06;
    holder.add(band);
    group.add(holder);
    scene.add(group);
    items.push({ id: spot.id, kind: 'letter', x: spot.x, z: spot.z, group, visual: holder, phase: index * 1.7 });
  });

  FLOWERS.forEach((spot, index) => {
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);
    const flower = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.026, 0.42, 5),
      new THREE.MeshLambertMaterial({ color: 0x5d6f43, flatShading: true })
    );
    stem.position.y = 0.21;
    flower.add(stem);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.07, 0),
        new THREE.MeshLambertMaterial({ color: index % 2 ? 0xe8b05c : 0xdc7f74, flatShading: true })
      );
      petal.position.set(Math.sin(angle) * 0.11, 0.46, Math.cos(angle) * 0.11);
      flower.add(petal);
    }
    const centre = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.06, 0),
      new THREE.MeshLambertMaterial({ color: 0xf0d489, flatShading: true })
    );
    centre.position.y = 0.47;
    flower.add(centre);
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.08, 0),
      new THREE.MeshLambertMaterial({ color: 0x62764a, flatShading: true })
    );
    leaf.position.set(0.09, 0.22, 0);
    leaf.scale.set(1, 0.4, 0.6);
    flower.add(leaf);
    group.add(flower);
    scene.add(group);
    items.push({ id: spot.id, kind: 'flower', x: spot.x, z: spot.z, group, visual: flower, phase: index * 0.9 });
  });

  items.push({
    id: 'festival-table',
    kind: 'table',
    x: 6,
    z: -3,
    group: null,
    visual: null,
    phase: 0
  });

  items.push({
    id: 'bell',
    kind: 'bell',
    x: BELL_SPOT.x,
    z: BELL_SPOT.z,
    group: null,
    visual: null,
    phase: 0
  });

  return items;
}

function createBell(scene: THREE.Scene): { group: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(-28, 9.8, -17.65);
  const yoke = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.2, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x4a3b2a, flatShading: true })
  );
  group.add(yoke);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.82, 1.15, 12, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xb58a44, flatShading: true, side: THREE.DoubleSide })
  );
  body.position.y = -0.68;
  group.add(body);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.08, 5, 12),
    new THREE.MeshLambertMaterial({ color: 0x9c7538, flatShading: true })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -1.25;
  group.add(rim);
  const clapper = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x6d5429 })
  );
  clapper.position.y = -1.3;
  group.add(clapper);
  scene.add(group);

  /* The rope hangs on the outside of the tower, within reach. */
  const rope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 7.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x8b6a45, flatShading: true })
  );
  rope.position.set(-28, 4.0, -17.83);
  scene.add(rope);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.035, 5, 10),
    new THREE.MeshLambertMaterial({ color: 0x6f5236 })
  );
  handle.position.set(-28, 0.35, -17.83);
  handle.rotation.x = Math.PI / 2;
  scene.add(handle);

  return { group };
}
