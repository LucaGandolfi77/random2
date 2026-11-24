import * as THREE from 'three';
import { FIDENZA, type FidenzaBuilding } from '../data/fidenza';
import { CollisionWorld, signedArea } from '../data/colliders';
import { BELL_TOWER, OBELISK, SPAWN, STREET_LABELS } from '../data/town';
import { TriBatch } from './batch';

const WALLS = [0xf1e6d0, 0xf8f2e2, 0xe9cdb4, 0xdbc08d, 0xefe0c5, 0xe3c8ac];
const TRIM = 0xf8f1e2;
const WINDOW = 0x283033;
const DOOR = 0x4b3b28;
const ROOFS = [0xb15f42, 0xa9573e, 0x9e5b45, 0xb96845];
const STONE = 0xcabda6;
const STONE_DARK = 0xb7aa91;
const looseSigns: THREE.Mesh[] = [];

export interface CityRender {
  ground: THREE.Mesh;
  buildings: THREE.Mesh[];
  signs: THREE.Mesh[];
  trees: Array<{ x: number; z: number; h: number; kind: 'plane' }>;
  furniture: Array<{ type: string; x: number; z: number }>;
  lamps: Array<{ x: number; z: number }>;
}

export function buildCity(scene: THREE.Scene, collision: CollisionWorld): CityRender {
  const groundBatch = new TriBatch();
  const buildingChunks = new Map<string, TriBatch>();
  const detailBatch = new TriBatch();
  const signs: THREE.Mesh[] = [];
  looseSigns.length = 0;

  const chunkFor = (x: number, z: number): TriBatch => {
    const key = `${Math.floor((x + 520) / 240)},${Math.floor((z + 440) / 240)}`;
    let batch = buildingChunks.get(key);
    if (!batch) {
      batch = new TriBatch();
      buildingChunks.set(key, batch);
    }
    return batch;
  };

  addAreas(groundBatch);
  addWaterways(groundBatch);
  addRailways(groundBatch);
  addRoads(groundBatch);
  addPiazzas(groundBatch);

  for (const building of FIDENZA.buildings) {
    const batch = chunkFor(building.x, building.z);
    if (building.landmark === 'duomo') addDuomo(batch, building);
    else if (building.landmark === 'porta') addPorta(batch, building);
    else {
      addGenericBuilding(batch, building, collision);
      if (building.landmark === 'teatro') addTeatroFacade(batch, building);
      if (building.landmark === 'comunale') addComunaleFacade(batch, building);
      if (building.landmark === 'stazione') addStazioneCanopy(batch, building);
      if (building.landmark === 'granmadre') addGranMadre(batch, building);
      if (building.landmark === 'sanpaolo' || building.landmark === 'santantonio') {
        addChurchTower(batch, building, building.landmark === 'sanpaolo' ? 0xd7c7ab : 0xd0bea2);
      }
      if (building.landmark === 'centro-commerciale') addCentroCommerciale(batch, building);
    }
  }

  addObelisk(detailBatch);
  addCampanile(detailBatch);
  addMuseo(detailBatch);
  addGranMadreDome(scene);
  addStreetSigns(scene, detailBatch);

  const ground = groundBatch.build(
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide })
  );
  if (!ground) throw new Error('Unable to build the Fidenza ground');
  ground.receiveShadow = true;
  ground.castShadow = false;
  scene.add(ground);

  const buildingMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const buildings: THREE.Mesh[] = [];
  for (const batch of buildingChunks.values()) {
    const mesh = batch.build(buildingMaterial);
    if (!mesh) continue;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    buildings.push(mesh);
  }
  const detail = detailBatch.build(buildingMaterial);
  if (detail) {
    detail.receiveShadow = true;
    detail.castShadow = true;
    scene.add(detail);
    buildings.push(detail);
  }
  if (buildings.length === 0) throw new Error('Unable to build the Fidenza meshes');

  for (const sign of looseSigns) scene.add(sign);
  addLandmarkSigns(scene, signs);

  const lamps = generateLamps(collision);
  return {
    ground,
    buildings,
    signs,
    trees: FIDENZA.trees.map((tree) => ({ x: tree.x, z: tree.z, h: tree.h, kind: 'plane' as const })),
    furniture: FIDENZA.furniture.map((item) => ({ type: item.type, x: item.x, z: item.z })),
    lamps
  };
}

/* ------------------------------------------------------------------ roads */

const AREA_LIFT: Record<string, number> = {
  urban: 0,
  industrial: 0.0002,
  farmland: 0.0005,
  parking: 0.0008,
  school: 0.0009,
  hospital: 0.0009,
  platform: 0.001,
  sport: 0.0011,
  square: 0.0012,
  water: 0.0013,
  park: 0.0015,
  grass: 0.0015,
  forest: 0.0015,
  cemetery: 0.0015
};

function addAreas(batch: TriBatch): void {
  FIDENZA.areas.forEach((area, index) => {
    const lift = AREA_LIFT[area.kind] ?? 0.0008;
    batch.polygonTop(area.poly, 0.0146 + lift + (index % 5) * 0.0001, area.color);
  });
}

function addWaterways(batch: TriBatch): void {
  for (const water of FIDENZA.waterways) {
    if (water.name === 'Torrente Stirone') {
      batch.polygonTop(stironeBand(water.pts, 66, 58), 0.0138, 0x74834c);
      batch.polygonTop(stironeBand(water.pts, 42, 36), 0.0142, 0x849356);
      for (const [x, z, r] of STIRONE_GLADES) {
        batch.polygonTop(irregularPatch(x, z, r), 0.0144, 0x8d9a5b);
      }
    }
    ribbon(batch, water.pts, water.w + 5.5, 0.0175, 0xb3a078);
    ribbon(batch, water.pts, water.w, 0.0185, 0x4f8795);
    ribbon(batch, water.pts, Math.max(1.2, water.w * 0.3), 0.0192, 0x7babb0);
  }
}

const STIRONE_GLADES: ReadonlyArray<readonly [number, number, number]> = [
  [-1306, 18, 16],
  [-1262, -132, 22],
  [-1198, -86, 14],
  [-1328, 142, 18],
  [-1168, 38, 12]
];

