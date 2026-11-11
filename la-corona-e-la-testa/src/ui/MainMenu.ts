import type { Progress } from '../utils/storage';
import { formatTime } from '../utils/storage';

export interface MainMenuCallbacks {
  onWatch: () => void;
  onResume: () => void;
  onSettings: () => void;
}

export class MainMenu {
  private readonly root: HTMLElement;
  private readonly watchButton: HTMLButtonElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly progressLabel: HTMLElement;

  constructor(callbacks: MainMenuCallbacks) {
    this.root = document.querySelector('#menu') as HTMLElement;
    this.watchButton = document.querySelector('#btn-watch') as HTMLButtonElement;
    this.resumeButton = document.querySelector('#btn-resume') as HTMLButtonElement;
    this.progressLabel = document.querySelector('#menu-progress') as HTMLElement;

    this.watchButton.addEventListener('click', () => callbacks.onWatch());
    this.resumeButton.addEventListener('click', () => callbacks.onResume());
    const settings = document.querySelector('#btn-menu-settings') as HTMLButtonElement;
    settings.addEventListener('click', () => callbacks.onSettings());
  }

  show(progress: Progress | null, actTitle: string, duration: number): void {
    this.root.removeAttribute('aria-hidden');
    this.root.removeAttribute('inert');
    this.root.style.pointerEvents = '';

    if (progress && progress.time > 4 && !progress.completed) {
      this.resumeButton.hidden = false;
      this.resumeButton.textContent = `Riprendi da ${formatTime(progress.time)}`;
      this.progressLabel.textContent = actTitle
        ? `${actTitle} · ${formatTime(progress.time)} di ${formatTime(duration)}`
        : `${formatTime(progress.time)} di ${formatTime(duration)}`;
    } else {
      this.resumeButton.hidden = true;
      this.progressLabel.textContent = progress?.completed
        ? 'Il film è stato proiettato fino alla fine.'
        : 'Un atto unico. Nessuna fretta.';
    }
  }

  hide(): void {
    this.root.setAttribute('aria-hidden', 'true');
    this.root.setAttribute('inert', '');
    this.root.style.pointerEvents = 'none';
  }

  get isVisible(): boolean {
    return this.root.getAttribute('aria-hidden') !== 'true';
  }
}
