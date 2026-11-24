import * as THREE from 'three';
import { STIRONE_BRIDGE } from '../data/town';
import { INTERIORS } from '../data/interiors';
import { GeoBatch, staticMaterial, TriBatch } from './batch';

/**
 * The edge of the playable city: hedgerows, poplar rows, a bus shelter and
 * two park gates. They make the map boundary read as countryside rather than
 * an invisible wall.
 */
export function createPeriphery(scene: THREE.Scene): void {
  const buildings = new TriBatch();
  const trees = new GeoBatch();

  for (let z = -590; z <= 1380; z += 30) {
    buildings.box(2.4, 1.35 + ((z / 30) % 3) * 0.15, 24, 1386.5, 0.68, z, 0x5f7247, 0.04);
  }
  for (let x = -1440; x <= 1380; x += 34) {
    buildings.box(26, 1.3 + ((x / 34) % 4) * 0.12, 2.4, x, 0.65, 1396.5, 0x66764a, -0.03);
  }
  for (let x = -1440; x <= 1380; x += 34) {
    buildings.box(26, 1.3 + ((x / 34) % 4) * 0.12, 2.4, x, 0.65, -596.5, 0x66764a, -0.03);
  }
  for (let z = -590; z <= 1380; z += 30) {
    buildings.box(2.4, 1.35 + ((z / 30) % 3) * 0.15, 24, -1446.5, 0.68, z, 0x5f7247, 0.04);
  }
  for (let z = -580; z <= 1380; z += 42) {
    addPoplar(trees, 1391, z);
    addPoplar(trees, -1452, z);
  }
  for (let x = -1440; x <= 1380; x += 42) {
    addPoplar(trees, x, 1401);
    addPoplar(trees, x, -601);
  }

  addBusShelter(buildings, 596, 878);
  addParkGate(buildings, -234, 600, 0);
  addParkGate(buildings, 278, 784, 0);
  addLuceArtwork(buildings);
  addStironePark(buildings);
  addStironeVegetation(trees);
  addAzaleeDistrict(buildings);
  addAzaleeVegetation(trees);
  addAermacchi(scene);
  addSouthDistrict(buildings);
  addSouthVegetation(trees);
  addNorthDistrict(buildings, trees);
  addNorthVegetation(trees);
  addFoundPlaces(buildings);
  addFoundVegetation(trees);
  addInteriorPortals(buildings);
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

  addEdgeSign(scene, 'FIDENZA', 600, 1394, Math.PI);
  addEdgeSign(scene, 'FIDENZA', 0, -594, 0);
  addEdgeSign(scene, 'FIDENZA', 1384, 360, -Math.PI / 2);
  addEdgeSign(scene, 'LE AZALEE', 790, 620, -Math.PI / 2);
  addEdgeSign(scene, 'CENTRO COMMERCIALE', 930, 900, 0);
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

function flatDisc(
  batch: TriBatch,
  x: number,
  z: number,
  radius: number,
  segments: number,
  y: number,
  color: number
): void {
  const points: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
  }
  batch.polygonTop(points, y, color);
}

