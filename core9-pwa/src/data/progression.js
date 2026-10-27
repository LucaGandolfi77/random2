/*
 * CORE 9 — progression tables.
 *
 * Research is global and permanent. Missions are a global conveyor belt:
 * three visible, sixty in the pile, and a completed one never comes back.
 * The checks receive `(state, site, derived)` so the same board can ask about
 * any active plant without knowing which one it is.
 */

import { ZONES } from "./zones.js";

const zone = (site, id) => (site && site.zones[id] ? site.zones[id].level : 0);
const anyZone = (site, level) => ZONES.some((z) => zone(site, z.id) >= level);
const totalMW = (state) => Object.values(state.sites).reduce((sum, s) => sum + (s.maxMW || 0), 0);
const siteUnlocked = (state, id) => Boolean(state.sites[id] && state.sites[id].unlocked);
const siteLevels = (site) => Object.values(site.zones).filter((z) => z.level > 0).length;

export const RESEARCH = [
  { id: "blades", name: "Blade metallurgy", desc: "+8% turbine conversion efficiency.", cost: 20, lab: 1, effect: { efficiency: 0.08 } },
  { id: "exchangers", name: "Heat exchangers", desc: "+15% cooling capacity.", cost: 32, lab: 1, effect: { cooling: 0.15 } },
  { id: "recycling", name: "Waste recycling", desc: "−20% waste produced per megawatt.", cost: 46, lab: 1, effect: { waste: 0.20 } },
  { id: "telemetry", name: "Remote telemetry", desc: "+10% offline production rate.", cost: 62, lab: 2, effect: { offline: 0.10 } },
  { id: "smartgrid", name: "Smart-grid contracts", desc: "+10% price per megawatt.", cost: 80, lab: 2, effect: { price: 0.10 } },
  { id: "materials", name: "Advanced materials", desc: "+10% reactor thermal output.", cost: 108, lab: 2, effect: { reactor: 0.10 } },
  { id: "analytics", name: "Data analytics", desc: "+25% research data from the lab.", cost: 140, lab: 3, effect: { data: 0.25 } },
  { id: "predictive", name: "Predictive maintenance", desc: "Grid-event penalties are 30% milder.", cost: 180, lab: 3, effect: { event: 0.30 } },
  { id: "batterychem", name: "Battery chemistry", desc: "+25% battery capacity.", cost: 220, lab: 3, effect: { battery: 0.25 } },
  { id: "crewtraining", name: "Crew training", desc: "+20% crew XP.", cost: 260, lab: 4, effect: { crewXp: 0.20 } },
  { id: "drycooling", name: "Dry cooling", desc: "+20% cooling capacity, even in a desert.", cost: 300, lab: 4, effect: { cooling: 0.20 } },
  { id: "arcticalloy", name: "Cryogenic alloys", desc: "−10% construction cost.", cost: 340, lab: 4, effect: { buildCost: 0.10 } },
  { id: "siteops", name: "Network operations", desc: "+15% production from inactive sites.", cost: 400, lab: 4, effect: { inactive: 0.15 } },
  { id: "supercritical", name: "Supercritical steam", desc: "+6% turbine efficiency.", cost: 460, lab: 5, effect: { efficiency: 0.06 } },
  { id: "moltensalt", name: "Molten-salt loop", desc: "+15% reactor thermal output.", cost: 520, lab: 5, effect: { heat: 0.15 } },
  { id: "gridai", name: "Grid AI", desc: "+15% grid price.", cost: 600, lab: 5, effect: { price: 0.15 } },
  { id: "transmute", name: "Transmutation", desc: "−25% waste produced per megawatt.", cost: 680, lab: 5, effect: { waste: 0.25 } },
  { id: "quantumlab", name: "Quantum lab", desc: "+35% research data.", cost: 760, lab: 6, effect: { data: 0.35 } },
  { id: "autocontrol", name: "Autonomous control", desc: "+15% offline rate and +10% collection.", cost: 850, lab: 6, effect: { offline: 0.15, collect: 0.10 } },
  { id: "fusionmaterials", name: "Fusion materials", desc: "+12% output from every site.", cost: 950, lab: 7, effect: { output: 0.12 } },
  { id: "academy", name: "Crew academy", desc: "+30% crew XP.", cost: 1050, lab: 7, effect: { crewXp: 0.30 } },
  { id: "apexturbine", name: "Apex turbine", desc: "+8% turbine efficiency.", cost: 1200, lab: 7, effect: { efficiency: 0.08 } },
  { id: "networkai", name: "Network AI", desc: "−20% event penalties and +10% inactive output.", cost: 1400, lab: 8, effect: { event: 0.20, inactive: 0.10 } },
  { id: "singularity", name: "Singularity protocol", desc: "+20% output from every site.", cost: 1800, lab: 8, effect: { output: 0.20 } },
];

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));