function irregularPatch(x: number, z: number, radius: number): number[] {
  const points: number[] = [];
  const steps = 9;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wobble = 1 + Math.sin(i * 2.7 + x * 0.02) * 0.22 + Math.cos(i * 1.9 + z * 0.03) * 0.14;
    points.push(x + Math.cos(angle) * radius * wobble, z + Math.sin(angle) * radius * wobble);
  }
  return points;
}

function stironeBand(flat: number[], westBase: number, eastBase: number): number[] {
  const count = flat.length / 2;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < count; i++) {
    const px = flat[i * 2];
    const pz = flat[i * 2 + 1];
    const a = Math.max(0, i - 1);
    const b = Math.min(count - 1, i + 1);
    const dx = flat[b * 2] - flat[a * 2];
    const dz = flat[b * 2 + 1] - flat[a * 2 + 1];
    const length = Math.hypot(dx, dz) || 1;
    const nx = dz / length;
    const nz = -dx / length;
    const t = count > 1 ? i / (count - 1) : 0;
    const west = westBase + 15 * Math.sin(t * 8.4 + 0.8) + 7 * Math.sin(t * 19.3 + 2.1);
    const east = eastBase + 13 * Math.sin(t * 7.1 + 2.5) + 6 * Math.sin(t * 17.6 + 0.4);
    left.push(px + nx * west, pz + nz * west);
    right.push(px - nx * east, pz - nz * east);
  }
  const poly = [...left];
  for (let i = right.length - 2; i >= 0; i -= 2) poly.push(right[i], right[i + 1]);
  return poly;
}

function addRailways(batch: TriBatch): void {
  for (const railway of FIDENZA.railways) {
    ribbon(batch, railway.pts, 0.55, 0.018, 0x8d8371);
    ribbon(batch, railway.pts, 0.1, 0.029, 0x494844);
    ribbon(batch, railway.pts, 0.1, 0.03, 0x6a6860);
  }
}

const ROAD_COLORS: Record<string, number> = {
  primary: 0x69665e,
  secondary: 0x716d63,
  tertiary: 0x777265,
  residential: 0x817b6d,
  living_street: 0x857e6f,
  unclassified: 0x7a7568,
  service: 0x807a6c,
  pedestrian: 0xb9a887,
  footway: 0xb7a98c,
  cycleway: 0x8d846f
};


function addRoads(batch: TriBatch): void {
  FIDENZA.roads.forEach((road, index) => {
    const color = ROAD_COLORS[road.kind] ?? 0x7a7568;
    const y = 0.02 + (index % 9) * 0.0008;
    if (!['footway', 'cycleway', 'pedestrian', 'service'].includes(road.kind)) {
      ribbon(batch, road.pts, road.w + 2.1, y - 0.012, 0xbeae91);
    }
    ribbon(batch, road.pts, road.w, y, color);
  });
}

function ribbon(batch: TriBatch, flat: number[], width: number, y: number, color: number): void {
  const count = flat.length / 2;
  if (count < 2) return;
  const half = width / 2;
  for (let i = 0; i < count - 1; i++) {
    const ax = flat[i * 2];
    const az = flat[i * 2 + 1];
    const bx = flat[i * 2 + 2];
    const bz = flat[i * 2 + 3];
    const dx = bx - ax;
    const dz = bz - az;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) continue;
    const nx = (dz / length) * half;
    const nz = (-dx / length) * half;
    batch.quadUp(
      ax + nx,
      y,
      az + nz,
      bx + nx,
      y,
      bz + nz,
      bx - nx,
      y,
      bz - nz,
      ax - nx,
      y,
      az - nz,
      color
    );
  }
}

function addPiazzas(batch: TriBatch): void {
  const squares = [
    { x: -296.7, z: -4.1, r: 27 },
    { x: 14.6, z: -21, r: 31 },
    { x: -18.6, z: 105.2, r: 20 },
    { x: 44.2, z: 109.2, r: 18 },
    { x: 195, z: -103.5, r: 24 },
    { x: -800, z: 260, r: 20 },
    { x: -700, z: 405, r: 17 },
    { x: -680, z: -215, r: 16 },
    { x: 560, z: 160, r: 18 },
    { x: 600, z: 880, r: 18 },
    { x: 900, z: 420, r: 15 },
    { x: 261, z: 1205, r: 12 }
  ];
  for (const square of squares) {
    batch.disc(square.x, 0.03, square.z, square.r + 1.6, 36, 0xb9a67f);
    batch.disc(square.x, 0.035, square.z, square.r, 36, 0xd3c29e);
    batch.disc(square.x, 0.038, square.z, square.r * 0.72, 30, 0xd9c9a6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const b = a + 0.012;
      const inner = square.r * 0.2;
      const outer = square.r * 0.95;
      batch.quadUp(
        square.x + Math.cos(a) * inner,
        0.042,
        square.z + Math.sin(a) * inner,
        square.x + Math.cos(b) * inner,
        0.042,
        square.z + Math.sin(b) * inner,
        square.x + Math.cos(b) * outer,
        0.042,
        square.z + Math.sin(b) * outer,
        square.x + Math.cos(a) * outer,
        0.042,
        square.z + Math.sin(a) * outer,
        0xb8a47c
      );
    }
  }
}

/* --------------------------------------------------------------- buildings */

interface EdgeCandidate {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  length: number;
  ox: number;
  oz: number;
  ry: number;
}

function addGenericBuilding(batch: TriBatch, building: FidenzaBuilding, collision: CollisionWorld): void {
  const pts = building.poly;
  const count = pts.length / 2;
  const ccw = signedArea(pts) > 0;
  const wall = wallColor(building);
  const roof = roofColor(building);
  const candidates: EdgeCandidate[] = [];

  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const ax = pts[i * 2];
    const az = pts[i * 2 + 1];
    const bx = pts[j * 2];
    const bz = pts[j * 2 + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const length = Math.hypot(dx, dz);
    if (length < 0.4) continue;
    let ox = dz / length;
    let oz = -dx / length;
    if (!ccw) {
      ox = -ox;
      oz = -oz;
    }

    batch.wallQuad(ax, az, bx, bz, 0, 0.75, ox, oz, shade(wall, -0.12));
    batch.wallQuad(ax, az, bx, bz, 0.75, Math.max(0.8, building.h - 0.32), ox, oz, wall);
    batch.wallQuad(ax, az, bx, bz, Math.max(0.8, building.h - 0.32), building.h, ox, oz, TRIM);

    if (length >= 3.2) {
      const mx = (ax + bx) / 2 + ox * 1.4;
      const mz = (az + bz) / 2 + oz * 1.4;
      if (collision.isFree(mx, mz, 0.04)) {
        candidates.push({ ax, az, bx, bz, length, ox, oz, ry: Math.atan2(-dz, dx) });
      }
    }
  }

  addRoof(batch, building, pts, roof);
  addWindowsAndDoor(batch, building, candidates);
  addLandmarkDetails(batch, building);
}

