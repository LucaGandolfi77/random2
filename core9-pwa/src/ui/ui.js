/*
 * CORE 9 — the interface.
 *
 * A DOM HUD over a canvas map. The UI never owns the simulation: it reads a
 * state snapshot, renders it, and calls back into main for every mutation.
 * With the Network expansion it also renders the site switcher, the crew
 * roster, character sheets and choice events.
 */

import { COPY, formatNumber, formatMoney, formatMW, formatTime } from "../data/copy.js";
import { SITES, SITE_BY_ID, SITE_ORDER } from "../data/sites.js";
import {
  siteZones, stageForLevel, STAGE_LEVELS, STAGE_NAMES, MAX_LEVEL, ZONE_BY_ID, TUTORIAL,
} from "../data/zones.js";
import { RESEARCH, RESEARCH_BY_ID, MISSION_BY_ID } from "../data/progression.js";
import { ACHIEVEMENTS } from "../data/achievements.js";
import { CREW, CREW_BY_ID, RARITY, rarityOf } from "../data/crew.js";
import { EVENT_BY_ID, EVENT_CATEGORIES, eventColour } from "../data/events.js";
import {
  derive, upgradeCostForSite, unlockInfo, canPrestige, prestigeGain, totalNetworkMW,
} from "../sim/economy.js";
import {
  candidates, characterState, crewSlots, crewUsed, crewXpForLevel, crewNextXp,
  abilityReadyAt, passiveLabel,
} from "../sim/crew.js";
import { choicesFor } from "../sim/events.js";
import { DIRECTOR_XP, xpForLevel, levelFromXp } from "../sim/state.js";

const $ = (id) => document.getElementById(id);

let stateRef = null;
let dRef = null;
let handlers = {};
let currentPanel = null;
let sheetOpenId = null;
let crewOpenId = null;
let toastTimer = 0;
let modalOk = null;
let modalCancel = null;
let introVisible = false;
let lastPanelRender = 0;
let lastSheetRender = 0;
let lastCrewRender = 0;
let lastEventKey = "";
let lastHud = {};

function el(id) { return $(id); }

function setText(id, value) {
  const node = el(id);
  if (node && node.textContent !== String(value)) node.textContent = String(value);
}

