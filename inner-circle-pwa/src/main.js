/*
 * INNER CIRCLE — app shell
 * ------------------------
 * Screens, input, the photo booth, local records and the PWA lifecycle.
 * The rules live in engine.js and the painting in render.js.
 */

import {
  createEngine,
  POWERS,
  POWER_ORDER,
  DAILY_RULES,
  WORLD,
} from "./engine.js";
import {
  TIERS,
  MAX_TIER,
  BADGES,
  VIBES,
  STORAGE,
  sanitizeSquad,
  emptySquad,
  countCustomPhotos,
  vibeById,
} from "./roster.js";
import { createRenderer } from "./render.js";
import { drawDefaultAvatar } from "./faces.js";
import {
  drawCircularPhoto,
  preloadSquadPhotos,
  decodeImage,
  makeCropState,
  drawCropPreview,
  clampCropState,
  cropToDataUrl,
  autoCropFile,
  CROP_VIEW,
} from "./portrait.js";
import { renderPostcard } from "./postcard.js";
import { renderWrapped } from "./wrapped.js";
import { chooseChat, nameForTier } from "./chat.js";
import { dareFromSearch, dareUrl } from "./dare.js";

const SLUG = "inner-circle-pwa";
const $ = (id) => document.getElementById(id);
const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const BADGE_ICONS = {
  "first-merge": "✦",
  "chain-4": "⚡",
  "tier-5": "✋",
  "tier-8": "💛",
  "tier-10": "🌞",
  "whole-crew": "🫂",
  legendary: "📸",
  "score-2500": "🎉",
  "score-10000": "🪩",
  "daily-3": "🔥",
};
const DEFAULT_PROGRESS = {
  best: 0,
  bestCombo: 0,
  bestTier: 0,
  runs: 0,
  badges: [],
  hall: [],
  history: [],
  daily: {},
  dailyStreak: 0,
  lastDaily: "",
  bestByMode: { classic: 0, daily: 0, dare: 0 },
  tierMerges: {},
  powerUses: {},
  totalMerges: 0,
  totalScore: 0,
  rivals: [],
};

let squad = emptySquad();
let photos = new Map();
let progress = { ...DEFAULT_PROGRESS };
let activeScreen = "home";
let renderer = null;

let game = null;
let mode = "classic";
let paused = false;
let runFinished = false;
let runStart = 0;
let runPowers = { swap: 0, hug: 0, plus: 0 };
let runTierMerges = {};
let lastResult = null;
let dailyContext = null;
let runDare = null;
let activeDare = null;
let chatEnabled = true;
let chatMessages = [];
let chatCooldownUntil = 0;
let chatHideTimer = 0;
let playerName = "A friend";

let running = false;
let rafId = 0;
let lastTs = 0;
let lastHudAt = 0;
let nextPreviewKey = "";
let lastLadderTier = -1;
let boardToastTimer = 0;
let toastTimer = 0;
let nameSaveTimer = 0;

let cropContext = null;
let cropDragging = null;
let confirmAction = null;
let lastFocus = null;
let helpResume = false;

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function pad2(n) { return n < 10 ? "0" + n : String(n); }

function dateKey(d = new Date()) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

function formatNumber(n) {
  return Math.round(n || 0).toLocaleString("en-US");
}

function modeLabel(m = mode) {
  if (m === "daily") return "Daily circle";
  if (m === "dare") return "Friend dare";
  return "Classic";
}

function currentDaily() {
  const seed = window.R2 ? window.R2.dailySeed() : 1;
  const rule = DAILY_RULES[seed % DAILY_RULES.length];
  const key = dateKey();
  const row = progress.daily && progress.daily[key] ? progress.daily[key] : null;
  return { seed, rule, key, best: row ? row.best || 0 : 0, runs: row ? row.runs || 0 : 0 };
}

