import * as THREE from 'three';
import { AREA_BY_ID, AREAS } from '../data.js';
import { areaStage } from '../sim.js';
import { C, mat, glow } from './materials.js';
import {
  animateAndroid,
  box,
  createAndroid,
  createEcoOrb,
  createGero,
  createHero,
  createRoom,
  octa,
  ring,
  updateRoom,
} from './models.js';
import { FX } from './fx.js';
import { LabCamera } from './camera.js';

function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        // Materials are shared through the cache; disposing one here would
        // break every other room using the same colour.
        if (m.map) m.map.dispose();
      }
    }
  });
}

function sealedRoom(area) {
  const g = new THREE.Group();
  g.position.set(area.pos.x, 0, area.pos.z);
  g.userData.areaId = area.id;
  g.userData.kind = 'sealed';
  g.add(box(1.84, 0.16, 1.44, mat(C.concreteDark), 0, -0.08, 0));
  g.add(box(1.84, 0.7, 0.09, mat('#1b2227'), 0, 0.35, -0.7));
  g.add(box(1.72, 0.58, 0.06, mat('#11171c'), 0, 0.36, 0.6));
  g.add(box(0.32, 0.32, 0.06, glow(area.accent, 0.35), 0, 0.38, 0.64));
  g.add(box(0.2, 0.05, 0.07, mat(C.steelDark), 0, 0.38, 0.67));
  g.add(box(0.05, 0.2, 0.07, mat(C.steelDark), 0, 0.38, 0.67));
  const warn = box(0.08, 0.08, 0.02, glow(C.amber, 0.8), 0.7, 0.55, 0.64);
  g.add(warn);
  g.userData.warn = warn;
  return g;
}

export class Lab {
  constructor(engine, state, cameraRig = new LabCamera()) {
    this.engine = engine;
    this.scene = engine.scene;
    this.camera = cameraRig;
    this.scene.add(this.camera.camera);
    this.fx = new FX(this.scene, 700);
    this.root = new THREE.Group();
    this.root.name = 'laboratorio';
    this.scene.add(this.root);
    this.hitboxes = [];
    this.roomGroups = new Map();
    this.roomLights = [];
    this.supervisors = new Map();
    this.selection = null;
    this.eco = createEcoOrb();
    this.eco.visible = false;
    this.scene.add(this.eco);
    this.ecoArea = null;
    this.battle = null;
    this.battleGroup = null;
    this.time = 0;
    this.quality = 'high';
    this.selected = null;
    this._lastState = state;
    this._steamClock = 0;
    this._snowClock = 0;
    this._dustClock = 0;
    this._buildBase();
    this._lights();
    this._gero = createGero({ seated: false });
    this._gero.scale.setScalar(0.92);
    const hq = AREA_BY_ID.hq;
    this._gero.position.set(hq.pos.x - 0.55, 0.03, hq.pos.z + 0.38);
    this._gero.rotation.y = -0.4;
    this.root.add(this._gero);
    this.camera.camera.userData.canvasRect = {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  _buildBase() {
    const base = new THREE.Group();
    base.name = 'base';
    base.add(box(7.6, 0.18, 9.8, mat('#11171c', { roughness: 0.94, metalness: 0.1 }), 0, -0.28, 0.9));
    base.add(box(7.6, 0.12, 0.22, mat(C.steelDark), 0, 0.02, -3.92));
    base.add(box(7.6, 0.12, 0.22, mat(C.steelDark), 0, 0.02, 5.72));
    base.add(box(0.22, 0.12, 9.8, mat(C.steelDark), -3.75, 0.02, 0.9));
    base.add(box(0.22, 0.12, 9.8, mat(C.steelDark), 3.75, 0.02, 0.9));
    const grid = new THREE.GridHelper(9, 24, C.steelDark, C.steelDark);
    grid.position.set(0, 0.015, 0.9);
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    base.add(grid);

    // Corridors: thin warm strips between the rooms, with cables for texture.
    const corridors = [
      [0, 0, 0, -1.05],
      [0, -1.05, 0, -2.1],
      [2.1, 0, 1.05, 0],
      [0, 2.1, 0, 1.05],
      [-2.1, 0, -1.05, 0],
      [0, 4.2, 0, 3.0],
      [0, 2.1, 0, 3.0],
    ];
    for (const [x1, z1, x2, z2] of corridors) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.01) continue;
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      const w = 0.38;
      const strip = box(len > Math.abs(z2 - z1) ? len + 0.4 : w, 0.025, len > Math.abs(z2 - z1) ? w : len + 0.4, mat('#1d262c'), cx, 0.02, cz, { cast: false });
      base.add(strip);
      const glowStrip = box(len > Math.abs(z2 - z1) ? len + 0.2 : 0.035, 0.012, len > Math.abs(z2 - z1) ? 0.035 : len + 0.2, glow(C.cyan, 0.45), cx, 0.04, cz, { cast: false });
      base.add(glowStrip);
    }

    // Back wall: a dark service bulkhead with pipes. It gives the diorama a
    // back side instead of letting the rooms float.
    base.add(box(6.9, 1.25, 0.16, mat('#0d1419'), 0, 0.62, -3.72));
    base.add(box(6.9, 0.03, 0.04, glow(C.cyan, 0.55), 0, 1.22, -3.63));
    for (let i = 0; i < 7; i++) {
      const x = -3.0 + i * 1.0;
      base.add(box(0.05, 0.9, 0.05, mat(C.steelDark), x, 0.64, -3.62));
      base.add(box(0.05, 0.05, 0.18, mat(C.steelLight), x, 1.05, -3.56));
    }
    base.add(octa(0.22, glow(C.cyan, 0.7), 0, 0.68, -3.58));
    base.add(ring(0.34, 0.012, glow(C.cyan, 0.5), 0, 0.68, -3.6));
    this.root.add(base);
  }

