import type { Ingredient, InventoryEntry, RecipeIngredient, SaveGame } from '@/types/game';
import { INGREDIENTS, STARTER_INGREDIENTS, ingredientById } from '@/data/ingredients';
import { UPGRADES } from '@/data/upgrades';

export const BASE_INVENTORY_SLOTS = 12;

export const getUpgradeLevel = (save: SaveGame, upgradeId: string): number =>
  save.restaurant.upgrades[upgradeId] ?? 0;

export const getUpgradeEffect = (
  save: SaveGame,
  effect: (typeof UPGRADES)[number]['effect'],
): number =>
  UPGRADES.filter((upgrade) => upgrade.effect === effect).reduce(
    (sum, upgrade) => sum + getUpgradeLevel(save, upgrade.id) * upgrade.effectPerLevel,
    0,
  );

export const inventoryCapacity = (save: SaveGame): number => {
  const storage = UPGRADES.find((upgrade) => upgrade.id === 'storage');
  const fridge = UPGRADES.find((upgrade) => upgrade.id === 'fridge');
  const storageBonus = storage ? getUpgradeLevel(save, storage.id) * storage.effectPerLevel : 0;
  const fridgeBonus = fridge ? getUpgradeLevel(save, fridge.id) * fridge.effectPerLevel : 0;
  return BASE_INVENTORY_SLOTS + storageBonus + fridgeBonus;
};

export const usedInventorySlots = (save: SaveGame): number =>
  Object.values(save.inventory).filter((entry) => entry.quantity > 0).length;

export const freshnessDecay = (save: SaveGame, ingredient: Ingredient): number => {
  if (!ingredient.perishable) return 0;
  const protection = getUpgradeEffect(save, 'freshness_protection');
  return Math.max(1, 3 - protection);
};

export const starterInventory = (): Record<string, InventoryEntry> => {
  const inventory: Record<string, InventoryEntry> = {};
  STARTER_INGREDIENTS.forEach((id) => {
    const ingredient = ingredientById(id);
    if (!ingredient) return;
    inventory[id] = {
      quantity: ingredient.premium ? 2 : ingredient.category === 'rice' || id === 'nori' ? 8 : 4,
      freshness: 100,
    };
  });
  return inventory;
};

export const ingredientUnlocked = (save: SaveGame, ingredient: Ingredient): boolean =>
  ingredient.unlockLevel <= save.player.level || save.bonusIngredients.includes(ingredient.id);

export const availableIngredients = (save: SaveGame): Ingredient[] =>
  INGREDIENTS.filter((ingredient) => ingredientUnlocked(save, ingredient));

export const shopPrice = (save: SaveGame, ingredient: Ingredient): number => {
  const kenjiLevel = save.staff.hired.includes('kenji') ? 1 : 0;
  const discount = kenjiLevel * 0.1;
  return Math.max(1, Math.round(ingredient.price * (1 - discount)));
};

export const canBuyIngredient = (
  save: SaveGame,
  ingredientId: string,
  quantity = 1,
): { ok: boolean; reason?: string; cost: number } => {
  const ingredient = ingredientById(ingredientId);
  if (!ingredient) return { ok: false, reason: 'Unknown ingredient', cost: 0 };
  if (!ingredientUnlocked(save, ingredient)) return { ok: false, reason: 'Not unlocked yet', cost: 0 };
  const entry = save.inventory[ingredientId];
  if ((!entry || entry.quantity <= 0) && usedInventorySlots(save) >= inventoryCapacity(save)) {
    return { ok: false, reason: 'Inventory is full', cost: 0 };
  }
  const cost = shopPrice(save, ingredient) * quantity;
  if (save.player.coins < cost) return { ok: false, reason: 'Not enough coins', cost };
  return { ok: true, cost };
};

export const buyIngredient = (
  save: SaveGame,
  ingredientId: string,
  quantity = 1,
): { ok: boolean; reason?: string; spent: number } => {
  const check = canBuyIngredient(save, ingredientId, quantity);
  if (!check.ok) return { ok: false, reason: check.reason, spent: 0 };
  const existing = save.inventory[ingredientId];
  const ingredient = ingredientById(ingredientId);
  save.player.coins -= check.cost;
  save.stats.coinsSpent += check.cost;
  save.stats.ingredientsBought += quantity;
  save.inventory[ingredientId] = existing
    ? { quantity: existing.quantity + quantity, freshness: Math.max(existing.freshness, ingredient?.perishable ? 70 : 100) }
    : { quantity, freshness: 100 };
  return { ok: true, spent: check.cost };
};

export const hasIngredients = (
  save: SaveGame,
  ingredients: RecipeIngredient[],
  free = false,
): { ok: boolean; missing: string[] } => {
  if (free) return { ok: true, missing: [] };
  const missing: string[] = [];
  ingredients.forEach((item) => {
    const entry = save.inventory[item.id];
    if (!entry || entry.quantity < item.qty) missing.push(item.id);
  });
  return { ok: missing.length === 0, missing };
};

export const averageFreshness = (save: SaveGame, ingredients: RecipeIngredient[], free = false): number => {
  if (ingredients.length === 0) return 100;
  if (free) return 100;
  const values = ingredients.map((item) => {
    const entry = save.inventory[item.id];
    if (!entry) return 100;
    return entry.freshness;
  });
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const consumeIngredients = (
  save: SaveGame,
  ingredients: RecipeIngredient[],
  free = false,
): { ok: boolean; missing: string[] } => {
  const check = hasIngredients(save, ingredients, free);
  if (!check.ok || free) return check;
  ingredients.forEach((item) => {
    const entry = save.inventory[item.id];
    const ingredient = ingredientById(item.id);
    if (!entry || !ingredient) return;
    entry.quantity = Math.max(0, entry.quantity - item.qty);
    entry.freshness = Math.max(20, entry.freshness - freshnessDecay(save, ingredient));
  });
  return { ok: true, missing: [] };
};

export const quickBuyCost = (save: SaveGame, ingredients: RecipeIngredient[]): number => {
  let cost = 0;
  ingredients.forEach((item) => {
    const entry = save.inventory[item.id];
    const missing = Math.max(0, item.qty - (entry?.quantity ?? 0));
    if (missing > 0) {
      const ingredient = ingredientById(item.id);
      if (ingredient) cost += shopPrice(save, ingredient) * missing;
    }
  });
  return cost;
};

export const restoreStock = (save: SaveGame, ingredients: RecipeIngredient[]): { ok: boolean; spent: number } => {
  let spent = 0;
  for (const item of ingredients) {
    const entry = save.inventory[item.id];
    const missing = Math.max(0, item.qty - (entry?.quantity ?? 0));
    if (missing === 0) continue;
    const result = buyIngredient(save, item.id, missing);
    if (!result.ok) return { ok: false, spent };
    spent += result.spent;
  }
  return { ok: true, spent };
};
