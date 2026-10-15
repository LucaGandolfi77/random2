/*
 * CENSUS — the city, drawn
 * -------------------------
 * Rendering only. Every number on screen comes from sim.js; this file
 * decides how it is drawn and how the player spends a budget.
 */
(function () {
  "use strict";

  var S = window.CensusSim;
  var R2 = window.R2;

  var PALETTE = {
    ink: "#e9e3d3",
    dim: "#a89f8c",
    faint: "rgba(233,227,211,0.10)",
    grid: "rgba(233,227,211,0.16)",
    paper: "#15140f",
    card: "#1d1b15",
    rule: "#3a362a",
    gold: "#c9a227",
    good: "#6a9a5b",
    warn: "#c98a3b",
    bad: "#b8503f",
    ink2: "#0f0e0a"
  };

  var cv, ctx, W = 900, H = 620;
  var state = null;
  var ui = { tab: "map", selected: 0, showTruth: false, hover: null };

  /* ---------- layout ----------
     Everything is derived from the canvas size. A fixed 900x620 layout
     looked correct in one window size and overlapped itself in another:
     the toolbar sat on top of the header, and the strip along the bottom
     fell off the canvas entirely. */
  var TOOL = { x: 0, y: 0, w: 0, h: 30 };
  var HEAD = { x: 0, y: 0, w: 0, h: 58 };
  var MAP = { x: 0, y: 0, w: 0, h: 0 };
  var PANEL = { x: 0, y: 0, w: 0, h: 0 };
  var BELOW = { x: 0, y: 0, w: 0, h: 0 };

  function computeRects() {
    var pad = Math.max(10, Math.min(20, W * 0.02));
    TOOL = { x: pad, y: 0, w: W - pad * 2, h: 30 };
    HEAD = { x: pad, y: TOOL.h, w: W - pad * 2, h: 58 };
    var top = HEAD.y + HEAD.h;
    var belowH = Math.min(104, Math.max(84, H * 0.19));
    var mainH = H - top - belowH - pad;

    /* Below about 720px wide the panel cannot sit beside the map and still
       be readable, so the map takes the top and the panel goes under it. */
    var stacked = W < 720;
    if (stacked) {
      var mapH = mainH * 0.5;
      MAP = { x: pad, y: top, w: W - pad * 2, h: mapH };
      PANEL = { x: pad, y: top + mapH + 8, w: W - pad * 2, h: mainH - mapH - 8 };
      BELOW = { x: pad, y: PANEL.y + PANEL.h + 8, w: W - pad * 2, h: belowH - 8 };
    } else {
      var gap = 14;
      var mapW = Math.round((W - pad * 2 - gap) * 0.46);
      MAP = { x: pad, y: top, w: mapW, h: mainH };
      PANEL = {
        x: pad + mapW + gap, y: top,
        w: W - pad * 2 - mapW - gap, h: mainH
      };
      BELOW = { x: pad, y: top + mainH + 8, w: W - pad * 2, h: belowH - 8 };
    }
  }

  /* ---------- geometry ---------- */

  /* The city is laid out on a jittered grid so wards tile the map without
     overlapping, and so "adjacent" means something the player can see. The
     cell is sized from the map box rather than assumed, so no ward can ever
     stick out of the frame. */
  function layout() {
    computeRects();
    if (!state) return;
    var ds = state.districts;
    /* Leave room for the map's own heading and footnote. */
    var innerX = MAP.x + 10, innerY = MAP.y + 24;
    var innerW = MAP.w - 20, innerH = MAP.h - 24 - 26;

    /* Choose the column count that makes cells as close to square as the
       map's aspect ratio allows. A fixed ceil(sqrt(n)) on a tall map gives
       cells three times taller than wide, which reads as a list of
       headstones rather than a city. */
    var best = null;
    for (var cols = 1; cols <= ds.length; cols++) {
      var rows = Math.ceil(ds.length / cols);
      var cw = innerW / cols, ch = innerH / rows;
      /* Only consider grids that actually fit every ward. */
      if (rows * cols < ds.length) continue;
      var aspect = Math.abs(Math.log((cw / ch) || 1));
      if (!best || aspect < best.aspect) best = { cols: cols, rows: rows, aspect: aspect };
    }
    var g = best || { cols: 1, rows: ds.length };
    var cellW = innerW / g.cols, cellH = innerH / g.rows;

    ds.forEach(function (d, i) {
      var cx = i % g.cols, cy = Math.floor(i / g.cols);
      var jx = (((d.id * 2654435761) % 1000) / 1000 - 0.5) * 0.3;
      var jy = (((d.id * 40503) % 1000) / 1000 - 0.5) * 0.3;
      d.cw = cellW * 0.88;
      d.ch = cellH * 0.88;
      d.px = innerX + (cx + 0.5 + jx) * cellW;
      d.py = innerY + (cy + 0.5 + jy) * cellH;
      /* Keep every ward inside the frame even at the jitter extremes. */
      d.px = Math.max(innerX + d.cw / 2, Math.min(innerX + innerW - d.cw / 2, d.px));
      d.py = Math.max(innerY + d.ch / 2, Math.min(innerY + innerH - d.ch / 2, d.py));
    });
  }

  /* ---------- drawing ---------- */

  /* Clear and set up the drawing transform.
   The clear is done in device pixels under the identity transform, against
   the backing store's real size. Deriving it from dpr and W/H instead left
   a thin strip beside the panel unpainted on some device-pixel ratios, and
   stale glyphs from a previous layout survived there between frames. */
function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    /* Scale so logical W x H maps onto whatever the backing store is. */
    var sx = cv.width / W;
    var sy = cv.height / H;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
  }

  function text(str, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.fillStyle = opts.color || PALETTE.ink;
    ctx.font = opts.font || "13px Georgia, 'Times New Roman', serif";
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.baseline || "alphabetic";
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.fillText(String(str), x, y);
    ctx.restore();
  }

  function box(x, y, w, h, fill, stroke) {
    ctx.save();
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    ctx.restore();
  }

  function rule(x1, y1, x2, y2, color) {
    ctx.save();
    ctx.strokeStyle = color || PALETTE.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function money(n) {
    return "£" + Math.round(n).toLocaleString("en-GB");
  }

  function num(n) {
    return Math.round(n).toLocaleString("en-GB");
  }

  /* ---------- header ---------- */

  function drawHeader() {
    var lv = state.level;
    box(0, HEAD.y, W, HEAD.h + TOOL.h, PALETTE.card);
    rule(0, HEAD.y + HEAD.h, W, HEAD.y + HEAD.h, PALETTE.rule);

    var y0 = HEAD.y + 26;
    text("CENSUS", HEAD.x, y0, { font: "bold 22px Georgia, serif", color: PALETTE.gold });
    text(lv.name.toUpperCase() + " · " + lv.year, HEAD.x, y0 + 18,
      { font: "11px Georgia, serif", color: PALETTE.dim });

    /* Right-hand block: the two numbers that decide the round. */
    var right = W - HEAD.x;
    var left = Math.max(0, state.days - state.day);
    text("RETURN DUE IN", right, y0 - 6,
      { font: "10px Georgia, serif", color: PALETTE.dim, align: "right" });
    text(String(left), right, y0 + 18,
      { font: "bold 24px Georgia, serif",
        color: left <= 1 ? PALETTE.bad : PALETTE.ink, align: "right" });

    var purseX = Math.max(HEAD.x + 150, right - 210);
    text("TREASURY", purseX, y0 - 6, { font: "10px Georgia, serif", color: PALETTE.dim });
    text(money(state.money), purseX, y0 + 18,
      { font: "bold 19px Georgia, serif",
        color: state.money < 120 ? PALETTE.warn : PALETTE.ink });

    var spentPct = lv.budget ? (state.spent / lv.budget) : 0;
    var barW = 96;
    box(purseX, y0 + 26, barW, 5, PALETTE.faint);
    if (spentPct > 0) box(purseX, y0 + 26, barW * Math.min(1, spentPct), 5, PALETTE.gold);
    text("spent " + Math.round(spentPct * 100) + "%", purseX + barW + 8, y0 + 31,
      { font: "10px Georgia, serif", color: PALETTE.dim });
  }

  /* ---------- the city map ---------- */

  function drawMap() {
    box(MAP.x, MAP.y, MAP.w, MAP.h, PALETTE.card);
    text("THE CITY", MAP.x + 10, MAP.y + 16,
      { font: "bold 11px Georgia, serif", color: PALETTE.dim });

    var est = S.estimate(state);

    state.districts.forEach(function (d) {
      var x = d.px - d.cw / 2, y = d.py - d.ch / 2;
      var sel = ui.selected === d.id;
      var row = est.rows[d.id];
      var small = d.cw < 78 || d.ch < 52;

      /* Fill: unvisited wards read as blank paper, which is the point —
         a ward you have not looked at has no information in it. */
      var fill = d.sampled ? d.colour : "rgba(233,227,211,0.045)";
      box(x, y, d.cw, d.ch, fill, sel ? PALETTE.gold : PALETTE.rule);

      /* Name and, once sampled, the estimate. */
      text(d.name, x + d.cw / 2, y + d.ch * 0.44,
        { align: "center", font: (small ? "10px" : "11px") + " Georgia, serif",
          color: d.sampled ? PALETTE.ink : PALETTE.dim });

      if (row && row.sampled) {
        text(num(row.estimate), x + d.cw / 2, y + d.ch * 0.72,
          { align: "center", font: (small ? "11px" : "12px") + " Georgia, serif",
            color: PALETTE.ink });
      } else if (!small) {
        text("—", x + d.cw / 2, y + d.ch * 0.72,
          { align: "center", font: "14px Georgia, serif", color: PALETTE.faint });
      }

      /* Response rate as a small bar: the clue to the trap. A low bar on a
         large ward is the thing the player is meant to notice. */
      if (d.sampled && d.ch >= 40) {
        var resp = row.response;
        var barW = d.cw * 0.6, barH = 3;
        box(x + d.cw * 0.2, y + d.ch * 0.86, barW, barH, PALETTE.faint);
        box(x + d.cw * 0.2, y + d.ch * 0.86, barW * resp, barH,
          resp < 0.6 ? PALETTE.bad : (resp < 0.8 ? PALETTE.warn : PALETTE.good));
      }
    });

    text("shade = visited · bar = share of doors that answered",
      MAP.x + 10, MAP.y + MAP.h - 8, { font: "10px Georgia, serif", color: PALETTE.dim });
  }

  /* The vertical position the panel's controls land on. Shared by drawing
   and hit-testing so the buttons cannot drift from what is on screen. */
function panelRows(sampled) {
    var y = PANEL.y + 22;
    y += 22;                                       /* the ward name */
    if (!sampled) {
      y += 26 + 18 + 18 + 44;                      /* "not yet visited" block */
    } else {
      y += 26 + 26 + 12 + 26 + 15 + 15 * 4 + 24;   /* figure, interval, return */
    }
    y += 22;                                       /* rule */
    return { stepper: y + 20, buttons: y + 44 };
}

  /* ---------- side panel ---------- */

  function drawPanel() {
    box(PANEL.x, PANEL.y, PANEL.w, PANEL.h, PALETTE.card);
    var d = state.districts[ui.selected];
    if (!d) return;

    var est = S.estimate(state);
    var row = est.rows[ui.selected];
    var y = PANEL.y + 22;
    var x = PANEL.x + 16;
    var wrap = PANEL.w - 32;

    text(d.name.toUpperCase(), x, y, { font: "bold 16px Georgia, serif", color: PALETTE.gold });
    y += 22;

    if (!row.sampled) {
      text("Not yet visited.", x, y + 6, { font: "13px Georgia, serif" });
      y += 26;
      /* Wrapped, so the explanation cannot run off a narrow panel. */
      y = wrapped(x, y, "An enumerator day here costs " +
        money(S.visitCost(d, state.levelIndex)) +
        ", and one visit is one day of the return.", wrap, 15);
      y += 8;
      y = wrapped(x, y,
        "What you do not know about this ward is not zero. It is simply " +
        "missing from your return, and the Board will not see the difference.",
        wrap, 15);
      y += 14;
    } else {
      text(num(row.estimate) + " people", x, y + 6, { font: "bold 20px Georgia, serif" });
      y += 26;
      text("± " + num(row.margin) + " at " + est.coverage + "% confidence",
        x, y, { font: "12px Georgia, serif", color: PALETTE.dim });
      y += 12;
      text("between " + num(row.low) + " and " + num(row.high),
        x, y, { font: "12px Georgia, serif", color: PALETTE.dim });
      y += 26;

      /* The return's own arithmetic, shown. This is the one place the
         player can see what the number is made of. */
      var perHH = row.answered ? row.counted / row.answered : 0;
      text("RETURN", x, y, { font: "bold 10px Georgia, serif", color: PALETTE.dim });
      y += 15;
      text("doors knocked     " + num(row.visited), x, y, { font: "12px Georgia, serif" });
      y += 15;
      text("doors answered    " + num(row.answered) +
        "  (" + Math.round(row.response * 100) + "%)", x, y, { font: "12px Georgia, serif" });
      y += 15;
      text("people counted    " + num(row.counted), x, y, { font: "12px Georgia, serif" });
      y += 15;
      text("per house         " + perHH.toFixed(2), x, y, { font: "12px Georgia, serif" });
      y += 15;
      text("houses × per      = estimate", x, y, { font: "12px Georgia, serif" });
      y += 24;
    }

    /* Send-enumerators control. */
    if (state.phase === "survey") {
      var afford = S.affordableVisits(state, d.id);
      rule(x, y + 4, PANEL.x + PANEL.w - 16, y + 4, PALETTE.rule);
      y += 22;

      var canSend = afford > 0 && state.day < state.days;
      text("Send enumerators", x, y, { font: "bold 11px Georgia, serif", color: PALETTE.dim });
      y += 20;

      var count = ui.pending || 10;
      var cost = S.visitCost(d, state.levelIndex) * count;

      text("−", x + 10, y + 6, { font: "bold 16px Georgia, serif",
        align: "center", color: canSend && count > 1 ? PALETTE.gold : PALETTE.faint });
      text(String(count), x + 52, y + 8, { font: "bold 18px Georgia, serif", align: "center" });
      text("+", x + 94, y + 6, { font: "bold 16px Georgia, serif",
        align: "center", color: canSend && count < afford ? PALETTE.gold : PALETTE.faint });

      /* Cheaper and dearer buttons: the honest way to say "a big sample
         costs proportionally more". */
      text("fewer", x + 136, y + 6, { font: "11px Georgia, serif", color: PALETTE.dim });
      text("more", x + 232, y + 6, { font: "11px Georgia, serif", color: PALETTE.dim });

      y += 24;
      var affordMsg = cost <= state.money
        ? money(cost) + " of " + money(state.money)
        : money(cost) + " — you do not have it";
      text(affordMsg, x, y, { font: "12px Georgia, serif",
        color: cost <= state.money ? PALETTE.dim : PALETTE.bad });
      y += 24;

      if (afford === 0) {
        text("The treasury is empty.", x, y,
          { font: "12px Georgia, serif", color: PALETTE.bad });
      } else if (state.day >= state.days) {
        text("The return is due. Publish what you have.", x, y,
          { font: "12px Georgia, serif", color: PALETTE.warn });
      } else {
        text("cost " + money(S.visitCost(d, state.levelIndex)) + " each · " +
          "you can afford " + afford, x, y,
          { font: "12px Georgia, serif", color: PALETTE.dim });
      }
    }
  }

  /* Wrap text to a pixel width and return the y below the last line. The
   canvas has no text layout engine, so this measures. */
function wrapped(x, y, str, maxW, lineH, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = opts.font || "12px Georgia, serif";
    var words = String(str).split(/\s+/);
    var line = "";
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        text(line, x, y, opts);
        y += lineH;
        line = w;
      } else line = test;
    });
    if (line) { text(line, x, y, opts); y += lineH; }
    ctx.restore();
    return y;
  }

  /* ---------- the strip below ---------- */

  function drawBelow() {
    box(BELOW.x, BELOW.y, BELOW.w, BELOW.h, PALETTE.card);
    var est = S.estimate(state);
    var top = BELOW.y + 18;
    var bottom = BELOW.y + BELOW.h - 8;

    /* Three columns, sharing the strip: the figure, the interval, and the
       hole in the return. Positions are fractions of the strip width so
       nothing collides at any canvas size. */
    var colW = BELOW.w / 3;

    text("YOUR RETURN", BELOW.x + 14, top,
      { font: "bold 11px Georgia, serif", color: PALETTE.dim });

    if (est.sampledCount === 0) {
      text("Nothing surveyed. The return is blank.", BELOW.x + 14, top + 30,
        { font: "15px Georgia, serif", color: PALETTE.bad });
    } else {
      text(num(est.total), BELOW.x + 14, top + 34,
        { font: "bold 28px Georgia, serif" });
      wrapped(BELOW.x + 16, top + 52,
        "± " + num(est.totalMargin) + " at " + est.coverage + "% confidence",
        colW - 34, 14, { font: "11px Georgia, serif", color: PALETTE.dim });

      /* The interval as a bar with the point estimate on it, so the
         uncertainty reads as a shape rather than a parenthetical. */
      var gx = BELOW.x + colW + 14, gw = colW - 34;
      var gy = top + 34;
      text("INTERVAL", gx, top, { font: "bold 11px Georgia, serif", color: PALETTE.dim });
      rule(gx, gy, gx + gw, gy, PALETTE.grid);
      box(gx + gw * 0.2, gy - 3, gw * 0.6, 6, PALETTE.rule);
      var midX = gx + gw * 0.5;
      box(midX - 2, gy - 9, 4, 18, PALETTE.gold);
      text(num(Math.max(0, est.totalLow)), gx, gy + 20,
        { font: "11px Georgia, serif", color: PALETTE.dim });
      text(num(est.totalHigh), gx + gw, gy + 20,
        { font: "11px Georgia, serif", color: PALETTE.dim, align: "right" });
      wrapped(gx, gy + 34,
        est.unsampledCount
          ? "your total omits the unvisited wards entirely"
          : "every ward is covered",
        gw, 13, { font: "11px Georgia, serif", color: PALETTE.dim });
    }

    /* The hole in the return, named. This is the honest part: the player is
       told exactly which wards are absent from their own figure. */
    var hx = BELOW.x + colW * 2 + 14;
    text("NOT VISITED", hx, top,
      { font: "bold 11px Georgia, serif", color: PALETTE.dim });
    if (est.unsampledCount === 0) {
      text("every ward", hx, top + 30, { font: "14px Georgia, serif", color: PALETTE.good });
    } else {
      var names = est.unsampledNames.slice(0, 3).join(", ");
      if (est.unsampledCount > 3) names += " +" + (est.unsampledCount - 3);
      var ny = wrapped(hx, top + 28, names, BELOW.w - colW * 2 - 30, 15,
        { font: "13px Georgia, serif", color: PALETTE.warn });
      /* With nothing surveyed there is no basis for guessing what is
         missing, so the page says so rather than printing a confident 0. */
      if (est.sampledCount === 0) {
        wrapped(hx, ny + 2, "you have no basis for guessing what is missing.",
          BELOW.w - colW * 2 - 30, 13, { font: "11px Georgia, serif", color: PALETTE.dim });
      } else {
        wrapped(hx, ny + 2, "if they are average you are out by roughly " +
          num(est.impliedUnsampled) + ".",
          BELOW.w - colW * 2 - 30, 13, { font: "11px Georgia, serif", color: PALETTE.dim });
      }
    }
    void bottom;
  }

  /* ---------- publish ---------- */

  function drawPublish() {
    box(MAP.x, MAP.y, MAP.w, MAP.h, PALETTE.card);
    box(PANEL.x, PANEL.y, PANEL.w, PANEL.h, PALETTE.card);
    var r = state.result;
    if (!r) return;

    var verdictColour = r.verdict === "accepted" ? PALETTE.good
      : (r.verdict === "questioned" ? PALETTE.warn : PALETTE.bad);
    var verdict = r.verdict === "accepted" ? "RETURN ACCEPTED"
      : (r.verdict === "questioned" ? "RETURN QUESTIONED" : "RETURN REJECTED");

    var x = MAP.x + 16, wrapA = MAP.w - 32;
    text(verdict, x, MAP.y + 28,
      { font: "bold 18px Georgia, serif", color: verdictColour });

    /* The reveal: only now does the player learn the truth. */
    var y = MAP.y + 58;
    text("you published", x, y, { font: "12px Georgia, serif", color: PALETTE.dim });
    text(num(r.published), x, y + 26, { font: "bold 26px Georgia, serif" });
    y += 52;

    text("the city holds", x, y, { font: "12px Georgia, serif", color: PALETTE.dim });
    text(num(r.truth), x, y + 26,
      { font: "bold 26px Georgia, serif", color: PALETTE.gold });
    y += 50;

    var errCol = Math.abs(r.error) <= r.margin ? PALETTE.good : PALETTE.bad;
    y = wrapped(x, y, "you were out by " + num(Math.abs(r.error)) +
      " (" + Math.round(r.relError * 100) + "%)", wrapA, 17,
      { font: "14px Georgia, serif", color: errCol });
    y = wrapped(x, y + 4, "your interval was ± " + num(r.margin) +
      " — " + (r.didTheErrorFallInside
        ? "the truth landed inside it."
        : "the truth landed outside it."),
      wrapA, 15, { font: "12px Georgia, serif", color: PALETTE.dim });

    /* The Board says why, in the Board's words. This is the only place the
       game is allowed to be explicit about the lesson. */
    y += 26;
    rule(x, y, MAP.x + MAP.w - 16, y, PALETTE.rule);
    y += 22;
    var lesson;
    if (r.covered < r.required) {
      lesson = "The Board does not want a guess. You gave them " + r.covered +
        " of the " + r.required + " wards you promised to count, and a " +
        "number built from part of a city is not a census.";
    } else if (!r.didTheErrorFallInside) {
      lesson = "Your interval did not contain the truth. That is not bad luck: " +
        "it is what happens when the households that refuse are not like the " +
        "ones that answer, and no interval can cover a bias.";
    } else if (r.maxDistrictError > 0.3) {
      lesson = "Your total landed inside its interval, but at least one ward " +
        "is badly wrong. A confident city-wide figure is hiding a bad ward.";
    } else {
      lesson = "The return is accepted. Your interval held, and the wards you " +
        "visited came out close.";
    }
    wrapped(x, y, lesson, wrapA, 19,
      { font: "italic 14px Georgia, serif", color: PALETTE.ink });

    /* The lesson, in the only terms that were true before the reveal. */
    var px = PANEL.x + 16, wrapB = PANEL.w - 32;
    var py = PANEL.y + 26;
    py = wrapped(px, py, "You answered " + Math.round(r.responseOverall * 100) +
      "% of the doors you knocked on.", wrapB, 16,
      { font: "13px Georgia, serif", color: PALETTE.dim });

    var gap = r.responseGap;
    if (Math.abs(gap) > 0.05) {
      py = wrapped(px, py + 4, "The city as a whole answers " +
        Math.round(r.trueWeightedResponse * 100) + "%.",
        wrapB, 16, { font: "13px Georgia, serif", color: PALETTE.warn });
      py = wrapped(px, py + 2, gap > 0
        ? "You heard from more people than average — the ones you missed were smaller."
        : "You heard from fewer people than average — the ones you missed were larger.",
        wrapB, 16, { font: "13px Georgia, serif", color: PALETTE.warn });
    } else {
      py = wrapped(px, py + 4, "Close to the city's own rate. No systematic gap.",
        wrapB, 16, { font: "13px Georgia, serif", color: PALETTE.good });
    }

    py += 14;
    rule(px, py, PANEL.x + PANEL.w - 16, py, PALETTE.rule);
    py = wrapped(px, py + 18,
      "Doors knocked " + num(r.visits) + " · refused " + num(r.refusals) +
      " · spent " + money(r.spent),
      wrapB, 16, { font: "12px Georgia, serif", color: PALETTE.dim });
    py = wrapped(px, py + 2, "Wards covered " + r.covered + " of " + r.required +
      " required by the Board",
      wrapB, 16, { font: "12px Georgia, serif",
        color: r.covered >= r.required ? PALETTE.good : PALETTE.bad });

    /* Per-ward truth. Showing which wards you got wrong is the lesson; a
       single city-wide error number leaves the player with nothing to
       learn from. */
    py += 26;
    rule(px, py, PANEL.x + PANEL.w - 16, py, PALETTE.rule);
    py += 20;
    text("WHERE YOU WERE WRONG", px, py,
      { font: "bold 11px Georgia, serif", color: PALETTE.dim });
    py += 16;

    var rows = r.districtErrors.slice().sort(function (a, b) {
      return b.relError - a.relError;
    });
    rows.forEach(function (row) {
      if (py > PANEL.y + PANEL.h - 16) return;
      var col = row.relError < 0.1 ? PALETTE.good
        : (row.relError < 0.25 ? PALETTE.warn : PALETTE.bad);
      text(row.name, px, py, { font: "12px Georgia, serif" });
      text(num(row.estimate), px + wrapB * 0.45, py,
        { font: "12px Georgia, serif", align: "right", color: PALETTE.dim });
      text("vs " + num(row.truth), px + wrapB * 0.72, py,
        { font: "12px Georgia, serif", align: "right", color: PALETTE.dim });
      text(Math.round(row.relError * 100) + "%", px + wrapB, py,
        { font: "bold 12px Georgia, serif", align: "right", color: col });
      py += 16;
    });

    var missed = state.districts.filter(function (d) { return !d.sampled; });
    if (missed.length && py <= PANEL.y + PANEL.h - 16) {
      text("never visited:", px, py,
        { font: "12px Georgia, serif", color: PALETTE.warn });
      wrapped(px + 96, py,
        missed.map(function (d) { return d.name; }).join(", "),
        wrapB - 100, 15, { font: "12px Georgia, serif", color: PALETTE.warn });
    }
  }

  /* ---------- toolbar ---------- */

  /* The toolbar's contents, derived from the phase so the drawing and the
   hit-testing can never disagree about what is on it. */
