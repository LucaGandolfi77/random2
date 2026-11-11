import * as THREE from 'three';
import type { CompiledFilm, CompiledStage, EnvironmentKind } from '../data/types';
import { BaseEnvironment } from '../environments/BaseEnvironment';
import { Piazza } from '../environments/Piazza';
import { Alley } from '../environments/Alley';
import { Park } from '../environments/Park';
import { Road } from '../environments/Road';
import { Countryside } from '../environments/Countryside';
import { Hill, HillDawn } from '../environments/Hill';

type StageFactory = (id: string) => BaseEnvironment;

const STAGE_FACTORIES: Record<EnvironmentKind, StageFactory> = {
  piazza: (id) => new Piazza(id),
  alley: (id) => new Alley(id),
  park: (id) => new Park(id),
  road: (id) => new Road(id),
  countryside: (id) => new Countryside(id),
  hill: (id) => new Hill(id),
  hillDawn: (id) => new HillDawn(id),
};

export interface BuildProgress {
  ratio: number;
  label: string;
}

export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  private readonly stages = new Map<string, BaseEnvironment>();
  private active: BaseEnvironment | null = null;
  private menuStageId: string | null = null;
  private qualityLow = false;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.scene.name = 'l-ultimo-bagno';
  }

  async build(
    film: CompiledFilm,
    onProgress?: (progress: BuildProgress) => void,
  ): Promise<void> {
    for (let index = 0; index < film.stages.length; index += 1) {
      const stage = film.stages[index];
      const environment = STAGE_FACTORIES[stage.kind](stage.id);
      environment.group.visible = false;
      environment.applyTimeline(film);
      environment.applyQuality(this.qualityLow);
      this.stages.set(stage.id, environment);
      this.scene.add(environment.group);

      onProgress?.({
        ratio: (index + 1) / film.stages.length,
        label: this.stageLabel(stage),
      });

      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => resolve());
        } else {
          setTimeout(resolve, 0);
        }
      });
    }

    const firstStage = film.stages[0];
    if (firstStage) this.activate(firstStage.id, true);
  }

  private stageLabel(stage: CompiledStage): string {
    const labels: Record<EnvironmentKind, string> = {
      piazza: 'Piazza',
      alley: 'Vicoli',
      park: 'Parco',
      road: 'Strada provinciale',
      countryside: 'Campagna',
      hill: 'Collina',
      hillDawn: 'Alba',
    };
    return labels[stage.kind] ?? stage.kind;
  }

  activate(stageId: string, force = false): BaseEnvironment | null {
    const next = this.stages.get(stageId);
    if (!next) return null;
    if (this.active === next && !force) return next;

    if (this.active && this.active !== next) {
      this.active.group.visible = false;
    }

    this.active = next;
    next.group.visible = true;

    const fog = next.fog;
    this.scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(fog.color);
    } else {
      this.scene.background = new THREE.Color(fog.color);
    }
    return next;
  }

  enterMenuMode(): BaseEnvironment | null {
    this.menuStageId = 'atto1::piazza';
    const stage = this.activate(this.menuStageId, true);
    if (stage) {
      for (const actor of stage.actors.values()) actor.root.visible = false;
    }
    return stage;
  }

  leaveMenuMode(): void {
    this.menuStageId = null;
  }

  getActiveStage(): BaseEnvironment | null {
    return this.active;
  }

  getStage(stageId: string): BaseEnvironment | null {
    return this.stages.get(stageId) ?? null;
  }

  getMenuStage(): BaseEnvironment | null {
    return this.menuStageId ? this.stages.get(this.menuStageId) ?? null : null;
  }

  get stagesList(): BaseEnvironment[] {
    return [...this.stages.values()];
  }

  update(time: number, playing: boolean): void {
    this.active?.update(time, playing);
  }

  applyQuality(low: boolean): void {
    this.qualityLow = low;
    for (const stage of this.stages.values()) stage.applyQuality(low);
    this.renderer.shadowMap.enabled = !low;
    this.renderer.setPixelRatio(
      low ? 1 : Math.min(window.devicePixelRatio || 1, 1.75),
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  setRendererSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }
}
