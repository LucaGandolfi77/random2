import { BOSS_EVERY, OATHS, WIND, windMaxFor } from './config.js';

export const ENEMIES = {
  slime: {
    id: 'slime',
    name: 'Slime',
    hp: 1,
    speedMin: 0.045,
    speedMax: 0.064,
    radius: 14,
    damage: 1,
    points: 12,
    wobble: 0.05
  },
  bat: {
    id: 'bat',
    name: 'Night Bat',
    hp: 1,
    speedMin: 0.062,
    speedMax: 0.086,
    radius: 12,
    damage: 1,
    points: 18,
    drift: 0.12
  },
  runner: {
    id: 'runner',
    name: 'Cinder Imp',
    hp: 1,
    speedMin: 0.076,
    speedMax: 0.1,
    radius: 11,
    damage: 1,
    points: 24,
    zigzag: 0.13
  },
  brute: {
    id: 'brute',
    name: 'Stone Brute',
    hp: 3,
    speedMin: 0.032,
    speedMax: 0.045,
    radius: 22,
    damage: 2,
    points: 48,
    wobble: 0.025
  }
};

export const BOSS_NAMES = [
  'Ogre Warlord',
  'Iron Tusker',
  'The Grave Marshal',
  'Ash-Horned Tyrant'
];

export const PICKUPS = {
  multishot: {
    id: 'multishot',
    name: 'Triple Nock',
    glyph: 'x3',
    desc: 'Three arrows per shot for 10 seconds.',
    color: '#ffcf6e'
  },
  piercing: {
    id: 'piercing',
    name: 'Bodkin Oil',
    glyph: '>>',
    desc: 'Arrows pierce every target for 10 seconds.',
    color: '#ff8f6e'
  },
  slow: {
    id: 'slow',
    name: 'Frost Wind',
    glyph: '~',
    desc: 'The horde crawls for 6 seconds.',
    color: '#8ee8ff'
  },
  repair: {
    id: 'repair',
    name: 'Royal Mending',
    glyph: '+',
    desc: 'Restore one heart.',
    color: '#8ee89a'
  }
};

export const PICKUP_ORDER = ['multishot', 'piercing', 'slow', 'repair'];

