import type { FilmDef } from './types';
import { scene01 } from './scenes/scene01';
import { scene02 } from './scenes/scene02';
import { scene03 } from './scenes/scene03';
import { scene04 } from './scenes/scene04';
import { scene05 } from './scenes/scene05';
import { scene06 } from './scenes/scene06';
import { scene07 } from './scenes/scene07';
import { scene08 } from './scenes/scene08';
import { scene09 } from './scenes/scene09';
import { scene10 } from './scenes/scene10';
import { scene11 } from './scenes/scene11';
import { scene12 } from './scenes/scene12';

export const FILM: FilmDef = {
  title: 'NEVE E FERRO',
  subtitle: 'Liberamente ispirato ad Anna Karenina di Lev Tolstoj',
  duration: 1500,
  scenes: [
    scene01,
    scene02,
    scene03,
    scene04,
    scene05,
    scene06,
    scene07,
    scene08,
    scene09,
    scene10,
    scene11,
    scene12
  ]
};

export function sceneStarts(): number[] {
  const starts: number[] = [];
  let cursor = 0;
  for (const scene of FILM.scenes) {
    starts.push(cursor);
    cursor += scene.duration;
  }
  return starts;
}

export function sceneAtTime(time: number): { scene: (typeof FILM.scenes)[number]; index: number; localTime: number } {
  const t = Math.max(0, Math.min(FILM.duration, time));
  const starts = sceneStarts();
  for (let i = FILM.scenes.length - 1; i >= 0; i -= 1) {
    const scene = FILM.scenes[i];
    const start = starts[i];
    if (scene && start !== undefined && t >= start) {
      return { scene, index: i, localTime: t - start };
    }
  }
  const first = FILM.scenes[0];
  if (!first) throw new Error('Film senza scene');
  return { scene: first, index: 0, localTime: 0 };
}