function addRoof(batch: TriBatch, building: FidenzaBuilding, pts: number[], roof: number): void {
  const count = pts.length / 2;
  const bbox = boundsOf(pts);
  const minDim = Math.min(bbox.maxX - bbox.minX, bbox.maxZ - bbox.minZ);
  const flat = building.h > 13 || count > 12 || building.area > 750 || building.kind === 'industrial';
  if (flat) {
    batch.polygonTop(pts, building.h + 0.16, roof);
    return;
  }

  const centre = centroid(pts);
  const factor = Math.max(0.34, 1 - 1.9 / Math.max(3, minDim));
  const rise = Math.min(2.2, Math.max(0.9, minDim * 0.14));
  const inner: number[] = [];
  for (let i = 0; i < count; i++) {
    inner.push(centre.x + (pts[i * 2] - centre.x) * factor);
    inner.push(centre.z + (pts[i * 2 + 1] - centre.z) * factor);
  }

  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    batch.quadUp(
      pts[i * 2],
      building.h,
      pts[i * 2 + 1],
      pts[j * 2],
      building.h,
      pts[j * 2 + 1],
      inner[j * 2],
      building.h + rise,
      inner[j * 2 + 1],
      inner[i * 2],
      building.h + rise,
      inner[i * 2 + 1],
      roof
    );
  }
  batch.polygonTop(inner, building.h + rise + 0.02, shade(roof, -0.04));
}

function addWindowsAndDoor(
  batch: TriBatch,
  building: FidenzaBuilding,
  candidates: EdgeCandidate[]
): void {
  candidates.sort((a, b) => b.length - a.length);
  const doorEdge = candidates[0];
  if (doorEdge) {
    const t = 0.5;
    const x = doorEdge.ax + (doorEdge.bx - doorEdge.ax) * t + doorEdge.ox * 0.09;
    const z = doorEdge.az + (doorEdge.bz - doorEdge.az) * t + doorEdge.oz * 0.09;
    batch.box(1.1, 2.2, 0.13, x, 1.1, z, DOOR, doorEdge.ry);
    batch.box(1.36, 2.38, 0.06, x - doorEdge.ox * 0.03, 1.19, z - doorEdge.oz * 0.03, TRIM, doorEdge.ry);
    batch.box(1.5, 0.1, 0.55, x + doorEdge.ox * 0.22, 0.05, z + doorEdge.oz * 0.22, STONE, doorEdge.ry);
  }

  const floors = Math.min(4, Math.max(1, Math.floor((building.h - 1.8) / 3)));
  const central =
    Math.hypot(building.x + 280, building.z - 5) < 170 ||
    Math.hypot(building.x - 15, building.z + 21) < 140;

  for (const edge of candidates.slice(0, 2)) {
    const count = Math.min(3, Math.max(1, Math.floor(edge.length / 3.4)));
    for (let floor = 0; floor < floors; floor++) {
      const y = 1.9 + floor * 3.05;
      if (y + 0.6 > building.h - 0.4) continue;
      for (let k = 0; k < count; k++) {
        const t = (k + 1) / (count + 1);
        const x = edge.ax + (edge.bx - edge.ax) * t + edge.ox * 0.075;
        const z = edge.az + (edge.bz - edge.az) * t + edge.oz * 0.075;
        batch.box(0.62, 0.98, 0.1, x, y, z, WINDOW, edge.ry);
        if (central) {
          batch.box(0.86, 0.07, 0.2, x + edge.ox * 0.02, y - 0.56, z + edge.oz * 0.02, TRIM, edge.ry);
        }
      }
    }
  }
}

function addLandmarkDetails(
  batch: TriBatch,
  building: FidenzaBuilding
): void {
  const landmark = building.landmark;
  if (!landmark) return;

  if (landmark === 'comunale') {
    const towerX = building.x;
    const towerZ = building.z;
    batch.box(3.4, 9, 3.4, towerX, building.h + 4.5, towerZ, TRIM);
    batch.box(3.8, 0.4, 3.8, towerX, building.h + 9, towerZ, STONE);
    batch.box(2.1, 2.1, 0.12, towerX, building.h + 5.4, towerZ + 1.75, 0xece0c2);
    batch.box(0.08, 1.1, 0.14, towerX, building.h + 5.7, towerZ + 1.83, 0x2b241c);
    batch.box(0.55, 0.08, 0.14, towerX + 0.2, building.h + 5.4, towerZ + 1.83, 0x2b241c);
    batch.box(0.1, 3.1, 0.1, towerX, building.h + 10.7, towerZ, 0x4a4035);
    batch.tri(
      towerX,
      building.h + 11,
      towerZ,
      towerX + 1.5,
      building.h + 10.7,
      towerZ,
      towerX,
      building.h + 10.2,
      towerZ,
      0xc2603f
    );
  }

  if (['sanpietro', 'oratorio', 'santamaria'].includes(landmark)) {
    const top = building.h + 2.4;
    batch.box(0.12, 1.5, 0.12, building.x, top, building.z, 0x4a4035);
    batch.box(0.1, 0.1, 0.9, building.x, top + 0.3, building.z, 0x4a4035);
  }
}

/* --------------------------------------------------------------- landmarks */

