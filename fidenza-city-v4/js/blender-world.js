/**
 * Fidenza da Giocare v4.2 — caricamento del mondo Blender con materiali
 * accessibili, finestre categorizzate, neve, LOD e fallback low-poly.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const CHUNK_BASE = './assets/3d/blender-city/';
const LEGACY_FILES = [
  'terreno.glb', 'centro.glb', 'monica.glb', 'sanlazzaro.glb',
  'azalee.glb', 'corea.glb', 'luce.glb', 'coduro.glb'
];

function imageTexture(image) {
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function featherTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.55, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function applyOrthophoto(terrainMeshes, ground, root, quality) {
  const meta = ground?.meta?.base;
  if (!ground?.image || !meta?.bounds) return false;
  const bounds = meta.bounds;
  const texture = imageTexture(ground.image);
  texture.anisotropy = quality === 'high' ? 8 : 4;
  for (const mesh of terrainMeshes) {
    const position = mesh.geometry?.getAttribute('position');
    if (!position) continue;
    const uv = mesh.geometry.getAttribute('uv') || new THREE.BufferAttribute(new Float32Array(position.count * 2), 2);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      uv.setXY(i,
        (x - bounds.minX) / (bounds.maxX - bounds.minX),
        (bounds.maxZ - z) / (bounds.maxZ - bounds.minZ));
    }
    uv.needsUpdate = true;
    mesh.geometry.setAttribute('uv', uv);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      material.map = texture;
      material.needsUpdate = true;
    }
  }
  const center = ground.meta.center;
  if (ground.centerImage && center?.bounds && quality !== 'low') {
    const cb = center.bounds;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(cb.maxX - cb.minX, cb.maxZ - cb.minZ),
      new THREE.MeshBasicMaterial({
        map: imageTexture(ground.centerImage),
        alphaMap: featherTexture(),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((cb.minX + cb.maxX) / 2, 0.018, (cb.minZ + cb.maxZ) / 2);
    plane.name = 'ortofoto-centro';
    root.add(plane);
  }
  return true;
}

export async function loadBlenderWorld({ scene, quality = 'high', onProgress = () => {}, preferLowPoly = false, lod = true, ground = null } = {}) {
  const response = await fetch(CHUNK_BASE + 'manifest.json');
  if (!response.ok) throw new Error(`Manifesto Blender non trovato (${response.status})`);
  const manifest = await response.json();

  const useLegacy = preferLowPoly || (manifest.version || 1) < 2;
  const files = useLegacy
    ? (manifest.legacyChunks || LEGACY_FILES)
    : [manifest.file || 'fidenza-realistic.glb'];

  const draco = new DRACOLoader();
  draco.setDecoderPath('./vendor/draco/');
  draco.preload();
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const root = new THREE.Group();
  root.name = 'citta-blender';
  const materialsByName = new Map();
  const windowMeshes = [];
  const terrainMeshes = [];
  const snowMeshes = [];
  const lodGroups = [];
  const windowPrefix = manifest.windowObject || 'finestre';

  for (let i = 0; i < files.length; i++) {
    const gltf = await loader.loadAsync(CHUNK_BASE + files[i]);
    const model = gltf.scene;
    model.name = 'blender-chunk-' + i;

    // LOD: ricostruisce una coppia hi/lo per quartiere se i nodi esistono.
    const highNodes = new Map();
    model.traverse(object => {
      if (object.isMesh && object.name.endsWith('-hi')) highNodes.set(object.name.slice(0, -3), object);
    });

    model.traverse((object) => {
      if (!object.isMesh) return;
      const name = object.name || '';
      const isTerrain = name === 'terreno' || object.parent?.name === 'terreno' || name.startsWith('terreno-');
      const isWindow = name.startsWith(windowPrefix);
      const isSnow = name === 'neve' || name.startsWith('neve-');
      const isLow = name.endsWith('-lo');
      object.castShadow = !isTerrain && !isSnow && quality !== 'low';
      object.receiveShadow = !isSnow;

      // Il materiale PBR e' condiviso: le finestre e la neve richiedono copie.
      if (isWindow || isSnow) {
        object.material = Array.isArray(object.material)
          ? object.material.map(material => material.clone())
          : object.material.clone();
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        material.flatShading = false;
        if (isWindow) {
          material.emissive = new THREE.Color('#000000');
          material.emissiveIntensity = 1;
          material.roughness = 0.14;
          material.metalness = 0.04;
          material.envMapIntensity = 1.4;
        } else if (isSnow) {
          material.roughness = 0.92;
        } else {
          const matName = material.name || '';
          material.envMapIntensity = matName.includes('road') || matName.includes('water') ? 0.8 : 0.3;
        }
        if (material.name) materialsByName.set(material.name, material);
        material.needsUpdate = true;
      }
      if (isWindow) {
        const category = name.includes('warm') ? 'warm' : name.includes('cool') ? 'cool' : 'dark';
        object.userData.windowCategory = category;
        windowMeshes.push(object);
      }
      if (isTerrain) terrainMeshes.push(object);
      if (isSnow) {
        object.visible = false;
        snowMeshes.push(object);
      }
    });

    // LOD per quartiere: i nodi -lo restano nascosti finche' non servono.
    if (lod && !useLegacy && highNodes.size) {
      for (const [baseName, high] of highNodes) {
        const low = model.getObjectByName(baseName + '-lo');
        if (!low) continue;
        const group = new THREE.LOD();
        group.name = 'lod-' + baseName;
        // I nodi sono gia' nel model: li spostiamo senza alterare le coordinate.
        high.removeFromParent();
        low.removeFromParent();
        group.addLevel(high, 0);
        group.addLevel(low, 420);
        group.autoUpdate = true;
        model.add(group);
        lodGroups.push(group);
      }
    }

    root.add(model);
    onProgress((i + 1) / files.length, manifest.chunks?.[i]?.name || `chunk ${i + 1}`);
  }

  // Esterni HD: sostituiscono i landmark semplificati del GLB principale.
  if (!useLegacy) {
    try {
      const hdResponse = await fetch(CHUNK_BASE + 'landmarks-hd-manifest.json');
      if (hdResponse.ok) {
        const hdManifest = await hdResponse.json();
        const hdGltf = await loader.loadAsync(CHUNK_BASE + (hdManifest.file || 'landmarks-hd.glb'));
        for (const name of hdManifest.replace || []) {
          const old = root.getObjectByName(name);
          if (old) old.visible = false;
        }
        hdGltf.scene.name = 'landmark-hd';
        hdGltf.scene.traverse((object) => {
          if (!object.isMesh) return;
          object.castShadow = quality !== 'low';
          object.receiveShadow = true;
        });
        root.add(hdGltf.scene);
        onProgress(1, 'Facciate HD');
      }
    } catch (err) {
      console.warn('Esterni HD non disponibili', err);
    }
  }

  if (!useLegacy && terrainMeshes.length && ground) {
    try {
      applyOrthophoto(terrainMeshes, ground, root, quality);
    } catch (err) {
      console.warn('Ortofoto non applicata al terreno Blender', err);
    }
  }

  scene.add(root);
  return {
    root, manifest, materialsByName, windowMeshes, terrainMeshes, snowMeshes,
    lodGroups, useLegacy,
    material: name => materialsByName.get(name) || null,
  };
}
