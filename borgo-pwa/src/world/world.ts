import * as THREE from 'three';
import { buildCityColliders, CollisionWorld, type Collider } from '../data/colliders';
import {
  BELL_SPOT,
  BELL_TOWER,
  DELIVERIES,
  FLOWERS,
  LETTERS,
  NPCS,
  OBELISK,
  PROPS,
  TILES
} from '../data/town';
import type { QuestId } from '../data/types';
import { GeoBatch, glowMaterial, staticMaterial } from './batch';
import { buildCity } from './city';
import { createLighting } from './lighting';
import { createNpcActor, type NpcActor } from './npcs';
import { animateIdle, createPerson, type PersonRig } from './person';
import { addProp } from './props';
import { createSky } from './sky';
import { createGround } from './terrain';
import { createPeriphery } from './periphery';

export type ItemKind = 'tile' | 'letter' | 'flower' | 'delivery' | 'bell';

export interface WorldItem {
  id: string;
  kind: ItemKind;
  quest?: QuestId;
  x: number;
  z: number;
  group: THREE.Group | null;
  visual: THREE.Object3D | null;
  phase: number;
}

export interface World {
  colliders: CollisionWorld;
  cityMeshes: THREE.Mesh[];
  groundMesh: THREE.Mesh;
  propsMesh: THREE.Mesh | null;
  glowMesh: THREE.Mesh | null;
  sky: ReturnType<typeof createSky>;
  lighting: ReturnType<typeof createLighting>;
  npcs: NpcActor[];
  items: WorldItem[];
  setDusk(t: number): void;
  setWaypoint(x: number, z: number, visible: boolean): void;
  update(dt: number, time: number, player: THREE.Vector3): void;
  ringBell(): void;
}

