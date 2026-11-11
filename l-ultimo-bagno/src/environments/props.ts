import * as THREE from 'three';
import { mulberry32 } from '../utils/math';
import {
  makeGlowTexture,
  makeSignTexture,
  makeStarTexture,
} from '../utils/textures';
import type { SignTextureOptions } from '../utils/textures';

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export const COLORS = {
  night: 0x0b1322,
  nightDeep: 0x070c16,
  stone: 0x5d5b55,
  stoneDark: 0x464640,
  stoneLight: 0x77746a,
  asphalt: 0x24272b,
  asphaltLight: 0x30343a,
  wall: 0x4e4b45,
  wallWarm: 0x675b4c,
  wallCool: 0x414953,
  roof: 0x2c2b29,
  wood: 0x5a4632,
  woodDark: 0x3c2e22,
  trim: 0x8c7b61,
  lamp: 0xf2b66d,
  lampGlow: 0xffc982,
  windowWarm: 0xe7ad68,
  windowCool: 0x9fb3c3,
  grass: 0x4f6046,
  grassDark: 0x394934,
  sage: 0x74846a,
  moon: 0xeee7d3,
  barRed: 0x5c2c28,
  barGold: 0xd9aa67,
};

export function flatMaterial(
  color: number,
  options: {
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    transparent?: number;
    side?: THREE.Side;
  } = {},
): THREE.MeshStandardMaterial {
  const key = `${color}:${options.roughness ?? 0.9}:${options.metalness ?? 0}:${
    options.emissive ?? 0
  }:${options.emissiveIntensity ?? 0}:${options.transparent ?? 1}:${options.side ?? THREE.FrontSide}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.9,
    metalness: options.metalness ?? 0,
    flatShading: true,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: (options.transparent ?? 1) < 1,
    opacity: options.transparent ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
  materialCache.set(key, material);
  return material;
}

export function boxMesh(
  width: number,
  height: number,
  depth: number,
  color: number,
  options?: Parameters<typeof flatMaterial>[1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), flatMaterial(color, options));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cylinderMesh(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: number,
  segments = 6,
  options?: Parameters<typeof flatMaterial>[1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    flatMaterial(color, options),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function glowSprite(color = '#ffcb88', size = 3): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: makeGlowTexture(color),
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  return sprite;
}

// ---------------------------------------------------------------------------
// Insegne
// ---------------------------------------------------------------------------

export interface SignBoardOptions extends SignTextureOptions {
  width?: number;
  height?: number;
  postHeight?: number;
  posts?: boolean;
  illuminated?: boolean;
  doubleSided?: boolean;
}

export function createSignBoard(options: SignBoardOptions): THREE.Group {
  const group = new THREE.Group();
  const width = options.width ?? 1.6;
  const height = options.height ?? 0.7;
  const posts = options.posts ?? true;
  const postHeight = options.postHeight ?? 0.95;
  const texture = makeSignTexture({ ...options, width: 512, height: 256 });

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    options.illuminated
      ? new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
          side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        })
      : new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.88,
          metalness: 0,
          side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        }),
  );
  board.position.y = posts ? postHeight + height / 2 : height / 2;
  board.castShadow = false;
  board.receiveShadow = false;
  group.add(board);

  if (!options.illuminated) {
    const backing = boxMesh(
      width + 0.07,
      height + 0.07,
      0.055,
      COLORS.woodDark,
      { roughness: 0.95 },
    );
    backing.position.set(0, board.position.y, -0.04);
    group.add(backing);
  }

  if (posts) {
    const material = flatMaterial(COLORS.woodDark, { roughness: 0.98 });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, postHeight, 5),
        material,
      );
      post.position.set(side * width * 0.32, postHeight / 2, -0.02);
      post.castShadow = true;
      group.add(post);
    }
  }

  if (options.illuminated) {
    const glow = glowSprite('#ffb96c', Math.max(width, height) * 1.5);
    glow.position.set(0, board.position.y, 0.12);
    group.add(glow);
  }

  return group;
}

export function createHangingSign(
  text: string,
  options: Partial<SignTextureOptions> & { width?: number; height?: number } = {},
): THREE.Group {
  const group = new THREE.Group();
  const width = options.width ?? 2.1;
  const height = options.height ?? 0.68;
  const texture = makeSignTexture({
    text,
    width: 512,
    height: 192,
    background: options.background ?? '#2b1512',
    foreground: options.foreground ?? '#f4c985',
    border: options.border ?? 'rgba(244, 201, 133, 0.65)',
    ...options,
  });

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  board.position.z = 0.035;
  group.add(board);

  const backing = boxMesh(width + 0.08, height + 0.08, 0.06, 0x1b1511, {
    roughness: 0.9,
  });
  group.add(backing);

  const glow = glowSprite('#ffba70', Math.max(width, height) * 1.7);
  glow.position.z = 0.2;
  group.add(glow);

  return group;
}

export function createWallSign(
  text: string,
  width: number,
  height: number,
  options: Partial<SignTextureOptions> = {},
): THREE.Mesh {
  const texture = makeSignTexture({
    text,
    width: 512,
    height: 256,
    background: options.background ?? '#d8cdb8',
    foreground: options.foreground ?? '#29251f',
    border: options.border ?? 'rgba(41, 37, 31, 0.5)',
    grain: options.grain ?? true,
    ...options,
  });
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.92,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// ---------------------------------------------------------------------------
// Cielo, stelle, luna
// ---------------------------------------------------------------------------

export function createStars(count: number, seed = 1, radius = 120): THREE.Points {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(0.08 + random() * 0.92);
    const r = radius * (0.7 + random() * 0.3);
    positions[index * 3] = Math.sin(phi) * Math.cos(theta) * r;
    positions[index * 3 + 1] = Math.cos(phi) * r * 0.75 + 4;
    positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: makeStarTexture(),
    color: 0xf3ead6,
    size: 1.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

export function createMoon(position: THREE.Vector3, radius = 2.4): THREE.Group {
  const group = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 1),
    new THREE.MeshBasicMaterial({ color: COLORS.moon, toneMapped: false }),
  );
  group.add(moon);
  const halo = glowSprite('#f4e6c8', radius * 5);
  group.add(halo);
  group.position.copy(position);
  return group;
}

export function createSkyDome(
  topColor: number,
  horizonColor: number,
  bottomColor: number,
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(180, 16, 12);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(topColor) },
      horizonColor: { value: new THREE.Color(horizonColor) },
      bottomColor: { value: new THREE.Color(bottomColor) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 lower = mix(bottomColor, horizonColor, smoothstep(-0.35, 0.06, h));
        vec3 color = mix(lower, topColor, smoothstep(0.02, 0.72, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(geometry, material);
  dome.frustumCulled = false;
  return dome;
}

// ---------------------------------------------------------------------------
// Elementi urbani
// ---------------------------------------------------------------------------

export interface Lamp {
  group: THREE.Group;
  light: THREE.PointLight;
  bulbMaterial: THREE.MeshStandardMaterial;
  glow: THREE.Sprite;
}

export function createLamp(options: {
  withLight?: boolean;
  lightIntensity?: number;
  height?: number;
  color?: number;
} = {}): Lamp {
  const group = new THREE.Group();
  const height = options.height ?? 4.2;
  const color = options.color ?? COLORS.lamp;
  const poleMaterial = flatMaterial(0x2c2c2a, { metalness: 0.3, roughness: 0.7 });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 0.38, 6),
    poleMaterial,
  );
  base.position.y = 0.19;
  base.castShadow = true;
  group.add(base);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.08, height, 6),
    poleMaterial,
  );
  pole.position.y = height / 2 + 0.25;
  pole.castShadow = true;
  group.add(pole);

  const lantern = new THREE.Group();
  lantern.position.y = height + 0.35;
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.2,
    roughness: 0.4,
    flatShading: true,
  });
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), bulbMaterial);
  bulb.scale.y = 1.35;
  lantern.add(bulb);

  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.18, 0.5, 4, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x25241f,
      metalness: 0.35,
      roughness: 0.6,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  cage.position.y = -0.03;
  lantern.add(cage);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.24, 4),
    flatMaterial(0x242420, { metalness: 0.25, roughness: 0.7 }),
  );
  cap.position.y = 0.32;
  cap.rotation.y = Math.PI / 4;
  lantern.add(cap);
  group.add(lantern);

  const glow = glowSprite('#ffc078', 2.4);
  glow.position.y = height + 0.35;
  group.add(glow);

  const light = new THREE.PointLight(color, options.withLight ? options.lightIntensity ?? 24 : 0, 18, 1.8);
  light.position.y = height + 0.3;
  light.castShadow = false;
  group.add(light);

  return { group, light, bulbMaterial, glow };
}

export function createBench(): THREE.Group {
  const group = new THREE.Group();
  const wood = flatMaterial(COLORS.wood, { roughness: 0.95 });
  const iron = flatMaterial(0x272725, { metalness: 0.35, roughness: 0.65 });

  for (let index = 0; index < 3; index += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.055, 0.13), wood);
    slat.position.set(0, 0.48, -0.16 + index * 0.16);
    slat.castShadow = true;
    group.add(slat);
  }

  for (let index = 0; index < 3; index += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.13, 0.055), wood);
    slat.position.set(0, 0.65 + index * 0.15, -0.3);
    slat.castShadow = true;
    group.add(slat);
  }

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.55), iron);
    leg.position.set(side * 0.95, 0.24, -0.05);
    leg.castShadow = true;
    group.add(leg);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.08), iron);
    back.position.set(side * 0.95, 0.68, -0.33);
    back.rotation.x = -0.08;
    group.add(back);
  }

  const bars = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.035, 0.04), iron);
  bars.position.set(0, 0.18, 0.16);
  group.add(bars);

  return group;
}

export function createTree(seed: number, scale = 1): THREE.Group {
  const random = mulberry32(seed);
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 2.4 * scale, 5),
    flatMaterial(0x4a3a2b, { roughness: 1 }),
  );
  trunk.position.y = 1.2 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const canopyColors = [0x3f5142, 0x4a5c49, 0x364736];
  const clusters = 3 + Math.floor(random() * 2);
  for (let index = 0; index < clusters; index += 1) {
    const radius = (0.75 + random() * 0.5) * scale;
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 0),
      flatMaterial(canopyColors[index % canopyColors.length], { roughness: 1 }),
    );
    canopy.position.set(
      (random() - 0.5) * 1.4 * scale,
      (2.2 + random() * 1.2) * scale,
      (random() - 0.5) * 1.4 * scale,
    );
    canopy.scale.y = 0.9 + random() * 0.3;
    canopy.castShadow = true;
    group.add(canopy);
  }

  return group;
}

export interface BuildingOptions {
  width: number;
  height: number;
  depth: number;
  color?: number;
  seed?: number;
  windows?: boolean;
  windowColor?: number;
  roof?: boolean;
}

export function createBuilding(options: BuildingOptions): THREE.Group {
  const random = mulberry32(options.seed ?? 1);
  const group = new THREE.Group();
  const color = options.color ?? COLORS.wall;
  const building = boxMesh(options.width, options.height, options.depth, color, {
    roughness: 0.98,
  });
  building.position.y = options.height / 2;
  group.add(building);

  if (options.roof !== false) {
    const roof = boxMesh(
      options.width + 0.25,
      0.16,
      options.depth + 0.25,
      COLORS.roof,
      { roughness: 0.98 },
    );
    roof.position.y = options.height + 0.08;
    group.add(roof);
  }

  if (options.windows !== false) {
    const cols = Math.max(2, Math.floor(options.width / 1.4));
    const rows = Math.max(2, Math.floor(options.height / 1.6));
    const windowMaterialWarm = new THREE.MeshBasicMaterial({
      color: options.windowColor ?? COLORS.windowWarm,
      toneMapped: false,
    });
    const windowMaterialCool = new THREE.MeshBasicMaterial({
      color: COLORS.windowCool,
      toneMapped: false,
    });
    const windowMaterialDark = flatMaterial(0x161c22);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (random() < 0.25) continue;
        const lit = random() > 0.48;
        const material = lit
          ? random() > 0.7
            ? windowMaterialCool
            : windowMaterialWarm
          : windowMaterialDark;
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.7), material);
        const x = (col + 0.5) / cols - 0.5;
        plane.position.set(
          x * options.width * 0.82,
          ((row + 0.5) / rows) * options.height * 0.92 + 0.2,
          options.depth / 2 + 0.012,
        );
        group.add(plane);
      }
    }
  }

  return group;
}

export function createPaving(
  width: number,
  depth: number,
  tile = 1.1,
  seed = 1,
  colors: number[] = [COLORS.stone, COLORS.stoneDark, COLORS.stoneLight],
): THREE.InstancedMesh {
  const random = mulberry32(seed);
  const cols = Math.ceil(width / tile);
  const rows = Math.ceil(depth / tile);
  const geometry = new THREE.BoxGeometry(tile * 0.94, 0.08, tile * 0.94);
  const material = flatMaterial(colors[0], { roughness: 1 });
  const count = cols * rows;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let index = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = (col + 0.5) * tile - width / 2;
      const z = (row + 0.5) * tile - depth / 2;
      matrix.makeRotationY((random() - 0.5) * 0.02);
      matrix.setPosition(x, 0.04 + random() * 0.006, z);
      mesh.setMatrixAt(index, matrix);
      color.setHex(colors[Math.floor(random() * colors.length)]);
      color.offsetHSL(0, 0, (random() - 0.5) * 0.05);
      mesh.setColorAt(index, color);
      index += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function createGround(
  width: number,
  depth: number,
  color: number,
  y = 0,
): THREE.Mesh {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    flatMaterial(color, { roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = y;
  ground.receiveShadow = true;
  return ground;
}

export function createGrass(
  width: number,
  depth: number,
  count: number,
  seed = 1,
): THREE.InstancedMesh {
  const random = mulberry32(seed);
  const geometry = new THREE.ConeGeometry(0.06, 0.3, 3);
  geometry.translate(0, 0.15, 0);
  const material = flatMaterial(COLORS.grass, { roughness: 1 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const x = (random() - 0.5) * width;
    const z = (random() - 0.5) * depth;
    const scale = 0.6 + random() * 1.6;
    matrix.makeRotationY(random() * Math.PI);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    matrix.setPosition(x, 0.015, z);
    mesh.setMatrixAt(index, matrix);
    color.setHex(random() > 0.5 ? COLORS.grass : COLORS.grassDark);
    mesh.setColorAt(index, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createRoad(width: number, length: number): THREE.Group {
  const group = new THREE.Group();
  const road = createGround(width, length, COLORS.asphalt, 0.015);
  group.add(road);

  const lineMaterial = flatMaterial(0xa7a18f, { roughness: 0.9 });
  for (let z = -length / 2 + 2; z < length / 2; z += 5) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 2.1), lineMaterial);
    dash.position.set(0, 0.03, z);
    dash.receiveShadow = true;
    group.add(dash);
  }

  const edgeMaterial = flatMaterial(0x8e8a7c, { roughness: 0.9 });
  for (const side of [-1, 1]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, length), edgeMaterial);
    line.position.set(side * (width / 2 - 0.35), 0.03, 0);
    group.add(line);
  }

  return group;
}

export function createYogaMat(color: number): THREE.Mesh {
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.025, 0.85),
    flatMaterial(color, { roughness: 1 }),
  );
  mat.receiveShadow = true;
  return mat;
}

export function createPond(radius: number): THREE.Group {
  const group = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshStandardMaterial({
      color: 0x1e3342,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.022;
  group.add(water);

  const rimMaterial = flatMaterial(COLORS.stoneDark, { roughness: 1 });
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius + 0.12, 0.12, 4, 20),
    rimMaterial,
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.05;
  rim.receiveShadow = true;
  group.add(rim);

  return group;
}

export function createTelescope(): THREE.Group {
  const group = new THREE.Group();
  const metal = flatMaterial(0x34383b, { metalness: 0.4, roughness: 0.6 });
  const dark = flatMaterial(0x1e2022, { metalness: 0.3, roughness: 0.6 });

  const hub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), metal);
  hub.position.y = 0.95;
  group.add(hub);

  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(angle) * 0.42, 0.02, Math.sin(angle) * 0.42);
    const end = new THREE.Vector3(0, 0.94, 0);
    const direction = new THREE.Vector3().subVectors(end, start);
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, direction.length(), 4),
      dark,
    );
    leg.position.copy(start).add(end).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    leg.castShadow = true;
    group.add(leg);
  }

  const tube = new THREE.Group();
  tube.position.y = 1.15;
  tube.rotation.z = -0.5;
  tube.rotation.y = 0.4;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 1.25, 7),
    metal,
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.castShadow = true;
  tube.add(barrel);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.04, 7),
    new THREE.MeshBasicMaterial({ color: 0xa9c3cf, toneMapped: false }),
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.x = 0.63;
  tube.add(lens);
  group.add(tube);
  group.userData.tube = tube;
  group.userData.rotationSpeed = 0.02;

  return group;
}

export function createTent(): THREE.Group {
  const group = new THREE.Group();
  const fabric = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 1.5, 4),
    flatMaterial(0x7a654d, { roughness: 1 }),
  );
  fabric.position.y = 0.75;
  fabric.rotation.y = Math.PI / 4;
  fabric.castShadow = true;
  group.add(fabric);
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.72),
    flatMaterial(0x17130f, { roughness: 1 }),
  );
  door.position.set(0, 0.38, 0.62);
  group.add(door);
  return group;
}

export function createFence(
  length: number,
  postSpacing = 2,
  seed = 1,
): THREE.Group {
  const group = new THREE.Group();
  const wood = flatMaterial(COLORS.woodDark, { roughness: 1 });
  const count = Math.max(2, Math.round(length / postSpacing));
  for (let index = 0; index < count; index += 1) {
    const x = (index / (count - 1) - 0.5) * length;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.95, 4), wood);
    post.position.set(x, 0.475, 0);
    post.rotation.z = Math.sin(index * 1.7 + seed) * 0.03;
    post.castShadow = true;
    group.add(post);
  }
  for (const height of [0.38, 0.72]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.055, 0.04), wood);
    rail.position.set(0, height, 0);
    rail.rotation.z = Math.sin(seed) * 0.002;
    group.add(rail);
  }
  return group;
}

export function createBusStop(): THREE.Group {
  const group = new THREE.Group();
  const poleMaterial = flatMaterial(0x303438, { metalness: 0.35, roughness: 0.65 });
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 2.5, 5), poleMaterial);
    pole.position.set(side * 1.1, 1.25, 0);
    pole.castShadow = true;
    group.add(pole);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.1), poleMaterial);
  roof.position.y = 2.5;
  group.add(roof);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.1, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x1c2a33,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.55,
    }),
  );
  panel.position.set(0, 1.4, -0.45);
  group.add(panel);
  const sign = createWallSign('FERMATA', 0.9, 0.45, {
    width: 512,
    height: 256,
    background: '#e3d8c2',
    foreground: '#2a2c2f',
  });
  sign.position.set(1.3, 2.05, 0.05);
  sign.scale.set(0.9, 0.9, 0.9);
  group.add(sign);
  return group;
}

export function createDumpster(): THREE.Group {
  const group = new THREE.Group();
  const body = boxMesh(1.5, 1.1, 1, 0x33423c, { metalness: 0.25, roughness: 0.7 });
  body.position.y = 0.75;
  group.add(body);
  const lid = boxMesh(1.55, 0.08, 1.05, 0x222c28, { metalness: 0.3, roughness: 0.6 });
  lid.position.set(0, 1.33, -0.02);
  lid.rotation.x = 0.05;
  group.add(lid);
  const wheelMaterial = flatMaterial(0x151515, { roughness: 0.8 });
  for (const side of [-1, 1]) {
    for (const z of [-0.3, 0.3]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.7, 0.12, z);
      group.add(wheel);
    }
  }
  return group;
}

export function createBicycleProp(): THREE.Group {
  const group = new THREE.Group();
  const frame = flatMaterial(0x3f4c4b, { metalness: 0.35, roughness: 0.6 });
  const wheelMaterial = flatMaterial(0x161718, { roughness: 0.7 });
  const wheelGeometry = new THREE.TorusGeometry(0.32, 0.025, 4, 10);
  for (const z of [-0.5, 0.5]) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(0, 0.32, z);
    wheel.rotation.y = Math.PI / 2;
    wheel.castShadow = true;
    group.add(wheel);
  }
  const tubes: Array<[THREE.Vector3, THREE.Vector3, number]> = [
    [new THREE.Vector3(0, 0.32, -0.5), new THREE.Vector3(0, 0.8, -0.3), 0.02],
    [new THREE.Vector3(0, 0.8, -0.3), new THREE.Vector3(0, 0.9, 0.32), 0.02],
    [new THREE.Vector3(0, 0.32, -0.5), new THREE.Vector3(0, 0.34, -0.05), 0.02],
    [new THREE.Vector3(0, 0.34, -0.05), new THREE.Vector3(0, 0.9, 0.32), 0.02],
    [new THREE.Vector3(0, 0.9, 0.32), new THREE.Vector3(0, 0.32, 0.5), 0.018],
  ];
  for (const [start, end, radius] of tubes) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 4),
      frame,
    );
    tube.position.copy(start).add(end).multiplyScalar(0.5);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(tube);
  }
  const seat = boxMesh(0.16, 0.05, 0.25, 0x22201d);
  seat.position.set(0, 0.82, -0.3);
  group.add(seat);
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.44, 4), frame);
  bars.rotation.z = Math.PI / 2;
  bars.position.set(0, 0.94, 0.32);
  group.add(bars);
  return group;
}

export function createCartelloPubblicitario(
  x: number,
  z: number,
  rotation: number,
): THREE.Group {
  const group = createSignBoard({
    text: 'AFFITTASI',
    subtext: 'solo persone sole',
    width: 0.95,
    height: 0.55,
    postHeight: 0.8,
    background: '#cfc4ad',
    foreground: '#39332a',
    border: 'rgba(57, 51, 42, 0.5)',
  });
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}
