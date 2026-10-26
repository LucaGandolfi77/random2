/*
 * Pixel Ants — boot, menus, input and glue
 * ----------------------------------------
 * The board knows which pixels are exposed, the engine owns the colony, and
 * the renderer owns the pixels on screen. This file chooses pictures, reads
 * files, builds the palette, pauses, and writes the local record.
 */

import { ARTWORKS, makeSource } from "./artworks.js";
import {
  buildBoard, photoFromFile, photoFromDataUrl, saveRecent, loadRecent, forgetRecent, fileIsImage,
  DEFAULT_GRID, GRID_PRESETS, gridPreset, gridPixels
} from "./image-import.js";
import { createBoard } from "./board.js";
import { createEngine } from "./engine.js";
import { Renderer, patternMode } from "./render.js";

const $ = (id) => document.getElementById(id);
const R2 = window.R2;

const PRESETS = {
  4: {
    slots: 4, bucketCapacity: 180, maxAntsPerBucket: 12,
    antSpeed: 30, spawnInterval: 0.15, biteTime: 0.17, idlePenalty: 0.15, parRate: 8
  },
  6: {
    slots: 4, bucketCapacity: 120, maxAntsPerBucket: 10,
    antSpeed: 30, spawnInterval: 0.15, biteTime: 0.17, idlePenalty: 0.15, parRate: 8
  },
  8: {
    slots: 5, bucketCapacity: 90, maxAntsPerBucket: 9,
    antSpeed: 32, spawnInterval: 0.14, biteTime: 0.16, idlePenalty: 0.15, parRate: 9
  }
};

const RECORD_KEY = "pixel-ants-pwa";
const SLUG = "pixel-ants-pwa";
const BESTS_MAX = 24;
const REFERENCE_PIXELS = 40 * 54;
const DETAIL_NOTES = {
  coarse: "Big bites on a 20 × 27 wall — a quick, bold run.",
  standard: "The balanced 40 × 54 wall — the original pixel grain.",
  fine: "Fine 60 × 81 grain — more pixels, longer routes, longer run.",
  ultra: "Ultra 80 × 108 grain — the sharpest wall, with the longest run."
};

const el = {
  menu: $("menuScreen"),
  game: $("gameScreen"),
  sceneCanvas: $("sceneCanvas"),
  preview: $("preview"),
  previewCanvas: $("previewCanvas"),
  previewTitle: $("previewTitle"),
  previewHint: $("previewHint"),
  previewSwatches: $("previewSwatches"),
  difficulty: $("difficulty"),
  difficultyNote: $("difficultyNote"),
  detail: $("detail"),
  detailNote: $("detailNote"),
  btnStart: $("btnStart"),
  howto: $("howto"),
  pause: $("pause"),
  pauseStats: $("pauseStats"),
  result: $("result"),
  resultCanvas: $("resultCanvas"),
  resultTitle: $("resultTitle"),
  resultEyebrow: $("resultEyebrow"),
  resultStars: $("resultStars"),
  resultScore: $("resultScore"),
  resultPixels: $("resultPixels"),
  resultTime: $("resultTime"),
  resultBest: $("resultBest"),
  resultColors: $("resultColors"),
  resultNote: $("resultNote"),
  hint: $("hint"),
  palette: $("palette"),
  paletteTip: $("paletteTip"),
  progressFill: $("progressFill"),
  progressText: $("progressText"),
  artLabel: $("artLabel"),
  score: $("scoreValue"),
  timeValue: $("timeValue"),
  artGrid: $("artGrid"),
  uploadCard: $("uploadCard"),
  recentCard: $("recentCard"),
  recentThumb: $("recentThumb"),
  recentName: $("recentName"),
  recentMeta: $("recentMeta"),
  btnForget: $("btnForget"),
  fileInput: $("fileInput"),
  drop: $("drop"),
  toast: $("toast"),
  loading: $("loading"),
  loadingText: $("loadingText"),
  btnBack: $("btnBack"),
  brand: $("brand"),
  gameHud: $("gameHud"),
  btnHowMenu: $("btnHowMenu"),
  btnSound: $("btnSound"),
  btnPause: $("btnPause")
};

