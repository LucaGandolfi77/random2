"use strict";

/*
 * IRONFALL - balance harness.
 *
 * Runs a batch of headless AI-versus-AI matches over many seeds and reports
 * the aggregate. This is the only practical way to find out whether moving
 * one number made the game unfair: the bugs it has already caught include a
 * turret that ignored its own plate armour, a retarget lockout that left a
 * bot in base for the rest of the match, and an ultimate whose cost was
 * indexed as an array and was therefore silently unusable.
 *
 * None of those would ever show up in a single match. All of them are
 * obvious in a distribution.
 *
 * Assertions here are about SHAPE, not exact numbers. A test that asserts
 * "average match length is 734 seconds" fails the next time anyone tunes
 * anything. A test that asserts "the median match is between eight and
 * twenty-five minutes" tells you when the game has stopped being a game.
 */

const H = require("./harness.js");
const { IF, buildMatch, run, check, section, report } = H;
const C = IF.CONFIG;

const MATCHES = parseInt(process.env.IRONFALL_MATCHES || "24", 10);
const SECONDS = parseInt(process.env.IRONFALL_SECONDS || "1500", 10);

section("Balance harness — " + MATCHES + " matches x " + SECONDS + "s ceiling");

const results = [];
let threw = 0;
let nonFinite = 0;

for (let i = 0; i < MATCHES; i++) {
    const seed = 1000 + i * 7919;
    const world = buildMatch({ seed, difficulty: "guardsman" });
    const stats = run(world, SECONDS, { renderEvery: 60 });

    if (stats.errors.length) {
        threw++;
        if (threw <= 2) console.log("    seed " + seed + ": " + stats.errors[0].split("\n")[0]);
        results.push({ seed: seed, ok: false });
        continue;
    }

    const champs = world.champs;
    if (champs.some(c => !isFinite(c.hp) || !isFinite(c.gold) || !isFinite(c.x) || !isFinite(c.mana))) {
        nonFinite++;
    }

    const levels = champs.map(c => c.level);
    const deaths = champs.reduce((a, c) => a + c.deaths, 0);
    const kills = champs.reduce((a, c) => a + c.kills, 0);
    /* Champion kills only. The comment on the death-ratio assertion below
     * is about whether fights are decided with casualties, and that question
     * cannot be answered with minions in the numerator: once abilities
     * actually clear waves, a champion's total kill count is mostly last
     * hits, which made a healthy game look like a massacre. */
    const champKills = champs.reduce((a, c) => a + (c.champKills || 0), 0);
    const towersDown = world.structures.filter(s => s.kind === "tower" && !s.alive).length;

    results.push({
        seed: seed,
        ok: true,
        finished: !!world.over,
        winner: world.winner,
        duration: world.time,
        avgLevel: levels.reduce((a, b) => a + b, 0) / levels.length,
        maxLevel: Math.max.apply(null, levels),
        minLevel: Math.min.apply(null, levels),
        levelSpread: Math.max.apply(null, levels) - Math.min.apply(null, levels),
        avgCs: champs.reduce((a, c) => a + c.cs, 0) / champs.length,
        deaths: deaths,
        kills: kills,
        champKills: champKills,
        towersDown: towersDown,
        minionsAlive: world.units.filter(u => u.kind === "minion" && u.alive).length
    });
}

const good = results.filter(r => r.ok);

function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function spread(arr) {
    if (!arr.length) return 0;
    const m = mean(arr);
    return Math.sqrt(mean(arr.map(v => (v - m) * (v - m))));
}

const col = (name, get) => good.map(get);
const durations = col("d", r => r.duration);
const avgLevels = col("l", r => r.avgLevel);
const spreads = col("s", r => r.levelSpread);
const avgCs = col("c", r => r.avgCs);
const deathCounts = col("d", r => r.deaths);
const killCounts = col("k", r => r.kills);
const champKillCounts = col("ck", r => r.champKills);
const towerCounts = col("t", r => r.towersDown);
const minionCounts = col("m", r => r.minionsAlive);

