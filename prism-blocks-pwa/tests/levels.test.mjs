import test from "node:test";
import assert from "node:assert/strict";
import { CHALLENGE_LEVELS } from "../src/config.js";
import { createGame } from "../src/engine.js";
import { dailyLevel, makeChallengeLevel, validateLevel } from "../src/levels.js";

test("all 30 challenge levels are valid and deterministic", () => {
  for (let index = 0; index < CHALLENGE_LEVELS; index++) {
    const level = makeChallengeLevel(index);
    assert.deepEqual(validateLevel(level), [], level.id);
    assert.deepEqual(makeChallengeLevel(index), level);
  }
});

test("daily level is stable for a date and changes the next day", () => {
  assert.deepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-26"));
  assert.notDeepEqual(dailyLevel("2026-11-26"), dailyLevel("2026-11-27"));
});

test("a greedy hint bot can reach every challenge objective", () => {
  for (let index = 0; index < CHALLENGE_LEVELS; index++) {
    const level = makeChallengeLevel(index);
    const game = createGame(level);
    for (let step = 0; step < 300 && game.getState().status === "playing"; step++) {
      const move = game.hint();
      if (!move) break;
      game.place(move.index, move.x, move.y, move.rotation);
    }
    assert.equal(game.getState().status, "won", `${level.id}: ${game.getState().status}, score ${game.getState().score}, lines ${game.getState().lines}, pieces ${game.getState().pieces}`);
  }
});
