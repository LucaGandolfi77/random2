import * as THREE from 'three';
import {
  FESTIVAL_BRANCHES,
  FESTIVAL_GUEST,
  FESTIVAL_LANTERNS,
  FESTIVAL_MUSICIANS,
  FESTIVAL_STAGE,
  FESTIVAL_STALLS,
  FESTIVAL_STARTER
} from '../data/festival';
import type { Collider } from '../data/colliders';
import { festivalObstacles, type FestivalState } from '../game/festival';
import { GeoBatch, staticMaterial, TriBatch } from './batch';
import { animateIdle, createBlobShadow, createPerson, type PersonRig } from './person';

export interface FestivalLanternActor {
  id: string;
  x: number;
  z: number;
  group: THREE.Group;
  glow: THREE.Mesh;
}

export interface FestivalActor {
  readonly starter: THREE.Group;
  readonly lanterns: FestivalLanternActor[];
  readonly group: THREE.Group;
  setState(state: FestivalState): void;
  update(dt: number, time: number): void;
  obstacles(state: FestivalState): Collider[];
  startFinale(): void;
}

const STAGE_MUSIC_SPOTS = [
  { x: -301.5, z: 16.6, facing: 2.7 },
  { x: -300, z: 16.8, facing: 2.7 },
  { x: -298.5, z: 16.6, facing: 2.7 }
];

const CROWD_SPOTS = [
  { x: -306, z: 1, facing: 0.4, look: 'citizen1' as const },
  { x: -310, z: 9, facing: 0.1, look: 'citizen2' as const },
  { x: -286, z: -18, facing: -1.8, look: 'citizen3' as const },
  { x: -282, z: -20, facing: -1.5, look: 'citizen1' as const },
  { x: -279, z: -23, facing: -1.2, look: 'citizen2' as const },
  { x: -290, z: 18, facing: 0.2, look: 'citizen3' as const },
  { x: -302, z: 10, facing: 0.8, look: 'citizen1' as const },
  { x: -312, z: 4, facing: 1.2, look: 'citizen2' as const },
  { x: -296, z: -26, facing: 2.3, look: 'citizen3' as const },
  { x: -274, z: 22, facing: 0.8, look: 'citizen2' as const }
];

