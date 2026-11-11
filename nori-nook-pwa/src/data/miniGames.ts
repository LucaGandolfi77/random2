import type { MiniGameId } from '@/types/game';

export interface MiniGameMeta {
  id: MiniGameId;
  name: string;
  short: string;
  description: string;
  color: string;
  phaser: boolean;
}

export const MINI_GAMES: MiniGameMeta[] = [
  {
    id: 'perfect_rice',
    name: 'Perfect Rice',
    short: 'Wash the rice in gentle circles.',
    description: 'Move your finger in slow circles until the rice is clean, then stop at the perfect moment.',
    color: '#FFFDF7',
    phaser: true,
  },
  {
    id: 'rice_cooker',
    name: 'Rice Cooker',
    short: 'Stop the needle in the warm zone.',
    description: 'The rice cooker is humming. Stop the needle right in the perfect zone.',
    color: '#A7B99A',
    phaser: true,
  },
  {
    id: 'fan_rice',
    name: 'Fan the Rice',
    short: 'Swipe to cool the rice with rhythm.',
    description: 'Fan the rice with steady back-and-forth swipes. Too fast and the grains fly away.',
    color: '#F4C3A5',
    phaser: true,
  },
  {
    id: 'perfect_slice',
    name: 'Perfect Slice',
    short: 'Cut the fish with a steady hand.',
    description: 'Follow the guide and release at the perfect thickness. A calm hand makes the prettiest slice.',
    color: '#EF9D91',
    phaser: true,
  },
  {
    id: 'nori_wrap',
    name: 'Nori Wrap',
    short: 'Place the nori just right.',
    description: 'Drag and align the sleepy nori sheet so it hugs the rice evenly.',
    color: '#393A36',
    phaser: false,
  },
  {
    id: 'roll_master',
    name: 'Roll Master',
    short: 'Roll the maki with gentle pressure.',
    description: 'Swipe along the bamboo mat, then press at the right moment to close a tidy roll.',
    color: '#80614E',
    phaser: true,
  },
  {
    id: 'nigiri_master',
    name: 'Nigiri Master',
    short: 'Hold the rice at ideal pressure.',
    description: 'Press gently and keep the rice in the sweet spot. Too hard and it becomes a rice pebble.',
    color: '#F4C3A5',
    phaser: false,
  },
  {
    id: 'wasabi_balance',
    name: 'Wasabi Balance',
    short: 'A tiny dab, not a tearful mountain.',
    description: 'Add just enough wasabi for a happy little tingle.',
    color: '#8FBF8F',
    phaser: false,
  },
  {
    id: 'plate_art',
    name: 'Plate Art',
    short: 'Arrange the plate beautifully.',
    description: 'Drag the sushi and garnishes into a balanced, beautiful plate.',
    color: '#EBC6CB',
    phaser: false,
  },
  {
    id: 'quick_service',
    name: 'Quick Service',
    short: 'Match the dishes to the right tables.',
    description: 'Tap the plate that belongs to each customer before the tea gets cold.',
    color: '#F4C36B',
    phaser: false,
  },
  {
    id: 'tea_master',
    name: 'Tea Master',
    short: 'Brew a calm cup of tea.',
    description: 'Balance water temperature and steeping time for a lovely cup of green tea.',
    color: '#A7B99A',
    phaser: false,
  },
  {
    id: 'delivery_pack',
    name: 'Delivery Pack',
    short: 'Pack the bento without a single wiggle.',
    description: 'Fit every item snugly into the bento box. No gaps, no spills, no sad sushi.',
    color: '#F4C3A5',
    phaser: true,
  },
];

export const MINI_GAME_BY_ID = new Map(MINI_GAMES.map((game) => [game.id, game]));

export const miniGameById = (id: MiniGameId): MiniGameMeta | undefined => MINI_GAME_BY_ID.get(id);