  _lights() {
    this.hemi = new THREE.HemisphereLight(0xb8e6ec, 0x2a1b16, 1.2);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffd8b0, 2.6);
    this.key.position.set(6.5, 11, 7.5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.left = -7;
    this.key.shadow.camera.right = 7;
    this.key.shadow.camera.top = 7;
    this.key.shadow.camera.bottom = -7;
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 30;
    this.key.shadow.bias = -0.0015;
    this.scene.add(this.key);
    this.rim = new THREE.DirectionalLight(0x5ac6d2, 0.85);
    this.rim.position.set(-7, 5, -6);
    this.scene.add(this.rim);
    this.fill = new THREE.AmbientLight(0x8faeb4, 0.22);
    this.scene.add(this.fill);
  }

  setQuality(name) {
    this.quality = name;
    this.key.castShadow = name !== 'low';
    this.engine.renderer.shadowMap.enabled = name !== 'low';
    for (const l of this.roomLights) l.visible = name !== 'low';
    this.fx.sparks.points.material.size = name === 'low' ? 0.045 : 0.055;
  }

  _ensureRoom(area, state) {
    const a = state.areas[area.id];
    const stage = a?.unlocked ? areaStage(a.level) : 0;
    const existing = this.roomGroups.get(area.id);
    if (existing && existing.userData.stage === stage && existing.userData.unlocked === Boolean(a?.unlocked)) {
      existing.userData.active = a?.active;
      existing.userData.power = a?.unlocked ? a.active : false;
      return existing;
    }
    if (existing) {
      this.root.remove(existing);
      disposeGroup(existing);
      this.roomGroups.delete(area.id);
      const idx = this.hitboxes.findIndex((h) => h.userData.areaId === area.id);
      if (idx >= 0) this.hitboxes.splice(idx, 1);
      const li = this.roomLights.indexOf(existing.userData.light);
      if (li >= 0) this.roomLights.splice(li, 1);
    }
    let g;
    if (!a?.unlocked) {
      g = sealedRoom(area);
    } else {
      g = createRoom(area, stage);
      for (const child of g.children) {
        if (child.isPointLight) {
          this.roomLights.push(child);
          child.userData.roomLight = true;
          if (!g.userData.light) g.userData.light = child;
        }
      }
      const standby = box(0.08, 0.08, 0.025, glow(C.amber, 1.3), 0.78, 0.82, 0.6);
      standby.visible = false;
      g.add(standby);
      g.userData.standby = standby;
    }
    g.userData.stage = stage;
    g.userData.unlocked = Boolean(a?.unlocked);
    g.userData.active = a?.active;
    g.userData.power = a?.unlocked ? a.active : false;
    this.root.add(g);
    this.roomGroups.set(area.id, g);

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.15, 1.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(area.pos.x, 0.55, area.pos.z);
    hit.userData.areaId = area.id;
    this.root.add(hit);
    this.hitboxes.push(hit);
    return g;
  }

  sync(state) {
    this._lastState = state;
    for (const area of AREAS) {
      const g = this._ensureRoom(area, state);
      const a = state.areas[area.id];
      const warn = g.userData.warn;
      if (warn) warn.visible = !a?.unlocked;
      if (g.userData.kind === 'room') {
        const inactive = a?.unlocked && !a.active;
        g.userData.power = !inactive;
        g.visible = true;
        if (g.userData.standby) g.userData.standby.visible = inactive;
        if (g.userData.light) g.userData.light.intensity = inactive ? 0.12 : 1.7;
      }
    }
    this._syncSupervisors(state);
    this._syncEco(state);
    this._syncSelection(state);
  }

