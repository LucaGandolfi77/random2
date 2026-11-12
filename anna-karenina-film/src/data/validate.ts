import type { FilmDef } from './types';

export function validateFilm(film: FilmDef): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  let total = 0;
  let shotCount = 0;
  for (const scene of film.scenes) {
    if (ids.has(scene.id)) issues.push(`ID scena duplicato: ${scene.id}`);
    ids.add(scene.id);
    total += scene.duration;
    if (!scene.shots.length) issues.push(`${scene.id}: nessuna inquadratura`);
    let cursor = 0;
    for (const shot of scene.shots) {
      shotCount += 1;
      if (Math.abs(shot.start - cursor) > 0.001) {
        issues.push(`${scene.id}/${shot.id}: inizio ${shot.start}s, atteso ${cursor}s`);
      }
      if (shot.duration <= 0) issues.push(`${scene.id}/${shot.id}: durata non positiva`);
      if (!shot.camera.length) issues.push(`${scene.id}/${shot.id}: camera assente`);
      shot.camera.forEach((k) => {
        if (k.t < -0.001 || k.t > shot.duration + 0.001) {
          issues.push(`${scene.id}/${shot.id}: keyframe camera fuori intervallo (${k.t})`);
        }
      });
      for (const track of shot.actors) {
        if (!track.keys.length) issues.push(`${scene.id}/${shot.id}: attore ${track.character} senza keyframe`);
        let kt = 0;
        for (const key of track.keys) {
          if (key.t < kt - 0.001) issues.push(`${scene.id}/${shot.id}: keyframe attore non ordinati`);
          if (key.t < -0.001 || key.t > shot.duration + 0.001) {
            issues.push(`${scene.id}/${shot.id}: keyframe attore fuori intervallo (${key.t})`);
          }
          kt = key.t;
        }
      }
      for (const s of shot.sfx ?? []) {
        if (s.t < 0 || s.t > shot.duration) issues.push(`${scene.id}/${shot.id}: SFX fuori intervallo`);
      }
      cursor += shot.duration;
    }
    if (Math.abs(cursor - scene.duration) > 0.001) {
      issues.push(`${scene.id}: la somma delle inquadrature è ${cursor}s, attesa ${scene.duration}s`);
    }
    let st = -1;
    for (const cue of scene.subtitles) {
      if (cue.start < st - 0.001) issues.push(`${scene.id}: sottotitoli non ordinati`);
      if (cue.end < cue.start) issues.push(`${scene.id}/${cue.id}: fine prima dell'inizio`);
      if (cue.start < 0 || cue.end > scene.duration + 0.001) {
        issues.push(`${scene.id}/${cue.id}: sottotitolo fuori dalla scena`);
      }
      const cps = cue.text.length / Math.max(0.5, cue.end - cue.start);
      if (cps > 22) issues.push(`${scene.id}/${cue.id}: lettura troppo rapida (${cps.toFixed(1)} c/s)`);
      st = cue.start;
    }
    if (!scene.music.id) issues.push(`${scene.id}: musica assente`);
  }
  if (film.scenes.length !== 12) issues.push(`Scene: ${film.scenes.length}, attese 12`);
  if (Math.abs(total - film.duration) > 0.001) {
    issues.push(`Durata totale: ${total}s, attesa ${film.duration}s`);
  }
  if (shotCount < 60) issues.push(`Inquadrature: ${shotCount}, attese almeno 60`);
  return issues;
}
