import { expect, test } from '@playwright/test';
import { seedDemoSave } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await seedDemoSave(page);
});

test('Lunch Rush starts a real run and opens an order', async ({ page }) => {
  await page.goto('/?e2e=1#/rush', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Lunch Rush' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Lunch Rush' }).click();
  await expect(page.getByText('Orders on the counter')).toBeVisible();
  await page.getByRole('button', { name: 'Cook', exact: true }).first().click();
  await expect(page).toHaveURL(/#\/kitchen/);
  await expect(page.getByText('Story order').or(page.getByText('Lunch rush'))).toBeVisible();
  await expect(page.getByRole('button', { name: /Start cooking/ })).toBeVisible();
});

test('Endless and Delivery modes can take an order', async ({ page }) => {
  await page.goto('/?e2e=1#/endless', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open the counter' }).click();
  await page.getByRole('button', { name: 'Take the next order' }).click();
  await expect(page).toHaveURL(/#\/kitchen/);

  await page.goto('/?e2e=1&fresh=delivery#/delivery', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start delivering' }).click();
  await page.getByRole('button', { name: 'Prepare next delivery' }).click();
  await expect(page).toHaveURL(/#\/kitchen/);
});

test('Chef, Zen, Daily, Merge and Studio entry points work', async ({ page }) => {
  await page.goto('/?e2e=1#/chef', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Accept challenge|Challenge again/ }).first().click();
  await expect(page).toHaveURL(/#\/kitchen/);

  await page.goto('/?e2e=1#/zen', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open free kitchen' }).click();
  await expect(page).toHaveURL(/#\/kitchen/);

  await page.goto('/?e2e=1#/daily', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cook the Daily Special' }).click();
  await expect(page).toHaveURL(/#\/kitchen/);

  await page.goto('/?e2e=1#/merge', { waitUntil: 'networkidle' });
  await expect(page.locator('.merge-board')).toBeVisible();
  await page.getByRole('button', { name: 'Finish run' }).click();
  await expect(page.getByText('A lovely little chain')).toBeVisible();

  await page.goto('/?e2e=1#/studio', { waitUntil: 'networkidle' });
  await expect(page.locator('.studio-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByText('A photo for the little wall')).toBeVisible();
});
