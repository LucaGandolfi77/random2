import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { makeLevel } from "../src/levels.js";
import { recordWin, resumeIsValid } from "../src/storage.js";

test("fresh snapshot is a valid resume", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  assert.equal(resumeIsValid(level, game.snapshot()), true);
});

test("record win stores stars, best moves and unlocks the next level", () => {
  const progress = { unlocked: 1, stars: {}, bestMoves: {}, daily: {} };
  const level = makeLevel(0, 0);
  const game = createGame(level);
  game.state.status = "won";
  game.state.stars = 3;
  game.state.moves = 12;
  recordWin(progress, level, game.state);
  assert.equal(progress.stars[level.id], 3);
  assert.equal(progress.bestMoves[level.id], 12);
  assert.equal(progress.unlocked, 2);
});
