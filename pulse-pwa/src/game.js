(function (root) {
  "use strict";

  var R2P = root.R2P || (root.R2P = {});
  var LANE_KEYS = ["KeyD", "KeyF", "KeyJ", "KeyK"];
  var LANE_LABELS = ["D", "F", "J", "K"];
  var LANE_COLORS = ["#ff5a7a", "#ffd166", "#5ad1ff", "#7bf1a8"];
  var VIEW_W = 900;
  var VIEW_H = 600;
  var PLAY_X = 170;
  var LANE_W = 140;
  var PLAY_TOP = 70;
  var HIT_Y = 470;
  var APPROACH = 1.5;
  var JUDGEMENT_WEIGHT = { perfect: 1, great: 0.7, good: 0.35, miss: 0 };
  var SCORE_VALUE = { perfect: 300, great: 200, good: 100, miss: 0 };
  var GROUND_TONE = "#7c8aa5";

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function create(opts) {
    var canvas = opts.canvas;
    var ctx = canvas.getContext("2d");
    var audio = R2P.audio;
    var state = "idle";
    var song = null;
    var chart = null;
    var notes = [];
    var cursor = 0;
    var raf = 0;
    var lastFrame = 0;
    var reduced = !!(root.R2 && root.R2.reduced);
    var stats = null;
    var judgement = null;
    var bursts = [];
    var hold = null;
    var keyLane = {};
    var onEnd = opts.onEnd || function () {};

    function resize() {
      var dpr = Math.min(3, root.devicePixelRatio || 1);
      var rect = canvas.getBoundingClientRect();
      var scale = Math.max(0.2, Math.min(rect.width / VIEW_W, rect.height / VIEW_H));
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    }

    function resetStats() {
      stats = {
        score: 0,
        combo: 0,
        maxCombo: 0,
        counts: { perfect: 0, great: 0, good: 0, miss: 0 },
        gauge: 0.5,
        deltas: [],
        judged: 0,
        holdPoints: 0
      };
    }

    function songTime() {
      return audio.currentTime();
    }

    function multiplier() {
      return 1 + Math.min(3, Math.floor(stats.combo / 10));
    }

    function addJudgement(kind, deltaMs, lane) {
      stats.counts[kind]++;
      stats.judged++;
      if (kind === "miss") {
        stats.combo = 0;
        stats.gauge = clamp(stats.gauge - 0.035, 0, 1);
      } else {
        stats.combo++;
        if (stats.combo > stats.maxCombo) stats.maxCombo = stats.combo;
        stats.score += SCORE_VALUE[kind] * multiplier();
        stats.gauge = clamp(stats.gauge + (kind === "perfect" ? 0.012 : kind === "great" ? 0.008 : 0.003), 0, 1);
        if (deltaMs !== null) stats.deltas.push(deltaMs);
      }
      judgement = { kind: kind, at: performance.now(), delta: deltaMs };
      if (!reduced) bursts.push({ lane: lane === undefined ? -1 : lane, kind: kind, life: 1 });
    }

    function accuracy() {
      if (!stats.judged) return 1;
      var sum = 0;
      var kinds = ["perfect", "great", "good", "miss"];
      for (var i = 0; i < kinds.length; i++) sum += stats.counts[kinds[i]] * JUDGEMENT_WEIGHT[kinds[i]];
      return sum / stats.judged;
    }

    function noteY(noteT, now) {
      var progress = (noteT - now) / APPROACH;
      return HIT_Y - progress * (HIT_Y - PLAY_TOP);
    }

    function laneOf(code) {
      var idx = LANE_KEYS.indexOf(code);
      return idx < 0 ? -1 : idx;
    }

    function nearestNote(lane, now) {
      var best = null;
      var bestAbs = Infinity;
      var good = chart.windows.good / 1000;
      for (var i = cursor; i < notes.length; i++) {
        var n = notes[i];
        if (n.t - now > good) break;
        if (n.state !== 0 || n.lane !== lane) continue;
        var d = Math.abs(n.t - now);
        if (d <= good && d < bestAbs) {
          bestAbs = d;
          best = n;
        }
      }
      return best;
    }

    function onKeyDown(ev) {
      if (ev.repeat) return;
      if (ev.code === "Escape") {
        if (state === "playing") pause();
        else if (state === "paused") resume();
        return;
      }
      if (ev.code === "KeyR" && (state === "playing" || state === "paused")) {
        ev.preventDefault();
        restart();
        return;
      }
      var lane = laneOf(ev.code);
      if (lane < 0) return;
      if (state !== "playing") return;
      ev.preventDefault();
      if (keyLane[ev.code]) return;
      keyLane[ev.code] = true;
      hitLane(lane);
    }

    function onKeyUp(ev) {
      var lane = laneOf(ev.code);
      if (lane < 0) return;
      keyLane[ev.code] = false;
      if (hold && hold.lane === lane) hold = null;
    }

    function hitLane(lane) {
      var now = songTime();
      var note = nearestNote(lane, now);
      if (!note) {
        audio.hit("good");
        judgement = { kind: "stray", at: performance.now(), delta: null };
        return;
      }
      var deltaMs = (now - note.t) * 1000;
      var abs = Math.abs(deltaMs);
      var kind = abs <= chart.windows.perfect ? "perfect" : abs <= chart.windows.great ? "great" : "good";
      note.state = 1;
      note.hitLane = lane;
      audio.hit(kind);
      if (root.R2 && R2.buzz) R2.buzz(kind === "perfect" ? 12 : 8);
      if (note.dur > 0) hold = { note: note, lane: lane, until: note.t + note.dur, nextTick: note.t + 0.2 };
      addJudgement(kind, deltaMs, lane);
    }

    function missDue(now) {
      var late = chart.windows.good / 1000;
      while (cursor < notes.length && notes[cursor].t < now - late) {
        if (notes[cursor].state === 0) {
          notes[cursor].state = 2;
          addJudgement("miss", null);
        }
        cursor++;
      }
    }

    function updateBursts(dt) {
      for (var i = bursts.length - 1; i >= 0; i--) {
        bursts[i].life -= dt * 2.6;
        if (bursts[i].life <= 0) bursts.splice(i, 1);
      }
    }

    function tick(nowMs) {
      var dt = lastFrame ? Math.min(0.05, (nowMs - lastFrame) / 1000) : 0;
      lastFrame = nowMs;
      var now = songTime();

      if (state === "playing") {
        missDue(now);
        if (hold) {
          if (now >= hold.until) hold = null;
          else if (now >= hold.nextTick && keyLane[LANE_KEYS[hold.lane]]) {
            hold.nextTick += 0.2;
            stats.holdPoints += 20;
            stats.score += 20;
          }
        }
        if (now >= song.duration + 0.4) {
          finish();
        }
      }

      if (song && stats) {
        updateBursts(dt);
        draw(now);
      }
      raf = root.requestAnimationFrame(tick);
    }

    function draw(now) {
      var w = VIEW_W;
      ctx.clearRect(0, 0, w, VIEW_H);
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(0, 0, w, VIEW_H);

      drawField(now);
      drawHud(now);
    }

    function drawField(now) {
      var playH = HIT_Y - PLAY_TOP + 40;
      for (var lane = 0; lane < 4; lane++) {
        var x = PLAY_X + lane * LANE_W;
        ctx.fillStyle = lane % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.055)";
        ctx.fillRect(x, PLAY_TOP, LANE_W, playH);
        var active = state === "playing" && keyLane[LANE_KEYS[lane]];
        if (active) {
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(x, PLAY_TOP, LANE_W, playH);
        }
      }

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(PLAY_X, HIT_Y, LANE_W * 4, 3);

      var lead = chart.windows.perfect / 1000;
      var lateWin = chart.windows.good / 1000;
      for (var i = cursor; i < notes.length; i++) {
        var n = notes[i];
        var ahead = n.t - now;
        if (ahead > APPROACH) break;
        var holding = n.state === 1;
        if (holding && !(n.dur > 0 && n.t + n.dur > now)) continue;
        if (ahead < -lateWin) continue;
        var y = noteY(n.t, now);
        var x = PLAY_X + n.lane * LANE_W + 10;
        var missed = n.state === 2;
        var color = missed ? "#4a5468" : LANE_COLORS[n.lane];
        var alpha = clamp(1 - Math.max(0, -ahead) / lateWin, 0.25, 1);
        if (n.dur > 0) {
          var tailBottom = noteY(n.t + n.dur, now);
          ctx.globalAlpha = alpha * (holding ? 0.3 : 0.5);
          ctx.fillStyle = color;
          roundRect(ctx, x + 16, y, LANE_W - 52, Math.max(6, tailBottom - y), 8);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (holding) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        var h = n.dur > 0 ? 14 : 22;
        roundRect(ctx, x, y - h / 2, LANE_W - 20, h, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      var glow = ctx.createLinearGradient(0, HIT_Y - 20, 0, HIT_Y + 4);
      glow.addColorStop(0, "rgba(255,255,255,0)");
      glow.addColorStop(1, "rgba(255,255,255,0.09)");
      ctx.fillStyle = glow;
      ctx.fillRect(PLAY_X, HIT_Y - 20, LANE_W * 4, 24);

      for (var b = 0; b < bursts.length; b++) {
        var burst = bursts[b];
        if (burst.lane < 0) continue;
        var bx = PLAY_X + burst.lane * LANE_W + LANE_W / 2;
        ctx.globalAlpha = clamp(burst.life, 0, 1) * 0.8;
        ctx.fillStyle = burst.kind === "perfect" ? "#ffffff" : LANE_COLORS[burst.lane];
        for (var p = 0; p < 7; p++) {
          var ang = (p / 7) * Math.PI * 2 + burst.life;
          var dist = (1 - burst.life) * 34;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(ang) * dist, HIT_Y + Math.sin(ang) * dist * 0.7, 2.5 * burst.life + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = GROUND_TONE;
      for (var k = 0; k < 4; k++) {
        ctx.fillText(LANE_LABELS[k], PLAY_X + k * LANE_W + LANE_W / 2, HIT_Y + 30);
      }
      ctx.textAlign = "left";
    }

    function drawHud(now) {
      ctx.font = "700 46px ui-sans-serif, system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#f2f5fa";
      ctx.textAlign = "left";
      ctx.fillText(String(Math.round(stats.score)), 24, 62);

      ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = GROUND_TONE;
      ctx.fillText("SCORE", 24, 80);

      ctx.textAlign = "right";
      ctx.font = "700 30px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "#f2f5fa";
      ctx.fillText((accuracy() * 100).toFixed(1) + "%", VIEW_W - 24, 56);
      ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = GROUND_TONE;
      ctx.fillText("ACCURACY", VIEW_W - 24, 74);
      ctx.textAlign = "left";

      ctx.fillStyle = "rgba(255,255,255,0.1)";
      roundRect(ctx, 24, 100, 170, 8, 4);
      ctx.fill();
      var gaugeColor = stats.gauge > 0.45 ? "#7bf1a8" : stats.gauge > 0.2 ? "#ffd166" : "#ff5a7a";
      ctx.fillStyle = gaugeColor;
      roundRect(ctx, 24, 100, 170 * stats.gauge, 8, 4);
      ctx.fill();
      ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = GROUND_TONE;
      ctx.fillText("FLOW", 24, 124);

      var centerX = PLAY_X + LANE_W * 2;
      if (state === "playing" && stats.combo >= 3) {
        ctx.textAlign = "center";
        ctx.font = "800 54px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = "rgba(242,245,250,0.92)";
        ctx.fillText(String(stats.combo), centerX, 150);
        ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = GROUND_TONE;
        ctx.fillText("COMBO  x" + multiplier(), centerX, 172);
        ctx.textAlign = "left";
      }

      if (judgement) {
        var age = (performance.now() - judgement.at) / 1000;
        if (age < 0.55) {
          var fade = 1 - age / 0.55;
          ctx.globalAlpha = fade;
          ctx.textAlign = "center";
          ctx.font = "800 30px ui-sans-serif, system-ui, sans-serif";
          var colors = { perfect: "#ffffff", great: "#7bf1a8", good: "#ffd166", miss: "#ff5a7a", stray: "#6b7a92" };
          ctx.fillStyle = colors[judgement.kind] || "#f2f5fa";
          var label = judgement.kind === "stray" ? "" : judgement.kind.toUpperCase();
          if (label) ctx.fillText(label, centerX, 210);
          if (judgement.delta !== null && judgement.delta !== undefined) {
            ctx.font = "600 15px ui-monospace, monospace";
            ctx.fillStyle = GROUND_TONE;
            var sign = judgement.delta > 0 ? "+" : "";
            ctx.fillText(sign + judgement.delta.toFixed(0) + " ms", centerX, 232);
          }
          ctx.globalAlpha = 1;
          ctx.textAlign = "left";
        } else {
          judgement = null;
        }
      }

      var progress = clamp(now / song.duration, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, VIEW_H - 6, VIEW_W, 6);
      ctx.fillStyle = "#5ad1ff";
      ctx.fillRect(0, VIEW_H - 6, VIEW_W * progress, 6);

      var section = null;
      for (var i = 0; i < song.sections.length; i++) {
        if (now >= song.sections[i].bar * song.barDur) section = song.sections[i];
        else break;
      }
      if (section) {
        ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = GROUND_TONE;
        ctx.textAlign = "left";
        ctx.fillText(section.name.toUpperCase(), 24, VIEW_H - 22);
        ctx.textAlign = "right";
        ctx.fillText(song.bpm + " BPM  " + song.key.name, VIEW_W - 24, VIEW_H - 22);
        ctx.textAlign = "left";
      }

      if (state === "paused") {
        ctx.fillStyle = "rgba(6,8,12,0.72)";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.textAlign = "center";
        ctx.font = "800 40px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = "#f2f5fa";
        ctx.fillText("PAUSED", VIEW_W / 2, VIEW_H / 2 - 6);
        ctx.font = "500 15px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = GROUND_TONE;
        ctx.fillText("Esc to resume  -  R to restart", VIEW_W / 2, VIEW_H / 2 + 26);
        ctx.textAlign = "left";
      }
    }

    function result() {
      var acc = accuracy();
      return {
        seed: song.seed,
        difficulty: chart.difficulty,
        label: chart.label,
        bpm: song.bpm,
        key: song.key.name,
        score: Math.round(stats.score),
        maxCombo: stats.maxCombo,
        counts: {
          perfect: stats.counts.perfect,
          great: stats.counts.great,
          good: stats.counts.good,
          miss: stats.counts.miss
        },
        total: notes.length,
        accuracy: acc,
        grade: R2P.chart.gradeFor(chart, acc),
        deltas: stats.deltas.slice(),
        holdPoints: stats.holdPoints,
        duration: song.duration,
        incomplete: stats.judged < notes.length
      };
    }

    function finish() {
      state = "done";
      audio.stop();
      onEnd(result());
    }

    function pause() {
      if (state !== "playing") return;
      state = "paused";
      audio.pause();
    }

    function resume() {
      if (state !== "paused") return;
      audio.play(audio.currentTime());
      state = "playing";
    }

    function seek(seconds) {
      if (!song) return;
      var target = Math.max(0, Math.min(seconds, song.duration - 0.5));
      for (var i = 0; i < notes.length; i++) {
        if (notes[i].t < target - 0.6) notes[i].state = 2;
        else break;
      }
      cursor = 0;
      while (cursor < notes.length && notes[cursor].state !== 0) cursor++;
      hold = null;
      judgement = null;
      bursts = [];
      audio.play(target);
      if (state !== "paused") state = "playing";
    }

function restart() {
      audio.play(0);
      resetStats();
      cursor = 0;
      judgement = null;
      bursts = [];
      hold = null;
      state = "playing";
    }

    function start(nextSong, nextChart) {
      song = nextSong;
      chart = nextChart;
      notes = chart.notes.map(function (n) {
        return { t: n.t, lane: n.lane, dur: n.dur, inst: n.inst, accent: n.accent, state: 0 };
      });
      cursor = 0;
      resetStats();
      judgement = null;
      bursts = [];
      hold = null;
      resize();
      audio.play(0);
      state = "playing";
    }

    function destroy() {
      if (raf) root.cancelAnimationFrame(raf);
      raf = 0;
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("keyup", onKeyUp);
      root.removeEventListener("resize", resize);
    }

    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("keyup", onKeyUp);
    root.addEventListener("resize", resize);
    resize();
    raf = root.requestAnimationFrame(tick);

    var api = {
      start: start,
      pause: pause,
      resume: resume,
      restart: restart,
      seek: seek,
      destroy: destroy,
      result: result,
      stats: function () { return stats; },
      isPlaying: function () { return state === "playing"; },
      state: function () { return state; },
      LANE_KEYS: LANE_KEYS,
      LANE_COLORS: LANE_COLORS
    };
    R2P.game = api;
    return api;
  }

  R2P.createGame = create;
})(typeof globalThis !== "undefined" ? globalThis : this);