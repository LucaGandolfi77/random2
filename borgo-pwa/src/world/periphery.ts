import * as THREE from 'three';
import { STIRONE_BRIDGE } from '../data/town';
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
  for (let z = -280; z <= 970; z += 30) {
    buildings.box(2.4, 1.35 + ((z / 30) % 3) * 0.15, 24, -1446.5, 0.68, z, 0x5f7247, 0.04);
  }
  for (let z = -240; z <= 930; z += 42) {
    addPoplar(trees, 781, z);
    addPoplar(trees, -1452, z);
  }
  for (let x = -340; x <= 720; x += 42) {
    addPoplar(trees, x, 1001);
  }

  addBusShelter(buildings, 596, 878);
  addParkGate(buildings, -234, 600, 0);
  addParkGate(buildings, 278, 784, 0);
  addLuceArtwork(buildings);
  addStironePark(buildings);
  addStironeVegetation(trees);
  addHeron(scene, -1214, -104, 0.6);
  addHeron(scene, -1262, 62, -2.1);
  addHeron(scene, -1206, -52, 1.4);
  addEdgeSign(scene, 'PARCO DELLO STIRONE', -1112, -36, Math.PI / 2);
  addEdgeSign(scene, 'BOSCO DEI PIOPPI', -1320, 98, 0);

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
  addEdgeSign(scene, 'FIDENZA', -1444, 360, Math.PI / 2);
}

function addPoplar(batch: GeoBatch, x: number, z: number): void {
  batch.cylinder(0.18, 0.28, 3.8, 6, x, 1.9, z, 0x6b5338);
  batch.sphere(1.25, x, 6.2, z, 0x697c4d, 0, 2.8);
}

function addStironeVegetation(batch: GeoBatch): void {
  const trees = [
    [-1204, -18],
    [-1188, -72],
    [-1168, -120],
    [-1138, -158],
    [-1260, -14],
    [-1278, -72],
    [-1288, 24],
    [-1312, 58],
    [-1318, 88],
    [-1290, 126],
    [-1240, 116],
    [-1218, 62],
    [-1200, 18],
    [-1338, 6],
    [-1350, 42],
    [-1354, 76],
    [-1360, 112],
    [-1342, 158],
    [-1282, 172],
    [-1214, 138],
    [-1236, -206],
    [-1272, -228],
    [-1160, -214]
  ] as const;
  for (const [x, z] of trees) addBroadTree(batch, x, z);
  for (let i = 0; i < 7; i++) {
    const z = -120 + i * 28;
    addPoplar(batch, -1264 + i * 2, z);
  }
  for (let i = 0; i < 10; i++) {
    addPoplar(batch, -1352 + i * 3, 124 + i * 7);
  }
  for (let i = 0; i < 28; i++) {
    const z = -260 + i * 16;
    const x = -1240 + Math.sin(i * 1.7) * 4;
    addReeds(batch, x, z);
  }
  for (let i = 0; i < 12; i++) {
    const z = -110 + i * 18;
    addReeds(batch, -1215 + Math.sin(i * 2.1) * 3, z);
  }
  const bushes = [
    [-1258, -42, 0.9],
    [-1296, 8, 1.1],
    [-1322, 58, 0.8],
    [-1248, 104, 1.0],
    [-1308, 96, 0.85]
  ] as const;
  for (const [x, z, scale] of bushes) {
    batch.sphere(0.9 * scale, x, 0.5, z, 0x5f7046, 0, 0.8);
    batch.sphere(0.62 * scale, x + 0.7, 0.42, z + 0.3, 0x697b4c, 0, 0.8);
  }
  const rocks = [
    [-1240, -12, 0.55],
    [-1235, -86, 0.42],
    [-1221, 16, 0.5],
    [-1148, -154, 0.62],
    [-1300, 54, 0.38]
  ] as const;
  for (const [x, z, scale] of rocks) {
    batch.sphere(scale, x, 0.12, z, 0x8a8778, 0, 0.42);
  }
}

