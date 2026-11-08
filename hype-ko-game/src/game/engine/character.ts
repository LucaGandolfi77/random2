import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  type AbstractMesh,
  type Scene
} from '@babylonjs/core';
import type { Appearance } from '../fighters/appearance';
import type { FighterDefinition } from '../../data/fighters/types';

export const BASE_HIP_Y = 0.88;

export interface RigNodes {
  root: TransformNode;
  pelvis: TransformNode;
  spine: TransformNode;
  chest: TransformNode;
  neck: TransformNode;
  head: TransformNode;
  shoulderL: TransformNode;
  shoulderR: TransformNode;
  elbowL: TransformNode;
  elbowR: TransformNode;
  handL: TransformNode;
  handR: TransformNode;
  hipL: TransformNode;
  hipR: TransformNode;
  kneeL: TransformNode;
  kneeR: TransformNode;
  footL: TransformNode;
  footR: TransformNode;
}

export interface CharacterRigOptions {
  glow?: boolean;
  outline?: boolean;
}

function color(hex: string): Color3 {
  try {
    return Color3.FromHexString(hex);
  } catch {
    return Color3.White();
  }
}

export class CharacterRig {
  readonly root: TransformNode;
  readonly nodes: RigNodes;
  readonly meshes: AbstractMesh[] = [];
  readonly materials: StandardMaterial[] = [];
  readonly def: FighterDefinition;
  readonly auraDisc: AbstractMesh;
  readonly shadowBlob: AbstractMesh;
  private readonly baseEmissive = new Map<StandardMaterial, Color3>();
  private readonly scene: Scene;
  private flashAmount = 0;

  constructor(scene: Scene, def: FighterDefinition, options: CharacterRigOptions = {}) {
    this.scene = scene;
    this.def = def;
    const appearance = def.appearance;
    const scale = 0.95 * appearance.height;
    const width = appearance.build;

    this.root = new TransformNode(`fighter_${def.id}`, scene);
    this.root.scaling.setAll(scale);
    this.root.rotation.y = Math.PI / 2 - 0.16;

    const skin = this.material('skin', appearance.skin);
    const hair = this.material('hair', appearance.hairColor);
    const primary = this.material('primary', appearance.primary);
    const secondary = this.material('secondary', appearance.secondary);
    const accent = this.material('accent', appearance.accent, appearance.pattern === 'glow' ? appearance.accent : undefined);
    const shoes = this.material('shoes', appearance.shoes);
    const eye = this.material('eye', appearance.eyeColor ?? '#ffffff', appearance.eyeColor ?? '#ffffff');
    const lip = this.material('lip', appearance.lipColor ?? appearance.skin);
    const dark = this.material('dark', '#15151c');
    const metal = this.material('metal', '#c9c9d4', '#555566');
    const glass = this.material('glass', '#0a0f1a', '#0a0f1a', 0.55);
    const glowMat = this.material('glow', appearance.aura, appearance.aura);

    const pelvis = new TransformNode('pelvis', scene);
    pelvis.parent = this.root;
    pelvis.position.set(0, BASE_HIP_Y, 0);
    this.box('pelvisMesh', 0.36 * width, 0.2, 0.24, primary, pelvis, 0, 0, 0);

    const spine = new TransformNode('spine', scene);
    spine.parent = pelvis;
    spine.position.set(0, 0.07, 0);
    this.box('torso', 0.44 * width, 0.44, 0.26, primary, spine, 0, 0.22, 0);

    const chest = new TransformNode('chest', scene);
    chest.parent = spine;
    chest.position.set(0, 0.44, 0);
    this.box('chestMesh', 0.46 * width, 0.2, 0.28, primary, chest, 0, 0.02, 0);

    const neck = new TransformNode('neck', scene);
    neck.parent = chest;
    neck.position.set(0, 0.12, 0);
    this.cylinder('neckMesh', 0.09, 0.1, skin, neck, 0, 0.05, 0);

    const head = new TransformNode('head', scene);
    head.parent = neck;
    head.position.set(0, 0.14, 0);
    const headMesh = this.sphere('headMesh', 0.4, skin, head, 0, 0.12, 0);
    headMesh.scaling.set(1, 1.04, 1);
    this.addFace(head, appearance, eye, lip, dark);
    this.addHair(head, appearance, hair, accent, primary, glowMat);

    const shoulderL = new TransformNode('shoulderL', scene);
    shoulderL.parent = chest;
    shoulderL.position.set(-0.27 * width, 0.02, 0);
    const shoulderR = new TransformNode('shoulderR', scene);
    shoulderR.parent = chest;
    shoulderR.position.set(0.27 * width, 0.02, 0);

    const armL = this.buildArm(shoulderL, skin, primary, secondary, accent, shoes, 'L', appearance, glowMat);
    const armR = this.buildArm(shoulderR, skin, primary, secondary, accent, shoes, 'R', appearance, glowMat);

    const elbowL = armL.elbow;
    const elbowR = armR.elbow;
    const handL = armL.hand;
    const handR = armR.hand;

    const hipL = new TransformNode('hipL', scene);
    hipL.parent = pelvis;
    hipL.position.set(-0.13 * width, -0.05, 0);
    const hipR = new TransformNode('hipR', scene);
    hipR.parent = pelvis;
    hipR.position.set(0.13 * width, -0.05, 0);

    const legL = this.buildLeg(hipL, skin, primary, secondary, accent, shoes, 'L', appearance, glowMat);
    const legR = this.buildLeg(hipR, skin, primary, secondary, accent, shoes, 'R', appearance, glowMat);

    const kneeL = legL.knee;
    const kneeR = legR.knee;
    const footL = legL.foot;
    const footR = legR.foot;

    this.addOutfit(pelvis, spine, chest, head, handL, handR, footL, footR, appearance, primary, secondary, accent, shoes, hair, glowMat, dark, metal, glass);
    this.addAccessories(head, chest, handL, handR, pelvis, appearance, primary, secondary, accent, shoes, hair, glowMat, metal, dark);
    this.addPattern(spine, chest, pelvis, appearance, accent, secondary, glowMat);

    this.auraDisc = this.disc('auraDisc', 0.95, glowMat, this.root, 0, 0.012, 0);
    const auraMat = this.auraDisc.material as StandardMaterial;
    auraMat.alpha = 0.2;
    auraMat.emissiveColor = color(appearance.aura);
    auraMat.disableLighting = true;
    auraMat.backFaceCulling = false;

    this.shadowBlob = this.disc('shadowBlob', 0.8, this.material('shadow', '#000000', undefined, 0.34), this.root, 0, 0.006, 0);
    (this.shadowBlob.material as StandardMaterial).disableLighting = true;
    (this.shadowBlob.material as StandardMaterial).backFaceCulling = false;
    this.shadowBlob.isPickable = false;

    for (const mesh of this.meshes) {
      mesh.receiveShadows = true;
      mesh.isPickable = false;
    }

    if (options.glow) {
      for (const material of this.materials) {
        if (material.emissiveColor.r + material.emissiveColor.g + material.emissiveColor.b > 0.1) {
          material.emissiveColor.scaleInPlace(1.35);
        }
      }
    }

    if (options.outline) {
      for (const mesh of this.meshes) {
        mesh.renderOutline = true;
        mesh.outlineWidth = 0.012;
        mesh.outlineColor = color('#08080c');
      }
    }

    this.nodes = {
      root: this.root,
      pelvis,
      spine,
      chest,
      neck,
      head,
      shoulderL,
      shoulderR,
      elbowL,
      elbowR,
      handL,
      handR,
      hipL,
      hipR,
      kneeL,
      kneeR,
      footL,
      footR
    };
  }

