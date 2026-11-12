import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __NEVE_E_FERRO__?: {
      duration: number;
      seek: (time: number) => void;
      play: () => void;
      pause: () => void;
      getState: () => { time: number; sceneIndex: number; sceneTime: number; playing: boolean; ended: boolean };
      getSceneIndex: () => number;
      getSubtitle: () => { id: string; text: string } | null;
      getAudio: () => { ready: boolean; context: string; sceneIndex: number; level: number };
      getChapter: () => string | null;
    };
  }
}

async function waitForPlayer(page: Page): Promise<void> {
  await page.waitForSelector('.player-screen', { timeout: 45_000 });
  await page.waitForFunction(() => Boolean(window.__NEVE_E_FERRO__), undefined, { timeout: 15_000 });
  await page.waitForTimeout(500);
}

async function startFilm(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('[data-action="watch"]');
  await page.click('[data-action="watch"]');
  await waitForPlayer(page);
}

async function showControls(page: Page): Promise<void> {
  await page.mouse.move(720, 420);
  await page.waitForTimeout(150);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      // Ignore.
    }
  });
  await page.reload();
  await page.waitForSelector('.landing-screen');
});

test('landing e avvio della proiezione', async ({ page }) => {
  await expect(page.locator('.landing-title')).toContainText('NEVE');
  await expect(page.locator('[data-action="watch"]')).toBeVisible();
  await page.click('[data-action="watch"]');
  await waitForPlayer(page);
  const duration = await page.evaluate(() => window.__NEVE_E_FERRO__?.duration);
  expect(duration).toBe(1500);
  const state = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState());
  expect(state?.playing).toBe(true);
  expect(state?.sceneIndex).toBe(0);
  await expect(page.locator('.film-stage')).toBeVisible();
  await page.waitForTimeout(1500);
  const audio = await page.evaluate(() => window.__NEVE_E_FERRO__?.getAudio());
  expect(audio?.ready).toBe(true);
  expect(audio?.context).toBe('running');
  expect(audio?.level).toBeGreaterThan(0.00001);
});

test('pausa congela il tempo e la ripresa lo fa avanzare', async ({ page }) => {
  await startFilm(page);
  await page.evaluate(() => window.__NEVE_E_FERRO__?.pause());
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState().time ?? -1);
  await page.waitForTimeout(1100);
  const after = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState().time ?? -1);
  expect(after).toBeCloseTo(before, 1);
  await page.evaluate(() => window.__NEVE_E_FERRO__?.play());
  await page.waitForTimeout(600);
  const resumed = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState().time ?? -1);
  expect(resumed).toBeGreaterThan(after + 0.2);
});

test('seek, capitoli e sottotitoli', async ({ page }) => {
  await startFilm(page);
  await page.evaluate(() => {
    window.__NEVE_E_FERRO__?.pause();
    window.__NEVE_E_FERRO__?.seek(300);
  });
  await page.waitForTimeout(350);
  const state = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState());
  expect(state?.sceneIndex).toBe(2);
  expect(await page.evaluate(() => window.__NEVE_E_FERRO__?.getChapter())).toBe('Il ballo');

  await showControls(page);
  await page.click('[data-action="chapters"]');
  await expect(page.locator('.chapter-panel')).toBeVisible();
  await page.click('button[data-chapter="3"]');
  await page.waitForTimeout(300);
  const chapterState = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState());
  expect(chapterState?.sceneIndex).toBe(3);
  expect(chapterState?.time).toBeGreaterThanOrEqual(330);

  await showControls(page);
  await page.click('[data-action="subtitles"]');
  await expect(page.locator('.subtitle-layer')).toHaveClass(/is-hidden/);
  await page.click('[data-action="subtitles"]');
  await expect(page.locator('.subtitle-layer')).not.toHaveClass(/is-hidden/);
});

test('fine film e riapertura dalla schermata finale', async ({ page }) => {
  await startFilm(page);
  await page.evaluate(() => {
    window.__NEVE_E_FERRO__?.seek(1499);
    window.__NEVE_E_FERRO__?.play();
  });
  await expect(page.locator('.end-screen')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.end-title')).toContainText('NEVE');
  await page.click('[data-action="replay"]');
  await waitForPlayer(page);
  const state = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState());
  expect(state?.time).toBeLessThan(6);
  expect(state?.sceneIndex).toBe(0);
});

test('salvataggio e ripresa della posizione', async ({ page }) => {
  await startFilm(page);
  await page.evaluate(() => {
    window.__NEVE_E_FERRO__?.pause();
    window.__NEVE_E_FERRO__?.seek(300);
  });
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForSelector('.landing-screen');
  await expect(page.locator('[data-action="resume"]')).toBeVisible();
  await page.click('[data-action="resume"]');
  await waitForPlayer(page);
  const state = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState());
  expect(state?.time).toBeGreaterThan(295);
  expect(state?.time).toBeLessThan(315);
  expect(state?.sceneIndex).toBe(2);
});

test('layout mobile e controlli leggibili', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForSelector('.landing-screen');
  await page.click('[data-action="watch"]');
  await waitForPlayer(page);
  const box = await page.locator('.film-stage').boundingBox();
  expect(box?.width).toBeGreaterThan(300);
  expect(box?.width).toBeLessThanOrEqual(391);
  await showControls(page);
  await expect(page.locator('.player-ui [data-action="play"]')).toBeVisible();
  await expect(page.locator('[data-action="subtitles"]')).toBeVisible();
});

test('nessun errore bloccante in console', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startFilm(page);
  await page.evaluate(() => {
    window.__NEVE_E_FERRO__?.seek(420);
    window.__NEVE_E_FERRO__?.seek(900);
    window.__NEVE_E_FERRO__?.seek(1200);
  });
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
});