function toolbarItems() {
    if (state.phase === "survey" || state.phase === "briefing") {
      return [["map", "City"], ["claim", "Claim"], ["publish", "File the return"]];
    }
    return [["again", "Try this year again"], ["levels", "Another year"]];
}

  function toolbarWidths() {
    return toolbarItems().map(function (it) {
      return 26 + it[1].length * 7.4;
    });
  }

  function drawToolbar() {
    var y = TOOL.y + 4;
    var x = TOOL.x;
    var items = toolbarItems();
    toolbarWidths().forEach(function (w, i) {
      var id = items[i][0];
      var isAccent = id === "publish" || id === "again";
      var active = id === "publish" || id === "again" ||
        (id === "map" && state.phase === "survey");
      box(x, y, w, 22, isAccent ? PALETTE.gold : PALETTE.faint,
        active ? PALETTE.rule : null);
      text(items[i][1], x + w / 2, y + 15,
        { font: "12px Georgia, serif", align: "center",
          color: isAccent ? PALETTE.ink2 : PALETTE.ink });
      x += w + 6;
    });
  }

  function hitToolbar(p) {
    var items = toolbarItems();
    var x = TOOL.x;
    var widths = toolbarWidths();
    for (var i = 0; i < items.length; i++) {
      if (inRect(p, { x: x, y: TOOL.y + 4, w: widths[i], h: 22 })) return items[i][0];
      x += widths[i] + 6;
    }
    return null;
  }

  /* ---------- the briefing ---------- */

  function drawBriefing() {
    box(0, 0, W, H, PALETTE.paper);
    var lv = state.level;
    var margin = Math.max(20, Math.min(46, W * 0.05));
    var colW = W - margin * 2;

    text("CENSUS", margin, TOOL.y + 56,
      { font: "bold 32px Georgia, serif", color: PALETTE.gold });
    text(lv.year + " · " + lv.name.toUpperCase(), margin, TOOL.y + 80,
      { font: "12px Georgia, serif", color: PALETTE.dim });
    rule(margin, TOOL.y + 94, W - margin, TOOL.y + 94, PALETTE.rule);

    var y = wrapped(margin, TOOL.y + 130, lv.blurb, colW, 26,
      { font: "16px Georgia, serif" });

    y += 20;
    y = wrapped(margin, y, lv.hint, colW, 22,
      { font: "italic 15px Georgia, serif", color: PALETTE.gold });

    y += 30;
    /* The three numbers, in as many columns as fit. */
    var cells = [["BUDGET", money(lv.budget)], ["DAYS", String(lv.days)],
                 ["WARDS", String(lv.kinds.length)]];
    if (lv.target.minDistricts > 0) cells.push(["REQUIRED", String(lv.target.minDistricts)]);
    var cellW = colW / cells.length;
    cells.forEach(function (c, i) {
      var cx = margin + i * cellW;
      text(c[0], cx, y, { font: "bold 11px Georgia, serif", color: PALETTE.dim });
      text(c[1], cx, y + 28, {
        font: "bold 26px Georgia, serif",
        color: i === cells.length - 1 && cells.length === 4 ? PALETTE.gold : PALETTE.ink
      });
    });

    y += 66;
    /* You are not told the population. That is the entire job. */
    wrapped(margin, y,
      "Nobody has told you how many people live here, and nobody will tell " +
      "you until after you have committed a number to paper.",
      colW, 20, { font: "13px Georgia, serif", color: PALETTE.dim });

    drawToolbar();
  }

  /* ---------- level select ---------- */

  function drawLevels() {
    box(0, 0, W, H, PALETTE.paper);
    var margin = Math.max(16, Math.min(40, W * 0.045));
    text("THE RETURNS", margin, TOOL.y + 58,
      { font: "bold 26px Georgia, serif", color: PALETTE.gold });
    rule(margin, TOOL.y + 72, W - margin, TOOL.y + 72, PALETTE.rule);

    /* Size the rows to the space left, so five of them always fit. */
    var top = TOOL.y + 92;
    var avail = H - top - 14;
    var h = Math.min(66, (avail - 4 * 8) / S.LEVELS.length);
    var y = top;
    S.LEVELS.forEach(function (lv, i) {
      var unlocked = i <= state.levelIndex;
      box(margin, y, W - margin * 2, h, unlocked ? PALETTE.card : PALETTE.paper,
        unlocked ? PALETTE.rule : PALETTE.faint);
      text(String(lv.year), margin + 16, y + h * 0.42,
        { font: "bold 15px Georgia, serif", color: unlocked ? PALETTE.gold : PALETTE.dim });
      text(lv.name, margin + 70, y + h * 0.42,
        { font: "15px Georgia, serif", color: unlocked ? PALETTE.ink : PALETTE.dim });
      text("£" + lv.budget + " · " + lv.days + " days · " + lv.kinds.length + " wards",
        margin + 70, y + h * 0.75, { font: "12px Georgia, serif", color: PALETTE.dim });
      if (!unlocked) {
        text("locked", W - margin - 16, y + h * 0.5,
          { font: "12px Georgia, serif", color: PALETTE.dim, align: "right" });
      }
      lv.hit = { x: margin, y: y, w: W - margin * 2, h: h };
      y += h + 8;
    });
    drawToolbar();
  }

  /* ---------- main draw ---------- */

  function draw() {
    if (!state) return;
    clear();
    if (state.phase === "briefing") { drawBriefing(); return; }
    if (state.phase === "levels") { drawLevels(); return; }

    drawHeader();

    if (state.phase === "graded") {
      drawPublish();
    } else {
      drawMap();
      drawPanel();
      drawBelow();
    }

    drawToolbar();

    /* The transient message, drawn last so nothing paints over it. */
    if (ui.flash) {
      ctx.save();
      ctx.globalAlpha = 0.96;
      var tw = ctx.measureText(ui.flash).width;
      box(W / 2 - tw / 2 - 14, H - 34, tw + 28, 24, PALETTE.card, PALETTE.rule);
      text(ui.flash, W / 2, H - 18, { font: "13px Georgia, serif", align: "center" });
      ctx.restore();
    }
  }

  /* ---------- input ---------- */

  function pointAt(ev) {
    var rect = cv.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (W / rect.width),
      y: (ev.clientY - rect.top) * (H / rect.height)
    };
  }

  function inRect(p, r) {
    return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function hitDistrict(p) {
    for (var i = 0; i < state.districts.length; i++) {
      var d = state.districts[i];
      if (Math.abs(p.x - d.px) <= d.cw / 2 && Math.abs(p.y - d.py) <= d.ch / 2) {
        return d;
      }
    }
    return null;
  }

  function send(n) {
    var d = state.districts[ui.selected];
    if (!d) return;
    var r = S.survey(state, d.id, n);
    if (!r.ok) {
      flash(r.why || "Not possible.");
      return;
    }
    ui.pending = null;
    ui.flash = "Day " + state.day + ": " + d.name + " — " +
      r.sample.answered + " of " + r.sample.visited + " doors answered.";
  }

  var flashTimer = null;
  function flash(msg) {
    ui.flash = msg;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { ui.flash = null; }, 2600);
  }

  function onDown(ev) {
    ev.preventDefault();
    if (!state) return;
    var p = pointAt(ev);

    if (state.phase === "levels") {
      for (var i = 0; i < S.LEVELS.length; i++) {
        if (inRect(p, S.LEVELS[i].hit) && i <= state.levelIndex) {
          start(S.LEVELS[i].id, state.seed);
        }
      }
      var t = hitToolbar(p);
      if (t === "again") start(state.level.id, state.seed);
      return;
    }

    if (state.phase === "briefing") {
      var tb = hitToolbar(p);
      /* The briefing's toolbar is the same one the survey uses, so the
         player has one set of words to learn rather than two. */
      if (tb === "map" || tb === "publish") { begin(); draw(); return; }
      if (tb === "claim") { cycleConfidence(); draw(); return; }
      if (tb === "levels") { state.phase = "levels"; draw(); return; }
      draw();
      return;
    }

    var tool = hitToolbar(p);
    if (tool === "claim") { cycleConfidence(); draw(); return; }
    if (tool === "publish") { doPublish(); return; }
    if (tool === "again") { start(state.level.id, state.seed); return; }
    if (tool === "levels") { state.phase = "levels"; draw(); return; }

    if (state.phase === "graded") { draw(); return; }

    /* City map */
    var d = hitDistrict(p);
    if (d) {
      ui.selected = d.id;
      ui.pending = Math.min(10, S.affordableVisits(state, d.id));
      draw();
      return;
    }

    /* Panel controls. Layout mirrors drawPanel(): the stepper and the
       cheaper/dearer buttons sit on one row, and the send button below
       them. Hit boxes are derived from the same constants the drawing
       uses, so they cannot drift apart from what is on screen. */
    var d2 = state.districts[ui.selected];
    if (!d2) return;
    var x = PANEL.x + 16;

    /* Recompute the vertical position the panel used, so the hit zone
       follows the content rather than a hardcoded offset. */
    var rows = S.estimate(state).rows[ui.selected];
    var pos = panelRows(rows.sampled);
    var stepperY = pos.stepper;
    var btnY = pos.buttons;

    var affordable = S.affordableVisits(state, d2.id);
    var cur = ui.pending || 10;

    /* −/+ stepper */
    if (p.y >= stepperY - 14 && p.y <= stepperY + 14) {
      if (p.x >= x && p.x < x + 30) {
        ui.pending = Math.max(1, cur - 5); draw(); return;
      }
      if (p.x >= x + 74 && p.x < x + 114) { send(cur); return; }
      if (p.x >= x + 110 && p.x < x + 156) {
        ui.pending = Math.min(Math.max(affordable, 1), cur + 5); draw(); return;
      }
    }

    /* fewer / more */
    if (p.y >= btnY - 12 && p.y <= btnY + 12) {
      if (p.x >= x + 110 && p.x < x + 200) {
        ui.pending = Math.max(1, cur - 5); draw(); return;
      }
      if (p.x >= x + 205 && p.x < x + 300) {
        ui.pending = Math.min(Math.max(affordable, 1), cur + 5); draw(); return;
      }
    }

    /* send */
    if (p.y >= btnY + 12) {
      send(cur);
    }
  }

  function cycleConfidence() {
    /* The Board sets the confidence level on the early returns and lets the
       player over-claim on the later ones, where the tension is that a
       wider interval can rescue an estimate that would otherwise fail. */
    if (state.levelIndex < 3) {
      flash("The Board has fixed the confidence level at "
        + state.confidence + "% for this return.");
      return;
    }
    var levels = [80, 90, 95, 99];
    var i = levels.indexOf(state.confidence);
    state.confidence = levels[(i + 1) % levels.length];
    flash("Claiming " + state.confidence + "% confidence — the interval widens, "
      + "but the Board is impressed.");
  }

  function doPublish() {
    if (state.phase !== "survey") return;
    var r = S.publish(state);
    if (!r) return;
    if (R2 && R2.stats) {
      R2.stats.run({
        slug: "census-pwa/",
        score: Math.round(1000000 * (1 - Math.min(1, r.relError * 4))),
        durMs: (state.day || 1) * 1000,
        wave: state.levelIndex,
        outcome: r.verdict,
        meta: { relError: r.relError, covered: r.covered, visits: r.visits }
      });
    }
    draw();
  }

  /* ---------- lifecycle ---------- */

  function start(levelId, seed) {
    var idx = S.LEVELS.findIndex(function (l) { return l.id === levelId; });
    if (idx < 0) idx = 0;
    state = S.create(idx, seed);
    /* The briefing is the first thing a player sees. create() returns a
       live survey, so the phase is set here — without this the briefing
       screen was unreachable and every game opened mid-round. */
    state.phase = "briefing";
    ui.selected = 0;
    ui.pending = 10;
    ui.flash = null;
    layout();
    draw();
  }

  function begin() {
    state.phase = "survey";
    draw();
  }

  function resize() {
    cv.width = Math.round(cv.clientWidth * Math.min(window.devicePixelRatio || 1, 2));
    cv.height = Math.round(cv.clientHeight * Math.min(window.devicePixelRatio || 1, 2));
    W = cv.clientWidth || 900;
    H = cv.clientHeight || 620;
    layout();
    draw();
  }

  function boot() {
    cv = document.getElementById("city");
    ctx = cv.getContext("2d");
    if (!cv || !S) {
      document.body.innerHTML =
        '<p style="padding:2rem;font-family:Georgia,serif;color:#e9e3d3">' +
        'CENSUS could not start: sim.js failed to load.</p>';
      return;
    }

    var stored = R2 ? R2.loadJSON("census-save", null) : null;
    var seed = R2 ? R2.dailySeed() : 20260101;
    var levelId = "primo";
    if (stored && stored.level) {
      levelId = stored.level;
      if (stored.unlocked > 0) {
        var i = S.LEVELS.findIndex(function (l) { return l.id === levelId; });
        if (i < stored.unlocked) start(levelId, seed);
      }
    }
    start(levelId, seed);

    if (R2) {
      R2.markPlayed("census-pwa/");
      R2.trackPlaytime("census-pwa/");
    }

    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    window.addEventListener("resize", resize);

    /* Test seam. The smoke test drives the game through this rather than
       guessing pixel coordinates, which is how it was catching layout
       changes as failures. It exposes only what a player can already do. */
    window.__census = {
      state: function () { return state; },
      rects: function () { return { MAP: MAP, PANEL: PANEL, BELOW: BELOW, TOOL: TOOL, W: W, H: H }; },
      /* Centre of a ward, in canvas coordinates. */
      wardPoint: function (i) {
        var d = state.districts[i];
        return d ? { x: d.px, y: d.py } : null;
      },
      /* Centre of a toolbar button, in canvas coordinates. */
      toolPoint: function (id) {
        var items = toolbarItems(), x = TOOL.x, widths = toolbarWidths();
        for (var i = 0; i < items.length; i++) {
          if (items[i][0] === id) return { x: x + widths[i] / 2, y: TOOL.y + 15 };
          x += widths[i] + 6;
        }
        return null;
      },
      panelPoint: function () {
        var rows = S.estimate(state).rows[ui.selected];
        var pos = panelRows(rows.sampled);
        var x = PANEL.x + 16;
        /* These must match the hit boxes in onDown: the send target sits
           in the middle of the stepper, the "+" on its right. */
        return {
          send: { x: x + 94, y: pos.stepper },
          more: { x: x + 133, y: pos.stepper },
          fewer: { x: x + 15, y: pos.stepper },
          cheaper: { x: x + 155, y: pos.buttons },
          dearer: { x: x + 252, y: pos.buttons }
        };
      },
      start: start,
      begin: begin,
      draw: draw
    };

    var help = document.getElementById("help");
    document.getElementById("help-btn").addEventListener("click", function () {
      if (help && help.showModal) help.showModal();
    });
    document.addEventListener("visibilitychange", function () {
      if (!R2) return;
      R2.saveJSON("census-save", { level: state.level.id, unlocked: state.levelIndex });
    });
    resize();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else boot();
})();