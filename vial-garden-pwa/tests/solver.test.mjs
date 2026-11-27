import test from "node:test";
import assert from "node:assert/strict";
import { GARDENS, LEVELS_PER_GARDEN } from "../src/config.js";
import { dailyLevel, makeLevel, validateLevel } from "../src/levels.js";
import { solveLevel } from "../src/solver.js";

test("all 100 levels have valid stored solutions and shuffle states", () => {
  for (let garden = 0; garden < GARDENS.length; garden++) {
    for (let stage = 0; stage < LEVELS_PER_GARDEN; stage++) {
      const level = makeLevel(garden, stage);
      assert.deepEqual(validateLevel(level), [], level.id);
    }
  }
});

test("the solver independently solves all 100 levels", () => {
  for (let garden = 0; garden < GARDENS.length; garden++) {
    for (let stage = 0; stage < LEVELS_PER_GARDEN; stage++) {
      const level = makeLevel(garden, stage);
      const result = solveLevel(level, { maxNodes: 250000, maxMoves: 180 });
      assert.equal(result.ok, true, `${level.id}: ${result.reason}`);
    }
  }
});

test("daily level is stable and varies by date", () => {
  assert.deepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-26"));
  assert.notDeepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-27"));
});
