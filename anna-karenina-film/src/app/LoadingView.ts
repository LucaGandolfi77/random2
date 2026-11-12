import type { LoadProgress } from '../engine/AssetLoader';
import { icon } from './icons';

export interface LoadingProps {
  onRetry: () => void;
  onBack: () => void;
}

export class LoadingView {
  readonly element: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly percent: HTMLSpanElement;
  private readonly status: HTMLSpanElement;
  private readonly error: HTMLDivElement;
  private readonly props: LoadingProps;

  constructor(props: LoadingProps) {
    this.props = props;
    this.element = document.createElement('div');
    this.element.className = 'screen loading-screen';
    this.element.innerHTML = `
      <div class="loading-grain"></div>
      <div class="loading-top">
        <span class="loading-mark">NEVE E FERRO</span>
        <span class="loading-language">Italiano · 25 min</span>
      </div>
      <div class="loading-center">
        <p class="loading-eyebrow">Preparazione della proiezione</p>
        <blockquote class="loading-quote">“La neve copre i binari.<br/>Non il rumore.”</blockquote>
        <div class="loading-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="loading-progress-track"><div class="loading-progress-fill"></div></div>
          <div class="loading-progress-meta">
            <span class="loading-status">Verifica della sceneggiatura</span>
            <span class="loading-percent">0%</span>
          </div>
        </div>
      </div>
      <div class="loading-bottom">
        <span>NEVE E FERRO · un film originale</span>
        <span>Audio originale · Web Audio</span>
      </div>
      <div class="loading-error" hidden>
        <p class="loading-error-text"></p>
        <div class="loading-error-actions">
          <button class="btn btn-primary" data-action="retry">RIPROVA ${icon('arrow')}</button>
          <button class="btn btn-ghost" data-action="back">TORNA AL TITOLO</button>
        </div>
      </div>
    `;
    this.bar = this.element.querySelector('.loading-progress-fill') as HTMLDivElement;
    this.percent = this.element.querySelector('.loading-percent') as HTMLSpanElement;
    this.status = this.element.querySelector('.loading-status') as HTMLSpanElement;
    this.error = this.element.querySelector('.loading-error') as HTMLDivElement;
    this.element.querySelector('[data-action="retry"]')?.addEventListener('click', () => {
      this.error.hidden = true;
      this.props.onRetry();
    });
    this.element.querySelector('[data-action="back"]')?.addEventListener('click', () => this.props.onBack());
  }

  update(progress: LoadProgress): void {
    const pct = Math.round(Math.max(0, Math.min(1, progress.value)) * 100);
    this.bar.style.width = `${pct}%`;
    this.percent.textContent = `${pct}%`;
    this.status.textContent = progress.label;
    const progressEl = this.element.querySelector('.loading-progress');
    progressEl?.setAttribute('aria-valuenow', String(pct));
  }

  showError(message: string): void {
    this.error.hidden = false;
    const text = this.element.querySelector('.loading-error-text');
    if (text) text.textContent = message;
  }


  destroy(): void {}
}
