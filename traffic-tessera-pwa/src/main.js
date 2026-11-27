import { DISTRICTS, LEVELS_PER_DISTRICT, VEHICLE_COLORS } from "./config.js";
import { dailyLevel, makeLevel, totalLevels } from "./levels.js";
import { exitClear, isDocked, isOneWay } from "./rules.js";
import { createGame } from "./engine.js";
import { Renderer } from "./render.js";
import { createAudio } from "./audio.js";
import { clearResume, loadProgress, loadResume, loadSettings, recordWin, resumeIsValid, saveResume, saveSettings } from "./storage.js";

const $ = id => document.getElementById(id);
const app = {
  screen: "menu",
  paused: false,
  progress: loadProgress(),
  settings: loadSettings(),
  audio: createAudio(loadSettings()),
  renderer: null,
  game: null,
  currentLevel: null,
  currentDistrict: 0,
  dailyKey: "",
  drag: null,
  lastFrame: 0,
  saveTimer: 0,
  resultShown: false,
  toastTimer: 0
};

app.renderer = new Renderer($("gameCanvas"), app.settings);

function show(element) { element.classList.remove("hidden"); }
function hide(element) { element.classList.add("hidden"); }

function toast(message, duration) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => element.classList.remove("show"), duration || 2200);
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function updateSoundButton() {
  const enabled = app.settings.sound;
  $("soundButton").textContent = enabled ? "♪" : "×";
  $("soundButton").setAttribute("aria-label", enabled ? "Disattiva audio" : "Attiva audio");
  $("soundSetting").checked = enabled;
}

