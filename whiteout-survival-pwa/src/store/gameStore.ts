/**
 * The single Zustand store. It owns the saved game, UI-only state, the 1 Hz
 * simulation tick, the 320 ms battle tick and every player action. The game
 * object is replaced on each tick so React can subscribe cheaply to primitives.
 */

import { create } from 'zustand';
import { DECREES } from '../game/content';
import type {
  DecreeId,
  FacilityId,
  FurnaceMode,
  GameState,
  HeroId,
  OfflineReport,
  TabId,
  TechId,
  WorkerFacilityId,
} from '../game/types';
import {
  assignWorker as assignWorkerAction,
  buildFacility as buildFacilityAction,
  recruitHero as recruitHeroAction,
  researchTech as researchTechAction,
  setDecree as setDecreeAction,
  setFurnaceMode as setFurnaceModeAction,
  setSelectedStage as setSelectedStageAction,
  setSurvivorJob as setSurvivorJobAction,
  unassignWorker as unassignWorkerAction,
  upgradeFacility as upgradeFacilityAction,
  upgradeFurnace as upgradeFurnaceAction,
} from '../game/actions';
import { advanceGame, simulateOffline, type ActionResult } from '../game/engine';
import {
  awardBattle,
  retreatBattle as retreatBattleAction,
  startBattle,
  stepBattle,
  type AwardResult,
} from '../game/expedition';
import { createInitialState } from '../game/initialState';
import {
  clearSave,
  loadGame,
  loadSettings,
  sanitizeGame,
  saveGame,
  saveSettings,
  serializeGame,
  type GameSettings,
} from '../game/save';
import type { BattleState } from '../game/types';

export type ToastKind = 'info' | 'success' | 'warn' | 'danger';

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

type BattleSpeed = 1 | 2;

interface BootState {
  game: GameState;
  offlineReport: OfflineReport | null;
  toast: Toast | null;
}

let toastSequence = 1;
let ticksSinceSave = 0;

function boot(): BootState {
  const now = Date.now();
  const loaded = loadGame(now);
  let game: GameState;
  let corrupted = loaded.corrupted;
  let offlineReport: OfflineReport | null = null;

  if (loaded.game) {
    game = loaded.game;
    if (now - game.lastSeen > 5_000) {
      offlineReport = simulateOffline(game, now);
      if (offlineReport.seconds < 15) offlineReport = null;
    } else {
      game.lastSeen = now;
    }
  } else {
    game = createInitialState(now);
  }

  const toast: Toast | null = offlineReport
    ? null
    : corrupted
      ? {
          id: toastSequence++,
          text: 'The old save could not be read. A new fire has been lit.',
          kind: 'warn',
        }
      : null;

  if (offlineReport && offlineReport.seconds < 15) offlineReport = null;
  saveGame(game);

  return { game, offlineReport, toast };
}

const booted = boot();

interface GameStore {
  game: GameState;
  settings: GameSettings;
  tab: TabId;
  selectedFacility: FacilityId | null;
  settingsOpen: boolean;
  offlineReport: OfflineReport | null;
  offlineOpen: boolean;
  onboardingOpen: boolean;
  toasts: Toast[];
  battle: BattleState | null;
  battleSpeed: BattleSpeed;
  lastAward: AwardResult | null;

  tick(seconds?: number): void;
  catchUp(now?: number): void;
  saveNow(): void;
  setTab(tab: TabId): void;
  openFacility(facility: FacilityId): void;
  closeFacility(): void;
  openSettings(): void;
  closeSettings(): void;
  openOnboarding(): void;
  dismissOnboarding(): void;
  dismissOfflineReport(): void;
  dismissToast(id: number): void;
  setSound(enabled: boolean): void;

  upgradeFurnace(): void;
  buildFacility(facility: Exclude<FacilityId, 'furnace'>): void;
  upgradeFacility(facility: Exclude<FacilityId, 'furnace'>): void;
  setFurnaceMode(mode: FurnaceMode): void;
  assignWorker(facility: WorkerFacilityId): void;
  unassignWorker(facility: WorkerFacilityId): void;
  setSurvivorJob(survivorId: string, job: WorkerFacilityId | null): void;
  setDecree(decree: DecreeId): void;
  researchTech(tech: TechId): void;
  recruitHero(heroId: HeroId): void;
  setSelectedStage(stage: number): void;

