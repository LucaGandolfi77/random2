import { P, c } from './palette.js';
import { clamp, smoothstep, makeRng } from '../core/utils.js';

/**
 * Le ambientazioni di BUCIO. Ogni tema è un oggetto autosufficiente: dice
 * com'è fatta la mappa (strade, riva, alture), di che colori è, come è il
 * cielo e che luci servono. Il resto del gioco lo legge da qui.
 *
 * Funzioni di zona per ogni tema:
 *   town()   → paese/città: niente edifici grossi in mezzo alle strade
 *   field()  → aperto campagna: spiaggia, deserto, neve, prato
 *   water()  → dove c'è acqua (false se il tema non ne ha)
 *   solid()  → false fuori dal mondo (isole sospese nel vuoto)
 */

const TAU = Math.PI * 2;

/* ---------------------------------------------------------- helpers condivisi */

const circle = (cx, cz, r) => (x, z) => (x - cx) ** 2 + (z - cz) ** 2 < r * r;

const inRoads = (roads, x, z, pad = 0) =>
  roads.some((r) =>
    r.axis === 'x' ? Math.abs(z - r.at) < r.w * 0.5 + pad : Math.abs(x - r.at) < r.w * 0.5 + pad
  );

const onRoad = (roads, x, z) => inRoads(roads, x, z, 0);

/** Mescolamento tra due colori, con rng opzionale per variazioni. */
function mix(out, a, b, t) {
  return out.copy(c(a)).lerp(c(b), clamp(t, 0, 1));
}

/* ============================================================== PORTOMARINA */

const PM_SHORE = (x) =>
  34 +
  Math.sin(x * 0.042) * 6 +
  Math.sin(x * 0.015 + 1.7) * 8 +
  Math.sin(x * 0.09 + 0.4) * 1.6;

const PM_ROADS = [
  { axis: 'x', at: -34, w: 9 },
  { axis: 'x', at: -6, w: 7 },
  { axis: 'z', at: -14, w: 7 },
  { axis: 'z', at: 34, w: 6 },
];

const PM_TOWN = circle(0, -26, 96);
const PM_PLAZZA = { x: 16, z: -34, r: 15 };

const portomarina = {
  id: 'portomarina',
  name: 'Portomarina',
  subtitle: 'città di mare',
  emoji: '🏖️',
  map: { half: 108, water: true, seaLevel: -0.14, shoreBase: 34, shoreWave: 10, beachDepth: 20 },
  shore: PM_SHORE,
  roads: PM_ROADS,
  plaza: PM_PLAZZA,
  spawns: [
    { x: -38, z: -20 },
    { x: 30, z: -30 },
    { x: -58, z: -42 },
    { x: 64, z: -8 },
    { x: -10, z: 8 },
  ],
  solid: () => true,
  relief: () => 0,
  ponds: [],
  palette: {},
  exposure: 1.05,
  sky: {
    top: P.night,
    mid: P.navy,
    horizon: 0xffb887,
    cloud: 0xffd9c0,
    hemiSky: 0xff9d7a,
    hemiGround: P.seaDeep,
    hemiInt: 1.05,
    sun: 0xffe6a8,
    sunInt: 2.1,
    sunPos: [-70, 62, 96],
    fog: 0xc08a6a,
    fogNear: 115,
    fogFar: 400,
    stars: true,
  },
  ground(x, z, rng, out) {
    const s = PM_SHORE(x);
    const depth = z - s;
    const townEdge = -20 * 0.42;
    if (onRoad(PM_ROADS, x, z)) return mix(out, P.asphalt, P.stoneDark, rng() * 0.12);
    if ((x - 16) ** 2 + (z + 34) ** 2 < 15 * 15) {
      const d = Math.hypot(x - 16, z + 34);
      return mix(out, P.stone, P.sand, clamp((d - 9) / 7, 0, 1));
    }
    if (depth > 1.2) return mix(out, P.wetSand, P.seaDeep, smoothstep(clamp((depth - 1.2) / 16, 0, 1)));
    if (depth > townEdge) {
      return mix(out, P.sandDark, P.sand, smoothstep(clamp((depth - townEdge) / (1.2 - townEdge), 0, 1)));
    }
    const patch = Math.sin(x * 0.11) * Math.cos(z * 0.13) + Math.sin((x + z) * 0.05) * 0.8;
    if (patch > 0.55) return mix(out, P.palm, P.olive, rng() * 0.4);
    if (patch < -0.75) return mix(out, P.cream, P.bone, rng() * 0.5);
    return mix(out, P.olive, P.mint, rng() * 0.35);
  },
  zones: {
    town: PM_TOWN,
    field: (x, z) => z > PM_SHORE(x) - 8.4,
    water: (x, z) => z > PM_SHORE(x) - 8.4,
  },
};