function setHTML(id, value) {
  const node = el(id);
  if (node) node.innerHTML = value;
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function activeState() { return stateRef ? stateRef.sites[stateRef.activeSite] : null; }
function activeDef() { return stateRef ? SITE_BY_ID[stateRef.activeSite] : SITE_BY_ID.core9; }
function activeZones() { return siteZones(activeDef()); }
function zoneHit(id) { return activeZones().find((z) => z.id === id); }

function portraitSVG(def) {
  const p = def && def.portrait ? def.portrait : {};
  const skin = p.skin || "#c98d68";
  const hair = p.hair || "#2b211d";
  const hat = p.hardhat || "#f3b53f";
  const suit = p.suit || "#1e4b4a";
  const accent = p.accent || "#4dd8c0";
  const glasses = p.glasses
    ? '<path d="M20 36h10v6H20zM34 36h10v6H34zM30 38h4" fill="none" stroke="#172327" stroke-width="1.4"/>'
    : '<circle cx="25" cy="39" r="1.6" fill="#172327"/><circle cx="39" cy="39" r="1.6" fill="#172327"/>';
  const beard = p.beard
    ? '<path d="M21 45c2 7 20 7 22 0v-2H21z" fill="' + hair + '" opacity=".8"/>'
    : "";
  return '<svg viewBox="0 0 64 64" role="img" aria-label="' + esc(def ? def.name : "crew member") + '">' +
    '<rect width="64" height="64" fill="' + accent + '" opacity=".16"/>' +
    '<path d="M8 64c2-13 12-19 24-19s22 6 24 19z" fill="' + suit + '"/>' +
    '<path d="M28 43h8v8h-8z" fill="' + skin + '"/>' +
    '<circle cx="32" cy="35" r="14" fill="' + skin + '"/>' +
    '<path d="M19 31c1-11 6-16 13-16s12 5 13 16c-5-3-9-4-13-4s-8 1-13 4z" fill="' + hair + '"/>' +
    '<path d="M17 27c1-10 7-16 15-16s14 6 15 16c-4-4-9-6-15-6s-11 2-15 6z" fill="' + hat + '"/>' +
    '<rect x="15" y="24" width="34" height="4" rx="2" fill="' + hat + '" opacity=".85"/>' +
    glasses + beard +
    '<path d="M27 49c3 2 7 2 10 0" fill="none" stroke="#6f3d36" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg>';
}

function directorProgress(level, xp) {
  const current = xpForLevel(level);
  const next = level >= 30 ? current : xpForLevel(level + 1);
  const pct = level >= 30 ? 100 : Math.min(100, Math.max(0, ((xp - current) / Math.max(1, next - current)) * 100));
  return { current, next, pct };
}

function effectFor(zone, d, level, siteState) {
  switch (zone.role) {
    case "heat": return formatNumber(d.heat, 1) + " heat";
    case "cooling": return formatNumber(d.cooling, 1) + " cooling";
    case "conversion": return Math.round(d.efficiency * 100) + "% efficiency";
    case "grid": return "€" + d.price.toFixed(2) + " / MW";
    case "control":
      if (level >= 5) return "Automatic collection";
      return "+" + Math.round((d.offlineRate - 0.6) * 100) + "% offline rate";
    case "fuel": return "+" + d.overclockDuration + "s overclock";
    case "waste": return formatNumber(d.wasteCap) + " capacity";
    case "research": return d.dataRate.toFixed(2) + " data/s";
    case "security": return Math.round(d.mitigation * 100) + "% event shield";
    case "admin": return formatTime(d.offlineCap) + " offline · " + d.crewSlots + " crew";
    case "battery": return Math.round(d.batteryCharge) + " / " + Math.round(d.batteryCap) + " charge";
    case "output": return "+" + level * 2 + "% site output";
    case "geothermal": return "+" + level * 3 + "% reactor heat";
    default: return "—";
  }
}

function zoneStatus(zone, state, siteId) {
  const site = state.sites[siteId];
  const level = site.zones[zone.id] ? site.zones[zone.id].level : 0;
  if (level > 0) return { label: "ONLINE · LV " + level, cls: "ok" };
  const u = unlockInfo(state, siteId, zone);
  if (u.ok) return { label: "READY", cls: "build" };
  return { label: "LOCKED", cls: "locked" };
}

function nextStageLevel(level) {
  return STAGE_LEVELS.find((l) => l > level) || null;
}

function stageDots(level, description) {
  const stage = stageForLevel(level);
  let html = "";
  for (let i = 0; i < 8; i++) {
    const cls = i < stage ? "dot filled" : "dot";
    html += '<span class="' + cls + '" title="' + esc(STAGE_NAMES[i]) + '"></span>';
  }
  return '<div class="dots">' + html + '</div><span class="stage-label">' +
    esc(description || (stage > 0 ? STAGE_NAMES[stage - 1] : "Unbuilt")) + " · " + stage + "/8</span>";
}

function toggleRow(id, label, on) {
  return '<button class="toggle-row" data-toggle="' + id + '" aria-pressed="' + (on ? "true" : "false") + '">' +
    "<span>" + esc(label) + "</span><b>" + (on ? COPY.settings.on : COPY.settings.off) +
    '<i class="switch ' + (on ? "on" : "") + '"></i></b></button>';
}

export const UI = {
  init(h) {
    handlers = h || {};
    stateRef = null;
    dRef = null;

    el("settings-btn").addEventListener("click", () => handlers.settings?.());
    el("rotate-btn").addEventListener("click", () => handlers.rotate?.());
    el("collect-btn").addEventListener("click", () => handlers.collect?.());
    el("boost-btn").addEventListener("click", () => handlers.boost?.());
    el("credits-btn").addEventListener("click", () => handlers.collect?.());
    el("data-btn").addEventListener("click", () => UI.openPanel("research"));
    el("site-chip").addEventListener("click", () => UI.openPanel("world"));
    el("director-chip").addEventListener("click", () => UI.openPanel("world"));
    el("battery-chip").addEventListener("click", () => {
      if (activeZones().some((z) => z.id === "battery")) UI.openSheet("battery");
      else UI.openPanel("world");
    });
    el("sheet-close").addEventListener("click", () => UI.closeSheet());
    el("sheet-upgrade").addEventListener("click", () => {
      if (sheetOpenId) handlers.upgrade?.(sheetOpenId);
    });
    el("sheet-action2").addEventListener("click", () => handlers.discharge?.());
    el("crew-close").addEventListener("click", () => UI.closeCrew());
    el("crew-ability").addEventListener("click", () => {
      if (crewOpenId) handlers.useAbility?.(crewOpenId);
    });
    el("crew-zone").addEventListener("change", (e) => {
      if (!crewOpenId) return;
      const value = e.target.value;
      if (value === "") handlers.assignCrew?.(crewOpenId, null, null);
      else {
        const [siteId, zoneId] = value.split(":");
        handlers.assignCrew?.(crewOpenId, siteId, zoneId);
      }
    });
    el("panel-close").addEventListener("click", () => UI.closePanel());
    el("tutorial-skip").addEventListener("click", () => handlers.skipTutorial?.());
    el("intro-start").addEventListener("click", () => handlers.start?.());
    el("modal-ok").addEventListener("click", () => {
      const fn = modalOk;
      UI.closeModal();
      if (fn) fn();
    });
    el("modal-cancel").addEventListener("click", () => {
      const fn = modalCancel;
      UI.closeModal();
      if (fn) fn();
    });
    el("import-file").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => handlers.importSave?.(String(reader.result));
        reader.readAsText(file);
      }
      e.target.value = "";
    });

    document.querySelectorAll("#nav [data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const which = btn.getAttribute("data-nav");
        if (which === "map") { UI.closePanel(); UI.closeSheet(); UI.closeCrew(); }
        else UI.openPanel(which);
      });
    });

    el("intro").addEventListener("click", (e) => {
      if (e.target === el("intro")) handlers.start?.();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!el("modal").classList.contains("hidden")) return UI.closeModal();
      if (crewOpenId) return UI.closeCrew();
      if (sheetOpenId) return UI.closeSheet();
      if (currentPanel) return UI.closePanel();
    });

    setHTML("intro-kicker", "CORE 9 · GRID NETWORK");
    setHTML("intro-tag", COPY.tagline);
    setHTML("intro-body", COPY.intro.body);
    el("intro-start").textContent = COPY.intro.start;
    el("intro-note").textContent = COPY.intro.note;
    el("intro-title").innerHTML = 'CORE<span>9</span>';
    el("intro-title-text").textContent = "Nuclear Idle Tycoon · Network";
    lastHud = {};
    lastEventKey = "";
  },

  showIntro(fresh, state) {
    introVisible = true;
    el("intro").classList.remove("hidden");
    el("intro-start").textContent = fresh ? COPY.intro.start : COPY.intro.resume;
    const meta = el("intro-meta");
    if (meta) {
      meta.textContent = !fresh && state
        ? "DIRECTOR LV " + state.player.level + " · " + state.sites[state.activeSite].generation + " GENERATIONS · " + totalNetworkMW(state).toFixed(0) + " MW NETWORK"
        : "";
    }
  },

  hideIntro() {
    introVisible = false;
    el("intro").classList.add("hidden");
  },

  isIntroVisible() { return introVisible; },

  update(state, d, now) {
    stateRef = state;
    dRef = d;
    if (!state || !d) return;
    const site = activeState();
    const def = activeDef();
    const spot = this;

    setText("res-credits", formatMoney(site.credits));
    const mw = formatMW(d.netMW).split(" ");
    setText("res-mw", mw[0]);
    setText("res-mw-unit", mw[1] || "MW");
    setText("res-data", formatNumber(state.data));
    setText("res-level", state.player.level);
    setText("site-name", def.region.toUpperCase());
    const xp = directorProgress(state.player.level, state.player.xp);
    const fill = el("xp-fill");
    if (fill) fill.style.width = xp.pct + "%";
    const dirChip = el("director-chip");
    if (dirChip) dirChip.title = state.player.level >= 30 ? "Director level max" : `${Math.round(state.player.xp)} XP · next level at ${xp.next}`;

    const bat = el("battery-chip");
    if (bat) {
      if (d.batteryCap > 0) {
        const pct = Math.round((d.batteryCharge / d.batteryCap) * 100);
        bat.classList.remove("hidden");
        bat.classList.toggle("empty", pct <= 0);
        setText("battery-pct", pct + "%");
      } else {
        bat.classList.add("hidden");
      }
    }

    const heatRatio = d.cooling > 0 ? d.heat / d.cooling : 2;
    const heatPct = Math.min(100, (heatRatio / 1.35) * 100);
    const heatEl = el("heat-fill");
    if (heatEl) {
      heatEl.style.width = heatPct + "%";
      heatEl.className = heatRatio > 1 ? "danger" : heatRatio > 0.86 ? "warn" : "";
    }
    setText("heat-val", formatNumber(d.heat, 1) + " / " + formatNumber(d.cooling, 1));
    const wastePct = d.wasteCap > 0 ? Math.min(100, (site.waste / d.wasteCap) * 100) : 0;
    const wasteEl = el("waste-fill");
    if (wasteEl) {
      wasteEl.style.width = wastePct + "%";
      wasteEl.className = wastePct > 92 ? "danger" : wastePct > 72 ? "warn" : "";
    }
    setText("waste-val", Math.round(wastePct) + "%");
    setText("grid-val", "€" + d.revenue.toFixed(1) + "/s");
    const status = el("status-label");
    if (status) {
      status.textContent = d.status.toUpperCase();
      status.className = "status " + d.status;
    }

    const collectBtn = el("collect-btn");
    if (collectBtn) {
      const auto = d.autoCollect;
      collectBtn.classList.toggle("disabled", auto || site.bank < 1);
      setText("collect-amount", auto ? "AUTO" : formatMoney(site.bank));
      collectBtn.setAttribute("aria-label", auto ? "Automatic collection online" : "Collect " + formatMoney(site.bank));
    }
    const boost = el("boost-btn");
    if (boost) {
      if (site.overclock.until > now) {
        boost.classList.add("active");
        boost.classList.remove("cooldown");
        setText("boost-state", "ACTIVE " + Math.ceil((site.overclock.until - now) / 1000) + "s");
      } else if (site.overclock.cooldownUntil > now) {
        boost.classList.remove("active");
        boost.classList.add("cooldown");
        setText("boost-state", "COOL " + Math.ceil((site.overclock.cooldownUntil - now) / 1000) + "s");
      } else {
        boost.classList.remove("active", "cooldown");
        setText("boost-state", "READY");
      }
    }

    renderEvent(now);

    if (!state.tutorialDone && state.tutorial < TUTORIAL.length) {
      const step = TUTORIAL[state.tutorial];
      el("tutorial").classList.remove("hidden");
      setText("tutorial-step", "STEP " + (state.tutorial + 1) + " / " + TUTORIAL.length);
      setText("tutorial-title", step.title);
      setText("tutorial-body", step.body);
    } else {
      el("tutorial").classList.add("hidden");
    }

    const stamp = Date.now();
    if (sheetOpenId && stamp - lastSheetRender > 250) {
      lastSheetRender = stamp;
      renderSheet();
    }
    if (crewOpenId && stamp - lastCrewRender > 300 && !el("crew-sheet").contains(document.activeElement)) {
      lastCrewRender = stamp;
      renderCrewSheet();
    }
    if (currentPanel && stamp - lastPanelRender > 1500 && !el("panel").contains(document.activeElement)) {
      lastPanelRender = stamp;
      renderPanel();
    }
  },

  refresh() {
    if (stateRef && dRef) this.update(stateRef, dRef, Date.now());
    if (sheetOpenId) renderSheet(true);
    if (crewOpenId) renderCrewSheet(true);
    if (currentPanel) renderPanel(true);
  },

  openSheet(zoneId) {
    const zone = zoneHit(zoneId);
    if (!zone || !stateRef) return;
    if (currentPanel) UI.closePanel();
    if (crewOpenId) UI.closeCrew();
    sheetOpenId = zoneId;
    lastSheetRender = Date.now();
    el("sheet").classList.remove("hidden");
    el("sheet").setAttribute("aria-label", zone.name);
    renderSheet(true);
    handlers.sheetOpen?.(zoneId);
  },

  closeSheet() {
    if (!sheetOpenId) return;
    sheetOpenId = null;
    el("sheet").classList.add("hidden");
    handlers.sheetClose?.();
  },

  isSheetOpen() { return Boolean(sheetOpenId || crewOpenId); },

  openCrew(id) {
    if (!characterState(stateRef, id)) return;
    if (sheetOpenId) UI.closeSheet();
    if (currentPanel) UI.closePanel();
    crewOpenId = id;
    lastCrewRender = Date.now();
    el("crew-sheet").classList.remove("hidden");
    renderCrewSheet(true);
    handlers.crewOpen?.(id);
  },

  closeCrew() {
    if (!crewOpenId) return;
    crewOpenId = null;
    el("crew-sheet").classList.add("hidden");
    handlers.crewClose?.();
  },

  openPanel(kind) {
    if (!stateRef) return;
    if (kind === "goals") kind = "world";
    if (sheetOpenId) UI.closeSheet();
    if (crewOpenId) UI.closeCrew();
    currentPanel = kind;
    lastPanelRender = Date.now();
    el("panel").classList.remove("hidden");
    el("nav").querySelectorAll("[data-nav]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-nav") === kind);
    });
    el("panel").scrollTop = 0;
    el("panel-body").scrollTop = 0;
    renderPanel(true);
    handlers.panelOpen?.(kind);
  },

  closePanel() {
    if (!currentPanel) return;
    currentPanel = null;
    el("panel").classList.add("hidden");
    el("nav").querySelectorAll("[data-nav]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-nav") === "map");
    });
    handlers.panelClose?.();
  },

  isPanelOpen() { return Boolean(currentPanel); },
  panelKind() { return currentPanel; },

  toast(text, kind) {
    const node = el("toast");
    if (!node) return;
    node.textContent = text;
    node.className = "show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.className = ""; }, 2600);
  },

  showModal(opts) {
    el("modal-title").textContent = opts.title || "";
    el("modal-body").innerHTML = opts.html || esc(opts.body || "");
    const ok = el("modal-ok");
    const cancel = el("modal-cancel");
    ok.textContent = opts.ok || "OK";
    cancel.textContent = opts.cancel || "Cancel";
    cancel.classList.toggle("hidden", opts.cancel === null);
    modalOk = opts.onOk || null;
    modalCancel = opts.onCancel || null;
    el("modal").classList.remove("hidden");
  },

  closeModal() {
    el("modal").classList.add("hidden");
    modalOk = null;
    modalCancel = null;
  },

  showOffline(report) {
    if (!report || report.seconds < 30) return;
    const rows = (report.sites || []).filter((s) => s.earned > 0 || s.data > 0).map((s) => {
      return '<div class="report-row"><span>' + esc(s.name) + '</span><b class="gold">' + esc(formatMoney(s.earned)) + "</b></div>";
    });
    const html = '<p class="modal-lead">' + COPY.offline.body + "</p>" +
      '<div class="report-row"><span>Time away</span><b>' + esc(formatTime(report.seconds)) + "</b></div>" +
      rows.join("") +
      '<div class="report-row"><span>Research data</span><b class="teal">' + esc(formatNumber(report.data)) + "</b></div>" +
      (report.capped ? '<p class="report-note">Offline production is capped at 8 hours per site. Administration upgrades extend it.</p>' : "");
    UI.showModal({
      title: COPY.offline.title,
      html,
      ok: COPY.offline.close,
      cancel: null,
    });
  },

  setSettings(settings) { this._settings = settings; },
};

