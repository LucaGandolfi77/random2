/*
 * CORE 9 — boot, loop, wiring.
 *
 * The simulation never knows the DOM exists. This file is the only place
 * where sites, crew, events, canvas, audio and localStorage meet.
 */

import { COPY, formatMW, formatMoney, formatNumber } from "./data/copy.js";
import { SITE_BY_ID, SITES } from "./data/sites.js";
import { siteZones, TUTORIAL, ZONE_BY_ID } from "./data/zones.js";
import { CREW_BY_ID } from "./data/crew.js";
import { triggerEvent, resolveEvent } from "./sim/events.js";
import {
  derive, tick, collect, buildOrUpgrade, buyResearch, startOverclock,
  useBattery, prestige as prestigeSite, canPrestige, prestigeGain,
  applyOffline, totalNetworkMW, chooseForUI, switchSite, unlockSite,
} from "./sim/economy.js";
import { hireCrew, assignCrew, unassignCrew, useAbility, characterState } from "./sim/crew.js";
import { pickEvent } from "./sim/events.js";
import { createInitialState } from "./sim/state.js";
import { loadGame, saveGame, exportSave, importSave, clearSave } from "./sim/save.js";
import { Scene } from "./render/scene.js";
import { bindInput } from "./input.js";
import { UI } from "./ui/ui.js";
import { init as audioInit, startAmbient, setEnabled as audioEnabled, setOutput, Sound } from "./audio.js";

const canvas = document.getElementById("game");
const loaded = loadGame();
let state = loaded.state;
let derived = derive(state, state.activeSite, Date.now());
let started = false;
let paused = false;
let last = performance.now();
let lastUi = 0;
let lastSave = 0;
let lastAudio = 0;
let lastTitle = 0;
let offlineReport = null;
let settings = { sound: true, motion: false };
let playedMarked = false;
let tutorialShown = -1;
let lastWarn = {};

if (globalThis.R2) {
  try { settings = globalThis.R2.getSettings(); } catch (e) { /* defaults */ }
  try { globalThis.R2.trackPlaytime?.("core9-pwa"); } catch (e) { /* optional */ }
}