function currentStreak() {
  if (!progress.lastDaily) return 0;
  if (progress.lastDaily === dateKey() || progress.lastDaily === yesterdayKey()) {
    return progress.dailyStreak || 0;
  }
  return 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function audioEnabled() {
  return window.R2 ? window.R2.getSettings().sound !== false : false;
}

function hapticsEnabled() {
  return window.R2 ? window.R2.getSettings().haptics !== false : false;
}

function saveProgress() {
  if (window.R2) window.R2.saveJSON(STORAGE.progress, progress);
}

function saveSquad() {
  try {
    localStorage.setItem(STORAGE.squad, JSON.stringify(squad));
    return true;
  } catch (e) {
    toast("Couldn’t save — this browser’s storage is full. Try a smaller photo.");
    return false;
  }
}

function toast(message) {
  const node = $("toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2400);
}

function announce(message) {
  const node = $("srStatus");
  if (node) node.textContent = message;
}

function showBoardToast(message, ms = 1500) {
  const node = $("boardToast");
  if (!node) return;
  node.textContent = message;
  node.classList.remove("hidden");
  clearTimeout(boardToastTimer);
  boardToastTimer = setTimeout(() => node.classList.add("hidden"), ms);
}

function flashDangerBanner() {
  if (reduced) return;
  const banner = $("dangerBanner");
  if (!banner) return;
  banner.classList.add("show");
  setTimeout(() => {
    if (!game || !game.state.dangerActive) banner.classList.remove("show");
  }, 160);
}

/* ------------------------------------------------------------------ */
/* data loading                                                        */
/* ------------------------------------------------------------------ */

function loadProgress() {
  const raw = window.R2 ? window.R2.loadJSON(STORAGE.progress, null) : null;
  const out = Object.assign({}, DEFAULT_PROGRESS, raw && typeof raw === "object" ? raw : {});
  out.badges = Array.isArray(out.badges) ? out.badges.filter((b) => BADGES.some((x) => x.id === b)) : [];
  out.hall = Array.isArray(out.hall) ? out.hall.filter((r) => r && Number.isFinite(r.score)).slice(0, 12) : [];
  out.history = Array.isArray(out.history)
    ? out.history.filter((r) => r && Number.isFinite(r.score)).slice(0, 30)
    : [];
  out.daily = out.daily && typeof out.daily === "object" ? out.daily : {};
  out.bestByMode = Object.assign({ classic: 0, daily: 0, dare: 0 }, out.bestByMode || {});
  out.bestByMode.classic = Number(out.bestByMode.classic) || 0;
  out.bestByMode.daily = Number(out.bestByMode.daily) || 0;
  out.bestByMode.dare = Number(out.bestByMode.dare) || 0;
  out.best = Number(out.best) || 0;
  out.bestCombo = Number(out.bestCombo) || 0;
  out.bestTier = Number(out.bestTier) || 0;
  out.runs = Number(out.runs) || 0;
  out.dailyStreak = Number(out.dailyStreak) || 0;
  out.tierMerges = out.tierMerges && typeof out.tierMerges === "object" ? out.tierMerges : {};
  for (const key of Object.keys(out.tierMerges)) out.tierMerges[key] = Number(out.tierMerges[key]) || 0;
  out.powerUses = out.powerUses && typeof out.powerUses === "object" ? out.powerUses : {};
  for (const key of Object.keys(out.powerUses)) out.powerUses[key] = Number(out.powerUses[key]) || 0;
  out.totalMerges = Number(out.totalMerges) || 0;
  out.totalScore = Number(out.totalScore) || 0;
  out.rivals = Array.isArray(out.rivals) ? out.rivals.filter((r) => r && typeof r === "object").slice(0, 20) : [];
  return out;
}

async function refreshPhotos() {
  photos = await preloadSquadPhotos(squad);
  if (renderer) renderer.setSquad(squad, photos);
}

/* ------------------------------------------------------------------ */
/* portrait painting                                                   */
/* ------------------------------------------------------------------ */

function paintPortrait(canvas, tierIndex, cssSize) {
  if (!canvas) return;
  const size = Math.max(20, cssSize || canvas.clientWidth || 72);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - Math.max(2, size * 0.035);
  const tier = TIERS[tierIndex] || TIERS[0];

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const img = photos.get(tierIndex);
  if (!(img && drawCircularPhoto(ctx, img, cx, cy, r))) {
    drawDefaultAvatar(ctx, tierIndex, cx, cy, r, squad[tierIndex] && squad[tierIndex].name);
  }
  ctx.restore();

  ctx.lineWidth = Math.max(1.6, size * 0.035);
  ctx.strokeStyle = tier.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2);
  ctx.stroke();
  canvas.setAttribute("aria-label", tier.name + (squad[tierIndex] && squad[tierIndex].name ? ", " + squad[tierIndex].name : ""));
}

function paintResultPortrait(tierIndex) {
  paintPortrait($("resultAvatar"), tierIndex, 144);
}

/* ------------------------------------------------------------------ */
/* home screen                                                         */
/* ------------------------------------------------------------------ */

function renderHome() {
  renderHero();
  renderCast();
  renderHomeStats();
  renderDaily();
  renderRecords();
  renderBadges();
  renderDareCard();
  updateSoundUI();
  updateChatUI();
}

function renderHero() {
  [7, 4, 0].forEach((tier, i) => paintPortrait($("heroAvatar" + i), tier, 180));
}

function renderCast() {
  const wrap = $("homeCast");
  if (!wrap) return;
  wrap.innerHTML = "";
  TIERS.forEach((tier, i) => {
    const item = document.createElement("div");
    item.className = "cast-item";
    item.style.setProperty("--ring", tier.color);
    const label = squad[i] && squad[i].name ? squad[i].name : tier.short;
    item.innerHTML = `<canvas width="58" height="58" aria-hidden="true"></canvas>
      <span title="${escapeHtml(label)}">${escapeHtml(label)}</span><b>${pad2(i + 1)}</b>`;
    wrap.appendChild(item);
    paintPortrait(item.querySelector("canvas"), i, 58);
  });
  const count = countCustomPhotos(squad);
  $("castNote").textContent = count
    ? count + " of 11 friends are your own photos. Tap Photo Booth to swap the rest."
    : "Illustrated friends for now. Add photos of your own crew in the Photo Booth.";
}

function renderHomeStats() {
  $("statBest").textContent = formatNumber(progress.best);
  $("statChain").textContent = "x" + (progress.bestCombo || 0);
  $("statTop").textContent = progress.bestTier >= 0 && progress.bestTier <= MAX_TIER && progress.runs > 0
    ? TIERS[progress.bestTier].name
    : "—";
  $("statRuns").textContent = formatNumber(progress.runs);
}

function renderDaily() {
  const daily = currentDaily();
  const date = new Date();
  $("dailyDate").textContent = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  $("dailyRuleName").textContent = daily.rule.name;
  $("dailyRuleBlurb").textContent = daily.rule.blurb;
  $("dailyBest").textContent = daily.best ? formatNumber(daily.best) : "—";
  const streak = currentStreak();
  $("dailyStreak").textContent = streak + (streak === 1 ? " day" : " days");
}

function renderRecords() {
  const list = $("recordList");
  if (!list) return;
  if (!progress.hall.length) {
    list.innerHTML = '<li class="empty-record">Your first run goes here.</li>';
    return;
  }
  list.innerHTML = progress.hall.slice(0, 5).map((rec, i) => {
    const top = TIERS[clamp(rec.tier || 0, 0, MAX_TIER)];
    return `<li>
      <span class="rk">${pad2(i + 1)}</span>
      <span class="nm">${escapeHtml(top.name)}</span>
      <span class="dt">${escapeHtml(rec.mode === "daily" ? "Daily" : rec.mode === "dare" ? "Dare" : "Classic")} · ${escapeHtml(rec.date || "")}</span>
      <span class="sc">${formatNumber(rec.score)}</span>
    </li>`;
  }).join("");
}

function renderBadges() {
  const grid = $("badgeGrid");
  if (!grid) return;
  grid.innerHTML = BADGES.map((badge) => {
    const on = progress.badges.includes(badge.id);
    return `<div class="badge-item ${on ? "on" : ""}" title="${escapeHtml(badge.note)}">
      <span class="bicon">${BADGE_ICONS[badge.id] || "✦"}</span>
      <div><b>${escapeHtml(badge.name)}</b><small>${escapeHtml(badge.note)}</small></div>
    </div>`;
  }).join("");
  $("badgeCount").textContent = progress.badges.length + " / " + BADGES.length;
}

/* ------------------------------------------------------------------ */
/* screen switching                                                    */
/* ------------------------------------------------------------------ */

function showScreen(name) {
  activeScreen = name;
  if (name !== "game") hideChatPop();
  for (const [key, node] of Object.entries({
    home: $("homeScreen"),
    game: $("gameScreen"),
    squad: $("squadScreen"),
    yearbook: $("yearbookScreen"),
  })) {
    if (!node) continue;
    node.hidden = key !== name;
    node.classList.toggle("is-active", key === name);
  }
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}

function goHome() {
  stopLoop();
  paused = true;
  game = null;
  showScreen("home");
  renderHome();
}

function openSquad() {
  stopLoop();
  paused = true;
  game = null;
  showScreen("squad");
  renderSquad();
}

function openYearbook() {
  stopLoop();
  paused = true;
  game = null;
  showScreen("yearbook");
  renderYearbook();
}

/* ------------------------------------------------------------------ */
/* photo booth                                                         */
/* ------------------------------------------------------------------ */

function renderSquad() {
  const grid = $("squadGrid");
  if (!grid) return;
  grid.innerHTML = TIERS.map((tier, i) => {
    const slot = squad[i];
    const hasPhoto = !!slot.photo;
    return `<article class="squad-card" style="--tier:${tier.color};--tier-soft:${tier.soft}" data-index="${i}">
      <span class="tier-num">FRIEND ${pad2(i + 1)}</span>
      <div class="tier-name"><b>${escapeHtml(tier.name)}</b><span>${escapeHtml(tier.note)}</span></div>
      <div class="squad-portrait-wrap">
        <canvas data-portrait="${i}" width="108" height="108" aria-hidden="true"></canvas>
        ${hasPhoto ? '<span class="squad-photo-dot" title="Custom photo">✓</span>' : ""}
      </div>
      <input class="squad-name-input" data-name="${i}" maxlength="22" placeholder="Add a name" value="${escapeHtml(slot.name)}" aria-label="Name for ${escapeHtml(tier.name)}">
      <div class="squad-vibe-row">
        <label class="visually-hidden" for="vibe-${i}">Vibe for ${escapeHtml(tier.name)}</label>
        <select class="squad-vibe-select" id="vibe-${i}" data-vibe="${i}" aria-label="Vibe for ${escapeHtml(tier.name)}" title="Vibe">
          ${VIBES.map((vibe) => `<option value="${vibe.id}" ${slot.vibe === vibe.id ? "selected" : ""}>${vibe.emoji} ${vibe.name}</option>`).join("")}
        </select>
        <label class="visually-hidden" for="line-${i}">Signature line for ${escapeHtml(tier.name)}</label>
        <input class="squad-line-input" id="line-${i}" data-line="${i}" maxlength="90" placeholder="Signature line or inside joke" value="${escapeHtml(slot.line)}" aria-label="Signature line for ${escapeHtml(tier.name)}">
      </div>
      <div class="squad-card-actions">
        <button class="btn squad-upload-btn" type="button" data-action="upload" data-index="${i}">${hasPhoto ? "Replace" : "Add photo"}</button>
        <button class="btn squad-clear-btn" type="button" data-action="remove" data-index="${i}" ${hasPhoto ? "" : "disabled"}>Remove</button>
      </div>
    </article>`;
  }).join("");

  grid.querySelectorAll("[data-portrait]").forEach((canvas) => {
    paintPortrait(canvas, Number(canvas.dataset.portrait), 108);
  });
  const count = countCustomPhotos(squad);
  $("squadStatus").textContent = count
    ? `${count} of 11 custom photos · saved in this browser · originals discarded`
    : "Illustrated demo cast · add a photo to any friend";
}

function openFilePicker(index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp";
  input.hidden = true;
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    input.remove();
    if (file) openCrop(index, file);
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

async function openCrop(index, file) {
  try {
    const image = await decodeImage(file);
    cropContext = {
      index,
      image,
      state: makeCropState(image),
    };
    clampCropState(cropContext.state);
    $("cropTierName").textContent = `Tier ${index + 1} · ${TIERS[index].name}`;
    $("cropZoom").value = "1";
    drawCropPreview($("cropCanvas"), cropContext.state);
    showModal("cropModal");
    setTimeout(() => $("cropCanvas").focus({ preventScroll: true }), 60);
  } catch (e) {
    toast(e && e.message ? e.message : "That photo could not be decoded.");
  }
}

function closeCrop() {
  hideModal("cropModal");
  if (cropContext && cropContext.image && typeof cropContext.image.close === "function") {
    try { cropContext.image.close(); } catch (e) { /* ignore */ }
  }
  cropContext = null;
  cropDragging = null;
}

async function applyCrop() {
  if (!cropContext) return;
  const index = cropContext.index;
  try {
    const data = cropToDataUrl(cropContext.state, 320);
    squad[index] = { ...squad[index], photo: data };
    closeCrop();
    if (!saveSquad()) return;
    await refreshPhotos();
    renderSquad();
    toast("Photo saved in this browser.");
  } catch (e) {
    toast("That crop could not be saved. Try another image.");
  }
}

function removeCropPhoto() {
  if (!cropContext) return;
  const index = cropContext.index;
  squad[index] = { ...squad[index], photo: "" };
  closeCrop();
  saveSquad();
  refreshPhotos().then(renderSquad);
  toast("Photo removed.");
}

async function addMultiplePhotos(files) {
  if (!files || !files.length) return;
  const empty = [];
  squad.forEach((slot, i) => { if (!slot.photo) empty.push(i); });
  if (!empty.length) {
    toast("All eleven slots are full. Tap a card to replace one.");
    return;
  }
  const chosen = Array.from(files).slice(0, empty.length);
  $("squadStatus").textContent = "Cropping photos…";
  const errors = [];
  let added = 0;
  for (let i = 0; i < chosen.length; i++) {
    try {
      const data = await autoCropFile(chosen[i], 320);
      squad[empty[i]] = { ...squad[empty[i]], photo: data };
      added++;
    } catch (e) {
      errors.push(chosen[i].name || "image");
    }
  }
  saveSquad();
  await refreshPhotos();
  renderSquad();
  if (added) toast(`Added ${added} photo${added === 1 ? "" : "s"} to the circle.`);
  if (errors.length) toast(`${errors.length} image${errors.length === 1 ? "" : "s"} could not be decoded.`);
  if (files.length > empty.length) toast("Only empty slots were filled. Tap Replace to swap a photo.");
}

function removeSquadPhoto(index) {
  squad[index] = { ...squad[index], photo: "" };
  saveSquad();
  refreshPhotos().then(renderSquad);
  toast("Photo removed.");
}

function resetSquad() {
  askConfirm(
    "Reset the cast?",
    "All custom photos, names, vibes and signature lines will be removed from this browser. The illustrated friends come back.",
    "Reset cast",
    async () => {
      squad = emptySquad();
      try { localStorage.removeItem(STORAGE.squad); } catch (e) { /* ignore */ }
      await refreshPhotos();
      renderSquad();
      toast("Your demo cast is back.");
    },
  );
}

/* ------------------------------------------------------------------ */
/* game setup                                                          */
/* ------------------------------------------------------------------ */

function buildGame(modeName, dare = null) {
  stopLoop();
  runDare = null;

  if (modeName === "dare" && dare) {
    mode = "dare";
    runDare = { ...dare };
    dailyContext = currentDaily();
    const rule = DAILY_RULES.find((item) => item.id === dare.ruleId) || null;
    game = createEngine({ mode: "classic", seed: dare.seed, rule });
  } else {
    mode = modeName === "daily" ? "daily" : "classic";
    dailyContext = currentDaily();
    const seed = mode === "daily"
      ? dailyContext.seed
      : ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    const rule = mode === "daily" ? dailyContext.rule : null;
    game = createEngine({ mode, seed, rule });
  }

  runFinished = false;
  paused = false;
  runStart = performance.now();
  runPowers = { swap: 0, hug: 0, plus: 0 };
  runTierMerges = {};
  chatMessages = [];
  chatCooldownUntil = 0;
  lastResult = null;
  nextPreviewKey = "";
  lastLadderTier = -1;
  lastHudAt = 0;

  renderer.setSquad(squad, photos);
  showScreen("game");
  hideChatPop();
  renderChatLog();
  $("dangerBanner").classList.remove("show");
  $("dangerBanner").setAttribute("aria-hidden", "true");
  updateGameStaticUI();
  updateHud(true);
  updateLadder(0);
  updateNextPreview(true);
  updateChatUI();
  showBoardToast("Drag to aim · release to drop", 1900);
  startLoop();

  const thisGame = game;
  setTimeout(() => {
    if (game === thisGame && activeScreen === "game" && !paused) {
      maybeChat(mode === "dare" ? "dare" : "start", Math.floor(Math.random() * TIERS.length), true);
    }
  }, 1400);

  if (window.R2) {
    window.R2.markPlayed(SLUG + "/");
  }

  const seen = window.R2 ? window.R2.loadJSON(STORAGE.tutorial, false) : true;
  if (!seen) {
    paused = true;
    setTimeout(() => openHelp(true), 450);
  }
}

function updateGameStaticUI() {
  const isDaily = mode === "daily";
  const isDare = mode === "dare";
  const target = isDare && runDare ? runDare.target : 0;
  const dareRule = isDare && runDare && runDare.ruleId
    ? DAILY_RULES.find((rule) => rule.id === runDare.ruleId)
    : null;
  const best = isDare
    ? progress.bestByMode.dare || 0
    : isDaily
      ? dailyContext.best
      : progress.bestByMode.classic;

  $("gameModeLabel").textContent = isDare
    ? "FRIEND DARE · " + formatNumber(target)
    : isDaily
      ? "DAILY CIRCLE · " + dailyContext.rule.name.toUpperCase()
      : "CLASSIC CIRCLE";
  $("gameTitle").textContent = isDare
    ? (runDare ? runDare.name + "’s dare." : "A friend’s dare.")
    : isDaily
      ? "Today’s circle."
      : "Make the circle.";
  $("sideBest").textContent = formatNumber(best);
  $("sideModeNote").textContent = isDare
    ? "Same drops" + (dareRule ? " · " + dareRule.name : "") + " · beat " + formatNumber(target) + "."
    : isDaily
      ? "Seeded run · same drops for everyone today."
      : "Classic run · eleven friends to find.";
  $("sideRule").hidden = !(isDaily || isDare);
  $("sideRuleLabel").textContent = isDare ? "DARE TARGET" : "DAILY RULE";
  $("sideRuleName").textContent = isDare ? formatNumber(target) : dailyContext.rule.name;
  $("gameBest").textContent = "BEST " + formatNumber(best);
  updateSoundUI();
}

function updateLadder(maxTier) {
  if (lastLadderTier === maxTier && $("gameLadder").childElementCount) return;
  lastLadderTier = maxTier;
  const list = $("gameLadder");
  if (!list) return;
  list.innerHTML = TIERS.map((tier, i) => {
    const reached = i <= maxTier;
    return `<li class="${i === maxTier ? "current" : ""} ${reached ? "reached" : ""}" style="--tier:${tier.color}">
      <span class="lnum">${pad2(i + 1)}</span>
      <span class="ldot"></span>
      <span class="lname">${escapeHtml(tier.name)}</span>
      <span class="lcheck">${reached ? "✓" : ""}</span>
    </li>`;
  }).join("");
}

function updateNextPreview(force = false) {
  if (!game) return;
  const state = game.state;
  const key = state.nextTier + "|" + (state.heldWildcard ? "w" : "");
  if (!force && key === nextPreviewKey) return;
  nextPreviewKey = key;
  paintPortrait($("nextPreview"), state.nextTier, 42);
}

function updateHud(force = false) {
  if (!game) return;
  const now = performance.now();
  if (!force && now - lastHudAt < 45) return;
  lastHudAt = now;
  const state = game.state;

  $("gameScore").textContent = formatNumber(state.score);
  $("hypeValue").textContent = Math.floor(state.hype);
  $("hypeFill").style.width = clamp(state.hype, 0, 100) + "%";

  const combo = $("gameCombo");
  combo.textContent = "x" + (state.combo > 1 ? state.combo : 1);
  combo.classList.toggle("live", state.combo > 1);

  for (const name of POWER_ORDER) {
    const button = $("power" + name.charAt(0).toUpperCase() + name.slice(1));
    if (!button) continue;
    const check = game.canUsePower(name);
    const can = check.ok;
    button.disabled = !can || paused || state.status !== "playing";
    button.classList.toggle("ready", can);
    button.setAttribute("aria-label", `${POWERS[name].name}, costs ${POWERS[name].cost} Hype. ${POWERS[name].blurb}`);
  }

  $("dangerFill").style.width = Math.round(clamp(state.danger, 0, 1) * 100) + "%";
  const showDanger = state.dangerActive && state.status === "playing";
  $("dangerBanner").classList.toggle("show", showDanger);
  $("dangerBanner").setAttribute("aria-hidden", showDanger ? "false" : "true");
  if (showDanger && state.danger > 0.7 && !reduced) flashDangerBanner();

  updateNextPreview();
  updateLadder(state.maxTier);
}

/* ------------------------------------------------------------------ */
/* game loop + events                                                  */
/* ------------------------------------------------------------------ */

function startLoop() {
  if (running) return;
  running = true;
  lastTs = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function loop(ts) {
  if (!running) return;
  const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000 || 0));
  lastTs = ts;
  if (game && activeScreen === "game" && !paused && !document.hidden) {
    game.tick(dt);
    const events = game.drainEvents();
    if (events.length) handleGameEvents(events);
    if (game) {
      renderer.frame(game.state, events, dt, ts / 1000);
      updateHud();
    }
  }
  if (running) rafId = requestAnimationFrame(loop);
}

function handleGameEvents(events) {
  for (const ev of events) {
    if (ev.type === "drop") {
      if (audioEnabled()) window.R2.play(170, 0.035, "triangle");
      if (hapticsEnabled()) window.R2.buzz(6);
    } else if (ev.type === "merge") {
      runTierMerges[ev.newTier] = (runTierMerges[ev.newTier] || 0) + 1;
      playMergeSound(ev);
      if (hapticsEnabled()) window.R2.buzz(ev.combo > 3 ? [10, 24, 14] : 9);
      const line = `${TIERS[ev.tier] ? TIERS[ev.tier].name : "Friend"} joined into ${TIERS[ev.newTier].name}.${ev.combo > 1 ? " Chain x" + ev.combo + "." : ""}`;
      announce(line);
      if (ev.newTier >= MAX_TIER) {
        showBoardToast("THE WHOLE CREW! 🫂", 2600);
        playWinChord();
      }
      if (ev.newTier >= 6 || ev.combo >= 3) {
        maybeChat(ev.combo >= 3 ? "chain" : "merge", ev.newTier, ev.newTier >= MAX_TIER);
      } else {
        maybeChat("merge", ev.newTier);
      }
    } else if (ev.type === "legendary") {
      runTierMerges[MAX_TIER] = (runTierMerges[MAX_TIER] || 0) + 1;
      showBoardToast("LEGENDARY GROUP PHOTO · +" + formatNumber(ev.score), 3000);
      playLegendary();
      if (hapticsEnabled()) window.R2.buzz([18, 40, 18, 40, 30]);
      announce("Legendary group photo! Huge bonus.");
      maybeChat("legendary", MAX_TIER, true);
    } else if (ev.type === "power") {
      playPowerSound(ev.name);
      if (hapticsEnabled()) window.R2.buzz(12);
      announce(POWERS[ev.name] ? POWERS[ev.name].name + " used." : "Party trick used.");
      if (runPowers[ev.name] != null) runPowers[ev.name]++;
      maybeChat(ev.name, Math.floor(Math.random() * TIERS.length), ev.name === "plus");
    } else if (ev.type === "danger") {
      if (ev.active) {
        announce("Too crowded. Clear the top of the circle.");
        flashDangerBanner();
        maybeChat("danger", Math.floor(Math.random() * TIERS.length), true);
      }
    } else if (ev.type === "gameover") {
      finishRun();
    }
  }
}

function playMergeSound(ev) {
  if (!audioEnabled()) return;
  const scale = [392, 440, 494, 523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1174.66];
  const freq = scale[clamp(ev.newTier, 0, scale.length - 1)] * (1 + Math.min(ev.combo, 5) * 0.015);
  window.R2.play(freq, 0.11 + ev.newTier * 0.006, "sine");
  if (ev.newTier >= 6) {
    setTimeout(() => { if (audioEnabled()) window.R2.play(freq * 1.5, 0.12, "triangle"); }, 38);
  }
}

function playWinChord() {
  if (!audioEnabled()) return;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    setTimeout(() => { if (audioEnabled()) window.R2.play(freq, 0.35, "triangle"); }, i * 70);
  });
}

