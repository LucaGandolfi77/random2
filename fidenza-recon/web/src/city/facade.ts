import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Building, Side } from '../types';
import { materials } from '../materials/library';
import { hashString, mixColor, shade } from '../utils';

const WALL_THICKNESS = 0.24;

interface HoleSpec {
  u: number;
  v: number;
  width: number;
  height: number;
  arched: boolean;
  circle?: boolean;
}

function sideMatrix(building: Building, side: Side): THREE.Matrix4 {
  const origin = new THREE.Vector3(side.p1[0], building.base_y, side.p1[1]);
  const dir = new THREE.Vector3(side.p2[0] - side.p1[0], 0, side.p2[1] - side.p1[1]).normalize();
  const normal = new THREE.Vector3(side.normal[0], 0, side.normal[1]).normalize();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const xAxis = dir;
  let zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  if (zAxis.dot(normal) < 0) {
    xAxis.negate();
    zAxis.negate();
  }
  return new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(origin);
}

function addHole(shape: THREE.Shape, hole: HoleSpec): void {
  const path = new THREE.Path();
  if (hole.circle) {
    path.absarc(hole.u, hole.v, hole.width, 0, Math.PI * 2, true);
    shape.holes.push(path);
    return;
  }
  const left = hole.u - hole.width / 2;
  const right = hole.u + hole.width / 2;
  const bottom = Math.max(0.02, hole.v);
  const top = Math.min(hole.v + hole.height, Number.POSITIVE_INFINITY);
  if (hole.arched) {
    const radius = hole.width / 2;
    const arcCenter = top - radius;
    if (arcCenter <= bottom) return;
    path.moveTo(left, bottom);
    path.lineTo(left, arcCenter);
    path.absarc(hole.u, arcCenter, radius, Math.PI, 0, true);
    path.lineTo(right, bottom);
    path.closePath();
  } else {
    if (right - left < 0.15 || top - bottom < 0.15) return;
    path.moveTo(left, bottom);
    path.lineTo(left, top);
    path.lineTo(right, top);
    path.lineTo(right, bottom);
    path.closePath();
  }
  shape.holes.push(path);
}

function wallGeometry(building: Building, side: Side): THREE.BufferGeometry | null {
  const length = side.length_m;
  const height = Math.max(2.0, building.eave_height_m);
  if (length < 1.0) return null;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(length, 0);
  shape.lineTo(length, height);
  shape.lineTo(0, height);
  shape.closePath();

  const layout = side.layout;
  for (const window of layout.windows) {
    addHole(shape, {
      u: window.u,
      v: window.v,
      width: window.width,
      height: window.height,
      arched: window.type === 'arched',
    });
  }
  for (const door of layout.doors) {
    addHole(shape, {
      u: door.u,
      v: door.v,
      width: door.width,
      height: door.height,
      arched: door.type === 'archway' || door.type === 'portal',
    });
  }
  for (const shopfront of layout.shopfronts) {
    addHole(shape, {
      u: shopfront.u,
      v: shopfront.v,
      width: shopfront.width,
      height: shopfront.height,
      arched: false,
    });
  }
  if (
    layout.ornaments.includes('rose_window') &&
    side.main_facade &&
    building.archetype === 'romanesque_church'
  ) {
    addHole(shape, {
      u: length / 2,
      v: Math.max(building.ground_floor_height_m + 2.0, height - 4.6),
      width: building.archetype === 'romanesque_church' ? 1.4 : 1.0,
      height: building.archetype === 'romanesque_church' ? 1.4 : 1.0,
      arched: false,
      circle: true,
    });
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: WALL_THICKNESS,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -WALL_THICKNESS);
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) / 2.8, uv.getY(index) / 2.8);
  }
  geometry.applyMatrix4(sideMatrix(building, side));
  return geometry;
}

export type BoxKind = 'frame' | 'wood' | 'metal' | 'stone' | 'concrete' | 'marking';
export type GlassKind = 'glass' | 'glassArch' | 'shopGlass';

interface Accumulator {
  matrices: THREE.Matrix4[];
  colors: THREE.Color[];
}

export class DetailBatcher {
  private boxes: Record<BoxKind, Accumulator> = {
    frame: { matrices: [], colors: [] },
    wood: { matrices: [], colors: [] },
    metal: { matrices: [], colors: [] },
    stone: { matrices: [], colors: [] },
    concrete: { matrices: [], colors: [] },
    marking: { matrices: [], colors: [] },
  };

