/*
 * Default illustrated friends. These are drawn, not loaded, so the arcade
 * still ships zero binary art. A custom photo simply replaces the face; the
 * tier ring and pattern always come from the renderer.
 */

import { TIERS, nameSeed } from "./roster.js";

const SKIN = ["#f5c8a8", "#e6a97d", "#cf8558", "#a86542", "#7c4a31", "#f0d6bd"];
const HAIR = ["#2b2523", "#4c3329", "#9b593a", "#e9c27a", "#6d4b8f", "#d85f5a", "#25222f"];
const SHIRT = ["#ff8b83", "#ffc857", "#89c95a", "#49c9b6", "#65b7f5", "#8a8dff", "#c08bff", "#ff8fc8", "#f26d6d", "#f0b429", "#d8d3ff"];

function pick(seed, arr, salt = 0) {
  return arr[(seed + salt * 7) % arr.length];
}

function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function tinySpark(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4;
    const len = i % 2 === 0 ? s : s * 0.36;
    const px = x + Math.cos(a) * len;
    const py = y + Math.sin(a) * len;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawFace(ctx, x, y, scale, seed, palette, variant = 0) {
  const skin = palette.skin;
  const hair = palette.hair;
  const shirt = palette.shirt;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  /* shoulders / top */
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(0, 36, 32, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.beginPath();
  ctx.ellipse(-9, 32, 10, 15, -0.2, 0, Math.PI * 2);
  ctx.fill();

  /* neck */
  ctx.fillStyle = skin;
  rr(ctx, -7, 8, 14, 19, 6);
  ctx.fill();

  /* ears */
  ctx.beginPath();
  ctx.arc(-22, -2, 6, 0, Math.PI * 2);
  ctx.arc(22, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(120,60,40,.16)";
  ctx.beginPath();
  ctx.arc(-22, -2, 2.4, 0, Math.PI * 2);
  ctx.arc(22, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();

  /* face */
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -7, 22, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  /* hair variants */
  ctx.fillStyle = hair;
  const style = variant % 5;
  if (style === 0) {
    ctx.beginPath();
    ctx.arc(0, -13, 23.5, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(19, -3, 14, 6);
    ctx.quadraticCurveTo(0, -5, -14, 6);
    ctx.quadraticCurveTo(-19, -3, -20, -10);
    ctx.closePath();
    ctx.fill();
  } else if (style === 1) {
    ctx.beginPath();
    ctx.ellipse(0, -10, 25, 26, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(23, 16);
    ctx.quadraticCurveTo(12, 9, 10, 0);
    ctx.lineTo(-10, 0);
    ctx.quadraticCurveTo(-12, 9, -23, 16);
    ctx.closePath();
    ctx.fill();
  } else if (style === 2) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 1.08 + i * Math.PI * 0.17;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 19, -9 + Math.sin(a) * 15, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, -14, 18, 14, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (style === 3) {
    ctx.beginPath();
    ctx.ellipse(0, -13, 24, 24, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-22, 9, 7, 26, 0.08, 0, Math.PI * 2);
    ctx.ellipse(22, 9, 7, 26, -0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, -13, 22.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -38, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, -38, 5.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* eyes: dark, friendly and just asymmetrical enough to feel drawn */
  const blink = 0.82 + 0.18 * Math.sin(seed * 0.37 + (palette.blink || 0));
  ctx.fillStyle = "#27222a";
  ctx.beginPath();
  ctx.ellipse(-8, -6, 2.1, 3.1 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(8, -6, 2.1, 3.1 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.beginPath();
  ctx.arc(-7.2, -7.4, 0.7, 0, Math.PI * 2);
  ctx.arc(8.8, -7.4, 0.7, 0, Math.PI * 2);
  ctx.fill();

  /* brows */
  ctx.strokeStyle = hair;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, -12);
  ctx.quadraticCurveTo(-8, -14, -4, -12);
  ctx.moveTo(4, -12);
  ctx.quadraticCurveTo(8, -14, 12, -12);
  ctx.stroke();

  /* nose */
  ctx.strokeStyle = "rgba(92,45,32,.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.quadraticCurveTo(2.3, 2.4, -0.4, 2.8);
  ctx.stroke();

  /* smile */
  ctx.strokeStyle = "#8e3f45";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 3, 6.3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  /* cheeks */
  ctx.fillStyle = "rgba(238,98,103,.25)";
  ctx.beginPath();
  ctx.ellipse(-15, 3, 4.8, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(15, 3, 4.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  /* accessories */
  const access = (seed + variant * 3) % 6;
  if (access === 0) {
    ctx.strokeStyle = "rgba(38,34,42,.8)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-8, -6, 5.2, 0, Math.PI * 2);
    ctx.arc(8, -6, 5.2, 0, Math.PI * 2);
    ctx.moveTo(-2.8, -6);
    ctx.lineTo(2.8, -6);
    ctx.stroke();
  } else if (access === 1) {
    ctx.fillStyle = "#f2c84b";
    ctx.beginPath();
    ctx.arc(-22, 1, 2.5, 0, Math.PI * 2);
    ctx.arc(22, 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (access === 2) {
    ctx.strokeStyle = "#27222a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(13, -28, 2.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f2c84b";
    ctx.beginPath();
    ctx.arc(13, -28, 1, 0, Math.PI * 2);
    ctx.fill();
  } else if (access === 3) {
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath();
    ctx.arc(-14, -9, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawDefaultAvatar(ctx, index, cx, cy, radius, name = "") {
  const tier = TIERS[index] || TIERS[0];
  const seed = nameSeed(name, index * 97 + 13);
  const palette = {
    skin: pick(seed, SKIN, 1),
    hair: pick(seed, HAIR, 2),
    shirt: pick(seed, SHIRT, 3),
    blink: seed % 11,
  };

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  /* paper-colour background with soft party dots */
  ctx.fillStyle = tier.soft;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  const dotCount = Math.max(4, Math.round(radius / 16));
  for (let i = 0; i < dotCount; i++) {
    const a = seed * 0.01 + i * 2.4;
    const rr = radius * (0.35 + ((seed >> i) % 30) / 100);
    const dx = cx + Math.cos(a) * rr;
    const dy = cy + Math.sin(a * 1.3) * rr;
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,.3)" : "rgba(57,49,120,.12)";
    ctx.beginPath();
    ctx.arc(dx, dy, Math.max(1.3, radius * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }

  if (index === TIERS.length - 1) {
    /* The Whole Crew is a tiny group photo drawn as three overlapping heads. */
    drawFace(ctx, cx - radius * 0.34, cy + radius * 0.05, radius * 0.0095, seed, {
      skin: SKIN[(seed + 2) % SKIN.length],
      hair: HAIR[(seed + 3) % HAIR.length],
      shirt: SHIRT[(seed + 4) % SHIRT.length],
      blink: seed % 7,
    }, 1);
    drawFace(ctx, cx + radius * 0.34, cy + radius * 0.06, radius * 0.0095, seed + 9, {
      skin: SKIN[(seed + 4) % SKIN.length],
      hair: HAIR[(seed + 1) % HAIR.length],
      shirt: SHIRT[(seed + 5) % SHIRT.length],
      blink: seed % 5,
    }, 3);
    drawFace(ctx, cx, cy - radius * 0.06, radius * 0.0125, seed + 4, palette, 0);
    tinySpark(ctx, cx - radius * 0.6, cy - radius * 0.55, radius * 0.11, "#fff6d6");
    tinySpark(ctx, cx + radius * 0.6, cy - radius * 0.5, radius * 0.08, "#fff6d6");
  } else {
    drawFace(ctx, cx, cy + radius * 0.02, radius * 0.0235, seed, palette, seed % 5);
  }

  /* soft top-left light */
  const glow = ctx.createRadialGradient(
    cx - radius * 0.38, cy - radius * 0.5, 0,
    cx - radius * 0.38, cy - radius * 0.5, radius * 1.3,
  );
  glow.addColorStop(0, "rgba(255,255,255,.22)");
  glow.addColorStop(0.55, "rgba(255,255,255,0)");
  glow.addColorStop(1, "rgba(0,0,0,.1)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.restore();
}

export function drawWildcardAvatar(ctx, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  g.addColorStop(0, "#ff6b6b");
  g.addColorStop(0.25, "#ffc857");
  g.addColorStop(0.5, "#7bd88f");
  g.addColorStop(0.75, "#57b8ff");
  g.addColorStop(1, "#b47cff");
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = `800 ${Math.round(radius * 0.95)}px ui-rounded, "Trebuchet MS", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", cx, cy + radius * 0.05);

  for (let i = 0; i < 7; i++) {
    const a = i * 2.1;
    const rr = radius * (0.48 + (i % 3) * 0.15);
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,.75)" : "rgba(57,49,120,.35)";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, radius * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* A tiny star path used by the renderer's tier ring. */
export function drawStar(ctx, x, y, r, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / points;
    const len = i % 2 === 0 ? r : r * inner;
    const px = x + Math.cos(a) * len;
    const py = y + Math.sin(a) * len;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
