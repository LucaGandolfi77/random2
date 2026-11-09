import type { ContactId, GameState } from '@/core/types';
import { CONTACT_ORDER } from '@/core/types';
import { contacts } from '@/data/contacts';
import { makeContactState } from '@/systems/calls';

export const makeGame = (overrides: Partial<GameState> = {}): GameState => {
  const contactState = {} as GameState['contacts'];
  for (const id of CONTACT_ORDER) {
    const contact = contacts.find((entry) => entry.id === id);
    contactState[id] = makeContactState(contact?.trustStart ?? 5, id !== 'unknown');
  }
  const base: GameState = {
    version: 2,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    difficulty: 'normal',
    origin: 'work',
    nightMinute: 0,
    chapter: 0,
    threat: 6,
    shieldSeconds: 0,
    shieldSteps: 0,
    idleSeconds: 0,
    battery: 100,
    contacts: contactState,
    callHistory: [],
    readMessages: [],
    deliveredMessages: [],
    flags: {},
    clues: [],
    clueNotes: {},
    completedEvents: [],
    usedInteractions: [],
    interactionUses: {},
    player: { x: 10, y: 28, zone: 'work' },
    flashlightOwned: false,
    flashlightOn: false,
    powerOn: true,
    barricades: { front: false, back: false, windows: false },
    finalChoice: null,
    finalPhase: false,
    nextEventAt: 34,
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
  };
  return {
    ...base,
    ...overrides,
    contacts: { ...base.contacts, ...(overrides.contacts ?? {}) },
    flags: { ...base.flags, ...(overrides.flags ?? {}) },
    stats: { ...base.stats, ...(overrides.stats ?? {}) },
    barricades: { ...base.barricades, ...(overrides.barricades ?? {}) },
    player: { ...base.player, ...(overrides.player ?? {}) }
  };
};

export const answerAllContacts = (game: GameState, count = 4, trust = 7): GameState => {
  const contactsState = { ...game.contacts };
  const ids: ContactId[] = ['sophie', 'mom', 'dad', 'daniel', 'alex', 'jessica', 'mike', 'priya'];
  for (const id of ids.slice(0, count)) {
    contactsState[id] = { ...contactsState[id], answered: 1, trust };
  }
  return { ...game, contacts: contactsState };
};