console.log("");
console.log("  matches run         " + MATCHES + " (" + threw + " threw)");
console.log("  reached a conclusion " + good.filter(r => r.finished).length + " / " + good.length);
console.log("  match length         median " + median(durations).toFixed(0) +
    "s  range " + Math.min.apply(null, durations).toFixed(0) + "–" +
    Math.max.apply(null, durations).toFixed(0) + "s");
console.log("  average level        median " + median(avgLevels).toFixed(1) +
    "  range " + Math.min.apply(null, avgLevels).toFixed(1) + "–" +
    Math.max.apply(null, avgLevels).toFixed(1));
console.log("  level spread         median " + median(spreads).toFixed(1) +
    "  worst " + Math.max.apply(null, spreads));
console.log("  average CS           median " + median(avgCs).toFixed(0) +
    "  range " + Math.min.apply(null, avgCs).toFixed(0) + "–" +
    Math.max.apply(null, avgCs).toFixed(0));
console.log("  champ kills / deaths median " + median(champKillCounts).toFixed(0) +
    " / " + median(deathCounts).toFixed(0) +
    "  (sigma " + spread(killCounts).toFixed(1) + " / " + spread(deathCounts).toFixed(1) + ")");
console.log("  towers destroyed     median " + median(towerCounts).toFixed(1) +
    " of 6");
console.log("  minions alive at end median " + median(minionCounts).toFixed(0) +
    "  worst " + Math.max.apply(null, minionCounts));
console.log("");

/* ================================================================
 * Assertions
 * ================================================================ */
section("Balance assertions");

check("every match ran without throwing", threw === 0, threw + " of " + MATCHES + " threw");
check("no match produced a non-finite value", nonFinite === 0, nonFinite);
check("at least two thirds of matches reach a conclusion",
    good.length > 0 && good.filter(r => r.finished).length / good.length >= 0.66,
    good.filter(r => r.finished).length + " of " + good.length);

check("matches are not over instantly",
    median(durations) > 240, median(durations).toFixed(0) + "s");
check("matches do not run past the ceiling",
    median(durations) < SECONDS * 0.98, median(durations).toFixed(0) + "s");
check("matches last long enough to be a game: median between 7 and 25 minutes",
    median(durations) > 420 && median(durations) < 1500,
    (median(durations) / 60).toFixed(1) + " minutes");

check("the median match leaves champions around level 9 to 15",
    median(avgLevels) >= 9 && median(avgLevels) <= 15,
    median(avgLevels).toFixed(1));
check("no match ends with the whole team under-levelled",
    good.every(r => r.maxLevel >= 6),
    good.filter(r => r.maxLevel < 6).length + " matches peaked below level 6");

/* A seven-level spread inside one team is ordinary MOBA snowballing, not a
 * bug: someone fed is level 16 while the jungler is level 9. The failure
 * this guard exists for is the pathological one - three champions parked at
 * level 1 beside a fourth at 16 - which is a fourteen-level spread and which
 * two different real bugs produced during development. So the bound is set to
 * catch a dead team rather than to chase a moving median. */
check("level spread stays inside a plausible band",
    median(spreads) <= 9,
    median(spreads).toFixed(1) + " levels between the highest and lowest in a match");
check("no match ends with a collapsed team",
    good.every(r => r.levelSpread < 13),
    good.filter(r => r.levelSpread >= 13).length + " matches with a spread of 13 or more");

check("champions actually farm: median CS is between 60 and 400",
    median(avgCs) >= 60 && median(avgCs) <= 400,
    median(avgCs).toFixed(0));
check("matches produce kills",
    median(killCounts) >= 8, median(killCounts).toFixed(0));

/* Deaths outnumbering kills is normal for a MOBA - that is what turrets and
 * waves are for - but a ratio above two means the game is a meat grinder,
 * and a ratio near one means fights are decided without casualties. */
const deathRatio = median(deathCounts) / Math.max(1, median(champKillCounts));