/* ------------------------------------------------------------------ event */

function renderEvent(now) {
  const state = stateRef;
  const card = el("event-card");
  if (!state || !state.event) {
    card.classList.add("hidden");
    lastEventKey = "";
    return;
  }
  const ev = state.event;
  const def = EVENT_BY_ID[ev.id];
  if (!def) { card.classList.add("hidden"); return; }
  const siteName = SITE_BY_ID[ev.site] ? SITE_BY_ID[ev.site].short : "";
  const key = [ev.id, ev.mode, ev.site, state.activeSite, state.player.level,
    state.crew.roster.map((c) => c.id + ":" + c.site + ":" + c.zone).join(",")].join("|");
  card.style.setProperty("--event-colour", eventColour(def));
  if (key !== lastEventKey) {
    lastEventKey = key;
    setText("event-cat", (EVENT_CATEGORIES[def.category] || EVENT_CATEGORIES.grid).label.toUpperCase());
    setText("event-name", def.name + (ev.site !== state.activeSite ? " · " + siteName : ""));
    setText("event-body", def.body);
    const box = el("event-choices");
    if (ev.mode === "auto") {
      box.innerHTML = '<button class="event-choice" data-dismiss="1"><b>Dismiss</b><small>The effect is already running. Acknowledge it and get back to the plant.</small></button>';
      box.querySelector("[data-dismiss]").addEventListener("click", () => handlers.resolveEvent?.(-1));
    } else {
      const cs = choicesFor(state, ev);
      box.innerHTML = cs.map((c) => {
        const req = c.available ? "" : '<span class="req">Requires ' + esc(requirementLabel(c.requires)) + "</span>";
        return '<button class="event-choice ' + (c.available ? "" : "locked") + '" data-choice="' + c.index + '"' +
          (c.available ? "" : " disabled") + "><b>" + esc(c.label) + "</b><small>" + esc(c.desc) + "</small>" + req + "</button>";
      }).join("");
      box.querySelectorAll("[data-choice]").forEach((btn) => {
        btn.addEventListener("click", () => handlers.resolveEvent?.(Number(btn.getAttribute("data-choice"))));
      });
    }
  }
  card.classList.remove("hidden");
  setText("event-time", Math.max(0, Math.ceil((ev.endsAt - now) / 1000)) + "s");
}

