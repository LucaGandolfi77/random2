/*
 * CORE 9 — the plant, plot by plot.
 *
 * Each builder is a data function: it emits flat-shaded faces plus a few
 * animated hooks (lights, steam, rotors, radar). The level changes the
 * silhouette at the five stage thresholds and adds a small readable prop on
 * every level in between, so an upgrade never feels like a spreadsheet-only
 * event.
 */

import { ZONE_BY_ID, STAGE_LEVELS, stageForLevel } from "../data/zones.js";
import {
  box,
  prism,
  tower,
  dome,
  gable,
  pipe,
  pipes,
  windowStrip,
  lattice,
  antenna,
  crane,
  tank,
  fenceLine,
  groundPad,
  containerUnit,
  shade,
} from "./primitives.js";

function geo(zone) {
  const p = zone.plot;
  return {
    cx: p.x + p.w / 2,
    cy: p.y + p.d / 2,
    w: p.w,
    d: p.d,
  };
}

function beacon(lights, x, y, z, color, size = 0.07, phase = 0) {
  lights.push({ x, y, z, color, size, phase });
}

function smoke(steam, x, y, z, size = 0.22, rate = 1) {
  steam.push({ x, y, z, size, rate });
}

/* ------------------------------------------------------------------ reactor */

function buildReactor(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const steam = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.35, d - 0.35, P.concreteDark);
  box(out, cx, cy, 0.03, w - 0.6, 0.1, d - 0.6, P.concrete);
  box(out, cx, cy, 0.12, 1.7 + stage * 0.08, 0.32, 1.7 + stage * 0.08, P.concreteDark);

  const radius = 0.78 + stage * 0.045;
  const h = 1.35 + stage * 0.22;
  prism(out, cx, cy, 0.44, radius * 1.08, radius, h, 10, P.concrete, { tone: 0.98 });
  /* Vertical ribs make the cylinder read as a pressure vessel, not a can. */
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 10 + (i / 10) * Math.PI * 2;
    box(out, cx + Math.cos(a) * (radius + 0.015), cy + Math.sin(a) * (radius + 0.015), 0.5, 0.055, h * 0.92, 0.055, P.concreteDark, { tone: 0.85 });
  }

  const coreGlow = stage >= 4;
  prism(out, cx, cy, 0.86, radius + 0.025, radius + 0.025, 0.13, 10, coreGlow ? P.teal : P.steelDark, {
    tone: coreGlow ? 1.32 : 1.0,
    glow: coreGlow ? 0.9 : 0,
  });
  prism(out, cx, cy, 1.18, radius + 0.02, radius + 0.02, 0.065, 10, P.steelDark, { tone: 1.2 });

  const domeR = radius * 1.02;
  dome(out, cx, cy, 0.44 + h, domeR, 0.52 + stage * 0.025, P.concreteLight, { sides: 10, tone: 1.02 });
  /* A darker cap ring on top of the dome. */
  prism(out, cx, cy, 0.44 + h + 0.36, radius * 0.28, radius * 0.2, 0.1, 8, P.steelDark, { tone: 1.15 });

  /* Secondary containment and service building. */
  if (stage >= 2) {
    box(out, cx - 1.05, cy + 0.72, 0.15, 0.75, 0.7 + stage * 0.06, 0.75, P.concreteDark);
    box(out, cx - 1.05, cy + 0.72, 0.85 + stage * 0.06, 0.63, 0.16, 0.63, P.concrete);
    windowStrip(out, cx - 1.05, cy + 0.72 + 0.38, 0.5, 0.3, 0.13, P.window, { tone: 1.2, glow: 0.8 });
    pipe(out, cx - 0.6, cy + 0.3, 1.12, 0.9, 0.11, "x", P.steel, { tone: 0.9 });
    pipe(out, cx - 0.6, cy + 0.42, 1.32, 0.9, 0.08, "x", P.steelDark, { tone: 0.85 });
  }
  if (stage >= 3) {
    box(out, cx + 1.02, cy - 0.78, 0.15, 0.62, 0.58, 0.72, P.concreteDark);
    box(out, cx + 1.02, cy - 0.78, 0.73, 0.52, 0.12, 0.62, P.concrete);
    /* Steam line to the turbine side. */
    pipes(out, [[cx + 0.55, cy + 0.22, 1.72], [cx + 1.02, cy + 0.22, 1.72], [cx + 1.02, cy + 0.8, 1.72]], 0.12, P.steel, { tone: 0.95 });
    crane(out, cx - 1.1, cy - 1.1, 0.2, 2.3, 1.1, P.amber);
  }
  if (stage >= 4) {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
      pipe(out, cx + Math.cos(a) * (radius + 0.18), cy + Math.sin(a) * (radius + 0.18), 0.5, 0.08, 0.08, "x", P.tealDark, { tone: 0.9 });
    }
    smoke(steam, cx - 0.2, cy - 0.2, 2.4, 0.16, 0.5);
    beacon(lights, cx - 0.4, cy - 0.4, 2.75, P.alarm, 0.06, 0);
    beacon(lights, cx + 0.4, cy + 0.4, 2.75, P.alarm, 0.06, 0.5);
  }
  if (stage >= 5) {
    /* Next-gen auxiliary loops and a stack of rings. */
    for (let i = 0; i < 3; i++) {
      const rr = radius + 0.13 + i * 0.06;
      prism(out, cx, cy, 1.9 + i * 0.28, rr, rr, 0.055, 10, i % 2 ? P.teal : P.steelLight, {
        tone: 1.35, glow: i % 2 ? 0.8 : 0,
      });
    }
    for (const side of [-1, 1]) {
      tank(out, cx + side * 1.25, cy + 1.0, 0.15, 0.28, 0.65, P.steel, { tone: 0.92 });
      beacon(lights, cx + side * 1.25, cy + 1.0, 0.86, P.teal, 0.05, 0.35);
    }
    smoke(steam, cx + 0.2, cy + 0.2, 2.7, 0.2, 0.7);
  }

  /* Every level in a stage gets one extra readable detail. */
  for (let i = 0; i < extra; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    box(out, cx + side * (radius + 0.28), cy + 0.35 - i * 0.22, 0.2, 0.18, 0.12, 0.18, P.steel, { tone: 0.92 });
    pipe(out, cx + side * 0.35, cy + 1.1 - i * 0.16, 0.3, 0.7, 0.06, "x", P.steelDark, { tone: 0.82 });
  }

  return {
    faces: out,
    lights,
    steam,
    height: 3.4,
  };
}

/* ------------------------------------------------------------------ cooling */

