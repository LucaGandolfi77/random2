import * as THREE from 'three';
import { P } from './palette.js';
import { box, cyl, cone, sph, ico, tor, wedge, part, merge, stripedDome, tri } from './geometry.js';

/**
 * Catalogo di Portomarina. Ogni voce è un prop low-poly con:
 *   r      raggio d'ingombro (serve a capire se il buco può mangiarlo)
 *   mass   quanto ingrassa il buco
 *   zone   dove può comparire: town | beach | sea | any
 *   gold   true = evento raro da 500 punti
 */
const D = [];
const def = (o) => (D.push(o), o);

/* ------------------------------------------------------------------ SPIAGGIA */

def({
  id: 'sedia',
  label: 'Sedia sdraio',
  r: 0.52,
  mass: 0.095,
  zone: 'beach',
  count: 150,
  build: () =>
    merge([
      part(box(0.72, 0.07, 0.62), P.cream, { y: 0.28, rx: -0.12 }),
      part(box(0.72, 0.5, 0.07), P.white, { y: 0.52, z: -0.26, rx: 0.5 }),
      part(box(0.07, 0.28, 0.07), P.terra, { x: -0.3, y: 0.14, z: -0.2 }),
      part(box(0.07, 0.28, 0.07), P.terra, { x: 0.3, y: 0.14, z: -0.2 }),
      part(box(0.07, 0.28, 0.07), P.terra, { x: -0.3, y: 0.14, z: 0.22 }),
      part(box(0.07, 0.28, 0.07), P.terra, { x: 0.3, y: 0.14, z: 0.22 }),
    ]),
});

def({
  id: 'ombrellone',
  label: 'Ombrellone',
  r: 1.15,
  mass: 0.247,
  zone: 'beach',
  count: 100,
  build: () =>
    merge([
      part(cyl(0.045, 0.045, 2.1, 6), P.bone, { y: 1.05 }),
      part(stripedDome(1.15, 0.52, 10, P.coral, P.cream, { droop: 0.34 }), P.coral, {
        y: 2.0,
      }),
      part(ico(0.07, 0), P.lemon, { y: 2.6 }),
    ]),
});

def({
  id: 'ombrellone-xl',
  label: 'Ombrellone gigante',
  r: 1.75,
  mass: 0.646,
  zone: 'beach',
  count: 22,
  build: () =>
    merge([
      part(cyl(0.06, 0.06, 2.5, 6), P.bone, { y: 1.25 }),
      part(stripedDome(1.75, 0.8, 12, P.lemon, P.terra, { droop: 0.3 }), P.lemon, {
        y: 2.4,
      }),
      part(box(2.4, 0.08, 2.4), P.cream, { y: 2.42 }),
    ]),
});

def({
  id: 'tavolino',
  label: 'Tavolino',
  r: 0.44,
  mass: 0.076,
  zone: 'beach',
  count: 110,
  build: () =>
    merge([
      part(cyl(0.42, 0.42, 0.06, 8), P.white, { y: 0.44 }),
      part(cyl(0.05, 0.05, 0.42, 6), P.terraDark, { y: 0.22 }),
      part(cyl(0.24, 0.24, 0.04, 6), P.terraDark, { y: 0.02 }),
      part(cyl(0.07, 0.09, 0.16, 6), P.coral, { x: 0.14, y: 0.56, z: 0.1 }),
      part(cyl(0.06, 0.06, 0.02, 6), P.lemon, { x: -0.16, y: 0.47, z: -0.12 }),
    ]),
});

def({
  id: 'gelato',
  label: 'Gelato',
  r: 0.28,
  mass: 0.057,
  zone: 'beach',
  count: 130,
  build: () =>
    merge([
      part(cone(0.18, 0.34, 6), P.sandDark, { y: 0.17 }),
      part(ico(0.17, 0), P.rose, { y: 0.44 }),
      part(ico(0.13, 0), P.lemon, { y: 0.57 }),
      part(ico(0.08, 0), P.mint, { y: 0.66 }),
    ]),
});

