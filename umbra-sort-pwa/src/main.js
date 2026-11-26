import { AREAS, LEVELS_PER_AREA } from "./config.js";
import { dailyLevel, makeLevel } from "./levels.js";
import { createGame } from "./engine.js";
import { Renderer } from "./render.js";
import { createAudio } from "./audio.js";
import {
  clearResume, loadProgress, loadResume, loadSettings, recordWin, saveProgress,
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
  currentArea: 0,
  dailyKey: "",
  dragging: null,
  lastFrame: 0,
  resultShown: false,
  saveTimer: 0,
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
  app.toastTimer = setTimeout(() => node.classList.remove("show"), ms || 2400);
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function updateSoundButton() {
  const on = app.settings.sound;
  $("soundButton").textContent = on ? "♪" : "×";
  $("soundButton").setAttribute("aria-label", on ? "Disattiva audio" : "Attiva audio");
  $("soundSetting").checked = on;
}

function updateMenu() {
  const stars = Object.values(app.progress.stars).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const best = Object.values(app.progress.best).reduce((max, n) => Math.max(max, Number(n) || 0), 0);
  $("unlockedStat").textContent = `${app.progress.unlocked}/100`;
  $("starsStat").textContent = `${stars}/300`;
  $("bestStat").textContent = best.toLocaleString("it-IT");
  const resume = loadResume();
  $("continueButton").hidden = !resume || !resume.snapshot || resume.snapshot.status !== "playing";
  $("dailyDate").textContent = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function buildAreaTabs() {
  const tabs = $("areaTabs");
  tabs.innerHTML = "";
  AREAS.forEach((area, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "area-tab" + (index === app.currentArea ? " on" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", index === app.currentArea ? "true" : "false");
    button.textContent = `${index + 1}. ${area.name}`;
    button.addEventListener("click", () => {
      app.currentArea = index;
      buildAreaTabs();
      renderLevelGrid();
    });
    tabs.appendChild(button);
  });
}

function renderLevelGrid() {
  const grid = $("levelGrid");
  grid.innerHTML = "";
  for (let stage = 0; stage < LEVELS_PER_AREA; stage++) {
    const flat = app.currentArea * LEVELS_PER_AREA + stage + 1;
    const id = `${AREAS[app.currentArea].id}-${stage + 1}`;
    const stars = app.progress.stars[id] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-btn" + (flat > app.progress.unlocked ? " locked" : "") + (flat === app.progress.unlocked ? " current" : "");
    button.disabled = flat > app.progress.unlocked;
    button.setAttribute("aria-label", `Livello ${flat}${stars ? `, ${stars} stelle` : ""}${flat > app.progress.unlocked ? ", bloccato" : ""}`);
    button.innerHTML = `<span>${flat}</span><span class="mini-stars">${"★".repeat(stars)}</span>`;
    button.addEventListener("click", () => {
      closeDialogs();
      startLevel(makeLevel(app.currentArea, stage));
    });
    grid.appendChild(button);
  }
}

function openLevels() {
  app.currentArea = Math.floor((app.progress.unlocked - 1) / LEVELS_PER_AREA);
  app.currentArea = Math.max(0, Math.min(AREAS.length - 1, app.currentArea));
  buildAreaTabs();
  renderLevelGrid();
  openDialog("levelsDialog");
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
  app.dragging = null;
  app.saveTimer = 0;
  app.lastFrame = performance.now();
  app.renderer = new Renderer($("gameCanvas"), app.settings);
  hide($("menuScreen"));
  show($("gameScreen"));
  closeDialogs();
  app.paused = false;
  $("areaLabel").textContent = level.areaName.toUpperCase();
  $("levelLabel").textContent = level.id.startsWith("daily-") ? "Sfida del giorno" : `Livello ${level.number}`;
  $("boardStatus").textContent = "Trascina un blocco verso il collettore dello stesso simbolo.";
  updateHud();
  if (!snapshot) toast(`${level.areaName} · livello ${level.levelIndex + 1}`);
}

function startDaily() {
  app.dailyKey = todayKey();
  startLevel(dailyLevel(app.dailyKey));
}

function startNextLevel() {
  if (!app.currentLevel || app.currentLevel.id.startsWith("daily-")) {
    startDaily();
    return;
  }
  let area = app.currentLevel.areaIndex;
  let stage = app.currentLevel.levelIndex + 1;
  if (stage >= LEVELS_PER_AREA) { area++; stage = 0; }
  if (area >= AREAS.length) { returnToMenu(); return; }
  startLevel(makeLevel(area, stage));
}

function saveCurrent() {
  if (app.screen !== "game" || !app.game || !app.currentLevel) return;
  const state = app.game.getState();
  if (state.status === "playing") saveResume(app.currentLevel, app.game.snapshot());
  else clearResume();
}

function returnToMenu() {
  saveCurrent();
  app.screen = "menu";
  app.paused = false;
  app.dragging = null;
  hide($("gameScreen"));
  show($("menuScreen"));
  closeDialogs();
  updateMenu();
}

function updateHud() {
  if (!app.game) return;
  const state = app.game.getState();
  $("scoreValue").textContent = state.score.toLocaleString("it-IT");
  $("movesValue").textContent = state.moveLimit ? `${state.moves}/${state.moveLimit}` : String(state.moves);
  $("comboValue").textContent = `×${state.combo}`;
  $("progressValue").textContent = `${app.game.capturedCount()}/${state.totalPlanned}`;
  $("chargeValue").textContent = String(state.charge);
  $("undoButton").disabled = !app.game.canUndo() || state.status !== "playing";
  $("prismButton").disabled = state.charge <= 0 || state.status !== "playing";
}

function finishLevel() {
  if (!app.game || app.resultShown) return;
  const state = app.game.getState();
  if (state.status !== "won" && state.status !== "lost") return;
  app.resultShown = true;
  app.paused = true;
  const won = state.status === "won";
  if (won) {
    if (app.currentLevel.id.startsWith("daily-")) {
      app.progress.daily[app.dailyKey] = {
        stars: Math.max(app.progress.daily[app.dailyKey]?.stars || 0, state.stars),
        score: Math.max(app.progress.daily[app.dailyKey]?.score || 0, state.score)
      };
      saveProgress(app.progress);
    } else {
      recordWin(app.progress, app.currentLevel.id, state.stars, state.score);
    }
    clearResume();
  }
  $("resultEyebrow").textContent = won ? "TURNO COMPLETATO" : "MACCHINA FERMA";
  $("resultTitle").textContent = won ? "Fabbrica riaccesa" : "Riprova il turno";
  $("resultStars").textContent = won ? "★".repeat(state.stars) + "☆".repeat(3 - state.stars) : "—";
  $("resultScore").textContent = state.score.toLocaleString("it-IT");
  $("resultMoves").textContent = String(state.moves);
  $("resultCombo").textContent = String(state.bestCombo);
  $("resultNote").textContent = won
    ? (state.stars === 3 ? "Perfetto: ogni collettore, nessuna esitazione." : "La luce è tornata. Puoi migliorare il punteggio.")
    : (state.reason || "La griglia è piena. Libera i collettori e riprova.");
  $("nextButton").hidden = !won || app.currentLevel.id.startsWith("daily-") || app.currentLevel.number >= 100;
  openDialog("resultDialog");
  app.audio.play(won ? "win" : "lose");
  updateMenu();
}

function processEvents(events) {
  for (const event of events) {
    if (event.type === "capture") {
      app.audio.play("capture");
      if (event.color != null) app.renderer.burst(event.x, event.y, ["#ff5d73", "#53d6b5", "#58a6ff", "#ffd166", "#b58cff", "#ff8c42"][event.color]);
    } else if (event.type === "move") app.audio.play("move");
    else if (event.type === "prism") app.audio.play("prism");
    else if (event.type === "blackout") app.audio.play("blackout");
    else if (event.type === "power") app.audio.play("power");
    else if (event.type === "lift") app.audio.play("lift");
    else if (event.type === "spawn") app.audio.play("spawn");
    else if (event.type === "win" || event.type === "lose") finishLevel();
  }
}

function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - app.lastFrame) / 1000));
  app.lastFrame = now;
  if (app.game) {
    if (!app.paused && app.screen === "game" && app.game.getState().status === "playing") {
      app.game.update(dt);
      app.saveTimer += dt;
      if (app.saveTimer >= 4) { app.saveTimer = 0; saveCurrent(); }
    }
    app.renderer.draw(app.game.getState(), now, app.paused ? 0 : dt);
    processEvents(app.game.drainEvents());
    updateHud();
  }
  requestAnimationFrame(loop);
}