function addDuomo(batch: TriBatch, building: FidenzaBuilding): void {
  const box = boundsOf(building.poly);
  const x = building.x;
  const z = building.z;
  const width = Math.min(48, box.maxX - box.minX - 3);
  const depth = Math.min(25, box.maxZ - box.minZ - 3);
  const wall = 0xefe3cf;
  const trim = 0xf8f1e2;
  const roof = 0xb15f42;

  batch.box(width, 15, depth, x, 7.5, z, wall);
  batch.box(width - 7, 4.2, depth + 3.5, x, 13.4, z, wall);
  batch.box(width + 2.5, 0.45, depth + 2.5, x, 15.1, z, trim);

  /* Gable roof along the long axis. */
  const ridgeY = 19.2;
  const eave = depth / 2 + 1.1;
  batch.quadUp(
    x - width / 2 - 1,
    15.25,
    z + eave,
    x + width / 2 + 1,
    15.25,
    z + eave,
    x + width / 2 + 1,
    ridgeY,
    z,
    x - width / 2 - 1,
    ridgeY,
    z,
    roof
  );
  batch.quadUp(
    x - width / 2 - 1,
    15.25,
    z - eave,
    x + width / 2 + 1,
    15.25,
    z - eave,
    x + width / 2 + 1,
    ridgeY,
    z,
    x - width / 2 - 1,
    ridgeY,
    z,
    roof
  );

  /* West façade, facing Piazza Duomo. */
  const facadeX = box.minX + 1.4;
  const facadeZ = z;
  const facadeW = depth + 2;
  batch.box(1.2, 18, facadeW, facadeX, 9, facadeZ, trim);
  for (const offset of [-facadeW * 0.34, -facadeW * 0.12, facadeW * 0.12, facadeW * 0.34]) {
    batch.box(0.7, 13.4, 0.7, facadeX - 0.75, 7.2, facadeZ + offset, 0xe1d3bb);
    batch.box(1.1, 0.45, 1.1, facadeX - 0.82, 13.5, facadeZ + offset, trim);
  }
  batch.box(3.0, 0.5, 0.8, facadeX - 0.8, 5.5, facadeZ, trim);
  for (const side of [-1, 1]) {
    batch.box(0.55, 5.4, 0.8, facadeX - 0.85, 2.7, facadeZ + side * 1.9, trim);
    batch.box(1.9, 0.35, 0.9, facadeX - 0.85, 5.6, facadeZ + side * 1.05, STONE_DARK);
  }
  /* Portal: recessed dark door with the cream surround above. */
  batch.box(0.12, 4.4, 2.8, facadeX - 0.73, 2.2, facadeZ, 0x4a3a28);
  batch.box(0.2, 4.6, 0.35, facadeX - 0.82, 2.3, facadeZ - 1.5, trim);
  batch.box(0.2, 4.6, 0.35, facadeX - 0.82, 2.3, facadeZ + 1.5, trim);
  batch.box(0.2, 0.2, 3.4, facadeX - 0.82, 4.6, facadeZ, trim);
  batch.box(1.4, 0.35, 4.2, facadeX - 0.8, 0.2, facadeZ, STONE);
  batch.box(1.8, 0.18, 5.0, facadeX - 0.9, 0.08, facadeZ, STONE_DARK);

  /* Rose window: lowered so it is visible from Piazza Duomo at eye level. */
  circleFacingX(batch, facadeX - 0.72, 6.8, facadeZ, 1.8, 18, trim);
  circleFacingX(batch, facadeX - 0.76, 6.8, facadeZ, 1.35, 18, 0x243033);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    batch.box(
      0.12,
      0.12,
      0.35,
      facadeX - 0.8,
      6.8 + Math.sin(a) * 0.72,
      facadeZ + Math.cos(a) * 0.72,
      trim,
      0
    );
  }

  /* Facade side windows and a small pediment over the portal. */
  for (const side of [-1, 1]) {
    for (const zOffset of [7.2, 9.8]) {
      for (const y of [2.2, 5.2]) {
        batch.box(0.12, 1.15, 0.72, facadeX - 0.67, y, facadeZ + side * zOffset, 0x2b3234);
        batch.box(0.06, 1.35, 0.95, facadeX - 0.66, y, facadeZ + side * zOffset, trim);
      }
    }
  }
  /* A small stone balcony above the portal. */
  batch.box(0.5, 0.24, 3.4, facadeX - 0.2, 5.2, facadeZ, STONE_DARK);

  batch.box(0.12, 2.5, 0.18, facadeX - 0.82, 6.8, facadeZ, trim);
  batch.box(0.12, 0.18, 2.5, facadeX - 0.82, 6.8, facadeZ, trim);
  batch.box(0.5, 0.5, 0.5, facadeX - 0.8, 9.2, facadeZ, trim);
  batch.box(0.35, 0.22, facadeW, facadeX - 0.82, 4.7, facadeZ, trim);
  batch.box(0.35, 0.22, facadeW, facadeX - 0.82, 8.0, facadeZ, trim);
  for (const side of [-1, 1]) {
    batch.box(0.2, 3.1, 1.35, facadeX - 0.78, 1.55, facadeZ + side * 5.4, 0x3f3428);
    batch.box(0.45, 0.3, 1.65, facadeX - 0.8, 3.2, facadeZ + side * 5.4, trim);
  }

  /* Gable triangle above the façade and a cross. */
  batch.tri(
    facadeX - 0.65,
    18,
    facadeZ - facadeW / 2,
    facadeX - 0.65,
    18,
    facadeZ + facadeW / 2,
    facadeX - 0.65,
    21,
    facadeZ,
    trim
  );
  batch.box(0.18, 2.1, 0.18, x, ridgeY + 1, z, 0x4a4035);
  batch.box(0.12, 0.12, 1.0, x, ridgeY + 1.3, z, 0x4a4035);

  /* Side chapels. */
  batch.box(width * 0.72, 10, 3, x, 5, z + depth / 2 + 1.5, wall);
  batch.box(width * 0.72, 10, 3, x, 5, z - depth / 2 - 1.5, wall);
  batch.box(width * 0.76, 0.3, 3.4, x, 10.1, z + depth / 2 + 1.5, roof);
  batch.box(width * 0.76, 0.3, 3.4, x, 10.1, z - depth / 2 - 1.5, roof);
}

