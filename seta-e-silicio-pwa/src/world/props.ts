import * as THREE from "three";

const mat = (color: number, roughness = 0.9, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

const glowMat = (color: number, intensity = 1.5) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.05,
    flatShading: true
  });

function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export interface WaterLike {
  mesh: THREE.Mesh;
  update(time: number): void;
  dispose(): void;
}

export function createWater(color: number, width = 8, length = 56, z = -9): WaterLike {
  const geometry = new THREE.PlaneGeometry(length, width, 72, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.2,
    metalness: 0.55,
    transparent: true,
    opacity: 0.92,
    flatShading: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.02, z);
  mesh.receiveShadow = true;
  const base = geometry.attributes.position.array.slice() as Float32Array;
  return {
    mesh,
    update(time) {
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        pos.setZ(i, Math.sin(x * 0.45 + time * 1.1) * 0.07 + Math.cos(y * 0.7 + time * 0.8) * 0.05);
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}

export function createEmbankment(color: number): THREE.Group {
  const group = new THREE.Group();
  const stone = mat(color);
  const dark = mat(0x4f5148);
  box(group, 58, 0.7, 1.2, stone, 0, 0.15, -5.6);
  box(group, 58, 0.7, 1.2, stone, 0, 0.15, -12.4);
  box(group, 58, 0.35, 0.6, dark, 0, 0.55, -5.6);
  box(group, 58, 0.35, 0.6, dark, 0, 0.55, -12.4);
  for (let x = -26; x <= 26; x += 4) {
    box(group, 0.5, 0.7, 1.3, dark, x, 0.7, -5.6);
    box(group, 0.5, 0.7, 1.3, dark, x, 0.7, -12.4);
  }
  return group;
}

export function createBridge(stoneColor = 0x8f8a7b, accent = 0xb35a43): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0, -9);
  const stone = mat(stoneColor);
  const dark = mat(0x55584f);
  const red = mat(accent);
  for (let index = 0; index < 9; index += 1) {
    const z = -4 + index;
    const y = 0.4 + Math.sin((index / 8) * Math.PI) * 1.4;
    box(group, 3.8, 0.28, 1.05, stone, 0, y, z);
    box(group, 0.18, 0.9, 0.18, dark, -1.85, y + 0.55, z);
    box(group, 0.18, 0.9, 0.18, dark, 1.85, y + 0.55, z);
  }
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 9 }, (_, index) => {
        const z = -4 + index;
        const y = 1.55 + Math.sin((index / 8) * Math.PI) * 1.4;
        return new THREE.Vector3(side * 1.85, y, z);
      })
    );
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.055, 5, false), red);
    rail.castShadow = true;
    group.add(rail);
  }
  return group;
}

export function createHouse(width: number, depth: number, height: number, wall = 0xe8ddc8, roof = 0x3c4544, accent = 0xb35a43): THREE.Group {
  const group = new THREE.Group();
  const wallMat = mat(wall, 0.95);
  const roofMat = mat(roof, 0.85);
  const woodMat = mat(0x584537);
  const light = glowMat(0xf2c15e, 0.9);
  box(group, width, height, depth, wallMat, 0, height / 2, 0);
  box(group, width * 1.18, 0.16, depth * 1.22, roofMat, 0, height + 0.04, 0);
  box(group, width * 1.05, 0.2, depth * 1.1, roofMat, 0, height + 0.2, 0);
  const eaveLeft = box(group, width * 0.2, 0.14, depth * 1.28, roofMat, -width * 0.58, height + 0.02, 0);
  eaveLeft.rotation.z = -0.16;
  const eaveRight = box(group, width * 0.2, 0.14, depth * 1.28, roofMat, width * 0.58, height + 0.02, 0);
  eaveRight.rotation.z = 0.16;
  box(group, 0.12, 0.18, depth * 1.3, roofMat, 0, height + 0.42, 0);
  const win = box(group, width * 0.42, height * 0.28, 0.05, light, 0, height * 0.58, depth / 2 + 0.03);
  win.castShadow = false;
  box(group, width * 0.18, height * 0.6, 0.06, woodMat, 0, height * 0.3, depth / 2 + 0.04);
  const lantern = createLantern(accent, 0.32);
  lantern.position.set(width * 0.34, height * 0.78, depth / 2 + 0.32);
  group.add(lantern);
  return group;
}

export function createLantern(color = 0xb94b3f, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 * scale, 0.2 * scale, 0.28 * scale, 8),
    glowMat(color, 1.8)
  );
  body.castShadow = false;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.05 * scale, 8), mat(0xd9a441, 0.5, 0.2));
  cap.position.y = 0.16 * scale;
  group.add(cap);
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22 * scale, 4), mat(0xd9a441));
  tassel.position.y = -0.24 * scale;
  group.add(tassel);
  return group;
}

