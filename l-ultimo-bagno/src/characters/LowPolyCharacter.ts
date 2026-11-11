import * as THREE from 'three';
import type { ActionName } from '../data/types';
import { clamp, clamp01, lerp, smoothstep, vnoise } from '../utils/math';
import { makeGlowTexture } from '../utils/textures';
import { StageActor } from './StageActor';
import type { ActorAnimationState, Emotion } from './StageActor';

type CoatStyle = 'jacket' | 'long' | 'dress' | 'cloak' | 'vest';
type HatStyle = 'none' | 'brim' | 'cap' | 'beret' | 'veil';
type HairStyle = 'short' | 'bald' | 'bun' | 'long';
type HandProp = 'none' | 'staff' | 'megaphone' | 'boom' | 'camera' | 'film-camera' | 'bag';

export interface HumanoidOptions {
  id: string;
  variant: string;
  height: number;
  headScale?: number;
  bodyWidth?: number;
  slim?: boolean;
  skin: number;
  hair: number;
  top: number;
  shirt?: number;
  pants: number;
  shoes: number;
  accent?: number;
  coat?: CoatStyle;
  tie?: boolean;
  hat?: HatStyle;
  hairStyle?: HairStyle;
  beard?: boolean;
  glasses?: boolean;
  wideShoes?: boolean;
  handProp?: HandProp;
  longArms?: boolean;
  seed?: number;
  skirt?: boolean;
}

interface ArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
}

interface LegRig {
  hip: THREE.Group;
  knee: THREE.Group;
  foot: THREE.Group;
}

