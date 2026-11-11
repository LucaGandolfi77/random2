import { ENVIRONMENT_ROSTER, FOOTSTEP_CHARACTERS } from './roster';
import type {
  ActionData,
  AmbienceEvent,
  AmbienceId,
  CameraCuesData,
  Caption,
  CompiledAct,
  CompiledAction,
  CompiledBeat,
  CompiledDialogue,
  CompiledFilm,
  CompiledSfx,
  CompiledStage,
  EnvironmentKind,
  ScreenplayData,
  TitleCardEvent,
  ValidationIssue,
} from './types';

const STAGE_ACTIONS = new Set([
  'idle',
  'sit',
  'stand',
  'show',
  'hide',
  'carry_head',
  'lie',
  'lie_headless',
  'pray',
  'kneel',
  'bind',
  'witness',
]);
const TRANSIENT_DEFAULTS: Partial<Record<string, number>> = {
  look: 2.8,
  bend: 3.2,
  cry: 7,
  nervous: 4,
  relief: 3,
  shiver: 2.4,
  point: 2.6,
  raise_arms: 4.2,
  turn_camera: 7,
  sigh: 2.2,
  face: 2.5,
  bless: 3.2,
  crown: 4,
  refuse: 2.4,
  arrest: 2.4,
  preach: 3.4,
  raise_hand: 2.8,
  strike: 1.8,
  cover_face: 3.2,
};

const DEFAULT_AMBIENCE: Record<EnvironmentKind, AmbienceId> = {
  court: 'court',
  crossroads: 'crossroadsNight',
  viaEmilia: 'viaDay',
  stirone: 'riverDusk',
  stironeDawn: 'riverDawn',
  fidenza: 'borgo',
};

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