  private material(name: string, hex: string, emissive?: string, alpha = 1): StandardMaterial {
    const mat = new StandardMaterial(`${this.def.id}_${name}_${this.materials.length}`, this.scene);
    mat.diffuseColor = color(hex);
    mat.specularColor = color('#101014');
    mat.specularPower = 24;
    if (emissive) {
      mat.emissiveColor = color(emissive);
      mat.emissiveColor.scaleInPlace(0.55);
    }
    if (alpha < 1) {
      mat.alpha = alpha;
      mat.backFaceCulling = false;
    }
    this.materials.push(mat);
    this.baseEmissive.set(mat, mat.emissiveColor.clone());
    return mat;
  }

  private register(mesh: AbstractMesh): AbstractMesh {
    this.meshes.push(mesh);
    return mesh;
  }

  private box(
    name: string,
    width: number,
    height: number,
    depth: number,
    mat: StandardMaterial,
    parent: TransformNode,
    x: number,
    y: number,
    z: number
  ) {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    return this.register(mesh);
  }

  private sphere(
    name: string,
    diameter: number,
    mat: StandardMaterial,
    parent: TransformNode,
    x: number,
    y: number,
    z: number,
    segments = 12
  ) {
    const mesh = MeshBuilder.CreateSphere(name, { diameter, segments }, this.scene);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    return this.register(mesh);
  }

  private cylinder(
    name: string,
    diameter: number,
    height: number,
    mat: StandardMaterial,
    parent: TransformNode,
    x: number,
    y: number,
    z: number,
    diameterTop?: number
  ) {
    const mesh = MeshBuilder.CreateCylinder(
      name,
      { diameter, height, diameterTop: diameterTop ?? diameter, tessellation: 12 },
      this.scene
    );
    mesh.material = mat;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    return this.register(mesh);
  }

  private disc(
    name: string,
    diameter: number,
    mat: StandardMaterial,
    parent: TransformNode,
    x: number,
    y: number,
    z: number
  ) {
    const mesh = MeshBuilder.CreateDisc(name, { radius: diameter / 2, tessellation: 32 }, this.scene);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.rotation.x = Math.PI / 2;
    return this.register(mesh);
  }

