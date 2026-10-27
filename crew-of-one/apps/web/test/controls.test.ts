import { describe, expect, it } from 'vitest';
import { CONTROL_LAYOUTS, type ControlRect } from '../src/controls';

const overlaps = (a: ControlRect, b: ControlRect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('control layouts', () => {
  for (const handedness of ['right', 'left'] as const) {
    it(`keeps the ${handedness}-handed bar inside the portrait screen`, () => {
      const layout = CONTROL_LAYOUTS[handedness];
      for (const rect of Object.values(layout)) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(360);
        expect(rect.y + rect.h).toBeLessThanOrEqual(640);
      }
    });

    it(`does not overlap buttons in the ${handedness}-handed layout`, () => {
      const rects = Object.values(CONTROL_LAYOUTS[handedness]);
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          expect(overlaps(rects[i]!, rects[j]!)).toBe(false);
        }
      }
    });
  }

  it('mirrors the action and undo buttons', () => {
    const right = CONTROL_LAYOUTS.right;
    const left = CONTROL_LAYOUTS.left;
    expect(left.act.x).toBeGreaterThan(right.act.x);
    expect(left.undo.x).toBeLessThan(right.undo.x);
  });
});