function addReeds(batch: GeoBatch, x: number, z: number): void {
  for (let i = 0; i < 4; i++) {
    batch.cylinder(0.02, 0.035, 1.1 + (i % 2) * 0.25, 4, x + i * 0.28, 0.55, z + (i % 2) * 0.22, 0x8b9857);
  }
}

function addBroadTree(batch: GeoBatch, x: number, z: number): void {
  batch.cylinder(0.18, 0.3, 2.2, 5, x, 1.1, z, 0x6b5338);
  batch.sphere(1.55, x, 3.6, z, 0x667849, 0, 1.15);
  batch.sphere(1.0, x + 0.8, 4.1, z - 0.4, 0x71824f, 0, 1.05);
}

function addStironePark(batch: TriBatch): void {
  const bridge = STIRONE_BRIDGE;
  batch.box(bridge.halfWidth * 2, 0.16, bridge.halfDepth * 2, bridge.x, 0.08, bridge.z, 0x8a6a45);
  for (const side of [-1, 1]) {
    const z = bridge.z + side * (bridge.halfDepth - 0.3);
    batch.box(bridge.halfWidth * 2, 0.16, 0.16, bridge.x, 1.0, z, 0x5b4632);
    for (let i = -1; i <= 1; i++) {
      batch.box(0.18, 1.1, 0.18, bridge.x + i * (bridge.halfWidth - 0.4), 0.55, z, 0x5b4632);
    }
  }
  const trail = [
    [-1080, -15],
    [-1120, -25],
    [-1190, -38],
    [bridge.x - bridge.halfWidth, bridge.z]
  ] as const;
  addTrail(batch, trail, 2.6, 0xc5b087);
  const westTrail = [
    [bridge.x + bridge.halfWidth, bridge.z],
    [-1280, -30],
    [-1310, 30],
    [-1320, 100]
  ] as const;
  addTrail(batch, westTrail, 2.4, 0xc5b087);
  const groveLoop = [
    [-1320, 100],
    [-1344, 118],
    [-1342, 146],
    [-1312, 160],
    [-1294, 134],
    [-1302, 110]
  ] as const;
  addTrail(batch, groveLoop, 2.2, 0xc0ab82);

  addBench(batch, -1260, -8, Math.PI / 2);
  addBench(batch, -1310, 76, Math.PI / 2);
  addBench(batch, -1152, -48, -Math.PI / 2);
  addBench(batch, -1330, 126, Math.PI / 2);
  addParkBoard(batch, -1249, -24, Math.PI / 2);
  addParkBoard(batch, -1333, 103, 0);

  batch.box(8.0, 0.22, 6.0, -1320, 0.11, 110, 0x8a6a45);
  batch.box(7.0, 0.9, 0.12, -1320, 0.48, 113, 0x5b4632);
  for (const x of [-3.6, 3.6]) {
    for (const z of [3.7, -2.7]) {
      batch.box(0.18, 1.3, 0.18, -1320 + x, 0.65, 110 + z, 0x5b4632);
    }
  }
  batch.box(8.2, 0.14, 0.12, -1320, 1.35, 113, 0x5b4632);
  batch.box(0.16, 1.2, 6.2, -1324, 0.65, 110, 0x5b4632);
  batch.box(0.16, 1.2, 6.2, -1316, 0.65, 110, 0x5b4632);
  batch.box(2.8, 0.12, 1.8, -1280, 0.62, 30, 0x79563a);
  for (const x of [-1.05, 1.05]) {
    batch.box(0.12, 0.62, 0.12, -1280 + x, 0.31, 30.6, 0x5b4632);
    batch.box(0.12, 0.62, 0.12, -1280 + x, 0.31, 29.4, 0x5b4632);
  }
  batch.box(3.1, 0.08, 0.45, -1280, 0.82, 30, 0x8a6a45);
}

