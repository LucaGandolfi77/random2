import test from "node:test";
import assert from "node:assert/strict";

import {
  createEngine,
  createQueue,
  WORLD,
  POWERS,
  DAILY_RULES,
} from "../src/engine.js";
import { TIERS, MAX_TIER } from "../src/roster.js";
import { chooseChat, EVENT_LINES, VIBE_LINES, CHAT_KINDS } from "../src/chat.js";
import { encodeDare, decodeDare, dareUrl, normalizeDare, dareFromSearch } from "../src/dare.js";

function disc(tier, x, y, opts = {}) {
  return {
    id: opts.id || Math.floor(Math.random() * 1e6),
    tier,
    wildcard: !!opts.wildcard,
    radius: opts.radius || (tier >= 0 ? TIERS[tier].radius : 24),
    x, y,
    vx: opts.vx || 0,
    vy: opts.vy || 0,
    age: opts.age == null ? 2 : opts.age,
    touched: opts.touched !== false,
    cooldown: opts.cooldown || 0,
    dropId: 0,
    spin: 0,
    squash: 0,
    dying: false,
    bornAt: 0,
    merged: false,
  };
}

function withDiscs(engine, list) {
  engine.state.discs = list;
  return engine;
}

test("starts with a held friend, a preview and a little hype", () => {
  const e = createEngine({ seed: 7 });
  assert.equal(e.state.status, "playing");
  assert.ok(e.state.currentTier >= 0 && e.state.currentTier <= 4);
  assert.ok(e.state.nextTier >= 0 && e.state.nextTier <= 4);
  assert.equal(e.state.hype, 20);
  assert.equal(e.state.score, 0);
  assert.equal(e.state.discs.length, 0);
});

test("drop uses the held tier, consumes the queue and respects the cooldown", () => {
  const e = createEngine({ seed: 9 });
  e.state.currentTier = 2;
  e.state.nextTier = 1;
  const first = e.drop(150);
  assert.equal(first.ok, true);
  assert.equal(e.state.discs.length, 1);
  assert.equal(e.state.discs[0].tier, 2);
  assert.equal(e.state.currentTier, 1);
  assert.equal(e.drop(150).reason, "wait");
  for (let i = 0; i < 5; i++) e.tick(0.1);
  assert.equal(e.drop(160).ok, true);
});

