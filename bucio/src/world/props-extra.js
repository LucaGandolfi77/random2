import { P } from './palette.js';
import { box, cyl, cone, sph, ico, tor, wedge, part, merge, stripedDome, tri } from './geometry.js';

/**
 * Oggetti delle altre ambientazioni. Ogni voce porta con sé il tema (o i
 * temi) in cui può comparire: `propworld` filtra con questo campo.
 * zone: town | beach (campo aperto) | sea | road | any
 */
const D = [];
const def = (o) => (D.push(o), o);

/* ========================================================== POLVERE ROSSA */

def({
  id: 'cactus',
  label: 'Cactus',
  r: 0.62,
  mass: 0.24,
  zone: 'any',
  count: 90,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cyl(0.22, 0.26, 1.7, 7), P.palmDark, { y: 0.85 }),
      part(cyl(0.14, 0.16, 0.7, 6), P.palmDark, { x: 0.35, y: 0.85, rz: -Math.PI / 2 }),
      part(cyl(0.14, 0.16, 0.8, 6), P.palmDark, { x: 0.62, y: 1.2 }),
      part(cyl(0.12, 0.14, 0.6, 6), P.palmDark, { x: -0.32, y: 1.05, rz: Math.PI / 2 }),
      part(cyl(0.14, 0.16, 0.9, 6), P.palmDark, { x: -0.55, y: 1.4 }),
      part(ico(0.2, 0), P.palm, { y: 1.78 }),
      part(ico(0.06, 0), P.lemon, { y: 1.2, z: 0.2 }),
    ]),
});

def({
  id: 'cactus-grande',
  label: 'Cactus gigante',
  r: 1.15,
  mass: 0.66,
  zone: 'any',
  count: 22,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cyl(0.34, 0.4, 2.9, 8), P.palmDark, { y: 1.45 }),
      part(cyl(0.2, 0.22, 1.1, 6), P.palm, { x: 0.62, y: 1.6, rz: -Math.PI / 2 }),
      part(cyl(0.2, 0.22, 1.4, 6), P.palm, { x: 0.95, y: 2.2 }),
      part(cyl(0.17, 0.19, 0.9, 6), P.palm, { x: -0.55, y: 2.5, rz: Math.PI / 2 }),
      part(cyl(0.17, 0.19, 1.0, 6), P.palm, { x: -0.8, y: 2.95 }),
      part(ico(0.3, 0), P.olive, { x: -0.95, y: 3.1 }),
      part(ico(0.14, 0), P.lemon, { x: 0.95, y: 2.9 }),
    ]),
});

def({
  id: 'barile',
  label: 'Barile',
  r: 0.38,
  mass: 0.08,
  zone: 'any',
  count: 60,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cyl(0.34, 0.34, 0.86, 9), P.terra, { y: 0.43 }),
      part(tor(0.35, 0.045, 4, 12), P.terraDark, { y: 0.2, rx: Math.PI / 2 }),
      part(tor(0.35, 0.045, 4, 12), P.terraDark, { y: 0.66, rx: Math.PI / 2 }),
      part(cyl(0.36, 0.36, 0.07, 9), P.terraDark, { y: 0.87 }),
    ]),
});

def({
  id: 'roccia',
  label: 'Roccia',
  r: 0.95,
  mass: 0.5,
  zone: 'any',
  count: 70,
  themes: ['polvererosa', 'nevegal'],
  build: () =>
    merge([
      part(ico(0.8, 0), P.stone, { y: 0.42, sy: 0.75 }),
      part(ico(0.45, 0), P.stoneDark, { x: 0.55, y: 0.28, z: 0.2 }),
      part(ico(0.3, 0), P.stone, { x: -0.45, y: 0.22, z: -0.25 }),
    ]),
});

def({
  id: 'mesa',
  label: 'Roccia enorme',
  r: 2.1,
  mass: 1.8,
  zone: 'any',
  count: 18,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cyl(1.6, 2.1, 1.8, 7), 0xa85436, { y: 0.9 }),
      part(cyl(1.72, 1.6, 0.4, 7), 0xd07a48, { y: 1.95 }),
      part(cyl(1.35, 1.55, 0.3, 7), 0xc2703f, { y: 2.25 }),
      part(ico(0.7, 0), 0xb45f38, { x: 1.2, y: 0.5, z: 0.5 }),
    ]),
});

def({
  id: 'tumbleweed',
  label: 'Rottame',
  r: 0.55,
  mass: 0.06,
  zone: 'any',
  count: 40,
  themes: ['polvererosa'],
  build: () => {
    const sticks = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI;
      sticks.push(
        part(box(0.06, 0.06, 0.9), P.olive, { y: 0.45, rx: 0.5, ry: a })
      );
    }
    return merge(sticks);
  },
});

def({
  id: 'cowboy-hat',
  label: 'Cappello da cowboy',
  r: 0.42,
  mass: 0.05,
  zone: 'any',
  count: 36,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cyl(0.34, 0.34, 0.05, 10), P.chocolate, { y: 0.24 }),
      part(cyl(0.26, 0.22, 0.04, 10), P.sand, { y: 0.22 }),
      part(cyl(0.22, 0.3, 0.28, 10), P.chocolate, { y: 0.1 }),
      part(cyl(0.23, 0.23, 0.07, 10), 0x2a1a10, { y: 0.06 }),
    ]),
});