/* ============================================================= POLVERE ROSSA */

const PR_MESAS = [
  { x: 62, z: -58, r: 24, h: 9 },
  { x: -66, z: -52, r: 20, h: 7 },
  { x: 18, z: -86, r: 28, h: 11 },
  { x: -20, z: 54, r: 22, h: 6 },
  { x: 88, z: 26, r: 18, h: 8 },
  { x: -88, z: 40, r: 19, h: 7.5 },
];

const PR_ROADS = [
  { axis: 'x', at: -22, w: 8 },
  { axis: 'z', at: -6, w: 7 },
  { axis: 'x', at: 30, w: 6 },
];

const PR_TOWN = circle(-26, -8, 52);

const polvererosa = {
  id: 'polvererosa',
  name: 'Polvere Rossa',
  subtitle: 'canyon del Far West',
  emoji: '🌵',
  map: { half: 112, water: false, seaLevel: -8, shoreBase: 0, shoreWave: 0, beachDepth: 0 },
  shore: () => 9999,
  roads: PR_ROADS,
  plaza: { x: -26, z: -8, r: 14 },
  spawns: [
    { x: -26, z: 8 },
    { x: 30, z: -34 },
    { x: -58, z: 30 },
    { x: 52, z: 14 },
    { x: -8, z: -58 },
  ],
  solid: () => true,
  relief(x, z) {
    let h = 0;
    for (const m of PR_MESAS) {
      const d = Math.hypot(x - m.x, z - m.z);
      if (d < m.r) {
        // meseta: cima piatta, fianco scarpato
        const k = 1 - smoothstep(clamp((d - m.r * 0.72) / (m.r * 0.28), 0, 1));
        h = Math.max(h, m.h * (0.25 + 0.75 * k));
      }
    }
    // letto del fiume secco
    h += Math.sin(x * 0.06) * Math.cos(z * 0.05) * 0.5;
    return h;
  },
  ponds: [],
  palette: {
    sand: 0xe8b877,
    sandDark: 0xcf9055,
    wetSand: 0xb4703c,
    asphalt: 0x9c6b45,
    stone: 0xd9a878,
    stoneDark: 0x8d5a3a,
    olive: 0xb9a05a,
    mint: 0xd8c07a,
    palm: 0x8fae5c,
    sea: 0xc97a4a,
    seaDeep: 0x8a4a30,
  },
  exposure: 1.0,
  sky: {
    top: 0x2f6bb0,
    mid: 0x74b6e0,
    horizon: 0xffd9a0,
    cloud: 0xfff0d8,
    hemiSky: 0xffc98a,
    hemiGround: 0xa9633a,
    hemiInt: 1.25,
    sun: 0xfff0c0,
    sunInt: 2.5,
    sunPos: [80, 84, 60],
    fog: 0xe8bb8c,
    fogNear: 130,
    fogFar: 460,
    stars: false,
  },
  ground(x, z, rng, out) {
    if (onRoad(PR_ROADS, x, z)) return mix(out, 0xb98a5e, 0x9c6b45, rng() * 0.2);
    if ((x + 26) ** 2 + (z + 8) ** 2 < 14 * 14) return mix(out, 0xc08d5e, 0xd9a878, rng() * 0.3);
    let h = 0;
    for (const m of PR_MESAS) {
      const d = Math.hypot(x - m.x, z - m.z);
      if (d < m.r * 1.05) h = Math.max(h, 1 - d / (m.r * 1.05));
    }
    const patch = Math.sin(x * 0.09 + 1.2) * Math.cos(z * 0.08);
    if (h > 0.45) return mix(out, 0xb45f38, 0xd87f4a, rng() * 0.3); // parete della meseta
    if (patch > 0.62) return mix(out, 0x8fae5c, 0xa8b95f, rng() * 0.4); // cespugli
    if (patch < -0.8) return mix(out, 0xcaa06a, 0xdcb47c, rng() * 0.3);
    return mix(out, 0xe0b076, 0xcf9055, rng() * 0.35);
  },
  zones: {
    town: PR_TOWN,
    field: (x, z) => !PR_TOWN(x, z),
    water: () => false,
  },
};

