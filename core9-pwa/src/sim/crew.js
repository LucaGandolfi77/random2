/*
 * CORE 9 — crew rules.
 *
 * A hired character is assigned to one plot on one site. The passive applies
 * at full value on their preferred role and at half value elsewhere. Active
 * abilities are cooldown-gated and write temporary buffs into the shared
 * buff array, so economy.js has one place to read every multiplier.
 *
 * Hiring is deterministic: a character becomes available when its milestone
 * is met, then the player pays credits + data. There is no random pack.
 */

import { CREW, CREW_BY_ID, XP_LEVELS, ABILITY_EFFECTS } from "../data/crew.js";
import { SITE_BY_ID } from "../data/sites.js";
import { ZONE_BY_ID } from "../data/zones.js";
import { addPlayerXp } from "./state.js";

export function characterUnlocked(state, character) {
  const u = character.unlock || {};
  if (u.starter) return true;
  if (u.director && state.player.level < u.director) return false;
  if (u.mission && !state.missions.done.includes(u.mission)) return false;
  if (u.site) {
    const site = state.sites[u.site];
    if (!site || !site.unlocked) return false;
    if (u.zone) {
      const level = site.zones[u.zone] ? site.zones[u.zone].level : 0;
      if (level < (u.level || 1)) return false;
    }
  }
  return true;
}

export function candidates(state) {
  const hired = new Set(state.crew.roster.map((c) => c.id));
  return CREW.filter((c) => !hired.has(c.id) && characterUnlocked(state, c));
}

export function characterState(state, id) {
  return state.crew.roster.find((c) => c.id === id) || null;
}

export function crewSlots(state, siteId) {
  const site = state.sites[siteId];
  if (!site) return 0;
  const admin = site.zones.admin ? site.zones.admin.level : 0;
  return Math.min(8, 2 + Math.floor(admin / 5) + Math.floor(state.player.level / 5));
}

export function crewUsed(state, siteId) {
  return state.crew.roster.filter((c) => c.site === siteId).length;
}

export function hireCrew(state, id) {
  const char = CREW_BY_ID[id];
  if (!char) return { ok: false, reason: "unknown" };
  if (characterState(state, id)) return { ok: false, reason: "hired" };
  if (!characterUnlocked(state, char)) return { ok: false, reason: "locked" };
  const site = state.sites[state.activeSite];
  const credits = char.cost.credits || 0;
  const data = char.cost.data || 0;
  if (site.credits < credits) return { ok: false, reason: "credits", cost: credits };
  if (state.data < data) return { ok: false, reason: "data", cost: data };
  site.credits -= credits;
  state.data -= data;
  state.crew.roster.push({
    id,
    level: 1,
    xp: 0,
    site: null,
    zone: null,
    traits: [],
  });
  state.stats.crewHired = state.crew.roster.length;
  return { ok: true, character: char };
}

export function assignCrew(state, id, siteId, zoneId) {
  const char = characterState(state, id);
  if (!char) return { ok: false, reason: "not_hired" };
  const site = state.sites[siteId];
  if (!site || !site.unlocked) return { ok: false, reason: "site" };
  if (!site.zones[zoneId] || !ZONE_BY_ID[zoneId]) return { ok: false, reason: "zone" };
  if (site.zones[zoneId].level < 1) return { ok: false, reason: "empty" };
  const occupied = state.crew.roster.find((c) => c.id !== id && c.site === siteId && c.zone === zoneId);
  if (occupied) return { ok: false, reason: "occupied", by: occupied.id };
  const wasOnSite = char.site === siteId;
  if (!wasOnSite && crewUsed(state, siteId) >= crewSlots(state, siteId)) {
    return { ok: false, reason: "slots", slots: crewSlots(state, siteId) };
  }
  char.site = siteId;
  char.zone = zoneId;
  return { ok: true, character: CREW_BY_ID[id], site: siteId, zone: zoneId };
}

export function unassignCrew(state, id) {
  const char = characterState(state, id);
  if (!char) return { ok: false, reason: "not_hired" };
  char.site = null;
  char.zone = null;
  return { ok: true };
}

/*
 * Aggregate passives assigned to one site. `preferred` doubles the value;
 * assigning a specialist to a random plot is allowed but inefficient.
 */
