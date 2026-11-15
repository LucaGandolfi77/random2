export const VERSION = '1.0.0';
export const STORE_KEY = 'milano-nera-77';
export const VIEW_W = 384;
export const VIEW_H = 216;
export const VIEW_PORTRAIT = { w: 216, h: 300 };
export const FIXED_DT = 1 / 60;
export const MAX_STEPS = 5;

export const PLAYER = {
  speed: 64,
  radius: 4.2,
  maxHp: 3,
  rollSpeed: 190,
  rollTime: 0.22,
  rollCooldown: 0.72,
  rollInvuln: 0.2,
  regenDelay: 5,
  regenEvery: 1.8,
  coverSpeed: 0.46,
  coverRange: 13,
  takedownRange: 14,
  interactRange: 18
};

export const WEAPONS = {
  pistol: {
    id: 'pistol',
    name: 'Beretta',
    mag: 8,
    damage: 1,
    cooldown: 0.26,
    reload: 1.15,
    speed: 280,
    spread: 0.018,
    bounces: 0,
    temporary: false,
    sound: 'pistol'
  },
  smg: {
    id: 'smg',
    name: 'M12',
    mag: 24,
    damage: 1,
    cooldown: 0.085,
    reload: 1.55,
    speed: 300,
    spread: 0.07,
    bounces: 0,
    temporary: true,
    sound: 'smg'
  },
  revolver: {
    id: 'revolver',
    name: 'Python',
    mag: 6,
    damage: 4,
    cooldown: 0.48,
    reload: 1.8,
    speed: 330,
    spread: 0.008,
    bounces: 0,
    temporary: true,
    sound: 'revolver'
  },
  lupara: {
    id: 'lupara',
    name: 'Lupara',
    mag: 2,
    damage: 1,
    cooldown: 0.68,
    reload: 1.35,
    speed: 255,
    spread: 0.24,
    pellets: 5,
    bounces: 0,
    temporary: true,
    sound: 'shotgun'
  }
};

export const ENEMIES = {
  thug: {
    id: 'thug',
    name: 'Teppista',
    hp: 2,
    speed: 44,
    radius: 5,
    damage: 1,
    cooldown: 0.8,
    range: 13,
    vision: 105,
    fov: 1.15,
    color: '#b55342',
    dark: '#5e241f',
    score: 80
  },
  gunman: {
    id: 'gunman',
    name: 'Pistolero',
    hp: 2,
    speed: 28,
    radius: 5,
    damage: 1,
    cooldown: 1.1,
    range: 150,
    preferred: 92,
    vision: 130,
    fov: 1.05,
    color: '#b08a61',
    dark: '#4d3828',
    score: 120
  },
  smg: {
    id: 'smg',
    name: 'Mitragliere',
    hp: 3,
    speed: 26,
    radius: 5,
    damage: 1,
    cooldown: 0.14,
    burst: 3,
    burstPause: 1.55,
    range: 140,
    preferred: 105,
    vision: 135,
    fov: 1.0,
    color: '#7c8a96',
    dark: '#303945',
    score: 180
  },
  sniper: {
    id: 'sniper',
    name: 'Cecchino',
    hp: 2,
    speed: 0,
    radius: 5,
    damage: 2,
    cooldown: 2.3,
    aimTime: 1.05,
    range: 210,
    vision: 210,
    fov: 0.62,
    color: '#7c7d58',
    dark: '#353722',
    score: 220
  },
  dog: {
    id: 'dog',
    name: 'Cane',
    hp: 1,
    speed: 72,
    radius: 4,
    damage: 1,
    cooldown: 0.65,
    range: 11,
    vision: 135,
    fov: 1.5,
    color: '#9a6848',
    dark: '#4a2c1d',
    score: 90
  },
  shotgunner: {
    id: 'shotgunner',
    name: 'Sicario',
    hp: 3,
    speed: 24,
    radius: 5,
    damage: 1,
    cooldown: 1.45,
    range: 82,
    preferred: 56,
    vision: 122,
    fov: 1.15,
    color: '#8b6d47',
    dark: '#3c2c1b',
    score: 160,
    pellets: 3
  },
  iena: {
    id: 'iena',
    name: 'La Iena',
    hp: 22,
    speed: 34,
    radius: 9,
    damage: 1,
    cooldown: 0.62,
    range: 195,
    preferred: 105,
    vision: 225,
    fov: 1.35,
    color: '#b76a3d',
    dark: '#4d2618',
    score: 1100
  },
  boss: {
    id: 'boss',
    name: 'Il Ragioniere',
    hp: 24,
    speed: 20,
    radius: 10,
    damage: 1,
    cooldown: 0.72,
    range: 190,
    preferred: 120,
    vision: 250,
    fov: 1.4,
    color: '#c39b58',
    dark: '#4f321c',
    score: 900
  },
  finalBoss: {
    id: 'finalBoss',
    name: 'Il Bianco',
    hp: 30,
    speed: 24,
    radius: 10,
    damage: 1,
    cooldown: 0.6,
    range: 200,
    preferred: 110,
    vision: 250,
    fov: 1.4,
    color: '#c9c3ae',
    dark: '#3d3a33',
    score: 1500
  }
};

