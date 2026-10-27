import * as THREE from 'three';

export const C = {
  ink: '#080b10',
  black: '#0c1117',
  steel: '#53646d',
  steelDark: '#2b353d',
  steelLight: '#93a6ae',
  concrete: '#3a4247',
  concreteDark: '#252c31',
  rust: '#8d5238',
  rustLight: '#c47a4f',
  amber: '#ffb35f',
  amberHot: '#ff7a3d',
  cyan: '#66e0d3',
  cyanHot: '#b7fff7',
  violet: '#a58cff',
  violetHot: '#d8ccff',
  green: '#8ee8a1',
  greenHot: '#d6ffd9',
  pink: '#f1a5c5',
  pinkHot: '#ffe1ec',
  blue: '#78aee8',
  blueHot: '#d3e8ff',
  white: '#e9f2f2',
  snow: '#dfeff6',
  glass: '#9fe4e8',
  gold: '#d7b36a',
  blood: '#b3453f',
};

const cache = new Map();

export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.78,
    metalness: opts.metalness ?? 0.18,
    flatShading: true,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: Boolean(opts.transparent),
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite !== false,
    side: opts.side ?? THREE.FrontSide,
  });
  cache.set(key, m);
  return m;
}

export function glass(color, opacity = 0.32) {
  return mat(color, {
    transparent: true,
    opacity,
    roughness: 0.1,
    metalness: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function glow(color, intensity = 1.5) {
  return mat(color, {
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.1,
  });
}

export function floorMat(color = C.concrete) {
  return mat(color, { roughness: 0.92, metalness: 0.08 });
}

export function wallMat(color = C.steelDark) {
  return mat(color, { roughness: 0.82, metalness: 0.25 });
}
