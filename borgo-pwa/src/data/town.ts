import type {
  BuildingSpec,
  NpcSpec,
  PathSpec,
  PropSpec,
  Spot,
  WorldBounds,
  ZoneSpec
} from './types';

export const WORLD: WorldBounds = {
  minX: -49,
  maxX: 48,
  minZ: -39,
  maxZ: 39
};

export const SPAWN = { x: 0, z: 13, rot: Math.PI };

export const BUILDINGS: BuildingSpec[] = [
  {
    id: 'bakery',
    x: -22,
    z: 1,
    w: 8,
    d: 6,
    h: 4.2,
    style: 'shop',
    door: 's',
    wall: 'cream',
    roof: 'terracotta',
    sign: 'FORNO',
    chimney: true
  },
  {
    id: 'neighbour',
    x: -34.5,
    z: 1,
    w: 7,
    d: 6,
    h: 4,
    style: 'house',
    door: 's',
    wall: 'white',
    roof: 'terracotta',
    chimney: true
  },
  {
    id: 'cafe',
    x: -12,
    z: -12,
    w: 9,
    d: 6,
    h: 4.4,
    style: 'cafe',
    door: 's',
    wall: 'rose',
    roof: 'brown',
    sign: 'CAFFÈ'
  },
  {
    id: 'townhall',
    x: 8,
    z: -11,
    w: 8,
    d: 8,
    h: 6.2,
    style: 'hall',
    door: 'w',
    wall: 'ochre',
    roof: 'slate',
    sign: 'COMUNE'
  },
  {
    id: 'flowershop',
    x: 22,
    z: 3,
    w: 8,
    d: 6,
    h: 4,
    style: 'shop',
    door: 'w',
    wall: 'white',
    roof: 'terracotta',
    sign: 'FIORI'
  },
  {
    id: 'north-house-a',
    x: -4,
    z: -22,
    w: 9,
    d: 6,
    h: 4.6,
    style: 'house',
    door: 's',
    wall: 'cream',
    roof: 'terracotta',
    chimney: true
  },
  {
    id: 'north-house-b',
    x: 5,
    z: -24,
    w: 7,
    d: 6,
    h: 4.2,
    style: 'house',
    door: 's',
    wall: 'rose',
    roof: 'brown',
    chimney: true
  },
  {
    id: 'south-house',
    x: -18,
    z: 17,
    w: 8,
    d: 6,
    h: 4.4,
    style: 'house',
    door: 'n',
    wall: 'ochre',
    roof: 'terracotta'
  },
  {
    id: 'church',
    x: -41,
    z: -19,
    w: 10,
    d: 18,
    h: 7.5,
    style: 'church',
    door: 'e',
    wall: 'white',
    roof: 'terracotta',
    sign: 'SANTA LENA'
  },
  {
    id: 'tower',
    x: -28,
    z: -20,
    w: 4,
    d: 4,
    h: 11,
    style: 'tower',
    door: 's',
    wall: 'stone',
    roof: 'slate'
  },
  {
    id: 'east-house',
    x: 36,
    z: -6,
    w: 8,
    d: 6,
    h: 4.2,
    style: 'house',
    door: 'w',
    wall: 'cream',
    roof: 'terracotta',
    chimney: true
  },
  {
    id: 'belvedere-house',
    x: 40,
    z: 16,
    w: 7,
    d: 6,
    h: 4,
    style: 'house',
    door: 'w',
    wall: 'white',
    roof: 'brown'
  },
  {
    id: 'garden-house',
    x: 42,
    z: -20,
    w: 8,
    d: 6,
    h: 4.1,
    style: 'house',
    door: 'w',
    wall: 'rose',
    roof: 'terracotta'
  }
];

export const PATHS: PathSpec[] = [
  { x: -29, z: 6, w: 26, d: 5 },
  { x: -28.5, z: -3, w: 5, d: 18 },
  { x: -31, z: -16, w: 12, d: 20 },
  { x: 14, z: -20, w: 4, d: 28 },
  { x: 23, z: -18, w: 18, d: 4 },
  { x: 28, z: -18.5, w: 4, d: 5 },
  { x: 26, z: 10.5, w: 20, d: 5 },
  { x: 33.5, z: 17, w: 5, d: 10 },
  { x: 33.5, z: 23, w: 5, d: 2 },
  { x: 34, z: 29, w: 16, d: 10 },
  { x: -8, z: 22, w: 4, d: 16 },
  { x: -15, z: 30, w: 18, d: 4 },
  { x: -34, z: 30, w: 20, d: 4, tone: 'earth' }
];

