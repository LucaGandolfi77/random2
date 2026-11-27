import test from 'node:test';
import assert from 'node:assert/strict';
import { rowCenters, REEL_TOP, REEL_H } from '../src/render.js';
import { MACHINES } from '../src/machines/index.js';
import { ReelSpinner } from '../src/spin.js';

test('every visible row centre falls inside the reel window', () => {
  for (const m of MACHINES) {
    const centers = rowCenters(m);
    assert.equal(centers.length, m.rows, m.id);
    centers.forEach((y, row) => {
      assert.ok(y > REEL_TOP && y < REEL_TOP + REEL_H, `${m.id} row ${row} at ${y}`);
    });
  }
});

test('rows are evenly spaced and fill the reel window', () => {
  for (const m of MACHINES) {
    const centers = rowCenters(m);
    const step = centers[1] - centers[0];
    for (let i = 2; i < centers.length; i++) {
      assert.ok(Math.abs((centers[i] - centers[i - 1]) - step) < 0.001, m.id);
    }
    const cellH = REEL_H / m.rows;
    assert.ok(Math.abs(centers[0] - (REEL_TOP + cellH / 2)) < 0.001, m.id);
    assert.ok(Math.abs(centers.at(-1) - (REEL_TOP + REEL_H - cellH / 2)) < 0.001, m.id);
  }
});

test('render-state index 0 sits above the window and row indices map to centres', () => {
  for (const m of MACHINES) {
    const spinner = new ReelSpinner();
    spinner.reset(m.strips, m.rows);
    const rs = spinner.getRenderState()[0];
    const cellH = REEL_H / m.rows;
    // The leading placeholder must be drawn outside the visible window.
    const aboveY = REEL_TOP + (0 - 0.5) * cellH;
    assert.ok(aboveY < REEL_TOP, `${m.id}: placeholder drawn inside window`);
    // Each real row (indices 1..rows) must land exactly on its row centre.
    rs.symbols.forEach((_, i) => {
      if (i < 1 || i > m.rows) return;
      const y = REEL_TOP + (i - 0.5) * cellH;
      assert.ok(Math.abs(y - rowCenters(m)[i - 1]) < 0.001, `${m.id} index ${i}`);
    });
  }
});

test('5x3, 5x4 and 6x5 machines all render their full matrix', () => {
  const shapes = new Set(MACHINES.map((m) => `${m.reels}x${m.rows}`));
  assert.ok(shapes.has('5x3') && shapes.has('5x4') && shapes.has('6x5'));
});