def({
  id: 'gelataio',
  label: 'Gelataio',
  r: 0.8,
  mass: 0.494,
  zone: 'beach',
  count: 26,
  build: () =>
    merge([
      part(box(1.3, 0.9, 0.8), P.cream, { y: 0.45 }),
      part(box(1.36, 0.14, 0.9), P.terra, { y: 0.94 }),
      part(box(1.4, 0.5, 0.2), P.coral, { y: 1.2, z: 0.3, rx: -0.35 }),
      part(box(1.4, 0.08, 0.62), P.lemon, { y: 0.78, z: 0.28 }),
      part(cyl(0.09, 0.09, 0.5, 6), P.terraDark, { x: 0.4, y: 1.15 }),
      part(cyl(0.11, 0.11, 0.1, 6), P.pink, { x: 0.4, y: 1.42 }),
      part(cyl(0.28, 0.28, 0.05, 8), P.white, { y: 0.3, z: 0.55, rx: Math.PI / 2 }),
      part(tor(0.28, 0.05, 4, 10), P.terraDark, { y: 0.3, z: 0.58 }),
    ]),
});

def({
  id: 'tavola',
  label: 'Tavola da surf',
  r: 0.82,
  mass: 0.19,
  zone: 'beach',
  count: 40,
  build: () =>
    merge([
      part(box(0.34, 0.9, 0.08), P.coral, { y: 0.06, rz: 0.06, rx: 0.08 }),
      part(box(0.34, 0.9, 0.06), P.cream, { y: 0.15, z: 0.06, rz: 0.06, rx: 0.08 }),
      part(cyl(0.015, 0.015, 0.7, 4), P.bone, { y: 0.5, z: -0.42, rx: 0.2 }),
    ]),
});

/* --------------------------------------------------------------------- MARE */

def({
  id: 'barca',
  label: 'Barca',
  r: 1.5,
  mass: 1.33,
  zone: 'sea',
  count: 40,
  float: 0.35,
  build: () =>
    merge([
      part(box(2.6, 0.55, 1.1), P.cream, { y: 0.2 }),
      part(box(2.9, 0.16, 0.5), P.white, { y: 0.42 }),
      part(cone(0.55, 0.6, 4), P.white, { x: 1.55, y: 0.24, rz: -Math.PI / 2 }),
      part(cone(0.55, 0.6, 4), P.white, { x: -1.55, y: 0.24, rz: Math.PI / 2 }),
      part(box(0.7, 0.34, 0.8), P.sea, { x: -0.4, y: 0.5 }),
      part(cyl(0.04, 0.04, 1.1, 5), P.bone, { x: 0.2, y: 1.0 }),
      part(box(0.5, 0.34, 0.03), P.coral, { x: 0.45, y: 1.3 }),
    ]),
});

def({
  id: 'veliero',
  label: 'Veliero',
  r: 2.3,
  mass: 3.23,
  zone: 'sea',
  count: 14,
  float: 0.4,
  build: () =>
    merge([
      part(box(4.2, 0.7, 1.3), P.white, { y: 0.3 }),
      part(box(4.4, 0.18, 1.5), P.terra, { y: 0.62 }),
      part(cone(0.7, 0.8, 4), P.white, { x: 2.35, y: 0.3, rz: -Math.PI / 2 }),
      part(cone(0.7, 0.8, 4), P.white, { x: -2.35, y: 0.3, rz: Math.PI / 2 }),
      part(cyl(0.07, 0.09, 4.6, 6), P.terraDark, { y: 2.6 }),
      part(tri([0.06, 0.4, 0], [0.06, 4.5, 0], [1.9, 0.6, 0]), P.white, { y: 0 }),
      part(tri([0.06, 4.5, 0], [0.06, 0.4, 0], [-1.9, 0.6, 0]), P.cream, { y: 0 }),
      part(box(0.9, 0.6, 0.9), P.bone, { y: 0.9 }),
    ]),
});

