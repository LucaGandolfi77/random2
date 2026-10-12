import * as THREE from 'three';
import { PROP_DEFS, pointsFor } from './props.js';
import { PROP_DEFS_EXTRA } from './props-extra.js';
import { currentTheme } from './themes.js';
import { propMaterial } from './palette.js';
import {
  MAP,
  shoreZ,
  groundY,
  isRoad,
  isPiazza,
  isSea,
  isBeach,
  isSeaDeep,
  isSolid,
  isPond,
  SPAWNS,
} from './layout.js';
import { clamp, makeRng } from '../core/utils.js';

const HALF = MAP.half;
const CELL = 12;
const key = (cx, cz) => cx * 4096 + cz;

/**
 * Il mondo "vivo": ogni prop è un'istanza in un InstancedMesh, interrogabile
 * con una griglia spaziale. Mangiare = spegnere l'istanza e far girare un clone
 * che risucchia. Poi la città si ricostruisce da sola, che è più bello.
 */
export class PropWorld {
  constructor(scene, { density = 1, seed = 20240607 } = {}) {
    this.scene = scene;
    this.density = density;
    this.rng = makeRng(seed);
    this.group = new THREE.Group();
    this.group.name = 'props';
    scene.add(this.group);

    this.material = propMaterial();
    this.items = [];
    this.byDef = new Map();
    this.grid = new Map();
    this.bigGrid = new Map();
    this.golds = [];
    this.falling = [];
    this.fallPool = [];
    this.eatenCount = 0;
    this._dirty = new Set();
    this._bobT = 0;
    this._time = 0;
    this._m4 = new THREE.Matrix4();
    this._pos = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._scl = new THREE.Vector3();

    this.themeId = currentTheme().id;
    this._build();
    this._buildGold();
    this._buildFallPool();
  }

  /* ------------------------------------------------------------ costruzione */

  /** Tutti i prop disponibili nel tema corrente (quelli senza etichetta sono universali). */
  static defsFor(themeId) {
    return [...PROP_DEFS, ...PROP_DEFS_EXTRA].filter(
      (d) => !d.themes || d.themes.includes(themeId)
    );
  }

  _build() {
    for (const d of PropWorld.defsFor(this.themeId)) {
      if (d.gold) continue;
      const count = Math.max(3, Math.round(d.count * this.density));
      const geo = d.build();
      const mesh = new THREE.InstancedMesh(geo, this.material, count);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = count;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(mesh);

      const rec = { def: d, mesh, items: [], points: pointsFor(d), placed: 0 };
      this.byDef.set(d.id, rec);

      for (let i = 0; i < count; i++) {
        const item = {
          def: d,
          rec,
          i,
          x: 0,
          z: 0,
          y: 0,
          ry: 0,
          s: 1,
          alive: false,
          respawn: 0,
          float: d.float ?? (d.zone === 'sea' ? 0 : 0),
          phase: this.rng() * 6.28,
        };
        this.items.push(item);
        rec.items.push(item);
        this._place(item, true);
      }
      this._flush(rec);
    }
  }

  _buildGold() {
    for (const d of PropWorld.defsFor(this.themeId).filter((p) => p.gold)) {
      const geo = d.build();
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.castShadow = true;
      mesh.visible = false;
      mesh.renderOrder = 3;
      mesh.name = `oro-${d.id}`;
      this.group.add(mesh);
      this.golds.push({ def: d, mesh, active: false, until: 0, spin: 0 });
    }
  }

