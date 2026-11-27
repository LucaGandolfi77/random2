import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULTS, saveProfile, loadProfile } from "../src/storage.js";
import { createState, step } from "../src/sim.js";
import {
    seasonKey, ensureSeason, addSeasonXp, claimSeasonTier,
    seasonProgress, dailyEvent, redeemVoucher
} from "../src/season.js";
import {
    SEASON_TIERS, SEASON_XP_PER_TIER, SEASON_LENGTH_DAYS, VOUCHERS, EVENT_TYPES
} from "../src/config.js";
import { STEP } from "../src/config.js";

function profile() {
    return JSON.parse(JSON.stringify(DEFAULTS));
}

test("season keys are date-derived and 8 weeks long", () => {
    const now = Date.UTC(2026, 0, 1);
    const a = seasonKey(now);
    assert.equal(a, seasonKey(now));
    assert.notEqual(a, seasonKey(now + SEASON_LENGTH_DAYS * 86400000));
});

test("season xp unlocks and tiers can be claimed once", () => {
    const p = profile();
    const now = Date.now();
    const unlocked = addSeasonXp(p, SEASON_XP_PER_TIER * 2, now);
    assert.deepEqual(unlocked, [1, 2]);
    const credits = p.credits;
    const reward = claimSeasonTier(p, 1, now);
    assert.ok(reward.credits > 0);
    assert.equal(p.credits, credits + reward.credits);
    assert.equal(claimSeasonTier(p, 1, now), null, "cannot claim twice");
    assert.equal(claimSeasonTier(p, 3, now), null, "tier not unlocked");
    const prog = seasonProgress(p, now);
    assert.ok(prog.claimed.includes(1));
    assert.ok(prog.tier >= 2);
});

test("season resets when a new cycle starts", () => {
    const p = profile();
    const now = Date.now();
    addSeasonXp(p, 5000, now);
    const later = now + SEASON_LENGTH_DAYS * 86400000;
    ensureSeason(p, later);
    assert.equal(p.season.xp, 0);
    assert.equal(p.season.claimed.length, 0);
    assert.equal(p.season.key, seasonKey(later));
});

test("vouchers are case-insensitive and single use", () => {
    const p = profile();
    const code = VOUCHERS[0].code;
    const credits = p.credits;
    const voucher = redeemVoucher(p, code.toLowerCase());
    assert.equal(voucher.code, code);
    assert.ok(p.credits > credits);
    assert.equal(redeemVoucher(p, code), null);
    assert.equal(redeemVoucher(p, "NOPE"), null);
    assert.equal(redeemVoucher(p, ""), null);
});

test("daily event is deterministic", () => {
    const day = new Date(2026, 10, 17, 12).getTime();
    assert.equal(dailyEvent(day).id, dailyEvent(day).id);
    assert.ok(EVENT_TYPES.some((e) => e.id === dailyEvent(day).id));
});

test("event modifiers affect rewards in the simulation", () => {
    function killWith(event) {
        const p = profile();
        const s = createState(p, { event });
        s.enemies = [];
        s.spawnTimer = 999;
        const e = {
            id: 900, defId: "swarm",
            def: { name: "test", tier: 1, color: "#fff", shape: "triangle", speed: 0, range: 0, fireCd: 99, damage: 0, spread: 1, credits: [100, 100], xp: 100 },
            x: s.player.x + 40, y: s.player.y, radius: 12,
            hp: 1, hpMax: 1, shield: 0, shieldMax: 0,
            fireCd: 99, contactCd: 99, hitFlash: 0, orbitDir: 1, wander: 0,
            homeX: 0, homeY: 0, cloakCd: 99, cloaked: false, cloakAlpha: 1,
            dotTime: 0, dotDps: 0, charge: 0, dead: false
        };
        s.enemies.push(e);
        s.bullets.push({
            x: e.x, y: e.y, vx: 0, vy: 0, speed: 400, dmg: 100,
            color: "#fff", radius: 4, life: 1, targetId: null,
            drone: false, splash: false, dot: false
        });
        step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
        return { xp: p.xp, credits: p.credits };
    }

    const normal = killWith({ xp: 1, credits: 1, elite: 0, shield: 1, dmg: 1 });
    const boosted = killWith({ xp: 2, credits: 2, elite: 0, shield: 1, dmg: 1 });
    assert.ok(boosted.xp > normal.xp);
    assert.ok(boosted.credits > normal.credits);
});

test("season data survives a profile round trip", () => {
    const store = new Map();
    const storage = {
        getItem: (k) => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, v)
    };
    const p = profile();
    p.season.key = "S9";
    p.season.xp = 4200;
    p.season.claimed = [1, 2];
    p.vouchers = ["DEEPORBIT"];
    saveProfile(p, storage);
    const loaded = loadProfile(storage);
    assert.equal(loaded.season.key, "S9");
    assert.equal(loaded.season.xp, 4200);
    assert.deepEqual(loaded.season.claimed, [1, 2]);
    assert.deepEqual(loaded.vouchers, ["DEEPORBIT"]);
    assert.equal(SEASON_TIERS, 20);
});