def({
  id: 'gabbiano',
  label: 'Gabbiano',
  r: 0.42,
  mass: 0.038,
  zone: 'beach',
  count: 54,
  build: () =>
    merge([
      part(sph(0.18, 6, 4), P.white, { y: 0.34 }),
      part(box(0.5, 0.04, 0.18), P.white, { x: 0.3, y: 0.36, rz: 0.25 }),
      part(box(0.5, 0.04, 0.18), P.white, { x: -0.3, y: 0.36, rz: -0.25 }),
      part(ico(0.11, 0), P.white, { x: 0.24, y: 0.42 }),
      part(cone(0.05, 0.18, 4), P.lemon, { x: 0.4, y: 0.4, rz: -Math.PI / 2 }),
      part(cyl(0.03, 0.03, 0.22, 4), P.lemon, { x: -0.06, y: 0.22 }),
    ]),
});

def({
  id: 'boa',
  label: 'Boa',
  r: 0.42,
  mass: 0.057,
  zone: 'sea',
  count: 40,
  float: 0.1,
  build: () =>
    merge([
      part(sph(0.3, 8, 5), P.coral, { y: 0.12 }),
      part(cyl(0.08, 0.1, 0.3, 6), P.white, { y: 0.3 }),
    ]),
});

def({
  id: 'faro',
  label: 'Faro',
  r: 1.9,
  mass: 4.94,
  zone: 'sea',
  count: 3,
  build: () =>
    merge([
      part(cyl(1.0, 1.5, 6.5, 10), P.cream, { y: 3.25 }),
      part(cyl(1.05, 1.05, 0.7, 10), P.terra, { y: 1.1 }),
      part(cyl(1.05, 1.05, 0.7, 10), P.terra, { y: 3.1 }),
      part(cyl(1.25, 1.25, 0.3, 10), P.terraDark, { y: 6.6 }),
      part(cyl(0.85, 0.85, 0.9, 8), P.glass, { y: 7.1 }),
      part(cone(1.3, 1.1, 8), P.terraDark, { y: 8.0 }),
    ]),
});

def({
  id: 'gru',
  label: 'Gru del porto',
  r: 2.0,
  mass: 3.61,
  zone: 'sea',
  count: 6,
  build: () =>
    merge([
      part(box(0.5, 7, 0.5), P.lemon, { y: 3.5 }),
      part(box(0.5, 7, 0.5), P.lemon, { y: 3.5, x: 3.2, z: 1.8 }),
      part(box(0.5, 7, 0.5), P.lemon, { y: 3.5, z: 3.6 }),
      part(box(0.5, 7, 0.5), P.lemon, { y: 3.5, x: -3.2, z: 1.8 }),
      part(box(11, 0.5, 0.5), P.terra, { y: 7.1, z: 1.8 }),
      part(box(0.4, 0.4, 7), P.terra, { y: 6.7, z: 3 }),
      part(cyl(0.04, 0.04, 2.6, 4), P.stoneDark, { x: 4.4, y: 5.6, z: 1.8 }),
      part(box(0.8, 0.8, 0.8), P.terraDark, { x: 4.4, y: 4.1, z: 1.8 }),
    ]),
});

/* -------------------------------------------------------------------- CITTÀ */

def({
  id: 'palazzo',
  label: 'Palazzo',
  r: 2.7,
  mass: 6.46,
  zone: 'town',
  count: 32,
  scaleVar: 0.22,
  build: () => {
    const walls = P.cream;
    const win = [];
    for (let f = 0; f < 3; f++) {
      for (let i = 0; i < 4; i++) {
        win.push(part(box(0.42, 0.6, 0.06), P.glass, { x: -1.05 + i * 0.7, y: 0.9 + f * 1.3, z: 1.61 }));
        win.push(part(box(0.42, 0.6, 0.06), P.glass, { x: -1.05 + i * 0.7, y: 0.9 + f * 1.3, z: -1.61 }));
      }
      win.push(part(box(0.06, 0.6, 0.42), P.glass, { x: 1.61, y: 0.9 + f * 1.3, z: -1.05 + i0(f) }));
      win.push(part(box(0.06, 0.6, 0.42), P.glass, { x: -1.61, y: 0.9 + f * 1.3, z: -1.05 + i0(f) }));
    }
    return merge([
      part(box(3.4, 4.3, 3.4), walls, { y: 2.15 }),
      part(box(3.6, 0.22, 3.6), P.bone, { y: 4.2 }),
      part(wedge(3.9, 1.15, 3.9), P.terra, { y: 4.3, ry: Math.PI / 4 }),
      part(box(0.8, 1.3, 0.1), P.terraDark, { y: 0.65, z: 1.73 }),
      part(box(1.6, 0.16, 0.5), P.stone, { y: 2.3, z: 1.85 }),
      ...win,
    ]);
  },
});