function playLegendary() {
  if (!audioEnabled()) return;
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    setTimeout(() => { if (audioEnabled()) window.R2.play(freq, 0.5, "sine"); }, i * 85);
  });
}

function playPowerSound(name) {
  if (!audioEnabled()) return;
  if (name === "swap") {
    window.R2.play(480, 0.07, "square");
    setTimeout(() => { if (audioEnabled()) window.R2.play(720, 0.08, "sine"); }, 47);
  } else if (name === "hug") {
    window.R2.play(110, 0.25, "sawtooth");
    setTimeout(() => { if (audioEnabled()) window.R2.play(150, 0.2, "triangle"); }, 60);
  } else {
    [523, 659, 783, 1046].forEach((freq, i) => {
      setTimeout(() => { if (audioEnabled()) window.R2.play(freq, 0.28, "sine"); }, i * 55);
    });
  }
}

/* ------------------------------------------------------------------ */
/* the group chat                                                      */
/* ------------------------------------------------------------------ */

function maybeChat(kind, tier, force = false) {
  if (!chatEnabled || !game || activeScreen !== "game") return;
  const now = performance.now();
  if (!force && now < chatCooldownUntil) return;
  chatCooldownUntil = now + (kind === "danger" ? 3000 : 4600);
  const speaker = Number.isInteger(tier)
    ? clamp(tier, 0, MAX_TIER)
    : Math.floor(Math.random() * TIERS.length);
  const message = chooseChat({ kind, tier: speaker, squad, rng: Math.random });
  showChatMessage(message);
}

