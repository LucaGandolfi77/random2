/*
 * CORE 9 — achievements.
 *
 * Thirty small, permanent goals that span sites, crew and generations. They
 * are claimed automatically on the next tick; the reward is always visible
 * in the World panel and in a toast.
 */

const A = (id, name, desc, check, reward = {}) => ({ id, name, desc, check, reward });

const built = (site, id) => site && site.zones[id] && site.zones[id].level > 0;
const anyZone = (site, level) => Object.values(site.zones).some((z) => z.level >= level);
const totalMW = (state) => Object.values(state.sites).reduce((sum, s) => sum + (s.maxMW || 0), 0);

export const ACHIEVEMENTS = [
  A("first_build", "First concrete", "Build any plot.", (s) => s.stats.builds >= 1, { data: 4, xp: 10 }),
  A("chain", "Heat in, power out", "Build cooling, turbine and switchyard.", (s, p) => built(p, "cooling") && built(p, "turbine") && built(p, "substation"), { data: 8, xp: 20 }),
  A("first_collect", "The first invoice", "Collect €100 from the grid.", (s) => s.stats.collected >= 100, { data: 4, xp: 8 }),
  A("first_prestige", "Clean sheet", "Complete a site's first prestige.", (s) => s.stats.prestiges >= 1, { data: 20, xp: 60 }),
  A("battery", "A place for the surplus", "Build a battery yard.", (s, p) => built(p, "battery"), { data: 10, xp: 20 }),
  A("unique", "Local advantage", "Build a site's unique auxiliary.", (s, p) => built(p, p.uniqueZone), { data: 10, xp: 20 }),
  A("level10", "Ten deep", "Get any zone to level 10.", (s, p) => anyZone(p, 10), { data: 12, xp: 25 }),
  A("level16", "Grid scale", "Get any zone to level 16.", (s, p) => anyZone(p, 16), { data: 18, xp: 35 }),
  A("level20", "Landmark", "Get any zone to level 20.", (s, p) => anyZone(p, 20), { data: 26, xp: 50 }),
  A("level25", "Apex", "Get any zone to level 25.", (s, p) => anyZone(p, 25), { data: 40, xp: 80 }),
  A("allzones", "The whole plant", "Build every plot on a site.", (s, p) => Object.keys(p.zones).every((id) => built(p, id)), { data: 35, xp: 70 }),
  A("maxzone", "One perfect machine", "Max out a zone.", (s, p) => anyZone(p, 25), { data: 50, xp: 90 }),
  A("director5", "Middle management", "Reach Director level 5.", (s) => s.player.level >= 5, { data: 15, xp: 30 }),
  A("director12", "Arctic clearance", "Reach Director level 12.", (s) => s.player.level >= 12, { data: 30, xp: 60 }),
  A("director20", "Industry legend", "Reach Director level 20.", (s) => s.player.level >= 20, { data: 50, xp: 100 }),
  A("director30", "The whole grid", "Reach Director level 30.", (s) => s.player.level >= 30, { data: 100, xp: 200 }),
  A("solaris", "Into the basin", "Unlock SOLARIS 4.", (s) => s.sites.solaris.unlocked, { data: 25, xp: 50 }),
  A("glacier", "Into the ice", "Unlock GLACIER 2.", (s) => s.sites.glacier.unlocked, { data: 40, xp: 80 }),
  A("crew1", "First hire", "Hire your first crew member.", (s) => s.crew.roster.length >= 1, { data: 10, xp: 20 }),
  A("crew5", "A real team", "Hire 5 crew members.", (s) => s.crew.roster.length >= 5, { data: 22, xp: 45 }),
  A("crew10", "The roster fills", "Hire 10 crew members.", (s) => s.crew.roster.length >= 10, { data: 35, xp: 70 }),
  A("crew15", "Full house", "Hire all 15 crew members.", (s) => s.crew.roster.length >= 15, { data: 60, xp: 120 }),
  A("assign5", "Hands on the plant", "Assign 5 crew members.", (s) => s.crew.roster.filter((c) => c.site && c.zone).length >= 5, { data: 24, xp: 50 }),
  A("ability", "Press the button", "Use a crew ability.", (s) => s.stats.abilitiesUsed >= 1, { data: 8, xp: 18 }),
  A("events5", "Five incidents", "Resolve 5 events.", (s) => s.stats.eventsResolved >= 5, { data: 12, xp: 25 }),
  A("events15", "Fifteen incidents", "Resolve 15 events.", (s) => s.stats.eventsResolved >= 15, { data: 24, xp: 50 }),
  A("events30", "Thirty incidents", "Resolve 30 events.", (s) => s.stats.eventsResolved >= 30, { data: 40, xp: 85 }),
  A("discharge", "Use the buffer", "Discharge the battery yard.", (s) => s.stats.batteryDischarges >= 1, { data: 10, xp: 22 }),
  A("gw1", "A gigawatt network", "Reach 1 GW across all sites.", (s) => totalMW(s) >= 1000, { data: 35, xp: 75 }),
  A("research24", "The whole tree", "Install all 24 research upgrades.", (s) => Object.keys(s.research).length >= 24, { data: 80, xp: 160 }),
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function checkAchievements(state, site, d) {
  const earned = [];
  if (!state.achievements) state.achievements = {};
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    let ok = false;
    try { ok = Boolean(a.check(state, site, d)); } catch { ok = false; }
    if (!ok) continue;
    state.achievements[a.id] = true;
    earned.push(a);
  }
  return earned;
}
