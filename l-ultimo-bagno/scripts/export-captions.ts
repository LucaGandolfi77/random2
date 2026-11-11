import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileScreenplay } from '../src/data/compileScreenplay';
import { captionsToSrt } from '../src/subtitles/srt';
import type { CameraCuesData, ScreenplayData } from '../src/data/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8')) as T;
}

const screenplay = readJson<ScreenplayData>('src/data/screenplay.json');
const cues = readJson<CameraCuesData>('src/data/camera-cues.json');
const film = compileScreenplay(screenplay, cues);

const captionsPayload = {
  language: 'it',
  title: film.title,
  subtitle: film.subtitle,
  generatedFrom: 'src/data/screenplay.json',
  duration: film.duration,
  captions: film.captions,
};

const captionsPath = path.join(root, 'src/subtitles/captions.it.json');
mkdirSync(path.dirname(captionsPath), { recursive: true });
writeFileSync(captionsPath, `${JSON.stringify(captionsPayload, null, 2)}\n`, 'utf8');

const srtPath = path.join(root, 'public/assets/captions.it.srt');
mkdirSync(path.dirname(srtPath), { recursive: true });
writeFileSync(srtPath, captionsToSrt(film.captions), 'utf8');

const minutes = Math.floor(film.duration / 60);
const seconds = Math.round(film.duration % 60);
console.log(
  `L'ULTIMO BAGNO — ${film.captions.length} sottotitoli · durata ${minutes}:${String(seconds).padStart(2, '0')}`,
);

for (const act of film.acts) {
  const actMinutes = Math.floor(act.duration / 60);
  const actSeconds = Math.round(act.duration % 60);
  console.log(`  ${act.number}: ${actMinutes}:${String(actSeconds).padStart(2, '0')}`);
}

if (film.duration < 300 || film.duration > 480) {
  console.warn(
    `ATTENZIONE: durata ${film.duration.toFixed(1)}s fuori dall'intervallo richiesto (300–480s).`,
  );
}