export function createWillow(scale = 1, foliage = 0x6f8f62): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.24 * scale, 2.4 * scale, 6), mat(0x5d4938));
  trunk.position.y = 1.2 * scale;
  group.add(trunk);
  const leaf = mat(foliage, 0.9);
  const leafDark = mat(0x526e4a, 0.9);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const start = new THREE.Vector3(0, 2.3 * scale, 0);
    const end = new THREE.Vector3(Math.cos(angle) * 1.4 * scale, 0.8 * scale, Math.sin(angle) * 1.4 * scale);
    const mid = new THREE.Vector3(Math.cos(angle) * 0.8 * scale, 1.6 * scale, Math.sin(angle) * 0.8 * scale);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const branch = new THREE.Mesh(new THREE.TubeGeometry(curve, 7, 0.025 * scale, 4, false), mat(0x5d4938));
    group.add(branch);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * scale, 0), index % 2 ? leaf : leafDark);
    leaves.position.copy(end);
    leaves.scale.y = 1.4;
    group.add(leaves);
  }
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * scale, 1), leaf);
  crown.position.y = 2.8 * scale;
  crown.scale.y = 0.72;
  group.add(crown);
  return group;
}

export function createTeaHouse(accent = 0xb35a43): THREE.Group {
  const group = new THREE.Group();
  const wood = mat(0x5a4433);
  const paper = mat(0xf0dfb8, 0.9);
  const dark = mat(0x3a3b35);
  box(group, 6.5, 0.18, 4.2, wood, 0, 0.1, 0);
  for (const x of [-2.8, 2.8]) {
    for (const z of [-1.6, 1.6]) box(group, 0.18, 3.2, 0.18, wood, x, 1.65, z);
  }
  box(group, 7.2, 0.2, 4.8, dark, 0, 3.3, 0);
  const eave = box(group, 7.8, 0.16, 5.1, dark, 0, 3.2, 0);
  eave.rotation.z = 0.02;
  box(group, 2.4, 0.8, 0.7, wood, 0, 0.55, 1.2);
  box(group, 1.6, 0.06, 0.8, paper, 0, 1.02, 1.2);
  for (const x of [-2.2, 0, 2.2]) {
    const lantern = createLantern(accent, 0.7);
    lantern.position.set(x, 2.75, 1.9);
    group.add(lantern);
  }
  return group;
}

export function createCalligraphyTable(): THREE.Group {
  const group = new THREE.Group();
  const wood = mat(0x6b4c35);
  box(group, 2.4, 0.12, 1.1, wood, 0, 0.82, 0);
  for (const x of [-0.9, 0.9]) for (const z of [-0.35, 0.35]) box(group, 0.1, 0.8, 0.1, wood, x, 0.4, z);
  box(group, 1.6, 0.02, 0.7, mat(0xe9dfc7), 0, 0.9, 0);
  box(group, 0.2, 0.06, 0.12, mat(0x1e2a38), -0.45, 0.94, 0.2);
  const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5), mat(0x8b5b3d));
  brush.position.set(0.35, 0.98, 0.1);
  brush.rotation.z = 0.6;
  group.add(brush);
  return group;
}

export function createClinic(): THREE.Group {
  const group = new THREE.Group();
  const wall = mat(0xe4eeea);
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fc4c3, transparent: true, opacity: 0.36, roughness: 0.2, metalness: 0.3 });
  const teal = glowMat(0x73b7a8, 0.9);
  box(group, 4.4, 3, 3.4, wall, 0, 1.5, 0);
  box(group, 2, 1.4, 0.08, glass, 0, 1.4, 1.73);
  const cross = new THREE.Group();
  box(cross, 0.8, 0.2, 0.06, teal, 0, 0, 0);
  box(cross, 0.2, 0.8, 0.06, teal, 0, 0, 0);
  cross.position.set(0, 2.42, 1.78);
  group.add(cross);
  return group;
}

export function createLabPavilion(): THREE.Group {
  const group = new THREE.Group();
  const frame = mat(0x6f7b73, 0.5, 0.3);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9edbd2,
    transparent: true,
    opacity: 0.22,
    roughness: 0.15,
    metalness: 0.45,
    side: THREE.DoubleSide
  });
  box(group, 8, 0.2, 6, mat(0x74867a), 0, 0.1, 0);
  for (const x of [-3.8, 3.8]) for (const z of [-2.8, 2.8]) box(group, 0.16, 3.6, 0.16, frame, x, 1.8, z);
  box(group, 8, 0.18, 6, frame, 0, 3.7, 0);
  box(group, 7.6, 0.08, 5.6, glass, 0, 3.58, 0);
  for (const x of [-2.5, 0, 2.5]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.025, 6, 24), glowMat(0x77d6c9, 1.5));
    ring.position.set(x, 2.2, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), glowMat(0xf2c15e, 2));
  core.position.set(0, 1.5, 0);
  group.add(core);
  return group;
}

