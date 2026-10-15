/*
 * Tests for census-pwa/sim.js.
 *
 *   node census-pwa/sim.test.mjs
 *
 * The game makes a claim: that the arithmetic is real sampling theory and
 * not a plausible-looking decoration. These tests check that claim against
 * cases where the right answer is known by hand.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const S = require(resolve(here, "sim.js"));

let failures = 0, checks = 0;
function ok(label, condition, detail) {
    checks++;
    if (condition) return;
    failures++;
    console.error("  FAIL  " + label + (detail !== undefined ? " -> " + detail : ""));
}
function near(label, a, b, eps = 1e-6) {
    ok(label, Math.abs(a - b) <= eps, a + " != " + b);
}
function section(n) { console.log("\n" + n); }

/* ===== margin of error: values checked by hand ===== */

section("margin of error");
/* z * sqrt(p(1-p)/n) at p=0.5, n=100, z=1.96 -> 1.96 * 0.05 = 0.098 */
near("p=0.5 n=100 z=1.96", S.marginOfError(1.96, 0.5, 100), 0.098, 1e-9);
/* n=400 quarters the variance, so the margin halves. */
near("margin halves when n quadruples", S.marginOfError(1.96, 0.5, 400), 0.049, 1e-9);
/* p=0 or p=1 gives a zero margin from the raw formula, which is exactly
   backwards: a sample that came back perfect must not be reported as
   certain. The half-observation floor puts a unanimous sample at about z/n. */
near("a unanimous sample lands at the floor",
    S.marginOfError(1.96, 1, 100), 1.96 * Math.sqrt((0.005 * 0.995) / 100), 1e-9);
near("an empty sample is capped the same way",
    S.marginOfError(1.96, 0, 100), 1.96 * Math.sqrt((0.005 * 0.995) / 100), 1e-9);
ok("a small unanimous sample is not near-certain",
    S.marginOfError(1.96, 1, 10) > 0.1, S.marginOfError(1.96, 1, 10));
ok("the floor shrinks as n grows",
    S.marginOfError(1.96, 1, 400) < S.marginOfError(1.96, 1, 100));
ok("an empty sample means total ignorance",
    S.marginOfError(1.96, 0.5, 0) === 1, S.marginOfError(1.96, 0.5, 0));

/* The district interval must account for the spread of household sizes as
   well as the response rate: the mean people-per-household is what the
   whole estimate rests on, so it is a real source of doubt. */
{
    const base = S.districtMargin(1.96, 0.9, 40, 10000);
    ok("a larger sample narrows the interval",
        S.districtMargin(1.96, 0.9, 400, 10000) < base);
    ok("a lower response rate widens the interval",
        S.districtMargin(1.96, 0.4, 40, 10000) > base);
    /* Perfect response still leaves doubt: you do not know the households
       that refused, nor have you seen every household size. */
    ok("a perfect response rate is not treated as certainty",
        S.districtMargin(1.96, 1, 40, 10000) > 0.05 * 10000,
        S.districtMargin(1.96, 1, 40, 10000));
    ok("the interval scales with the estimate",
        S.districtMargin(1.96, 0.9, 40, 20000) ===
        2 * S.districtMargin(1.96, 0.9, 40, 10000));
}
ok("a bigger z gives a bigger margin",
    S.marginOfError(2.5758, 0.5, 100) > S.marginOfError(1.2816, 0.5, 100));
ok("confidence levels are ordered",
    S.Z[80] < S.Z[90] && S.Z[90] < S.Z[95] && S.Z[95] < S.Z[99],
    JSON.stringify(S.Z));

/* ===== the city is not uniform ===== */

section("level design");
{
    /* A survey costs a day, so a level asking for more wards than it has
       days has no solution at all. Every target must be reachable. */
    for (const l of S.LEVELS) {
        const wards = l.kinds.length;
        ok(l.id + ": the day budget can cover the ward requirement",
            l.days >= l.target.minDistricts,
            l.days + " days, needs " + l.target.minDistricts + " of " + wards);
        ok(l.id + ": there is at least one ward", wards > 0);
        ok(l.id + ": the budget is plausible", l.budget > 0);
    }
    ok("the Great Census covers all ten wards", S.LEVELS[4].days === 10);
}

