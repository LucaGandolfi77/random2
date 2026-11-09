export const TILE_W = 56;
export const TILE_H = 28;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

export interface Point {
  x: number;
  y: number;
}

export const project = (x: number, y: number, originX = 0, originY = 0): Point => ({
  x: originX + (x - y) * HALF_W,
  y: originY + (x + y) * HALF_H
});

export const unproject = (px: number, py: number, originX = 0, originY = 0): Point => {
  const x = (py - originY) / TILE_H + (px - originX) / TILE_W;
  const y = (py - originY) / TILE_H - (px - originX) / TILE_W;
  return { x: Math.round(x), y: Math.round(y) };
};

export const tileAt = (rows: string[], x: number, y: number): string => rows[y]?.[x] ?? '#';

export const BLOCKED_CHARS = '#T~^ox';
export const isWalkable = (ch: string): boolean => !BLOCKED_CHARS.includes(ch);

const palettes: Record<string, Record<string, number>> = {
  bastion: {
    floor: 0x4d4741,
    stone: 0x56504a,
    path: 0x5b5042,
    grass: 0x454735,
    water: 0x1d3034,
    wood: 0x4b3b2d,
    wall: 0x2f2b2b,
    rubble: 0x3b3734,
    bridge: 0x5a5044,
    accent: 0x9c7b47
  },
  village: {
    floor: 0x5c5546,
    stone: 0x5b5549,
    path: 0x6b5840,
    grass: 0x39482f,
    water: 0x1f3539,
    wood: 0x5a4230,
    wall: 0x38322c,
    rubble: 0x433d34,
    bridge: 0x5d5140,
    accent: 0xb08c51
  },
  forest: {
    floor: 0x3d4432,
    stone: 0x4d4b3f,
    path: 0x574831,
    grass: 0x2e432d,
    water: 0x1c3336,
    wood: 0x4c3929,
    wall: 0x2b3228,
    rubble: 0x3b3c30,
    bridge: 0x504531,
    accent: 0x83a06a
  },
  temple: {
    floor: 0x404a47,
    stone: 0x4b5450,
    path: 0x4d524a,
    grass: 0x37453a,
    water: 0x17343b,
    wood: 0x4b3d30,
    wall: 0x2a3231,
    rubble: 0x3b4441,
    bridge: 0x57564b,
    accent: 0x79a6a0
  },
  citadel: {
    floor: 0x3a3235,
    stone: 0x423a3d,
    path: 0x4b3b39,
    grass: 0x352f2c,
    water: 0x1b2b30,
    wood: 0x453029,
    wall: 0x252024,
    rubble: 0x342d30,
    bridge: 0x4b3e3d,
    accent: 0xb0644d
  }
};

const hash = (x: number, y: number): number => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export const tileColor = (ch: string, x: number, y: number, ambience: string): number => {
  const palette = palettes[ambience] ?? palettes.bastion;
  const jitter = Math.round((hash(x, y) - 0.5) * 10);
  let base: number;
  switch (ch) {
    case '.':
    case 'e':
    case 'f':
      base = palette.floor;
      break;
    case ';':
    case ',':
      base = palette.grass;
      break;
    case 'r':
      base = palette.path;
      break;
    case 'w':
    case 'm':
      base = palette.wood;
      break;
    case '~':
      base = palette.water;
      break;
    case '=':
    case 'i':
      base = palette.bridge;
      break;
    case '^':
      base = palette.rubble;
      break;
    case '#':
    case 'T':
    case 'o':
      base = palette.wall;
      break;
    case 'b':
      base = palette.stone;
      break;
    case 'a':
      base = 0x3c3331;
      break;
    default:
      base = palette.floor;
  }
  const r = Math.max(0, Math.min(255, ((base >> 16) & 0xff) + jitter));
  const g = Math.max(0, Math.min(255, ((base >> 8) & 0xff) + jitter));
  const b = Math.max(0, Math.min(255, (base & 0xff) + jitter));
  return (r << 16) | (g << 8) | b;
};

export const surfaceOverlay = (ch: string): number | null => {
  switch (ch) {
    case '~':
      return 0x2f6770;
    case 'f':
      return 0xb6482b;
    case 'i':
      return 0x7fb4bd;
    case 'a':
      return 0x5a4038;
    case 'b':
      return 0x5a4448;
    case 'e':
      return 0x8d4a2c;
    default:
      return null;
  }
};

export const ambienceTint = (ambience: string): number => {
  switch (ambience) {
    case 'village':
      return 0x8b9c78;
    case 'forest':
      return 0x7d9676;
    case 'temple':
      return 0x77988f;
    case 'citadel':
      return 0xa47468;
    default:
      return 0x9a8b78;
  }
};

export const kindGlyph: Record<string, string> = {
  npc: '◈',
  chest: '▣',
  shrine: '✧',
  exit: '↟',
  note: '❧',
  trap: '⌖',
  rune: '⟁',
  door: '⌂',
  loot: '◇',
  enemy: '☠',
  puzzle: '◉',
  camp: '♨',
  merchant: '⚖'
};

export const kindColor: Record<string, number> = {
  npc: 0xe0bd7a,
  chest: 0xd8a34e,
  shrine: 0x9fc7b1,
  exit: 0x9db6cf,
  note: 0xcabf9a,
  trap: 0xb95f55,
  rune: 0x86bfa0,
  door: 0xc2a06a,
  loot: 0xd8b25f,
  enemy: 0xcf6a5a,
  puzzle: 0xb48cc4,
  camp: 0xd5a05a,
  merchant: 0x8fb7a6
};
