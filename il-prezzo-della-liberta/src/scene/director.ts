import type { Group } from 'three';
import type {
  ActorCue,
  ActorId,
  CameraFile,
  CompiledFilm,
  CompiledScene,
  Emotion,
  LightsFile,
  LineCue,
  StageActor
} from '../data/types';
import { Actor } from '../characters/actor';
import { CameraDirector } from '../camera/cameraDirector';
import { LightingRig } from '../lighting/lightingRig';
import { resolveActorState } from '../animation/actorState';
import { actAt, lineAt, sceneAt, eventTime, shotAt } from '../screenplay/queries';
import { STAGING } from './staging';
import { buildEnvironment, type BuiltEnvironment, type EnvEventLookup } from './builders';
import type { Stage } from './stage';

const SPEAKER_TO_ACTOR: Record<string, ActorId> = {
  ETIENNE: 'etienne',
  ETIENNE_VO: 'etienne',
  RENAUD: 'renaud',
  MINA: 'mina',
  AICHA: 'aicha',
  AICHA_TAPE: 'aicha',
  ROSE: 'rose',
  GUARDIA: 'guard',
  PROPRIETARIO: 'baker',
  IMPIEGATO: 'clerk',
  INFERMIERA: 'nurse',
  PASSANTE: 'passerby'
};

const REST_EMOTIONS: Record<string, Partial<Record<ActorId, Emotion>>> = {
  a1_prison: { etienne: 'tired', guard: 'neutral' },
  a2_bakery: { etienne: 'tired', baker: 'neutral' },
  a2_office: { etienne: 'tired', clerk: 'neutral' },
  a2_belleville: { etienne: 'sad', passerby: 'neutral' },
  a3_gare: { etienne: 'tired', mina: 'sad' },
  a4_phone: { etienne: 'tired', mina: 'neutral' },
  a4_confrontation: { etienne: 'tired', mina: 'afraid', renaud: 'neutral' },
  a4_metro: { etienne: 'tired', mina: 'hopeful' },
  a5_corridor: { etienne: 'tired', mina: 'afraid', nurse: 'neutral' },
  a5_room: { etienne: 'tired', mina: 'hopeful', aicha: 'tender', renaud: 'neutral' },
  a6_laundrette: { etienne: 'tired', rose: 'wry' },
  a6_dawn: { etienne: 'hopeful' }
};

interface SceneRuntime {
  scene: CompiledScene;
  env: BuiltEnvironment;
  group: Group;
  actors: Map<ActorId, Actor>;
  base: Map<ActorId, StageActor>;
  cues: Map<ActorId, ActorCue[]>;
}

export interface FrameInfo {
  sceneId: string;
  actId: string;
  actTitle: string;
  shot: string;
  line: LineCue | null;
  env: string;
}

export class Director {
  readonly stage: Stage;
  readonly film: CompiledFilm;
  private camera: CameraDirector;
  private lighting: LightingRig;
  private runtimes = new Map<string, SceneRuntime>();
  private active: SceneRuntime | null = null;
  private eventTimes = new Map<string, number>();
  private built = false;

  constructor(stage: Stage, film: CompiledFilm, cameraFile: CameraFile, lightsFile: LightsFile) {
    this.stage = stage;
    this.film = film;
    this.camera = new CameraDirector(stage.camera, cameraFile.shots);
    this.lighting = new LightingRig(stage.scene, film, lightsFile);
    for (const event of film.events) {
      if (!this.eventTimes.has(event.type)) this.eventTimes.set(event.type, event.at);
    }
  }

