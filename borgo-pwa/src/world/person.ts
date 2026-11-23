import * as THREE from 'three';

export type PersonLook =
  | 'ada'
  | 'elio'
  | 'marta'
  | 'nino'
  | 'beppe'
  | 'lidia'
  | 'sara'
  | 'citizen1'
  | 'citizen2'
  | 'citizen3'
  | 'player';

export interface PersonRig {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  body: THREE.Group;
}

interface Outfit {
  shirt: number;
  trousers: number;
  apron?: number;
  scarf?: number;
  hat: 'straw' | 'cap' | 'scarf' | 'none';
  hatColor: number;
  hair: number;
  satchel?: boolean;
  moustache?: boolean;
}

const OUTFITS: Record<PersonLook, Outfit> = {
  ada: {
    shirt: 0xb25840,
    trousers: 0x6a4d3a,
    apron: 0xf0e6cf,
    scarf: 0xd9a441,
    hat: 'scarf',
    hatColor: 0xc99b52,
    hair: 0x6a6157
  },
  elio: {
    shirt: 0x6e5a45,
    trousers: 0x4f5048,
    scarf: 0xe6d6b6,
    hat: 'cap',
    hatColor: 0x4b4036,
    hair: 0x6e6559,
    satchel: true,
    moustache: true
  },
  marta: {
    shirt: 0x6f7f4f,
    trousers: 0x54483a,
    apron: 0xf5ecd9,
    scarf: 0xc2603f,
    hat: 'straw',
    hatColor: 0xd9b96a,
    hair: 0x5b412f
  },
  nino: {
    shirt: 0xc2603f,
    trousers: 0x4b5563,
    scarf: 0xf0e6cf,
    hat: 'cap',
    hatColor: 0x3f4a3a,
    hair: 0x2f2823
  },
  beppe: {
    shirt: 0x8b6b45,
    trousers: 0x4c4b43,
    apron: 0xd9c39b,
    scarf: 0x3f5b63,
    hat: 'cap',
    hatColor: 0x3f4a3a,
    hair: 0x6a5a48,
    moustache: true
  },
  lidia: {
    shirt: 0x5f6f52,
    trousers: 0x5a4a3c,
    apron: 0xe6d9bd,
    scarf: 0x8a4b3d,
    hat: 'none',
    hatColor: 0x5f6f52,
    hair: 0x4d3829,
    satchel: true
  },
  sara: {
    shirt: 0xf0e6cf,
    trousers: 0x44565c,
    apron: 0xc2603f,
    scarf: 0xd9a441,
    hat: 'none',
    hatColor: 0xc2603f,
    hair: 0x3c2f26
  },
  citizen1: {
    shirt: 0x6d7f8e,
    trousers: 0x4f4a3d,
    scarf: 0xd9c39b,
    hat: 'cap',
    hatColor: 0x3f4a3a,
    hair: 0x4b3a2a
  },
  citizen2: {
    shirt: 0x9a6b52,
    trousers: 0x4e4650,
    apron: 0xe6d9bd,
    scarf: 0x6f7f4f,
    hat: 'none',
    hatColor: 0x9a6b52,
    hair: 0x6d5a45
  },
  citizen3: {
    shirt: 0x7a8560,
    trousers: 0x3f4650,
    scarf: 0xd9a441,
    hat: 'straw',
    hatColor: 0xc7a55e,
    hair: 0x3c2f26,
    satchel: true
  },
  player: {
    shirt: 0xf0e6cf,
    trousers: 0x40546b,
    scarf: 0xc2603f,
    hat: 'straw',
    hatColor: 0xd9b96a,
    hair: 0x3c2f26,
    satchel: true
  }
};

const SKIN = 0xd8a77d;
const SHOE = 0x3a3028;