function i0(f) {
  return (f % 3) * 0.7 - 0.7;
}

def({
  id: 'palazzo-alto',
  label: 'Palazzo alto',
  r: 2.2,
  mass: 5.51,
  zone: 'town',
  count: 24,
  scaleVar: 0.18,
  build: () => {
    const win = [];
    for (let f = 0; f < 5; f++) {
      for (let i = 0; i < 3; i++) {
        win.push(part(box(0.4, 0.55, 0.06), P.glass, { x: -0.8 + i * 0.8, y: 1 + f * 1.15, z: 1.41 }));
        win.push(part(box(0.4, 0.55, 0.06), P.glass, { x: -0.8 + i * 0.8, y: 1 + f * 1.15, z: -1.41 }));
      }
    }
    return merge([
      part(box(2.9, 6.0, 2.9), P.rose, { y: 3.0 }),
      part(box(3.2, 0.3, 3.2), P.cream, { y: 6.1 }),
      part(box(0.5, 0.9, 0.5), P.terraDark, { x: 0.8, y: 6.6, z: 0.6 }),
      part(box(0.8, 1.2, 0.1), P.terraDark, { y: 0.6, z: 1.47 }),
      part(box(2.6, 0.14, 0.4), P.stone, { y: 2.4, z: 1.6 }),
      part(box(2.6, 0.14, 0.4), P.stone, { y: 4.7, z: 1.6 }),
      ...win,
    ]);
  },
});

def({
  id: 'chiesa',
  label: 'Chiesa',
  r: 2.4,
  mass: 5.7,
  zone: 'town',
  count: 9,
  build: () =>
    merge([
      part(box(3.6, 2.6, 2.4), P.cream, { y: 1.3 }),
      part(box(3.8, 0.25, 2.6), P.bone, { y: 2.7 }),
      part(cyl(1.15, 1.15, 0.5, 10), P.cream, { x: 0.9, y: 3.05 }),
      part(stripedDome(1.15, 0.95, 10, P.terra, P.terraDark, { droop: 0.02 }), P.terra, {
        x: 0.9,
        y: 3.3,
      }),
      part(box(1.4, 5.2, 1.4), P.cream, { x: -1.6, y: 2.6 }),
      part(box(1.7, 0.3, 1.7), P.terraDark, { x: -1.6, y: 5.3 }),
      part(cone(0.5, 1.5, 4), P.terraDark, { x: -1.6, y: 6.2, ry: Math.PI / 4 }),
      part(cyl(0.02, 0.02, 0.8, 4), P.lemon, { x: -1.6, y: 6.4 }),
      part(box(0.5, 0.7, 0.06), P.glass, { x: -1.6, y: 4.5, z: 0.72 }),
      part(cone(0.65, 1.4, 10), P.cream, { y: 4.4, rz: Math.PI / 2 }),
      part(box(0.9, 0.06, 0.06), P.glass, { x: 0.9, y: 4.55 }),
    ]),
});

