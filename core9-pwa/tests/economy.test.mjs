import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState, sanitizeState, wasteCapacity, batteryCapacityForLevel } from "../src/sim/state.js";
import {
  derive, buildOrUpgrade, upgradeCost, upgradeCostForSite, collect, tick, buyResearch,
  startOverclock, useBattery, prestige, prestigeGain, canPrestige, unlockSite, switchSite,
  applyOffline, totalNetworkMW,
} from "../src/sim/economy.js";
import { SITE_BY_ID } from "../src/data/sites.js";
import { siteZones, ZONE_BY_ID } from "../src/data/zones.js";
import { RESEARCH } from "../src/data/progression.js";

const NOW = 1_700_000_000_000;

function chain(s, siteId = "core9") {
  const def = SITE_BY_ID[siteId];
  for (const id of ["cooling", "turbine", "substation"]) {
    const r = buildOrUpgrade(s, id, siteId, NOW);
    assert.equal(r.ok, true, siteId + "." + id);
  }
  return s;
}

test("a new network has three sites and twelve plots on River Valley", () => {
  const s = createInitialState(NOW);
  assert.deepEqual(Object.keys(s.sites), ["core9", "solaris", "glacier"]);
  assert.equal(s.activeSite, "core9");
  assert.equal(Object.keys(s.sites.core9.zones).length, 12);
  assert.equal(s.sites.solaris.unlocked, false);
  assert.equal(s.sites.core9.zones.reactor.level, 1);
  const d = derive(s, "core9", NOW);
  assert.equal(d.netMW, 0);
  assert.equal(d.status, "offline");
});

test("the heat → turbine → grid chain produces megawatts and money", () => {
  const s = chain(createInitialState(NOW));
  const d = derive(s, "core9", NOW);
  assert.equal(d.heat, 10);
  assert.equal(d.cooling, 14);
  assert.equal(Math.round(d.efficiency * 100), 40);
  assert.equal(d.netMW, 4);
  assert.ok(Math.abs(d.revenue - 4.8) < 1e-9);
  assert.equal(d.status, "online");
});

test("unlocking follows the declared prerequisite per site", () => {
  const s = createInitialState(NOW);
  s.sites.core9.credits = 1e9;
  const r = buildOrUpgrade(s, "turbine", "core9", NOW);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "locked");
  assert.equal(r.unlock.zone, "cooling");
});

test("site build-cost modifiers apply after the base level cost", () => {
  const s = createInitialState(NOW);
  s.sites.glacier.unlocked = true;
  const cooling = ZONE_BY_ID.cooling;
  const base = upgradeCost(cooling, 3);
  const glacier = upgradeCostForSite(s, "glacier", cooling, 3);
  assert.ok(glacier > base);
  assert.ok(upgradeCostForSite(s, "core9", cooling, 3) <= base);
});

test("heat above cooling capacity throttles output", () => {
  const s = chain(createInitialState(NOW));
  s.sites.core9.zones.reactor.level = 10;
  s.sites.core9.zones.cooling.level = 1;
  const d = derive(s, "core9", NOW);
  assert.ok(d.util < 0.5);
  assert.equal(d.status, "heat");
  assert.ok(Number.isFinite(d.netMW));
});

test("a full vault throttles output and a recycling vault recovers", () => {
  const s = chain(createInitialState(NOW));
  s.sites.core9.zones.waste.level = 1;
  s.sites.core9.waste = wasteCapacity(s, "core9");
  const d = derive(s, "core9", NOW);
  assert.equal(d.wasteFull, true);
  assert.ok(d.netMW < d.grossMW);
  s.sites.core9.waste = 0;
  const d2 = derive(s, "core9", NOW);
  assert.equal(d2.wasteFull, false);
  assert.ok(d2.netMW >= d.netMW);
});

test("tick banks revenue and produces at 25% from an inactive site", () => {
  const s = chain(createInitialState(NOW));
  s.sites.solaris.unlocked = true;
  s.sites.solaris.zones.reactor.level = 1;
  chain(s, "solaris");
  s.sites.solaris.credits = 1e9;
  chain(s, "solaris");
  const activeBefore = s.sites.core9.bank;
  const idleBefore = s.sites.solaris.bank;
  for (let i = 0; i < 10; i++) tick(s, 1, NOW + i * 1000);
  assert.ok(s.sites.core9.bank > activeBefore);
  assert.ok(s.sites.solaris.bank > idleBefore);
  assert.ok(s.sites.solaris.bank < s.sites.core9.bank * 2);
});

test("collect pays the active site with the collection bonus", () => {
  const s = chain(createInitialState(NOW));
  s.sites.core9.zones.admin.level = 5;
  s.sites.core9.bank = 100;
  const before = s.sites.core9.credits;
  const amount = collect(s, "core9", NOW);
  assert.ok(amount > 100);
  assert.equal(s.sites.core9.bank, 0);
  assert.ok(Math.abs(s.sites.core9.credits - (before + amount)) < 1e-9);
});