function buildCooling(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const steam = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  box(out, cx, cy, 0.08, w - 0.55, 0.05, d - 0.55, P.waterDark);

  let spots = [];
  if (stage === 1) spots = [[cx - 0.35, cy + 0.1, 0.77, 2.25]];
  if (stage === 2) spots = [[cx - 0.73, cy - 0.1, 0.67, 2.35], [cx + 0.73, cy + 0.1, 0.67, 2.35]];
  if (stage === 3) spots = [[cx - 0.92, cy - 0.3, 0.6, 2.55], [cx + 0.92, cy - 0.3, 0.6, 2.55], [cx, cy + 0.85, 0.6, 2.55]];
  if (stage === 4) spots = [[cx - 0.95, cy - 0.35, 0.66, 3.0], [cx + 0.95, cy - 0.35, 0.66, 3.0], [cx, cy + 0.86, 0.66, 3.0]];
  if (stage >= 5) spots = [
    [cx - 0.9, cy - 0.8, 0.58, 3.1], [cx + 0.9, cy - 0.8, 0.58, 3.1],
    [cx - 0.9, cy + 0.82, 0.58, 3.1], [cx + 0.9, cy + 0.82, 0.58, 3.1],
  ];

  const basin = stage >= 3 ? w - 0.6 : w - 0.95;
  groundPad(out, cx, cy, basin, stage >= 3 ? d - 0.45 : d - 0.7, P.water, { tone: 0.9 });
  for (let i = 0; i < spots.length; i++) {
    const [x, y, r, h] = spots[i];
    prism(out, x, y, 0.12, r * 1.05, r * 1.05, 0.2, 8, P.concreteDark);
    tower(out, x, y, 0.32, r, h, P.concreteLight, { rim: P.steelLight, inner: P.steelDark });
    smoke(steam, x, y, 0.32 + h + 0.1, 0.22 + stage * 0.015, 1 + stage * 0.1);
    if (stage >= 4) {
      beacon(lights, x, y, 0.32 + h + 0.05, P.alarm, 0.045, i * 0.22);
    }
    /* Pump house at the base. */
    if (i === 0) {
      box(out, x + r + 0.2, y + 0.2, 0.14, 0.42, 0.3, 0.3, P.steelDark);
    }
  }

  if (stage >= 3) {
    /* Water channels between the towers. */
    pipe(out, cx, cy + 1.35, 0.12, w - 0.75, 0.14, "x", P.steelDark, { tone: 0.85 });
    pipe(out, cx - 1.4, cy, 0.13, d - 0.7, 0.12, "y", P.steelDark, { tone: 0.8 });
  }
  if (stage >= 4) {
    box(out, cx + 1.16, cy + 1.14, 0.12, 0.4, 0.55, 0.4, P.concreteDark);
    windowStrip(out, cx + 1.16, cy + 1.345, 0.3, 0.2, 0.11, P.windowWarm, { glow: 0.7 });
  }
  if (stage >= 5) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      beacon(lights, cx + Math.cos(a) * 1.2, cy + Math.sin(a) * 1.2, 0.22, P.teal, 0.045, i * 0.15);
    }
  }

  for (let i = 0; i < extra; i++) {
    const x = cx - 1.1 + i * 0.28;
    box(out, x, cy + 1.28, 0.14, 0.2, 0.1, 0.2, P.steel, { tone: 0.9 });
    pipe(out, x, cy + 1.3, 0.26, 0.6, 0.04, "x", P.steelDark, { tone: 0.8 });
  }

  return { faces: out, lights, steam, height: 3.7 };
}

/* ------------------------------------------------------------------ turbine */

function buildTurbine(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const steam = [];
  const rotors = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.35, d - 0.35, P.concreteDark);
  const hallW = [1.8, 2.2, 2.6, 2.8, 3.0, 3.15, 3.3, 3.4][stage - 1];
  const hallD = [1.15, 1.35, 1.5, 1.55, 1.65, 1.7, 1.75, 1.8][stage - 1];
  const hallH = 0.72 + stage * 0.11;
  box(out, cx - 0.1, cy, 0.14, hallW, hallH, hallD, P.steel);
  gable(out, cx - 0.1, cy, 0.14 + hallH, hallW, hallD, 0.34 + stage * 0.035, P.steelDark);

  /* Foundation strip and doors. */
  box(out, cx - 0.1, cy - hallD / 2 - 0.02, 0.16, hallW * 0.9, hallH * 0.7, 0.05, P.steelDark);
  box(out, cx + hallW / 2 - 0.28, cy, 0.18, 0.06, hallH * 0.8, hallD * 0.7, P.steelDark);

  const rotorCount = stage >= 8 ? 5 : stage >= 6 ? 4 : stage >= 5 ? 3 : stage >= 4 ? 2 : stage >= 3 ? 1 : 0;
  for (let i = 0; i < rotorCount; i++) {
    const x = cx - (rotorCount - 1) * 0.55 + i * 1.1;
    rotors.push({ x, y: cy + hallD / 2 + 0.03, z: 0.42 + hallH * 0.35, r: 0.23 + stage * 0.018, speed: 1.3 + i * 0.2 });
    prism(out, x, cy + hallD / 2 + 0.02, 0.35 + hallH * 0.25, 0.16, 0.16, 0.08, 8, P.amberDark);
  }

  if (stage >= 2) {
    for (let i = 0; i < 2; i++) {
      windowStrip(out, cx - 0.75 + i * 1.2, cy + hallD / 2 + 0.035, 0.42, 0.32, 0.13, P.windowWarm, { glow: 0.5 });
    }
    pipe(out, cx - hallW / 2 - 0.12, cy + 0.2, 1.0, 0.28, 0.09, "x", P.steelLight, { tone: 0.95 });
  }
  if (stage >= 3) {
    for (let i = 0; i < 3; i++) {
      box(out, cx - 0.8 + i * 0.8, cy - 0.18, 0.14 + hallH, 0.18, 0.035, 0.5, P.window, { tone: 1.2, glow: 0.75 });
    }
    smoke(steam, cx + 1.1, cy - 0.4, 0.9, 0.12, 0.4);
  }
  if (stage >= 4) {
    /* Glass generator bay at the front. */
    box(out, cx + 0.9, cy + hallD / 2 + 0.08, 0.18, 0.75, hallH * 0.8, 0.04, P.window, { tone: 1.15, glow: 0.85 });
    for (let i = 0; i < 3; i++) {
      box(out, cx + 0.55 + i * 0.3, cy + hallD / 2 + 0.11, 0.18, 0.035, hallH * 0.8, 0.05, P.steelLight);
    }
    beacon(lights, cx - hallW / 2, cy + hallD / 2, 0.2 + hallH + 0.34, P.alarm, 0.05, 0.2);
  }
  if (stage >= 5) {
    crane(out, cx - hallW / 2 + 0.15, cy - 0.3, 0.18 + hallH, 1.15, 1.2, P.amber);
    tank(out, cx + 1.25, cy - 0.78, 0.14, 0.22, 0.55, P.steel, { tone: 0.9 });
    beacon(lights, cx + 1.25, cy - 0.78, 0.78, P.teal, 0.045, 0.5);
  }

  for (let i = 0; i < extra; i++) {
    box(out, cx - 1.2 + i * 0.24, cy - hallD / 2 - 0.12, 0.15, 0.13, 0.11, 0.13, P.steelLight, { tone: 0.9 });
    pipe(out, cx + hallW / 2 + 0.05, cy - 0.3 + i * 0.2, 0.45, 0.22, 0.05, "x", P.steelDark, { tone: 0.8 });
  }

  return { faces: out, lights, steam, rotors, height: 2.1 };
}

