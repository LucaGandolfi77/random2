import * as THREE from 'three';
import { AudioEngine } from '../audio/audio';
import { conversationFor } from '../data/dialogue';
import { QUESTS } from '../data/quests';
import { formatClock, pick, rankName, t, type UiKey } from '../data/strings';
import {
  SPAWN,
  BELL_SPOT,
  DELIVERIES,
  DISCOVERIES,
  FLOWERS,
  LETTERS,
  TILES,
  STIRONE_CENTER,
  TRAIN_PLATFORM,
  VEHICLES,
  ZONES
} from '../data/town';
import {
  FESTIVAL_BRANCHES,
  FESTIVAL_GUEST,
  FESTIVAL_LANTERNS,
  FESTIVAL_MUSICIANS,
  FESTIVAL_NPC_POSITIONS,
  FESTIVAL_POSTCARDS,
  FESTIVAL_STAGE,
  FESTIVAL_STARTER
} from '../data/festival';
import type { DialogueAction, Language, NpcId, ZoneSpec } from '../data/types';
import {
  acceptBell,
  acceptQuest,
  collectFlower,
  collectLetter,
  collectTile,
  completeDelivery,
  createInitialState,
  discover,
  hospitality,
  rankIndex,
  returnFlowers,
  returnLetters,
  ringBell,
  type GameState
} from '../game/state';
import { loadGame, saveGame } from '../game/save';
import {
  addPostcard,
  canStartProcession,
  collectBranch,
  festivalPathLength,
  festivalPathPoint,
  finishGarland,
  finishProcession,
  inviteMusician,
  lanternsDone,
  lightLantern,
  musiciansDone,
  startFestival,
  startProcession,
  welcomeGuest
} from '../game/festival';
import { FLIGHT, VEHICLE_CONFIG, stepVehicle, type TravelMode } from '../game/travel';
import type { TrainPhase, TrainStatus } from '../game/train';
import { ThirdPersonCamera } from '../player/camera';
import { resolveCircle } from '../player/collision';
import { Input } from '../player/input';
import { Player } from '../player/player';
import { DialogueUI } from '../ui/dialogue';
import { Hud } from '../ui/hud';
import { JournalPanel } from '../ui/journal';
import { MapPanel } from '../ui/mappanel';
import { TouchControls } from '../ui/touch';
import type { NpcActor } from '../world/npcs';
import { createFestival, type FestivalActor } from '../world/festival';
import { createTrain, type TrainActor } from '../world/train';
import { VehicleFleet, type VehicleActor } from '../world/vehicles';
import { buildWorld, type World, type WorldItem } from '../world/world';

type Mode =
  | 'title'
  | 'playing'
  | 'dialogue'
  | 'journal'
  | 'map'
  | 'paused'
  | 'settings'
  | 'confirm'
  | 'finale'
  | 'festivalEnd';

type InteractionKind =
  | 'npc'
  | 'tile'
  | 'letter'
  | 'flower'
  | 'delivery'
  | 'bell'
  | 'vehicle'
  | 'festival-starter'
  | 'festival-lantern'
  | 'festival-branch'
  | 'festival-musician'
  | 'festival-guest'
  | 'festival-procession';

interface Interaction {
  kind: InteractionKind;
  npc?: NpcActor;
  item?: WorldItem;
  vehicle?: VehicleActor;
  festivalId?: string;
  distance: number;
}

const ZERO_AXIS = { x: 0, z: 0 };
const FIRST_GESTURE_EVENTS = ['pointerdown', 'keydown'] as const;

