/*
 * random2 · shared arcade micro-library
 * -------------------------------------
 * One tiny no-dependency file shared by the simple games (and the hub):
 *   - WebAudio blip engine with named, declarative sound maps
 *   - Particle system (spawn / update / draw / clear)
 *   - localStorage JSON + defaults helpers
 *   - Global arcade settings (sound / haptics) stored in `random2-settings`
 *   - Haptics + cross-game "last played" tracking for the hub dashboard
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
      settingsCache = loadState(SETTINGS_KEY, { sound: true, haptics: true });
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
     tab is visible. One tick every 5 s keeps the writes negligible. */
  function trackPlaytime(slug) {
    if (window.__r2playtime) return; // one tracker per page
    window.__r2playtime = true;
    setInterval(function () {
      if (document.visibilityState !== "visible") return;
      try {
        var map = loadJSON("random2-playtime", {}) || {};
        map[slug] = (map[slug] || 0) + 5;
        saveJSON("random2-playtime", map);
      } catch (e) {}
    }, 5000);
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
    installHint: installHint,
    version: "1.1.0"
  };
})();