function showChatMessage(message) {
  if (!message || !chatEnabled) return;
  chatMessages.unshift({ ...message, at: Date.now() });
  chatMessages = chatMessages.slice(0, 4);
  renderChatLog();
  showChatPop(message);
}

function renderChatLog() {
  const log = $("chatLog");
  if (!log) return;
  if (!chatEnabled) {
    log.innerHTML = '<p class="chat-empty">Group chat is off. The friends are sulking.</p>';
    return;
  }
  if (!chatMessages.length) {
    log.innerHTML = '<p class="chat-empty">The chat is listening…</p>';
    return;
  }
  log.innerHTML = chatMessages.map((message, i) => `<div class="chat-entry">
    <canvas data-chat-portrait="${i}" width="58" height="58" aria-hidden="true"></canvas>
    <div class="chat-copy">
      <b>${escapeHtml(message.name)} <em>${escapeHtml(message.emoji || "")} ${escapeHtml(vibeById(message.vibe).name)}</em></b>
      <span>${escapeHtml(message.text)}</span>
    </div>
  </div>`).join("");
  log.querySelectorAll("[data-chat-portrait]").forEach((canvas) => {
    const message = chatMessages[Number(canvas.dataset.chatPortrait)];
    if (message) paintPortrait(canvas, message.tier, 29);
  });
}

function showChatPop(message) {
  const pop = $("chatPop");
  if (!pop || !chatEnabled) return;
  $("chatPopName").textContent = message.name + " " + (message.emoji || "");
  $("chatPopText").textContent = message.text;
  paintPortrait($("chatPopAvatar"), message.tier, 32);
  pop.classList.remove("hidden");
  clearTimeout(chatHideTimer);
  chatHideTimer = setTimeout(hideChatPop, 4200);
}

function hideChatPop() {
  const pop = $("chatPop");
  if (pop) pop.classList.add("hidden");
  clearTimeout(chatHideTimer);
  chatHideTimer = 0;
}

function updateChatUI() {
  const toggle = $("btnChatToggle");
  if (toggle) {
    toggle.textContent = chatEnabled ? "LIVE" : "OFF";
    toggle.classList.toggle("off", !chatEnabled);
    toggle.setAttribute("aria-pressed", chatEnabled ? "true" : "false");
    toggle.setAttribute("aria-label", chatEnabled ? "Turn group chat off" : "Turn group chat on");
  }
  const pauseToggle = $("btnPauseChat");
  if (pauseToggle) pauseToggle.setAttribute("aria-checked", chatEnabled ? "true" : "false");
  if (!chatEnabled) hideChatPop();
  renderChatLog();
}

function toggleChat() {
  chatEnabled = !chatEnabled;
  if (window.R2) window.R2.saveJSON(STORAGE.chat, chatEnabled);
  updateChatUI();
  if (!chatEnabled) toast("Group chat muted. Peace at last.");
  else {
    toast("Group chat is live.");
    maybeChat("start", Math.floor(Math.random() * TIERS.length), true);
  }
}

