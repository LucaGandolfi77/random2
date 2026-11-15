export { RESOURCE_KEYS } from './types';

import type {
  DecreeId,
  FacilityId,
  HeroClass,
  HeroId,
  ResourceKey,
  Resources,
  TechId,
  WorkerFacilityId,
} from './types';

export const GAME_VERSION = 1;
export const SAVE_KEY = 'whiteout-last-ember-save-v1';
export const SETTINGS_KEY = 'whiteout-last-ember-settings-v1';

export const DAY_REAL_SECONDS = 480;
export const MINUTES_PER_TICK = 3;
export const DAY_MINUTES = 1440;
export const WORK_START = 8 * 60;
export const EAT_START = 17 * 60;
export const SLEEP_START = 20 * 60;

export const WARNING_SECONDS = 30;
export const BLIZZARD_MIN_SECONDS = 50;
export const BLIZZARD_MAX_SECONDS = 75;
export const CALM_MIN_SECONDS = 150;
export const CALM_MAX_SECONDS = 240;
export const FIRST_CALM_SECONDS = 95;

export const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
export const OFFLINE_EFFICIENCY = 0.65;
export const MAX_FURNACE_LEVEL = 10;
export const MAX_FACILITY_LEVEL = 8;
export const MAX_HERO_LEVEL = 20;

export const MEAL_RAW_COST = 2;
export const BASE_MEALS_PER_SURVIVOR = 1;
export const HEARTY_MEALS_PER_SURVIVOR = 2;
export const MEAL_HUNGER_RELIEF = 56;
export const HEARTY_HUNGER_RELIEF = 70;

export const RESOURCE_META: Record<
  ResourceKey,
  { name: string; short: string; description: string }
> = {
  wood: { name: 'Wood', short: 'Wood', description: 'Frames, fuel and almost every upgrade.' },
  coal: { name: 'Coal', short: 'Coal', description: 'The furnace burns it every second.' },
  rawMeat: { name: 'Raw Meat', short: 'Raw', description: 'Hunted outside the palisade.' },
  meals: { name: 'Cooked Meals', short: 'Meals', description: 'One hot meal keeps a survivor going.' },
  iron: { name: 'Iron', short: 'Iron', description: 'Rare metal from expeditions and the iron seam.' },
};

export type FacilityIcon =
  | 'furnace'
  | 'lumber'
  | 'coal'
  | 'hunter'
  | 'cook'
  | 'shelter'
  | 'clinic'
  | 'iron';

export interface FacilityDefinition {
  id: FacilityId;
  name: string;
  shortName: string;
  icon: FacilityIcon;
  description: string;
  unlockFurnace: number;
  buildable: boolean;
  startsBuilt: boolean;
  maxLevel: number;
  indoor: boolean;
  workerFacility: boolean;
  buildCost?: Partial<Resources>;
  upgradeBase: Partial<Resources>;
  upgradeGrowth: number;
  productionResource?: ResourceKey;
  baseRatePerWorker?: number;
  notes: string;
}

export const FACILITY_ORDER: FacilityId[] = [
  'furnace',
  'lumberMill',
  'coalMine',
  'huntersHut',
  'cookhouse',
  'shelter',
  'clinic',
  'ironSeam',
];

