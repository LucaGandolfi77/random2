import * as THREE from 'three';
import { mulberry32 } from '../utils/math';
import { makeSignTexture } from '../utils/textures';
import { boxMesh, createGround, cylinderMesh, flatMaterial, glowSprite } from './props';

export const ROMAN = {
  marble: 0xc9b99c,
  marbleDark: 0x9d8d74,
  porphyry: 0x5c2c2c,
  gold: 0xc99a3f,
  purple: 0x5c2330,
  wood: 0x4a3828,
  iron: 0x2f2d2a,
  water: 0x35505a,
  field: 0x77764e,
  stone: 0xa1927a,
  stoneDark: 0x6f6354,
};

export function createColumn(
  height = 6,
  radius = 0.42,
  color = ROMAN.marble,
): THREE.Group {
  const group = new THREE.Group();
  const base = cylinderMesh(radius * 1.35, radius * 1.5, 0.35, ROMAN.marbleDark, 6);
  base.position.y = 0.17;
  const shaft = cylinderMesh(radius, radius * 1.05, height - 0.8, color, 7);
  shaft.position.y = 0.35 + (height - 0.8) / 2;
  const capital = boxMesh(radius * 2.5, 0.36, radius * 2.5, ROMAN.marbleDark);
  capital.position.y = height - 0.28;
  group.add(base, shaft, capital);
  return group;
}

export function createArch(width = 6, height = 4, color = ROMAN.marble): THREE.Group {
  const group = new THREE.Group();
  const pier = boxMesh(0.55, height, 0.7, color);
  pier.position.set(-width / 2, height / 2, 0);
  const pierRight = pier.clone();
  pierRight.position.x = width / 2;
  group.add(pier, pierRight);
  const lintel = boxMesh(width + 1.1, 0.45, 0.8, ROMAN.marbleDark);
  lintel.position.y = height + 0.22;
  group.add(lintel);
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(width / 2, 0.22, 5, 14, Math.PI),
    flatMaterial(color, { roughness: 0.9 }),
  );
  arch.position.y = height;
  arch.castShadow = true;
  group.add(arch);
  return group;
}

export function createBrazier(): THREE.Group {
  const group = new THREE.Group();
  const stand = cylinderMesh(0.16, 0.3, 0.9, ROMAN.iron, 6, {
    metalness: 0.4,
    roughness: 0.6,
  });
  stand.position.y = 0.45;
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.24, 0.3, 7),
    flatMaterial(0x3b3027, { metalness: 0.25, roughness: 0.8 }),
  );
  bowl.position.y = 0.98;
  bowl.castShadow = true;
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.6, 5),
    flatMaterial(0xf0a34c, { emissive: 0xff8f3e, emissiveIntensity: 1.6, transparent: 0.86 }),
  );
  flame.position.y = 1.36;
  const glow = glowSprite('#ff9c4a', 2.4);
  glow.position.y = 1.3;
  group.add(stand, bowl, flame, glow);
  group.userData.flame = flame;
  group.userData.glow = glow;
  return group;
}

export function createThrone(): THREE.Group {
  const group = new THREE.Group();
  const dais = boxMesh(3.4, 0.28, 2.6, ROMAN.marbleDark);
  dais.position.y = 0.14;
  const seat = boxMesh(1.5, 0.65, 1.1, ROMAN.porphyry);
  seat.position.set(0, 0.62, 0);
  const back = boxMesh(1.5, 2.0, 0.2, ROMAN.porphyry);
  back.position.set(0, 1.55, -0.46);
  const goldTrim = boxMesh(1.56, 0.09, 0.09, ROMAN.gold, { metalness: 0.55, roughness: 0.4 });
  goldTrim.position.set(0, 2.48, -0.46);
  for (const side of [-1, 1]) {
    const arm = boxMesh(0.16, 0.6, 0.95, ROMAN.porphyry);
    arm.position.set(side * 0.7, 1.0, 0.05);
    group.add(arm);
  }
  group.add(dais, seat, back, goldTrim);
  return group;
}