def({
  id: 'fontana',
  label: 'Fontana',
  r: 1.35,
  mass: 2.09,
  zone: 'town',
  count: 8,
  build: () =>
    merge([
      part(cyl(1.3, 1.4, 0.5, 12), P.stone, { y: 0.25 }),
      part(cyl(1.12, 1.12, 0.06, 12), P.sea, { y: 0.52 }),
      part(cyl(0.22, 0.3, 1.1, 8), P.stone, { y: 0.8 }),
      part(cyl(0.6, 0.2, 0.16, 8), P.stoneDark, { y: 1.35 }),
      part(sph(0.2, 6, 5), P.glass, { y: 1.6 }),
    ]),
});

def({
  id: 'gazebo',
  label: 'Gazebo del mercato',
  r: 1.25,
  mass: 1.045,
  zone: 'town',
  count: 22,
  build: () =>
    merge([
      ...[-0.9, 0.9].flatMap((x) =>
        [-0.9, 0.9].map((z) => part(box(0.1, 1.9, 0.1), P.bone, { x, z, y: 0.95 }))
      ),
      part(stripedDome(1.35, 0.6, 8, P.olive, P.cream), P.olive, { y: 1.9 }),
      part(box(2.1, 0.1, 1.5), P.terraDark, { y: 0.78 }),
      part(box(0.5, 0.35, 0.5), P.lemon, { x: 0.4, y: 1.0 }),
      part(box(0.5, 0.35, 0.5), P.coral, { x: -0.4, y: 1.0 }),
    ]),
});

def({
  id: 'chiosco',
  label: 'Chiosco dei giornali',
  r: 1.15,
  mass: 1.33,
  zone: 'town',
  count: 14,
  build: () =>
    merge([
      part(cyl(1.0, 1.05, 1.7, 8), P.mint, { y: 0.85 }),
      part(cyl(1.15, 1.15, 0.16, 8), P.cream, { y: 1.78 }),
      part(cyl(0.9, 1.0, 0.4, 8), P.cream, { y: 2.05 }),
      part(cyl(0.6, 0.6, 0.14, 8), P.terraDark, { y: 2.3 }),
      part(cyl(0.05, 0.05, 0.7, 5), P.terraDark, { x: 0.8, y: 2.5, rz: -0.3 }),
      part(box(0.5, 0.3, 0.04), P.coral, { x: 1.02, y: 2.78 }),
      part(box(0.55, 0.45, 0.06), P.lemon, { y: 0.95, z: 0.95 }),
    ]),
});

def({
  id: 'lampione',
  label: 'Lampione',
  r: 0.3,
  mass: 0.133,
  zone: 'any',
  count: 120,
  build: () =>
    merge([
      part(cyl(0.1, 0.14, 0.3, 6), P.stoneDark, { y: 0.15 }),
      part(cyl(0.06, 0.08, 2.6, 6), P.stoneDark, { y: 1.5 }),
      part(box(0.5, 0.12, 0.12), P.stoneDark, { y: 2.8 }),
      part(cone(0.26, 0.3, 6), P.stoneDark, { x: 0.2, y: 2.66, rz: Math.PI }),
      part(sph(0.17, 6, 5), P.sun, { x: 0.2, y: 2.42 }),
    ]),
});

def({
  id: 'cestino',
  label: 'Cestino',
  r: 0.3,
  mass: 0.057,
  zone: 'any',
  count: 90,
  build: () =>
    merge([
      part(cyl(0.26, 0.22, 0.62, 8), P.palmDark, { y: 0.31 }),
      part(tor(0.27, 0.04, 4, 10), P.stoneDark, { y: 0.62, rx: Math.PI / 2 }),
      part(cyl(0.3, 0.3, 0.06, 8), P.stoneDark, { y: 0.66 }),
    ]),
});

def({
  id: 'panchina',
  label: 'Panchina',
  r: 0.62,
  mass: 0.152,
  zone: 'any',
  count: 50,
  build: () =>
    merge([
      part(box(1.3, 0.08, 0.42), P.terra, { y: 0.42 }),
      part(box(1.3, 0.42, 0.08), P.terra, { y: 0.66, z: -0.17, rx: 0.22 }),
      part(box(0.08, 0.42, 0.42), P.stoneDark, { x: -0.55, y: 0.21 }),
      part(box(0.08, 0.42, 0.42), P.stoneDark, { x: 0.55, y: 0.21 }),
    ]),
});