/* ---------------------------------------------------------------- substation */

function buildSubstation(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.road);
  box(out, cx, cy, 0.08, w - 0.55, 0.04, d - 0.55, P.concreteDark);

  const txCount = Math.min(5, stage);
  for (let i = 0; i < txCount; i++) {
    const x = cx - 1.05 + (i % 3) * 1.02;
    const y = cy - 0.45 + Math.floor(i / 3) * 0.9;
    box(out, x, y, 0.16, 0.48, 0.46, 0.34, P.steelDark);
    box(out, x, y, 0.62, 0.38, 0.08, 0.28, P.steel);
    for (let k = 0; k < 3; k++) {
      prism(out, x - 0.14 + k * 0.14, y, 0.7, 0.025, 0.025, 0.3, 5, P.steelLight);
    }
    box(out, x, y + 0.22, 0.2, 0.42, 0.35, 0.03, P.steelDark);
  }

  const pylonH = 1.25 + stage * 0.2;
  const pylonXs = stage >= 4 ? [cx - 1.15, cx + 1.15] : stage >= 3 ? [cx + 1.1] : [];
  for (let i = 0; i < pylonXs.length; i++) {
    lattice(out, pylonXs[i], cy + 0.62, 0.16, 0.26, pylonH, P.steelLight, { thickness: 0.04 });
    for (let k = 0; k < 2; k++) {
      box(out, pylonXs[i] + (k ? 0.22 : -0.22), cy + 0.62, 0.16 + pylonH * 0.55, 0.42, 0.035, 0.035, P.steelLight);
    }
    beacon(lights, pylonXs[i], cy + 0.62, 0.2 + pylonH + 0.12, P.alarm, 0.05, i * 0.3);
  }
  if (stage >= 3) {
    pipes(out, [[cx - 0.8, cy + 0.45, 0.75], [cx + 0.8, cy + 0.45, 0.75]], 0.035, P.steelLight, { tone: 1.1 });
  }
  if (stage >= 4) {
    for (let i = 0; i < 3; i++) {
      box(out, cx - 0.7 + i * 0.7, cy - 0.72, 0.16, 0.2, 0.9, 0.2, P.steelDark);
      beacon(lights, cx - 0.7 + i * 0.7, cy - 0.72, 1.08, P.teal, 0.04, i * 0.18);
    }
    box(out, cx + 1.2, cy - 0.45, 0.16, 0.4, 0.7, 0.35, P.amberDark);
  }
  if (stage >= 5) {
    lattice(out, cx - 0.2, cy + 1.2, 0.16, 0.32, 2.0, P.steelLight, { thickness: 0.045 });
    for (let i = 0; i < 4; i++) {
      box(out, cx - 0.2 + (i - 1.5) * 0.18, cy + 1.2, 1.4, 0.12, 0.03, 0.03, P.amber, { tone: 1.2, glow: 0.7 });
    }
    beacon(lights, cx - 0.2, cy + 1.2, 2.2, P.alarm, 0.06, 0.6);
  }

  for (let i = 0; i < extra; i++) {
    box(out, cx + 1.22, cy - 0.65 + i * 0.25, 0.15, 0.16, 0.11, 0.16, P.steelLight, { tone: 0.9 });
    box(out, cx - 1.1 + i * 0.28, cy + 1.1, 0.15, 0.06, 0.06, 0.06, P.amber, { tone: 1.0, glow: 0.5 });
  }

  return { faces: out, lights, steam: [], height: 2.4 };
}

/* ------------------------------------------------------------------ control */

function buildControl(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.35, d - 0.35, P.concreteDark);
  const bw = [1.15, 1.35, 1.55, 1.7, 1.82, 1.88, 1.92, 1.95][stage - 1];
  const bd = [0.95, 1.1, 1.25, 1.35, 1.42, 1.46, 1.5, 1.52][stage - 1];
  const bh = [0.58, 0.78, 1.12, 1.38, 1.65, 1.85, 2.0, 2.15][stage - 1];
  box(out, cx, cy, 0.14, bw, bh, bd, P.concrete);
  box(out, cx, cy, 0.14 + bh, bw * 0.98, 0.06, bd * 0.98, P.concreteDark);

  const winRows = stage >= 3 ? 2 : 1;
  for (let r = 0; r < winRows; r++) {
    for (let i = 0; i < 4; i++) {
      windowStrip(out, cx - bw * 0.34 + i * (bw * 0.22), cy + bd / 2 + 0.012, 0.3 + r * 0.42 + stage * 0.045, bw * 0.12, 0.14, P.window, { glow: 0.85 });
    }
  }
  box(out, cx + bw / 2 - 0.2, cy + bd / 2 + 0.02, 0.18, 0.16, 0.32, 0.03, P.steelDark);

  if (stage >= 2) {
    antenna(out, cx - bw / 2 + 0.18, cy - bd / 2 + 0.2, 0.14 + bh, 0.8 + stage * 0.1, P.steelLight, { light: P.alarm });
    box(out, cx + 0.25, cy - 0.25, 0.14 + bh, 0.45, 0.08, 0.45, P.steelDark);
    /* Satellite dish in profile. */
    box(out, cx + 0.55, cy - 0.48, 0.7 + bh, 0.24, 0.24, 0.04, P.steelLight, { tone: 1.1 });
    box(out, cx + 0.55, cy - 0.48, 0.7 + bh + 0.1, 0.05, 0.05, 0.18, P.steelDark);
  }
  if (stage >= 3) {
    dome(out, cx - 0.25, cy - 0.22, 0.2 + bh, 0.26, 0.22, P.steelLight, { sides: 8 });
    beacon(lights, cx - 0.25, cy - 0.22, 0.46 + bh, P.teal, 0.045, 0.2);
  }
  if (stage >= 4) {
    box(out, cx + bw * 0.5, cy, 0.14, 0.25, bh * 0.9, bd * 1.1, P.steelDark);
    windowStrip(out, cx + bw * 0.5 + 0.13, cy, 0.42, 0.03, 0.4, P.window, { glow: 0.9 });
    lattice(out, cx + bw * 0.5 + 0.02, cy - 0.62, 0.14 + bh, 0.18, 0.95, P.steelLight);
  }
  if (stage >= 5) {
    /* A small holographic core on the roof. */
    prism(out, cx - 0.35, cy + 0.1, 0.2 + bh, 0.22, 0.18, 0.38, 8, P.teal, { tone: 1.4, glow: 1 });
    dome(out, cx - 0.35, cy + 0.1, 0.58 + bh, 0.24, 0.14, P.window, { sides: 8, glow: 0.7 });
    beacon(lights, cx - 0.35, cy + 0.1, 1.0 + bh, P.teal, 0.07, 0.1);
    for (let i = 0; i < 4; i++) {
      box(out, cx + 0.65, cy - 0.45 + i * 0.28, 0.16, 0.12, 0.05, 0.12, P.window, { tone: 1.2, glow: 0.8 });
    }
  }

  for (let i = 0; i < extra; i++) {
    box(out, cx - bw / 2 - 0.18 + i * 0.14, cy + 0.2, 0.17, 0.08, 0.08, 0.08, P.steelLight, { tone: 0.9 });
    box(out, cx + 0.35 + i * 0.18, cy - bd / 2 - 0.1, 0.15, 0.1, 0.1, 0.1, P.teal, { tone: 1.1, glow: 0.6 });
  }

  return { faces: out, lights, steam: [], height: 3.3 };
}

