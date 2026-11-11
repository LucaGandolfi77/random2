import { formatTime } from '../utils/storage';
import { SettingsPanel } from './SettingsPanel';
import type { PlayerSnapshot } from './types';

export interface PlayerCallbacks {
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onRestart: () => void;
  onSkipAct: (direction: -1 | 1) => void;
  onVolume: (volume: number) => void;
  onToggleMute: () => void;
  onToggleSubtitles: () => void;
  onToggleVoices: () => void;
  onToggleCinema: (enabled: boolean) => void;
  onSetSpeed: (speed: number) => void;
  onOpenSettings: () => void;
  onMenu: () => void;
  onToggleFullscreen: () => void;
}

export class PlayerControls {
  private readonly app: HTMLElement;
  private readonly callbacks: PlayerCallbacks;
  private readonly settingsPanel: SettingsPanel;
  private readonly playButton: HTMLButtonElement;
  private readonly timeline: HTMLInputElement;
  private readonly current: HTMLElement;
  private readonly total: HTMLElement;
  private readonly volume: HTMLInputElement;
  private readonly muteButton: HTMLButtonElement;
  private readonly ccButton: HTMLButtonElement;
  private readonly voicesButton: HTMLButtonElement;
  private readonly speedSelect: HTMLSelectElement;
  private readonly chapterMarks: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly cinemaButton: HTMLButtonElement;
  private snapshot: PlayerSnapshot | null = null;
  private chaptersKey = '';
  private scrubbing = false;
  private hideTimer = 0;
  private toastTimer = 0;

  constructor(callbacks: PlayerCallbacks, settingsPanel: SettingsPanel) {
    this.app = document.querySelector('#app') as HTMLElement;
    this.callbacks = callbacks;
    this.settingsPanel = settingsPanel;

    const hud = document.querySelector('#hud') as HTMLElement;
    this.playButton = hud.querySelector('#btn-play') as HTMLButtonElement;
    this.timeline = hud.querySelector('#timeline') as HTMLInputElement;
    this.current = hud.querySelector('#time-current') as HTMLElement;
    this.total = hud.querySelector('#time-total') as HTMLElement;
    this.volume = hud.querySelector('#volume') as HTMLInputElement;
    this.muteButton = hud.querySelector('#btn-mute') as HTMLButtonElement;
    this.ccButton = hud.querySelector('#btn-cc') as HTMLButtonElement;
    this.voicesButton = hud.querySelector('#btn-voices') as HTMLButtonElement;
    this.speedSelect = hud.querySelector('#speed-select') as HTMLSelectElement;
    this.chapterMarks = hud.querySelector('#chapter-marks') as HTMLElement;
    this.toastEl = document.querySelector('#toast') as HTMLElement;
    this.cinemaButton = hud.querySelector('[data-action="cinema"]') as HTMLButtonElement;

    this.bindButtons(hud);
    this.bindTimeline();
    this.bindKeyboard();
    this.app.addEventListener('pointermove', () => this.showUi());
    this.app.addEventListener('pointerdown', () => this.showUi());
    window.addEventListener('keydown', () => this.showUi(), true);
    document.addEventListener('fullscreenchange', () => this.showUi());
  }

  update(snapshot: PlayerSnapshot): void {
    this.snapshot = snapshot;

    if (!this.scrubbing) {
      const value =
        snapshot.duration > 0 ? Math.round((snapshot.time / snapshot.duration) * 1000) : 0;
      this.timeline.value = String(value);
      this.timeline.style.setProperty('--progress', `${value / 10}%`);
      this.current.textContent = formatTime(snapshot.time);
    }
    this.total.textContent = formatTime(snapshot.duration);

    this.playButton.classList.toggle('is-playing', snapshot.playing);
    this.playButton.setAttribute('aria-label', snapshot.playing ? 'Metti in pausa' : 'Riproduci');
    this.playButton.title = snapshot.playing ? 'Pausa (Spazio)' : 'Riproduci (Spazio)';

    this.volume.value = String(Math.round(snapshot.volume * 100));
    this.muteButton.setAttribute('aria-label', snapshot.muted ? 'Attiva audio' : 'Disattiva audio');
    this.muteButton.title = snapshot.muted ? 'Audio disattivato (M)' : 'Muto (M)';
    this.ccButton.setAttribute('aria-pressed', String(snapshot.subtitles));
    this.voicesButton.setAttribute('aria-pressed', String(snapshot.voices));
    this.speedSelect.value = String(snapshot.speed);
    this.cinemaButton.setAttribute('aria-pressed', String(snapshot.cinema));

    this.buildChapters(snapshot);
    this.updateVisibility(snapshot);
  }

