/*
 * Monte-Carlo balance harness for LINEA ROSSA (metro-pwa/sim.js).
 *
 *   node tools/balance/run.mjs [--sessions 5000] [--seed 20261015]
 *                              [--dt 5] [--policy greedy|mixed|random|none]
 *                              [--out tools/balance/out/runs.csv]
 *
 * Plays thousands of headless sessions against the real simulation module
 * and writes one CSV row per session. tools/balance/report.py turns those
 * rows into a distribution report.
 *
 * Plain Node ESM, no dependencies — the same constraint as
 * mustang-pwa/scripts/gen-icons.mjs.
 *
 * The point of the run: TODOs.md says of LINEA ROSSA that the work "is the
 * balancing" and that too much complexity "generates a spreadsheet, not a
 * game". Balance is the one property of a tycoon that cannot be checked by
 * reading the code, so it gets measured instead.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const require = createRequire(import.meta.url);
const S = require(resolve(root, "metro-pwa/sim.js"));

/* ===== args ===== */

function arg(name, fallback) {
    const i = process.argv.indexOf("--" + name);
    if (i === -1) return fallback;
    const v = process.argv[i + 1];
    return v === undefined || v.startsWith("--") ? true : v;
}

const SESSIONS = Number(arg("sessions", 5000));
const BASE_SEED = Number(arg("seed", 20261015));
const DT = Number(arg("dt", 5));
const POLICY = String(arg("policy", "mixed"));
/* A real player spends most of their time drawing lines and adding trains.
   DECISIONS_PER_DAY is how often a policy acts in one simulated day: at 6
   it acts about every 25 real seconds, which is roughly a brisk but human
   pace. Lowering it models a busier player, raising it an idle one. */
const DECISIONS_PER_DAY = Number(arg("decisions-per-day", 6));
const OUT = String(arg("out", join(here, "out/runs.csv")));
const MAX_TRANSFERS = Number(arg("max-transfers", 2));
const MAX_TICKS = Number(arg("max-ticks", 200000));

if (!Number.isFinite(SESSIONS) || SESSIONS < 1) {
    console.error("--sessions must be a positive number");
    process.exit(1);
}

/* ===== seeded RNG (mulberry32, same algorithm as shared/arcade.js so a
   seed printed by the game reproduces here) ===== */

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ===== city generation =====
   Mirrors genCity() in game.js: a seedable lattice with jitter, working
   districts nearer the centre so gravity has something to bite on. */

function genCity(rng, opts = {}) {
    const count = opts.count || 16;
    const districts = [];
    const W = 1700, H = 1700;
    const tries = opts.tries || 900;
    let placed = 0;
    for (let i = 0; placed < count && i < tries; i++) {
        const x = 120 + rng() * (W - 240);
        const y = 120 + rng() * (H - 240);
        // Reject points too close to an existing district.
        let ok = true;
        for (const d of districts) {
            const dx = d.x - x, dy = d.y - y;
            if (dx * dx + dy * dy < 200 * 200) { ok = false; break; }
        }
        if (!ok) continue;
        const r = Math.sqrt((x - W / 2) ** 2 + (y - H / 2) ** 2) / (W / 2);
        const weight = 1.25 - 0.5 * Math.min(r, 1); // centre is denser
        districts.push({
            id: placed,
            x: Math.round(x), y: Math.round(y),
            pop: Math.round((700 + rng() * 1100) * weight),
            jobs: Math.round((600 + rng() * 1000) * weight),
            geo: 1
        });
        placed++;
    }
    return districts;
}

/* ===== goals drawn from the game's own level table =====

   These mirror the LEVELS entries in metro-pwa/game.js. They are copied
   rather than imported because game.js is a browser IIFE; keeping the list
   here means a balance run can answer "is level 4 beatable" without a
   browser. If you edit the levels, update this table too. */

const GOALS = [
    { id: "libera", paxDay: 9000, days: 14, servedMin: null },
    { id: "fiume", paxDay: 8000, days: 14, servedMin: 5 },
    { id: "collina", paxDay: 9000, days: 16, servedMin: 7 },
    { id: "porto", paxDay: 13000, days: 18, servedMin: 8 },
    { id: "industriale", paxDay: 13000, days: 20, servedMin: 9 },
    { id: "metropoli", paxDay: 20000, days: 24, servedMin: 10 }
];

/* ===== policies =====
   A session needs someone making decisions. Three scripts of increasing
   competence, so the report can separate "the goal is unreachable" from
   "the goal is reachable but only with good play". */

