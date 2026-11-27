import { GARDENS, LEVELS_PER_GARDEN } from "./config.js";
import { dailyLevel, makeLevel, totalLevels } from "./levels.js";
import { createGame } from "./engine.js";
import { Renderer } from "./render.js";
import { createAudio } from "./audio.js";
import {
  clearResume, loadProgress, loadResume, loadSettings, recordWin, resumeIsValid,
  saveResume, saveSettings
} from "./storage.js";

const $ = (id) => document.getElementById(id);

const app = {
  screen: "menu",
  paused: false,
  progress: loadProgress(),
  settings: loadSettings(),
  audio: null,
  renderer: null,
  game: null,
  currentLevel: null,
  currentGarden: 0,
  dailyKey: "",
  hint: null,
  lastFrame: 0,
  saveTimer: 0,
  resultShown: false,
  toastTimer: 0
};

app.audio = createAudio(app.settings);
app.renderer = new Renderer($("gameCanvas"), app.settings);

function show(node) { node.classList.remove("hidden"); }
function hide(node) { node.classList.add("hidden"); }

function toast(message, ms) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => node.classList.remove("show"), ms || 2200);
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function completedColors(tubes) {
  return tubes.filter((tube) => tube.length === 4 && tube.every((unit) => unit === tube[0])).length;
}

function updateSoundButton() {
  const on = app.settings.sound;
  $("soundButton").textContent = on ? "♪" : "×";
  $("soundButton").setAttribute("aria-label", on ? "Disattiva audio" : "Attiva audio");
  $("soundSetting").checked = on;
}