const state = {
  screen: "menu",
  paused: false,
  builtins: {},
  recent: null,
  colors: 6,
  detail: null,
  preview: null,
  board: null,
  engine: null,
  renderer: null,
  startTime: 0,
  ended: false,
  resultTimer: 0,
  lastFrame: 0,
  playtimeStarted: false,
  hud: { score: -1, pct: -1, time: "", tip: "", warn: null },
  cups: []
};

const sound = R2.makeSound({
  tap: [520, 0.05, "sine"],
  deploy: [430, 0.07, "triangle"],
  recall: [300, 0.09, "triangle"],
  steal: [900, 0.025, "square"],
  deliver: [720, 0.035, "sine"],
  full: [680, 0.16, "triangle"],
  win: [880, 0.28, "sine"],
  ui: [600, 0.05, "sine"]
});

let toastTimer = 0;
let stealCue = 0;

/* ---------- helpers ---------- */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function toast(message, ms) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), ms || 2300);
}

function formatScore(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function colorName(index) {
  return "Colour " + (index + 1);
}

function presetNote(colors) {
  if (colors === 4) return "Four colours, four rails. Every bucket has a home.";
  if (colors === 8) return "Five rails for eight colours. Recall a bucket to swap in another.";
  return "Four rails for six colours. Two will have to wait their turn.";
}

function validDetail(id) {
  return GRID_PRESETS[id] ? id : DEFAULT_GRID;
}

function detailPixelsLabel(id) {
  return gridPixels(validDetail(id)).toLocaleString("en-US");
}

function detailLabel(id) {
  return GRID_PRESETS[validDetail(id)].label;
}

function presetFor(colors, grid) {
  const base = PRESETS[colors] || PRESETS[6];
  const scale = (grid.width * grid.height) / REFERENCE_PIXELS;
  const speedScale = Math.sqrt(scale);
  return Object.assign({}, base, {
    bucketCapacity: Math.max(12, Math.round(base.bucketCapacity * scale)),
    maxAntsPerBucket: Math.max(3, Math.min(18, Math.round(base.maxAntsPerBucket * speedScale))),
    antSpeed: Math.round(base.antSpeed * speedScale * 10) / 10
  });
}

function runKey(spec) {
  const base = spec.kind === "custom" ? "custom:" + spec.grid.hash : spec.artId;
  return state.detail === DEFAULT_GRID ? base : base + ":" + state.detail;
}

function loadRecord() {
  const raw = R2.loadJSON(RECORD_KEY, null);
  const rec = raw && typeof raw === "object" ? raw : {};
  return {
    highScore: typeof rec.highScore === "number" ? rec.highScore : 0,
    bestStars: typeof rec.bestStars === "number" ? rec.bestStars : 0,
    plays: typeof rec.plays === "number" ? rec.plays : 0,
    wins: typeof rec.wins === "number" ? rec.wins : 0,
    bests: rec.bests && typeof rec.bests === "object" ? rec.bests : {}
  };
}

function saveRecord(rec) {
  const keys = Object.keys(rec.bests);
  if (keys.length > BESTS_MAX) {
    keys.sort((a, b) => (rec.bests[a].at || 0) - (rec.bests[b].at || 0));
    for (let i = 0; i < keys.length - BESTS_MAX; i++) delete rec.bests[keys[i]];
  }
  R2.saveJSON(RECORD_KEY, rec);
}

function recordFor(key) {
  const rec = loadRecord();
  return rec.bests[key] || null;
}

function drawCover(ctx, source, sw, sh, dw, dh) {
  const target = dw / dh;
  const ratio = sw / sh;
  let sx = 0, sy = 0, cw = sw, chh = sh;
  if (ratio > target) { cw = sh * target; sx = (sw - cw) / 2; }
  else { chh = sw / target; sy = (sh - chh) / 2; }
  ctx.drawImage(source, sx, sy, cw, chh, 0, 0, dw, dh);
}

function paintMosaic(canvas, grid) {
  const ctx = canvas.getContext("2d");
  const cw = canvas.width / grid.width;
  const ch = canvas.height / grid.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const idx = y * grid.width + x;
      const color = grid.palette[grid.indices[idx]];
      ctx.fillStyle = color.hex;
      ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
      const n = (idx * 2654435761) >>> 0;
      ctx.fillStyle = "rgba(255,252,226,0.18)";
      ctx.fillRect(x * cw + ((n % 7) / 7) * cw, y * ch + ((n % 5) / 5) * ch, 1, 1);
      ctx.fillStyle = "rgba(8,12,9,0.16)";
      ctx.fillRect(x * cw + ((n % 3) / 3) * cw, y * ch + ((n % 11) / 11) * ch, 1.2, 1.2);
    }
  }
}

