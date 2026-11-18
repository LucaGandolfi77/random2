/**
 * Fidenza da Giocare v4.3 — gestione degli interni modellati in Blender.
 * Carica interiors.glb su richiesta e gestisce porta, collider e luci.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { makeSpatialHash, polygonBounds } from './utils.js';

const BASE = './assets/3d/blender-city/';

export class InteriorManager {
  constructor({ scene, manifest, root, quality }) {
    this.scene = scene;
    this.manifest = manifest;
    this.root = root;
    this.quality = quality;
    this.entries = new Map();
    this.active = null;
    this.saved = null;
    this.lights = [];
    for (const entry of manifest.interiors || []) {
      const object = root.getObjectByName(entry.object);
      if (object) {
        object.visible = false;
        entry.object3d = object;
      }
      this.entries.set(entry.id, entry);
    }
  }

  nearestDoor(x, z, maxDistance = 4.5) {
    if (this.active) return null;
    let best = null;
    let bestDistance = maxDistance;
    for (const entry of this.entries.values()) {
      if (!entry.door) continue;
      const distance = Math.hypot(entry.door[0] - x, entry.door[1] - z);
      if (distance < bestDistance) {
        best = entry;
        bestDistance = distance;
      }
    }
    return best;
  }

  _hideExterior(id, world) {
    const hidden = [];
    // I nodi landmark del GLB non si toccano: vengono gestiti dallo swap HD
    // in blender-world.js (e rimetterli visibili li sovrapporrebbero).
    const candidates = [
      world.landmarkGroups?.get(id),
      world.venues?.find(venue => venue.id === id)?.group,
      // Il guscio HD va nascosto dentro e ripristinato all'uscita.
      world.blenderWorld?.root?.getObjectByName('landmark-hd-' + id),
    ];
    for (const object of candidates) {
      if (object && object.visible) {
        object.visible = false;
        hidden.push(object);
      }
    }
    return hidden;
  }

  _buildInteriorColliders(entry) {
    const colliders = [];
    const hash = makeSpatialHash(0, 8);
    for (const segment of entry.colliders || []) {
      const [x1, z1, x2, z2] = segment;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length * 0.22;
      const nz = dx / length * 0.22;
      const poly = [
        [x1 + nx, z1 + nz], [x2 + nx, z2 + nz],
        [x2 - nx, z2 - nz], [x1 - nx, z1 - nz],
      ];
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
    const hidden = this._hideExterior(id, world);
    if (entry.object3d) entry.object3d.visible = true;

    const physics = this._buildInteriorColliders(entry);
    this.saved = {
      colliders: world.colliders,
      hash: world.hash,
      hidden,
      position: player.position.clone(),
      yaw: player.yaw,
      cameraYaw: player.cameraYaw,
    };
    world.colliders = physics.colliders;
    world.hash = physics.hash;

    const [spawnX, spawnZ] = entry.spawn || entry.door;
    player.spawn(spawnX, spawnZ, player.yaw);

    const [cx, cz] = entry.bounds
      ? [(entry.bounds[0] + entry.bounds[2]) / 2, (entry.bounds[1] + entry.bounds[3]) / 2]
      : entry.door;
    const light = new THREE.PointLight('#ffd9a0', this.quality === 'low' ? 0.9 : 1.6, 34, 1.6);
    light.position.set(cx, 4.2, cz);
    light.name = 'luce-interno-' + id;
    this.scene.add(light);
    this.lights.push(light);
    if (this.quality !== 'low') {
      const fill = new THREE.PointLight('#cfe0f0', 0.5, 28, 1.8);
      fill.position.set(cx, 3.0, cz - 2);
      this.scene.add(fill);
      this.lights.push(fill);
    }

    this.active = entry;
    try {
      const key = 'fidenza-interiors-visited';
      const visited = JSON.parse(localStorage.getItem(key) || '[]');
      if (!visited.includes(id)) {
        visited.push(id);
        localStorage.setItem(key, JSON.stringify(visited));
      }
    } catch {
      // localStorage non disponibile: la visita non viene registrata.
    }
    return true;
  }

  exit(world, player) {
    if (!this.active || !this.saved) return false;
    for (const light of this.lights) this.scene.remove(light);
    this.lights.length = 0;
    this.active.object3d.visible = false;
    world.colliders = this.saved.colliders;
    world.hash = this.saved.hash;
    for (const object of this.saved.hidden) object.visible = true;
    const saved = this.saved;
    player.spawn(saved.position.x, saved.position.z, saved.yaw);
    player.cameraYaw = saved.cameraYaw;
    this.active = null;
    this.saved = null;
    return true;
  }
}

export async function loadInteriors({ scene, quality = 'high', onProgress = () => {} } = {}) {
  const response = await fetch(BASE + 'interiors-manifest.json');
  if (!response.ok) throw new Error(`Manifesto interni non trovato (${response.status})`);
  const manifest = await response.json();
  const draco = new DRACOLoader();
  draco.setDecoderPath('./vendor/draco/');
  draco.preload();
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(BASE + (manifest.file || 'interiors.glb'));
  const root = gltf.scene;
  root.name = 'interni-blender';
  scene.add(root);
  onProgress(1, 'Interni');
  return new InteriorManager({ scene, manifest, root, quality });
}