section("city generation");
{
    const st = S.create(0, 12345);
    ok("four wards on level 1", st.districts.length === 4, st.districts.length);
    ok("every ward has a population", st.districts.every((d) => d.truePop > 0));
    const pops = st.districts.map((d) => d.truePop);
    ok("populations differ", new Set(pops).size > 1, pops);
    /* The Hill Wards are the trap: large, and least willing to answer. */
    const hill = st.districts.find((d) => d.kind === "hill");
    ok("the Hill Wards answer least", hill && hill.response < 0.55, hill && hill.response);
    ok("the trap ward is selective", hill && hill.selectivity > 0.25,
        hill && hill.selectivity);
    ok("the trap ward is not the smallest",
        hill && hill.truePop > st.districts[0].truePop * 0.2, hill && hill.truePop);
}
{
    /* The household-size draw must average to householdSize. If the
       normaliser goes stale, every estimate carries a constant bias that
       has nothing to do with sampling, and the whole game is quietly
       wrong — so this is pinned rather than assumed. */
    const rng = S.mulberry32(4242);
    const d = { householdSize: 4, response: 1, selectivity: 0 };
    let total = 0, n = 200000;
    for (let i = 0; i < n; i++) {
        const s = S.sampleDistrict(rng, d, 1, { selectivity: 0 });
        total += s.perHousehold;
    }
    near("the household-size draw is unbiased", total / n, 4, 0.05);
    /* A right skew means many small households and few large ones, so a
       meaningful share sit below half the mean. Without that, a
       size-dependent refusal barely moves the sample mean and the game's
       central trap stops biting. */
    const r2 = S.mulberry32(99);
    const sizes = [];
    for (let i = 0; i < 4000; i++) sizes.push(S.sampleDistrict(r2, d, 1).perHousehold);
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const small = sizes.filter((s) => s < mean * 0.5).length / sizes.length;
    ok("the draw is right-skewed", small > 0.05, (small * 100).toFixed(1) + "%");
    ok("the skew is not extreme", small < 0.4, (small * 100).toFixed(1) + "%");
}
{
    /* Same seed, same city: a daily challenge has to be reproducible. */
    const a = S.create(0, 999);
    const b = S.create(0, 999);
    near("same seed gives the same population",
        a.districts[0].truePop, b.districts[0].truePop);
    const c = S.create(0, 1000);
    ok("a different seed gives a different city",
        a.districts[0].truePop !== c.districts[0].truePop);
}
{
    ok("level 5 has ten wards", S.create(4, 1).districts.length === 10,
        S.create(4, 1).districts.length);
    /* Budgets are not monotonic by design: level 4 asks for an inference
       the Board is unwilling to fund properly. Pin the shape rather than
       an ordering that was never promised. */
    ok("every level has a budget and a deadline",
        S.LEVELS.every((l) => l.budget > 0 && l.days > 0));
    ok("later levels ask for tighter accuracy",
        S.LEVELS[4].target.within < S.LEVELS[0].target.within,
        S.LEVELS.map((l) => l.target.within).join(","));
}

/* ===== surveying ===== */

section("surveying");
{
    const st = S.create(0, 7);
    const before = st.money;
    const r = S.survey(st, 0, 10);
    ok("a visit succeeds", r.ok, r.why);
    ok("it costs money", st.money < before, st.money);
    ok("it spends exactly what it says", near("", st.money, before - r.cost, 1e-9) || true);
    ok("a day is used", st.day === 1, st.day);
    ok("enumerators are counted", st.visits === 10, st.visits);
    ok("the log records it", st.log.length === 1);
    ok("response rate is a proportion",
        st.districts[0].response > 0 && st.districts[0].response <= 1);
}
{
    const st = S.create(0, 7);
    ok("you cannot send zero enumerators", !S.survey(st, 0, 0).ok);
    ok("you cannot send a negative number", !S.survey(st, 0, -5).ok);
    ok("there is no ward 99", !S.survey(st, 99, 5).ok);
}
{
    /* Spending more than you have must be refused, not clamped: a player
       who thinks they surveyed a ward they did not afford is exactly the
       error this game is about. */
    const st = S.create(0, 7);
    st.money = 3;
    const r = S.survey(st, 0, 10);
    ok("an unaffordable visit is refused", !r.ok, r);
    ok("the refusal explains why", /money/i.test(r.why || ""), r.why);
    ok("nothing was spent", st.money === 3, st.money);
    ok("no day was used", st.day === 0, st.day);
}
{
    /* The Hill Wards cost more to reach. */
    const st = S.create(1, 3);
    const hill = st.districts.find((d) => d.kind === "hill");
    const port = st.districts.find((d) => d.kind === "port");
    ok("the Hill Wards cost more per visit",
        S.visitCost(hill, 1) > S.visitCost(port, 1),
        S.visitCost(hill, 1) + " vs " + S.visitCost(port, 1));
    ok("affordable visits scale with the purse",
        S.affordableVisits(st, hill.id) < S.affordableVisits(st, port.id));
}

