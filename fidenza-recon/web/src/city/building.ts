import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Building } from '../types';
import { DetailBatcher, buildFacadeDetails, buildWalls } from './facade';
import { buildRoof, flatFootprintGeometry, massingGeometry } from './roof';
import { darkMassMaterial, facadeMaterial, roofMaterial } from '../materials/library';

function nonIndexed(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

function markMesh(mesh: THREE.Mesh, building: Building): THREE.Mesh {
  mesh.userData.osmId = building.osm_id;
  mesh.userData.building = building;
  return mesh;
}

export function buildBuildingLODs(
  building: Building,
  batcher: DetailBatcher,
  distances: { lod0: number; lod1: number; lod2: number; lod3: number },
): THREE.LOD {
  const lod = new THREE.LOD();
  lod.name = `building:${building.osm_id}`;
  lod.userData.osmId = building.osm_id;
  lod.userData.building = building;

  const base = flatFootprintGeometry(building, 0.06);
  const lod0 = new THREE.Mesh(base, darkMassMaterial(building));
  lod0.receiveShadow = true;
  markMesh(lod0, building);

  const massing = massingGeometry(building);
  const lod1 = new THREE.Mesh(massing, darkMassMaterial(building));
  lod1.castShadow = true;
  lod1.receiveShadow = true;
  markMesh(lod1, building);

  const walls = buildWalls(building);
  const roof = buildRoof(building, batcher);
  const wallMaterial = facadeMaterial(building);
  const roofMat = roofMaterial(building);

  const detailGroup = new THREE.Group();
  const midGroup = new THREE.Group();
  const addSurface = (group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    markMesh(mesh, building);
    group.add(mesh);
  };
  const facadeParts = [walls, roof.gable]
    .filter((part): part is THREE.BufferGeometry => Boolean(part))
    .map(nonIndexed);
  const facadeGeometry =
    facadeParts.length > 1 ? mergeGeometries(facadeParts, false) : facadeParts[0] ?? null;
  if (facadeGeometry) {
    addSurface(detailGroup, facadeGeometry, wallMaterial);
    addSurface(midGroup, facadeGeometry, wallMaterial);
  } else {
    addSurface(detailGroup, massing, darkMassMaterial(building));
    addSurface(midGroup, massing, darkMassMaterial(building));
  }
  if (roof.roof) {
    addSurface(detailGroup, roof.roof, roofMat);
    addSurface(midGroup, roof.roof, roofMat);
  }

  buildFacadeDetails(building, batcher);

  lod.addLevel(detailGroup, 0);
  lod.addLevel(midGroup, Math.max(1, distances.lod2));
  lod.addLevel(lod1, Math.max(1, distances.lod1));
  lod.addLevel(lod0, Math.max(1, distances.lod0));
  return lod;
}


function withVertexColour(geometry: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const colour = new THREE.Color(hex);
  const count = geometry.getAttribute('position').count;
  const values = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    values[index * 3] = colour.r;
    values[index * 3 + 1] = colour.g;
    values[index * 3 + 2] = colour.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
  return geometry;
}

export function buildContextBatch(buildings: Building[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'context-lod1';
  group.userData.kind = 'context-batch';
  const facadeGeometries: THREE.BufferGeometry[] = [];
  const roofGeometries: THREE.BufferGeometry[] = [];
  const dummy = new DetailBatcher();
  for (const building of buildings) {
    const massing = withVertexColour(
      nonIndexed(massingGeometry(building)),
      building.facade.primary,
    );
    facadeGeometries.push(massing);
    const roof = buildRoof(building, dummy, false);
    if (roof.gable) {
      facadeGeometries.push(
        withVertexColour(nonIndexed(roof.gable), building.facade.primary),
      );
    }
    if (roof.roof) {
      roofGeometries.push(withVertexColour(nonIndexed(roof.roof), building.roof.colour));
    }
  }
  const facadeMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
  });
  const roofTiles = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  if (facadeGeometries.length) {
    const merged = mergeGeometries(facadeGeometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, facadeMaterial);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.kind = 'context-batch';
      group.add(mesh);
    }
  }
  if (roofGeometries.length) {
    const merged = mergeGeometries(roofGeometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, roofTiles);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.kind = 'context-batch';
      group.add(mesh);
    }
  }
  return group;
}