def({
  id: 'vaso',
  label: 'Vaso di fiori',
  r: 0.36,
  mass: 0.095,
  zone: 'any',
  count: 100,
  build: () =>
    merge([
      part(cyl(0.3, 0.22, 0.36, 8), P.terra, { y: 0.18 }),
      part(ico(0.26, 0), P.palm, { y: 0.5 }),
      part(ico(0.09, 0), P.coral, { x: 0.14, y: 0.66 }),
      part(ico(0.09, 0), P.lemon, { x: -0.15, y: 0.62, z: 0.1 }),
    ]),
});

def({
  id: 'persona',
  label: 'Turista',
  r: 0.34,
  mass: 0.114,
  zone: 'any',
  count: 170,
  skin: [P.sand, P.terra, P.chocolate, P.cream],
  build: () =>
    merge([
      part(cyl(0.14, 0.2, 0.62, 6), P.coral, { y: 0.78 }),
      part(box(0.1, 0.5, 0.12), P.coral, { x: 0.24, y: 0.86, rz: 0.12 }),
      part(box(0.1, 0.5, 0.12), P.coral, { x: -0.24, y: 0.86, rz: -0.12 }),
      part(box(0.12, 0.44, 0.14), P.glass, { x: -0.09, y: 0.24 }),
      part(box(0.12, 0.44, 0.14), P.glass, { x: 0.09, y: 0.24 }),
      part(ico(0.17, 0), P.sand, { y: 1.22 }),
      part(cyl(0.02, 0.26, 0.16, 7), P.lemon, { y: 1.34 }),
      part(cyl(0.27, 0.27, 0.03, 7), P.terra, { y: 1.28 }),
    ]),
});

def({
  id: 'vespa',
  label: 'Vespa',
  r: 0.72,
  mass: 0.418,
  zone: 'town',
  count: 36,
  build: () =>
    merge([
      part(cyl(0.2, 0.2, 0.1, 8), P.ink, { y: 0.2, x: 0.42, rz: Math.PI / 2 }),
      part(cyl(0.2, 0.2, 0.1, 8), P.ink, { y: 0.2, x: -0.42, rz: Math.PI / 2 }),
      part(box(0.95, 0.36, 0.42), P.cream, { y: 0.42 }),
      part(sph(0.3, 8, 6), P.cream, { x: -0.16, y: 0.6, sz: 0.8 }),
      part(box(0.4, 0.1, 0.36), P.ink, { x: -0.42, y: 0.72 }),
      part(cyl(0.04, 0.04, 0.55, 5), P.stoneDark, { x: 0.55, y: 0.85, rz: 0.3 }),
      part(box(0.42, 0.05, 0.05), P.stoneDark, { x: 0.5, y: 1.1 }),
      part(cyl(0.09, 0.09, 0.16, 6), P.sun, { x: 0.46, y: 0.72, rz: Math.PI / 2 }),
      part(ico(0.05, 0), P.glass, { x: 0.66, y: 0.95 }),
    ]),
});

def({
  id: 'auto',
  label: 'Fiat 500',
  r: 1.25,
  mass: 1.045,
  zone: 'road',
  count: 36,
  build: () =>
    merge([
      ...[-0.62, 0.62].flatMap((z) =>
        [-0.5, 0.5].map((x) => part(cyl(0.28, 0.28, 0.16, 8), P.ink, { x, z, y: 0.28, rz: Math.PI / 2 }))
      ),
      part(box(1.9, 0.5, 1.15), P.lemon, { y: 0.55 }),
      part(box(1.0, 0.48, 1.05), P.cream, { x: -0.15, y: 1.0 }),
      part(box(1.02, 0.34, 1.08), P.glass, { x: -0.15, y: 1.02 }),
      part(box(0.3, 0.1, 1.05), P.cream, { x: 0.72, y: 0.72 }),
      part(cyl(0.09, 0.09, 0.08, 6), P.sun, { x: 0.93, y: 0.62, z: 0.36, rz: Math.PI / 2 }),
      part(cyl(0.09, 0.09, 0.08, 6), P.sun, { x: 0.93, y: 0.62, z: -0.36, rz: Math.PI / 2 }),
      part(cyl(0.07, 0.07, 0.08, 6), P.coral, { x: -0.93, y: 0.62, z: 0.36, rz: Math.PI / 2 }),
    ]),
});

