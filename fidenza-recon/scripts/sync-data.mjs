import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'data/processed');
const chunked = resolve(source, 'city');
const target = resolve(root, 'web/public/data');
mkdirSync(target, { recursive: true });

const files = ['city.json'];
if (existsSync(chunked)) {
  files.push('manifest.json', 'world.json', 'massing.json', 'landmarks.json');
}
for (const file of files) {
  const from = existsSync(resolve(chunked, file))
    ? resolve(chunked, file)
    : resolve(source, file);
  cpSync(from, resolve(target, file));
}

if (existsSync(resolve(chunked, 'detail'))) {
  rmSync(resolve(target, 'detail'), { recursive: true, force: true });
  cpSync(resolve(chunked, 'detail'), resolve(target, 'detail'), { recursive: true });
}

const ground = resolve(source, 'ground/ortho.jpg');
if (existsSync(ground)) cpSync(ground, resolve(target, 'ortho.jpg'));

console.log('synced data/processed -> web/public/data (manifest, world, massing, detail chunks)');
