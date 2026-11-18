export interface AIProfile {
  id: string;
  name: string;
  description: string;
  aggression: number;
  reaction: number;
  preferredRange: number;
  blockChance: number;
  dodgeChance: number;
  specialChance: number;
  assistChance: number;
  damageScale: number;
  defenseBonus: number;
  knockbackResist: number;
  speedScale: number;
  boss?: boolean;
}

/** Enemy archetypes used by arcade rivals and the story campaign. */
export const ENEMY_TYPES: AIProfile[] = [
  {
    id: 'grunt', name: 'GRUNT', description: 'Closes distance and throws a steady stream of light attacks.',
    aggression: 0.62, reaction: 0.30, preferredRange: 30, blockChance: 0.14, dodgeChance: 0.05,
    specialChance: 0.25, assistChance: 0.10, damageScale: 0.9, defenseBonus: 0, knockbackResist: 0, speedScale: 1
  },
  {
    id: 'brute', name: 'BRUTE', description: 'Slow, heavily armoured and almost impossible to knock back.',
    aggression: 0.5, reaction: 0.42, preferredRange: 34, blockChance: 0.28, dodgeChance: 0,
    specialChance: 0.18, assistChance: 0.08, damageScale: 1.18, defenseBonus: 3, knockbackResist: 0.6, speedScale: 0.78
  },
  {
    id: 'trickster', name: 'TRICKSTER', description: 'Keeps its distance, dodges and fires specials from range.',
    aggression: 0.55, reaction: 0.20, preferredRange: 78, blockChance: 0.16, dodgeChance: 0.28,
    specialChance: 0.65, assistChance: 0.18, damageScale: 0.85, defenseBonus: -1, knockbackResist: 0, speedScale: 1.15
  },
  {
    id: 'sentinel', name: 'SENTINEL', description: 'Patient defender. Blocks often and punishes careless attacks.',
    aggression: 0.42, reaction: 0.16, preferredRange: 52, blockChance: 0.48, dodgeChance: 0.1,
    specialChance: 0.4, assistChance: 0.14, damageScale: 1, defenseBonus: 2, knockbackResist: 0.25, speedScale: 0.95
  },
  {
    id: 'boss', name: 'BOSS', description: 'Two phases: at half health it becomes faster and hits far harder.',
    aggression: 0.78, reaction: 0.14, preferredRange: 38, blockChance: 0.34, dodgeChance: 0.16,
    specialChance: 0.6, assistChance: 0.3, damageScale: 1.15, defenseBonus: 2, knockbackResist: 0.4, speedScale: 1.05, boss: true
  }
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMY_TYPES.map((e) => [e.id, e])) as Record<string, AIProfile>;

export function enemyForStage(seed: number): AIProfile {
  if (seed === 7) return ENEMY_BY_ID.boss;
  return ENEMY_TYPES[seed % 4];
}