export class ScreenplayCompilationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Errore nella sceneggiatura:\n${issues.map((item) => `- ${item}`).join('\n')}`);
    this.name = 'ScreenplayCompilationError';
    this.issues = issues;
  }
}

export function estimateLineDuration(text: string): number {
  const clean = text.trim();
  if (!clean) return 0.9;
  const words = clean.split(/\s+/).length;
  const punctuation = (clean.match(/[.,!?;:…]/g) ?? []).length;
  const ellipsis = clean.includes('…') ? 0.25 : 0;
  return round3(Math.max(0.85, words * 0.355 + punctuation * 0.16 + ellipsis + 0.35));
}

export function stageIdFor(actId: string, scene: EnvironmentKind): string {
  return `${actId}::${scene}`;
}

export function compileScreenplay(
  screenplay: ScreenplayData,
  cues: CameraCuesData,
): CompiledFilm {
  const issues: string[] = [];
  const acts: CompiledAct[] = [];
  const stages = new Map<string, CompiledStage>();
  const beats: CompiledBeat[] = [];
  const dialogue: CompiledDialogue[] = [];
  const actions: CompiledAction[] = [];
  const sfx: CompiledSfx[] = [];
  const ambiences: AmbienceEvent[] = [];
  const captions: Caption[] = [];
  const titleCards: TitleCardEvent[] = [];

  if (!screenplay.acts?.length) {
    throw new ScreenplayCompilationError(['La sceneggiatura non contiene atti.']);
  }

  const seenActs = new Set<string>();
  const seenBeats = new Set<string>();
  let cursor = 0;
  let previousAmbience: AmbienceId | null = null;

  for (const act of screenplay.acts) {
    if (seenActs.has(act.id)) issues.push(`Atto duplicato: ${act.id}`);
    seenActs.add(act.id);
    if (!act.beats?.length) issues.push(`L'atto ${act.id} non contiene beat.`);

    const actStart = cursor;

    for (const beat of act.beats) {
      if (seenBeats.has(beat.id)) issues.push(`Beat duplicato: ${beat.id}`);
      seenBeats.add(beat.id);

      const scene = beat.scene ?? act.scene;
      const stageId = stageIdFor(act.id, scene);
      const beatStart = cursor;

      if (!beat.camera) {
        issues.push(`Il beat ${beat.id} non ha una telecamera.`);
      } else {
        const shot = cues.shots[beat.camera];
        if (!shot) {
          issues.push(`Il beat ${beat.id} usa una telecamera inesistente: ${beat.camera}`);
        } else if (shot.environment !== scene) {
          issues.push(
            `Il beat ${beat.id} ha ambiente ${scene} ma la telecamera ${beat.camera} è registrata per ${shot.environment}.`,
          );
        }
      }

      let dialogueCursor = beatStart + (beat.dialogueDelay ?? 0.2);
      const lines = beat.dialogue ?? [];

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const duration = line.duration ?? estimateLineDuration(line.text);
        const pauseAfter = line.pauseAfter ?? (index === lines.length - 1 ? 0.35 : 0.4);
        const start = round3(dialogueCursor);
        const end = round3(start + duration);

        if (!line.text.trim()) issues.push(`Battuta vuota in ${beat.id}.`);
        if (duration <= 0) issues.push(`Durata non valida per la battuta "${line.text}" in ${beat.id}.`);

        const compiledDialogue: CompiledDialogue = {
          id: `${beat.id}::line${index + 1}`,
          start,
          end,
          speaker: line.speaker,
          text: line.text,
          actId: act.id,
          beatId: beat.id,
          stageId,
          scene,
          duration,
          pauseAfter,
        };

        dialogue.push(compiledDialogue);
        captions.push({
          start,
          end,
          speaker: line.speaker,
          text: line.text,
          scene,
          actId: act.id,
          beatId: beat.id,
        });

        dialogueCursor = end + pauseAfter;
      }

      let contentEnd = beatStart;
      const beatActions = beat.actions ?? [];

      for (const action of beatActions) {
        const start = round3(beatStart + (action.at ?? 0));
        const isMovement =
          action.action === 'walk' ||
          action.action === 'run' ||
          ((action.action === 'carry_head' || action.action === 'cycle') &&
            Boolean(action.from || action.to));
        let duration: number;

        if (action.duration !== undefined) {
          duration = action.duration;
        } else if (isMovement) {
          issues.push(
            `L'azione ${action.action} di ${action.character} in ${beat.id} richiede una durata.`,
          );
          duration = 1;
        } else if (STAGE_ACTIONS.has(action.action)) {
          duration = Number.POSITIVE_INFINITY;
        } else {
          duration = TRANSIENT_DEFAULTS[action.action] ?? 3;
        }

        if (!Number.isFinite(duration) && isMovement) {
          issues.push(`Durata non valida per ${action.character} in ${beat.id}.`);
        }
        if (isMovement && (!action.from || !action.to)) {
          issues.push(
            `L'azione ${action.action} di ${action.character} in ${beat.id} richiede from e to.`,
          );
        }

        const roster = ENVIRONMENT_ROSTER[scene];
        if (roster && !roster.includes(action.character)) {
          issues.push(
            `Il personaggio ${action.character} non appartiene alla scena ${scene} (${beat.id}).`,
          );
        }

        const end = Number.isFinite(duration) ? round3(start + duration) : Number.POSITIVE_INFINITY;
        if (Number.isFinite(end)) contentEnd = Math.max(contentEnd, end);

        actions.push({
          character: action.character,
          action: action.action,
          start,
          duration,
          end,
          stageId,
          actId: act.id,
          beatId: beat.id,
          from: action.from,
          to: action.to,
          mark: action.mark,
          face: action.face,
        });

        if (isMovement && Number.isFinite(duration) && FOOTSTEP_CHARACTERS.has(action.character)) {
          const step = action.action === 'run' ? 0.32 : 0.52;
          for (let time = start + step * 0.55; time < end - 0.1; time += step) {
            sfx.push({
              time: round3(time),
              name: 'footstep',
              gain: action.action === 'run' ? 0.4 : 0.26,
              stageId,
              actId: act.id,
            });
          }
        }
      }

      for (const sound of beat.sfx ?? []) {
        const time = round3(beatStart + sound.at);
        sfx.push({
          time,
          name: sound.name,
          gain: sound.gain ?? 1,
          stageId,
          actId: act.id,
        });
        contentEnd = Math.max(contentEnd, time + 0.15);
      }

      const naturalEnd = Math.max(
        dialogueCursor,
        Number.isFinite(contentEnd) ? contentEnd : beatStart,
        beatStart + 0.6,
      );
      const minimum = beat.duration ?? 0;
      const duration = Math.max(
        round3(naturalEnd - beatStart + (beat.tail ?? 0.2)),
        minimum,
        1,
      );
      const end = round3(beatStart + duration);

      const compiledBeat: CompiledBeat = {
        id: beat.id,
        actId: act.id,
        stageId,
        scene,
        camera: beat.camera,
        start: beatStart,
        duration,
        end,
      };

      beats.push(compiledBeat);

      let stage = stages.get(stageId);
      if (!stage) {
        stage = {
          id: stageId,
          kind: scene,
          actId: act.id,
          start: beatStart,
          end,
          beats: [compiledBeat],
        };
        stages.set(stageId, stage);
      } else {
        if (beatStart < stage.end) {
          issues.push(`Lo stage ${stageId} si sovrappone a se stesso nel tempo.`);
        }
        stage.end = end;
        stage.beats.push(compiledBeat);
      }

      const ambience = beat.ambience ?? DEFAULT_AMBIENCE[scene] ?? 'silence';
      if (ambience !== previousAmbience) {
        ambiences.push({ time: beatStart, ambience, stageId, actId: act.id });
        previousAmbience = ambience;
      }

      cursor = end;
    }

    const actEnd = cursor;
    acts.push({
      id: act.id,
      number: act.number,
      title: act.title,
      scene: act.scene,
      start: actStart,
      duration: round3(actEnd - actStart),
      end: actEnd,
    });

    titleCards.push({
      actId: act.id,
      number: act.number,
      title: act.title,
      start: actStart,
      end: round3(actStart + 3.4),
    });
  }

  if (issues.length) {
    throw new ScreenplayCompilationError(issues);
  }

  const film: CompiledFilm = {
    title: screenplay.title,
    subtitle: screenplay.subtitle,
    duration: round3(cursor),
    acts,
    stages: [...stages.values()].sort((a, b) => a.start - b.start),
    beats,
    dialogue,
    actions,
    sfx: sfx.sort((a, b) => a.time - b.time),
    ambiences,
    captions,
    titleCards,
  };

  return film;
}

