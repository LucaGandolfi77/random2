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

const V_A = new THREE.Vector3();
const V_B = new THREE.Vector3();
const V_C = new THREE.Vector3();
const V_D = new THREE.Vector3();
const V_N = new THREE.Vector3();

/* A raw triangle collector for the city. Building polygons, roofs and window
   boxes are appended as plain floats instead of thousands of tiny
   BufferGeometries, which keeps both memory and startup time sane. */
export class TriBatch {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private color = new THREE.Color();

  get triangles(): number {
    return this.positions.length / 9;
  }

  tri(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    color: THREE.ColorRepresentation
  ): void {
    V_A.set(ax, ay, az);
    V_B.set(bx, by, bz);
    V_C.set(cx, cy, cz);
    V_N.subVectors(V_B, V_A).cross(V_D.subVectors(V_C, V_A));
    if (V_N.lengthSq() < 1e-9) return;
    V_N.normalize();
    this.color.set(color);
    this.positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    for (let i = 0; i < 3; i++) {
      this.normals.push(V_N.x, V_N.y, V_N.z);
      this.colors.push(this.color.r, this.color.g, this.color.b);
    }
  }

  quad(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
    color: THREE.ColorRepresentation
  ): void {
    this.tri(ax, ay, az, bx, by, bz, cx, cy, cz, color);
    this.tri(ax, ay, az, cx, cy, cz, dx, dy, dz, color);
  }

  /** A quad whose visible normal must point up (ground, roof, platform). */
  quadUp(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
    color: THREE.ColorRepresentation
  ): void {
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    if (ny < 0) this.quad(ax, ay, az, dx, dy, dz, cx, cy, cz, bx, by, bz, color);
    else this.quad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, color);
  }

  /** Vertical wall quad with the visible side facing the given outward vector. */
  wallQuad(
    ax: number,
    az: number,
    bx: number,
    bz: number,
    y0: number,
    y1: number,
    outX: number,
    outZ: number,
    color: THREE.ColorRepresentation
  ): void {
    const sign = (bz - az) * outX - (bx - ax) * outZ;
    if (sign >= 0) {
      this.quad(ax, y0, az, ax, y1, az, bx, y1, bz, bx, y0, bz, color);
    } else {
      this.quad(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y1, az, color);
    }
  }

  box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    ry = 0
  ): void {
    const cos = Math.cos(ry);
    const sin = Math.sin(ry);
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    const p: Array<[number, number, number]> = [
      [-hw, -hh, -hd],
      [hw, -hh, -hd],
      [hw, -hh, hd],
      [-hw, -hh, hd],
      [-hw, hh, -hd],
      [hw, hh, -hd],
      [hw, hh, hd],
      [-hw, hh, hd]
    ].map(([px, py, pz]) => [x + px * cos + pz * sin, y + py, z - px * sin + pz * cos]);

    const face = (a: number, b: number, c: number, e: number): void => {
      const [ax, ay, az] = p[a];
      const [bx, by, bz] = p[b];
      const [cx, cy, cz] = p[c];
      const [dx, dy, dz] = p[e];
      this.quad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, color);
    };

    face(4, 7, 6, 5); // top
    face(0, 1, 2, 3); // bottom
    face(5, 6, 2, 1); // +x
    face(0, 3, 7, 4); // -x
    face(2, 6, 7, 3); // +z
    face(0, 4, 5, 1); // -z
  }
  polygonTop(pts: number[], y: number, color: THREE.ColorRepresentation): void {
    const count = pts.length / 2;
    if (count < 3) return;
    const contour: THREE.Vector2[] = [];
    for (let i = 0; i < count; i++) contour.push(new THREE.Vector2(pts[i * 2], pts[i * 2 + 1]));
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const [a, b, c] of faces) {
      const ax = contour[a].x;
      const az = contour[a].y;
      const bx = contour[b].x;
      const bz = contour[b].y;
      const cx = contour[c].x;
      const cz = contour[c].y;
      const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      if (ny >= 0) this.tri(ax, y, az, bx, y, bz, cx, y, cz, color);
      else this.tri(ax, y, az, cx, y, cz, bx, y, bz, color);
    }
  }

  disc(
    x: number,
    y: number,
    z: number,
    radius: number,
    segments: number,
    color: THREE.ColorRepresentation
  ): void {
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const b = ((i + 1) / segments) * Math.PI * 2;
      this.tri(
        x,
        y,
        z,
        x + Math.cos(a) * radius,
        y,
        z + Math.sin(a) * radius,
        x + Math.cos(b) * radius,
        y,
        z + Math.sin(b) * radius,
        color
      );
    }
  }

  build(material: THREE.Material): THREE.Mesh | null {
    if (this.positions.length === 0) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, material);
  }
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
