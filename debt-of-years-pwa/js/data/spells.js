export const SPELLS = [
  {
    id: 'mend',
    name: 'Mend',
    cost: 1,
    kind: 'heal',
    power: 25,
    glyph: 'restore',
    desc: 'Restore 25 vitality. One year, taken from someone.'
  },
  {
    id: 'ember',
    name: 'Ember',
    cost: 2,
    kind: 'damage',
    power: 22,
    glyph: 'flame',
    desc: 'Deal 22 damage. Two years, taken from someone.'
  },
  {
    id: 'hush',
    name: 'Hush',
    cost: 3,
    kind: 'skip',
    power: 1,
    glyph: 'hush',
    desc: 'The enemy loses its next turn. Three years.'
  },
  {
    id: 'unmake',
    name: 'Unmake',
    cost: 5,
    kind: 'damage',
    power: 45,
    glyph: 'break',
    desc: 'Deal 45 damage. Five years. Someone will feel this.'
  }
];

export function spellById(id) {
  return SPELLS.find((s) => s.id === id) || null;
}
