/*
 * CORE 9 — save shape and state hygiene.
 *
 * Version 2 is a network: three sites with their own credits, banks, waste,
 * zones and prestige, plus global data, isotopes, research, missions, crew,
 * director XP and achievements. Version 1 saves migrate into the River
 * Valley site without losing their plant.
 *
 * The simulation is plain serialisable data: no class instances, no DOM, no
 * hidden timers. That is what lets the balance bot run the same rules in Node.
 */

import { SITES, SITE_BY_ID, SITE_ORDER } from "../data/sites.js";
import { MAX_LEVEL, ZONE_BY_ID } from "../data/zones.js";
import { initialMissions, MISSION_BY_ID, RESEARCH_BY_ID } from "../data/progression.js";
import { CREW_BY_ID, XP_LEVELS } from "../data/crew.js";
import { EVENT_BY_ID } from "../data/events.js";

export const SAVE_VERSION = 2;
export const SAVE_KEY = "core9-pwa-save";
export const HIGH_KEY = "core9-pwa";

export const DIRECTOR_XP = [
  0, 60, 150, 300, 500, 800, 1200, 1700, 2400, 3300,
  4500, 6000, 8000, 10500, 13500, 17000, 21000, 26000, 32000, 39000,
  47000, 56000, 66000, 78000, 92000, 108000, 126000, 146000, 168000, 192000,
];

export function levelFromXp(xp) {
  let level = 1;
  for (let i = 0; i < DIRECTOR_XP.length; i++) {
    if (xp >= DIRECTOR_XP[i]) level = i + 1;
  }
  return Math.min(30, level);
}

export function addPlayerXp(state, amount) {
  if (!(amount > 0)) return 0;
  const before = state.player.level;
  state.player.xp += amount;
  state.player.level = levelFromXp(state.player.xp);
  return state.player.level - before;
}

export function xpForLevel(level) {
  return DIRECTOR_XP[Math.max(0, Math.min(DIRECTOR_XP.length - 1, level - 1))] || 0;
}

export function batteryCapacityForLevel(level) {
  return level > 0 ? 100 * Math.pow(1.6, level - 1) : 0;
}

export function wasteCapacity(state, siteId = state.activeSite) {
  const site = state.sites[siteId];
  const level = site && site.zones.waste ? site.zones.waste.level : 0;
  return level > 0 ? 250 * Math.pow(1.55, level - 1) : 120;
}

export function createSiteState(siteDef, now, unlocked = false) {
  const zones = {};
  siteDef.zoneIds.forEach((id) => {
    zones[id] = { level: id === "reactor" ? 1 : 0 };
  });
  return {
    unlocked: Boolean(unlocked || siteDef.id === "core9"),
    credits: siteDef.startCredits,
    bank: 0,
    waste: 0,
    zones,
    generation: 1,
    maxMW: 0,
    bestMW: 0,
    overclock: { until: 0, cooldownUntil: 0 },
    autoT: 0,
    battery: { charge: 0, dischargeUntil: 0, everDischarged: false },
    uniqueZone: siteDef.uniqueZone,
  };
}

export function createInitialState(now = Date.now()) {
  const sites = {};
  SITES.forEach((site) => {
    sites[site.id] = createSiteState(site, now, site.id === "core9");
  });

  return {
    v: SAVE_VERSION,
    activeSite: "core9",
    player: { level: 1, xp: 0 },
    sites,
    data: 0,
    isotopes: 0,
    research: {},
    missions: initialMissions(),
    stats: {
      earned: 0,
      collected: 0,
      upgrades: 0,
      builds: 0,
      maxMW: 0,
      bestMW: 0,
      prestiges: 0,
      offlineEarned: 0,
      events: 0,
      eventsResolved: 0,
      abilitiesUsed: 0,
      batteryDischarges: 0,
      playTime: 0,
      energy: 0,
      sitesVisited: ["core9"],
      crewHired: 0,
    },
    crew: {
      roster: [],
      cooldowns: {},
      lastRefresh: now,
    },
    buffs: [],
    event: null,
    eventLog: [],
    nextEventAt: now + 90_000,
    lastEventId: null,
    achievements: {},
    tutorial: 0,
    tutorialDone: false,
    startedAt: now,
    lastSeen: now,
  };
}