function addPorta(batch: TriBatch, building: FidenzaBuilding): void {
  const box = boundsOf(building.poly);
  const x = building.x;
  const z = building.z;
  const span = Math.max(4, box.maxZ - box.minZ);
  const width = Math.max(3, box.maxX - box.minX);
  const tower = 3.2;
  batch.box(tower, 8.2, tower, x, 4.1, z - span / 2, STONE);
  batch.box(tower, 8.2, tower, x, 4.1, z + span / 2, STONE);
  batch.box(width + 1.2, 2.1, span + 1.2, x, 7.1, z, STONE);
  batch.box(width + 1.6, 0.35, span + 1.6, x, 8.25, z, STONE_DARK);
  for (let i = 0; i < 4; i++) {
    batch.box(0.6, 0.8, 0.8, x - width / 2 + 0.6 + i * (width - 1.2) / 3, 8.75, z - span / 2, STONE);
    batch.box(0.6, 0.8, 0.8, x - width / 2 + 0.6 + i * (width - 1.2) / 3, 8.75, z + span / 2, STONE);
  }
  batch.box(3, 4.4, 0.5, x, 2.2, z + span / 2 + 0.3, 0x40362a);
}


function addTeatroFacade(batch: TriBatch, building: FidenzaBuilding): void {
  const box = boundsOf(building.poly);
  const z = building.z;
  const x = box.maxX + 0.15;
  const width = Math.min(36, box.maxZ - box.minZ - 2);
  const height = 8.2;
  batch.box(0.8, height, width, x + 0.2, height / 2, z, TRIM);
  batch.box(2.4, 0.45, width + 1, x + 1.2, 0.28, z, STONE);
  for (let i = 0; i < 6; i++) {
    const zz = z - width / 2 + 2 + (i / 5) * (width - 4);
    batch.box(0.5, 6.8, 0.5, x + 1.35, 3.4, zz, TRIM);
    batch.box(0.75, 0.28, 0.75, x + 1.35, 6.9, zz, STONE_DARK);
    batch.box(0.75, 0.28, 0.75, x + 1.35, 0.4, zz, STONE_DARK);
  }
  batch.box(2.8, 0.6, width, x + 1.4, 7.2, z, TRIM);
  batch.box(3.2, 0.3, width + 0.8, x + 1.5, 7.6, z, STONE);
  batch.tri(x + 1.5, 7.75, z - width / 2, x + 1.5, 7.75, z + width / 2, x + 1.5, 10.4, z, TRIM);
  for (const dz of [-width * 0.28, 0, width * 0.28]) {
    batch.box(0.18, 3.2, 1.5, x + 0.85, 1.6, z + dz, 0x3f3428);
    batch.box(0.25, 0.35, 1.85, x + 0.85, 3.3, z + dz, trimForStone());
  }
  const sign = makeSign('TEATRO MAGNANI', 3.6, 0.55, x + 2.3, 5.6, z, Math.PI / 2);
  // The caller receives signs only from buildCity; this mesh is added directly.
  addLooseSign(sign);
}

function addComunaleFacade(batch: TriBatch, building: FidenzaBuilding): void {
  const box = boundsOf(building.poly);
  const x = building.x;
  const z = box.maxZ + 0.15;
  const width = Math.min(22, box.maxX - box.minX - 1);
  batch.box(width, 7.2, 0.8, x, 3.6, z + 0.2, TRIM);
  for (let i = 0; i < 4; i++) {
    const xx = x - width / 2 + 2.5 + (i / 3) * (width - 5);
    batch.box(0.55, 5.8, 0.55, xx, 2.9, z + 1.3, TRIM);
    batch.box(0.8, 0.3, 0.8, xx, 5.9, z + 1.3, STONE_DARK);
  }
  batch.box(width, 0.55, 2.2, x, 6.0, z + 1.3, TRIM);
  batch.box(width + 1, 0.25, 2.8, x, 6.3, z + 1.4, STONE);
  batch.tri(x - width / 2, 6.45, z + 1.4, x + width / 2, 6.45, z + 1.4, x, 8.2, z + 1.4, TRIM);
  batch.box(3.6, 3.4, 0.18, x, 1.7, z + 0.65, 0x3f3428);
  batch.box(4.1, 0.35, 0.3, x, 3.5, z + 0.65, STONE_DARK);
  circleFacingZ(batch, x, 7.6, z + 1.7, 1.25, 18, 0xf0e6cc);
  circleFacingZ(batch, x, 7.6, z + 1.75, 1.05, 18, 0x2b241c);
  batch.box(0.1, 0.9, 0.12, x, 7.8, z + 1.85, 0x2b241c);
  batch.box(0.65, 0.1, 0.12, x + 0.2, 7.6, z + 1.85, 0x2b241c);
  addLooseSign(makeSign('PALAZZO COMUNALE', 3.6, 0.55, x, 5.2, z + 2.6, 0));
}

function addStazioneCanopy(batch: TriBatch, building: FidenzaBuilding): void {
  const box = boundsOf(building.poly);
  const x = box.minX - 0.2;
  const z = building.z;
  const width = Math.min(34, box.maxZ - box.minZ - 2);
  batch.box(2.6, 0.25, width + 2, x - 1.2, 3.8, z, TRIM);
  for (let i = 0; i < 7; i++) {
    const zz = z - width / 2 + 1 + (i / 6) * (width - 2);
    batch.box(0.32, 3.8, 0.32, x - 1.7, 1.9, zz, STONE_DARK);
  }
  for (const dz of [-width * 0.28, 0, width * 0.28]) {
    batch.box(0.2, 2.9, 1.6, x - 0.1, 1.45, z + dz, 0x3f3428);
  }
  addLooseSign(makeSign('STAZIONE DI FIDENZA', 4.2, 0.55, x - 2.2, 4.5, z, -Math.PI / 2));
}

function trimForStone(): number {
  return 0xe1d3bb;
}

function circleFacingZ(
  batch: TriBatch,
  x: number,
  y: number,
  z: number,
  radius: number,
  segments: number,
  color: number
): void {
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    batch.tri(
      x,
      y,
      z,
      x + Math.cos(a) * radius,
      y + Math.sin(a) * radius,
      z,
      x + Math.cos(b) * radius,
      y + Math.sin(b) * radius,
      z,
      color
    );
  }
}

function addLooseSign(sign: THREE.Mesh): void {
  looseSigns.push(sign);
}