export const PALETTES = {
  menu: {
    sky0: '#08080c',
    sky1: '#1a0f16',
    sky2: '#471f24',
    ink: '#f1e4c8',
    red: '#c84436',
    gold: '#e0b35c',
    teal: '#2f8b83',
    smoke: '#201b1d'
  },
  casa: {
    bg: '#120c0d',
    floorA: '#2b1718',
    floorB: '#341c1d',
    wall: '#4b2924',
    wallTop: '#7f5438',
    trim: '#c29155',
    accent: '#c84436',
    neon: '#ff7a57',
    teal: '#2f8b83',
    gold: '#e0b35c',
    shadow: 'rgba(0,0,0,.35)',
    paper: '#f1e4c8'
  },
  torre: {
    bg: '#0b1012',
    floorA: '#172326',
    floorB: '#1c2a2d',
    wall: '#2d4144',
    wallTop: '#527174',
    trim: '#b7b090',
    accent: '#3f8e88',
    neon: '#75e3c4',
    teal: '#2f8b83',
    gold: '#d8c489',
    shadow: 'rgba(0,0,0,.34)',
    paper: '#e9e4d2'
  },
  darsena: {
    bg: '#080d12',
    floorA: '#182027',
    floorB: '#1c2730',
    wall: '#2f3e48',
    wallTop: '#536975',
    trim: '#a58f67',
    accent: '#c84436',
    neon: '#ff5d4f',
    teal: '#2f8b83',
    gold: '#e0b35c',
    shadow: 'rgba(0,0,0,.4)',
    paper: '#eee3cb'
  },
  metro: {
    bg: '#070c12',
    floorA: '#152029',
    floorB: '#1a2832',
    wall: '#2b4050',
    wallTop: '#5c7b8c',
    trim: '#c7b172',
    accent: '#d34c3e',
    neon: '#8ef0d0',
    teal: '#2f8b83',
    gold: '#e0b35c',
    shadow: 'rgba(0,0,0,.42)',
    paper: '#e8f0ed'
  },
  parco: {
    bg: '#07110d',
    floorA: '#132119',
    floorB: '#182a20',
    wall: '#24412e',
    wallTop: '#4e7350',
    trim: '#b49a68',
    accent: '#c84436',
    neon: '#f3d27a',
    teal: '#3f9a83',
    gold: '#e0b35c',
    shadow: 'rgba(0,0,0,.38)',
    paper: '#eef0dc'
  },
  chase: {
    bg: '#07090c',
    road: '#22252b',
    roadLine: '#d6c892',
    curb: '#5b302c',
    car: '#a63b33',
    gold: '#e0b35c',
    neon: '#ff5d4f',
    teal: '#2f8b83',
    paper: '#f1e4c8'
  }
};

export const RANKS = ['C', 'B', 'A', 'S'];

export const DEFAULT_SETTINGS = {
  sound: true,
  music: true,
  haptics: true,
  shake: true,
  reducedMotion: false
};
