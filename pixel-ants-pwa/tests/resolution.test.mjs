import test from "node:test";
import assert from "node:assert/strict";
import { GRID_PRESETS, DEFAULT_GRID, gridPreset, gridPixels } from "../src/image-import.js";

test("the default pixel wall is the original 40 x 54 grid", () => {
  assert.equal(DEFAULT_GRID, "standard");
  assert.deepEqual(gridPreset(DEFAULT_GRID), { width: 40, height: 54, label: "Standard" });
  assert.equal(gridPixels(DEFAULT_GRID), 2160);
});

test("the four pixel counts keep the picture's 20:27 aspect", () => {
  assert.deepEqual(Object.keys(GRID_PRESETS), ["coarse", "standard", "fine", "ultra"]);
  assert.deepEqual(Object.values(GRID_PRESETS).map((p) => p.width * p.height), [540, 2160, 4860, 8640]);
  for (const preset of Object.values(GRID_PRESETS)) {
    assert.equal(preset.width / preset.height, 20 / 27);
  }
});

test("an unknown pixel count falls back to the standard wall", () => {
  assert.equal(gridPreset("huge"), GRID_PRESETS.standard);
  assert.equal(gridPixels("huge"), 2160);
});
