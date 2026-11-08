import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import {
  WORLD, ROAD_STYLE, AREA_STYLE, PLAYER
} from './config.js';
import {
  clamp, seededRandom, polygonBounds, pointInPoly, makeSpatialHash,
  groundHeightAt, hashString, formatNumber
} from './utils.js';
import { buildLandmarks, makeTextSprite } from './landmarks.js';
import {
  makeCar, makeBus, makeTrain, makePerson, makeBicycle, makeBench,
  makeVespa, makeDog, makeCat, makeTreeGeometry, makeBlockTreeGeometry
} from './models.js';
import { hasStar, hasPlace, getStats } from './save.js';
import { applyOverrides } from './map-overrides.js';
import { buildBusRoute, makeLoopRoute } from './transit.js';
import { classifyBuildingRoof, polygonCentroid } from './building-geometry.js';
import { planPoiSigns } from './poi-signs.js';
import { planTraffic } from './traffic.js';
import { NPC_FIXED, NPC_WALKERS } from './npcs.js';
import { buildDistricts, getDistrictAt as findDistrictAt } from './districts.js';
import { scheduleSlotFor, crowdVisible, isVenueOpen, venueLabel, venueStatus } from './schedules.js';
import { BLOCK_SIZE, getBlockMaterial, animateWater } from './mc-blocks.js';
import {
  AREA_BLOCK_FALLBACK, DETAIL_SIZE,
  blockKey, baseBlock, bump, detailPaletteFor, roadSurfaceBlock, sidewalkBlock,
  roofFallbackBlock, wallFallbackBlock
} from './block-palette.js';
import { roofStepBoxes, voxelBox, voxelGableEnd } from './voxel-details.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

// Edifici OSM già sostituiti dai landmark modellati a mano: vanno esclusi sia
// dal corpo dell'edificio sia dai dettagli di facciata (finestre, persiane…).
const LANDMARK_BUILDING_NAMES = new Set([
  'Cattedrale di San Donnino',
  'Porta di San Donnino',
  'Teatro Girolamo Magnani',
  'Santuario della Gran Madre di Dio',
  'Chiesa di San Pietro',
  'Fidenza'
]);

function litMaterial(quality, params = {}, physical = {}) {
  if (quality === 'low') return new THREE.MeshLambertMaterial(params);
  return new THREE.MeshStandardMaterial({
    ...params,
    roughness: physical.roughness ?? 0.9,
    metalness: physical.metalness ?? 0.02
  });
}

function paintGeometry(geom, color, { roofColor = null, darkColor = null, baseColor = null, baseHeight = 1.5 } = {}) {
  let g = geom.index ? geom.toNonIndexed() : geom;
  g.deleteAttribute('uv');
  g.deleteAttribute('uv1');
  g.deleteAttribute('uv2');
  g.clearGroups();
  if (!g.attributes.normal) g.computeVertexNormals();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const base = new THREE.Color(color);
  const roof = new THREE.Color(roofColor || color);
  const dark = new THREE.Color(darkColor || color);
  const plinth = baseColor ? new THREE.Color(baseColor) : null;
  const out = new THREE.Color();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const ny = norm ? norm.getY(i) : 0;
    const c = ny > 0.55 ? roof : ny < -0.35 ? dark : base;
    out.copy(c);
    if (plinth) {
      const y = pos.getY(i);
      if (y < baseHeight) out.lerp(plinth, 0.6 * (1 - Math.max(0, y) / baseHeight));
    }
    colors[i * 3] = out.r;
    colors[i * 3 + 1] = out.g;
    colors[i * 3 + 2] = out.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  return g;
}

function mergeClean(geoms) {
  if (!geoms.length) return null;
  const merged = mergeGeometries(geoms, false);
  for (const g of geoms) g.dispose();
  if (merged) {
    merged.computeBoundingSphere();
  }
  return merged;
}

function assignPlanarUV(geom, scale = 16) {
  if (!geom?.attributes?.position) return geom;
  const pos = geom.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / scale;
    uv[i * 2 + 1] = pos.getZ(i) / scale;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geom;
}

function assignBlockUV(geom, size = BLOCK_SIZE) {
  if (!geom?.attributes?.position) return geom;
  const pos = geom.attributes.position;
  if (!geom.attributes.normal) geom.computeVertexNormals();
  const norm = geom.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));
    let u;
    let v;
    if (ny >= nx && ny >= nz) {
      u = pos.getX(i) / size;
      v = pos.getZ(i) / size;
    } else if (nx >= nz) {
      u = pos.getZ(i) / size;
      v = pos.getY(i) / size;
    } else {
      u = pos.getX(i) / size;
      v = pos.getY(i) / size;
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geom;
}

function usableSurfaceBlock(block, fallback) {
  const key = baseBlock(blockKey(block));
  if (!key || key === 'air' || key === 'water') return fallback;
  return key;
}

function makeRibbon(pts, width, y, color, { roofColor = null } = {}) {
  if (pts.length < 2) return null;
  const half = width / 2;
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    let nx = 0, nz = 0;
    if (i === 0) {
      const dx = pts[1][0] - x, dz = pts[1][1] - z;
      const l = Math.hypot(dx, dz) || 1;
      nx = -dz / l; nz = dx / l;
    } else if (i === pts.length - 1) {
      const dx = x - pts[i - 1][0], dz = z - pts[i - 1][1];
      const l = Math.hypot(dx, dz) || 1;
      nx = -dz / l; nz = dx / l;
    } else {
      const d1x = x - pts[i - 1][0], d1z = z - pts[i - 1][1];
      const d2x = pts[i + 1][0] - x, d2z = pts[i + 1][1] - z;
      const l1 = Math.hypot(d1x, d1z) || 1;
      const l2 = Math.hypot(d2x, d2z) || 1;
      const n1x = -d1z / l1, n1z = d1x / l1;
      const n2x = -d2z / l2, n2z = d2x / l2;
      let mx = n1x + n2x, mz = n1z + n2z;
      const ml = Math.hypot(mx, mz);
      if (ml < 1e-6) { mx = n1x; mz = n1z; }
      else { mx /= ml; mz /= ml; }
      const dot = Math.max(0.35, mx * n1x + mz * n1z);
      const scale = Math.min(2.4, 1 / dot);
      nx = mx * scale; nz = mz * scale;
    }
    left.push([x + nx * half, z + nz * half]);
    right.push([x - nx * half, z - nz * half]);
  }
  const positions = new Float32Array((pts.length - 1) * 6 * 3);
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l1 = left[i], r1 = right[i], l2 = left[i + 1], r2 = right[i + 1];
    const verts = [l1, l2, r1, r1, l2, r2];
    for (const [vx, vz] of verts) {
      positions[k++] = vx;
      positions[k++] = y;
      positions[k++] = vz;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return paintGeometry(g, color, { roofColor });
}

function offsetPolyline(pts, distance) {
  if (!pts || pts.length < 2) return [];
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    let nx = 0, nz = 0;
    if (i === 0) {
      const dx = pts[1][0] - x, dz = pts[1][1] - z;
      const l = Math.hypot(dx, dz) || 1;
      nx = -dz / l; nz = dx / l;
    } else if (i === pts.length - 1) {
      const dx = x - pts[i - 1][0], dz = z - pts[i - 1][1];
      const l = Math.hypot(dx, dz) || 1;
      nx = -dz / l; nz = dx / l;
    } else {
      const d1x = x - pts[i - 1][0], d1z = z - pts[i - 1][1];
      const d2x = pts[i + 1][0] - x, d2z = pts[i + 1][1] - z;
      const l1 = Math.hypot(d1x, d1z) || 1;
      const l2 = Math.hypot(d2x, d2z) || 1;
      const n1x = -d1z / l1, n1z = d1x / l1;
      const n2x = -d2z / l2, n2z = d2x / l2;
      let mx = n1x + n2x, mz = n1z + n2z;
      const ml = Math.hypot(mx, mz);
      if (ml < 1e-6) { mx = n1x; mz = n1z; }
      else { mx /= ml; mz /= ml; }
      const dot = Math.max(0.35, mx * n1x + mz * n1z);
      const scale = Math.min(2.4, 1 / dot);
      nx = mx * scale; nz = mz * scale;
    }
    out.push([x + nx * distance, z + nz * distance]);
  }
  return out;
}

function makeSideRibbon(pts, roadWidth, sideWidth, side, y, color) {
  const offset = side * (roadWidth / 2 + sideWidth / 2);
  return makeRibbon(offsetPolyline(pts, offset), sideWidth, y, color);
}

function makePolygonGeometry(poly, y, color) {
  if (!poly || poly.length < 3) return null;
  const pts = poly.map(p => [p[0], -p[1]]);
  // assicura il verso antiorario
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  if (area < 0) pts.reverse();
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const geom = new THREE.ShapeGeometry(shape);
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, y, 0);
  return paintGeometry(geom, color);
}

function addQuad(positions, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
  positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  positions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
}

function createGlowTexture(color = 'rgba(255,224,140,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color.replace(/[\d.]+\)$/, '0.55)'));
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStarGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? 0.62 : 0.27;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  g.center();
  return g;
}

function makeGlowSprite(color) {
  const tex = createGlowTexture(color);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.set(2.2, 2.2, 1);
  return sp;
}

function makeSquareSprite(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(2.2, 2.2, 1);
  return sprite;
}

function makeSpeechBubble() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const x = 8, y = 7, w = 48, h = 36, r = 11;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,248,232,.96)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(27,36,30,.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(24, 42);
  ctx.lineTo(20, 55);
  ctx.lineTo(35, 42);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,248,232,.96)';
  ctx.fill();
  ctx.fillStyle = '#2f4a3c';
  for (const cx of [21, 32, 43]) {
    ctx.beginPath();
    ctx.arc(cx, 25, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(0.55, 0.55, 1);
  return sp;
}

function makeRouteWalker(points, startT = 0, direction = 1, speed = 5) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    segs.push({ ax, az, bx, bz, len, start: total });
    total += len;
  }
  return {
    segs, total, t: clamp(startT, 0, total), dir: direction, speed,
    advance(dt) {
      if (!this.total) return;
      this.t += dt * this.speed * this.dir;
      if (this.t > this.total) { this.t = this.total; this.dir = -1; }
      else if (this.t < 0) { this.t = 0; this.dir = 1; }
    },
    pose() {
      const t = clamp(this.t, 0, this.total);
      for (const s of this.segs) {
        if (t <= s.start + s.len || s === this.segs[this.segs.length - 1]) {
          const u = clamp((t - s.start) / s.len, 0, 1);
          const x = s.ax + (s.bx - s.ax) * u;
          const z = s.az + (s.bz - s.az) * u;
          const dx = (s.bx - s.ax) * this.dir;
          const dz = (s.bz - s.az) * this.dir;
          return { x, z, dx, dz };
        }
      }
      return { x: 0, z: 0, dx: 0, dz: 1 };
    }
  };
}

export class World {
  constructor({ scene, renderer, city, terrain, map, quality = 'high', arnis = null }) {
    this.scene = scene;
    this.renderer = renderer;
    this.rawCity = city;
    this.city = applyOverrides(city, map.overrides || {}, map.custom || {});
    this.arnis = arnis;
    this.arnisBuildings = arnis?.buildings || {};
    this.arnisAreas = arnis?.areas || {};
    this.arnisRoads = arnis?.roads || {};
    this.arnisTrees = Array.isArray(arnis?.trees) ? arnis.trees : [];
    this.arnisTreeRows = Array.isArray(arnis?.treeRows) ? arnis.treeRows : [];
    this.arnisLandmarks = arnis?.landmarks || {};
    this.arnisWater = arnis?.water || {};
    this.arnisMeta = arnis?.meta || null;
    this.arnisSurfaceImage = arnis?.surfaceImage || null;
    this.arnisSurfaceTexture = null;
    this.arnisSurfaceSample = null;
    this.blockMeshes = [];
    this.roofMeshes = [];
    this.windowMeshes = [];
    this.applyArnisHeights();
    this.districts = buildDistricts(map.districts || [], WORLD.bounds);
    this.districtById = new Map(this.districts.map(d => [d.id, d]));
    this.venues = map.venues || [];
    this.venueById = new Map(this.venues.map(v => [v.id, v]));
    this.barBlue = null;
    this._venueBucket = -1;
    this._scheduleBucket = -1;
    this.terrain = terrain;
    this.map = map;
    this.places = map.places || [];
    this.placesById = new Map(this.places.map(p => [p.id, p]));
    this.landmarks = map.landmarks || [];
    this.landmarksById = new Map(this.landmarks.map(l => [l.id, l]));
    const ambulance = (map.missions || []).find(m => m.id === 'ambulance');
    const hospitalStep = ambulance?.steps?.[ambulance.steps.length - 1];
    this.hospital = hospitalStep ? { x: hospitalStep.x, z: hospitalStep.z, name: hospitalStep.name } : null;
    this.starDefs = (map.stars?.length ? map.stars : city.stars) || [];
    this.vehicleDefs = Array.isArray(map.vehicles) ? map.vehicles : null;
    this.spawnDef = map.spawn || null;
    this.missionBoardDef = map.missionBoard || null;
    this.quality = quality;
    this.time = 0;
    this.hour = 15;
    this.weather = { rain: 0, clouds: 0.2 };
    this.userData = {};

    this.colliders = [];
    this.hash = makeSpatialHash(0, 40);
    this.colliderNames = new Map();

    this.starObjects = [];
    this.placeObjects = [];
    this.trafficCars = [];
    this.pedestrians = [];
    this.npcs = [];
    this.cyclists = [];
    this.seatedPeople = [];
    this.marketPeople = [];
    this.pets = [];
    this.marketLight = null;
    this.rainRipple = null;
    this._parkedCars = [];
    this._parkedBikeSpots = [];
    this.poiSigns = [];
    this.lampLights = [];
    this.vehicleSpawns = [];
    this.landmarkGroups = new Map();

    this.skyUniforms = null;
    this.skyDome = null;
    this.sunLight = null;
    this.hemi = null;
    this.sunSprite = null;
    this.moonSprite = null;
    this.stars = null;
    this.textureCache = {};
    this.trafficLights = [];
    this.crossingWalkers = [];
    this.levelCrossings = [];
    this.bus = null;
    this.busStops = [];
    this.train = null;
    this.stationArea = null;
    this.windowMesh = null;
    this.bulbMesh = null;
    this.rainPoints = null;
    this.clouds = [];
    this.seasonStyle = null;
    this.seasonId = null;
    this.seasonParticles = null;
    this.snowOverlay = null;
    this.christmasLights = null;
  }

  applyArnisHeights() {
    this.defaultGlassBlock = 'glass';
    this.defaultDoorBlock = 'dark_oak_planks';
    if (!this.arnisBuildings) return;
    const glassCounts = new Map();
    const doorCounts = new Map();
    for (const building of this.city.buildings) {
      const info = this.arnisBuildings[String(building.id)];
      if (!info) continue;
      building.arnis = info;
      building.osmHeight = building.h;
      if (Number.isFinite(info.height)) {
        building.h = clamp(info.height, 3, 32);
      }
      if (info.glass) bump(glassCounts, info.glass);
      if (info.door) bump(doorCounts, info.door);
    }
    let bestGlass = 'glass';
    let bestGlassCount = -1;
    for (const [block, count] of glassCounts) {
      if (count > bestGlassCount) { bestGlass = block; bestGlassCount = count; }
    }
    let bestDoor = 'dark_oak_planks';
    let bestDoorCount = -1;
    for (const [block, count] of doorCounts) {
      if (count > bestDoorCount) { bestDoor = block; bestDoorCount = count; }
    }
    this.defaultGlassBlock = bestGlass;
    this.defaultDoorBlock = baseBlock(bestDoor);
  }

  blockMaterial(block, opts = {}) {
    return getBlockMaterial(block, { quality: this.quality, ...opts });
  }

  addMaterialGeometry(buckets, block, geometry) {
    if (!geometry) return;
    const key = baseBlock(blockKey(block || 'stone'));
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
    normalized.clearGroups?.();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(normalized);
  }

  flushMaterialBuckets(buckets, {
    name = 'blocchi',
    castShadow = true,
    receiveShadow = true,
    side = THREE.FrontSide,
    vertexColors = false,
    uvSize = BLOCK_SIZE
  } = {}) {
    let count = 0;
    for (const [block, geometries] of buckets) {
      const merged = mergeClean(geometries);
      if (!merged) continue;
      assignBlockUV(merged, uvSize);
      const material = this.blockMaterial(block, { side, vertexColors });
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.name = `${name}-${block}`;
      mesh.userData.arnisBlock = block;
      this.scene.add(mesh);
      this.blockMeshes.push(mesh);
      count++;
    }
    return count;
  }

  async build(onProgress = () => {}) {
    const step = async (p, label, fn) => {
      onProgress(p, label);
      await tick();
      fn();
      await tick();
    };

    await step(0.04, 'Accendo il cielo…', () => this._setupScene());
    await step(0.12, 'Disegno il rilievo…', () => this._buildTerrain());
    await step(0.20, 'Coloro parchi e piazze…', () => this._buildAreas());
    await step(0.32, 'Traccio le strade…', () => this._buildRoads());
    await step(0.38, 'Semafori e attraversamenti…', () => this._buildTrafficFurniture());
    await step(0.39, 'Segnaletica stradale…', () => this._buildRoadSigns());
    await step(0.395, 'Segnaletica dei parcheggi…', () => this._buildParkingSigns());
    await step(0.40, 'Poso i binari…', () => this._buildRailways());
    await step(0.405, 'Passaggi a livello…', () => this._buildLevelCrossings());
    await step(0.41, 'Dettagli ferroviari…', () => this._buildRailDetails());
    onProgress(0.45, 'Costruisco gli edifici…');
    await this._buildBuildings(onProgress);
    await step(0.64, 'Accendo le finestre…', () => this._buildWindows());
    await step(0.68, 'Appendo le insegne delle attività…', () => this._buildPoiSigns());
    await step(0.70, 'Pianto gli alberi…', () => this._buildProps());
    await step(0.706, 'Aiuole e lampioni di strada…', () => {
      this._buildTreePits();
      this._buildStreetDetails();
    });
    await step(0.71, 'Canneti e argini…', () => this._buildRiverDetails());
    await step(0.72, 'Siepi e recinzioni…', () => this._buildCenterBarriers());
    await step(0.73, 'Parchi e campi sportivi…', () => this._buildParksAndSports());
    await step(0.74, 'Colture e zone industriali…', () => this._buildCountryside());
    await step(0.78, 'Metto i luoghi simbolo…', () => this._buildLandmarks());
    await step(0.82, 'Appendo insegne e arredi…', () => this._buildMapProps());
    await step(0.835, 'Apro il Bar Blu Piramide…', () => this._buildVenues());
    await step(0.85, 'Metto in moto bus e treno…', () => this._buildTransit());
    await step(0.86, 'Arredo e tavolini del centro…', () => {
      this._buildCenterFurniture();
      this._buildCenterTerraces();
    });
    await step(0.862, 'Accendo i lampioni delle strade…', () => this._buildExtraLightPools());
    await step(0.87, 'Nascondo le stelle…', () => this._buildCollectibles());
    await step(0.885, 'Mercato e gente seduta…', () => {
      this._buildMarket();
      this._buildSeatedPeople();
    });
    await step(0.90, 'Parcheggio auto e Vespe…', () => this._buildVehicles());
    await step(0.905, 'Auto e Vespe parcheggiate…', () => this._buildParkedVehicles());
    await step(0.94, 'Faccio girare la città…', () => this._buildTraffic());
    await step(0.945, 'Cani e gatti…', () => this._buildPets());
    await step(0.955, 'Popolo strade e piazze…', () => this._buildNpcs());
    await step(0.97, 'Ultimi ritocchi…', () => this._buildAtmosphere());
    onProgress(1, 'Fidenza è pronta');
  }