function addObelisk(batch: TriBatch): void {
  const { x, z } = OBELISK;
  batch.box(3.2, 0.45, 3.2, x, 0.23, z, STONE_DARK);
  batch.box(2.3, 0.45, 2.3, x, 0.68, z, STONE);
  const bottom = 0.9;
  const top = 11.5;
  const b = 0.9;
  const t = 0.38;
  batch.quadUp(x - b, bottom, z - b, x + b, bottom, z - b, x + t, top, z - t, x - t, top, z - t, 0xd8cbb3);
  batch.quadUp(x + b, bottom, z - b, x + b, bottom, z + b, x + t, top, z + t, x + t, top, z - t, 0xd8cbb3);
  batch.quadUp(x + b, bottom, z + b, x - b, bottom, z + b, x - t, top, z + t, x + t, top, z + t, 0xd8cbb3);
  batch.quadUp(x - b, bottom, z + b, x - b, bottom, z - b, x - t, top, z - t, x - t, top, z + t, 0xd8cbb3);
  batch.tri(x - t, top, z - t, x + t, top, z - t, x, top + 1.2, z, 0xc9b998);
  batch.tri(x + t, top, z - t, x + t, top, z + t, x, top + 1.2, z, 0xc9b998);
  batch.tri(x + t, top, z + t, x - t, top, z + t, x, top + 1.2, z, 0xc9b998);
  batch.tri(x - t, top, z + t, x - t, top, z - t, x, top + 1.2, z, 0xc9b998);
}

function addCampanile(batch: TriBatch): void {
  const { x, z, h } = BELL_TOWER;
  batch.box(5.2, 0.5, 5.2, x, 0.25, z, STONE_DARK);
  batch.box(4, h, 4, x, h / 2, z, STONE);
  batch.box(4.3, 0.3, 4.3, x, h - 1.2, z, TRIM);
  batch.box(3.4, 0.35, 3.4, x, h, z, TRIM);
  for (const [dx, dz] of [
    [0, 1.98],
    [0, -1.98],
    [1.98, 0],
    [-1.98, 0]
  ] as const) {
    batch.box(dx === 0 ? 1.5 : 0.16, 2.3, dz === 0 ? 1.5 : 0.16, x + dx, h - 2.6, z + dz, 0x202b2c);
  }
  batch.tri(x - 2.6, h + 0.3, z - 2.6, x + 2.6, h + 0.3, z - 2.6, x, h + 3.3, z, 0x6f7784);
  batch.tri(x + 2.6, h + 0.3, z - 2.6, x + 2.6, h + 0.3, z + 2.6, x, h + 3.3, z, 0x6f7784);
  batch.tri(x + 2.6, h + 0.3, z + 2.6, x - 2.6, h + 0.3, z + 2.6, x, h + 3.3, z, 0x6f7784);
  batch.tri(x - 2.6, h + 0.3, z + 2.6, x - 2.6, h + 0.3, z - 2.6, x, h + 3.3, z, 0x6f7784);
  batch.box(0.12, 1.8, 0.12, x, h + 4.2, z, 0x4a4035);
  batch.box(0.1, 0.1, 0.9, x, h + 4.55, z, 0x4a4035);
}

/* -------------------------------------------------------------------- signs */

function addStreetSigns(scene: THREE.Scene, batch: TriBatch): void {
  for (const label of STREET_LABELS) {
    const sign = makeSign(label.name, 2.6, 0.56, label.x, 3.1, label.z, 0);
    scene.add(sign);
    batch.box(0.1, 3.1, 0.1, label.x, 1.55, label.z, 0x4b3f31);
    batch.box(0.1, 0.1, 0.7, label.x, 2.95, label.z, 0x4b3f31);
  }
}

