/* Volumetric brick-built character models for Machine Hunt.
 *
 * Every part is drawn with three visible faces (top, front, side) and a
 * consistent light from the upper left, so the 2D sprites read as solid
 * LEGO builds rather than flat shapes. Finished frames are cached as small
 * offscreen canvases and replayed with drawImage, keeping the per-frame cost
 * to one blit per actor even on low-tier devices.
 *
 * Pure helpers (shadeFace, modelCacheKey) are exported for headless tests.
 */
const TAU = Math.PI * 2;

export const FRAME_COUNT = 4;
const MAX_CACHE = 360;
const cache = new Map();

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
function adjust(hex, amount) {
  const [r, g, b] = rgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

const FACE_LIGHT = Object.freeze({ top: 1.16, front: 1, side: 0.7, bottom: 0.5 });

/** Pure: how bright a face is under the model's fixed upper-left light. */
export function shadeFace(hex, face, strength = 1) {
  const factor = FACE_LIGHT[face] ?? 1;
  return adjust(hex, (factor - 1) * 255 * strength);
}

/** Pure: cache identity for a model frame. */
export function modelCacheKey(kind, opts = {}) {
  return [
    kind,
    opts.frame | 0,
    opts.palette || "default",
    opts.flash ? 1 : 0,
    opts.bossPhase || 1,
  ].join("|");
}

function polygon(ctx, points, fill) {
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
function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
}

/* A LEGO brick with top, front and right faces plus studs. */
function brick3d(ctx, x, y, w, h, depth, color, opts = {}) {
  const dx = depth * 0.38;
  const dy = -depth * 0.46;
  const r = opts.radius ?? 3;
  const studs = opts.studs ?? 0;

  ctx.fillStyle = rgba("#020a08", 0.22);
  roundRect(ctx, x + 3, y + 4, w, h, r);
  ctx.fill();

  polygon(ctx, [[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]],
    shadeFace(color, "top"));
  polygon(ctx, [[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]],
    shadeFace(color, "side"));

  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, shadeFace(color, "front", 1.08));
  g.addColorStop(1, shadeFace(color, "front", 0.78));
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  if (studs > 0) {
    const step = w / studs;
    const sr = Math.min(5.5, step * 0.26);
    for (let i = 0; i < studs; i++) {
      const cx = x + step * (i + 0.5) + dx * 0.5;
      const cy = y + dy * 0.5 + 1;
      oval(ctx, cx, cy, sr, sr * 0.7, shadeFace(color, "top", 1.28));
      oval(ctx, cx - sr * 0.25, cy - sr * 0.2, sr * 0.45, sr * 0.3, "rgba(255,255,255,.42)");
    }
  }
  if (opts.outline !== false) {
    ctx.strokeStyle = rgba("#051215", 0.5);
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
  }
}

/* Rounded minifig head / cylinder with a lit top. */
function cyl3d(ctx, x, y, w, h, color) {
  ctx.fillStyle = rgba("#020a08", 0.2);
  roundRect(ctx, x + 2, y + 3, w, h, 4);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, shadeFace(color, "front", 1.12));
  g.addColorStop(0.7, color);
  g.addColorStop(1, shadeFace(color, "side", 0.9));
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  oval(ctx, x + w / 2, y + 2, w / 2, 3.5, shadeFace(color, "top", 1.2));
}

/* A limb: a beveled box rotated between two joints. */
function limb3d(ctx, x1, y1, x2, y2, width, color, depth = 5) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(Math.atan2(dy, dx));
  brick3d(ctx, 0, -width / 2, len, width, depth, color, { radius: 2 });
  disc(ctx, 0, 0, width * 0.42, shadeFace(color, "side", 0.85));
  ctx.restore();
}