function selectedBlock() {
  return app.game ? app.game.blockById(app.game.getState().selected) : null;
}

function moveSelected(dx, dy) {
  if (!app.game || app.paused) return;
  const state = app.game.getState();
  if (state.selected == null) {
    const first = state.cells.find((cell) => cell && cell.kind === "block");
    if (first) state.selected = first.id;
  }
  const result = app.game.moveBlock(state.selected, dx, dy);
  if (!result.ok && result.reason === "blackout") toast("Questa zona è spenta.");
  if (result.captured || !app.game.blockById(state.selected)) state.selected = null;
  updateHud();
}

function cycleSelected(direction) {
  if (!app.game) return;
  const blocks = app.game.getState().cells.filter((cell) => cell && cell.kind === "block");
  if (!blocks.length) return;
  const current = blocks.findIndex((cell) => cell.id === app.game.getState().selected);
  const next = (current + direction + blocks.length) % blocks.length;
  app.game.getState().selected = blocks[next].id;
  $("boardStatus").textContent = blocks[next].gray ? "Blocco incolore: usa il prisma." : "Blocco selezionato. Usa le frecce o trascinalo.";
}

function showHint() {
  if (!app.game || app.paused) return;
  const hint = app.game.findHint();
  if (!hint) {
    toast("Nessun percorso libero: sposta prima un altro blocco.");
    return;
  }
  if (hint.type === "prism") {
    $("boardStatus").textContent = "Usa il prisma su un blocco grigio.";
    toast("Il prisma è carico.");
  } else {
    $("boardStatus").textContent = "Segui il percorso illuminato.";
  }
}

