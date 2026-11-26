import test from "node:test";
import assert from "node:assert/strict";
import { AREAS, LEVELS_PER_AREA } from "../src/config.js";
import { createGame } from "../src/engine.js";
import { dailyLevel, makeLevel, validateLevel } from "../src/levels.js";
import { BOSS_LEVELS, makeBossLevel } from "../src/boss-levels.js";
import { SPECIAL_LEVELS, makeSpecialLevel } from "../src/special-levels.js";
import { solveLevel } from "../src/solver.js";

test("all 200 campaign levels are valid and deterministic", () => {
  for (let area = 0; area < AREAS.length; area++) {
    for (let stage = 0; stage < LEVELS_PER_AREA; stage++) {
      const level = makeLevel(area, stage);
      assert.deepEqual(validateLevel(level), [], level.id);
      assert.deepEqual(makeLevel(area, stage), level, `${level.id} changed with the same seed`);
    }
  }
});

test("the first level has exactly three coral blocks and matching capacity", () => {
  const level = makeLevel(0, 0);
  const coral = level.blocks.filter((block) => !block.gray && block.color === 0).length;
  const door = level.doors.find((candidate) => candidate.color === 0);
  assert.equal(coral, 3);
  assert.equal(door.capacity, 3);
});

test("all 200 campaign levels are solver-approved", () => {
  for (let area = 0; area < AREAS.length; area++) {
    for (let stage = 0; stage < LEVELS_PER_AREA; stage++) {
      const level = makeLevel(area, stage);
      const result = solveLevel(level, { maxNodes: 80000, maxDepth: 320, repositionLimit: 24 });
      assert.equal(result.ok, true, `${level.id}: ${result.reason}`);
    }
  }
});

test("every tutorial level can be completed by the hint bot", () => {
  for (let stage = 0; stage < LEVELS_PER_AREA; stage++) {
    const game = createGame(makeLevel(0, stage));
    for (let step = 0; step < 500 && game.getState().status === "playing"; step++) {
      const hint = game.findHint();
      if (!hint) break;
      if (hint.type === "path") game.moveAlongPath(hint.id, hint.path);
      else game.usePrism(hint.id);
    }
    assert.equal(game.getState().status, "won", `tutorial level ${stage + 1}`);
  }
});

test("all special and boss levels have a valid static solution", () => {
  for (let index = 0; index < SPECIAL_LEVELS.length; index++) {
    const level = makeSpecialLevel(index);
    assert.deepEqual(validateLevel(level), [], level.id);
    assert.equal(solveLevel(level, { maxNodes: 80000, maxDepth: 320, repositionLimit: 24 }).ok, true, level.id);
  }
  for (let index = 0; index < BOSS_LEVELS.length; index++) {
    const level = makeBossLevel(index);
    assert.deepEqual(validateLevel(level), [], level.id);
    assert.equal(level.kind, "boss");
    assert.ok(level.boss);
    assert.equal(solveLevel(level, { maxNodes: 80000, maxDepth: 320, repositionLimit: 24 }).ok, true, level.id);
  }
});

test("later areas introduce their advertised mechanics", () => {
  assert.ok(makeLevel(0, 0).elevators.length === 0);
  assert.ok(makeLevel(1, 0).elevators.length >= 1);
  assert.ok(makeLevel(2, 0).blackouts.length >= 1);
  assert.ok(makeLevel(3, 0).generators.length >= 1);
  assert.ok(makeLevel(4, 0).blocks.some((block) => block.gray));
  assert.ok(makeLevel(5, 0).elevators.length >= 1);
  assert.ok(makeLevel(6, 0).generators.length >= 1);
  assert.ok(makeLevel(7, 0).blocks.some((block) => block.gray));
  assert.ok(makeLevel(8, 0).blackouts.length >= 1);
  assert.ok(makeLevel(9, 0).generators.length >= 1 && makeLevel(9, 0).blackouts.length >= 1);
});

test("daily level is stable for a date and varies across dates", () => {
  assert.deepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-26"));
  assert.notDeepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-27"));
});
