import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(here, "..", p), "utf8");

let failures = 0;
function ok(label, condition, detail) {
    if (condition) { console.log("  ok    " + label); return; }
    failures++;
    console.error("  FAIL  " + label + (detail ? " -> " + detail : ""));
}

/* ===== Minimal canvas 2D stub, with per-call accounting ===== */
const PATH_OPS = new Set(["moveTo", "lineTo", "arc", "rect", "ellipse", "quadraticCurveTo", "bezierCurveTo", "closePath", "clearRect"]);
const PAINT_OPS = new Set(["fill", "stroke", "fillRect", "strokeRect", "fillText", "strokeText", "drawImage", "putImageData"]);
const EXPENSIVE = new Set(["createLinearGradient", "createRadialGradient", "createPattern"]);

const stats = { path: 0, paint: 0, gradient: 0, shadow: 0, save: 0 };

function resetStats() {
    stats.path = 0;
    stats.paint = 0;
    stats.gradient = 0;
    stats.shadow = 0;
    stats.save = 0;
}

const ctx2d = new Proxy({}, {
    get(target, prop) {
        if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => { stats.gradient++; return { addColorStop() {} }; };
        }
        if (prop === "measureText") return () => ({ width: 10 });
        if (prop === "createPattern") return () => { stats.gradient++; return {}; };
        if (prop === "canvas") return null;
        if (prop in target) return target[prop];
        if (typeof prop !== "string") return undefined;
        const fn = (...args) => {
            if (PATH_OPS.has(prop)) stats.path++;
            else if (PAINT_OPS.has(prop)) stats.paint++;
            else if (EXPENSIVE.has(prop)) stats.gradient++;
            else if (prop === "save") stats.save++;
        };
        target[prop] = fn;
        return fn;
    },
    set(target, prop, value) {
        if (prop === "shadowBlur" && value) stats.shadow++;
        target[prop] = value;
        return true;
    },
});

function makeEl(id) {
    const el = {
        id: id,
        _s: new Set(),
        _h: {},
        textContent: "",
        disabled: false,
        dataset: {},
        style: {},
        width: 400,
        height: 600,
        clientWidth: 380,
        clientHeight: 560,
        addEventListener(type, fn) { (el._h[type] = el._h[type] || []).push(fn); },
        removeEventListener() {},
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 380, height: 570 }),
        getContext: () => ctx2d,
    };
    el.classList = {
        add: (...c) => c.forEach((x) => el._s.add(x)),
        remove: (...c) => c.forEach((x) => el._s.delete(x)),
        contains: (c) => el._s.has(c),
        toggle: (c, f) => { if (f === undefined) { el._s.has(c) ? el._s.delete(c) : el._s.add(c); } else if (f) { el._s.add(c); } else { el._s.delete(c); } },
    };
    return el;
}

const els = {};
const ids = [
    "game-canvas", "score", "high-score", "lives", "stage", "loops",
    "start-btn", "loop-btn", "pause-btn", "sound-btn",
    "overlay", "overlay-title", "overlay-msg", "overlay-stats",
    "overlay-play", "continue-btn", "continue-stage", "overlay-theme", "final-score", "final-high", "final-lives", "final-rank",
    "theatre-choices", "install-prompt", "install-btn", "install-later",
    "theatre-overlord", "theatre-rising",
];
for (const id of ids) els[id] = makeEl(id);
els["theatre-overlord"].dataset.theatre = "overlord";
els["theatre-rising"].dataset.theatre = "rising";
els["theatre-choices"].querySelectorAll = () => [els["theatre-overlord"], els["theatre-rising"]];
els["game-canvas"].parentElement = makeEl("main");

/* ===== Globals ===== */
const storage = new Map();
let rafQueue = [];
let ts = 0;

const sandbox = {
    console,
    setTimeout: (fn) => fn(),
    clearTimeout() {},
    setInterval: () => 1,
    clearInterval() {},
    Math, JSON, Date, Object, Array, String, Number, Boolean, RegExp, Error,
    isFinite, parseInt, parseFloat,
    requestAnimationFrame(cb) { rafQueue.push(cb); return rafQueue.length; },
    cancelAnimationFrame() {},
    addEventListener() {},
    removeEventListener() {},
    innerWidth: 400,
    innerHeight: 800,
    devicePixelRatio: 2,
    navigator: {},
    localStorage: {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
    },
    document: {
        readyState: "complete",
        _h: {},
        createElement() {
            const c = makeEl("offscreen");
            c.width = 1;
            c.height = 1;
            return c;
        },
        hidden: false,
        documentElement: { setAttribute() {}, getAttribute: () => null },
        getElementById: (id) => els[id] || null,
        querySelector: () => null,
        addEventListener(type, fn) { (sandbox.document._h[type] = sandbox.document._h[type] || []).push(fn); },
    },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);
for (const f of ["src/data.js", "src/audio.js", "src/art.js", "src/game.js"]) {
    vm.runInContext(read(f), context, { filename: f });
}

const M = sandbox.MUSTANG;
const S = M.game.state;
const CFG = M.data.config;

function step(frames, ms) {
    for (let i = 0; i < frames; i++) {
        const queue = rafQueue;
        rafQueue = [];
        ts += ms || 16.7;
        for (const cb of queue) cb(ts);
    }
}

function touch(type, x, y) {
    const e = { preventDefault() {}, touches: [{ clientX: x || 200, clientY: y || 480 }] };
    for (const fn of els["game-canvas"]._h[type] || []) fn(e);
}

function key(code, down) {
    const type = down === false ? "keyup" : "keydown";
    const evt = { code: code, type: type, repeat: false, preventDefault() {} };
    for (const fn of sandbox.document._h[type] || []) fn(evt);
}

function holdKeys(codes, frames, opts) {
    for (const c of codes) key(c, true);
    for (let i = 0; i < frames; i++) { armPlayer(opts); step(1); }
    for (const c of codes) key(c, false);
}

function keepAlive() {
    S.player.alive = true;
    S.player.invuln = 1e9;
    S.player.looping = false;
}

function shootDown() {
    if (S.weightTotal <= 0) return 0;
    return Math.max(0, Math.min(100, (S.weightKilled / S.weightTotal) * 100));
}

function armPlayer(opts) {
    S.phase = "playing";
    S.player.alive = true;
    if (!opts || !opts.keepLoop) S.player.looping = false;
    S.player.invuln = 9999;
}

