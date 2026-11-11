import { expect, test } from '@playwright/test';
import { seedDemoSave } from './helpers';

test('all 12 mini-games mount and return a score', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await seedDemoSave(page);
  await page.goto('/?e2e=1#/zen', { waitUntil: 'networkidle' });
  await expect(page.getByText('Practice the kitchen')).toBeVisible();

  const names = [
    'Perfect Rice',
    'Rice Cooker',
    'Fan the Rice',
    'Perfect Slice',
    'Nori Wrap',
    'Roll Master',
    'Nigiri Master',
    'Wasabi Balance',
    'Plate Art',
    'Quick Service',
    'Tea Master',
    'Delivery Pack',
  ];

  for (const name of names) {
    const tile = page.locator('.practice-tile').filter({ hasText: name }).first();
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    await expect(page.getByRole('dialog', { name })).toBeVisible();
    if (name === 'Perfect Slice') {
      await page.locator('.mg-phaser canvas').waitFor({ state: 'visible', timeout: 15000 });
    }
    await page.getByTestId('auto-finish-minigame').click();
    await expect(page.getByTestId('continue-minigame')).toBeVisible();
    await page.getByTestId('continue-minigame').click();
    await expect(page.getByRole('dialog', { name })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('Zen free kitchen can discover a recipe without an order', async ({ page }) => {
  await page.goto('/?e2e=1#/zen', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open free kitchen' }).click();
  await expect(page.getByText('Zen assembly board')).toBeVisible();
  await page.getByRole('button', { name: 'Add White Rice' }).click();
  await page.getByRole('button', { name: 'Add Salmon' }).click();
  await page.getByRole('button', { name: 'Plate this creation' }).click();
  await page.getByRole('button', { name: 'Serve this plate' }).click();
  await expect(page.getByText('A little creation')).toBeVisible();
  await expect(page.getByText('New Recipe!')).toBeVisible();
  await page.getByRole('button', { name: 'Keep cooking' }).click();
  await expect(page.getByText('Zen assembly board')).toBeVisible();
});

test('Lunch Rush can serve an order and return to the run', async ({ page }) => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await seedDemoSave(page);
  await page.goto('/?e2e=1#/rush', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start Lunch Rush' }).click();
  await page.getByRole('button', { name: 'Cook', exact: true }).first().click();
  await page.getByRole('button', { name: /Start cooking/ }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).first().click();
  await page.getByTestId('auto-finish-minigame').click();
  await page.getByTestId('continue-minigame').click();
  await page.getByRole('button', { name: /Go to assembly/ }).click();
  await page.getByRole('button', { name: 'Add White Rice' }).click();
  await page.getByRole('button', { name: 'Add Salmon' }).click();
  await page.getByRole('button', { name: 'Plate this dish' }).click();
  await page.getByRole('button', { name: 'Serve this plate' }).click();
  await expect(page.getByText('Plated & served')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the rush' }).click();
  await expect(page.getByText('Orders on the counter')).toBeVisible();
  await expect(page.locator('.rush-order-card').first()).toBeVisible();
});
