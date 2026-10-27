/*
 * CORE 9 — the rules.
 *
 * One chain per site:
 *   reactor heat × cooling throttle × turbine efficiency = gross MW
 *   gross MW × waste throttle × output multipliers = net MW
 *   net MW × grid price = credits per second
 *
 * Research, data, isotopes, crew and the director are global. Credits, banks,
 * waste, zones, batteries and prestige belong to a site.
 */

import { ZONES, ZONE_BY_ID, MAX_LEVEL, stageForLevel } from "../data/zones.js";
import { SITE_BY_ID, SITE_ORDER } from "../data/sites.js";
import { RESEARCH_BY_ID, MISSION_BY_ID, refillMission } from "../data/progression.js";
import { checkAchievements } from "../data/achievements.js";
import { CREW_BY_ID } from "../data/crew.js";
import {
  createInitialState, createSiteState, wasteCapacity, batteryCapacityForLevel,
  addPlayerXp, levelFromXp,
} from "./state.js";
import { crewEffects, tickCrew, crewSlots, crewUsed } from "./crew.js";
import { tickEvent, triggerEvent as triggerEventSim, resolveEvent as resolveEventSim, choicesFor } from "./events.js";

export const EURO_PER_MW_SECOND = 1.2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const levelOf = (site, id) => (site && site.zones[id] ? site.zones[id].level : 0);
const isBuilt = (site, id) => levelOf(site, id) > 0;

export function siteDefOf(siteId) {
  return SITE_BY_ID[siteId] || SITE_BY_ID.core9;
}

export function activeSite(state) {
  return state.sites[state.activeSite] || state.sites.core9;
}

export function siteZones(siteId) {
  const def = siteDefOf(siteId);
  return def.zoneIds.map((id) => ZONE_BY_ID[id]);
}

export function upgradeCost(zone, currentLevel) {
  if (currentLevel >= MAX_LEVEL) return Infinity;
  if (currentLevel <= 0) return zone.baseCost;
  return Math.round(zone.baseCost * Math.pow(zone.growth, currentLevel));
}

export function buildCostMultiplier(state, siteId) {
  const def = siteDefOf(siteId);
  const crew = crewEffects(state, siteId);
  const has = (id) => Boolean(state.research[id]);
  let mult = (def.modifiers.buildCost || 1) * crew.buildCost;
  if (has("arcticalloy")) mult *= 0.90;
  const d = Date.now();
  for (const b of state.buffs) {
    if (b.until > d && (b.site === siteId || b.site == null) && b.buildCost) mult *= b.buildCost;
  }
  return mult;
}

export function upgradeCostForSite(state, siteId, zone, currentLevel) {
  const base = upgradeCost(zone, currentLevel);
  if (!Number.isFinite(base)) return Infinity;
  return Math.round(base * buildCostMultiplier(state, siteId));
}

export function unlockInfo(state, siteId, zone) {
  if (!zone.unlock) return { ok: true };
  const site = state.sites[siteId];
  const have = levelOf(site, zone.unlock.zone);
  return {
    ok: have >= zone.unlock.level,
    zone: zone.unlock.zone,
    level: zone.unlock.level,
    have,
  };
}

export function canAct(state, siteId, zone) {
  const site = state.sites[siteId];
  const level = levelOf(site, zone.id);
  if (level >= MAX_LEVEL) return { ok: false, reason: "max" };
  if (level === 0) {
    const u = unlockInfo(state, siteId, zone);
    if (!u.ok) return { ok: false, reason: "locked", unlock: u };
  }
  const cost = upgradeCostForSite(state, siteId, zone, level);
  if (site.credits < cost) return { ok: false, reason: "credits", cost };
  return { ok: true, cost, level, building: level === 0 };
}

/*
 * Buffs are written by events and crew abilities. A buff is a multiplier
 * unless it is a flag, in which case it is truthy. `autoCollect` is the one
 * flag the economy itself acts on.
 */