def({
  id: 'bici',
  label: 'Bicicletta',
  r: 0.6,
  mass: 0.228,
  zone: 'any',
  count: 36,
  build: () =>
    merge([
      part(tor(0.28, 0.04, 4, 10), P.ink, { x: 0.42, y: 0.3, ry: Math.PI / 2 }),
      part(tor(0.28, 0.04, 4, 10), P.ink, { x: -0.42, y: 0.3, ry: Math.PI / 2 }),
      part(cyl(0.03, 0.03, 0.75, 4), P.sea, { y: 0.5, rx: Math.PI / 2, rz: 0.3 }),
      part(box(0.4, 0.04, 0.04), P.sea, { y: 0.68 }),
      part(box(0.3, 0.04, 0.04), P.ink, { x: -0.4, y: 0.75 }),
      part(box(0.06, 0.3, 0.2), P.ink, { x: -0.05, y: 0.66 }),
    ]),
});

def({
  id: 'palma',
  label: 'Palma',
  r: 0.72,
  mass: 0.684,
  zone: 'any',
  count: 70,
  build: () => {
    const segs = [];
    for (let i = 0; i < 4; i++) {
      segs.push(
        part(cyl(0.19 - i * 0.028, 0.22 - i * 0.028, 1.05, 6), i % 2 ? P.terra : P.terraDark, {
          y: 0.52 + i * 1.0,
          x: i * 0.075,
          z: i * 0.05,
          rz: -0.05,
        })
      );
    }
    const top = [2.9, 0.3, 0.2];
    const fronds = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      fronds.push(
        part(cone(0.3, 1.9, 4), i % 2 ? P.palm : P.palmDark, {
          x: Math.cos(a) * 0.85,
          y: top[1] + 0.15,
          z: Math.sin(a) * 0.85,
          rx: Math.PI / 2 - 0.55,
          ry: -a,
        })
      );
    }
    return merge([
      ...segs,
      ...fronds,
      part(ico(0.18, 0), P.palmDark, { x: 0.28, y: top[1] }),
      part(ico(0.16, 0), P.palmDark, { x: -0.1, y: top[1] - 0.1, z: 0.2 }),
    ]);
  },
});

def({
  id: 'pino',
  label: 'Pino',
  r: 0.8,
  mass: 0.798,
  zone: 'any',
  count: 44,
  build: () =>
    merge([
      part(cyl(0.14, 0.2, 0.7, 6), P.chocolate, { y: 0.35 }),
      part(cone(1.0, 1.5, 7), P.palmDark, { y: 1.35 }),
      part(cone(0.78, 1.3, 7), P.palm, { y: 2.2 }),
      part(cone(0.5, 1.1, 6), P.palmDark, { y: 2.9 }),
    ]),
});

def({
  id: 'albero',
  label: 'Albero',
  r: 0.85,
  mass: 0.874,
  zone: 'any',
  count: 40,
  build: () =>
    merge([
      part(cyl(0.16, 0.24, 1.1, 6), P.chocolate, { y: 0.55 }),
      part(ico(0.85, 0), P.olive, { y: 1.7 }),
      part(ico(0.5, 0), P.palm, { x: 0.5, y: 2.0 }),
      part(ico(0.45, 0), P.mint, { x: -0.45, y: 1.5 }),
    ]),
});