  _syncSupervisors(state) {
    const wanted = new Set();
    for (const area of AREAS) {
      const a = state.areas[area.id];
      if (!a?.unlocked || !a.supervisor) continue;
      const c = state.cyborgs.find((x) => x.id === a.supervisor);
      if (!c) continue;
      const key = `${area.id}:${c.id}`;
      wanted.add(key);
      if (this.supervisors.has(key)) continue;
      const model = createAndroid({
        body: c.body,
        accent: c.accent,
        glow: c.glow,
        scale: 0.68,
        variant: c.blueprintId === 'sedici' ? 'tall' : c.blueprintId === 'ruggine' ? 'tank' : c.blueprintId === 'vento' || c.blueprintId === 'neve' ? 'slim' : 'standard',
      });
      model.position.set(area.pos.x + 0.55, 0.03, area.pos.z + 0.5);
      model.rotation.y = Math.PI + 0.2;
      this.root.add(model);
      this.supervisors.set(key, { model, areaId: area.id, cyborgId: c.id });
    }
    for (const [key, val] of [...this.supervisors]) {
      if (wanted.has(key)) continue;
      this.root.remove(val.model);
      disposeGroup(val.model);
      this.supervisors.delete(key);
    }
  }

  _syncEco(state) {
    const areaId = state.eco?.activeUntil && Date.now() <= state.eco.activeUntil ? state.eco.areaId : null;
    this.ecoArea = areaId;
    this.eco.visible = Boolean(areaId);
    if (areaId) {
      const a = AREA_BY_ID[areaId];
      this.eco.position.set(a.pos.x + 0.55, 0.85, a.pos.z + 0.35);
    }
  }

  _syncSelection(state) {
    const id = state.uiSelected || this.selected;
    if (!id || !state.areas[id]?.unlocked) {
      if (this.selection) this.selection.visible = false;
      return;
    }
    const area = AREA_BY_ID[id];
    if (!this.selection) {
      const g = new THREE.Group();
      const m = glow(C.cyanHot, 1.8);
      g.add(box(2.0, 0.02, 0.035, m, 0, 0.03, -0.82, { cast: false }));
      g.add(box(2.0, 0.02, 0.035, m, 0, 0.03, 0.82, { cast: false }));
      g.add(box(0.035, 0.02, 1.64, m, -1.0, 0.03, 0, { cast: false }));
      g.add(box(0.035, 0.02, 1.64, m, 1.0, 0.03, 0, { cast: false }));
      this.selection = g;
      this.scene.add(g);
    }
    this.selection.visible = true;
    this.selection.position.set(area.pos.x, 0, area.pos.z);
  }

  select(areaId, state) {
    this.selected = areaId;
    if (state) state.uiSelected = areaId;
    this._syncSelection(state || this._lastState);
  }

  focus(areaId, zoom = 1.6) {
    const a = AREA_BY_ID[areaId];
    if (!a) return;
    this.camera.focus({ x: a.pos.x, z: a.pos.z }, zoom);
  }

  resetView() {
    this.camera.reset();
  }

