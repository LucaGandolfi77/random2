import type { VaultDef } from '@crew-of-one/sim';
import {
  formatTime,
  type VaultProgress,
  isVaultUnlocked,
  type Rank,
  type SaveData,
} from './progress';

export type ResultPayload = {
  vault: VaultDef;
  index: number;
  timeMs: number;
  echoes: number;
  rank: Rank;
  isBest: boolean;
  best: VaultProgress;
  hasNext: boolean;
};

type Callbacks = {
  onStart: (index: number) => void;
  onReplay: () => void;
  onNext: () => void;
  onMenu: () => void;
  onToggleMenu: () => void;
  onResetProgress: () => void;
};

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export class MetaUI {
  private readonly callbacks: Callbacks;
  private readonly menu: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly result: HTMLElement;
  private readonly resultRank: HTMLElement;
  private readonly resultName: HTMLElement;
  private readonly resultStats: HTMLElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly hint: HTMLElement;
  private readonly menuButton: HTMLButtonElement;
  private hintTimer: number | null = null;
  private menuOpen = false;

  constructor(callbacks: Callbacks) {
    this.callbacks = callbacks;

    const layer = el('div', 'ui-layer');
    document.body.appendChild(layer);

    this.menuButton = el('button', 'ui-menu-button', 'MENU');
    this.menuButton.type = 'button';
    this.menuButton.setAttribute('aria-label', 'Open the heist menu');
    this.menuButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.callbacks.onToggleMenu();
    });
    layer.appendChild(this.menuButton);

    this.menu = el('div', 'screen screen--menu');
    this.menu.hidden = true;
    const menuInner = el('div', 'screen__inner');
    this.menu.appendChild(menuInner);
    layer.appendChild(this.menu);

    const brand = el('div', 'brand');
    brand.appendChild(el('span', 'brand__title', 'CREW OF ONE'));
    brand.appendChild(el('span', 'brand__tagline', 'The crew is you.'));
    menuInner.appendChild(brand);

    this.summary = el('div', 'menu-summary');
    menuInner.appendChild(this.summary);

    this.grid = el('div', 'vault-grid');
    menuInner.appendChild(this.grid);

    const foot = el('div', 'menu-foot');
    const resetButton = el('button', 'link-button', 'RESET PROGRESS');
    resetButton.type = 'button';
    resetButton.addEventListener('click', () => {
      this.callbacks.onResetProgress();
    });
    foot.appendChild(el('span', 'menu-foot__hint', 'Select a heist. Record a run. Rewind.'));
    foot.appendChild(resetButton);
    menuInner.appendChild(foot);

    this.result = el('div', 'screen screen--result');
    this.result.hidden = true;
    const resultCard = el('div', 'result-card');
    this.result.appendChild(resultCard);
    layer.appendChild(this.result);

    resultCard.appendChild(el('div', 'result-kicker', 'HEIST COMPLETE'));
    this.resultRank = el('div', 'result-rank');
    resultCard.appendChild(this.resultRank);
    this.resultName = el('div', 'result-name');
    resultCard.appendChild(this.resultName);
    this.resultStats = el('div', 'result-stats');
    resultCard.appendChild(this.resultStats);

    const actions = el('div', 'result-actions');
    this.nextButton = el('button', 'action-button action-button--gold', 'NEXT HEIST');
    this.nextButton.type = 'button';
    this.nextButton.addEventListener('click', () => this.callbacks.onNext());
    const replayButton = el('button', 'action-button', 'RUN AGAIN');
    replayButton.type = 'button';
    replayButton.addEventListener('click', () => this.callbacks.onReplay());
    const menuButton = el('button', 'action-button action-button--quiet', 'LEVEL SELECT');
    menuButton.type = 'button';
    menuButton.addEventListener('click', () => this.callbacks.onMenu());
    actions.append(this.nextButton, replayButton, menuButton);
    resultCard.appendChild(actions);

    this.hint = el('div', 'hint-toast');
    this.hint.hidden = true;
    layer.appendChild(this.hint);
  }

  setMenuButtonVisible(visible: boolean): void {
    this.menuButton.hidden = !visible;
  }

  showMenu(vaults: VaultDef[], progress: SaveData): void {
    this.menuOpen = true;
    this.menu.hidden = false;
    this.result.hidden = true;
    this.menuButton.hidden = true;
    this.renderGrid(vaults, progress);
  }

  hideMenu(): void {
    this.menuOpen = false;
    this.menu.hidden = true;
    this.menuButton.hidden = false;
  }

  isMenuOpen(): boolean {
    return this.menuOpen;
  }

  showResult(payload: ResultPayload, rankClass: string): void {
    this.result.hidden = false;
    this.menuButton.hidden = true;
    this.resultRank.textContent = payload.rank;
    this.resultRank.className = `result-rank result-rank--${rankClass}`;
    this.resultName.textContent = payload.vault.name;
    this.resultStats.replaceChildren(
      this.stat('TIME', formatTime(payload.timeMs)),
      this.stat('ECHOES', `${payload.echoes} / par ${payload.vault.parEchoes}`),
      this.stat(payload.isBest ? 'NEW BEST' : 'BEST', formatTime(payload.best.bestTimeMs)),
    );
    this.nextButton.disabled = !payload.hasNext;
    this.nextButton.textContent = payload.hasNext ? 'NEXT HEIST' : 'LAST HEIST';
  }

  hideResult(): void {
    this.result.hidden = true;
  }

  showHint(text: string): void {
    this.hint.textContent = text;
    this.hint.hidden = false;
    if (this.hintTimer !== null) window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => {
      this.hint.hidden = true;
      this.hintTimer = null;
    }, 6500);
  }

  private stat(label: string, value: string): HTMLElement {
    const node = el('div', 'stat');
    node.appendChild(el('span', 'stat__label', label));
    node.appendChild(el('strong', 'stat__value', value));
    return node;
  }

  private renderGrid(vaults: VaultDef[], progress: SaveData): void {
    const ids = vaults.map((vault) => vault.id);
    const completed = vaults.filter((vault) => progress.vaults[vault.id]?.completed).length;
    const samples = vaults
      .map((vault) => progress.vaults[vault.id])
      .filter((entry): entry is VaultProgress => Boolean(entry));
    const bestRanks = samples.map((entry) => entry.bestRank);
    const sRanks = bestRanks.filter((rank) => rank === 'S').length;
    this.summary.replaceChildren(
      el('span', 'menu-summary__stat', `${completed}/${vaults.length} HEISTS`),
      el('span', 'menu-summary__stat', `${sRanks} S-RANKS`),
      el('span', 'menu-summary__stat', `${ids.length} VAULTS`),
    );

    const cards = vaults.map((vault, index) => {
      const unlocked = isVaultUnlocked(index, ids, progress);
      const record = progress.vaults[vault.id];
      const button = el('button', `vault-card${unlocked ? '' : ' vault-card--locked'}`);
      button.type = 'button';
      button.disabled = !unlocked;
      button.setAttribute(
        'aria-label',
        unlocked
          ? `Start ${vault.name}, par ${vault.parEchoes} echoes`
          : `${vault.name} is locked`,
      );

      const number = el('span', 'vault-card__num', String(index + 1).padStart(2, '0'));
      const info = el('span', 'vault-card__info');
      info.appendChild(el('span', 'vault-card__name', vault.name));
      info.appendChild(
        el(
          'span',
          'vault-card__sub',
          unlocked
            ? `CHAPTER ${vault.chapter} · PAR ${vault.parEchoes} ECHO${vault.parEchoes === 1 ? '' : 'ES'}`
            : 'LOCKED · CLEAR THE PREVIOUS HEIST',
        ),
      );

      const best = el('span', 'vault-card__best');
      if (!unlocked) {
        best.appendChild(el('span', 'vault-card__lock', '🔒'));
      } else if (record?.completed) {
        best.appendChild(
          el('span', `rank rank--${record.bestRank}`, record.bestRank),
        );
        best.appendChild(el('span', 'vault-card__time', formatTime(record.bestTimeMs)));
      } else {
        best.appendChild(el('span', 'vault-card__new', 'NEW'));
      }

      button.append(number, info, best);
      button.addEventListener('click', () => {
        if (!unlocked) return;
        this.callbacks.onStart(index);
      });
      return button;
    });

    this.grid.replaceChildren(...cards);
  }
}