function requirementLabel(req) {
  if (!req) return "";
  if (req.character && CREW_BY_ID[req.character]) return CREW_BY_ID[req.character].name;
  if (req.zone && ZONE_BY_ID[req.zone]) return ZONE_BY_ID[req.zone].name + " LV " + (req.level || 1);
  return "a specialist";
}

/* ------------------------------------------------------------------- sheet */

function preview(state, siteId, zoneId, level) {
  const clone = JSON.parse(JSON.stringify(state));
  clone.sites[siteId].zones[zoneId].level = level;
  return derive(clone, siteId, Date.now());
}

function renderSheet(force) {
  if (!sheetOpenId || !stateRef) return;
  const state = stateRef;
  const d = dRef;
  const site = activeState();
  const def = activeDef();
  const zone = zoneHit(sheetOpenId);
  if (!zone) return;
  const level = site.zones[zone.id] ? site.zones[zone.id].level : 0;
  const stage = stageForLevel(level);
  const u = level === 0 ? unlockInfo(state, state.activeSite, zone) : { ok: true };
  const maxed = level >= MAX_LEVEL;
  const target = maxed ? level : level + 1;
  const cost = maxed ? Infinity : upgradeCostForSite(state, state.activeSite, zone, level);
  const nextD = maxed ? d : preview(state, state.activeSite, zone.id, target);
  const affordable = site.credits >= cost;

  setText("sheet-icon", zone.icon);
  setText("sheet-name", zone.name);
  setText("sheet-role", zone.effectLabel + " · " + def.region);
  setText("sheet-level", level > 0 ? "LV " + level : "—");
  setText("sheet-desc", zone.desc);
  el("sheet-dots").innerHTML = stageDots(level, stage > 0 ? zone.stages[stage - 1] : "Not yet built");

  const currentEffect = level > 0 ? effectFor(zone, d, level, site) : "—";
  const nextEffect = maxed ? "—" : effectFor(zone, nextD, target, site);
  const assignee = state.crew.roster.find((c) => c.site === state.activeSite && c.zone === zone.id);
  el("sheet-stats").innerHTML =
    '<div class="stat-row"><span>' + esc(zone.effectLabel) + "</span><b>" + esc(currentEffect) +
    (maxed ? "" : '<em>' + esc(nextEffect) + "</em>") + "</b></div>" +
    '<div class="stat-row"><span>Plant output</span><b>' + esc(formatMW(d.netMW)) + "</b></div>" +
    (zone.id === "battery" && level > 0
      ? '<div class="stat-row"><span>Battery charge</span><b>' + Math.round(d.batteryCharge) + " / " + Math.round(d.batteryCap) + "</b></div>"
      : "") +
    (assignee
      ? '<div class="stat-row"><span>Operator</span><b>' + esc(CREW_BY_ID[assignee.id].name) + " · LV " + assignee.level + "</b></div>"
      : "") +
    '<div class="stat-row"><span>Status</span><b class="status-' + esc(d.status) + '">' + esc(d.status.toUpperCase()) + "</b></div>";

  const nextStage = nextStageLevel(level);
  let nextLine;
  if (level === 0) {
    nextLine = zone.unlock
      ? "Requires " + ZONE_BY_ID[zone.unlock.zone].name + " level " + zone.unlock.level + "."
      : "Ready to build.";
  } else if (maxed) {
    nextLine = COPY.sheet.max + ".";
  } else if (nextStage) {
    nextLine = COPY.sheet.nextTier + " " + nextStage + " · " + STAGE_NAMES[stage] + ".";
  } else {
    nextLine = "Final silhouette installed.";
  }
  setText("sheet-next", nextLine);

  const btn = el("sheet-upgrade");
  btn.className = "btn primary";
  if (maxed) {
    btn.textContent = COPY.sheet.max;
    btn.disabled = true;
    setText("sheet-cost", "");
  } else if (!u.ok) {
    btn.textContent = COPY.sheet.locked;
    btn.disabled = true;
    setText("sheet-cost", "Need " + ZONE_BY_ID[zone.unlock.zone].name + " LV " + zone.unlock.level);
  } else {
    btn.textContent = (level === 0 ? COPY.sheet.build : COPY.sheet.upgrade) + " · " + formatMoney(cost);
    btn.disabled = false;
    btn.classList.toggle("warn", !affordable);
    setText("sheet-cost", affordable ? (level === 0 ? "Ready to build" : "Next level") : COPY.sheet.notEnough);
  }
  const extra = el("sheet-action2");
  if (zone.id === "battery" && level > 0) {
    extra.classList.remove("hidden");
    extra.textContent = d.discharging ? "DISCHARGING" : "DISCHARGE";
    extra.disabled = d.discharging || d.batteryCharge <= 0;
    extra.onclick = () => handlers.discharge?.();
  } else {
    extra.classList.add("hidden");
    extra.onclick = null;
  }
  el("sheet").scrollTop = force ? 0 : el("sheet").scrollTop;
}

