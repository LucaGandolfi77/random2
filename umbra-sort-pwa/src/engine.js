/*
 * Umbra Sort — deterministic rules.
 *
 * The board is a connected factory floor. Blocks move through empty cells and
 * disappear inside collectors of the same colour. Rows can swap on lifts,
 * generators add planned blocks, and blackout zones temporarily freeze cells.
 * This module has no DOM, canvas, audio or storage dependencies.
 */

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGame(spec, saved) {
  const width = spec.width;
  const height = spec.height;
  const cells = new Array(width * height).fill(null);
  const doors = clone(spec.doors);

  for (const wall of spec.walls) cells[wall.y * width + wall.x] = { kind: "wall" };
  for (const gen of spec.generators) cells[gen.y * width + gen.x] = { kind: "generator", id: gen.id };
  for (const block of spec.blocks) {
    cells[block.y * width + block.x] = {
      kind: "block",
      id: block.id,
      color: block.color,
      gray: !!block.gray
    };
  }

  const totalPlanned = doors.reduce((sum, door) => sum + door.capacity, 0);
  const loadout = spec.loadout || {};
  const bonus = spec.abilityBonus || 0;
  const abilityMax = (id) => 1 + Math.max(1, Math.min(3, Number(loadout.abilities?.[id]) || 1)) + bonus;
  const initialCharge = (id) => abilityMax(id) + (loadout.piece === "flux" && id === "pulse" ? 1 : 0) + (loadout.piece === "magnete" && id === "push" && spec.number % 3 === 0 ? 1 : 0);
  const state = {
    specId: spec.id,
    kind: spec.kind || "campaign",
    companion: loadout.piece || "luma",
    width,
    height,
    status: "playing",
    reason: "",
    cells,
    doors,
    generators: clone(spec.generators),
    elevators: clone(spec.elevators),
    blackouts: clone(spec.blackouts),
    locks: [],
    colors: spec.colors,
    grayQuota: spec.grayQuota.slice(),
    totalPlanned,
    moves: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    charge: (Array.isArray(spec.grayQuota) ? spec.grayQuota.reduce((sum, n) => sum + (n || 0), 0) : 0) + (loadout.piece === "prisma" ? 1 : 0),
    abilities: {
      pulse: { charges: initialCharge("pulse"), max: abilityMax("pulse"), cooldown: 0 },
      push: { charges: initialCharge("push"), max: abilityMax("push"), cooldown: 0 },
      scan: { charges: initialCharge("scan"), max: abilityMax("scan"), cooldown: 0 }
    },
    pulseUntil: 0,
    scanUntil: 0,
    pushArmed: false,
    boss: spec.boss ? clone(spec.boss) : null,
    bossPhase: 1,
    bossAttackTimer: spec.boss ? spec.boss.attackInterval : 0,
    elapsed: 0,
    moveLimit: spec.moveLimit || 0,
    par: spec.par || 0,
    undoDisabled: spec.undoDisabled === true,
    stars: 0,
    selected: null,
    hintPath: null,
    shake: 0,
    events: [],
    history: []
  };

  let nextId = 1;
  const events = state.events;

  function emit(type, data) {
    events.push(Object.assign({ type }, data || {}));
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < width && y < height;
  }

  function index(x, y) {
    return y * width + x;
  }

  function cellAt(x, y) {
    return inside(x, y) ? cells[index(x, y)] : null;
  }

  function doorAt(x, y) {
    return state.doors.find((door) => door.x === x && door.y === y) || null;
  }

  function blockById(id) {
    if (id == null) return null;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell && cell.kind === "block" && cell.id === id) {
        return { block: cell, x: i % width, y: Math.floor(i / width), i };
      }
    }
    return null;
  }

  function blackoutAt(x, y) {
    return state.blackouts.some((zone) => zone.active && zone.cells.some((p) => p.x === x && p.y === y));
  }

  function lockedAt(x, y) {
    return state.locks.some((lock) => lock.until > state.elapsed && lock.cells.some((p) => p.x === x && p.y === y));
  }

  function pulseActive() {
    return state.pulseUntil > state.elapsed;
  }

  function scanActive() {
    return state.scanUntil > state.elapsed;
  }

  function addCharge(id) {
    const ability = state.abilities[id];
    if (ability) ability.charges = Math.min(ability.max, ability.charges + 1);
  }

  function remember() {
    state.history.push(clone({
      cells: state.cells,
      doors: state.doors,
      generators: state.generators,
      elevators: state.elevators,
      moves: state.moves,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      charge: state.charge,
      abilities: state.abilities,
      pulseUntil: state.pulseUntil,
      scanUntil: state.scanUntil,
      pushArmed: state.pushArmed,
      status: state.status,
      reason: state.reason,
      stars: state.stars
    }));
    if (state.history.length > 40) state.history.shift();
  }

  function capturedCount() {
    return state.doors.reduce((sum, door) => sum + door.filled, 0);
  }

  function remainingCapacity(color) {
    const door = state.doors.find((d) => d.color === color);
    return door ? Math.max(0, door.capacity - door.filled) : 0;
  }

  function checkWin() {
    if (state.status !== "playing") return false;
    const allSpawned = state.generators.every((g) => g.spawned >= g.total);
    if (allSpawned && capturedCount() >= state.totalPlanned) {
      state.status = "won";
      state.selected = null;
      const ratio = state.par > 0 ? state.moves / state.par : 1;
      state.stars = ratio <= 1 ? 3 : ratio <= 1.5 ? 2 : 1;
      state.score += 1000 + state.stars * 500;
      emit("win", { score: state.score, stars: state.stars });
      return true;
    }
    return false;
  }

  function checkLose(reason) {
    if (state.status !== "playing") return;
    state.status = "lost";
    state.reason = reason || "La macchina si è fermata.";
    state.selected = null;
    emit("lose", { reason: state.reason });
  }

  function canEnter(x, y, block) {
    if (!inside(x, y)) return false;
    if (blackoutAt(x, y) || lockedAt(x, y)) return false;
    const cell = cellAt(x, y);
    if (cell) return false;
    const door = doorAt(x, y);
    if (!door) return true;
    return !block.gray && block.color === door.color && door.filled < door.capacity;
  }

  function pushBlock(found, dx, dy) {
    const nx = found.x + dx;
    const ny = found.y + dy;
    const bx = nx + dx;
    const by = ny + dy;
    if (!inside(bx, by) || blackoutAt(bx, by) || lockedAt(bx, by) || cellAt(bx, by) || doorAt(bx, by)) {
      return { ok: false, reason: "blocked" };
    }
    const adjacentIndex = index(nx, ny);
    const pushed = cells[adjacentIndex];
    if (!pushed || pushed.kind !== "block") return { ok: false, reason: "blocked" };
    remember();
    cells[found.i] = null;
    cells[adjacentIndex] = found.block;
    cells[index(bx, by)] = pushed;
    state.moves++;
    state.score += 25;
    state.pushArmed = false;
    state.hintPath = null;
    emit("push", { x: nx, y: ny, pushedX: bx, pushedY: by });
    return { ok: true, pushed: true };
  }

  function moveBlock(id, dx, dy) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    const found = blockById(id);
    if (!found) return { ok: false, reason: "missing" };
    if (blackoutAt(found.x, found.y)) return { ok: false, reason: "blackout" };
    if (lockedAt(found.x, found.y)) return { ok: false, reason: "locked" };
    const nx = found.x + dx;
    const ny = found.y + dy;
    const destination = cellAt(nx, ny);
    if (destination && destination.kind === "block" && state.pushArmed) return pushBlock(found, dx, dy);
    if (!canEnter(nx, ny, found.block)) return { ok: false, reason: "blocked" };

    remember();
    const door = doorAt(nx, ny);
    state.moves++;
    state.hintPath = null;
    if (door) {
      cells[found.i] = null;
      door.filled++;
      state.combo++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.score += 100 + Math.min(200, state.combo * 12);
      if (state.combo % 4 === 0) state.charge = Math.min(3, state.charge + 1);
      if (state.combo % 6 === 0) addCharge("pulse");
      if (state.combo % 8 === 0) addCharge("push");
      if (state.combo % 10 === 0) addCharge("scan");
      if (door.filled >= door.capacity) state.score += 250;
      emit("capture", { x: nx, y: ny, color: door.color, combo: state.combo });
      checkWin();
      return { ok: true, captured: true, door };
    }

    cells[found.i] = null;
    cells[index(nx, ny)] = found.block;
    emit("move", { x: nx, y: ny, color: found.block.color });
    return { ok: true, captured: false };
  }

  function moveAlongPath(id, path) {
    if (!Array.isArray(path) || !path.length) return { ok: false, reason: "path" };
    let result = { ok: false, reason: "missing" };
    for (const point of path) {
      const found = blockById(id);
      if (!found) break;
      const dx = point.x - found.x;
      const dy = point.y - found.y;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return { ok: false, reason: "path" };
      result = moveBlock(id, dx, dy);
      if (!result.ok) break;
      if (result.captured) break;
    }
    return result;
  }

  function pathToDoor(found) {
    if (!found || found.block.gray) return null;
    const startKey = index(found.x, found.y);
    const queue = [{ x: found.x, y: found.y, path: [] }];
    const seen = new Set([startKey]);
    while (queue.length) {
      const current = queue.shift();
      for (const [dx, dy] of DIRS) {
        const x = current.x + dx;
        const y = current.y + dy;
        if (!inside(x, y)) continue;
        const key = index(x, y);
        if (seen.has(key) || blackoutAt(x, y) || lockedAt(x, y)) continue;
        const cell = cellAt(x, y);
        if (cell && key !== startKey) continue;
        const door = doorAt(x, y);
        if (door && (door.color !== found.block.color || door.filled >= door.capacity)) continue;
        const path = current.path.concat([{ x, y }]);
        if (door) return path;
        seen.add(key);
        queue.push({ x, y, path });
      }
    }
    return null;
  }

  function repositionHint() {
    let best = null;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || cell.kind !== "block") continue;
      const x = i % width;
      const y = Math.floor(i / width);
      if (blackoutAt(x, y) || lockedAt(x, y)) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (!canEnter(nx, ny, cell) || doorAt(nx, ny)) continue;
        let space = 0;
        for (const [ax, ay] of DIRS) {
          const tx = nx + ax;
          const ty = ny + ay;
          if (inside(tx, ty) && !cellAt(tx, ty) && !blackoutAt(tx, ty) && !lockedAt(tx, ty)) space++;
        }
        const score = space * 10 + ny;
        if (!best || score > best.score) best = { type: "path", id: cell.id, path: [{ x: nx, y: ny }], score, reposition: true };
      }
    }
    return best;
  }

  function findHint() {
    let best = null;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || cell.kind !== "block") continue;
      const found = { block: cell, x: i % width, y: Math.floor(i / width), i };
      if (cell.gray) {
        if (state.charge > 0 && (!best || best.type !== "path")) best = { type: "prism", id: cell.id };
        continue;
      }
      const path = pathToDoor(found);
      if (path && (!best || best.type !== "path" || path.length < best.path.length)) {
        best = { type: "path", id: cell.id, path };
      }
    }
    if (!best) best = repositionHint();
    state.hintPath = best && best.type === "path" ? best.path : null;
    state.selected = best ? best.id : null;
    return best;
  }

  function usePrism(id) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    if (state.charge <= 0) return { ok: false, reason: "charge" };
    const found = blockById(id);
    if (!found || !found.block.gray) return { ok: false, reason: "gray" };
    let color = -1;
    let room = -1;
    for (let c = 0; c < state.colors; c++) {
      const space = remainingCapacity(c);
      if (space > room) { room = space; color = c; }
    }
    if (color < 0 || room <= 0) return { ok: false, reason: "full" };
    remember();
    found.block.gray = false;
    found.block.color = color;
    state.charge--;
    state.moves++;
    state.combo = 0;
    emit("prism", { id, color });
    return { ok: true, color };
  }

  function consumeAbility(id, cooldown) {
    const ability = state.abilities[id];
    if (!ability || ability.charges <= 0 || ability.cooldown > 0) return false;
    ability.charges--;
    ability.cooldown = cooldown;
    return true;
  }

  function usePulse() {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    if (!consumeAbility("pulse", 5)) return { ok: false, reason: "charge" };
    const duration = 6 + (state.abilities.pulse.max - 2) * 0.75;
    state.pulseUntil = state.elapsed + duration;
    emit("ability", { ability: "pulse", duration });
    return { ok: true, duration };
  }

  function armPush() {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    if (!consumeAbility("push", 4)) return { ok: false, reason: "charge" };
    state.pushArmed = true;
    emit("ability", { ability: "push" });
    return { ok: true };
  }

  function useScan() {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    if (!consumeAbility("scan", 7)) return { ok: false, reason: "charge" };
    const duration = 5 + (state.abilities.scan.max - 2) * 0.75;
    state.scanUntil = state.elapsed + duration;
    const hint = findHint();
    emit("ability", { ability: "scan", duration });
    return { ok: true, duration, hint };
  }

  function undo() {
    if (state.undoDisabled || !state.history.length || state.status !== "playing") return false;
    const previous = state.history.pop();
    for (const key of ["cells", "doors", "generators", "elevators", "moves", "score", "combo", "bestCombo", "charge", "abilities", "pulseUntil", "scanUntil", "pushArmed", "status", "reason", "stars"]) {
      state[key] = previous[key];
    }
    cells.splice(0, cells.length, ...state.cells);
    state.selected = null;
    state.hintPath = null;
    emit("undo");
    return true;
  }

  function swapRows(a, b) {
    for (let x = 0; x < width; x++) {
      const ia = index(x, a);
      const ib = index(x, b);
      [cells[ia], cells[ib]] = [cells[ib], cells[ia]];
    }
  }

  function swapCols(a, b) {
    for (let y = 1; y < height; y++) {
      const ia = index(a, y);
      const ib = index(b, y);
      [cells[ia], cells[ib]] = [cells[ib], cells[ia]];
    }
  }

  function updateElevators(dt) {
    for (const lift of state.elevators) {
      lift.timer -= dt;
      if (lift.timer > 0) continue;
      if (lift.axis === "row") swapRows(lift.a, lift.b);
      else swapCols(lift.a, lift.b);
      lift.timer += lift.period;
      lift.swaps++;
      state.shake = Math.max(state.shake, 0.18);
      emit("lift", { id: lift.id });
    }
  }

  function updateBlackouts() {
    for (const zone of state.blackouts) {
      const phase = (state.elapsed + zone.phase) % zone.period;
      const forced = (zone.forcedUntil || 0) > state.elapsed;
      const active = forced || phase < zone.offDuration;
      if (active !== zone.active) emit(active ? "blackout" : "power", { id: zone.id });
      zone.active = active;
    }
  }

  function spawnFromGenerator(gen) {
    const options = [];
    for (const [dx, dy] of DIRS) {
      const x = gen.x + dx;
      const y = gen.y + dy;
      if (!inside(x, y) || doorAt(x, y) || blackoutAt(x, y) || lockedAt(x, y)) continue;
      if (!cellAt(x, y)) options.push({ x, y });
    }
    if (!options.length) {
      gen.overload++;
      gen.timer = 1.2;
      emit("overload", { id: gen.id });
      if (gen.overload >= 3) checkLose("Un generatore è rimasto senza spazio.");
      return false;
    }
    const point = options[(gen.spawned + gen.x + gen.y) % options.length];
    const id = `spawn-${gen.id}-${gen.spawned}`;
    cells[index(point.x, point.y)] = { kind: "block", id, color: gen.color, gray: false };
    gen.spawned++;
    gen.overload = 0;
    gen.timer = gen.interval;
    emit("spawn", { id, x: point.x, y: point.y, color: gen.color });
    return true;
  }

  function updateGenerators(dt) {
    for (const gen of state.generators) {
      if (gen.spawned >= gen.total) continue;
      gen.timer -= dt;
      if (gen.timer <= 0) spawnFromGenerator(gen);
    }
  }

  function updateAbilities(dt) {
    for (const ability of Object.values(state.abilities)) ability.cooldown = Math.max(0, ability.cooldown - dt);
    state.locks = state.locks.filter((lock) => lock.until > state.elapsed);
  }

  function applyBossAttack() {
    const attack = state.boss.attacks % 4;
    state.boss.attacks++;
    state.shake = Math.max(state.shake, 0.3);
    if (attack === 0 && state.blackouts.length) {
      state.blackouts.forEach((zone) => { zone.forcedUntil = state.elapsed + 2.2; zone.active = true; });
      emit("bossAttack", { attack: "blackout" });
    } else if (attack === 1 && state.generators.length) {
      state.generators.forEach((generator) => { generator.timer = Math.min(generator.timer, 0.8); });
      emit("bossAttack", { attack: "surge" });
    } else if (attack === 2) {
      const row = 1 + (state.boss.attacks % (height - 2));
      const cells = [];
      for (let x = 1; x < width - 1; x++) cells.push({ x, y: row });
      state.locks.push({ until: state.elapsed + 4, cells });
      emit("bossAttack", { attack: "lock", row });
    } else if (state.elevators.length) {
      const lift = state.elevators[state.boss.attacks % state.elevators.length];
      if (lift.axis === "row") swapRows(lift.a, lift.b);
      else swapCols(lift.a, lift.b);
      emit("bossAttack", { attack: "lift" });
    } else {
      const row = 1 + (state.boss.attacks % (height - 2));
      state.locks.push({ until: state.elapsed + 3, cells: [{ x: 2, y: row }, { x: 3, y: row }, { x: 4, y: row }] });
      emit("bossAttack", { attack: "lock", row });
    }
  }

  function updateBoss(dt) {
    if (!state.boss) return;
    const progress = capturedCount() / Math.max(1, state.totalPlanned);
    const phase = progress >= 0.75 ? 3 : progress >= 0.5 ? 2 : 1;
    if (phase !== state.bossPhase) {
      state.bossPhase = phase;
      state.boss.phase = phase;
      state.bossAttackTimer = 1;
      emit("bossPhase", { phase });
    }
    if (pulseActive()) return;
    state.bossAttackTimer -= dt;
    if (state.bossAttackTimer <= 0) {
      applyBossAttack();
      state.bossAttackTimer = state.boss.attackInterval / (phase === 3 ? 1.5 : phase === 2 ? 1.2 : 1);
    }
  }

  function update(dt) {
    if (state.status !== "playing") return state;
    const step = Math.min(0.1, Math.max(0, dt));
    state.elapsed += step;
    state.shake = Math.max(0, state.shake - step);
    updateAbilities(step);
    if (!pulseActive()) {
      updateBlackouts();
      updateElevators(step);
      updateGenerators(step);
      updateBoss(step);
    } else {
      updateBoss(0);
    }
    if (state.moveLimit > 0 && state.moves >= state.moveLimit) checkLose("Mosse esaurite.");
    checkWin();
    return state;
  }

  function snapshot() {
    return clone({
      specId: state.specId,
      companion: state.companion,
      status: state.status,
      reason: state.reason,
      cells: state.cells,
      doors: state.doors,
      generators: state.generators,
      elevators: state.elevators,
      blackouts: state.blackouts,
      moves: state.moves,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      charge: state.charge,
      abilities: state.abilities,
      pulseUntil: state.pulseUntil,
      scanUntil: state.scanUntil,
      pushArmed: state.pushArmed,
      locks: state.locks,
      boss: state.boss,
      bossPhase: state.bossPhase,
      bossAttackTimer: state.bossAttackTimer,
      elapsed: state.elapsed,
      stars: state.stars
    });
  }

  function restore(savedState) {
    if (!savedState || savedState.specId !== state.specId) return false;
    for (const key of ["status", "reason", "companion", "cells", "doors", "generators", "elevators", "blackouts", "locks", "moves", "score", "combo", "bestCombo", "charge", "abilities", "pulseUntil", "scanUntil", "pushArmed", "boss", "bossPhase", "bossAttackTimer", "elapsed", "stars"]) {
      if (savedState[key] !== undefined) state[key] = clone(savedState[key]);
    }
    cells.splice(0, cells.length, ...state.cells);
    return true;
  }

  function drainEvents() {
    if (!events.length) return [];
    return events.splice(0, events.length);
  }

  function remainingBlocks() {
    return cells.filter((cell) => cell && cell.kind === "block").length;
  }

  if (saved) restore(saved);

  return {
    state,
    getState() { return state; },
    moveBlock,
    moveAlongPath,
    findHint,
    usePrism,
    usePulse,
    armPush,
    useScan,
    pulseActive,
    scanActive,
    lockedAt,
    undo,
    update,
    snapshot,
    drainEvents,
    blockById,
    doorAt,
    blackoutAt,
    remainingBlocks,
    capturedCount,
    remainingCapacity,
    canUndo() { return state.history.length > 0; }
  };
}
