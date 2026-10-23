import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THROW,
  clamp,
  computePower,
  clampAimAngle,
  ringScaleAt,
  qualityFromImpact,
  catchRate,
  trajectory,
  segmentCircleHit,
  spinFromAccum,
  isCurve,
  xpForThrow,
  closestApproachOnFlight,
} from '../src/logic/throw.js';

test('clamp stays inside bounds', () => {
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(0.4, 0, 1), 0.4);
});

test('power is zero at rest and one at full charge', () => {
  assert.equal(computePower(0, 0), 0);
  assert.equal(computePower(DEFAULT_THROW.chargeMs, DEFAULT_THROW.maxDrag), 1);
  assert.ok(computePower(400, 100) > computePower(200, 50));
});

test('aim is always inside the upward cone', () => {
  const up = clampAimAngle(-Math.PI / 2);
  assert.ok(Math.abs(up + Math.PI / 2) < 1e-9);
  const right = clampAimAngle(0);
  const left = clampAimAngle(Math.PI);
  const down = clampAimAngle(Math.PI / 2);
  for (const a of [right, left, down]) {
    assert.ok(a <= -0.28 && a >= -Math.PI + 0.28, `angle ${a} outside cone`);
  }
});

test('ring shrinks over time and resets', () => {
  assert.ok(Math.abs(ringScaleAt(0) - 1) < 1e-9);
  const mid = ringScaleAt(DEFAULT_THROW.ringPeriod / 2);
  assert.ok(mid < 0.7 && mid > 0.5);
  assert.ok(Math.abs(ringScaleAt(DEFAULT_THROW.ringPeriod) - 1) < 1e-9);
});

test('excellent is reachable with a centred, well-timed hit', () => {
  const perfect = qualityFromImpact({ centerDist: 0.05, ringScale: 0.3 });
  assert.equal(perfect.quality, 'excellent');
  const edge = qualityFromImpact({ centerDist: 0.95, ringScale: 1 });
  assert.equal(edge.quality, 'normal');
});

test('quality degrades as the hit drifts from the centre', () => {
  const a = qualityFromImpact({ centerDist: 0.1, ringScale: 0.35 });
  const b = qualityFromImpact({ centerDist: 0.5, ringScale: 0.35 });
  assert.ok(a.score > b.score);
});

test('catch rate is bounded and master is guaranteed', () => {
  const low = catchRate({ difficulty: 10, ballMult: 1, berryMult: 1, quality: 'normal' });
  const high = catchRate({ difficulty: 1, ballMult: 2, berryMult: 2.5, quality: 'excellent', curve: true });
  assert.ok(low >= DEFAULT_THROW.minCatchRate);
  assert.ok(high <= DEFAULT_THROW.maxCatchRate);
  assert.equal(catchRate({ difficulty: 10, ballMult: 255 }), 1);
});

test('curveball adds a real multiplier', () => {
  const straight = catchRate({ difficulty: 5, ballMult: 1, quality: 'great', curve: false });
  const curved = catchRate({ difficulty: 5, ballMult: 1, quality: 'great', curve: true });
  assert.ok(curved > straight);
});

test('trajectory goes up first, then falls', () => {
  const startY = 500;
  const points = trajectory({ x: 100, y: startY, angle: -Math.PI / 2, power: 0.6, groundY: 1200 });
  assert.ok(points[1].y < startY, 'first step should move upward');
  assert.ok(points.some((p) => p.y > startY), 'gravity should bring it back down');
});

test('segment/circle hit handles a direct hit and a miss', () => {
  const hit = segmentCircleHit(0, 0, 100, 0, 50, 0, 10);
  assert.equal(hit.hit, true);
  const miss = segmentCircleHit(0, 0, 100, 0, 50, 50, 10);
  assert.equal(miss.hit, false);
});

test('spin maps to a curve flag', () => {
  assert.equal(isCurve(0), false);
  assert.equal(isCurve(spinFromAccum(Math.PI * 2)), true);
});

test('xp rewards curve and quality', () => {
  assert.equal(xpForThrow('normal'), 100);
  assert.equal(xpForThrow('excellent'), 200);
  assert.equal(xpForThrow('excellent', true), 225);
});


test('closest approach finds the target between frames', () => {
  const launch = { x: 0, y: 0, vx: 10, vy: 0, spin: 0 };
  const cfg = { ...DEFAULT_THROW, gravity: 0, curveAccel: 0 };
  const hit = closestApproachOnFlight(launch, 50, 0, 10, cfg);
  assert.ok(hit.dist < 0.01);
  assert.ok(Math.abs(hit.x - 50) < 1);
});
