import type { PaletteId } from './types';

export interface Palette {
  id: PaletteId;
  bg: string;
  deep: string;
  mid: string;
  light: string;
  accent: string;
  trim: string;
  warm: string;
  cold: string;
  ink: string;
  glow: string;
}

export const PALETTES: Record<PaletteId, Palette> = {
  ice: {
    id: 'ice',
    bg: '#070b12',
    deep: '#101a28',
    mid: '#223447',
    light: '#c8d8e4',
    accent: '#8ea9bd',
    trim: '#b7c9d6',
    warm: '#b08a5a',
    cold: '#7fa5c7',
    ink: '#05070b',
    glow: 'rgba(167, 199, 222, 0.22)'
  },
  brass: {
    id: 'brass',
    bg: '#0d0906',
    deep: '#25180e',
    mid: '#4a3219',
    light: '#e5d1a8',
    accent: '#c49a52',
    trim: '#d4ad68',
    warm: '#e0a95a',
    cold: '#6d7d8e',
    ink: '#080604',
    glow: 'rgba(228, 184, 100, 0.25)'
  },
  bordeaux: {
    id: 'bordeaux',
    bg: '#0a0507',
    deep: '#1d0a10',
    mid: '#471522',
    light: '#d9b8b1',
    accent: '#9e3a45',
    trim: '#c0836e',
    warm: '#c7855a',
    cold: '#6d7d92',
    ink: '#050203',
    glow: 'rgba(169, 66, 76, 0.24)'
  },
  candle: {
    id: 'candle',
    bg: '#090604',
    deep: '#1e120b',
    mid: '#3f2718',
    light: '#ead6b7',
    accent: '#c38a4e',
    trim: '#d9a45f',
    warm: '#f0b261',
    cold: '#5b6a7c',
    ink: '#050302',
    glow: 'rgba(242, 175, 92, 0.26)'
  },
  sun: {
    id: 'sun',
    bg: '#0d0a06',
    deep: '#2a1d0f',
    mid: '#5b3f22',
    light: '#f2ddb8',
    accent: '#d9a35e',
    trim: '#e4b56e',
    warm: '#f3bf72',
    cold: '#7f8f93',
    ink: '#0a0704',
    glow: 'rgba(255, 205, 125, 0.28)'
  },
  honey: {
    id: 'honey',
    bg: '#0b0805',
    deep: '#24170c',
    mid: '#4a3219',
    light: '#ebd8b4',
    accent: '#c99a54',
    trim: '#d6b06a',
    warm: '#e7b566',
    cold: '#76856f',
    ink: '#060403',
    glow: 'rgba(239, 188, 100, 0.25)'
  },
  iron: {
    id: 'iron',
    bg: '#05080c',
    deep: '#0d141e',
    mid: '#1c2a38',
    light: '#b9c8d2',
    accent: '#758b9a',
    trim: '#9eb2c0',
    warm: '#b07b45',
    cold: '#7199b8',
    ink: '#030508',
    glow: 'rgba(148, 177, 197, 0.2)'
  },
  black: {
    id: 'black',
    bg: '#030304',
    deep: '#0a0b0e',
    mid: '#171a20',
    light: '#aeb4ba',
    accent: '#6d747c',
    trim: '#8a8072',
    warm: '#8d6a48',
    cold: '#5d768b',
    ink: '#000000',
    glow: 'rgba(160, 174, 186, 0.14)'
  },
  green: {
    id: 'green',
    bg: '#070b07',
    deep: '#122014',
    mid: '#263b24',
    light: '#d7dcc0',
    accent: '#8d9e64',
    trim: '#b8b17d',
    warm: '#caa45d',
    cold: '#7c9694',
    ink: '#040604',
    glow: 'rgba(187, 204, 148, 0.22)'
  }
};
