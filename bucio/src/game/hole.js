import * as THREE from 'three';
import { P, c } from '../world/palette.js';
import { clampToBounds, groundY } from '../world/layout.js';

export const R0 = 1.15; // raggio iniziale
export const R_MAX = 15.5; // oltre questo si continua a mangiare, non a crescere
const GROWTH = 0.42; // esponente < 0.5 = crescita con rendimenti decrescenti
const BASE_SPEED = 17.5;
const ACCEL = 46;
const DRAG = 4.6;

/** Le quattro fasi della crescita: ognuna sblocca qualcosa. */
export const TIERS = [
  { r: 0, name: 'Ossetto', perk: 'Sei appena caduto dal cielo.' },
  { r: 2.3, name: 'Fame', perk: '+20% punti su tutto.' },
  { r: 4.2, name: 'Attrazione', perk: 'Risucchi roba quasi troppo grande.' },
  { r: 6.6, name: 'Boccone', perk: 'Divori i rivali: 3× il loro punteggio.' },
  { r: 9.6, name: 'Ondata', perk: 'SPAZIO: onda di gravità.' },
];

export const tierOf = (r) => {
  let t = 0;
  for (let i = 1; i < TIERS.length; i++) if (r >= TIERS[i].r) t = i;
  return t;
};

const RIVALS = [
  { name: 'Buco Nero', color: 0x2b2f45 },
  { name: 'Vermezzo', color: 0xd9455f },
  { name: 'Sfregio', color: 0x3f9ecf },
  { name: 'Boccone', color: 0x6bbf59 },
  { name: 'Tunnel', color: 0xc07be0 },
];

/**
 * Un buco: disco nero, imbuto a vortice, rim identifying.
 * Vale sia per il giocatore sia per i rivali IA.
 */