def({
  id: 'cowboy',
  label: 'Cowboy',
  r: 0.38,
  mass: 0.08,
  zone: 'any',
  count: 40,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cyl(0.14, 0.19, 0.6, 6), 0x3f5a7a, { y: 0.76 }),
      part(box(0.32, 0.06, 0.32), P.chocolate, { y: 1.0 }),
      part(cyl(0.27, 0.27, 0.04, 10), P.chocolate, { y: 0.99 }),
      part(cyl(0.2, 0.26, 0.26, 8), P.chocolate, { y: 1.1 }),
      part(ico(0.16, 0), P.sand, { y: 1.32 }),
      part(box(0.1, 0.42, 0.12), 0x3f5a7a, { x: 0.22, y: 0.82, rz: 0.1 }),
      part(box(0.1, 0.42, 0.12), 0x3f5a7a, { x: -0.22, y: 0.82, rz: -0.1 }),
      part(box(0.11, 0.4, 0.13), 0x2a3a4a, { x: -0.08, y: 0.22 }),
      part(box(0.11, 0.4, 0.13), 0x2a3a4a, { x: 0.08, y: 0.22 }),
    ]),
});

def({
  id: 'cavallo',
  label: 'Cavallo',
  r: 1.05,
  mass: 0.85,
  zone: 'any',
  count: 16,
  themes: ['polvererosa'],
  build: () =>
    merge([
      ...[-0.55, 0.55].flatMap((z) =>
        [-0.5, 0.5].map((x) => part(box(0.1, 0.8, 0.1), P.chocolate, { x, z, y: 0.4 }))
      ),
      part(box(1.25, 0.55, 0.5), 0x6b4a2e, { y: 1.0 }),
      part(box(0.95, 0.3, 0.42), 0x7d5834, { y: 1.32 }),
      part(cyl(0.09, 0.12, 0.62, 6), 0x6b4a2e, { x: 0.62, y: 1.3, rz: -0.55 }),
      part(box(0.4, 0.22, 0.24), 0x6b4a2e, { x: 0.85, y: 1.52 }),
      part(tor(0.09, 0.03, 4, 6), P.ink, { x: 0.78, y: 1.24 }),
    ]),
});

def({
  id: 'carrozza',
  label: 'Carrozza',
  r: 1.4,
  mass: 0.95,
  zone: 'any',
  count: 12,
  themes: ['polvererosa'],
  build: () =>
    merge([
      ...[-0.8, 0.8].map((z) =>
        part(tor(0.45, 0.07, 4, 12), P.chocolate, { z, y: 0.45, ry: Math.PI / 2 })
      ),
      part(box(2.1, 0.2, 1.3), P.terra, { y: 0.7 }),
      part(box(2.1, 0.45, 0.12), P.terra, { y: 0.95, z: -0.6 }),
      part(box(2.1, 0.45, 0.12), P.terra, { y: 0.95, z: 0.6 }),
      part(box(0.12, 0.45, 1.3), P.terra, { y: 0.95, x: 1.0 }),
      part(box(0.1, 0.5, 0.1), P.terraDark, { x: -1.2, y: 1.1 }),
      part(box(1.2, 0.08, 0.08), P.terraDark, { x: -0.75, y: 1.3 }),
    ]),
});

def({
  id: 'saloon',
  label: 'Saloon',
  r: 2.4,
  mass: 3.1,
  zone: 'town',
  count: 9,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(box(4.2, 2.6, 3.4), P.terra, { y: 1.3 }),
      part(box(4.4, 0.2, 3.6), P.terraDark, { y: 2.7 }),
      part(wedge(4.6, 1.0, 4.0), P.terraDark, { y: 2.8, ry: Math.PI / 4 }),
      part(box(4.6, 0.2, 1.6), P.chocolate, { y: 2.5, z: 2.2 }),
      ...[-1.6, -0.5, 0.5, 1.6].map((x) => part(box(0.14, 2.3, 0.14), P.chocolate, { x, z: 2.6, y: 1.15 })),
      part(box(4.2, 0.1, 1.2), P.chocolate, { y: 0.06, z: 2.3 }),
      part(box(1.0, 1.9, 0.12), P.ink, { y: 0.95, z: 1.75 }),
      part(box(0.8, 0.5, 0.1), P.lemon, { y: 2.05, z: 1.8 }),
      part(box(4.0, 0.9, 0.1), P.sand, { y: 1.6, z: -1.75 }),
    ]),
});

def({
  id: 'tepee',
  label: 'Tepee',
  r: 1.3,
  mass: 0.8,
  zone: 'any',
  count: 10,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cone(1.25, 2.4, 9), 0xdccbb0, { y: 1.2 }),
      part(cone(0.28, 0.6, 6), P.chocolate, { y: 2.5 }),
      part(box(0.5, 0.9, 0.1), P.ink, { y: 0.45, z: 0.95 }),
      part(box(1.9, 0.06, 0.06), 0xb45f38, { y: 1.3, z: 0.7 }),
      part(box(1.9, 0.06, 0.06), 0x4a6f8a, { y: 1.05, z: 0.62 }),
    ]),
});

def({
  id: 'pozzo',
  label: 'Pozzo',
  r: 0.85,
  mass: 0.35,
  zone: 'any',
  count: 20,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(cyl(0.7, 0.78, 0.8, 9), P.stone, { y: 0.4 }),
      part(cyl(0.58, 0.58, 0.06, 9), P.ink, { y: 0.8 }),
      part(box(0.1, 1.5, 0.1), P.chocolate, { x: -0.6, y: 1.1 }),
      part(box(0.1, 1.5, 0.1), P.chocolate, { x: 0.6, y: 1.1 }),
      part(box(1.6, 0.12, 0.12), P.chocolate, { y: 1.85 }),
      part(cone(1.0, 0.5, 4), P.terraDark, { y: 2.1, ry: Math.PI / 4 }),
      part(cyl(0.09, 0.09, 0.45, 6), P.stoneDark, { y: 1.45 }),
    ]),
});

