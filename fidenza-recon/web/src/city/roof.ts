import * as THREE from 'three';
import type { Building } from '../types';
import { DetailBatcher } from './facade';
import { MeshBuilder, hashString, mulberry32, shade } from '../utils';

function crossFacing(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  expected: THREE.Vector3,
): boolean {
  const normal = new THREE.Vector3()
    .subVectors(b, a)
    .cross(new THREE.Vector3().subVectors(c, a));
  return normal.dot(expected) >= 0;
}

function addTriFacing(
  builder: MeshBuilder,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  expected: THREE.Vector3,
  uvs: [[number, number], [number, number], [number, number]] = [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
): void {
  if (crossFacing(a, b, c, expected)) builder.addTriangle(a, b, c, uvs[0], uvs[1], uvs[2]);
  else builder.addTriangle(a, c, b, uvs[0], uvs[2], uvs[1]);
}

function addQuadFacing(
  builder: MeshBuilder,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  expected: THREE.Vector3,
  uvs: [[number, number], [number, number], [number, number], [number, number]] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
): void {
  if (crossFacing(a, b, c, expected)) builder.addQuad(a, b, c, d, uvs);
  else builder.addQuad(d, c, b, a, [uvs[3], uvs[2], uvs[1], uvs[0]]);
}

function roofUv(point: THREE.Vector3, u: THREE.Vector3): [number, number] {
  return [point.dot(u) / 2.0, point.y / 2.0];
}

function horizontalPolygon(
  ring: [number, number][],
  holes: [number, number][][],
  y: number,
): THREE.BufferGeometry {
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  const holeVectors = holes.map((hole) => hole.map(([x, z]) => new THREE.Vector2(x, z)));
  const faces = THREE.ShapeUtils.triangulateShape(contour, holeVectors);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const [x, z] of ring) {
    positions.push(x, y, z);
    normals.push(0, 1, 0);
    uvs.push(x / 3, z / 3);
  }
  for (const hole of holes) {
    for (const [x, z] of hole) {
      positions.push(x, y, z);
      normals.push(0, 1, 0);
      uvs.push(x / 3, z / 3);
    }
  }
  const indices: number[] = [];
  for (const face of faces) {
    const a = new THREE.Vector3().fromArray(positions.slice(face[0] * 3, face[0] * 3 + 3));
    const b = new THREE.Vector3().fromArray(positions.slice(face[1] * 3, face[1] * 3 + 3));
    const c = new THREE.Vector3().fromArray(positions.slice(face[2] * 3, face[2] * 3 + 3));
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (normal.y >= 0) indices.push(face[0], face[1], face[2]);
    else indices.push(face[0], face[2], face[1]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export interface RoofGeometry {
  roof: THREE.BufferGeometry | null;
  gable: THREE.BufferGeometry | null;
}

export function buildRoof(
  building: Building,
  batcher: DetailBatcher,
  addDetails = true,
): RoofGeometry {
  const corners = building.min_rect.corners;
  if (corners.length < 4) return { roof: null, gable: null };
  const lengths = corners.map((corner, index) => {
    const next = corners[(index + 1) % 4];
    return Math.hypot(next[0] - corner[0], next[1] - corner[1]);
  });
  const longIndex = lengths.indexOf(Math.max(...lengths));
  const p0 = corners[longIndex];
  const p1 = corners[(longIndex + 1) % 4];
  const p3 = corners[(longIndex + 3) % 4];
  const length = Math.max(2.0, lengths[longIndex]);
  const width = Math.max(2.0, lengths[(longIndex + 3) % 4]);
  const u = new THREE.Vector3(p1[0] - p0[0], 0, p1[1] - p0[1]).normalize();
  const v = new THREE.Vector3(p3[0] - p0[0], 0, p3[1] - p0[1]).normalize();
  const centre = new THREE.Vector3(
    (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
    building.base_y,
    (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4,
  );
  const overhang = Math.max(0.15, building.roof.overhang_m);
  const halfL = length / 2 + overhang;
  const halfW = width / 2 + overhang;
  const eave = building.base_y + building.eave_height_m;
  const roofHeight = Math.max(0.35, building.roof_height_m);
  const ridge = eave + roofHeight;
  const up = new THREE.Vector3(0, 1, 0);
  const random = mulberry32(hashString(building.id));
  const identity = new THREE.Matrix4();

  if (building.roof.shape === 'flat') {
    const roof = horizontalPolygon(building.footprint, building.holes, eave + 0.02);
    const parapetHeight = 0.55;
    const edges: [THREE.Vector3, THREE.Vector3][] = [
      [
        new THREE.Vector3(centre.x - u.x * halfL - v.x * halfW, eave, centre.z - u.z * halfL - v.z * halfW),
        new THREE.Vector3(centre.x + u.x * halfL - v.x * halfW, eave, centre.z + u.z * halfL - v.z * halfW),
      ],
      [
        new THREE.Vector3(centre.x + u.x * halfL - v.x * halfW, eave, centre.z + u.z * halfL - v.z * halfW),
        new THREE.Vector3(centre.x + u.x * halfL + v.x * halfW, eave, centre.z + u.z * halfL + v.z * halfW),
      ],
      [
        new THREE.Vector3(centre.x + u.x * halfL + v.x * halfW, eave, centre.z + u.z * halfL + v.z * halfW),
        new THREE.Vector3(centre.x - u.x * halfL + v.x * halfW, eave, centre.z - u.z * halfL + v.z * halfW),
      ],
      [
        new THREE.Vector3(centre.x - u.x * halfL + v.x * halfW, eave, centre.z - u.z * halfL + v.z * halfW),
        new THREE.Vector3(centre.x - u.x * halfL - v.x * halfW, eave, centre.z - u.z * halfL - v.z * halfW),
      ],
    ];
    for (const [a, b] of edges) {
      if (!addDetails) break;
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const normal = new THREE.Vector3().crossVectors(dir, up).normalize();
      const basis = new THREE.Matrix4()
        .makeBasis(dir, up, normal)
        .setPosition(mid.clone().setY(eave));
      batcher.addBox(
        'concrete',
        basis,
        new THREE.Vector3(0, parapetHeight / 2, 0),
        new THREE.Vector3(a.distanceTo(b), parapetHeight, 0.28),
        shade(building.facade.primary, 1.06),
      );
    }
    const count = addDetails ? (building.area_m2 > 350 ? 2 : 1) : 0;
    for (let index = 0; index < count; index += 1) {
      const offsetU = (random() - 0.5) * length * 0.5;
      const offsetV = (random() - 0.5) * width * 0.4;
      const position = new THREE.Vector3(
        centre.x + u.x * offsetU + v.x * offsetV,
        eave + 0.55,
        centre.z + u.z * offsetU + v.z * offsetV,
      );
      batcher.addBox(
        'concrete',
        identity,
        position,
        new THREE.Vector3(1.2 + random() * 1.2, 1.1, 1.0 + random() * 0.8),
        '#b0aca3',
      );
    }
    return { roof, gable: null };
  }

  const a = new THREE.Vector3(centre.x - u.x * halfL - v.x * halfW, eave, centre.z - u.z * halfL - v.z * halfW);
  const b = new THREE.Vector3(centre.x + u.x * halfL - v.x * halfW, eave, centre.z + u.z * halfL - v.z * halfW);
  const c = new THREE.Vector3(centre.x + u.x * halfL + v.x * halfW, eave, centre.z + u.z * halfL + v.z * halfW);
  const d = new THREE.Vector3(centre.x - u.x * halfL + v.x * halfW, eave, centre.z - u.z * halfL + v.z * halfW);

  const roofBuilder = new MeshBuilder();
  const gableBuilder = new MeshBuilder();

  if (building.roof.shape === 'hipped' || building.roof.shape === 'mansard') {
    const inset = Math.max(1.0, halfW * 0.85);
    const r1 = new THREE.Vector3(
      centre.x - u.x * Math.max(0.1, halfL - inset),
      ridge,
      centre.z - u.z * Math.max(0.1, halfL - inset),
    );
    const r2 = new THREE.Vector3(
      centre.x + u.x * Math.max(0.1, halfL - inset),
      ridge,
      centre.z + u.z * Math.max(0.1, halfL - inset),
    );
    addQuadFacing(roofBuilder, a, b, r2, r1, up, [
      roofUv(a, u),
      roofUv(b, u),
      roofUv(r2, u),
      roofUv(r1, u),
    ]);
    addQuadFacing(roofBuilder, d, c, r2, r1, up, [
      roofUv(d, u),
      roofUv(c, u),
      roofUv(r2, u),
      roofUv(r1, u),
    ]);
    addTriFacing(roofBuilder, b, c, r2, up, [roofUv(b, u), roofUv(c, u), roofUv(r2, u)]);
    addTriFacing(roofBuilder, d, a, r1, up, [roofUv(d, u), roofUv(a, u), roofUv(r1, u)]);
  } else {
    const r1 = new THREE.Vector3(centre.x - u.x * halfL, ridge, centre.z - u.z * halfL);
    const r2 = new THREE.Vector3(centre.x + u.x * halfL, ridge, centre.z + u.z * halfL);
    addQuadFacing(roofBuilder, a, b, r2, r1, up, [
      roofUv(a, u),
      roofUv(b, u),
      roofUv(r2, u),
      roofUv(r1, u),
    ]);
    addQuadFacing(roofBuilder, d, c, r2, r1, up, [
      roofUv(d, u),
      roofUv(c, u),
      roofUv(r2, u),
      roofUv(r1, u),
    ]);
    addTriFacing(gableBuilder, a, d, r1, u.clone().negate(), [
      [0, 0],
      [1, 0],
      [0.5, 1],
    ]);
    addTriFacing(gableBuilder, b, c, r2, u, [
      [0, 0],
      [1, 0],
      [0.5, 1],
    ]);
  }

  const chimneys = addDetails ? 1 + (random() > 0.55 ? 1 : 0) : 0;
  for (let index = 0; index < chimneys; index += 1) {
    const offset = (random() - 0.5) * halfL * 1.2;
    const position = new THREE.Vector3(
      centre.x + u.x * offset + v.x * (width * 0.18),
      ridge + 0.7,
      centre.z + u.z * offset + v.z * (width * 0.18),
    );
    batcher.addBox(
      'concrete',
      identity,
      position,
      new THREE.Vector3(0.55, 1.5, 0.55),
      shade(building.facade.primary, 0.8),
    );
    batcher.addBox(
      'concrete',
      identity,
      position.clone().setY(position.y + 0.78),
      new THREE.Vector3(0.75, 0.12, 0.75),
      '#8f8578',
    );
  }

  return {
    roof: roofBuilder.build(),
    gable: gableBuilder.positions.length ? gableBuilder.build() : null,
  };
}

export function flatFootprintGeometry(building: Building, yOffset = 0.03): THREE.BufferGeometry {
  return horizontalPolygon(building.footprint, building.holes, building.base_y + yOffset);
}

export function massingGeometry(building: Building): THREE.BufferGeometry {
  const builder = new MeshBuilder();
  const eave = building.base_y + building.eave_height_m;
  for (const side of building.sides) {
    const a = new THREE.Vector3(side.p1[0], building.base_y, side.p1[1]);
    const b = new THREE.Vector3(side.p2[0], building.base_y, side.p2[1]);
    const c = new THREE.Vector3(side.p2[0], eave, side.p2[1]);
    const d = new THREE.Vector3(side.p1[0], eave, side.p1[1]);
    const expected = new THREE.Vector3(side.normal[0], 0, side.normal[1]);
    addQuadFacing(builder, a, b, c, d, expected, [
      [0, 0],
      [side.length_m / 3, 0],
      [side.length_m / 3, building.eave_height_m / 3],
      [0, building.eave_height_m / 3],
    ]);
  }
  const geometry = builder.build();
  const cap = horizontalPolygon(building.footprint, building.holes, eave);
  const capPositions = cap.getAttribute('position');
  const capNormals = cap.getAttribute('normal');
  const capUvs = cap.getAttribute('uv');
  const positions = Array.from(geometry.getAttribute('position').array as Float32Array);
  const normals = Array.from(geometry.getAttribute('normal').array as Float32Array);
  const uvs = Array.from(geometry.getAttribute('uv').array as Float32Array);
  const offset = positions.length / 3;
  for (let index = 0; index < capPositions.count; index += 1) {
    positions.push(capPositions.getX(index), capPositions.getY(index), capPositions.getZ(index));
    normals.push(capNormals.getX(index), capNormals.getY(index), capNormals.getZ(index));
    uvs.push(capUvs.getX(index), capUvs.getY(index));
  }
  const indices: number[] = [];
  const baseIndex = geometry.getIndex();
  if (baseIndex) {
    for (const value of baseIndex.array as Uint32Array | Uint16Array) indices.push(value);
  } else {
    for (let index = 0; index < offset; index += 1) indices.push(index);
  }
  const capIndex = cap.getIndex();
  if (capIndex) {
    for (const value of capIndex.array as Uint32Array | Uint16Array) indices.push(offset + value);
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  result.setIndex(indices);
  geometry.dispose();
  cap.dispose();
  return result;
}
