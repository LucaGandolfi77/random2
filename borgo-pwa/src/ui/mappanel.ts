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
  private last: {
    state: GameState;
    player: { x: number; z: number };
    heading: number;
    lang: Language;
  } | null = null;

  constructor(private onClose: () => void) {
    byId<HTMLButtonElement>('map-close').addEventListener('click', () => this.close());
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(
    state: GameState,
    player: { x: number; z: number },
    heading: number,
    lang: Language
  ): void {
    this.open = true;
    this.root.hidden = false;
    this.last = { state, player, heading, lang };
    drawFullMap(this.canvas, state, player, heading, lang);
  }

  refresh(lang: Language): void {
    if (!this.open || !this.last) return;
    this.last.lang = lang;
    drawFullMap(this.canvas, this.last.state, this.last.player, this.last.heading, lang);
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