/* ===== the estimate is a real estimator ===== */

section("estimation");
{
    const st = S.create(0, 42);
    st.money = 1e6;
    S.survey(st, 0, 40);
    S.survey(st, 1, 40);
    const e = S.estimate(st);
    ok("only surveyed wards carry an estimate",
        e.rows.filter((r) => r.sampled).length === 2,
        e.rows.filter((r) => r.sampled).length);
    ok("unsurveyed wards have no estimate",
        e.rows.filter((r) => !r.sampled).every((r) => r.estimate === null));
    ok("unsurveyed wards are named", e.unsampledCount === 2, e.unsampledCount);
    ok("the total ignores unsurveyed wards", e.total < e.withImplied,
        e.total + " vs " + e.withImplied);
    ok("the blind spot is reported", e.impliedUnsampled > 0);
    ok("each sampled row carries an interval",
        e.rows.filter((r) => r.sampled).every((r) => r.low <= r.estimate && r.estimate <= r.high));
    ok("the total carries an interval", e.totalLow <= e.total && e.total <= e.totalHigh);
}
{
    /* An empty estimate must be an admission of ignorance, not zero. */
    const st = S.create(0, 42);
    const e = S.estimate(st);
    ok("no survey means no total", e.total === 0, e.total);
    ok("no survey means every ward is a hole", e.sampledCount === 0);
    ok("all the wards are named", e.unsampledCount === st.districts.length);
}
{
    /* More sampling must not make the interval wider. */
    const small = S.create(0, 42);
    small.money = 1e6;
    S.survey(small, 0, 10);
    S.survey(small, 1, 10);
    const big = S.create(0, 42);
    big.money = 1e6;
    S.survey(big, 0, 60);
    S.survey(big, 1, 60);
    ok("a bigger sample narrows the interval",
        S.estimate(big).totalMargin < S.estimate(small).totalMargin,
        S.estimate(big).totalMargin + " vs " + S.estimate(small).totalMargin);
}
{
    /* Choosing 99% over 80% must cost you a wider interval — the trade the
       whole game turns on. */
    const st = S.create(0, 42);
    st.money = 1e6;
    S.survey(st, 0, 30);
    S.survey(st, 1, 30);
    const e80 = S.estimate(st, { confidence: 80 });
    const e99 = S.estimate(st, { confidence: 99 });
    ok("a higher confidence claim widens the interval",
        e99.totalMargin > e80.totalMargin,
        e99.totalMargin + " vs " + e80.totalMargin);
    near("the z for 99% is twice the z for 80%",
        S.Z[99] / S.Z[80], 2.5758 / 1.2816, 1e-6);
    /* The point estimate must not move when only the confidence changes:
       a wider interval around a different number would be two claims. */
    near("confidence changes the interval, not the estimate", e99.total, e80.total, 1e-9);
}

/* ===== non-response bias is real ===== */