/* --------------------------------------------------------------------- fuel */

function buildFuel(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const steam = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  box(out, cx - 0.55, cy + 0.1, 0.12, 1.25, 0.68 + stage * 0.06, 1.0, P.concrete);
  gable(out, cx - 0.55, cy + 0.1, 0.8 + stage * 0.06, 1.25, 1.0, 0.22, P.steelDark);
  box(out, cx - 0.55, cy + 0.61, 0.18, 0.38, 0.42, 0.03, P.steelDark);

  const caskN = Math.min(6, stage + 1);
  for (let i = 0; i < caskN; i++) {
    const x = cx + 0.35 + (i % 2) * 0.35;
    const y = cy - 0.55 + Math.floor(i / 2) * 0.42;
    prism(out, x, y, 0.13, 0.15, 0.15, 0.35, 8, P.steelLight, { tone: 0.95 });
    prism(out, x, y, 0.48, 0.16, 0.13, 0.04, 8, P.steelDark);
  }
  if (stage >= 3) {
    groundPad(out, cx + 0.7, cy + 0.55, 0.9, 0.55, P.water, { tone: 0.9 });
    crane(out, cx + 0.45, cy - 0.65, 0.15, 1.25, 0.75, P.amber);
    pipe(out, cx + 0.2, cy + 0.45, 0.12, 1.1, 0.07, "x", P.steelDark);
  }
  if (stage >= 4) {
    for (let i = 0; i < 4; i++) {
      box(out, cx - 0.75 + i * 0.22, cy - 0.62, 0.14, 0.14, 0.55, 0.14, P.steelLight);
      box(out, cx - 0.75 + i * 0.22, cy - 0.62, 0.62, 0.18, 0.03, 0.18, P.teal, { tone: 1.2, glow: 0.7 });
    }
    beacon(lights, cx + 0.45, cy - 0.65, 1.45, P.alarm, 0.045, 0.3);
  }
  if (stage >= 5) {
    box(out, cx + 0.62, cy - 0.68, 0.14, 0.9, 0.8, 0.55, P.concreteDark);
    windowStrip(out, cx + 0.62, cy - 0.395, 0.45, 0.45, 0.12, P.window, { glow: 0.8 });
    beacon(lights, cx + 0.62, cy - 0.95, 0.98, P.teal, 0.05, 0.5);
  }

  for (let i = 0; i < extra; i++) {
    prism(out, cx + 1.0, cy + 0.1 + i * 0.25, 0.12, 0.1, 0.1, 0.3, 7, P.steel, { tone: 0.9 });
  }

  return { faces: out, lights, steam, height: 1.8 };
}

/* -------------------------------------------------------------------- waste */

function buildWaste(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  const bw = 1.45, bd = 1.3;
  box(out, cx, cy, 0.12, bw, 0.6 + stage * 0.08, bd, P.concreteDark);
  box(out, cx, cy, 0.72 + stage * 0.08, bw * 0.95, 0.08, bd * 0.95, P.concrete);
  box(out, cx + 0.45, cy + bd / 2 + 0.01, 0.3, 0.32, 0.4, 0.03, P.steelDark);
  box(out, cx + 0.45, cy + bd / 2 + 0.03, 0.52, 0.12, 0.08, 0.02, P.amber, { tone: 1.15, glow: 0.4 });

  for (let i = 0; i < Math.min(4, stage + 1); i++) {
    const x = cx - 0.5 + (i % 2) * 0.55;
    const y = cy - 0.4 + Math.floor(i / 2) * 0.5;
    prism(out, x, y, 0.72 + stage * 0.08, 0.14, 0.14, 0.3, 8, P.steelLight);
    prism(out, x, y, 1.02 + stage * 0.08, 0.15, 0.12, 0.035, 8, P.steelDark);
    if (stage >= 3) beacon(lights, x, y, 1.08 + stage * 0.08, P.green, 0.035, i * 0.2);
  }
  if (stage >= 2) {
    fenceLine(out, cx - w / 2 + 0.3, cy + d / 2 - 0.3, cx + w / 2 - 0.3, cy + d / 2 - 0.3, 0.1, P.fence);
    fenceLine(out, cx + w / 2 - 0.3, cy - d / 2 + 0.3, cx + w / 2 - 0.3, cy + d / 2 - 0.3, 0.1, P.fence);
  }
  if (stage >= 3) {
    for (let i = 0; i < 2; i++) {
      box(out, cx - 0.85, cy - 0.55 + i * 0.5, 0.12, 0.34, 1.1, 0.34, P.concreteDark);
      beacon(lights, cx - 0.85, cy - 0.55 + i * 0.5, 1.28, P.alarm, 0.04, i * 0.3);
    }
  }
  if (stage >= 4) {
    dome(out, cx, cy, 0.72 + stage * 0.08, 0.72, 0.5, P.concreteLight, { sides: 10 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      beacon(lights, cx + Math.cos(a) * 0.85, cy + Math.sin(a) * 0.85, 0.2, P.amber, 0.045, i * 0.22);
    }
  }
  if (stage >= 5) {
    prism(out, cx, cy, 1.2, 0.5, 0.34, 0.12, 10, P.steelDark);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      box(out, cx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9, 0.14, 0.08, 0.8, 0.08, P.steelLight);
      beacon(lights, cx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9, 1.0, P.alarm, 0.045, i * 0.2);
    }
    beacon(lights, cx, cy, 1.5, P.green, 0.07, 0.1);
  }

  for (let i = 0; i < extra; i++) {
    box(out, cx - 0.7 + i * 0.22, cy + 0.66, 0.15, 0.12, 0.1, 0.12, P.steel, { tone: 0.9 });
  }

  return { faces: out, lights, steam: [], height: 2.1 };
}

