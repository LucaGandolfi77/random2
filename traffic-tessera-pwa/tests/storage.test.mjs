import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { makeLevel } from "../src/levels.js";
import { loadProgress, recordWin, resumeIsValid } from "../src/storage.js";

test("fresh progress and snapshot are valid", () => {
  const progress = loadProgress();
  assert.equal(progress.unlocked, 1);
  assert.deepEqual(progress.stars, {});
  const level = makeLevel(0, 0);
  const game = createGame(level);
  assert.equal(resumeIsValid(level, game.snapshot()), true);
});

test("record win stores stars, unlocks the next level and counts vehicles", () => {
  const progress = { unlocked: 1, stars: {}, bestMoves: {}, daily: {}, dispatched: 0 };
  const level = makeLevel(0, 0);
  const game = createGame(level);
  game.state.status = "won";
  game.state.stars = 3;
  game.state.moves = level.vehicles.length;
  game.state.exits = level.vehicles.length;
  recordWin(progress, level, game.state);
  assert.equal(progress.stars[level.id], 3);
  assert.equal(progress.unlocked, 2);
  assert.equal(progress.dispatched, level.vehicles.length);
});

test("resume validation rejects another level and out-of-bounds vehicles", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  const snapshot = game.snapshot();
  assert.equal(resumeIsValid({ ...level, id: "other" }, snapshot), false);
  snapshot.vehicles[0].x = level.size;
  assert.equal(resumeIsValid(level, snapshot), false);
});
