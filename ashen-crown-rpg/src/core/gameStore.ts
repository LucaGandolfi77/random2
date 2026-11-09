import { create } from 'zustand';
import type {
  CharacterRecord,
  CombatAction,
  CombatState,
  DialogueChoice,
  DialogueEffect,
  GameSettings,
  GameState,
  ItemStack,
  MapDefinition,
  ModalKind,
  SaveMeta,
  Screen,
  SkillCheckResult
} from '@/core/types';
import { maps, mapById } from '@/data/maps';
import { dialogueById, companionTalkIds } from '@/data/dialogues';
import { encounterById } from '@/data/encounters';
import { companionById } from '@/data/companions';
import { itemById, starterInventory } from '@/data/items';
import { merchantById } from '@/data/merchants';
import { introSlides, endingById } from '@/data/campaign';
import { subclassById } from '@/data/subclasses';
import {
  createCompanion,
  createPlayer,
  effectiveAttributes,
  maxHp,
  maxResource,
  proficiencyBonus,
  type CreationDraft
} from '@/systems/character';
import { performCheck } from '@/systems/checks';
import {
  addItem,
  addXpToGame,
  completeQuest,
  equipItemInGame,
  failQuest,
  inventoryCount,
  leaveCompanion,
  playerGold,
  recruitInGame,
  refreshDerivedFlags,
  removeItem,
  restParty,
  setGold,
  setQuestStage,
  startQuest,
  togglePartyMember,
  unequipItemInGame,
  useItemInGame
} from '@/systems/gameState';
import {
  basicAttack,
  combatVictoryRewards,
  createCombat,
  currentUnit,
  dashCurrentUnit,
  disengageCurrentUnit,
  endTurn,
  helpCurrentUnit,
  isStunned,
  moveCurrentUnit,
  selectAbility,
  selectCombatAction as selectCombatActionEngine,
  shoveCurrentUnit,
  takeEnemyTurn,
  useAbility,
  useCombatConsumable
} from '@/systems/combat';
import { saveGame, loadGame, listSaves, deleteSave } from '@/systems/save';
import { clamp } from '@/core/rng';

// ── Small helpers ─────────────────────────────────────────────────────────────

export type ToastKind = 'info' | 'success' | 'warning' | 'danger' | 'quest';
export interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

export interface DialogueRuntime {
  id: string;
  nodeId: string;
  checkResult?: SkillCheckResult | null;
}

export interface ShopRuntime {
  merchantId: string;
  name: string;
  stock: { itemId: string; quantity: number }[];
}

export interface CombatResult {
  victory: boolean;
  encounterId: string;
  encounterName: string;
  xp: number;
  gold: number;
  items: string[];
  notes: string[];
  levelUps: string[];
  victoryText?: string;
}

interface EffectOutcome {
  stop?: 'combat' | 'ending' | 'travel' | 'shop';
}

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.55,
  sfxVolume: 0.7,
  muted: false,
  textScale: 1,
  reducedMotion: false,
  lowEffects: false,
  showRolls: true
};

const SETTINGS_KEY = 'ashen-crown-settings';

const loadStoredSettings = (): GameSettings => {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GameSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const persistSettings = (settings: GameSettings) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings persistence is a convenience; the game remains playable without it.
  }
};

const hiddenSkillFor = (stat: string): string => {
  switch (stat) {
    case 'int':
      return 'Investigation';
    case 'wis':
      return 'Perception';
    case 'dex':
      return 'Sleight of Hand';
    case 'str':
      return 'Athletics';
    case 'cha':
      return 'Persuasion';
    default:
      return 'Perception';
  }
};

const mainMapFlagToId: Record<string, string> = {
  discovered_greymoor: 'greymoor',
  discovered_woods: 'whispering_woods',
  discovered_temple: 'sunken_temple',
  discovered_citadel: 'ashen_citadel'
};

let toastCounter = 1;
let combatTimer: ReturnType<typeof setTimeout> | null = null;
let combatToken = 0;

const emitSfx = (name: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ashen-sfx', { detail: name }));
  }
};

const emitMusic = (track: string | null) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ashen-music', { detail: track }));
  }
};

export const mapForGame = (game: GameState): MapDefinition =>
  mapById[game.world.locationId] ?? maps[0];

export const isChoiceAvailable = (game: GameState, choice: DialogueChoice): boolean => {
  if (choice.requiresFlag && !game.world.flags[choice.requiresFlag]) return false;
  if (choice.forbidsFlag && game.world.flags[choice.forbidsFlag]) return false;
  if (choice.requiresClass && game.characters[game.playerId]?.classId !== choice.requiresClass) return false;
  if (choice.requiresAncestry && game.characters[game.playerId]?.ancestry !== choice.requiresAncestry) return false;
  if (choice.requiresCompanion && !game.party.includes(choice.requiresCompanion)) return false;
  if (choice.requiresItem && inventoryCount(game.inventory, choice.requiresItem) <= 0) return false;
  return true;
};

export const isInteractableVisible = (game: GameState, def: MapDefinition['interactables'][number]): boolean => {
  if (def.requiresFlag && !game.world.flags[def.requiresFlag]) return false;
  if (def.once && game.world.opened.includes(def.id)) return false;
  if (def.encounterId && game.world.defeated.includes(def.encounterId)) return false;
  if (def.encounterId && game.world.flags[`${def.encounterId}_defeated`]) return false;
  if (def.id === 'citadel_veyra' && game.world.flags.crownbound_defeated) return false;
  if (def.id === 'hollow_merchant' && game.quests.q_hollow_merchant?.status === 'completed') return false;
  const solvedInteractables: Record<string, string> = {
    temple_seal_1: 'seal_tides',
    temple_seal_2: 'seal_memory',
    temple_seal_3: 'seal_grief',
    woods_temple_gate: 'temple_unlocked',
    woods_rune_root: 'rune_root',
    woods_rune_moth: 'rune_moth',
    woods_rune_crown: 'rune_crown'
  };
  if (solvedInteractables[def.id] && game.world.flags[solvedInteractables[def.id]]) return false;
  const recruitFlags: Record<string, string> = {
    kaelen_bastion: 'recruited_kaelen',
    inn_nyx: 'recruited_nyx',
    woods_sable: 'recruited_sable',
    ruins_ilyra: 'recruited_ilyra',
    chapel_oren: 'recruited_oren'
  };
  if (recruitFlags[def.id] && game.world.flags[recruitFlags[def.id]]) return false;
  if (def.hidden && !game.world.flags[`found_${def.id}`] && !game.world.opened.includes(def.id)) return false;
  return true;
};

