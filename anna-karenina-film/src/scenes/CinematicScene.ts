import type { ActorTrack, CameraKey, PropCue, SceneDef, Shot } from '../data/types';
import { PALETTES } from '../data/palettes';
import { sceneShotAt } from '../data/helpers';
import { ease, easeByName, clamp, smoothstep } from '../engine/easing';
import { ParticleLayer } from '../engine/ParticleLayer';
import { renderEnvironment } from './environments';
import { getCharacterSpec } from '../characters/specs';
import {
  CharacterRenderer,
  getExpressionParams,
  getPoseParams,
  lerpExpression,
  lerpPose
} from '../characters/CharacterRenderer';
import { createProp, renderProp, type PropView } from './props';

interface ActorView {
  track: ActorTrack;
  view: CharacterRenderer;
  seed: number;
}

interface EnvView {
  back: HTMLDivElement;
  front: HTMLDivElement;
}

function interpolateCamera(keys: CameraKey[], t: number): { x: number; y: number; zoom: number } {
  if (keys.length === 0) return { x: 960, y: 540, zoom: 1 };
  if (keys.length === 1) return keys[0];
  const sorted = keys;
  if (t <= sorted[0].t) return sorted[0];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (!a || !b) continue;
    if (t >= a.t && t <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      const raw = clamp((t - a.t) / span, 0, 1);
      const k = easeByName(b.ease ?? 'cinematic', raw);
      const aZoom = a.zoom;
      const bZoom = b.zoom;
      return {
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        zoom: aZoom + (bZoom - aZoom) * k
      };
    }
  }
  return sorted[sorted.length - 1];
}

type KeyState = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  flip: boolean;
  blur: number;
  pose: ReturnType<typeof getPoseParams>;
  expression: ReturnType<typeof getExpressionParams>;
  gaze: { x: number; y: number };
};

function actorStateAt(track: ActorTrack, t: number): KeyState | null {
  const keys = track.keys;
  if (keys.length === 0) return null;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return null;
  const build = (k: (typeof keys)[number], k2: (typeof keys)[number], mix: number): KeyState => ({
    x: k.x + (k2.x - k.x) * mix,
    y: k.y + (k2.y - k.y) * mix,
    scale: k.scale + (k2.scale - k.scale) * mix,
    opacity: (k.opacity ?? 1) + ((k2.opacity ?? 1) - (k.opacity ?? 1)) * mix,
    flip: mix < 0.5 ? Boolean(k.flip) : Boolean(k2.flip),
    blur: (k.blur ?? 0) + ((k2.blur ?? 0) - (k.blur ?? 0)) * mix,
    pose: lerpPose(getPoseParams(k.pose), getPoseParams(k2.pose), mix),
    expression: lerpExpression(getExpressionParams(k.expression), getExpressionParams(k2.expression), mix),
    gaze: {
      x: (k.gaze?.x ?? 0) + ((k2.gaze?.x ?? 0) - (k.gaze?.x ?? 0)) * mix,
      y: (k.gaze?.y ?? 0) + ((k2.gaze?.y ?? 0) - (k.gaze?.y ?? 0)) * mix
    }
  });
  if (t <= first.t) return build(first, first, 0);
  if (t >= last.t) return build(last, last, 0);
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (!a || !b) continue;
    if (t >= a.t && t <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      const raw = clamp((t - a.t) / span, 0, 1);
      const mix = ease.inOut(raw);
      return build(a, b, mix);
    }
  }
  return build(last, last, 0);
}

export class CinematicScene {
  readonly root: HTMLDivElement;
  readonly scene: SceneDef;
  private readonly cameraWorld: HTMLDivElement;
  private readonly envBackLayer: HTMLDivElement;
  private readonly envFrontLayer: HTMLDivElement;
  private readonly backPropLayer: HTMLDivElement;
  private readonly frontPropLayer: HTMLDivElement;
  private readonly actorLayer: HTMLDivElement;
  private readonly particleLayer: ParticleLayer;
  private readonly haze: HTMLDivElement;
  private readonly grade: HTMLDivElement;
  private readonly lighting: HTMLDivElement;
  private readonly flash: HTMLDivElement;
  private readonly environments = new Map<string, EnvView>();
  private readonly actorViews = new Map<string, ActorView[]>();
  private readonly propViews = new Map<string, { cue: PropCue; view: PropView }[]>();
  private activeShotIndex = -1;
  private activeShot: Shot | null = null;
  private disposed = false;

