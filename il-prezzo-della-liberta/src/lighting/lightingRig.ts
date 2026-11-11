import { Color, DirectionalLight, Fog, HemisphereLight, Scene } from 'three';
import type { ActPalette, CompiledFilm, LightsFile, ScenePaletteOverride } from '../data/types';
import { clamp01, smoothstep } from '../utils/math';

interface ResolvedPalette {
  sky: Color;
  ground: Color;
  fog: Color;
  fogNear: number;
  fogFar: number;
  hemi: number;
  hemiColor: Color;
  keyColor: Color;
  keyIntensity: number;
  keyPos: [number, number, number];
  exposure: number;
}

const OVERRIDE_KEYS: Array<keyof ScenePaletteOverride> = ['fogNear', 'fogFar', 'hemi', 'exposure'];

export class LightingRig {
  private scene: Scene;
  private film: CompiledFilm;
  private hemi: HemisphereLight;
  private key: DirectionalLight;
  private fog: Fog;
  private acts: ActPalette[];
  private actIds: string[];
  private overrides: LightsFile['scenes'];
  private current: ResolvedPalette;
  private a: ResolvedPalette;
  private b: ResolvedPalette;
  exposure = 1;

  constructor(scene: Scene, film: CompiledFilm, lights: LightsFile) {
    this.scene = scene;
    this.film = film;
    this.actIds = film.acts.map((a) => a.id);
    this.acts = this.actIds.map((id) => {
      const palette = lights.acts[id];
      if (!palette) throw new Error(`Palette mancante per ${id}`);
      return palette;
    });
    this.overrides = lights.scenes;

    this.fog = new Fog('#000000', 10, 100);
    scene.fog = this.fog;

    this.hemi = new HemisphereLight('#ffffff', '#222222', 0.6);
    scene.add(this.hemi);

    this.key = new DirectionalLight('#ffffff', 1);
    this.key.position.set(-20, 35, 20);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.near = 1;
    this.key.shadow.camera.far = 140;
    this.key.shadow.camera.left = -28;
    this.key.shadow.camera.right = 28;
    this.key.shadow.camera.top = 28;
    this.key.shadow.camera.bottom = -28;
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    scene.add(this.key);

    this.current = this.blank();
    this.a = this.blank();
    this.b = this.blank();

    this.apply(0);
  }

  private blank(): ResolvedPalette {
    return {
      sky: new Color(),
      ground: new Color(),
      fog: new Color(),
      fogNear: 10,
      fogFar: 100,
      hemi: 0.6,
      hemiColor: new Color(),
      keyColor: new Color(),
      keyIntensity: 1,
      keyPos: [-20, 35, 20],
      exposure: 1
    };
  }

  private readPalette(id: string, out: ResolvedPalette): ResolvedPalette {
    const index = this.actIds.indexOf(id);
    const p = this.acts[Math.max(0, index)];
    out.sky.set(p.sky);
    out.ground.set(p.ground);
    out.fog.set(p.fog);
    out.fogNear = p.fogNear;
    out.fogFar = p.fogFar;
    out.hemi = p.hemi;
    out.hemiColor.set(p.hemiColor);
    out.keyColor.set(p.keyColor);
    out.keyIntensity = p.keyIntensity;
    out.keyPos = [p.keyPos[0], p.keyPos[1], p.keyPos[2]];
    out.exposure = p.exposure;
    return out;
  }

  private lerpPalette(a: ResolvedPalette, b: ResolvedPalette, t: number, out: ResolvedPalette): void {
    out.sky.copy(a.sky).lerp(b.sky, t);
    out.ground.copy(a.ground).lerp(b.ground, t);
    out.fog.copy(a.fog).lerp(b.fog, t);
    out.fogNear = a.fogNear + (b.fogNear - a.fogNear) * t;
    out.fogFar = a.fogFar + (b.fogFar - a.fogFar) * t;
    out.hemi = a.hemi + (b.hemi - a.hemi) * t;
    out.hemiColor.copy(a.hemiColor).lerp(b.hemiColor, t);
    out.keyColor.copy(a.keyColor).lerp(b.keyColor, t);
    out.keyIntensity = a.keyIntensity + (b.keyIntensity - a.keyIntensity) * t;
    out.keyPos = [
      a.keyPos[0] + (b.keyPos[0] - a.keyPos[0]) * t,
      a.keyPos[1] + (b.keyPos[1] - a.keyPos[1]) * t,
      a.keyPos[2] + (b.keyPos[2] - a.keyPos[2]) * t
    ];
    out.exposure = a.exposure + (b.exposure - a.exposure) * t;
  }