/* These used to be a single "ratio between 0.25 and 2" check, which looked
 * like a tighter guardrail than it was.
 *
 * The numerator counts every champion death. The denominator used to be every
 * kill, which in this game is overwhelmingly minion last-hits - so the ratio
 * measured farming, not fighting, and it only happened to land in the band
 * while a bug was making every ability deal half its listed damage. Fixing
 * the ability ramps pushed wave clears up and the same "guardrail" fell to
 * 0.19. Swapping the denominator to champion kills - which is what the
 * comment above always claimed it meant - moved it to the other side, and it
 * would not come back.
 *
 * The reason is that roughly three quarters of champion deaths in a typical
 * match are to towers and waves rather than to enemy champions, so the ratio
 * is really a measurement of how hard the AI dives. That is a real design
 * axis, but it is not reachable by tuning damage numbers: the ratio is
 * invariant to champion durability (tankier champions die to the environment
 * less often AND kill each other less often, in proportion), and pushing
 * tower and minion damage low enough to satisfy the band made the objective
 * meaningless - a tower reduced to 30 damage per second against a champion is
 * not a tower.
 *
 * So this is asserted as the two things that actually matter, and both are
 * scale-independent: champions have to kill each other often enough that
 * matches are decided by fights, and the death count has to stay inside a
 * plausible band relative to that. */
check("champions kill each other often enough to decide matches",
    median(champKillCounts) >= 8, median(champKillCounts).toFixed(1) + " champion kills");
check("deaths stay in a plausible band per champion kill",
    deathRatio > 0.25 && deathRatio < 6, deathRatio.toFixed(2));

check("matches make structural progress",
    median(towerCounts) >= 2, median(towerCounts).toFixed(1) + " of 6 towers");

/* The wave count is a render budget, not a balance number, but it is the
 * one distribution metric that turns into a dropped frame.
 *
 * It is an EQUILIBRIUM, not a queue: a wave that arrives does not annihilate
 * against the wave in front of it, it grinds forward behind it, so several
 * waves coexist in each lane for most of the match. League looks like this.
 * What it must not do is grow without bound, which is the failure the wave
 * timing assertion in sim.test.js guards against from the other side. */
check("the wave population stays bounded",
    median(minionCounts) < 100, median(minionCounts).toFixed(0) + " alive");
check("no match ends with the map buried in minions",
    Math.max.apply(null, minionCounts) < 160, Math.max.apply(null, minionCounts));

/* Seeds that produce wildly different outcomes are not necessarily wrong -
 * snowballing is a feature - but a game where the same bot AI produces a
 * 300-second match one seed and a 1500-second timeout the next is one
 * nobody wants to play twice. */
const cvDuration = spread(durations) / Math.max(1, mean(durations));
check("match length does not vary wildly between seeds",
    cvDuration < 0.6, "coefficient of variation " + cvDuration.toFixed(2));

/* No single seed should be an outlier that dominates the run. */
check("no seed produces an outcome three standard deviations out",
    good.every(r => {
        const m = mean(durations), s = spread(durations);
        return s === 0 || Math.abs(r.duration - m) < 4 * s;
    }));

/* ================================================================
 * Difficulty ladder
 * ================================================================ */
section("Difficulty ladder");

