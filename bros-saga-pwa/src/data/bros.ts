import type { BroDef, BroState } from '../game/types';

export const BROS: BroDef[] = [
  {
    id: 'pip', name: 'PIP', role: 'The brave one',
    colors: { cap: '#e05a52', shirt: '#f2f2f2', overalls: '#3d63b8', skin: '#f6d8b8', boots: '#6b4423' },
    element: 'fire'
  },
  {
    id: 'pop', name: 'POP', role: 'The cautious one',
    colors: { cap: '#59c46f', shirt: '#f2f2f2', overalls: '#2f8b4c', skin: '#f6d8b8', boots: '#6b4423' },
    element: 'thunder'
  }
];

export const BRO_BY_ID = Object.fromEntries(BROS.map((b) => [b.id, b])) as Record<string, BroDef>;

export function initialBro(id: 'pip' | 'pop'): BroState {
  const base = id === 'pip' ? { hp: 42, power: 9, defense: 6, speed: 7 } : { hp: 38, power: 8, defense: 5, speed: 9 };
  return { id, level: 1, xp: 0, hp: base.hp, maxHp: base.hp, power: base.power, defense: base.defense, speed: base.speed, fainted: false };
}