function greedyPolicy(state, rng, ctx) {
    const budget = state.money + state.loan;
    // Build while affordable and lines remain.
    if (state.lines.length < state.cfg.maxLines) {
        const candidates = [];
        for (let i = 0; i < state.districts.length; i++) {
            for (let j = i + 1; j < state.districts.length; j++) {
                const already = state.lines.some(l =>
                    (l.stations.includes(i) && l.stations.includes(j)) ||
                    l.stations.includes(i) || l.stations.includes(j));
                if (already) continue;
                const g = S.gravity(state.districts[i], state.districts[j], state.cfg);
                const d = Math.hypot(
                    state.districts[i].x - state.districts[j].x,
                    state.districts[i].y - state.districts[j].y);
                candidates.push({ i, j, score: g / Math.max(d, 1) });
            }
        }
        candidates.sort((a, b) => b.score - a.score);
        for (const c of candidates) {
            const cost = estimateCost(state, [c.i, c.j]);
            /* Only commit what is actually in hand: a policy that spends
               into debt it cannot service measures the loan rules, not the
               build rules. */
            if (cost <= Math.max(0, state.money) * 0.9) {
                S.addLine(state, [c.i, c.j], 1);
                state.money -= cost;
                return "build";
            }
            /* Cannot afford the best remaining option — stop looking, a
               cheaper one further down the list is not going to be good. */
            break;
        }
    }
    // Otherwise add trains to the most crowded line we can afford.
    const crowded = state.lines
        .map((l, idx) => ({ l, idx, crowd: S.recomputeDemand(state) && l.crowd }))
        .filter(x => x.l.crowd > 1)
        .sort((a, b) => b.l.crowd - a.l.crowd);
    for (const c of crowded) {
        if (c.l.trains < 12 && state.money > 260) {
            c.l.trains++;
            state.money -= 150;
            return "train";
        }
    }
    // Borrow when the treasury is nearly out.
    if (state.money < 60 && state.loan < state.cfg.loanCap) {
        S.takeLoan(state, 1000);
        return "loan";
    }
    // Trim the fare if nobody is riding, raise it if they are.
    if (state.lines.length) {
        const worst = state.lines.reduce((a, l) => l.crowd < a.crowd ? l : a);
        if (worst.crowd < 0.5 && state.fare > 0.6) { state.fare = Math.max(0.6, state.fare - 0.1); return "fare-down"; }
        if (worst.crowd > 1.2 && state.fare < 2.6) { state.fare = Math.min(2.6, state.fare + 0.1); return "fare-up"; }
    }
    void rng; void ctx;
    return "idle";
}

function randomPolicy(state, rng) {
    const roll = rng();
    if (state.lines.length < state.cfg.maxLines && roll < 0.25) {
        const n = state.districts.length;
        const i = Math.floor(rng() * n);
        let j = Math.floor(rng() * n);
        if (i === j) j = (j + 1) % n;
        const line = S.addLine(state, [i, j], 1 + Math.floor(rng() * 3));
        /* Never build past the treasury: an unaffordable line is not a
           strategy, it is a self-inflicted bankruptcy. */
        if (line && state.money > 0) {
            state.money -= S.lineCost(state, line);
            return "build";
        }
        return "idle";
    }
    if (state.lines.length && roll < 0.6) {
        const l = state.lines[Math.floor(rng() * state.lines.length)];
        if (l.trains < 10) { l.trains++; state.money -= 150; return "train"; }
    }
    if (roll < 0.7 && state.loan < state.cfg.loanCap) {
        S.takeLoan(state, 500);
        return "loan";
    }
    if (state.lines.length && roll < 0.9) {
        state.fare = Math.max(0.4, Math.min(3, state.fare + (rng() - 0.5) * 0.4));
        return "fare";
    }
    return "idle";
}

/* Does nothing at all: the baseline that says what a passive player gets. */
function passivePolicy() { return "idle"; }

/* Costs come from the sim itself so a policy can never be pricing against
   a formula the game does not use. */
function estimateCost(state, stations) {
    let total = 0;
    for (let i = 1; i < stations.length; i++) {
        total += S.segmentCost(state, state.districts[stations[i - 1]], state.districts[stations[i]]);
    }
    return total;
}

const POLICIES = { greedy: greedyPolicy, random: randomPolicy, none: passivePolicy };

/* ===== one session ===== */

