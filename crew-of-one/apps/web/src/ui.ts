import type { VaultDef } from '@crew-of-one/sim';
import {
  formatTime,
  type VaultProgress,
  isVaultUnlocked,
  type Rank,
  type SaveData,
} from './progress';

export type DailySummary = {
  date: string;
  vaultName: string;
  modifierName: string;
  modifierDescription: string;
  completed: boolean;
  bestTimeMs: number;
  bestRank: string;
};

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
  onStartDaily: () => void;
  onReplay: () => void;
  onNext: () => void;
  onMenu: () => void;
  onToggleMenu: () => void;
  onTogglePreview: () => void;
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
  private readonly dailySlot: HTMLElement;
  private readonly result: HTMLElement;
  private readonly resultRank: HTMLElement;
  private readonly resultName: HTMLElement;
  private readonly resultStats: HTMLElement;
  private readonly resultNote: HTMLElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly hint: HTMLElement;
  private readonly topbar: HTMLElement;
  private readonly menuButton: HTMLButtonElement;
  private readonly previewButton: HTMLButtonElement;
  private previewAvailable = false;
  private previewActive = false;
  private hintTimer: number | null = null;
  private menuOpen = false;

  constructor(callbacks: Callbacks) {
    this.callbacks = callbacks;

    const layer = el('div', 'ui-layer');
    document.body.appendChild(layer);

    this.topbar = el('div', 'ui-topbar');
    layer.appendChild(this.topbar);

    this.menuButton = el('button', 'ui-chip-button', 'MENU');
    this.menuButton.type = 'button';
    this.menuButton.setAttribute('aria-label', 'Open the heist menu');
    this.menuButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.callbacks.onToggleMenu();
    });
    this.topbar.appendChild(this.menuButton);

    this.previewButton = el('button', 'ui-chip-button ui-chip-button--preview', '▶ CREW');
    this.previewButton.type = 'button';
    this.previewButton.hidden = true;
    this.previewButton.setAttribute('aria-label', 'Preview the recorded crew');
    this.previewButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.callbacks.onTogglePreview();
    });
    this.topbar.appendChild(this.previewButton);

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

    this.dailySlot = el('div', 'daily-slot');
    menuInner.appendChild(this.dailySlot);

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

    this.resultNote = el('div', 'result-note');
    this.resultNote.hidden = true;
    resultCard.appendChild(this.resultNote);

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
    if (!visible) this.previewButton.hidden = true;
  }

  setPreviewState(available: boolean, active: boolean): void {
    if (available === this.previewAvailable && active === this.previewActive) return;
    this.previewAvailable = available;
    this.previewActive = active;
    this.previewButton.hidden = !available && !active;
    this.previewButton.textContent = active ? '■ STOP' : '▶ CREW';
    this.previewButton.classList.toggle('ui-chip-button--active', active);
  }

  showMenu(vaults: VaultDef[], progress: SaveData, daily?: DailySummary): void {
    this.menuOpen = true;
    this.menu.hidden = false;
    this.result.hidden = true;
    this.menuButton.hidden = true;
    this.previewButton.hidden = true;
    this.renderDaily(daily);
    this.renderGrid(vaults, progress);
  }

  hideMenu(): void {
    this.menuOpen = false;
    this.menu.hidden = true;
    this.menuButton.hidden = false;
    this.previewButton.hidden = !this.previewAvailable && !this.previewActive;
  }

  isMenuOpen(): boolean {
    return this.menuOpen;
  }

  showResult(payload: ResultPayload, rankClass: string): void {
    this.result.hidden = false;
    this.menuButton.hidden = true;
    this.previewButton.hidden = true;
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
    this.setResultNote('');
  }

  setResultNote(text: string): void {
    this.resultNote.textContent = text;
    this.resultNote.hidden = text.length === 0;
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

  private renderDaily(daily?: DailySummary): void {
    if (!daily) {
      this.dailySlot.replaceChildren();
      return;
    }

    const card = el('button', 'daily-card');
    card.type = 'button';
    card.setAttribute(
      'aria-label',
      `${daily.vaultName} daily heist, modifier ${daily.modifierName}`,
    );

    const kicker = el('span', 'daily-card__kicker');
    kicker.appendChild(el('span', 'daily-card__label', 'DAILY HEIST'));
    kicker.appendChild(el('span', 'daily-card__date', daily.date));

    const name = el('span', 'daily-card__name', daily.vaultName);
    const modifier = el('span', 'daily-card__modifier');
    modifier.appendChild(el('strong', 'daily-card__modifier-name', daily.modifierName.toUpperCase()));
    modifier.appendChild(el('span', 'daily-card__modifier-text', daily.modifierDescription));

    const best = el('span', 'daily-card__best');
    if (daily.completed) {
      best.appendChild(el('span', `rank rank--${daily.bestRank}`, daily.bestRank));
      best.appendChild(el('span', 'daily-card__time', formatTime(daily.bestTimeMs)));
    } else {
      best.appendChild(el('span', 'daily-card__new', 'UNPLAYED'));
    }

    card.append(kicker, name, modifier, best);
    card.addEventListener('click', () => this.callbacks.onStartDaily());
    this.dailySlot.replaceChildren(card);
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