def({
  id: 'paracarro',
  label: 'Paracarro',
  r: 0.3,
  mass: 0.076,
  zone: 'any',
  count: 60,
  build: () =>
    merge([
      part(cyl(0.14, 0.18, 0.8, 6), P.stone, { y: 0.4 }),
      part(ico(0.14, 0), P.stoneDark, { y: 0.84 }),
    ]),
});

def({
  id: 'secchio',
  label: 'Secchio',
  r: 0.26,
  mass: 0.038,
  zone: 'beach',
  count: 60,
  build: () =>
    merge([
      part(cyl(0.24, 0.17, 0.3, 8), P.coral, { y: 0.15 }),
      part(tor(0.24, 0.03, 4, 8), P.cream, { y: 0.3, rx: Math.PI / 2 }),
    ]),
});

/* ---------------------------------------------------------------- ORO (500) */

def({
  id: 'oro-gelato',
  label: 'Gelato gigante',
  r: 1.6,
  mass: 2.2,
  zone: 'any',
  count: 1,
  gold: true,
  rarity: 4,
  build: () =>
    merge([
      part(cone(0.95, 1.5, 8), P.sandDark, { y: 0.75 }),
      part(stripedDome(0.95, 0.8, 8, P.lemon, P.gold), P.lemon, { y: 1.5 }),
      part(tor(1.05, 0.07, 5, 16), P.gold, { y: 1.48, rx: Math.PI / 2 }),
      part(ico(0.22, 0), P.gold, { y: 2.5 }),
    ]),
});

def({
  id: 'oro-statua',
  label: 'Statua del Nettuno',
  r: 2.3,
  mass: 3.2,
  zone: 'any',
  count: 1,
  gold: true,
  rarity: 3,
  build: () =>
    merge([
      part(box(1.5, 0.4, 1.5), P.stone, { y: 0.2 }),
      part(box(1.1, 0.5, 1.1), P.stoneDark, { y: 0.62 }),
      part(cyl(0.42, 0.55, 1.9, 8), P.gold, { y: 1.8 }),
      part(ico(0.34, 0), P.gold, { y: 3.0 }),
      part(box(1.5, 0.14, 0.14), P.gold, { x: 0.7, y: 2.6, rz: 0.4 }),
      part(cone(0.2, 0.9, 4), P.gold, { x: 0.95, y: 3.15, rz: -0.7 }),
      part(cone(0.2, 1.3, 4), P.gold, { x: -0.6, y: 3.3, rz: 0.5 }),
    ]),
});

def({
  id: 'oro-bus',
  label: 'Bus turistico',
  r: 2.7,
  mass: 3.6,
  zone: 'any',
  count: 1,
  gold: true,
  rarity: 2,
  build: () =>
    merge([
      ...[-1.7, 1.7].flatMap((x) =>
        [-0.9, 0.9].map((z) => part(cyl(0.4, 0.4, 0.22, 8), P.ink, { x, z, y: 0.4, rz: Math.PI / 2 }))
      ),
      part(box(4.4, 1.7, 2.0), P.gold, { y: 1.25 }),
      part(box(4.5, 0.18, 2.05), P.cream, { y: 2.1 }),
      part(box(0.1, 0.8, 1.9), P.glass, { x: 2.24, y: 1.5 }),
      part(box(3.6, 0.7, 0.1), P.glass, { x: -0.2, y: 1.55, z: 1.02 }),
      part(box(3.6, 0.7, 0.1), P.glass, { x: -0.2, y: 1.55, z: -1.02 }),
      part(box(4.5, 0.4, 0.1), P.coral, { y: 0.75, z: 1.03 }),
      part(cyl(0.13, 0.13, 0.1, 8), P.sun, { x: 2.3, y: 0.7, z: 0.7, rz: Math.PI / 2 }),
      part(cyl(0.13, 0.13, 0.1, 8), P.sun, { x: 2.3, y: 0.7, z: -0.7, rz: Math.PI / 2 }),
    ]),
});

/* -------------------------------------------------------------------- INDEX */

export const PROP_DEFS = D;
export const pointsFor = (d) => (d.gold ? 500 : Math.max(1, Math.round(1 + d.mass * 22)));
