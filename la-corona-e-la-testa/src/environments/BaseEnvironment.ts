import * as THREE from 'three';
import type { CompiledFilm, EnvironmentKind } from '../data/types';
import type { StageActor } from '../characters/StageActor';

export interface FogSettings {
  color: number;
  near: number;
  far: number;
}

export interface MenuCamera {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export abstract class BaseEnvironment {
  readonly id: string;
  readonly kind: EnvironmentKind;
  readonly group = new THREE.Group();
  readonly marks = new Map<string, THREE.Vector3>();
  readonly actors = new Map<string, StageActor>();
  readonly defaultVisibility = new Map<string, boolean>();
  readonly initialState = new Map<
    string,
    { position: THREE.Vector3; yaw: number; visible: boolean }
  >();
  fog: FogSettings = { color: 0x0b1322, near: 22, far: 95 };
  menuCamera: MenuCamera | null = null;

  protected constructor(id: string, kind: EnvironmentKind) {
    this.id = id;
    this.kind = kind;
    this.group.name = `environment:${id}`;
  }

  mark(name: string, x: number, y: number, z: number): THREE.Vector3 {
    const value = new THREE.Vector3(x, y, z);
    this.marks.set(name, value);
    return value;
  }

  getMark(name: string): THREE.Vector3 | null {
    return this.marks.get(name) ?? null;
  }

  addActor(
    actor: StageActor,
    markName: string,
    yaw = 0,
    visible = true,
  ): StageActor {
    const position = this.getMark(markName) ?? new THREE.Vector3();
    actor.root.position.copy(position);
    actor.root.rotation.y = yaw;
    actor.defaultVisible = visible;
    actor.root.visible = visible;
    this.actors.set(actor.id, actor);
    this.defaultVisibility.set(actor.id, visible);
    this.initialState.set(actor.id, {
      position: position.clone(),
      yaw,
      visible,
    });
    this.group.add(actor.root);
    return actor;
  }

  getActor(id: string): StageActor | null {
    return this.actors.get(id) ?? null;
  }

  setDefaultVisibility(id: string, visible: boolean): void {
    this.defaultVisibility.set(id, visible);
    const actor = this.actors.get(id);
    if (actor) {
      actor.defaultVisible = visible;
      actor.root.visible = visible;
    }
  }

  update(_time: number, _playing: boolean): void {
    // Environments override this for lamps, stars, flocks and other stage life.
  }

  applyQuality(_low: boolean): void {
    // Environments override this when they can shed detail.
  }

  applyTimeline(_film: CompiledFilm): void {
    // Environments can read precise cue times for props that change state.
  }
}
