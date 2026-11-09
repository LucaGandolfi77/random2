import * as THREE from 'three';
import type { Prop } from '../types';
import { materials } from '../materials/library';
import { hashString, mulberry32 } from '../utils';

const geometries = {
  trunk: new THREE.CylinderGeometry(0.12, 0.18, 1, 6),
  canopy: new THREE.IcosahedronGeometry(1, 1),
  bollard: new THREE.CylinderGeometry(0.08, 0.1, 1, 8),
  bollardCap: new THREE.SphereGeometry(0.1, 8, 6),
  basin: new THREE.CylinderGeometry(0.8, 0.9, 0.55, 20),
  water: new THREE.CylinderGeometry(0.68, 0.68, 0.05, 20),
  bin: new THREE.CylinderGeometry(0.26, 0.24, 0.75, 10),
  hoop: new THREE.TorusGeometry(0.4, 0.035, 6, 16, Math.PI),
  benchSeat: new THREE.BoxGeometry(1.6, 0.08, 0.45),
  benchBack: new THREE.BoxGeometry(1.6, 0.4, 0.08),
  benchLeg: new THREE.BoxGeometry(0.08, 0.45, 0.4),
  pole: new THREE.CylinderGeometry(0.05, 0.05, 1, 6),
  signalHead: new THREE.BoxGeometry(0.24, 0.7, 0.22),
  sign: new THREE.PlaneGeometry(0.55, 0.55),
  threshold: new THREE.BoxGeometry(1.2, 0.03, 0.4),
};

const signMaterial = new THREE.MeshStandardMaterial({
  color: '#d8c34a',
  roughness: 0.5,
});

const waterMaterial = new THREE.MeshStandardMaterial({
  color: '#4f7d8a',
  roughness: 0.1,
  metalness: 0.35,
  transparent: true,
  opacity: 0.8,
});

interface Bucket {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
}

const buckets = new Map<string, Bucket>();

function bucket(
  key: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
): Bucket {
  const existing = buckets.get(key);
  if (existing) return existing;
  const created = { geometry, material, matrices: [] };
  buckets.set(key, created);
  return created;
}

function add(
  key: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  base: THREE.Vector3,
  offset: THREE.Vector3,
  scale: THREE.Vector3,
  quaternion = new THREE.Quaternion(),
): void {
  const target = bucket(key, geometry, material);
  const position = base.clone().add(offset);
  const matrix = new THREE.Matrix4().compose(position, quaternion, scale);
  target.matrices.push(matrix);
}

export function buildProps(props: Prop[]): THREE.Group {
  buckets.clear();
  const group = new THREE.Group();
  group.name = 'street-props';
  const identity = new THREE.Quaternion();

  for (const prop of props) {
    const random = mulberry32(hashString(prop.osm_id));
    const base = new THREE.Vector3(prop.x, prop.y, prop.z);
    if (prop.kind === 'tree') {
      const height = 2.2 + random() * 1.4;
      add(
        'trunk',
        geometries.trunk,
        materials.trunk,
        base,
        new THREE.Vector3(0, height / 2, 0),
        new THREE.Vector3(1, height, 1),
      );
      const clusters = 2 + Math.floor(random() * 2);
      for (let index = 0; index < clusters; index += 1) {
        const scale = 1.1 + random() * 0.7;
        add(
          'canopy',
          geometries.canopy,
          materials.leaf,
          base,
          new THREE.Vector3(
            (random() - 0.5) * 0.8,
            height + 0.4 + random() * 1.1,
            (random() - 0.5) * 0.8,
          ),
          new THREE.Vector3(scale, scale * (0.8 + random() * 0.3), scale),
        );
      }
    } else if (prop.kind === 'bollard') {
      add(
        'bollard',
        geometries.bollard,
        materials.metal,
        base,
        new THREE.Vector3(0, 0.48, 0),
        new THREE.Vector3(1, 0.95, 1),
      );
      add(
        'bollardCap',
        geometries.bollardCap,
        materials.metal,
        base,
        new THREE.Vector3(0, 0.98, 0),
        new THREE.Vector3(1, 1, 1),
      );
    } else if (prop.kind === 'waste_basket') {
      add(
        'bin',
        geometries.bin,
        materials.metal,
        base,
        new THREE.Vector3(0, 0.38, 0),
        new THREE.Vector3(1, 1, 1),
      );
    } else if (prop.kind === 'fountain') {
      add(
        'basin',
        geometries.basin,
        materials.stone,
        base,
        new THREE.Vector3(0, 0.28, 0),
        new THREE.Vector3(1, 1, 1),
      );
      add(
        'water',
        geometries.water,
        waterMaterial,
        base,
        new THREE.Vector3(0, 0.51, 0),
        new THREE.Vector3(1, 1, 1),
      );
    } else if (prop.kind === 'bicycle_parking') {
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      for (let index = 0; index < 3; index += 1) {
        add(
          'hoop',
          geometries.hoop,
          materials.metal,
          base,
          new THREE.Vector3((index - 1) * 0.7, 0.42, 0),
          new THREE.Vector3(1, 1, 1),
          quaternion,
        );
      }
    } else if (prop.kind === 'bench') {
      add(
        'benchSeat',
        geometries.benchSeat,
        materials.wood,
        base,
        new THREE.Vector3(0, 0.45, 0),
        new THREE.Vector3(1, 1, 1),
      );
      add(
        'benchBack',
        geometries.benchBack,
        materials.wood,
        base,
        new THREE.Vector3(0, 0.72, -0.2),
        new THREE.Vector3(1, 1, 1),
      );
      for (const x of [-0.65, 0.65]) {
        add(
          'benchLeg',
          geometries.benchLeg,
          materials.metal,
          base,
          new THREE.Vector3(x, 0.22, 0),
          new THREE.Vector3(1, 1, 1),
        );
      }
    } else if (prop.kind === 'traffic_signals') {
      add(
        'pole',
        geometries.pole,
        materials.metal,
        base,
        new THREE.Vector3(0, 1.6, 0),
        new THREE.Vector3(1, 3.2, 1),
      );
      add(
        'signalHead',
        geometries.signalHead,
        materials.metal,
        base,
        new THREE.Vector3(0, 3.0, 0),
        new THREE.Vector3(1, 1, 1),
      );
    } else if (prop.kind === 'bus_stop') {
      add(
        'pole',
        geometries.pole,
        materials.metal,
        base,
        new THREE.Vector3(0, 1.3, 0),
        new THREE.Vector3(1, 2.6, 1),
      );
      add(
        'sign',
        geometries.sign,
        signMaterial,
        base,
        new THREE.Vector3(0, 2.55, 0.03),
        new THREE.Vector3(1, 1, 1),
        identity,
      );
    } else if (prop.kind === 'entrance') {
      add(
        'threshold',
        geometries.threshold,
        materials.stone,
        base,
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(1, 1, 1),
      );
    }
  }

  for (const [key, value] of buckets) {
    if (!value.matrices.length) continue;
    const mesh = new THREE.InstancedMesh(value.geometry, value.material, value.matrices.length);
    value.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = key !== 'water' && key !== 'sign';
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = `prop:${key}`;
    group.add(mesh);
  }
  return group;
}
