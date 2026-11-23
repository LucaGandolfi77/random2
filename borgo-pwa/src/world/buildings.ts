import * as THREE from 'three';
import type { BuildingSpec, DoorSide, RoofTone, WallTone } from '../data/types';
import type { GeoBatch } from './batch';

const WALLS: Record<WallTone, number> = {
  cream: 0xf0e5cd,
  white: 0xf8f2e2,
  rose: 0xe8cbb2,
  ochre: 0xd9b885,
  stone: 0xd3c8b3
};

const ROOFS: Record<RoofTone, number> = {
  terracotta: 0xb26043,
  brown: 0x8b5a42,
  slate: 0x6f7784
};

const TRIM = 0xf7f0df;
const PLINTH = 0xc9bda5;
const DOOR = 0x4d3d2a;
const WINDOW = 0x2b3234;
const IRON = 0x39352f;
const STONE = 0xcabda4;

export function addBuilding(batch: GeoBatch, b: BuildingSpec): void {
  const wall = WALLS[b.wall];
  const roof = ROOFS[b.roof];

  if (b.style === 'tower') {
    addTower(batch, b, wall, roof);
    return;
  }

  batch.box(b.w, b.h, b.d, b.x, b.h / 2, b.z, wall);
  batch.box(b.w + 0.28, 0.46, b.d + 0.28, b.x, 0.23, b.z, PLINTH);
  batch.box(b.w + 0.2, 0.16, b.d + 0.2, b.x, b.h - 0.08, b.z, TRIM);

  const ridgeAlongX = b.d <= b.w && b.style !== 'church';
  const span = ridgeAlongX ? b.d : b.w;
  const rise = b.style === 'church' ? 2.4 : Math.min(2.3, Math.max(1.25, span * 0.4));
  const overhang = 0.42;
  addRoof(batch, b, ridgeAlongX, rise, overhang, roof);
  addGable(batch, b, ridgeAlongX, rise, wall);

  if (b.chimney) addChimney(batch, b, rise);

  if (b.style === 'church') {
    addChurchDetails(batch, b, roof);
  } else {
    addDoor(batch, b, b.door);
    addWindows(batch, b);
    if (b.style === 'cafe' || b.style === 'shop') addBalcony(batch, b, b.door);
    if (b.style === 'hall') addHallDetails(batch, b);
  }
}

function addRoof(
  batch: GeoBatch,
  b: BuildingSpec,
  ridgeAlongX: boolean,
  rise: number,
  overhang: number,
  roof: number
): void {
  const half = (ridgeAlongX ? b.d : b.w) / 2 + overhang;
  const slope = Math.hypot(half, rise) + 0.3;
  const angle = Math.atan2(rise, half);

  if (ridgeAlongX) {
    batch.box(
      b.w + overhang * 2,
      0.16,
      slope,
      b.x,
      b.h + rise / 2,
      b.z + half / 2,
      roof,
      angle,
      0,
      0
    );
    batch.box(
      b.w + overhang * 2,
      0.16,
      slope,
      b.x,
      b.h + rise / 2,
      b.z - half / 2,
      roof,
      -angle,
      0,
      0
    );
    batch.box(b.w + overhang * 2 + 0.1, 0.13, 0.24, b.x, b.h + rise + 0.03, b.z, shade(roof, -0.12));
  } else {
    batch.box(
      slope,
      0.16,
      b.d + overhang * 2,
      b.x + half / 2,
      b.h + rise / 2,
      b.z,
      roof,
      0,
      0,
      -angle
    );
    batch.box(
      slope,
      0.16,
      b.d + overhang * 2,
      b.x - half / 2,
      b.h + rise / 2,
      b.z,
      roof,
      0,
      0,
      angle
    );
    batch.box(0.24, 0.13, b.d + overhang * 2 + 0.1, b.x, b.h + rise + 0.03, b.z, shade(roof, -0.12));
  }
}

function addGable(
  batch: GeoBatch,
  b: BuildingSpec,
  ridgeAlongX: boolean,
  rise: number,
  wall: number
): void {
  const half = (ridgeAlongX ? b.d : b.w) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(0, rise);
  shape.closePath();

  const depth = ridgeAlongX ? b.w : b.d;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  if (ridgeAlongX) {
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-depth / 2, 0, 0);
  } else {
    geometry.translate(0, 0, -depth / 2);
  }

  const matrix = new THREE.Matrix4().makeTranslation(b.x, b.h, b.z);
  batch.add(geometry, wall, matrix);
  geometry.dispose();
}

function addChimney(batch: GeoBatch, b: BuildingSpec, rise: number): void {
  const x = b.x + b.w * 0.24;
  const z = b.z - b.d * 0.16;
  const base = b.h + rise * 0.55;
  batch.box(0.55, 1.3, 0.55, x, base, z, 0xd8c5a8);
  batch.box(0.75, 0.14, 0.75, x, base + 0.7, z, 0xb6a78d);
  batch.box(0.36, 0.14, 0.36, x, base + 0.79, z, 0x3d3832);
}

