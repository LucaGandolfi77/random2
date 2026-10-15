/*
 * Parity + behaviour checks for metro-pwa/sim.js.
 *
 *   node metro-pwa/sim.test.mjs
 *
 * The sim in sim.js is a copy of the rules inside game.js. A copy is only
 * worth having if it stays a copy, so these tests pin the behaviours the
 * balance report depends on. Run them after touching either file.
 *
 * Plain Node, no dependencies, same harness style as mustang-pwa/tests/.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const S = require(resolve(here, "sim.js"));

let failures = 0;
let checks = 0;

function ok(label, condition, detail) {
    checks++;
    if (condition) return;
    failures++;
    console.error("  FAIL  " + label + (detail !== undefined ? " -> " + detail : ""));
}

function near(label, actual, expected, eps = 1e-6) {
    ok(label, Math.abs(actual - expected) <= eps, actual + " != " + expected);
}

function section(name) { console.log("\n" + name); }

function grid() {
    return [
        { id: 0, x: 400, y: 400, pop: 1200, jobs: 900 },
        { id: 1, x: 1000, y: 400, pop: 800, jobs: 1400 },
        { id: 2, x: 400, y: 1000, pop: 900, jobs: 700 },
        { id: 3, x: 1000, y: 1000, pop: 1500, jobs: 1000 }
    ];
}

/* ===== wave shape ===== */

section("commute waves");
near("morning wave is the peak", S.waveMult(0.1), 1.35);
near("midday is quiet", S.waveMult(0.45), 0.7);
near("evening wave matches morning", S.waveMult(0.7), 1.35);
near("night is nearly empty", S.waveMult(0.95), 0.15);
/* The two peaks are symmetric by design; an asymmetry here would silently
   shift revenue toward one end of the day. */
near("morning and evening peaks agree", S.waveMult(0.1), S.waveMult(0.7));

/* ===== fare elasticity ===== */

section("fare elasticity");
near("default fare 1.2", S.fareMult(1.2), 1.48);
ok("fare has a floor", S.fareMult(50) >= 0.25, S.fareMult(50));
ok("very cheap fares stop inflating demand", S.fareMult(0.1) <= 1.8, S.fareMult(0.1));
ok("demand multiplier is monotonically decreasing",
    S.fareMult(0.5) > S.fareMult(1.0) && S.fareMult(1.0) > S.fareMult(2.0),
    [S.fareMult(0.5), S.fareMult(1.0), S.fareMult(2.0)].join(","));

/* ===== gravity ===== */

section("gravity");
const A = { x: 0, y: 0, pop: 1000, jobs: 1000 };
const nearB = { x: 100, y: 0, pop: 1000, jobs: 1000 };
const farB = { x: 1000, y: 0, pop: 1000, jobs: 1000 };
ok("near pairs attract more than far pairs",
    S.gravity(A, nearB, S.DEFAULTS) > S.gravity(A, farB, S.DEFAULTS));
near("gravity is symmetric",
    S.gravity(A, nearB, S.DEFAULTS), S.gravity(nearB, A, S.DEFAULTS));
ok("zero-population pair has no gravity",
    S.gravity({ x: 0, y: 0, pop: 0, jobs: 0 }, nearB, S.DEFAULTS) === 0);

/* ===== routing ===== */