export function createFestival(scene: THREE.Scene, mobile: boolean): FestivalActor {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const staticBatch = new TriBatch();
  const canopyBatch = new TriBatch();
  addStallGeometry(staticBatch, canopyBatch);
  addStageGeometry(staticBatch);
  addLightsGeometry(staticBatch);
  const staticMesh = staticBatch.build(staticMaterial());
  if (staticMesh) {
    staticMesh.castShadow = true;
    staticMesh.receiveShadow = true;
    group.add(staticMesh);
  }
  const canopyMesh = canopyBatch.build(
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  );
  if (canopyMesh) group.add(canopyMesh);

  const glowBatch = new GeoBatch();
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2;
    const radius = 15;
    glowBatch.sphere(
      0.09,
      -296 + Math.cos(angle) * radius,
      2.9 + Math.sin(angle * 2) * 0.12,
      -4 + Math.sin(angle) * radius,
      0xffd27a,
      0
    );
  }
  for (const row of [
    { z: -4, y: 3.6 },
    { z: 12, y: 3.5 }
  ]) {
    for (let i = 0; i <= 16; i++) {
      const x = -312 + i * 2;
      glowBatch.sphere(0.075, x, row.y + Math.sin(i * 0.7) * 0.16, row.z, 0xffd27a, 0);
    }
  }
  for (const [x, z] of [
    [-309, 8],
    [-309, -4],
    [-286, -24],
    [-278, 20]
  ] as const) {
    glowBatch.sphere(0.11, x, 3.1, z, 0xffd27a, 0);
  }
  for (const stall of FESTIVAL_STALLS) {
    glowBatch.sphere(0.16, stall.x, 2.62, stall.z, 0xffd27a, 0);
  }
  glowBatch.sphere(0.2, FESTIVAL_STAGE.x, 3.15, FESTIVAL_STAGE.z - 1.7, 0xffd27a, 0);
  const glowMesh = glowBatch.build(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      opacity: 0.9
    })
  );
  if (glowMesh) group.add(glowMesh);

  const stageLight = new THREE.PointLight(0xffb15e, 28, 28, 1.6);
  stageLight.position.set(FESTIVAL_STAGE.x, 4.6, FESTIVAL_STAGE.z - 0.5);
  group.add(stageLight);
  if (!mobile) {
    const southLight = new THREE.PointLight(0xffbd73, 20, 24, 1.7);
    southLight.position.set(-288, 3.8, -18);
    group.add(southLight);
    const westLight = new THREE.PointLight(0xffc785, 16, 22, 1.7);
    westLight.position.set(-309, 3.4, 6);
    group.add(westLight);
  }

  const banner = createBanner();
  group.add(banner);
  const garland = createGarland();
  garland.visible = false;
  group.add(garland);

  const starter = createStarterLantern(scene);
  const lanterns = FESTIVAL_LANTERNS.map((spot) => createLantern(spot.id, spot.x, spot.z, scene));
  const branches = FESTIVAL_BRANCHES.map((spot) => createBranch(spot.id, spot.x, spot.z, scene));
  const musicians = FESTIVAL_MUSICIANS.map((spot) => createMusician(spot.id, spot.x, spot.z, scene));
  const guest = createGuest(scene);
  const crowd = CROWD_SPOTS.slice(0, mobile ? 4 : 8).map((spot) => {
    const rig = createPerson(spot.look);
    rig.group.position.set(spot.x, 0, spot.z);
    rig.group.rotation.y = spot.facing;
    const shadow = createBlobShadow(0.95);
    shadow.position.y = 0.02;
    rig.group.add(shadow);
    scene.add(rig.group);
    return rig;
  });

  const fireworks = createFireworks(scene);
  let fireworkAge = -1;

  const actor: FestivalActor = {
    starter,
    lanterns,
    group,
    setState(state: FestivalState): void {
      const open = state.phase === 'active' || state.phase === 'procession' || state.phase === 'done';
      group.visible = open;
      starter.visible = state.phase === 'ready';

      for (const lantern of lanterns) {
        lantern.group.visible = open;
        const lit = state.lanterns.includes(lantern.id) || state.phase === 'done';
        const material = lantern.glow.material as THREE.MeshBasicMaterial;
        material.color.set(lit ? 0xffdf8a : 0x735d35);
        material.opacity = lit ? 0.95 : 0.35;
      }

      for (const branch of branches) {
        branch.group.visible = state.phase === 'active' && !state.branches.includes(branch.id);
      }

      const musiciansDone = state.musicians.length >= musicians.length;
      musicians.forEach((musician, index) => {
        if (state.phase === 'active' && !musiciansDone && !state.musicians.includes(musician.id)) {
          musician.group.visible = true;
          musician.group.position.set(musician.home.x, 0, musician.home.z);
          musician.group.rotation.y = musician.home.facing;
        } else if (musiciansDone && open) {
          const spot = STAGE_MUSIC_SPOTS[index];
          musician.group.visible = true;
          musician.group.position.set(spot.x, 0.48, spot.z);
          musician.group.rotation.y = spot.facing;
        } else {
          musician.group.visible = false;
        }
      });

      if (state.phase === 'active' && !state.guest) {
        guest.group.visible = true;
        guest.group.position.set(FESTIVAL_GUEST.x, 0, FESTIVAL_GUEST.z);
        guest.group.rotation.y = -2.2;
      } else if (open && state.guest) {
        guest.group.visible = true;
        guest.group.position.set(-284, 0, -15);
        guest.group.rotation.y = 0.4;
      } else {
        guest.group.visible = false;
      }

      for (const rig of crowd) {
        rig.group.visible = open;
        rig.group.position.y = 0;
      }
      if (state.garland) {
        // The Duomo decoration is already part of the static piazza; this is
        // the small extra garland at the foot of the cathedral steps.
        const garland = group.getObjectByName('garland');
        if (garland) garland.visible = true;
      }
    },
    update(dt: number, time: number): void {
      for (const [index, lantern] of lanterns.entries()) {
        if (!lantern.group.visible) continue;
        const target = 1 + Math.sin(time * 3.1 + index * 1.7) * 0.035;
        lantern.glow.scale.setScalar(target);
      }
      for (const [index, rig] of crowd.entries()) {
        if (rig.group.visible) animateIdle(rig, time + index * 1.3, 0.65);
      }
      if (guest.group.visible) animateIdle(guest.rig, time + 0.8, 0.8);
      for (const [index, musician] of musicians.entries()) {
        if (musician.group.visible) {
          animateIdle(musician.rig, time + index * 1.1, 0.9);
          const instrument = musician.instrument;
          if (instrument) instrument.rotation.z = Math.sin(time * 2.4 + index) * 0.045;
        }
      }
      if (fireworkAge >= 0) {
        fireworkAge += dt;
        const positions = fireworks.geometry.getAttribute('position') as THREE.BufferAttribute;
        const velocities = fireworks.userData.velocities as Float32Array;
        for (let i = 0; i < positions.count; i++) {
          positions.setXYZ(
            i,
            positions.getX(i) + velocities[i * 3] * dt,
            positions.getY(i) + velocities[i * 3 + 1] * dt,
            positions.getZ(i) + velocities[i * 3 + 2] * dt
          );
          velocities[i * 3 + 1] -= 2.2 * dt;
        }
        positions.needsUpdate = true;
        (fireworks.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - fireworkAge / 4.8);
        if (fireworkAge > 5) {
          fireworks.visible = false;
          fireworkAge = -1;
        }
      }
    },
    obstacles(state: FestivalState): Collider[] {
      if (state.phase !== 'active' && state.phase !== 'procession' && state.phase !== 'done') return [];
      return festivalObstacles();
    },
    startFinale(): void {
      if (fireworkAge >= 0) return;
      fireworkAge = 0;
      const positions = fireworks.geometry.getAttribute('position') as THREE.BufferAttribute;
      const velocities = fireworks.userData.velocities as Float32Array;
      for (let i = 0; i < positions.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1 + Math.random() * 9;
        const speed = 5 + Math.random() * 7;
        positions.setXYZ(i, -296 + Math.cos(angle) * radius, 24 + Math.random() * 3, -4 + Math.sin(angle) * radius);
        velocities[i * 3] = Math.cos(angle) * speed;
        velocities[i * 3 + 1] = 5 + Math.random() * 7;
        velocities[i * 3 + 2] = Math.sin(angle) * speed;
      }
      positions.needsUpdate = true;
      fireworks.visible = true;
    },
  };

  return actor;
}

