import test from "node:test";
import assert from "node:assert/strict";
import { applyPour, canPour, isSolved, pourAmount } from "../src/rules.js";

test("pouring requires an empty or matching destination", () => {
  const tubes = [[0, 0, 1], [1], [], [2, 2]];
  assert.equal(canPour(tubes, 0, 1), true);
  assert.equal(canPour(tubes, 0, 2), true);
  assert.equal(canPour(tubes, 0, 3), false);
  assert.equal(canPour(tubes, 2, 0), false);
});

test("a pour moves the whole contiguous top run", () => {
  const tubes = [[0, 1, 1, 1], [1], []];
  assert.equal(pourAmount(tubes, 0, 1), 3);
  const next = applyPour(tubes, 0, 1);
  assert.deepEqual(next[0], [0]);
  assert.deepEqual(next[1], [1, 1, 1, 1]);
});

test("a full uniform tube plus empty tubes is solved", () => {
  assert.equal(isSolved([[0, 0, 0, 0], [1, 1, 1, 1], [], []], 2), true);
  assert.equal(isSolved([[0, 0, 0, 0], [0, 1, 1, 1], [], []], 2), false);
});
