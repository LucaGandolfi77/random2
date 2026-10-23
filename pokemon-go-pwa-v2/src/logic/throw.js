/*
 * Throw 2.0 — pure math for power, aim, curve, ring timing and catch rate.
 * No DOM, no Math.random(): deterministic and testable in Node.
 */

export const DEFAULT_THROW = {
  chargeMs: 850,
  maxDrag: 210,
  holdWeight: 0.65,
  dragWeight: 0.35,
  minPower: 0.02,
  minSpeed: 620,
  maxSpeed: 1560,
  gravity: 1450,
  curveAccel: 950,
  ringPeriod: 2.4,
  ringMin: 0.28,
  ringMax: 1,
  spinCircle: Math.PI * 1.35,
  curveThreshold: 0.35,
  curveMultiplier: 1.7,
  masterGuaranteed: true,
  minCatchRate: 0.03,
  maxCatchRate: 0.95,
  quality: {
    excellent: 0.82,
    great: 0.62,
    nice: 0.38,
    excellentCenter: 0.30,
    greatCenter: 0.55,
    niceCenter: 0.80,
  },
  xp: { normal: 100, nice: 120, great: 150, excellent: 200, curve: 25 },
};

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function clamp01(v) {
  return clamp(v, 0, 1);
}

/* Power is mostly hold time, with a nudge from how far the finger travelled. */
export function computePower(holdMs, dragDist, cfg = DEFAULT_THROW) {
  const hold = clamp01((holdMs || 0) / cfg.chargeMs);
  const drag = clamp01((dragDist || 0) / cfg.maxDrag);
  return clamp01(hold * cfg.holdWeight + drag * cfg.dragWeight);
}

/* The throw must leave through an upward cone. */
export function clampAimAngle(angle) {
  const upMin = -Math.PI + 0.28;
  const upMax = -0.28;
  let a = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (a >= 0) return a < Math.PI / 2 ? upMax : upMin;
  if (a > upMax) return upMax;
  if (a < upMin) return upMin;
  return a;
}

/* 1 -> the ring is wide; ringMin -> perfect timing window. */
export function ringScaleAt(t, cfg = DEFAULT_THROW) {
  const period = cfg.ringPeriod;
  const p = ((t % period) + period) % period / period;
  return cfg.ringMax - (cfg.ringMax - cfg.ringMin) * p;
}

export function ringFactor(ringScale, cfg = DEFAULT_THROW) {
  return clamp01((cfg.ringMax - ringScale) / (cfg.ringMax - cfg.ringMin));
}

/*
 * centerDist: 0 = dead centre, 1 = edge of the hitbox.
 * ringScale: absolute ring scale at the moment of impact.
 * Returns { quality, score, ring }.
 */
export function qualityFromImpact({ centerDist, ringScale, cfg = DEFAULT_THROW }) {
  const c = clamp01(centerDist);
  const ring = ringFactor(ringScale, cfg);
  const score = 0.55 * (1 - c) + 0.45 * ring;
  const q = cfg.quality;
  let quality = 'normal';
  if (score >= q.excellent && c <= q.excellentCenter) quality = 'excellent';
  else if (score >= q.great) quality = 'great';
  else if (score >= q.nice) quality = 'nice';
  return { quality, score, ring };
}

export function throwMultiplier(quality) {
  switch (quality) {
    case 'excellent': return 2.0;
    case 'great': return 1.5;
    case 'nice': return 1.15;
    default: return 1.0;
  }
}

export function catchRate({
  difficulty = 1,
  ballMult = 1,
  berryMult = 1,
  quality = 'normal',
  curve = false,
  masterGuaranteed = true,
  cfg = DEFAULT_THROW,
} = {}) {
  if (masterGuaranteed && ballMult >= 255) return 1;
  const base = Math.max(cfg.minCatchRate, 0.55 - difficulty * 0.05);
  const multiplier = throwMultiplier(quality) * (curve ? cfg.curveMultiplier : 1);
  return clamp(base * ballMult * berryMult * multiplier, cfg.minCatchRate, cfg.maxCatchRate);
}

export function powerToSpeed(power, cfg = DEFAULT_THROW) {
  return cfg.minSpeed + (cfg.maxSpeed - cfg.minSpeed) * clamp01(power);
}

export function spinFromAccum(accum, cfg = DEFAULT_THROW) {
  return clamp((accum || 0) / cfg.spinCircle, -1, 1);
}

export function isCurve(spin, cfg = DEFAULT_THROW) {
  return Math.abs(spin || 0) >= cfg.curveThreshold;
}

/*
 * Same physics for the aiming preview and the real ball.
 * Stops after maxSteps or when it reaches groundY.
 */
export function trajectory({
  x,
  y,
  angle,
  power,
  spin = 0,
  cfg = DEFAULT_THROW,
  groundY = Infinity,
  maxSteps = 240,
  dt = 1 / 60,
} = {}) {
  const speed = powerToSpeed(power, cfg);
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  const points = [{ x, y }];
  for (let i = 0; i < maxSteps; i++) {
    vy += cfg.gravity * dt;
    vx += spin * cfg.curveAccel * dt;
    vx *= 0.999;
    x += vx * dt;
    y += vy * dt;
    points.push({ x, y });
    if (Number.isFinite(groundY) && y >= groundY) break;
  }
  return points;
}

/* Closest approach between a moving ball segment and the target circle. */
export function segmentCircleHit(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / len2;
  t = clamp01(t);
  const px = ax + dx * t;
  const py = ay + dy * t;
  const dist = Math.hypot(px - cx, py - cy);
  return { hit: dist <= r, t, x: px, y: py, dist };
}

/* XP for a throw, before shiny/streak bonuses. */
export function xpForThrow(quality, curve = false, cfg = DEFAULT_THROW) {
  const base = cfg.xp[quality] != null ? cfg.xp[quality] : cfg.xp.normal;
  return base + (curve ? cfg.xp.curve : 0);
}

/*
 * Closest approach of the actual flight parabola to a target.
 * Used for throw quality, so the result does not depend on frame rate:
 * a fast ball can cross the target between two frames.
 */
export function closestApproachOnFlight(launch, targetX, targetY, tMax, cfg = DEFAULT_THROW) {
  if (!launch) return { dist: Infinity, x: 0, y: 0, t: 0 };
  const steps = 180;
  const end = Math.max(0, tMax || 0);
  let best = { dist: Infinity, x: launch.x, y: launch.y, t: 0 };
  for (let i = 0; i <= steps; i++) {
    const t = end * i / steps;
    const x = launch.x + launch.vx * t + 0.5 * (launch.spin || 0) * cfg.curveAccel * t * t;
    const y = launch.y + launch.vy * t + 0.5 * cfg.gravity * t * t;
    const dist = Math.hypot(x - targetX, y - targetY);
    if (dist < best.dist) best = { dist, x, y, t };
  }
  return best;
}
