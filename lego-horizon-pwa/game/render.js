/* Procedural 2.5D Canvas art for Machine Hunt.
 *
 * The simulation is a plain top-down 2D world; everything here is drawn
 * through a perspective camera (see projection.js): a trapezoid ground plane,
 * a horizon, and upright sprites anchored to their ground point and sorted
 * from far to near. Original brick-world shapes only. */
import { ARENA, GRID, VILLAGERS, VILLAGE_ITEMS, BIOMES, HAZARDS } from "./data.js";
import { project, unproject, rowExtent, edgesAtScreenY, parallaxFor, CAMERA } from "./projection.js";
import { drawModel, FRAME_COUNT } from "./models.js";

const TAU = Math.PI * 2;
const W = ARENA.width;
const H = ARENA.height;

export { unproject };

let palette = "default";
let qualityLevel = "high";
let reducedMotion = false;

export function setPalette(name) {
  palette = ["default", "colorblind", "contrast"].includes(name) ? name : "default";
  cache.clear();
}
export function setQualityLevel(tier) {
  qualityLevel = ["low", "medium", "high"].includes(tier) ? tier : "high";
  cache.clear();
}
export function setReducedMotion(value) {
  reducedMotion = !!value;
}

const fine = () => qualityLevel !== "low";
const cache = new Map();

/* Older Safari lacks roundRect; keep the game dependency-free. */
if (typeof CanvasRenderingContext2D !== "undefined" &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
    return this;
  };
}

/* ------------------------------------------------------------------ colour */

function rgb(hex) {
  if (typeof hex !== "string" || hex[0] !== "#") return [255, 255, 255];
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function shade(hex, amount) {
  const [r, g, b] = rgb(hex);
  const c = (v) => Math.max(0, Math.min(255, v + amount));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function makeRng(seed) {
  let n = seed >>> 0;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

/* ------------------------------------------------------------------ shapes */

function disc(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
function oval(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  ctx.fill();
}
function strokeLine(ctx, x1, y1, x2, y2, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function polygon(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}
function glow(ctx, x, y, r, color, strength = 0.8) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, strength));
  g.addColorStop(0.4, rgba(color, strength * 0.32));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
function eye(ctx, x, y, r, color = "#6fd8ff") {
  glow(ctx, x, y, r * 3.2, color, 0.5);
  disc(ctx, x, y, r, shade(color, -70));
  disc(ctx, x - r * 0.25, y - r * 0.25, r * 0.45, shade(color, 70));
}
function plate(ctx, x, y, w, h, color, studs = 2, opts = {}) {
  const r = Math.min(opts.radius ?? 6, w / 2, h / 2);
  ctx.fillStyle = rgba("#020a08", 0.3);
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 3, w, h, r);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, shade(color, 28));
  g.addColorStop(0.48, color);
  g.addColorStop(1, shade(color, -38));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.fillStyle = rgba("#ffffff", 0.16);
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, Math.max(3, h * 0.13), r * 0.6);
  ctx.fill();
  if (opts.outline !== false) {
    ctx.strokeStyle = rgba("#071418", 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();
  }
  if (studs > 0) {
    const step = w / studs;
    const sr = Math.min(7, step * 0.27, h * 0.22);
    for (let i = 0; i < studs; i++) {
      const cx = x + step * (i + 0.5);
      const cy = y + Math.min(8, h * 0.26);
      disc(ctx, cx, cy, sr, shade(color, 34));
      disc(ctx, cx - sr * 0.22, cy - sr * 0.22, sr * 0.5, rgba("#ffffff", 0.42));
    }
  }
}

/* Ground shadow flattened onto the perspective plane. */
function groundShadow(ctx, x, y, radius, alpha = 0.38) {
  const p = project(x, y, 0);
  oval(ctx, p.x, p.y + 2, radius * p.scale * 1.15, radius * p.scale * 0.42,
    rgba("#020a08", alpha));
}

/* Draw an upright sprite whose feet are anchored at world (x, y). */
function actor(ctx, x, y, draw) {
  const p = project(x, y, 0);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.scale, p.scale);
  draw(p);
  ctx.restore();
}

/* --------------------------------------------------------------- backdrops */

const THEMES = {
  hub: {
    sun: "#ffe2a0", ridge: ["#22513b", "#173c2c", "#0f2a20"],
    ground: "#173a2b", mote: "#ffe4a0", haze: "rgba(255,232,180,.10)",
    cloud: "rgba(245,240,210,.10)",
  },
  jungle: {
    sun: "#ffeeb0", ridge: ["#255a41", "#1a4433", "#102c22"],
    ground: "#123129", mote: "#bfe8a0", haze: "rgba(215,245,200,.09)",
    cloud: "rgba(220,245,220,.09)",
  },
  village: {
    sun: "#ffd08a", ridge: ["#6b5b57", "#4c4446", "#2f2f35"],
    ground: "#2b2b30", mote: "#ffd08a", haze: "rgba(255,214,160,.12)",
    cloud: "rgba(255,225,190,.12)",
  },
  desert: {
    sun: "#ffe3a4", ridge: ["#a95c38", "#82402c", "#572b24"],
    ground: "#5c3126", mote: "#ffb46a", haze: "rgba(255,205,140,.13)",
    cloud: "rgba(255,210,160,.08)",
  },
  cauldron: {
    sun: "#7fe3ff", ridge: ["#173846", "#102a38", "#0a1c28"],
    ground: "#0b2230", mote: "#7fe3ff", haze: "rgba(120,220,255,.10)",
    cloud: "rgba(140,220,255,.06)",
  },
};
function themeFor(mode, biome) {
  return THEMES[mode === "hub" ? "hub" : biome] || THEMES.jungle;
}