  private buildArm(
    shoulder: TransformNode,
    skin: StandardMaterial,
    primary: StandardMaterial,
    secondary: StandardMaterial,
    accent: StandardMaterial,
    shoes: StandardMaterial,
    side: 'L' | 'R',
    appearance: Appearance,
    glowMat: StandardMaterial
  ): { elbow: TransformNode; hand: TransformNode } {
    const upperMat = appearance.outfitStyle === 'tracksuit' || appearance.outfitStyle === 'jersey' ? primary : skin;
    this.box(`upperArm${side}`, 0.11, 0.34, 0.11, upperMat, shoulder, 0, -0.17, 0);
    const elbow = new TransformNode(`elbow${side}`, this.scene);
    elbow.parent = shoulder;
    elbow.position.set(0, -0.34, 0);
    this.box(`forearm${side}`, 0.1, 0.3, 0.1, appearance.accessories.includes('gloves') ? accent : skin, elbow, 0, -0.15, 0);
    const hand = new TransformNode(`hand${side}`, this.scene);
    hand.parent = elbow;
    hand.position.set(0, -0.3, 0);
    this.box(`handMesh${side}`, 0.12, 0.12, 0.1, appearance.accessories.includes('gloves') ? accent : skin, hand, 0, -0.04, 0);
    if (appearance.outfitStyle === 'jacket' || appearance.outfitStyle === 'coat') {
      this.box(`sleeve${side}`, 0.14, 0.2, 0.14, secondary, shoulder, 0, -0.14, 0);
    }
    if (appearance.outfitStyle === 'tracksuit') {
      this.box(`stripeArm${side}`, 0.02, 0.3, 0.12, accent, shoulder, side === 'L' ? -0.06 : 0.06, -0.17, 0);
    }
    if (appearance.outfitStyle === 'armor') {
      this.sphere(`shoulderPad${side}`, 0.24, secondary, shoulder, 0, -0.02, 0);
    }
    if (appearance.accessories.includes('armband')) {
      this.cylinder(`armband${side}`, 0.14, 0.06, accent, shoulder, 0, -0.12, 0);
    }
    if (appearance.accessories.includes('gloves')) {
      this.cylinder(`wristband${side}`, 0.13, 0.06, shoes, elbow, 0, -0.27, 0);
    }
    void glowMat;
    return { elbow, hand };
  }

  private buildLeg(
    hip: TransformNode,
    skin: StandardMaterial,
    primary: StandardMaterial,
    secondary: StandardMaterial,
    accent: StandardMaterial,
    shoes: StandardMaterial,
    side: 'L' | 'R',
    appearance: Appearance,
    glowMat: StandardMaterial
  ): { knee: TransformNode; foot: TransformNode } {
    const pantMat =
      appearance.outfitStyle === 'tracksuit' || appearance.outfitStyle === 'jersey' || appearance.outfitStyle === 'suit'
        ? primary
        : skin;
    this.box(`thigh${side}`, 0.15, 0.4, 0.15, pantMat, hip, 0, -0.2, 0);
    const knee = new TransformNode(`knee${side}`, this.scene);
    knee.parent = hip;
    knee.position.set(0, -0.4, 0);
    this.box(`shin${side}`, 0.13, 0.38, 0.13, pantMat, knee, 0, -0.19, 0);
    const foot = new TransformNode(`foot${side}`, this.scene);
    foot.parent = knee;
    foot.position.set(0, -0.38, 0);
    this.box(`footMesh${side}`, 0.16, 0.1, 0.26, shoes, foot, 0, 0, 0.06);
    if (appearance.outfitStyle === 'tracksuit') {
      this.box(`stripeLeg${side}`, 0.02, 0.36, 0.16, accent, hip, side === 'L' ? -0.08 : 0.08, -0.2, 0);
    }
    if (appearance.accessories.includes('boots')) {
      this.box(`boot${side}`, 0.17, 0.24, 0.18, shoes, knee, 0, -0.29, 0);
    }
    if (appearance.outfitStyle === 'armor') {
      this.box(`shinPlate${side}`, 0.16, 0.2, 0.16, secondary, knee, 0, -0.15, 0.02);
    }
    void glowMat;
    return { knee, foot };
  }