/* ================================================================= NEVEGAL */

const NV_ROADS = [
  { axis: 'x', at: -30, w: 8 },
  { axis: 'x', at: 4, w: 7 },
  { axis: 'z', at: -18, w: 7 },
  { axis: 'z', at: 30, w: 6 },
];

const NV_TOWN = circle(0, -24, 92);
const NV_PLAZZA = { x: -18, z: -30, r: 14 };
const NV_LAKE = (x) => 26 + Math.sin(x * 0.05) * 9 + Math.sin(x * 0.021 + 2) * 7;

const nevegal = {
  id: 'nevegal',
  name: 'Nevegal',
  subtitle: 'paese d\'alta quota',
  emoji: '🎿',
  map: { half: 110, water: true, seaLevel: -0.12, shoreBase: 26, shoreWave: 9, beachDepth: 26 },
  shore: NV_LAKE,
  roads: NV_ROADS,
  plaza: NV_PLAZZA,
  spawns: [
    { x: -34, z: -22 },
    { x: 34, z: -44 },
    { x: -60, z: -30 },
    { x: 62, z: 0 },
    { x: -6, z: 10 },
  ],
  solid: () => true,
  relief(x, z) {
    // colline morbide: il paese è in una conca
    const hills = Math.sin(x * 0.021) * 2.6 + Math.cos(z * 0.018 + 1) * 2.4 + Math.sin((x + z) * 0.011) * 2;
    const bowl = 1 - clamp(Math.hypot(x, z + 20) / 130, 0, 1);
    return hills * (0.35 + bowl * 0.8);
  },
  ponds: [],
  palette: {
    sand: 0xf2f7ff,
    sandDark: 0xd8e4f2,
    wetSand: 0xb9cde0,
    asphalt: 0x6a7484,
    stone: 0xe6ecf5,
    stoneDark: 0xa9b6c8,
    olive: 0x8fa8b8,
    mint: 0xcfe4f0,
    palm: 0x6f8f7a,
    foam: 0xffffff,
    sea: 0x7fc4d8,
    seaDeep: 0x4f93b0,
  },
  exposure: 1.0,
  sky: {
    top: 0x2a3f6b,
    mid: 0x6f8fc0,
    horizon: 0xffc9b0,
    cloud: 0xf4f8ff,
    hemiSky: 0xcfe0f5,
    hemiGround: 0x8aa6c0,
    hemiInt: 1.25,
    sun: 0xffe9d0,
    sunInt: 1.8,
    sunPos: [-90, 52, 70],
    fog: 0xbcd2e8,
    fogNear: 110,
    fogFar: 420,
    stars: true,
  },
  ground(x, z, rng, out) {
    const s = NV_LAKE(x);
    const depth = z - s;
    if (onRoad(NV_ROADS, x, z)) return mix(out, 0x7d8896, 0x99a6b6, rng() * 0.25);
    if ((x + 18) ** 2 + (z + 30) ** 2 < 14 * 14) return mix(out, 0xe8eef7, 0xc9d6e4, rng() * 0.3);
    if (depth > 1.2) return mix(out, 0xc6dcea, 0x5e9fbc, smoothstep(clamp((depth - 1.2) / 14, 0, 1)));
    if (depth > -11) return mix(out, 0xdce8f4, 0xf4f9ff, smoothstep(clamp((depth + 11) / 12.2, 0, 1)));
    // campagna innevata con macchie di bosco
    const patch = Math.sin(x * 0.08 + 0.6) * Math.cos(z * 0.07) + Math.sin((x - z) * 0.04) * 0.6;
    if (patch > 0.7) return mix(out, 0x3f5a4a, 0x54715c, rng() * 0.4);
    return mix(out, 0xf4f9ff, 0xe4edf8, rng() * 0.35);
  },
  zones: {
    town: NV_TOWN,
    field: (x, z) => z > NV_LAKE(x) - 11,
    water: (x, z) => z > NV_LAKE(x) - 11,
  },
};