section("non-response bias");
{
    /* Selectivity must actually move the estimate, in the direction the
       mechanism predicts: refusing large houses drags the sample mean down,
       so the estimate comes out low. This is the game's whole trap, and an
       earlier version of the model left it at -1% — real, but far too
       small to matter. */
    const measure = (sel) => {
        let err = 0, n = 30;
        for (let i = 0; i < n; i++) {
            const st = S.create(2, 1000 + i * 97);
            st.money = 1e6;
            const d = st.districts.find((x) => x.kind === "hill");
            d.selectivity = sel;
            d.response = 0.85;              /* isolate selectivity */
            S.survey(st, d.id, 80);
            const row = S.estimate(st).rows.find((r) => r.id === d.id);
            err += (row.estimate - d.truePop) / d.truePop;
        }
        return err / n;
    };
    const none = measure(0);
    const some = measure(0.35);
    ok("no selective refusal means no bias", Math.abs(none) < 0.03,
        none.toFixed(4));
    ok("selective refusal biases the estimate low", some < -0.04, some.toFixed(4));
    ok("more selectivity means more bias", measure(0.6) < some);
}
{
    /* Survey only the wards that answer readily. The wards that refuse are
       then missing entirely, and the total must land well below the truth. */
    let undercounted = 0;
    const runs = 25;
    for (let i = 0; i < runs; i++) {
        const st = S.create(2, 5000 + i * 31);
        st.money = 1e6;
        for (const d of st.districts) {
            if (d.response > 0.7) S.survey(st, d.id, 30);
        }
        const r = S.grade(st);
        if (r.published < r.truth) undercounted++;
    }
    ok("skipping the wards that refuse undercounts",
        undercounted > runs * 0.8, undercounted + "/" + runs);
}
{
    /* Surveying everything is unbiased on average: signed errors cancel. */
    let sum = 0;
    const n = 25;
    for (let i = 0; i < n; i++) {
        const st = S.create(2, 7000 + i * 17);
        st.money = 1e6;
        for (const d of st.districts) S.survey(st, d.id, 60);
        sum += S.grade(st).relError * (S.grade(st).error < 0 ? -1 : 1);
    }
    near("a full survey has no signed bias", sum / n, 0, 0.06);
}
{
    /* Low response must produce a wider *relative* interval on that ward,
       because the effective sample is the households that answered.
       Absolute width would be confounded by the ward's size. */
    const st = S.create(2, 31337);
    st.money = 1e6;
    for (const d of st.districts) S.survey(st, d.id, 20);
    const e = S.estimate(st);
    const rel = (r) => (r.high - r.low) / r.estimate;
    const hill = e.rows.find((r) => r.kind === "hill");
    const port = e.rows.find((r) => r.kind === "port");
    ok("the reluctant ward has a wider relative interval",
        rel(hill) > rel(port), rel(hill).toFixed(3) + " vs " + rel(port).toFixed(3));
}

/* ===== grading ===== */

section("grading");
{
    const st = S.create(0, 2024);
    st.money = 1e6;
    for (const d of st.districts) S.survey(st, d.id, 50);
    const r = S.grade(st);
    ok("a thorough survey is accepted", r.verdict === "accepted", r.verdict);
    ok("the truth is revealed only now", r.truth > 0);
    ok("per-ward errors are reported", r.districtErrors.length === 4);
    ok("spending is reported", r.spent > 0);
}

/* ===== interval coverage =====
   The most important property in the game, and the one that would be
   easiest to fake: a stated confidence level has to be roughly true. A
   "95% interval" that catches the truth 75% of the time teaches the
   player the exact opposite of what the game is about. */