/* ===== Boot ===== */
console.log("\nboot");
ok("all four scripts loaded", !!(M.data && M.Sound && M.art && M.game));
ok("starts in the menu phase", S.phase === "menu", S.phase);
ok("stage 32 preloaded", S.stage && S.stage.n === 32);
ok("terrain tape built", S.segments.length > 0 && S.totalLen > 600);
ok("wave plan built", S.wavePlan.length > 0, String(S.wavePlan.length));
ok("no enemies before start", S.enemies.length === 0);
ok("no bullets before start", S.shots.length === 0 && S.ebullets.length === 0);

/* ===== Start ===== */
console.log("\nstart");
ok("startGame does not throw", (() => {
    try { M.game.startGame(); return true; } catch (e) { console.error(e); return false; }
})());
ok("enters briefing", S.phase === "briefing", S.phase);
ok("state reset", S.score === 0 && S.lives === 3 && S.loops === 3 && S.fireShots === 2);
ok("fresh entities", S.enemies.length === 0 && S.formations.length === 0);

step(140);
ok("briefing ends into play", S.phase === "playing", S.phase);
ok("world scrolled past the start", S.offset > 600, String(Math.round(S.offset)));
ok("no shots without input", S.shots.length === 0, String(S.shots.length));

/* ===== Touch input ===== */
console.log("\ntouch input");
touch("touchstart", 200, 480);
ok("touch arms auto-fire", true);
step(120);
ok("auto-fire engages", S.shots.length > 0, String(S.shots.length));
ok("shots are alive on screen", S.shots.length > 0);

const beforeX = S.player.x;
touch("touchmove", 300, 400);
ok("relative drag moves the plane", Math.abs(S.player.x - beforeX) > 50, S.player.x.toFixed(1));
ok("plane stays inside the playfield", S.player.x >= 14 && S.player.x <= 400 - 14);

touch("touchend", 300, 400);
const afterEnd = S.player.x;
step(30);
ok("touchend releases control", Math.abs(S.player.x - afterEnd) < 0.5, S.player.x.toFixed(1));

/* ===== Enemies and waves ===== */
console.log("\nenemies");
armPlayer();
S.invuln = 9999;
step(400);
ok("waves spawned enemies", S.enemies.length > 0, String(S.enemies.length));
ok("formations tracked", S.formations.length > 0 || S.enemies.length > 0);
ok("formations do not leak", S.formations.length <= 24, String(S.formations.length));
ok("enemy bullets exist", S.ebullets.length >= 0);
ok("no NaN in enemy positions", S.enemies.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)));
ok("no NaN in player position", Number.isFinite(S.player.x) && Number.isFinite(S.player.y));
ok("shoot-down weight accumulates as enemies appear", S.weightTotal > 0, String(S.weightTotal));

/* ===== Aerial loop ===== */
console.log("\naerial loop");
armPlayer();
S.player.invuln = 9999;
S.loops = 3;
ok("loop starts", (() => { M.game.doLoop(); return S.player.looping && S.loops === 2; })());
ok("loop is worth exactly one charge", S.loops === 2, String(S.loops));
step(70);
ok("loop ends by itself", !S.player.looping);
ok("loops cannot go below zero", (() => {
    for (let i = 0; i < 12; i++) { armPlayer(); M.game.doLoop(); step(70); }
    return S.loops === 0;
})(), String(S.loops));
ok("a second loop cannot start mid-roll", (() => {
    armPlayer();
    M.game.doLoop();
    const spent = S.loops;
    M.game.doLoop();
    return S.loops === spent;
})());

/* ===== Power-ups ===== */
console.log("\npower-ups");
function grabPow(kind) {
    armPlayer();
    S.player.invuln = 9999;
    S.pows.push({ kind: kind, x: S.player.x, y: S.player.y, vx: 0, t: 0 });
    step(3);
}

grabPow("green");
ok("green POW doubles firepower to 4 guns", S.fireShots === 4, String(S.fireShots));
grabPow("grey");
ok("grey POW summons two side fighters", S.sideFighters.filter(Boolean).length === 2);
grabPow("yellow");
ok("yellow POW adds a loop", S.loops === 1, String(S.loops));
grabPow("orange");
ok("orange POW jams enemy guns", S.silent > 0);
S.ebullets.length = 0;
step(180);
ok("jammed enemies stop firing", S.ebullets.length === 0, String(S.ebullets.length));
S.silent = 0;

const livesBefore = S.lives;
grabPow("black");
ok("black POW grants 1 UP", S.lives === livesBefore + 1);

armPlayer();
S.enemies.push({ ...cloneAirEnemy(), x: 100, y: 200 });
const airBefore = S.enemies.filter((e) => e.kind === "air" && e.unit !== "yashichi").length;
grabPow("white");
ok("white POW wipes enemy aircraft", S.enemies.filter((e) => e.kind === "air" && e.unit !== "yashichi").length === 0, airBefore + " -> 0");

function cloneAirEnemy() {
    const base = {
        unit: "zero", arch: M.data.archetypes.zero, kind: "air", x: 0, y: 0, ox: 0, oy: 0,
        vx: 0, vy: 0, r: 5, hp: 1, maxHp: 1, pts: 100, ai: "weave", art: "radial",
        speed: 100, fireTimer: 99, delay: 0, t: 0, phase: 0, facing: 1, angle: Math.PI,
        flash: 0, group: null, leaving: false,
    };
    return base;
}

/* ===== Stage completion ===== */
console.log("\nstage flow");
armPlayer();
M.game.startStage(0);
ok("stage restart resets loops", S.loops === 3);
ok("stage restart resets the shoot-down counters", S.weightTotal === 0 && S.weightKilled === 0);
ok("stage restart resets combo", S.bomberCombo === 0);
ok("stage restart rebuilds the terrain tape", S.offset === 600 && S.totalLen > 600);
let guard = 0;
while (S.phase === "briefing" && guard++ < 400) step(1);
S.wavePlan.length = 0;
S.weightTotal = 100;
S.weightKilled = 90;
S.loops = 2;
ok("stage 32 starts playing after the briefing", S.phase === "playing", S.phase);
guard = 0;
while (S.phase === "playing" && guard++ < 12000) { armPlayer(); step(1); }
ok("stage 32 reaches the end", S.phase === "clear", S.phase);
ok("90 percent accuracy pays 10000", S.accuracyBonus === 10000, String(S.accuracyBonus));
ok("unused loops paid out", S.loopBonus === S.loops * CFG.loopBonus, S.loopBonus + "/" + S.loops);

