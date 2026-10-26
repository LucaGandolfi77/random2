/*
 * Sand Loop — boot, menus, input and glue
 * ---------------------------------------
 * The engine holds the rules, the renderer holds the pixels. This file holds
 * everything that is neither: choosing a picture, reading a file, building
 * the palette bar, pausing, and writing the local record.
 */

import { ARTWORKS, makeSource } from "./artworks.js";
import {
  buildBoard, photoFromFile, photoFromDataUrl, saveRecent, loadRecent, forgetRecent, fileIsImage,
  GRID_W, GRID_H
} from "./image-import.js";
import { createBoard } from "./board.js";
import { createEngine } from "./engine.js";
import { Renderer, patternMode } from "./render.js";

const $ = (id) => document.getElementById(id);
const R2 = window.R2;

const PRESETS = {
  4: { slots: 4, pourRate: 23, bucketCapacity: 160, spillShare: 0.2 },
  6: { slots: 5, pourRate: 26, bucketCapacity: 120, spillShare: 0.18 },
  8: { slots: 6, pourRate: 29, bucketCapacity: 100, spillShare: 0.17 }
};

const RECORD_KEY = "sand-loop-pwa";
const SLUG = "sand-loop-pwa";
const BESTS_MAX = 24;

const el = {
  menu: $("menuScreen"),
  game: $("gameScreen"),
  artCanvas: $("artCanvas"),
  playCanvas: $("playCanvas"),
  preview: $("preview"),
  previewCanvas: $("previewCanvas"),
  previewTitle: $("previewTitle"),
  previewHint: $("previewHint"),
  previewSwatches: $("previewSwatches"),
  difficulty: $("difficulty"),
  difficultyNote: $("difficultyNote"),
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
  resultGrains: $("resultGrains"),
  resultSpilled: $("resultSpilled"),
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
  spillFill: $("spillFill"),
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
  preview: null,
  board: null,
  engine: null,
  renderer: null,
  startTime: 0,
  ended: false,
  resultTimer: 0,
  cueTimer: 0,
  lastFrame: 0,
  playtimeStarted: false,
  hud: { score: -1, pct: -1, spill: -1, tip: "", warn: null },
  cups: []
};

const sound = R2.makeSound({
  tap: [520, 0.05, "sine"],
  deploy: [430, 0.07, "triangle"],
  recall: [300, 0.09, "triangle"],
  capture: [880, 0.035, "sine"],
  spill: [120, 0.12, "sawtooth"],
  full: [680, 0.16, "triangle"],
  win: [880, 0.28, "sine"],
  lose: [95, 0.38, "sawtooth"],
  ui: [600, 0.05, "sine"]
});

let toastTimer = 0;

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

function colorName(index) {
  return "Colour " + (index + 1);
}

function presetNote(colors) {
  if (colors === 4) return "Four buckets on the loop: every colour fits at once.";
  if (colors === 8) return "Six buckets, eight colours. Two will have to wait in the tray.";
  return "Five buckets on the loop, one more colour in the tray.";
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
      ctx.fillStyle = "rgba(255,248,226,0.22)";
      ctx.fillRect(x * cw + ((n % 7) / 7) * cw, y * ch + ((n % 5) / 5) * ch, 1, 1);
      ctx.fillStyle = "rgba(25,16,10,0.2)";
      ctx.fillRect(x * cw + ((n % 3) / 3) * cw, y * ch + ((n % 11) / 11) * ch, 1.2, 1.2);
    }
  }
  const vign = ctx.createLinearGradient(0, 0, 0, canvas.height);
  vign.addColorStop(0, "rgba(30,18,12,0.14)");
  vign.addColorStop(0.2, "rgba(30,18,12,0)");
  vign.addColorStop(0.82, "rgba(30,18,12,0)");
  vign.addColorStop(1, "rgba(30,18,12,0.24)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  const rec = loadRecord();
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
  void rec;
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
  el.recentMeta.textContent = (state.recent.colors || 6) + " colours" + (date ? " · " + date : "");
}

/* ---------- preview ---------- */

function openPreview(spec) {
  state.preview = spec;
  state.colors = spec.colors || state.recent && state.recent.colors || 6;
  if (!PRESETS[state.colors]) state.colors = 6;
  el.previewTitle.textContent = spec.name || "Your photo";
  el.previewHint.textContent = spec.hint || "Your photo, sorted into sand";
  refreshPreview();
  showOverlay(el.preview);
  setTimeout(() => el.btnStart.focus(), 40);
}