export const PROPS: PropSpec[] = [
  { id: 'fountain', kind: 'fountain', x: 0, z: 0, scale: 1 },
  { id: 'olive-1', kind: 'olive', x: -26, z: 26, scale: 1.1 },
  { id: 'olive-2', kind: 'olive', x: -31, z: 24.5, scale: 0.9 },
  { id: 'olive-3', kind: 'olive', x: -36, z: 25, scale: 1.2 },
  { id: 'olive-4', kind: 'olive', x: -42, z: 27, scale: 1 },
  { id: 'olive-5', kind: 'olive', x: -28, z: 35, scale: 1.15 },
  { id: 'olive-6', kind: 'olive', x: -35, z: 34.5, scale: 0.95 },
  { id: 'olive-7', kind: 'olive', x: -43, z: 35, scale: 1.05 },
  { id: 'olive-8', kind: 'olive', x: -39, z: 29.5, scale: 0.85 },
  { id: 'olive-9', kind: 'olive', x: -24.5, z: 36, scale: 1 },
  { id: 'olive-garden', kind: 'olive', x: 28, z: -29, scale: 1.15 },
  { id: 'olive-piazza-w', kind: 'olive', x: -13, z: 11, scale: 0.8 },
  { id: 'olive-piazza-e', kind: 'olive', x: 11, z: 12, scale: 0.8 },
  { id: 'cypress-church-1', kind: 'cypress', x: -48, z: -30, scale: 1.1 },
  { id: 'cypress-church-2', kind: 'cypress', x: -34, z: -31, scale: 0.9 },
  { id: 'cypress-garden', kind: 'cypress', x: 21.5, z: -33.5, scale: 1 },
  { id: 'cypress-east', kind: 'cypress', x: 41, z: -2, scale: 0.9 },
  { id: 'cypress-south', kind: 'cypress', x: -13, z: 34, scale: 1 },
  { id: 'lantern-piazza-nw', kind: 'lantern', x: -8, z: -8 },
  { id: 'lantern-piazza-ne', kind: 'lantern', x: 8, z: -8 },
  { id: 'lantern-piazza-sw', kind: 'lantern', x: -8, z: 8 },
  { id: 'lantern-piazza-se', kind: 'lantern', x: 8, z: 8 },
  { id: 'lantern-west-1', kind: 'lantern', x: -20, z: 7.6 },
  { id: 'lantern-west-2', kind: 'lantern', x: -34, z: 7.6 },
  { id: 'lantern-church', kind: 'lantern', x: -28.5, z: -10 },
  { id: 'lantern-plaza', kind: 'lantern', x: -25, z: -22 },
  { id: 'lantern-garden', kind: 'lantern', x: 28, z: -19.5 },
  { id: 'lantern-belvedere', kind: 'lantern', x: 30, z: 26 },
  { id: 'lantern-grove', kind: 'lantern', x: -24, z: 30 },
  { id: 'bench-piazza', kind: 'bench', x: -7, z: 9.5, rot: 0 },
  { id: 'bench-belvedere', kind: 'bench', x: 29, z: 27.5, rot: 0 },
  { id: 'bench-garden', kind: 'bench', x: 24, z: -26, rot: Math.PI / 2 },
  { id: 'bench-plaza', kind: 'bench', x: -34, z: -8.5, rot: Math.PI / 2 },
  { id: 'table-cafe-1', kind: 'table', x: -10, z: -7, w: 1.2, d: 0.8 },
  { id: 'table-cafe-2', kind: 'table', x: -14, z: -6.6, w: 1.2, d: 0.8 },
  { id: 'chair-cafe-1', kind: 'chair', x: -9, z: -6.2, rot: 0.4 },
  { id: 'chair-cafe-2', kind: 'chair', x: -11, z: -7.8, rot: -0.5 },
  { id: 'chair-cafe-3', kind: 'chair', x: -14.9, z: -7.3, rot: 2 },
  { id: 'festival-table', kind: 'table', x: 6, z: -3, w: 2.4, d: 1.1 },
  { id: 'pot-bakery-1', kind: 'pot', x: -25.2, z: 4.6 },
  { id: 'pot-bakery-2', kind: 'pot', x: -18.8, z: 4.6 },
  { id: 'pot-shop-1', kind: 'pot', x: 17.4, z: 1 },
  { id: 'pot-shop-2', kind: 'pot', x: 17.4, z: 5 },
  { id: 'pot-cafe-1', kind: 'pot', x: -9, z: -8.7 },
  { id: 'pot-cafe-2', kind: 'pot', x: -15.2, z: -8.7 },
  { id: 'cart-grove', kind: 'cart', x: -27, z: 30, rot: 0.3, w: 2, d: 1.2 },
  { id: 'telescope', kind: 'telescope', x: 39, z: 31 },
  { id: 'laundry-north', kind: 'laundry', x: -4, z: -18.7, w: 6 },
  { id: 'arch-west', kind: 'arch', x: -42.5, z: 6, w: 4.4 },
  { id: 'planter-piazza', kind: 'planter', x: 2, z: 9, w: 1.4, d: 0.6 },
  { id: 'wall-garden-s1', kind: 'wall', x: 23.5, z: -21, w: 7, d: 0.5, h: 1.8 },
  { id: 'wall-garden-s2', kind: 'wall', x: 32.5, z: -21, w: 7, d: 0.5, h: 1.8 },
  { id: 'wall-garden-n', kind: 'wall', x: 28, z: -35, w: 16, d: 0.5, h: 1.8 },
  { id: 'wall-garden-w', kind: 'wall', x: 20, z: -28, w: 0.5, d: 14, h: 1.8 },
  { id: 'wall-garden-e', kind: 'wall', x: 36, z: -28, w: 0.5, d: 14, h: 1.8 },
  { id: 'wall-belvedere-s', kind: 'wall', x: 34, z: 34.2, w: 16, d: 0.5, h: 0.9 },
  { id: 'wall-belvedere-e', kind: 'wall', x: 42, z: 29, w: 0.5, d: 10, h: 0.9 },
  { id: 'wall-grove-w', kind: 'wall', x: -44.5, z: 31, w: 0.5, d: 14, h: 1.1 },
  { id: 'wall-grove-s', kind: 'wall', x: -34, z: 38.4, w: 21, d: 0.5, h: 1.1 },
  { id: 'wall-grove-e1', kind: 'wall', x: -23.5, z: 26, w: 0.5, d: 4, h: 1.1 },
  { id: 'wall-grove-e2', kind: 'wall', x: -23.5, z: 35, w: 0.5, d: 6, h: 1.1 }
];

