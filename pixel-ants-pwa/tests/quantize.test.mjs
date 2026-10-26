import test from "node:test";
import assert from "node:assert/strict";
import {
  quantizeImageData,
  smoothIndices,
  labDistance,
  rgbToLab,
  makeColor,
  paletteCounts
} from "../src/quantize.js";

function rgba(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const c = fn(x, y);
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = c[3] == null ? 255 : c[3];
    }
  }
  return data;
}

test("four quadrants reduce to exactly four colours with equal counts", () => {
  const data = rgba(20, 20, (x, y) => {
    if (x < 10 && y < 10) return [220, 30, 30];
    if (x >= 10 && y < 10) return [20, 180, 70];
    if (x < 10) return [30, 70, 210];
    return [240, 200, 40];
  });
  const q = quantizeImageData(data, 20, 20, 4);
  assert.equal(q.palette.length, 4);
  assert.equal(q.indices.length, 400);
  assert.deepEqual(q.counts.slice().sort((a, b) => a - b), [100, 100, 100, 100]);
  for (const i of q.indices) assert.ok(i >= 0 && i < 4);
});

test("quantization is deterministic", () => {
  const data = rgba(24, 16, (x, y) => [x * 10, y * 15, (x * y) % 255]);
  const a = quantizeImageData(data, 24, 16, 6);
  const b = quantizeImageData(data, 24, 16, 6);
  assert.deepEqual(a.palette.map((c) => c.hex), b.palette.map((c) => c.hex));
  assert.deepEqual(Array.from(a.indices), Array.from(b.indices));
  assert.equal(a.hash, b.hash);
});

test("a monochrome upload still produces a playable palette", () => {
  const data = rgba(10, 10, () => [190, 40, 30]);
  const q = quantizeImageData(data, 10, 10, 6);
  assert.equal(q.palette.length, 6);
  const hexes = new Set(q.palette.map((c) => c.hex));
  assert.ok(hexes.size >= 4, "expected distinct tonal variants");
  assert.equal(q.counts.reduce((a, b) => a + b, 0), 100);
});

test("transparent pixels composite onto paper and stay in range", () => {
  const data = rgba(8, 8, (x) => (x < 4 ? [0, 0, 0, 0] : [10, 10, 10, 255]));
  const q = quantizeImageData(data, 8, 8, 4);
  assert.equal(q.palette.length, 4);
  for (const c of q.palette) {
    for (const v of [c.r, c.g, c.b]) {
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 255);
    }
  }
  assert.equal(q.counts.reduce((a, b) => a + b, 0), 64);
});

test("a single speckle is smoothed away", () => {
  const w = 5, h = 5;
  const src = new Uint16Array(w * h);
  src[2 * w + 2] = 1;
  const out = smoothIndices(src, w, h, 2, 1);
  assert.equal(out[2 * w + 2], 0);
});

test("lab distance is zero for identical colours and grows for opposites", () => {
  const black = rgbToLab(0, 0, 0);
  const white = rgbToLab(255, 255, 255);
  assert.equal(labDistance(black, rgbToLab(0, 0, 0)), 0);
  assert.ok(labDistance(black, white) > 90);
});

test("paletteCounts agrees with indices", () => {
  const counts = paletteCounts(new Uint16Array([0, 1, 1, 2, 2, 2]), 3);
  assert.deepEqual(counts, [1, 2, 3]);
  const c = makeColor(300, -10, 12);
  assert.equal(c.r, 255);
  assert.equal(c.g, 0);
});
