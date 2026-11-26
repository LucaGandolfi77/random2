import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { makeLevel } from "../src/levels.js";
import { resumeIsValid } from "../src/storage.js";

test("a fresh snapshot is a valid resume", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  assert.equal(resumeIsValid(level, game.snapshot()), true);
});

test("a snapshot with missing blocks is rejected", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  const snapshot = game.snapshot();
  const index = snapshot.cells.findIndex((cell) => cell && cell.kind === "block");
  snapshot.cells[index] = null;
  assert.equal(resumeIsValid(level, snapshot), false);
});

test("a snapshot with inflated collector capacity is rejected", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  const snapshot = game.snapshot();
  snapshot.doors[0].filled = snapshot.doors[0].capacity + 1;
  assert.equal(resumeIsValid(level, snapshot), false);
});
