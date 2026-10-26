/*
 * The end-of-run postcard. Rendering lives here because it is just another
 * canvas view; sharing it is always an explicit user action in main.js.
 */

import { TIERS, MAX_TIER } from "./roster.js";
import { drawDefaultAvatar } from "./faces.js";
import { drawCircularPhoto } from "./portrait.js";

const TAU = Math.PI * 2;
const INK = "#29232b";
const CREAM = "#fff6e7";

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function spark(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const len = i % 2 ? s * 0.42 : s;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    else ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.closePath();
  ctx.fill();
}

function portrait(ctx, index, cx, cy, radius, squad, photos) {
  const tier = TIERS[index];
  const img = photos && photos.get(index);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.clip();
  if (img) drawCircularPhoto(ctx, img, cx, cy, radius);
  else drawDefaultAvatar(ctx, index, cx, cy, radius, squad[index] && squad[index].name);
  ctx.restore();

  ctx.lineWidth = Math.max(3, radius * 0.06);
  ctx.strokeStyle = CREAM;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.strokeStyle = tier.color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, TAU);
  ctx.stroke();
}

export function renderPostcard(spec) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const squad = spec.squad || [];
  const photos = spec.photos || new Map();
  const score = Math.round(spec.score || 0);
  const topTier = Math.max(0, Math.min(MAX_TIER, spec.maxTier || 0));
  const mode = spec.mode === "daily" ? "DAILY CIRCLE" : spec.mode === "dare" ? "FRIEND DARE" : "CLASSIC RUN";

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#fbf2e3");
  bg.addColorStop(0.62, "#f3e5d0");
  bg.addColorStop(1, "#ead8bf");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* giant soft rings */
  ctx.strokeStyle = "rgba(239,90,90,.12)";
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.arc(960, 170, 220, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(108,123,255,.12)";
  ctx.beginPath();
  ctx.arc(115, 1030, 190, 0, TAU);
  ctx.stroke();

  const colors = ["#ff6b6b", "#ffc857", "#7bd88f", "#57b8ff", "#b47cff"];
  for (let i = 0; i < 18; i++) {
    const x = 40 + ((i * 173 + 67) % 1000);
    const y = 40 + ((i * 281 + 109) % 1260);
    if (i % 3 === 0) spark(ctx, x, y, 9, colors[i % colors.length]);
    else {
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 4), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '900 34px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("INNER CIRCLE", 540, 92);
  ctx.font = '700 19px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.globalAlpha = 0.58;
  ctx.fillText("A VERY SERIOUS FRIENDSHIP ACHIEVEMENT", 540, 126);
  ctx.globalAlpha = 1;

  /* main portrait */
  const mainR = 176;
  const mainY = 385;
  ctx.fillStyle = "rgba(41,35,43,.12)";
  ctx.beginPath();
  ctx.ellipse(540, 605, 170, 24, 0, 0, TAU);
  ctx.fill();
  portrait(ctx, topTier, 540, mainY, mainR, squad, photos);

  const tier = TIERS[topTier];
  ctx.fillStyle = CREAM;
  roundRect(ctx, 306, 602, 468, 60, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(41,35,43,.2)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = tier.color;
  ctx.font = '900 25px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("TOP FRIEND", 540, 622);
  ctx.fillStyle = INK;
  ctx.font = '900 23px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText(tier.name.toUpperCase(), 540, 649);

  /* giant score */
  const scoreText = score.toLocaleString("en-US");
  ctx.fillStyle = INK;
  ctx.font = '900 130px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText(scoreText, 540, 786);
  ctx.fillStyle = "rgba(41,35,43,.55)";
  ctx.font = '800 22px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("SCORE  ·  " + mode, 540, 864);

  /* stats row */
  ctx.strokeStyle = "rgba(41,35,43,.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 922);
  ctx.lineTo(920, 922);
  ctx.stroke();
  const stats = [
    ["BEST CHAIN", "x" + (spec.bestCombo || 1)],
    ["MERGES", String(spec.merges || 0)],
    ["DATE", spec.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })],
  ];
  stats.forEach(([label, value], i) => {
    const x = 250 + i * 290;
    ctx.fillStyle = "rgba(41,35,43,.5)";
    ctx.font = '800 16px ui-rounded, "Trebuchet MS", sans-serif';
    ctx.fillText(label, x, 965);
    ctx.fillStyle = INK;
    ctx.font = '900 30px ui-rounded, "Trebuchet MS", sans-serif';
    ctx.fillText(value, x, 1001);
  });

  /* the full ladder */
  ctx.fillStyle = "rgba(41,35,43,.55)";
  ctx.font = '800 16px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("ELEVEN FRIENDS. ONE RIDICULOUS CIRCLE.", 540, 1080);
  for (let i = 0; i < TIERS.length; i++) {
    const x = 76 + i * 93;
    const y = 1168;
    const r = 35;
    if (i === topTier) {
      ctx.fillStyle = "rgba(255,200,87,.45)";
      ctx.beginPath();
      ctx.arc(x, y, 47, 0, TAU);
      ctx.fill();
    }
    portrait(ctx, i, x, y, r, squad, photos);
  }

  ctx.fillStyle = "rgba(41,35,43,.42)";
  ctx.font = '700 16px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("random2 arcade  ·  photos stay on your device", 540, 1278);

  return canvas;
}
