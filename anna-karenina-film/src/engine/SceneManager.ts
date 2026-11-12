import { FILM, sceneAtTime } from '../data/film';
import { CinematicScene } from '../scenes/CinematicScene';

export class SceneManager {
  private readonly stage: HTMLElement;
  private currentIndex = -1;
  private currentView: CinematicScene | null = null;

  constructor(stage: HTMLElement) {
    this.stage = stage;
  }

  render(time: number): void {
    const info = sceneAtTime(time);
    if (info.index !== this.currentIndex) {
      this.currentView?.dispose();
      this.currentView = new CinematicScene(info.scene);
      this.stage.replaceChildren(this.currentView.root);
      this.currentIndex = info.index;
    }
    this.currentView?.render(info.localTime);
  }

  getCurrentSceneIndex(): number {
    return this.currentIndex;
  }

  destroy(): void {
    this.currentView?.dispose();
    this.currentView = null;
    this.currentIndex = -1;
  }
}

export function sceneTitleAt(time: number): { index: number; title: string } {
  const info = sceneAtTime(time);
  return { index: info.index, title: FILM.scenes[info.index]?.title ?? '' };
}
