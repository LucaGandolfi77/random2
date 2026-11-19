/**
 * Facciate fotografiche degli edifici reali di Fidenza (v3.3.6).
 * Nessun Blender, nessun GLB: pannelli PBR proiettati sui muri esistenti.
 * Le foto sono CC BY-SA, attribuite in assets/textures/exteriors/SOURCES.md.
 */

import * as THREE from 'three';

const DATA_URL = './data/facades.json';
const TEX_BASE = './assets/textures/exteriors/';

function coverUvs(image, width, height) {
  if (!image || !image.width || !image.height) return [[0, 0], [1, 0], [1, 1], [0, 1]];
  const imageAspect = image.width / image.height;
  const targetAspect = width / height;
  if (imageAspect > targetAspect) {
    const u = targetAspect / imageAspect;
    const du = (1 - u) / 2;
    return [[du, 0], [1 - du, 0], [1 - du, 1], [du, 1]];
  }
  const v = imageAspect / targetAspect;
  const dv = (1 - v) / 2;
  return [[0, dv], [1, dv], [1, 1 - dv], [0, 1 - dv]];
}

export async function loadFacades({ scene, onProgress = () => {} } = {}) {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Facciate non trovate (${response.status})`);
  const entries = await response.json();
  const loader = new THREE.TextureLoader();
  const group = new THREE.Group();
  group.name = 'facciate-fotografiche';
  let loaded = 0;

  await Promise.all(entries.map(entry => new Promise(resolve => {
    loader.load(TEX_BASE + entry.image, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      const geometry = new THREE.PlaneGeometry(entry.width, entry.height);
      // UV ritagliati per non deformare la foto sulla facciata.
      const uv = geometry.attributes.uv;
      const coords = coverUvs(texture.image, entry.width, entry.height);
      for (let i = 0; i < 4; i++) uv.setXY(i, coords[i][0], coords[i][1]);
      uv.needsUpdate = true;
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color('#333333'),
        roughness: 0.88,
        metalness: 0.02,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'facciata-' + entry.id;
      mesh.receiveShadow = true;
      mesh.userData.facade = entry.id;

      const building = new THREE.Group();
      building.position.set(entry.x, 0, entry.z);
      building.rotation.y = (entry.rotation || 0) * Math.PI / 180;
      // Fronte sul lato -z locale, verso la piazza.
      mesh.position.set(0, entry.height / 2 + 0.05, -entry.depth / 2 - 0.12);
      mesh.rotation.y = Math.PI;
      building.add(mesh);
      group.add(building);
      loaded++;
      onProgress(loaded / entries.length, entry.name);
      resolve();
    }, undefined, () => resolve());
  })));

  scene.add(group);
  return group;
}