function nearest<T extends { x: number; z: number }>(
  items: T[],
  position: { x: number; z: number }
): { x: number; z: number } | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const item of items) {
    const distance = Math.hypot(item.x - position.x, item.z - position.z);
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best ? { x: best.x, z: best.z } : null;
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export class BorgoApp {
  private state: GameState;
  private mode: Mode = 'title';

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: World;
  private readonly player: Player;
  private readonly cameraRig: ThirdPersonCamera;
  private readonly input: Input;
  private readonly audio = new AudioEngine();
  private readonly hud: Hud;
  private readonly dialogue: DialogueUI;
  private readonly journal: JournalPanel;
  private readonly mapPanel: MapPanel;
  private readonly fleet: VehicleFleet;
  private readonly train: TrainActor;
  private readonly festival: FestivalActor;
  private readonly touch: TouchControls;

  private travel: TravelMode = 'walk';
  private activeVehicle: VehicleActor | null = null;
  private lastTrainPhase: TrainPhase | null = null;
  private bumpCooldown = 0;
  private shadowX = Number.NaN;
  private shadowZ = Number.NaN;
  private processionTime = 0;

  private readonly clock = new THREE.Clock();
  private readonly titleEl = byId<HTMLDivElement>('title');
  private readonly loadingEl = byId<HTMLDivElement>('loading');
  private readonly pauseEl = byId<HTMLDivElement>('pause');
  private readonly settingsEl = byId<HTMLDivElement>('settings');
  private readonly confirmEl = byId<HTMLDivElement>('confirm');
  private readonly finaleEl = byId<HTMLDivElement>('finale');
  private readonly finaleBody = byId<HTMLParagraphElement>('finale-text');
  private readonly finaleStats = byId<HTMLDivElement>('finale-stats');
  private readonly festivalEndEl = byId<HTMLDivElement>('festival-end');
  private readonly festivalEndBody = byId<HTMLParagraphElement>('festival-end-text');
  private readonly festivalEndCards = byId<HTMLDivElement>('festival-end-cards');
  private readonly titleContinue = byId<HTMLButtonElement>('title-continue');
  private readonly titleSaveNote = byId<HTMLParagraphElement>('title-save-note');
  private readonly titleLang = byId<HTMLButtonElement>('title-lang');
  private readonly volumeInput = byId<HTMLInputElement>('volume');
  private readonly volumeValue = byId<HTMLOutputElement>('volume-value');
  private readonly reducedInput = byId<HTMLInputElement>('reduced');

  private readonly isMobile =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  private time = 0;
  private dusk = 0;
  private currentZone = '';
  private stepAccumulator = 0;
  private autoSaveTimer = 0;
  private saveAvailable = false;
  private settingsBack: 'pause' | 'title' = 'pause';
  private confirmBack: 'pause' | 'title' = 'title';

  constructor() {
    const loadedSave = loadGame();
    this.state = loadedSave ?? createInitialState();
    this.saveAvailable = loadedSave !== null;

    const canvas = byId<HTMLCanvasElement>('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isMobile,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.75 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      2400
    );
    this.scene.background = new THREE.Color(0x1d1a15);

    this.world = buildWorld(this.scene, this.isMobile);
    this.fleet = new VehicleFleet(this.scene, this.state.vehicles, VEHICLES);
    this.world.colliders.setDynamic(this.fleet.parkedObstacles());
    this.train = createTrain(this.scene);
    this.festival = createFestival(this.scene, this.isMobile);
    this.festival.setState(this.state.festival);
    this.player = new Player(
      this.scene,
      this.state.player.x,
      this.state.player.z,
      this.state.player.rot
    );
    this.cameraRig = new ThirdPersonCamera(this.camera, this.world.colliders);
    this.cameraRig.reset(this.state.player.yaw, this.state.player.pitch);
    this.cameraRig.instant = this.state.settings.reducedMotion;

    this.hud = new Hud(
      this.state.settings.lang,
      () => this.handleJournal(),
      () => this.handleMap(),
      () => this.handlePause()
    );
    this.dialogue = new DialogueUI();
    this.journal = new JournalPanel(() => {
      if (this.mode === 'journal') {
        this.mode = 'playing';
        this.hud.setVisible(true);
      }
    });
    this.mapPanel = new MapPanel(() => {
      if (this.mode === 'map') {
        this.mode = 'playing';
        this.hud.setVisible(true);
      }
    });

    this.input = new Input(canvas, {
      interact: () => this.handleInteract(),
      jump: () => this.handleJump(),
      map: () => this.handleMap(),
      journal: () => this.handleJournal(),
      pause: () => this.handlePause(),
      zoom: (delta) => this.cameraRig.zoom(delta),
      fly: () => this.handleFly(),
      horn: () => this.handleHorn(),
      reset: () => this.handleReset()
    });
    this.touch = new TouchControls(this.input, {
      interact: () => this.handleInteract(),
      fly: () => this.handleFly(),
      reset: () => this.handleReset()
    });
    this.touch.setLanguage(this.lang);

    this.audio.setVolume(this.state.settings.volume);
    this.bindDom();
    this.applyWorldState();
    this.applyFestivalState();
    this.syncSettings();
    this.applyReducedMotion();
    this.applyLanguage();
    this.updateTitleNote();
    this.applyDusk(this.state.flags.dusk || this.state.quests.bell === 'done' ? 1 : 0, true);
    this.cameraRig.titleView(0);
    this.hud.setVisible(false);
    this.titleEl.hidden = false;

    window.addEventListener('resize', this.onResize);
    window.addEventListener('visibilitychange', this.onVisibility);
    for (const event of FIRST_GESTURE_EVENTS) {
      window.addEventListener(
        event,
        () => {
          this.audio.start();
          this.audio.setVolume(this.state.settings.volume);
        },
        { once: true }
      );
    }

    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    this.onResize();
    this.fadeLoading();
    requestAnimationFrame(this.frame);
  }

  private bindDom(): void {
    this.titleContinue.addEventListener('click', () => {
      if (!this.saveAvailable) {
        this.audio.deny();
        return;
      }
      this.audio.ui();
      this.startFromState();
    });

    byId<HTMLButtonElement>('title-new').addEventListener('click', () => {
      this.audio.ui();
      if (this.saveAvailable) this.openConfirm('title');
      else this.startNewGame();
    });

    this.titleLang.addEventListener('click', () => {
      this.audio.ui();
      this.setLanguage(this.lang === 'it' ? 'en' : 'it');
    });

    byId<HTMLButtonElement>('pause-resume').addEventListener('click', () => this.resumeFromPause());
    byId<HTMLButtonElement>('pause-settings').addEventListener('click', () => this.openSettings());
    byId<HTMLButtonElement>('pause-new').addEventListener('click', () => this.openConfirm('pause'));
    byId<HTMLButtonElement>('pause-title').addEventListener('click', () => this.returnToTitle());
    byId<HTMLButtonElement>('settings-close').addEventListener('click', () => this.closeSettings());
    byId<HTMLButtonElement>('confirm-yes').addEventListener('click', () => {
      this.confirmEl.hidden = true;
      this.startNewGame();
    });
    byId<HTMLButtonElement>('confirm-no').addEventListener('click', () => this.cancelConfirm());
    byId<HTMLButtonElement>('finale-continue').addEventListener('click', () => this.leaveFinale());
    byId<HTMLButtonElement>('festival-end-close').addEventListener('click', () => this.closeFestivalEnd());
    byId<HTMLButtonElement>('finale-new').addEventListener('click', () => {
      this.finaleEl.hidden = true;
      this.startNewGame();
    });

    for (const [id, lang] of [
      ['lang-it', 'it'],
      ['lang-en', 'en']
    ] as const) {
      byId<HTMLButtonElement>(id).addEventListener('click', () => {
        this.audio.ui();
        this.setLanguage(lang);
      });
    }

    this.volumeInput.addEventListener('input', () => {
      const value = Number(this.volumeInput.value) / 100;
      this.state.settings.volume = value;
      this.volumeValue.textContent = String(Math.round(value * 100));
      this.audio.setVolume(value);
    });
    this.volumeInput.addEventListener('change', () => this.persist());

    this.reducedInput.addEventListener('change', () => {
      this.state.settings.reducedMotion = this.reducedInput.checked;
      this.applyReducedMotion();
      this.persist();
    });
  }

  private get lang(): Language {
    return this.state.settings.lang;
  }

  private frame = (): void => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    this.audio.update(dt);
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    const train = this.train.update(dt, this.time, this.lang);
    this.festival.update(dt, this.time);

    if (this.mode === 'title') {
      this.input.consumeLook();
      this.cameraRig.titleView(this.time);
      this.player.update(dt, ZERO_AXIS, false, 0, this.world.colliders);
      this.world.update(dt, this.time, this.player.position);
      this.updatePlayerVisibility();
      this.updateDusk(dt);
    } else if (this.mode === 'playing') {
      const look = this.input.consumeLook();
      this.cameraRig.look(look.x, look.y);
      this.syncDynamicColliders();

      if (this.travel === 'fly') {
        this.player.updateFlight(
          dt,
          { x: this.input.moveX, z: this.input.moveZ },
          this.input.vertical,
          this.cameraRig.yaw,
          this.world.colliders.bounds
        );
        this.cameraRig.update(dt, this.player.position);
      } else if (this.activeVehicle) {
        this.updateDriving(dt);
        this.cameraRig.update(dt, this.player.position);
      } else {
        this.player.update(
          dt,
          { x: this.input.moveX, z: this.input.moveZ },
          this.input.isRunning,
          this.cameraRig.yaw,
          this.world.colliders
        );
        this.cameraRig.update(dt, this.player.position);
      }

      if (this.state.festival.phase === 'procession') this.updateProcession(dt);
      this.world.update(dt, this.time, this.player.position);
      this.state.elapsed += dt;
      this.updatePlayerVisibility();
      this.updateInteraction();
      this.checkDiscoveries();
      this.updateZone();
      this.updateDusk(dt);
      if (this.travel === 'walk') this.updateFootsteps(dt);
      else this.stepAccumulator = 0;
      this.updateTravelHud();
      this.updateStation(train);
      this.autoSaveTimer += dt;
      if (this.autoSaveTimer >= 18) {
        this.autoSaveTimer = 0;
        this.persist();
      }
      this.hud.updateCompass(this.cameraRig.heading);
      this.hud.drawMinimap(this.state, this.player.position, this.cameraRig.heading, this.currentWaypoint());
    } else if (this.mode === 'dialogue') {
      this.input.consumeLook();
      this.syncDynamicColliders();
      this.player.update(dt, ZERO_AXIS, false, this.cameraRig.yaw, this.world.colliders);
      this.cameraRig.update(dt, this.player.position);
      this.dialogue.update(dt);
      this.world.update(dt, this.time, this.player.position);
      this.updatePlayerVisibility();
      this.updateDusk(dt);
      this.hud.updateCompass(this.cameraRig.heading);
      this.hud.drawMinimap(this.state, this.player.position, this.cameraRig.heading, this.currentWaypoint());
    } else {
      this.input.consumeLook();
      this.world.update(dt, this.time, this.player.position);
      this.updateDusk(dt);
      this.hud.updateCompass(this.cameraRig.heading);
      this.hud.drawMinimap(this.state, this.player.position, this.cameraRig.heading, this.currentWaypoint());
    }

    if (this.mode === 'playing') {
      const distance = Math.hypot(
        this.player.position.x - STIRONE_CENTER.x,
        this.player.position.z - STIRONE_CENTER.z
      );
      this.audio.setWater(Math.max(0, 1 - distance / 150));
    } else {
      this.audio.setWater(0);
    }

    if (this.mode !== 'playing') {
      this.audio.setEngine(false, 0, 'car');
      this.audio.setFlight(false, 0);
      this.hud.setTravel(null);
      this.hud.setTrain(null);
    }

    if (this.mode !== 'title') this.refreshShadow();
    this.world.sky.mesh.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  };

  private updateDriving(dt: number): void {
    const vehicle = this.activeVehicle;
    if (!vehicle) return;
    const collided = stepVehicle(
      vehicle.motion,
      vehicle.kind,
      {
        throttle: this.input.moveZ,
        steer: this.input.moveX,
        brake: this.input.isBraking
      },
      dt,
      this.world.colliders
    );
    vehicle.syncVisual(dt);
    this.player.position.set(vehicle.motion.x, 0, vehicle.motion.z);
    this.player.facing = vehicle.motion.heading;
    this.player.group.position.set(vehicle.motion.x, 0, vehicle.motion.z);
    this.player.group.rotation.y = vehicle.motion.heading;
    if (Math.abs(this.input.moveX) > 0.08 && Math.abs(vehicle.motion.speed) > 0.5) {
      const targetYaw = vehicle.motion.heading + Math.PI;
      const delta = Math.atan2(
        Math.sin(targetYaw - this.cameraRig.yaw),
        Math.cos(targetYaw - this.cameraRig.yaw)
      );
      this.cameraRig.yaw += delta * Math.min(1, dt * 3.2);
    }
    if (collided && this.bumpCooldown <= 0 && Math.abs(vehicle.motion.speed) > 0.4) {
      this.audio.bump();
      this.bumpCooldown = 0.85;
    }
  }

  private syncDynamicColliders(): void {
    this.world.colliders.setDynamic([
      ...this.fleet.parkedObstacles(),
      ...this.festival.obstacles(this.state.festival)
    ]);
  }

  private refreshShadow(force = false): void {
    const x = this.player.position.x;
    const z = this.player.position.z;
    if (!force && Math.hypot(x - this.shadowX, z - this.shadowZ) < 55) return;
    this.shadowX = x;
    this.shadowZ = z;
    this.world.lighting.setShadowCenter(x, z);
    this.renderer.shadowMap.needsUpdate = true;
  }

  private applyFestivalState(resetNpcs = false): void {
    this.festival.setState(this.state.festival);
    const open =
      this.state.festival.phase === 'active' ||
      this.state.festival.phase === 'procession' ||
      this.state.festival.phase === 'done';
    for (const npc of this.world.npcs) {
      if (open) {
        const spot = FESTIVAL_NPC_POSITIONS[npc.id];
        npc.setHome(spot.x, spot.z, spot.facing);
        npc.setWalking(false);
      } else if (resetNpcs) {
        npc.resetHome();
      }
    }
    this.audio.setFestival(open);
    this.syncDynamicColliders();
  }

  private beginFestivalEvent(): void {
    if (!startFestival(this.state.festival)) return;
    addPostcard(this.state.postcards, 'postcard-piazza');
    this.applyFestivalState();
    this.renderer.shadowMap.needsUpdate = true;
    this.audio.festivalStart();
    this.hud.toast(t('festivalStarted', this.lang));
    const card = FESTIVAL_POSTCARDS.find((item) => item.id === 'postcard-piazza');
    if (card) {
      window.setTimeout(() => {
        if (this.mode === 'playing') {
          this.hud.toast(`${t('postcardsTitle', this.lang)} · ${pick(card.title, this.lang)}`);
        }
      }, 700);
    }
    this.persist();
    this.refreshUi();
    this.updateInteraction();
  }

  private updateProcession(dt: number): void {
    if (this.state.festival.phase !== 'procession') return;
    this.processionTime += dt;
    const speed = 3.2;
    const length = festivalPathLength();
    for (const [index, npc] of this.world.npcs.entries()) {
      const point = festivalPathPoint(this.processionTime * speed + index * 2.6);
      npc.moveTo(point.x, point.z);
      npc.face(point.heading);
      npc.setWalking(true);
    }
    if (this.processionTime >= length / speed + 3) this.finishFestivalEvent();
  }

  private startProcessionEvent(): void {
    if (!startProcession(this.state.festival)) return;
    this.processionTime = 0;
    this.festival.setState(this.state.festival);
    for (const npc of this.world.npcs) npc.setWalking(true);
    this.hud.toast(t('festivalProcessionStart', this.lang));
    this.audio.questComplete();
    this.persist();
    this.refreshUi();
    this.updateInteraction();
  }

  private finishFestivalEvent(): void {
    if (!finishProcession(this.state.festival)) return;
    addPostcard(this.state.postcards, 'postcard-procession');
    addPostcard(this.state.postcards, 'postcard-group');
    this.applyFestivalState();
    this.renderer.shadowMap.needsUpdate = true;
    this.festival.startFinale();
    this.audio.applause();
    this.audio.firework();
    this.hud.toast(t('festivalDone', this.lang));
    this.persist();
    this.refreshUi();
    this.showFestivalEnd();
  }

  private showFestivalEnd(): void {
    this.mode = 'festivalEnd';
    this.hud.setPrompt(null);
    this.hud.setVisible(false);
    this.festivalEndBody.textContent = t('festivalEndBody', this.lang);
    this.festivalEndCards.textContent = '';
    for (const card of FESTIVAL_POSTCARDS) {
      if (!this.state.postcards.includes(card.id)) continue;
      const item = document.createElement('div');
      item.className = 'festival-card';
      item.style.setProperty('--festival-card', card.color);
      const title = document.createElement('strong');
      title.textContent = pick(card.title, this.lang);
      const body = document.createElement('span');
      body.textContent = pick(card.description, this.lang);
      item.append(title, body);
      this.festivalEndCards.appendChild(item);
    }
    this.festivalEndEl.hidden = false;
  }

  private closeFestivalEnd(): void {
    this.festivalEndEl.hidden = true;
    this.hud.setVisible(true);
    this.mode = 'playing';
    this.input.consumeLook();
    this.refreshUi();
    this.updateInteraction();
    this.audio.ui();
  }

  private updateTravelHud(): void {
    if (this.travel === 'fly') {
      const altitude = Math.round(this.player.position.y);
      const speed = Math.round(this.player.speed * 3.6);
      this.hud.setTravel(`${altitude} m`, `${speed} km/h`);
      this.audio.setEngine(false, 0, 'car');
      this.audio.setFlight(true, this.player.speed / FLIGHT.speed);
      return;
    }
    if (this.activeVehicle) {
      const vehicle = this.activeVehicle;
      const config = VEHICLE_CONFIG[vehicle.kind];
      const speed = Math.round(Math.abs(vehicle.motion.speed) * 3.6);
      this.hud.setTravel(`${speed} km/h`, pick(vehicle.spec.name, this.lang));
      this.audio.setEngine(true, Math.abs(vehicle.motion.speed) / config.maxSpeed, vehicle.kind);
      this.audio.setFlight(false, 0);
      return;
    }
    this.hud.setTravel(null);
    this.audio.setEngine(false, 0, 'car');
    this.audio.setFlight(false, 0);
  }

  private updateStation(status: TrainStatus): void {
    const distance = Math.hypot(
      TRAIN_PLATFORM.x - this.player.position.x,
      TRAIN_PLATFORM.z - this.player.position.z
    );
    this.hud.setTrain(distance <= TRAIN_PLATFORM.radius ? this.train.statusLine(status, this.lang) : null);

    if (this.lastTrainPhase !== status.phase) {
      const previous = this.lastTrainPhase;
      this.lastTrainPhase = status.phase;
      if (
        previous !== null &&
        distance < 130 &&
        (status.phase === 'arriving' || status.phase === 'departing')
      ) {
        this.audio.trainWhistle();
      }
    }
  }

  private handleFly(): void {
    if (this.mode !== 'playing') return;
    if (this.travel === 'fly') {
      this.tryLand();
      return;
    }
    if (this.activeVehicle) {
      this.audio.deny();
      this.hud.toast(t('promptFlyBlocked', this.lang));
      return;
    }
    if (this.travel !== 'walk') return;
    this.startFlight();
  }

  private startFlight(): void {
    this.travel = 'fly';
    this.player.setFlying(true);
    this.cameraRig.setFlight(true);
    this.cameraRig.pitch = Math.max(0.26, this.cameraRig.pitch);
    this.cameraRig.snapTo(this.player.position);
    this.input.setRun(false);
    this.touch.setTravel('fly');
    this.touch.setActionLabel(t('actionLand', this.lang));
    this.hud.setPrompt(null);
    this.hud.toast(t('toastFlight', this.lang));
    this.audio.ui();
  }

  private tryLand(): void {
    if (this.travel !== 'fly') return;
    if (!this.world.colliders.isFree(this.player.position.x, this.player.position.z, this.player.radius + 0.06)) {
      this.audio.deny();
      this.hud.toast(t('toastLandBlocked', this.lang));
      return;
    }
    this.player.setFlying(false);
    this.player.teleport(this.player.position.x, this.player.position.z, this.player.facing);
    this.travel = 'walk';
    this.cameraRig.setFlight(false);
    this.onResize();
    this.cameraRig.snapTo(this.player.position);
    this.touch.setTravel('walk');
    this.touch.setActionLabel('OK');
    this.hud.toast(t('toastLand', this.lang));
    this.audio.setFlight(false, 0);
    this.audio.ui();
    this.updateInteraction();
  }

  private handleHorn(): void {
    if (this.mode !== 'playing' || !this.activeVehicle) return;
    if (this.activeVehicle.kind === 'car') this.audio.horn();
    else this.audio.bikeBell();
  }

  private handleReset(): void {
    if (this.mode !== 'playing' || !this.activeVehicle) return;
    const vehicle = this.activeVehicle;
    vehicle.setPose(vehicle.spec.x, vehicle.spec.z, vehicle.spec.heading);
    vehicle.syncVisual(0);
    this.player.position.set(vehicle.motion.x, 0, vehicle.motion.z);
    this.player.facing = vehicle.motion.heading;
    this.cameraRig.yaw = vehicle.motion.heading + Math.PI;
    this.cameraRig.pitch = 0.34;
    this.cameraRig.snapTo(this.player.position);
    this.audio.ui();
    this.hud.toast(t('toastVehicleReset', this.lang));
  }

  private enterVehicle(vehicle: VehicleActor): void {
    if (this.mode !== 'playing' || this.travel !== 'walk') return;
    this.activeVehicle = vehicle;
    this.fleet.setOccupied(vehicle.spec.id);
    this.travel = vehicle.kind;
    this.player.velocity.set(0, 0, 0);
    this.player.position.set(vehicle.motion.x, 0, vehicle.motion.z);
    this.player.facing = vehicle.motion.heading;
    this.player.group.visible = false;
    this.player.shadow.visible = false;
    this.cameraRig.setFlight(false);
    this.cameraRig.yaw = vehicle.motion.heading + Math.PI;
    this.cameraRig.pitch = 0.34;
    this.cameraRig.distance = 8.8;
    this.cameraRig.snapTo(this.player.position);
    this.input.setRun(false);
    this.touch.setTravel(vehicle.kind);
    this.touch.setActionLabel(t('actionExit', this.lang));
    this.hud.setPrompt(null);
    this.audio.ui();
    this.updateInteraction();
  }

  private exitVehicle(): void {
    const vehicle = this.activeVehicle;
    if (!vehicle) return;
    const spot = this.findExitSpot(vehicle);
    if (!spot) {
      this.audio.deny();
      this.hud.toast(t('toastExitBlocked', this.lang));
      return;
    }
    vehicle.motion.speed = 0;
    vehicle.setRiderVisible(false);
    this.fleet.setOccupied(null);
    this.activeVehicle = null;
    this.travel = 'walk';
    this.player.teleport(spot.x, spot.z, vehicle.motion.heading);
    this.player.group.visible = true;
    this.player.shadow.visible = true;
    this.cameraRig.setFlight(false);
    this.onResize();
    this.cameraRig.snapTo(this.player.position);
    this.touch.setTravel('walk');
    this.touch.setActionLabel('OK');
    this.audio.ui();
    this.persist();
    this.updateInteraction();
  }

  private findExitSpot(vehicle: VehicleActor): { x: number; z: number } | null {
    const base = VEHICLE_CONFIG[vehicle.kind].radius + 1.05;
    const angles = [
      vehicle.motion.heading + Math.PI / 2,
      vehicle.motion.heading - Math.PI / 2,
      vehicle.motion.heading + Math.PI,
      vehicle.motion.heading,
      vehicle.motion.heading + Math.PI * 0.75,
      vehicle.motion.heading - Math.PI * 0.75
    ];
    for (const extra of [0, 0.8, 1.6]) {
      for (const angle of angles) {
        const x = vehicle.motion.x + Math.sin(angle) * (base + extra);
        const z = vehicle.motion.z + Math.cos(angle) * (base + extra);
        if (this.world.colliders.isFree(x, z, this.player.radius + 0.04)) return { x, z };
      }
    }
    return null;
  }

  private resetTravel(): void {
    if (this.activeVehicle) {
      this.activeVehicle.motion.speed = 0;
      this.activeVehicle.setRiderVisible(false);
      this.fleet.setOccupied(null);
      this.activeVehicle = null;
    }
    this.travel = 'walk';
    this.player.setFlying(false);
    this.cameraRig.setFlight(false);
    this.touch.setTravel('walk');
    this.touch.setActionLabel('OK');
    this.hud.setTravel(null);
    this.hud.setTrain(null);
    this.audio.setEngine(false, 0, 'car');
    this.audio.setFlight(false, 0);
  }

  private handleFestivalInteraction(target: Interaction): void {
    const id = target.festivalId ?? '';
    switch (target.kind) {
      case 'festival-starter':
        this.beginFestivalEvent();
        return;
      case 'festival-lantern': {
        if (!lightLantern(this.state.festival, id)) {
          this.audio.deny();
          return;
        }
        this.festival.setState(this.state.festival);
        this.audio.pickup();
        this.hud.toast(`${t('festivalLanternToast', this.lang)} · ${this.state.festival.lanterns.length}/5`);
        if (lanternsDone(this.state.festival)) {
          const card = FESTIVAL_POSTCARDS.find((item) => item.id === 'postcard-lanterns');
          addPostcard(this.state.postcards, 'postcard-lanterns');
          this.audio.questComplete();
          this.hud.toast(t('festivalLanternsDone', this.lang));
          if (card) {
            window.setTimeout(() => {
              if (this.mode === 'playing') {
                this.hud.toast(`${t('postcardsTitle', this.lang)} · ${pick(card.title, this.lang)}`);
              }
            }, 500);
          }
        }
        this.persist();
        this.refreshUi();
        this.updateInteraction();
        return;
      }
      case 'festival-branch': {
        if (!collectBranch(this.state.festival, id)) {
          this.audio.deny();
          return;
        }
        this.audio.pickup();
        this.hud.toast(`${t('festivalBranchToast', this.lang)} · ${this.state.festival.branches.length}/3`);
        if (this.state.festival.branches.length >= 3 && finishGarland(this.state.festival)) {
          this.audio.questComplete();
          this.hud.toast(t('festivalGarlandDone', this.lang));
        }
        this.festival.setState(this.state.festival);
        this.persist();
        this.refreshUi();
        this.updateInteraction();
        return;
      }
      case 'festival-musician': {
        if (!inviteMusician(this.state.festival, id)) {
          this.audio.deny();
          return;
        }
        this.festival.setState(this.state.festival);
        this.audio.ui();
        this.hud.toast(`${t('festivalMusicianToast', this.lang)} · ${this.state.festival.musicians.length}/3`);
        if (musiciansDone(this.state.festival)) {
          this.audio.questComplete();
          this.hud.toast(t('festivalMusiciansDone', this.lang));
        }
        this.persist();
        this.refreshUi();
        this.updateInteraction();
        return;
      }
      case 'festival-guest': {
        if (!welcomeGuest(this.state.festival)) {
          this.audio.deny();
          return;
        }
        this.festival.setState(this.state.festival);
        this.audio.trainWhistle();
        this.hud.toast(t('festivalGuestToast', this.lang));
        this.persist();
        this.refreshUi();
        this.updateInteraction();
        return;
      }
      case 'festival-procession':
        this.startProcessionEvent();
        return;
      default:
        return;
    }
  }

  private handleInteract(): void {
    if (this.mode === 'dialogue') {
      this.dialogue.advance();
      return;
    }
    if (this.mode !== 'playing') return;
    if (this.travel === 'fly') {
      this.tryLand();
      return;
    }
    if (this.activeVehicle) {
      this.exitVehicle();
      return;
    }

    const target = this.findInteraction();
    if (!target) return;
    if (target.kind === 'vehicle' && target.vehicle) {
      this.enterVehicle(target.vehicle);
      return;
    }
    if (target.kind === 'npc' && target.npc) {
      this.startConversation(target.npc);
      return;
    }
    if (target.kind.startsWith('festival-')) {
      this.handleFestivalInteraction(target);
      return;
    }

    const item = target.item;
    if (!item) return;

    switch (target.kind) {
      case 'tile': {
        if (!collectTile(this.state, item.id)) {
          this.audio.deny();
          return;
        }
        item.group!.visible = false;
        this.audio.pickup();
        this.hud.toast(`${t('toastTile', this.lang)} · ${this.state.tiles.length}/${TILES.length}`);
        if (this.state.tiles.length === TILES.length) {
          window.setTimeout(() => this.hud.toast(t('toastAllTiles', this.lang)), 400);
        }
        this.afterCollect();
        return;
      }
      case 'letter': {
        if (!collectLetter(this.state, item.id)) {
          this.audio.deny();
          return;
        }
        item.group!.visible = false;
        this.audio.pickup();
        this.hud.toast(`${t('toastLetter', this.lang)} · ${this.state.letters.length}/${LETTERS.length}`);
        if (this.state.quests.letters === 'objective') {
          window.setTimeout(() => this.hud.toast(t('toastObjective', this.lang)), 420);
        }
        this.afterCollect();
        return;
      }
      case 'flower': {
        if (!collectFlower(this.state, item.id)) {
          this.audio.deny();
          return;
        }
        item.group!.visible = false;
        this.audio.pickup();
        this.hud.toast(`${t('toastFlower', this.lang)} · ${this.state.flowers.length}/${FLOWERS.length}`);
        if (this.state.quests.flowers === 'objective') {
          window.setTimeout(() => this.hud.toast(t('toastObjective', this.lang)), 420);
        }
        this.afterCollect();
        return;
      }
      case 'delivery': {
        const quest = item.quest;
        if (!quest || !completeDelivery(this.state, quest)) {
          this.audio.deny();
          return;
        }
        item.group!.visible = false;
        this.audio.questComplete();
        const toast =
          quest === 'bread'
            ? 'toastBread'
            : quest === 'newspaper'
              ? 'toastNewspaper'
              : quest === 'book'
                ? 'toastBook'
                : 'toastCoffee';
        this.hud.toast(t(toast, this.lang));
        const ready = this.state.flags.dusk;
        this.afterCollect();
        if (ready) {
          window.setTimeout(() => this.hud.toast(t('bellReady', this.lang)), 900);
        }
        return;
      }
      case 'bell': {
        if (!ringBell(this.state)) {
          this.audio.deny();
          return;
        }
        this.audio.bell();
        this.world.ringBell();
        this.applyDusk(1, true);
        this.applyFestivalState();
        this.refreshUi();
        this.persist();
        this.showFinale();
        return;
      }
      default:
        return;
    }
  }

  private afterCollect(): void {
    this.refreshUi();
    this.persist();
    this.updateInteraction();
  }

  private handleJump(): void {
    if (this.mode === 'playing' && this.travel === 'walk') this.player.jump();
  }

  private handleMap(): void {
    if (this.mode === 'map') {
      this.mapPanel.close();
      return;
    }
    if (this.mode !== 'playing') return;
    this.mode = 'map';
    this.hud.setPrompt(null);
    this.hud.setVisible(false);
    this.input.consumeLook();
    this.mapPanel.show(
      this.state,
      this.player.position,
      this.cameraRig.heading,
      this.lang,
      this.currentWaypoint()
    );
    this.audio.ui();
  }

  private handleJournal(): void {
    if (this.mode === 'journal') {
      this.journal.close();
      return;
    }
    if (this.mode !== 'playing') return;
    this.mode = 'journal';
    this.hud.setPrompt(null);
    this.hud.setVisible(false);
    this.input.consumeLook();
    this.journal.show(this.state, this.lang);
    this.audio.ui();
  }

  private handlePause(): void {
    switch (this.mode) {
      case 'playing':
        this.openPause();
        break;
      case 'paused':
        this.resumeFromPause();
        break;
      case 'dialogue':
        this.dialogue.close();
        break;
      case 'journal':
        this.journal.close();
        break;
      case 'map':
        this.mapPanel.close();
        break;
      case 'settings':
        this.closeSettings();
        break;
      case 'confirm':
        this.cancelConfirm();
        break;
      case 'festivalEnd':
        this.closeFestivalEnd();
        break;
      default:
        break;
    }
  }

  private openPause(): void {
    this.mode = 'paused';
    this.pauseEl.hidden = false;
    this.hud.setPrompt(null);
    this.hud.setVisible(false);
    this.input.consumeLook();
    this.persist();
    this.audio.ui();
  }

  private resumeFromPause(): void {
    if (this.mode !== 'paused') return;
    this.pauseEl.hidden = true;
    this.hud.setVisible(true);
    this.mode = 'playing';
    this.input.consumeLook();
    this.audio.ui();
  }

  private openSettings(): void {
    if (this.mode !== 'paused') return;
    this.settingsBack = 'pause';
    this.pauseEl.hidden = true;
    this.settingsEl.hidden = false;
    this.mode = 'settings';
    this.syncSettings();
    this.audio.ui();
  }

  private closeSettings(): void {
    this.settingsEl.hidden = true;
    if (this.settingsBack === 'pause') {
      this.pauseEl.hidden = false;
      this.mode = 'paused';
    } else {
      this.mode = 'title';
      this.titleEl.hidden = false;
    }
    this.persist();
    this.audio.ui();
  }

  private openConfirm(back: 'pause' | 'title'): void {
    this.confirmBack = back;
    this.confirmEl.hidden = false;
    this.mode = 'confirm';
    this.audio.ui();
  }

  private cancelConfirm(): void {
    this.confirmEl.hidden = true;
    if (this.confirmBack === 'pause') {
      this.mode = 'paused';
      this.pauseEl.hidden = false;
    } else {
      this.mode = 'title';
      this.titleEl.hidden = false;
    }
    this.audio.ui();
  }

  private startNewGame(): void {
    const settings = { ...this.state.settings };
    this.resetTravel();
    this.state = createInitialState();
    this.state.settings = settings;
    this.state.started = true;
    this.fleet.apply(this.state.vehicles);
    this.lastTrainPhase = null;
    this.applyFestivalState(true);
    this.player.teleport(SPAWN.x, SPAWN.z, SPAWN.rot);
    this.state.player.x = SPAWN.x;
    this.state.player.z = SPAWN.z;
    this.state.player.rot = SPAWN.rot;
    this.state.player.yaw = SPAWN.yaw;
    this.state.player.pitch = 0.3;
    this.cameraRig.reset(SPAWN.yaw, 0.3);
    this.cameraRig.snapTo(this.player.position);
    this.currentZone = '';
    this.stepAccumulator = 0;
    this.autoSaveTimer = 0;
    this.dusk = 0;
    this.applyDusk(0, true);
    this.pauseEl.hidden = true;
    this.settingsEl.hidden = true;
    this.confirmEl.hidden = true;
    this.finaleEl.hidden = true;
    this.festivalEndEl.hidden = true;
    this.journal.hide();
    this.mapPanel.hide();
    this.applyWorldState();
    this.updateIndicators();
    this.hud.refresh(this.state);
    this.startFromState(true);
  }

  private startFromState(fromNewGame = false): void {
    this.resetTravel();
    this.fleet.apply(this.state.vehicles);
    this.lastTrainPhase = null;
    this.applyFestivalState(true);
    const resolved = resolveCircle(
      { x: this.state.player.x, z: this.state.player.z },
      this.player.radius,
      this.world.colliders
    );
    this.state.player.x = resolved.x;
    this.state.player.z = resolved.z;
    this.state.started = true;
    this.player.teleport(resolved.x, resolved.z, this.state.player.rot);
    this.player.group.visible = true;
    this.player.shadow.visible = true;
    this.cameraRig.reset(this.state.player.yaw, this.state.player.pitch);
    this.cameraRig.instant = this.state.settings.reducedMotion;
    this.cameraRig.snapTo(this.player.position);
    this.input.consumeLook();
    this.input.setEnabled(true);

    this.mode = 'playing';
    this.titleEl.hidden = true;
    this.pauseEl.hidden = true;
    this.settingsEl.hidden = true;
    this.confirmEl.hidden = true;
    this.finaleEl.hidden = true;
    this.festivalEndEl.hidden = true;
    this.journal.hide();
    this.mapPanel.hide();
    this.hud.setVisible(true);
    this.applyWorldState();
    this.updateIndicators();
    this.refreshUi();
    this.applyDusk(this.state.flags.dusk || this.state.quests.bell === 'done' ? 1 : 0, true);
    this.audio.start();
    this.audio.setVolume(this.state.settings.volume);
    this.persist();
    this.updateZone(true);
    this.updateInteraction();
    this.refreshShadow(true);
    this.onResize();

    if (fromNewGame) {
      window.setTimeout(() => {
        if (this.mode === 'playing') this.hud.toast(t('introHint', this.lang));
      }, 700);
    }
  }

  private returnToTitle(): void {
    this.persist();
    this.resetTravel();
    this.audio.setFestival(false);
    this.pauseEl.hidden = true;
    this.settingsEl.hidden = true;
    this.confirmEl.hidden = true;
    this.finaleEl.hidden = true;
    this.festivalEndEl.hidden = true;
    this.journal.hide();
    this.mapPanel.hide();
    this.hud.setVisible(false);
    this.hud.setPrompt(null);
    this.player.velocity.set(0, 0, 0);
    this.mode = 'title';
    this.titleEl.hidden = false;
    this.saveAvailable = true;
    this.updateTitleNote();
    this.input.consumeLook();
    this.audio.ui();
  }

  private startConversation(npc: NpcActor): void {
    const conversation = conversationFor(npc.id as NpcId, {
      quests: { ...this.state.quests },
      letters: this.state.letters.length,
      flowers: this.state.flowers.length,
      tiles: this.state.tiles.length,
      rank: rankIndex(this.state),
      finaleSeen: this.state.flags.finaleSeen,
      festival: {
        phase: this.state.festival.phase,
        lanterns: this.state.festival.lanterns.length,
        musicians: this.state.festival.musicians.length,
        branches: this.state.festival.branches.length,
        garland: this.state.festival.garland,
        guest: this.state.festival.guest,
        canStartProcession: canStartProcession(this.state.festival)
      }
    });

    const angle = Math.atan2(npc.x - this.player.position.x, npc.z - this.player.position.z);
    this.player.facing = angle;
    this.player.group.rotation.y = angle;

    this.mode = 'dialogue';
    this.hud.setPrompt(null);
    this.dialogue.open(conversation, this.lang, {
      onClose: () => {
        if (this.mode === 'dialogue') this.mode = 'playing';
        this.updateInteraction();
      },
      onChoice: (action) => this.handleDialogueChoice(action)
    });
    this.audio.ui();
  }

  private handleDialogueChoice(action: DialogueAction): void {
    if (action === 'close') return;

    const wasDusk = this.state.flags.dusk;
    let changed = false;

    switch (action) {
      case 'accept-bread':
        changed = acceptQuest(this.state, 'bread');
        if (changed) this.toastAccepted('bread');
        break;
      case 'accept-letters':
        changed = acceptQuest(this.state, 'letters');
        if (changed) this.toastAccepted('letters');
        break;
      case 'accept-flowers':
        changed = acceptQuest(this.state, 'flowers');
        if (changed) this.toastAccepted('flowers');
        break;
      case 'accept-newspaper':
        changed = acceptQuest(this.state, 'newspaper');
        if (changed) this.toastAccepted('newspaper');
        break;
      case 'accept-book':
        changed = acceptQuest(this.state, 'book');
        if (changed) this.toastAccepted('book');
        break;
      case 'accept-coffee':
        changed = acceptQuest(this.state, 'coffee');
        if (changed) this.toastAccepted('coffee');
        break;
      case 'accept-bell':
        changed = acceptBell(this.state);
        if (changed) this.toastAccepted('bell');
        break;
      case 'complete-letters':
        changed = returnLetters(this.state);
        if (changed) {
          this.hud.toast(t('toastLetters', this.lang));
          this.audio.questComplete();
        }
        break;
      case 'complete-flowers':
        changed = returnFlowers(this.state);
        if (changed) {
          this.hud.toast(t('toastFlowers', this.lang));
          this.audio.questComplete();
        }
        break;
      default:
        break;
    }

    if (!changed) return;
    this.refreshUi();
    this.persist();
    if (!wasDusk && this.state.flags.dusk) {
      window.setTimeout(() => this.hud.toast(t('bellReady', this.lang)), 900);
    }
  }

  private toastAccepted(id: keyof typeof QUESTS): void {
    this.hud.toast(`${t('toastAccepted', this.lang)} · ${pick(QUESTS[id].name, this.lang)}`);
    this.audio.ui();
  }

  private refreshUi(): void {
    this.hud.refresh(this.state);
    this.updateIndicators();
    this.updateWaypoint();
    if (this.journal.isOpen) this.journal.refresh(this.state, this.lang);
    if (this.mapPanel.isOpen) this.mapPanel.refresh(this.lang, this.currentWaypoint());
    this.updateTitleNote();
  }

  private applyWorldState(): void {
    for (const item of this.world.items) {
      if (!item.group) continue;
      let collected = false;
      if (item.kind === 'tile') collected = this.state.tiles.includes(item.id);
      if (item.kind === 'letter') collected = this.state.letters.includes(item.id);
      if (item.kind === 'flower') collected = this.state.flowers.includes(item.id);
      if (item.kind === 'delivery' && item.quest) {
        collected = this.state.quests[item.quest] === 'done';
      }
      item.group.visible = !collected;
    }
  }

  private updateIndicators(): void {
    for (const npc of this.world.npcs) {
      let marker: 'none' | 'quest' | 'ready' = 'none';
      if (npc.id === 'ada' && this.state.quests.bread === 'available') marker = 'quest';
      if (npc.id === 'elio') {
        if (this.state.quests.letters === 'available') marker = 'quest';
        if (this.state.quests.letters === 'objective') marker = 'ready';
      }
      if (npc.id === 'marta') {
        if (this.state.quests.flowers === 'available') marker = 'quest';
        if (this.state.quests.flowers === 'objective') marker = 'ready';
      }
      if (npc.id === 'beppe' && this.state.quests.newspaper === 'available') marker = 'quest';
      if (npc.id === 'lidia' && this.state.quests.book === 'available') marker = 'quest';
      if (npc.id === 'sara' && this.state.quests.coffee === 'available') marker = 'quest';
      if (npc.id === 'nino' && this.state.quests.bell === 'available') marker = 'quest';
      npc.setIndicator(marker);
    }
  }

  private updateWaypoint(): void {
    const point = this.currentWaypoint();
    if (point) this.world.setWaypoint(point.x, point.z, true);
    else this.world.setWaypoint(0, 0, false);
  }

  private currentWaypoint(): { x: number; z: number } | null {
    const active = this.activeTarget();
    if (active) return active;
    const festival = this.festivalWaypoint();
    if (festival) return festival;
    if (this.state.quests.bell === 'available') {
      const nino = this.world.npcs.find((npc) => npc.id === 'nino');
      if (nino) return { x: nino.x, z: nino.z };
    }
    return null;
  }

  private festivalWaypoint(): { x: number; z: number } | null {
    const festival = this.state.festival;
    if (festival.phase === 'ready') return { x: FESTIVAL_STARTER.x, z: FESTIVAL_STARTER.z };
    if (festival.phase !== 'active') return null;

    if (festival.lanterns.length < FESTIVAL_LANTERNS.length) {
      return nearest(
        FESTIVAL_LANTERNS.filter((lantern) => !festival.lanterns.includes(lantern.id)),
        this.player.position
      );
    }
    if (festival.musicians.length < FESTIVAL_MUSICIANS.length) {
      return nearest(
        FESTIVAL_MUSICIANS.filter((musician) => !festival.musicians.includes(musician.id)),
        this.player.position
      );
    }
    if (!festival.garland) {
      return nearest(
        FESTIVAL_BRANCHES.filter((branch) => !festival.branches.includes(branch.id)),
        this.player.position
      );
    }
    if (!festival.guest) return { x: FESTIVAL_GUEST.x, z: FESTIVAL_GUEST.z };
    if (canStartProcession(festival)) return { x: FESTIVAL_STAGE.x, z: FESTIVAL_STAGE.z - 2.8 };
    return null;
  }

  private activeTarget(): { x: number; z: number } | null {
    const quests = this.state.quests;
    if (quests.letters === 'active') {
      const missing = LETTERS.filter((spot) => !this.state.letters.includes(spot.id));
      return nearest(missing, this.player.position);
    }
    if (quests.letters === 'objective') {
      const elio = this.world.npcs.find((npc) => npc.id === 'elio');
      return elio ? { x: elio.x, z: elio.z } : null;
    }
    if (quests.flowers === 'active') {
      const missing = FLOWERS.filter((spot) => !this.state.flowers.includes(spot.id));
      return nearest(missing, this.player.position);
    }
    if (quests.flowers === 'objective') {
      const marta = this.world.npcs.find((npc) => npc.id === 'marta');
      return marta ? { x: marta.x, z: marta.z } : null;
    }
    for (const delivery of DELIVERIES) {
      if (quests[delivery.quest] === 'active') return { x: delivery.x, z: delivery.z };
    }
    if (quests.bell === 'active') return { x: BELL_SPOT.x, z: BELL_SPOT.z };
    return null;
  }

  private checkDiscoveries(): void {
    for (const place of DISCOVERIES) {
      if (this.state.discovered.includes(place.id)) continue;
      if (Math.hypot(place.x - this.player.position.x, place.z - this.player.position.z) > place.radius) {
        continue;
      }
      if (discover(this.state, place.id)) {
        this.audio.pickup();
        this.hud.toast(`${t('placeDiscovered', this.lang)} · ${pick(place.name, this.lang)}`);
        this.refreshUi();
        this.persist();
      }
    }
  }

  private findInteraction(): Interaction | null {
    if (this.mode !== 'playing' || this.travel !== 'walk') return null;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    let best: Interaction | null = null;

    const consider = (candidate: Interaction): void => {
      const score = candidate.distance - (candidate.kind === 'npc' ? 0.12 : 0);
      if (!best || score < best.distance - (best.kind === 'npc' ? 0.12 : 0)) {
        best = candidate;
      }
    };

    if (this.state.festival.phase === 'procession') return null;

    if (this.state.festival.phase === 'ready') {
      const distance = Math.hypot(FESTIVAL_STARTER.x - px, FESTIVAL_STARTER.z - pz);
      if (distance <= 2.7) consider({ kind: 'festival-starter', distance });
    }

    if (this.state.festival.phase === 'active') {
      for (const lantern of FESTIVAL_LANTERNS) {
        if (this.state.festival.lanterns.includes(lantern.id)) continue;
        const distance = Math.hypot(lantern.x - px, lantern.z - pz);
        if (distance <= 2.3) consider({ kind: 'festival-lantern', festivalId: lantern.id, distance });
      }
      for (const branch of FESTIVAL_BRANCHES) {
        if (this.state.festival.branches.includes(branch.id)) continue;
        const distance = Math.hypot(branch.x - px, branch.z - pz);
        if (distance <= 2.3) consider({ kind: 'festival-branch', festivalId: branch.id, distance });
      }
      for (const musician of FESTIVAL_MUSICIANS) {
        if (this.state.festival.musicians.includes(musician.id)) continue;
        const distance = Math.hypot(musician.x - px, musician.z - pz);
        if (distance <= 2.8) consider({ kind: 'festival-musician', festivalId: musician.id, distance });
      }
      if (!this.state.festival.guest) {
        const distance = Math.hypot(FESTIVAL_GUEST.x - px, FESTIVAL_GUEST.z - pz);
        if (distance <= 2.8) consider({ kind: 'festival-guest', distance });
      }
      if (canStartProcession(this.state.festival)) {
        const distance = Math.hypot(FESTIVAL_STAGE.x - px, FESTIVAL_STAGE.z - 2.8 - pz);
        if (distance <= 2.2) consider({ kind: 'festival-procession', distance });
      }
    }

    for (const vehicle of this.fleet.actors) {
      if (vehicle.occupied) continue;
      const distance = Math.hypot(vehicle.motion.x - px, vehicle.motion.z - pz);
      if (distance <= 2.8) consider({ kind: 'vehicle', vehicle, distance });
    }

    for (const npc of this.world.npcs) {
      const distance = Math.hypot(npc.x - px, npc.z - pz);
      if (distance <= 3) consider({ kind: 'npc', npc, distance });
    }

    for (const item of this.world.items) {
      const distance = Math.hypot(item.x - px, item.z - pz);
      if (item.kind === 'tile' && item.group?.visible && distance <= 1.9) {
        consider({ kind: 'tile', item, distance });
      }
      if (
        item.kind === 'letter' &&
        item.group?.visible &&
        this.state.quests.letters === 'active' &&
        distance <= 1.9
      ) {
        consider({ kind: 'letter', item, distance });
      }
      if (
        item.kind === 'flower' &&
        item.group?.visible &&
        this.state.quests.flowers === 'active' &&
        distance <= 1.9
      ) {
        consider({ kind: 'flower', item, distance });
      }
      if (
        item.kind === 'delivery' &&
        item.quest &&
        this.state.quests[item.quest] === 'active' &&
        distance <= 2.5
      ) {
        consider({ kind: 'delivery', item, distance });
      }
      if (item.kind === 'bell' && this.state.quests.bell === 'active' && distance <= 2.2) {
        consider({ kind: 'bell', item, distance });
      }
    }

    return best;
  }

  private updateInteraction(): void {
    if (this.mode !== 'playing') {
      this.hud.setPrompt(null);
      return;
    }
    if (this.state.festival.phase === 'procession') {
      this.touch.setActionLabel('OK');
      this.hud.setPrompt(null);
      return;
    }
    if (this.travel === 'fly') {
      this.touch.setActionLabel(t('actionLand', this.lang));
      if (this.input.isTouch) this.hud.setPrompt(null);
      else this.hud.setPrompt(`${t('promptLand', this.lang)} · ${Math.round(this.player.position.y)} m`, 'F');
      return;
    }
    if (this.activeVehicle) {
      this.touch.setActionLabel(t('actionExit', this.lang));
      if (this.input.isTouch) this.hud.setPrompt(null);
      else {
        this.hud.setPrompt(
          `${t('promptExit', this.lang)} ${pick(this.activeVehicle.spec.name, this.lang)}`,
          'E'
        );
      }
      return;
    }
    const target = this.findInteraction();
    if (!target) {
      this.touch.setActionLabel('OK');
      this.hud.setPrompt(null);
      return;
    }
    this.touch.setActionLabel(this.actionForTarget(target));
    if (this.input.isTouch && target.kind.startsWith('festival-')) {
      this.hud.setPrompt(null);
    } else {
      this.hud.setPrompt(
        this.promptFor(target),
        this.input.isTouch ? t('tapHint', this.lang) : 'E'
      );
    }
  }

  private actionForTarget(target: Interaction): string {
    if (target.kind === 'vehicle') return t('actionEnter', this.lang);
    if (target.kind === 'festival-starter' || target.kind === 'festival-lantern') {
      return t('actionLight', this.lang);
    }
    if (target.kind === 'festival-musician') return t('actionInvite', this.lang);
    if (target.kind === 'festival-branch') return t('actionPick', this.lang);
    if (target.kind === 'festival-guest') return t('actionWelcome', this.lang);
    if (target.kind === 'festival-procession') return t('actionGather', this.lang);
    return 'OK';
  }

  private promptFor(target: Interaction): string {
    switch (target.kind) {
      case 'npc':
        return `${t('promptTalk', this.lang)} ${target.npc?.name ?? ''}`;
      case 'vehicle':
        return `${t('promptEnter', this.lang)} ${pick(target.vehicle?.spec.name ?? { it: '', en: '' }, this.lang)}`;
      case 'tile':
        return `${t('promptTake', this.lang)} · ${t('itemTile', this.lang)}`;
      case 'letter':
        return `${t('promptTake', this.lang)} · ${t('itemLetter', this.lang)}`;
      case 'flower':
        return `${t('promptTake', this.lang)} · ${t('itemFlower', this.lang)}`;
      case 'delivery': {
        const delivery = DELIVERIES.find((entry) => entry.id === target.item?.id);
        const label = delivery ? pick(delivery.label, this.lang) : '';
        const itemName =
          target.item?.quest === 'newspaper'
            ? t('itemNewspaper', this.lang)
            : target.item?.quest === 'book'
              ? t('itemBook', this.lang)
              : target.item?.quest === 'coffee'
                ? t('itemCoffee', this.lang)
                : t('itemBread', this.lang);
        return `${t('promptDeliver', this.lang)} · ${itemName} → ${label}`;
      }
      case 'bell':
        return `${t('promptBell', this.lang)} · ${t('bellName', this.lang)}`;
      case 'festival-starter':
        return t('festivalStarter', this.lang);
      case 'festival-lantern': {
        const spot = FESTIVAL_LANTERNS.find((item) => item.id === target.festivalId);
        return `${t('festivalLantern', this.lang)}${spot ? ` · ${pick(spot.label, this.lang)}` : ''}`;
      }
      case 'festival-branch': {
        const spot = FESTIVAL_BRANCHES.find((item) => item.id === target.festivalId);
        return `${t('festivalBranch', this.lang)}${spot ? ` · ${pick(spot.label, this.lang)}` : ''}`;
      }
      case 'festival-musician': {
        const spot = FESTIVAL_MUSICIANS.find((item) => item.id === target.festivalId);
        return `${t('festivalMusician', this.lang)}${spot ? ` · ${pick(spot.label, this.lang)}` : ''}`;
      }
      case 'festival-guest':
        return `${t('festivalGuest', this.lang)} · ${pick(FESTIVAL_GUEST.label, this.lang)}`;
      case 'festival-procession':
        return t('festivalProcessionPrompt', this.lang);
    }
  }

  private updateZone(force = false): void {
    let best: ZoneSpec | null = null;
    let bestRatio = Infinity;
    for (const zone of ZONES) {
      const distance = Math.hypot(zone.x - this.player.position.x, zone.z - this.player.position.z);
      const ratio = distance / zone.r;
      if (ratio <= 1 && ratio < bestRatio) {
        best = zone;
        bestRatio = ratio;
      }
    }
    if (best && (force || best.id !== this.currentZone)) {
      this.currentZone = best.id;
      this.hud.setZone(pick(best.name, this.lang));
    }
  }

  private updatePlayerVisibility(): void {
    if (this.travel === 'car' || this.travel === 'bike') {
      this.player.group.visible = false;
      this.player.shadow.visible = false;
      return;
    }
    if (this.travel === 'fly') {
      this.player.group.visible = true;
      this.player.shadow.visible = true;
      return;
    }
    const horizontal = Math.hypot(
      this.camera.position.x - this.player.position.x,
      this.camera.position.z - this.player.position.z
    );
    const visible = horizontal > 1.35;
    this.player.group.visible = visible;
    this.player.shadow.visible = visible;
  }

  private updateFootsteps(dt: number): void {    if (!this.player.grounded || this.player.speed < 0.5) {
      this.stepAccumulator = 0;
      return;
    }
    this.stepAccumulator += this.player.speed * dt;
    const threshold = this.input.isRunning ? 2.3 : 1.7;
    if (this.stepAccumulator >= threshold) {
      this.stepAccumulator = 0;
      this.audio.footstep(this.input.isRunning);
    }
  }

  private updateDusk(dt: number): void {
    const target = this.state.flags.dusk || this.state.quests.bell === 'done' ? 1 : 0;
    if (Math.abs(target - this.dusk) < 0.002) return;
    this.dusk = THREE.MathUtils.clamp(
      this.dusk + Math.sign(target - this.dusk) * dt * 0.11,
      0,
      1
    );
    this.applyDusk(this.dusk);
  }

  private applyDusk(value: number, immediate = false): void {
    this.dusk = immediate ? value : THREE.MathUtils.clamp(value, 0, 1);
    this.world.setDusk(this.dusk);
    this.audio.setDusk(this.dusk);
    this.renderer.toneMappingExposure = 1.06 - this.dusk * 0.2;
  }

  private showFinale(): void {
    this.mode = 'finale';
    this.hud.setPrompt(null);
    this.hud.setVisible(false);
    this.renderFinale();
    this.finaleEl.hidden = false;
  }

  private leaveFinale(): void {
    this.finaleEl.hidden = true;
    this.hud.setVisible(true);
    this.mode = 'playing';
    this.input.consumeLook();
    this.refreshUi();
    this.updateInteraction();
    this.audio.ui();
    if (this.state.festival.phase === 'ready') {
      window.setTimeout(() => {
        if (this.mode === 'playing') this.hud.toast(t('festivalReadyHint', this.lang));
      }, 900);
    }
  }

  private renderFinale(): void {
    this.finaleBody.textContent =
      t('finaleBody', this.lang) +
      (this.state.tiles.length === TILES.length ? ` ${t('finaleBodyAll', this.lang)}` : '');
    this.finaleStats.textContent = '';
    const stats: Array<[string, string]> = [
      [t('finaleTiles', this.lang), `${this.state.tiles.length}/${TILES.length}`],
      [t('finalePlaces', this.lang), `${this.state.discovered.length}/${DISCOVERIES.length}`],
      [t('finaleTime', this.lang), formatClock(this.state.elapsed, this.lang)],
      [t('finaleRank', this.lang), rankName(rankIndex(this.state), this.lang)]
    ];
    for (const [label, value] of stats) {
      const item = document.createElement('div');
      item.className = 'finale-stat';
      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      const valueEl = document.createElement('strong');
      valueEl.textContent = value;
      item.append(labelEl, valueEl);
      this.finaleStats.appendChild(item);
    }
  }

  private persist(): boolean {
    if (!this.state.started && !this.saveAvailable) return false;
    this.state.player.x = this.player.position.x;
    this.state.player.z = this.player.position.z;
    this.state.player.rot = this.player.facing;
    this.state.player.yaw = this.cameraRig.yaw;
    this.state.player.pitch = this.cameraRig.pitch;
    this.state.vehicles = this.fleet.actors.map((vehicle) => ({
      id: vehicle.spec.id,
      x: vehicle.motion.x,
      z: vehicle.motion.z,
      heading: vehicle.motion.heading
    }));
    const saved = saveGame(this.state);
    if (saved) this.saveAvailable = true;
    return saved;
  }

  private updateTitleNote(): void {
    const suffix =
      this.saveAvailable && this.state.started
        ? ` · ${rankName(rankIndex(this.state), this.lang)} · ${hospitality(this.state)}`
        : '';
    this.titleSaveNote.hidden = false;
    this.titleSaveNote.textContent =
      (this.saveAvailable ? t('saveFound', this.lang) : t('saveEmpty', this.lang)) + suffix;
    this.titleContinue.disabled = !this.saveAvailable;
    this.titleContinue.hidden = !this.saveAvailable;
    const newGame = byId<HTMLButtonElement>('title-new');
    newGame.classList.toggle('btn-primary', !this.saveAvailable);
    newGame.classList.toggle('btn-ghost', this.saveAvailable);
  }

  private setLanguage(lang: Language): void {
    if (this.state.settings.lang === lang) return;
    this.state.settings.lang = lang;
    this.applyLanguage();
    this.persist();
  }

  private applyLanguage(): void {
    document.documentElement.lang = this.lang;
    for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
      const key = element.dataset.i18n;
      if (!key) continue;
      element.textContent = t(key as UiKey, this.lang);
    }
    for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
      const key = element.dataset.i18nAria;
      if (!key) continue;
      element.setAttribute('aria-label', t(key as UiKey, this.lang));
    }

    const current = this.titleLang.querySelector<HTMLElement>('.lang-current');
    const other = this.titleLang.querySelector<HTMLElement>('.lang-alt');
    if (current) current.textContent = this.lang.toUpperCase();
    if (other) other.textContent = this.lang === 'it' ? 'EN' : 'IT';

    byId<HTMLButtonElement>('lang-it').classList.toggle('is-active', this.lang === 'it');
    byId<HTMLButtonElement>('lang-en').classList.toggle('is-active', this.lang === 'en');

    this.dialogue.setKeyLabel(this.input?.isTouch ? t('tapHint', this.lang) : 'E');
    this.hud.setLanguage(this.lang);
    this.touch.setLanguage(this.lang);
    this.train.setLanguage(this.lang);
    this.updateTitleNote();
    if (this.journal.isOpen) this.journal.refresh(this.state, this.lang);
    if (this.mapPanel.isOpen) this.mapPanel.refresh(this.lang, this.currentWaypoint());
    if (!this.finaleEl.hidden) this.renderFinale();
    if (!this.festivalEndEl.hidden) this.showFestivalEnd();
    if (this.mode === 'playing') this.updateInteraction();
  }

  private syncSettings(): void {
    this.volumeInput.value = String(Math.round(this.state.settings.volume * 100));
    this.volumeValue.textContent = this.volumeInput.value;
    this.reducedInput.checked = this.state.settings.reducedMotion;
    byId<HTMLButtonElement>('lang-it').classList.toggle('is-active', this.lang === 'it');
    byId<HTMLButtonElement>('lang-en').classList.toggle('is-active', this.lang === 'en');
  }

  private applyReducedMotion(): void {
    this.cameraRig.instant = this.state.settings.reducedMotion;
    document.body.classList.toggle('reduced-motion', this.state.settings.reducedMotion);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.75 : 2));
    this.renderer.setSize(width, height, false);
    if (this.travel === 'fly') this.cameraRig.distance = 9.5;
    else if (this.activeVehicle) this.cameraRig.distance = width / height < 0.82 ? 9.5 : 8.8;
    else this.cameraRig.distance = width / height < 0.82 ? 8.5 : 7.2;
  };

  private onVisibility = (): void => {
    if (document.hidden) this.persist();
  };

  private fadeLoading(): void {
    window.setTimeout(() => {
      this.loadingEl.classList.add('is-out');
      window.setTimeout(() => {
        this.loadingEl.hidden = true;
      }, 650);
    }, 280);
  }
}
