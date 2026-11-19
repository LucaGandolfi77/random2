import type { PowerDef } from '../game/types';

export const POWERS: PowerDef[] = [
  { id: 'double_jump', name: 'DOUBLE JUMP', description: 'Jump again in mid-air. Opens higher ledges.', unlockLevel: 1, bp: 0 },
  { id: 'ground_pound', name: 'GROUND POUND', description: 'Slash downward onto enemies and switches.', unlockLevel: 2, bp: 2, moveId: 'ultra_hammer' },
  { id: 'fire_dash', name: 'FIRE DASH', description: 'Pip dashes forward in flames.', unlockLevel: 3, bp: 3, moveId: 'firestorm' },
  { id: 'thunder_dash', name: 'THUNDER DASH', description: 'Pop dashes with a crack of thunder.', unlockLevel: 3, bp: 3, moveId: 'thunderbolt' },
  { id: 'bro_shield', name: 'BROS. SHIELD', description: 'Guard and counter the next attack.', unlockLevel: 4, bp: 4, moveId: 'bro_shield' },
  { id: 'hover_spin', name: 'HOVER SPIN', description: 'Hold the jump to glide across gaps.', unlockLevel: 5, bp: 3, moveId: 'spin_jump' }
];

export const POWER_BY_ID = Object.fromEntries(POWERS.map((p) => [p.id, p])) as Record<string, PowerDef>;

export function powersForLevel(level: number): string[] {
  return POWERS.filter((p) => level >= p.unlockLevel).map((p) => p.id);
}