function addLandmarkSigns(scene: THREE.Scene, signs: THREE.Mesh[]): void {
  const entries = [
    { text: 'DUOMO', x: -293.25, y: 3.5, z: 8.5, ry: -Math.PI / 2, w: 2.4 },
    { text: 'TEATRO MAGNANI', x: -93, y: 4.2, z: 40, ry: 0, w: 3.4 },
    { text: 'PALAZZO COMUNALE', x: 20, y: 4.2, z: -56, ry: 0, w: 3.8 },
    { text: 'PORTA SAN DONNINO', x: -305, y: 4.6, z: -39, ry: 0, w: 3.8 },
    { text: 'STAZIONE', x: 175, y: 4.4, z: -99, ry: 0, w: 3.2 },
    { text: 'SAN PIETRO', x: -267, y: 3.7, z: 174, ry: 0, w: 3.2 },
    { text: 'PIAZZA GARIBALDI', x: 14.6, y: 3.1, z: -6, ry: 0, w: 3.8 },
    { text: 'GRAN MADRE', x: 410, y: 5.4, z: 138, ry: 0, w: 3.0 },
    { text: 'MUSEO MUSINI', x: 379.6, y: 6.2, z: 190.5, ry: 0, w: 3.4 },
    { text: 'SAN LAZZARO', x: 560, y: 4.0, z: 148, ry: 0, w: 3.2 },
    { text: 'PARCO VITTORIO VENETO', x: -234, y: 3.0, z: 600, ry: 0, w: 4.4 },
    { text: 'PARCO DELLA PACE', x: 278, y: 3.0, z: 784, ry: 0, w: 4.0 },
    { text: 'COREA', x: 600, y: 3.0, z: 866, ry: 0, w: 2.8 },
    { text: 'LUCE', x: -800, y: 3.4, z: 240, ry: Math.PI, w: 2.4 },
    { text: 'SAN PAOLO', x: -694, y: 4.2, z: 374, ry: Math.PI, w: 3.2 },
    { text: "SANT'ANTONIO", x: -676, y: 4.2, z: -224, ry: Math.PI, w: 3.6 },
    { text: 'LA LUCE', x: -620, y: 3.2, z: -162, ry: Math.PI, w: 2.8 },
    { text: 'LE AZALEE', x: 900, y: 3.2, z: 403, ry: 0, w: 3.0 },
    { text: 'CENTRO', x: 954, y: 6.4, z: 850, ry: -Math.PI / 2, w: 4.2 },
    { text: 'PARCO DELLE AZALEE', x: 900, y: 3.0, z: 758, ry: 0, w: 4.6 },
    { text: 'SKATEPARK', x: 1045, y: 3.0, z: 650, ry: 0, w: 3.2 },
    { text: 'AERMACCHI MB-326', x: 978, y: 3.4, z: 650, ry: 0, w: 4.8 },
    { text: 'CIGALA', x: 1053, y: 3.4, z: 1016, ry: 0, w: 3.0 },
    { text: 'STADIO BALLOTTA', x: -362, y: 3.4, z: 1122, ry: 0, w: 4.8 },
    { text: 'CENTRO BALLOTTA', x: -610, y: 3.2, z: 1176, ry: 0, w: 4.4 },
    { text: 'PALAPRATIZZOLI', x: -502, y: 3.2, z: 1306, ry: Math.PI / 2, w: 5.6 },
    { text: 'PISCINA', x: -466, y: 3.0, z: 1292, ry: -Math.PI / 2, w: 3.2 },
    { text: 'PIAZZA LA PIRA', x: 261, y: 3.2, z: 1186, ry: 0, w: 4.2 },
    { text: 'GIARDINO DI CHARLIE', x: 46, y: 3.0, z: 1165, ry: 0, w: 5.2 },
    { text: 'ISTITUTO AGRARIO', x: -5, y: 4.0, z: -292, ry: 0, w: 5.2 },
    { text: 'SCALO', x: -350, y: 3.2, z: -408, ry: 0, w: 3.2 },
    { text: 'PARCO NORD', x: 0, y: 3.0, z: -500, ry: 0, w: 3.2 },
    { text: 'SACRO CUORE', x: -648, y: 4.4, z: 874, ry: 0, w: 3.4 },
    { text: 'PARCO DEGLI OLMI', x: -870, y: 3.0, z: 920, ry: 0, w: 4.6 },
    { text: 'SANTA MARIA', x: 108, y: 3.8, z: 28, ry: 0, w: 3.2 },
    { text: 'SAN MICHELE', x: 359, y: 3.8, z: 135, ry: 0, w: 3.4 },
    { text: 'PARCO DE GASPERI', x: 30, y: 3.0, z: 860, ry: 0, w: 4.4 },
    { text: 'PARCOBALENO', x: -451, y: 3.0, z: 930, ry: 0, w: 3.6 }
  ];
  for (const entry of entries) {
    const sign = makeSign(entry.text, entry.w, 0.6, entry.x, entry.y, entry.z, entry.ry);
    const material = sign.material as THREE.MeshBasicMaterial;
    material.side = THREE.FrontSide;
    scene.add(sign);
    const back = sign.clone();
    back.rotation.y = entry.ry + Math.PI;
    scene.add(back);
    signs.push(sign);
  }
}

function makeSign(
  text: string,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  ry: number
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((canvas.width * height) / width);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f6edd8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#3b3126';
    ctx.lineWidth = 7;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = '#3b3126';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.min(72, Math.floor((canvas.width / Math.max(8, text.length)) * 1.25));
    ctx.font = `600 ${size}px Georgia, "Times New Roman", serif`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return mesh;
}

function addGranMadre(batch: TriBatch, building: FidenzaBuilding): void {
  const box = boundsOf(building.poly);
  const west = box.minX;
  const z = building.z;
  batch.box(0.35, 4.4, 0.35, west - 2.4, 2.2, z - 4, STONE);
  batch.box(0.35, 4.4, 0.35, west - 2.4, 2.2, z, STONE);
  batch.box(0.35, 4.4, 0.35, west - 2.4, 2.2, z + 4, STONE);
  batch.box(0.5, 0.35, 9, west - 2.4, 4.55, z, STONE_DARK);
  batch.box(0.5, 0.35, 9, west - 2.4, 0.25, z, STONE_DARK);
  batch.box(1.2, 0.18, 5.2, west - 3, 0.12, z, STONE_DARK);
  batch.tri(west - 2.8, 4.72, z - 4.8, west - 2.8, 4.72, z + 4.8, west - 2.8, 6.2, z, STONE);
}

function addGranMadreDome(scene: THREE.Scene): void {
  const building = FIDENZA.buildings.find((item) => item.landmark === 'granmadre');
  if (!building) return;
  const group = new THREE.Group();
  group.position.set(building.x, building.h + 0.8, building.z);
  const stone = new THREE.MeshLambertMaterial({ color: 0xd7c7ab, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: 0x9a8a73, flatShading: true });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 2.1, 12), stone);
  drum.position.y = 1.05;
  group.add(drum);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3.75, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x8d9a93, flatShading: true, side: THREE.DoubleSide })
  );
  dome.position.y = 2.1;
  group.add(dome);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.4, 8), stone);
  lantern.position.y = 5.6;
  group.add(lantern);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 8), dark);
  cap.position.y = 6.8;
  group.add(cap);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), dark);
  crossV.position.y = 7.8;
  group.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.08), dark);
  crossH.position.y = 7.92;
  group.add(crossH);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(group);
}

function addChurchTower(batch: TriBatch, building: FidenzaBuilding, stone: number): void {
  const box = boundsOf(building.poly);
  const height = building.h;
  const towerX = box.minX + 2.1;
  const towerZ = box.minZ + 2.1;
  batch.box(2.2, height + 2.6, 2.2, towerX, (height + 2.6) / 2, towerZ, stone);
  batch.box(2.5, 0.3, 2.5, towerX, height + 2.8, towerZ, STONE_DARK);
  batch.tri(towerX - 1.2, height + 2.95, towerZ - 1.2, towerX + 1.2, height + 2.95, towerZ - 1.2, towerX, height + 4.5, towerZ, 0x7b7a70);
  batch.tri(towerX + 1.2, height + 2.95, towerZ - 1.2, towerX + 1.2, height + 2.95, towerZ + 1.2, towerX, height + 4.5, towerZ, 0x7b7a70);
  batch.tri(towerX + 1.2, height + 2.95, towerZ + 1.2, towerX - 1.2, height + 2.95, towerZ + 1.2, towerX, height + 4.5, towerZ, 0x7b7a70);
  batch.tri(towerX - 1.2, height + 2.95, towerZ + 1.2, towerX - 1.2, height + 2.95, towerZ - 1.2, towerX, height + 4.5, towerZ, 0x7b7a70);
  batch.box(0.1, 1.6, 0.1, towerX, height + 5.3, towerZ, 0x4a4035);
  batch.box(0.8, 0.1, 0.1, towerX, height + 5.7, towerZ, 0x4a4035);
}

