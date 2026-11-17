/* 2.5D scrolling camera for Machine Hunt.
 *
 * The simulation is a top-down 2D world (WORLD coordinates); the renderer
 * shows a 600x1080 view (ARENA) that follows the player across it. Pure math,
 * no DOM: safe to import from tests, renderer and input helpers.
 */
import { ARENA, WORLD } from "./data.js";

const W = ARENA.width;
const H = ARENA.height;

export const CAMERA = Object.freeze({
  horizon: 232,
  farScale: 0.58,
  nearScale: 1.0,
  curve: 1.32,
  anchor: 0.56,
});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let camera = { x: WORLD.width / 2, y: WORLD.height / 2 };

export function setCamera(x, y) {
  camera = {
    x: clamp(x, 0, WORLD.width),
    y: clamp(y, 0, WORLD.height),
  };
}
export function cameraState() {
  return { ...camera };
}
/** Hub/village scenes use the old fixed view-sized coordinate space. */
export function resetCameraToView() {
  camera = { x: W / 2, y: H * CAMERA.anchor };
}

/** World point (x, y) at height z -> view point {x, y, scale, depth}. */
export function project(x, y, z = 0) {
  const vy = y - camera.y + H * CAMERA.anchor;
  const depth = clamp(vy / H, 0, 1);
  const screenY = CAMERA.horizon + (H - CAMERA.horizon) * Math.pow(depth, CAMERA.curve);
  const scale = CAMERA.farScale + (CAMERA.nearScale - CAMERA.farScale) * depth;
  return {
    x: W / 2 + (x - camera.x) * scale,
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
    x: camera.x + (x - W / 2) / scale,
    y: camera.y - H * CAMERA.anchor + depth * H,
  };
}

/** World-y window currently visible in the view (top and bottom). */
export function visibleYRange() {
  return {
    top: camera.y - H * CAMERA.anchor,
    bottom: camera.y + H * (1 - CAMERA.anchor),
  };
}

/** World-x half-width visible at a given world y. */
export function visibleXRange(y) {
  const p = project(camera.x, y, 0);
  const half = (W / 2) / p.scale;
  return { left: camera.x - half, right: camera.x + half };
}

export function rowExtent(y) {
  const p = project(camera.x, y, 0);
  return {
    left: W / 2 - (W / 2) * p.scale,
    right: W / 2 + (W / 2) * p.scale,
    scale: p.scale,
    y: p.y,
  };
}

/** Play-plane edges at a given screen y (the trapezoid shape is camera-free). */
export function edgesAtScreenY(y) {
  const d = clamp((y - CAMERA.horizon) / (H - CAMERA.horizon), 0, 1);
  const depth = Math.pow(d, 1 / CAMERA.curve);
  const scale = CAMERA.farScale + (CAMERA.nearScale - CAMERA.farScale) * depth;
  const half = (W / 2) * scale;
  return { left: W / 2 - half, right: W / 2 + half, scale, depth };
}

/** How the backdrop should react to the player's position on the plane. */
export function parallaxFor(x, y) {
  const depth = clamp((y - WORLD.height / 2) / (WORLD.height / 2), -1, 1);
  return {
    depth: (depth + 1) / 2,
    dx: clamp((x - WORLD.width / 2) / (WORLD.width / 2), -1, 1),
    dy: depth * 0.5,
    fog: 0.5 + (1 - (depth + 1) / 2) * 0.5,
    warmth: 0.3 + ((depth + 1) / 2) * 0.7,
  };
}