export function buffEffects(state, siteId, now = Date.now()) {
  const out = {
    output: 1, price: 1, cooling: 1, efficiency: 1, data: 1, offline: 1,
    collect: 1, heat: 1, event: 0, autoCollect: 0, buildCost: 1, crewXp: 1,
  };
  for (const b of state.buffs) {
    if (b.until <= now) continue;
    if (b.site && b.site !== siteId) continue;
    if (b.output) out.output *= b.output;
    if (b.price) out.price *= b.price;
    if (b.cooling) out.cooling *= b.cooling;
    if (b.efficiency) out.efficiency *= b.efficiency;
    if (b.data) out.data *= b.data;
    if (b.offline) out.offline *= b.offline;
    if (b.collect) out.collect *= b.collect;
    if (b.heat) out.heat *= b.heat;
    if (b.event) out.event += b.event;
    if (b.autoCollect) out.autoCollect = 1;
    if (b.buildCost) out.buildCost *= b.buildCost;
    if (b.crewXp) out.crewXp *= b.crewXp;
  }
  return out;
}

export function derive(state, siteId = state.activeSite, now = Date.now(), active = true) {
  const site = state.sites[siteId] || state.sites.core9;
  const def = siteDefOf(siteId);
  const crew = crewEffects(state, siteId);
  const buffs = buffEffects(state, siteId, now);
  const has = (id) => Boolean(state.research[id]);

  const reactorLvl = levelOf(site, "reactor");
  const coolingLvl = levelOf(site, "cooling");
  const turbineLvl = levelOf(site, "turbine");
  const gridLvl = levelOf(site, "substation");
  const controlLvl = levelOf(site, "control");
  const fuelLvl = levelOf(site, "fuel");
  const wasteLvl = levelOf(site, "waste");
  const labLvl = levelOf(site, "lab");
  const securityLvl = levelOf(site, "security");
  const adminLvl = levelOf(site, "admin");
  const batteryLvl = levelOf(site, "battery");
  const uniqueLvl = levelOf(site, def.uniqueZone);

  const overclock = active && site.overclock && site.overclock.until > now;
  const discharging = active && site.battery && site.battery.dischargeUntil > now && site.battery.charge > 0;

  let mitigation = Math.min(0.5, securityLvl * 0.05) + crew.event;
  if (has("predictive")) mitigation += 0.30;
  if (has("networkai")) mitigation += 0.20;
  mitigation = Math.min(0.85, mitigation + buffs.event);
  const soften = (penalty) => 1 - (1 - penalty) * (1 - mitigation);

  let heat = reactorLvl > 0 ? 10 * Math.pow(1.55, reactorLvl - 1) : 0;
  if (has("materials")) heat *= 1.10;
  if (has("moltensalt")) heat *= 1.15;
  heat *= crew.heat;
  heat *= buffs.heat;
  if (def.uniqueZone === "geothermal") heat *= 1 + uniqueLvl * 0.03;
  if (overclock) heat *= 1.5;

  let cooling = coolingLvl > 0 ? 14 * Math.pow(1.5, coolingLvl - 1) : 0;
  if (has("exchangers")) cooling *= 1.15;
  if (has("drycooling")) cooling *= 1.20;
  cooling *= def.modifiers.cooling || 1;
  cooling *= crew.cooling;
  cooling *= buffs.cooling;
  if (def.uniqueZone === "pump") cooling *= 1 + uniqueLvl * 0.05;

  let price = gridLvl > 0 ? 1 + 0.10 * (gridLvl - 1) : 0;
  if (has("smartgrid")) price *= 1.10;
  if (has("gridai")) price *= 1.15;
  price *= def.modifiers.price || 1;
  price *= crew.price;
  price *= buffs.price;

  let efficiency = turbineLvl > 0 ? Math.min(0.9, 0.4 + 0.05 * (turbineLvl - 1)) : 0;
  efficiency += crew.efficiency;
  if (has("blades")) efficiency += 0.08;
  if (has("supercritical")) efficiency += 0.06;
  if (has("apexturbine")) efficiency += 0.08;
  efficiency = Math.min(1, efficiency * buffs.efficiency);

  const util = heat > 0 ? clamp(cooling / heat, 0, 1) : 0;
  const grossMW = heat * util * efficiency;
  const wCap = wasteCapacity(state, siteId) * crew.wasteCap;
  const wasteFull = site.waste >= wCap - 1e-7;
  const wasteThrottle = wasteFull ? 0.55 : 1;
  const isotopeMult = 1 + 0.06 * Math.max(0, state.isotopes || 0);

  let outputMult = 1;
  if (has("fusionmaterials")) outputMult *= 1.12;
  if (has("singularity")) outputMult *= 1.20;
  outputMult *= crew.output;
  outputMult *= buffs.output;
  if (def.uniqueZone === "solar") outputMult *= 1 + uniqueLvl * 0.02;
  if (discharging) outputMult *= 1.25 + batteryLvl * 0.01;

  const netMW = grossMW * wasteThrottle * outputMult * isotopeMult;
  const revenue = netMW * price * EURO_PER_MW_SECOND;

  const researchWaste = (has("recycling") ? 0.8 : 1) * (has("transmute") ? 0.75 : 1);
  const wasteRate =
    grossMW *
    0.04 *
    (1 - Math.min(0.4, fuelLvl * 0.02)) *
    researchWaste *
    (overclock ? 1.6 : 1);

  const labBase = labLvl > 0 ? 0.12 + 0.03 * (labLvl - 1) : 0;
  let dataRate = labBase;
  if (has("analytics")) dataRate *= 1.25;
  if (has("quantumlab")) dataRate *= 1.35;
  dataRate *= crew.data;
  dataRate *= buffs.data;

  const offlineBase = 0.6 + controlLvl * 0.015 + (has("telemetry") ? 0.10 : 0) + (has("autocontrol") ? 0.15 : 0);
  const offlineRate = clamp(offlineBase * crew.offline * buffs.offline * (def.modifiers.offline || 1), 0.6, 0.95);
  const offlineCap = 8 * 3600 + adminLvl * 1800;

  const reactive = adminLvl * 0.01 + (has("autocontrol") ? 0.10 : 0);
  const collectBonus = Math.min(0.3, (0.10 + reactive) * crew.collect * buffs.collect);
  const autoCollect = controlLvl >= 5 || Boolean(buffs.autoCollect);

  const overclockDuration = 30 + fuelLvl * 2 + crew.overclock;
  const overclockCooldown = Math.max(35, 90 - fuelLvl * 2);

  const batteryCap = batteryCapacityForLevel(batteryLvl) * (has("batterychem") ? 1.25 : 1) * crew.battery * (def.uniqueZone === "solar" ? 1 + uniqueLvl * 0.10 : 1);
  const batteryRate = batteryLvl > 0 ? 0.5 + batteryLvl * 0.15 + (def.uniqueZone === "solar" ? uniqueLvl * 0.2 : 0) : 0;
  const batteryCharge = site.battery ? site.battery.charge : 0;

  const inactiveRate = 0.25 * (1 + (has("siteops") ? 0.15 : 0) + (has("networkai") ? 0.10 : 0));

  let status = active ? "offline" : "network";
  if (active && reactorLvl > 0 && coolingLvl > 0 && turbineLvl > 0 && gridLvl > 0) {
    status = "online";
    if (util < 0.999) status = "heat";
    else if (wasteFull) status = "waste";
    else if (state.event && state.event.site === siteId && state.event.mode === "choice") status = "event";
  }

  return {
    site: def,
    siteId,
    levels: {
      reactor: reactorLvl, cooling: coolingLvl, turbine: turbineLvl, grid: gridLvl,
      control: controlLvl, fuel: fuelLvl, waste: wasteLvl, lab: labLvl,
      security: securityLvl, admin: adminLvl, battery: batteryLvl, unique: uniqueLvl,
    },
    heat, cooling, util, efficiency, price, grossMW, netMW, revenue,
    wasteCap: wCap, wasteRate, recycle: wasteLvl > 0 ? wCap * 0.0015 : 0,
    wasteThrottle, wasteFull, dataRate, offlineRate, offlineCap,
    overclock, overclockDuration, overclockCooldown,
    collectBonus, autoCollect, isotopeMult, mitigation, status,
    batteryCap, batteryRate, batteryCharge, discharging,
    inactiveRate, crewSlots: crewSlots(state, siteId), crewUsed: crewUsed(state, siteId),
    uniqueZone: def.uniqueZone, modifiers: def.modifiers,
  };
}