  private addFace(
    head: TransformNode,
    appearance: Appearance,
    eye: StandardMaterial,
    lip: StandardMaterial,
    dark: StandardMaterial
  ): void {
    const eyeY = 0.03;
    const eyeZ = 0.18;
    for (const side of [-1, 1]) {
      this.box('eyeWhite', 0.075, 0.045, 0.02, dark, head, side * 0.075, eyeY, eyeZ);
      this.box('pupil', 0.035, 0.03, 0.012, eye, head, side * 0.075, eyeY, eyeZ + 0.012);
      const brow = this.box('brow', 0.09, 0.018, 0.02, dark, head, side * 0.08, eyeY + 0.06, eyeZ - 0.005);
      brow.rotation.z = side * (appearance.face === 'fierce' || appearance.face === 'dark' ? 0.28 : 0.12);
    }
    this.box('nose', 0.035, 0.04, 0.04, lip, head, 0, -0.015, eyeZ + 0.015);
    const mouth = this.box('mouth', 0.1, 0.022, 0.02, lip, head, 0, -0.095, eyeZ);
    if (appearance.face === 'goofy' || appearance.face === 'sweet' || appearance.face === 'glam') {
      mouth.rotation.z = appearance.face === 'goofy' ? 0.12 : -0.05;
    }
    if (appearance.face === 'robot') {
      this.box('facePlate', 0.26, 0.1, 0.02, eye, head, 0, 0.03, eyeZ + 0.005);
    }
    if (appearance.face === 'dark') {
      this.box('eyeShadow', 0.19, 0.07, 0.015, dark, head, 0, eyeY + 0.03, eyeZ + 0.002);
    }
    if (appearance.face === 'glam') {
      this.box('glitterL', 0.02, 0.02, 0.01, eye, head, -0.12, -0.03, eyeZ + 0.01);
      this.box('glitterR', 0.02, 0.02, 0.01, eye, head, 0.12, -0.03, eyeZ + 0.01);
    }
  }

  private addHair(
    head: TransformNode,
    appearance: Appearance,
    hair: StandardMaterial,
    accent: StandardMaterial,
    primary: StandardMaterial,
    glowMat: StandardMaterial
  ): void {
    const style = appearance.hairStyle;
    if (style === 'none') return;
    if (style === 'helmet') {
      const shell = this.sphere('helmet', 0.5, primary, head, 0, 0.13, 0);
      shell.scaling.set(1, 1.05, 1);
      this.box('helmetVisor', 0.32, 0.1, 0.06, accent, head, 0, 0.04, 0.2);
      return;
    }
    if (style === 'cowboy') {
      this.cylinder('hatBrim', 0.62, 0.04, primary, head, 0, 0.27, 0);
      this.cylinder('hatCrown', 0.34, 0.22, primary, head, 0, 0.38, 0, 0.28);
      this.cylinder('hatBand', 0.35, 0.05, accent, head, 0, 0.29, 0);
      return;
    }
    if (style === 'crown') {
      this.cylinder('crownBase', 0.36, 0.1, accent, head, 0, 0.3, 0, 0.32);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spike = MeshBuilder.CreateCylinder('crownSpike', { diameterTop: 0, diameterBottom: 0.07, height: 0.16, tessellation: 8 }, this.scene);
        spike.material = accent;
        spike.parent = head;
        spike.position.set(Math.sin(angle) * 0.14, 0.4, Math.cos(angle) * 0.14);
        this.register(spike);
      }
      return;
    }
    if (style === 'hood') {
      this.box('hoodBack', 0.52, 0.46, 0.24, primary, head, 0, 0.08, -0.16);
      this.box('hoodSideL', 0.1, 0.4, 0.28, primary, head, -0.2, 0.08, -0.04);
      this.box('hoodSideR', 0.1, 0.4, 0.28, primary, head, 0.2, 0.08, -0.04);
      return;
    }