interface HumanoidRig {
  pelvis: THREE.Group;
  upper: THREE.Group;
  torso: THREE.Mesh;
  headPivot: THREE.Group;
  headGroup: THREE.Group;
  head: THREE.Mesh;
  mouth: THREE.Mesh;
  browL: THREE.Mesh;
  browR: THREE.Mesh;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  armL: ArmRig;
  armR: ArmRig;
  legL: LegRig;
  legR: LegRig;
  flash: THREE.Sprite | null;
  prop: THREE.Group | null;
  hipHeight: number;
  torsoHeight: number;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const skinMaterialCache = new Map<number, THREE.MeshStandardMaterial>();

function material(
  color: number,
  options: {
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    transparent?: number;
    side?: THREE.Side;
  } = {},
): THREE.MeshStandardMaterial {
  const key = `${color}:${options.roughness ?? 0.82}:${options.metalness ?? 0}:${
    options.emissive ?? 0
  }:${options.emissiveIntensity ?? 0}:${options.transparent ?? 1}:${options.side ?? THREE.FrontSide}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  const result = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0,
    flatShading: true,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: (options.transparent ?? 1) < 1,
    opacity: options.transparent ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
  materialCache.set(key, result);
  return result;
}

function skinMaterial(color: number): THREE.MeshStandardMaterial {
  const cached = skinMaterialCache.get(color);
  if (cached) return cached;
  const result = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  skinMaterialCache.set(color, result);
  return result;
}

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
  options?: Parameters<typeof material>[1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material(color, options),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function facetedSphere(
  radius: number,
  color: number,
  detail = 0,
  scale: [number, number, number] = [1, 1, 1],
  options?: Parameters<typeof material>[1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, detail),
    material(color, options),
  );
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: number,
  segments = 5,
  options?: Parameters<typeof material>[1],
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1);
  geometry.translate(0, -height / 2, 0);
  const mesh = new THREE.Mesh(geometry, material(color, options));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function trapezoidGeometry(
  bottomWidth: number,
  topWidth: number,
  height: number,
  depth: number,
): THREE.BufferGeometry {
  const hb = bottomWidth / 2;
  const ht = topWidth / 2;
  const hd = depth / 2;
  const positions = new Float32Array([
    -hb, 0, -hd,
    hb, 0, -hd,
    hb, 0, hd,
    -hb, 0, hd,
    -ht, height, -hd,
    ht, height, -hd,
    ht, height, hd,
    -ht, height, hd,
  ]);
  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    3, 2, 6, 3, 6, 7,
    2, 1, 5, 2, 5, 6,
    1, 0, 4, 1, 4, 5,
    0, 3, 7, 0, 7, 4,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function trapezoid(
  bottomWidth: number,
  topWidth: number,
  height: number,
  depth: number,
  color: number,
  options?: Parameters<typeof material>[1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    trapezoidGeometry(bottomWidth, topWidth, height, depth),
    material(color, options),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addHeadAccessories(
  headGroup: THREE.Group,
  options: HumanoidOptions,
): {
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  browL: THREE.Mesh;
  browR: THREE.Mesh;
  mouth: THREE.Mesh;
} {
  const skin = options.skin;
  const hairColor = options.hair;

  if (options.hairStyle !== 'bald') {
    const hairRadius = 0.246;
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(hairRadius, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.56),
      material(hairColor, { roughness: 0.95 }),
    );
    hair.position.set(0, 0.04, -0.012);
    hair.scale.set(1, 0.94, 1.02);
    hair.castShadow = true;
    headGroup.add(hair);
  }

  if (options.hairStyle === 'bun') {
    const bun = facetedSphere(0.09, hairColor, 0, [1, 0.9, 1]);
    bun.position.set(0, 0.13, -0.23);
    headGroup.add(bun);
  }

  if (options.hairStyle === 'long') {
    const back = box(0.3, 0.36, 0.12, hairColor, { roughness: 0.95 });
    back.position.set(0, -0.07, -0.16);
    headGroup.add(back);
  }

  const eyeWhiteColor = 0x141518;
  const eyeL = facetedSphere(0.026, eyeWhiteColor, 0, [1, 0.8, 0.6], { roughness: 0.45 });
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.074, 0.03, 0.228);
  eyeR.position.set(0.074, 0.03, 0.228);
  headGroup.add(eyeL, eyeR);

  const browL = box(0.07, 0.014, 0.018, hairColor);
  const browR = box(0.07, 0.014, 0.018, hairColor);
  browL.position.set(-0.074, 0.092, 0.232);
  browR.position.set(0.074, 0.092, 0.232);
  headGroup.add(browL, browR);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.034, 0.09, 4),
    skinMaterial(skin),
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.005, 0.245);
  nose.castShadow = true;
  headGroup.add(nose);

  const mouth = box(0.082, 0.016, 0.012, 0x3b2522, { roughness: 0.7 });
  mouth.position.set(0, -0.085, 0.23);
  headGroup.add(mouth);

  if (options.beard) {
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.24, 5),
      material(hairColor, { roughness: 1 }),
    );
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.18, 0.07);
    beard.castShadow = true;
    headGroup.add(beard);
  }

  if (options.glasses) {
    const frame = material(0x1a1a1a, { metalness: 0.4, roughness: 0.5 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.012), frame);
    bridge.position.set(0, 0.03, 0.23);
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.012), frame);
    lensL.position.set(-0.074, 0.03, 0.23);
    const lensR = lensL.clone();
    lensR.position.x = 0.074;
    headGroup.add(bridge, lensL, lensR);
  }

  if (options.hat && options.hat !== 'none') {
    if (options.hat === 'brim') {
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.335, 0.335, 0.022, 8),
        material(options.accent ?? 0x3b3329, { roughness: 0.95 }),
      );
      brim.position.y = 0.205;
      brim.castShadow = true;
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.21, 0.18, 6),
        material(options.accent ?? 0x3b3329, { roughness: 0.95 }),
      );
      crown.position.y = 0.305;
      crown.castShadow = true;
      headGroup.add(brim, crown);
    } else if (options.hat === 'cap') {
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.225, 0.12, 7),
        material(options.accent ?? 0x343a3f),
      );
      crown.position.y = 0.225;
      const visor = box(0.24, 0.022, 0.16, options.accent ?? 0x343a3f);
      visor.position.set(0, 0.172, 0.17);
      headGroup.add(crown, visor);
    } else if (options.hat === 'beret') {
      const beret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.23, 0.075, 8),
        material(options.accent ?? 0x20252b),
      );
      beret.position.set(0.02, 0.21, -0.01);
      beret.rotation.z = -0.12;
      headGroup.add(beret);
    } else if (options.hat === 'veil') {
      const veil = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.7, 7, 1, true),
        material(0xf3eee5, {
          transparent: 0.32,
          side: THREE.DoubleSide,
          roughness: 1,
        }),
      );
      veil.position.set(0, -0.25, -0.05);
      headGroup.add(veil);
    }
  }

  return { eyeL, eyeR, browL, browR, mouth };
}

function buildArm(
  side: -1 | 1,
  options: HumanoidOptions,
  shoulderY: number,
  shoulderX: number,
  upperLength: number,
  lowerLength: number,
): ArmRig {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * shoulderX, shoulderY, 0);
  shoulder.rotation.z = side * 0.075;

  const upperRadius = options.slim ? 0.045 : 0.056;
  const upper = cylinder(upperRadius, upperRadius * 0.88, upperLength, options.top, 5);
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.y = -upperLength;
  shoulder.add(elbow);

  const forearm = cylinder(
    upperRadius * 0.86,
    upperRadius * 0.7,
    lowerLength,
    options.skin,
    5,
  );
  elbow.add(forearm);

  const hand = new THREE.Group();
  hand.position.y = -lowerLength;
  elbow.add(hand);

  const handMesh = box(
    options.slim ? 0.07 : 0.085,
    0.09,
    options.slim ? 0.055 : 0.07,
    options.skin,
  );
  handMesh.position.y = -0.035;
  hand.add(handMesh);

  if (options.handProp === 'megaphone') {
    const megaphone = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.24, 7, 1, true),
      material(0x8e3b31, { side: THREE.DoubleSide }),
    );
    cone.rotation.x = -Math.PI / 2;
    cone.position.z = 0.14;
    cone.castShadow = true;
    const handle = box(0.03, 0.12, 0.03, 0x24211e);
    handle.position.y = -0.06;
    megaphone.add(cone, handle);
    hand.add(megaphone);
  }

  return { shoulder, elbow, hand };
}

function buildLeg(
  side: -1 | 1,
  options: HumanoidOptions,
  hipHeight: number,
  thighLength: number,
  shinLength: number,
): LegRig {
  const hip = new THREE.Group();
  hip.position.set(side * (options.slim ? 0.12 : 0.14), 0, 0);

  const thighRadius = options.slim ? 0.055 : 0.068;
  const thigh = cylinder(thighRadius, thighRadius * 0.82, thighLength, options.pants, 5);
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.y = -thighLength;
  hip.add(knee);

  const shin = cylinder(
    thighRadius * 0.78,
    thighRadius * 0.62,
    shinLength,
    options.pants,
    5,
  );
  knee.add(shin);

  const foot = new THREE.Group();
  foot.position.y = -shinLength;
  knee.add(foot);

  const shoeWidth = options.wideShoes ? 0.17 : 0.135;
  const shoe = box(shoeWidth, 0.11, options.wideShoes ? 0.31 : 0.25, options.shoes, {
    roughness: 0.68,
  });
  shoe.position.set(0, -0.02, 0.065);
  foot.add(shoe);

  return { hip, knee, foot };
}

export class LowPolyCharacter extends StageActor {
  readonly options: HumanoidOptions;
  readonly rig: HumanoidRig;

  constructor(options: HumanoidOptions) {
    super(options.id, 'human', options.height * 0.9);
    this.options = options;

    const hipHeight = 0.82;
    const thighLength = options.slim ? 0.42 : 0.4;
    const shinLength = 0.36;
    const torsoHeight = options.slim ? 0.64 : 0.6;
    const neckHeight = 0.05;
    const width = 0.5 * (options.bodyWidth ?? 1);
    const topWidth = width;
    const bottomWidth = width * 0.82;
    const depth = options.slim ? 0.25 : 0.29;
    const shoulderX = topWidth * 0.5 + 0.025;
    const shoulderY = torsoHeight - 0.075;

    const pelvis = new THREE.Group();
    pelvis.position.y = hipHeight;
    this.root.add(pelvis);

    const upper = new THREE.Group();
    pelvis.add(upper);

    const torso = trapezoid(bottomWidth, topWidth, torsoHeight, depth, options.top);
    upper.add(torso);

    if (options.shirt !== undefined) {
      const shirt = box(topWidth * 0.34, torsoHeight * 0.7, 0.015, options.shirt, {
        roughness: 0.95,
      });
      shirt.position.set(0, torsoHeight * 0.46, depth / 2 + 0.008);
      upper.add(shirt);

      const lapelL = box(0.045, torsoHeight * 0.4, 0.02, options.shirt);
      lapelL.position.set(-topWidth * 0.14, torsoHeight * 0.65, depth / 2 + 0.018);
      lapelL.rotation.z = 0.18;
      const lapelR = lapelL.clone();
      lapelR.position.x = topWidth * 0.14;
      lapelR.rotation.z = -0.18;
      upper.add(lapelL, lapelR);
    }

    if (options.tie) {
      const knot = box(0.055, 0.05, 0.02, options.accent ?? 0x6b2d2a);
      knot.position.set(0, torsoHeight * 0.82, depth / 2 + 0.025);
      const tie = box(0.055, torsoHeight * 0.46, 0.018, options.accent ?? 0x6b2d2a);
      tie.position.set(0, torsoHeight * 0.58, depth / 2 + 0.026);
      tie.rotation.z = 0.04;
      upper.add(knot, tie);
    }

    if (options.coat === 'long' || options.coat === 'dress' || options.coat === 'cloak') {
      const skirtHeight = options.coat === 'dress' ? 1.02 : options.coat === 'cloak' ? 0.82 : 0.56;
      const skirt = trapezoid(
        options.coat === 'dress' ? 0.78 : 0.66,
        topWidth * 0.95,
        skirtHeight,
        options.coat === 'cloak' ? 0.48 : depth * 1.08,
        options.top,
        options.coat === 'cloak' ? { side: THREE.DoubleSide, roughness: 0.95 } : undefined,
      );
      skirt.position.y = options.coat === 'dress' ? -0.68 : options.coat === 'cloak' ? -0.18 : -0.38;
      upper.add(skirt);
    }

    if (options.coat === 'vest') {
      const vest = trapezoid(bottomWidth * 0.72, topWidth * 0.84, torsoHeight * 0.92, depth + 0.035, options.top);
      vest.position.y = -0.015;
      upper.add(vest);
    }

    const armLength = options.longArms ? 0.33 : 0.3;
    const foreLength = options.longArms ? 0.31 : 0.28;
    const armL = buildArm(-1, options, shoulderY, shoulderX, armLength, foreLength);
    const armR = buildArm(1, options, shoulderY, shoulderX, armLength, foreLength);
    upper.add(armL.shoulder, armR.shoulder);

    const headPivot = new THREE.Group();
    headPivot.position.y = torsoHeight + neckHeight;
    upper.add(headPivot);

    const headGroup = new THREE.Group();
    headGroup.scale.setScalar(options.headScale ?? 1);
    headGroup.position.y = 0.235;
    headPivot.add(headGroup);

    const head = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.238, 0),
      skinMaterial(options.skin),
    );
    head.scale.set(0.94, 1.08, 0.92);
    head.castShadow = true;
    head.receiveShadow = true;
    headGroup.add(head);

    const neck = cylinder(0.075, 0.085, 0.09, options.skin, 6);
    neck.rotation.x = Math.PI;
    neck.position.y = 0.055;
    headPivot.add(neck);

    const accessories = addHeadAccessories(headGroup, options);

    const headWorldY = 0.235 + 0.02;
    const { eyeL, eyeR, browL, browR, mouth } = accessories;

    const legL = buildLeg(-1, options, hipHeight, thighLength, shinLength);
    const legR = buildLeg(1, options, hipHeight, thighLength, shinLength);
    pelvis.add(legL.hip, legR.hip);

    let prop: THREE.Group | null = null;
    let flash: THREE.Sprite | null = null;

    if (options.handProp === 'staff') {
      prop = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.028, 1.5, 5),
        material(0x4c3b2b, { roughness: 0.95 }),
      );
      shaft.position.y = 0.75;
      shaft.castShadow = true;
      const crook = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.022, 4, 8, Math.PI * 1.25),
        material(0x4c3b2b, { roughness: 0.95 }),
      );
      crook.position.set(0.08, 1.42, 0);
      crook.rotation.z = -0.4;
      prop.add(shaft, crook);
      prop.position.set(-0.36, 0, 0.03);
      this.root.add(prop);
    } else if (options.handProp === 'boom') {
      prop = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.022, 2.3, 5),
        material(0x2d2d2b, { metalness: 0.2, roughness: 0.7 }),
      );
      pole.rotation.z = -0.75;
      pole.position.set(0.55, 1.3, 0.1);
      const mic = facetedSphere(0.1, 0x222222, 0, [1.3, 1, 1]);
      mic.position.set(1.38, 1.75, 0.1);
      const fuzz = facetedSphere(0.14, 0x4a4a48, 0, [1.2, 1, 1], {
        transparent: 0.85,
      });
      fuzz.position.copy(mic.position);
      prop.add(pole, mic, fuzz);
      this.root.add(prop);
    } else if (
      options.handProp === 'camera' ||
      options.handProp === 'film-camera' ||
      options.handProp === 'megaphone' ||
      options.handProp === 'bag'
    ) {
      if (options.handProp === 'camera' || options.handProp === 'film-camera') {
        const film = options.handProp === 'film-camera';
        prop = new THREE.Group();
        const body = box(film ? 0.28 : 0.17, film ? 0.18 : 0.12, film ? 0.22 : 0.1, 0x1b1c1e, {
          roughness: 0.55,
          metalness: 0.25,
        });
        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(film ? 0.065 : 0.045, film ? 0.075 : 0.05, film ? 0.16 : 0.1, 7),
          material(0x101113, { metalness: 0.5, roughness: 0.35 }),
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.z = film ? 0.17 : 0.1;
        const flashMesh = new THREE.Mesh(
          new THREE.BoxGeometry(film ? 0.2 : 0.12, 0.04, 0.03),
          material(0xf8edd6, { emissive: 0xfff1cf, emissiveIntensity: 0.2 }),
        );
        flashMesh.position.set(0, film ? 0.1 : 0.075, 0);
        prop.add(body, lens, flashMesh);
        prop.position.set(0, shoulderY + 0.08, depth / 2 + 0.1);
        upper.add(prop);

        const flashMaterial = new THREE.SpriteMaterial({
          map: makeGlowTexture('#fff7df'),
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        flash = new THREE.Sprite(flashMaterial);
        flash.scale.setScalar(0.6);
        flash.position.copy(prop.position);
        flash.position.z += 0.18;
        upper.add(flash);
      } else if (options.handProp === 'megaphone') {
        prop = new THREE.Group();
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.32, 7, 1, true),
          material(0x8e3b31, { side: THREE.DoubleSide }),
        );
        cone.rotation.x = -Math.PI / 2;
        cone.position.z = 0.18;
        const handle = box(0.04, 0.16, 0.04, 0x2a2420);
        prop.add(cone, handle);
        prop.position.set(0.3, 0.4, 0.16);
        upper.add(prop);
      } else {
        prop = new THREE.Group();
        const bag = box(0.28, 0.22, 0.12, 0x4f4436);
        bag.position.z = -depth / 2 - 0.08;
        prop.add(bag);
        upper.add(prop);
      }
    }

    const scale = options.height / 1.96;
    this.root.scale.setScalar(scale);
    this.headHeight = (hipHeight + torsoHeight + neckHeight + headWorldY) * scale;

    this.rig = {
      pelvis,
      upper,
      torso,
      headPivot,
      headGroup,
      head,
      mouth,
      browL,
      browR,
      eyeL,
      eyeR,
      armL,
      armR,
      legL,
      legR,
      flash,
      prop,
      hipHeight,
      torsoHeight,
    };
  }

  animate(state: ActorAnimationState): void {
    const rig = this.rig;
    const t = state.time;
    const phase = state.walkPhase;
    const variant = this.options.variant;
    const idleSeed = (this.options.seed ?? 1) * 1.7;

    rig.pelvis.position.y = rig.hipHeight;
    rig.pelvis.rotation.set(0, 0, 0);
    rig.upper.rotation.set(0, 0, 0);
    rig.upper.position.set(0, 0, 0);
    rig.headPivot.rotation.set(0, 0, 0);
    rig.armL.shoulder.rotation.set(0, 0, -0.075);
    rig.armR.shoulder.rotation.set(0, 0, 0.075);
    rig.armL.elbow.rotation.set(-0.08, 0, 0);
    rig.armR.elbow.rotation.set(-0.08, 0, 0);
    rig.legL.hip.rotation.set(0, 0, 0);
    rig.legR.hip.rotation.set(0, 0, 0);
    rig.legL.knee.rotation.set(0, 0, 0);
    rig.legR.knee.rotation.set(0, 0, 0);
    rig.mouth.scale.set(1, 1, 1);
    rig.mouth.position.y = -0.085;
    rig.browL.rotation.set(0, 0, 0);
    rig.browR.rotation.set(0, 0, 0);

    const breath = Math.sin(t * 1.35 + idleSeed) * 0.5 + 0.5;
    rig.pelvis.position.y = rig.hipHeight + breath * 0.006;
    rig.pelvis.rotation.z = Math.sin(t * 0.55 + idleSeed) * 0.008;

    let base = state.base;
    if (base === 'show' || base === 'hide' || base === 'stand' || base === 'face') base = 'idle';

    switch (base) {
      case 'walk':
        this.poseWalk(state, 1);
        break;
      case 'run':
        this.poseWalk(state, 1.7);
        rig.upper.rotation.x = 0.16;
        break;
      case 'sit':
        this.poseSit(state);
        break;
      case 'yoga':
        this.poseYoga(state, variant);
        break;
      case 'photo':
        this.posePhoto(state);
        break;
      case 'kiss':
        this.poseKiss(state);
        break;
      case 'telescope':
        this.poseTelescope(state);
        break;
      case 'bark':
      case 'cycle':
      case 'cycle_stop':
        this.poseIdle(state, variant, idleSeed, breath);
        break;
      case 'idle':
      default:
        this.poseIdle(state, variant, idleSeed, breath);
        break;
    }

    if (state.transient) {
      this.applyTransient(state.transient, state.transientWeight, state.transientProgress, t);
    }

    if (state.talk > 0.01) {
      const mouthOpen = 0.55 + Math.sin(t * 19 + idleSeed) * 0.45;
      rig.mouth.scale.y = 1 + mouthOpen * 1.7 * state.talk;
      rig.mouth.position.y = -0.085 - mouthOpen * 0.005 * state.talk;
      rig.headPivot.rotation.x += Math.sin(t * 8.5 + idleSeed) * 0.012 * state.talk;
      if (base === 'idle' || base === 'sit') {
        const gesture = Math.sin(t * 2.4 + idleSeed) * 0.5 + 0.5;
        rig.armR.elbow.rotation.x += -0.22 * state.talk * gesture;
        rig.armR.shoulder.rotation.x += -0.1 * state.talk * gesture;
      }
    }

    this.applyEmotion(state.emotion, t, idleSeed);
    this.applyLook(state);

    if (rig.flash) {
      const flashActive = state.transient === 'photo' || base === 'photo';
      const progress = state.transient === 'photo' ? state.transientProgress : 0.35;
      const pulse =
        flashActive
          ? Math.max(0, Math.sin(progress * Math.PI * 3 + 0.5)) *
            Math.max(0, Math.sin(progress * Math.PI))
          : 0;
      (rig.flash.material as THREE.SpriteMaterial).opacity = pulse * 0.95;
      rig.flash.scale.setScalar(0.5 + pulse * 1.2);
    }

    if (rig.prop && this.options.handProp === 'staff') {
      rig.prop.rotation.z = Math.sin(t * 0.4 + idleSeed) * 0.012;
      rig.armR.shoulder.rotation.x += -0.3;
      rig.armR.elbow.rotation.x += -0.5;
    }
  }

  private poseIdle(
    state: ActorAnimationState,
    variant: string,
    seed: number,
    breath: number,
  ): void {
    const rig = this.rig;
    const t = state.time;

    rig.upper.rotation.x = 0.018 + breath * 0.008;
    rig.armL.shoulder.rotation.x = 0.02 + Math.sin(t * 0.6 + seed) * 0.012;
    rig.armR.shoulder.rotation.x = 0.02 + Math.sin(t * 0.6 + seed + 1.3) * 0.012;
    rig.armL.elbow.rotation.x = -0.12;
    rig.armR.elbow.rotation.x = -0.12;

    if (variant === 'gino') {
      rig.upper.rotation.x = -0.03;
      rig.headPivot.rotation.x = -0.1;
      rig.headPivot.rotation.z = 0.06;
      rig.armR.shoulder.rotation.x = 0.35;
      rig.armR.elbow.rotation.x = -1.25;
      rig.armL.shoulder.rotation.x = -0.04;
      rig.armL.elbow.rotation.x = -0.1;
      rig.legL.hip.rotation.z = -0.015;
      rig.legR.hip.rotation.z = 0.015;
    } else if (variant === 'arturo') {
      rig.legL.hip.rotation.z = -0.06;
      rig.legR.hip.rotation.z = 0.06;
      rig.armL.shoulder.rotation.x = -0.22;
      rig.armR.shoulder.rotation.x = -0.22;
      rig.armL.elbow.rotation.x = -0.5;
      rig.armR.elbow.rotation.x = -0.5;
      rig.upper.rotation.z = Math.sin(t * 0.8 + seed) * 0.008;
    } else if (variant === 'instructor' || variant === 'yogi') {
      rig.upper.rotation.x = -0.02;
      rig.armL.shoulder.rotation.z = -0.18;
      rig.armR.shoulder.rotation.z = 0.18;
      rig.armL.elbow.rotation.x = -0.35;
      rig.armR.elbow.rotation.x = -0.35;
    } else if (variant === 'shepherd') {
      rig.upper.rotation.x = 0.12;
      rig.headPivot.rotation.x = 0.18;
      rig.armR.shoulder.rotation.x = -0.32;
      rig.armR.elbow.rotation.x = -0.52;
      rig.armL.shoulder.rotation.x = -0.1;
    } else if (variant === 'photographer') {
      rig.armL.shoulder.rotation.x = -0.55;
      rig.armL.elbow.rotation.x = -0.8;
      rig.armR.shoulder.rotation.x = -0.55;
      rig.armR.elbow.rotation.x = -0.8;
    } else if (variant === 'director') {
      rig.armL.shoulder.rotation.x = -0.35;
      rig.armL.elbow.rotation.x = -1.25;
      rig.armR.shoulder.rotation.x = 0.04;
      rig.upper.rotation.x = -0.04;
    } else if (variant === 'bride' || variant === 'groom') {
      rig.armL.shoulder.rotation.z = -0.32;
      rig.armR.shoulder.rotation.z = 0.32;
      rig.armL.elbow.rotation.x = -0.35;
      rig.armR.elbow.rotation.x = -0.35;
    }
  }

  private poseWalk(state: ActorAnimationState, multiplier: number): void {
    const rig = this.rig;
    const phase = state.walkPhase;
    const variant = this.options.variant;
    const arturo = variant === 'arturo';
    const gino = variant === 'gino';
    const amp = (arturo ? 0.34 : gino ? 0.24 : 0.4) * multiplier;
    const stride = Math.sin(phase);
    const opposite = Math.sin(phase + Math.PI);
    const bob = Math.abs(Math.cos(phase)) * (arturo ? 0.012 : 0.02) * multiplier;

    rig.pelvis.position.y += bob;
    rig.pelvis.rotation.z = Math.sin(phase) * 0.015;
    rig.upper.rotation.x = 0.03 + (multiplier > 1 ? 0.07 : 0) + Math.sin(phase * 2) * 0.008;

    rig.legL.hip.rotation.x = -stride * amp;
    rig.legR.hip.rotation.x = -opposite * amp;
    rig.legL.knee.rotation.x = Math.max(0, Math.sin(phase + 0.25)) * (arturo ? 0.55 : 0.7) * multiplier;
    rig.legR.knee.rotation.x =
      Math.max(0, Math.sin(phase + Math.PI + 0.25)) * (arturo ? 0.55 : 0.7) * multiplier;

    rig.armL.shoulder.rotation.x = stride * amp * 0.65;
    rig.armR.shoulder.rotation.x = opposite * amp * 0.65;
    rig.armL.elbow.rotation.x = -0.2 - Math.max(0, stride) * 0.16;
    rig.armR.elbow.rotation.x = -0.2 - Math.max(0, opposite) * 0.16;

    if (arturo) {
      rig.legL.hip.rotation.z = -0.09;
      rig.legR.hip.rotation.z = 0.09;
      rig.armL.shoulder.rotation.x = -0.35 + stride * 0.12;
      rig.armR.shoulder.rotation.x = -0.35 + opposite * 0.12;
      rig.armL.elbow.rotation.x = -0.85;
      rig.armR.elbow.rotation.x = -0.85;
      rig.headPivot.rotation.y = Math.sin(state.time * 1.1) * 0.12;
    } else if (gino) {
      rig.headPivot.rotation.x = -0.08;
      rig.armR.shoulder.rotation.x = 0.32;
      rig.armR.elbow.rotation.x = -1.15;
      rig.armL.elbow.rotation.x = -0.12;
    } else if (variant === 'shepherd') {
      rig.armR.shoulder.rotation.x = -0.22;
      rig.armR.elbow.rotation.x = -0.55;
    }
  }

  private poseSit(state: ActorAnimationState): void {
    const rig = this.rig;
    rig.pelvis.position.y = rig.hipHeight - 0.43;
    rig.legL.hip.rotation.x = -1.28;
    rig.legR.hip.rotation.x = -1.28;
    rig.legL.hip.rotation.z = -0.2;
    rig.legR.hip.rotation.z = 0.2;
    rig.legL.knee.rotation.x = 1.42;
    rig.legR.knee.rotation.x = 1.42;
    rig.upper.rotation.x = 0.04;
    rig.armL.shoulder.rotation.x = -0.35;
    rig.armR.shoulder.rotation.x = -0.35;
    rig.armL.elbow.rotation.x = -0.62;
    rig.armR.elbow.rotation.x = -0.62;
    rig.armL.shoulder.rotation.z = -0.16;
    rig.armR.shoulder.rotation.z = 0.16;
    rig.headPivot.rotation.x = 0.03;

    if (this.options.variant === 'gino') {
      rig.headPivot.rotation.x = -0.08;
      rig.headPivot.rotation.z = 0.06;
      rig.upper.rotation.x = -0.02;
    }
    void state;
  }

  private poseYoga(state: ActorAnimationState, variant: string): void {
    const rig = this.rig;
    const instructor = variant === 'instructor';

    if (instructor) {
      rig.legL.hip.rotation.z = -0.06;
      rig.legR.hip.rotation.x = -0.5;
      rig.legR.knee.rotation.x = 0.9;
      rig.armL.shoulder.rotation.z = -2.45;
      rig.armR.shoulder.rotation.z = 2.45;
      rig.armL.shoulder.rotation.x = -0.2;
      rig.armR.shoulder.rotation.x = -0.2;
      rig.armL.elbow.rotation.x = -0.15;
      rig.armR.elbow.rotation.x = -0.15;
      rig.upper.rotation.x = -0.02;
      rig.headPivot.rotation.x = -0.08;
    } else {
      rig.pelvis.position.y = rig.hipHeight - 0.46;
      rig.legL.hip.rotation.set(-1.35, 0, -0.6);
      rig.legR.hip.rotation.set(-1.35, 0, 0.6);
      rig.legL.knee.rotation.set(1.7, 0, 0);
      rig.legR.knee.rotation.set(1.7, 0, 0);
      rig.armL.shoulder.rotation.z = -0.25;
      rig.armR.shoulder.rotation.z = 0.25;
      rig.armL.elbow.rotation.x = -0.25;
      rig.armR.elbow.rotation.x = -0.25;
      rig.headPivot.rotation.x = 0.04;
    }

    const sway = Math.sin(state.time * 0.55 + (this.options.seed ?? 0)) * 0.02;
    rig.upper.rotation.z += sway;
  }

  private posePhoto(state: ActorAnimationState): void {
    const rig = this.rig;
    const progress = state.transient === 'photo' ? state.transientProgress : 0.4;
    const lift = smoothstep(0, 0.25, progress);
    rig.armL.shoulder.rotation.x = lerp(-0.2, -1.55, lift);
    rig.armR.shoulder.rotation.x = lerp(-0.2, -1.55, lift);
    rig.armL.elbow.rotation.x = lerp(-0.2, -1.25, lift);
    rig.armR.elbow.rotation.x = lerp(-0.2, -1.25, lift);
    rig.headPivot.rotation.x = 0.04;
    if (this.options.variant === 'cameraman') {
      rig.upper.rotation.x = 0.04;
    }
  }

  private poseKiss(state: ActorAnimationState): void {
    const rig = this.rig;
    rig.upper.rotation.x = 0.16;
    rig.headPivot.rotation.x = 0.28;
    rig.headPivot.rotation.z = 0.08;
    rig.armL.shoulder.rotation.x = -0.55;
    rig.armR.shoulder.rotation.x = -0.55;
    rig.armL.elbow.rotation.x = -0.85;
    rig.armR.elbow.rotation.x = -0.85;
    const bob = Math.sin(state.time * 2.2 + (this.options.seed ?? 0)) * 0.01;
    rig.upper.position.y = bob;
  }

  private poseTelescope(state: ActorAnimationState): void {
    const rig = this.rig;
    rig.upper.rotation.x = 0.25;
    rig.headPivot.rotation.x = -0.1;
    rig.armL.shoulder.rotation.x = -1.2;
    rig.armR.shoulder.rotation.x = -1.4;
    rig.armL.elbow.rotation.x = -0.4;
    rig.armR.elbow.rotation.x = -0.3;
    rig.legL.hip.rotation.z = -0.08;
    rig.legR.hip.rotation.z = 0.08;
    void state;
  }

  private applyTransient(
    action: ActionName,
    weight: number,
    progress: number,
    time: number,
  ): void {
    const rig = this.rig;
    const w = clamp01(weight);
    const seed = this.options.seed ?? 1;

    if (action === 'nervous') {
      const shake = Math.sin(time * 24 + seed) * 0.012 * w;
      rig.upper.rotation.z += shake;
      rig.pelvis.position.x = Math.sin(time * 11 + seed) * 0.006 * w;
      rig.legL.hip.rotation.z -= 0.12 * w;
      rig.legR.hip.rotation.z += 0.12 * w;
      rig.legL.knee.rotation.x += 0.16 * w;
      rig.legR.knee.rotation.x += 0.16 * w;
      rig.armL.shoulder.rotation.x = lerp(rig.armL.shoulder.rotation.x, -0.7, w);
      rig.armR.shoulder.rotation.x = lerp(rig.armR.shoulder.rotation.x, -0.7, w);
      rig.armL.elbow.rotation.x = lerp(rig.armL.elbow.rotation.x, -1.25, w);
      rig.armR.elbow.rotation.x = lerp(rig.armR.elbow.rotation.x, -1.25, w);
      rig.headPivot.rotation.z += shake * 2;
    } else if (action === 'shiver') {
      const shake = Math.sin(time * 31 + seed) * 0.016 * w;
      rig.upper.rotation.z += shake;
      rig.headPivot.rotation.z += shake * 1.4;
      rig.armL.elbow.rotation.x -= 0.3 * w;
      rig.armR.elbow.rotation.x -= 0.3 * w;
    } else if (action === 'point') {
      rig.armR.shoulder.rotation.x = lerp(rig.armR.shoulder.rotation.x, -1.35, w);
      rig.armR.shoulder.rotation.z = lerp(rig.armR.shoulder.rotation.z, 0.25, w);
      rig.armR.elbow.rotation.x = lerp(rig.armR.elbow.rotation.x, -0.12, w);
      rig.headPivot.rotation.y += 0.12 * w;
    } else if (action === 'look') {
      const look = Math.sin(progress * Math.PI) * w;
      rig.headPivot.rotation.x += -0.05 * look;
    } else if (action === 'bend') {
      rig.upper.rotation.x += 0.5 * w;
      rig.headPivot.rotation.x += 0.15 * w;
      rig.armL.shoulder.rotation.x -= 0.45 * w;
      rig.armR.shoulder.rotation.x -= 0.45 * w;
      rig.legL.knee.rotation.x += 0.2 * w;
      rig.legR.knee.rotation.x += 0.2 * w;
    } else if (action === 'relief') {
      rig.upper.rotation.x -= 0.1 * w;
      rig.headPivot.rotation.x -= 0.2 * w;
      rig.armL.shoulder.rotation.z -= 0.22 * w;
      rig.armR.shoulder.rotation.z += 0.22 * w;
      rig.armL.elbow.rotation.x -= 0.1 * w;
      rig.armR.elbow.rotation.x -= 0.1 * w;
    } else if (action === 'raise_arms') {
      const rise = smoothstep(0, 0.35, progress) * w;
      rig.armL.shoulder.rotation.z -= 2.4 * rise;
      rig.armR.shoulder.rotation.z += 2.4 * rise;
      rig.armL.elbow.rotation.x -= 0.3 * rise;
      rig.armR.elbow.rotation.x -= 0.3 * rise;
      rig.headPivot.rotation.x -= 0.15 * rise;
    } else if (action === 'cry') {
      rig.headPivot.rotation.x += 0.38 * w;
      rig.upper.rotation.x += 0.18 * w;
      rig.armL.shoulder.rotation.x = lerp(rig.armL.shoulder.rotation.x, -1.45, w);
      rig.armR.shoulder.rotation.x = lerp(rig.armR.shoulder.rotation.x, -1.45, w);
      rig.armL.elbow.rotation.x = lerp(rig.armL.elbow.rotation.x, -1.5, w);
      rig.armR.elbow.rotation.x = lerp(rig.armR.elbow.rotation.x, -1.5, w);
      rig.armL.shoulder.rotation.z = lerp(rig.armL.shoulder.rotation.z, 0.25, w);
      rig.armR.shoulder.rotation.z = lerp(rig.armR.shoulder.rotation.z, -0.25, w);
      const sob = Math.sin(time * 9 + seed) * 0.02 * w;
      rig.pelvis.position.y += Math.abs(sob) * 2;
      rig.upper.rotation.z += sob;
    } else if (action === 'sigh') {
      rig.upper.rotation.x += 0.12 * w;
      rig.headPivot.rotation.x += 0.22 * w;
      rig.upper.position.y -= 0.015 * w;
    } else if (action === 'kneel') {
      rig.pelvis.position.y -= 0.38 * w;
      rig.legL.hip.rotation.x = lerp(rig.legL.hip.rotation.x, -1.4, w);
      rig.legL.knee.rotation.x = lerp(rig.legL.knee.rotation.x, 1.5, w);
      rig.legR.hip.rotation.x = lerp(rig.legR.hip.rotation.x, 0.35, w);
      rig.legR.knee.rotation.x = lerp(rig.legR.knee.rotation.x, 1.1, w);
    } else if (action === 'turn_camera') {
      rig.headPivot.rotation.y += 0.2 * w;
    }
  }

  private applyEmotion(emotion: Emotion, time: number, seed: number): void {
    const rig = this.rig;
    const jitter = Math.sin(time * 2 + seed) * 0.006;
    let browTilt = 0;
    let headPitch = 0;

    if (emotion === 'worried') {
      browTilt = 0.24;
      headPitch = 0.04;
    } else if (emotion === 'despair') {
      browTilt = 0.32;
      headPitch = 0.18;
    } else if (emotion === 'hopeful') {
      browTilt = -0.14;
      headPitch = -0.14;
    } else if (emotion === 'angry') {
      browTilt = -0.34;
      headPitch = -0.04;
    } else if (emotion === 'calm') {
      browTilt = 0.03;
    } else if (emotion === 'serene') {
      browTilt = -0.02;
      headPitch = -0.05;
    }

    rig.browL.rotation.z += -browTilt;
    rig.browR.rotation.z += browTilt;
    rig.headPivot.rotation.x += headPitch + jitter;
    if (emotion === 'despair' || emotion === 'worried') {
      rig.eyeL.scale.y *= 0.85;
      rig.eyeR.scale.y *= 0.85;
    }
  }

  private applyLook(state: ActorAnimationState): void {
    const rig = this.rig;
    rig.headPivot.rotation.y += clamp(state.lookYaw, -0.95, 0.95);
    rig.headPivot.rotation.x += clamp(state.lookPitch, -0.65, 0.55);
    if (state.turnCamera > 0.01) {
      rig.headPivot.rotation.x -= 0.06 * state.turnCamera;
    }
    void vnoise;
  }
}