if (loaded.away > 60) {
  offlineReport = applyOffline(state, loaded.away, Date.now());
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

Scene.init(canvas);
Scene.setSite(state.activeSite, state, true);
Scene.setReducedMotion(Boolean(globalThis.R2?.reduced || settings.motion));

UI.init({
  start: startShift,
  collect: doCollect,
  boost: doOverclock,
  rotate: () => { Scene.rotate(); Sound.ui(); },
  settings: () => { UI.openPanel("settings"); Sound.open(); },
  upgrade: doUpgrade,
  research: doResearch,
  prestige: askPrestige,
  exportSave: doExport,
  importSave: doImport,
  reset: askReset,
  skipTutorial: skipTutorial,
  focusZone: (id) => Scene.focusZone(id),
  sheetOpen: (id) => { Scene.setSelected(id); Scene.setSheetOpen(true); },
  sheetClose: () => {
    Scene.setSelected(null);
    Scene.setSheetOpen(false);
    if (started && !state.tutorialDone && state.tutorial < TUTORIAL.length) {
      const step = TUTORIAL[state.tutorial];
      if (!tutorialSatisfied(step)) {
        Scene.setHighlight(step.target);
        Scene.focusZone(step.target);
      }
    }
  },
  crewOpen: (id) => {
    Scene.setSheetOpen(true);
    const member = characterState(state, id);
    if (member && member.site === state.activeSite && member.zone) {
      Scene.setSelected(member.zone);
      Scene.focusZone(member.zone);
    }
  },
  crewClose: () => {
    Scene.setSelected(null);
    Scene.setSheetOpen(false);
  },
  panelOpen: () => Sound.open(),
  panelClose: () => Sound.close(),
  toggle: toggleSetting,
  getSettings: () => settings,
  hireCrew: doHire,
  assignCrew: doAssign,
  useAbility: doAbility,
  resolveEvent: doResolveEvent,
  discharge: doBattery,
  siteAction: doSiteAction,
});

if (new URLSearchParams(location.search).has("debug")) {
  globalThis.__CORE9__ = {
    get state() { return state; },
    get derived() { return derived; },
    Scene, UI,
  };
}

UI.setSettings(settings);
UI.update(state, derived, Date.now());
UI.showIntro(loaded.fresh, state);

bindInput(canvas, {
  tap: onTap,
  pan: (dx, dy) => Scene.panBy(dx, dy),
  zoom: (f) => Scene.zoomBy(f),
  setZoom: (z) => { Scene.setZoom(z); },
  getZoom: () => Scene.getZoom(),
  rotate: () => { Scene.rotate(); Sound.ui(); },
  collect: doCollect,
  escape: () => {
    if (UI.isSheetOpen()) { UI.closeSheet(); UI.closeCrew(); return; }
    if (UI.isPanelOpen()) return UI.closePanel();
  },
});

requestAnimationFrame(loop);

/* ------------------------------------------------------------------ flow */

function startShift() {
  if (started) return;
  started = true;
  paused = false;
  UI.hideIntro();
  audioInit();
  startAmbient();
  audioEnabled(settings.sound);
  markPlayed();
  updateTutorial();
  saveGame(state);
  last = performance.now();
  if (offlineReport) {
    const report = offlineReport;
    offlineReport = null;
    setTimeout(() => UI.showOffline(report), 220);
  }
  UI.refresh();
}

function markPlayed() {
  if (playedMarked) return;
  playedMarked = true;
  try { globalThis.R2?.markPlayed?.("core9-pwa"); } catch (e) { /* optional */ }
}

function onTap(x, y) {
  if (!started) return;
  const hit = Scene.pick(x, y);
  if (!hit) {
    if (UI.isSheetOpen()) { UI.closeSheet(); UI.closeCrew(); }
    Scene.setSelected(null);
    return;
  }
  if (hit.type === "crew") {
    UI.openCrew(hit.id);
    Sound.open();
    return;
  }
  if (hit.type === "zone") {
    Scene.focusZone(hit.id);
    UI.openSheet(hit.id);
    Sound.ui();
  }
}

/* ------------------------------------------------------------------ actions */

function doCollect() {
  if (!started) return;
  const site = state.sites[state.activeSite];
  if (derived.autoCollect) {
    UI.toast("The control centre is collecting automatically");
    return;
  }
  const amount = collect(state, state.activeSite);
  if (amount <= 0.01) {
    UI.toast("Nothing in the switchyard yet", "bad");
    Sound.error();
    return;
  }
  Sound.collect();
  haptic(12);
  Scene.collectPulse();
  Scene.floatAt("substation", "+" + formatMoney(amount), "#f3b53f");
  UI.toast("Collected " + formatMoney(amount), "gold");
  derived = derive(state, state.activeSite);
  UI.refresh();
  saveGame(state);
}

function doOverclock() {
  if (!started) return;
  const r = startOverclock(state, state.activeSite);
  if (!r.ok) {
    if (r.reason === "cooldown") UI.toast("Overclock is still cooling down", "bad");
    else if (r.reason === "active") UI.toast("Overclock already running");
    else UI.toast("No reactor to overclock", "bad");
    Sound.error();
    return;
  }
  Sound.overclock();
  haptic([14, 30, 14]);
  Scene.pulse("reactor", "upgrade");
  Scene.floatAt("reactor", "OVERCLOCK", "#f3b53f");
  UI.toast("Reactor overclocked for " + r.duration + "s", "gold");
  derived = derive(state, state.activeSite);
  UI.refresh();
  saveGame(state);
}

function doUpgrade(zoneId) {
  if (!started) return;
  const siteDef = SITE_BY_ID[state.activeSite];
  const zone = siteZones(siteDef).find((z) => z.id === zoneId);
  if (!zone) return;
  const r = buildOrUpgrade(state, zoneId, state.activeSite);
  if (!r.ok) {
    if (r.reason === "credits") UI.toast(COPY.toast.noCredits + " · need " + formatMoney(r.cost), "bad");
    else if (r.reason === "locked") {
      const req = siteZones(siteDef).find((z) => z.id === r.unlock.zone);
      UI.toast("Locked · raise " + (req ? req.name : r.unlock.zone) + " to LV " + r.unlock.level, "bad");
    } else if (r.reason === "max") UI.toast(COPY.toast.max, "bad");
    else UI.toast("Cannot do that yet", "bad");
    Sound.error();
    return;
  }
  if (r.building) {
    Sound.build();
    Scene.pulse(zoneId, "build");
    Scene.floatAt(zoneId, "ONLINE", zone.accent);
    UI.toast(zone.name + " built", "good");
  } else {
    Sound.upgrade();
    Scene.pulse(zoneId, "upgrade");
    Scene.floatAt(zoneId, "LV " + r.level, zone.accent);
    UI.toast(zone.name + " → LV " + r.level + (r.stageChanged ? " · new silhouette" : ""), "good");
  }
  haptic(r.building ? [16, 26, 12] : 12);
  updateTutorial();
  derived = derive(state, state.activeSite);
  UI.openSheet(zoneId);
  UI.refresh();
  saveGame(state);
}

function doResearch(id) {
  if (!started) return;
  const r = buyResearch(state, id);
  if (!r.ok) {
    if (r.reason === "data") UI.toast("Need more research data", "bad");
    else if (r.reason === "lab") UI.toast("Research lab level " + r.need + " required on this site", "bad");
    else UI.toast("Already installed", "bad");
    Sound.error();
    return;
  }
  Sound.research();
  haptic(10);
  Scene.pulse("lab", "upgrade");
  UI.toast("Research installed · " + r.def.name, "good");
  derived = derive(state, state.activeSite);
  UI.openPanel("research");
  UI.refresh();
  saveGame(state);
}

function doHire(id) {
  if (!started) return;
  const r = hireCrew(state, id);
  if (!r.ok) {
    if (r.reason === "credits") UI.toast("Not enough credits", "bad");
    else if (r.reason === "data") UI.toast("Not enough data", "bad");
    else if (r.reason === "locked") UI.toast("Not unlocked yet", "bad");
    else UI.toast("Cannot hire", "bad");
    Sound.error();
    return;
  }
  Sound.research();
  haptic(10);
  UI.toast(r.character.name + " joined the crew", "good");
  derived = derive(state, state.activeSite);
  UI.openPanel("crew");
  UI.refresh();
  saveGame(state);
}

function doAssign(id, siteId, zoneId) {
  if (!started) return;
  if (!siteId || !zoneId) {
    const r = unassignCrew(state, id);
    if (r.ok) UI.toast("Crew member unassigned");
    UI.refresh();
    saveGame(state);
    return;
  }
  const r = assignCrew(state, id, siteId, zoneId);
  if (!r.ok) {
    if (r.reason === "slots") UI.toast("No free crew slots · upgrade Administration or the Director", "bad");
    else if (r.reason === "occupied") UI.toast("That plot already has an operator", "bad");
    else if (r.reason === "empty") UI.toast("Build that plot before assigning an operator", "bad");
    else UI.toast("Cannot assign there", "bad");
    Sound.error();
    UI.refresh();
    return;
  }
  Sound.ui();
  haptic(8);
  UI.toast(CREW_BY_ID[r.character.id].name + " assigned to " + ZONE_BY_ID[r.zone].name, "good");
  derived = derive(state, state.activeSite);
  UI.refresh();
  UI.openCrew(id);
  saveGame(state);
}

function doAbility(id) {
  if (!started) return;
  const before = characterState(state, id);
  const r = useAbility(state, id, state.activeSite);
  if (!r.ok) {
    if (r.reason === "cooldown") UI.toast("Ability is still cooling down", "bad");
    else if (r.reason === "not_here") UI.toast("Assign this operator to the current site first", "bad");
    else if (r.reason === "battery_empty") UI.toast("Battery is empty", "bad");
    else UI.toast("Ability unavailable", "bad");
    Sound.error();
    return;
  }
  Sound.overclock();
  haptic([10, 20, 10]);
  Scene.pulse(before && before.zone || "reactor", "upgrade");
  UI.toast(r.character.name + " · " + r.active.name, "gold");
  derived = derive(state, state.activeSite);
  UI.refresh();
  UI.openCrew(id);
  saveGame(state);
}

function doResolveEvent(index) {
  if (!started) return;
  const r = resolveEvent(state, index);
  if (!r.ok) { UI.closeModal(); return; }
  if (r.auto) {
    UI.toast("Event acknowledged");
  } else {
    UI.toast(r.def.name + " · " + r.choice.label, "gold");
  }
  derived = derive(state, state.activeSite);
  UI.refresh();
  saveGame(state);
}

function doBattery() {
  if (!started) return;
  const r = useBattery(state, state.activeSite);
  if (!r.ok) {
    if (r.reason === "empty") UI.toast("Battery is empty", "bad");
    else if (r.reason === "unbuilt") UI.toast("Build the battery yard first", "bad");
    else UI.toast("Battery unavailable", "bad");
    Sound.error();
    return;
  }
  Sound.overclock();
  haptic([12, 20, 12]);
  Scene.pulse("battery", "upgrade");
  UI.toast("Battery discharging into the grid", "gold");
  derived = derive(state, state.activeSite);
  UI.openSheet("battery");
  UI.refresh();
  saveGame(state);
}

function doSiteAction(siteId) {
  if (!started) return;
  const site = state.sites[siteId];
  const def = SITE_BY_ID[siteId];
  if (!site || !def) return;
  if (site.unlocked) {
    if (siteId === state.activeSite) return;
    const r = switchSite(state, siteId);
    if (!r.ok) { UI.toast("Site is locked", "bad"); return; }
    Scene.setSite(siteId, state, true);
    tutorialShown = -1;
    derived = derive(state, siteId);
    UI.closePanel();
    UI.closeSheet();
    UI.closeCrew();
    UI.toast("Travelling to " + def.name + " · " + def.region, "good");
    Sound.open();
    lastWarn = {};
    UI.refresh();
    saveGame(state);
    return;
  }
  const r = unlockSite(state, siteId);
  if (!r.ok) {
    if (r.reason === "director") UI.toast("Need Director level " + r.need, "bad");
    else if (r.reason === "isotopes") UI.toast("Need " + r.need + " isotopes", "bad");
    else UI.toast("Cannot unlock this site", "bad");
    Sound.error();
    return;
  }
  Sound.prestige();
  haptic([20, 30, 20]);
  switchSite(state, siteId);
  Scene.setSite(siteId, state, true);
  tutorialShown = -1;
  derived = derive(state, siteId);
  UI.closePanel();
  UI.toast(def.name + " unlocked · " + def.region, "gold");
  UI.refresh();
  saveGame(state);
}

function askPrestige(siteId) {
  const id = siteId || state.activeSite;
  const def = SITE_BY_ID[id];
  const site = state.sites[id];
  if (!site || !def) return;
  if (!canPrestige(state, id)) {
    UI.toast("Reach " + formatMW(def.prestigeMW) + " on " + def.name, "bad");
    return;
  }
  const gain = prestigeGain(state, id);
  UI.showModal({
    title: COPY.prestige.title + " · " + def.name,
    html: '<p class="modal-lead">' + COPY.prestige.body + "</p>" +
      '<div class="report-row"><span>Site</span><b>' + def.name + " · " + def.region + "</b></div>" +
      '<div class="report-row"><span>Prestige threshold</span><b>' + formatMW(def.prestigeMW) + "</b></div>" +
      '<div class="report-row"><span>' + COPY.prestige.gain + '</span><b class="teal">+' + gain + " isotopes</b></div>" +
      '<div class="report-row"><span>Output bonus</span><b>+' + (6 * gain) + "% network</b></div>",
    ok: COPY.prestige.yes,
    cancel: COPY.prestige.no,
    onOk: () => doPrestige(id),
  });
}

function doPrestige(siteId) {
  const r = prestigeSite(state, siteId);
  if (!r.ok) return;
  UI.closePanel();
  UI.closeSheet();
  UI.closeCrew();
  if (siteId === state.activeSite) {
    Scene.setSite(siteId, state, true);
    Scene.fit(state);
  }
  Sound.prestige();
  haptic([20, 40, 20, 40, 20]);
  UI.toast(SITE_BY_ID[siteId].name + " generation " + r.generation + " · +" + r.gain + " isotopes", "gold");
  derived = derive(state, state.activeSite);
  UI.refresh();
  saveGame(state);
}

function toggleSetting(id) {
  if (id === "sound") {
    settings.sound = !settings.sound;
    try { globalThis.R2?.setSettings?.({ sound: settings.sound }); } catch (e) { /* ignore */ }
    audioEnabled(settings.sound);
    if (settings.sound) Sound.ui();
  } else if (id === "motion") {
    settings.motion = !settings.motion;
    try { globalThis.R2?.setSettings?.({ motion: settings.motion }); } catch (e) { /* ignore */ }
    Scene.setReducedMotion(settings.motion || Boolean(globalThis.R2?.reduced));
  }
  UI.openPanel("settings");
  UI.refresh();
}

function skipTutorial() {
  state.tutorialDone = true;
  tutorialShown = -1;
  Scene.setHighlight(null);
  UI.refresh();
  saveGame(state);
}

function doExport() {
  try {
    const blob = new Blob([exportSave(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "core9-save.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast("Save exported", "good");
  } catch (e) {
    UI.toast("Export failed", "bad");
  }
}

function doImport(text) {
  const next = importSave(text);
  if (!next) {
    UI.toast(COPY.toast.importError, "bad");
    Sound.error();
    return;
  }
  state = next;
  derived = derive(state, state.activeSite);
  Scene.setSite(state.activeSite, state, true);
  Scene.setSelected(null);
  UI.closeSheet();
  UI.closeCrew();
  UI.closePanel();
  tutorialShown = -1;
  offlineReport = null;
  lastWarn = {};
  saveGame(state);
  UI.update(state, derived, Date.now());
  UI.toast(COPY.toast.imported, "good");
}

function askReset() {
  UI.showModal({
    title: COPY.settings.reset,
    body: COPY.settings.resetConfirm,
    ok: "Reset",
    cancel: "Keep network",
    onOk: doReset,
  });
}

function doReset() {
  clearSave();
  state = createInitialState();
  derived = derive(state, state.activeSite);
  started = false;
  UI.closeSheet();
  UI.closeCrew();
  UI.closePanel();
  UI.closeModal();
  Scene.setSite(state.activeSite, state, true);
  Scene.setSelected(null);
  Scene.setHighlight(null);
  tutorialShown = -1;
  offlineReport = null;
  lastWarn = {};
  saveGame(state);
  UI.update(state, derived, Date.now());
  UI.showIntro(true, state);
  Sound.close();
}

/* ----------------------------------------------------------------- tutorial */

function updateTutorial() {
  if (state.tutorialDone) {
    tutorialShown = -1;
    Scene.setHighlight(null);
    return;
  }
  while (state.tutorial < TUTORIAL.length) {
    const step = TUTORIAL[state.tutorial];
    if (!tutorialSatisfied(step)) {
      if (tutorialShown !== state.tutorial) {
        tutorialShown = state.tutorial;
        Scene.setHighlight(step.target);
        if (!UI.isSheetOpen() && !UI.isPanelOpen()) Scene.focusZone(step.target);
        UI.refresh();
      }
      return;
    }
    state.tutorial++;
  }
  state.tutorialDone = true;
  tutorialShown = -1;
  Scene.setHighlight(null);
  UI.toast("Shift underway. Keep the loop alive.", "good");
  saveGame(state);
  UI.refresh();
}

function tutorialSatisfied(step) {
  const site = state.sites[state.activeSite];
  const level = site && site.zones[step.target] ? site.zones[step.target].level : 0;
  if (step.target === "reactor") return level >= 2;
  return level >= 1;
}

/* --------------------------------------------------------------------- loop */

function loop(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  const wall = Date.now();

  if (started && !paused) {
    const res = tick(state, dt, wall);
    derived = res.d;
    if (res.completed && res.completed.length) {
      for (const m of res.completed) {
        UI.toast("Goal complete · " + m.title + " · +" + formatMoney(m.credits), "gold");
        Sound.collect();
      }
      saveGame(state, wall);
    }
    if (res.achievements && res.achievements.length) {
      for (const a of res.achievements) {
        UI.toast("Achievement · " + a.name, "gold");
        Sound.collect();
      }
      saveGame(state, wall);
    }
    if (res.levelUps && res.levelUps.length) {
      for (const up of res.levelUps) {
        if (up.player) UI.toast("Director level " + up.level, "good");
        else if (CREW_BY_ID[up.id]) UI.toast(CREW_BY_ID[up.id].name + " reached LV " + up.level, "good");
      }
    }
    if (res.eventResolved) {
      const def = res.eventResolved.def;
      if (def) UI.toast(def.name + " resolved", "gold");
      saveGame(state, wall);
    }
    if (res.d.status === "heat" && wall - (lastWarn.heat || 0) > 60_000) {
      lastWarn.heat = wall;
      UI.toast("Cooling limit · output is being throttled", "bad");
      Sound.alarm();
    }
    if (res.d.status === "waste" && wall - (lastWarn.waste || 0) > 60_000) {
      lastWarn.waste = wall;
      UI.toast("Waste vault full · output is being throttled", "bad");
      Sound.alarm();
    }
    scheduleEvent(wall);
    updateTutorial();
  }

  Scene.update(dt, state, derived, now);
  Scene.draw(state, derived, now);

  if (now - lastUi > 180) {
    lastUi = now;
    UI.update(state, derived, wall);
  }
  if (now - lastAudio > 500) {
    lastAudio = now;
    setOutput(derived.netMW, derived.status === "online" || derived.status === "heat");
  }
  if (now - lastTitle > 2000) {
    lastTitle = now;
    const site = SITE_BY_ID[state.activeSite];
    document.title = "CORE 9 · " + site.short + " · " + formatMW(derived.netMW);
  }
  if (started && now - lastSave > 5000) {
    lastSave = now;
    saveGame(state, wall);
  }
  requestAnimationFrame(loop);
}

function scheduleEvent(now) {
  if (!started || state.event) return;
  if (now < state.nextEventAt) return;
  const id = pickEvent(state, state.activeSite, Math.random);
  const ev = triggerEvent(state, id, state.activeSite, now, Math.random);
  if (!ev) return;
  Sound.event();
  UI.toast("Event · " + ev.def.name, "gold");
  derived = derive(state, state.activeSite, now);
  UI.refresh();
  saveGame(state, now);
}

/* --------------------------------------------------------- visibility/save */

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (started) saveGame(state);
    return;
  }
  if (!started) return;
  const away = Math.max(0, (Date.now() - state.lastSeen) / 1000);
  if (away > 60) {
    const report = applyOffline(state, away);
    derived = derive(state, state.activeSite);
    saveGame(state);
    UI.update(state, derived, Date.now());
    UI.showOffline(report);
  } else {
    derived = derive(state, state.activeSite);
    UI.update(state, derived, Date.now());
  }
  last = performance.now();
});

window.addEventListener("pagehide", () => {
  if (started) saveGame(state);
});

function haptic(pattern) {
  if (!settings.haptics && settings.haptics !== undefined) return;
  try {
    if (globalThis.R2?.buzz) globalThis.R2.buzz(pattern);
    else navigator.vibrate?.(pattern);
  } catch (e) { /* unsupported */ }
}
