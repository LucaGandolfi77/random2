(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.R2P = root.R2P || {};
  root.R2P.chart = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DIFFICULTIES = {
    easy: {
      key: "easy",
      label: "Easy",
      leadEvery: 4,
      accents: "none",
      holds: false,
      windows: { perfect: 50, great: 100, good: 150 },
      minGap: 155,
      gradeS: 0.95,
      gradeA: 0.9,
      gradeB: 0.8,
      gradeC: 0.65
    },
    normal: {
      key: "normal",
      label: "Normal",
      leadEvery: 2,
      accents: "boundary",
      holds: true,
      windows: { perfect: 45, great: 90, good: 130 },
      minGap: 135,
      gradeS: 0.96,
      gradeA: 0.92,
      gradeB: 0.82,
      gradeC: 0.68
    },
    hard: {
      key: "hard",
      label: "Hard",
      leadEvery: 1,
      accents: "downbeat",
      holds: true,
      windows: { perfect: 35, great: 70, good: 105 },
      minGap: 120,
      gradeS: 0.97,
      gradeA: 0.93,
      gradeB: 0.84,
      gradeC: 0.7
    }
  };

  var ORDER = ["easy", "normal", "hard"];

  function sectionBoundaryBars(song) {
    var set = {};
    for (var i = 0; i < song.sections.length; i++) {
      var sec = song.sections[i];
      set[sec.bar] = true;
      set[sec.bar + sec.bars - 1] = true;
    }
    return set;
  }

  function isAccent(song, ev, mode) {
    if (ev.ghost) return false;
    if (mode === "downbeat") {
      if (ev.inst === "kick") return ev.step === 0;
      return ev.inst === "snare";
    }
    if (mode === "boundary") {
      if (ev.inst !== "kick" || ev.step !== 0) return false;
      return song.__boundaryBars[ev.bar] === true;
    }
    return false;
  }

  function laneFor(ev) {
    if (ev.deg !== undefined && ev.deg !== null) return ((ev.deg % 4) + 4) % 4;
    return (ev.bar + ev.step) % 4;
  }

  function candidates(song, diffKey) {
    var diff = DIFFICULTIES[diffKey];
    song.__boundaryBars = sectionBoundaryBars(song);
    var out = [];
    var i;
    var melody = [];
    for (i = 0; i < song.events.length; i++) {
      if (song.events[i].inst === "lead") melody.push(song.events[i]);
    }
    for (i = 0; i < melody.length; i += diff.leadEvery) {
      var m = melody[i];
      out.push({
        t: m.t,
        lane: laneFor(m),
        dur: diff.holds && m.sustain ? m.dur : 0,
        deg: m.deg,
        inst: "lead",
        downbeat: m.downbeat === true
      });
    }
    if (diff.accents !== "none") {
      for (i = 0; i < song.events.length; i++) {
        var ev = song.events[i];
        if (!isAccent(song, ev, diff.accents)) continue;
        out.push({
          t: ev.t,
          lane: laneFor(ev),
          dur: 0,
          deg: undefined,
          inst: ev.inst,
          downbeat: ev.step === 0,
          accent: true
        });
      }
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  function build(song, diffKey) {
    var diff = DIFFICULTIES[diffKey];
    if (!diff) throw new Error("unknown difficulty: " + diffKey);
    var pool = candidates(song, diffKey);
    var notes = [];
    var last = null;
    var minGapSec = diff.minGap / 1000;
    var sameLaneWindow = minGapSec * 1.6;

    for (var i = 0; i < pool.length; i++) {
      var cand = pool[i];
      if (last && cand.t - last.t < minGapSec) continue;
      var lane = cand.lane;
      if (last && lane === last.lane && cand.t - last.t < sameLaneWindow) {
        lane = (lane + 1) % 4;
      }
      notes.push({
        t: cand.t,
        lane: lane,
        dur: cand.dur,
        deg: cand.deg,
        inst: cand.inst,
        accent: cand.accent === true,
        downbeat: cand.downbeat === true
      });
      last = notes[notes.length - 1];
    }

    var holds = 0;
    for (var h = 0; h < notes.length; h++) if (notes[h].dur > 0) holds++;

    var span = notes.length > 1 ? notes[notes.length - 1].t - notes[0].t : 1;
    var peak = 0;
    var windowStart = 0;
    for (var p = 0; p < notes.length; p++) {
      while (notes[p].t - notes[windowStart].t > 2) windowStart++;
      var inWin = p - windowStart + 1;
      if (inWin > peak) peak = inWin;
    }

    return {
      difficulty: diff.key,
      label: diff.label,
      windows: diff.windows,
      minGap: diff.minGap,
      gradeS: diff.gradeS,
      gradeA: diff.gradeA,
      gradeB: diff.gradeB,
      gradeC: diff.gradeC,
      notes: notes,
      stats: {
        notes: notes.length,
        holds: holds,
        perSecond: notes.length / Math.max(1, span),
        peakPerTwoSeconds: peak,
        firstNote: notes.length ? notes[0].t : null,
        lastNote: notes.length ? notes[notes.length - 1].t : null,
        candidateCount: pool.length,
        dropped: pool.length - notes.length
      }
    };
  }

  function gradeFor(diff, accuracy) {
    if (accuracy >= diff.gradeS) return "S";
    if (accuracy >= diff.gradeA) return "A";
    if (accuracy >= diff.gradeB) return "B";
    if (accuracy >= diff.gradeC) return "C";
    return "D";
  }

  return {
    build: build,
    candidates: candidates,
    gradeFor: gradeFor,
    DIFFICULTIES: DIFFICULTIES,
    ORDER: ORDER
  };
});