  startBattle(): void;
  tickBattle(): void;
  retreatBattle(): void;
  closeBattle(): void;
  toggleBattleSpeed(): void;

  resetGame(): void;
  exportText(): string;
  importText(text: string): void;
}

function cleanToastId(): number {
  return toastSequence++;
}

function asToast(text: string, kind: ToastKind = 'info'): Toast {
  return { id: cleanToastId(), text, kind };
}

function cloneGame(game: GameState): GameState {
  return { ...game };
}

function resultKind(result: ActionResult): ToastKind {
  return result.ok ? 'success' : 'warn';
}

export const useGameStore = create<GameStore>((set, get) => {
  const pushToast = (text: string, kind: ToastKind = 'info') => {
    if (!text) return;
    set((state) => ({
      toasts: [...state.toasts.slice(-3), asToast(text, kind)],
    }));
  };

  const commitGame = (game: GameState, extra?: Partial<GameStore>) => {
    saveGame(game);
    set({ game: cloneGame(game), ...extra });
  };

  const runAction = (
    action: (game: GameState) => ActionResult,
    after?: (game: GameState) => void,
  ) => {
    const game = get().game;
    const result = action(game);
    if (result.ok) {
      after?.(game);
      commitGame(game);
    }
    pushToast(result.message, resultKind(result));
  };

  return {
    game: booted.game,
    settings: loadSettings(),
    tab: 'city',
    selectedFacility: null,
    settingsOpen: false,
    offlineReport: booted.offlineReport,
    offlineOpen: Boolean(booted.offlineReport),
    onboardingOpen: !booted.game.tutorialDone && !booted.offlineReport,
    toasts: booted.toast ? [booted.toast] : [],
    battle: null,
    battleSpeed: 1,
    lastAward: null,

    tick(seconds = 1) {
      const game = get().game;
      if (game.survivors.length === 0) return;
      const result = advanceGame(game, seconds);
      ticksSinceSave += seconds;
      if (ticksSinceSave >= 5) {
        ticksSinceSave = 0;
        saveGame(game);
      }
      const interesting = result.events.slice(-3);
      const toasts = interesting.map((text) => {
        const lower = text.toLowerCase();
        const kind: ToastKind =
          lower.includes('sick') || lower.includes('hungry') || lower.includes('did not wake')
            ? 'danger'
            : lower.includes('blizzard') || lower.includes('wind')
              ? 'warn'
              : lower.includes('arrival') || lower.includes('asked to stay')
                ? 'success'
                : 'info';
        return asToast(text, kind);
      });
      set((state) => ({
        game: cloneGame(game),
        toasts: [...state.toasts, ...toasts].slice(-5),
      }));
    },

    catchUp(now = Date.now()) {
      const game = get().game;
      if (game.survivors.length === 0) return;
      const report = simulateOffline(game, now);
      if (report.creditedSeconds >= 15) {
        saveGame(game);
        set({
          game: cloneGame(game),
          offlineReport: report,
          offlineOpen: true,
          onboardingOpen: false,
        });
      } else {
        game.lastSeen = now;
        set({ game: cloneGame(game) });
      }
    },

    saveNow() {
      const game = get().game;
      saveGame(game);
      set({ game: cloneGame(game) });
    },

    setTab(tab) {
      set({ tab });
    },

    openFacility(facility) {
      set({ selectedFacility: facility });
    },

    closeFacility() {
      set({ selectedFacility: null });
    },

    openSettings() {
      set({ settingsOpen: true });
    },

    closeSettings() {
      set({ settingsOpen: false });
    },

    openOnboarding() {
      set({ onboardingOpen: true, settingsOpen: false });
    },

    dismissOnboarding() {
      const game = get().game;
      game.tutorialDone = true;
      commitGame(game, { onboardingOpen: false });
    },

    dismissOfflineReport() {
      const game = get().game;
      set({
        offlineOpen: false,
        offlineReport: null,
        onboardingOpen: !game.tutorialDone,
      });
    },

    dismissToast(id) {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    },

    setSound(enabled) {
      const settings = { ...get().settings, sound: enabled };
      saveSettings(settings);
      set({ settings });
    },

    upgradeFurnace() {
      runAction(upgradeFurnaceAction);
    },

    buildFacility(facility) {
      runAction((game) => buildFacilityAction(game, facility));
    },

    upgradeFacility(facility) {
      runAction((game) => upgradeFacilityAction(game, facility));
    },

    setFurnaceMode(mode) {
      runAction((game) => setFurnaceModeAction(game, mode));
    },

    assignWorker(facility) {
      runAction((game) => assignWorkerAction(game, facility));
    },

    unassignWorker(facility) {
      runAction((game) => unassignWorkerAction(game, facility));
    },

    setSurvivorJob(survivorId, job) {
      runAction((game) => setSurvivorJobAction(game, survivorId, job));
    },

    setDecree(decree) {
      if (!DECREES[decree]) return;
      runAction((game) => setDecreeAction(game, decree));
    },

    researchTech(tech) {
      runAction((game) => researchTechAction(game, tech));
    },

    recruitHero(heroId) {
      runAction((game) => recruitHeroAction(game, heroId));
    },

    setSelectedStage(stage) {
      runAction((game) => setSelectedStageAction(game, stage));
    },

    startBattle() {
      if (get().battle) {
        pushToast('An expedition is already in the field.', 'warn');
        return;
      }
      const game = get().game;
      const result = startBattle(game);
      if (!result.ok || !result.battle) {
        pushToast(result.message, 'warn');
        return;
      }
      game.expedition.runs += 1;
      saveGame(game);
      set({
        game: cloneGame(game),
        battle: result.battle,
        lastAward: null,
      });
      pushToast(result.message, 'success');
    },

    tickBattle() {
      const state = get();
      const battle = state.battle;
      if (!battle || battle.status !== 'fighting') return;
      const game = state.game;
      stepBattle(battle, 0.32 * state.battleSpeed);
      if (battle.status !== 'fighting' && !battle.awarded) {
        const award = awardBattle(game, battle);
        saveGame(game);
        set({
          game: cloneGame(game),
          battle: { ...battle },
          lastAward: award,
        });
        if (award.win) {
          pushToast(award.message, 'success');
          for (const line of award.levelsGained.slice(0, 2)) {
            pushToast(line, 'success');
          }
        } else {
          pushToast(award.message, 'danger');
        }
      } else {
        set({ battle: { ...battle } });
      }
    },

    retreatBattle() {
      const state = get();
      const battle = state.battle;
      if (!battle || battle.status !== 'fighting') return;
      retreatBattleAction(state.game, battle);
      saveGame(state.game);
      set({
        game: cloneGame(state.game),
        battle: { ...battle },
        lastAward: {
          awarded: true,
          win: false,
          message: 'The expedition withdrew before the cold could finish it.',
          levelsGained: [],
        },
      });
      pushToast('Retreat called. No supplies were recovered.', 'warn');
    },

    closeBattle() {
      set({ battle: null, lastAward: null });
    },

    toggleBattleSpeed() {
      set((state) => ({ battleSpeed: state.battleSpeed === 1 ? 2 : 1 }));
    },

    resetGame() {
      clearSave();
      const game = createInitialState(Date.now());
      saveGame(game);
      set({
        game,
        battle: null,
        lastAward: null,
        selectedFacility: null,
        settingsOpen: false,
        offlineReport: null,
        offlineOpen: false,
        onboardingOpen: true,
        tab: 'city',
        toasts: [asToast('A new fire is lit. The old settlement is only a memory.', 'info')],
      });
    },

    exportText() {
      return serializeGame(get().game);
    },

    importText(text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        const sanitized = sanitizeGame(parsed, Date.now());
        if (!sanitized) {
          pushToast('That file is not a valid settlement save.', 'danger');
          return;
        }
        saveGame(sanitized);
        set({
          game: sanitized,
          battle: null,
          lastAward: null,
          selectedFacility: null,
          offlineReport: null,
          offlineOpen: false,
          onboardingOpen: !sanitized.tutorialDone,
          tab: 'city',
        });
        pushToast('Settlement restored from backup.', 'success');
      } catch {
        pushToast('Could not read that save file.', 'danger');
      }
    },
  };
});

export function useGame<T>(selector: (game: GameState) => T): T {
  return useGameStore((state) => selector(state.game));
}
