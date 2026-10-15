/*
 * Stats — local play-data dashboard
 * ---------------------------------
 * Reads the records every game in this repo already writes to localStorage
 * and draws them. No network, no storage beyond reading what is there.
 *
 * The data comes from three places, and the page is explicit about which:
 *   R2.stats.runs()   - the run log, one record per finished run
 *   random2-playtime  - seconds per game, bucketed by hour and weekday
 *   R2.stats.legacy() - the per-game save files, in their own shapes
 *
 * A returning player will have legacy saves but no run log: the log only
 * exists from the version that started writing it. So the page shows what
 * it has and says plainly when a chart has nothing to draw.
 */
(function () {
  "use strict";

  var C = window.R2Chart;
  var R2 = window.R2;

  var KEY_PLAYTIME = "random2-playtime";
  var KEY_LAST = "random2-last-played";
  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* Games are identified by the slug they pass to R2.markPlayed. */
  var NAMES = {
    "acqua-pwa/": "ACQUA",
    "alveare-pwa/": "ALVEARE",
    "anthology-pwa/": "The Library",
    "bible-pwa/": "The Bible",
    "cardume-pwa/": "Cardume",
    "crime-and-punishment-pwa/": "Crime & Punishment",
    "example-pwa/": "Star Explorer",
    "formica-pwa/": "FORMICA",
    "king-shot-pwa/": "King Shot",
    "lumen-pwa/": "LUMEN",
    "madre-pwa/": "MADRE",
    "metro-pwa/": "LINEA ROSSA",
    "mustang-pwa/": "Mustang 1942",
    "mycel-pwa/": "MYCEL",
    "nebbia-pwa/": "NEBBIA",
    "plane-pwa/": "Plane Shooter",
    "pokemon-go-pwa/": "Pokémon GO",
    "recherche-pwa/": "A la recherche",
    "resort-pwa/": "Isola Resort",
    "sector7-pwa/": "SECTOR 7",
    "sini-pwa/": "SINI",
    "slot-pwa/": "Slot Machine",
    "snake-pwa/": "Snake",
    "snap-pwa/": "Snap Cam",
    "static-pwa/": "STATIC",
    "territorio-pwa/": "Territorio",
    "virtual-farm-pwa/": "Farm Tycoon",
    "viti-pwa/": "Viti & Lastre"
  };

  function name(slug) {
    return NAMES[slug] || slug.replace(/\/$/, "").replace(/-pwa$/, "").replace(/-/g, " ");
  }

  /* ---------- data access ---------- */

  var data = {
    runs: [],
    playtime: {},
    days: [],
    legacy: {},
    last: {}
  };

  function load() {
    data.runs = R2.stats.runs();
    data.playtime = R2.loadPlaytime();
    data.days = R2.stats.days();
    data.legacy = R2.stats.legacy();
    data.last = R2.loadJSON(KEY_LAST, {}) || {};
  }

  /* Playtime, normalised. Older builds wrote a bare number; loadPlaytime
     migrates that, but a slug can also appear here via last-played with no
     playtime at all, which means zero rather than unknown. */
  function totalSeconds() {
    var t = 0;
    for (var k in data.playtime) t += data.playtime[k].total || 0;
    return t;
  }

  function activeSlugs() {
    var set = {};
    data.runs.forEach(function (r) { if (r.slug) set[r.slug] = true; });
    for (var k in data.playtime) set[k] = true;
    return Object.keys(set);
  }

  /* ---------- formatting ---------- */

  function dur(ms) {
    if (!ms || ms < 0) return "—";
    var s = Math.round(ms / 1000);
    if (s < 60) return s + "s";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m " + (s % 60) + "s";
    var h = Math.floor(m / 60);
    return h + "h " + (m % 60) + "m";
  }

  function clock(seconds) {
    var m = Math.round(seconds / 60);
    if (m < 60) return m + "m";
    return (m / 60).toFixed(1) + "h";
  }

  function when(ts) {
    var d = new Date(ts);
    var today = new Date();
    var sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return "today " + d.toTimeString().slice(0, 5);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  /* ---------- theme ---------- */

  function applyTheme(light) {
    document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
    var btn = document.getElementById("theme-btn");
    btn.setAttribute("aria-pressed", light ? "true" : "false");
    document.getElementById("theme-label").textContent = light ? "Dark" : "Light";
    /* Charts read their colours from CSS custom properties at draw time,
       so a theme switch only needs a redraw. */
    render();
  }

  function initTheme() {
    var stored = R2.loadJSON("random2-stats-theme", null);
    if (stored === null) {
      stored = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches;
    }
    applyTheme(!!stored);
    document.getElementById("theme-btn").addEventListener("click", function () {
      var light = document.documentElement.getAttribute("data-theme") === "light";
      R2.saveJSON("random2-stats-theme", !light);
      applyTheme(!light);
    });
  }

  /* ---------- tiles ---------- */

  function renderTiles() {
    var slugs = activeSlugs();
    var days = {};
    data.days.forEach(function (d) {
      if (d.day) days[d.day] = true;
    });

    document.getElementById("t-runs").textContent = data.runs.length.toLocaleString();
    document.getElementById("t-time").textContent = clock(totalSeconds());
    document.getElementById("t-games").textContent = slugs.length;
    document.getElementById("t-days").textContent = Object.keys(days).length;

    var scores = data.runs
      .map(function (r) { return r.score; })
      .filter(function (s) { return typeof s === "number"; });
    document.getElementById("t-best").textContent = scores.length
      ? Math.max.apply(null, scores).toLocaleString()
      : "—";
  }

  function renderPrivacy() {
    var runs = data.runs.length;
    var detail;
    if (runs) {
      detail = runs + " run" + (runs === 1 ? "" : "s") +
        " on record, all from this browser's local storage. " +
        "Nothing was sent to make this page.";
    } else {
      detail = "No runs recorded yet. Play a game or two and come back — " +
        "each finished run is logged here, on this device.";
    }
    document.getElementById("privacy-detail").textContent = detail;
  }

  /* ---------- overview ---------- */

  function renderOverview() {
    /* Runs per day, as a count, oldest to newest. */
    var byDay = {};
    data.days.forEach(function (d) {
      if (!d.day || !d.slugs) return;
      var n = 0;
      for (var k in d.slugs) n += d.slugs[k].n || 0;
      if (n) byDay[d.day] = n;
    });
    var days = Object.keys(byDay).sort();
    C.line(document.getElementById("c-runsday"),
      [{ name: "runs", points: days.map(function (d, i) { return [i, byDay[d]]; }) }],
      { xLabel: true, zeroBase: true, dots: false, color: "var(--accent)" });
    document.getElementById("n-runsday").textContent = days.length
      ? days.length + " active " + (days.length === 1 ? "day" : "days") + ", " +
        days[0] + " to " + days[days.length - 1] + "."
      : "No completed runs yet.";

    /* Time per day: playtime is bucketed by hour and weekday but has no
       calendar, so a true per-day series only exists once runs have been
       logged. Fall back to saying so rather than inventing one. */
    var hasDaily = days.length > 1;
    if (hasDaily) {
      var pts = days.map(function (d, i) {
        var sec = 0;
        var slugs = data.days.filter(function (x) { return x.day === d; })[0].slugs;
        for (var k in slugs) sec += slugs[k].sec || 0;
        return [i, sec / 60];
      });
      C.area(document.getElementById("c-timeday"),
        [{ name: "minutes", points: pts }],
        { xLabel: true, yFormat: function (v) { return Math.round(v) + "m"; } });
      document.getElementById("n-timeday").textContent =
        "Minutes played per logged day.";
    } else {
      C.line(document.getElementById("c-timeday"), [], { xLabel: true });
      document.getElementById("n-timeday").textContent =
        "Needs at least two logged days. Playtime is tracked without dates, " +
        "so a per-day series only exists from the run log onwards.";
    }

    /* Score distribution across every game. */
    var scores = data.runs
      .map(function (r) { return r.score; })
      .filter(function (s) { return typeof s === "number"; });
    var histCanvas = document.getElementById("c-hist");
    if (scores.length >= 3) {
      var res = C.histogram(histCanvas, scores,
        { markMean: true, xLabel: true, color: "var(--accent)" });
      var srt = scores.slice().sort(function (a, b) { return a - b; });
      var med = srt[Math.floor(srt.length / 2)];
      document.getElementById("n-hist").textContent =
        res.n + " runs. Median " + C.fmt(med) + ", mean " + C.fmt(res.mean) +
        ". Games are not comparable here — a metro network and a snake game " +
        "do not share a scoreboard.";
    } else {
      /* An empty chart draws its own placeholder. Zeroing canvas.width
         instead would permanently collapse the element: once width is 0
         there is no layout box to measure on the next draw. */
      C.histogram(histCanvas, [], { xLabel: true });
      document.getElementById("n-hist").textContent =
        "Needs at least three scored runs.";
    }

    /* Best score over time: the running maximum, which is the number a
       player actually cares about. */
    var chron = data.runs.filter(function (r) { return typeof r.score === "number"; })
      .slice().sort(function (a, b) { return a.t - b.t; });
    var bestCanvas = document.getElementById("c-best");
    if (chron.length >= 2) {
      var best = -Infinity, bestPts = [];
      chron.forEach(function (r, i) {
        if (r.score > best) best = r.score;
        bestPts.push([i, best]);
      });
      C.area(bestCanvas, [{ name: "best", points: bestPts }],
        { xLabel: true, zeroBase: true, dots: false, color: "var(--accent-2)" });
      document.getElementById("n-best").textContent =
        "Running maximum across " + chron.length + " runs, in the order they finished.";
    } else {
      C.line(bestCanvas, [], { xLabel: true });
      document.getElementById("n-best").textContent = "Needs two scored runs.";
    }

    /* Outcomes. */
    var outcomes = {};
    data.runs.forEach(function (r) {
      var k = r.outcome || "unlabelled";
      outcomes[k] = (outcomes[k] || 0) + 1;
    });
    var okeys = Object.keys(outcomes).sort(function (a, b) {
      return outcomes[b] - outcomes[a];
    });
    if (okeys.length) {
      C.bar(document.getElementById("c-outcome"),
        okeys.map(function (k) { return { label: k, value: outcomes[k] }; }),
        { valueLabels: true, xLabel: true });
      document.getElementById("n-outcome").textContent =
        "Games label the end of a run differently; unlabelled means the game " +
        "did not report one.";
    } else {
      C.bar(document.getElementById("c-outcome"), [], { xLabel: true });
      document.getElementById("n-outcome").textContent = "No runs yet.";
    }
  }

  /* ---------- runs ---------- */

  var picked = "";

  function renderRuns() {
    var sel = document.getElementById("run-game");
    var slugs = {};
    data.runs.forEach(function (r) { if (r.slug) slugs[r.slug] = true; });
    var list = Object.keys(slugs).sort();

    if (!list.length) {
      sel.innerHTML = "";
      document.querySelector("#p-runs .empty-row, #p-runs tbody")
        .innerHTML = '<tr><td colspan="6" class="empty">No runs recorded yet.</td></tr>';
      document.getElementById("n-g-hist").textContent =
        "Play a game and finish a run.";
      return;
    }

    if (list.indexOf(picked) === -1) picked = list[0];
    sel.innerHTML = list.map(function (s) {
      return '<option value="' + s + '"' + (s === picked ? " selected" : "") + ">" +
        html(name(s)) + "</option>";
    }).join("");

    var mine = data.runs.filter(function (r) { return r.slug === picked; });
    var scores = mine.map(function (r) { return r.score; })
      .filter(function (s) { return typeof s === "number"; });

    document.getElementById("t-hist-title").textContent =
      html(name(picked)) + " — score distribution";

    if (scores.length >= 2) {
      var res = C.histogram(document.getElementById("c-g-hist"), scores,
        { markMean: true, xLabel: true, color: "var(--accent)" });
      document.getElementById("n-g-hist").textContent =
        mine.length + " runs, " + res.n + " with a score. Mean " +
        C.fmt(res.mean) + ".";
    } else {
      C.histogram(document.getElementById("c-g-hist"), [], { xLabel: true });
      document.getElementById("n-g-hist").textContent =
        "Not enough scored runs of this game yet.";
    }

    var oc = {};
    mine.forEach(function (r) {
      var k = r.outcome || "unlabelled";
      oc[k] = (oc[k] || 0) + 1;
    });
    var ok = Object.keys(oc).sort(function (a, b) { return oc[b] - oc[a]; });
    if (ok.length) {
      C.bar(document.getElementById("c-g-outcome"),
        ok.map(function (k) { return { label: k, value: oc[k] }; }),
        { valueLabels: true, xLabel: true });
    } else {
      C.bar(document.getElementById("c-g-outcome"), [], { xLabel: true });
    }

    /* Wave reached: only some games have a wave notion. */
    var waves = mine.map(function (r) { return r.wave; })
      .filter(function (w) { return typeof w === "number"; });
    if (waves.length >= 2) {
      var counts = {};
      waves.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; });
      var wk = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
      var med = waves.slice().sort(function (a, b) { return a - b; })
        [Math.floor(waves.length / 2)];
      C.bar(document.getElementById("c-g-wave"),
        wk.map(function (w) { return { label: String(w), value: counts[w] }; }),
        { xLabel: true });
      document.getElementById("n-g-wave").textContent =
        "Furthest wave reached: median " + med + ", best " +
        Math.max.apply(null, waves) + ".";
    } else {
      C.bar(document.getElementById("c-g-wave"), [], { xLabel: true });
      document.getElementById("n-g-wave").textContent =
        "This game does not report a wave.";
    }

    /* Length against score. */
    var pairs = mine.filter(function (r) {
      return typeof r.score === "number" && r.durMs > 0;
    }).map(function (r) { return [r.durMs / 60000, r.score]; });
    if (pairs.length >= 4) {
      C.scatter(document.getElementById("c-g-scatter"), pairs,
        { trend: true, xLabel: true, xFormat: function (v) { return v + "m"; },
          yFormat: C.fmt, color: "var(--accent)" });
    } else {
      C.scatter(document.getElementById("c-g-scatter"), [], { xLabel: true });
    }

    /* Recent runs, newest first. */
    var tb = document.querySelector("#t-runs-table tbody");
    var rows = mine.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 40);
    tb.innerHTML = rows.map(function (r) {
      return "<tr><td>" + when(r.t) + "</td><td>" + html(name(r.slug)) +
        "</td><td>" + (r.score == null ? "—" : C.fmt(r.score)) +
        "</td><td>" + dur(r.durMs) +
        "</td><td>" + (r.wave == null ? "—" : r.wave) +
        "</td><td>" + html(r.outcome || "—") + "</td></tr>";
    }).join("");
  }

  /* ---------- time ---------- */

  function renderTime() {
    /* Rows run Monday..Sunday. JS getDay() is 0=Sunday, so Monday is 1 and
       the row index is (weekday + 5) % 7. Getting this off by one would
       silently shift every cell by a day. */
    var heat = [], total = 0;
    for (var r = 0; r < 7; r++) {
      var row = [];
      for (var h = 0; h < 24; h++) row.push(0);
      heat.push(row);
    }
    for (var slug in data.playtime) {
      var p = data.playtime[slug];
      total += p.total || 0;
      var bh = p.byHour || [], bd = p.byDay || [];
      for (var h2 = 0; h2 < 24; h2++) {
        if (!bh[h2]) continue;
        for (var d2 = 0; d2 <= 6; d2++) {
          /* byHour and byDay are separate marginals, so a cell is the hour
             share times the day share. That is wrong for a genuinely
             correlated habit — a player who plays at 9pm on Friday also
             plays at 9pm on Saturday — but it is the honest reading of two
             independent counters, and the caption says so. */
          var daySec = bd[d2] || 0;
          if (!daySec) continue;
          heat[(d2 + 6) % 7][h2] += bh[h2] * (daySec / (p.total || 1));
        }
      }
    }

    C.heatmap(document.getElementById("c-heat"), heat, {
      rowLabels: DAY_NAMES.slice(1).concat(["Sun"]),   /* Mon..Sun */
      colLabels: (function () {
        /* Every third hour, centred on its cell so the label reads as the
           start of a three-hour block. */
        var l = [];
        for (var h = 0; h < 24; h += 3) l[h] = String(h).padStart(2, "0") + ":00";
        return l;
      })(),
      gap: 2,
      maxCell: 30,
      emptyColor: "var(--chart-grid)"
    });
    document.getElementById("n-heat").textContent = total
      ? "Built from the hour and weekday counters. Each cell is the hour " +
        "share times the weekday share, since only the two marginals are " +
        "stored — treat it as a rough shape, not a measurement."
      : "No playtime recorded yet.";

    var hourTotals = new Array(24).fill(0);
    var dayTotals = new Array(7).fill(0);
    for (var s2 in data.playtime) {
      var q = data.playtime[s2];
      (q.byHour || []).forEach(function (v, i) { hourTotals[i] += v || 0; });
      (q.byDay || []).forEach(function (v, i) { dayTotals[i] += v || 0; });
    }

    C.bar(document.getElementById("c-hour"),
      hourTotals.map(function (v, i) {
        return { label: String(i).padStart(2, "0"), value: Math.round(v / 60) };
      }),
      { xLabel: true, yFormat: function (v) { return v + "m"; } });
    var hasHours = hourTotals.some(function (v) { return v > 0; });
    if (!hasHours) {
      document.getElementById("c-hour").setAttribute("aria-label",
        "No hourly playtime recorded yet");
    }

    C.bar(document.getElementById("c-day"),
      dayTotals.map(function (v, i) {
        return { label: DAY_NAMES[i], value: Math.round(v / 60) };
      }),
      { xLabel: true, yFormat: function (v) { return v + "m"; } });

    var shares = Object.keys(data.playtime)
      .map(function (s) { return { label: name(s), value: data.playtime[s].total || 0 }; })
      .filter(function (x) { return x.value > 0; })
      .sort(function (a, b) { return b.value - a.value; });
    if (shares.length) {
      C.bar(document.getElementById("c-share"), shares,
        { xLabel: true, yFormat: function (v) { return clock(v * 60); } });
      var top = shares[0];
      var pctAll = total ? (top.value / total * 100) : 0;
      document.getElementById("n-share").textContent =
        top.label + " is " + pctAll.toFixed(0) + "% of your recorded time.";
    } else {
      document.getElementById("n-share").textContent = "No playtime yet.";
    }
  }

  /* ---------- library ---------- */

  function renderLibrary() {
    var rows = {};
    data.runs.forEach(function (r) {
      if (!r.slug) return;
      var row = rows[r.slug] || (rows[r.slug] = {
        slug: r.slug, n: 0, scores: [], last: 0
      });
      row.n++;
      if (typeof r.score === "number") row.scores.push(r.score);
      if (r.t > row.last) row.last = r.t;
    });
    for (var slug in data.playtime) {
      var sec = data.playtime[slug].total || 0;
      if (!rows[slug]) rows[slug] = { slug: slug, n: 0, scores: [], last: 0, sec: sec };
      else rows[slug].sec = (rows[slug].sec || 0) + sec;
    }
    for (var s in data.last) {
      if (rows[s] && data.last[s] > rows[s].last) rows[s].last = data.last[s];
    }

    var list = Object.keys(rows).map(function (k) { return rows[k]; });
    if (!list.length) {
      document.querySelector("#t-lib tbody").innerHTML =
        '<tr><td colspan="7" class="empty">Nothing recorded yet.</td></tr>';
      return;
    }
    list.sort(function (a, b) { return b.n - a.n || (b.sec || 0) - (a.sec || 0); });

    document.querySelector("#t-lib tbody").innerHTML = list.map(function (r) {
      var srt = r.scores.slice().sort(function (a, b) { return a - b; });
      var best = srt.length ? C.fmt(srt[srt.length - 1]) : "—";
      var mean = srt.length ? C.fmt(Math.round(
        srt.reduce(function (a, b) { return a + b; }, 0) / srt.length)) : "—";
      var med = srt.length ? C.fmt(srt[Math.floor(srt.length / 2)]) : "—";
      return "<tr><td>" + html(name(r.slug)) + "</td><td>" + r.n +
        "</td><td>" + best + "</td><td>" + mean + "</td><td>" + med +
        "</td><td>" + (r.sec ? clock(r.sec) : "—") +
        "</td><td>" + (r.last ? when(r.last) : "—") + "</td></tr>";
    }).join("");
  }

  /* ---------- records ---------- */

  function renderRecords() {
    var keys = Object.keys(data.legacy).sort();
    var tb = document.querySelector("#t-legacy tbody");
    if (!keys.length) {
      tb.innerHTML = '<tr><td colspan="2" class="empty">No save files found.</td></tr>';
      return;
    }
    tb.innerHTML = keys.map(function (k) {
      var fields = Object.keys(data.legacy[k]);
      var body = fields.length
        ? fields.map(function (f) {
            var v = data.legacy[k][f];
            var s = typeof v === "number" ? C.fmt(v) : String(v);
            if (s.length > 60) s = s.slice(0, 57) + "…";
            return html(f) + ": <b>" + html(s) + "</b>";
          }).join(" · ")
        : "(empty)";
      return "<tr><td class='mono'>" + html(k) + "</td><td>" + body + "</td></tr>";
    }).join("");
  }

  /* ---------- data panel ---------- */

  function renderData() {
    var all = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        all[k] = (localStorage.getItem(k) || "").length;
      }
    } catch (e) { /* private mode */ }

    var keys = Object.keys(all).sort();
    var total = keys.reduce(function (a, k) { return a + all[k]; }, 0);
    document.getElementById("d-keys").innerHTML = keys.map(function (k) {
      return "<li><code>" + html(k) + "</code> — " +
        (all[k] > 1024 ? (all[k] / 1024).toFixed(1) + " KB" : all[k] + " B") +
        "</li>";
    }).join("");
    document.getElementById("d-status").textContent = keys.length
      ? keys.length + " keys, " + (total / 1024).toFixed(1) + " KB total."
      : "Nothing in local storage.";
  }

  /* ---------- export / import ---------- */

  var EXPORT_KEYS = [
    "random2-runs", "random2-runs-by-day", "random2-events",
    KEY_PLAYTIME, KEY_LAST, "random2-settings"
  ];

  function status(msg) {
    document.getElementById("d-status").textContent = msg;
  }

  function exportData() {
    var out = { exported: new Date().toISOString(), data: {} };
    EXPORT_KEYS.forEach(function (k) {
      var v = R2.loadJSON(k, null);
      if (v !== null) out.data[k] = v;
    });
    var blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "random2-stats-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status("Exported " + Object.keys(out.data).length + " keys.");
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (e) {
        status("That file is not valid JSON.");
        return;
      }
      if (!parsed || typeof parsed !== "object" || !parsed.data) {
        status("That file has no data block — expected an export from this page.");
        return;
      }
      var n = 0;
      Object.keys(parsed.data).forEach(function (k) {
        R2.saveJSON(k, parsed.data[k]);
        n++;
      });
      status("Imported " + n + " keys.");
      load();
      render();
    };
    reader.readAsText(file);
  }

  /* ---------- boot ---------- */

  function render() {
    if (!C) return;
    renderTiles();
    renderPrivacy();
    renderOverview();
    renderRuns();
    renderTime();
    renderLibrary();
    renderRecords();
    renderData();
  }

  function initTabs() {
    var tabs = document.querySelectorAll(".tab");
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener("click", function () {
        Array.prototype.forEach.call(tabs, function (t) {
          t.classList.remove("on");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("on");
        tab.setAttribute("aria-selected", "true");
        Array.prototype.forEach.call(
          document.querySelectorAll(".panel"), function (p) { p.classList.remove("on"); });
        document.getElementById(tab.dataset.panel).classList.add("on");
        /* Canvases in a hidden panel measure zero, so redraw after the
           panel is visible or every chart comes out blank. */
        render();
      });
    });

    document.getElementById("run-game").addEventListener("change", function (e) {
      picked = e.target.value;
      renderRuns();
    });
  }

  function initData() {
    document.getElementById("export-btn").addEventListener("click", exportData);
    document.getElementById("d-export").addEventListener("click", exportData);
    document.getElementById("d-import").addEventListener("click", function () {
      document.getElementById("d-file").click();
    });
    document.getElementById("d-file").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importData(f);
      e.target.value = "";
    });
    document.getElementById("d-clear").addEventListener("click", function () {
      if (!confirm("Erase the run log, daily rollup and event counters?\n\n" +
        "Personal bests written by the games themselves are not touched.")) return;
      R2.stats.clear();
      status("Run data erased. Records kept by the games are still there.");
      load();
      render();
    });
  }

  function initInstall() {
    var btn = document.getElementById("install-btn");
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      btn.hidden = false;
      btn.addEventListener("click", function () {
        e.prompt();
        btn.hidden = true;
      });
    });
  }

  /* Register the service worker. Failure is not fatal: the page works from
       disk over http, it just will not survive going offline. */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("service-worker.js").catch(function (e) {
      console.warn("stats-pwa: service worker not registered", e);
    });
  });
}

function html(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function boot() {
    if (!R2 || !C) {
      document.getElementById("privacy-detail").textContent =
        "Shared libraries failed to load. Serve the folder over http " +
        "(python3 -m http.server) rather than opening the file directly.";
      return;
    }
    load();
    initTheme();
    initTabs();
    initData();
    initInstall();
    registerServiceWorker();
    render();
    R2.trackPlaytime("stats-pwa/");
    R2.markPlayed("stats-pwa/");

    if (C.autoResize) C.autoResize(function () {
      /* Only the visible panel's canvases have a size; redrawing all of
         them is cheap and avoids a chart blanking on rotate. */
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();