section("routing");
{
    /* Two parallel lines with no shared station: 1 and 3 are connected
       within a line, 1 and 2 need an interchange. */
    const st = S.create({ districts: grid() });
    S.addLine(st, [0, 1], 1);
    S.addLine(st, [2, 3], 1);
    const direct = S.routeSearch(st, 0, 1, 2);
    ok("direct pair routes with 0 transfers", direct && direct.transfers === 0,
        JSON.stringify(direct));
    const cross = S.routeSearch(st, 0, 2, 2);
    /* No shared district exists, so this pair must be unreachable at any
       transfer budget: the search must return null, not invent a route. */
    ok("unconnected pair does not route", cross === null, JSON.stringify(cross));
}
{
    const st = S.create({ districts: grid() });
    S.addLine(st, [0, 1], 1);
    S.addLine(st, [1, 2], 1);
    S.addLine(st, [2, 3], 1);
    const r = S.routeSearch(st, 0, 3, 2);
    ok("three-hop chain routes within 2 transfers", r !== null, JSON.stringify(r));
    ok("chain uses all three lines", r && r.lines.length === 3, JSON.stringify(r));
    ok("chain reports 2 transfers", r && r.transfers === 2, JSON.stringify(r));
    const r0 = S.routeSearch(st, 0, 3, 0);
    ok("zero-transfer budget blocks the chain", r0 === null, JSON.stringify(r0));
}
{
    /* No district is served: demand must be zero, not a crash. */
    const st = S.create({ districts: grid() });
    near("no lines means no demand", S.recomputeDemand(st), 0);
}

/* ===== capacity and crowding ===== */

section("capacity");
{
    const st = S.create({ districts: grid() });
    const line = S.addLine(st, [0, 1], 1);
    ok("line has geometry", line.len > 0, line.len);
    S.recomputeDemand(st);
    ok("capacity is positive", line.cap > 0, line.cap);
    near("ratio is 1 when idle", line.ratio, 1);

    st.lines[0].trains = 20;
    S.recomputeDemand(st);
    const ratioMany = st.lines[0].ratio;
    st.lines[0].trains = 1;
    S.recomputeDemand(st);
    ok("more trains means better served ratio",
        ratioMany >= st.lines[0].ratio,
        ratioMany + " vs " + st.lines[0].ratio);
}
{
    const st = S.create({ districts: grid() });
    const line = S.addLine(st, [0, 1], 1);
    S.recomputeDemand(st);
    const cap = line.cap;
    st.cfg.trainSpeed *= 2;
    S.recomputeDemand(st);
    ok("faster trains raise capacity", line.cap > cap, line.cap + " vs " + cap);
}
{
    const st = S.create({ districts: grid() });
    const line = S.addLine(st, [0, 1], 1);
    ok("line cost is positive", S.lineCost(st, line) > 0, S.lineCost(st, line));
    st.addLineBlocked = true;
    st.cfg.maxLines = 1;
    ok("line cap enforced", S.addLine(st, [2, 3], 1) === null);
    ok("single-station line rejected", S.addLine(st, [0], 1) === null);
}

/* ===== economy ===== */

section("economy");
{
    const st = S.create({ districts: grid(), money: 1000 });
    S.addLine(st, [0, 1], 2);
    const before = st.money;
    S.revenueTick(st, 150);
    ok("a day of fare revenue raises money", st.money > before, st.money + " vs " + before);
    ok("passengers are counted", st.totalPax > 0, st.totalPax);
}
{
    /* Upkeep must bite: a city with lines but no demand loses money. */
    const st = S.create({ districts: grid(), money: 1000 });
    S.addLine(st, [0, 1], 30);   // heavily over-provisioned, nearly no demand
    S.recomputeDemand(st);
    const before = st.money;
    S.economyTick(st, 150);
    ok("over-provisioned network loses money", st.money < before,
        st.money + " vs " + before);
}
{
    const st = S.create({ districts: grid(), money: 100 });
    st.loan = 1000;
    const before = st.money;
    S.economyTick(st, 150);
    ok("interest is charged on the loan", st.money < before, st.money + " vs " + before);
    ok("loan principal grows with interest", st.loan > 1000, st.loan);
}
{
    const st = S.create({ districts: grid(), money: 500, loanCap: 5000 });
    const got = S.takeLoan(st, 2000);
    near("loan adds cash", got, 2000);
    ok("money rose by the loan", st.money === 2500, st.money);
    const more = S.takeLoan(st, 99999);
    ok("loan respects the cap", st.loan === 5000, st.loan);
    ok("over-cap request is clipped", more === 3000, more);
}
{
    const st = S.create({ districts: grid(), money: 500 });
    st.loan = 300;
    const paid = S.repayLoan(st, 100);
    near("repayment moves cash to debt", paid, 100);
    ok("debt fell", st.loan === 200, st.loan);
    ok("repayment cannot overdraw",
        S.repayLoan(Object.assign(st, { money: 10 }), 9999) === 10);
}

