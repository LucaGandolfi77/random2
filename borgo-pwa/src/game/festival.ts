import {
  FESTIVAL_BRANCHES,
  FESTIVAL_LANTERNS,
  FESTIVAL_MUSICIANS,
  FESTIVAL_POSTCARDS,
  FESTIVAL_PROCESSION_PATH,
  FESTIVAL_STAGE,
  FESTIVAL_STALLS
} from '../data/festival';
import type { BoxCollider } from '../data/colliders';
import type { FestivalPhase } from '../data/types';

export interface FestivalState {
  phase: FestivalPhase;
  lanterns: string[];
  musicians: string[];
  branches: string[];
  garland: boolean;
  guest: boolean;
  guestArrived: boolean;
  finaleSeen: boolean;
}

const LANTERN_IDS = new Set(FESTIVAL_LANTERNS.map((item) => item.id));
const MUSICIAN_IDS = new Set(FESTIVAL_MUSICIANS.map((item) => item.id));
const BRANCH_IDS = new Set(FESTIVAL_BRANCHES.map((item) => item.id));

export const FESTIVAL_POSTCARD_IDS = new Set(FESTIVAL_POSTCARDS.map((item) => item.id));

export function createFestivalState(bellDone = false): FestivalState {
  return {
    phase: bellDone ? 'ready' : 'locked',
    lanterns: [],
    musicians: [],
    branches: [],
    garland: false,
    guest: false,
    guestArrived: false,
    finaleSeen: false
  };
}

export function unlockFestival(state: FestivalState): boolean {
  if (state.phase !== 'locked') return false;
  state.phase = 'ready';
  return true;
}

export function startFestival(state: FestivalState): boolean {
  if (state.phase !== 'ready') return false;
  state.phase = 'active';
  return true;
}

export function lightLantern(state: FestivalState, id: string): boolean {
  if (state.phase !== 'active') return false;
  if (!LANTERN_IDS.has(id) || state.lanterns.includes(id)) return false;
  state.lanterns.push(id);
  return true;
}

export function inviteMusician(state: FestivalState, id: string): boolean {
  if (state.phase !== 'active') return false;
  if (!MUSICIAN_IDS.has(id) || state.musicians.includes(id)) return false;
  state.musicians.push(id);
  return true;
}

export function collectBranch(state: FestivalState, id: string): boolean {
  if (state.phase !== 'active') return false;
  if (!BRANCH_IDS.has(id) || state.branches.includes(id)) return false;
  state.branches.push(id);
  return true;
}

export function finishGarland(state: FestivalState): boolean {
  if (state.phase !== 'active') return false;
  if (state.garland || state.branches.length < FESTIVAL_BRANCHES.length) return false;
  state.garland = true;
  return true;
}

export function welcomeGuest(state: FestivalState): boolean {
  if (state.phase !== 'active' || state.guest) return false;
  state.guest = true;
  state.guestArrived = true;
  return true;
}

export function lanternsDone(state: FestivalState): boolean {
  return state.lanterns.length >= FESTIVAL_LANTERNS.length;
}

export function musiciansDone(state: FestivalState): boolean {
  return state.musicians.length >= FESTIVAL_MUSICIANS.length;
}

/** Three of the four optional activities open the procession. */
export function festivalTaskCount(state: FestivalState): number {
  return [
    lanternsDone(state),
    musiciansDone(state),
    state.garland,
    state.guest
  ].filter(Boolean).length;
}

export function canStartProcession(state: FestivalState): boolean {
  return state.phase === 'active' && festivalTaskCount(state) >= 3;
}

export function startProcession(state: FestivalState): boolean {
  if (!canStartProcession(state)) return false;
  state.phase = 'procession';
  return true;
}

export function finishProcession(state: FestivalState): boolean {
  if (state.phase !== 'procession') return false;
  state.phase = 'done';
  state.finaleSeen = true;
  return true;
}

export function festivalPathLength(): number {
  let total = 0;
  for (let i = 0; i < FESTIVAL_PROCESSION_PATH.length; i++) {
    const a = FESTIVAL_PROCESSION_PATH[i];
    const b = FESTIVAL_PROCESSION_PATH[(i + 1) % FESTIVAL_PROCESSION_PATH.length];
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}

/** A point along the closed procession loop, wrapped to keep the file simple. */
export function festivalPathPoint(distance: number): { x: number; z: number; heading: number } {
  const length = festivalPathLength();
  let remaining = ((distance % length) + length) % length;
  for (let i = 0; i < FESTIVAL_PROCESSION_PATH.length; i++) {
    const a = FESTIVAL_PROCESSION_PATH[i];
    const b = FESTIVAL_PROCESSION_PATH[(i + 1) % FESTIVAL_PROCESSION_PATH.length];
    const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= segment) {
      const t = segment > 1e-6 ? remaining / segment : 0;
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        heading: Math.atan2(b.x - a.x, b.z - a.z)
      };
    }
    remaining -= segment;
  }
  const first = FESTIVAL_PROCESSION_PATH[0];
  return { x: first.x, z: first.z, heading: 0 };
}

export function festivalObstacles(): BoxCollider[] {
  const out: BoxCollider[] = [];
  for (const stall of FESTIVAL_STALLS) {
    out.push({ kind: 'box', x: stall.x, z: stall.z, hw: stall.w / 2, hd: stall.d / 2 });
  }
  out.push({
    kind: 'box',
    x: FESTIVAL_STAGE.x,
    z: FESTIVAL_STAGE.z,
    hw: FESTIVAL_STAGE.w / 2,
    hd: FESTIVAL_STAGE.d / 2
  });
  return out;
}

export function addPostcard(postcards: string[], id: string): boolean {
  if (!FESTIVAL_POSTCARD_IDS.has(id) || postcards.includes(id)) return false;
  postcards.push(id);
  return true;
}

/** Repair a partially corrupt v4 payload without losing valid progress. */
export function sanitizeFestival(raw: unknown, bellDone: boolean): FestivalState {
  const state = createFestivalState(bellDone);
  if (!raw || typeof raw !== 'object') return state;
  const data = raw as Record<string, unknown>;
  const phases: FestivalPhase[] = ['locked', 'ready', 'active', 'procession', 'done'];
  if (typeof data.phase === 'string' && phases.includes(data.phase as FestivalPhase)) {
    state.phase = data.phase as FestivalPhase;
  }
  if (state.phase === 'procession') state.phase = 'active';
  state.lanterns = uniqueKnown(data.lanterns, LANTERN_IDS);
  state.musicians = uniqueKnown(data.musicians, MUSICIAN_IDS);
  state.branches = uniqueKnown(data.branches, BRANCH_IDS);
  state.garland = data.garland === true && state.branches.length >= FESTIVAL_BRANCHES.length;
  state.guest = data.guest === true;
  state.guestArrived = state.guest;
  state.finaleSeen = data.finaleSeen === true;

  if (!bellDone) {
    state.phase = 'locked';
  } else if (state.phase === 'locked') {
    state.phase = 'ready';
  }
  state.finaleSeen = state.phase === 'done';
  return state;
}

export function uniqueKnown(value: unknown, known: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && known.has(item) && !out.includes(item)) out.push(item);
  }
  return out;
}