export function buildWorld(scene: THREE.Scene, mobile: boolean): World {
  createGround(scene);
  createPeriphery(scene);

  const extras: Collider[] = [
    { kind: 'box', x: BELL_TOWER.x, z: BELL_TOWER.z, hw: BELL_TOWER.w / 2, hd: BELL_TOWER.d / 2 },
    { kind: 'circle', x: OBELISK.x, z: OBELISK.z, r: 1.15 },
    { kind: 'box', x: 379.6, z: 185.9, hw: 5.6, hd: 4.6 },
    { kind: 'box', x: 1386.5, z: 400, hw: 1.2, hd: 1000 },
    { kind: 'box', x: -30, z: 1396.5, hw: 1420, hd: 1.2 },
    { kind: 'box', x: -30, z: -596.5, hw: 1420, hd: 1.2 },
    { kind: 'box', x: -1446.5, z: 400, hw: 1.2, hd: 1000 },
    { kind: 'circle', x: 900, z: 420, r: 4.4 },
    { kind: 'circle', x: 261, z: 1205, r: 3.8 },
    { kind: 'box', x: 978, z: 672, hw: 1.2, hd: 1.2 },
    { kind: 'box', x: 1120, z: 990, hw: 6.2, hd: 4.2 }
  ];
  const collision = new CollisionWorld(buildCityColliders(extras));
  const city = buildCity(scene, collision);

  const batch = new GeoBatch();
  const glow = new GeoBatch();
  const water: THREE.Object3D[] = [];

  for (const [index, tree] of city.trees.entries()) {
    addProp(batch, glow, {
      id: `tree-${index}`,
      kind: 'plane',
      x: tree.x,
      z: tree.z,
      scale: THREE.MathUtils.clamp(tree.h / 7.5, 0.7, 1.55)
    });
  }

  for (const [index, item] of city.furniture.entries()) {
    if (item.type === 'bench') {
      addProp(batch, glow, { id: `furniture-${index}`, kind: 'bench', x: item.x, z: item.z });
    } else if (item.type === 'fountain') {
      const fountain = addProp(batch, glow, {
        id: `fountain-${index}`,
        kind: 'fountain',
        x: item.x,
        z: item.z,
        scale: 0.45
      });
      if (fountain) water.push(fountain);
    } else if (item.type === 'drinking_water') {
      addProp(batch, glow, { id: `water-${index}`, kind: 'pot', x: item.x, z: item.z, scale: 0.8 });
    } else if (item.type === 'monument' || item.type === 'memorial') {
      addProp(batch, glow, { id: `monument-${index}`, kind: 'planter', x: item.x, z: item.z });
    }
  }

  for (const [index, lamp] of city.lamps.entries()) {
    addProp(batch, glow, { id: `lamp-${index}`, kind: 'lantern', x: lamp.x, z: lamp.z });
  }

  for (const prop of PROPS) {
    const waterMesh = addProp(batch, glow, prop);
    if (waterMesh) water.push(waterMesh);
  }

  const propsMesh = batch.build(staticMaterial());
  if (propsMesh) {
    propsMesh.castShadow = true;
    propsMesh.receiveShadow = true;
    scene.add(propsMesh);
  }
  const glowMesh = glow.build(glowMaterial());
  if (glowMesh) {
    glowMesh.visible = false;
    glowMesh.castShadow = false;
    glowMesh.receiveShadow = false;
    scene.add(glowMesh);
  }
  for (const mesh of water) scene.add(mesh);

  const sky = createSky(scene);
  const lighting = createLighting(scene, mobile);

  const npcs = NPCS.map((spec) => {
    const actor = createNpcActor(spec);
    scene.add(actor.group);
    return actor;
  });

  const ambient = createAmbient(scene, mobile);
  const items = createItems(scene);
  const bell = createBell(scene);
  const waypoint = createWaypoint(scene);

  let dusk = 0;
  let bellSwing = 0;

  return {
    colliders: collision,
    cityMeshes: city.buildings,
    groundMesh: city.ground,
    propsMesh,
    glowMesh,
    sky,
    lighting,
    npcs,
    items,
    setDusk(t: number): void {
      dusk = THREE.MathUtils.clamp(t, 0, 1);
      lighting.setDusk(dusk);
      sky.setDusk(dusk);
      if (glowMesh) glowMesh.visible = dusk > 0.12;
    },
    setWaypoint(x: number, z: number, visible: boolean): void {
      waypoint.group.position.set(x, 0, z);
      waypoint.group.visible = visible;
    },
    update(dt: number, time: number, player: THREE.Vector3): void {
      for (const item of items) {
        if (!item.group?.visible || !item.visual) continue;
        if (item.kind === 'tile') {
          item.visual.rotation.y += dt * 1.4;
          item.visual.position.y = 0.4 + Math.sin(time * 2.2 + item.phase) * 0.06;
        } else if (item.kind === 'letter') {
          item.visual.rotation.y += dt * 0.9;
          item.visual.position.y = 0.62 + Math.sin(time * 1.9 + item.phase) * 0.07;
        } else if (item.kind === 'flower') {
          item.visual.rotation.z = Math.sin(time * 1.6 + item.phase) * 0.06;
        } else if (item.kind === 'delivery') {
          item.visual.rotation.y = Math.sin(time * 0.8 + item.phase) * 0.12;
          item.visual.position.y = 0.03 + Math.sin(time * 1.7 + item.phase) * 0.025;
          const spark = item.visual.getObjectByName('spark');
          if (spark) {
            spark.rotation.y += dt * 1.6;
            spark.position.y = 1.55 + Math.sin(time * 2.4 + item.phase) * 0.08;
          }
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
      for (const rig of ambient) animateIdle(rig, time + rig.group.position.x * 0.03);

      if (bellSwing > 0.001) {
        bellSwing = Math.max(0, bellSwing - dt * 0.12);
        bell.group.rotation.z = Math.sin(time * 7.5) * 0.32 * bellSwing;
      } else {
        bell.group.rotation.z = 0;
      }

      waypoint.beam.rotation.y += dt * 0.7;
      waypoint.beam.scale.x = 1 + Math.sin(time * 2.2) * 0.08;
      waypoint.beam.scale.z = waypoint.beam.scale.x;
      const material = waypoint.beam.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + Math.sin(time * 2.2) * 0.03;
    },
    ringBell(): void {
      bellSwing = 1;
    }
  };
}


/* A handful of non-interactable citizens keep the squares from feeling like
   an empty film set. They use the same low-poly rig as the main cast. */
function createAmbient(scene: THREE.Scene, mobile: boolean): PersonRig[] {
  const people: Array<{ look: 'citizen1' | 'citizen2' | 'citizen3'; x: number; z: number; rot: number; scale?: number }> = [
    { look: 'citizen1', x: -303, z: -6, rot: 0.6 },
    { look: 'citizen2', x: -299, z: -10, rot: 2.1 },
    { look: 'citizen3', x: -2, z: -36, rot: -0.4, scale: 0.92 },
    { look: 'citizen1', x: 27, z: -44, rot: 1.8 },
    { look: 'citizen2', x: 310, z: -145, rot: -1.1 },
    { look: 'citizen3', x: 560, z: 150, rot: 0.5, scale: 0.9 },
    { look: 'citizen2', x: 155, z: -95, rot: -1.1 },
    { look: 'citizen3', x: -26, z: 98, rot: 0.5, scale: 0.9 },
    { look: 'citizen1', x: -4, z: 92, rot: 2.4 },
    { look: 'citizen2', x: -142, z: 22, rot: 0.2 },
    { look: 'citizen1', x: 415, z: 160, rot: 2.2 },
    { look: 'citizen2', x: -230, z: 610, rot: 0.3 },
    { look: 'citizen3', x: 278, z: 790, rot: -1.2 },
    { look: 'citizen1', x: 600, z: 876, rot: 0.8 },
    { look: 'citizen2', x: -800, z: 260, rot: -0.5 },
    { look: 'citizen3', x: -680, z: 350, rot: 1.1 },
    { look: 'citizen1', x: -680, z: -250, rot: 0.4 },
    { look: 'citizen2', x: -620, z: -176, rot: -1.3 },
    { look: 'citizen3', x: -1270, z: -25, rot: 1.5 },
    { look: 'citizen1', x: -1310, z: 95, rot: -0.7 },
    { look: 'citizen2', x: 1018, z: 845, rot: 2.4 },
    { look: 'citizen3', x: 1038, z: 670, rot: -0.8, scale: 0.92 },
    { look: 'citizen1', x: 1040, z: 1020, rot: 1.2 },
    { look: 'citizen2', x: 928, z: 390, rot: -1.6 },
    { look: 'citizen1', x: -362, z: 1200, rot: 1.4 },
    { look: 'citizen3', x: -330, z: 1308, rot: -0.6, scale: 0.92 },
    { look: 'citizen2', x: 46, z: 1190, rot: 2.2 },
    { look: 'citizen1', x: 261, z: 1218, rot: -1.5 },
    { look: 'citizen3', x: -442, z: 1260, rot: 0.7 },
    { look: 'citizen1', x: 10, z: -335, rot: 1.2 },
    { look: 'citizen2', x: -60, z: -395, rot: -0.4 },
    { look: 'citizen3', x: -350, z: -445, rot: 2.0 },
    { look: 'citizen1', x: 0, z: -470, rot: -1.2 },
    { look: 'citizen2', x: 12, z: -440, rot: 0.4 },
    { look: 'citizen1', x: -648, z: 865, rot: 0.2 },
    { look: 'citizen3', x: -870, z: 910, rot: -1.1 },
    { look: 'citizen2', x: 30, z: 910, rot: 1.4 },
    { look: 'citizen1', x: -451, z: 955, rot: -0.6 },
    { look: 'citizen3', x: 359, z: 135, rot: 2.0 },
    { look: 'citizen2', x: 108, z: 55, rot: -1.8 }
  ];
  const rigs: PersonRig[] = [];
  for (const person of people.slice(0, mobile ? 10 : 40)) {
    const rig = createPerson(person.look);
    rig.group.position.set(person.x, 0, person.z);
    rig.group.rotation.y = person.rot;
    rig.group.scale.setScalar(person.scale ?? 1);
    scene.add(rig.group);
    rigs.push(rig);
  }
  return rigs;
}

/* ------------------------------------------------------------------- items */

function createItems(scene: THREE.Scene): WorldItem[] {
  const items: WorldItem[] = [];
  const tileColors = [0xd9a441, 0x4f8a8b, 0xc2603f, 0x7f8e56, 0x8a6fb0, 0x5b7fa8];

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
      tile.position.set(i % 2 ? 0.13 : -0.13, 0.04, i > 1 ? 0.13 : -0.13);
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
    holder.position.y = 0.62;
    holder.add(
      mesh(new THREE.BoxGeometry(0.42, 0.025, 0.3), 0xf6eedb),
      offset(mesh(new THREE.SphereGeometry(0.055, 8, 6), 0xa53f32), 0.13, 0.03, 0.05),
      offset(mesh(new THREE.BoxGeometry(0.44, 0.028, 0.08), 0x9a8b6f), -0.06, 0, 0)
    );
    group.add(holder);
    scene.add(group);
    items.push({ id: spot.id, kind: 'letter', x: spot.x, z: spot.z, group, visual: holder, phase: index * 1.7 });
  });

  FLOWERS.forEach((spot, index) => {
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);
    const flower = new THREE.Group();
    const stem = mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.42, 5), 0x5d6f43);
    stem.position.y = 0.21;
    flower.add(stem);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petal = mesh(new THREE.IcosahedronGeometry(0.07, 0), index % 2 ? 0xe8b05c : 0xdc7f74);
      petal.position.set(Math.sin(angle) * 0.11, 0.46, Math.cos(angle) * 0.11);
      flower.add(petal);
    }
    const centre = mesh(new THREE.IcosahedronGeometry(0.06, 0), 0xf0d489);
    centre.position.y = 0.47;
    flower.add(centre);
    const leaf = mesh(new THREE.IcosahedronGeometry(0.08, 0), 0x62764a);
    leaf.position.set(0.09, 0.22, 0);
    leaf.scale.set(1, 0.4, 0.6);
    flower.add(leaf);
    group.add(flower);
    scene.add(group);
    items.push({ id: spot.id, kind: 'flower', x: spot.x, z: spot.z, group, visual: flower, phase: index * 0.9 });
  });

  DELIVERIES.forEach((delivery, index) => {
    const group = new THREE.Group();
    group.position.set(delivery.x, 0.02, delivery.z);
    const holder = new THREE.Group();
    holder.add(mesh(new THREE.BoxGeometry(0.85, 0.5, 0.7), 0x8a6a45));
    holder.add(offset(mesh(new THREE.BoxGeometry(0.62, 0.1, 0.5), 0xf0e6cf), 0, 0.3, 0));
    if (delivery.quest === 'bread') {
      const loaf = mesh(new THREE.SphereGeometry(0.18, 8, 6), 0xd9a45c);
      loaf.scale.set(1.4, 0.7, 0.8);
      loaf.position.y = 0.42;
      holder.add(loaf);
    } else if (delivery.quest === 'newspaper') {
      holder.add(offset(mesh(new THREE.BoxGeometry(0.45, 0.03, 0.32), 0xf6eedb), 0.05, 0.39, 0.02));
      holder.add(offset(mesh(new THREE.BoxGeometry(0.44, 0.03, 0.31), 0xe8dfcc), -0.04, 0.42, -0.02));
    } else if (delivery.quest === 'book') {
      holder.add(mesh(new THREE.BoxGeometry(0.36, 0.12, 0.26), 0x8b4d3d));
      holder.children[holder.children.length - 1].position.set(0, 0.38, 0);
    } else {
      const cup = mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 8), 0xf3ead8);
      cup.position.y = 0.4;
      holder.add(cup);
      holder.add(offset(mesh(new THREE.TorusGeometry(0.08, 0.025, 4, 8), 0xf3ead8), 0.15, 0.4, 0));
    }
    const spark = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 0),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false, transparent: true, opacity: 0.9 })
    );
    spark.name = 'spark';
    spark.position.y = 1.55;
    holder.add(spark);
    group.add(holder);
    scene.add(group);
    items.push({
      id: delivery.id,
      kind: 'delivery',
      quest: delivery.quest,
      x: delivery.x,
      z: delivery.z,
      group,
      visual: holder,
      phase: index * 1.3
    });
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