export function tick(state, dt, now = Date.now()) {
  if (!(dt > 0)) return { d: derive(state, state.activeSite, now), completed: [], achievements: [], levelUps: [] };
  dt = Math.min(dt, 1);
  const completed = [];
  const achievements = [];
  const levelUps = [];
  let autoCollected = 0;
  let eventResolved = null;

  const activeId = state.activeSite;
  const activeSiteState = state.sites[activeId];

  for (const siteId of SITE_ORDER) {
    const site = state.sites[siteId];
    if (!site || !site.unlocked) continue;
    const active = siteId === activeId;
    const d = derive(state, siteId, now, active);
    const rate = active ? 1 : d.inactiveRate;
    const earned = d.revenue * dt * rate;
    site.bank += earned;
    state.stats.earned += earned;
    state.stats.energy += d.netMW * dt * rate;
    site.maxMW = Math.max(site.maxMW, active ? d.netMW : d.netMW * rate);
    site.bestMW = Math.max(site.bestMW || 0, site.maxMW);
    state.data += d.dataRate * dt * rate;
    site.waste = clamp(site.waste + d.wasteRate * dt * rate - d.recycle * dt * (active ? 1 : 0.25), 0, d.wasteCap);

    if (d.batteryCap > 0) {
      if (active && site.battery.dischargeUntil > now) {
        site.battery.charge = Math.max(0, site.battery.charge - d.batteryCap * 0.04 * dt);
        if (site.battery.charge <= 0) site.battery.dischargeUntil = 0;
      } else if (!site.battery.dischargeUntil || site.battery.dischargeUntil <= now) {
        site.battery.charge = Math.min(d.batteryCap, site.battery.charge + d.batteryRate * dt * (active ? 1 : 0.25));
      }
    }

    if (active) {
      if (d.autoCollect) {
        site.autoT += dt;
        if (site.autoT >= 1) {
          const amount = site.bank;
          site.autoT = 0;
          if (amount > 0.01) {
            site.credits += amount;
            state.stats.collected += amount;
            site.bank = 0;
            autoCollected += amount;
          }
        }
      }
      const crewMult = (state.research.crewtraining ? 1.2 : 1) * (state.research.academy ? 1.3 : 1) * crewEffects(state, siteId).xp;
      const ups = tickCrew(state, dt, siteId, crewMult);
      for (const up of ups) levelUps.push(up);

      const m = state.missions;
      if (m && Array.isArray(m.active)) {
        let guard = 0;
        for (let i = 0; i < m.active.length && guard < 12; i++) {
          const def = MISSION_BY_ID[m.active[i]];
          if (!def) { m.active.splice(i, 1); i--; continue; }
          let passed = false;
          try { passed = Boolean(def.check(state, site, d)); } catch { passed = false; }
          if (passed) {
            m.done.push(def.id);
            m.active.splice(i, 1);
            m.completions++;
            site.credits += def.credits;
            state.data += def.data;
            if (def.xp) { const lv = addPlayerXp(state, def.xp); if (lv) levelUps.push({ player: true, level: state.player.level }); }
            completed.push(def);
            refillMission(state);
            i = -1;
            guard++;
          }
        }
      }

      for (const a of checkAchievements(state, site, d)) {
        achievements.push(a);
        if (a.reward.credits) site.credits += a.reward.credits;
        if (a.reward.data) state.data += a.reward.data;
        if (a.reward.xp) { const lv = addPlayerXp(state, a.reward.xp); if (lv) levelUps.push({ player: true, level: state.player.level }); }
      }
    }
  }

  state.stats.maxMW = Math.max(state.stats.maxMW || 0, ...Object.values(state.sites).map((s) => s.maxMW || 0));
  state.stats.bestMW = Math.max(state.stats.bestMW || 0, state.stats.maxMW);
  state.stats.playTime += dt;
  state.buffs = state.buffs.filter((b) => b.until > now);

  const evt = tickEvent(state, now);
  if (evt) eventResolved = evt;

  const d = derive(state, activeId, now);
  return { d, completed, achievements, levelUps, autoCollected, eventResolved };
}