def({
  id: 'falo',
  label: 'Falò',
  r: 0.55,
  mass: 0.09,
  zone: 'any',
  count: 24,
  themes: ['polvererosa'],
  build: () =>
    merge([
      ...[0, 2.1, 4.2].map((a) =>
        part(cyl(0.09, 0.11, 1.1, 5), P.chocolate, { y: 0.2, rz: Math.PI / 2, ry: a })
      ),
      part(cone(0.42, 0.9, 6), P.lemon, { y: 0.62 }),
      part(cone(0.28, 0.6, 5), P.coral, { y: 0.95 }),
      part(ico(0.1, 0), P.white, { y: 1.2 }),
    ]),
});

def({
  id: 'scheletro',
  label: 'Scheletro',
  r: 0.45,
  mass: 0.04,
  zone: 'any',
  count: 18,
  themes: ['polvererosa'],
  build: () =>
    merge([
      part(ico(0.28, 0), P.bone, { y: 0.3, sy: 1.1 }),
      part(ico(0.14, 0), P.ink, { x: -0.1, y: 0.35, z: 0.24 }),
      part(ico(0.14, 0), P.ink, { x: 0.1, y: 0.35, z: 0.24 }),
      part(box(0.5, 0.08, 0.12), P.bone, { y: 0.12 }),
      ...[-0.16, 0, 0.16].map((z) => part(box(0.56, 0.07, 0.07), P.bone, { z })),
    ]),
});

def({
  id: 'torre-acqua',
  label: 'Torre dell\'acqua',
  r: 1.7,
  mass: 1.5,
  zone: 'any',
  count: 6,
  themes: ['polvererosa'],
  build: () =>
    merge([
      ...[0, 2.1, 4.2].map((a) =>
        part(box(0.18, 4.4, 0.18), P.terraDark, { x: Math.cos(a) * 0.8, z: Math.sin(a) * 0.8, y: 2.2 })
      ),
      part(cyl(1.1, 1.2, 0.18, 10), P.terra, { y: 4.5 }),
      part(cyl(1.0, 1.0, 1.5, 10), P.stone, { y: 5.3 }),
      part(cone(1.15, 0.8, 10), P.terraDark, { y: 6.4 }),
      part(box(0.5, 0.3, 0.1), P.lemon, { y: 5.3, z: 1.0 }),
    ]),
});

/* ================================================================ NEVEGAL */

def({
  id: 'pino-neve',
  label: 'Pino innevato',
  r: 0.85,
  mass: 0.5,
  zone: 'any',
  count: 80,
  themes: ['nevegal'],
  build: () => {
    const tiers = [];
    for (let i = 0; i < 4; i++) {
      const y = 0.55 + i * 0.72;
      const r = 1.05 - i * 0.19;
      tiers.push(part(cone(r, 1.15, 7), i % 2 ? 0x2f5a46 : 0x3c6e54, { y }));
      tiers.push(part(cone(r * 0.92, 0.3, 7), 0xf2f7ff, { y: y + 0.38 }));
    }
    return merge([part(cyl(0.13, 0.17, 0.7, 6), P.chocolate, { y: 0.35 }), ...tiers]);
  },
});

def({
  id: 'albero-nudo',
  label: 'Albero spoglio',
  r: 0.7,
  mass: 0.3,
  zone: 'any',
  count: 34,
  themes: ['nevegal'],
  build: () => {
    const limbs = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      limbs.push(
        part(cyl(0.04, 0.07, 1.1, 5), 0x5a4636, {
          x: Math.cos(a) * 0.32,
          z: Math.sin(a) * 0.32,
          y: 1.25,
          rz: -Math.cos(a) * 0.75,
          rx: Math.sin(a) * 0.75,
        })
      );
    }
    return merge([part(cyl(0.12, 0.19, 1.6, 6), 0x5a4636, { y: 0.8 }), ...limbs, part(ico(0.18, 0), 0xf2f7ff, { y: 1.62 })]);
  },
});

def({
  id: 'chalet',
  label: 'Chalet',
  r: 2.5,
  mass: 3.2,
  zone: 'town',
  count: 22,
  themes: ['nevegal'],
  build: () =>
    merge([
      part(box(3.6, 2.3, 3.0), P.terra, { y: 1.15 }),
      part(box(3.8, 0.22, 3.2), P.chocolate, { y: 2.4 }),
      part(wedge(4.2, 1.5, 3.6), 0xf4f9ff, { y: 2.5, ry: Math.PI / 4 }),
      part(box(0.5, 0.9, 0.5), P.stoneDark, { x: 1.0, y: 3.2, z: 0.4 }),
      part(box(0.9, 1.6, 0.12), P.chocolate, { y: 0.8, z: 1.55 }),
      part(box(0.7, 0.5, 0.1), 0xbfe8ff, { x: -1.0, y: 1.5, z: 1.56 }),
      part(box(0.7, 0.5, 0.1), 0xbfe8ff, { x: 0.4, y: 1.5, z: 1.56 }),
      part(box(0.7, 0.5, 0.1), 0xbfe8ff, { x: 1.2, y: 1.5, z: -1.56 }),
      part(box(4.2, 0.2, 0.7), 0xf4f9ff, { y: 2.36, z: 1.7 }),
    ]),
});

