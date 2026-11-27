import test from "node:test";
import assert from "node:assert/strict";
import { buildSolverModel, legalMoves, applyMove, isSolved } from "../src/rules.js";

const level = {
  size: 3,
  arrows: [
    { id: "a", x: 1, y: 0, dir: 1, heavy: false },
    { id: "b", x: 0, y: 0, dir: 1, heavy: false }
  ],
  walls: [], doors: []
};

test("only the arrow with a clear ray is legal", () => {
  const model = buildSolverModel(level);
  const moves = legalMoves(3n, 0n, model);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].index, 0);
});

test("removing the front arrow unlocks the one behind", () => {
  const model = buildSolverModel(level);
  const first = legalMoves(3n, 0n, model)[0];
  const next = applyMove(3n, 0n, first, model);
  const second = legalMoves(next.remaining, next.weakened, model);
  assert.equal(second.length, 1);
  assert.equal(second[0].index, 1);
  const done = applyMove(next.remaining, next.weakened, second[0], model);
  assert.equal(isSolved(done.remaining), true);
});

test("heavy arrows require a hit before removal", () => {
  const heavy = { size: 3, arrows: [{ id: "h", x: 1, y: 1, dir: 0, heavy: true }], walls: [], doors: [] };
  const model = buildSolverModel(heavy);
  const hit = legalMoves(1n, 0n, model)[0];
  assert.equal(hit.type, "hit");
  const next = applyMove(1n, 0n, hit, model);
  assert.equal(legalMoves(next.remaining, next.weakened, model)[0].type, "remove");
});
