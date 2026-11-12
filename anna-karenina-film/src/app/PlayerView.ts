import { FILM, sceneAtTime, sceneStarts } from '../data/film';
import type { RuntimeState, SubtitleCue } from '../data/types';
import { FilmTimeline } from '../engine/FilmTimeline';
import { SceneManager } from '../engine/SceneManager';
import { SubtitleView } from '../engine/SubtitleView';
import { AudioManager } from '../engine/AudioManager';
import { VoiceManager } from '../engine/VoiceManager';
import {
  formatTime,
  loadPreferences,
  savePreferences,
  saveProgress,
  type Preferences
} from '../engine/Persistence';
import { icon } from './icons';

export interface PlayerProps {
  startTime: number;
  audio: AudioManager;
  onEnd: () => void;
  onHome: () => void;
}

function roman(value: number): string {
  const table: Array<[number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];
  let n = Math.max(1, value);
  let out = '';
  for (const [v, s] of table) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

export class PlayerView {
  readonly element: HTMLDivElement;
  private readonly props: PlayerProps;
  private readonly stage: HTMLDivElement;
  private readonly sceneManager: SceneManager;
  private readonly subtitles: SubtitleView;
  private readonly timeline: FilmTimeline;
  private readonly audio: AudioManager;
  private readonly voices: VoiceManager;
  private readonly seek: HTMLInputElement;
  private readonly elapsed: HTMLSpanElement;
  private readonly remaining: HTMLSpanElement;
  private readonly chapterLabel: HTMLSpanElement;
  private readonly chapterNumber: HTMLSpanElement;
  private readonly playButton: HTMLButtonElement;
  private readonly muteButton: HTMLButtonElement;
  private readonly volumeInput: HTMLInputElement;
  private readonly ccButton: HTMLButtonElement;
  private readonly fullscreenButton: HTMLButtonElement;
  private readonly pauseScreen: HTMLDivElement;
  private readonly chapterPanel: HTMLDivElement;
  private readonly modal: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly rootUI: HTMLDivElement;
  private readonly prefs: Preferences;
  private unsubscribe: (() => void) | null = null;
  private hideTimer = 0;
  private endTimer = 0;
  private lastUI = 0;
  private lastInteraction = 0;
  private lastSave = 0;
  private lastSavedAt = -1;
  private currentScene = -1;
  private endedHandled = false;
  private dragging = false;
  private wasPlayingBeforeDrag = false;
  private resumeAfterPanel = false;
  private chapterPanelOpen = false;
  private modalOpen = false;
  private destroyed = false;
  private readonly boundResize: () => void;
  private readonly boundKeydown: (event: KeyboardEvent) => void;
  private readonly boundVisibility: () => void;
  private readonly boundFullscreen: () => void;
  private readonly boundPageHide: () => void;

  constructor(props: PlayerProps) {
    this.props = props;
    this.audio = props.audio;
    this.voices = new VoiceManager((audio) => this.audio.connectVoice(audio));
    void this.voices.load();
    this.prefs = loadPreferences();
    this.audio.setVolume(this.prefs.volume);
    this.audio.setMuted(this.prefs.muted);

    this.element = document.createElement('div');
    this.element.className = 'screen player-screen';
    this.element.innerHTML = `
      <div class="stage-viewport">
        <div class="film-stage" aria-hidden="true"></div>
        <div class="player-vignette"></div>
      </div>
      <div class="player-hitarea" aria-label="Area di riproduzione"></div>
      <div class="subtitle-host"></div>
      <div class="player-ui">
        <div class="player-top">
          <div class="player-brand">NEVE E FERRO</div>
          <div class="player-chapter"><span class="chapter-number"></span><span class="chapter-name"></span></div>
          <button class="icon-button player-home" data-action="home" aria-label="Torna al titolo">${icon('close')}</button>
        </div>
        <div class="player-bottom">
          <div class="seek-row">
            <div class="seek-wrap">
              <input class="seek" type="range" min="0" max="${FILM.duration}" step="0.1" value="0" aria-label="Avanzamento del film" />
              <div class="chapter-ticks" aria-hidden="true"></div>
            </div>
          </div>
          <div class="controls-row">
            <div class="controls-left">
              <button class="control control-main" data-action="play" aria-label="Riproduci o metti in pausa">${icon('play')}</button>
              <button class="control" data-action="back10" aria-label="Indietro di 10 secondi">${icon('back10')}</button>
              <button class="control" data-action="forward10" aria-label="Avanti di 10 secondi">${icon('forward10')}</button>
              <button class="control control-chapter" data-action="prev" aria-label="Capitolo precedente">${icon('prev')}</button>
              <button class="control control-chapter" data-action="next" aria-label="Capitolo successivo">${icon('next')}</button>
            </div>
            <div class="controls-time"><span class="elapsed">00:00</span><span class="time-sep">/</span><span class="remaining">-25:00</span></div>
            <div class="controls-right">
              <div class="volume-group">
                <button class="control" data-action="mute" aria-label="Disattiva audio">${icon('volume')}</button>
                <input class="volume" type="range" min="0" max="1" step="0.01" value="${this.prefs.muted ? 0 : this.prefs.volume}" aria-label="Volume" />
              </div>
              <button class="control cc-control" data-action="subtitles" aria-label="Attiva o disattiva i sottotitoli" aria-pressed="true">${icon('cc')}</button>
              <button class="control" data-action="chapters" aria-label="Capitoli">${icon('chapters')}</button>
              <button class="control" data-action="restart" aria-label="Ricomincia dall'inizio">${icon('restart')}</button>
              <button class="control" data-action="fullscreen" aria-label="Schermo intero">${icon('fullscreen')}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="pause-screen" hidden>
        <button class="pause-play" data-action="play" aria-label="Riprendi la riproduzione">${icon('play')}</button>
        <span class="pause-label">PAUSA</span>
      </div>
      <div class="chapter-panel" hidden>
        <div class="panel-head">
          <span>Capitoli</span>
          <button class="icon-button" data-action="close-chapters" aria-label="Chiudi capitoli">${icon('close')}</button>
        </div>
        <ol class="chapter-list"></ol>
      </div>
      <div class="modal-layer" hidden>
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="restart-title">
          <h3 id="restart-title">Ricominciare il film?</h3>
          <p>La posizione attuale verrà sostituita dall'inizio.</p>
          <div class="modal-actions">
            <button class="btn btn-primary" data-action="confirm-restart">RICOMINCIA</button>
            <button class="btn btn-ghost" data-action="cancel-modal">ANNULLA</button>
          </div>
        </div>
      </div>
      <div class="rotate-hint" hidden>
        <span>Ruota il dispositivo per un'esperienza cinematografica</span>
        <button data-action="dismiss-rotate" aria-label="Chiudi suggerimento">${icon('close')}</button>
      </div>
      <div class="player-toast" aria-live="polite"></div>
    `;

    this.stage = this.element.querySelector('.film-stage') as HTMLDivElement;
    this.seek = this.element.querySelector('.seek') as HTMLInputElement;
    this.elapsed = this.element.querySelector('.elapsed') as HTMLSpanElement;
    this.remaining = this.element.querySelector('.remaining') as HTMLSpanElement;
    this.chapterLabel = this.element.querySelector('.chapter-name') as HTMLSpanElement;
    this.chapterNumber = this.element.querySelector('.chapter-number') as HTMLSpanElement;
    this.playButton = this.element.querySelector('[data-action="play"]') as HTMLButtonElement;
    this.muteButton = this.element.querySelector('[data-action="mute"]') as HTMLButtonElement;
    this.volumeInput = this.element.querySelector('.volume') as HTMLInputElement;
    this.ccButton = this.element.querySelector('[data-action="subtitles"]') as HTMLButtonElement;
    this.fullscreenButton = this.element.querySelector('[data-action="fullscreen"]') as HTMLButtonElement;
    this.pauseScreen = this.element.querySelector('.pause-screen') as HTMLDivElement;
    this.chapterPanel = this.element.querySelector('.chapter-panel') as HTMLDivElement;
    this.modal = this.element.querySelector('.modal-layer') as HTMLDivElement;
    this.toast = this.element.querySelector('.player-toast') as HTMLDivElement;
    this.rootUI = this.element.querySelector('.player-ui') as HTMLDivElement;

    this.sceneManager = new SceneManager(this.stage);
    this.subtitles = new SubtitleView();
    this.element.querySelector('.subtitle-host')?.append(this.subtitles.element);
    this.subtitles.setEnabled(this.prefs.subtitles);
    this.ccButton.classList.toggle('is-active', this.prefs.subtitles);
    this.ccButton.setAttribute('aria-pressed', String(this.prefs.subtitles));
    this.updateMuteUI();
    this.buildChapterTicks();
    this.buildChapterList();
    this.bindActions();

    this.timeline = new FilmTimeline(FILM.duration);
    this.unsubscribe = this.timeline.subscribe((state) => this.onState(state));

    this.boundResize = () => this.layout();
    this.boundKeydown = (event) => this.onKeydown(event);
    this.boundVisibility = () => this.onVisibility();
    this.boundFullscreen = () => this.onFullscreenChange();
    this.boundPageHide = () => this.persist(true);
    window.addEventListener('resize', this.boundResize);
    window.addEventListener('keydown', this.boundKeydown);
    document.addEventListener('visibilitychange', this.boundVisibility);
    document.addEventListener('fullscreenchange', this.boundFullscreen);
    window.addEventListener('pagehide', this.boundPageHide);

    this.layout();
    this.timeline.seek(props.startTime >= FILM.duration - 1 ? 0 : props.startTime);
    this.showControls();
    this.timeline.play();
    this.showRotateHint();
    this.exposeQA();
  }

  private bindActions(): void {
    this.element.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      switch (action) {
        case 'play':
          this.togglePlay();
          break;
        case 'back10':
          this.seekBy(-10);
          break;
        case 'forward10':
          this.seekBy(10);
          break;
        case 'prev':
          this.previousChapter();
          break;
        case 'next':
          this.nextChapter();
          break;
        case 'mute':
          this.toggleMute();
          break;
        case 'subtitles':
          this.toggleSubtitles();
          break;
        case 'chapters':
          this.openChapters();
          break;
        case 'close-chapters':
          this.closeChapters();
          break;
        case 'restart':
          this.openRestartModal();
          break;
        case 'confirm-restart':
          this.restart();
          break;
        case 'cancel-modal':
          this.closeModal();
          break;
        case 'fullscreen':
          void this.toggleFullscreen();
          break;
        case 'home':
          this.goHome();
          break;
        case 'dismiss-rotate':
          this.element.querySelector('.rotate-hint')?.setAttribute('hidden', '');
          break;
      }
    });

    this.element.querySelector('.player-hitarea')?.addEventListener('click', () => {
      if (!this.rootUI.classList.contains('is-visible')) this.showControls();
      else this.togglePlay();
    });
    this.element.querySelector('.pause-screen')?.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('[data-action]')) return;
      this.togglePlay();
    });
    this.element.addEventListener('pointermove', () => this.showControls());
    this.element.addEventListener('touchstart', () => this.showControls(), { passive: true });

    this.volumeInput.addEventListener('input', () => {
      const value = Number(this.volumeInput.value);
      this.audio.setVolume(value);
      if (value > 0 && this.audio.isMuted()) {
        this.audio.setMuted(false);
        this.updateMuteUI();
      }
      this.prefs.volume = value;
      this.prefs.muted = this.audio.isMuted();
      savePreferences(this.prefs);
      this.showControls();
    });

    this.seek.addEventListener('pointerdown', () => {
      this.dragging = true;
      this.wasPlayingBeforeDrag = this.timeline.getState().playing;
      if (this.wasPlayingBeforeDrag) this.timeline.pause();
      this.showControls();
    });
    this.seek.addEventListener('input', () => {
      const value = Number(this.seek.value);
      this.elapsed.textContent = formatTime(value);
      this.remaining.textContent = `-${formatTime(FILM.duration - value)}`;
    });
    const commitSeek = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.voices.stop();
      const value = Number(this.seek.value);
      this.timeline.seek(value);
      this.persist(false);
      if (this.wasPlayingBeforeDrag) this.timeline.play();
      this.showControls();
    };
    this.seek.addEventListener('change', commitSeek);
    this.seek.addEventListener('pointerup', commitSeek);
    this.seek.addEventListener('blur', commitSeek);
  }

  private onState(state: RuntimeState): void {
    if (this.destroyed) return;
    this.sceneManager.render(state.time);
    this.subtitles.render(state.time);
    this.audio.update(state.time, state.playing);
    this.voices.update(this.subtitles.getCurrentCue(), state.playing);

    if (state.sceneIndex !== this.currentScene) {
      this.currentScene = state.sceneIndex;
      const scene = FILM.scenes[state.sceneIndex];
      if (scene) {
        this.chapterNumber.textContent = roman(state.sceneIndex + 1);
        this.chapterLabel.textContent = scene.title;
        this.updateChapterListActive(state.sceneIndex);
      }
    }

    if (state.ended && !this.endedHandled) {
      this.endedHandled = true;
      this.voices.stop();
      this.pauseScreen.hidden = true;
      this.rootUI.classList.remove('is-visible');
      this.element.classList.add('is-ended');
      saveProgress(FILM.duration, true);
      this.lastSavedAt = FILM.duration;
      this.endTimer = window.setTimeout(() => {
        if (!this.destroyed) this.props.onEnd();
      }, 1400);
    }

    if (state.playing && state.time - this.lastSave > 5) {
      this.persist(true);
    }
    if (!state.playing && !state.ended && Math.abs(state.time - this.lastSavedAt) > 1.5) {
      this.persist(true);
    }

    const now = performance.now();
    if (now - this.lastUI > 80 || state.ended) {
      this.lastUI = now;
      this.renderUI(state);
    }
  }

  private renderUI(state: RuntimeState): void {
    if (!this.dragging) {
      this.seek.value = String(state.time);
      this.seek.style.setProperty('--seek-progress', `${(state.time / FILM.duration) * 100}%`);
    }
    this.elapsed.textContent = formatTime(state.time);
    this.remaining.textContent = `-${formatTime(Math.max(0, FILM.duration - state.time))}`;
    const playLabel = state.playing ? 'pause' : 'play';
    this.playButton.innerHTML = icon(playLabel);
    this.playButton.setAttribute('aria-label', state.playing ? 'Metti in pausa' : 'Riproduci');
    this.element.classList.toggle('is-paused', !state.playing && !state.ended);
    this.pauseScreen.hidden = state.playing || state.ended;
    if (!state.playing || this.chapterPanelOpen || this.modalOpen) {
      this.rootUI.classList.add('is-visible');
      this.element.classList.remove('is-idle');
      this.lastInteraction = performance.now();
    } else if (performance.now() - this.lastInteraction > 3200) {
      this.rootUI.classList.remove('is-visible');
      this.element.classList.add('is-idle');
    }
  }

  private togglePlay(): void {
    const state = this.timeline.getState();
    if (state.playing) {
      this.timeline.pause();
      this.pauseScreen.hidden = false;
      this.showControls();
    } else if (!state.ended) {
      void this.audio.resume();
      this.timeline.play();
      this.showControls();
    }
  }

  private seekBy(delta: number): void {
    this.voices.stop();
    this.timeline.jump(delta);
    this.persist(false);
    this.showControls();
  }

  private previousChapter(): void {
    const state = this.timeline.getState();
    const starts = sceneStarts();
    const start = starts[state.sceneIndex] ?? 0;
    const target = state.time - start > 3 ? start : starts[Math.max(0, state.sceneIndex - 1)] ?? 0;
    this.timeline.seek(target + 0.01);
    this.persist(false);
    this.showControls();
  }

  private nextChapter(): void {
    const state = this.timeline.getState();
    const starts = sceneStarts();
    const target = starts[Math.min(FILM.scenes.length - 1, state.sceneIndex + 1)] ?? FILM.duration;
    this.timeline.seek(state.sceneIndex >= FILM.scenes.length - 1 ? FILM.duration - 0.5 : target + 0.01);
    this.persist(false);
    this.showControls();
  }

  private toggleMute(): void {
    this.audio.setMuted(!this.audio.isMuted());
    this.prefs.muted = this.audio.isMuted();
    savePreferences(this.prefs);
    this.updateMuteUI();
    this.showToast(this.audio.isMuted() ? 'Audio disattivato' : 'Audio attivato');
    this.showControls();
  }

  private updateMuteUI(): void {
    const muted = this.audio.isMuted();
    this.muteButton.innerHTML = icon(muted ? 'mute' : 'volume');
    this.muteButton.setAttribute('aria-label', muted ? 'Attiva audio' : 'Disattiva audio');
    this.volumeInput.value = String(muted ? 0 : this.audio.getVolume());
  }

  private toggleSubtitles(): void {
    const next = !this.subtitles.isEnabled();
    this.subtitles.setEnabled(next);
    this.prefs.subtitles = next;
    savePreferences(this.prefs);
    this.ccButton.classList.toggle('is-active', next);
    this.ccButton.setAttribute('aria-pressed', String(next));
    this.showToast(next ? 'Sottotitoli attivati' : 'Sottotitoli disattivati');
    this.showControls();
  }

  private buildChapterTicks(): void {
    const host = this.element.querySelector('.chapter-ticks') as HTMLDivElement;
    const starts = sceneStarts();
    starts.forEach((start, index) => {
      if (index === 0) return;
      const tick = document.createElement('span');
      tick.className = 'chapter-tick';
      tick.style.left = `${(start / FILM.duration) * 100}%`;
      tick.title = FILM.scenes[index]?.title ?? '';
      host.append(tick);
    });
  }

  private buildChapterList(): void {
    const list = this.element.querySelector('.chapter-list') as HTMLOListElement;
    const starts = sceneStarts();
    FILM.scenes.forEach((scene, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.className = 'chapter-item';
      button.dataset.chapter = String(index);
      button.innerHTML = `<span class="chapter-index">${roman(index + 1)}</span><span class="chapter-title">${scene.title}</span><span class="chapter-time">${formatTime(starts[index] ?? 0)}</span>`;
      button.addEventListener('click', () => {
        const wasPlaying = this.resumeAfterPanel;
        this.closeChapters(false);
        this.voices.stop();
        this.timeline.seek((starts[index] ?? 0) + 0.01);
        this.persist(false);
        if (wasPlaying) this.timeline.play();
        this.showControls();
      });
      li.append(button);
      list.append(li);
    });
  }

  private updateChapterListActive(index: number): void {
    this.element.querySelectorAll<HTMLButtonElement>('.chapter-item').forEach((button) => {
      button.classList.toggle('is-current', Number(button.dataset.chapter) === index);
    });
  }

  private openChapters(): void {
    this.resumeAfterPanel = this.timeline.getState().playing;
    if (this.resumeAfterPanel) this.timeline.pause();
    this.chapterPanelOpen = true;
    this.chapterPanel.hidden = false;
    this.showControls();
    this.chapterPanel.querySelector<HTMLButtonElement>('.chapter-item')?.focus();
  }

  private closeChapters(resume = true): void {
    this.chapterPanelOpen = false;
    this.chapterPanel.hidden = true;
    if (resume && this.resumeAfterPanel) {
      this.timeline.play();
      this.showControls();
    } else if (!resume) {
      this.resumeAfterPanel = false;
    }
  }

  private openRestartModal(): void {
    this.resumeAfterPanel = this.timeline.getState().playing;
    if (this.resumeAfterPanel) this.timeline.pause();
    this.modalOpen = true;
    this.modal.hidden = false;
    this.showControls();
  }

  private closeModal(): void {
    this.modalOpen = false;
    this.modal.hidden = true;
    if (this.resumeAfterPanel) {
      this.timeline.play();
      this.showControls();
    }
  }

  private restart(): void {
    this.modalOpen = false;
    this.modal.hidden = true;
    this.endedHandled = false;
    this.element.classList.remove('is-ended');
    this.voices.stop();
    this.timeline.seek(0);
    saveProgress(0);
    this.lastSavedAt = 0;
    this.timeline.play();
    this.showControls();
  }

  private async toggleFullscreen(): Promise<void> {
    const root = this.element;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const el = root as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    try {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else {
        root.classList.toggle('is-cinema');
        this.showToast(root.classList.contains('is-cinema') ? 'Modalità cinema' : 'Modalità finestra');
      }
    } catch {
      root.classList.toggle('is-cinema');
      this.showToast(root.classList.contains('is-cinema') ? 'Modalità cinema' : 'Modalità finestra');
    }
    this.updateFullscreenUI();
    this.showControls();
  }

  private onFullscreenChange(): void {
    this.updateFullscreenUI();
    this.layout();
  }

  private updateFullscreenUI(): void {
    const active = Boolean(document.fullscreenElement) || this.element.classList.contains('is-cinema');
    this.fullscreenButton.innerHTML = icon(active ? 'exitFullscreen' : 'fullscreen');
    this.fullscreenButton.setAttribute('aria-label', active ? 'Esci da schermo intero' : 'Schermo intero');
  }

  private goHome(): void {
    this.persist(true);
    this.voices.stop();
    this.timeline.pause();
    this.props.onHome();
  }

  private showControls(): void {
    this.rootUI.classList.add('is-visible');
    this.element.classList.remove('is-idle');
    this.lastInteraction = performance.now();
  }

  private showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add('is-visible');
    window.setTimeout(() => this.toast.classList.remove('is-visible'), 1800);
  }

  private showRotateHint(): void {
    const hint = this.element.querySelector('.rotate-hint') as HTMLDivElement;
    if (window.innerWidth < 760 && window.innerHeight > window.innerWidth) {
      hint.hidden = false;
      window.setTimeout(() => {
        hint.hidden = true;
      }, 6500);
    }
  }

  private layout(): void {
    const fit = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    this.stage.style.transform = `translate(-50%, -50%) scale(${fit})`;
  }

  private persist(force: boolean): void {
    const state = this.timeline.getState();
    if (!force && Math.abs(state.time - this.lastSavedAt) < 1) return;
    saveProgress(state.time, state.ended);
    this.lastSave = state.time;
    this.lastSavedAt = state.time;
  }

  private onVisibility(): void {
    if (document.visibilityState === 'hidden') {
      this.persist(true);
      if (this.timeline.getState().playing) this.timeline.pause();
    }
  }

  private onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
    if (tag === 'button' && (event.code === 'Space' || event.code === 'Enter')) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'k') {
      event.preventDefault();
      this.togglePlay();
    } else if (key === 'arrowleft') {
      event.preventDefault();
      this.seekBy(-5);
    } else if (key === 'arrowright') {
      event.preventDefault();
      this.seekBy(5);
    } else if (key === 'j') {
      event.preventDefault();
      this.seekBy(-10);
    } else if (key === 'l') {
      event.preventDefault();
      this.seekBy(10);
    } else if (key === 'm') {
      event.preventDefault();
      this.toggleMute();
    } else if (key === 's') {
      event.preventDefault();
      this.toggleSubtitles();
    } else if (key === 'f') {
      event.preventDefault();
      void this.toggleFullscreen();
    } else if (key === 'c') {
      event.preventDefault();
      if (this.chapterPanelOpen) this.closeChapters();
      else this.openChapters();
    } else if (key === 'escape') {
      if (this.chapterPanelOpen) this.closeChapters();
      if (this.modalOpen) this.closeModal();
    } else if (key === 'home') {
      event.preventDefault();
      this.timeline.seek(0);
    } else if (key === 'end') {
      event.preventDefault();
      this.timeline.seek(FILM.duration);
    }
    this.showControls();
  }

  private exposeQA(): void {
    if (!import.meta.env.DEV && !new URLSearchParams(location.search).has('qa')) return;
    const hook = {
      duration: FILM.duration,
      seek: (time: number) => this.timeline.seek(time),
      play: () => this.timeline.play(),
      pause: () => this.timeline.pause(),
      getState: () => this.timeline.getState(),
      getSceneIndex: () => this.sceneManager.getCurrentSceneIndex(),
      getSubtitle: (): SubtitleCue | null => this.subtitles.getCurrentCue(),
      getAudio: () => this.audio.getState(),
      getChapter: () => this.chapterLabel.textContent,
      root: this.element
    };
    (window as unknown as Record<string, unknown>).__NEVE_E_FERRO__ = hook;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.persist(true);
    this.timeline.pause();
    window.clearTimeout(this.hideTimer);
    window.clearTimeout(this.endTimer);
    this.unsubscribe?.();
    this.timeline.destroy();
    this.sceneManager.destroy();
    this.voices.destroy();
    void this.audio.pause();
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('keydown', this.boundKeydown);
    document.removeEventListener('visibilitychange', this.boundVisibility);
    document.removeEventListener('fullscreenchange', this.boundFullscreen);
    window.removeEventListener('pagehide', this.boundPageHide);
    if (document.fullscreenElement) void document.exitFullscreen();
    delete (window as unknown as Record<string, unknown>).__NEVE_E_FERRO__;
    this.element.remove();
  }
}
