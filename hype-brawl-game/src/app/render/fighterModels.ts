import * as THREE from 'three';
import type { FighterDefinition, FighterPalette } from '../../fighters/types';

export interface FighterRig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  prop: THREE.Group | null;
  shield: THREE.Mesh;
  shieldMaterial: THREE.MeshBasicMaterial;
  aura: THREE.Group;
  shadow: THREE.Mesh;
  height: number;
}

interface MaterialSet {
  skin: THREE.MeshStandardMaterial;
  primary: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  accentGlow: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  shoe: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  eye: THREE.MeshBasicMaterial;
}

function buildMaterials(palette: FighterPalette): MaterialSet {
  const standard = (color: number, roughness = 0.7, metalness = 0.05) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
  return {
    skin: standard(palette.skin, 0.85),
    primary: standard(palette.primary, 0.72),
    secondary: standard(palette.secondary, 0.65),
    accent: standard(palette.accent, 0.5, 0.25),
    accentGlow: new THREE.MeshStandardMaterial({
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.1,
      flatShading: true,
    }),
    hair: standard(palette.hair, 0.9),
    dark: standard(palette.dark, 0.8),
    metal: standard(0xbfc7d5, 0.3, 0.85),
    shoe: standard(0x111118, 0.6),
    white: standard(0xf5f7fa, 0.7),
    eye: new THREE.MeshBasicMaterial({ color: 0x101018 }),
  };
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = false;
  return object;
}

function box(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), material);
}

function sphere(radius: number, material: THREE.Material, segments = 14): THREE.Mesh {
  return mesh(new THREE.SphereGeometry(radius, segments, Math.max(8, Math.floor(segments * 0.7))), material);
}

function cylinder(rt: number, rb: number, h: number, material: THREE.Material, segments = 12): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
}

function addFace(head: THREE.Group, palette: FighterPalette, headRadius: number, materialSet: MaterialSet): void {
  const eyeGeometry = new THREE.SphereGeometry(headRadius * 0.16, 10, 8);
  const pupilGeometry = new THREE.SphereGeometry(headRadius * 0.075, 8, 6);
  for (const side of [-1, 1]) {
    const eye = mesh(eyeGeometry, materialSet.white);
    eye.position.set(side * headRadius * 0.35, headRadius * 0.1, headRadius * 0.88);
    head.add(eye);
    const pupil = mesh(pupilGeometry, materialSet.eye);
    pupil.position.set(side * headRadius * 0.35, headRadius * 0.1, headRadius * 1.02);
    head.add(pupil);
  }
  const mouth = box(headRadius * 0.42, headRadius * 0.08, headRadius * 0.06, materialSet.dark);
  mouth.position.set(0, -headRadius * 0.38, headRadius * 0.92);
  head.add(mouth);
  const browMaterial = new THREE.MeshBasicMaterial({ color: palette.hair });
  for (const side of [-1, 1]) {
    const brow = box(headRadius * 0.28, headRadius * 0.05, headRadius * 0.05, browMaterial);
    brow.position.set(side * headRadius * 0.35, headRadius * 0.46, headRadius * 0.86);
    brow.rotation.z = side * -0.16;
    head.add(brow);
  }
}

