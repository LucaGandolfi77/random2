import type { Page } from '@playwright/test';
import { RECIPES } from '../../src/data/recipes';
import { INGREDIENTS } from '../../src/data/ingredients';
import { DECORATIONS } from '../../src/data/decorations';
import { UPGRADES } from '../../src/data/upgrades';
import { NEIGHBORHOODS } from '../../src/data/story';
import { ACHIEVEMENTS } from '../../src/data/achievements';

export const dismissPwa = async (page: Page): Promise<void> => {
  const close = page.locator('.pwa-banner--offline .pwa-banner__close');
  if (await close.count()) {
    await close.click({ timeout: 2000 }).catch(() => undefined);
  }
};

export const seedDemoSave = async (page: Page): Promise<void> => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.hud');
  const discovered = RECIPES.slice(0, 18).map((recipe) => recipe.id);
  const firstOrders = NEIGHBORHOODS.flatMap((hood) => hood.orders.map((order) => order.id)).slice(0, 10);
  const inventory = Object.fromEntries(
    INGREDIENTS.slice(0, 30).map((ingredient) => [ingredient.id, { quantity: 8, freshness: 100 }]),
  );
  const upgrades = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 3]));
  const ownedDecorations = DECORATIONS.map((decoration) => decoration.id);
  const decorations = [
    { uid: 'demo-lamp', decorationId: 'lamp_paper', x: 12, y: 10, flip: false },
    { uid: 'demo-art', decorationId: 'art_wave_print', x: 36, y: 12, flip: false },
    { uid: 'demo-cat', decorationId: 'sign_lucky_cat', x: 82, y: 12, flip: false },
    { uid: 'demo-plant', decorationId: 'plant_bamboo', x: 10, y: 58, flip: false },
    { uid: 'demo-table', decorationId: 'table_wood', x: 52, y: 63, flip: false },
    { uid: 'demo-chair', decorationId: 'chair_tatami', x: 34, y: 72, flip: false },
    { uid: 'demo-aquarium', decorationId: 'aquarium_small', x: 86, y: 52, flip: false },
    { uid: 'demo-cushion', decorationId: 'cushion_matcha', x: 60, y: 82, flip: false },
    { uid: 'demo-vase', decorationId: 'vase_sakura', x: 70, y: 45, flip: false },
  ];
  const achievements = Object.fromEntries(
    ACHIEVEMENTS.slice(0, 7).map((achievement) => [achievement.id, { unlockedAt: Date.now() - 86400000 }]),
  );
  const date = new Date();
  const weekKey = `${date.getFullYear()}-W${String(Math.ceil(((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)).padStart(2, '0')}`;
  const seed = {
    player: { name: 'Little Chef', level: 5, xp: 430, coins: 1240, pearls: 16, reputation: 78 },
    inventory,
    discoveredRecipes: discovered,
    recipeDiscovery: Object.fromEntries(discovered.map((id, index) => [id, Date.now() - index * 86400000])),
    bonusRecipes: [],
    bonusIngredients: [],
    ownedDecorations,
    customers: {
      haru: { friendship: 10, visits: 8, lastOrder: 'salmon_nigiri' },
      mika: { friendship: 6, visits: 4, lastOrder: 'rainbow_roll' },
      tatsu: { friendship: 4, visits: 3, lastOrder: 'tuna_nigiri' },
      mame: { friendship: 5, visits: 4, lastOrder: 'tamago_nigiri' },
      emma: { friendship: 3, visits: 2 },
      akira: { friendship: 2, visits: 1 },
    },
    restaurant: {
      upgrades,
      decorations,
      style: 'sakura',
    },
    staff: { hired: ['mika', 'ren', 'yuki', 'kenji'] },
    story: {
      completedOrders: firstOrders,
      completedNeighborhoods: ['little_lane', 'sakura_street'],
      seenDialogues: ['haru-1'],
    },
    daily: {
      dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      completed: false,
      streak: 5,
    },
    weekly: { weekKey, progress: {}, claimed: [] },
    events: {
      momiji_market: {
        progress: { autumn_serve: 3, autumn_decor: 1, autumn_perfect: 1 },
        claimed: [],
      },
    },
    achievements,
    modes: {
      puzzles: {
        puzzle_01: { stars: 3, bestScore: 100 },
        puzzle_02: { stars: 2, bestScore: 92 },
        puzzle_03: { stars: 1, bestScore: 80 },
        puzzle_04: { stars: 3, bestScore: 100 },
        puzzle_05: { stars: 2, bestScore: 88 },
      },
      merge: [{ score: 1860, date: Date.now() - 3600000, detail: '18 merges · best combo x7' }],
      endless: [{ score: 760, date: Date.now() - 7200000, detail: '9 orders served' }],
      rush: [{ score: 920, date: Date.now() - 10800000, detail: '7 served · best combo x5' }],
      delivery: [{ score: 640, date: Date.now() - 14400000, detail: '3 bento delivered' }],
      chef: { chef_hoshi: { cleared: true, bestScore: 94 } },
      zenCreations: 3,
    },
    stats: {
      sushiMade: 52,
      nigiriMade: 28,
      customersServed: 42,
      perfects: 18,
      masterpieces: 4,
      coinsEarned: 2480,
      coinsSpent: 1240,
      miniGamesPlayed: 61,
      ingredientsBought: 35,
      decorationsPlaced: 9,
      storyOrders: firstOrders.length,
      rainbowRolls: 2,
      eventMissionsClaimed: 4,
    },
    tutorial: { completed: true, step: 0, skipped: false },
  };

  const written = await page.evaluate(async (payload) => {
    const open = (): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('nori-nook');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const db = await open();
    const transaction = db.transaction('saves', 'readwrite');
    const store = transaction.objectStore('saves');
    const row = await new Promise<{ id: string; updatedAt: number; data: Record<string, unknown> } | undefined>(
      (resolve, reject) => {
        const request = store.get('main');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    if (!row) {
      db.close();
      return false;
    }
    const data = row.data as Record<string, unknown>;
    Object.assign(data, payload);
    await new Promise<void>((resolve, reject) => {
      const request = store.put(row);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
    });
    db.close();
    return true;
  }, seed);
  if (!written) throw new Error('Could not seed the demo save');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.hud');
  await page.waitForTimeout(600);
};

export const readSaveFromIndexedDb = async (page: Page): Promise<Record<string, unknown> | null> =>
  page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nori-nook');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('saves', 'readonly');
    const store = transaction.objectStore('saves');
    const row = await new Promise<{ data: Record<string, unknown> } | undefined>((resolve, reject) => {
      const request = store.get('main');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return row?.data ?? null;
  });
