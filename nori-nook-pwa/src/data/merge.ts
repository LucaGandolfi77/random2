export interface MergeItem {
  id: string;
  name: string;
  tier: number;
  kind: 'ingredient' | 'sushi' | 'special';
  ingredientId?: string;
  recipeId?: string;
  color: string;
  accent: string;
  points: number;
}

export interface MergeRule {
  a: string;
  b: string;
  result: string;
  points: number;
}

export const MERGE_ITEMS: MergeItem[] = [
  { id: 'rice', name: 'Rice', tier: 1, kind: 'ingredient', ingredientId: 'rice_white', color: '#FFFDF7', accent: '#D9D0BE', points: 1 },
  { id: 'nori', name: 'Nori', tier: 1, kind: 'ingredient', ingredientId: 'nori', color: '#393A36', accent: '#607B62', points: 1 },
  { id: 'salmon', name: 'Salmon', tier: 1, kind: 'ingredient', ingredientId: 'salmon', color: '#EF9D91', accent: '#F4C3A5', points: 1 },
  { id: 'tuna', name: 'Tuna', tier: 1, kind: 'ingredient', ingredientId: 'tuna', color: '#D96A6A', accent: '#F4C3A5', points: 1 },
  { id: 'cucumber', name: 'Cucumber', tier: 1, kind: 'ingredient', ingredientId: 'cucumber', color: '#8FBF8F', accent: '#607B62', points: 1 },
  { id: 'avocado', name: 'Avocado', tier: 1, kind: 'ingredient', ingredientId: 'avocado', color: '#A7B99A', accent: '#607B62', points: 1 },
  { id: 'shrimp', name: 'Shrimp', tier: 1, kind: 'ingredient', ingredientId: 'shrimp', color: '#F4C3A5', accent: '#EF9D91', points: 1 },
  { id: 'rice_base', name: 'Rice Base', tier: 2, kind: 'sushi', color: '#FFFDF7', accent: '#A7B99A', points: 4 },
  { id: 'nori_base', name: 'Nori Base', tier: 2, kind: 'sushi', color: '#393A36', accent: '#FFFDF7', points: 5 },
  { id: 'salmon_nigiri', name: 'Salmon Nigiri', tier: 3, kind: 'sushi', recipeId: 'salmon_nigiri', color: '#EF9D91', accent: '#FFFDF7', points: 12 },
  { id: 'tuna_nigiri', name: 'Tuna Nigiri', tier: 3, kind: 'sushi', recipeId: 'tuna_nigiri', color: '#D96A6A', accent: '#FFFDF7', points: 13 },
  { id: 'ebi_nigiri', name: 'Ebi Nigiri', tier: 3, kind: 'sushi', recipeId: 'ebi_nigiri', color: '#F4C3A5', accent: '#EF9D91', points: 14 },
  { id: 'cucumber_maki', name: 'Cucumber Maki', tier: 3, kind: 'sushi', recipeId: 'cucumber_maki', color: '#607B62', accent: '#A7B99A', points: 13 },
  { id: 'tuna_roll', name: 'Tuna Roll', tier: 3, kind: 'sushi', recipeId: 'tuna_maki', color: '#D96A6A', accent: '#393A36', points: 15 },
  { id: 'salmon_roll', name: 'Salmon Roll', tier: 3, kind: 'sushi', recipeId: 'salmon_avocado_roll', color: '#EF9D91', accent: '#393A36', points: 15 },
  { id: 'salmon_avocado_roll', name: 'Salmon Avocado Roll', tier: 4, kind: 'sushi', recipeId: 'salmon_avocado_roll', color: '#A7B99A', accent: '#EF9D91', points: 28 },
  { id: 'california_roll', name: 'California Roll', tier: 4, kind: 'sushi', recipeId: 'california_roll', color: '#F4C3A5', accent: '#607B62', points: 30 },
  { id: 'premium_pair', name: 'Premium Pair', tier: 5, kind: 'special', color: '#F4C36B', accent: '#FFFDF7', points: 55 },
  { id: 'rainbow_sushi', name: 'Rainbow Sushi', tier: 6, kind: 'special', color: '#EF9D91', accent: '#A7B99A', points: 90 },
  { id: 'golden_sushi', name: 'Golden Sushi', tier: 6, kind: 'special', color: '#F4C36B', accent: '#80614E', points: 110 },
  { id: 'giant_sushi', name: 'Giant Sushi', tier: 7, kind: 'special', color: '#F4C3A5', accent: '#EF9D91', points: 180 },
  { id: 'mystery_sushi', name: 'Mystery Sushi', tier: 8, kind: 'special', color: '#80614E', accent: '#EBC6CB', points: 300 },
];

export const MERGE_RULES: MergeRule[] = [
  { a: 'rice', b: 'rice', result: 'rice_base', points: 6 },
  { a: 'nori', b: 'rice', result: 'nori_base', points: 8 },
  { a: 'rice_base', b: 'salmon', result: 'salmon_nigiri', points: 18 },
  { a: 'rice_base', b: 'tuna', result: 'tuna_nigiri', points: 20 },
  { a: 'rice_base', b: 'shrimp', result: 'ebi_nigiri', points: 20 },
  { a: 'nori_base', b: 'cucumber', result: 'cucumber_maki', points: 18 },
  { a: 'nori_base', b: 'tuna', result: 'tuna_roll', points: 22 },
  { a: 'nori_base', b: 'salmon', result: 'salmon_roll', points: 22 },
  { a: 'salmon_roll', b: 'avocado', result: 'salmon_avocado_roll', points: 35 },
  { a: 'tuna_roll', b: 'cucumber', result: 'california_roll', points: 38 },
  { a: 'salmon_nigiri', b: 'salmon_nigiri', result: 'premium_pair', points: 45 },
  { a: 'tuna_nigiri', b: 'tuna_nigiri', result: 'premium_pair', points: 46 },
  { a: 'ebi_nigiri', b: 'ebi_nigiri', result: 'premium_pair', points: 47 },
  { a: 'tuna_roll', b: 'salmon_roll', result: 'rainbow_sushi', points: 70 },
  { a: 'premium_pair', b: 'premium_pair', result: 'golden_sushi', points: 120 },
  { a: 'rainbow_sushi', b: 'rainbow_sushi', result: 'mystery_sushi', points: 240 },
  { a: 'golden_sushi', b: 'premium_pair', result: 'giant_sushi', points: 190 },
  { a: 'golden_sushi', b: 'rainbow_sushi', result: 'mystery_sushi', points: 260 },
  { a: 'giant_sushi', b: 'giant_sushi', result: 'mystery_sushi', points: 400 },
];

export const MERGE_ITEM_BY_ID = new Map(MERGE_ITEMS.map((item) => [item.id, item]));

export const MERGE_SPAWNS = [
  { id: 'rice', weight: 4 },
  { id: 'nori', weight: 3 },
  { id: 'salmon', weight: 3 },
  { id: 'tuna', weight: 2.5 },
  { id: 'cucumber', weight: 2 },
  { id: 'avocado', weight: 2 },
  { id: 'shrimp', weight: 1.5 },
] as const;

export const findMergeRule = (a: string, b: string): MergeRule | undefined =>
  MERGE_RULES.find((rule) => (rule.a === a && rule.b === b) || (rule.a === b && rule.b === a));

export const getMergeItem = (id: string): MergeItem | undefined => MERGE_ITEM_BY_ID.get(id);
