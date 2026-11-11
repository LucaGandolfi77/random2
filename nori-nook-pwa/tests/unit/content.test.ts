import { describe, expect, it } from 'vitest';
import { RECIPES, recipeById } from '@/data/recipes';
import { INGREDIENTS, ingredientById } from '@/data/ingredients';
import { CUSTOMERS } from '@/data/customers';
import { DECORATIONS } from '@/data/decorations';
import { UPGRADES } from '@/data/upgrades';
import { STAFF } from '@/data/staff';
import { ACHIEVEMENTS } from '@/data/achievements';
import { EVENTS } from '@/data/events';
import { NEIGHBORHOODS } from '@/data/story';
import { CHEF_CHALLENGES } from '@/data/chefs';
import { PUZZLE_LEVELS } from '@/data/puzzles';
import { MINI_GAMES } from '@/data/miniGames';
import { validateContent } from '@/game/sushi-making/match';

describe('content integrity', () => {
  it('contains a complete, consistent recipe set', () => {
    expect(validateContent()).toEqual([]);
    expect(RECIPES.length).toBeGreaterThanOrEqual(24);
    expect(new Set(RECIPES.map((recipe) => recipe.id)).size).toBe(RECIPES.length);
  });

  it('has all 34 ingredients with unique ids and valid art', () => {
    expect(INGREDIENTS.length).toBe(34);
    expect(new Set(INGREDIENTS.map((ingredient) => ingredient.id)).size).toBe(34);
    INGREDIENTS.forEach((ingredient) => {
      expect(ingredient.price).toBeGreaterThan(0);
      expect(ingredient.unlockLevel).toBeGreaterThanOrEqual(1);
    });
  });

  it('references only existing ingredients from customers', () => {
    CUSTOMERS.forEach((customer) => {
      [...customer.preferences, ...customer.dislikes, ...customer.allergies].forEach((id) => {
        expect(ingredientById(id), `${customer.id} -> ${id}`).toBeTruthy();
      });
      if (customer.friendshipGift) {
        expect(DECORATIONS.some((decoration) => decoration.id === customer.friendshipGift)).toBe(true);
      }
    });
  });

  it('has unique decorations, upgrades, staff, achievements and mini-games', () => {
    expect(new Set(DECORATIONS.map((item) => item.id)).size).toBe(DECORATIONS.length);
    expect(new Set(UPGRADES.map((item) => item.id)).size).toBe(UPGRADES.length);
    expect(new Set(STAFF.map((item) => item.id)).size).toBe(STAFF.length);
    expect(new Set(ACHIEVEMENTS.map((item) => item.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(MINI_GAMES.map((item) => item.id)).size).toBe(12);
  });

  it('keeps story references valid', () => {
    const allOrders = new Set<string>();
    NEIGHBORHOODS.forEach((hood) => {
      if (hood.unlockAfter) {
        expect(NEIGHBORHOODS.some((entry) => entry.id === hood.unlockAfter)).toBe(true);
      }
      hood.orders.forEach((order) => {
        expect(allOrders.has(order.id), `duplicate story order ${order.id}`).toBe(false);
        allOrders.add(order.id);
        expect(recipeById(order.recipeId), `missing recipe ${order.recipeId}`).toBeTruthy();
        expect(CUSTOMERS.some((customer) => customer.id === order.customerId)).toBe(true);
      });
      hood.rewardRecipeIds.forEach((id) => expect(recipeById(id)).toBeTruthy());
      hood.rewardDecorationIds.forEach((id) => expect(DECORATIONS.some((item) => item.id === id)).toBe(true));
    });
    expect(NEIGHBORHOODS.length).toBe(8);
    expect(allOrders.size).toBe(40);
  });

  it('keeps event definitions valid', () => {
    const eventIds = new Set<string>();
    EVENTS.forEach((event) => {
      expect(eventIds.has(event.id)).toBe(false);
      eventIds.add(event.id);
      event.recipeIds.forEach((id) => expect(recipeById(id), `${event.id} recipe ${id}`).toBeTruthy());
      event.decorationIds.forEach((id) =>
        expect(DECORATIONS.some((item) => item.id === id), `${event.id} decoration ${id}`).toBe(true),
      );
      event.missions.forEach((mission) => {
        expect(mission.target).toBeGreaterThan(0);
        expect(mission.rewardCoins).toBeGreaterThan(0);
      });
    });
    expect(EVENTS.filter((event) => event.type === 'seasonal')).toHaveLength(4);
    expect(EVENTS.filter((event) => event.type === 'themed')).toHaveLength(10);
  });

  it('has valid chef challenges and 50 puzzle levels', () => {
    CHEF_CHALLENGES.forEach((chef) => {
      expect(recipeById(chef.recipeId)).toBeTruthy();
      expect(chef.timeLimit).toBeGreaterThan(0);
      expect(chef.maxIngredients).toBeGreaterThan(0);
    });
    expect(CHEF_CHALLENGES).toHaveLength(5);
    expect(PUZZLE_LEVELS).toHaveLength(50);
    expect(new Set(PUZZLE_LEVELS.map((level) => level.id)).size).toBe(50);
    expect(new Set(PUZZLE_LEVELS.map((level) => level.number)).size).toBe(50);
  });
});