function addAzaleeDistrict(batch: TriBatch): void {
  const px = 900;
  const pz = 420;
  flatDisc(batch, px, pz, 4.2, 24, 0.052, 0xb9a67f);
  flatDisc(batch, px, pz, 3.4, 24, 0.058, 0x6f9fae);
  batch.box(0.55, 1.1, 0.55, px, 0.55, pz, 0xd3c29e);
  flatDisc(batch, px, pz, 1.15, 16, 1.14, 0xd9c9a6);
  addBench(batch, px - 12, pz, Math.PI / 2);
  addBench(batch, px + 12, pz, -Math.PI / 2);
  addBench(batch, px, pz - 12, 0);
  addBench(batch, px, pz + 12, Math.PI);
  addFlowerBed(batch, px - 13, pz + 10);
  addFlowerBed(batch, px + 13, pz - 10);
  addTrail(batch, [[864, 420], [900, 420]], 3.4, 0xc5b087);
  addTrail(batch, [[900, 420], [936, 444]], 3.4, 0xc5b087);

  const gx = 900;
  const gz = 790;
  flatDisc(batch, gx, gz, 30, 30, 0.0174, 0x74844e);
  flatDisc(batch, gx, gz, 27, 28, 0.0178, 0x849356);
  addTrail(
    batch,
    [
      [gx - 27, gz - 17],
      [gx - 8, gz - 5],
      [gx + 10, gz + 7],
      [gx + 27, gz + 17]
    ],
    2.4,
    0xc5b087
  );
  addTrail(
    batch,
    [
      [gx - 19, gz + 19],
      [gx - 4, gz + 8],
      [gx + 9, gz - 5],
      [gx + 21, gz - 19]
    ],
    2.0,
    0xc5b087
  );
  flatDisc(batch, gx - 8, gz + 6, 7, 20, 0.0182, 0xd8c9a4);
  batch.box(0.25, 3.0, 0.25, gx - 12, 1.5, gz + 6, 0x6b5338);
  batch.box(0.25, 3.0, 0.25, gx - 4, 1.5, gz + 6, 0x6b5338);
  batch.box(8, 0.12, 0.12, gx - 8, 2.9, gz + 6, 0x6b5338);
  batch.box(1.2, 0.1, 4.2, gx - 10, 1.4, gz + 9, 0xc2603f);
  batch.box(0.1, 1.4, 0.1, gx - 10.5, 0.7, gz + 11, 0x6b5338);
  addBench(batch, gx + 14, gz + 10, Math.PI / 2);
  addBench(batch, gx - 16, gz - 14, -Math.PI / 2);
  addFlowerBed(batch, gx + 10, gz - 16);
  addFlowerBed(batch, gx - 12, gz + 17);

  for (let i = 0; i < 7; i++) {
    const z = 800 + i * 16;
    batch.quadUp(930, 0.021, z - 5, 944, 0.021, z - 5, 944, 0.021, z + 5, 930, 0.021, z + 5, 0xd8d0bb);
  }
  addBench(batch, 946, 860, Math.PI / 2);

  const sx = 1045;
  const sz = 676;
  batch.box(28, 0.12, 20, sx, 0.06, sz, 0xb7b3a8);
  batch.box(10, 1.4, 4, sx - 7, 0.7, sz - 5, 0x9a958b);
  batch.box(8, 1.0, 5, sx + 5, 0.5, sz + 5, 0x9a958b);
  batch.box(5, 1.8, 3, sx + 9, 0.9, sz - 6, 0x8f8a80);
  batch.box(7, 0.8, 3, sx - 4, 0.4, sz + 6, 0x9a958b);
  for (let i = 0; i < 5; i++) {
    batch.box(12 - i * 1.8, 0.45, 2.0, sx, 0.22 + i * 0.45, sz - 8 + i * 2, 0x9a958b);
  }
  for (const side of [-6, 6]) {
    batch.box(0.14, 1.1, 0.14, sx + side, 0.55, sz + 2, 0x4b4034);
  }
  batch.box(12, 0.12, 0.12, sx, 1.05, sz + 2, 0xd8c9a4);
  const graffiti = [0xc2603f, 0x4f8a8b, 0xd9a441, 0x7f8e56];
  for (const [i, color] of graffiti.entries()) {
    batch.box(5, 2.2, 0.12, sx - 8 + i * 6, 1.1, sz - 9.8, color);
  }

  const ax = 978;
  const az = 672;
  batch.box(8.6, 0.5, 6.4, ax, 0.25, az, 0xcabda6);
  batch.box(8.0, 0.16, 5.8, ax, 0.58, az, 0xb7aa91);
  batch.box(1.6, 1.4, 1.6, ax, 1.25, az, 0xb7aa91);
  batch.box(0.8, 1.4, 0.8, ax, 2.55, az, 0xb7aa91);

  const cx = 1053;
  const cz = 1040;
  addFootballField(batch, cx, cz, 44, 64);
  addGoal(batch, cx, cz - 32);
  addGoal(batch, cx, cz + 32);
  batch.box(12, 3.8, 8, 1120, 1.9, 990, 0xe3d3b8);
  batch.box(12.6, 0.25, 8.6, 1120, 3.95, 990, 0xb5684a);
  batch.box(2.2, 2.2, 0.12, 1120, 1.1, 986, 0x35474d);
  addBench(batch, 1010, 950, 0);
}

