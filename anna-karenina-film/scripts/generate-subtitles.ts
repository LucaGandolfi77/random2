import { mkdir, writeFile } from 'node:fs/promises';
import { FILM } from '../src/data/film';

const entries = FILM.scenes
  .flatMap((scene) => scene.subtitles)
  .map((cue) => `  ${JSON.stringify(cue.id)}: ${JSON.stringify(cue.text)},`)
  .join('\n');

const content = `/**
 * Localizzazione italiana dei sottotitoli.
 * I testi sono separati dai cue di timing/speaker in src/data/scenes/*.ts.
 * Per una nuova lingua creare src/subtitles/<locale>.ts con le stesse chiavi
 * e passare la tabella al SubtitleView.
 */
export const IT_SUBTITLES: Record<string, string> = {
${entries}
};

export function subtitleText(id: string, fallback: string): string {
  return IT_SUBTITLES[id] ?? fallback;
}
`;

await mkdir('src/subtitles', { recursive: true });
await writeFile('src/subtitles/it.ts', content, 'utf8');
console.log(`src/subtitles/it.ts generato: ${FILM.scenes.flatMap((scene) => scene.subtitles).length} cue.`);
