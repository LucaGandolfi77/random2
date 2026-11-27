import { CHALLENGE_LEVELS } from "./config.js";
import { dailyLevel, endlessLevel, makeChallengeLevel } from "./levels.js";
import { createGame } from "./engine.js";
import { Renderer } from "./render.js";
import { createAudio } from "./audio.js";
import {
  clearResume, loadProgress, loadResume, loadSettings, recordResult, resumeIsValid,
  saveProgress, saveResume, saveSettings
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
  dailyKey: "",
  drag: null,
  ghost: null,
  anchor: { x: 3, y: 3 },
  lastFrame: 0,
  saveTimer: 0,
  resultShown: false,
  toastTimer: 0
};

app.audio = createAudio(app.settings);
app.renderer = new Renderer($("boardCanvas"), $("trayCanvas"), app.settings);

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

function updateSoundButton() {
  const on = app.settings.sound;
  $("soundButton").textContent = on ? "♪" : "×";
  $("soundButton").setAttribute("aria-label", on ? "Disattiva audio" : "Attiva audio");
  $("soundSetting").checked = on;
}

function updateMenu() {
  const stars = Object.values(app.progress.challenges).reduce((sum, entry) => sum + (Number(entry?.stars) || 0), 0);
  $("bestStat").textContent = app.progress.best.toLocaleString("it-IT");
  $("gamesStat").textContent = String(app.progress.games);
  $("winsStat").textContent = String(app.progress.wins);
  $("challengeStarsStat").textContent = `${stars}/${CHALLENGE_LEVELS * 3}`;
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
  app.drag = null;
  app.ghost = null;
  app.anchor = { x: 3, y: 3 };
  app.saveTimer = 0;
  app.lastFrame = performance.now();
  app.renderer = new Renderer($("boardCanvas"), $("trayCanvas"), app.settings);
  hide($("menuScreen"));
  show($("gameScreen"));
  closeDialogs();
  app.paused = false;
  $("modeLabel").textContent = level.kind === "daily" ? "GIORNALIERO" : level.kind === "challenge" ? "SFIDA" : "ENDLESS";
  $("levelLabel").textContent = level.name;
  $("boardStatus").textContent = "Trascina un pezzo dal vassoio alla griglia.";
  updateHud();
  if (!snapshot) toast(level.kind === "daily" ? "Sfida del giorno" : level.kind === "challenge" ? level.name : "Nuova partita");
}

function startEndless() { startLevel(endlessLevel()); }

function startDaily() {
  app.dailyKey = todayKey();
  startLevel(dailyLevel(app.dailyKey));
}

function startChallenge(index) { startLevel(makeChallengeLevel(index)); }

function startNextChallenge() {
  if (!app.currentLevel || app.currentLevel.kind !== "challenge") { returnToMenu(); return; }
  const next = app.currentLevel.number;
  if (next >= CHALLENGE_LEVELS) { returnToMenu(); return; }
  startChallenge(next);
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
  app.drag = null;
  app.ghost = null;
  hide($("gameScreen"));
  show($("menuScreen"));
  closeDialogs();
  updateMenu();
}

function updateHud() {
  if (!app.game) return;
  const state = app.game.getState();
  const playing = state.status === "playing";
  $("scoreValue").textContent = state.score.toLocaleString("it-IT");
  $("comboValue").textContent = `×${state.combo}`;
  $("linesValue").textContent = String(state.lines);
  $("objectiveValue").textContent = state.objective ? `${state.objectiveProgress}/${state.objective.target}` : "—";
  $("objectiveLabel").textContent = state.objective ? state.objective.label : "Senza limite";
  $("undoValue").textContent = String(state.undosLeft);
  $("undoButton").disabled = state.undosLeft <= 0 || !playing;
  $("hintButton").disabled = !playing;
  $("rotateButton").disabled = !playing || !state.tray[state.selected];
}