function addFlowerBed(batch: TriBatch, x: number, z: number): void {
  batch.box(4.4, 0.25, 1.8, x, 0.12, z, 0x6b5338);
  for (let i = 0; i < 7; i++) {
    batch.box(0.45, 0.18, 0.45, x - 1.8 + i * 0.6, 0.27, z, i % 2 ? 0xd9a441 : 0xc2603f);
  }
}

function addFootballField(batch: TriBatch, x: number, z: number, w: number, d: number): void {
  const y = 0.035;
  batch.polygonTop([x - w / 2, z - d / 2, x + w / 2, z - d / 2, x + w / 2, z + d / 2, x - w / 2, z + d / 2], 0.0175, 0x6f8448);
  batch.box(0.16, 0.02, d, x - w / 2, y, z, 0xf1ead7);
  batch.box(0.16, 0.02, d, x + w / 2, y, z, 0xf1ead7);
  batch.box(w, 0.02, 0.16, x, y, z - d / 2, 0xf1ead7);
  batch.box(w, 0.02, 0.16, x, y, z + d / 2, 0xf1ead7);
  batch.box(w, 0.02, 0.16, x, y, z, 0xf1ead7);
  flatDisc(batch, x, z, 3.2, 20, y + 0.001, 0xbcb4a1);
  flatDisc(batch, x, z, 2.9, 20, y + 0.002, 0x9a8f7a);
}

function addGoal(batch: TriBatch, x: number, z: number): void {
  for (const side of [-3.2, 3.2]) {
    batch.box(0.12, 2.2, 0.12, x + side, 1.1, z, 0xf1ead7);
  }
  batch.box(6.5, 0.12, 0.12, x, 2.2, z, 0xf1ead7);
}

function addAzaleeVegetation(batch: GeoBatch): void {
  const piazza = [
    [872, 392],
    [928, 392],
    [872, 448],
    [928, 448],
    [858, 420],
    [942, 420]
  ] as const;
  for (const [x, z] of piazza) addBroadTree(batch, x, z);
  const park = [
    [870, 766],
    [930, 766],
    [868, 814],
    [932, 814],
    [856, 790],
    [944, 790],
    [884, 748],
    [916, 832]
  ] as const;
  for (const [x, z] of park) addBroadTree(batch, x, z);
  for (const z of [800, 840, 880, 920]) addBroadTree(batch, 928, z);
  for (const [x, z] of [
    [1000, 980],
    [1100, 980],
    [1000, 1094],
    [1100, 1094]
  ] as const) {
    addBroadTree(batch, x, z);
  }
  for (const [x, z, scale] of [
    [880, 410, 0.8],
    [920, 430, 0.9],
    [880, 445, 0.7],
    [920, 405, 0.75],
    [875, 800, 0.8],
    [925, 800, 0.85]
  ] as const) {
    batch.sphere(0.9 * scale, x, 0.5, z, 0x5f7046, 0, 0.8);
    batch.sphere(0.62 * scale, x + 0.7, 0.42, z + 0.3, 0x697b4c, 0, 0.8);
  }
}

function addAermacchi(scene: THREE.Scene): void {
  const group = new THREE.Group();
  group.position.set(978, 3.7, 672);
  group.rotation.y = Math.PI / 4;
  const body = new THREE.MeshLambertMaterial({ color: 0xe7e3d6, flatShading: true });
  const red = new THREE.MeshLambertMaterial({ color: 0xb9553b, flatShading: true });
  const glass = new THREE.MeshLambertMaterial({ color: 0x355a75, flatShading: true });
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 8.4, 8), body);
  fuselage.rotation.z = Math.PI / 2;
  group.add(fuselage);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.55, 2.0, 8), body);
  nose.rotation.z = Math.PI / 2;
  nose.position.x = -5.1;
  group.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 8.2), body);
  wing.position.set(0.2, 0, 0);
  group.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 2.0), red);
  tail.position.set(-3.4, 0.75, 0);
  group.add(tail);
  const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.1), body);
  stabilizer.position.set(-3.6, 0.15, 0);
  group.add(stabilizer);
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), glass);
  canopy.position.set(2.0, 0.5, 0);
  canopy.scale.set(0.9, 0.65, 0.75);
  group.add(canopy);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(group);
}

