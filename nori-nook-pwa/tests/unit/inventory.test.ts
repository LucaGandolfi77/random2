import { describe, expect, it } from 'vitest';
import { createTestSave } from './helpers';
import {
  averageFreshness,
  availableIngredients,
  buyIngredient,
  canBuyIngredient,
  consumeIngredients,
  getUpgradeEffect,
  hasIngredients,
  inventoryCapacity,
  quickBuyCost,
  restoreStock,
  shopPrice,
  starterInventory,
  usedInventorySlots,
} from '@/game/ingredient-system/stock';
import { ingredientById } from '@/data/ingredients';

describe('inventory and freshness', () => {
  it('starts with a cozy pantry and open storage', () => {
    const save = createTestSave();
    expect(Object.keys(starterInventory()).length).toBeGreaterThanOrEqual(8);
    expect(usedInventorySlots(save)).toBeGreaterThan(0);
    expect(inventoryCapacity(save)).toBe(12);
    expect(availableIngredients(save).every((ingredient) => ingredient.unlockLevel <= save.player.level)).toBe(true);
  });

  it('buys ingredients and removes coins', () => {
    const save = createTestSave({ level: 2, coins: 100 });
    const before = save.player.coins;
    const result = buyIngredient(save, 'rice_brown', 2);
    expect(result.ok).toBe(true);
    expect(result.spent).toBe(shopPrice(save, ingredientById('rice_brown')!) * 2);
    expect(save.player.coins).toBe(before - result.spent);
    expect(save.inventory.rice_brown?.quantity).toBe(2);
    expect(save.stats.ingredientsBought).toBe(2);
    expect(save.stats.coinsSpent).toBe(result.spent);
  });

  it('applies staff discount to shop prices', () => {
    const save = createTestSave({ level: 3, coins: 100 });
    const noStaff = shopPrice(save, ingredientById('salmon')!);
    save.staff.hired.push('kenji');
    expect(shopPrice(save, ingredientById('salmon')!)).toBeLessThan(noStaff);
  });

  it('enforces storage capacity for new stacks', () => {
    const save = createTestSave({ level: 5, coins: 2000 });
    save.inventory = {};
    const ids = ['rice_white', 'rice_brown', 'rice_seasoned', 'rice_pink', 'rice_black', 'salmon', 'tuna', 'shrimp', 'avocado', 'cucumber', 'nori', 'tamago'];
    ids.forEach((id) => {
      save.inventory[id] = { quantity: 1, freshness: 100 };
    });
    expect(usedInventorySlots(save)).toBe(12);
    const result = buyIngredient(save, 'scallop', 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/full/i);
    const capacity = canBuyIngredient(save, 'scallop', 1);
    expect(capacity.ok).toBe(false);
  });

  it('removes a stack from capacity when consumed to zero', () => {
    const save = createTestSave({ level: 2 });
    save.inventory.salmon = { quantity: 1, freshness: 90 };
    const usedBefore = usedInventorySlots(save);
    consumeIngredients(save, [{ id: 'salmon', qty: 1 }]);
    expect(save.inventory.salmon?.quantity).toBe(0);
    expect(usedInventorySlots(save)).toBe(usedBefore - 1);
  });

  it('never consumes unavailable ingredients silently', () => {
    const save = createTestSave();
    save.inventory.salmon = { quantity: 0, freshness: 100 };
    const check = hasIngredients(save, [{ id: 'salmon', qty: 1 }]);
    expect(check.ok).toBe(false);
    expect(check.missing).toContain('salmon');
    const consumed = consumeIngredients(save, [{ id: 'salmon', qty: 1 }]);
    expect(consumed.ok).toBe(false);
  });

  it('reduces freshness gradually with a floor and respects upgrades', () => {
    const save = createTestSave();
    save.inventory.salmon = { quantity: 10, freshness: 80 };
    consumeIngredients(save, [{ id: 'salmon', qty: 1 }]);
    expect(save.inventory.salmon?.freshness).toBeLessThan(80);
    expect(save.inventory.salmon?.freshness).toBeGreaterThanOrEqual(20);

    const protectedSave = createTestSave();
    protectedSave.restaurant.upgrades.cutting_board = 2;
    protectedSave.inventory.salmon = { quantity: 10, freshness: 80 };
    consumeIngredients(protectedSave, [{ id: 'salmon', qty: 1 }]);
    expect(protectedSave.inventory.salmon?.freshness).toBeGreaterThan(save.inventory.salmon?.freshness ?? 0);
    expect(getUpgradeEffect(protectedSave, 'freshness_protection')).toBe(2);
  });

  it('computes freshness and quick restock costs', () => {
    const save = createTestSave({ coins: 100 });
    save.inventory.salmon = { quantity: 0, freshness: 50 };
    const dish = [
      { id: 'rice_white', qty: 1 },
      { id: 'salmon', qty: 2 },
    ];
    expect(quickBuyCost(save, dish)).toBe(shopPrice(save, ingredientById('salmon')!) * 2);
    const restored = restoreStock(save, dish);
    expect(restored.ok).toBe(true);
    expect(save.inventory.salmon?.quantity).toBe(2);
    expect(averageFreshness(save, dish)).toBeGreaterThan(0);
  });
});
