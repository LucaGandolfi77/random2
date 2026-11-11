import type { PuzzleConstraint, PuzzleLevel, RecipeIngredient } from '@/types/game';
import { INGREDIENTS } from './ingredients';
import { recipeById } from './recipes';

interface PuzzleBlueprint {
  title: string;
  description: string;
  constraints: PuzzleConstraint[];
  solution: RecipeIngredient[];
}

const s = (...ids: string[]): RecipeIngredient[] => ids.map((id) => ({ id, qty: 1 }));
const r = (id: string): RecipeIngredient[] => [...(recipeById(id)?.ingredients ?? [])];

const blueprint: PuzzleBlueprint[] = [
  {
    title: 'The First Little Nigiri',
    description: 'Make a Salmon Nigiri. Rice, salmon, a calm hand.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'salmon_nigiri' }],
    solution: r('salmon_nigiri'),
  },
  {
    title: 'Cucumber Spiral',
    description: 'Cucumber Maki, exactly as the recipe card says.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'cucumber_maki' }],
    solution: r('cucumber_maki'),
  },
  {
    title: 'Sweet Morning',
    description: 'A Tamago Nigiri with nothing else on the board.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'tamago_nigiri' }],
    solution: r('tamago_nigiri'),
  },
  {
    title: 'Tiny Tuna Wheels',
    description: 'Tuna Maki. Keep it neat, keep it small.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'tuna_maki' }],
    solution: r('tuna_maki'),
  },
  {
    title: 'Creamy Green',
    description: 'Salmon Avocado Roll. A classic for a reason.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'salmon_avocado_roll' }],
    solution: r('salmon_avocado_roll'),
  },
  {
    title: 'California Postcard',
    description: 'Make a California Roll from the postcard recipe.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'california_roll' }],
    solution: r('california_roll'),
  },
  {
    title: 'A Little Kick',
    description: 'Spicy Tuna Roll. The kick is mandatory, the mess is not.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'spicy_tuna_roll' }],
    solution: r('spicy_tuna_roll'),
  },
  {
    title: 'Scattered Treasures',
    description: 'Chirashi Bowl. Every ingredient has a little home.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'chirashi' }],
    solution: r('chirashi'),
  },
  {
    title: 'The Dragon Awakens',
    description: 'Dragon Roll, with a green avocado mane.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'dragon_roll' }],
    solution: r('dragon_roll'),
  },
  {
    title: 'A Golden Crown',
    description: 'The Golden Tuna Crown. No substitutions.',
    constraints: [{ kind: 'exact_recipe', recipeId: 'golden_tuna' }],
    solution: r('golden_tuna'),
  },
  {
    title: 'Green Only',
    description: 'Use only vegetables. Not even rice is allowed.',
    constraints: [
      { kind: 'only_category', category: 'vegetable' },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('avocado', 'cucumber'),
  },
  {
    title: 'Garden Trio',
    description: 'Three vegetables, no more than four.',
    constraints: [
      { kind: 'only_category', category: 'vegetable' },
      { kind: 'min_ingredients', count: 3 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('avocado', 'cucumber', 'carrot'),
  },
  {
    title: 'Fish Only',
    description: 'A plate of fish and nothing else.',
    constraints: [
      { kind: 'only_category', category: 'fish' },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('salmon', 'tuna'),
  },
  {
    title: 'Scallop Spotlight',
    description: 'Only fish, with scallop as the star.',
    constraints: [
      { kind: 'only_category', category: 'fish' },
      { kind: 'must_include', ingredientId: 'scallop' },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('salmon', 'shrimp', 'scallop'),
  },
  {
    title: 'Two Greens, One Fish',
    description: 'At least two vegetables and one fish.',
    constraints: [
      { kind: 'category_count', category: 'vegetable', count: 2 },
      { kind: 'category_count', category: 'fish', count: 1 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('salmon', 'avocado', 'cucumber'),
  },
  {
    title: 'Fish Pair',
    description: 'Two fish, a vegetable and a tidy plate.',
    constraints: [
      { kind: 'category_count', category: 'fish', count: 2 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('tuna', 'salmon', 'cucumber'),
  },
  {
    title: 'Fruit & Sea',
    description: 'One fish and one sweet vegetable. That is all.',
    constraints: [
      { kind: 'category_count', category: 'fish', count: 1 },
      { kind: 'category_count', category: 'vegetable', count: 1 },
      { kind: 'max_ingredients', count: 2 },
    ],
    solution: s('shrimp', 'mango'),
  },
  {
    title: 'Pantry Pair',
    description: 'Two pantry ingredients and one fish.',
    constraints: [
      { kind: 'category_count', category: 'other', count: 2 },
      { kind: 'category_count', category: 'fish', count: 1 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('nori', 'sesame', 'tuna'),
  },
  {
    title: 'No Repeats',
    description: 'Four different ingredients. No duplicates.',
    constraints: [
      { kind: 'no_duplicates' },
      { kind: 'min_ingredients', count: 4 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('nori', 'rice_white', 'salmon', 'avocado'),
  },
  {
    title: 'Egg in the Middle',
    description: 'Tamago must be on the plate, and no more than five ingredients.',
    constraints: [
      { kind: 'must_include', ingredientId: 'tamago' },
      { kind: 'max_ingredients', count: 5 },
    ],
    solution: s('tamago', 'rice_white', 'nori', 'sesame'),
  },
  {
    title: 'A Little Luxury',
    description: 'The plate must be worth at least 20 coins.',
    constraints: [{ kind: 'min_value', value: 20 }],
    solution: s('scallop', 'ikura'),
  },
  {
    title: 'Buttery Value',
    description: 'At least 30 coins of ingredients, no more than three pieces.',
    constraints: [
      { kind: 'min_value', value: 30 },
      { kind: 'max_ingredients', count: 3 },
    ],
    solution: s('wagyu', 'truffle'),
  },
  {
    title: 'Three Coins of Flavor',
    description: 'Three ingredients worth at least 25 coins.',
    constraints: [
      { kind: 'min_value', value: 25 },
      { kind: 'min_ingredients', count: 3 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('scallop', 'salmon', 'avocado'),
  },
  {
    title: 'Pearl Value',
    description: 'A small plate with at least 35 coins of flavor.',
    constraints: [
      { kind: 'min_value', value: 35 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('ikura', 'uni', 'avocado'),
  },
  {
    title: 'Golden Pantry',
    description: 'Four premium ingredients, at least 50 coins.',
    constraints: [
      { kind: 'min_value', value: 50 },
      { kind: 'min_ingredients', count: 4 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('wagyu', 'truffle', 'uni', 'ikura'),
  },
  {
    title: 'Glazed Wealth',
    description: 'At least 40 coins and absolutely no wasabi.',
    constraints: [
      { kind: 'min_value', value: 40 },
      { kind: 'forbid_ingredient', ingredientId: 'wasabi' },
    ],
    solution: s('eel', 'scallop', 'ikura', 'tamago'),
  },
  {
    title: 'Four Little Fortunes',
    description: 'Four ingredients and at least 30 coins in value.',
    constraints: [
      { kind: 'min_value', value: 30 },
      { kind: 'min_ingredients', count: 4 },
    ],
    solution: s('salmon', 'tuna', 'ikura', 'rice_white'),
  },
  {
    title: 'No Duplicates, Big Value',
    description: 'Three distinct ingredients worth at least 45 coins.',
    constraints: [
      { kind: 'min_value', value: 45 },
      { kind: 'no_duplicates' },
    ],
    solution: s('wagyu', 'scallop', 'ikura'),
  },
  {
    title: 'Two Fish, One Fortune',
    description: 'At least two fish and 20 coins of value.',
    constraints: [
      { kind: 'min_value', value: 20 },
      { kind: 'category_count', category: 'fish', count: 2 },
    ],
    solution: s('scallop', 'tuna', 'avocado'),
  },
  {
    title: 'The Grand Pantry',
    description: 'Four ingredients, at least 60 coins. The pantry is open.',
    constraints: [
      { kind: 'min_value', value: 60 },
      { kind: 'min_ingredients', count: 4 },
      { kind: 'max_ingredients', count: 5 },
    ],
    solution: s('wagyu', 'truffle', 'uni', 'ikura'),
  },
  {
    title: 'No Spice Today',
    description: 'At least two ingredients, but nothing spicy.',
    constraints: [
      { kind: 'forbid_tag', tag: 'spicy' },
      { kind: 'min_ingredients', count: 2 },
    ],
    solution: s('salmon', 'rice_white', 'avocado'),
  },
  {
    title: 'Wasabi Free',
    description: 'No wasabi and no more than three pieces.',
    constraints: [
      { kind: 'forbid_ingredient', ingredientId: 'wasabi' },
      { kind: 'max_ingredients', count: 3 },
    ],
    solution: s('tuna', 'rice_white', 'nori'),
  },
  {
    title: 'Mango Mission',
    description: 'Mango must be there. Bring two friends.',
    constraints: [
      { kind: 'must_include', ingredientId: 'mango' },
      { kind: 'min_ingredients', count: 3 },
    ],
    solution: s('mango', 'shrimp', 'rice_white'),
  },
  {
    title: 'Truffle Treat',
    description: 'Truffle is required, and the plate must be worth 40 coins.',
    constraints: [
      { kind: 'must_include', ingredientId: 'truffle' },
      { kind: 'min_value', value: 40 },
    ],
    solution: s('truffle', 'wagyu'),
  },
  {
    title: 'No Cream, Please',
    description: 'Nothing creamy. Three ingredients at least.',
    constraints: [
      { kind: 'forbid_tag', tag: 'dairy' },
      { kind: 'min_ingredients', count: 3 },
    ],
    solution: s('salmon', 'rice_white', 'cucumber'),
  },
  {
    title: 'Crab-Free Classic',
    description: 'No crab, no more than four ingredients.',
    constraints: [
      { kind: 'forbid_ingredient', ingredientId: 'crab' },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('tuna', 'rice_white', 'nori', 'avocado'),
  },
  {
    title: 'Uni Unites',
    description: 'Uni must be on the plate, with at most four ingredients.',
    constraints: [
      { kind: 'must_include', ingredientId: 'uni' },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('uni', 'rice_white', 'nori', 'sesame'),
  },
  {
    title: 'No Sweetness',
    description: 'Avoid anything sweet and use at least three ingredients.',
    constraints: [
      { kind: 'forbid_tag', tag: 'sweet' },
      { kind: 'min_ingredients', count: 3 },
    ],
    solution: s('tuna', 'rice_white', 'cucumber', 'nori'),
  },
  {
    title: 'Sakura Leaf',
    description: 'A sakura leaf, pink rice, and no duplicates.',
    constraints: [
      { kind: 'must_include', ingredientId: 'seasonal_leaf' },
      { kind: 'no_duplicates' },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('seasonal_leaf', 'rice_pink', 'salmon', 'avocado'),
  },
  {
    title: 'No Cream Cheese',
    description: 'No cream cheese, and at least two fish.',
    constraints: [
      { kind: 'forbid_ingredient', ingredientId: 'cream_cheese' },
      { kind: 'category_count', category: 'fish', count: 2 },
    ],
    solution: s('salmon', 'tuna', 'avocado', 'rice_white'),
  },
  {
    title: 'Fish Trio',
    description: 'Only fish, no more than three pieces.',
    constraints: [
      { kind: 'only_category', category: 'fish' },
      { kind: 'max_ingredients', count: 3 },
    ],
    solution: s('salmon', 'tuna', 'scallop'),
  },
  {
    title: 'Avocado Garden',
    description: 'Only vegetables, avocado included.',
    constraints: [
      { kind: 'only_category', category: 'vegetable' },
      { kind: 'must_include', ingredientId: 'avocado' },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('avocado', 'cucumber', 'mango', 'carrot'),
  },
  {
    title: 'Rainbow Precision',
    description: 'Make the Rainbow Roll exactly, with no duplicates.',
    constraints: [
      { kind: 'exact_recipe', recipeId: 'rainbow_roll' },
      { kind: 'no_duplicates' },
    ],
    solution: r('rainbow_roll'),
  },
  {
    title: 'Golden Boat',
    description: 'Uni Gunkan, exactly. The nori must not wobble.',
    constraints: [
      { kind: 'exact_recipe', recipeId: 'uni_gunkan' },
      { kind: 'max_ingredients', count: 3 },
    ],
    solution: r('uni_gunkan'),
  },
  {
    title: 'Two Fish Fortune',
    description: 'Fifty coins of value, two fish, no more than four pieces.',
    constraints: [
      { kind: 'min_value', value: 50 },
      { kind: 'category_count', category: 'fish', count: 2 },
      { kind: 'max_ingredients', count: 4 },
    ],
    solution: s('scallop', 'ikura', 'tuna', 'wagyu'),
  },
  {
    title: 'Truffle & Spice-Free',
    description: 'Must include truffle, no spicy ingredients, at least three pieces.',
    constraints: [
      { kind: 'forbid_tag', tag: 'spicy' },
      { kind: 'must_include', ingredientId: 'truffle' },
      { kind: 'min_ingredients', count: 3 },
    ],
    solution: s('truffle', 'wagyu', 'rice_black'),
  },
  {
    title: 'Four Friends',
    description: 'Two vegetables, two fish, five pieces maximum.',
    constraints: [
      { kind: 'category_count', category: 'vegetable', count: 2 },
      { kind: 'category_count', category: 'fish', count: 2 },
      { kind: 'max_ingredients', count: 5 },
    ],
    solution: s('salmon', 'tuna', 'avocado', 'cucumber'),
  },
  {
    title: 'Iridescent Ikura',
    description: 'Ikura is required, nori is forbidden, and the value is at least 40.',
    constraints: [
      { kind: 'must_include', ingredientId: 'ikura' },
      { kind: 'forbid_ingredient', ingredientId: 'nori' },
      { kind: 'min_value', value: 40 },
    ],
    solution: s('ikura', 'uni', 'wagyu'),
  },
  {
    title: 'Crown Exact',
    description: 'The Golden Tuna Crown, no additions, no omissions.',
    constraints: [
      { kind: 'exact_recipe', recipeId: 'golden_tuna' },
      { kind: 'no_duplicates' },
    ],
    solution: r('golden_tuna'),
  },
  {
    title: 'The Golden Pantry',
    description: 'Four pieces, at least 70 coins. Only the very best.',
    constraints: [
      { kind: 'min_value', value: 70 },
      { kind: 'min_ingredients', count: 4 },
      { kind: 'max_ingredients', count: 5 },
    ],
    solution: s('wagyu', 'truffle', 'uni', 'ikura'),
  },
];

const COMMON_PANTRY = [
  'rice_white',
  'rice_brown',
  'nori',
  'sesame',
  'salmon',
  'tuna',
  'shrimp',
  'avocado',
  'cucumber',
  'carrot',
  'tamago',
  'wasabi',
  'ginger',
  'mango',
  'cream_cheese',
  'scallop',
  'teriyaki',
  'spicy_mayo',
];

const PREMIUM_PANTRY = ['rice_black', 'rice_seasoned', 'rice_pink', 'ikura', 'uni', 'wagyu', 'truffle', 'seasonal_leaf'];

export const PUZZLE_LEVELS: PuzzleLevel[] = blueprint.map((entry, index) => {
  const number = index + 1;
  const difficulty = Math.min(5, 1 + Math.floor(index / 10));
  const solutionIds = entry.solution.map((item) => item.id);
  const pantry = new Set([...solutionIds, ...COMMON_PANTRY, ...(difficulty >= 3 ? PREMIUM_PANTRY : [])]);
  const knownIds = new Set(INGREDIENTS.map((item) => item.id));
  const allowedIngredients = [...pantry].filter((id) => knownIds.has(id));
  return {
    id: `puzzle_${String(number).padStart(2, '0')}`,
    number,
    title: entry.title,
    description: entry.description,
    difficulty,
    constraints: entry.constraints,
    allowedIngredients,
    solution: entry.solution,
    rewardCoins: 20 + difficulty * 10,
  };
});

export const PUZZLE_BY_NUMBER = new Map(PUZZLE_LEVELS.map((level) => [level.number, level]));
export const PUZZLE_BY_ID = new Map(PUZZLE_LEVELS.map((level) => [level.id, level]));