test("same-tier friends merge into the next tier and score", () => {
  const e = createEngine({ seed: 3, config: { gravity: 0 } });
  withDiscs(e, [
    disc(0, 180, 500, { id: 1 }),
    disc(0, 205, 500, { id: 2 }),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.discs.length, 1);
  assert.equal(e.state.discs[0].tier, 1);
  assert.ok(e.state.score >= 110);
  assert.equal(e.state.merges, 1);
  assert.equal(e.state.bestCombo, 1);
  const events = e.drainEvents();
  assert.ok(events.some((ev) => ev.type === "merge" && ev.newTier === 1));
});

test("different tiers do not merge", () => {
  const e = createEngine({ seed: 4, config: { gravity: 0 } });
  withDiscs(e, [
    disc(0, 180, 500, { id: 1 }),
    disc(1, 202, 500, { id: 2 }),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.discs.length, 2);
  assert.equal(e.state.merges, 0);
});

test("a wildcard joins whichever friend it first touches", () => {
  const e = createEngine({ seed: 5, config: { gravity: 0 } });
  withDiscs(e, [
    disc(7, 180, 500, { id: 1 }),
    disc(-1, 245, 500, { wildcard: true, id: 2 }),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.discs.length, 1);
  assert.equal(e.state.discs[0].tier, 8);
  const events = e.drainEvents();
  assert.ok(events.some((ev) => ev.type === "merge" && ev.wildcard === true));
});

test("two wildcards do not merge with each other", () => {
  const e = createEngine({ seed: 5, config: { gravity: 0 } });
  withDiscs(e, [
    disc(-1, 180, 500, { wildcard: true, id: 1 }),
    disc(-1, 225, 500, { wildcard: true, id: 2 }),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.discs.length, 2);
  assert.equal(e.state.merges, 0);
});

test("making the top tier spawns it; matching two tops is legendary", () => {
  const e = createEngine({ seed: 11, config: { gravity: 0 } });
  withDiscs(e, [
    disc(MAX_TIER - 1, 150, 450),
    disc(MAX_TIER - 1, 150 + TIERS[MAX_TIER - 1].radius * 2 - 1, 450),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.discs.length, 1);
  assert.equal(e.state.discs[0].tier, MAX_TIER);
  assert.equal(e.state.hasWon, true);
  assert.equal(e.state.hasLegendary, false);

  const legendary = createEngine({ seed: 12, config: { gravity: 0 } });
  withDiscs(legendary, [
    disc(MAX_TIER, 150, 400),
    disc(MAX_TIER, 150 + TIERS[MAX_TIER].radius * 2 - 1, 400),
  ]);
  legendary.tick(1 / 60);
  assert.equal(legendary.state.discs.length, 0);
  assert.equal(legendary.state.hasLegendary, true);
  assert.ok(legendary.state.score >= 6000);
});

test("a wildcard that reaches the top tier triggers the legendary bonus", () => {
  const e = createEngine({ seed: 13, config: { gravity: 0 } });
  withDiscs(e, [
    disc(MAX_TIER, 180, 400),
    disc(-1, 180 + TIERS[MAX_TIER].radius + 24 - 1, 400, { wildcard: true }),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.discs.length, 0);
  assert.equal(e.state.hasLegendary, true);
});

test("combo chains multiply the score and reset after the window", () => {
  const e = createEngine({ seed: 14, config: { gravity: 0, comboWindow: 0.25 } });
  withDiscs(e, [
    disc(0, 100, 500),
    disc(0, 125, 500),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.combo, 1);
  withDiscs(e, [
    disc(1, 100, 500),
    disc(1, 125, 500),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.combo, 2);
  withDiscs(e, [
    disc(2, 100, 500),
    disc(2, 125, 500),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.bestCombo, 3);
  assert.ok(e.state.score > 110 * 3);
  for (let i = 0; i < 5; i++) e.tick(0.1);
  assert.equal(e.state.combo, 0);
  withDiscs(e, [
    disc(0, 100, 500),
    disc(0, 125, 500),
  ]);
  e.tick(1 / 60);
  assert.equal(e.state.bestCombo, 3);
  assert.equal(e.state.combo, 1);
});

test("power costs, effects and held wildcard", () => {
  const e = createEngine({ seed: 15, config: { gravity: 0 } });
  e.state.currentTier = 1;
  e.state.nextTier = 4;
  const beforeHype = e.state.hype;
  assert.equal(e.usePower("swap").ok, true);
  assert.equal(e.state.currentTier, 4);
  assert.equal(e.state.nextTier, 1);
  assert.equal(e.state.hype, beforeHype - POWERS.swap.cost);

  e.state.hype = 100;
  assert.equal(e.usePower("plus").ok, true);
  assert.equal(e.state.heldWildcard, true);
  assert.equal(e.state.hype, 100 - POWERS.plus.cost);
  const drop = e.drop(200);
  assert.equal(drop.wildcard, true);
  assert.equal(e.state.heldWildcard, false);

  const hug = createEngine({ seed: 16, config: { gravity: 0 } });
  hug.state.hype = 100;
  hug.state.discs = [disc(2, 200, 500)];
  const oldX = hug.state.discs[0].vx;
  assert.equal(hug.usePower("hug").ok, true);
  assert.notEqual(hug.state.discs[0].vx, oldX);
  assert.equal(hug.state.shake > 0, true);
});

test("powers fail cleanly when unaffordable or empty", () => {
  const e = createEngine({ seed: 17 });
  e.state.hype = 0;
  assert.equal(e.usePower("swap").reason, "hype");
  assert.equal(e.usePower("hug").reason, "hype");
  e.state.hype = 100;
  assert.equal(e.usePower("hug").reason, "empty");
  e.state.discs = [disc(1, 200, 500)];
  e.state.heldWildcard = true;
  assert.equal(e.usePower("plus").reason, "wild");
});

test("walls and floor keep every disc inside the jar", () => {
  const e = createEngine({ seed: 18, config: { gravity: 0 } });
  withDiscs(e, [
    disc(3, -100, 700, { vx: -20, vy: 100 }),
  ]);
  e.tick(0.2);
  const d = e.state.discs[0];
  assert.ok(d.x >= WORLD.wall + d.radius - 0.001);
  assert.ok(d.x <= WORLD.width - WORLD.wall - d.radius + 0.001);
  assert.ok(d.y <= WORLD.floor - d.radius + 0.001);
});

test("the danger line fills and ends the run", () => {
  const e = createEngine({
    seed: 19,
    config: { gravity: 0, dangerLimit: 0.5, dangerGrace: 0.1 },
  });
  withDiscs(e, [disc(5, 200, 120, { age: 2 })]);
  for (let i = 0; i < 3; i++) e.tick(0.1);
  assert.equal(e.state.dangerActive, true);
  for (let i = 0; i < 7; i++) e.tick(0.1);
  assert.equal(e.state.status, "over");
  assert.ok(e.drainEvents().some((ev) => ev.type === "gameover"));
  assert.equal(e.drop(200).ok, false);
});

test("the danger meter recedes when the stack drops below the line", () => {
  const e = createEngine({
    seed: 20,
    config: { gravity: 0, dangerLimit: 2, dangerGrace: 0.1 },
  });
  withDiscs(e, [disc(5, 200, 120, { age: 2 })]);
  e.tick(0.3);
  const peak = e.state.danger;
  e.state.discs[0].y = 500;
  e.tick(0.4);
  assert.equal(e.state.dangerActive, false);
  assert.ok(e.state.danger < peak);
});

test("daily rules are applied from the same seed", () => {
  const rule = DAILY_RULES[0];
  const a = createEngine({ seed: 12345, mode: "daily", rule });
  const b = createEngine({ seed: 12345, mode: "daily", rule });
  assert.equal(a.state.hype, rule.startingHype);
  assert.equal(a.state.currentTier, b.state.currentTier);
  assert.equal(a.state.nextTier, b.state.nextTier);
  assert.equal(a.state.rule.name, rule.name);
});

test("weighted queue is deterministic and only yields playable tiers", () => {
  const a = createQueue(999, 60);
  const b = createQueue(999, 60);
  assert.deepEqual(a, b);
  assert.ok(a.every((t) => t >= 0 && t <= 4));
  assert.ok(a.includes(0));
});

test("a full pile can be simulated without escaping the jar", () => {
  const e = createEngine({ seed: 222, config: { dropBlock: 0 } });
  for (let i = 0; i < 50; i++) {
    e.state.currentTier = i % 4;
    e.drop(70 + (i * 37) % 260);
    for (let f = 0; f < 24; f++) e.tick(1 / 60);
    if (e.state.status === "over") break;
  }
  assert.ok(e.state.discs.length > 0);
  for (const d of e.state.discs) {
    assert.ok(Number.isFinite(d.x) && Number.isFinite(d.y));
    assert.ok(d.x >= WORLD.wall + d.radius - 0.5);
    assert.ok(d.x <= WORLD.width - WORLD.wall - d.radius + 0.5);
    assert.ok(d.y <= WORLD.floor - d.radius + 0.5);
  }
});

test("a dense pile settles with only negligible interpenetration", () => {
  const e = createEngine({ seed: 7 });
  for (let i = 0; i < 100 && e.state.status === "playing"; i++) {
    e.drop(40 + (i * 73) % 320);
    for (let f = 0; f < 20; f++) e.tick(1 / 60);
  }
  let worst = 0;
  const discs = e.state.discs;
  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {
      const a = discs[i];
      const b = discs[j];
      const overlap = a.radius + b.radius - Math.hypot(a.x - b.x, a.y - b.y);
      if (overlap > worst) worst = overlap;
    }
  }
  assert.ok(worst < 4, `worst overlap was ${worst.toFixed(2)}px`);
});

test("chat picks a custom signature when configured", () => {
  const squad = [
    { name: "Maya", vibe: "chaos", line: "We do not talk about the jar." },
  ];
  const message = chooseChat({ kind: "merge", tier: 0, squad, rng: () => 0 });
  assert.equal(message.name, "Maya");
  assert.equal(message.text, "We do not talk about the jar.");
  assert.equal(message.vibe, "chaos");
  assert.equal(message.emoji, "🌪️");
});

test("chat falls back to a vibe or event line without a costume", () => {
  const squad = Array.from({ length: 11 }, () => ({ name: "", vibe: "deadpan", line: "" }));
  const message = chooseChat({ kind: "danger", tier: 3, squad, rng: () => 0 });
  assert.equal(message.name, TIERS[3].short);
  assert.equal(message.vibe, "deadpan");
  assert.ok(message.text.length > 0);
});

test("every chat kind and vibe has lines", () => {
  assert.ok(CHAT_KINDS.every((kind) => Array.isArray(EVENT_LINES[kind]) && EVENT_LINES[kind].length >= 3));
  for (const [vibe, lines] of Object.entries(VIBE_LINES)) {
    assert.ok(Array.isArray(lines) && lines.length >= 3, vibe);
  }
});

test("dare codes round-trip unicode names, scores and seeds", () => {
  const source = {
    seed: 3401672441,
    target: 12_345,
    name: "Zoë 🫂",
    mode: "daily",
    ruleId: "combo",
    createdAt: 123456,
  };
  const code = encodeDare(source);
  const back = decodeDare(code);
  assert.deepEqual(back, {
    seed: 3401672441,
    target: 12345,
    name: "Zoë 🫂",
    mode: "daily",
    ruleId: "combo",
    createdAt: 123456,
  });
  assert.ok(code.length < 200);
});

test("dare links contain only the encoded challenge", () => {
  const url = dareUrl(
    { seed: 9, target: 500, name: "Maya", mode: "classic", ruleId: "" },
    "https://example.com/inner-circle-pwa/?old=1#x",
  );
  assert.ok(url.startsWith("https://example.com/inner-circle-pwa/?dare="));
  assert.ok(!url.includes("old=1"));
  const parsed = dareFromSearch(new URL(url).search);
  assert.equal(parsed.name, "Maya");
  assert.equal(parsed.target, 500);
});

test("malformed dares are rejected or sanitised", () => {
  assert.equal(decodeDare("not-base64"), null);
  assert.equal(decodeDare(""), null);
  assert.equal(normalizeDare({ seed: -1, target: 10, name: "Maya" }), null);
  assert.equal(normalizeDare({ seed: 10, target: 200_000_000, name: "Maya" }), null);
  const cleaned = normalizeDare({ seed: 10, target: 10, name: "  Maya\u0001  ", mode: "not-a-mode", ruleId: "../../bad" });
  assert.equal(cleaned.name, "Maya");
  assert.equal(cleaned.mode, "classic");
  assert.equal(cleaned.ruleId, "");
});
