import { DIRECTIONS, FACTORIES, LEVELS_PER_FACTORY } from "./config.js";
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
  screen: "menu", paused: false, progress: loadProgress(), settings: loadSettings(), audio: null,
  renderer: null, game: null, currentLevel: null, currentFactory: 0, dailyKey: "",
  hammerMode: false, lastFrame: 0, saveTimer: 0, resultShown: false, toastTimer: 0
};
app.audio = createAudio(app.settings);
app.renderer = new Renderer($("gameCanvas"), app.settings);

function show(node) { node.classList.remove("hidden"); }
function hide(node) { node.classList.add("hidden"); }
function toast(message, ms) {
  const node = $("toast"); node.textContent = message; node.classList.add("show");
  clearTimeout(app.toastTimer); app.toastTimer = setTimeout(() => node.classList.remove("show"), ms || 2200);
}
function todayKey() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; }
function updateSoundButton() {
  const on = app.settings.sound; $("soundButton").textContent = on ? "♪" : "×";
  $("soundButton").setAttribute("aria-label", on ? "Disattiva audio" : "Attiva audio"); $("soundSetting").checked = on;
}
function updateMenu() {
  const entries = Object.entries(app.progress.stars).filter(([id]) => !id.startsWith("daily-"));
  const stars = entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
  const completedFactories = FACTORIES.filter((factory, fi) => Array.from({length: LEVELS_PER_FACTORY}, (_, s) => app.progress.stars[`${factory.id}-${s+1}`]).every(Boolean)).length;
  const moves = Object.values(app.progress.bestMoves).filter(Number.isFinite);
  $("factoriesStat").textContent = `${completedFactories}/${FACTORIES.length}`;
  $("starsStat").textContent = `${stars}/${totalLevels()*3}`;
  $("gearsStat").textContent = String(stars);
  $("bestMovesStat").textContent = moves.length ? String(Math.min(...moves)) : "—";
  const resume = loadResume(); $("continueButton").hidden = !resume || !resumeIsValid(resume.level, resume.snapshot);
  $("dailyDate").textContent = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}
function openDialog(id) { if (app.screen === "game" && app.game && app.game.getState().status === "playing") app.paused = true; show($(id)); }
function closeDialogs() { document.querySelectorAll(".overlay").forEach((node) => node.classList.add("hidden")); if (app.screen === "game" && app.game && app.game.getState().status === "playing") app.paused = false; }