function addSouthDistrict(batch: TriBatch): void {
  const sx = -362;
  const sz = 1220;
  addFootballField(batch, sx, sz, 64, 100);
  addGoal(batch, sx, sz - 50);
  addGoal(batch, sx, sz + 50);
  for (let i = 0; i < 4; i++) {
    batch.box(62, 0.35, 1.5, sx, 0.2 + i * 0.35, 1139 - i * 1.4, 0x9a5a46);
    batch.box(62, 0.35, 1.5, sx, 0.2 + i * 0.35, 1301 + i * 1.4, 0x9a5a46);
  }
  batch.box(7, 3.0, 0.4, sx, 4.4, 1312, 0x2b3336);
  batch.box(7.6, 0.18, 0.6, sx, 6.05, 1312, 0xd8c9a4);
  for (const [fx, fz] of [
    [-425, 1158],
    [-299, 1158],
    [-425, 1282],
    [-299, 1282]
  ] as const) {
    batch.box(0.22, 10, 0.22, fx, 5, fz, 0x55554f);
    batch.box(2.6, 0.16, 0.16, fx, 9.8, fz, 0xd8c9a4);
    batch.box(2.2, 1.0, 0.16, fx, 10.35, fz, 0xf3ead0);
  }

  addFootballField(batch, -510, 1200, 50, 80);
  addGoal(batch, -510, 1160);
  addGoal(batch, -510, 1240);

  batch.box(0.3, 3.6, 8, -503.8, 1.8, 1306, 0x9bbfc5);
  batch.box(2.0, 0.3, 10, -501.8, 4.0, 1306, 0xd8c7a5);
  batch.box(0.2, 2.2, 2.4, -503.6, 1.1, 1306, 0x2b3a3e);
  batch.box(0.3, 3.2, 6, -465.8, 1.6, 1292, 0x9bbfc5);
  batch.box(2.0, 0.3, 8, -467.8, 3.4, 1292, 0xd8c7a5);
  batch.box(0.2, 2.2, 2.2, -465.6, 1.1, 1292, 0x2b3a3e);

  flatDisc(batch, 261, 1205, 4.0, 24, 0.052, 0xb9a67f);
  flatDisc(batch, 261, 1205, 3.2, 24, 0.058, 0x6f9fae);
  batch.box(0.5, 1.0, 0.5, 261, 0.5, 1205, 0xd3c29e);
  addBench(batch, 247, 1205, Math.PI / 2);
  addBench(batch, 275, 1205, -Math.PI / 2);
  addBench(batch, 261, 1190, 0);
  addBench(batch, 261, 1220, Math.PI);
  addFlowerBed(batch, 245, 1188);
  addFlowerBed(batch, 277, 1222);

  const gx = 46;
  const gz = 1190;
  flatDisc(batch, gx, gz, 28, 30, 0.0174, 0x74844e);
  flatDisc(batch, gx, gz, 25, 28, 0.0178, 0x849356);
  addTrail(
    batch,
    [
      [gx - 26, gz - 10],
      [gx - 8, gz - 2],
      [gx + 10, gz + 5],
      [gx + 26, gz + 10]
    ],
    2.2,
    0xc5b087
  );
  addTrail(
    batch,
    [
      [gx - 12, gz + 20],
      [gx - 2, gz + 8],
      [gx + 8, gz - 4],
      [gx + 18, gz - 18]
    ],
    1.9,
    0xc5b087
  );
  flatDisc(batch, gx - 8, gz + 5, 6, 20, 0.0182, 0xd8c9a4);
  batch.box(0.22, 2.8, 0.22, gx - 11, 1.4, gz + 5, 0x6b5338);
  batch.box(0.22, 2.8, 0.22, gx - 5, 1.4, gz + 5, 0x6b5338);
  batch.box(6, 0.12, 0.12, gx - 8, 2.7, gz + 5, 0x6b5338);
  batch.box(1.0, 0.1, 3.6, gx - 10, 1.2, gz + 8, 0xc2603f);
  addBench(batch, gx + 13, gz + 9, Math.PI / 2);
  addBench(batch, gx - 15, gz - 12, -Math.PI / 2);
  addFlowerBed(batch, gx + 9, gz - 15);
  addFlowerBed(batch, gx - 10, gz + 16);

  for (let i = 0; i < 6; i++) {
    const z = 1178 + i * 8;
    batch.quadUp(-300, 0.021, z - 3.2, -286, 0.021, z - 3.2, -286, 0.021, z + 3.2, -300, 0.021, z + 3.2, 0xd8d0bb);
  }
}

