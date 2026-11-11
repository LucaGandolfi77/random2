import { describe, expect, it } from 'vitest';
import { createTestSave } from './helpers';
import {
  availableDecorationCount,
  buyDecoration,
  buyUpgrade,
  decorationAmbiance,
  flipDecoration,
  hireStaff,
  ownedDecorationCount,
  placeDecoration,
  placedDecorationCount,
  removeDecoration,
  restaurantTier,
} from '@/game/restaurant/decor';
import { getUpgradeEffect, inventoryCapacity } from '@/game/ingredient-system/stock';

describe('restaurant upgrades and decorations', () => {
  it('buys and places a decoration copy', () => {
    const save = createTestSave({ coins: 500 });
    expect(ownedDecorationCount(save, 'sign_open')).toBe(1);
    expect(placedDecorationCount(save, 'sign_open')).toBe(1);
    expect(availableDecorationCount(save, 'sign_open')).toBe(0);
    const missing = placeDecoration(save, 'sign_open', 25, 30);
    expect(missing.ok).toBe(false);
    const bought = buyDecoration(save, 'sign_open');
    expect(bought.ok).toBe(true);
    expect(availableDecorationCount(save, 'sign_open')).toBe(1);
    const placed = placeDecoration(save, 'sign_open', 25, 30);
    expect(placed.ok).toBe(true);
    expect(placed.placed?.x).toBe(25);
    expect(save.stats.decorationsPlaced).toBe(1);
    expect(decorationAmbiance(save)).toBeGreaterThan(0);
    removeDecoration(save, placed.placed!.uid);
    expect(availableDecorationCount(save, 'sign_open')).toBe(1);
  });

  it('refuses locked or unaffordable decorations', () => {
    const save = createTestSave({ coins: 1 });
    expect(buyDecoration(save, 'sign_lucky_cat').ok).toBe(false);
    save.player.coins = 5000;
    save.player.level = 1;
    expect(buyDecoration(save, 'sign_lucky_cat').ok).toBe(false);
    save.player.level = 5;
    expect(buyDecoration(save, 'sign_lucky_cat').ok).toBe(true);
  });

  it('flips placed decorations', () => {
    const save = createTestSave();
    const placed = [...save.restaurant.decorations];
    expect(flipDecoration(save, placed[0]!.uid)).toBe(true);
    expect(save.restaurant.decorations[0]?.flip).toBe(true);
  });

  it('buys upgrades and applies real effects', () => {
    const save = createTestSave({ coins: 2000 });
    const capacityBefore = inventoryCapacity(save);
    expect(buyUpgrade(save, 'fridge').ok).toBe(true);
    expect(inventoryCapacity(save)).toBeGreaterThan(capacityBefore);
    expect(buyUpgrade(save, 'knives').ok).toBe(true);
    expect(getUpgradeEffect(save, 'slice_bonus')).toBe(5);
    expect(buyUpgrade(save, 'knives').ok).toBe(true);
    expect(getUpgradeEffect(save, 'slice_bonus')).toBe(10);
  });

  it('hires staff only once with coins and pearls', () => {
    const save = createTestSave({ coins: 2000, pearls: 10 });
    const result = hireStaff(save, 'ren');
    expect(result.ok).toBe(true);
    expect(save.staff.hired).toContain('ren');
    expect(hireStaff(save, 'ren').ok).toBe(false);
    save.player.pearls = 0;
    expect(hireStaff(save, 'mika').ok).toBe(false);
  });

  it('computes restaurant tiers from reputation', () => {
    const save = createTestSave();
    expect(restaurantTier(save).level).toBe(1);
    save.player.reputation = 70;
    expect(restaurantTier(save).level).toBe(3);
    save.player.reputation = 200;
    expect(restaurantTier(save).level).toBe(5);
  });
});