export const isHiddenGlimmer = (
  game: GameState,
  def: MapDefinition['interactables'][number],
  x: number,
  y: number
): boolean => {
  if (!def.hidden) return false;
  if (game.world.flags[`found_${def.id}`] || game.world.opened.includes(def.id)) return false;
  if (def.requiresFlag && !game.world.flags[def.requiresFlag]) return false;
  return Math.max(Math.abs(def.x - x), Math.abs(def.y - y)) <= 4;
};

const bestPartyCheck = (
  game: GameState,
  stat: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',
  dc: number,
  proficiency: string
): { result: SkillCheckResult; character: CharacterRecord } => {
  const candidates = game.party
    .map((id) => game.characters[id])
    .filter((c): c is CharacterRecord => Boolean(c?.recruited));
  const pool = candidates.length ? candidates : [game.characters[game.playerId]].filter(Boolean);
  const best = pool
    .slice()
    .sort((a, b) => {
      const score = (c: CharacterRecord) =>
        Math.floor((effectiveAttributes(c)[stat] - 10) / 2) + proficiencyBonus(c, proficiency);
      return score(b) - score(a);
    })[0] as CharacterRecord;
  return { result: performCheck(best, stat, dc, proficiency), character: best };
};

// ── Store ─────────────────────────────────────────────────────────────────────

export interface GameStore {
  screen: Screen;
  game: GameState | null;
  introSlide: number;
  modal: ModalKind;
  selectedCharacterId: string | null;
  shop: ShopRuntime | null;
  dialogue: DialogueRuntime | null;
  combat: CombatState | null;
  combatResult: CombatResult | null;
  victoryHandled: boolean;
  defeatHandled: boolean;
  pendingAfterCombatDialogue: string | null;
  toasts: ToastMessage[];
  saves: SaveMeta[];
  savesLoading: boolean;
  settings: GameSettings;
  checkResult: SkillCheckResult | null;
  levelUpNotes: string[];