function updateMenu() {
  const stars = Object.entries(app.progress.stars)
    .filter(([id]) => !id.startsWith("daily-"))
    .reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
  const completed = DISTRICTS.filter((district, districtIndex) =>
    Array.from({ length: LEVELS_PER_DISTRICT }, (_, stage) => app.progress.stars[`${district.id}-${stage + 1}`]).every(Boolean)).length;
  const moves = Object.values(app.progress.bestMoves).filter(Number.isFinite);
  $("districtsStat").textContent = `${completed}/${DISTRICTS.length}`;
  $("starsStat").textContent = `${stars}/${totalLevels() * 3}`;
  $("dispatchedStat").textContent = app.progress.dispatched.toLocaleString("it-IT");
  $("bestMovesStat").textContent = moves.length ? String(Math.min(...moves)) : "—";
  const resume = loadResume();
  $("continueButton").hidden = !resume || !resumeIsValid(resume.level, resume.snapshot);
  $("dailyDate").textContent = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function openDialog(id) {
  if (app.screen === "game" && app.game?.state.status === "playing") app.paused = true;
  show($(id));
}

function closeDialogs() {
  document.querySelectorAll(".overlay").forEach(element => element.classList.add("hidden"));
  if (app.screen === "game" && app.game?.state.status === "playing") app.paused = false;
}

function startLevel(level, snapshot) {
  app.currentLevel = level;
  app.game = createGame(level, snapshot);
  app.screen = "game";
  app.paused = false;
  app.resultShown = false;
  app.drag = null;
  app.saveTimer = 0;
  app.lastFrame = performance.now();
  app.renderer = new Renderer($("gameCanvas"), app.settings);
  hide($("menuScreen"));
  show($("gameScreen"));
  closeDialogs();
  app.paused = false;
  $("modeLabel").textContent = level.kind === "daily" ? "GIORNALIERO" : "DISTRETTO";
  $("levelLabel").textContent = level.kind === "daily" ? "Distretto del giorno" : level.name;
  $("boardStatus").textContent = "Trascina un veicolo o usa i tasti freccia.";
  updateHud();
  if (!snapshot) {
    if (level.kind === "campaign" && level.stage === 0 && level.districtIndex === 1) toast("Nuova regola: i terminali a doppio bordo richiedono di arrivare fino al bordo.", 3400);
    else if (level.kind === "campaign" && level.stage === 0 && level.districtIndex === 3) toast("Nuova regola: il punto bianco indica una corsia a senso unico.", 3400);
    else toast(level.kind === "daily" ? "Sfida giornaliera" : level.name);
  }
}

function playCurrent() {
  const flat = Math.min(totalLevels(), app.progress.unlocked);
  startLevel(makeLevel(Math.floor((flat - 1) / LEVELS_PER_DISTRICT), (flat - 1) % LEVELS_PER_DISTRICT));
}

function startDaily() {
  app.dailyKey = todayKey();
  startLevel(dailyLevel(app.dailyKey));
}

function startNextLevel() {
  if (!app.currentLevel || app.currentLevel.kind !== "campaign") return returnToMenu();
  let district = app.currentLevel.districtIndex;
  let stage = app.currentLevel.stage + 1;
  if (stage >= LEVELS_PER_DISTRICT) { district++; stage = 0; }
  if (district >= DISTRICTS.length) return returnToMenu();
  startLevel(makeLevel(district, stage));
}

function saveCurrent() {
  if (app.screen !== "game" || !app.game || !app.currentLevel) return;
  if (app.game.state.status === "playing") saveResume(app.currentLevel, app.game.snapshot());
  else clearResume();
}

function returnToMenu() {
  saveCurrent();
  app.screen = "menu";
  app.paused = false;
  app.drag = null;
  hide($("gameScreen"));
  show($("menuScreen"));
  closeDialogs();
  updateMenu();
}

function activeVehicles() {
  return app.game ? app.game.state.vehicles.filter(vehicle => vehicle.status !== "exited") : [];
}

function updateHud() {
  if (!app.game) return;
  const state = app.game.state;
  const playing = state.status === "playing";
  const remaining = activeVehicles().length;
  $("remainingValue").textContent = String(remaining);
  $("movesValue").textContent = String(state.moves);
  $("scoreValue").textContent = state.score.toLocaleString("it-IT");
  $("comboValue").textContent = `×${state.combo}`;
  $("undoValue").textContent = String(state.undosLeft);
  $("towValue").textContent = String(state.towsLeft);
  $("shuffleValue").textContent = String(state.shufflesLeft);
  const selected = app.game.activeVehicle();
  const selectedKind = selected?.length === 3 ? "Bus" : "Nav";
  const blockedSuffix = selected?.length === 3 ? " · bloccato" : " · bloccata";
  const terminal = selected ? app.currentLevel.terminals.find(item => item.id === selected.terminalId) : null;
  const restrictions = selected && isOneWay(selected, app.currentLevel) ? " · senso unico" : "";
  const docking = selected && terminal?.requiresDock && !isDocked(selected, app.currentLevel) ? " · da affiancare" : "";
  $("selectedVehicleLabel").textContent = selected
    ? `${selectedKind} ${VEHICLE_COLORS[selected.color].name}${exitClear(selected, state.vehicles, app.currentLevel.walls, app.currentLevel) ? "" : blockedSuffix}${restrictions}${docking}`
    : "Nessun veicolo";
  $("undoButton").disabled = !playing || state.undosLeft <= 0 || !state.history.length;
  $("towButton").disabled = !playing || state.towsLeft <= 0 || !selected;
  $("shuffleButton").disabled = !playing || state.shufflesLeft <= 0;
  $("hintButton").disabled = !playing;
  $("exitButton").disabled = !playing || !selected;
  $("previousButton").disabled = !playing || remaining === 0;
  $("nextButton").disabled = !playing || remaining === 0;
}

function finishLevel() {
  if (!app.game || app.resultShown) return;
  const state = app.game.state;
  if (state.status !== "won") return;
  app.resultShown = true;
  app.paused = true;
  recordWin(app.progress, app.currentLevel, state);
  clearResume();
  $("resultStars").textContent = "★".repeat(state.stars) + "☆".repeat(3 - state.stars);
  $("resultScore").textContent = state.score.toLocaleString("it-IT");
  $("resultMoves").textContent = String(state.moves);
  $("resultPar").textContent = String(state.par);
  $("resultNote").textContent = state.stars === 3 ? "Perfetto: ogni veicolo ha seguito la rotta giusta." : "Il distretto è libero. Puoi migliorare il record.";
  $("nextLevelButton").hidden = app.currentLevel.kind !== "campaign" || app.currentLevel.number >= totalLevels();
  openDialog("resultDialog");
  app.audio.play("win");
  updateMenu();
}

function processEvents(events) {
  for (const event of events) {
    if (event.type === "move") app.audio.play("move");
    else if (event.type === "exit" || event.type === "tow") {
      app.audio.play(event.type);
      if (event.vehicle) app.renderer.burst(event.vehicle, app.game.state);
      if (event.type === "tow") toast("Veicolo rimosso con il carro attrezzi.");
    } else if (event.type === "blocked") {
      app.audio.play("blocked");
      const vehicle = app.game.state.vehicles.find(item => item.id === event.id);
      const terminal = vehicle ? app.currentLevel.terminals.find(item => item.id === vehicle.terminalId) : null;
      if (vehicle && terminal?.requiresDock && !isDocked(vehicle, app.currentLevel)) {
        $("boardStatus").textContent = "Terminale di precisione: porta il veicolo fino al bordo prima di uscire.";
      } else if (vehicle && terminal?.oneWay) {
        $("boardStatus").textContent = "Corsia a senso unico: puoi muovere il veicolo solo verso il terminale.";
      } else {
        $("boardStatus").textContent = "Corsia bloccata: sposta prima il veicolo che ostruisce il passaggio.";
      }
    } else if (event.type === "undo") app.audio.play("undo");
    else if (event.type === "shuffle") { app.audio.play("shuffle"); toast("Configurazione alternativa caricata."); }
    else if (event.type === "hint") {
      const move = event.move;
      app.renderer.setHint(move);
      $("boardStatus").textContent = move.type === "exit" ? "Il veicolo evidenziato può uscire." : "Segui il veicolo evidenziato.";
    } else if (event.type === "win") finishLevel();
  }
}

function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - app.lastFrame) / 1000));
  app.lastFrame = now;
  if (app.game) {
    if (!app.paused && app.screen === "game" && app.game.state.status === "playing") {
      app.saveTimer += dt;
      if (app.saveTimer >= 4) { app.saveTimer = 0; saveCurrent(); }
    }
    app.renderer.draw(app.game.state, app.currentLevel, now, app.paused ? 0 : dt);
    processEvents(app.game.drainEvents());
    updateHud();
  }
  requestAnimationFrame(loop);
}

