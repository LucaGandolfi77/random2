import type { BattleMove } from '../game/types';

export const MOVES: BattleMove[] = [
  { id: 'jump', name: 'JUMP', kind: 'jump', power: 9, description: 'Timed hop. Extra hit on a perfect press.' },
  { id: 'hammer', name: 'HAMMER', kind: 'hammer', power: 13, description: 'Timed swing. Heavy ground damage.' },
  { id: 'hand_fire', name: 'FIRE HAND', kind: 'hand', power: 15, owner: 'pip', description: 'Pip\'s flame. Strong against cold enemies.' },
  { id: 'hand_thunder', name: 'THUNDER HAND', kind: 'hand', power: 15, owner: 'pop', description: 'Pop\'s spark. Strong against flying enemies.' },
  { id: 'bros_blitz', name: 'BROTHER BLITZ', kind: 'bros', power: 28, bp: 3, description: 'Two-step combo. Press on both cues.' },
  { id: 'twin_cyclone', name: 'TWIN CYCLONE', kind: 'bros', power: 38, bp: 5, description: 'Spin together. Three timed cues.' },
  { id: 'star_combo', name: 'STAR COMBO', kind: 'bros', power: 52, bp: 8, description: 'The final Bros. Attack.' },
  { id: 'spin_jump', name: 'SPIN JUMP', kind: 'power', power: 18, bp: 3, unlockLevel: 5, description: 'A spinning leap that confuses the enemy.', status: 'stun' },
  { id: 'ultra_hammer', name: 'ULTRA HAMMER', kind: 'power', power: 24, bp: 2, unlockLevel: 2, description: 'Ground pound from above. Stuns the target.', status: 'stun' },
  { id: 'firestorm', name: 'FIRESTORM', kind: 'power', power: 26, bp: 3, unlockLevel: 3, owner: 'pip', description: 'A burning dash. Applies burn.', status: 'burn' },
  { id: 'thunderbolt', name: 'THUNDERBOLT', kind: 'power', power: 26, bp: 3, unlockLevel: 3, owner: 'pop', description: 'An electric dash. Applies shock.', status: 'shock' },
  { id: 'bro_shield', name: 'BROS. SHIELD', kind: 'power', power: 12, bp: 4, unlockLevel: 4, description: 'Counter stance. Breaks enemy defence.', status: 'defdown' }
];

export const MOVE_BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m])) as Record<string, BattleMove>;

export function unlockedBros(level: number): BattleMove[] {
  return MOVES.filter((m) => m.kind === 'bros' && (m.id === 'bros_blitz' || (m.id === 'twin_cyclone' && level >= 3) || (m.id === 'star_combo' && level >= 5)));
}

export function powerMovesForLevel(level: number): BattleMove[] {
  return MOVES.filter((m) => m.kind === 'power' && (m.unlockLevel ?? 99) <= level);
}