export function createPerson(look: PersonLook): PersonRig {
  const outfit = OUTFITS[look];
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const solid = (color: number): THREE.MeshLambertMaterial =>
    new THREE.MeshLambertMaterial({ color, flatShading: true });

  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D = body
  ): THREE.Mesh => {
    const created = new THREE.Mesh(geometry, material);
    created.castShadow = false;
    created.receiveShadow = false;
    parent.add(created);
    return created;
  };

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.84, 0);
  rightLeg.position.set(0.16, 0.84, 0);
  body.add(leftLeg, rightLeg);

  for (const pivot of [leftLeg, rightLeg]) {
    mesh(new THREE.BoxGeometry(0.2, 0.8, 0.24).translate(0, -0.4, 0), solid(outfit.trousers), pivot);
    mesh(new THREE.BoxGeometry(0.22, 0.13, 0.33).translate(0, -0.78, 0.05), solid(SHOE), pivot);
  }

  mesh(new THREE.BoxGeometry(0.62, 0.74, 0.36).translate(0, 1.22, 0), solid(outfit.shirt));
  mesh(new THREE.BoxGeometry(0.64, 0.1, 0.38).translate(0, 0.88, 0), solid(0x4a3a2b));

  if (outfit.apron) {
    mesh(new THREE.BoxGeometry(0.5, 0.62, 0.03).translate(0, 1.06, 0.2), solid(outfit.apron));
    mesh(new THREE.BoxGeometry(0.5, 0.06, 0.04).translate(0, 1.35, 0.2), solid(0xe0d3b8));
  }

  if (outfit.scarf) {
    mesh(new THREE.BoxGeometry(0.34, 0.12, 0.38).translate(0, 1.56, 0), solid(outfit.scarf));
    mesh(new THREE.BoxGeometry(0.14, 0.26, 0.04).translate(0.06, 1.43, 0.2), solid(outfit.scarf));
  }

  if (outfit.satchel) {
    mesh(new THREE.BoxGeometry(0.34, 0.3, 0.14).translate(0, 1.15, -0.24), solid(0x6b4e34));
    mesh(new THREE.BoxGeometry(0.08, 0.62, 0.04).translate(0.2, 1.35, -0.18), solid(0x4a3625));
  }

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.4, 1.5, 0);
  rightArm.position.set(0.4, 1.5, 0);
  body.add(leftArm, rightArm);

  for (const pivot of [leftArm, rightArm]) {
    mesh(new THREE.BoxGeometry(0.16, 0.64, 0.18).translate(0, -0.3, 0), solid(outfit.shirt), pivot);
    mesh(new THREE.IcosahedronGeometry(0.1, 0), solid(SKIN), pivot).position.set(0, -0.66, 0);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.79, 0);
  body.add(head);
  mesh(new THREE.IcosahedronGeometry(0.2, 1), solid(SKIN), head);
  mesh(new THREE.BoxGeometry(0.06, 0.08, 0.08), solid(SKIN), head).position.set(0, -0.02, 0.19);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x2b241e });
  for (const x of [-0.07, 0.07]) {
    mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02), eyeMaterial, head).position.set(x, 0.05, 0.185);
  }
  if (outfit.moustache) {
    mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), solid(0x5f5549), head).position.set(0, -0.075, 0.19);
  }
  mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.56), solid(outfit.hair), head).position.set(
    0,
    0.03,
    -0.02
  );

  switch (outfit.hat) {
    case 'straw': {
      mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.035, 12), solid(outfit.hatColor), head).position.set(0, 0.17, 0);
      mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.2, 10), solid(outfit.hatColor), head).position.set(0, 0.27, 0);
      mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.05, 10), solid(0x7a5a3a), head).position.set(0, 0.22, 0);
      break;
    }
    case 'cap': {
      mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.11, 10), solid(outfit.hatColor), head).position.set(0, 0.17, 0);
      mesh(new THREE.BoxGeometry(0.25, 0.035, 0.18), solid(outfit.hatColor), head).position.set(0, 0.13, 0.18);
      break;
    }
    case 'scarf': {
      mesh(new THREE.CylinderGeometry(0.205, 0.225, 0.16, 10), solid(outfit.hatColor), head).position.set(0, 0.13, 0);
      mesh(new THREE.IcosahedronGeometry(0.09, 0), solid(outfit.hatColor), head).position.set(0.16, 0.08, -0.08);
      break;
    }
    default:
      break;
  }

  return { group, leftLeg, rightLeg, leftArm, rightArm, body };
}

let shadowTexture: THREE.CanvasTexture | null = null;

export function createBlobShadow(scale = 1): THREE.Mesh {
  if (!shadowTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
      gradient.addColorStop(0, 'rgba(30,22,15,0.55)');
      gradient.addColorStop(0.55, 'rgba(30,22,15,0.28)');
      gradient.addColorStop(1, 'rgba(30,22,15,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 96, 96);
    }
    shadowTexture = new THREE.CanvasTexture(canvas);
    shadowTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const material = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.85
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * scale, 1.6 * scale), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 2;
  return mesh;
}

export function animateWalk(rig: PersonRig, phase: number, speedRatio: number): void {
  const swing = Math.sin(phase) * 0.55 * speedRatio;
  rig.leftLeg.rotation.x = swing;
  rig.rightLeg.rotation.x = -swing;
  rig.leftArm.rotation.x = -swing * 0.8;
  rig.rightArm.rotation.x = swing * 0.8;
  rig.body.position.y = Math.abs(Math.sin(phase)) * 0.035 * speedRatio;
}

export function animateIdle(rig: PersonRig, time: number, amount = 1): void {
  rig.body.position.y = Math.sin(time * 1.6) * 0.012 * amount;
  rig.leftArm.rotation.x = Math.sin(time * 1.1) * 0.05 * amount;
  rig.rightArm.rotation.x = -Math.sin(time * 1.1) * 0.05 * amount;
  rig.leftLeg.rotation.x = 0;
  rig.rightLeg.rotation.x = 0;
}