function cycleSelected(direction) {
  if (!app.game || app.paused) return;
  const vehicles = activeVehicles();
  if (!vehicles.length) return;
  const index = vehicles.findIndex(vehicle => vehicle.id === app.game.state.selected);
  const next = vehicles[(index + direction + vehicles.length) % vehicles.length];
  app.game.select(next.id);
  updateHud();
}

function moveSelected(dx, dy) {
  if (!app.game || app.paused) return;
  const selected = app.game.activeVehicle();
  if (!selected) return;
  app.game.moveVehicle(selected.id, selected.x + dx, selected.y + dy);
  updateHud();
}

function exitSelected() {
  if (!app.game || app.paused) return;
  const selected = app.game.activeVehicle();
  if (selected) app.game.exitVehicle(selected.id);
  updateHud();
}

function showHint() {
  if (!app.game || app.paused) return;
  const move = app.game.hint();
  if (!move) return toast("Nessun suggerimento disponibile.");
  app.renderer.setHint(move);
  const vehicle = app.game.activeVehicle(move.id);
  $("boardStatus").textContent = move.type === "exit"
    ? `${vehicle.length === 3 ? "Bus" : "Nav"} ${VEHICLE_COLORS[vehicle.color].name}: trascina oltre il terminale.`
    : `${vehicle.length === 3 ? "Bus" : "Nav"} ${VEHICLE_COLORS[vehicle.color].name}: spostati nella posizione evidenziata.`;
  updateHud();
}