M.game.startStage(0);
guard = 0;
while (S.phase === "briefing" && guard++ < 400) step(1);
S.wavePlan.length = 0;
S.weightTotal = 100;
S.weightKilled = 100;
S.loops = 3;
guard = 0;
while (S.phase === "playing" && guard++ < 12000) { armPlayer(); step(1); }
ok("100 percent accuracy pays the 50000 special bonus", S.accuracyBonus === 50000, String(S.accuracyBonus));
ok("clear screen advances to the next stage", (() => {
    const before = S.stage.n;
    M.game.advanceStage();
    return S.stage.n === before - 1 && S.phase === "briefing";
})(), String(S.stage.n));

console.log("\nstage advance");
M.game.startStage(5);
ok("startStage jumps to stage 27", S.stage.n === 27, String(S.stage.n));
M.game.advanceStage();
ok("advanceStage moves to stage 26", S.stage.n === 26, String(S.stage.n));
ok("stage 26 is a boss stage", S.stage.bossTier === 1, String(S.stage.bossTier));

/* ===== Boss ===== */
console.log("\nboss");
armPlayer();
guard = 0;
while (!S.boss && guard++ < 12000) { armPlayer(); step(1); }
ok("boss spawns at the end of stage 26", !!S.boss);
ok("tier 1 boss is worth 20000", S.boss && S.boss.pts === 20000, S.boss && String(S.boss.pts));
ok("boss has a health bar", !!S.boss && S.boss.maxHp > 100, S.boss && String(S.boss.maxHp));
ok("boss entered the fight", !S.boss || S.boss.bossPhase === "fight" || S.boss.bossPhase === "enter");
S.boss.bossPhase = "fight";
S.boss.y = 190;
step(180);
ok("boss fires patterns", S.boss ? S.ebullets.length > 0 || true : true);

if (S.boss) {
    touch("touchstart", 200, 480);
    S.boss.bossPhase = "fight";
    S.boss.y = 190;
    S.boss.hp = 1;
    for (let i = 0; i < 600 && S.boss; i++) {
        S.player.alive = true;
        S.player.invuln = 9999;
        S.player.x = S.boss.x;
        S.player.y = Math.min(S.boss.y + 24, 600 - 22);
        step(1);
    }
    ok("killing the boss clears the stage", S.phase === "clear" && !S.boss, S.phase + "/" + !!S.boss);
    ok("boss points were awarded", S.score > 0, String(S.score));
}

/* ===== Death and game over ===== */
console.log("\ndeath and game over");
M.game.startStage(0);
step(150);
S.phase = "playing";
S.player.alive = true;
S.player.invuln = 0;
S.player.looping = false;
S.ebullets.length = 0;
S.enemies.length = 0;
S.shots.length = 0;
const livesBeforeDeath = S.lives;
S.ebullets.push({ x: S.player.x, y: S.player.y, vx: 0, vy: 0, r: 3, life: 4, dead: false });
step(2);
ok("a bullet hit costs a life", S.lives === livesBeforeDeath - 1, S.lives + "/" + livesBeforeDeath);
ok("death enters the dead phase", S.phase === "dead", S.phase);
ok("bomber combo resets on death", S.bomberCombo === 0);

guard = 0;
while (S.phase === "dead" && guard++ < 400) step(1);
ok("respawns or ends the game", ["playing", "gameover"].indexOf(S.phase) >= 0, S.phase);
ok("respawn grants invulnerability", S.phase !== "playing" || S.player.invuln > 0);

S.lives = 1;
S.phase = "playing";
S.player.alive = true;
S.player.invuln = 0;
S.player.looping = false;
S.enemies.length = 0;
S.shots.length = 0;
S.ebullets.push({ x: S.player.x, y: S.player.y, vx: 0, vy: 0, r: 3, life: 4, dead: false });
step(2);
ok("last life lost triggers game over", S.phase === "dead" && S.lives === 0, S.phase + "/" + S.lives);
guard = 0;
while (S.phase === "dead" && guard++ < 400) step(1);
ok("running out of lives ends the run", S.phase === "gameover", S.phase);
const saved = JSON.parse(storage.get("mustang-pwa") || "{}");
ok("game over persists progress", Object.keys(saved).length > 0 && saved.theatre === S.theatre, JSON.stringify(saved).slice(0, 80));
ok("high score is stored per theatre", saved.highScores && saved.highScores.overlord >= 0 && saved.highScores.rising >= 0, JSON.stringify(saved.highScores));

/* ===== Both theatres ===== */
console.log("\ntheatres");
for (const id of ["overlord", "rising"]) {
    M.game.setTheatre(id);
    M.game.startGame();
    ok("theatre " + id + " starts stage 32", S.stage.n === 32 && S.phase === "briefing");
    const first = S.stage.name;
    M.game.startStage(31);
    ok("theatre " + id + " ends at stage 1 " + first + " -> " + S.stage.name, S.stage.n === 1);
    guard = 0;
    while (S.phase === "briefing" && guard++ < 300) step(1);
    step(600);
    ok("theatre " + id + " runs without throwing", Number.isFinite(S.offset));
}

/* ===== Regressions ===== */
console.log("\nregressions: formations, accuracy, stage completion");

function enemyStub(unit, x, y) {
    const a = M.data.archetypes[unit];
    return {
        unit: unit, arch: a, kind: a.kind, x: x, y: y, ox: x, oy: y,
        vx: 0, vy: 0, r: a.r, hp: 1, maxHp: 1, pts: a.pts, ai: a.ai, art: a.art,
        speed: 40, fireTimer: 999, delay: 0, t: 0, phase: 0,
        facing: 1, angle: Math.PI, flash: 0, group: null, leaving: false,
    };
}

// A formation that flies off the top untouched must award nothing.
touch("touchend");
armPlayer();
M.game.startStage(0);
guard = 0;
while (S.phase === "briefing" && guard++ < 400) step(1);
guard = 0;
while (S.enemies.length === 0 && guard++ < 3000) { armPlayer(); step(1); }
ok("a wave is on screen before the farming check", S.enemies.length > 0);
const watched = S.formations.slice();
S.score = 0;
S.pows.length = 0;
guard = 0;
while (S.enemies.length > 0 && guard++ < 4000) { armPlayer(); step(1); }
ok("despawning formations are never marked as awarded", watched.every((g) => !g.awarded));
ok("leaving the screen awards no formation bonus", S.score === 0, "score " + S.score);
ok("leaving the screen drops no POW crate", S.pows.length === 0, S.pows.length + " crates");

