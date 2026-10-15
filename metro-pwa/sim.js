/*
 * LINEA ROSSA — simulation core
 * ---------------------------------
 * The economy of LINEA ROSSA with no DOM, no canvas and no input handling.
 *
 * Why this file exists: game.js is one IIFE that mixes the model with
 * drawing and event wiring, so the balance of the tycoon could only be
 * measured by playing it. This module is the same model with the display
 * stripped out, which lets tools/balance/run.mjs play thousands of
 * headless sessions and report where the difficulty curve actually sits.
 *
 * Keep in sync with game.js: every rule here must match the rule there.
 * Drift is caught by sim.test.mjs, which pins the behaviours both files are
 * supposed to share — the demand split, the growth bands, the economy, the
 * line costs and the goal adjudication.
 *
 * Exposes window.MetroSim (plain script, no modules, so game.js and the
 * Node harness can load the same file).
 */
(function (root) {
  "use strict";

  /* ===== Constants =====
     Mirrors the tunable block at the top of game.js. loadLevel() may
     override any of these from a level's params object. */
  var DEFAULTS = {
    day: 150,               // real seconds per city day
    trainSpeed: 220,        // px/s
    trainCap: 120,          // passengers per train
    trainCost: 150,
    stationBase: 80,
    tunnelPerPx: 0.9,
    interest: 0.02,         // daily loan rate
    loanCap: 5000,
    bankruptAt: -400,
    growthCap: 1500,
    spawnChance: 0.22,
    maxLines: 6,
    maxDistricts: 22,
    money: 900,
    fare: 1.2
  };

  var W = 1700, H = 1700;
  var LINE_COLORS = ["#e0342c", "#2c7be0", "#22a55e", "#e8a924", "#9b59d0", "#e07d2c"];

  /* ===== Small maths (identical to game.js) ===== */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

  /* Symmetric gravity: home->work and work->home are averaged so a line is
     not profitable just because one district happens to sit between two
     busy ones. Distance decay is 1/(1+(d/300)^1.6). */
  function gravity(A, B, cfg) {
    var d = Math.sqrt(dist2(A.x, A.y, B.x, B.y));
    var base = 0.0022 * (A.pop + A.jobs * 0.6) * (B.pop * 0.6 + B.jobs);
    var sym = 0.0022 * (B.pop + B.jobs * 0.6) * (A.pop * 0.6 + A.jobs);
    return ((base + sym) / 2) / (1 + Math.pow(d / 300, 1.6));
  }

  /* Four waves: commute-heavy, diffuse, commute-heavy, near-dead. */
  function waveMult(tod) {
    if (tod < 0.35) return 1.35;
    if (tod < 0.6) return 0.7;
    if (tod < 0.9) return 1.35;
    return 0.15;
  }

  /* Price elasticity: fares above ~1.2 suppress demand, cheap fares fill
     trains but earn less per passenger. */
  function fareMult(fare) { return clamp(2.2 - fare * 0.6, 0.25, 1.8); }

  /* Breadth-first search over "sets of lines you have already boarded",
     so an interchange costs exactly one extra step and never more. Each
     state is a bitmask, capped at depth 2 by the caller. */
  function routeSearch(state, aId, bId, maxTransfers) {
    var start = linesAtDistrict(state, aId);
    var goal = {};
    linesAtDistrict(state, bId).forEach(function (l) { goal[l.id] = true; });

    var seen = {};
    var queue = [];
    var i;
    for (i = 0; i < start.length; i++) {
      var seed = { mask: 1 << start[i].id, lines: [start[i].id], transfers: 0 };
      if (goal[start[i].id]) return { lines: seed.lines, transfers: 0 };
      if (seen[seed.mask]) continue;
      seen[seed.mask] = true;
      queue.push(seed);
    }

    var head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      if (cur.transfers >= maxTransfers) continue;

      /* Expand every line reachable by boarding it from a line already held,
         or by boarding it directly at the origin. Deduplicating on the set
         of lines held (not on order) keeps the search linear in networks
         this small and stops it from re-deriving the same route twice. */
      var candidates = [];
      for (i = 0; i < state.lines.length; i++) candidates.push(i);

      for (i = 0; i < candidates.length; i++) {
        var line = state.lines[candidates[i]];
        if (cur.mask & (1 << line.id)) continue;

        var shares = false;
        for (var k = 0; k < cur.lines.length; k++) {
          var held = state.lines[cur.lines[k]];
          if (held.stations.some(function (x) { return line.stations.indexOf(x) >= 0; })) {
            shares = true;
            break;
          }
        }
        if (!shares) continue;

        var next = {
          mask: cur.mask | (1 << line.id),
          lines: cur.lines.concat([line.id]),
          transfers: cur.transfers + 1
        };
        if (goal[line.id]) return { lines: next.lines, transfers: next.transfers };
        if (seen[next.mask]) continue;
        seen[next.mask] = true;
        queue.push(next);
      }
    }
    return null;
  }

  function linesAtDistrict(state, dId) {
    return state.lines.filter(function (l) { return l.stations.indexOf(dId) >= 0; });
  }

  /* Stations carry the polyline geometry a line needs to be built and
     priced; recomputed whenever a line changes. */
  function recomputeGeometry(state, line, cfg) {
    var pts = line.stations.map(function (id) { return state.districts[id]; });
    var len = 0;
    var segs = [];
    for (var i = 1; i < pts.length; i++) {
      var d = Math.sqrt(dist2(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
      segs.push(d);
      len += d;
    }
    line.pts = pts;
    line.segs = segs;
    line.len = len;
    return line;
  }

  function create(opts) {
    opts = opts || {};
    var cfg = {};
    var k;
    for (k in DEFAULTS) cfg[k] = DEFAULTS[k];
    /* Level params win, then top-level overrides, so a harness can say
       create({ money: 0 }) without knowing the params channel exists. */
    for (k in (opts.params || {})) {
      if (opts.params[k] != null) cfg[k] = opts.params[k];
    }
    for (k in DEFAULTS) {
      if (opts[k] != null) cfg[k] = opts[k];
    }

    var state = {
      cfg: cfg,
      districts: opts.districts ? opts.districts.slice() : [],
      lines: [],
      day: 1,
      tod: 0.08,
      dayElapsed: 0,
      time: 0,
      money: cfg.money,
      fare: cfg.fare,
      loan: 0,
      totalPax: 0,
      revenueTotal: 0,
      deliveredDay: 0,
      bestDay: 0,
      nextLineId: 0,
      over: false,
      bankrupt: false,
      won: null,
      goal: opts.goal || null,
      goalHit: null
    };

    /* Per-district served/stress/wait bookkeeping. */
    state.districts.forEach(function (d) {
      d.served = false;
      d.stress = 0;
      d.wait = 0;
    });

    return state;
  }

  function addLine(state, stationIds, trains, opts) {
    opts = opts || {};
    if (state.lines.length >= state.cfg.maxLines) return null;
    if (!stationIds || stationIds.length < 2) return null;
    var line = {
      id: state.nextLineId++,
      stations: stationIds.slice(),
      trains: trains || 1,
      color: opts.color || LINE_COLORS[state.lines.length % LINE_COLORS.length],
      demand: 0, cap: 0, served: 0, crowd: 0, ratio: 1
    };
    recomputeGeometry(state, line, state.cfg);
    state.lines.push(line);
    return line;
  }

  /* Cost of one segment, matching game.js buildCost(): a station fee at the
     destination plus tunnel length scaled by the average geology of both
     districts. Water/bridge multipliers are a level-detail the harness
     leaves at 1, since only one level has them and all of them are 1. */
  function segmentCost(state, fromD, toD) {
    var cfg = state.cfg;
    var d = Math.sqrt(dist2(fromD.x, fromD.y, toD.x, toD.y));
    var geo = ((fromD.geo || 1) + (toD.geo || 1)) / 2;
    return Math.round(cfg.stationBase * (toD.geo || 1) + d * cfg.tunnelPerPx * geo);
  }

  function lineCost(state, line) {
    var total = 0;
    for (var i = 1; i < line.pts.length; i++) {
      total += segmentCost(state, line.pts[i - 1], line.pts[i]);
    }
    return total;
  }

  /* Demand -> delivered passengers, split across every served origin-dest
     pair. Each pair routes through up to 2 interchanges and is throttled by
     the weakest line on its route, which is what makes an under-served
     line somewhere on the path a real penalty. */
  function recomputeDemand(state, maxTransfers) {
    var cfg = state.cfg;
    var wm = waveMult(state.tod);
    var fm = fareMult(state.fare);
    state.lines.forEach(function (l) { l.demand = 0; });

    var served = state.districts.filter(function (d) { return linesAtDistrict(state, d.id).length > 0; });
    var delivered = 0;
    var i, j;

    for (i = 0; i < served.length; i++) {
      for (j = i + 1; j < served.length; j++) {
        var A = served[i], B = served[j];
        var F = gravity(A, B, cfg) * wm * fm;
        var route = routeSearch(state, A.id, B.id,
          maxTransfers == null ? 2 : maxTransfers);
        if (!route) continue;
        /* Every extra interchange sheds 40% of the flow. */
        F /= (1 + 0.4 * route.transfers);
        route.lines.forEach(function (lid) { state.lines[lid].demand += F; });
      }
    }

    state.lines.forEach(function (l) {
      var cycle = l.stations.length < 2 ? 1 : 2 * l.len / cfg.trainSpeed;
      l.cap = l.trains * cfg.trainCap * (cfg.day / Math.max(cycle, 1));
      l.served = Math.min(l.demand, l.cap);
      l.crowd = l.demand / Math.max(l.cap, 1);
      l.ratio = l.demand > 0 ? clamp(l.cap / l.demand, 0, 1) : 1;
    });

    for (i = 0; i < served.length; i++) {
      for (j = i + 1; j < served.length; j++) {
        var A2 = served[i], B2 = served[j];
        var F2 = gravity(A2, B2, cfg) * wm * fm;
        var route2 = routeSearch(state, A2.id, B2.id,
          maxTransfers == null ? 2 : maxTransfers);
        if (!route2) continue;
        F2 /= (1 + 0.4 * route2.transfers);
        var minRatio = 1;
        route2.lines.forEach(function (lid) { minRatio = Math.min(minRatio, state.lines[lid].ratio); });
        delivered += F2 * minRatio;
        /* The shortfall lands on the lines the traveller actually rode. */
        var unmet = F2 * (1 - minRatio) / Math.max(route2.lines.length, 1);
        route2.lines.forEach(function (lid) {
          state.lines[lid].stations.forEach(function (dId) {
            if (state.districts[dId]) state.districts[dId].wait += unmet;
          });
        });
      }
    }

    state.deliveredDay = delivered;

    state.districts.forEach(function (d) {
      var lines = linesAtDistrict(state, d.id);
      d.served = lines.length > 0;
      d.stress = 0;
      lines.forEach(function (l) { d.stress = Math.max(d.stress, l.crowd); });
      d.wait = clamp(d.wait * 0.7, 0, 60);
    });

    return delivered;
  }

  /* Population follows service: served and uncrowded districts grow fast,
     served but crowded ones stall, unserved ones bleed out. This is the
     feedback loop the whole tycoon is built on. */
  function dayRollover(state) {
    var cfg = state.cfg;
    state.day++;
    state.bestDay = Math.max(state.bestDay, state.deliveredDay);

    state.districts.forEach(function (d) {
      var q = d.served ? clamp(1 / Math.max(d.stress, 0.8), 0, 1.2) : 0;
      var g;
      if (!d.served) g = -0.004;
      else if (q > 0.95) g = 0.032;
      else if (q > 0.7) g = 0.012;
      else g = -0.008;
      d.pop = Math.max(80, d.pop * (1 + g));
      d.jobs = Math.max(40, d.jobs * (1 + g * 0.9));
    });

    return state.day;
  }

  /* Upkeep plus interest. This is the clock that forces a decision. */
  function economyTick(state, dt) {
    var cfg = state.cfg;
    var trains = 0, stationsN = 0;
    state.lines.forEach(function (l) { trains += l.trains; stationsN += l.stations.length; });
    var maint = (trains * 12 + stationsN * 8 + 25) / cfg.day;
    state.money -= maint * dt;

    if (state.loan > 0) {
      var interest = state.loan * cfg.interest / cfg.day;
      state.loan += interest * dt;
      state.money -= interest * dt;
    }

    if (state.money < cfg.bankruptAt && !state.over) {
      state.over = true;
      state.bankrupt = true;
    }
    return state.money;
  }

  /* Fare revenue for one elapsed slice of the day. */
  function revenueTick(state, dt, maxTransfers) {
    var cfg = state.cfg;
    var delivered = recomputeDemand(state, maxTransfers);
    /* Delivered passengers scale with the fraction of the day elapsed. */
    var slice = delivered * (dt / cfg.day);
    var take = slice * state.fare;
    state.money += take;
    state.totalPax += slice;
    state.revenueTotal += take;
    return { delivered: slice, revenue: take };
  }

  /*
 * One slice of the simulation. Day rollover and goal adjudication live
 * here rather than in the caller: a harness that forgets to roll the day
 * over would otherwise run forever and quietly report nothing, and the
 * whole point of this module is that the harness cannot get it wrong.
 *
 * Returns state. state.over flips once the run is decided.
 */
function advance(state, dt, opts) {
    opts = opts || {};
    if (state.over) return state;
    var cfg = state.cfg;

    state.time += dt;
    state.dayElapsed = (state.dayElapsed || 0) + dt;
    state.tod = (state.tod + dt / cfg.day) % 1;

    revenueTick(state, dt, opts.maxTransfers);
    economyTick(state, dt);

    /* Roll the day over as many times as the slice covered, so a large dt
       cannot skip a growth step and desync the calendar. */
    var guard = 0;
    while (state.dayElapsed >= cfg.day && !state.over && guard < 64) {
      state.dayElapsed -= cfg.day;
      dayRollover(state);
      guard++;
    }

    var verdict = goalReached(state);
    if (verdict === true) {
      state.over = true;
      state.won = true;
    } else if (verdict === false) {
      state.over = true;
      state.won = false;
    }
    return state;
  }

  function takeLoan(state, amount) {
    amount = Math.min(amount, state.cfg.loanCap - state.loan);
    if (amount <= 0) return 0;
    state.loan += amount;
    state.money += amount;
    return amount;
  }

  function repayLoan(state, amount) {
    amount = Math.min(amount, state.loan, Math.max(0, state.money));
    if (amount <= 0) return 0;
    state.loan -= amount;
    state.money -= amount;
    return amount;
  }

  /* Did this run meet its goal? The tycoon has no fail state beyond
     bankruptcy, so the harness needs this to score a "win". The "best
     qualifying day" is a property of the run as a whole, so it is
     evaluated on demand rather than on every tick. */
  function goalReached(state) {
    if (!state.goal) return null;
    var g = state.goal;
    var needsPax = g.paxDay != null;
    var needsDays = g.days != null;
    var needsServed = g.servedMin != null;

    var byDay = !needsPax || state.bestDay >= g.paxDay;
    var servedOk = !needsServed ||
      state.districts.filter(function (d) { return d.served; }).length >= g.servedMin;

    /* Success is sticky: once every condition has held on the same day it
       stays won, so a later slump cannot retroactively undo a clear. */
    if (byDay && servedOk) state.goalHit = true;

    if (state.goalHit) return true;
    /* Out of days without hitting the target is a loss, not a draw —
       otherwise a player who does nothing scores the same as one who
       plays well. */
    if (needsDays && state.day > g.days) return false;
    return null;
  }

  var api = {
    create: create,
    addLine: addLine,
    lineCost: lineCost,
    segmentCost: segmentCost,
    routeSearch: routeSearch,
    recomputeDemand: recomputeDemand,
    dayRollover: dayRollover,
    economyTick: economyTick,
    revenueTick: revenueTick,
    advance: advance,
    takeLoan: takeLoan,
    repayLoan: repayLoan,
    goalReached: goalReached,
    linesAtDistrict: linesAtDistrict,
    gravity: gravity,
    waveMult: waveMult,
    fareMult: fareMult,
    DEFAULTS: DEFAULTS
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MetroSim = api;
})(typeof globalThis !== "undefined" ? globalThis : this);