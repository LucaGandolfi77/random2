/*
 * CORE 9 — event engine.
 *
 * A small effects vocabulary instead of a scripting language:
 * credits, data, director XP, crew XP, waste, battery, a temporary buff, or
 * cancelling/delaying the next event. Choice events wait for a decision and
 * fall back to their default when the timer expires.
 */

import { EVENTS, EVENT_BY_ID, eventColour } from "../data/events.js";
import { SITE_BY_ID } from "../data/sites.js";
import { CREW_BY_ID } from "../data/crew.js";
import { addPlayerXp, wasteCapacity, batteryCapacityForLevel } from "./state.js";
import { addCrewXp, characterState } from "./crew.js";

export function eventPool(state, siteId, rand = Math.random) {
  const recent = new Set(state.eventLog.slice(-2).map((e) => e.id));
  const pool = EVENTS.filter((e) => {
    if (e.sites && !e.sites.includes(siteId)) return false;
    if (e.minDirector && state.player.level < e.minDirector) return false;
    return true;
  });
  return pool.length ? pool : EVENTS.filter((e) => !e.sites || e.sites.includes(siteId));
}

export function pickEvent(state, siteId, rand = Math.random) {
  const pool = eventPool(state, siteId, rand);
  const recent = new Set(state.eventLog.slice(-2).map((e) => e.id));
  const candidates = pool.filter((e) => !recent.has(e.id));
  const list = candidates.length ? candidates : pool;
  let total = 0;
  for (const e of list) total += e.weight || 1;
  let roll = rand() * total;
  for (const e of list) {
    roll -= e.weight || 1;
    if (roll <= 0) return e.id;
  }
  return list[list.length - 1].id;
}

export function choiceAvailable(state, choice, siteId) {
  if (!choice.requires) return true;
  const req = choice.requires;
  if (req.character) {
    const member = characterState(state, req.character);
    return Boolean(member && member.site === siteId);
  }
  if (req.zone) {
    const site = state.sites[siteId];
    return Boolean(site && site.zones[req.zone] && site.zones[req.zone].level >= (req.level || 1));
  }
  return true;
}

function pushBuff(state, siteId, buff, duration, source, now = Date.now()) {
  if (!buff) return;
  state.buffs.push({
    id: "event:" + source + ":" + now,
    until: now + (duration || 30) * 1000,
    site: siteId,
    source,
    ...buff,
  });
}

export function applyEffects(state, effects, siteId, now = Date.now(), source = "Event") {
  if (!effects) return;
  const site = state.sites[siteId];
  if (!site) return;
  if (effects.credits) site.credits = Math.max(0, site.credits + effects.credits);
  if (effects.data) state.data = Math.max(0, state.data + effects.data);
  if (effects.xp) addPlayerXp(state, effects.xp);
  if (effects.crewXp) {
    for (const member of state.crew.roster) {
      if (member.site === siteId) addCrewXp(member, effects.crewXp);
    }
  }
  if (effects.waste) {
    const cap = wasteCapacity(state, siteId);
    const delta = Math.abs(effects.waste) <= 1 ? cap * effects.waste : effects.waste;
    site.waste = Math.max(0, Math.min(cap, site.waste + delta));
  }
  if (effects.battery) {
    const level = site.zones.battery ? site.zones.battery.level : 0;
    const cap = batteryCapacityForLevel(level) * (1 + (state.research.batterychem ? 0.25 : 0));
    if (cap > 0) {
      const delta = Math.abs(effects.battery) <= 1 ? cap * effects.battery : effects.battery;
      site.battery.charge = Math.max(0, Math.min(cap, site.battery.charge + delta));
    }
  }
  if (effects.buff) pushBuff(state, siteId, effects.buff, effects.duration || 30, source, now);
  if (effects.cancelEvent) {
    state.event = null;
    state.stats.eventsResolved++;
  }
  if (effects.delayEvent) {
    state.nextEventAt = Math.max(state.nextEventAt, now + effects.delayEvent * 1000);
  }
  if (effects.discharge) {
    site.battery.dischargeUntil = now + 30_000;
    site.battery.everDischarged = true;
    state.stats.batteryDischarges++;
  }
}

export function triggerEvent(state, id, siteId, now = Date.now(), rand = Math.random) {
  const def = EVENT_BY_ID[id];
  if (!def) return null;
  state.lastEventId = id;
  state.stats.events++;
  state.nextEventAt = now + 100_000 + rand() * 80_000;
  const site = siteId || state.activeSite;

  if (def.auto) {
    applyEffects(state, def.effects, site, now, def.name);
    if (def.buff) pushBuff(state, site, def.buff, def.duration || 30, def.name, now);
    state.event = {
      id,
      endsAt: now + (def.duration || 20) * 1000,
      mode: "auto",
      site,
    };
  } else {
    state.event = {
      id,
      endsAt: now + (def.decision || 30) * 1000,
      mode: "choice",
      site,
      defaultChoice: def.defaultChoice || 0,
    };
  }
  return { id, def, site };
}

export function choicesFor(state, event) {
  const def = EVENT_BY_ID[event.id];
  if (!def || !def.choices) return [];
  return def.choices.map((choice, index) => ({
    index,
    label: choice.label,
    desc: choice.desc,
    available: choiceAvailable(state, choice, event.site),
    requires: choice.requires || null,
  }));
}

export function resolveEvent(state, choiceIndex, now = Date.now()) {
  const ev = state.event;
  if (!ev) return { ok: false, reason: "none" };
  const def = EVENT_BY_ID[ev.id];
  if (!def) { state.event = null; return { ok: false, reason: "unknown" }; }
  if (ev.mode === "auto") {
    logEvent(state, def, null, null, ev.site, now);
    state.event = null;
    state.stats.eventsResolved++;
    return { ok: true, auto: true, def };
  }
  let index = Number.isInteger(choiceIndex) ? choiceIndex : ev.defaultChoice || 0;
  let choice = def.choices && def.choices[index];
  if (!choice || !choiceAvailable(state, choice, ev.site)) {
    index = ev.defaultChoice || 0;
    choice = def.choices && def.choices[index];
  }
  if (!choice) { state.event = null; return { ok: false, reason: "choice" }; }
  applyEffects(state, choice.effects, ev.site, now, def.name);
  logEvent(state, def, index, choice.label, ev.site, now);
  state.event = null;
  state.stats.eventsResolved++;
  return { ok: true, def, choice, index };
}

export function tickEvent(state, now = Date.now()) {
  const ev = state.event;
  if (!ev || ev.endsAt > now) return null;
  const def = EVENT_BY_ID[ev.id];
  if (!def) { state.event = null; return null; }
  if (ev.mode === "auto") {
    logEvent(state, def, null, null, ev.site, now);
    state.event = null;
    state.stats.eventsResolved++;
    return { def, auto: true };
  }
  return resolveEvent(state, ev.defaultChoice || 0, now);
}

function logEvent(state, def, choiceIndex, choiceLabel, siteId, now) {
  state.eventLog.push({
    id: def.id,
    name: def.name,
    category: def.category,
    site: siteId,
    choice: choiceIndex,
    choiceLabel: choiceLabel || null,
    t: now,
  });
  if (state.eventLog.length > 20) state.eventLog = state.eventLog.slice(-20);
}

export function eventChoicesForUI(state) {
  if (!state.event) return null;
  const def = EVENT_BY_ID[state.event.id];
  if (!def) return null;
  return {
    def,
    event: state.event,
    colour: eventColour(def),
    choices: choicesFor(state, state.event),
  };
}
