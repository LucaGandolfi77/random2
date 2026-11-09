import type { BackgroundDef, ClassDef } from '@/core/types';

export const classes: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    role: 'Vanguard · Soldier · Survivor',
    description:
      'You solve the problem in front of you with steel and certainty. A Warrior holds the line, punishes overreach, and turns a wounded party into a formation that refuses to break.',
    primary: 'str',
    secondary: 'con',
    hpBase: 14,
    hpPerLevel: 8,
    resourceName: 'Resolve',
    resourceBase: 4,
    savingThrows: ['str', 'con'],
    proficiencies: ['Athletics', 'Intimidation'],
    startingAbilities: ['cleave', 'shield_bash', 'rallying_cry'],
    armor: 'Mail and shield',
    weapon: 'Longswords, axes, warhammers',
    icon: '⚔'
  },
  {
    id: 'rogue',
    name: 'Rogue',
    role: 'Duelist · Infiltrator · Opportunist',
    description:
      'A blade is only as honest as the hand that hides it. Rogues win by choosing the moment, the angle, and the lie that makes the moment possible. In a fair fight, something has already gone wrong.',
    primary: 'dex',
    secondary: 'cha',
    hpBase: 10,
    hpPerLevel: 5,
    resourceName: 'Guile',
    resourceBase: 5,
    savingThrows: ['dex', 'cha'],
    proficiencies: ['Stealth', 'Sleight of Hand', 'Deception'],
    startingAbilities: ['backstab', 'smoke_veil', 'poisoned_blade'],
    armor: 'Light leathers',
    weapon: 'Daggers, rapiers, shortbows',
    icon: '🗡'
  },
  {
    id: 'mage',
    name: 'Mage',
    role: 'Artillery · Controller · Scholar',
    description:
      'The world is a text written in forces older than language. A Mage has learned to edit it. Fire, frost, lightning, and the colder mathematics of the mind are all instruments — and every instrument can break.',
    primary: 'int',
    secondary: 'wis',
    hpBase: 8,
    hpPerLevel: 4,
    resourceName: 'Arcana',
    resourceBase: 8,
    savingThrows: ['int', 'wis'],
    proficiencies: ['Arcana', 'Investigation'],
    startingAbilities: ['ember_lance', 'frost_nova', 'arcane_ward'],
    armor: 'Robes and wardings',
    weapon: 'Staves, wands, ritual blades',
    icon: '✦'
  },
  {
    id: 'cleric',
    name: 'Cleric',
    role: 'Healer · Anchor · Voice of the Covenant',
    description:
      'You were taught that the Covenant is mercy made law. Whether that is true or not, the sick still need healing, the frightened still need a voice, and the dead still need someone to close their eyes. Faith is a practice before it is a certainty.',
    primary: 'wis',
    secondary: 'con',
    hpBase: 12,
    hpPerLevel: 6,
    resourceName: 'Faith',
    resourceBase: 7,
    savingThrows: ['wis', 'cha'],
    proficiencies: ['Religion', 'Insight'],
    startingAbilities: ['mend_wounds', 'bless', 'sacred_flame'],
    armor: 'Mail and holy vestments',
    weapon: 'Maces, censers, covenant staves',
    icon: '✧'
  },
  {
    id: 'ranger',
    name: 'Ranger',
    role: 'Hunter · Scout · Warden of the Wild',
    description:
      'You read the land the way other people read faces. A broken branch is a sentence; silence is a warning; patience is a weapon. The wild does not belong to you. But it has learned your name.',
    primary: 'dex',
    secondary: 'wis',
    hpBase: 12,
    hpPerLevel: 6,
    resourceName: 'Instinct',
    resourceBase: 5,
    savingThrows: ['dex', 'wis'],
    proficiencies: ['Survival', 'Nature', 'Perception'],
    startingAbilities: ['hunters_mark', 'piercing_shot', 'ensnaring_roots'],
    armor: 'Layered hide',
    weapon: 'Longbows, spears, paired blades',
    icon: '➶'
  },
  {
    id: 'warlock',
    name: 'Warlock',
    role: 'Hexblade · Pact-Bound · Living Contradiction',
    description:
      'Something answered when you called. It might have been a god. It might have been the thing beneath the god. You do not know its name, and you have stopped asking. The power is real. The price is still being negotiated.',
    primary: 'cha',
    secondary: 'con',
    hpBase: 10,
    hpPerLevel: 5,
    resourceName: 'Pact',
    resourceBase: 6,
    savingThrows: ['cha', 'wis'],
    proficiencies: ['Deception', 'Arcana'],
    startingAbilities: ['grave_bolt', 'hex_of_ruin', 'shadow_chains'],
    armor: 'Bound leather',
    weapon: 'Pact blades, rods, forbidden relics',
    icon: '☽'
  }
];

export const classById = Object.fromEntries(classes.map((c) => [c.id, c]));

export const backgrounds: BackgroundDef[] = [
  {
    id: 'soldier',
    name: 'Soldier',
    description: 'You served in a border company until the border stopped existing.',
    proficiencies: ['Athletics', 'Intimidation'],
    bonus: '+2 maximum health, +10 starting gold'
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'You studied the Covenant in a library that no longer appears on any map.',
    proficiencies: ['Arcana', 'Investigation'],
    bonus: '+1 Arcana and Investigation, +1 scroll'
  },
  {
    id: 'outcast',
    name: 'Outcast',
    description: 'You survived by knowing which doors are watched and which windows are not.',
    proficiencies: ['Stealth', 'Sleight of Hand'],
    bonus: '+1 Stealth and lockpicking, +25 gold'
  },
  {
    id: 'pilgrim',
    name: 'Pilgrim',
    description: 'You walked the old roads and listened to the prayers of strangers.',
    proficiencies: ['Religion', 'Persuasion'],
    bonus: '+1 Religion and Persuasion, +1 healing potion'
  },
  {
    id: 'artisan',
    name: 'Artisan',
    description: 'You made useful things with your hands until the world stopped being useful.',
    proficiencies: ['Investigation', 'Survival'],
    bonus: '+1 equipment quality, +1 repair kit'
  }
];

export const backgroundById = Object.fromEntries(backgrounds.map((b) => [b.id, b]));
