/*
 * CORE 9 — the sites.
 *
 * Three plants, one network. A site supplies its own terrain, sky, plot
 * layout, modifiers, starting credits, prestige threshold and the one
 * auxiliary plot that makes it feel different from its siblings.
 *
 * Credits, banks, waste and prestige live here. Research, data, isotopes,
 * crew and the director are global, in state.js.
 */

import { BASE_ZONE_IDS, PALETTE } from "./zones.js";

export const SITE_ORDER = ["core9", "solaris", "glacier"];

const BASE_PLOTS = {
  reactor: { x: 2, y: 2, w: 3, d: 3 },
  cooling: { x: 6, y: 2, w: 3, d: 3 },
  turbine: { x: 2, y: 6, w: 3, d: 2 },
  substation: { x: 7, y: 6, w: 3, d: 2 },
  control: { x: 2, y: 9, w: 2, d: 2 },
  fuel: { x: 5, y: 9, w: 2, d: 2 },
  waste: { x: 8, y: 9, w: 2, d: 2 },
  lab: { x: 2, y: 12, w: 2, d: 2 },
  security: { x: 5, y: 12, w: 2, d: 2 },
  admin: { x: 8, y: 12, w: 2, d: 2 },
  battery: { x: 11, y: 9, w: 2, d: 2 },
  pump: { x: 11, y: 12, w: 2, d: 2 },
  solar: { x: 11, y: 2, w: 2, d: 2 },
  geothermal: { x: 11, y: 2, w: 2, d: 2 },
};

function mirrorX(plot, cols) {
  return { ...plot, x: cols - plot.x - plot.w };
}

function mirrorY(plot, rows) {
  return { ...plot, y: rows - plot.y - plot.d };
}

function mirroredPlots(cols, rows, mx, my) {
  const out = {};
  for (const [id, plot] of Object.entries(BASE_PLOTS)) {
    let p = { ...plot };
    if (mx) p = mirrorX(p, cols);
    if (my) p = mirrorY(p, rows);
    out[id] = p;
  }
  return out;
}

const RIVER_PALETTE = {
  ...PALETTE,
  grass1: "#1a3529",
  grass2: "#203d2e",
  grass3: "#173126",
  dirt: "#3a3a29",
  water: "#0f4b5e",
  waterLight: "#2d8fa3",
  skyTop: "#050d14",
  skyMid: "#0b1d26",
  skyLow: "#17352f",
  hill1: "#0d211e",
  hill2: "#10291f",
  hill3: "#163323",
  snow: false,
  sand: false,
};

const DESERT_PALETTE = {
  ...PALETTE,
  concrete: "#a69a83",
  concreteDark: "#6b5d49",
  concreteLight: "#d6c9ad",
  steel: "#7b7970",
  steelLight: "#b8b3a6",
  steelDark: "#48443d",
  window: "#ffd58a",
  windowWarm: "#ffb14e",
  teal: "#f0b35a",
  tealDark: "#9a6420",
  amber: "#ffcf6b",
  amberDark: "#9c6a19",
  water: "#2f8f9e",
  waterDark: "#1c5966",
  grass1: "#6e5b3b",
  grass2: "#7d6845",
  grass3: "#625137",
  dirt: "#8f7448",
  waterLight: "#4fb8bf",
  skyTop: "#160f15",
  skyMid: "#3a1f1d",
  skyLow: "#7a3e24",
  hill1: "#2a1818",
  hill2: "#35201b",
  hill3: "#4b2a1f",
  snow: false,
  sand: true,
};

const ARCTIC_PALETTE = {
  ...PALETTE,
  concrete: "#9aaeb4",
  concreteDark: "#5f747b",
  concreteLight: "#d8e6e8",
  steel: "#7d949c",
  steelLight: "#c2d8dd",
  steelDark: "#40545c",
  window: "#bff5ff",
  windowWarm: "#ffc98b",
  teal: "#7ee8ff",
  tealDark: "#237e91",
  water: "#4b8fa3",
  waterDark: "#204d62",
  grass1: "#c8d9dc",
  grass2: "#b9ccd0",
  grass3: "#d6e5e7",
  dirt: "#7d8e91",
  waterLight: "#a8eaff",
  skyTop: "#030b14",
  skyMid: "#0b2233",
  skyLow: "#1d4b5e",
  hill1: "#0a1a24",
  hill2: "#102735",
  hill3: "#17384a",
  snow: true,
  sand: false,
};

const RIVER_TERRAIN = {
  grass: ["#1a3529", "#203d2e", "#173126"],
  dirt: "#3a3a29",
  road: "#233238",
  roadAlt: "#202f35",
  roadLine: "rgba(215,180,91,.24)",
  water: "#0f4552",
  waterGlint: "rgba(140,232,224,.18)",
  fence: "rgba(130,147,146,.48)",
  plot: "rgba(45,58,56,.72)",
  plotEmpty: "rgba(32,43,40,.58)",
  haze: "rgba(30,90,80,.08)",
  far: "#081712",
};

