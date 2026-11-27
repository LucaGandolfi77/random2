import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULTS, loadProfile, saveProfile } from "../src/storage.js";
import { deriveStats, buySkill, createState } from "../src/sim.js";
import { startDispatch, dispatchStatus, claimDispatch } from "../src/dispatch.js";
import { dateKey, ensureDaily, dailyContracts, contractProgress } from "../src/daily.js";
import { checkAchievements, achievementList, achievementCount } from "../src/achievements.js";
import { SKILLS, DISPATCH_TIERS, ACHIEVEMENTS } from "../src/config.js";

function profile(overrides = {}) {
    return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), overrides);
}

/* ------------------------------------------------------------------ */
/* Pilot skills                                                        */
/* ------------------------------------------------------------------ */

test("skill points improve derived stats", () => {
    const base = profile();
    const skilled = profile({ skills: { laser: 3, shield: 2, drone: 1, cargo: 4 } });
    const a = deriveStats(base);
    const b = deriveStats(skilled);
    assert.ok(b.damageMult > a.damageMult);
    assert.ok(b.shieldMax > a.shieldMax);
    assert.ok(b.droneMult > a.droneMult);
    assert.ok(b.cargoMax > a.cargoMax);
});

test("buying a skill consumes one point and respects the cap", () => {
    const p = profile({ skillPoints: 2 });
    assert.equal(buySkill(p, "laser"), true);
    assert.equal(p.skills.laser, 1);
    assert.equal(p.skillPoints, 1);
    p.skillPoints = 99;
    for (let i = 1; i < SKILLS[0].max; i++) assert.equal(buySkill(p, "laser"), true);
    assert.equal(buySkill(p, "laser"), false, "capped");
    assert.equal(buySkill(p, "unknown"), false);
});

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

test("offline dispatch settles after its deadline", () => {
    const p = profile();
    const now = 1000000;
    assert.equal(startDispatch(p, "short", now), true);
    assert.equal(startDispatch(p, "long", now), false, "one mission at a time");
    const status = dispatchStatus(p, now + 3600000);
    assert.equal(status.active, true);
    assert.equal(status.done, false);
    const done = dispatchStatus(p, now + 2 * 3600000 + 1000);
    assert.equal(done.done, true);
    const credits = p.credits;
    const reward = claimDispatch(p, now + 2 * 3600000 + 1000);
    assert.ok(reward.credits >= DISPATCH_TIERS[0].credits[0]);
    assert.ok(p.credits > credits);
    assert.equal(p.dispatch.active, null);
    assert.equal(claimDispatch(p, now + 9 * 3600000), null, "nothing left to claim");
});

/* ------------------------------------------------------------------ */
/* Daily contracts & streak                                            */
/* ------------------------------------------------------------------ */

test("date keys are local and deterministic", () => {
    const d = new Date(2026, 10, 16, 12, 0, 0);
    assert.equal(dateKey(d.getTime()), "2026-11-16");
});

test("three contracts are generated for the day", () => {
    const p = profile();
    const day = new Date(2026, 10, 16, 12).getTime();
    const contracts = dailyContracts(p, day);
    assert.equal(contracts.length, 3);
    assert.ok(contracts.every((c) => c.target > 0 && c.reward > 0));
    assert.deepEqual(dailyContracts(p, day).map((c) => c.id), contracts.map((c) => c.id), "stable within a day");
});

test("progress completes a contract and pays the reward", () => {
    const p = profile();
    const day = new Date(2026, 10, 16, 12).getTime();
    const contracts = dailyContracts(p, day);
    const target = contracts[0];
    const credits = p.credits;
    const done = contractProgress(p, target.type, target.target, day);
    assert.equal(done.length, 1);
    assert.ok(p.credits >= credits + target.reward);
    assert.equal(p.daily.streak, 1);
});

test("contracts reset on a new day", () => {
    const p = profile();
    const day1 = new Date(2026, 10, 16, 12).getTime();
    const day2 = new Date(2026, 10, 17, 12).getTime();
    const first = dailyContracts(p, day1).map((c) => c.id);
    ensureDaily(p, day2);
    assert.notEqual(p.daily.date, "2026-11-16");
    assert.equal(p.daily.completed.length, 0);
    assert.equal(dailyContracts(p, day2).length, 3);
    assert.ok(first.length === 3);
});

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

test("achievements unlock once and pay out", () => {
    const p = profile({ totalKills: 1 });
    const state = createState(p);
    const credits = p.credits;
    const unlocked = checkAchievements(p, state);
    assert.ok(unlocked.some((a) => a.id === "first_kill"));
    assert.ok(p.credits > credits);
    assert.equal(achievementCount(p), unlocked.length);
    assert.equal(checkAchievements(p, state).length, 0, "not awarded twice");
    assert.ok(achievementList(p).some((a) => a.id === "first_kill" && a.unlocked));
    assert.ok(ACHIEVEMENTS.length >= 10);
});

test("achievements check run state as well as the profile", () => {
    const p = profile();
    const state = createState(p);
    state.score = 25000;
    state.cargoUsed = 120;
    const unlocked = checkAchievements(p, state).map((a) => a.id);
    assert.ok(unlocked.includes("score_20000"));
    assert.ok(unlocked.includes("cargo_100"));
});

/* ------------------------------------------------------------------ */
/* Profile persistence of new fields                                   */
/* ------------------------------------------------------------------ */

test("new profile fields survive a save/load round trip", () => {
    const store = new Map();
    const storage = {
        getItem: (k) => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, v)
    };
    const p = profile({ skillPoints: 4, totalSales: 9000, bossKills: 2 });
    p.skills.laser = 2;
    p.achievements = ["first_kill", "boss"];
    p.dispatch.active = { tier: "long", endsAt: 123456, rewards: { credits: 5000, urium: 1 } };
    p.daily.date = "2026-11-16";
    saveProfile(p, storage);
    const loaded = loadProfile(storage);
    assert.equal(loaded.skillPoints, 4);
    assert.equal(loaded.skills.laser, 2);
    assert.equal(loaded.totalSales, 9000);
    assert.equal(loaded.bossKills, 2);
    assert.deepEqual(loaded.achievements, ["first_kill", "boss"]);
    assert.equal(loaded.dispatch.active.tier, "long");
    assert.equal(loaded.daily.date, "2026-11-16");
});
