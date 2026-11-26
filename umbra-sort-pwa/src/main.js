import { ABILITIES, AREAS, CAMPAIGN_LEVELS, COLORS, LEVELS_PER_AREA, PIECES } from "./config.js";
import { dailyLevel, makeLevel } from "./levels.js";
import { SPECIAL_LEVELS, makeSpecialLevel } from "./special-levels.js";
import { BOSS_LEVELS, makeBossLevel } from "./boss-levels.js";
import {
  abilityLevel, bossUnlockState, equipPiece, equippedPerk, gearMultiplier, requirementLabel,
  specialUnlockState, totalStars, unlockPiece, upgradeAbility, upgradeAbilityCost
} from "./progression.js";
import { createGame } from "./engine.js";
import { Renderer } from "./render.js";
import { createAudio } from "./audio.js";
import {
  clearResume, loadProgress, loadResume, loadSettings, recordWin, resumeIsValid, saveProgress,
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
  levelMode: "campaign",
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
  const stars = totalStars(app.progress);
  const best = Object.values(app.progress.best).reduce((max, n) => Math.max(max, Number(n) || 0), 0);
  const piece = equippedPerk(app.progress);
  $("unlockedStat").textContent = `${app.progress.unlocked}/${CAMPAIGN_LEVELS}`;
  $("starsStat").textContent = String(stars);
  $("gearsStat").textContent = String(app.progress.gears);
  $("pieceStat").textContent = piece.name;
  $("bestStat").textContent = best.toLocaleString("it-IT");
  const resume = loadResume();
  const validResume = !!resume && resumeIsValid(resume.level, resume.snapshot);
  $("continueButton").hidden = !validResume;
  $("dailyDate").textContent = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function buildModeTabs() {
  const tabs = $("levelModeTabs");
  tabs.innerHTML = "";
  [["campaign", "Campagna"], ["special", "Speciali"], ["boss", "Boss"]].forEach(([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "area-tab" + (app.levelMode === id ? " on" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", app.levelMode === id ? "true" : "false");
    button.textContent = label;
    button.addEventListener("click", () => {
      app.levelMode = id;
      buildModeTabs();
      buildAreaTabs();
      renderLevelGrid();
    });
    tabs.appendChild(button);
  });
}

function buildAreaTabs() {
  const tabs = $("areaTabs");
  tabs.innerHTML = "";
  tabs.classList.toggle("hidden", app.levelMode !== "campaign");
  if (app.levelMode !== "campaign") return;
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

function levelButton({ label, stars, locked, current, note, onClick, aria }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "level-btn" + (locked ? " locked" : "") + (current ? " current" : "");
  button.disabled = locked;
  button.setAttribute("aria-label", aria || label);
  const title = document.createElement("span");
  title.textContent = label;
  button.appendChild(title);
  if (stars) {
    const starRow = document.createElement("span");
    starRow.className = "mini-stars";
    starRow.textContent = "★".repeat(stars);
    button.appendChild(starRow);
  }
  if (note) {
    const hint = document.createElement("small");
    hint.className = "lock-note";
    hint.textContent = note;
    button.appendChild(hint);
  }
  button.addEventListener("click", onClick);
  return button;
}

function renderLevelGrid() {
  const grid = $("levelGrid");
  grid.innerHTML = "";
  grid.classList.toggle("named-grid", app.levelMode !== "campaign");
  if (app.levelMode === "campaign") {
    for (let stage = 0; stage < LEVELS_PER_AREA; stage++) {
      const flat = app.currentArea * LEVELS_PER_AREA + stage + 1;
      const id = `${AREAS[app.currentArea].id}-${stage + 1}`;
      const stars = app.progress.stars[id] || 0;
      const locked = flat > app.progress.unlocked;
      grid.appendChild(levelButton({
        label: String(flat), stars, locked, current: flat === app.progress.unlocked,
        onClick: () => { closeDialogs(); startLevel(makeLevel(app.currentArea, stage)); },
        aria: `Livello ${flat}${stars ? `, ${stars} stelle` : ""}${locked ? ", bloccato" : ""}`
      }));
    }
    return;
  }

  if (app.levelMode === "special") {
    SPECIAL_LEVELS.forEach((definition, index) => {
      const unlock = specialUnlockState(app.progress, index);
      const stars = app.progress.stars[definition.id] || 0;
      grid.appendChild(levelButton({
        label: definition.name, stars, locked: !unlock.unlocked, note: unlock.unlocked ? "" : unlock.label,
        onClick: () => { closeDialogs(); startLevel(makeSpecialLevel(index)); },
        aria: `${definition.name}${stars ? `, ${stars} stelle` : ""}${unlock.unlocked ? "" : `, richiede ${unlock.label}`}`
      }));
    });
    return;
  }

  BOSS_LEVELS.forEach((definition, index) => {
    const unlock = bossUnlockState(app.progress, index);
    const stars = app.progress.stars[definition.id] || 0;
    grid.appendChild(levelButton({
      label: definition.name, stars, locked: !unlock.unlocked, note: unlock.unlocked ? "" : unlock.label,
      onClick: () => { closeDialogs(); startLevel(makeBossLevel(index)); },
      aria: `Boss ${definition.name}${stars ? `, ${stars} stelle` : ""}${unlock.unlocked ? "" : `, richiede ${unlock.label}`}`
    }));
  });
}

function openLevels() {
  app.levelMode = "campaign";
  app.currentArea = Math.floor((app.progress.unlocked - 1) / LEVELS_PER_AREA);
  app.currentArea = Math.max(0, Math.min(AREAS.length - 1, app.currentArea));
  buildModeTabs();
  buildAreaTabs();
  renderLevelGrid();
  openDialog("levelsDialog");
}

function renderPieces() {
  const grid = $("pieceGrid");
  grid.innerHTML = "";
  $("gearsWallet").textContent = String(app.progress.gears);
  for (const piece of PIECES) {
    const owned = app.progress.pieces.includes(piece.id);
    const equipped = app.progress.equippedPiece === piece.id;
    const card = document.createElement("div");
    card.className = "piece-card" + (equipped ? " equipped" : "");
    const icon = document.createElement("span");
    icon.className = "piece-icon";
    icon.style.color = piece.color;
    icon.textContent = piece.icon;
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = piece.name;
    const description = document.createElement("small");
    description.textContent = piece.description;
    copy.append(name, description);
    const action = document.createElement("button");
    action.type = "button";
    action.className = "piece-action";
    action.textContent = equipped ? "Equipaggiata" : owned ? "Equipaggia" : `Sblocca · ${piece.cost} ⚙`;
    action.disabled = equipped || (!owned && app.progress.gears < piece.cost);
    action.addEventListener("click", () => {
      if (!owned) {
        const result = unlockPiece(app.progress, piece.id);
        if (!result.ok) toast(result.reason === "gears" ? "Ingranaggi insufficienti." : "Pedina già posseduta.");
      } else {
        equipPiece(app.progress, piece.id);
      }
      saveProgress(app.progress);
      renderPieces();
      updateMenu();
    });
    copy.appendChild(action);
    card.append(icon, copy);
    grid.appendChild(card);
  }

  const upgrades = $("abilityUpgrades");
  upgrades.innerHTML = "";
  for (const [id, ability] of Object.entries(ABILITIES)) {
    const level = abilityLevel(app.progress, id);
    const cost = upgradeAbilityCost(app.progress, id);
    const row = document.createElement("div");
    row.className = "upgrade-row";
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${ability.icon} ${ability.name}`;
    const detail = document.createElement("small");
    detail.textContent = `Livello ${level}/3`;
    copy.append(name, detail);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "piece-action";
    button.textContent = level >= 3 ? "Massimo" : `Migliora · ${cost} ⚙`;
    button.disabled = level >= 3 || app.progress.gears < cost;
    button.addEventListener("click", () => {
      const result = upgradeAbility(app.progress, id);
      if (!result.ok) toast(result.reason === "gears" ? "Ingranaggi insufficienti." : "Potenziamento non disponibile.");
      saveProgress(app.progress);
      renderPieces();
      updateMenu();
    });
    row.append(copy, button);
    upgrades.appendChild(row);
  }
}

function openPieces() {
  renderPieces();
  openDialog("piecesDialog");
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
  const runtimeLevel = structuredClone(level);
  runtimeLevel.loadout = { piece: app.progress.equippedPiece, abilities: app.progress.abilities };
  app.game = createGame(runtimeLevel, snapshot);
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
  $("areaLabel").textContent = level.kind === "boss" ? "BOSS" : level.kind === "special" ? "SPECIALE" : level.areaName.toUpperCase();
  $("levelLabel").textContent = level.kind === "daily" ? "Sfida del giorno" : level.kind === "boss" || level.kind === "special" ? level.name : `Livello ${level.number}`;
  $("boardStatus").textContent = "Trascina un blocco verso il collettore dello stesso simbolo.";
  $("bossBar").classList.toggle("hidden", level.kind !== "boss");
  if (level.kind === "boss") {
    $("bossName").textContent = level.name.toUpperCase();
    $("bossPhase").textContent = "FASE 1";
  }
  updateHud();
  if (!snapshot) toast(level.kind === "boss" ? `Boss · ${level.name}` : level.kind === "special" ? level.name : `${level.areaName} · livello ${level.levelIndex + 1}`);
}

function startDaily() {
  app.dailyKey = todayKey();
  startLevel(dailyLevel(app.dailyKey));
}

function startNextLevel() {
  if (!app.currentLevel || app.currentLevel.kind !== "campaign") { returnToMenu(); return; }
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
  const playing = state.status === "playing";
  $("scoreValue").textContent = state.score.toLocaleString("it-IT");
  $("movesValue").textContent = state.moveLimit ? `${state.moves}/${state.moveLimit}` : String(state.moves);
  $("comboValue").textContent = `×${state.combo}`;
  $("progressValue").textContent = `${app.game.capturedCount()}/${state.totalPlanned}`;
  $("chargeValue").textContent = String(state.charge);
  $("pulseCharge").textContent = String(state.abilities.pulse.charges);
  $("pushCharge").textContent = String(state.abilities.push.charges);
  $("scanCharge").textContent = String(state.abilities.scan.charges);
  $("undoButton").disabled = state.undoDisabled || !app.game.canUndo() || !playing;
  $("hintButton").disabled = !playing;
  $("prismButton").disabled = state.charge <= 0 || !playing;
  $("pulseButton").disabled = state.abilities.pulse.charges <= 0 || state.abilities.pulse.cooldown > 0 || !playing;
  $("pushButton").disabled = state.abilities.push.charges <= 0 || state.abilities.push.cooldown > 0 || !playing;
  $("scanButton").disabled = state.abilities.scan.charges <= 0 || state.abilities.scan.cooldown > 0 || !playing;
  if (state.boss) {
    const progress = app.game.capturedCount() / Math.max(1, state.totalPlanned);
    $("bossFill").style.width = `${Math.round(progress * 100)}%`;
    $("bossPhase").textContent = `FASE ${state.bossPhase}`;
  }
}

function finishLevel() {
  if (!app.game || app.resultShown) return;
  const state = app.game.getState();
  if (state.status !== "won" && state.status !== "lost") return;
  app.resultShown = true;
  app.paused = true;
  const won = state.status === "won";
  let reward = null;
  if (won) {
    if (app.currentLevel.kind === "daily") {
      const previous = app.progress.daily[app.dailyKey] || {};
      app.progress.daily[app.dailyKey] = {
        stars: Math.max(previous.stars || 0, state.stars),
        score: Math.max(previous.score || 0, state.score),
        rewarded: previous.rewarded === true
      };
      const first = !previous.rewarded;
      const gears = first ? Math.max(1, Math.round((1 + state.stars) * gearMultiplier(app.progress))) : 1;
      app.progress.gears += gears;
      app.progress.daily[app.dailyKey].rewarded = true;
      reward = { gears };
      saveProgress(app.progress);
    } else {
      reward = recordWin(app.progress, app.currentLevel.id, state.stars, state.score, app.currentLevel);
    }
    clearResume();
  }
  $("resultEyebrow").textContent = won ? (app.currentLevel.kind === "boss" ? "BOSS SCONFITTO" : "TURNO COMPLETATO") : "MACCHINA FERMA";
  $("resultTitle").textContent = won ? (app.currentLevel.kind === "boss" ? `${app.currentLevel.name} è stato fermato` : "Fabbrica riaccesa") : "Riprova il turno";
  $("resultStars").textContent = won ? "★".repeat(state.stars) + "☆".repeat(3 - state.stars) : "—";
  $("resultScore").textContent = state.score.toLocaleString("it-IT");
  $("resultMoves").textContent = String(state.moves);
  $("resultCombo").textContent = String(state.bestCombo);
  $("resultNote").textContent = won
    ? (state.stars === 3 ? "Perfetto: ogni collettore, nessuna esitazione." : "La luce è tornata. Puoi migliorare il punteggio.")
    : (state.reason || "La griglia è piena. Libera i collettori e riprova.");
  $("resultReward").classList.toggle("hidden", !reward);
  $("resultReward").textContent = reward ? `+ ${reward.gears} ingranaggi` : "";
  $("nextButton").hidden = !won || app.currentLevel.kind !== "campaign" || app.currentLevel.number >= CAMPAIGN_LEVELS;
  openDialog("resultDialog");
  app.audio.play(won ? "win" : "lose");
  updateMenu();
}

function processEvents(events) {
  for (const event of events) {
    if (event.type === "capture") {
      app.audio.play("capture");
      if (event.color != null) app.renderer.burst(event.x, event.y, COLORS[event.color]?.hex || "#ffffff");
    } else if (event.type === "move") app.audio.play("move");
    else if (event.type === "push") app.audio.play("deploy");
    else if (event.type === "prism") app.audio.play("prism");
    else if (event.type === "ability") {
      app.audio.play("ability");
      toast(event.ability === "pulse" ? "Pulse attivo: la macchina è ferma." : event.ability === "scan" ? "Scansione attiva." : "Spinta pronta: scegli una direzione.");
    } else if (event.type === "blackout") app.audio.play("blackout");
    else if (event.type === "power") app.audio.play("power");
    else if (event.type === "lift") app.audio.play("lift");
    else if (event.type === "spawn") app.audio.play("spawn");
    else if (event.type === "bossPhase") {
      app.audio.play("blackout");
      toast(`Il boss entra in fase ${event.phase}.`);
    } else if (event.type === "bossAttack") app.audio.play("boss");
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
  if (!result.ok && result.reason === "locked") toast("Questa cella è bloccata dal boss.");
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

function activatePulse() {
  if (!app.game || app.paused) return;
  const result = app.game.usePulse();
  if (!result.ok) toast("Pulse non è pronto.");
  updateHud();
}

function activatePush() {
  if (!app.game || app.paused) return;
  const result = app.game.armPush();
  if (!result.ok) toast("Spinta non è pronta.");
  updateHud();
}

function activateScan() {
  if (!app.game || app.paused) return;
  const result = app.game.useScan();
  if (!result.ok) toast("Scansione non è pronta.");
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
    const flat = Math.min(CAMPAIGN_LEVELS, app.progress.unlocked);
    const area = Math.floor((flat - 1) / LEVELS_PER_AREA);
    const stage = (flat - 1) % LEVELS_PER_AREA;
    startLevel(makeLevel(area, stage));
  });
  $("continueButton").addEventListener("click", () => {
    const resume = loadResume();
    if (resume && resume.level && resume.snapshot && resumeIsValid(resume.level, resume.snapshot)) startLevel(resume.level, resume.snapshot);
    else {
      clearResume();
      updateMenu();
      toast("Il salvataggio precedente non è più compatibile. Livello riavviato.");
    }
  });
  $("levelsButton").addEventListener("click", openLevels);
  $("piecesButton").addEventListener("click", openPieces);
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
  $("pulseButton").addEventListener("click", activatePulse);
  $("pushButton").addEventListener("click", activatePush);
  $("scanButton").addEventListener("click", activateScan);
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
    else if (key === "1") { event.preventDefault(); activatePulse(); }
    else if (key === "2") { event.preventDefault(); activatePush(); }
    else if (key === "3") { event.preventDefault(); activateScan(); }
    else if (key === "4") { event.preventDefault(); usePrism(); }
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
    makeSpecialLevel,
    makeBossLevel,
    openLevels,
    openPieces,
    returnToMenu,
    showHint,
    usePrism,
    activatePulse,
    activatePush,
    activateScan
  };
  requestAnimationFrame(loop);
}

init();
