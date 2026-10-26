import test from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "../src/board.js";
import { createPathfinder } from "../src/path.js";
import { mulberry32 } from "../src/quantize.js";

function boardWithTopTarget() {
  const width = 5;
  const height = 5;
  const palette = [{ hex: "#000000" }, { hex: "#ffffff" }];
  const indices = new Uint16Array(width * height);
  indices[2] = 1;
  return createBoard({ width, height, palette, indices, seed: 1 });
}

test("the outside ring connects the bottom to every side", () => {
  const board = boardWithTopTarget();
  const path = createPathfinder(board);
  const field = path.distanceField(2, 5);
  assert.ok(field.dist[path.key(2, -1)] > 0);
  assert.ok(field.dist[path.key(-1, 2)] > 0);
  assert.ok(field.dist[path.key(5, 2)] > 0);
  const line = path.pathFrom(field, 2, -1);
  assert.ok(line.length > 5);
  assert.deepEqual(line[0], { x: 2, y: 5 });
  assert.deepEqual(line[line.length - 1], { x: 2, y: -1 });
});

test("a target path stops next to the pixel and never crosses it", () => {
  const board = boardWithTopTarget();
  const path = createPathfinder(board);
  const rng = mulberry32(9);
  const target = path.findTarget(2, 5, 1, rng);
  assert.ok(target);
  assert.equal(target.index, 2);
  assert.deepEqual(target.access, { x: 2, y: -1 });
  assert.ok(target.path.length > 2);
  assert.deepEqual(target.path[0], { x: 2, y: 5 });
  assert.deepEqual(target.path[target.path.length - 1], target.access);
  for (const point of target.path) {
    assert.equal(board.isOpen(point.x, point.y), true, JSON.stringify(point));
  }
  assert.equal(Math.abs(target.access.x - board.xOf(target.index)) +
    Math.abs(target.access.y - board.yOf(target.index)), 1);
  assert.equal(board.reserve(target.index), true);
  assert.ok(board.steal(target.index));
});

test("empty holes become shortcuts through the picture", () => {
  const width = 7;
  const height = 7;
  const palette = [{ hex: "#000000" }, { hex: "#ffffff" }];
  const indices = new Uint16Array(width * height);
  indices[3 * width + 3] = 1;
  const board = createBoard({ width, height, palette, indices, seed: 2 });
  const path = createPathfinder(board);
  board.steal(3 * width);
  board.steal(3 * width + 1);
  board.steal(3 * width + 2);
  const before = path.findTarget(3, 7, 1, mulberry32(3));
  assert.ok(before);

  board.steal(6 * width + 3);
  board.steal(5 * width + 3);
  board.steal(4 * width + 3);
  const after = path.findTarget(3, 7, 1, mulberry32(3));
  assert.ok(after);
  assert.ok(after.distance < before.distance);
  for (const point of after.path) assert.equal(board.isOpen(point.x, point.y), true);
});

test("no available colour means no target and no path", () => {
  const board = boardWithTopTarget();
  const path = createPathfinder(board);
  assert.equal(path.findTarget(2, 5, 0, mulberry32(1)) !== null, true);
  board.steal(2);
  assert.equal(path.findTarget(2, 5, 1, mulberry32(1)), null);
});

test("ants prefer the outermost available ring before digging deeper", () => {
  const width = 9;
  const height = 9;
  const palette = [{ hex: "#000000" }, { hex: "#ffffff" }];
  const indices = new Uint16Array(width * height);
  const outer = 4 * width;
  const inner = 4 * width + 4;
  indices[outer] = 1;
  indices[inner] = 1;
  const board = createBoard({ width, height, palette, indices, seed: 6 });
  const path = createPathfinder(board);
  for (let y = height - 1; y >= 5; y--) {
    assert.ok(board.steal(y * width + 4));
  }
  assert.equal(board.isAvailable(inner), true);
  assert.equal(board.isAvailable(outer), true);

  const first = path.findTarget(4, height, 1, mulberry32(4));
  assert.ok(first);
  assert.equal(first.index, outer);
  assert.equal(first.shell, 0);

  assert.ok(board.steal(outer));
  const second = path.findTarget(4, height, 1, mulberry32(4));
  assert.ok(second);
  assert.equal(second.index, inner);
  assert.equal(second.shell, 4);
});
