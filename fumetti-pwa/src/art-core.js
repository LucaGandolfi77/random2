/* Shared ink-and-paper helpers for the Fumetti canvas art. */

export const TAU = Math.PI * 2;
export const VH = 1000;

export const THEMES = {
  night: {
    sky1: "#04060d", sky2: "#111c33", haze: "#7e93b3", ink: "#07090f",
    paper: "#f1e6d0", amber: "#f4b64a", red: "#e63946", cyan: "#66d9ff",
    glow: "#ffe3a3", green: "#7ef0c8"
  },
  bar: {
    sky1: "#160d0d", sky2: "#3b2118", haze: "#d9a06a", ink: "#120a08",
    paper: "#f5e7cd", amber: "#f4a340", red: "#c43c3c", cyan: "#7fd6ff",
    glow: "#ffd08a", green: "#9ad6a4"
  },
  hospital: {
    sky1: "#071411", sky2: "#1c3a31", haze: "#a9d8c4", ink: "#06100d",
    paper: "#e8f0e6", amber: "#ffe1a0", red: "#d96a6a", cyan: "#9ff0e0",
    glow: "#e8fff8", green: "#7de0b8"
  },
  dawn: {
    sky1: "#231326", sky2: "#f08a5d", haze: "#ffcf9e", ink: "#150c12",
    paper: "#f8ecd8", amber: "#ffc46b", red: "#e05a4f", cyan: "#8fd9e8",
    glow: "#fff0cf", green: "#a8d6b0"
  },
  morning: {
    sky1: "#6f9dc0", sky2: "#f3d7ae", haze: "#e8dcc6", ink: "#141118",
    paper: "#f7edda", amber: "#e8b24f", red: "#c94a43", cyan: "#a9d8e8",
    glow: "#fff6df", green: "#86b98a"
  },
  dark: {
    sky1: "#020306", sky2: "#090d16", haze: "#3b4558", ink: "#03050a",
    paper: "#e9dfcc", amber: "#b98b3f", red: "#8e2b2b", cyan: "#3d7e94",
    glow: "#b9c6d8", green: "#4c8c78"
  }
};

export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexA(hex, alpha) {
  if (!hex || typeof hex !== "string") return `rgba(0,0,0,${alpha})`;
  if (hex.startsWith("rgb")) return hex;
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

export function poly(ctx, points, fill, stroke, lineWidth) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 2;
    ctx.stroke();
  }
}

export function line(ctx, x1, y1, x2, y2, color, width, cap) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap || "round";
  ctx.stroke();
}