def({
  id: 'cabana',
  label: 'Cabana',
  r: 1.5,
  mass: 1.1,
  zone: 'any',
  count: 16,
  themes: ['nevegal'],
  build: () =>
    merge([
      part(box(2.2, 1.5, 2.0), P.terraDark, { y: 0.75 }),
      part(wedge(2.6, 0.9, 2.4), 0xf4f9ff, { y: 1.5, ry: Math.PI / 4 }),
      part(box(0.5, 1.0, 0.1), P.chocolate, { y: 0.5, z: 1.05 }),
      part(box(0.45, 0.4, 0.08), 0xbfe8ff, { x: -0.6, y: 1.0, z: 1.05 }),
      part(box(0.6, 0.4, 0.6), P.stoneDark, { x: 0.7, y: 2.0, z: -0.4 }),
    ]),
});

def({
  id: 'palla-neve',
  label: 'Palla di neve',
  r: 0.62,
  mass: 0.16,
  zone: 'any',
  count: 46,
  themes: ['nevegal'],
  build: () =>
    merge([
      part(sph(0.42, 8, 6), 0xf8fbff, { y: 0.38 }),
      part(sph(0.26, 8, 6), 0xf8fbff, { y: 0.9 }),
      part(ico(0.18, 0), 0xf8fbff, { y: 1.22 }),
      part(ico(0.04, 0), P.ink, { x: -0.07, y: 1.25, z: 0.15 }),
      part(ico(0.04, 0), P.ink, { x: 0.07, y: 1.25, z: 0.15 }),
      part(cone(0.07, 0.24, 4), P.coral, { x: 0, y: 1.22, rz: Math.PI }),
      part(box(0.06, 0.5, 0.06), P.ink, { x: 0.3, y: 0.9, rz: -0.5 }),
      part(box(0.3, 0.06, 0.06), P.ink, { x: 0.38, y: 1.08, rz: -0.5 }),
      part(box(0.06, 0.5, 0.06), P.ink, { x: -0.3, y: 0.9, rz: 0.5 }),
    ]),
});

def({
  id: 'slitta',
  label: 'Slitta',
  r: 0.85,
  mass: 0.24,
  zone: 'any',
  count: 24,
  themes: ['nevegal'],
  build: () =>
    merge([
      ...[-0.28, 0.28].map((x) => part(box(0.1, 0.1, 1.5), P.coral, { x, y: 0.16, rx: 0.12 })),
      part(box(0.75, 0.08, 1.4), P.terra, { y: 0.3 }),
      part(box(0.75, 0.35, 0.08), P.terra, { y: 0.5, z: -0.66 }),
      part(box(0.08, 0.4, 0.08), P.cream, { x: -0.34, y: 0.5 }),
      part(box(0.08, 0.4, 0.08), P.cream, { x: 0.34, y: 0.5 }),
    ]),
});

def({
  id: 'sci',
  label: 'Sci',
  r: 0.5,
  mass: 0.08,
  zone: 'any',
  count: 30,
  themes: ['nevegal'],
  build: () =>
    merge([
      part(box(0.18, 0.05, 1.5), P.coral, { x: -0.12, y: 0.1 }),
      part(box(0.18, 0.05, 1.5), P.lemon, { x: 0.12, y: 0.1 }),
      part(box(0.16, 0.1, 0.2), P.ink, { x: -0.12, y: 0.14 }),
      part(box(0.16, 0.1, 0.2), P.ink, { x: 0.12, y: 0.14 }),
    ]),
});

def({
  id: 'igloo',
  label: 'Igloo',
  r: 1.8,
  mass: 2.1,
  zone: 'any',
  count: 6,
  themes: ['nevegal'],
  build: () => {
    const blocks = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      blocks.push(part(box(0.7, 0.5, 0.45), 0xf2f7ff, { x: Math.cos(a) * 1.0, z: Math.sin(a) * 1.0, y: 0.25, ry: -a }));
    }
    return merge([
      ...blocks,
      part(sph(1.3, 10, 5), 0xffffff, { y: 0.3, sy: 0.75 }),
      part(box(0.6, 0.8, 0.2), 0xb9cde0, { y: 0.4, z: 1.15 }),
    ]);
  },
});

def({
  id: 'legnaio',
  label: 'Legnaio',
  r: 0.6,
  mass: 0.14,
  zone: 'any',
  count: 30,
  themes: ['nevegal'],
  build: () => {
    const logs = [];
    for (let r0 = 0; r0 < 3; r0++)
      for (let c = 0; c < 4 - r0; c++)
        logs.push(
          part(cyl(0.14, 0.14, 1.0, 6), P.chocolate, {
            x: (c - (3 - r0) / 2) * 0.3,
            y: 0.16 + r0 * 0.26,
            rz: Math.PI / 2,
          })
        );
    return merge([...logs, part(box(1.3, 0.1, 0.8), 0xf2f7ff, { y: 0.96 })]);
  },
});

def({
  id: 'orso',
  label: 'Orso',
  r: 1.4,
  mass: 1.3,
  zone: 'any',
  count: 8,
  themes: ['nevegal'],
  build: () =>
    merge([
      ...[-0.5, 0.5].flatMap((z) =>
        [-0.5, 0.5].map((x) => part(box(0.22, 0.7, 0.22), 0x5a4636, { x, z, y: 0.35 }))
      ),
      part(box(1.3, 0.7, 0.85), 0x6b5340, { y: 0.95 }),
      part(sph(0.5, 8, 6), 0x6b5340, { x: 0.72, y: 1.15 }),
      part(sph(0.22, 6, 5), 0x6b5340, { x: 0.68, y: 1.6 }),
      part(sph(0.22, 6, 5), 0x6b5340, { x: 0.98, y: 1.62 }),
      part(ico(0.12, 0), 0xd8c9b2, { x: 0.92, y: 1.4, z: 0.36 }),
      part(ico(0.07, 0), P.ink, { x: 0.82, y: 1.25, z: 0.4 }),
      part(ico(0.07, 0), P.ink, { x: 1.02, y: 1.25, z: 0.4 }),
    ]),
});

