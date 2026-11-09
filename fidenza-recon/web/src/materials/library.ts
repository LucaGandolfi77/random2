import * as THREE from 'three';
import type { Building } from '../types';
import { hashString, shade, textureSet } from '../utils';

const facadeCache = new Map<string, THREE.MeshStandardMaterial>();
const roofCache = new Map<string, THREE.MeshStandardMaterial>();

const MATERIAL_KIND: Record<string, string> = {
  plaster: 'plaster',
  brick: 'brick',
  stone: 'stone',
  concrete: 'concrete',
  glass: 'plaster',
  metal: 'metal',
  ceramic: 'plaster',
};

export function facadeMaterial(building: Building): THREE.MeshStandardMaterial {
  const key = `${building.facade.material}:${building.facade.primary}:${building.facade.roughness}`;
  const cached = facadeCache.get(key);
  if (cached) return cached;
  const kind = MATERIAL_KIND[building.facade.material] ?? 'plaster';
  const textures = textureSet(kind, 1 + (hashString(building.id) % 4));
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(building.facade.primary),
    roughness: building.facade.roughness,
    metalness: building.facade.metalness,
    map: textures.map,
    bumpMap: textures.bump,
    bumpScale: kind === 'brick' ? 0.035 : 0.015,
  });
  facadeCache.set(key, material);
  return material;
}

export function gableMaterial(building: Building): THREE.MeshStandardMaterial {
  return facadeMaterial(building);
}

export function roofMaterial(building: Building): THREE.MeshStandardMaterial {
  const key = `${building.roof.material}:${building.roof.colour}:${building.roof.shape}`;
  const cached = roofCache.get(key);
  if (cached) return cached;
  let kind = 'tiles';
  if (building.roof.material === 'membrane') kind = 'asphalt';
  if (building.roof.material === 'metal' || building.roof.material === 'slate') kind = 'metal';
  const textures = textureSet(kind, 2 + (hashString(building.id) % 3));
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(building.roof.colour).multiplyScalar(building.roof.material === 'membrane' ? 1.0 : 0.94),
    roughness: building.roof.material === 'metal' ? 0.45 : building.roof.material === 'membrane' ? 0.92 : 0.88,
    metalness: building.roof.material === 'metal' ? 0.5 : 0.0,
    map: textures.map,
    bumpMap: textures.bump,
    bumpScale: kind === 'tiles' ? 0.03 : 0.01,
    side: THREE.DoubleSide,
  });
  roofCache.set(key, material);
  return material;
}

export function darkMassMaterial(building: Building): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(shade(building.facade.primary, 0.9)),
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  });
}

export const materials = {
  glass: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#54727c'),
    roughness: 0.14,
    metalness: 0.55,
    envMapIntensity: 1.5,
    emissive: new THREE.Color('#16262b'),
    emissiveIntensity: 0.35,
  }),
  shopGlass: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2e444c'),
    roughness: 0.08,
    metalness: 0.6,
    envMapIntensity: 1.4,
  }),
  frame: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.05,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.0,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.7,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.0,
  }),
  concrete: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
  }),
  asphalt: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d8d2c6'),
    map: textureSet('asphalt', 1).map,
    bumpMap: textureSet('asphalt', 1).bump,
    bumpScale: 0.012,
    roughness: 1.0,
    metalness: 0.0,
    emissive: new THREE.Color('#342e26'),
    emissiveIntensity: 0.35,
  }),
  paving: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e4ded2'),
    map: textureSet('paving', 2).map,
    bumpMap: textureSet('paving', 2).bump,
    bumpScale: 0.01,
    roughness: 0.9,
    metalness: 0.0,
    emissive: new THREE.Color('#2e2a24'),
    emissiveIntensity: 0.22,
  }),
  gravel: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#938a7a'),
    roughness: 0.98,
  }),
  curb: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#b9b5ac'),
    roughness: 0.88,
  }),
  marking: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e8e4d8'),
    roughness: 0.7,
  }),
  trunk: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a4635'),
    roughness: 0.95,
  }),
  leaf: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4f6b3a'),
    roughness: 0.9,
    flatShading: true,
  }),
  grass: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6d7d55'),
    roughness: 1.0,
    side: THREE.DoubleSide,
  }),
  sky: new THREE.MeshBasicMaterial({
    color: new THREE.Color('#aebfca'),
    side: THREE.BackSide,
  }),
};

export function disposeMaterials(): void {
  facadeCache.forEach((material) => material.dispose());
  roofCache.forEach((material) => material.dispose());
  facadeCache.clear();
  roofCache.clear();
}
