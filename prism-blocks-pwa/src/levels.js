import { BOARD_SIZE, CHALLENGE_LEVELS } from "./config.js";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function obstacleCells(seed, count) {
  const rng = mulberry32(seed ^ 0xa511e9b3);
  const cells = [];
  const used = new Set();
  let guard = 0;
  while (cells.length < count && guard++ < 200) {
    const x = Math.floor(rng() * BOARD_SIZE);
    const y = Math.floor(rng() * BOARD_SIZE);
    const key = y * BOARD_SIZE + x;
    if (used.has(key)) continue;
    if (x >= 3 && x <= 4 && y >= 3 && y <= 4) continue;
    used.add(key);
    cells.push({ x, y });
  }
  return cells;
}

export function makeChallengeLevel(index) {
  const stage = Math.max(0, Math.min(CHALLENGE_LEVELS - 1, index | 0));
  const seed = (4409 + stage * 6971) >>> 0;
  let objective;
  if (stage < 10) objective = { type: "lines", target: 2 + Math.floor(stage / 3), label: "Completa righe e colonne" };
  else if (stage < 20) objective = { type: "score", target: 450 + (stage - 10) * 35, label: "Raggiungi il punteggio" };
  else objective = { type: "pieces", target: 12 + (stage - 20), label: "Piazza i pezzi" };
  const obstacles = obstacleCells(seed, Math.floor(stage / 6));
  return {
    id: `challenge-${stage + 1}`,
    kind: "challenge",
    name: `Sfida ${stage + 1}`,
    number: stage + 1,
    seed,
    objective,
    obstacles,
    undoLimit: 3
  };
}

export function dailyLevel(dateKey) {
  let hash = 2166136261;
  for (const ch of dateKey) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const seed = hash >>> 0;
  const objective = (hash & 1) === 0
    ? { type: "lines", target: 5, label: "Completa 5 linee" }
    : { type: "score", target: 2200, label: "Raggiungi 2.200 punti" };
  return {
    id: `daily-${dateKey}`,
    kind: "daily",
    name: "Sfida del giorno",
    seed,
    objective,
    obstacles: obstacleCells(seed, 2),
    undoLimit: 2
  };
}

export function endlessLevel() {
  return {
    id: "endless",
    kind: "endless",
    name: "Endless",
    seed: (Date.now() ^ 0x9e3779b9) >>> 0,
    objective: null,
    obstacles: [],
    undoLimit: 3
  };
}

export function validateLevel(level) {
  const errors = [];
  if (!level || !level.id) errors.push("missing id");
  if (level.objective && (!level.objective.type || !(level.objective.target > 0))) errors.push("invalid objective");
  const seen = new Set();
  for (const obstacle of level.obstacles || []) {
    if (obstacle.x < 0 || obstacle.y < 0 || obstacle.x >= BOARD_SIZE || obstacle.y >= BOARD_SIZE) errors.push("obstacle out of bounds");
    const key = obstacle.y * BOARD_SIZE + obstacle.x;
    if (seen.has(key)) errors.push("duplicate obstacle");
    seen.add(key);
  }
  const rows = new Array(BOARD_SIZE).fill(0);
  const cols = new Array(BOARD_SIZE).fill(0);
  for (const obstacle of level.obstacles || []) { rows[obstacle.y]++; cols[obstacle.x]++; }
  if (rows.some((count) => count >= BOARD_SIZE) || cols.some((count) => count >= BOARD_SIZE)) errors.push("fully blocked line");
  return errors;
}
