import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { endlessLevel, makeChallengeLevel } from "../src/levels.js";
import { recordResult, resumeIsValid } from "../src/storage.js";

test("fresh snapshot is a valid resume", () => {
  const level = endlessLevel();
  const game = createGame(level);
  assert.equal(resumeIsValid(level, game.snapshot()), true);
});

test("record result stores best score and challenge stars", () => {
  const progress = { best: 0, games: 0, wins: 0, daily: {}, challenges: {} };
  const level = makeChallengeLevel(0);
  const game = createGame(level);
  game.state.status = "won";
  game.state.score = 900;
  game.state.undosLeft = level.undoLimit;
  recordResult(progress, level, game.state);
  assert.equal(progress.best, 900);
  assert.equal(progress.wins, 1);
  assert.equal(progress.challenges[level.id].stars, 3);
});
