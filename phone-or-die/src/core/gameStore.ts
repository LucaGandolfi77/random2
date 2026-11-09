import { create } from 'zustand';
import type {
  CallDef,
  Origin,
  CallRuntime,
  ContactId,
  ContactState,
  Difficulty,
  EventDef,
  GameSettings,
  GameState,
  PhoneTab,
  StoryEffect,
  Toast
} from '@/core/types';
import { clamp, chance, simpleHash, weightedPick } from '@/core/rng';
import { contacts, contactById } from '@/data/contacts';
import { calls, callById } from '@/data/calls';
import { messages, initialMessages } from '@/data/messages';
import { events, eventById } from '@/data/events';
import { endingById, resolveEnding } from '@/data/endings';
import { finalChoices, finalChoiceById } from '@/data/final';
import { chapters, chapterForNightMinute, chapterById } from '@/data/chapters';
import {
  interactables,
  nearestInteractable,
  isWalkableTile,
  zoneAt,
  distanceToHome,
  HOME_DOOR,
  HOME_CLUES_REQUIRED,
  START_POSITION
} from '@/data/road';
import {
  answerChance,
  availableCallsFor,
  callLengthMinutes,
  contactStatus,
  makeContactState,
  preferredCallFor,
  protectionFromCall
} from '@/systems/calls';
import { chapterForNightMinute as clockChapterForNightMinute, formatNightTime, minutesPerSecond } from '@/systems/clock';
import { shadowStepsBehind, stageForThreat, stageInfo, stepThreatFor, tickThreat } from '@/systems/threat';
import { buildMeta, deleteSave, latestSave, listSaves, loadGame, saveGame } from '@/systems/save';

export type ModalKind =
  | 'settings'
  | 'saves'
  | 'load'
  | 'credits'
  | 'pause'
  | 'help'
  | 'howto'
  | null;

const SETTINGS_KEY = 'phone-or-die-settings';
const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.58,
  sfxVolume: 0.8,
  muted: false,
  textSize: 1,
  brightness: 1,
  reducedMotion: false,
  highContrast: false,
  showTimers: true
};

const loadSettings = (): GameSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GameSettings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const persistSettings = (settings: GameSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings are a convenience; the game remains playable without storage.
  }
};

const emitSfx = (name: string) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pod-sfx', { detail: name }));
};

let toastId = 1;
let historyId = 1;