function addDoor(batch: GeoBatch, b: BuildingSpec, side: DoorSide): void {
  const width = b.style === 'hall' ? 1.35 : 1.05;
  const height = b.style === 'hall' ? 2.55 : 2.3;
  const face = facade(b, side);
  const offset = 0.02;

  if (b.style === 'church') {
    addArchedPanel(batch, b, side, width + 0.4, height + 0.3, TRIM, 0);
    addArchedPanel(batch, b, side, width, height, DOOR, 0.03);
  } else {
    const doorY = height / 2;
    addPanel(batch, face, offset, width + 0.32, height + 0.26, 0.09, TRIM, doorY);
    addPanel(batch, face, offset + 0.03, width, height, 0.12, DOOR, doorY);
    addPanel(batch, face, offset + 0.07, width * 0.82, 0.06, 0.04, 0x31271e, 1.05);
    batch.box(
      face.tangent === 'x' ? width + 0.7 : 0.55,
      0.12,
      face.tangent === 'x' ? 0.55 : width + 0.7,
      face.x + face.nx * 0.35,
      0.06,
      face.z + face.nz * 0.35,
      STONE
    );
    if (b.style === 'shop' || b.style === 'cafe') {
      batch.box(0.16, 0.24, 0.16, face.x + face.nx * 0.2, height + 0.55, face.z + face.nz * 0.2, IRON);
    }
  }
}

function addWindows(batch: GeoBatch, b: BuildingSpec): void {
  const faces: DoorSide[] = ['s', 'n', 'e', 'w'];
  const rows = b.style === 'hall' ? [1.9, 4.35, 5.45] : [1.7, 3.25];
  for (const side of faces) {
    const length = side === 's' || side === 'n' ? b.w : b.d;
    const count = length > 7 ? 2 : 1;
    const usable = Math.max(1.4, length - 2.6);
    for (let row = 0; row < rows.length; row++) {
      for (let i = 0; i < count; i++) {
        const y = rows[row];
        if (y > b.h - 0.7) continue;
        if (row === 0 && side === b.door) continue;
        if (b.style === 'shop' && row === 0) continue;
        const centered = count === 1 ? 0 : (i === 0 ? -usable / 2 : usable / 2);
        addWindow(batch, b, side, centered, y, 0.72, 0.96, row > 0);
      }
    }
  }
}

function addWindow(
  batch: GeoBatch,
  b: BuildingSpec,
  side: DoorSide,
  offset: number,
  y: number,
  width: number,
  height: number,
  upper: boolean
): void {
  const face = facade(b, side, offset);
  addPanel(batch, face, 0.03, width + 0.16, height + 0.16, 0.07, TRIM, y);
  addPanel(batch, face, 0.05, width, height, 0.1, WINDOW, y);
  addPanel(batch, face, 0.08, width * 0.1, height * 0.9, 0.02, 0x4b5452, y);
  addPanel(batch, face, 0.08, width * 0.9, height * 0.08, 0.02, 0x4b5452, y);

  batch.box(
    face.tangent === 'x' ? width + 0.3 : 0.24,
    0.08,
    face.tangent === 'x' ? 0.24 : width + 0.3,
    face.x + face.nx * 0.1,
    y - height / 2 - 0.04,
    face.z + face.nz * 0.1,
    TRIM
  );

  if (upper) {
    const shutterColor = b.wall === 'rose' || b.wall === 'ochre' ? 0x6b5337 : 0x526b57;
    for (const direction of [-1, 1]) {
      const tangentOffset = direction * (width / 2 + width * 0.26);
      const shutter = facade(b, side, offset + tangentOffset);
      addPanel(batch, shutter, 0.04, width * 0.45, height, 0.05, shutterColor, y);
    }
  }
}

interface Facade {
  x: number;
  z: number;
  nx: number;
  nz: number;
  tangent: 'x' | 'z';
}

function facade(b: BuildingSpec, side: DoorSide, offset = 0): Facade {
  switch (side) {
    case 's':
      return { x: b.x + offset, z: b.z + b.d / 2 + 0.02, nx: 0, nz: 1, tangent: 'x' };
    case 'n':
      return { x: b.x + offset, z: b.z - b.d / 2 - 0.02, nx: 0, nz: -1, tangent: 'x' };
    case 'e':
      return { x: b.x + b.w / 2 + 0.02, z: b.z + offset, nx: 1, nz: 0, tangent: 'z' };
    case 'w':
      return { x: b.x - b.w / 2 - 0.02, z: b.z + offset, nx: -1, nz: 0, tangent: 'z' };
  }
}