function num(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

function sanitizeCrew(rawCrew, now) {
  const crew = { roster: [], cooldowns: {}, lastRefresh: num(rawCrew && rawCrew.lastRefresh, now) };
  const seen = new Set();
  const roster = rawCrew && Array.isArray(rawCrew.roster) ? rawCrew.roster : [];
  for (const raw of roster) {
    if (!raw || !CREW_BY_ID[raw.id] || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const level = clamp(Math.floor(num(raw.level, 1)), 1, 5);
    const xp = Math.max(0, num(raw.xp, 0));
    let site = raw.site && SITE_BY_ID[raw.site] ? raw.site : null;
    let zoneId = raw.zone && ZONE_BY_ID[raw.zone] ? raw.zone : null;
    if (site && !zoneId) site = null;
    if (zoneId && !site) zoneId = null;
    if (site && zoneId && !SITE_BY_ID[site].zoneIds.includes(zoneId)) { site = null; zoneId = null; }
    if (site && zoneId && crew.roster.some((c) => c.site === site && c.zone === zoneId)) { site = null; zoneId = null; }
    crew.roster.push({
      id: raw.id,
      level,
      xp,
      site,
      zone: zoneId,
      traits: Array.isArray(raw.traits) ? raw.traits.slice(0, 3) : [],
    });
  }
  if (rawCrew && rawCrew.cooldowns && typeof rawCrew.cooldowns === "object") {
    for (const [id, until] of Object.entries(rawCrew.cooldowns)) {
      if (CREW_BY_ID[id] && Number.isFinite(Number(until))) crew.cooldowns[id] = Number(until);
    }
  }
  return crew;
}

function sanitizeBuffs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b) => b && typeof b === "object" && Number(b.until) > 0).slice(-20);
}

/*
 * Merge a stored object over a fresh state, then make it safe. A save from
 * v1 becomes a River Valley site; a save from a future build loses what it
 * cannot understand rather than corrupting the core.
 */