/* -------------------------------------------------------------------- crew */

function renderCrewSheet(force) {
  if (!crewOpenId || !stateRef) return;
  const state = stateRef;
  const def = CREW_BY_ID[crewOpenId];
  const member = characterState(state, crewOpenId);
  if (!def || !member) { UI.closeCrew(); return; }
  const now = Date.now();
  const site = activeState();
  const defSite = activeDef();
  const rarity = rarityOf(def);
  setHTML("crew-portrait", portraitSVG(def));
  setText("crew-name", def.name);
  setText("crew-role", def.role);
  setText("crew-level", "LV " + member.level);
  setText("crew-bio", def.bio);
  const pref = member.zone === def.preferred;
  const passive = passiveLabel(def, member.level, pref);
  const next = crewNextXp(member.level);
  setHTML("crew-xp",
    '<div class="stat-row"><span>XP</span><b>' + Math.round(member.xp) + (next ? " / " + next : " · MAX") + "</b></div>" +
    '<div class="stat-row"><span>Rarity</span><b style="color:' + rarity.colour + '">' + rarity.label.toUpperCase() + "</b></div>");
  setHTML("crew-stats",
    '<div class="stat-row"><span>Passive · ' + esc(def.passive.label) + '</span><b>' + passive + (pref ? " · full" : " · half") + "</b></div>" +
    '<div class="stat-row"><span>Preferred plot</span><b>' + esc(ZONE_BY_ID[def.preferred] ? ZONE_BY_ID[def.preferred].name : "Any") + "</b></div>" +
    '<div class="stat-row"><span>Active</span><b>' + esc(def.active.name) + "</b></div>" +
    '<div class="stat-row"><span>Effect</span><b>' + esc(def.active.label) + "</b></div>");
  setText("crew-quote", "“" + def.quote + "”");

  const select = el("crew-zone");
  let options = '<option value="">Unassigned</option>';
  for (const zone of siteZones(defSite)) {
    const selected = member.site === state.activeSite && member.zone === zone.id ? " selected" : "";
    const lvl = site.zones[zone.id] ? site.zones[zone.id].level : 0;
    options += '<option value="' + state.activeSite + ":" + zone.id + '"' + selected + (lvl < 1 ? " disabled" : "") + ">" + esc(zone.name) + " · LV " + lvl + "</option>";
  }
  if (member.site && member.site !== state.activeSite) {
    const other = SITE_BY_ID[member.site];
    const z = other && ZONE_BY_ID[member.zone] ? ZONE_BY_ID[member.zone].name : member.zone;
    options = '<option value="">Unassigned (currently ' + esc(other ? other.short : member.site) + " · " + esc(z) + ")</option>" + options;
  }
  select.innerHTML = options;
  select.value = member.site === state.activeSite && member.zone ? state.activeSite + ":" + member.zone : "";
  setText("crew-assigned", member.site
    ? "Assigned to " + SITE_BY_ID[member.site].short + " · " + (ZONE_BY_ID[member.zone] ? ZONE_BY_ID[member.zone].name : member.zone)
    : "Unassigned");

  const ability = el("crew-ability");
  const ready = abilityReadyAt(state, member.id);
  if (member.site !== state.activeSite) {
    ability.textContent = "Assign to this site";
    ability.disabled = true;
  } else if (ready > now) {
    ability.textContent = "COOLDOWN " + Math.ceil((ready - now) / 1000) + "s";
    ability.disabled = true;
  } else {
    ability.textContent = def.active.name.toUpperCase();
    ability.disabled = false;
  }
}

