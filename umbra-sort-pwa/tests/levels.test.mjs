import test from "node:test";
import assert from "node:assert/strict";
import { AREAS, LEVELS_PER_AREA } from "../src/config.js";
import { createGame } from "../src/engine.js";
import { dailyLevel, makeLevel, validateLevel } from "../src/levels.js";

test("all 100 campaign levels are valid and deterministic", () => {
  for (let area = 0; area < AREAS.length; area++) {
    for (let stage = 0; stage < LEVELS_PER_AREA; stage++) {
      const level = makeLevel(area, stage);
      assert.deepEqual(validateLevel(level), [], level.id);
      assert.deepEqual(makeLevel(area, stage), level, `${level.id} changed with the same seed`);
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

test("later areas introduce their advertised mechanics", () => {
  assert.ok(makeLevel(0, 0).elevators.length === 0);
  assert.ok(makeLevel(1, 0).elevators.length >= 1);
  assert.ok(makeLevel(2, 0).blackouts.length >= 1);
  assert.ok(makeLevel(3, 0).generators.length >= 1);
  assert.ok(makeLevel(4, 0).blocks.some((block) => block.gray));
});

test("daily level is stable for a date and varies across dates", () => {
  assert.deepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-26"));
  assert.notDeepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-27"));
});
