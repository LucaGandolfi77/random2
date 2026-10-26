/*
 * Sand Loop — the rules
 * ---------------------
 * A fixed-step, DOM-free simulation of one run:
 *
 *   · the picture is a reservoir of coloured grains
 *   · a hopper pours them in colour runs
 *   · buckets ride a loop; the bucket in front of the hopper is open
 *   · the loop turns automatically to a bucket of the current colour
 *   · matching grains take a cell from the board; the rest fill the tray
 *
 * The simulation does not know about pixels, canvases or audio. It emits a
 * small event list that the renderer and the UI consume.
 */

import { mulberry32 } from "./quantize.js";

export const TAU = Math.PI * 2;

export const LOOP = {
  cx: 180,
  cy: 198,
  rx: 143,
  ry: 47,
  topY: 151,
  hopperX: 180,
  hopperY: 45
};

export const DEFAULT_CONFIG = {
  slots: 5,
  pourRate: 26,
  grace: 2.2,
  bucketCapacity: 120,
  rotationSpeed: 30,
  runMin: 26,
  runMax: 48,
  spillShare: 0.18,
  grainGravity: 1100,
  grainStartVy: 190,
  grainSpread: 14,
  alignEpsilon: 0.012
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function normalizeAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export function createEngine(spec) {
  const config = Object.assign({}, DEFAULT_CONFIG, spec.config || {});
  const counts = spec.counts.map((n) => Math.max(0, n | 0));
  const total = counts.reduce((a, b) => a + b, 0);
  const slots = Math.max(1, Math.min(8, Math.round(config.slots)));
  const gap = TAU / slots;
  const rng = mulberry32((spec.seed == null ? 1 : spec.seed) >>> 0);

  const state = {
    status: "playing",
    time: 0,
    total,
    slots,
    gap,
    buckets: new Array(slots).fill(null),
    selected: null,
    loopAngle: 0,
    targetAngle: 0,
    currentColor: -1,
    upcoming: [],
    runLeft: 0,
    reserve: counts.slice(),
    pending: counts.map(() => 0),
    capturedByColor: counts.map(() => 0),
    captured: 0,
    spilled: 0,
    spillLimit: Math.max(12, Math.round(total * config.spillShare)),
    score: 0,
    combo: 0,
    bestCombo: 0,
    grains: [],
    graceLeft: config.grace,
    holding: false,
    aligned: false,
    pourRate: config.pourRate,
    seed: spec.seed == null ? 1 : spec.seed,
    paletteCount: counts.length,
    stars: 0
  };

  const captureCell = typeof spec.capture === "function" ? spec.capture : null;
  const accessible = typeof spec.accessible === "function"
    ? spec.accessible
    : (color) => state.reserve[color] || 0;

  const events = [];
  let emitAcc = 0;
  let nextGrainId = 1;

  function emit(type, data) {
    events.push(Object.assign({ type }, data || {}));
  }

  function remainingColor(color) {
    return (counts[color] || 0) - state.capturedByColor[color];
  }

  function chooseColor() {
    const available = [];
    for (let c = 0; c < counts.length; c++) {
      if (state.reserve[c] > 0 && accessible(c) > 0) available.push(c);
    }
    if (!available.length) return -1;

    let pool = available;
    if (available.length > 1 && available.indexOf(state.currentColor) !== -1) {
      pool = available.filter((c) => c !== state.currentColor);
    }
    let sum = 0;
    for (let i = 0; i < pool.length; i++) sum += accessible(pool[i]);
    if (sum <= 0) return pool[0];
    let pick = rng() * sum;
    for (let i = 0; i < pool.length; i++) {
      pick -= accessible(pool[i]);
      if (pick <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function fillPreview() {
    while (state.upcoming.length < 2) {
      const c = chooseColor();
      if (c < 0) break;
      state.upcoming.push(c);
    }
  }

  function slotAngle(i) {
    return normalizeAngle(state.loopAngle + i * gap);
  }

  function selectForColor(preferSlot) {
    const candidates = [];
    for (let i = 0; i < slots; i++) {
      const b = state.buckets[i];
      if (b && b.color === state.currentColor) candidates.push(i);
    }
    if (!candidates.length) {
      state.selected = null;
      state.targetAngle = state.loopAngle;
      state.aligned = false;
      return;
    }
    let pick = -1;
    if (preferSlot != null && candidates.indexOf(preferSlot) !== -1) {
      pick = preferSlot;
    } else {
      let best = Infinity;
      for (let i = 0; i < candidates.length; i++) {
        const d = Math.abs(normalizeAngle(slotAngle(candidates[i])));
        if (d < best) { best = d; pick = candidates[i]; }
      }
    }
    state.selected = pick;
    state.targetAngle = normalizeAngle(-pick * gap);
    state.aligned = Math.abs(normalizeAngle(state.loopAngle - state.targetAngle)) < config.alignEpsilon;
    emit("select", { slot: pick, color: state.currentColor });
  }

  function startRun() {
    let color = -1;
    while (state.upcoming.length) {
      const candidate = state.upcoming.shift();
      if (state.reserve[candidate] > 0 && accessible(candidate) > 0) {
        color = candidate;
        break;
      }
    }
    if (color < 0) color = chooseColor();
    if (color < 0) {
      state.currentColor = -1;
      state.runLeft = 0;
      return false;
    }
    state.currentColor = color;
    state.runLeft = config.runMin + Math.floor(rng() * (config.runMax - config.runMin + 1));
    state.runLeft = Math.min(state.runLeft, state.reserve[color], accessible(color));
    fillPreview();
    selectForColor();
    emit("color", { color });
    return true;
  }

  function startGame() {
    state.currentColor = chooseColor();
    if (state.currentColor >= 0) {
      state.runLeft = Math.min(
        config.runMin + Math.floor(rng() * (config.runMax - config.runMin + 1)),
        state.reserve[state.currentColor],
        accessible(state.currentColor)
      );
      fillPreview();
      emit("color", { color: state.currentColor });
    }
  }

  function spawnGrain() {
    const color = state.currentColor;
    if (color < 0 || state.reserve[color] <= 0) return false;
    const grain = {
      id: nextGrainId++,
      color,
      x: LOOP.hopperX + (rng() - 0.5) * config.grainSpread * 2,
      y: LOOP.hopperY + 2,
      vx: (rng() - 0.5) * 24,
      vy: config.grainStartVy + rng() * 35,
      r: 2.2 + rng() * 1.9,
      phase: rng() * TAU
    };
    state.grains.push(grain);
    state.reserve[color]--;
    state.pending[color]++;
    state.runLeft--;
    if (state.runLeft <= 0 || state.reserve[color] <= 0) {
      /* The run is finished. The next grain starts the next colour. */
      state.runLeft = 0;
    }
    return true;
  }

  function multiplier() {
    return 1 + Math.min(4, Math.floor(state.combo / 45));
  }

  function checkWin() {
    if (state.captured >= total && state.status === "playing") {
      state.status = "won";
      state.holding = false;
      const spillRoom = Math.max(0, state.spillLimit - state.spilled);
      state.score += 2000 + Math.round(1400 * (spillRoom / Math.max(1, state.spillLimit)));
      const ratio = state.spilled / Math.max(1, total);
      state.stars = ratio <= 0.035 ? 3 : ratio <= 0.09 ? 2 : 1;
      emit("win", { score: state.score, stars: state.stars });
      return true;
    }
    return false;
  }

  function checkLose() {
    if (state.spilled >= state.spillLimit && state.status === "playing") {
      state.status = "lost";
      state.holding = false;
      emit("lose", { spilled: state.spilled });
      return true;
    }
    return false;
  }

  function resolveGrain(grain) {
    const slot = state.selected;
    const bucket = slot == null ? null : state.buckets[slot];
    if (bucket && state.aligned && bucket.color === grain.color) {
      const cell = captureCell ? captureCell(grain.color) : null;
      if (captureCell && (cell == null || cell === -1)) {
        state.pending[grain.color]--;
        state.reserve[grain.color]++;
        state.spilled++;
        state.combo = 0;
        emit("spill", { color: grain.color, x: grain.x });
        checkLose();
        return;
      }

      state.pending[grain.color]--;
      state.capturedByColor[grain.color]++;
      state.captured++;
      state.combo++;
      if (state.combo > state.bestCombo) state.bestCombo = state.combo;
      state.score += 9 * multiplier();
      bucket.fill++;
      if (state.runLeft > 0) {
        state.runLeft = Math.min(state.runLeft, accessible(grain.color));
      }
      emit("capture", { color: grain.color, x: grain.x, slot, cell });
      if (bucket.fill >= config.bucketCapacity) {
        state.score += 130 * multiplier();
        emit("bucketFull", { slot, color: bucket.color, x: grain.x });
        state.buckets[slot] = null;
        state.selected = null;
        selectForColor();
      }
      checkWin();
      return;
    }

    state.pending[grain.color]--;
    state.reserve[grain.color]++;
    state.spilled++;
    state.combo = 0;
    emit("spill", { color: grain.color, x: grain.x });
    checkLose();
  }

  function updateGrains(dt) {
    for (let i = state.grains.length - 1; i >= 0; i--) {
      const g = state.grains[i];
      g.vy += config.grainGravity * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.y >= LOOP.topY) {
        resolveGrain(g);
        state.grains.splice(i, 1);
        if (state.status !== "playing") break;
      }
    }
  }

  function update(dt) {
    if (state.status !== "playing") return state;
    const step = 1 / 60;
    let left = Math.min(0.12, Math.max(0, dt));
    state.time += left;
    if (state.graceLeft > 0) state.graceLeft = Math.max(0, state.graceLeft - left);

    while (left > 0 && state.status === "playing") {
      const h = Math.min(step, left);
      left -= h;

      if (state.selected != null) {
        const diff = normalizeAngle(state.targetAngle - state.loopAngle);
        const maxStep = config.rotationSpeed * h;
        if (Math.abs(diff) <= maxStep) state.loopAngle = state.targetAngle;
        else state.loopAngle = normalizeAngle(state.loopAngle + Math.sign(diff) * maxStep);
        state.aligned = Math.abs(normalizeAngle(state.loopAngle - state.targetAngle)) < config.alignEpsilon;
      } else {
        state.aligned = false;
      }

      state.holding = state.selected != null && !state.aligned;

      if (state.holding) continue;

      const canPour = state.time >= config.grace && state.currentColor >= 0;
      if (canPour) {
        emitAcc += config.pourRate * h;
        while (emitAcc >= 1 && state.status === "playing") {
          const needsRun = state.currentColor < 0 ||
            state.runLeft <= 0 ||
            state.reserve[state.currentColor] <= 0;
          if (needsRun) {
            /* Do not let two colours share the falling stream. A colour
             * change waits until every grain of the old run has landed, so
             * the bucket underneath is never asked to catch a colour it was
             * not chosen for. */
            if (state.currentColor >= 0 && state.pending[state.currentColor] > 0) {
              emitAcc = 0;
              break;
            }
            if (!startRun()) { emitAcc = 0; break; }
          }
          if (!spawnGrain()) break;
          emitAcc -= 1;
        }
      }

      updateGrains(h);
      if (state.status !== "playing") break;
    }
    return state;
  }

  function deploy(color) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    if (color < 0 || color >= counts.length) return { ok: false, reason: "colour" };
    if (remainingColor(color) <= 0) return { ok: false, reason: "empty" };
    let slot = state.buckets.indexOf(null);
    if (slot < 0) return { ok: false, reason: "full" };
    state.buckets[slot] = { color, fill: 0, capacity: config.bucketCapacity };
    emit("deploy", { slot, color });
    const active = state.selected == null ? null : state.buckets[state.selected];
    if (color === state.currentColor && (!active || active.color !== state.currentColor)) {
      selectForColor(slot);
    }
    return { ok: true, slot };
  }

  function recall(slot) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    const bucket = state.buckets[slot];
    if (!bucket) return { ok: false, reason: "empty" };
    state.buckets[slot] = null;
    emit("recall", { slot, color: bucket.color, fill: bucket.fill });
    if (state.selected === slot) {
      state.selected = null;
      selectForColor();
    }
    return { ok: true, color: bucket.color };
  }

  function drainEvents() {
    if (!events.length) return [];
    return events.splice(0, events.length);
  }

  function snapshot() {
    return {
      status: state.status,
      time: state.time,
      total: state.total,
      captured: state.captured,
      spilled: state.spilled,
      spillLimit: state.spillLimit,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      stars: state.stars,
      currentColor: state.currentColor,
      upcoming: state.upcoming.slice(),
      reserve: state.reserve.slice(),
      capturedByColor: state.capturedByColor.slice(),
      remaining: counts.map((_, c) => remainingColor(c)),
      buckets: state.buckets.map((b) => (b ? { color: b.color, fill: b.fill, capacity: b.capacity } : null)),
      selected: state.selected,
      loopAngle: state.loopAngle,
      targetAngle: state.targetAngle,
      holding: state.holding,
      aligned: state.aligned,
      graceLeft: state.graceLeft,
      grains: state.grains.length
    };
  }

  startGame();

  return {
    state,
    counts,
    config,
    slots,
    getState() { return state; },
    snapshot,
    deploy,
    recall,
    update,
    drainEvents,
    remainingColor,
    slotAngle,
    multiplier
  };
}
