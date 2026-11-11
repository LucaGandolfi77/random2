import type {
  ActorCue,
  CameraFile,
  CompiledAct,
  CompiledBeat,
  CompiledFilm,
  CompiledScene,
  EventCue,
  LineCue,
  RawBeat,
  RawScript,
  ShotCue
} from '../data/types';

const toMs = (seconds: number): number => Math.round(seconds * 1000);
const fromMs = (ms: number): number => ms / 1000;

export function compileFilm(script: RawScript): CompiledFilm {
  if (!script || !Array.isArray(script.acts) || script.acts.length === 0) {
    throw new Error('Sceneggiatura non valida: nessun atto.');
  }

  let cursor = 0;
  const acts: CompiledAct[] = [];
  const scenes: CompiledScene[] = [];
  const lines: LineCue[] = [];
  const shotsRaw: ShotCue[] = [];
  const events: EventCue[] = [];
  const actorCues: ActorCue[] = [];
  const seenSceneIds = new Set<string>();
  const seenBeatIds = new Set<string>();

  for (const act of script.acts) {
    const actStart = cursor;
    const compiledScenes: CompiledScene[] = [];

    for (const scene of act.scenes) {
      if (seenSceneIds.has(scene.id)) {
        throw new Error(`Scena duplicata: ${scene.id}`);
      }
      seenSceneIds.add(scene.id);
      if (!Array.isArray(scene.beats) || scene.beats.length === 0) {
        throw new Error(`Scena senza beats: ${scene.id}`);
      }

      const sceneStart = cursor;
      const beats: CompiledBeat[] = [];

      scene.beats.forEach((beat: RawBeat, index: number) => {
        if (!Number.isFinite(beat.dur) || beat.dur <= 0) {
          throw new Error(`Durata non valida in ${scene.id} beat ${index}`);
        }
        if (!beat.shot) {
          throw new Error(`Shot mancante in ${scene.id} beat ${index}`);
        }
        const beatId = `${scene.id}_b${(index + 1).toString().padStart(3, '0')}`;
        if (seenBeatIds.has(beatId)) {
          throw new Error(`Beat duplicato: ${beatId}`);
        }
        seenBeatIds.add(beatId);

        const start = cursor;
        const end = cursor + toMs(beat.dur);
        cursor = end;

        const compiled: CompiledBeat = {
          id: beatId,
          kind: beat.kind,
          sceneId: scene.id,
          actId: act.id,
          env: scene.env,
          start: fromMs(start),
          end: fromMs(end),
          dur: fromMs(end - start),
          shot: beat.shot
        };

        if (beat.poses) {
          compiled.poses = beat.poses;
          for (const [actor, pose] of Object.entries(beat.poses)) {
            if (pose) {
              actorCues.push({
                at: compiled.start,
                actor: actor as ActorCue['actor'],
                sceneId: scene.id,
                pose
              });
            }
          }
        }
        if (beat.moves && beat.moves.length > 0) {
          compiled.moves = beat.moves;
          for (const move of beat.moves) {
            if (!Number.isFinite(move.dur) || move.dur <= 0) {
              throw new Error(`Movimento non valido in ${beatId}`);
            }
            actorCues.push({
              at: compiled.start,
              actor: move.actor,
              sceneId: scene.id,
              move
            });
          }
        }

        if (beat.kind === 'line') {
          if (!beat.speaker || !beat.text || beat.text.trim().length === 0) {
            throw new Error(`Battuta non valida in ${beatId}`);
          }
          compiled.speaker = beat.speaker;
          compiled.text = beat.text;
          compiled.emotion = beat.emotion ?? 'neutral';
          lines.push({
            id: `${beatId}_line`,
            beatId,
            actId: act.id,
            sceneId: scene.id,
            shot: beat.shot,
            speaker: beat.speaker,
            text: beat.text,
            emotion: compiled.emotion,
            start: compiled.start,
            end: compiled.end
          });
        } else {
          if (beat.kind === 'action' && beat.event) {
            compiled.event = beat.event;
            if (beat.params) compiled.params = beat.params;
            events.push({
              id: `${beatId}_${beat.event}`,
              at: compiled.start,
              type: beat.event,
              sceneId: scene.id,
              params: beat.params
            });
          }
          if (beat.note) compiled.note = beat.note;
        }

        beats.push(compiled);
      });

      const compiledScene: CompiledScene = {
        id: scene.id,
        actId: act.id,
        env: scene.env,
        start: fromMs(sceneStart),
        end: fromMs(cursor),
        beats
      };
      compiledScenes.push(compiledScene);
      scenes.push(compiledScene);
    }

    acts.push({
      id: act.id,
      title: act.title,
      start: fromMs(actStart),
      end: fromMs(cursor),
      scenes: compiledScenes
    });
  }

  for (let i = 0; i < beatsOf(scenes).length; i += 1) {
    const beat = beatsOf(scenes)[i];
    const current = shotsRaw[shotsRaw.length - 1];
    if (current && current.shot === beat.shot && current.end === beat.start && current.sceneId === beat.sceneId) {
      current.end = beat.end;
    } else {
      shotsRaw.push({ shot: beat.shot, sceneId: beat.sceneId, start: beat.start, end: beat.end });
    }
  }

  events.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  actorCues.sort((a, b) => a.at - b.at || a.actor.localeCompare(b.actor));

  return {
    meta: script.meta,
    acts,
    scenes,
    lines,
    shots: shotsRaw,
    events,
    actorCues,
    duration: fromMs(cursor)
  };
}

