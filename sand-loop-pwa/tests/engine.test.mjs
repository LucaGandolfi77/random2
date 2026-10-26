import test from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../src/engine.js";
import { createBoard } from "../src/board.js";

const RULES = {
  slots: 3,
  pourRate: 55,
  grace: 0,
  bucketCapacity: 60,
  rotationSpeed: 60,
  runMin: 8,
  runMax: 16,
  spillShare: 0.2
};

function makeEngine(counts, seed, config) {
  return createEngine({
    counts: counts || [90, 90, 90],
    seed: seed == null ? 42 : seed,
    config: Object.assign({}, RULES, config || {})
  });
}

/* The player we test against: keep a bucket of the current colour on the
 * loop, and make room by recycling a colour that is not being poured. */
function playPerfect(engine, seconds) {
  const steps = Math.round((seconds || 240) * 60);
  for (let i = 0; i < steps; i++) {
    const s = engine.getState();
    if (s.status !== "playing") break;
    const current = s.currentColor;
    if (current >= 0) {
      const has = s.buckets.some((b) => b && b.color === current);
      if (!has) {
        const result = engine.deploy(current);
        if (!result.ok && result.reason === "full") {
          let victim = -1;
          for (let slot = 0; slot < s.buckets.length; slot++) {
            const b = s.buckets[slot];
            if (!b) continue;
            if (b.color !== current) { victim = slot; break; }
          }
          if (victim >= 0) engine.recall(victim);
          engine.deploy(current);
        }
      }
    }
    engine.update(1 / 60);
  }
  return engine.getState();
}

test("a bucket can be deployed, fills and is recycled", () => {
  const engine = makeEngine([120, 120], 5, { slots: 1, bucketCapacity: 12 });
  const r = engine.deploy(engine.getState().currentColor);
  assert.equal(r.ok, true);
  let sawFull = false;
  for (let i = 0; i < 2000 && engine.getState().status === "playing"; i++) {
    engine.update(1 / 60);
    const events = engine.drainEvents();
    if (events.some((e) => e.type === "bucketFull")) { sawFull = true; break; }
  }
  assert.equal(sawFull, true);
  assert.equal(engine.getState().buckets[0], null);
});

test("deploy refuses exhausted colours and a full loop", () => {
  const engine = makeEngine([30, 0], 1, { slots: 1 });
  assert.equal(engine.deploy(1).ok, false);
  assert.equal(engine.deploy(0).ok, true);
  assert.equal(engine.deploy(0).ok, false);
  assert.equal(engine.recall(0).ok, true);
  assert.equal(engine.deploy(0).ok, true);
});

test("no interaction fills the spill tray and ends the run", () => {
  const engine = makeEngine([90, 90, 90], 9);
  for (let i = 0; i < 60 * 120; i++) {
    engine.update(1 / 60);
    if (engine.getState().status !== "playing") break;
  }
  const s = engine.getState();
  assert.equal(s.status, "lost");
  assert.ok(s.spilled >= s.spillLimit);
  assert.ok(s.captured < s.total);
});

test("a player who keeps the current colour stocked finishes the picture", () => {
  const engine = makeEngine([90, 90, 90], 42);
  const s = playPerfect(engine, 300);
  assert.equal(s.status, "won", `ended ${s.status}: ${s.captured}/${s.total}, spilled ${s.spilled}`);
  assert.equal(s.captured, s.total);
  assert.ok(s.spilled < s.spillLimit);
  assert.ok(s.score > 0);
  assert.ok(s.stars >= 1 && s.stars <= 3);
});

test("spilled sand is returned to the reservoir, never lost", () => {
  const engine = makeEngine([20, 20], 3, { slots: 1, grace: 0, pourRate: 200 });
  for (let i = 0; i < 300; i++) engine.update(1 / 60);
  const s = engine.getState();
  const outstanding = s.reserve.reduce((a, b) => a + b, 0) +
    s.pending.reduce((a, b) => a + b, 0) +
    s.capturedByColor.reduce((a, b) => a + b, 0);
  assert.equal(outstanding, s.total);
  assert.ok(s.spilled >= 0);
});

test("events report colour, capture, spill and deploy", () => {
  const engine = makeEngine([600, 600, 600], 17, { grace: 0 });
  const startEvents = engine.drainEvents();
  assert.ok(startEvents.some((e) => e.type === "color"));
  engine.deploy(engine.getState().currentColor);
  const deployEvents = engine.drainEvents();
  assert.ok(deployEvents.some((e) => e.type === "deploy"));
  for (let i = 0; i < 900; i++) engine.update(1 / 60);
  const seen = new Set(engine.drainEvents().map((e) => e.type));
  assert.ok(seen.has("capture") || seen.has("spill"));
});

test("a run never captures more grains than the picture holds", () => {
  const engine = makeEngine([40, 40], 8);
  const s = playPerfect(engine, 120);
  assert.ok(s.captured <= s.total);
  const sum = s.capturedByColor.reduce((a, b) => a + b, 0);
  assert.equal(sum, s.captured);
});

test("a capture event carries the bottom-row cell removed from the board", () => {
  const width = 6, height = 8;
  const palette = [{ hex: "#000" }, { hex: "#fff" }];
  const indices = new Uint16Array(width * height);
  for (let i = 0; i < indices.length; i++) indices[i] = i % 2;
  const board = createBoard({ width, height, palette, indices, seed: 21 });
  const engine = createEngine({
    counts: board.remainingByColor(),
    seed: 21,
    config: Object.assign({}, RULES),
    capture: (color) => board.captureCell(color),
    accessible: (color) => board.accessibleCount(color)
  });

  const s = playPerfect(engine, 120);
  assert.equal(s.status, "won", `ended ${s.status}: ${s.captured}/${s.total}`);
  assert.equal(s.captured, board.total);
  assert.equal(board.allCleared(), true);

  const captures = engine.drainEvents().filter((e) => e.type === "capture");
  assert.equal(captures.length, board.total);
  for (const evt of captures) {
    assert.ok(evt.cell);
    assert.ok(evt.cell.row >= height - board.accessibleRows);
  }
});

test("a refused board capture spills instead of clearing a cell", () => {
  const engine = createEngine({
    counts: [20, 20],
    seed: 2,
    config: Object.assign({}, RULES, { slots: 1 }),
    capture: () => -1,
    accessible: () => 1
  });
  engine.deploy(engine.getState().currentColor);

  let sawSpill = false, sawCapture = false;
  for (let i = 0; i < 1200; i++) {
    engine.update(1 / 60);
    for (const evt of engine.drainEvents()) {
      if (evt.type === "spill") sawSpill = true;
      if (evt.type === "capture") sawCapture = true;
    }
    if (sawSpill) break;
  }
  assert.equal(sawSpill, true);
  assert.equal(sawCapture, false);
  assert.equal(engine.getState().captured, 0);
});
