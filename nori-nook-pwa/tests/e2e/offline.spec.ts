import { expect, test } from '@playwright/test';

test('PWA manifest and service worker make the game offline-ready', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await expect(page.locator('.hud')).toBeVisible();

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    return response.json();
  });
  expect(manifest.name).toContain('Nori Nook');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  expect(manifest.display).toBe('standalone');

  const swActive = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });
  expect(swActive).toBe(true);

  await page.evaluate(async () => {
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  await page.waitForTimeout(800);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.hud')).toBeVisible();
  const skip = page.getByRole('button', { name: 'Skip tutorial' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Recipes' }).click();
  await expect(page.getByRole('heading', { name: 'Recipe Book' })).toBeVisible();
  await expect(page.getByText('Discovery progress')).toBeVisible();
  expect(errors).toEqual([]);
  await context.setOffline(false);
});

test('first load works before the service worker is ready', async ({ page }) => {
  await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
  await expect(page.locator('.hud')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start cooking|Let's cook|Next/ })).toBeVisible();
});
