/**
 * Materiali e texture procedurali in stile Minecraft.
 *
 * Le texture sono generate da `block-textures.js` (pixel art originale,
 * nessun asset Mojang). Questo modulo aggiunge il wrapper Three.js.
 */

import * as THREE from 'three';
import { blockColor, blockKey, isGlassBlock } from './block-palette.js';
import { createBlockCanvas, textureStyleFor } from './block-textures.js';

export const BLOCK_SIZE = 2; // 1 blocco Arnis = 2 metri (scala 0.5)

const textureCache = new Map();
const materialCache = new Map();
const waterTextures = [];

export function getBlockTexture(block, { quality = 'high', size = 16 } = {}) {
  const key = blockKey(block);
  const style = textureStyleFor(key);
  const cacheKey = `${key}:${style}:${size}:${quality}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const canvas = createBlockCanvas(key, { size });
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = quality === 'low' ? THREE.NearestFilter : THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = quality !== 'low';
  texture.anisotropy = quality === 'high' ? 4 : 1;
  if (isGlassBlock(key)) texture.premultiplyAlpha = true;
  if (key === 'water') waterTextures.push(texture);
  textureCache.set(cacheKey, texture);
  return texture;
}

export function isTransparentBlock(block) {
  const key = blockKey(block);
  return isGlassBlock(key) || key === 'water' || key === 'ice' || key.endsWith('_glass');
}

export function isEmissiveBlock(block) {
  const key = blockKey(block);
  return ['glowstone', 'lantern', 'sea_lantern', 'end_rod'].includes(key);
}

export function getBlockMaterial(block, {
  quality = 'high',
  vertexColors = false,
  side = THREE.FrontSide,
  transparent = null,
  opacity = null,
  depthWrite = null,
  emissiveIntensity = 0.7
} = {}) {
  const key = blockKey(block);
  const style = textureStyleFor(key);
  const glass = isGlassBlock(key);
  const water = key === 'water';
  const isTransparent = transparent ?? (glass || water);
  const cacheKey = [
    key, style, quality, vertexColors ? 1 : 0, side, isTransparent ? 1 : 0,
    opacity ?? 'auto', depthWrite ?? 'auto', emissiveIntensity
  ].join(':');
  if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
  const texture = getBlockTexture(key, { quality });
  const options = {
    map: texture,
    vertexColors,
    side,
    transparent: isTransparent,
    opacity: opacity ?? (glass ? 0.58 : water ? 0.82 : 1),
    depthWrite: depthWrite ?? !isTransparent
  };
  if (emissiveIntensity > 0 && isEmissiveBlock(key)) {
    options.emissive = new THREE.Color(blockColor(key));
    options.emissiveIntensity = emissiveIntensity;
    options.emissiveMap = texture;
  }
  const material = new THREE.MeshLambertMaterial(options);
  material.name = `block-${key}`;
  materialCache.set(cacheKey, material);
  return material;
}

export function animateWater(time) {
  for (const texture of waterTextures) {
    texture.offset.x = (time * 0.02) % 1;
    texture.offset.y = (time * 0.012) % 1;
  }
}

export function blockUvScale() {
  return 1 / BLOCK_SIZE;
}

export function clearBlockCaches() {
  textureCache.clear();
  materialCache.clear();
  waterTextures.length = 0;
}