export const useGameStore = create<GameStore>((set, get) => {
  const notify = (text: string, kind: Toast['kind'] = 'info') => {
    const id = toastId++;
    set((state) => ({ toasts: [...state.toasts, { id, text, kind }].slice(-3) }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 5400);
  };

  const startContactState = (): Record<ContactId, ContactState> => {
    const result = {} as Record<ContactId, ContactState>;
    for (const contact of contacts) {
      result[contact.id] = makeContactState(contact.trustStart, contact.id === 'unknown' ? false : true);
    }
    return result;
  };

  const makeInitialGame = (difficulty: Difficulty): GameState => ({
    version: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    difficulty,
    origin: 'work',
    nightMinute: 0,
    chapter: 0,
    threat: 12,
    shieldSeconds: 8,
    shieldSteps: 0,
    idleSeconds: 0,
    battery: 100,
    contacts: startContactState(),
    callHistory: [],
    readMessages: [],
    deliveredMessages: [...initialMessages],
    flags: {
      night_started: true,
      prologue_complete: true,
      origin_work: true
    },
    clues: [],
    clueNotes: {},
    completedEvents: [],
    usedInteractions: [],
    interactionUses: {},
    player: { ...START_POSITION },
    flashlightOwned: false,
    flashlightOn: false,
    powerOn: true,
    barricades: { front: false, back: false, windows: false },
    finalChoice: null,
    finalPhase: false,
    nextEventAt: 24,
    stats: {
      callsMade: 0,
      callsAnswered: 0,
      callsMissed: 0,
      unknownAnswered: false,
      cluesFound: 0,
      contactsWarned: 0,
      secondsAtHighThreat: 0
    },
    endingId: null,
    playTime: 0
  });

  const updateContact = (
    game: GameState,
    contactId: ContactId,
    updater: (contact: ContactState) => ContactState
  ): GameState => {
    const existing = game.contacts[contactId];
    if (!existing) return game;
    return { ...game, contacts: { ...game.contacts, [contactId]: updater(existing) } };
  };

  const addHistory = (
    game: GameState,
    contactId: ContactId,
    type: 'outgoing' | 'incoming' | 'missed' | 'voicemail' | 'declined',
    note?: string
  ): GameState => ({
    ...game,
    callHistory: [
      {
        id: historyId++,
        contactId,
        name: contactById[contactId]?.name ?? 'Unknown',
        type,
        at: game.nightMinute,
        duration: type === 'outgoing' ? Math.max(1, Math.round(game.nightMinute - (game.contacts[contactId]?.lastCallNight ?? game.nightMinute))) : 0,
        note
      },
      ...game.callHistory
    ].slice(0, 30)
  });

  const syncChapter = (game: GameState, announce = true): { game: GameState; changed: boolean } => {
    const chapter = chapterForNightMinute(game.nightMinute);
    if (chapter === game.chapter) return { game, changed: false };
    const next = { ...game, chapter };
    if (announce) {
      const def = chapterById[chapter];
      if (def) notify(`${def.timeLabel} — ${def.title}`, 'story');
    }
    emitSfx('chapter');
    return { game: next, changed: true };
  };

  const applyEffects = (
    input: GameState,
    effects: StoryEffect[] | undefined
  ): { game: GameState; pendingCall: string | null; ending: string | null; captured: boolean } => {
    let game: GameState = {
      ...input,
      contacts: { ...input.contacts },
      flags: { ...input.flags },
      clues: [...input.clues],
      clueNotes: { ...input.clueNotes },
      deliveredMessages: [...input.deliveredMessages],
      readMessages: [...input.readMessages],
      completedEvents: [...input.completedEvents],
      usedInteractions: [...input.usedInteractions],
      interactionUses: { ...input.interactionUses },
      barricades: { ...input.barricades },
      stats: { ...input.stats }
    };
    let pendingCall: string | null = null;
    let ending: string | null = null;
    let captured = false;

    for (const effect of effects ?? []) {
      const amount = effect.amount ?? 0;
      switch (effect.type) {
        case 'threat':
          game.threat = clamp(game.threat + amount, 0, 100);
          break;
        case 'shield':
          game.shieldSeconds = Math.max(0, game.shieldSeconds + amount);
          break;
        case 'battery':
          game.battery = clamp(game.battery + amount, 0, 100);
          if (game.battery <= 0) {
            game.flashlightOn = false;
            notify('The phone is dead.', 'danger');
          }
          break;
        case 'trust': {
          if (!effect.id) break;
          const id = effect.id as ContactId;
          game = updateContact(game, id, (contact) => ({
            ...contact,
            trust: clamp(contact.trust + amount, 0, 10)
          }));
          break;
        }
        case 'flag':
          if (effect.id) game.flags[effect.id] = effect.value ?? true;
          break;
        case 'clue': {
          if (!effect.id) break;
          if (!game.clues.includes(effect.id)) {
            game.clues.push(effect.id);
            game.clueNotes[effect.id] = effect.text ?? effect.id;
            game.stats.cluesFound = game.clues.length;
            notify('A new clue has been written into your notes.', 'story');
            emitSfx('clue');
          }
          break;
        }
        case 'message': {
          if (!effect.id) break;
          if (!game.deliveredMessages.includes(effect.id) && messages.some((message) => message.id === effect.id)) {
            game.deliveredMessages.push(effect.id);
            notify('A new message waits on your phone.', 'phone');
            emitSfx('message');
          }
          break;
        }
        case 'time':
          game.nightMinute = clamp(game.nightMinute + amount, 0, 480);
          break;
        case 'barricade':
          if (effect.id === 'front' || effect.id === 'back' || effect.id === 'windows') {
            game.barricades = { ...game.barricades, [effect.id]: true };
            notify('A line of safety is secured.', 'success');
            emitSfx('barricade');
          }
          break;
        case 'power':
          game.powerOn = effect.value === false ? false : true;
          if (!game.powerOn) notify('The streetlights go dark.', 'danger');
          break;
        case 'flashlight':
          game.flashlightOwned = true;
          game.flashlightOn = true;
          notify('You found a flashlight.', 'success');
          break;
        case 'item':
          if (effect.id) game.flags[`item_${effect.id}`] = true;
          break;
        case 'objective':
          game.flags.objective_override = effect.text ?? effect.value ?? 'Survive until 6:00 AM.';
          break;
        case 'ending':
          if (effect.id) ending = effect.id;
          break;
        case 'gameover':
          captured = true;
          break;
        case 'call':
          if (effect.id) pendingCall = effect.id;
          break;
        case 'unlockContact': {
          if (!effect.id) break;
          const id = effect.id as ContactId;
          game = updateContact(game, id, (contact) => ({ ...contact, unlocked: true }));
          notify(`${contactById[id]?.name ?? 'A contact'} is now reachable.`, 'phone');
          break;
        }
      }
    }

    game.updatedAt = Date.now();
    const sync = syncChapter(game, false);
    game = sync.game;
    return { game, pendingCall, ending, captured };
  };

  const enterCallNode = (
    runtime: CallRuntime,
    input: GameState,
    nodeId: string,
    applyNodeEffects = true
  ): { runtime: CallRuntime; game: GameState; pendingCall: string | null; ending: string | null; captured: boolean; finished: boolean } => {
    const call = callById[runtime.callId];
    const node = call?.nodes[nodeId];
    if (!call || !node) {
      return { runtime, game: input, pendingCall: null, ending: null, captured: false, finished: true };
    }
    let game = input;
    let pendingCall: string | null = null;
    let ending: string | null = null;
    let captured = false;
    const visited = runtime.visitedNodes.includes(nodeId);
    if (applyNodeEffects && !visited && node.effects?.length) {
      const result = applyEffects(game, node.effects);
      game = result.game;
      pendingCall = result.pendingCall;
      ending = result.ending;
      captured = result.captured;
    }
    const runtimeNext: CallRuntime = {
      ...runtime,
      nodeId,
      visitedNodes: visited ? runtime.visitedNodes : [...runtime.visitedNodes, nodeId]
    };
    return { runtime: runtimeNext, game, pendingCall, ending, captured, finished: false };
  };

  const startScriptedCall = (callId: string) => {
    const call = callById[callId];
    if (!call) return;
    const game = get().game;
    if (!game) return;
    const contact = game.contacts[call.contactId];
    if (!contact) return;
    const runtime: CallRuntime = {
      callId,
      contactId: call.contactId,
      nodeId: call.start,
      connected: true,
      answered: true,
      startedAt: Date.now(),
      ringingStartedAt: Date.now(),
      choiceHistory: [],
      visitedNodes: []
    };
    const withContact = updateContact(
      {
        ...game,
        stats: {
          ...game.stats,
          callsAnswered: game.stats.callsAnswered + 1,
          callsMade: game.stats.callsMade + 1,
          unknownAnswered: game.stats.unknownAnswered || call.contactId === 'unknown'
        }
      },
      call.contactId,
      (entry) => ({
        ...entry,
        answered: entry.answered + 1,
        callCount: entry.callCount + 1,
        lastCallNight: game.nightMinute,
        unlocked: true
      })
    );
    const entered = enterCallNode(runtime, withContact, call.start);
    set({
      game: entered.game,
      phoneOpen: true,
      phoneTab: 'contacts',
      selectedContactId: call.contactId,
      activeCall: entered.runtime,
      pendingEventId: null,
      finalOpen: false
    });
    emitSfx('call-connect');
    if (entered.captured) get().capture();
    if (entered.ending) get().resolveDawnWithEnding(entered.ending);
  };

  const finishCall = (interrupted = false) => {
    const runtime = get().activeCall;
    const current = get().game;
    if (!runtime || !current) return;
    const call = callById[runtime.callId];
    if (!runtime.answered || !call) {
      get().hangUpCall();
      return;
    }
    const contact = contactById[call.contactId];
    const state = current.contacts[call.contactId];
    if (!contact || !state) return;
    const protection = protectionFromCall(contact, state, current);
    let next = current;
    const minutes = callLengthMinutes(contact, state);
    const totalRelief = interrupted ? Math.round(protection.threatRelief * 0.45) : protection.threatRelief;
    const totalShield = interrupted ? Math.round(protection.shieldSeconds * 0.4) : protection.shieldSeconds;
    const totalSteps = interrupted ? Math.round(protection.shieldSteps * 0.4) : protection.shieldSteps;
    next = {
      ...next,
      threat: clamp(next.threat - totalRelief, 0, 100),
      shieldSeconds: next.shieldSeconds + totalShield,
      shieldSteps: next.shieldSteps + totalSteps,
      idleSeconds: 0,
      nightMinute: clamp(next.nightMinute + minutes, 0, 480),
      updatedAt: Date.now(),
      stats: { ...next.stats }
    };
    const warnedFlag = `warned_${call.contactId}`;
    if (!next.flags[warnedFlag]) {
      next.flags = { ...next.flags, [warnedFlag]: true };
      next.stats.contactsWarned += 1;
    }
    next = addHistory(next, call.contactId, 'outgoing', interrupted ? 'The call lost signal.' : 'The line held.');
    next = updateContact(next, call.contactId, (entry) => ({
      ...entry,
      completedCalls: entry.completedCalls.includes(call.id) ? entry.completedCalls : [...entry.completedCalls, call.id]
    }));
    next.flags[`called_${call.contactId}`] = true;
    const sync = syncChapter(next, true);
    next = sync.game;
    set({
      game: next,
      activeCall: null,
      selectedContactId: call.contactId,
      phoneOpen: true,
      phoneTab: 'contacts'
    });
    notify(
      interrupted
        ? 'The call cuts out. Some of the connection survives.'
        : `${contact.shortName} stays with you until the line goes quiet.`,
      interrupted ? 'danger' : 'success'
    );
    emitSfx('call-end');
    if (next.nightMinute >= 480) {
      get().resolveDawn();
      return;
    }
    void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
  };

  const resolveRinging = () => {
    const runtime = get().activeCall;
    const game = get().game;
    if (!runtime || !game || runtime.answered) return;
    const contact = contactById[runtime.contactId];
    const state = game.contacts[runtime.contactId];
    if (!contact || !state) {
      set({ activeCall: null });
      return;
    }
    const call = runtime.callId ? callById[runtime.callId] : null;
    const answer = Boolean(call) && chance(answerChance(contact, state, game.difficulty, game.nightMinute));
    if (!answer) {
      let next = updateContact(game, runtime.contactId, (entry) => ({
        ...entry,
        missed: entry.missed + 1,
        callCount: entry.callCount + 1,
        lastCallNight: game.nightMinute
      }));
      const missedPenalty = game.difficulty === 'nightmare' ? 6 : game.difficulty === 'normal' ? 4 : 2;
      next = {
        ...next,
        threat: clamp(next.threat + missedPenalty, 0, 100),
        stats: { ...next.stats, callsMissed: next.stats.callsMissed + 1 },
        nightMinute: clamp(next.nightMinute + 2, 0, 480)
      };
      next = addHistory(next, runtime.contactId, 'missed', 'No answer.');
      if (chance(0.35)) {
        next = updateContact(next, runtime.contactId, (entry) => ({
          ...entry,
          voicemails: ['Please call me back.', ...entry.voicemails].slice(0, 3)
        }));
        next.callHistory[0] = { ...next.callHistory[0], type: 'voicemail', note: 'Voicemail: “Please call me back.”' };
      }
      const sync = syncChapter(next, true);
      next = sync.game;
      set({ game: next, activeCall: null });
      notify(`${contact.shortName} doesn't answer. The silence brings them closer.`, 'danger');
      emitSfx('call-miss');
      if (next.threat >= 100) get().capture();
      return;
    }

    const withContact = updateContact(
      {
        ...game,
        stats: {
          ...game.stats,
          callsAnswered: game.stats.callsAnswered + 1,
          unknownAnswered: game.stats.unknownAnswered || contact.id === 'unknown'
        }
      },
      contact.id,
      (entry) => ({
        ...entry,
        answered: entry.answered + 1,
        callCount: entry.callCount + 1,
        lastCallNight: game.nightMinute,
        unlocked: true
      })
    );
    const seed: CallRuntime = {
      ...runtime,
      answered: true,
      connected: true,
      nodeId: call!.start
    };
    const entered = enterCallNode(seed, withContact, call!.start);
    set({ game: entered.game, activeCall: entered.runtime });
    notify('The line connects.', 'success');
    emitSfx('call-connect');
    if (entered.captured) get().capture();
    if (entered.ending) get().resolveDawnWithEnding(entered.ending);
  };

  const pickEvent = (game: GameState): EventDef | null => {
    const eligible = events
      .filter((event) => game.chapter >= event.minChapter && game.chapter <= event.maxChapter)
      .filter((event) => !game.completedEvents.includes(event.id))
      .filter((event) => !event.requiresFlag || Boolean(game.flags[event.requiresFlag]))
      .filter((event) => !event.forbidsFlag || !game.flags[event.forbidsFlag]);
    return weightedPick(eligible.map((event) => ({ ...event, weight: event.weight })));
  };

  const capture = () => {
    const game = get().game;
    if (!game) return;
    set((state) => ({
      screen: 'gameover',
      game: { ...game, threat: 100, updatedAt: Date.now() },
      phoneOpen: false,
      activeCall: null,
      pendingEventId: null,
      finalOpen: false,
      toasts: []
    }));
    emitSfx('capture');
  };

  const resolveDawnWithEnding = (endingId: string) => {
    const game = get().game;
    if (!game) return;
    const ending = endingById[endingId] ? endingId : resolveEnding({ game, finalChoice: game.finalChoice });
    const next: GameState = {
      ...game,
      endingId: ending,
      nightMinute: 480,
      updatedAt: Date.now()
    };
    set({
      game: next,
      screen: 'ending',
      phoneOpen: false,
      activeCall: null,
      pendingEventId: null,
      finalOpen: false,
      toasts: []
    });
    emitSfx('ending');
    void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
  };

  return {
    screen: 'menu',
    game: null,
    settings: loadSettings(),
    introSlide: 0,
    phoneOpen: false,
    phoneTab: 'home',
    selectedContactId: null,
    activeCall: null,
    pendingEventId: null,
    finalOpen: false,
    modal: null,
    saves: [],
    savesLoading: false,
    toasts: [],

    notify,
    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    setScreen: (screen) => set({ screen }),
    setPhoneTab: (tab) => set({ phoneTab: tab }),
    selectContact: (id) => set({ selectedContactId: id }),
    openModal: (modal) => set({ modal }),
    closeModal: () => set({ modal: null }),
    updateSettings: (partial) => {
      const settings = { ...get().settings, ...partial };
      persistSettings(settings);
      const game = get().game;
      set({ settings, game: game ? { ...game, updatedAt: Date.now() } : game });
    },

    newGame: (difficulty) => {
      set({
        game: makeInitialGame(difficulty),
        screen: 'intro',
        introSlide: 0,
        phoneOpen: false,
        phoneTab: 'home',
        selectedContactId: null,
        activeCall: null,
        pendingEventId: null,
        finalOpen: false,
        modal: null
      });
      emitSfx('start');
    },

    setOrigin: (origin: Origin) => {
      const game = get().game;
      if (!game) return;
      const other = origin === 'work' ? 'appointment' : 'work';
      set({
        game: {
          ...game,
          origin,
          flags: {
            ...game.flags,
            [origin === 'work' ? 'origin_work' : 'origin_appointment']: true,
            [other === 'work' ? 'origin_work' : 'origin_appointment']: false
          },
          deliveredMessages: Array.from(
            new Set([
              ...game.deliveredMessages.filter((id) => id !== 'msg_origin_work' && id !== 'msg_origin_appointment'),
              origin === 'work' ? 'msg_origin_work' : 'msg_origin_appointment'
            ])
          )
        }
      });
      notify(
        origin === 'work'
          ? 'You lock the copy shop behind you. The last bus is already gone.'
          : 'The dinner ran late. You told Daniel you wanted to walk home alone.',
        'story'
      );
    },

    advanceIntro: () => {
      const slide = get().introSlide;
      if (slide >= 2) {
        get().finishIntro();
        return;
      }
      set({ introSlide: slide + 1 });
    },

    finishIntro: () => {
      const game = get().game;
      if (!game) return;
      const next = { ...game, updatedAt: Date.now() };
      set({ screen: 'game', introSlide: 0, game: next });
      notify('10:00 PM. Every step brings them closer. Call someone before the line goes quiet.', 'story');
      emitSfx('night-start');
      emitSfx('music-start');
      void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
    },

    openPhone: (tab = 'home') => {
      const state = get();
      if (!state.game || state.screen !== 'game' || state.pendingEventId || state.finalOpen) return;
      set({ phoneOpen: true, phoneTab: tab, modal: null });
      emitSfx('phone-open');
    },

    closePhone: () => {
      if (get().activeCall) {
        get().hangUpCall();
      }
      set({ phoneOpen: false, selectedContactId: null });
      emitSfx('phone-close');
    },

    startCall: (contactId) => {
      const state = get();
      const game = state.game;
      if (!game || state.screen !== 'game' || state.activeCall || state.pendingEventId || state.finalOpen) return;
      const contact = contactById[contactId];
      const contactState = game.contacts[contactId];
      if (!contact || !contactState) return;
      if (contact.unknown && !contactState.unlocked) {
        notify('The number is no longer in service.', 'danger');
        return;
      }
      const cost = contact.unknown ? 2 : Math.max(2, contact.callCost - (game.difficulty === 'story' ? 1 : 0));
      if (game.battery < cost) {
        notify('The phone battery is too low to call.', 'danger');
        emitSfx('battery-empty');
        return;
      }
      const call = preferredCallFor(contactId, game);
      let next = {
        ...game,
        battery: clamp(game.battery - cost, 0, 100),
        nightMinute: clamp(game.nightMinute + 1, 0, 480),
        stats: { ...game.stats, callsMade: game.stats.callsMade + 1 }
      };
      const sync = syncChapter(next, true);
      next = sync.game;
      set({
        game: next,
        activeCall: {
          callId: call?.id ?? '',
          contactId,
          nodeId: '',
          connected: false,
          startedAt: Date.now(),
          ringingStartedAt: Date.now(),
          choiceHistory: [],
          visitedNodes: [],
          answered: false
        },
        phoneOpen: true,
        phoneTab: 'contacts',
        selectedContactId: contactId
      });
      notify(call ? `Calling ${contact.shortName}…` : `${contact.shortName}’s line is unavailable.`, call ? 'phone' : 'danger');
      emitSfx('ring');
      if (game.difficulty === 'nightmare' && game.battery < 15 && chance(0.2)) {
        set({ activeCall: null });
        notify('The phone dies for a second. The call drops before it connects.', 'danger');
        emitSfx('interference');
      }
    },

    hangUpCall: () => {
      const runtime = get().activeCall;
      const game = get().game;
      if (!runtime || !game) {
        set({ activeCall: null });
        return;
      }
      let next = game;
      if (!runtime.answered) {
        next = updateContact(next, runtime.contactId, (entry) => ({
          ...entry,
          missed: entry.missed + 1,
          callCount: entry.callCount + 1,
          lastCallNight: game.nightMinute
        }));
        next = { ...next, stats: { ...next.stats, callsMissed: next.stats.callsMissed + 1 } };
        next = addHistory(next, runtime.contactId, 'missed', 'Cancelled before it connected.');
        notify('You end the call before it connects.', 'info');
      } else {
        finishCall(true);
        return;
      }
      set({ game: next, activeCall: null });
      emitSfx('hangup');
    },

    advanceCall: () => {
      const runtime = get().activeCall;
      const game = get().game;
      if (!runtime || !game || !runtime.answered) return;
      const call = callById[runtime.callId];
      const node = call?.nodes[runtime.nodeId];
      if (!call || !node) {
        finishCall();
        return;
      }
      if (!node.next) {
        finishCall();
        return;
      }
      const entered = enterCallNode(runtime, game, node.next);
      set({ game: entered.game, activeCall: entered.runtime });
      if (entered.captured) get().capture();
      if (entered.ending) get().resolveDawnWithEnding(entered.ending);
      if (entered.pendingCall) startScriptedCall(entered.pendingCall);
    },

    chooseCallChoice: (choiceId) => {
      const runtime = get().activeCall;
      const game = get().game;
      if (!runtime || !game) return;
      const call = callById[runtime.callId];
      const node = call?.nodes[runtime.nodeId];
      const choice = node?.choices?.find((entry) => entry.id === choiceId);
      if (!call || !node || !choice) return;
      const applied = applyEffects(game, choice.effects);
      const nextRuntime: CallRuntime = { ...runtime, choiceHistory: [...runtime.choiceHistory, choice.id] };
      if (choice.next) {
        const entered = enterCallNode(nextRuntime, applied.game, choice.next, true);
        set({ game: entered.game, activeCall: entered.runtime });
        if (entered.captured) get().capture();
        if (entered.ending) get().resolveDawnWithEnding(entered.ending);
        if (entered.pendingCall) startScriptedCall(entered.pendingCall);
      } else {
        set({ game: applied.game, activeCall: nextRuntime });
        finishCall();
      }
    },

    readMessage: (messageId) => {
      const game = get().game;
      if (!game || !game.deliveredMessages.includes(messageId) || game.readMessages.includes(messageId)) return;
      const message = messages.find((entry) => entry.id === messageId);
      if (!message) return;
      let next: GameState = { ...game, readMessages: [...game.readMessages, messageId] };
      if (message.effects?.length) {
        const applied = applyEffects(next, message.effects);
        next = applied.game;
        if (applied.captured) {
          set({ game: next });
          get().capture();
          return;
        }
        if (applied.ending) {
          set({ game: next });
          get().resolveDawnWithEnding(applied.ending);
          return;
        }
      }
      set({ game: next });
      emitSfx('message-read');
    },

    chooseEventChoice: (choiceId) => {
      const state = get();
      const game = state.game;
      const event = state.pendingEventId ? eventById[state.pendingEventId] : null;
      if (!game || !event) return;
      const choice = event.choices.find((entry) => entry.id === choiceId);
      if (!choice) return;
      const applied = applyEffects(game, choice.effects);
      let next: GameState = {
        ...applied.game,
        completedEvents: applied.game.completedEvents.includes(event.id)
          ? applied.game.completedEvents
          : [...applied.game.completedEvents, event.id],
        nextEventAt: applied.game.nightMinute + 17 + Math.round(Math.random() * 9)
      };
      const sync = syncChapter(next, true);
      next = sync.game;
      set({
        game: next,
        pendingEventId: null,
        activeCall: null
      });
      emitSfx('event-resolve');
      if (applied.captured) {
        get().capture();
        return;
      }
      if (applied.ending) {
        get().resolveDawnWithEnding(applied.ending);
        return;
      }
      notify('The street is quiet again. It is not the same quiet.', 'info');
      void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
      if (applied.pendingCall) {
        startScriptedCall(applied.pendingCall);
      }
    },

    chooseFinal: (choiceId) => {
      const game = get().game;
      if (!game) return;
      const choice = finalChoiceById[choiceId];
      if (!choice) return;
      if (choice.requiresFlag && !game.flags[choice.requiresFlag]) {
        notify('You do not have enough of the truth to choose that.', 'danger');
        return;
      }
      if (choice.requiresClues && game.clues.length < choice.requiresClues) {
        notify('You need more clues before you can follow the line.', 'danger');
        return;
      }
      let next: GameState = {
        ...game,
        nightMinute: clamp(game.nightMinute + choice.effects.minutes, 0, 480),
        threat: clamp(game.threat + choice.effects.threat, 0, 100),
        shieldSeconds: game.shieldSeconds + choice.effects.shield,
        finalChoice: choice.id,
        finalPhase: true,
        flags: { ...game.flags, home_reached: true },
        barricades: choice.effects.barricadeAll
          ? { front: true, back: true, windows: true }
          : game.barricades
      };
      for (const flag of choice.effects.flags) next.flags[flag] = true;
      if (choice.id === 'warn') {
        next.stats = { ...next.stats };
        for (const contact of contacts) {
          if (contact.unknown) continue;
          if (next.contacts[contact.id].trust < 4) continue;
          const warnedFlag = `warned_${contact.id}`;
          if (!next.flags[warnedFlag]) {
            next.flags[warnedFlag] = true;
            next.stats.contactsWarned += 1;
          }
        }
      }
      const sync = syncChapter(next, true);
      next = sync.game;
      set({ game: next, finalOpen: false });
      notify('The last call has been made. Survive until dawn.', 'story');
      emitSfx('final-choice');
      if (next.nightMinute >= 480) get().resolveDawn();
      void saveGame('auto', next).then(() => get().refreshSaves()).catch(() => undefined);
    },

    interact: (id) => {
      const state = get();
      const game = state.game;
      if (!game || state.phoneOpen || state.activeCall || state.pendingEventId || state.finalOpen || state.modal) return;
      const item = id ? interactables.find((entry) => entry.id === id) : nearestInteractable(game.player.x, game.player.y);
      if (!item) {
        notify('There is nothing to interact with here.', 'info');
        return;
      }
      if (Math.max(Math.abs(item.x - game.player.x), Math.abs(item.y - game.player.y)) > 1) {
        notify('You need to get closer.', 'info');
        return;
      }
      if (item.kind === 'home') {
        if (game.finalChoice) {
          notify('The decision is made. Stay at the porch until dawn.', 'info');
          return;
        }
        if (game.clues.length < HOME_CLUES_REQUIRED) {
          const missing = HOME_CLUES_REQUIRED - game.clues.length;
          notify(
            `The porch light stays off. You need ${missing} more piece${missing === 1 ? '' : 's'} of the road before the house will know you.`,
            'warning'
          );
          set({
            game: {
              ...game,
              flags: { ...game.flags, tried_home_early: true },
              updatedAt: Date.now()
            }
          });
          emitSfx('interact');
          return;
        }
        const skippedHours = game.nightMinute < 450;
        set({
          game: {
            ...game,
            nightMinute: Math.max(game.nightMinute, 450),
            chapter: Math.max(game.chapter, 5),
            flags: { ...game.flags, home_reached: true, last_hour_notified: true },
            updatedAt: Date.now()
          },
          phoneOpen: false,
          finalOpen: true
        });
        if (skippedHours) {
          notify('The road swallows the hours. It is 5:30 AM. The porch light comes on.', 'story');
        }
        emitSfx('final-call');
        return;
      }
      if (item.requiresFlag && !game.flags[item.requiresFlag]) {
        notify('You are not ready for that yet.', 'warning');
        return;
      }
      if (item.forbidsFlag && game.flags[item.forbidsFlag]) {
        notify('There is nothing more to do here.', 'info');
        return;
      }
      if (item.once && game.usedInteractions.includes(item.id)) {
        notify('You have already done that.', 'info');
        return;
      }
      if (item.maxUses && (game.interactionUses[item.id] ?? 0) >= item.maxUses) {
        notify('That is no longer useful.', 'info');
        return;
      }
      const applied = applyEffects(game, item.effects);
      let next = applied.game;
      next = {
        ...next,
        usedInteractions: item.once ? [...new Set([...next.usedInteractions, item.id])] : next.usedInteractions,
        interactionUses: item.maxUses
          ? { ...next.interactionUses, [item.id]: (next.interactionUses[item.id] ?? 0) + 1 }
          : next.interactionUses
      };
      const sync = syncChapter(next, true);
      next = sync.game;
      set({ game: next });
      notify(item.label, 'success');
      emitSfx('interact');
      if (applied.captured) get().capture();
      if (applied.ending) get().resolveDawnWithEnding(applied.ending);
    },

    interactNearest: () => {
      const game = get().game;
      if (!game) return;
      const item = nearestInteractable(game.player.x, game.player.y);
      if (!item) {
        notify('There is nothing within reach.', 'info');
        return;
      }
      get().interact(item.id);
    },

    movePlayer: (x, y) => {
      const state = get();
      const game = state.game;
      if (!game || state.screen !== 'game' || state.modal || state.pendingEventId || state.finalOpen || state.activeCall || state.phoneOpen) return false;
      if (!isWalkableTile(x, y)) return false;
      const shielded = game.shieldSteps > 0;
      const threat = shielded ? game.threat : clamp(game.threat + stepThreatFor(game, x, y), 0, 100);
      const next: GameState = {
        ...game,
        threat,
        shieldSteps: shielded ? game.shieldSteps - 1 : 0,
        idleSeconds: 0,
        player: { x, y, zone: zoneAt(x, y) },
        updatedAt: Date.now()
      };
      set({ game: next });
      if (threat >= 100) get().capture();
      return true;
    },

    toggleFlashlight: () => {
      const game = get().game;
      if (!game) return;
      if (!game.flashlightOwned) {
        notify('You do not have a flashlight.', 'info');
        return;
      }
      if (!game.flashlightOn && game.battery <= 1) {
        notify('The battery is dead.', 'danger');
        return;
      }
      set({
        game: { ...game, flashlightOn: !game.flashlightOn, updatedAt: Date.now() }
      });
      emitSfx('flashlight');
    },

    tick: (deltaSeconds) => {
      const state = get();
      const game = state.game;
      if (!game || state.screen !== 'game' || state.modal || state.pendingEventId || state.finalOpen) return;
      const dt = Math.max(0, Math.min(5, deltaSeconds));

      if (state.activeCall && !state.activeCall.answered && Date.now() - state.activeCall.ringingStartedAt >= 2300) {
        resolveRinging();
        return;
      }

      let next: GameState = {
        ...game,
        playTime: game.playTime + dt,
        idleSeconds: game.idleSeconds + dt,
        stats: { ...game.stats }
      };
      const rate = minutesPerSecond(game.difficulty) * (game.finalPhase ? 1.35 : 1);
      next.nightMinute = clamp(next.nightMinute + rate * dt, 0, 480);

      let battery = next.battery;
      if (next.flashlightOn) {
        battery = clamp(battery - 0.09 * dt, 0, 100);
        if (battery <= 0) next.flashlightOn = false;
      }
      next.battery = battery;

      const connected = Boolean(state.activeCall?.answered);
      const threatTick = tickThreat(next, dt, connected);
      next.threat = threatTick.threat;
      next.shieldSeconds = threatTick.shieldSeconds;
      if (next.threat >= 80) next.stats.secondsAtHighThreat += dt;

      const chapter = chapterForNightMinute(next.nightMinute);
      if (chapter !== next.chapter) {
        next.chapter = chapter;
        const def = chapterById[chapter];
        if (def) notify(`${def.timeLabel} — ${def.title}`, 'story');
        emitSfx('chapter');
        void saveGame('auto', next).catch(() => undefined);
      }

      if (!next.finalChoice && next.nightMinute >= 450 && !next.flags.last_hour_notified) {
        next.flags = { ...next.flags, last_hour_notified: true };
        notify('5:30 AM. The porch light is on. Get home and make the last call.', 'story');
        emitSfx('final-call');
      }

      if (next.nightMinute >= 480) {
        if (!next.finalChoice) {
          set({ game: next });
          get().resolveDawnWithEnding('shadows_win');
          return;
        }
        set({ game: next });
        get().resolveDawn();
        return;
      }

      if (threatTick.captured || next.threat >= 100) {
        set({ game: { ...next, threat: 100 } });
        get().capture();
        return;
      }

      if (!state.activeCall && !state.pendingEventId && next.nightMinute >= next.nextEventAt) {
        const event = pickEvent(next);
        if (event) {
          next.nextEventAt = next.nightMinute + 17 + Math.round(Math.random() * 9);
          set({ game: next, pendingEventId: event.id });
          emitSfx(event.incoming ? 'ring' : 'event');
          return;
        }
        next.nextEventAt = Math.max(next.nextEventAt + 14, 60);
      }

      if (threatTick.stage > stageForThreat(game.threat)) {
        emitSfx('danger');
      }
      set({ game: next });
    },

    resolveDawn: () => {
      const game = get().game;
      if (!game) return;
      const ending = resolveEnding({ game, finalChoice: game.finalChoice });
      resolveDawnWithEnding(ending);
    },

    resolveDawnWithEnding,

    capture,

    saveToSlot: async (slot) => {
      const game = get().game;
      if (!game) return;
      await saveGame(slot, game);
      await get().refreshSaves();
      notify(`Saved to ${slot === 'auto' ? 'autosave' : slot.replace('slot', 'slot ')}.`, 'success');
    },

    loadFromSlot: async (slot) => {
      const result = await loadGame(slot);
      if ('error' in result) {
        notify(result.error, 'danger');
        return;
      }
      const game = result.game;
      set({
        game,
        screen: game.endingId ? 'ending' : 'game',
        settings: { ...get().settings },
        phoneOpen: false,
        phoneTab: 'home',
        selectedContactId: null,
        activeCall: null,
        pendingEventId: null,
        finalOpen: false,
        modal: null,
        introSlide: 0
      });
      emitSfx('load');
      notify('Chronicle loaded.', 'success');
    },

    continueGame: async () => {
      await get().refreshSaves();
      const save = await latestSave();
      if (!save) {
        notify('No saved night was found.', 'warning');
        return;
      }
      await get().loadFromSlot(save.slot);
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
      set({
        screen: 'menu',
        game: null,
        phoneOpen: false,
        phoneTab: 'home',
        selectedContactId: null,
        activeCall: null,
        pendingEventId: null,
        finalOpen: false,
        modal: null,
        introSlide: 0,
        toasts: []
      });
      emitSfx('menu');
      void get().refreshSaves();
    },

    newGameAgain: () => {
      const game = get().game;
      const difficulty = game?.difficulty ?? 'normal';
      get().newGame(difficulty);
    },

    toast: notify
  };
});

export interface GameStore {
  screen: 'menu' | 'intro' | 'game' | 'gameover' | 'ending';
  game: GameState | null;
  settings: GameSettings;
  introSlide: number;
  phoneOpen: boolean;
  phoneTab: PhoneTab;
  selectedContactId: ContactId | null;
  activeCall: CallRuntime | null;
  pendingEventId: string | null;
  finalOpen: boolean;
  modal: ModalKind;
  saves: import('@/core/types').SaveMeta[];
  savesLoading: boolean;
  toasts: Toast[];

  notify: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  setScreen: (screen: GameStore['screen']) => void;
  setOrigin: (origin: Origin) => void;
  setPhoneTab: (tab: PhoneTab) => void;
  selectContact: (id: ContactId | null) => void;
  openModal: (modal: ModalKind) => void;
  closeModal: () => void;
  updateSettings: (partial: Partial<GameSettings>) => void;
  newGame: (difficulty: Difficulty) => void;
  advanceIntro: () => void;
  finishIntro: () => void;
  openPhone: (tab?: PhoneTab) => void;
  closePhone: () => void;
  startCall: (contactId: ContactId) => void;
  hangUpCall: () => void;
  advanceCall: () => void;
  chooseCallChoice: (choiceId: string) => void;
  readMessage: (messageId: string) => void;
  chooseEventChoice: (choiceId: string) => void;
  chooseFinal: (choiceId: string) => void;
  interact: (id?: string) => void;
  interactNearest: () => void;
  movePlayer: (x: number, y: number) => boolean;
  toggleFlashlight: () => void;
  tick: (deltaSeconds: number) => void;
  resolveDawn: () => void;
  resolveDawnWithEnding: (endingId: string) => void;
  capture: () => void;
  saveToSlot: (slot: string) => Promise<void>;
  loadFromSlot: (slot: string) => Promise<void>;
  continueGame: () => Promise<void>;
  deleteSlot: (slot: string) => Promise<void>;
  refreshSaves: () => Promise<void>;
  autosave: () => void;
  goToMenu: () => void;
  newGameAgain: () => void;
  toast: (text: string, kind?: Toast['kind']) => void;
}

export const chapterObjective = (game: GameState): string => {
  if (game.finalChoice === 'run') return 'Run. Do not let the street catch you before dawn.';
  if (game.finalChoice) return 'Survive until 6:00 AM. Keep the line alive.';
  if (game.nightMinute >= 450) return 'Get to the front door. The porch light is on.';
  return chapters[game.chapter]?.objective ?? 'Get home before 6:00 AM.';
};

export const homeBlockDistance = (game: GameState): number =>
  Math.ceil(distanceToHome(game.player.x, game.player.y) / 3);

export const shadowGap = (game: GameState): number => shadowStepsBehind(game);

export const atHomeDoor = (game: GameState): boolean =>
  Math.max(Math.abs(game.player.x - HOME_DOOR.x), Math.abs(game.player.y - HOME_DOOR.y)) <= 1;

export const threatStage = (game: GameState) => stageInfo(game.threat);

export const unreadMessages = (game: GameState): number =>
  game.deliveredMessages.filter((id) => !game.readMessages.includes(id)).length;

export const contactLineStatus = (game: GameState, contactId: ContactId) => {
  const contact = contactById[contactId];
  const state = game.contacts[contactId];
  if (!contact || !state) return { key: 'locked' as const, label: 'No signal' };
  return contactStatus(contact, state, game);
};

export const contactThreatProtection = (game: GameState, contactId: ContactId) => {
  const contact = contactById[contactId];
  const state = game.contacts[contactId];
  if (!contact || !state) return null;
  return protectionFromCall(contact, state, game);
};

export const availableContactCalls = (game: GameState, contactId: ContactId): CallDef[] =>
  availableCallsFor(contactId, game);

export const callDefFor = (callId: string) => callById[callId] ?? null;
