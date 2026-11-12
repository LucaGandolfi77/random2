import { FILM } from '../src/data/film';
import { validateFilm } from '../src/data/validate';

const issues = validateFilm(FILM);
if (issues.length) {
  console.error(`Sceneggiatura non valida (${issues.length} problemi):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
const shots = FILM.scenes.reduce((sum, scene) => sum + scene.shots.length, 0);
const cues = FILM.scenes.reduce((sum, scene) => sum + scene.subtitles.length, 0);
console.log(`NEVE E FERRO — ${FILM.scenes.length} scene, ${FILM.duration}s, ${shots} inquadrature, ${cues} sottotitoli.`);
console.log('Timeline valida.');
