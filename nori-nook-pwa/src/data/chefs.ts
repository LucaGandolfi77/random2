import type { GradeName, PortraitConfig } from '@/types/game';

export interface ChefChallenge {
  id: string;
  name: string;
  title: string;
  description: string;
  recipeId: string;
  timeLimit: number;
  maxIngredients: number;
  minGrade: GradeName;
  forbiddenTags: string[];
  rewardCoins: number;
  rewardPearls: number;
  unlockLevel: number;
  portrait: PortraitConfig;
  line: string;
}

export const CHEF_CHALLENGES: ChefChallenge[] = [
  {
    id: 'chef_hoshi',
    name: 'Chef Hoshi',
    title: 'The Rice Purist',
    description: 'Two ingredients. One perfect nigiri. Chef Hoshi counts every grain.',
    recipeId: 'salmon_nigiri',
    timeLimit: 100,
    maxIngredients: 2,
    minGrade: 'Delicious',
    forbiddenTags: [],
    rewardCoins: 80,
    rewardPearls: 1,
    unlockLevel: 2,
    portrait: {
      skin: '#E8C4A8',
      hair: '#393A36',
      hairStyle: 'short',
      eye: 'sharp',
      accessory: 'headband',
      outfit: '#FFFDF7',
    },
    line: 'Rice is not a background. Rice is the song.',
  },
  {
    id: 'chef_tora',
    name: 'Chef Tora',
    title: 'The Roll Master',
    description: 'A dragon roll with no wasabi and a steady hand. Chef Tora is watching.',
    recipeId: 'dragon_roll',
    timeLimit: 150,
    maxIngredients: 5,
    minGrade: 'Delicious',
    forbiddenTags: ['spicy'],
    rewardCoins: 120,
    rewardPearls: 2,
    unlockLevel: 3,
    portrait: {
      skin: '#C98C66',
      hair: '#393A36',
      hairStyle: 'cap',
      eye: 'sharp',
      accessory: 'none',
      outfit: '#EF9D91',
    },
    line: 'A roll should be round enough to forgive the world.',
  },
  {
    id: 'chef_kaze',
    name: 'Chef Kaze',
    title: 'The Minimalist',
    description: 'Sea bass, rice, silence. Nothing else. Chef Kaze has already closed his eyes.',
    recipeId: 'sea_bass_nigiri',
    timeLimit: 80,
    maxIngredients: 2,
    minGrade: 'Perfect',
    forbiddenTags: [],
    rewardCoins: 110,
    rewardPearls: 2,
    unlockLevel: 3,
    portrait: {
      skin: '#F7E0CF',
      hair: '#D9D0BE',
      hairStyle: 'long',
      eye: 'closed',
      accessory: 'scarf',
      outfit: '#A7B99A',
    },
    line: 'Remove one thing. Now remove another. There it is.',
  },
  {
    id: 'chef_yuzu',
    name: 'Chef Yuzu',
    title: 'The Color Alchemist',
    description: 'A rainbow roll with at least four colors. The jury has brought sunglasses.',
    recipeId: 'rainbow_roll',
    timeLimit: 140,
    maxIngredients: 5,
    minGrade: 'Good',
    forbiddenTags: [],
    rewardCoins: 100,
    rewardPearls: 2,
    unlockLevel: 4,
    portrait: {
      skin: '#EBC6CB',
      hair: '#F4C36B',
      hairStyle: 'bun',
      eye: 'round',
      accessory: 'flower',
      outfit: '#EF9D91',
    },
    line: 'If it does not make you smile, add one more color.',
  },
  {
    id: 'chef_sora',
    name: 'Chef Sora',
    title: 'The Midnight Legend',
    description: 'The golden tuna crown, four ingredients, and a perfection the city only whispers about.',
    recipeId: 'golden_tuna',
    timeLimit: 180,
    maxIngredients: 4,
    minGrade: 'Perfect',
    forbiddenTags: [],
    rewardCoins: 220,
    rewardPearls: 4,
    unlockLevel: 5,
    portrait: {
      skin: '#D9A47E',
      hair: '#393A36',
      hairStyle: 'hat',
      eye: 'soft',
      accessory: 'scarf',
      outfit: '#393A36',
    },
    line: 'At midnight, the rice remembers every hand it has met.',
  },
];

export const CHEF_BY_ID = new Map(CHEF_CHALLENGES.map((chef) => [chef.id, chef]));