function paintGround(ctx, theme) {
  /* Fill everything below the horizon first: the trapezoid play area sits on
   * top of a continuous ground plane, so there is no dark transparent gap. */
  const surround = ctx.createLinearGradient(0, CAMERA.horizon, 0, H);
  surround.addColorStop(0, shade(theme.ground, 14));
  surround.addColorStop(1, shade(theme.ground, -38));
  ctx.fillStyle = surround;
  ctx.fillRect(0, CAMERA.horizon, W, H - CAMERA.horizon);

  const far = rowExtent(0);
  const g = ctx.createLinearGradient(0, CAMERA.horizon, 0, H);
  g.addColorStop(0, shade(theme.ground, 26));
  g.addColorStop(0.35, theme.ground);
  g.addColorStop(1, shade(theme.ground, -26));
  polygon(ctx, [
    [far.left, far.y], [far.right, far.y], [W, H], [0, H],
  ], g);

  /* converging grid */
  ctx.strokeStyle = "rgba(210,245,230,.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) {
    const a = project(x, 0, 0);
    const b = project(x, H, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    const a = project(0, y, 0);
    const b = project(W, y, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  const c1 = project(5, 5, 0), c2 = project(W - 5, 5, 0);
  const c3 = project(W - 5, H - 5, 0), c4 = project(5, H - 5, 0);
  ctx.strokeStyle = "rgba(164,208,7,.42)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y); ctx.closePath();
  ctx.stroke();

  /* distance fog */
  const fog = ctx.createLinearGradient(0, CAMERA.horizon, 0, CAMERA.horizon + 190);
  fog.addColorStop(0, rgba(theme.ground, 0.95));
  fog.addColorStop(1, rgba(theme.ground, 0));
  ctx.fillStyle = fog;
  ctx.fillRect(0, CAMERA.horizon, W, 190);
}

function paintStatic(ctx, mode, biome, night) {
  const theme = themeFor(mode, biome);
  const base = BIOMES[biome]?.sky || BIOMES.jungle.sky;
  const sky = ctx.createLinearGradient(0, 0, 0, CAMERA.horizon + 80);
  sky.addColorStop(0, base[0]);
  sky.addColorStop(0.55, base[1]);
  sky.addColorStop(1, base[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, CAMERA.horizon + 80);

  const sx = mode === "hub" ? 380 : biome === "desert" ? 430 : 400;
  const sy = biome === "cauldron" ? 150 : 170;
  if (biome !== "cauldron") {
    glow(ctx, sx, sy, 200, theme.sun, night ? 0.22 : 0.42);
    disc(ctx, sx, sy, mode === "hub" ? 54 : 46, rgba(theme.sun, night ? 0.6 : 0.9));
  }

  /* ridges sit just behind the horizon */
  const rng = makeRng(mode === "hub" ? 11 : 7);
  const layers = theme.ridge;
  for (let layer = 0; layer < 3; layer++) {
    const y = 120 + layer * 46;
    const pts = [[0, CAMERA.horizon + 10]];
    for (let i = 0; i <= 7; i++) {
      pts.push([(i / 7) * W, y + rng() * 70]);
    }
    pts.push([W, CAMERA.horizon + 10]);
    ridgeFill(ctx, pts, shade(layers[layer], layer === 0 ? 12 : -4), layers[layer]);
  }

  /* horizon scenery */
  if (mode === "hub") hubSkyline(ctx);
  else if (biome === "jungle") ruinSkyline(ctx);
  else if (biome === "village") houseSkyline(ctx);
  else if (biome === "desert") mesaSkyline(ctx);
  else cavernSkyline(ctx);

  paintGround(ctx, theme);

  const frng = makeRng(23);
  for (let i = 0; i < 18; i++) {
    const x = frng() * W;
    const y = H - frng() * 60;
    const h = 14 + frng() * 34;
    polygon(ctx, [[x - 7, y], [x, y - h], [x + 7, y]], rgba(theme.ground, 0.9));
  }

  if (night) {
    ctx.fillStyle = "rgba(10,18,46,.32)";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = theme.haze;
  ctx.fillRect(0, 0, W, H);
}

function ridgeFill(ctx, points, top, bottom) {
  const g = ctx.createLinearGradient(0, 100, 0, CAMERA.horizon + 20);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  polygon(ctx, points, g);
}
function ruinSkyline(ctx) {
  const rng = makeRng(91);
  for (let i = 0; i < 6; i++) {
    const x = rng() * W;
    const h = 40 + rng() * 70;
    const w = 22 + rng() * 30;
    plate(ctx, x, CAMERA.horizon + 12 - h, w, h, "#6f7d68", 2, { radius: 3 });
    plate(ctx, x - 5, CAMERA.horizon + 6 - h, w + 10, 8, "#84907a", 2, { radius: 2 });
  }
}
function houseSkyline(ctx) {
  for (let i = 0; i < 4; i++) {
    const x = 30 + i * 150;
    const s = 0.6 + (i % 2) * 0.15;
    plate(ctx, x, CAMERA.horizon + 12 - 60 * s, 90 * s, 60 * s, "#c98a52", 3, { radius: 4 });
    polygon(ctx, [[x - 6, CAMERA.horizon - 48 * s], [x + 45 * s, CAMERA.horizon - 92 * s],
      [x + 96 * s, CAMERA.horizon - 48 * s]], "#8c3b2f");
    glow(ctx, x + 68 * s, CAMERA.horizon - 30 * s, 18, "#ffd873", 0.6);
  }
}
function mesaSkyline(ctx) {
  const rng = makeRng(57);
  for (let i = 0; i < 7; i++) {
    const x = rng() * W;
    const h = 60 + rng() * 90;
    const w = 36 + rng() * 50;
    polygon(ctx, [[x, CAMERA.horizon + 12], [x + w * 0.2, CAMERA.horizon + 12 - h],
      [x + w, CAMERA.horizon + 12 - h * 0.75], [x + w * 1.12, CAMERA.horizon + 12]],
      i % 2 ? "#7e3a2a" : "#a44f32");
  }
}
function cavernSkyline(ctx) {
  const rng = makeRng(33);
  for (let i = 0; i < 8; i++) {
    const x = rng() * W;
    const len = 50 + rng() * 90;
    polygon(ctx, [[x - 12, 0], [x + 12, 0], [x + 2, len]], "#0a1d29");
  }
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 150;
    plate(ctx, x, CAMERA.horizon + 12 - 70, 34, 70, "#1d4050", 2, { radius: 4 });
    glow(ctx, x + 17, CAMERA.horizon - 30, 32, "#4fc8e8", 0.3);
  }
}
function hubSkyline(ctx) {
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 155;
    plate(ctx, x, CAMERA.horizon + 12 - 64, 92, 64, i % 2 ? "#b9794a" : "#c98a52", 3, { radius: 4 });
    polygon(ctx, [[x - 6, CAMERA.horizon - 52], [x + 46, CAMERA.horizon - 100],
      [x + 98, CAMERA.horizon - 52]], "#8c3b2f");
  }
  strokeLine(ctx, 0, CAMERA.horizon + 12, W, CAMERA.horizon + 12, "rgba(120,90,60,.75)", 5);
}

function layerFor(mode, biome, night) {
  const key = `${mode}|${biome}|${night ? 1 : 0}`;
  let layer = cache.get(key);
  if (layer) return layer;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  paintStatic(c.getContext("2d"), mode, biome, night);
  cache.set(key, c);
  return c;
}

/* Stepped cliffs, suspended platforms and falls in the area outside the
 * player's trapezoid. Everything is clipped to the two side strips so it can
 * never spill onto the playable plane. */
function drawSurround(ctx, t, biome, par, theme) {
  const fallColor = biome === "desert" ? "#e8733c"
    : biome === "cauldron" ? "#7fe3ff"
    : biome === "village" ? "#cfd8e0" : "#8fd8e8";
  const rock = shade(theme.ground, -8);
  const rockTop = shade(theme.ground, 26);
  const rockSide = shade(theme.ground, -38);
  const steps = fine() ? 7 : 4;

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.beginPath();
    const topEdge = edgesAtScreenY(CAMERA.horizon);
    if (side < 0) {
      ctx.moveTo(0, CAMERA.horizon);
      ctx.lineTo(topEdge.left, CAMERA.horizon);
      ctx.lineTo(0, H);
    } else {
      ctx.moveTo(W, CAMERA.horizon);
      ctx.lineTo(topEdge.right, CAMERA.horizon);
      ctx.lineTo(W, H);
    }
    ctx.closePath();
    ctx.clip();

    for (let i = 0; i < steps; i++) {
      const y = CAMERA.horizon + 34 + (i * (H - CAMERA.horizon)) / steps
        + par.dy * (10 + i * 4);
      const edge = edgesAtScreenY(y);
      const s = edge.scale;
      const shift = par.dx * (5 + i * 2);
      const w = (66 + i * 10) * s;
      const h = (30 + i * 3) * s;
      const x = side < 0 ? edge.left - w - 6 * s + shift : edge.right + 6 * s + shift;

      polygon(ctx, [[x, y + h], [x + w, y + h], [x + w, y + h + 13 * s], [x, y + h + 13 * s]], rockSide);
      polygon(ctx, [[x, y], [x + w, y], [x + w + 9 * s, y - 9 * s], [x + 9 * s, y - 9 * s]], rockTop);
      plate(ctx, x, y, w, h, rock, 0, { radius: 3 });

      /* moss / vegetation on the ledge */
      const mossX = x + w * 0.62;
      for (let j = 0; j < 3; j++) {
        polygon(ctx, [
          [mossX + j * 7 * s - 4 * s, y],
          [mossX + j * 7 * s, y - (9 + j % 2 * 5) * s],
          [mossX + j * 7 * s + 4 * s, y],
        ], rgba(theme.mote, 0.35));
      }

      /* falling water / lava / energy */
      if (i % 2 === 0) {
        const fx = side < 0 ? edge.left - 12 * s : edge.right + 8 * s;
        const fw = 7 * s;
        const fg = ctx.createLinearGradient(fx, y, fx, y + 150 * s);
        fg.addColorStop(0, rgba(fallColor, 0.55));
        fg.addColorStop(1, rgba(fallColor, 0));
        ctx.fillStyle = fg;
        ctx.fillRect(fx, y, fw, 150 * s);
        if (!reducedMotion) {
          for (let d = 0; d < 3; d++) {
            const drop = ((t * (90 + i * 12) + d * 47) % (150 * s));
            disc(ctx, fx + fw / 2, y + drop, 1.6 * s, rgba(fallColor, 0.85));
          }
        }
      }
    }

    /* suspended brick platforms with chains, at two heights */
    if (fine()) {
      for (let i = 0; i < 2; i++) {
        const y = CAMERA.horizon + 120 + i * 250 + par.dy * 18;
        const edge = edgesAtScreenY(y);
        const s = edge.scale;
        const bob = reducedMotion ? 0 : Math.sin(t * 1.2 + i + (side > 0 ? 1 : 0)) * 5;
        const px = side < 0 ? edge.left - 60 * s : edge.right + 14 * s;
        const pw = 56 * s;
        strokeLine(ctx, px + 8 * s, y - 60 * s, px + 8 * s, y + bob, "rgba(210,220,210,.35)", 2);
        strokeLine(ctx, px + pw - 8 * s, y - 60 * s, px + pw - 8 * s, y + bob, "rgba(210,220,210,.35)", 2);
        plate(ctx, px, y + bob, pw, 12 * s, rockTop, 3, { radius: 3 });
        disc(ctx, px + pw / 2, y + bob - 8 * s, 5 * s, theme.mote);
      }
    }
    ctx.restore();
  }
}

function drawSky(ctx, t, mode, biome, night, player) {
  const theme = themeFor(mode, biome);
  const layer = layerFor(mode, biome, night);
  if (layer) ctx.drawImage(layer, 0, 0);
  else paintStatic(ctx, mode, biome, night);

  const par = parallaxFor(player?.x ?? W / 2, player?.y ?? H * 0.7);

  /* distance haze and warmth react to how far up/down the player is */
  const fog = ctx.createLinearGradient(0, CAMERA.horizon - 40, 0, CAMERA.horizon + 210);
  fog.addColorStop(0, rgba(theme.ground, 0.08 + par.fog * 0.16));
  fog.addColorStop(1, rgba(theme.ground, 0));
  ctx.fillStyle = fog;
  ctx.fillRect(0, CAMERA.horizon - 40, W, 250);

  /* a moving pool of light follows the player across the ground plane */
  if (player) {
    const pp = project(player.x, player.y, 0);
    const pool = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 230 * pp.scale);
    pool.addColorStop(0, rgba(theme.sun, 0.08 + par.warmth * 0.1));
    pool.addColorStop(1, rgba(theme.sun, 0));
    ctx.fillStyle = pool;
    ctx.fillRect(0, CAMERA.horizon, W, H - CAMERA.horizon);
  }

  drawSurround(ctx, t, biome, par, theme);
  if (reducedMotion) return;

  const sx = mode === "hub" ? 380 : biome === "desert" ? 430 : 400;
  const sy = biome === "cauldron" ? 150 : 170;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.018 + par.dx * 0.04);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    strokeLine(ctx, Math.cos(a) * 58, Math.sin(a) * 58,
      Math.cos(a) * 520, Math.sin(a) * 520, rgba(theme.sun, 0.055), 12);
  }
  ctx.restore();

  const cloudRng = makeRng(41);
  for (let layer = 0; layer < 3; layer++) {
    const offset = (t * (4 + layer * 3) + par.dx * 22 * (layer + 1)) % (W + 240);
    for (let i = 0; i < 3; i++) {
      const bx = cloudRng() * (W + 240) - 120;
      const x = ((bx + offset) % (W + 240)) - 120;
      const y = 40 + layer * 34 + cloudRng() * 70 + par.dy * 26;
      oval(ctx, x, y, 80 + layer * 18, 12 + layer * 4, theme.cloud);
      oval(ctx, x + 38, y - 8, 52, 12, theme.cloud);
    }
  }

  if (fine()) {
    const moteRng = makeRng(mode === "hub" ? 77 : 65);
    for (let i = 0; i < 20; i++) {
      const bx = moteRng() * W;
      const by = CAMERA.horizon + moteRng() * (H - CAMERA.horizon);
      const ph = moteRng() * TAU;
      const x = bx + Math.sin(t * 0.6 + ph) * 16 + par.dx * 12;
      const y = by + Math.cos(t * 0.45 + ph) * 12 + par.dy * 10;
      const r = 1.2 + moteRng() * 1.5;
      glow(ctx, x, y, r * 6, theme.mote, 0.2 + 0.16 * (0.5 + 0.5 * Math.sin(t * 2 + ph)));
    }
  }
}

