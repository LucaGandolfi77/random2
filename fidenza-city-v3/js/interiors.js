/**
 * Fidenza da Giocare v3.3.3 — interni costruiti a runtime con Three.js.
 * Nessun Blender, nessun GLB: solo primitive e foto CC come texture.
 */

import * as THREE from 'three';
import { makeSpatialHash, polygonBounds } from './utils.js';
import { getGroundMaterial } from './ground-textures.js';

const DATA_URL = './data/interiors.json';
const TEX_BASE = './assets/textures/interiors/';

const COLORS = {
  stone: '#b7ad99', white: '#e6ddc7', plaster: '#d8cbb2', wood: '#8a6a4a',
  roof: '#a35338', glass: '#9fc4d2', floor: '#b9ae96', red: '#8f3e34',
};

const textureCache = new Map();

function texture(name) {
  if (!name) return null;
  if (!textureCache.has(name)) {
    const map = new THREE.TextureLoader().load(TEX_BASE + name);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    textureCache.set(name, map);
  }
  return textureCache.get(name);
}

function material(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function addBox(group, x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, x, y, z, radius, height, mat, sides = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

/**
 * Pannello fotografico. rotationY: 0 fronte (+z), PI retro (-z),
 * PI/2 parete sinistra (+x), -PI/2 parete destra (-x), -PI/2 con flipX per soffitto.
 */
function addPhoto(group, image, x, y, z, w, h, rotationY = 0, faceDown = false) {
  const map = texture(image);
  if (!map) return null;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: new THREE.Color('#555555'),
      roughness: 0.92,
      side: THREE.DoubleSide
    })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  if (faceDown) mesh.rotation.x = Math.PI / 2;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function floorMaterial(style, w, d) {
  const base = getGroundMaterial(style, { quality: 'high', vertexColors: false });
  const mat = base.clone();
  if (base.map) {
    mat.map = base.map.clone();
    mat.map.repeat.set(Math.max(1, w / 6), Math.max(1, d / 6));
    mat.map.needsUpdate = true;
  }
  if (base.normalMap) {
    mat.normalMap = base.normalMap.clone();
    mat.normalMap.repeat.copy(mat.map.repeat);
    mat.normalMap.needsUpdate = true;
  }
  if (base.roughnessMap) {
    mat.roughnessMap = base.roughnessMap.clone();
    mat.roughnessMap.repeat.copy(mat.map.repeat);
    mat.roughnessMap.needsUpdate = true;
  }
  return mat;
}

function addFloor(group, cx, cz, w, d, style) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, floorMaterial(style, w, d));
  mesh.position.set(cx, 0.12, cz);
  mesh.receiveShadow = true;
  mesh.name = 'pavimento-' + style;
  group.add(mesh);
}

function shell(group, b, height, floorMat, wallMat, floorStyle = 'concrete') {
  const [x0, z0, x1, z1] = b.bounds;
  const w = x1 - x0, d = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  addBox(group, cx, 0.05, cz, w, 0.12, d, floorMat);
  addFloor(group, cx, cz, w - 0.3, d - 0.3, floorStyle);
  addBox(group, x0, height / 2, cz, 0.25, height, d, wallMat);
  addBox(group, x1, height / 2, cz, 0.25, height, d, wallMat);
  addBox(group, cx, height / 2, z1, w, height, 0.25, wallMat);
  // Parete frontale con varco per la porta
  const gap = 1.3;
  addBox(group, (x0 + cx - gap) / 2, height / 2, z0, cx - gap - x0, height, 0.25, wallMat);
  addBox(group, (cx + gap + x1) / 2, height / 2, z0, x1 - cx - gap, height, 0.25, wallMat);
  addBox(group, cx, (height + 2.7) / 2, z0, gap * 2, height - 2.7, 0.25, wallMat);
  // Soffitto
  const ceiling = addBox(group, cx, height, cz, w, 0.15, d, floorMat);
  ceiling.castShadow = false;
  return { w, d, cx, cz, x0, x1, z0, z1 };
}

function pews(group, cx, cz, w, d, rows) {
  for (let i = 0; i < rows; i++) {
    const z = cz - d / 2 + 3.5 + i * 2.2;
    for (const side of [-1, 1]) {
      const x = cx + side * w * 0.22;
      addBox(group, x, 0.55, z, w * 0.3, 0.9, 0.7, material(COLORS.wood));
      addBox(group, x, 1.05, z + 0.35, w * 0.3, 0.15, 0.18, material(COLORS.wood));
    }
  }
}

