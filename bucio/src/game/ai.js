import { clamp, damp } from '../core/utils.js';
import { KO, KO_AI } from './modes.js';

/**
 * Cervello dei buchi rivali. Una state machine semplice ma con carattere:
 * scappa dai più grossi, caccia i più piccoli, si butta sul branco di cibo
 * più vicino e ogni tanto usa l'onda di gravità.
 */
const STATES = { SEEK: 0, FLEE: 1, HUNT: 2, ROAM: 3 };

const HYSTERESIS = 1.4;

export function createBrain(rng, skill = 1) {
  const brain = {
    rng,
    skill,
    base: skill,
    state: STATES.ROAM,
    think: rng() * 0.4,
    wander: rng() * Math.PI * 2,
    wanderT: 0,
    target: null,
    pulseCd: 6 + rng() * 8,
    greed: 0.6 + rng() * 0.8,
    item: null,
  };
  /** Quanto vale un prop per questo buco, con penalità sulla distanza. */
  brain.value = (item, hole) =>
    ((item.def.mass * 22 + 1) * brain.greed) /
    (Math.hypot(item.x - hole.x, item.z - hole.z) + 5);
  return brain;
}

export function updateAI(hole, brain, dt, world, holes, now) {
  brain.think -= dt;
  brain.wanderT -= dt;
  if (brain.wanderT <= 0) {
    brain.wanderT = 0.8 + brain.rng() * 1.4;
    brain.wander += brain.rng.range(-1.6, 1.6);
  }
  brain.pulseCd -= dt;

/* ------------------------------------------------------------- percezione */
  // quanto di massa serve per poter divorare un buco, e quanto per doverne
  // scappare: in knockout le due soglie si abbassano, perché lì o ti prende
  // lui o prendi tu, sempre
  const ratio = hole.knockout ? KO.massRatio : 1.3;
  const threatRatio = hole.knockout ? KO.threatRatio : 1.25;
  let threat = null;
  let threatD = Infinity;
  let prey = null;
  let preyD = Infinity;
  for (const o of holes) {
    if (o === hole || o.out) continue; // un buco fuori partita non è preda
    const d = Math.hypot(o.x - hole.x, o.z - hole.z);
    if (o.mass > hole.mass * threatRatio && d < threatD) {
      threat = o;
      threatD = d;
    } else if (hole.mass > o.mass * ratio && d < preyD) {
      prey = o;
      preyD = d;
    }
  }

  // I rivali non fanno la caccia all'uccello in campo aperto: pasano più tempo
  // a mangiare che a inseguirti, altrimenti un buco piccolo non cresce mai.
  // Con il knockout però il morso è definitivo: vale la pena inseguire.
  const huntMul = hole.knockout ? KO_AI.huntMul : 1;
  const dangerRange = (16 + hole.r * 5) * (hole.knockout ? KO_AI.fearMul : 1);
  const huntRange = (10 + hole.r * 2.2) * huntMul;
  // nel continente nessuno si incontra mai da solo: senza questo, 180 secondi
  // di buchi che passeggiano paralleli senza mordersi mai
  const farHunt = hole.knockout ? 90 + hole.r * 10 : 0;

  /* -------------------------------------------------------------- decisione */
  if (brain.think <= 0) {
    brain.think = 0.22 + (1 - brain.skill) * 0.3;
    // se sto morendo di fame, me ne fotte del pericolo: vado a mangiare
    if (threat && threatD < dangerRange && hole.idleT < 2.5) {
      brain.state = STATES.FLEE;
    } else if (prey && preyD < huntRange) {
      brain.state = STATES.HUNT;
      brain.target = prey;
    } else if (prey && preyD < farHunt && brain.rng() < 0.65 + brain.skill * 0.3) {
      brain.state = STATES.HUNT;
      brain.target = prey;
    } else {
      brain.state = brain.rng() < 0.88 ? STATES.SEEK : STATES.ROAM;
    }
  }

  // fra due decisioni il bersaglio può sparire (un rivale è stato divorato)
  if (hole.idleT > 3) {
    brain.state = STATES.SEEK;
    brain.item = null; // niente da mangiare da un po': riparto da zero
  }
  if (brain.state === STATES.FLEE && !threat) brain.state = STATES.SEEK;
  if (
    brain.state === STATES.HUNT &&
    (!brain.target || brain.target.out || brain.target.mass <= hole.mass * ratio)
  )
    brain.state = STATES.SEEK;

  let tx = hole.x;
  let tz = hole.z;
  let mag = 1;

  switch (brain.state) {
    case STATES.FLEE: {
      tx = hole.x + (hole.x - threat.x) * 3;
      tz = hole.z + (hole.z - threat.z) * 3;
      mag = 1;
      break;
    }
    case STATES.HUNT: {
      const t = brain.target;
      if (!t || t.out || t.mass <= hole.mass * ratio) {
        brain.state = STATES.SEEK;
        break;
      }
      // predizione: mira dove sarà il bersaglio
      tx = t.x + t.vx * 0.5;
      tz = t.z + t.vz * 0.5;
      break;
    }
    case STATES.SEEK: {
      const scanR = 13 + hole.r * 3.4;
      // Il bersaglio si cambia solo se vale davvero la pena: senza isteresi
      // l'IA si mette a girare intorno a un punto invece di mangiare.
      // il bersaglio corrente vale solo se esiste ancora, è ancora mangiabile
      // e non è troppo lontano: altrimenti l'IA gli gira intorno per sempre
      const cur = brain.item;
      let best =
        cur &&
        cur.alive &&
        cur.def.r <= hole.eatReach &&
        Math.hypot(cur.x - hole.x, cur.z - hole.z) < scanR
          ? cur
          : null;
      let bestScore = best ? brain.value(best, hole, scanR) : 0;
      world.scan(hole.x, hole.z, scanR, hole.eatReach, (item, dist) => {
        const s = (item.def.mass * 22 + 1) * brain.greed / (dist + 5);
        if (s > bestScore * HYSTERESIS) {
          bestScore = s;
          best = item;
        }
      });
      if (best) {
        brain.item = best;
        tx = best.x;
        tz = best.z;
      } else {
        // fame: seguo il prop più vicino, anche se ancora troppo grande
        brain.item = null;
        let near = null;
        let nd = Infinity;
        world.scan(hole.x, hole.z, 46, Infinity, (item, dist) => {
          if (dist < nd) {
            nd = dist;
            near = item;
          }
        });
        if (near) {
          tx = near.x;
          tz = near.z;
        } else {
          tx = hole.x + Math.cos(brain.wander) * 12;
          tz = hole.z + Math.sin(brain.wander) * 12;
        }
      }
      break;
    }
    default: {
      tx = hole.x + Math.cos(brain.wander) * 16;
      tz = hole.z + Math.sin(brain.wander) * 16;
      mag = 0.72;
    }
  }

  /* ---------------------------------------------------------------- pilotaggio */
  const dx = tx - hole.x;
  const dz = tz - hole.z;
  const d = Math.hypot(dx, dz) || 1;
  // curva morbida: niente svolte a 90° istantanee
  hole.input.x = damp(hole.input.x, dx / d, 9, dt);
  hole.input.y = damp(hole.input.y, dz / d, 9, dt);
  const len = Math.hypot(hole.input.x, hole.input.y);
  hole.input.mag = clamp(mag * len, 0, 1) * (0.78 + brain.skill * 0.28);

  /* ------------------------------------------------------------------- pulse */
  if (hole.pulseReady && brain.pulseCd <= 0) {
    const juicy = prey && preyD < hole.r * 6;
    if (juicy || brain.rng() < 0.5) {
      hole.firePulse();
      brain.pulseCd = 7 + brain.rng() * 6;
      brain.justPulsed = true;
    }
  }
}