function vignette(ctx, strength = 0.5) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(2,8,10,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ------------------------------------------------------------------ sprites */

/* Upright LEGO-style explorer; feet at local (0, 0). */
function facing(ctx, e) {
  if (Math.cos(e.angle || 0) < 0) {
    ctx.scale(-1, 1);
    return true;
  }
  return false;
}

/* Thin adapters to the volumetric model cache. */
function heroSprite(ctx, opts = {}) {
  drawModel(ctx, opts.kind || "aloy", {
    frame: reducedMotion ? 0 : Math.floor(performance.now() / 130) % FRAME_COUNT,
    palette,
    flash: !!opts.flash,
    ...opts,
  });
}
function machineSprite(ctx, e, t, flash) {
  facing(ctx, e);
  drawModel(ctx, e.type, {
    frame: reducedMotion ? 0 : Math.floor(t * 8) % FRAME_COUNT,
    palette,
    flash: !!flash,
  });
}
function bossSprite(ctx, e, t, flash) {
  facing(ctx, e);
  drawModel(ctx, e.bossType || "boss", {
    frame: reducedMotion ? 0 : Math.floor(t * 8) % FRAME_COUNT,
    palette,
    flash: !!flash,
    bossPhase: e.phase || 1,
  });
}

/* -------------------------------------------------------------- ground FX */

function drawHazard(ctx, h, t) {
  const p = project(h.x, h.y, 0);
  const r = (h.radius || 40) * p.scale;
  ctx.save();
  if (h.type === "lava") {
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
    g.addColorStop(0, rgba("#ff8b5c", h.active ? 0.85 : 0.4));
    g.addColorStop(1, rgba("#e8733c", 0));
    ctx.fillStyle = g;
    oval(ctx, p.x, p.y, r, r * 0.46, g);
    ctx.strokeStyle = h.active ? "#ffd08a" : "rgba(232,115,60,.7)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.8, r * 0.36, 0, 0, TAU); ctx.stroke();
    if (h.active) {
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + i * 1.7;
        disc(ctx, p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.23,
          2 + (i % 2), "rgba(255,220,140,.85)");
      }
    }
  } else if (h.type === "quicksand") {
    ctx.fillStyle = "rgba(156,140,120,.35)";
    oval(ctx, p.x, p.y, r, r * 0.44, ctx.fillStyle);
    ctx.strokeStyle = "rgba(230,210,180,.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, (14 + i * 15) * p.scale, (7 + i * 7) * p.scale,
        0, t * 0.4 + i, t * 0.4 + i + Math.PI * 1.5);
      ctx.stroke();
    }
  } else if (h.type === "ice") {
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
    g.addColorStop(0, "rgba(200,245,255,.55)");
    g.addColorStop(1, "rgba(120,190,220,.18)");
    oval(ctx, p.x, p.y, r, r * 0.44, g);
    ctx.strokeStyle = "rgba(255,255,255,.6)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      strokeLine(ctx, p.x, p.y, p.x + Math.cos(a) * r * 0.8, p.y + Math.sin(a) * r * 0.35,
        "rgba(255,255,255,.4)", 1.4);
    }
  } else if (h.type === "spikes") {
    ctx.strokeStyle = h.active ? "rgba(240,248,252,.6)" : "rgba(220,230,235,.25)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.44, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const sx = p.x + Math.cos(a) * r * 0.55;
      const sy = p.y + Math.sin(a) * r * 0.24;
      const hh = h.active ? 20 * p.scale : 7 * p.scale;
      polygon(ctx, [[sx - 5 * p.scale, sy], [sx, sy - hh], [sx + 5 * p.scale, sy]],
        h.active ? "#d9e2e8" : "rgba(217,226,232,.4)");
    }
  }
  ctx.restore();
}

