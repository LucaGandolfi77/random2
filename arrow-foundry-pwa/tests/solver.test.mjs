import test from "node:test";
import assert from "node:assert/strict";
import { FACTORIES, LEVELS_PER_FACTORY } from "../src/config.js";
import { dailyLevel, makeLevel, validateLevel } from "../src/levels.js";
import { solveLevel } from "../src/solver.js";

test("all 100 levels have valid stored solutions", () => {
  for (let f=0; f<FACTORIES.length; f++) for (let s=0; s<LEVELS_PER_FACTORY; s++) {
    const level=makeLevel(f,s); assert.deepEqual(validateLevel(level),[],level.id);
  }
});

test("the solver independently solves all 100 levels", () => {
  for (let f=0; f<FACTORIES.length; f++) for (let s=0; s<LEVELS_PER_FACTORY; s++) {
    const level=makeLevel(f,s); const result=solveLevel(level,{maxNodes:500000,maxMoves:180});
    assert.equal(result.ok,true,`${level.id}: ${result.reason}`);
  }
});

test("daily level is stable and varies by date", () => {
  assert.deepEqual(dailyLevel("2026-11-27"),dailyLevel("2026-11-27"));
  assert.notDeepEqual(dailyLevel("2026-11-27"),dailyLevel("2026-11-28"));
});