export const FACILITIES: Record<FacilityId, FacilityDefinition> = {
  furnace: {
    id: 'furnace',
    name: 'Central Furnace',
    shortName: 'Furnace',
    icon: 'furnace',
    description:
      'The heart of the settlement. It eats coal, stores heat and holds back the whiteout.',
    unlockFurnace: 1,
    buildable: false,
    startsBuilt: true,
    maxLevel: MAX_FURNACE_LEVEL,
    indoor: true,
    workerFacility: false,
    upgradeBase: {},
    upgradeGrowth: 1,
    notes: 'Upgrade it to unlock facilities and raise heat capacity.',
  },
  lumberMill: {
    id: 'lumberMill',
    name: 'Lumber Mill',
    shortName: 'Lumber',
    icon: 'lumber',
    description:
      'Saws frozen timber into beams. It runs outside the palisade, so blizzards slow it down.',
    unlockFurnace: 1,
    buildable: true,
    startsBuilt: true,
    maxLevel: MAX_FACILITY_LEVEL,
    indoor: false,
    workerFacility: true,
    buildCost: { wood: 50, rawMeat: 10 },
    upgradeBase: { wood: 45, coal: 15 },
    upgradeGrowth: 1.62,
    productionResource: 'wood',
    baseRatePerWorker: 0.13,
    notes: 'Outdoor · 2 workers at level 1',
  },
  coalMine: {
    id: 'coalMine',
    name: 'Coal Mine',
    shortName: 'Coal',
    icon: 'coal',
    description:
      'A narrow shaft under the permafrost. Workers break black seams loose with hand tools.',
    unlockFurnace: 2,
    buildable: true,
    startsBuilt: false,
    maxLevel: MAX_FACILITY_LEVEL,
    indoor: false,
    workerFacility: true,
    buildCost: { wood: 80, rawMeat: 20 },
    upgradeBase: { wood: 80, coal: 30 },
    upgradeGrowth: 1.64,
    productionResource: 'coal',
    baseRatePerWorker: 0.075,
    notes: 'Outdoor · keeps the furnace alive',
  },
  huntersHut: {
    id: 'huntersHut',
    name: "Hunter's Hut",
    shortName: 'Hunter',
    icon: 'hunter',
    description:
      'A smoking hut at the tree line. Hunters bring back raw meat before the cold takes them.',
    unlockFurnace: 1,
    buildable: true,
    startsBuilt: true,
    maxLevel: MAX_FACILITY_LEVEL,
    indoor: false,
    workerFacility: true,
    buildCost: { wood: 40, coal: 10 },
    upgradeBase: { wood: 38, coal: 12 },
    upgradeGrowth: 1.58,
    productionResource: 'rawMeat',
    baseRatePerWorker: 0.095,
    notes: 'Outdoor · the only way to keep the cookhouse stocked',
  },
  cookhouse: {
    id: 'cookhouse',
    name: 'Cookhouse',
    shortName: 'Cook',
    icon: 'cook',
    description:
      'Turns raw meat into hot meals. Two cuts of meat become one meal for a hungry survivor.',
    unlockFurnace: 3,
    buildable: true,
    startsBuilt: false,
    maxLevel: MAX_FACILITY_LEVEL,
    indoor: true,
    workerFacility: true,
    buildCost: { wood: 100, coal: 45 },
    upgradeBase: { wood: 90, coal: 35 },
    upgradeGrowth: 1.61,
    productionResource: 'meals',
    baseRatePerWorker: 0.034,
    notes: 'Indoor · 2 raw meat → 1 cooked meal',
  },
  shelter: {
    id: 'shelter',
    name: 'Shelters',
    shortName: 'Shelter',
    icon: 'shelter',
    description:
      'Insulated sleeping cabins. Every upgrade adds beds and gives a warmer night to the people inside.',
    unlockFurnace: 1,
    buildable: true,
    startsBuilt: true,
    maxLevel: MAX_FACILITY_LEVEL,
    indoor: true,
    workerFacility: false,
    buildCost: { wood: 55, rawMeat: 10 },
    upgradeBase: { wood: 50, rawMeat: 18 },
    upgradeGrowth: 1.56,
    notes: 'Capacity and night warmth',
  },
  clinic: {
    id: 'clinic',
    name: 'Clinic',
    shortName: 'Clinic',
    icon: 'clinic',
    description:
      'Herbal poultices, clean bandages and the only warm bed for the sick. Staff it to treat frostbite and fever.',
    unlockFurnace: 4,
    buildable: true,
    startsBuilt: false,
    maxLevel: MAX_FACILITY_LEVEL,
    indoor: true,
    workerFacility: true,
    buildCost: { wood: 140, coal: 60, rawMeat: 30 },
    upgradeBase: { wood: 130, coal: 55, rawMeat: 20 },
    upgradeGrowth: 1.64,
    notes: 'Indoor · heals sick survivors while staffed',
  },
  ironSeam: {
    id: 'ironSeam',
    name: 'Iron Seam',
    shortName: 'Iron',
    icon: 'iron',
    description:
      'A wind-scoured outcrop of dark ore. Digging it is miserable work, but furnaces are built on iron.',
    unlockFurnace: 5,
    buildable: true,
    startsBuilt: false,
    maxLevel: MAX_FACILITY_LEVEL,
    indoor: false,
    workerFacility: true,
    buildCost: { wood: 180, coal: 100, iron: 2 },
    upgradeBase: { wood: 160, coal: 80, iron: 5 },
    upgradeGrowth: 1.62,
    productionResource: 'iron',
    baseRatePerWorker: 0.027,
    notes: 'Outdoor · the patient way to gather iron',
  },
};

export const WORKER_FACILITIES: WorkerFacilityId[] = [
  'lumberMill',
  'coalMine',
  'huntersHut',
  'cookhouse',
  'clinic',
  'ironSeam',
];

