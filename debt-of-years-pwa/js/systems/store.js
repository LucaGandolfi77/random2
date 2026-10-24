import { createInitialState } from './state.js';

let current = null;

export function startNewGame(opts = {}) {
  current = createInitialState(opts);
  return current;
}

export function setCurrent(state) {
  current = state;
  return current;
}

export function getState() {
  return current;
}

export function ensureState() {
  if (!current) current = createInitialState();
  return current;
}