const DESERT_TERRAIN = {
  grass: ["#6e5b3b", "#7d6845", "#625137"],
  dirt: "#8f7448",
  road: "#3a3430",
  roadAlt: "#342f2b",
  roadLine: "rgba(255,207,107,.28)",
  water: "#1c5966",
  waterGlint: "rgba(255,207,107,.14)",
  fence: "rgba(180,160,125,.45)",
  plot: "rgba(69,61,48,.74)",
  plotEmpty: "rgba(53,46,37,.62)",
  haze: "rgba(160,90,30,.08)",
  far: "#1c120e",
};

const ARCTIC_TERRAIN = {
  grass: ["#c8d9dc", "#b9ccd0", "#d6e5e7"],
  dirt: "#7d8e91",
  road: "#33464e",
  roadAlt: "#2d3f47",
  roadLine: "rgba(168,234,255,.26)",
  water: "#2a5d70",
  waterGlint: "rgba(190,245,255,.24)",
  fence: "rgba(190,220,225,.55)",
  plot: "rgba(74,91,96,.72)",
  plotEmpty: "rgba(58,74,80,.62)",
  haze: "rgba(130,210,235,.08)",
  far: "#07161f",
};

const RIVER_ROADS = { vertical: [5, 10], horizontal: [5, 8, 11, 14], gate: [4.2, 7.6] };
const DESERT_ROADS = { vertical: [3, 8], horizontal: [5, 8, 11, 14], gate: [6.4, 9.8] };
const ARCTIC_ROADS = { vertical: [5, 10], horizontal: [1, 4, 7, 10], gate: [4.2, 7.6] };

export const SITES = [
  {
    id: "core9",
    name: "CORE 9",
    short: "CORE 9",
    region: "River Valley",
    subtitle: "The old valley plant. Wet, green, and still standing.",
    icon: "☢",
    accent: "#4dd8c0",
    card: ["#0e4340", "#07131b"],
    tagline: "Balanced cooling, a river, and a town that remembers the last director.",
    zoneIds: BASE_ZONE_IDS.concat(["battery", "pump"]),
    uniqueZone: "pump",
    plots: BASE_PLOTS,
    palette: RIVER_PALETTE,
    terrain: RIVER_TERRAIN,
    map: { cols: 14, rows: 16, ...RIVER_ROADS, water: "river", riverSide: "left" },
    modifiers: { cooling: 1, price: 1, buildCost: 1, waste: 1, offline: 1 },
    modifierText: ["Balanced", "River cooling", "No penalty"],
    startCredits: 650,
    prestigeMW: 100,
    initialYaw: 0,
    unlock: null,
    directorLevel: 0,
  },
  {
    id: "solaris",
    name: "SOLARIS 4",
    short: "SOLARIS 4",
    region: "Desert Basin",
    subtitle: "A dry basin, a high grid price, and no patience for wasted heat.",
    icon: "☀",
    accent: "#f0b35a",
    card: ["#4c2b1e", "#160f15"],
    tagline: "Dry air cuts cooling, but the desert grid pays a premium for every megawatt.",
    zoneIds: BASE_ZONE_IDS.concat(["battery", "solar"]),
    uniqueZone: "solar",
    plots: mirroredPlots(14, 16, true, false),
    palette: DESERT_PALETTE,
    terrain: DESERT_TERRAIN,
    map: { cols: 14, rows: 16, ...DESERT_ROADS, water: null, riverSide: null },
    modifiers: { cooling: 0.85, price: 1.2, buildCost: 1.0, waste: 1, offline: 1 },
    modifierText: ["Cooling −15%", "Grid price +20%", "Sandstorms"],
    startCredits: 2200,
    prestigeMW: 300,
    initialYaw: Math.PI / 2,
    unlock: { director: 5, isotopes: 2 },
    directorLevel: 5,
  },
  {
    id: "glacier",
    name: "GLACIER 2",
    short: "GLACIER 2",
    region: "Arctic Shelf",
    subtitle: "Cold sink, expensive concrete, and a sky that occasionally catches fire.",
    icon: "❄",
    accent: "#7ee8ff",
    card: ["#17384a", "#030b14"],
    tagline: "The ice gives you cooling for free. The logistics bill arrives later.",
    zoneIds: BASE_ZONE_IDS.concat(["battery", "geothermal"]),
    uniqueZone: "geothermal",
    plots: mirroredPlots(14, 16, false, true),
    palette: ARCTIC_PALETTE,
    terrain: ARCTIC_TERRAIN,
    map: { cols: 14, rows: 16, ...ARCTIC_ROADS, water: "frozen", riverSide: "left" },
    modifiers: { cooling: 1.25, price: 0.95, buildCost: 1.12, waste: 1, offline: 1 },
    modifierText: ["Cooling +25%", "Build cost +12%", "Blizzards"],
    startCredits: 4200,
    prestigeMW: 600,
    initialYaw: Math.PI,
    unlock: { director: 12, isotopes: 6 },
    directorLevel: 12,
  },
];

export const SITE_BY_ID = Object.fromEntries(SITES.map((s) => [s.id, s]));
export const ACTIVE_SITE_FALLBACK = "core9";

export function siteZonesOf(siteDef) {
  return siteDef.zoneIds;
}
