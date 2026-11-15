export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return { x: 0, y: 0, length: 0 };
  return { x: x / length, y: y / length, length };
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function circleRect(x, y, radius, rect) {
  const nx = clamp(x, rect.x, rect.x + rect.w);
  const ny = clamp(y, rect.y, rect.y + rect.h);
  return (x - nx) ** 2 + (y - ny) ** 2 <= radius * radius;
}

export function circleCollides(x, y, radius, solids) {
  for (const rect of solids) {
    if (circleRect(x, y, radius, rect)) return true;
  }
  return false;
}

export function moveCircle(entity, dx, dy, solids, minX = 0, minY = 0, maxX = Infinity, maxY = Infinity) {
  const radius = entity.radius;
  if (dx !== 0) {
    const nx = clamp(entity.x + dx, minX + radius, maxX - radius);
    if (!circleCollides(nx, entity.y, radius, solids)) entity.x = nx;
  }
  if (dy !== 0) {
    const ny = clamp(entity.y + dy, minY + radius, maxY - radius);
    if (!circleCollides(entity.x, ny, radius, solids)) entity.y = ny;
  }
}

export function segmentRectT(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;

  for (const [origin, delta, min, max] of [
    [x1, dx, rect.x, rect.x + rect.w],
    [y1, dy, rect.y, rect.y + rect.h]
  ]) {
    if (Math.abs(delta) < 0.00001) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const inv = 1 / delta;
    let t1 = (min - origin) * inv;
    let t2 = (max - origin) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

export function segmentCircleT(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (a < 0.00001) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return t1;
  if (t2 >= 0 && t2 <= 1) return t2;
  if (t1 < 0 && t2 > 1) return 0;
  return null;
}

export function hasLineOfSight(level, x1, y1, x2, y2) {
  for (const rect of level.solids) {
    if (rect.noSight) continue;
    const t = segmentRectT(x1, y1, x2, y2, rect);
    if (t !== null && t > 0.015 && t < 0.985) return false;
  }
  return true;
}

export function distanceToRect(x, y, rect) {
  const nx = clamp(x, rect.x, rect.x + rect.w);
  const ny = clamp(y, rect.y, rect.y + rect.h);
  return Math.hypot(x - nx, y - ny);
}

export function nearestCover(level, x, y, range) {
  let best = null;
  let bestDistance = range;
  for (const prop of level.covers) {
    const d = distanceToRect(x, y, prop);
    if (d < bestDistance) {
      best = prop;
      bestDistance = d;
    }
  }
  return best;
}

export function inVisionCone(source, target, distanceMax, fov) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (length > distanceMax || length < 0.001) return length <= distanceMax;
  const facing = Math.cos(source.angle) * (dx / length) + Math.sin(source.angle) * (dy / length);
  return facing >= Math.cos(fov / 2);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}
