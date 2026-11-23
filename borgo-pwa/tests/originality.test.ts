import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('..', import.meta.url).pathname;
const forbidden = ['locorotondo', 'roundvalley', 'donnygiac', 'openstreetmap'];

function collect(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collect(full, out);
    } else if (/\.(ts|css|html|js|webmanifest|svg)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = [
  ...collect(join(root, 'src')),
  ...collect(join(root, 'public')),
  join(root, 'index.html')
];

describe('originality guard', () => {
  it('never mentions the reference project or its map sources', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8').toLowerCase();
      for (const word of forbidden) {
        expect(text.includes(word), `${file} mentions ${word}`).toBe(false);
      }
    }
  });

  it('loads nothing from the network', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(
        /(?:src|href)\s*=\s*["']https?:\/\//i.test(text),
        `${file} loads a remote asset`
      ).toBe(false);
      expect(/url\(\s*["']?https?:\/\//i.test(text), `${file} has a remote CSS url`).toBe(false);
    }
  });

  it('ships no binary assets', () => {
    const assets = collect(join(root, 'public'));
    expect(assets.some((file) => /\.(png|jpe?g|webp|mp3|ogg|wav|glb|gltf)$/i.test(file))).toBe(false);
  });
});
