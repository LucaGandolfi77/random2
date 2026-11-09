import * as THREE from 'three';
import type { Prop, Road } from '../types';
import { materials } from '../materials/library';
import { MeshBuilder } from '../utils';

function materialFor(surface: string): THREE.Material {
  if (surface === 'paving') return materials.paving;
  if (surface === 'gravel') return materials.gravel;
  return materials.asphalt;
}

function addSidewalks(builder: MeshBuilder, curbBuilder: MeshBuilder, road: Road): void {
  const points = road.points;
  if (points.length < 2) return;
  const half = road.width_m / 2;
  const sidewalkWidth = road.kind === 'pedestrian' ? 0 : 1.8;
  if (sidewalkWidth <= 0) return;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index];
    const p1 = points[index + 1];
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 2)];
    const dir0 = new THREE.Vector3(p1[0] - prev[0], 0, p1[2] - prev[2]).normalize();
    const dir1 = new THREE.Vector3(next[0] - p0[0], 0, next[2] - p0[2]).normalize();
    const n0 = new THREE.Vector3(-dir0.z, 0, dir0.x);
    const n1 = new THREE.Vector3(-dir1.z, 0, dir1.x);
    for (const sign of [1, -1]) {
      const inner0 = new THREE.Vector3(p0[0] + n0.x * half * sign, p0[1] + 0.14, p0[2] + n0.z * half * sign);
      const inner1 = new THREE.Vector3(p1[0] + n1.x * half * sign, p1[1] + 0.14, p1[2] + n1.z * half * sign);
      const outer0 = new THREE.Vector3(
        p0[0] + n0.x * (half + sidewalkWidth) * sign,
        p0[1] + 0.14,
        p0[2] + n0.z * (half + sidewalkWidth) * sign,
      );
      const outer1 = new THREE.Vector3(
        p1[0] + n1.x * (half + sidewalkWidth) * sign,
        p1[1] + 0.14,
        p1[2] + n1.z * (half + sidewalkWidth) * sign,
      );
      builder.addQuad(inner0, inner1, outer1, outer0, [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]);
      const curb0 = new THREE.Vector3(
        p0[0] + n0.x * half * sign,
        p0[1] + 0.02,
        p0[2] + n0.z * half * sign,
      );
      const curb1 = new THREE.Vector3(
        p1[0] + n1.x * half * sign,
        p1[1] + 0.02,
        p1[2] + n1.z * half * sign,
      );
      const curbTop0 = curb0.clone().setY(p0[1] + 0.15);
      const curbTop1 = curb1.clone().setY(p1[1] + 0.15);
      curbBuilder.addQuad(curb0, curb1, curbTop1, curbTop0, [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]);
    }
  }
}

function addMarkings(builder: MeshBuilder, road: Road): void {
  if (!road.markings || road.width_m < 5.4) return;
  const points = road.points;
  let distance = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index];
    const p1 = points[index + 1];
    const dx = p1[0] - p0[0];
    const dz = p1[2] - p0[2];
    const segment = Math.hypot(dx, dz);
    if (segment < 0.01) continue;
    const dir = new THREE.Vector3(dx / segment, 0, dz / segment);
    const normal = new THREE.Vector3(-dir.z, 0, dir.x);
    let cursor = 0;
    while (cursor < segment) {
      const dashStart = cursor;
      const dashEnd = Math.min(segment, cursor + 2.6);
      if (distance + dashStart > 5 && (distance + dashStart) % 11 < 2.6) {
        const centre0 = new THREE.Vector3(
          p0[0] + dir.x * dashStart,
          p0[1] + 0.03,
          p0[2] + dir.z * dashStart,
        );
        const centre1 = new THREE.Vector3(
          p0[0] + dir.x * dashEnd,
          p1[1] + 0.03,
          p0[2] + dir.z * dashEnd,
        );
        const half = 0.07;
        builder.addQuad(
          centre0.clone().add(normal.clone().multiplyScalar(half)),
          centre1.clone().add(normal.clone().multiplyScalar(half)),
          centre1.clone().add(normal.clone().multiplyScalar(-half)),
          centre0.clone().add(normal.clone().multiplyScalar(-half)),
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        );
      }
      cursor += 2.0;
    }
    distance += segment;
  }
}

