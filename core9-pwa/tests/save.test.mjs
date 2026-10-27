import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState, sanitizeState, levelFromXp, xpForLevel } from "../src/sim/state.js";
import { exportSave, importSave } from "../src/sim/save.js";

const NOW = 1_700_000_000_000;

test("a v1 save migrates to a v2 River Valley site without losing research or missions", () => {
  const v1 = {
    v: 1, credits: 321, bank: 9, data: 12, waste: 4, generation: 3, isotopes: 5,
    zones: { reactor: { level: 6 }, cooling: { level: 5 }, turbine: { level: 4 }, substation: { level: 3 }, lab: { level: 2 } },
    research: { blades: true, exchangers: true },
    missions: { active: ["control"], done: ["cooling", "turbine"], completions: 2 },
    stats: { earned: 5000, collected: 4000, upgrades: 20, builds: 8, maxMW: 80, bestMW: 120, prestiges: 1 },
    tutorial: 4, tutorialDone: true, lastSeen: NOW - 1000,
  };
  const s = sanitizeState(v1, NOW);
  assert.equal(s.v, 2);
  assert.equal(s.activeSite, "core9");
  assert.equal(s.sites.core9.zones.reactor.level, 6);
  assert.equal(s.sites.core9.zones.cooling.level, 5);
  assert.equal(s.sites.core9.credits, 321);
  assert.equal(s.sites.core9.generation, 3);
  assert.equal(s.research.blades, true);
  assert.equal(s.research.exchangers, true);
  assert.ok(s.missions.done.includes("turbine"));
  assert.equal(s.sites.solaris.unlocked, false);
  assert.ok(s.player.level >= 1);
});

test("export and import round-trip the whole network", () => {
  const s = createInitialState(NOW);
  s.sites.solaris.unlocked = true;
  s.sites.solaris.zones.reactor.level = 4;
  s.player.level = 7;
  s.player.xp = xpForLevel(7);
  s.research.blades = true;
  s.crew.roster.push({ id: "mara", level: 2, xp: 90, site: "core9", zone: "reactor", traits: [] });
  s.achievements.first_build = true;
  const text = exportSave(s);
  const back = importSave(text, NOW);
  assert.ok(back);
  assert.equal(back.sites.solaris.unlocked, true);
  assert.equal(back.sites.solaris.zones.reactor.level, 4);
  assert.equal(back.player.level, 7);
  assert.equal(back.research.blades, true);
  assert.equal(back.crew.roster.length, 1);
  assert.equal(back.crew.roster[0].site, "core9");
  assert.equal(back.achievements.first_build, true);
});

test("a corrupt or non-CORE 9 file is rejected", () => {
  assert.equal(importSave("not json", NOW), null);
  assert.equal(importSave(JSON.stringify({ game: "other", sites: {} }), NOW), null);
});

test("a v2 save with a locked active site falls back to River Valley", () => {
  const s = createInitialState(NOW);
  s.activeSite = "glacier";
  s.sites.glacier.unlocked = false;
  const clean = sanitizeState(s, NOW);
  assert.equal(clean.activeSite, "core9");
  assert.equal(clean.sites.core9.unlocked, true);
});

test("crew assignments to invalid zones are cleaned up", () => {
  const s = createInitialState(NOW);
  s.crew.roster.push({ id: "mara", level: 1, xp: 0, site: "core9", zone: "solar", traits: [] });
  const clean = sanitizeState(s, NOW);
  assert.equal(clean.crew.roster[0].site, null);
  assert.equal(clean.crew.roster[0].zone, null);
});

test("director levels map monotonically to XP", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(xpForLevel(5)), 5);
  assert.equal(levelFromXp(1e12), 30);
  for (let level = 1; level < 30; level++) {
    assert.ok(levelFromXp(xpForLevel(level + 1)) >= level + 1);
  }
});
