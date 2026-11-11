import * as THREE from 'three';
import { Timeline } from '../animation/Timeline';
import { CharacterAnimator } from '../characters/CharacterAnimator';
import { DialogueController } from '../animation/DialogueController';
import { SubtitleManager } from '../subtitles/SubtitleManager';
import { AudioManager } from '../audio/AudioManager';
import { MainMenu } from '../ui/MainMenu';
import { PlayerControls } from '../ui/PlayerControls';
import { SettingsPanel } from '../ui/SettingsPanel';
import { EndCard } from '../ui/EndCard';
import type { PlayerSnapshot } from '../ui/types';
import {
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
} from '../utils/storage';
import type { Progress, Settings, QualitySetting, SubtitleSize } from '../utils/storage';
import { clamp01, smoothstep } from '../utils/math';
import { CameraDirector } from './CameraDirector';
import { QualityManager } from './QualityManager';
import { SceneManager } from './SceneManager';

type Mode = 'loading' | 'menu' | 'film' | 'ended';

interface FilmState {
  mode: Mode;
  time: number;
  playing: boolean;
  speed: number;
  currentStageId: string;
  actId: string;
  cinema: boolean;
  subtitles: boolean;
  voices: boolean;
}

export class FilmController {
  private readonly timeline = new Timeline();
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sceneManager: SceneManager;
  private readonly cameraDirector: CameraDirector;
  private readonly animator: CharacterAnimator;
  private readonly audio: AudioManager;
  private readonly dialogue: DialogueController;
  private readonly subtitles: SubtitleManager;
  private readonly settingsPanel: SettingsPanel;
  private readonly menu: MainMenu;
  private readonly player: PlayerControls;
  private readonly endCard: EndCard;
  private readonly quality = new QualityManager();
  private readonly fadeEl: HTMLElement;
  private readonly actTitleEl: HTMLElement;
  private readonly actTitleKicker: HTMLElement;
  private readonly actTitleText: HTMLElement;
  private readonly loadingEl: HTMLElement;
  private readonly loadingFill: HTMLElement;
  private readonly loadingStatus: HTMLElement;
  private readonly app: HTMLElement;
  private lastFrameAt = performance.now();

  private settings: Settings;
  private mode: Mode = 'loading';
  private time = 0;
  private playing = false;
  private speed = 1;
  private menuTime = 0;
  private currentStageId = '';
  private lastActTitleId = '';
  private lastUiUpdate = 0;
  private lastSavedAt = 0;
  private seekingUntil = 0;
  private lastStageBoundaryId = '';
  private debugReady = false;

  constructor() {
    this.settings = loadSettings();
    this.quality.setSetting(this.settings.quality);
    this.speed = this.settings.speed;

    this.app = document.querySelector('#app') as HTMLElement;
    this.app.dataset.mode = 'loading';
    this.app.dataset.ui = 'visible';
    this.app.dataset.cinema = this.settings.cinema ? 'on' : 'off';

    this.fadeEl = document.querySelector('#fade') as HTMLElement;
    this.actTitleEl = document.querySelector('#act-title') as HTMLElement;
    this.actTitleKicker = this.actTitleEl.querySelector('.act-title__kicker') as HTMLElement;
    this.actTitleText = this.actTitleEl.querySelector('.act-title__title') as HTMLElement;
    this.loadingEl = document.querySelector('#loading') as HTMLElement;
    this.loadingFill = document.querySelector('#loading-fill') as HTMLElement;
    this.loadingStatus = document.querySelector('#loading-status') as HTMLElement;

    this.canvas = document.querySelector('#film-canvas') as HTMLCanvasElement;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch (error) {
      this.showFatalError(
        "Impossibile avviare WebGL. Prova un browser recente con l'accelerazione grafica attiva.",
      );
      throw error;
    }

    this.renderer = renderer;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.26;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x060a12, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      240,
    );
    this.sceneManager = new SceneManager(this.renderer);
    this.cameraDirector = new CameraDirector(this.camera);
    this.animator = new CharacterAnimator(this.timeline.film);
    this.audio = new AudioManager(this.timeline.film, this.settings);
    this.dialogue = new DialogueController(this.audio);
    this.subtitles = new SubtitleManager(
      document.querySelector('#subtitles') as HTMLElement,
    );
    this.subtitles.setSize(this.settings.subtitleSize);
    this.subtitles.setEnabled(this.settings.subtitles);

