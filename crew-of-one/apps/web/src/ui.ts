import type { VaultDef } from '@crew-of-one/sim';
import type { LeaderboardEntry } from '@crew-of-one/shared';
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

export type LeaderboardView = {
  date: string;
  playerId: string;
  nickname: string;
  entries: LeaderboardEntry[];
  playerRank: number | null;
  status: 'loading' | 'ready' | 'offline';
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
  onToggleSound: () => void;
  onOpenLeaderboard: () => void;
  onRefreshLeaderboard: () => void;
  onCloseLeaderboard: () => void;
  onSaveNickname: (nickname: string) => void;
  onInstall: () => void;
  onShare: () => void;
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
  private readonly leaderboard: HTMLElement;
  private readonly leaderboardDate: HTMLElement;
  private readonly leaderboardNote: HTMLElement;
  private readonly leaderboardList: HTMLElement;
  private readonly nicknameInput: HTMLInputElement;
  private readonly topbar: HTMLElement;
  private readonly menuButton: HTMLButtonElement;
  private readonly previewButton: HTMLButtonElement;
  private readonly installButton: HTMLButtonElement;
  private readonly soundButton: HTMLButtonElement;
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

    this.soundButton = el('button', 'ui-chip-button ui-chip-button--sound', '♪ ON');
    this.soundButton.type = 'button';
    this.soundButton.setAttribute('aria-label', 'Toggle sound');
    this.soundButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.callbacks.onToggleSound();
    });
    this.topbar.appendChild(this.soundButton);

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
    const footActions = el('div', 'menu-foot__actions');
    this.installButton = el('button', 'link-button link-button--install', 'INSTALL APP');
    this.installButton.type = 'button';
    this.installButton.hidden = true;
    this.installButton.addEventListener('click', () => this.callbacks.onInstall());
    const resetButton = el('button', 'link-button', 'RESET PROGRESS');
    resetButton.type = 'button';
    resetButton.addEventListener('click', () => {
      this.callbacks.onResetProgress();
    });
    footActions.append(this.installButton, resetButton);
    foot.appendChild(el('span', 'menu-foot__hint', 'Select a heist. Record a run. Rewind.'));
    foot.appendChild(footActions);
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
    const shareButton = el('button', 'action-button action-button--quiet', 'SHARE RUN');
    shareButton.type = 'button';
    shareButton.addEventListener('click', () => this.callbacks.onShare());
    const menuButton = el('button', 'action-button action-button--quiet', 'LEVEL SELECT');
    menuButton.type = 'button';
    menuButton.addEventListener('click', () => this.callbacks.onMenu());
    actions.append(this.nextButton, replayButton, shareButton, menuButton);
    resultCard.appendChild(actions);

    this.hint = el('div', 'hint-toast');
    this.hint.hidden = true;
    layer.appendChild(this.hint);

    this.leaderboard = el('div', 'screen screen--leaderboard');
    this.leaderboard.hidden = true;
    const boardInner = el('div', 'screen__inner leaderboard');
    this.leaderboard.appendChild(boardInner);
    layer.appendChild(this.leaderboard);

    const boardHead = el('div', 'leaderboard__head');
    const boardTitle = el('div', 'leaderboard__title');
    boardTitle.appendChild(el('span', 'leaderboard__kicker', 'DAILY LEADERBOARD'));
    this.leaderboardDate = el('span', 'leaderboard__date', '');
    boardTitle.appendChild(this.leaderboardDate);
    const closeButton = el('button', 'link-button leaderboard__close', 'CLOSE');
    closeButton.type = 'button';
    closeButton.addEventListener('click', () => this.callbacks.onCloseLeaderboard());
    boardHead.append(boardTitle, closeButton);
    boardInner.appendChild(boardHead);

    const nickRow = el('form', 'nickname-row');
    this.nicknameInput = el('input', 'nickname-input');
    this.nicknameInput.type = 'text';
    this.nicknameInput.maxLength = 16;
    this.nicknameInput.placeholder = 'YOUR CREW NAME';
    this.nicknameInput.setAttribute('autocomplete', 'nickname');
    const saveButton = el('button', 'action-button nickname-save', 'SAVE');
    saveButton.type = 'submit';
    nickRow.append(this.nicknameInput, saveButton);
    nickRow.addEventListener('submit', (event) => {
      event.preventDefault();
      const nickname = this.nicknameInput.value.trim();
      if (nickname.length > 0 && nickname.length < 3) {
        this.setLeaderboardNote('Nickname needs at least 3 characters.');
        return;
      }
      this.callbacks.onSaveNickname(nickname);
    });
    boardInner.appendChild(nickRow);

    this.leaderboardNote = el('div', 'leaderboard__note', '');
    boardInner.appendChild(this.leaderboardNote);

    this.leaderboardList = el('div', 'leaderboard__list');
    boardInner.appendChild(this.leaderboardList);

    const boardFoot = el('div', 'leaderboard__foot');
    const refreshButton = el('button', 'link-button', 'REFRESH');
    refreshButton.type = 'button';
    refreshButton.addEventListener('click', () => this.callbacks.onRefreshLeaderboard());
    boardFoot.appendChild(el('span', 'leaderboard__foot-note', 'VERIFIED TAPES ONLY'));
    boardFoot.appendChild(refreshButton);
    boardInner.appendChild(boardFoot);
  }

  setMenuButtonVisible(visible: boolean): void {
    this.menuButton.hidden = !visible;
    this.soundButton.hidden = !visible;
    if (!visible) this.previewButton.hidden = true;
  }

  setSoundMuted(muted: boolean): void {
    this.soundButton.textContent = muted ? '♪ OFF' : '♪ ON';
    this.soundButton.classList.toggle('ui-chip-button--active', !muted);
  }

  setInstallAvailable(mode: 'native' | 'ios' | 'none'): void {
    this.installButton.hidden = mode === 'none';
    this.installButton.textContent = mode === 'ios' ? 'ADD TO HOME' : 'INSTALL APP';
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
    this.soundButton.hidden = true;
    this.renderDaily(daily);
    this.renderGrid(vaults, progress);
  }

  hideMenu(): void {
    this.menuOpen = false;
    this.menu.hidden = true;
    this.menuButton.hidden = false;
    this.soundButton.hidden = false;
    this.previewButton.hidden = !this.previewAvailable && !this.previewActive;
  }

  isMenuOpen(): boolean {
    return this.menuOpen;
  }

  showResult(payload: ResultPayload, rankClass: string): void {
    this.result.hidden = false;
    this.menuButton.hidden = true;
    this.previewButton.hidden = true;
    this.soundButton.hidden = true;
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

    const boardLink = el('button', 'link-button leaderboard-link', "TODAY'S LEADERBOARD");
    boardLink.type = 'button';
    boardLink.addEventListener('click', () => this.callbacks.onOpenLeaderboard());
    this.dailySlot.replaceChildren(card, boardLink);
  }

  showLeaderboard(view: LeaderboardView): void {
    this.leaderboard.hidden = false;
    this.leaderboardDate.textContent = view.date;
    if (document.activeElement !== this.nicknameInput) {
      this.nicknameInput.value = view.nickname;
    }

    if (view.status === 'loading') {
      this.setLeaderboardNote('Loading today’s crew…');
      this.leaderboardList.replaceChildren(el('div', 'leaderboard__empty', 'LOADING…'));
      return;
    }

    if (view.status === 'offline') {
      this.setLeaderboardNote('Offline · your best is saved on this device.');
      this.leaderboardList.replaceChildren(
        el('div', 'leaderboard__empty', 'LEADERBOARD UNAVAILABLE'),
      );
      return;
    }

    this.setLeaderboardNote(
      view.playerRank !== null
        ? `Your rank: #${view.playerRank}`
        : 'Finish the daily to claim a rank.',
    );

    if (view.entries.length === 0) {
      this.leaderboardList.replaceChildren(
        el('div', 'leaderboard__empty', 'NO VERIFIED RUNS YET — BE THE FIRST'),
      );
      return;
    }

    this.leaderboardList.replaceChildren(
      ...view.entries.map((entry) => {
        const row = el(
          'div',
          `leaderboard__row${entry.playerId === view.playerId ? ' leaderboard__row--you' : ''}`,
        );
        row.appendChild(el('span', 'leaderboard__rank', `#${entry.rank}`));
        row.appendChild(el('span', 'leaderboard__name', entry.nickname));
        row.appendChild(el('span', 'leaderboard__echoes', `${entry.echoes}E`));
        row.appendChild(el('span', 'leaderboard__time', formatTime(entry.timeMs)));
        return row;
      }),
    );
  }

  hideLeaderboard(): void {
    this.leaderboard.hidden = true;
  }

  setLeaderboardNote(text: string): void {
    this.leaderboardNote.textContent = text;
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
