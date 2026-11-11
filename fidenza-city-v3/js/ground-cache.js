/**
 * Cache Storage and background prefetch for the 0.5 m ground tiles.
 *
 * Tiles are stored in their own cache so the service worker can serve them
 * offline without mixing them with the shell/data cache. The prefetcher is
 * resumable: every tile already in the cache is skipped.
 */

export const TILE_CACHE = 'fidenza-ground-tiles-v1';
export const TILE_BASE = './data/ground/tiles/';

let cachePromise = null;

function tileCache() {
  if (!('caches' in globalThis)) return Promise.resolve(null);
  if (!cachePromise) {
    cachePromise = caches.open(TILE_CACHE).catch(() => null);
  }
  return cachePromise;
}

export async function hasTileCache() {
  return !!(await tileCache());
}

export async function getTileResponse(url) {
  const cache = await tileCache();
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return hit;
  }
  const response = await fetch(url);
  if (cache && response.ok) {
    try {
      await cache.put(url, response.clone());
    } catch { /* quota exceeded: the base ortho still covers this tile */ }
  }
  return response;
}

export async function getTileImage(url) {
  const response = await getTileResponse(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      // HTMLImageElement + Texture.flipY is reliable for every browser:
      // ImageBitmap ignores flipY and would upload the tile upside down.
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`${url}: decode failed`));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function closeTileImage() {
  /* HTMLImageElement has no close(); disposing the texture releases it. */
}

export async function prefetchTiles(manifest, {
  baseUrl = TILE_BASE,
  concurrency = 3,
  onProgress = () => {},
  signal = null
} = {}) {
  const cache = await tileCache();
  if (!cache) {
    return { total: manifest?.tiles?.length || 0, done: 0, downloaded: 0, skipped: true, reason: 'cache-unavailable' };
  }
  const tiles = Array.isArray(manifest?.tiles) ? manifest.tiles : [];
  let index = 0;
  let done = 0;
  let downloaded = 0;
  let downloadedBytes = 0;

  async function worker() {
    while (index < tiles.length) {
      if (signal?.aborted) return;
      const tile = tiles[index++];
      const url = `${baseUrl}${tile}`;
      try {
        const hit = await cache.match(url);
        if (!hit) {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
            downloaded++;
            downloadedBytes += Number(response.headers.get('content-length')) || 0;
          }
        }
        done++;
        onProgress({ done, total: tiles.length, downloaded, downloadedBytes });
      } catch {
        done++;
        onProgress({ done, total: tiles.length, downloaded, downloadedBytes, failed: tile });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return { total: tiles.length, done, downloaded, downloadedBytes, skipped: false };
}

export async function storageEstimate() {
  try {
    if (!navigator.storage?.estimate) return null;
    const estimate = await navigator.storage.estimate();
    return {
      usage: Number(estimate.usage) || 0,
      quota: Number(estimate.quota) || 0,
      available: Math.max(0, (Number(estimate.quota) || 0) - (Number(estimate.usage) || 0))
    };
  } catch {
    return null;
  }
}

export async function ensurePersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function shouldSkipPrefetch() {
  return navigator.connection?.saveData === true;
}