function refreshPreview() {
  const spec = state.preview;
  if (!spec) return;
  const grid = buildBoard(spec.photo, state.colors);
  spec.grid = grid;
  paintMosaic(el.previewCanvas, grid);
  renderSwatches(el.previewSwatches, grid);
  el.difficulty.querySelectorAll("button").forEach((b) => {
    const on = Number(b.dataset.colors) === state.colors;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  el.difficultyNote.textContent = presetNote(state.colors);
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
    colors: state.recent && state.recent.colors || 6
  });
}

async function openCustomFile(file) {
  if (!fileIsImage(file)) {
    toast("That file is not an image.");
    return;
  }
  setLoading(true, "Grinding the picture into sand…");
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
      colors: state.recent.colors || 6
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
  const preset = PRESETS[state.colors] || PRESETS[6];
  state.engine = createEngine({
    counts: grid.counts,
    seed: (grid.hash ^ (state.colors * 2654435761)) >>> 0,
    config: Object.assign({}, preset),
    capture: (color) => state.board.captureCell(color),
    accessible: (color) => state.board.accessibleCount(color)
  });
  state.renderer = state.renderer || new Renderer(el.artCanvas, el.playCanvas);
  state.renderer.setBoard(spec.photo, grid);
  state.startTime = performance.now();
  state.lastFrame = performance.now();
  state.hud = { score: -1, pct: -1, spill: -1, tip: "", warn: null };
  if (spec.kind === "custom") {
    saveRecent(spec.photo, spec.name, state.colors);
    renderRecent();
  }
  el.artLabel.textContent = spec.name || "Your photo";
  buildPalette(grid);
  updateHud(true);
  setHint("Tap a colour to load a bucket", "");
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
    b.setAttribute("aria-label", colorName(index) + ", taps load a bucket");
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
  if (state.engine.remainingColor(color) > 0 && state.board.accessibleCount(color) === 0) {
    toast("That colour is buried — it will surface as the picture drops.");
    return;
  }
  const r = state.engine.deploy(color);
  if (r.ok) {
    sound.deploy();
    R2.buzz(6);
    state.renderer.addEvent({ type: "deploy", color });
  } else if (r.reason === "full") {
    toast("Loop full — tap a bucket to recycle it.");
    sound.spill();
    R2.buzz([8, 30, 8]);
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
    state.renderer.addEvent({ type: "recall", color: r.color });
    toast("Bucket recycled — its sand is already counted.");
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
  const spillRatio = clamp(s.spilled / Math.max(1, s.spillLimit), 0, 1);
  if (force || state.hud.spill !== spillRatio) {
    state.hud.spill = spillRatio;
    el.spillFill.style.width = (spillRatio * 100).toFixed(1) + "%";
  }

  /* cups */
  const reachable = state.board.accessibleByColor();
  for (const cup of state.cups) {
    const remain = state.engine.remainingColor(cup.color);
    const active = s.currentColor === cup.color;
    const loaded = s.buckets.some((b) => b && b.color === cup.color);
    const buried = remain > 0 && reachable[cup.color] === 0;
    cup.count.textContent = String(remain);
    cup.loaded.classList.toggle("hidden", !loaded);
    cup.node.classList.toggle("done", remain <= 0);
    cup.node.classList.toggle("buried", buried);
    cup.node.classList.toggle("active", active && remain > 0);
    cup.node.setAttribute("aria-pressed", active ? "true" : "false");
    cup.node.setAttribute("aria-label", colorName(cup.color) + (buried ? ", buried under the picture" : ", taps load a bucket"));
  }

  /* hint */
  if (s.status === "won") {
    setHint("Picture complete", "good");
  } else if (s.status === "lost") {
    setHint("The spill tray overflowed", "warn");
  } else if (state.paused) {
    setHint("Paused", "");
  } else if (s.graceLeft > 0) {
    setHint("Tap a colour below to load a bucket", "");
  } else if (s.currentColor >= 0) {
    const matching = s.buckets.some((b) => b && b.color === s.currentColor);
    if (!matching) {
      setHint("Load colour " + (s.currentColor + 1) + " — sand is spilling", "warn");
    } else if (s.holding) {
      setHint("Turning the loop into place…", "");
    } else {
      const active = s.buckets.find((b) => b && b.color === s.currentColor);
      const fill = active ? Math.round((active.fill / active.capacity) * 100) : 0;
      setHint("Collecting colour " + (s.currentColor + 1) + " · bucket " + fill + "%", "good");
    }
  } else {
    setHint("", "");
  }
}

function consumeEvents() {
  if (!state.engine || !state.renderer) return;
  const events = state.engine.drainEvents();
  for (const evt of events) {
    state.renderer.addEvent(evt);
    if (evt.type === "capture") {
      if (evt.cell) state.renderer.collapseCell(evt.cell);
      const s = state.engine.getState();
      if (s.captured % 4 === 0) sound.capture();
    } else if (evt.type === "spill") {
      if (!state.cueTimer || performance.now() - state.cueTimer > 140) {
        state.cueTimer = performance.now();
        sound.spill();
      }
    } else if (evt.type === "bucketFull") {
      sound.full();
      R2.buzz([10, 30, 12]);
    } else if (evt.type === "deploy" || evt.type === "recall") {
      /* handled by the action that emitted it */
    } else if (evt.type === "win") {
      state.renderer.clearAll();
      finishGame(true);
    } else if (evt.type === "lose") {
      finishGame(false);
    }
  }
}

function finishGame(won) {
  if (state.ended) return;
  state.ended = true;
  if (won) {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => R2.play(freq, 0.3, "triangle"), i * 110);
    });
    sound.win();
    R2.buzz([12, 40, 12, 40, 24]);
  } else {
    [392, 329.63, 261.63, 196].forEach((freq, i) => {
      setTimeout(() => R2.play(freq, 0.32, "sawtooth"), i * 130);
    });
    sound.lose();
    R2.buzz([30, 50, 30]);
  }
  saveResult(won);
  clearTimeout(state.resultTimer);
  state.resultTimer = setTimeout(() => showResult(won), won ? 850 : 550);
}