function altar(group, cx, cz) {
  addBox(group, cx, 0.8, cz, 3, 1.6, 1.6, material(COLORS.white));
  addBox(group, cx, 1.7, cz, 3.4, 0.2, 2, material(COLORS.stone));
  for (const dx of [-1.2, 0, 1.2]) addCylinder(group, cx + dx, 2.2, cz, 0.1, 1, material(COLORS.white), 6);
}

function counter(group, cx, cz, w) {
  addBox(group, cx, 0.6, cz, w, 1.2, 1.1, material(COLORS.wood));
  addBox(group, cx, 1.25, cz, w + 0.3, 0.12, 1.3, material(COLORS.white));
  addBox(group, cx - w * 0.22, 1.6, cz, 1.1, 0.7, 0.7, material(COLORS.stone));
  for (let i = 0; i < 3; i++) addCylinder(group, cx - w * 0.22 + (i - 1) * 0.3, 1.5, cz + 0.4, 0.07, 0.5, material('#4a4d52'), 6);
}

function tables(group, cx, cz, w, d, count = 6) {
  for (let i = 0; i < count; i++) {
    const x = cx - w / 2 + 2.2 + (i % 3) * (w - 4.4) / 2;
    const z = cz - d / 2 + 4 + Math.floor(i / 3) * 3;
    addCylinder(group, x, 0.45, z, 0.75, 0.15, material(COLORS.white), 10);
    addCylinder(group, x, 0.22, z, 0.14, 0.45, material(COLORS.wood), 6);
    for (let j = 0; j < 2; j++) addCylinder(group, x + (j - 0.5) * 1.6, 0.3, z, 0.28, 0.6, material(COLORS.wood), 6);
  }
}

