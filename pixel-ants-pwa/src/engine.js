import { mulberry32 } from "./quantize.js";
import { createPathfinder } from "./path.js";

export const DEFAULT_CONFIG = {
  slots: 4,
  bucketCapacity: 90,
  maxAntsPerBucket: 9,
  antSpeed: 24,
  spawnInterval: 0.16,
  biteTime: 0.18,
  idlePenalty: 0.15,
  parRate: 8
};

const STEP = 1 / 60;

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function createEngine(spec) {
  const board = spec.board;
  if (!board) throw new Error("engine: board is required");
  const config = Object.assign({}, DEFAULT_CONFIG, spec.config || {});
  const slots = Math.max(1, Math.min(8, Math.round(config.slots)));
  const seed = spec.seed == null ? 1 : spec.seed;
  const rng = mulberry32(seed >>> 0);
  const pathfinder = createPathfinder(board);

  const state = {
    status: "playing",
    time: 0,
    total: board.total,
    slots,
    buckets: new Array(slots).fill(null),
    ants: [],
    stolen: 0,
    delivered: 0,
    score: 0,
    stars: 0,
    fullBuckets: 0,
    idleAntSeconds: 0,
    par: Math.max(30, board.total / Math.max(0.1, config.parRate)),
    seed
  };

  const events = [];
  let nextAntId = 1;
  let entryPoints = [];

  function emit(type, data) {
    events.push(Object.assign({ type }, data || {}));
  }

  function entryX(slot) {
    const x = Math.round(((slot + 0.5) / slots) * board.width - 0.5);
    return Math.max(0, Math.min(board.width - 1, x));
  }

  function mouthFor(slot) {
    return { x: entryX(slot), y: board.height + 1.35 };
  }

  function pathLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
    return total;
  }

  function placeAnt(ant) {
    const path = ant.path;
    let distanceLeft = ant.segmentDist;
    let index = ant.segment;
    while (index < path.length - 1) {
      const length = distance(path[index], path[index + 1]);
      if (distanceLeft <= length || index === path.length - 2) {
        const t = length > 0 ? Math.min(1, distanceLeft / length) : 1;
        ant.x = path[index].x + (path[index + 1].x - path[index].x) * t;
        ant.y = path[index].y + (path[index + 1].y - path[index].y) * t;
        ant.angle = Math.atan2(path[index + 1].y - path[index].y, path[index + 1].x - path[index].x);
        ant.segment = index;
        ant.segmentDist = Math.min(distanceLeft, length);
        return;
      }
      distanceLeft -= length;
      index++;
    }
    const last = path[path.length - 1];
    ant.x = last.x;
    ant.y = last.y;
    ant.segment = path.length - 1;
    ant.segmentDist = 0;
  }

  function advanceAnt(ant, dt) {
    let remaining = dt * config.antSpeed;
    while (remaining > 0) {
      if (ant.segment >= ant.path.length - 1) return true;
      const current = ant.path[ant.segment];
      const next = ant.path[ant.segment + 1];
      const segmentLength = distance(current, next);
      const left = segmentLength - ant.segmentDist;
      if (remaining < left) {
        ant.segmentDist += remaining;
        remaining = 0;
      } else {
        remaining -= left;
        ant.segment++;
        ant.segmentDist = 0;
        if (ant.segment >= ant.path.length - 1) {
          placeAnt(ant);
          return true;
        }
      }
    }
    placeAnt(ant);
    return false;
  }

  function removeBucket(slot) {
    const bucket = state.buckets[slot];
    if (!bucket) return;
    state.buckets[slot] = null;
    emit("bucketLeave", { slot, color: bucket.color, fill: bucket.fill });
  }

  function closeIfReady(slot) {
    const bucket = state.buckets[slot];
    if (!bucket) return;
    if (bucket.state === "closing" && bucket.antsOut <= 0) removeBucket(slot);
  }

  function maybeCloseEmpty(slot) {
    const bucket = state.buckets[slot];
    if (!bucket) return;
    if (bucket.state !== "active") {
      closeIfReady(slot);
      return;
    }
    if (bucket.fill >= bucket.capacity) {
      bucket.state = "closing";
      closeIfReady(slot);
      return;
    }
    if (board.remainingColor(bucket.color) <= 0 && bucket.antsOut <= 0) {
      bucket.state = "closing";
      closeIfReady(slot);
    }
  }

  function spawnFor(slot) {
    const bucket = state.buckets[slot];
    if (!bucket || bucket.state !== "active") return;
    if (bucket.fill >= bucket.capacity) return;
    if (bucket.antsOut >= config.maxAntsPerBucket) return;

    if (board.availableCount(bucket.color) <= 0) {
      bucket.spawnLeft = Math.min(bucket.spawnLeft, 0.2);
      if (board.remainingColor(bucket.color) > 0) {
        state.idleAntSeconds += STEP * Math.max(0, config.maxAntsPerBucket - bucket.antsOut);
      }
      return;
    }

    bucket.spawnLeft -= STEP;
    if (bucket.spawnLeft > 0) return;
    bucket.spawnLeft = config.spawnInterval;

    const entry = entryPoints[slot];
    const target = pathfinder.findTarget(entry.x, entry.y, bucket.color, rng);
    if (!target || !board.reserve(target.index)) {
      bucket.spawnLeft = 0.16;
      return;
    }

    const mouth = mouthFor(slot);
    const outbound = target.path;
    const path = [mouth, ...outbound];
    const ant = {
      id: nextAntId++,
      slot,
      color: bucket.color,
      targetIndex: target.index,
      access: target.access,
      outbound,
      mouth,
      path,
      segment: 0,
      segmentDist: 0,
      x: mouth.x,
      y: mouth.y,
      angle: -Math.PI / 2,
      phase: rng() * Math.PI * 2,
      state: "out",
      biteLeft: 0,
      carry: 0
    };
    placeAnt(ant);
    state.ants.push(ant);
    bucket.antsOut++;
    emit("spawn", { slot, color: bucket.color, antId: ant.id, target: target.index });
  }

  function deliver(ant) {
    const bucket = state.buckets[ant.slot];
    if (bucket) {
      bucket.antsOut = Math.max(0, bucket.antsOut - 1);
      bucket.fill++;
      state.delivered++;
      state.score += 10;
      emit("deliver", {
        slot: ant.slot,
        color: ant.color,
        fill: bucket.fill,
        capacity: bucket.capacity,
        x: ant.x,
        y: ant.y
      });
      if (bucket.fill >= bucket.capacity && bucket.state === "active") {
        bucket.state = "closing";
        state.fullBuckets++;
        state.score += 150;
        emit("bucketFull", {
          slot: ant.slot,
          color: ant.color,
          fill: bucket.fill,
          capacity: bucket.capacity
        });
      }
      if (bucket.state === "closing" && bucket.antsOut <= 0) removeBucket(ant.slot);
    } else {
      state.delivered++;
      state.score += 10;
    }
  }

  function finishWin() {
    if (state.status !== "playing") return;
    if (!board.allCleared() || state.ants.length) return;
    state.status = "won";
    const effective = state.time + state.idleAntSeconds * config.idlePenalty;
    state.stars = effective <= state.par ? 3 : effective <= state.par * 1.35 ? 2 : 1;
    const timeBonus = Math.max(0, Math.round((state.par * 1.35 - state.time) * 8));
    state.score += timeBonus;
    emit("win", {
      score: state.score,
      stars: state.stars,
      time: state.time,
      idleAntSeconds: state.idleAntSeconds
    });
  }

  function updateAnt(ant, dt) {
    if (ant.state === "out") {
      if (!advanceAnt(ant, dt)) return;
      ant.state = "bite";
      ant.biteLeft = config.biteTime;
      emit("bite", { slot: ant.slot, color: ant.color, target: ant.targetIndex, x: ant.x, y: ant.y });
      return;
    }

    if (ant.state === "bite") {
      ant.biteLeft -= dt;
      if (ant.biteLeft > 0) return;
      const cell = board.steal(ant.targetIndex);
      if (!cell) {
        board.release(ant.targetIndex);
        const bucket = state.buckets[ant.slot];
        if (bucket) bucket.antsOut = Math.max(0, bucket.antsOut - 1);
        return "remove";
      }
      state.stolen++;
      state.score += 2;
      ant.carry = 1;
      const target = { x: cell.x, y: cell.y };
      ant.path = [target, ...ant.outbound.slice().reverse(), ant.mouth];
      ant.segment = 0;
      ant.segmentDist = 0;
      ant.state = "back";
      ant.x = target.x;
      ant.y = target.y;
      emit("steal", {
        slot: ant.slot,
        color: cell.color,
        x: cell.x,
        y: cell.y,
        cell
      });
      return;
    }

    if (ant.state === "back") {
      if (!advanceAnt(ant, dt)) return;
      deliver(ant);
      return "remove";
    }
  }

  function updateBuckets() {
    for (let slot = 0; slot < slots; slot++) {
      const bucket = state.buckets[slot];
      if (!bucket) continue;
      if (bucket.state === "active") spawnFor(slot);
      maybeCloseEmpty(slot);
    }
  }

  function updateAnts() {
    for (let i = state.ants.length - 1; i >= 0; i--) {
      const ant = state.ants[i];
      if (updateAnt(ant, STEP) === "remove") state.ants.splice(i, 1);
    }
  }

  function update(dt) {
    if (state.status !== "playing") return state;
    let left = Math.min(0.12, Math.max(0, dt));
    while (left > 0 && state.status === "playing") {
      const step = Math.min(STEP, left);
      left -= step;
      state.time += step;
      updateBuckets();
      updateAnts();
      finishWin();
    }
    return state;
  }

  function deploy(color) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    if (!Number.isInteger(color) || color < 0 || color >= board.palette.length) {
      return { ok: false, reason: "colour" };
    }
    if (board.remainingColor(color) <= 0) return { ok: false, reason: "empty" };
    if (board.availableCount(color) <= 0) return { ok: false, reason: "buried" };
    const slot = state.buckets.indexOf(null);
    if (slot < 0) return { ok: false, reason: "full" };
    state.buckets[slot] = {
      slot,
      color,
      fill: 0,
      capacity: config.bucketCapacity,
      state: "active",
      antsOut: 0,
      spawnLeft: 0
    };
    emit("deploy", { slot, color });
    return { ok: true, slot };
  }

  function recall(slot) {
    const bucket = state.buckets[slot];
    if (!bucket || state.status !== "playing") return { ok: false, reason: "empty" };
    if (bucket.state === "closing") return { ok: false, reason: "closing" };
    bucket.state = "closing";
    emit("recall", { slot, color: bucket.color, fill: bucket.fill });
    if (bucket.antsOut <= 0) removeBucket(slot);
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
      stolen: state.stolen,
      delivered: state.delivered,
      score: state.score,
      stars: state.stars,
      fullBuckets: state.fullBuckets,
      idleAntSeconds: state.idleAntSeconds,
      par: state.par,
      slots,
      buckets: state.buckets.map((bucket) => bucket ? {
        slot: bucket.slot,
        color: bucket.color,
        fill: bucket.fill,
        capacity: bucket.capacity,
        state: bucket.state,
        antsOut: bucket.antsOut
      } : null),
      ants: state.ants.map((ant) => ({
        id: ant.id,
        slot: ant.slot,
        color: ant.color,
        carry: ant.carry,
        x: ant.x,
        y: ant.y,
        angle: ant.angle,
        phase: ant.phase,
        state: ant.state
      }))
    };
  }

  for (let slot = 0; slot < slots; slot++) {
    entryPoints.push({ x: entryX(slot), y: board.height });
  }

  return {
    state,
    config,
    slots,
    board,
    getState() { return state; },
    snapshot,
    deploy,
    recall,
    update,
    drainEvents,
    remainingColor: (color) => board.remainingColor(color),
    availableColor: (color) => board.availableCount(color),
    exposedColor: (color) => board.exposedCount(color),
    entryX,
    mouthFor
  };
}
