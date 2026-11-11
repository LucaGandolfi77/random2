import type { Customer, DailySpecial, GradeName, Recipe, SaveGame } from '@/types/game';
import { RECIPES } from '@/data/recipes';
import { CUSTOMERS } from '@/data/customers';
import { createRng, pick, shuffle } from '@/utils/rng';
import { customerAllergenConflict } from '@/game/economy/rewards';
import { parseDateKey, yesterdayKey } from '@/utils/dates';

const GRADE_RANK: Record<GradeName, number> = {
  Normal: 0,
  Good: 1,
  Delicious: 2,
  Perfect: 3,
  Masterpiece: 4,
};

export const gradeAtLeast = (grade: GradeName, target: GradeName): boolean =>
  GRADE_RANK[grade] >= GRADE_RANK[target];

export const createDailySpecial = (dateKey: string): DailySpecial => {
  const rng = createRng(`daily-special:${dateKey}`);
  const recipes = shuffle(RECIPES, rng);
  const customers = shuffle(CUSTOMERS, rng);
  let recipe: Recipe | undefined;
  let customer: Customer | undefined;
  for (const candidate of recipes) {
    const compatible = customers.find((entry) => customerAllergenConflict(entry, candidate).length === 0);
    if (compatible) {
      recipe = candidate;
      customer = compatible;
      break;
    }
  }
  if (!recipe) recipe = RECIPES[0]!;
  if (!customer) customer = CUSTOMERS[0]!;
  const miniGameId = pick(recipe.requiredMiniGames, rng) ?? recipe.requiredMiniGames[0] ?? 'perfect_rice';
  const targets: GradeName[] = recipe.difficulty >= 4 ? ['Good', 'Delicious'] : ['Good', 'Delicious', 'Perfect'];
  const targetGrade = pick(targets, rng) ?? 'Good';
  return {
    dateKey,
    recipeId: recipe.id,
    customerId: customer.id,
    miniGameId,
    targetGrade,
    rewardCoins: 40 + recipe.difficulty * 12,
    rewardPearls: recipe.difficulty >= 4 ? 2 : 1,
    objective: `Make ${recipe.name} for ${customer.name} and earn at least a ${targetGrade} grade.`,
  };
};

export const syncDailyState = (save: SaveGame, todayKey: string): void => {
  if (save.daily.dateKey !== todayKey) {
    save.daily = {
      dateKey: todayKey,
      completed: false,
      streak: save.daily.streak,
      lastCompletedDate: save.daily.lastCompletedDate,
    };
  }
};

export const markDailyComplete = (
  save: SaveGame,
  special: DailySpecial,
  grade: GradeName,
  todayKey: string,
): { completed: boolean; streak: number; alreadyDone: boolean } => {
  if (save.daily.completed && save.daily.dateKey === todayKey) {
    return { completed: false, streak: save.daily.streak, alreadyDone: true };
  }
  if (!gradeAtLeast(grade, special.targetGrade)) {
    return { completed: false, streak: save.daily.streak, alreadyDone: false };
  }
  const continues = save.daily.lastCompletedDate === yesterdayKey(parseDateKey(todayKey));
  const streak = continues ? save.daily.streak + 1 : 1;
  save.daily.completed = true;
  save.daily.dateKey = todayKey;
  save.daily.streak = streak;
  save.daily.bestGrade = grade;
  save.daily.lastCompletedDate = todayKey;
  return { completed: true, streak, alreadyDone: false };
};