export interface FurnaceUpgrade {
  level: number;
  cost: Resources;
  heatCapacity: number;
  heatRise: number;
  coalPerSecond: number;
}

const FURNACE_COSTS: Array<Partial<Resources>> = [
  {},
  { wood: 70, rawMeat: 20 },
  { wood: 140, coal: 60, rawMeat: 30 },
  { wood: 260, coal: 150, rawMeat: 60, iron: 2 },
  { wood: 440, coal: 280, rawMeat: 100, iron: 8 },
  { wood: 700, coal: 450, iron: 18 },
  { wood: 1100, coal: 700, iron: 35 },
  { wood: 1650, coal: 1050, iron: 60 },
  { wood: 2400, coal: 1600, iron: 95 },
  { wood: 3400, coal: 2400, iron: 145 },
];

export const FURNACE_LEVELS: FurnaceUpgrade[] = Array.from(
  { length: MAX_FURNACE_LEVEL + 1 },
  (_, level) => ({
    level,
    cost: fullResources(FURNACE_COSTS[level] ?? {}),
    heatCapacity: 100 + (level - 1) * 22,
    heatRise: 1.8 + level * 0.12,
    coalPerSecond: 0.06 + level * 0.004,
  }),
);

export const FURNACE_UNLOCKS: Record<number, FacilityId[]> = {
  1: ['furnace', 'lumberMill', 'huntersHut', 'shelter'],
  2: ['coalMine'],
  3: ['cookhouse'],
  4: ['clinic'],
  5: ['ironSeam'],
};

export const OVERDRIVE_COAL_MULTIPLIER = 2;
export const OVERDRIVE_HEAT_MULTIPLIER = 1.85;
export const OVERDRIVE_TEMP_MULTIPLIER = 1.35;
export const INSULATION_HEAT_SAVE = 0.25;
export const INSULATION_TEMP_BONUS = 2;

export interface DecreeDefinition {
  id: DecreeId;
  name: string;
  subtitle: string;
  description: string;
  production: number;
  happinessTarget: number;
  mealMultiplier: number;
  hungerDrain: number;
}

export const DECREES: Record<DecreeId, DecreeDefinition> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced Rule',
    subtitle: 'No extremes',
    description: 'No production bonus, no penalty. The settlement simply endures.',
    production: 1,
    happinessTarget: 0,
    mealMultiplier: BASE_MEALS_PER_SURVIVOR,
    hungerDrain: 1,
  },
  extended_shifts: {
    id: 'extended_shifts',
    name: 'Extended Shifts',
    subtitle: 'More wood, less rest',
    description: '+20% production. Happiness falls and workers get hungry faster.',
    production: 1.2,
    happinessTarget: -18,
    mealMultiplier: BASE_MEALS_PER_SURVIVOR,
    hungerDrain: 1.25,
  },
  hearty_meals: {
    id: 'hearty_meals',
    name: 'Hearty Meals',
    subtitle: 'Full plates, full hearts',
    description: '+15 happiness, but every survivor eats two meals a day.',
    production: 1,
    happinessTarget: 15,
    mealMultiplier: HEARTY_MEALS_PER_SURVIVOR,
    hungerDrain: 1,
  },
};

export interface TechDefinition {
  id: TechId;
  name: string;
  description: string;
  cost: Resources;
  requires: TechId[];
  furnaceLevel: number;
  tier: number;
  effect: string;
}