export function collect(state, siteId = state.activeSite, now = Date.now()) {
  const site = state.sites[siteId];
  if (!site || !(site.bank > 0.01)) return 0;
  const d = derive(state, siteId, now);
  const amount = site.bank * (1 + d.collectBonus);
  site.credits += amount;
  state.stats.collected += amount;
  site.bank = 0;
  return amount;
}

export function buildOrUpgrade(state, zoneId, siteId = state.activeSite, now = Date.now()) {
  const zone = ZONE_BY_ID[zoneId];
  const site = state.sites[siteId];
  const def = siteDefOf(siteId);
  if (!zone || !site || !def.zoneIds.includes(zoneId)) return { ok: false, reason: "unknown" };
  const current = levelOf(site, zoneId);
  if (current >= MAX_LEVEL) return { ok: false, reason: "max" };
  const building = current === 0;
  if (building) {
    const u = unlockInfo(state, siteId, zone);
    if (!u.ok) return { ok: false, reason: "locked", unlock: u };
  }
  const cost = upgradeCostForSite(state, siteId, zone, current);
  if (site.credits < cost) return { ok: false, reason: "credits", cost };
  site.credits -= cost;
  site.zones[zoneId].level = current + 1;
  state.stats.upgrades++;
  if (building) state.stats.builds++;
  return {
    ok: true, cost, level: current + 1, building,
    stageChanged: stageForLevel(current) !== stageForLevel(current + 1),
  };
}

