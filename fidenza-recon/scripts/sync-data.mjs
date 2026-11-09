import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'data/processed');
const target = resolve(root, 'web/public/data');
mkdirSync(target, { recursive: true });
cpSync(resolve(source, 'city.json'), resolve(target, 'city.json'));
cpSync(resolve(source, 'ground/ortho.jpg'), resolve(target, 'ortho.jpg'));
console.log('synced data/processed -> web/public/data');
