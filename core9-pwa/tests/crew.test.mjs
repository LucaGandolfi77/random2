import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState } from "../src/sim/state.js";
import { derive, buildOrUpgrade, tick } from "../src/sim/economy.js";
import {
  candidates, hireCrew, assignCrew, unassignCrew, crewEffects, crewSlots, crewUsed,
  useAbility, tickCrew, addCrewXp, characterState, abilityReadyAt,
} from "../src/sim/crew.js";

const NOW = 1_700_000_000_000;

function base() {
  const s = createInitialState(NOW);
  for (const id of ["cooling", "turbine", "substation"]) buildOrUpgrade(s, id, "core9", NOW);
  return s;
}

test("starters are available and deterministic hiring works", () => {
  const s = base();
  const open = candidates(s).map((c) => c.id);
  assert.ok(open.includes("mara"));
  assert.ok(open.includes("sam"));
  assert.equal(hireCrew(s, "mara").ok, true);
  assert.equal(hireCrew(s, "mara").reason, "hired");
  assert.equal(characterState(s, "mara").level, 1);
  assert.equal(characterState(s, "bruno"), null);
});

test("assignment respects preferred plots, slots and one operator per plot", () => {
  const s = base();
  s.sites.core9.credits = 5000;
  s.missions.done.push("grid");
  hireCrew(s, "mara");
  hireCrew(s, "sam");
  assert.equal(crewSlots(s, "core9"), 2);
  assert.equal(assignCrew(s, "mara", "core9", "reactor").ok, true);
  assert.equal(assignCrew(s, "sam", "core9", "turbine").ok, true);
  assert.equal(crewUsed(s, "core9"), 2);
  assert.equal(assignCrew(s, "mara", "core9", "turbine").reason, "occupied");
  // Mara moves off reactor; Sam still holds turbine; the cooling plot is free.
  assert.equal(assignCrew(s, "mara", "core9", "cooling").ok, true);
  assert.equal(assignCrew(s, "mara", "core9", "reactor").ok, true);
  assert.equal(unassignCrew(s, "sam").ok, true);
  assert.equal(crewUsed(s, "core9"), 1);
});

test("a preferred plot gives the full passive and elsewhere gives half", () => {
  const s = base();
  hireCrew(s, "mara");
  assignCrew(s, "mara", "core9", "reactor");
  const preferred = derive(s, "core9", NOW).heat;
  assignCrew(s, "mara", "core9", "cooling");
  const off = derive(s, "core9", NOW).heat;
  assert.ok(preferred > off);
  assert.ok(Math.abs(preferred - 11.2) < 1e-9);
  assert.ok(Math.abs(off - 10.6) < 1e-9);
  const effects = crewEffects(s, "core9");
  assert.ok(effects.heat > 1);
});

test("abilities write buffs, increment stats and start cooldowns", () => {
  const s = base();
  s.sites.core9.zones.cooling.level = 4;
  hireCrew(s, "mara");
  assignCrew(s, "mara", "core9", "reactor");
  const before = derive(s, "core9", NOW).netMW;
  const r = useAbility(s, "mara", "core9", NOW);
  assert.equal(r.ok, true);
  assert.equal(s.buffs.length, 1);
  assert.equal(s.stats.abilitiesUsed, 1);
  assert.ok(derive(s, "core9", NOW + 1000).netMW > before);
  assert.equal(useAbility(s, "mara", "core9", NOW + 1000).reason, "cooldown");
  assert.ok(abilityReadyAt(s, "mara") > NOW + 1000);
});

test("crew XP levels a character when assigned", () => {
  const s = base();
  hireCrew(s, "mara");
  assignCrew(s, "mara", "core9", "reactor");
  const member = characterState(s, "mara");
  addCrewXp(member, 90);
  assert.ok(member.level >= 2);
  const before = member.xp;
  tickCrew(s, 10, "core9", 1);
  assert.ok(member.xp > before);
  assert.ok(member.level <= 5);
});

test("an ability cannot be used from another site", () => {
  const s = base();
  hireCrew(s, "mara");
  assignCrew(s, "mara", "core9", "reactor");
  const r = useAbility(s, "mara", "solaris", NOW);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "not_here");
});