function updateMenu() {
  const entries = Object.entries(app.progress.stars).filter(([id]) => !id.startsWith("daily-"));
  const stars = entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
  const moves = Object.values(app.progress.bestMoves).filter((value) => Number.isFinite(value));
  $("completedStat").textContent = `${entries.length}/${totalLevels()}`;
  $("gardenStarsStat").textContent = `${stars}/${totalLevels() * 3}`;
  $("flowersStat").textContent = String(entries.length * 3);
  $("bestMovesStat").textContent = moves.length ? String(Math.min(...moves)) : "—";
  const resume = loadResume();
  $("continueButton").hidden = !resume || !resumeIsValid(resume.level, resume.snapshot);
  $("dailyDate").textContent = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function openDialog(id) {
  if (app.screen === "game" && app.game && app.game.getState().status === "playing") app.paused = true;
  show($(id));
}

function closeDialogs() {
  document.querySelectorAll(".overlay").forEach((node) => node.classList.add("hidden"));
  if (app.screen === "game" && app.game && app.game.getState().status === "playing") app.paused = false;
}

function startLevel(level, snapshot) {
  app.currentLevel = level;
  app.game = createGame(level, snapshot);
  app.screen = "game";
  app.paused = false;
  app.resultShown = false;
  app.hint = null;
  app.saveTimer = 0;
  app.lastFrame = performance.now();
  app.renderer = new Renderer($("gameCanvas"), app.settings);
  hide($("menuScreen"));
  show($("gameScreen"));
  closeDialogs();
  app.paused = false;
  $("modeLabel").textContent = level.kind === "daily" ? "GIORNALIERO" : "GIARDINO";
  $("levelLabel").textContent = level.kind === "daily" ? "Giardino del giorno" : level.name;
  $("boardStatus").textContent = "Seleziona una fiala, poi la destinazione.";
  updateHud();
  if (!snapshot) toast(level.kind === "daily" ? "Sfida giornaliera" : level.name);
}

function playCurrent() {
  const flat = Math.min(totalLevels(), app.progress.unlocked);
  const garden = Math.floor((flat - 1) / LEVELS_PER_GARDEN);
  const stage = (flat - 1) % LEVELS_PER_GARDEN;
  startLevel(makeLevel(garden, stage));
}

function startDaily() {
  app.dailyKey = todayKey();
  startLevel(dailyLevel(app.dailyKey));
}

function startNext() {
  if (!app.currentLevel || app.currentLevel.kind !== "campaign") { returnToMenu(); return; }
  let garden = app.currentLevel.gardenIndex;
  let stage = app.currentLevel.stage + 1;
  if (stage >= LEVELS_PER_GARDEN) { garden++; stage = 0; }
  if (garden >= GARDENS.length) { returnToMenu(); return; }
  startLevel(makeLevel(garden, stage));
}

function saveCurrent() {
  if (app.screen !== "game" || !app.game || !app.currentLevel) return;
  if (app.game.getState().status === "playing") saveResume(app.currentLevel, app.game.snapshot());
  else clearResume();
}

function returnToMenu() {
  saveCurrent();
  app.screen = "menu";
  app.paused = false;
  hide($("gameScreen"));
  show($("menuScreen"));
  closeDialogs();
  updateMenu();
}

function validTargets() {
  if (!app.game) return [];
  const state = app.game.getState();
  if (state.selected == null) return [];
  return state.tubes.map((_, index) => index).filter((index) => app.game.canPour(state.selected, index));
}

function updateHud() {
  if (!app.game) return;
  const state = app.game.getState();
  const playing = state.status === "playing";
  $("movesValue").textContent = String(state.moves);
  $("colorsValue").textContent = `${completedColors(state.tubes)}/${state.colors}`;
  $("scoreValue").textContent = state.score.toLocaleString("it-IT");
  $("parValue").textContent = String(state.par);
  $("undoValue").textContent = String(state.undosLeft);
  $("shuffleValue").textContent = String(state.shufflesLeft);
  $("extraValue").textContent = String(state.extrasLeft);
  $("undoButton").disabled = state.undosLeft <= 0 || !playing;
  $("shuffleButton").disabled = state.shufflesLeft <= 0 || !playing;
  $("extraButton").disabled = state.extrasLeft <= 0 || !playing;
  $("hintButton").disabled = !playing;
}

function finishLevel() {
  if (!app.game || app.resultShown) return;
  const state = app.game.getState();
  if (state.status !== "won") return;
  app.resultShown = true;
  app.paused = true;
  recordWin(app.progress, app.currentLevel, state);
  clearResume();
  $("resultStars").textContent = "★".repeat(state.stars) + "☆".repeat(3 - state.stars);
  $("resultScore").textContent = state.score.toLocaleString("it-IT");
  $("resultMoves").textContent = String(state.moves);
  $("resultPar").textContent = String(state.par);
  $("resultNote").textContent = state.stars === 3 ? "Perfetto: ogni tintura è al suo posto." : "Un nuovo fiore è sbocciato.";
  $("nextButton").hidden = app.currentLevel.kind !== "campaign" || app.currentLevel.number >= totalLevels();
  $("nextButton").textContent = "Prossimo livello";
  openDialog("resultDialog");
  app.audio.play("win");
  updateMenu();
}

function processEvents(events) {
  for (const event of events) {
    if (event.type === "select") app.audio.play("select");
    else if (event.type === "pour") {
      app.audio.play(event.completed ? "complete" : "pour");
      app.renderer.animatePour(event.from, event.to, event.color);
      if (event.completed) app.renderer.burst(event.to, ["#f4a7b5", "#a8e6cf", "#a9c9f5", "#f7e3a1", "#d5b9ec", "#f3c3a5", "#c7e8a9", "#f2c6d8"][event.color]);
      app.hint = null;
    } else if (event.type === "invalid") {
      app.audio.play("invalid");
      $("boardStatus").textContent = "La destinazione non è compatibile.";
    } else if (event.type === "undo") { app.audio.play("undo"); app.hint = null; }
    else if (event.type === "shuffle") { app.audio.play("shuffle"); app.hint = null; }
    else if (event.type === "extra-tube") app.audio.play("select");
    else if (event.type === "hint") {
      app.hint = event;
      $("boardStatus").textContent = "Segui le fiale evidenziate.";
    } else if (event.type === "win") finishLevel();
  }
}

function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - app.lastFrame) / 1000));
  app.lastFrame = now;
  if (app.game) {
    if (!app.paused && app.screen === "game" && app.game.getState().status === "playing") {
      app.saveTimer += dt;
      if (app.saveTimer >= 4) { app.saveTimer = 0; saveCurrent(); }
    }
    app.renderer.draw(app.game.getState(), validTargets(), app.hint, now, app.paused ? 0 : dt);
    processEvents(app.game.drainEvents());
    updateHud();
  }
  requestAnimationFrame(loop);
}

function onCanvasPointerDown(event) {
  if (!app.game || app.paused || app.game.getState().status !== "playing") return;
  app.audio.unlock();
  const index = app.renderer.pointerToTube(event.clientX, event.clientY, app.game.getState().tubes.length);
  if (index == null) return;
  const state = app.game.getState();
  if (state.selected == null) {
    app.game.select(index);
    if (state.selected != null) $("boardStatus").textContent = "Ora seleziona una destinazione compatibile.";
  } else if (state.selected === index) {
    state.selected = null;
    $("boardStatus").textContent = "Seleziona una fiala, poi la destinazione.";
  } else {
    app.game.pour(index);
  }
  app.hint = null;
  updateHud();
}

function showHint() {
  if (!app.game || app.paused) return;
  const move = app.game.hint();
  if (!move) { toast("Nessun suggerimento disponibile."); return; }
  app.hint = move;
  updateHud();
}

