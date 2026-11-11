import * as THREE from 'three';
import { mulberry32 } from '../utils/math';
import { StageActor } from './StageActor';
import type { ActorAnimationState } from './StageActor';

const flatMaterial = (color: number, roughness = 0.9): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true });

function mesh(
  geometry: THREE.BufferGeometry,
  color: number,
  roughness = 0.9,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, flatMaterial(color, roughness));
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function segmentBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  color: number,
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 5, 1);
  const result = mesh(geometry, color, 0.7);
  result.position.copy(start).add(end).multiplyScalar(0.5);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return result;
}

// ---------------------------------------------------------------------------
// Il cane
// ---------------------------------------------------------------------------

export class DogActor extends StageActor {
  private readonly body: THREE.Group;
  private readonly head: THREE.Group;
  private readonly jaw: THREE.Mesh;
  private readonly tail: THREE.Group;
  private readonly legs: THREE.Group[] = [];

  constructor(id = 'dog') {
    super(id, 'dog', 0.62);
    this.body = new THREE.Group();
    this.root.add(this.body);

    const torso = mesh(new THREE.DodecahedronGeometry(0.28, 0), 0x4b3b2f);
    torso.scale.set(0.85, 0.8, 1.45);
    torso.position.y = 0.43;
    this.body.add(torso);

    const chest = mesh(new THREE.DodecahedronGeometry(0.2, 0), 0x5b483a);
    chest.scale.set(0.95, 0.9, 0.9);
    chest.position.set(0, 0.47, 0.3);
    this.body.add(chest);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.6, 0.42);
    this.body.add(this.head);

    const skull = mesh(new THREE.DodecahedronGeometry(0.17, 0), 0x5c4839);
    skull.scale.set(0.95, 0.95, 1.05);
    this.head.add(skull);