  notify: (text: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
  setScreen: (screen: Screen) => void;
  newGame: (draft: CreationDraft) => void;
  advanceIntro: () => void;
  skipIntro: () => void;
  openModal: (modal: ModalKind, characterId?: string | null) => void;
  closeModal: () => void;
  setSelectedCharacter: (id: string) => void;
  updateSettings: (partial: Partial<GameSettings>) => void;
  travelTo: (mapId: string, x?: number, y?: number) => void;
  setPlayerPosition: (x: number, y: number) => void;
  interact: (interactableId: string) => void;
  searchArea: () => void;
  openDialogue: (dialogueId: string) => void;
  chooseDialogueChoice: (choiceId: string) => void;
  advanceDialogue: () => void;
  closeDialogue: () => void;
  talkToCompanion: (companionId: string) => void;
  startCombat: (encounterId: string) => void;
  selectCombatAbility: (abilityId: string | null) => void;
  selectCombatAction: (action: CombatAction | null) => void;
  combatAction: (action: 'dash' | 'disengage' | 'shove' | 'help', x?: number, y?: number) => void;
  combatMove: (x: number, y: number) => void;
  combatAttack: (x: number, y: number) => void;
  combatUseAbility: (abilityId: string, x: number, y: number) => void;
  combatConsumeItem: (itemId: string) => void;
  combatEndTurn: () => void;
  chooseSubclass: (characterId: string, subclassId: string) => void;
  closeCombat: () => void;
  retryFromAutosave: () => Promise<void>;
  useItem: (characterId: string, itemId: string) => void;
  equipItem: (characterId: string, itemId: string) => void;
  unequipItem: (characterId: string, slot: 'weapon' | 'offhand' | 'armor' | 'helmet' | 'accessory') => void;
  toggleParty: (companionId: string) => void;
  openShop: (merchantId: string) => void;
  closeShop: () => void;
  buyItem: (itemId: string) => void;
  sellItem: (itemId: string, quantity?: number) => void;
  rest: () => void;
  saveToSlot: (slot: string) => Promise<void>;
  loadFromSlot: (slot: string) => Promise<void>;
  deleteSlot: (slot: string) => Promise<void>;
  refreshSaves: () => Promise<void>;
  autosave: () => void;
  goToMenu: () => void;
  setEnding: (endingId: string) => void;
  dismissCheck: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  const notify = (text: string, kind: ToastKind = 'info') => {
    const id = toastCounter++;
    set((state) => ({ toasts: [...state.toasts, { id, text, kind }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5200);
  };

  const REWARD_EFFECTS = new Set<DialogueEffect['type']>(['gold', 'xp', 'item']);

  const noteSubclassOpportunity = (game: GameState): GameState => {
    const player = game.characters[game.playerId];
    if (!player || player.level < 3 || player.subclass) return game;
    if (game.world.flags.subclass_notice_shown) return game;
    notify('A specialization is waiting in your character sheet.', 'quest');
    return {
      ...game,
      world: {
        ...game.world,
        flags: { ...game.world.flags, subclass_notice_shown: true }
      }
    };
  };

  const applyEffects = (effects: DialogueEffect[] | undefined, contextKey?: string): EffectOutcome => {
    const outcome: EffectOutcome = {};
    const currentGame = get().game;
    if (!currentGame || !effects?.length) return outcome;
    let game: GameState = currentGame;
    const notes: string[] = [];
    const levelUps: string[] = [];
    let stopCombat: string | null = null;
    let stopEnding: string | null = null;
    let stopTravel: string | null = null;
    let stopShop: string | null = null;
    const rewardLockKey = contextKey ? `_rewarded_${contextKey}` : null;
    const rewardsAlreadyGiven = rewardLockKey ? Boolean(game.world.flags[rewardLockKey]) : false;
    let gaveReward = false;

    for (const effect of effects) {
      const id = effect.id ?? '';
      const amount = effect.amount ?? 0;
      switch (effect.type) {
        case 'flag': {
          const value = effect.value ?? true;
          game = {
            ...game,
            world: { ...game.world, flags: { ...game.world.flags, [id]: value } }
          };
          if (id.startsWith('discovered_')) {
            const mapId = mainMapFlagToId[id] ?? id.replace('discovered_', '');
            if (mapById[mapId] && !game.world.discovered.includes(mapId)) {
              game = { ...game, world: { ...game.world, discovered: [...game.world.discovered, mapId] } };
            }
          }
          break;
        }
        case 'approval': {
          const companion = game.characters[id];
          if (companion) {
            const approval = clamp(companion.approval + amount, -100, 100);
            game = { ...game, characters: { ...game.characters, [id]: { ...companion, approval } } };
            if (amount !== 0) {
              notify(`${companion.name} ${amount > 0 ? 'approves' : 'disapproves'}.`, amount > 0 ? 'success' : 'warning');
            }
          }
          break;
        }
        case 'quest': {
          if (!id) break;
          if (effect.value === 'complete') {
            const result = completeQuest(game, id);
            game = result.game;
            notes.push(...result.notes);
            levelUps.push(...result.levelUps);
          } else if (effect.value === 'fail') {
            game = failQuest(game, id);
          } else if (typeof effect.value === 'number') {
            game = setQuestStage(game, id, effect.value);
          } else {
            game = startQuest(game, id);
          }
          break;
        }
        case 'questStage':
          game = setQuestStage(game, id, amount);
          break;
        case 'questComplete': {
          const result = completeQuest(game, id);
          game = result.game;
          notes.push(...result.notes);
          levelUps.push(...result.levelUps);
          break;
        }
        case 'questFail':
          game = failQuest(game, id);
          break;
        case 'item':
          if (rewardsAlreadyGiven) break;
          gaveReward = true;
          game = { ...game, inventory: addItem(game.inventory, id, amount || 1) };
          notify(`Received ${itemById[id]?.name ?? id}${amount > 1 ? ` ×${amount}` : ''}.`, 'success');
          break;
        case 'gold': {
          if (rewardsAlreadyGiven) break;
          gaveReward = true;
          const nextGold = playerGold(game) + amount;
          game = setGold(game, nextGold);
          notify(`${amount >= 0 ? 'Received' : 'Spent'} ${Math.abs(amount)} gold.`, amount >= 0 ? 'success' : 'info');
          break;
        }
        case 'heal': {
          const player = game.characters[game.playerId];
          if (player) {
            const healed = clamp(player.hp + (amount || 10), 1, maxHp(player));
            game = { ...game, characters: { ...game.characters, [player.id]: { ...player, hp: healed } } };
          }
          break;
        }
        case 'damage': {
          const player = game.characters[game.playerId];
          if (player) {
            const hurt = clamp(player.hp - Math.max(1, amount), 1, maxHp(player));
            game = { ...game, characters: { ...game.characters, [player.id]: { ...player, hp: hurt } } };
            notify(`You take ${Math.max(1, amount)} damage.`, 'danger');
          }
          break;
        }
        case 'resource': {
          const player = game.characters[game.playerId];
          if (player) {
            const nextResource = clamp(player.resource + amount, 0, maxResource(player));
            game = { ...game, characters: { ...game.characters, [player.id]: { ...player, resource: nextResource } } };
          }
          break;
        }
        case 'xp': {
          if (rewardsAlreadyGiven) break;
          gaveReward = true;
          const result = addXpToGame(game, amount);
          game = result.game;
          levelUps.push(...result.levelUps);
          break;
        }
        case 'recruit': {
          if (companionById[id]) {
            const alreadyRecruited = Boolean(game.characters[id]?.recruited);
            const level = Math.max(1, game.characters[game.playerId]?.level ?? 1);
            const companion = createCompanion(id, level);
            game = recruitInGame(game, companion, id);
            if (!alreadyRecruited) notify(`${companion.name} joined your company.`, 'quest');
          }
          break;
        }
        case 'leave': {
          const companion = game.characters[id];
          game = leaveCompanion(game, id);
          if (companion) notify(`${companion.name} left your party.`, 'warning');
          break;
        }
        case 'startCombat':
          stopCombat = id;
          break;
        case 'ending':
          stopEnding = id;
          break;
        case 'travel':
          stopTravel = id;
          break;
        case 'shop':
          stopShop = id;
          break;
        case 'unlock':
          game = { ...game, world: { ...game.world, flags: { ...game.world.flags, [id]: true } } };
          break;
        case 'note':
          notify(String(effect.value ?? id ?? 'The story shifts.'), 'info');
          break;
        case 'rest':
          game = restParty(game);
          notify('The party rests. Health and resolve restored.', 'success');
          break;
        case 'discover': {
          const mapId = id || String(effect.value ?? '');
          if (mapById[mapId] && !game.world.discovered.includes(mapId)) {
            game = {
              ...game,
              world: { ...game.world, discovered: [...game.world.discovered, mapId] }
            };
          }
          break;
        }
        case 'end':
          break;
      }
    }

    if (notes.length) notes.forEach((note) => notify(note, 'quest'));
    if (levelUps.length) {
      set({ levelUpNotes: levelUps, modal: 'levelup' });
      levelUps.forEach((l) => notify(l, 'success'));
    }

    if (rewardLockKey && gaveReward && !rewardsAlreadyGiven) {
      game = {
        ...game,
        world: { ...game.world, flags: { ...game.world.flags, [rewardLockKey]: true } }
      };
    }

    game = noteSubclassOpportunity(refreshDerivedFlags({ ...game, updatedAt: Date.now() }));
    set({ game });

    if (stopCombat) {
      get().startCombat(stopCombat);
      return { ...outcome, stop: 'combat' };
    }
    if (stopEnding) {
      get().setEnding(stopEnding);
      return { ...outcome, stop: 'ending' };
    }
    if (stopTravel) {
      get().travelTo(stopTravel);
      return { ...outcome, stop: 'travel' };
    }
    if (stopShop) {
      set({ dialogue: null });
      get().openShop(stopShop);
      return { ...outcome, stop: 'shop' };
    }
    return outcome;
  };

  const enterNode = (dialogueId: string, nodeId: string) => {
    const def = dialogueById[dialogueId];
    const node = def?.nodes[nodeId];
    if (!def || !node) {
      set({ dialogue: null });
      return;
    }
    set({ dialogue: { id: dialogueId, nodeId } });
    if (node.effects?.length) {
      const outcome = applyEffects(node.effects, `${dialogueId}:${nodeId}:enter`);
      if (outcome.stop) return;
    }
    if (node.combat) {
      get().startCombat(node.combat);
    }
  };

  const scheduleEnemyTurn = () => {
    if (typeof window === 'undefined') return;
    const state = get();
    const combat = state.combat;
    if (!combat || state.screen !== 'game' || combat.phase !== 'active') return;
    const unit = currentUnit(combat);
    if (!unit || unit.side !== 'enemy') return;
    if (combatTimer) clearTimeout(combatTimer);
    const token = ++combatToken;
    if (!combat.waitingForAi) set({ combat: { ...combat, waitingForAi: true } });
    combatTimer = setTimeout(() => {
      const current = get();
      if (token !== combatToken || !current.combat || current.combat.phase !== 'active') return;
      const updated = takeEnemyTurn(current.combat);
      set({ combat: updated });
      afterCombatUpdate(updated);
    }, 720);
  };

  const resolveCombatVictory = (state: CombatState) => {
    const game = get().game;
    if (!game) return;
    const encounter = encounterById[state.encounterId];
    const reward = combatVictoryRewards(state);
    const notes: string[] = [];
    const levelUps: string[] = [];

    let next: GameState = structuredClone(game);
    for (const unit of state.units) {
      if (unit.side !== 'party' || !unit.charId) continue;
      const character = next.characters[unit.charId];
      if (!character) continue;
      const hp = unit.downed ? 0 : clamp(Math.round(unit.hp), 0, maxHp(character));
      next.characters[unit.charId] = {
        ...character,
        hp,
        resource: clamp(unit.resource, 0, maxResource(character)),
        alive: true
      };
    }

    next = setGold(next, playerGold(next) + reward.gold);
    notes.push(`Received ${reward.gold} gold.`);
    for (const itemId of reward.items) {
      next = { ...next, inventory: addItem(next.inventory, itemId, 1) };
      notes.push(`Received ${itemById[itemId]?.name ?? itemId}.`);
    }
    const xpResult = addXpToGame(next, reward.xp);
    next = xpResult.game;
    levelUps.push(...xpResult.levelUps);
    notes.push(`The party gained ${reward.xp} experience.`);

    const flags = { ...next.world.flags, [`${state.encounterId}_defeated`]: true };
    const defeated = next.world.defeated.includes(state.encounterId)
      ? next.world.defeated
      : [...next.world.defeated, state.encounterId];

    const complete = (questId: string) => {
      const result = completeQuest(next, questId);
      next = result.game;
      notes.push(...result.notes);
      levelUps.push(...result.levelUps);
    };

    switch (state.encounterId) {
      case 'enc_bastion_raiders':
        flags.bastion_raiders_defeated = true;
        break;
      case 'enc_ash_warden':
        flags.bastion_warden_defeated = true;
        flags.discovered_greymoor = true;
        next = setQuestStage(next, 'q_marked', Math.max(1, next.quests.q_marked?.stage ?? 0));
        next = startQuest(next, 'q_ash_over_greymoor');
        break;
      case 'enc_choir_cell':
        flags.choir_dealt = true;
        next = setQuestStage(next, 'q_ash_over_greymoor', 2);
        break;
      case 'enc_woods_hounds':
        flags.woods_hounds_defeated = true;
        break;
      case 'enc_antlered_silence':
        flags.antlered_silence_defeated = true;
        next = setQuestStage(next, 'q_roots_remember', 2);
        break;
      case 'enc_thorned_shade':
        flags.thorned_shade_defeated = true;
        next = setQuestStage(next, 'q_debt_in_shadow', 1);
        set({ pendingAfterCombatDialogue: 'sable_after_shadow' });
        break;
      case 'enc_bell_wraith':
        flags.bell_wraith_defeated = true;
        flags.bell_resolved = true;
        complete('q_silent_bell');
        break;
      case 'enc_temple_guardians':
        flags.temple_guardians_defeated = true;
        next = setQuestStage(next, 'q_drowned_covenant', 1);
        break;
      case 'enc_drowned_saint':
        flags.drowned_saint_defeated = true;
        flags.discovered_citadel = true;
        complete('q_drowned_covenant');
        next = setQuestStage(next, 'q_marked', 3);
        next = startQuest(next, 'q_crown_of_cinders');
        next = setQuestStage(next, 'q_crown_of_cinders', 1);
        break;
      case 'enc_citadel_echoes':
        flags.citadel_echoes_defeated = true;
        next = setQuestStage(next, 'q_crown_of_cinders', 1);
        break;
      case 'enc_crownbound':
        flags.crownbound_defeated = true;
        next = setQuestStage(next, 'q_crown_of_cinders', 2);
        break;
    }

    next = {
      ...next,
      world: { ...next.world, flags, defeated },
      updatedAt: Date.now()
    };
    next = noteSubclassOpportunity(refreshDerivedFlags(next));

    const result: CombatResult = {
      victory: true,
      encounterId: state.encounterId,
      encounterName: encounter.name,
      xp: reward.xp,
      gold: reward.gold,
      items: reward.items,
      notes,
      levelUps,
      victoryText: encounter.victoryText
    };

    set({ game: next, combatResult: result, victoryHandled: true });
    notify(`Victory: ${encounter.name}.`, 'success');
    emitSfx('victory');
    void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
  };

  const afterCombatUpdate = (state: CombatState) => {
    if (state.phase === 'victory') {
      if (!get().victoryHandled) resolveCombatVictory(state);
      return;
    }
    if (state.phase === 'defeat') {
      if (!get().defeatHandled) {
        const encounter = encounterById[state.encounterId];
        set({
          defeatHandled: true,
          combatResult: {
            victory: false,
            encounterId: state.encounterId,
            encounterName: encounter.name,
            xp: 0,
            gold: 0,
            items: [],
            notes: [],
            levelUps: []
          }
        });
        notify('The party has fallen.', 'danger');
        emitSfx('defeat');
      }
      return;
    }
    const unit = currentUnit(state);
    if (unit?.side === 'enemy') scheduleEnemyTurn();
  };

  const finishIntro = () => {
    const game = get().game;
    if (!game) return;
    const next = refreshDerivedFlags({
      ...game,
      world: {
        ...game.world,
        flags: { ...game.world.flags, intro_complete: true }
      },
      updatedAt: Date.now()
    });
    set({ game: next, screen: 'game', introSlide: 0 });
    emitMusic(mapById[next.world.locationId]?.music ?? 'bastion');
    notify('The Fallen Bastion. The mark is awake.', 'quest');
    void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
  };

  return {
    screen: 'menu',
    game: null,
    introSlide: 0,
    modal: null,
    selectedCharacterId: null,
    shop: null,
    dialogue: null,
    combat: null,
    combatResult: null,
    victoryHandled: false,
    defeatHandled: false,
    pendingAfterCombatDialogue: null,
    toasts: [],
    saves: [],
    savesLoading: false,
    settings: loadStoredSettings(),
    checkResult: null,
    levelUpNotes: [],

    notify,
    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    setScreen: (screen) => set({ screen }),
    newGame: (draft) => {
      const player = createPlayer(draft);
      const characters: Record<string, CharacterRecord> = { [player.id]: player };
      for (const def of Object.values(companionById)) {
        characters[def.id] = createCompanion(def.id, 1);
      }
      let inventory: ItemStack[] = starterInventory.map((s) => ({ ...s }));
      if (draft.background === 'scholar') inventory = addItem(inventory, 'scroll_chain_lightning', 1);
      if (draft.background === 'pilgrim') inventory = addItem(inventory, 'healing_potion', 1);
      if (draft.background === 'artisan') inventory = addItem(inventory, 'repair_kit', 1);
      const map = mapById.fallen_bastion;
      const game: GameState = {
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        difficulty: draft.difficulty,
        playerId: player.id,
        characters,
        party: [player.id],
        inventory,
        quests: {
          q_marked: { status: 'active', stage: 0, flags: {} }
        },
        world: {
          locationId: 'fallen_bastion',
          x: map.start.x,
          y: map.start.y,
          discovered: ['fallen_bastion'],
          defeated: [],
          opened: [],
          visited: ['fallen_bastion'],
          flags: { prologue_bastion: true },
          companionParty: []
        },
        settings: { ...get().settings },
        playTime: 0,
        ending: null
      };
      set({
        game,
        screen: 'intro',
        introSlide: 0,
        modal: null,
        dialogue: null,
        combat: null,
        combatResult: null,
        shop: null,
        selectedCharacterId: player.id,
        victoryHandled: false,
        defeatHandled: false,
        pendingAfterCombatDialogue: null
      });
    },
    advanceIntro: () => {
      const slide = get().introSlide;
      if (slide >= introSlides.length - 1) finishIntro();
      else set({ introSlide: slide + 1 });
    },
    skipIntro: () => finishIntro(),
    openModal: (modal, characterId = null) =>
      set({ modal, selectedCharacterId: characterId ?? get().selectedCharacterId ?? get().game?.playerId ?? null }),
    closeModal: () => set({ modal: null, shop: null }),
    setSelectedCharacter: (id) => set({ selectedCharacterId: id }),
    updateSettings: (partial) => {
      const settings = { ...get().settings, ...partial };
      persistSettings(settings);
      const game = get().game;
      set({
        settings,
        game: game ? { ...game, settings: { ...game.settings, ...partial } } : game
      });
    },

    travelTo: (mapId, x, y) => {
      const game = get().game;
      if (!game) return;
      const map = mapById[mapId];
      if (!map) return;
      // Direct doors and exits carry coordinates and may lead to interiors that
      // are not fast-travel nodes. Only coordinate-less map travel is gated by
      // discovery.
      const directTransition = x !== undefined || y !== undefined;
      if (mapId !== game.world.locationId && !directTransition && !game.world.discovered.includes(mapId)) {
        notify('You have not discovered that place yet.', 'warning');
        return;
      }
      const discovered = game.world.discovered.includes(mapId)
        ? game.world.discovered
        : [...game.world.discovered, mapId];
      const visited = game.world.visited.includes(mapId) ? game.world.visited : [...game.world.visited, mapId];
      const flags = { ...game.world.flags };
      const discoveryFlag = Object.entries(mainMapFlagToId).find(([, id]) => id === mapId)?.[0];
      if (discoveryFlag) flags[discoveryFlag] = true;
      let next: GameState = {
        ...game,
        world: {
          ...game.world,
          locationId: mapId,
          x: x ?? map.start.x,
          y: y ?? map.start.y,
          discovered,
          visited,
          flags
        },
        updatedAt: Date.now()
      };
      next = refreshDerivedFlags(next);
      set({
        game: next,
        dialogue: null,
        modal: null,
        shop: null,
        combat: null,
        combatResult: null
      });
      emitSfx('travel');
      emitMusic(map.music);
      notify(`Entered ${map.name}.`, 'info');
      void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
    },

    setPlayerPosition: (x, y) => {
      const game = get().game;
      if (!game) return;
      set({ game: { ...game, world: { ...game.world, x, y } } });
    },

    interact: (interactableId) => {
      const game = get().game;
      if (!game || get().combat) return;
      const map = mapForGame(game);
      const def = map.interactables.find((i) => i.id === interactableId);
      if (!def) return;

      if (def.once && game.world.opened.includes(def.id)) {
        notify('There is nothing more here.', 'info');
        return;
      }
      if (def.encounterId && game.world.defeated.includes(def.encounterId)) {
        notify('That threat has already been dealt with.', 'info');
        return;
      }
      if (def.requiresFlag && !game.world.flags[def.requiresFlag]) {
        notify(def.hint ?? 'You are not ready for this yet.', 'warning');
        return;
      }

      let next = game;

      // Hidden caches and traps require a search/disable check the first time.
      const hiddenFound = Boolean(game.world.flags[`found_${def.id}`]);
      if (def.hidden && !hiddenFound && !game.world.opened.includes(def.id)) {
        const stat = def.stat ?? 'int';
        const proficiency = hiddenSkillFor(stat);
        const { result, character } = bestPartyCheck(game, stat, def.dc ?? 13, proficiency);
        set({ checkResult: result });
        emitSfx(result.success ? 'check-success' : 'check-fail');
        if (!result.success) {
          notify(`${character.name} searches but finds nothing.`, 'warning');
          return;
        }
        next = {
          ...next,
          world: { ...next.world, flags: { ...next.world.flags, [`found_${def.id}`]: true } }
        };
        notify(`You discover ${def.label}.`, 'success');
      }

      switch (def.kind) {
        case 'npc':
        case 'note':
        case 'merchant':
        case 'shrine': {
          if (def.dialogueId) {
            set({ game: next });
            get().openDialogue(def.dialogueId);
          } else if (def.kind === 'shrine') {
            get().rest();
          } else {
            notify(def.label, 'info');
          }
          break;
        }
        case 'chest':
        case 'loot': {
          const opened = next.world.opened.includes(def.id) ? next.world.opened : [...next.world.opened, def.id];
          if (def.itemId) next = { ...next, inventory: addItem(next.inventory, def.itemId, 1) };
          if (def.gold) next = setGold(next, playerGold(next) + def.gold);
          const xpResult = addXpToGame(next, 20);
          next = xpResult.game;
          next = { ...next, world: { ...next.world, opened } };
          const bits = [def.itemId ? itemById[def.itemId]?.name : null, def.gold ? `${def.gold} gold` : null].filter(Boolean);
          notify(`${def.label}: ${bits.length ? bits.join(', ') : 'empty'}.`, 'success');
          emitSfx('loot');
          set({ game: next });
          void saveGame('auto', next).catch(() => undefined);
          break;
        }
        case 'trap': {
          const stat = def.stat ?? 'int';
          const proficiency = hiddenSkillFor(stat);
          const { result, character } = bestPartyCheck(game, stat, def.dc ?? 13, proficiency);
          set({ checkResult: result });
          if (result.success) {
            const opened = next.world.opened.includes(def.id) ? next.world.opened : [...next.world.opened, def.id];
            next = { ...next, world: { ...next.world, opened } };
            const xpResult = addXpToGame(next, 25);
            next = xpResult.game;
            notify(`${character.name} disarms ${def.label}.`, 'success');
            emitSfx('check-success');
          } else {
            const player = next.characters[next.playerId];
            const damage = 6;
            if (player) {
              next = {
                ...next,
                characters: {
                  ...next.characters,
                  [player.id]: { ...player, hp: clamp(player.hp - damage, 1, maxHp(player)) }
                }
              };
            }
            notify(`${def.label} triggers. The party takes ${damage} damage.`, 'danger');
            emitSfx('trap');
          }
          set({ game: next });
          break;
        }
        case 'rune': {
          const runeFlag = def.flagSet ?? def.id;
          const flags = { ...next.world.flags };
          if (flags[runeFlag]) {
            notify('This rune is already awake.', 'info');
            return;
          }
          const order = ['rune_root', 'rune_moth', 'rune_crown'];
          const index = order.indexOf(runeFlag);
          const prerequisites = order.slice(0, index);
          const missing = prerequisites.find((flag) => !flags[flag]);
          if (missing) {
            const player = next.characters[next.playerId];
            if (player) {
              next = {
                ...next,
                characters: {
                  ...next.characters,
                  [player.id]: { ...player, hp: clamp(player.hp - 3, 1, maxHp(player)) }
                }
              };
            }
            notify('The rune rejects the order. Thorns rake the party.', 'danger');
            set({ game: next });
            emitSfx('rune-fail');
            return;
          }
          flags[runeFlag] = true;
          next = { ...next, world: { ...next.world, flags } };
          const allRunes = order.every((flag) => flags[flag]);
          if (allRunes) {
            const xpResult = addXpToGame(next, 100);
            next = xpResult.game;
            next = setQuestStage(next, 'q_roots_remember', 2);
            notify('The three runes answer. Somewhere beneath the roots, a door opens.', 'quest');
            emitSfx('rune-open');
          } else {
            notify('The rune wakes with a low, green hum.', 'success');
            emitSfx('rune');
          }
          next = refreshDerivedFlags(next);
          set({ game: next });
          break;
        }
        case 'enemy': {
          if (!def.encounterId) return;
          if (def.encounterId === 'enc_choir_cell' && next.world.flags.choir_ally) {
            const opened = next.world.opened.includes(def.id)
              ? next.world.opened
              : [...next.world.opened, def.id];
            const defeated = next.world.defeated.includes(def.encounterId)
              ? next.world.defeated
              : [...next.world.defeated, def.encounterId];
            let resolved: GameState = {
              ...next,
              world: {
                ...next.world,
                flags: { ...next.world.flags, choir_dealt: true },
                opened,
                defeated
              }
            };
            resolved = setQuestStage(resolved, 'q_ash_over_greymoor', 2);
            const xpResult = addXpToGame(resolved, 160);
            resolved = refreshDerivedFlags({ ...xpResult.game, updatedAt: Date.now() });
            set({ game: resolved });
            notify('The Choir cell empties under a white banner. No blood is spilled.', 'quest');
            emitSfx('check-success');
            void saveGame('auto', resolved).then(() => get().refreshSaves()).catch(() => undefined);
            break;
          }
          set({ game: next });
          get().startCombat(def.encounterId);
          break;
        }
        case 'camp': {
          set({ game: next });
          get().rest();
          break;
        }
        case 'door':
        case 'exit': {
          if (!def.toMap) return;
          if (def.requiresFlag && !game.world.flags[def.requiresFlag]) {
            notify(def.hint ?? 'The way is closed for now.', 'warning');
            return;
          }
          get().travelTo(def.toMap, def.toX, def.toY);
          break;
        }
        case 'puzzle': {
          if (def.dialogueId) {
            set({ game: next });
            get().openDialogue(def.dialogueId);
          } else if (def.flagSet) {
            next = {
              ...next,
              world: { ...next.world, flags: { ...next.world.flags, [def.flagSet]: true } }
            };
            set({ game: refreshDerivedFlags(next) });
            notify(`${def.label} responds.`, 'success');
          } else {
            notify(def.hint ?? 'Nothing happens.', 'info');
          }
          break;
        }
      }
    },

    searchArea: () => {
      const game = get().game;
      if (!game || get().combat) return;
      const map = mapForGame(game);
      const candidates = map.interactables
        .filter((def) => {
          if (!def.hidden) return false;
          if (game.world.opened.includes(def.id)) return false;
          if (game.world.flags[`found_${def.id}`]) return false;
          if (def.requiresFlag && !game.world.flags[def.requiresFlag]) return false;
          return Math.max(Math.abs(def.x - game.world.x), Math.abs(def.y - game.world.y)) <= 4;
        })
        .sort(
          (a, b) =>
            Math.max(Math.abs(a.x - game.world.x), Math.abs(a.y - game.world.y)) -
            Math.max(Math.abs(b.x - game.world.x), Math.abs(b.y - game.world.y))
        );
      if (!candidates.length) {
        notify('You search the area but find nothing hidden.', 'info');
        return;
      }
      const def = candidates[0];
      const stat = def.stat ?? 'int';
      const proficiency = hiddenSkillFor(stat);
      const { result, character } = bestPartyCheck(game, stat, def.dc ?? 13, proficiency);
      set({ checkResult: result });
      emitSfx(result.success ? 'check-success' : 'check-fail');
      if (result.success) {
        const next = refreshDerivedFlags({
          ...game,
          world: {
            ...game.world,
            flags: { ...game.world.flags, [`found_${def.id}`]: true }
          }
        });
        set({ game: next });
        notify(`${character.name} notices ${def.label}.`, 'success');
      } else {
        notify(`${character.name} searches but finds nothing.`, 'warning');
      }
    },

    openDialogue: (dialogueId) => {
      const def = dialogueById[dialogueId];
      if (!def) return;
      set({ dialogue: { id: dialogueId, nodeId: def.start }, modal: null, shop: null });
      enterNode(dialogueId, def.start);
    },

    chooseDialogueChoice: (choiceId) => {
      const runtime = get().dialogue;
      const game = get().game;
      if (!runtime || !game) return;
      const def = dialogueById[runtime.id];
      const node = def?.nodes[runtime.nodeId];
      const choice = node?.choices?.find((c) => c.id === choiceId);
      if (!def || !choice) return;
      if (!isChoiceAvailable(game, choice)) {
        notify('You cannot choose that.', 'warning');
        return;
      }
      const player = game.characters[game.playerId];
      if (!player) return;

      if (choice.check) {
        const result = performCheck(player, choice.check.stat, choice.check.dc, choice.check.proficiency);
        set({ checkResult: result });
        notify(
          `${result.label}: d20 ${result.die} + ${result.modifier + result.proficiency} = ${result.total} vs DC ${result.dc} — ${result.success ? 'success' : 'failure'}.`,
          result.success ? 'success' : 'danger'
        );
        emitSfx(result.success ? 'check-success' : 'check-fail');
        const effects = result.success ? choice.successEffects : choice.failureEffects;
        const outcome = applyEffects(
          effects,
          `${runtime.id}:${runtime.nodeId}:${choice.id}:${result.success ? 'success' : 'failure'}`
        );
        if (outcome.stop) return;
        const nextNode = result.success ? choice.successNext : choice.failureNext;
        if (nextNode) enterNode(runtime.id, nextNode);
        else set({ dialogue: null });
        return;
      }

      const outcome = applyEffects(choice.effects, `${runtime.id}:${runtime.nodeId}:${choice.id}`);
      if (outcome.stop) return;
      if (choice.next) enterNode(runtime.id, choice.next);
      else {
        set({ dialogue: null });
        if (choice.effects?.some((e) => e.type === 'end')) {
          emitSfx('dialogue-close');
        }
      }
    },

    advanceDialogue: () => {
      const runtime = get().dialogue;
      if (!runtime) return;
      const def = dialogueById[runtime.id];
      const node = def?.nodes[runtime.nodeId];
      if (!node) {
        set({ dialogue: null });
        return;
      }
      if (node.next) {
        enterNode(runtime.id, node.next);
      } else {
        set({ dialogue: null });
        emitSfx('dialogue-close');
      }
    },

    closeDialogue: () => {
      set({ dialogue: null });
      emitSfx('dialogue-close');
    },

    talkToCompanion: (companionId) => {
      const game = get().game;
      if (!game) return;
      const character = game.characters[companionId];
      if (!character?.recruited) {
        notify('They are not with you.', 'warning');
        return;
      }
      const dialogueId = companionTalkIds[companionId];
      if (dialogueId) {
        set({ modal: null });
        get().openDialogue(dialogueId);
      }
    },

    startCombat: (encounterId) => {
      const game = get().game;
      if (!game) return;
      if (!encounterById[encounterId]) return;
      if (combatTimer) clearTimeout(combatTimer);
      combatToken++;
      void saveGame('auto', game).then(() => get().refreshSaves()).catch(() => undefined);
      const combat = createCombat(encounterId, game.characters, game.party, game.difficulty);
      set({
        combat,
        combatResult: null,
        victoryHandled: false,
        defeatHandled: false,
        pendingAfterCombatDialogue: null,
        modal: null,
        dialogue: null,
        shop: null,
        screen: 'game'
      });
      const encounter = encounterById[encounterId];
      if (encounter.intro) notify(encounter.intro, 'warning');
      emitMusic(encounter.music);
      emitSfx('combat-start');
      const first = currentUnit(combat);
      if (first?.side === 'enemy') {
        if (isStunned(first)) {
          setTimeout(() => {
            const current = get().combat;
            if (current && current.phase === 'active') {
              const updated = endTurn(current);
              set({ combat: updated });
              afterCombatUpdate(updated);
            }
          }, 900);
        } else {
          scheduleEnemyTurn();
        }
      }
    },

    selectCombatAbility: (abilityId) => {
      const combat = get().combat;
      if (!combat || combat.phase !== 'active') return;
      set({ combat: selectAbility(combat, abilityId) });
    },

    selectCombatAction: (action) => {
      const combat = get().combat;
      if (!combat || combat.phase !== 'active') return;
      set({ combat: selectCombatActionEngine(combat, action) });
    },

    combatAction: (action, x, y) => {
      const combat = get().combat;
      if (!combat || combat.phase !== 'active' || combat.waitingForAi) return;
      const unit = currentUnit(combat);
      if (!unit || unit.side !== 'party') return;
      let updated = combat;
      if (action === 'dash') updated = dashCurrentUnit(combat);
      else if (action === 'disengage') updated = disengageCurrentUnit(combat);
      else if (action === 'shove' && x !== undefined && y !== undefined) updated = shoveCurrentUnit(combat, x, y);
      else if (action === 'help' && x !== undefined && y !== undefined) updated = helpCurrentUnit(combat, x, y);
      else return;
      set({ combat: updated });
      emitSfx('ability');
      afterCombatUpdate(updated);
    },

    combatMove: (x, y) => {
      const combat = get().combat;
      if (!combat || combat.phase !== 'active') return;
      const unit = currentUnit(combat);
      if (!unit || unit.side !== 'party' || combat.waitingForAi) return;
      const updated = moveCurrentUnit(combat, x, y);
      set({ combat: updated });
      afterCombatUpdate(updated);
    },

    combatAttack: (x, y) => {
      const combat = get().combat;
      if (!combat || combat.phase !== 'active' || combat.waitingForAi) return;
      const unit = currentUnit(combat);
      if (!unit || unit.side !== 'party') return;
      const updated = basicAttack(combat, x, y);
      set({ combat: updated });
      afterCombatUpdate(updated);
    },

    combatUseAbility: (abilityId, x, y) => {
      const combat = get().combat;
      if (!combat || combat.phase !== 'active' || combat.waitingForAi) return;
      const unit = currentUnit(combat);
      if (!unit || unit.side !== 'party') return;
      const updated = useAbility(combat, abilityId, x, y);
      set({ combat: updated });
      emitSfx('ability');
      afterCombatUpdate(updated);
    },

    combatConsumeItem: (itemId) => {
      const combat = get().combat;
      const game = get().game;
      if (!combat || !game || combat.phase !== 'active' || combat.waitingForAi) return;
      const result = useCombatConsumable(combat, itemId);
      if (!result.consumed) {
        notify(result.message, 'warning');
        return;
      }
      set({
        combat: result.state,
        game: { ...game, inventory: removeItem(game.inventory, itemId, 1) }
      });
      notify(result.message, 'success');
      emitSfx('potion');
      afterCombatUpdate(result.state);
    },

    combatEndTurn: () => {
      const combat = get().combat;
      if (!combat || combat.phase !== 'active') return;
      const updated = endTurn(combat);
      set({ combat: updated });
      afterCombatUpdate(updated);
    },

    chooseSubclass: (characterId, subclassId) => {
      const game = get().game;
      if (!game) return;
      const character = game.characters[characterId];
      const subclass = subclassById[subclassId];
      if (!character || !subclass) return;
      if (character.classId !== subclass.classId) {
        notify('That specialization belongs to another calling.', 'warning');
        return;
      }
      if (character.level < 3) {
        notify('Specializations unlock at level 3.', 'warning');
        return;
      }
      if (character.subclass) {
        notify(`${character.name} has already chosen a specialization.`, 'info');
        return;
      }
      const oldMax = maxHp(character);
      const oldResource = maxResource(character);
      const nextCharacter: CharacterRecord = {
        ...character,
        subclass: subclass.id,
        abilities: Array.from(new Set([...character.abilities, subclass.abilityId]))
      };
      const nextMax = maxHp(nextCharacter);
      const nextResource = maxResource(nextCharacter);
      nextCharacter.hp = clamp(character.hp + Math.max(0, nextMax - oldMax), 0, nextMax);
      nextCharacter.resource = clamp(
        character.resource + Math.max(0, nextResource - oldResource),
        0,
        nextResource
      );
      const next: GameState = {
        ...game,
        characters: { ...game.characters, [characterId]: nextCharacter },
        updatedAt: Date.now()
      };
      set({ game: next, modal: null });
      notify(`${character.name} becomes a ${subclass.name}. ${subclass.trait}`, 'quest');
      emitSfx('check-success');
      void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
    },

    closeCombat: () => {
      const combat = get().combat;
      if (!combat) return;
      if (combat.phase === 'defeat') return;
      const pending = get().pendingAfterCombatDialogue;
      set({
        combat: null,
        combatResult: null,
        victoryHandled: false,
        defeatHandled: false,
        pendingAfterCombatDialogue: null
      });
      emitMusic(mapForGame(get().game!).music);
      if (pending && get().game) {
        const game = get().game!;
        if (game.characters.sable?.recruited) {
          get().openDialogue(pending);
        }
      } else {
        get().autosave();
      }
    },

    retryFromAutosave: async () => {
      const result = await loadGame('auto');
      if ('error' in result) {
        notify(result.error, 'danger');
        return;
      }
      const game = refreshDerivedFlags(result.game);
      persistSettings(game.settings);
      set({
        game,
        screen: game.ending ? 'ending' : 'game',
        settings: game.settings,
        combat: null,
        combatResult: null,
        dialogue: null,
        modal: null,
        shop: null,
        victoryHandled: false,
        defeatHandled: false,
        pendingAfterCombatDialogue: null
      });
      emitMusic(mapById[game.world.locationId]?.music ?? 'bastion');
      notify('Returned to the last autosave.', 'info');
    },

    useItem: (characterId, itemId) => {
      const game = get().game;
      if (!game) return;
      const result = useItemInGame(game, characterId, itemId);
      set({ game: result.game });
      notify(result.message, result.game === game ? 'warning' : 'success');
      emitSfx('potion');
    },

    equipItem: (characterId, itemId) => {
      const game = get().game;
      if (!game) return;
      const result = equipItemInGame(game, characterId, itemId);
      set({ game: result.game });
      notify(result.message, result.game === game ? 'warning' : 'success');
      emitSfx('equip');
    },

    unequipItem: (characterId, slot) => {
      const game = get().game;
      if (!game) return;
      const result = unequipItemInGame(game, characterId, slot);
      set({ game: result.game });
      notify(result.message, result.game === game ? 'warning' : 'success');
      emitSfx('equip');
    },

    toggleParty: (companionId) => {
      const game = get().game;
      if (!game) return;
      const result = togglePartyMember(game, companionId);
      set({ game: result.game });
      notify(result.message, result.game === game ? 'warning' : 'success');
    },

    openShop: (merchantId) => {
      const merchant = merchantById[merchantId];
      if (!merchant) return;
      set({
        shop: {
          merchantId,
          name: merchant.name,
          stock: merchant.stock.map((s) => ({ ...s }))
        },
        modal: 'shop'
      });
    },

    closeShop: () => set({ shop: null, modal: null }),

    buyItem: (itemId) => {
      const game = get().game;
      const shop = get().shop;
      const item = itemById[itemId];
      if (!game || !shop || !item) return;
      const entry = shop.stock.find((s) => s.itemId === itemId);
      if (!entry || entry.quantity <= 0) {
        notify('That item is sold out.', 'warning');
        return;
      }
      if (playerGold(game) < item.value) {
        notify('You do not have enough gold.', 'warning');
        return;
      }
      const next: GameState = {
        ...game,
        inventory: addItem(game.inventory, itemId, 1)
      };
      const withGold = setGold(next, playerGold(game) - item.value);
      const stock = shop.stock.map((s) =>
        s.itemId === itemId ? { ...s, quantity: s.quantity - 1 } : s
      );
      set({ game: withGold, shop: { ...shop, stock } });
      notify(`Bought ${item.name}.`, 'success');
      emitSfx('coin');
    },

    sellItem: (itemId, quantity = 1) => {
      const game = get().game;
      const item = itemById[itemId];
      if (!game || !item) return;
      if (inventoryCount(game.inventory, itemId) < quantity) {
        notify('You do not have that many.', 'warning');
        return;
      }
      if (!item.value || item.category === 'quest') {
        notify('That item cannot be sold.', 'warning');
        return;
      }
      const value = Math.max(1, Math.floor(item.value * 0.5)) * quantity;
      const next: GameState = {
        ...game,
        inventory: removeItem(game.inventory, itemId, quantity)
      };
      set({ game: setGold(next, playerGold(game) + value) });
      notify(`Sold ${item.name} for ${value} gold.`, 'success');
      emitSfx('coin');
    },

    rest: () => {
      const game = get().game;
      if (!game || get().combat) return;
      const next = restParty(game);
      set({ game: next });
      notify('The party rests. Health and resolve restored.', 'success');
      emitSfx('rest');
      void saveGame('auto', next).catch(() => undefined);
    },

    saveToSlot: async (slot) => {
      const game = get().game;
      if (!game) return;
      await saveGame(slot, game);
      await get().refreshSaves();
      notify(`Saved to ${slot === 'auto' ? 'autosave' : slot}.`, 'success');
    },

    loadFromSlot: async (slot) => {
      const result = await loadGame(slot);
      if ('error' in result) {
        notify(result.error, 'danger');
        return;
      }
      const game = refreshDerivedFlags(result.game);
      persistSettings(game.settings);
      set({
        game,
        screen: game.ending ? 'ending' : 'game',
        settings: game.settings,
        introSlide: 0,
        modal: null,
        dialogue: null,
        combat: null,
        combatResult: null,
        shop: null,
        selectedCharacterId: game.playerId,
        victoryHandled: false,
        defeatHandled: false,
        pendingAfterCombatDialogue: null
      });
      emitMusic(mapById[game.world.locationId]?.music ?? 'bastion');
      notify('Save loaded.', 'success');
    },

    deleteSlot: async (slot) => {
      await deleteSave(slot);
      await get().refreshSaves();
      notify('Save deleted.', 'info');
    },

    refreshSaves: async () => {
      set({ savesLoading: true });
      try {
        const saves = await listSaves();
        set({ saves, savesLoading: false });
      } catch {
        set({ savesLoading: false });
      }
    },

    autosave: () => {
      const game = get().game;
      if (!game) return;
      void saveGame('auto', game).then(() => get().refreshSaves()).catch(() => undefined);
    },

    goToMenu: () => {
      if (combatTimer) clearTimeout(combatTimer);
      combatToken++;
      set({
        screen: 'menu',
        game: null,
        introSlide: 0,
        modal: null,
        selectedCharacterId: null,
        shop: null,
        dialogue: null,
        combat: null,
        combatResult: null,
        victoryHandled: false,
        defeatHandled: false,
        pendingAfterCombatDialogue: null,
        checkResult: null,
        levelUpNotes: []
      });
      emitMusic('menu');
      void get().refreshSaves();
    },

    setEnding: (endingId) => {
      const game = get().game;
      if (!game || !endingById[endingId]) return;
      const next = refreshDerivedFlags({
        ...game,
        ending: endingId,
        updatedAt: Date.now()
      });
      set({ game: next, screen: 'ending', dialogue: null, combat: null, modal: null, shop: null });
      emitMusic('ending');
      emitSfx('ending');
      void saveGame('auto', next).catch(() => undefined);
    },

    dismissCheck: () => set({ checkResult: null })
  };
});
