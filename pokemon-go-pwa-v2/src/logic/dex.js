/* Dex presentation helpers. Pure, no DOM, no config import. */

const SPECIAL_NAMES = {
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  'mr-mime': 'Mr. Mime',
  'mr-rime': 'Mr. Rime',
  'mime-jr': 'Mime Jr.',
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'type-null': 'Type: Null',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  flabebe: 'Flabébé',
  'wo-chien': 'Wo-Chien',
  'chien-pao': 'Chien-Pao',
  'ting-lu': 'Ting-Lu',
  'chi-yu': 'Chi-Yu',
  'great-tusk': 'Great Tusk',
  'scream-tail': 'Scream Tail',
  'brute-bonnet': 'Brute Bonnet',
  'flutter-mane': 'Flutter Mane',
  'slither-wing': 'Slither Wing',
  'sandy-shocks': 'Sandy Shocks',
  'iron-treads': 'Iron Treads',
  'iron-bundle': 'Iron Bundle',
  'iron-hands': 'Iron Hands',
  'iron-jugulis': 'Iron Jugulis',
  'iron-moth': 'Iron Moth',
  'iron-thorns': 'Iron Thorns',
  'roaring-moon': 'Roaring Moon',
  'iron-valiant': 'Iron Valiant',
  'walking-wake': 'Walking Wake',
  'iron-leaves': 'Iron Leaves',
  'gouging-fire': 'Gouging Fire',
  'raging-bolt': 'Raging Bolt',
  'iron-boulder': 'Iron Boulder',
  'iron-crown': 'Iron Crown',
};

export function prettyName(slug) {
  if (!slug) return '???';
  if (SPECIAL_NAMES[slug]) return SPECIAL_NAMES[slug];
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const TYPE_LABELS = {
  normal: { en: 'Normal', it: 'Normale' },
  fire: { en: 'Fire', it: 'Fuoco' },
  water: { en: 'Water', it: 'Acqua' },
  electric: { en: 'Electric', it: 'Elettro' },
  grass: { en: 'Grass', it: 'Erba' },
  ice: { en: 'Ice', it: 'Ghiaccio' },
  fighting: { en: 'Fighting', it: 'Lotta' },
  poison: { en: 'Poison', it: 'Veleno' },
  ground: { en: 'Ground', it: 'Terra' },
  flying: { en: 'Flying', it: 'Volante' },
  psychic: { en: 'Psychic', it: 'Psico' },
  bug: { en: 'Bug', it: 'Coleottero' },
  rock: { en: 'Rock', it: 'Roccia' },
  ghost: { en: 'Ghost', it: 'Spettro' },
  dragon: { en: 'Dragon', it: 'Drago' },
  dark: { en: 'Dark', it: 'Buio' },
  steel: { en: 'Steel', it: 'Acciaio' },
  fairy: { en: 'Fairy', it: 'Folletto' },
};

export function typeLabel(type, lang = 'en') {
  return TYPE_LABELS[type] ? TYPE_LABELS[type][lang] || TYPE_LABELS[type].en : type;
}

export function typeDescription(types = [], lang = 'en') {
  const label = typeLabel(types[0] || 'normal', lang);
  return lang === 'it'
    ? `Un misterioso Pokémon di tipo ${label}.`
    : `A mysterious ${label}-type Pokémon.`;
}

const PRIMARY_ARCHETYPE = {
  normal: 'quadruped',
  fire: 'quadruped',
  water: 'fish',
  electric: 'biped',
  grass: 'blob',
  ice: 'blob',
  fighting: 'biped',
  poison: 'blob',
  ground: 'quadruped',
  flying: 'bird',
  psychic: 'blob',
  bug: 'insect',
  rock: 'quadruped',
  ghost: 'blob',
  dragon: 'serpent',
  dark: 'quadruped',
  steel: 'blob',
  fairy: 'blob',
};

export function archetypeForTypes(types = []) {
  return PRIMARY_ARCHETYPE[types[0]] || 'blob';
}