/* ===== bankruptcy ===== */

section("bankruptcy");
{
    const st = S.create({ districts: grid(), money: -500 });
    S.economyTick(st, 10);
    ok("bankruptcy triggers below the threshold", st.over && st.bankrupt,
        JSON.stringify({ over: st.over, bankrupt: st.bankrupt }));
}
{
    const st = S.create({ districts: grid(), money: -399 });
    S.economyTick(st, 0.1);
    ok("just above the threshold survives", !st.bankrupt);
}

/* ===== growth feedback ===== */

section("growth");
{
    /* The core loop: a served, uncrowded district must grow, an unserved
       one must bleed. If this inverts, the whole tycoon is broken. */
    const st = S.create({ districts: grid() });
    S.addLine(st, [0, 1], 40);
    S.recomputeDemand(st);
    const served = st.districts[0];
    const unserved = st.districts[3];
    const servedPop = served.pop, unservedPop = unserved.pop;
    for (let i = 0; i < 40; i++) S.dayRollover(st);
    ok("served district grows", served.pop > servedPop,
        servedPop + " -> " + served.pop);
    ok("unserved district shrinks", unserved.pop < unservedPop,
        unservedPop + " -> " + unserved.pop);
    ok("bestDay tracks the peak day", st.bestDay > 0, st.bestDay);
}

/* ===== goals ===== */

section("goals");
{
    const st = S.create({ districts: grid(), goal: { paxDay: 10, days: 14 } });
    S.addLine(st, [0, 1], 2);
    /* advance() owns day rollover and goal adjudication, so the harness
       just ticks it — which is the property these tests exist to pin. */
    let i = 0;
    while (!st.over && i < 200) { S.advance(st, 150); i++; }
    ok("an achievable goal is met", st.won === true, JSON.stringify({ won: st.won, day: st.day }));
}
{
    /* An impossible target must resolve to a loss once days run out, not
       leave the run hanging as an undecided draw. */
    const st = S.create({ districts: grid(), goal: { paxDay: 1e9, days: 3 } });
    S.addLine(st, [0, 1], 2);
    let i = 0;
    while (!st.over && i < 100) { S.advance(st, 150); i++; }
    ok("an impossible goal ends the run", st.over, JSON.stringify({ over: st.over }));
    ok("an impossible goal is not a win", st.won === false, JSON.stringify(st.won));
}
{
    /* A goal already satisfied at creation must be won, not pending. */
    const st = S.create({ districts: grid(), goal: { paxDay: 0, days: 14 } });
    ok("trivially-met goal resolves immediately", S.goalReached(st) === true,
        JSON.stringify(S.goalReached(st)));
}
{
    const st = S.create({ districts: grid(), goal: { paxDay: 5000, days: 14, servedMin: 99 } });
    S.addLine(st, [0, 1], 2);
    ok("servedMin is enforced", S.goalReached(st) === null, JSON.stringify(S.goalReached(st)));
}

/* ===== a full session terminates ===== */

section("session");
{
    const st = S.create({
        districts: grid(),
        goal: { paxDay: 4000, days: 14, servedMin: 4 }
    });
    S.addLine(st, [0, 1], 2);
    S.addLine(st, [2, 3], 2);
    let ticks = 0;
    while (!st.over && ticks < 100000) {
        S.advance(st, 5);
        ticks++;
    }
    ok("a session always terminates", st.over, ticks + " ticks");
    ok("termination is well inside the tick budget", ticks < 20000, ticks);
    ok("no NaN leaked into money", Number.isFinite(st.money), st.money);
    ok("no NaN leaked into totalPax", Number.isFinite(st.totalPax), st.totalPax);
}

console.log("\n" + (failures ? "FAILED" : "OK") + "  " + (checks - failures) + "/" + checks + " checks");
if (failures) process.exit(1);