function finishLevel() {
  if (!app.game || app.resultShown) return;
  const state = app.game.getState();
  if (state.status !== "won" && state.status !== "lost") return;
  app.resultShown = true;
  app.paused = true;
  const won = state.status === "won";
  recordResult(app.progress, app.currentLevel, state);
  clearResume();
  $("resultEyebrow").textContent = won ? "OBIETTIVO RAGGIUNTO" : "GRIGLIA BLOCCATA";
  $("resultTitle").textContent = won ? "Prisma completato" : "Nessuno spazio";
  $("resultScore").textContent = state.score.toLocaleString("it-IT");
  $("resultLines").textContent = String(state.lines);
  $("resultPieces").textContent = String(state.pieces);
  const stars = won ? (app.currentLevel.kind === "endless" ? Math.min(3, 1 + Math.floor(state.lines / 4)) : app.progress.challenges[app.currentLevel.id]?.stars || app.progress.daily[app.currentLevel.id]?.stars || 1) : 0;
  $("resultStars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  $("resultNote").textContent = won ? "La griglia è tornata limpida." : "Riprova: un diverso ordine di pezzi può aprire nuove linee.";
  $("nextButton").hidden = !won || app.currentLevel.kind !== "challenge" || app.currentLevel.number >= CHALLENGE_LEVELS;
  openDialog("resultDialog");
  app.audio.play(won ? "win" : "lose");
  updateMenu();
}

function processEvents(events) {
  for (const event of events) {
    if (event.type === "place") app.audio.play("place");
    else if (event.type === "rotate") app.audio.play("rotate");
    else if (event.type === "clear") {
      app.audio.play("clear");
      app.renderer.burst(event.cells, ["#f4a7b5", "#a8e6cf", "#a9c9f5", "#f7e3a1", "#d5b9ec", "#f3c3a5"][event.color]);
    } else if (event.type === "undo") app.audio.play("undo");
    else if (event.type === "win" || event.type === "lose") finishLevel();
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
    app.renderer.draw(app.game.getState(), app.ghost, now, app.paused ? 0 : dt);
    processEvents(app.game.drainEvents());
    updateHud();
  }
  requestAnimationFrame(loop);
}

function selectPiece(index) {
  if (!app.game || app.paused) return;
  if (app.game.select(index)) {
    app.ghost = null;
    app.anchor = { x: 3, y: 3 };
    updateHud();
  }
}

function rotatePiece() {
  if (!app.game || app.paused) return;
  app.game.rotate();
  app.ghost = null;
  updateHud();
}

function undo() {
  if (!app.game || app.paused) return;
  app.game.undo();
  app.ghost = null;
  updateHud();
}

function hint() {
  if (!app.game || app.paused) return;
  const result = app.game.hint();
  if (!result) { toast("Nessun pezzo può essere posizionato."); return; }
  app.anchor = { x: result.x, y: result.y };
  app.ghost = { index: result.index, x: result.x, y: result.y, rotation: result.rotation, valid: true };
  $("boardStatus").textContent = "Posizionamento suggerito pronto.";
}

function placeAt(x, y, rotation) {
  if (!app.game || app.paused) return false;
  const state = app.game.getState();
  const index = state.selected;
  const piece = state.tray[index];
  if (!piece) return false;
  const useRotation = rotation == null ? piece.rotation : rotation;
  const result = app.game.place(index, x, y, useRotation);
  if (!result.ok) {
    if (result.reason === "blocked") toast("Qui il pezzo non entra.");
    return false;
  }
  app.ghost = null;
  app.anchor = { x: 3, y: 3 };
  updateHud();
  return true;
}

function updateGhost(clientX, clientY) {
  if (!app.drag || !app.game) { app.ghost = null; return; }
  const point = app.renderer.boardPointer(clientX, clientY);
  if (!point) { app.ghost = null; return; }
  const state = app.game.getState();
  const piece = state.tray[app.drag.index];
  if (!piece) { app.ghost = null; return; }
  app.ghost = {
    index: app.drag.index,
    x: point.x,
    y: point.y,
    rotation: piece.rotation,
    valid: app.game.canPlaceAt(piece, point.x, point.y, piece.rotation)
  };
}

function onTrayPointerDown(event) {
  if (!app.game || app.paused || app.game.getState().status !== "playing") return;
  const index = app.renderer.trayPointer(event.clientX, event.clientY);
  if (index == null || !app.game.getState().tray[index]) return;
  app.audio.unlock();
  app.game.select(index);
  app.drag = { index, pointerId: event.pointerId };
  app.ghost = null;
  $("trayCanvas").setPointerCapture(event.pointerId);
  $("boardStatus").textContent = "Trascina sulla griglia oppure tocca una cella.";
  event.preventDefault();
}

function onBoardPointerDown(event) {
  if (!app.game || app.paused || app.game.getState().status !== "playing") return;
  app.audio.unlock();
  const point = app.renderer.boardPointer(event.clientX, event.clientY);
  if (!point) return;
  placeAt(point.x, point.y);
}

function onPointerMove(event) {
  if (!app.drag) return;
  updateGhost(event.clientX, event.clientY);
  event.preventDefault();
}

function onPointerUp(event) {
  if (!app.drag) return;
  updateGhost(event.clientX, event.clientY);
  if (app.ghost && app.ghost.valid) placeAt(app.ghost.x, app.ghost.y, app.ghost.rotation);
  app.drag = null;
  app.ghost = null;
}

function togglePause() {
  if (app.screen !== "game" || !app.game || app.game.getState().status !== "playing") return;
  if (app.paused) closeDialogs();
  else openDialog("pauseDialog");
}

function renderChallenges() {
  const grid = $("challengeGrid");
  grid.innerHTML = "";
  for (let index = 0; index < CHALLENGE_LEVELS; index++) {
    const level = makeChallengeLevel(index);
    const record = app.progress.challenges[level.id];
    const locked = index > 0 && !app.progress.challenges[`challenge-${index}`];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-btn" + (locked ? " locked" : "");
    button.disabled = locked;
    button.setAttribute("aria-label", `${level.name}${locked ? ", bloccata" : ""}`);
    const title = document.createElement("span");
    title.textContent = String(index + 1);
    const stars = document.createElement("span");
    stars.className = "mini-stars";
    stars.textContent = "★".repeat(record?.stars || 0);
    button.append(title, stars);
    if (!locked) button.addEventListener("click", () => { closeDialogs(); startChallenge(index); });
    grid.appendChild(button);
  }
}

function openChallenges() {
  renderChallenges();
  openDialog("challengesDialog");
}

function bindEvents() {
  $("playButton").addEventListener("click", startEndless);
  $("dailyButton").addEventListener("click", startDaily);
  $("dailyCard").addEventListener("click", startDaily);
  $("challengesButton").addEventListener("click", openChallenges);
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
  $("nextButton").addEventListener("click", startNextChallenge);
  $("rotateButton").addEventListener("click", rotatePiece);
  $("undoButton").addEventListener("click", undo);
  $("hintButton").addEventListener("click", hint);
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
  $("trayCanvas").addEventListener("pointerdown", onTrayPointerDown);
  $("boardCanvas").addEventListener("pointerdown", onBoardPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", () => { app.drag = null; app.ghost = null; });
  window.addEventListener("keydown", (event) => {
    if (app.screen !== "game" || !app.game) return;
    const key = event.key.toLowerCase();
    if (key === "p" || key === "escape") { event.preventDefault(); togglePause(); }
    else if (key === "r") { event.preventDefault(); rotatePiece(); }
    else if (key === "u") { event.preventDefault(); undo(); }
    else if (key === "h") { event.preventDefault(); hint(); }
    else if (key === "1") { event.preventDefault(); selectPiece(0); }
    else if (key === "2") { event.preventDefault(); selectPiece(1); }
    else if (key === "3") { event.preventDefault(); selectPiece(2); }
    else if (key === "arrowleft") { event.preventDefault(); app.anchor.x = Math.max(0, app.anchor.x - 1); }
    else if (key === "arrowright") { event.preventDefault(); app.anchor.x = Math.min(7, app.anchor.x + 1); }
    else if (key === "arrowup") { event.preventDefault(); app.anchor.y = Math.max(0, app.anchor.y - 1); }
    else if (key === "arrowdown") { event.preventDefault(); app.anchor.y = Math.min(7, app.anchor.y + 1); }
    else if (key === "enter") { event.preventDefault(); placeAt(app.anchor.x, app.anchor.y); }
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
  window.PrismBlocks = {
    get state() { return app; },
    get game() { return app.game; },
    startLevel,
    startEndless,
    startDaily,
    startChallenge,
    returnToMenu,
    selectPiece,
    rotatePiece,
    placeAt,
    undo,
    hint,
    makeChallengeLevel
  };
  requestAnimationFrame(loop);
}

init();
