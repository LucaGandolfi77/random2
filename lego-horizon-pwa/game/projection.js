/* 2.5D camera for Machine Hunt.
 *
 * The simulation stays a plain top-down 2D world (ARENA coordinates). This
 * module only maps those coordinates to a perspective view: the far edge of
 * the world sits at the horizon and is smaller, the near edge fills the
 * bottom of the canvas. `z` lifts sprites upright off the ground plane.
 *
 * Pure math, no DOM: safe to import from tests, renderer and input helpers.
 */
import { ARENA } from "./data.js";

const W = ARENA.width;
const H = ARENA.height;

export const CAMERA = Object.freeze({
  horizon: 232,
  farScale: 0.58,
  nearScale: 1.0,
  curve: 1.32,
});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** World point (x, y) at height z -> view point {x, y, scale, depth}. */
export function project(x, y, z = 0) {
  const depth = clamp(y / H, 0, 1);
  const screenY = CAMERA.horizon + (H - CAMERA.horizon) * Math.pow(depth, CAMERA.curve);
  const scale = CAMERA.farScale + (CAMERA.nearScale - CAMERA.farScale) * depth;
  return {
    x: W / 2 + (x - W / 2) * scale,
    y: screenY - z * scale,
    scale,
    depth,
  };
}

/** View point (x, y) -> world point on the ground plane (z = 0). */
export function unproject(x, y) {
  const d = clamp((y - CAMERA.horizon) / (H - CAMERA.horizon), 0, 1);
  const depth = Math.pow(d, 1 / CAMERA.curve);
  const scale = CAMERA.farScale + (CAMERA.nearScale - CAMERA.farScale) * depth;
  return {
    x: W / 2 + (x - W / 2) / scale,
    y: depth * H,
  };
}

/** Half-width of the playable ground at a given world y (for scenery). */
export function rowExtent(y) {
  const p = project(W / 2, y, 0);
  return {
    left: W / 2 - (W / 2) * p.scale,
    right: W / 2 + (W / 2) * p.scale,
    scale: p.scale,
    y: p.y,
  };
}

/** Play-plane edges at a given screen y (inverse of the depth curve). */
export function edgesAtScreenY(y) {
  const d = clamp((y - CAMERA.horizon) / (H - CAMERA.horizon), 0, 1);
  const depth = Math.pow(d, 1 / CAMERA.curve);
  const scale = CAMERA.farScale + (CAMERA.nearScale - CAMERA.farScale) * depth;
  const half = (W / 2) * scale;
  return { left: W / 2 - half, right: W / 2 + half, scale, depth };
}

/** How the backdrop should react to the player's position on the plane. */
export function parallaxFor(x, y) {
  const depth = clamp(y / H, 0, 1);
  return {
    depth,
    dx: clamp((x - W / 2) / W, -1, 1) * 2,
    dy: depth - 0.5,
    fog: 0.5 + (1 - depth) * 0.5,
    warmth: 0.3 + depth * 0.7,
  };
}
