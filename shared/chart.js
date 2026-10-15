/*
 * random2 · shared chart micro-library
 * -------------------------------------
 * Zero-dependency Canvas 2D charts for the hub, the stats dashboard and any
 * game that wants a real plot instead of hand-rolled curves.
 *
 *   line() · area() · bar() · histogram() · scatter()
 *   boxplot() · heatmap() · sparkline()
 *
 * Design rules, in order of priority:
 *   1. Correct axes. Ticks land on round numbers, the zero line is drawn,
 *      and a series never implies a range it does not have.
 *   2. Legible on a phone. Default type size, no hairline text.
 *   3. No motion when prefers-reduced-motion is set.
 *   4. Dark-mode aware via CSS custom properties, so the charts follow the
 *      hub theme toggle without a re-render.
 *
 * Loaded as a plain script (no modules) so every game stays a static site:
 *   <script src="../shared/chart.js"></script>
 * Exposes a single global: window.R2Chart
 */
(function () {
  "use strict";

  var reduced = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- theme ----------
     Read from CSS custom properties when available so a theme switch is
     picked up on the next frame; fall back to a neutral ink palette. */
  var FALLBACK = {
    ink: "#e8eaf2",
    dim: "#8b93a7",
    grid: "rgba(255,255,255,0.10)",
    axis: "rgba(255,255,255,0.28)",
    surface: "rgba(255,255,255,0.05)"
  };

  var INK_FALLBACK = "#5b8def";

  /*
   * Resolve a colour to something the canvas will actually accept.
   *
   * Canvas does not understand CSS var(): assigning "var(--accent)" to
   * ctx.strokeStyle silently leaves the colour unchanged, so the chart draws
   * in whatever was there before — black on a light card. Callers should be
   * able to pass a theme token by name and get the right colour, so resolve
   * the variable here and let anything unresolvable fall through.
   */
  function resolveColor(c, fallback) {
    if (c === undefined || c === null || c === "") {
      return fallback === undefined ? null : fallback;
    }
    if (c.charAt(0) !== "v" || c.indexOf("(") !== 3) return c;
    /* "var(--x)" is 4 characters of prefix, so slice(4, -1) strips the
       "var(" and the closing ")" and leaves "--x". */
    var name = c.slice(4, -1);
    var v = cssVar(name, "");
    return v || (fallback === undefined ? null : fallback);
  }

  function cssVar(name, fallback) {
    try {
      var el = document.documentElement;
      if (!el || !window.getComputedStyle) return fallback;
      var v = window.getComputedStyle(el).getPropertyValue(name);
      return (v && v.trim()) ? v.trim() : fallback;
    } catch (e) { return fallback; }
  }

  function theme(opts) {
    opts = opts || {};
    var t = opts.theme || {};
    return {
      ink: t.ink || cssVar("--chart-ink", FALLBACK.ink),
      dim: t.dim || cssVar("--chart-dim", FALLBACK.dim),
      grid: t.grid || cssVar("--chart-grid", FALLBACK.grid),
      axis: t.axis || cssVar("--chart-axis", FALLBACK.axis),
      surface: t.surface || cssVar("--chart-surface", FALLBACK.surface),
      font: t.font || "12px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"
    };
  }

  /* ---------- canvas ---------- */

  /*
   * Sets up a device-pixel-ratio-correct canvas and returns a drawing
   * surface. Caller supplies CSS pixels; `pad` is the outer margin.
   */
  function frame(canvas, opts) {
    opts = opts || {};
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = opts.width || canvas.clientWidth || 300;
    var h = opts.height || canvas.clientHeight || 150;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (canvas.style) {
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function text(ctx, s, x, y, color, align, font, baseline) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = align || "left";
    ctx.textBaseline = baseline || "middle";
    ctx.fillText(String(s), x, y);
    ctx.restore();
  }

  /* ---------- scales ---------- */

  function extent(values, opts) {
    opts = opts || {};
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (v == null || !isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (opts.min != null) lo = opts.min;
    if (opts.max != null) hi = opts.max;
    if (opts.zeroBase && lo > 0) lo = 0;
    if (hi === lo) { hi = lo + 1; }
    return { lo: lo, hi: hi };
  }

  /* Round tick steps: 1, 2, 5 x 10^n. */
  function niceStep(span, target) {
    if (span <= 0) return 1;
    var raw = span / Math.max(1, target || 5);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 5) step = 5;
    else step = 10;
    return step * mag;
  }

  function ticks(lo, hi, count) {
    var step = niceStep(hi - lo, count);
    var start = Math.ceil(lo / step) * step;
    var out = [];
    /* Guard against a pathological step producing an unbounded loop. */
    for (var v = start, i = 0; v <= hi + step * 1e-6 && i < 200; v += step, i++) {
      out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    }
    return out;
  }

  /* Compact number formatting: 1200 -> "1.2k", 3400000 -> "3.4M". */
  function fmt(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    if (a > 0 && a < 1) return v.toFixed(2).replace(/0$/, "");
    return String(Math.round(v * 100) / 100);
  }

  /* ---------- axes ---------- */

  function axes(ctx, box, x, y, t, opts) {
    opts = opts || {};
    var xt = opts.xTicks || ticks(x.lo, x.hi, opts.xTickCount || 4);
    var yt = opts.yTicks || ticks(y.lo, y.hi, opts.yTickCount || 4);

    ctx.save();
    ctx.lineWidth = 1;

    /* horizontal grid */
    ctx.strokeStyle = t.grid;
    for (var i = 0; i < yt.length; i++) {
      var py = Math.round(y.scale(yt[i])) + 0.5;
      ctx.beginPath();
      ctx.moveTo(box.x, py);
      ctx.lineTo(box.x + box.w, py);
      ctx.stroke();
      text(ctx, opts.yFormat ? opts.yFormat(yt[i]) : fmt(yt[i]),
        box.x - 6, py, t.dim, "right", t.font);
    }

    /* vertical grid */
    if (opts.xGrid !== false) {
      for (var j = 0; j < xt.length; j++) {
        var px = Math.round(x.scale(xt[j])) + 0.5;
        if (px < box.x || px > box.x + box.w) continue;
        ctx.beginPath();
        ctx.moveTo(px, box.y);
        ctx.lineTo(px, box.y + box.h);
        ctx.stroke();
        if (opts.xLabel) {
          text(ctx, opts.xFormat ? opts.xFormat(xt[j]) : fmt(xt[j]),
            px, box.y + box.h + 12, t.dim, "center", t.font);
        }
      }
    }

    /* baseline: emphasised only when it is actually zero, so a chart of
       scores starting at 400 does not imply an empty band below. */
    if (y.lo <= 0 && y.hi >= 0) {
      var zy = Math.round(y.scale(0)) + 0.5;
      ctx.strokeStyle = t.axis;
      ctx.beginPath();
      ctx.moveTo(box.x, zy);
      ctx.lineTo(box.x + box.w, zy);
      ctx.stroke();
    }
    ctx.restore();

    return { xTicks: xt, yTicks: yt };
  }

  function padding(opts, t) {
    opts = opts || {};
    /* Left margin has to clear the widest y label; measure, do not guess. */
    var probe = document.createElement("canvas").getContext("2d");
    probe.font = t.font;
    var widest = 0;
    var e = opts.yExtent || { lo: 0, hi: 1 };
    var yt = ticks(e.lo, e.hi, 4);
    for (var i = 0; i < yt.length; i++) {
      var w = probe.measureText(opts.yFormat ? opts.yFormat(yt[i]) : fmt(yt[i])).width;
      if (w > widest) widest = w;
    }
    return {
      left: Math.ceil(widest) + 10,
      right: opts.padRight != null ? opts.padRight : 8,
      top: opts.padTop != null ? opts.padTop : 8,
      bottom: opts.xLabel ? 22 : (opts.padBottom != null ? opts.padBottom : 8)
    };
  }

  function scales(box, xe, ye, opts) {
    opts = opts || {};
    var spanX = xe.hi - xe.lo || 1;
    var spanY = ye.hi - ye.lo || 1;
    return {
      x: {
        lo: xe.lo, hi: xe.hi,
        scale: function (v) {
          return box.x + ((v - xe.lo) / spanX) * box.w;
        }
      },
      y: {
        lo: ye.lo, hi: ye.hi,
        scale: function (v) {
          return box.y + box.h - ((v - ye.lo) / spanY) * box.h;
        }
      }
    };
  }

  function boxOf(f, opts) {
    var t = opts._t;
    var pad = padding(opts, t);
    return {
      x: pad.left,
      y: pad.top,
      w: Math.max(1, f.w - pad.left - pad.right),
      h: Math.max(1, f.h - pad.top - pad.bottom)
    };
  }

  /* ---------- series ---------- */

  function color(opts, i) {
    var c = resolveColor(opts.color);
    if (c) return c;
    c = resolveColor(opts.colors && opts.colors[i]);
    if (c) return c;
    return cssVar("--c1", INK_FALLBACK);
  }

  function path(ctx, pts) {
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!p) continue;   /* gap in the series */
      if (!started) { ctx.moveTo(p[0], p[1]); started = true; }
      else ctx.lineTo(p[0], p[1]);
    }
    return started;
  }

  /* ---------- public charts ---------- */

  /*
   * line(canvas, series, opts)
   *   series: [{ name, points: [[x,y],...], color }]  — points may be null
   *   opts:   width, height, theme, color, colors, xExtent, yExtent,
   *           zeroBase, xLabel, yFormat, xFormat, smooth, dots, fill, box
   */
  function line(canvas, series, opts) {
    opts = opts || {};
    var f = frame(canvas, opts);
    var t = opts.theme ? theme(opts) : theme(opts);
    var ctx = f.ctx;

    var allX = [], allY = [];
    series.forEach(function (s) {
      (s.points || []).forEach(function (p) {
        if (p && isFinite(p[0]) && isFinite(p[1])) { allX.push(p[0]); allY.push(p[1]); }
      });
    });
    if (!allX.length) return empty(ctx, f, t, opts.empty || "No data yet");

    var xe = extent(allX, { min: opts.xExtent && opts.xExtent[0], max: opts.xExtent && opts.xExtent[1] });
    var ye = extent(allY, { min: opts.yExtent && opts.yExtent[0], max: opts.yExtent && opts.yExtent[1], zeroBase: opts.zeroBase !== false });
    var pad = padding(opts, t);
    var box = {
      x: pad.left, y: pad.top,
      w: Math.max(1, f.w - pad.left - pad.right),
      h: Math.max(1, f.h - pad.top - pad.bottom)
    };
    var s = scales(box, xe, ye);
    opts.yExtent = ye;
    axes(ctx, box, s.x, s.y, t, opts);

    series.forEach(function (ser, i) {
      var pts = (ser.points || []).map(function (p) {
        return (p && isFinite(p[0]) && isFinite(p[1])) ? [s.x.scale(p[0]), s.y.scale(p[1])] : null;
      });
      ctx.save();
      ctx.strokeStyle = resolveColor(ser.color) || color(opts, i);
      ctx.lineWidth = opts.lineWidth || 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (opts.fill) {
        path(ctx, pts);
        var first = null, last = null;
        for (var k = 0; k < pts.length; k++) { if (pts[k]) { if (!first) first = pts[k]; last = pts[k]; break; } }
        for (var m = pts.length - 1; m >= 0; m--) { if (pts[m]) { last = pts[m]; break; } }
        if (first && last) {
          ctx.lineTo(last[0], box.y + box.h);
          ctx.lineTo(first[0], box.y + box.h);
          ctx.closePath();
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = resolveColor(ser.color) || color(opts, i);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        path(ctx, pts);
      } else {
        if (!path(ctx, pts)) { ctx.restore(); return; }
      }
      ctx.stroke();
      if (opts.dots !== false && pts.length <= 60) {
        ctx.fillStyle = resolveColor(ser.color) || color(opts, i);
        for (var j = 0; j < pts.length; j++) {
          if (!pts[j]) continue;
          ctx.beginPath();
          ctx.arc(pts[j][0], pts[j][1], 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
    return legend(ctx, box, series, t, opts);
  }

  /* area() is line() with the fill defaulted on and no dots. */
  function area(canvas, series, opts) {
    opts = Object.assign({ fill: true, dots: false }, opts || {});
    return line(canvas, series, opts);
  }

  /*
   * bar(canvas, items, opts)
   *   items: [{ label, value, color }]
   */
  function bar(canvas, items, opts) {
    opts = opts || {};
    var f = frame(canvas, opts);
    var ctx = f.ctx;
    var t = theme(opts);
    if (!items || !items.length) return empty(ctx, f, t, opts.empty || "No data yet");

    var vals = items.map(function (d) { return d.value; });
    var xe = { lo: 0, hi: items.length };
    var ye = extent(vals, { min: opts.yExtent && opts.yExtent[0], max: opts.yExtent && opts.yExtent[1], zeroBase: opts.zeroBase !== false });
    var pad = padding(opts, t);
    var box = {
      x: pad.left, y: pad.top,
      w: Math.max(1, f.w - pad.left - pad.right),
      h: Math.max(1, f.h - pad.top - pad.bottom)
    };
    var s = scales(box, xe, ye);
    opts.yExtent = ye;
    /* A categorical bar chart draws its own labels under each bar, so the
       numeric x ticks would print on the same baseline and overprint them
       ("loss" landing on top of "0"). Suppress them for bars only. */
    var axisOpts = {};
    for (var k in opts) axisOpts[k] = opts[k];
    axisOpts.xLabel = false;
    axes(ctx, box, s.x, s.y, t, axisOpts);

    var slot = box.w / items.length;
    var bw = Math.max(1, Math.min(opts.maxBarWidth || 48, slot * 0.7));
    var zero = s.y.scale(0);
    /* Own measuring context: the one inside padding() is not in scope here. */
    var probe = document.createElement("canvas").getContext("2d");
    probe.font = t.font;
    var lastLabelRight = -Infinity;

    items.forEach(function (d, i) {
      var cx = box.x + slot * (i + 0.5);
      var vy = s.y.scale(d.value);
      var top = Math.min(vy, zero);
      var hgt = Math.abs(zero - vy);
      ctx.fillStyle = resolveColor(d.color) || color(opts, i);
      roundRect(ctx, cx - bw / 2, top, bw, Math.max(1, hgt), Math.min(3, bw / 2));
      ctx.fill();
      if (opts.valueLabels && slot > 34) {
        /* Clamp inside the plot: a bar that reaches the top of the scale
           would otherwise push its label off the canvas. */
        var vy2 = Math.max(9, top - 9);
        text(ctx, opts.yFormat ? opts.yFormat(d.value) : fmt(d.value),
          cx, vy2, t.dim, "center", t.font);
      }
      /* Labels are drawn at a fixed size, so on a narrow chart they outrun
         their slot and overprint the neighbour ("0 SunMon 2 Tue"). Draw the
         ones that fit, skipping any that would collide. */
      if (d.label && opts.xLabel !== false && slot > 26) {
        var half = probe.measureText(String(d.label)).width / 2;
        if (cx - half >= lastLabelRight + 4) {
          lastLabelRight = cx + half;
          text(ctx, d.label, cx, Math.min(f.h - 6, box.y + box.h + 12),
            t.dim, "center", t.font);
        }
      }
    });
    /* Returned so callers (histogram's mean marker, for one) can draw an
       overlay without re-framing the canvas and losing the bars. */
    return { box: box, x: s.x, y: s.y, itemWidth: slot };
  }

  /*
   * histogram(canvas, values, opts)
   *   Bins automatically (Sturges, floored at 6), unless opts.bins is given.
   */
  function histogram(canvas, values, opts) {
    opts = opts || {};
    opts.zeroBase = true;
    var vals = (values || []).filter(function (v) { return typeof v === "number" && isFinite(v); });
    if (!vals.length) {
      var f0 = frame(canvas, opts);
      return empty(f0.ctx, f0, theme(opts), opts.empty || "No runs recorded yet");
    }
    var ext = extent(vals, {});
    var nb = opts.bins || Math.max(6, Math.min(24, Math.ceil(Math.log2(vals.length) + 1)));
    var w = (ext.hi - ext.lo) / nb || 1;
    var bins = new Array(nb);
    for (var i = 0; i < nb; i++) bins[i] = 0;
    for (var j = 0; j < vals.length; j++) {
      var b = Math.min(nb - 1, Math.max(0, Math.floor((vals[j] - ext.lo) / w)));
      bins[b]++;
    }
    var items = bins.map(function (c, i) {
      return {
        label: opts.xLabel === false ? null : fmt(ext.lo + i * w),
        value: c,
        color: opts.color
      };
    });
    var geo = bar(canvas, items, opts);

    /* Mean marker: the one number a distribution reader wants first.
       binW is in data units, so the marker lands at mean in the same
       coordinate space as the bar labels. */
    var sum = 0;
    for (var m = 0; m < vals.length; m++) sum += vals[m];
    var mean = sum / vals.length;

    if (opts.markMean !== false && geo) {
      var ctx = canvas.getContext("2d");
      var t = theme(opts);
      /* Bars start at bin index i = floor((v-lo)/w), and bar i is centred in
         its slot, so data value v sits at (v-lo)/w + 0.5 slots from the
         left edge of the plot area. */
      var slots = (mean - ext.lo) / w + 0.5;
      var mx = geo.box.x + slots * geo.itemWidth;
      ctx.save();
      ctx.strokeStyle = opts.meanColor || t.ink;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mx, geo.box.y);
      ctx.lineTo(mx, geo.box.y + geo.box.h);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, opts.meanLabel || ("mean " + fmt(mean)),
        mx + 4, geo.box.y + 6, t.ink, "left", t.font);
      ctx.restore();
    }
    return { mean: mean, n: vals.length, binWidth: w };
  }

  /*
   * scatter(canvas, points, opts)
   *   points: [[x,y],...] — add opts.trend for a least-squares fit line.
   */
  function scatter(canvas, points, opts) {
    opts = opts || {};
    var f = frame(canvas, opts);
    var ctx = f.ctx;
    var t = theme(opts);
    var pts = (points || []).filter(function (p) {
      return p && isFinite(p[0]) && isFinite(p[1]);
    });
    if (!pts.length) return empty(ctx, f, t, opts.empty || "No data yet");

    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var xe = extent(xs, {});
    var ye = extent(ys, {});
    var pad = padding(opts, t);
    var box = {
      x: pad.left, y: pad.top,
      w: Math.max(1, f.w - pad.left - pad.right),
      h: Math.max(1, f.h - pad.top - pad.bottom)
    };
    var s = scales(box, xe, ye);
    opts.yExtent = ye;
    axes(ctx, box, s.x, s.y, t, opts);

    if (opts.trend) {
      var fit = leastSquares(pts);
      if (fit) {
        ctx.save();
        ctx.strokeStyle = t.dim;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(s.x.scale(fit.x0), s.y.scale(fit.y0 + fit.slope * fit.x0));
        ctx.lineTo(s.x.scale(fit.x1), s.y.scale(fit.y0 + fit.slope * fit.x1));
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.fillStyle = color(opts, 0);
    for (var i = 0; i < pts.length; i++) {
      var px = s.x.scale(pts[i][0]);
      var py = s.y.scale(pts[i][1]);
      ctx.beginPath();
      ctx.arc(px, py, opts.radius || 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Ordinary least squares, returned as y = y0 + slope*x plus r^2. */
  function leastSquares(pts) {
    var n = pts.length;
    if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      var x = pts[i][0], y = pts[i][1];
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    }
    var denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-12) return null;
    var slope = (n * sxy - sx * sy) / denom;
    var y0 = (sy - slope * sx) / n;
    var rNum = n * sxy - sx * sy;
    var r2 = (rNum * rNum) / (denom * (n * syy - sy * sy) || 1);
    var xs = pts.map(function (p) { return p[0]; });
    return {
      slope: slope, y0: y0, r2: isFinite(r2) ? r2 : 0,
      x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs)
    };
  }

  /*
   * boxplot(canvas, groups, opts)
   *   groups: [{ label, values: [...] }]
   */
  function boxplot(canvas, groups, opts) {
    opts = opts || {};
    var f = frame(canvas, opts);
    var ctx = f.ctx;
    var t = theme(opts);
    var gs = (groups || []).filter(function (g) { return g.values && g.values.length; });
    if (!gs.length) return empty(ctx, f, t, opts.empty || "No data yet");

    var all = [];
    gs.forEach(function (g) {
      g.values.forEach(function (v) { if (isFinite(v)) all.push(v); });
    });
    var ye = extent(all, { zeroBase: opts.zeroBase === true });
    var pad = padding(opts, t);
    var box = {
      x: pad.left, y: pad.top,
      w: Math.max(1, f.w - pad.left - pad.right),
      h: Math.max(1, f.h - pad.top - pad.bottom)
    };
    var xe = { lo: 0, hi: gs.length };
    var s = scales(box, xe, ye);
    opts.yExtent = ye;
    axes(ctx, box, s.x, s.y, t, opts);

    var slot = box.w / gs.length;
    var bw = Math.min(opts.maxBarWidth || 40, slot * 0.6);

    gs.forEach(function (g, i) {
      var st = summarise(g.values);
      var cx = box.x + slot * (i + 0.5);
      ctx.save();
      ctx.strokeStyle = color(opts, i);
      ctx.fillStyle = color(opts, i);
      ctx.lineWidth = 1.5;
      /* whiskers */
      ctx.beginPath();
      ctx.moveTo(cx, s.y.scale(st.whiskerLo));
      ctx.lineTo(cx, s.y.scale(st.q1));
      ctx.moveTo(cx, s.y.scale(st.q3));
      ctx.lineTo(cx, s.y.scale(st.whiskerHi));
      ctx.stroke();
      /* caps */
      ctx.beginPath();
      ctx.moveTo(cx - bw / 4, s.y.scale(st.whiskerLo));
      ctx.lineTo(cx + bw / 4, s.y.scale(st.whiskerLo));
      ctx.moveTo(cx - bw / 4, s.y.scale(st.whiskerHi));
      ctx.lineTo(cx + bw / 4, s.y.scale(st.whiskerHi));
      ctx.stroke();
      /* box, globalAlpha via a lighter fill so outliers stay readable */
      ctx.globalAlpha = 0.35;
      roundRect(ctx, cx - bw / 2, s.y.scale(st.q3), bw,
        Math.abs(s.y.scale(st.q1) - s.y.scale(st.q3)), 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      /* median */
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2, s.y.scale(st.median));
      ctx.lineTo(cx + bw / 2, s.y.scale(st.median));
      ctx.stroke();
      /* outliers */
      ctx.globalAlpha = 0.5;
      st.outliers.forEach(function (v) {
        ctx.beginPath();
        ctx.arc(cx, s.y.scale(v), 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.restore();
      if (g.label && slot > 26) {
        text(ctx, g.label, cx, box.y + box.h + 12, t.dim, "center", t.font);
      }
    });
    return gs.map(function (g) { return summarise(g.values); });
  }

  /* Five-number summary with 1.5 IQR whiskers (Tukey). */
  function summarise(values) {
    var v = values.filter(function (x) { return typeof x === "number" && isFinite(x); })
      .slice().sort(function (a, b) { return a - b; });
    var n = v.length;
    if (!n) return null;
    function q(p) {
      if (n === 1) return v[0];
      var idx = p * (n - 1);
      var lo = Math.floor(idx), hi = Math.ceil(idx);
      return v[lo] + (v[hi] - v[lo]) * (idx - lo);
    }
    var q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
    var loFence = q1 - 1.5 * iqr, hiFence = q3 + 1.5 * iqr;
    var inRange = v.filter(function (x) { return x >= loFence && x <= hiFence; });
    var outliers = v.filter(function (x) { return x < loFence || x > hiFence; });
    return {
      min: v[0], max: v[n - 1],
      q1: q1, median: q(0.5), q3: q3,
      whiskerLo: inRange.length ? inRange[0] : v[0],
      whiskerHi: inRange.length ? inRange[inRange.length - 1] : v[n - 1],
      outliers: outliers, n: n
    };
  }

  /*
   * heatmap(canvas, matrix, opts)
   *   matrix: rows x cols array of numbers, or objects {v, label}
   *   opts.rowLabels, opts.colLabels, opts.cell
   */
  function heatmap(canvas, matrix, opts) {
    opts = opts || {};
    var f = frame(canvas, opts);
    var ctx = f.ctx;
    var t = theme(opts);
    var rows = matrix || [];
    if (!rows.length) return empty(ctx, f, t, opts.empty || "No data yet");

    var lo = Infinity, hi = -Infinity;
    rows.forEach(function (r) {
      r.forEach(function (c) {
        var v = (c && typeof c === "object") ? c.v : c;
        if (typeof v === "number" && isFinite(v)) {
          if (v < lo) lo = v; if (v > hi) hi = v;
        }
      });
    });
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (lo === hi) hi = lo + 1;

    var probe = document.createElement("canvas").getContext("2d");
    probe.font = t.font;

    var labW = 0;
    if (opts.rowLabels) {
      opts.rowLabels.forEach(function (l) {
        var w = probe.measureText(String(l)).width;
        if (w > labW) labW = w;
      });
      labW = Math.ceil(labW) + 6;
    }

    var nCols = (rows[0] || []).length;
    /* Column labels sit above a subset of columns (e.g. every third hour),
       so the top band must be tall enough for the widest label and only as
       tall as one line — otherwise a sparse colLabels array gets packed
       together and reads as one run of digits. */
    var topH = 0;
    if (opts.colLabels) {
      var widestCol = 0;
      opts.colLabels.forEach(function (l) {
        if (l == null) return;
        var w = probe.measureText(String(l)).width;
        if (w > widestCol) widestCol = w;
      });
      /* Enough room for the text plus a gap of a third of the widest. */
      topH = Math.ceil(widestCol / 3) + 10;
    }

    var gap = opts.gap != null ? opts.gap : 2;
    var cell = opts.cell || Math.max(6, Math.min(
      opts.maxCell || 26,
      Math.floor((f.w - labW - 4 - (nCols - 1) * gap) / Math.max(nCols, 1))
    ));
    /* With no explicit cap the grid should still use the width it has:
       a 24-column heatmap left at 26 px cells stops two thirds of the way
       across a wide card, which reads as a rendering fault. */
    if (!opts.cell && !opts.maxCell) {
      var avail = f.w - labW - 4;
      var even = Math.floor((avail - (nCols - 1) * gap) / Math.max(nCols, 1));
      if (even > cell) cell = Math.min(40, even);
    }

    var palette = opts.palette || ["#1a2332", "#3b6ea5", "#5b8def", "#e8a924", "#e0342c"];
    var emptyFill = resolveColor(opts.emptyColor, t.grid);

    ctx.save();
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r] || [];
      for (var c = 0; c < row.length; c++) {
        var cellObj = row[c];
        var v = (cellObj && typeof cellObj === "object") ? cellObj.v : cellObj;
        var x = labW + c * (cell + gap);
        var y = topH + r * (cell + gap);
        if (typeof v !== "number" || !isFinite(v) || v === 0) {
          ctx.fillStyle = emptyFill;
        } else {
          var q = (v - lo) / (hi - lo);
          ctx.fillStyle = palette[Math.min(palette.length - 1,
            Math.floor(q * palette.length))];
        }
        roundRect(ctx, x, y, cell, cell, Math.min(3, cell / 3));
        ctx.fill();
        if (cellObj && cellObj.label && cell >= 22) {
          text(ctx, cellObj.label, x + cell / 2, y + cell / 2, t.ink, "center", t.font);
        }
      }
      if (opts.rowLabels && opts.rowLabels[r]) {
        text(ctx, opts.rowLabels[r], labW - 6,
          topH + r * (cell + gap) + cell / 2, t.dim, "right", t.font);
      }
    }

    /* Column labels go under the grid rather than above it: with labels every
       third column, putting them under gives each number the full width of
       the cell group to its left, and leaves the top edge clean. */
    if (opts.colLabels) {
      var gridBottom = topH + rows.length * (cell + gap);
      var cl, lastX = -Infinity;
      for (cl = 0; cl < nCols; cl++) {
        if (opts.colLabels[cl] == null) continue;
        var cx = labW + cl * (cell + gap) + cell / 2;
        /* Skip a label that would collide with the previous one rather than
           letting them overprint into an unreadable run of digits. */
        if (cx - lastX < widestCol / 2 + 6) continue;
        lastX = cx;
        text(ctx, opts.colLabels[cl], cx, gridBottom + 10, t.dim, "center", t.font);
      }
    }
    ctx.restore();
  }

  /*
   * sparkline(canvas, values, opts) — no axes, no labels, fits its box.
   * For inline trend indicators next to a number.
   */
  function sparkline(canvas, values, opts) {
    opts = opts || {};
    var f = frame(canvas, opts);
    var ctx = f.ctx;
    var t = theme(opts);
    var v = (values || []).filter(function (x) { return typeof x === "number" && isFinite(x); });
    if (v.length < 2) return;
    var xe = { lo: 0, hi: v.length - 1 };
    var ye = extent(v, {});
    var box = { x: opts.pad || 2, y: opts.pad || 2, w: f.w - (opts.pad || 2) * 2, h: f.h - (opts.pad || 2) * 2 };
    var s = scales(box, xe, ye);
    var pts = v.map(function (val, i) { return [s.x.scale(i), s.y.scale(val)]; });
    ctx.save();
    if (opts.fill !== false) {
      path(ctx, pts);
      ctx.lineTo(pts[pts.length - 1][0], box.y + box.h);
      ctx.lineTo(pts[0][0], box.y + box.h);
      ctx.closePath();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = resolveColor(opts.color, t.ink);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = resolveColor(opts.color, t.ink);
    ctx.lineWidth = opts.lineWidth || 1.5;
    ctx.lineJoin = "round";
    path(ctx, pts);
    ctx.stroke();
    if (opts.lastDot !== false) {
      ctx.fillStyle = resolveColor(opts.color, t.ink);
      ctx.beginPath();
      ctx.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- helpers ---------- */

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function empty(ctx, f, t, msg) {
    text(ctx, msg, f.w / 2, f.h / 2, t.dim, "center", t.font);
  }

  function legend(ctx, box, series, t, opts) {
    if (opts.legend === false) return;
    var named = series.filter(function (s) { return s.name; });
    if (named.length < 2) return;
    var x = box.x, y = box.y + box.h + 14;
    ctx.save();
    named.forEach(function (s, i) {
      ctx.fillStyle = resolveColor(s.color) || color(opts, i);
      ctx.fillRect(x, y - 4, 8, 8);
      text(ctx, s.name, x + 12, y, t.dim, "left", t.font);
      x += 12 + ctx.measureText(s.name).width + 14;
    });
    ctx.restore();
  }

  /* Re-render on resize/theme change. Call once per chart. */
  function autoResize(render) {
    if (!window.ResizeObserver || typeof render !== "function") return;
    var ro = new ResizeObserver(function () { render(); });
    ro.observe(document.documentElement);
    return ro;
  }

  window.R2Chart = {
    line: line,
    area: area,
    bar: bar,
    histogram: histogram,
    scatter: scatter,
    boxplot: boxplot,
    heatmap: heatmap,
    sparkline: sparkline,
    resolveColor: resolveColor,
    summarise: summarise,
    leastSquares: leastSquares,
    ticks: ticks,
    niceStep: niceStep,
    fmt: fmt,
    autoResize: autoResize,
    reduced: reduced
  };
})();