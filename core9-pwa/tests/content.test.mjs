import test from "node:test";
import assert from "node:assert/strict";

import {
  ZONES, ZONE_BY_ID, BASE_ZONE_IDS, SPECIAL_ZONE_IDS, MAP, MAX_LEVEL,
  STAGE_LEVELS, stageForLevel, TUTORIAL,
} from "../src/data/zones.js";
import { SITES, SITE_BY_ID, SITE_ORDER } from "../src/data/sites.js";
import { RESEARCH, MISSIONS, MISSION_BY_ID } from "../src/data/progression.js";
import { EVENTS, EVENT_BY_ID } from "../src/data/events.js";
import { CREW, CREW_BY_ID } from "../src/data/crew.js";
import { ACHIEVEMENTS } from "../src/data/achievements.js";
import { COPY } from "../src/data/copy.js";

test("the network has three sites with twelve unique plots each", () => {
  assert.equal(SITES.length, 3);
  assert.deepEqual(SITE_ORDER, ["core9", "solaris", "glacier"]);
  for (const site of SITES) {
    assert.equal(site.zoneIds.length, 12, site.id);
    assert.equal(new Set(site.zoneIds).size, 12, site.id);
    assert.ok(site.zoneIds.includes("battery"), site.id);
    assert.ok(site.zoneIds.includes(site.uniqueZone), site.id);
    for (const id of site.zoneIds) assert.ok(ZONE_BY_ID[id], site.id + " → " + id);
    for (const id of site.zoneIds) {
      const p = site.plots[id];
      assert.ok(p, site.id + " missing plot " + id);
      assert.ok(p.x >= 0 && p.y >= 0, site.id + "." + id);
      assert.ok(p.x + p.w <= site.map.cols, site.id + "." + id);
      assert.ok(p.y + p.d <= site.map.rows, site.id + "." + id);
    }
  }
  assert.equal(BASE_ZONE_IDS.length, 10);
  assert.equal(SPECIAL_ZONE_IDS.length, 4);
  assert.equal(ZONES.length, 14);
});

test("all fourteen zones have eight stages and a 25-level cap", () => {
  assert.equal(MAX_LEVEL, 25);
  assert.deepEqual(STAGE_LEVELS, [1, 4, 7, 10, 13, 16, 20, 25]);
  assert.deepEqual(STAGE_LEVELS.map(stageForLevel), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(stageForLevel(25), 8);
  assert.equal(stageForLevel(0), 0);
  for (const z of ZONES) {
    assert.equal(z.stages.length, 8, z.id);
    assert.ok(z.baseCost > 0 && z.growth > 1, z.id);
    assert.ok(z.name && z.desc && z.effectLabel, z.id);
  }
});

test("site modifiers and unlock requirements are valid", () => {
  for (const site of SITES) {
    assert.ok(site.startCredits > 0, site.id);
    assert.ok(site.prestigeMW > 0, site.id);
    assert.ok(site.modifiers && site.modifiers.cooling > 0 && site.modifiers.price > 0, site.id);
    assert.ok(site.map.cols > 0 && site.map.rows > 0, site.id);
    assert.ok(site.map.vertical.length > 0 && site.map.horizontal.length > 0, site.id);
    if (site.unlock) {
      assert.ok(site.unlock.director >= 1, site.id);
      assert.ok(site.unlock.isotopes >= 0, site.id);
    }
  }
  assert.equal(SITE_BY_ID.solaris.uniqueZone, "solar");
  assert.equal(SITE_BY_ID.glacier.uniqueZone, "geothermal");
  assert.equal(SITE_BY_ID.core9.uniqueZone, "pump");
});

test("research is a 24-node global tree with valid effects", () => {
  assert.equal(RESEARCH.length, 24);
  const ids = new Set();
  for (const r of RESEARCH) {
    assert.ok(!ids.has(r.id), r.id);
    ids.add(r.id);
    assert.ok(r.cost > 0 && r.lab >= 1, r.id);
    assert.ok(r.effect && Object.keys(r.effect).length > 0, r.id);
  }
});

test("missions are a 60-goal global chain", () => {
  assert.equal(MISSIONS.length, 60);
  const ids = new Set();
  for (const m of MISSIONS) {
    assert.ok(!ids.has(m.id), m.id);
    ids.add(m.id);
    assert.equal(typeof m.check, "function", m.id);
    assert.ok(m.credits > 0 && m.xp >= 0, m.id);
  }
  assert.ok(MISSION_BY_ID.mw100);
  assert.deepEqual(MISSIONS.slice(0, 3).map((m) => m.id), ["cooling", "turbine", "grid"]);
});

test("the event table has at least thirty events, choices and site filters", () => {
  assert.ok(EVENTS.length >= 30, String(EVENTS.length));
  const ids = new Set();
  for (const e of EVENTS) {
    assert.ok(!ids.has(e.id), e.id);
    ids.add(e.id);
    assert.ok(e.name && e.body && e.weight > 0, e.id);
    if (!e.auto) {
      assert.ok(Array.isArray(e.choices) && e.choices.length >= 2, e.id);
      for (const c of e.choices) {
        assert.ok(c.label && c.desc && c.effects, e.id);
      }
    }
  }
  assert.ok(EVENTS.some((e) => e.sites && e.sites.includes("solaris")));
  assert.ok(EVENTS.some((e) => e.sites && e.sites.includes("glacier")));
  assert.ok(EVENT_BY_ID.strike);
});

test("the crew has fifteen unique named characters with passives and actives", () => {
  assert.equal(CREW.length, 15);
  const ids = new Set();
  for (const c of CREW) {
    assert.ok(!ids.has(c.id), c.id);
    ids.add(c.id);
    assert.ok(c.name && c.role && c.bio && c.quote, c.id);
    assert.ok(c.passive && c.passive.kind && c.passive.value > 0, c.id);
    assert.ok(c.active && c.active.id && c.active.cooldown > 0, c.id);
    assert.ok(c.portrait && c.portrait.skin && c.portrait.hardhat, c.id);
    assert.ok(c.unlock && (c.unlock.starter || c.unlock.director || c.unlock.mission || c.unlock.site), c.id);
  }
  assert.ok(CREW_BY_ID.mara);
  assert.ok(CREW_BY_ID.samira);
});

test("there are thirty achievements", () => {
  assert.equal(ACHIEVEMENTS.length, 30);
  const ids = new Set();
  for (const a of ACHIEVEMENTS) {
    assert.ok(!ids.has(a.id), a.id);
    ids.add(a.id);
    assert.ok(a.name && a.desc && typeof a.check === "function", a.id);
  }
});

test("tutorial targets and English copy survive the expansion", () => {
  assert.equal(TUTORIAL.length, 4);
  for (const step of TUTORIAL) assert.ok(ZONE_BY_ID[step.target], step.target);
  assert.equal(COPY.title, "CORE 9");
  assert.match(COPY.intro.start, /control room/i);
  assert.match(COPY.sheet.upgrade, /Upgrade/i);
  assert.match(COPY.prestige.title, /generation/i);
  assert.match(COPY.research.resetNote, /global and permanent/i);
});
