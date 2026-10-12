import * as THREE from 'three';

/** Palette mediterranea low-poly: sabbia, calce, terracotta, verde palma, mare. */
export const P = {
  sand: 0xf0dcb0,
  sandDark: 0xdcbf8d,
  wetSand: 0xc9a878,
  sea: 0x2fa8c9,
  seaDeep: 0x1b7fa4,
  foam: 0xdff4f8,
  cream: 0xf7f1e3,
  white: 0xfffdf6,
  bone: 0xe6dcc6,
  terra: 0xd4784f,
  terraDark: 0xa9563a,
  rose: 0xef9a8c,
  pink: 0xf6b7c3,
  lemon: 0xffd15c,
  coral: 0xef7d6b,
  palm: 0x5fa860,
  palmDark: 0x3f7f4a,
  olive: 0x8aab5b,
  mint: 0x9fd6b5,
  asphalt: 0x5b5f68,
  stone: 0xa9a396,
  stoneDark: 0x7d776c,
  glass: 0x8fc7d8,
  ink: 0x0a0f18,
  night: 0x0d1b2a,
  navy: 0x16304d,
  sun: 0xffe6a8,
  chocolate: 0x7a4a2e,
  gold: 0xffc93c,
};

/**
 * Colore da esadecimale. three (con ColorManagement attivo) converte già
 * da sRGB a lineare: NON bisogna farlo una seconda volta, altrimenti tutta
 * la palette risulta scurita.
 */
export const c = (hex) => new THREE.Color(hex);

/** Materiale condiviso per tutti i props low-poly (un solo draw call per tipo). */
export function propMaterial() {
  return new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
}

/** Vernicia una geometria con un colore pieno (vertex color + alpha 1). */
export function paint(geo, hex) {
  const col = c(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Scurisce/schiariacce una geometria di una fattore (0 = nero, 1 = invariato). */
export function shade(geo, factor) {
  const attr = geo.attributes.color;
  if (!attr) return geo;
  for (let i = 0; i < attr.count; i++) {
    attr.setXYZ(i, attr.getX(i) * factor, attr.getY(i) * factor, attr.getZ(i) * factor);
  }
  attr.needsUpdate = true;
  return geo;
}