function startLevel(level, snapshot) {
  app.currentLevel = level; app.game = createGame(level, snapshot); app.screen = "game"; app.paused = false; app.resultShown = false; app.hammerMode = false;
  app.saveTimer = 0; app.lastFrame = performance.now(); app.renderer = new Renderer($("gameCanvas"), app.settings);
  hide($("menuScreen")); show($("gameScreen")); closeDialogs(); app.paused = false;
  $("modeLabel").textContent = level.kind === "daily" ? "GIORNALIERO" : "FABBRICA";
  $("levelLabel").textContent = level.kind === "daily" ? "Fabbrica del giorno" : level.name;
  $("boardStatus").textContent = "Tocca una freccia con il percorso libero.";
  $("hammerButton").classList.remove("active"); updateHud();
  if (!snapshot) toast(level.kind === "daily" ? "Sfida giornaliera" : level.name);
}
function playCurrent() {
  const flat = Math.min(totalLevels(), app.progress.unlocked);
  startLevel(makeLevel(Math.floor((flat-1)/LEVELS_PER_FACTORY), (flat-1)%LEVELS_PER_FACTORY));
}
function startDaily() { app.dailyKey = todayKey(); startLevel(dailyLevel(app.dailyKey)); }
function startNext() {
  if (!app.currentLevel || app.currentLevel.kind !== "campaign") { returnToMenu(); return; }
  let f = app.currentLevel.factoryIndex, s = app.currentLevel.stage + 1;
  if (s >= LEVELS_PER_FACTORY) { f++; s = 0; }
  if (f >= FACTORIES.length) { returnToMenu(); return; }
  startLevel(makeLevel(f, s));
}
function saveCurrent() {
  if (app.screen !== "game" || !app.game || !app.currentLevel) return;
  if (app.game.getState().status === "playing") saveResume(app.currentLevel, app.game.snapshot()); else clearResume();
}
function returnToMenu() {
  saveCurrent(); app.screen = "menu"; app.paused = false; app.hammerMode = false;
  hide($("gameScreen")); show($("menuScreen")); closeDialogs(); updateMenu();
}
function removable() { return app.game ? app.game.state.arrows.map((_, i) => i).filter((i) => app.game.clearPath(i)) : []; }
function updateHud() {
  if (!app.game) return;
  const s = app.game.state, playing = s.status === "playing";
  $("arrowsValue").textContent = String(s.arrows.filter((a) => a.status !== "removed").length);
  $("movesValue").textContent = String(s.moves); $("scoreValue").textContent = s.score.toLocaleString("it-IT"); $("comboValue").textContent = `×${s.combo}`;
  $("undoValue").textContent = String(s.undosLeft); $("scanValue").textContent = String(s.scansLeft); $("hammerValue").textContent = String(s.hammersLeft);
  $("undoButton").disabled = s.undosLeft <= 0 || !playing; $("scanButton").disabled = s.scansLeft <= 0 || !playing; $("hammerButton").disabled = s.hammersLeft <= 0 || !playing; $("hintButton").disabled = !playing;
}
function finishLevel() {
  if (!app.game || app.resultShown) return;
  const s = app.game.state; if (s.status !== "won") return;
  app.resultShown = true; app.paused = true; recordWin(app.progress, app.currentLevel, s); clearResume();
  $("resultStars").textContent = "★".repeat(s.stars) + "☆".repeat(3-s.stars);
  $("resultScore").textContent = s.score.toLocaleString("it-IT"); $("resultMoves").textContent = String(s.moves); $("resultPar").textContent = String(s.par);
  $("resultNote").textContent = s.stars === 3 ? "Perfetto: ogni freccia ha trovato la sua via." : "La fabbrica è di nuovo in ordine.";
  $("nextButton").hidden = app.currentLevel.kind !== "campaign" || app.currentLevel.number >= totalLevels();
  openDialog("resultDialog"); app.audio.play("win"); updateMenu();
}
function processEvents(events) {
  for (const e of events) {
    if (e.type === "hit") {
      if (e.removed) { app.audio.play("remove"); app.renderer.animateExit(e.index, app.game.state.arrows[e.index].dir); app.renderer.burst(e.index, app.game.state.size, DIRECTIONS[app.game.state.arrows[e.index].dir].color); }
      else app.audio.play("hit");
    } else if (e.type === "blocked") { app.audio.play("blocked"); $("boardStatus").textContent = "Percorso bloccato: libera prima le frecce davanti."; }
    else if (e.type === "undo") { app.audio.play("undo"); app.hammerMode = false; $("hammerButton").classList.remove("active"); }
    else if (e.type === "scan") { app.audio.play("scan"); $("boardStatus").textContent = "Le frecce evidenziate possono uscire."; }
    else if (e.type === "hammer") { app.audio.play("hammer"); app.renderer.animateExit(e.index, app.game.state.arrows[e.index].dir); app.renderer.burst(e.index, app.game.state.size, "#f4a7b5"); app.hammerMode = false; $("hammerButton").classList.remove("active"); }
    else if (e.type === "hint") $("boardStatus").textContent = "La freccia suggerita è evidenziata.";
    else if (e.type === "win") finishLevel();
  }
}
function loop(now) {
  const dt = Math.min(.05, Math.max(0, (now-app.lastFrame)/1000)); app.lastFrame = now;
  if (app.game) {
    if (!app.paused && app.screen === "game" && app.game.state.status === "playing") { app.saveTimer += dt; if (app.saveTimer >= 4) { app.saveTimer = 0; saveCurrent(); } }
    app.renderer.draw(app.game.state, removable(), now, app.paused ? 0 : dt); processEvents(app.game.drainEvents()); updateHud();
  }
  requestAnimationFrame(loop);
}
function onCanvasPointerDown(event) {
  if (!app.game || app.paused || app.game.state.status !== "playing") return;
  app.audio.unlock();
  const point = app.renderer.pointerToCell(event.clientX, event.clientY, app.game.state.size); if (!point) return;
  const arrow = app.game.state.arrows.find((a) => a.x === point.x && a.y === point.y && a.status !== "removed"); if (!arrow) return;
  if (app.hammerMode) { app.game.hammer(arrow.index); if (app.game.state.hammersLeft <= 0) { app.hammerMode = false; $("hammerButton").classList.remove("active"); } }
  else app.game.hit(arrow.index);
  updateHud();
}
function toggleHammer() {
  if (!app.game || app.paused || app.game.state.hammersLeft <= 0) return;
  app.hammerMode = !app.hammerMode; $("hammerButton").classList.toggle("active", app.hammerMode);
  $("boardStatus").textContent = app.hammerMode ? "Martello attivo: tocca una freccia da rimuovere." : "Tocca una freccia con il percorso libero.";
}
function showHint() { if (!app.game || app.paused) return; const move = app.game.hint(); if (!move) toast("Nessun suggerimento disponibile."); updateHud(); }

