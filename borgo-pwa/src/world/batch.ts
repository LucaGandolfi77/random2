import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const IDENTITY = new THREE.Matrix4();
const COLOR = new THREE.Color();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const SCALE = new THREE.Vector3(1, 1, 1);
const EULER = new THREE.Euler();

/* Collects static geometry into a single merged mesh. The whole town is
   three or four draw calls instead of several hundred, which is what keeps
   the game smooth on a phone. */
export class GeoBatch {
  private parts: THREE.BufferGeometry[] = [];

  get size(): number {
    return this.parts.length;
  }

  add(
    source: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    matrix: THREE.Matrix4 = IDENTITY
  ): void {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('uv1');
    geometry.deleteAttribute('uv2');
    geometry.deleteAttribute('tangent');
    geometry.applyMatrix4(matrix);

    const count = geometry.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    COLOR.set(color);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = COLOR.r;
      colors[i * 3 + 1] = COLOR.g;
      colors[i * 3 + 2] = COLOR.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(geometry);
    if (geometry !== source) source.dispose();
  }

  box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    rx = 0,
    ry = 0,
    rz = 0
  ): void {
    const geometry = new THREE.BoxGeometry(w, h, d);
    this.add(geometry, color, this.matrix(x, y, z, rx, ry, rz));
    geometry.dispose();
  }

  cylinder(
    top: number,
    bottom: number,
    height: number,
    segments: number,
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    rx = 0,
    ry = 0,
    rz = 0
  ): void {
    const geometry = new THREE.CylinderGeometry(top, bottom, height, segments);
    this.add(geometry, color, this.matrix(x, y, z, rx, ry, rz));
    geometry.dispose();
  }

  cone(
    radius: number,
    height: number,
    segments: number,
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    ry = 0
  ): void {
    const geometry = new THREE.ConeGeometry(radius, height, segments);
    this.add(geometry, color, this.matrix(x, y, z, 0, ry, 0));
    geometry.dispose();
  }

  sphere(
    radius: number,
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    detail = 0,
    sy = 1
  ): void {
    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    this.add(geometry, color, this.matrix(x, y, z, 0, 0, 0, 1, sy, 1));
    geometry.dispose();
  }

  matrix(
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1
  ): THREE.Matrix4 {
    POSITION.set(x, y, z);
    EULER.set(rx, ry, rz);
    QUATERNION.setFromEuler(EULER);
    SCALE.set(sx, sy, sz);
    return new THREE.Matrix4().compose(POSITION, QUATERNION, SCALE);
  }

  build(material: THREE.Material): THREE.Mesh | null {
    if (this.parts.length === 0) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const part of this.parts) part.dispose();
    this.parts = [];
    if (!merged) return null;
    merged.computeBoundingSphere();
    return new THREE.Mesh(merged, material);
  }
}

export function staticMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
}

export function glowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
}

export function paintGeometry(
  geometry: THREE.BufferGeometry,
  color: THREE.ColorRepresentation
): THREE.BufferGeometry {
  const next = geometry.index ? geometry.toNonIndexed() : geometry;
  if (next !== geometry) geometry.dispose();
  const count = next.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  next.deleteAttribute('uv');
  return next;
}
