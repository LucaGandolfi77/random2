/*
 * Sand Loop — built-in source pictures
 * ------------------------------------
 * Drawn procedurally at 600 x 800, then run through the same quantizer as an
 * uploaded photo. No binary assets ship with the game.
 */

import { mulberry32 } from "./quantize.js";

const W = 600;
const H = 800;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function grain(ctx, seed, count, alpha) {
  const rng = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = alpha == null ? 0.12 : alpha;
  for (let i = 0; i < count; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const s = 0.7 + rng() * 2.3;
    ctx.fillStyle = rng() > 0.5 ? "#fff7e4" : "#1c130d";
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

function sky(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function dune(ctx) {
  sky(ctx, [[0, "#f7c46f"], [0.34, "#f0975d"], [0.62, "#b65366"], [1, "#3a2347"]]);
  const glow = ctx.createRadialGradient(432, 236, 10, 432, 236, 200);
  glow.addColorStop(0, "rgba(255,244,190,0.95)");
  glow.addColorStop(0.25, "rgba(255,214,132,0.55)");
  glow.addColorStop(1, "rgba(255,190,120,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffdf8a";
  ctx.beginPath(); ctx.arc(432, 236, 92, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#8e4b61";
  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.bezierCurveTo(140, 462, 268, 522, 402, 478);
  ctx.bezierCurveTo(500, 446, 552, 474, 600, 452);
  ctx.lineTo(600, 620); ctx.lineTo(0, 620); ctx.closePath(); ctx.fill();

  ctx.fillStyle = "#d9785c";
  ctx.beginPath();
  ctx.moveTo(0, 610);
  ctx.bezierCurveTo(130, 534, 250, 600, 382, 552);
  ctx.bezierCurveTo(472, 518, 540, 566, 600, 532);
  ctx.lineTo(600, 720); ctx.lineTo(0, 720); ctx.closePath(); ctx.fill();

  ctx.fillStyle = "#7e3c40";
  ctx.beginPath();
  ctx.moveTo(0, 688);
  ctx.bezierCurveTo(150, 618, 280, 682, 410, 630);
  ctx.bezierCurveTo(500, 594, 556, 638, 600, 616);
  ctx.lineTo(600, 800); ctx.lineTo(0, 800); ctx.closePath(); ctx.fill();

  ctx.fillStyle = "#4b2539";
  ctx.beginPath();
  ctx.moveTo(0, 760);
  ctx.bezierCurveTo(150, 710, 300, 758, 455, 710);
  ctx.bezierCurveTo(520, 690, 566, 720, 600, 706);
  ctx.lineTo(600, 800); ctx.lineTo(0, 800); ctx.closePath(); ctx.fill();

  /* dune crests */
  ctx.strokeStyle = "rgba(255,214,151,0.35)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(18, 646 + i * 26);
    ctx.bezierCurveTo(130, 600 + i * 24, 250, 664 + i * 18, 390, 610 + i * 20);
    ctx.stroke();
  }

  /* birds */
  ctx.strokeStyle = "#3b2237";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const [x, y, s] of [[160, 184, 1], [220, 146, 0.7], [354, 122, 0.55]]) {
    ctx.beginPath();
    ctx.moveTo(x - 22 * s, y);
    ctx.quadraticCurveTo(x - 8 * s, y - 13 * s, x, y);
    ctx.quadraticCurveTo(x + 8 * s, y - 13 * s, x + 22 * s, y);
    ctx.stroke();
  }
  grain(ctx, 1201, 900, 0.1);
}

function koi(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0c5b62");
  g.addColorStop(0.5, "#13808a");
  g.addColorStop(1, "#062f3a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(240, 240, 20, 240, 400, 470);
  glow.addColorStop(0, "rgba(142,235,213,0.28)");
  glow.addColorStop(1, "rgba(142,235,213,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(174,238,222,0.2)";
  ctx.lineWidth = 7;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(300, 380, 90 + i * 54, 40 + i * 33, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  function pad(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = "#1f6b4b";
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.72, 0, 0.24, Math.PI * 2 - 0.24);
    ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#4fa270"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.48, 0, 0.3, Math.PI * 2 - 0.3); ctx.stroke();
    ctx.restore();
  }
  pad(108, 618, 74, -0.4);
  pad(502, 186, 64, 0.9);
  pad(522, 660, 46, 0.2);

  function fish(x, y, size, body, spot, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-size * 0.85, 0);
    ctx.quadraticCurveTo(-size * 1.35, -size * 0.55, -size * 1.5, 0);
    ctx.quadraticCurveTo(-size * 1.35, size * 0.55, -size * 0.85, 0);
    ctx.fill();
    ctx.fillStyle = spot;
    ctx.beginPath(); ctx.ellipse(size * 0.18, -size * 0.04, size * 0.34, size * 0.22, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-size * 0.34, size * 0.06, size * 0.18, size * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#102b2e";
    ctx.beginPath(); ctx.arc(size * 0.66, -size * 0.11, size * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(236,248,232,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.72, size * 0.28, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.restore();
  }
  fish(378, 478, 104, "#f1ece0", "#e2542e", -0.55);
  fish(182, 314, 74, "#f4a33f", "#fff4dd", 0.8);
  fish(256, 622, 66, "#1c2b31", "#d94b32", 0.2);
  fish(488, 398, 42, "#f6dcc0", "#d33d32", 2.2);

  /* reeds */
  ctx.strokeStyle = "#2c8060";
  ctx.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const x = 42 + i * 22;
    ctx.beginPath();
    ctx.moveTo(x, 800);
    ctx.quadraticCurveTo(x + 18, 700 - i * 16, x + 4 + i * 3, 590 - i * 12);
    ctx.stroke();
  }
  grain(ctx, 299, 800, 0.09);
}

function alpine(ctx) {
  sky(ctx, [[0, "#b9d8df"], [0.45, "#e8d8b7"], [1, "#5d7f5b"]]);
  ctx.fillStyle = "rgba(255,246,203,0.9)";
  ctx.beginPath(); ctx.arc(132, 150, 66, 0, Math.PI * 2); ctx.fill();

  /* clouds */
  ctx.fillStyle = "rgba(255,250,238,0.55)";
  for (const [x, y, s] of [[420, 150, 1], [510, 236, 0.65], [190, 260, 0.55]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 80 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 50 * s, y - 12 * s, 55 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 52 * s, y + 6 * s, 46 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function mountain(baseY, peakX, peakY, half, color, snow) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(peakX - half, baseY);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(peakX + half, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(peakX - half * 0.24, peakY + (baseY - peakY) * 0.24);
    ctx.lineTo(peakX - half * 0.1, peakY + (baseY - peakY) * 0.17);
    ctx.lineTo(peakX + half * 0.03, peakY + (baseY - peakY) * 0.27);
    ctx.lineTo(peakX + half * 0.16, peakY + (baseY - peakY) * 0.16);
    ctx.lineTo(peakX + half * 0.27, peakY + (baseY - peakY) * 0.25);
    ctx.closePath(); ctx.fill();
  }
  mountain(560, 310, 180, 290, "#6b7182", "#eef3f0");
  mountain(590, 126, 262, 210, "#596173", "#e5ece9");
  mountain(600, 500, 232, 260, "#7d7986", "#f0efe7");
  mountain(650, 250, 340, 230, "#4c5f58", "#dfe9e2");
  mountain(670, 530, 362, 200, "#5e6d5f", "#e7eee5");

  const meadow = ctx.createLinearGradient(0, 600, 0, H);
  meadow.addColorStop(0, "#6d935f");
  meadow.addColorStop(1, "#25402f");
  ctx.fillStyle = meadow;
  ctx.beginPath();
  ctx.moveTo(0, 620);
  ctx.bezierCurveTo(160, 586, 260, 650, 420, 606);
  ctx.bezierCurveTo(500, 584, 560, 610, 600, 596);
  ctx.lineTo(600, 800); ctx.lineTo(0, 800); ctx.closePath(); ctx.fill();

  const rng = mulberry32(88);
  for (let i = 0; i < 90; i++) {
    const x = rng() * W;
    const y = 650 + rng() * 140;
    const c = ["#f4e5a1", "#e9a4a2", "#f3f0df", "#c7d98a"][i % 4];
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x, y, 2.5 + rng() * 5, 0, Math.PI * 2); ctx.fill();
    if (i % 5 === 0) {
      ctx.strokeStyle = "#3c5a3d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 18); ctx.stroke();
    }
  }
  grain(ctx, 404, 900, 0.1);
}

function moth(ctx) {
  sky(ctx, [[0, "#f1e6cf"], [0.5, "#e5d6b8"], [1, "#c8b290"]]);
  const rng = mulberry32(700);
  ctx.save();
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < 130; i++) {
    ctx.strokeStyle = i % 2 ? "#8f7454" : "#fffaf0";
    ctx.lineWidth = 0.8;
    const x = rng() * W, y = rng() * H, l = 4 + rng() * 22;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (rng() - 0.5) * 2); ctx.stroke();
  }
  ctx.restore();

  /* botanical corners */
  ctx.strokeStyle = "#58634a"; ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    const x = 52 + i * 20;
    ctx.beginPath();
    ctx.moveTo(x, 780);
    ctx.quadraticCurveTo(x + 44, 690 - i * 10, x + 26, 612 + i * 18);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? "#7b8764" : "#657053";
    ctx.beginPath();
    ctx.ellipse(x + 20, 700 - i * 8, 18, 8, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#9e4b34";
  ctx.beginPath(); ctx.arc(560, 92, 22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(520, 128, 12, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(300, 400);
  /* wings */
  function wing(side) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.fillStyle = "#ece2ca";
    ctx.strokeStyle = "#43372a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(8, -24);
    ctx.bezierCurveTo(128, -220, 284, -196, 246, -26);
    ctx.bezierCurveTo(226, 78, 120, 104, 54, 32);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, 38);
    ctx.bezierCurveTo(118, 28, 206, 112, 170, 212);
    ctx.bezierCurveTo(142, 286, 52, 252, 22, 152);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#c86d3f";
    ctx.beginPath(); ctx.ellipse(168, -92, 56, 34, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9b4c33";
    ctx.beginPath(); ctx.arc(142, -96, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(206, -58, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3f3529";
    ctx.beginPath(); ctx.arc(118, 154, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(154, 184, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(67,55,42,0.6)"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(60, -20 + i * 26);
      ctx.quadraticCurveTo(150, -120 + i * 54, 226, -56 + i * 30);
      ctx.stroke();
    }
    ctx.restore();
  }
  wing(-1); wing(1);

  /* body and antennae */
  ctx.fillStyle = "#3b3025";
  ctx.beginPath(); ctx.ellipse(0, -8, 18, 70, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -82, 19, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3b3025"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-8, -96); ctx.quadraticCurveTo(-64, -190, -36, -232); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -96); ctx.quadraticCurveTo(64, -190, 36, -232); ctx.stroke();
  ctx.fillStyle = "#c86d3f";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(0, -50 + i * 24, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  grain(ctx, 55, 1000, 0.1);
}

export const ARTWORKS = [
  {
    id: "dune",
    name: "Dune Sunset",
    hint: "Warm ridges and a low sun",
    accent: "#f0975d",
    draw: dune
  },
  {
    id: "koi",
    name: "Koi Pond",
    hint: "Slow fish under dark water",
    accent: "#2fb3a6",
    draw: koi
  },
  {
    id: "alpine",
    name: "Alpine Bloom",
    hint: "Snow, stone and a meadow",
    accent: "#89a66b",
    draw: alpine
  },
  {
    id: "moth",
    name: "Paper Moth",
    hint: "Ink, rust and warm paper",
    accent: "#c86d3f",
    draw: moth
  }
];

export const SOURCE_WIDTH = W;
export const SOURCE_HEIGHT = H;

export function makeSource(art) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  art.draw(ctx, W, H);
  return canvas;
}
