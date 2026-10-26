/*
 * Circle Wrapped - a locally generated recap poster. Like the postcard, this
 * is a DOM-only canvas view; no data leaves the tab until the player shares it.
 */

import { TIERS, MAX_TIER } from "./roster.js";
import { POWERS } from "./engine.js";
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
    const px = x + Math.cos(a) * len;
    const py = y + Math.sin(a) * len;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
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
  ctx.lineWidth = Math.max(3, radius * 0.055);
  ctx.strokeStyle = CREAM;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, radius * 0.032);
  ctx.strokeStyle = tier.color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, TAU);
  ctx.stroke();
}

function mostMerged(progress) {
  const counts = progress.tierMerges && typeof progress.tierMerges === "object" ? progress.tierMerges : {};
  let tier = 0;
  let count = 0;
  for (const key of Object.keys(counts)) {
    const i = Number(key);
    const n = Number(counts[key]) || 0;
    if (i >= 0 && i <= MAX_TIER && n > count) {
      tier = i;
      count = n;
    }
  }
  return { tier, count };
}

function favouritePower(progress) {
  const uses = progress.powerUses && typeof progress.powerUses === "object" ? progress.powerUses : {};
  let id = "";
  let count = 0;
  for (const key of Object.keys(uses)) {
    if (!POWERS[key]) continue;
    if (Number(uses[key]) > count) {
      id = key;
      count = Number(uses[key]) || 0;
    }
  }
  return { id, count, name: id ? POWERS[id].name : "—" };
}