function drawHealthBar(ctx, e, height) {
  if (e.burrowed) return;
  const p = project(e.x, e.y, 0);
  const w = Math.max(30, e.radius * 1.7) * p.scale;
  const x = p.x - w / 2;
  const y = p.y - (height + 14) * p.scale;
  ctx.fillStyle = "rgba(6,12,16,.8)";
  ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, 8, 4); ctx.fill();
  const fill = e.type === "boss" ? "#e8733c" : "#a4d007";
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, shade(fill, -30));
  g.addColorStop(1, fill);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w * Math.max(0, e.hp / e.maxHp), 5, 3);
  ctx.fill();
}

function drawTelegraph(ctx, e, t) {
  const shot = e.attackKind === "shot";
  ctx.save();
  ctx.setLineDash([12, 9]);
  ctx.lineDashOffset = -t * 30;
  ctx.strokeStyle = shot ? "rgba(111,216,255,.85)" : "rgba(232,115,60,.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (shot) {
    const a = project(e.x, e.y, 12);
    const b = project(e.x + Math.cos(e.angle) * 280, e.y + Math.sin(e.angle) * 280, 12);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  } else {
    const p = project(e.x, e.y, 0);
    ctx.ellipse(p.x, p.y, (e.radius + 14) * p.scale, (e.radius + 14) * p.scale * 0.44, 0, 0, TAU);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBossBar(ctx, hunt) {
  if (hunt.bossHp === null || hunt.bossHp <= 0) return;
  const w = W - 150;
  const x = 75;
  const y = 30;
  ctx.fillStyle = "rgba(6,12,16,.85)";
  ctx.beginPath(); ctx.roundRect(x - 12, y - 18, w + 24, 54, 10); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - 12, y - 18, w + 24, 54, 10); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.beginPath(); ctx.roundRect(x, y, w, 12, 6); ctx.fill();
  const hot = hunt.bossPhase === 3;
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, hot ? "#ff4d6d" : "#b8492c");
  g.addColorStop(1, hot ? "#ff9a6a" : "#e8733c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w * Math.max(0, hunt.bossHp / hunt.bossMaxHp), 12, 6);
  ctx.fill();
  ctx.fillStyle = "#f7f9fb";
  ctx.font = "900 15px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.9)";
  ctx.shadowBlur = 6;
  ctx.fillText(`${(hunt.bossLabel || "BOSS").toUpperCase()}  ·  PHASE ${Math.max(1, hunt.bossPhase)}`, W / 2, y + 26);
  ctx.restore();
}

