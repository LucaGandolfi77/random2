import { applyPour, canPour, cloneTubes, isSolved, pourAmount } from "./rules.js";
import { solveLevel } from "./solver.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function completedColors(tubes) {
  return tubes.filter((tube) => tube.length === 4 && tube.every((unit) => unit === tube[0])).length;
}

export function createGame(level, saved) {
  const state = {
    specId: level.id,
    kind: level.kind,
    tubes: cloneTubes(level.tubes),
    colors: level.colors,
    selected: null,
    moves: 0,
    pours: 0,
    score: 0,
    status: "playing",
    stars: 0,
    par: level.par || level.solution.length,
    undosLeft: 5,
    shufflesLeft: 2,
    extrasLeft: 1,
    usedBooster: false,
    history: [],
    events: []
  };
  const events = state.events;

  function emit(type, data) {
    events.push(Object.assign({ type }, data || {}));
  }

  function remember() {
    state.history.push(clone({
      tubes: state.tubes,
      selected: state.selected,
      moves: state.moves,
      pours: state.pours,
      score: state.score,
      status: state.status
    }));
    if (state.history.length > 60) state.history.shift();
  }

  function checkWin() {
    if (state.status === "playing" && isSolved(state.tubes, state.colors)) {
      state.status = "won";
      const ratio = state.moves / Math.max(1, state.par);
      state.stars = !state.usedBooster && ratio <= 1 ? 3 : ratio <= 1.5 ? 2 : 1;
      emit("win", { score: state.score, stars: state.stars });
      return true;
    }
    return false;
  }

  function select(index) {
    if (state.status !== "playing" || index < 0 || index >= state.tubes.length || !state.tubes[index].length) return false;
    state.selected = index;
    emit("select", { index: state.selected });
    return true;
  }

  function pour(to) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    const from = state.selected;
    if (from == null) return { ok: false, reason: "selection" };
    if (!canPour(state.tubes, from, to)) {
      emit("invalid", { from, to });
      return { ok: false, reason: "invalid" };
    }
    const before = completedColors(state.tubes);
    const amount = pourAmount(state.tubes, from, to);
    const color = state.tubes[from][state.tubes[from].length - 1];
    remember();
    const tubes = applyPour(state.tubes, from, to);
    state.tubes = tubes;
    state.moves++;
    state.pours++;
    state.score += amount * 10;
    const after = completedColors(state.tubes);
    if (after > before) state.score += (after - before) * 250;
    state.selected = state.tubes[from].length ? from : null;
    emit("pour", { from, to, amount, color, completed: after > before });
    checkWin();
    return { ok: true, amount, completed: after > before };
  }

  function undo() {
    if (state.status !== "playing" || state.undosLeft <= 0 || !state.history.length) return false;
    const previous = state.history.pop();
    for (const key of ["tubes", "selected", "moves", "pours", "score", "status"]) state[key] = previous[key];
    state.undosLeft--;
    state.usedBooster = true;
    emit("undo");
    return true;
  }

  function shuffle() {
    if (state.status !== "playing" || state.shufflesLeft <= 0) return false;
    remember();
    state.tubes = cloneTubes(level.shuffleTubes);
    state.selected = null;
    state.moves++;
    state.shufflesLeft--;
    state.usedBooster = true;
    emit("shuffle");
    checkWin();
    return true;
  }

  function addTube() {
    if (state.status !== "playing" || state.extrasLeft <= 0 || state.tubes.length >= level.tubes.length + 2) return false;
    remember();
    state.tubes.push([]);
    state.extrasLeft--;
    state.usedBooster = true;
    emit("extra-tube");
    return true;
  }

  function hint() {
    if (state.status !== "playing") return null;
    const result = solveLevel({ tubes: state.tubes, colors: state.colors }, { maxNodes: 120000, maxMoves: 160 });
    if (!result.ok || !result.solution.length) return null;
    const move = result.solution[0];
    state.selected = move.from;
    emit("hint", move);
    return move;
  }

  function snapshot() {
    return clone({
      specId: state.specId,
      tubes: state.tubes,
      selected: state.selected,
      moves: state.moves,
      pours: state.pours,
      score: state.score,
      status: state.status,
      undosLeft: state.undosLeft,
      shufflesLeft: state.shufflesLeft,
      extrasLeft: state.extrasLeft,
      usedBooster: state.usedBooster
    });
  }

  function restore(savedState) {
    if (!savedState || savedState.specId !== state.specId) return false;
    for (const key of ["tubes", "selected", "moves", "pours", "score", "status", "undosLeft", "shufflesLeft", "extrasLeft", "usedBooster"]) {
      if (savedState[key] !== undefined) state[key] = clone(savedState[key]);
    }
    return true;
  }

  if (saved) restore(saved);

  return {
    state,
    getState() { return state; },
    select,
    pour,
    undo,
    shuffle,
    addTube,
    hint,
    canPour(from, to) { return canPour(state.tubes, from, to); },
    snapshot,
    drainEvents() { return events.splice(0, events.length); }
  };
}