function addSouthVegetation(batch: GeoBatch): void {
  const stadium = [
    [-430, 1132],
    [-294, 1132],
    [-430, 1318],
    [-294, 1318],
    [-448, 1200],
    [-276, 1200]
  ] as const;
  for (const [x, z] of stadium) addBroadTree(batch, x, z);
  for (const [x, z] of [
    [-620, 1148],
    [-622, 1260],
    [-456, 1124],
    [-590, 1272],
    [-410, 1272]
  ] as const) {
    addBroadTree(batch, x, z);
  }
  const piazza = [
    [244, 1186],
    [278, 1186],
    [244, 1224],
    [278, 1224]
  ] as const;
  for (const [x, z] of piazza) addBroadTree(batch, x, z);
  const garden = [
    [22, 1166],
    [72, 1166],
    [22, 1214],
    [72, 1214],
    [46, 1158],
    [46, 1222]
  ] as const;
  for (const [x, z] of garden) addBroadTree(batch, x, z);
  for (const [x, z, scale] of [
    [243, 1218, 0.8],
    [279, 1192, 0.8],
    [30, 1204, 0.7],
    [64, 1180, 0.75]
  ] as const) {
    batch.sphere(0.85 * scale, x, 0.5, z, 0x5f7046, 0, 0.8);
    batch.sphere(0.58 * scale, x + 0.6, 0.42, z + 0.3, 0x697b4c, 0, 0.8);
  }
}