const BUILDERS = {
  duomo(group, b, room) {
    shell(group, b, 14, material(COLORS.floor), material(COLORS.stone), 'porphyry');
    addPhoto(group, 'duomo-navata.jpg', room.x0 + 0.18, 6.5, room.cz, 0.1, 14, Math.PI / 2);
    addPhoto(group, 'duomo-presbiterio.jpg', room.cx, 5, room.z1 - 0.18, 12, 9, Math.PI);
    addPhoto(group, 'duomo-cristo-antelami.jpg', room.cx, 6.5, room.z1 - 0.24, 4.8, 6, Math.PI);
    addPhoto(group, 'duomo-organo.jpg', room.cx, 9, room.z0 + 0.18, 6.4, 4, 0);
    for (let i = 0; i <= 5; i++) {
      const z = room.cz - room.d / 2 + 1.5 + i * (room.d - 3) / 5;
      for (const side of [-1, 1]) addCylinder(group, room.cx + side * room.w * 0.22, 5.5, z, 0.55, 11, material(COLORS.white), 8);
    }
    pews(group, room.cx, room.cz, room.w, room.d, 8);
    altar(group, room.cx, room.z1 - 3);
    // Cripta laterale decorativa
    const ccx = room.x1 + 5, ccz = room.cz - 6;
    addBox(group, ccx, 0.05, ccz, 8, 0.12, 8, material(COLORS.floor));
    addBox(group, ccx, 2.2, ccz + 4, 8, 4.4, 0.2, material(COLORS.stone));
    addBox(group, ccx + 4, 2.2, ccz, 0.2, 4.4, 8, material(COLORS.stone));
    addBox(group, ccx, 4.4, ccz, 8, 0.15, 8, material(COLORS.stone));
    addPhoto(group, 'duomo-arca.jpg', ccx, 2.2, ccz + 3.85, 4.4, 2.8, Math.PI);
    addPhoto(group, 'duomo-cripta.jpg', ccx - 3.85, 2.2, ccz, 0.1, 4, 2.5, Math.PI / 2);
  },

  teatro(group, b, room) {
    shell(group, b, 11, material(COLORS.floor), material(COLORS.white), 'porphyry');
    addBox(group, room.cx, 0.6, room.z1 - 2.5, room.w - 4, 1.2, 4, material(COLORS.roof));
    addPhoto(group, 'teatro-sipario.jpg', room.cx, 4.5, room.z1 - 0.2, 16, 8, Math.PI);
    addPhoto(group, 'teatro-sala.jpg', room.x0 + 0.18, 5, room.cz, 0.1, 10, Math.PI / 2);
    addPhoto(group, 'teatro-soffitto.jpg', room.cx, 10.85, room.cz, room.w - 2, room.d - 2, 0, true);
    addPhoto(group, 'teatro-busseto.jpg', room.cx, 8.5, room.z0 + 0.2, 2.4, 2.2, 0);
    for (let row = 0; row < 5; row++) {
      const z = room.cz - room.d / 2 + 3 + row * 3;
      for (let i = 0; i < 9; i++) addBox(group, room.cx - 8 + i * 2, 0.5 + row * 0.45, z, 1.5, 0.8, 0.8, material(COLORS.red));
    }
    for (let i = 0; i < 6; i++) addCylinder(group, room.cx - 8.5 + i * 3.4, 5, room.z0 + 1, 0.42, 5.4, material(COLORS.stone), 10);
  },

  comunale(group, b, room) {
    shell(group, b, 6, material(COLORS.floor), material(COLORS.white), 'porphyry');
    addPhoto(group, 'comune-cortile.jpg', room.cx, 3, room.z1 - 0.18, 10, 4.5, Math.PI);
    addBox(group, room.cx, 0.75, room.cz + 4, 10, 1.5, 1.2, material(COLORS.wood));
    for (let i = 0; i < 6; i++) addBox(group, room.cx - 4 + i * 1.6, 1.6, room.cz + 3.5, 0.7, 0.4, 0.7, material(COLORS.stone));
  },

  stazione(group, b, room) {
    shell(group, b, 6, material(COLORS.floor), material(COLORS.plaster), 'concrete');
    addPhoto(group, 'stazione-interno.jpg', room.cx, 3, room.z1 - 0.18, 10, 4.5, Math.PI);
    for (let i = 0; i < 4; i++) addBox(group, room.cx - 5 + i * 3.2, 0.4, room.cz + 2, 2.4, 0.8, 0.8, material(COLORS.wood));
    addBox(group, room.cx, 1.8, room.z1 - 0.6, 8, 1.2, 0.3, material(COLORS.white));
  },

  granmadre(group, b, room) {
    shell(group, b, 6, material(COLORS.floor), material(COLORS.white), 'porphyry');
    addPhoto(group, 'duomo-navata.jpg', room.cx, 3, room.z1 - 0.18, 11, 4.8, Math.PI);
    altar(group, room.cx, room.z1 - 3);
    pews(group, room.cx, room.cz, room.w, room.d, 4);
  },

  sanpietro(group, b, room) {
    shell(group, b, 6, material(COLORS.floor), material(COLORS.white), 'porphyry');
    addPhoto(group, 'duomo-cripta.jpg', room.cx, 3, room.z1 - 0.18, 10, 4.5, Math.PI);
    altar(group, room.cx, room.z1 - 3);
    pews(group, room.cx, room.cz, room.w, room.d, 4);
  },
};

function barBuilder(photoA, photoB, blue) {
  return (group, b, room) => {
    shell(group, b, 4.2, material(COLORS.floor), material(blue ? COLORS.white : COLORS.stone), 'concrete');
    counter(group, room.cx, room.cz - 3.5, 7);
    tables(group, room.cx, room.cz, room.w, room.d, 6);
    for (let i = 0; i < 4; i++) addCylinder(group, room.cx - 2.6 + i * 1.7, 0.55, room.cz - 5.4, 0.3, 1.1, material(COLORS.wood), 6);
    addPhoto(group, photoA, room.cx - 3, 2.2, room.z1 - 0.18, 4.5, 3, Math.PI);
    addPhoto(group, photoB, room.cx + 3, 2.2, room.z1 - 0.18, 4.5, 3, Math.PI);
    if (blue) addBox(group, room.cx, 3.6, room.z0 + 0.3, 6, 0.5, 0.2, material('#2f6fa8'));
  };
}

BUILDERS['bar-blu-piramide'] = barBuilder('bar-gritti.jpg', 'bar-tropea.jpg', true);
BUILDERS['bar-nuovo'] = barBuilder('bar-gritti.jpg', 'bar-tropea.jpg', false);
BUILDERS['bar-diana'] = barBuilder('bar-tropea.jpg', 'bar-gritti.jpg', false);
BUILDERS['la-strega'] = barBuilder('bar-gritti.jpg', 'bar-tropea.jpg', false);

