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
    version: "1.0.0"
  };
})();