    this.settingsPanel = new SettingsPanel(
      document.querySelector('#settings-panel') as HTMLElement,
      {
        onQuality: (quality) => this.setQuality(quality),
        onSubtitleSize: (size) => this.setSubtitleSize(size),
        onSubtitles: (enabled) => this.setSubtitles(enabled),
        onVoices: (enabled) => this.setVoices(enabled),
        onCinema: (enabled) => this.setCinema(enabled),
        onDownloadSrt: () => this.subtitles.downloadSrt(),
        onMenu: () => this.showMenu(),
      },
    );

    this.menu = new MainMenu({
      onWatch: () => this.startFilm(0),
      onResume: () => {
        const progress = loadProgress();
        this.startFilm(progress && !progress.completed ? progress.time : 0);
      },
      onSettings: () => this.openSettings(),
    });

    this.player = new PlayerControls(
      {
        onTogglePlay: () => this.togglePlay(),
        onSeek: (time) => this.seek(time),
        onRestart: () => this.restart(),
        onSkipAct: (direction) => this.skipAct(direction),
        onVolume: (volume) => this.setVolume(volume),
        onToggleMute: () => this.setMuted(!this.settings.muted),
        onToggleSubtitles: () => this.setSubtitles(!this.settings.subtitles),
        onToggleVoices: () => this.setVoices(!this.settings.voices),
        onToggleCinema: (enabled) => this.setCinema(enabled),
        onSetSpeed: (speed) => this.setSpeed(speed),
        onOpenSettings: () => this.openSettings(),
        onMenu: () => this.showMenu(),
        onToggleFullscreen: () => this.toggleFullscreen(),
      },
      this.settingsPanel,
    );

    this.endCard = new EndCard({
      onReplay: () => this.startFilm(0),
      onMenu: () => this.showMenu(),
    });

    this.settingsPanel.sync(this.settings);
    this.app.dataset.mode = 'loading';
    this.bindWindowEvents();
    this.exposeDebugApi();

