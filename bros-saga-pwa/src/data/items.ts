import type { ItemDef } from '../game/types';

export const ITEMS: ItemDef[] = [
  { id: 'mushroom', name: 'MUSHROOM', description: 'Restores 30 HP to one brother.', kind: 'heal', value: 30 },
  { id: 'pepper', name: 'SPICE PEPPER', description: 'Raises power for the rest of the battle.', kind: 'boost', value: 4 },
  { id: 'oneup', name: '1-UP CAP', description: 'Revives a fainted brother with half HP.', kind: 'revive', value: 50 }
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, ItemDef>;
