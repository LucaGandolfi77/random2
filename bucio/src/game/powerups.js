import * as THREE from 'three';
import { P, c } from '../world/palette.js';
import { part, merge, ico, cyl } from '../world/geometry.js';
import { MAP, groundY, isSolid, isSea, SPAWNS } from '../world/layout.js';
import { makeRng } from '../core/utils.js';

/**
 * I potenziamenti: gemme che compaiono nel mondo e che chiunque può
 * agganciare. Durano una partita, si sommano (con priorità) e si vedono
 * nell'HUD con il tempo che resta.
 */
export const POWERS = {
  turbo: {
    label: 'TURBO',
    desc: 'velocità doppia',
    color: 0xffd15c,
    dur: 9,
    icon: '»',
  },
  magnetismo: {
    label: 'MAGNETISMO',
    desc: 'risucchia molto più lontano',
    color: 0x6fd8ff,
    dur: 10,
    icon: '@',
  },
  punti: {
    label: 'PUNTI DORATI',
    desc: 'punti doppi',
    color: 0xff6fa8,
    dur: 13,
    icon: 'x2',
  },
  gigante: {
    label: 'INGHIO',
    desc: 'diventa subito più grande',
    color: 0xa8ff8f,
    dur: 0,
    icon: '+',
  },
  scudo: {
    label: 'SCUDO',
    desc: 'nessuno può divorarti',
    color: 0x8fd8ff,
    dur: 14,
    icon: 'O',
  },
  ruba: {
    label: 'COLPO DI FORTUNA',
    desc: 'rubi punti al leader',
    color: 0xc08bff,
    dur: 0,
    icon: '!',
  },
};

const ORDER = Object.keys(POWERS);
const DEFS = ORDER.map((id) => ({ id, ...POWERS[id] }));

function gemGeometry(color) {
  return merge([
    part(ico(0.55, 0), color, { y: 1.1 }),
    part(ico(0.26, 0), 0xffffff, { y: 1.55 }),
    part(cyl(0.36, 0.5, 0.22, 6), 0x2b2b3a, { y: 0.11 }),
  ]);
}

const RING_GEO = new THREE.RingGeometry(0.8, 1.05, 24).rotateX(-Math.PI / 2);
const BEAM_GEO = new THREE.CylinderGeometry(0.75, 0.95, 5, 10, 1, true);