function syncSoundButton() {
  const on = R2.getSettings().sound;
  el.btnSound.textContent = on ? "🔊" : "🔇";
  el.btnSound.setAttribute("aria-label", on ? "Mute sound" : "Unmute sound");
}

function updateTopbar() {
  const game = state.screen === "game";
  el.menu.classList.toggle("hidden", game);
  el.game.classList.toggle("hidden", !game);
  el.btnBack.classList.toggle("hidden", !game);
  el.brand.classList.toggle("hidden", game);
  el.gameHud.classList.toggle("hidden", !game);
  el.btnHowMenu.classList.toggle("hidden", game);
  document.body.classList.toggle("playing", game);
}

function setLoading(on, text) {
  if (text) el.loadingText.textContent = text;
  el.loading.classList.toggle("hidden", !on);
}

function showOverlay(node) { node.classList.remove("hidden"); }
function hideOverlay(node) { node.classList.add("hidden"); }

function markPlayedOnce() {
  R2.markPlayed(SLUG + "/");
  if (!state.playtimeStarted) {
    R2.trackPlaytime(SLUG);
    state.playtimeStarted = true;
  }
}

/* ---------- menu ---------- */

function buildMenu() {
  for (const art of ARTWORKS) {
    state.builtins[art.id] = { art, source: makeSource(art) };
  }
  renderArtCards();
  state.recent = loadRecent();
  renderRecent();
  syncSoundButton();
}

function bestLabel(key) {
  const best = recordFor(key);
  if (!best) return "";
  return best.stars ? best.stars + "★" : formatScore(best.score);
}

function renderArtCards() {
  el.artGrid.innerHTML = "";
  for (const art of ARTWORKS) {
    const entry = state.builtins[art.id];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "art-card";
    card.dataset.art = art.id;
    const cv = document.createElement("canvas");
    cv.width = 300;
    cv.height = 400;
    const ctx = cv.getContext("2d");
    drawCover(ctx, entry.source, entry.source.width, entry.source.height, 300, 400);
    card.appendChild(cv);
    const badge = bestLabel(art.id);
    if (badge) {
      const b = document.createElement("span");
      b.className = "best";
      b.textContent = badge;
      card.appendChild(b);
    }
    const body = document.createElement("div");
    body.className = "art-card-body";
    body.innerHTML = "<h3></h3><p></p>";
    body.querySelector("h3").textContent = art.name;
    body.querySelector("p").textContent = art.hint;
    card.appendChild(body);
    card.addEventListener("click", () => openBuiltin(art.id));
    el.artGrid.appendChild(card);
  }
}

function renderRecent() {
  state.recent = loadRecent();
  const has = !!state.recent;
  el.recentCard.classList.toggle("hidden", !has);
  el.btnForget.classList.toggle("hidden", !has);
  if (!has) return;
  el.recentThumb.src = state.recent.dataUrl;
  el.recentName.textContent = state.recent.name || "Your photo";
  const date = state.recent.savedAt ? new Date(state.recent.savedAt).toLocaleDateString() : "";
  el.recentMeta.textContent = (state.recent.colors || 6) + " colours · " +
    detailPixelsLabel(state.recent.detail) + " px" + (date ? " · " + date : "");
}

