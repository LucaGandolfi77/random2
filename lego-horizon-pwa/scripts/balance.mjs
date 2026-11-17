/* Balance bot: runs seeded hunts headlessly and reports difficulty curves.
 *
 *   npm run balance -- 300
 *
 * No browser, no telemetry: every run is deterministic from its seed.
 */
import { defaultSave, createHunt, stepHunt, finishHunt } from "../game/sim.js";
import { WEAPONS } from "../game/combat.js";

const RUNS = Math.max(1, Number(process.argv[2]) || 200);
const STEP = 1 / 60;

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function botInput(hunt, rng) {
  const p = hunt.player;
  let nearest = null;
  let best = Infinity;
  for (const e of hunt.enemies) {
    if (e.hp <= 0 || e.burrowed) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) { best = d; nearest = e; }
  }
  const input = { dx: 0, dy: 0 };
  if (nearest) {
    const dx = p.x - nearest.x;
    const dy = p.y - nearest.y;
    const len = Math.hypot(dx, dy) || 1;
    input.dx = dx / len;
    input.dy = dy / len;
    if (best < 120 && rng() < 0.02) input.dodge = true;
    if (best < 240 && rng() < 0.01) input.chargedShot = 1;
  }
  return input;
}

function runHunt(seed, level, weapon) {
  const save = {
    ...defaultSave(),
    huntLevel: level,
    gear: { ...defaultSave().gear, weapon },
    inventory: weapon ? [weapon] : [],
  };
  const hunt = createHunt(save, seed, { mode: "endless" });
  const rng = makeRng(seed ^ 0x9e3779b9);
  hunt.combat.weapon = weapon || "bow";
  let steps = 0;
  while (hunt.phase !== "won" && hunt.phase !== "lost" && steps < 60 * 180) {
    stepHunt(hunt, botInput(hunt, rng), STEP);
    steps += 1;
  }
  const result = finishHunt(hunt, save);
  return {
    won: hunt.phase === "won",
    score: result.result.score,
    seconds: Math.round(hunt.time),
    wave: hunt.wave,
    kills: hunt.kills,
    died: hunt.phase === "lost",
  };
}

function summarize(rows) {
  const n = rows.length || 1;
  const avg = (key) => Math.round(rows.reduce((sum, r) => sum + (r[key] || 0), 0) / n);
  return {
    runs: rows.length,
    winRate: Number((rows.filter((r) => r.won).length / n).toFixed(3)),
    avgScore: avg("score"),
    avgSeconds: avg("seconds"),
    avgWave: avg("wave"),
    avgKills: avg("kills"),
  };
}

const byLevel = {};
const byWeapon = {};
for (let i = 0; i < RUNS; i++) {
  const seed = 1000 + i * 7919;
  const level = 1 + (i % 10);
  const row = runHunt(seed, level, null);
  (byLevel[level] ||= []).push(row);
  (byWeapon.bow ||= []).push(row);
}
for (const weapon of Object.keys(WEAPONS)) {
  if (weapon === "bow") continue;
  byWeapon[weapon] = [];
  for (let i = 0; i < Math.min(40, RUNS); i++) {
    byWeapon[weapon].push(runHunt(2000 + i * 104729, 5, weapon));
  }
}

const report = {
  runs: RUNS,
  overall: summarize(Object.values(byLevel).flat()),
  byLevel: Object.fromEntries(Object.entries(byLevel).map(([k, v]) => [k, summarize(v)])),
  byWeapon: Object.fromEntries(Object.entries(byWeapon).map(([k, v]) => [k, summarize(v)])),
};

console.log(JSON.stringify(report, null, 2));
