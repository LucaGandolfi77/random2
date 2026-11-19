/**
 * Cartellonistica derivata dai tag OSM: nomi delle strade e numeri civici.
 * Texture generate su canvas, nessun asset esterno.
 */

import * as THREE from 'three';
import { hashString } from './utils.js';

function signTexture(text, { background = '#2f5c8a', foreground = '#f4f1e8', fontSize = 52 } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `600 ${fontSize}px Oswald, "Trebuchet MS", sans-serif`;
  ctx.font = font;
  const width = Math.max(256, Math.ceil(ctx.measureText(text).width) + 56);
  const height = fontSize + 34;
  canvas.width = width;
  canvas.height = height;
  ctx.font = font;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  ctx.fillStyle = foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / height };
}

function addSprite(group, text, x, y, z, options) {
  const { texture, aspect } = signTexture(text, options);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  const height = options.scale || 1.05;
  sprite.scale.set(height * aspect, height, 1);
  sprite.position.set(x, y, z);
  sprite.name = 'targa-' + text.slice(0, 24);
  group.add(sprite);
}

export function buildStreetSigns({ scene, city, quality = 'high' }) {
  const group = new THREE.Group();
  group.name = 'targhe-stradali';
  if (quality === 'low') {
    scene.add(group);
    return group;
  }
  const roads = (city.roads || []).filter(road => road.name && road.length > 70);
  const maxSigns = quality === 'high' ? 36 : 18;
  for (const road of roads.slice(0, maxSigns)) {
    const pts = road.pts || [];
    if (pts.length < 2) continue;
    const index = Math.min(pts.length - 1, Math.max(1, Math.floor(pts.length * (0.35 + (hashString(String(road.id)) % 30) / 100))));
    const [x, z] = pts[index];
    addSprite(group, road.name.toUpperCase(), x, 3.1, z, { scale: 1.1 });
  }
  let numbers = 0;
  for (const building of city.buildings || []) {
    if (!building.addr || numbers >= 24) continue;
    addSprite(group, String(building.addr).slice(0, 8), building.x, 2.6, building.z,
      { background: '#e8e3d6', foreground: '#27333c', fontSize: 44, scale: 0.62 });
    numbers++;
  }
  scene.add(group);
  return group;
}