function addPanel(
  batch: GeoBatch,
  face: Facade,
  offset: number,
  width: number,
  height: number,
  depth: number,
  color: number,
  centerY: number
): void {
  const x = face.x + face.nx * offset;
  const z = face.z + face.nz * offset;
  if (face.tangent === 'x') {
    batch.box(width, height, depth, x, centerY, z, color);
  } else {
    batch.box(depth, height, width, x, centerY, z, color);
  }
}

function addArchedPanel(
  batch: GeoBatch,
  b: BuildingSpec,
  side: DoorSide,
  width: number,
  height: number,
  color: number,
  outward: number
): void {
  const radius = width / 2;
  const straight = Math.max(0.2, height - radius);
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, straight);
  shape.absarc(0, straight, radius, 0, Math.PI, false);
  shape.lineTo(-radius, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
  const face = facade(b, side);
  const ry = side === 's' ? 0 : side === 'n' ? Math.PI : side === 'e' ? Math.PI / 2 : -Math.PI / 2;
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(face.x + face.nx * outward, 0, face.z + face.nz * outward),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(1, 1, 1)
  );
  batch.add(geometry, color, matrix);
  geometry.dispose();
}

function addBalcony(batch: GeoBatch, b: BuildingSpec, side: DoorSide): void {
  const face = facade(b, side);
  const alongX = face.tangent === 'x';
  const width = 3.1;
  const depth = 0.92;
  const x = face.x + face.nx * 0.55;
  const z = face.z + face.nz * 0.55;
  batch.box(alongX ? width : depth, 0.14, alongX ? depth : width, x, 3.0, z, TRIM);
  batch.box(alongX ? width : depth, 0.09, alongX ? depth : width, x, 3.08, z, STONE);

  const railY = 3.52;
  batch.box(alongX ? width : 0.07, 0.07, alongX ? 0.07 : width, x + face.nx * 0.4, railY, z + face.nz * 0.4, IRON);
  for (let i = 0; i < 6; i++) {
    const offset = (i / 5 - 0.5) * (width - 0.3);
    batch.box(
      0.045,
      0.72,
      0.045,
      x + (alongX ? offset : face.nx * 0.4),
      railY - 0.36,
      z + (alongX ? face.nz * 0.4 : offset),
      IRON
    );
  }
  batch.box(alongX ? 0.07 : 0.07, 0.07, alongX ? 0.07 : 0.07, x, railY, z, IRON);
}

function addHallDetails(batch: GeoBatch, b: BuildingSpec): void {
  const face = facade(b, b.door);
  for (const side of [-1, 1]) {
    const offset = side * (b.w / 2 - 0.55);
    const f = facade(b, b.door, offset);
    batch.box(
      f.tangent === 'x' ? 0.34 : 0.22,
      4.8,
      f.tangent === 'x' ? 0.22 : 0.34,
      f.x + f.nx * 0.12,
      2.4,
      f.z + f.nz * 0.12,
      TRIM
    );
  }
  batch.box(
    face.tangent === 'x' ? 1.1 : 0.3,
    0.8,
    face.tangent === 'x' ? 0.3 : 1.1,
    face.x + face.nx * 0.22,
    4.65,
    face.z + face.nz * 0.22,
    0x8f6f42
  );
}

function addChurchDetails(batch: GeoBatch, b: BuildingSpec, roof: number): void {
  addDoor(batch, b, 'e');

  /* Pilasters and a stone band on the front. */
  for (const offset of [-3.6, 3.6]) {
    batch.box(0.5, 7.1, 0.35, b.x + b.w / 2 + 0.16, 3.55, b.z + offset, TRIM);
  }
  batch.box(0.3, 0.24, b.d, b.x + b.w / 2 + 0.16, 6.9, b.z, TRIM);

  /* Rose window. */
  const x = b.x + b.w / 2 + 0.12;
  const y = 5.35;
  const glass = new THREE.CylinderGeometry(0.82, 0.82, 0.14, 18);
  batch.add(
    glass,
    WINDOW,
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, b.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
      new THREE.Vector3(1, 1, 1)
    )
  );
  glass.dispose();
  const ring = new THREE.TorusGeometry(0.88, 0.1, 6, 18);
  batch.add(
    ring,
    TRIM,
    new THREE.Matrix4().compose(
      new THREE.Vector3(x + 0.03, y, b.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
      new THREE.Vector3(1, 1, 1)
    )
  );
  ring.dispose();
  for (const angle of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
    batch.box(0.06, 0.06, 0.06, x, y, b.z, TRIM);
    batch.box(
      0.04,
      1.5,
      0.04,
      x + 0.04,
      y,
      b.z,
      TRIM,
      0,
      0,
      angle
    );
  }

  /* Cross above the gable. */
  batch.box(0.13, 1.35, 0.13, b.x, b.h + 3.0, b.z, IRON);
  batch.box(0.13, 0.13, 0.72, b.x, b.h + 3.25, b.z, IRON);

  /* Tall side windows. */
  for (const side of ['n', 's'] as DoorSide[]) {
    for (const offset of [-5, 0, 5]) {
      const face = facade(b, side, offset);
      addPanel(batch, face, 0.04, 0.62, 1.8, 0.06, TRIM, 3.6);
      addPanel(batch, face, 0.07, 0.48, 1.64, 0.09, WINDOW, 3.6);
      batch.box(
        face.tangent === 'x' ? 0.9 : 0.22,
        0.1,
        face.tangent === 'x' ? 0.22 : 0.9,
        face.x + face.nx * 0.1,
        3.0,
        face.z + face.nz * 0.1,
        TRIM
      );
    }
  }

  /* A small bell gable on the roof ridge. */
  batch.box(1.2, 0.8, 0.7, b.x, b.h + 2.45, b.z, TRIM);
  batch.box(0.7, 0.5, 0.72, b.x, b.h + 2.5, b.z, WINDOW);
  batch.cone(0.85, 0.5, 4, b.x, b.h + 3.1, b.z, roof, Math.PI / 4);
}