export function buyResearch(state, id) {
  const def = RESEARCH_BY_ID[id];
  if (!def) return { ok: false, reason: "unknown" };
  if (state.research[id]) return { ok: false, reason: "owned" };
  const lab = Math.max(...SITE_ORDER.map((id) => levelOf(state.sites[id], "lab")));
  if (lab < def.lab) return { ok: false, reason: "lab", need: def.lab };
  if (state.data < def.cost) return { ok: false, reason: "data", cost: def.cost };
  state.data -= def.cost;
  state.research[id] = true;
  return { ok: true, def };
}

export function startOverclock(state, siteId = state.activeSite, now = Date.now()) {
  const site = state.sites[siteId];
  if (!site) return { ok: false, reason: "site" };
  const d = derive(state, siteId, now);
  if (site.overclock.until > now) return { ok: false, reason: "active" };
  if (site.overclock.cooldownUntil > now) return { ok: false, reason: "cooldown" };
  if (levelOf(site, "reactor") < 1) return { ok: false, reason: "reactor" };
  site.overclock.until = now + d.overclockDuration * 1000;
  site.overclock.cooldownUntil = site.overclock.until + d.overclockCooldown * 1000;
  return { ok: true, duration: d.overclockDuration };
}

export function useBattery(state, siteId = state.activeSite, now = Date.now()) {
  const site = state.sites[siteId];
  if (!site) return { ok: false, reason: "site" };
  const d = derive(state, siteId, now);
  if (d.batteryCap <= 0) return { ok: false, reason: "unbuilt" };
  if (site.battery.charge <= 0) return { ok: false, reason: "empty" };
  if (site.battery.dischargeUntil > now) return { ok: false, reason: "active" };
  site.battery.dischargeUntil = now + 30_000;
  site.battery.everDischarged = true;
  state.stats.batteryDischarges++;
  return { ok: true, charge: site.battery.charge };
}

export function triggerEvent(state, id, siteId = state.activeSite, now = Date.now(), rand = Math.random) {
  return triggerEventSim(state, id, siteId, now, rand);
}

export function resolveEvent(state, choiceIndex, now = Date.now()) {
  return resolveEventSim(state, choiceIndex, now);
}

export function chooseForUI(state) {
  if (!state.event) return [];
  return choicesFor(state, state.event);
}

export function prestigeGain(state, siteId = state.activeSite) {
  const site = state.sites[siteId];
  if (!site) return 0;
  const req = siteDefOf(siteId).prestigeMW;
  if (site.maxMW < req) return 0;
  return Math.max(1, Math.floor(Math.sqrt(site.maxMW / 20)));
}

export function canPrestige(state, siteId = state.activeSite) {
  const site = state.sites[siteId];
  return Boolean(site && site.maxMW >= siteDefOf(siteId).prestigeMW);
}