function finishRun() {
  if (!game || runFinished) return;
  runFinished = true;
  paused = true;
  stopLoop();

  const state = game.state;
  const score = state.score;
  const key = dateKey();
  const dare = runDare;
  const previousBest = mode === "daily"
    ? dailyContext.best
    : (progress.bestByMode[mode] || 0);
  const isNewBest = score > previousBest;
  const now = Date.now();
  const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dareOutcome = dare ? (score > dare.target ? "win" : "loss") : "";

  progress.runs += 1;
  progress.best = Math.max(progress.best, score);
  progress.bestCombo = Math.max(progress.bestCombo, state.bestCombo);
  progress.bestTier = Math.max(progress.bestTier, state.maxTier);
  progress.bestByMode[mode] = Math.max(progress.bestByMode[mode] || 0, score);
  progress.totalMerges = (progress.totalMerges || 0) + state.merges;
  progress.totalScore = (progress.totalScore || 0) + score;

  for (const [tier, count] of Object.entries(runTierMerges)) {
    progress.tierMerges[tier] = (progress.tierMerges[tier] || 0) + count;
  }
  for (const [power, count] of Object.entries(runPowers)) {
    if (count) progress.powerUses[power] = (progress.powerUses[power] || 0) + count;
  }

  const rec = {
    score,
    tier: state.maxTier,
    combo: state.bestCombo,
    mode,
    date: dateLabel,
    ts: now,
    merges: state.merges,
    seed: state.seed,
    ruleId: state.rule ? state.rule.id : "",
    dare: dare ? { name: dare.name, target: dare.target, outcome: dareOutcome } : null,
  };
  progress.hall.unshift(rec);
  progress.hall.sort((a, b) => b.score - a.score);
  progress.hall = progress.hall.slice(0, 12);
  progress.history.unshift(rec);
  progress.history = progress.history.slice(0, 30);

  if (dare) {
    progress.rivals.unshift({
      name: dare.name,
      target: dare.target,
      score,
      outcome: dareOutcome,
      date: dateLabel,
      ts: now,
    });
    progress.rivals = progress.rivals.slice(0, 20);
  }

  if (mode === "daily") {
    if (!progress.daily[key]) progress.daily[key] = { best: 0, runs: 0 };
    progress.daily[key].best = Math.max(progress.daily[key].best || 0, score);
    progress.daily[key].runs = (progress.daily[key].runs || 0) + 1;
    if (progress.lastDaily !== key) {
      progress.dailyStreak = progress.lastDaily === yesterdayKey() ? (progress.dailyStreak || 0) + 1 : 1;
      progress.lastDaily = key;
    }
    const keys = Object.keys(progress.daily).sort();
    if (keys.length > 60) {
      for (const old of keys.slice(0, keys.length - 60)) delete progress.daily[old];
    }
  }

  const unlocked = [];
  const unlock = (id) => {
    if (progress.badges.includes(id)) return;
    progress.badges.push(id);
    const badge = BADGES.find((b) => b.id === id);
    if (badge) unlocked.push(badge);
  };
  if (state.merges >= 1) unlock("first-merge");
  if (state.bestCombo >= 4) unlock("chain-4");
  if (state.maxTier >= 4) unlock("tier-5");
  if (state.maxTier >= 7) unlock("tier-8");
  if (state.maxTier >= 9) unlock("tier-10");
  if (state.maxTier >= MAX_TIER) unlock("whole-crew");
  if (state.hasLegendary) unlock("legendary");
  if (score >= 2500) unlock("score-2500");
  if (score >= 10000) unlock("score-10000");
  if (mode === "daily" && currentStreak() >= 3) unlock("daily-3");
  saveProgress();

  lastResult = {
    score,
    maxTier: state.maxTier,
    bestCombo: state.bestCombo,
    merges: state.merges,
    mode,
    seed: state.seed,
    ruleId: state.rule ? state.rule.id : "",
    dare: dare ? { ...dare, outcome: dareOutcome } : null,
    hasWon: state.hasWon,
    hasLegendary: state.hasLegendary,
    newBest: isNewBest,
    unlocked,
  };

  if (window.R2) {
    window.R2.stats.run({
      slug: SLUG,
      score,
      durMs: performance.now() - runStart,
      wave: state.maxTier,
      outcome: dare ? dareOutcome : "loss",
      meta: {
        mode,
        merges: state.merges,
        bestCombo: state.bestCombo,
        powers: runPowers,
        legendary: state.hasLegendary,
        dareTarget: dare ? dare.target : null,
      },
    });
    window.R2.stats.event(SLUG, "runs-" + mode);
    if (state.hasLegendary) window.R2.stats.event(SLUG, "legendary");

    /* The hub's small records dashboard reads a per-game key with highScore.
       Keep that shape in sync without duplicating the real save format. */
    const hub = window.R2.loadJSON(SLUG, null) || {};
    window.R2.saveJSON(SLUG, {
      highScore: Math.max(hub.highScore || 0, score),
      bestChain: Math.max(hub.bestChain || 0, state.bestCombo),
      bestTier: Math.max(hub.bestTier || 0, state.maxTier),
      plays: (hub.plays || 0) + 1,
    });
  }

  renderResult();
  updateSoundUI();
  showResult();
}

function showResult() {
  showModal("resultModal");
}