  _setupScene() {
    this.scene.background = new THREE.Color('#8fc1ff');
    this.scene.fog = new THREE.Fog('#c9dcff', 210, 900);

    const hemi = new THREE.HemisphereLight('#cfe6ef', '#5b5a44', 1.15);
    this.scene.add(hemi);
    this.hemi = hemi;
    const ambient = new THREE.AmbientLight('#8fa7bd', 0.12);
    this.scene.add(ambient);
    this.ambient = ambient;

    const sun = new THREE.DirectionalLight('#fff1cf', 2.1);
    sun.position.set(120, 190, 80);
    sun.castShadow = this.quality === 'high';
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 460;
    sun.shadow.camera.left = -110;
    sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 2.5;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sunLight = sun;

    // Cielo a gradiente
    const skyGeo = new THREE.SphereGeometry(4200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#3f7fe0') },
        bottomColor: { value: new THREE.Color('#bcd8ff') },
        sunColor: { value: new THREE.Color('#fff3c4') },
        sunDirection: { value: new THREE.Vector3(0, 1, 0) },
        sunGlow: { value: 0.7 },
        offset: { value: 120 },
        exponent: { value: 0.85 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        uniform float sunGlow;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          vec3 direction = normalize(vWorldPosition + vec3(0.0, offset, 0.0));
          float h = direction.y;
          vec3 color = mix(bottomColor, topColor, pow(max(h, 0.0), exponent));
          float sun = pow(max(dot(direction, normalize(sunDirection)), 0.0), 48.0);
          float horizon = pow(1.0 - abs(h), 5.0);
          color += sunColor * sun * sunGlow;
          color += sunColor * horizon * sunGlow * 0.08;
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      toneMapped: true,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyUniforms = skyMat.uniforms;
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);

    // Sole e luna quadrati, in stile Minecraft.
    this.sunSprite = makeSquareSprite('#fff6c8');
    this.sunSprite.scale.set(220, 220, 1);
    this.scene.add(this.sunSprite);
    this.moonSprite = makeSquareSprite('#dfeaff');
    this.moonSprite.scale.set(150, 150, 1);
    this.scene.add(this.moonSprite);

    // Stelle notturne
    const starPos = [];
    const rnd = seededRandom(42);
    for (let i = 0; i < 700; i++) {
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(rnd() * 0.9 + 0.05);
      const r = 3500;
      starPos.push(Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r * 0.9 + 300, Math.sin(phi) * Math.sin(theta) * r);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#e8f1ff', size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.8 }));
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  _buildSurfaceSampler() {
    const image = this.arnisSurfaceImage;
    const meta = this.arnisMeta;
    if (!image || !meta?.surface) return null;
    const width = 512;
    const height = Math.max(1, Math.round(width * meta.surface.height / meta.surface.width));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
      ctx.drawImage(image, 0, 0, width, height);
    } catch {
      return null;
    }
    const data = ctx.getImageData(0, 0, width, height).data;
    return { data, width, height, meta };
  }

  _sampleSurfaceColor(x, z) {
    const sampler = this.arnisSurfaceSample;
    if (!sampler) return null;
    const bounds = WORLD.bounds;
    const u = clamp((x - bounds.minX) / (bounds.maxX - bounds.minX), 0, 0.999999);
    const v = clamp((z - bounds.minZ) / (bounds.maxZ - bounds.minZ), 0, 0.999999);
    const px = Math.floor(u * sampler.width);
    const py = Math.floor(v * sampler.height);
    const index = (py * sampler.width + px) * 4;
    const data = sampler.data;
    return new THREE.Color().setRGB(
      data[index] / 255,
      data[index + 1] / 255,
      data[index + 2] / 255,
      THREE.SRGBColorSpace
    );
  }

  _buildTerrain() {
    const { widthKm, segments } = WORLD.terrain;
    const size = widthKm * 1000;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cUrban = new THREE.Color('#8d967d');
    const cGrass = new THREE.Color('#729c5c');
    const cField = new THREE.Color('#b4a36e');
    const cHigh = new THREE.Color('#5f7f4c');
    const cWater = new THREE.Color('#6c8d8b');
    this.arnisSurfaceSample = this._buildSurfaceSampler();
    const arnisBounds = WORLD.bounds;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = groundHeightAt(this.terrain, x, z, 0);
      pos.setY(i, y);
      const inside = x > WORLD.flat.minX && x < WORLD.flat.maxX && z > WORLD.flat.minZ && z < WORLD.flat.maxZ;
      let c;
      if (inside) {
        c = cUrban.clone();
      } else {
        const n = Math.sin(x * 0.013) * Math.cos(z * 0.017) + Math.sin((x + z) * 0.006) * 0.7;
        c = cGrass.clone().lerp(cField, clamp(0.35 + n * 0.28, 0, 1));
        if (y > 35) c.lerp(cHigh, clamp((y - 35) / 110, 0, 1));
        if (y < -5) c.lerp(cWater, 0.25);
      }
      const shade = 0.96 + 0.04 * Math.sin(x * 0.7 + z * 0.4);
      const sampled = (x > arnisBounds.minX && x < arnisBounds.maxX && z > arnisBounds.minZ && z < arnisBounds.maxZ)
        ? this._sampleSurfaceColor(x, z)
        : null;
      const color = sampled || c;
      colors[i * 3] = color.r * shade;
      colors[i * 3 + 1] = color.g * shade;
      colors[i * 3 + 2] = color.b * shade;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terreno';
    this.scene.add(mesh);
    this.terrainMesh = mesh;

    // Superficie reale di ArnisWorld3: 1 pixel = 1 blocco (2 m).
    if (this.arnisSurfaceImage && this.arnisMeta?.surface) {
      let texture;
      if (this.quality === 'high') {
        texture = new THREE.Texture(this.arnisSurfaceImage);
        texture.needsUpdate = true;
      } else {
        const source = this.arnisMeta.surface;
        const scale = this.quality === 'medium' ? 0.5 : 0.25;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.arnisSurfaceImage, 0, 0, canvas.width, canvas.height);
        texture = new THREE.CanvasTexture(canvas);
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = this.quality === 'low' ? THREE.NearestFilter : THREE.NearestMipmapNearestFilter;
      texture.generateMipmaps = this.quality !== 'low';
      texture.anisotropy = this.quality === 'high'
        ? Math.min(4, this.renderer?.capabilities?.getMaxAnisotropy?.() || 1)
        : 1;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      const width = arnisBounds.maxX - arnisBounds.minX;
      const depth = arnisBounds.maxZ - arnisBounds.minZ;
      const overlayGeo = new THREE.PlaneGeometry(width, depth);
      overlayGeo.rotateX(-Math.PI / 2);
      const overlayMat = new THREE.MeshLambertMaterial({ map: texture });
      const overlay = new THREE.Mesh(overlayGeo, overlayMat);
      overlay.position.set(
        (arnisBounds.minX + arnisBounds.maxX) / 2,
        0.012,
        (arnisBounds.minZ + arnisBounds.maxZ) / 2
      );
      overlay.receiveShadow = true;
      overlay.name = 'superficie-arnis';
      this.arnisSurfaceTexture = texture;
      this.scene.add(overlay);
    }

    // Dettaglio procedurale del suolo: solo senza la superficie Arnis.
    if (!this.arnisSurfaceImage) {
    const gc = document.createElement('canvas');
    gc.width = gc.height = 256;
    const gctx = gc.getContext('2d');
    const grnd = seededRandom(2027);
    // lastre di pietra
    for (let ty = 0; ty < 4; ty++) {
      for (let tx = 0; tx < 4; tx++) {
        const shade = ty % 2 === tx % 2 ? 0.02 : 0.045;
        gctx.fillStyle = `rgba(90,74,54,${shade})`;
        gctx.fillRect(tx * 64 + 1, ty * 64 + 1, 62, 62);
      }
    }
    gctx.strokeStyle = 'rgba(75,60,42,.20)';
    gctx.lineWidth = 1.2;
    for (let i = 0; i <= 4; i++) {
      gctx.beginPath(); gctx.moveTo(i * 64, 0); gctx.lineTo(i * 64, 256); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(0, i * 64); gctx.lineTo(256, i * 64); gctx.stroke();
    }
    for (let i = 0; i < 2200; i++) {
      const a = 0.01 + grnd() * 0.035;
      gctx.fillStyle = grnd() > 0.5 ? `rgba(70,58,42,${a})` : `rgba(255,250,235,${a * 1.4})`;
      const s = 1 + grnd() * 2.5;
      gctx.fillRect(grnd() * 256, grnd() * 256, s, s);
    }
    for (let i = 0; i < 14; i++) {
      gctx.strokeStyle = `rgba(80,66,50,${0.02 + grnd() * 0.03})`;
      gctx.lineWidth = 0.7;
      gctx.beginPath();
      const y = grnd() * 256;
      gctx.moveTo(0, y);
      gctx.bezierCurveTo(80, y + grnd() * 20 - 10, 170, y + grnd() * 20 - 10, 256, y);
      gctx.stroke();
    }
    const groundTex = new THREE.CanvasTexture(gc);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(240, 240);
    groundTex.colorSpace = THREE.SRGBColorSpace;
    const detail = new THREE.Mesh(
      new THREE.PlaneGeometry(2600, 2600),
      new THREE.MeshBasicMaterial({ map: groundTex, transparent: true, opacity: 0.85, depthWrite: false })
    );
    detail.rotation.x = -Math.PI / 2;
    detail.position.y = 0.041;
    detail.name = 'dettaglio-suolo';
    this.scene.add(detail);
    }
  }

  _buildAreas() {
    const buckets = new Map();
    const waterBuckets = new Map();
    const greenKinds = new Set(['park', 'grass', 'forest', 'sport']);
    const areaStart = this.blockMeshes.length;
    for (const a of this.city.areas) {
      const info = this.arnisAreas[String(a.id)];
      // Le aree di zonizzazione urbana non sono una superficie: la mappa
      // dei blocchi Arnis mostra già piazze, marciapiedi e cortili reali.
      if (a.kind === 'urban' && this.arnisSurfaceImage) continue;
      const y = a.kind === 'water' ? 0.018 : greenKinds.has(a.kind) ? 0.034 : 0.032;
      const g = makePolygonGeometry(a.poly, y + (hashString(String(a.id)) % 5) * 0.0003, '#ffffff');
      if (!g) continue;
      if (a.kind === 'water') {
        this.addMaterialGeometry(waterBuckets, a.blocks?.surface || 'water', g);
        continue;
      }
      const fallback = AREA_BLOCK_FALLBACK[a.kind] || 'grass_block';
      const block = usableSurfaceBlock(a.blocks?.surface || info?.surface, fallback);
      this.addMaterialGeometry(buckets, block, g);
    }
    this.flushMaterialBuckets(buckets, {
      name: 'aree',
      castShadow: false,
      receiveShadow: true
    });
    this.areaMeshes = this.blockMeshes.slice(areaStart);
    this.areaMesh = this.areaMeshes[0] || null;
    this.piazzaMesh = this.areaMeshes.find(mesh => mesh.userData.arnisBlock?.includes('stone_brick')) || null;

    if (waterBuckets.size) {
      const waterStart = this.blockMeshes.length;
      this.flushMaterialBuckets(waterBuckets, {
        name: 'acqua',
        castShadow: false,
        receiveShadow: true,
        side: THREE.DoubleSide
      });
      for (const mesh of this.blockMeshes.slice(waterStart)) {
        if (mesh.userData.arnisBlock === 'water') {
          this.waterMesh = mesh;
          this.waterMaterial = mesh.material;
        }
      }
    }

    // Corsi d'acqua lineari
    const lineBuckets = new Map();
    const bankBuckets = new Map();
    for (const w of this.city.waterways) {
      const width = Number(w.w) || (w.kind === 'river' ? 9.5 : w.kind === 'stream' ? 5.6 : w.kind === 'canal' ? 4 : 2.2);
      const bank = makeRibbon(w.pts, width + 3.2, 0.022, '#ffffff');
      if (bank) this.addMaterialGeometry(bankBuckets, w.blocks?.bank || this.arnisWater.bank || 'clay', bank);
      const waterLine = makeRibbon(w.pts, width, 0.028, '#ffffff');
      if (waterLine) this.addMaterialGeometry(lineBuckets, w.blocks?.surface || 'water', waterLine);
    }
    this.flushMaterialBuckets(bankBuckets, {
      name: 'argini',
      castShadow: false,
      receiveShadow: true
    });
    if (lineBuckets.size) {
      const lineStart = this.blockMeshes.length;
      this.flushMaterialBuckets(lineBuckets, {
        name: 'stirone',
        castShadow: false,
        receiveShadow: true,
        side: THREE.DoubleSide
      });
      for (const mesh of this.blockMeshes.slice(lineStart)) {
        if (mesh.userData.arnisBlock === 'water') this.waterMaterial = this.waterMaterial || mesh.material;
      }
    }

    // Paving delle piazze: una griglia sottile disegnata sopra la piazza.
    const pavingPoints = [];
    for (const a of this.city.areas) {
      if (a.kind !== 'square' || a.area < 400) continue;
      const b = polygonBounds(a.poly);
      const step = 4.0;
      let count = 0;
      for (let x = Math.ceil(b.minX / step) * step; x < b.maxX; x += step) {
        for (let z = Math.ceil(b.minZ / step) * step; z < b.maxZ; z += step) {
          if (count > 520) break;
          if (!pointInPoly(x, z, a.poly)) continue;
          if (pointInPoly(Math.min(x + step * 0.78, b.maxX), z, a.poly)) {
            pavingPoints.push(x, 0.037, z, Math.min(x + step * 0.78, b.maxX), 0.037, z);
            count++;
          }
          if (pointInPoly(x, Math.min(z + step * 0.78, b.maxZ), a.poly)) {
            pavingPoints.push(x, 0.037, z, x, 0.037, Math.min(z + step * 0.78, b.maxZ));
            count++;
          }
        }
      }
    }
    if (pavingPoints.length) {
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute(pavingPoints, 3));
      const pl = new THREE.LineSegments(pg, new THREE.LineBasicMaterial({ color: '#c5b294', transparent: true, opacity: 0.55 }));
      pl.name = 'pavimentazione';
      this.scene.add(pl);
    }
  }

  _texture(key, draw, size = 128) {
    if (this.textureCache[key]) return this.textureCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    draw(ctx, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    this.textureCache[key] = tex;
    return tex;
  }

  _normalTexture(key, texture, strength = 1.5) {
    const cacheKey = `normal:${key}`;
    if (this.textureCache[cacheKey]) return this.textureCache[cacheKey];
    const image = texture?.image;
    if (!image?.getContext || !image.width || !image.height) return null;
    const width = image.width;
    const height = image.height;
    const sourceCtx = image.getContext('2d', { willReadFrequently: true });
    let pixels;
    try {
      pixels = sourceCtx.getImageData(0, 0, width, height).data;
    } catch {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const out = ctx.createImageData(width, height);
    const luminance = (x, y) => {
      const index = ((((y + height) % height) * width) + ((x + width) % width)) * 4;
      return (pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) / 255;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (luminance(x + 1, y) - luminance(x - 1, y)) * strength * 4;
        const dy = (luminance(x, y + 1) - luminance(x, y - 1)) * strength * 4;
        const length = Math.hypot(dx, dy, 1);
        const index = (y * width + x) * 4;
        out.data[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
        out.data[index + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
        out.data[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
        out.data[index + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    const normal = new THREE.CanvasTexture(canvas);
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.copy(texture.repeat);
    normal.colorSpace = THREE.NoColorSpace;
    normal.anisotropy = texture.anisotropy || 1;
    this.textureCache[cacheKey] = normal;
    return normal;
  }

  _waterNormalTexture() {
    const cacheKey = 'water-normal';
    if (this.textureCache[cacheKey]) return this.textureCache[cacheKey];
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const out = ctx.createImageData(size, size);
    const tau = Math.PI * 2;
    const wave = (x, y) => Math.sin(tau * (3 * x + y) / size) +
      0.6 * Math.sin(tau * (2 * y - 4 * x) / size) +
      0.35 * Math.sin(tau * 5 * (x + y) / size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (wave(x + 1, y) - wave(x - 1, y)) * 1.4;
        const dy = (wave(x, y + 1) - wave(x, y - 1)) * 1.4;
        const length = Math.hypot(dx, dy, 1);
        const index = (y * size + x) * 4;
        out.data[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
        out.data[index + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
        out.data[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
        out.data[index + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = Math.min(8, this.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    this.textureCache[cacheKey] = texture;
    return texture;
  }

  _asphaltTexture() {
    return this._texture('asphalt', (ctx, size) => {
      ctx.fillStyle = '#c3c6c1';
      ctx.fillRect(0, 0, size, size);
      const rnd = seededRandom(511);
      for (let i = 0; i < 6200; i++) {
        const v = 130 + Math.floor(rnd() * 105);
        ctx.fillStyle = `rgba(${v},${v + 2},${v - 1},${0.22 + rnd() * 0.48})`;
        ctx.fillRect(rnd() * size, rnd() * size, 1 + (rnd() > 0.86 ? 1 : 0), 1);
      }
      // rattoppi e macchie d'olio
      for (let i = 0; i < 9; i++) {
        const x = rnd() * size, y = rnd() * size;
        ctx.fillStyle = `rgba(70,72,69,${0.05 + rnd() * 0.09})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 7 + rnd() * 22, 4 + rnd() * 10, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      // crepe e giunti
      ctx.strokeStyle = 'rgba(82,84,81,.24)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        let x = rnd() * size, y = rnd() * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          x += (rnd() - 0.5) * 18;
          y += 5 + rnd() * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(95,96,90,.18)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, rnd() * size);
        ctx.lineTo(size, rnd() * size);
        ctx.stroke();
      }
    });
  }

  _pavingTexture() {
    return this._texture('paving', (ctx, size) => {
      ctx.fillStyle = '#d8ccb8';
      ctx.fillRect(0, 0, size, size);
      const rnd = seededRandom(821);
      const slabW = 64, slabH = 32;
      for (let y = 0; y < size; y += slabH) {
        for (let x = 0; x < size; x += slabW) {
          const v = 190 + Math.floor(rnd() * 42);
          ctx.fillStyle = `rgb(${v},${v - 8},${v - 22})`;
          ctx.fillRect(x + 1, y + 1, slabW - 2, slabH - 2);
          if (rnd() > 0.75) {
            ctx.fillStyle = 'rgba(120,104,82,.08)';
            ctx.fillRect(x + 6, y + 5, slabW - 16, slabH - 12);
          }
        }
      }
      ctx.strokeStyle = 'rgba(116,103,84,.34)';
      ctx.lineWidth = 1.2;
      for (let y = 0; y <= size; y += slabH) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
      for (let y = 0; y < size; y += slabH) {
        const shift = (Math.floor(y / slabH) % 2) * (slabW / 2);
        for (let x = shift; x <= size; x += slabW) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + slabH); ctx.stroke();
        }
      }
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = `rgba(120,108,90,${0.02 + rnd() * 0.06})`;
        ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 1);
      }
    }, 256);
  }

  _piazzaTexture() {
    return this._texture('piazza', (ctx, size) => {
      ctx.fillStyle = '#d9c9ad';
      ctx.fillRect(0, 0, size, size);
      const rnd = seededRandom(622);
      const slab = 64;
      for (let y = 0; y < size; y += slab) {
        for (let x = 0; x < size; x += slab) {
          const v = 194 + Math.floor(rnd() * 34);
          ctx.fillStyle = `rgb(${v},${v - 12},${v - 30})`;
          ctx.fillRect(x + 2, y + 2, slab - 4, slab - 4);
          if (rnd() > 0.68) {
            ctx.strokeStyle = 'rgba(140,120,92,.16)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 8, y + 8, slab - 16, slab - 16);
          }
        }
      }
      ctx.strokeStyle = 'rgba(130,112,86,.3)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= size; i += slab) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
      }
      for (let i = 0; i < 1200; i++) {
        ctx.fillStyle = `rgba(150,130,100,${0.015 + rnd() * 0.04})`;
        ctx.fillRect(rnd() * size, rnd() * size, 2, 1);
      }
    }, 256);
  }

  _concreteTexture() {
    return this._texture('concrete', (ctx, size) => {
      ctx.fillStyle = '#ded8c9';
      ctx.fillRect(0, 0, size, size);
      const rnd = seededRandom(733);
      for (let i = 0; i < 1800; i++) {
        const v = 185 + Math.floor(rnd() * 55);
        ctx.fillStyle = `rgba(${v},${v - 3},${v - 10},.32)`;
        ctx.fillRect(rnd() * size, rnd() * size, 2, 1);
      }
      ctx.strokeStyle = 'rgba(120,112,96,.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= size; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
      }
      for (let y = 0; y <= size; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
    });
  }

  _roofTexture() {
    return this._texture('roof', (ctx, size) => {
      ctx.fillStyle = '#ead0b8';
      ctx.fillRect(0, 0, size, size);
      const rnd = seededRandom(912);
      for (let row = 0; row < 8; row++) {
        const y = row * 16;
        ctx.fillStyle = row % 2 ? 'rgba(155,80,58,.14)' : 'rgba(255,235,210,.14)';
        ctx.fillRect(0, y, size, 15);
        ctx.strokeStyle = 'rgba(125,62,45,.32)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y + 15.5); ctx.lineTo(size, y + 15.5); ctx.stroke();
        for (let x = (row % 2) * 8; x < size; x += 16) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 15); ctx.stroke();
        }
      }
      for (let i = 0; i < 450; i++) {
        ctx.fillStyle = `rgba(${120 + Math.floor(rnd() * 40)},${70 + Math.floor(rnd() * 30)},55,.12)`;
        ctx.fillRect(rnd() * size, rnd() * size, 2, 2);
      }
    });
  }

  _grassTexture() {
    return this._texture('grass', (ctx, size) => {
      ctx.fillStyle = '#e6efd8';
      ctx.fillRect(0, 0, size, size);
      const rnd = seededRandom(144);
      for (let i = 0; i < 2600; i++) {
        const g = 150 + Math.floor(rnd() * 80);
        ctx.strokeStyle = `rgba(${90 + Math.floor(rnd() * 40)},${g},${70 + Math.floor(rnd() * 30)},.28)`;
        ctx.lineWidth = 1;
        const x = rnd() * size, y = rnd() * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 3, y - 2 - rnd() * 3);
        ctx.stroke();
      }
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = `rgba(255,255,240,${0.08 + rnd() * 0.12})`;
        ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
      }
    });
  }

  _districtPavingColor(x, z) {
    const district = this.getDistrictAt(x, z);
    const colors = {
      centro: '#b58f74',
      monica: '#c2b49c',
      sanlazzaro: '#b9b09a',
      azalee: '#c4a89a',
      corea: '#c0ae92',
      luce: '#b5b19b'
    };
    return colors[district?.id] || '#b9ac96';
  }

  _buildRoads() {
    const roadBuckets = new Map();
    const sidewalkBuckets = new Map();
    const roadDetailBuckets = new Map();
    const curbGeoms = [];
    const markGeoms = [];
    const edgePositions = [];
    const manholeGeoms = [];
    const wearGeoms = [];
    const puddleGeoms = [];
    const labels = [];
    const rnd = seededRandom(19);
    const roadStart = this.blockMeshes.length;
    const pedestrianKinds = new Set(['pedestrian', 'footway', 'living_street', 'path', 'cycleway', 'track', 'steps']);
    for (const r of this.city.roads) {
      if (r.tunnel) continue;
      const style = ROAD_STYLE[r.kind] || ROAD_STYLE.residential;
      const info = this.arnisRoads[String(r.id)];
      const roadSeed = hashString(String(r.id));
      const surfaceBlock = roadSurfaceBlock({
        kind: r.kind,
        source: info?.surface,
        override: r.blocks?.surface,
        seed: roadSeed
      });
      const sideBlock = sidewalkBlock({
        kind: r.kind,
        source: info?.side,
        override: r.blocks?.side,
        seed: roadSeed
      });
      const baseY = 0.085 + (hashString(String(r.id)) % 9) * 0.0007;
      const isBridge = r.bridge;
      const y = baseY + (isBridge ? 0.38 : 0);
      const pedestrian = pedestrianKinds.has(r.kind);
      const hasSidewalk = r.sidewalk === true || (r.sidewalk == null && style.sidewalk);
      if (!pedestrian && hasSidewalk && r.w >= 4.5) {
        const sidewalkY = y + (this.quality === 'low' ? 0.08 : 0.18);
        const curbHeight = sidewalkY - y + 0.02;
        const curbBlock = hashString(String(r.id)) % 2 ? 'smooth_stone' : 'andesite';
        for (const side of [-1, 1]) {
          const sw = makeSideRibbon(r.pts, r.w, 1.35, side, sidewalkY, '#ffffff');
          if (sw) this.addMaterialGeometry(sidewalkBuckets, sideBlock, sw);
          // Cordolo 3D a moduli da 1 m: la strada non è più un nastro piatto.
          for (let i = 1; i < r.pts.length; i++) {
            const [ax, az] = r.pts[i - 1];
            const [bx, bz] = r.pts[i];
            const dx = bx - ax;
            const dz = bz - az;
            const len = Math.hypot(dx, dz);
            if (len < 0.5) continue;
            const ux = dx / len;
            const uz = dz / len;
            const nx = -uz;
            const nz = ux;
            const angle = Math.atan2(ux, uz);
            const offset = side * (r.w / 2 + 0.09);
            this.addMaterialGeometry(
              roadDetailBuckets,
              curbBlock,
              voxelBox(0.18, curbHeight, len + 0.04, (ax + bx) / 2 + nx * offset, y + curbHeight / 2, (az + bz) / 2 + nz * offset, angle)
            );
            // Bordo esterno del marciapiede, per non lasciarlo sospeso.
            const outerOffset = side * (r.w / 2 + 1.44);
            this.addMaterialGeometry(
              roadDetailBuckets,
              curbBlock,
              voxelBox(0.16, curbHeight, len + 0.04, (ax + bx) / 2 + nx * outerOffset, y + curbHeight / 2, (az + bz) / 2 + nz * outerOffset, angle)
            );
          }
          // Angoli smussati a blocchi da 1 m.
          if (this.quality !== 'low') {
            for (let i = 1; i < r.pts.length - 1; i++) {
              const [px, pz] = r.pts[i - 1];
              const [vx, vz] = r.pts[i];
              const [nx2, nz2] = r.pts[i + 1];
              const ax = vx - px;
              const az = vz - pz;
              const bx = nx2 - vx;
              const bz = nz2 - vz;
              const la = Math.hypot(ax, az) || 1;
              const lb = Math.hypot(bx, bz) || 1;
              const turn = Math.abs(Math.atan2(ax * bz - az * bx, ax * bx + az * bz));
              if (turn < 0.22) continue;
              const n1x = -az / la;
              const n1z = ax / la;
              const n2x = -bz / lb;
              const n2z = bx / lb;
              let cx = n1x + n2x;
              let cz = n1z + n2z;
              const cl = Math.hypot(cx, cz) || 1;
              cx /= cl;
              cz /= cl;
              const off = side * (r.w / 2 + 0.42);
              this.addMaterialGeometry(
                roadDetailBuckets,
                curbBlock,
                voxelBox(0.82, curbHeight, 0.82, vx + cx * off, y + curbHeight / 2, vz + cz * off)
              );
            }
          }
        }
      }
      if (pedestrian) {
        const paving = makeRibbon(r.pts, r.w, y, '#ffffff');
        if (paving) this.addMaterialGeometry(roadBuckets, surfaceBlock, paving);
        continue;
      }
      const road = makeRibbon(r.pts, r.w, y, '#ffffff');
      if (road) this.addMaterialGeometry(roadBuckets, surfaceBlock, road);
      if (this.quality === 'high' && r.length > 12) {
        const patches = Math.min(4, Math.floor(r.length / 28));
        for (let p = 0; p < patches; p++) {
          if (rnd() > 0.55) continue;
          const i = 1 + Math.floor(rnd() * Math.max(1, r.pts.length - 1));
          const [ax, az] = r.pts[i - 1];
          const [bx, bz] = r.pts[i];
          const t = rnd();
          const x = ax + (bx - ax) * t + (rnd() - 0.5) * r.w * 0.5;
          const z = az + (bz - az) * t + (rnd() - 0.5) * r.w * 0.5;
          const dx = bx - ax;
          const dz = bz - az;
          const len = Math.hypot(dx, dz) || 1;
          const angle = Math.atan2(dx / len, dz / len);
          const block = ['cobblestone', 'andesite', 'gray_concrete_powder'][Math.floor(rnd() * 3)];
          this.addMaterialGeometry(roadDetailBuckets, block, voxelBox(1.1, 0.035, 1.1, x, y + 0.014, z, angle));
        }
      }
      if (this.quality === 'high' && ['primary', 'secondary', 'tertiary'].includes(r.kind) && r.length > 30) {
        for (let i = 1; i < r.pts.length; i++) {
          const [ax, az] = r.pts[i - 1];
          const [bx, bz] = r.pts[i];
          const dx = bx - ax;
          const dz = bz - az;
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          const ux = dx / len;
          const uz = dz / len;
          const nx = -uz;
          const nz = ux;
          const angle = Math.atan2(ux, uz);
          for (let d = 18 + rnd() * 12; d < len; d += 34 + rnd() * 18) {
            const side = rnd() > 0.5 ? 1 : -1;
            const off = side * (r.w / 2 - 0.3);
            this.addMaterialGeometry(
              roadDetailBuckets,
              'iron_block',
              voxelBox(0.52, 0.045, 0.32, ax + ux * d + nx * off, y + 0.022, az + uz * d + nz * off, angle)
            );
          }
        }
      }
      if (['primary', 'secondary', 'tertiary'].includes(r.kind) && r.w >= 7) {
        // linea tratteggiata centrale
        for (let i = 1; i < r.pts.length; i++) {
          const [ax, az] = r.pts[i - 1];
          const [bx, bz] = r.pts[i];
          const dx = bx - ax, dz = bz - az;
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          const ux = dx / len, uz = dz / len;
          const nx = -uz, nz = ux;
          for (let d = 6; d < len - 3; d += 11) {
            const cx = ax + ux * d, cz = az + uz * d;
            const halfL = 2.2, halfW = 0.08;
            const p1x = cx - ux * halfL, p1z = cz - uz * halfL;
            const p2x = cx + ux * halfL, p2z = cz + uz * halfL;
            const q1x = p1x + nx * halfW, q1z = p1z + nz * halfW;
            const q2x = p1x - nx * halfW, q2z = p1z - nz * halfW;
            const q3x = p2x + nx * halfW, q3z = p2z + nz * halfW;
            const q4x = p2x - nx * halfW, q4z = p2z - nz * halfW;
            const pos = [];
            addQuad(pos, q1x, y + 0.008, q1z, q2x, y + 0.008, q2z, q3x, y + 0.008, q3z, q4x, y + 0.008, q4z);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            const n = new Float32Array(pos.length);
            for (let k = 1; k < n.length; k += 3) n[k] = 1;
            g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
            markGeoms.push(paintGeometry(g, '#e8ddc4'));
          }
        }
      }
      if (['primary', 'secondary', 'tertiary'].includes(r.kind) && r.w >= 6) {
        for (let i = 1; i < r.pts.length; i++) {
          const [ax, az] = r.pts[i - 1];
          const [bx, bz] = r.pts[i];
          const dx = bx - ax, dz = bz - az;
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          const ux = dx / len, uz = dz / len;
          const nx = -uz, nz = ux;
          for (const side of [-1, 1]) {
            const off = side * (r.w / 2 - 0.36);
            const cx1 = ax + nx * off, cz1 = az + nz * off;
            const cx2 = bx + nx * off, cz2 = bz + nz * off;
            const hw = 0.055;
            addQuad(edgePositions,
              cx1 + nx * hw, y + 0.009, cz1 + nz * hw,
              cx1 - nx * hw, y + 0.009, cz1 - nz * hw,
              cx2 - nx * hw, y + 0.009, cz2 - nz * hw,
              cx2 + nx * hw, y + 0.009, cz2 + nz * hw);
          }
          if (this.quality !== 'low' && r.length > 80) {
            for (let d = 28 + rnd() * 40; d < len; d += 82) {
              const cx = ax + ux * d, cz = az + uz * d;
              const circle = new THREE.CircleGeometry(0.34, 10);
              circle.rotateX(-Math.PI / 2);
              circle.translate(cx, y + 0.012, cz);
              manholeGeoms.push(circle);
            }
          }
          if (this.quality === 'high' && r.length > 18 && r.w >= 4.5 && !pedestrian) {
            for (let d = 10 + rnd() * 26; d < len; d += 46 + rnd() * 30) {
              const cx = ax + ux * d + nx * (rnd() - 0.5) * r.w * 0.68;
              const cz = az + uz * d + nz * (rnd() - 0.5) * r.w * 0.68;
              if (rnd() < 0.6) {
                const patch = new THREE.CircleGeometry(0.35 + rnd() * 0.85, 7);
                patch.scale(1.25 + rnd() * 0.9, 0.65 + rnd() * 0.45, 1);
                patch.rotateX(-Math.PI / 2);
                patch.translate(cx, y + 0.007, cz);
                wearGeoms.push(paintGeometry(patch, '#343936'));
              }
              if (rnd() < 0.46) {
                const puddle = new THREE.CircleGeometry(0.45 + rnd() * 1.2, 9);
                puddle.scale(1.35 + rnd() * 1.1, 0.55 + rnd() * 0.5, 1);
                puddle.rotateX(-Math.PI / 2);
                puddle.translate(cx, y + 0.006, cz);
                puddleGeoms.push(puddle);
              }
            }
          }
        }
      }
      if (r.name && r.length > 140 && labels.length < 9 && ['primary', 'secondary', 'tertiary'].includes(r.kind)) {
        const mid = r.pts[Math.floor(r.pts.length / 2)];
        labels.push({ text: r.name.toUpperCase(), x: mid[0], z: mid[1] });
      }
    }
    if (edgePositions.length) {
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
      eg.computeVertexNormals();
      markGeoms.push(paintGeometry(eg, '#d9d3c2'));
    }
    this.flushMaterialBuckets(roadBuckets, {
      name: 'strade',
      castShadow: false,
      receiveShadow: true
    });
    this.roadMeshes = this.blockMeshes.slice(roadStart);
    this.roadMaterial = this.roadMeshes[0]?.material || null;
    this.flushMaterialBuckets(sidewalkBuckets, {
      name: 'marciapiedi',
      castShadow: false,
      receiveShadow: true
    });
    this.flushMaterialBuckets(roadDetailBuckets, {
      name: 'dettagli-strade',
      castShadow: false,
      receiveShadow: true,
      uvSize: DETAIL_SIZE
    });
    const markBuckets = new Map();
    if (markGeoms.length) {
      const marks = mergeClean(markGeoms);
      if (marks) this.addMaterialGeometry(markBuckets, 'white_concrete', marks);
    }
    if (markBuckets.size) {
      this.flushMaterialBuckets(markBuckets, {
        name: 'segnaletica',
        castShadow: false,
        receiveShadow: false,
        side: THREE.DoubleSide
      });
    }
    if (manholeGeoms.length) {
      const manholes = mergeClean(manholeGeoms);
      if (manholes) {
        const mesh = new THREE.Mesh(manholes, this.blockMaterial('iron_block'));
        mesh.name = 'tombini';
        this.scene.add(mesh);
      }
    }
    const wear = mergeClean(wearGeoms);
    if (wear) {
      const m = new THREE.Mesh(wear, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false }));
      m.name = 'usura-strade';
      this.scene.add(m);
    }
    if (puddleGeoms.length) {
      const puddles = mergeClean(puddleGeoms);
      this.puddleMaterial = new THREE.MeshBasicMaterial({ color: '#9fbec9', transparent: true, opacity: 0, depthWrite: false });
      this.puddleMesh = new THREE.Mesh(puddles, this.puddleMaterial);
      this.puddleMesh.name = 'pozzanghere';
      this.puddleMesh.visible = false;
      this.scene.add(this.puddleMesh);
    }
    for (const l of labels) {
      const sp = makeTextSprite(l.text, { scale: 0.86, fontSize: 38, pad: 18, bg: 'rgba(244,235,218,.78)', color: '#334036' });
      sp.position.set(l.x, 5.4, l.z);
      this.scene.add(sp);
    }
  }


  _nearestRoadInfo(x, z) {
    let best = null;
    for (const r of this.city.roads) {
      for (let i = 1; i < r.pts.length; i++) {
        const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i];
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 0.5) continue;
        const ux = dx / len, uz = dz / len;
        const t = clamp(((x - ax) * dx + (z - az) * dz) / (len * len), 0, 1);
        const px = ax + dx * t, pz = az + dz * t;
        const d = Math.hypot(x - px, z - pz);
        if (!best || d < best.d) best = { x: px, z: pz, ux, uz, w: r.w, kind: r.kind, d };
      }
    }
    return best;
  }

  _buildTrafficFurniture() {
    // Attraversamenti pedonali
    const positions = [];
    for (const c of this.city.crossings || []) {
      const info = this._nearestRoadInfo(c.x, c.z);
      if (!info || info.d > 25) continue;
      const nx = -info.uz, nz = info.ux;
      const halfRoad = Math.min(9, info.w / 2);
      for (let i = -2; i <= 2; i++) {
        const cx = info.x + info.ux * i * 0.95, cz = info.z + info.uz * i * 0.95;
        const lx = cx + nx * halfRoad, lz = cz + nz * halfRoad;
        const rx = cx - nx * halfRoad, rz = cz - nz * halfRoad;
        const ex = info.ux * 0.22, ez = info.uz * 0.22;
        addQuad(positions,
          lx - ex, 0.101, lz - ez,
          rx - ex, 0.101, rz - ez,
          rx + ex, 0.101, rz + ez,
          lx + ex, 0.101, lz + ez);
      }
      if (this.quality !== 'low') {
        for (const side of [-1, 1]) {
          const sx = info.x + info.ux * side * 4.3;
          const sz = info.z + info.uz * side * 4.3;
          const thick = 0.28;
          addQuad(positions,
            sx + nx * halfRoad - info.ux * thick, 0.102, sz + nz * halfRoad - info.uz * thick,
            sx - nx * halfRoad - info.ux * thick, 0.102, sz - nz * halfRoad - info.uz * thick,
            sx - nx * halfRoad + info.ux * thick, 0.102, sz - nz * halfRoad + info.uz * thick,
            sx + nx * halfRoad + info.ux * thick, 0.102, sz + nz * halfRoad + info.uz * thick);
        }
      }
    }
    if (positions.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#e8ddc4' }));
      m.name = 'attraversamenti';
      this.scene.add(m);
    }

    // Semafori
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.13, 4.2, 7);
    poleGeo.translate(0, 2.1, 0);
    const poleMat = new THREE.MeshLambertMaterial({ color: '#2f3632' });
    for (let i = 0; i < (this.city.trafficSignals || []).length; i++) {
      const sig = this.city.trafficSignals[i];
      const info = this._nearestRoadInfo(sig.x, sig.z);
      if (!info) continue;
      const nx = -info.uz, nz = info.ux;
      const group = new THREE.Group();
      group.position.set(info.x + nx * (info.w / 2 + 1.25), 0, info.z + nz * (info.w / 2 + 1.25));
      group.rotation.y = Math.atan2(info.ux, info.uz);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.castShadow = true;
      group.add(pole);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.15, 0.3), new THREE.MeshLambertMaterial({ color: '#1d241f' }));
      box.position.set(0, 4.15, 0.08);
      box.castShadow = true;
      group.add(box);
      const mats = {
        red: new THREE.MeshBasicMaterial({ color: '#4d1f1a' }),
        yellow: new THREE.MeshBasicMaterial({ color: '#4d421a' }),
        green: new THREE.MeshBasicMaterial({ color: '#1d4d2a' })
      };
      const lights = {};
      ['red', 'yellow', 'green'].forEach((name, k) => {
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats[name]);
        light.position.set(0, 4.52 - k * 0.33, 0.25);
        group.add(light);
        lights[name] = light;
      });
      this.scene.add(group);
      this.trafficLights.push({ group, lights, phase: (i * 2.7) % 12 });
    }

    this._buildCrossingWalkers();
  }

  _buildCrossingWalkers() {
    const rnd = seededRandom(311);
    const candidates = [];
    for (const crossing of this.city.crossings || []) {
      const info = this._nearestRoadInfo(crossing.x, crossing.z);
      if (!info || info.d > 18) continue;
      let signal = null;
      let best = 38;
      for (const light of this.trafficLights) {
        const d = Math.hypot(light.group.position.x - info.x, light.group.position.z - info.z);
        if (d < best) { best = d; signal = light; }
      }
      if (!signal) continue;
      const nx = -info.uz;
      const nz = info.ux;
      const half = Math.min(8, info.w / 2) + 1.7;
      candidates.push({ info, signal, nx, nz, half });
    }
    const chosen = candidates.slice(0, this.quality === 'low' ? 4 : this.quality === 'medium' ? 6 : 8);
    const shirts = ['#c2684b', '#4f8fa8', '#7c8d5b', '#d9c9a8', '#9a4a34'];
    for (const c of chosen) {
      const person = makePerson({
        shirt: shirts[Math.floor(rnd() * shirts.length)],
        pants: '#3a3f46',
        skin: '#d8aa85',
        hair: '#3a2a20'
      });
      const side = rnd() > 0.5 ? 1 : 0;
      const dir = side === 0 ? 1 : -1;
      const crossing = {
        person, ...c,
        t: side,
        target: side === 0 ? 1 : 0,
        state: 'waiting',
        wait: 0.6 + rnd() * 3,
        speed: 1.15 + rnd() * 0.35,
        phase: rnd() * Math.PI * 2,
        dir
      };
      this.scene.add(person);
      this.crossingWalkers.push(crossing);
    }
  }

  _signalState(light, time) {
    const t = (time + light.phase) % 12;
    if (t < 5.4) return 'green';
    if (t < 6.6) return 'yellow';
    return 'red';
  }

  _updateTrafficLights() {
    for (const l of this.trafficLights) {
      const state = this._signalState(l, this.time);
      l.lights.red.material.color.set(state === 'red' ? '#ff5a4e' : '#4d1f1a');
      l.lights.yellow.material.color.set(state === 'yellow' ? '#ffd75e' : '#4d421a');
      l.lights.green.material.color.set(state === 'green' ? '#54e08a' : '#1d4d2a');
    }
  }

  _buildRailways() {
    const bedGeoms = [];
    const railGeoms = [];
    for (const r of this.city.railways) {
      const bedWidth = Math.max(3.4, (Number(r.w) || 0) + 1.4);
      const bed = makeRibbon(r.pts, bedWidth, 0.07, '#6c6d66');
      if (bed) bedGeoms.push(bed);
      // due rotaie offsettate
      const left = [], right = [];
      for (let i = 0; i < r.pts.length; i++) {
        const [x, z] = r.pts[i];
        let nx = 0, nz = 0;
        if (i === 0) {
          const dx = r.pts[1][0] - x, dz = r.pts[1][1] - z;
          const l = Math.hypot(dx, dz) || 1; nx = -dz / l; nz = dx / l;
        } else if (i === r.pts.length - 1) {
          const dx = x - r.pts[i - 1][0], dz = z - r.pts[i - 1][1];
          const l = Math.hypot(dx, dz) || 1; nx = -dz / l; nz = dx / l;
        } else {
          const d1x = x - r.pts[i - 1][0], d1z = z - r.pts[i - 1][1];
          const d2x = r.pts[i + 1][0] - x, d2z = r.pts[i + 1][1] - z;
          const l1 = Math.hypot(d1x, d1z) || 1, l2 = Math.hypot(d2x, d2z) || 1;
          const n1x = -d1z / l1, n1z = d1x / l1, n2x = -d2z / l2, n2z = d2x / l2;
          let mx = n1x + n2x, mz = n1z + n2z;
          const ml = Math.hypot(mx, mz);
          if (ml < 1e-6) { mx = n1x; mz = n1z; } else { mx /= ml; mz /= ml; }
          const dot = Math.max(0.4, mx * n1x + mz * n1z);
          nx = mx / dot; nz = mz / dot;
        }
        left.push([x + nx * 0.72, z + nz * 0.72]);
        right.push([x - nx * 0.72, z - nz * 0.72]);
      }
      for (const path of [left, right]) {
        const g = makeRibbon(path, 0.11, 0.13, '#b9b4a8');
        if (g) railGeoms.push(g);
      }
    }
    const bed = mergeClean(bedGeoms);
    if (bed) {
      const m = new THREE.Mesh(bed, new THREE.MeshLambertMaterial({ vertexColors: true }));
      m.receiveShadow = true;
      this.scene.add(m);
    }
    const rails = mergeClean(railGeoms);
    if (rails) {
      const m = new THREE.Mesh(rails, new THREE.MeshLambertMaterial({ vertexColors: true }));
      this.scene.add(m);
    }
  }

  _buildLevelCrossings() {
    const roadKinds = new Set([
      'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
      'unclassified', 'residential', 'living_street', 'service', 'track'
    ]);
    const hits = [];
    for (const rail of this.city.railways || []) {
      if (!rail.pts || rail.pts.length < 2) continue;
      for (let i = 1; i < rail.pts.length; i++) {
        const [ax, az] = rail.pts[i - 1];
        const [bx, bz] = rail.pts[i];
        const rdx = bx - ax, rdz = bz - az;
        if (Math.abs(rdx) + Math.abs(rdz) < 1) continue;
        const minX = Math.min(ax, bx) - 1.5, maxX = Math.max(ax, bx) + 1.5;
        const minZ = Math.min(az, bz) - 1.5, maxZ = Math.max(az, bz) + 1.5;
        for (const road of this.city.roads || []) {
          if (!roadKinds.has(road.kind) || (road.layer ?? 0) !== 0) continue;
          for (let j = 1; j < road.pts.length; j++) {
            const [cx, cz] = road.pts[j - 1];
            const [dx, dz] = road.pts[j];
            if (Math.max(cx, dx) < minX || Math.min(cx, dx) > maxX ||
                Math.max(cz, dz) < minZ || Math.min(cz, dz) > maxZ) continue;
            const sx = dx - cx, sz = dz - cz;
            const den = rdx * sz - rdz * sx;
            if (Math.abs(den) < 1e-9) continue;
            const t = ((cx - ax) * sz - (cz - az) * sx) / den;
            const u = ((cx - ax) * rdz - (cz - az) * rdx) / den;
            if (t < 0 || t > 1 || u < 0 || u > 1) continue;
            hits.push({
              x: ax + rdx * t,
              z: az + rdz * t,
              rdx,
              rdz,
              roadW: clamp(Number(road.w) || 5, 4.2, 11),
              road: road.name || road.kind
            });
          }
        }
      }
    }
    if (!hits.length) return;
    const clusters = [];
    for (const hit of hits) {
      let cluster = clusters.find(c => Math.hypot(c.x - hit.x, c.z - hit.z) < 26);
      if (!cluster) {
        cluster = { x: hit.x, z: hit.z, rdx: hit.rdx, rdz: hit.rdz, roadW: hit.roadW, road: hit.road, n: 0 };
        clusters.push(cluster);
      }
      const n = cluster.n + 1;
      cluster.x = (cluster.x * cluster.n + hit.x) / n;
      cluster.z = (cluster.z * cluster.n + hit.z) / n;
      cluster.n = n;
      cluster.roadW = Math.max(cluster.roadW, hit.roadW);
    }
    const limit = this.quality === 'low' ? 4 : this.quality === 'medium' ? 6 : 8;
    for (const cluster of clusters.slice(0, limit)) this._buildLevelCrossing(cluster);
  }

  _buildLevelCrossing(cluster) {
    const { x, z, rdx, rdz, roadW } = cluster;
    const angle = Math.atan2(rdx, rdz);
    const y = groundHeightAt(this.terrain, x, z, 0);
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = angle;

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.09, roadW + 1.8),
      new THREE.MeshLambertMaterial({ color: '#5f5b52' })
    );
    deck.position.y = 0.05;
    deck.receiveShadow = true;
    group.add(deck);
    for (const x of [-1.55, 0, 1.55]) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.025, roadW + 1.65),
        new THREE.MeshLambertMaterial({ color: '#6b5a45' })
      );
      plank.position.set(x, 0.105, 0);
      group.add(plank);
    }
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.025, 0.22),
        new THREE.MeshBasicMaterial({ color: '#d8d2c4' })
      );
      strip.position.set(0, 0.1, side * (roadW / 2 + 0.72));
      group.add(strip);
    }

    // Barriere alzate, una per ogni senso di marcia.
    const metal = new THREE.MeshLambertMaterial({ color: '#3a423c' });
    const stripeCanvas = document.createElement('canvas');
    stripeCanvas.width = 160;
    stripeCanvas.height = 16;
    const sctx = stripeCanvas.getContext('2d');
    sctx.fillStyle = '#f4ebda';
    sctx.fillRect(0, 0, 160, 16);
    sctx.fillStyle = '#b83b32';
    for (let i = 0; i < 10; i += 2) sctx.fillRect(i * 16, 0, 16, 16);
    const stripeTex = new THREE.CanvasTexture(stripeCanvas);
    stripeTex.colorSpace = THREE.SRGBColorSpace;
    const boomMat = new THREE.MeshLambertMaterial({ map: stripeTex });
    const boomLength = roadW / 2 + 1.0;

    const crossCanvas = document.createElement('canvas');
    crossCanvas.width = crossCanvas.height = 128;
    const cctx = crossCanvas.getContext('2d');
    cctx.clearRect(0, 0, 128, 128);
    cctx.lineCap = 'butt';
    for (const [color, width] of [['#b83b32', 21], ['#f4ebda', 12]]) {
      cctx.strokeStyle = color;
      cctx.lineWidth = width;
      cctx.beginPath();
      cctx.moveTo(24, 24); cctx.lineTo(104, 104);
      cctx.moveTo(104, 24); cctx.lineTo(24, 104);
      cctx.stroke();
    }
    const crossTex = new THREE.CanvasTexture(crossCanvas);
    crossTex.colorSpace = THREE.SRGBColorSpace;
    const crossMat = new THREE.MeshBasicMaterial({
      map: crossTex,
      side: THREE.DoubleSide,
      alphaTest: 0.12
    });
    const crossGeo = new THREE.PlaneGeometry(0.82, 0.82);
    const lights = [];

    for (const side of [-1, 1]) {
      const postX = side * 3.35;
      const postZ = side * (roadW / 2 + 0.95);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.9, 7), metal);
      post.position.set(postX, 1.45, postZ);
      post.castShadow = true;
      group.add(post);

      const dirZ = -side;
      const pivot = new THREE.Group();
      pivot.position.set(postX, 1.5, postZ);
      pivot.rotation.x = -dirZ * 1.08;
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, boomLength), boomMat);
      boom.position.z = dirZ * boomLength / 2;
      boom.castShadow = true;
      pivot.add(boom);
      group.add(pivot);

      const cross = new THREE.Mesh(crossGeo, crossMat);
      cross.position.set(postX + side * 0.06, 2.55, postZ);
      cross.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(cross);

      for (const k of [-1, 1]) {
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 7, 6),
          new THREE.MeshBasicMaterial({ color: '#4d1f1a' })
        );
        light.position.set(postX + side * 0.12, 2.05, postZ + k * 0.2);
        group.add(light);
        lights.push({ material: light.material, alt: k > 0 });
      }
    }

    group.name = 'passaggio-livello';
    this.scene.add(group);
    this.levelCrossings.push({ x, z, lights });
  }

  _updateLevelCrossings() {
    if (!this.levelCrossings.length) return;
    const blink = Math.floor(this.time * 2.1) % 2 === 0;
    for (const crossing of this.levelCrossings) {
      for (const light of crossing.lights) {
        light.material.color.set(blink === light.alt ? '#ff5a4e' : '#4d1f1a');
      }
    }
  }

  _buildTreePits() {
    const buckets = new Map();
    const positions = [];
    const add = (x, z) => {
      const info = this._nearestRoadInfo(x, z);
      if (!info || info.d < (info.w || 6) / 2 + 0.4 || info.d > 6.5) return;
      positions.push({ x, z });
    };
    for (const tree of this.city.trees || []) add(tree.x, tree.z);
    for (const row of this.city.treeRows || []) {
      const step = Math.max(1, Math.floor((row.pts?.length || 1) / 8));
      for (let i = 0; i < (row.pts?.length || 0); i += step) add(row.pts[i][0], row.pts[i][1]);
    }
    for (const spot of positions) {
      this.addMaterialGeometry(buckets, 'dirt_path', voxelBox(1.9, 0.06, 1.9, spot.x, 0.2, spot.z));
      const border = 'stone_bricks';
      this.addMaterialGeometry(buckets, border, voxelBox(2.25, 0.16, 0.18, spot.x, 0.23, spot.z - 0.98));
      this.addMaterialGeometry(buckets, border, voxelBox(2.25, 0.16, 0.18, spot.x, 0.23, spot.z + 0.98));
      this.addMaterialGeometry(buckets, border, voxelBox(0.18, 0.16, 1.95, spot.x - 0.98, 0.23, spot.z));
      this.addMaterialGeometry(buckets, border, voxelBox(0.18, 0.16, 1.95, spot.x + 0.98, 0.23, spot.z));
    }
    this.flushMaterialBuckets(buckets, {
      name: 'aiuole-alberi',
      castShadow: false,
      receiveShadow: true,
      uvSize: DETAIL_SIZE
    });
  }

  _buildStreetDetails() {
    if (this.quality === 'low') return;
    const buckets = new Map();
    const lampLimit = this.quality === 'high' ? 90 : 34;
    let lamps = 0;
    const kinds = new Set(['primary', 'secondary', 'tertiary']);
    const existing = this.city.streetFurniture || [];
    const nearExisting = (x, z) => existing.some(item => Math.hypot(item.x - x, item.z - z) < 3.2)
      || (this.treeSpots || []).some(tree => Math.hypot(tree.x - x, tree.z - z) < 2.4);
    for (const road of this.city.roads) {
      if (!kinds.has(road.kind) || road.length < 35 || road.tunnel || road.bridge) continue;
      for (let i = 1; i < road.pts.length && lamps < lampLimit; i++) {
        const [ax, az] = road.pts[i - 1];
        const [bx, bz] = road.pts[i];
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const ux = dx / len;
        const uz = dz / len;
        const nx = -uz;
        const nz = ux;
        for (let d = 22 + (hashString(String(road.id)) % 17); d < len && lamps < lampLimit; d += 44) {
          const side = (lamps % 2) ? 1 : -1;
          const off = side * ((road.w || 6) / 2 + 0.92);
          const x = ax + ux * d + nx * off;
          const z = az + uz * d + nz * off;
          if (!this.isFree(x, z, 0.65) || nearExisting(x, z)) continue;
          const baseY = 0.18;
          this.addMaterialGeometry(buckets, 'smooth_stone', voxelBox(0.45, 0.12, 0.45, x, baseY + 0.06, z));
          this.addMaterialGeometry(buckets, 'iron_block', voxelBox(0.22, 3.7, 0.22, x, baseY + 1.9, z));
          this.addMaterialGeometry(buckets, 'iron_block', voxelBox(0.85, 0.16, 0.16, x + nx * side * -0.42, baseY + 3.72, z + nz * side * -0.42));
          this.addMaterialGeometry(buckets, 'glowstone', voxelBox(0.34, 0.38, 0.34, x + nx * side * -0.8, baseY + 3.56, z + nz * side * -0.8));
          lamps++;
        }
      }
    }
    // Bollard ai principali attraversamenti.
    if (this.quality === 'high') {
      let bollards = 0;
      for (const crossing of this.city.crossings || []) {
        if (bollards >= 30) break;
        const info = this._nearestRoadInfo(crossing.x, crossing.z);
        if (!info || info.d > 10) continue;
        const nx = -info.uz;
        const nz = info.ux;
        for (const side of [-1, 1]) {
          if (bollards >= 30) break;
          const x = info.x + nx * side * (info.w / 2 + 0.55);
          const z = info.z + nz * side * (info.w / 2 + 0.55);
          if (!this.isFree(x, z, 0.3) || nearExisting(x, z)) continue;
          this.addMaterialGeometry(buckets, 'iron_block', voxelBox(0.22, 0.85, 0.22, x, 0.46, z));
          this.addMaterialGeometry(buckets, 'smooth_stone', voxelBox(0.26, 0.1, 0.26, x, 0.9, z));
          bollards++;
        }
      }
    }
    this.flushMaterialBuckets(buckets, {
      name: 'arredo-voxel',
      castShadow: this.quality === 'high',
      receiveShadow: true,
      uvSize: DETAIL_SIZE
    });
  }

  _buildingEdges(b) {
    const edges = [];
    for (let i = 0, j = b.poly.length - 1; i < b.poly.length; j = i++) {
      const [ax, az] = b.poly[j];
      const [bx, bz] = b.poly[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 2) continue;
      const ux = (bx - ax) / len;
      const uz = (bz - az) / len;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      let nx = -uz;
      let nz = ux;
      if ((mx - b.x) * nx + (mz - b.z) * nz < 0) { nx = -nx; nz = -nz; }
      edges.push({ ax, az, bx, bz, len, ux, uz, nx, nz, mx, mz });
    }
    return edges;
  }

  async _buildBuildings(onProgress) {
    const skipNames = LANDMARK_BUILDING_NAMES;
    const comunale = this.landmarksById.get('comunale');
    const wallBuckets = new Map();
    const facadeBuckets = new Map();
    const roofBuckets = new Map();
    const trimBuckets = new Map();
    const detailBuckets = new Map();
    const chimneyBuckets = new Map();
    const capBuckets = new Map();
    let count = 0;

    const extrudeBand = (pts, y0, y1) => {
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.05, y1 - y0),
        bevelEnabled: false,
        steps: 1,
        curveSegments: 1
      });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, y0, 0);
      assignBlockUV(geo);
      return geo;
    };

    const addGabledRoof = (b, info, roofBlock, detail) => {
      const { edge, bounds, ridgeHeight } = info;
      const span = Math.max(2, bounds.width);
      const length = Math.max(2, bounds.length);
      const angle = Math.atan2(edge.ux, edge.uz);
      const overhang = this.quality === 'low' ? 0.45 : 1.0;
      const { boxes } = roofStepBoxes({
        span,
        length,
        ridgeHeight,
        baseY: b.h,
        overhang,
        angle,
        centerX: bounds.centerX,
        centerZ: bounds.centerZ
      });
      for (const box of boxes) {
        this.addMaterialGeometry(roofBuckets, roofBlock, voxelBox(box.w, box.h * 1.01, box.d, box.x, box.y, box.z, box.ry));
      }
      // Timpani pieni ai due lati: il tetto non è più solo una scatola.
      const gable = voxelGableEnd(span, ridgeHeight, 0.18);
      for (const side of [-1, 1]) {
        const geo = gable.clone();
        geo.rotateY(angle);
        geo.translate(
          bounds.centerX + edge.ux * side * (length / 2 + 0.04),
          b.h,
          bounds.centerZ + edge.uz * side * (length / 2 + 0.04)
        );
        this.addMaterialGeometry(facadeBuckets, detail.wall, geo);
      }
      const ridge = voxelBox(0.24, 0.18, length + 0.5, bounds.centerX, b.h + ridgeHeight + 0.1, bounds.centerZ, angle);
      this.addMaterialGeometry(trimBuckets, detail.wood, ridge);
      const nx = -edge.uz;
      const nz = edge.ux;
      const half = span / 2 + overhang;
      for (const side of [-1, 1]) {
        const bx = bounds.centerX + nx * side * half;
        const bz = bounds.centerZ + nz * side * half;
        const fascia = voxelBox(0.22, 0.22, length + overhang * 2, bx, b.h - 0.04, bz, angle);
        this.addMaterialGeometry(trimBuckets, detail.wood, fascia);
      }
      if (this.quality === 'high' && b.area > 60) {
        const hv = hashString(String(b.id));
        const along = ((hv % 100) / 100 - 0.5) * length * 0.5;
        const side = (hv % 2) ? 1 : -1;
        const dx = bounds.centerX + edge.ux * along + nx * side * span * 0.2;
        const dz = bounds.centerZ + edge.uz * along + nz * side * span * 0.2;
        const dormerY = b.h + ridgeHeight * 0.56;
        this.addMaterialGeometry(facadeBuckets, detail.wall, voxelBox(1.7, 1.35, 1.1, dx, dormerY, dz, angle));
        this.addMaterialGeometry(facadeBuckets, detail.glass || 'glass', voxelBox(0.08, 0.8, 0.75, dx + nx * side * 0.58, dormerY + 0.08, dz + nz * side * 0.58, 0.0));
        // piccolo tetto a due falde dell'abbaino
        this.addMaterialGeometry(roofBuckets, roofBlock, voxelBox(2.0, 0.35, 1.45, dx, dormerY + 0.82, dz, angle));
        this.addMaterialGeometry(roofBuckets, roofBlock, voxelBox(1.55, 0.3, 1.2, dx, dormerY + 1.08, dz, angle));
      }
    };

    const addHippedRoof = (b, info, roofBlock) => {
      const poly = b.poly;
      const centroid = polygonCentroid(poly);
      const steps = clamp(Math.ceil(info.ridgeHeight / 1), 2, 8);
      const stepHeight = info.ridgeHeight / steps;
      for (let k = 0; k < steps; k++) {
        const factor = 1 - (k / steps) * 0.94;
        const ring = poly.map(([x, z]) => [
          centroid.x + (x - centroid.x) * factor,
          centroid.z + (z - centroid.z) * factor
        ]);
        let area = 0;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
        }
        if (area < 0) ring.reverse();
        const shape = new THREE.Shape();
        shape.moveTo(ring[0][0], ring[0][1]);
        for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][1]);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: stepHeight,
          bevelEnabled: false,
          steps: 1,
          curveSegments: 1
        });
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, b.h + k * stepHeight, 0);
        assignBlockUV(geo);
        this.addMaterialGeometry(roofBuckets, roofBlock, geo);
      }
    };

    const addFlatRoof = (b, info, roofBlock, detail) => {
      const pts = b.poly.map(p => [p[0], -p[1]]);
      let area = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      }
      if (area < 0) pts.reverse();
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
      shape.closePath();
      const slab = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false, steps: 1 });
      slab.rotateX(-Math.PI / 2);
      slab.translate(0, b.h + 0.02, 0);
      assignBlockUV(slab);
      this.addMaterialGeometry(roofBuckets, roofBlock, slab);

      if (this.quality !== 'low') {
        for (let i = 0; i < b.poly.length; i++) {
          const a = b.poly[i];
          const c = b.poly[(i + 1) % b.poly.length];
          const dx = c[0] - a[0];
          const dz = c[1] - a[1];
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          const parapet = new THREE.BoxGeometry(0.22, 0.4, len);
          parapet.rotateY(Math.atan2(dx, dz));
          parapet.translate((a[0] + c[0]) / 2, b.h + 0.3, (a[1] + c[1]) / 2);
          assignBlockUV(parapet);
          this.addMaterialGeometry(trimBuckets, 'smooth_stone', parapet);
        }
      }
      if (this.quality === 'high') {
        for (let i = 0; i < b.poly.length; i++) {
          const a = b.poly[i];
          const c = b.poly[(i + 1) % b.poly.length];
          const dx = c[0] - a[0];
          const dz = c[1] - a[1];
          const len = Math.hypot(dx, dz);
          if (len < 2) continue;
          const ux = dx / len;
          const uz = dz / len;
          for (let d = 0.45; d < len; d += 2.2) {
            const px = a[0] + ux * d;
            const pz = a[1] + uz * d;
            this.addMaterialGeometry(facadeBuckets, detail.trim, voxelBox(0.16, 0.55, 0.16, px, b.h + 0.55, pz));
          }
        }
      }
      if (this.quality === 'high' && b.area > 70 && count % 5 === 0) {
        const hv = hashString(String(b.id));
        const box = new THREE.BoxGeometry(1.2, 0.8, 0.9);
        box.translate(b.x + ((hv % 80) / 80 - 0.5) * 5, b.h + 0.5, b.z + ((hv % 57) / 57 - 0.5) * 5);
        assignBlockUV(box);
        this.addMaterialGeometry(detailBuckets, 'iron_block', box);
      }
    };

    for (const b of this.city.buildings) {
      const bounds = polygonBounds(b.poly);
      const collider = { poly: b.poly, bounds, name: b.name, kind: b.kind };
      this.colliders.push(collider);
      this.hash.insert(collider, bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ);
      if (b.name) this.colliderNames.set(b.name, collider);

      let skip = skipNames.has(b.name);
      if (!skip && comunale && Math.hypot(b.x - comunale.x, b.z - comunale.z) < 9) skip = true;
      if (skip) continue;

      const pts = b.poly.map(p => [p[0], -p[1]]);
      let area = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      }
      if (area < 0) pts.reverse();

      const info = b.arnis;
      const blocks = b.blocks || {};
      const detail = detailPaletteFor(b, blocks);
      const lowerWall = blocks.wallLower || blocks.wall || info?.wallLower || info?.wall || wallFallbackBlock(b);
      const upperWall = blocks.wallUpper || blocks.wall || info?.wallUpper || info?.wall || wallFallbackBlock(b);
      const splitWall = lowerWall !== upperWall && b.h > 4.5;
      if (splitWall) {
        const lowerHeight = Math.max(1.5, b.h * 0.55);
        this.addMaterialGeometry(wallBuckets, lowerWall, extrudeBand(pts, 0.06, lowerHeight));
        this.addMaterialGeometry(wallBuckets, upperWall, extrudeBand(pts, lowerHeight, b.h + 0.06));
      } else {
        this.addMaterialGeometry(wallBuckets, info?.wall || lowerWall, extrudeBand(pts, 0.06, b.h + 0.06));
      }

      const edges = this._buildingEdges(b);
      if (edges.length && this.quality !== 'low') {
        for (const edge of edges) {
          const angle = Math.atan2(edge.ux, edge.uz);
          // Zoccolo 1 m leggermente sporgente.
          this.addMaterialGeometry(
            facadeBuckets,
            detail.accent,
            voxelBox(0.13, 1.0, edge.len + 0.08, edge.mx + edge.nx * 0.065, 0.56, edge.mz + edge.nz * 0.065, angle)
          );
          // Cornicione sotto la gronda.
          if (this.quality === 'high' || b.area > 90) {
            this.addMaterialGeometry(
              facadeBuckets,
              detail.trim,
              voxelBox(0.2, 0.26, edge.len + 0.06, edge.mx + edge.nx * 0.1, b.h - 0.18, edge.mz + edge.nz * 0.1, angle)
            );
          }
          // Lesene verticali: spezzano le facciate lunghe e piatte.
          if (this.quality === 'high' && edge.len > 7.5) {
            const count = Math.floor(edge.len / 7);
            const height = Math.max(1.2, b.h - 1.4);
            for (let p = 1; p <= count; p++) {
              const t = p / (count + 1);
              const px = edge.ax + (edge.bx - edge.ax) * t + edge.nx * 0.09;
              const pz = edge.az + (edge.bz - edge.az) * t + edge.nz * 0.09;
              this.addMaterialGeometry(
                facadeBuckets,
                p % 2 ? detail.accent : detail.trim,
                voxelBox(0.18, height, 0.34, px, 1.0 + height / 2, pz, angle)
              );
            }
          }
        }
        // Quoine angolari a blocchi alternati.
        if (this.quality === 'high' && b.area > 42 && b.poly.length <= 10) {
          const hv = hashString(String(b.id));
          if (hv % 3 !== 0) {
            for (const [vx, vz] of b.poly.slice(0, 4)) {
              for (let y = 0.55; y < Math.min(3.2, b.h - 0.4); y += 1.0) {
                const block = Math.round(y) % 2 ? detail.trim : detail.accent;
                this.addMaterialGeometry(facadeBuckets, block, voxelBox(0.34, 0.94, 0.34, vx, y, vz));
              }
            }
          }
        }
        // Graticcio ligneo su edifici rurali/storici.
        if (this.quality === 'high' && ['rural', 'historic', 'civic'].includes(b.facadeStyle) && b.h > 4.5) {
          const yStart = Math.max(2.5, b.h * 0.55);
          for (const edge of edges) {
            if (edge.len < 4) continue;
            const angle = Math.atan2(edge.ux, edge.uz);
            this.addMaterialGeometry(
              facadeBuckets,
              detail.wood,
              voxelBox(0.14, 0.16, edge.len, edge.mx + edge.nx * 0.09, yStart, edge.mz + edge.nz * 0.09, angle)
            );
            for (let d = 1.6; d < edge.len; d += 2.4) {
              const px = edge.ax + edge.ux * d + edge.nx * 0.09;
              const pz = edge.az + edge.uz * d + edge.nz * 0.09;
              const height = Math.max(0.8, b.h - yStart - 0.5);
              this.addMaterialGeometry(
                facadeBuckets,
                detail.wood,
                voxelBox(0.14, height, 0.14, px, yStart + height / 2, pz)
              );
            }
          }
        }
      }

      const roofBlock = blocks.roof || info?.roof || roofFallbackBlock(b);
      const roofInfo = classifyBuildingRoof(b);
      let roofStyle = roofInfo.style;
      const roofType = blocks.roofType || info?.roofType;
      if (roofType === 'flat') roofStyle = 'flat';
      else if (roofType === 'stairs' || roofType === 'slab') {
        if (roofStyle === 'flat') {
          const rectangularity = b.area / Math.max(1, roofInfo.bounds.width * roofInfo.bounds.length);
          roofStyle = rectangularity > 0.72 ? 'gabled' : 'hipped';
        }
      }
      if (roofStyle === 'gabled') addGabledRoof(b, roofInfo, roofBlock, detail);
      else if (roofStyle === 'hipped') addHippedRoof(b, roofInfo, roofBlock, detail);
      else addFlatRoof(b, roofInfo, roofBlock, detail);

      if (this.quality !== 'low' && roofStyle !== 'flat' && count % 3 === 0) {
        const hv = hashString(String(b.id));
        const ox = ((hv % 100) / 100 - 0.5) * Math.min(4, roofInfo.length * 0.45);
        const oz = ((hv % 73) / 73 - 0.5) * Math.min(4, roofInfo.bounds.width * 0.35);
        const chimney = new THREE.BoxGeometry(0.6, 1.4, 0.6);
        chimney.translate(roofInfo.bounds.centerX + ox, b.h + roofInfo.ridgeHeight * 0.55, roofInfo.bounds.centerZ + oz);
        assignBlockUV(chimney);
        this.addMaterialGeometry(chimneyBuckets, 'bricks', chimney);
        const cap = new THREE.BoxGeometry(0.78, 0.14, 0.78);
        cap.translate(roofInfo.bounds.centerX + ox, b.h + roofInfo.ridgeHeight * 0.55 + 0.74, roofInfo.bounds.centerZ + oz);
        assignBlockUV(cap);
        this.addMaterialGeometry(capBuckets, 'stone_bricks', cap);
      }
      count++;
      if (count % 400 === 0) {
        onProgress(0.45 + 0.18 * (count / Math.max(1, this.city.buildings.length - skipNames.size)), 'Costruisco gli edifici…');
        await tick();
      }
    }

    const wallStart = this.blockMeshes.length;
    this.flushMaterialBuckets(wallBuckets, {
      name: 'edifici',
      castShadow: true,
      receiveShadow: true
    });
    this.buildingMeshes = this.blockMeshes.slice(wallStart);
    this.flushMaterialBuckets(facadeBuckets, {
      name: 'dettagli-facciata',
      castShadow: this.quality === 'high',
      receiveShadow: true,
      uvSize: DETAIL_SIZE
    });
    const roofStart = this.blockMeshes.length;
    this.flushMaterialBuckets(roofBuckets, {
      name: 'tetti',
      castShadow: true,
      receiveShadow: true,
      side: THREE.DoubleSide,
      uvSize: DETAIL_SIZE
    });
    this.roofMeshes = this.blockMeshes.slice(roofStart);
    this.roofMesh = this.roofMeshes[0] || null;
    this.flushMaterialBuckets(trimBuckets, { name: 'dettagli-tetti', castShadow: true, receiveShadow: false, uvSize: DETAIL_SIZE });
    this.flushMaterialBuckets(detailBuckets, { name: 'impianti-tetti', castShadow: true, receiveShadow: false, uvSize: DETAIL_SIZE });
    this.flushMaterialBuckets(chimneyBuckets, { name: 'comignoli', castShadow: true, receiveShadow: false, uvSize: DETAIL_SIZE });
    this.flushMaterialBuckets(capBuckets, { name: 'cappelli-comignoli', castShadow: true, receiveShadow: false, uvSize: DETAIL_SIZE });
  }

  _buildWindows() {
    const windowBuckets = new Map();
    const doorBuckets = new Map();
    const windowDetailBuckets = new Map();
    const getWindowPositions = block => {
      const key = blockKey(block || this.defaultGlassBlock);
      if (!windowBuckets.has(key)) windowBuckets.set(key, []);
      return windowBuckets.get(key);
    };
    const getDoorPositions = block => {
      const key = blockKey(block || this.defaultDoorBlock);
      if (!doorBuckets.has(key)) doorBuckets.set(key, []);
      return doorBuckets.get(key);
    };
    const bandPositions = [];
    const framePositions = [];
    const shutterPositions = [];
    const shutterColors = [];
    const downpipeGeoms = [];
    const stepGeoms = [];
    const awningGeoms = [];
    const balconyGeoms = [];
    const awningColors = ['#b5503f', '#c2684b', '#3f748a', '#5d7a52', '#c99a3f', '#7f5a46'];
    const shutterPalette = ['#4f6b58', '#6b5a43', '#7a3f2f', '#3f5f6b'].map(c => new THREE.Color(c));
    const stoneColor = new THREE.Color('#d8cbb6');
    const addColoredQuad = (arr, cols, color, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) => {
      addQuad(arr, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4);
      // addQuad genera due triangoli: 6 vertici, quindi 6 colori.
      for (let k = 0; k < 6; k++) cols.push(color.r, color.g, color.b);
    };
    let buildingIndex = 0;
    const comunale = this.landmarksById.get('comunale');
    for (const b of this.city.buildings) {
      buildingIndex++;
      if (LANDMARK_BUILDING_NAMES.has(b.name)) continue;
      const buildingGlass = b.blocks?.glass || b.arnis?.glass || this.defaultGlassBlock;
      const buildingDoor = b.blocks?.door || b.arnis?.door || this.defaultDoorBlock;
      const detail = detailPaletteFor(b, b.blocks || {});
      if (comunale && Math.hypot(b.x - comunale.x, b.z - comunale.z) < 9) continue;
      if (b.h < 4.2 || b.area < 28 || b.kind === 'roof') continue;
      const facadeStyle = b.facadeStyle || 'urban';
      const rural = facadeStyle === 'rural';
      const industrial = facadeStyle === 'industrial';
      const historic = facadeStyle === 'historic' || facadeStyle === 'civic';
      const edges = [];
      for (let i = 0, j = b.poly.length - 1; i < b.poly.length; j = i++) {
        const [ax, az] = b.poly[j], [bx, bz] = b.poly[i];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 4) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len;
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        let nx = -uz, nz = ux;
        if ((mx - b.x) * nx + (mz - b.z) * nz < 0) { nx = -nx; nz = -nz; }
        edges.push({ ax, az, bx, bz, len, ux, uz, nx, nz, mx, mz });
      }
      if (!edges.length) continue;

      for (const e of edges) {
        const floorLimit = industrial ? 2 : rural ? 3 : 8;
        const floors = Math.max(1, Math.min(floorLimit, b.levels > 0 ? Math.round(b.levels) : Math.floor((b.h - 2.0) / 3.0)));
        const count = industrial
          ? Math.max(1, Math.min(4, Math.floor(e.len / 7)))
          : rural
            ? Math.max(1, Math.min(5, Math.floor(e.len / 4.2)))
            : Math.max(1, Math.min(8, Math.floor(e.len / 3.1)));
        for (let f = 0; f < floors; f++) {
          const y = 2.15 + f * 3.0;
          if (y > b.h - 0.75) break;
          for (let i = 0; i < count; i++) {
            const u = (i + 0.65) / (count + 0.3);
            const cx = e.ax + (e.bx - e.ax) * u + e.nx * 0.065;
            const cz = e.az + (e.bz - e.az) * u + e.nz * 0.065;
            const w = industrial ? 0.95 : rural ? 0.46 : 0.54;
            const h = industrial ? 1.15 : rural ? 0.70 : 0.82;
            const ex = e.ux * w * 0.5, ez = e.uz * w * 0.5;
            addQuad(getWindowPositions(buildingGlass),
              cx - ex, y - h / 2, cz - ez,
              cx + ex, y - h / 2, cz + ez,
              cx + ex, y + h / 2, cz + ez,
              cx - ex, y + h / 2, cz - ez);

            if (this.quality !== 'low') {
              // cornice e davanzale
              const fx = cx + e.nx * 0.02, fz = cz + e.nz * 0.02;
              const hw = w / 2;
              const exTop = e.ux * (hw + 0.09), ezTop = e.uz * (hw + 0.09);
              addQuad(framePositions,
                fx - exTop, y + h / 2 + 0.005, fz - ezTop,
                fx + exTop, y + h / 2 + 0.005, fz + ezTop,
                fx + exTop, y + h / 2 + 0.075, fz + ezTop,
                fx - exTop, y + h / 2 + 0.075, fz - ezTop);
              const exSill = e.ux * (hw + 0.12), ezSill = e.uz * (hw + 0.12);
              addQuad(framePositions,
                fx - exSill, y - h / 2 - 0.10, fz - ezSill,
                fx + exSill, y - h / 2 - 0.10, fz + ezSill,
                fx + exSill, y - h / 2 - 0.015, fz + ezSill,
                fx - exSill, y - h / 2 - 0.015, fz - ezSill);
              for (const side of [-1, 1]) {
                const sx = fx + e.ux * side * (hw + 0.035);
                const sz = fz + e.uz * side * (hw + 0.035);
                addQuad(framePositions,
                  sx - e.ux * 0.032, y - h / 2 - 0.06, sz - e.uz * 0.032,
                  sx + e.ux * 0.032, y - h / 2 - 0.06, sz + e.uz * 0.032,
                  sx + e.ux * 0.032, y + h / 2 + 0.06, sz + e.uz * 0.032,
                  sx - e.ux * 0.032, y + h / 2 + 0.06, sz - e.uz * 0.032);
              }

              // persiane su una parte delle finestre
              // Davanzale e architrave in voxel 1 m.
              const windowVariant = buildingIndex + f + i;
              if (this.quality === 'high' && windowVariant % 3 === 0) {
                const angle = Math.atan2(e.ux, e.uz);
                this.addMaterialGeometry(
                  windowDetailBuckets,
                  detail.accent,
                  voxelBox(0.2, 0.13, w + 0.24, cx + e.nx * 0.08, y - h / 2 - 0.09, cz + e.nz * 0.08, angle)
                );
                if (windowVariant % 6 === 0) {
                  this.addMaterialGeometry(
                    windowDetailBuckets,
                    detail.trim,
                    voxelBox(0.18, 0.12, w + 0.18, cx + e.nx * 0.07, y + h / 2 + 0.09, cz + e.nz * 0.07, angle)
                  );
                }
              }

              // Persiane spesse, non più quad piatte.
              if (this.quality === 'high' && !industrial && (rural ? (buildingIndex + f + i) % 5 === 0 : (buildingIndex + f + i) % 6 === 0)) {
                const angle = Math.atan2(e.ux, e.uz);
                for (const side of [-1, 1]) {
                  const sx = cx + e.ux * side * (hw + 0.2) + e.nx * 0.05;
                  const sz = cz + e.uz * side * (hw + 0.2) + e.nz * 0.05;
                  this.addMaterialGeometry(
                    windowDetailBuckets,
                    detail.wood,
                    voxelBox(0.1, h + 0.16, 0.34, sx, y, sz, angle)
                  );
                }
              }

              // Fioriere su alcune finestre.
              if (this.quality === 'high' && !industrial && (buildingIndex + f + i) % 23 === 0) {
                const angle = Math.atan2(e.ux, e.uz);
                const bx = cx + e.nx * 0.24;
                const bz = cz + e.nz * 0.24;
                this.addMaterialGeometry(
                  windowDetailBuckets,
                  detail.wood,
                  voxelBox(0.22, 0.24, w * 0.9, bx, y - h / 2 - 0.3, bz, angle)
                );
                this.addMaterialGeometry(
                  windowDetailBuckets,
                  (buildingIndex + i) % 2 ? 'poppy' : 'dandelion',
                  voxelBox(0.16, 0.16, w * 0.6, bx + e.nx * 0.02, y - h / 2 - 0.16, bz + e.nz * 0.02, angle)
                );
              }
            }
          }
        }
        // fasce orizzontali: danno profondità alle facciate
        if (this.quality !== 'low' && e.len > 5.5) {
          const bx1 = e.ax + e.nx * 0.055, bz1 = e.az + e.nz * 0.055;
          const bx2 = e.bx + e.nx * 0.055, bz2 = e.bz + e.nz * 0.055;
          for (let f = 1; f <= floors; f++) {
            const y = 2.15 + f * 3.0 - 1.5;
            if (y > b.h - 0.4) break;
            addQuad(bandPositions,
              bx1, y - 0.045, bz1,
              bx2, y - 0.045, bz2,
              bx2, y + 0.045, bz2,
              bx1, y + 0.045, bz1);
          }
          // cornice di gronda
          addQuad(bandPositions,
            e.ax + e.nx * 0.10, b.h - 0.30, e.az + e.nz * 0.10,
            e.bx + e.nx * 0.10, b.h - 0.30, e.bz + e.nz * 0.10,
            e.bx + e.nx * 0.10, b.h - 0.06, e.bz + e.nz * 0.10,
            e.ax + e.nx * 0.10, b.h - 0.06, e.az + e.nz * 0.10);
        }
      }

      if (this.quality === 'high' && !industrial && buildingIndex % 4 === 0 && edges.length) {
        const e = edges[0];
        const px = e.ax + e.nx * 0.14;
        const pz = e.az + e.nz * 0.14;
        const pipe = new THREE.BoxGeometry(0.14, Math.max(2, b.h - 0.25), 0.14);
        pipe.translate(px, b.h / 2, pz);
        downpipeGeoms.push(paintGeometry(pipe, '#5f5548'));
      }

      // Porta d'ingresso sul lato più lungo.
      const longest = edges.reduce((a, b) => a.len > b.len ? a : b, edges[0]);
      if (['commercial', 'retail', 'food', 'cafe', 'shop', 'supermarket'].includes(b.kind) && longest.len > 7) {
        for (const u of [0.28, 0.72]) {
          const cx = longest.ax + (longest.bx - longest.ax) * u + longest.nx * 0.07;
          const cz = longest.az + (longest.bz - longest.az) * u + longest.nz * 0.07;
          const ex = longest.ux * 1.05, ez = longest.uz * 1.05;
          addQuad(getWindowPositions(buildingGlass),
            cx - ex, 0.55, cz - ez,
            cx + ex, 0.55, cz + ez,
            cx + ex, 1.95, cz + ez,
            cx - ex, 1.95, cz - ez);
          if (this.quality !== 'low') {
            const fx = cx + longest.nx * 0.03, fz = cz + longest.nz * 0.03;
            const exf = longest.ux * 1.12, ezf = longest.uz * 1.12;
            addQuad(framePositions,
              fx - exf, 1.95, fz - ezf,
              fx + exf, 1.95, fz + ezf,
              fx + exf, 2.07, fz + ezf,
              fx - exf, 2.07, fz - ezf);
            addQuad(framePositions,
              fx - exf, 0.45, fz - ezf,
              fx + exf, 0.45, fz + ezf,
              fx + exf, 0.57, fz + ezf,
              fx - exf, 0.57, fz - ezf);
          }
        }
      }
      if (buildingIndex % 2 === 0 && longest.len > 5) {
        const u = 0.5;
        const cx = longest.ax + (longest.bx - longest.ax) * u + longest.nx * 0.07;
        const cz = longest.az + (longest.bz - longest.az) * u + longest.nz * 0.07;
        const ex = longest.ux * 0.62, ez = longest.uz * 0.62;
        addQuad(getDoorPositions(buildingDoor),
          cx - ex, 0.12, cz - ez,
          cx + ex, 0.12, cz + ez,
          cx + ex, 2.35, cz + ez,
          cx - ex, 2.35, cz - ez);
        if (this.quality !== 'low') {
          const fx = cx + longest.nx * 0.03, fz = cz + longest.nz * 0.03;
          const exf = longest.ux * 0.74, ezf = longest.uz * 0.74;
          addQuad(framePositions,
            fx - exf, 2.35, fz - ezf,
            fx + exf, 2.35, fz + ezf,
            fx + exf, 2.48, fz + ezf,
            fx - exf, 2.48, fz - ezf);
          for (const side of [-1, 1]) {
            const sx = fx + longest.ux * side * 0.72;
            const sz = fz + longest.uz * side * 0.72;
            addQuad(framePositions,
              sx - longest.ux * 0.055, 0.12, sz - longest.uz * 0.055,
              sx + longest.ux * 0.055, 0.12, sz + longest.uz * 0.055,
              sx + longest.ux * 0.055, 2.47, sz + longest.uz * 0.055,
              sx - longest.ux * 0.055, 2.47, sz - longest.uz * 0.055);
          }
        }
        const stepAngle = Math.atan2(longest.nx, longest.nz);
        const step = new THREE.BoxGeometry(1.55, 0.16, 0.55);
        step.rotateY(stepAngle);
        step.translate(cx + longest.nx * 0.28, 0.08, cz + longest.nz * 0.28);
        stepGeoms.push(paintGeometry(step, '#b8a58d'));
        if (this.quality !== 'low') {
          const doorAngle = Math.atan2(longest.ux, longest.uz);
          const doorWidth = 1.24;
          for (const side of [-1, 1]) {
            this.addMaterialGeometry(
              windowDetailBuckets,
              detail.wood,
              voxelBox(0.14, 2.5, 0.18,
                cx + longest.ux * side * (doorWidth / 2 + 0.06) + longest.nx * 0.07,
                1.25,
                cz + longest.uz * side * (doorWidth / 2 + 0.06) + longest.nz * 0.07,
                doorAngle)
            );
          }
          this.addMaterialGeometry(
            windowDetailBuckets,
            detail.accent,
            voxelBox(0.2, 0.18, doorWidth + 0.35, cx + longest.nx * 0.08, 2.58, cz + longest.nz * 0.08, doorAngle)
          );
          if (this.quality === 'high' && b.area > 40) {
            this.addMaterialGeometry(
              windowDetailBuckets,
              detail.wood,
              voxelBox(0.8, 0.12, 1.7, cx + longest.nx * 0.44, 2.86, cz + longest.nz * 0.44, doorAngle)
            );
          }
        }
      }

      // Tende colorate sopra alcune porte.
      if (this.quality !== 'low' && !rural && !industrial && buildingIndex % 4 === 0 && longest.len > 7) {
        const angle = Math.atan2(-longest.uz, longest.ux);
        const count = Math.max(1, Math.min(2, Math.floor(longest.len / 7)));
        for (let i = 0; i < count; i++) {
          const u = (i + 1) / (count + 1);
          const cx = longest.ax + (longest.bx - longest.ax) * u + longest.nx * 0.42;
          const cz = longest.az + (longest.bz - longest.az) * u + longest.nz * 0.42;
          const g = new THREE.BoxGeometry(2.2, 0.1, 0.82);
          g.rotateY(angle);
          g.translate(cx, 2.72, cz);
          awningGeoms.push(paintGeometry(g, awningColors[buildingIndex % awningColors.length]));
        }
      }

      // Balconi su alcune facciate.
      if (this.quality === 'high' && !rural && !industrial && buildingIndex % 5 === 0 && longest.len > 6) {
        const angle = Math.atan2(-longest.uz, longest.ux);
        const floors = Math.max(1, Math.min(5, Math.floor((b.h - 2.0) / 3.0)));
        for (let f = 1; f < floors; f++) {
          const y = 2.15 + f * 3.0;
          if (y > b.h - 1.0) break;
          const u = 0.5;
          const cx = longest.ax + (longest.bx - longest.ax) * u + longest.nx * 0.38;
          const cz = longest.az + (longest.bz - longest.az) * u + longest.nz * 0.38;
          const slab = new THREE.BoxGeometry(1.9, 0.12, 0.72);
          slab.rotateY(angle);
          slab.translate(cx, y - 0.48, cz);
          balconyGeoms.push(paintGeometry(slab, '#b8a58d'));
          // ringhiera
          const railY = y + 0.02;
          for (const off of [-0.75, 0, 0.75]) {
            const bx = cx + longest.ux * off + longest.nx * 0.36;
            const bz = cz + longest.uz * off + longest.nz * 0.36;
            const bar = new THREE.BoxGeometry(0.05, 0.82, 0.05);
            bar.translate(bx, railY, bz);
            balconyGeoms.push(paintGeometry(bar, '#4a4d48'));
          }
          const top = new THREE.BoxGeometry(1.9, 0.05, 0.05);
          top.rotateY(angle);
          top.translate(cx + longest.nx * 0.36, railY + 0.41, cz + longest.nz * 0.36);
          balconyGeoms.push(paintGeometry(top, '#4a4d48'));
        }
      }
    }

    this.windowMeshes = [];
    for (const [glassBlock, positions] of windowBuckets) {
      if (!positions.length) continue;
      const windowGeo = new THREE.BufferGeometry();
      windowGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      windowGeo.computeVertexNormals();
      assignBlockUV(windowGeo);
      const windowMaterial = this.blockMaterial(glassBlock, {
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      }).clone();
      const mesh = new THREE.Mesh(windowGeo, windowMaterial);
      mesh.name = `finestre-${glassBlock}`;
      this.windowMeshes.push(mesh);
      this.scene.add(mesh);
    }
    this.windowMesh = this.windowMeshes[0] || null;

    for (const [doorBlock, positions] of doorBuckets) {
      if (!positions.length) continue;
      const doorGeo = new THREE.BufferGeometry();
      doorGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      doorGeo.computeVertexNormals();
      assignBlockUV(doorGeo);
      const doorMesh = new THREE.Mesh(
        doorGeo,
        this.blockMaterial(doorBlock, { side: THREE.DoubleSide }).clone()
      );
      doorMesh.name = `porte-${doorBlock}`;
      this.scene.add(doorMesh);
    }

    if (framePositions.length) {
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.Float32BufferAttribute(framePositions, 3));
      fg.computeVertexNormals();
      assignBlockUV(fg);
      const mesh = new THREE.Mesh(fg, this.blockMaterial('smooth_sandstone', { side: THREE.DoubleSide }));
      mesh.name = 'cornici';
      this.scene.add(mesh);
    }

    if (shutterPositions.length) {
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(shutterPositions, 3));
      sg.setAttribute('color', new THREE.Float32BufferAttribute(shutterColors, 3));
      sg.computeVertexNormals();
      const mesh = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      mesh.name = 'persiane';
      this.scene.add(mesh);
    }

    const downpipes = mergeClean(downpipeGeoms);
    if (downpipes) {
      assignBlockUV(downpipes);
      const mesh = new THREE.Mesh(downpipes, this.blockMaterial('iron_block'));
      mesh.name = 'pluviali';
      this.scene.add(mesh);
    }

    const steps = mergeClean(stepGeoms);
    if (steps) {
      assignBlockUV(steps);
      const mesh = new THREE.Mesh(steps, this.blockMaterial('smooth_stone'));
      mesh.name = 'gradini';
      this.scene.add(mesh);
    }

    const awningMeshGeo = mergeClean(awningGeoms);
    if (awningMeshGeo) {
      const mesh = new THREE.Mesh(awningMeshGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.castShadow = true;
      mesh.name = 'tende';
      this.scene.add(mesh);
    }

    if (bandPositions.length) {
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(bandPositions, 3));
      bg.computeVertexNormals();
      assignBlockUV(bg);
      const mesh = new THREE.Mesh(bg, this.blockMaterial('smooth_stone', { side: THREE.DoubleSide }));
      mesh.name = 'fasce';
      this.scene.add(mesh);
    }

    const balconyMeshGeo = mergeClean(balconyGeoms);
    if (balconyMeshGeo) {
      const mesh = new THREE.Mesh(balconyMeshGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.castShadow = true;
      mesh.name = 'balconi';
      this.scene.add(mesh);
    }

    this.flushMaterialBuckets(windowDetailBuckets, {
      name: 'dettagli-finestre',
      castShadow: this.quality === 'high',
      receiveShadow: true,
      uvSize: DETAIL_SIZE
    });
  }

  _poiSignTexture(name, type) {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = type.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,248,232,.88)';
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // piccolo medaglione con il glifo della categoria
    ctx.fillStyle = 'rgba(255,248,232,.92)';
    ctx.beginPath();
    ctx.arc(80, 90, 43, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = type.color;
    ctx.font = '700 44px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type.glyph, 80, 94);

    const label = String(name || '').toUpperCase();
    const maxWidth = 540;
    let fontSize = label.length > 26 ? 36 : label.length > 18 ? 44 : 54;
    ctx.font = `700 ${fontSize}px Anton, "Arial Narrow", sans-serif`;
    while (ctx.measureText(label).width > maxWidth && fontSize > 24) {
      fontSize -= 2;
      ctx.font = `700 ${fontSize}px Anton, "Arial Narrow", sans-serif`;
    }
    ctx.fillStyle = '#fff8e8';
    ctx.textAlign = 'left';
    ctx.fillText(label, 142, 82);
    ctx.fillStyle = 'rgba(255,248,232,.72)';
    ctx.font = '600 22px Oswald, "Trebuchet MS", sans-serif';
    ctx.fillText(type.label, 144, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    return tex;
  }

  _buildPoiSigns() {
    const plan = planPoiSigns(this.city);
    this.poiSigns = plan.signs;
    const shopLimit = this.quality === 'low' ? 18 : this.quality === 'medium' ? 42 : Infinity;
    let shopSigns = 0;
    const shopBacks = [];
    const shopFrames = [];
    const shopGlass = [];
    const shopAwnings = new Map();
    const frameMaterial = new THREE.MeshLambertMaterial({ color: '#2c332f' });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: '#7fa9b8',
      roughness: 0.22,
      metalness: 0.15,
      emissive: '#2a4a54',
      emissiveIntensity: 0.8
    });
    const transform = (geometry, sign) => {
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(sign.x, sign.y, sign.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sign.rotation),
        new THREE.Vector3(1, 1, 1)
      );
      geometry.applyMatrix4(matrix);
      return geometry;
    };
    for (const sign of plan.signs) {
      const isShop = sign.poi.kind === 'shop';
      if (isShop) {
        shopSigns++;
        if (shopSigns > shopLimit) continue;
      }
      const group = new THREE.Group();
      if (isShop) {
        const back = new THREE.BoxGeometry(sign.width + 0.1, sign.height + 0.1, 0.1);
        back.translate(0, 0, -0.055);
        shopBacks.push(transform(back, sign));
      } else {
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(sign.width + 0.1, sign.height + 0.1, 0.1),
          new THREE.MeshLambertMaterial({ color: '#1b241e' })
        );
        back.position.z = -0.055;
        back.castShadow = true;
        group.add(back);
      }
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(sign.width, sign.height),
        new THREE.MeshBasicMaterial({ map: this._poiSignTexture(sign.title || sign.poi.name, sign.type), side: THREE.DoubleSide })
      );
      panel.position.z = 0.005;
      group.add(panel);
      if (sign.awning) {
        if (isShop) {
          const color = sign.type.color;
          const awning = new THREE.BoxGeometry(sign.width * 0.86, 0.08, 0.62);
          awning.translate(0, -sign.height * 0.72, 0.34);
          if (!shopAwnings.has(color)) shopAwnings.set(color, []);
          shopAwnings.get(color).push(transform(awning, sign));
        } else {
          const awning = new THREE.Mesh(
            new THREE.BoxGeometry(sign.width * 0.86, 0.08, 0.62),
            new THREE.MeshLambertMaterial({ color: sign.type.color })
          );
          awning.position.set(0, -sign.height * 0.72, 0.34);
          awning.castShadow = true;
          group.add(awning);
        }
      }
      if (isShop) {
        const width = Math.min(sign.width * 1.02, 4.2);
        const frame = new THREE.BoxGeometry(width + 0.14, 2.2, 0.08);
        frame.translate(0, 1.4 - sign.y, 0.01);
        shopFrames.push(transform(frame, sign));
        const glass = new THREE.PlaneGeometry(width, 1.9);
        glass.translate(0, 1.42 - sign.y, 0.052);
        shopGlass.push(transform(glass, sign));
        const mullion = new THREE.BoxGeometry(0.06, 2.0, 0.05);
        mullion.translate(0, 1.4 - sign.y, 0.064);
        shopFrames.push(transform(mullion, sign));
        const base = new THREE.BoxGeometry(width + 0.2, 0.16, 0.15);
        base.translate(0, 0.12 - sign.y, 0.04);
        shopFrames.push(transform(base, sign));
      }
      group.position.set(sign.x, sign.y, sign.z);
      group.rotation.y = sign.rotation;
      group.name = `insegna-${sign.poi.id}`;
      this.scene.add(group);
    }

    const addMerged = (geometries, material, name, castShadow = true) => {
      if (!geometries.length) return;
      const geometry = mergeClean(geometries);
      if (!geometry) return;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = castShadow;
      mesh.name = name;
      this.scene.add(mesh);
    };
    addMerged(shopBacks, new THREE.MeshLambertMaterial({ color: '#1b241e' }), 'retro-insegne-negozi');
    addMerged(shopFrames, frameMaterial, 'cornici-vetrine');
    addMerged(shopGlass, glassMaterial, 'vetri-vetrine', false);
    for (const [color, geometries] of shopAwnings) {
      addMerged(geometries, new THREE.MeshLambertMaterial({ color }), `tende-negozi-${color.replace('#', '')}`);
    }
  }

  _buildProps() {
    const rnd = seededRandom(1234);
    const treeMatrices = [];
    const speciesPool = ['oak', 'birch', 'acacia', 'dark_oak', 'oak', 'birch'];
    const addTree = (x, z, scale = 1, radius = 0.6, species = null, height = null) => {
      if (!this.isFree(x, z, radius)) return;
      const heightScale = height ? clamp(height / 12, 0.75, 1.9) : 1;
      treeMatrices.push({
        x,
        z,
        s: scale * (0.8 + rnd() * 0.55) * heightScale,
        r: rnd() * Math.PI * 2,
        species: species || speciesPool[Math.floor(rnd() * speciesPool.length)]
      });
    };
    // alberi nei parchi e nelle piazze
    for (const a of this.city.areas) {
      const isSquare = a.kind === 'square';
      if (!['park', 'forest', 'grass'].includes(a.kind) && !isSquare) continue;
      const info = this.arnisAreas[String(a.id)];
      const species = info?.species || speciesPool[Math.floor(rnd() * speciesPool.length)];
      const bounds = polygonBounds(a.poly);
      const n = isSquare
        ? clamp(Math.round(a.area / 900), 1, 8)
        : clamp(Math.round(a.area / 160), 2, 55);
      for (let i = 0; i < n; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (pointInPoly(x, z, a.poly)) addTree(x, z, 0.9 + rnd() * 0.5, 0.6, species);
      }
    }
    // alcuni alberi vicino al punto di partenza, per dare scala alla piazza
    for (const [x, z, s] of [
      [-330, 15, 1.15], [-340, 20, 1.0], [-338, 0, 1.1], [-295, -5, 1.05], [-325, 30, 0.95], [-330, -10, 0.9]
    ]) addTree(x, z, s, 0.6, 'oak');
    // alberi lungo le strade principali
    for (const r of this.city.roads) {
      if (!['primary', 'secondary', 'tertiary', 'residential'].includes(r.kind) || r.length < 60) continue;
      for (let i = 1; i < r.pts.length; i++) {
        const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i];
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const ux = dx / len, uz = dz / len;
        for (let d = 12; d < len; d += 38) {
          const x = ax + ux * d - uz * (r.w / 2 + 6);
          const z = az + uz * d + ux * (r.w / 2 + 6);
          if (rnd() < 0.55) addTree(x, z, 0.8 + rnd() * 0.4, 0.6, speciesPool[Math.floor(rnd() * speciesPool.length)]);
        }
      }
    }
    // Filari alberati censiti da OSM: alberi ravvicinati lungo il percorso reale.
    if (this.quality !== 'low') {
      let rowIndex = 0;
      for (const row of this.city.treeRows || []) {
        const species = this.arnisTreeRows[rowIndex] || 'oak';
        rowIndex++;
        let count = 0;
        for (let i = 1; i < row.pts.length && count < 90; i++) {
          const [ax, az] = row.pts[i - 1], [bx, bz] = row.pts[i];
          const dx = bx - ax, dz = bz - az;
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          const ux = dx / len, uz = dz / len;
          for (let d = 4; d < len && count < 90; d += 11) {
            const x = ax + ux * d;
            const z = az + uz * d;
            addTree(x, z, 0.68 + rnd() * 0.28, 0.6, species);
            count++;
          }
        }
      }
    }
    // Alberi singoli censiti da OSM nel centro storico.
    const osmTrees = this.city.trees || [];
    for (let i = 0; i < osmTrees.length; i++) {
      const t = osmTrees[i];
      const info = this.arnisTrees[i];
      addTree(t.x, t.z, 0.85 + rnd() * 0.35, 0.32, info?.species || 'oak', info?.height || null);
    }
    this.treeSpots = treeMatrices;
    const treeLimit = this.quality === 'low' ? 460 : this.quality === 'medium' ? 840 : 1200;
    const trees = treeMatrices.slice(0, treeLimit);
    if (trees.length) {
      const groups = new Map();
      for (const tree of trees) {
        const species = tree.species || 'oak';
        if (!groups.has(species)) groups.set(species, []);
        groups.get(species).push(tree);
      }
      const dummy = new THREE.Object3D();
      const trunkMeshes = [];
      const foliageMeshes = [];
      for (const [species, list] of groups) {
        const { trunk, foliage } = makeBlockTreeGeometry(species);
        assignBlockUV(trunk);
        assignBlockUV(foliage);
        const logBlock = species === 'azalea' ? 'oak_log' : `${species}_log`;
        const leavesBlock = `${species}_leaves`;
        const trunkMesh = new THREE.InstancedMesh(trunk, this.blockMaterial(logBlock), list.length);
        const foliageMesh = new THREE.InstancedMesh(foliage, this.blockMaterial(leavesBlock), list.length);
        list.forEach((tree, i) => {
          dummy.position.set(tree.x, 0, tree.z);
          dummy.rotation.y = tree.r;
          dummy.scale.set(tree.s, tree.s, tree.s);
          dummy.updateMatrix();
          trunkMesh.setMatrixAt(i, dummy.matrix);
          foliageMesh.setMatrixAt(i, dummy.matrix);
        });
        trunkMesh.castShadow = true;
        foliageMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        foliageMesh.receiveShadow = true;
        trunkMesh.instanceMatrix.needsUpdate = true;
        foliageMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(trunkMesh, foliageMesh);
        trunkMeshes.push(trunkMesh);
        foliageMeshes.push(foliageMesh);
      }
      this.trunkMeshes = trunkMeshes;
      this.foliageMeshes = foliageMeshes;
      this.trunkMesh = trunkMeshes[0] || null;
      this.foliageMesh = foliageMeshes[0] || null;
      this.treeCount = trees.length;
    }

    // cespugli, ciuffi d'erba e fiori nei parchi
    const shrubs = [];
    const tufts = [];
    const flowers = [];
    const flowerColors = ['#e8a7b8', '#f2d36b', '#f4ebda', '#c95b55', '#b18bd0'];
    for (const a of this.city.areas) {
      if (!['park', 'grass', 'forest'].includes(a.kind)) continue;
      const bounds = polygonBounds(a.poly);
      const shrubN = clamp(Math.round(a.area / 2400), 1, 14);
      const tuftN = clamp(Math.round(a.area / 170), 4, 120);
      const flowerN = clamp(Math.round(a.area / 700), 1, 34);
      for (let i = 0; i < shrubN; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (pointInPoly(x, z, a.poly) && this.isFree(x, z, 0.25)) {
          shrubs.push({ x, z, s: 0.55 + rnd() * 0.75, r: rnd() * Math.PI * 2 });
        }
      }
      for (let i = 0; i < tuftN; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (pointInPoly(x, z, a.poly) && this.isFree(x, z, 0.08)) {
          tufts.push({ x, z, s: 0.65 + rnd() * 0.8, r: rnd() * Math.PI * 2 });
        }
      }
      for (let i = 0; i < flowerN; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (pointInPoly(x, z, a.poly) && this.isFree(x, z, 0.06)) {
          flowers.push({ x, z, s: 0.7 + rnd() * 0.8, c: flowerColors[Math.floor(rnd() * flowerColors.length)] });
        }
      }
    }
    const shrubLimit = this.quality === 'low' ? 50 : this.quality === 'medium' ? 120 : 220;
    const tuftLimit = this.quality === 'low' ? 250 : this.quality === 'medium' ? 700 : 1400;
    const flowerLimit = this.quality === 'low' ? 0 : this.quality === 'medium' ? 160 : 360;
    const shrubList = shrubs.slice(0, shrubLimit);
    const tuftList = tufts.slice(0, tuftLimit);
    const flowerList = flowers.slice(0, flowerLimit);
    if (shrubList.length) {
      const geo = new THREE.IcosahedronGeometry(0.46, 0);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), shrubList.length);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const greens = ['#4f7748', '#5d8850', '#6f9a5a', '#476b40'];
      shrubList.forEach((s, i) => {
        dummy.position.set(s.x, 0.38 * s.s, s.z);
        dummy.rotation.y = s.r;
        dummy.scale.set(s.s, s.s * 0.8, s.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.set(greens[i % greens.length]));
      });
      mesh.castShadow = true;
      mesh.name = 'cespugli';
      this.scene.add(mesh);
      this.shrubMesh = mesh;
    }
    if (tuftList.length) {
      const geo = new THREE.ConeGeometry(0.08, 0.38, 3);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), tuftList.length);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const greens = ['#5d8850', '#6f9a5a', '#7fa164', '#4f7748'];
      tuftList.forEach((s, i) => {
        dummy.position.set(s.x, 0.19 * s.s, s.z);
        dummy.rotation.y = s.r;
        dummy.scale.set(s.s, s.s, s.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.set(greens[i % greens.length]));
      });
      mesh.name = 'ciuffi-erba';
      this.scene.add(mesh);
      this.grassTuftMesh = mesh;
    }
    if (flowerList.length) {
      const geo = new THREE.SphereGeometry(0.075, 5, 4);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), flowerList.length);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      flowerList.forEach((s, i) => {
        dummy.position.set(s.x, 0.22, s.z);
        dummy.scale.setScalar(s.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.set(s.c));
      });
      mesh.name = 'fiori';
      this.scene.add(mesh);
      this.flowerMesh = mesh;
    }

    // lampioni
    const lampPositions = [];
    for (const r of this.city.roads) {
      if (!(r.sidewalk === true || (r.sidewalk == null && ROAD_STYLE[r.kind]?.sidewalk)) || r.w < 6 || r.length < 30) continue;
      const step = 36;
      for (let i = 1; i < r.pts.length; i++) {
        const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i];
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const ux = dx / len, uz = dz / len;
        const nx = -uz, nz = ux;
        for (let d = 12; d < len; d += step) {
          const side = (lampPositions.length % 2) ? 1 : -1;
          const x = ax + ux * d + nx * (r.w / 2 + 1.7) * side;
          const z = az + uz * d + nz * (r.w / 2 + 1.7) * side;
          if (this.isFree(x, z, 0.35)) lampPositions.push({ x, z, r: Math.atan2(dx, dz) });
        }
      }
    }
    for (const [x, z] of [[-320, 10], [-305, 18], [-335, 20]]) {
      if (this.isFree(x, z, 0.35)) lampPositions.push({ x, z, r: 0 });
    }
    const lamps = lampPositions.slice(0, this.quality === 'low' ? 120 : 260);
    this._lampSpots = lamps;
    if (lamps.length) {
      const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 4.4, 7);
      poleGeo.translate(0, 2.2, 0);
      const armGeo = new THREE.BoxGeometry(0.9, 0.08, 0.08);
      armGeo.translate(0.42, 4.38, 0);
      const mergedPole = mergeGeometries([poleGeo, armGeo], false);
      const poleMesh = new THREE.InstancedMesh(mergedPole, new THREE.MeshLambertMaterial({ color: '#2f3632' }), lamps.length);
      const bulbGeo = new THREE.SphereGeometry(0.17, 8, 6);
      this.bulbMesh = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: '#ffe6a6' }), lamps.length);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < lamps.length; i++) {
        const l = lamps[i];
        dummy.position.set(l.x, 0, l.z);
        dummy.rotation.y = l.r;
        dummy.updateMatrix();
        poleMesh.setMatrixAt(i, dummy.matrix);
        dummy.position.set(l.x + Math.cos(l.r) * 0.8, 4.3, l.z + Math.sin(l.r) * 0.8);
        dummy.rotation.y = 0;
        dummy.updateMatrix();
        this.bulbMesh.setMatrixAt(i, dummy.matrix);
      }
      poleMesh.castShadow = true;
      poleMesh.instanceMatrix.needsUpdate = true;
      this.bulbMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(poleMesh, this.bulbMesh);
    }

    // panchine nei parchi e nelle piazze
    const benchSpots = [];
    for (const a of this.city.areas) {
      if (!['park', 'square', 'grass'].includes(a.kind)) continue;
      const bounds = polygonBounds(a.poly);
      const n = clamp(Math.round(a.area / 5000), 1, 4);
      for (let i = 0; i < n; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (pointInPoly(x, z, a.poly) && this.isFree(x, z, 0.8)) benchSpots.push({ x, z, r: rnd() * Math.PI * 2 });
      }
    }
    for (const [x, z, r] of [[-325, 15, 0.4], [-340, 25, -0.8], [-330, 5, 1.9], [-310, 30, 0.2]]) {
      if (this.isFree(x, z, 0.8)) benchSpots.push({ x, z, r });
    }
    this._benchSpots = benchSpots;
    if (benchSpots.length) {
      const parts = [];
      const addBox = (w, h, d, x, y, z) => {
        const g = new THREE.BoxGeometry(w, h, d);
        g.translate(x, y, z);
        parts.push(g);
      };
      addBox(1.7, 0.12, 0.5, 0, 0.45, 0);
      addBox(1.7, 0.5, 0.1, 0, 0.68, -0.22);
      addBox(0.08, 0.45, 0.45, -0.65, 0.22, 0);
      addBox(0.08, 0.45, 0.45, 0.65, 0.22, 0);
      const merged = mergeGeometries(parts, false);
      const benchMesh = new THREE.InstancedMesh(merged, new THREE.MeshLambertMaterial({ color: '#8b6848' }), benchSpots.length);
      const dummy = new THREE.Object3D();
      benchSpots.forEach((b, i) => {
        dummy.position.set(b.x, 0, b.z);
        dummy.rotation.y = b.r;
        dummy.updateMatrix();
        benchMesh.setMatrixAt(i, dummy.matrix);
      });
      benchMesh.castShadow = true;
      benchMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(benchMesh);
    }

    // dissuasori lungo le strade pedonali
    const bollards = [];
    for (const r of this.city.roads) {
      if (!['pedestrian', 'living_street'].includes(r.kind) || r.w < 4 || r.length < 25) continue;
      for (let i = 1; i < r.pts.length; i++) {
        const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i];
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const ux = dx / len, uz = dz / len;
        const nx = -uz, nz = ux;
        for (let d = 8; d < len; d += 9) {
          for (const side of [-1, 1]) {
            const x = ax + ux * d + nx * (r.w / 2 + 0.35) * side;
            const z = az + uz * d + nz * (r.w / 2 + 0.35) * side;
            if (this.isFree(x, z, 0.18)) bollards.push({ x, z });
          }
        }
      }
    }
    const bollardList = bollards.slice(0, 220);
    this._bollardSpots = bollardList;
    if (bollardList.length) {
      const bg = new THREE.CylinderGeometry(0.08, 0.12, 0.72, 6);
      bg.translate(0, 0.36, 0);
      const bm = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial({ color: '#b9ab94' }), bollardList.length);
      const dummy = new THREE.Object3D();
      bollardList.forEach((b, i) => {
        dummy.position.set(b.x, 0, b.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bm.setMatrixAt(i, dummy.matrix);
      });
      bm.castShadow = true;
      bm.instanceMatrix.needsUpdate = true;
      this.scene.add(bm);
    }

    // auto parcheggiate
    const colors = ['#c2684b', '#4f8fa8', '#d9c9a8', '#5c6b5f', '#9a4a34', '#d7d2c7', '#b08d57'];
    let parked = 0;
    for (const r of this.city.roads) {
      if (parked >= (this.quality === 'low' ? 4 : this.quality === 'medium' ? 8 : 12)) break;
      if (!['residential', 'service', 'unclassified'].includes(r.kind) || r.length < 60) continue;
      if (rnd() > 0.55) continue;
      const i = 1 + Math.floor(rnd() * (r.pts.length - 2));
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1] || r.pts[i - 1];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 1) continue;
      const x = ax - dz / len * (r.w / 2 + 1.3);
      const z = az + dx / len * (r.w / 2 + 1.3);
      if (!this.isFree(x, z, 1.5)) continue;
      const car = makeCar({ color: colors[Math.floor(rnd() * colors.length)], parked: true });
      car.position.set(x, 0.05, z);
      car.rotation.y = Math.atan2(dx, dz) + (rnd() > 0.5 ? 0 : Math.PI);
      car.scale.setScalar(0.92);
      this.scene.add(car);
      this._parkedCars.push({ x, z });
      parked++;
    }
  }

  _addInstanced(geometry, material, items, { yOffset = 0, castShadow = true, name = '' } = {}) {
    if (!geometry || !items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      dummy.position.set(item.x, (item.y || 0) + yOffset, item.z);
      dummy.rotation.set(0, item.rot || 0, 0);
      dummy.scale.setScalar(item.scale || 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.castShadow = castShadow;
    mesh.name = name;
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    return mesh;
  }

  _buildRoadSigns() {
    const signs = this.city.roadSigns || [];
    if (!signs.length) return;

    const signTexture = (kind) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 128, 128);
      if (kind === 'stop') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = Math.PI / 8 + i * Math.PI / 4;
          const x = 64 + Math.cos(a) * 58;
          const y = 64 + Math.sin(a) * 58;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#b83b32';
        ctx.fill();
        ctx.strokeStyle = '#fff8e8';
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.fillStyle = '#fff8e8';
        ctx.font = '700 27px Anton, "Arial Narrow", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STOP', 64, 66);
      } else {
        ctx.beginPath();
        ctx.moveTo(64, 118);
        ctx.lineTo(12, 24);
        ctx.lineTo(116, 24);
        ctx.closePath();
        ctx.fillStyle = '#fff8e8';
        ctx.fill();
        ctx.strokeStyle = '#b83b32';
        ctx.lineWidth = 11;
        ctx.stroke();
        ctx.fillStyle = '#b83b32';
        ctx.font = '700 17px Oswald, "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DARE', 64, 54);
        ctx.fillText('PRECEDENZA', 64, 72);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    };

    const items = [];
    for (const sign of signs) {
      const info = this._nearestRoadInfo(sign.x, sign.z);
      if (!info || info.d > 18) continue;
      items.push({
        x: sign.x,
        z: sign.z,
        y: groundHeightAt(this.terrain, sign.x, sign.z, 0),
        rot: Math.atan2(info.x - sign.x, info.z - sign.z),
        type: sign.type
      });
    }
    if (!items.length) return;

    const poleGeo = new THREE.CylinderGeometry(0.042, 0.055, 2.35, 6);
    poleGeo.translate(0, 1.175, 0);
    this._addInstanced(poleGeo, new THREE.MeshLambertMaterial({ color: '#3a423c' }), items, {
      name: 'pali-segnali'
    });

    const panelGeo = new THREE.PlaneGeometry(0.82, 0.82);
    const byType = {
      stop: items.filter(i => i.type === 'stop'),
      give_way: items.filter(i => i.type !== 'stop')
    };
    for (const [kind, list] of Object.entries(byType)) {
      if (!list.length) continue;
      const material = new THREE.MeshBasicMaterial({
        map: signTexture(kind === 'stop' ? 'stop' : 'give'),
        side: THREE.DoubleSide,
        alphaTest: 0.15
      });
      this._addInstanced(panelGeo, material, list, { yOffset: 2.48, name: `segnali-${kind}` });
    }

    // Linee di arresto e dare precedenza.
    const positions = [];
    const addLine = (x, z, kind) => {
      const info = this._nearestRoadInfo(x, z);
      if (!info || info.d > 18) return;
      const half = Math.min(8, info.w / 2 - 0.35);
      if (half < 1.2) return;
      const ux = info.ux;
      const uz = info.uz;
      const nx = -uz;
      const nz = ux;
      const y = 0.105;
      if (kind === 'stop') {
        const thickness = 0.38;
        addQuad(positions,
          info.x + nx * half + ux * thickness / 2, y, info.z + nz * half + uz * thickness / 2,
          info.x - nx * half + ux * thickness / 2, y, info.z - nz * half + uz * thickness / 2,
          info.x - nx * half - ux * thickness / 2, y, info.z - nz * half - uz * thickness / 2,
          info.x + nx * half - ux * thickness / 2, y, info.z + nz * half - uz * thickness / 2);
      } else {
        const count = 5;
        const step = (half * 2) / count;
        for (let i = 0; i < count; i++) {
          const offset = -half + step * (i + 0.5);
          const centerX = info.x + nx * offset;
          const centerZ = info.z + nz * offset;
          const segHalf = step * 0.28;
          const thickness = 0.16;
          addQuad(positions,
            centerX + nx * segHalf + ux * thickness / 2, y, centerZ + nz * segHalf + uz * thickness / 2,
            centerX - nx * segHalf + ux * thickness / 2, y, centerZ - nz * segHalf + uz * thickness / 2,
            centerX - nx * segHalf - ux * thickness / 2, y, centerZ - nz * segHalf - uz * thickness / 2,
            centerX + nx * segHalf - ux * thickness / 2, y, centerZ + nz * segHalf - uz * thickness / 2);
        }
      }
    };
    for (const sign of signs) addLine(sign.x, sign.z, sign.type);
    for (const signal of this.city.trafficSignals || []) addLine(signal.x, signal.z, 'stop');
    if (positions.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#e8ddc4' }));
      mesh.name = 'segnaletica-orizzontale';
      this.scene.add(mesh);
    }
  }

  _buildParkingSigns() {
    const lots = (this.city.areas || [])
      .filter(a => a.kind === 'parking' && a.area > 600 && a.poly?.length >= 3)
      .sort((a, b) => (Number(Boolean(b.name)) - Number(Boolean(a.name))) || b.area - a.area);
    if (!lots.length) return;
    const limit = this.quality === 'low' ? 6 : this.quality === 'medium' ? 10 : 16;
    const items = [];
    for (const area of lots) {
      if (items.length >= limit) break;
      const centroid = polygonCentroid(area.poly);
      const cx = centroid.x;
      const cz = centroid.z;
      const info = this._nearestRoadInfo(cx, cz);
      if (!info || info.d > 55) continue;
      let best = null;
      for (const [px, pz] of area.poly) {
        const d = Math.hypot(px - info.x, pz - info.z);
        if (!best || d < best.d) best = { x: px, z: pz, d };
      }
      if (!best) continue;
      const x = best.x + (cx - best.x) * 0.16;
      const z = best.z + (cz - best.z) * 0.16;
      if (items.some(item => Math.hypot(item.x - x, item.z - z) < 16)) continue;
      if (!this.isFree(x, z, 0.55)) continue;
      items.push({
        x, z,
        y: groundHeightAt(this.terrain, x, z, 0),
        rot: Math.atan2(info.x - x, info.z - z)
      });
    }
    if (!items.length) return;

    const poleGeo = new THREE.CylinderGeometry(0.045, 0.055, 2.3, 6);
    poleGeo.translate(0, 1.15, 0);
    this._addInstanced(poleGeo, new THREE.MeshLambertMaterial({ color: '#3a423c' }), items, {
      name: 'pali-parcheggi'
    });

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2f6fa8';
    ctx.fillRect(6, 6, 116, 116);
    ctx.strokeStyle = '#f4ebda';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 108, 108);
    ctx.fillStyle = '#f4ebda';
    ctx.font = '700 88px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 64, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this._addInstanced(
      new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, alphaTest: 0.12 }),
      items,
      { yOffset: 2.34, name: 'segnali-parcheggi' }
    );
  }

  _buildExtraLightPools() {
    const lamps = this._lampSpots || [];
    if (!lamps.length) return;
    if (!this.lightPoolMaterial) {
      this.lightPoolMaterial = new THREE.MeshBasicMaterial({
        map: createGlowTexture('rgba(255,225,150,1)'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
    }
    const pool = new THREE.PlaneGeometry(4.8, 4.8);
    pool.rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(pool, this.lightPoolMaterial, lamps.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < lamps.length; i++) {
      const lamp = lamps[i];
      const rot = lamp.r || 0;
      dummy.position.set(
        lamp.x + Math.cos(rot) * 0.8,
        0.098,
        lamp.z + Math.sin(rot) * 0.8
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.88 + (i % 5) * 0.035);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.name = 'pozze-luce-strade';
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    this.extraLightPools = mesh;
  }

  _buildMarket() {
    const count = this.quality === 'low' ? 2 : this.quality === 'medium' ? 4 : 5;
    const rnd = seededRandom(505);
    const centerX = 2;
    const centerZ = -32;
    const spacing = 3.7;
    const stalls = [];
    for (let i = 0; i < count; i++) {
      const x = centerX + (i - (count - 1) / 2) * spacing;
      const z = centerZ;
      if (!this.isFree(x, z, 1.75)) continue;
      if (this._benchSpots?.some(b => Math.hypot(b.x - x, b.z - z) < 3.2)) continue;
      stalls.push({ x, z, rot: 0 });
    }
    if (stalls.length < 2) return;

    const group = new THREE.Group();
    group.name = 'mercato-piazza';
    const wood = new THREE.MeshLambertMaterial({ color: '#7b5a3e' });
    const counterMat = new THREE.MeshLambertMaterial({ color: '#a77a58' });
    const clothMat = new THREE.MeshLambertMaterial({ color: '#efe6d6' });
    const canopyCanvas = document.createElement('canvas');
    canopyCanvas.width = 128;
    canopyCanvas.height = 64;
    const canopyCtx = canopyCanvas.getContext('2d');
    canopyCtx.fillStyle = '#f4ebda';
    canopyCtx.fillRect(0, 0, 128, 64);
    canopyCtx.fillStyle = '#b83b32';
    for (let i = 0; i < 8; i += 2) canopyCtx.fillRect(i * 16, 0, 16, 64);
    const canopyTex = new THREE.CanvasTexture(canopyCanvas);
    canopyTex.colorSpace = THREE.SRGBColorSpace;
    const canopyMat = new THREE.MeshLambertMaterial({ map: canopyTex });
    const produce = ['#6f8b5f', '#d7b45a', '#c2684b', '#8f4a3f', '#87915a'];
    const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffd98a' });

    for (let index = 0; index < stalls.length; index++) {
      const stall = stalls[index];
      const stallGroup = new THREE.Group();
      stallGroup.position.set(stall.x, groundHeightAt(this.terrain, stall.x, stall.z, 0), stall.z);
      stallGroup.rotation.y = stall.rot;
      for (const px of [-1.25, 1.25]) {
        for (const pz of [-0.6, 0.6]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.35, 6), wood);
          post.position.set(px, 1.175, pz);
          post.castShadow = true;
          stallGroup.add(post);
        }
      }
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 1.15), counterMat);
      counter.position.y = 1.0;
      counter.castShadow = true;
      stallGroup.add(counter);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.86, 0.06), clothMat);
      cloth.position.set(0, 0.57, 0.58);
      cloth.castShadow = true;
      stallGroup.add(cloth);
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.09, 0.55), wood);
      shelf.position.set(0, 1.52, -0.4);
      shelf.castShadow = true;
      stallGroup.add(shelf);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 1.85), canopyMat);
      canopy.position.y = 2.38;
      canopy.castShadow = true;
      stallGroup.add(canopy);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.18, 0.1), canopyMat);
      trim.position.set(0, 2.29, 0.88);
      stallGroup.add(trim);
      for (let k = 0; k < 5; k++) {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.22, 0.3),
          new THREE.MeshLambertMaterial({ color: produce[(index + k) % produce.length] })
        );
        crate.position.set(-0.92 + k * 0.46, 1.13, 0.08);
        crate.castShadow = true;
        stallGroup.add(crate);
      }
      for (const bx of [-0.7, 0.7]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), bulbMat);
        bulb.position.set(bx, 2.06, 0.12);
        stallGroup.add(bulb);
      }
      group.add(stallGroup);
      this.addBoxCollider(stall.x, stall.z, 2.9, 1.65, 'banco mercato');
    }

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const signCtx = signCanvas.getContext('2d');
    signCtx.fillStyle = '#1f5a3f';
    signCtx.fillRect(0, 0, 512, 128);
    signCtx.strokeStyle = '#f4ebda';
    signCtx.lineWidth = 6;
    signCtx.strokeRect(4, 4, 504, 120);
    signCtx.fillStyle = '#f4ebda';
    signCtx.font = '700 58px Anton, "Arial Narrow", sans-serif';
    signCtx.textAlign = 'center';
    signCtx.textBaseline = 'middle';
    signCtx.fillText('MERCATO', 256, 55);
    signCtx.font = '600 24px Oswald, "Trebuchet MS", sans-serif';
    signCtx.fillStyle = '#e7b95a';
    signCtx.fillText('PIAZZA GARIBALDI', 256, 96);
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.3, 0.83),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    sign.position.set(centerX, 2.3, centerZ + 3.1);
    group.add(sign);
    for (const x of [centerX - 1.5, centerX + 1.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.2, 6), wood);
      pole.position.set(x, 1.1, centerZ + 3.1);
      group.add(pole);
    }
    this.scene.add(group);
    this.marketGroup = group;

    if (this.lightPoolMaterial) {
      const poolGeo = new THREE.PlaneGeometry(7, 4.2);
      poolGeo.rotateX(-Math.PI / 2);
      for (const px of [-7.4, 0, 7.4]) {
        const pool = new THREE.Mesh(poolGeo, this.lightPoolMaterial);
        pool.position.set(centerX + px, 0.106, centerZ);
        this.scene.add(pool);
      }
    }

    this.marketLight = new THREE.PointLight('#ffd58a', 0, 27, 1.7);
    this.marketLight.position.set(centerX, 3.4, centerZ + 1.2);
    this.scene.add(this.marketLight);

    const shirts = ['#c2684b', '#4f8fa8', '#7c8d5b', '#d9c9a8', '#9a4a34', '#6f8b5f'];
    const pants = ['#2f4a3c', '#3a3f46', '#5b4a3a'];
    for (let i = 0; i < stalls.length; i++) {
      if (this.marketPeople.length >= (this.quality === 'low' ? 2 : this.quality === 'medium' ? 6 : 8)) break;
      const stall = stalls[i];
      const vendor = makePerson({
        shirt: shirts[Math.floor(rnd() * shirts.length)],
        pants: pants[Math.floor(rnd() * pants.length)]
      });
      vendor.position.set(stall.x + (rnd() - 0.5) * 0.8, 0, stall.z - 0.95);
      vendor.rotation.y = 0;
      vendor.scale.setScalar(0.96);
      this.scene.add(vendor);
      this.marketPeople.push({ person: vendor, phase: rnd() * Math.PI * 2, baseRot: 0 });

      if (this.marketPeople.length >= (this.quality === 'low' ? 2 : this.quality === 'medium' ? 6 : 8)) continue;
      const shopper = makePerson({
        shirt: shirts[Math.floor(rnd() * shirts.length)],
        pants: pants[Math.floor(rnd() * pants.length)]
      });
      shopper.position.set(stall.x + (rnd() - 0.5) * 1.0, 0, stall.z + 1.5);
      shopper.rotation.y = Math.PI;
      shopper.scale.setScalar(0.96);
      this.scene.add(shopper);
      this.marketPeople.push({ person: shopper, phase: rnd() * Math.PI * 2, baseRot: Math.PI });
    }
  }

  _buildSeatedPeople() {
    const benches = (this._benchSpots || []).filter(b => b && Number.isFinite(b.x) && Number.isFinite(b.z));
    if (!benches.length) return;
    const target = this.quality === 'low' ? 5 : this.quality === 'medium' ? 10 : 16;
    const rnd = seededRandom(606);
    const near = benches.filter(b => Math.hypot(b.x - WORLD.spawn.x, b.z - WORLD.spawn.z) < 900);
    const pool = near.length >= 6 ? near : benches;
    const order = pool.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const shirts = ['#c2684b', '#4f8fa8', '#7c8d5b', '#d9c9a8', '#9a4a34', '#5c6b5f'];
    const pants = ['#2f4a3c', '#3a3f46', '#5b4a3a', '#4e5a63'];
    for (const bench of order) {
      if (this.seatedPeople.length >= target) break;
      const rot = bench.r ?? bench.rot ?? 0;
      const benchY = bench.y ?? groundHeightAt(this.terrain, bench.x, bench.z, 0);
      const two = this.seatedPeople.length + 1 < target && rnd() > 0.55;
      const offsets = two ? [-0.4, 0.4] : [0];
      for (const offset of offsets) {
        if (this.seatedPeople.length >= target) break;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const x = bench.x + cos * offset + sin * 0.07;
        const z = bench.z - sin * offset + cos * 0.07;
        const person = makePerson({
          shirt: shirts[Math.floor(rnd() * shirts.length)],
          pants: pants[Math.floor(rnd() * pants.length)]
        });
        person.position.set(x, benchY - 0.2, z);
        person.rotation.y = rot;
        person.scale.setScalar(0.95);
        const limbs = person.userData.limbs;
        if (limbs) {
          limbs.legL.position.set(0.12, 0.6, 0.15);
          limbs.legR.position.set(-0.12, 0.6, 0.15);
          limbs.legL.rotation.x = -1.1;
          limbs.legR.rotation.x = -1.1;
          limbs.armL.rotation.x = -0.28;
          limbs.armR.rotation.x = -0.28;
        }
        this.scene.add(person);
        this.seatedPeople.push({ person, baseRot: rot, phase: rnd() * Math.PI * 2 });
      }
    }
  }

  _buildParkedVehicles() {
    const rnd = seededRandom(808);
    const colors = ['#c2684b', '#4f8fa8', '#d9c9a8', '#5c6b5f', '#9a4a34', '#d7d2c7', '#b08d57'];
    const carLimit = this.quality === 'low' ? 2 : this.quality === 'medium' ? 4 : 6;
    const lots = (this.city.areas || [])
      .filter(a => a.kind === 'parking' && a.area > 700 && a.poly?.length >= 3)
      .map(a => {
        const centroid = polygonCentroid(a.poly);
        return { area: a, x: centroid.x, z: centroid.z };
      })
      .filter(lot => Math.hypot(lot.x - WORLD.spawn.x, lot.z - WORLD.spawn.z) < 1200)
      .sort((a, b) => b.area.area - a.area.area);
    let cars = 0;
    for (const lot of lots) {
      if (cars >= carLimit) break;
      const info = this._nearestRoadInfo(lot.x, lot.z);
      const baseRot = info ? Math.atan2(info.ux, info.uz) + Math.PI / 2 : 0;
      const bounds = polygonBounds(lot.area.poly);
      for (let i = 0; i < 2 && cars < carLimit; i++) {
        let placed = false;
        for (let attempt = 0; attempt < 30 && !placed; attempt++) {
          const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
          const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
          if (!pointInPoly(x, z, lot.area.poly) || !this.isFree(x, z, 1.8)) continue;
          if (this._parkedCars.some(car => Math.hypot(car.x - x, car.z - z) < 5)) continue;
          if (this.vehicleSpawns.some(v => Math.hypot(v.x - x, v.z - z) < 8)) continue;
          if (this._benchSpots?.some(b => Math.hypot(b.x - x, b.z - z) < 2.5)) continue;
          if (this.treeSpots?.some(t => Math.hypot(t.x - x, t.z - z) < 3)) continue;
          const car = makeCar({ color: colors[Math.floor(rnd() * colors.length)], parked: true });
          car.position.set(x, 0.05, z);
          car.rotation.y = baseRot + (rnd() > 0.5 ? 0 : Math.PI);
          car.scale.setScalar(0.92);
          this.scene.add(car);
          this._parkedCars.push({ x, z });
          cars++;
          placed = true;
        }
      }
    }

    const vespaLimit = this.quality === 'low' ? 2 : this.quality === 'medium' ? 4 : 6;
    const vespaSpots = [[-300, 12], [-286, -16], [-80, 0], [-8, 78], [34, 96], [190, -98], [420, 142], [700, 205]];
    let vespas = 0;
    for (const [x, z] of vespaSpots) {
      if (vespas >= vespaLimit) break;
      const spot = this.findFreeSpot(x, z, 0.7);
      if (!spot) continue;
      if (this.vehicleSpawns.some(v => Math.hypot(v.x - spot.x, v.z - spot.z) < 6)) continue;
      if (this._parkedCars.some(car => Math.hypot(car.x - spot.x, car.z - spot.z) < 3.5)) continue;
      const vespa = makeVespa({ color: colors[Math.floor(rnd() * colors.length)] });
      vespa.position.set(spot.x, 0.03, spot.z);
      vespa.rotation.y = rnd() * Math.PI * 2;
      vespa.scale.setScalar(0.92);
      this.scene.add(vespa);
      vespas++;
    }
  }

  _buildPets() {
    const rnd = seededRandom(909);
    const dogs = [
      [-234, 613], [300, 800], [25, -22], [-447, 947],
      [32, 897], [210, -92], [-100, 160]
    ];
    const cats = [
      [-300, -3], [-282, 16], [40, 90], [180, 55],
      [-70, 50], [-40, 100], [420, 150]
    ];
    const dogLimit = this.quality === 'low' ? 2 : this.quality === 'medium' ? 3 : 4;
    const catLimit = this.quality === 'low' ? 2 : this.quality === 'medium' ? 3 : 4;
    const addPet = (makeFn, x, z, type) => {
      const spot = this.findFreeSpot(x, z, type === 'dog' ? 1.0 : 0.65);
      if (!spot) return;
      if (this.vehicleSpawns.some(v => Math.hypot(v.x - spot.x, v.z - spot.z) < 4)) return;
      if (this._parkedBikeSpots?.some(b => Math.hypot(b.x - spot.x, b.z - spot.z) < 3)) return;
      if (this._parkedCars.some(car => Math.hypot(car.x - spot.x, car.z - spot.z) < 3)) return;
      if (this._benchSpots?.some(b => Math.hypot(b.x - spot.x, b.z - spot.z) < 1.2)) return;
      const mesh = makeFn({ color: type === 'dog' ? ['#a9865f', '#7c5c3f', '#d1b58a'][Math.floor(rnd() * 3)] : ['#8c8378', '#b0a294', '#6d645b'][Math.floor(rnd() * 3)] });
      mesh.position.set(spot.x, groundHeightAt(this.terrain, spot.x, spot.z, 0), spot.z);
      mesh.rotation.y = rnd() * Math.PI * 2;
      mesh.scale.setScalar(type === 'dog' ? 0.9 : 0.95);
      this.scene.add(mesh);
      this.pets.push({ mesh, type, phase: rnd() * Math.PI * 2 });
    };
    for (let i = 0; i < Math.min(dogLimit, dogs.length); i++) addPet(makeDog, dogs[i][0], dogs[i][1], 'dog');
    for (let i = 0; i < Math.min(catLimit, cats.length); i++) addPet(makeCat, cats[i][0], cats[i][1], 'cat');
  }

  _buildRainRipples() {
    const rnd = seededRandom(1010);
    const kinds = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified']);
    const roads = (this.city.roads || []).filter(road =>
      kinds.has(road.kind) && road.length > 55 && !road.tunnel && !road.bridge
    );
    if (!roads.length) return;
    const spots = [];
    for (let i = 0; i < 200 && spots.length < 100; i++) {
      const road = roads[Math.floor(rnd() * roads.length)];
      if (!road?.pts || road.pts.length < 2) continue;
      const index = 1 + Math.floor(rnd() * (road.pts.length - 1));
      const [ax, az] = road.pts[index - 1];
      const [bx, bz] = road.pts[index];
      const t = rnd();
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      if (spots.some(spot => Math.hypot(spot.x - x, spot.z - z) < 4)) continue;
      spots.push({ x, z, y: 0.118 + (hashString(String(road.id)) % 9) * 0.0007 });
    }
    if (!spots.length) return;
    const geometry = new THREE.RingGeometry(0.21, 0.31, 14);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: '#d9edf4',
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
    mesh.name = 'increspature-pioggia';
    mesh.visible = false;
    this.scene.add(mesh);
    this.rainRipple = { mesh, spots, dummy: new THREE.Object3D() };
  }

  _updateRainRipples() {
    if (!this.rainRipple?.mesh.visible) return;
    const { mesh, spots, dummy } = this.rainRipple;
    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      const t = (this.time * 0.85 + i * 0.37) % 1;
      dummy.position.set(spot.x, spot.y, spot.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.5 + t * 1.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updateLife() {
    const daylight = this.hour >= 6 && this.hour < 23;
    for (const seated of this.seatedPeople) {
      seated.person.visible = daylight;
      seated.person.rotation.y = seated.baseRot + Math.sin(this.time * 0.42 + seated.phase) * 0.018;
    }
    for (const walker of this.marketPeople) {
      walker.person.visible = daylight;
      const limbs = walker.person.userData.limbs;
      if (limbs) {
        limbs.armL.rotation.x = Math.sin(this.time * 0.9 + walker.phase) * 0.08;
        limbs.armR.rotation.x = Math.sin(this.time * 0.9 + walker.phase + Math.PI) * 0.08;
      }
    }
    for (const pet of this.pets) {
      pet.mesh.visible = pet.type === 'cat' ? true : daylight;
      const tail = pet.mesh.userData.tail;
      if (tail) tail.rotation.y = Math.sin(this.time * (pet.type === 'dog' ? 6.4 : 1.9) + pet.phase) * (pet.type === 'dog' ? 0.5 : 0.28);
      const head = pet.mesh.userData.head;
      if (head) head.rotation.y = Math.sin(this.time * 0.7 + pet.phase) * 0.12;
    }
  }

  _buildCenterBarriers() {
    const barriers = this.city.barriers || [];
    if (!barriers.length) return;
    const parts = { hedge: [], wall: [], fence: [] };
    const box = (arr, w, h, d, x, y, z, rot = 0) => {
      const g = new THREE.BoxGeometry(w, h, d);
      if (rot) g.rotateY(rot);
      g.translate(x, y, z);
      arr.push(g);
    };
    for (const barrier of barriers) {
      const pts = barrier.pts || [];
      if (pts.length < 2) continue;
      const kind = barrier.kind;
      const height = barrier.height > 0
        ? Math.min(2.6, barrier.height)
        : (kind === 'hedge' ? 1.1 : kind === 'wall' ? 1.0 : 1.2);
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1];
        const [bx, bz] = pts[i];
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 0.5) continue;
        const mx = (ax + bx) / 2;
        const mz = (az + bz) / 2;
        const y = groundHeightAt(this.terrain, mx, mz, 0);
        const rot = Math.atan2(-dz, dx);
        if (kind === 'fence') {
          for (let d = 0; d <= len; d += 2.4) {
            const px = ax + (dx / len) * d;
            const pz = az + (dz / len) * d;
            box(parts.fence, 0.08, 1.18, 0.08, px, y + 0.59, pz);
          }
          for (const h of [0.55, 1.1]) {
            box(parts.fence, len, 0.055, 0.055, mx, y + h, mz, rot);
          }
        } else if (kind === 'hedge') {
          box(parts.hedge, len, height, 0.72, mx, y + height / 2, mz, rot);
        } else {
          box(parts.wall, len, height, 0.38, mx, y + height / 2, mz, rot);
        }
      }
    }
    const materials = {
      hedge: new THREE.MeshLambertMaterial({ color: '#4f7748' }),
      wall: new THREE.MeshLambertMaterial({ color: '#b8ad98' }),
      fence: new THREE.MeshLambertMaterial({ color: '#3f4a42' })
    };
    for (const [kind, list] of Object.entries(parts)) {
      if (!list.length) continue;
      const geometry = mergeClean(list);
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, materials[kind]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = `barriere-${kind}`;
      this.scene.add(mesh);
    }
  }

  _buildCenterFurniture() {
    const furniture = this.city.streetFurniture || [];
    if (!furniture.length) return;
    const near = (x, z, list, radius) =>
      (list || []).some(item => Math.hypot(item.x - x, item.z - z) < radius);
    const rotForRoad = (x, z) => {
      const info = this._nearestRoadInfo(x, z);
      return info ? Math.atan2(info.x - x, info.z - z) : 0;
    };
    const prepare = (list, radius = 0.25) => {
      const out = [];
      for (const item of list) {
        if (!this.isFree(item.x, item.z, radius)) continue;
        out.push({
          x: item.x,
          z: item.z,
          y: groundHeightAt(this.terrain, item.x, item.z, 0),
          rot: rotForRoad(item.x, item.z)
        });
      }
      return out;
    };
    const byType = (type) => furniture.filter(item => item.type === type);

    // Panchine OSM, senza duplicare quelle procedurali.
    const benches = [];
    for (const item of byType('bench')) {
      if (near(item.x, item.z, this._benchSpots, 2.2)) continue;
      if (!this.isFree(item.x, item.z, 0.3)) continue;
      benches.push({
        x: item.x, z: item.z,
        y: groundHeightAt(this.terrain, item.x, item.z, 0),
        rot: rotForRoad(item.x, item.z)
      });
    }
    if (benches.length) {
      const parts = [];
      const addBox = (w, h, d, x, y, z) => {
        const g = new THREE.BoxGeometry(w, h, d);
        g.translate(x, y, z);
        parts.push(g);
      };
      addBox(1.7, 0.12, 0.5, 0, 0.45, 0);
      addBox(1.7, 0.5, 0.1, 0, 0.68, -0.22);
      addBox(0.08, 0.45, 0.45, -0.65, 0.22, 0);
      addBox(0.08, 0.45, 0.45, 0.65, 0.22, 0);
      const geometry = mergeClean(parts);
      this._addInstanced(geometry, new THREE.MeshLambertMaterial({ color: '#8b6848' }), benches, {
        name: 'panchine-osm'
      });
      this._benchSpots.push(...benches);
    }

    // Cestini.
    const bins = prepare(byType('waste_basket'), 0.2);
    if (bins.length) {
      const body = new THREE.CylinderGeometry(0.28, 0.32, 0.75, 8);
      body.translate(0, 0.38, 0);
      const lid = new THREE.TorusGeometry(0.29, 0.035, 6, 12);
      lid.rotateX(Math.PI / 2);
      lid.translate(0, 0.78, 0);
      const geometry = mergeClean([body, lid]);
      this._addInstanced(geometry, new THREE.MeshLambertMaterial({ color: '#31533f' }), bins, {
        name: 'cestini-osm'
      });
    }

    // Rastrelliere bici.
    const racks = prepare(byType('bicycle_parking'), 0.2);
    if (racks.length) {
      const parts = [];
      for (const x of [-0.45, 0.45]) {
        const post = new THREE.BoxGeometry(0.07, 0.75, 0.07);
        post.translate(x, 0.375, 0);
        parts.push(post);
      }
      const bar = new THREE.BoxGeometry(0.97, 0.07, 0.07);
      bar.translate(0, 0.75, 0);
      parts.push(bar);
      const geometry = mergeClean(parts);
      this._addInstanced(geometry, new THREE.MeshLambertMaterial({ color: '#3f4a42' }), racks, {
        name: 'rastrelliere-bici'
      });
    }

    // Fontanelle e fontane.
    const fountains = prepare(furniture.filter(item => item.type === 'drinking_water' || item.type === 'fountain'), 0.3);
    if (fountains.length) {
      const base = new THREE.CylinderGeometry(0.55, 0.72, 0.45, 8);
      base.translate(0, 0.22, 0);
      const bowl = new THREE.CylinderGeometry(0.72, 0.55, 0.18, 10);
      bowl.translate(0, 0.52, 0);
      const column = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6);
      column.translate(0, 0.85, 0);
      const geometry = mergeClean([base, bowl, column]);
      this._addInstanced(geometry, new THREE.MeshLambertMaterial({ color: '#b8ad98' }), fountains, {
        name: 'fontane-osm'
      });
      const water = new THREE.CircleGeometry(0.52, 12);
      water.rotateX(-Math.PI / 2);
      water.translate(0, 0.63, 0);
      this._addInstanced(water, new THREE.MeshBasicMaterial({
        color: '#5aa7c7', transparent: true, opacity: 0.72, depthWrite: false
      }), fountains, { castShadow: false, name: 'acqua-fontane' });
    }

    // Dissuasori OSM, senza duplicare quelli procedurali.
    const bollards = [];
    for (const item of byType('bollard')) {
      if (near(item.x, item.z, this._bollardSpots, 1.6)) continue;
      if (!this.isFree(item.x, item.z, 0.14)) continue;
      bollards.push({
        x: item.x, z: item.z,
        y: groundHeightAt(this.terrain, item.x, item.z, 0),
        rot: 0
      });
    }
    if (bollards.length) {
      const geometry = new THREE.CylinderGeometry(0.08, 0.12, 0.72, 6);
      geometry.translate(0, 0.36, 0);
      this._addInstanced(geometry, new THREE.MeshLambertMaterial({ color: '#b9ab94' }), bollards, {
        name: 'dissuasori-osm'
      });
    }

    // Isole ecologiche.
    const recycling = prepare(byType('recycling'), 0.3);
    if (recycling.length) {
      const geometry = new THREE.BoxGeometry(1.2, 1.2, 0.8);
      geometry.translate(0, 0.6, 0);
      this._addInstanced(geometry, new THREE.MeshLambertMaterial({ color: '#2f5a4a' }), recycling, {
        name: 'isole-ecologiche'
      });
    }

    // Lampioni OSM + lampioni lungo le vie pedonali del centro.
    const lamps = [];
    for (const item of byType('street_lamp')) {
      if (near(item.x, item.z, this._lampSpots, 6)) continue;
      if (!this.isFree(item.x, item.z, 0.16)) continue;
      const info = this._nearestRoadInfo(item.x, item.z);
      lamps.push({
        x: item.x, z: item.z,
        y: groundHeightAt(this.terrain, item.x, item.z, 0),
        rot: info ? Math.atan2(-(info.z - item.z), info.x - item.x) : 0
      });
    }
    const lampLimit = this.quality === 'low' ? 28 : this.quality === 'medium' ? 48 : 72;
    const pedestrianKinds = new Set(['pedestrian', 'living_street']);
    const priorityKinds = new Set(['pedestrian', 'living_street', 'cycleway', 'footway', 'path']);
    const priorityRoads = new Set(['Via Camillo Benso di Cavour', 'Via Agostino Berenini']);
    const lampRoads = [...this.city.roads].sort((a, b) =>
      (priorityRoads.has(b.name) ? 1 : 0) - (priorityRoads.has(a.name) ? 1 : 0)
    );
    if (lamps.length < lampLimit) {
      for (const road of lampRoads) {
        const priority = priorityRoads.has(road.name);
        if (!(priority ? priorityKinds : pedestrianKinds).has(road.kind) || road.length < 24) continue;
        for (let i = 1; i < road.pts.length && lamps.length < lampLimit; i++) {
          const [ax, az] = road.pts[i - 1];
          const [bx, bz] = road.pts[i];
          const dx = bx - ax;
          const dz = bz - az;
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          const ux = dx / len;
          const uz = dz / len;
          for (let d = 8; d < len && lamps.length < lampLimit; d += 19) {
            const side = (lamps.length + i) % 2 ? 1 : -1;
            const x = ax + ux * d - uz * (road.w / 2 + 0.8) * side;
            const z = az + uz * d + ux * (road.w / 2 + 0.8) * side;
            if (Math.hypot(x + 267.47, z - 2.67) > 750) continue;
            if (!this.isFree(x, z, 0.16)) continue;
            if (near(x, z, lamps, 7) || near(x, z, this._lampSpots, 7)) continue;
            const info = this._nearestRoadInfo(x, z);
            if (!info) continue;
            lamps.push({
              x, z,
              y: groundHeightAt(this.terrain, x, z, 0),
              rot: Math.atan2(-(info.z - z), info.x - x)
            });
          }
        }
      }
    }
    if (lamps.length) {
      const pole = new THREE.CylinderGeometry(0.07, 0.1, 4.4, 7);
      pole.translate(0, 2.2, 0);
      const arm = new THREE.BoxGeometry(0.9, 0.08, 0.08);
      arm.translate(0.42, 4.38, 0);
      const geometry = mergeClean([pole, arm]);
      this._addInstanced(geometry, new THREE.MeshLambertMaterial({ color: '#2f3632' }), lamps, {
        name: 'lampioni-centro'
      });
      const bulb = new THREE.SphereGeometry(0.12, 8, 6);
      bulb.translate(0.78, 4.32, 0);
      this._addInstanced(bulb, new THREE.MeshBasicMaterial({ color: '#f6d58c' }), lamps, {
        castShadow: false, name: 'lampioni-centro-luci'
      });

      const pool = new THREE.PlaneGeometry(4.8, 4.8);
      pool.rotateX(-Math.PI / 2);
      const poolMaterial = new THREE.MeshBasicMaterial({
        map: createGlowTexture('rgba(255,225,150,1)'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const poolMesh = new THREE.InstancedMesh(pool, poolMaterial, lamps.length);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < lamps.length; i++) {
        const lamp = lamps[i];
        dummy.position.set(
          lamp.x + Math.cos(lamp.rot) * 0.78,
          lamp.y + 0.095,
          lamp.z - Math.sin(lamp.rot) * 0.78
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        poolMesh.setMatrixAt(i, dummy.matrix);
      }
      poolMesh.name = 'pozze-luce-centro';
      this.lightPoolMaterial = poolMaterial;
      this.scene.add(poolMesh);
    }

    // Fermate bus OSM, con pensilina dove indicata.
    const busItems = [];
    for (const item of byType('bus_stop')) {
      if (near(item.x, item.z, this.busStops, 10)) continue;
      if (!this.isFree(item.x, item.z, 0.18)) continue;
      busItems.push({
        x: item.x, z: item.z,
        y: groundHeightAt(this.terrain, item.x, item.z, 0),
        rot: rotForRoad(item.x, item.z),
        shelter: item.shelter === 'yes'
      });
    }
    if (busItems.length) {
      const pole = new THREE.CylinderGeometry(0.05, 0.07, 2.55, 6);
      pole.translate(0, 1.275, 0);
      this._addInstanced(pole, new THREE.MeshLambertMaterial({ color: '#2f4a3c' }), busItems, {
        name: 'pali-fermate-bus'
      });
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1f5a3f';
      ctx.fillRect(0, 0, 512, 160);
      ctx.strokeStyle = '#f4ebda';
      ctx.lineWidth = 7;
      ctx.strokeRect(4, 4, 504, 152);
      ctx.fillStyle = '#f4ebda';
      ctx.font = '700 54px Anton, "Arial Narrow", sans-serif';
      ctx.fillText('FERMATA', 28, 76);
      ctx.font = '600 25px Oswald, "Trebuchet MS", sans-serif';
      ctx.fillText('BUS · FIDENZA', 30, 120);
      ctx.fillStyle = '#e7b95a';
      ctx.fillRect(390, 40, 86, 76);
      ctx.fillStyle = '#1f5a3f';
      ctx.fillRect(402, 58, 62, 28);
      ctx.beginPath();
      ctx.arc(412, 116, 8, 0, Math.PI * 2);
      ctx.arc(454, 116, 8, 0, Math.PI * 2);
      ctx.fill();
      const signTexture = new THREE.CanvasTexture(canvas);
      signTexture.colorSpace = THREE.SRGBColorSpace;
      signTexture.anisotropy = 4;
      const signGeo = new THREE.PlaneGeometry(1.7, 0.54);
      this._addInstanced(signGeo, new THREE.MeshBasicMaterial({
        map: signTexture, side: THREE.DoubleSide
      }), busItems, { yOffset: 2.42, name: 'insegne-fermate-bus' });

      if (this.quality !== 'low') {
        for (const item of busItems) {
          if (!item.shelter) continue;
          const group = new THREE.Group();
          const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 1.3), new THREE.MeshLambertMaterial({ color: '#2f4a3c' }));
          roof.position.y = 2.45;
          roof.castShadow = true;
          group.add(roof);
          for (const x of [-1.2, 1.2]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 6), new THREE.MeshLambertMaterial({ color: '#2f3632' }));
            post.position.set(x, 1.2, -0.42);
            group.add(post);
          }
          const glass = new THREE.Mesh(
            new THREE.PlaneGeometry(2.35, 1.7),
            new THREE.MeshStandardMaterial({ color: '#9fd0dd', transparent: true, opacity: 0.22, roughness: 0.2, metalness: 0.1, side: THREE.DoubleSide })
          );
          glass.position.set(0, 1.25, -0.62);
          group.add(glass);
          const bench = makeBench();
          bench.scale.setScalar(0.72);
          bench.position.set(0, 0, -0.28);
          group.add(bench);
          group.position.set(item.x, item.y, item.z);
          group.rotation.y = item.rot;
          this.scene.add(group);
        }
      }
    }
  }

  _buildCenterTerraces() {
    const venues = this.venues || [];
    const venueNames = new Set(venues.map(venue => venue.name));
    const candidates = (this.city.pois || []).filter(poi =>
      ['bar', 'cafe', 'restaurant', 'pub'].includes(poi.subtype) &&
      poi.name &&
      !venueNames.has(poi.name) &&
      Math.hypot(poi.x + 267.47, poi.z - 2.67) < 750
    );
    const limit = this.quality === 'low' ? 2 : this.quality === 'medium' ? 4 : 6;
    const placed = [];
    for (const poi of candidates) {
      if (placed.length >= limit) break;
      if (venues.some(venue => Math.hypot(venue.x - poi.x, venue.z - poi.z) < 20)) continue;
      const sign = this.poiSigns?.find(entry => entry.poi.id === poi.id);
      if (!sign) continue;
      const nx = Math.sin(sign.rotation);
      const nz = Math.cos(sign.rotation);
      const spot = this.isFree(sign.x + nx * 2.8, sign.z + nz * 2.8, 1.4)
        ? { x: sign.x + nx * 2.8, z: sign.z + nz * 2.8 }
        : this.findFreeSpot(sign.x + nx * 2.8, sign.z + nz * 2.8, 1.4);
      if (!spot) continue;
      if (placed.some(item => Math.hypot(item.x - spot.x, item.z - spot.z) < 16)) continue;
      placed.push(spot);
      const group = new THREE.Group();
      group.position.set(spot.x, groundHeightAt(this.terrain, spot.x, spot.z, 0), spot.z);
      group.rotation.y = sign.rotation;
      const terrace = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 3.2),
        new THREE.MeshLambertMaterial({ color: '#9b9487', transparent: true, opacity: 0.82 })
      );
      terrace.rotation.x = -Math.PI / 2;
      terrace.position.y = 0.05;
      terrace.receiveShadow = true;
      group.add(terrace);
      const dark = new THREE.MeshLambertMaterial({ color: '#2f3632' });
      const tableMat = new THREE.MeshLambertMaterial({ color: '#efe6d6' });
      const chairMat = new THREE.MeshLambertMaterial({ color: '#5c4a3a' });
      const umbrellaMat = new THREE.MeshLambertMaterial({ color: poi.subtype === 'restaurant' ? '#8a3f2f' : '#4f6b8a' });
      for (const tx of [-1.15, 1.15]) {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), tableMat);
        top.position.set(tx, 0.74, 0.65);
        top.castShadow = true;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 6), dark);
        pole.position.set(tx, 0.36, 0.65);
        const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.4, 10), umbrellaMat);
        umbrella.position.set(tx, 2.3, 0.65);
        umbrella.castShadow = true;
        const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 6), dark);
        umbrellaPole.position.set(tx, 1.1, 0.65);
        group.add(top, pole, umbrella, umbrellaPole);
        for (const side of [-1, 1]) {
          const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.4), chairMat);
          chair.position.set(tx + side * 0.9, 0.21, 0.65);
          chair.castShadow = true;
          group.add(chair);
        }
      }
      const shirts = ['#c2684b', '#4f8fa8', '#7c8d5b'];
      for (let i = 0; i < 2; i++) {
        const person = makePerson({ shirt: shirts[i % shirts.length], pants: '#3a3f46' });
        person.position.set(i ? 0.8 : -0.7, 0.04, i ? 0.15 : 1.2);
        person.rotation.y = i ? -1.4 : 1.5;
        group.add(person);
      }
      this.scene.add(group);
    }
  }

  _findAreaSpot(area, radius = 4, avoidTrees = 3) {
    const bounds = polygonBounds(area.poly);
    const rnd = seededRandom(hashString(String(area.id)));
    for (let i = 0; i < 80; i++) {
      const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
      if (!pointInPoly(x, z, area.poly)) continue;
      if (!this.isFree(x, z, radius)) continue;
      if (this.treeSpots?.some(tree => Math.hypot(tree.x - x, tree.z - z) < avoidTrees)) continue;
      if (this._benchSpots?.some(bench => Math.hypot(bench.x - x, bench.z - z) < 2.5)) continue;
      return { x, z };
    }
    return this.findFreeSpot(area.x, area.z, radius);
  }

  _buildPlayground(area, spot) {
    const y = groundHeightAt(this.terrain, spot.x, spot.z, 0);
    const group = new THREE.Group();
    group.position.set(spot.x, y, spot.z);
    group.rotation.y = (hashString(String(area.id)) % 628) / 100;
    const metal = new THREE.MeshLambertMaterial({ color: '#3f4a42' });
    const wood = new THREE.MeshLambertMaterial({ color: '#b07a4e' });
    const red = new THREE.MeshLambertMaterial({ color: '#c2684b' });
    const blue = new THREE.MeshLambertMaterial({ color: '#4f8fa8' });
    const yellow = new THREE.MeshLambertMaterial({ color: '#d7b45a' });
    const add = (mesh, x, py, z, ry = 0) => {
      mesh.position.set(x, py, z);
      mesh.rotation.y = ry;
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };

    // Altalena a due posti.
    for (const x of [-4.6, -0.6]) {
      for (const z of [-1.35, 1.35]) add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 0.12), metal), x, 1.35, z);
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 0.14), metal), -2.6, 2.66, 0);
    for (const x of [-3.8, -1.4]) {
      for (const z of [-0.55, 0.55]) add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.75, 0.04), metal), x, 1.78, z);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.38), yellow), x, 0.86, 0);
    }

    // Scivolo con piattaforma e scaletta.
    const platform = add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 1.7), blue), 3.1, 1.65, 0);
    platform.rotation.y = 0;
    for (const x of [2.4, 3.8]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.65, 0.12), metal), x, 0.82, -0.75);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.65, 0.12), metal), x, 0.82, 0.75);
    }
    for (let i = 1; i <= 4; i++) {
      add(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.08), metal), 3.1, i * 0.3, -1.05);
    }
    const slide = new THREE.Group();
    slide.position.set(3.1, 0.98, 1.95);
    slide.rotation.x = 0.42;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 3.4), red);
    board.castShadow = true;
    slide.add(board);
    for (const x of [-0.56, 0.56]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 3.4), blue);
      rail.position.set(x, 0.12, 0);
      slide.add(rail);
    }
    group.add(slide);

    // Sabbiera.
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.0), new THREE.MeshLambertMaterial({ color: '#d9c48f' }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(-1.2, 0.12, 3.8);
    group.add(sand);
    for (const [w, d, x, z] of [[3.8, 0.24, -1.2, 2.2], [3.8, 0.24, -1.2, 5.4], [0.24, 3.2, -3.1, 3.8], [0.24, 3.2, 0.7, 3.8]]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), wood), x, 0.14, z);
    }

    const bench = makeBench();
    bench.position.set(6.1, 0, 0.5);
    bench.rotation.y = -Math.PI / 2;
    bench.traverse(o => { if (o.isMesh) o.castShadow = true; });
    group.add(bench);
    group.name = `parco-giochi-${area.id}`;
    this.scene.add(group);
  }

  _buildSportsFacility(area) {
    const bounds = polygonBounds(area.poly);
    const spanX = bounds.maxX - bounds.minX;
    const spanZ = bounds.maxZ - bounds.minZ;
    const longX = spanX >= spanZ;
    let football = area.area > 5000;
    let length = football
      ? Math.min(85, Math.max(45, (longX ? spanX : spanZ) * 0.7))
      : Math.min(28, Math.max(20, (longX ? spanX : spanZ) * 0.65));
    let width = football
      ? Math.min(55, Math.max(25, (longX ? spanZ : spanX) * 0.6))
      : Math.min(16, Math.max(12, (longX ? spanZ : spanX) * 0.55));
    const rotation = longX ? 0 : Math.PI / 2;
    const rnd = seededRandom(hashString(String(area.id)) + 17);
    const findClearSpot = (fieldLength, fieldWidth) => {
      for (let i = 0; i < 140; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (!pointInPoly(x, z, area.poly)) continue;
        if (!this.isFree(x, z, 3.2)) continue;
        let clear = true;
        for (let gx = -0.5; gx <= 0.5001 && clear; gx += 0.25) {
          for (let gz = -0.5; gz <= 0.5001 && clear; gz += 0.25) {
            const px = x + Math.cos(rotation) * fieldLength * gx + Math.sin(rotation) * fieldWidth * gz;
            const pz = z - Math.sin(rotation) * fieldLength * gx + Math.cos(rotation) * fieldWidth * gz;
            if (!pointInPoly(px, pz, area.poly) || !this.isFree(px, pz, 0.5)) clear = false;
          }
        }
        if (clear) return { x, z };
      }
      return null;
    };
    let spot = findClearSpot(length, width);
    if (!spot && football) {
      football = false;
      length = Math.min(28, Math.max(18, (longX ? spanX : spanZ) * 0.55));
      width = Math.min(15, Math.max(10, (longX ? spanZ : spanX) * 0.5));
      spot = findClearSpot(length, width);
    }
    if (!spot) return;
    const y = groundHeightAt(this.terrain, spot.x, spot.z, 0);
    const group = new THREE.Group();
    group.position.set(spot.x, y, spot.z);
    group.rotation.y = rotation;
    const white = new THREE.MeshBasicMaterial({ color: '#e8e3d5' });
    const line = (w, d, x, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), white);
      mesh.position.set(x, 0.08, z);
      group.add(mesh);
    };
    const hx = length / 2;
    const hz = width / 2;
    line(length, 0.12, 0, -hz);
    line(length, 0.12, 0, hz);
    line(0.12, width, -hx, 0);
    line(0.12, width, hx, 0);
    line(0.12, width, 0, 0);
    const circle = new THREE.Mesh(new THREE.RingGeometry(5.8, 6.05, 28), white);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.09;
    group.add(circle);
    if (football) {
      const pitch = new THREE.Mesh(
        new THREE.PlaneGeometry(length + 2, width + 2),
        new THREE.MeshLambertMaterial({ color: '#5d8850' })
      );
      pitch.rotation.x = -Math.PI / 2;
      pitch.position.y = 0.035;
      pitch.receiveShadow = true;
      group.add(pitch);
      for (const side of [-1, 1]) {
        const goal = new THREE.Group();
        for (const z of [-3.66, 3.66]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.44, 6), white);
          post.position.set(0, 1.22, z);
          post.castShadow = true;
          goal.add(post);
        }
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 7.4), white);
        bar.position.y = 2.44;
        bar.castShadow = true;
        goal.add(bar);
        goal.position.set(side * (hx - 0.6), 0, 0);
        group.add(goal);
      }
    } else {
      const court = new THREE.Mesh(
        new THREE.PlaneGeometry(length, width),
        new THREE.MeshLambertMaterial({ color: '#6f7a76' })
      );
      court.rotation.x = -Math.PI / 2;
      court.position.y = 0.04;
      court.receiveShadow = true;
      group.add(court);
      for (const side of [-1, 1]) {
        const hoop = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6), new THREE.MeshLambertMaterial({ color: '#3f4a42' }));
        pole.position.set(side * (hx - 0.8), 1.6, 0);
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 1.8), white);
        board.position.set(side * (hx - 0.95), 3.0, 0);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 6, 12), new THREE.MeshLambertMaterial({ color: '#c2684b' }));
        rim.rotation.x = Math.PI / 2;
        rim.position.set(side * (hx - 1.25), 2.85, 0);
        hoop.add(pole, board, rim);
        group.add(hoop);
      }
    }
    const bench = makeBench();
    bench.position.set(0, 0, hz + 2.2);
    bench.rotation.y = Math.PI;
    bench.traverse(o => { if (o.isMesh) o.castShadow = true; });
    group.add(bench);
    group.name = `impianto-sportivo-${area.id}`;
    this.scene.add(group);
  }

  _buildParksAndSports() {
    const playgroundLimit = this.quality === 'low' ? 2 : this.quality === 'medium' ? 3 : 4;
    const parks = this.city.areas
      .filter(a => a.kind === 'park' && a.area > 2500)
      .sort((a, b) => b.area - a.area)
      .slice(0, playgroundLimit);
    for (const area of parks) {
      const spot = this._findAreaSpot(area, 5, 3);
      if (spot) this._buildPlayground(area, spot);
    }
    const sportsLimit = this.quality === 'low' ? 4 : this.quality === 'medium' ? 8 : 12;
    const sports = this.city.areas
      .filter(a => a.kind === 'sport' && a.area > 1200)
      .sort((a, b) => b.area - a.area)
      .slice(0, sportsLimit);
    for (const area of sports) this._buildSportsFacility(area);
  }

  _buildRailDetails() {
    const railLines = this.city.railways
      .map(r => {
        let length = 0;
        for (let i = 1; i < r.pts.length; i++) length += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
        return { r, length };
      })
      .filter(entry => entry.length > 12)
      .sort((a, b) => b.length - a.length);
    if (!railLines.length) return;

    const sleeperLimit = this.quality === 'low' ? 0 : this.quality === 'medium' ? 3500 : 7000;
    const sleepers = [];
    for (const { r } of railLines) {
      for (let i = 1; i < r.pts.length && sleepers.length < sleeperLimit; i++) {
        const [ax, az] = r.pts[i - 1];
        const [bx, bz] = r.pts[i];
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const ux = dx / len;
        const uz = dz / len;
        const rot = Math.atan2(ux, uz);
        for (let d = 0.8; d < len && sleepers.length < sleeperLimit; d += 1.5) {
          sleepers.push({ x: ax + ux * d, z: az + uz * d, y: 0.08, rot });
        }
      }
    }
    if (sleepers.length) {
      this._addInstanced(
        new THREE.BoxGeometry(2.3, 0.1, 0.24),
        new THREE.MeshLambertMaterial({ color: '#6d675d' }),
        sleepers,
        { name: 'traverse-ferrovia' }
      );
    }

    if (this.quality !== 'low') {
      const poleLimit = this.quality === 'medium' ? 80 : 160;
      const poles = [];
      const arms = [];
      const wireLines = [];
      for (const { r, length } of railLines.filter(entry => entry.length > 200).slice(0, 6)) {
        for (let i = 1; i < r.pts.length && poles.length < poleLimit; i++) {
          const [ax, az] = r.pts[i - 1];
          const [bx, bz] = r.pts[i];
          const dx = bx - ax;
          const dz = bz - az;
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          const ux = dx / len;
          const uz = dz / len;
          const nx = -uz;
          const nz = ux;
          const rot = Math.atan2(ux, uz);
          for (let d = 12; d < len && poles.length < poleLimit; d += 35) {
            const side = poles.length % 2 ? 1 : -1;
            const x = ax + ux * d;
            const z = az + uz * d;
            poles.push({ x: x + nx * 2.2 * side, z: z + nz * 2.2 * side, y: 0, rot });
            arms.push({ x: x + nx * 1.1 * side, z: z + nz * 1.1 * side, y: 6.0, rot });
          }
        }
        if (length > 200) {
          const pts = r.pts.map(([x, z]) => new THREE.Vector3(x, 6.15, z));
          wireLines.push(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: '#3a3f3a', transparent: true, opacity: 0.72 })
          ));
        }
      }
      if (poles.length) {
        const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 6.3, 6);
        poleGeo.translate(0, 3.15, 0);
        this._addInstanced(poleGeo, new THREE.MeshLambertMaterial({ color: '#3f4a42' }), poles, { name: 'pali-catenaria' });
        this._addInstanced(
          new THREE.BoxGeometry(2.2, 0.08, 0.08),
          new THREE.MeshLambertMaterial({ color: '#3f4a42' }),
          arms,
          { name: 'bracci-catenaria' }
        );
      }
      for (const line of wireLines) {
        line.name = 'fili-catenaria';
        this.scene.add(line);
      }

      const signals = [];
      const signalSource = railLines.slice(0, 2);
      for (const { r } of signalSource) {
        let travelled = 0;
        for (let i = 1; i < r.pts.length && signals.length < 8; i++) {
          const [ax, az] = r.pts[i - 1];
          const [bx, bz] = r.pts[i];
          const dx = bx - ax;
          const dz = bz - az;
          const len = Math.hypot(dx, dz);
          if (len < 1) continue;
          travelled += len;
          if (travelled > 240) {
            travelled = 0;
            signals.push({ x: bx, z: bz, rot: Math.atan2(dx / len, dz / len) });
          }
        }
      }
      for (const signal of signals) {
        const group = new THREE.Group();
        group.position.set(signal.x, 0, signal.z);
        group.rotation.y = signal.rot;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), new THREE.MeshLambertMaterial({ color: '#3f4a42' }));
        pole.position.y = 2.1;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.25), new THREE.MeshLambertMaterial({ color: '#1d241f' }));
        head.position.set(0, 4.0, 0.08);
        const red = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshBasicMaterial({ color: '#ff5a4e' }));
        red.position.set(0, 4.22, 0.22);
        const green = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshBasicMaterial({ color: '#54e08a' }));
        green.position.set(0, 3.94, 0.22);
        group.add(pole, head, red, green);
        this.scene.add(group);
      }
    }
  }

  _buildRiverDetails() {
    if (this.quality === 'low') return;
    const streams = (this.city.waterways || []).filter(w =>
      ['stream', 'river'].includes(w.kind) && w.pts?.length >= 2
    );
    if (!streams.length) return;
    const reedLimit = this.quality === 'medium' ? 520 : 1000;
    const stoneLimit = this.quality === 'medium' ? 100 : 220;
    const reeds = [];
    const stones = [];
    const rnd = seededRandom(737);
    for (const water of streams) {
      const width = Number(water.w) || (water.kind === 'river' ? 9.5 : 5.6);
      const offset = width / 2 + 1.1;
      for (let i = 1; i < water.pts.length && reeds.length < reedLimit; i++) {
        const [ax, az] = water.pts[i - 1];
        const [bx, bz] = water.pts[i];
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const ux = dx / len;
        const uz = dz / len;
        const nx = -uz;
        const nz = ux;
        for (let d = 4; d < len; d += 7) {
          for (const side of [-1, 1]) {
            if (reeds.length >= reedLimit) break;
            const x = ax + ux * d + nx * offset * side;
            const z = az + uz * d + nz * offset * side;
            if (!this.isFree(x, z, 0.12)) continue;
            reeds.push({
              x, z,
              y: groundHeightAt(this.terrain, x, z, 0) + 0.06,
              rot: rnd() * Math.PI * 2,
              scale: 0.7 + rnd() * 0.8
            });
          }
          if (stones.length < stoneLimit && rnd() < 0.28) {
            const side = rnd() > 0.5 ? 1 : -1;
            const x = ax + ux * d + nx * (offset + 0.8) * side;
            const z = az + uz * d + nz * (offset + 0.8) * side;
            if (this.isFree(x, z, 0.18)) {
              stones.push({
                x, z,
                y: groundHeightAt(this.terrain, x, z, 0) + 0.1,
                rot: rnd() * Math.PI * 2,
                scale: 0.6 + rnd() * 0.8
              });
            }
          }
        }
      }
    }
    if (reeds.length) {
      const reedGeo = new THREE.CylinderGeometry(0.025, 0.06, 0.95, 4);
      reedGeo.translate(0, 0.475, 0);
      this._addInstanced(reedGeo, new THREE.MeshLambertMaterial({ color: '#6f8b5f' }), reeds, {
        name: 'canneti-stirone'
      });
    }
    if (stones.length) {
      const stoneGeo = new THREE.IcosahedronGeometry(0.35, 0);
      this._addInstanced(stoneGeo, new THREE.MeshLambertMaterial({ color: '#8f9188' }), stones, {
        name: 'sassi-argine'
      });
    }
  }

  _buildCountryside() {
    const fields = (this.city.areas || [])
      .filter(a => a.kind === 'farmland' && a.area > 15000)
      .sort((a, b) => b.area - a.area)
      .slice(0, 12);
    const rowLimit = this.quality === 'low' ? 0 : this.quality === 'medium' ? 1200 : 2400;
    const cropBuckets = new Map();
    let rowCount = 0;
    for (const field of fields) {
      if (rowCount >= rowLimit) break;
      const info = this.arnisAreas[String(field.id)];
      const crop = info?.crop || 'wheat';
      if (!cropBuckets.has(crop)) cropBuckets.set(crop, []);
      const rows = cropBuckets.get(crop);
      const bounds = polygonBounds(field.poly);
      const longX = bounds.width >= bounds.depth;
      const rnd = seededRandom(hashString(String(field.id)));
      const step = 6;
      for (let z = bounds.minZ + 3; z < bounds.maxZ && rowCount < rowLimit; z += step) {
        for (let x = bounds.minX + 3; x < bounds.maxX && rowCount < rowLimit; x += 9) {
          if (!pointInPoly(x, z, field.poly)) continue;
          rows.push({
            x, z,
            y: groundHeightAt(this.terrain, x, z, 0) + 0.045,
            rot: longX ? 0 : Math.PI / 2,
            scale: 0.9 + rnd() * 0.35
          });
          rowCount++;
        }
      }
    }
    for (const [crop, rows] of cropBuckets) {
      if (!rows.length) continue;
      const geo = new THREE.BoxGeometry(4.2, 0.09, 0.32);
      assignBlockUV(geo);
      this._addInstanced(geo, this.blockMaterial(crop), rows, { name: `colture-${crop}` });
    }

    // Container e piazzali delle zone industriali.
    const industrial = (this.city.areas || []).filter(a => a.kind === 'industrial');
    const colors = ['#b5503f', '#3f748a', '#5d7a52', '#c99a3f'];
    for (const area of industrial) {
      const bounds = polygonBounds(area.poly);
      const rnd = seededRandom(hashString(String(area.id)));
      for (let i = 0; i < 2; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (!pointInPoly(x, z, area.poly) || !this.isFree(x, z, 3.5)) continue;
        const y = groundHeightAt(this.terrain, x, z, 0);
        const container = new THREE.Mesh(
          new THREE.BoxGeometry(6, 2.5, 2.45),
          new THREE.MeshLambertMaterial({ color: colors[Math.floor(rnd() * colors.length)] })
        );
        container.position.set(x, y + 1.25, z);
        container.rotation.y = rnd() * Math.PI * 2;
        container.castShadow = true;
        container.receiveShadow = true;
        this.scene.add(container);
      }
    }
  }

  _buildLandmarks() {
    this.landmarkGroups = buildLandmarks({ world: this, scene: this.scene, landmarks: this.landmarks, city: this.city });
    // collider per obelisco
    this.addBoxCollider(-13.1, 32, 3.2, 3.2, 'obelisco');
    // piazza: fontana/aiuole
  }

  _signTexture(text, sub = '', { street = false, color = '' } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = street ? 180 : 240;
    const ctx = canvas.getContext('2d');
    const bg = color || (street ? '#24506b' : '#1b241e');
    const fg = '#fff8e8';
    const accent = street ? '#dfeaf2' : '#e7b95a';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = accent;
    ctx.lineWidth = street ? 8 : 10;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    const rawLines = String(text || 'FIDENZA').split('\n');
    const lines = [];
    if (street) {
      for (const line of rawLines) lines.push(line);
    } else {
      for (const line of rawLines) {
        const words = line.trim().split(/\s+/);
        let current = '';
        for (const word of words) {
          if (current && (current + ' ' + word).length > 17) {
            lines.push(current);
            current = word;
          } else {
            current = current ? `${current} ${word}` : word;
          }
        }
        if (current) lines.push(current);
      }
    }
    const limited = lines.slice(0, 3);
    lines.length = 0;
    lines.push(...limited);
    const base = street ? 56 : (lines.length > 2 ? 42 : lines.length > 1 ? 52 : 62);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fg;
    ctx.font = `700 ${base}px Anton, "Arial Narrow", sans-serif`;
    const lineHeight = base * 1.04;
    const total = lines.length * lineHeight + (sub ? 26 : 0);
    let y = (canvas.height - total) / 2 + lineHeight * 0.52;
    for (const line of lines) {
      ctx.fillText(line.toUpperCase(), canvas.width / 2, y);
      y += lineHeight;
    }
    if (sub) {
      ctx.fillStyle = street ? '#dfeaf2' : accent;
      ctx.font = `600 23px Oswald, "Trebuchet MS", sans-serif`;
      ctx.fillText(String(sub).toUpperCase(), canvas.width / 2, y + 4);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    return tex;
  }

  _addSign(x, z, rotation, text, sub = '', { street = false, width = 0, height = 0, scale = 1, color = '' } = {}) {
    const group = new THREE.Group();
    const w = (width || (street ? 1.9 : 4.4)) * scale;
    const h = (height || (street ? 0.54 : 1.35)) * scale;
    const postH = street ? 2.9 : 3.25;
    const panelY = street ? 2.75 : 3.15;
    const postMat = new THREE.MeshLambertMaterial({ color: '#2f3632' });
    for (const px of [-w * 0.36, w * 0.36]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, postH, 6), postMat);
      post.position.set(px, postH / 2, 0);
      post.castShadow = true;
      group.add(post);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.1), new THREE.MeshLambertMaterial({ color: '#1b241e' }));
    back.position.set(0, panelY, -0.06);
    back.castShadow = true;
    group.add(back);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: this._signTexture(text, sub, { street, color }), side: THREE.DoubleSide })
    );
    panel.position.set(0, panelY, 0.01);
    group.add(panel);
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    this.scene.add(group);
    this.signMeshes = this.signMeshes || [];
    this.signMeshes.push(group);
    return group;
  }

  _buildMapProps() {
    const props = this.map.props || [];
    const placedSigns = [];
    for (const p of props) {
      const spot = this.isFree(p.x, p.z, 0.6) ? { x: p.x, z: p.z } : (this.findFreeSpot(p.x, p.z, 0.6) || { x: p.x, z: p.z });
      const scale = p.scale || 1;
      const rot = p.rotation || 0;
      const color = p.color || '';
      switch (p.type) {
        case 'sign':
          this._addSign(spot.x, spot.z, rot, p.text || 'FIDENZA', p.sub || '', { width: p.width, height: p.height, scale, color });
          placedSigns.push((p.text || '').toLowerCase());
          break;
        case 'street-sign':
          this._addSign(spot.x, spot.z, rot, p.text || 'VIA EMILIA', p.sub || 'FIDENZA', { street: true, width: p.width, height: p.height, scale, color });
          placedSigns.push((p.text || '').toLowerCase());
          break;
        case 'tree': {
          const { trunk, foliage } = makeBlockTreeGeometry('oak');
          assignBlockUV(trunk);
          assignBlockUV(foliage);
          const g = new THREE.Group();
          const t = new THREE.Mesh(trunk, this.blockMaterial('oak_log'));
          const f = new THREE.Mesh(foliage, this.blockMaterial('oak_leaves'));
          t.castShadow = f.castShadow = true;
          g.add(t, f);
          g.position.set(spot.x, 0, spot.z);
          g.rotation.y = rot;
          g.scale.setScalar(scale);
          this.scene.add(g);
          break;
        }
        case 'bench': {
          const g = new THREE.Group();
          const wood = new THREE.MeshLambertMaterial({ color: color || '#8a5f3d' });
          const metal = new THREE.MeshLambertMaterial({ color: '#2f3632' });
          const seat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.52), wood);
          seat.position.y = 0.46;
          const back = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.1), wood);
          back.position.set(0, 0.78, -0.22);
          g.add(seat, back);
          for (const x of [-0.72, 0.72]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.46, 0.45), metal);
            leg.position.set(x, 0.23, 0);
            g.add(leg);
          }
          g.position.set(spot.x, 0, spot.z);
          g.rotation.y = rot;
          g.scale.setScalar(scale);
          g.traverse(o => { if (o.isMesh) o.castShadow = true; });
          this.scene.add(g);
          break;
        }
        case 'lamp': {
          const g = new THREE.Group();
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 7), new THREE.MeshLambertMaterial({ color: '#2f3632' }));
          pole.position.y = 2.1;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: color || '#ffe6a6' }));
          bulb.position.y = 4.28;
          g.add(pole, bulb);
          g.position.set(spot.x, 0, spot.z);
          g.rotation.y = rot;
          g.scale.setScalar(scale);
          this.scene.add(g);
          break;
        }
        case 'bollard': {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.85, 8), new THREE.MeshLambertMaterial({ color: color || '#3a423c' }));
          m.position.set(spot.x, 0.43, spot.z);
          m.castShadow = true;
          this.scene.add(m);
          break;
        }
        case 'planter': {
          const g = new THREE.Group();
          const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.7), new THREE.MeshLambertMaterial({ color: color || '#a77a58' }));
          box.position.y = 0.25;
          const bush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshLambertMaterial({ color: '#5d8850' }));
          bush.position.y = 0.64;
          g.add(box, bush);
          g.position.set(spot.x, 0, spot.z);
          g.rotation.y = rot;
          g.scale.setScalar(scale);
          this.scene.add(g);
          break;
        }
        case 'stall': {
          const g = new THREE.Group();
          const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.1), new THREE.MeshLambertMaterial({ color: color || '#b07a4e' }));
          counter.position.y = 0.43;
          const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 1.4), new THREE.MeshLambertMaterial({ color: '#e7b95a' }));
          canopy.position.y = 2.1;
          g.add(counter, canopy);
          for (const x of [-1.1, 1.1]) for (const z of [-0.5, 0.5]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 5), new THREE.MeshLambertMaterial({ color: '#6b4c35' }));
            post.position.set(x, 1.05, z);
            g.add(post);
          }
          g.position.set(spot.x, 0, spot.z);
          g.rotation.y = rot;
          g.scale.setScalar(scale);
          g.traverse(o => { if (o.isMesh) o.castShadow = true; });
          this.scene.add(g);
          break;
        }
        case 'parked-car': {
          const car = makeCar({ color: color || '#7b8b88', parked: true });
          car.position.set(spot.x, 0.05, spot.z);
          car.rotation.y = rot;
          car.scale.setScalar(scale * 0.94);
          this.scene.add(car);
          break;
        }
        default:
          break;
      }
    }

    // Insegne automatiche per i luoghi principali non ancora coperti dal manifest.
    const major = new Set(['duomo', 'teatro', 'comunale', 'porta', 'ponte', 'stazione', 'musini', 'granmadre']);
    for (const l of this.landmarks) {
      if (!major.has(l.model)) continue;
      const text = (l.short || l.name || '').toLowerCase();
      if (!text || placedSigns.some(s => s && (s === text || s.includes(text) || text.includes(s)))) continue;
      const place = this.placesById.get(l.placeId);
      const baseX = place?.beaconX ?? l.x;
      const baseZ = place?.beaconZ ?? l.z;
      const spot = this.findFreeSpot(baseX + 4, baseZ + 4, 1.1) || { x: baseX + 4, z: baseZ + 4 };
      this._addSign(spot.x, spot.z, 0, l.name || l.short, 'Fidenza');
    }
  }

  _barSignTexture(name, hoursLabel = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#102b48';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#6fe3ff';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    // piccola piramide stilizzata
    ctx.fillStyle = '#6fe3ff';
    ctx.beginPath();
    ctx.moveTo(78, 122);
    ctx.lineTo(118, 58);
    ctx.lineTo(158, 122);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#102b48';
    ctx.beginPath();
    ctx.moveTo(118, 84);
    ctx.lineTo(136, 112);
    ctx.lineTo(100, 112);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#eafaff';
    ctx.font = '700 62px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), 190, 100);
    ctx.fillStyle = '#6fe3ff';
    ctx.font = '600 23px Oswald, "Trebuchet MS", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('BAR · TABACCHI · CAFFÈ', 192, 148);
    if (hoursLabel) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#6fe3ff';
      ctx.font = '600 22px Oswald, "Trebuchet MS", sans-serif';
      ctx.fillText(hoursLabel, canvas.width - 26, 148);
      ctx.textAlign = 'left';
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    return tex;
  }

  _buildVenues() {
    for (const venue of this.venues) {
      if (venue.existing) {
        this._buildExistingVenue(venue);
        continue;
      }
      if (venue.type !== 'bar') continue;
      const x = venue.x;
      const z = venue.z;
      const y = groundHeightAt(this.terrain, x, z, 0);
      const group = new THREE.Group();
      group.position.set(x, y, z);

      // Terrazza e parcheggio.
      const terrace = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 15),
        new THREE.MeshLambertMaterial({ color: '#898b80' })
      );
      terrace.rotation.x = -Math.PI / 2;
      terrace.position.set(0, 0.09, 5);
      terrace.receiveShadow = true;
      group.add(terrace);

      // Accesso carrabile verso Via Ferraris.
      const driveway = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 7),
        new THREE.MeshLambertMaterial({ color: '#5f625f' })
      );
      driveway.rotation.x = -Math.PI / 2;
      driveway.position.set(15, 0.095, 3);
      driveway.receiveShadow = true;
      group.add(driveway);

      // Corpo del bar.
      const wall = new THREE.MeshLambertMaterial({ color: '#e6ddca' });
      const dark = new THREE.MeshLambertMaterial({ color: '#24313a' });
      const building = new THREE.Mesh(new THREE.BoxGeometry(12, 3.3, 8), wall);
      building.position.y = 1.65;
      building.castShadow = true;
      building.receiveShadow = true;
      group.add(building);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(13, 0.32, 9), dark);
      roof.position.y = 3.45;
      roof.castShadow = true;
      group.add(roof);

      const facadeBand = new THREE.Mesh(
        new THREE.BoxGeometry(12.25, 0.35, 0.12),
        new THREE.MeshLambertMaterial({ color: venue.color || '#2f6fa8' })
      );
      facadeBand.position.set(0, 2.15, 4.06);
      group.add(facadeBand);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(9.4, 1.5, 0.08),
        new THREE.MeshLambertMaterial({ color: '#8fc7dd' })
      );
      glass.position.set(0, 1.32, 4.08);
      group.add(glass);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 2.5, 0.12),
        new THREE.MeshLambertMaterial({ color: '#2f4a3c' })
      );
      door.position.set(3.9, 1.25, 4.1);
      group.add(door);

      // Insegna principale e insegna laterale.
      const signMat = new THREE.MeshBasicMaterial({ map: this._barSignTexture(venue.name || 'Bar Blu Piramide', venueLabel(venue.hours || {})) });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.25), signMat);
      sign.position.set(0, 2.78, 4.16);
      group.add(sign);
      const sideSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.2), signMat);
      sideSign.position.set(6.08, 2.78, 0);
      sideSign.rotation.y = Math.PI / 2;
      group.add(sideSign);

      // Neon sul tetto.
      const neonMat = new THREE.MeshBasicMaterial({ color: '#6fe3ff' });
      const neonFront = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.08, 0.08), neonMat);
      neonFront.position.set(0, 3.55, 4.1);
      group.add(neonFront);
      const neonSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 8.2), neonMat);
      neonSide.position.set(6.06, 3.55, 0);
      group.add(neonSide);

      // Tenda blu.
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(12.8, 0.14, 2.2),
        new THREE.MeshLambertMaterial({ color: venue.color || '#2f6fa8' })
      );
      awning.position.set(0, 3.62, 5.05);
      awning.castShadow = true;
      group.add(awning);

      // Tavolini, sedie e ombrelloni.
      const tableTop = new THREE.MeshLambertMaterial({ color: '#efe6d6' });
      const chairMat = new THREE.MeshLambertMaterial({ color: '#2f4a3c' });
      const addTable = (tx, tz) => {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 14), tableTop);
        top.position.set(tx, 0.78, tz);
        top.castShadow = true;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.76, 7), dark);
        pole.position.set(tx, 0.38, tz);
        group.add(top, pole);
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI * 2 / 3 + 0.4;
          const chair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.46), chairMat);
          chair.position.set(tx + Math.cos(a) * 1.02, 0.25, tz + Math.sin(a) * 1.02);
          chair.castShadow = true;
          group.add(chair);
        }
      };
      const umbrellaMat = new THREE.MeshLambertMaterial({ color: venue.color || '#2f6fa8' });
      const addUmbrella = (tx, tz) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.55, 7), dark);
        pole.position.set(tx, 1.28, tz);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(1.75, 0.5, 12), umbrellaMat);
        cap.position.set(tx, 2.55, tz);
        cap.castShadow = true;
        group.add(pole, cap);
      };
      for (const [tx, tz] of [[-3.8, 6.4], [0, 6.4], [3.8, 6.4]]) {
        addTable(tx, tz);
        addUmbrella(tx, tz);
      }

      // Fioriere e dettagli.
      for (const [px, pz] of [[-5.6, 4.8], [5.6, 4.8]]) {
        const planter = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.65), new THREE.MeshLambertMaterial({ color: '#a77a58' }));
        planter.position.set(px, 0.28, pz);
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshLambertMaterial({ color: '#5d8850' }));
        bush.position.set(px, 0.72, pz);
        group.add(planter, bush);
      }

      // Auto parcheggiate.
      for (const [cx, cz, color] of [[-13, 6, '#4f8fa8'], [-13, 10.5, '#c2684b']]) {
        const car = makeCar({ color, parked: true });
        car.position.set(cx, 0.05, cz);
        car.rotation.y = Math.PI / 2;
        car.scale.setScalar(0.94);
        group.add(car);
      }

      this.scene.add(group);
      this.addBoxCollider(x, z, 12, 8, venue.name || 'Bar Blu Piramide');
      venue.group = group;
      venue.terrace = terrace;
      venue.signMaterial = signMat;
      venue.neonMeshes = [neonFront, neonSide];
      venue.open = true;
      this.barBlue = venue;

      const light = new THREE.PointLight('#6fe3ff', 0, 26);
      light.position.set(x, 4.2, z + 4.8);
      this.scene.add(light);
      venue.light = light;
      this.barLight = light;
    }
  }

  _buildExistingVenue(venue) {
    const spot = this.findFreeSpot(venue.x, venue.z, 1.4) || { x: venue.x, z: venue.z };
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);
    const furniture = new THREE.Group();
    const terrace = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 7),
      new THREE.MeshLambertMaterial({ color: '#9b9487', transparent: true, opacity: 0.82 })
    );
    terrace.rotation.x = -Math.PI / 2;
    terrace.position.y = 0.045;
    group.add(terrace);

    const dark = new THREE.MeshLambertMaterial({ color: '#2f3632' });
    const tableMat = new THREE.MeshLambertMaterial({ color: '#efe6d6' });
    const chairMat = new THREE.MeshLambertMaterial({ color: venue.color || '#8a5a3a' });
    const umbrellaMat = new THREE.MeshLambertMaterial({ color: venue.color || '#8a5a3a' });
    for (const [tx, tz] of [[-2.4, 1.4], [2.2, 1.4], [0, -1.8]]) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), tableMat);
      top.position.set(tx, 0.74, tz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 6), dark);
      pole.position.set(tx, 0.36, tz);
      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.42, 10), umbrellaMat);
      umbrella.position.set(tx, 2.35, tz);
      const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 6), dark);
      umbrellaPole.position.set(tx, 1.12, tz);
      furniture.add(top, pole, umbrella, umbrellaPole);
      for (let i = 0; i < 2; i++) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.4), chairMat);
        chair.position.set(tx + (i ? 0.9 : -0.9), 0.22, tz);
        furniture.add(chair);
      }
    }
    const sign = makeTextSprite(`${venue.name || 'BAR'}\n${venueLabel(venue.hours || {})}`, {
      scale: 0.42,
      fontSize: 30,
      pad: 14,
      bg: 'rgba(255,248,232,.94)',
      color: '#1b241e'
    });
    sign.position.set(0, 2.75, 0);
    furniture.add(sign);

    const lights = new THREE.Group();
    for (let i = -4; i <= 4; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe6a6' }));
      bulb.position.set(i * 1.1, 2.55, 0);
      lights.add(bulb);
    }
    group.add(furniture, lights);
    this.scene.add(group);
    venue.group = group;
    venue.furniture = furniture;
    venue.lights = lights;
    venue.crowd = [];
    const crowdCount = this.quality === 'low' ? 2 : 3;
    for (let i = 0; i < crowdCount; i++) {
      const person = makePerson({
        shirt: ['#c2684b', '#4f8fa8', '#7c8d5b'][i % 3],
        pants: '#3a3f46'
      });
      person.position.set((i - 1) * 1.5, 0.04, 1.4 + (i % 2) * 0.8);
      person.rotation.y = i * 1.8;
      person.visible = false;
      group.add(person);
      venue.crowd.push(person);
    }
    venue.terrace = terrace;
    venue.open = true;
    const glow = new THREE.PointLight(venue.color || '#ffd9a0', 0, 16);
    glow.position.set(0, 2.7, 0);
    group.add(glow);
    venue.light = glow;
  }

  _boardTexture(title, rows) {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4ebda';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1b241e';
    ctx.lineWidth = 9;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    ctx.fillStyle = '#2f4a3c';
    ctx.fillRect(10, 10, canvas.width - 20, 62);
    ctx.fillStyle = '#e7b95a';
    ctx.font = '700 30px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), 26, 43);
    ctx.font = '600 17px Oswald, "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(244,235,218,.72)';
    ctx.textAlign = 'right';
    ctx.fillText('FIDENZA', canvas.width - 26, 43);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    rows.slice(0, 6).forEach((row, i) => {
      const y = 96 + i * 37;
      ctx.fillStyle = i % 2 ? 'rgba(27,36,30,.04)' : 'transparent';
      ctx.fillRect(18, y - 17, canvas.width - 36, 34);
      ctx.fillStyle = '#1b241e';
      ctx.font = '600 19px Oswald, "Trebuchet MS", sans-serif';
      ctx.fillText(row[0] || '', 28, y);
      ctx.font = '500 18px Oswald, "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#4d4a40';
      ctx.fillText(row[1] || '', 132, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9a4a34';
      ctx.font = '700 18px Oswald, "Trebuchet MS", sans-serif';
      ctx.fillText(row[2] || '', canvas.width - 28, y);
      ctx.textAlign = 'left';
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    return tex;
  }

  _addBoard(x, z, rotation, title, rows, width = 4.4, height = 2.1) {
    const group = new THREE.Group();
    const postMat = new THREE.MeshLambertMaterial({ color: '#2f3632' });
    for (const px of [-width * 0.38, width * 0.38]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.1, 6), postMat);
      post.position.set(px, 1.55, 0);
      post.castShadow = true;
      group.add(post);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.12), new THREE.MeshLambertMaterial({ color: '#1b241e' }));
    back.position.set(0, 2.9, -0.07);
    group.add(back);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: this._boardTexture(title, rows), side: THREE.DoubleSide })
    );
    panel.position.set(0, 2.9, 0.01);
    group.add(panel);
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    this.scene.add(group);
    return group;
  }

  _buildBusLine() {
    const defs = [
      { id: 'stazione', name: 'Stazione', place: 'stazione' },
      { id: 'piazza-duomo', name: 'Piazza Duomo', place: 'piazza-duomo' },
      { id: 'teatro', name: 'Teatro Magnani', place: 'teatro' },
      { id: 'granmadre', name: 'Gran Madre', place: 'granmadre' }
    ];
    const stops = defs.map(d => {
      const p = this.placesById.get(d.place);
      return p ? { id: d.id, name: d.name, x: p.beaconX ?? p.x, z: p.beaconZ ?? p.z } : null;
    }).filter(Boolean);
    if (stops.length < 2) return;
    const route = buildBusRoute(this.city, stops);
    if (!route || !route.total) return;
    this.busRoute = route;
    const mesh = makeBus({ color: '#e8ddc4', accent: '#2f6b4f' });
    mesh.scale.setScalar(0.92);
    this.scene.add(mesh);
    const first = route.stops[0];
    this.bus = {
      mesh,
      route,
      t: first.t,
      nextStop: route.stops.length > 1 ? 1 : 0,
      dwell: 5,
      speed: 8.4,
      wheelSpin: 0
    };
    this._placeBus();
    this.busStops = route.stops.map(stop => {
      const pose = route.pose(stop.t);
      const len = Math.hypot(pose.dx, pose.dz) || 1;
      const nx = -pose.dz / len;
      const nz = pose.dx / len;
      const spot = this.findFreeSpot(pose.x + nx * 5.2, pose.z + nz * 5.2, 1.4) || { x: pose.x + nx * 5.2, z: pose.z + nz * 5.2 };
      const rot = Math.atan2(nx, nz);
      this._addSign(spot.x, spot.z, rot, stop.name, 'Fermata navetta', { street: true, width: 2.3, height: 0.62 });
      const shelter = new THREE.Group();
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.45), new THREE.MeshLambertMaterial({ color: '#2f4a3c' }));
      roof.position.y = 2.55;
      shelter.add(roof);
      for (const sx of [-1.35, 1.35]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.55, 6), new THREE.MeshLambertMaterial({ color: '#2f3632' }));
        post.position.set(sx, 1.27, -0.55);
        shelter.add(post);
      }
      const bench = makeBench();
      bench.scale.setScalar(0.75);
      bench.position.set(0, 0, -0.35);
      bench.rotation.y = Math.PI;
      shelter.add(bench);
      shelter.position.set(spot.x, 0, spot.z);
      shelter.rotation.y = rot + Math.PI / 2;
      this.scene.add(shelter);
      return { ...stop, x: spot.x, z: spot.z };
    });
  }

  _placeBus() {
    if (!this.bus) return;
    const pose = this.bus.route.pose(this.bus.t);
    this.bus.mesh.position.set(pose.x, 0.12, pose.z);
    this.bus.mesh.rotation.y = Math.atan2(pose.dx, pose.dz);
  }

  _updateBus(dt) {
    const bus = this.bus;
    if (!bus) return;
    if (bus.dwell > 0) {
      bus.dwell -= dt;
      return;
    }
    const total = bus.route.total;
    const prev = bus.t;
    bus.t = (bus.t + bus.speed * dt) % total;
    const target = bus.route.stops[bus.nextStop];
    if (target) {
      const crossed = prev <= bus.t
        ? target.t > prev && target.t <= bus.t
        : target.t > prev || target.t <= bus.t;
      if (crossed) {
        bus.t = target.t;
        bus.dwell = 5.5;
        bus.nextStop = (bus.nextStop + 1) % bus.route.stops.length;
      }
    }
    this._placeBus();
    bus.wheelSpin += dt * 6;
    bus.mesh.userData.wheels?.forEach(w => { w.rotation.x = bus.wheelSpin; });
  }

  _buildTrainLine() {
    const st = this.placesById.get('stazione');
    if (!st) return;
    let best = null;
    for (const rail of this.city.railways || []) {
      if (!rail.pts || rail.pts.length < 2) continue;
      let len = 0;
      for (let i = 1; i < rail.pts.length; i++) len += Math.hypot(rail.pts[i][0] - rail.pts[i - 1][0], rail.pts[i][1] - rail.pts[i - 1][1]);
      if (len < 350) continue;
      let dist = Infinity;
      for (const [x, z] of rail.pts) dist = Math.min(dist, Math.hypot(x - st.x, z - st.z));
      if (dist > 45) continue;
      if (!best || len > best.len) best = { rail, len, dist };
    }
    if (!best) return;
    let pts = best.rail.pts.map(([x, z]) => [x, z]);
    const dStart = Math.hypot(pts[0][0] - st.x, pts[0][1] - st.z);
    const dEnd = Math.hypot(pts[pts.length - 1][0] - st.x, pts[pts.length - 1][1] - st.z);
    if (dEnd < dStart) pts = pts.slice().reverse();
    const walker = makeRouteWalker(pts, 0, 1, 13.5);
    const mesh = makeTrain();
    mesh.scale.setScalar(0.95);
    this.scene.add(mesh);
    this.train = { mesh, walker, dwell: 4, cooldown: 20, station: { x: st.x, z: st.z }, wheelSpin: 0 };
    this._placeTrain();
  }

  _placeTrain() {
    if (!this.train) return;
    const pose = this.train.walker.pose();
    this.train.mesh.position.set(pose.x, 0.12, pose.z);
    this.train.mesh.rotation.y = Math.atan2(pose.dx, pose.dz);
  }

  _updateTrain(dt) {
    const train = this.train;
    if (!train) return;
    train.cooldown = Math.max(0, train.cooldown - dt);
    if (train.dwell > 0) {
      train.dwell -= dt;
      return;
    }
    train.walker.advance(dt);
    this._placeTrain();
    train.wheelSpin += dt * 9;
    train.mesh.userData.wheels?.forEach(w => { w.rotation.x = train.wheelSpin; });
    const pose = train.walker.pose();
    const d = Math.hypot(pose.x - train.station.x, pose.z - train.station.z);
    if (d < 38 && train.cooldown <= 0) {
      train.dwell = 5.5;
      train.cooldown = 25;
    }
  }

  _buildStationArea() {
    const st = this.placesById.get('stazione');
    if (!st) return;
    const base = this.findFreeSpot(st.x + 15, st.z - 24, 4.5) || { x: st.x + 15, z: st.z - 24 };
    this.stationArea = { x: base.x, z: base.z, name: 'Sala d’attesa' };
    const platform = new THREE.Mesh(new THREE.BoxGeometry(19, 0.22, 6.4), new THREE.MeshLambertMaterial({ color: '#b9b3a8' }));
    platform.position.set(base.x, 0.11, base.z);
    platform.receiveShadow = true;
    this.scene.add(platform);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(19, 0.18, 6.8), new THREE.MeshLambertMaterial({ color: '#4b5d53' }));
    roof.position.set(base.x, 3.7, base.z);
    roof.castShadow = true;
    this.scene.add(roof);
    for (const dx of [-8.4, -2.8, 2.8, 8.4]) {
      for (const dz of [-2.7, 2.7]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.7, 6), new THREE.MeshLambertMaterial({ color: '#2f3632' }));
        post.position.set(base.x + dx, 1.85, base.z + dz);
        this.scene.add(post);
      }
    }
    for (const dx of [-5.4, 5.4]) {
      const bench = makeBench();
      bench.position.set(base.x + dx, 0, base.z + 1.65);
      bench.rotation.y = Math.PI;
      this.scene.add(bench);
    }
    const board = this._addBoard(base.x, base.z + 3.7, 0, 'Partenze', [
      ['15:42', 'Bologna Centrale', '1'],
      ['15:58', 'Milano Centrale', '2'],
      ['16:12', 'Parma', '1'],
      ['16:30', 'Piacenza', '2']
    ], 4.2, 2.0);
    board.rotation.y = 0;
    const machine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.5), new THREE.MeshLambertMaterial({ color: '#2f4a3c' }));
    machine.position.set(base.x - 8.2, 0.9, base.z - 2.1);
    this.scene.add(machine);
    this._addSign(base.x + 7.8, base.z + 3.1, Math.PI, 'STAZIONE', 'Binario 1', { width: 3.4, height: 1.0 });

    // Dettagli di banchina: strisce tattili, taxi, rastrelliera e orologio.
    for (const z of [-2.95, 2.95]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(18.6, 0.02, 0.3),
        new THREE.MeshLambertMaterial({ color: '#d7b45a' })
      );
      strip.position.set(base.x, 0.23, base.z + z);
      strip.receiveShadow = true;
      this.scene.add(strip);
    }
    for (const [dx, dz] of [[-13, -3], [-13, 2]]) {
      const spot = this.findFreeSpot(base.x + dx, base.z + dz, 2.2);
      if (!spot) continue;
      const taxi = makeCar({ taxi: true, parked: true });
      taxi.position.set(spot.x, 0.05, spot.z);
      taxi.rotation.y = Math.PI / 2;
      taxi.scale.setScalar(0.94);
      this.scene.add(taxi);
    }
    const rackSpot = this.findFreeSpot(base.x + 10.5, base.z - 4.5, 1.2);
    if (rackSpot) {
      const rack = new THREE.Group();
      const metal = new THREE.MeshLambertMaterial({ color: '#3f4a42' });
      for (const x of [-0.55, 0.55]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.75, 0.07), metal);
        post.position.set(x, 0.38, 0);
        rack.add(post);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 0.07), metal);
      bar.position.y = 0.75;
      rack.add(bar);
      rack.position.set(rackSpot.x, 0, rackSpot.z);
      rack.rotation.y = Math.PI / 2;
      this.scene.add(rack);
    }
    const clockSpot = this.findFreeSpot(base.x + 8.5, base.z + 4.6, 0.8);
    if (clockSpot) {
      const clock = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), new THREE.MeshLambertMaterial({ color: '#2f3632' }));
      pole.position.y = 1.7;
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.45, 18), new THREE.MeshBasicMaterial({ color: '#f4ebda' }));
      face.position.set(0, 3.25, 0.04);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 18), new THREE.MeshLambertMaterial({ color: '#2f3632' }));
      rim.position.set(0, 3.25, 0.05);
      const handH = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: '#2f3632' }));
      handH.position.set(0, 3.32, 0.07);
      const handM = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.02), new THREE.MeshBasicMaterial({ color: '#2f3632' }));
      handM.position.set(0.1, 3.28, 0.07);
      handM.rotation.z = -0.6;
      clock.add(pole, face, rim, handH, handM);
      clock.position.set(clockSpot.x, 0, clockSpot.z);
      this.scene.add(clock);
    }
  }

  _buildTransit() {
    this._buildBusLine();
    this._buildTrainLine();
    this._buildStationArea();
  }

  _eventStall(color = '#b07a4e') {
    const g = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 1.05), new THREE.MeshLambertMaterial({ color }));
    counter.position.y = 0.4;
    counter.castShadow = true;
    g.add(counter);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.09, 1.35), new THREE.MeshLambertMaterial({ color: '#e7b95a' }));
    canopy.position.y = 2.05;
    canopy.castShadow = true;
    g.add(canopy);
    for (const x of [-1.02, 1.02]) {
      for (const z of [-0.48, 0.48]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.05, 5), new THREE.MeshLambertMaterial({ color: '#6b4c35' }));
        post.position.set(x, 1.02, z);
        g.add(post);
      }
    }
    for (let i = 0; i < 4; i++) {
      const good = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.28), new THREE.MeshLambertMaterial({ color: ['#c2684b', '#7c8d5b', '#d9c9a8', '#9a4a34'][i] }));
      good.position.set(-0.7 + i * 0.46, 0.9, 0.2);
      g.add(good);
    }
    return g;
  }

  _eventFoodStall(label, color = '#9b6a45') {
    const g = this._eventStall(color);
    const tex = this._signTexture(label, 'Specialità della festa', { street: true, color: '#7a3f2f' });
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.48),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
    panel.position.set(0, 1.52, 0.53);
    g.add(panel);
    return g;
  }

  _eventUmbrella(color = '#c2684b') {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 6), new THREE.MeshLambertMaterial({ color: '#6b4c35' }));
    pole.position.y = 1.2;
    g.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.5, 8), new THREE.MeshLambertMaterial({ color }));
    top.position.y = 2.45;
    top.castShadow = true;
    g.add(top);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.07, 10), new THREE.MeshLambertMaterial({ color: '#e8ddc4' }));
    table.position.y = 0.72;
    g.add(table);
    return g;
  }

  _eventBanner(text, sub = 'Fidenza', color = '#2f4a3c') {
    const group = new THREE.Group();
    const tex = this._signTexture(text, sub, { color });
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.35),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
    panel.position.y = 3.1;
    group.add(panel);
    for (const x of [-1.45, 1.45]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.1, 6), new THREE.MeshLambertMaterial({ color: '#2f3632' }));
      post.position.set(x, 1.55, 0);
      group.add(post);
    }
    return group;
  }

  _eventChristmasTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.2, 7), new THREE.MeshLambertMaterial({ color: '#6b4c35' }));
    trunk.position.y = 0.6;
    g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2 - i * 0.42, 1.35, 9), new THREE.MeshLambertMaterial({ color: i % 2 ? '#3f6b4a' : '#4f7748' }));
      cone.position.y = 1.45 + i * 0.9;
      cone.castShadow = true;
      g.add(cone);
    }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshBasicMaterial({ color: '#ffd75e' }));
    star.position.y = 4.9;
    g.add(star);
    return g;
  }

  _eventCrowd(center, count = 8, radius = 10) {
    if (this.quality === 'low') count = Math.min(count, 5);
    else if (this.quality === 'medium') count = Math.min(count, 8);
    const shirts = ['#c2684b', '#4f8fa8', '#7c8d5b', '#d9c9a8', '#9a4a34', '#5c6b5f'];
    const pants = ['#2f4a3c', '#3a3f46', '#5b4a3a'];
    const rnd = seededRandom(620);
    for (let i = 0; i < count; i++) {
      const angle = rnd() * Math.PI * 2;
      const r = radius + rnd() * 10;
      const x = center.x + Math.cos(angle) * r;
      const z = center.z + Math.sin(angle) * r;
      const spot = this.findFreeSpot(x, z, 0.4) || { x, z };
      const person = makePerson({ shirt: shirts[Math.floor(rnd() * shirts.length)], pants: pants[Math.floor(rnd() * pants.length)] });
      person.position.set(spot.x, 0.04, spot.z);
      person.rotation.y = rnd() * Math.PI * 2;
      this._eventGroup.add(person);
    }
  }

  _disposeGroup(root) {
    root.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          mat?.map?.dispose?.();
          mat?.dispose?.();
        }
      }
    });
  }

  setEvent(event) {
    const id = event?.id || null;
    if (this._eventId === id) return;
    this._eventId = id;
    if (this._eventGroup) {
      this.scene.remove(this._eventGroup);
      this._disposeGroup(this._eventGroup);
      this._eventGroup = null;
    }
    if (this._eventFireworks?.bursts) {
      for (const burst of this._eventFireworks.bursts) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
      }
    }
    this._eventProcession = null;
    this._eventFireworks = null;
    this.event = event || null;
    if (!event) return;
    const place = this.placesById.get(event.placeId);
    if (!place) return;
    const center = { x: place.beaconX ?? place.x, z: place.beaconZ ?? place.z };
    const group = new THREE.Group();
    group.name = `evento-${event.id}`;
    this._eventGroup = group;

    const stalls = event.type === 'market' ? 8 : event.type === 'christmas' ? 7 : event.type === 'festival' ? 6 : event.type === 'summer' ? 3 : 0;
    for (let i = 0; i < stalls; i++) {
      const angle = (i / Math.max(1, stalls)) * Math.PI * 2 + 0.3;
      const radius = 12 + (i % 2) * 4;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      const spot = this.findFreeSpot(x, z, 1.1) || { x, z };
      const stall = this._eventStall(['#b07a4e', '#9b6a45', '#a77a58'][i % 3]);
      stall.position.set(spot.x, 0, spot.z);
      stall.rotation.y = Math.atan2(center.x - spot.x, center.z - spot.z);
      group.add(stall);
    }

    if (event.type === 'christmas') {
      const tree = this._eventChristmasTree();
      tree.position.set(center.x, 0, center.z);
      group.add(tree);
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * Math.PI * 2;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: i % 3 ? '#ffd75e' : '#ff8a5e' }));
        bulb.position.set(center.x + Math.cos(a) * 13, 3.2 + Math.sin(i) * 0.25, center.z + Math.sin(a) * 13);
        group.add(bulb);
      }
    }

    if (event.type === 'festival') {
      const stage = new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 4), new THREE.MeshLambertMaterial({ color: '#6b4c35' }));
      stage.position.set(center.x, 0.18, center.z + 5);
      group.add(stage);
      const banner = this._eventBanner('SAN DONNINO', 'Festa patronale', '#7a3f2f');
      banner.position.set(center.x, 0, center.z + 9);
      group.add(banner);
      const program = this._eventBanner('PROGRAMMA', '20:30 banda · 22:30 fuochi', '#3f6b4a');
      program.scale.setScalar(0.72);
      program.position.set(center.x + 8, 0, center.z + 8);
      group.add(program);

      const foods = [
        ['TORTA FRITTA', center.x - 17, center.z + 2, '#b07a4e'],
        ['CULATELLO', center.x + 15, center.z - 3, '#9a4a34'],
        ['GNOCCO FRITTO', center.x - 12, center.z - 11, '#a77a58']
      ];
      for (const [label, x, z, color] of foods) {
        const spot = this.findFreeSpot(x, z, 1.1) || { x, z };
        const stall = this._eventFoodStall(label, color);
        stall.position.set(spot.x, 0, spot.z);
        stall.rotation.y = Math.atan2(center.x - spot.x, center.z - spot.z);
        group.add(stall);
      }

      for (let i = 0; i < 34; i++) {
        const a = i / 34 * Math.PI * 2;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffd75e' : '#ff8a5e' }));
        bulb.position.set(center.x + Math.cos(a) * 19, 3.4 + Math.sin(i * 0.8) * 0.18, center.z + Math.sin(a) * 19);
        group.add(bulb);
      }
      this._eventProcession = this._buildProcession(center, group);
      this._eventFireworks = { center, timer: 0.8, bursts: [] };
    } else {
      this._eventProcession = null;
      this._eventFireworks = null;
    }

    if (event.type === 'theatre') {
      const carpet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 10), new THREE.MeshLambertMaterial({ color: '#8f3e34' }));
      carpet.position.set(center.x, 0.05, center.z + 4);
      group.add(carpet);
      const banner = this._eventBanner('TEATRO MAGNANI', 'Serata di scena', '#7a5a8a');
      banner.position.set(center.x, 0, center.z + 8);
      group.add(banner);
    }

    if (event.type === 'summer') {
      for (let i = 0; i < 4; i++) {
        const angle = i / 4 * Math.PI * 2 + 0.5;
        const umbrella = this._eventUmbrella(['#c2684b', '#4f8fa8', '#c99a3f', '#7c8d5b'][i]);
        umbrella.position.set(center.x + Math.cos(angle) * 12, 0, center.z + Math.sin(angle) * 12);
        group.add(umbrella);
      }
    }

    if (event.type === 'rush') {
      const banner = this._eventBanner('ORA DI PUNTA', 'Stazione di Fidenza', '#3f748a');
      banner.position.set(center.x, 0, center.z + 8);
      group.add(banner);
    }

    this._eventCrowd(center, event.type === 'rush' ? 12 : 8, 8);
    this.scene.add(group);
  }

  _buildProcession(center, group) {
    const points = [];
    for (let i = 0; i < 28; i++) {
      const angle = i / 28 * Math.PI * 2;
      const radius = 15 + Math.sin(i * 1.7) * 2.2;
      points.push({ x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius });
    }
    const route = makeLoopRoute(points);
    const people = [];
    const shirts = ['#f4ebda', '#e7b95a', '#c2684b', '#4f8fa8', '#d9c9a8'];
    const rnd = seededRandom(731);
    for (let i = 0; i < 10; i++) {
      const person = makePerson({
        shirt: shirts[i % shirts.length],
        pants: i % 2 ? '#3a3f46' : '#5b4a3a',
        skin: '#d8aa85',
        hair: '#3a2a20'
      });
      people.push(person);
      group.add(person);
    }
    const banner = this._eventBanner('SAN DONNINO', 'Processione', '#7a3f2f');
    banner.scale.setScalar(0.6);
    group.add(banner);
    return {
      route,
      people,
      banner,
      t: 0,
      spread: route.total / people.length,
      rnd
    };
  }

  _spawnFirework(center) {
    const count = this.quality === 'low' ? 24 : this.quality === 'medium' ? 36 : 48;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const ox = center.x + (Math.random() - 0.5) * 10;
    const oz = center.z + (Math.random() - 0.5) * 10;
    const oy = 18 + Math.random() * 8;
    for (let i = 0; i < count; i++) {
      positions[i * 3] = ox;
      positions[i * 3 + 1] = oy;
      positions[i * 3 + 2] = oz;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 4 + Math.random() * 7;
      velocities.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.cos(phi) * speed,
        z: Math.sin(phi) * Math.sin(theta) * speed
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const colors = ['#ffd75e', '#ff8a5e', '#9fd7ff', '#ffffff'];
    const material = new THREE.PointsMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 0.65,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);
    this._eventFireworks?.bursts.push({ points, velocities, age: 0, life: 2.6 });
    this.onFirework?.();
  }

  _updateEvent(dt) {
    if (this._eventProcession) {
      const p = this._eventProcession;
      p.t += dt * 0.55;
      p.people.forEach((person, i) => {
        const pose = p.route.pose(p.t - i * p.spread);
        person.position.set(pose.x, 0.04, pose.z);
        person.rotation.y = Math.atan2(pose.dx, pose.dz);
        const limbs = person.userData.limbs;
        const a = Math.sin(this.time * 4.2 + i * 0.7) * 0.38;
        const b = Math.sin(this.time * 4.2 + i * 0.7 + Math.PI) * 0.38;
        if (limbs) {
          limbs.legL.rotation.x = a;
          limbs.legR.rotation.x = b;
          limbs.armL.rotation.x = b * 0.55;
          limbs.armR.rotation.x = a * 0.55;
        }
      });
      const bannerPose = p.route.pose(p.t + 2.4);
      p.banner.position.set(bannerPose.x, 0, bannerPose.z);
      p.banner.rotation.y = Math.atan2(bannerPose.dx, bannerPose.dz);
    }

    if (!this._eventFireworks) return;
    const hour = this.hour;
    const show = hour >= 22.25 && hour < 23.2;
    if (show) {
      this._eventFireworks.timer -= dt;
      if (this._eventFireworks.timer <= 0) {
        this._eventFireworks.timer = 1.4 + Math.random() * 1.2;
        this._spawnFirework(this._eventFireworks.center);
      }
    }
    const bursts = this._eventFireworks.bursts;
    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i];
      burst.age += dt;
      const pos = burst.points.geometry.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const v = burst.velocities[j];
        pos.setXYZ(j,
          pos.getX(j) + v.x * dt,
          pos.getY(j) + v.y * dt,
          pos.getZ(j) + v.z * dt
        );
        v.y -= 4.2 * dt;
      }
      pos.needsUpdate = true;
      burst.points.material.opacity = Math.max(0, 1 - burst.age / burst.life);
      if (burst.age >= burst.life) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
        bursts.splice(i, 1);
      }
    }
  }

  _buildCollectibles() {
    const starGeo = makeStarGeometry();
    const starMat = new THREE.MeshBasicMaterial({ color: '#ffd75e' });
    const ringGeo = new THREE.TorusGeometry(0.9, 0.035, 6, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#e7b95a' });
    const glowTex = createGlowTexture('rgba(255,225,130,1)');
    this.starDefs.forEach((s, i) => {
      const id = `star-${i}`;
      const collected = hasStar(id);
      const group = new THREE.Group();
      group.position.set(s.x, 1.35, s.z);
      const star = new THREE.Mesh(starGeo, starMat);
      star.rotation.z = Math.PI;
      group.add(star);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(2.6, 2.6, 1);
      group.add(glow);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.25;
      group.add(ring);
      group.visible = !collected;
      this.scene.add(group);
      this.starObjects.push({ id, data: s, group, star, glow, ring, collected, phase: i * 0.7 });
    });

    this.places.filter(p => p.collectible).forEach((p, i) => {
      const visited = hasPlace(p.id);
      const spot = (p.beaconX != null && p.beaconZ != null) ? { x: p.beaconX, z: p.beaconZ } : this._findPlaceSpot(p);
      const px = spot.x, pz = spot.z;
      const group = new THREE.Group();
      group.position.set(px, 0, pz);
      const mat = new THREE.MeshBasicMaterial({ color: visited ? '#e7b95a' : '#7cc4dd', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.0, 7, 12, 1, true), mat);
      beam.position.y = 3.5;
      group.add(beam);
      const octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: visited ? '#e7b95a' : '#9bd8ea' }));
      octa.position.y = 7.4;
      group.add(octa);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.07, 6, 36), new THREE.MeshBasicMaterial({ color: visited ? '#e7b95a' : '#7cc4dd', transparent: true, opacity: 0.4 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08;
      group.add(ring);
      group.visible = !visited;
      this.scene.add(group);
      this.placeObjects.push({ id: p.id, data: p, placeX: px, placeZ: pz, radius: p.radius || 8, group, beam, octa, ring, visited, phase: i * 0.8 });
    });
  }

  _buildVehicles() {
    const cand = this.vehicleDefs || [
      { type: 'car', x: -330, z: 24, yaw: 1.99, label: 'Auto', color: '#c2684b' },
      { type: 'vespa', x: -338, z: 18, yaw: 1.2, label: 'Vespa', color: '#4f8fa8' },
      { type: 'car', x: 205, z: -100, yaw: Math.PI, label: 'Taxi', color: '#e7b95a', taxi: true },
      { type: 'vespa', x: -340, z: 28, yaw: 2.2, label: 'Vespa pizza', color: '#c2684b' },
      { type: 'car', x: -340, z: 10, yaw: 1.6, label: 'Auto', color: '#d9c9a8' },
      { type: 'car', x: -300, z: 32, yaw: 2.4, label: 'Ambulanza', color: '#f1ede2' }
    ];
    for (const c of cand) {
      const spot = this.vehicleDefs ? { x: c.x, z: c.z } : this.findFreeSpot(c.x, c.z, c.type === 'car' ? 2.2 : 1.2);
      if (spot) this.vehicleSpawns.push({ ...c, x: spot.x, z: spot.z });
    }
  }

  _buildTraffic() {
    const rnd = seededRandom(77);
    const plans = planTraffic(this.city, this.quality, rnd);
    const roadsById = new Map(this.city.roads.map(road => [road.id, road]));
    const pedRoads = this.city.roads.filter(r => ['footway', 'pedestrian', 'living_street', 'path'].includes(r.kind) && r.length > 35 && !r.tunnel);
    const colors = ['#c2684b', '#4f8fa8', '#d9c9a8', '#5c6b5f', '#9a4a34', '#d7d2c7'];
    for (const plan of plans) {
      const road = roadsById.get(plan.roadId);
      if (!road) continue;
      const walker = makeRouteWalker(road.pts, plan.offset, plan.direction, plan.speed);
      const car = makeCar({ color: colors[Math.floor(rnd() * colors.length)] });
      car.position.y = 0.06;
      car.scale.setScalar(0.94);
      this.scene.add(car);
      this.trafficCars.push({
        car,
        walker,
        phase: rnd() * 10,
        roadId: road.id,
        roadKind: road.kind
      });
    }
    const pedCount = this.quality === 'low' ? 9 : this.quality === 'medium' ? 15 : 24;
    const shirts = ['#c2684b', '#4f8fa8', '#d9c9a8', '#5c6b5f', '#9a4a34', '#7c8d5b', '#d7d2c7'];
    const pants = ['#2f4a3c', '#3a3f46', '#5b4a3a', '#4e5a63'];
    for (let i = 0; i < pedCount; i++) {
      const road = pedRoads[Math.floor(rnd() * pedRoads.length)];
      if (!road) continue;
      const walker = makeRouteWalker(road.pts, rnd() * 40, rnd() > 0.5 ? 1 : -1, 0.9 + rnd() * 0.45);
      const person = makePerson({ shirt: shirts[Math.floor(rnd() * shirts.length)], pants: pants[Math.floor(rnd() * pants.length)] });
      this.scene.add(person);
      const pose = walker.pose();
      const district = this.getDistrictAt(pose.x, pose.z);
      this.pedestrians.push({ person, walker, phase: rnd() * Math.PI * 2, district: district.id, crowdSlot: i % 3 });
    }
    this._buildBicycles(rnd);
  }

  _nearestPedestrianRoad(x, z) {
    const kinds = new Set(['pedestrian', 'footway', 'living_street', 'path', 'cycleway']);
    let best = null;
    for (const road of this.city.roads) {
      if (!kinds.has(road.kind) || road.length < 25 || road.tunnel || !road.pts?.length) continue;
      for (const point of road.pts) {
        const d = Math.hypot(point[0] - x, point[1] - z);
        if (!best || d < best.d) best = { road, d };
      }
    }
    return best;
  }

  _roadOffsetForPoint(road, x, z) {
    let best = Infinity;
    let bestT = 0;
    let total = 0;
    for (let i = 1; i < road.pts.length; i++) {
      const [ax, az] = road.pts[i - 1];
      const [bx, bz] = road.pts[i];
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / (len * len), 0, 1);
      const px = ax + dx * t;
      const pz = az + dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best) {
        best = d;
        bestT = total + len * t;
      }
      total += len;
    }
    return bestT;
  }

  _buildBicycles(rnd = seededRandom(88)) {
    const parked = [
      [-310, 8], [-292, -18], [183, -105], [-84, 62], [381, 190],
      [-20, 62], [-200, 220], [250, 100], [-110, 145], [-470, 90]
    ];
    const colors = ['#4f8fa8', '#c2684b', '#5c6b5f', '#c99a3f', '#7a5a8a'];
    const placedBikes = [];
    const addParkedBike = (x, z) => {
      const spot = this.findFreeSpot(x, z, 0.7);
      if (!spot) return null;
      if (placedBikes.some(b => Math.hypot(b.x - spot.x, b.z - spot.z) < 4.2)) return null;
      if (this.vehicleSpawns.some(v => Math.hypot(v.x - spot.x, v.z - spot.z) < 3.5)) return null;
      const bike = makeBicycle({ color: colors[Math.floor(rnd() * colors.length)] });
      bike.position.set(spot.x, 0, spot.z);
      bike.rotation.y = rnd() * Math.PI * 2;
      bike.scale.setScalar(0.9 + rnd() * 0.15);
      this.scene.add(bike);
      const entry = { x: spot.x, z: spot.z };
      placedBikes.push(entry);
      this._parkedBikeSpots.push(entry);
      return entry;
    };
    for (const [x, z] of parked) addParkedBike(x, z);

    const pedestrianRoads = this.city.roads.filter(r =>
      ['pedestrian', 'footway', 'living_street', 'path', 'cycleway'].includes(r.kind) &&
      r.length > 28 && !r.tunnel
    );

    // Bici guidabili aggiuntive, distribuite nelle zone pedonali.
    const rideableDefs = [
      { label: 'Bici Via Emilia', x: -290, z: -24 },
      { label: 'Bici Piazza Garibaldi', x: 14, z: -21 },
      { label: 'Bici Piazza Verdi', x: -18, z: 105 },
      { label: 'Bici Parco', x: -234, z: 613 },
      { label: 'Bici Repubblica', x: 195, z: -103 }
    ];
    for (const def of rideableDefs) {
      let spot = this.findFreeSpot(def.x, def.z, 0.8);
      if (!spot) {
        const near = this._nearestPedestrianRoad(def.x, def.z);
        if (!near) continue;
        const offset = this._roadOffsetForPoint(near.road, def.x, def.z);
        const pose = makeRouteWalker(near.road.pts, offset, 1, 1).pose();
        spot = this.findFreeSpot(pose.x, pose.z, 0.8);
      }
      if (!spot) continue;
      if (this.vehicleSpawns.some(v => Math.hypot(v.x - spot.x, v.z - spot.z) < 8)) continue;
      if (placedBikes.some(b => Math.hypot(b.x - spot.x, b.z - spot.z) < 5)) continue;
      this.vehicleSpawns.push({
        type: 'bike',
        label: def.label,
        x: +spot.x.toFixed(1),
        z: +spot.z.toFixed(1),
        yaw: rnd() * Math.PI * 2,
        color: colors[Math.floor(rnd() * colors.length)]
      });
    }

    const extraParked = this.quality === 'low' ? 8 : this.quality === 'medium' ? 14 : 20;
    for (let i = 0; i < extraParked && pedestrianRoads.length; i++) {
      const road = pedestrianRoads[Math.floor(rnd() * pedestrianRoads.length)];
      if (!road?.pts?.length) continue;
      const index = 1 + Math.floor(rnd() * (road.pts.length - 1));
      const a = road.pts[index - 1];
      const b = road.pts[index];
      const t = rnd();
      addParkedBike(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t
      );
    }

    const cycleRoads = this.city.roads.filter(r =>
      ['cycleway', 'residential', 'tertiary', 'living_street'].includes(r.kind) &&
      r.length > 55 && !r.tunnel
    );
    const cyclistCount = this.quality === 'low' ? 3 : this.quality === 'medium' ? 5 : 7;
    const shirts = ['#c2684b', '#4f8fa8', '#7c8d5b', '#d9c9a8', '#9a4a34'];
    const pants = ['#2f4a3c', '#3a3f46', '#5b4a3a'];
    for (let i = 0; i < cyclistCount; i++) {
      const road = cycleRoads[Math.floor(rnd() * cycleRoads.length)];
      if (!road?.pts?.length) continue;
      const walker = makeRouteWalker(road.pts, rnd() * 60, rnd() > 0.5 ? 1 : -1, 3.4 + rnd() * 2.2);
      const bike = makeBicycle({ color: colors[Math.floor(rnd() * colors.length)] });
      const rider = makePerson({
        shirt: shirts[Math.floor(rnd() * shirts.length)],
        pants: pants[Math.floor(rnd() * pants.length)]
      });
      rider.scale.setScalar(0.82);
      rider.position.y = 0.35;
      bike.add(rider);
      this.scene.add(bike);
      this.cyclists.push({
        bike,
        rider,
        walker,
        phase: rnd() * Math.PI * 2
      });
    }
  }

  _makeNpcPerson(def, rnd) {
    const person = makePerson({
      shirt: def.shirt || '#c2684b',
      pants: def.pants || '#2f4a3c',
      skin: def.skin || '#d8aa85',
      hair: def.hair || '#3a2a20'
    });
    person.scale.setScalar(0.94 + rnd() * 0.1);
    return person;
  }

  _buildNpcs() {
    const rnd = seededRandom(912);
    const met = new Set(getStats().npcsMet || []);
    const fixedCount = this.quality === 'low' ? 9 : this.quality === 'medium' ? 11 : 13;
    for (const def of NPC_FIXED.slice(0, fixedCount)) {
      const spot = this.findFreeSpot(def.x, def.z, 1.2) || { x: def.x, z: def.z };
      const person = this._makeNpcPerson(def, rnd);
      person.position.set(spot.x, 0.04, spot.z);
      person.rotation.y = rnd() * Math.PI * 2;
      this.scene.add(person);
      const bubble = makeSpeechBubble();
      bubble.position.set(0, 2.15, 0);
      bubble.visible = false;
      person.add(bubble);
      this.npcs.push({
        ...def,
        kind: 'fixed',
        person,
        bubble,
        met: met.has(def.id),
        phase: rnd() * Math.PI * 2
      });
    }

    const walkerCount = this.quality === 'low' ? 3 : this.quality === 'medium' ? 5 : 6;
    for (const def of NPC_WALKERS.slice(0, walkerCount)) {
      const near = this._nearestPedestrianRoad(def.x, def.z);
      if (!near) continue;
      const offset = this._roadOffsetForPoint(near.road, def.x, def.z);
      const walker = makeRouteWalker(near.road.pts, offset, rnd() > 0.5 ? 1 : -1, 0.9 + rnd() * 0.35);
      const pose = walker.pose();
      const person = this._makeNpcPerson(def, rnd);
      person.position.set(pose.x, 0.04, pose.z);
      person.rotation.y = Math.atan2(pose.dx, pose.dz);
      this.scene.add(person);
      const bubble = makeSpeechBubble();
      bubble.position.set(0, 2.15, 0);
      bubble.visible = false;
      person.add(bubble);
      const entry = {
        ...def,
        kind: 'walker',
        person,
        walker,
        bubble,
        met: met.has(def.id),
        phase: rnd() * Math.PI * 2
      };
      this.pedestrians.push({ person, walker, phase: entry.phase, npc: entry });
      this.npcs.push(entry);
    }
  }

  _updateNpcs(dt, playerPos) {
    if (!playerPos) return;
    for (const npc of this.npcs) {
      const p = npc.person.position;
      const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      if (npc.bubble) {
        const show = npc.person.visible && !npc.met && d < 22;
        npc.bubble.visible = show;
        if (show) {
          npc.bubble.position.y = 2.15 + Math.sin(this.time * 2.2 + npc.phase) * 0.08;
          npc.bubble.material.opacity = clamp(1 - Math.max(0, d - 16) / 8, 0.35, 1);
        }
      }
      if (npc.person.visible && npc.kind === 'fixed' && d < 9) {
        npc.person.rotation.y = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
      }
      const limbs = npc.person.userData.limbs;
      if (limbs && npc.kind === 'fixed') {
        const gesture = Math.sin(this.time * 1.35 + npc.phase) * 0.07;
        limbs.armR.rotation.x = -0.12 + gesture;
        limbs.armL.rotation.x = 0.05 - gesture * 0.55;
        limbs.armR.rotation.z = -0.05;
        limbs.armL.rotation.z = 0.05;
      }
    }
  }

  getDistrictAt(x, z) {
    return findDistrictAt(this.districts, x, z);
  }

  getNearbyNpc(x, z, radius = 3.4) {
    let best = null;
    for (const npc of this.npcs) {
      if (!npc.person.visible) continue;
      const p = npc.person.position;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < radius && (!best || d < best.dist)) best = { npc, dist: d };
    }
    return best;
  }

  _updateCyclists(dt) {
    const daylight = this.hour >= 6 && this.hour < 23;
    for (const c of this.cyclists) {
      c.bike.visible = daylight;
      c.walker.advance(dt);
      const pose = c.walker.pose();
      c.bike.position.set(pose.x, 0.05, pose.z);
      c.bike.rotation.y = Math.atan2(pose.dx, pose.dz);
      for (const w of c.bike.userData.wheels || []) {
        w.rotation.x += (c.walker.speed * dt) / (w.userData.radius || 0.34);
      }
      const limbs = c.rider.userData.limbs;
      if (limbs) {
        const pedal = Math.sin(this.time * 7 + c.phase) * 0.45;
        limbs.legL.rotation.x = pedal;
        limbs.legR.rotation.x = -pedal;
        limbs.armL.rotation.x = -0.35;
        limbs.armR.rotation.x = -0.35;
      }
    }
  }

  _buildAtmosphere() {
    // Pioggia
    const count = 700;
    const positions = new Float32Array(count * 3);
    const rnd = seededRandom(99);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rnd() - 0.5) * 70;
      positions[i * 3 + 1] = rnd() * 30 + 2;
      positions[i * 3 + 2] = (rnd() - 0.5) * 70;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainPoints = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#b9d6e4', size: 0.11, transparent: true, opacity: 0.55, depthWrite: false }));
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    // Nuvole a blocchi, come in Minecraft.
    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      fog: false
    });
    const cloudCount = this.quality === 'low' ? 4 : this.quality === 'medium' ? 8 : 14;
    for (let i = 0; i < cloudCount; i++) {
      const group = new THREE.Group();
      const parts = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < parts; k++) {
        const w = 35 + rnd() * 95;
        const d = 22 + rnd() * 55;
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, 7 + rnd() * 7, d), cloudMaterial);
        box.position.set((rnd() - 0.5) * 90, (rnd() - 0.5) * 8, (rnd() - 0.5) * 55);
        group.add(box);
      }
      group.position.set((rnd() - 0.5) * 2300, 250 + rnd() * 110, (rnd() - 0.5) * 2300);
      this.scene.add(group);
      this.clouds.push(group);
    }

    // Luci artificiali fisse
    for (const [x, z] of [[-13, 32], [175, -124], [-94, 72], [-267, 2]]) {
      const light = new THREE.PointLight('#ffd58a', 0, 42, 1.8);
      light.position.set(x, 5.5, z);
      this.scene.add(light);
      this.lampLights.push(light);
    }
    // Luce di riempimento che segue il giocatore: rende giocabili le notti.
    this.playerLight = new THREE.PointLight('#ffd9a0', 0, 24, 1.7);
    this.scene.add(this.playerLight);

    this._buildRainRipples();
  }

  addBoxCollider(x, z, w, d, name = '') {
    const hw = w / 2, hd = d / 2;
    const poly = [[x - hw, z - hd], [x + hw, z - hd], [x + hw, z + hd], [x - hw, z + hd]];
    const bounds = { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
    const collider = { poly, bounds, name, kind: 'prop' };
    this.colliders.push(collider);
    this.hash.insert(collider, bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ);
    return collider;
  }

  isFree(x, z, radius = 0.5) {
    if (x < WORLD.bounds.minX || x > WORLD.bounds.maxX || z < WORLD.bounds.minZ || z > WORLD.bounds.maxZ) return false;
    const near = this.hash.query(x, z, radius);
    for (const c of near) {
      const b = c.bounds;
      if (x < b.minX - radius || x > b.maxX + radius || z < b.minZ - radius || z > b.maxZ + radius) continue;
      if (pointInPoly(x, z, c.poly)) return false;
      // distanza dal bordo
      for (let i = 0, j = c.poly.length - 1; i < c.poly.length; j = i++) {
        const [ax, az] = c.poly[j], [bx, bz] = c.poly[i];
        const dx = bx - ax, dz = bz - az;
        const len2 = dx * dx + dz * dz;
        const t = clamp(((x - ax) * dx + (z - az) * dz) / len2, 0, 1);
        const px = ax + dx * t, pz = az + dz * t;
        if (Math.hypot(x - px, z - pz) < radius) return false;
      }
    }
    return true;
  }

  findFreeSpot(x, z, radius = 1) {
    if (this.isFree(x, z, radius)) return { x, z };
    for (let r = 2; r <= 30; r += 2) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const nx = x + Math.cos(a) * r;
        const nz = z + Math.sin(a) * r;
        if (this.isFree(nx, nz, radius)) return { x: nx, z: nz };
      }
    }
    return null;
  }

  _findPlaceSpot(l) {
    const category = l.category || l.type;
    if (['park', 'square', 'museum', 'nature'].includes(category) && this.isFree(l.x, l.z, 0.4)) return { x: l.x, z: l.z };
    const candidates = [];
    for (const r of this.city.roads) {
      for (const p of r.pts) {
        const d = Math.hypot(p[0] - l.x, p[1] - l.z);
        if (d < 48) candidates.push({ x: p[0], z: p[1], d });
      }
    }
    candidates.sort((a, b) => a.d - b.d);
    for (const p of candidates.slice(0, 80)) {
      if (this.isFree(p.x, p.z, 0.35)) return { x: p.x, z: p.z };
    }
    return this.findFreeSpot(l.x, l.z, 0.5) || { x: l.x, z: l.z };
  }

  getNearbyPlace(x, z, radius = 20) {
    let best = null;
    for (const p of this.placeObjects) {
      if (p.visited) continue;
      const px = p.placeX ?? p.data.x;
      const pz = p.placeZ ?? p.data.z;
      const d = Math.hypot(px - x, pz - z);
      if (d < Math.min(radius, p.radius || 12) && (!best || d < best.dist)) best = { place: p, dist: d };
    }
    return best;
  }

  getNearbyStar(x, z, radius = 2.0) {
    let best = null;
    for (const s of this.starObjects) {
      if (s.collected) continue;
      const d = Math.hypot(s.data.x - x, s.data.z - z);
      if (d < radius && (!best || d < best.dist)) best = { star: s, dist: d };
    }
    return best;
  }

  setStarCollected(id) {
    const s = this.starObjects.find(s => s.id === id);
    if (s) { s.collected = true; s.group.visible = false; }
  }

  setPlaceVisited(id) {
    const p = this.placeObjects.find(p => p.id === id);
    if (p) { p.visited = true; p.group.visible = false; }
  }

  _updateVenues() {
    const weekday = new Date().getDay();
    for (const venue of this.venues) {
      const status = venueStatus(this.hour, venue, weekday);
      venue.status = status;
      venue.open = status.open;
      if (venue.existing) {
        if (venue.furniture) venue.furniture.visible = status.open;
        if (venue.lights) venue.lights.visible = status.open;
        if (venue.light) venue.light.intensity = status.open ? (this.ambientNight > 0.45 ? 1.3 : 0.5) : 0;
        const evening = this.hour >= 17 || this.hour < 2;
        for (const person of venue.crowd || []) person.visible = status.open && evening;
      } else {
        for (const mesh of venue.neonMeshes || []) mesh.visible = status.open;
        if (venue.signMaterial) venue.signMaterial.color.set(status.open ? '#ffffff' : '#7a8384');
        if (venue.light) venue.light.intensity = status.open && this.ambientNight > 0.45 ? 3.2 : 0;
      }
    }
  }

  _scheduleTargetFor(npc) {
    let slot = scheduleSlotFor(npc.id, this.hour);
    if (npc.id === 'blue-bartender') {
      const bar = this.venueById.get('bar-blu-piramide');
      if (bar && !bar.open) slot = { visible: false, activity: 'chiuso' };
    }
    const key = slot.visible
      ? `${slot.x ?? 'route'}:${slot.z ?? 'route'}:${slot.activity || 'in giro'}`
      : 'hidden';
    return { slot, key };
  }

  _applySchedule(npc, target) {
    npc.scheduleVisible = !!target.slot.visible;
    npc.scheduleActivity = target.slot.activity || '';
    npc._scheduleKey = target.key;
    npc._pendingSchedule = null;
    if (npc.kind === 'walker') {
      npc.person.visible = npc.scheduleVisible;
      return;
    }
    if (!npc.scheduleVisible) {
      npc.person.visible = false;
      if (npc.bubble) npc.bubble.visible = false;
      return;
    }
    if (Number.isFinite(target.slot.x) && Number.isFinite(target.slot.z)) {
      const spot = this.findFreeSpot(target.slot.x, target.slot.z, 1.2) || { x: target.slot.x, z: target.slot.z };
      npc.person.position.set(spot.x, 0.04, spot.z);
    }
    npc.person.visible = true;
  }

  _updateSchedules(dt, playerPos) {
    if (dt <= 0) return;
    const bucket = Math.floor(this.hour * 6);
    if (bucket !== this._scheduleBucket) {
      this._scheduleBucket = bucket;
      this._updateVenues();
    }
    for (const npc of this.npcs) {
      const target = this._scheduleTargetFor(npc);
      const p = npc.person.position;
      const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      if (npc._pendingSchedule) {
        if (d > 55) this._applySchedule(npc, npc._pendingSchedule);
        continue;
      }
      if (target.key === npc._scheduleKey && npc.scheduleVisible === !!target.slot.visible) continue;
      const samePos = npc.person.visible && Number.isFinite(target.slot.x) &&
        Math.hypot(p.x - target.slot.x, p.z - target.slot.z) < 3;
      const canApply = d > 55 || !npc.scheduleVisible || samePos;
      if (canApply) this._applySchedule(npc, target);
      else npc._pendingSchedule = target;
    }
  }

  getVenueStatuses() {
    return this.venues.map(v => ({
      id: v.id,
      name: v.name,
      type: v.type,
      color: v.color,
      open: !!v.open,
      hours: v.hours || null,
      label: venueLabel(v.hours || {}),
      text: v.open ? 'aperto' : 'chiuso',
      status: v.status || null
    }));
  }

  setHour(hour) {
    this.hour = ((hour % 24) + 24) % 24;
  }

  setWeather(weather = {}) {
    this.weather = { rain: weather.rain || 0, clouds: weather.clouds ?? 0.2 };
    if (this.rainPoints) this.rainPoints.visible = this.weather.rain > 0.15;
    const wet = clamp(this.weather.rain * 1.4, 0, 1);
    if (this.roadMaterial?.isMeshStandardMaterial) {
      this.roadMaterial.roughness = 0.72 - wet * 0.58;
      this.roadMaterial.metalness = 0.025 + wet * 0.22;
      this.roadMaterial.color.setRGB(1 - wet * 0.24, 1 - wet * 0.22, 1 - wet * 0.19);
    }
    if (this.sidewalkMaterial?.isMeshStandardMaterial) {
      this.sidewalkMaterial.roughness = 0.9 - wet * 0.5;
      this.sidewalkMaterial.color.setRGB(1 - wet * 0.15, 1 - wet * 0.15, 1 - wet * 0.12);
    }
    if (this.waterMaterial) this.waterMaterial.opacity = 0.88 + wet * 0.04;
    if (this.puddleMaterial) {
      this.puddleMaterial.opacity = wet * 0.46;
      this.puddleMaterial.color.set(wet > 0.55 ? '#b6d5df' : '#9fbec9');
      this.puddleMesh.visible = wet > 0.04;
    }
    if (this.rainRipple) {
      this.rainRipple.mesh.visible = wet > 0.08;
      this.rainRipple.mesh.material.opacity = wet * 0.55;
    }
  }

  setSeason(style, id = 'autumn') {
    this.seasonStyle = style;
    this.seasonId = id;
    const palette = style?.palette || {};
    if (this.terrainMesh) this.terrainMesh.material.color.set(palette.terrainTint || '#ffffff');
    if (!this.arnis) {
      for (const mesh of this.areaMeshes || (this.areaMesh ? [this.areaMesh] : [])) {
        // Il prato mantiene il suo verde: il tint autunnale serve ad aree e piazze.
        mesh.material.color.set(mesh.name === 'aree-verdi' ? '#ffffff' : (palette.areaTint || '#ffffff'));
      }
    }

    const foliageMeshes = this.foliageMeshes?.length ? this.foliageMeshes : (this.foliageMesh ? [this.foliageMesh] : []);
    if (foliageMeshes.length && palette.tree?.length) {
      const color = new THREE.Color();
      for (const mesh of foliageMeshes) {
        for (let i = 0; i < mesh.count; i++) {
          color.set(palette.tree[i % palette.tree.length]);
          mesh.setColorAt(i, color);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }

    // Neve al suolo: un velo sopra piazze e prato, sotto le strade.
    if (!this.snowOverlay) {
      const geo = new THREE.PlaneGeometry(2800, 2800);
      const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
      this.snowOverlay = new THREE.Mesh(geo, mat);
      this.snowOverlay.rotation.x = -Math.PI / 2;
      this.snowOverlay.position.y = 0.052;
      this.snowOverlay.visible = false;
      this.snowOverlay.name = 'neve';
      this.scene.add(this.snowOverlay);
    }
    const snow = clamp(Number(palette.snow) || 0, 0, 1);
    this.snowOverlay.material.opacity = snow * 0.42;
    this.snowOverlay.visible = snow > 0.01;
    if (!this.arnis) {
      const roofMeshes = this.roofMeshes?.length ? this.roofMeshes : (this.roofMesh ? [this.roofMesh] : []);
      for (const mesh of roofMeshes) {
        mesh.material.emissive?.set(snow > 0.35 ? '#dfeaf2' : '#000000');
        if ('emissiveIntensity' in mesh.material) mesh.material.emissiveIntensity = snow * 0.35;
      }
    }

    this._setupSeasonParticles(style?.particles || { type: 'none' });
    this._setupChristmasLights(!!style?.props?.christmas);
  }

  _particleTexture(type) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    if (type === 'leaves') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(16, 16, 10, 5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _setupSeasonParticles(particles) {
    const type = particles.type || 'none';
    if (!this.seasonParticles) {
      const count = 600;
      const positions = new Float32Array(count * 3);
      const rnd = seededRandom(4242);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (rnd() - 0.5) * 70;
        positions[i * 3 + 1] = rnd() * 30 + 1;
        positions[i * 3 + 2] = (rnd() - 0.5) * 70;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.2,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        vertexColors: false,
        map: this._particleTexture(type),
        alphaTest: 0.02
      });
      const points = new THREE.Points(geo, mat);
      points.visible = false;
      points.frustumCulled = false;
      points.name = 'particelle-stagione';
      this.scene.add(points);
      this.seasonParticles = { points, count, rnd, speed: 1 };
    }
    const p = this.seasonParticles;
    const count = clamp(particles.count || 0, 0, p.count);
    p.points.geometry.setDrawRange(0, count);
    p.points.visible = type !== 'none' && count > 0;
    p.points.material.color.set(particles.color || '#ffffff');
    p.points.material.size = particles.size || 0.18;
    if (p.type !== type) {
      p.points.material.map?.dispose();
      p.points.material.map = this._particleTexture(type);
    }
    p.points.material.needsUpdate = true;
    p.speed = particles.speed || 1;
    p.type = type;
    p.points.position.set(0, 0, 0);
  }

  _setupChristmasLights(enabled) {
    if (!this.christmasLights) {
      const positions = [];
      for (const [x1, z1, x2, z2] of [
        [-330, 4, -290, 4], [-330, 14, -290, 14], [-20, 40, 30, 40], [-20, 22, 30, 22]
      ]) {
        const n = 34;
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1);
          positions.push(x1 + (x2 - x1) * u, 4.4 + Math.sin(u * Math.PI) * 1.4, z1 + (z2 - z1) * u);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color: '#ffd58a', size: 0.32, transparent: true, opacity: 0.95, depthWrite: false });
      this.christmasLights = new THREE.Points(geo, mat);
      this.christmasLights.visible = false;
      this.christmasLights.name = 'luci-natalizie';
      this.scene.add(this.christmasLights);
    }
    this.christmasLights.visible = enabled;
  }

  _updateSeasonParticles(dt, playerPos) {
    const p = this.seasonParticles;
    if (!p || !p.points.visible) return;
    p.points.position.set(playerPos.x, 0, playerPos.z);
    const pos = p.points.geometry.attributes.position;
    const count = p.points.geometry.drawRange.count;
    for (let i = 0; i < count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i) - dt * (p.type === 'snow' ? 2.2 : 1.1) * p.speed;
      let z = pos.getZ(i);
      x += Math.sin(this.time * 0.9 + i) * dt * 0.35;
      z += Math.cos(this.time * 0.7 + i * 0.7) * dt * 0.25;
      if (y < 0.3) {
        y = 26 + p.rnd() * 8;
        x = (p.rnd() - 0.5) * 70;
        z = (p.rnd() - 0.5) * 70;
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  update(dt, playerPos, camera) {
    this.time += dt;
    this._updateSky(playerPos);
    animateWater(this.time);
    this._updateSchedules(dt, playerPos);
    this._updateStars();
    this._updatePlaces();
    this._updateTrafficLights();
    this._updateLevelCrossings();
    this._updateTraffic(dt);
    this._updatePedestrians(dt);
    this._updateLife();
    this._updateNpcs(dt, playerPos);
    this._updateCrossingWalkers(dt);
    this._updateCyclists(dt);
    this._updateBus(dt);
    this._updateTrain(dt);
    this._updateEvent(dt);
    this._updateRain(dt, playerPos);
    this._updateRainRipples();
    this._updateSeasonParticles(dt, playerPos);
    this._updateClouds(dt);
  }

  _updateSky(playerPos) {
    const hour = this.hour;
    const theta = (hour - 6) / 12 * Math.PI;
    const elev = Math.sin(theta);
    const day = clamp((elev + 0.08) / 0.38, 0, 1);
    const sunset = clamp(1 - Math.abs(elev) / 0.32, 0, 1) * (hour > 5 && hour < 20 ? 1 : 0);
    const night = 1 - day;
    const sl = this.seasonStyle?.lighting || {};

    const nightTop = new THREE.Color('#101f34');
    const nightBottom = new THREE.Color('#304a5a');
    const dayTop = new THREE.Color('#285f8c');
    const dayBottom = new THREE.Color('#9fc4ca');
    const sunsetTop = new THREE.Color('#526a86');
    const sunsetBottom = new THREE.Color('#e0a572');
    const top = nightTop.clone().lerp(dayTop, day).lerp(sunsetTop, sunset * 0.45);
    const bottom = nightBottom.clone().lerp(dayBottom, day).lerp(sunsetBottom, sunset * 0.55);
    if (this.skyUniforms) {
      this.skyUniforms.topColor.value.copy(top);
      this.skyUniforms.bottomColor.value.copy(bottom);
      this.skyUniforms.sunColor.value.set(day > 0.35 ? '#ffe8b5' : '#ffbf82');
      this.skyUniforms.sunGlow.value = (0.6 + sunset * 0.8) * (1 - night * 0.55);
    }
    if (this.waterMaterial?.normalMap) {
      this.waterMaterial.normalMap.offset.x = this.time * 0.012;
      this.waterMaterial.normalMap.offset.y = this.time * 0.017;
    }
    if (this.windUniform) this.windUniform.value = this.time;
    this.scene.fog.color.copy(bottom).lerp(top, 0.25);
    if (sl.fogColor) this.scene.fog.color.lerp(new THREE.Color(sl.fogColor), 0.32);
    this.scene.fog.near = sl.fogNear ?? 150;
    this.scene.fog.far = (sl.fogFar ?? 820) - night * 120;

    const sunDir = new THREE.Vector3(Math.cos(theta), Math.max(-0.2, Math.sin(theta)), 0.32).normalize();
    if (this.skyUniforms) this.skyUniforms.sunDirection.value.copy(sunDir);
    this.sunLight.position.copy(playerPos).addScaledVector(sunDir, 220);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.intensity = (day * 2.1 + sunset * 0.45 + night * 0.32) * (sl.sunIntensity ?? 1);
    this.sunLight.color.set(day > 0.25 ? (sl.sunColor || '#fff1cf') : '#ffc98e');
    this.hemi.intensity = (0.5 + day * 0.75) * (sl.hemi ?? 1);
    this.hemi.color.copy(bottom).lerp(new THREE.Color('#cfe6ef'), 0.4);
    this.hemi.groundColor.set(night > 0.6 ? '#2b3830' : '#5b5a44');
    if (this.ambient) this.ambient.intensity = (0.12 + night * 0.34) * (sl.ambient ?? 1);

    if (this.skyDome) this.skyDome.position.set(playerPos.x, 0, playerPos.z);
    if (this.stars) this.stars.position.set(playerPos.x, 0, playerPos.z);
    this.sunSprite.position.copy(playerPos).addScaledVector(sunDir, 2600);
    this.sunSprite.visible = elev > -0.08;
    this.moonSprite.position.copy(playerPos).addScaledVector(new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z), 2600);
    this.moonSprite.visible = elev < 0.1;
    this.stars.visible = night > 0.55;
    if (this.stars.visible) this.stars.material.opacity = 0.55 + night * 0.35 + Math.sin(this.time * 0.7) * 0.025;

    const windowMeshes = this.windowMeshes?.length ? this.windowMeshes : (this.windowMesh ? [this.windowMesh] : []);
    for (const mesh of windowMeshes) {
      mesh.visible = true;
      const dayWin = new THREE.Color('#8fb4bd');
      const nightWin = new THREE.Color('#ffd58a').multiplyScalar(1.42);
      mesh.material.color.copy(dayWin).lerp(nightWin, night);
    }
    if (this.bulbMesh) {
      const c = new THREE.Color('#6f6f63').lerp(new THREE.Color('#ffe6a6').multiplyScalar(1.35), night);
      this.bulbMesh.material.color.copy(c);
    }
    for (const l of this.lampLights) l.intensity = night * 1.6;
    if (this.barLight) this.barLight.intensity = this.barBlue?.open === false ? 0 : night * 3.2;
    if (this.playerLight) {
      this.playerLight.position.set(playerPos.x, playerPos.y + 3.4, playerPos.z);
      this.playerLight.intensity = night * 1.35;
    }
    this.renderer.toneMappingExposure = (sl.exposure ?? 1.08) - night * 0.02;
    this.ambientNight = night;
    const wet = this.weather?.rain || 0;
    if (this.lightPoolMaterial) this.lightPoolMaterial.opacity = night * (0.4 + wet * 0.22);
    if (this.marketLight) this.marketLight.intensity = night * 3.0;
  }

  _updateStars() {
    const t = this.time;
    for (const s of this.starObjects) {
      if (s.collected) continue;
      s.group.position.y = 1.35 + Math.sin(t * 2.1 + s.phase) * 0.18;
      s.star.rotation.y += 0.02;
      s.star.rotation.z = Math.PI + Math.sin(t * 1.4 + s.phase) * 0.08;
      s.glow.material.opacity = 0.55 + Math.sin(t * 2.5 + s.phase) * 0.18;
      const sc = 1 + Math.sin(t * 2 + s.phase) * 0.08;
      s.glow.scale.set(2.6 * sc, 2.6 * sc, 1);
    }
  }

  _updatePlaces() {
    const t = this.time;
    for (const p of this.placeObjects) {
      if (p.visited) continue;
      p.octa.rotation.y += 0.018;
      p.octa.position.y = 7.4 + Math.sin(t * 1.7 + p.phase) * 0.25;
      p.beam.material.opacity = 0.1 + Math.sin(t * 1.3 + p.phase) * 0.03;
      p.ring.material.opacity = 0.3 + Math.sin(t * 1.5 + p.phase) * 0.1;
    }
  }

  _updateTraffic(dt) {
    for (const t of this.trafficCars) {
      const before = t.walker.pose();
      let stop = false;
      for (const l of this.trafficLights) {
        if (Math.hypot(before.x - l.group.position.x, before.z - l.group.position.z) < 13 && this._signalState(l, this.time) === 'red') {
          stop = true;
          break;
        }
      }
      if (!stop) {
        t.walker.advance(dt);
        t.car.userData.wheels?.forEach(w => {
          w.rotation.x += (t.walker.speed * dt) / (w.userData.radius || 0.34);
        });
      }
      const p = t.walker.pose();
      t.car.position.set(p.x, 0.06, p.z);
      t.car.rotation.y = Math.atan2(p.dx, p.dz);
    }
  }

  _updateCrossingWalkers(dt) {
    const time = this.time;
    const daylight = this.hour >= 6 && this.hour < 23;
    for (const p of this.crossingWalkers) {
      p.person.visible = daylight;
      const signal = p.signal ? this._signalState(p.signal, time) : 'red';
      if (p.state === 'waiting') {
        p.wait -= dt;
        if (signal === 'red' && p.wait <= 0) {
          p.state = 'crossing';
          p.target = p.t <= 0.01 ? 1 : 0;
        }
      } else {
        const span = Math.max(1, p.half * 2);
        const dir = p.target > p.t ? 1 : -1;
        p.t += dir * (p.speed / span) * dt;
        if ((dir > 0 && p.t >= p.target) || (dir < 0 && p.t <= p.target)) {
          p.t = p.target;
          p.state = 'waiting';
          p.wait = 1.4 + Math.random() * 2.5;
        }
      }
      const offset = (p.t * 2 - 1) * p.half;
      p.person.position.set(p.info.x + p.nx * offset, 0.04, p.info.z + p.nz * offset);
      if (p.state === 'crossing') {
        const dir = p.target > p.t ? 1 : -1;
        p.person.rotation.y = Math.atan2(p.nx * dir, p.nz * dir);
      }
      const limbs = p.person.userData.limbs;
      const moving = p.state === 'crossing';
      const a = moving ? Math.sin(time * 7.2 + p.phase) * 0.65 : 0;
      const b = moving ? Math.sin(time * 7.2 + p.phase + Math.PI) * 0.65 : 0;
      if (limbs) {
        limbs.legL.rotation.x = a;
        limbs.legR.rotation.x = b;
        limbs.armL.rotation.x = b * 0.65;
        limbs.armR.rotation.x = a * 0.65;
      }
    }
  }

  _updatePedestrians(dt) {
    const time = this.time;
    const daylight = this.hour >= 6 && this.hour < 23;
    for (const p of this.pedestrians) {
      p.person.visible = p.npc
        ? p.npc.scheduleVisible !== false
        : daylight && crowdVisible(p.district, p.crowdSlot ?? 0, this.hour);
      p.walker.advance(dt);
      const pose = p.walker.pose();
      p.person.position.set(pose.x, 0.04, pose.z);
      p.person.rotation.y = Math.atan2(pose.dx, pose.dz);
      const limbs = p.person.userData.limbs;
      const a = Math.sin(time * 5.2 + p.phase) * 0.55;
      const b = Math.sin(time * 5.2 + p.phase + Math.PI) * 0.55;
      if (limbs) {
        limbs.legL.rotation.x = a;
        limbs.legR.rotation.x = b;
        limbs.armL.rotation.x = b * 0.7;
        limbs.armR.rotation.x = a * 0.7;
      }
    }
  }

  _updateRain(dt, playerPos) {
    if (!this.rainPoints || !this.rainPoints.visible) return;
    const pos = this.rainPoints.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 18;
      if (y < 0) y = 30;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.rainPoints.position.set(playerPos.x, 0, playerPos.z);
  }

  _updateClouds(dt) {
    for (const c of this.clouds) {
      c.position.x += dt * 1.6;
      if (c.position.x > 1400) c.position.x = -1400;
    }
  }
}