function buildFactoryTabs() {
  const tabs = $("areaTabs"); tabs.innerHTML = "";
  FACTORIES.forEach((factory, index) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "area-tab" + (index === app.currentFactory ? " on" : ""); b.setAttribute("role","tab"); b.setAttribute("aria-selected", index === app.currentFactory ? "true" : "false"); b.textContent = `${index+1}. ${factory.name}`;
    b.addEventListener("click", () => { app.currentFactory = index; buildFactoryTabs(); renderLevels(); }); tabs.appendChild(b);
  });
}
function renderLevels() {
  const grid = $("levelGrid"); grid.innerHTML = "";
  for (let stage=0; stage<LEVELS_PER_FACTORY; stage++) {
    const flat = app.currentFactory*LEVELS_PER_FACTORY+stage+1, id=`${FACTORIES[app.currentFactory].id}-${stage+1}`, stars=app.progress.stars[id]||0, locked=flat>app.progress.unlocked;
    const b=document.createElement("button"); b.type="button"; b.className="level-btn"+(locked?" locked":""); b.disabled=locked; b.setAttribute("aria-label",`Livello ${flat}${locked?", bloccato":""}`);
    const n=document.createElement("span"); n.textContent=String(flat); const sr=document.createElement("span"); sr.className="mini-stars"; sr.textContent="★".repeat(stars); b.append(n,sr);
    if(!locked)b.addEventListener("click",()=>{closeDialogs();startLevel(makeLevel(app.currentFactory,stage));}); grid.appendChild(b);
  }
}
function openFactories() { app.currentFactory=Math.floor((app.progress.unlocked-1)/LEVELS_PER_FACTORY); app.currentFactory=Math.max(0,Math.min(FACTORIES.length-1,app.currentFactory)); buildFactoryTabs(); renderLevels(); openDialog("factoriesDialog"); }
function togglePause() { if(app.screen!=="game"||!app.game||app.game.state.status!=="playing")return; if(app.paused)closeDialogs();else openDialog("pauseDialog"); }

function bindEvents() {
  $("playButton").addEventListener("click",playCurrent); $("dailyButton").addEventListener("click",startDaily); $("dailyCard").addEventListener("click",startDaily); $("factoriesButton").addEventListener("click",openFactories);
  $("continueButton").addEventListener("click",()=>{const r=loadResume();if(r&&r.level&&r.snapshot&&resumeIsValid(r.level,r.snapshot))startLevel(r.level,r.snapshot);else{clearResume();updateMenu();toast("Salvataggio non compatibile.");}});
  $("brandButton").addEventListener("click",returnToMenu); $("backButton").addEventListener("click",returnToMenu); $("pauseButton").addEventListener("click",togglePause); $("resumeButton").addEventListener("click",closeDialogs); $("quitButton").addEventListener("click",returnToMenu); $("resultMenuButton").addEventListener("click",returnToMenu); $("replayButton").addEventListener("click",()=>startLevel(app.currentLevel)); $("nextButton").addEventListener("click",startNext);
  $("undoButton").addEventListener("click",()=>{if(app.game){app.game.undo();updateHud();}}); $("scanButton").addEventListener("click",()=>{if(app.game){app.game.scan();updateHud();}}); $("hammerButton").addEventListener("click",toggleHammer); $("hintButton").addEventListener("click",showHint);
  $("settingsButton").addEventListener("click",()=>openDialog("settingsDialog")); $("howButton").addEventListener("click",()=>{hide($("settingsDialog"));openDialog("howDialog");});
  $("soundButton").addEventListener("click",()=>{app.settings.sound=!app.settings.sound;app.audio.setEnabled(app.settings.sound);saveSettings(app.settings);updateSoundButton();});
  $("soundSetting").addEventListener("change",(e)=>{app.settings.sound=e.target.checked;app.audio.setEnabled(app.settings.sound);saveSettings(app.settings);updateSoundButton();});
  $("motionSetting").addEventListener("change",(e)=>{app.settings.reducedMotion=e.target.checked;app.renderer.setSettings(app.settings);saveSettings(app.settings);});
  document.querySelectorAll("[data-close]").forEach((b)=>b.addEventListener("click",()=>{hide($(b.dataset.close));if(app.screen==="game"&&app.game&&app.game.state.status==="playing")app.paused=false;}));
  $("gameCanvas").addEventListener("pointerdown",onCanvasPointerDown); $("gameCanvas").addEventListener("contextmenu",(e)=>e.preventDefault());
  window.addEventListener("keydown",(e)=>{if(app.screen!=="game"||!app.game)return;const k=e.key.toLowerCase();if(k==="p"||k==="escape"){e.preventDefault();togglePause();}else if(k==="u"){e.preventDefault();app.game.undo();updateHud();}else if(k==="h"){e.preventDefault();showHint();}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)saveCurrent();}); window.addEventListener("beforeunload",saveCurrent);
}
function registerServiceWorker(){if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./service-worker.js").catch(()=>{});}
function init(){ $("motionSetting").checked=app.settings.reducedMotion; updateSoundButton(); updateMenu(); bindEvents(); registerServiceWorker(); window.ArrowFoundry={get state(){return app;},get game(){return app.game;},startLevel,startDaily,returnToMenu,makeLevel,showHint}; requestAnimationFrame(loop); }
init();
