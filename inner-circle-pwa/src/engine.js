/*
 * INNER CIRCLE — the rules
 * ------------------------
 * A fixed-step, DOM-free circle-physics merge game. Everything that can
 * change the score lives here, so the browser renderer is only a view and
 * the Node tests can play thousands of drops without a canvas.
 *
 * World units: 400 wide x 600 tall. The jar's inner walls are at x=22 and
 * x=378; the floor is y=574. A disc's radius grows with its tier.
 */

import { TIERS, MAX_TIER } from "./roster.js";

export const WORLD = {
  width: 400,
  height: 600,
  wall: 22,
  floor: 574,
  dangerY: 126,
  spawnY: 63,
  dropSpeed: 44,
};

export const POWERS = {
  swap: {
    id: "swap",
    name: "Switch",
    cost: 20,
    blurb: "Swap the friend in your hand with the next one.",
  },
  hug: {
    id: "hug",
    name: "Group Hug",
    cost: 45,
    blurb: "Shake the circle and jostle the pile loose.",
  },
  plus: {
    id: "plus",
    name: "Plus One",
    cost: 100,
    blurb: "Send a wildcard guest who joins the first friend they touch.",
  },
};

export const POWER_ORDER = ["swap", "hug", "plus"];

export const DROP_WEIGHTS = [0.33, 0.27, 0.21, 0.13, 0.06];

export const DAILY_RULES = [
  {
    id: "hype",
    name: "Hype Train",
    blurb: "Start with 45 Hype. Party tricks from the first drop.",
    startingHype: 45,
  },
  {
    id: "tiny",
    name: "Tiny Table",
    blurb: "Only small friends drop today. Make every merge count.",
    weights: [0.48, 0.31, 0.16, 0.05, 0],
  },
  {
    id: "combo",
    name: "Combo Club",
    blurb: "The chain window is twice as long. Keep it going.",
    comboWindow: 2.4,
  },
  {
    id: "double-hype",
    name: "Double Hype",
    blurb: "Every merge earns double Hype. Use those party tricks.",
    hypeMult: 2,
  },
  {
    id: "tiny-hype",
    name: "Small but Mighty",
    blurb: "Small friends and a head start. A nimble little party.",
    weights: [0.44, 0.32, 0.18, 0.06, 0],
    startingHype: 35,
  },
];

export const DEFAULT_CONFIG = {
  gravity: 1850,
  wallRestitution: 0.08,
  floorRestitution: 0.04,
  pairRestitution: 0.02,
  friction: 0.22,
  linearDrag: 0.999,
  slop: 0.05,
  correction: 0.9,
  iterations: 10,
  dropBlock: 0.34,
  comboWindow: 1.25,
  comboMax: 9,
  dangerGrace: 0.78,
  dangerLimit: 2.35,
  startingHype: 20,
  hypeMult: 1,
  wildcardRadius: 24,
  maxDiscs: 100,
  weights: DROP_WEIGHTS,
};

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
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

function cloneTierWeights(weights) {
  const w = Array.isArray(weights) && weights.length >= 5
    ? weights.slice(0, 5).map((n) => Math.max(0, Number(n) || 0))
    : DROP_WEIGHTS.slice();
  const total = w.reduce((sum, n) => sum + n, 0);
  if (!(total > 0)) return DROP_WEIGHTS.slice();
  return w.map((n) => n / total);
}

/*
 * createEngine({ seed, mode, rule })
 *
 * `rule` is optional and comes from DAILY_RULES. Tests use it to play the
 * same daily board every time.
 */
