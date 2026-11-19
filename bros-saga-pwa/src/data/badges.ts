import type { BadgeDef } from '../game/types';

export const BADGES: BadgeDef[] = [
  { id: 'power_badge', name: 'POWER BADGE', description: '+3 power in battle.', cost: 12, effects: { power: 3 } },
  { id: 'guard_charm', name: 'GUARD CHARM', description: '+3 defence.', cost: 12, effects: { defense: 3 } },
  { id: 'speed_boots', name: 'SPEED BOOTS', description: '+3 speed and faster walking.', cost: 10, effects: { speed: 3 } },
  { id: 'lucky_coin', name: 'LUCKY COIN', description: '+1 coin from every battle.', cost: 15, effects: { loot: 1 } },
  { id: 'heal_ring', name: 'HEAL RING', description: '+10 maximum HP.', cost: 14, effects: { maxHp: 10 } },
  { id: 'timing_core', name: 'TIMING CORE', description: 'Wider timing window and stronger perfect hits.', cost: 18, effects: { timing: 0.09, perfect: 0.15 } },
  { id: 'bros_heart', name: 'BROS. HEART', description: '+18 maximum HP.', cost: 22, effects: { maxHp: 18 } },
  { id: 'iron_guard', name: 'IRON GUARD', description: '+6 defence.', cost: 24, effects: { defense: 6 } },
  { id: 'wild_power', name: 'WILD POWER', description: '+6 power.', cost: 26, effects: { power: 6 } },
  { id: 'quickstep', name: 'QUICKSTEP', description: '+6 speed.', cost: 20, effects: { speed: 6 } },
  { id: 'golden_touch', name: 'GOLDEN TOUCH', description: '+3 coins from every battle.', cost: 28, effects: { loot: 3 } },
  { id: 'master_core', name: 'MASTER CORE', description: 'Widest timing and strongest perfect hits.', cost: 36, effects: { timing: 0.14, perfect: 0.3 } },
  { id: 'vital_charm', name: 'VITAL CHARM', description: '+12 HP and +2 defence.', cost: 30, effects: { maxHp: 12, defense: 2 } }
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<string, BadgeDef>;