function usePrism() {
  if (!app.game || app.paused) return;
  const state = app.game.getState();
  let id = state.selected;
  let found = app.game.blockById(id);
  if (!found || !found.block.gray) {
    const gray = state.cells.find((cell) => cell && cell.kind === "block" && cell.gray);
    id = gray ? gray.id : null;
    found = app.game.blockById(id);
  }
  if (!found) { toast("Non ci sono blocchi incolori."); return; }
  const result = app.game.usePrism(id);
  if (!result.ok) toast(result.reason === "charge" ? "Ricarica il prisma con le combo." : "Il prisma non può essere usato ora.");
  else {
    state.selected = id;
    $("boardStatus").textContent = "Il blocco ha un colore. Portalo al collettore giusto.";
  }
  updateHud();
}

function pointerCell(event) {
  return app.renderer.pointerToCell(event.clientX, event.clientY);
}

function onPointerDown(event) {
  if (!app.game || app.paused || app.game.getState().status !== "playing") return;
  app.audio.unlock();
  const point = pointerCell(event);
  if (!point) return;
  const cell = app.game.getState().cells[point.y * app.game.getState().width + point.x];
  if (cell && cell.kind === "block") {
    app.game.getState().selected = cell.id;
    app.dragging = { id: cell.id, last: point };
    $("gameCanvas").setPointerCapture(event.pointerId);
    $("boardStatus").textContent = cell.gray ? "Blocco incolore: trascinalo o usa il prisma." : "Trascina attraverso le celle vuote.";
    event.preventDefault();
    return;
  }
  if (app.game.getState().selected != null) {
    const found = selectedBlock();
    if (found && Math.abs(found.x - point.x) + Math.abs(found.y - point.y) === 1) {
      const result = app.game.moveBlock(found.block.id, point.x - found.x, point.y - found.y);
      if (result.captured || !app.game.blockById(found.block.id)) app.game.getState().selected = null;
    }
  }
}