export const TECHS: TechDefinition[] = [
  {
    id: 'insulation',
    name: 'Furred Walls',
    description: 'Packed moss and hide linings hold heat inside the settlement.',
    cost: fullResources({ wood: 90, rawMeat: 25 }),
    requires: [],
    furnaceLevel: 1,
    tier: 0,
    effect: '-25% heat loss, +2°C indoor',
  },
  {
    id: 'saw_blades',
    name: 'Hardened Saw Blades',
    description: 'Sharper teeth bite frozen timber without splitting it.',
    cost: fullResources({ wood: 70, coal: 30 }),
    requires: [],
    furnaceLevel: 1,
    tier: 0,
    effect: '+25% wood production',
  },
  {
    id: 'efficient_burn',
    name: 'Efficient Combustion',
    description: 'A tighter firebox extracts more warmth from every lump of coal.',
    cost: fullResources({ wood: 140, coal: 100, iron: 3 }),
    requires: ['insulation'],
    furnaceLevel: 2,
    tier: 1,
    effect: '-20% furnace coal use',
  },
  {
    id: 'deep_shafts',
    name: 'Deep Shafts',
    description: 'Braced tunnels reach the richer seams below the frost line.',
    cost: fullResources({ wood: 170, coal: 90 }),
    requires: ['saw_blades'],
    furnaceLevel: 3,
    tier: 1,
    effect: '+25% coal production',
  },
  {
    id: 'trapping',
    name: 'Snare Lines',
    description: 'A web of quiet snares catches more than a spear ever could.',
    cost: fullResources({ wood: 120, rawMeat: 40 }),
    requires: ['saw_blades'],
    furnaceLevel: 2,
    tier: 1,
    effect: '+25% raw meat production',
  },
  {
    id: 'field_medicine',
    name: 'Field Medicine',
    description: 'Clean snow, boiled cloth and bitter herbs. The clinic saves more lives.',
    cost: fullResources({ wood: 180, coal: 80, iron: 5 }),
    requires: ['trapping'],
    furnaceLevel: 4,
    tier: 2,
    effect: '+50% clinic healing',
  },
  {
    id: 'stew_pot',
    name: 'Four-Hour Stew',
    description: 'Bones and roots stretch every cut of meat into more hot meals.',
    cost: fullResources({ wood: 170, rawMeat: 80, meals: 30 }),
    requires: ['trapping'],
    furnaceLevel: 4,
    tier: 2,
    effect: '+30% cookhouse yield',
  },
  {
    id: 'expedition_gear',
    name: 'Expedition Gear',
    description: 'Waxed boots, iron-tipped spears and a map that does not freeze.',
    cost: fullResources({ wood: 210, coal: 120, meals: 25, iron: 8 }),
    requires: ['deep_shafts'],
    furnaceLevel: 5,
    tier: 2,
    effect: '+15% hero health and damage',
  },
];

export const TECH_BY_ID: Record<TechId, TechDefinition> = Object.fromEntries(
  TECHS.map((tech) => [tech.id, tech]),
) as Record<TechId, TechDefinition>;

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  heroClass: HeroClass;
  description: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  interval: number;
  recruitCost: Partial<Resources>;
  skill: string;
}

export const HERO_ORDER: HeroId[] = ['bryn', 'ada', 'mira'];

export const HEROES: Record<HeroId, HeroDefinition> = {
  bryn: {
    id: 'bryn',
    name: 'Bryn Holt',
    title: 'Furnace Warden',
    heroClass: 'tank',
    description:
      'A broad-shouldered stoker who once held a burning door shut with his back. He puts himself between the party and the frost.',
    baseHp: 190,
    baseAttack: 15,
    baseDefense: 12,
    interval: 2.0,
    recruitCost: {},
    skill: 'Every third action: shields himself and taunts beasts for 3 seconds.',
  },
  ada: {
    id: 'ada',
    name: 'Ada Voss',
    title: 'Rime Shot',
    heroClass: 'marksman',
    description:
      'A trapper with a bone-tipped bow and an unhurried eye. She aims for the wound the cold has already opened.',
    baseHp: 108,
    baseAttack: 27,
    baseDefense: 4,
    interval: 1.3,
    recruitCost: { wood: 80, meals: 12 },
    skill: 'Every third action: a focused shot for 80% extra damage.',
  },
  mira: {
    id: 'mira',
    name: 'Mira Sol',
    title: 'Hearthkeeper',
    heroClass: 'support',
    description:
      'The clinic apprentice who carries the last jar of willow bark. Her hands are steadier than the storm outside.',
    baseHp: 124,
    baseAttack: 14,
    baseDefense: 6,
    interval: 1.65,
    recruitCost: { meals: 24, iron: 2 },
    skill: 'Every second action: heals the most wounded ally.',
  },
};

export interface StageDefinition {
  stage: number;
  name: string;
  region: string;
  description: string;
  enemyNames: string[];
  boss: boolean;
}