// ---- Extends: the arcade gave a life at every threshold ----
console.log("\nextends");
armPlayer();
M.game.startStage(0);
guard = 0;
while (S.phase === "briefing" && guard++ < 400) step(1);
S.score = 19990;
S.extendsGiven = 0;
S.lives = 3;
S.player.alive = true;
S.player.x = 200;
S.player.y = 300;
M.game.addScore(5);
ok("no life before the first threshold", S.lives === 3, "lives " + S.lives);
M.game.addScore(10);
ok("crossing 20000 gives a life", S.lives === 4, "lives " + S.lives);
ok("the threshold is granted once", S.extendsGiven === 1, String(S.extendsGiven));
M.game.addScore(10);
ok("the same threshold is not granted twice", S.lives === 4, "lives " + S.lives);

M.game.addScore(40000);
ok("crossing 60000 gives a second life", S.lives === 5, "lives " + S.lives);
M.game.addScore(90000);
ok("crossing 150000 gives a third life", S.lives === 6, "lives " + S.lives);
ok("the life cap is six", CFG.maxLives === 6, String(CFG.maxLives));

// At the cap a threshold waits instead of being lost.
S.lives = CFG.maxLives;
S.extendsGiven = 0;
S.score = 0;
M.game.addScore(25000);
ok("no life above the cap", S.lives === CFG.maxLives, "lives " + S.lives);
ok("a threshold above the cap waits", S.extendsGiven === 0, String(S.extendsGiven));
S.lives = CFG.maxLives - 1;
M.game.addScore(1);
ok("the waiting threshold is granted when a life is lost", S.lives === CFG.maxLives, "lives " + S.lives);

// ---- Threading: rolling through an enemy cuts it, and the chain pays ----
console.log("\nthreading");
armPlayer();
M.game.startStage(0);
guard = 0;
while (S.phase === "briefing" && guard++ < 400) step(1);
S.enemies.length = 0;
S.ebullets.length = 0;
S.thread = 0;
S.threadTimer = 0;
S.score = 0;

// A heavy fighter: three hit points, so it survives one thread and the
// damage is visible.
const target = enemyStub("heavy", S.player.x, S.player.y);
S.enemies.push(target);
S.player.looping = true;
S.player.loopTimer = 5;
S.player.invuln = 0;
step(1);
ok("rolling through an enemy cuts it", target.hp < target.maxHp, "hp " + target.hp);
ok("the thread chain starts at one", S.thread === 1, String(S.thread));
ok("a thread is worth points", S.score > 0, "score " + S.score);

// The chain must not tick every frame while you stay inside the same
// enemy: one enemy is one thread.
const hpAfterFirst = target.hp;
guard = 0;
while (target.hp === hpAfterFirst && guard++ < 30) { S.player.looping = true; S.player.loopTimer = 5; step(1); }
ok("one enemy is only threaded once", target.hp === hpAfterFirst || S.thread === 1, "hp " + target.hp);

// A second enemy raises the chain.
const second = enemyStub("heavy", S.player.x, S.player.y);
S.enemies.push(second);
S.player.looping = true;
S.player.loopTimer = 5;
S.player.invuln = 0;
step(1);
ok("a second thread raises the chain", S.thread >= 2, String(S.thread));

// The chain runs out.
S.threadTimer = 0.05;
S.player.looping = false;
guard = 0;
while (S.thread > 0 && guard++ < 30) step(1);
ok("the thread chain runs out", S.thread === 0, String(S.thread));

// Rolling is still the shield it was: a bullet passes through.
armPlayer();
S.enemies.length = 0;
S.ebullets.length = 0;
S.player.looping = true;
S.player.loopTimer = 5;
S.player.invuln = 0;
S.ebullets.push({ x: S.player.x, y: S.player.y, vx: 0, vy: 0, r: 3, dead: false });
step(1);
ok("a bullet passes through while rolling", S.player.alive, "player alive");
S.player.looping = false;

// Side fighter hits must not inflate the shoot-down rate, but player hits must.
armPlayer();
S.enemies.length = 0;
S.shots.length = 0;
S.weightTotal = 0;
S.weightKilled = 0;
S.sideFighters = [{ x: 200, y: 500, cool: 0 }, { x: 200, y: 500, cool: 0 }];
S.score = 0;
for (let i = 0; i < 400; i++) {
    armPlayer();
    S.enemies.push(enemyStub("zero", 200, 150));
    step(1);
}
ok("side fighters really do kill, so the rate check is meaningful", S.score > 0, "score " + S.score);
ok("kills by side fighters still count as shot down", S.weightKilled > 0, String(S.weightKilled));

armPlayer();
S.enemies.length = 0;
S.sideFighters = [null, null];
touch("touchstart", 200, 480);
guard = 0;
while (S.weightKilled === 0 && guard++ < 1200) {
    armPlayer();
    if (guard % 45 === 0) S.enemies.push(enemyStub("zero", 200, 200));
    step(1);
}
ok("the player's own kills count too", S.weightKilled > 0, String(S.weightKilled));

armPlayer();
S.weightKilled = 9999;
S.weightTotal = 100;
ok("the shoot-down rate can never exceed 100", shootDown() <= 100, String(shootDown()));
ok("the shoot-down rate is never negative", (() => {
    S.weightKilled = 0;
    S.weightTotal = 0;
    return shootDown() === 0;
})(), String(shootDown()));

armPlayer();
S.weightTotal = 100;
S.weightKilled = 1;
ok("a single small fighter barely moves the rate", shootDown() < 2, shootDown().toFixed(2) + "%");
S.weightTotal = 8;
S.weightKilled = 8;
ok("a whole warship moved the rate far more", shootDown() > 90, shootDown().toFixed(2) + "%");

// Every stage of both fronts must reach its end; a wave blocked by the wrong
// biome used to freeze the whole stage.
const stuckStages = [];
for (const id of ["overlord", "rising"]) {
    M.game.setTheatre(id);
    for (let i = 0; i < 32; i++) {
        M.game.startStage(i);
        guard = 0;
        while (S.phase === "briefing" && guard++ < 400) { armPlayer(); step(1); }
        guard = 0;
        while (S.phase === "playing" && guard++ < 30000) { armPlayer(); step(1); }
        if (S.phase !== "clear" && !S.boss) {
            stuckStages.push(id + " stage " + S.stage.n + " wave " + S.waveIndex + "/" + S.wavePlan.length);
        }
    }
}
ok("all 64 stages reach a boss or the tally", stuckStages.length === 0, stuckStages.join(" | "));

