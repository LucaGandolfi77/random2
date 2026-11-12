import type { SubtitleCue } from '../data/types';
import { FILM, sceneAtTime } from '../data/film';
import { subtitleText } from '../subtitles/it';

export class SubtitleView {
  readonly element: HTMLDivElement;
  private speaker: HTMLSpanElement;
  private text: HTMLSpanElement;
  private enabled = true;
  private currentId: string | null = null;
  private lastCue: SubtitleCue | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'subtitle-layer';
    this.element.setAttribute('aria-live', 'polite');
    this.element.setAttribute('aria-atomic', 'true');
    const card = document.createElement('div');
    card.className = 'subtitle-card';
    this.speaker = document.createElement('span');
    this.speaker.className = 'subtitle-speaker';
    this.text = document.createElement('span');
    this.text.className = 'subtitle-text';
    card.append(this.speaker, this.text);
    this.element.append(card);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.element.classList.toggle('is-hidden', !enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getCurrentCue(): SubtitleCue | null {
    return this.lastCue;
  }

  render(time: number): void {
    if (!this.enabled) {
      this.lastCue = null;
      this.currentId = null;
      this.element.classList.remove('is-visible', 'is-narration', 'is-dialogue');
      return;
    }
    const info = sceneAtTime(time);
    const cue = info.scene.subtitles.find((item) => info.localTime >= item.start && info.localTime <= item.end);
    if (!cue) {
      this.lastCue = null;
      this.currentId = null;
      this.element.classList.remove('is-visible');
      return;
    }
    if (cue.id !== this.currentId) {
      this.currentId = cue.id;
      this.lastCue = cue;
      this.speaker.textContent = cue.kind === 'narration' ? '' : cue.speaker;
      this.text.textContent = subtitleText(cue.id, cue.text);
      this.element.classList.toggle('is-narration', cue.kind === 'narration');
      this.element.classList.toggle('is-dialogue', cue.kind !== 'narration');
      this.element.classList.add('is-visible');
    }
  }
}

export function allSubtitlesFlat(): Array<SubtitleCue & { sceneIndex: number }> {
  return FILM.scenes.flatMap((scene, sceneIndex) =>
    scene.subtitles.map((cue) => ({ ...cue, sceneIndex }))
  );
}
