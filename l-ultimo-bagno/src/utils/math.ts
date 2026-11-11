import * as THREE from 'three';

export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export const clamp01 = (value: number): number => clamp(value, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, value: number): number =>
  a === b ? 0 : (value - a) / (b - a);

export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01(invLerp(edge0, edge1, value));
  return t * t * (3 - 2 * t);
};

export const smootherstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);

export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const wrapAngle = (angle: number): number => {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
};

export const lerpAngle = (a: number, b: number, t: number): number =>
  a + wrapAngle(b - a) * clamp01(t);

export const yawTowards = (
  from: THREE.Vector3,
  to: THREE.Vector3,
): number => Math.atan2(to.x - from.x, to.z - from.z);

export const vec3 = (x: number, y: number, z: number): THREE.Vector3 =>
  new THREE.Vector3(x, y, z);

export const round3 = (value: number): number => Math.round(value * 1000) / 1000;

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function vnoise(time: number, seed = 0): number {
  const x = time * 0.7 + seed * 13.37;
  return (
    Math.sin(x) * 0.5 +
    Math.sin(x * 2.17 + 1.3) * 0.3 +
    Math.sin(x * 0.43 + 2.7) * 0.2
  );
}
