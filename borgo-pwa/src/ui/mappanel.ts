import type { Language } from '../data/types';
import type { GameState } from '../game/state';
import { drawFullMap } from './map';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export class MapPanel {
  private root = byId<HTMLDivElement>('map-panel');
  private canvas = byId<HTMLCanvasElement>('map-canvas');
  private open = false;
  private detail = false;
  private last: {
    state: GameState;
    player: { x: number; z: number };
    heading: number;
    lang: Language;
    waypoint: { x: number; z: number } | null;
  } | null = null;

  constructor(private onClose: () => void) {
    byId<HTMLButtonElement>('map-close').addEventListener('click', () => this.close());
    byId<HTMLButtonElement>('map-zoom').addEventListener('click', () => this.toggleZoom());
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(
    state: GameState,
    player: { x: number; z: number },
    heading: number,
    lang: Language,
    waypoint: { x: number; z: number } | null
  ): void {
    this.open = true;
    this.detail = false;
    this.root.hidden = false;
    this.last = { state, player, heading, lang, waypoint };
    this.draw();
  }

  refresh(lang: Language, waypoint?: { x: number; z: number } | null): void {
    if (!this.open || !this.last) return;
    this.last.lang = lang;
    if (waypoint !== undefined) this.last.waypoint = waypoint;
    this.draw();
  }

  private toggleZoom(): void {
    this.detail = !this.detail;
    const button = byId<HTMLButtonElement>('map-zoom');
    button.setAttribute('aria-pressed', String(this.detail));
    if (this.last) this.draw();
  }

  private draw(): void {
    if (!this.last) return;
    byId<HTMLButtonElement>('map-zoom').setAttribute('aria-pressed', String(this.detail));
    drawFullMap(
      this.canvas,
      this.last.state,
      this.last.player,
      this.last.heading,
      this.last.lang,
      this.last.waypoint,
      this.detail
    );
  }

  hide(): void {
    this.open = false;
    this.root.hidden = true;
  }

  close(): void {
    if (!this.open) return;
    this.hide();
    this.onClose();
  }
}