/* ------------------------------------------------------------------- panel */

function renderPanel(force) {
  if (!currentPanel || !stateRef) return;
  const state = stateRef;
  const d = dRef;
  const def = activeDef();
  const site = activeState();
  const body = el("panel-body");
  const scroll = body.scrollTop;
  const title = el("panel-title");

  if (currentPanel === "plants") {
    title.textContent = COPY.plants.title + " · " + def.region;
    body.innerHTML = '<p class="panel-sub">' + COPY.plants.subtitle + "</p>" +
      siteZones(def).map((zone) => {
        const level = site.zones[zone.id] ? site.zones[zone.id].level : 0;
        const status = zoneStatus(zone, state, state.activeSite);
        const effect = level > 0 ? effectFor(zone, d, level, site) : "Not contributing";
        return '<button class="plant-row" data-zone="' + zone.id + '">' +
          '<span class="plant-icon">' + zone.icon + "</span>" +
          '<span class="plant-main"><b>' + esc(zone.name) + "</b><small>" + esc(effect) + "</small></span>" +
          '<span class="plant-status ' + status.cls + '">' + esc(status.label) + "</span>" +
          '<span class="chev">›</span></button>';
      }).join("");
    body.querySelectorAll("[data-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-zone");
        handlers.focusZone?.(id);
        UI.openSheet(id);
      });
    });
  } else if (currentPanel === "research") {
    title.textContent = COPY.research.title;
    const lab = Math.max(...Object.values(state.sites).map((s) => s.zones.lab ? s.zones.lab.level : 0));
    const byTier = {};
    for (const r of RESEARCH) {
      if (!byTier[r.lab]) byTier[r.lab] = [];
      byTier[r.lab].push(r);
    }
    body.innerHTML = '<p class="panel-sub">' + COPY.research.subtitle + "</p>" +
      '<div class="data-line"><span>Research data</span><b>' + formatNumber(state.data) + "</b></div>" +
      '<div class="data-line"><span>Best lab across the network</span><b>LV ' + lab + "</b></div>" +
      (lab < 1 ? '<div class="empty-note">' + COPY.research.empty + "</div>" : "") +
      Object.keys(byTier).sort((a, b) => a - b).map((tier) => {
        const req = byTier[tier][0].lab;
        return '<div class="tier-label">LAB LEVEL ' + req + (lab >= req ? " · OPEN" : " · LOCKED") + "</div>" +
          byTier[tier].map((r) => {
            const owned = Boolean(state.research[r.id]);
            const can = !owned && lab >= r.lab && state.data >= r.cost;
            const cost = owned ? "INSTALLED" : r.cost + " data";
            return '<div class="research-row ' + (owned ? "owned" : "") + '">' +
              '<div class="research-copy"><b>' + esc(r.name) + "</b><small>" + esc(r.desc) + "</small>" +
              '<span class="req">Lab LV ' + r.lab + "</span></div>" +
              '<button class="btn small ' + (owned ? "owned" : can ? "primary" : "ghost") + '" data-research="' + r.id + '"' +
              (owned ? " disabled" : "") + ">" + esc(cost) + "</button></div>";
          }).join("");
      }).join("") +
      '<p class="panel-note">' + COPY.research.resetNote + "</p>";
    body.querySelectorAll("[data-research]").forEach((btn) => {
      btn.addEventListener("click", () => handlers.research?.(btn.getAttribute("data-research")));
    });
  } else if (currentPanel === "crew") {
    title.textContent = "Crew";
    const roster = state.crew.roster;
    const open = candidates(state);
    const slots = crewSlots(state, state.activeSite);
    const used = crewUsed(state, state.activeSite);
    body.innerHTML = '<p class="panel-sub">Assign operators to plots. A preferred plot gets the full passive; anywhere else gives half. Slots: ' + used + " / " + slots + ".</p>" +
      '<div class="section-title">HIRED · ' + roster.length + " / " + CREW.length + "</div>" +
      (roster.length ? '<div class="crew-grid">' + roster.map((member) => {
        const c = CREW_BY_ID[member.id];
        const rarity = rarityOf(c);
        const assigned = member.site ? SITE_BY_ID[member.site].short + " · " + (ZONE_BY_ID[member.zone] ? ZONE_BY_ID[member.zone].name : member.zone) : "Unassigned";
        return '<div class="crew-card"><div class="portrait">' + portraitSVG(c) + "</div>" +
          '<div class="crew-card-main"><b>' + esc(c.name) + '</b><small>' + esc(c.role) + " · " + assigned + "</small>" +
          '<em>' + esc(passiveLabel(c, member.level, member.zone === c.preferred)) + " passive · LV " + member.level + "</em></div>" +
          '<div class="crew-actions"><span class="rarity ' + c.rarity + '">' + rarity.label + "</span>" +
          '<button class="btn small ghost" data-crew="' + member.id + '">Open</button></div></div>';
      }).join("") + "</div>" : '<div class="empty-note">No crew hired yet. Complete milestones to unlock candidates.</div>') +
      '<div class="section-title">CANDIDATES · ' + open.length + "</div>" +
      (open.length ? '<div class="crew-grid">' + open.map((c) => {
        const can = site.credits >= c.cost.credits && state.data >= c.cost.data;
        return '<div class="crew-card"><div class="portrait">' + portraitSVG(c) + "</div>" +
          '<div class="crew-card-main"><b>' + esc(c.name) + '</b><small>' + esc(c.role) + " · " + rarityOf(c).label + "</small>" +
          '<em>' + esc(c.passive.label) + "</em></div>" +
          '<div class="crew-actions"><button class="btn small ' + (can ? "primary" : "ghost") + '" data-hire="' + c.id + '">' +
          (c.cost.credits ? formatMoney(c.cost.credits) : "FREE") + (c.cost.data ? " · " + c.cost.data + " data" : "") + "</button></div></div>";
      }).join("") + "</div>" : '<div class="empty-note">All available candidates are hired. New ones unlock through milestones.</div>') +
      '<p class="crew-note">Hiring is deterministic: milestones reveal candidates; credits and data hire them. No random packs.</p>';
    body.querySelectorAll("[data-crew]").forEach((btn) => {
      btn.addEventListener("click", () => UI.openCrew(btn.getAttribute("data-crew")));
    });
    body.querySelectorAll("[data-hire]").forEach((btn) => {
      btn.addEventListener("click", () => handlers.hireCrew?.(btn.getAttribute("data-hire")));
    });
  } else if (currentPanel === "world") {
    title.textContent = "World";
    const active = state.activeSite;
    const totalMW = Object.values(state.sites).reduce((sum, s) => sum + (s.maxMW || 0), 0);
    body.innerHTML = '<p class="panel-sub">Three sites, one director, one grid. Inactive sites keep producing at 25%.</p>' +
      '<div class="data-line"><span>Network output</span><b>' + formatMW(totalMW) + "</b></div>" +
      '<div class="site-list">' + SITE_ORDER.map((id) => siteCard(state, id)).join("") + "</div>" +
      '<div class="section-title">SHIFT GOALS</div>' +
      (state.missions.active.length
        ? state.missions.active.map((id) => {
          const m = MISSION_BY_ID[id];
          if (!m) return "";
          return '<div class="mission-row"><div><b>' + esc(m.title) + "</b><small>" + esc(m.desc) + "</small></div>" +
            '<span class="reward">+€' + formatNumber(m.credits) + (m.data ? " · +" + m.data + " data" : "") + (m.xp ? " · +" + m.xp + " XP" : "") + "</span></div>";
        }).join("")
        : '<div class="empty-note">' + COPY.goals.empty + "</div>") +
      '<div class="goals-foot"><span>Goals completed</span><b>' + state.missions.done.length + " / " + 60 + "</b></div>" +
      '<div class="section-title">EVENT LOG</div>' +
      (state.eventLog.length
        ? '<div class="event-log-row"><b>Recent events</b><span>' + state.eventLog.length + "</span></div>" +
          state.eventLog.slice().reverse().slice(0, 8).map((e) => {
            const defE = EVENT_BY_ID[e.id];
            return '<div class="event-log-row"><div><b>' + esc(defE ? defE.name : e.id) + "</b><small>" +
              esc(SITE_BY_ID[e.site] ? SITE_BY_ID[e.site].short : "") + (e.choiceLabel ? " · " + esc(e.choiceLabel) : "") +
              "</small></div><span>" + new Date(e.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + "</span></div>";
          }).join("")
        : '<div class="empty-note">No events yet. The valley is quiet.</div>') +
      '<div class="section-title">ACHIEVEMENTS · ' + Object.keys(state.achievements).length + " / " + ACHIEVEMENTS.length + "</div>" +
      ACHIEVEMENTS.map((a) => {
        const got = Boolean(state.achievements[a.id]);
        return '<div class="achievement-row ' + (got ? "" : "locked") + '"><div><b>' + esc(a.name) + "</b><small>" + esc(a.desc) + "</small></div>" +
          '<span class="' + (got ? "tick" : "") + '">' + (got ? "✓" : "—") + "</span></div>";
      }).join("");
    body.querySelectorAll("[data-site]").forEach((btn) => {
      btn.addEventListener("click", () => handlers.siteAction?.(btn.getAttribute("data-site")));
    });
    body.querySelectorAll("[data-prestige]").forEach((btn) => {
      btn.addEventListener("click", () => handlers.prestige?.(btn.getAttribute("data-prestige")));
    });
  } else if (currentPanel === "settings") {
    title.textContent = COPY.settings.title;
    const settings = handlers.getSettings ? handlers.getSettings() : { sound: true, motion: false };
    body.innerHTML =
      '<div class="settings-group">' +
      toggleRow("sound", COPY.settings.sound, settings.sound) +
      toggleRow("motion", COPY.settings.motion, settings.motion) +
      "</div>" +
      '<div class="settings-group">' +
      '<div class="meta-row"><span>Director</span><b>LV ' + state.player.level + " · " + formatNumber(state.player.xp) + " XP</b></div>" +
      '<div class="meta-row"><span>Network</span><b>' + SITES.filter((s) => state.sites[s.id].unlocked).length + " / 3 sites</b></div>" +
      '<div class="meta-row"><span>Isotopes</span><b class="teal">' + state.isotopes + "</b></div>" +
      '<div class="meta-row"><span>Best network output</span><b>' + formatMW(state.stats.bestMW || 0) + "</b></div>" +
      "</div>" +
      '<div class="section-title">' + def.region.toUpperCase() + "</div>" +
      '<div class="meta-row"><span>Generation</span><b>' + site.generation + "</b></div>" +
      '<div class="meta-row"><span>Prestige threshold</span><b>' + formatMW(def.prestigeMW) + "</b></div>" +
      (canPrestige(state, state.activeSite)
        ? '<button class="btn primary wide" id="settings-prestige">' + COPY.prestige.title + " · +" + prestigeGain(state, state.activeSite) + " isotopes</button>"
        : '<div class="prestige-locked"><b>' + COPY.prestige.title + "</b><span>" + COPY.prestige.require + "</span></div>") +
      '<div class="settings-group">' +
      '<button class="btn ghost wide" id="export-btn">' + COPY.settings.exportSave + "</button>" +
      '<button class="btn ghost wide" id="import-btn">' + COPY.settings.importSave + "</button>" +
      '<button class="btn danger wide" id="reset-btn">' + COPY.settings.reset + "</button>" +
      "</div>" +
      '<p class="about">' + COPY.settings.about + "</p>" +
      '<p class="about dim">' + COPY.settings.credits + "</p>";
    body.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => handlers.toggle?.(btn.getAttribute("data-toggle")));
    });
    const ex = el("export-btn"); if (ex) ex.addEventListener("click", () => handlers.exportSave?.());
    const im = el("import-btn"); if (im) im.addEventListener("click", () => el("import-file").click());
    const rs = el("reset-btn"); if (rs) rs.addEventListener("click", () => handlers.reset?.());
    const sp = el("settings-prestige"); if (sp) sp.addEventListener("click", () => handlers.prestige?.(state.activeSite));
  }

  body.scrollTop = force ? 0 : scroll;
}