function renderResult() {
  const r = lastResult;
  if (!r) return;
  const topTier = clamp(r.maxTier || 0, 0, MAX_TIER);
  const topName = squad[topTier] && squad[topTier].name ? " · " + squad[topTier].name : "";
  $("resultTier").textContent = TIERS[topTier].name + topName;
  $("resultScore").textContent = formatNumber(r.score);
  $("resultChain").textContent = "x" + (r.bestCombo || 0);
  $("resultMerges").textContent = String(r.merges || 0);
  $("resultMode").textContent = modeLabel(r.mode);
  $("resultBestTag").hidden = !r.newBest;
  if (r.dare) {
    const won = r.dare.outcome === "win";
    const diff = Math.abs(r.score - r.dare.target);
    const tied = !won && r.score === r.dare.target;
    $("resultKicker").textContent = won ? "DARE COMPLETE" : tied ? "DARE TIED" : "DARE MISSED";
    $("resultTitle").textContent = won
      ? "You beat " + r.dare.name + "."
      : tied
        ? "A perfect tie with " + r.dare.name + "."
        : r.dare.name + " holds the crown.";
    $("resultDareLine").hidden = false;
    $("resultDareLine").innerHTML = won
      ? `Target <b>${formatNumber(r.dare.target)}</b> · cleared by <b>${formatNumber(diff)}</b>`
      : tied
        ? `Target <b>${formatNumber(r.dare.target)}</b> · someone has to break the tie.`
        : `Target <b>${formatNumber(r.dare.target)}</b> · ${formatNumber(diff)} short. Dare them back?`;
  } else {
    $("resultDareLine").hidden = true;
    $("resultDareLine").textContent = "";
    $("resultKicker").textContent = r.hasLegendary
      ? "LEGENDARY GROUP PHOTO"
      : r.hasWon
        ? "THE WHOLE CREW WAS HERE"
        : "THE CIRCLE GOT CROWDED";
    $("resultTitle").textContent = r.newBest ? "A new personal best." : r.hasLegendary ? "Iconic. Truly." : "Too many friends.";
  }
  paintResultPortrait(topTier);

  const badgeWrap = $("resultBadges");
  if (r.unlocked.length) {
    badgeWrap.innerHTML = r.unlocked.map((b) =>
      `<span>${BADGE_ICONS[b.id] || "✦"} ${escapeHtml(b.name)}</span>`
    ).join("");
  } else {
    badgeWrap.innerHTML = '<span style="background:transparent;border-color:var(--line);color:var(--muted)">No new stickers this run</span>';
  }

  const confetti = document.querySelector(".result-confetti");
  if (confetti) {
    confetti.innerHTML = "";
    if (r.newBest || r.hasLegendary || (r.dare && r.dare.outcome === "win")) {
      const colors = ["#ef5a5a", "#f0b429", "#21bfa7", "#6c7bff", "#b47cff"];
      for (let i = 0; i < (reduced ? 0 : 22); i++) {
        const bit = document.createElement("i");
        bit.className = "confetti-bit";
        bit.style.left = (4 + Math.random() * 92) + "%";
        bit.style.background = colors[i % colors.length];
        bit.style.animationDelay = (Math.random() * 0.5) + "s";
        bit.style.transform = `rotate(${Math.random() * 180}deg)`;
        confetti.appendChild(bit);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* results + sharing                                                   */
/* ------------------------------------------------------------------ */

async function shareCanvas(canvas, filename, title, text) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No image");
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

async function shareResult() {
  if (!lastResult) return;
  const button = $("btnShare");
  button.disabled = true;
  button.textContent = "Making postcard…";
  try {
    const canvas = renderPostcard({
      score: lastResult.score,
      maxTier: lastResult.maxTier,
      bestCombo: lastResult.bestCombo,
      merges: lastResult.merges,
      mode: lastResult.mode,
      squad,
      photos,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
    const how = await shareCanvas(
      canvas,
      "inner-circle-postcard.png",
      "My Inner Circle",
      `I scored ${formatNumber(lastResult.score)} in Inner Circle. My top friend: ${TIERS[lastResult.maxTier].name}.`,
    );
    if (how === "shared") toast("Postcard shared.");
    else if (how === "downloaded") toast("Postcard downloaded.");
  } catch (e) {
    toast("Could not make the postcard. Try again.");
  } finally {
    button.disabled = false;
    button.textContent = "Share postcard ↗";
  }
}

async function shareWrapped() {
  if (!progress.runs) {
    toast("Play a run first — the yearbook is still blank.");
    return;
  }
  const button = $("btnShareWrapped");
  button.disabled = true;
  button.textContent = "Making recap…";
  try {
    const canvas = renderWrapped({
      progress: { ...progress, dailyStreak: currentStreak() },
      squad,
      photos,
      squadCount: countCustomPhotos(squad),
    });
    const how = await shareCanvas(
      canvas,
      "inner-circle-wrapped.png",
      "My Circle Wrapped",
      `My Inner Circle: ${formatNumber(progress.runs)} runs, best score ${formatNumber(progress.best)}.`,
    );
    if (how === "shared") toast("Circle Wrapped shared.");
    else if (how === "downloaded") toast("Circle Wrapped downloaded.");
  } catch (e) {
    toast("Could not make the recap. Try again.");
  } finally {
    button.disabled = false;
    button.textContent = "Share Wrapped ↗";
  }
}

/* ------------------------------------------------------------------ */
/* yearbook                                                            */
/* ------------------------------------------------------------------ */

function mostMergedTier() {
  let tier = -1;
  let count = 0;
  for (const [key, value] of Object.entries(progress.tierMerges || {})) {
    const index = Number(key);
    const total = Number(value) || 0;
    if (index >= 0 && index <= MAX_TIER && total > count) {
      tier = index;
      count = total;
    }
  }
  return { tier, count };
}

function favouritePower() {
  let id = "";
  let count = 0;
  for (const [key, value] of Object.entries(progress.powerUses || {})) {
    if (POWERS[key] && Number(value) > count) {
      id = key;
      count = Number(value) || 0;
    }
  }
  return { id, count, name: id ? POWERS[id].name : "—" };
}

function superlativeCard(spec) {
  const hasPortrait = Number.isInteger(spec.tier) && spec.tier >= 0;
  const portrait = hasPortrait
    ? `<canvas data-yb-tier="${spec.tier}" width="92" height="92" aria-hidden="true"></canvas>`
    : `<span class="sup-icon" aria-hidden="true">${spec.icon || "✦"}</span>`;
  return `<article class="superlative-card" style="--tier:${hasPortrait && TIERS[spec.tier] ? TIERS[spec.tier].color : "var(--coral)"}">
    ${portrait}
    <div class="sup-copy"><span>${escapeHtml(spec.label)}</span><b>${escapeHtml(spec.value)}</b><small>${escapeHtml(spec.sub || "")}</small></div>
  </article>`;
}

function renderYearbook() {
  const history = Array.isArray(progress.history) ? progress.history : [];
  const rivals = Array.isArray(progress.rivals) ? progress.rivals : [];
  const dareWins = rivals.filter((rival) => rival.outcome === "win").length;
  const topTier = progress.runs ? clamp(progress.bestTier, 0, MAX_TIER) : -1;
  const bestFriend = mostMergedTier();
  const power = favouritePower();

  const summary = [
    ["Circles made", formatNumber(progress.runs)],
    ["Best score", formatNumber(progress.best)],
    ["Best chain", "x" + (progress.bestCombo || 0)],
    ["Dares won", rivals.length ? `${dareWins}/${rivals.length}` : "—"],
  ];
  $("yearbookSummary").innerHTML = summary.map(([label, value]) =>
    `<div class="yb-stat"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`
  ).join("");

  const topName = topTier >= 0 ? (squad[topTier] && squad[topTier].name) || "" : "";
  const superlatives = [
    {
      tier: topTier >= 0 ? topTier : undefined,
      label: "Top friend",
      value: topTier >= 0 ? TIERS[topTier].name : "Not yet",
      sub: topName || (topTier >= 0 ? "Your highest tier so far" : "Make a run to crown someone"),
    },
    {
      tier: bestFriend.tier >= 0 ? bestFriend.tier : undefined,
      label: "Most merged",
      value: bestFriend.tier >= 0 ? TIERS[bestFriend.tier].name : "Not yet",
      sub: bestFriend.count
        ? `${formatNumber(bestFriend.count)} merge${bestFriend.count === 1 ? "" : "s"}`
        : "No merges yet",
    },
    {
      icon: "⚡",
      label: "Biggest chain",
      value: "x" + (progress.bestCombo || 0),
      sub: "One ridiculous moment",
    },
    {
      icon: "🎛️",
      label: "Favourite trick",
      value: power.name,
      sub: power.count ? `${formatNumber(power.count)} uses` : "No tricks yet",
    },
    {
      icon: "🔥",
      label: "Daily streak",
      value: currentStreak() + " days",
      sub: progress.lastDaily ? "Keep showing up" : "Start a daily",
    },
    {
      icon: "📷",
      label: "Circle cast",
      value: countCustomPhotos(squad) + " / 11",
      sub: "Custom photos on this device",
    },
  ];
  $("superlativeGrid").innerHTML = superlatives.map(superlativeCard).join("");

  const memory = history.slice(0, 12);
  $("memoryCount").textContent = progress.runs ? `${history.length} kept` : "";
  $("memoryGrid").innerHTML = memory.length
    ? memory.map((run) => {
      const tier = clamp(run.tier || 0, 0, MAX_TIER);
      return `<article class="memory-card" style="--tier:${TIERS[tier].color}">
        <canvas data-yb-tier="${tier}" width="96" height="96" aria-hidden="true"></canvas>
        <div class="memory-copy">
          <b>${formatNumber(run.score)}</b>
          <span>${escapeHtml(modeLabel(run.mode))} · ${escapeHtml(run.date || "")} · chain x${run.combo || 0}</span>
          <em class="${run.mode === "dare" ? "dare" : ""}">${escapeHtml(TIERS[tier].name)}</em>
        </div>
      </article>`;
    }).join("")
    : '<p class="memory-empty">Your first run will be framed here. Go make a mess.</p>';

  $("dareLog").innerHTML = rivals.length
    ? rivals.slice(0, 8).map((rival) => {
      const won = rival.outcome === "win";
      const tied = !won && Number(rival.score) === Number(rival.target);
      return `<div class="dare-entry">
        <div><b>${escapeHtml(rival.name || "A friend")}</b><span> target ${formatNumber(rival.target)} · your ${formatNumber(rival.score)}</span></div>
        <span>${escapeHtml(rival.date || "")}</span>
        <em class="${won ? "" : "loss"}">${won ? "WON" : tied ? "TIED" : "LOST"}</em>
      </div>`;
    }).join("")
    : '<p class="empty-record">No dares yet. Finish a run, then dare someone to beat it.</p>';

  for (const canvas of document.querySelectorAll("[data-yb-tier]")) {
    paintPortrait(canvas, Number(canvas.dataset.ybTier), canvas.closest(".memory-card") ? 48 : 46);
  }
  $("btnShareWrapped").disabled = progress.runs === 0;
}

/* ------------------------------------------------------------------ */
/* dare links                                                          */
/* ------------------------------------------------------------------ */

function renderDareCard() {
  const card = $("dareCard");
  if (!card) return;
  if (!activeDare) {
    card.hidden = true;
    return;
  }
  $("dareName").textContent = activeDare.name;
  $("dareTarget").textContent = formatNumber(activeDare.target);
  card.hidden = false;
}

function clearDareUrl() {
  try {
    const url = new URL(location.href);
    url.searchParams.delete("dare");
    history.replaceState({}, "", url.pathname + url.search + url.hash);
  } catch (e) { /* ignore */ }
}

function acceptActiveDare() {
  if (!activeDare) return;
  const dare = { ...activeDare };
  activeDare = null;
  renderDareCard();
  clearDareUrl();
  buildGame("dare", dare);
}

function dismissActiveDare() {
  activeDare = null;
  renderDareCard();
  clearDareUrl();
  toast("Dare tucked away. You can still play a normal circle.");
}

function dareCurrentUrl() {
  if (!lastResult) return "";
  const baseMode = lastResult.mode === "dare"
    ? (lastResult.dare && lastResult.dare.mode) || "classic"
    : lastResult.mode;
  const name = ($("darePlayerName") && $("darePlayerName").value.trim().slice(0, 22)) || "A friend";
  const payload = {
    seed: lastResult.seed,
    target: lastResult.score,
    name,
    mode: baseMode === "daily" ? "daily" : "classic",
    ruleId: lastResult.ruleId || (lastResult.dare && lastResult.dare.ruleId) || "",
    createdAt: Date.now(),
  };
  playerName = name;
  return dareUrl(payload, location.href);
}

function refreshDareLink() {
  if (!lastResult) return "";
  try {
    const url = dareCurrentUrl();
    $("dareLink").value = url;
    return url;
  } catch (e) {
    $("dareLink").value = "";
    return "";
  }
}

function openDareModal() {
  if (!lastResult) return;
  $("dareModalScore").textContent = formatNumber(lastResult.score);
  $("darePlayerName").value = playerName || "A friend";
  refreshDareLink();
  showModal("dareModal");
}

function savePlayerName() {
  const input = $("darePlayerName");
  if (!input) return;
  playerName = input.value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 22) || "A friend";
  if (window.R2) window.R2.saveJSON(STORAGE.playerName, playerName);
}

async function copyDareLink() {
  const url = refreshDareLink();
  if (!url) return;
  savePlayerName();
  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (e) { /* fall through */ }
  }
  if (!copied) {
    const field = $("dareLink");
    field.focus();
    field.select();
    try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
  }
  toast(copied ? "Dare link copied." : "Select the link and copy it manually.");
}

async function shareDareLink() {
  const url = refreshDareLink();
  if (!url) return;
  savePlayerName();
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Inner Circle dare",
        text: `I scored ${formatNumber(lastResult.score)} in Inner Circle. Can your circle beat it?`,
        url,
      });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  copyDareLink();
}

/* ------------------------------------------------------------------ */
/* modals                                                              */
/* ------------------------------------------------------------------ */

function modalOpen() {
  return !!document.querySelector(".modal:not([hidden])");
}

function showModal(id) {
  const modal = $(id);
  if (!modal) return;
  lastFocus = document.activeElement;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const focusable = modal.querySelector("button:not([disabled]), input, [tabindex]:not([tabindex='-1'])");
  setTimeout(() => {
    if (focusable) focusable.focus({ preventScroll: true });
  }, 20);
}

function hideModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.hidden = true;
  if (!modalOpen()) document.body.classList.remove("modal-open");
  if (!modalOpen() && lastFocus && typeof lastFocus.focus === "function") {
    try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
}

function openHelp(fromGame = false) {
  const fromActiveGame = activeScreen === "game" && game && game.state.status === "playing";
  if (fromActiveGame) {
    paused = true;
    helpResume = true;
  } else if (!fromGame) {
    helpResume = false;
  }
  showModal("helpModal");
  $("btnHelpPlay").textContent = fromActiveGame ? "Back to the circle →" : "Let’s play →";
}

function closeHelp() {
  hideModal("helpModal");
  if (helpResume) {
    helpResume = false;
    paused = false;
    lastTs = performance.now();
  }
  if (window.R2) window.R2.saveJSON(STORAGE.tutorial, true);
  if (activeScreen === "home") renderHome();
}

function openPause() {
  if (!game || game.state.status !== "playing") return;
  paused = true;
  updateHud(true);
  updateSoundUI();
  showModal("pauseModal");
}

function resumeGame() {
  hideModal("pauseModal");
  paused = false;
  lastTs = performance.now();
}

function askConfirm(title, copy, label, action) {
  $("confirmTitle").textContent = title;
  $("confirmCopy").textContent = copy;
  $("btnConfirmYes").textContent = label;
  confirmAction = action;
  showModal("confirmModal");
}

function closeNoModal() {
  confirmAction = null;
  hideModal("confirmModal");
}

function handleEscape() {
  if (!$("cropModal").hidden) return closeCrop();
  if (!$("confirmModal").hidden) return closeNoModal();
  if (!$("helpModal").hidden) return closeHelp();
  if (!$("pauseModal").hidden) return resumeGame();
  if (!$("dareModal").hidden) { savePlayerName(); return hideModal("dareModal"); }
  if (!$("resultModal").hidden) return; /* don't accidentally leave a result */
}

/* ------------------------------------------------------------------ */
/* sound / haptics                                                     */
/* ------------------------------------------------------------------ */

function updateSoundUI() {
  if (!window.R2) return;
  const s = window.R2.getSettings();
  const sound = s.sound !== false;
  const haptics = s.haptics !== false;
  const top = $("btnSound");
  top.textContent = sound ? "🔊" : "🔇";
  top.setAttribute("aria-label", sound ? "Mute sound" : "Unmute sound");
  top.setAttribute("aria-pressed", sound ? "true" : "false");
  const ps = $("btnPauseSound");
  if (ps) ps.setAttribute("aria-checked", sound ? "true" : "false");
  const ph = $("btnPauseHaptics");
  if (ph) ph.setAttribute("aria-checked", haptics ? "true" : "false");
}

function toggleSound() {
  if (!window.R2) return;
  const s = window.R2.getSettings();
  window.R2.setSettings({ sound: !(s.sound !== false) });
  updateSoundUI();
  if (audioEnabled()) window.R2.play(660, 0.07, "sine");
}

function toggleHaptics() {
  if (!window.R2) return;
  const s = window.R2.getSettings();
  window.R2.setSettings({ haptics: !(s.haptics !== false) });
  updateSoundUI();
  if (hapticsEnabled()) window.R2.buzz(10);
}

/* ------------------------------------------------------------------ */
/* event binding                                                       */
/* ------------------------------------------------------------------ */

function bindEvents() {
  $("btnPlay").addEventListener("click", () => buildGame("classic"));
  $("btnDaily").addEventListener("click", () => buildGame("daily"));
  $("btnDailyCard").addEventListener("click", () => buildGame("daily"));
  $("btnSquad").addEventListener("click", openSquad);
  $("btnYearbook").addEventListener("click", openYearbook);
  $("btnYearbookBack").addEventListener("click", () => { showScreen("home"); renderHome(); });
  $("btnYearbookDone").addEventListener("click", () => { showScreen("home"); renderHome(); });
  $("btnShareWrapped").addEventListener("click", shareWrapped);
  $("btnAcceptDare").addEventListener("click", acceptActiveDare);
  $("btnDismissDare").addEventListener("click", dismissActiveDare);
  $("btnChatToggle").addEventListener("click", toggleChat);
  $("btnPauseChat").addEventListener("click", toggleChat);
  $("btnDare").addEventListener("click", openDareModal);
  $("btnCopyDare").addEventListener("click", copyDareLink);
  $("btnShareDare").addEventListener("click", shareDareLink);
  $("darePlayerName").addEventListener("input", refreshDareLink);
  $("darePlayerName").addEventListener("change", savePlayerName);
  $("btnHelpHome").addEventListener("click", () => openHelp(false));
  $("btnHelp").addEventListener("click", () => openHelp(false));
  $("btnHelpPlay").addEventListener("click", closeHelp);
  $("btnSound").addEventListener("click", toggleSound);
  $("btnPauseSound").addEventListener("click", toggleSound);
  $("btnPauseHaptics").addEventListener("click", toggleHaptics);

  $("btnBrand").addEventListener("click", () => {
    if (activeScreen === "game" && game && !runFinished) openPause();
    else if (activeScreen === "game") goHome();
    else if (activeScreen === "squad" || activeScreen === "yearbook") { showScreen("home"); renderHome(); }
    else window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  $("btnSquadBack").addEventListener("click", () => { showScreen("home"); renderHome(); });
  $("btnSquadDone").addEventListener("click", () => { showScreen("home"); renderHome(); });
  $("btnAddPhotos").addEventListener("click", () => $("multiUpload").click());
  $("multiUpload").addEventListener("change", (e) => {
    addMultiplePhotos(e.target.files).finally(() => { e.target.value = ""; });
  });
  $("btnResetSquad").addEventListener("click", resetSquad);

  $("squadGrid").addEventListener("click", (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index)) return;
    if (button.dataset.action === "upload") openFilePicker(index);
    else if (button.dataset.action === "remove") removeSquadPhoto(index);
  });
  $("squadGrid").addEventListener("input", (e) => {
    const nameInput = e.target.closest("[data-name]");
    if (nameInput) {
      const index = Number(nameInput.dataset.name);
      if (!Number.isInteger(index)) return;
      squad[index] = { ...squad[index], name: nameInput.value.slice(0, 22) };
      clearTimeout(nameSaveTimer);
      nameSaveTimer = setTimeout(saveSquad, 300);
      return;
    }
    const lineInput = e.target.closest("[data-line]");
    if (lineInput) {
      const index = Number(lineInput.dataset.line);
      if (!Number.isInteger(index)) return;
      squad[index] = { ...squad[index], line: lineInput.value.slice(0, 90) };
      clearTimeout(nameSaveTimer);
      nameSaveTimer = setTimeout(saveSquad, 300);
    }
  });
  $("squadGrid").addEventListener("change", (e) => {
    const select = e.target.closest("[data-vibe]");
    if (!select) return;
    const index = Number(select.dataset.vibe);
    if (!Number.isInteger(index)) return;
    squad[index] = { ...squad[index], vibe: vibeById(select.value).id };
    saveSquad();
  });

  /* Drop photos straight onto a card (or the grid for bulk). */
  let dragDepth = 0;
  const grid = $("squadGrid");
  grid.addEventListener("dragenter", (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes("Files")) return;
    e.preventDefault();
    dragDepth++;
    grid.classList.add("drag-over");
  });
  grid.addEventListener("dragover", (e) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  grid.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) grid.classList.remove("drag-over");
  });
  grid.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    grid.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) {
      toast("Drop an image file here.");
      return;
    }
    const card = e.target.closest(".squad-card");
    if (card && files.length === 1) {
      openCrop(Number(card.dataset.index), files[0]);
    } else {
      addMultiplePhotos(files);
    }
  });
  document.addEventListener("paste", (e) => {
    if (activeScreen !== "squad") return;
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    e.preventDefault();
    if (files.length === 1) {
      const empty = squad.findIndex((slot) => !slot.photo);
      if (empty >= 0) openCrop(empty, files[0]);
      else toast("All eleven slots are full. Tap Replace on a friend.");
    } else {
      addMultiplePhotos(files);
    }
  });

  $("btnQuitGame").addEventListener("click", openPause);
  $("btnPause").addEventListener("click", openPause);
  $("btnResume").addEventListener("click", resumeGame);
  $("btnRestart").addEventListener("click", () => {
    hideModal("pauseModal");
    if (mode === "dare" && runDare) buildGame("dare", runDare);
    else buildGame(mode);
  });
  $("btnPauseQuit").addEventListener("click", () => {
    hideModal("pauseModal");
    goHome();
  });
  $("btnSideSquad").addEventListener("click", () => {
    if (game && !runFinished) {
      askConfirm(
        "Leave this run?",
        "The Photo Booth will end the current circle. Your score so far will not be saved.",
        "Leave run",
        () => {
          paused = true;
          game = null;
          openSquad();
        },
      );
      return;
    }
    openSquad();
  });

  for (const name of POWER_ORDER) {
    const id = "power" + name.charAt(0).toUpperCase() + name.slice(1);
    $(id).addEventListener("click", () => usePower(name));
  }

  $("btnReplay").addEventListener("click", () => {
    hideModal("resultModal");
    const m = lastResult ? lastResult.mode : mode;
    if (m === "dare" && lastResult && lastResult.dare) buildGame("dare", lastResult.dare);
    else buildGame(m);
  });
  $("btnResultHome").addEventListener("click", () => { hideModal("resultModal"); goHome(); });
  $("btnShare").addEventListener("click", shareResult);

  $("btnCropCancel").addEventListener("click", closeCrop);
  $("btnCropSave").addEventListener("click", applyCrop);
  $("btnCropRemove").addEventListener("click", removeCropPhoto);
  $("cropZoom").addEventListener("input", (e) => {
    if (!cropContext) return;
    cropContext.state.zoom = Number(e.target.value) || 1;
    clampCropState(cropContext.state);
    drawCropPreview($("cropCanvas"), cropContext.state);
  });
  bindCropPointer();

  $("btnConfirmNo").addEventListener("click", closeNoModal);
  $("btnConfirmYes").addEventListener("click", () => {
    const action = confirmAction;
    closeNoModal();
    if (action) action();
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.close;
      if (id === "helpModal") closeHelp();
      else if (id === "cropModal") closeCrop();
      else {
        if (id === "dareModal") savePlayerName();
        hideModal(id);
      }
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("pointerdown", (e) => {
      if (e.target !== modal) return;
      const id = modal.id;
      if (id === "helpModal") closeHelp();
      else if (id === "cropModal") closeCrop();
      else if (id === "confirmModal") closeNoModal();
      else if (id === "dareModal") {
        savePlayerName();
        hideModal("dareModal");
      }
    });
  });

  document.addEventListener("keydown", handleGlobalKeys);
  bindGameInput();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && activeScreen === "game" && game && game.state.status === "playing" && !paused && !modalOpen()) {
      openPause();
    }
  });
}

