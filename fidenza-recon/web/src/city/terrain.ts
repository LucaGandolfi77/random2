import * as THREE from 'three';
import type { CityData } from '../types';
import { materials } from '../materials/library';

export interface TerrainBuild {
  group: THREE.Group;
  sample: (x: number, z: number) => number;
}

export function buildTerrain(city: CityData, dataBase: string): TerrainBuild {
  const { terrain } = city;
  const [minX, minZ, maxX, maxZ] = terrain.bbox_local;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const nx = terrain.nx;
  const nz = terrain.nz;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const heightAt = (index: number): number => {
    const value = terrain.heights[index];
    return value === null ? 0 : value;
  };

  for (let iz = 0; iz <= nz; iz += 1) {
    for (let ix = 0; ix <= nx; ix += 1) {
      const x = minX + (width * ix) / nx;
      const z = minZ + (depth * iz) / nz;
      positions.push(x, heightAt(iz * (nx + 1) + ix), z);
      uvs.push(ix / nx, 1 - iz / nz);
    }
  }
  for (let iz = 0; iz < nz; iz += 1) {
    for (let ix = 0; ix < nx; ix += 1) {
      const p00 = iz * (nx + 1) + ix;
      const p10 = p00 + 1;
      const p01 = p00 + nx + 1;
      const p11 = p01 + 1;
      indices.push(p00, p01, p10, p10, p01, p11);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const texture = new THREE.TextureLoader().load(`${dataBase}${city.ground.image}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const groundMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color('#f4f1ea'),
    toneMapped: false,
  });
  const ground = new THREE.Mesh(geometry, groundMaterial);
  ground.receiveShadow = false;
  ground.name = 'terrain';
  ground.userData.kind = 'terrain';

  const group = new THREE.Group();
  group.name = 'terrain-group';
  group.add(ground);

  const skirtBuilder = new THREE.BufferGeometry();
  const skirtPositions: number[] = [];
  const skirtIndices: number[] = [];
  const edges: [number, number, number, number, number, number, number, number][] = [
    [minX, minZ, maxX, minZ, 0, 0, nx, 0],
    [maxX, minZ, maxX, maxZ, nx, 0, nx, nz],
    [maxX, maxZ, minX, maxZ, nx, nz, 0, nz],
    [minX, maxZ, minX, minZ, 0, nz, 0, 0],
  ];
  void skirtBuilder;
  for (const [x0, z0, x1, z1, ix0, iz0, ix1, iz1] of edges) {
    const h0 = heightAt(iz0 * (nx + 1) + ix0);
    const h1 = heightAt(iz1 * (nx + 1) + ix1);
    const base = skirtPositions.length / 3;
    skirtPositions.push(x0, h0, z0, x1, h1, z1, x1, h1 - 7, z1, x0, h0 - 7, z0);
    skirtIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const skirtGeometry = new THREE.BufferGeometry();
  skirtGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skirtPositions, 3));
  skirtGeometry.setIndex(skirtIndices);
  skirtGeometry.computeVertexNormals();
  const skirt = new THREE.Mesh(skirtGeometry, materials.grass);
  skirt.receiveShadow = true;
  group.add(skirt);

  const outer = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), materials.grass);
  outer.rotation.x = -Math.PI / 2;
  outer.position.set((minX + maxX) / 2, -7.2, (minZ + maxZ) / 2);
  outer.receiveShadow = true;
  group.add(outer);

  const sample = (x: number, z: number): number => {
    const gx = ((x - minX) / width) * nx;
    const gz = ((z - minZ) / depth) * nz;
    const ix = Math.max(0, Math.min(nx - 1, Math.floor(gx)));
    const iz = Math.max(0, Math.min(nz - 1, Math.floor(gz)));
    const fx = Math.max(0, Math.min(1, gx - ix));
    const fz = Math.max(0, Math.min(1, gz - iz));
    const h00 = heightAt(iz * (nx + 1) + ix);
    const h10 = heightAt(iz * (nx + 1) + ix + 1);
    const h01 = heightAt((iz + 1) * (nx + 1) + ix);
    const h11 = heightAt((iz + 1) * (nx + 1) + ix + 1);
    return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
  };

  return { group, sample };
}