/* ====================================================== GIARDINO DELLE NUVOLE */

const ISLAND_R = 92;
const islandEdge = (x, z) => ISLAND_R + Math.sin(Math.atan2(z + 6, x) * 3) * 9 + Math.sin(x * 0.07) * 4;

const GD_PATHS = [
  { axis: 'x', at: -18, w: 6 },
  { axis: 'z', at: -4, w: 5 },
];

const GD_PLAZZA = { x: 0, z: -18, r: 11 };
const GD_PONDS = [
  { x: 26, z: 4, r: 7 },
  { x: -34, z: 22, r: 5.5 },
];

const giardino = {
  id: 'giardino',
  name: 'Giardino delle Nuvole',
  subtitle: 'isola sospesa',
  emoji: '🌸',
  map: { half: 104, water: false, seaLevel: -30, shoreBase: 0, shoreWave: 0, beachDepth: 0 },
  shore: () => 9999,
  roads: GD_PATHS,
  plaza: GD_PLAZZA,
  spawns: [
    { x: 0, z: -6 },
    { x: 34, z: -34 },
    { x: -44, z: -12 },
    { x: 30, z: 34 },
    { x: -24, z: 42 },
  ],
  solid(x, z) {
    const d = Math.hypot(x, z + 6);
    return d < islandEdge(x, z) - 2;
  },
  relief(x, z) {
    const d = Math.hypot(x, z + 6);
    // l'isola è a cupola: il bordo scende verso il vuoto
    const dome = -clamp((d / ISLAND_R) ** 2, 0, 1) * 9;
    return dome + Math.sin(x * 0.06) * 0.6 + Math.cos(z * 0.05) * 0.5;
  },
  ponds: GD_PONDS,
  palette: {
    sand: 0xf7e9c9,
    sandDark: 0xe3cfa5,
    wetSand: 0xd4b98c,
    asphalt: 0xb9a894,
    stone: 0xf3e7d2,
    stoneDark: 0xc2ae96,
    olive: 0xa9d48f,
    mint: 0xcae9b4,
    palm: 0x8fc98a,
    sea: 0x7fd4d0,
    seaDeep: 0x3f9aa8,
    foam: 0xe8fbf8,
  },
  exposure: 1.0,
  sky: {
    top: 0x2f6fd0,
    mid: 0x87b6ea,
    horizon: 0xffe3e8,
    cloud: 0xffffff,
    hemiSky: 0xdfefff,
    hemiGround: 0xd8c6b0,
    hemiInt: 1.35,
    sun: 0xfff4d8,
    sunInt: 2.3,
    sunPos: [46, 96, 52],
    fog: 0xd9e8f7,
    fogNear: 140,
    fogFar: 520,
    stars: false,
    cloudsBelow: true,
  },
  ground(x, z, rng, out) {
    if (onRoad(GD_PATHS, x, z)) return mix(out, 0xd9c9b2, 0xc4b39a, rng() * 0.25);
    if (GD_PONDS.some((p) => (x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r)) return c(0x6fc3bd);
    if ((x - 0) ** 2 + (z + 18) ** 2 < 11 * 11) return mix(out, 0xf0e2cc, 0xdccbb2, rng() * 0.3);
    const d = Math.hypot(x, z + 6);
    const patch = Math.sin(x * 0.1) * Math.cos(z * 0.09 + 0.5);
    if (d > 74) return mix(out, 0xd8c9a8, 0xc9b795, rng() * 0.3); // orlo dell'isola
    if (patch > 0.6) return mix(out, 0x9ed489, 0xbde5a4, rng() * 0.4);
    return mix(out, 0xa7d78d, 0xc9e8ab, rng() * 0.35);
  },
  zones: {
    town: circle(0, -14, 60),
    field: (x, z) => !circle(0, -14, 60)(x, z),
    water: () => false,
  },
};

/* ============================================================ NOTTE NEON */

const NN_ROADS = [
  { axis: 'x', at: -30, w: 10 },
  { axis: 'x', at: 0, w: 10 },
  { axis: 'x', at: 30, w: 8 },
  { axis: 'z', at: -34, w: 8 },
  { axis: 'z', at: 6, w: 8 },
  { axis: 'z', at: 44, w: 8 },
];

const NN_PLAZZA = { x: 6, z: -30, r: 13 };

const notteneon = {
  id: 'notteneon',
  name: 'Notte Neon',
  subtitle: 'metropoli alle 3 di notte',
  emoji: '🌃',
  map: { half: 110, water: false, seaLevel: -8, shoreBase: 0, shoreWave: 0, beachDepth: 0 },
  shore: () => 9999,
  roads: NN_ROADS,
  plaza: NN_PLAZZA,
  spawns: [
    { x: 6, z: -12 },
    { x: -50, z: -46 },
    { x: 60, z: 16 },
    { x: -20, z: 58 },
    { x: 78, z: -12 },
  ],
  solid: () => true,
  relief: () => 0,
  ponds: [],
  palette: {
    sand: 0x4a4560,
    sandDark: 0x3b3750,
    wetSand: 0x2e2b40,
    asphalt: 0x2a2740,
    stone: 0x5a5578,
    stoneDark: 0x413c5c,
    olive: 0x3f5a52,
    mint: 0x4a7a6a,
    palm: 0x4e6f5c,
    sea: 0x2a3a6a,
    seaDeep: 0x1a2340,
    foam: 0xbfe8ff,
  },
  exposure: 1.15,
  sky: {
    top: 0x070a1c,
    mid: 0x181640,
    horizon: 0x6a2c7a,
    cloud: 0x3a2a55,
    hemiSky: 0x3d2a6a,
    hemiGround: 0x14203a,
    hemiInt: 0.85,
    sun: 0xbcd2ff,
    sunInt: 0.75,
    sunPos: [60, 70, -40],
    fog: 0x120c26,
    fogNear: 90,
    fogFar: 340,
    stars: true,
  },
  ground(x, z, rng, out) {
    if (onRoad(NN_ROADS, x, z)) return mix(out, 0x252240, 0x35304f, rng() * 0.3);
    if ((x - 6) ** 2 + (z + 30) ** 2 < 13 * 13) return mix(out, 0x4d4770, 0x6a6290, rng() * 0.3);
    const patch = Math.sin(x * 0.1 + 0.3) * Math.cos(z * 0.09);
    if (patch > 0.65) return mix(out, 0x2c4a42, 0x3a5f50, rng() * 0.4); // parco
    return mix(out, 0x403a5c, 0x514a72, rng() * 0.35); // marciapiede/lotti
  },
  zones: {
    town: circle(0, 0, 104),
    field: () => false,
    water: () => false,
  },
};

/* =============================================================== REGISTRO */

export const THEMES = {
  portomarina,
  polvererosa,
  nevegal,
  giardino,
  notteneon,
};

export const THEME_IDS = Object.keys(THEMES);

let currentId = 'portomarina';
let rng = makeRng(4242);

export function currentTheme() {
  return THEMES[currentId];
}

export function setTheme(id) {
  currentId = THEMES[id] ? id : 'portomarina';
  return currentId;
}

/** Sceglie un tema a caso, evitando di ripetere quello precedente. */
export function randomTheme(exclude) {
  const pool = THEME_IDS.filter((id) => id !== exclude);
  return pool[Math.floor(rng() * pool.length)];
}

export { TAU };