function bindGameInput() {
  const canvas = $("gameCanvas");
  let aiming = false;

  function toWorldX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / Math.max(1, rect.width)) * WORLD.width;
  }

  function aim(clientX) {
    if (!game || paused || game.state.status !== "playing") return;
    game.setAim(toWorldX(clientX));
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!game || paused) return;
    hideChatPop();
    aiming = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.focus({ preventScroll: true });
    aim(e.clientX);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!game || paused) return;
    if (aiming || e.pointerType === "mouse") aim(e.clientX);
  });
  const endPointer = (e) => {
    if (!aiming) return;
    aiming = false;
    aim(e.clientX);
    if (game && !paused && game.state.status === "playing") {
      const result = game.drop();
      if (!result.ok && result.reason === "wait") showBoardToast("Wait for the last one to land.", 700);
    }
    if (e.pointerId != null && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", (e) => {
    aiming = false;
    if (e.pointerId != null && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener("keydown", (e) => {
    if (!game || paused || document.querySelector(".modal:not([hidden])")) return;
    const state = game.state;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      game.setAim(state.aimX + (e.key === "ArrowLeft" ? -14 : 14));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      game.drop();
    } else if (e.key === "1") {
      e.preventDefault();
      usePower("swap");
    } else if (e.key === "2") {
      e.preventDefault();
      usePower("hug");
    } else if (e.key === "3") {
      e.preventDefault();
      usePower("plus");
    } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      e.preventDefault();
      openPause();
    }
  });

  canvas.addEventListener("wheel", (e) => {
    if (!game || paused) return;
    e.preventDefault();
    game.setAim(game.state.aimX + Math.sign(e.deltaX || e.deltaY) * 10);
  }, { passive: false });
}