test("research is global and requires a lab on the active site", () => {
  const s = chain(createInitialState(NOW));
  const blades = RESEARCH.find((r) => r.id === "blades");
  assert.equal(buyResearch(s, blades.id).ok, false);
  s.sites.core9.zones.lab.level = 1;
  s.data = blades.cost;
  const r = buyResearch(s, blades.id);
  assert.equal(r.ok, true);
  assert.equal(s.research.blades, true);
  assert.ok(derive(s, "core9", NOW).efficiency >= 0.48);
});

test("overclock raises thermal output and then cools down", () => {
  const s = chain(createInitialState(NOW));
  s.sites.core9.zones.cooling.level = 4;
  const before = derive(s, "core9", NOW).netMW;
  assert.equal(startOverclock(s, "core9", NOW).ok, true);
  assert.ok(derive(s, "core9", NOW + 1000).netMW > before);
  assert.equal(startOverclock(s, "core9", NOW + 2000).ok, false);
});

test("the battery yard charges and discharges", () => {
  const s = chain(createInitialState(NOW));
  s.sites.core9.credits = 1e9;
  s.sites.core9.zones.battery.level = 2;
  s.sites.core9.battery.charge = batteryCapacityForLevel(2);
  const d = derive(s, "core9", NOW);
  assert.ok(d.batteryCap > 0);
  const before = d.netMW;
  assert.equal(useBattery(s, "core9", NOW).ok, true);
  const after = derive(s, "core9", NOW + 1000).netMW;
  assert.ok(after > before);
  assert.equal(s.stats.batteryDischarges, 1);
});

test("offline applies to all unlocked sites and returns a per-site report", () => {
  const s = chain(createInitialState(NOW));
  s.sites.solaris.unlocked = true;
  chain(s, "solaris");
  const report = applyOffline(s, 3600, NOW);
  assert.equal(report.sites.length, 2);
  assert.ok(report.earned > 0);
  assert.ok(s.sites.core9.bank > 0);
  assert.ok(s.sites.solaris.bank > 0);
});

test("prestige is per site and keeps global research", () => {
  const s = chain(createInitialState(NOW));
  s.sites.core9.maxMW = 100;
  s.research.blades = true;
  const beforeGen = s.sites.core9.generation;
  assert.equal(canPrestige(s, "core9"), true);
  const gain = prestigeGain(s, "core9");
  const r = prestige(s, "core9", NOW);
  assert.equal(r.ok, true);
  assert.ok(gain >= 1);
  assert.equal(s.sites.core9.generation, beforeGen + 1);
  assert.equal(s.sites.core9.zones.reactor.level, 1);
  assert.equal(s.sites.core9.zones.cooling.level, 0);
  assert.equal(s.research.blades, true);
  assert.ok(s.isotopes >= gain);
});

test("a site unlocks with director level and isotopes and can be switched", () => {
  const s = chain(createInitialState(NOW));
  s.player.level = 12;
  s.player.xp = 66000;
  s.isotopes = 20;
  const r = unlockSite(s, "glacier", NOW);
  assert.equal(r.ok, true);
  assert.ok(s.isotopes < 20);
  assert.equal(switchSite(s, "glacier", NOW).ok, true);
  assert.equal(s.activeSite, "glacier");
  assert.ok(s.stats.sitesVisited.includes("glacier"));
});

test("a version 1 save migrates into the River Valley site", () => {
  const v1 = {
    v: 1,
    credits: 900, bank: 12, data: 7, waste: 3, generation: 2, isotopes: 4,
    zones: { reactor: { level: 4 }, cooling: { level: 3 }, turbine: { level: 2 }, substation: { level: 2 } },
    research: { blades: true },
    missions: { active: ["control"], done: ["cooling"], completions: 1 },
    stats: { earned: 1000, collected: 800, upgrades: 12, builds: 4, maxMW: 42, bestMW: 80, prestiges: 1 },
    tutorial: 4, tutorialDone: true, lastSeen: NOW - 5000,
  };
  const s = sanitizeState(v1, NOW);
  assert.equal(s.v, 2);
  assert.equal(s.activeSite, "core9");
  assert.equal(s.sites.core9.credits, 900);
  assert.equal(s.sites.core9.zones.reactor.level, 4);
  assert.equal(s.sites.core9.zones.cooling.level, 3);
  assert.equal(s.sites.core9.generation, 2);
  assert.equal(s.isotopes, 4);
  assert.equal(s.research.blades, true);
  assert.equal(s.sites.solaris.unlocked, false);
});

test("derived numbers stay finite at maximum levels and high isotopes", () => {
  const s = createInitialState(NOW);
  for (const site of Object.values(s.sites)) {
    site.unlocked = true;
    for (const id of Object.keys(site.zones)) site.zones[id].level = 25;
    site.waste = 1e9;
    site.battery.charge = 1e9;
  }
  s.isotopes = 100;
  for (const siteId of Object.keys(s.sites)) {
    const d = derive(s, siteId, NOW);
    for (const key of ["heat", "cooling", "netMW", "revenue", "wasteCap", "dataRate", "batteryCap"]) {
      assert.ok(Number.isFinite(d[key]), siteId + "." + key);
    }
  }
});
