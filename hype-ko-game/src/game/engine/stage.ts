import {
  Color3,
  DirectionalLight,
  DynamicTexture,
  HemisphericLight,
  MeshBuilder,
  PointLight,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type InstancedMesh,
  type Mesh
} from '@babylonjs/core';
import type { StageDefinition, StageProp } from '../../data/stages';
import type { RenderQuality } from './backend';

function color(hex: string): Color3 {
  try {
    return Color3.FromHexString(hex);
  } catch {
    return Color3.White();
  }
}

export class StageRig {
  readonly root: TransformNode;
  readonly shadowGenerator: ShadowGenerator | null;
  private readonly scene: Scene;
  private readonly def: StageDefinition;
  private readonly quality: RenderQuality;
  private readonly materials: StandardMaterial[] = [];
  private readonly crowdHeads: InstancedMesh[] = [];
  private readonly crowdBodies: InstancedMesh[] = [];
  private readonly crowdBaseY: number[] = [];
  private readonly neonBase = new Map<StandardMaterial, Color3>();
  private readonly animated: { mesh: AbstractMesh; kind: string; phase: number; baseY: number }[] = [];
  private readonly neonMaterials: StandardMaterial[] = [];
  private readonly screens: StandardMaterial[] = [];
  private readonly discoBalls: Mesh[] = [];
  private readonly lights: PointLight[] = [];
  private elapsed = 0;