function saveResult(won) {
  const spec = state.preview;
  if (!spec || !state.engine) return;
  const s = state.engine.getState();
  const key = spec.kind === "custom" ? "custom:" + spec.grid.hash : spec.artId;
  const rec = loadRecord();
  const stars = won ? s.stars : 0;
  const previous = rec.bests[key];
  const best = previous && previous.score > s.score ? previous.score : s.score;
  const bestStars = Math.max(previous ? previous.stars || 0 : 0, stars);
  rec.bests[key] = { score: best, stars: bestStars, colors: state.colors, at: Date.now() };
  rec.plays += 1;
  if (won) rec.wins += 1;
  rec.highScore = Math.max(rec.highScore || 0, s.score);
  rec.bestStars = Math.max(rec.bestStars || 0, stars);
  saveRecord(rec);

  R2.stats.run({
    slug: SLUG,
    score: s.score,
    durMs: performance.now() - state.startTime,
    outcome: won ? "win" : "loss",
    meta: {
      colors: state.colors,
      artwork: spec.kind === "custom" ? "custom" : spec.artId,
      captured: s.captured,
      total: s.total,
      spilled: s.spilled,
      stars
    }
  });
}

function showResult(won) {
  const spec = state.preview;
  if (!spec) return;
  const s = state.engine.getState();
  const rec = loadRecord();
  const key = spec.kind === "custom" ? "custom:" + spec.grid.hash : spec.artId;
  const best = rec.bests[key] ? rec.bests[key].score : s.score;
  const rctx = el.resultCanvas.getContext("2d");
  rctx.clearRect(0, 0, el.resultCanvas.width, el.resultCanvas.height);
  rctx.drawImage(el.artCanvas, 0, 0, el.resultCanvas.width, el.resultCanvas.height);

  el.resultEyebrow.textContent = won ? "Picture complete" : "Out of room";
  el.resultTitle.textContent = won ? "The photo is back" : "The spill tray overflowed";
  el.resultStars.innerHTML = "";
  const stars = won ? s.stars : 0;
  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    span.textContent = "★";
    if (i >= stars) span.className = "dim";
    el.resultStars.appendChild(span);
  }
  el.resultStars.setAttribute("aria-label", stars + " of 3 stars");
  el.resultScore.textContent = formatScore(s.score);
  el.resultGrains.textContent = s.captured + " / " + s.total;
  el.resultSpilled.textContent = String(s.spilled);
  el.resultBest.textContent = formatScore(best);
  el.resultColors.textContent = String(state.colors);
  el.resultNote.textContent = won
    ? "The loop cleared the picture. Your image is fully revealed and the run is in your local records."
    : "The tray filled before the picture was clear. Load the current colour faster, or recycle a bucket to make room on the loop.";
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
    state.renderer.paint(state.engine.getState(), dt, now);
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
    add("Spilled", String(s.spilled));
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

  el.btnStart.addEventListener("click", startPrepared);

  el.btnBack.addEventListener("click", () => {
    if (state.screen === "game") {
      if (state.engine && state.engine.getState().status === "playing" && !state.ended) {
        backToMenu();
      } else {
        backToMenu();
      }
    }
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

  el.playCanvas.addEventListener("pointerdown", (e) => {
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

  /* drag and drop */
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

  /* clipboard paste */
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

  el.playCanvas.addEventListener("contextmenu", (e) => e.preventDefault());
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

/* expose a small surface for the optional browser smoke test */
window.SandLoop = {
  startBuiltin(id) {
    openBuiltin(id);
    startPrepared();
  },
  deploy(color) { deployColor(color); },
  state,
  get engine() { return state.engine; }
};
