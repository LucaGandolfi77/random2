import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

function pngSize(rel: string): { width: number; height: number } {
  const buffer = readFileSync(join(ROOT, rel));
  expect(buffer.readUInt32BE(0)).toBe(0x89504e47);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe('PWA contract', () => {
  it('ships an installable portrait manifest with real icons', () => {
    const manifest = JSON.parse(read('public/manifest.json')) as {
      name: string;
      short_name: string;
      orientation: string;
      display: string;
      start_url: string;
      scope: string;
      lang: string;
      background_color: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };
    expect(manifest.name).toContain('LAST EMBER');
    expect(manifest.short_name).toBe('Last Ember');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.lang).toBe('en');
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.icons.some((icon) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

    for (const icon of manifest.icons) {
      expect(existsSync(join(ROOT, 'public', icon.src))).toBe(true);
      if (icon.type === 'image/png') {
        const size = pngSize(join('public', icon.src));
        const declared = Number(icon.sizes.split('x')[0]);
        expect(size.width).toBe(declared);
        expect(size.height).toBe(declared);
      }
    }
    expect(pngSize('public/icons/apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });

  it('links the manifest, iOS metadata and a local app shell', () => {
    const html = read('index.html');
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toMatch(/rel="manifest" href="manifest\.json"/);
    expect(html).toMatch(/apple-mobile-web-app-capable/);
    expect(html).toMatch(/apple-touch-icon/);
    expect(html).toMatch(/theme-color/);
    expect(html).toMatch(/viewport-fit=cover/);
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((src) => !src.startsWith('http') && !src.startsWith('#') && !src.startsWith('mailto:'));
    for (const asset of assets) {
      const clean = asset.replace(/^\//, '');
      expect(
        existsSync(join(ROOT, clean)) ||
          existsSync(join(ROOT, 'public', clean)) ||
          clean.startsWith('src/'),
      ).toBe(true);
    }
    expect(html).not.toMatch(/<script[^>]+src="https?:/i);
    expect(html).not.toMatch(/<link[^>]+href="https?:[^>]*\.(?:css|js|woff2?)/i);
  });

  it('builds a service worker that precaches and supports offline navigation', () => {
    const sw = read('src/service-worker.ts');
    expect(sw).toContain('self.__WB_MANIFEST');
    expect(sw).toContain('precacheAndRoute');
    expect(sw).toContain('NavigationRoute');
    expect(sw).toContain('matchPrecache');
    expect(sw).toContain('skipWaiting');
    expect(sw).toContain('clients.claim');
    const vite = read('vite.config.ts');
    expect(vite).toContain("filename: 'service-worker.ts'");
    expect(vite).toContain("strategies: 'injectManifest'");
    expect(vite).toContain('manifest: false');
  });

  it('registers the service worker relative to the deploy path', () => {
    const main = read('src/main.tsx');
    expect(main).toContain("navigator.serviceWorker");
    expect(main).toContain('import.meta.env.BASE_URL');
    expect(main).toContain('service-worker.js');
    expect(read('vite.config.ts')).toContain("base: './'");
  });

  it('does not load fonts, images or audio from the network', () => {
    const html = read('index.html');
    const css = read('src/styles/index.css');
    const manifest = read('public/manifest.json');
    for (const text of [html, css, manifest]) {
      expect(text).not.toMatch(/fonts\.googleapis|fonts\.gstatic|https?:\/\/[^"']+\.(?:mp3|wav|ogg|woff2?)/i);
    }
    expect(read('src/audio/AudioEngine.ts')).toContain('AudioContext');
    expect(read('src/audio/AudioEngine.ts')).not.toMatch(/fetch\(|new Audio\(/);
  });
});