  constructor(scene: SceneDef) {
    this.scene = scene;
    const p = PALETTES[scene.palette];
    this.root = document.createElement('div');
    this.root.className = `scene scene-${scene.id} palette-${scene.palette}`;
    this.root.style.setProperty('--p-bg', p.bg);
    this.root.style.setProperty('--p-deep', p.deep);
    this.root.style.setProperty('--p-mid', p.mid);
    this.root.style.setProperty('--p-light', p.light);
    this.root.style.setProperty('--p-accent', p.accent);
    this.root.style.setProperty('--p-warm', p.warm);
    this.root.style.setProperty('--p-cold', p.cold);
    this.root.style.setProperty('--p-ink', p.ink);
    this.root.style.setProperty('--p-glow', p.glow);

    this.cameraWorld = document.createElement('div');
    this.cameraWorld.className = 'camera-world';
    this.envBackLayer = document.createElement('div');
    this.envBackLayer.className = 'env-layer env-back-layer';
    this.envFrontLayer = document.createElement('div');
    this.envFrontLayer.className = 'env-layer env-front-layer';
    this.backPropLayer = document.createElement('div');
    this.backPropLayer.className = 'prop-layer back-prop-layer';
    this.frontPropLayer = document.createElement('div');
    this.frontPropLayer.className = 'prop-layer front-prop-layer';
    this.actorLayer = document.createElement('div');
    this.actorLayer.className = 'actor-layer';

    this.cameraWorld.append(
      this.envBackLayer,
      this.backPropLayer,
      this.actorLayer,
      this.frontPropLayer,
      this.envFrontLayer
    );

    this.particleLayer = new ParticleLayer();
    this.haze = document.createElement('div');
    this.haze.className = 'scene-haze';
    this.grade = document.createElement('div');
    this.grade.className = 'scene-grade';
    this.lighting = document.createElement('div');
    this.lighting.className = 'scene-lighting';
    this.flash = document.createElement('div');
    this.flash.className = 'scene-flash';

    this.root.append(this.cameraWorld, this.haze, this.grade, this.particleLayer.canvas, this.lighting, this.flash);

    const envIds = Array.from(new Set(scene.shots.map((s) => s.environment)));
    for (const id of envIds) {
      const render = renderEnvironment(id, p);
      const back = document.createElement('div');
      back.className = 'env-layer-instance env-back-instance';
      back.innerHTML = render.back;
      back.style.display = 'none';
      const front = document.createElement('div');
      front.className = 'env-layer-instance env-front-instance';
      front.innerHTML = render.front;
      front.style.display = 'none';
      this.envBackLayer.append(back);
      this.envFrontLayer.append(front);
      this.environments.set(id, { back, front });
    }
  }