function mesh(geometry: THREE.BufferGeometry, color: number): THREE.Mesh {
  return new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ color, flatShading: true })
  );
}

function offset<T extends THREE.Object3D>(object: T, x: number, y: number, z: number): T {
  object.position.set(x, y, z);
  return object;
}

/* -------------------------------------------------------------------- bell */

function createBell(scene: THREE.Scene): { group: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(BELL_TOWER.x, BELL_TOWER.h - 2.8, BELL_TOWER.z);
  const yoke = mesh(new THREE.BoxGeometry(2.1, 0.22, 0.32), 0x4a3b2a);
  group.add(yoke);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 1.05, 1.5, 12, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xb58a44, flatShading: true, side: THREE.DoubleSide })
  );
  body.position.y = -0.9;
  group.add(body);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.1, 5, 12),
    new THREE.MeshLambertMaterial({ color: 0x9c7538, flatShading: true })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -1.65;
  group.add(rim);
  group.add(offset(mesh(new THREE.SphereGeometry(0.16, 6, 5), 0x6d5429), 0, -1.7, 0));
  scene.add(group);

  const rope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 15.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x8b6a45, flatShading: true })
  );
  rope.position.set(BELL_TOWER.x, 8, BELL_TOWER.z + 2.05);
  scene.add(rope);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.04, 5, 10),
    new THREE.MeshLambertMaterial({ color: 0x6f5236 })
  );
  handle.position.set(BELL_TOWER.x, 0.42, BELL_TOWER.z + 2.05);
  handle.rotation.x = Math.PI / 2;
  scene.add(handle);

  return { group };
}

/* ---------------------------------------------------------------- waypoint */

function createWaypoint(scene: THREE.Scene): {
  group: THREE.Group;
  beam: THREE.Mesh;
} {  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.28, 11, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  beam.position.y = 5.5;
  group.add(beam);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.06, 5, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);
  group.visible = false;
  scene.add(group);
  return { group, beam };
}
