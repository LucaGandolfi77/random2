import type { StatusDef } from '@/core/types';

export const statuses: StatusDef[] = [
  { id: 'burning', name: 'Burning', description: 'Takes 2 fire damage at the start of each turn.', icon: '🔥', damagePerTurn: 2, damageType: 'fire', duration: 3 },
  { id: 'chilled', name: 'Chilled', description: 'Movement reduced by 2. Water and ice freeze beneath your feet.', icon: '❄', speedMod: -2, duration: 2 },
  { id: 'shocked', name: 'Shocked', description: 'Takes 1 lightning damage. Attacks against this target gain +1.', icon: '⚡', damagePerTurn: 1, damageType: 'lightning', duration: 2 },
  { id: 'poisoned', name: 'Poisoned', description: 'Takes 2 poison damage at the start of each turn.', icon: '☠', damagePerTurn: 2, duration: 3 },
  { id: 'bleeding', name: 'Bleeding', description: 'Takes 1 physical damage at the start of each turn.', icon: '🩸', damagePerTurn: 1, damageType: 'physical', duration: 3 },
  { id: 'rooted', name: 'Rooted', description: 'Cannot move. Can still act.', icon: '🌿', speedMod: -99, duration: 2 },
  { id: 'stunned', name: 'Stunned', description: 'Skips their next turn.', icon: '✹', skipTurn: true, duration: 1 },
  { id: 'frightened', name: 'Frightened', description: 'Attack rolls take -2 and the unit avoids its attacker.', icon: '😨', attackMod: -2, duration: 2 },
  { id: 'blessed', name: 'Blessed', description: 'Attack rolls gain +2.', icon: '✧', attackMod: 2, beneficial: true, duration: 3 },
  { id: 'shielded', name: 'Shielded', description: 'AC gains +3.', icon: '🛡', acMod: 3, beneficial: true, duration: 3 },
  { id: 'marked', name: 'Marked', description: 'Takes an additional 1d6 damage from the hunter.', icon: '◎', duration: 3 },
  { id: 'hidden', name: 'Hidden', description: 'Cannot be targeted by ranged attacks. Next attack gains +3.', icon: '◐', beneficial: true, duration: 2 },
  { id: 'cursed', name: 'Cursed', description: 'AC takes -2.', icon: '☾', acMod: -2, duration: 3 },
  { id: 'weakened', name: 'Weakened', description: 'Damage dealt takes -2.', icon: '↓', duration: 2 },
  { id: 'hasted', name: 'Hasted', description: 'Movement increased by 2.', icon: '≫', speedMod: 2, beneficial: true, duration: 3 },
  { id: 'regenerating', name: 'Regenerating', description: 'Heals 3 health each turn.', icon: '♻', beneficial: true, duration: 3 },
  { id: 'downed', name: 'Downed', description: 'Requires revival magic or post-battle care.', icon: '✝', duration: 99 },
  { id: 'warded', name: 'Warded', description: 'Resists 3 damage from every hit.', icon: '◇', beneficial: true, duration: 3 },
  { id: 'disengaged', name: 'Disengaged', description: 'Your movement does not provoke opportunity attacks this turn.', icon: '➶', beneficial: true, duration: 1 },
  { id: 'enraged', name: 'Enraged', description: 'Deals +3 damage but takes +2 damage.', icon: '⚔', duration: 3 }
];

export const statusById = Object.fromEntries(statuses.map((s) => [s.id, s]));
