/*
 * random2 · shared arcade micro-library
 * -------------------------------------
 * One tiny no-dependency file shared by the simple games (and the hub):
 *   - WebAudio blip engine with named, declarative sound maps
 *   - Particle system (spawn / update / draw / clear)
 *   - localStorage JSON + defaults helpers
 *   - Global arcade settings (sound / haptics) stored in `random2-settings`
 *   - Haptics + cross-game "last played" tracking for the hub dashboard
 *   - Run-log / stats layer (`R2.stats`) read by the dashboard PWA
 *
 * Loaded as a plain script (no modules) so every game stays a static site:
 *   <script src="../shared/arcade.js"></script>
 * Exposes a single global: window.R2
 */
(function () {
  "use strict";

  var reduced = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- storage ---------- */

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  /* Merge stored data over defaults; unknown stored keys are preserved. */
  function loadState(key, defaults) {
    var data = loadJSON(key, null);
    var out = {};
    var k;
    for (k in defaults) {
      out[k] = (data && data[k] !== undefined) ? data[k] : defaults[k];
    }
    if (data) {
      for (k in data) { if (!(k in out)) out[k] = data[k]; }
    }
    return out;
  }

  function saveState(key, obj) { saveJSON(key, obj); }

  /* ---------- global arcade settings ---------- */

  var SETTINGS_KEY = "random2-settings";
  var settingsCache = null;

  function getSettings() {
    if (!settingsCache) {
      settingsCache = loadState(SETTINGS_KEY, { sound: true, haptics: true, music: true });
    }
    return settingsCache;
  }

  function setSettings(patch) {
    var s = getSettings();
    for (var k in patch) { if (patch[k] !== undefined) s[k] = patch[k]; }
    saveJSON(SETTINGS_KEY, s);
    return s;
  }

  /* ---------- audio ---------- */

  var audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      } catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }

  function play(freq, duration, type) {
    if (!getSettings().sound) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type || "sine";
      osc.frequency.value = freq;
      osc.start();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  /*
   * makeSound({ eat: [220, 0.06, "triangle"], ... })
   *  -> { play(), eat(), ... } — same shape each game's Sound object had.
   */
  function makeSound(map) {
    var s = { play: play };
    Object.keys(map || {}).forEach(function (name) {
      var spec = map[name];
      s[name] = function () { play(spec[0], spec[1], spec[2]); };
    });
    return s;
  }

  /* ---------- particles ---------- */

  function makeParticles() {
    var list = [];

    function spawn(x, y, color, count) {
      count = count || 8;
      for (var i = 0; i < count; i++) {
        list.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          life: 1,
          color: color
        });
      }
    }

    function update(dt) {
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= dt * 3;
        if (p.life <= 0) list.splice(i, 1);
      }
    }

    function draw(ctx) {
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function clear() { list.length = 0; }

    return { spawn: spawn, update: update, draw: draw, clear: clear, list: list };
  }

  /* ---------- haptics + play tracking ---------- */

  function buzz(pattern) {
    if (!getSettings().haptics) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  function markPlayed(slug) {
    try {
      var map = loadJSON("random2-last-played", {}) || {};
      map[slug] = Date.now();
      saveJSON("random2-last-played", map);
    } catch (e) {}
  }

  /* ---------- daily seed + seeded RNG ---------- */

  /* YYYYMMDD as a number — same value on hub and games, changes at midnight. */
  function dailySeed(date) {
    var d = date || new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  /* mulberry32 — tiny, fast, good-enough 32-bit PRNG. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- play-time tracking ----------
     Accumulates seconds per slug into `random2-playtime`, only while the
     tab is visible. One tick every 5 s keeps the writes negligible.

     Shape per slug:
       { total: <seconds>, byHour: [24], byDay: [7] }
     byHour is local wall-clock hour 0-23, byDay is 0=Sunday. They are what
     make an hour-of-day / day-of-week breakdown possible later; a bare
     total cannot answer those questions.

     Older builds stored a bare number, so `loadPlaytime()` migrates that
     shape in place instead of discarding the player's history. */
  var PLAYTIME_KEY = "random2-playtime";

  function bumpPlaytime(map, slug, when) {
    var p = map[slug];
    /* Migrate the pre-bucket shape on sight. */
    if (typeof p === "number") p = { total: p, byHour: [], byDay: [] };
    if (!p || typeof p !== "object") p = { total: 0, byHour: [], byDay: [] };
    if (!Array.isArray(p.byHour)) p.byHour = [];
    if (!Array.isArray(p.byDay)) p.byDay = [];
    p.total = (p.total || 0) + 5;
    var h = when.getHours();
    var d = when.getDay();
    p.byHour[h] = (p.byHour[h] || 0) + 5;
    p.byDay[d] = (p.byDay[d] || 0) + 5;
    map[slug] = p;
  }

  function loadPlaytime() {
    var raw = loadJSON(PLAYTIME_KEY, {});
    var out = {};
    var k;
    for (k in raw) {
      var v = raw[k];
      if (typeof v === "number") {
        out[k] = { total: v, byHour: [], byDay: [] };
      } else if (v && typeof v === "object") {
        out[k] = {
          total: v.total || 0,
          byHour: Array.isArray(v.byHour) ? v.byHour : [],
          byDay: Array.isArray(v.byDay) ? v.byDay : []
        };
      }
    }
    return out;
  }

  function trackPlaytime(slug) {
    if (window.__r2playtime) return; // one tracker per page
    window.__r2playtime = true;
    setInterval(function () {
      if (document.visibilityState !== "visible") return;
      try {
        var map = loadPlaytime();
        bumpPlaytime(map, slug, new Date());
        saveJSON(PLAYTIME_KEY, map);
      } catch (e) {}
    }, 5000);
  }

  /* ---------- run log + stats ----------
     Every finished run appends one record to `random2-runs`. The log is a
     newest-first ring buffer capped at RUNS_MAX so a heavy player can never
     push localStorage past quota; once it is full the oldest record is
     dropped instead of the whole write failing.

     Records are flushed on a debounce rather than on every call: a game can
     record a run and a couple of events in the same frame, and that should
     still cost one write.

       { t, slug, score, durMs, wave, outcome, meta }

     Alongside it, `random2-runs-by-day` keeps one rolled-up row per day per
     slug, which is the shape the dashboard actually charts. The raw log is
     for distributions (histograms); the rollup is for trends. */
  var RUNS_KEY = "random2-runs";
  var RUNS_DAY_KEY = "random2-runs-by-day";
  var RUNS_MAX = 1000;
  var runsQueue = [];
  var runsFlushTimer = null;

  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function pushRun(rec) {
    var runs = loadJSON(RUNS_KEY, []);
    if (!Array.isArray(runs)) runs = [];
    runs.unshift(rec);
    if (runs.length > RUNS_MAX) runs.length = RUNS_MAX;

    var byDay = loadJSON(RUNS_DAY_KEY, {});
    if (!byDay || typeof byDay !== "object") byDay = {};
    var dk = dayKey(rec.t);
    var day = byDay[dk];
    if (!day || typeof day !== "object") day = {};
    var row = day[rec.slug];
    if (!row || typeof row !== "object") {
      row = { n: 0, best: null, sum: 0, sec: 0 };
    }
    row.n += 1;
    row.sum += rec.score || 0;
    row.sec += Math.round((rec.durMs || 0) / 1000);
    if (rec.score != null && (row.best === null || rec.score > row.best)) {
      row.best = rec.score;
    }
    day[rec.slug] = row;
    byDay[dk] = day;

    /* One atomic-ish flush of both keys; a quota error must not leave the
       rollup ahead of the log, so the rollup is written first. */
    saveJSON(RUNS_DAY_KEY, byDay);
    saveJSON(RUNS_KEY, runs);
  }

  function drainRuns() {
    if (runsFlushTimer) { clearTimeout(runsFlushTimer); runsFlushTimer = null; }
    if (!runsQueue.length) return;
    /* Take the whole queue in one pass: pushRun re-reads and rewrites both
       keys each time, so draining per record would be N round trips. */
    var batch = runsQueue;
    runsQueue = [];
    try {
      for (var i = 0; i < batch.length; i++) pushRun(batch[i]);
    } catch (e) {
      /* Drop the batch rather than retry forever on a quota error. */
    }
  }

  function scheduleRun(rec) {
    /* A queue, not a single slot: a game can finish two runs inside one
       debounce window (daily mode then endless, say) and both must survive. */
    runsQueue.push(rec);
    if (runsFlushTimer) return;
    runsFlushTimer = setTimeout(drainRuns, 1000);
    /* Never lose a run to a tab close: pagehide is the last chance. */
    if (!window.__r2statsflush) {
      window.__r2statsflush = true;
      window.addEventListener("pagehide", drainRuns);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") drainRuns();
      });
    }
  }

  /*
   * run({ slug, score, durMs, wave, outcome, meta })
   *   Call once when a run ends. `outcome` is free-form but the dashboard
   *   groups on it ("win" / "loss" / "quit"), and `meta` is a small object
   *   for anything worth charting — keep it to scalars, it is JSON in
   *   localStorage.
   */
  function recordRun(spec) {
    if (!spec || !spec.slug) return;
    scheduleRun({
      t: spec.t || Date.now(),
      slug: String(spec.slug),
      score: spec.score == null ? null : Math.round(spec.score),
      durMs: Math.round(spec.durMs || 0),
      wave: spec.wave == null ? null : spec.wave,
      outcome: spec.outcome || null,
      meta: spec.meta && typeof spec.meta === "object" ? spec.meta : null
    });
  }

  /* Discrete counters, e.g. deaths by ship hull. Cheaper than run records
     because they roll up in place instead of growing the log. */
  function recordEvent(slug, name, value) {
    try {
      var all = loadJSON("random2-events", {});
      if (!all || typeof all !== "object") all = {};
      var s = all[slug];
      if (!s || typeof s !== "object") s = {};
      s[name] = (s[name] || 0) + (value == null ? 1 : value);
      all[slug] = s;
      saveJSON("random2-events", all);
    } catch (e) {}
  }

  function readRuns(slug) {
    var runs = loadJSON(RUNS_KEY, []);
    if (!Array.isArray(runs)) return [];
    if (!slug) return runs;
    return runs.filter(function (r) { return r && r.slug === slug; });
  }

  function readDays(slug) {
    var byDay = loadJSON(RUNS_DAY_KEY, {});
    if (!byDay || typeof byDay !== "object") return [];
    var out = [];
    for (var dk in byDay) {
      var day = byDay[dk];
      if (!day || typeof day !== "object") continue;
      if (!slug) { out.push({ day: dk, slugs: day }); continue; }
      if (day[slug]) out.push({ day: dk, row: day[slug] });
    }
    out.sort(function (a, b) { return a.day < b.day ? -1 : 1; });
    return out;
  }

  function readEvents(slug) {
    var all = loadJSON("random2-events", {});
    if (!all || typeof all !== "object") return {};
    return all[slug] || {};
  }

  /*
   * Records written by earlier builds, before `R2.stats` existed, lived in
   * per-game keys with no shared shape. The dashboard reads them through
   * here so a returning player does not open it to an empty page.
   * Only fields that can be compared across games are surfaced.
   */
  var LEGACY_KEYS = [
    "acqua-best", "alveare-best", "madre-records", "metro-best",
    "mycel-best", "nebbia-best", "sector7-pwa", "sini-best", "static-best",
    "territorio.record", "snake-daily", "snake-pwa", "slot-pwa", "slot-jackpot",
    "king-shot-pwa", "plane-pwa", "viti-pwa", "acqua-pwa", "formica-pwa",
    "alveare-pwa", "mycel-pwa", "sini-pwa", "lumen-pwa", "resort-pwa",
    "metro-pwa", "farmTycoonSave"
  ];

  function readLegacy() {
    var out = {};
    for (var i = 0; i < LEGACY_KEYS.length; i++) {
      var k = LEGACY_KEYS[i];
      var v = loadJSON(k, null);
      if (v === null || v === undefined) continue;
      /* Flatten one level: legacy saves are usually {best, plays, ...}. */
      var flat = {};
      var found = false;
      if (typeof v === "number") {
        flat.best = v; found = true;
      } else if (typeof v === "object") {
        for (var p in v) {
          if (typeof v[p] === "number" || typeof v[p] === "string" ||
              typeof v[p] === "boolean") {
            flat[p] = v[p]; found = true;
          }
        }
      }
      if (found) out[k] = flat;
    }
    return out;
  }

  function clearStats() {
    removeKey(RUNS_KEY);
    removeKey(RUNS_DAY_KEY);
    removeKey("random2-events");
  }

  /* ---------- iOS install coaching ----------
     iOS Safari has no beforeinstallprompt; coach the user instead.
     Shows once per device until dismissed, standalone users never see it. */
  function installHint() {
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
    if (!isIOS || standalone) return;
    if (loadJSON("random2-install-hint-dismissed", false) === true) return;

    var style = document.createElement("style");
    style.textContent = [
      "#r2-install-hint{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));",
      "transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:10px;",
      "max-width:92vw;padding:10px 12px 10px 16px;border-radius:999px;font:600 13px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;",
      "color:#f4f5fb;background:rgba(15,17,28,.92);border:1px solid rgba(255,255,255,.14);",
      "box-shadow:0 10px 30px -10px rgba(0,0,0,.7);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);}",
      "#r2-install-hint b{font-weight:800;}",
      "#r2-install-hint button{all:unset;cursor:pointer;font:inherit;font-weight:800;opacity:.7;padding:6px 10px;}",
      "#r2-install-hint button:active{opacity:1;}"
    ].join("");
    document.head.appendChild(style);

    var bar = document.createElement("div");
    bar.id = "r2-install-hint";
    bar.setAttribute("role", "status");
    bar.innerHTML = '<span>📲 Install this game: tap <b>Share</b> → <b>Add to Home Screen</b></span>';
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss install hint");
    close.textContent = "✕";
    close.addEventListener("click", function () {
      bar.remove();
      saveJSON("random2-install-hint-dismissed", true);
    });
    bar.appendChild(close);
    (document.body || document.documentElement).appendChild(bar);
  }

  /* ---------- exports ---------- */

  window.R2 = {
    reduced: reduced,
    play: play,
    makeSound: makeSound,
    makeParticles: makeParticles,
    loadJSON: loadJSON,
    saveJSON: saveJSON,
    removeKey: removeKey,
    loadState: loadState,
    saveState: saveState,
    getSettings: getSettings,
    setSettings: setSettings,
    buzz: buzz,
    markPlayed: markPlayed,
    dailySeed: dailySeed,
    mulberry32: mulberry32,
    trackPlaytime: trackPlaytime,
    loadPlaytime: loadPlaytime,
    stats: {
      run: recordRun,
      event: recordEvent,
      runs: readRuns,
      days: readDays,
      events: readEvents,
      legacy: readLegacy,
      clear: clearStats
    },
    installHint: installHint,
    version: "1.3.0"
  };
})();