  apply(t: number): void {
    const actIndex = this.actIndexAt(t);
    const act = this.film.acts[actIndex];
    this.readPalette(act.id, this.a);

    let blendToNext = 0;
    if (actIndex < this.film.acts.length - 1 && act.end - t < 4) {
      blendToNext = smoothstep((t - (act.end - 4)) / 4);
      this.readPalette(this.film.acts[actIndex + 1].id, this.b);
      this.lerpPalette(this.a, this.b, blendToNext, this.current);
    } else {
      this.current.sky.copy(this.a.sky);
      this.current.ground.copy(this.a.ground);
      this.current.fog.copy(this.a.fog);
      this.current.fogNear = this.a.fogNear;
      this.current.fogFar = this.a.fogFar;
      this.current.hemi = this.a.hemi;
      this.current.hemiColor.copy(this.a.hemiColor);
      this.current.keyColor.copy(this.a.keyColor);
      this.current.keyIntensity = this.a.keyIntensity;
      this.current.keyPos = [...this.a.keyPos];
      this.current.exposure = this.a.exposure;
    }

    const scene = this.film.scenes.find((s) => t >= s.start && t < s.end) ?? this.film.scenes[this.film.scenes.length - 1];
    const previous = this.previousScene(scene.id);
    const currentOverride = this.overrides[scene.env] ?? {};
    const previousOverride = previous ? this.overrides[previous.env] ?? {} : {};
    const inTransition = clamp01((t - scene.start) / 2.0);
    const transition = scene.start > 0 ? smoothstep(inTransition) : 1;

    for (const key of OVERRIDE_KEYS) {
      const from = previousOverride[key];
      const to = currentOverride[key];
      if (to === undefined && from === undefined) continue;
      if (key === 'fogNear' || key === 'fogFar' || key === 'hemi' || key === 'exposure') {
        const value = blendOptional(from, to, transition, this.current[key]);
        if (key === 'fogNear') this.current.fogNear = value;
        else if (key === 'fogFar') this.current.fogFar = value;
        else if (key === 'hemi') this.current.hemi = value;
        else this.current.exposure = value;
      }
    }

    this.hemi.color.copy(this.current.hemiColor);
    this.hemi.groundColor.copy(this.current.ground);
    this.hemi.intensity = this.current.hemi;
    this.key.color.copy(this.current.keyColor);
    this.key.intensity = this.current.keyIntensity;
    this.key.position.set(this.current.keyPos[0], this.current.keyPos[1], this.current.keyPos[2]);
    this.fog.color.copy(this.current.fog);
    this.fog.near = this.current.fogNear;
    this.fog.far = this.current.fogFar;
    this.exposure = this.current.exposure;

    if (!(this.scene.background instanceof Color)) {
      this.scene.background = new Color();
    }
    (this.scene.background as Color).copy(this.current.sky);
  }

  private actIndexAt(t: number): number {
    for (let i = 0; i < this.film.acts.length; i += 1) {
      if (t < this.film.acts[i].end) return i;
    }
    return this.film.acts.length - 1;
  }

  private previousScene(id: string): CompiledFilm['scenes'][number] | null {
    const index = this.film.scenes.findIndex((s) => s.id === id);
    if (index <= 0) return null;
    return this.film.scenes[index - 1];
  }
}

function blendOptional(from: number | undefined, to: number | undefined, t: number, fallback: number): number {
  if (from === undefined && to === undefined) return fallback;
  if (from === undefined) return (to as number) * t + fallback * (1 - t);
  if (to === undefined) return from * (1 - t) + fallback * t;
  return from + (to - from) * t;
}