  render(localTime: number): void {
    if (this.disposed) return;
    const t = clamp(localTime, 0, this.scene.duration);
    const { shot, index } = sceneShotAt(this.scene.shots, t);
    if (index !== this.activeShotIndex) this.activateShot(index);
    const shotTime = Math.max(0, t - shot.start);
    const camera = interpolateCamera(shot.camera, shotTime);

    const tx = 960 - camera.x * camera.zoom;
    const ty = 540 - camera.y * camera.zoom;
    this.cameraWorld.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${camera.zoom.toFixed(4)})`;

    const env = this.environments.get(shot.environment);
    if (env) {
      const applyParallax = (root: HTMLDivElement, factor: number) => {
        const dx = (camera.x - 960) * factor;
        const dy = (camera.y - 540) * factor;
        root.querySelectorAll<SVGGElement>('.env-bg, .env-mid, .env-fg').forEach((group) => {
          group.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
        });
      };
      applyParallax(env.back, -0.075);
      applyParallax(env.front, 0.055);
      const blur = camera.zoom > 1.08 ? Math.min(4.2, 1.05 + (camera.zoom - 1.08) * 3.1) : 0.18;
      env.back.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : '';
      env.front.style.filter = blur > 0.08 ? `blur(${(blur * 1.25).toFixed(2)}px)` : '';
    }

    const views = this.actorViews.get(shot.id) ?? [];
    for (const actorView of views) {
      const state = actorStateAt(actorView.track, shotTime);
      if (!state) continue;
      const el = actorView.view.element;
      const scale = state.scale;
      const x = state.flip ? state.x + 200 * scale : state.x - 200 * scale;
      const y = state.y - 800 * scale;
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${state.flip ? -scale : scale}, ${scale})`;
      el.style.opacity = `${state.opacity}`;
      const filters: string[] = ['contrast(1.045) saturate(0.92) brightness(0.97)'];
      if (actorView.track.back) filters.push('brightness(0.58) saturate(0.78)');
      if (state.blur > 0.04) filters.push(`blur(${state.blur.toFixed(2)}px)`);
      el.style.filter = filters.join(' ');
      actorView.view.render({
        time: t + this.scene.index * 19.7 + actorView.seed * 3.1,
        pose: state.pose,
        expression: state.expression,
        gaze: { x: state.flip ? -state.gaze.x : state.gaze.x, y: state.gaze.y },
        seed: actorView.seed
      });
    }

    const crowd = env?.back.querySelectorAll<SVGGElement>('.env-crowd-sway') ?? [];
    crowd.forEach((group, index) => {
      const sway = Math.sin(t * 0.32 + index * 1.37) * 2.2;
      const bob = Math.sin(t * 0.48 + index * 0.91) * 0.8;
      group.setAttribute('transform', `translate(${sway.toFixed(2)} ${bob.toFixed(2)})`);
    });

    const props = this.propViews.get(shot.id) ?? [];
    for (const item of props) {
      renderProp(item.view, item.cue.x, item.cue.y, item.cue.scale, item.cue.opacity ?? 1, t);
    }

    this.particleLayer.render(t);

    const flicker = 0.96 + Math.sin(t * 2.7 + this.scene.index) * 0.03 + Math.sin(t * 6.3) * 0.01;
    this.lighting.style.opacity = flicker.toFixed(3);

    const fadeIn = smoothstep(0, 0.55, t);
    const fadeOut = smoothstep(0, 0.65, this.scene.duration - t);
    const sceneOpacity = this.scene.index === 0 ? fadeOut : Math.min(fadeIn, fadeOut);
    this.root.style.opacity = sceneOpacity.toFixed(3);

    let flashOpacity = 0;
    this.flash.style.background = '#ffffff';
    if (shot.id === 's11-light') {
      flashOpacity = smoothstep(0, shot.duration * 0.72, shotTime) * 0.92;
    }
    if (shot.id === 's11-aftermath') {
      flashOpacity = 1;
      this.flash.style.background = '#000000';
    }
    this.flash.style.opacity = flashOpacity.toFixed(3);
  }

  private activateShot(index: number): void {
    const shot = this.scene.shots[index];
    if (!shot) return;
    this.activeShotIndex = index;
    this.activeShot = shot;

    for (const env of this.environments.values()) {
      env.back.style.display = 'none';
      env.front.style.display = 'none';
    }
    const env = this.environments.get(shot.environment);
    if (env) {
      env.back.style.display = 'block';
      env.front.style.display = 'block';
    }

    for (const views of this.actorViews.values()) {
      for (const view of views) view.view.element.style.display = 'none';
    }
    let views = this.actorViews.get(shot.id);
    if (!views) {
      views = shot.actors.map((track, i) => {
        const spec = getCharacterSpec(track.character, track.variant);
        const view = new CharacterRenderer(spec, { back: track.back });
        view.element.style.position = 'absolute';
        this.actorLayer.append(view.element);
        return { track, view, seed: 1.7 + i * 2.13 + this.scene.index * 0.41 };
      });
      this.actorViews.set(shot.id, views);
    }
    for (const actorView of views) {
      actorView.view.element.style.display = 'block';
    }

    for (const props of this.propViews.values()) {
      for (const item of props) item.view.element.style.display = 'none';
    }
    let props = this.propViews.get(shot.id);
    if (!props) {
      props = (shot.props ?? []).map((cue) => {
        const view = createProp(cue.id);
        view.element.style.position = 'absolute';
        if (cue.id === 'closedDoor' || cue.id === 'horse') {
          this.backPropLayer.append(view.element);
        } else {
          this.frontPropLayer.append(view.element);
        }
        return { cue, view };
      });
      this.propViews.set(shot.id, props);
    }
    for (const item of props) item.view.element.style.display = 'block';

    this.particleLayer.setEffects(shot.effects);
  }

  dispose(): void {
    this.disposed = true;
    this.actorLayer.replaceChildren();
    this.backPropLayer.replaceChildren();
    this.frontPropLayer.replaceChildren();
    this.envBackLayer.replaceChildren();
    this.envFrontLayer.replaceChildren();
    this.root.remove();
  }
}
