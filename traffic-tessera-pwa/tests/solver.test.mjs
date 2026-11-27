import test from "node:test";
import assert from "node:assert/strict";
import { DISTRICTS, LEVELS_PER_DISTRICT } from "../src/config.js";
import { dailyLevel, makeLevel, validateLevel } from "../src/levels.js";
import { solveLevel } from "../src/solver.js";

test("all 100 levels have valid stored and shuffle solutions", () => {
  for (let district = 0; district < DISTRICTS.length; district++) {
    for (let stage = 0; stage < LEVELS_PER_DISTRICT; stage++) {
      const level = makeLevel(district, stage);
      assert.deepEqual(validateLevel(level), [], level.id);
    }
  }
});

test("solver independently solves all 100 levels", () => {
  for (let district = 0; district < DISTRICTS.length; district++) {
    for (let stage = 0; stage < LEVELS_PER_DISTRICT; stage++) {
      const level = makeLevel(district, stage);
      const result = solveLevel(level, { maxNodes: 200000, maxMoves: 80 });
      assert.equal(result.ok, true, `${level.id}: ${result.reason}`);
      assert.ok(result.solution.length >= level.vehicles.length);
    }
  }
});

test("advanced levels require repositioning and use one-way lanes", () => {
  for (let district = 1; district < DISTRICTS.length; district++) {
    for (let stage = 0; stage < LEVELS_PER_DISTRICT; stage++) {
      const level = makeLevel(district, stage);
      assert.ok(level.solution.filter(move => move.type === "move").length >= level.requiredMoves, level.id);
      if (district >= 3) {
        assert.ok(level.terminals.some(terminal => terminal.oneWay), level.id);
        assert.ok(level.vehicles.some(vehicle => level.terminals.find(terminal => terminal.id === vehicle.terminalId)?.oneWay), level.id);
      }
      assert.ok(level.vehicles.some(vehicle => level.terminals.find(terminal => terminal.id === vehicle.terminalId)?.requiresDock), level.id);
    }
  }
});

test("daily level is stable and changes by date", () => {
  assert.deepEqual(dailyLevel("2026-11-27"), dailyLevel("2026-11-27"));
  assert.notDeepEqual(dailyLevel("2026-11-27"), dailyLevel("2026-11-28"));
});