    const cap = this.sphere('hairCap', 0.44, hair, head, 0, 0.15, -0.01);
    cap.scaling.set(1.02, 0.78, 1.02);
    if (style === 'buzz') cap.scaling.set(1, 0.45, 1);
    if (style === 'short') cap.scaling.set(1.03, 0.62, 1.03);
    if (style === 'long' || style === 'wavy') {
      const back = this.box('hairBack', 0.36, 0.55, 0.16, hair, head, 0, -0.12, -0.17);
      back.rotation.x = -0.08;
      if (style === 'wavy') {
        this.box('hairWaveL', 0.12, 0.4, 0.14, hair, head, -0.19, -0.1, -0.08);
        this.box('hairWaveR', 0.12, 0.4, 0.14, hair, head, 0.19, -0.1, -0.08);
      }
    }
    if (style === 'ponytail' || style === 'bun') {
      const pony = this.cylinder('ponytail', 0.13, 0.4, hair, head, 0, -0.02, -0.24, 0.06);
      pony.rotation.x = -0.5;
      if (style === 'bun') {
        pony.dispose();
        this.sphere('bun', 0.24, hair, head, 0, 0.2, -0.22);
      }
    }
    if (style === 'curly' || style === 'braids') {
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        this.sphere(
          style === 'braids' ? 'braid' : 'curl',
          style === 'braids' ? 0.14 : 0.2,
          hair,
          head,
          Math.sin(angle) * 0.19,
          0.18 + Math.cos(angle) * 0.04,
          Math.cos(angle) * 0.16
        );
      }
      if (style === 'braids') {
        this.cylinder('braidL', 0.08, 0.42, hair, head, -0.18, -0.16, -0.08);
        this.cylinder('braidR', 0.08, 0.42, hair, head, 0.18, -0.16, -0.08);
      }
    }
    if (style === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        const spike = MeshBuilder.CreateCylinder('mohawk', { diameterTop: 0, diameterBottom: 0.12, height: 0.22, tessellation: 6 }, this.scene);
        spike.material = accent;
        spike.parent = head;
        spike.position.set(0, 0.28, 0.12 - i * 0.075);
        this.register(spike);
      }
    }
    void glowMat;
  }

  private addOutfit(
    pelvis: TransformNode,
    spine: TransformNode,
    chest: TransformNode,
    head: TransformNode,
    handL: TransformNode,
    handR: TransformNode,
    footL: TransformNode,
    footR: TransformNode,
    appearance: Appearance,
    primary: StandardMaterial,
    secondary: StandardMaterial,
    accent: StandardMaterial,
    shoes: StandardMaterial,
    hair: StandardMaterial,
    glowMat: StandardMaterial,
    dark: StandardMaterial,
    metal: StandardMaterial,
    glass: StandardMaterial
  ): void {
    const style = appearance.outfitStyle;
    if (style === 'dress' || style === 'gown') {
      const height = style === 'gown' ? 0.95 : 0.5;
      const skirt = this.cylinder(
        'skirt',
        style === 'gown' ? 0.78 : 0.64,
        height,
        primary,
        pelvis,
        0,
        style === 'gown' ? -0.44 : -0.18,
        0,
        style === 'gown' ? 0.42 : 0.44
      );
      skirt.material = primary;
      this.cylinder('skirtTrim', style === 'gown' ? 0.79 : 0.65, 0.05, accent, pelvis, 0, style === 'gown' ? -0.9 : -0.4, 0);
    }
    if (style === 'corset') {
      this.box('corset', 0.42, 0.34, 0.28, secondary, spine, 0, 0.2, 0);
      this.box('corsetLace', 0.04, 0.3, 0.02, accent, spine, 0, 0.2, 0.15);
    }
    if (style === 'jacket' || style === 'coat') {
      this.box('jacketL', 0.16, 0.44, 0.06, secondary, spine, -0.17, 0.22, 0.14);
      this.box('jacketR', 0.16, 0.44, 0.06, secondary, spine, 0.17, 0.22, 0.14);
      this.box('collarL', 0.16, 0.08, 0.12, secondary, chest, -0.14, 0.08, 0.08);
      this.box('collarR', 0.16, 0.08, 0.12, secondary, chest, 0.14, 0.08, 0.08);
      if (style === 'coat') {
        const tail = this.box('coatTail', 0.46, 0.6, 0.05, secondary, pelvis, 0, -0.3, -0.18);
        tail.rotation.x = 0.08;
      }
    }
    if (style === 'hoodie') {
      this.box('pocket', 0.3, 0.12, 0.04, secondary, spine, 0, 0.08, 0.15);
      this.box('hoodCollar', 0.36, 0.12, 0.2, primary, chest, 0, 0.08, -0.06);
      this.cylinder('drawstringL', 0.02, 0.18, accent, chest, -0.08, 0.0, 0.14);
      this.cylinder('drawstringR', 0.02, 0.18, accent, chest, 0.08, 0.0, 0.14);
    }
    if (style === 'suit') {
      this.box('lapelL', 0.1, 0.3, 0.03, secondary, spine, -0.12, 0.28, 0.14);
      this.box('lapelR', 0.1, 0.3, 0.03, secondary, spine, 0.12, 0.28, 0.14);
      this.box('tie', 0.07, 0.3, 0.03, accent, spine, 0, 0.24, 0.16);
      this.box('belt', 0.46, 0.06, 0.28, dark, pelvis, 0, 0.02, 0);
      this.box('buckle', 0.08, 0.06, 0.03, metal, pelvis, 0, 0.02, 0.15);
    }
    if (style === 'apron') {
      this.box('apron', 0.36, 0.6, 0.04, secondary, spine, 0, 0.05, 0.16);
      this.box('apronStrap', 0.04, 0.4, 0.02, accent, chest, 0, 0.02, 0.15);
    }
    if (style === 'jersey') {
      this.box('jerseyStripe', 0.46, 0.08, 0.28, secondary, spine, 0, 0.34, 0);
      this.box('number', 0.2, 0.18, 0.02, accent, spine, 0, 0.2, 0.15);
      this.box('belt', 0.46, 0.06, 0.28, secondary, pelvis, 0, 0.02, 0);
    }
    if (style === 'tracksuit') {
      this.box('zipper', 0.03, 0.42, 0.02, accent, spine, 0, 0.22, 0.15);
      this.box('tracksuitStripe', 0.46, 0.05, 0.28, accent, chest, 0, 0.06, 0);
    }
    if (style === 'armor') {
      this.box('chestPlate', 0.48, 0.32, 0.06, secondary, chest, 0, 0.0, 0.14);
      this.box('armorBelt', 0.48, 0.08, 0.3, metal, pelvis, 0, 0.02, 0);
    }
    if (style === 'robe') {
      this.cylinder('robe', 0.72, 1.0, primary, pelvis, 0, -0.45, 0, 0.42);
      this.box('robeSash', 0.5, 0.08, 0.3, accent, spine, 0, 0.12, 0.02);
    }
    if (style === 'tee') {
      this.box('teeTrim', 0.46, 0.06, 0.28, secondary, chest, 0, 0.08, 0);
    }
    if (appearance.accessories.includes('cape')) {
      const cape = this.box('cape', 0.72, 0.9, 0.04, secondary, chest, 0, -0.2, -0.18);
      cape.rotation.x = -0.12;
      (cape.material as StandardMaterial).backFaceCulling = false;
    }
    if (appearance.accessories.includes('scarf')) {
      this.cylinder('scarf', 0.34, 0.1, accent, chest, 0, 0.08, 0);
      const tail = this.box('scarfTail', 0.1, 0.4, 0.04, accent, chest, 0.12, -0.14, -0.12);
      tail.rotation.z = 0.15;
    }
    if (appearance.accessories.includes('wings')) {
      for (const side of [-1, 1]) {
        const wing = this.box('wing', 0.5, 0.6, 0.03, accent, chest, side * 0.32, 0.0, -0.18);
        wing.rotation.z = side * -0.35;
        wing.rotation.y = side * 0.4;
        (wing.material as StandardMaterial).alpha = 0.85;
      }
    }
    if (appearance.accessories.includes('tail')) {
      let parent: TransformNode = pelvis;
      for (let i = 0; i < 3; i++) {
        const seg = this.cylinder('tailSeg', 0.09 - i * 0.02, 0.22, accent, parent, 0, -0.05, -0.15, 0.07);
        seg.rotation.x = -0.6;
        parent = seg;
      }
    }
    if (appearance.accessories.includes('sash')) {
      const sash = this.box('sash', 0.5, 0.09, 0.3, accent, spine, 0, 0.24, 0.02);
      sash.rotation.z = 0.55;
    }
    if (appearance.accessories.includes('bag')) {
      this.box('bag', 0.22, 0.18, 0.1, secondary, pelvis, 0.26, -0.1, 0.02);
      this.box('bagStrap', 0.03, 0.6, 0.03, dark, chest, 0.16, 0.02, 0.1).rotation.z = -0.4;
    }
    if (appearance.accessories.includes('camera')) {
      this.box('camera', 0.2, 0.14, 0.16, dark, chest, -0.2, 0.16, 0.16);
      this.cylinder('cameraLens', 0.1, 0.08, glass, chest, -0.2, 0.16, 0.26);
    }
    if (appearance.accessories.includes('guitar')) {
      this.box('guitarBody', 0.3, 0.36, 0.08, primary, chest, -0.28, -0.05, -0.1);
      this.box('guitarNeck', 0.07, 0.55, 0.06, dark, chest, -0.28, 0.35, -0.1);
    }
    if (appearance.accessories.includes('ladle')) {
      this.cylinder('ladleHandle', 0.03, 0.4, metal, handR, 0, -0.1, 0.08);
      this.sphere('ladleBowl', 0.16, metal, handR, 0, -0.32, 0.08);
    }
    if (appearance.accessories.includes('flag') || appearance.accessories.includes('checkerFlag')) {
      this.cylinder('flagPole', 0.025, 0.9, metal, handR, 0, -0.05, 0.08);
      const flagMat = appearance.accessories.includes('checkerFlag') ? primary : accent;
      this.box('flag', 0.34, 0.24, 0.02, flagMat, handR, 0.18, 0.3, 0.08);
      if (appearance.accessories.includes('checkerFlag')) {
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 3; j++) {
            if ((i + j) % 2 === 0) {
              this.box('checker', 0.085, 0.08, 0.025, dark, handR, 0.18 - 0.127 + i * 0.085, 0.3 - 0.08 + j * 0.08, 0.08);
            }
          }
        }
      }
    }
    if (appearance.accessories.includes('stopwatch')) {
      this.cylinder('stopwatch', 0.1, 0.03, metal, handR, 0, -0.08, 0.1);
      this.box('stopwatchFace', 0.07, 0.07, 0.01, accent, handR, 0, -0.08, 0.12);
    }
    if (appearance.accessories.includes('phone')) {
      this.box('phone', 0.1, 0.18, 0.02, dark, handR, 0, -0.06, 0.1);
      this.box('phoneScreen', 0.08, 0.14, 0.01, glowMat, handR, 0, -0.06, 0.115);
    }
    if (appearance.accessories.includes('mic')) {
      this.cylinder('micHandle', 0.035, 0.22, dark, handR, 0, -0.08, 0.1);
      this.sphere('micHead', 0.11, metal, handR, 0, 0.05, 0.1);
    }
    if (appearance.accessories.includes('gloves')) {
      void handL;
      void handR;
    }
    if (appearance.accessories.includes('boots')) {
      void footL;
      void footR;
      void shoes;
      void hair;
    }
  }

  private addAccessories(
    head: TransformNode,
    chest: TransformNode,
    handL: TransformNode,
    handR: TransformNode,
    pelvis: TransformNode,
    appearance: Appearance,
    primary: StandardMaterial,
    secondary: StandardMaterial,
    accent: StandardMaterial,
    shoes: StandardMaterial,
    hair: StandardMaterial,
    glowMat: StandardMaterial,
    metal: StandardMaterial,
    dark: StandardMaterial
  ): void {
    const accessories = appearance.accessories;
    if (accessories.includes('headphones')) {
      this.box('headband', 0.5, 0.06, 0.08, secondary, head, 0, 0.34, 0);
      this.cylinder('headphoneL', 0.16, 0.08, accent, head, -0.23, 0.08, 0);
      this.cylinder('headphoneR', 0.16, 0.08, accent, head, 0.23, 0.08, 0);
      this.cylinder('headphoneL2', 0.16, 0.08, accent, head, -0.23, 0.08, 0).rotation.z = Math.PI / 2;
      this.cylinder('headphoneR2', 0.16, 0.08, accent, head, 0.23, 0.08, 0).rotation.z = Math.PI / 2;
    }
    if (accessories.includes('sunglasses')) {
      this.box('sunglasses', 0.3, 0.09, 0.04, dark, head, 0, 0.04, 0.2);
      this.box('sunglassesLensL', 0.12, 0.07, 0.01, glowMat, head, -0.08, 0.04, 0.225);
      this.box('sunglassesLensR', 0.12, 0.07, 0.01, glowMat, head, 0.08, 0.04, 0.225);
    }
    if (accessories.includes('visor')) {
      this.box('visor', 0.34, 0.08, 0.04, accent, head, 0, 0.04, 0.21);
    }
    if (accessories.includes('mask')) {
      this.box('mask', 0.28, 0.14, 0.04, secondary, head, 0, -0.05, 0.19);
    }
    if (accessories.includes('cap')) {
      this.cylinder('cap', 0.42, 0.1, secondary, head, 0, 0.28, 0);
      this.box('capBrim', 0.36, 0.04, 0.2, secondary, head, 0, 0.24, 0.16);
    }
    if (accessories.includes('crown')) {
      this.cylinder('crownBand', 0.34, 0.08, accent, head, 0, 0.3, 0, 0.3);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const spike = MeshBuilder.CreateCylinder('crownSpike', { diameterTop: 0, diameterBottom: 0.06, height: 0.12, tessellation: 6 }, this.scene);
        spike.material = accent;
        spike.parent = head;
        spike.position.set(Math.sin(angle) * 0.12, 0.38, Math.cos(angle) * 0.12);
        this.register(spike);
      }
    }
    if (accessories.includes('tiara')) {
      this.cylinder('tiara', 0.3, 0.04, accent, head, 0, 0.28, 0, 0.28);
    }
    if (accessories.includes('halo')) {
      const halo = MeshBuilder.CreateTorus('halo', { diameter: 0.36, thickness: 0.03, tessellation: 24 }, this.scene);
      halo.material = accent;
      halo.parent = head;
      halo.position.set(0, 0.5, 0);
      halo.rotation.x = Math.PI / 2;
      this.register(halo);
    }
    if (accessories.includes('horns')) {
      for (const side of [-1, 1]) {
        const horn = MeshBuilder.CreateCylinder('horn', { diameterTop: 0, diameterBottom: 0.09, height: 0.24, tessellation: 8 }, this.scene);
        horn.material = accent;
        horn.parent = head;
        horn.position.set(side * 0.14, 0.34, 0.02);
        horn.rotation.z = side * -0.35;
        this.register(horn);
      }
    }
    if (accessories.includes('earpiece')) {
      this.box('earpiece', 0.05, 0.08, 0.04, accent, head, 0.21, 0.04, 0.02);
    }
    if (accessories.includes('choker')) {
      this.cylinder('choker', 0.22, 0.04, accent, chest, 0, 0.11, 0);
    }
    if (accessories.includes('chain')) {
      const chain = MeshBuilder.CreateTorus('chain', { diameter: 0.3, thickness: 0.025, tessellation: 16 }, this.scene);
      chain.material = metal;
      chain.parent = chest;
      chain.position.set(0, 0.04, 0.02);
      chain.rotation.x = Math.PI / 2;
      this.register(chain);
    }
    if (accessories.includes('cowboyHat')) {
      this.cylinder('cowboyBrim', 0.62, 0.04, primary, head, 0, 0.28, 0);
      this.cylinder('cowboyCrown', 0.34, 0.2, primary, head, 0, 0.38, 0, 0.28);
    }
    if (accessories.includes('ringLight')) {
      const ring = MeshBuilder.CreateTorus('ringLight', { diameter: 0.62, thickness: 0.045, tessellation: 32 }, this.scene);
      ring.material = glowMat;
      ring.parent = head;
      ring.position.set(0, 0.12, -0.28);
      ring.rotation.x = Math.PI / 2;
      this.register(ring);
    }
    if (accessories.includes('camera')) {
      this.box('shoulderCam', 0.18, 0.12, 0.14, dark, chest, 0.28, 0.22, 0.1);
    }
    if (accessories.includes('helmet')) {
      const shell = this.sphere('helmetShell', 0.5, primary, head, 0, 0.13, 0);
      shell.scaling.set(1, 1.05, 1);
      this.box('helmetVisor2', 0.32, 0.1, 0.06, accent, head, 0, 0.04, 0.2);
    }
    void handL;
    void pelvis;
    void secondary;
    void shoes;
    void hair;
  }

  private addPattern(
    spine: TransformNode,
    chest: TransformNode,
    pelvis: TransformNode,
    appearance: Appearance,
    accent: StandardMaterial,
    secondary: StandardMaterial,
    glowMat: StandardMaterial
  ): void {
    const pattern = appearance.pattern ?? 'solid';
    if (pattern === 'stripes') {
      for (let i = 0; i < 3; i++) {
        this.box('stripe', 0.4, 0.035, 0.02, accent, spine, 0, 0.1 + i * 0.11, 0.14);
      }
    }
    if (pattern === 'glow') {
      this.box('glowLine', 0.4, 0.03, 0.02, glowMat, spine, 0, 0.3, 0.14);
      this.box('glowLine2', 0.4, 0.03, 0.02, glowMat, spine, 0, 0.14, 0.14);
    }
    if (pattern === 'glitter') {
      for (let i = 0; i < 9; i++) {
        this.box('glitter', 0.025, 0.025, 0.012, glowMat, spine, -0.15 + (i % 3) * 0.15, 0.08 + Math.floor(i / 3) * 0.12, 0.145);
      }
    }
    if (pattern === 'camo') {
      for (let i = 0; i < 5; i++) {
        this.box('camo', 0.12, 0.08, 0.015, i % 2 === 0 ? secondary : accent, spine, -0.15 + (i % 3) * 0.14, 0.1 + Math.floor(i / 3) * 0.14, 0.145);
      }
    }
    if (pattern === 'checker') {
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
          this.box('checkerPatch', 0.1, 0.08, 0.015, accent, spine, -0.15 + (i % 3) * 0.15, 0.1 + Math.floor(i / 3) * 0.13, 0.145);
        }
      }
    }
    if (pattern === 'stars') {
      for (let i = 0; i < 5; i++) {
        const star = this.box('star', 0.06, 0.06, 0.012, glowMat, spine, -0.15 + (i % 3) * 0.15, 0.08 + Math.floor(i / 3) * 0.16, 0.145);
        star.rotation.z = Math.PI / 4;
      }
    }
    void chest;
    void pelvis;
  }

  setFlash(amount: number): void {
    const clamped = Math.max(0, Math.min(1, amount));
    if (Math.abs(clamped - this.flashAmount) < 0.01) return;
    this.flashAmount = clamped;
    for (const mat of this.materials) {
      const base = this.baseEmissive.get(mat) ?? Color3.Black();
      if (clamped <= 0) {
        mat.emissiveColor.copyFrom(base);
      } else {
        mat.emissiveColor.set(
          base.r + clamped * 1.6,
          base.g + clamped * 1.6,
          base.b + clamped * 1.6
        );
      }
    }
  }

  setAura(intensity: number): void {
    const mat = this.auraDisc.material as StandardMaterial;
    mat.alpha = 0.08 + Math.max(0, Math.min(1, intensity)) * 0.35;
    this.auraDisc.scaling.setAll(1 + intensity * 0.15);
  }

  setVisible(visible: boolean): void {
    this.root.setEnabled(visible);
    this.shadowBlob.setEnabled(visible);
  }

  setFacing(facing: 1 | -1): void {
    const target = facing === 1 ? Math.PI / 2 - 0.16 : -Math.PI / 2 + 0.16;
    this.root.rotation.y += (target - this.root.rotation.y) * 0.35;
  }

  setPosition(x: number, y: number): void {
    this.root.position.set(x, y, 0);
  }

  setShadow(x: number, groundY: number, scale: number): void {
    this.shadowBlob.parent = null;
    this.shadowBlob.position.set(x, groundY + 0.006, 0);
    this.shadowBlob.scaling.setAll(Math.max(0.35, 1 - scale * 0.2));
  }

  dispose(): void {
    this.root.dispose(false, true);
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    for (const material of this.materials) {
      material.dispose();
    }
    this.shadowBlob.dispose();
    void this.scene;
  }
}