export function createCrownCushion(): THREE.Group {
  const group = new THREE.Group();
  const cushion = boxMesh(0.62, 0.14, 0.62, 0x6b2730);
  cushion.position.y = 0.07;
  const crown = new THREE.Group();
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.045, 5, 12),
    flatMaterial(ROMAN.gold, { metalness: 0.7, roughness: 0.3 }),
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.18;
  crown.add(band);
  for (let index = 0; index < 6; index += 1) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.17, 4),
      flatMaterial(ROMAN.gold, { metalness: 0.7, roughness: 0.3 }),
    );
    const angle = (index / 6) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.16, 0.28, Math.sin(angle) * 0.16);
    crown.add(spike);
  }
  group.add(cushion, crown);
  return group;
}

export function createMilestone(text = 'XV'): THREE.Group {
  const group = new THREE.Group();
  const post = cylinderMesh(0.22, 0.28, 1.25, ROMAN.stone, 6);
  post.position.y = 0.62;
  const top = boxMesh(0.55, 0.12, 0.42, ROMAN.stoneDark);
  top.position.y = 1.28;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.28),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture({ text, width: 256, height: 128, background: '#b8aa8e', foreground: '#3c3024' }),
      toneMapped: false,
    }),
  );
  sign.position.set(0, 0.88, 0.25);
  group.add(post, top, sign);
  return group;
}

export function createRomanRoad(width = 10, length = 120): THREE.Group {
  const group = new THREE.Group();
  const base = createGround(width, length, 0x4a463c, 0.01);
  group.add(base);
  const random = mulberry32(77);
  const count = Math.floor((width * length) / 1.5);
  const stones = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 0.05, 0.42),
    flatMaterial(0x7d7565, { roughness: 1 }),
    count,
  );
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    const x = (random() - 0.5) * width;
    const z = (random() - 0.5) * length;
    matrix.makeRotationY((random() - 0.5) * 0.2);
    matrix.setPosition(x, 0.03 + random() * 0.01, z);
    stones.setMatrixAt(index, matrix);
    color.setHex(random() > 0.5 ? 0x8c8270 : 0x6f6759);
    stones.setColorAt(index, color);
  }
  stones.receiveShadow = true;
  stones.instanceMatrix.needsUpdate = true;
  if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
  group.add(stones);
  return group;
}

export function createPoplar(seed = 1, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const random = mulberry32(seed);
  const trunk = cylinderMesh(0.13, 0.2, 2.6, 0x51453a, 5);
  trunk.position.y = 1.3;
  group.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.0 + random() * 0.25, 5.2 + random() * 1.4, 6),
    flatMaterial(random() > 0.5 ? 0x5e6c46 : 0x4e5b3e, { roughness: 1 }),
  );
  crown.position.y = 4.6;
  crown.castShadow = true;
  group.add(crown);
  group.scale.setScalar(scale);
  return group;
}

export function createRiver(width = 18, length = 60): THREE.Group {
  const group = new THREE.Group();
  const water = createGround(width, length, 0x2d444d, 0.03);
  water.material = flatMaterial(0x2d444d, {
    roughness: 0.5,
    metalness: 0.08,
    transparent: 0.95,
  });
  group.add(water);
  const random = mulberry32(41);
  for (let index = 0; index < 26; index += 1) {
    const ripple = new THREE.Mesh(
      new THREE.BoxGeometry(0.9 + random() * 2.4, 0.012, 0.06),
      flatMaterial(0x7b969c, { transparent: 0.35, roughness: 0.2 }),
    );
    ripple.position.set((random() - 0.5) * width * 0.86, 0.06, (random() - 0.5) * length * 0.9);
    ripple.rotation.y = (random() - 0.5) * 0.15;
    group.add(ripple);
  }
  return group;
}

