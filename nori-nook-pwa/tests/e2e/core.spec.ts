import { expect, test } from '@playwright/test';

test('first-run tutorial, first order, reward and reload persistence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: "Let's cook" }).click();

  await expect(page).toHaveURL(/#\/kitchen/);
  await page.getByRole('button', { name: /Start cooking/ }).click();
  await expect(page.getByText('Kitchen mini-games')).toBeVisible();

  for (let index = 0; index < 2; index += 1) {
    await page.getByRole('button', { name: 'Play', exact: true }).first().click();
    await expect(page.getByTestId('auto-finish-minigame')).toBeVisible();
    await page.getByTestId('auto-finish-minigame').click();
    await expect(page.getByText('Continue')).toBeVisible();
    await page.getByTestId('continue-minigame').click();
    await expect(page.getByText('Kitchen mini-games')).toBeVisible();
  }

  await page.getByRole('button', { name: /Go to assembly/ }).click();
  await expect(page.getByText('Assembly board')).toBeVisible();
  await page.getByRole('button', { name: 'Add White Rice' }).click();
  await page.getByRole('button', { name: 'Add Salmon' }).click();
  await page.getByRole('button', { name: 'Plate this dish' }).click();
  await expect(page.getByRole('button', { name: 'Serve this plate' })).toBeVisible();
  await page.getByRole('button', { name: 'Serve this plate' }).click();

  await expect(page.getByText('Plated & served')).toBeVisible();
  await expect(page.getByText('Salmon Nigiri').first()).toBeVisible();
  await expect(page.getByText('New Recipe!')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the journey' }).click();
  await expect(page.getByText('Served with love')).toBeVisible();
  await page.waitForTimeout(600);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.hud')).toBeVisible();
  await expect(page.getByText('Served with love')).toBeVisible();
  expect(errors).toEqual([]);
});

test('shop purchase, decoration placement and studio photo persist', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  const { seedDemoSave, readSaveFromIndexedDb } = await import('./helpers');
  await seedDemoSave(page);

  await page.goto('/?e2e=1#/shop', { waitUntil: 'networkidle' });
  await page.waitForSelector('.hud');
  const riceRow = page.locator('.shop-item').filter({ hasText: 'White Rice' }).first();
  await riceRow.getByRole('button', { name: '+1' }).click();
  await expect(page.getByText('Ingredient restocked')).toBeVisible();

  await page.goto('/?e2e=1#/restaurant', { waitUntil: 'networkidle' });
  await page.waitForSelector('.hud');
  await page.locator('.page-head').getByRole('button', { name: 'Decorate' }).click();
  await expect(page.getByText('Decoration storage')).toBeVisible();
  await page.getByRole('button', { name: 'Place Sakura Noren' }).click();
  const scene = page.locator('.restaurant-scene');
  const box = await scene.boundingBox();
  if (!box) throw new Error('Restaurant scene missing');
  await page.mouse.click(box.x + box.width * 0.82, box.y + box.height * 0.76);
  await expect(page.getByText('A lovely new corner')).toBeVisible();

  await page.waitForTimeout(800);
  const saved = await readSaveFromIndexedDb(page);
  const restaurant = saved?.restaurant as { decorations?: Array<{ decorationId: string }> } | undefined;
  expect(restaurant?.decorations?.some((item) => item.decorationId === 'noren_sakura')).toBe(true);

  await page.goto('/?e2e=1#/studio', { waitUntil: 'networkidle' });
  await page.waitForSelector('.studio-canvas');
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.getByText('A photo for the little wall')).toBeVisible();
  await expect(page.locator('.gallery-view img')).toBeVisible();
  await page.getByRole('button', { name: 'Open gallery' }).click();
  await expect(page.getByRole('heading', { name: 'Photo Gallery' })).toBeVisible();
  await expect(page.locator('.gallery-card').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('puzzle screen can be solved and awards stars', async ({ page }) => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  const { seedDemoSave } = await import('./helpers');
  await seedDemoSave(page);
  await page.goto('/?e2e=1#/puzzle', { waitUntil: 'networkidle' });
  await page.waitForSelector('.hud');
  await page.locator('.puzzle-tile').first().click();
  await expect(page.getByText('Puzzle rules')).toBeVisible();
  await page.getByRole('button', { name: 'Add White Rice' }).click();
  await page.getByRole('button', { name: 'Add Salmon' }).click();
  await page.getByRole('button', { name: 'Check the plate' }).click();
  await expect(page.getByText('Plate accepted!')).toBeVisible();
  await expect(page.getByText(/3-star solution/)).toBeVisible();
});