function addTower(batch: GeoBatch, b: BuildingSpec, wall: number, roof: number): void {
  batch.box(b.w, b.h, b.d, b.x, b.h / 2, b.z, wall);
  batch.box(b.w + 0.3, 0.5, b.d + 0.3, b.x, 0.25, b.z, PLINTH);
  batch.box(b.w + 0.24, 0.2, b.d + 0.24, b.x, b.h - 0.1, b.z, TRIM);
  batch.box(b.w + 0.5, 0.14, b.d + 0.5, b.x, b.h, b.z, TRIM);

  /* Arched belfry opening on the south face. */
  const z = b.z + b.d / 2 + 0.03;
  addArchedPanelAt(batch, b.x, z, 8.0, 1.7, 2.5, WINDOW, 0);
  addArchedPanelAt(batch, b.x, z + 0.015, 7.88, 2.0, 2.8, TRIM, 0);
  addArchedPanelAt(batch, b.x, z + 0.03, 8.0, 1.7, 2.5, WINDOW, 0);

  /* Clock. */
  const clockGlass = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16);
  batch.add(
    clockGlass,
    0xf0e6cc,
    new THREE.Matrix4().compose(
      new THREE.Vector3(b.x, 7.2, b.z + b.d / 2 + 0.04),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      new THREE.Vector3(1, 1, 1)
    )
  );
  clockGlass.dispose();
  batch.box(0.07, 0.46, 0.04, b.x, 7.28, b.z + b.d / 2 + 0.1, IRON);
  batch.box(0.3, 0.06, 0.04, b.x + 0.12, 7.14, b.z + b.d / 2 + 0.1, IRON);

  /* Pyramid roof and cross. */
  batch.cone(3.1, 2.3, 4, b.x, b.h + 1.25, b.z, roof, Math.PI / 4);
  batch.box(0.1, 1.1, 0.1, b.x, b.h + 3.0, b.z, IRON);
  batch.box(0.1, 0.1, 0.55, b.x, b.h + 3.2, b.z, IRON);

  /* A narrow window lower down. */
  addPanel(batch, facade(b, 's', 0), 0.04, 0.42, 1.1, 0.06, TRIM, 2.0);
  addPanel(batch, facade(b, 's', 0), 0.07, 0.3, 0.98, 0.09, WINDOW, 2.0);
}

function addArchedPanelAt(
  batch: GeoBatch,
  x: number,
  z: number,
  y: number,
  width: number,
  height: number,
  color: number,
  ry: number
): void {
  const radius = width / 2;
  const straight = Math.max(0.2, height - radius);
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, straight);
  shape.absarc(0, straight, radius, 0, Math.PI, false);
  shape.lineTo(-radius, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(1, 1, 1)
  );
  batch.add(geometry, color, matrix);
  geometry.dispose();
}

export function createSign(b: BuildingSpec): THREE.Mesh | null {
  if (!b.sign) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#f6edd8';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#3b3126';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#3b3126';
  ctx.font = '600 62px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.sign, 256, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const church = b.style === 'church';
  const width = church ? 3.4 : 2.5;
  const height = church ? 0.72 : 0.56;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);

  const face = facade(b, b.door);
  const ry = b.door === 's' ? 0 : b.door === 'n' ? Math.PI : b.door === 'e' ? Math.PI / 2 : -Math.PI / 2;
  mesh.position.set(face.x + face.nx * 0.12, church ? 4.0 : 2.88, face.z + face.nz * 0.12);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function shade(color: number, amount: number): number {
  const c = new THREE.Color(color);
  c.offsetHSL(0, 0, amount);
  return c.getHex();
}