  private glass: Record<GlassKind, Accumulator> = {
    glass: { matrices: [], colors: [] },
    glassArch: { matrices: [], colors: [] },
    shopGlass: { matrices: [], colors: [] },
  };

  private ring: Accumulator = { matrices: [], colors: [] };
  private arch: Accumulator = { matrices: [], colors: [] };

  addBox(
    kind: BoxKind,
    matrix: THREE.Matrix4,
    position: THREE.Vector3,
    scale: THREE.Vector3,
    colorHex: string,
    rotationZ = 0,
  ): void {
    const local = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
    if (rotationZ !== 0) {
      local.multiply(new THREE.Matrix4().makeRotationZ(rotationZ));
    }
    local.multiply(new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z));
    this.boxes[kind].matrices.push(matrix.clone().multiply(local));
    this.boxes[kind].colors.push(new THREE.Color(colorHex));
  }

  addGlass(
    kind: GlassKind,
    matrix: THREE.Matrix4,
    position: THREE.Vector3,
    scale: THREE.Vector3,
    rotationZ = 0,
  ): void {
    const local = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
    if (rotationZ !== 0) {
      local.multiply(new THREE.Matrix4().makeRotationZ(rotationZ));
    }
    local.multiply(new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z));
    this.glass[kind].matrices.push(matrix.clone().multiply(local));
  }

  addArch(
    matrix: THREE.Matrix4,
    position: THREE.Vector3,
    radius: number,
    colorHex: string,
  ): void {
    const local = new THREE.Matrix4()
      .makeTranslation(position.x, position.y, position.z)
      .multiply(new THREE.Matrix4().makeScale(radius, radius, 1));
    this.arch.matrices.push(matrix.clone().multiply(local));
    this.arch.colors.push(new THREE.Color(colorHex));
  }

  addRing(matrix: THREE.Matrix4, position: THREE.Vector3, radius: number, colorHex: string): void {
    const local = new THREE.Matrix4()
      .makeTranslation(position.x, position.y, position.z)
      .multiply(new THREE.Matrix4().makeScale(radius, radius, radius));
    this.ring.matrices.push(matrix.clone().multiply(local));
    this.ring.colors.push(new THREE.Color(colorHex));
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'facade-details';
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const glassGeometry = new THREE.PlaneGeometry(1, 1);
    const archedGlass = new THREE.ShapeGeometry(archedShape());
    const ringGeometry = new THREE.TorusGeometry(1, 0.055, 8, 40);
    const archGeometry = new THREE.TorusGeometry(1, 0.045, 6, 24, Math.PI);
    const boxMaterials: Record<BoxKind, THREE.Material> = {
      frame: materials.frame,
      wood: materials.wood,
      metal: materials.metal,
      stone: materials.stone,
      concrete: materials.concrete,
      marking: materials.marking,
    };
    for (const [kind, accumulator] of Object.entries(this.boxes) as [BoxKind, Accumulator][]) {
      if (!accumulator.matrices.length) continue;
      const mesh = new THREE.InstancedMesh(
        boxGeometry,
        boxMaterials[kind],
        accumulator.matrices.length,
      );
      accumulator.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      accumulator.colors.forEach((color, index) => mesh.setColorAt(index, color));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    const glassMaterials: Record<GlassKind, THREE.Material> = {
      glass: materials.glass,
      glassArch: materials.glass,
      shopGlass: materials.shopGlass,
    };
    for (const [kind, accumulator] of Object.entries(this.glass) as [GlassKind, Accumulator][]) {
      if (!accumulator.matrices.length) continue;
      const mesh = new THREE.InstancedMesh(
        kind === 'glassArch' ? archedGlass : glassGeometry,
        glassMaterials[kind],
        accumulator.matrices.length,
      );
      accumulator.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    if (this.arch.matrices.length) {
      const mesh = new THREE.InstancedMesh(
        archGeometry,
        materials.frame,
        this.arch.matrices.length,
      );
      this.arch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      this.arch.colors.forEach((color, index) => mesh.setColorAt(index, color));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = false;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    if (this.ring.matrices.length) {
      const mesh = new THREE.InstancedMesh(
        ringGeometry,
        new THREE.MeshStandardMaterial({ color: '#cbb79a', roughness: 0.8 }),
        this.ring.matrices.length,
      );
      this.ring.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      this.ring.colors.forEach((color, index) => mesh.setColorAt(index, color));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    return group;
  }
}

function archedShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const radius = 0.5;
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(-0.5, 0.5 - radius);
  shape.absarc(0, 0.5 - radius, radius, Math.PI, 0, true);
  shape.lineTo(0.5, -0.5);
  shape.closePath();
  return shape;
}

function windowDetails(
  building: Building,
  side: Side,
  batcher: DetailBatcher,
  matrix: THREE.Matrix4,
  seed: number,
): void {
  const layout = side.layout;
  const shuttersColour = ['#3f5a46', '#5b3a28', '#6d7068', '#2f4b52'][seed % 4];
  for (const window of layout.windows) {
    const isBay = window.type === 'bay';
    const centre = new THREE.Vector3(
      window.u,
      window.v + window.height / 2,
      isBay ? 0.42 : -0.08,
    );
    const glassKind: GlassKind = window.type === 'arched' ? 'glassArch' : 'glass';
    batcher.addGlass(
      glassKind,
      matrix,
      centre,
      new THREE.Vector3(window.width - 0.05, window.height - 0.05, 1),
    );
    if (isBay) {
      for (const sign of [-1, 1]) {
        batcher.addBox(
          'frame',
          matrix,
          new THREE.Vector3(window.u + (sign * window.width) / 2, window.v + window.height / 2, 0.21),
          new THREE.Vector3(0.06, window.height, 0.46),
          window.frame,
        );
      }
      batcher.addBox(
        'frame',
        matrix,
        new THREE.Vector3(window.u, window.v + 0.04, 0.21),
        new THREE.Vector3(window.width, 0.08, 0.46),
        window.frame,
      );
      batcher.addBox(
        'frame',
        matrix,
        new THREE.Vector3(window.u, window.v + window.height - 0.04, 0.21),
        new THREE.Vector3(window.width, 0.08, 0.46),
        window.frame,
      );
    }
    const bar = 0.055;
    batcher.addBox(
      'frame',
      matrix,
      new THREE.Vector3(window.u - window.width / 2 + bar / 2, window.v + window.height / 2, -0.02),
      new THREE.Vector3(bar, window.height, 0.09),
      window.frame,
    );
    batcher.addBox(
      'frame',
      matrix,
      new THREE.Vector3(window.u + window.width / 2 - bar / 2, window.v + window.height / 2, -0.02),
      new THREE.Vector3(bar, window.height, 0.09),
      window.frame,
    );
    batcher.addBox(
      'frame',
      matrix,
      new THREE.Vector3(window.u, window.v + bar / 2, -0.02),
      new THREE.Vector3(window.width, bar, 0.09),
      window.frame,
    );
    if (window.type === 'arched') {
      const radius = window.width / 2;
      const arcCenter = window.v + window.height - radius;
      batcher.addArch(
        matrix,
        new THREE.Vector3(window.u, arcCenter, -0.02),
        radius,
        window.frame,
      );
    } else {
      batcher.addBox(
        'frame',
        matrix,
        new THREE.Vector3(window.u, window.v + window.height - bar / 2, -0.02),
        new THREE.Vector3(window.width, bar, 0.09),
        window.frame,
      );
    }
    if (window.width > 0.7) {
      batcher.addBox(
        'frame',
        matrix,
        new THREE.Vector3(window.u, window.v + window.height / 2, -0.025),
        new THREE.Vector3(0.04, window.height - 0.08, 0.06),
        shade(window.frame, 0.9),
      );
    }
    if (window.sill) {
      batcher.addBox(
        'frame',
        matrix,
        new THREE.Vector3(window.u, window.v - 0.03, 0.04),
        new THREE.Vector3(window.width + 0.16, 0.07, 0.16),
        shade(window.frame, 1.02),
      );
    }
    if (window.shutters) {
      if (window.shutter_type === 'roller') {
        batcher.addBox(
          'wood',
          matrix,
          new THREE.Vector3(window.u, window.v + window.height + 0.08, 0.03),
          new THREE.Vector3(window.width + 0.12, 0.16, 0.07),
          shuttersColour,
        );
      } else {
        const shutterWidth = window.width / 2;
        const open = window.width / 2 + shutterWidth / 2 + 0.01;
        batcher.addBox(
          'wood',
          matrix,
          new THREE.Vector3(window.u - open, window.v + window.height / 2, 0.02),
          new THREE.Vector3(shutterWidth, window.height - 0.03, 0.035),
          shuttersColour,
        );
        batcher.addBox(
          'wood',
          matrix,
          new THREE.Vector3(window.u + open, window.v + window.height / 2, 0.02),
          new THREE.Vector3(shutterWidth, window.height - 0.03, 0.035),
          shuttersColour,
        );
      }
    }
  }

  for (const door of layout.doors) {
    if (door.type === 'archway') {
      const radius = door.width / 2;
      batcher.addArch(
        matrix,
        new THREE.Vector3(door.u, door.height - radius, -0.02),
        radius,
        '#cbb79a',
      );
      continue;
    }
    batcher.addBox(
      'wood',
      matrix,
      new THREE.Vector3(door.u, door.height / 2, -0.05),
      new THREE.Vector3(door.width - 0.06, door.height - 0.04, 0.07),
      door.colour,
    );
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(door.u, 0.08, 0.22),
      new THREE.Vector3(door.width + 0.32, 0.16, 0.44),
      '#b9b3a7',
    );
    const bar = 0.07;
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(door.u - door.width / 2 - bar / 2, door.height / 2, 0.04),
      new THREE.Vector3(bar, door.height, 0.12),
      '#cbb79a',
    );
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(door.u + door.width / 2 + bar / 2, door.height / 2, 0.04),
      new THREE.Vector3(bar, door.height, 0.12),
      '#cbb79a',
    );
  }

  for (const shopfront of layout.shopfronts) {
    batcher.addGlass(
      'shopGlass',
      matrix,
      new THREE.Vector3(shopfront.u, shopfront.height / 2, -0.1),
      new THREE.Vector3(shopfront.width - 0.12, shopfront.height - 0.08, 1),
    );
    const bar = 0.07;
    batcher.addBox(
      'metal',
      matrix,
      new THREE.Vector3(shopfront.u, 0.08, 0.02),
      new THREE.Vector3(shopfront.width, bar, 0.1),
      '#3b3b3b',
    );
    batcher.addBox(
      'metal',
      matrix,
      new THREE.Vector3(shopfront.u, shopfront.height - 0.04, 0.02),
      new THREE.Vector3(shopfront.width, bar, 0.1),
      '#3b3b3b',
    );
    batcher.addBox(
      'metal',
      matrix,
      new THREE.Vector3(shopfront.u - shopfront.width / 2 + bar / 2, shopfront.height / 2, 0.02),
      new THREE.Vector3(bar, shopfront.height, 0.1),
      '#3b3b3b',
    );
    batcher.addBox(
      'metal',
      matrix,
      new THREE.Vector3(shopfront.u + shopfront.width / 2 - bar / 2, shopfront.height / 2, 0.02),
      new THREE.Vector3(bar, shopfront.height, 0.1),
      '#3b3b3b',
    );
    batcher.addBox(
      'wood',
      matrix,
      new THREE.Vector3(shopfront.u, shopfront.height + 0.26, 0.04),
      new THREE.Vector3(shopfront.width + 0.2, 0.34, 0.1),
      shopfront.colour,
    );
  }

  for (const balcony of layout.balconies) {
    const stone = balcony.type === 'stone';
    batcher.addBox(
      stone ? 'stone' : 'concrete',
      matrix,
      new THREE.Vector3(balcony.u, balcony.v + 0.08, balcony.depth / 2 + 0.02),
      new THREE.Vector3(balcony.width, 0.14, balcony.depth),
      stone ? '#c9c1b1' : '#b4b0a7',
    );
    if (balcony.railing === 'glass') {
      batcher.addGlass(
        'shopGlass',
        matrix,
        new THREE.Vector3(balcony.u, balcony.v + 0.65, balcony.depth + 0.02),
        new THREE.Vector3(balcony.width, 0.9, 1),
      );
      batcher.addBox(
        'metal',
        matrix,
        new THREE.Vector3(balcony.u, balcony.v + 1.12, balcony.depth + 0.02),
        new THREE.Vector3(balcony.width, 0.05, 0.05),
        '#2f3130',
      );
    } else if (balcony.railing === 'iron' || balcony.railing === 'metal') {
      const count = Math.max(3, Math.round(balcony.width / 0.18));
      for (let index = 0; index < count; index += 1) {
        const u = balcony.u - balcony.width / 2 + (balcony.width * (index + 0.5)) / count;
        batcher.addBox(
          'metal',
          matrix,
          new THREE.Vector3(u, balcony.v + 0.6, balcony.depth + 0.02),
          new THREE.Vector3(0.022, 1.0, 0.022),
          '#2f3130',
        );
      }
      batcher.addBox(
        'metal',
        matrix,
        new THREE.Vector3(balcony.u, balcony.v + 1.12, balcony.depth + 0.02),
        new THREE.Vector3(balcony.width, 0.045, 0.045),
        '#2f3130',
      );
    } else {
      batcher.addBox(
        stone ? 'stone' : 'concrete',
        matrix,
        new THREE.Vector3(balcony.u, balcony.v + 0.58, balcony.depth + 0.02),
        new THREE.Vector3(balcony.width, 0.95, 0.12),
        stone ? '#c9c1b1' : '#b4b0a7',
      );
      batcher.addBox(
        stone ? 'stone' : 'concrete',
        matrix,
        new THREE.Vector3(balcony.u, balcony.v + 1.1, balcony.depth + 0.02),
        new THREE.Vector3(balcony.width + 0.1, 0.08, 0.18),
        stone ? '#d2cabb' : '#c2beb5',
      );
    }
  }

  if (side.street_facing && side.length_m > 3.0) {
    for (const u of [0.28, side.length_m - 0.28]) {
      batcher.addBox(
        'metal',
        matrix,
        new THREE.Vector3(u, building.eave_height_m / 2, 0.11),
        new THREE.Vector3(0.07, building.eave_height_m, 0.07),
        '#6f7a7d',
      );
    }
  }
  if (layout.cornice) {
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(side.length_m / 2, building.eave_height_m - layout.cornice.height / 2, layout.cornice.depth / 2),
      new THREE.Vector3(side.length_m, layout.cornice.height, layout.cornice.depth),
      layout.cornice.colour,
    );
  }
  for (const course of layout.string_courses) {
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(side.length_m / 2, course.v, course.depth / 2),
      new THREE.Vector3(side.length_m, course.height, course.depth),
      shade(building.facade.primary, 1.04),
    );
  }
  for (const pilaster of layout.pilasters) {
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(pilaster.u, building.eave_height_m / 2, pilaster.depth / 2),
      new THREE.Vector3(pilaster.width, building.eave_height_m, pilaster.depth),
      shade(building.facade.primary, 1.05),
    );
  }
  if (layout.ornaments.includes('crenellations')) {
    const count = Math.max(3, Math.round(side.length_m / 0.9));
    for (let index = 0; index < count; index += 1) {
      const u = (side.length_m * (index + 0.5)) / count;
      batcher.addBox(
        'stone',
        matrix,
        new THREE.Vector3(u, building.eave_height_m + 0.35, 0.2),
        new THREE.Vector3(0.42, 0.7, 0.55),
        '#a68b72',
      );
    }
  }
  if (layout.ornaments.includes('rose_window') && side.main_facade) {
    const v = Math.max(
      building.ground_floor_height_m + 2.0,
      building.eave_height_m - 4.6,
    );
    const roseRadius = building.archetype === 'romanesque_church' ? 1.4 : 1.0;
    batcher.addGlass(
      'glass',
      matrix,
      new THREE.Vector3(side.length_m / 2, v, -0.06),
      new THREE.Vector3(roseRadius * 1.9, roseRadius * 1.9, 1),
    );
    batcher.addRing(
      matrix,
      new THREE.Vector3(side.length_m / 2, v, 0.02),
      roseRadius + 0.02,
      '#cbb79a',
    );
  }
  if (
    side.main_facade &&
    (building.archetype === 'romanesque_church' || building.archetype === 'church')
  ) {
    const v = building.eave_height_m + building.roof_height_m * 0.72;
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(side.length_m / 2, v, 0.8),
      new THREE.Vector3(0.12, 1.35, 0.12),
      '#cbb79a',
    );
    batcher.addBox(
      'stone',
      matrix,
      new THREE.Vector3(side.length_m / 2, v + 0.35, 0.8),
      new THREE.Vector3(0.72, 0.12, 0.12),
      '#cbb79a',
    );
  }
}

export function buildFacadeDetails(building: Building, batcher: DetailBatcher): void {
  const seed = hashString(building.id);
  for (const side of building.sides) {
    const matrix = sideMatrix(building, side);
    windowDetails(building, side, batcher, matrix, seed + side.index);
  }
}

export function buildWalls(building: Building): THREE.BufferGeometry | null {
  const geometries: THREE.BufferGeometry[] = [];
  for (const side of building.sides) {
    const geometry = wallGeometry(building, side);
    if (geometry) geometries.push(geometry);
  }
  if (!geometries.length) return null;
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}

export function wallColour(building: Building): string {
  return building.facade.primary;
}

export function chooseSideColour(building: Building, side: Side): string {
  const index = side.index % Math.max(1, building.facade.secondary.length);
  return mixColor(building.facade.primary, building.facade.secondary[index] ?? building.facade.primary, 0.08);
}
