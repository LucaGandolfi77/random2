import type { BadgeDef } from '../game/types';

export const BADGES: BadgeDef[] = [
  { id: 'power_badge', name: 'POWER BADGE', description: '+3 power in battle.', cost: 12, effects: { power: 3 } },
  { id: 'guard_charm', name: 'GUARD CHARM', description: '+3 defence.', cost: 12, effects: { defense: 3 } },
  { id: 'speed_boots', name: 'SPEED BOOTS', description: '+3 speed and faster walking.', cost: 10, effects: { speed: 3 } },
  { id: 'lucky_coin', name: 'LUCKY COIN', description: '+1 coin from every battle.', cost: 15, effects: { loot: 1 } },
  { id: 'heal_ring', name: 'HEAL RING', description: '+10 maximum HP.', cost: 14, effects: { maxHp: 10 } },
  { id: 'timing_core', name: 'TIMING CORE', description: 'Wider timing window and stronger perfect hits.', cost: 18, effects: { timing: 0.09, perfect: 0.15 } }
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<string, BadgeDef>;