  _buildFallPool() {
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(TINY_GEO, this.material);
      m.visible = false;
      m.castShadow = true;
      m.renderOrder = 4;
      this.group.add(m);
      this.fallPool.push(m);
    }
  }

  /* -------------------------------------------------------------- posizionamento */

  _cellRange(x, z, r) {
    return [
      [Math.floor((x - r) / CELL), Math.floor((z - r) / CELL)],
      [Math.floor((x + r) / CELL), Math.floor((z + r) / CELL)],
    ];
  }

  /**
   * I prop grandi (palazzi) hanno una griglia tutta loro: se condividessero
   * quella di sedie e lampioni non ci sarebbe spazio per costruire niente.
   */
  canPlace(x, z, r, big) {
    if (big) {
      // intorno ai punti di partenza niente muri, ma sì roba da mangiare
      for (const s of SPAWNS) {
        if ((s.x - x) ** 2 + (s.z - z) ** 2 < 14 * 14) return false;
      }
    }
    const grid = big ? this.bigGrid : this.grid;
    const [[ax, az], [bx, bz]] = this._cellRange(x, z, r);
    for (let cx = ax; cx <= bx; cx++) {
      for (let cz = az; cz <= bz; cz++) {
        const cell = grid.get(key(cx, cz));
        if (!cell) continue;
        for (const e of cell) {
          const d = (e.x - x) ** 2 + (e.z - z) ** 2;
          if (d < (e.r + r) ** 2) return false;
        }
      }
    }
    return true;
  }

  _occupy(item) {
    const entry = { x: item.x, z: item.z, r: item.def.r, item };
    for (const [g, k] of [
      [this.grid, key(Math.floor(item.x / CELL), Math.floor(item.z / CELL))],
      ...(item.def.r >= 1.6
        ? [[this.bigGrid, key(Math.floor(item.x / CELL), Math.floor(item.z / CELL))]]
        : []),
    ]) {
      let cell = g.get(k);
      if (!cell) g.set(k, (cell = []));
      cell.push(entry);
    }
  }

  _vacate(item) {
    const k = key(Math.floor(item.x / CELL), Math.floor(item.z / CELL));
    for (const g of [this.grid, this.bigGrid]) {
      const cell = g.get(k);
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        if (Math.abs(cell[i].x - item.x) < 0.001 && Math.abs(cell[i].z - item.z) < 0.001) {
          cell.splice(i, 1);
          break;
        }
      }
    }
  }

  /** Punto casuale coerente con una zona della mappa. */
  samplePoint(zone) {
    const rng = this.rng;
    if (zone === 'sea') {
      const x = rng.range(-HALF + 8, HALF - 8);
      const s = shoreZ(x);
      const z = rng.range(s + 3, HALF - 6);
      return { x, z };
    }
    if (zone === 'beach') {
      for (let i = 0; i < 8; i++) {
        const x = rng.range(-HALF + 8, HALF - 8);
        const s = shoreZ(x);
        const z = rng.range(s - MAP.beachDepth * 0.42 - 1, s + 1);
        return { x, z };
      }
      const x = rng.range(-HALF + 8, HALF - 8);
      return { x, z: shoreZ(x) - 4 };
    }
    if (zone === 'road') {
      const roads = [
        { axis: 'x', at: -34, w: 9 },
        { axis: 'x', at: -6, w: 7 },
        { axis: 'z', at: -14, w: 7 },
        { axis: 'z', at: 34, w: 6 },
      ];
      const r = rng.pick(roads);
      const along = rng.range(-HALF + 10, HALF - 10);
      const off = rng.range(-r.w * 0.34, r.w * 0.34);
      return r.axis === 'x' ? { x: along, z: r.at + off } : { x: r.at + off, z: along };
    }
    // town
    const x = rng.range(-HALF + 8, HALF - 8);
    const z = rng.range(-HALF + 8, 8);
    return { x, z };
  }

  zoneOk(x, z, d) {
    if (!isSolid(x, z) || isPond(x, z)) return false;
    const big = d.r >= 1.6;
    if (d.zone === 'sea') return isSeaDeep(x, z);
    if (d.zone === 'road') return isRoad(x, z) && !isSea(x, z);
    if (isSea(x, z)) return false;
    if (d.zone === 'beach') return true;
    // town: niente sull'asfalto per i grossi, niente in mezzo alla piazza
    if (big && isRoad(x, z)) return false;
    if (big && isPiazza(x, z)) return false;
    if (isBeach(x, z) && !d.id.startsWith('palma') && !d.id.startsWith('pino')) return false;
    return true;
  }

  _place(item, initial = false) {
    const d = item.def;
    const zone = d.zone === 'any' || d.zone === 'road' ? null : d.zone;
    const big = d.r >= 1.6;
    const order = big && d.zone === 'town' ? ['town', 'town'] : zone ? [zone, 'town', 'beach'] : ['town', 'road', 'beach'];
    const gap = big ? 6 : d.r * 1.6 + 0.6;
    for (const z of order) {
      for (let t = 0; t < 26; t++) {
        const p = this.samplePoint(z);
        if (!this.zoneOk(p.x, p.z, d)) continue;
        if (!this.canPlace(p.x, p.z, gap, big)) continue;
        this._setPose(item, p.x, p.z, initial);
        return true;
      }
    }
    item.alive = false;
    item.respawn = this._time + 2;
    this._write(item);
    return false;
  }


  _setPose(item, x, z, initial) {
    const d = item.def;
    if (item.alive) this._vacate(item);
    item.x = x;
    item.z = z;
    item.y =
      (d.zone === 'sea' ? MAP.seaLevel + 0.28 : groundY(x, z)) + (d.lift ?? 0);
    item.ry = this.rng() * Math.PI * 2;
    item.s = 1 + (d.scaleVar ? this.rng.range(-d.scaleVar, d.scaleVar) : this.rng.range(-0.09, 0.09));
    item.alive = true;
    item.respawn = 0;
    this._occupy(item);
    this._write(item);
  }

  _write(item) {
    const bob = item.float ? Math.sin(this._bobT * 1.3 + item.phase) * item.float * 0.14 : 0;
    this._pos.set(item.x, item.y + bob, item.z);
    this._quat.setFromAxisAngle(UP, item.ry);
    // un prop "morto" sparisce davvero, non si ferma a schermo acceso
    this._scl.setScalar(item.alive ? item.s : 0);
    this._m4.compose(this._pos, this._quat, this._scl);
    item.rec.mesh.setMatrixAt(item.i, this._m4);
    this._dirty.add(item.rec);
  }

  _flush(rec) {
    if (!rec || !this._dirty.has(rec)) return;
    rec.mesh.instanceMatrix.needsUpdate = true;
    this._dirty.delete(rec);
  }

  flushAll() {
    for (const rec of this._dirty) rec.mesh.instanceMatrix.needsUpdate = true;
    this._dirty.clear();
  }

  /* ---------------------------------------------------------------- gioco */

  /**
   * Restituisce la lista di prop divorabili dentro il raggio del buco.
   * Usata sia dal giocatore sia dall'IA.
   */
  query(hole, out) {
    out.length = 0;
    const reach = hole.eatReach;
    const rr = hole.r + 1.5;
    const [[ax, az], [bx, bz]] = this._cellRange(hole.x, hole.z, rr);
    for (let cx = ax; cx <= bx; cx++) {
      for (let cz = az; cz <= bz; cz++) {
        const cell = this.grid.get(key(cx, cz));
        if (!cell) continue;
        for (const e of cell) {
          const d2 = (e.x - hole.x) ** 2 + (e.z - hole.z) ** 2;
          if (d2 < (hole.r + 0.4) ** 2 && e.r <= reach) out.push(e);
        }
      }
    }
    return out;
  }

  /**
   * Visita i prop mangiabili in un raggio. Usata dall'IA per scegliere la
   * preda migliore: visit(item, distanza).
   */
  scan(x, z, radius, reach, visit) {
    const [[ax, az], [bx, bz]] = this._cellRange(x, z, radius);
    const r2 = radius * radius;
    for (let cx = ax; cx <= bx; cx++) {
      for (let cz = az; cz <= bz; cz++) {
        const cell = this.grid.get(key(cx, cz));
        if (!cell) continue;
        for (const e of cell) {
          const d2 = (e.x - x) ** 2 + (e.z - z) ** 2;
          if (d2 < r2 && e.r <= reach) visit(e.item, Math.sqrt(d2));
        }
      }
    }
  }

  /** Mangia davvero: nasconde l'istanza e avvia la risucchiatura. */
  consume(item, hole) {
    item.alive = false;
    this._vacate(item);
    item.respawn = this._time + 2.5 + this.rng() * 4.5;
    this._write(item);
    this.eatenCount++;
    this._startFall(item, hole);
  }

  _startFall(item, hole) {
    const mesh = this.fallPool.find((m) => !m.visible);
    if (!mesh) return;
    mesh.geometry = item.rec.mesh.geometry;
    mesh.visible = true;
    this.falling.push({
      mesh,
      t: 0,
      dur: 0.42 + item.def.r * 0.02,
      x: item.x,
      z: item.z,
      y: item.y + Math.min(0.6, item.def.r * 0.5),
      ry: item.ry,
      s: item.s,
      hole,
    });
  }

  _updateFalling(dt) {
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt;
      const p = clamp(f.t / f.dur, 0, 1);
      const shrink = Math.pow(1 - p, 1.35);
      const hx = f.hole ? f.hole.x : f.x;
      const hz = f.hole ? f.hole.z : f.z;
      const spin = f.ry + p * 7.5;
      const wob = (1 - p) * 0.45;
      f.mesh.position.set(
        hx + (f.x - hx) * shrink + Math.cos(spin * 1.6) * wob,
        f.y + (-0.12 - f.y) * p,
        hz + (f.z - hz) * shrink + Math.sin(spin * 1.6) * wob
      );
      f.mesh.rotation.y = spin;
      f.mesh.rotation.z = Math.sin(spin) * 0.4;
      const s = f.s * (0.35 + 0.65 * shrink);
      f.mesh.scale.set(s, s, s);
      if (p >= 1) {
        f.mesh.visible = false;
        this.falling.splice(i, 1);
      }
    }
  }

  /** Oro: un evento raro, vale 500 punti e sparisce in fretta. */
  spawnGold(now) {
    const candidates = this.golds.filter((g) => !g.active);
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(this.rng() * candidates.length)];
    let placed = false;
    for (let t = 0; t < 30 && !placed; t++) {
      const x = this.rng.range(-HALF * 0.72, HALF * 0.72);
      const z = this.rng.range(-HALF * 0.72, HALF * 0.5);
      if (isSeaDeep(x, z) || isRoad(x, z)) continue;
      if (!this.canPlace(x, z, 3.5)) continue;
      pick.active = true;
      pick.until = now + 16;
      pick.spin = 0;
      pick.x = x;
      pick.z = z;
      pick.mesh.position.set(x, groundY(x, z) + 0.9, z);
      pick.mesh.visible = true;
      placed = true;
    }
    return placed ? pick : null;
  }

  /** L'oro è divorabile solo se sei abbastanza grande. */
  queryGold(hole) {
    for (const g of this.golds) {
      if (!g.active) continue;
      const d2 = (g.x - hole.x) ** 2 + (g.z - hole.z) ** 2;
      if (d2 < (hole.r * 0.92) ** 2 && hole.r >= g.def.r) return g;
    }
    return null;
  }

  consumeGold(g, hole) {
    g.active = false;
    g.mesh.visible = false;
    const mesh = this.fallPool.find((m) => !m.visible);
    this.eatenCount++;
    if (mesh) {
      mesh.geometry = g.mesh.geometry;
      mesh.visible = true;
      this.falling.push({
        mesh,
        t: 0,
        dur: 0.85,
        x: g.x,
        z: g.z,
        y: g.mesh.position.y,
        ry: 0,
        s: 1,
        hole,
      });
    }
  }

  /* ------------------------------------------------------------- ciclo vita */

  update(dt, now, holes) {
    this._time = now;
    this._bobT += dt;
    this._updateFalling(dt);

    // oro
    for (const g of this.golds) {
      if (!g.active) continue;
      g.spin += dt;
      g.mesh.rotation.y += dt * 0.9;
      g.mesh.position.y = groundY(g.x, g.z) + 0.9 + Math.sin(g.spin * 2) * 0.16;
      if (now > g.until) {
        g.active = false;
        g.mesh.visible = false;
      }
    }

    // rispawn dei prop mangiati
    for (const item of this.items) {
      if (item.alive || item.respawn === 0 || now < item.respawn) continue;
      item.respawn = 0;
      // non serve che il posto sia deserto: basta che nessun buco sia sopra
      let clear = true;
      for (const h of holes) {
        if ((h.x - item.x) ** 2 + (h.z - item.z) ** 2 < 196) {
          clear = false;
          break;
        }
      }
      if (!clear) {
        item.respawn = now + 1.5;
        continue;
      }
      if (this.rng.chance(0.92)) this._place(item);
    }

    // moto ondoso sui prop galleggianti
    for (const rec of this.byDef.values()) {
      if (rec.def.zone !== 'sea' && !rec.def.float) continue;
      for (const item of rec.items) if (item.alive) this._write(item);
    }

    for (const rec of this._dirty) rec.mesh.instanceMatrix.needsUpdate = true;
    this._dirty.clear();
  }

  /** Reso al menu: riaccende tutto quello che è stato divorato. */
  resetAll() {
    for (const item of this.items) {
      if (!item.alive) {
        item.alive = true;
        item.respawn = 0;
        this._place(item);
      }
    }
    for (const g of this.golds) {
      g.active = false;
      g.mesh.visible = false;
    }
    for (const f of this.falling) f.mesh.visible = false;
    this.falling.length = 0;
    this.eatenCount = 0;
    this.flushAll();
  }

  get aliveCount() {
    let n = 0;
    for (const it of this.items) if (it.alive) n++;
    return n;
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const TINY_GEO = new THREE.BoxGeometry(0.01, 0.01, 0.01);