function addStallGeometry(batch: TriBatch, canopy: TriBatch): void {
  for (const stall of FESTIVAL_STALLS) {
    const halfW = stall.w / 2;
    const halfD = stall.d / 2;
    batch.box(stall.w, 0.82, 0.8, stall.x, 0.55, stall.z + stall.d * 0.28, 0x795c3d);
    batch.box(stall.w - 0.3, 0.08, stall.d - 0.2, stall.x, 1.0, stall.z, 0xc7ad87);
    for (const x of [-halfW, halfW]) {
      for (const z of [-halfD, halfD]) {
        batch.box(0.1, 2.3, 0.1, stall.x + x, 1.2, stall.z + z, 0x5d4c36);
      }
    }
    canopy.box(stall.w + 0.35, 0.12, stall.d + 0.35, stall.x, 2.35, stall.z, stall.color);
    for (let stripe = 0; stripe < 4; stripe++) {
      canopy.box(
        stall.w / 4 - 0.03,
        0.05,
        stall.d + 0.4,
        stall.x - stall.w / 2 + stall.w / 8 + stripe * (stall.w / 4),
        2.44,
        stall.z,
        stripe % 2 ? 0xf3e4c4 : stall.color
      );
    }
    batch.box(0.5, 0.55, 0.45, stall.x + halfW - 0.4, 0.35, stall.z - halfD + 0.35, 0x8d6c45);
    batch.box(0.35, 0.35, 0.35, stall.x - halfW + 0.4, 0.25, stall.z + halfD - 0.35, 0x9b7c51);
  }
}

function addStageGeometry(batch: TriBatch): void {
  const stage = FESTIVAL_STAGE;
  batch.box(stage.w, 0.38, stage.d, stage.x, 0.2, stage.z, 0x79563a);
  batch.box(stage.w + 0.4, 0.12, stage.d + 0.4, stage.x, 0.42, stage.z, 0xa77d53);
  batch.box(stage.w, 2.6, 0.18, stage.x, 1.65, stage.z + stage.d / 2 - 0.1, 0xb7a17b);
  for (const along of [-stage.w / 2 + 0.3, stage.w / 2 - 0.3]) {
    batch.box(0.1, 2.8, 0.1, stage.x + along, 1.55, stage.z + stage.d / 2, 0x5c4a35);
  }
  batch.box(stage.w + 0.8, 0.18, 1.3, stage.x, 2.9, stage.z + stage.d / 2 - 0.1, 0x9d5e42);
  batch.box(0.3, 0.7, 0.3, stage.x - stage.w / 2 + 0.6, 0.86, stage.z - 0.1, 0x4a3d30);
  batch.box(0.6, 0.08, 0.5, stage.x - stage.w / 2 + 0.6, 1.24, stage.z - 0.1, 0xd9c49b);
}

function addLightsGeometry(batch: TriBatch): void {
  const poles = [
    { x: -311, z: 18 },
    { x: -280, z: 18 },
    { x: -276, z: -24 },
    { x: -314, z: -12 }
  ];
  for (const pole of poles) {
    batch.box(0.12, 4.6, 0.12, pole.x, 2.3, pole.z, 0x5b4a37);
    batch.box(0.4, 0.16, 0.4, pole.x, 4.62, pole.z, 0x8c6b45);
  }
}