function nearestRoad(prop: Prop, roads: Road[]): { road: Road; direction: THREE.Vector3 } | null {
  let best: { distance: number; road: Road; direction: THREE.Vector3 } | null = null;
  for (const road of roads) {
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const a = road.points[index];
      const b = road.points[index + 1];
      const ab = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]);
      const ap = new THREE.Vector3(prop.x - a[0], 0, prop.z - a[2]);
      const lengthSq = ab.lengthSq();
      if (lengthSq < 0.01) continue;
      const t = Math.max(0, Math.min(1, ap.dot(ab) / lengthSq));
      const closest = new THREE.Vector3(a[0], 0, a[2]).addScaledVector(ab, t);
      const distance = Math.hypot(prop.x - closest.x, prop.z - closest.z);
      if (!best || distance < best.distance) {
        best = { distance, road, direction: ab.normalize() };
      }
    }
  }
  if (!best || best.distance > 18) return null;
  return { road: best.road, direction: best.direction };
}

export function buildStreets(roads: Road[], props: Prop[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'streets';
  const sidewalkBuilder = new MeshBuilder();
  const curbBuilder = new MeshBuilder();
  const markingBuilder = new MeshBuilder();
  const crosswalkBuilder = new MeshBuilder();

  for (const road of roads) {
    addSidewalks(sidewalkBuilder, curbBuilder, road);
    addMarkings(markingBuilder, road);
  }

  for (const prop of props) {
    if (prop.kind !== 'crossing') continue;
    const nearest = nearestRoad(prop, roads);
    if (!nearest) continue;
    const roadDirection = nearest.direction.clone().normalize();
    const across = new THREE.Vector3(-roadDirection.z, 0, roadDirection.x);
    const halfWidth = nearest.road.width_m * 0.36;
    for (let index = -2; index <= 2; index += 1) {
      const centre = new THREE.Vector3(prop.x, prop.y, prop.z).addScaledVector(
        roadDirection,
        index * 1.15,
      );
      const a = centre.clone().addScaledVector(across, halfWidth).addScaledVector(roadDirection, 0.22);
      const b = centre.clone().addScaledVector(across, -halfWidth).addScaledVector(roadDirection, 0.22);
      const c = centre.clone().addScaledVector(across, -halfWidth).addScaledVector(roadDirection, -0.22);
      const d = centre.clone().addScaledVector(across, halfWidth).addScaledVector(roadDirection, -0.22);
      for (const point of [a, b, c, d]) point.y = prop.y + 0.035;
      crosswalkBuilder.addQuad(a, b, c, d, [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]);
    }
  }


  if (sidewalkBuilder.positions.length) {
    const sidewalkMesh = new THREE.Mesh(sidewalkBuilder.build(), materials.paving);
    sidewalkMesh.receiveShadow = true;
    group.add(sidewalkMesh);
  }
  if (curbBuilder.positions.length) {
    const curbMesh = new THREE.Mesh(curbBuilder.build(), materials.curb);
    curbMesh.receiveShadow = true;
    group.add(curbMesh);
  }
  if (markingBuilder.positions.length) {
    const markingMesh = new THREE.Mesh(markingBuilder.build(), materials.marking);
    markingMesh.receiveShadow = false;
    group.add(markingMesh);
  }
  if (crosswalkBuilder.positions.length) {
    const crosswalkMesh = new THREE.Mesh(crosswalkBuilder.build(), materials.marking);
    crosswalkMesh.receiveShadow = false;
    group.add(crosswalkMesh);
  }
  return group;
}

export function surfaceMaterial(surface: string): THREE.Material {
  return materialFor(surface);
}
