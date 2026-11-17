/* Procedural terrain for the expanded Machine Hunt world.
 *
 * Features are generated deterministically from a seed, bucketed on a spatial
 * grid for cheap view culling, and drawn as volumetric brick-world props with
 * the same upper-left light used by the character models. No DOM needed for
 * generation or culling (tests import those directly).
 */
import { WORLD } from "./data.js";
import { shadeFace } from "./models.js";

const TAU = Math.PI * 2;
const BUCKET = 360;

function makeRng(seed) {
  let n = seed >>> 0;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const ZONES = Object.freeze([
  { key: "highlands", from: 0, to: 810, label: "Highlands" },
  { key: "ruins", from: 810, to: 1620, label: "Old Ruins" },
  { key: "forest", from: 1620, to: 2430, label: "Greenwood" },
  { key: "river", from: 2430, to: WORLD.height, label: "River Vale" },
]);

const MIXES = Object.freeze({
  highlands: ["rock", "boulder", "crystal", "mushroom", "pine", "grass"],
  ruins: ["column", "arch", "brokenWall", "banner", "boulder", "grass", "mushroom"],
  forest: ["tree", "pine", "bush", "grass", "flowers", "mushroom", "rock"],
  river: ["pool", "reeds", "bridge", "boulder", "waterfallProp", "tree", "flowers"],
});

export function zoneAt(y) {
  return ZONES.find((z) => y >= z.from && y < z.to) || ZONES[ZONES.length - 1];
}

/** Pure: deterministic terrain map for a seed. */
export function generateTerrain(seed = 1) {
  const rng = makeRng(seed ^ 0x5eed);
  const features = [];
  const buckets = new Map();
  ZONES.forEach((zone, zi) => {
    const count = 88;
    for (let i = 0; i < count; i++) {
      const x = 60 + rng() * (WORLD.width - 120);
      const y = zone.from + 36 + rng() * (zone.to - zone.from - 72);
      const mix = MIXES[zone.key];
      const type = mix[Math.floor(rng() * mix.length)];
      const f = {
        x, y, type, zone: zone.key,
        scale: 0.62 + rng() * 0.46,
        seed: Math.floor(rng() * 1e9),
        id: zi * 1000 + i,
      };
      features.push(f);
      const bx = Math.floor(x / BUCKET);
      const by = Math.floor(y / BUCKET);
      const key = `${bx}|${by}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(f);
    }
  });
  return { features, buckets, seed };
}

/** Pure: features whose bucket overlaps the given world-space rectangle. */
export function featuresInView(map, left, top, right, bottom) {
  const out = [];
  const x0 = Math.floor((left - 80) / BUCKET);
  const x1 = Math.floor((right + 80) / BUCKET);
  const y0 = Math.floor((top - 80) / BUCKET);
  const y1 = Math.floor((bottom + 80) / BUCKET);
  for (let bx = x0; bx <= x1; bx++) {
    for (let by = y0; by <= y1; by++) {
      const bucket = map.buckets.get(`${bx}|${by}`);
      if (!bucket) continue;
      for (const f of bucket) {
        if (f.x >= left - 90 && f.x <= right + 90 && f.y >= top - 120 && f.y <= bottom + 60) {
          out.push(f);
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ drawing */

function poly(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}
function disc(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
  ctx.fill();
}
function oval(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  ctx.fill();
}
function line(ctx, x1, y1, x2, y2, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function brick(ctx, x, y, w, h, color, studs = 0) {
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fillRect(x + 2, y + 3, w, h);
  ctx.fillStyle = shadeFace(color, "front", 1.05);
  ctx.fillRect(x, y, w, h);
  poly(ctx, [[x, y], [x + w * 0.12, y - h * 0.16], [x + w * 1.12, y - h * 0.16], [x + w, y]],
    shadeFace(color, "top", 1.2));
  poly(ctx, [[x + w, y], [x + w * 1.12, y - h * 0.16], [x + w * 1.12, y + h * 0.84], [x + w, y + h]],
    shadeFace(color, "side", 0.8));
  for (let i = 0; i < studs; i++) {
    disc(ctx, x + (w / studs) * (i + 0.5) + w * 0.06, y - h * 0.08, Math.min(4, w / studs / 3),
      shadeFace(color, "top", 1.35));
  }
}
function foliage(ctx, x, y, r, color) {
  oval(ctx, x, y, r * 1.15, r * 0.62, shadeFace(color, "side", 0.82));
  oval(ctx, x - r * 0.1, y - r * 0.16, r, r * 0.62, shadeFace(color, "top", 1.16));
  oval(ctx, x + r * 0.25, y - r * 0.1, r * 0.62, r * 0.44, shadeFace(color, "top", 1.3));
}

function drawTree(ctx, f, t, dark) {
  const s = f.scale;
  brick(ctx, -8 * s, -66 * s, 16 * s, 66 * s, "#6a4a32", 0);
  const sway = dark && !reducedMotionFlag ? Math.sin(t * 0.8 + f.seed) * 2 : 0;
  foliage(ctx, sway, -86 * s, 34 * s, "#2e6b43");
  foliage(ctx, -22 * s + sway, -70 * s, 24 * s, "#235239");
  foliage(ctx, 22 * s + sway, -72 * s, 25 * s, "#3f8352");
}
function drawPine(ctx, f) {
  const s = f.scale;
  brick(ctx, -6 * s, -54 * s, 12 * s, 54 * s, "#5a3a2a", 0);
  for (let i = 0; i < 3; i++) {
    const w = (40 - i * 9) * s;
    const y = -54 * s - i * 20 * s;
    poly(ctx, [[-w, y], [0, y - 38 * s], [w, y]], shadeFace(i ? "#235239" : "#2e6b43", "top", 1 + i * 0.1));
    poly(ctx, [[0, y - 38 * s], [w, y], [w * 0.3, y]], shadeFace("#1d4433", "side", 0.9));
  }
}
function drawBush(ctx, f) {
  const s = f.scale;
  foliage(ctx, -14 * s, -10 * s, 18 * s, "#3f8352");
  foliage(ctx, 14 * s, -12 * s, 16 * s, "#2e6b43");
  foliage(ctx, 0, -18 * s, 20 * s, "#4f955d");
}
function drawRock(ctx, f) {
  const s = f.scale;
  poly(ctx, [[-26 * s, 0], [-18 * s, -24 * s], [10 * s, -30 * s], [30 * s, -6 * s], [22 * s, 0]], "#7d8a7a");
  poly(ctx, [[10 * s, -30 * s], [30 * s, -6 * s], [38 * s, -12 * s], [18 * s, -34 * s]], "#5f6c60");
  poly(ctx, [[-18 * s, -24 * s], [10 * s, -30 * s], [18 * s, -34 * s], [-10 * s, -28 * s]], "#a4b0a0");
}
function drawBoulder(ctx, f) {
  const s = f.scale * 1.35;
  drawRock(ctx, { ...f, scale: s });
  disc(ctx, -8 * s, -14 * s, 3 * s, "rgba(120,180,110,.5)");
}
function drawCrystal(ctx, f, t) {
  const s = f.scale;
  const pulse = 0.6 + 0.4 * Math.sin(t * 1.6 + f.seed);
  ctx.fillStyle = `rgba(127,227,255,${0.18 * pulse})`;
  ctx.beginPath(); ctx.arc(0, -20 * s, 46 * s, 0, TAU); ctx.fill();
  poly(ctx, [[-10 * s, 0], [-4 * s, -42 * s], [6 * s, -34 * s], [12 * s, 0]], "#7fe3ff");
  poly(ctx, [[-4 * s, -42 * s], [6 * s, -34 * s], [2 * s, -46 * s]], "#d8f8ff");
}
function drawMushroom(ctx, f) {
  const s = f.scale;
  brick(ctx, -4 * s, -18 * s, 8 * s, 18 * s, "#e8dcc0", 0);
  poly(ctx, [[-18 * s, -18 * s], [0, -34 * s], [18 * s, -18 * s]], "#c44536");
  disc(ctx, -6 * s, -22 * s, 3 * s, "#f7e6c8");
  disc(ctx, 7 * s, -24 * s, 2.5 * s, "#f7e6c8");
}
function drawGrass(ctx, f) {
  const s = f.scale;
  ctx.strokeStyle = "#4f8a55";
  ctx.lineWidth = 2 * s;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5 * s, 0);
    ctx.quadraticCurveTo(i * 5 * s + 3 * s, -8 * s, i * 5 * s, -16 * s);
    ctx.stroke();
  }
}
function drawFlowers(ctx, f) {
  const s = f.scale;
  drawGrass(ctx, f);
  disc(ctx, -10 * s, -18 * s, 3 * s, "#f2c14e");
  disc(ctx, 8 * s, -22 * s, 3 * s, "#ff8b5c");
  disc(ctx, 0, -14 * s, 2.5 * s, "#d9e2e8");
}
function drawColumn(ctx, f) {
  const s = f.scale;
  brick(ctx, -16 * s, -78 * s, 32 * s, 78 * s, "#9aa08c", 3);
  brick(ctx, -22 * s, -86 * s, 44 * s, 10 * s, "#b0b6a0", 3);
  brick(ctx, -20 * s, -4 * s, 40 * s, 8 * s, "#858b78", 2);
}
function drawArch(ctx, f) {
  const s = f.scale;
  brick(ctx, -46 * s, -78 * s, 18 * s, 78 * s, "#9aa08c", 2);
  brick(ctx, 28 * s, -78 * s, 18 * s, 78 * s, "#9aa08c", 2);
  poly(ctx, [[-52 * s, -78 * s], [-37 * s, -118 * s], [37 * s, -118 * s], [52 * s, -78 * s]],
    shadeFace("#9aa08c", "top", 1.15));
  poly(ctx, [[-52 * s, -78 * s], [52 * s, -78 * s], [46 * s, -70 * s], [-46 * s, -70 * s]], "#7d8473");
}
function drawBrokenWall(ctx, f) {
  const s = f.scale;
  for (let i = 0; i < 4; i++) {
    const h = (i % 2 ? 26 : 40) * s;
    brick(ctx, -44 * s + i * 24 * s, -h, 22 * s, h, i % 2 ? "#8d9a78" : "#a0a68f", 2);
  }
}
function drawBanner(ctx, f, t) {
  const s = f.scale;
  brick(ctx, -8 * s, -96 * s, 16 * s, 96 * s, "#6b4a30", 0);
  const wave = reducedMotionFlag ? 0 : Math.sin(t * 1.2 + f.seed) * 5;
  poly(ctx, [[0, -92 * s], [38 * s, -86 * s + wave], [34 * s, -44 * s + wave], [0, -50 * s]], "#8c3b2f");
  disc(ctx, 18 * s, -68 * s + wave / 2, 7 * s, "#f2c14e");
}
function drawTent(ctx, f) {
  const s = f.scale;
  poly(ctx, [[-38 * s, 0], [0, -56 * s], [38 * s, 0]], "#b9794a");
  poly(ctx, [[0, -56 * s], [38 * s, 0], [10 * s, 0]], "#8c3b2f");
  poly(ctx, [[-6 * s, 0], [0, -34 * s], [6 * s, 0]], "#3b2a22");
}
function drawPool(ctx, f, t) {
  const s = f.scale;
  oval(ctx, 0, 0, 54 * s, 24 * s, "#2d6f86");
  oval(ctx, -6 * s, -3 * s, 40 * s, 16 * s, "#4fa8c4");
  if (!reducedMotionFlag) {
    const r = ((t * 18 + f.seed) % 30) * s;
    ctx.strokeStyle = "rgba(220,250,255,.4)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42, 0, 0, TAU); ctx.stroke();
  }
}
function drawReeds(ctx, f) {
  const s = f.scale;
  ctx.strokeStyle = "#6fbf5a";
  ctx.lineWidth = 2.5 * s;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 7 * s, 0);
    ctx.lineTo(i * 7 * s + Math.sin(f.seed + i) * 5 * s, -28 * s - (i % 2) * 10 * s);
    ctx.stroke();
  }
}
function drawBridge(ctx, f) {
  const s = f.scale;
  brick(ctx, -56 * s, -12 * s, 112 * s, 10 * s, "#8a6a45", 6);
  for (let i = -1; i <= 1; i += 2) {
    line(ctx, i * 50 * s, -12 * s, i * 50 * s, 10 * s, "#6a4a32", 5 * s);
    line(ctx, i * 44 * s, -34 * s, i * 50 * s, -12 * s, "#8a6a45", 4 * s);
    line(ctx, i * 56 * s, -34 * s, i * 50 * s, -12 * s, "#8a6a45", 4 * s);
  }
  line(ctx, -54 * s, -34 * s, 54 * s, -34 * s, "#8a6a45", 3 * s);
}
function drawWaterfallProp(ctx, f, t) {
  const s = f.scale;
  poly(ctx, [[-30 * s, 0], [-22 * s, -60 * s], [22 * s, -60 * s], [30 * s, 0]], "#5f6c60");
  ctx.fillStyle = "rgba(143,216,232,.55)";
  ctx.fillRect(-10 * s, -60 * s, 20 * s, 60 * s);
  if (!reducedMotionFlag) {
    for (let i = 0; i < 4; i++) {
      const y = -56 * s + ((t * 70 + i * 17 + f.seed) % 56) * s;
      disc(ctx, -6 * s + (i % 2) * 12 * s, y, 2 * s, "rgba(220,250,255,.8)");
    }
  }
}

let reducedMotionFlag = false;
export function setTerrainReducedMotion(value) {
  reducedMotionFlag = !!value;
}

const DRAWERS = Object.freeze({
  tree: drawTree, pine: drawPine, bush: drawBush, rock: drawRock, boulder: drawBoulder,
  crystal: drawCrystal, mushroom: drawMushroom, grass: drawGrass, flowers: drawFlowers,
  column: drawColumn, arch: drawArch, brokenWall: drawBrokenWall, banner: drawBanner,
  tent: drawTent, pool: drawPool, reeds: drawReeds, bridge: drawBridge,
  waterfallProp: drawWaterfallProp,
});

/** Draw one feature with its feet at the current origin. */
export function drawFeature(ctx, f, t, theme) {
  const draw = DRAWERS[f.type];
  if (!draw) return;
  ctx.save();
  draw(ctx, f, t, theme);
  ctx.restore();
}
