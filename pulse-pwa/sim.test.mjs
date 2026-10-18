import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const songMod = require("./src/song.js");
const chartMod = require("./src/chart.js");

const song = songMod;
const chart = chartMod;

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push({ name, err });
  }
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function fingerprint(s) {
  return [
    s.bpm,
    s.key.name,
    s.totalBars,
    s.duration.toFixed(6),
    s.events.length,
    fnv1a(JSON.stringify(s.events.map((e) => [e.t.toFixed(6), e.inst, e.note, e.dur.toFixed(4), e.vel])))
  ].join("|");
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_COUNT = 500;
const seeds = [];
for (let i = 0; i < SEED_COUNT; i++) seeds.push(Math.floor(mulberry32(i * 2654435761)() * 4294967296));

const EPS = 1e-6;

test("same seed produces an identical song", () => {
  for (const seed of seeds.slice(0, 40)) {
    assert.equal(fingerprint(song.generate(seed)), fingerprint(song.generate(seed)));
  }
});

test("different seeds produce different songs", () => {
  const prints = new Set(seeds.slice(0, 60).map((s) => fingerprint(song.generate(s))));
  assert.ok(prints.size >= 55, "expected mostly distinct songs, got " + prints.size);
});

test("daily-shaped seed produces a stable fingerprint", () => {
  assert.equal(fingerprint(song.generate(20261018)), "125|A phrygian|88|168.960000|2483|af920647");
});

test("songs have plausible length, tempo and section count", () => {
  for (const seed of seeds.slice(0, 120)) {
    const s = song.generate(seed);
    assert.ok(s.duration > 90 && s.duration < 220, "duration out of range: " + s.duration);
    assert.ok(s.bpm >= 104 && s.bpm <= 148, "bpm out of range: " + s.bpm);
    assert.equal(s.sections.length, 7);
    assert.equal(s.totalBars, 88);
    assert.ok(s.events.length > 500, "too few events: " + s.events.length);
  }
});

test("events are sorted, in range and on the 16th grid", () => {
  for (const seed of seeds.slice(0, 120)) {
    const s = song.generate(seed);
    let prev = -1;
    for (const ev of s.events) {
      assert.ok(ev.t >= -EPS && ev.t < s.duration + 1, "event time out of range: " + ev.t);
      const steps = ev.t / s.step;
      assert.ok(Math.abs(steps - Math.round(steps)) < 1e-4, "event off the 16th grid: " + ev.t);
      assert.ok(ev.t >= prev - EPS, "events out of order at " + ev.t);
      prev = ev.t;
      assert.ok(ev.dur > 0, "non-positive duration");
      assert.ok(ev.vel > 0 && ev.vel <= 1, "velocity out of range: " + ev.vel);
      assert.ok(ev.step >= 0 && ev.step < 16, "step out of range: " + ev.step);
    }
  }
});

test("pitched instruments stay in the key", () => {
  for (const seed of seeds.slice(0, 120)) {
    const s = song.generate(seed);
    for (const ev of s.events) {
      if (ev.inst === "kick" || ev.inst === "snare" || ev.inst === "hat" || ev.inst === "openhat") continue;
      assert.ok(song.isScaleTone(s.key, ev.note), ev.inst + " note " + ev.note + " outside " + s.key.name);
    }
  }
});

test("layer masks mean intro is sparse and A is full", () => {
  for (const seed of seeds.slice(0, 80)) {
    const s = song.generate(seed);
    const intro = s.sections[0];
    const verse = s.sections[1];
    assert.equal(intro.name, "intro");
    assert.equal(intro.layers.drums, false);
    assert.equal(intro.layers.lead, false);
    assert.equal(verse.name, "A");
    assert.ok(verse.layers.drums && verse.layers.bass && verse.layers.pad && verse.layers.lead);
    const insts = (bar) => new Set(s.events.filter((e) => e.bar >= bar && e.bar < bar + 8).map((e) => e.inst));
    const introInsts = insts(intro.bar);
    assert.ok(!introInsts.has("drums") && !introInsts.has("lead") && !introInsts.has("bass"), "intro is not sparse");
    assert.ok(introInsts.has("pad"), "intro has no pad");
    const verseInsts = insts(verse.bar);
    assert.ok(verseInsts.has("kick") && verseInsts.has("bass") && verseInsts.has("lead"));
  }
});

test("melody is motif-driven: most bars repeat one phrase length", () => {
  for (const seed of seeds.slice(0, 80)) {
    const s = song.generate(seed);
    for (const sec of s.sections) {
      if (!sec.layers.lead) continue;
      const counts = new Map();
      for (let b = 0; b < sec.bars; b++) {
        const n = s.events.filter((e) => e.inst === "lead" && e.bar === sec.bar + b).length;
        counts.set(n, (counts.get(n) || 0) + 1);
      }
      let modal = 0;
      let modalCount = 0;
      for (const [len, howMany] of counts) {
        if (howMany > modalCount || (howMany === modalCount && len > modal)) {
          modal = len;
          modalCount = howMany;
        }
      }
      const minPhrase = sec.name === "break" ? 2 : 3;
      assert.ok(modal >= minPhrase, "modal phrase length too short in " + sec.name + ": " + modal);
      assert.ok(Math.max(...counts.keys()) <= 8, "too many melody notes in a bar");
      assert.ok(modalCount / sec.bars >= 0.4, "bars do not repeat the motif: " + modalCount + "/" + sec.bars);
    }
  }
});

test("candidate counts increase with difficulty", () => {
  for (const seed of seeds.slice(0, 120)) {
    const s = song.generate(seed);
    const easy = chart.candidates(s, "easy").length;
    const normal = chart.candidates(s, "normal").length;
    const hard = chart.candidates(s, "hard").length;
    assert.ok(hard >= normal, "hard " + hard + " < normal " + normal);
    assert.ok(normal >= easy, "normal " + normal + " < easy " + easy);
    assert.ok(easy > 0 && hard > 0);
  }
});

test("charts respect minGap, lane range and lane spacing", () => {
  for (const seed of seeds.slice(0, 200)) {
    const s = song.generate(seed);
    for (const key of chart.ORDER) {
      const built = chart.build(s, key);
      const diff = chart.DIFFICULTIES[key];
      assert.ok(built.notes.length > 20, key + " produced too few notes: " + built.notes.length);
      let prev = null;
      for (const n of built.notes) {
        assert.ok(n.t >= -EPS && n.t < s.duration, key + " note time out of range: " + n.t);
        assert.ok(n.lane >= 0 && n.lane < 4, key + " lane out of range: " + n.lane);
        assert.ok(n.dur >= 0, key + " negative hold");
        if (prev) {
          assert.ok(n.t - prev.t >= diff.minGap / 1000 - 1e-6, key + " gap " + (n.t - prev.t) + " < " + diff.minGap);
          if (n.lane === prev.lane) {
            assert.ok(n.t - prev.t >= (diff.minGap / 1000) * 1.6 - 1e-6, key + " same-lane repeat too close");
          }
        }
        prev = n;
      }
      for (let i = 1; i < built.notes.length; i++) {
        assert.ok(built.notes[i].t > built.notes[i - 1].t, key + " notes not strictly ordered");
      }
    }
  }
});

test("hard keeps most of the melody and outcharts normal", () => {
  for (const seed of seeds.slice(0, 80)) {
    const s = song.generate(seed);
    const hard = chart.build(s, "hard");
    const normal = chart.build(s, "normal");
    const melody = s.events.filter((e) => e.inst === "lead");
    let matched = 0;
    for (const m of melody) {
      if (hard.notes.some((n) => n.inst === "lead" && Math.abs(n.t - m.t) < 1e-6)) matched++;
    }
    assert.ok(matched / melody.length > 0.6, "hard dropped too much melody: " + matched + "/" + melody.length);
    assert.ok(hard.notes.length > normal.notes.length, "hard " + hard.notes.length + " not denser than normal " + normal.notes.length);
  }
});

test("chart density stays in a playable band", () => {
  for (const seed of seeds.slice(0, 150)) {
    const s = song.generate(seed);
    for (const key of chart.ORDER) {
      const built = chart.build(s, key);
      const perSecond = built.stats.perSecond;
      assert.ok(perSecond > 0.4 && perSecond < 4.2, key + " density " + perSecond.toFixed(2) + " nps for seed " + seed);
      assert.ok(built.stats.peakPerTwoSeconds <= Math.ceil(2 / (built.minGap / 1000)) + 1, key + " peak density too high");
      assert.ok(built.stats.firstNote >= 0 && built.stats.lastNote < s.duration);
      assert.equal(built.stats.notes, built.notes.length);
      assert.equal(built.stats.candidateCount - built.stats.dropped, built.notes.length);
    }
  }
});

test("easy charts are a subset of normal melody selection", () => {
  for (const seed of seeds.slice(0, 100)) {
    const s = song.generate(seed);
    const easy = chart.candidates(s, "easy");
    const normal = chart.candidates(s, "normal");
    for (const n of easy) {
      const match = normal.find((m) => Math.abs(m.t - n.t) < 1e-6 && m.inst === n.inst);
      assert.ok(match, "easy note at " + n.t.toFixed(4) + " is not in normal");
    }
  }
});

test("difficulties are ordered and windows are sane", () => {
  assert.deepEqual(chart.ORDER, ["easy", "normal", "hard"]);
  let prevMinGap = Infinity;
  let prevPerfect = Infinity;
  for (const key of chart.ORDER) {
    const d = chart.DIFFICULTIES[key];
    assert.ok(d.windows.perfect < d.windows.great && d.windows.great < d.windows.good);
    assert.ok(d.minGap > d.windows.good, key + " minGap must exceed its own good window");
    assert.ok(d.minGap < prevMinGap, key + " minGap should tighten with difficulty");
    prevMinGap = d.minGap;
    assert.ok(d.windows.perfect < prevPerfect, key + " perfect window should tighten with difficulty");
    prevPerfect = d.windows.perfect;
    assert.ok(d.gradeS > d.gradeA && d.gradeA > d.gradeB && d.gradeB > d.gradeC);
  }
});

test("grades fall out of accuracy thresholds", () => {
  const d = chart.DIFFICULTIES.normal;
  assert.equal(chart.gradeFor(d, 1), "S");
  assert.equal(chart.gradeFor(d, 0.93), "A");
  assert.equal(chart.gradeFor(d, 0.85), "B");
  assert.equal(chart.gradeFor(d, 0.7), "C");
  assert.equal(chart.gradeFor(d, 0.1), "D");
});

test("holds stay a minority of the chart", () => {
  for (const seed of seeds.slice(0, 150)) {
    const s = song.generate(seed);
    for (const key of chart.ORDER) {
      const built = chart.build(s, key);
      const share = built.stats.holds / built.stats.notes;
      assert.ok(share < 0.45, key + " hold share too high: " + (share * 100).toFixed(0) + "%");
      for (const n of built.notes) {
        if (!n.dur) continue;
        assert.ok(n.dur <= s.barDur * 0.55, "hold longer than half a bar: " + n.dur);
        assert.ok(n.inst === "lead", "only melody notes can be holds");
      }
    }
  }
});

test("build rejects unknown difficulties", () => {
  assert.throws(() => chart.build(song.generate(1), "impossible"), /unknown difficulty/);
});

test("helpers behave", () => {
  assert.equal(song.midiToFreq(69), 440);
  assert.ok(Math.abs(song.midiToFreq(81) - 880) < 1e-9);
  const s = song.generate(7);
  assert.equal(song.isScaleTone(s.key, 60 + s.key.rootPc), true);
  assert.equal(song.NOTE_NAMES.length, 12);
});

test("500 seeds generate without throwing", () => {
  let total = 0;
  for (const seed of seeds) {
    const s = song.generate(seed);
    total += chart.build(s, "normal").notes.length;
  }
  assert.ok(total > 60000, "suspiciously few notes overall: " + total);
});

if (failures.length) {
  for (const f of failures) {
    process.stderr.write("FAIL  " + f.name + "\n      " + (f.err && f.err.message) + "\n");
  }
  process.stderr.write("\n" + failures.length + " failed, " + passed + " passed\n");
  process.exit(1);
}

process.stdout.write("pulse sim: " + passed + " tests passed\n");