function onPointerDown(event) {
  if (!app.game || app.paused || app.game.state.status !== "playing") return;
  app.audio.unlock();
  const vehicle = app.renderer.vehicleAt(event.clientX, event.clientY, app.game.state);
  if (!vehicle) return;
  const cell = app.renderer.pointToCell(event.clientX, event.clientY, app.game.state.size);
  app.game.select(vehicle.id);
  app.drag = {
    id: vehicle.id,
    pointerId: event.pointerId,
    grabX: cell.x - vehicle.x,
    grabY: cell.y - vehicle.y,
    lastTarget: `${vehicle.x},${vehicle.y}`,
    exitTried: false
  };
  $("gameCanvas").setPointerCapture(event.pointerId);
  updateHud();
  event.preventDefault();
}

function onPointerMove(event) {
  if (!app.drag || !app.game || app.paused) return;
  const vehicle = app.game.activeVehicle(app.drag.id);
  if (!vehicle) return;
  const terminal = app.currentLevel.terminals.find(item => item.id === vehicle.terminalId);
  const rect = $("gameCanvas").getBoundingClientRect();
  const layout = app.renderer.layout;
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const outside = terminal && (
    (terminal.side === "right" && localX > layout.x + layout.board + 8)
    || (terminal.side === "left" && localX < layout.x - 8)
    || (terminal.side === "bottom" && localY > layout.y + layout.board + 8)
    || (terminal.side === "top" && localY < layout.y - 8)
  );
  if (outside && !app.drag.exitTried) {
    app.drag.exitTried = true;
    app.game.exitVehicle(vehicle.id);
    updateHud();
    event.preventDefault();
    return;
  }
  const cell = app.renderer.pointToCell(event.clientX, event.clientY, app.game.state.size);
  if (!cell) return;
  const x = cell.x - app.drag.grabX;
  const y = cell.y - app.drag.grabY;
  const target = `${x},${y}`;
  if (target !== app.drag.lastTarget) {
    app.drag.lastTarget = target;
    app.game.moveVehicle(vehicle.id, x, y);
    updateHud();
  }
  event.preventDefault();
}

function onPointerUp(event) {
  if (app.drag && $("gameCanvas").hasPointerCapture?.(event.pointerId)) $("gameCanvas").releasePointerCapture(event.pointerId);
  app.drag = null;
}