/* ---------- preview ---------- */

function openPreview(spec) {
  state.preview = spec;
  state.colors = spec.colors || (state.recent && state.recent.colors) || 6;
  if (!PRESETS[state.colors]) state.colors = 6;
  state.detail = validDetail(spec.detail || state.detail ||
    (state.recent && state.recent.detail) || DEFAULT_GRID);
  el.previewTitle.textContent = spec.name || "Your photo";
  el.previewHint.textContent = spec.hint || "Your photo, cut into ant-sized pixels";
  refreshPreview();
  showOverlay(el.preview);
  setTimeout(() => el.btnStart.focus(), 40);
}

function refreshPreview() {
  const spec = state.preview;
  if (!spec) return;
  const grid = buildBoard(spec.photo, state.colors, state.detail);
  spec.grid = grid;
  paintMosaic(el.previewCanvas, grid);
  renderSwatches(el.previewSwatches, grid);
  el.difficulty.querySelectorAll("button").forEach((b) => {
    const on = Number(b.dataset.colors) === state.colors;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  el.difficultyNote.textContent = presetNote(state.colors);
  el.detail.querySelectorAll("button").forEach((b) => {
    const on = b.dataset.detail === state.detail;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  el.detailNote.textContent = DETAIL_NOTES[state.detail] + " " + detailPixelsLabel(state.detail) + " pixels.";
}

function renderSwatches(container, grid) {
  container.innerHTML = "";
  grid.palette.forEach((color, i) => {
    const chip = document.createElement("span");
    chip.className = "swatch";
    const dot = document.createElement("i");
    dot.style.background = color.hex;
    dot.setAttribute("data-pattern", patternMode(i));
    const num = document.createElement("b");
    num.textContent = String(i + 1);
    const count = document.createElement("span");
    count.textContent = Math.round((grid.counts[i] / (grid.width * grid.height)) * 100) + "%";
    chip.appendChild(dot); chip.appendChild(num); chip.appendChild(count);
    container.appendChild(chip);
  });
}

function openBuiltin(id) {
  const entry = state.builtins[id];
  if (!entry) return;
  openPreview({
    kind: "builtin",
    artId: id,
    name: entry.art.name,
    hint: entry.art.hint,
    photo: entry.source,
    colors: (state.recent && state.recent.colors) || 6
  });
}

async function openCustomFile(file) {
  if (!fileIsImage(file)) {
    toast("That file is not an image.");
    return;
  }
  setLoading(true, "Cutting the picture into pixels…");
  try {
    const photo = await photoFromFile(file);
    const name = (file.name || "Your photo").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 48) || "Your photo";
    const colors = state.recent ? state.recent.colors : 6;
    openPreview({ kind: "custom", name, hint: "Your photo", photo, colors });
  } catch (e) {
    toast(e && e.message ? e.message : "That image could not be read.");
  } finally {
    setLoading(false);
  }
}

async function openRecent() {
  if (!state.recent) return;
  setLoading(true, "Opening your last picture…");
  try {
    const photo = await photoFromDataUrl(state.recent.dataUrl);
    openPreview({
      kind: "custom",
      name: state.recent.name || "Your photo",
      hint: "Your last saved picture",
      photo,
      colors: state.recent.colors || 6,
      detail: state.recent.detail
    });
  } catch (e) {
    toast("The saved picture could not be opened.");
    forgetRecent();
    renderRecent();
  } finally {
    setLoading(false);
  }
}

/* ---------- starting and stopping ---------- */

function startPrepared() {
  const spec = state.preview;
  if (!spec || !spec.grid) return;
  clearTimeout(state.resultTimer);
  hideOverlay(el.result);
  hideOverlay(el.pause);
  hideOverlay(el.howto);
  hideOverlay(el.preview);
  state.screen = "game";
  state.paused = false;
  state.ended = false;
  updateTopbar();

  const grid = spec.grid;
  state.board = createBoard({
    width: grid.width,
    height: grid.height,
    palette: grid.palette,
    indices: grid.indices,
    seed: (grid.hash ^ 0x51ed270b) >>> 0
  });
  const preset = presetFor(state.colors, grid);
  state.engine = createEngine({
    board: state.board,
    seed: (grid.hash ^ (state.colors * 2654435761)) >>> 0,
    config: preset
  });
  state.renderer = state.renderer || new Renderer(el.sceneCanvas);
  state.renderer.setBoard(grid, state.board);
  state.startTime = performance.now();
  state.lastFrame = performance.now();
  state.hud = { score: -1, pct: -1, time: "", tip: "", warn: null };
  if (spec.kind === "custom") {
    saveRecent(spec.photo, spec.name, state.colors, state.detail);
    renderRecent();
  }
  el.artLabel.textContent = spec.name || "Your photo";
  buildPalette(grid);
  updateHud(true);
  setHint("Tap a colour to send the colony", "");
  markPlayedOnce();
  sound.ui();
}

function buildPalette(grid) {
  el.palette.innerHTML = "";
  state.cups = [];
  const cols = grid.palette.length >= 7 ? 4 : grid.palette.length <= 4 ? grid.palette.length : 3;
  el.palette.style.setProperty("--cols", String(cols));
  grid.palette.forEach((color, index) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cup";
    b.dataset.color = String(index);
    b.dataset.pattern = patternMode(index);
    b.setAttribute("aria-label", colorName(index) + ", sends ants for this colour");
    const num = document.createElement("span");
    num.className = "num"; num.textContent = String(index + 1);
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = color.hex;
    const count = document.createElement("span");
    count.className = "count"; count.textContent = String(grid.counts[index]);
    const loaded = document.createElement("span");
    loaded.className = "loaded hidden";
    b.appendChild(num); b.appendChild(dot); b.appendChild(count); b.appendChild(loaded);
    b.addEventListener("click", () => deployColor(index));
    el.palette.appendChild(b);
    state.cups.push({ node: b, count, loaded, color: index });
  });
}

function deployColor(color) {
  if (!state.engine || state.screen !== "game" || state.paused) return;
  if (state.engine.remainingColor(color) <= 0) {
    toast("That colour is already finished.");
    return;
  }
  if (state.engine.exposedColor(color) <= 0) {
    toast("That colour is walled in — clear a route to its edge first.");
    sound.tap();
    return;
  }
  const r = state.engine.deploy(color);
  if (r.ok) {
    sound.deploy();
    R2.buzz(6);
    state.renderer.addEvent({ type: "deploy", color, slot: r.slot, slots: state.engine.slots });
  } else if (r.reason === "full") {
    toast("All rails are busy — tap a bucket to recall it.");
    sound.tap();
    R2.buzz([8, 30, 8]);
  } else if (r.reason === "buried") {
    toast("That colour is walled in — clear a route to its edge first.");
  } else if (r.reason === "empty") {
    toast("That colour is already finished.");
  }
}

function recallSlot(slot) {
  if (!state.engine || state.paused) return;
  const r = state.engine.recall(slot);
  if (r.ok) {
    sound.recall();
    R2.buzz(8);
    state.renderer.addEvent({ type: "recall", color: r.color, slot, slots: state.engine.slots });
    toast("Ants recalled — every pixel they carry still counts.");
  }
}

function backToMenu() {
  clearTimeout(state.resultTimer);
  hideOverlay(el.pause);
  hideOverlay(el.result);
  hideOverlay(el.preview);
  hideOverlay(el.howto);
  state.screen = "menu";
  state.engine = null;
  state.board = null;
  state.paused = false;
  updateTopbar();
  renderArtCards();
  renderRecent();
  el.menu.scrollTop = 0;
}

/* ---------- game loop ---------- */

function setHint(text, cls) {
  if (state.hud.tip === text && state.hud.warn === cls) return;
  state.hud.tip = text;
  state.hud.warn = cls;
  el.hint.textContent = text;
  el.hint.classList.toggle("warn", cls === "warn");
  el.hint.classList.toggle("good", cls === "good");
}

function updateHud(force) {
  if (!state.engine || !state.board) return;
  const s = state.engine.getState();
  const total = state.board.total;
  const pct = total ? Math.round((state.board.captured / total) * 100) : 0;
  if (force || state.hud.score !== s.score) {
    state.hud.score = s.score;
    el.score.textContent = formatScore(s.score);
  }
  if (force || state.hud.pct !== pct) {
    state.hud.pct = pct;
    el.progressFill.style.width = pct + "%";
    el.progressText.textContent = pct + "%";
  }
  const time = formatTime(s.time);
  if (force || state.hud.time !== time) {
    state.hud.time = time;
    el.timeValue.textContent = time;
  }

  for (const cup of state.cups) {
    const remain = state.engine.remainingColor(cup.color);
    const loaded = s.buckets.some((b) => b && b.color === cup.color);
    const buried = remain > 0 && state.engine.exposedColor(cup.color) === 0;
    cup.count.textContent = String(remain);
    cup.loaded.classList.toggle("hidden", !loaded);
    cup.node.classList.toggle("done", remain <= 0);
    cup.node.classList.toggle("buried", buried);
    cup.node.classList.toggle("active", loaded);
    cup.node.setAttribute("aria-pressed", loaded ? "true" : "false");
    cup.node.setAttribute("aria-label", colorName(cup.color) +
      (buried ? ", walled in" : loaded ? ", ants deployed" : ", sends ants"));
  }

  if (s.status === "won") {
    setHint("Frame cleared — the colony is home", "good");
  } else if (state.paused) {
    setHint("Paused", "");
  } else if (state.board.allCleared()) {
    setHint("Every pixel harvested — bring the ants home", "good");
  } else {
    const active = s.buckets.filter(Boolean);
    const blocked = active.find((b) =>
      state.board.remainingColor(b.color) > 0 && state.engine.exposedColor(b.color) === 0);
    if (blocked) {
      setHint("Colour " + (blocked.color + 1) + " is walled in — open a route first", "warn");
    } else if (active.length) {
      const b = active.find((bucket) => bucket.state === "active") || active[0];
      const fill = Math.round((b.fill / b.capacity) * 100);
      if (b.state === "closing") {
        setHint("Bucket " + (b.color + 1) + " is closing — recall another colour", "");
      } else {
        setHint("Collecting colour " + (b.color + 1) + " · bucket " + fill + "%", "good");
      }
    } else if (state.engine.availableColor(0) >= 0) {
      setHint("Tap a colour to send the colony", "");
    }
  }
}

function consumeEvents() {
  if (!state.engine || !state.renderer) return;
  const events = state.engine.drainEvents();
  for (const evt of events) {
    if (evt.type === "steal") {
      state.renderer.stealCell(evt.cell);
      const now = performance.now();
      if (!stealCue || now - stealCue > 55) {
        stealCue = now;
        sound.steal();
      }
    } else if (evt.type === "deliver") {
      state.renderer.addEvent(Object.assign({ slots: state.engine.slots }, evt));
      sound.deliver();
    } else if (evt.type === "bucketFull") {
      state.renderer.addEvent(Object.assign({ slots: state.engine.slots }, evt));
      sound.full();
      R2.buzz([10, 30, 12]);
    } else if (evt.type === "win") {
      state.renderer.addEvent({ type: "win", slots: state.engine.slots });
      state.renderer.clearAll();
      finishGame();
    }
  }
}

function finishGame() {
  if (state.ended) return;
  state.ended = true;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    setTimeout(() => R2.play(freq, 0.3, "triangle"), i * 110);
  });
  sound.win();
  R2.buzz([12, 40, 12, 40, 24]);
  saveResult();
  clearTimeout(state.resultTimer);
  state.resultTimer = setTimeout(showResult, 850);
}

