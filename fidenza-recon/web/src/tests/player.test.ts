import { describe, expect, it } from 'vitest';
import {
  cameraRelativeDirection,
  damp,
  shortestAngle,
} from '../player/controller';
import { pointInRing } from '../player/collision';
import { joystickVector } from '../ui/touch';

describe('player movement helpers', () => {
  it('moves forward relative to the camera angle', () => {
    const forward = cameraRelativeDirection(0, 1, Math.PI);
    expect(forward.x).toBeCloseTo(0, 5);
    expect(forward.y).toBeCloseTo(1, 5);

    const backward = cameraRelativeDirection(0, 1, 0);
    expect(backward.x).toBeCloseTo(0, 5);
    expect(backward.y).toBeCloseTo(-1, 5);
  });

  it('maps screen-right correctly for a camera looking down -Z', () => {
    const right = cameraRelativeDirection(1, 0, 0);
    expect(right.x).toBeCloseTo(1, 5);
    expect(right.y).toBeCloseTo(0, 5);

    const left = cameraRelativeDirection(-1, 0, 0);
    expect(left.x).toBeCloseTo(-1, 5);
    expect(left.y).toBeCloseTo(0, 5);
  });

  it('maps screen-right to world -X when the camera is behind a +Z facing player', () => {
    const right = cameraRelativeDirection(1, 0, Math.PI);
    expect(right.x).toBeCloseTo(-1, 5);
    expect(right.y).toBeCloseTo(0, 5);

    const left = cameraRelativeDirection(-1, 0, Math.PI);
    expect(left.x).toBeCloseTo(1, 5);
    expect(left.y).toBeCloseTo(0, 5);
  });

  it('normalises diagonal camera-relative movement', () => {
    const diagonal = cameraRelativeDirection(1, 1, Math.PI);
    expect(diagonal.length()).toBeCloseTo(1, 5);
  });

  it('wraps angles across the -pi/pi seam', () => {
    expect(shortestAngle(3, -3)).toBeCloseTo(Math.PI * 2 - 6, 5);
    expect(shortestAngle(-3, 3)).toBeCloseTo(6 - Math.PI * 2, 5);
    expect(shortestAngle(1, 1.2)).toBeCloseTo(0.2, 5);
  });

  it('damps towards the target without overshooting', () => {
    const value = damp(0, 10, 10, 0.1);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(10);
  });
});

describe('joystick vector', () => {
  it('returns zero inside the dead zone', () => {
    expect(joystickVector(2, 0, 60)).toEqual({ x: 0, y: 0, magnitude: 0 });
  });

  it('points up for a screen-up drag and stays normalised', () => {
    const vector = joystickVector(0, -60, 60);
    expect(vector.x).toBeCloseTo(0, 5);
    expect(vector.y).toBeCloseTo(1, 5);
    expect(vector.magnitude).toBeCloseTo(1, 5);
  });

  it('clamps an out-of-range drag to magnitude one', () => {
    const vector = joystickVector(180, 0, 60);
    expect(vector.magnitude).toBeCloseTo(1, 5);
    expect(vector.x).toBeCloseTo(1, 5);
  });

  it('uses a finer response curve near the centre', () => {
    const vector = joystickVector(0, -30, 60);
    expect(vector.magnitude).toBeGreaterThan(0.4);
    expect(vector.y).toBeGreaterThan(0);
    expect(vector.y).toBeLessThan(vector.magnitude);
  });
});

describe('building footprint tests', () => {
  const ring: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  it('detects points inside and outside a ring', () => {
    expect(pointInRing(5, 5, ring)).toBe(true);
    expect(pointInRing(-1, 5, ring)).toBe(false);
    expect(pointInRing(11, 5, ring)).toBe(false);
    expect(pointInRing(5, 11, ring)).toBe(false);
  });

  it('works with concave footprints', () => {
    const concave: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [5, 4],
      [0, 10],
    ];
    expect(pointInRing(2, 8, concave)).toBe(false);
    expect(pointInRing(5, 2, concave)).toBe(true);
  });
});
