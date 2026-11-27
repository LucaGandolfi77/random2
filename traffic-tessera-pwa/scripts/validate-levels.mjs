#!/usr/bin/env node
/* Validate all 100 Traffic Tessera levels and solve them independently. */
import { DISTRICTS, LEVELS_PER_DISTRICT } from "../src/config.js";
import { LEVEL_DATA } from "../src/level-data.js";
import { validateLevel } from "../src/levels.js";
import { solveLevel } from "../src/solver.js";

const expected = DISTRICTS.length * LEVELS_PER_DISTRICT;
const failures = [];
let nodes = 0;
if (LEVEL_DATA.length !== expected) failures.push(`expected ${expected} levels, found ${LEVEL_DATA.length}`);

for (const level of LEVEL_DATA) {
  const errors = validateLevel(level);
  const result = solveLevel(level, { maxNodes: 220000, maxMoves: 90 });
  nodes += result.nodes;
  if (errors.length) failures.push(`${level.id}: ${errors.join(", ")}`);
  if (!result.ok) failures.push(`${level.id}: solver failed (${result.reason})`);
  else {
    const repositionings = result.solution.filter(move => move.type === "move").length;
    if (repositionings < (level.requiredMoves || 0)) failures.push(`${level.id}: solver found only ${repositionings} repositioning moves`);
    console.error(`approved ${level.id}: vehicles=${level.vehicles.length} moves=${result.solution.length} reposition=${repositionings} nodes=${result.nodes}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.error(`OK ${LEVEL_DATA.length} levels · ${nodes} solver nodes`);
