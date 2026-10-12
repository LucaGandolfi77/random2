/**
 * Smoke test headless: verifica che la modalità Continente produca davvero un
 * mondo più grande e che il regista applichi le regole knockout.
 * Eseguire con: node scripts/smoke-modes.mjs
 */
import * as THREE from 'three';
import { MODES, MODE_IDS, mode, propDensity } from '../src/game/modes.js';
import { THEMES, setTheme, setScale, currentTheme } from '../src/world/themes.js';
import { applyLayout, MAP, groundY, isRoad, BOUNDS, SPAWNS } from '../src/world/layout.js';
import { PropWorld } from '../src/world/propworld.js';
import { Hole } from '../src/game/hole.js';
import { Director } from '../src/game/director.js';
import { createBrain } from '../src/game/ai.js';
import { makeRng } from '../src/core/utils.js';

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`);
  if (!cond) failures++;
};

/* ------------------------------------------------------- 1. mondo più grande */
console.log('\n— mondo —');
setTheme('portomarina');
setScale(1);
applyLayout('portomarina');
const small = { half: MAP.half, z: groundY(20, -30), road: isRoad(0, -34), min: BOUNDS.minX };
setScale(mode('continente').scale);
applyLayout('portomarina');
const big = { half: MAP.half, z: groundY(20, -30), road: isRoad(0, -34 * 1.8), min: BOUNDS.minX };

ok(big.half > small.half * 1.7, `semi-mappa ${small.half} → ${big.half.toFixed(1)}`);
ok(big.min < small.min, `confini ${small.min} → ${big.min.toFixed(1)}`);
ok(big.road, 'le strade esistono anche nella mappa grande (posizioni riscalate)');
ok(!isRoad(0, -34), 'la vecchia posizione della strada non è più una strada');
ok(currentTheme().id === 'portomarina', 'il tema scalato conserva l\'id');
ok(Number.isFinite(groundY(big.half - 6, 10)), 'groundY finito ai bordi');

/* ----------------------------------------------------- 2. props in tutta la mappa */
console.log('\n— oggetti —');
const scene = new THREE.Scene();
const measure = (mid) => {
  const m = mode(mid);
  setScale(m.scale);
  applyLayout('portomarina');
  const w = new PropWorld(scene, { density: propDensity(1, mid) });
  return { alive: w.aliveCount, perKm2: w.aliveCount / (MAP.half * 2) ** 2, world: w };
};
const city = measure('citta');
const big2 = measure('continente');
const world = big2.world;
const items = world.items;
const span = Math.max(...items.filter((i) => i.alive).map((i) => Math.abs(i.x)));

ok(big2.alive > city.alive * 2.3, `istanze vive: ${city.alive} → ${big2.alive} (${(big2.alive / city.alive).toFixed(2)}×)`);
ok(
  big2.perKm2 > city.perKm2 * 0.65,
  `densità per m²: ${(city.perKm2 * 1e6).toFixed(0)} → ${(big2.perKm2 * 1e6).toFixed(0)} (non deve collassare)`
);
ok(span > MAP.half * 0.7, `gli oggetti arrivano fino a x=${span.toFixed(0)} (mappa ±${MAP.half})`);
ok(world.byDef.size > 10, `${world.byDef.size} tipi di oggetto distinti`);

/* ------------------------------------------------- 3. regole del knockout */
console.log('\n— knockout —');
const fx = { ring() {}, pop() {}, text() {}, trail() {} };
const noop = () => {};
const audio = {
  jingle: noop,
  devour: noop,
  bite: noop,
  pulse: noop,
  gold: noop,
  combo: noop,
  tick: noop,
  glurp: noop,
};

/** Cinque buchi nuovi, con i primi due sovrapposti: uno divorerà l'altro. */
const makeHoles = () => {
  const hs = [0, 1, 2, 3, 4].map((i) =>
    new Hole({
      isPlayer: i === 0,
      name: i === 0 ? 'Tu' : `R${i}`,
      color: 0x884422,
      x: -60 + i * 30,
      z: -40,
    })
  );
  hs[0].x = hs[1].x;
  hs[0].z = hs[1].z;
  return hs;
};

for (const id of MODE_IDS) {
  const m = mode(id);
  setScale(m.scale);
  applyLayout('portomarina');
  const holes = makeHoles();
  const brains = [0.9, 0.85, 0.8, 0.75].map((s) => createBrain(makeRng(1), s));
  const d = new Director({
    world,
    holes,
    brains,
    effects: fx,
    audio,
    cam: { shake: noop },
    powers: null,
    mode: m,
  });
  ok(d.timeTotal === m.time, `${id}: partita di ${d.timeTotal}s`);
  for (const h of holes) h.mass = 40;
  holes[0].mass = 80;
  d.update(1 / 60, 1);
  const loser = holes[1];
  const winner = holes[0];
  if (m.knockout) {
    ok(loser.out === true, `${id}: il divorato è fuori dalla partita`);
    ok(loser.group.visible === false, `${id}: il divorato sparisce dalla scena`);
    ok(winner.kills === 1 && winner.score > 0, `${id}: chi divorata incassa il KO (+${winner.score})`);
    ok(d.aliveHoles.length === 4, `${id}: in gioco restano ${d.aliveHoles.length} buchi`);
  } else {
    ok(loser.out === false && loser.mass < 40, `${id}: il morso non è definitivo (massa ${loser.mass.toFixed(1)})`);
    ok(loser.group.visible === true, `${id}: il morso normale lascia il rivale in scena`);
    ok(winner.kills === 1, `${id}: il morso normale conta come kill`);
  }
}

/* ------------------------------------------ 4. l'ultimo buco in piedi vince */
console.log('\n— ultimo buco in piedi —');
setScale(MODES.continente.scale);
applyLayout('portomarina');
const finalHoles = makeHoles();
const brains = [0.9, 0.85, 0.8, 0.75].map((s) => createBrain(makeRng(1), s));
let ended = null;
const d2 = new Director({
  world,
  holes: finalHoles,
  brains,
  effects: fx,
  audio,
  cam: { shake: noop },
  powers: null,
  mode: MODES.continente,
  hooks: { onEnd: (r) => (ended = r) },
});
// quattro rivali fuori, il giocatore no: deve chiudere la partita da solo
for (const h of finalHoles.slice(1)) h.eliminate();
d2.update(1 / 60, 1);
ok(ended !== null, 'la partita finisce quando rimane un solo buco');
ok(ended?.reason === 'last', `motivo: ${ended?.reason}`);
ok(ended?.player.place === 1, `posto del giocatore: ${ended?.player.place}`);
ok(
  ended?.ranking.filter((r) => r.out).length === 4,
  `la classifica finale porta i 4 KO (${ended?.ranking.filter((r) => r.out).length})`
);
ok(!finalHoles[0].out, 'il giocatore è ancora in piedi');

/* --------------------------------- 5. se ti mangiano, la partita finisce */
console.log('\n— se ti mangiano —');
const dead = makeHoles();
for (const h of dead) h.mass = 40;
dead[1].mass = 80;
dead[1].x = dead[0].x;
dead[1].z = dead[0].z;
let ended2 = null;
const d3 = new Director({
  world,
  holes: dead,
  brains: [0.9, 0.85, 0.8, 0.75].map((s) => createBrain(makeRng(1), s)),
  effects: fx,
  audio,
  cam: { shake: noop },
  powers: null,
  mode: MODES.continente,
  hooks: { onEnd: (r) => (ended2 = r) },
});
d3.update(1 / 60, 1);
ok(dead[0].out === true, 'il giocatore divorato sparisce davvero');
ok(ended2?.reason === 'out', `motivo: ${ended2?.reason}`);
ok(ended2?.player.place > 1, `posto finale: ${ended2?.player.place}`);

/* ---------------------------------- 6. partita completa, simulata senza render */
console.log('\n— partita completa simulata —');

/** Un giocatore mediocre: va a mangiare il prop più vicino, se lo raggiunge. */
function autopilot(hole, world, dt, t) {
  let best = null;
  let bd = Infinity;
  world.scan(hole.x, hole.z, 40, hole.eatReach, (item, dist) => {
    if (dist < bd) {
      bd = dist;
      best = item;
    }
  });
  const tx = best ? best.x : 0;
  const tz = best ? best.z : 0;
  const dx = tx - hole.x;
  const dz = tz - hole.z;
  const len = Math.hypot(dx, dz) || 1;
  hole.input.x = dx / len;
  hole.input.y = dz / len;
  hole.input.mag = best ? 1 : 0.7;
}

for (const id of MODE_IDS) {
  const m = mode(id);
  setScale(m.scale);
  applyLayout('portomarina');
  const matchWorld = new PropWorld(scene, { density: propDensity(1, id) });
  const hs = SPAWNS.slice(0, 5).map((s, i) =>
    new Hole({ isPlayer: i === 0, name: i === 0 ? 'Tu' : `R${i}`, color: 0x884422, x: s.x, z: s.z })
  );
  let done = null;
  const dd = new Director({
    world: matchWorld,
    holes: hs,
    brains: [0.95, 0.82, 0.9, 0.72].map((s) => createBrain(makeRng(31), s)),
    effects: fx,
    audio,
    cam: { shake: noop },
    powers: null,
    mode: m,
    hooks: { onEnd: (r) => (done = r) },
  });
  const dt = 1 / 30;
  let t = 0;
  let steps = 0;
  const t0 = Date.now();
  while (!done && t < m.time + 5) {
    t += dt;
    steps++;
    autopilot(hs[0], matchWorld, dt, t);
    matchWorld.update(dt, t, hs);
    dd.update(dt, t);
  }
  const ms = Date.now() - t0;
  const kos = done ? done.ranking.filter((r) => r.out).length : 0;
  console.log(
    `  ${m.emoji} ${m.name}: ${done ? `finita a ${t.toFixed(0)}s (${done.reason})` : 'ANCORA APERTA'} · ${kos} KO · ${steps} passi in ${ms} ms`
  );
  ok(done !== null, `${id}: la partita si chiude da sola entro il tempo`);
  if (m.knockout) {
    ok(kos >= 1, `${id}: in ${m.time}s succede almeno un'eliminazione (${kos})`);
    ok(
      done.ranking.filter((r) => !r.out).length === 5 - kos,
      `${id}: in classifica i buchi fuori partita sono ${kos}`
    );
  } else {
    ok(kos === 0, `${id}: nessuna eliminazione nella modalità classica`);
  }
}

console.log(`\n${failures ? `${failures} FALLIMENTI` : 'tutto verde'}\n`);
process.exit(failures ? 1 : 0);