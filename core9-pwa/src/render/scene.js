/*
 * CORE 9 — the map.
 *
 * A small software renderer: world-space low-poly meshes, an isometric
 * projection, painter's-algorithm sorting, and a terrain drawn as diamonds.
 * WebGL would buy more triangles; it would not buy a better fit for a game
 * that has to boot in under a second on a mid-range phone and work offline
 * from the first visit.
 */

import { siteZones } from "../data/zones.js";
import { SITE_BY_ID } from "../data/sites.js";
import { CREW_BY_ID } from "../data/crew.js";
import { buildZoneModel, buildSiteProps, zoneCenter } from "./models.js";
import { shade } from "./primitives.js";
import { Particles } from "./particles.js";

const ISO = { x: 27, y: 13.5, z: 24 };
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const view = { w: 0, h: 0, dpr: 1, cx: 0, cy: 0 };
const cam = {
  x: 4.1, y: 3.4, zoom: 0.9,
  tx: 4.1, ty: 3.4, tzoom: 0.9,
  yaw: 0,
};
let canvas = null;
let ctx = null;
let site = SITE_BY_ID.core9;
let siteId = "core9";
let zones = siteZones(site);
let staticCanvas = null;
let staticCtx = null;
let staticKey = "";
let particles = new Particles();
let props = null;
let stars = [];
let birds = [];
let hits = [];
let crewHits = [];
let anims = new Map();
let highlight = null;
let selected = null;
let lastTime = 0;
let flight = 0;
let reducedMotion = false;
let sheetOpen = false;
let centerRatio = 0.53;

const LINKS = [
  { a: "reactor", b: "cooling", kind: "pipe", color: "#86aeb2" },
  { a: "reactor", b: "turbine", kind: "pipe", color: "#b89b67" },
  { a: "turbine", b: "substation", kind: "wire", color: "#f3b53f" },
  { a: "reactor", b: "waste", kind: "pipe", color: "#9bcf7a" },
  { a: "control", b: "reactor", kind: "wire", color: "#4dd8c0" },
  { a: "lab", b: "control", kind: "wire", color: "#9fb9ff" },
  { a: "fuel", b: "reactor", kind: "pipe", color: "#86aeb2" },
  { a: "security", b: "control", kind: "wire", color: "#ef6a5b" },
  { a: "admin", b: "substation", kind: "wire", color: "#d9c28f" },
];