function addNorthDistrict(batch: TriBatch, trees: GeoBatch): void {
  const plots = [
    [-58, -395, 38, 22, 0x8a9a55],
    [24, -396, 40, 24, 0x9b9a63],
    [-4, -390, 28, 12, 0x74844e]
  ] as const;
  for (const [x, z, w, d, color] of plots) {
    batch.box(w, 0.02, d, x, 0.019, z, color);
  }
  addTrail(batch, [[-5, -410], [0, -440], [0, -470]], 2.6, 0xc5b087);
  addTrail(batch, [[-42, -380], [-5, -380], [24, -380], [55, -380]], 2.2, 0xc5b087);

  for (const z of [-340, -360]) {
    batch.box(6, 2.2, 16, -68, 1.1, z, 0xb9c7c2);
    batch.box(7.2, 0.2, 17, -68, 2.25, z, 0xd8c7a5);
    batch.box(0.25, 2.0, 3, -64.9, 1.0, z, 0x35474d);
  }
  batch.box(6, 2.2, 12, 60, 1.1, -330, 0xb9c7c2);
  batch.box(7.2, 0.2, 13, 60, 2.25, -330, 0xd8c7a5);
  batch.box(0.25, 2.0, 3, 63.1, 1.0, -330, 0x35474d);
  for (const x of [-40, -26, -12, 12, 26, 40]) {
    for (const y of [2.4, 5.2]) {
      batch.box(2.2, 1.7, 0.14, x, y, -301.85, 0x283033);
    }
  }
  batch.box(3.2, 3.2, 0.18, -5, 1.6, -301.8, 0x4b3b28);
  batch.box(11, 0.3, 3, -5, 4.2, -299.5, 0xd8c7a5);
  batch.box(0.7, 3.6, 0.7, -11, 1.8, -294, 0xb9553b);
  batch.box(0.7, 3.6, 0.7, 1, 1.8, -294, 0xb9553b);
  batch.box(12, 0.25, 0.7, -5, 3.6, -294, 0xb9553b);
  batch.box(6, 0.8, 0.12, -5, 2.8, -293.6, 0xf1e6d0);
  for (const x of [60, 70]) {
    trees.cylinder(1.2, 1.4, 6, 8, x, 3, -390, 0xcabda6);
    trees.cone(1.4, 1.2, 8, x, 6.6, -390, 0x8a6a45);
  }
  batch.box(2.4, 1.4, 1.6, -30, 0.9, -390, 0x6f7a5f);
  batch.box(1.1, 1.0, 1.0, -29.4, 1.9, -390, 0x3b4b3e);
  batch.box(2.6, 0.18, 0.18, -30, 0.5, -388.9, 0x4b4034);
  batch.box(2.6, 0.18, 0.18, -30, 0.5, -391.1, 0x4b4034);

  for (let i = 0; i < 6; i++) {
    batch.box(18, 1.6, 1.8, -350, 1.0, -420 - i * 2.2, 0x8e8a80);
  }
  batch.box(24, 1.0, 6, -350, 0.5, -455, 0x8a6a45);
  batch.box(16, 4.5, 10, -390, 2.25, -460, 0xd7c7ab);
  batch.box(17, 0.35, 11, -390, 4.65, -460, 0x9e5b45);
  batch.box(2.5, 2.0, 0.2, -390, 1.2, -454.9, 0x35474d);
  batch.box(0.3, 0.02, 50, -370, 0.13, -430, 0x4b4034);
  batch.box(0.3, 0.02, 50, -363, 0.13, -430, 0x4b4034);
  batch.box(0.3, 0.02, 50, -328, 0.13, -430, 0x4b4034);
  for (let i = 0; i < 12; i++) {
    const z = -454 + i * 4;
    batch.box(10, 0.14, 0.5, -366.5, 0.12, z, 0x5b4632);
    batch.box(10, 0.14, 0.5, -324.5, 0.12, z, 0x5b4632);
  }
  const wagons = [
    [-336, -422, 0x8a4f3a],
    [-366, -434, 0x6f4a3a],
    [-336, -446, 0x8a4f3a]
  ] as const;
  for (const [x, z, color] of wagons) {
    batch.box(10, 2.6, 3, x, 1.5, z, color);
    batch.box(10, 0.15, 3.2, x, 2.85, z, 0x5b4632);
    batch.box(7, 0.55, 0.08, x, 1.7, z + 1.52, 0xd8c9a4);
    for (const dx of [-3.2, 3.2]) {
      for (const dz of [-1, 1]) {
        trees.cylinder(0.45, 0.45, 0.5, 8, x + dx, 0.5, z + dz, 0x3b3b36, Math.PI / 2, 0, 0);
      }
    }
  }
  batch.box(12, 3.2, 3.2, -366, 1.9, -458, 0x6b4a3c);
  batch.box(4, 3.8, 3.2, -370, 2.1, -458, 0x7c5a3b);
  batch.box(0.4, 1.6, 0.4, -364, 4.0, -458, 0x3b3b36);
  batch.box(12, 0.3, 3.4, -366, 3.65, -458, 0x5b4632);
  batch.box(11, 0.35, 0.12, -366, 1.4, -456.45, 0xd9a441);
  batch.box(0.35, 8, 0.35, -315, 4, -462, 0x55554f);
  batch.box(12, 0.35, 0.35, -321, 7.8, -462, 0x55554f);
  batch.box(0.18, 2.2, 0.18, -327, 6.7, -462, 0x3b3b36);
  batch.box(3, 4, 3, -300, 2, -455, 0xd7c7ab);
  batch.box(3.6, 0.3, 3.6, -300, 4.15, -455, 0x9e5b45);
  batch.box(1.1, 0.8, 0.1, -300, 3.1, -453.45, 0x35474d);
  batch.box(1.2, 1.0, 0.5, -370, 0.6, -408, 0x9e5b45);

  flatDisc(batch, 0, -470, 38, 30, 0.0174, 0x74844e);
  flatDisc(batch, 0, -470, 34, 28, 0.0178, 0x849356);
  addTrail(batch, [[-35, -470], [-10, -465], [20, -472], [35, -470]], 2.3, 0xc5b087);
  addTrail(batch, [[0, -442], [0, -470], [0, -505]], 2.2, 0xc5b087);
  for (const [x, z] of [
    [-24, -455],
    [10, -455],
    [-24, -485],
    [10, -485]
  ] as const) {
    batch.box(14, 0.02, 9, x, 0.019, z, 0x8e9a5b);
    batch.box(13.2, 0.02, 8.2, x, 0.021, z, 0x9b9a63);
  }
  batch.box(48, 0.02, 1.4, 0, 0.022, -500, 0x6f9fae);
  for (const [x, z] of [
    [-18, -478],
    [18, -478]
  ] as const) {
    batch.box(3.2, 0.12, 2.2, x, 0.55, z, 0x79563a);
    for (const dx of [-1.2, 1.2]) {
      batch.box(0.12, 0.55, 0.12, x + dx, 0.28, z + 0.7, 0x5b4632);
      batch.box(0.12, 0.55, 0.12, x + dx, 0.28, z - 0.7, 0x5b4632);
    }
  }
  for (const x of [28, 38, 48]) {
    batch.box(6, 2.2, 3, x, 1.1, -452, 0xc7a56b);
    batch.box(6.8, 0.2, 3.8, x, 2.35, -452, 0x9e5b45);
  }
  addBench(batch, -30, -435, Math.PI / 2);
  addBench(batch, 30, -500, -Math.PI / 2);
}