/* ------------------------------------------------------------------ public */

export function cellRect(cell) {
  const col = cell % GRID.cols;
  const row = Math.floor(cell / GRID.cols);
  return {
    x: GRID.x + col * GRID.cellW,
    y: GRID.y + row * GRID.cellH,
    w: GRID.cellW,
    h: GRID.cellH,
  };
}

/* Screen-space rectangle for a village cell (perspective aware). */
export function cellScreenRect(cell) {
  const r = cellRect(cell);
  const a = project(r.x, r.y, 0);
  const b = project(r.x + r.w, r.y + r.h, 0);
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

let currentVillage = [];

export function villageHitTest(x, y) {
  for (const [key, v] of Object.entries(VILLAGERS)) {
    const p = project(v.x, v.y, 0);
    if (Math.hypot(x - p.x, y - (p.y - 36 * p.scale)) < 52 * p.scale) {
      return { type: "villager", key, label: v.label };
    }
  }
  for (const p of currentVillage) {
    const r = cellScreenRect(p.cell);
    const rowY = GRID.y + Math.floor(p.cell / GRID.cols) * GRID.cellH;
    const top = r.y - 52 * project(0, rowY, 0).scale;
    if (x >= r.x && x <= r.x + r.w && y >= top && y <= r.y + r.h) {
      return { type: "item", key: p.key, cell: p.cell, label: VILLAGE_ITEMS[p.key]?.label || p.key };
    }
  }
  return null;
}

const BUILDING_COLORS = {
  workshop: ["#b9794a", "#8c3b2f"], garden: ["#7a5a3c", "#6fbf5a"],
  banner: ["#8c3b2f", "#f2c14e"], lookout: ["#8d9a78", "#3b2a22"],
  lantern: ["#5a3a2a", "#f2c14e"], statue: ["#9aa9b5", "#f2c14e"],
  foundry: ["#8a6050", "#e8733c"], granary: ["#b39a68", "#7d5a3c"],
  beacon: ["#7a8a9a", "#7fe3ff"], market: ["#a86a4a", "#f2b34c"],
  library: ["#7a6a8a", "#b8a0d8"], infirmary: ["#9a8a7a", "#7fe3ff"],
  armoury: ["#8a8a98", "#d9e2e8"], tradingpost: ["#a07a4a", "#66c0f4"],
  greathall: ["#a86b45", "#f2c14e"], bridge: ["#8a7a68", "#c9b79a"],
  windmill: ["#b9a070", "#e8e0c0"], bakery: ["#c99a5a", "#f2c14e"],
  watchfire: ["#7a5a3c", "#e8733c"], totem: ["#7a8a68", "#a4d007"],
};

function placedSprite(ctx, key, x, y, night) {
  const [wall, roof] = BUILDING_COLORS[key] || ["#9a8468", "#8c3b2f"];
  if (key === "lantern" || key === "watchfire" || key === "beacon") {
    strokeLine(ctx, 0, -14, 0, 0, "#5a3a2a", 6);
    const lit = key === "beacon" ? "#7fe3ff" : key === "watchfire" ? "#e8733c" : night ? "#fff0b0" : "#f2c14e";
    glow(ctx, 0, -18, night ? 58 : 32, lit, 0.55);
    disc(ctx, 0, -18, 9, lit);
    return 34;
  }
  if (key === "statue") {
    plate(ctx, -20, -8, 40, 12, "#9aa9b5", 2, { radius: 3 });
    ctx.save();
    ctx.translate(0, -8);
    ctx.scale(0.85, 0.85);
    heroSprite(ctx, { kind: "aloy", torso: "#f2c14e", hair: "#8fa2aa" });
    ctx.restore();
    return 66;
  }
  if (key === "garden") {
    plate(ctx, -32, -12, 64, 12, "#7a5a3c", 4, { radius: 3 });
    for (let j = 0; j < 4; j++) {
      const gx = -22 + j * 15;
      strokeLine(ctx, gx, -12, gx, -26, "#4f8a55", 3);
      disc(ctx, gx - 4, -26, 5, "#6fbf5a");
      disc(ctx, gx + 4, -28, 5, "#86cf65");
    }
    return 30;
  }
  if (key === "banner") {
    strokeLine(ctx, 0, 0, 0, -48, "#6a4a30", 6);
    const wave = reducedMotion ? 0 : Math.sin(performance.now() / 500 + x) * 4;
    polygon(ctx, [[0, -48], [40, -42 + wave], [36, -12 + wave], [0, -16]], wall);
    disc(ctx, 18, -30 + wave / 2, 7, roof);
    return 52;
  }
  const tall = key === "lookout" || key === "windmill" || key === "greathall";
  const bw = tall ? 40 : 58;
  const bh = tall ? 56 : 40;
  plate(ctx, -bw / 2, -bh, bw, bh, wall, 3, { radius: 5 });
  polygon(ctx, [[-bw / 2 - 5, -bh], [0, -bh - 18], [bw / 2 + 5, -bh]], roof);
  ctx.fillStyle = "#3b2a22";
  ctx.fillRect(-8, -18, 16, 18);
  ctx.fillStyle = night ? "#ffe08a" : "#9fd8e8";
  ctx.fillRect(-bw / 2 + 7, -bh + 8, 11, 11);
  ctx.fillRect(bw / 2 - 18, -bh + 8, 11, 11);
  if (night) glow(ctx, 0, -bh + 14, 38, "#ffd873", 0.4);
  if (key === "windmill") {
    const a = reducedMotion ? 0.5 : performance.now() / 1400;
    ctx.save();
    ctx.translate(0, -bh - 14);
    ctx.rotate(a);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      polygon(ctx, [[0, 0], [6, -4],  [30, -2], [30, 4]], "#e8e0c0");
    }
    ctx.restore();
  }
  return bh + 18;
}