function siteCard(state, id) {
  const def = SITE_BY_ID[id];
  const site = state.sites[id];
  const active = state.activeSite === id;
  const can = canPrestige(state, id);
  const req = def.unlock;
  const stateLabel = active ? "ACTIVE" : site.unlocked ? "IDLE 25%" : "LOCKED";
  const mods = def.modifierText.map((m) => "<span>" + esc(m) + "</span>").join("");
  let actions = "";
  if (site.unlocked) {
    actions += '<button class="btn ' + (active ? "ghost" : "primary") + '" data-site="' + id + '"' + (active ? " disabled" : "") + ">" +
      (active ? "Current site" : "Travel") + "</button>";
    if (can) actions += '<button class="btn small ghost" data-prestige="' + id + '">Prestige +' + prestigeGain(state, id) + "</button>";
  } else {
    const need = [];
    if (req && req.director) need.push("Director LV " + req.director);
    if (req && req.isotopes) need.push(req.isotopes + " isotopes");
    actions += '<button class="btn ghost" data-site="' + id + '">Unlock · ' + esc(need.join(" · ")) + "</button>";
  }
  return '<div class="site-card ' + (active ? "active" : "") + " " + (site.unlocked ? "" : "locked") + '">' +
    '<div class="site-card-head"><span class="site-icon" style="color:' + def.accent + '">' + def.icon + "</span>" +
    '<div><h3>' + esc(def.name) + ' <span class="site-state">' + stateLabel + "</span></h3><span>" + esc(def.region) + "</span></div></div>" +
    '<p>' + esc(def.tagline) + "</p>" +
    '<div class="site-mods">' + mods + "</div>" +
    '<div class="site-stats"><span>CREDITS <b>' + formatMoney(site.credits) + "</b></span><span>BANK <b>" + formatMoney(site.bank) + "</b></span><span>MW <b>" + formatMW(site.maxMW || 0) + "</b></span></div>" +
    '<div class="site-actions">' + actions + "</div></div>";
}

export { portraitSVG };