export class Hole {
  constructor(opts) {
    this.isPlayer = !!opts.isPlayer;
    this.name = opts.name;
    this.color = opts.color;
    this.x = opts.x;
    this.z = opts.z;
    this.vx = 0;
    this.vz = 0;
    this.mass = 1;
    this.r = R0;
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.tier = 0;
    this.invuln = 0;
    this.stun = 0;
    this.eaten = 0;
    this.kills = 0;
    this.bestR = R0;
    this.input = { x: 0, y: 0, mag: 0 };
    this.pulse = null;
    this.satiety = 0;
    this.idleT = 0;
    this.lastVictim = null;
    this._spin = 0;

    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);
    this._build();
    if (this.isPlayer) this.group.renderOrder = 6;
  }

  _build() {
    const g = this.group;

    // La buca: nero piatto, quasi nero, non illuminato.
    const pitGeo = new THREE.CircleGeometry(1.0, 28);
    const pp = pitGeo.attributes.position;
    const pc = new Float32Array(pp.count * 3);
    const mid = new THREE.Color(0x0a0710);
    const edge = new THREE.Color(0x241a26);
    const pitCol = new THREE.Color();
    for (let i = 0; i < pp.count; i++) {
      const t = Math.min(1, Math.hypot(pp.getX(i), pp.getY(i)));
      pitCol.copy(mid).lerp(edge, Math.pow(t, 1.6));
      pc[i * 3] = pitCol.r;
      pc[i * 3 + 1] = pitCol.g;
      pc[i * 3 + 2] = pitCol.b;
    }
    pitGeo.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    const pit = new THREE.Mesh(
      pitGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      })
    );
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = 0.03;
    pit.renderOrder = 5;
    this.pit = pit;
    g.add(pit);

    // Imbuto: cilindro aperto con spicchi a spirale (il "vortice").
    const geo = new THREE.CylinderGeometry(1.0, 0.12, 1.5, 18, 2, true);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const deep = c(0x000000);
    const rim = c(0x2a2233);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 1.5 + 0.5; // 0 dentro, 1 fuori
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      const swirl = 0.5 + 0.5 * Math.sin(a * 3 + y * 7.5);
      col.copy(deep).lerp(rim, Math.pow(y, 2.2) * (0.55 + swirl * 0.75));
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.funnel = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.97,
      })
    );
    this.funnel.position.y = -0.72;
    this.funnel.renderOrder = 4;
    g.add(this.funnel);

    // Rim: terra smossa colorata, così distingui subito chi è chi.
    const rimMat = new THREE.MeshLambertMaterial({
      color: this.isPlayer ? c(0x4a3b30) : c(this.color),
      flatShading: true,
    });
    this.rim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.1, 4, 24), rimMat);
    this.rim.rotation.x = -Math.PI / 2;
    this.rim.position.y = 0.05;
    this.rim.castShadow = true;
    this.rim.receiveShadow = true;
    g.add(this.rim);

    // Ombra di contatto: anello scuro attorno alla buca.
    const shade = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.2, 24),
      new THREE.MeshBasicMaterial({
        color: 0x120c04,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );
    shade.rotation.x = -Math.PI / 2;
    shade.position.y = 0.02;
    g.add(shade);
    this.shade = shade;
  }

  get speed() {
    return BASE_SPEED * Math.pow(R0 / this.r, 0.26);
  }

  get massRatio() {
    return this.mass;
  }

  /**
   * Cosa può inghiottire: un po' meno del proprio raggio (altrimenti un
   * oggetto grande quanto te resterebbe incastonato), e un po' di più dal
   * livello 3 grazie all'attrazione. Unica fonte di verità: IA e fisica
   * devono usare la stessa regola, altrimenti si gira intorno a un palazzo
   * che non potrà mai mangiare.
   */
  get eatReach() {
    return this.r * 0.95 * (this.tier >= 2 ? 1.16 : 1);
  }

  /** Un buco saturo non si allarga più: è un tetto, non un bug. */
  get saturated() {
    return this.r >= R_MAX - 0.01;
  }

  get pulseReady() {
    return this.tier >= 4;
  }

  /**
   * Moltiplicatore punti: +20% dal livello 2, ma metà punti quando il buco è
   * già saturo — a quel punto la partita si decide tra rivali, non a spazzare.
   */
  get scoreMul() {
    const fame = this.tier >= 1 ? 1.2 : 1;
    return this.saturated ? fame * 0.55 : fame;
  }

  addMass(m) {
    this.mass += m;
    this.r = Math.min(R_MAX, R0 * Math.pow(this.mass, GROWTH));
    this.bestR = Math.max(this.bestR, this.r);
  }

  addScore(pts) {
    this.score += Math.round(pts * this.scoreMul);
  }

  bumpCombo() {
    this.comboT = 1.5;
    this.combo = Math.min(this.combo + 1, 50);
    return this.combo;
  }

  breakCombo() {
    this.combo = 0;
    this.comboT = 0;
  }

  firePulse() {
    if (!this.pulseReady || this.pulse) return false;
    this.pulse = { t: 0, dur: 0.85, r: this.r, x: this.x, z: this.z };
    this.justPulsed = true;
    return true;
  }

  knock(dx, dz, power = 1) {
    const len = Math.hypot(dx, dz) || 1;
    this.vx += (dx / len) * 26 * power;
    this.vz += (dz / len) * 26 * power;
  }

  update(dt, now) {
    const inp = this.input;
    const mag = this.stun > 0 ? 0 : Math.min(1, inp.mag);
    const dirx = inp.mag > 0.06 ? inp.x / Math.max(0.06, inp.mag) : 0;
    const dirz = inp.mag > 0.06 ? inp.y / Math.max(0.06, inp.mag) : 0;

    const acc = ACCEL * mag;
    this.vx += dirx * acc * dt;
    this.vz += dirz * acc * dt;
    const drag = Math.exp(-DRAG * dt);
    this.vx *= drag;
    this.vz *= drag;

    // mai più veloce della velocità massima
    const sp = Math.hypot(this.vx, this.vz);
    const max = this.speed;
    if (sp > max) {
      this.vx = (this.vx / sp) * max;
      this.vz = (this.vz / sp) * max;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    clampToBounds(this);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.pulse) {
      this.pulse.t += dt;
      if (this.pulse.t >= this.pulse.dur) this.pulse = null;
    }

    const prevTier = this.tier;
    this.tier = tierOf(this.r);
    this.newTier = this.tier > prevTier ? this.tier : 0;

    // Animazione
    this._spin += dt * 1.25;
    const s = this.r;
    this.group.position.set(this.x, groundY(this.x, this.z) + 0.01, this.z);
    this.group.scale.setScalar(s);
    this.funnel.rotation.y = this._spin * 1.4;
    const wob = 1 + Math.sin(this._spin * 5) * 0.015 + (this.stun > 0 ? Math.sin(this._spin * 26) * 0.05 : 0);
    this.rim.scale.set(wob, wob, 1);
    this.pit.scale.setScalar(1 + Math.sin(this._spin * 3) * 0.012);

    if (this.invuln > 0) {
      const f = 0.55 + 0.45 * Math.sin(this._spin * 22);
      this.pit.material.opacity = f;
      this.pit.material.transparent = true;
    } else if (this.pit.material.transparent) {
      this.pit.material.transparent = false;
      this.pit.material.opacity = 1;
    }
  }

  /** La testa del buco insegue il puntatore del mouse. */
  steerTo(tx, tz) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      this.input.mag = 0;
      return;
    }
    this.input.x = dx;
    this.input.y = dz;
    this.input.mag = Math.min(1, d / 3);
  }

  dispose() {
    this.group.removeFromParent();
  }
}

export { RIVALS };

/** Crea il buco del giocatore e i quattro rivali, sparpagliati. */
export function createHoles(spawns) {
  const holes = [];
  const start = spawns[0];
  holes.push(
    new Hole({ isPlayer: true, name: 'Tu', color: P.stoneDark, x: start.x, z: start.z })
  );
  const picks = [...RIVALS];
  for (let i = 0; i < 4; i++) {
    const info = picks[i];
    const s = spawns[1 + i];
    holes.push(
      new Hole({
        name: info.name,
        color: info.color,
        x: s.x,
        z: s.z,
      })
    );
  }
  return holes;
}