function addNorthVegetation(batch: GeoBatch): void {
  const campus = [
    [-75, -310],
    [-75, -382],
    [75, -300],
    [75, -380],
    [30, -408],
    [-35, -408]
  ] as const;
  for (const [x, z] of campus) addBroadTree(batch, x, z);
  for (let i = 0; i < 5; i++) {
    addPoplar(batch, -45 + i * 22, -410);
  }
  const park = [
    [-28, -445],
    [28, -445],
    [-28, -496],
    [28, -496],
    [-55, -470],
    [55, -470],
    [0, -512]
  ] as const;
  for (const [x, z] of park) addBroadTree(batch, x, z);
  for (const [x, z] of [
    [-410, -430],
    [-300, -415],
    [-300, -475],
    [-390, -490]
  ] as const) {
    addBroadTree(batch, x, z);
  }
  for (const [x, z, scale] of [
    [-12, -458, 0.8],
    [14, -490, 0.75],
    [-40, -488, 0.7],
    [42, -452, 0.8]
  ] as const) {
    batch.sphere(0.85 * scale, x, 0.5, z, 0x5f7046, 0, 0.8);
    batch.sphere(0.58 * scale, x + 0.6, 0.42, z + 0.3, 0x697b4c, 0, 0.8);
  }
}

function addInteriorPortals(batch: TriBatch): void {
  for (const interior of INTERIORS) {
    flatDisc(batch, interior.exterior.x, interior.exterior.z, 1.7, 20, 0.054, 0x7a6a45);
    flatDisc(batch, interior.exterior.x, interior.exterior.z, 1.3, 20, 0.058, 0xd9a441);
  }
}

