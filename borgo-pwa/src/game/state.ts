import { FLOWERS, LETTERS, SPAWN, TILES, WORLD } from '../data/town';
import type { Language, QuestId, QuestPhase } from '../data/types';

export interface Settings {
  lang: Language;
  volume: number;
  reducedMotion: boolean;
}

export interface PlayerSnapshot {
  x: number;
  z: number;
  rot: number;
  yaw: number;
  pitch: number;
}

export interface GameState {
  v: 1;
  started: boolean;
  player: PlayerSnapshot;
  quests: Record<QuestId, QuestPhase>;
  letters: string[];
  flowers: string[];
  tiles: string[];
  flags: {
    dusk: boolean;
    finaleSeen: boolean;
  };
  settings: Settings;
  elapsed: number;
  savedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'it',
  volume: 0.7,
  reducedMotion: false
};

const LETTER_IDS = new Set(LETTERS.map((l) => l.id));
const FLOWER_IDS = new Set(FLOWERS.map((f) => f.id));
const TILE_IDS = new Set(TILES.map((t) => t.id));

const QUEST_IDS: QuestId[] = ['bread', 'letters', 'flowers', 'bell'];
const PHASES: QuestPhase[] = ['locked', 'available', 'active', 'objective', 'done'];

export function createInitialState(now = Date.now()): GameState {
  return {
    v: 1,
    started: false,
    player: {
      x: SPAWN.x,
      z: SPAWN.z,
      rot: SPAWN.rot,
      yaw: 0,
      pitch: 0.4
    },
    quests: {
      bread: 'available',
      letters: 'available',
      flowers: 'available',
      bell: 'locked'
    },
    letters: [],
    flowers: [],
    tiles: [],
    flags: { dusk: false, finaleSeen: false },
    settings: { ...DEFAULT_SETTINGS },
    elapsed: 0,
    savedAt: now
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player },
    quests: { ...state.quests },
    letters: [...state.letters],
    flowers: [...state.flowers],
    tiles: [...state.tiles],
    flags: { ...state.flags },
    settings: { ...state.settings }
  };
}

export function questDoneCount(state: GameState): number {
  return QUEST_IDS.filter((id) => state.quests[id] === 'done').length;
}

export function isTownReady(state: GameState): boolean {
  return (
    state.quests.bread === 'done' &&
    state.quests.letters === 'done' &&
    state.quests.flowers === 'done'
  );
}

export function refreshUnlocks(state: GameState): void {
  if (isTownReady(state)) {
    state.flags.dusk = true;
    if (state.quests.bell === 'locked') state.quests.bell = 'available';
  } else {
    state.flags.dusk = false;
  }
}

export function acceptQuest(state: GameState, id: QuestId): boolean {
  if (state.quests[id] !== 'available') return false;
  state.quests[id] = 'active';
  return true;
}

export function deliverBread(state: GameState): boolean {
  if (state.quests.bread !== 'active') return false;
  state.quests.bread = 'done';
  refreshUnlocks(state);
  return true;
}

export function collectLetter(state: GameState, id: string): boolean {
  if (state.quests.letters !== 'active') return false;
  if (!LETTER_IDS.has(id) || state.letters.includes(id)) return false;
  state.letters.push(id);
  if (state.letters.length >= LETTERS.length) state.quests.letters = 'objective';
  return true;
}

export function returnLetters(state: GameState): boolean {
  if (state.quests.letters !== 'objective') return false;
  state.quests.letters = 'done';
  refreshUnlocks(state);
  return true;
}

export function collectFlower(state: GameState, id: string): boolean {
  if (state.quests.flowers !== 'active') return false;
  if (!FLOWER_IDS.has(id) || state.flowers.includes(id)) return false;
  state.flowers.push(id);
  if (state.flowers.length >= FLOWERS.length) state.quests.flowers = 'objective';
  return true;
}

export function returnFlowers(state: GameState): boolean {
  if (state.quests.flowers !== 'objective') return false;
  state.quests.flowers = 'done';
  refreshUnlocks(state);
  return true;
}

export function collectTile(state: GameState, id: string): boolean {
  if (!TILE_IDS.has(id) || state.tiles.includes(id)) return false;
  state.tiles.push(id);
  return true;
}

export function acceptBell(state: GameState): boolean {
  if (state.quests.bell !== 'available') return false;
  state.quests.bell = 'active';
  return true;
}

export function ringBell(state: GameState): boolean {
  if (state.quests.bell !== 'active') return false;
  state.quests.bell = 'done';
  state.flags.finaleSeen = true;
  refreshUnlocks(state);
  return true;
}

export function hospitality(state: GameState): number {
  const errands =
    (state.quests.bread === 'done' ? 2 : 0) +
    (state.quests.letters === 'done' ? 2 : 0) +
    (state.quests.flowers === 'done' ? 2 : 0) +
    (state.quests.bell === 'done' ? 2 : 0);
  return errands + state.tiles.length;
}