def({
  id: 'sciovia',
  label: 'Sciovia',
  r: 2.0,
  mass: 1.9,
  zone: 'any',
  count: 7,
  themes: ['nevegal'],
  build: () =>
    merge([
      part(box(0.35, 5.5, 0.35), P.stoneDark, { y: 2.75 }),
      part(box(0.28, 5.5, 0.28), P.stoneDark, { x: 4.5, y: 2.75, z: 2.2 }),
      part(box(5.0, 0.09, 0.09), P.ink, { x: 2.2, y: 5.5, z: 1.1, rz: 0.12 }),
      part(box(5.0, 0.07, 0.07), P.ink, { x: 2.2, y: 5.3, z: 1.1, rz: 0.12 }),
      part(box(0.5, 0.5, 0.6), P.coral, { x: 0.9, y: 4.9, z: 1.1 }),
      part(box(0.5, 0.5, 0.6), P.lemon, { x: 2.4, y: 5.0, z: 1.1 }),
      part(box(1.2, 0.14, 0.14), P.ink, { x: 0, y: 4.5 }),
    ]),
});

def({
  id: 'ghiaccio',
  label: 'Blocco di ghiaccio',
  r: 0.7,
  mass: 0.18,
  zone: 'any',
  count: 34,
  themes: ['nevegal'],
  build: () =>
    merge([
      part(ico(0.55, 0), 0xbfe8ff, { y: 0.4, sy: 1.3 }),
      part(ico(0.3, 0), 0xe8f8ff, { x: 0.3, y: 0.3, z: 0.2 }),
      part(ico(0.06, 0), 0xffffff, { y: 0.75 }),
    ]),
});

def({
  id: 'pennone',
  label: 'Pennone',
  r: 0.45,
  mass: 0.06,
  zone: 'any',
  count: 30,
  themes: ['nevegal'],
  build: () =>
    merge([
      part(cyl(0.05, 0.06, 2.4, 6), P.cream, { y: 1.2 }),
      part(box(0.8, 0.5, 0.04), P.coral, { x: 0.4, y: 2.2 }),
      part(cyl(0.08, 0.08, 0.14, 6), P.lemon, { y: 2.45 }),
    ]),
});

/* ================================================== GIARDINO DELLE NUVOLE */

def({
  id: 'ciliegio',
  label: 'Ciliegio',
  r: 0.95,
  mass: 0.42,
  zone: 'any',
  count: 70,
  themes: ['giardino'],
  build: () => {
    const puffs = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      puffs.push(
        part(ico(0.5, 0), i % 2 ? 0xf7b8cf : 0xffd6e4, {
          x: Math.cos(a) * 0.45,
          z: Math.sin(a) * 0.45,
          y: 1.85 + (i % 2) * 0.3,
        })
      );
    }
    return merge([part(cyl(0.13, 0.2, 1.5, 6), P.chocolate, { y: 0.75 }), ...puffs]);
  },
});

def({
  id: 'torii',
  label: 'Torii',
  r: 1.45,
  mass: 1.1,
  zone: 'any',
  count: 18,
  themes: ['giardino'],
  build: () =>
    merge([
      part(cyl(0.16, 0.19, 3.0, 8), P.terra, { x: -1.0, y: 1.5 }),
      part(cyl(0.16, 0.19, 3.0, 8), P.terra, { x: 1.0, y: 1.5 }),
      part(box(2.9, 0.22, 0.34), P.terraDark, { y: 3.1 }),
      part(box(3.3, 0.2, 0.5), P.terra, { y: 3.32 }),
      part(box(2.4, 0.16, 0.26), P.terra, { y: 2.6 }),
      part(box(0.22, 0.5, 0.3), P.ink, { x: 1.0, y: 2.9 }),
    ]),
});

def({
  id: 'lanterna',
  label: 'Lanterna',
  r: 0.42,
  mass: 0.07,
  zone: 'any',
  count: 60,
  themes: ['giardino'],
  lift: 0.9,
  build: () =>
    merge([
      part(cyl(0.05, 0.06, 1.6, 6), P.chocolate, { y: -0.8 }),
      part(box(0.3, 0.05, 0.3), P.chocolate, { y: 0.02 }),
      part(sph(0.28, 8, 6), P.lemon, { y: 0.34, sy: 1.15 }),
      part(cyl(0.1, 0.14, 0.1, 6), P.terraDark, { y: 0.62 }),
      part(cyl(0.12, 0.09, 0.06, 6), P.terraDark, { y: 0.7 }),
    ]),
});

def({
  id: 'mongolfiera',
  label: 'Mongolfiera',
  r: 1.7,
  mass: 1.0,
  zone: 'any',
  count: 10,
  themes: ['giardino'],
  lift: 3.4,
  build: () =>
    merge([
      part(stripedDome(1.5, 1.9, 9, P.coral, P.lemon), P.coral, { y: -1.9 }),
      part(stripedDome(1.5, 1.5, 9, P.mint, P.cream), P.mint, { y: -0.5 }),
      part(box(0.7, 0.6, 0.7), P.terra, { y: -2.25 }),
      ...[0, 1.5, 3, 4.5].map((a) =>
        part(box(0.04, 0.3, 0.04), P.chocolate, {
          x: Math.cos((a * Math.PI) / 3) * 0.75,
          z: Math.sin((a * Math.PI) / 3) * 0.75,
          y: -2.0,
        })
      ),
    ]),
});