export function renderHub(ctx, save, t) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  const hour = new Date().getHours();
  const night = hour >= 19 || hour < 6;
  drawSky(ctx, t, "hub", "jungle", night, { x: 300, y: 720 });

  const placements = save.village?.placements || [];
  currentVillage = placements;
  const drawables = [];

  for (let cell = 0; cell < GRID.cols * GRID.rows; cell++) {
    const r = cellRect(cell);
    const a = project(r.x, r.y, 0);
    const b = project(r.x + r.w, r.y + r.h, 0);
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, a.y);
    ctx.lineTo(b.x, b.y); ctx.lineTo(a.x, b.y); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  for (const p of placements) {
    const r = cellRect(p.cell);
    drawables.push({
      y: r.y + r.h / 2,
      draw: () => {
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        groundShadow(ctx, cx, cy + 8, 22);
        actor(ctx, cx, cy, () => placedSprite(ctx, p.key, cx, cy, night));
      },
    });
  }

  const vcolors = { aloy: "#c44536", varl: "#8c6b45", teersa: "#4f9d8b" };
  for (const [key, v] of Object.entries(VILLAGERS)) {
    const shift = night ? -8 : 0;
    drawables.push({
      y: v.y + shift,
      draw: () => {
        const vy = v.y + shift + (reducedMotion ? 0 : Math.sin(t * 2 + v.x) * 1.5);
        groundShadow(ctx, v.x, vy, 16);
        actor(ctx, v.x, vy, () => {
          ctx.scale(1.4, 1.4);
          if (key === "varl") ctx.scale(-1, 1);
          heroSprite(ctx, { kind: key, torso: vcolors[key], hair: "#2c3e50" });
        });
        if (save.villagerMet?.[key]) {
          const p = project(v.x, vy, 78);
          glow(ctx, p.x, p.y, 12 * p.scale, "#66c0f4", 0.6);
          disc(ctx, p.x, p.y, 3 * p.scale, "#66c0f4");
        }
      },
    });
  }

  const ccolors = { bruiser: "#8c6b45", mender: "#4f9d8b", gunner: "#7b4ea8" };
  const party = [300, ...(save.party || [save.activeCompanion]).filter(Boolean).map((k, i) => 380 + i * 70)];
  party.forEach((px, i) => {
    const key = i === 0 ? "aloy" : (save.party || [save.activeCompanion]).filter(Boolean)[i - 1];
    const py = 720 + (reducedMotion ? 0 : Math.sin(t * 2) * 1.5);
    drawables.push({
      y: py,
      draw: () => {
        groundShadow(ctx, px, py, 18);
        actor(ctx, px, py, () => heroSprite(ctx, {
          kind: i === 0 ? "aloy" : key,
          torso: i === 0 ? "#c44536" : ccolors[key] || "#8fa2aa",
          hair: i === 0 ? "#a33a22" : "#2c3e50",
          bow: i === 0,
        }));
      },
    });
  });

  drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
  vignette(ctx, 0.42);
  ctx.restore();
}

