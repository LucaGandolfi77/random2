import { expect, test } from '@playwright/test';
import { seedDemoSave } from './helpers';
import { createDailySpecial } from '../../src/game/events/daily';
import { dateKey } from '../../src/utils/dates';
import { ingredientById } from '../../src/data/ingredients';

test('the chef challenge can be completed and cleared', async ({ page }) => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await seedDemoSave(page);
  await page.goto('/?e2e=1#/chef', { waitUntil: 'networkidle' });
  const chef = page.locator('.chef-card').filter({ hasText: 'Chef Tora' });
  await chef.getByRole('button', { name: /Accept challenge|Challenge again/ }).click();
  await expect(page).toHaveURL(/#\/kitchen/);
  await page.getByRole('button', { name: /Start cooking/ }).click();
  for (let index = 0; index < 4; index += 1) {
    const play = page.getByRole('button', { name: 'Play', exact: true }).first();
    if (!(await play.count())) break;
    await play.click();
    await page.getByTestId('auto-finish-minigame').click();
    await page.getByTestId('continue-minigame').click();
  }
  await page.getByRole('button', { name: /Go to assembly/ }).click();
  for (const name of ['Nori', 'White Rice', 'Eel', 'Avocado', 'Teriyaki']) {
    await page.getByRole('button', { name: `Add ${name}` }).click();
  }
  await page.getByRole('button', { name: 'Plate this dish' }).click();
  await page.getByRole('button', { name: 'Serve this plate' }).click();
  await expect(page.getByText('Plated & served')).toBeVisible();
  await expect(page.getByText('Chef challenge cleared')).toBeVisible();
  await expect(page.getByText('Chef Tora nods')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the chefs' }).click();
  await expect(page.locator('.chef-card').filter({ hasText: 'Chef Tora' }).getByText('Cleared')).toBeVisible();
});

test('the daily special can be completed for the day', async ({ page }) => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await seedDemoSave(page);
  const special = createDailySpecial(dateKey());
  await page.goto('/?e2e=1#/daily', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cook the Daily Special' }).click();
  await page.getByRole('button', { name: /Start cooking/ }).click();
  for (let index = 0; index < 4; index += 1) {
    const play = page.getByRole('button', { name: 'Play', exact: true }).first();
    if (!(await play.count())) break;
    await play.click();
    await page.getByTestId('auto-finish-minigame').click();
    await page.getByTestId('continue-minigame').click();
  }
  await page.getByRole('button', { name: /Go to assembly/ }).click();
  const recipe = (await import('../../src/data/recipes')).recipeById(special.recipeId)!;
  for (const item of recipe.ingredients) {
    const name = ingredientById(item.id)?.name ?? item.id;
    await page.getByRole('button', { name: `Add ${name}` }).click();
  }
  await page.getByRole('button', { name: 'Plate this dish' }).click();
  await page.getByRole('button', { name: 'Serve this plate' }).click();
  await expect(page.getByText('Plated & served')).toBeVisible();
  await expect(page.getByText('Daily complete')).toBeVisible();
  await page.getByRole('button', { name: 'Back to events' }).click();
  await expect(page.getByRole('heading', { name: 'Events & Missions' })).toBeVisible();
});