  toast(message: string, duration = 2400): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-visible');
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
    }, duration);
  }

  private bindButtons(hud: HTMLElement): void {
    this.playButton.addEventListener('click', () => this.callbacks.onTogglePlay());
    (hud.querySelector('[data-action="restart"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.callbacks.onRestart(),
    );
    (hud.querySelector('[data-action="prev-act"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.callbacks.onSkipAct(-1),
    );
    (hud.querySelector('[data-action="next-act"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.callbacks.onSkipAct(1),
    );
    this.muteButton.addEventListener('click', () => this.callbacks.onToggleMute());
    this.ccButton.addEventListener('click', () => this.callbacks.onToggleSubtitles());
    this.voicesButton.addEventListener('click', () => this.callbacks.onToggleVoices());
    this.cinemaButton.addEventListener('click', () => {
      this.callbacks.onToggleCinema(!(this.snapshot?.cinema ?? false));
    });
    (hud.querySelector('[data-action="settings"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.callbacks.onOpenSettings(),
    );
    (hud.querySelector('[data-action="fullscreen"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.callbacks.onToggleFullscreen(),
    );
    (hud.querySelector('[data-action="menu"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.callbacks.onMenu(),
    );
    this.volume.addEventListener('input', () => {
      this.callbacks.onVolume(Number(this.volume.value) / 100);
    });
    this.speedSelect.addEventListener('change', () => {
      this.callbacks.onSetSpeed(Number(this.speedSelect.value));
    });
  }

  private bindTimeline(): void {
    const begin = () => {
      this.scrubbing = true;
      this.showUi();
    };
    const end = () => {
      this.scrubbing = false;
    };
    this.timeline.addEventListener('pointerdown', begin);
    this.timeline.addEventListener('pointerup', end);
    this.timeline.addEventListener('pointercancel', end);
    this.timeline.addEventListener('change', end);
    this.timeline.addEventListener('input', () => {
      if (!this.snapshot) return;
      const value = Number(this.timeline.value) / 1000;
      this.timeline.style.setProperty('--progress', `${value * 100}%`);
      this.callbacks.onSeek(value * this.snapshot.duration);
    });
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing =
        tag === 'input' ||
        tag === 'select' ||
        tag === 'textarea' ||
        target?.isContentEditable;

      if (this.settingsPanel.isOpen) {
        if (event.key === 'Escape') {
          this.settingsPanel.close();
          event.preventDefault();
        }
        return;
      }

      if (typing) return;
      if ((tag === 'button' || tag === 'a') && (event.key === ' ' || event.key === 'Enter')) {
        return;
      }
      if (!this.snapshot) return;

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          this.callbacks.onTogglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.callbacks.onSeek(
            Math.max(0, this.snapshot.time - (event.shiftKey ? 1 : 5)),
          );
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.callbacks.onSeek(
            Math.min(this.snapshot.duration, this.snapshot.time + (event.shiftKey ? 1 : 5)),
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.callbacks.onVolume(Math.min(1, this.snapshot.volume + 0.05));
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.callbacks.onVolume(Math.max(0, this.snapshot.volume - 0.05));
          break;
        case 'm':
        case 'M':
          this.callbacks.onToggleMute();
          break;
        case 'c':
        case 'C':
          this.callbacks.onToggleSubtitles();
          break;
        case 'v':
        case 'V':
          this.callbacks.onToggleVoices();
          break;
        case 'f':
        case 'F':
          this.callbacks.onToggleFullscreen();
          break;
        case 'r':
        case 'R':
          this.callbacks.onRestart();
          break;
        case 'Escape':
          if (this.snapshot.cinema) {
            this.callbacks.onToggleCinema(false);
          }
          break;
        default:
          break;
      }
    });
  }

  private buildChapters(snapshot: PlayerSnapshot): void {
    const key = snapshot.acts.map((act) => `${act.id}:${act.start}`).join('|');
    if (key === this.chaptersKey) return;
    this.chaptersKey = key;
    this.chapterMarks.innerHTML = '';

    for (const act of snapshot.acts) {
      const percent = snapshot.duration > 0 ? (act.start / snapshot.duration) * 100 : 0;
      const tick = document.createElement('span');
      tick.className = 'hud__chapter';
      tick.style.left = `${percent}%`;
      tick.dataset.label = act.number.replace('ATTO ', '');
      tick.title = `${act.number} — ${act.title}`;
      this.chapterMarks.appendChild(tick);
    }
  }

  private updateVisibility(snapshot: PlayerSnapshot): void {
    if (snapshot.mode !== 'film' && snapshot.mode !== 'ended') {
      this.clearHideTimer();
      this.app.dataset.ui = 'visible';
      return;
    }

    if (!snapshot.cinema || !snapshot.playing || this.settingsPanel.isOpen) {
      this.clearHideTimer();
      this.app.dataset.ui = 'visible';
      return;
    }

    if (this.app.dataset.ui !== 'hidden' && this.hideTimer === 0) this.scheduleHide();
  }

  private showUi(): void {
    this.app.dataset.ui = 'visible';
    const snapshot = this.snapshot;
    if (
      snapshot &&
      snapshot.cinema &&
      snapshot.playing &&
      !this.settingsPanel.isOpen &&
      (snapshot.mode === 'film' || snapshot.mode === 'ended')
    ) {
      this.scheduleHide();
    }
  }

  private scheduleHide(): void {
    this.clearHideTimer();
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = 0;
      if (
        this.snapshot?.cinema &&
        this.snapshot.playing &&
        !this.settingsPanel.isOpen &&
        (this.snapshot.mode === 'film' || this.snapshot.mode === 'ended')
      ) {
        this.app.dataset.ui = 'hidden';
      }
    }, 2600);
  }

  private clearHideTimer(): void {
    if (this.hideTimer) window.clearTimeout(this.hideTimer);
    this.hideTimer = 0;
  }
}
