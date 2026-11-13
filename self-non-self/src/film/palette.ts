import { mixColor, rgba } from './util';

export interface Palette {
  void: string;
  ink: string;
  blood: string;
  arterial: string;
  rose: string;
  amber: string;
  gold: string;
  bone: string;
  lymph: string;
  teal: string;
  violet: string;
  verdigris: string;
  white: string;
  slate: string;
}

export const PALETTE: Palette = {
  void: '#070609',
  ink: '#0d090c',
  blood: '#4a0d16',
  arterial: '#b7353f',
  rose: '#e8898a',
  amber: '#e8b46a',
  gold: '#f6d28a',
  bone: '#e9ddc7',
  lymph: '#5f8f83',
  teal: '#6fb7a8',
  violet: '#7b5cff',
  verdigris: '#8fae6a',
  white: '#f6f1e7',
  slate: '#6d747b',
};

export interface ActPalette {
  sky: string;
  deep: string;
  tissue: string;
  accent: string;
  glow: string;
  other: string;
}

export const ACT_PALETTES: Record<string, ActPalette> = {
  prologue: {
    sky: PALETTE.void,
    deep: PALETTE.ink,
    tissue: PALETTE.blood,
    accent: PALETTE.arterial,
    glow: PALETTE.amber,
    other: PALETTE.teal,
  },
  watch: {
    sky: '#150a0b',
    deep: '#2a0c10',
    tissue: '#6c1a1e',
    accent: PALETTE.arterial,
    glow: PALETTE.amber,
    other: PALETTE.teal,
  },
  silence: {
    sky: '#0c1013',
    deep: '#1b1a1d',
    tissue: '#402b2d',
    accent: '#8b6263',
    glow: '#c4a27a',
    other: '#6f8b8b',
  },
  breach: {
    sky: '#0a0d0b',
    deep: '#141b15',
    tissue: '#4f2a2a',
    accent: '#8fae6a',
    glow: PALETTE.gold,
    other: PALETTE.violet,
  },
  residents: {
    sky: '#08110f',
    deep: '#122522',
    tissue: '#4c2b2c',
    accent: PALETTE.teal,
    glow: PALETTE.gold,
    other: PALETTE.violet,
  },
  signal: {
    sky: '#0c070a',
    deep: '#261016',
    tissue: '#6b1d25',
    accent: PALETTE.arterial,
    glow: PALETTE.amber,
    other: PALETTE.violet,
  },
  empty: {
    sky: '#08090b',
    deep: '#15171a',
    tissue: '#3c3234',
    accent: '#8d8078',
    glow: '#b99a6d',
    other: '#5f7473',
  },
  surface: {
    sky: '#101218',
    deep: '#2b2b2f',
    tissue: '#6d5a52',
    accent: PALETTE.bone,
    glow: '#f4e6c8',
    other: '#8fa7b8',
  },
  apoptosis: {
    sky: '#0b0709',
    deep: '#241016',
    tissue: '#5d2027',
    accent: PALETTE.rose,
    glow: PALETTE.gold,
    other: PALETTE.teal,
  },
  garden: {
    sky: '#070b08',
    deep: '#101a12',
    tissue: '#3d3a29',
    accent: PALETTE.verdigris,
    glow: '#cfe3a4',
    other: PALETTE.teal,
  },
};

export function actPalette(id: string): ActPalette {
  return ACT_PALETTES[id] ?? ACT_PALETTES.prologue!;
}

export function fadePalette(palette: ActPalette, target: ActPalette, t: number): ActPalette {
  return {
    sky: mixColor(palette.sky, target.sky, t),
    deep: mixColor(palette.deep, target.deep, t),
    tissue: mixColor(palette.tissue, target.tissue, t),
    accent: mixColor(palette.accent, target.accent, t),
    glow: mixColor(palette.glow, target.glow, t),
    other: mixColor(palette.other, target.other, t),
  };
}

export function alpha(hex: string, value: number): string {
  return rgba(hex, value);
}