export function sanitizeState(raw, now = Date.now()) {
  const base = createInitialState(now);
  if (!raw || typeof raw !== "object") return base;

  const legacy = !raw.sites && (raw.v === 1 || raw.zones);
  if (legacy) {
    const core = createSiteState(SITE_BY_ID.core9, now, true);
    core.credits = Math.max(0, num(raw.credits, core.credits));
    core.bank = Math.max(0, num(raw.bank, 0));
    core.waste = Math.max(0, num(raw.waste, 0));
    core.generation = Math.max(1, Math.floor(num(raw.generation, 1)));
    core.maxMW = Math.max(0, num(raw.stats && raw.stats.maxMW, 0));
    core.bestMW = Math.max(core.maxMW, num(raw.stats && raw.stats.bestMW, 0));
    core.overclock = {
      until: num(raw.overclock && raw.overclock.until, 0),
      cooldownUntil: num(raw.overclock && raw.overclock.cooldownUntil, 0),
    };
    core.autoT = Math.max(0, num(raw.autoT, 0));
    if (raw.zones && typeof raw.zones === "object") {
      for (const id of SITE_BY_ID.core9.zoneIds) {
        const rz = raw.zones[id];
        const level = rz && typeof rz === "object" ? rz.level : rz;
        const fallback = id === "reactor" ? 1 : 0;
        core.zones[id] = { level: clamp(Math.floor(num(level, fallback)), 0, MAX_LEVEL) };
      }
    }
    base.sites.core9 = core;
    base.activeSite = "core9";
    base.data = Math.max(0, num(raw.data, 0));
    base.isotopes = Math.max(0, Math.floor(num(raw.isotopes, 0)));
    base.research = sanitizeResearch(raw.research);
    base.missions = sanitizeMissions(raw.missions);
    base.stats = sanitizeStats(raw.stats);
    base.player.xp = base.stats.upgrades * 3 + base.stats.prestiges * 100;
    base.player.level = levelFromXp(base.player.xp);
    base.tutorial = clamp(Math.floor(num(raw.tutorial, 0)), 0, 99);
    base.tutorialDone = Boolean(raw.tutorialDone);
    base.startedAt = num(raw.startedAt, now);
    base.lastSeen = num(raw.lastSeen, now);
    base.nextEventAt = num(raw.nextEventAt, now + 90_000);
    base.lastEventId = typeof raw.lastEventId === "string" ? raw.lastEventId : null;
    base.stats.sitesVisited = ["core9"];
    return finishSanitize(base, raw, now);
  }

  /* Already v2 (or close enough to merge). */
  const s = base;
  s.activeSite = raw.activeSite && SITE_BY_ID[raw.activeSite] ? raw.activeSite : "core9";
  s.data = Math.max(0, num(raw.data, 0));
  s.isotopes = Math.max(0, Math.floor(num(raw.isotopes, 0)));
  s.research = sanitizeResearch(raw.research);
  s.missions = sanitizeMissions(raw.missions);
  s.stats = sanitizeStats(raw.stats);
  s.player = sanitizePlayer(raw.player, s.stats);
  s.crew = sanitizeCrew(raw.crew, now);
  s.buffs = sanitizeBuffs(raw.buffs);
  s.eventLog = Array.isArray(raw.eventLog) ? raw.eventLog.slice(-20) : [];
  s.achievements = raw.achievements && typeof raw.achievements === "object" ? { ...raw.achievements } : {};
  s.tutorial = clamp(Math.floor(num(raw.tutorial, 0)), 0, 99);
  s.tutorialDone = Boolean(raw.tutorialDone);
  s.startedAt = num(raw.startedAt, now);
  s.lastSeen = num(raw.lastSeen, now);
  s.nextEventAt = num(raw.nextEventAt, now + 90_000);
  s.lastEventId = typeof raw.lastEventId === "string" ? raw.lastEventId : null;

  if (raw.sites && typeof raw.sites === "object") {
    for (const siteDef of SITES) {
      const rs = raw.sites[siteDef.id];
      const site = createSiteState(siteDef, now, siteDef.id === "core9" || Boolean(rs && rs.unlocked));
      if (rs && typeof rs === "object") {
        site.unlocked = siteDef.id === "core9" || Boolean(rs.unlocked);
        site.credits = Math.max(0, num(rs.credits, site.credits));
        site.bank = Math.max(0, num(rs.bank, 0));
        site.waste = Math.max(0, num(rs.waste, 0));
        site.generation = Math.max(1, Math.floor(num(rs.generation, 1)));
        site.maxMW = Math.max(0, num(rs.maxMW, 0));
        site.bestMW = Math.max(site.maxMW, num(rs.bestMW, 0));
        site.autoT = Math.max(0, num(rs.autoT, 0));
        site.overclock = {
          until: num(rs.overclock && rs.overclock.until, 0),
          cooldownUntil: num(rs.overclock && rs.overclock.cooldownUntil, 0),
        };
        site.battery = {
          charge: Math.max(0, num(rs.battery && rs.battery.charge, 0)),
          dischargeUntil: num(rs.battery && rs.battery.dischargeUntil, 0),
          everDischarged: Boolean(rs.battery && rs.battery.everDischarged),
        };
        if (rs.zones && typeof rs.zones === "object") {
          for (const id of siteDef.zoneIds) {
            const rawZone = rs.zones[id];
            const level = rawZone && typeof rawZone === "object" ? rawZone.level : rawZone;
            const fallback = id === "reactor" ? 1 : 0;
            site.zones[id] = { level: clamp(Math.floor(num(level, fallback)), 0, MAX_LEVEL) };
          }
        }
      }
      s.sites[siteDef.id] = site;
    }
  }

  if (raw.event && typeof raw.event === "object" && Number(raw.event.endsAt) > now && EVENT_BY_ID[raw.event.id]) {
    s.event = {
      id: String(raw.event.id),
      endsAt: Number(raw.event.endsAt),
      mode: raw.event.mode === "auto" ? "auto" : "choice",
      site: raw.event.site && SITE_BY_ID[raw.event.site] ? raw.event.site : s.activeSite,
    };
  }

  return finishSanitize(s, raw, now);
}