function beatsOf(scenes: CompiledScene[]): CompiledBeat[] {
  const out: CompiledBeat[] = [];
  for (const scene of scenes) {
    for (const beat of scene.beats) out.push(beat);
  }
  return out;
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export function validateFilm(film: CompiledFilm, camera: CameraFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const defs = new Map(camera.shots.map((shot) => [shot.id, shot]));

  if (film.duration < 480 || film.duration > 720) {
    issues.push({
      code: 'duration',
      message: `Durata ${film.duration.toFixed(1)}s fuori dall'intervallo 480-720s.`
    });
  }

  if (film.acts.length !== 6) {
    issues.push({ code: 'acts', message: `Attesi 6 atti, trovati ${film.acts.length}.` });
  }

  for (const act of film.acts) {
    if (!act.title) issues.push({ code: 'act_title', message: `Atto senza titolo: ${act.id}` });
  }

  for (let i = 0; i < film.scenes.length; i += 1) {
    const scene = film.scenes[i];
    if (scene.end <= scene.start) {
      issues.push({ code: 'scene_duration', message: `Scena vuota: ${scene.id}` });
    }
    if (i > 0) {
      const prev = film.scenes[i - 1];
      if (Math.abs(prev.end - scene.start) > 0.0005) {
        issues.push({ code: 'scene_gap', message: `Vuoto tra ${prev.id} e ${scene.id}` });
      }
      if (prev.env === scene.env && prev.actId === scene.actId) {
        issues.push({ code: 'scene_redundant', message: `Scene adiacenti nello stesso ambiente: ${prev.id}/${scene.id}` });
      }
    }
  }

  const usedShots = new Set<string>();
  for (const shot of film.shots) {
    usedShots.add(shot.shot);
    const def = defs.get(shot.shot);
    if (!def) {
      issues.push({ code: 'shot_missing', message: `Inquadratura senza definizione: ${shot.shot}` });
      continue;
    }
    const scene = film.scenes.find((s) => s.id === shot.sceneId);
    if (scene && def.env !== scene.env) {
      issues.push({
        code: 'shot_env',
        message: `Inquadratura ${shot.shot} dichiarata per ${def.env} ma usata in ${scene.env}`
      });
    }
    if (shot.end <= shot.start) {
      issues.push({ code: 'shot_duration', message: `Inquadratura vuota: ${shot.shot}@${shot.start}` });
    }
  }

  for (const def of camera.shots) {
    if (!usedShots.has(def.id)) {
      issues.push({ code: 'shot_unused', message: `Inquadratura mai usata: ${def.id}` });
    }
    if (!Number.isFinite(def.fovFrom) || def.fovFrom < 18 || def.fovFrom > 70) {
      issues.push({ code: 'shot_fov', message: `FOV non valido in ${def.id}` });
    }
    if (def.handheld < 0 || def.handheld > 0.2) {
      issues.push({ code: 'shot_handheld', message: `Handheld non valido in ${def.id}` });
    }
  }

  const lineIds = new Set<string>();
  for (const line of film.lines) {
    if (lineIds.has(line.id)) {
      issues.push({ code: 'line_duplicate', message: `Battuta duplicata: ${line.id}` });
    }
    lineIds.add(line.id);
    if (line.text.trim().length === 0) {
      issues.push({ code: 'line_empty', message: `Battuta vuota: ${line.id}` });
    }
    if (line.end - line.start < 1.2) {
      issues.push({ code: 'line_short', message: `Battuta troppo breve: ${line.id}` });
    }
    if (line.end - line.start > 8) {
      issues.push({ code: 'line_long', message: `Battuta troppo lunga: ${line.id}` });
    }
    const scene = film.scenes.find((s) => s.id === line.sceneId);
    if (!scene || line.start < scene.start - 0.001 || line.end > scene.end + 0.001) {
      issues.push({ code: 'line_bounds', message: `Battuta fuori scena: ${line.id}` });
    }
    if (!line.speaker) {
      issues.push({ code: 'line_speaker', message: `Parlante mancante: ${line.id}` });
    }
  }

  const eventIds = new Set<string>();
  for (const event of film.events) {
    if (eventIds.has(event.id)) {
      issues.push({ code: 'event_duplicate', message: `Evento duplicato: ${event.id}` });
    }
    eventIds.add(event.id);
    if (!Number.isFinite(event.at)) {
      issues.push({ code: 'event_time', message: `Evento senza tempo: ${event.id}` });
    }
  }

  for (const scene of film.scenes) {
    const sceneShots = film.shots.filter((s) => s.sceneId === scene.id);
    if (sceneShots.length === 0) {
      issues.push({ code: 'scene_shots', message: `Scena senza inquadrature: ${scene.id}` });
      continue;
    }
    if (Math.abs(sceneShots[0].start - scene.start) > 0.001) {
      issues.push({ code: 'shot_start', message: `La prima inquadratura non apre ${scene.id}` });
    }
    for (let i = 1; i < sceneShots.length; i += 1) {
      if (Math.abs(sceneShots[i].start - sceneShots[i - 1].end) > 0.001) {
        issues.push({ code: 'shot_gap', message: `Buco tra inquadrature in ${scene.id}` });
      }
    }
    if (Math.abs(sceneShots[sceneShots.length - 1].end - scene.end) > 0.001) {
      issues.push({ code: 'shot_end', message: `L'ultima inquadratura non chiude ${scene.id}` });
    }
  }

  return issues;
}

export interface TimelineSnapshot {
  duration: number;
  acts: Array<{ id: string; title: string; start: number; end: number }>;
  scenes: Array<{ id: string; env: string; start: number; end: number }>;
  lines: LineCue[];
  shots: ShotCue[];
  events: EventCue[];
}

export function serializeTimeline(film: CompiledFilm): TimelineSnapshot {
  return {
    duration: film.duration,
    acts: film.acts.map((a) => ({ id: a.id, title: a.title, start: a.start, end: a.end })),
    scenes: film.scenes.map((s) => ({ id: s.id, env: s.env, start: s.start, end: s.end })),
    lines: film.lines,
    shots: film.shots,
    events: film.events
  };
}
