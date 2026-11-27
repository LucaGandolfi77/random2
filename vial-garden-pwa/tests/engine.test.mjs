import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { makeLevel } from "../src/levels.js";

test("a valid pour transfers liquid and increments moves", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  const move = level.solution[0];
  game.select(move.from);
  const result = game.pour(move.to);
  assert.equal(result.ok, true);
  assert.equal(game.state.moves, 1);
  assert.equal(result.amount > 0, true);
});

test("an incompatible pour is rejected", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  let from = 0;
  let to = -1;
  for (let i = 0; i < level.tubes.length && to < 0; i++) {
    if (!level.tubes[i].length) continue;
    for (let j = 0; j < level.tubes.length; j++) {
      if (i !== j && !game.canPour(i, j)) { from = i; to = j; break; }
    }
  }
  assert.ok(to >= 0);
  game.select(from);
  assert.equal(game.pour(to).ok, false);
  assert.equal(game.state.moves, 0);
});

test("undo restores tubes and consumes one undo", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  const before = JSON.stringify(game.state.tubes);
  const move = level.solution[0];
  game.select(move.from);
  game.pour(move.to);
  assert.equal(game.undo(), true);
  assert.equal(JSON.stringify(game.state.tubes), before);
  assert.equal(game.state.undosLeft, 4);
});

test("shuffle uses the prevalidated solvable layout", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  assert.equal(game.shuffle(), true);
  assert.deepEqual(game.state.tubes, level.shuffleTubes);
  assert.equal(game.state.shufflesLeft, 1);
});

test("extra flower adds an empty tube", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  const count = game.state.tubes.length;
  assert.equal(game.addTube(), true);
  assert.equal(game.state.tubes.length, count + 1);
  assert.deepEqual(game.state.tubes[game.state.tubes.length - 1], []);
});

test("the stored solution wins the level and awards stars", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  for (const move of level.solution) {
    game.select(move.from);
    const result = game.pour(move.to);
    assert.equal(result.ok, true);
  }
  assert.equal(game.state.status, "won");
  assert.ok(game.state.stars >= 1 && game.state.stars <= 3);
});

test("hint returns a legal move", () => {
  const level = makeLevel(0, 0);
  const game = createGame(level);
  const hint = game.hint();
  assert.ok(hint);
  assert.equal(game.canPour(hint.from, hint.to), true);
});