function createStarterLantern(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  group.position.set(FESTIVAL_STARTER.x, 0, FESTIVAL_STARTER.z);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x5c4630, flatShading: true })
  );
  post.position.y = 1.1;
  group.add(post);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffdf8a, toneMapped: false })
  );
  glow.position.y = 2.35;
  group.add(glow);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.28, 6),
    new THREE.MeshLambertMaterial({ color: 0xb58a44, flatShading: true })
  );
  cap.position.y = 2.7;
  group.add(cap);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })
  );
  halo.position.y = 2.35;
  group.add(halo);
  scene.add(group);
  return group;
}

function createLantern(id: string, x: number, z: number, scene: THREE.Scene): FestivalLanternActor {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 1.8, 5),
    new THREE.MeshLambertMaterial({ color: 0x5a4734, flatShading: true })
  );
  post.position.y = 0.9;
  group.add(post);
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.22, 0),
    new THREE.MeshLambertMaterial({ color: 0xd8b16d, flatShading: true })
  );
  body.position.y = 1.95;
  group.add(body);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x735d35, transparent: true, opacity: 0.35, toneMapped: false })
  );
  glow.position.y = 1.95;
  group.add(glow);
  scene.add(group);
  return { id, x, z, group, glow };
}

function createBranch(id: string, x: number, z: number, scene: THREE.Scene): { id: string; group: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const twig = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 0.5, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b5237, flatShading: true })
  );
  twig.position.y = 0.25;
  twig.rotation.z = 0.2;
  group.add(twig);
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.08, 0),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0x73804b : 0x8e9560, flatShading: true })
    );
    leaf.position.set(Math.sin(i * 1.5) * 0.12, 0.45 + i * 0.04, Math.cos(i * 1.5) * 0.12);
    group.add(leaf);
  }
  const glint = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshBasicMaterial({ color: 0xffe1a1, toneMapped: false })
  );
  glint.position.y = 0.72;
  group.add(glint);
  scene.add(group);
  return { id, group };
}

function createMusician(
  id: string,
  x: number,
  z: number,
  scene: THREE.Scene
): { id: string; group: THREE.Group; rig: PersonRig; instrument: THREE.Object3D | null; home: { x: number; z: number; facing: number } } {
  const rig = createPerson('citizen1');
  const group = rig.group;
  group.position.set(x, 0, z);
  group.rotation.y = 0;
  const shadow = createBlobShadow(1);
  shadow.position.y = 0.02;
  group.add(shadow);
  const instrument = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.55, 6),
    new THREE.MeshLambertMaterial({ color: 0xb58a44, flatShading: true })
  );
  body.position.y = 0.5;
  body.rotation.z = 0.5;
  instrument.add(body);
  instrument.position.set(0.25, 0, 0.05);
  group.add(instrument);
  scene.add(group);
  return { id, group, rig, instrument, home: { x, z, facing: 0 } };
}

function createGuest(scene: THREE.Scene): { group: THREE.Group; rig: PersonRig } {
  const rig = createPerson('citizen3');
  const group = rig.group;
  const shadow = createBlobShadow(1);
  shadow.position.y = 0.02;
  group.add(shadow);
  const suitcase = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.28, 0.22),
    new THREE.MeshLambertMaterial({ color: 0x7e4c37, flatShading: true })
  );
  suitcase.position.set(0.34, 0.25, 0);
  group.add(suitcase);
  group.visible = false;
  scene.add(group);
  return { group, rig };
}

function createBanner(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2b241c';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#f5ecd9';
    ctx.font = '700 43px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FESTA DI', 256, 58);
    ctx.fillStyle = '#d9a441';
    ctx.font = '700 35px Georgia, serif';
    ctx.fillText('SAN DONNINO', 256, 108);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 1.6),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  mesh.position.set(-300, 4.1, 14.3);
  mesh.rotation.y = Math.PI;
  return mesh;
}

function createGarland(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'garland';
  group.position.set(-295.2, 2.4, 2);
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.12, 6, 22, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x5d7043, flatShading: true })
  );
  arch.rotation.y = Math.PI / 2;
  group.add(arch);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 8) * Math.PI;
    const flower = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.14, 0),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xe8b05c : 0xd77b6d, flatShading: true })
    );
    flower.position.set(0, Math.sin(angle) * 2.6, Math.cos(angle) * 2.6);
    group.add(flower);
  }
  return group;
}

function createFireworks(scene: THREE.Scene): THREE.Points {
  const count = 180;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xffd27a), new THREE.Color(0xe08a5b), new THREE.Color(0xc7d48a)];
  for (let i = 0; i < count; i++) {
    const color = palette[i % palette.length];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    positions.set([0, -100, 0], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.32,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  points.userData.velocities = new Float32Array(count * 3);
  scene.add(points);
  return points;
}
