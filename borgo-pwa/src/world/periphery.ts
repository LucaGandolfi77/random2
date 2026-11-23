import * as THREE from 'three';
import { GeoBatch, staticMaterial, TriBatch } from './batch';

/**
 * The edge of the playable city: hedgerows, poplar rows, a bus shelter and
 * two park gates. They make the map boundary read as countryside rather than
 * an invisible wall.
 */
export function createPeriphery(scene: THREE.Scene): void {
  const buildings = new TriBatch();
  const trees = new GeoBatch();

  for (let z = -250; z <= 950; z += 30) {
    buildings.box(2.4, 1.35 + ((z / 30) % 3) * 0.15, 24, 776.5, 0.68, z, 0x5f7247, 0.04);
  }
  for (let x = -350; x <= 735; x += 34) {
    buildings.box(26, 1.3 + ((x / 34) % 4) * 0.12, 2.4, x, 0.65, 997.5, 0x66764a, -0.03);
  }
  for (let z = -240; z <= 930; z += 42) {
    addPoplar(trees, 781, z);
  }
  for (let x = -340; x <= 720; x += 42) {
    addPoplar(trees, x, 1001);
  }

  addBusShelter(buildings, 596, 878);
  addParkGate(buildings, -234, 600, 0);
  addParkGate(buildings, 278, 784, 0);

  const staticMesh = buildings.build(staticMaterial());
  if (staticMesh) {
    staticMesh.castShadow = true;
    staticMesh.receiveShadow = true;
    scene.add(staticMesh);
  }
  const treeMesh = trees.build(
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
  );
  if (treeMesh) {
    treeMesh.castShadow = true;
    treeMesh.receiveShadow = true;
    scene.add(treeMesh);
  }

  addEdgeSign(scene, 'FIDENZA', 600, 994, Math.PI);
  addEdgeSign(scene, 'FIDENZA', 775, 360, -Math.PI / 2);
}

function addPoplar(batch: GeoBatch, x: number, z: number): void {
  batch.cylinder(0.18, 0.28, 3.8, 6, x, 1.9, z, 0x6b5338);
  batch.sphere(1.25, x, 6.2, z, 0x697c4d, 0, 2.8);
}

function addBusShelter(batch: TriBatch, x: number, z: number): void {
  batch.box(3.4, 0.16, 1.8, x, 2.7, z, 0x6f5b43);
  for (const dx of [-1.4, 1.4]) {
    for (const dz of [-0.7, 0.7]) {
      batch.box(0.1, 2.5, 0.1, x + dx, 1.35, z + dz, 0x4b463b);
    }
  }
  batch.box(2.4, 0.12, 0.55, x, 0.55, z, 0x8b6b45);
  batch.box(2.4, 0.5, 0.08, x, 0.25, z - 0.25, 0x6b5237);
  batch.box(0.12, 2.4, 0.12, x - 2.1, 1.2, z + 1.05, 0x4b463b);
  batch.box(0.12, 2.4, 0.12, x + 2.1, 1.2, z + 1.05, 0x4b463b);
  batch.box(4.4, 0.18, 0.25, x, 2.45, z + 1.05, 0x6f5b43);
}

function addParkGate(batch: TriBatch, x: number, z: number, ry: number): void {
  batch.box(0.36, 3.8, 0.36, x - 3, 1.9, z, 0x6b5b44, ry);
  batch.box(0.36, 3.8, 0.36, x + 3, 1.9, z, 0x6b5b44, ry);
  batch.box(6.8, 0.3, 0.3, x, 3.7, z, 0x80694e, ry);
  batch.box(6.8, 0.2, 0.2, x, 3.1, z, 0x5f5140, ry);
}

function addEdgeSign(scene: THREE.Scene, text: string, x: number, z: number, ry: number): void {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f4ead4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#3b3126';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = '#3b3126';
    ctx.font = '700 62px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 82);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), material);
  mesh.position.set(x, 2.4, z);
  mesh.rotation.y = ry;
  scene.add(mesh);
  const back = mesh.clone();
  back.rotation.y = ry + Math.PI;
  scene.add(back);

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 2.4, 0.14),
    new THREE.MeshLambertMaterial({ color: 0x4b4034, flatShading: true })
  );
  post.position.set(x, 1.2, z);
  scene.add(post);
}