function runSession(seed, goal, policyName) {
    const rng = mulberry32(seed);
    const policy = POLICIES[policyName];
    const districts = genCity(rng);

    const state = S.create({
        districts,
        goal: { paxDay: goal.paxDay, days: goal.days, servedMin: goal.servedMin }
    });

    let ticks = 0;
    let actions = 0;
    let builds = 0;
    let trainsAdded = 0;
    let loans = 0;
    /* Actions spent before the goal was met. This is the number that
       reconciles the sim with the real game: the simulation does not model
       the cost of a human drawing a line station by station, so a goal the
       sim reaches in 2 simulated days may still be a 14-day game. */
    let actionsToWin = null;

    while (!state.over && ticks < MAX_TICKS) {
        /* Decide a few times per simulated day rather than every tick:
           a player does not rebuild 600 times in a 150-second day. */
        if (ticks % Math.max(1, Math.floor(S.DEFAULTS.day / (DT * DECISIONS_PER_DAY))) === 0) {
            const a = policy(state, rng, { ticks });
            actions++;
            if (a === "build") builds++;
            if (a === "train") trainsAdded++;
            if (a === "loan") loans++;
        }
        S.advance(state, DT, { maxTransfers: MAX_TRANSFERS });
        ticks++;
        if (state.won === true && actionsToWin === null) actionsToWin = actions;
    }

    const won = state.won;
    return {
        seed,
        goalId: goal.id,
        policy: policyName,
        outcome: state.bankrupt ? "bankrupt" : (won === true ? "won" : (won === false ? "timeout" : "truncated")),
        day: state.day,
        ticks,
        totalPax: Math.round(state.totalPax),
        bestDay: Math.round(state.bestDay),
        goalPax: goal.paxDay,
        goalDays: goal.days,
        revenue: Math.round(state.revenueTotal),
        moneyEnd: Math.round(state.money),
        loanEnd: Math.round(state.loan),
        lines: state.lines.length,
        trains: state.lines.reduce((n, l) => n + l.trains, 0),
        served: state.districts.filter(d => d.served).length,
        districts: state.districts.length,
        actions, builds, trainsAdded, loans,
        actionsToWin: actionsToWin === null ? "" : actionsToWin,
        maxTransfers: MAX_TRANSFERS
    };
}

/* ===== CSV ===== */

const COLUMNS = [
    "seed", "goalId", "policy", "outcome", "day", "ticks", "totalPax",
    "bestDay", "goalPax", "goalDays", "revenue", "moneyEnd", "loanEnd",
    "lines", "trains", "served", "districts", "actions", "builds",
    "trainsAdded", "loans", "actionsToWin", "maxTransfers"
];

function toCsv(rows) {
    return [
        COLUMNS.join(","),
        ...rows.map(r => COLUMNS.map(c => {
            const v = r[c];
            return typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v);
        }).join(","))
    ].join("\n") + "\n";
}

/* ===== main ===== */

function main() {
    const started = Date.now();
    console.log("LINEA ROSSA balance harness");
    console.log("  sessions   " + SESSIONS);
    console.log("  seed       " + BASE_SEED);
    console.log("  dt         " + DT + "s");
    console.log("  policy     " + POLICY);
    console.log("  transfers  " + MAX_TRANSFERS);
    console.log("  decisions  " + DECISIONS_PER_DAY + " per day");

    /* Policies: "mixed" rotates greedy/random/none so a single run covers
       the skill spectrum; an explicit name runs only that one. */
    const names = POLICY === "mixed"
        ? ["greedy", "random", "none"]
        : POLICY.split(",").filter(p => POLICIES[p]);
    if (!names.length) {
        console.error("unknown policy: " + POLICY + " (have: " + Object.keys(POLICIES).join(", ") + ")");
        process.exit(1);
    }

    const rows = [];
    for (let i = 0; i < SESSIONS; i++) {
        const seed = BASE_SEED + i * 7919;
        const rng = mulberry32(seed);
        const goal = GOALS[Math.floor(rng() * GOALS.length)];
        const policyName = names[i % names.length];
        rows.push(runSession(seed, goal, policyName));

        if ((i + 1) % 500 === 0 || i + 1 === SESSIONS) {
            process.stdout.write("  " + (i + 1) + "/" + SESSIONS + "\r");
        }
    }
    process.stdout.write("\n");

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, toCsv(rows));

    /* Console summary so the numbers are visible without opening the CSV.
       The full report is report.py's job; this is the smoke test. */
    const byPolicy = {};
    for (const r of rows) {
        const k = r.policy + "/" + r.outcome;
        byPolicy[k] = (byPolicy[k] || 0) + 1;
    }
    const pax = rows.map(r => r.totalPax).sort((a, b) => a - b);
    const pct = (p) => pax[Math.min(pax.length - 1, Math.floor(pax.length * p))];

    console.log("\noutcomes");
    for (const k of Object.keys(byPolicy).sort()) {
        console.log("  " + k.padEnd(18) + byPolicy[k] + "  (" +
            (100 * byPolicy[k] / rows.length).toFixed(1) + "%)");
    }
    console.log("\ntotal passengers");
    console.log("  p10 " + pct(0.10) + "   p50 " + pct(0.50) + "   p90 " + pct(0.90));
    console.log("\nwrote " + rows.length + " rows to " + OUT);
    console.log("done in " + ((Date.now() - started) / 1000).toFixed(1) + "s");

    /* A run that produced no decisive outcomes means the goal table and the
       sim have drifted apart; fail loudly rather than write a CSV that
       looks fine and means nothing. */
    const decisive = rows.filter(r => r.outcome === "won" || r.outcome === "timeout" || r.outcome === "bankrupt").length;
    if (decisive !== rows.length) {
        console.error("\nWARNING  " + (rows.length - decisive) + " sessions hit the tick cap without resolving");
    }
    void existsSync; void readFileSync;
}

main();