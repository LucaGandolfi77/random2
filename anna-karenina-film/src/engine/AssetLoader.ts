import { FILM } from '../data/film';
import { validateFilm } from '../data/validate';
import { PALETTES } from '../data/palettes';
import { renderEnvironment } from '../scenes/environments';
import { CHARACTER_IDS, getCharacterSpec } from '../characters/specs';
import { CharacterRenderer } from '../characters/CharacterRenderer';
import { assetUrl, CACHE_SHELL, SHELL_ASSETS } from '../data/media';

export interface LoadProgress {
  value: number;
  label: string;
}

type ProgressFn = (progress: LoadProgress) => void;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') {
      setTimeout(resolve, 16);
    } else {
      requestAnimationFrame(() => resolve());
    }
  });
}

async function cacheShell(onProgress: ProgressFn): Promise<void> {
  const urls = SHELL_ASSETS.map(assetUrl);
  let cache: Cache | null = null;
  if (typeof caches !== 'undefined') {
    try {
      cache = await caches.open(CACHE_SHELL);
    } catch {
      cache = null;
    }
  }
  let done = 0;
  for (const url of urls) {
    let response: Response | null = null;
    try {
      response = await fetch(url, { cache: 'no-cache' });
      if (response.ok && cache) await cache.put(url, response.clone());
    } catch {
      response = null;
    }
    if (!response || !response.ok) {
      const cached =
        (typeof caches !== 'undefined' ? await caches.match(url) : null) ??
        (cache ? await cache.match(url) : null);
      if (!cached) {
        throw new Error(`Impossibile caricare una risorsa essenziale: ${url}`);
      }
      if (cache) await cache.put(url, cached.clone());
    }
    done += 1;
    onProgress({ value: 0.08 + (done / urls.length) * 0.12, label: 'Materiali della proiezione' });
    await nextFrame();
  }
}

export async function prepareFilm(onProgress: ProgressFn): Promise<void> {
  const issues = validateFilm(FILM);
  if (issues.length) {
    throw new Error(`La timeline non è valida:\n${issues.join('\n')}`);
  }
  onProgress({ value: 0.04, label: 'Verifica della sceneggiatura' });
  await nextFrame();

  const fontLoads = [
    document.fonts.load('400 20px "Cormorant Garamond"'),
    document.fonts.load('600 20px "Cormorant Garamond"'),
    document.fonts.load('400 16px "Inter"'),
    document.fonts.load('500 16px "Inter"')
  ];
  await Promise.allSettled(fontLoads);
  await document.fonts.ready;
  onProgress({ value: 0.08, label: 'Caratteri tipografici' });
  await nextFrame();

  await cacheShell(onProgress);

  const combos = new Map<string, { env: (typeof FILM.scenes)[number]['environment']; palette: (typeof FILM.scenes)[number]['palette'] }>();
  for (const scene of FILM.scenes) {
    combos.set(`${scene.environment}:${scene.palette}`, { env: scene.environment, palette: scene.palette });
  }
  let envDone = 0;
  for (const combo of combos.values()) {
    renderEnvironment(combo.env, PALETTES[combo.palette]);
    envDone += 1;
    onProgress({
      value: 0.2 + (envDone / combos.size) * 0.5,
      label: `Ambienti dipinti · ${envDone}/${combos.size}`
    });
    await nextFrame();
  }

  const bench = document.createElement('div');
  bench.style.position = 'fixed';
  bench.style.left = '-10000px';
  bench.style.top = '0';
  bench.style.width = '400px';
  bench.style.height = '800px';
  bench.setAttribute('aria-hidden', 'true');
  document.body.append(bench);
  try {
    for (let i = 0; i < CHARACTER_IDS.length; i += 1) {
      const character = CHARACTER_IDS[i];
      if (!character) continue;
      const renderer = new CharacterRenderer(getCharacterSpec(character));
      bench.append(renderer.element);
      renderer.render({
        time: 1,
        pose: {
          lean: 0,
          head: 0,
          armL: 3,
          armR: -3,
          elbowL: 3,
          elbowR: -3,
          bodyY: 0,
          step: 0
        },
        expression: {
          eyeOpen: 1,
          brow: 0,
          browRaise: 0,
          mouthCurve: 0,
          mouthOpen: 0,
          mouthWidth: 0,
          headTilt: 0
        },
        gaze: { x: 0, y: 0 },
        seed: i
      });
      onProgress({
        value: 0.72 + ((i + 1) / CHARACTER_IDS.length) * 0.2,
        label: 'Personaggi e costumi'
      });
      await nextFrame();
    }
  } finally {
    bench.remove();
  }

  onProgress({ value: 0.96, label: 'Ultimi raccordi' });
  await nextFrame();
  await new Promise((resolve) => setTimeout(resolve, 180));
  onProgress({ value: 1, label: 'Proiezione pronta' });
}
