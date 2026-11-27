import { BOARD_SIZE, COLORS, SCORE_VALUES } from "./config.js";
import { cellsFor, createPiece } from "./pieces.js";
import { mulberry32 } from "./levels.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function inside(x, y) {
  return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

export function createGame(spec, saved) {
  const rng = mulberry32(spec.seed == null ? 1 : spec.seed >>> 0);
  const board = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  const blocked = new Array(BOARD_SIZE * BOARD_SIZE).fill(false);
  for (const obstacle of spec.obstacles || []) blocked[obstacle.y * BOARD_SIZE + obstacle.x] = true;
  let nextId = 1;
  const events = [];

  const state = {
    specId: spec.id,
    kind: spec.kind,
    board,
    blocked,
    tray: [null, null, null],
    selected: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lines: 0,
    pieces: 0,
    status: "playing",
    objective: spec.objective ? clone(spec.objective) : null,
    objectiveProgress: 0,
    undosLeft: spec.undoLimit || 0,
    history: [],
    events
  };

  function emit(type, data) {
    events.push(Object.assign({ type }, data || {}));
  }

  function newPiece() {
    const color = Math.floor(rng() * COLORS.length);
    return createPiece(`p${nextId++}`, color, rng);
  }

  function fillTray() {
    for (let i = 0; i < state.tray.length; i++) if (!state.tray[i]) state.tray[i] = newPiece();
  }

  function pieceCells(piece, x, y, rotation = piece.rotation) {
    const rotated = rotation === 0 ? piece : Object.assign({}, piece, { rotation });
    return cellsFor(rotated).map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
  }

  function canPlaceAt(piece, x, y, rotation = piece.rotation) {
    if (!piece) return false;
    for (const cell of pieceCells(piece, x, y, rotation)) {
      if (!inside(cell.x, cell.y)) return false;
      const index = cell.y * BOARD_SIZE + cell.x;
      if (blocked[index] || board[index]) return false;
    }
    return true;
  }

  function findPlacement(piece) {
    for (let rotation = 0; rotation < 2; rotation++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (canPlaceAt(piece, x, y, rotation)) return { x, y, rotation };
        }
      }
    }
    return null;
  }

  function hasAnyMove() {
    return state.tray.some((piece) => piece && findPlacement(piece));
  }

  function previewLines(x, y, cells) {
    const test = board.slice();
    for (const cell of cells) test[cell.y * BOARD_SIZE + cell.x] = true;
    const rows = [];
    const cols = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      let full = true;
      for (let col = 0; col < BOARD_SIZE; col++) if (!test[row * BOARD_SIZE + col]) { full = false; break; }
      if (full) rows.push(row);
    }
    for (let col = 0; col < BOARD_SIZE; col++) {
      let full = true;
      for (let row = 0; row < BOARD_SIZE; row++) if (!test[row * BOARD_SIZE + col]) { full = false; break; }
      if (full) cols.push(col);
    }
    return { rows, cols, count: rows.length + cols.length };
  }

  function remember() {
    state.history.push(clone({
      board: state.board,
      tray: state.tray,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      lines: state.lines,
      pieces: state.pieces,
      status: state.status,
      objectiveProgress: state.objectiveProgress
    }));
    if (state.history.length > 20) state.history.shift();
  }

  function updateObjective() {
    if (!state.objective) return;
    if (state.objective.type === "lines") state.objectiveProgress = state.lines;
    else if (state.objective.type === "score") state.objectiveProgress = state.score;
    else if (state.objective.type === "pieces") state.objectiveProgress = state.pieces;
  }

  function checkObjective() {
    updateObjective();
    if (state.objective && state.objectiveProgress >= state.objective.target) {
      state.status = "won";
      emit("win", { score: state.score, lines: state.lines });
      return true;
    }
    return false;
  }

  function place(index, x, y, rotation) {
    if (state.status !== "playing") return { ok: false, reason: "over" };
    const piece = state.tray[index];
    if (!piece) return { ok: false, reason: "empty" };
    const useRotation = rotation == null ? piece.rotation : rotation;
    if (!canPlaceAt(piece, x, y, useRotation)) return { ok: false, reason: "blocked" };
    const cells = pieceCells(piece, x, y, useRotation);
    const preview = previewLines(x, y, cells);
    remember();
    for (const cell of cells) board[cell.y * BOARD_SIZE + cell.x] = { color: piece.color };
    state.tray[index] = null;
    state.pieces++;
    state.score += cells.length * SCORE_VALUES.cell;

    const cleared = new Set();
    for (const row of preview.rows) for (let col = 0; col < BOARD_SIZE; col++) cleared.add(row * BOARD_SIZE + col);
    for (const col of preview.cols) for (let row = 0; row < BOARD_SIZE; row++) cleared.add(row * BOARD_SIZE + col);
    if (cleared.size) {
      for (const cellIndex of cleared) board[cellIndex] = null;
      state.lines += preview.count;
      state.combo++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const intersections = preview.rows.length * preview.cols.length;
      state.score += preview.count * SCORE_VALUES.line * state.combo + intersections * SCORE_VALUES.intersection;
      emit("clear", { cells: [...cleared], rows: preview.rows, cols: preview.cols, color: piece.color });
    } else {
      state.combo = 0;
    }

    fillTray();
    if (state.selected === index) state.selected = state.tray.findIndex(Boolean);
    emit("place", { index, x, y, cells: cells.length, color: piece.color });
    if (!checkObjective() && !hasAnyMove()) {
      state.status = "lost";
      emit("lose", { score: state.score });
    }
    return { ok: true, lines: preview.count, cleared: cleared.size };
  }

  function rotate(index = state.selected) {
    if (state.status !== "playing") return false;
    const piece = state.tray[index];
    if (!piece) return false;
    piece.rotation = piece.rotation === 0 ? 1 : 0;
    state.selected = index;
    emit("rotate", { index });
    return true;
  }

  function select(index) {
    if (index < 0 || index >= state.tray.length || !state.tray[index]) return false;
    state.selected = index;
    return true;
  }

  function undo() {
    if (state.status !== "playing" || state.undosLeft <= 0 || !state.history.length) return false;
    const previous = state.history.pop();
    state.board.splice(0, state.board.length, ...previous.board);
    for (const key of ["tray", "score", "combo", "bestCombo", "lines", "pieces", "status", "objectiveProgress"]) state[key] = previous[key];
    state.undosLeft--;
    state.selected = state.tray.findIndex(Boolean);
    emit("undo");
    return true;
  }

  function hint() {
    let best = null;
    for (let index = 0; index < state.tray.length; index++) {
      const piece = state.tray[index];
      if (!piece) continue;
      for (let rotation = 0; rotation < 2; rotation++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          for (let x = 0; x < BOARD_SIZE; x++) {
            if (!canPlaceAt(piece, x, y, rotation)) continue;
            const cells = pieceCells(piece, x, y, rotation);
            const lines = previewLines(x, y, cells).count;
            if (!best || lines > best.lines) best = { index, x, y, rotation, lines };
          }
        }
      }
    }
    if (best) state.selected = best.index;
    return best;
  }

  function snapshot() {
    return clone({
      specId: state.specId,
      board: state.board,
      tray: state.tray,
      selected: state.selected,
      score: state.score,
      combo: state.combo,
      bestCombo: state.bestCombo,
      lines: state.lines,
      pieces: state.pieces,
      status: state.status,
      objectiveProgress: state.objectiveProgress,
      undosLeft: state.undosLeft
    });
  }

  function restore(savedState) {
    if (!savedState || savedState.specId !== state.specId) return false;
    state.board.splice(0, state.board.length, ...clone(savedState.board));
    for (const key of ["tray", "selected", "score", "combo", "bestCombo", "lines", "pieces", "status", "objectiveProgress", "undosLeft"]) {
      if (savedState[key] !== undefined) state[key] = clone(savedState[key]);
    }
    return true;
  }

  fillTray();
  if (saved) restore(saved);

  return {
    state,
    getState() { return state; },
    canPlaceAt,
    findPlacement,
    place,
    rotate,
    select,
    undo,
    hint,
    snapshot,
    drainEvents() { return events.splice(0, events.length); },
    hasAnyMove() { return hasAnyMove(); }
  };
}