export const UPGRADES = [
  {
    id: 'broadhead',
    name: 'Broadhead',
    glyph: 'DMG',
    max: 3,
    desc: ['+1 arrow damage.', '+2 arrow damage.', '+3 arrow damage.'],
    tag: 'Damage'
  },
  {
    id: 'quickdraw',
    name: 'Quickdraw',
    glyph: 'RATE',
    max: 3,
    desc: ['Draw 18% faster.', 'Draw 33% faster.', 'Draw 45% faster.'],
    tag: 'Speed'
  },
  {
    id: 'twinshot',
    name: 'Twin Shot',
    glyph: 'x2',
    max: 2,
    desc: ['Loose two arrows at once.', 'Loose three arrows at once.'],
    tag: 'Volley'
  },
  {
    id: 'bodkin',
    name: 'Bodkin Point',
    glyph: 'PIERCE',
    max: 1,
    desc: ['Arrows pierce every enemy they hit.'],
    tag: 'Pierce'
  },
  {
    id: 'wallwright',
    name: 'Wallwright',
    glyph: 'WALL',
    max: 2,
    desc: ['Repair 1 heart after each wave.', 'Repair 2 hearts after each wave.'],
    tag: 'Repair'
  },
  {
    id: 'windreader',
    name: 'Windreader',
    glyph: 'WIND',
    max: 2,
    desc: ['Halve the wind’s push.', 'Ignore the wind completely.'],
    tag: 'Precision'
  },
  {
    id: 'battletrance',
    name: 'Battle Trance',
    glyph: 'COMBO',
    max: 2,
    desc: ['Longer combo window, cap x10.', 'Longer combo window, cap x12.'],
    tag: 'Combo'
  },
  {
    id: 'volley',
    name: 'Royal Volley',
    glyph: 'Q',
    max: 3,
    desc: ['Unlock the Royal Volley. Recharge 19s.', 'Volley fires 4 arrows. 16s recharge.', 'Volley fires 5 arrows. 12s recharge.'],
    tag: 'Ability'
  },
  {
    id: 'executioner',
    name: 'Executioner',
    glyph: 'x1.5',
    max: 2,
    desc: ['+50% damage to brutes and warlords.', '+100% damage to brutes and warlords.'],
    tag: 'Damage'
  },
  {
    id: 'luckycharm',
    name: 'Lucky Charm',
    glyph: 'LUCK',
    max: 3,
    desc: ['More pickups from kills.', 'Even more pickups.', 'Pickups rain from the horde.'],
    tag: 'Fortune'
  },
  {
    id: 'sureshot',
    name: 'Sure Shot',
    glyph: 'EYE',
    max: 2,
    desc: ['Much larger bullseye window.', 'Enormous bullseye window.'],
    tag: 'Precision'
  },
  {
    id: 'guardian',
    name: 'Wall Guard',
    glyph: 'GUARD',
    max: 2,
    desc: ['The wall blocks the first hit each wave.', 'The wall blocks two hits each wave.'],
    tag: 'Defense'
  },
  {
    id: 'bounty',
    name: 'Royal Bounty',
    glyph: 'GOLD',
    max: 99,
    desc: ['+250 score. Always useful.'],
    tag: 'Score'
  }
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const ACHIEVEMENTS = [
  {
    id: 'first_stand',
    name: 'First Stand',
    desc: 'Finish a run at the wall.'
  },
  {
    id: 'wave5',
    name: 'Wall Walker',
    desc: 'Reach wave 5.'
  },
  {
    id: 'boss1',
    name: 'Giant Fall',
    desc: 'Fell your first Ogre Warlord.'
  },
  {
    id: 'bullseye25',
    name: 'Needle Eye',
    desc: 'Land 25 bullseyes across all runs.'
  },
  {
    id: 'combo8',
    name: 'Unbroken',
    desc: 'Reach an x8 combo.'
  },
  {
    id: 'daily3',
    name: 'Loyal Sentinel',
    desc: 'Play the Daily Siege three days in a row.'
  },
  {
    id: 'flawless',
    name: 'Untouched',
    desc: 'Clear a wave without losing a heart.'
  },
  {
    id: 'wave10',
    name: 'Last Light',
    desc: 'Reach wave 10.'
  }
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((achievement) => [achievement.id, achievement])
);

export const TAUNTS = {
  start: [
    'The horde is at the gate. Make every arrow count.',
    'One bow. One wall. The whole realm is watching.',
    'They came for the crown. Give them a volley.'
  ],
  combo: [
    'The bards are already writing this one.',
    'Keep the rhythm. The wall is singing.',
    'That is how a king shoots.'
  ],
  boss: [
    'Something enormous is coming through the dark.',
    'The ground is shaking. Draw deeper.',
    'A warlord. Aim for the eye.'
  ],
  lowHp: [
    'The wall is cracking. Hold the line.',
    'One more hit and the gate falls.',
    'Breathe. Aim. Loose.'
  ],
  gameOver: [
    'The wall fell, but the legend remains.',
    'The realm will remember your last arrow.',
    'They broke the gate. They did not break your aim.'
  ]
};

export const WAVE_SUBTITLES = [
  'A shadow stirs beyond the wall.',
  'The night grows teeth.',
  'They are learning the way.',
  'The ground answers their march.',
  'Something older is waking.'
];

export function isBossWave(wave) {
  return wave > 0 && wave % BOSS_EVERY === 0;
}

export function bossName(wave) {
  const index = Math.max(0, Math.floor(wave / BOSS_EVERY) - 1);
  return BOSS_NAMES[index % BOSS_NAMES.length];
}

export function bossHp(wave, oath = 'knight') {
  const base = 10 + wave * 2 + Math.floor(wave / BOSS_EVERY) * 2;
  return Math.max(8, Math.round(base * (OATHS[oath]?.bossHp ?? 1)));
}

export function enemyTypesFor(wave) {
  const types = [{ id: 'slime', weight: 6 }];
  if (wave >= 2) types.push({ id: 'bat', weight: 2.5 + wave * 0.2 });
  if (wave >= 3) types.push({ id: 'runner', weight: 1.8 + wave * 0.18 });
  if (wave >= 3) types.push({ id: 'brute', weight: 1 + wave * 0.1 });
  return types;
}

export function enemyTypeFor(rng, wave) {
  const types = enemyTypesFor(wave);
  const total = types.reduce((sum, type) => sum + type.weight, 0);
  let roll = rng.next() * total;
  for (const type of types) {
    roll -= type.weight;
    if (roll <= 0) return type.id;
  }
  return 'slime';
}

export function waveComposition(rng, wave) {
  const boss = isBossWave(wave);
  const total = Math.round(5 + wave * 1.7);
  const minions = boss ? Math.max(5, Math.round(total * 0.7)) : total;
  const types = [];
  if (boss) types.push('boss');
  for (let i = 0; i < minions; i++) types.push(enemyTypeFor(rng, wave));
  return {
    wave,
    boss,
    types,
    count: types.length,
    wind: rollWind(rng, wave)
  };
}

export function rollWind(rng, wave) {
  const max = windMaxFor(wave);
  if (max <= 0 || rng.chance(0.12)) return 0;
  const strength = rng.float(0.35, 1) * max;
  return (rng.chance(0.5) ? -1 : 1) * strength;
}

export function windLabel(wind) {
  if (Math.abs(wind) < WIND.baseMax * 0.18) return 'CALM';
  return `${wind < 0 ? '←' : '→'} ${Math.round(Math.abs(wind))}`;
}

export function draftChoices(rng, levels, count = 3) {
  const available = UPGRADES.filter((upgrade) => (levels[upgrade.id] || 0) < upgrade.max);
  return rng.shuffle(available).slice(0, count);
}

export function unlockLabel(achievement) {
  return `Achievement unlocked: ${achievement.name}`;
}
