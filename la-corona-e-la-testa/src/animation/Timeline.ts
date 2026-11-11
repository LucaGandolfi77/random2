import screenplayData from '../data/screenplay.json';
import cameraCuesData from '../data/camera-cues.json';
import { compileScreenplay } from '../data/compileScreenplay';
import type {
  CameraCuesData,
  CompiledAct,
  CompiledBeat,
  CompiledDialogue,
  CompiledFilm,
  CompiledStage,
  ScreenplayData,
  TitleCardEvent,
} from '../data/types';

export class Timeline {
  readonly film: CompiledFilm;
  readonly screenplay: ScreenplayData;
  readonly cues: CameraCuesData;

  constructor() {
    this.screenplay = screenplayData as ScreenplayData;
    this.cues = cameraCuesData as unknown as CameraCuesData;
    this.film = compileScreenplay(this.screenplay, this.cues);
  }

  get duration(): number {
    return this.film.duration;
  }

  clamp(time: number): number {
    return Math.min(this.duration, Math.max(0, time));
  }

  getActAt(time: number): CompiledAct {
    const value = this.clamp(time);
    for (let index = this.film.acts.length - 1; index >= 0; index -= 1) {
      if (value >= this.film.acts[index].start) return this.film.acts[index];
    }
    return this.film.acts[0];
  }

  getBeatAt(time: number): CompiledBeat {
    const value = this.clamp(time);
    for (let index = this.film.beats.length - 1; index >= 0; index -= 1) {
      if (value >= this.film.beats[index].start) return this.film.beats[index];
    }
    return this.film.beats[0];
  }

  getStageAt(time: number): CompiledStage {
    const value = this.clamp(time);
    for (let index = this.film.stages.length - 1; index >= 0; index -= 1) {
      if (value >= this.film.stages[index].start && value < this.film.stages[index].end) {
        return this.film.stages[index];
      }
    }
    return this.film.stages[this.film.stages.length - 1];
  }

  getDialogueAt(time: number): CompiledDialogue | null {
    const value = this.clamp(time);
    for (const line of this.film.dialogue) {
      if (value >= line.start && value < line.end) return line;
    }
    return null;
  }

  getTitleCardAt(time: number): TitleCardEvent | null {
    const value = this.clamp(time);
    for (const card of this.film.titleCards) {
      if (value >= card.start && value < card.end) return card;
    }
    return null;
  }

  getActById(id: string): CompiledAct | null {
    return this.film.acts.find((act) => act.id === id) ?? null;
  }

  getBeatById(id: string): CompiledBeat | null {
    return this.film.beats.find((beat) => beat.id === id) ?? null;
  }

  nextAct(time: number): CompiledAct | null {
    const current = this.getActAt(time);
    const index = this.film.acts.findIndex((act) => act.id === current.id);
    return this.film.acts[Math.min(this.film.acts.length - 1, index + 1)] ?? null;
  }

  previousAct(time: number): CompiledAct | null {
    const current = this.getActAt(time);
    const index = this.film.acts.findIndex((act) => act.id === current.id);
    const currentOffset = time - current.start;
    if (currentOffset > 2.5) return current;
    return this.film.acts[Math.max(0, index - 1)] ?? null;
  }
}
