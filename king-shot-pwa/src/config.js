export const VERSION = '4.0.0';
export const STORE_KEY = 'king-shot-pwa';

export const PALETTES = {
  royal: {
    sky0: '#070b1d',
    sky1: '#1a1f4a',
    sky2: '#4a2d5f',
    moon: '#ffe9b0',
    moonGlow: 'rgba(255,233,176,.16)',
    mountainFar: '#171a3a',
    mountainNear: '#0e1029',
    tower: '#2b2850',
    ground: '#090b18',
    stone: '#292b4a',
    stoneLight: '#4c4d78',
    stoneDark: '#131424',
    shot: '#ffd36e',
    trail: 'rgba(255,211,110,.32)',
    enemy: '#7ee08a',
    enemyDark: '#2e8a52',
    boss: '#e09a62',
    bossDark: '#7e422e',
    runner: '#ff806c',
    runnerDark: '#9d3e37',
    boulder: '#77759a',
    boulderDark: '#3d3b57',
    text: '#f7f2e2',
    muted: '#b9b4c9',
    accent: '#ffcf6e',
    danger: '#ff6f61',
    hp: '#7ee08a',
    wall: '#c9b98e',
    stars: '#fff6d8',
    pickup: '#9fe8ff'
  },
  neon: {
    sky0: '#09001a',
    sky1: '#32104f',
    sky2: '#8a2b66',
    moon: '#ffd6fb',
    moonGlow: 'rgba(255,120,230,.2)',
    mountainFar: '#2a1447',
    mountainNear: '#170b2c',
    tower: '#4a2163',
    ground: '#0b0318',
    stone: '#382150',
    stoneLight: '#7b4b96',
    stoneDark: '#1b0d2c',
    shot: '#6ff7ff',
    trail: 'rgba(111,247,255,.35)',
    enemy: '#b6ff5c',
    enemyDark: '#5b9d21',
    boss: '#ff8a5c',
    bossDark: '#8f2f40',
    runner: '#ff4fa3',
    runnerDark: '#8d1e5d',
    boulder: '#8a6fa8',
    boulderDark: '#412f5d',
    text: '#fff4ff',
    muted: '#c7aed6',
    accent: '#6ff7ff',
    danger: '#ff4fa3',
    hp: '#b6ff5c',
    wall: '#ffb86e',
    stars: '#ffe9ff',
    pickup: '#6ff7ff'
  },
  forest: {
    sky0: '#061611',
    sky1: '#123d33',
    sky2: '#3d6b46',
    moon: '#fff0b5',
    moonGlow: 'rgba(255,240,181,.15)',
    mountainFar: '#183629',
    mountainNear: '#0c241c',
    tower: '#24483a',
    ground: '#07130f',
    stone: '#294438',
    stoneLight: '#52765d',
    stoneDark: '#12241c',
    shot: '#ffe38a',
    trail: 'rgba(255,227,138,.3)',
    enemy: '#b8e986',
    enemyDark: '#5f8f42',
    boss: '#d99a67',
    bossDark: '#74452d',
    runner: '#ee8a64',
    runnerDark: '#91442e',
    boulder: '#6f8171',
    boulderDark: '#36463b',
    text: '#f5f1dc',
    muted: '#b3c1ab',
    accent: '#ffe38a',
    danger: '#ee8a64',
    hp: '#b8e986',
    wall: '#d8c89b',
    stars: '#fff8d9',
    pickup: '#9be8d0'
  },
  ocean: {
    sky0: '#041221',
    sky1: '#0a2b4a',
    sky2: '#125d73',
    moon: '#e7fbff',
    moonGlow: 'rgba(180,240,255,.17)',
    mountainFar: '#0d2c42',
    mountainNear: '#071b2c',
    tower: '#163e52',
    ground: '#03101b',
    stone: '#1d3d4f',
    stoneLight: '#3e7183',
    stoneDark: '#0a1d2b',
    shot: '#ffe28b',
    trail: 'rgba(255,226,139,.3)',
    enemy: '#8ef0c6',
    enemyDark: '#2d8c72',
    boss: '#f0a27a',
    bossDark: '#7d4a3a',
    runner: '#ff9b78',
    runnerDark: '#974d3d',
    boulder: '#6b8798',
    boulderDark: '#324b5b',
    text: '#eef8fb',
    muted: '#a8c2cd',
    accent: '#ffe28b',
    danger: '#ff9b78',
    hp: '#8ef0c6',
    wall: '#d6c9a0',
    stars: '#e8fbff',
    pickup: '#8ef0ff'
  }
};

export const THEME_NAMES = {
  royal: 'Royal Night',
  neon: 'Synthwave',
  forest: 'Emerald Dawn',
  ocean: 'Deep Tide'
};

export const THEME_ORDER = ['royal', 'neon', 'forest', 'ocean'];

export const OATHS = {
  squire: {
    id: 'squire',
    name: 'Squire',
    blurb: 'Seven hearts. A gentler siege.',
    detail: 'Enemies move slower. Score x0.8.',
    hp: 7,
    speed: 0.86,
    score: 0.8,
    bossHp: 0.9
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    blurb: 'Five hearts. The realm at stake.',
    detail: 'The standard siege. Score x1.',
    hp: 5,
    speed: 1,
    score: 1,
    bossHp: 1
  },
  warlord: {
    id: 'warlord',
    name: 'Warlord',
    blurb: 'Three hearts. No second chances.',
    detail: 'Faster horde. Score x1.5.',
    hp: 3,
    speed: 1.15,
    score: 1.5,
    bossHp: 1.2
  }
};

export const OATH_ORDER = ['squire', 'knight', 'warlord'];
export const DAILY_OATH = 'knight';

export const PHYSICS = {
  gravity: 1.05,
  launchMin: 0.52,
  launchMax: 1.38,
  maxArrowSpeed: 2200
};

export const SHOT_COOLDOWN_BASE = 0.3;
export const MAX_WAVE_SCALE = 20;
export const BOSS_EVERY = 5;

export const WIND = {
  baseMax: 30,
  perWave: 6,
  cap: 150
};

export const FX = {
  multishotTime: 10,
  pierceTime: 10,
  slowTime: 6,
  slowFactor: 0.42
};

export const DRAFT = {
  count: 3,
  clearBonus: 40,
  flawlessBonus: 75,
  skipScore: 300
};

export const UPGRADE_NAMES = [
  'Broadhead',
  'Quickdraw',
  'Twin Shot',
  'Bodkin Point',
  'Wallwright',
  'Windreader',
  'Battle Trance',
  'Royal Volley',
  'Executioner',
  'Lucky Charm',
  'Sure Shot',
  'Wall Guard',
  'Royal Bounty'
];

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function wallTopFor(height) {
  return height - Math.max(96, height * 0.16);
}

export function launchSpeedFor(height, power) {
  const p = clamp(power, 0, 1);
  return Math.min(
    PHYSICS.maxArrowSpeed,
    height * (PHYSICS.launchMin + p * (PHYSICS.launchMax - PHYSICS.launchMin))
  );
}

export function windMaxFor(wave) {
  return Math.min(WIND.cap, WIND.baseMax + Math.max(0, wave - 1) * WIND.perWave);
}

export function scoreMultiplier(oath) {
  return OATHS[oath]?.score ?? 1;
}