  constructor(scene: Scene, def: StageDefinition, quality: RenderQuality) {
    this.scene = scene;
    this.def = def;
    this.quality = quality;
    this.root = new TransformNode(`stage_${def.id}`, scene);

    scene.clearColor = color(def.palette.skyBottom).toColor4(1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.012;
    scene.fogColor = color(def.palette.fog);

    const hemi = new HemisphericLight('stageHemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.65;
    hemi.diffuse = color(def.palette.ambient);
    hemi.groundColor = color(def.palette.wall);

    const sun = new DirectionalLight('stageSun', new Vector3(-0.35, -1, 0.45), scene);
    sun.position = new Vector3(6, 10, -6);
    sun.diffuse = color(def.palette.sun);
    sun.intensity = 1.1;

    this.shadowGenerator = quality.shadows ? new ShadowGenerator(1024, sun) : null;
    if (this.shadowGenerator) {
      this.shadowGenerator.useBlurExponentialShadowMap = true;
      this.shadowGenerator.blurKernel = 16;
      this.shadowGenerator.darkness = 0.35;
    }

    this.buildSky();
    this.buildFloor();
    this.buildBackdrop();
    this.buildCrowd();
    for (const prop of def.props) this.buildProp(prop);

    for (const mat of this.neonMaterials) {
      mat.emissiveColor.scaleInPlace(1.3);
    }
  }

  private material(name: string, hex: string, emissive?: string, alpha = 1): StandardMaterial {
    const mat = new StandardMaterial(`${this.def.id}_${name}_${this.materials.length}`, this.scene);
    mat.diffuseColor = color(hex);
    mat.specularColor = color('#111118');
    if (emissive) {
      mat.emissiveColor = color(emissive);
    }
    if (alpha < 1) {
      mat.alpha = alpha;
      mat.backFaceCulling = false;
    }
    this.materials.push(mat);
    return mat;
  }

  private makeTextTexture(name: string, text: string, bg: string, fg: string, glow: string): DynamicTexture {
    const texture = new DynamicTexture(name, { width: 512, height: 256 }, this.scene, true);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = glow;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 240);
    ctx.fillStyle = fg;
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      ctx.font = 'bold 72px sans-serif';
      const measured = Math.max(1, ctx.measureText(line).width);
      const fitted = Math.min(72, Math.floor((72 * 456) / measured));
      ctx.font = `bold ${fitted}px sans-serif`;
      ctx.fillText(line, 256, 128 + (index - (lines.length - 1) / 2) * 78);
    });
    texture.update();
    return texture;
  }

  private buildSky(): void {
    const texture = new DynamicTexture('skyGradient', { width: 64, height: 256 }, this.scene, true);
    const ctx = texture.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, this.def.palette.skyTop);
    gradient.addColorStop(1, this.def.palette.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 256);
    texture.update();
    const mat = new StandardMaterial('skyMat', this.scene);
    mat.emissiveTexture = texture;
    mat.diffuseTexture = texture;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    this.materials.push(mat);
    const sky = MeshBuilder.CreatePlane('sky', { width: 46, height: 22 }, this.scene);
    sky.material = mat;
    sky.position.set(0, 6, -15);
    sky.parent = this.root;
    sky.isPickable = false;
  }

  private buildFloor(): void {
    const floorMat = this.material('floor', this.def.palette.floor);
    floorMat.specularColor = color('#202030');
    const floor = MeshBuilder.CreateBox('floor', { width: 30, height: 0.3, depth: 18 }, this.scene);
    floor.material = floorMat;
    floor.position.set(0, -0.15, 0);
    floor.parent = this.root;
    floor.receiveShadows = true;
    floor.isPickable = false;

    const lineMat = this.material('floorLine', this.def.palette.floorLine, this.def.palette.floorLine);
    lineMat.alpha = 0.55;
    for (let i = -7; i <= 7; i++) {
      if (i === 0) continue;
      const line = MeshBuilder.CreateBox('floorLineX', { width: 0.035, height: 0.01, depth: 16 }, this.scene);
      line.material = lineMat;
      line.position.set(i * 2, 0.005, 0);
      line.parent = this.root;
      line.isPickable = false;
    }
    const center = MeshBuilder.CreateBox('floorCenter', { width: 0.06, height: 0.012, depth: 16 }, this.scene);
    center.material = lineMat;
    center.position.set(0, 0.006, 0);
    center.parent = this.root;
    center.isPickable = false;

    const edgeMat = this.material('edge', this.def.palette.neonA, this.def.palette.neonA);
    for (const side of [-1, 1]) {
      const edge = MeshBuilder.CreateBox('edgeGlow', { width: 0.06, height: 0.04, depth: 16 }, this.scene);
      edge.material = edgeMat;
      edge.position.set(side * (this.def.bounds + 0.4), 0.02, 0);
      edge.parent = this.root;
      edge.isPickable = false;
      this.neonMaterials.push(edgeMat);
    }
  }

  private buildBackdrop(): void {
    const wallMat = this.material('wall', this.def.palette.wall);
    const wall = MeshBuilder.CreateBox('backWall', { width: 34, height: 14, depth: 0.5 }, this.scene);
    wall.material = wallMat;
    wall.position.set(0, 5, -9.4);
    wall.parent = this.root;
    wall.receiveShadows = true;
    wall.isPickable = false;

    const sideMat = this.material('sideWall', this.def.palette.wall);
    for (const side of [-1, 1]) {
      const sideWall = MeshBuilder.CreateBox('sideWall', { width: 0.5, height: 12, depth: 18 }, this.scene);
      sideWall.material = sideMat;
      sideWall.position.set(side * 14.5, 4, -1);
      sideWall.parent = this.root;
      sideWall.isPickable = false;
    }

    const trimMat = this.material('trim', this.def.palette.neonB, this.def.palette.neonB);
    trimMat.alpha = 0.8;
    for (let i = -5; i <= 5; i++) {
      const strip = MeshBuilder.CreateBox('wallStrip', { width: 0.08, height: 3.2, depth: 0.06 }, this.scene);
      strip.material = trimMat;
      strip.position.set(i * 2.4, 3.5, -9.1);
      strip.parent = this.root;
      strip.isPickable = false;
    }
    this.neonMaterials.push(trimMat);
  }

  private buildCrowd(): void {
    const count = Math.round(this.def.crowd.count * this.quality.crowdDensity);
    const rows = this.def.crowd.rows;
    const headMatA = this.material('crowdA', this.def.palette.crowdA);
    const headMatB = this.material('crowdB', this.def.palette.crowdB);
    const bodyMat = this.material('crowdBody', this.def.palette.wall);

    const headSourceA = MeshBuilder.CreateSphere('crowdHeadA', { diameter: 0.22, segments: 6 }, this.scene);
    headSourceA.material = headMatA;
    headSourceA.isVisible = false;
    headSourceA.parent = this.root;
    const headSourceB = MeshBuilder.CreateSphere('crowdHeadB', { diameter: 0.22, segments: 6 }, this.scene);
    headSourceB.material = headMatB;
    headSourceB.isVisible = false;
    headSourceB.parent = this.root;
    const bodySource = MeshBuilder.CreateBox('crowdBody', { width: 0.26, height: 0.5, depth: 0.18 }, this.scene);
    bodySource.material = bodyMat;
    bodySource.isVisible = false;
    bodySource.parent = this.root;

    const spacingX = 0.58;
    const perRow = Math.ceil(count / rows);
    let index = 0;
    for (let row = 0; row < rows; row++) {
      const z = -7.7 + row * 0.72;
      const y = 0.75 + row * 0.3;
      for (let i = 0; i < perRow; i++) {
        const x = (i - (perRow - 1) / 2) * spacingX + (row % 2) * 0.2;
        const source = index % 2 === 0 ? headSourceA : headSourceB;
        const head = source.createInstance(`crowdHead_${index}`);
        head.position.set(x, y + 0.55, z);
        this.crowdBaseY.push(y + 0.55);
        head.parent = this.root;
        head.isPickable = false;
        head.scaling.setAll(0.85 + ((index * 7) % 5) * 0.06);
        this.crowdHeads.push(head);

        const body = bodySource.createInstance(`crowdBody_${index}`);
        body.position.set(x, y + 0.15, z);
        body.parent = this.root;
        body.isPickable = false;
        body.scaling.setAll(0.85 + ((index * 11) % 4) * 0.07);
        this.crowdBodies.push(body);
        index++;
      }
    }
  }

  private buildProp(prop: StageProp): void {
    const scale = prop.scale ?? 1;
    const propColor = prop.color ?? this.def.palette.neonA;
    const glow = prop.glow ?? false;
    const baseY = prop.y ?? 0;
    const parent = this.root;

    const attach = (mesh: AbstractMesh) => {
      mesh.parent = parent;
      mesh.position.x += prop.x;
      mesh.position.y += baseY;
      mesh.position.z += prop.z;
      mesh.rotation.y += prop.rotation ?? 0;
      mesh.isPickable = false;
      mesh.scaling.scaleInPlace(scale);
      return mesh;
    };

    switch (prop.type) {
      case 'screen': {
        const frame = attach(MeshBuilder.CreateBox('screenFrame', { width: 3.2, height: 1.9, depth: 0.22 }, this.scene));
        frame.material = this.material('screenFrame', '#111118');
        const texture = this.makeTextTexture(
          `screenText_${prop.x}_${prop.z}`,
          'HYPE K.O.\nTHE LAST VIRALITY',
          '#0a0a12',
          '#ffffff',
          propColor
        );
        const mat = new StandardMaterial('screenMat', this.scene);
        mat.emissiveTexture = texture;
        mat.diffuseTexture = texture;
        mat.disableLighting = true;
        mat.backFaceCulling = false;
        this.materials.push(mat);
        this.screens.push(mat);
        const screen = MeshBuilder.CreatePlane('screenPlane', { width: 3, height: 1.7 }, this.scene);
        screen.material = mat;
        attach(screen);
        screen.rotation.y += Math.PI;
        screen.position.z += 0.13;
        break;
      }
      case 'speaker': {
        const body = attach(MeshBuilder.CreateBox('speaker', { width: 0.8, height: 1.7, depth: 0.6 }, this.scene));
        body.material = this.material('speakerBody', '#15151c');
        for (let i = 0; i < 3; i++) {
          const cone = attach(
            MeshBuilder.CreateCylinder('speakerCone', { diameter: 0.4, height: 0.08, tessellation: 16 }, this.scene)
          );
          cone.material = this.material('speakerCone', '#2a2a33');
          cone.rotation.x = Math.PI / 2;
          cone.position.y += 0.5 - i * 0.45;
          cone.position.z += 0.34;
        }
        break;
      }
      case 'neonSign':
      case 'billboard': {
        const texture = this.makeTextTexture(
          `sign_${prop.x}_${prop.z}`,
          this.def.name,
          '#07070c',
          propColor,
          propColor
        );
        const mat = new StandardMaterial('neonMat', this.scene);
        mat.emissiveTexture = texture;
        mat.diffuseTexture = texture;
        mat.disableLighting = true;
        mat.backFaceCulling = false;
        this.materials.push(mat);
        this.neonMaterials.push(mat);
        const sign = attach(MeshBuilder.CreatePlane('neonSign', { width: 2.6, height: 1.3 }, this.scene));
        sign.material = mat;
        sign.rotation.y += Math.PI;
        break;
      }
      case 'pillar': {
        const pillar = attach(
          MeshBuilder.CreateCylinder('pillar', { diameter: 0.7, height: 4.5, tessellation: 8 }, this.scene)
        );
        pillar.material = this.material('pillar', propColor);
        pillar.position.y += 2.25;
        break;
      }
      case 'barrier': {
        const barrier = attach(MeshBuilder.CreateBox('barrier', { width: 1.7, height: 0.9, depth: 0.16 }, this.scene));
        barrier.material = this.material('barrier', propColor, glow ? propColor : undefined);
        for (const side of [-1, 1]) {
          const post = attach(MeshBuilder.CreateCylinder('barrierPost', { diameter: 0.08, height: 1, tessellation: 8 }, this.scene));
          post.material = barrier.material;
          post.position.x += side * 0.8;
          post.position.y += 0.45;
        }
        break;
      }
      case 'crate': {
        const crate = attach(MeshBuilder.CreateBox('crate', { width: 0.9, height: 0.9, depth: 0.9 }, this.scene));
        crate.material = this.material('crate', propColor);
        const strapMat = this.material('crateStrap', '#2a1a10');
        for (const axis of ['x', 'z'] as const) {
          const strap = attach(MeshBuilder.CreateBox('crateStrap', { width: axis === 'x' ? 0.95 : 0.08, height: 0.95, depth: axis === 'x' ? 0.08 : 0.95 }, this.scene));
          strap.material = strapMat;
          strap.position.y += 0.45;
        }
        crate.position.y += 0.45;
        break;
      }
      case 'tree': {
        const trunk = attach(MeshBuilder.CreateCylinder('treeTrunk', { diameter: 0.28, height: 2, tessellation: 8 }, this.scene));
        trunk.material = this.material('trunk', '#4a2f1b');
        trunk.position.y += 1;
        const leaves = attach(MeshBuilder.CreateSphere('leaves', { diameter: 1.7, segments: 8 }, this.scene));
        leaves.material = this.material('leaves', propColor);
        leaves.position.y += 2.4;
        leaves.scaling.set(1, 0.8, 1);
        break;
      }
      case 'lamp': {
        const pole = attach(MeshBuilder.CreateCylinder('lampPole', { diameter: 0.08, height: 3.4, tessellation: 8 }, this.scene));
        pole.material = this.material('lampPole', '#202028');
        pole.position.y += 1.7;
        const bulb = attach(MeshBuilder.CreateSphere('lampBulb', { diameter: 0.4, segments: 8 }, this.scene));
        bulb.material = this.material('lampBulb', propColor, propColor);
        bulb.position.y += 3.4;
        if (this.lights.length < 3) {
          const light = new PointLight('stageLamp', new Vector3(prop.x, baseY + 3.3, prop.z), this.scene);
          light.diffuse = color(propColor);
          light.intensity = 0.5;
          light.range = 7;
          this.lights.push(light);
        }
        break;
      }
      case 'ring': {
        const ring = attach(
          MeshBuilder.CreateTorus('rodeoRing', { diameter: 2.4, thickness: 0.08, tessellation: 32 }, this.scene)
        );
        ring.material = this.material('ringMat', propColor, propColor);
        ring.position.y += 0.05;
        break;
      }
      case 'car': {
        const body = attach(MeshBuilder.CreateBox('carBody', { width: 1.7, height: 0.5, depth: 3.2 }, this.scene));
        body.material = this.material('carBody', propColor);
        body.position.y += 0.55;
        const cabin = attach(MeshBuilder.CreateBox('carCabin', { width: 1.4, height: 0.45, depth: 1.5 }, this.scene));
        cabin.material = this.material('carCabin', '#101018');
        cabin.position.y += 0.95;
        cabin.position.z -= 0.2;
        for (const side of [-1, 1]) {
          for (const front of [-1, 1]) {
            const wheel = attach(
              MeshBuilder.CreateCylinder('wheel', { diameter: 0.55, height: 0.2, tessellation: 12 }, this.scene)
            );
            wheel.material = this.material('wheel', '#111111');
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(prop.x + side * 0.85, baseY + 0.28, prop.z + front * 1.05);
          }
        }
        break;
      }
      case 'tower': {
        const tower = attach(MeshBuilder.CreateBox('tower', { width: 0.7, height: 5, depth: 0.7 }, this.scene));
        tower.material = this.material('tower', propColor);
        tower.position.y += 2.5;
        const light = attach(MeshBuilder.CreateSphere('towerLight', { diameter: 0.5, segments: 8 }, this.scene));
        light.material = this.material('towerLight', this.def.palette.neonB, this.def.palette.neonB);
        light.position.y += 5;
        break;
      }
      case 'discoBall': {
        const ball = attach(MeshBuilder.CreateSphere('discoBall', { diameter: 0.9, segments: 12 }, this.scene));
        ball.material = this.material('discoBall', '#d9d9e8', '#777788');
        ball.position.y += 0.8;
        this.discoBalls.push(ball as Mesh);
        break;
      }
      case 'camera': {
        const body = attach(MeshBuilder.CreateBox('tvCamera', { width: 0.5, height: 0.35, depth: 0.7 }, this.scene));
        body.material = this.material('tvCamera', '#1a1a22');
        body.position.y += 1.4;
        const lens = attach(MeshBuilder.CreateCylinder('cameraLens', { diameter: 0.3, height: 0.4, tessellation: 12 }, this.scene));
        lens.material = this.material('cameraLens', '#0a0a12');
        lens.rotation.x = Math.PI / 2;
        lens.position.y += 1.4;
        lens.position.z += 0.5;
        const tripod = attach(MeshBuilder.CreateCylinder('tripod', { diameter: 0.06, height: 1.2, tessellation: 6 }, this.scene));
        tripod.material = body.material;
        tripod.position.y += 0.6;
        break;
      }
      case 'piano': {
        const body = attach(MeshBuilder.CreateBox('pianoBody', { width: 1.8, height: 0.7, depth: 0.9 }, this.scene));
        body.material = this.material('pianoBody', propColor);
        body.position.y += 0.65;
        const keys = attach(MeshBuilder.CreateBox('pianoKeys', { width: 1.6, height: 0.08, depth: 0.4 }, this.scene));
        keys.material = this.material('pianoKeys', '#f5f5f5');
        keys.position.y += 0.72;
        keys.position.z += 0.35;
        for (const side of [-1, 1]) {
          const leg = attach(MeshBuilder.CreateBox('pianoLeg', { width: 0.1, height: 0.65, depth: 0.1 }, this.scene));
          leg.material = body.material;
          leg.position.set(prop.x + side * 0.7, baseY + 0.33, prop.z);
        }
        break;
      }
      case 'scaffold': {
        const mat = this.material('scaffold', propColor);
        for (const x of [-1, 1]) {
          for (const z of [-0.4, 0.4]) {
            const bar = attach(MeshBuilder.CreateBox('scaffoldBar', { width: 0.12, height: 4.5, depth: 0.12 }, this.scene));
            bar.material = mat;
            bar.position.set(prop.x + x * 0.8, baseY + 2.25, prop.z + z);
          }
        }
        for (let i = 0; i < 4; i++) {
          const cross = attach(MeshBuilder.CreateBox('scaffoldCross', { width: 1.7, height: 0.1, depth: 0.1 }, this.scene));
          cross.material = mat;
          cross.position.set(prop.x, baseY + 0.6 + i * 1.1, prop.z + 0.4);
        }
        break;
      }
      case 'statue': {
        const pedestal = attach(MeshBuilder.CreateBox('pedestal', { width: 0.9, height: 0.8, depth: 0.9 }, this.scene));
        pedestal.material = this.material('pedestal', '#8a8a94');
        pedestal.position.y += 0.4;
        const figure = attach(MeshBuilder.CreateCylinder('statueFigure', { diameter: 0.5, height: 1.6, tessellation: 8 }, this.scene));
        figure.material = pedestal.material;
        figure.position.y += 1.6;
        break;
      }
      case 'fountain': {
        const basin = attach(MeshBuilder.CreateCylinder('fountainBasin', { diameter: 2.4, height: 0.35, tessellation: 24 }, this.scene));
        basin.material = this.material('fountainBasin', propColor);
        basin.position.y += 0.17;
        const water = attach(MeshBuilder.CreateCylinder('fountainWater', { diameter: 2.1, height: 0.05, tessellation: 24 }, this.scene));
        water.material = this.material('fountainWater', '#4ad9d9', '#4ad9d9', 0.7);
        water.position.y += 0.36;
        const spout = attach(MeshBuilder.CreateCylinder('fountainSpout', { diameter: 0.3, height: 1.2, tessellation: 12 }, this.scene));
        spout.material = basin.material;
        spout.position.y += 0.8;
        break;
      }
      case 'arch': {
        const mat = this.material('archMat', propColor, glow ? propColor : undefined);
        for (const side of [-1, 1]) {
          const leg = attach(MeshBuilder.CreateBox('archLeg', { width: 0.5, height: 4.4, depth: 0.5 }, this.scene));
          leg.material = mat;
          leg.position.set(prop.x + side * 1.4, baseY + 2.2, prop.z);
        }
        const top = attach(MeshBuilder.CreateBox('archTop', { width: 3.3, height: 0.5, depth: 0.5 }, this.scene));
        top.material = mat;
        top.position.y += 4.3;
        break;
      }
      case 'flag':
      case 'checkerFlag': {
        const pole = attach(MeshBuilder.CreateCylinder('propFlagPole', { diameter: 0.06, height: 3.2, tessellation: 8 }, this.scene));
        pole.material = this.material('propFlagPole', '#8a8a94');
        pole.position.y += 1.6;
        if (prop.type === 'checkerFlag') {
          const texture = new DynamicTexture('checkerTex', { width: 128, height: 128 }, this.scene, true);
          const ctx = texture.getContext();
          for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#111111';
              ctx.fillRect(x * 16, y * 16, 16, 16);
            }
          }
          texture.update();
          const mat = new StandardMaterial('checkerMat', this.scene);
          mat.diffuseTexture = texture;
          mat.emissiveTexture = texture;
          mat.emissiveColor = color('#888888');
          mat.backFaceCulling = false;
          this.materials.push(mat);
          const flag = attach(MeshBuilder.CreatePlane('checkerPlane', { width: 1.4, height: 0.9 }, this.scene));
          flag.material = mat;
          flag.position.y += 2.5;
          flag.position.x += 0.7;
        } else {
          const flag = attach(MeshBuilder.CreatePlane('propFlagPlane', { width: 1.3, height: 0.8 }, this.scene));
          flag.material = this.material('propFlag', propColor, propColor);
          flag.position.y += 2.5;
          flag.position.x += 0.65;
        }
        break;
      }
      default:
        break;
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    const time = this.elapsed;
    for (let i = 0; i < this.crowdHeads.length; i++) {
      const head = this.crowdHeads[i];
      head.position.y = this.crowdBaseY[i] + Math.sin(time * 3 + i * 0.7) * 0.03;
      head.rotation.z = Math.sin(time * 2 + i) * 0.05;
      const body = this.crowdBodies[i];
      if (body) body.rotation.z = Math.sin(time * 2 + i) * 0.02;
    }
    for (const mat of this.neonMaterials) {
      if (!this.neonBase.has(mat)) this.neonBase.set(mat, mat.emissiveColor.clone());
      const base = this.neonBase.get(mat)!;
      const pulse = 0.85 + Math.sin(time * 2.2) * 0.15;
      mat.emissiveColor = base.scale(pulse);
    }
    for (const screen of this.screens) {
      if (screen.emissiveColor) {
        const pulse = 0.9 + Math.sin(time * 1.5) * 0.1;
        screen.emissiveColor = color(this.def.palette.neonB).scale(pulse);
      }
    }
    for (const ball of this.discoBalls) {
      ball.rotation.y += dt * 0.7;
    }
    for (const light of this.lights) {
      light.intensity = 0.4 + Math.sin(time * 3 + light.position.x) * 0.12;
    }
  }

  addShadowCaster(mesh: AbstractMesh): void {
    this.shadowGenerator?.addShadowCaster(mesh);
  }

  dispose(): void {
    this.shadowGenerator?.dispose();
    for (const light of this.lights) light.dispose();
    this.root.dispose(false, false);
    for (const mat of this.materials) mat.dispose();
  }
}
