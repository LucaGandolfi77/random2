import * as THREE from "three";
import type { Chapter, CharacterId, Hotspot } from "../data/types";
import { createCharacter, type CharacterRig } from "./characters";
import {
  KoiPond,
  LanternRiver,
  Maglev,
  Rain,
  createBridge,
  createBush,
  createCalligraphyTable,
  createClinic,
  createDeliveryBike,
  createDistantLights,
  createEmbankment,
  createHouse,
  createLabPavilion,
  createLantern,
  createLanternPost,
  createLoom,
  createSkyDome,
  createSkyline,
  createStonePath,
  createTeaHouse,
  createWater,
  createWillow,
  type WaterLike
} from "./props";

export interface WorldCallbacks {
  onNearby?: (hotspot: Hotspot | null) => void;
  onReady?: () => void;
}

interface ObstacleCircle {
  kind: "circle";
  x: number;
  z: number;
  r: number;
}
interface ObstacleRect {
  kind: "rect";
  x: number;
  z: number;
  w: number;
  d: number;
}

type Obstacle = ObstacleCircle | ObstacleRect;

const PLAYER_SPEED = 3.8;
const CAMERA_DISTANCE = 6.8;
const CAMERA_HEIGHT = 3.8;

function disposeGroup(group: THREE.Object3D): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material.dispose();
    }
  });
  group.clear();
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly callbacks: WorldCallbacks;
  private worldGroup = new THREE.Group();
  private lightGroup = new THREE.Group();
  private markerGroup = new THREE.Group();
  private readonly player: CharacterRig;
  private actors = new Map<CharacterId, CharacterRig>();
  private markers = new Map<string, THREE.Group>();
  private hotspots: Hotspot[] = [];
  private nearby: Hotspot | null = null;
  private chapter: Chapter | null = null;
  private water: WaterLike | null = null;
  private rain: Rain | null = null;
  private lanternRiver: LanternRiver | null = null;
  private koi: KoiPond | null = null;
  private maglev: Maglev | null = null;
  private obstacles: Obstacle[] = [];
  private keys = new Set<string>();
  private joystick = { x: 0, z: 0 };
  private yaw = 0;
  private cameraFocus: { position: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private cameraPosition = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
  private cameraLook = new THREE.Vector3(0, 1.2, 0);
  private inputEnabled = true;
  private dragging = false;
  private lastDragX = 0;
  private time = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, callbacks: WorldCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.player = createCharacter("mei");
    this.player.setPosition(0, 1);
    this.scene.add(this.player.group);
    this.scene.add(this.worldGroup, this.lightGroup, this.markerGroup);
    this.bindInput();
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  private bindInput(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.inputEnabled) return;
    this.keys.add(event.key.toLowerCase());
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.inputEnabled || event.pointerType === "touch") return;
    this.dragging = true;
    this.lastDragX = event.clientX;
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastDragX;
    this.lastDragX = event.clientX;
    this.yaw -= dx * 0.006;
  };

  private onPointerUp = (): void => {
    this.dragging = false;
  };

  private resize = (): void => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  };

  loadChapter(chapter: Chapter, hotspots: Hotspot[]): void {
    this.chapter = chapter;
    this.hotspots = hotspots;
    this.nearby = null;
    this.cameraFocus = null;
    this.inputEnabled = true;
    this.cameraPosition.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    this.cameraLook.set(0, 1.2, 0);

    disposeGroup(this.worldGroup);
    disposeGroup(this.lightGroup);
    disposeGroup(this.markerGroup);
    this.actors.clear();
    this.markers.clear();
    this.scene.remove(this.worldGroup, this.lightGroup, this.markerGroup);
    this.worldGroup = new THREE.Group();
    this.lightGroup = new THREE.Group();
    this.markerGroup = new THREE.Group();
    this.scene.add(this.worldGroup, this.lightGroup, this.markerGroup);

    this.water?.dispose();
    this.rain?.dispose();
    this.water = null;
    this.rain = null;
    this.lanternRiver = null;
    this.koi = null;
    this.maglev = null;
    this.obstacles = [];

    this.scene.background = new THREE.Color(chapter.palette.sky);
    this.scene.fog = new THREE.Fog(chapter.palette.fog, 22, 78);
    this.worldGroup.add(createSkyDome(chapter.palette.sky, chapter.palette.fog));
    this.buildLighting(chapter);
    this.buildBase(chapter);
    this.buildChapterProps(chapter);
    this.buildActors(chapter);
    this.setHotspots(hotspots);

    const spawn = chapter.spawn;
    this.player.setPosition(spawn[0], spawn[1]);
    this.player.setRotation(Math.PI);
    this.updateCamera(0.2, true);
    this.callbacks.onReady?.();
  }

  setHotspots(hotspots: Hotspot[]): void {
    this.hotspots = hotspots;
    disposeGroup(this.markerGroup);
    this.markers.clear();
    hotspots.forEach((hotspot) => this.markers.set(hotspot.id, this.createMarker(hotspot)));
  }

  private buildLighting(chapter: Chapter): void {
    const hemi = new THREE.HemisphereLight(chapter.palette.sky, chapter.palette.ground, 0.88);
    this.lightGroup.add(hemi);
    const ambient = new THREE.AmbientLight(chapter.palette.ambient, 0.28);
    this.lightGroup.add(ambient);
    const sun = new THREE.DirectionalLight(chapter.palette.sun, chapter.weather === "rain" ? 0.9 : 1.65);
    sun.position.set(12, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    sun.shadow.camera.far = 70;
    this.lightGroup.add(sun);
    const fill = new THREE.DirectionalLight(0x8fd9d2, 0.32);
    fill.position.set(-10, 8, -14);
    this.lightGroup.add(fill);
    if (chapter.weather === "night" || chapter.weather === "rain") {
      const warm = new THREE.PointLight(0xf2b45e, 18, 24, 2);
      warm.position.set(0, 3, -3);
      this.lightGroup.add(warm);
    }
  }

  private buildBase(chapter: Chapter): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 50, 1, 1),
      new THREE.MeshStandardMaterial({ color: chapter.palette.ground, roughness: 0.95, flatShading: true })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.worldGroup.add(ground);

    this.water = createWater(chapter.palette.water, 7.2, 58, -9);
    this.worldGroup.add(this.water.mesh);
    this.worldGroup.add(createEmbankment(0x8f8a7b));
    this.worldGroup.add(createBridge(0x8f8a7b, chapter.palette.accent));
    this.worldGroup.add(createStonePath());

    const skyline = createSkyline();
    this.worldGroup.add(skyline);
    this.worldGroup.add(createDistantLights());
    for (const [x, z] of [[-7.4, 1.5], [7.4, 1.5]] as const) {
      const post = createLanternPost(chapter.palette.accent);
      post.position.set(x, 0, z);
      this.worldGroup.add(post);
    }
    for (const [x, z] of [[-7.0, 7.0], [7.0, 7.0], [-7.2, -2.0], [7.2, -2.0]] as const) {
      const bush = createBush(chapter.palette.accent);
      bush.position.set(x, 0, z);
      this.worldGroup.add(bush);
    }
    this.maglev = new Maglev();
    this.worldGroup.add(this.maglev.group);

    for (let index = 0; index < 6; index += 1) {
      const x = -21 + index * 8.4;
      const house = createHouse(4.6 + (index % 2) * 0.8, 4.2, 3.1 + (index % 3) * 0.35, 0xe8ddc8, 0x394240, chapter.palette.accent);
      house.position.set(x, 0, -15.5 - (index % 2) * 0.8);
      house.rotation.y = Math.PI + (index - 2.5) * 0.03;
      this.worldGroup.add(house);
    }

    for (const [x, z, scale] of [
      [-12, -3.2, 1.1],
      [-6.5, 8.2, 0.9],
      [8.5, -3.4, 1.0],
      [13.5, 6.2, 0.86],
      [-15.5, 5.4, 0.78]
    ] as const) {
      const willow = createWillow(scale, 0x6f8f62);
      willow.position.set(x, 0, z);
      this.worldGroup.add(willow);
    }

    for (const [x, y, z] of [
      [-18, 3.4, -12.4],
      [-10, 3.2, -12.4],
      [10, 3.2, -12.4],
      [18, 3.4, -12.4],
      [-7, 4.6, 9.5],
      [7, 4.6, 9.5]
    ] as const) {
      const lantern = createLantern(chapter.palette.accent, 0.65);
      lantern.position.set(x, y, z);
      this.worldGroup.add(lantern);
    }

    this.obstacles.push({ kind: "rect", x: 0, z: -9, w: 60, d: 7.4 });
  }

  private buildChapterProps(chapter: Chapter): void {
    switch (chapter.id) {
      case "alba": {
        this.addCourtyard(chapter);
        break;
      }
      case "piazza": {
        this.addPlaza(chapter);
        break;
      }
      case "giardino": {
        this.addGarden(chapter);
        break;
      }
      case "pioggia": {
        this.addPlaza(chapter);
        this.rain = new Rain(chapter.weather === "rain" ? 1600 : 0);
        this.worldGroup.add(this.rain.points);
        break;
      }
      case "lanterne": {
        this.addLanternRiver(chapter);
        break;
      }
    }
  }

  private addCourtyard(chapter: Chapter): void {
    const wall = new THREE.MeshStandardMaterial({ color: 0xd9ceb5, roughness: 0.95, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3e4440, roughness: 0.9, flatShading: true });
    for (const x of [-8.3, 8.3]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 13), wall);
      side.position.set(x, 1.25, 2.5);
      side.castShadow = true;
      side.receiveShadow = true;
      this.worldGroup.add(side);
    }
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(17, 0.7, 0.35), wall);
    parapet.position.set(0, 0.35, -3.7);
    parapet.castShadow = true;
    this.worldGroup.add(parapet);
    const loom = createLoom();
    loom.position.set(-3.2, 0, 3.2);
    this.worldGroup.add(loom);
    this.obstacles.push({ kind: "rect", x: -3.2, z: 3.2, w: 2.2, d: 1.2 });
    const table = createTeaHouse(chapter.palette.accent);
    table.scale.setScalar(0.43);
    table.position.set(2.9, 0, 2.2);
    table.rotation.y = 0.4;
    this.worldGroup.add(table);
    const photo = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5), dark);
    stand.position.set(-4.2, 0.6, 1.0);
    photo.add(stand);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.08), new THREE.MeshStandardMaterial({ color: 0x4a382b }));
    frame.position.set(-4.2, 1.45, 1.0);
    frame.rotation.x = -0.12;
    photo.add(frame);
    const image = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0xd8c7a6, roughness: 0.9 }));
    image.position.set(-4.2, 1.45, 1.05);
    image.rotation.x = -0.12;
    photo.add(image);
    this.worldGroup.add(photo);
  }

  private addPlaza(chapter: Chapter): void {
    const teaHouse = createTeaHouse(chapter.palette.accent);
    teaHouse.position.set(7.6, 0, 6.6);
    teaHouse.rotation.y = -0.3;
    this.worldGroup.add(teaHouse);
    const table = createCalligraphyTable();
    table.position.set(-5, 0, 4);
    table.rotation.y = 0.2;
    this.worldGroup.add(table);
    this.obstacles.push({ kind: "rect", x: -5, z: 4, w: 2.4, d: 1.1 });
    const clinic = createClinic();
    clinic.position.set(-1, 0, 8);
    this.worldGroup.add(clinic);
    const bike = createDeliveryBike();
    bike.position.set(5, 0, 3.2);
    bike.rotation.y = -0.5;
    this.worldGroup.add(bike);
    this.obstacles.push({ kind: "circle", x: 5, z: 3.2, r: 1 });
  }

  private addGarden(chapter: Chapter): void {
    this.koi = new KoiPond();
    this.koi.group.position.set(0, 0, 0);
    this.worldGroup.add(this.koi.group);
    this.obstacles.push({ kind: "circle", x: 0, z: 0, r: 3.2 });
    const lab = createLabPavilion();
    lab.position.set(0, 0, 7);
    this.worldGroup.add(lab);
    const loom = createLoom();
    loom.position.set(4.3, 0, 7.5);
    this.worldGroup.add(loom);
    this.obstacles.push({ kind: "rect", x: 4.3, z: 7.5, w: 2.4, d: 1.2 });
    const terminal = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x3b4b4e, roughness: 0.6, metalness: 0.3 }));
    pedestal.position.set(-1, 0.45, 8.2);
    terminal.add(pedestal);
    const holo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 24), new THREE.MeshStandardMaterial({ color: 0x77d6c9, emissive: 0x77d6c9, emissiveIntensity: 2, transparent: true, opacity: 0.8 }));
    holo.position.set(-1, 1.65, 8.2);
    holo.rotation.x = Math.PI / 2;
    terminal.add(holo);
    this.worldGroup.add(terminal);
    for (const [x, z] of [[-7, 3], [7, 3], [-7, 9], [7, 9]] as const) {
      const lantern = createLantern(chapter.palette.accent, 0.8);
      lantern.position.set(x, 2.6, z);
      this.worldGroup.add(lantern);
    }
    this.obstacles.push({ kind: "circle", x: -1, z: 8.2, r: 0.8 });
  }

  private addLanternRiver(chapter: Chapter): void {
    this.lanternRiver = new LanternRiver(32);
    this.worldGroup.add(this.lanternRiver.group);
    const loom = createLoom();
    loom.position.set(0, 0, 4.4);
    loom.scale.setScalar(1.1);
    this.worldGroup.add(loom);
    this.obstacles.push({ kind: "rect", x: 0, z: 4.4, w: 2.6, d: 1.3 });
    const table = createCalligraphyTable();
    table.position.set(-4.5, 0, 6.2);
    table.rotation.y = 0.3;
    this.worldGroup.add(table);
    this.obstacles.push({ kind: "rect", x: -4.5, z: 6.2, w: 2.4, d: 1.1 });
    for (const [x, y, z] of [[-9, 3.4, -3], [9, 3.4, -3], [-6, 4.2, 9], [6, 4.2, 9]] as const) {
      const lantern = createLantern(chapter.palette.accent, 0.8);
      lantern.position.set(x, y, z);
      this.worldGroup.add(lantern);
    }
  }

  private buildActors(chapter: Chapter): void {
    chapter.actors.forEach((placement) => {
      if (placement.character === "mei" || placement.character === "narrator") return;
      const rig = createCharacter(placement.character);
      rig.setPosition(placement.position[0], placement.position[1]);
      rig.setRotation(placement.rotation ?? 0);
      this.worldGroup.add(rig.group);
      this.actors.set(placement.character, rig);
    });
  }

  private createMarker(hotspot: Hotspot): THREE.Group {
    const group = new THREE.Group();
    group.position.set(hotspot.position[0], 1.45, hotspot.position[2]);
    const material = new THREE.MeshStandardMaterial({
      color: hotspot.kind === "sit" ? 0x9fd7df : 0xf2c15e,
      emissive: hotspot.kind === "sit" ? 0x9fd7df : 0xf2c15e,
      emissiveIntensity: 2.2,
      roughness: 0.3,
      metalness: 0.1
    });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(hotspot.kind === "sit" ? 0.16 : 0.2, 0), material);
    group.add(diamond);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.018, 6, 28),
      new THREE.MeshStandardMaterial({ color: 0xf2c15e, emissive: 0xf2c15e, emissiveIntensity: 1.4, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    group.userData.baseY = 1.45;
    group.userData.phase = Math.random() * 6.28;
    group.userData.hotspotId = hotspot.id;
    this.markerGroup.add(group);
    return group;
  }

  private blocked(x: number, z: number): boolean {
    if (!this.chapter) return true;
    const { minX, maxX, minZ, maxZ } = this.chapter.bounds;
    if (x < minX || x > maxX || z < minZ || z > maxZ) return true;
    for (const obstacle of this.obstacles) {
      if (obstacle.kind === "circle") {
        const dx = x - obstacle.x;
        const dz = z - obstacle.z;
        if (dx * dx + dz * dz < obstacle.r * obstacle.r) return true;
      } else {
        if (Math.abs(x - obstacle.x) < obstacle.w / 2 && Math.abs(z - obstacle.z) < obstacle.d / 2) return true;
      }
    }
    return false;
  }

  setJoystick(x: number, z: number): void {
    this.joystick.x = x;
    this.joystick.z = z;
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    this.markerGroup.visible = enabled && !this.cameraFocus;
    if (!enabled) {
      this.keys.clear();
      this.joystick.x = 0;
      this.joystick.z = 0;
    }
  }

  focusDialogue(character: CharacterId | null): void {
    const actor = character ? this.actors.get(character) : null;
    const player = this.player.group.position;
    const target = actor ? actor.group.position : player;
    let toPlayerX = player.x - target.x;
    let toPlayerZ = player.z - target.z;
    if (Math.hypot(toPlayerX, toPlayerZ) < 0.1) {
      toPlayerX = 0;
      toPlayerZ = 1;
    }
    const length = Math.hypot(toPlayerX, toPlayerZ);
    toPlayerX /= length;
    toPlayerZ /= length;
    if (actor) {
      this.player.lookAt(target.x, target.z);
      actor.group.rotation.y = Math.atan2(toPlayerX, toPlayerZ);
    }
    const sideX = -toPlayerZ;
    const sideZ = toPlayerX;
    if (actor && this.camera.aspect < 1.15) {
      this.cameraFocus = {
        position: new THREE.Vector3(target.x + toPlayerX * 2.1 + sideX * 1.3, 2.1, target.z + toPlayerZ * 2.1 + sideZ * 1.3),
        look: new THREE.Vector3(target.x, 1.32, target.z)
      };
    } else {
      const midX = (target.x + player.x) / 2;
      const midZ = (target.z + player.z) / 2;
      this.cameraFocus = {
        position: new THREE.Vector3(midX + sideX * 5.2, 3.15, midZ + sideZ * 5.2),
        look: new THREE.Vector3(midX, 1.28, midZ)
      };
    }
    this.markerGroup.visible = false;
  }

  clearDialogueFocus(): void {
    this.cameraFocus = null;
    this.markerGroup.visible = this.inputEnabled;
  }

  getNearby(): Hotspot | null {
    return this.nearby;
  }

  getPlayerPosition(): THREE.Vector3 {
    return this.player.group.position.clone();
  }

  private updateCamera(dt: number, snap = false): void {
    const focus = this.cameraFocus;
    if (focus) {
      const lerp = snap ? 1 : Math.min(1, dt * 3.4);
      this.cameraPosition.lerp(focus.position, lerp);
      this.cameraLook.lerp(focus.look, lerp);
    } else {
      const targetX = this.player.group.position.x + Math.sin(this.yaw) * CAMERA_DISTANCE;
      const targetZ = this.player.group.position.z + Math.cos(this.yaw) * CAMERA_DISTANCE;
      const target = new THREE.Vector3(targetX, this.player.group.position.y + CAMERA_HEIGHT, targetZ);
      const look = new THREE.Vector3(this.player.group.position.x, this.player.group.position.y + 1.2, this.player.group.position.z);
      const lerp = snap ? 1 : Math.min(1, dt * 5);
      this.cameraPosition.lerp(target, lerp);
      this.cameraLook.lerp(look, lerp);
    }
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraLook);
  }

  update(dt: number): void {
    if (this.disposed || !this.chapter) return;
    this.time += dt;
    this.water?.update(this.time);
    this.rain?.update(dt);
    this.lanternRiver?.update(this.time);
    this.koi?.update(this.time);
    this.maglev?.update(this.time);

    this.actors.forEach((rig) => rig.update(dt, false, this.time));
    let moving = false;
    if (this.inputEnabled && !this.cameraFocus) {
      let inputX = this.joystick.x;
      let inputZ = this.joystick.z;
      if (this.keys.has("a") || this.keys.has("arrowleft")) inputX -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright")) inputX += 1;
      if (this.keys.has("w") || this.keys.has("arrowup")) inputZ += 1;
      if (this.keys.has("s") || this.keys.has("arrowdown")) inputZ -= 1;
      const length = Math.hypot(inputX, inputZ);
      if (length > 0.05) {
        inputX /= Math.max(1, length);
        inputZ /= Math.max(1, length);
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const move = forward.multiplyScalar(inputZ).add(right.multiplyScalar(inputX));
        const speed = PLAYER_SPEED * dt;
        const nextX = this.player.group.position.x + move.x * speed;
        const nextZ = this.player.group.position.z + move.z * speed;
        if (!this.blocked(nextX, this.player.group.position.z)) this.player.group.position.x = nextX;
        if (!this.blocked(this.player.group.position.x, nextZ)) this.player.group.position.z = nextZ;
        this.player.lookAt(this.player.group.position.x + move.x, this.player.group.position.z + move.z);
        moving = true;
      }
    }
    this.player.update(dt, moving, this.time);

    this.markers.forEach((marker, id) => {
      const hotspot = this.hotspots.find((entry) => entry.id === id);
      if (!hotspot) return;
      const baseY = marker.userData.baseY as number;
      const phase = marker.userData.phase as number;
      marker.position.y = baseY + Math.sin(this.time * 2 + phase) * 0.09;
      marker.rotation.y += dt * 0.9;
      const pulse = 1 + Math.sin(this.time * 2.4 + phase) * 0.08;
      marker.scale.setScalar(pulse);
    });

    let nearest: Hotspot | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const hotspot of this.hotspots) {
      const dx = this.player.group.position.x - hotspot.position[0];
      const dz = this.player.group.position.z - hotspot.position[2];
      const distance = Math.hypot(dx, dz);
      if (distance <= hotspot.radius && distance < nearestDistance) {
        nearest = hotspot;
        nearestDistance = distance;
      }
    }
    if (nearest?.id !== this.nearby?.id) {
      this.nearby = nearest;
      this.callbacks.onNearby?.(nearest);
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.water?.dispose();
    this.rain?.dispose();
    disposeGroup(this.worldGroup);
    disposeGroup(this.lightGroup);
    disposeGroup(this.markerGroup);
    this.player.dispose();
    this.renderer.dispose();
  }
}