function saveResult() {
  const spec = state.preview;
  if (!spec || !state.engine) return;
  const s = state.engine.getState();
  const key = runKey(spec);
  const rec = loadRecord();
  const previous = rec.bests[key];
  const best = previous && previous.score > s.score ? previous.score : s.score;
  const bestStars = Math.max(previous ? previous.stars || 0 : 0, s.stars);
  rec.bests[key] = {
    score: best, stars: bestStars, colors: state.colors,
    detail: state.detail, at: Date.now()
  };
  rec.plays += 1;
  rec.wins += 1;
  rec.highScore = Math.max(rec.highScore || 0, s.score);
  rec.bestStars = Math.max(rec.bestStars || 0, s.stars);
  saveRecord(rec);

  R2.stats.run({
    slug: SLUG,
    score: s.score,
    durMs: performance.now() - state.startTime,
    outcome: "win",
    meta: {
      colors: state.colors,
      detail: state.detail,
      grid: spec.grid.width + "x" + spec.grid.height,
      artwork: spec.kind === "custom" ? "custom" : spec.artId,
      stolen: s.stolen,
      total: s.total,
      idleAntSeconds: Math.round(s.idleAntSeconds * 10) / 10,
      stars: s.stars
    }
  });
}

function showResult() {
  const spec = state.preview;
  if (!spec) return;
  const s = state.engine.getState();
  const rec = loadRecord();
  const key = runKey(spec);
  const best = rec.bests[key] ? rec.bests[key].score : s.score;
  state.renderer.paintStill(el.resultCanvas);

  el.resultEyebrow.textContent = "Frame cleared";
  el.resultTitle.textContent = "The colony ate the picture";
  el.resultStars.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    span.textContent = "★";
    if (i >= s.stars) span.className = "dim";
    el.resultStars.appendChild(span);
  }
  el.resultStars.setAttribute("aria-label", s.stars + " of 3 stars");
  el.resultScore.textContent = formatScore(s.score);
  el.resultPixels.textContent = s.delivered + " / " + s.total;
  el.resultTime.textContent = formatTime(s.time) + " + " + s.idleAntSeconds.toFixed(1) + "s idle";
  el.resultBest.textContent = formatScore(best);
  el.resultColors.textContent = String(state.colors);
  el.resultNote.textContent = "Every exposed pixel was carried away. The frame is empty — that is the win. Load another picture and leave a different set of holes.";
  showOverlay(el.result);
  setTimeout(() => $("btnAgain").focus(), 40);
}