export function createLoom(): THREE.Group {
  const group = new THREE.Group();
  const wood = mat(0x5a4030);
  box(group, 2.4, 0.12, 1.2, wood, 0, 0.9, 0);
  for (const x of [-1.05, 1.05]) for (const z of [-0.5, 0.5]) box(group, 0.12, 1.8, 0.12, wood, x, 0.9, z);
  box(group, 2.2, 0.05, 0.8, mat(0xd8c7a6), 0, 1.0, 0);
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.6), new THREE.MeshStandardMaterial({ color: 0xf4e6c8, side: THREE.DoubleSide }));
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = 1.03;
  group.add(silk);
  return group;
}

export function createDeliveryBike(): THREE.Group {
  const group = new THREE.Group();
  const dark = mat(0x252b30);
  const yellow = mat(0xe3c04f);
  for (const x of [-0.55, 0.55]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 5, 12), dark);
    wheel.position.set(x, 0.24, 0);
    wheel.rotation.y = Math.PI / 2;
    group.add(wheel);
  }
  box(group, 1.15, 0.08, 0.06, yellow, 0, 0.52, 0);
  box(group, 0.55, 0.5, 0.45, yellow, 0.5, 0.75, 0);
  box(group, 0.3, 0.06, 0.3, dark, -0.45, 0.65, 0);
  return group;
}

export class KoiPond {
  readonly group = new THREE.Group();
  private readonly koi: THREE.Mesh[] = [];
  private readonly radius = 2.6;

  constructor() {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius, 24),
      new THREE.MeshStandardMaterial({ color: 0x3f7a75, roughness: 0.18, metalness: 0.5, transparent: true, opacity: 0.9 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.04;
    this.group.add(water);
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + (index % 3) * 0.1, 0), mat(0x7a776a));
      rock.position.set(Math.cos(angle) * (this.radius + 0.15), 0.1, Math.sin(angle) * (this.radius + 0.15));
      rock.scale.y = 0.6;
      this.group.add(rock);
    }
    for (let index = 0; index < 5; index += 1) {
      const koi = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), glowMat(index % 2 ? 0xf2a25e : 0xf4d59a, 0.4));
      koi.scale.set(1.8, 0.6, 0.8);
      this.group.add(koi);
      this.koi.push(koi);
    }
  }

  update(time: number): void {
    this.koi.forEach((fish, index) => {
      const angle = time * (0.25 + index * 0.04) + index * 1.7;
      fish.position.set(Math.cos(angle) * (0.8 + index * 0.22), 0.08, Math.sin(angle) * (0.8 + index * 0.22));
      fish.rotation.y = -angle;
    });
  }
}

export class Rain {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly length: number;

  constructor(count = 1200) {
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      this.positions[index * 3] = (Math.random() - 0.5) * 36;
      this.positions[index * 3 + 1] = Math.random() * 14;
      this.positions[index * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xbfe6ef,
      size: 0.035,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    });
    this.points = new THREE.Points(geometry, material);
    this.length = count;
  }

  update(dt: number): void {
    for (let index = 0; index < this.length; index += 1) {
      this.positions[index * 3 + 1] -= dt * 9;
      if (this.positions[index * 3 + 1] < 0) this.positions[index * 3 + 1] = 12 + Math.random() * 2;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

export class LanternRiver {
  readonly group = new THREE.Group();
  private readonly lanterns: THREE.Group[] = [];

  constructor(count = 28) {
    for (let index = 0; index < count; index += 1) {
      const lantern = new THREE.Group();
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), glowMat(index % 3 === 0 ? 0xf2c15e : 0xd97b4f, 1.8));
      lantern.add(glow);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.34), mat(0x6b4a32));
      base.position.y = -0.13;
      lantern.add(base);
      lantern.position.set((Math.random() - 0.5) * 38, 0.2, -10 + (Math.random() - 0.5) * 4.2);
      lantern.userData.speed = 0.2 + Math.random() * 0.3;
      lantern.userData.phase = Math.random() * 6.28;
      this.group.add(lantern);
      this.lanterns.push(lantern);
    }
  }

  update(time: number): void {
    this.lanterns.forEach((lantern) => {
      lantern.position.x += 0.0025 * lantern.userData.speed;
      if (lantern.position.x > 20) lantern.position.x = -20;
      lantern.position.y = 0.18 + Math.sin(time * 0.8 + lantern.userData.phase) * 0.04;
      lantern.rotation.y = Math.sin(time * 0.2 + lantern.userData.phase) * 0.3;
    });
  }
}