export function rankIndex(state: GameState): number {
  const points = hospitality(state);
  if (points >= 10) return 3;
  if (points >= 6) return 2;
  if (points >= 3) return 1;
  return 0;
}

export function questProgress(state: GameState, id: QuestId): string {
  if (id === 'letters') return `${state.letters.length}/${LETTERS.length}`;
  if (id === 'flowers') return `${state.flowers.length}/${FLOWERS.length}`;
  if (id === 'bread') return state.quests.bread === 'done' ? '1/1' : '0/1';
  return state.quests.bell === 'done' ? '1/1' : '0/1';
}

export function activeQuest(state: GameState): QuestId | null {
  for (const id of QUEST_IDS) {
    if (state.quests[id] === 'objective') return id;
  }
  for (const id of QUEST_IDS) {
    if (state.quests[id] === 'active') return id;
  }
  return null;
}

export function sanitizeState(raw: unknown, now = Date.now()): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.v !== 1) return null;

  const state = createInitialState(now);
  state.started = true;

  const player = data.player as Record<string, unknown> | undefined;
  if (player && typeof player === 'object') {
    const x = numberOr(player.x, SPAWN.x);
    const z = numberOr(player.z, SPAWN.z);
    state.player.x = clamp(x, WORLD.minX + 0.5, WORLD.maxX - 0.5);
    state.player.z = clamp(z, WORLD.minZ + 0.5, WORLD.maxZ - 0.5);
    state.player.rot = angle(numberOr(player.rot, SPAWN.rot));
    state.player.yaw = angle(numberOr(player.yaw, 0));
    state.player.pitch = clamp(numberOr(player.pitch, 0.4), 0.15, 1.15);
  }

  const quests = data.quests as Record<string, unknown> | undefined;
  if (quests && typeof quests === 'object') {
    for (const id of QUEST_IDS) {
      const value = quests[id];
      if (typeof value === 'string' && (PHASES as string[]).includes(value)) {
        state.quests[id] = value as QuestPhase;
      }
    }
  }

  state.letters = uniqueKnown(data.letters, LETTER_IDS).slice(0, LETTERS.length);
  state.flowers = uniqueKnown(data.flowers, FLOWER_IDS).slice(0, FLOWERS.length);
  state.tiles = uniqueKnown(data.tiles, TILE_IDS).slice(0, TILES.length);

  repairQuestChains(state);

  const flags = data.flags as Record<string, unknown> | undefined;
  if (flags && typeof flags === 'object') {
    state.flags.finaleSeen = flags.finaleSeen === true;
  }

  const settings = data.settings as Record<string, unknown> | undefined;
  if (settings && typeof settings === 'object') {
    state.settings.lang = settings.lang === 'en' ? 'en' : 'it';
    state.settings.volume = clamp(numberOr(settings.volume, DEFAULT_SETTINGS.volume), 0, 1);
    state.settings.reducedMotion = settings.reducedMotion === true;
  }

  state.elapsed = Math.max(0, numberOr(data.elapsed, 0));
  state.savedAt = numberOr(data.savedAt, now);

  if (state.quests.bell !== 'done') state.flags.finaleSeen = false;
  if (state.quests.bell === 'done') state.flags.finaleSeen = true;

  return state;
}

function repairQuestChains(state: GameState): void {
  const lettersDone = state.quests.letters === 'done';
  if (lettersDone && state.letters.length < LETTERS.length) state.quests.letters = 'active';
  if (state.quests.letters === 'objective' && state.letters.length < LETTERS.length) {
    state.quests.letters = 'active';
  }
  if (state.quests.letters === 'active' && state.letters.length >= LETTERS.length) {
    state.quests.letters = 'objective';
  }

  const flowersDone = state.quests.flowers === 'done';
  if (flowersDone && state.flowers.length < FLOWERS.length) state.quests.flowers = 'active';
  if (state.quests.flowers === 'objective' && state.flowers.length < FLOWERS.length) {
    state.quests.flowers = 'active';
  }
  if (state.quests.flowers === 'active' && state.flowers.length >= FLOWERS.length) {
    state.quests.flowers = 'objective';
  }

  if (state.quests.bread === 'objective') state.quests.bread = 'active';

  const ready = isTownReady(state);
  if (!ready && (state.quests.bell === 'active' || state.quests.bell === 'done')) {
    state.quests.bell = 'locked';
  }
  if (!ready && state.quests.bell === 'available') {
    state.quests.bell = 'locked';
  }
  if (ready && state.quests.bell === 'locked') {
    state.quests.bell = 'available';
  }
  if (state.quests.bell === 'objective') state.quests.bell = 'active';

  refreshUnlocks(state);
  if (state.quests.bell === 'done') state.flags.finaleSeen = true;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function angle(value: number): number {
  const tau = Math.PI * 2;
  return ((value % tau) + tau) % tau;
}

function uniqueKnown(value: unknown, known: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && known.has(item) && !out.includes(item)) out.push(item);
  }
  return out;
}