function baseRig(definition: FighterDefinition, palette: FighterPalette): FighterRig {
  const materials = buildMaterials(palette);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const height = definition.stats.height;
  const width = definition.stats.width;
  const hipY = height * 0.44;
  const torsoY = height * 0.62;
  const headY = height * 0.85;

  const torso = new THREE.Group();
  torso.position.y = torsoY;
  body.add(torso);

  const head = new THREE.Group();
  head.position.y = headY;
  body.add(head);

  const leftArm = new THREE.Group();
  leftArm.position.set(-width * 0.48, height * 0.72, 0);
  const rightArm = new THREE.Group();
  rightArm.position.set(width * 0.48, height * 0.72, 0);
  body.add(leftArm, rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-width * 0.22, hipY, 0);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(width * 0.22, hipY, 0);
  body.add(leftLeg, rightLeg);

  const shieldRadius = height * 0.62;
  const shieldMaterial = new THREE.MeshBasicMaterial({
    color: 0x45b7ff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(shieldRadius, 18, 14), shieldMaterial);
  shield.position.y = height * 0.5;
  shield.scale.y = 1.08;
  shield.visible = false;
  root.add(shield);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(width * 0.62, 24),
    new THREE.MeshBasicMaterial({ color: 0x030008, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  root.add(shadow);

  const aura = new THREE.Group();
  const auraMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd319,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(height * 0.42, height * 0.022, 8, 32), auraMaterial.clone());
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  aura.add(ring);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(height * 0.5, 14, 10), auraMaterial.clone());
  halo.material.transparent = true;
  halo.material.opacity = 0.08;
  halo.position.y = height * 0.5;
  aura.add(halo);
  aura.visible = false;
  root.add(aura);

  const rig: FighterRig = {
    root,
    body,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    prop: null,
    shield,
    shieldMaterial,
    aura,
    shadow,
    height,
  };

  buildBody(definition, palette, materials, rig, torso, head, leftArm, rightArm, leftLeg, rightLeg);
  return rig;
}

function buildBody(
  definition: FighterDefinition,
  palette: FighterPalette,
  materials: MaterialSet,
  rig: FighterRig,
  torso: THREE.Group,
  head: THREE.Group,
  leftArm: THREE.Group,
  rightArm: THREE.Group,
  leftLeg: THREE.Group,
  rightLeg: THREE.Group,
): void {
  const { height, width } = definition.stats;
  const headRadius = height * 0.13;
  const style = definition.modelStyle;

  const torsoMesh = box(width * 0.7, height * 0.32, width * 0.5, materials.primary);
  torsoMesh.position.y = 0;
  torso.add(torsoMesh);

  const collar = box(width * 0.42, height * 0.045, width * 0.52, materials.accentGlow);
  collar.position.y = height * 0.16;
  torso.add(collar);

  const belt = box(width * 0.66, height * 0.035, width * 0.46, materials.dark);
  belt.position.y = -height * 0.165;
  torso.add(belt);

  const headSphere = sphere(headRadius, materials.skin, 18);
  head.add(headSphere);
  addFace(head, palette, headRadius, materials);

  const armLength = height * 0.29;
  for (const [arm, side] of [[leftArm, -1], [rightArm, 1]] as const) {
    const upper = box(width * 0.18, armLength, width * 0.2, style === 'velvet' ? materials.skin : materials.primary);
    upper.position.y = -armLength / 2;
    arm.add(upper);
    const sleeve = box(width * 0.2, armLength * 0.42, width * 0.22, materials.primary);
    sleeve.position.y = -armLength * 0.22;
    arm.add(sleeve);
    const hand = sphere(width * 0.11, materials.skin, 10);
    hand.position.y = -armLength - width * 0.02;
    arm.add(hand);
    const shoulder = sphere(width * 0.13, materials.secondary, 10);
    shoulder.position.set(side * width * 0.02, 0, 0);
    arm.add(shoulder);
  }

  const legLength = height * 0.44;
  for (const [leg, side] of [[leftLeg, -1], [rightLeg, 1]] as const) {
    const thigh = box(width * 0.25, legLength, width * 0.27, materials.dark);
    thigh.position.y = -legLength / 2;
    leg.add(thigh);
    const shin = box(width * 0.22, legLength * 0.48, width * 0.24, materials.primary);
    shin.position.y = -legLength * 0.72;
    leg.add(shin);
    const shoe = box(width * 0.28, height * 0.06, width * 0.4, materials.shoe);
    shoe.position.set(0, -legLength + height * 0.03, width * 0.05);
    leg.add(shoe);
    void side;
  }

  if (style === 'nero') {
    const hair = sphere(headRadius * 1.04, materials.hair, 14);
    hair.scale.set(1, 0.72, 1);
    hair.position.y = headRadius * 0.55;
    head.add(hair);
    const band = new THREE.Mesh(new THREE.TorusGeometry(headRadius * 1.04, headRadius * 0.12, 8, 20), materials.dark);
    band.rotation.x = Math.PI / 2;
    band.position.y = headRadius * 0.5;
    head.add(band);
    for (const side of [-1, 1]) {
      const cup = cylinder(headRadius * 0.27, headRadius * 0.32, headRadius * 0.22, materials.accentGlow, 12);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * headRadius * 1.04, headRadius * 0.12, 0);
      head.add(cup);
    }
    const chain = new THREE.Mesh(new THREE.TorusGeometry(width * 0.22, width * 0.014, 6, 20), materials.metal);
    chain.rotation.x = Math.PI / 2.2;
    chain.position.set(0, -height * 0.02, width * 0.25);
    torso.add(chain);
    const mic = new THREE.Group();
    const handle = cylinder(width * 0.045, width * 0.055, height * 0.16, materials.dark, 10);
    handle.position.y = -height * 0.08;
    mic.add(handle);
    const headBall = sphere(width * 0.08, materials.metal, 10);
    headBall.position.y = height * 0.015;
    mic.add(headBall);
    mic.position.set(0, -armLength, 0);
    rightArm.add(mic);
    rig.prop = mic;
    const stripe = box(width * 0.09, height * 0.33, width * 0.02, materials.secondary);
    stripe.position.set(width * 0.1, -height * 0.01, width * 0.255);
    torso.add(stripe);
  }

  if (style === 'velvet') {
    const hairBack = sphere(headRadius * 1.05, materials.hair, 14);
    hairBack.scale.set(1.08, 1.18, 0.82);
    hairBack.position.set(0, headRadius * 0.42, -headRadius * 0.58);
    head.add(hairBack);
    const swept = sphere(headRadius * 0.7, materials.secondary, 12);
    swept.scale.set(1.18, 1.08, 0.5);
    swept.position.set(headRadius * 0.44, headRadius * 0.98, -headRadius * 0.12);
    swept.rotation.z = -0.4;
    head.add(swept);
    const ponytail = sphere(headRadius * 0.56, materials.secondary, 12);
    ponytail.scale.set(0.72, 1.5, 0.66);
    ponytail.position.set(-headRadius * 0.9, headRadius * 0.1, -headRadius * 0.55);
    ponytail.rotation.z = 0.35;
    head.add(ponytail);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(headRadius * 0.3), materials.accentGlow);
    star.position.set(headRadius * 0.7, headRadius * 1.25, 0);
    star.rotation.z = 0.4;
    head.add(star);
    for (const side of [-1, 1]) {
      const earring = new THREE.Mesh(new THREE.OctahedronGeometry(headRadius * 0.18), materials.accentGlow);
      earring.position.set(side * headRadius * 0.98, -headRadius * 0.25, headRadius * 0.2);
      head.add(earring);
    }
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(width * 0.68, height * 0.34, 14), materials.primary);
    skirt.position.y = -height * 0.2;
    torso.add(skirt);
    const neckline = new THREE.Mesh(new THREE.TorusGeometry(width * 0.2, width * 0.018, 6, 20), materials.accentGlow);
    neckline.rotation.x = Math.PI / 2;
    neckline.position.y = height * 0.16;
    torso.add(neckline);
    const mic = new THREE.Group();
    const handle = cylinder(width * 0.035, width * 0.04, height * 0.13, materials.accent, 10);
    handle.position.y = -height * 0.06;
    mic.add(handle);
    const headBall = sphere(width * 0.065, materials.primary, 10);
    headBall.position.y = height * 0.01;
    mic.add(headBall);
    mic.position.set(0, -armLength, 0);
    leftArm.add(mic);
    rig.prop = mic;
    const trim = box(width * 0.7, height * 0.02, width * 0.02, materials.accentGlow);
    trim.position.set(0, -height * 0.11, width * 0.26);
    torso.add(trim);
  }

  if (style === 'zia') {
    const hairBun = sphere(headRadius * 0.55, materials.hair, 12);
    hairBun.position.set(0, headRadius * 0.85, -headRadius * 0.2);
    head.add(hairBun);
    const hatBase = cylinder(headRadius * 0.95, headRadius * 1.02, headRadius * 0.5, materials.white, 14);
    hatBase.position.y = headRadius * 0.8;
    head.add(hatBase);
    const hatPuff = sphere(headRadius * 0.9, materials.white, 14);
    hatPuff.scale.set(1.15, 0.75, 1.15);
    hatPuff.position.y = headRadius * 1.22;
    head.add(hatPuff);
    const apron = box(width * 0.58, height * 0.32, width * 0.05, materials.secondary);
    apron.position.set(0, -height * 0.01, width * 0.27);
    torso.add(apron);
    const apronStrapL = box(width * 0.06, height * 0.2, width * 0.04, materials.secondary);
    apronStrapL.position.set(-width * 0.18, height * 0.13, width * 0.26);
    apronStrapL.rotation.z = -0.1;
    torso.add(apronStrapL);
    const apronStrapR = apronStrapL.clone();
    apronStrapR.position.x = width * 0.18;
    apronStrapR.rotation.z = 0.1;
    torso.add(apronStrapR);
    const pan = new THREE.Group();
    const panBody = cylinder(width * 0.22, width * 0.19, width * 0.035, materials.metal, 16);
    panBody.rotation.x = Math.PI / 2;
    panBody.position.y = -height * 0.04;
    pan.add(panBody);
    const panHandle = box(width * 0.05, width * 0.05, height * 0.19, materials.dark);
    panHandle.position.set(0, -height * 0.04, -height * 0.13);
    pan.add(panHandle);
    pan.position.set(0, -armLength, width * 0.02);
    leftArm.add(pan);
    rig.prop = pan;
    const bodyScale = 1.08;
    torso.scale.set(bodyScale, 1, bodyScale);
  }

  if (style === 'ace') {
    const helmet = sphere(headRadius * 1.08, materials.primary, 16);
    helmet.scale.set(1.05, 1.05, 1.02);
    head.add(helmet);
    const visor = box(headRadius * 1.5, headRadius * 0.46, headRadius * 0.3, materials.accentGlow);
    visor.position.set(0, headRadius * 0.08, headRadius * 0.92);
    head.add(visor);
    const fin = box(headRadius * 0.16, headRadius * 0.9, headRadius * 0.55, materials.accentGlow);
    fin.position.set(0, headRadius * 1.05, -headRadius * 0.25);
    head.add(fin);
    const emblem = box(width * 0.26, height * 0.09, width * 0.03, materials.accentGlow);
    emblem.position.set(0, -height * 0.02, width * 0.26);
    torso.add(emblem);
    const stripe = box(width * 0.08, height * 0.31, width * 0.02, materials.white);
    stripe.position.set(-width * 0.2, 0, width * 0.255);
    torso.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.x = width * 0.2;
    torso.add(stripe2);
    const scarf = new THREE.Group();
    const scarfPiece = box(width * 0.5, height * 0.07, width * 0.22, materials.secondary);
    scarfPiece.position.set(0, 0, -width * 0.3);
    scarf.add(scarfPiece);
    const tail = box(width * 0.24, height * 0.05, height * 0.32, materials.secondary);
    tail.position.set(width * 0.18, -height * 0.06, -height * 0.22);
    tail.rotation.x = -0.5;
    scarf.add(tail);
    scarf.position.y = height * 0.16;
    torso.add(scarf);
    const bootL = box(width * 0.26, height * 0.09, width * 0.42, materials.accent);
    bootL.position.set(0, -legLength + height * 0.045, width * 0.06);
    leftLeg.add(bootL);
    const bootR = bootL.clone();
    rightLeg.add(bootR);
  }

  head.position.y = height * 0.85;
}

export function buildFighterRig(definition: FighterDefinition, paletteIndex: number): FighterRig {
  const palette = definition.palettes[paletteIndex % definition.palettes.length];
  return baseRig(definition, palette);
}

export function disposeGroup(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of list) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