export class Maglev {
  readonly group = new THREE.Group();
  private readonly train: THREE.Group;

  constructor() {
    const track = new THREE.Mesh(new THREE.BoxGeometry(70, 0.12, 0.4), mat(0x54606a, 0.4, 0.6));
    track.position.set(0, 7.4, -25);
    this.group.add(track);
    this.train = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.7), glowMat(0x9fd7df, 0.5));
    body.position.set(0, 7.72, -25);
    this.train.add(body);
    box(this.train, 7.4, 0.06, 0.12, glowMat(0x88e6df, 1.4), 0, 7.48, -25);
    this.group.add(this.train);
  }

  update(time: number): void {
    this.train.position.x = ((time * 5) % 70) - 35;
  }
}

export function createSkyline(): THREE.Group {
  const group = new THREE.Group();
  const colors = [0x2d3c49, 0x3a4a56, 0x26343f];
  for (let index = 0; index < 15; index += 1) {
    const x = -32 + index * 4.6;
    const height = 5 + ((index * 37) % 9);
    const building = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, height, 2.8), mat(colors[index % colors.length], 0.8));
    body.position.y = height / 2;
    building.add(body);
    const windowMat = glowMat(index % 2 ? 0x9fd7df : 0xf2c15e, 0.8);
    for (let row = 0; row < Math.floor(height / 1.4); row += 1) {
      for (let col = 0; col < 2; col += 1) {
        box(building, 0.34, 0.16, 0.04, windowMat, -0.55 + col * 1.1, 1 + row * 1.3, 1.43);
      }
    }
    building.position.set(x, 0, -27 - (index % 3) * 3);
    group.add(building);
  }
  return group;
}

export function createDistantLights(): THREE.Group {
  const group = new THREE.Group();
  for (let index = 0; index < 30; index += 1) {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), glowMat(index % 2 ? 0xf2c15e : 0x9fd7df, 2));
    light.position.set((Math.random() - 0.5) * 60, 3 + Math.random() * 8, -32 + Math.random() * 8);
    group.add(light);
  }
  return group;
}

export function createRocks(count = 9): THREE.Group {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (index % 4) * 0.08, 0), mat(0x777466));
    rock.position.set((Math.random() - 0.5) * 16, 0.1, (Math.random() - 0.5) * 18);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 0.7;
    group.add(rock);
  }
  return group;
}

export function createSkyDome(top: number, bottom: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(88, 24, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) }
    },
    vertexShader: `varying vec3 vWorld; void main(){ vec4 world = modelMatrix * vec4(position, 1.0); vWorld = world.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uBottom; varying vec3 vWorld; void main(){ float h = clamp(normalize(vWorld).y * 0.75 + 0.35, 0.0, 1.0); vec3 c = mix(uBottom, uTop, smoothstep(0.0, 0.8, h)); gl_FragColor = vec4(c, 1.0); }`
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 6;
  mesh.renderOrder = -1;
  return mesh;
}

export function createLanternPost(color = 0xc65d3b): THREE.Group {
  const group = new THREE.Group();
  const wood = mat(0x4f3a2b);
  box(group, 0.12, 2.3, 0.12, wood, 0, 1.15, 0);
  const arm = box(group, 0.7, 0.08, 0.08, wood, 0.3, 2.2, 0);
  arm.rotation.z = 0.08;
  const lantern = createLantern(color, 0.7);
  lantern.position.set(0.62, 1.92, 0);
  group.add(lantern);
  return group;
}

export function createBush(accent = 0xb35a43): THREE.Group {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.34, 7), mat(0x6b4b36, 0.9));
  pot.position.y = 0.17;
  group.add(pot);
  const leafA = mat(0x4f6f4a, 0.95);
  const leafB = mat(0x6f8f62, 0.95);
  const a = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 0), leafA);
  a.position.set(-0.12, 0.58, 0);
  a.scale.y = 1.1;
  group.add(a);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), leafB);
  b.position.set(0.2, 0.52, 0.05);
  group.add(b);
  for (let index = 0; index < 4; index += 1) {
    const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), glowMat(index % 2 ? accent : 0xf2c15e, 0.4));
    flower.position.set(-0.18 + index * 0.12, 0.72 + (index % 2) * 0.1, 0.18);
    group.add(flower);
  }
  return group;
}

export function createStonePath(color = 0xb5a88a): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 22), material);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, 2);
  path.receiveShadow = true;
  group.add(path);
  const edge = new THREE.MeshStandardMaterial({ color: 0x8e836d, roughness: 0.95, flatShading: true });
  for (let index = 0; index < 9; index += 1) {
    box(group, 3.6, 0.02, 0.06, edge, 0, 0.018, -7 + index * 2.4);
  }
  return group;
}