  async build(onProgress: (ratio: number) => void): Promise<void> {
    const total = this.film.scenes.length;
    for (let i = 0; i < total; i += 1) {
      const scene = this.film.scenes[i];
      const env = buildEnvironment(scene.env);
      env.group.visible = false;
      this.stage.scene.add(env.group);
      const actors = new Map<ActorId, Actor>();
      const base = new Map<ActorId, StageActor>();
      const cues = new Map<ActorId, ActorCue[]>();
      const staging = STAGING[scene.id];
      if (!staging) throw new Error(`Staging mancante per la scena ${scene.id}`);
      for (const stageActor of staging.actors) {
        const actor = new Actor(stageActor);
        env.group.add(actor.object);
        actors.set(stageActor.id, actor);
        base.set(stageActor.id, stageActor);
        cues.set(stageActor.id, this.film.actorCues.filter((c) => c.actor === stageActor.id && c.sceneId === scene.id));
      }
      this.runtimes.set(scene.id, { scene, env, group: env.group, actors, base, cues });
      onProgress((i + 1) / total);
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
      });
    }
    this.built = true;
    this.apply(0);
  }

  apply(t: number): FrameInfo {
    if (!this.built) {
      return { sceneId: '', actId: '', actTitle: '', shot: '', line: null, env: '' };
    }
    const scene = sceneAt(this.film, t);
    const runtime = this.runtimes.get(scene.id);
    if (!runtime) throw new Error(`Scena non costruita: ${scene.id}`);
    if (this.active !== runtime) {
      if (this.active) this.active.group.visible = false;
      runtime.group.visible = true;
      this.active = runtime;
    }

    const line = lineAt(this.film, t);
    const act = actAt(this.film, t);
    const speakerActor = line ? SPEAKER_TO_ACTOR[line.speaker] : null;
    const rest = REST_EMOTIONS[scene.id] ?? {};

    for (const [id, actor] of runtime.actors) {
      const baseActor = runtime.base.get(id);
      if (!baseActor) continue;
      const actorCues = runtime.cues.get(id) ?? [];
      const state = resolveActorState(actorCues, scene.id, id, baseActor, t);
      let emotion: Emotion = rest[id] ?? 'neutral';
      if (line && speakerActor === id) emotion = line.emotion;
      actor.apply(state, t, emotion);
      if (baseActor.hideUntilEvent) {
        const at = this.eventTimes.get(baseActor.hideUntilEvent);
        actor.setVisible(at === undefined || t >= at - 0.01);
      } else {
        actor.setVisible(true);
      }
    }

    this.applyProps(runtime, t, scene);
    runtime.env.update(t, this.lookup);
    this.camera.apply(this.film, t);
    this.lighting.apply(t);
    this.stage.setExposure(this.lighting.exposure);

    return {
      sceneId: scene.id,
      actId: act.id,
      actTitle: act.title,
      shot: shotAt(this.film, t),
      line,
      env: scene.env
    };
  }

  private applyProps(runtime: SceneRuntime, t: number, scene: CompiledScene): void {
    const etienne = runtime.actors.get('etienne');
    const mina = runtime.actors.get('mina');
    const time = (type: string): number | null => {
      const at = this.eventTimes.get(type);
      return at === undefined ? null : at;
    };

    if (etienne) {
      etienne.setProp('photo', false);
      etienne.setProp('paper', false);
      etienne.setProp('tape', false);
    }
    if (mina) {
      mina.setProp('photo', false);
      mina.setProp('paper', false);
      mina.setProp('tape', false);
      mina.setBackpackVisible(scene.id !== 'a5_room');
    }

    if (scene.id === 'a1_prison' && etienne) {
      const start = time('a1_photo_out');
      const end = time('a1_photo_back');
      etienne.setProp('photo', start !== null && t >= start && (end === null || t < end));
    }
    if (scene.id === 'a2_bakery' && etienne) {
      const start = time('a2_docs_shown');
      const end = time('a2_door_close');
      etienne.setProp('paper', start !== null && t >= start && (end === null || t < end));
    }
    if (scene.id === 'a3_gare') {
      if (mina) {
        const start = time('a3_paper_out');
        mina.setProp('paper', start !== null && t >= start);
        const tapeStart = time('a3_tape_out');
        const tapeEnd = time('a3_tape_stop');
        mina.setProp('tape', tapeStart !== null && t >= tapeStart && (tapeEnd === null || t < tapeEnd));
      }
    }
    if (scene.id === 'a6_laundrette' && etienne) {
      const start = time('a6_paper_handed');
      etienne.setProp('paper', start !== null && t >= start);
    }
  }

  private lookup: EnvEventLookup = {
    timeOf: (id: string): number | null => {
      const at = this.eventTimes.get(id);
      return at === undefined ? null : at;
    }
  };

  get builtFlag(): boolean {
    return this.built;
  }

  dispose(): void {
    for (const runtime of this.runtimes.values()) {
      this.stage.scene.remove(runtime.group);
      runtime.env.dispose();
    }
    this.runtimes.clear();
    this.built = false;
  }
}

export function resolveEmotionForActor(line: LineCue | null, actor: ActorId): Emotion {
  if (!line) return 'neutral';
  return SPEAKER_TO_ACTOR[line.speaker] === actor ? line.emotion : 'neutral';
}

export { eventTime };