export function glow(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
  const a = alpha == null ? 0.9 : alpha;
  g.addColorStop(0, hexA(color, a));
  g.addColorStop(0.45, hexA(color, a * 0.35));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function verticalGradient(ctx, x, y, w, h, from, to) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function sky(ctx, V, theme, rng, stars) {
  verticalGradient(ctx, 0, 0, V.w, V.h, theme.sky1, theme.sky2);
  glow(ctx, V.w * 0.52, V.h * 0.62, V.w * 0.7, theme.haze, 0.16);
  glow(ctx, V.w * 0.5, V.h * 1.02, V.w * 0.8, theme.amber, 0.08);
  if (stars) {
    for (let i = 0; i < 90; i++) {
      const x = rng() * V.w;
      const y = rng() * V.h * 0.62;
      const r = 0.6 + rng() * 1.4;
      ctx.globalAlpha = 0.15 + rng() * 0.55;
      ctx.fillStyle = theme.paper;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function rain(ctx, V, rng, theme, amount, alpha) {
  const count = amount || 160;
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const x = rng() * (V.w + 160) - 80;
    const y = rng() * V.h;
    const len = 12 + rng() * 46;
    ctx.strokeStyle = hexA(theme.haze, (alpha || 0.28) * (0.35 + rng() * 0.65));
    ctx.lineWidth = 0.7 + rng() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.32, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

export function fog(ctx, V, theme, rng, alpha) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const x = rng() * V.w;
    const y = V.h * (0.5 + rng() * 0.45);
    const r = V.w * (0.18 + rng() * 0.3);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(theme.haze, (alpha || 0.12) * (0.5 + rng() * 0.5)));
    g.addColorStop(1, hexA(theme.haze, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

export function grain(ctx, V, rng) {
  ctx.save();
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = 0.025 + rng() * 0.055;
    ctx.fillStyle = rng() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(rng() * V.w, rng() * V.h, 1 + rng() * 2, 1 + rng() * 2);
  }
  ctx.restore();
}

let dotCanvas = null;
function dotSource() {
  if (dotCanvas || typeof document === "undefined") return dotCanvas;
  dotCanvas = document.createElement("canvas");
  dotCanvas.width = 10;
  dotCanvas.height = 10;
  const g = dotCanvas.getContext("2d");
  g.fillStyle = "rgba(0,0,0,.5)";
  g.beginPath();
  g.arc(3, 3, 1.65, 0, TAU);
  g.fill();
  return dotCanvas;
}
export function halftone(ctx, V) {
  const source = dotSource();
  if (!source) return;
  /* A CanvasPattern belongs to the context that created it, and every panel
   * has its own canvas. Create it per paint; the source bitmap is cached. */
  const pattern = ctx.createPattern(source, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, V.w, V.h);
  ctx.restore();
}

export function vignette(ctx, V, theme) {
  const g = ctx.createRadialGradient(V.w / 2, V.h * 0.46, V.h * 0.18, V.w / 2, V.h * 0.5, V.w * 0.78);
  g.addColorStop(0, hexA(theme.ink, 0));
  g.addColorStop(0.72, hexA(theme.ink, 0.12));
  g.addColorStop(1, hexA(theme.ink, 0.58));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, V.w, V.h);
}

export function windows(ctx, x, y, w, h, cols, rows, theme, rng, onRatio) {
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() > (onRatio == null ? 0.25 : onRatio)) continue;
      ctx.fillStyle = rng() > 0.78 ? hexA(theme.cyan, 0.5) : hexA(theme.amber, 0.55);
      ctx.fillRect(x + c * cw + cw * 0.26, y + r * ch + ch * 0.24, cw * 0.46, ch * 0.36);
    }
  }
}

export function duomo(ctx, x, baseY, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.lineTo(x - w / 2, baseY - h * 0.5);
  ctx.lineTo(x - w * 0.36, baseY - h * 0.5);
  ctx.lineTo(x - w * 0.36, baseY - h * 0.7);
  ctx.lineTo(x - w * 0.18, baseY - h * 0.7);
  ctx.lineTo(x - w * 0.18, baseY - h * 0.86);
  ctx.lineTo(x - w * 0.07, baseY - h * 0.86);
  ctx.lineTo(x, baseY - h);
  ctx.lineTo(x + w * 0.07, baseY - h * 0.86);
  ctx.lineTo(x + w * 0.18, baseY - h * 0.86);
  ctx.lineTo(x + w * 0.18, baseY - h * 0.7);
  ctx.lineTo(x + w * 0.36, baseY - h * 0.7);
  ctx.lineTo(x + w * 0.36, baseY - h * 0.5);
  ctx.lineTo(x + w / 2, baseY - h * 0.5);
  ctx.lineTo(x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();

  for (let i = -4; i <= 4; i++) {
    const sx = x + (i / 5) * w * 0.46;
    const sh = h * (0.14 + Math.abs(i) * 0.018);
    ctx.beginPath();
    ctx.moveTo(sx - 1.7, baseY - h * (0.6 + Math.abs(i) * 0.02));
    ctx.lineTo(sx, baseY - h * (0.6 + Math.abs(i) * 0.02) - sh);
    ctx.lineTo(sx + 1.7, baseY - h * (0.6 + Math.abs(i) * 0.02));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function velasca(ctx, x, baseY, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x - w * 0.24, baseY - h * 0.62, w * 0.48, h * 0.62);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.24, baseY - h * 0.62);
  ctx.lineTo(x - w * 0.5, baseY - h * 0.78);
  ctx.lineTo(x - w * 0.5, baseY - h);
  ctx.lineTo(x + w * 0.5, baseY - h);
  ctx.lineTo(x + w * 0.5, baseY - h * 0.78);
  ctx.lineTo(x + w * 0.24, baseY - h * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function pirelli(ctx, x, baseY, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, baseY);
  ctx.lineTo(x - w * 0.34, baseY - h * 0.9);
  ctx.lineTo(x - w * 0.22, baseY - h);
  ctx.lineTo(x + w * 0.22, baseY - h);
  ctx.lineTo(x + w * 0.34, baseY - h * 0.9);
  ctx.lineTo(x + w * 0.5, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - w * 0.045, baseY - h * 1.16, w * 0.09, h * 0.2);
  ctx.restore();
}

export function skyline(ctx, V, theme, rng, opts = {}) {
  const baseY = (opts.baseY || 0.7) * V.h;
  const layers = [
    { alpha: 0.24, top: 0.3, spread: 0.26 },
    { alpha: 0.5, top: 0.24, spread: 0.22 },
    { alpha: 0.9, top: 0.16, spread: 0.18 }
  ];
  layers.forEach((layer, index) => {
    ctx.save();
    ctx.globalAlpha = opts.alpha == null ? layer.alpha : layer.alpha * opts.alpha;
    ctx.fillStyle = index === 0 ? hexA(theme.haze, 0.45) : theme.ink;
    let x = -40;
    while (x < V.w + 40) {
      const w = V.w * (0.035 + rng() * 0.05);
      const h = V.h * (layer.top + rng() * layer.spread);
      ctx.fillRect(x, baseY - h, w, h);
      if (index === 2 && rng() > 0.55) {
        windows(ctx, x, baseY - h, w, h, 2 + ((rng() * 3) | 0), 3 + ((rng() * 5) | 0), theme, rng, 0.22);
      }
      x += w + V.w * (0.004 + rng() * 0.014);
    }
    if (index === 2) {
      duomo(ctx, V.w * 0.46, baseY, V.w * 0.16, V.h * 0.25, theme.ink, 0.96);
      velasca(ctx, V.w * 0.74, baseY, V.w * 0.07, V.h * 0.3, theme.ink, 0.96);
      pirelli(ctx, V.w * 0.86, baseY, V.w * 0.045, V.h * 0.34, theme.ink, 0.96);
    }
    ctx.restore();
  });
}

export function tram(ctx, x, groundY, s, theme, lights) {
  const w = 150 * s;
  const h = 205 * s;
  const y = groundY - h;
  ctx.save();
  ctx.translate(x, y);
  const body = lights === false ? "#14161b" : "#8f2b2a";
  rr(ctx, -w / 2, 0, w, h, 18 * s);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5 * s;
  ctx.stroke();

  ctx.fillStyle = lights === false ? "#05070c" : hexA(theme.cyan, 0.24);
  rr(ctx, -w * 0.36, h * 0.08, w * 0.72, h * 0.3, 8 * s);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3 * s;
  ctx.stroke();

  ctx.fillStyle = lights === false ? "#0a0b10" : "#f6e7c8";
  rr(ctx, -w * 0.26, h * 0.42, w * 0.52, h * 0.13, 3 * s);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.font = `bold ${22 * s}px Impact, "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1", 0, h * 0.485);

  ctx.fillStyle = lights === false ? "#1a1c22" : hexA(theme.amber, 0.9);
  ctx.beginPath();
  ctx.arc(-w * 0.32, h * 0.72, 7 * s, 0, TAU);
  ctx.fill();
  if (lights !== false) glow(ctx, -w * 0.32, h * 0.72, 26 * s, theme.amber, 0.4);

  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, 0);
  ctx.lineTo(-w * 0.46, -h * 0.2);
  ctx.moveTo(w * 0.28, 0);
  ctx.lineTo(w * 0.46, -h * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-w * 0.46, -h * 0.2);
  ctx.lineTo(w * 0.46, -h * 0.2);
  ctx.stroke();
  ctx.restore();
}

export function streetLamp(ctx, x, groundY, h, theme, on) {
  ctx.save();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - h);
  ctx.quadraticCurveTo(x, groundY - h - 26, x + 42, groundY - h - 28);
  ctx.stroke();
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.ellipse(x + 50, groundY - h - 26, 14, 6, 0, 0, TAU);
  ctx.fill();
  if (on === false) {
    ctx.restore();
    return;
  }
  glow(ctx, x + 50, groundY - h - 22, 76, theme.amber, 0.52);
  ctx.fillStyle = theme.glow;
  ctx.beginPath();
  ctx.ellipse(x + 50, groundY - h - 24, 8, 4, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createLinearGradient(x + 50, groundY - h - 20, x + 50, groundY);
  g.addColorStop(0, hexA(theme.amber, 0.2));
  g.addColorStop(1, hexA(theme.amber, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 44, groundY - h - 20);
  ctx.lineTo(x + 56, groundY - h - 20);
  ctx.lineTo(x + 112, groundY);
  ctx.lineTo(x - 16, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function neon(ctx, text, x, y, size, color, rotate) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(((rotate || 0) * Math.PI) / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${size}px Impact, "Arial Narrow", sans-serif`;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.7;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexA("#ffffff", 0.7);
  ctx.lineWidth = Math.max(1, size * 0.035);
  ctx.strokeText(text, 0, 0);
  ctx.restore();
}

export function wetRoad(ctx, V, theme, rng, top) {
  verticalGradient(ctx, 0, top, V.w, V.h - top, hexA(theme.ink, 0.92), theme.ink);
  for (let i = 0; i < 60; i++) {
    const x = rng() * V.w;
    const y = top + rng() * (V.h - top);
    ctx.globalAlpha = 0.05 + rng() * 0.16;
    ctx.fillStyle = rng() > 0.6 ? theme.amber : theme.cyan;
    ctx.fillRect(x, y, 1 + rng() * 3, 8 + rng() * 54);
  }
  ctx.globalAlpha = 1;
}