function frame(now) {
  if (state.screen === "game" && state.engine) {
    const dt = state.lastFrame ? Math.min(0.05, (now - state.lastFrame) / 1000) : 0;
    state.lastFrame = now;
    if (!state.paused && state.engine.getState().status === "playing") {
      state.engine.update(dt);
    }
    if (!state.paused) consumeEvents();
    updateHud(false);
    state.renderer.paint(state.engine.snapshot(), dt, now);
  }
  requestAnimationFrame(frame);
}

/* ---------- pause ---------- */

function togglePause(force) {
  if (state.screen !== "game" || !state.engine) return;
  if (state.engine.getState().status !== "playing") return;
  const want = force == null ? !state.paused : force;
  if (want === state.paused) return;
  state.paused = want;
  if (want) {
    const s = state.engine.getState();
    el.pauseStats.innerHTML = "";
    const add = (label, value) => {
      const d = document.createElement("div");
      d.innerHTML = "<span></span><b></b>";
      d.querySelector("span").textContent = label;
      d.querySelector("b").textContent = value;
      el.pauseStats.appendChild(d);
    };
    add("Score", formatScore(s.score));
    add("Cleared", Math.round((state.board.captured / state.board.total) * 100) + "%");
    add("Time", formatTime(s.time));
    showOverlay(el.pause);
    sound.ui();
  } else {
    hideOverlay(el.pause);
    state.lastFrame = performance.now();
  }
}

