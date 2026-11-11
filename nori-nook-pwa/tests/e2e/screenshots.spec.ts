import { test } from '@playwright/test';
import { dismissPwa, seedDemoSave } from './helpers';

test('capture documentation screenshots', async ({ page }) => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await seedDemoSave(page);
  await dismissPwa(page);

  await page.goto('/?e2e=1#/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.home-hero');
  await dismissPwa(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/home-mobile.png' });

  await page.goto('/?e2e=1#/story', { waitUntil: 'networkidle' });
  await dismissPwa(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/story-mobile.png' });

  await page.goto('/?e2e=1#/restaurant', { waitUntil: 'networkidle' });
  await dismissPwa(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/restaurant-mobile.png' });

  await page.goto('/?e2e=1#/recipes', { waitUntil: 'networkidle' });
  await dismissPwa(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/recipes-mobile.png' });

  await page.goto('/?e2e=1#/events', { waitUntil: 'networkidle' });
  await dismissPwa(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/events-mobile.png' });

  await page.goto('/?e2e=1#/', { waitUntil: 'networkidle' });
  await dismissPwa(page);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Start cooking/ }).click();
  await page.waitForTimeout(300);
  for (let index = 0; index < 2; index += 1) {
    const play = page.getByRole('button', { name: 'Play', exact: true }).first();
    if (!(await play.count())) break;
    await play.click();
    const auto = page.getByTestId('auto-finish-minigame');
    if (await auto.count()) {
      await auto.click();
      await page.getByTestId('continue-minigame').click();
    }
    await page.waitForTimeout(250);
  }
  const goAssembly = page.getByRole('button', { name: /Go to assembly/ });
  if (await goAssembly.count()) await goAssembly.click();
  await page.waitForTimeout(300);
  const addRice = page.getByRole('button', { name: 'Add White Rice' });
  if (await addRice.count()) await addRice.click();
  const addShrimp = page.getByRole('button', { name: 'Add Shrimp' });
  if (await addShrimp.count()) await addShrimp.click();
  await page.waitForTimeout(4500);
  while (await page.locator('.toast__close').count()) {
    await page.locator('.toast__close').first().click().catch(() => undefined);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/kitchen-mobile.png' });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?e2e=1#/', { waitUntil: 'networkidle' });
  await dismissPwa(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/home-desktop.png' });
});