def({
  id: 'mulino',
  label: 'Mulino',
  r: 1.5,
  mass: 1.5,
  zone: 'any',
  count: 8,
  themes: ['giardino'],
  build: () => {
    const blades = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      blades.push(
        part(box(0.16, 1.5, 0.08), P.cream, {
          x: Math.cos(a) * 0.85,
          y: 3.6 + Math.sin(a) * 0.85,
          z: 0.25,
          rz: -a,
        })
      );
    }
    return merge([
      part(cyl(0.8, 1.1, 3.2, 9), P.cream, { y: 1.6 }),
      part(cone(1.2, 1.0, 9), P.terra, { y: 3.7 }),
      part(cyl(0.09, 0.09, 0.5, 6), P.terraDark, { z: 0.45, y: 3.5, rx: Math.PI / 2 }),
      ...blades,
      part(box(0.45, 0.9, 0.12), P.chocolate, { y: 0.45, z: 1.02 }),
    ]);
  },
});

def({
  id: 'serra',
  label: 'Serra',
  r: 2.0,
  mass: 2.2,
  zone: 'any',
  count: 9,
  themes: ['giardino'],
  build: () => {
    const frame = [];
    for (let i = -2; i <= 2; i++) frame.push(part(box(0.08, 1.8, 2.6), P.cream, { x: i * 0.7 }));
    return merge([
      part(box(3.4, 1.7, 2.5), 0xbfe8d8, { y: 0.85 }),
      ...frame,
      part(box(3.5, 0.12, 2.6), P.cream, { y: 1.72 }),
      part(box(3.5, 0.12, 2.6), P.cream, { y: 0.05 }),
      part(stripedDome(1.7, 0.7, 7, P.mint, P.cream), P.mint, { y: 1.78 }),
      part(cyl(0.5, 0.5, 0.5, 7), P.olive, { y: 1.2, z: 0.4 }),
    ]);
  },
});

def({
  id: 'santuario',
  label: 'Santuario',
  r: 2.6,
  mass: 3.3,
  zone: 'town',
  count: 5,
  themes: ['giardino'],
  build: () =>
    merge([
      part(box(3.4, 0.4, 2.6), P.stone, { y: 0.2 }),
      part(box(2.8, 2.4, 2.2), P.cream, { y: 1.6 }),
      part(box(3.2, 0.24, 2.5), P.terra, { y: 2.9 }),
      part(wedge(3.6, 1.0, 2.9), P.terraDark, { y: 3.02, ry: Math.PI / 4 }),
      part(box(0.9, 1.4, 0.12), P.terraDark, { y: 0.9, z: 1.14 }),
      part(box(0.6, 0.6, 0.12), P.lemon, { x: -0.9, y: 1.7, z: 1.14 }),
      part(box(0.6, 0.6, 0.12), P.lemon, { x: 0.9, y: 1.7, z: 1.14 }),
      part(cyl(0.12, 0.12, 1.6, 6), P.chocolate, { x: 1.3, y: 3.9 }),
    ]),
});

def({
  id: 'fungo',
  label: 'Fungo',
  r: 0.38,
  mass: 0.06,
  zone: 'any',
  count: 54,
  themes: ['giardino'],
  build: () =>
    merge([
      part(cyl(0.09, 0.12, 0.5, 6), P.cream, { y: 0.25 }),
      part(sph(0.34, 8, 5), P.coral, { y: 0.55, sy: 0.7 }),
      part(ico(0.09, 0), P.white, { y: 0.68, x: 0.12 }),
      part(ico(0.07, 0), P.white, { y: 0.66, x: -0.13, z: 0.08 }),
    ]),
});

def({
  id: 'scala',
  label: 'Scale',
  r: 0.8,
  mass: 0.2,
  zone: 'any',
  count: 30,
  themes: ['giardino'],
  build: () => {
    const steps = [];
    for (let i = 0; i < 5; i++) steps.push(part(box(1.4, 0.14, 0.4), P.cream, { y: 0.2 + i * 0.42, z: 0.9 - i * 0.36 }));
    return merge(steps);
  },
});

def({
  id: 'koi',
  label: 'Koi',
  r: 0.34,
  mass: 0.03,
  zone: 'any',
  count: 26,
  themes: ['giardino'],
  float: 0.25,
  build: () =>
    merge([
      part(sph(0.24, 8, 5), P.coral, { y: 0.2, sz: 1.6 }),
      part(cone(0.16, 0.3, 4), P.white, { x: -0.32, y: 0.2, rz: Math.PI / 2 }),
      part(tri([0, 0.2, 0], [0.05, 0.45, -0.12], [0.05, 0.5, 0.1]), P.white),
      part(ico(0.05, 0), P.ink, { x: 0.18, y: 0.28, z: 0.12 }),
    ]),
});

def({
  id: 'santuario-mini',
  label: 'Lanterna di pietra',
  r: 0.5,
  mass: 0.12,
  zone: 'any',
  count: 26,
  themes: ['giardino'],
  build: () =>
    merge([
      part(cyl(0.34, 0.4, 0.5, 8), P.stone, { y: 0.25 }),
      part(box(0.34, 0.42, 0.34), P.stoneDark, { y: 0.7 }),
      part(wedge(0.6, 0.35, 0.6), P.stone, { y: 1.1, ry: Math.PI / 4 }),
      part(box(0.2, 0.16, 0.04), P.sun, { y: 0.72, z: 0.19 }),
    ]),
});

/* =============================================================== NOTTE NEON */