/* ---------------------------------------------------------------------- lab */

function buildLab(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.35, d - 0.35, P.concreteDark);
  if (stage === 1) {
    containerUnit(out, cx, cy, 0.14, 1.2, 0.5, 0.85, P.steel);
  } else if (stage === 2) {
    containerUnit(out, cx - 0.25, cy, 0.14, 1.15, 0.52, 0.85, P.steel);
    box(out, cx + 0.55, cy + 0.18, 0.14, 0.45, 0.62, 0.5, P.concrete);
    windowStrip(out, cx + 0.55, cy + 0.43, 0.38, 0.24, 0.13, P.window, { glow: 0.8 });
  } else {
    box(out, cx, cy, 0.14, 1.5, 0.7 + stage * 0.06, 1.15, P.concreteLight);
    for (let i = 0; i < 4; i++) {
      windowStrip(out, cx - 0.52 + i * 0.34, cy + 0.58, 0.32, 0.24, 0.16, P.window, { glow: 0.85 });
    }
    box(out, cx, cy, 0.84 + stage * 0.06, 1.35, 0.06, 1.0, P.steelDark);
  }
  if (stage >= 2) {
    antenna(out, cx - 0.65, cy - 0.45, 0.14 + (stage >= 3 ? 0.9 : 0.55), 0.8, P.steelLight, { light: P.teal });
    box(out, cx + 0.62, cy - 0.62, 0.68, 0.3, 0.22, 0.04, P.steelLight, { tone: 1.1 });
  }
  if (stage >= 3) {
    box(out, cx + 0.45, cy - 0.35, 0.15, 0.55, 0.95, 0.45, P.steelDark);
    windowStrip(out, cx + 0.45, cy - 0.12, 0.36, 0.38, 0.16, P.teal, { glow: 1 });
    pipe(out, cx - 0.7, cy + 0.5, 0.35, 0.8, 0.06, "x", P.steelLight);
  }
  if (stage >= 4) {
    dome(out, cx - 0.25, cy + 0.2, 0.84 + stage * 0.06, 0.55, 0.48, P.window, { sides: 10, glow: 0.5 });
    prism(out, cx - 0.25, cy + 0.2, 1.28, 0.18, 0.1, 0.16, 8, P.teal, { tone: 1.4, glow: 1 });
    beacon(lights, cx - 0.25, cy + 0.2, 1.52, P.teal, 0.06, 0.2);
  }
  if (stage >= 5) {
    for (let i = 0; i < 3; i++) {
      prism(out, cx, cy + 0.1, 1.3 + i * 0.16, 0.42 - i * 0.08, 0.42 - i * 0.08, 0.03, 10, P.teal, {
        tone: 1.35, glow: 0.8,
      });
    }
    beacon(lights, cx, cy + 0.1, 1.8, P.window, 0.07, 0.4);
    box(out, cx + 0.7, cy + 0.4, 0.15, 0.4, 0.55, 0.4, P.steelDark);
    windowStrip(out, cx + 0.7, cy + 0.61, 0.38, 0.26, 0.12, P.window, { glow: 0.9 });
  }

  for (let i = 0; i < extra; i++) {
    box(out, cx - 0.8 + i * 0.2, cy - 0.55, 0.15, 0.12, 0.1, 0.12, P.teal, { tone: 1.1, glow: 0.5 });
  }

  return { faces: out, lights, steam: [], height: 2.4 };
}

/* ----------------------------------------------------------------- security */

function buildSecurity(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.road);
  const bw = 0.75, bd = 0.65;
  box(out, cx - 0.45, cy + 0.35, 0.14, bw, 0.55, bd, P.concrete);
  box(out, cx - 0.45, cy + 0.35, 0.69, bw * 1.05, 0.07, bd * 1.05, P.steelDark);
  windowStrip(out, cx - 0.45, cy + 0.68, 0.34, 0.32, 0.12, P.windowWarm, { glow: 0.8 });
  box(out, cx - 0.45, cy + 0.35 + bd / 2 + 0.02, 0.17, 0.3, 0.36, 0.03, P.steelDark);

  /* Gate and fence. */
  box(out, cx + 0.05, cy + 0.85, 0.14, 0.04, 0.6, 0.04, P.fence);
  box(out, cx + 0.65, cy + 0.85, 0.14, 0.04, 0.6, 0.04, P.fence);
  box(out, cx + 0.35, cy + 0.85, 0.78, 0.58, 0.04, 0.04, P.amber, { tone: 1.0 });
  fenceLine(out, cx - w / 2 + 0.25, cy - d / 2 + 0.25, cx + w / 2 - 0.25, cy - d / 2 + 0.25, 0.1, P.fence);
  fenceLine(out, cx + w / 2 - 0.25, cy - d / 2 + 0.25, cx + w / 2 - 0.25, cy + d / 2 - 0.25, 0.1, P.fence);

  if (stage >= 2) {
    for (let i = 0; i < 3; i++) {
      box(out, cx - 0.8 + i * 0.8, cy - 0.7, 0.14, 0.05, 0.75, 0.05, P.steelLight);
      box(out, cx - 0.8 + i * 0.8, cy - 0.7, 0.88, 0.16, 0.1, 0.1, P.steelDark);
      beacon(lights, cx - 0.8 + i * 0.8, cy - 0.7, 0.74, P.alarm, 0.035, i * 0.2);
    }
  }
  if (stage >= 3) {
    box(out, cx + 0.55, cy + 0.2, 0.14, 0.7, 0.25, 0.35, P.steelDark);
    windowStrip(out, cx + 0.55, cy + 0.38, 0.3, 0.5, 0.08, P.windowWarm, { glow: 0.6 });
    box(out, cx + 0.55, cy + 0.2, 0.45, 0.2, 0.05, 0.05, P.alarm);
  }
  if (stage >= 4) {
    box(out, cx + 0.7, cy - 0.55, 0.14, 0.3, 1.25, 0.3, P.steelDark);
    box(out, cx + 0.7, cy - 0.55, 1.4, 0.5, 0.08, 0.5, P.steelLight);
    beacon(lights, cx + 0.7, cy - 0.55, 1.55, P.alarm, 0.05, 0.3);
    for (let i = 0; i < 2; i++) {
      box(out, cx - 0.7, cy + 0.8 + i * 0.18, 0.16, 0.18, 0.05, 0.18, P.steelLight);
    }
  }
  if (stage >= 5) {
    dome(out, cx + 0.2, cy - 0.35, 0.9, 0.28, 0.25, P.window, { sides: 8, glow: 0.6 });
    beacon(lights, cx + 0.2, cy - 0.35, 1.2, P.teal, 0.045, 0.1);
    for (let i = 0; i < 3; i++) {
      box(out, cx - 0.7 + i * 0.22, cy + 0.85, 0.2, 0.12, 0.06, 0.12, P.teal, { tone: 1.2, glow: 0.7 });
    }
  }

  for (let i = 0; i < extra; i++) {
    box(out, cx - 0.8 + i * 0.2, cy + 0.8, 0.14, 0.08, 0.08, 0.08, P.steel, { tone: 0.9 });
  }

  return { faces: out, lights, steam: [], height: 2.0 };
}