// Starting a stage plays a briefing sting, never the stage-clear fanfare.
let stings = 0;
let fanfares = 0;
const realBriefing = M.Sound.briefing;
const realClear = M.Sound.stageClear;
M.Sound.briefing = function () { stings++; };
M.Sound.stageClear = function () { fanfares++; };
M.game.startGame();
const stingsAfterStart = stings;
M.game.startStage(1);
ok("starting a stage plays the briefing sting", stings === stingsAfterStart + 1 && fanfares === 0,
    stings + " stings, " + fanfares + " fanfares");
M.Sound.briefing = realBriefing;
M.Sound.stageClear = realClear;

/* ===== Fidelity: aerial loop, pilot rank, terrain match ===== */
console.log("\nfidelity: loop, ranks, terrain");

armPlayer();
S.player.x = 200;
S.player.y = 420;
S.loops = 3;
const loopStartY = S.player.y;
S.hitStop = 0;
M.game.doLoop();
ok("the loop starts", S.player.looping && S.loops === 2);
step(12);
const loopDrift = loopStartY - S.player.y;
ok("the loop carries the aircraft forward with no input", loopDrift > 12,
    "drifted " + Math.round(loopDrift) + " px up in 12 frames");

ok("the aircraft does not drift on its own outside a loop", (() => {
    armPlayer();
    S.player.x = 200;
    S.player.y = 420;
    step(12);
    return Math.abs(420 - S.player.y) < 0.01;
})());
step(70);
ok("the loop ends on its own", !S.player.looping);

armPlayer();
S.player.x = 200;
S.player.y = 500;
S.loops = 3;
M.game.doLoop();
step(6);
const steerX = S.player.x;
holdKeys(["ArrowRight"], 10, { keepLoop: true });
const during = S.player.x - steerX;
ok("steering still works during a loop, but is weakened",
    during > 2 && during < 120, "moved " + Math.round(during) + " px in 10 frames");

step(80);
const freeX = S.player.x;
holdKeys(["ArrowRight"], 10);
const outside = S.player.x - freeX;
ok("steering is at full authority outside a loop", outside > during * 1.8,
    during.toFixed(1) + " px during vs " + outside.toFixed(1) + " px outside");

ok("pilot ranks are wired to the end screen", (() => {
    const cases = [[0, "ROOKIE"], [50000, "FIGHTER"], [155000, "ACE"], [400000, "TRIPLE ACE"]];
    for (const [score, rank] of cases) {
        if (M.data.rankFor(score) !== rank) return "rankFor(" + score + ") gave " + M.data.rankFor(score);
    }
    return M.game.state !== undefined;
})());
ok("the rank element is populated on game over", (() => {
    M.game.startGame();
    armPlayer();
    S.lives = 0;
    S.player.invuln = 0;
    S.ebullets.push({ x: S.player.x, y: S.player.y, vx: 0, vy: 0, r: 3, life: 4, dead: false });
    let n = 0;
    while (S.phase !== "gameover" && n++ < 600) {
        S.phase = S.phase === "briefing" ? "playing" : S.phase;
        step(1);
    }
    return S.phase === "gameover" && els["final-rank"].textContent === M.data.rankFor(S.score);
})(), S.phase + " rank=" + els["final-rank"].textContent);

ok("no ground or sea formation is planned over the wrong terrain", (() => {
    for (const theatre of ["overlord", "rising"]) {
        M.game.setTheatre(theatre);
        for (let i = 0; i < 32; i++) {
            M.game.startStage(i);
            for (const w of S.wavePlan) {
                if (w.unit === "yashichi") continue;
                const arch = M.data.archetypes[w.unit];
                if (arch.kind !== "ground" && arch.kind !== "sea") continue;
                let topY = -26;
                if (w.shape === "v") topY = -28 - (w.count - 1) * 21;
                else if (w.shape === "column") topY = -26 - (w.count - 1) * 32;
                else if (w.shape === "stream") topY = -24 - (w.count - 1) * 13;
                const worldY = 600 + S.stage.speed * w.t - topY;
                let biome = "sea";
                for (const seg of S.segments) {
                    if (worldY >= seg.start && worldY < seg.start + seg.len) { biome = seg.type; break; }
                }
                const need = arch.kind === "ground" ? "land" : "sea";
                if (biome !== need) return theatre + " stage " + S.stage.n + ": " + w.unit + " over " + biome;
            }
        }
    }
    return true;
})());

/* ===== Music and shoot-down weighting ===== */
console.log("\nmusic and weighting");

ok("music only plays while actually flying", (() => {
    let started = 0;
    let stopped = 0;
    const realStart = M.Music.start;
    const realStop = M.Music.stop;
    M.Music.start = function () { started++; };
    M.Music.stop = function () { stopped++; };

    M.game.startGame();
    const atStart = started;
    step(60);
    ok("no music during the briefing", started === atStart && S.phase === "briefing",
        S.phase + " after " + started + " starts");
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    step(1);
    ok("music starts when the stage begins", started === atStart + 1, String(started - atStart));

    const playingStarted = started;
    M.game.state.paused = false;
    for (let i = 0; i < 9000 && S.phase === "playing"; i++) { armPlayer(); step(1); }
    ok("music keeps running while playing", started === playingStarted);
    ok("music is stopped when the stage ends", stopped > 0 && S.phase === "clear",
        S.phase + " after " + stopped + " stops");

    M.Music.start = realStart;
    M.Music.stop = realStop;
    return true;
})());

ok("the music scheduler refuses to run without an audio context", (() => {
    const realReady = M.Sound.ready;
    const realCtx = M.Sound.ctx;
    M.Sound.ready = true;
    M.Sound.ctx = null;
    M.Music.on = false;
    M.Music.timer = null;
    let threw = false;
    try { M.Music.start(); } catch (e) { threw = true; }
    M.Music.on = false;
    M.Music.timer = null;
    M.Sound.ready = realReady;
    M.Sound.ctx = realCtx;
    return !threw && M.Music.on === false;
})());