def({
  id: 'taxi',
  label: 'Taxi',
  r: 1.3,
  mass: 0.6,
  zone: 'any',
  count: 34,
  themes: ['notteneon'],
  build: () =>
    merge([
      ...[-0.62, 0.62].flatMap((z) =>
        [-0.5, 0.5].map((x) => part(cyl(0.28, 0.28, 0.16, 8), P.ink, { x, z, y: 0.28, rz: Math.PI / 2 }))
      ),
      part(box(1.95, 0.5, 1.15), P.lemon, { y: 0.55 }),
      part(box(1.0, 0.5, 1.05), P.ink, { x: -0.15, y: 1.02 }),
      part(box(1.02, 0.34, 1.08), 0x6fd8ff, { x: -0.15, y: 1.04 }),
      part(box(0.5, 0.16, 0.5), P.lemon, { x: 0.0, y: 1.36 }),
      part(cyl(0.09, 0.09, 0.08, 6), P.white, { x: 0.93, y: 0.62, z: 0.36, rz: Math.PI / 2 }),
      part(cyl(0.09, 0.09, 0.08, 6), P.white, { x: 0.93, y: 0.62, z: -0.36, rz: Math.PI / 2 }),
    ]),
});

def({
  id: 'auto-polizia',
  label: 'Pattuglia',
  r: 1.35,
  mass: 0.65,
  zone: 'any',
  count: 14,
  themes: ['notteneon'],
  build: () =>
    merge([
      ...[-0.66, 0.66].flatMap((z) =>
        [-0.52, 0.52].map((x) => part(cyl(0.3, 0.3, 0.16, 8), P.ink, { x, z, y: 0.3, rz: Math.PI / 2 }))
      ),
      part(box(2.2, 0.6, 1.25), 0x2b3a66, { y: 0.62 }),
      part(box(1.15, 0.55, 1.15), 0x24304f, { x: -0.15, y: 1.15 }),
      part(box(1.0, 0.3, 1.18), 0x8fd8ff, { x: -0.2, y: 1.2 }),
      part(box(0.6, 0.18, 0.3), P.white, { y: 1.5 }),
      part(box(0.3, 0.16, 0.3), 0xff4d6a, { x: -0.2, y: 1.5 }),
      part(box(0.3, 0.16, 0.3), 0x4d8bff, { x: 0.2, y: 1.5 }),
    ]),
});

def({
  id: 'palone',
  label: 'Pallonetto',
  r: 0.55,
  mass: 0.06,
  zone: 'any',
  count: 70,
  themes: ['notteneon'],
  lift: 1.4,
  build: () =>
    merge([
      part(cyl(0.02, 0.02, 1.4, 4), P.stoneDark, { y: -0.7 }),
      part(box(0.7, 0.34, 0.34), P.ink, { y: 0.05 }),
      part(box(0.72, 0.06, 0.36), P.ink, { y: -0.14 }),
      part(box(0.62, 0.06, 0.26), P.ink, { y: 0.23 }),
    ]),
});

def({
  id: 'cabina',
  label: 'Cabina',
  r: 0.9,
  mass: 0.5,
  zone: 'any',
  count: 44,
  themes: ['notteneon'],
  build: () =>
    merge([
      part(box(0.85, 1.7, 0.8), 0x2a2740, { y: 0.85 }),
      part(box(0.9, 0.12, 0.85), P.ink, { y: 1.74 }),
      part(box(0.6, 0.5, 0.06), 0x6fd8ff, { y: 1.2, z: 0.42 }),
      part(box(0.5, 0.4, 0.06), 0xff6fa8, { y: 0.6, z: 0.42 }),
      part(box(0.12, 0.12, 0.12), P.lemon, { x: 0.3, y: 0.95, z: 0.45 }),
      part(box(0.12, 0.12, 0.12), P.coral, { x: -0.3, y: 0.95, z: 0.45 }),
    ]),
});

def({
  id: 'edificio-neon',
  label: 'Grattacielo',
  r: 2.4,
  mass: 3.4,
  zone: 'town',
  count: 30,
  themes: ['notteneon'],
  scaleVar: 0.3,
  build: () => {
    const windows = [];
    for (let f = 0; f < 7; f++) {
      for (let i = 0; i < 3; i++) {
        const lit = (f * 3 + i) % 3 === 0 ? 0xffe98a : 0x6fd8ff;
        windows.push(part(box(0.36, 0.42, 0.06), lit, { x: -0.7 + i * 0.7, y: 0.8 + f * 0.85, z: 1.56 }));
        windows.push(part(box(0.36, 0.42, 0.06), lit, { x: -0.7 + i * 0.7, y: 0.8 + f * 0.85, z: -1.56 }));
      }
    }
    return merge([
      part(box(3.2, 6.4, 3.2), 0x2f2b4a, { y: 3.2 }),
      part(box(3.4, 0.3, 3.4), 0x4a4470, { y: 6.5 }),
      part(box(0.6, 0.8, 0.6), 0x4a4470, { x: 0.9, y: 7.0, z: 0.9 }),
      part(box(0.9, 1.5, 0.12), 0x16132b, { y: 0.75, z: 1.63 }),
      part(box(2.9, 0.16, 0.16), P.pink, { y: 3.2, z: 1.68 }),
      part(box(0.16, 6.0, 0.16), 0x6fd8ff, { x: 1.68, y: 3.2 }),
      ...windows,
    ]);
  },
});