/* --------------------------------------------------------------------- admin */

function buildAdmin(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  if (stage === 1) {
    containerUnit(out, cx, cy, 0.14, 1.25, 0.5, 0.8, P.concreteLight);
  } else if (stage === 2) {
    box(out, cx, cy, 0.14, 1.3, 0.65, 0.9, P.concrete);
    box(out, cx, cy, 0.79, 1.35, 0.06, 0.95, P.steelDark);
    for (let i = 0; i < 3; i++) windowStrip(out, cx - 0.38 + i * 0.36, cy + 0.46, 0.32, 0.22, 0.14, P.windowWarm, { glow: 0.7 });
  } else {
    const h = 0.85 + stage * 0.2;
    box(out, cx, cy, 0.14, 1.45, h, 1.0, P.concreteLight);
    box(out, cx, cy, 0.14 + h, 1.5, 0.06, 1.05, P.steelDark);
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 4; i++) {
        windowStrip(out, cx - 0.5 + i * 0.33, cy + 0.51, 0.28 + r * 0.38, 0.2, 0.14, P.windowWarm, { glow: 0.7 });
      }
    }
    box(out, cx + 0.82, cy, 0.14, 0.28, h * 0.92, 0.9, P.steelDark);
  }
  if (stage >= 3) {
    groundPad(out, cx + 0.45, cy - 0.62, 0.55, 0.55, P.steelDark, { tone: 0.8 });
    for (let i = 0; i < 3; i++) {
      box(out, cx + 0.3 + i * 0.14, cy - 0.62, 0.16, 0.04, 0.16, 0.04, P.amber, { tone: 1.2 });
    }
  }
  if (stage >= 4) {
    /* Helipad and flag. */
    prism(out, cx - 0.45, cy - 0.55, 0.15, 0.38, 0.38, 0.03, 12, P.steelDark);
    box(out, cx - 0.45, cy - 0.55, 0.19, 0.22, 0.02, 0.22, P.amber, { tone: 1.1 });
    box(out, cx + 0.75, cy - 0.72, 0.16, 0.035, 1.1, 0.035, P.steelLight);
    box(out, cx + 0.85, cy - 0.72, 1.02, 0.18, 0.12, 0.02, P.alarm, { tone: 1.1 });
  }
  if (stage >= 5) {
    box(out, cx + 0.55, cy + 0.45, 0.14, 0.75, 2.2, 0.42, P.steelDark);
    for (let r = 0; r < 5; r++) {
      windowStrip(out, cx + 0.55, cy + 0.67, 0.3 + r * 0.36, 0.5, 0.12, P.window, { glow: 0.85 });
    }
    beacon(lights, cx + 0.55, cy + 0.45, 2.4, P.alarm, 0.05, 0.2);
    beacon(lights, cx - 0.4, cy + 0.5, 1.2, P.windowWarm, 0.04, 0.5);
  }

  for (let i = 0; i < extra; i++) {
    box(out, cx - 0.65 + i * 0.2, cy - 0.55, 0.15, 0.08, 0.08, 0.08, P.amber, { tone: 1.1, glow: 0.4 });
  }

  return { faces: out, lights, steam: [], height: 2.8 };
}


/* --------------------------------------------------------------- auxiliaries */

function buildBattery(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  const rows = 1 + Math.min(3, Math.floor(stage / 2));
  const perRow = stage >= 5 ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perRow; c++) {
      const x = cx - 0.55 + c * 1.05;
      const y = cy - 0.45 + r * 0.5;
      containerUnit(out, x, y, 0.14, 0.75, 0.34 + stage * 0.012, 0.38, P.steel);
      box(out, x, y, 0.5 + stage * 0.012, 0.55, 0.04, 0.3, P.window, { tone: 1.2, glow: 0.7 });
    }
  }
  box(out, cx + 0.75, cy + 0.55, 0.14, 0.5, 0.55 + stage * 0.02, 0.45, P.concrete);
  windowStrip(out, cx + 0.75, cy + 0.78, 0.32, 0.26, 0.12, P.window, { glow: 0.8 });
  if (stage >= 3) {
    lattice(out, cx - 0.85, cy - 0.62, 0.14, 0.22, 1.0 + stage * 0.08, P.steelLight);
    pipes(out, [[cx - 0.55, cy + 0.55, 0.3], [cx + 0.8, cy + 0.55, 0.3]], 0.03, P.amber, { tone: 1.1 });
  }
  if (stage >= 5) {
    box(out, cx - 0.8, cy + 0.62, 0.14, 0.4, 0.4, 0.35, P.steelDark);
    beacon(lights, cx - 0.8, cy + 0.62, 0.6, P.teal, 0.04, 0.2);
  }
  if (stage >= 7) {
    box(out, cx + 0.2, cy - 0.68, 0.14, 0.8, 0.55, 0.35, P.steelDark);
    windowStrip(out, cx + 0.2, cy - 0.49, 0.34, 0.5, 0.1, P.window, { glow: 0.8 });
  }
  for (let i = 0; i < extra; i++) {
    box(out, cx - 0.75 + i * 0.2, cy + 0.7, 0.15, 0.12, 0.1, 0.12, P.amber, { tone: 1.1, glow: 0.5 });
  }
  return { faces: out, lights, steam: [], height: 1.7 };
}

function buildPump(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const steam = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  groundPad(out, cx + 0.35, cy + 0.2, 1.0, 1.0, P.water, { tone: 0.9 });
  box(out, cx - 0.55, cy - 0.2, 0.14, 0.75, 0.5 + stage * 0.05, 0.65, P.concrete);
  gable(out, cx - 0.55, cy - 0.2, 0.64 + stage * 0.05, 0.75, 0.65, 0.16, P.steelDark);
  windowStrip(out, cx - 0.55, cy + 0.13, 0.35, 0.3, 0.11, P.window, { glow: 0.7 });
  tank(out, cx + 0.8, cy - 0.5, 0.14, 0.24, 0.5 + stage * 0.04, P.steel, { tone: 0.92 });
  if (stage >= 2) {
    pipes(out, [[cx - 0.15, cy - 0.55, 0.25], [cx + 0.4, cy - 0.55, 0.25], [cx + 0.4, cy + 0.2, 0.25]], 0.09, P.steel);
    box(out, cx + 0.35, cy + 0.2, 0.14, 0.5, 0.18, 0.5, P.steelDark);
  }
  if (stage >= 4) {
    tank(out, cx + 0.1, cy + 0.75, 0.14, 0.3, 0.65, P.steelLight, { tone: 0.9 });
    beacon(lights, cx + 0.1, cy + 0.75, 0.85, P.teal, 0.04, 0.3);
  }
  if (stage >= 6) {
    box(out, cx - 0.85, cy + 0.65, 0.14, 0.35, 0.55, 0.35, P.concreteDark);
    smoke(steam, cx + 0.8, cy - 0.5, 0.75, 0.12, 0.35);
  }
  for (let i = 0; i < extra; i++) {
    pipe(out, cx - 0.8 + i * 0.22, cy + 0.6, 0.2, 0.45, 0.04, "x", P.steelDark);
  }
  return { faces: out, lights, steam, height: 2.0 };
}