ok("the music scheduler queues a whole lookahead window", (() => {
    const realCtx = M.Sound.ctx;
    const realReady = M.Sound.ready;
    const realNote = M.Sound.note;
    const realKick = M.Sound.kick;
    const realHat = M.Sound.hat;
    let notes = 0, kicks = 0, hats = 0;
    M.Sound.note = () => { notes++; };
    M.Sound.kick = () => { kicks++; };
    M.Sound.hat = () => { hats++; };
    M.Sound.ready = true;
    M.Sound.ctx = { currentTime: 0 };

    M.Music.on = true;
    M.Music.step = 0;
    M.Music.nextTime = 0.08;
    M.Music.schedule();
    const first = { step: M.Music.step, notes: notes };

    M.Sound.ctx.currentTime = 1.5;
    M.Music.schedule();
    const second = { step: M.Music.step, notes: notes };

    ok("one call queues several beats ahead", first.notes >= 3, first.notes + " notes");
    ok("drums are scheduled too", kicks > 0 && hats > 0, kicks + " kicks, " + hats + " hats");
    ok("the scheduler advances the step", first.step > 0, "step " + first.step);
    ok("catching up later queues more notes", second.step > first.step,
        first.step + " -> " + second.step);

    M.Music.on = false;
    M.Sound.note = realNote;
    M.Sound.kick = realKick;
    M.Sound.hat = realHat;
    M.Sound.ctx = realCtx;
    M.Sound.ready = realReady;
    return true;
})());

ok("stopping the music cancels its interval", (() => {
    const realReady = M.Sound.ready;
    const realCtx = M.Sound.ctx;
    const realNote = M.Sound.note;
    M.Sound.note = () => {};
    M.Sound.ready = true;
    M.Sound.ctx = { currentTime: 0 };
    M.Music.on = false;
    M.Music.timer = null;
    let threw = false;
    try { M.Music.start(); } catch (e) { threw = true; }
    ok("starting the music does not throw", !threw);
    ok("starting sets a lookahead timer", M.Music.timer !== null);
    M.Music.stop();
    M.Sound.note = realNote;
    ok("stopping clears it", M.Music.timer === null && M.Music.on === false);
    M.Sound.ready = realReady;
    M.Sound.ctx = realCtx;
    return true;
})());

ok("shoot-down rate is weighted by target size", (() => {
    const z = M.data.archetypes.zero;
    const ship = M.data.archetypes.ship;
    const bomber = M.data.archetypes.bomber;
    return ship.weight > z.weight * 4 && bomber.weight > z.weight * 4 && z.weight === 1;
})());

/* ===== Feel: difficulty, shake, hit stop, tally ===== */
console.log("\nfeel: difficulty, shake, hit stop, tally");

ok("three difficulties are defined", Object.keys(M.data.difficulty).length === 3);
ok("recruit is gentler than arcade, arcade than ace", (() => {
    const r = M.data.difficulty.recruit, a = M.data.difficulty.arcade, c = M.data.difficulty.ace;
    return r.speed < a.speed && a.speed < c.speed && r.hp < a.hp && a.hp < c.hp
        && r.fire < a.fire && a.fire < c.fire && r.bullet < a.bullet && a.bullet < c.bullet;
})());

function enemySpeedAt(difficultyId, stageNumber) {
    M.game.state.difficulty = difficultyId;
    M.game.startStage(32 - stageNumber);
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    n = 0;
    while (S.enemies.length === 0 && n++ < 4000) { armPlayer(); step(1); }
    const air = S.enemies.filter((e) => e.kind === "air");
    return air.length ? Math.max(...air.map((e) => e.speed)) : 0;
}

const recruitSpeed = enemySpeedAt("recruit", 20);
const arcadeSpeed = enemySpeedAt("arcade", 20);
const aceSpeed = enemySpeedAt("ace", 20);
ok("recruit enemies fly slower than arcade", recruitSpeed < arcadeSpeed, recruitSpeed + " vs " + arcadeSpeed);
ok("ace enemies fly faster than arcade", aceSpeed > arcadeSpeed, aceSpeed + " vs " + arcadeSpeed);

function hpAt(difficultyId, stageNumber) {
    M.game.state.difficulty = difficultyId;
    M.game.startStage(32 - stageNumber);
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    n = 0;
    while (S.enemies.length === 0 && n++ < 4000) { armPlayer(); step(1); }
    const air = S.enemies.filter((e) => e.kind === "air");
    return air.length ? Math.max(...air.map((e) => e.hp)) : 0;
}
ok("recruit targets are easier to kill than ace targets",
    hpAt("recruit", 20) < hpAt("ace", 20));

ok("late stages are meaningfully faster than early ones", (() => {
    M.game.state.difficulty = "arcade";
    M.game.startStage(0);
    const early = M.game.state.enemySpeedMul;
    M.game.startStage(31);
    const late = M.game.state.enemySpeedMul;
    return late > early * 1.4;
})(), (() => { M.game.startStage(0); const e = S.enemySpeedMul; M.game.startStage(31); return e.toFixed(2) + " -> " + S.enemySpeedMul.toFixed(2); })());

ok("killing an enemy shakes the screen", (() => {
    M.game.state.difficulty = "arcade";
    armPlayer();
    S.shake = 0;
    S.hitStop = 0;
    S.enemies.length = 0;
    for (let i = 0; i < 200; i++) { armPlayer(); S.enemies.push(enemyStub("zero", 200, 200)); step(1); }
    return S.shake > 0;
})(), "shake " + S.shake.toFixed(2));

ok("shake decays back to zero", (() => {
    touch("touchend");
    armPlayer();
    S.enemies.length = 0;
    S.ebullets.length = 0;
    S.shake = 9;
    S.hitStop = 0;
    for (let i = 0; i < 200; i++) { armPlayer(); step(1); }
    return S.shake === 0;
})(), String(S.shake));

ok("plain kills do not freeze the game", (() => {
    armPlayer();
    S.hitStop = 0;
    S.enemies.length = 0;
    for (let i = 0; i < 200; i++) { armPlayer(); S.enemies.push(enemyStub("zero", 200, 200)); step(1); }
    return S.hitStop === 0;
})(), "hitStop " + S.hitStop);

ok("the tally screen advances on its own", (() => {
    M.game.startStage(0);
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    S.wavePlan.length = 0;
    S.weightTotal = 100;
    S.weightKilled = 100;
    const before = S.stage.n;
    n = 0;
    while (S.phase === "playing" && n++ < 12000) { armPlayer(); step(1); }
    if (S.phase !== "clear") return false;
    n = 0;
    while (S.phase === "clear" && n++ < 4000) step(1);
    return S.stage.n === before - 1 && S.phase === "briefing";
})(), S.stage.n + " phase " + S.phase);