export function renderHunt(ctx, hunt, t, fx) {
  const shake = fx?.offset() || { x: 0, y: 0 };
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.translate(shake.x, shake.y);
  drawSky(ctx, t, "hunt", hunt.biome, false, hunt.player);

  for (const h of hunt.hazards || []) drawHazard(ctx, h, t);

  if (hunt.ghost?.length) {
    ctx.strokeStyle = "rgba(102,192,244,.32)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    hunt.ghost.forEach((point, i) => {
      const p = project(point.x, point.y, 0);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  const drawables = [];
  for (const core of hunt.cores) {
    drawables.push({
      y: core.y,
      draw: () => {
        const bob = reducedMotion ? 0 : Math.sin(t * 4 + core.x) * 4;
        const p = project(core.x, core.y, 10 + bob);
        glow(ctx, p.x, p.y, 22 * p.scale, "#f2c14e", 0.5);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(reducedMotion ? 0 : t * 2);
        ctx.scale(p.scale, p.scale);
        plate(ctx, -7, -7, 14, 14, "#f2c14e", 2, { radius: 2 });
        ctx.restore();
      },
    });
  }

  const ccolors = { bruiser: "#8c6b45", mender: "#4f9d8b", gunner: "#7b4ea8" };
  const companions = hunt.companions || (hunt.companion?.type ? [hunt.companion] : []);
  companions.forEach((c) => {
    drawables.push({
      y: c.y,
      draw: () => {
        groundShadow(ctx, c.x, c.y, 15);
        actor(ctx, c.x, c.y, () => heroSprite(ctx, {
          kind: c.type, torso: ccolors[c.type] || "#8fa2aa", hair: "#2c3e50",
        }));
      },
    });
  });

  for (const e of hunt.enemies) {
    if (e.hp <= 0) continue;
    if (e.windup > 0) drawTelegraph(ctx, e, t);
    const isBoss = e.boss || e.type === "boss";
    const height = isBoss ? 210 : e.type === "grazer" || e.type === "bulwark" || e.type === "charger" ? 50 : 46;
    drawables.push({
      y: e.y,
      draw: () => {
        if (!e.burrowed) groundShadow(ctx, e.x, e.y, e.radius * 0.9);
        const flash = e.hitFlash > 0;
        if (palette === "contrast") {
          const p = project(e.x, e.y, 0);
          ctx.strokeStyle = "rgba(255,255,255,.9)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, (e.radius + 7) * p.scale, (e.radius + 7) * p.scale * 0.44, 0, 0, TAU);
          ctx.stroke();
        }
        actor(ctx, e.x, e.y, () => {
          if (isBoss) bossSprite(ctx, e, t, flash);
          else if (e.burrowed) {
            oval(ctx, 0, -4, 22, 9, "rgba(120,90,60,.9)");
            for (let i = 0; i < 3; i++) {
              disc(ctx, Math.cos(t * 2 + i) * 18, -2 + Math.sin(t * 2 + i) * 4, 2, "rgba(200,170,120,.5)");
            }
          } else machineSprite(ctx, e, t, flash);
        });
        if (!e.burrowed) drawHealthBar(ctx, e, height);
        if (palette === "colorblind") {
          const p = project(e.x, e.y, height + 34);
          ctx.strokeStyle = "#ffffff";
          ctx.fillStyle = "#0b1418";
          ctx.lineWidth = 2;
          ctx.beginPath();
          const s = 7 * p.scale;
          if (e.type === "lancer") {
            ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s, p.y + s); ctx.lineTo(p.x - s, p.y + s);
          } else if (e.type === "bulwark") {
            ctx.rect(p.x - s, p.y - s, s * 2, s * 2);
          } else if (e.type === "burrower") {
            ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s, p.y);
          } else if (e.type === "grazer") {
            ctx.arc(p.x, p.y, s, 0, TAU);
          } else ctx.arc(p.x, p.y, s * 0.7, 0, TAU);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      },
    });
  }

  const p = hunt.player;
  drawables.push({
    y: p.y,
    draw: () => {
      groundShadow(ctx, p.x, p.y, 17);
      if (p.invuln > 0 && Math.floor(t * 16) % 2) ctx.globalAlpha = 0.45;
      const aim = Math.cos(p.angle || 0) < 0 ? -1 : 1;
      actor(ctx, p.x, p.y, () => {
        if (aim < 0) ctx.scale(-1, 1);
        heroSprite(ctx, { kind: "aloy", torso: "#c44536", hair: "#a33a22", bow: true });
      });
      ctx.globalAlpha = 1;
      if (p.charge > 0.05) {
        const cp = project(p.x, p.y, 6);
        ctx.strokeStyle = "rgba(102,192,244,.9)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 34 * cp.scale, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge);
        ctx.stroke();
        glow(ctx, cp.x, cp.y, (30 + p.charge * 26) * cp.scale, "#66c0f4", 0.18 + p.charge * 0.3);
      }
    },
  });

  drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());

  for (const b of hunt.projectiles) {
    const bp = project(b.x, b.y, 12);
    if (b.trap) {
      glow(ctx, bp.x, bp.y, b.radius * bp.scale * 2.4, "#b8e0ff", 0.3);
      ctx.strokeStyle = "#b8e0ff";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y, b.radius * bp.scale, b.radius * bp.scale * 0.5, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const color = b.friendly ? "#ffe08a" : "#ff8b5c";
      const tail = project(b.x - (b.vx || 0) * 0.05, b.y - (b.vy || 0) * 0.05, 12);
      strokeLine(ctx, tail.x, tail.y, bp.x, bp.y, rgba(color, 0.55), b.radius * bp.scale * 1.4);
      glow(ctx, bp.x, bp.y, b.radius * bp.scale * 3, color, 0.55);
      disc(ctx, bp.x, bp.y, b.radius * bp.scale, shade(color, 60));
    }
  }

  fx?.draw(ctx);
  ctx.restore();

  vignette(ctx, 0.52);
  drawBossBar(ctx, hunt);
  fx?.drawOverlay(ctx, W, H);

  if (p.hp <= 1 && p.hp > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, "rgba(255,60,80,0)");
    g.addColorStop(1, `rgba(255,60,80,${reducedMotion ? 0.16 : 0.24 + Math.sin(t * 6) * 0.06})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (hunt.banner > 0) {
    const label = hunt.phase === "won" ? "HUNT CLEARED"
      : hunt.phase === "lost" ? "HUNT FAILED"
      : hunt.phase === "boss" ? "TALLNECK APPROACHES"
      : `WAVE ${hunt.wave}`;
    const y = H / 2 - 46;
    const g = ctx.createLinearGradient(0, y, 0, y + 92);
    g.addColorStop(0, "rgba(8,14,18,0)");
    g.addColorStop(0.2, "rgba(8,14,18,.78)");
    g.addColorStop(0.8, "rgba(8,14,18,.78)");
    g.addColorStop(1, "rgba(8,14,18,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, 92);
    ctx.strokeStyle = "rgba(164,208,7,.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, y + 46); ctx.lineTo(W - 60, y + 46); ctx.stroke();
    ctx.fillStyle = "#f7f9fb";
    ctx.font = "900 40px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.9)";
    ctx.shadowBlur = 12;
    ctx.fillText(label, W / 2, y + 42);
    ctx.restore();
    if (hunt.modifier) {
      ctx.font = "800 16px Arial, sans-serif";
      ctx.fillStyle = "#f2c14e";
      ctx.fillText(MOD_LABEL(hunt.modifier), W / 2, y + 72);
    }
  }
}

function MOD_LABEL(key) {
  return key === "swift" ? "SWIFT MACHINES"
    : key === "armoured" ? "ARMOURED MACHINES"
    : key === "swarm" ? "SWARM" : "";
}
