import captionsPayload from './captions.it.json';
import type { Caption } from '../data/types';
import type { SubtitleSize } from '../utils/storage';
import { captionsToSrt } from './srt';

interface CaptionsFile {
  language: string;
  title: string;
  duration: number;
  captions: Caption[];
}

const FILE = captionsPayload as unknown as CaptionsFile;

export class SubtitleManager {
  private readonly root: HTMLElement;
  private readonly speakerEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly captions: Caption[];
  private currentIndex = -1;
  private enabled = true;

  constructor(root: HTMLElement) {
    this.root = root;
    this.speakerEl = root.querySelector('.subtitles__speaker') as HTMLElement;
    this.textEl = root.querySelector('.subtitles__text') as HTMLElement;
    this.captions = FILE.captions;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.root.classList.remove('is-visible');
      this.root.classList.add('is-hidden');
      this.currentIndex = -1;
    } else {
      this.root.classList.remove('is-hidden');
    }
  }

  setSize(size: SubtitleSize): void {
    const value =
      size === 'small'
        ? 'clamp(0.9rem, 1.35vw, 1.2rem)'
        : size === 'large'
          ? 'clamp(1.25rem, 2.4vw, 2rem)'
          : 'clamp(1.05rem, 1.75vw, 1.55rem)';
    document.documentElement.style.setProperty('--subtitle-size', value);
  }

  setTime(time: number): void {
    if (!this.enabled) return;

    const index = this.findCaption(time);
    if (index === this.currentIndex) return;

    this.currentIndex = index;

    if (index < 0) {
      this.root.classList.remove('is-visible');
      this.speakerEl.textContent = '';
      this.textEl.textContent = '';
      return;
    }

    const caption = this.captions[index];
    this.speakerEl.textContent = caption.speaker;
    this.textEl.textContent = caption.text;
    this.root.classList.add('is-visible');
  }

  clear(): void {
    this.currentIndex = -1;
    this.root.classList.remove('is-visible');
  }

  get count(): number {
    return this.captions.length;
  }

  downloadSrt(): void {
    const srt = captionsToSrt(this.captions);
    const blob = new Blob([srt], { type: 'application/x-subrip;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'La-corona-e-la-testa.sottotitoli.it.srt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  private findCaption(time: number): number {
    let low = 0;
    let high = this.captions.length - 1;

    while (low <= high) {
      const middle = (low + high) >> 1;
      const caption = this.captions[middle];
      if (time < caption.start) {
        high = middle - 1;
      } else if (time >= caption.end) {
        low = middle + 1;
      } else {
        return middle;
      }
    }

    return -1;
  }
}