function statCard(ctx, x, y, w, h, label, value, sub, color) {
  ctx.fillStyle = "rgba(255,248,236,.72)";
  roundRect(ctx, x, y, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(41,35,43,.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color || INK;
  ctx.font = '800 15px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label.toUpperCase(), x + 22, y + 32);
  ctx.fillStyle = INK;
  ctx.font = '900 32px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText(value, x + 22, y + 74);
  if (sub) {
    ctx.fillStyle = "rgba(41,35,43,.56)";
    ctx.font = '700 14px ui-rounded, "Trebuchet MS", sans-serif';
    ctx.fillText(sub, x + 22, y + 100);
  }
}

export function renderWrapped(spec) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const progress = spec.progress || {};
  const squad = spec.squad || [];
  const photos = spec.photos || new Map();
  const topTier = Math.max(0, Math.min(MAX_TIER, Number(progress.bestTier) || 0));
  const bestFriend = mostMerged(progress);
  const power = favouritePower(progress);
  const rivals = Array.isArray(progress.rivals) ? progress.rivals : [];
  const dareWins = rivals.filter((rival) => rival.outcome === "win").length;
  const friendProfile = squad[bestFriend.tier] || {};
  const quote = friendProfile.line || (
    bestFriend.tier >= 0 ? `${nameOf(bestFriend.tier, squad)} has entered the chat.` : "The circle is officially a thing."
  );

  const bg = ctx.createLinearGradient(0, 0, 0, 1350);
  bg.addColorStop(0, "#fbf3e5");
  bg.addColorStop(0.58, "#f1e0c7");
  bg.addColorStop(1, "#e9d4b8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

  /* Big overlapping rings */
  ctx.lineWidth = 38;
  ctx.strokeStyle = "rgba(239,90,90,.12)";
  ctx.beginPath(); ctx.arc(880, 260, 250, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "rgba(108,123,255,.12)";
  ctx.beginPath(); ctx.arc(170, 1030, 280, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "rgba(33,191,167,.10)";
  ctx.lineWidth = 22;
  ctx.beginPath(); ctx.arc(930, 1090, 170, 0, TAU); ctx.stroke();

  const colors = ["#ff6b6b", "#ffc857", "#7bd88f", "#57b8ff", "#b47cff"];
  for (let i = 0; i < 24; i++) {
    const x = 30 + ((i * 163 + 41) % 1020);
    const y = 30 + ((i * 257 + 83) % 1270);
    if (i % 4 === 0) spark(ctx, x, y, 9, colors[i % colors.length]);
    else {
      ctx.globalAlpha = 0.48;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '900 34px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("CIRCLE WRAPPED", 540, 86);
  ctx.fillStyle = "rgba(41,35,43,.55)";
  ctx.font = '800 17px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText(new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase(), 540, 120);

  ctx.fillStyle = INK;
  ctx.font = '900 64px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("The year of", 540, 192);
  ctx.fillStyle = "#c53649";
  ctx.fillText("your people.", 540, 256);

  ctx.fillStyle = "rgba(41,35,43,.6)";
  ctx.font = '700 19px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText(`${(progress.runs || 0).toLocaleString("en-US")} circles made  ·  ${(progress.totalMerges || 0).toLocaleString("en-US")} friendships merged`, 540, 304);

  /* main portrait */
  portrait(ctx, topTier, 540, 466, 146, squad, photos);
  ctx.fillStyle = CREAM;
  roundRect(ctx, 330, 624, 420, 54, 27);
  ctx.fill();
  ctx.strokeStyle = "rgba(41,35,43,.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = TIERS[topTier].color;
  ctx.font = '900 20px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("TOP FRIEND", 540, 641);
  ctx.fillStyle = INK;
  ctx.font = '900 19px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText(TIERS[topTier].name.toUpperCase(), 540, 664);

  /* quote bubble */
  ctx.fillStyle = "rgba(255,248,236,.82)";
  roundRect(ctx, 126, 704, 828, 66, 33);
  ctx.fill();
  ctx.strokeStyle = "rgba(41,35,43,.14)";
  ctx.stroke();
  ctx.fillStyle = "rgba(41,35,43,.7)";
  ctx.font = 'italic 700 18px ui-rounded, "Trebuchet MS", sans-serif';
  const clippedQuote = quote.length > 72 ? quote.slice(0, 69) + "…" : quote;
  ctx.fillText(`“${clippedQuote}”`, 540, 738);

  /* stat cards */
  statCard(ctx, 96, 804, 288, 124, "Best score", (progress.best || 0).toLocaleString("en-US"), modeBest(progress), "#c53649");
  statCard(ctx, 396, 804, 288, 124, "Biggest chain", "x" + (progress.bestCombo || 0), "One ridiculous moment", "#7440c4");
  statCard(ctx, 696, 804, 288, 124, "Most merged", nameOf(bestFriend.tier, squad), bestFriend.count ? bestFriend.count + " times" : "No data yet", "#0d766b");

  statCard(ctx, 96, 944, 288, 124, "Favourite trick", power.name, power.count ? power.count + " uses" : "No data yet", "#9a6207");
  statCard(ctx, 396, 944, 288, 124, "Dares won", dareWins + "/" + rivals.length, rivals.length ? "Friend challenges" : "No dares yet", "#c53649");
  statCard(ctx, 696, 944, 288, 124, "Daily streak", (progress.dailyStreak || 0) + " days", "Keep showing up", "#0d766b");

  /* full circle */
  ctx.fillStyle = "rgba(41,35,43,.5)";
  ctx.font = '800 15px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("THE WHOLE CIRCLE, IN ORDER OF ARRIVAL", 540, 1110);
  for (let i = 0; i < TIERS.length; i++) {
    const x = 76 + i * 93;
    const y = 1182;
    const r = 34;
    if (i === topTier || i === bestFriend.tier) {
      ctx.fillStyle = i === topTier ? "rgba(255,200,87,.45)" : "rgba(33,191,167,.24)";
      ctx.beginPath(); ctx.arc(x, y, 46, 0, TAU); ctx.fill();
    }
    portrait(ctx, i, x, y, r, squad, photos);
  }

  ctx.fillStyle = "rgba(41,35,43,.44)";
  ctx.font = '700 15px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.fillText("inner circle  ·  photos stay on your device  ·  random2 arcade", 540, 1290);

  return canvas;
}

function nameOf(index, squad) {
  const slot = squad[index];
  if (slot && slot.name) return slot.name;
  return TIERS[index] ? TIERS[index].name : "Friend";
}

function modeBest(progress) {
  const best = progress.bestByMode || {};
  if (best.daily) return "Daily best " + Number(best.daily).toLocaleString("en-US");
  if (best.dare) return "Dare best " + Number(best.dare).toLocaleString("en-US");
  return "Personal best";
}