function onPointerMove(event) {
  if (!app.dragging || !app.game || app.paused) return;
  const target = pointerCell(event);
  if (!target) return;
  let guard = 0;
  while (app.dragging && guard++ < 20) {
    const last = app.dragging.last;
    if (last.x === target.x && last.y === target.y) break;
    let dx = Math.sign(target.x - last.x);
    let dy = Math.sign(target.y - last.y);
    if (dx && dy) dx = 0;
    const result = app.game.moveBlock(app.dragging.id, dx, dy);
    if (!result.ok) break;
    app.dragging.last = { x: last.x + dx, y: last.y + dy };
    if (result.captured || !app.game.blockById(app.dragging.id)) {
      app.game.getState().selected = null;
      app.dragging = null;
      break;
    }
  }
  event.preventDefault();
}

function onPointerUp() { app.dragging = null; }

function togglePause() {
  if (app.screen !== "game" || !app.game || app.game.getState().status !== "playing") return;
  if (app.paused) closeDialogs();
  else openDialog("pauseDialog");
}

function bindEvents() {
  $("playButton").addEventListener("click", () => {
    const flat = Math.min(100, app.progress.unlocked);
    const area = Math.floor((flat - 1) / LEVELS_PER_AREA);
    const stage = (flat - 1) % LEVELS_PER_AREA;
    startLevel(makeLevel(area, stage));
  });
  $("continueButton").addEventListener("click", () => {
    const resume = loadResume();
    if (resume && resume.level && resume.snapshot) startLevel(resume.level, resume.snapshot);
  });
  $("levelsButton").addEventListener("click", openLevels);
  $("dailyButton").addEventListener("click", startDaily);
  $("dailyCard").addEventListener("click", startDaily);
  $("brandButton").addEventListener("click", returnToMenu);
  $("backButton").addEventListener("click", returnToMenu);
  $("pauseButton").addEventListener("click", togglePause);
  $("resumeButton").addEventListener("click", closeDialogs);
  $("quitButton").addEventListener("click", returnToMenu);
  $("resultMenuButton").addEventListener("click", returnToMenu);
  $("replayButton").addEventListener("click", () => startLevel(app.currentLevel));
  $("nextButton").addEventListener("click", startNextLevel);
  $("undoButton").addEventListener("click", () => { if (app.game) { app.game.undo(); updateHud(); } });
  $("hintButton").addEventListener("click", showHint);
  $("prismButton").addEventListener("click", usePrism);
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
  $("darkSetting").addEventListener("change", (event) => {
    app.settings.showDark = event.target.checked;
    app.renderer.setSettings(app.settings);
    saveSettings(app.settings);
  });
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.close;
      hide($(id));
      if (app.screen === "game" && app.game && app.game.getState().status === "playing") app.paused = false;
    });
  });
  const canvas = $("gameCanvas");
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("keydown", (event) => {
    if (app.screen !== "game" || !app.game) return;
    const key = event.key.toLowerCase();
    if (key === "p" || key === "escape") { event.preventDefault(); togglePause(); }
    else if (key === "h") { event.preventDefault(); showHint(); }
    else if (key === "z") { event.preventDefault(); app.game.undo(); updateHud(); }
    else if (key === "[") { event.preventDefault(); cycleSelected(-1); }
    else if (key === "]") { event.preventDefault(); cycleSelected(1); }
    else if (key === "arrowleft") { event.preventDefault(); moveSelected(-1, 0); }
    else if (key === "arrowright") { event.preventDefault(); moveSelected(1, 0); }
    else if (key === "arrowup") { event.preventDefault(); moveSelected(0, -1); }
    else if (key === "arrowdown") { event.preventDefault(); moveSelected(0, 1); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveCurrent(); });
  window.addEventListener("beforeunload", saveCurrent);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => { /* offline is optional on unsupported browsers */ });
  }
}

function init() {
  $("motionSetting").checked = app.settings.reducedMotion;
  $("darkSetting").checked = app.settings.showDark;
  updateSoundButton();
  updateMenu();
  bindEvents();
  registerServiceWorker();
  window.UmbraSort = {
    get state() { return app; },
    get game() { return app.game; },
    startLevel,
    startDaily,
    makeLevel,
    returnToMenu,
    showHint,
    usePrism
  };
  requestAnimationFrame(loop);
}

init();