/* ---------- events ---------- */

function bindEvents() {
  $("btnUploadHero").addEventListener("click", () => el.fileInput.click());
  el.uploadCard.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) openCustomFile(file);
  });

  $("btnHowMenu").addEventListener("click", () => showOverlay(el.howto));
  $("btnHowHero").addEventListener("click", () => showOverlay(el.howto));
  $("btnHowClose").addEventListener("click", () => hideOverlay(el.howto));

  $("btnPreviewBack").addEventListener("click", () => {
    hideOverlay(el.preview);
    state.preview = null;
  });

  el.difficulty.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-colors]");
    if (!b) return;
    const colors = Number(b.dataset.colors);
    if (!PRESETS[colors]) return;
    state.colors = colors;
    refreshPreview();
    sound.ui();
  });

  el.detail.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-detail]");
    if (!b) return;
    if (!GRID_PRESETS[b.dataset.detail]) return;
    state.detail = b.dataset.detail;
    refreshPreview();
    sound.ui();
  });

  el.btnStart.addEventListener("click", startPrepared);

  el.btnBack.addEventListener("click", () => {
    if (state.screen === "game") backToMenu();
  });

  el.btnPause.addEventListener("click", () => togglePause());
  $("btnResume").addEventListener("click", () => togglePause(false));
  $("btnQuit").addEventListener("click", backToMenu);

  el.btnSound.addEventListener("click", () => {
    const s = R2.getSettings();
    R2.setSettings({ sound: !s.sound, haptics: !s.sound });
    syncSoundButton();
    if (!s.sound) sound.ui();
  });

  el.sceneCanvas.addEventListener("pointerdown", (e) => {
    if (!state.engine || state.paused) return;
    const slot = state.renderer.hitSlot(e.clientX, e.clientY);
    if (slot >= 0) {
      const s = state.engine.getState();
      if (s.buckets[slot]) {
        e.preventDefault();
        recallSlot(slot);
      }
    }
  });

  el.recentCard.addEventListener("click", openRecent);
  el.btnForget.addEventListener("click", (e) => {
    e.stopPropagation();
    forgetRecent();
    renderRecent();
    toast("Saved photo forgotten.");
  });

  $("btnAgain").addEventListener("click", () => {
    hideOverlay(el.result);
    startPrepared();
  });
  $("btnNewPicture").addEventListener("click", backToMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el.howto.classList.contains("hidden")) { hideOverlay(el.howto); return; }
      if (!el.preview.classList.contains("hidden")) { hideOverlay(el.preview); return; }
      if (!el.pause.classList.contains("hidden")) { togglePause(false); return; }
      if (state.screen === "game") togglePause();
      return;
    }
    if (state.screen !== "game") return;
    if (e.key === "p" || e.key === "P") { togglePause(); return; }
    if (e.key === "m" || e.key === "M") { el.btnSound.click(); return; }
    if (/^[1-8]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (state.cups[idx]) deployColor(idx);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.screen === "game" && !state.paused) {
      if (state.engine && state.engine.getState().status === "playing") togglePause(true);
    }
  });

  let dragDepth = 0;
  window.addEventListener("dragenter", (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes("Files")) return;
    dragDepth++;
    el.drop.classList.remove("hidden");
  });
  window.addEventListener("dragover", (e) => {
    if (e.dataTransfer) e.preventDefault();
  });
  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) el.drop.classList.add("hidden");
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    el.drop.classList.add("hidden");
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) openCustomFile(file);
  });

  document.addEventListener("paste", (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { openCustomFile(file); break; }
      }
    }
  });

  el.sceneCanvas.addEventListener("contextmenu", (e) => e.preventDefault());
}

/* ---------- boot ---------- */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

function boot() {
  buildMenu();
  bindEvents();
  updateTopbar();
  requestAnimationFrame(frame);
  registerServiceWorker();
  setTimeout(() => { try { R2.installHint(); } catch (e) { /* ignore */ } }, 2400);
}

boot();

window.PixelAnts = {
  startBuiltin(id) {
    openBuiltin(id);
    startPrepared();
  },
  deploy(color) { deployColor(color); },
  recall(slot) { recallSlot(slot); },
  setDetail(id) {
    if (!GRID_PRESETS[id]) return false;
    state.detail = id;
    if (state.preview) refreshPreview();
    return true;
  },
  state,
  get engine() { return state.engine; },
  get board() { return state.board; }
};
