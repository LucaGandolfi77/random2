import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState } from "../src/sim/state.js";
import { derive, buildOrUpgrade } from "../src/sim/economy.js";
import {
  triggerEvent, resolveEvent, tickEvent, choicesFor, choiceAvailable, eventPool, pickEvent, applyEffects,
} from "../src/sim/events.js";
import { hireCrew, assignCrew } from "../src/sim/crew.js";
import { batteryCapacityForLevel } from "../src/sim/state.js";

const NOW = 1_700_000_000_000;

function base() {
  const s = createInitialState(NOW);
  for (const id of ["cooling", "turbine", "substation"]) buildOrUpgrade(s, id, "core9", NOW);
  return s;
}

test("an automatic event applies its buff immediately and logs when resolved", () => {
  const s = base();
  const before = derive(s, "core9", NOW).price;
  const ev = triggerEvent(s, "demand", "core9", NOW, () => 0.5);
  assert.equal(ev.def.id, "demand");
  assert.equal(s.event.mode, "auto");
  assert.ok(derive(s, "core9", NOW + 1000).price > before);
  const r = resolveEvent(s, -1, NOW + 2000);
  assert.equal(r.ok, true);
  assert.equal(s.event, null);
  assert.equal(s.stats.eventsResolved, 1);
  assert.equal(s.eventLog.length, 1);
});

test("a choice event waits, offers choices and applies the chosen outcome", () => {
  const s = base();
  triggerEvent(s, "strike", "core9", NOW, () => 0.5);
  const choices = choicesFor(s, s.event);
  assert.equal(choices.length, 3);
  assert.equal(choices[2].available, false);
  const before = derive(s, "core9", NOW).netMW;
  const r = resolveEvent(s, 1, NOW + 1000);
  assert.equal(r.ok, true);
  assert.equal(s.event, null);
  assert.equal(s.stats.eventsResolved, 1);
  assert.ok(derive(s, "core9", NOW + 1000).netMW < before);
});

test("a choice event falls back to its default when the timer expires", () => {
  const s = base();
  triggerEvent(s, "protest", "core9", NOW, () => 0.5);
  s.event.endsAt = NOW + 1000;
  const r = tickEvent(s, NOW + 2000);
  assert.ok(r);
  assert.equal(s.event, null);
  assert.equal(s.stats.eventsResolved, 1);
  assert.equal(s.eventLog.length, 1);
});

test("map-specific event pools differ by site", () => {
  const s = base();
  const solar = eventPool(s, "solaris").map((e) => e.id);
  const arctic = eventPool(s, "glacier").map((e) => e.id);
  const river = eventPool(s, "core9").map((e) => e.id);
  assert.ok(solar.includes("sandstorm"));
  assert.ok(arctic.includes("aurora"));
  assert.ok(!river.includes("sandstorm"));
  assert.ok(!river.includes("aurora"));
  for (let i = 0; i < 20; i++) {
    const id = pickEvent(s, "glacier", () => i / 20);
    assert.ok(arctic.includes(id) || eventPool(s, "glacier").some((e) => e.id === id));
  }
});

test("a character-specific choice unlocks when the right operator is on site", () => {
  const s = base();
  s.sites.core9.credits = 5000;
  s.data = 20;
  s.missions.done.push("collect10k");
  hireCrew(s, "aya");
  assignCrew(s, "aya", "core9", "reactor");
  triggerEvent(s, "protest", "core9", NOW, () => 0.5);
  const choices = choicesFor(s, s.event);
  assert.equal(choices[2].available, true);
  const r = resolveEvent(s, 2, NOW + 1000);
  assert.equal(r.ok, true);
  assert.ok(r.choice.label.includes("Aya"));
});

test("instant effects can add data, remove waste and charge the battery", () => {
  const s = base();
  s.sites.core9.zones.battery.level = 2;
  s.sites.core9.zones.waste.level = 1;
  s.sites.core9.waste = 100;
  const data = s.data;
  applyEffects(s, { data: 12, waste: -0.25, battery: 0.5 }, "core9", NOW, "test");
  assert.equal(s.data, data + 12);
  assert.ok(s.sites.core9.waste < 100);
  assert.ok(s.sites.core9.battery.charge > 0);
  assert.ok(s.sites.core9.battery.charge <= batteryCapacityForLevel(2));
});