export const TILES: Spot[] = [
  { id: 'tile-church', x: -26.5, z: -24.5 },
  { id: 'tile-grove', x: -42, z: 36 },
  { id: 'tile-bakery', x: -28.6, z: -5.2 },
  { id: 'tile-garden', x: 34.5, z: -33 },
  { id: 'tile-belvedere', x: 41, z: 26.5 },
  { id: 'tile-cafe', x: -15.5, z: -16.5 }
];

export const LETTERS: Spot[] = [
  { id: 'letter-west', x: -30, z: 7 },
  { id: 'letter-vicolo', x: 14, z: -30 },
  { id: 'letter-belvedere', x: 33.5, z: 20 }
];

export const FLOWERS: Spot[] = [
  { id: 'flower-south', x: -12, z: 23 },
  { id: 'flower-grove-n', x: -32, z: 27 },
  { id: 'flower-grove-s', x: -41, z: 33 },
  { id: 'flower-garden-w', x: 23, z: -23.5 },
  { id: 'flower-garden-e', x: 34.5, z: -25 }
];

export const NPCS: NpcSpec[] = [
  { id: 'ada', x: -22, z: 4.7, facing: 0 },
  { id: 'elio', x: -5, z: 9, facing: Math.PI },
  { id: 'marta', x: 17.2, z: 3, facing: -Math.PI / 2 },
  { id: 'nino', x: -24, z: -17, facing: 0.1 }
];

export const FESTIVAL_TABLE = { x: 6, z: -3 };
export const BELL_SPOT = { x: -28, z: -16.6 };

export const ZONES: ZoneSpec[] = [
  {
    id: 'piazza',
    name: { it: 'Piazza della Fontana', en: 'Piazza della Fontana' },
    x: 0,
    z: 4,
    r: 20
  },
  {
    id: 'fornai',
    name: { it: 'Via dei Fornai', en: 'Bakers’ Lane' },
    x: -29,
    z: 6,
    r: 13
  },
  {
    id: 'chiesa',
    name: { it: 'Chiesa di Santa Lena', en: 'Church of Santa Lena' },
    x: -33,
    z: -15,
    r: 14
  },
  {
    id: 'belvedere',
    name: { it: 'Belvedere', en: 'Belvedere' },
    x: 34,
    z: 28,
    r: 11
  },
  {
    id: 'giardino',
    name: { it: 'Giardino dei Ricordi', en: 'Garden of Memories' },
    x: 28,
    z: -28,
    r: 11
  },
  {
    id: 'oliveto',
    name: { it: 'Oliveto', en: 'Olive Grove' },
    x: -34,
    z: 30,
    r: 12
  },
  {
    id: 'vicolo',
    name: { it: 'Vicolo del Vento', en: 'Wind Alley' },
    x: 14,
    z: -24,
    r: 12
  }
];