    const snout = mesh(new THREE.ConeGeometry(0.1, 0.24, 5), 0x3d3128);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.03, 0.16);
    this.head.add(snout);

    const nose = mesh(new THREE.IcosahedronGeometry(0.037, 0), 0x171512);
    nose.position.set(0, -0.01, 0.29);
    this.head.add(nose);

    const earL = mesh(new THREE.ConeGeometry(0.075, 0.16, 4), 0x3a2f27);
    earL.position.set(-0.13, 0.13, 0.01);
    earL.rotation.z = 0.25;
    earL.rotation.x = -0.25;
    const earR = earL.clone();
    earR.position.x = 0.13;
    earR.rotation.z = -0.25;
    this.head.add(earL, earR);

    const eyeL = mesh(new THREE.IcosahedronGeometry(0.022, 0), 0x101114);
    eyeL.position.set(-0.065, 0.035, 0.155);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.065;
    this.head.add(eyeL, eyeR);

    this.jaw = mesh(new THREE.BoxGeometry(0.13, 0.035, 0.16), 0x352b24);
    this.jaw.position.set(0, -0.09, 0.17);
    this.head.add(this.jaw);

    const legPositions: Array<[number, number]> = [
      [-0.15, 0.25],
      [0.15, 0.25],
      [-0.15, -0.28],
      [0.15, -0.28],
    ];
    for (const [x, z] of legPositions) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.3, z);
      const limb = mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.32, 4), 0x40342b);
      limb.position.y = -0.16;
      leg.add(limb);
      const paw = mesh(new THREE.BoxGeometry(0.085, 0.045, 0.12), 0x2e251f);
      paw.position.set(0, -0.33, 0.03);
      leg.add(paw);
      this.body.add(leg);
      this.legs.push(leg);
    }

    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.55, -0.4);
    const tailMesh = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.35, 4), 0x3f332a);
    tailMesh.position.y = 0.15;
    tailMesh.rotation.x = -0.5;
    this.tail.add(tailMesh);
    this.tail.rotation.x = 0.4;
    this.body.add(this.tail);
  }

  animate(state: ActorAnimationState): void {
    const t = state.time;
    const seed = 3.7;
    const bark = state.base === 'bark' || state.transient === 'bark';
    const walk = state.base === 'walk' || state.moving;
    const phase = state.walkPhase;

    this.body.position.y = Math.sin(t * 1.8 + seed) * 0.008 + 0.055;
    this.body.rotation.z = 0;
    this.tail.rotation.z = Math.sin(t * (walk ? 6 : 3) + seed) * 0.45;

    if (walk) {
      this.legs[0].rotation.x = Math.sin(phase) * 0.6;
      this.legs[1].rotation.x = Math.sin(phase + Math.PI) * 0.6;
      this.legs[2].rotation.x = Math.sin(phase + Math.PI) * 0.6;
      this.legs[3].rotation.x = Math.sin(phase) * 0.6;
      this.body.position.y += Math.abs(Math.sin(phase)) * 0.02;
    } else {
      for (const leg of this.legs) leg.rotation.x = 0;
    }

    this.head.rotation.y = Math.sin(t * 0.7 + seed) * 0.1 + state.lookYaw * 0.5;
    this.head.rotation.x = state.lookPitch * 0.4;

    if (bark) {
      const pulse = Math.abs(Math.sin(t * 9));
      this.head.rotation.x = -0.35 - pulse * 0.2;
      this.jaw.scale.y = 1 + pulse * 2.2;
      this.jaw.position.y = -0.09 - pulse * 0.02;
      this.body.rotation.x = -0.08;
    } else {
      this.jaw.scale.y = 1;
      this.jaw.position.y = -0.09;
      this.body.rotation.x = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Le pecore
// ---------------------------------------------------------------------------

export class SheepActor extends StageActor {
  private readonly body: THREE.Group;
  private readonly head: THREE.Group;
  private readonly legs: THREE.Group[] = [];
  private readonly seed: number;

  constructor(id: string, index: number) {
    super(id, 'sheep', 0.86);
    this.seed = index * 2.17 + 1.3;
    const random = mulberry32(1000 + index * 37);
    const woolColor = [0xe6e0d1, 0xded7c7, 0xeae4d6, 0xd8d1c0][index % 4];

    this.body = new THREE.Group();
    this.root.add(this.body);

    const wool = mesh(new THREE.IcosahedronGeometry(0.38, 0), woolColor);
    wool.scale.set(1.12, 0.8, 1.3);
    wool.position.y = 0.66;
    this.body.add(wool);

    const woolBack = mesh(new THREE.DodecahedronGeometry(0.24, 0), woolColor);
    woolBack.scale.set(1.15, 0.85, 0.95);
    woolBack.position.set(0, 0.72, -0.22);
    this.body.add(woolBack);

    const face = new THREE.Group();
    face.position.set(0, 0.72, 0.36);
    this.body.add(face);
    this.head = face;

    const skull = mesh(new THREE.DodecahedronGeometry(0.15, 0), 0x3b3935);
    skull.scale.set(0.9, 1.05, 1.1);
    face.add(skull);

    const snout = mesh(new THREE.ConeGeometry(0.075, 0.2, 5), 0x2d2b28);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.03, 0.14);
    face.add(snout);

    const earL = mesh(new THREE.ConeGeometry(0.05, 0.14, 4), 0x36332f);
    earL.rotation.z = 1.1;
    earL.position.set(-0.15, 0.03, 0);
    const earR = earL.clone();
    earR.rotation.z = -1.1;
    earR.position.x = 0.15;
    face.add(earL, earR);

    const eyeL = mesh(new THREE.IcosahedronGeometry(0.017, 0), 0x0e0f11);
    eyeL.position.set(-0.06, 0.04, 0.13);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.06;
    face.add(eyeL, eyeR);

    const legPositions: Array<[number, number]> = [
      [-0.15, 0.3],
      [0.15, 0.3],
      [-0.15, -0.28],
      [0.15, -0.28],
    ];
    for (const [x, z] of legPositions) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.4, z);
      const limb = mesh(new THREE.CylinderGeometry(0.027, 0.023, 0.4, 4), 0x33302c);
      limb.position.y = -0.2;
      leg.add(limb);
      this.body.add(leg);
      this.legs.push(leg);
    }

    this.body.rotation.y = random() * 0.3 - 0.15;
    this.root.position.y = 0;
  }

  animate(state: ActorAnimationState): void {
    const t = state.time + this.seed;
    const walk = state.moving || state.base === 'walk';
    const phase = state.walkPhase + this.seed;
    const hop = state.base === 'run' ? Math.abs(Math.sin(t * 5)) * 0.22 : 0;

    this.body.position.y = Math.sin(t * 0.9) * 0.015 + hop;
    this.head.rotation.x = Math.sin(t * 1.1) * 0.08 + state.lookPitch * 0.25;
    this.head.rotation.y = Math.sin(t * 0.45 + this.seed) * 0.18 + state.lookYaw * 0.3;

    if (walk) {
      this.legs[0].rotation.x = Math.sin(phase) * 0.5;
      this.legs[1].rotation.x = Math.sin(phase + Math.PI) * 0.5;
      this.legs[2].rotation.x = Math.sin(phase + Math.PI) * 0.5;
      this.legs[3].rotation.x = Math.sin(phase) * 0.5;
    } else {
      this.legs.forEach((leg, index) => {
        leg.rotation.x = Math.sin(t * 0.4 + index) * 0.02;
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Il ciclista
// ---------------------------------------------------------------------------

export class CyclistActor extends StageActor {
  private readonly wheelFront: THREE.Group;
  private readonly wheelRear: THREE.Group;
  private readonly legL: THREE.Group;
  private readonly legR: THREE.Group;
  private readonly riderHead: THREE.Group;
  private readonly bike: THREE.Group;

  constructor(id = 'cyclist') {
    super(id, 'cyclist', 1.35);
    this.bike = new THREE.Group();
    this.root.add(this.bike);

    const wheelGeometry = new THREE.TorusGeometry(0.33, 0.028, 4, 12);
    const wheelMaterial = flatMaterial(0x1d1e20, 0.65);
    const tire = new THREE.Mesh(wheelGeometry, wheelMaterial);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    this.wheelFront = new THREE.Group();
    this.wheelFront.position.set(0, 0.33, 0.62);
    this.wheelFront.add(tire.clone());
    this.bike.add(this.wheelFront);

    this.wheelRear = new THREE.Group();
    this.wheelRear.position.set(0, 0.33, -0.58);
    this.wheelRear.add(tire.clone());
    this.bike.add(this.wheelRear);

    const frameColor = 0x5b5f60;
    const points = {
      rear: new THREE.Vector3(0, 0.33, -0.58),
      front: new THREE.Vector3(0, 0.33, 0.62),
      crank: new THREE.Vector3(0, 0.34, -0.05),
      seat: new THREE.Vector3(0, 0.82, -0.36),
      head: new THREE.Vector3(0, 0.92, 0.4),
      handle: new THREE.Vector3(0, 0.98, 0.34),
    };
    this.bike.add(
      segmentBetween(points.crank, points.seat, 0.022, frameColor),
      segmentBetween(points.seat, points.head, 0.022, frameColor),
      segmentBetween(points.crank, points.head, 0.024, frameColor),
      segmentBetween(points.rear, points.seat, 0.018, frameColor),
      segmentBetween(points.rear, points.crank, 0.018, frameColor),
      segmentBetween(points.front, points.head, 0.018, frameColor),
      segmentBetween(points.head, points.handle, 0.016, frameColor),
    );

    const handlebar = segmentBetween(
      new THREE.Vector3(-0.23, 1.02, 0.34),
      new THREE.Vector3(0.23, 1.02, 0.34),
      0.017,
      0x2b2c2e,
    );
    this.bike.add(handlebar);

    const seatMesh = mesh(new THREE.BoxGeometry(0.18, 0.05, 0.28), 0x25221f);
    seatMesh.position.copy(points.seat).add(new THREE.Vector3(0, 0.06, 0));
    this.bike.add(seatMesh);

    const crank = new THREE.Group();
    crank.position.copy(points.crank);
    const chainring = mesh(new THREE.TorusGeometry(0.12, 0.018, 4, 10), 0x333537);
    chainring.rotation.y = Math.PI / 2;
    crank.add(chainring);
    const pedalArm = mesh(new THREE.BoxGeometry(0.025, 0.3, 0.025), 0x2a2b2d);
    crank.add(pedalArm);
    this.bike.add(crank);

    const rider = new THREE.Group();
    rider.position.set(0, 0.62, -0.02);
    this.bike.add(rider);

    const torso = mesh(new THREE.BoxGeometry(0.35, 0.48, 0.25), 0x3f5a58);
    torso.position.set(0, 0.43, 0.08);
    torso.rotation.x = 0.28;
    rider.add(torso);

    const jacket = mesh(new THREE.BoxGeometry(0.42, 0.24, 0.28), 0x6b3d31);
    jacket.position.set(0, 0.56, 0.04);
    jacket.rotation.x = 0.28;
    rider.add(jacket);

    this.riderHead = new THREE.Group();
    this.riderHead.position.set(0, 0.78, 0.22);
    rider.add(this.riderHead);
    const head = mesh(new THREE.DodecahedronGeometry(0.14, 0), 0xd0a17d);
    head.scale.set(0.9, 1.05, 0.92);
    this.riderHead.add(head);

    const cap = mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.08, 6), 0x273f3b);
    cap.position.y = 0.13;
    this.riderHead.add(cap);
    const visor = mesh(new THREE.BoxGeometry(0.18, 0.018, 0.12), 0x273f3b);
    visor.position.set(0, 0.1, 0.13);
    this.riderHead.add(visor);

    const armL = segmentBetween(
      new THREE.Vector3(-0.18, 0.58, 0.18),
      new THREE.Vector3(-0.22, 0.25, 0.46),
      0.038,
      0x3f5a58,
    );
    const armR = segmentBetween(
      new THREE.Vector3(0.18, 0.58, 0.18),
      new THREE.Vector3(0.22, 0.25, 0.46),
      0.038,
      0x3f5a58,
    );
    rider.add(armL, armR);

    this.legL = new THREE.Group();
    this.legL.position.set(-0.13, 0.3, 0.02);
    const thighL = mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.34, 5), 0x2f3237);
    thighL.position.y = -0.17;
    this.legL.add(thighL);
    const shinL = mesh(new THREE.CylinderGeometry(0.04, 0.033, 0.32, 5), 0x2a2c31);
    shinL.position.set(0, -0.49, 0.08);
    shinL.rotation.x = -0.5;
    this.legL.add(shinL);
    rider.add(this.legL);

    this.legR = new THREE.Group();
    this.legR.position.set(0.13, 0.3, 0.02);
    const thighR = thighL.clone();
    thighR.position.y = -0.17;
    this.legR.add(thighR);
    const shinR = shinL.clone();
    shinR.position.set(0, -0.49, -0.08);
    shinR.rotation.x = 0.5;
    this.legR.add(shinR);
    rider.add(this.legR);

    const pizza = mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), 0x9c6b45);
    pizza.position.set(0, 0.67, -0.25);
    pizza.rotation.x = -0.15;
    rider.add(pizza);

    this.wheelFront.rotation.z = 0;
    this.wheelRear.rotation.z = 0;
  }

  animate(state: ActorAnimationState): void {
    const t = state.time;
    const phase = state.moving ? state.walkPhase : t * 2.4;
    const spin = state.moving ? phase * 1.6 : t * 1.2;

    this.wheelFront.rotation.x = spin;
    this.wheelRear.rotation.x = spin;
    this.legL.rotation.x = Math.sin(phase) * 0.55;
    this.legR.rotation.x = Math.sin(phase + Math.PI) * 0.55;
    this.legL.rotation.z = 0.1;
    this.legR.rotation.z = -0.1;
    this.riderHead.rotation.y = state.lookYaw * 0.8;
    this.riderHead.rotation.x = Math.sin(t * 0.8) * 0.02 + state.lookPitch * 0.3;
    this.bike.rotation.z = Math.sin(phase) * 0.012;
  }
}