export function validateFilm(film: CompiledFilm): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (film.duration < 300 || film.duration > 480) {
    issues.push({
      level: 'error',
      message: `Durata fuori intervallo: ${film.duration.toFixed(1)}s (richiesti 300–480s).`,
    });
  }

  let previousEnd = 0;
  for (const act of film.acts) {
    if (Math.abs(act.start - previousEnd) > 0.001) {
      issues.push({ level: 'error', message: `Vuoto o sovrapposizione prima dell'atto ${act.id}.` });
    }
    if (act.duration <= 0) {
      issues.push({ level: 'error', message: `Durata non valida per l'atto ${act.id}.` });
    }
    previousEnd = act.end;
  }

  if (Math.abs(previousEnd - film.duration) > 0.001) {
    issues.push({ level: 'error', message: 'La durata totale non coincide con la fine degli atti.' });
  }

  for (let index = 1; index < film.captions.length; index += 1) {
    const previous = film.captions[index - 1];
    const current = film.captions[index];
    if (current.start < previous.end - 0.001) {
      issues.push({
        level: 'error',
        message: `Sottotitoli sovrapposti tra "${previous.text}" e "${current.text}".`,
      });
    }
  }

  for (const caption of film.captions) {
    if (caption.end > film.duration + 0.001) {
      issues.push({
        level: 'error',
        message: `Il sottotitolo "${caption.text}" termina dopo il film.`,
      });
    }
  }

  for (const action of film.actions) {
    const stage = film.stages.find((item) => item.id === action.stageId);
    if (!stage) {
      issues.push({ level: 'error', message: `Stage mancante per l'azione di ${action.character}.` });
      continue;
    }
    const roster = ENVIRONMENT_ROSTER[stage.kind];
    if (!roster.includes(action.character)) {
      issues.push({
        level: 'error',
        message: `${action.character} non appartiene a ${stage.kind}.`,
      });
    }
  }

  const seenDialogueIds = new Set<string>();
  for (const line of film.dialogue) {
    if (seenDialogueIds.has(line.id)) {
      issues.push({ level: 'error', message: `Battuta duplicata: ${line.id}` });
    }
    seenDialogueIds.add(line.id);
  }

  if (film.stages.length < 6) {
    issues.push({ level: 'warning', message: 'Il film usa meno di sei ambienti.' });
  }

  return issues;
}