    void this.init();
    this.loop();
  }

  private async init(): Promise<void> {
    try {
      this.loadingStatus.textContent = 'Compilazione della sceneggiatura…';
      this.loadingFill.style.width = '8%';
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      await this.sceneManager.build(this.timeline.film, ({ ratio, label }) => {
        this.loadingFill.style.width = `${8 + ratio * 88}%`;
        this.loadingStatus.textContent = `Costruzione: ${label}…`;
      });

      this.sceneManager.applyQuality(this.quality.isLow);
      this.loadingFill.style.width = '100%';
      this.loadingStatus.textContent = 'Ultimi ritocchi…';
      await new Promise<void>((resolve) => setTimeout(resolve, 250));

      this.mode = 'menu';
      this.currentStageId = '';
      this.sceneManager.enterMenuMode();
      const menuStage = this.sceneManager.getMenuStage();
      if (menuStage?.menuCamera) {
        this.cameraDirector.applyMenu(menuStage.menuCamera, this.menuTime);
      }
      this.subtitles.clear();
      this.app.dataset.mode = 'menu';
      this.showMenuProgress();
      this.loadingEl.classList.add('is-done');
      this.loadingEl.setAttribute('aria-hidden', 'true');
      this.updatePlayerSnapshot(true);
      this.renderOnce();
    } catch (error) {
      console.error(error);
      this.showFatalError(
        'La proiezione non può iniziare: si è verificato un errore durante la costruzione della scena.',
      );
    }
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);

    if (this.mode === 'loading' || this.mode === 'ended') return;

    const now = performance.now();
    const delta = Math.min((now - this.lastFrameAt) / 1000, 0.1);
    this.lastFrameAt = now;

    if (this.mode === 'menu') {
      this.menuTime += delta;
      const stage = this.sceneManager.getMenuStage();
      if (stage) {
        this.sceneManager.update(this.menuTime, false);
        if (stage.menuCamera) this.cameraDirector.applyMenu(stage.menuCamera, this.menuTime);
      }
      this.renderOnce();
      return;
    }

    if (this.playing) {
      this.time = Math.min(this.timeline.duration, this.time + delta * this.speed);
    }

    this.applyFilmFrame();
    this.renderOnce();

    if (this.playing) this.maybeSaveProgress();

    if (this.playing && this.time >= this.timeline.duration - 0.001) {
      this.complete();
    }
  };

  private applyFilmFrame(): void {
    const time = this.time;
    const stageInfo = this.timeline.getStageAt(time);
    if (this.currentStageId !== stageInfo.id) {
      this.sceneManager.activate(stageInfo.id);
      this.currentStageId = stageInfo.id;
      this.animator.setStage(this.sceneManager.getActiveStage());
    }

    const stage = this.sceneManager.getActiveStage();
    if (!stage) return;

    const activeLine = this.timeline.getDialogueAt(time);
    this.animator.update(time, this.camera.position, activeLine);

    const beat = this.timeline.getBeatAt(time);
    const shot = this.timeline.cues.shots[beat.camera];
    const progress = clamp01((time - beat.start) / Math.max(0.001, beat.duration));
    if (shot) this.cameraDirector.applyShot(shot, progress, stage, time);

    this.sceneManager.update(time, this.playing);
    this.subtitles.setTime(time);
    const audioAllowed = this.playing && performance.now() >= this.seekingUntil;
    this.audio.update(time, audioAllowed, this.speed);
    this.dialogue.update(time, activeLine, audioAllowed);

    this.updateFade(time);
    this.updateActTitle(time);

    const now = performance.now();
    if (now - this.lastUiUpdate > 100 || !this.playing) {
      this.lastUiUpdate = now;
      this.updatePlayerSnapshot();
    }
  }

  private startFilm(fromTime: number): void {
    if (this.mode === 'loading') return;

    this.endCard.hide();
    this.settingsPanel.close();
    this.menu.hide();
    this.sceneManager.leaveMenuMode();
    this.app.dataset.mode = 'film';
    this.app.dataset.ui = 'visible';
    this.app.dataset.cinema = this.settings.cinema ? 'on' : 'off';
    if (this.settings.cinema) void this.requestFullscreen();

    this.mode = 'film';
    this.time = Math.max(0, Math.min(this.timeline.duration - 0.01, fromTime));
    this.playing = true;
    this.currentStageId = '';
    this.lastActTitleId = '';
    this.dialogue.seek();
    this.subtitles.clear();

    const stageInfo = this.timeline.getStageAt(this.time);
    this.sceneManager.activate(stageInfo.id);
    this.currentStageId = stageInfo.id;
    this.animator.setStage(this.sceneManager.getActiveStage());

    this.audio.start(this.time);
    this.audio.setVolume(this.settings.volume);
    this.audio.setMuted(this.settings.muted);
    this.audio.setVoicesEnabled(this.settings.voices);
    this.dialogue.setVoicesEnabled(this.settings.voices);

    saveProgress({
      time: this.time,
      actId: this.timeline.getActAt(this.time).id,
      completed: false,
      updatedAt: Date.now(),
    });

    this.settingsPanel.sync(this.settings, this.audio.voiceStatus);
    this.updatePlayerSnapshot(true);
    this.applyFilmFrame();
    this.renderOnce();
    this.player.toast(
      `ATTO ${this.timeline.getActAt(this.time).number.replace('ATTO ', '')} — ${
        this.timeline.getActAt(this.time).title
      }`,
      2200,
    );
    this.lastFrameAt = performance.now();
  }

  private togglePlay(): void {
    if (this.mode === 'menu') {
      this.startFilm(0);
      return;
    }
    if (this.mode === 'ended') {
      this.startFilm(0);
      return;
    }
    if (this.mode !== 'film') return;

    if (this.playing) {
      this.pause();
    } else {
      this.playing = true;
      this.audio.resume();
      this.audio.setVoicesEnabled(this.settings.voices);
      this.dialogue.seek();
      this.updatePlayerSnapshot(true);
      this.lastFrameAt = performance.now();
    }
  }

  private pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.audio.pause();
    this.saveProgressNow(false);
    this.updatePlayerSnapshot(true);
  }

  private seek(time: number): void {
    if (this.mode === 'menu') return;
    if (this.mode === 'ended') {
      this.mode = 'film';
      this.endCard.hide();
      this.app.dataset.mode = 'film';
    }

    this.time = Math.max(0, Math.min(this.timeline.duration - 0.01, time));
    this.currentStageId = '';
    this.dialogue.seek();
    this.subtitles.clear();
    this.audio.cancelVoice();
    this.audio.seek(this.time);
    this.seekingUntil = performance.now() + 320;
    this.saveProgressNow(false);
    this.applyFilmFrame();
    this.renderOnce();
    this.updatePlayerSnapshot(true);
  }

  private restart(): void {
    this.startFilm(0);
  }

  private skipAct(direction: -1 | 1): void {
    if (this.mode === 'menu') {
      this.startFilm(0);
      return;
    }

    const current = this.timeline.getActAt(this.time);
    const index = this.timeline.film.acts.findIndex((act) => act.id === current.id);
    if (direction > 0 && index === this.timeline.film.acts.length - 1) {
      this.seek(this.timeline.duration - 0.2);
      return;
    }

    const targetIndex =
      direction > 0
        ? Math.min(this.timeline.film.acts.length - 1, index + 1)
        : Math.max(0, index - 1);
    const target = this.timeline.film.acts[targetIndex];
    this.seek(target.start + 0.05);
    this.player.toast(`${target.number} — ${target.title}`, 2200);
  }

  private complete(): void {
    if (this.mode === 'ended') return;
    this.playing = false;
    this.time = this.timeline.duration;
    this.mode = 'ended';
    this.app.dataset.mode = 'ended';
    this.audio.finish();
    this.dialogue.seek();
    this.subtitles.clear();
    this.actTitleEl.classList.remove('is-visible');
    this.endCard.show();
    saveProgress({
      time: this.time,
      actId: this.timeline.film.acts[this.timeline.film.acts.length - 1]?.id ?? '',
      completed: true,
      updatedAt: Date.now(),
    });
    this.updatePlayerSnapshot(true);
  }

  private showMenu(): void {
    if (this.mode === 'loading') return;
    this.audio.finish();
    this.playing = false;
    this.mode = 'menu';
    this.endCard.hide();
    this.settingsPanel.close();
    this.sceneManager.enterMenuMode();
    this.currentStageId = '';
    this.animator.setStage(null);
    this.subtitles.clear();
    this.actTitleEl.classList.remove('is-visible');
    this.lastActTitleId = '';
    this.app.dataset.mode = 'menu';
    this.app.dataset.ui = 'visible';
    this.app.dataset.cinema = 'off';
    this.fadeEl.style.opacity = '0';
    this.menuTime = 0;
    this.menu.show(
      loadProgress(),
      this.timeline.getActAt(this.time).number +
        ' — ' +
        this.timeline.getActAt(this.time).title,
      this.timeline.duration,
    );
    this.updatePlayerSnapshot(true);
    this.saveProgressNow(false);
    this.renderOnce();
  }

  private showMenuProgress(): void {
    const progress = loadProgress();
    const act = progress ? this.timeline.getActAt(progress.time) : this.timeline.getActAt(0);
    this.menu.show(
      progress,
      act ? `${act.number} — ${act.title}` : '',
      this.timeline.duration,
    );
  }

  private updateFade(time: number): void {
    let alpha = 0;

    if (time < 1.2) alpha = Math.max(alpha, 1 - smoothstep(0, 1.2, time));

    for (const act of this.timeline.film.acts) {
      if (time < act.end && time > act.end - 0.75) {
        alpha = Math.max(alpha, smoothstep(act.end - 0.75, act.end, time));
      }
      if (time >= act.start && time < act.start + 0.8) {
        alpha = Math.max(alpha, 1 - smoothstep(act.start, act.start + 0.8, time));
      }
    }

    for (const stage of this.timeline.film.stages) {
      const act = this.timeline.film.acts.find((item) => item.id === stage.actId);
      if (!act || Math.abs(stage.start - act.start) < 0.01) continue;
      if (Math.abs(time - stage.start) < 0.55) {
        alpha = Math.max(alpha, 1 - Math.abs(time - stage.start) / 0.55);
      }
    }

    const signOff = this.timeline.getBeatById('a6_06_fuori_servizio');
    const darkDialogue = this.timeline.getBeatById('a6_07_nero');
    const finalLine = this.timeline.getBeatById('a6_09_sguardo');
    const veryEnd = this.timeline.getBeatById('a6_10_fine');

    if (signOff && darkDialogue) {
      const dimStart = signOff.start + 3.2;
      const dimEnd = darkDialogue.start + 1.6;
      const dim = 0.58 * smoothstep(dimStart, dimEnd, time);
      alpha = Math.max(alpha, dim);
    }
    if (finalLine) {
      const line = this.timeline.film.dialogue.find(
        (item) => item.beatId === finalLine.id && item.speaker === 'ARTURO',
      );
      if (line) {
        alpha = Math.max(alpha, smoothstep(line.end + 0.5, line.end + 2.4, time));
      }
    }
    if (veryEnd) {
      alpha = Math.max(alpha, smoothstep(veryEnd.start, veryEnd.end, time));
    }

    this.fadeEl.style.opacity = clamp01(alpha).toFixed(3);
  }

  private updateActTitle(time: number): void {
    const card = this.timeline.getTitleCardAt(time);
    if (!card) {
      if (this.lastActTitleId) {
        this.actTitleEl.classList.remove('is-visible');
        this.lastActTitleId = '';
      }
      return;
    }

    if (this.lastActTitleId !== card.actId) {
      this.lastActTitleId = card.actId;
      this.actTitleKicker.textContent = card.number;
      this.actTitleText.textContent = card.title;
      this.actTitleEl.classList.add('is-visible');
    }
  }

  private updatePlayerSnapshot(force = false): void {
    if (!force && this.mode === 'menu') return;
    const act = this.timeline.getActAt(this.time || 0);
    const snapshot: PlayerSnapshot = {
      mode: this.mode,
      playing: this.playing,
      time: this.mode === 'menu' ? 0 : this.time,
      duration: this.timeline.duration,
      speed: this.speed,
      volume: this.settings.volume,
      muted: this.settings.muted,
      subtitles: this.settings.subtitles,
      voices: this.settings.voices,
      cinema: this.settings.cinema,
      acts: this.timeline.film.acts.map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        start: item.start,
        duration: item.duration,
      })),
      actNumber: act.number,
      actTitle: act.title,
    };
    this.player.update(snapshot);
  }

  private maybeSaveProgress(): void {
    const now = performance.now();
    if (now - this.lastSavedAt < 2000) return;
    this.lastSavedAt = now;
    this.saveProgressNow(false);
  }

  private saveProgressNow(completed: boolean): void {
    saveProgress({
      time: this.time,
      actId: this.timeline.getActAt(this.time).id,
      completed,
      updatedAt: Date.now(),
    });
  }

  private setVolume(volume: number): void {
    this.settings.volume = Math.min(1, Math.max(0, volume));
    this.settings.muted = this.settings.volume === 0 ? true : false;
    this.audio.setVolume(this.settings.volume);
    this.audio.setMuted(this.settings.muted);
    saveSettings(this.settings);
    this.updatePlayerSnapshot(true);
  }

  private setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.audio.setMuted(muted);
    saveSettings(this.settings);
    this.updatePlayerSnapshot(true);
    this.player.toast(muted ? 'Audio disattivato' : 'Audio attivato');
  }

  private setSubtitles(enabled: boolean): void {
    this.settings.subtitles = enabled;
    this.subtitles.setEnabled(enabled);
    saveSettings(this.settings);
    this.settingsPanel.sync(this.settings, this.audio.voiceStatus);
    this.updatePlayerSnapshot(true);
    this.player.toast(enabled ? 'Sottotitoli attivi' : 'Sottotitoli disattivati');
  }

  private setVoices(enabled: boolean): void {
    this.settings.voices = enabled;
    this.audio.setVoicesEnabled(enabled);
    this.dialogue.setVoicesEnabled(enabled);
    saveSettings(this.settings);
    this.settingsPanel.sync(this.settings, this.audio.voiceStatus);
    this.updatePlayerSnapshot(true);
    this.player.toast(
      enabled
        ? this.audio.voiceAvailable
          ? 'Voci attive'
          : 'Voci non disponibili: restano i sottotitoli'
        : 'Voci disattivate',
    );
  }

  private setSubtitleSize(size: SubtitleSize): void {
    this.settings.subtitleSize = size;
    this.subtitles.setSize(size);
    saveSettings(this.settings);
    this.settingsPanel.sync(this.settings, this.audio.voiceStatus);
  }

  private setSpeed(speed: number): void {
    this.speed = speed;
    this.settings.speed = speed;
    saveSettings(this.settings);
    this.updatePlayerSnapshot(true);
  }

  private setQuality(quality: QualitySetting): void {
    this.settings.quality = quality;
    saveSettings(this.settings);
    const low = this.quality.setSetting(quality);
    this.sceneManager.applyQuality(this.quality.isLow);
    this.settingsPanel.sync(this.settings, this.audio.voiceStatus);
    this.player.toast(
      this.quality.isLow ? 'Qualità bassa attiva' : 'Qualità alta attiva',
    );
    if (low) this.lastFrameAt = performance.now();
  }

  private setCinema(enabled: boolean): void {
    this.settings.cinema = enabled;
    saveSettings(this.settings);
    this.app.dataset.cinema = enabled ? 'on' : 'off';
    this.settingsPanel.sync(this.settings, this.audio.voiceStatus);
    this.updatePlayerSnapshot(true);
    if (enabled) {
      void this.requestFullscreen();
      this.player.toast('Modalità cinema');
    } else {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      this.player.toast('Modalità cinema disattivata');
    }
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void this.requestFullscreen();
    }
  }

  private async requestFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await this.app.requestFullscreen();
      }
    } catch {
      this.player.toast('Schermo intero non disponibile');
    }
  }

  private openSettings(): void {
    if (this.mode === 'loading') return;
    this.settingsPanel.sync(this.settings, this.audio.voiceStatus);
    this.settingsPanel.open(this.audio.voiceStatus);
    this.app.dataset.ui = 'visible';
  }

  private renderOnce(): void {
    if (!this.renderer) return;
    this.renderer.render(this.sceneManager.scene, this.camera);
  }

  private bindWindowEvents(): void {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / Math.max(1, height);
      this.camera.updateProjectionMatrix();
      this.sceneManager.setRendererSize(width, height);
      if (this.mode === 'film' || this.mode === 'menu') this.renderOnce();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing) {
        this.pause();
      }
    });

    window.addEventListener('beforeunload', () => {
      if (this.mode === 'film') this.saveProgressNow(false);
    });

    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.playing = false;
      this.audio.pause();
      this.player.toast('Contesto grafico interrotto. Ricarica la pagina per riprendere.', 5000);
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.player.toast('Contesto grafico ripristinato');
      this.renderOnce();
    });

    window.addEventListener('fullscreenchange', () => {
      this.updatePlayerSnapshot(true);
    });
  }

  private exposeDebugApi(): void {
    if (this.debugReady) return;
    this.debugReady = true;

    (window as unknown as { __LULTIMO_BAGNO__: unknown }).__LULTIMO_BAGNO__ = {
      getState: () => ({
        mode: this.mode,
        time: this.time,
        playing: this.playing,
        speed: this.speed,
        stage: this.currentStageId,
        act: this.timeline.getActAt(this.time).id,
        beat: this.timeline.getBeatAt(this.time).id,
        duration: this.timeline.duration,
        subtitles: this.settings.subtitles,
        voices: this.settings.voices,
        cinema: this.settings.cinema,
        volume: this.settings.volume,
        muted: this.settings.muted,
        captions: this.subtitles.count,
      }),
      start: (time = 0) => this.startFilm(time),
      seek: (time: number) => this.seek(time),
      play: () => this.togglePlay(),
      pause: () => this.pause(),
      restart: () => this.restart(),
      menu: () => this.showMenu(),
      setCinema: (enabled: boolean) => this.setCinema(enabled),
      scene: this.sceneManager.scene,
      camera: this.camera,
      audio: () => this.audio.getState(),
      screenshotState: () => ({
        time: this.time,
        stage: this.currentStageId,
        act: this.timeline.getActAt(this.time).id,
        beat: this.timeline.getBeatAt(this.time).id,
      }),
    };
  }

  private showFatalError(message: string): void {
    this.loadingStatus.textContent = message;
    this.loadingFill.style.width = '100%';
    this.loadingFill.style.background = '#a6524b';
    this.loadingEl.classList.remove('is-done');
    this.loadingEl.setAttribute('aria-hidden', 'false');
    this.mode = 'loading';
  }
}
