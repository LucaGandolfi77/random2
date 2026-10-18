(function (root) {
  "use strict";

  var R2P = root.R2P;
  var R2 = root.R2;
  var SLUG = "pulse";
  var TRACKS_KEY = "pulse-tracks";
  var DAILY_KEY = "pulse-daily";
  var PREF_KEY = "pulse-prefs";

  var el = {};
  var game = null;
  var current = { seed: 0, difficulty: "normal", song: null, chart: null, result: null };
  var busy = false;

  function byId(id) { return document.getElementById(id); }

  function show(name) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle("is-active", screens[i].id === "screen-" + name);
    }
    window.scrollTo(0, 0);
  }

  function say(text) {
    el.live.textContent = text;
  }

  function loadPrefs() {
    return R2.loadState(PREF_KEY, { difficulty: "normal", volume: 0.85 });
  }

  function savePrefs(patch) {
    var next = R2.loadState(PREF_KEY, { difficulty: "normal", volume: 0.85 });
    for (var k in patch) next[k] = patch[k];
    R2.saveState(PREF_KEY, next);
    return next;
  }

  function seedFromHash() {
    var match = /(?:^|[#&])seed=(\d+)/.exec(root.location.hash || "");
    return match ? parseInt(match[1], 10) >>> 0 : null;
  }

  function setSeed(seed) {
    current.seed = seed >>> 0;
    el.seedInput.value = String(current.seed);
    var song = R2P.song.generate(current.seed);
    var chart = R2P.chart.build(song, current.difficulty);
    var mins = Math.floor(song.duration / 60);
    var secs = Math.round(song.duration % 60);
    el.summary.textContent = song.bpm + " BPM · " + song.key.name + " · " + mins + ":" + (secs < 10 ? "0" : "") + secs +
      " · " + chart.notes.length + " notes · " + chart.stats.holds + " holds";
    el.loadSub.textContent = el.summary.textContent;
    el.loadTitle.textContent = current.seed === R2.dailySeed() ? "Rendering today's track" : "Rendering track " + current.seed;
    current.song = song;
    current.chart = chart;
    say("Track " + current.seed + ", " + song.bpm + " beats per minute, " + song.key.name + ", " + chart.notes.length + " notes.");
  }

  function renderDifficulty() {
    var buttons = el.difficulty.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", buttons[i].dataset.difficulty === current.difficulty ? "true" : "false");
    }
  }

  function loadTracks() {
    var raw = R2.loadJSON(TRACKS_KEY, {});
    return raw && typeof raw === "object" ? raw : {};
  }

  function saveTracks(map) {
    R2.saveJSON(TRACKS_KEY, map);
  }

  function bestGradeOrder(grade) {
    return { S: 5, A: 4, B: 3, C: 2, D: 1 }[grade] || 0;
  }

  function renderTracks() {
    var map = loadTracks();
    var list = Object.keys(map).map(function (k) { return map[k]; });
    list.sort(function (a, b) { return (b.lastPlayed || 0) - (a.lastPlayed || 0); });
    el.tracks.innerHTML = "";
    if (!list.length) {
      var empty = document.createElement("li");
      empty.innerHTML = '<span class="empty">No tracks yet — every seed is a new song.</span>';
      el.tracks.appendChild(empty);
      return;
    }
    for (var i = 0; i < Math.min(list.length, 8); i++) {
      var row = list[i];
      var item = document.createElement("li");
      var chip = document.createElement("span");
      chip.className = "grade-chip";
      chip.dataset.grade = row.bestGrade || "D";
      chip.textContent = row.bestGrade || "D";
      var seedButton = document.createElement("button");
      seedButton.type = "button";
      seedButton.innerHTML = '<span class="seed">' + row.seed + "</span> <span class='meta'>" +
        row.bpm + " BPM · " + row.key + " · " + Math.round((row.bestAccuracy || 0) * 1000) / 10 + "%</span>";
      seedButton.addEventListener("click", function () {
        setSeed(Number(this.querySelector(".seed").textContent));
        renderDifficulty();
      });
      var plays = document.createElement("span");
      plays.className = "meta";
      plays.textContent = (row.plays || 1) + (row.plays === 1 ? " play" : " plays");
      item.appendChild(seedButton);
      item.appendChild(plays);
      item.appendChild(chip);
      el.tracks.appendChild(item);
    }
  }

  function renderStreak() {
    var daily = R2.loadJSON(DAILY_KEY, null);
    if (!daily || !daily.last) {
      el.streak.textContent = "";
      return;
    }
    el.streak.textContent = daily.streak + "-day streak";
  }

  function touchDaily() {
    var today = R2.dailySeed();
    var daily = R2.loadJSON(DAILY_KEY, null) || { last: 0, streak: 0, best: 0 };
    if (daily.last === today) return daily;
    var yesterday = R2.dailySeed(new Date(Date.now() - 86400000));
    daily.streak = daily.last === yesterday ? (daily.streak || 0) + 1 : 1;
    daily.last = today;
    daily.best = Math.max(daily.best || 0, daily.streak);
    R2.saveJSON(DAILY_KEY, daily);
    return daily;
  }

  function recordResult(result) {
    var map = loadTracks();
    var key = String(result.seed);
    var row = map[key] || {
      seed: result.seed,
      bpm: result.bpm,
      key: result.key,
      plays: 0,
      bestScore: 0,
      bestAccuracy: 0,
      bestGrade: "D",
      recent: []
    };
    row.bpm = result.bpm;
    row.key = result.key;
    row.plays++;
    row.lastPlayed = Date.now();
    row.recent.push({ score: result.score, accuracy: result.accuracy, grade: result.grade, at: Date.now() });
    if (row.recent.length > 8) row.recent.splice(0, row.recent.length - 8);
    if (result.score > row.bestScore) {
      row.bestScore = result.score;
      row.bestAccuracy = result.accuracy;
      row.bestGrade = result.grade;
      current.result = { badge: true };
    } else if (bestGradeOrder(result.grade) > bestGradeOrder(row.bestGrade)) {
      row.bestGrade = result.grade;
      current.result = { badge: true };
    }
    map[key] = row;
    saveTracks(map);
    touchDaily();

    R2.stats.run({
      slug: SLUG,
      score: result.score,
      durMs: result.duration * 1000,
      outcome: result.grade,
      wave: result.difficulty,
      meta: {
        seed: result.seed,
        difficulty: result.difficulty,
        accuracy: result.accuracy,
        grade: result.grade,
        maxCombo: result.maxCombo,
        bpm: result.bpm,
        key: result.key,
        perfect: result.counts.perfect,
        great: result.counts.great,
        good: result.counts.good,
        miss: result.counts.miss,
        notes: result.total
      }
    });
  }

  function drawHistogram(result) {
    var canvas = el.histogram;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(3, root.devicePixelRatio || 1);
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || 640;
    var h = rect.height || 180;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var span = 150;
    var bucketMs = 10;
    var buckets = {};
    for (var i = 0; i < result.deltas.length; i++) {
      var d = Math.max(-span, Math.min(span, result.deltas[i]));
      var b = Math.round(d / bucketMs);
      buckets[b] = (buckets[b] || 0) + 1;
    }
    var count = span / bucketMs * 2 + 1;
    var peak = 0;
    for (var k in buckets) peak = Math.max(peak, buckets[k]);

    var mid = w / 2;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(mid - 0.5, 8, 1, h - 30);

    if (!peak) {
      ctx.fillStyle = "#7c8aa5";
      ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No notes hit — play the track to see your timing spread.", mid, h / 2);
      return;
    }

    var barW = w / count;
    for (var b2 = -span / bucketMs; b2 <= span / bucketMs; b2++) {
      var n = buckets[b2] || 0;
      if (!n) continue;
      var bh = (n / peak) * (h - 40);
      var x = mid + b2 * barW;
      var centreOffset = Math.abs(b2) / (span / bucketMs);
      ctx.fillStyle = centreOffset < 0.25 ? "#7bf1a8" : centreOffset < 0.6 ? "#ffd166" : "#ff5a7a";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, h - 22 - bh, Math.max(1.5, barW - 1), bh);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#7c8aa5";
    ctx.font = "500 11px ui-monospace, monospace";
    ctx.fillText("-150 ms", 6, h - 6);
    ctx.textAlign = "center";
    ctx.fillText("0", mid, h - 6);
    ctx.textAlign = "right";
    ctx.fillText("+150 ms", w - 6, h - 6);
    ctx.textAlign = "left";
  }

  function showResult(result) {
    el.resultTrack.textContent = "Seed " + result.seed + " · " + result.label + " · " + result.bpm + " BPM " + result.key;
    el.resultGrade.textContent = result.grade;
    el.resultGrade.dataset.grade = result.grade;
    el.resultScore.textContent = result.score.toLocaleString("en-US");
    el.resultAccuracy.textContent = (result.accuracy * 100).toFixed(1) + "% accuracy · " + result.maxCombo + "x combo";
    el.resultBadge.hidden = !(current.result && current.result.badge);
    el.counts.innerHTML = "";
    var kinds = ["perfect", "great", "good", "miss"];
    for (var i = 0; i < kinds.length; i++) {
      var item = document.createElement("li");
      item.dataset.kind = kinds[i];
      item.innerHTML = "<b>" + result.counts[kinds[i]] + "</b><span>" + kinds[i] + "</span>";
      el.counts.appendChild(item);
    }
    drawHistogram(result);
    show("result");
    say("Finished with grade " + result.grade + " and " + (result.accuracy * 100).toFixed(1) + " percent accuracy.");
  }

  function play() {
    if (busy) return;
    busy = true;
    R2P.audio.resume();
    el.loadBar.style.width = "0%";
    show("load");
    setSeed(current.seed);
    R2P.audio.render(current.song, function (ratio) {
      el.loadBar.style.width = Math.round(ratio * 100) + "%";
    }).then(function () {
      busy = false;
      show("play");
      game.start(current.song, current.chart);
      say("Playing " + current.song.key.name + " at " + current.song.bpm + " beats per minute.");
    }).catch(function (err) {
      busy = false;
      show("menu");
      el.summary.textContent = "Could not render that track: " + err.message;
      say("The track could not be rendered.");
    });
  }

  function onEnd(result) {
    current.result = null;
    recordResult(result);
    showResult(result);
    renderTracks();
    renderStreak();
  }

  function bind() {
    el.btnPlay.addEventListener("click", play);
    el.btnPause.addEventListener("click", function () { game.pause(); });
    el.btnDaily.addEventListener("click", function () {
      setSeed(R2.dailySeed());
    });
    el.btnRandom.addEventListener("click", function () {
      var seed = (Math.random() * 4294967296) >>> 0;
      setSeed(seed);
    });
    el.seedInput.addEventListener("change", function () {
      var value = parseInt(el.seedInput.value.replace(/\D/g, ""), 10);
      setSeed(isNaN(value) ? R2.dailySeed() : value >>> 0);
    });
    el.difficulty.addEventListener("click", function (ev) {
      var button = ev.target.closest("button[data-difficulty]");
      if (!button) return;
      current.difficulty = button.dataset.difficulty;
      savePrefs({ difficulty: current.difficulty });
      renderDifficulty();
      setSeed(current.seed);
    });
    el.btnRetry.addEventListener("click", play);
    el.btnMenu.addEventListener("click", function () {
      R2P.audio.discard();
      show("menu");
      renderTracks();
      renderStreak();
    });
    el.btnShare.addEventListener("click", function () {
      var seed = current.song ? current.song.seed : current.seed;
      var link = root.location.origin + root.location.pathname + "#seed=" + seed;
      if (root.navigator.clipboard) {
        root.navigator.clipboard.writeText(link).then(function () {
          el.btnShare.textContent = "Copied";
        }, function () {
          el.btnShare.textContent = link;
        });
      } else {
        el.btnShare.textContent = link;
      }
    });
    root.addEventListener("hashchange", function () {
      var seed = seedFromHash();
      if (seed !== null) setSeed(seed);
    });
  }

  function boot() {
    el.live = byId("live");
    el.screenPlay = byId("screen-play");
    el.seedInput = byId("seed-input");
    el.btnPlay = byId("btn-play");
    el.btnPause = byId("btn-pause");
    el.btnDaily = byId("btn-daily");
    el.btnRandom = byId("btn-random");
    el.btnRetry = byId("btn-retry");
    el.btnMenu = byId("btn-menu");
    el.btnShare = byId("btn-share");
    el.difficulty = byId("difficulty");
    el.summary = byId("track-summary");
    el.loadSub = byId("load-sub");
    el.loadTitle = byId("load-title");
    el.loadBar = byId("load-bar");
    el.tracks = byId("tracks");
    el.streak = byId("streak");
    el.resultTrack = byId("result-track");
    el.resultGrade = byId("result-grade");
    el.resultScore = byId("result-score");
    el.resultAccuracy = byId("result-accuracy");
    el.resultBadge = byId("result-badge");
    el.counts = byId("result-counts");
    el.histogram = byId("histogram");

    var prefs = loadPrefs();
    current.difficulty = prefs.difficulty || "normal";
    renderDifficulty();

    game = R2P.createGame({ canvas: byId("stage"), onEnd: onEnd });
    R2P.audio.setVolume(typeof prefs.volume === "number" ? prefs.volume : 0.85);

    bind();

    var fromHash = seedFromHash();
    setSeed(fromHash === null ? R2.dailySeed() : fromHash);
    renderTracks();
    renderStreak();
    say("PULSE ready. Press Play to render today's track " + current.seed + ".");

    R2.markPlayed(SLUG);
    R2.trackPlaytime(SLUG);
    R2.installHint();

    if ("serviceWorker" in root.navigator) {
      root.addEventListener("load", function () {
        root.navigator.serviceWorker.register("service-worker.js").catch(function () {});
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof globalThis !== "undefined" ? globalThis : this);