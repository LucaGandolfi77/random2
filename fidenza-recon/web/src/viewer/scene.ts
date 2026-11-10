import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import type { Building, CityData } from '../types';
import { flatFootprintGeometry } from '../city/roof';
import { canvasLabel, formatNumber } from '../utils';
import { CollisionWorld } from '../player/collision';
import {
  PlayerController,
  type PlayerFrameInput,
} from '../player/controller';
import { PhotoCamera } from './photo';
import type { CityLodManager } from './lod-manager';

export type ViewerMode = 'walk' | 'fly' | 'photo' | 'orbit';

class StatsCapturePass extends Pass {
  constructor(private readonly stats: { calls: number; triangles: number }) {
    super();
    this.needsSwap = false;
  }

  render(renderer: THREE.WebGLRenderer): void {
    this.stats.calls = renderer.info.render.calls;
    this.stats.triangles = renderer.info.render.triangles;
  }
}

export interface ViewerStatsElements {
  fps: HTMLElement;
  calls: HTMLElement;
  triangles: HTMLElement;
  buildings: HTMLElement;
  windows: HTMLElement;
  height: HTMLElement;
}

export class Viewer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly buildingRoot = new THREE.Group();
  readonly cityRoot = new THREE.Group();
  private readonly container: HTMLElement;
  private readonly sun: THREE.DirectionalLight;
  private readonly composer: EffectComposer;
  private readonly ssaoPass: SSAOPass;
  private readonly sunTarget = new THREE.Object3D();
  private readonly sky: THREE.Mesh;
  private readonly districtLabels: THREE.Sprite[] = [];
  private readonly shadowAnchor = new THREE.Vector2(Number.NaN, Number.NaN);
  private readonly labelGroup = new THREE.Group();
  private readonly footprintGroup = new THREE.Group();
  private readonly confidenceGroup = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly pointerDown = new THREE.Vector2();
  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private lookPointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pinchDistance = 0;
  private mode: ViewerMode = 'orbit';
  private collisionWorld: CollisionWorld | null = null;
  private player: PlayerController | null = null;
  private readonly photo = new PhotoCamera();
  private modeHandler: ((mode: ViewerMode) => void) | null = null;
  private readonly keyboardMove = new THREE.Vector2();
  private readonly joystickMove = new THREE.Vector2();
  private joystickMagnitude = 0;
  private runHeld = false;
  private jumpHeld = false;
  private descendHeld = false;
  private jumpQueued = false;
  private readonly lookDelta = new THREE.Vector2();
  private zoomDelta = 0;
  private readonly frameInput: PlayerFrameInput = {
    move: new THREE.Vector2(),
    look: new THREE.Vector2(),
    zoom: 0,
    jump: false,
    jumpHeld: false,
    descend: false,
    run: false,
  };
  private photoReturnMode: ViewerMode = 'walk';
  private photoSubjectVisible = true;
  private footprintsVisible = false;
  private confidenceVisible = false;
  private labelsVisible = true;
  private selectionHandler: ((building: Building | null) => void) | null = null;
  private city: CityData | null = null;
  private lodManager: CityLodManager | null = null;
  private lastTime = performance.now();
  private frames = 0;
  private fpsWindow = 0;
  private statsElements: ViewerStatsElements | null = null;
  private postprocessing = true;
  private readonly sceneStats = { calls: 0, triangles: 0 };

  constructor(container: HTMLElement) {
    this.container = container;
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 26000);
    this.camera.position.set(42, 18, 58);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.className = 'city-canvas';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 9000;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, 9, 0);
    this.controls.screenSpacePanning = false;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
    this.scene.environmentIntensity = 0.22;
    environment.dispose();
    pmrem.dispose();

    this.scene.fog = new THREE.Fog(0xd3dcdf, 1600, 14000);
    this.scene.background = new THREE.Color(0xd3dcdf);

    const skyGeometry = new THREE.SphereGeometry(16000, 32, 18);
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#7fa6c0') },
        bottom: { value: new THREE.Color('#e4e9e8') },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 top;
        uniform vec3 bottom;
        varying vec3 vWorld;
        void main() {
          float h = clamp(normalize(vWorld).y * 1.6, 0.0, 1.0);
          vec3 colour = mix(bottom, top, pow(h, 0.75));
          gl_FragColor = vec4(colour, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    const hemisphere = new THREE.HemisphereLight(0xdbe6ea, 0x8a7b66, 0.95);
    this.scene.add(hemisphere);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 1.55);
    this.sun.position.set(120, 170, 80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -190;
    this.sun.shadow.camera.right = 190;
    this.sun.shadow.camera.top = 190;
    this.sun.shadow.camera.bottom = -190;
    this.sun.shadow.camera.near = 20;
    this.sun.shadow.camera.far = 480;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.sunTarget.position.set(0, 0, 0);
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new StatsCapturePass(this.sceneStats));
    this.ssaoPass = new SSAOPass(this.scene, this.camera, 1, 1);
    this.ssaoPass.kernelRadius = 8;
    this.ssaoPass.minDistance = 0.001;
    this.ssaoPass.maxDistance = 0.12;
    this.ssaoPass.output = SSAOPass.OUTPUT.Default;
    this.composer.addPass(this.ssaoPass);
    this.composer.addPass(new SMAAPass());
    this.composer.addPass(new OutputPass());

    this.scene.add(this.cityRoot);
    this.scene.add(this.labelGroup);
    this.scene.add(this.footprintGroup);
    this.scene.add(this.confidenceGroup);
    this.cityRoot.add(this.buildingRoot);
    this.footprintGroup.visible = false;
    this.confidenceGroup.visible = false;

    window.addEventListener('resize', () => this.resize());
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    canvas.addEventListener('pointerup', (event) => this.onPointerUp(event));
    canvas.addEventListener('pointercancel', (event) => this.onPointerUp(event));
    canvas.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    this.resize();
    this.animate();
  }

  private onPointerDown(event: PointerEvent): void {
    this.pointerDown.set(event.clientX, event.clientY);
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size === 2) {
      this.pinchDistance = this.currentPinchDistance();
      this.lookPointerId = null;
      return;
    }
    if (this.mode !== 'orbit' && this.activePointers.size === 1) {
      this.lookPointerId = event.pointerId;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.renderer.domElement.setPointerCapture(event.pointerId);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (this.activePointers.size >= 2) {
      const distance = this.currentPinchDistance();
      if (this.pinchDistance > 0 && distance > 0) {
        this.addZoom((this.pinchDistance - distance) * 1.5);
      }
      this.pinchDistance = distance;
      return;
    }
    if (this.lookPointerId === event.pointerId && this.mode !== 'orbit') {
      const dx = event.clientX - this.lastPointerX;
      const dy = event.clientY - this.lastPointerY;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.addLookDelta(dx, dy);
      return;
    }
    if (this.mode !== 'orbit') return;
    this.pointer.set(
      (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
      -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.buildingRoot.children, true)[0];
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  }

  private onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchDistance = 0;
    if (this.lookPointerId === event.pointerId) {
      this.lookPointerId = null;
      if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
        this.renderer.domElement.releasePointerCapture(event.pointerId);
      }
    }
    if (this.mode !== 'orbit') return;
    const moved = this.pointerDown.distanceTo(
      new THREE.Vector2(event.clientX, event.clientY),
    );
    if (moved <= 5) this.pick(event);
  }

  private currentPinchDistance(): number {
    const values = [...this.activePointers.values()];
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  private onWheel(event: WheelEvent): void {
    if (this.mode === 'orbit') return;
    event.preventDefault();
    this.addZoom(event.deltaY);
  }

  private setCanvasCursor(): void {
    this.renderer.domElement.style.cursor =
      this.mode === 'photo' ? 'crosshair' : 'grab';
  }

  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
  }

  setPostprocessing(enabled: boolean): void {
    this.postprocessing = enabled;
    this.ssaoPass.enabled = enabled;
  }

  requestShadowUpdate(): void {
    this.renderer.shadowMap.needsUpdate = true;
  }

  private renderFrame(): void {
    if (this.postprocessing) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
      this.sceneStats.calls = this.renderer.info.render.calls;
      this.sceneStats.triangles = this.renderer.info.render.triangles;
    }
  }

  setStatsElements(elements: ViewerStatsElements): void {
    this.statsElements = elements;
  }

  load(city: CityData, terrainSample: (x: number, z: number) => number): void {
    this.city = city;
    this.controls.target.set(0, Math.min(12, city.stats.height_confidence_median > 0 ? 10 : 8), 0);
    this.camera.position.set(46, 19, 62);
    this.controls.update();

    this.collisionWorld = new CollisionWorld(city, terrainSample);
    const spawn = PlayerController.spawnFor(city, this.collisionWorld);
    this.player = new PlayerController(this.collisionWorld, spawn);
    this.scene.add(this.player.character.root);
    this.scene.add(this.player.character.shadow);
    this.mode = 'orbit';
    this.setMode('walk');

    for (const building of city.buildings) {
      if (!building.landmark) continue;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: canvasLabel(
            building.name ?? building.style_label ?? building.osm_id,
            'rgba(18,24,28,0.86)',
            '#f4efe4',
          ),
          depthTest: true,
          transparent: true,
        }),
      );
      sprite.position.set(
        building.centroid_local[0],
        building.base_y + building.height_m + 4.5,
        building.centroid_local[1],
      );
      const scale = Math.min(10, 5 + (building.name?.length ?? 0) * 0.22);
      sprite.scale.set(scale, scale / 5, 1);
      sprite.userData.building = building;
      this.labelGroup.add(sprite);
    }
    this.districtLabels.length = 0;
    for (const district of city.districts ?? []) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: canvasLabel(district.name, 'rgba(52,44,32,0.82)', district.color),
          depthTest: false,
          transparent: true,
        }),
      );
      const [x, z] = district.local;
      sprite.position.set(x, terrainSample(x, z) + 85, z);
      sprite.scale.set(70, 14, 1);
      sprite.renderOrder = 5;
      sprite.userData.district = district.id;
      this.districtLabels.push(sprite);
      this.labelGroup.add(sprite);
    }
    this.labelGroup.visible =
      city.stats.landmarks > 0 || this.districtLabels.length > 0;
    this.labelsVisible = this.labelGroup.visible;

    const footprintMaterial = new THREE.MeshBasicMaterial({
      color: 0x5ef2a0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const confidenceMaterials = {
      high: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#4fd18b'),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      medium: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#e7c45a'),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      low: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#d75c4b'),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
    const footprintGeometries: THREE.BufferGeometry[] = [];
    const confidenceGeometries: Record<'high' | 'medium' | 'low', THREE.BufferGeometry[]> = {
      high: [],
      medium: [],
      low: [],
    };
    for (const building of city.buildings) {
      footprintGeometries.push(flatFootprintGeometry(building, 0.16));
      const confidence = building.height_confidence ?? 0;
      const key = confidence > 0.65 ? 'high' : confidence > 0.45 ? 'medium' : 'low';
      confidenceGeometries[key].push(flatFootprintGeometry(building, 0.18));
    }
    const addMerged = (
      geometries: THREE.BufferGeometry[],
      material: THREE.Material,
      target: THREE.Group,
      renderOrder: number,
    ): void => {
      if (!geometries.length) return;
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        for (const geometry of geometries) geometry.dispose();
        const mesh = new THREE.Mesh(merged, material);
        mesh.renderOrder = renderOrder;
        target.add(mesh);
      } else {
        for (const geometry of geometries) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.renderOrder = renderOrder;
          target.add(mesh);
        }
      }
    };
    addMerged(footprintGeometries, footprintMaterial, this.footprintGroup, 2);
    addMerged(confidenceGeometries.high, confidenceMaterials.high, this.confidenceGroup, 3);
    addMerged(confidenceGeometries.medium, confidenceMaterials.medium, this.confidenceGroup, 3);
    addMerged(confidenceGeometries.low, confidenceMaterials.low, this.confidenceGroup, 3);
    this.footprintGroup.visible = false;
    this.confidenceGroup.visible = false;
  }

  setLodManager(manager: CityLodManager): void {
    this.lodManager = manager;
  }

  setSelectionHandler(handler: (building: Building | null) => void): void {
    this.selectionHandler = handler;
  }

  onModeChange(handler: (mode: ViewerMode) => void): void {
    this.modeHandler = handler;
  }

  getMode(): ViewerMode {
    return this.mode;
  }

  getPlayerPose(): { x: number; z: number; heading: number } {
    if (this.player) {
      return {
        x: this.player.position.x,
        z: this.player.position.z,
        heading: this.player.heading,
      };
    }
    return {
      x: this.camera.position.x,
      z: this.camera.position.z,
      heading: 0,
    };
  }

  teleportTo(x: number, z: number): void {
    if (!this.player) return;
    this.setMode('walk');
    this.player.teleportTo(x, z);
    this.player.syncCamera(this.camera);
  }

  setMode(mode: ViewerMode): void {
    if (mode === this.mode) {
      if (this.player && (mode === 'walk' || mode === 'fly')) {
        this.player.syncCamera(this.camera);
      }
      return;
    }
    const previous = this.mode;
    if (previous === 'photo') this.leavePhoto();
    this.mode = mode;
    this.controls.enabled = mode === 'orbit';
    this.setCanvasCursor();

    if (this.player) {
      if (mode === 'walk') {
        this.player.setFlying(false);
        this.player.character.setVisible(true);
        this.player.syncCamera(this.camera);
      } else if (mode === 'fly') {
        this.player.setFlying(true);
        this.player.character.setVisible(true);
        this.player.syncCamera(this.camera);
      }
    }

    if (mode === 'photo') {
      this.photoReturnMode =
        previous === 'orbit' ? 'orbit' : previous === 'fly' ? 'fly' : 'walk';
      this.enterPhoto();
    } else if (mode === 'orbit') {
      this.controls.enabled = true;
      if (previous === 'photo') {
        const direction = this.camera.getWorldDirection(new THREE.Vector3());
        this.controls.target
          .copy(this.camera.position)
          .addScaledVector(direction, 25);
      } else if (this.player) {
        const focus = new THREE.Vector3();
        this.player.getFocusPoint(focus);
        this.controls.target.copy(focus);
      }
      this.controls.update();
    }
    this.resetFrameInput();
    this.modeHandler?.(mode);
  }

  togglePhoto(): void {
    if (this.mode === 'photo') this.exitPhoto();
    else this.setMode('photo');
  }

  exitPhoto(): void {
    if (this.mode === 'photo') this.setMode(this.photoReturnMode);
  }

  toggleFlight(): void {
    if (this.mode === 'photo') return;
    this.setMode(this.mode === 'fly' ? 'walk' : 'fly');
  }

  getPhotoFov(): number {
    return this.photo.getFov();
  }

  setPhotoFov(fov: number): void {
    this.photo.setFov(fov);
    if (this.mode === 'photo') {
      this.camera.fov = this.photo.getFov();
      this.camera.updateProjectionMatrix();
    }
  }

  getPhotoSubjectVisible(): boolean {
    return this.photoSubjectVisible;
  }

  setPhotoSubjectVisible(visible: boolean): void {
    this.photoSubjectVisible = visible;
    if (this.mode === 'photo') {
      this.player?.character.setVisible(visible);
    }
  }

  capturePhoto(): boolean {
    if (this.mode !== 'photo') return false;
    this.renderFrame();
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `fidenza-${stamp}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  }

  resetView(): void {
    if (this.mode === 'orbit') {
      if (this.city) this.setOverview(this.city);
    } else if (this.mode === 'photo') {
      this.photo.setFov(52);
      this.photo.enter(this.camera);
      this.camera.fov = 52;
      this.camera.updateProjectionMatrix();
    } else {
      this.player?.resetCamera();
    }
  }

  setKeyboardMove(x: number, y: number): void {
    this.keyboardMove.set(x, y);
  }

  setJoystickMove(x: number, y: number, magnitude: number): void {
    this.joystickMove.set(x, y);
    this.joystickMagnitude = magnitude;
  }

  setRunHeld(held: boolean): void {
    this.runHeld = held;
  }

  setJumpHeld(held: boolean): void {
    this.jumpHeld = held;
  }

  setDescendHeld(held: boolean): void {
    this.descendHeld = held;
  }

  queueJump(): void {
    this.jumpQueued = true;
  }

  addLookDelta(dx: number, dy: number): void {
    this.lookDelta.x += dx;
    this.lookDelta.y += dy;
  }

  addZoom(delta: number): void {
    this.zoomDelta += delta;
  }

  private enterPhoto(): void {
    this.photo.enter(this.camera);
    this.player?.character.setVisible(this.photoSubjectVisible);
    this.labelGroup.visible = false;
    this.footprintGroup.visible = false;
    this.confidenceGroup.visible = false;
  }

  private leavePhoto(): void {
    this.camera.fov = 52;
    this.camera.updateProjectionMatrix();
    this.labelGroup.visible = this.labelsVisible;
    this.footprintGroup.visible = this.footprintsVisible;
    this.confidenceGroup.visible = this.confidenceVisible;
    this.player?.character.setVisible(true);
  }

  private buildFrameInput(): void {
    const move = this.frameInput.move.set(
      this.keyboardMove.x + this.joystickMove.x,
      this.keyboardMove.y + this.joystickMove.y,
    );
    if (move.lengthSq() > 1) move.normalize();
    this.frameInput.look.copy(this.lookDelta);
    this.frameInput.zoom = this.zoomDelta;
    this.frameInput.jump = this.jumpQueued;
    this.frameInput.jumpHeld = this.jumpHeld;
    this.frameInput.descend = this.descendHeld;
    this.frameInput.run = this.runHeld || this.joystickMagnitude > 0.85;
  }

  private resetFrameInput(): void {
    this.lookDelta.set(0, 0);
    this.zoomDelta = 0;
    this.jumpQueued = false;
  }

  private pick(event: PointerEvent): void {
    if (this.mode !== 'orbit') return;
    this.pointer.set(
      (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
      -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.buildingRoot.children, true);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.building) {
          this.selectionHandler?.(object.userData.building as Building);
          return;
        }
        object = object.parent;
      }
    }
    this.selectionHandler?.(null);
  }

  setFootprints(visible: boolean): void {
    this.footprintsVisible = visible;
    if (this.mode !== 'photo') this.footprintGroup.visible = visible;
  }

  setConfidence(visible: boolean): void {
    this.confidenceVisible = visible;
    if (this.mode !== 'photo') this.confidenceGroup.visible = visible;
  }

  setLabels(visible: boolean): void {
    this.labelsVisible = visible;
    if (this.mode !== 'photo') this.labelGroup.visible = visible;
  }

  setDetailVisibility(visible: boolean): void {
    this.lodManager?.setDetailsVisible(visible);
  }

  private pointInRing(x: number, z: number, ring: [number, number][]): boolean {
    let inside = false;
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
      const [xi, zi] = ring[index];
      const [xj, zj] = ring[previous];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  private isBlocked(x: number, y: number, z: number, skipId: string): boolean {
    if (!this.city) return false;
    for (const building of this.city.buildings) {
      if (building.osm_id === skipId) continue;
      if (
        y >= building.base_y - 0.5 &&
        y <= building.base_y + building.height_m + 0.5 &&
        this.pointInRing(x, z, building.footprint)
      ) {
        return true;
      }
    }
    return false;
  }

  private lineOfSightClear(from: THREE.Vector3, to: THREE.Vector3, skipId: string): boolean {
    for (let step = 1; step <= 12; step += 1) {
      const t = step / 13;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const z = from.z + (to.z - from.z) * t;
      if (this.isBlocked(x, y, z, skipId)) return false;
    }
    return true;
  }

  private gateCamera(building: Building, target: THREE.Vector3): THREE.Vector3 | null {
    if (!this.city) return null;
    const point = new THREE.Vector2(building.centroid_local[0], building.centroid_local[1]);
    const candidates: { position: THREE.Vector3; error: number }[] = [];
    for (const road of this.city.roads) {
      for (let index = 0; index < road.points.length - 1; index += 1) {
        const a = road.points[index];
        const b = road.points[index + 1];
        const ab = new THREE.Vector2(b[0] - a[0], b[2] - a[2]);
        const ap = new THREE.Vector2(point.x - a[0], point.y - a[2]);
        const length = ab.length();
        if (length < 4) continue;
        const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq()));
        const closest = new THREE.Vector2(a[0] + ab.x * t, a[2] + ab.y * t);
        const distanceToRoad = closest.distanceTo(point);
        if (distanceToRoad > 22) continue;
        const direction = ab.clone().normalize();
        for (const sign of [-1, 1]) {
          const metres = 20;
          const t2 = Math.max(0, Math.min(1, t + (sign * metres) / length));
          const travelled = Math.abs(t2 - t) * length;
          const x = a[0] + ab.x * t2;
          const z = a[2] + ab.y * t2;
          const y = a[1] + (b[1] - a[1]) * t2 + 2.2;
          const position = new THREE.Vector3(x, y, z);
          const error =
            Math.abs(travelled - 20)
            + distanceToRoad * 0.5
            + Math.hypot(x - building.centroid_local[0], z - building.centroid_local[1]) * 0.02;
          candidates.push({ position, error });
        }
        void direction;
      }
    }
    candidates.sort((a, b) => a.error - b.error);
    for (const candidate of candidates) {
      const { position } = candidate;
      if (
        !this.isBlocked(position.x, position.y, position.z, building.osm_id) &&
        this.lineOfSightClear(position, target, building.osm_id)
      ) {
        return position;
      }
    }
    return null;
  }

  focusBuilding(building: Building): void {
    this.setMode('orbit');
    const side =
      building.sides.find((candidate) => candidate.main_facade) ??
      building.sides.find((candidate) => candidate.street_facing) ??
      building.sides[0];
    const normal = side
      ? new THREE.Vector3(side.normal[0], 0, side.normal[1]).normalize()
      : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3(-normal.z, 0, normal.x);
    const landmark = building.landmark || building.tier === 'A';
    const target = new THREE.Vector3(
      building.centroid_local[0],
      building.base_y + building.height_m * (landmark ? 0.44 : 0.45),
      building.centroid_local[1],
    );
    const lift = landmark
      ? Math.max(18, building.height_m * 0.85)
      : Math.min(14, building.height_m * 0.55);
    const distances = landmark ? [64, 56, 48, 40, 72, 32] : [Math.max(18, building.height_m * 2.1)];
    const offsets = [0, 0.22, -0.22];
    let chosen: THREE.Vector3 | null = null;
    for (const distance of distances) {
      for (const offset of offsets) {
        const candidate = target
          .clone()
          .addScaledVector(normal, distance)
          .addScaledVector(tangent, distance * offset);
        candidate.y = target.y + lift;
        if (
          !this.isBlocked(candidate.x, candidate.y, candidate.z, building.osm_id) &&
          this.lineOfSightClear(candidate, target, building.osm_id)
        ) {
          chosen = candidate;
          break;
        }
      }
      if (chosen) break;
    }
    if (building.archetype === 'city_gate') {
      const gate = this.gateCamera(building, target);
      if (gate) {
        chosen = gate;
      } else {
        let aerial: THREE.Vector3 | null = null;
        for (const vertical of [18, 26, 36]) {
          const candidate = target
            .clone()
            .addScaledVector(normal, 18)
            .addScaledVector(tangent, 12);
          candidate.y = target.y + vertical;
          aerial = candidate;
          if (
            !this.isBlocked(candidate.x, candidate.y, candidate.z, building.osm_id) &&
            this.lineOfSightClear(candidate, target, building.osm_id)
          ) {
            break;
          }
        }
        chosen = aerial;
      }
    }
    if (!chosen) {
      chosen = target.clone().addScaledVector(normal, distances[0]);
      chosen.y = target.y + lift;
    }
    this.camera.position.copy(chosen);
    this.controls.target.copy(target);
    this.controls.update();
  }

  setOverview(city: CityData): void {
    this.setMode('orbit');
    const [minX, minZ, maxX, maxZ] = city.meta.bbox_local;
    const centreX = (minX + maxX) / 2;
    const centreZ = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxZ - minZ);
    const distance = Math.max(180, size * 0.62);
    this.camera.position.set(
      centreX + distance * 0.65,
      distance * 0.82,
      centreZ + distance * 0.65,
    );
    this.controls.target.set(centreX, 8, centreZ);
    this.controls.update();
  }

  setStreetView(): void {
    if (!this.city) return;
    this.setMode('orbit');
    const [minX, minZ, maxX, maxZ] = this.city.meta.pilot_bbox_local;
    const inside = (x: number, z: number): boolean =>
      x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    const candidates: {
      midpoint: THREE.Vector3;
      direction: THREE.Vector3;
      score: number;
    }[] = [];
    for (const road of this.city.roads) {
      if (!road.name || road.points.length < 2 || road.width_m < 5) continue;
      for (let index = 0; index < road.points.length - 1; index += 1) {
        const point = road.points[index];
        const next = road.points[index + 1];
        if (!inside(point[0], point[2]) || !inside(next[0], next[2])) continue;
        const direction = new THREE.Vector3(
          next[0] - point[0],
          0,
          next[2] - point[2],
        );
        const length = direction.length();
        if (length < 4) continue;
        direction.normalize();
        const midpoint = new THREE.Vector3(
          (point[0] + next[0]) / 2,
          (point[1] + next[1]) / 2,
          (point[2] + next[2]) / 2,
        );
        const score =
          Math.hypot(midpoint.x, midpoint.z) +
          (8 - Math.min(8, road.width_m)) * 3 -
          length * 0.15;
        candidates.push({ midpoint, direction, score });
      }
    }
    candidates.sort((a, b) => a.score - b.score);
    for (const candidate of candidates) {
      const eye = candidate.midpoint.clone();
      eye.y += 1.7;
      if (this.isBlocked(eye.x, eye.y, eye.z, '')) continue;
      this.camera.position.copy(eye);
      this.controls.target.set(
        eye.x + candidate.direction.x * 30,
        eye.y + 0.6,
        eye.z + candidate.direction.z * 30,
      );
      this.controls.update();
      return;
    }
  }

  async exportGLB(): Promise<Blob> {
    const exporter = new GLTFExporter();
    this.lodManager?.beginExport();
    try {
      const payload = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          this.cityRoot,
          (result) => {
            if (result instanceof ArrayBuffer) resolve(result);
            else reject(new Error('Unexpected GLB output'));
          },
          (error) => reject(error),
          { binary: true, onlyVisible: true, maxTextureSize: 2048 },
        );
      });
      return new Blob([payload], { type: 'model/gltf-binary' });
    } finally {
      this.lodManager?.endExport();
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    const step = Math.min(0.05, delta / 1000);
    this.frames += 1;
    this.fpsWindow += delta;

    if (this.collisionWorld && this.player) {
      if (this.mode === 'walk' || this.mode === 'fly') {
        this.buildFrameInput();
        this.player.update(step, this.camera, this.frameInput);
      } else if (this.mode === 'photo') {
        this.buildFrameInput();
        this.photo.update(step, this.camera, this.collisionWorld, this.frameInput);
      }
    }
    this.resetFrameInput();

    const anchorX =
      this.mode === 'orbit' ? this.controls.target.x : this.camera.position.x;
    const anchorZ =
      this.mode === 'orbit' ? this.controls.target.z : this.camera.position.z;
    if (
      !Number.isFinite(this.shadowAnchor.x) ||
      Math.hypot(anchorX - this.shadowAnchor.x, anchorZ - this.shadowAnchor.y) > 8
    ) {
      this.shadowAnchor.set(anchorX, anchorZ);
      this.sunTarget.position.set(anchorX, 0, anchorZ);
      this.sun.position.set(anchorX + 120, 170, anchorZ + 80);
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.sky.position.set(this.camera.position.x, 0, this.camera.position.z);
    for (const sprite of this.districtLabels) {
      const distance = sprite.position.distanceTo(this.camera.position);
      const scale = Math.max(18, Math.min(120, distance * 0.035));
      sprite.scale.set(scale, scale / 5, 1);
    }

    if (this.lodManager) this.lodManager.update(this.camera);
    if (this.mode === 'orbit') this.controls.update();
    this.renderFrame();
    if (this.fpsWindow > 500 && this.statsElements) {
      const fps = (this.frames * 1000) / this.fpsWindow;
      this.statsElements.fps.textContent = formatNumber(fps, 0);
      this.statsElements.calls.textContent = String(this.sceneStats.calls);
      this.statsElements.triangles.textContent = formatNumber(this.sceneStats.triangles / 1000, 0) + 'k';
      this.frames = 0;
      this.fpsWindow = 0;
    }
  };
}