function addTrail(
  batch: TriBatch,
  points: ReadonlyArray<readonly [number, number]>,
  width: number,
  color: number
): void {
  const half = width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const length = Math.hypot(dx, dz) || 1;
    const nx = (dz / length) * half;
    const nz = (-dx / length) * half;
    batch.quadUp(ax + nx, 0.0196, az + nz, bx + nx, 0.0196, bz + nz, bx - nx, 0.0196, bz - nz, ax - nx, 0.0196, az - nz, color);
  }
}

function addBench(batch: TriBatch, x: number, z: number, ry: number): void {
  batch.box(2.2, 0.09, 0.56, x, 0.5, z, 0x7c5a3b, ry);
  const bx = x + Math.sin(ry) * 0.28;
  const bz = z + Math.cos(ry) * 0.28;
  batch.box(2.2, 0.5, 0.09, bx, 0.8, bz, 0x7c5a3b, ry);
  for (const side of [-0.85, 0.85]) {
    const lx = x + Math.cos(ry) * side;
    const lz = z - Math.sin(ry) * side;
    batch.box(0.12, 0.5, 0.42, lx, 0.25, lz, 0x5b4632, ry);
  }
}

function addParkBoard(batch: TriBatch, x: number, z: number, ry: number): void {
  for (const side of [-0.72, 0.72]) {
    const px = x + Math.cos(ry) * side;
    const pz = z - Math.sin(ry) * side;
    batch.box(0.13, 1.7, 0.13, px, 0.85, pz, 0x5b4632, ry);
  }
  batch.box(1.9, 1.05, 0.12, x, 1.55, z, 0x8b6a45, ry);
  batch.box(1.62, 0.75, 0.06, x + Math.sin(ry) * 0.08, 1.55, z + Math.cos(ry) * 0.08, 0xd8c9a4, ry);
}

function addHeron(scene: THREE.Scene, x: number, z: number, rotation: number): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.22, 0),
    new THREE.MeshLambertMaterial({ color: 0x9ca7a1, flatShading: true })
  );
  body.scale.set(1.6, 0.7, 0.8);
  body.position.y = 0.92;
  group.add(body);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 0.8, 5),
    new THREE.MeshLambertMaterial({ color: 0xd7d1bc, flatShading: true })
  );
  neck.position.set(0.22, 1.35, 0);
  neck.rotation.z = -0.25;
  group.add(neck);
  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.09, 0),
    new THREE.MeshLambertMaterial({ color: 0xd7d1bc, flatShading: true })
  );
  head.position.set(0.32, 1.73, 0);
  group.add(head);
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.3, 5),
    new THREE.MeshLambertMaterial({ color: 0xd9a441, flatShading: true })
  );
  beak.position.set(0.5, 1.72, 0);
  beak.rotation.z = -Math.PI / 2;
  group.add(beak);
  for (const leg of [-0.08, 0.08]) {
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.7, 4),
      new THREE.MeshLambertMaterial({ color: 0x4e4638, flatShading: true })
    );
    shin.position.set(leg, 0.35, 0);
    group.add(shin);
  }
  scene.add(group);
}

function addLuceArtwork(batch: TriBatch): void {
  const x = -620;
  const z = -176;
  batch.box(2.2, 0.35, 2.2, x, 0.18, z, 0x5b4a37);
  batch.box(0.28, 4.8, 0.28, x, 2.55, z, 0xb58a44);
  for (let i = 0; i < 5; i++) {
    batch.box(0.45, 0.45, 0.45, x, 1.4 + i * 0.72, z, i % 2 ? 0xd9a441 : 0xf0d489, 0.6 + i * 0.2);
  }
  batch.box(0.08, 1.1, 0.08, x, 5.55, z, 0x4a4035);
  batch.box(0.7, 0.08, 0.08, x, 5.85, z, 0x4a4035);
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
    const size = Math.min(62, Math.floor((canvas.width / Math.max(7, text.length)) * 1.15));
    ctx.font = `700 ${size}px Georgia, serif`;
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