export function crewEffects(state, siteId) {
  const out = {
    heat: 1, cooling: 1, output: 1, price: 1, data: 1, wasteCap: 1,
    offline: 1, collect: 1, battery: 1, efficiency: 0, event: 0,
    overclock: 0, xp: 1, buildCost: 1,
  };
  for (const member of state.crew.roster) {
    if (member.site !== siteId || !member.zone) continue;
    const def = CREW_BY_ID[member.id];
    if (!def) continue;
    const site = state.sites[siteId];
    if (!site || !site.zones[member.zone] || site.zones[member.zone].level < 1) continue;
    const factor = member.zone === def.preferred ? 1 : 0.5;
    const scale = (1 + (member.level - 1) * 0.12) * factor;
    const value = def.passive.value * scale;
    switch (def.passive.kind) {
      case "heat": out.heat *= 1 + value; break;
      case "cooling": out.cooling *= 1 + value; break;
      case "efficiency": out.efficiency += value; break;
      case "price": out.price *= 1 + value; break;
      case "data": out.data *= 1 + value; break;
      case "wasteCap": out.wasteCap *= 1 + value; break;
      case "offline": out.offline *= 1 + value; break;
      case "collect": out.collect *= 1 + value; break;
      case "battery": out.battery *= 1 + value; break;
      case "event": out.event += value; break;
      case "overclock": out.overclock += def.passive.value * scale; break;
      case "xp": out.xp *= 1 + value; break;
      case "buildCost": out.buildCost *= Math.max(0.7, 1 - value); break;
      case "site": out.output *= 1 + value; break;
      default: break;
    }
  }
  return out;
}

export function crewXpForLevel(level) {
  return XP_LEVELS[Math.max(0, Math.min(XP_LEVELS.length - 1, level - 1))] || 0;
}

export function crewNextXp(level) {
  return XP_LEVELS[Math.min(XP_LEVELS.length, level)] || null;
}

export function addCrewXp(member, amount) {
  if (!member) return 0;
  member.xp += amount;
  let levelUps = 0;
  while (member.level < 5 && member.xp >= crewXpForLevel(member.level + 1)) {
    member.level++;
    levelUps++;
  }
  return levelUps;
}

export function tickCrew(state, dt, siteId, xpMultiplier = 1) {
  const levelUps = [];
  const rate = 0.10 * Math.max(0.1, xpMultiplier);
  for (const member of state.crew.roster) {
    if (member.site !== siteId || !member.zone) continue;
    member.xp += rate * dt;
    let leveled = false;
    while (member.level < 5 && member.xp >= crewXpForLevel(member.level + 1)) {
      member.level++;
      leveled = true;
    }
    if (leveled) levelUps.push({ id: member.id, level: member.level });
  }
  return levelUps;
}

export function abilityReadyAt(state, id) {
  return Math.max(0, Number(state.crew.cooldowns[id] || 0));
}

export function useAbility(state, id, siteId, now = Date.now()) {
  const member = characterState(state, id);
  if (!member) return { ok: false, reason: "not_hired" };
  if (member.site !== siteId) return { ok: false, reason: "not_here" };
  const def = CREW_BY_ID[id];
  if (!def) return { ok: false, reason: "unknown" };
  const ready = abilityReadyAt(state, id);
  if (ready > now) return { ok: false, reason: "cooldown", ready };
  const active = def.active;
  const effect = ABILITY_EFFECTS[active.id];
  if (!effect) return { ok: false, reason: "unknown" };
  const site = state.sites[siteId];

  if (effect.buff) {
    state.buffs.push({
      id: "ability:" + id + ":" + now,
      until: now + (active.duration || 15) * 1000,
      source: def.name + " · " + active.name,
      site: siteId,
      ...effect.buff,
    });
  }

  if (effect.instant === "data") {
    state.data += effect.amount || 10;
  } else if (effect.instant === "xp") {
    addPlayerXp(state, effect.amount || 10);
  } else if (effect.instant === "waste") {
    const cap = state.sites[siteId].zones.waste ? 250 * Math.pow(1.55, state.sites[siteId].zones.waste.level - 1) : 120;
    state.sites[siteId].waste = Math.max(0, state.sites[siteId].waste - cap * Math.abs(effect.amount || 0.25));
  } else if (effect.instant === "cancelEvent") {
    if (state.event) {
      state.event = null;
      state.stats.eventsResolved++;
    }
  } else if (effect.instant === "delayEvent") {
    state.nextEventAt = Math.max(state.nextEventAt, now + 120_000);
  } else if (effect.instant === "discharge") {
    if (!site.battery || site.battery.charge <= 0) return { ok: false, reason: "battery_empty" };
    site.battery.dischargeUntil = now + 30_000;
    site.battery.everDischarged = true;
    state.stats.batteryDischarges++;
  }

  if (active.id === "hotrod") {
    site.overclock.until = now + 35_000;
    site.overclock.cooldownUntil = site.overclock.until + 60_000;
  }

  state.crew.cooldowns[id] = now + active.cooldown * 1000;
  state.stats.abilitiesUsed++;
  return { ok: true, character: def, active };
}

export function passiveLabel(def, level, preferred) {
  const factor = preferred ? 1 : 0.5;
  const value = def.passive.value * (1 + (level - 1) * 0.12) * factor;
  if (def.passive.kind === "efficiency" || def.passive.kind === "event") {
    return Math.round(value * 100) + "%";
  }
  if (def.passive.kind === "overclock") return "+" + value.toFixed(0) + "s";
  return "+" + Math.round(value * 100) + "%";
}