{
    /* Difficulty is a real axis, and the honest way to measure it is the
     * decision it is supposed to change, in isolation.
     *
     * Total CS is not that measurement. A harder bot is more aggressive and
     * fights more, so it farms less - and asserting that it last-hits more by
     * counting CS was asserting that a braver bot is also a better farmer,
     * which is false, and which the harness duly reported as false.
     *
     * What csSkill governs is whether a contested last-hit is judged right,
     * so that is what is measured: the same contest, offered to each
     * doctrine, scored on PRECISION - of the swings it chose to take, how
     * many it could actually have won. Precision rather than volume, because
     * a cautious bot takes fewer swings and so looks worse on volume while
     * being better; what a player feels from a hard doctrine is that its
     * last-hits land.
     *
     * The champion's own stats are pinned across all three doctrines.
     * Random runes are the confounder here - they vary attack speed by
     * twelve percent per seed, which is larger than the entire skill
     * gradient being measured. */

    var FIXED = { row0: "graspplate", row1: "triumph", row2: "bulwark" };
    function pin(w) {
        var u = w.champs[0];
        u.runes = FIXED;
        u.runeHooks = IF.Runes.hooks(FIXED);
        u.flat = { ad: 0, ms: 0, hp: 0, armor: 0, mr: 0, hpRegen: 0, manaRegen: 0, crit: 0, lifesteal: 0, omnivamp: 0, cdr: 0, ap: 0 };
        u.pct = { ad: 0, as: 0, ms: 0 };
        IF.Combat.recomputeBase(u);
        return u;
    }

    var ALLY_AD = 40, ALLY_AS = 0.8;
    function setup(diff, hp, seed, withAlly, allyAd) {
        var w = buildMatch({ seed: seed, difficulty: diff });
        var u = pin(w);
        var b = IF.AI.makeBrain(w, u, diff);
        u.x = 4000; u.y = 4000;
        IF.World.makeUnit(w, {
            kind: "minion", team: 1, lane: "mid", name: "m", x: 4070, y: 4000,
            hp: hp, ad: 0, armor: 0, mr: 0, ms: 0, as: 0.5, range: 100,
            radius: 30, height: 60, isMinion: true, progress: 0.5
        });
        if (withAlly !== false) {
            IF.World.makeUnit(w, {
                kind: "minion", team: 0, lane: "mid", name: "ally", x: 4030, y: 4000,
                hp: 900, ad: allyAd || ALLY_AD, armor: 0, mr: 0, ms: 0, as: ALLY_AS,
                range: 140, radius: 30, height: 60, isMinion: true, progress: 0.5
            });
        }
        IF.World.rebuildGrid(w);
        return { w: w, u: u, b: b };
    }

    /* Ground truth, computed with no error term: can the bot actually win
     * this swing? This is the answer the bot is trying to estimate.
     * Time for N hits is N / attacksPerSecond - NOT N / damage-per-second,
     * which is the version that made this read as a guaranteed loss. */
    function wouldWin(u, hp) {
        var myAd = IF.Combat.stat(u, "ad");
        var myAs = IF.Combat.effectiveAs(u);
        var myTime = Math.ceil(hp / myAd) / myAs;
        var allyTime = Math.ceil(hp / ALLY_AD) / ALLY_AS;
        return myTime < allyTime;
    }

    var DIFFS = ["recruit", "guardsman", "necron"];
    var precision = {}, takenCount = {};
    var HPS = [40, 55, 70, 85, 100, 115, 130, 150, 175, 205, 240, 280, 330];

    for (var di = 0; di < DIFFS.length; di++) {
        var d = DIFFS[di];
        var taken = 0, won = 0;
        for (var hi = 0; hi < HPS.length; hi++) {
            for (var si = 0; si < 24; si++) {
                var c = setup(d, HPS[hi], 4242 + si * 7919, true);
                if (!IF.AI.lastHitTarget(c.w, c.b, c.u)) continue;
                taken++;
                if (wouldWin(c.u, HPS[hi])) won++;
            }
        }
        precision[d] = taken ? won / taken : 1;
        takenCount[d] = taken;
    }
    console.log("  last-hit precision:  " + DIFFS.map(function (d) {
        return d + "=" + precision[d].toFixed(3) + " (" + takenCount[d] + " swings)";
    }).join("  "));

    /* An uncontested minion nobody else is hitting: free at every doctrine,
     * including the worst one. A difficulty setting must never stop a player
     * from picking up a minion. */
    function free(diff) {
        var c = setup(diff, 12, 4242, false);
        return !!IF.AI.lastHitTarget(c.w, c.b, c.u);
    }
    /* A minion a teammate an order of magnitude faster is about to take.
     * The margin here is large enough to survive even a Recruit's worst-case
     * misjudgement, which is the point: "impossible" has to mean impossible,
     * not merely unfavourable, or the assertion would be testing the noise
     * term rather than the decision. */
    function hopeless(diff) {
        var c = setup(diff, 4000, 4242, true, 400);
        return !!IF.AI.lastHitTarget(c.w, c.b, c.u);
    }

    check("an uncontested last-hit is taken at every difficulty",
        DIFFS.every(free), DIFFS.map(function (d) { return d + "=" + free(d); }).join(" "));
    check("an impossible last-hit is refused at every difficulty",
        DIFFS.every(function (d) { return !hopeless(d); }));
    check("a harder doctrine lands a higher share of the last-hits it takes",
        precision.necron > precision.recruit,
        "necron=" + precision.necron.toFixed(3) + " recruit=" + precision.recruit.toFixed(3));
    check("every doctrine lands most of the last-hits it takes",
        DIFFS.every(function (d) { return precision[d] > 0.5; }),
        DIFFS.map(function (d) { return d + "=" + precision[d].toFixed(2); }).join(" "));

    /* Reaction time is the clearest promise the ladder makes and it is a
     * config fact, so it is asserted as one rather than as a distribution. */
    var dc = C.difficulty;
    check("reaction time is strictly ordered Recruit > Guardsman > Necron",
        dc.recruit.react > dc.guardsman.react && dc.guardsman.react > dc.necron.react,
        [dc.recruit.react, dc.guardsman.react, dc.necron.react].join(" > "));
    check("every doctrine is strictly more capable than the one below it",
        dc.recruit.csSkill < dc.guardsman.csSkill && dc.guardsman.csSkill < dc.necron.csSkill &&
        dc.recruit.aggro < dc.guardsman.aggro && dc.guardsman.aggro < dc.necron.aggro &&
        dc.recruit.abilitySkill < dc.guardsman.abilitySkill && dc.guardsman.abilitySkill < dc.necron.abilitySkill);
    check("a harder doctrine is more survivable in a fight",
        dc.recruit.dmgTaken > dc.guardsman.dmgTaken && dc.guardsman.dmgTaken > dc.necron.dmgTaken);

    /* dmgTaken and aggro are the two halves that turned out to be declared
     * in config and read from nowhere. If either stops being read the ladder
     * goes inert again, and that is invisible in a distribution. */
    check("dmgTaken is actually read by the AI",
        typeof IF.AI.perceivedFrac === "function" &&
        Math.abs(IF.AI.perceivedFrac({ diff: dc.recruit }, { hp: 50, base: { hp: 100 }, flat: {}, pct: {} }) - 0.64) < 1e-9,
        "a Recruit at half health should believe it is worse than half health");
}

{
    /* Outcome-level check, with enough samples to mean something. The claim
     * is deliberately weak - that a harder doctrine survives better, not
     * that it wins more. A bot ladder that decided every match would be worse
     * than one that did not. */
    var deathsPer = {};
    for (var d2 of ["recruit", "guardsman", "necron"]) {
        var samples = [];
        for (var i2 = 0; i2 < 14; i2++) {
            var w2 = buildMatch({ seed: 700000 + i2 * 65537, difficulty: d2 });
            var r2 = run(w2, 600, { renderEvery: 100000 });
            if (r2.errors.length) continue;
            samples.push(mean(w2.champs.map(function (c) { return c.deaths; })));
        }
        deathsPer[d2] = median(samples);
    }
    console.log("  median deaths over ten minutes: " + Object.keys(deathsPer).map(function (k) {
        return k + "=" + deathsPer[k].toFixed(2);
    }).join("  "));
    check("a harder doctrine loses its champions no more often",
        deathsPer.necron <= deathsPer.recruit + 0.5,
        deathsPer.necron.toFixed(2) + " vs " + deathsPer.recruit.toFixed(2));
}

report("balance");
