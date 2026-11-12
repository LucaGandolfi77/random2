import { AudioManager } from '../engine/AudioManager';
import { prepareFilm } from '../engine/AssetLoader';
import { loadProgress, saveProgress } from '../engine/Persistence';
import { LandingView } from './LandingView';
import { LoadingView } from './LoadingView';
import { PlayerView } from './PlayerView';
import { EndView } from './EndView';
import { icon } from './icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Screen = LandingView | LoadingView | PlayerView | EndView;

export class App {
  private readonly root: HTMLElement;
  private readonly audio: AudioManager;
  private current: Screen | null = null;
  private deferredInstall: BeforeInstallPromptEvent | null = null;
  private preparing = false;
  private preparationToken = 0;
  private installHint: HTMLDivElement | null = null;
  private updateToast: HTMLDivElement | null = null;
  private reloadingForUpdate = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.audio = new AudioManager();
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredInstall = event as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.deferredInstall = null;
      this.showToast('NEVE E FERRO è stata installata.', false);
    });
    window.addEventListener('sw-update', () => this.showUpdateToast());
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.reloadingForUpdate) window.location.reload();
      });
    }
    this.showLanding();
  }

  private swap(next: Screen): void {
    this.current?.destroy();
    this.current = next;
    this.root.replaceChildren(next.element);
    requestAnimationFrame(() => next.element.classList.add('is-ready'));
  }

  private showLanding(): void {
    const progress = loadProgress();
    const landing = new LandingView({
      progress,
      onWatch: () => void this.startExperience(0),
      onResume: (time) => void this.startExperience(time),
      onInstall: () => void this.install()
    });
    this.swap(landing);
    window.setTimeout(() => landing.element.querySelector<HTMLButtonElement>('[data-action="watch"]')?.focus(), 300);
  }

  private async startExperience(startTime: number): Promise<void> {
    if (this.preparing || this.current instanceof LoadingView || this.current instanceof PlayerView) return;
    try {
      await this.audio.init();
    } catch {
      // The film can continue silently; subtitles carry the dialogue.
    }
    this.showLoading(startTime);
  }

  private showLoading(startTime: number): void {
    const loading = new LoadingView({
      onRetry: () => void this.runPreparation(startTime),
      onBack: () => this.showLanding()
    });
    this.swap(loading);
    void this.runPreparation(startTime);
  }

  private async runPreparation(startTime: number): Promise<void> {
    if (this.preparing) return;
    this.preparing = true;
    const token = ++this.preparationToken;
    const loading = this.current instanceof LoadingView ? this.current : null;
    try {
      await prepareFilm((progress) => {
        if (token === this.preparationToken && this.current instanceof LoadingView) {
          this.current.update(progress);
        }
      });
      if (token !== this.preparationToken || !(this.current instanceof LoadingView)) return;
      this.preparing = false;
      this.showPlayer(startTime);
    } catch (error) {
      this.preparing = false;
      if (token !== this.preparationToken || !(this.current instanceof LoadingView)) return;
      const message = error instanceof Error ? error.message : 'Impossibile preparare la proiezione.';
      this.current.showError(
        `${message}\n\nSe sei offline, apri il film una volta con una connessione attiva per scaricare tutti i materiali.`
      );
      void loading;
    }
  }

  private showPlayer(startTime: number): void {
    const player = new PlayerView({
      startTime,
      audio: this.audio,
      onEnd: () => this.showEnd(),
      onHome: () => this.showLanding()
    });
    this.swap(player);
    void this.audio.resume();
    window.setTimeout(() => player.element.querySelector<HTMLButtonElement>('[data-action="play"]')?.focus(), 300);
  }

  private showEnd(): void {
    const end = new EndView({
      onReplay: () => {
        saveProgress(0);
        void this.startExperience(0);
      },
      onHome: () => this.showLanding()
    });
    this.swap(end);
    window.setTimeout(() => end.element.querySelector<HTMLButtonElement>('[data-action="replay"]')?.focus(), 300);
  }

  private async install(): Promise<void> {
    if (this.deferredInstall) {
      const prompt = this.deferredInstall;
      this.deferredInstall = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.showToast('Installazione avviata.', false);
      }
      return;
    }
    this.showInstallHint();
  }

  private showInstallHint(): void {
    this.installHint?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'install-hint';
    overlay.innerHTML = `
      <div class="install-card" role="dialog" aria-modal="true" aria-labelledby="install-title">
        <h3 id="install-title">Installa NEVE E FERRO</h3>
        <p>Puoi aggiungere il film alla schermata Home e guardarlo offline dopo il primo caricamento completo.</p>
        <p class="install-steps">
          <strong>iPhone / iPad:</strong> Condividi ${icon('arrow')} Aggiungi alla schermata Home.<br/>
          <strong>Android:</strong> Menu del browser ${icon('arrow')} Installa app.<br/>
          <strong>Desktop:</strong> icona di installazione nella barra degli indirizzi.
        </p>
        <button class="btn btn-primary" data-action="close-install">HO CAPITO</button>
      </div>
    `;
    overlay.querySelector('[data-action="close-install"]')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.remove();
    });
    document.body.append(overlay);
    this.installHint = overlay;
  }

  private showToast(message: string, withReload: boolean): void {
    document.querySelector('.app-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.innerHTML = `<span>${message}</span>`;
    document.body.append(toast);
    window.setTimeout(() => toast.classList.add('is-visible'), 20);
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 400);
    }, 4200);
    void withReload;
  }

  private showUpdateToast(): void {
    if (this.updateToast) return;
    const toast = document.createElement('div');
    toast.className = 'app-toast update-toast';
    toast.innerHTML = `<span>Una nuova versione del film è disponibile.</span><button class="text-link" data-action="reload">AGGIORNA</button>`;
    toast.querySelector('[data-action="reload"]')?.addEventListener('click', () => {
      const registration = this.getWaitingWorker();
      if (registration?.waiting) {
        this.reloadingForUpdate = true;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
    document.body.append(toast);
    window.setTimeout(() => toast.classList.add('is-visible'), 20);
    this.updateToast = toast;
  }

  private getWaitingWorker(): ServiceWorkerRegistration | null {
    // The registration is stored by the bootstrap; this is a defensive fallback.
    return (
      (window as unknown as { __NEVE_SW_REG__?: ServiceWorkerRegistration }).__NEVE_SW_REG__ ?? null
    );
  }
}