function sanitizeResearch(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw)) {
    if (RESEARCH_BY_ID[id] && value) out[id] = true;
  }
  return out;
}

function sanitizeMissions(raw) {
  const out = initialMissions();
  if (!raw || typeof raw !== "object") return out;
  const active = Array.isArray(raw.active) ? raw.active.filter((id) => MISSION_BY_ID[id]).slice(0, 3) : [];
  const done = Array.isArray(raw.done) ? raw.done.filter((id) => MISSION_BY_ID[id]) : [];
  out.active = active;
  out.done = Array.from(new Set(done));
  out.completions = Math.max(0, Math.floor(num(raw.completions, 0)));
  while (out.active.length < 3) {
    const next = Object.keys(MISSION_BY_ID).find((id) => !out.active.includes(id) && !out.done.includes(id));
    if (!next) break;
    out.active.push(next);
  }
  return out;
}

function sanitizeStats(raw) {
  const stats = {
    earned: 0, collected: 0, upgrades: 0, builds: 0, maxMW: 0, bestMW: 0,
    prestiges: 0, offlineEarned: 0, events: 0, eventsResolved: 0,
    abilitiesUsed: 0, batteryDischarges: 0, playTime: 0, energy: 0,
    sitesVisited: ["core9"], crewHired: 0,
  };
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(stats)) {
      if (key === "sitesVisited") continue;
      stats[key] = Math.max(0, num(raw[key], stats[key]));
    }
    if (Array.isArray(raw.sitesVisited)) {
      stats.sitesVisited = Array.from(new Set(["core9", ...raw.sitesVisited.filter((id) => SITE_BY_ID[id])]));
    }
  }
  return stats;
}

function sanitizePlayer(raw, stats) {
  const xp = Math.max(0, num(raw && raw.xp, stats.upgrades * 3 + stats.prestiges * 100));
  return { xp, level: levelFromXp(xp) };
}

function finishSanitize(s, raw, now) {
  if (!s.sites[s.activeSite] || !s.sites[s.activeSite].unlocked) s.activeSite = "core9";
  s.sites.core9.unlocked = true;
  for (const member of s.crew.roster) {
    if (!member.site || !member.zone) { member.site = null; member.zone = null; continue; }
    const site = s.sites[member.site];
    if (!site || !site.zones[member.zone] || site.zones[member.zone].level < 1) {
      member.site = null;
      member.zone = null;
    }
  }
  for (const site of Object.values(s.sites)) {
    site.waste = clamp(site.waste, 0, wasteCapacity(s, SITE_ORDER.find((id) => s.sites[id] === site) || "core9"));
    const batteryLevel = site.zones.battery ? site.zones.battery.level : 0;
    const batteryCap = batteryCapacityForLevel(batteryLevel);
    site.battery.charge = batteryCap > 0 ? clamp(site.battery.charge, 0, batteryCap) : 0;
    if (site.overclock && site.overclock.until < now) site.overclock.until = 0;
    if (site.overclock && site.overclock.cooldownUntil < now) site.overclock.cooldownUntil = 0;
  }
  s.player.level = levelFromXp(s.player.xp);
  s.stats.maxMW = Math.max(s.stats.maxMW, ...Object.values(s.sites).map((x) => x.maxMW || 0));
  s.stats.bestMW = Math.max(s.stats.bestMW, s.stats.maxMW, ...Object.values(s.sites).map((x) => x.bestMW || 0));
  s.stats.crewHired = Math.max(s.stats.crewHired, s.crew.roster.length);
  return s;
}

export function serializeState(state) {
  return JSON.parse(JSON.stringify(state));
}

export { XP_LEVELS, CREW_BY_ID };