function buildGardenTabs() {
  const tabs = $("areaTabs");
  tabs.innerHTML = "";
  GARDENS.forEach((garden, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "area-tab" + (index === app.currentGarden ? " on" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", index === app.currentGarden ? "true" : "false");
    button.textContent = `${index + 1}. ${garden.name}`;
    button.addEventListener("click", () => {
      app.currentGarden = index;
      buildGardenTabs();
      renderLevels();
    });
    tabs.appendChild(button);
  });
}

function renderLevels() {
  const grid = $("levelGrid");
  grid.innerHTML = "";
  for (let stage = 0; stage < LEVELS_PER_GARDEN; stage++) {
    const flat = app.currentGarden * LEVELS_PER_GARDEN + stage + 1;
    const id = `${GARDENS[app.currentGarden].id}-${stage + 1}`;
    const stars = app.progress.stars[id] || 0;
    const locked = flat > app.progress.unlocked;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-btn" + (locked ? " locked" : "");
    button.disabled = locked;
    button.setAttribute("aria-label", `Livello ${flat}${stars ? `, ${stars} stelle` : ""}${locked ? ", bloccato" : ""}`);
    const title = document.createElement("span");
    title.textContent = String(flat);
    const starRow = document.createElement("span");
    starRow.className = "mini-stars";
    starRow.textContent = "★".repeat(stars);
    button.append(title, starRow);
    if (!locked) button.addEventListener("click", () => { closeDialogs(); startLevel(makeLevel(app.currentGarden, stage)); });
    grid.appendChild(button);
  }
}

function openGardens() {
  app.currentGarden = Math.floor((app.progress.unlocked - 1) / LEVELS_PER_GARDEN);
  app.currentGarden = Math.max(0, Math.min(GARDENS.length - 1, app.currentGarden));
  buildGardenTabs();
  renderLevels();
  openDialog("gardensDialog");
}

function togglePause() {
  if (app.screen !== "game" || !app.game || app.game.getState().status !== "playing") return;
  if (app.paused) closeDialogs();
  else openDialog("pauseDialog");
}

function bindEvents() {
  $("playButton").addEventListener("click", playCurrent);
  $("dailyButton").addEventListener("click", startDaily);
  $("dailyCard").addEventListener("click", startDaily);
  $("gardensButton").addEventListener("click", openGardens);
  $("continueButton").addEventListener("click", () => {
    const resume = loadResume();
    if (resume && resume.level && resume.snapshot && resumeIsValid(resume.level, resume.snapshot)) startLevel(resume.level, resume.snapshot);
    else { clearResume(); updateMenu(); toast("Salvataggio non compatibile."); }
  });
  $("brandButton").addEventListener("click", returnToMenu);
  $("backButton").addEventListener("click", returnToMenu);
  $("pauseButton").addEventListener("click", togglePause);
  $("resumeButton").addEventListener("click", closeDialogs);
  $("quitButton").addEventListener("click", returnToMenu);
  $("resultMenuButton").addEventListener("click", returnToMenu);
  $("replayButton").addEventListener("click", () => startLevel(app.currentLevel));
  $("nextButton").addEventListener("click", startNext);
  $("undoButton").addEventListener("click", () => { if (app.game) { app.game.undo(); updateHud(); } });
  $("shuffleButton").addEventListener("click", () => { if (app.game) { app.game.shuffle(); updateHud(); } });
  $("extraButton").addEventListener("click", () => { if (app.game) { app.game.addTube(); updateHud(); } });
  $("hintButton").addEventListener("click", showHint);
  $("settingsButton").addEventListener("click", () => openDialog("settingsDialog"));
  $("howButton").addEventListener("click", () => { hide($("settingsDialog")); openDialog("howDialog"); });
  $("soundButton").addEventListener("click", () => {
    app.settings.sound = !app.settings.sound;
    app.audio.setEnabled(app.settings.sound);
    saveSettings(app.settings);
    updateSoundButton();
  });
  $("soundSetting").addEventListener("change", (event) => {
    app.settings.sound = event.target.checked;
    app.audio.setEnabled(app.settings.sound);
    saveSettings(app.settings);
    updateSoundButton();
  });
  $("motionSetting").addEventListener("change", (event) => {
    app.settings.reducedMotion = event.target.checked;
    app.renderer.setSettings(app.settings);
    saveSettings(app.settings);
  });
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      hide($(button.dataset.close));
      if (app.screen === "game" && app.game && app.game.getState().status === "playing") app.paused = false;
    });
  });
  $("gameCanvas").addEventListener("pointerdown", onCanvasPointerDown);
  $("gameCanvas").addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("keydown", (event) => {
    if (app.screen !== "game" || !app.game) return;
    const key = event.key.toLowerCase();
    if (key === "p" || key === "escape") { event.preventDefault(); togglePause(); }
    else if (key === "u") { event.preventDefault(); app.game.undo(); updateHud(); }
    else if (key === "h") { event.preventDefault(); showHint(); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveCurrent(); });
  window.addEventListener("beforeunload", saveCurrent);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => { /* optional */ });
  }
}

function init() {
  $("motionSetting").checked = app.settings.reducedMotion;
  updateSoundButton();
  updateMenu();
  bindEvents();
  registerServiceWorker();
  window.VialGarden = {
    get state() { return app; },
    get game() { return app.game; },
    startLevel,
    startDaily,
    returnToMenu,
    makeLevel,
    showHint
  };
  requestAnimationFrame(loop);
}

init();
