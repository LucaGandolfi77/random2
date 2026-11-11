import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  type Material,
  type Side
} from 'three';
import type { CharacterSpec } from '../data/types';

export interface Rig {
  root: Group;
  hips: Group;
  torso: Group;
  head: Group;
  shoulderL: Group;
  shoulderR: Group;
  elbowL: Group;
  elbowR: Group;
  handL: Group;
  handR: Group;
  hipL: Group;
  hipR: Group;
  kneeL: Group;
  kneeR: Group;
  ankleL: Group;
  ankleR: Group;
  brows: [Mesh, Mesh];
  eyeGroups: [Group, Group];
  mouth: Mesh;
  props: { photo: Object3D; tape: Object3D; paper: Object3D };
  height: number;
  hipsBaseY: number;
  sitDrop: number;
  coatFlap: Group | null;
  backpack: Group | null;
}

const materialCache = new Map<string, Material>();

function material(color: string, options: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number; side?: Side; transparent?: boolean; opacity?: number; basic?: boolean } = {}): Material {
  const key = `${color}|${options.roughness ?? 0.85}|${options.metalness ?? 0}|${options.emissive ?? ''}|${options.emissiveIntensity ?? 0}|${options.side ?? 0}|${options.transparent ? 1 : 0}|${options.opacity ?? 1}|${options.basic ? 'b' : 's'}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  let mat: Material;
  if (options.basic) {
    mat = new MeshBasicMaterial({ color: new Color(color), side: options.side ?? 0, transparent: options.transparent ?? false, opacity: options.opacity ?? 1 });
  } else {
    mat = new MeshStandardMaterial({
      color: new Color(color),
      roughness: options.roughness ?? 0.85,
      metalness: options.metalness ?? 0,
      flatShading: true,
      emissive: new Color(options.emissive ?? '#000000'),
      emissiveIntensity: options.emissiveIntensity ?? 0,
      side: options.side ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1
    });
  }
  materialCache.set(key, mat);
  return mat;
}

function addMesh(parent: Object3D, mesh: Mesh, shadows = true): Mesh {
  mesh.castShadow = shadows;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function box(parent: Object3D, w: number, h: number, d: number, mat: Material, x = 0, y = 0, z = 0, shadows = true): Mesh {
  return addMesh(parent, new Mesh(new BoxGeometry(w, h, d), mat), shadows).translateX(x).translateY(y).translateZ(z);
}

function limb(parent: Object3D, length: number, rTop: number, rBottom: number, mat: Material, seg = 6): Mesh {
  const mesh = new Mesh(new CylinderGeometry(rTop, rBottom, length, seg, 1), mat);
  mesh.position.y = -length / 2;
  return addMesh(parent, mesh);
}

export function buildRig(spec: CharacterSpec): Rig {
  const H = spec.height;
  const headR = H * 0.075 * spec.headScale;
  const torsoH = H * 0.235;
  const torsoW = H * (spec.build === 'child' ? 0.24 : spec.build === 'stocky' ? 0.26 : 0.215);
  const torsoD = H * (spec.build === 'child' ? 0.13 : 0.115);
  const hipsY = H * 0.5;
  const shoulderX = torsoW * 0.52;
  const upperArm = H * 0.16;
  const foreArm = H * 0.15;
  const handSize = H * 0.05;
  const thigh = H * 0.245;
  const shin = H * 0.245;
  const footH = H * 0.035;
  const neckLen = H * 0.05;

  const skin = material(spec.skin, { roughness: 0.78 });
  const hair = material(spec.hair, { roughness: 0.9 });
  const coat = material(spec.coat, { roughness: 0.92 });
  const coat2 = material(spec.coat2, { roughness: 0.94 });
  const pants = material(spec.pants, { roughness: 0.95 });
  const shoes = material(spec.shoes, { roughness: 0.65 });
  const accent = material(spec.accent, { roughness: 0.9 });
  const scarfMat = material(spec.scarfColor, { roughness: 0.98 });
  const dark = material('#1b1a1a', { roughness: 0.8 });
  const mouthMat = material('#5a3a36', { roughness: 0.9 });

  const root = new Group();
  root.name = `actor_${spec.id}`;

  const hips = new Group();
  hips.position.y = hipsY;
  root.add(hips);

  const pelvisMat = spec.apron ? accent : pants;
  box(hips, torsoW * 0.86, H * 0.07, torsoD * 0.92, pelvisMat, 0, -H * 0.02, 0);

  const torso = new Group();
  hips.add(torso);

  const chest = new Mesh(new CylinderGeometry(torsoW * 0.46, torsoW * 0.42, torsoH, 6, 1), coat);
  chest.scale.z = torsoD / torsoW;
  chest.position.y = torsoH / 2;
  addMesh(torso, chest);

  box(torso, torsoW * 0.9, torsoH * 0.16, torsoD * 1.02, coat2, 0, H * 0.035, 0);
  box(torso, torsoW * 0.18, torsoH * 0.55, torsoD * 0.12, accent, 0, torsoH * 0.5, torsoD * 0.52);

  if (spec.apron) {
    box(torso, torsoW * 0.6, H * 0.32, H * 0.012, accent, 0, -H * 0.05, torsoD * 0.56);
  }

  const chestTop = torsoH;
  const neckMesh = new Mesh(new CylinderGeometry(H * 0.035, H * 0.04, neckLen, 6), skin);
  neckMesh.position.y = chestTop + neckLen * 0.4;
  addMesh(torso, neckMesh);

  if (spec.scarf) {
    const scarf = new Mesh(new CylinderGeometry(headR * 1.02, headR * 1.12, H * 0.05, 6, 1, true), scarfMat);
    scarf.position.y = chestTop + neckLen * 0.35;
    addMesh(torso, scarf);
    box(torso, H * 0.045, H * 0.13, H * 0.012, scarfMat, H * 0.03, chestTop - H * 0.02, torsoD * 0.5);
  }

  const head = new Group();
  head.position.y = chestTop + neckLen + headR * 0.82;
  torso.add(head);

  const skull = new Mesh(new IcosahedronGeometry(headR, 1), skin);
  skull.scale.set(0.92, 1.12, 0.96);
  addMesh(head, skull);

  const hairCap = new Mesh(new SphereGeometry(headR * 1.06, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
  hairCap.scale.set(1.0, 1.1, 1.05);
  hairCap.position.set(0, headR * 0.16, -headR * 0.03);
  hairCap.rotation.x = -0.57;
  addMesh(head, hairCap);

  if (spec.id === 'aicha' || spec.id === 'rose') {
    const bun = new Mesh(new IcosahedronGeometry(headR * 0.42, 0), hair);
    bun.position.set(0, headR * 0.5, -headR * 0.9);
    addMesh(head, bun);
  }

  if (spec.hat === 'knit') {
    const cap = new Mesh(new SphereGeometry(headR * 1.08, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.44), material(spec.accent, { roughness: 1 }));
    cap.scale.set(0.99, 1.06, 1.0);
    cap.position.y = headR * 0.46;
    addMesh(head, cap);
    const band = new Mesh(new CylinderGeometry(headR * 1.11, headR * 1.11, headR * 0.18, 6), material(spec.accent, { roughness: 1 }));
    band.position.y = headR * 0.5;
    addMesh(head, band);
  } else if (spec.hat === 'fedora') {
    const crown = new Mesh(new CylinderGeometry(headR * 0.92, headR * 1.02, headR * 0.72, 8), material('#1d2532', { roughness: 0.7 }));
    crown.position.y = headR * 1.08;
    addMesh(head, crown);
    const brim = new Mesh(new CylinderGeometry(headR * 1.55, headR * 1.55, headR * 0.06, 10), material('#1d2532', { roughness: 0.7 }));
    brim.position.y = headR * 0.78;
    addMesh(head, brim);
  } else if (spec.hat === 'cap') {
    const crown = new Mesh(new CylinderGeometry(headR * 0.95, headR * 1.02, headR * 0.5, 8), material('#1f242b', { roughness: 0.8 }));
    crown.position.y = headR * 0.95;
    addMesh(head, crown);
    const visor = new Mesh(new CircleGeometry(headR * 0.95, 8), material('#14181e', { roughness: 0.6, side: DoubleSide }));
    visor.rotation.x = -Math.PI / 2;
    visor.position.set(0, headR * 0.72, headR * 0.75);
    addMesh(head, visor);
  }

  const eyeWhiteMat = material('#f1e8da', { roughness: 0.6 });
  const pupilMat = material('#241d1a', { roughness: 0.6 });
  const makeEye = (x: number): Group => {
    const group = new Group();
    group.position.set(x, headR * 0.12, headR * 0.945);
    const white = new Mesh(new BoxGeometry(headR * 0.32, headR * 0.14, headR * 0.045), eyeWhiteMat);
    group.add(white);
    const pupil = new Mesh(new BoxGeometry(headR * 0.115, headR * 0.11, headR * 0.04), pupilMat);
    pupil.position.z = headR * 0.035;
    group.add(pupil);
    head.add(group);
    return group;
  };
  const eyeL = makeEye(-headR * 0.3);
  const eyeR = makeEye(headR * 0.3);

  const browGeo = new BoxGeometry(headR * 0.38, headR * 0.055, headR * 0.05);
  const browL = new Mesh(browGeo, hair);
  browL.position.set(-headR * 0.3, headR * 0.42, headR * 0.905);
  addMesh(head, browL, false);
  const browR = new Mesh(browGeo.clone(), hair);
  browR.position.set(headR * 0.3, headR * 0.42, headR * 0.905);
  addMesh(head, browR, false);

  const nose = new Mesh(new ConeGeometry(headR * 0.065, headR * 0.18, 3), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, headR * -0.04, headR * 0.98);
  addMesh(head, nose, false);

  const mouth = new Mesh(new BoxGeometry(headR * 0.38, headR * 0.06, headR * 0.05), mouthMat);
  mouth.position.set(0, -headR * 0.38, headR * 0.94);
  addMesh(head, mouth, false);

  if (spec.glasses) {
    const glassMat = material('#2a2a2a', { roughness: 0.4, metalness: 0.5 });
    const ringGeo = new TorusGeometry(headR * 0.24, headR * 0.024, 4, 8);
    const gl = new Mesh(ringGeo, glassMat);
    gl.position.set(-headR * 0.3, headR * 0.12, headR * 0.87);
    addMesh(head, gl, false);
    const gr = new Mesh(ringGeo.clone(), glassMat);
    gr.position.set(headR * 0.3, headR * 0.12, headR * 0.87);
    addMesh(head, gr, false);
    const bridge = new Mesh(new BoxGeometry(headR * 0.14, headR * 0.02, headR * 0.02), glassMat);
    bridge.position.set(0, headR * 0.12, headR * 0.87);
    addMesh(head, bridge, false);
  }

  if (spec.stubble) {
    const stubbleMesh = new Mesh(new BoxGeometry(headR * 0.56, headR * 0.12, headR * 0.1), material('#7d6350', { roughness: 1 }));
    stubbleMesh.position.set(0, -headR * 0.56, headR * 0.82);
    stubbleMesh.scale.z = 0.35;
    addMesh(head, stubbleMesh, false);
  }

  const makeArm = (side: -1 | 1): { shoulder: Group; elbow: Group; hand: Group } => {
    const shoulder = new Group();
    shoulder.position.set(shoulderX * side, torsoH * 0.87, 0);
    torso.add(shoulder);
    limb(shoulder, upperArm, H * 0.032, H * 0.028, coat);
    const elbow = new Group();
    elbow.position.y = -upperArm;
    shoulder.add(elbow);
    limb(elbow, foreArm, H * 0.028, H * 0.024, coat);
    const hand = new Group();
    hand.position.y = -foreArm;
    elbow.add(hand);
    const handMesh = new Mesh(new BoxGeometry(handSize * 0.9, handSize, handSize * 0.55), skin);
    handMesh.position.y = -handSize * 0.35;
    addMesh(hand, handMesh, false);
    return { shoulder, elbow, hand };
  };

  const armL = makeArm(-1);
  const armR = makeArm(1);

  const makeLeg = (side: -1 | 1): { hip: Group; knee: Group; ankle: Group } => {
    const hip = new Group();
    hip.position.set(H * 0.055 * side, 0, 0);
    hips.add(hip);
    limb(hip, thigh, H * 0.042, H * 0.034, pants, 6);
    const knee = new Group();
    knee.position.y = -thigh;
    hip.add(knee);
    limb(knee, shin, H * 0.033, H * 0.026, pants, 6);
    const ankle = new Group();
    ankle.position.y = -shin;
    knee.add(ankle);
    const foot = new Mesh(new BoxGeometry(H * 0.075, footH, H * 0.14), shoes);
    foot.position.set(0, -footH * 0.5, H * 0.035);
    addMesh(ankle, foot);
    return { hip, knee, ankle };
  };

  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  let coatFlap: Group | null = null;
  if (spec.id === 'etienne' || spec.id === 'renaud' || spec.id === 'rose' || spec.id === 'guard') {
    const coatLen = spec.id === 'etienne' ? H * 0.33 : H * 0.29;
    coatFlap = new Group();
    coatFlap.position.y = -H * 0.03;
    hips.add(coatFlap);
    const skirt = new Mesh(new CylinderGeometry(torsoW * 0.5, torsoW * 0.62, coatLen, 8, 1, true), material(spec.coat, { roughness: 0.92, side: DoubleSide }));
    skirt.position.y = -coatLen / 2;
    addMesh(coatFlap, skirt);
  }

  let backpack: Group | null = null;
  if (spec.id === 'mina') {
    backpack = new Group();
    box(backpack, H * 0.24, H * 0.26, H * 0.09, material('#2f4a78', { roughness: 0.85 }), 0, torsoH * 0.45, -torsoD * 0.62);
    box(backpack, H * 0.03, H * 0.22, H * 0.012, material('#2f4a78', {}), -torsoW * 0.24, torsoH * 0.62, torsoD * 0.52);
    box(backpack, H * 0.03, H * 0.22, H * 0.012, material('#2f4a78', {}), torsoW * 0.24, torsoH * 0.62, torsoD * 0.52);
    hips.add(backpack);
  }

  if (spec.satchel) {
    const bag = box(hips, H * 0.13, H * 0.11, H * 0.045, material('#4a3a2c', { roughness: 1 }), torsoW * 0.62, -H * 0.02, torsoD * 0.1);
    bag.rotation.z = -0.08;
    const strap = box(torso, H * 0.022, H * 0.36, H * 0.01, material('#3b2f25', { roughness: 1 }), torsoW * 0.18, torsoH * 0.5, torsoD * 0.55);
    strap.rotation.z = 0.45;
  }

  const blob = new Mesh(new CircleGeometry(H * 0.2, 12), new MeshBasicMaterial({ color: new Color('#000000'), transparent: true, opacity: 0.22, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  root.add(blob);

  const photo = new Group();
  const portrait = typeof document !== 'undefined' ? canvasTexture(160, 112, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#c9b79b');
    gradient.addColorStop(1, '#8f7c63');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5d4a3a';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.4, h * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.33, h * 0.55, w * 0.34, h * 0.45);
    ctx.fillStyle = '#3f3028';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.31, h * 0.2, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,210,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  }) : null;
  const photoCard = new Mesh(new PlaneGeometry(H * 0.11, H * 0.075), new MeshBasicMaterial({ map: portrait ?? undefined, color: portrait ? new Color('#ffffff') : new Color('#d9cbb2'), side: DoubleSide }));
  photo.add(photoCard);
  if (!portrait) {
    const photoFigure = new Mesh(new PlaneGeometry(H * 0.028, H * 0.05), new MeshBasicMaterial({ color: new Color('#6f5b4a'), side: DoubleSide }));
    photoFigure.position.set(-H * 0.012, -H * 0.005, 0.001);
    photo.add(photoFigure);
  }
  photo.position.set(0, -handSize * 0.8, 0.05);
  photo.rotation.set(-0.65, 0, 0.1);
  photo.visible = false;
  armR.hand.add(photo);

  const tape = new Group();
  const tapeBody = new Mesh(new BoxGeometry(H * 0.085, H * 0.055, H * 0.016), new MeshStandardMaterial({ color: new Color('#232323'), roughness: 0.6 }));
  tape.add(tapeBody);
  const tapeLabel = new Mesh(new PlaneGeometry(H * 0.062, H * 0.032), new MeshBasicMaterial({ color: new Color('#e2d6bd') }));
  tapeLabel.position.z = 0.009;
  tape.add(tapeLabel);
  tape.position.set(0, -handSize * 0.9, 0.03);
  tape.rotation.set(-0.3, 0, 0);
  tape.visible = false;
  armL.hand.add(tape);

  const paper = new Group();
  const paperMesh = new Mesh(new PlaneGeometry(H * 0.1, H * 0.14), new MeshBasicMaterial({ color: new Color('#e8e1d2'), side: DoubleSide }));
  paper.add(paperMesh);
  const paperLine = new Mesh(new PlaneGeometry(H * 0.06, H * 0.006), new MeshBasicMaterial({ color: new Color('#8a8375'), side: DoubleSide }));
  paperLine.position.set(0, H * 0.02, 0.001);
  paper.add(paperLine);
  paper.position.set(0, -handSize * 0.8, 0.045);
  paper.rotation.set(-0.55, 0, 0);
  paper.visible = false;
  armR.hand.add(paper);

  return {
    root,
    hips,
    torso,
    head,
    shoulderL: armL.shoulder,
    shoulderR: armR.shoulder,
    elbowL: armL.elbow,
    elbowR: armR.elbow,
    handL: armL.hand,
    handR: armR.hand,
    hipL: legL.hip,
    hipR: legR.hip,
    kneeL: legL.knee,
    kneeR: legR.knee,
    ankleL: legL.ankle,
    ankleR: legR.ankle,
    brows: [browL, browR],
    eyeGroups: [eyeL, eyeR],
    mouth,
    props: { photo, tape, paper },
    height: H,
    hipsBaseY: hipsY,
    sitDrop: Math.max(H * 0.1, hipsY - 0.45),
    coatFlap,
    backpack
  };
}


function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