export function prestige(state, siteId = state.activeSite, now = Date.now()) {
  if (!canPrestige(state, siteId)) return { ok: false, reason: "mw" };
  const def = siteDefOf(siteId);
  const site = state.sites[siteId];
  const gain = prestigeGain(state, siteId);
  const generation = site.generation + 1;
  const bestMW = Math.max(site.bestMW || 0, site.maxMW);
  const unlocked = site.unlocked;
  const fresh = createSiteState(def, now, unlocked);
  fresh.generation = generation;
  fresh.bestMW = bestMW;
  state.sites[siteId] = fresh;
  for (const member of state.crew.roster) {
    if (member.site === siteId) { member.site = null; member.zone = null; }
  }
  state.isotopes += gain;
  state.stats.prestiges++;
  const lv = addPlayerXp(state, 60 + gain * 10);
  return { ok: true, gain, generation, levelUps: lv };
}

export function switchSite(state, siteId, now = Date.now()) {
  const site = state.sites[siteId];
  if (!site || !site.unlocked) return { ok: false, reason: "locked" };
  state.activeSite = siteId;
  if (!state.stats.sitesVisited.includes(siteId)) state.stats.sitesVisited.push(siteId);
  return { ok: true, siteId };
}

export function unlockSite(state, siteId, now = Date.now()) {
  const def = SITE_BY_ID[siteId];
  const site = state.sites[siteId];
  if (!def || !site) return { ok: false, reason: "unknown" };
  if (site.unlocked) return { ok: false, reason: "unlocked" };
  const req = def.unlock || {};
  const needLevel = req.director || 0;
  const needIso = req.isotopes || 0;
  if (state.player.level < needLevel) return { ok: false, reason: "director", need: needLevel };
  if (state.isotopes < needIso) return { ok: false, reason: "isotopes", need: needIso };
  state.isotopes -= needIso;
  site.unlocked = true;
  if (!state.stats.sitesVisited.includes(siteId)) state.stats.sitesVisited.push(siteId);
  return { ok: true, siteId, def };
}

export function applyOffline(state, seconds, now = Date.now()) {
  seconds = Math.max(0, Math.min(seconds, 24 * 3600));
  const sites = [];
  let totalEarned = 0;
  let totalData = 0;
  let capped = false;
  for (const siteId of SITE_ORDER) {
    const site = state.sites[siteId];
    if (!site || !site.unlocked) continue;
    const active = siteId === state.activeSite;
    const d = derive(state, siteId, now, active);
    const cap = Math.min(seconds, active ? d.offlineCap : 8 * 3600);
    if (cap < 30) { sites.push({ id: siteId, name: siteDefOf(siteId).name, earned: 0, data: 0, seconds: cap }); continue; }
    if (seconds > cap) capped = true;
    const rate = active ? d.offlineRate : d.inactiveRate;
    const earned = d.revenue * cap * rate;
    const data = d.dataRate * cap * rate;
    site.bank += earned;
    state.data += data;
    state.stats.earned += earned;
    state.stats.offlineEarned += earned;
    state.stats.energy += d.netMW * cap * rate;
    site.maxMW = Math.max(site.maxMW, active ? d.netMW : d.netMW * rate);
    site.bestMW = Math.max(site.bestMW || 0, site.maxMW);
    site.waste = clamp(site.waste + d.wasteRate * cap * 0.5, 0, d.wasteCap);
    totalEarned += earned;
    totalData += data;
    sites.push({ id: siteId, name: siteDefOf(siteId).name, earned, data, seconds: cap });
  }
  state.stats.maxMW = Math.max(state.stats.maxMW || 0, ...Object.values(state.sites).map((s) => s.maxMW || 0));
  state.stats.bestMW = Math.max(state.stats.bestMW || 0, state.stats.maxMW);
  return { seconds, earned: totalEarned, data: totalData, sites, capped };
}

export function totalNetworkMW(state) {
  return Object.values(state.sites).reduce((sum, s) => sum + (s.maxMW || 0), 0);
}

export function stageChanged(before, after) {
  return stageForLevel(before) !== stageForLevel(after);
}

export function saveVersion() {
  return 2;
}