  pick(clientX, clientY, state) {
    this.camera.camera.userData.canvasRect = {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const ray = this.camera.screenRay(clientX, clientY);
    if (this.eco.visible) {
      const ecoHits = ray.intersectObject(this.eco, true);
      if (ecoHits.length) return { type: 'eco' };
    }
    const hits = ray.intersectObjects(this.hitboxes, false);
    if (hits.length) {
      return { type: 'area', areaId: hits[0].object.userData.areaId };
    }
    return null;
  }

  startBattle(squad, node) {
    this.clearBattle();
    const arena = AREA_BY_ID.arena;
    this.camera.focus({ x: arena.pos.x, z: arena.pos.z }, 2.15, true);
    const g = new THREE.Group();
    const players = [];
    const enemies = [];
    const count = Math.min(3, Math.max(1, squad.length));
    for (let i = 0; i < count; i++) {
      const c = squad[i];
      const m = createAndroid({
        body: c?.body || '#7c8b90',
        accent: c?.accent || C.cyan,
        glow: c?.glow || C.cyanHot,
        scale: 0.55,
        variant: c?.blueprintId === 'ruggine' ? 'tank' : 'standard',
      });
      m.position.set(arena.pos.x + (i - (count - 1) / 2) * 0.36, 0.11, arena.pos.z - 0.18);
      m.rotation.y = 0.2;
      g.add(m);
      players.push(m);
    }
    const enemy = createHero(node.enemy);
    enemy.scale.setScalar(0.62);
    enemy.position.set(arena.pos.x, 0.11, arena.pos.z + 0.38);
    enemy.rotation.y = Math.PI - 0.15;
    g.add(enemy);
    enemies.push(enemy);
    if (node.enemy.includes('+')) {
      const second = createHero(node.enemy.split('+')[1] || 'Vegeta');
      second.scale.setScalar(0.52);
      second.position.set(arena.pos.x + 0.4, 0.11, arena.pos.z + 0.42);
      second.rotation.y = Math.PI - 0.3;
      g.add(second);
      enemies.push(second);
    }
    const light = new THREE.PointLight(C.amber, 2.2, 2.8, 2);
    light.position.set(arena.pos.x, 1.2, arena.pos.z);
    g.add(light);
    this.root.add(g);
    this.battleGroup = g;
    this.battle = {
      t: 0,
      hitClock: 0,
      players,
      enemies,
      node,
      light,
      phase: 0,
    };
  }

  updateBattle(dt, t) {
    if (!this.battle) return;
    const b = this.battle;
    b.t += dt;
    b.hitClock -= dt;
    const all = [...b.players, ...b.enemies];
    for (const m of all) {
      if (m.userData.kind === 'cell') {
        m.userData.parts.torso.rotation.y = Math.sin(t * 1.8) * 0.08;
      } else {
        animateAndroid(m, dt, t, 'fight');
      }
      m.position.y = 0.11 + Math.max(0, Math.sin(t * 2.2 + (m.position.x || 0))) * 0.018;
    }
    if (b.hitClock <= 0) {
      b.hitClock = 0.42;
      const p = b.players[Math.floor(Math.random() * b.players.length)];
      const e = b.enemies[Math.floor(Math.random() * b.enemies.length)];
      if (p && e) {
        const mid = p.position.clone().lerp(e.position, 0.5);
        this.fx.impact({ x: mid.x, y: 0.38, z: mid.z }, Math.random() > 0.5 ? C.amber : C.cyanHot);
        b.light.intensity = 3.4;
      }
    }
    b.light.intensity += (2.2 - b.light.intensity) * Math.min(1, dt * 5);
    if (b.t > 4.2) {
      this.battle.phase = 1;
    }
  }

  clearBattle() {
    if (this.battleGroup) {
      this.root.remove(this.battleGroup);
      disposeGroup(this.battleGroup);
      this.battleGroup = null;
    }
    this.battle = null;
  }

  update(dt, t, state) {
    this.time = t;
    this.camera.update(dt);
    this._syncEco(state);
    for (const g of this.roomGroups.values()) updateRoom(g, dt, t);
    for (const val of this.supervisors.values()) {
      animateAndroid(val.model, dt, t, 'idle');
    }
    if (this._gero) {
      const p = this._gero.userData.parts;
      if (p) {
        p.head.rotation.y = Math.sin(t * 0.35) * 0.12;
        p.armL.rotation.x = Math.sin(t * 0.5) * 0.05;
      }
    }
    if (this.eco.visible) {
      this.eco.userData.core.rotation.y += dt * 1.4;
      this.eco.userData.ring.rotation.z += dt * 0.8;
      this.eco.position.y = 0.85 + Math.sin(t * 2.2) * 0.05;
      this.fx.snowAt(this.eco.position, 0.3);
    }
    this._steamClock -= dt;
    if (this._steamClock <= 0) {
      this._steamClock = 0.42;
      const unlocked = AREAS.filter((a) => state.areas[a.id]?.unlocked && state.areas[a.id]?.active);
      if (unlocked.length) {
        const a = unlocked[Math.floor(Math.random() * unlocked.length)];
        this.fx.steam({ x: a.pos.x + (Math.random() - 0.5) * 1.2, y: 0.5, z: a.pos.z + (Math.random() - 0.5) * 1.0 }, 1);
      }
    }
    this._snowClock -= dt;
    if (this._snowClock <= 0) {
      this._snowClock = 0.5;
      if (state.areas.garden?.unlocked) {
        const a = AREA_BY_ID.garden;
        this.fx.snowAt({ x: a.pos.x + (Math.random() - 0.5) * 1.5, y: 0.8, z: a.pos.z + (Math.random() - 0.5) * 1.2 }, 1);
      }
    }
    this._dustClock -= dt;
    if (this._dustClock <= 0) {
      this._dustClock = 1.3;
      this.fx.dust({ x: (Math.random() - 0.5) * 5, y: 0.2, z: (Math.random() - 0.5) * 7 }, 1);
    }
    this.updateBattle(dt, t);
    this.fx.update(dt, t);
  }
}