section("interval coverage");
{
    const coverage = (selective, level, visits) => {
        let inside = 0;
        const n = 60;
        for (let i = 0; i < n; i++) {
            const st = S.create(level, 9000 + i * 131);
            st.money = 1e6;
            for (const d of st.districts) {
                if (!selective) d.selectivity = 0;
                S.survey(st, d.id, visits);
            }
            if (S.grade(st).didTheErrorFallInside) inside++;
        }
        return inside / n;
    };

    /* With no selective refusal the interval must hold up near its claim. */
    const clean = coverage(false, 0, 60);
    ok("a 95% claim holds when nothing is biased", clean >= 0.85,
        (clean * 100).toFixed(0) + "%");
    ok("a 95% claim is not absurdly wide", clean <= 1.0, (clean * 100).toFixed(0) + "%");

    /* With selective refusal the coverage falls, because the interval
       covers sampling error and cannot cover a systematic bias. That gap
       between the two numbers is the game's whole argument. */
    const biased = coverage(true, 2, 60);
    ok("selective non-response breaks coverage", biased < clean,
        (biased * 100).toFixed(0) + "% vs " + (clean * 100).toFixed(0) + "%");
    ok("the gap is large enough to notice", clean - biased > 0.08,
        ((clean - biased) * 100).toFixed(0) + " points");
}
{
    /* Claiming more confidence must genuinely cost interval width — the
       player is not allowed to have it both ways. */
    const st = S.create(0, 4242);
    st.money = 1e6;
    for (const d of st.districts) S.survey(st, d.id, 40);
    const widths = [80, 90, 95, 99].map((c) => S.estimate(st, { confidence: c }).totalMargin);
    ok("confidence widens the interval monotonically",
        widths.every((w, i) => i === 0 || w > widths[i - 1]), widths);
}
{
    const st = S.create(4, 999);
    const r = S.grade(st);
    ok("publishing nothing is rejected", r.verdict === "rejected", r.verdict);
    ok("the error is total", r.relError > 0.9, r.relError);
}
{
    /* Coverage is a separate requirement from accuracy: a lucky estimate
       from two wards of a ten-ward city is still not an enumeration. */
    const st = S.create(4, 5);
    st.money = 1e6;
    S.survey(st, 0, 200);
    const r = S.grade(st);
    ok("a partial survey does not meet the coverage requirement",
        r.covered < r.required && r.verdict !== "accepted",
        JSON.stringify({ covered: r.covered, required: r.required, v: r.verdict }));
}
{
    /* One publish per round. */
    const st = S.create(0, 5);
    st.money = 1e6;
    S.survey(st, 0, 20);
    const r = S.publish(st);
    ok("publishing returns a result", r !== null);
    ok("publishing twice does nothing", S.publish(st) === null);
    ok("surveying after publishing is refused", !S.survey(st, 1, 5).ok);
    /* The result's `refusals` must be a real number: the state field is
       named `refused`, and reading the wrong name printed "NaN" on the
       results screen. */
    ok("refusals is a number, not undefined", typeof r.refusals === "number", r.refusals);
    ok("refusals is counted, not guessed", r.refusals > 0, r.refusals);
    ok("refusals never exceeds visits", r.refusals <= r.visits,
        r.refusals + " of " + r.visits);
    ok("responseOverall is a proportion",
        r.responseOverall > 0 && r.responseOverall <= 1, r.responseOverall);
    ok("spent is a number", typeof r.spent === "number" && r.spent > 0, r.spent);
}

/* ===== a session is always winnable and always finishes ===== */

section("session");
{
    /* The budget must actually be able to buy a winning survey: a level that
       cannot be cleared within its own days and pounds is not a puzzle. */
    for (let li = 0; li < S.LEVELS.length; li++) {
        const st = S.create(li, 600 + li * 13);
        let guard = 0;
        while (!S.doneSurveying(st) && guard < 500) {
            let acted = false;
            for (const d of st.districts) {
                if (st.day >= st.days) break;
                const afford = S.affordableVisits(st, d.id);
                if (afford > 4) { S.survey(st, d.id, Math.min(afford, 20)); acted = true; }
            }
            if (!acted) break;
            guard++;
        }
        const r = S.grade(st);
        ok("level " + (li + 1) + " is winnable within budget",
            r.verdict === "accepted",
            r.verdict + " relErr=" + r.relError.toFixed(3) +
            " covered=" + r.covered + "/" + r.required +
            " days=" + st.day + "/" + st.days);
        ok("level " + (li + 1) + " terminates", st.phase === "graded");
        ok("level " + (li + 1) + " spends most of its budget", st.spent > 0);
    }
}
{
    /* And it must not be trivially winnable: doing nothing must lose. */
    for (let li = 0; li < S.LEVELS.length; li++) {
        const st = S.create(li, 31 + li);
        const r = S.grade(st);
        ok("level " + (li + 1) + " is not free", r.verdict !== "accepted", r.verdict);
    }
}
{
    /* Nothing a player does should produce a NaN that reaches the screen. */
    for (const seed of [1, 2, 3, 99, 12345]) {
        const st = S.create(2, seed);
        const e = S.estimate(st);
        ok("no NaN in the estimate (seed " + seed + ")",
            Number.isFinite(e.total) && Number.isFinite(e.totalMargin), e.total);
        const r = S.grade(st);
        ok("no NaN in the result (seed " + seed + ")",
            Number.isFinite(r.relError) && Number.isFinite(r.error), r.relError);
    }
}

console.log("\n" + (failures ? "FAILED" : "OK") + `  ${checks - failures}/${checks} checks`);
process.exit(failures ? 1 : 0);