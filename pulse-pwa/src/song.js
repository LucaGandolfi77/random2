(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.R2P = root.R2P || {};
  root.R2P.song = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var STEP_NAMES = ["#", "s"];

  var MODES = [
    { name: "aeolian", steps: [0, 2, 3, 5, 7, 8, 10] },
    { name: "dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
    { name: "phrygian", steps: [0, 1, 3, 5, 7, 8, 10] },
    { name: "lydian", steps: [0, 2, 4, 6, 7, 9, 11] }
  ];

  var TEMPLATE = [
    { name: "intro", bars: 8, layers: { pad: true, drums: false, bass: false, lead: false } },
    { name: "A", bars: 16, layers: { pad: true, drums: true, bass: true, lead: true } },
    { name: "B", bars: 16, layers: { pad: true, drums: true, bass: true, lead: true } },
    { name: "break", bars: 8, layers: { pad: true, drums: false, bass: false, lead: true } },
    { name: "A2", bars: 16, layers: { pad: true, drums: true, bass: true, lead: true } },
    { name: "C", bars: 16, layers: { pad: true, drums: true, bass: true, lead: true } },
    { name: "outro", bars: 8, layers: { pad: false, drums: true, bass: true, lead: false } }
  ];

  var PROGRESSIONS = [
    [0, 5, 2, 6],
    [0, 6, 3, 6],
    [5, 3, 0, 6],
    [0, 3, 5, 6],
    [0, 5, 3, 4]
  ];

  var KICK_PATTERNS = [
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0]
  ];

  var MOTIFS = [
    { steps: [0, 4, 6, 8, 12], degs: [0, 2, 1, 0, 3] },
    { steps: [0, 3, 4, 8, 12, 14], degs: [0, 1, 2, 2, 1, 0] },
    { steps: [0, 2, 4, 6, 8, 10, 12, 14], degs: [0, -1, 1, 2, 1, -1, 0, 3] },
    { steps: [0, 6, 8, 14], degs: [0, 2, 1, 3] },
    { steps: [0, 2, 6, 8, 10], degs: [0, 1, 3, 0, 2] },
    { steps: [0, 4, 7, 8, 12, 15], degs: [0, 2, 1, 3, 1, 0] },
    { steps: [0, 4, 8, 9, 12], degs: [0, 1, 2, 1, 0] },
    { steps: [0, 2, 3, 6, 8, 12, 14], degs: [0, 1, 2, 0, 2, 1, 0] }
  ];

  var TRIAD_OFFSETS = [0, 2, 4];
  var PAD_MIDI = 48;
  var BASS_MIDI = 36;
  var LEAD_MIDI = 72;

  function localMulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mulberry32() {
    var shared = typeof globalThis !== "undefined" && globalThis.R2 && globalThis.R2.mulberry32;
    return shared || localMulberry32;
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function pickMotifs(rng, count) {
    var out = [];
    var used = {};
    while (out.length < count) {
      var m = pick(rng, MOTIFS);
      if (used[MOTIFS.indexOf(m)]) continue;
      used[MOTIFS.indexOf(m)] = true;
      out.push(m);
    }
    return out;
  }

  function sectionEnergy(s) {
    var l = s.layers;
    return (l.pad ? 0.5 : 0) + (l.drums ? 1 : 0) + (l.bass ? 1 : 0) + (l.lead ? 1 : 0);
  }

  function planSections() {
    var sections = [];
    var bar = 0;
    for (var i = 0; i < TEMPLATE.length; i++) {
      var t = TEMPLATE[i];
      sections.push({
        name: t.name,
        bar: bar,
        bars: t.bars,
        layers: t.layers,
        energy: sectionEnergy(t)
      });
      bar += t.bars;
    }
    return sections;
  }

  function scaleMidi(mode, rootPc, baseMidi, scaleIndex) {
    var oct = Math.floor(scaleIndex / 7);
    var idx = scaleIndex - oct * 7;
    return baseMidi + rootPc + mode.steps[idx] + 12 * oct;
  }

  function triadFor(mode, chordDegree) {
    var out = [];
    for (var i = 0; i < TRIAD_OFFSETS.length; i++) out.push(chordDegree + TRIAD_OFFSETS[i]);
    return out;
  }

  function motifNoteScaleIndex(triad, deg) {
    if (deg < 0) return triad[0] - 1;
    if (deg >= 3) return triad[0] + 7;
    return triad[deg];
  }

  function mutateMotif(motif, rng) {
    var steps = motif.steps.slice();
    var degs = motif.degs.slice();
    var roll = rng();
    var i;
    if (roll < 0.45 && steps.length > 3) {
      steps = steps.slice(0, steps.length - 1);
      degs = degs.slice(0, degs.length - 1);
    } else if (roll < 0.7) {
      for (i = 1; i < steps.length; i++) {
        if (rng() < 0.3) {
          var moved = steps[i] + (rng() < 0.5 ? 2 : -2);
          steps[i] = moved < 0 || moved > 15 ? motif.steps[i] : moved;
        }
      }
    } else if (roll < 0.88) {
      for (i = 0; i < degs.length; i++) {
        if (rng() < 0.3) degs[i] = degs[i] - 1;
      }
    } else {
      steps = steps.slice(0, Math.max(3, Math.floor(steps.length / 2)));
      degs = degs.slice(0, steps.length);
    }
    var pairs = [];
    for (i = 0; i < steps.length; i++) pairs.push([steps[i], degs[i] === undefined ? degs[degs.length - 1] : degs[i]]);
    pairs.sort(function (a, b) { return a[0] - b[0]; });
    var out = { steps: [], degs: [] };
    for (i = 0; i < pairs.length; i++) {
      if (pairs[i][0] < 0 || pairs[i][0] > 15) continue;
      out.steps.push(pairs[i][0]);
      out.degs.push(pairs[i][1]);
    }
    return out;
  }

  function generate(seed) {
    var mul = mulberry32();
    var rng = mul(seed >>> 0);

    var mode = pick(rng, MODES);
    var rootPc = Math.floor(rng() * 12);
    var bpm = 104 + Math.floor(rng() * 45);
    var beat = 60 / bpm;
    var step = beat / 4;
    var barDur = beat * 4;
    var prog = pick(rng, PROGRESSIONS);
    var kickPat = pick(rng, KICK_PATTERNS);
    var snareGhost = rng() < 0.55;
    var hatSixteenths = rng() < 0.4;
    var motifBank = pickMotifs(rng, TEMPLATE.length);
    var swing = rng() < 0.25 ? 0.14 : 0;

    var sections = planSections();
    var totalBars = sections[sections.length - 1].bar + sections[sections.length - 1].bars;
    var duration = totalBars * barDur;

    var events = [];

    function push(t, inst, note, dur, vel, extra) {
      var absSteps = Math.round(t / step);
      var ev = {
        t: t,
        inst: inst,
        note: note,
        dur: dur,
        vel: vel,
        bar: Math.floor(absSteps / 16),
        step: absSteps % 16
      };
      if (extra) for (var k in extra) ev[k] = extra[k];
      events.push(ev);
    }

    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      var motif = motifBank[s % motifBank.length];
      var barSectionStart = true;
      for (var b = 0; b < sec.bars; b++) {
        var barIndex = sec.bar + b;
        var barT = barIndex * barDur;
        var chordDeg = prog[barIndex % prog.length];
        var triad = triadFor(mode, chordDeg);
        var energy = sec.energy;

        if (sec.layers.pad) {
          for (var p = 0; p < triad.length; p++) {
            push(barT, "pad", scaleMidi(mode, rootPc, PAD_MIDI, triad[p] + (p === 0 ? 0 : 0)), barDur * 0.98, 0.22, { section: s, deg: triad[p] });
          }
        }

        if (sec.layers.drums) {
          for (var k = 0; k < 16; k++) {
            if (kickPat[k]) push(barT + k * step, "kick", 36, 0.18, 0.95, { section: s, accent: k === 0 });
          }
          push(barT + 4 * step, "snare", 40, 0.14, 0.75, { section: s, accent: false });
          push(barT + 12 * step, "snare", 40, 0.14, 0.75, { section: s, accent: false });
          if (snareGhost) push(barT + 7 * step, "snare", 40, 0.08, 0.25, { section: s, accent: false, ghost: true });
          if (snareGhost) push(barT + 15 * step, "snare", 40, 0.08, 0.22, { section: s, accent: false, ghost: true });
          var hatEvery = hatSixteenths && energy >= 3.5 ? 1 : 2;
          for (var h = 0; h < 16; h += hatEvery) {
            var openHat = h === 14 && energy >= 3.5;
            push(barT + h * step, openHat ? "openhat" : "hat", openHat ? 52 : 60, openHat ? 0.16 : 0.05, h % 4 === 0 ? 0.5 : 0.32, { section: s });
          }
        }

        if (sec.layers.bass) {
          var bassDeg = chordDeg;
          push(barT, "bass", scaleMidi(mode, rootPc, BASS_MIDI, bassDeg), beat * 0.85, 0.8, { section: s, deg: bassDeg });
          push(barT + 8 * step, "bass", scaleMidi(mode, rootPc, BASS_MIDI, bassDeg), beat * 0.5, 0.7, { section: s, deg: bassDeg });
          if (energy >= 3.5) {
            push(barT + 6 * step, "bass", scaleMidi(mode, rootPc, BASS_MIDI, bassDeg + 7), beat * 0.4, 0.6, { section: s, deg: bassDeg + 7 });
            push(barT + 14 * step, "bass", scaleMidi(mode, rootPc, BASS_MIDI, bassDeg), beat * 0.4, 0.62, { section: s, deg: bassDeg });
          }
          if (swing && b % 2 === 1) push(barT + 10 * step, "bass", scaleMidi(mode, rootPc, BASS_MIDI, chordDeg + 4), beat * 0.3, 0.5, { section: s, deg: chordDeg + 4, off: step * swing });
        }

        if (sec.layers.lead) {
          var variant = b % 2 === 0 ? mutateMotif(motif, rng) : motif;
          var isBreak = sec.name === "break";
          for (var n = 0; n < variant.steps.length; n++) {
            var st = variant.steps[n];
            if (st < 0 || st > 15) continue;
            if (isBreak && st % 4 !== 0) continue;
            var deg = variant.degs[n];
            var scaleIdx = motifNoteScaleIndex(triad, deg);
            var nextStep = n + 1 < variant.steps.length ? variant.steps[n + 1] : 16;
            var lenSteps = Math.max(1, Math.min(nextStep - st, 16 - st));
            var sustain = (st === 0 && lenSteps >= 4) || (st === 8 && lenSteps >= 2);
            var noteDur = sustain ? (st === 0 ? 8 : 4) * step * 0.9 : lenSteps * step * 0.9;
            var vel = n === 0 ? 0.7 : 0.55 + (rng() < 0.25 ? 0.15 : 0);
            push(barT + st * step, "lead", scaleMidi(mode, rootPc, LEAD_MIDI, scaleIdx), noteDur, vel, {
              section: s,
              deg: scaleIdx,
              downbeat: st === 0,
              sustain: sustain,
              phraseStart: n === 0,
              lastPhrase: barSectionStart && n === 0
            });
          }
        }
        barSectionStart = b === sec.bars - 1;
      }
    }

    events.sort(function (a, b) { return a.t - b.t || rankOf(a.inst) - rankOf(b.inst); });

    return {
      seed: seed >>> 0,
      bpm: bpm,
      beat: beat,
      step: step,
      barDur: barDur,
      swing: swing,
      key: {
        name: NOTE_NAMES[rootPc] + " " + mode.name,
        rootPc: rootPc,
        mode: mode.name,
        steps: mode.steps.slice()
      },
      progression: prog.slice(),
      kickPattern: kickPat.slice(),
      sections: sections.map(function (sec) {
        return { name: sec.name, bar: sec.bar, bars: sec.bars, energy: sec.energy, layers: sec.layers };
      }),
      totalBars: totalBars,
      duration: duration,
      events: events
    };
  }

  function rankOf(inst) {
    return inst === "kick" ? 0 : inst === "snare" ? 1 : inst === "hat" || inst === "openhat" ? 2 : inst === "bass" ? 3 : inst === "pad" ? 4 : 5;
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function isScaleTone(key, midi) {
    var pc = ((midi % 12) + 12) % 12;
    var rel = ((pc - key.rootPc) % 12 + 12) % 12;
    for (var i = 0; i < key.steps.length; i++) if (key.steps[i] === rel) return true;
    return false;
  }

  return {
    generate: generate,
    midiToFreq: midiToFreq,
    isScaleTone: isScaleTone,
    NOTE_NAMES: NOTE_NAMES,
    STEP_NAMES: STEP_NAMES,
    MODES: MODES
  };
});