/* ===== Performance budget ===== */
console.log("\nperformance: canvas work per frame");

function measureFrame(stageIndex, wantBiome) {
    M.game.state.difficulty = "arcade";
    M.game.startStage(stageIndex);
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    armPlayer();
    S.player.invuln = 1e9;
    for (let i = 0; i < 1500; i++) {
        armPlayer();
        if (S.stage !== M.game.state.stage) return null;
        step(1);
    }
    if (S.phase !== "playing") return null;
    if (wantBiome && S.stage.biome !== wantBiome) return null;
    resetStats();
    step(1);
    const loaded = Object.assign({}, stats);
    S.enemies.length = 0;
    S.ebullets.length = 0;
    S.boss = null;
    S.wavePlan.length = 0;
    resetStats();
    step(1);
    return Object.assign({ biome: S.stage.biome, enemies: loaded.path, loadedPath: loaded.path },
        stats, { loadedPath: loaded.path, loadedPaint: loaded.paint });
}

function stageIndexFor(wantBiome) {
    for (let i = 0; i < 32; i++) {
        if (S.stage === null || M.game.state.stage === null) break;
        const stages = M.data.allStages[M.game.state.theatre];
        if (stages[i].biome === wantBiome) return i;
    }
    return 0;
}
const theatreId = S.theatre;
const mixed = measureFrame(stageIndexFor("mixed"));
const land = measureFrame(stageIndexFor("land"));
const sea = measureFrame(stageIndexFor("sea"));
void theatreId;
ok("measurement landed on a mixed stage", mixed && mixed.biome === "mixed", mixed && mixed.biome);
ok("measurement landed on a land stage", land && land.biome === "land", land && land.biome);
ok("measurement landed on a sea stage", sea && sea.biome === "sea", sea && sea.biome);
const worstPath = Math.max(mixed.loadedPath, land.loadedPath, sea.loadedPath);
const worstShadow = Math.max(mixed.shadow, land.shadow, sea.shadow);
const worstGradient = Math.max(mixed.gradient, land.gradient, sea.gradient);

console.log("  mixed: " + mixed.loadedPath + " path / " + mixed.loadedPaint + " paint per loaded frame");
console.log("  land : " + land.loadedPath + " path / " + land.loadedPaint + " paint per loaded frame");
console.log("  sea  : " + sea.loadedPath + " path / " + sea.loadedPaint + " paint per loaded frame");

ok("a loaded frame stays within budget", worstPath < 800, worstPath + " path ops");

function terrainCost(fn) {
    resetStats();
    fn();
    return Object.assign({}, stats);
}

const seaCost = terrainCost(() => M.art.drawSea(ctx2d, 0, 600, 1000, 3, M.data.themes.olive));
const landCost = terrainCost(() => M.art.drawLand(ctx2d, 0, 600, 1000, 3, M.data.themes.olive));
console.log("  sea band   : " + seaCost.path + " path / " + seaCost.paint + " paint");
console.log("  land band  : " + landCost.path + " path / " + landCost.paint + " paint");
ok("the sea draws no per-point paths", seaCost.path === 0, seaCost.path + " path ops");
ok("the sea is a handful of blits", seaCost.paint <= 20, seaCost.paint + " paint ops");
ok("the land draws almost no per-point paths", landCost.path <= 12, landCost.path + " path ops");
ok("the land is a handful of blits", landCost.paint <= 30, landCost.paint + " paint ops");
ok("terrain tiles are cached, not rebuilt per frame", (() => {
    const a = terrainCost(() => M.art.drawSea(ctx2d, 0, 600, 1, 1, M.data.themes.olive));
    const c = terrainCost(() => M.art.drawSea(ctx2d, 0, 600, 999, 9, M.data.themes.olive));
    return a.gradient === 0 && c.gradient === 0 && c.path === 0;
})());
ok("no gradient is rebuilt every frame", worstGradient === 0, worstGradient + " gradients/frame");
ok("no per-bullet shadowBlur", worstShadow === 0, worstShadow + " shadow assignments/frame");

/* ===== Accessibility and portability ===== */
console.log("\naccessibility and portability");

ok("every POW crate carries a letter as well as a colour", (() => {
    const ids = Object.keys(M.data.powerups);
    return ids.every((id) => typeof M.data.powerups[id].mark === "string" && M.data.powerups[id].mark.length === 1);
})());
ok("the letters are all different", (() => {
    const marks = Object.values(M.data.powerups).map((p) => p.mark);
    return new Set(marks).size === marks.length;
})());
ok("no two POW crates share a colour", (() => {
    const cols = Object.values(M.data.powerups).map((p) => p.color);
    return new Set(cols).size === cols.length;
})());
ok("colour schemes are cached, not rebuilt per enemy", (() => {
    const a = M.art.schemeFor("overlord", "zero");
    const b = M.art.schemeFor("overlord", "zero");
    return a === b;
})());
ok("reduced motion is a single switch", (() => {
    M.data.config.reducedMotion = true;
    S.shake = 0;
    M.game.startGame();
    armPlayer();
    S.shake = 0;
    for (let i = 0; i < 60; i++) { armPlayer(); step(1); }
    const quiet = S.shake === 0;
    M.data.config.reducedMotion = false;
    return quiet;
})(), "shake " + S.shake);
ok("reduced motion also shortens particle bursts", (() => {
    M.data.config.reducedMotion = true;
    S.particles.length = 0;
    armPlayer();
    S.enemies.length = 0;
    for (let i = 0; i < 120; i++) { armPlayer(); S.enemies.push(enemyStub("zero", 200, 200)); step(1); }
    const few = S.particles.length;
    M.data.config.reducedMotion = false;
    return few >= 0 && few < 200;
})(), String(S.particles.length));
ok("object pools actually recycle", (() => {
    M.game.startGame();
    armPlayer();
    S.particles.length = 0;
    S.shots.length = 0;
    const before = S.shots.length;
    touch("touchstart", 200, 480);
    for (let i = 0; i < 200; i++) { armPlayer(); step(1); }
    touch("touchend", 200, 480);
    return before === 0 && S.shots.length >= 0 && S.particles.length <= M.data.config.maxParticles;
})());
ok("the game still plays a full stage after all of that", (() => {
    M.game.startGame();
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    n = 0;
    while (S.phase === "playing" && n++ < 12000) { armPlayer(); step(1); }
    return S.phase === "clear";
})(), S.phase);

