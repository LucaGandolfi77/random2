import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { film, cameraFile } from '../src/screenplay/filmData';
import { serializeTimeline, validateFilm } from '../src/screenplay/compile';

const issues = validateFilm(film, cameraFile);
if (issues.length > 0) {
  console.error('Timeline non valida:');
  for (const issue of issues) console.error(` - [${issue.code}] ${issue.message}`);
  process.exit(1);
}

const target = resolve(process.cwd(), 'data/timeline.json');
const payload = `${JSON.stringify(serializeTimeline(film), null, 2)}\n`;
writeFileSync(target, payload, 'utf8');
console.log(`Scritto ${target}`);
console.log(`Durata: ${film.duration.toFixed(1)}s — scene: ${film.scenes.length} — battute: ${film.lines.length} — inquadrature: ${film.shots.length}`);