function buildDistrictTabs() {
  const tabs = $("areaTabs");
  tabs.innerHTML = "";
  DISTRICTS.forEach((district, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "area-tab" + (index === app.currentDistrict ? " on" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", index === app.currentDistrict ? "true" : "false");
    button.textContent = `${index + 1}. ${district.name}`;
    button.addEventListener("click", () => { app.currentDistrict = index; buildDistrictTabs(); renderLevels(); });
    tabs.appendChild(button);
  });
}

function renderLevels() {
  const grid = $("levelGrid");
  grid.innerHTML = "";
  for (let stage = 0; stage < LEVELS_PER_DISTRICT; stage++) {
    const flat = app.currentDistrict * LEVELS_PER_DISTRICT + stage + 1;
    const id = `${DISTRICTS[app.currentDistrict].id}-${stage + 1}`;
    const stars = app.progress.stars[id] || 0;
    const locked = flat > app.progress.unlocked;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-btn" + (locked ? " locked" : "");
    button.disabled = locked;
    button.setAttribute("aria-label", `Livello ${flat}${locked ? ", bloccato" : ""}`);
    const number = document.createElement("span");
    number.textContent = String(flat);
    const starRow = document.createElement("span");
    starRow.className = "mini-stars";
    starRow.textContent = "★".repeat(stars);
    button.append(number, starRow);
    if (!locked) button.addEventListener("click", () => { closeDialogs(); startLevel(makeLevel(app.currentDistrict, stage)); });
    grid.appendChild(button);
  }
}

function openDistricts() {
  app.currentDistrict = Math.floor((app.progress.unlocked - 1) / LEVELS_PER_DISTRICT);
  app.currentDistrict = Math.max(0, Math.min(DISTRICTS.length - 1, app.currentDistrict));
  buildDistrictTabs();
  renderLevels();
  openDialog("districtsDialog");
}

function togglePause() {
  if (app.screen !== "game" || !app.game || app.game.state.status !== "playing") return;
  if (app.paused) closeDialogs();
  else openDialog("pauseDialog");
}

function bindEvents() {
  $("playButton").addEventListener("click", playCurrent);
  $("dailyButton").addEventListener("click", startDaily);
  $("dailyCard").addEventListener("click", startDaily);
  $("districtsButton").addEventListener("click", openDistricts);
  $("continueButton").addEventListener("click", () => {
    const resume = loadResume();
    if (resume?.level && resume.snapshot && resumeIsValid(resume.level, resume.snapshot)) startLevel(resume.level, resume.snapshot);
    else { clearResume(); updateMenu(); toast("Salvataggio non compatibile."); }
  });
  $("brandButton").addEventListener("click", returnToMenu);
  $("backButton").addEventListener("click", returnToMenu);
  $("pauseButton").addEventListener("click", togglePause);
  $("resumeButton").addEventListener("click", closeDialogs);
  $("quitButton").addEventListener("click", returnToMenu);
  $("resultMenuButton").addEventListener("click", returnToMenu);
  $("replayButton").addEventListener("click", () => startLevel(app.currentLevel));
  $("nextLevelButton").addEventListener("click", startNextLevel);
  $("previousButton").addEventListener("click", () => cycleSelected(-1));
  $("nextButton").addEventListener("click", () => cycleSelected(1));
  $("exitButton").addEventListener("click", exitSelected);
  $("undoButton").addEventListener("click", () => { app.game?.undo(); updateHud(); });
  $("towButton").addEventListener("click", () => { app.game?.tow(); updateHud(); });
  $("shuffleButton").addEventListener("click", () => { app.game?.shuffle(); updateHud(); });
  $("hintButton").addEventListener("click", showHint);
  $("settingsButton").addEventListener("click", () => openDialog("settingsDialog"));
  $("howButton").addEventListener("click", () => { hide($("settingsDialog")); openDialog("howDialog"); });
  $("soundButton").addEventListener("click", () => {
    app.settings.sound = !app.settings.sound;
    app.audio.setEnabled(app.settings.sound);
    saveSettings(app.settings);
    updateSoundButton();
  });
  $("soundSetting").addEventListener("change", event => {
    app.settings.sound = event.target.checked;
    app.audio.setEnabled(app.settings.sound);
    saveSettings(app.settings);
    updateSoundButton();
  });
  $("motionSetting").addEventListener("change", event => {
    app.settings.reducedMotion = event.target.checked;
    app.renderer.setSettings(app.settings);
    saveSettings(app.settings);
  });
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => {
    hide($(button.dataset.close));
    if (app.screen === "game" && app.game?.state.status === "playing") app.paused = false;
  }));
  const canvas = $("gameCanvas");
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", event => event.preventDefault());
  window.addEventListener("keydown", event => {
    if (app.screen !== "game" || !app.game) return;
    const key = event.key.toLowerCase();
    if (key === "p" || key === "escape") { event.preventDefault(); togglePause(); return; }
    if (app.paused || app.game.state.status !== "playing") return;
    if ((key === "enter" || key === " ") && event.target.closest("button,input")) return;
    if (key === "arrowleft") { event.preventDefault(); moveSelected(-1, 0); }
    else if (key === "arrowright") { event.preventDefault(); moveSelected(1, 0); }
    else if (key === "arrowup") { event.preventDefault(); moveSelected(0, -1); }
    else if (key === "arrowdown") { event.preventDefault(); moveSelected(0, 1); }
    else if (key === "enter" || key === " ") { event.preventDefault(); exitSelected(); }
    else if (key === "q") { event.preventDefault(); cycleSelected(-1); }
    else if (key === "e") { event.preventDefault(); cycleSelected(1); }
    else if (key === "u") { event.preventDefault(); app.game.undo(); updateHud(); }
    else if (key === "h") { event.preventDefault(); showHint(); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveCurrent(); });
  window.addEventListener("beforeunload", saveCurrent);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function init() {
  $("motionSetting").checked = app.settings.reducedMotion;
  updateSoundButton();
  updateMenu();
  bindEvents();
  registerServiceWorker();
  window.TrafficTessera = {
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
