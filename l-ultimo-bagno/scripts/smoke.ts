import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'tests/artifacts');
mkdirSync(artifacts, { recursive: true });

const remoteUrl = process.env.SMOKE_URL;
let server: ReturnType<typeof spawn> | null = null;
let baseUrl = remoteUrl ?? 'http://127.0.0.1:4173/';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[];

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const warnings: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForServer(url: string, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Server non raggiungibile: ${url}`);
}

async function ensureServer(): Promise<void> {
  if (remoteUrl) {
    await waitForServer(remoteUrl);
    return;
  }

  if (!existsSync(path.join(root, 'dist/index.html'))) {
    throw new Error('Manca dist/. Esegui prima “npm run build”.');
  }

  server = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      '4173',
      '--strictPort',
    ],
    { cwd: root, stdio: 'ignore' },
  );

  await waitForServer(baseUrl);
}

async function main(): Promise<void> {
  if (!chromePath) {
    throw new Error(
      'Chrome non trovato. Imposta CHROME_PATH o installa Google Chrome per eseguire lo smoke test.',
    );
  }

  await ensureServer();

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-dev-shm-usage',
    ],
  });

  const pageErrors: string[] = [];

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const text = message.text();
        if (!text.includes('WebGL') && !text.includes('GL_')) pageErrors.push(text);
      }
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelector('#loading')?.classList.contains('is-done'),
      null,
      { timeout: 120_000 },
    );
    await page.waitForTimeout(600);

    const state = () =>
      page.evaluate(() => (window as unknown as { __LULTIMO_BAGNO__: { getState: () => Record<string, unknown> } }).__LULTIMO_BAGNO__.getState());
    const audioState = () =>
      page.evaluate(() => (window as unknown as { __LULTIMO_BAGNO__: { audio: () => Record<string, unknown> } }).__LULTIMO_BAGNO__.audio());

    const seek = async (time: number) => {
      await page.evaluate((value) => {
        (window as unknown as { __LULTIMO_BAGNO__: { seek: (time: number) => void } }).__LULTIMO_BAGNO__.seek(value);
      }, time);
    };

    check('Il menu è visibile', await page.locator('#menu').getAttribute('aria-hidden') !== 'true');
    check(
      'Il titolo è presente',
      (await page.locator('.menu__title').innerText()).includes('L’ULTIMO') ||
        (await page.locator('.menu__title').innerText()).includes("L'ULTIMO"),
    );
    await page.screenshot({ path: path.join(artifacts, '01-menu.png') });

    await page.click('#btn-menu-settings');
    check('Il pannello impostazioni si apre dal menu', await page.locator('#settings-panel').isVisible());
    await page.click('#btn-close-settings');
    check('Il pannello impostazioni si chiude', !(await page.locator('#settings-panel').isVisible()));

    await page.click('#btn-watch');
    await page.waitForTimeout(1500);
    let current = await state();
    check('Il film parte dal menu', current.mode === 'film' && current.playing === true);
    check(
      'Il menu viene nascosto',
      (await page.locator('#menu').getAttribute('aria-hidden')) === 'true',
    );

    await page.waitForTimeout(800);
    const audio = await audioState();
    check('Audio inizializzato', audio.initialized === true, String(audio.contextState));
    if (audio.contextState !== 'running') {
      warnings.push(`AudioContext: ${String(audio.contextState)}`);
    }
    warnings.push(`Voci: ${String(audio.voiceStatus)}`);

    const shots: Array<[string, number]> = [
      ['02-atto1.png', 15],
      ['03-atto2.png', 104],
      ['04-parco.png', 190],
      ['05-campagna.png', 265],
      ['06-collina.png', 350],
      ['07-alba.png', 396],
      ['08-bar.png', 432],
      ['09-silenzio.png', 458],
    ];
    for (const [name, time] of shots) {
      await seek(time);
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(artifacts, name) });
    }

    await seek(15);
    await page.waitForTimeout(500);
    check(
      'I sottotitoli compaiono sulla battuta',
      (await page.locator('#subtitles').getAttribute('class'))?.includes('is-visible') === true,
    );

    await seek(25);
    await page.waitForTimeout(350);
    await page.click('#btn-play');
    await page.waitForTimeout(350);
    const pausedA = await state();
    await page.waitForTimeout(700);
    const pausedB = await state();
    check(
      'La pausa ferma la timeline',
      pausedA.playing === false &&
        Math.abs(Number(pausedB.time) - Number(pausedA.time)) < 0.15,
    );
    await page.click('#btn-play');
    await page.waitForTimeout(700);
    const resumed = await state();
    check('La riproduzione riprende', resumed.playing === true && Number(resumed.time) >= Number(pausedB.time));

    await page.click('[data-action="next-act"]');
    await page.waitForTimeout(500);
    const nextAct = await state();
    check('Il salto all’atto successivo funziona', nextAct.act !== 'atto1');
    await page.click('[data-action="prev-act"]');
    await page.waitForTimeout(500);
    const previousAct = await state();
    check('Il salto all’atto precedente funziona', previousAct.act === 'atto1');

    await page.click('[data-action="restart"]');
    await page.waitForTimeout(700);
    check('Il restart riporta all’inizio', Number((await state()).time) < 5);

    await page.keyboard.press('c');
    await page.waitForTimeout(250);
    check(
      'I sottotitoli si disattivano',
      await page.locator('#subtitles').evaluate((el) => el.classList.contains('is-hidden')),
    );
    await page.keyboard.press('c');
    await page.waitForTimeout(250);
    check(
      'I sottotitoli si riattivano',
      !(await page.locator('#subtitles').evaluate((el) => el.classList.contains('is-hidden'))),
    );

    await page.click('#btn-voices');
    await page.waitForTimeout(250);
    check('Le voci si disattivano', (await state()).voices === false);
    await page.click('#btn-voices');
    await page.waitForTimeout(250);
    check('Le voci si riattivano', (await state()).voices === true);

    await page.selectOption('#speed-select', '1.5');
    await page.waitForTimeout(250);
    check('La velocità cambia', Number((await state()).speed) === 1.5);
    await page.selectOption('#speed-select', '1');

    await page.evaluate(() => {
      const input = document.querySelector('#volume') as HTMLInputElement;
      input.value = '50';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    check('Il volume si regola', Math.abs(Number((await state()).volume) - 0.5) < 0.01);
    await page.click('#btn-mute');
    await page.waitForTimeout(200);
    check('Il muto si attiva', (await state()).muted === true);
    await page.click('#btn-mute');

    await seek(200);
    await page.waitForTimeout(500);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await page.click('[data-action="menu"]');
    await page.waitForTimeout(700);
    check('Il ritorno al menu funziona', (await state()).mode === 'menu');
    check(
      'Il progresso è memorizzato',
      (await page.locator('#menu-progress').innerText()).includes('03:20') ||
        (await page.locator('#btn-resume').isVisible()),
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelector('#loading')?.classList.contains('is-done'),
      null,
      { timeout: 120_000 },
    );
    await page.waitForTimeout(500);
    check('Il progresso sopravvive al reload', await page.locator('#btn-resume').isVisible());
    await page.click('#btn-resume');
    await page.waitForTimeout(1200);
    current = await state();
    check(
      'La ripresa riparte dal punto salvato',
      current.mode === 'film' && Number(current.time) >= 195 && Number(current.time) < 230,
      `t=${Number(current.time).toFixed(1)}`,
    );

    await seek(475.75);
    await page.waitForTimeout(2200);
    current = await state();
    check('Il film termina', current.mode === 'ended');
    check('La scheda finale appare', await page.locator('#end-card').isVisible());
    await page.screenshot({ path: path.join(artifacts, '10-fine.png') });

    await page.click('#btn-replay');
    await page.waitForTimeout(1200);
    current = await state();
    check('Il replay riparte dall’inizio', current.mode === 'film' && Number(current.time) < 8);

    await page.click('[data-action="menu"]');
    await page.waitForTimeout(700);
    check('Il menu è di nuovo raggiungibile', (await state()).mode === 'menu');

    await page.click('#btn-menu-settings');
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await page.click('#btn-download-srt');
    const download = await downloadPromise;
    check(
      'Il download SRT funziona',
      download.suggestedFilename().endsWith('.srt'),
      download.suggestedFilename(),
    );
    await download.delete();
    await page.click('#btn-close-settings');

    await page.click('#btn-watch');
    await page.waitForTimeout(900);
    await page.click('[data-action="cinema"]');
    await page.waitForTimeout(500);
    check(
      'La modalità cinema si attiva',
      (await page.locator('#app').getAttribute('data-cinema')) === 'on',
    );
    await page.waitForTimeout(5000);
    check(
      'I controlli si nascondono dopo inattività',
      (await page.locator('#app').getAttribute('data-ui')) === 'hidden',
    );
    await page.mouse.move(720, 400);
    await page.waitForTimeout(250);
    check(
      'I controlli riappaiono al movimento',
      (await page.locator('#app').getAttribute('data-ui')) === 'visible',
    );
    await page.click('[data-action="cinema"]');
    await page.waitForTimeout(500);
    check(
      'La modalità cinema si disattiva',
      (await page.locator('#app').getAttribute('data-cinema')) === 'off',
    );

    await page.click('[data-action="fullscreen"]');
    await page.waitForTimeout(500);
    const fullscreen = await page.evaluate(() => Boolean(document.fullscreenElement));
    if (!fullscreen) warnings.push('Fullscreen non disponibile in headless');
    if (fullscreen) {
      await page.evaluate(() => document.exitFullscreen().catch(() => undefined));
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: path.join(artifacts, '11-controls.png') });
    check('Nessun errore JavaScript', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
}

main()
  .then(() => {
    const failed = results.filter((result) => !result.ok);
    console.log(`\n${results.length - failed.length}/${results.length} verifiche superate.`);
    for (const warning of warnings) console.log(`NOTA: ${warning}`);
    if (failed.length) {
      console.error(`\nVerifiche fallite: ${failed.map((item) => item.name).join(', ')}`);
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error('\nSMOKE TEST INTERROTTO');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) server.kill('SIGTERM');
  });