function addFoundPlaces(batch: TriBatch): void {
  batch.box(58, 0.004, 58, -880, 0.017, 940, 0x74844e);
  batch.box(50, 0.004, 50, -880, 0.0175, 940, 0x849356);
  batch.box(58, 0.004, 58, -451, 0.017, 940, 0x74844e);
  batch.box(50, 0.004, 50, -451, 0.0175, 940, 0x849356);
  batch.box(54, 0.004, 54, 30, 0.017, 900, 0x74844e);
  batch.box(46, 0.004, 46, 30, 0.0175, 900, 0x849356);
  addTrail(batch, [[-648, 858], [-648, 878]], 3.2, 0xc5b087);
  addBench(batch, -660, 870, Math.PI / 2);
  addBench(batch, -636, 870, -Math.PI / 2);
  addFlowerBed(batch, -664, 884);
  addFlowerBed(batch, -632, 884);

  addTrail(batch, [[-934, 940], [-806, 940]], 2.6, 0xc5b087);
  addTrail(batch, [[-870, 878], [-870, 1000]], 2.4, 0xc5b087);
  addBench(batch, -892, 918, Math.PI / 2);
  addBench(batch, -848, 918, -Math.PI / 2);
  addBench(batch, -892, 962, Math.PI / 2);
  addBench(batch, -848, 962, -Math.PI / 2);
  flatDisc(batch, -870, 970, 6, 20, 0.018, 0xd8c9a4);
  batch.box(0.22, 2.8, 0.22, -874, 1.4, 970, 0x6b5338);
  batch.box(0.22, 2.8, 0.22, -866, 1.4, 970, 0x6b5338);
  batch.box(8, 0.12, 0.12, -870, 2.7, 970, 0x6b5338);
  flatDisc(batch, -870, 970, 7, 20, 0.0174, 0x849356);

  addTrail(batch, [[0, 900], [60, 900]], 2.4, 0xc5b087);
  addTrail(batch, [[30, 855], [30, 950]], 2.2, 0xc5b087);
  addBench(batch, 10, 882, Math.PI / 2);
  addBench(batch, 50, 918, -Math.PI / 2);
  addFlowerBed(batch, 30, 860);
  flatDisc(batch, 30, 925, 6, 20, 0.018, 0xd8c9a4);
  batch.box(0.22, 2.8, 0.22, 25, 1.4, 925, 0x6b5338);
  batch.box(0.22, 2.8, 0.22, 35, 1.4, 925, 0x6b5338);
  batch.box(10, 0.12, 0.12, 30, 2.7, 925, 0x6b5338);

  addTrail(batch, [[-500, 947], [-402, 947]], 2.4, 0xc5b087);
  addTrail(batch, [[-451, 895], [-451, 1000]], 2.2, 0xc5b087);
  addBench(batch, -470, 920, Math.PI / 2);
  addBench(batch, -432, 920, -Math.PI / 2);
  flatDisc(batch, -451, 970, 7, 20, 0.018, 0xd8c9a4);
  const colors = [0xc2603f, 0xd9a441, 0x7f8e56, 0x4f8a8b];
  for (const [i, color] of colors.entries()) {
    batch.box(4.5, 2.0, 0.15, -462 + i * 7, 1.0, 977, color);
  }
  addFlowerBed(batch, -451, 1005);
  addBench(batch, 108, 28, 0);
  addFlowerBed(batch, 108, 58);
  addBench(batch, 359, 134, 0);
  addFlowerBed(batch, 359, 164);
  batch.box(3.2, 13, 3.2, -648, 6.5, 892, 0xd7c7ab);
  batch.box(3.6, 0.3, 3.6, -648, 13.1, 892, 0xb7aa91);
  batch.tri(-649.8, 13.25, 890.2, -646.2, 13.25, 890.2, -648, 14.8, 892, 0x7b7a70);
  batch.tri(-646.2, 13.25, 890.2, -646.2, 13.25, 893.8, -648, 14.8, 892, 0x7b7a70);
  batch.tri(-646.2, 13.25, 893.8, -649.8, 13.25, 893.8, -648, 14.8, 892, 0x7b7a70);
  batch.tri(-649.8, 13.25, 893.8, -649.8, 13.25, 890.2, -648, 14.8, 892, 0x7b7a70);
  batch.box(0.16, 2.4, 0.16, -648, 16, 892, 0x4a4035);
  batch.box(1.2, 0.16, 0.16, -648, 16.7, 892, 0x4a4035);
  batch.box(0.16, 2.4, 0.16, 359, 18.8, 148, 0x4a4035);
  batch.box(1.2, 0.16, 0.16, 359, 19.5, 148, 0x4a4035);
}

function addFoundVegetation(batch: GeoBatch): void {
  for (const [x, z] of [
    [-668, 860],
    [-628, 860],
    [-660, 842],
    [-930, 892],
    [-810, 892],
    [-930, 988],
    [-810, 988],
    [-870, 890],
    [-870, 992],
    [0, 880],
    [60, 880],
    [0, 920],
    [60, 920],
    [-500, 920],
    [-402, 920],
    [-500, 975],
    [-402, 975],
    [95, 22],
    [122, 52],
    [340, 132],
    [380, 160]
  ] as const) {
    addBroadTree(batch, x, z);
  }
  for (const [x, z, scale] of [
    [-660, 878, 0.8],
    [-636, 878, 0.75],
    [-890, 930, 0.8],
    [-850, 950, 0.75],
    [12, 908, 0.7],
    [48, 892, 0.75],
    [-470, 958, 0.8],
    [-432, 958, 0.7]
  ] as const) {
    batch.sphere(0.85 * scale, x, 0.5, z, 0x5f7046, 0, 0.8);
    batch.sphere(0.58 * scale, x + 0.6, 0.42, z + 0.3, 0x697b4c, 0, 0.8);
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
