import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('src/game/engine.ts');
const target = path.resolve('supabase/functions/briscola/engine.ts');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log(`Synced ${path.relative(process.cwd(), source)} -> ${path.relative(process.cwd(), target)}`);