export function createReeds(count = 80, seed = 3, width = 8, depth = 5): THREE.Group {
  const group = new THREE.Group();
  const random = mulberry32(seed);
  const geometry = new THREE.ConeGeometry(0.025, 0.72, 3);
  geometry.translate(0, 0.36, 0);
  const mesh = new THREE.InstancedMesh(
    geometry,
    flatMaterial(0x6a7049, { roughness: 1 }),
    count,
  );
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    const scale = 0.5 + random() * 0.9;
    matrix.makeRotationY(random() * Math.PI);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    matrix.setPosition((random() - 0.5) * width, 0.02, (random() - 0.5) * depth);
    mesh.setMatrixAt(index, matrix);
    color.setHex(random() > 0.5 ? 0x7a7f55 : 0x646b47);
    mesh.setColorAt(index, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return group;
}

export function createBridge(): THREE.Group {
  const group = new THREE.Group();
  const deck = boxMesh(12, 0.35, 3.2, ROMAN.stone);
  deck.position.y = 1.65;
  group.add(deck);
  for (const x of [-4.6, -1.5, 1.5, 4.6]) {
    const pier = boxMesh(0.7, 1.65, 2.6, ROMAN.stoneDark);
    pier.position.set(x, 0.82, 0);
    group.add(pier);
  }
  for (const side of [-1, 1]) {
    const rail = boxMesh(12, 0.18, 0.18, ROMAN.stoneDark);
    rail.position.set(0, 2.15, side * 1.5);
    group.add(rail);
  }
  return group;
}

export function createFarmhouse(): THREE.Group {
  const group = new THREE.Group();
  const wall = boxMesh(5.2, 2.6, 4.2, 0x9a8667, { roughness: 1 });
  wall.position.y = 1.3;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.3, 1.6, 4),
    flatMaterial(0x6c4f36, { roughness: 1 }),
  );
  roof.position.y = 3.3;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  const door = boxMesh(0.8, 1.5, 0.1, 0x4a3424);
  door.position.set(0, 0.75, 2.14);
  group.add(wall, roof, door);
  return group;
}

export function createCart(): THREE.Group {
  const group = new THREE.Group();
  const bed = boxMesh(2.0, 0.22, 1.0, 0x6c4f32);
  bed.position.y = 0.72;
  for (const x of [-0.72, 0.72]) {
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.07, 4, 10),
      flatMaterial(0x4a3524, { roughness: 1 }),
    );
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.42, 0.5);
    group.add(wheel);
  }
  const shaft = boxMesh(1.8, 0.08, 0.08, 0x5a4028);
  shaft.position.set(0, 0.55, -1.2);
  group.add(bed, shaft);
  return group;
}

export function createScaffold(): THREE.Group {
  const group = new THREE.Group();
  const wood = flatMaterial(0x6b5135, { roughness: 1 });
  for (let x = -6; x <= 6; x += 3) {
    for (const z of [-1, 1.6]) {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 7.2, 0.14), wood);
      pole.position.set(x, 3.6, z);
      pole.castShadow = true;
      group.add(pole);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.8), wood);
    beam.position.set(x, 5.2, 0.3);
    group.add(beam);
  }
  for (const y of [2.2, 4.4, 6.2]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.12, 0.7), wood);
    plank.position.set(0, y, 1.1);
    plank.castShadow = true;
    group.add(plank);
  }
  return group;
}