function glow(ctx, x, y, r, color, strength = 0.55) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, strength));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
function sensor(ctx, x, y, r, color) {
  glow(ctx, x, y, r * 3, color, 0.5);
  disc(ctx, x, y, r, shadeFace(color, "side", 0.6));
  disc(ctx, x - r * 0.28, y - r * 0.28, r * 0.45, shadeFace(color, "top", 1.4));
  ctx.strokeStyle = rgba("#041014", 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}

/* --------------------------------------------------------------- hero build */

function drawHero(ctx, o) {
  const { torso, hair, legs, skin, bow, staff, frame, flash, kind } = o;
  const col = (c) => (flash ? "#ffe6c0" : c);
  const swing = frame % 2 === 0 ? 3 : -3;
  const breathe = frame % 2 === 0 ? 0 : 1;

  /* quiver behind the torso */
  if (bow || kind === "aloy") {
    brick3d(ctx, -21, -52 + breathe, 8, 22, 4, "#6b4a30", { studs: 0 });
    for (let i = 0; i < 3; i++) {
      line(ctx, -19 + i * 2.5, -52 + breathe, -19 + i * 2.5, -63 + breathe, "#e8d8b0", 1.5);
      disc(ctx, -19 + i * 2.5, -64 + breathe, 1.8, "#d9e2e8");
    }
  }

  /* legs, boots and hips */
  limb3d(ctx, -6, -20, -8 + swing, -1, 9, col(legs));
  limb3d(ctx, 6, -20, 8 - swing, -1, 9, col(legs));
  brick3d(ctx, -13, -24 + breathe, 26, 7, 5, col(legs), { studs: 2 });

  /* arms */
  limb3d(ctx, -15, -46 + breathe, -21 + swing, -27, 8, col(skin));
  limb3d(ctx, 15, -46 + breathe, 21 - swing, -27, 8, col(skin));

  /* torso with print and belt */
  brick3d(ctx, -15, -50 + breathe, 30, 28, 8, col(torso), { studs: 3, radius: 4 });
  brick3d(ctx, -5, -44 + breathe, 10, 8, 2, shadeFace(col(torso), "top", 1.3), { studs: 0 });
  ctx.fillStyle = rgba("#0a1418", 0.45);
  ctx.fillRect(-15, -27 + breathe, 30, 4);
  disc(ctx, 0, -25 + breathe, 2.4, "#f2c14e");

  /* head, face and hair */
  cyl3d(ctx, -10, -72 + breathe, 20, 20, col(skin));
  disc(ctx, -4, -63 + breathe, 1.5, "#2b201c");
  disc(ctx, 4, -63 + breathe, 1.5, "#2b201c");
  line(ctx, -7, -67 + breathe, -2, -67.5 + breathe, rgba("#5a3020", 0.8), 1);
  line(ctx, 2, -67.5 + breathe, 7, -67 + breathe, rgba("#5a3020", 0.8), 1);
  ctx.strokeStyle = rgba("#8a5030", 0.85);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, -61 + breathe, 3.4, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.fillStyle = col(hair);
  ctx.beginPath();
  ctx.arc(0, -70 + breathe, 11, Math.PI, TAU);
  ctx.fill();
  oval(ctx, -11, -65 + breathe, 3.8, 7, col(hair));

  /* bow and arrows */
  if (bow) {
    ctx.strokeStyle = "#d9a441";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(22, -60 + breathe);
    ctx.quadraticCurveTo(42, -44 + breathe, 22, -28 + breathe);
    ctx.stroke();
    ctx.strokeStyle = "#f3ecd7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(22, -60 + breathe);
    ctx.lineTo(22, -28 + breathe);
    ctx.stroke();
  }
  if (staff) {
    line(ctx, 21, -84, 25, -8, "#8a6a45", 5);
    sensor(ctx, 21, -86, 5, "#6fd8ff");
  }
}

/* -------------------------------------------------------------- machine builds */

function machineLegs(ctx, count, width, color, frame) {
  const swing = frame % 2 === 0 ? 4 : -4;
  for (let i = 0; i < count; i++) {
    const x = -16 + (32 / Math.max(1, count - 1)) * i;
    const dir = i % 2 === 0 ? 1 : -1;
    limb3d(ctx, x, -22, x + dir * swing, -2, width, shadeFace(color, "side", 0.75));
  }
}

function drawMachine(ctx, o) {
  const { kind, frame, flash, bossPhase } = o;
  const palettes = {
    scout: "#93a7b4", grazer: "#b0a08c", lancer: "#8aa6b5", bulwark: "#9c8c78",
    burrower: "#8a7d68", stalker: "#5f9e8b", flyer: "#8fa9bd", charger: "#ad7457",
  };
  const color = flash ? "#ffe6c0" : palettes[kind] || "#93a7b4";
  const eyeColor = kind === "grazer" || kind === "charger" || kind === "bulwark" ? "#e8733c" : "#6fd8ff";

  if (kind === "flyer") {
    brick3d(ctx, -19, -42, 38, 22, 7, color, { studs: 3, radius: 5 });
    const a = (frame / FRAME_COUNT) * TAU;
    for (const side of [-1, 1]) {
      ctx.strokeStyle = "rgba(217,226,232,.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(side * 27, -46, 14, a, a + Math.PI * 1.6);
      ctx.stroke();
      oval(ctx, side * 27, -46, 4, 4, shadeFace(color, "top", 1.3));
    }
    sensor(ctx, 14, -34, 4.5, "#ffd873");
    return;
  }

  const wide = kind === "bulwark" || kind === "charger" || kind === "grazer";
  const bw = wide ? 52 : kind === "stalker" ? 32 : 40;
  const bh = wide ? 26 : 20;
  machineLegs(ctx, wide ? 4 : 2, wide ? 9 : 7, color, frame);
  brick3d(ctx, -bw / 2, -44, bw, bh, 9, color, { studs: wide ? 4 : 3, radius: 5 });
  brick3d(ctx, -bw / 2 + 4, -51, bw - 8, 8, 4, shadeFace(color, "top", 1.15), { studs: 2, radius: 3 });

  /* panel lines */
  ctx.fillStyle = rgba("#0a1418", 0.25);
  for (let i = 0; i < 3; i++) ctx.fillRect(-bw / 2 + 9 + i * (bw / 4), -40, 2, bh - 8);

  if (kind === "lancer") {
    limb3d(ctx, bw / 2 - 4, -36, bw / 2 + 34, -39, 6, "#d9e2e8", 3);
    polygon(ctx, [[bw / 2 + 34, -39], [bw / 2 + 47, -45], [bw / 2 + 34, -33]], "#f0f5f8");
  } else if (kind === "bulwark") {
    brick3d(ctx, bw / 2 - 4, -52, 16, 44, 7, shadeFace(color, "top", 1.1), { studs: 2, radius: 4 });
    for (let i = 0; i < 4; i++) disc(ctx, bw / 2 + 3, -48 + i * 10, 2, "#d9e2e8");
  } else if (kind === "burrower") {
    for (let i = -1; i <= 1; i++) {
      polygon(ctx, [[i * 12 - 8, -44], [i * 12, -62], [i * 12 + 8, -44]], "#c9b79a");
      ctx.fillStyle = rgba("#0a1418", 0.2);
      ctx.fillRect(i * 12 - 1, -58, 2, 12);
    }
  } else if (kind === "charger") {
    limb3d(ctx, bw / 2 - 4, -44, bw / 2 + 20, -56, 6, "#e8d8c0", 3);
    limb3d(ctx, bw / 2 - 4, -32, bw / 2 + 20, -20, 6, "#e8d8c0", 3);
  } else if (kind === "stalker") {
    polygon(ctx, [[-bw / 2, -48], [-bw / 2 - 18, -56], [-bw / 2, -34]], shadeFace(color, "side", 0.9));
  } else {
    limb3d(ctx, -6, -51, -6, -64, 4, shadeFace(color, "top", 1.1), 2);
  }
  sensor(ctx, bw / 2 - 9, -37, 4.6, eyeColor);
}

/* ------------------------------------------------------------------- bosses */

function drawBoss(ctx, o) {
  const { kind, frame, flash, bossPhase } = o;
  const bases = {
    boss: "#8fa2aa", thunderjaw: "#a9764f", rockbreaker: "#7d7a6b", corrupted: "#7a5c96",
  };
  const base = bases[kind] || bases.boss;
  const body = flash ? "#ffe6c0"
    : bossPhase === 3 ? "#c8634a" : bossPhase === 2 ? "#a8817a" : base;
  const glowColor = bossPhase === 3 ? "#ff8b5c" : kind === "corrupted" ? "#c77dff" : "#6fd8ff";
  const swing = frame % 2 === 0 ? 7 : -7;

  machineLegs(ctx, 4, 13, body, frame);
  brick3d(ctx, -50, -94, 100, 52, 16, body, { studs: 5, radius: 8 });
  brick3d(ctx, -44, -104, 54, 12, 7, shadeFace(body, "top", 1.18), { studs: 3, radius: 4 });
  ctx.fillStyle = rgba("#0a1418", 0.26);
  for (let i = 0; i < 4; i++) ctx.fillRect(-38 + i * 22, -86, 3, 36);

  if (kind === "thunderjaw") {
    brick3d(ctx, -46, -122, 24, 22, 8, shadeFace(body, "side", 0.9), { studs: 2 });
    brick3d(ctx, 22, -122, 24, 22, 8, shadeFace(body, "side", 0.9), { studs: 2 });
    polygon(ctx, [[30, -76], [74, -68], [30, -56]], shadeFace(body, "top", 1.2));
    for (let i = 0; i < 5; i++) {
      polygon(ctx, [[34 + i * 7, -68], [38 + i * 7, -58], [42 + i * 7, -68]], "#f0f5f8");
    }
    sensor(ctx, 60, -64, 7, glowColor);
  } else if (kind === "rockbreaker") {
    for (const side of [-1, 1]) {
      brick3d(ctx, side * 44 - 18, -118, 36, 26, 9, shadeFace(body, "side", 0.9), { studs: 2 });
      polygon(ctx, [[side * 44, -118], [side * 76, -130], [side * 66, -94]], shadeFace(body, "top", 1.2));
    }
    sensor(ctx, 0, -74, 7, glowColor);
  } else if (kind === "corrupted") {
    for (let i = 0; i < 5; i++) {
      const px = -42 + i * 20;
      polygon(ctx, [[px, -94], [px + 10, -132 - (i % 2) * 12], [px + 20, -94]], "#9b6cc0");
    }
    glow(ctx, 0, -82, 72, "#c77dff", 0.32);
    sensor(ctx, 0, -74, 8, glowColor);
    sensor(ctx, -20, -80, 4, glowColor);
    sensor(ctx, 20, -80, 4, glowColor);
  } else {
    for (let i = 0; i < 5; i++) {
      brick3d(ctx, -13, -168 + i * 15, 26, 12, 6, shadeFace(body, "top", 1.05 + i * 0.04), { studs: 2, radius: 3 });
    }
    brick3d(ctx, -36, -204, 72, 36, 12, shadeFace(body, "top", 1.15), { studs: 3, radius: 6 });
    sensor(ctx, 0, -186, 8, glowColor);
    /* sensor dish */
    ctx.strokeStyle = rgba("#d9e2e8", 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -204, 36, 9, 0, 0, TAU);
    ctx.stroke();
  }
  void swing;
}

/* ------------------------------------------------------------------ public */

const HEROES = Object.freeze({
  aloy: { torso: "#c44536", hair: "#a33a22", legs: "#263743", bow: true },
  varl: { torso: "#8c6b45", hair: "#2c3e50", legs: "#263743" },
  teersa: { torso: "#4f9d8b", hair: "#2c3e50", legs: "#263743", staff: true },
  bruiser: { torso: "#8c6b45", hair: "#2c3e50", legs: "#263743" },
  mender: { torso: "#4f9d8b", hair: "#2c3e50", legs: "#263743", staff: true },
  gunner: { torso: "#7b4ea8", hair: "#2c3e50", legs: "#263743", bow: true },
});
const MACHINES = new Set([
  "scout", "grazer", "lancer", "bulwark", "burrower", "stalker", "flyer", "charger",
]);
const BOSSES = new Set(["boss", "thunderjaw", "rockbreaker", "corrupted"]);

function paintFrame(ctx, kind, opts) {
  const skin = "#f1c27d";
  if (HEROES[kind]) drawHero(ctx, { kind, skin, ...HEROES[kind], ...opts });
  else if (MACHINES.has(kind)) drawMachine(ctx, { kind, ...opts });
  else if (BOSSES.has(kind)) drawBoss(ctx, { kind, ...opts });
  else drawHero(ctx, { kind, skin, torso: "#8fa2aa", hair: "#2c3e50", legs: "#263743", ...opts });
}

function cachedFrame(kind, opts) {
  const key = modelCacheKey(kind, opts);
  let sheet = cache.get(key);
  if (sheet) return sheet;
  if (typeof document === "undefined") return null;
  const boss = BOSSES.has(kind);
  const w = boss ? 320 : 260;
  const h = boss ? 350 : 280;
  const scale = 2;
  sheet = { canvas: document.createElement("canvas"), w, h };
  sheet.canvas.width = w * scale;
  sheet.canvas.height = h * scale;
  const g = sheet.canvas.getContext("2d");
  g.scale(scale, scale);
  g.translate(w / 2, h - 24);
  paintFrame(g, kind, opts);
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, sheet);
  return sheet;
}

/** Draw a model with its feet at the current origin. */
export function drawModel(ctx, kind, opts = {}) {
  const settings = {
    frame: opts.frame | 0,
    palette: opts.palette || "default",
    flash: !!opts.flash,
    bossPhase: opts.bossPhase || 1,
  };
  const sheet = cachedFrame(kind, settings);
  if (!sheet) {
    paintFrame(ctx, kind, settings);
    return;
  }
  ctx.drawImage(sheet.canvas, -sheet.w / 2, -(sheet.h - 24), sheet.w, sheet.h);
}

export function clearModelCache() {
  cache.clear();
}
