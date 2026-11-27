import { applyMove, isSolved, legalMoves } from "./rules.js";
import { solveLevel } from "./solver.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGame(level, saved) {
  const state = {
    specId: level.id,
    kind: level.kind,
    size: level.size,
    vehicles: level.vehicles.map(vehicle => ({ ...vehicle })),
    selected: level.vehicles[0]?.id || null,
    moves: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    exits: 0,
    status: "playing",
    par: level.par || level.solution.length,
    stars: 0,
    undosLeft: 5,
    towsLeft: 2,
    shufflesLeft: 1,
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
      vehicles: state.vehicles,
      selected: state.selected,
      moves: state.moves,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      exits: state.exits,
      status: state.status,
      undosLeft: state.undosLeft,
      towsLeft: state.towsLeft,
      shufflesLeft: state.shufflesLeft,
      usedBooster: state.usedBooster
    }));
    if (state.history.length > 60) state.history.shift();
  }

  function checkWin() {
    if (state.status !== "playing" || !isSolved(state.vehicles)) return false;
    state.status = "won";
    const ratio = state.moves / Math.max(1, state.par);
    state.stars = !state.usedBooster && ratio <= 1 ? 3 : ratio <= 1.5 ? 2 : 1;
    emit("win", { score: state.score, stars: state.stars });
    return true;
  }

  function activeVehicle(id = state.selected) {
    return state.vehicles.find(vehicle => vehicle.id === id && vehicle.status !== "exited") || null;
  }

  function select(id) {
    if (!activeVehicle(id)) return false;
    state.selected = id;
    emit("select", { id });
    return true;
  }

  function moveVehicle(id, x, y) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    const move = legalMoves(state.vehicles, level).find(candidate => candidate.id === id
      && candidate.type === "move" && candidate.x === x && candidate.y === y);
    if (!move) {
      emit("blocked", { id });
      return { ok: false, reason: "blocked" };
    }
    remember();
    state.vehicles = applyMove(state.vehicles, level, move);
    state.selected = id;
    state.moves++;
    state.score += 10;
    emit("move", { id, x, y });
    return { ok: true };
  }

  function removeVehicle(id, source = "exit") {
    const move = legalMoves(state.vehicles, level).find(candidate => candidate.id === id && candidate.type === "exit");
    if (!move) {
      emit("blocked", { id });
      return { ok: false, reason: "blocked" };
    }
    remember();
    const vehicle = activeVehicle(id);
    const color = vehicle.color;
    state.vehicles = applyMove(state.vehicles, level, move);
    state.selected = state.vehicles.find(vehicle => vehicle.status !== "exited")?.id || null;
    state.moves++;
    state.exits++;
    state.combo++;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += 200 + state.combo * 25;
    emit(source, { id, color, vehicle: { ...vehicle } });
    checkWin();
    return { ok: true };
  }

  function exitVehicle(id) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    return removeVehicle(id, "exit");
  }

  function undo() {
    if (state.status !== "playing" || state.undosLeft <= 0 || !state.history.length) return false;
    const previous = state.history.pop();
    for (const key of ["vehicles", "selected", "moves", "score", "combo", "bestCombo", "exits", "status", "undosLeft", "towsLeft", "shufflesLeft", "usedBooster"]) {
      state[key] = clone(previous[key]);
    }
    state.undosLeft--;
    emit("undo");
    return true;
  }

  function tow(id = state.selected) {
    if (state.status !== "playing" || state.towsLeft <= 0 || !activeVehicle(id)) return false;
    remember();
    const vehicle = activeVehicle(id);
    const color = vehicle.color;
    state.vehicles = applyMove(state.vehicles, level, { id, type: "exit" });
    state.selected = state.vehicles.find(vehicle => vehicle.status !== "exited")?.id || null;
    state.moves++;
    state.exits++;
    state.combo++;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += 150;
    state.towsLeft--;
    state.usedBooster = true;
    emit("tow", { id, color, vehicle: { ...vehicle } });
    checkWin();
    return true;
  }

  function shuffle() {
    if (state.status !== "playing" || state.shufflesLeft <= 0) return false;
    remember();
    state.vehicles = level.shuffleVehicles.map(vehicle => ({ ...vehicle }));
    state.selected = state.vehicles.find(vehicle => vehicle.status !== "exited")?.id || null;
    state.moves++;
    state.shufflesLeft--;
    state.usedBooster = true;
    emit("shuffle");
    checkWin();
    return true;
  }

  function hint() {
    if (state.status !== "playing") return null;
    const result = solveLevel(level, { vehicles: state.vehicles, maxNodes: 220000, maxMoves: 80 });
    if (!result.ok || !result.solution.length) return null;
    const move = result.solution[0];
    state.selected = move.id;
    emit("hint", { move });
    return move;
  }

  function snapshot() {
    return clone({
      specId: state.specId,
      vehicles: state.vehicles,
      selected: state.selected,
      moves: state.moves,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      exits: state.exits,
      status: state.status,
      undosLeft: state.undosLeft,
      towsLeft: state.towsLeft,
      shufflesLeft: state.shufflesLeft,
      usedBooster: state.usedBooster
    });
  }

  function restore(saved) {
    if (!saved || saved.specId !== state.specId) return false;
    for (const key of ["vehicles", "selected", "moves", "score", "combo", "bestCombo", "exits", "status", "undosLeft", "towsLeft", "shufflesLeft", "usedBooster"]) {
      if (saved[key] !== undefined) state[key] = clone(saved[key]);
    }
    return true;
  }

  if (saved) restore(saved);
  return {
    state,
    getState() { return state; },
    select,
    moveVehicle,
    exitVehicle,
    undo,
    tow,
    shuffle,
    hint,
    activeVehicle,
    snapshot,
    drainEvents() { return events.splice(0, events.length); }
  };
}