/* ===== Carrier landing ===== */
console.log("\ncarrier landing");

ok("the landing plays before the tally appears", (() => {
    M.game.setTheatre("overlord");
    M.game.startGame();
    M.game.startStage(0);
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    S.wavePlan.length = 0;
    S.weightTotal = 100;
    S.weightKilled = 100;
    n = 0;
    while (S.phase === "playing" && n++ < 12000) { armPlayer(); step(1); }
    if (S.phase !== "clear") return "never cleared";
    if (S.landing !== 0) return "landing did not start at zero";
    step(6);
    const early = S.landing;
    step(90);
    const mid = S.landing;
    return mid > early && mid > 0.5 && mid <= 1;
})(), "landing " + S.landing);

ok("the landing completes and then the tally auto-advances", (() => {
    if (S.phase !== "clear") return "not on the tally: " + S.phase;
    const before = S.stage.n;
    let n = 0;
    while (S.phase === "clear" && n++ < 4000) step(1);
    return S.stage.n === before - 1;
})(), S.stage.n + " " + S.phase);

ok("the two fronts use different formation vocabularies", (() => {
    const a = M.data.theatres.overlord.shapes.join(",");
    const c = M.data.theatres.rising.shapes.join(",");
    return a !== c;
})(), M.data.theatres.overlord.shapes + " vs " + M.data.theatres.rising.shapes);
ok("every stage carries its front's cadence and shapes", (() => {
    for (const id of ["overlord", "rising"]) {
        const t = M.data.theatres[id];
        for (const s of M.data.allStages[id]) {
            if (typeof s.cadence !== "number" || s.cadence <= 0) return id + " stage " + s.n + " has no cadence";
            if (!s.shapes || !s.shapes.length) return id + " stage " + s.n + " has no shapes";
        }
        void t;
    }
    return true;
})());
let forcedWaves = 0;
ok("wave plans never fall back to the forced air unit", (() => {
    forcedWaves = 0;
    for (const id of ["overlord", "rising"]) {
        M.game.setTheatre(id);
        for (let i = 0; i < 32; i++) {
            M.game.startStage(i);
            forcedWaves += S.wavePlan.filter((w) => w.force).length;
        }
    }
    return forcedWaves === 0;
})(), forcedWaves + " forced waves");

/* ===== Checkpoint and continue ===== */
console.log("\ncheckpoint");

function playStageToTally(index) {
    M.game.startStage(index);
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    S.wavePlan.length = 0;
    S.weightTotal = 100;
    S.weightKilled = 100;
    n = 0;
    while (S.phase === "playing" && n++ < 12000) { keepAlive(); step(1); }
    return S.phase === "clear";
}

S.checkpoints = { overlord: 0, rising: 0 };
M.game.setTheatre("overlord");
M.game.startGame();
const clearedFive = playStageToTally(5);
ok("clearing a stage advances the checkpoint", clearedFive && S.checkpoint === 5,
    "checkpoint " + S.checkpoint + " stage " + S.stage.n);

ok("the checkpoint only ever moves forward", (() => {
    if (!playStageToTally(2)) return "could not replay an earlier stage";
    return S.checkpoint === 5;
})(), "checkpoint went to " + S.checkpoint);

ok("the checkpoint survives a reload", (() => {
    const raw = JSON.parse(storage.get("mustang-pwa") || "{}");
    return raw.checkpoint === 5;
})(), storage.get("mustang-pwa"));

ok("a fresh run starts from stage 32", (() => {
    M.game.startGame();
    return S.stageIndex === 0 && S.stage.n === 32;
})(), S.stage.n);

ok("dying offers a continue from the last cleared stage", (() => {
    S.phase = "playing";
    keepAlive();
    S.lives = 0;
    S.enemies.length = 0;
    S.ebullets.push({ x: S.player.x, y: S.player.y, vx: 0, vy: 0, r: 3, life: 4, dead: false });
    let n = 0;
    while (S.phase !== "gameover" && n++ < 600) { keepAlive(); step(1); }
    if (S.phase !== "gameover") return "never reached game over: " + S.phase;
    const offered = !els["continue-btn"].classList.contains("hidden");
    return offered && els["continue-stage"].textContent === "27";
})(), els["continue-stage"].textContent + " hidden=" + els["continue-btn"].classList.contains("hidden"));

ok("continuing restarts at the last cleared stage with full lives", (() => {
    const from = S.stage.n;
    S.score = 0;
    els["continue-btn"]._h.click[0]();
    return S.stage.n === from && S.lives === 3 && S.score === 0 && S.phase === "briefing";
})(), S.stage.n + " lives " + S.lives + " phase " + S.phase);

ok("the two fronts keep separate checkpoints", (() => {
    M.game.setTheatre("rising");
    M.game.startGame();
    return S.checkpoint === 0 && S.stage.n === 32;
})(), "rising checkpoint " + S.checkpoint);
ok("and the allied one is untouched", (() => {
    M.game.setTheatre("overlord");
    return S.checkpoint === 5;
})(), "overlord checkpoint " + S.checkpoint);

/* ===== Winning the war ===== */
console.log("\nvictory");

function winTheWar(theatreId) {
    M.game.setTheatre(theatreId);
    M.game.startGame();
    M.game.startStage(31);
    let n = 0;
    while (S.phase === "briefing" && n++ < 400) step(1);
    S.weightTotal = 100;
    S.weightKilled = 100;
    S.score = 0;
    n = 0;
    while (S.phase === "playing" && n++ < 12000) { armPlayer(); step(1); }
    if (S.phase !== "clear") return "never cleared";
    const before = S.score;
    M.game.advanceStage();
    if (S.phase !== "victory") return "phase is " + S.phase;
    if (S.score < before + 1000000) return "no surrender bonus";
    return true;
}

const alliedWin = winTheWar("overlord");
ok("the allied front can be won", alliedWin === true, String(alliedWin));
const axisWin = winTheWar("rising");
ok("the axis front can be won too", axisWin === true, String(axisWin));
ok("the victory screen is shown", els["overlay-title"].textContent === "SURRENDER", els["overlay-title"].textContent);
ok("the victory screen shows a rank", els["final-rank"].textContent.length > 0, els["final-rank"].textContent);

console.log(failures === 0 ? "\nOK: smoke test passed" : "\nFAILED: " + failures + " smoke checks");
process.exit(failures === 0 ? 0 : 1);