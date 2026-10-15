/*
 * CENSUS — the sampling engine
 * ----------------------------
 * Everything statistical in the game lives here, with no DOM and no drawing.
 *
 * The point of the game is that the arithmetic is real: the player spends a
 * finite budget of enumerators across a city whose true population they
 * never see, and every estimate they publish is computed with the actual
 * sampling formulae rather than a plausible-looking fudge. If the numbers
 * are honest then the pressure the game applies to the player — publish
 * early for budget and credibility, publish late for accuracy — is a real
 * trade-off, and the lesson lands instead of being decorative.
 *
 * Kept separate from rendering so it can be tested directly:
 *   node census-pwa/sim.test.mjs
 */
(function (root) {
  "use strict";

  /* ===== the statistics, written once =====
     These are the textbook formulae. They are not approximations chosen
     because they flatter the game: the margin of error a player sees is
     the same one a statistician would compute from the same sample. */

  /* Normaliser for the household-size draw below. The draw is u^0.55 over
   uniform u, whose mean is 1/1.55, so multiplying by 1.55 makes the mean
   exactly householdSize. The exact constant is (exponent + 1).
   sim.test.mjs pins the mean, so a stale constant fails the suite rather
   than quietly biasing every estimate in the game. */
var SKEW_NORM = 1.55;

  /* Standard normal quantiles at 80%, 90%, 95%, 99% two-sided coverage.
     A larger z means a more confident claim and a wider interval — the
     player pays for precision in the same currency they spend on
     enumerators, which is the trade-off the game is built on. */
  var Z = { 80: 1.2816, 90: 1.6449, 95: 1.9600, 99: 2.5758 };

  /*
   * Margin of error on a proportion: z * sqrt(p(1-p)/n).
   *
   * p is clamped away from 0 and 1 by half an observation. A sample that
   * came back 10 of 10 must not be reported as almost certain: p(1-p) is
   * zero at the boundary, so the raw formula says a perfect sample proves
   * everything. With the floor, a unanimous sample of n lands at about
   * z/n — still generous, still finite, and shrinking honestly as n grows.
   */
  function marginOfError(z, p, n) {
    if (!n || n < 1) return 1;       /* nothing sampled: total ignorance */
    var eps = 0.5 / n;
    var pp = Math.min(1 - eps, Math.max(eps, p));
    return z * Math.sqrt((pp * (1 - pp)) / n);
  }

  /*
   * The interval on a district estimate has to cover two independent
   * sources of doubt, or it will under-cover and the Board will reject
   * returns that were in fact right:
   *
   *   1. the response rate (marginOfError above), and
   *   2. the spread of household sizes — ten answered households could all
   *      be large ones, and the mean people-per-household is what the whole
   *      estimate rests on.
   *
   * Added in quadrature, as independent variances are. The second term is a
   * coefficient of variation, so it is scale-free: a ward of four-person
   * and a ward of two-person households carry the same relative doubt.
   * 0.2449 is the CV of the u^0.55 size draw.
   */
  var HH_CV = 0.2449;

  function districtMargin(z, response, answered, estimate) {
    var fromResponse = marginOfError(z, response, answered);
    var fromSizes = HH_CV / Math.sqrt(Math.max(1, answered));
    return estimate * Math.sqrt(fromResponse * fromResponse + fromSizes * fromSizes);
  }

  /*
   * Simple random sampling with non-response.
   *
   * The subtlety that makes this game work: non-response is only a problem
   * when it is *selective*. If the households that refuse look like the ones
   * that answer, dividing nothing out gives an unbiased estimate, and the
   * response rate merely costs you precision.
   *
   * So refusal here depends on how big the household is. A district whose
   * large houses are reluctant — which is what "the Hill Wards" means — hands
   * you a sample whose mean household size sits below the truth, and the
   * population estimate comes out low by a predictable amount. That is
   * non-response bias, correctly signed, and more enumerators sent into that
   * district will not remove it while the bias is there.
   */
  function sampleDistrict(rng, district, n, opts) {
    opts = opts || {};
    /* How strongly refusal tracks household size in this district. High for
       the wealthy wards, near zero for the ones that answer everyone. */
    var selectivity = opts.selectivity != null
      ? opts.selectivity
      : (district.selectivity != null ? district.selectivity : 0);

    var counted = 0;
    var answered = 0;
    for (var i = 0; i < n; i++) {
      /* Household size at the door: u^0.55, a right-skewed draw with many small
         households and a tail of large ones. Real household sizes look like
         this, and the skew is what gives the game its central trap. Against
         a uniform draw a size-dependent refusal moves the sample mean by
         about one percent — real, but far too small to be worth a game.
         With a right tail, the households that refuse are systematically
         the big ones, and the bias arrives with a sign the player can be
         shown. */
      var size = district.householdSize * SKEW_NORM * Math.pow(rng(), 0.55);
      /* Size relative to the district mean, centred on 1. */
      var rel = district.householdSize ? size / district.householdSize : 1;
      /* Willingness falls as the household grows, by the district's
         selectivity. */
      var p = clamp01(district.response - selectivity * (rel - 1));
      if (rng() < p) {
        answered++;
        counted += size;
      }
    }

    return {
      visited: n,
      answered: answered,
      counted: Math.round(counted),
      responseRate: n ? answered / n : 0,
      /* Per-household mean among those who answered. This is what the ratio
         estimator extrapolates, and the one thing an enumerator would
         actually write on a return: "4.8 people per house". */
      perHousehold: answered ? counted / answered : 0
    };
  }

  /* ===== helpers ===== */

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* mulberry32, matching shared/arcade.js so a seed is reproducible across
     the hub, the games and this file. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /*
   * Draw a true district population. Districts are deliberately *not*
   * uniform: the harbour is huge and poor, the Old Town small and dense,
   * and the wealthy Hill wards small in number but individually large and
   * unwilling to answer. A uniform city would make every sampling strategy
   * equally good and there would be no game.
   */
  function makeCity(rng, level) {
    var kinds = level.kinds;
    var districts = [];
    for (var i = 0; i < kinds.length; i++) {
      var k = kinds[i];
      var pop = Math.round(k.pop * level.popScale * (0.8 + rng() * 0.4));
      districts.push({
        id: i,
        name: k.name,
        kind: k.kind,
        truePop: pop,
        trueHouseholds: Math.round(pop / k.householdSize),
        householdSize: k.householdSize,
        /* Baseline willingness to answer the door. */
        response: k.response,
        /* How much refusal tracks household size. The Hill wards are high
           on purpose: that is the whole trap. */
        selectivity: k.selectivity,
        colour: k.colour
      });
    }
    return districts;
  }

  var KINDS = {
    port:    { kind: "port",    name: "Harbour",        pop: 9400, householdSize: 5.2, response: 0.90, selectivity: 0.04, colour: "#3a6ea5" },
    works:   { kind: "works",   name: "The Works",      pop: 6100, householdSize: 4.6, response: 0.86, selectivity: 0.06, colour: "#8a5a2b" },
    market:  { kind: "market",  name: "Market Ward",    pop: 4800, householdSize: 4.1, response: 0.93, selectivity: 0.02, colour: "#c08a2b" },
    old:     { kind: "old",     name: "Old Town",       pop: 2900, householdSize: 3.4, response: 0.88, selectivity: 0.05, colour: "#8a3b3b" },
    mill:    { kind: "mill",    name: "Mill Quarter",   pop: 5200, householdSize: 5.0, response: 0.76, selectivity: 0.14, colour: "#5a5a6a" },
    /* The Hill Wards are the trap: large households, and refusal that rises
       sharply with size. A sample from here reads low, and no amount of
       re-knocking fixes it while the bias is in the bias. */
    hill:    { kind: "hill",    name: "Hill Wards",     pop: 3600, householdSize: 4.2, response: 0.46, selectivity: 0.34, colour: "#4a6a4a" },
    college: { kind: "college", name: "College Hill",   pop: 2100, householdSize: 2.8, response: 0.58, selectivity: 0.26, colour: "#6a4a8a" },
    common:  { kind: "common",  name: "The Commons",    pop: 4400, householdSize: 4.3, response: 0.91, selectivity: 0.03, colour: "#4a8a6a" },
    wharf:   { kind: "wharf",   name: "North Wharf",    pop: 3900, householdSize: 5.1, response: 0.84, selectivity: 0.08, colour: "#2b6a8a" },
    /* The Refuge has small households that refuse more often, which biases
       the opposite way: skip it and your city total comes out high. */
    asylum:  { kind: "asylum",  name: "The Refuge",     pop: 1400, householdSize: 2.2, response: 0.52, selectivity: 0.30, colour: "#7a6a4a" }
  };

  /* ===== levels =====
     Each level changes what you are being asked to get right, not just the
     numbers: later levels require stratified estimates, or ask for a
     district breakdown that a single city-wide sample cannot honestly
     produce. */

  /*
   * Level design rule, and the reason the numbers are what they are: each
   * survey uses one day, so a level with more days than wards lets you cover
   * every ward exactly once, and any less makes full coverage impossible.
   * minDistricts is therefore never above the ward count, and a level where
   * the target exceeds the day budget would be a puzzle with no solution —
   * sim.test.mjs plays every level to confirm each is winnable.
   */
  var LEVELS = [
    {
      id: "primo", name: "First Enumeration", year: 1841,
      blurb: "The city has never been counted. You have enough money for a handful of enumerators and a clerk who will do exactly what you tell him.",
      hint: "A rough figure beats no figure. Send people to the wards that bother to answer and you will report a city that is smaller than it is.",
      budget: 1100, days: 4,
      kinds: ["port", "market", "old", "hill"],
      popScale: 1,
      target: { within: 0.12, minDistricts: 0 }
    },
    {
      id: "quartieri", name: "By Ward", year: 1851,
      blurb: "The Board now wants the city broken down ward by ward — they are not building hospitals, they are building walls, and they want to know which ward to wall.",
      hint: "A city-wide average cannot tell you which ward is which. You have to go and look at each one.",
      budget: 2400, days: 6,
      kinds: ["port", "market", "old", "hill", "works", "mill"],
      popScale: 1,
      target: { within: 0.10, minDistricts: 6 }
    },
    {
      id: "sospetto", name: "The Hill Problem", year: 1861,
      blurb: "The Hill Wards answered last year at a rate no one believed. The Registrar General wants an explanation, not another number.",
      hint: "A ward that will not answer is not empty. And if the ones that refuse are the large ones, your average household is too small — so your city is too small.",
      budget: 3400, days: 7,
      kinds: ["port", "market", "old", "hill", "works", "mill", "college"],
      popScale: 1,
      target: { within: 0.09, minDistricts: 7 }
    },
    {
      id: "sondaggio", name: "By Inference", year: 1871,
      blurb: "The city has doubled and there is no money for a census. Estimate from a sample, then defend the estimate to a committee that does not want to believe you.",
      hint: "You may claim more confidence for a wider interval. The Board will accept a generous claim. It will not accept one you cannot pay for.",
      budget: 4200, days: 8,
      kinds: ["port", "market", "old", "hill", "works", "mill", "college", "wharf"],
      popScale: 1,
      target: { within: 0.08, minDistricts: 8 }
    },
    {
      id: "censo", name: "The Great Census", year: 1881,
      blurb: "Everything the Board has built for forty years rests on the number you publish next month, and there is one visit for every eight houses.",
      hint: "Stratify. Know something about the city before you sample it, and spend where your ignorance is cheapest to fix.",
      budget: 6400, days: 10,
      kinds: ["port", "market", "old", "hill", "works", "mill", "college", "wharf", "common", "asylum"],
      popScale: 1,
      target: { within: 0.07, minDistricts: 10 }
    }
  ];

  /* ===== the game state ===== */

  function create(levelIndex, seed) {
    var level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
    var rng = mulberry32(seed >>> 0);
    var districts = makeCity(rng, {
      kinds: level.kinds.map(function (k) { return KINDS[k]; }),
      popScale: level.popScale
    });

    return {
      level: level,
      levelIndex: Math.max(0, Math.min(LEVELS.length - 1, levelIndex)),
      seed: seed,
      rng: rng,
      districts: districts,
      /* Budget is in pounds and denominated in enumerator-days: each visit
         costs one day's pay plus travel, so an expensive district also
         costs more to look into. */
      money: level.budget,
      day: 0,
      days: level.days,
      spent: 0,
      visits: 0,
      refused: 0,
      log: [],
      phase: "survey",        /* survey -> publish -> graded */
      estimate: null,
      result: null,
      confidence: 95,
      lastSample: null
    };
  }

  function districtById(state, id) {
    for (var i = 0; i < state.districts.length; i++) {
      if (state.districts[i].id === id) return state.districts[i];
    }
    return null;
  }

  /*
   * Cost of one visit, in pounds. Cheap districts are cheap to count;
   * the Hill Wards cost more because the enumerator has to walk up.
   * Returns null when the money is not there, which the UI needs to say
   * rather than silently clamp.
   */
  function visitCost(district, levelIndex) {
    var base = 6 + district.householdSize * 1.6;
    var premium = district.kind === "hill" ? 4 : 0;
    if (district.kind === "asylum") premium = 2;
    /* Later levels the Board expects better standards: uniform costing. */
    if (levelIndex >= 3) base += 2;
    return Math.round((base + premium) * 10) / 10;
  }

  /* Send `n` enumerators to a district for one day. */
  function survey(state, districtId, n) {
    if (state.phase !== "survey") return { ok: false, why: "The return is already filed." };
    var d = districtById(state, districtId);
    if (!d) return { ok: false, why: "No such ward." };
    n = Math.max(0, Math.floor(n || 0));
    if (!n) return { ok: false, why: "Send at least one enumerator." };

    var cost = visitCost(d, state.levelIndex) * n;
    if (cost > state.money) {
      return { ok: false, why: "Not enough money: this visit costs £" + cost.toFixed(1) + "." };
    }

    state.money -= cost;
    state.spent += cost;
    state.visits += n;
    state.day++;

    var before = d.response;
    var sample = sampleDistrict(state.rng, d, n);
    d.response = before;                    /* sampling does not change the city */
    d.sampled = (d.sampled || 0) + sample.visited;
    d.answered = (d.answered || 0) + sample.answered;
    d.counted = (d.counted || 0) + sample.counted;
    state.refused += sample.visited - sample.answered;

    state.log.push({
      day: state.day, district: d.name, n: n,
      visited: sample.visited, answered: sample.answered,
      counted: sample.counted, cost: cost
    });
    state.lastSample = { district: d, sample: sample };

    return {
      ok: true,
      district: d,
      sample: sample,
      cost: cost,
      exhausted: state.day >= state.days,
      broke: state.money < visitCost(d, state.levelIndex)
    };
  }

  /*
   * The estimate. This is the heart of the game and the one function a
   * statistician would want to argue with.
   *
   * For each sampled district:
   *   - the observed mean household size gives a per-household figure;
   *   - the observed response rate corrects the count for non-response.
   *
   * Districts that were never sampled are left out of the total entirely,
   * which is the trap the game is built on: a city-wide estimate computed
   * only from the wards you happened to visit will be confidently wrong,
   * and the error grows with the population you failed to look at.
   */
  function estimate(state, opts) {
    opts = opts || {};
    var z = Z[opts.confidence || state.confidence] || Z[95];
    var sampled = state.districts.filter(function (d) { return d.sampled > 0; });
    var unsampled = state.districts.filter(function (d) { return !d.sampled; });

    var total = 0;
    var rows = state.districts.map(function (d) {
      if (!d.sampled) {
        return {
          id: d.id, name: d.name, kind: d.kind, sampled: false,
          estimate: null, visited: 0, answered: 0, counted: 0,
          response: null, margin: null, low: null, high: null
        };
      }
      var response = d.answered / d.sampled;
      /* Ratio estimator. The return gives a mean people-per-household from
         the households that answered; scaling that by the number of houses in
         the district estimates its population.
         Note what is NOT here: no division by the response rate. Non-response
         does not shrink a district — it only corrupts the sample if the
         households that refuse differ from the ones that answer. The
         response rate's real cost is precision, which the margin below
         captures by scaling the interval with the number who answered. */
      var perHousehold = d.answered ? d.counted / d.answered : 0;
      var est = perHousehold * d.trueHouseholds;
      total += est;

      /* Two sources of doubt: who answered, and how big the houses are. */
      var m = districtMargin(z, response, d.answered, est);
      var rel = est > 0 ? m / est : 1;

      return {
        id: d.id, name: d.name, kind: d.kind, sampled: true,
        estimate: est,
        visited: d.sampled, answered: d.answered, counted: d.counted,
        response: response,
        margin: m,
        low: Math.max(0, est - m),
        high: est + m,
        coverage: 1 - 2 * Math.max(0, 0.5 - rel)   /* crude but monotone */
      };
    });

    /* Unsampled population is not a number the player gets to assume. It is
       reported as a named hole, sized against what the sampled wards would
       plausibly suggest, so the player can see how big their blind spot is
       without being handed the answer. */
    var impliedUnsampled = 0;
    var meanSampleDensity = sampled.length
      ? total / sampled.length : 0;
    unsampled.forEach(function (d) { impliedUnsampled += meanSampleDensity; });

    /* Total variance under independent simple random sampling, added across
       districts because the samples are disjoint. Reuses the same
       estimator as the rows above so the interval cannot describe a
       different quantity from the total it is drawn against. */
    var variance = 0;
    sampled.forEach(function (d) {
      var response = d.answered / d.sampled;
      var perHousehold = d.answered ? d.counted / d.answered : 0;
      var est = perHousehold * d.trueHouseholds;
      /* Same interval as the rows above, so the total's error bar describes
         the number actually printed rather than a different one. */
      var m = districtMargin(z, response, d.answered, est);
      variance += m * m;
    });
    var totalMargin = Math.sqrt(variance);

    return {
      rows: rows,
      total: total,
      totalMargin: totalMargin,
      totalLow: Math.max(0, total - totalMargin),
      totalHigh: total + totalMargin,
      coverage: opts.confidence || state.confidence,
      sampledCount: sampled.length,
      unsampledCount: unsampled.length,
      unsampledNames: unsampled.map(function (d) { return d.name; }),
      impliedUnsampled: impliedUnsampled,
      withImplied: total + impliedUnsampled,
      visits: state.visits,
      refusals: state.refused,
      responseOverall: state.visits ? (state.visits - state.refused) / state.visits : 0
    };
  }

  /*
   * Grading. Truth is never shown to the player before they commit, only
   * afterwards — a statistician who is told the answer first stops being
   * a statistician.
   */
  function grade(state, opts) {
    opts = opts || {};
    var est = estimate(state, opts);
    var truth = state.districts.reduce(function (a, d) { return a + d.truePop; }, 0);
    var published = est.total;

    var error = published - truth;
    var relError = truth ? Math.abs(error) / truth : 1;

    /* Per-district error, for the wards that were actually sampled. */
    var districtErrors = est.rows.filter(function (r) { return r.sampled; })
      .map(function (r) {
        var d = districtById(state, r.id);
        return {
          name: r.name,
          truth: d.truePop,
          estimate: r.estimate,
          error: r.estimate - d.truePop,
          relError: d.truePop ? Math.abs(r.estimate - d.truePop) / d.truePop : 1,
          response: r.response
        };
      });

    var maxDistrictError = districtErrors.reduce(
      function (a, e) { return Math.max(a, e.relError); }, 0);

    var need = state.level.target.minDistricts;
    var covered = est.sampledCount;

    var verdict;
    if (relError <= state.level.target.within && covered >= need) {
      verdict = "accepted";
    } else if (relError <= state.level.target.within * 2.2 && covered >= Math.max(2, need - 1)) {
      verdict = "questioned";
    } else {
      verdict = "rejected";
    }

    /* Non-response bias is measured against the whole city: if the sampled
       wards happen to answer at a different rate than the city as a whole,
       that gap is the bias the player walked into. */
    var trueWeightedResponse = state.districts.reduce(function (a, d) {
      return a + d.response * d.trueHouseholds;
    }, 0) / Math.max(1, state.districts.reduce(function (a, d) {
      return a + d.trueHouseholds;
    }, 0));

    var result = {
      verdict: verdict,
      published: published,
      truth: truth,
      error: error,
      relError: relError,
      margin: est.totalMargin,
      didTheErrorFallInside: Math.abs(error) <= est.totalMargin,
      districtErrors: districtErrors,
      maxDistrictError: maxDistrictError,
      covered: covered,
      required: need,
      visits: state.visits,
      /* The state field is `refused`; the result exposes it as `refusals`
         to match the rest of the API, and the smoke test pins that it is a
         number rather than undefined. */
      refusals: state.refused,
      spent: state.spent,
      responseOverall: est.responseOverall,
      trueWeightedResponse: trueWeightedResponse,
      /* The difference between these two is the bias a player cannot see
         from inside their own sample. */
      responseGap: est.responseOverall - trueWeightedResponse
    };

    state.phase = "graded";
    state.result = result;
    return result;
  }

  function publish(state, opts) {
    if (state.phase !== "survey") return null;
    return grade(state, opts);
  }

  function advanceDay(state) {
    if (state.phase !== "survey") return;
    if (state.day < state.days) state.day++;
  }

  function doneSurveying(state) {
    return state.phase === "survey" && state.day >= state.days;
  }

  /* A day's worth of budget, for the "spend what you have" hint. */
  function affordableVisits(state, districtId) {
    var d = districtById(state, districtId);
    if (!d) return 0;
    return Math.floor(state.money / visitCost(d, state.levelIndex));
  }

  var api = {
    LEVELS: LEVELS,
    KINDS: KINDS,
    Z: Z,
    create: create,
    survey: survey,
    estimate: estimate,
    grade: grade,
    publish: publish,
    advanceDay: advanceDay,
    doneSurveying: doneSurveying,
    visitCost: visitCost,
    affordableVisits: affordableVisits,
    marginOfError: marginOfError,
    districtMargin: districtMargin,
    sampleDistrict: sampleDistrict,
    districtById: districtById,
    mulberry32: mulberry32
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CensusSim = api;
})(typeof globalThis !== "undefined" ? globalThis : this);