function buildSolar(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  const rows = 1 + Math.min(4, stage);
  for (let r = 0; r < rows; r++) {
    const y = cy - 0.55 + (r % 3) * 0.45;
    const x = cx - 0.55 + Math.floor(r / 3) * 0.95;
    box(out, x, y, 0.18, 0.8, 0.04, 0.34, P.window, { tone: 1.25, glow: 0.55 });
    box(out, x - 0.3, y, 0.12, 0.04, 0.22, 0.04, P.steelLight);
    box(out, x + 0.3, y, 0.12, 0.04, 0.22, 0.04, P.steelLight);
  }
  box(out, cx + 0.85, cy + 0.55, 0.14, 0.38, 0.5 + stage * 0.02, 0.4, P.steelDark);
  windowStrip(out, cx + 0.85, cy + 0.76, 0.24, 0.18, 0.1, P.windowWarm, { glow: 0.8 });
  if (stage >= 3) {
    lattice(out, cx - 0.85, cy - 0.65, 0.14, 0.18, 0.8 + stage * 0.06, P.steelLight);
    beacon(lights, cx - 0.85, cy - 0.65, 0.98, P.amber, 0.04, 0.2);
  }
  if (stage >= 5) {
    dome(out, cx + 0.1, cy + 0.75, 0.14, 0.3, 0.25, P.windowWarm, { sides: 8, glow: 0.6 });
    beacon(lights, cx + 0.1, cy + 0.75, 0.5, P.amber, 0.04, 0.4);
  }
  for (let i = 0; i < extra; i++) {
    box(out, cx - 0.7 + i * 0.2, cy + 0.65, 0.15, 0.14, 0.04, 0.3, P.window, { tone: 1.2, glow: 0.4 });
  }
  return { faces: out, lights, steam: [], height: 1.2 };
}

function buildGeothermal(zone, level, stage) {
  const { cx, cy, w, d } = geo(zone);
  const P = zone.palette;
  const out = [];
  const lights = [];
  const steam = [];
  const extra = level - STAGE_LEVELS[stage - 1];

  groundPad(out, cx, cy, w - 0.3, d - 0.3, P.concreteDark);
  prism(out, cx - 0.7, cy - 0.35, 0.14, 0.24, 0.15, 0.55 + stage * 0.05, 8, P.steelDark);
  box(out, cx - 0.7, cy - 0.35, 0.7 + stage * 0.05, 0.5, 0.08, 0.5, P.steelLight);
  pipes(out, [[cx - 0.7, cy - 0.1, 0.4], [cx - 0.1, cy - 0.1, 0.4], [cx - 0.1, cy + 0.45, 0.4]], 0.11, P.steel);
  box(out, cx + 0.35, cy + 0.3, 0.14, 0.7, 0.5 + stage * 0.04, 0.5, P.concrete);
  gable(out, cx + 0.35, cy + 0.3, 0.64 + stage * 0.04, 0.7, 0.5, 0.14, P.steelDark);
  windowStrip(out, cx + 0.35, cy + 0.56, 0.3, 0.22, 0.1, P.windowWarm, { glow: 0.7 });
  smoke(steam, cx - 0.7, cy - 0.35, 0.8 + stage * 0.05, 0.16, 0.7);
  if (stage >= 3) {
    tank(out, cx + 0.75, cy - 0.4, 0.14, 0.22, 0.5, P.steel, { tone: 0.9 });
    beacon(lights, cx + 0.75, cy - 0.4, 0.7, P.amber, 0.04, 0.3);
  }
  if (stage >= 5) {
    box(out, cx - 0.1, cy + 0.8, 0.14, 0.4, 0.35, 0.3, P.steelDark);
    smoke(steam, cx - 0.1, cy + 0.8, 0.5, 0.13, 0.5);
  }
  for (let i = 0; i < extra; i++) {
    pipe(out, cx - 0.7 + i * 0.2, cy + 0.65, 0.25, 0.4, 0.04, "x", P.steelDark);
  }
  return { faces: out, lights, steam, height: 2.3 };
}

/* Stages six through eight: a shared annex, a glass/telemetry band and a
 * role-specific signature piece. The older builders already grow with
 * `stage`; this layer makes the last three silhouettes unmistakable. */