def({
  id: 'fontana-neon',
  label: 'Fontana',
  r: 1.3,
  mass: 1.0,
  zone: 'town',
  count: 7,
  themes: ['notteneon'],
  build: () =>
    merge([
      part(cyl(1.25, 1.35, 0.5, 12), P.stone, { y: 0.25 }),
      part(cyl(1.08, 1.08, 0.06, 12), 0x8fd8ff, { y: 0.52 }),
      part(cyl(0.22, 0.3, 1.1, 8), P.stone, { y: 0.8 }),
      part(cyl(0.6, 0.2, 0.16, 8), P.pink, { y: 1.35 }),
      part(ico(0.22, 0), 0xffd36a, { y: 1.62 }),
      part(tor(0.62, 0.05, 4, 14), 0xff6fa8, { y: 1.33, rx: Math.PI / 2 }),
    ]),
});

def({
  id: 'palo-luce',
  label: 'Lampione',
  r: 0.32,
  mass: 0.07,
  zone: 'any',
  count: 110,
  themes: ['notteneon'],
  build: () =>
    merge([
      part(cyl(0.11, 0.15, 0.3, 6), P.stoneDark, { y: 0.15 }),
      part(cyl(0.06, 0.08, 2.8, 6), P.stoneDark, { y: 1.5 }),
      part(box(0.6, 0.1, 0.1), P.stoneDark, { y: 2.9 }),
      part(cone(0.24, 0.26, 6), P.stoneDark, { x: 0.26, y: 2.72, rz: Math.PI }),
      part(sph(0.18, 6, 5), 0xfff0c4, { x: 0.26, y: 2.48 }),
    ]),
});

def({
  id: 'ingaggio',
  label: 'Bocchettone',
  r: 0.5,
  mass: 0.05,
  zone: 'any',
  count: 44,
  themes: ['notteneon'],
  build: () =>
    merge([
      part(box(1.0, 0.06, 0.6), P.stoneDark, { y: 0.03 }),
      ...[-0.3, -0.1, 0.1, 0.3].map((x) => part(box(0.06, 0.08, 0.6), P.ink, { x })),
    ]),
});

def({
  id: 'venditore',
  label: 'Street food',
  r: 0.85,
  mass: 0.3,
  zone: 'any',
  count: 30,
  themes: ['notteneon'],
  build: () =>
    merge([
      part(box(1.3, 0.9, 0.8), P.ink, { y: 0.45 }),
      part(box(1.4, 0.14, 0.9), P.stoneDark, { y: 0.94 }),
      part(box(1.5, 0.5, 0.2), P.coral, { y: 1.2, z: 0.3, rx: -0.3 }),
      part(box(1.5, 0.06, 0.6), P.lemon, { y: 0.8, z: 0.28 }),
      part(cyl(0.1, 0.1, 0.5, 6), P.stoneDark, { x: 0.45, y: 1.2 }),
      part(ico(0.1, 0), 0xff6fa8, { x: 0.45, y: 1.5 }),
      part(box(0.4, 0.3, 0.06), 0x6fd8ff, { y: 0.55, z: 0.42 }),
    ]),
});

/* ------------------------------------------------------------- ORO (multi) */

def({
  id: 'oro-meteora',
  label: 'Meteora',
  r: 1.5,
  mass: 2.4,
  zone: 'any',
  count: 1,
  gold: true,
  rarity: 4,
  themes: ['notteneon', 'nevegal', 'giardino', 'polvererosa'],
  build: () =>
    merge([
      part(ico(0.7, 1), P.gold, { y: 1.2 }),
      part(ico(0.42, 0), 0xff6fa8, { x: 0.5, y: 0.9, z: 0.3 }),
      part(tor(0.9, 0.05, 4, 16), P.lemon, { y: 1.2, rx: Math.PI / 2.4 }),
      part(cone(0.3, 0.9, 6), 0xff9a3c, { y: 0.5, rz: 0.6 }),
    ]),
});

def({
  id: 'oro-cristallo',
  label: 'Cristallo',
  r: 1.4,
  mass: 2.2,
  zone: 'any',
  count: 1,
  gold: true,
  rarity: 3,
  themes: ['giardino', 'nevegal'],
  build: () =>
    merge([
      part(ico(0.62, 0), 0x8fd8ff, { y: 0.9, sy: 1.8 }),
      part(ico(0.3, 0), 0xffffff, { y: 1.9, sy: 1.6 }),
      part(cyl(0.5, 0.6, 0.3, 6), P.stone, { y: 0.15 }),
      ...[0, 2.1, 4.2].map((a) => part(ico(0.2, 0), 0x8fd8ff, { x: Math.cos(a) * 0.6, z: Math.sin(a) * 0.6, y: 0.4 })),
    ]),
});

def({
  id: 'oro-mask',
  label: 'Maschera',
  r: 1.3,
  mass: 2.0,
  zone: 'any',
  count: 1,
  gold: true,
  rarity: 3,
  themes: ['polvererosa', 'portomarina'],
  build: () =>
    merge([
      part(sph(0.55, 8, 6), P.gold, { y: 1.1, sy: 1.3 }),
      part(box(0.5, 0.2, 0.1), P.ink, { x: -0.2, y: 1.2, z: 0.5 }),
      part(box(0.5, 0.2, 0.1), P.ink, { x: 0.2, y: 1.2, z: 0.5 }),
      part(box(0.34, 0.1, 0.1), P.gold, { y: 0.82, z: 0.52 }),
      ...[-0.5, 0, 0.5].map((x) => part(ico(0.14, 0), P.coral, { x, y: 1.75, z: 0.2 })),
      part(cyl(0.1, 0.14, 0.8, 6), P.chocolate, { y: 0.4 }),
    ]),
});

export const PROP_DEFS_EXTRA = D;