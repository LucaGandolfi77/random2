import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState } from "../src/sim/state.js";
import {
  derive, tick, buildOrUpgrade, collect, upgradeCostForSite, buyResearch,
  canPrestige, prestigeGain, prestige, unlockSite, switchSite,
} from "../src/sim/economy.js";
import { hireCrew, assignCrew, candidates } from "../src/sim/crew.js";
import { SITE_BY_ID } from "../src/data/sites.js";
import { siteZones } from "../src/data/zones.js";
import { RESEARCH } from "../src/data/progression.js";

/*
 * A simple network director: build every plot when affordable, hire and
 * assign candidates, buy research, collect every eight seconds, and keep
 * cooling/waste healthy before chasing output. The bot must reach the first
 * prestige threshold and then open Solaris without a dead end.
 */
function play(minutes) {
  const s = createInitialState(1_700_000_000_000);
  let now = 1_700_000_000_000;
  let first100 = null;
  const baseOrder = ["cooling", "turbine", "substation", "battery", "pump", "control", "fuel", "waste", "lab", "security", "admin"];

  for (let t = 0; t < minutes * 60; t++) {
    const siteDef = SITE_BY_ID[s.activeSite];
    const site = s.sites[s.activeSite];
    const zones = siteZones(siteDef);
    const affordable = (id) => {
      const zone = zones.find((z) => z.id === id);
      const level = site.zones[id] ? site.zones[id].level : 0;
      return zone && level < 25 && site.credits >= upgradeCostForSite(s, s.activeSite, zone, level);
    };
    for (const id of baseOrder) {
      if (site.zones[id] && site.zones[id].level === 0 && affordable(id)) buildOrUpgrade(s, id, s.activeSite, now);
    }
    for (const r of RESEARCH) {
      if (!s.research[r.id] && site.zones.lab && site.zones.lab.level >= r.lab && s.data >= r.cost) buyResearch(s, r.id);
    }
    for (const c of candidates(s)) {
      if (site.credits >= c.cost.credits && s.data >= c.cost.data && hireCrew(s, c.id).ok) {
        const zone = zones.find((z) => z.id === c.preferred);
        if (zone) assignCrew(s, c.id, s.activeSite, c.preferred);
      }
    }
    if (t % 8 === 0) collect(s, s.activeSite, now);

    const d = derive(s, s.activeSite, now);
    const priority = [];
    if (d.waste > d.wasteCap * 0.72 && site.zones.waste.level > 0) priority.push("waste");
    if (d.cooling < d.heat * 1.12) priority.push("cooling");
    priority.push("reactor", "turbine", "substation", "cooling", "waste", "battery", "control", "fuel", "lab", "security", "admin", "pump", "solar", "geothermal");
    for (const id of [...new Set(priority)]) {
      if (site.zones[id] && site.zones[id].level > 0 && affordable(id)) { buildOrUpgrade(s, id, s.activeSite, now); break; }
    }
    tick(s, 1, now);
    now += 1000;
    if (s.sites.core9.maxMW >= 100 && first100 === null) first100 = t;
  }
  return { s, first100, now };
}

test("a simple director reaches the first prestige threshold in a sensible session", () => {
  const { s, first100 } = play(45);
  assert.ok(first100 !== null, "bot never reached 100 MW on River Valley");
  assert.ok(first100 >= 5 * 60, "prestige arrived too fast: " + first100 + "s");
  assert.ok(first100 <= 45 * 60, "prestige took too long: " + first100 + "s");
  assert.ok(canPrestige(s, "core9"));
  assert.ok(s.player.level >= 5, "director level " + s.player.level);
  assert.ok(s.stats.crewHired >= 1);
});

test("prestige and Solaris unlock are reachable from a real run", () => {
  const { s, now } = play(30);
  assert.ok(canPrestige(s, "core9"));
  const gain = prestigeGain(s, "core9");
  const r = prestige(s, "core9", now);
  assert.equal(r.ok, true);
  assert.ok(s.isotopes >= gain);
  assert.ok(s.player.level >= 5, "solaris needs director level 5");
  const u = unlockSite(s, "solaris", now);
  assert.equal(u.ok, true, "unlock failed: " + JSON.stringify(u));
  assert.equal(switchSite(s, "solaris", now).ok, true);
  assert.equal(s.activeSite, "solaris");
  for (const id of ["cooling", "turbine", "substation"]) {
    const r2 = buildOrUpgrade(s, id, "solaris", now);
    assert.equal(r2.ok, true, "solaris " + id);
  }
  const d = derive(s, "solaris", now);
  assert.ok(d.netMW > 0);
  assert.equal(d.status, "online");
  assert.equal(d.siteId, "solaris");
});

test("the network stays finite through an hour of play", () => {
  const { s } = play(60);
  for (const siteId of Object.keys(s.sites)) {
    const d = derive(s, siteId, 1_700_000_000_000 + 3600 * 1000);
    for (const key of ["netMW", "revenue", "heat", "cooling", "wasteCap", "dataRate", "batteryCap"]) {
      assert.ok(Number.isFinite(d[key]), siteId + "." + key);
    }
    assert.ok(Number.isFinite(s.sites[siteId].credits));
    assert.ok(Number.isFinite(s.sites[siteId].bank));
    assert.ok(Number.isFinite(s.sites[siteId].waste));
  }
});
