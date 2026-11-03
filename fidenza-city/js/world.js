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
import { makeCar, makePerson, makeTreeGeometry } from './models.js';
import { hasStar, hasPlace } from './save.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

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
    const verts = [l1, r1, l2, r1, r2, l2];
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
  constructor({ scene, renderer, city, terrain, landmarks, quality = 'high' }) {
    this.scene = scene;
    this.renderer = renderer;
    this.city = city;
    this.terrain = terrain;
    this.landmarks = landmarks.landmarks;
    this.landmarksById = new Map(this.landmarks.map(l => [l.id, l]));
    this.hospital = landmarks.hospital;
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
    this.windowMesh = null;
    this.bulbMesh = null;
    this.rainPoints = null;
    this.clouds = [];
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
    await step(0.40, 'Poso i binari…', () => this._buildRailways());
    onProgress(0.45, 'Costruisco gli edifici…');
    await this._buildBuildings(onProgress);
    await step(0.64, 'Accendo le finestre…', () => this._buildWindows());
    await step(0.70, 'Pianto gli alberi…', () => this._buildProps());
    await step(0.78, 'Metto i luoghi simbolo…', () => this._buildLandmarks());
    await step(0.85, 'Nascondo le stelle…', () => this._buildCollectibles());
    await step(0.90, 'Parcheggio auto e Vespe…', () => this._buildVehicles());
    await step(0.94, 'Faccio girare la città…', () => this._buildTraffic());
    await step(0.97, 'Ultimi ritocchi…', () => this._buildAtmosphere());
    onProgress(1, 'Fidenza è pronta');
  }

  _setupScene() {
    this.scene.background = new THREE.Color('#9dc6d6');
    this.scene.fog = new THREE.Fog('#bcd3d2', 170, 820);

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
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sunLight = sun;

    // Cielo a gradiente
    const skyGeo = new THREE.SphereGeometry(4200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#6fa8c8') },
        bottomColor: { value: new THREE.Color('#d9e6df') },
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
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyUniforms = skyMat.uniforms;
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);

    // Sole e luna
    this.sunSprite = makeGlowSprite('rgba(255,236,180,1)');
    this.sunSprite.scale.set(260, 260, 1);
    this.scene.add(this.sunSprite);
    this.moonSprite = makeGlowSprite('rgba(210,230,255,0.9)');
    this.moonSprite.scale.set(160, 160, 1);
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
      colors[i * 3] = c.r * shade;
      colors[i * 3 + 1] = c.g * shade;
      colors[i * 3 + 2] = c.b * shade;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terreno';
    this.scene.add(mesh);
    this.terrainMesh = mesh;

    // Dettaglio procedurale del suolo: rompe la monotonia delle piazze.
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

  _buildAreas() {
    const geoms = [];
    const waterGeoms = [];
    const rnd = seededRandom(7);
    for (const a of this.city.areas) {
      const style = AREA_STYLE[a.kind] || AREA_STYLE.urban;
      const y = a.kind === 'water' ? 0.018 : a.kind === 'park' || a.kind === 'grass' || a.kind === 'forest' ? 0.026 : 0.032;
      const g = makePolygonGeometry(a.poly, y + (a.id % 5) * 0.0003, style.color);
      if (!g) continue;
      if (a.kind === 'water') waterGeoms.push(g);
      else geoms.push(g);
    }
    const merged = mergeClean(geoms);
    if (merged) {
      const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.receiveShadow = true;
      mesh.name = 'aree';
      this.scene.add(mesh);
    }
    const water = mergeClean(waterGeoms);
    if (water) {
      const mesh = new THREE.Mesh(water, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.94 }));
      mesh.receiveShadow = true;
      mesh.name = 'acqua';
      this.scene.add(mesh);
    }

    // Corsi d'acqua lineari
    const lineGeoms = [];
    const bankGeoms = [];
    for (const w of this.city.waterways) {
      const width = w.kind === 'river' ? 9.5 : w.kind === 'stream' ? 5.6 : w.kind === 'canal' ? 4 : 2.2;
      const bank = makeRibbon(w.pts, width + 3.2, 0.022, '#6f8b5f');
      if (bank) bankGeoms.push(bank);
      const waterLine = makeRibbon(w.pts, width, 0.028, '#4f8fa8');
      if (waterLine) lineGeoms.push(waterLine);
    }
    const bankMesh = mergeClean(bankGeoms);
    if (bankMesh) {
      const m = new THREE.Mesh(bankMesh, new THREE.MeshLambertMaterial({ vertexColors: true }));
      m.receiveShadow = true;
      this.scene.add(m);
    }
    const lineMesh = mergeClean(lineGeoms);
    if (lineMesh) {
      const m = new THREE.Mesh(lineMesh, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.94 }));
      m.receiveShadow = true;
      m.name = 'stirone';
      this.scene.add(m);
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
    // giunti di pavimentazione sulle strade pedonali
    for (const r of this.city.roads) {
      if (!['pedestrian', 'living_street'].includes(r.kind) || r.w < 4) continue;
      for (let i = 1; i < r.pts.length; i++) {
        const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i];
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const ux = dx / len, uz = dz / len;
        const nx = -uz, nz = ux;
        for (let d = 1.5; d < len; d += 3.2) {
          const cx = ax + ux * d, cz = az + uz * d;
          const hw = r.w / 2;
          pavingPoints.push(cx - nx * hw, 0.038, cz - nz * hw, cx + nx * hw, 0.038, cz + nz * hw);
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

  _buildRoads() {
    const roadGeoms = [];
    const sidewalkGeoms = [];
    const markGeoms = [];
    const labels = [];
    const rnd = seededRandom(19);
    for (const r of this.city.roads) {
      if (r.tunnel) continue;
      const style = ROAD_STYLE[r.kind] || ROAD_STYLE.residential;
      const baseY = 0.085 + (r.id % 9) * 0.0007;
      const isBridge = r.bridge;
      const y = baseY + (isBridge ? 0.38 : 0);
      if (style.sidewalk && r.w >= 4.5) {
        const sw = makeRibbon(r.pts, r.w + 2.6, 0.037 + (r.id % 5) * 0.0004, '#c3b79f');
        if (sw) sidewalkGeoms.push(sw);
      }
      const road = makeRibbon(r.pts, r.w, y, style.color);
      if (road) roadGeoms.push(road);
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
      if (r.name && r.length > 140 && labels.length < 9 && ['primary', 'secondary', 'tertiary'].includes(r.kind)) {
        const mid = r.pts[Math.floor(r.pts.length / 2)];
        labels.push({ text: r.name.toUpperCase(), x: mid[0], z: mid[1] });
      }
    }
    const roadMesh = mergeClean(roadGeoms);
    if (roadMesh) {
      const m = new THREE.Mesh(roadMesh, new THREE.MeshLambertMaterial({ vertexColors: true }));
      m.receiveShadow = true;
      m.name = 'strade';
      this.scene.add(m);
    }
    const sidewalkMesh = mergeClean(sidewalkGeoms);
    if (sidewalkMesh) {
      const m = new THREE.Mesh(sidewalkMesh, new THREE.MeshLambertMaterial({ vertexColors: true }));
      m.receiveShadow = true;
      m.name = 'marciapiedi';
      this.scene.add(m);
    }
    const marks = mergeClean(markGeoms);
    if (marks) {
      const m = new THREE.Mesh(marks, new THREE.MeshBasicMaterial({ vertexColors: true }));
      this.scene.add(m);
    }
    for (const l of labels) {
      const sp = makeTextSprite(l.text, { scale: 0.86, fontSize: 38, pad: 18, bg: 'rgba(244,235,218,.78)', color: '#334036' });
      sp.position.set(l.x, 5.4, l.z);
      this.scene.add(sp);
    }
  }

  _buildRailways() {
    const bedGeoms = [];
    const railGeoms = [];
    for (const r of this.city.railways) {
      const bed = makeRibbon(r.pts, 3.4, 0.07, '#6c6d66');
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

  async _buildBuildings(onProgress) {
    const skipNames = new Set([
      'Cattedrale di San Donnino',
      'Porta di San Donnino',
      'Teatro Girolamo Magnani',
      'Santuario della Gran Madre di Dio',
      'Chiesa di San Pietro',
      'Fidenza'
    ]);
    const comunale = this.landmarksById.get('comunale');
    const geoms = [];
    let count = 0;
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
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false, steps: 1, curveSegments: 1 });
      geom.rotateX(-Math.PI / 2);
      geom.translate(0, 0.06, 0);
      const roof = new THREE.Color(b.color).lerp(new THREE.Color('#a65a42'), b.kind === 'church' ? 0.2 : 0.38).multiplyScalar(0.94).getStyle();
      const dark = new THREE.Color(b.color).multiplyScalar(0.68).getStyle();
      const plinth = new THREE.Color(b.color).multiplyScalar(0.52).getStyle();
      geoms.push(paintGeometry(geom, b.color, { roofColor: roof, darkColor: dark, baseColor: plinth, baseHeight: 1.7 }));
      count++;
      if (count % 400 === 0) {
        onProgress(0.45 + 0.18 * (count / Math.max(1, this.city.buildings.length - skipNames.size)), 'Costruisco gli edifici…');
        await tick();
      }
    }
    const merged = mergeClean(geoms);
    if (merged) {
      const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = 'edifici';
      this.scene.add(mesh);
    }
  }

  _buildWindows() {
    const positions = [];
    const doorPositions = [];
    const bandPositions = [];
    const awningGeoms = [];
    const balconyGeoms = [];
    const awningColors = ['#b5503f', '#c2684b', '#3f748a', '#5d7a52', '#c99a3f', '#7f5a46'];
    let buildingIndex = 0;
    for (const b of this.city.buildings) {
      buildingIndex++;
      if (b.h < 4.2 || b.area < 28 || b.kind === 'roof') continue;
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
        const floors = Math.max(1, Math.min(6, Math.floor((b.h - 2.0) / 3.0)));
        const count = Math.max(1, Math.min(8, Math.floor(e.len / 3.1)));
        for (let f = 0; f < floors; f++) {
          const y = 2.15 + f * 3.0;
          if (y > b.h - 0.75) break;
          for (let i = 0; i < count; i++) {
            const u = (i + 0.65) / (count + 0.3);
            const cx = e.ax + (e.bx - e.ax) * u + e.nx * 0.065;
            const cz = e.az + (e.bz - e.az) * u + e.nz * 0.065;
            const w = 0.54, h = 0.82;
            const ex = e.ux * w * 0.5, ez = e.uz * w * 0.5;
            addQuad(positions,
              cx - ex, y - h / 2, cz - ez,
              cx + ex, y - h / 2, cz + ez,
              cx + ex, y + h / 2, cz + ez,
              cx - ex, y + h / 2, cz - ez);
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

      // Porta d'ingresso sul lato più lungo.
      const longest = edges.reduce((a, b) => a.len > b.len ? a : b, edges[0]);
      if (buildingIndex % 2 === 0 && longest.len > 5) {
        const u = 0.5;
        const cx = longest.ax + (longest.bx - longest.ax) * u + longest.nx * 0.07;
        const cz = longest.az + (longest.bz - longest.az) * u + longest.nz * 0.07;
        const ex = longest.ux * 0.62, ez = longest.uz * 0.62;
        addQuad(doorPositions,
          cx - ex, 0.12, cz - ez,
          cx + ex, 0.12, cz + ez,
          cx + ex, 2.35, cz + ez,
          cx - ex, 2.35, cz - ez);
      }

      // Tende colorate sopra alcune porte.
      if (this.quality !== 'low' && buildingIndex % 4 === 0 && longest.len > 7) {
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
      if (this.quality === 'high' && buildingIndex % 5 === 0 && longest.len > 6) {
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

    const windowGeo = new THREE.BufferGeometry();
    windowGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    windowGeo.computeVertexNormals();
    this.windowMesh = new THREE.Mesh(windowGeo, new THREE.MeshBasicMaterial({ color: '#4b5654', side: THREE.DoubleSide }));
    this.windowMesh.name = 'finestre';
    this.scene.add(this.windowMesh);

    if (doorPositions.length) {
      const doorGeo = new THREE.BufferGeometry();
      doorGeo.setAttribute('position', new THREE.Float32BufferAttribute(doorPositions, 3));
      doorGeo.computeVertexNormals();
      const doorMesh = new THREE.Mesh(doorGeo, new THREE.MeshLambertMaterial({ color: '#5a4636', side: THREE.DoubleSide }));
      doorMesh.name = 'porte';
      this.scene.add(doorMesh);
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
      const mesh = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: '#b8a58c', side: THREE.DoubleSide }));
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
  }

  _buildProps() {
    const rnd = seededRandom(1234);
    const treeMatrices = [];
    const addTree = (x, z, scale = 1) => {
      if (!this.isFree(x, z, 0.6)) return;
      treeMatrices.push({ x, z, s: scale * (0.8 + rnd() * 0.55), r: rnd() * Math.PI * 2 });
    };
    // alberi nei parchi e nelle piazze
    for (const a of this.city.areas) {
      const isSquare = a.kind === 'square';
      if (!['park', 'forest', 'grass', 'sport'].includes(a.kind) && !isSquare) continue;
      const bounds = polygonBounds(a.poly);
      const n = isSquare ? clamp(Math.round(a.area / 1300), 1, 6) : clamp(Math.round(a.area / 380), 1, 16);
      for (let i = 0; i < n; i++) {
        const x = bounds.minX + rnd() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + rnd() * (bounds.maxZ - bounds.minZ);
        if (pointInPoly(x, z, a.poly)) addTree(x, z, 0.9 + rnd() * 0.5);
      }
    }
    // alcuni alberi vicino al punto di partenza, per dare scala alla piazza
    for (const [x, z, s] of [
      [-118, 6, 1.15], [-145, 8, 1.0], [-145, 25, 1.1], [-120, 50, 1.05], [-136, 32, 0.95], [-108, 38, 0.9]
    ]) addTree(x, z, s);
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
          if (rnd() < 0.55) addTree(x, z, 0.8 + rnd() * 0.4);
        }
      }
    }
    const trees = treeMatrices.slice(0, this.quality === 'low' ? 160 : 360);
    if (trees.length) {
      const { trunk, foliage } = makeTreeGeometry();
      const trunkMesh = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ color: '#6b4c35' }), trees.length);
      const foliageMesh = new THREE.InstancedMesh(foliage, new THREE.MeshLambertMaterial({ color: '#ffffff' }), trees.length);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const greens = ['#4f7748', '#5d8850', '#6f9a5a', '#476b40', '#7fa164'];
      for (let i = 0; i < trees.length; i++) {
        const t = trees[i];
        dummy.position.set(t.x, 0, t.z);
        dummy.rotation.y = t.r;
        dummy.scale.set(t.s, t.s, t.s);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);
        foliageMesh.setMatrixAt(i, dummy.matrix);
        color.set(greens[Math.floor(rnd() * greens.length)]);
        foliageMesh.setColorAt(i, color);
      }
      trunkMesh.castShadow = true;
      foliageMesh.castShadow = true;
      trunkMesh.instanceMatrix.needsUpdate = true;
      foliageMesh.instanceMatrix.needsUpdate = true;
      if (foliageMesh.instanceColor) foliageMesh.instanceColor.needsUpdate = true;
      this.scene.add(trunkMesh, foliageMesh);
    }

    // lampioni
    const lampPositions = [];
    for (const r of this.city.roads) {
      if (!ROAD_STYLE[r.kind]?.sidewalk || r.w < 6 || r.length < 30) continue;
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
    for (const [x, z] of [[-125, 14], [-138, 22], [-120, 36]]) {
      if (this.isFree(x, z, 0.35)) lampPositions.push({ x, z, r: 0 });
    }
    const lamps = lampPositions.slice(0, this.quality === 'low' ? 120 : 260);
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
    for (const [x, z, r] of [[-122, 12, 0.4], [-140, 30, -0.8], [-126, 42, 1.9], [-110, 18, 0.2]]) {
      if (this.isFree(x, z, 0.8)) benchSpots.push({ x, z, r });
    }
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
      if (parked >= (this.quality === 'low' ? 3 : this.quality === 'medium' ? 5 : 7)) break;
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
      parked++;
    }
  }

  _buildLandmarks() {
    this.landmarkGroups = buildLandmarks({ world: this, scene: this.scene, landmarks: this.landmarks, city: this.city });
    // collider per obelisco
    this.addBoxCollider(-13.1, 32, 3.2, 3.2, 'obelisco');
    // piazza: fontana/aiuole
  }

  _buildCollectibles() {
    const starGeo = makeStarGeometry();
    const starMat = new THREE.MeshBasicMaterial({ color: '#ffd75e' });
    const ringGeo = new THREE.TorusGeometry(0.9, 0.035, 6, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#e7b95a' });
    const glowTex = createGlowTexture('rgba(255,225,130,1)');
    this.city.stars.forEach((s, i) => {
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

    this.landmarks.forEach((l, i) => {
      const visited = hasPlace(l.id);
      const spot = this._findPlaceSpot(l);
      const px = spot.x, pz = spot.z;
      const group = new THREE.Group();
      group.position.set(px, 0, pz);
      const mat = new THREE.MeshBasicMaterial({ color: visited ? '#e7b95a' : '#7cc4dd', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.4, 10, 12, 1, true), mat);
      beam.position.y = 5;
      group.add(beam);
      const octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: visited ? '#e7b95a' : '#9bd8ea' }));
      octa.position.y = 10.2;
      group.add(octa);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.08, 6, 36), new THREE.MeshBasicMaterial({ color: visited ? '#e7b95a' : '#7cc4dd', transparent: true, opacity: 0.6 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08;
      group.add(ring);
      group.visible = !visited;
      this.scene.add(group);
      this.placeObjects.push({ id: l.id, data: l, placeX: px, placeZ: pz, radius: 8, group, beam, octa, ring, visited, phase: i * 0.8 });
    });
  }

  _buildVehicles() {
    const cand = [
      { type: 'car', x: -160, z: 8, yaw: Math.PI * 1.5, label: 'Auto', color: '#c2684b' },
      { type: 'vespa', x: -163, z: 5, yaw: Math.PI * 0.4, label: 'Vespa', color: '#4f8fa8' },
      { type: 'car', x: 205, z: -100, yaw: Math.PI, label: 'Taxi', color: '#e7b95a', taxi: true },
      { type: 'vespa', x: -140, z: 25, yaw: Math.PI * 1.2, label: 'Vespa pizza', color: '#c2684b' },
      { type: 'car', x: -225, z: 62, yaw: Math.PI * 0.5, label: 'Auto', color: '#d9c9a8' },
      { type: 'car', x: -146, z: 30, yaw: Math.PI * 1.2, label: 'Ambulanza', color: '#f1ede2' }
    ];
    for (const c of cand) {
      const spot = this.findFreeSpot(c.x, c.z, c.type === 'car' ? 2.2 : 1.2);
      if (spot) this.vehicleSpawns.push({ ...c, x: spot.x, z: spot.z });
    }
  }

  _buildTraffic() {
    const rnd = seededRandom(77);
    const carRoads = this.city.roads.filter(r => ['primary', 'secondary', 'tertiary', 'residential'].includes(r.kind) && r.length > 70 && !r.tunnel);
    const pedRoads = this.city.roads.filter(r => ['footway', 'pedestrian', 'residential', 'living_street', 'path'].includes(r.kind) && r.length > 35 && !r.tunnel);
    const colors = ['#c2684b', '#4f8fa8', '#d9c9a8', '#5c6b5f', '#9a4a34', '#d7d2c7'];
    const carCount = this.quality === 'low' ? 4 : this.quality === 'medium' ? 6 : 9;
    for (let i = 0; i < carCount; i++) {
      const road = carRoads[Math.floor(rnd() * carRoads.length)];
      if (!road) continue;
      const walker = makeRouteWalker(road.pts, rnd() * 80, rnd() > 0.5 ? 1 : -1, 4.2 + rnd() * 2.5);
      const car = makeCar({ color: colors[Math.floor(rnd() * colors.length)] });
      car.position.y = 0.06;
      car.scale.setScalar(0.94);
      this.scene.add(car);
      this.trafficCars.push({ car, walker, phase: rnd() * 10 });
    }
    const pedCount = this.quality === 'low' ? 6 : this.quality === 'medium' ? 9 : 13;
    const shirts = ['#c2684b', '#4f8fa8', '#d9c9a8', '#5c6b5f', '#9a4a34', '#7c8d5b', '#d7d2c7'];
    const pants = ['#2f4a3c', '#3a3f46', '#5b4a3a', '#4e5a63'];
    for (let i = 0; i < pedCount; i++) {
      const road = pedRoads[Math.floor(rnd() * pedRoads.length)];
      if (!road) continue;
      const walker = makeRouteWalker(road.pts, rnd() * 40, rnd() > 0.5 ? 1 : -1, 0.9 + rnd() * 0.45);
      const person = makePerson({ shirt: shirts[Math.floor(rnd() * shirts.length)], pants: pants[Math.floor(rnd() * pants.length)] });
      this.scene.add(person);
      this.pedestrians.push({ person, walker, phase: rnd() * Math.PI * 2 });
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

    // Nuvole
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 256; cloudCanvas.height = 128;
    const cctx = cloudCanvas.getContext('2d');
    for (let i = 0; i < 9; i++) {
      const g = cctx.createRadialGradient(40 + rnd() * 176, 50 + rnd() * 40, 2, 40 + rnd() * 176, 50 + rnd() * 40, 40 + rnd() * 30);
      g.addColorStop(0, 'rgba(255,255,255,.72)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      cctx.fillStyle = g;
      cctx.fillRect(0, 0, 256, 128);
    }
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < (this.quality === 'low' ? 3 : 6); i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.42, depthWrite: false }));
      sp.position.set((rnd() - 0.5) * 2000, 250 + rnd() * 120, (rnd() - 0.5) * 2000);
      sp.scale.set(300 + rnd() * 220, 120 + rnd() * 80, 1);
      this.scene.add(sp);
      this.clouds.push(sp);
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
    const f = WORLD.flat;
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
    if (['park', 'square', 'museum'].includes(l.type) && this.isFree(l.x, l.z, 0.4)) return { x: l.x, z: l.z };
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

  setHour(hour) {
    this.hour = ((hour % 24) + 24) % 24;
  }

  setWeather(weather = {}) {
    this.weather = { rain: weather.rain || 0, clouds: weather.clouds ?? 0.2 };
    if (this.rainPoints) this.rainPoints.visible = this.weather.rain > 0.15;
  }

  update(dt, playerPos, camera) {
    this.time += dt;
    this._updateSky(playerPos);
    this._updateStars();
    this._updatePlaces();
    this._updateTraffic(dt);
    this._updatePedestrians(dt);
    this._updateRain(dt, playerPos);
    this._updateClouds(dt);
  }

  _updateSky(playerPos) {
    const hour = this.hour;
    const theta = (hour - 6) / 12 * Math.PI;
    const elev = Math.sin(theta);
    const day = clamp((elev + 0.08) / 0.38, 0, 1);
    const sunset = clamp(1 - Math.abs(elev) / 0.32, 0, 1) * (hour > 5 && hour < 20 ? 1 : 0);
    const night = 1 - day;

    const nightTop = new THREE.Color('#16283d');
    const nightBottom = new THREE.Color('#3b5361');
    const dayTop = new THREE.Color('#6fa8c8');
    const dayBottom = new THREE.Color('#d9e6df');
    const sunsetTop = new THREE.Color('#5e748e');
    const sunsetBottom = new THREE.Color('#e8b27b');
    const top = nightTop.clone().lerp(dayTop, day).lerp(sunsetTop, sunset * 0.45);
    const bottom = nightBottom.clone().lerp(dayBottom, day).lerp(sunsetBottom, sunset * 0.55);
    if (this.skyUniforms) {
      this.skyUniforms.topColor.value.copy(top);
      this.skyUniforms.bottomColor.value.copy(bottom);
    }
    this.scene.fog.color.copy(bottom).lerp(top, 0.25);
    this.scene.fog.near = 150;
    this.scene.fog.far = 820 - night * 160;

    const sunDir = new THREE.Vector3(Math.cos(theta), Math.max(-0.2, Math.sin(theta)), 0.32).normalize();
    this.sunLight.position.copy(playerPos).addScaledVector(sunDir, 220);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.intensity = day * 2.1 + sunset * 0.45 + night * 0.32;
    this.sunLight.color.set(day > 0.5 ? '#fff1cf' : '#ffc98e');
    this.hemi.intensity = 0.5 + day * 0.75;
    this.hemi.color.copy(bottom).lerp(new THREE.Color('#cfe6ef'), 0.4);
    this.hemi.groundColor.set(night > 0.6 ? '#2b3830' : '#5b5a44');
    if (this.ambient) this.ambient.intensity = 0.12 + night * 0.34;

    this.sunSprite.position.copy(playerPos).addScaledVector(sunDir, 2600);
    this.sunSprite.visible = elev > -0.08;
    this.moonSprite.position.copy(playerPos).addScaledVector(new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z), 2600);
    this.moonSprite.visible = elev < 0.1;
    this.stars.visible = night > 0.55;
    if (this.stars.visible) this.stars.material.opacity = 0.55 + night * 0.35;

    if (this.windowMesh) {
      this.windowMesh.visible = true;
      const dayWin = new THREE.Color('#4b5654');
      const nightWin = new THREE.Color('#ffd58a');
      this.windowMesh.material.color.copy(dayWin).lerp(nightWin, night);
    }
    if (this.bulbMesh) {
      const c = new THREE.Color('#6f6f63').lerp(new THREE.Color('#ffe6a6'), night);
      this.bulbMesh.material.color.copy(c);
    }
    for (const l of this.lampLights) l.intensity = night * 1.6;
    if (this.playerLight) {
      this.playerLight.position.set(playerPos.x, playerPos.y + 3.4, playerPos.z);
      this.playerLight.intensity = night * 1.35;
    }
    this.renderer.toneMappingExposure = 1.08 - night * 0.02;
    this.ambientNight = night;
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
      p.octa.position.y = 10.2 + Math.sin(t * 1.7 + p.phase) * 0.3;
      p.beam.material.opacity = 0.16 + Math.sin(t * 1.3 + p.phase) * 0.05;
      p.ring.material.opacity = 0.4 + Math.sin(t * 1.5 + p.phase) * 0.13;
    }
  }

  _updateTraffic(dt) {
    for (const t of this.trafficCars) {
      t.walker.advance(dt);
      const p = t.walker.pose();
      t.car.position.set(p.x, 0.06, p.z);
      t.car.rotation.y = Math.atan2(p.dx, p.dz);
      t.car.userData.wheels?.forEach((w, i) => { w.rotation.x += dt * 7 * (t.walker.dir); });
    }
  }

  _updatePedestrians(dt) {
    const time = this.time;
    for (const p of this.pedestrians) {
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
