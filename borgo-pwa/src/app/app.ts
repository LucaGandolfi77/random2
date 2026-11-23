import * as THREE from 'three';
import { AudioEngine } from '../audio/audio';
import { conversationFor } from '../data/dialogue';
import { QUESTS } from '../data/quests';
import { formatClock, pick, rankName, t, type UiKey } from '../data/strings';
import { SPAWN, BELL_SPOT, DELIVERIES, DISCOVERIES, FLOWERS, LETTERS, TILES, ZONES } from '../data/town';
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
import { buildWorld, type World, type WorldItem } from '../world/world';

type Mode = 'title' | 'playing' | 'dialogue' | 'journal' | 'map' | 'paused' | 'settings' | 'confirm' | 'finale';

type InteractionKind = 'npc' | 'tile' | 'letter' | 'flower' | 'delivery' | 'bell';

interface Interaction {
  kind: InteractionKind;
  npc?: NpcActor;
  item?: WorldItem;
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

  private readonly clock = new THREE.Clock();
  private readonly titleEl = byId<HTMLDivElement>('title');
  private readonly loadingEl = byId<HTMLDivElement>('loading');
  private readonly pauseEl = byId<HTMLDivElement>('pause');
  private readonly settingsEl = byId<HTMLDivElement>('settings');
  private readonly confirmEl = byId<HTMLDivElement>('confirm');
  private readonly finaleEl = byId<HTMLDivElement>('finale');
  private readonly finaleBody = byId<HTMLParagraphElement>('finale-text');
  private readonly finaleStats = byId<HTMLDivElement>('finale-stats');
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
      1400
    );
    this.scene.background = new THREE.Color(0x1d1a15);

    this.world = buildWorld(this.scene, this.isMobile);
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
      zoom: (delta) => this.cameraRig.zoom(delta)
    });
    new TouchControls(this.input, () => this.handleInteract());

    this.audio.setVolume(this.state.settings.volume);
    this.bindDom();
    this.applyWorldState();
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
      this.player.update(
        dt,
        { x: this.input.moveX, z: this.input.moveZ },
        this.input.isRunning,
        this.cameraRig.yaw,
        this.world.colliders
      );
      this.cameraRig.update(dt, this.player.position);
      this.world.update(dt, this.time, this.player.position);
      this.state.elapsed += dt;
      this.updatePlayerVisibility();
      this.updateInteraction();
      this.checkDiscoveries();
      this.updateZone();
      this.updateDusk(dt);
      this.updateFootsteps(dt);
      this.autoSaveTimer += dt;
      if (this.autoSaveTimer >= 18) {
        this.autoSaveTimer = 0;
        this.persist();
      }
      this.hud.updateCompass(this.cameraRig.heading);
      this.hud.drawMinimap(this.state, this.player.position, this.cameraRig.heading, this.currentWaypoint());
    } else if (this.mode === 'dialogue') {
      this.input.consumeLook();
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

    this.renderer.render(this.scene, this.camera);
  };

  private handleInteract(): void {
    if (this.mode === 'dialogue') {
      this.dialogue.advance();
      return;
    }
    if (this.mode !== 'playing') return;

    const target = this.findInteraction();
    if (!target) return;
    if (target.kind === 'npc' && target.npc) {
      this.startConversation(target.npc);
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
    if (this.mode === 'playing') this.player.jump();
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
    this.state = createInitialState();
    this.state.settings = settings;
    this.state.started = true;
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
    this.journal.hide();
    this.mapPanel.hide();
    this.applyWorldState();
    this.updateIndicators();
    this.hud.refresh(this.state);
    this.startFromState(true);
  }

  private startFromState(fromNewGame = false): void {
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
    this.onResize();

    if (fromNewGame) {
      window.setTimeout(() => {
        if (this.mode === 'playing') this.hud.toast(t('introHint', this.lang));
      }, 700);
    }
  }

  private returnToTitle(): void {
    this.persist();
    this.pauseEl.hidden = true;
    this.settingsEl.hidden = true;
    this.confirmEl.hidden = true;
    this.finaleEl.hidden = true;
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
      finaleSeen: this.state.flags.finaleSeen
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
    if (this.state.quests.bell === 'available') {
      const nino = this.world.npcs.find((npc) => npc.id === 'nino');
      if (nino) return { x: nino.x, z: nino.z };
    }
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
    if (this.mode !== 'playing') return null;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    let best: Interaction | null = null;

    const consider = (candidate: Interaction): void => {
      const score = candidate.distance - (candidate.kind === 'npc' ? 0.12 : 0);
      if (!best || score < best.distance - (best.kind === 'npc' ? 0.12 : 0)) {
        best = candidate;
      }
    };

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
    const target = this.findInteraction();
    if (!target) {
      this.hud.setPrompt(null);
      return;
    }
    this.hud.setPrompt(
      this.promptFor(target),
      this.input.isTouch ? t('tapHint', this.lang) : 'E'
    );
  }

  private promptFor(target: Interaction): string {
    switch (target.kind) {
      case 'npc':
        return `${t('promptTalk', this.lang)} ${target.npc?.name ?? ''}`;
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
    this.updateTitleNote();
    if (this.journal.isOpen) this.journal.refresh(this.state, this.lang);
    if (this.mapPanel.isOpen) this.mapPanel.refresh(this.lang, this.currentWaypoint());
    if (!this.finaleEl.hidden) this.renderFinale();
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
    this.cameraRig.distance = width / height < 0.82 ? 8.5 : 7.2;
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