const M = (id, title, desc, check, credits, data, xp) => ({ id, title, desc, check, credits, data, xp });

export const MISSIONS = [
  M("cooling", "Raise the towers", "Build the cooling circuit.", (s, p) => zone(p, "cooling") >= 1, 120, 0, 10),
  M("turbine", "Spin the hall", "Build the turbine hall.", (s, p) => zone(p, "turbine") >= 1, 140, 0, 10),
  M("grid", "Reach the grid", "Build the switchyard.", (s, p) => zone(p, "substation") >= 1, 180, 2, 15),
  M("collect", "First invoice", "Collect €500 from the grid.", (s) => s.stats.collected >= 500, 160, 2, 10),
  M("reactor3", "Push the core", "Raise the reactor to level 3.", (s, p) => zone(p, "reactor") >= 3, 260, 4, 18),
  M("waste", "A place for the ash", "Build the waste vault.", (s, p) => zone(p, "waste") >= 1, 340, 5, 18),
  M("control", "Someone at the desk", "Build the control centre.", (s, p) => zone(p, "control") >= 1, 380, 6, 20),
  M("mw25", "Twenty-five", "Reach 25 MW of output.", (s, p, d) => d.netMW >= 25, 420, 6, 20),
  M("lab", "A whiteboard and an idea", "Build the research lab.", (s, p) => zone(p, "lab") >= 1, 520, 8, 22),
  M("research", "Put it in writing", "Install your first research upgrade.", (s) => Object.keys(s.research || {}).length >= 1, 460, 8, 20),
  M("security", "Mind the fence", "Build the security post.", (s, p) => zone(p, "security") >= 1, 600, 9, 22),
  M("mw50", "Fifty", "Reach 50 MW of output.", (s, p, d) => d.netMW >= 50, 720, 10, 25),
  M("fuel", "Fresh assemblies", "Build the fuel store.", (s, p) => zone(p, "fuel") >= 1, 780, 10, 25),
  M("collect10k", "A real balance sheet", "Collect €10,000 from the grid.", (s) => s.stats.collected >= 10000, 900, 12, 28),
  M("admin", "The paper trail", "Build the administration building.", (s, p) => zone(p, "admin") >= 1, 1000, 12, 28),
  M("mw75", "Seventy-five", "Reach 75 MW of output.", (s, p, d) => d.netMW >= 75, 1200, 14, 30),
  M("stage3", "A proper skyline", "Get any zone to stage 3 (level 7).", (s, p) => anyZone(p, 7), 1400, 16, 32),
  M("mw100", "One hundred", "Reach 100 MW of output.", (s, p, d) => d.netMW >= 100, 1800, 20, 35),
  M("collect100k", "The valley notices", "Collect €100,000 from the grid.", (s) => s.stats.collected >= 100000, 2400, 24, 40),
  M("stage5", "Next generation", "Get any zone to stage 5 (level 13).", (s, p) => anyZone(p, 13), 3200, 30, 45),
  M("prestige", "Clean sheet", "Start a new generation.", (s) => s.stats.prestiges >= 1, 4000, 40, 60),

  M("battery", "A place for the surplus", "Build the battery yard.", (s, p) => zone(p, "battery") >= 1, 900, 14, 30),
  M("unique", "The local advantage", "Build this site's unique auxiliary.", (s, p) => zone(p, s.sites[s.activeSite].uniqueZone) >= 1, 1000, 16, 32),
  M("level10", "Ten deep", "Get any zone to level 10.", (s, p) => anyZone(p, 10), 1800, 20, 35),
  M("level16", "Grid scale", "Get any zone to stage 6 (level 16).", (s, p) => anyZone(p, 16), 2600, 28, 40),
  M("level20", "Landmark", "Get any zone to stage 7 (level 20).", (s, p) => anyZone(p, 20), 3600, 36, 50),
  M("level25", "Apex", "Get any zone to level 25.", (s, p) => anyZone(p, 25), 5000, 50, 70),
  M("allzones", "The whole plant", "Build every plot on the current site.", (s, p) => siteLevels(p) >= Object.keys(p.zones).length, 4200, 40, 60),
  M("maxzone", "One perfect machine", "Max out a zone at level 25.", (s, p) => ZONES.some((z) => zone(p, z.id) >= 25), 6500, 60, 90),
  M("director3", "Middle management", "Reach Director level 3.", (s) => s.player.level >= 3, 600, 10, 20),
  M("director5", "The network opens", "Reach Director level 5.", (s) => s.player.level >= 5, 1200, 18, 30),
  M("director8", "A known quantity", "Reach Director level 8.", (s) => s.player.level >= 8, 2200, 24, 40),
  M("director12", "Arctic clearance", "Reach Director level 12.", (s) => s.player.level >= 12, 3600, 36, 60),
  M("director20", "Industry legend", "Reach Director level 20.", (s) => s.player.level >= 20, 6000, 60, 100),
  M("director30", "The whole grid", "Reach Director level 30.", (s) => s.player.level >= 30, 10000, 100, 150),
  M("unlock_solaris", "A second site", "Unlock SOLARIS 4.", (s) => siteUnlocked(s, "solaris"), 1800, 20, 40),
  M("unlock_glacier", "The cold frontier", "Unlock GLACIER 2.", (s) => siteUnlocked(s, "glacier"), 3600, 36, 70),
  M("visit_solaris", "Into the basin", "Travel to SOLARIS 4.", (s) => s.stats.sitesVisited.includes("solaris"), 800, 12, 25),
  M("visit_glacier", "Into the ice", "Travel to GLACIER 2.", (s) => s.stats.sitesVisited.includes("glacier"), 800, 12, 25),
  M("solaris50", "Desert power", "Reach 50 MW on SOLARIS 4.", (s) => (s.sites.solaris.maxMW || 0) >= 50, 1500, 20, 35),
  M("solaris300", "The basin runs", "Reach 300 MW on SOLARIS 4.", (s) => (s.sites.solaris.maxMW || 0) >= 300, 4200, 40, 65),
  M("glacier100", "Arctic current", "Reach 100 MW on GLACIER 2.", (s) => (s.sites.glacier.maxMW || 0) >= 100, 2200, 30, 45),
  M("glacier600", "The ice grid", "Reach 600 MW on GLACIER 2.", (s) => (s.sites.glacier.maxMW || 0) >= 600, 6500, 60, 100),
  M("prestige2", "A second clean sheet", "Prestige SOLARIS 4.", (s) => (s.sites.solaris.generation || 1) > 1, 2600, 30, 50),
  M("prestige3", "A third clean sheet", "Prestige GLACIER 2.", (s) => (s.sites.glacier.generation || 1) > 1, 4000, 45, 80),
  M("crew1", "First hire", "Hire your first crew member.", (s) => s.crew.roster.length >= 1, 500, 8, 20),
  M("crew5", "A real team", "Hire 5 crew members.", (s) => s.crew.roster.length >= 5, 1400, 18, 35),
  M("crew10", "The roster fills", "Hire 10 crew members.", (s) => s.crew.roster.length >= 10, 2600, 30, 55),
  M("crew15", "Full house", "Hire all 15 crew members.", (s) => s.crew.roster.length >= 15, 5000, 60, 100),
  M("assign3", "Delegation", "Assign 3 crew members to plots.", (s) => s.crew.roster.filter((c) => c.site && c.zone).length >= 3, 900, 12, 25),
  M("assign5", "Hands on the plant", "Assign 5 crew members to plots.", (s) => s.crew.roster.filter((c) => c.site && c.zone).length >= 5, 1800, 22, 40),
  M("ability", "Press the button", "Use a crew ability.", (s) => s.stats.abilitiesUsed >= 1, 700, 10, 20),
  M("events5", "Five incidents", "Resolve 5 events.", (s) => s.stats.eventsResolved >= 5, 900, 14, 28),
  M("events15", "Fifteen incidents", "Resolve 15 events.", (s) => s.stats.eventsResolved >= 15, 2200, 26, 45),
  M("events30", "Thirty incidents", "Resolve 30 events.", (s) => s.stats.eventsResolved >= 30, 4200, 42, 70),
  M("discharge", "Use the buffer", "Discharge the battery yard.", (s) => s.stats.batteryDischarges >= 1, 800, 12, 24),
  M("gw1", "A gigawatt network", "Reach 1 GW across all sites.", (s) => totalMW(s) >= 1000, 3000, 35, 60),
  M("gw5", "Five gigawatts", "Reach 5 GW across all sites.", (s) => totalMW(s) >= 5000, 8000, 80, 120),
  M("research12", "A body of work", "Install 12 research upgrades.", (s) => Object.keys(s.research).length >= 12, 2600, 30, 55),
  M("research24", "The whole tree", "Install all 24 research upgrades.", (s) => Object.keys(s.research).length >= 24, 7000, 80, 140),
];

export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export function initialMissions() {
  return {
    active: ["cooling", "turbine", "grid"],
    done: [],
    completions: 0,
  };
}

export function refillMission(state) {
  const m = state.missions;
  while (m.active.length < 3) {
    const next = MISSIONS.find((x) => !m.active.includes(x.id) && !m.done.includes(x.id));
    if (!next) return null;
    m.active.push(next.id);
  }
  return m.active[m.active.length - 1];
}

export function resetResearch() {
  return {};
}