export function createEngine(options = {}) {
  const config = Object.assign({}, DEFAULT_CONFIG, options.config || {});
  const mode = options.mode === "daily" ? "daily" : "classic";
  const rule = options.rule && typeof options.rule === "object" ? options.rule : null;
  if (rule) {
    if (Number.isFinite(rule.startingHype)) config.startingHype = rule.startingHype;
    if (rule.comboWindow != null) config.comboWindow = Math.max(0.5, Number(rule.comboWindow) || config.comboWindow);
    if (rule.hypeMult != null) config.hypeMult = Math.max(0.25, Number(rule.hypeMult) || 1);
    if (Array.isArray(rule.weights)) config.weights = cloneTierWeights(rule.weights);
  }
  const weights = cloneTierWeights(config.weights);
  const seed = Number.isFinite(options.seed) ? (options.seed >>> 0) : ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  const rng = mulberry32(seed);
  const events = [];
  let nextId = 1;
  let accumulator = 0;

  const state = {
    seed,
    mode,
    rule: rule ? { id: rule.id, name: rule.name, blurb: rule.blurb } : null,
    time: 0,
    status: "playing",
    score: 0,
    combo: 0,
    comboMax: 0,
    comboTimer: 0,
    bestCombo: 0,
    merges: 0,
    hype: clamp(config.startingHype, 0, 100),
    maxTier: 0,
    hasWon: false,
    hasLegendary: false,
    danger: 0,
    dangerActive: false,
    dangerTime: 0,
    shake: 0,
    dropBlock: 0,
    aimX: WORLD.width / 2,
    currentTier: 0,
    nextTier: 0,
    heldWildcard: false,
    lastDropId: 0,
    dropCount: 0,
    discs: [],
    events: null,
    config,
  };

  function emit(type, data) {
    events.push(Object.assign({ type, at: state.time }, data || {}));
  }

  function randomTier() {
    const roll = rng();
    let acc = 0;
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (roll <= acc) return i;
    }
    return weights.length - 1;
  }

  function nextQueue() {
    state.currentTier = state.nextTier;
    state.nextTier = randomTier();
  }

  state.currentTier = randomTier();
  state.nextTier = randomTier();

  function getAimBounds(tier = state.currentTier) {
    const r = state.heldWildcard ? config.wildcardRadius : TIERS[tier].radius;
    return { min: WORLD.wall + r, max: WORLD.width - WORLD.wall - r, radius: r };
  }

  function setAim(x) {
    const bounds = getAimBounds();
    state.aimX = clamp(Number(x) || WORLD.width / 2, bounds.min, bounds.max);
    return state.aimX;
  }

  function addDisc(spec) {
    const disc = {
      id: nextId++,
      tier: spec.tier,
      wildcard: !!spec.wildcard,
      radius: spec.radius,
      x: spec.x,
      y: spec.y,
      vx: spec.vx || 0,
      vy: spec.vy || 0,
      age: 0,
      touched: !!spec.touched,
      cooldown: spec.cooldown || 0,
      dropId: spec.dropId || 0,
      spin: 0,
      squash: 0,
      dying: false,
      bornAt: state.time,
      merged: false,
    };
    state.discs.push(disc);
    return disc;
  }

  function drop(x) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    if (state.dropBlock > 0) return { ok: false, reason: "wait" };
    if (state.discs.length >= config.maxDiscs) return { ok: false, reason: "full" };

    const isWild = state.heldWildcard;
    const tier = isWild ? -1 : state.currentTier;
    const radius = isWild ? config.wildcardRadius : TIERS[tier].radius;
    const bounds = getAimBounds(tier);
    const aim = clamp(Number.isFinite(x) ? x : state.aimX, bounds.min, bounds.max);
    const disc = addDisc({
      tier,
      wildcard: isWild,
      radius,
      x: aim,
      y: WORLD.spawnY,
      vy: WORLD.dropSpeed,
      touched: false,
      dropId: state.dropCount + 1,
    });
    state.lastDropId = disc.id;
    state.dropCount++;
    state.dropBlock = config.dropBlock;
    state.heldWildcard = false;
    state.aimX = aim;
    emit("drop", {
      id: disc.id,
      x: aim,
      y: disc.y,
      tier,
      wildcard: isWild,
      radius,
    });
    nextQueue();
    return { ok: true, id: disc.id, wildcard: isWild, tier };
  }

  function canUsePower(name) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    const power = POWERS[name];
    if (!power) return { ok: false, reason: "unknown" };
    if (state.hype + 1e-6 < power.cost) return { ok: false, reason: "hype" };
    if (name === "plus" && state.heldWildcard) return { ok: false, reason: "wild" };
    if (name === "hug" && state.discs.length === 0) return { ok: false, reason: "empty" };
    return { ok: true, power };
  }

  function usePower(name) {
    const check = canUsePower(name);
    if (!check.ok) return check;
    const power = check.power;
    state.hype = Math.max(0, state.hype - power.cost);

    if (name === "swap") {
      const tmp = state.currentTier;
      state.currentTier = state.nextTier;
      state.nextTier = tmp;
      emit("power", { name, label: power.name });
      return { ok: true, name };
    }

    if (name === "hug") {
      state.shake = 0.8;
      for (const disc of state.discs) {
        if (disc.dying) continue;
        disc.vx += (rng() * 2 - 1) * 185;
        disc.vy -= 45 + rng() * 190;
        disc.touched = true;
        disc.cooldown = Math.max(0, disc.cooldown);
      }
      emit("power", { name, label: power.name });
      return { ok: true, name };
    }

    state.heldWildcard = true;
    emit("power", { name, label: power.name });
    return { ok: true, name };
  }

  function gainHype(amount) {
    state.hype = clamp(state.hype + amount * config.hypeMult, 0, 100);
  }

  function addScore(points) {
    state.score += Math.max(0, Math.round(points));
  }

  function beginMerge(a, b, targetTier, wildcard) {
    const newTier = targetTier;
    state.merges++;
    /* Two Whole Crew discs vanish into a legendary group photo. A wildcard
       that reaches the top tier gets the same send-off. Creating the top
       tier for the first time still spawns it normally. */
    const target = a.wildcard ? b : b.wildcard ? a : null;
    const isLegendary = wildcard
      ? !!(target && target.tier === MAX_TIER)
      : a.tier === MAX_TIER && b.tier === MAX_TIER;
    let sourceTier = Math.max(a.tier, b.tier);
    if (a.wildcard || b.wildcard) sourceTier = Math.max(sourceTier, 0);
    const comboBase = state.comboTimer > 0 ? state.combo : 0;
    const combo = Math.min(config.comboMax, Math.max(1, comboBase + 1));
    state.combo = combo;
    state.comboTimer = config.comboWindow;
    state.bestCombo = Math.max(state.bestCombo, combo);
    state.maxTier = Math.max(state.maxTier, Math.min(MAX_TIER, newTier));

    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const radius = TIERS[newTier].radius;

    if (isLegendary) {
      const legendaryScore = 6000 * combo;
      addScore(legendaryScore);
      state.hasWon = true;
      state.hasLegendary = true;
      gainHype(50);
      emit("legendary", {
        x,
        y,
        tier: newTier,
        score: legendaryScore,
        combo,
        wildcard,
      });
    } else {
      const points = (newTier + 1) * 55 * combo;
      addScore(points);
      gainHype(3.5 + newTier * 0.85);
      const spawned = addDisc({
        tier: newTier,
        radius,
        x: clamp(x, WORLD.wall + radius, WORLD.width - WORLD.wall - radius),
        y: clamp(y - 1, WORLD.spawnY, WORLD.floor - radius),
        vx: (a.vx + b.vx) * 0.5,
        vy: -75,
        touched: true,
        cooldown: 0.06,
      });
      if (newTier >= MAX_TIER) state.hasWon = true;
      emit("merge", {
        x,
        y: y - 1,
        tier: sourceTier,
        newTier,
        score: points,
        combo,
        wildcard,
        id: spawned.id,
      });
    }
    if (state.maxTier === MAX_TIER && !state.hasWon) state.hasWon = true;
    a.dying = true;
    b.dying = true;
    a.merged = true;
    b.merged = true;
    a.dieAt = state.time;
    b.dieAt = state.time;
  }

  function tryMerge(a, b) {
    if (a.dying || b.dying) return false;
    if (a.cooldown > 0 || b.cooldown > 0) return false;
    const wild = a.wildcard || b.wildcard;
    if (a.wildcard && b.wildcard) return false;
    if (!wild && (a.tier !== b.tier || a.tier < 0)) return false;
    if (wild) {
      const target = a.wildcard ? b : a;
      if (target.tier < 0) return false;
      beginMerge(a, b, Math.min(MAX_TIER, target.tier + 1), true);
      return true;
    }
    beginMerge(a, b, Math.min(MAX_TIER, a.tier + 1), false);
    return true;
  }

  function resolvePair(a, b) {
    if (a.dying || b.dying) return 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const min = a.radius + b.radius;
    const distSq = dx * dx + dy * dy;
    if (distSq >= min * min) return 0;
    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = min - dist;

    const massA = a.radius * a.radius;
    const massB = b.radius * b.radius;
    const invA = 1 / massA;
    const invB = 1 / massB;
    const invTotal = invA + invB;

    const push = Math.max(0, overlap - config.slop) * config.correction / invTotal;
    a.x -= nx * push * invA;
    a.y -= ny * push * invA;
    b.x += nx * push * invB;
    b.y += ny * push * invB;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const normalSpeed = rvx * nx + rvy * ny;
    if (normalSpeed < 0) {
      const impulse = -(1 + config.pairRestitution) * normalSpeed / invTotal;
      a.vx -= nx * impulse * invA;
      a.vy -= ny * impulse * invA;
      b.vx += nx * impulse * invB;
      b.vy += ny * impulse * invB;

      const tx = -ny;
      const ty = nx;
      const tangentSpeed = rvx * tx + rvy * ty;
      const frictionImpulse = clamp(-tangentSpeed * config.friction, -Math.abs(impulse) * 0.35, Math.abs(impulse) * 0.35);
      a.vx -= tx * frictionImpulse * invA;
      a.vy -= ty * frictionImpulse * invA;
      b.vx += tx * frictionImpulse * invB;
      b.vy += ty * frictionImpulse * invB;
    }

    a.touched = true;
    b.touched = true;
    return overlap;
  }

  function collide() {
    const discs = state.discs;
    for (let pass = 0; pass < config.iterations; pass++) {
      for (let i = 0; i < discs.length; i++) {
        const a = discs[i];
        if (a.dying) continue;
        for (let j = i + 1; j < discs.length; j++) {
          const b = discs[j];
          if (b.dying) continue;
          resolvePair(a, b);
        }
      }
      for (const disc of discs) {
        if (disc.dying) continue;
        constrainDisc(disc);
      }
    }

    /* Merge only once per frame, after the pile has been separated. A small
       contact skin catches resting neighbours that the solver has just
       pushed apart to exactly r1 + r2. */
    const candidates = [];
    for (let i = 0; i < discs.length; i++) {
      const a = discs[i];
      if (a.dying || a.cooldown > 0) continue;
      if (a.tier < 0 && !a.wildcard) continue;
      for (let j = i + 1; j < discs.length; j++) {
        const b = discs[j];
        if (b.dying || b.cooldown > 0) continue;
        if (a.wildcard && b.wildcard) continue;
        const sharesTier = a.tier >= 0 && b.tier >= 0 && a.tier === b.tier;
        const wild = a.wildcard || b.wildcard;
        if (!wild && !sharesTier) continue;
        if (wild && (a.tier < 0 && !a.wildcard)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const contact = a.radius + b.radius + 1.4;
        if (dx * dx + dy * dy <= contact * contact) candidates.push([a, b]);
      }
    }
    for (const [a, b] of candidates) tryMerge(a, b);

    if (discs.some((d) => d.dying)) {
      state.discs = discs.filter((d) => !d.dying);
    }
  }

  function constrainDisc(d) {
    const minX = WORLD.wall + d.radius;
    const maxX = WORLD.width - WORLD.wall - d.radius;
    if (d.x < minX) {
      d.x = minX;
      if (d.vx < 0) d.vx = -d.vx * config.wallRestitution;
      d.vx = Math.abs(d.vx) + 3;
      d.touched = true;
    } else if (d.x > maxX) {
      d.x = maxX;
      if (d.vx > 0) d.vx = -d.vx * config.wallRestitution;
      d.vx = -Math.abs(d.vx) - 3;
      d.touched = true;
    }
    const floor = WORLD.floor - d.radius;
    if (d.y > floor) {
      d.y = floor;
      if (d.vy > 0) d.vy = -d.vy * config.floorRestitution;
      if (Math.abs(d.vy) < 24) d.vy = 0;
      d.vx *= 0.93;
      d.touched = true;
    }
    if (d.y < d.radius - 40) {
      d.y = d.radius - 40;
      if (d.vy < 0) d.vy = 0;
    }
    d.squash = Math.min(1, d.squash + Math.abs(d.vy) / 3000);
  }

  function updateDanger(dt) {
    let inDanger = false;
    for (const d of state.discs) {
      if (d.dying || !d.touched) continue;
      if (d.age < config.dangerGrace) continue;
      if (d.y - d.radius < WORLD.dangerY) {
        inDanger = true;
        break;
      }
    }
    if (inDanger) {
      state.dangerTime += dt;
      state.danger = clamp(state.dangerTime / config.dangerLimit, 0, 1);
    } else {
      state.dangerTime = Math.max(0, state.dangerTime - dt * 2.4);
      state.danger = clamp(state.dangerTime / config.dangerLimit, 0, 1);
    }
    const active = state.dangerTime > 0.25;
    if (active !== state.dangerActive) {
      state.dangerActive = active;
      emit("danger", { active, value: state.danger });
    }
    if (state.dangerTime >= config.dangerLimit) {
      state.status = "over";
      state.currentTier = state.currentTier;
      emit("gameover", {
        score: state.score,
        maxTier: state.maxTier,
        merges: state.merges,
        bestCombo: state.bestCombo,
      });
    }
  }

  function fixedStep(dt) {
    if (state.status !== "playing") return;
    state.time += dt;
    state.dropBlock = Math.max(0, state.dropBlock - dt);
    state.shake = Math.max(0, state.shake - dt);
    if (state.comboTimer > 0) {
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer === 0) {
        state.combo = 0;
        emit("combo_end", { bestCombo: state.bestCombo });
      }
    }

    for (const d of state.discs) {
      if (d.dying) continue;
      d.age += dt;
      d.cooldown = Math.max(0, d.cooldown - dt);
      d.vy += config.gravity * dt;
      d.vx *= config.linearDrag;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.spin += d.vx * dt * 0.002;
      d.squash = Math.max(0, d.squash - dt * 5);
      constrainDisc(d);
    }

    collide();
    updateDanger(dt);
  }

  function tick(dt) {
    if (state.status !== "playing") return;
    const seconds = clamp(Number(dt) || 0, 0, 0.12);
    accumulator += seconds;
    const step = 1 / 120;
    let guard = 0;
    while (accumulator >= step && guard < 20) {
      fixedStep(step);
      accumulator -= step;
      guard++;
      if (state.status !== "playing") break;
    }
    if (guard >= 20) accumulator = 0;
  }

  function drainEvents() {
    if (!events.length) return [];
    const out = events.splice(0, events.length);
    return out;
  }

  function snapshot() {
    return {
      seed: state.seed,
      mode: state.mode,
      rule: state.rule,
      time: state.time,
      status: state.status,
      score: state.score,
      combo: state.combo,
      comboTimer: state.comboTimer,
      bestCombo: state.bestCombo,
      merges: state.merges,
      hype: state.hype,
      maxTier: state.maxTier,
      hasWon: state.hasWon,
      hasLegendary: state.hasLegendary,
      danger: state.danger,
      dangerActive: state.dangerActive,
      shake: state.shake,
      currentTier: state.currentTier,
      nextTier: state.nextTier,
      heldWildcard: state.heldWildcard,
      aimX: state.aimX,
      dropBlock: state.dropBlock,
      dropCount: state.dropCount,
      discCount: state.discs.length,
      discs: state.discs,
    };
  }

  return {
    state,
    world: WORLD,
    drop,
    tick,
    setAim,
    getAimBounds,
    usePower,
    canUsePower,
    drainEvents,
    snapshot,
    getState: snapshot,
    tierFor: (i) => TIERS[i],
  };
}

/* A helper used by the UI and tests: same deterministic sequence for a seed. */
export function createQueue(seed, count = 24, weights = DROP_WEIGHTS) {
  const rng = mulberry32(seed >>> 0);
  const w = cloneTierWeights(weights);
  const out = [];
  for (let n = 0; n < count; n++) {
    const roll = rng();
    let acc = 0;
    let tier = 0;
    for (let i = 0; i < w.length; i++) {
      acc += w[i];
      if (roll <= acc) { tier = i; break; }
    }
    out.push(tier);
  }
  return out;
}

export { mulberry32, TAU };
