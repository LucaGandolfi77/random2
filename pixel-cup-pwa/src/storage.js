/*
 * PIXEL CUP '96 — saved data
 * --------------------------
 * Three things are kept on the device and nowhere else: the settings, the
 * record book, and the cup in progress. No account, no server, no
 * tracking.
 */

(function (root, factory) {
  "use strict";
  var api = factory(
    typeof R2 !== "undefined" ? R2 : null
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelStorage = api;
})(typeof self !== "undefined" ? self : this, function (R2) {
  "use strict";

  var KEY_RECORDS = "pixel-cup-records";
  var KEY_CUP = "pixel-cup-cup";
  var KEY_SQUADS = "pixel-cup-squads";
  /* Which camera the player wants. Its own key: this is a preference of
     this game, not a setting the whole arcade should share. */
  var KEY_CAMERA = "pixel-cup-camera";

  /*
   * The settings live in the shared arcade key when it is there, so the
   * mute on the hub and the mute in this game are the same switch.
   */
  var KEY_SETTINGS = (R2 && R2.getSettings) ? "random2-settings" : "pixel-cup-settings";

  var DEFAULT_SETTINGS = { sound: true, music: true, haptics: true };

  function load(key, fallback) {
    if (R2) return R2.loadJSON(key, fallback);
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function save(key, value) {
    if (R2) { R2.saveJSON(key, value); return; }
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function remove(key) {
    if (R2) { R2.removeKey(key); return; }
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function getSettings() {
    var s = load(KEY_SETTINGS, null);
    if (!s || typeof s !== "object") s = {};
    var out = {};
    for (var k in DEFAULT_SETTINGS) {
      out[k] = (s[k] === undefined) ? DEFAULT_SETTINGS[k] : !!s[k];
    }
    return out;
  }

  function setSettings(patch) {
    var s = getSettings();
    for (var k in patch) if (patch[k] !== undefined) s[k] = patch[k];
    save(KEY_SETTINGS, s);
    return s;
  }

  function getRecords() {
    var r = load(KEY_RECORDS, null);
    if (!r || typeof r !== "object") {
      r = { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0,
             trophies: 0, bestWin: 0, streak: 0, bestStreak: 0, shootouts: 0 };
    }
    return r;
  }

  /* The record book is what the hub's dashboard reads, so it keeps a
     `highScore` too: the biggest winning margin, which is the number a
     football fan would actually brag about. */
  function addMatch(result) {
    var r = getRecords();
    r.matches++;
    r.goals += result.goals || 0;
    r.conceded += result.conceded || 0;
    if (result.win) {
      r.wins++;
      r.streak++;
      var margin = (result.goals || 0) - (result.conceded || 0);
      if (margin > r.bestWin) r.bestWin = margin;
      if (r.streak > r.bestStreak) r.bestStreak = r.streak;
    } else if (result.draw) {
      r.draws++;
      r.streak = 0;
    } else {
      r.losses++;
      r.streak = 0;
    }
    r.highScore = r.bestWin;
    save(KEY_RECORDS, r);
    return r;
  }

  function addShootout(won) {
    var r = getRecords();
    r.shootouts++;
    if (won) { r.wins++; r.streak++; } else { r.losses++; r.streak = 0; }
    save(KEY_RECORDS, r);
    return r;
  }

  function addTrophy() {
    var r = getRecords();
    r.trophies++;
    save(KEY_RECORDS, r);
    return r;
  }

  /* The chosen five, per club. */
  function getSquads() {
    var s = load(KEY_SQUADS, null);
    return (s && typeof s === "object") ? s : {};
  }

  function getSquad(clubId) {
    var all = getSquads();
    return all[clubId] || null;
  }

  function setSquad(clubId, ids) {
    var all = getSquads();
    all[clubId] = ids;
    save(KEY_SQUADS, all);
    return all;
  }

  /* The camera: "auto" lets the director choose, "top" and "side" are
     the two fixed ones. */
  function getCamera() {
    var c = load(KEY_CAMERA, "auto");
    return (c === "top" || c === "side" || c === "auto") ? c : "auto";
  }

  function setCamera(name) {
    save(KEY_CAMERA, name);
    return name;
  }

  function getCup() { return load(KEY_CUP, null); }
  function setCup(cup) { save(KEY_CUP, cup); }
  function clearCup() { remove(KEY_CUP); }

  return {
    KEY_SETTINGS: KEY_SETTINGS,
    KEY_RECORDS: KEY_RECORDS,
    KEY_CUP: KEY_CUP,
    KEY_SQUADS: KEY_SQUADS,
    KEY_CAMERA: KEY_CAMERA,
    load: load,
    save: save,
    getSettings: getSettings,
    setSettings: setSettings,
    getRecords: getRecords,
    addMatch: addMatch,
    addShootout: addShootout,
    addTrophy: addTrophy,
    getCup: getCup,
    setCup: setCup,
    clearCup: clearCup,
    getSquads: getSquads,
    getSquad: getSquad,
    setSquad: setSquad,
    getCamera: getCamera,
    setCamera: setCamera,
  };
});
