import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
const memoryStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k)
};
globalThis.localStorage = memoryStorage;

const {
    weekKey, weeklyConfig, hashString, loadBoard, addScore, bestScore,
    saveBestReplay, loadBestReplay
} = await import("../src/challenge.js");
const { recordFrame, createGhost, GHOST_HZ } = await import("../src/ghost.js");
const { DEFAULTS, saveProfile, loadProfile } = await import("../src/storage.js");
const {
    createState, spawnEnemy, setRunRng, galaxyReset, deriveStats
} = await import("../src/sim.js");
const { MAPS, PRESTIGE_MIN_LEVEL } = await import("../src/config.js");

function profile() {
    return JSON.parse(JSON.stringify(DEFAULTS));
}

test("week keys and configs are deterministic", () => {
    const now = new Date(2026, 10, 17, 12).getTime();
    assert.match(weekKey(now), /^\d{4}-W\d{2}$/);
    const a = weeklyConfig(now, MAPS.length);
    const b = weeklyConfig(now, MAPS.length);
    assert.equal(a.seed, b.seed);
    assert.equal(a.key, b.key);
    assert.ok(a.mapIndex >= 0 && a.mapIndex < MAPS.length);
    assert.ok(hashString(a.key) === a.seed);
});

test("leaderboard keeps the top ten for the current week", () => {
    store.clear();
    const now = Date.now();
    for (let i = 0; i < 14; i++) addScore({ score: i * 100, kills: i, mapIndex: 0 }, now);
    const board = loadBoard();
    assert.equal(board.length, 10);
    assert.equal(board[0].score, 1300);
    assert.equal(board[9].score, 400);
    assert.equal(bestScore(now), 1300);
});

test("best replay is stored and replaced only by a higher score", () => {
    store.clear();
    assert.equal(saveBestReplay({ score: 500, mapIndex: 1, frames: [{ x: 1, y: 2, angle: 0, ammo: 0 }] }), true);
    assert.equal(saveBestReplay({ score: 200, mapIndex: 1, frames: [] }), false);
    const replay = loadBestReplay();
    assert.equal(replay.score, 500);
    assert.equal(replay.frames.length, 1);
});

test("ghost replays and interpolates recorded positions", () => {
    const frames = [];
    const s = createState(profile());
    for (let i = 0; i < 6; i++) {
        s.player.x = i * 10;
        recordFrame(frames, s);
    }
    const ghost = createGhost({ score: 1000, frames });
    assert.ok(ghost);
    ghost.update(1 / GHOST_HZ);
    const pose = ghost.pose();
    assert.ok(pose.x >= 0 && pose.x <= 50);
    assert.equal(pose.ammo, 0);
    ghost.reset();
    assert.ok(ghost.pose().x < 10);
});

test("seeded RNG makes spawns reproducible", () => {
    const p = profile();
    setRunRng(12345);
    const a = createState(p);
    const ea = spawnEnemy(a, a.map, "swarm");
    const pa = { x: ea.x, y: ea.y };

    setRunRng(12345);
    const b = createState(p);
    const eb = spawnEnemy(b, b.map, "swarm");
    assert.equal(eb.x, pa.x);
    assert.equal(eb.y, pa.y);
    setRunRng(null);
});

test("galaxy reset needs level ten and grants a permanent bonus", () => {
    const p = profile();
    assert.equal(galaxyReset(p), false);
    p.level = PRESTIGE_MIN_LEVEL;
    p.credits = 50000;
    assert.equal(galaxyReset(p), true);
    assert.equal(p.prestige, 1);
    assert.equal(p.level, 1);
    assert.equal(p.credits, 2500);
    const boosted = deriveStats(p);
    const plain = deriveStats(profile());
    assert.ok(boosted.damageMult > plain.damageMult);
    assert.ok(boosted.shieldMax > plain.shieldMax);
    assert.ok(boosted.cargoMax > plain.cargoMax);
});

test("prestige survives a profile round trip", () => {
    const p = profile();
    p.prestige = 3;
    saveProfile(p, memoryStorage);
    assert.equal(loadProfile(memoryStorage).prestige, 3);
});