export class InteriorManager {
  constructor({ scene, entries }) {
    this.scene = scene;
    this.entries = new Map(entries.map(entry => [entry.id, entry]));
    this.objects = new Map();
    this.active = null;
    this.saved = null;
    this.lights = [];
    for (const entry of entries) {
      const group = new THREE.Group();
      group.name = 'interno-' + entry.id;
      const builder = BUILDERS[entry.id];
      if (builder) {
        const [x0, z0, x1, z1] = entry.bounds;
        builder(group, entry, { w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, x0, x1, z0, z1 });
      }
      group.visible = false;
      scene.add(group);
      this.objects.set(entry.id, group);
    }
  }

  nearestDoor(x, z, maxDistance = 4.5) {
    if (this.active) return null;
    let best = null;
    let bestDistance = maxDistance;
    for (const entry of this.entries.values()) {
      const distance = Math.hypot(entry.door[0] - x, entry.door[1] - z);
      if (distance < bestDistance) {
        best = entry;
        bestDistance = distance;
      }
    }
    return best;
  }

  _buildInteriorColliders(entry) {
    const colliders = [];
    const hash = makeSpatialHash(0, 8);
    for (const segment of entry.colliders || []) {
      const [x1, z1, x2, z2] = segment;
      const dx = x2 - x1, dz = z2 - z1;
      const length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length * 0.22, nz = dx / length * 0.22;
      const poly = [[x1 + nx, z1 + nz], [x2 + nx, z2 + nz], [x2 - nx, z2 - nz], [x1 - nx, z1 - nz]];
      const bounds = polygonBounds(poly);
      const collider = { poly, bounds, name: 'muro-' + entry.id, kind: 'interior' };
      colliders.push(collider);
      hash.insert(collider, bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ);
    }
    return { colliders, hash };
  }

  enter(id, world, player) {
    const entry = this.entries.get(id);
    if (!entry || this.active) return false;
    const hidden = [];
    for (const object of [world.landmarkGroups?.get(id), world.venues?.find(v => v.id === id)?.group]) {
      if (object && object.visible) {
        object.visible = false;
        hidden.push(object);
      }
    }
    const object = this.objects.get(id);
    if (object) object.visible = true;
    const physics = this._buildInteriorColliders(entry);
    this.saved = {
      colliders: world.colliders, hash: world.hash, hidden,
      position: player.position.clone(), yaw: player.yaw, cameraYaw: player.cameraYaw,
    };
    world.colliders = physics.colliders;
    world.hash = physics.hash;
    player.spawn(entry.spawn[0], entry.spawn[1], player.yaw);
    const cx = (entry.bounds[0] + entry.bounds[2]) / 2;
    const cz = (entry.bounds[1] + entry.bounds[3]) / 2;
    for (const [color, intensity, height] of [['#ffd9a0', 2.2, 4.2], ['#cfe0f0', 0.8, 3]]) {
      const light = new THREE.PointLight(color, intensity, 34, 1.6);
      light.position.set(cx, height, cz);
      this.scene.add(light);
      this.lights.push(light);
    }
    this.active = entry;
    try {
      const key = 'fidenza-interiors-visited';
      const visited = JSON.parse(localStorage.getItem(key) || '[]');
      if (!visited.includes(id)) {
        visited.push(id);
        localStorage.setItem(key, JSON.stringify(visited));
      }
    } catch { /* localStorage non disponibile */ }
    return true;
  }

  exit(world, player) {
    if (!this.active || !this.saved) return false;
    for (const light of this.lights) this.scene.remove(light);
    this.lights.length = 0;
    const object = this.objects.get(this.active.id);
    if (object) object.visible = false;
    world.colliders = this.saved.colliders;
    world.hash = this.saved.hash;
    for (const item of this.saved.hidden) item.visible = true;
    player.spawn(this.saved.position.x, this.saved.position.z, this.saved.yaw);
    player.cameraYaw = this.saved.cameraYaw;
    this.active = null;
    this.saved = null;
    return true;
  }
}

export async function loadInteriors({ scene, onProgress = () => {} } = {}) {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Dati interni non trovati (${response.status})`);
  const entries = await response.json();
  onProgress(1, 'Interni');
  return new InteriorManager({ scene, entries });
}
