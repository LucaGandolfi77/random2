import { expect, test } from '@playwright/test';

test('main menu and navigation render without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('.brand__title')).toContainText('HYPE');
  await expect(page.getByRole('button', { name: /COMBATTIMENTO RAPIDO/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /ALLENAMENTO/ })).toBeVisible();

  await page.getByRole('button', { name: /IMPOSTAZIONI/ }).click();
  await expect(page.getByText("CALIBRA L'ESPERIENZA")).toBeVisible();
  await page.getByRole('button', { name: 'P2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'COMANDI' })).toBeVisible();
  await page.getByRole('button', { name: /Indietro/ }).click();
  await expect(page.locator('.brand__title')).toContainText('HYPE');

  expect(errors).toEqual([]);
});

test('quick match reaches the playable arena', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await page.getByRole('button', { name: /COMBATTIMENTO RAPIDO/ }).click();
  await expect(page.locator('.select-grid .fighter-card').first()).toBeVisible();

  await page.locator('.select-grid .fighter-card').nth(0).click();
  await page.getByRole('button', { name: 'AVANTI', exact: true }).click();
  await page.locator('.select-grid .fighter-card').nth(1).click();
  await page.getByRole('button', { name: /CONFERMA|AVANTI/ }).click();

  await expect(page.locator('.stage-card').first()).toBeVisible();
  await page.getByRole('button', { name: 'COMBATTI', exact: true }).click();
  await expect(page.locator('.loading-screen')).toBeVisible();
  await expect(page.locator('.fight-canvas')).toBeVisible({ timeout: 45000 });
  await expect(page.locator('.hud-timer')).toBeVisible({ timeout: 45000 });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(1200);
  await expect(page.locator('.hud-health').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/arena.png', fullPage: false });

  const fatal = errors.filter((message) => !message.includes('WebGPU') && !message.includes('GPU'));
  expect(fatal).toEqual([]);
});

test('two clients can create, join and start an online match', async ({ browser }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  const openClient = async () => {
    const page = await browser.newPage({
      viewport: { width: 900, height: 600 }
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        'hypeko.settings.v1',
        JSON.stringify({
          quality: 'low',
          showHints: false,
          touchControls: 'off',
          masterVolume: 0,
          musicVolume: 0,
          sfxVolume: 0
        })
      );
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    return page;
  };

  const a = await openClient();
  await a.locator('.mode-button').nth(5).click();
  await a.locator('.online-lobby .fighter-card').nth(2).click();
  await a.locator('.online-actions .neon-button').click();
  await a.locator('.online-code strong').waitFor();
  const code = (await a.locator('.online-code strong').textContent())?.trim();
  expect(code).toHaveLength(4);

  const b = await openClient();
  await b.locator('.mode-button').nth(5).click();
  await b.getByRole('button', { name: 'ENTRA CON CODICE' }).click();
  await b.locator('.online-field').filter({ hasText: 'CODICE STANZA' }).locator('input').fill(code!);
  await b.locator('.online-lobby .fighter-card').nth(4).click();
  await b.locator('.online-actions .neon-button').click();
  await b.locator('.online-player').filter({ hasText: 'P2' }).first().waitFor();

  await a.locator('.online-room__actions .neon-button').first().click();
  await b.locator('.online-room__actions .neon-button').first().click();

  await expect(a.locator('.fight-canvas')).toBeVisible({ timeout: 60000 });
  await expect(b.locator('.fight-canvas')).toBeVisible({ timeout: 60000 });
  await expect(a.locator('.hud-fighter__name').first()).toContainText('VELVET VERA');
  await expect(b.locator('.hud-fighter__name').first()).toContainText('VELVET VERA');
  expect(errors).toEqual([]);

  await a.close();
  await b.close();
});

test('a tournament bracket is generated for the chosen fighter', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('.mode-button').nth(2).click();
  await page.getByRole('button', { name: 'SCEGLI IL FIGHTER' }).click();
  await page.locator('.select-grid .fighter-card').first().click();
  await page.getByRole('button', { name: /CONFERMA|AVANTI/ }).click();
  await expect(page.locator('.bracket-round')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'COMBATTI', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
