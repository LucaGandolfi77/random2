import type { Fighter } from '../fighters/Fighter';

export function aliveFighters(fighters: readonly Fighter[]): Fighter[] {
  return fighters.filter((fighter) => !fighter.eliminated);
}

export function stockWinnerSlots(fighters: readonly Fighter[]): number[] | null {
  const alive = aliveFighters(fighters);
  if (alive.length > 1) return null;
  return alive.map((fighter) => fighter.slot);
}

export function teamWinnerSlots(fighters: readonly Fighter[]): number[] | null {
  const alive = aliveFighters(fighters);
  const teams = [0, 1].filter((team) => alive.some((fighter) => fighter.config.team === team));
  if (teams.length > 1) return null;
  return alive.filter((fighter) => teams.length === 0 || fighter.config.team === teams[0]).map((fighter) => fighter.slot);
}

export function timeWinnerSlots(fighters: readonly Fighter[]): number[] {
  if (fighters.length === 0) return [];
  const maxKos = Math.max(...fighters.map((fighter) => fighter.kos));
  return fighters.filter((fighter) => fighter.kos === maxKos).map((fighter) => fighter.slot);
}