export const STAGES: StageDefinition[] = [
  {
    stage: 1,
    name: 'The Whistling Pines',
    region: 'Tree line',
    description: 'A single frost whelp circles the woodcutters. Easy prey for a steady spear.',
    enemyNames: ['Frost Whelp'],
    boss: false,
  },
  {
    stage: 2,
    name: 'Cracked Creek',
    region: 'Frozen ford',
    description: 'Something has been dragging antlers across the ice.',
    enemyNames: ['Ice Stalker'],
    boss: false,
  },
  {
    stage: 3,
    name: 'The Hollow Den',
    region: 'Bone valley',
    description: 'A rime golem guards a cave full of old expedition packs.',
    enemyNames: ['Rime Goblin', 'Rime Golem'],
    boss: true,
  },
  {
    stage: 4,
    name: 'Whitefang Ridge',
    region: 'High ridge',
    description: 'The wind strips the drifts to blue ice. The pack knows this ground.',
    enemyNames: ['Whitefang', 'Whitefang Yearling'],
    boss: false,
  },
  {
    stage: 5,
    name: 'Lantern Graveyard',
    region: 'Lost caravan',
    description: 'Bells hang frozen over a caravan that never returned to the fires.',
    enemyNames: ['Frozen Raider', 'Hollow Dog', 'Hoarfrost Wisp'],
    boss: false,
  },
  {
    stage: 6,
    name: 'The Glass Lake',
    region: 'Blue basin',
    description: 'A warden of clear ice rises through the crust.',
    enemyNames: ['Glass Sentinel', 'Ice Warden', 'Splinter Hound'],
    boss: true,
  },
  {
    stage: 7,
    name: 'Mourning Pass',
    region: 'Mountain pass',
    description: 'The beasts here mimic human cries. Do not answer them.',
    enemyNames: ['Weeping Stalker', 'Rime Goblin', 'Snow Howler'],
    boss: false,
  },
  {
    stage: 8,
    name: 'The Last Cairn',
    region: 'Old border',
    description: 'A cairn marks the edge of every map the settlement owns. Beyond it is white.',
    enemyNames: ['Cairn Shade', 'Frost Whelp', 'Frozen Raider'],
    boss: false,
  },
  {
    stage: 9,
    name: 'Howling Shelf',
    region: 'North shelf',
    description: 'The storm has teeth here, and something older walks inside it.',
    enemyNames: ['Blizzard Wraith', 'Ice Stalker', 'Whitefang Alpha'],
    boss: true,
  },
  {
    stage: 10,
    name: 'The White Throat',
    region: 'Whiteout core',
    description: 'The source of the endless winter. Bring everyone home.',
    enemyNames: ['Winter Colossus', 'Blizzard Wraith', 'Glass Sentinel'],
    boss: true,
  },
];

export function stageById(stage: number): StageDefinition {
  return STAGES[Math.min(STAGES.length, Math.max(1, Math.round(stage))) - 1];
}

export function enemyStatsFor(stage: number, index: number) {
  const boss = stageById(stage).boss && index === 0;
  const step = stage - 1;
  const hpScale = Math.pow(1.42, step);
  const attackScale = Math.pow(1.28, step);
  const defenseScale = Math.pow(1.2, step);
  const name = stageById(stage).enemyNames[index] ?? 'Frost Beast';
  return {
    name: boss ? `${name} · Warden` : name,
    hp: Math.round((125 + index * 25) * hpScale * (boss ? 1.55 : 1)),
    attack: Math.round((11 + index * 2) * attackScale * (boss ? 1.2 : 1)),
    defense: Math.round((2 + index) * defenseScale * (boss ? 1.2 : 1)),
    interval: boss ? 2.1 : 2.2 - Math.min(0.45, index * 0.12),
    boss,
  };
}

export function stageEnemyCount(stage: number): number {
  if (stage <= 2) return 1;
  if (stage <= 5) return 2;
  return 3;
}

export function stageReward(stage: number): Resources {
  return fullResources({
    wood: Math.round(18 * Math.pow(1.32, stage - 1)),
    coal: Math.round(12 * Math.pow(1.3, stage - 1)),
    rawMeat: Math.round(8 * Math.pow(1.28, stage - 1)),
    iron: 1 + Math.floor((stage - 1) / 2),
  });
}

export function firstClearReward(stage: number): Resources {
  return fullResources({
    meals: 5 + stage * 2,
    iron: 2 + stage * 2,
  });
}

export function stageXp(stage: number): number {
  return 16 + stage * 7;
}

export function heroXpToNext(level: number): number {
  return 36 + level * 24;
}

export function emptyResources(): Resources {
  return { wood: 0, coal: 0, rawMeat: 0, meals: 0, iron: 0 };
}

export function fullResources(partial: Partial<Resources>): Resources {
  return { ...emptyResources(), ...partial };
}

export const RESOURCE_SHORT: Record<ResourceKey, string> = {
  wood: 'W',
  coal: 'C',
  rawMeat: 'M',
  meals: 'Meal',
  iron: 'Fe',
};

export const NAMES: string[] = [
  'Mara',
  'Tomas',
  'Iva',
  'Oskar',
  'Lena',
  'Sten',
  'Anja',
  'Rurik',
  'Edda',
  'Halvar',
  'Nadia',
  'Pavel',
  'Ilse',
  'Kasper',
  'Yara',
  'Milo',
  'Freja',
  'Ansel',
];