export function createFacade(): THREE.Group {
  const group = new THREE.Group();
  const stone = flatMaterial(0xb6a58a, { roughness: 0.95 });
  const stoneDark = flatMaterial(0x8f7e66, { roughness: 1 });
  const wall = boxMesh(16, 12, 1.2, 0xb6a58a, { roughness: 0.95 });
  wall.position.y = 6;
  group.add(wall);

  const base = boxMesh(17, 1.4, 1.8, 0x8f7e66);
  base.position.y = 0.7;
  group.add(base);

  for (const x of [-6.4, -3.2, 3.2, 6.4]) {
    const pilaster = boxMesh(0.7, 10, 0.4, 0x9f8d72);
    pilaster.position.set(x, 5.5, 0.75);
    group.add(pilaster);
  }

  for (const x of [-4.8, -1.6, 1.6, 4.8]) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.16, 4, 10, Math.PI),
      stone,
    );
    arch.position.set(x, 3.1, 0.8);
    group.add(arch);
    const door = boxMesh(1.4, 2.5, 0.12, 0x3d3329);
    door.position.set(x, 1.55, 0.82);
    group.add(door);
  }

  const rose = new THREE.Mesh(
    new THREE.TorusGeometry(1.9, 0.22, 5, 16),
    stoneDark,
  );
  rose.position.set(0, 8.0, 0.8);
  group.add(rose);
  for (let index = 0; index < 8; index += 1) {
    const spoke = boxMesh(0.12, 3.4, 0.12, 0x8f7e66);
    spoke.position.set(0, 8.0, 0.9);
    spoke.rotation.z = (index / 8) * Math.PI;
    group.add(spoke);
  }

  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const relief = boxMesh(1.9, 1.3, 0.18, 0xa9977c);
      relief.position.set(-5.4 + col * 3.6, 5.4 + row * 1.8, 0.82);
      group.add(relief);
    }
  }
  return group;
}

export function createCephalophoreStatue(): THREE.Group {
  const group = new THREE.Group();
  const stone = flatMaterial(0xa8977c, { roughness: 0.95 });
  const plinth = boxMesh(1.1, 0.55, 0.85, 0x7c6c55);
  plinth.position.y = 0.27;
  group.add(plinth);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.36, 1.5, 5),
    stone,
  );
  body.position.y = 1.28;
  body.castShadow = true;
  group.add(body);

  const shoulders = boxMesh(0.72, 0.22, 0.34, 0xa8977c);
  shoulders.position.y = 1.95;
  group.add(shoulders);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.18, 5),
    flatMaterial(0x3a2f26),
  );
  neck.position.y = 2.08;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 0), stone);
  head.position.set(0, 1.62, 0.34);
  head.scale.set(0.9, 1.05, 0.9);
  head.castShadow = true;
  group.add(head);

  for (const side of [-1, 1]) {
    const arm = boxMesh(0.14, 0.85, 0.14, 0xa8977c);
    arm.position.set(side * 0.42, 1.5, 0.16);
    arm.rotation.z = side * 0.22;
    group.add(arm);
    const hand = boxMesh(0.16, 0.14, 0.2, 0xa8977c);
    hand.position.set(side * 0.31, 1.26, 0.34);
    group.add(hand);
  }

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.035, 4, 12),
    flatMaterial(ROMAN.gold, { metalness: 0.5, roughness: 0.4 }),
  );
  halo.position.set(0, 2.3, -0.02);
  group.add(halo);
  return group;
}

export function createStoneBlocks(count = 18, seed = 9): THREE.Group {
  const group = new THREE.Group();
  const random = mulberry32(seed);
  for (let index = 0; index < count; index += 1) {
    const block = boxMesh(
      0.7 + random() * 0.9,
      0.35 + random() * 0.4,
      0.6 + random() * 0.7,
      random() > 0.5 ? 0xa99a81 : 0x8e806a,
    );
    block.position.set((random() - 0.5) * 9, 0.2 + random() * 0.1, 1.2 + random() * 3);
    block.rotation.y = random() * Math.PI;
    group.add(block);
  }
  return group;
}

export function createCross(): THREE.Group {
  const group = new THREE.Group();
  const wood = flatMaterial(0x503b28, { roughness: 1 });
  const vertical = boxMesh(0.18, 2.4, 0.18, 0x503b28);
  vertical.position.y = 1.2;
  const horizontal = boxMesh(1.2, 0.18, 0.18, 0x503b28);
  horizontal.position.y = 1.7;
  group.add(vertical, horizontal);
  return group;
}
