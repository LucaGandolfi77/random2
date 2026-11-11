export interface EndCardCallbacks {
  onReplay: () => void;
  onMenu: () => void;
}

export class EndCard {
  private readonly root: HTMLElement;

  constructor(callbacks: EndCardCallbacks) {
    this.root = document.querySelector('#end-card') as HTMLElement;
    const replay = this.root.querySelector('#btn-replay') as HTMLButtonElement;
    const menu = this.root.querySelector('#btn-end-menu') as HTMLButtonElement;
    replay.addEventListener('click', () => callbacks.onReplay());
    menu.addEventListener('click', () => callbacks.onMenu());
  }

  show(): void {
    this.root.hidden = false;
    (this.root.querySelector('#btn-replay') as HTMLButtonElement | null)?.focus({ preventScroll: true });
  }

  hide(): void {
    this.root.hidden = true;
  }

  get isVisible(): boolean {
    return !this.root.hidden;
  }
}
