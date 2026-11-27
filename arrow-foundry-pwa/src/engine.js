import { pathClear } from "./rules.js";
import { solveLevel } from "./solver.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGame(level, saved) {
  const state = {
    specId: level.id,
    kind: level.kind,
    size: level.size,
    arrows: level.arrows.map((arrow, index) => ({ ...arrow, index, status: "active" })),
    walls: level.walls.map((wall) => ({ ...wall })),
    doors: level.doors.map((door) => ({ ...door, requires: door.requires.slice() })),
    moves: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    status: "playing",
    par: level.par || level.solution.length,
    stars: 0,
    undosLeft: 5,
    hammersLeft: 2,
    scansLeft: 3,
    highlight: [],
    usedBooster: false,
    history: [],
    events: []
  };
  const events = state.events;

  function emit(type, data) {
    events.push(Object.assign({ type }, data || {}));
  }

  function activeArray() {
    return state.arrows.map((arrow) => arrow.status !== "removed");
  }

  function doorMap() {
    return new Map(state.doors.map((door) => [door.key, door]));
  }

  function doorOpen(door) {
    return door.requires.every((id) => {
      const arrow = state.arrows.find((candidate) => candidate.id === id);
      return arrow && arrow.status === "removed";
    });
  }

  function clearPath(index) {
    const arrow = state.arrows[index];
    if (!arrow || arrow.status === "removed") return false;
    return pathClear(arrow, state.arrows, activeArray(), doorMap(), state.size);
  }

  function remember() {
    state.history.push(clone({
      arrows: state.arrows,
      moves: state.moves,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      status: state.status,
      undosLeft: state.undosLeft,
      hammersLeft: state.hammersLeft,
      scansLeft: state.scansLeft,
      usedBooster: state.usedBooster
    }));
    if (state.history.length > 60) state.history.shift();
  }

  function checkWin() {
    if (state.status === "playing" && state.arrows.every((arrow) => arrow.status === "removed")) {
      state.status = "won";
      const ratio = state.moves / Math.max(1, state.par);
      state.stars = !state.usedBooster && ratio <= 1 ? 3 : ratio <= 1.5 ? 2 : 1;
      emit("win", { score: state.score, stars: state.stars });
      return true;
    }
    return false;
  }

  function hit(index) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    const arrow = state.arrows[index];
    if (!arrow || arrow.status === "removed") return { ok: false, reason: "missing" };
    if (!clearPath(index)) {
      state.combo = 0;
      state.highlight = [];
      emit("blocked", { index });
      return { ok: false, reason: "blocked" };
    }
    remember();
    state.moves++;
    state.highlight = [];
    if (arrow.heavy && arrow.status === "active") {
      arrow.status = "weakened";
      state.score += 25;
      emit("hit", { index, removed: false });
      return { ok: true, removed: false };
    }
    arrow.status = "removed";
    state.combo++;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += 100 + Math.min(200, state.combo * 10);
    emit("hit", { index, removed: true, opened: state.doors.filter(doorOpen).length });
    checkWin();
    return { ok: true, removed: true };
  }

  function undo() {
    if (state.status !== "playing" || state.undosLeft <= 0 || !state.history.length) return false;
    const previous = state.history.pop();
    for (const key of ["arrows", "moves", "score", "combo", "bestCombo", "status", "undosLeft", "hammersLeft", "scansLeft", "usedBooster"]) state[key] = previous[key];
    state.undosLeft--;
    state.highlight = [];
    emit("undo");
    return true;
  }

  function hammer(index) {
    if (state.status !== "playing" || state.hammersLeft <= 0) return false;
    const arrow = state.arrows[index];
    if (!arrow || arrow.status === "removed") return false;
    remember();
    arrow.status = "removed";
    state.moves++;
    state.hammersLeft--;
    state.usedBooster = true;
    state.highlight = [];
    state.score += 50;
    emit("hammer", { index });
    checkWin();
    return true;
  }

  function scan() {
    if (state.status !== "playing" || state.scansLeft <= 0) return false;
    state.scansLeft--;
    state.usedBooster = true;
    state.highlight = state.arrows.map((_, index) => index).filter(clearPath);
    emit("scan", { indices: state.highlight.slice() });
    return true;
  }

  function hint() {
    if (state.status !== "playing") return null;
    let remaining = 0n;
    let weakened = 0n;
    state.arrows.forEach((arrow, index) => {
      const bit = 1n << BigInt(index);
      if (arrow.status !== "removed") remaining |= bit;
      if (arrow.status === "weakened") weakened |= bit;
    });
    const result = solveLevel(level, { remaining, weakened, maxNodes: 250000, maxMoves: 160 });
    if (!result.ok || !result.solution.length) return null;
    const move = result.solution[0];
    state.highlight = [move.index];
    emit("hint", move);
    return move;
  }

  function snapshot() {
    return clone({
      specId: state.specId,
      arrows: state.arrows,
      moves: state.moves,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      status: state.status,
      undosLeft: state.undosLeft,
      hammersLeft: state.hammersLeft,
      scansLeft: state.scansLeft,
      usedBooster: state.usedBooster
    });
  }

  function restore(savedState) {
    if (!savedState || savedState.specId !== state.specId) return false;
    for (const key of ["arrows", "moves", "score", "combo", "bestCombo", "status", "undosLeft", "hammersLeft", "scansLeft", "usedBooster"]) {
      if (savedState[key] !== undefined) state[key] = clone(savedState[key]);
    }
    return true;
  }

  if (saved) restore(saved);

  return {
    state,
    getState() { return state; },
    hit,
    undo,
    hammer,
    scan,
    hint,
    clearPath,
    doorOpen,
    snapshot,
    drainEvents() { return events.splice(0, events.length); }
  };
}