function hash(x, y) {
  let h = Math.imul(x + 31, 374761393) ^ Math.imul(y + 17, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function resize() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(1.5, globalThis.devicePixelRatio || 1);
  if (view.w === w && view.h === h && view.dpr === dpr) return;
  view.w = w;
  view.h = h;
  view.dpr = dpr;
  view.cx = w / 2;
  view.cy = h * centerRatio;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  if (staticCanvas) {
    staticCanvas.width = canvas.width;
    staticCanvas.height = canvas.height;
  }
  staticKey = "";
}

function rot(dx, dy) {
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

function invRot(x, y) {
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  return { x: x * c + y * s, y: -x * s + y * c };
}

function project(x, y, z) {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const r = rot(dx, dy);
  return {
    x: view.cx + (r.x - r.y) * ISO.x * cam.zoom,
    y: view.cy + (r.x + r.y) * ISO.y * cam.zoom - z * ISO.z * cam.zoom,
  };
}

function worldOfScreen(sx, sy, z = 0) {
  const a = (sx - view.cx) / (ISO.x * cam.zoom);
  const b = (sy - view.cy + z * ISO.z * cam.zoom) / (ISO.y * cam.zoom);
  const rx = (a + b) / 2;
  const ry = (b - a) / 2;
  const d = invRot(rx, ry);
  return { x: cam.x + d.x, y: cam.y + d.y };
}

function screenDeltaToWorld(dx, dy) {
  const a = dx / (ISO.x * cam.zoom);
  const b = dy / (ISO.y * cam.zoom);
  const rx = (a + b) / 2;
  const ry = (b - a) / 2;
  return invRot(rx, ry);
}

function clampCam() {
  cam.x = clamp(cam.x, -2.5, site.map.cols + 2.5);
  cam.y = clamp(cam.y, -2.5, site.map.rows + 2.5);
  cam.zoom = clamp(cam.zoom, 0.5, 2.15);
  cam.tx = clamp(cam.tx, -2.5, site.map.cols + 2.5);
  cam.ty = clamp(cam.ty, -2.5, site.map.rows + 2.5);
  cam.tzoom = clamp(cam.tzoom, 0.5, 2.15);
}

export const Scene = {
  init(el) {
    canvas = el;
    ctx = canvas.getContext("2d", { alpha: false });
    staticCanvas = document.createElement("canvas");
    staticCtx = staticCanvas.getContext("2d", { alpha: false });
    props = buildSiteProps(site);
    stars = [];
    for (let i = 0; i < 62; i++) {
      stars.push({
        x: hash(i, 4),
        y: hash(i, 9) * 0.52,
        r: 0.5 + hash(i, 13) * 1.4,
        p: hash(i, 21) * TAU,
      });
    }
    birds = [
      { x: 0.18, y: 0.22, v: 0.012, p: 0.1 },
      { x: 0.72, y: 0.17, v: 0.009, p: 2.1 },
      { x: 0.46, y: 0.29, v: 0.007, p: 4.1 },
    ];
    resize();
    this.setSite("core9", null, true);
    view.cy = view.h * centerRatio;
  },

  resize() {
    resize();
  },

  setSite(nextId, state, refit = true) {
    if (!SITE_BY_ID[nextId]) return;
    siteId = nextId;
    site = SITE_BY_ID[nextId];
    zones = siteZones(site);
    props = buildSiteProps(site);
    staticKey = "";
    hits = [];
    crewHits = [];
    anims.clear();
    if (refit) this.fit(state);
  },

  fit(state) {
    const z = clamp(Math.min(view.w / 520, view.h / 680), 0.55, 1.0);
    const reactor = zones.find((x) => x.id === "reactor") || zones[0];
    const g = reactor ? zoneCenter(reactor) : { cx: site.map.cols / 2, cy: site.map.rows / 2 };
    cam.x = g.cx; cam.y = g.cy;
    cam.tx = cam.x; cam.ty = cam.y;
    cam.zoom = z; cam.tzoom = z;
    cam.yaw = site.initialYaw || 0;
    centerRatio = 0.53;
  },

  focusZone(id) {
    const z = zones.find((x) => x.id === id);
    if (!z) return;
    const g = zoneCenter(z);
    cam.tx = g.cx;
    cam.ty = g.cy;
    cam.tzoom = Math.max(cam.tzoom, 0.95);
    clampCam();
  },

  rotate() {
    cam.yaw = (cam.yaw + Math.PI / 2) % TAU;
  },

  panBy(dx, dy) {
    const d = screenDeltaToWorld(dx, dy);
    cam.x -= d.x;
    cam.y -= d.y;
    cam.tx = cam.x;
    cam.ty = cam.y;
    clampCam();
  },

  zoomBy(factor) {
    cam.zoom = clamp(cam.zoom * factor, 0.5, 2.15);
    cam.tzoom = cam.zoom;
  },

  setZoom(z) {
    cam.zoom = clamp(z, 0.5, 2.15);
    cam.tzoom = cam.zoom;
  },

  getZoom() { return cam.zoom; },

  camera() { return cam; },
  dims() { return view; },
  siteInfo() { return { siteId, site }; },

  setReducedMotion(on) { reducedMotion = Boolean(on); },

  setSheetOpen(on) { sheetOpen = Boolean(on); },

  setHighlight(id) { highlight = id; },
  setSelected(id) { selected = id; },

  pick(sx, sy) {
    for (const c of crewHits) {
      if (Math.hypot(sx - c.x, sy - c.y) <= c.r) return { type: "crew", id: c.id };
    }
    const sorted = hits.slice().sort((a, b) => b.depth - a.depth);
    for (const h of sorted) {
      if (pointInPoly(sx, sy, h.poly)) return { type: "zone", id: h.id };
    }
    return null;
  },

  pulse(zoneId, kind = "upgrade") {
    const z = zones.find((x) => x.id === zoneId);
    if (!z) return;
    const g = zoneCenter(z);
    anims.set(zoneId, { t: 0, duration: kind === "build" ? 1.2 : 0.8, kind });
    particles.burst(g.cx, g.cy, 0.35, z.accent);
  },

  collectPulse() {
    const z = zones.find((x) => x.id === "substation");
    if (!z) return;
    const g = zoneCenter(z);
    particles.float(g.cx, g.cy, 1.8, "€", "#f3b53f");
    particles.puff("spark", g.cx, g.cy, 1.2, { count: 8, size: 0.05, color: "#f3b53f" });
  },

  floatAt(zoneId, text, color) {
    const z = zones.find((x) => x.id === zoneId);
    if (!z) return;
    const g = zoneCenter(z);
    particles.float(g.cx, g.cy, 2.1, text, color);
  },

  update(dt, state, derived, now) {
    if (dt > 0.1) dt = 0.1;
    lastTime = now;
    const k = 1 - Math.exp(-dt * 7.5);
    const targetCenter = sheetOpen ? 0.27 : 0.53;
    centerRatio += (targetCenter - centerRatio) * (1 - Math.exp(-dt * 9));
    view.cy = view.h * centerRatio;
    cam.x += (cam.tx - cam.x) * k;
    cam.y += (cam.ty - cam.y) * k;
    cam.zoom += (cam.tzoom - cam.zoom) * k;
    clampCam();

    if (!state) return;
    const t = now / 1000;
    if (!reducedMotion) {
      const st = state.sites[state.activeSite];
      for (const z of zones) {
        const level = st.zones[z.id] ? st.zones[z.id].level : 0;
        if (level < 1) continue;
        const model = buildZoneModel(z, level, siteId);
        if (!model || !model.steam) continue;
        for (let i = 0; i < model.steam.length; i++) {
          const s = model.steam[i];
          const rate = s.rate * (0.55 + Math.min(1, derived.netMW / 45)) * (derived.overclock ? 1.35 : 1);
          particles.emitSteam(z.id + ":" + i, s.x, s.y, s.z, dt, s.size, rate);
        }
      }
    }
    particles.update(dt);
    for (const [id, a] of anims) {
      a.t += dt;
      if (a.t > a.duration + 0.3) anims.delete(id);
    }
    flight += dt * 0.13;
  },

  draw(state, derived, now) {
    if (!ctx) return;
    resize();
    const t = now / 1000;
    const st = state.sites[state.activeSite];
    const levels = siteId + ":" + zones.map((z) => (st.zones[z.id] ? st.zones[z.id].level : 0)).join(",");
    const key = [
      view.w, view.h, view.dpr, view.cy.toFixed(1),
      cam.x.toFixed(3), cam.y.toFixed(3), cam.zoom.toFixed(4), cam.yaw.toFixed(4),
      levels, anims.size > 0 ? "a" + Math.floor(now / 16) : "s",
    ].join("|");
    if (key !== staticKey || !staticCanvas) {
      renderStatic(state, derived, now, t);
      staticKey = key;
    }

    /* One image for the whole plant, then only the moving bits. Panning and
     * pinch redraw it, but an idle player at rest pays for a blit and a few
     * steam puffs instead of 2,000 polygons. */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(staticCanvas, 0, 0);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    drawBirds(t);
    drawConnectionPulses(state, t);
    drawWorkers(t);
    drawCrew(state, t);
    particles.draw(ctx, project, cam.zoom);
    drawRotors(state, t);
    drawLights(state, t);
    particles.drawFloats(ctx, project, cam.zoom);
    drawSelection(state, t);
  },
};

function renderStatic(state, derived, now, t) {
  const main = ctx;
  ctx = staticCtx;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.w, view.h);
  drawSky();
  drawGround(state, t);
  drawConnections(state);
  drawProps();
  drawPlots(state, t);
  drawZones(state, derived, now, t);
  drawVignette();
  ctx = main;
}

/* --------------------------------------------------------------------- sky */

function drawSky() {
  const pal = site.palette;
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, pal.skyTop || "#050d14");
  g.addColorStop(0.46, pal.skyMid || "#0b1d26");
  g.addColorStop(0.74, pal.skyLow || "#17352f");
  g.addColorStop(1, site.id === "solaris" ? "#3a2418" : site.id === "glacier" ? "#102b38" : "#0b1b16");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);

  for (const s of stars) {
    const x = (s.x * view.w + cam.x * 2) % view.w;
    const y = s.y * view.h;
    const a = (site.id === "solaris" ? 0.10 : 0.18) + 0.16 * (0.5 + 0.5 * Math.sin(s.p));
    ctx.globalAlpha = a;
    ctx.fillStyle = site.id === "glacier" ? "#d7fbff" : "#d6eee9";
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.globalAlpha = site.id === "solaris" ? 0.35 : 0.62;
  ctx.fillStyle = site.id === "solaris" ? "#ffd9a1" : "#dce8df";
  ctx.beginPath();
  ctx.arc(view.w * 0.82, view.h * 0.18, Math.max(10, view.w * 0.018), 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(view.w * 0.82, view.h * 0.18, Math.max(24, view.w * 0.045), 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  drawHills(0);
}
function drawBirds(t) {
  for (const b of birds) {
    const x = ((b.x + t * b.v) % 1.1 - 0.05) * view.w;
    const y = b.y * view.h + Math.sin(t * 0.7 + b.p) * 6;
    ctx.strokeStyle = "rgba(170,198,194,.35)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 2);
    ctx.quadraticCurveTo(x - 2, y - 2, x, y + 1);
    ctx.quadraticCurveTo(x + 2, y - 2, x + 5, y + 2);
    ctx.stroke();
  }
}

function drawHills(t) {
  ctx.save();
  const layers = [
    { y: 0.6, amp: 22, color: site.palette.hill1 || "#0d211e", par: 3 },
    { y: 0.68, amp: 34, color: site.palette.hill2 || "#10291f", par: 6 },
    { y: 0.76, amp: 48, color: site.palette.hill3 || "#163323", par: 9 },
  ];
  for (const layer of layers) {
    ctx.beginPath();
    ctx.moveTo(-40, view.h);
    const off = (cam.x * layer.par + cam.y * layer.par * 0.3) % 240;
    for (let x = -40; x <= view.w + 40; x += 48) {
      const h = layer.y * view.h - Math.sin((x + off) * 0.012) * layer.amp - layer.amp * 0.4;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(view.w + 40, view.h);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  }
  /* A few town lights at the far edge. */
  for (let i = 0; i < 18; i++) {
    const x = (hash(i, 77) * view.w + cam.x * 1.2) % view.w;
    const y = view.h * (0.68 + hash(i, 88) * 0.06);
    ctx.globalAlpha = 0.15 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.2 + i));
    ctx.fillStyle = i % 3 === 0 ? "#f3b53f" : "#8fe4e0";
    ctx.fillRect(x, y, 2, 1.5);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* -------------------------------------------------------------------- ground */

function drawGround(state, t) {
  const map = site.map;
  const terr = site.terrain;
  const far = project(-28, -28, -0.05);
  const far2 = project(48, -28, -0.05);
  const far3 = project(48, 48, -0.05);
  const far4 = project(-28, 48, -0.05);
  ctx.beginPath();
  ctx.moveTo(far.x, far.y);
  ctx.lineTo(far2.x, far2.y);
  ctx.lineTo(far3.x, far3.y);
  ctx.lineTo(far4.x, far4.y);
  ctx.closePath();
  ctx.fillStyle = terr.far || shadeColor(terr.grass[0], 0.35);
  ctx.fill();

  if (map.water) {
    for (let x = -4; x < 0; x++) {
      for (let y = -2; y <= map.rows + 2; y++) {
        const shade = 0.82 + hash(x, y) * 0.16;
        drawTile(x, y, shadeColor(terr.water, shade), false);
      }
    }
    ctx.strokeStyle = terr.waterGlint;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = -3.2 + hash(i, 4) * 2.2;
      const y = (hash(i, 8) * (map.rows + 2)) + ((t * 0.2 + i) % 3) - 1;
      const a = project(x, y, 0.015);
      const b = project(x + 0.35, y + 0.04, 0.015);
      ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.8 + i));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const vertical = new Set(map.vertical || []);
  const horizontal = new Set(map.horizontal || []);
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      let color;
      const road = vertical.has(x) || horizontal.has(y);
      if (road) color = hash(x, y) > 0.5 ? terr.road : terr.roadAlt;
      else if (hash(x, y) > 0.72) color = terr.grass[1];
      else if (hash(x, y) < 0.08) color = terr.dirt;
      else color = hash(x, y) > 0.5 ? terr.grass[0] : terr.grass[2];
      drawTile(x, y, color, false);
    }
  }

  ctx.strokeStyle = terr.roadLine;
  ctx.lineWidth = Math.max(1, 1.2 * cam.zoom);
  ctx.setLineDash([Math.max(4, 7 * cam.zoom), Math.max(4, 8 * cam.zoom)]);
  for (const x of (map.vertical || [])) roadLine(x + 0.5, 0.4, x + 0.5, map.rows - 0.8);
  for (const y of (map.horizontal || [])) roadLine(0.4, y + 0.5, map.cols - 1.2, y + 0.5);
  ctx.setLineDash([]);

  drawFence(0, 0, 0, map.rows - 0.02, 0.55, terr.fence);
  drawFence(map.cols, 0, map.cols, map.rows - 0.02, 0.55, terr.fence);
  drawFence(0, 0, map.cols, 0, 0.55, terr.fence);
  const gate = map.gate || [4.2, 7.6];
  drawFence(0, map.rows, gate[0], map.rows, 0.55, terr.fence);
  drawFence(gate[1], map.rows, map.cols, map.rows, 0.55, terr.fence);
  for (const x of gate) {
    const p = project(x, map.rows, 0.7);
    ctx.fillStyle = site.palette.steelLight || "#7b8787";
    ctx.fillRect(p.x - 2, p.y - 12, 4, 12);
    ctx.fillStyle = site.palette.amber || "#f3b53f";
    ctx.fillRect(p.x - 2, p.y - 14, 4, 3);
  }
}
function roadLine(x0, y0, x1, y1) {
  const a = project(x0, y0, 0.03);
  const b = project(x1, y1, 0.03);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function drawFence(x0, y0, x1, y1, z, colour) {
  const steps = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) * 1.2));
  ctx.strokeStyle = colour || "rgba(130,147,146,.48)";
  ctx.lineWidth = Math.max(1, cam.zoom);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const p = project(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  for (let i = 0; i <= steps; i += 3) {
    const k = i / steps;
    const p = project(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z);
    const q = project(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 0);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
}

function drawTile(x, y, color, stroke) {
  const a = project(x, y, 0);
  const b = project(x + 1, y, 0);
  const c = project(x + 1, y + 1, 0);
  const d = project(x, y + 1, 0);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = "rgba(0,0,0,.10)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

function shadeColor(hex, factor) {
  return shade(hex, factor);
}

/* -------------------------------------------------------------------- plots */

function drawPlots(state, t) {
  hits = [];
  const st = state.sites[state.activeSite];
  for (const zone of zones) {
    const z = st.zones[zone.id];
    const level = z ? z.level : 0;
    const p = zone.plot;
    const pad = 0.24;
    const poly = [
      project(p.x - pad, p.y - pad, 0.03),
      project(p.x + p.w + pad, p.y - pad, 0.03),
      project(p.x + p.w + pad, p.y + p.d + pad, 0.03),
      project(p.x - pad, p.y + p.d + pad, 0.03),
    ];
    const r = rot(p.x + p.w / 2 - cam.x, p.y + p.d / 2 - cam.y);
    hits.push({ id: zone.id, poly, depth: r.x + r.y });

    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = level > 0 ? "rgba(45,58,56,.72)" : "rgba(32,43,40,.58)";
    ctx.fill();
    ctx.strokeStyle = level > 0 ? "rgba(190,205,196,.18)" : "rgba(243,181,63,.22)";
    ctx.lineWidth = level > 0 ? 1 : 1.2;
    ctx.stroke();

    /* Hazard corners, visible enough to read as a plant boundary. */
    if (level === 0) {
      ctx.save();
      ctx.setLineDash([4 * cam.zoom, 4 * cam.zoom]);
      ctx.strokeStyle = "rgba(243,181,63,.32)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      const c = project(p.x + p.w / 2, p.y + p.d / 2, 0.55);
      drawSign(c.x, c.y, zone.unlock ? "LOCKED" : "BUILD", zone.unlock ? "#f3b53f" : "#9ed7df");
    } else {
      /* Service markings on built pads. */
      const c = project(p.x + p.w / 2, p.y + p.d / 2, 0.02);
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#ccd6cc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 9 * cam.zoom, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawSign(x, y, text, color) {
  const font = Math.max(9, Math.round(9.5 * cam.zoom));
  ctx.font = "700 " + font + "px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 12;
  const h = font + 7;
  roundRect(x - w / 2, y - h / 2, w, h, 4);
  ctx.fillStyle = "rgba(7,17,21,.78)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 0.5);
}

/* --------------------------------------------------------------- connections */

function connectionSegments(state) {
  const out = [];
  const byId = Object.fromEntries(zones.map((z) => [z.id, z]));
  const st = state.sites[state.activeSite];
  const links = LINKS.slice();
  if (byId.battery) links.push({ a: "battery", b: "substation", kind: "wire", color: "#9fb9ff" });
  if (byId.pump) links.push({ a: "pump", b: "cooling", kind: "pipe", color: "#6fd8e7" });
  if (byId.solar) links.push({ a: "solar", b: "battery", kind: "wire", color: "#ffc86b" });
  if (byId.geothermal) links.push({ a: "geothermal", b: "reactor", kind: "pipe", color: "#e9a36b" });
  for (const link of links) {
    const a = byId[link.a];
    const b = byId[link.b];
    if (!a || !b) continue;
    const ca = zoneCenter(a), cb = zoneCenter(b);
    const live = (st.zones[link.a]?.level || 0) > 0 && (st.zones[link.b]?.level || 0) > 0;
    const z = link.kind === "wire" ? 0.92 : 0.18;
    const pts = [
      project(ca.cx, ca.cy, z),
      project(cb.cx, ca.cy, z),
      project(cb.cx, cb.cy, z),
    ];
    out.push({ link, pts, live, x: a.plot.x });
  }
  const sub = byId.substation;
  if (sub && (st.zones.substation?.level || 0) > 0) {
    const c = zoneCenter(sub);
    out.push({
      offmap: true,
      live: true,
      pts: [project(c.cx, c.cy, 1.4), project(site.map.cols + 6, c.cy - 1.2, 1.4)],
    });
  }
  return out;
}

function drawConnections(state) {
  for (const seg of connectionSegments(state)) {
    const link = seg.link || { kind: "wire", color: "#f3b53f" };
    ctx.globalAlpha = seg.live ? (seg.offmap ? 0.5 : 0.62) : 0.14;
    ctx.strokeStyle = link.color;
    ctx.lineWidth = Math.max(0.8, (link.kind === "wire" ? 1.1 : 2.3) * cam.zoom);
    ctx.beginPath();
    ctx.moveTo(seg.pts[0].x, seg.pts[0].y);
    for (let i = 1; i < seg.pts.length; i++) ctx.lineTo(seg.pts[i].x, seg.pts[i].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawConnectionPulses(state, t) {
  for (const seg of connectionSegments(state)) {
    if (!seg.live) continue;
    const link = seg.link || { kind: "wire", color: "#f3b53f" };
    const pts = seg.pts;
    const length = pts.reduce((sum, p, i) => sum + (i ? Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
    const phase = seg.offmap
      ? (t * 0.35) % 1
      : (t * (link.kind === "wire" ? 0.55 : 0.32) + (seg.x || 0) * 0.1) % 1;
    const pos = pointAlong(pts, length * phase);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = link.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(1.4, 2.1 * cam.zoom), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function pointAlong(pts, dist) {
  let left = dist;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy);
    if (left <= len) {
      const k = len > 0 ? left / len : 0;
      return { x: pts[i].x + dx * k, y: pts[i].y + dy * k };
    }
    left -= len;
  }
  return pts[pts.length - 1];
}

function drawProps() {
  if (!props) return;
  drawModel(props, 0, 0, 1, 1);
}

/* --------------------------------------------------------------------- zones */

function drawZones(state, derived, now, t) {
  const st = state.sites[state.activeSite];
  const order = zones.filter((z) => (st.zones[z.id]?.level || 0) > 0)
    .map((z) => {
      const g = zoneCenter(z);
      const r = rot(g.cx - cam.x, g.cy - cam.y);
      return { zone: z, depth: r.x + r.y };
    })
    .sort((a, b) => a.depth - b.depth);

  for (const item of order) {
    const zone = item.zone;
    const level = st.zones[zone.id].level;
    const model = buildZoneModel(zone, level, siteId);
    if (!model) continue;
    const g = zoneCenter(zone);

    /* Shadow. */
    const p = zone.plot;
    const shadow = [
      project(p.x + 0.18, p.y + 0.3, 0.01),
      project(p.x + p.w + 0.35, p.y + 0.3, 0.01),
      project(p.x + p.w + 0.35, p.y + p.d + 0.42, 0.01),
      project(p.x + 0.18, p.y + p.d + 0.42, 0.01),
    ];
    ctx.beginPath();
    ctx.moveTo(shadow[0].x, shadow[0].y);
    for (let i = 1; i < shadow.length; i++) ctx.lineTo(shadow[i].x, shadow[i].y);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,.24)";
    ctx.fill();

    const anim = anims.get(zone.id);
    let scale = 1;
    if (anim) {
      const k = Math.min(1, anim.t / anim.duration);
      const e = 1 - Math.pow(1 - k, 3);
      scale = anim.kind === "build" ? 0.15 + 0.85 * e : 0.94 + 0.06 * e;
    }
    drawModel(model, g.cx, g.cy, scale, 1);
  }
}

function drawModel(model, cx, cy, scale, alpha) {
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  const faces = model.faces;
  const ordered = [];
  for (const f of faces) {
    let sx = 0, sy = 0, sz = 0;
    for (const p of f.p) {
      const dx = (cx + (p[0] - cx) * scale) - cam.x;
      const dy = (cy + (p[1] - cy) * scale) - cam.y;
      const rx = dx * c - dy * s;
      const ry = dx * s + dy * c;
      sx += rx; sy += ry; sz += p[2] * scale;
    }
    const n = f.p.length || 1;
    ordered.push({ f, depth: (sx + sy) / n + (sz / n) * 0.55 });
  }
  ordered.sort((a, b) => a.depth - b.depth);
  for (const item of ordered) {
    const f = item.f;
    const pts = [];
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of f.p) {
      const q = project(cx + (p[0] - cx) * scale, cy + (p[1] - cy) * scale, p[2] * scale);
      pts.push(q);
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
    if (maxX < -40 || minX > view.w + 40 || maxY < -40 || minY > view.h + 40) continue;
    ctx.globalAlpha = f.alpha * alpha;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = shade(f.c, f.tone);
    ctx.fill();
    if (f.alpha >= 0.99 && (maxX - minX) > 1.5) {
      ctx.strokeStyle = "rgba(5,14,17,.22)";
      ctx.lineWidth = 0.55;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/* Animated bits. */

function drawRotors(state, t) {
  const st = state.sites[state.activeSite];
  for (const zone of zones) {
    const level = st.zones[zone.id]?.level || 0;
    if (level < 1) continue;
    const model = buildZoneModel(zone, level, siteId);
    if (!model || !model.rotors) continue;
    for (const r of model.rotors) {
      const p = project(r.x, r.y, r.z);
      const rad = Math.max(2.5, r.r * 44 * cam.zoom);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(t * r.speed);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#c68a2e";
      for (let i = 0; i < 3; i++) {
        ctx.rotate(TAU / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rad, -rad * 0.24);
        ctx.lineTo(rad * 0.86, rad * 0.22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#2b3738";
      ctx.beginPath(); ctx.arc(0, 0, rad * 0.24, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#f3b53f";
      ctx.beginPath(); ctx.arc(0, 0, rad * 1.35, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

function drawLights(state, t) {
  const st = state.sites[state.activeSite];
  for (const zone of zones) {
    const level = st.zones[zone.id]?.level || 0;
    if (level < 1) continue;
    const model = buildZoneModel(zone, level, siteId);
    if (!model || !model.lights) continue;
    for (const l of model.lights) {
      const p = project(l.x, l.y, l.z);
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.2 + l.phase * 6.28);
      const rad = Math.max(1.8, l.size * 34 * cam.zoom);
      ctx.globalAlpha = 0.18 * pulse;
      ctx.fillStyle = l.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad * 2.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = l.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/* Tiny workers on the service road. They are deliberately a few rectangles:
 * at this camera distance, a hard hat is the entire character. */
function drawWorkers(t) {
  if (cam.zoom < 0.55) return;
  const paths = [
    { x: 5.2, y: 4.2 + ((t * 0.22) % 9), c: "#f3b53f" },
    { x: 2.2 + ((t * 0.17) % 7), y: 8.4, c: "#8fe4e0" },
    { x: 8.2, y: 8.2 + ((t * 0.14) % 5), c: "#ef6a5b" },
    { x: 3.2, y: 11.6 + Math.sin(t * 0.3) * 0.5, c: "#b9dd77" },
  ];
  for (const w of paths) {
    const p = project(w.x, w.y, 0.12);
    const s = Math.max(2.2, 3.8 * cam.zoom);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + s * 0.25, s * 0.9, s * 0.35, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#d8ded4";
    ctx.fillRect(p.x - s * 0.42, p.y - s * 1.4, s * 0.84, s * 1.2);
    ctx.fillStyle = "#e0b47c";
    ctx.beginPath(); ctx.arc(p.x, p.y - s * 1.62, s * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = w.c;
    ctx.fillRect(p.x - s * 0.52, p.y - s * 1.95, s * 1.04, s * 0.32);
  }
  ctx.globalAlpha = 1;
}

/* Assigned operators are visible where they work. The figure is deliberately
 * tiny; the hard-hat colour and the name tag do the identification. */
function drawCrew(state, t) {
  crewHits = [];
  const siteState = state.sites[state.activeSite];
  if (!siteState) return;
  for (const member of state.crew.roster) {
    if (member.site !== state.activeSite || !member.zone) continue;
    const zone = zones.find((z) => z.id === member.zone);
    if (!zone) continue;
    const g = zoneCenter(zone);
    const offset = (member.id.charCodeAt(0) % 5 - 2) * 0.12;
    const p = project(g.cx + offset, g.cy + 0.25, 0.15);
    const s = Math.max(2.4, 4.2 * cam.zoom);
    const def = CREW_BY_ID[member.id];
    const hardhat = def && def.portrait ? def.portrait.hardhat : "#f3b53f";
    const suit = def && def.portrait ? def.portrait.suit : "#3a4a48";
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + s * 0.3, s, s * 0.35, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = suit;
    ctx.fillRect(p.x - s * 0.42, p.y - s * 1.5, s * 0.84, s * 1.3);
    ctx.fillStyle = "#e0b47c";
    ctx.beginPath(); ctx.arc(p.x, p.y - s * 1.75, s * 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = hardhat;
    ctx.fillRect(p.x - s * 0.5, p.y - s * 2.08, s, s * 0.3);
    const ready = (state.crew.cooldowns[member.id] || 0) <= Date.now();
    if (ready) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + p.x * 0.03);
      ctx.fillStyle = hardhat;
      ctx.beginPath(); ctx.arc(p.x, p.y - s * 2.25, s * 0.22, 0, TAU); ctx.fill();
    }
    if (cam.zoom > 1.1) {
      ctx.globalAlpha = 0.75;
      ctx.font = "600 " + Math.max(7, Math.round(8 * cam.zoom)) + "px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e7f0eb";
      ctx.fillText(def ? def.name.split(" ")[0].toUpperCase() : member.id.toUpperCase(), p.x, p.y - s * 2.5);
    }
    crewHits.push({ id: member.id, x: p.x, y: p.y - s, r: Math.max(10, s * 3.2) });
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ selection */

function drawSelection(state, t) {
  const id = selected || highlight;
  if (!id) return;
  const zone = zones.find((x) => x.id === id);
  if (!zone) return;
  const p = zone.plot;
  const pad = 0.3 + Math.sin(t * 3) * 0.04;
  const poly = [
    project(p.x - pad, p.y - pad, 0.05),
    project(p.x + p.w + pad, p.y - pad, 0.05),
    project(p.x + p.w + pad, p.y + p.d + pad, 0.05),
    project(p.x - pad, p.y + p.d + pad, 0.05),
  ];
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  const color = id === highlight ? "#f3b53f" : zone.accent;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, 2.2 * cam.zoom);
  ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 3);
  ctx.stroke();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;

  const level = state.sites[state.activeSite].zones[id]?.level || 0;
  const c = project(p.x + p.w / 2, p.y + p.d / 2, 3.8);
  const label = level > 0 ? zone.name + " · LV " + level : zone.name + " · " + (zone.unlock ? "LOCKED" : "EMPTY");
  drawSign(c.x, c.y, label, color);
}

function drawVignette() {
  const g = ctx.createRadialGradient(
    view.w / 2, view.h * 0.52, Math.min(view.w, view.h) * 0.25,
    view.w / 2, view.h * 0.52, Math.max(view.w, view.h) * 0.78
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,.34)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);
}

/* -------------------------------------------------------------------- helpers */

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const hit = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export { project as projectPoint, cam as camera, view as sceneView };