function usePower(name) {
  if (!game || paused || activeScreen !== "game") return;
  const result = game.usePower(name);
  if (!result.ok) {
    if (result.reason === "hype") toast("Not enough Hype yet. Merge more friends.");
    else if (result.reason === "empty") toast("Nothing to hug yet.");
    else if (result.reason === "wild") toast("A Plus One is already in your hand.");
    return;
  }
  updateHud(true);
}

function bindCropPointer() {
  const canvas = $("cropCanvas");
  canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (!cropContext) return;
    cropDragging = { x: e.clientX, y: e.clientY, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!cropContext || !cropDragging || e.pointerId !== cropDragging.id) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = CROP_VIEW / Math.max(1, rect.width);
    cropContext.state.offsetX += (e.clientX - cropDragging.x) * ratio;
    cropContext.state.offsetY += (e.clientY - cropDragging.y) * ratio;
    cropDragging.x = e.clientX;
    cropDragging.y = e.clientY;
    clampCropState(cropContext.state);
    drawCropPreview(canvas, cropContext.state);
  });
  const end = (e) => {
    if (!cropDragging) return;
    if (e.pointerId != null && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    cropDragging = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (e) => {
    if (!cropContext) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    cropContext.state.zoom = Math.max(1, Math.min(3, cropContext.state.zoom + delta));
    $("cropZoom").value = String(cropContext.state.zoom);
    clampCropState(cropContext.state);
    drawCropPreview(canvas, cropContext.state);
  }, { passive: false });
  canvas.addEventListener("keydown", (e) => {
    if (!cropContext) return;
    const step = e.shiftKey ? 16 : 5;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "_"].includes(e.key)) {
      e.preventDefault();
      if (e.key === "ArrowLeft") cropContext.state.offsetX -= step;
      else if (e.key === "ArrowRight") cropContext.state.offsetX += step;
      else if (e.key === "ArrowUp") cropContext.state.offsetY -= step;
      else if (e.key === "ArrowDown") cropContext.state.offsetY += step;
      else if (e.key === "+" || e.key === "=") cropContext.state.zoom = Math.min(3, cropContext.state.zoom + 0.05);
      else cropContext.state.zoom = Math.max(1, cropContext.state.zoom - 0.05);
      $("cropZoom").value = String(cropContext.state.zoom);
      clampCropState(cropContext.state);
      drawCropPreview(canvas, cropContext.state);
    }
  });
}

function handleGlobalKeys(e) {
  if (e.defaultPrevented) return;
  if (e.key === "Escape" && modalOpen()) {
    e.preventDefault();
    handleEscape();
    return;
  }
  if (activeScreen === "game" && game && !modalOpen() && !paused) {
    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      e.preventDefault();
      openPause();
      return;
    }
    if (e.key === "1" || e.key === "2" || e.key === "3") {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      usePower(POWER_ORDER[Number(e.key) - 1]);
      return;
    }
  }
  if (e.key === "Tab" && modalOpen()) {
    const modal = Array.from(document.querySelectorAll(".modal:not([hidden])")).pop();
    const items = Array.from(modal.querySelectorAll("button:not([disabled]), input, [href], [tabindex]:not([tabindex='-1'])"))
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

async function init() {
  for (const id of ["heroAvatar0", "heroAvatar1", "heroAvatar2"]) {
    const c = $(id);
    if (c) { c.width = 180; c.height = 180; }
  }

  squad = sanitizeSquad(window.R2 ? window.R2.loadJSON(STORAGE.squad, null) : null);
  progress = loadProgress();
  chatEnabled = window.R2 ? window.R2.loadJSON(STORAGE.chat, true) !== false : true;
  playerName = window.R2 ? String(window.R2.loadJSON(STORAGE.playerName, "A friend") || "A friend").slice(0, 22) : "A friend";
  activeDare = dareFromSearch(window.location.search);
  renderer = createRenderer($("gameCanvas"));
  await refreshPhotos();

  bindEvents();
  renderHome();
  updateSoundUI();
  updateChatUI();
  renderDareCard();
  showScreen("home");

  if (window.R2) {
    window.R2.trackPlaytime(SLUG);
    setTimeout(() => {
      try { window.R2.installHint(); } catch (e) { /* ignore */ }
    }, 2600);
  }
  registerServiceWorker();

  /* A small read-only-ish surface for the smoke test. The game does not need
     it at runtime, but it keeps browser assertions honest about the real
     engine rather than a reimplementation of it. */
  window.InnerCircle = {
    start: (m) => buildGame(m),
    getState: () => (game ? game.snapshot() : null),
    getEngine: () => game,
    getSquad: () => squad,
    getProgress: () => progress,
    getChat: () => ({ enabled: chatEnabled, messages: chatMessages.slice() }),
    getActiveDare: () => activeDare,
    getLastResult: () => lastResult,
    show: (screen) => showScreen(screen),
    openSquad: () => openSquad(),
    openYearbook: () => openYearbook(),
  };
}

init().catch((e) => {
  console.error(e);
  toast("Something went wrong loading the circle. Try refreshing.");
});
