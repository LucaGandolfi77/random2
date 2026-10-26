import test from "node:test";
import assert from "node:assert/strict";

import {
  TIERS,
  VIBES,
  MAX_TIER,
  BADGES,
  emptySquad,
  sanitizeSquad,
  countCustomPhotos,
  nameSeed,
  defaultVibeForTier,
  vibeById,
} from "../src/roster.js";

test("there are eleven friendship tiers with growing radii", () => {
  assert.equal(TIERS.length, 11);
  assert.equal(MAX_TIER, 10);
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(TIERS[i].radius > TIERS[i - 1].radius, `${TIERS[i].name} should be bigger`);
  }
  assert.ok(TIERS.every((tier) => tier.color && tier.soft && tier.ring && tier.name));
});

test("the tier colours and ring patterns are not all the same", () => {
  assert.ok(new Set(TIERS.map((tier) => tier.color)).size >= 8);
  assert.ok(new Set(TIERS.map((tier) => tier.ring)).size >= 5);
});

test("an empty squad has one named profile per tier", () => {
  const squad = emptySquad();
  assert.equal(squad.length, 11);
  assert.ok(squad.every((slot) => slot.photo === "" && slot.name === "" && slot.line === ""));
  assert.ok(squad.every((slot, i) => slot.vibe === defaultVibeForTier(i)));
});

test("squad sanitising keeps good local photos and drops bad values", () => {
  const raw = emptySquad();
  raw[0] = { photo: "data:image/webp;base64,AAAA", name: "  Maya  ", vibe: "chaos", line: "  Our worst idea.  " };
  raw[1] = { photo: "https://example.com/tracker.jpg", name: "Evil", vibe: "not-a-vibe", line: 42 };
  raw[2] = { photo: "data:image/png;base64,BBBB", name: "bad\u0001name", line: "line\u0002here" };
  raw[3] = null;
  raw[4] = { photo: 12, name: 42 };
  const clean = sanitizeSquad(raw);
  assert.equal(clean[0].photo, "data:image/webp;base64,AAAA");
  assert.equal(clean[0].name, "Maya");
  assert.equal(clean[0].vibe, "chaos");
  assert.equal(clean[0].line, "Our worst idea.");
  assert.equal(clean[1].photo, "");
  assert.equal(clean[1].vibe, defaultVibeForTier(1));
  assert.equal(clean[1].line, "");
  assert.equal(clean[2].name, "bad name");
  assert.equal(clean[2].line, "line here");
  assert.equal(clean[3].photo, "");
  assert.equal(clean[4].name, "");
  assert.equal(countCustomPhotos(clean), 2);
});

test("vibes have a unique id and a usable fallback", () => {
  assert.equal(new Set(VIBES.map((vibe) => vibe.id)).size, VIBES.length);
  assert.ok(VIBES.every((vibe) => vibe.name && vibe.emoji && vibe.note));
  assert.equal(vibeById("missing").id, VIBES[0].id);
  assert.equal(defaultVibeForTier(0), VIBES[0].id);
  assert.equal(defaultVibeForTier(VIBES.length), VIBES[0].id);
});

test("sanitising old or malformed storage never throws", () => {
  assert.deepEqual(sanitizeSquad(null), emptySquad());
  assert.deepEqual(sanitizeSquad("nope"), emptySquad());
  assert.equal(sanitizeSquad([{ name: "Only a name" }])[0].name, "Only a name");
});

test("names are capped and control characters are removed", () => {
  const raw = emptySquad();
  raw[0] = { name: "A".repeat(100) + "\n\u0000oops" };
  const name = sanitizeSquad(raw)[0].name;
  assert.equal(name.length, 22);
  assert.ok(!/[\u0000-\u001f]/.test(name));
});

test("badge ids are unique and all have descriptions", () => {
  assert.equal(new Set(BADGES.map((badge) => badge.id)).size, BADGES.length);
  assert.ok(BADGES.every((badge) => badge.name && badge.note));
});

test("the fallback face seed is deterministic and name-sensitive", () => {
  assert.equal(nameSeed("Maya", 4), nameSeed("Maya", 4));
  assert.notEqual(nameSeed("Maya", 4), nameSeed("Nora", 4));
  assert.notEqual(nameSeed("Maya", 4), nameSeed("Maya", 5));
});