export class PowerUps {
  constructor(scene, { rng, max = 3 } = {}) {
    this.scene = scene;
    this.rng = rng ?? makeRng(99);
    this.max = max;
    this.active = [];
    this.spawned = 0;
    this.group = new THREE.Group();
    this.group.name = 'potenziamenti';
    scene.add(this.group);

    const geo = DEFS.map((d) => gemGeometry(d.color));
    for (let i = 0; i < max; i++) {
      const def = DEFS[i % DEFS.length];
      const root = new THREE.Group();
      const gem = new THREE.Mesh(
        geo[ORDER.indexOf(def.id)],
        new THREE.MeshLambertMaterial({ color: c(def.color), flatShading: true, emissive: c(def.color), emissiveIntensity: 0.35 })
      );
      gem.castShadow = true;
      const ring = new THREE.Mesh(
        RING_GEO,
        new THREE.MeshBasicMaterial({
          color: c(def.color),
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      const beam = new THREE.Mesh(
        BEAM_GEO,
        new THREE.MeshBasicMaterial({
          color: c(def.color),
          transparent: true,
          opacity: 0.09,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      beam.position.y = 2.5;
      root.add(ring, beam, gem);
      root.visible = false;
      root.userData = { def, gem, ring, beam, t: 0, life: 0, x: 0, z: 0 };
      this.group.add(root);
      this.active.push(root);
    }
  }

  /** Trova un posto libero sulla terraferma. */
  _spot(holes) {
    for (let i = 0; i < 40; i++) {
      const x = this.rng.range(-MAP.half * 0.82, MAP.half * 0.82);
      const z = this.rng.range(-MAP.half * 0.82, MAP.half * 0.55);
      if (!isSolid(x, z) || isSea(x, z)) continue;
      if (SPAWNS.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 400)) continue;
      if (this.active.some((a) => a.visible && (a.userData.x - x) ** 2 + (a.userData.z - z) ** 2 < 900))
        continue;
      let busy = false;
      for (const h of holes) if ((h.x - x) ** 2 + (h.z - z) ** 2 < 900) busy = true;
      if (busy) continue;
      return { x, z };
    }
    return null;
  }

  spawn(holes, now) {
    const slot = this.active.find((a) => !a.visible);
    if (!slot) return null;
    const p = this._spot(holes);
    if (!p) return null;
    // evita di ripetere troppo spesso lo stesso potenziamento
    const pool = DEFS.filter((d) => this.rng() < 0.6 || this.spawned < 3);
    const def = this.rng.pick(pool.length ? pool : DEFS);
    slot.userData.def = def;
    slot.userData.gem.material.color.set(def.color);
    slot.userData.gem.material.emissive.set(def.color);
    slot.userData.ring.material.color.set(def.color);
    slot.userData.beam.material.color.set(def.color);
    slot.userData.x = p.x;
    slot.userData.z = p.z;
    slot.userData.y = isSea(p.x, p.z) ? MAP.seaLevel + 0.2 : groundY(p.x, p.z);
    slot.userData.life = 17;
    slot.userData.t = 0;
    slot.visible = true;
    this.spawned++;
    return { def, x: p.x, z: p.z, y: slot.userData.y };
  }

  update(dt, now, holes, hooks) {
    for (const a of this.active) {
      const u = a.userData;
      if (!a.visible) continue;
      u.t += dt;
      u.life -= dt;
      u.gem.rotation.y += dt * 1.8;
      u.gem.position.y = 1.15 + Math.sin(u.t * 2.2) * 0.16;
      u.ring.rotation.y += dt * 0.7;
      u.ring.scale.setScalar(1 + Math.sin(u.t * 2.6) * 0.09);
      u.beam.rotation.y -= dt * 0.4;
      // lampeggia quando sta per sparire
      const blink = u.life < 4 ? (Math.sin(u.t * 16) > 0 ? 1 : 0.25) : 1;
      u.ring.material.opacity = 0.55 * blink;
      u.beam.material.opacity = 0.09 * blink;

      let eaten = false;
      for (const h of holes) {
        const reach = h.r * 0.6 + 1.1;
        if ((u.x - h.x) ** 2 + (u.z - h.z) ** 2 < reach * reach) {
          hooks.onPickup(h, u.def, { x: u.x, z: u.z, y: u.y });
          eaten = true;
          break;
        }
      }
      if (eaten || u.life <= 0) a.visible = false;
    }
  }

  clear() {
    for (const a of this.active) a.visible = false;
    this.spawned = 0;
  }
}

/** Stato degli effetti attivi su un buco. */
export function makePowerState() {
  return { turbo: 0, magnetismo: 0, punti: 0, gigante: 0, scudo: 0, ruba: 0 };
}

/** Applica un potenziamento a un buco e restituisce la notizia per l'HUD. */
export function applyPower(hole, id, ctx) {
  const p = POWERS[id];
  if (!p) return null;
  const st = (hole.powers ??= makePowerState());
  switch (id) {
    case 'gigante':
      hole.addMass(9);
      return p;
    case 'ruba': {
      const rival = ctx.rivals
        .filter((h) => h !== hole)
        .sort((a, b) => b.score - a.score)[0];
      if (!rival) return null;
      const steal = Math.round(rival.score * 0.2);
      rival.score = Math.max(0, rival.score - steal);
      hole.addScore(steal);
      return { ...p, amount: steal, victim: rival.name };
    }
    default:
      st[id] = Math.max(st[id] ?? 0, p.dur);
      return p;
  }
}

export function tickPowers(hole, dt) {
  const st = hole.powers;
  if (!st) return;
  for (const k of ORDER) {
    if (st[k] > 0) st[k] = Math.max(0, st[k] - dt);
  }
}

export const powerList = () => DEFS;