function addLateStage(model, zone, stage, level, cx, cy, w, d, p) {
  model.lights = model.lights || [];
  model.steam = model.steam || [];
  model.rotors = model.rotors || [];
  if (stage < 6) return model;
  box(model.faces, cx - w / 2 + 0.38, cy + d / 2 - 0.35, 0.13, 0.62, 0.62, 0.46, p.concreteDark);
  box(model.faces, cx - w / 2 + 0.38, cy + d / 2 - 0.35, 0.76, 0.5, 0.1, 0.35, p.concrete);
  if (stage >= 7) {
    windowStrip(model.faces, cx - w / 2 + 0.38, cy + d / 2 - 0.11, 0.46, 0.38, 0.12, p.window, { glow: 0.85 });
    lattice(model.faces, cx + w / 2 - 0.28, cy - d / 2 + 0.3, 0.15, 0.2, 1.1, p.steelLight);
    beacon(model.lights, cx + w / 2 - 0.28, cy - d / 2 + 0.3, 1.3, p.alarm, 0.05, 0.3);
  }
  if (stage >= 8) {
    const role = zone.role;
    if (role === "heat") {
      prism(model.faces, cx, cy, 2.2, 0.6, 0.6, 0.05, 10, p.teal, { tone: 1.35, glow: 0.8 });
      prism(model.faces, cx, cy, 2.38, 0.42, 0.42, 0.05, 10, p.steelLight, { tone: 1.2 });
      beacon(model.lights, cx, cy, 2.55, p.teal, 0.07, 0.1);
    } else if (role === "cooling") {
      tower(model.faces, cx + 0.55, cy + 0.6, 0.2, 0.34, 1.8, p.concreteLight, { rim: p.steelLight, inner: p.steelDark });
      smoke(model.steam, cx + 0.55, cy + 0.6, 2.1, 0.15, 0.7);
    } else if (role === "conversion") {
      box(model.faces, cx + 0.15, cy + d / 2 + 0.03, 0.2, 0.6, 0.5, 0.04, p.window, { tone: 1.2, glow: 0.9 });
      model.rotors.push({ x: cx, y: cy + d / 2 + 0.05, z: 0.55, r: 0.32, speed: 1.8 });
    } else if (role === "grid") {
      lattice(model.faces, cx + 0.2, cy + 0.4, 0.16, 0.32, 2.2, p.steelLight, { thickness: 0.04 });
      beacon(model.lights, cx + 0.2, cy + 0.4, 2.45, p.alarm, 0.05, 0.5);
    } else if (role === "control") {
      antenna(model.faces, cx + 0.25, cy - 0.25, 1.6, 1.1, p.steelLight, { light: p.teal });
      dome(model.faces, cx - 0.4, cy + 0.15, 1.6, 0.28, 0.2, p.teal, { sides: 8, glow: 0.8 });
    } else if (role === "fuel") {
      crane(model.faces, cx - 0.65, cy - 0.6, 0.2, 1.6, 0.8, p.amber);
      tank(model.faces, cx + 0.65, cy + 0.6, 0.2, 0.3, 0.7, p.steel, { tone: 0.9 });
    } else if (role === "waste") {
      dome(model.faces, cx, cy, 1.35, 0.62, 0.38, p.concreteLight, { sides: 10 });
      beacon(model.lights, cx, cy, 1.78, p.green, 0.06, 0.2);
    } else if (role === "research") {
      for (let i = 0; i < 3; i++) {
        prism(model.faces, cx, cy + 0.2, 1.75 + i * 0.14, 0.42 - i * 0.08, 0.42 - i * 0.08, 0.03, 10, p.teal, { tone: 1.3, glow: 0.8 });
      }
      beacon(model.lights, cx, cy + 0.2, 2.2, p.window, 0.07, 0.4);
    } else if (role === "security") {
      lattice(model.faces, cx + 0.55, cy - 0.55, 0.16, 0.22, 1.8, p.steelLight);
      beacon(model.lights, cx + 0.55, cy - 0.55, 2.0, p.alarm, 0.05, 0.3);
    } else if (role === "admin") {
      box(model.faces, cx + 0.45, cy + 0.35, 0.15, 0.45, 1.5, 0.35, p.steelDark);
      windowStrip(model.faces, cx + 0.45, cy + 0.53, 0.9, 0.25, 0.1, p.window, { glow: 0.8 });
      beacon(model.lights, cx + 0.45, cy + 0.35, 1.8, p.amber, 0.05, 0.4);
    } else if (role === "battery") {
      containerUnit(model.faces, cx - 0.7, cy - 0.7, 0.14, 0.8, 0.45, 0.4, p.steelDark);
      beacon(model.lights, cx - 0.7, cy - 0.7, 0.65, p.teal, 0.05, 0.2);
    } else if (role === "output") {
      for (let i = 0; i < 3; i++) {
        box(model.faces, cx - 0.7 + i * 0.5, cy - 0.7, 0.14, 0.4, 0.04, 0.3, p.window, { tone: 1.25, glow: 0.6 });
      }
    } else if (role === "geothermal") {
      pipes(model.faces, [[cx - 0.8, cy - 0.7, 0.3], [cx + 0.8, cy - 0.7, 0.3]], 0.06, p.steel);
      smoke(model.steam, cx - 0.8, cy - 0.7, 1.1, 0.14, 0.6);
    }
  }
  return model;
}

const BUILDERS = {
  reactor: buildReactor,
  cooling: buildCooling,
  turbine: buildTurbine,
  substation: buildSubstation,
  control: buildControl,
  fuel: buildFuel,
  waste: buildWaste,
  lab: buildLab,
  security: buildSecurity,
  admin: buildAdmin,
  battery: buildBattery,
  pump: buildPump,
  solar: buildSolar,
  geothermal: buildGeothermal,
};

const cache = new Map();

export function buildZoneModel(zoneOrId, level, siteKey = "core9") {
  const zone = typeof zoneOrId === "string" ? ZONE_BY_ID[zoneOrId] : zoneOrId;
  if (!zone) return null;
  if (!level || level < 1) return null;
  const key = siteKey + ":" + zone.id + ":" + level;
  if (cache.has(key)) return cache.get(key);
  const stage = stageForLevel(level);
  const builder = BUILDERS[zone.id];
  if (!builder) return null;
  const g = geo(zone);
  const model = builder(zone, level, stage);
  addLateStage(model, zone, stage, level, g.cx, g.cy, g.w, g.d, zone.palette);
  model.zone = zone;
  model.level = level;
  model.stage = stage;
  cache.set(key, model);
  return model;
}

export function clearModelCache() {
  cache.clear();
}

export function zoneCenter(zone) {
  return geo(zone);
}

/* A few static decorations that make the plant feel inhabited. They are
 * drawn with the same primitives and are cheap enough to rebuild once. */
export function buildSiteProps(siteDef = null) {
  const out = [];
  const p = siteDef && siteDef.palette ? siteDef.palette : { steel: "#6c7d84", green: "#9bcf7a", trunk: "#5a4a34" };
  const sand = siteDef && siteDef.id === "solaris";
  const snow = siteDef && siteDef.id === "glacier";
  if (sand) {
    for (let i = 0; i < 12; i++) {
      const x = 0.8 + (i % 6) * 1.9;
      const y = 14.7 + (i % 2) * 0.3;
      prism(out, x, y, 0, 0.22, 0.02, 0.18, 5, p.soil || "#8f7448");
      prism(out, x + 0.3, y + 0.1, 0, 0.12, 0.02, 0.1, 4, p.steelDark || "#48443d");
    }
  } else if (snow) {
    for (let i = 0; i < 10; i++) {
      const x = 0.8 + (i % 5) * 2.2;
      const y = 14.7 + (i % 2) * 0.3;
      box(out, x, y, 0, 0.06, 0.6, 0.06, p.steelLight || "#c2d8dd");
      prism(out, x, y + 0.05, 0.55, 0.12, 0.01, 0.18, 5, "#ffffff");
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const x = 0.9 + (i % 7) * 1.75;
      const y = 14.7 + (i % 2) * 0.35;
      box(out, x, y, 0, 0.08, 0.5, 0.08, p.trunk || "#5a4a34");
      prism(out, x, y, 0.4, 0.34, 0.02, 0.55, 6, p.green || "#9bcf7a");
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = 0.6 + (i % 4) * 2.8;
    const y = 0.55;
    box(out, x, y, 0, 0.06, 0.32, 0.06, p.steel);
    box(out, x, y, 0.32, 0.22, 0.02, 0.02, p.steel);
  }
  return { faces: out };
}