function addCentroCommerciale(batch: TriBatch, building: FidenzaBuilding): void {
  const box = boundsOf(building.poly);
  const z = building.z;
  const west = box.minX;
  batch.box(8, 0.35, 5, west - 2.0, 5.0, z, 0xd8c7a5);
  batch.box(0.35, 4.2, 7.8, west - 0.9, 2.3, z, 0x9bbfc5);
  for (const offset of [-3.9, -2.6, -1.3, 0, 1.3, 2.6, 3.9]) {
    batch.box(0.12, 4.4, 0.12, west - 1.14, 2.3, z + offset, 0x35474d);
  }
  batch.box(0.16, 0.18, 8.0, west - 1.14, 4.48, z, 0x35474d);
  batch.box(0.16, 0.18, 8.0, west - 1.14, 0.14, z, 0x35474d);
  batch.box(0.2, 2.2, 2.4, west - 1.17, 1.1, z, 0x2b3a3e);
  batch.box(0.2, 0.8, 9.4, west - 0.1, 4.9, z, 0xf1e6d0);
  for (const offset of [-42, -28, 28, 42]) {
    batch.box(0.14, 2.6, 3.4, west - 0.05, 2.2, z + offset, 0x3b4b50);
  }
  for (let offset = -42; offset <= 42; offset += 10) {
    batch.box(0.12, 1.7, 3.0, west - 0.05, 6.7, z + offset, 0x3b4b50);
  }
  batch.box(2.5, 0.16, 1.2, west - 1.4, 0.12, z, 0xb7aa91);
  batch.box(Math.min(42, box.maxX - box.minX - 12), 0.16, 6, building.x + 6, building.h + 0.74, z + 18, 0x7fa9b3);
}

function addMuseo(batch: TriBatch): void {
  const x = 379.6;
  const z = 185.9;
  batch.box(11.2, 5.4, 8.8, x, 2.7, z, 0xe0d0b4);
  batch.box(10.6, 0.3, 8.2, x, 5.5, z, 0xb5684a);
  batch.box(11.8, 0.22, 9.4, x, 5.7, z, 0xd8c7a5);
  for (const offset of [-4.1, 0, 4.1]) {
    batch.box(0.35, 4.1, 0.35, x - 5.75, 2.05, z + offset, 0xc9b99e);
  }
  batch.box(1.5, 0.18, 3.6, x - 6.1, 0.12, z, STONE_DARK);
  batch.box(2.6, 0.08, 0.45, x - 5.75, 3.8, z, 0x3b3126);
}

/* ------------------------------------------------------------- small utils */

function generateLamps(collision: CollisionWorld): Array<{ x: number; z: number }> {
  const lamps: Array<{ x: number; z: number }> = [];
  const seen = new Set<string>();
  for (const road of FIDENZA.roads) {
    if (!['primary', 'secondary', 'tertiary', 'pedestrian', 'residential'].includes(road.kind)) continue;
    if (road.kind === 'residential' && road.name === '') continue;
    const count = road.pts.length / 2;
    for (let i = 0; i < count - 1; i++) {
      const ax = road.pts[i * 2];
      const az = road.pts[i * 2 + 1];
      const bx = road.pts[i * 2 + 2];
      const bz = road.pts[i * 2 + 3];
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 24) continue;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const centre = mx >= -360 && mx <= 290 && mz >= -230 && mz <= 235;
      const east = mx >= 780 && mx <= 1380 && mz >= -280 && mz <= 1110;
      const south = mx >= -700 && mx <= 420 && mz >= 1050 && mz <= 1390;
      const north = mx >= -800 && mx <= 400 && mz >= -590 && mz <= -250;
      if (!centre && !east && !south && !north) continue;
      const nx = (bz - az) / length;
      const nz = -(bx - ax) / length;
      const x = Math.round((mx + nx * (road.w / 2 + 1.6)) * 2) / 2;
      const z = Math.round((mz + nz * (road.w / 2 + 1.6)) * 2) / 2;
      const key = `${x},${z}`;
      if (seen.has(key)) continue;
      if (!collision.isFree(x, z, 0.45)) continue;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 28) continue;
      seen.add(key);
      lamps.push({ x, z });
      if (lamps.length >= 48) return lamps;
    }
  }
  return lamps;
}

function wallColor(building: FidenzaBuilding): number {
  if (building.kind === 'church') return 0xf3ead8;
  if (building.kind === 'industrial' || building.kind === 'garage') return 0xc9bda9;
  let hash = 0;
  for (let i = 0; i < building.id.length; i++) hash = (hash * 31 + building.id.charCodeAt(i)) >>> 0;
  return WALLS[hash % WALLS.length];
}

function roofColor(building: FidenzaBuilding): number {
  let hash = 0;
  for (let i = 0; i < building.id.length; i++) hash = (hash * 17 + building.id.charCodeAt(i)) >>> 0;
  return ROOFS[hash % ROOFS.length];
}

function shade(color: number, amount: number): number {
  const c = new THREE.Color(color);
  c.offsetHSL(0, 0, amount);
  return c.getHex();
}

function boundsOf(pts: number[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i];
    const z = pts[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function centroid(pts: number[]): { x: number; z: number } {
  let x = 0;
  let z = 0;
  const count = pts.length / 2;
  for (let i = 0; i < count; i++) {
    x += pts[i * 2];
    z += pts[i * 2 + 1];
  }
  return { x: x / count, z: z / count };
}

function circleFacingX(
  batch: TriBatch,
  x: number,
  y: number,
  z: number,
  radius: number,
  segments: number,
  color: number
): void {
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    batch.tri(
      x,
      y,
      z,
      x,
      y + Math.sin(a) * radius,
      z + Math.cos(a) * radius,
      x,
      y + Math.sin(b) * radius,
      z + Math.cos(b) * radius,
      color
    );
  }
}

