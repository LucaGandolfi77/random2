import * as THREE from 'three';
import type { Simulation } from '../../core/engine/Simulation';
import type { SimEvent } from '../../core/game-state/types';
import { getFighterDefinition } from '../../fighters/roster';
import { createPlatformStates, updatePlatformStates, type PlatformState } from '../../physics/platforms';
import { LAST_FESTIVAL, getStageDefinition } from '../../stages/stageData';
import type { StageDefinition } from '../../stages/types';
import { HitboxDebugView } from '../../debug/HitboxDebugView';
import { CameraRig } from './CameraRig';
import { EffectsSystem } from './EffectsSystem';
import { FighterView } from './FighterView';
import { StageView } from './StageView';
import { createItemMesh, createProjectileMesh } from './entityMeshes';
import { disposeGroup } from './fighterModels';

export interface RenderStats {
  drawCalls: number;
  triangles: number;
  meshes: number;
  geometries: number;
  textures: number;
  renderer: string;
  webgpuSupported: boolean;
  pixelRatio: number;
  cameraDistance: number;
}

interface EntityView {
  mesh: THREE.Group;
}

export class GameRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cameraRig: CameraRig;
  private readonly effects = new EffectsSystem();
  private readonly debugView = new HitboxDebugView();
  private readonly fighterLayer = new THREE.Group();
  private readonly castLayer = new THREE.Group();
  private readonly itemLayer = new THREE.Group();
  private readonly projectileLayer = new THREE.Group();
  private readonly previewLight = new THREE.PointLight(0xfff1dd, 0, 16, 2);

  private stageView: StageView | null = null;
  private stageId = '';
  private menuPlatforms: PlatformState[] = [];
  private menuStage: StageDefinition = LAST_FESTIVAL;
  private castViews: FighterView[] = [];
  private previewView: FighterView | null = null;
  private previewKey = '';
  private fighterViews = new Map<number, FighterView>();
  private itemViews = new Map<number, EntityView>();
  private projectileViews = new Map<number, EntityView>();
  private simulation: Simulation | null = null;
  private time = 0;
  private menuFrame = 0;
  private lastStage: StageDefinition = LAST_FESTIVAL;
  private disposed = false;
  private hitboxDebug = false;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'game-canvas';
    container.appendChild(this.canvas);

    this.cameraRig = new CameraRig((container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight));
    this.previewLight.position.set(3.2, 3.3, 5.5);
    this.scene.add(this.previewLight);
    this.scene.add(
      this.fighterLayer,
      this.castLayer,
      this.itemLayer,
      this.projectileLayer,
      this.effects.group,
      this.debugView.group,
    );
    this.scene.background = new THREE.Color(0x05010a);
    this.scene.fog = new THREE.Fog(0x0b0318, 30, 90);
    this.debugView.group.visible = false;
    window.addEventListener('resize', this.resize);
  }

  get webgpuSupported(): boolean {
    return Boolean((navigator as unknown as { gpu?: unknown }).gpu);
  }

  setHitboxDebug(enabled: boolean): void {
    this.hitboxDebug = enabled;
    this.debugView.group.visible = enabled;
  }

  private ensureStage(stage: StageDefinition): void {
    if (this.stageView && this.stageId === stage.id) {
      this.lastStage = stage;
      return;
    }
    if (this.stageView) {
      this.stageView.dispose();
      this.stageView = null;
    }
    this.stageView = new StageView(stage);
    this.scene.add(this.stageView.group);
    this.stageId = stage.id;
    this.lastStage = stage;
    this.menuStage = stage;
    this.menuPlatforms = createPlatformStates(stage.platforms);
    this.scene.background = new THREE.Color(stage.theme.skyTop);
    this.scene.fog = new THREE.Fog(stage.theme.fog, 30, 90);
  }

  showMenuCast(ids: string[], colorIndices: number[] = []): void {
    this.previewLight.intensity = 0;
    this.ensureStage(LAST_FESTIVAL);
    this.clearPreview();
    this.clearCast();
    this.cameraRig.setMode('menu');
    const positions = [-3.4, -1.15, 1.15, 3.4];
    ids.forEach((id, index) => {
      const definition = getFighterDefinition(id);
      if (!definition) return;
      const view = new FighterView(definition, colorIndices[index] ?? 0);
      view.setPreviewPosition(positions[index] ?? 0, 0);
      this.castLayer.add(view.rig.root);
      this.castViews.push(view);
    });
  }

  showStagePreview(stageId: string): void {
    this.previewLight.intensity = 0;
    const stage = getStageDefinition(stageId) ?? LAST_FESTIVAL;
    this.ensureStage(stage);
    this.clearPreview();
    this.clearCast();
    this.cameraRig.setMode('stage');
    this.renderMenu(0);
  }

  showFighterPreview(fighterId: string, colorIndex: number): void {
    const definition = getFighterDefinition(fighterId);
    if (!definition) return;
    this.previewLight.intensity = 26;
    this.ensureStage(LAST_FESTIVAL);
    this.clearCast();
    const key = `${fighterId}:${colorIndex}`;
    if (this.previewView && this.previewKey !== key) {
      this.clearPreview();
    }
    if (!this.previewView) {
      this.previewView = new FighterView(definition, colorIndex);
      this.previewView.setPreviewPosition(3.0, 0);
      this.castLayer.add(this.previewView.rig.root);
      this.previewKey = key;
    }
    this.cameraRig.setMode('preview');
    this.cameraRig.setPreviewFocus(0.9);
  }

  startMatch(sim: Simulation): void {
    this.previewLight.intensity = 0;
    this.ensureStage(sim.stage);
    this.clearCast();
    this.clearPreview();
    this.clearMatchEntities();
    this.fighterViews.clear();
    this.effects.clear();
    this.simulation = sim;
    for (const fighter of sim.fighters) {
      const view = new FighterView(fighter.definition, fighter.config.colorIndex);
      this.fighterLayer.add(view.rig.root);
      this.fighterViews.set(fighter.slot, view);
    }
    this.cameraRig.setMode('fight');
    this.cameraRig.update(sim.fighters, sim.stage, 0, 1);
  }

  leaveMatch(): void {
    this.clearMatchEntities();
    this.effects.clear();
    this.debugView.group.visible = false;
    this.simulation = null;
  }

  syncMatch(sim: Simulation, alpha: number, dt: number): void {
    this.time += dt;
    if (this.stageView) {
      this.stageView.update(sim.platforms, sim.hazardPhase, this.time, dt);
    }
    for (const fighter of sim.fighters) {
      const view = this.fighterViews.get(fighter.slot);
      if (view) view.update(fighter, alpha, this.time);
    }
    this.syncItems(sim);
    this.syncProjectiles(sim);
    this.effects.update(dt);
    this.debugView.update(sim, this.hitboxDebug);
    this.cameraRig.update(sim.fighters, sim.stage, alpha, dt);
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  renderMenu(dt: number): void {
    this.time += dt;
    this.menuFrame += dt * 60;
    if (!this.stageView) this.ensureStage(this.menuStage);
    updatePlatformStates(this.menuPlatforms, this.menuFrame);
    if (this.stageView) this.stageView.update(this.menuPlatforms, 'idle', this.time, dt);
    this.castViews.forEach((view, index) => view.updatePreview(this.time + index * 1.7));
    this.previewView?.updatePreview(this.time);
    this.effects.update(dt);
    this.debugView.group.visible = false;
    this.cameraRig.update(null, this.menuStage, 0, dt);
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  handleEvent(event: SimEvent): void {
    switch (event.type) {
      case 'hit':
        this.effects.spawnHit(event.x, event.y, event.power, event.effect, event.shielded);
        this.cameraRig.addShake(Math.min(0.3, 0.03 + event.power * 0.0022));
        break;
      case 'ko': {
        const fighter = this.simulation?.getFighter(event.player);
        const palette = fighter?.definition.palettes[fighter.config.colorIndex % fighter.definition.palettes.length];
        this.effects.spawnKO(event.x, event.y, palette?.accent ?? 0xff2d95);
        this.cameraRig.addShake(0.42);
        break;
      }
      case 'hype':
        this.effects.spawnHype(event.x, event.y);
        this.cameraRig.addShake(0.18);
        break;
      case 'itemSpawn':
        this.effects.spawnItem(event.x, event.y);
        break;
      case 'itemPickup':
        this.effects.spawnItem(event.x, event.y, 0xffd319);
        break;
      case 'projectile':
        this.effects.spawnItem(event.x, event.y, 0x39f6ff);
        break;
      case 'clash':
        this.effects.spawnHit(event.x, event.y, 42, 'flash');
        this.effects.spawnHype(event.x, event.y, 0xffffff);
        this.cameraRig.addShake(0.12);
        break;
      default:
        break;
    }
  }

  private syncItems(sim: Simulation): void {
    const seen = new Set<number>();
    for (const item of sim.items) {
      seen.add(item.id);
      let view = this.itemViews.get(item.id);
      if (!view) {
        const mesh = createItemMesh(item.kind);
        this.itemLayer.add(mesh);
        view = { mesh };
        this.itemViews.set(item.id, view);
      }
      view.mesh.position.set(item.x, item.y + (item.landed ? Math.sin(this.time * 3 + item.id) * 0.05 : 0), 0.25);
      view.mesh.rotation.y = this.time * 1.2 + item.id;
      view.mesh.rotation.z = item.landed ? 0 : Math.sin(this.time * 4 + item.id) * 0.2;
    }
    for (const [id, view] of this.itemViews) {
      if (seen.has(id)) continue;
      this.itemLayer.remove(view.mesh);
      disposeGroup(view.mesh);
      this.itemViews.delete(id);
    }
  }

  private syncProjectiles(sim: Simulation): void {
    const seen = new Set<number>();
    for (const projectile of sim.projectiles) {
      seen.add(projectile.id);
      let view = this.projectileViews.get(projectile.id);
      if (!view) {
        const mesh = createProjectileMesh(projectile.visual);
        this.projectileLayer.add(mesh);
        view = { mesh };
        this.projectileViews.set(projectile.id, view);
      }
      view.mesh.position.set(projectile.x, projectile.y, 0.4);
      view.mesh.rotation.y = this.time * 5;
      view.mesh.rotation.z = this.time * 3;
      const t = 1 - projectile.life / Math.max(1, projectile.maxLife);
      const scale = 0.85 + Math.sin(t * Math.PI) * 0.35;
      view.mesh.scale.setScalar(scale);
    }
    for (const [id, view] of this.projectileViews) {
      if (seen.has(id)) continue;
      this.projectileLayer.remove(view.mesh);
      disposeGroup(view.mesh);
      this.projectileViews.delete(id);
    }
  }

  private clearMatchEntities(): void {
    for (const view of this.fighterViews.values()) {
      this.fighterLayer.remove(view.rig.root);
      view.dispose();
    }
    this.fighterViews.clear();
    this.clearEntities(this.itemViews, this.itemLayer);
    this.clearEntities(this.projectileViews, this.projectileLayer);
  }

  private clearEntities(map: Map<number, EntityView>, layer: THREE.Group): void {
    for (const view of map.values()) {
      layer.remove(view.mesh);
      disposeGroup(view.mesh);
    }
    map.clear();
  }

  private clearCast(): void {
    for (const view of this.castViews) {
      this.castLayer.remove(view.rig.root);
      view.dispose();
    }
    this.castViews = [];
  }

  private clearPreview(): void {
    if (this.previewView) {
      this.castLayer.remove(this.previewView.rig.root);
      this.previewView.dispose();
      this.previewView = null;
      this.previewKey = '';
    }
  }

  getStats(): RenderStats {
    const info = this.renderer.info;
    let meshes = 0;
    this.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) meshes++;
    });
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      meshes,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      renderer: 'WebGL2',
      webgpuSupported: this.webgpuSupported,
      pixelRatio: this.renderer.getPixelRatio(),
      cameraDistance: this.cameraRig.camera.position.z,
    };
  }

  getCameraRig(): CameraRig {
    return this.cameraRig;
  }

  resize = (): void => {
    if (this.disposed) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.cameraRig.setAspect(width / Math.max(1, height));
  };

  dispose(): void {
    this.disposed = true;
    window.removeEventListener('resize', this.resize);
    this.clearCast();
    this.clearPreview();
    this.clearMatchEntities();
    this.stageView?.dispose();
    this.effects.dispose();
    this.debugView.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
