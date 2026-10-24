function quotaLeft(state) {
  return Math.max(0, state.quota.owed - state.quota.paid);
}

function villagerAlive(state, id) {
  return !!state.villagers.find((v) => v.id === id && v.alive);
}

export const STORY_EVENTS = [
  {
    id: 'sable',
    chapter: 2,
    markerId: 'sable',
    title: 'Sable waits at the gate',
    sub: 'The clerk has opened a second ledger.',
    prompt: 'Speak to Sable',
    condition: (state) => !state.flags.sableOfferSeen && villagerAlive(state, 'sable')
  },
  {
    id: 'funeral',
    chapter: 2,
    markerId: 'nessa',
    title: 'Nessa rings the chapel bell',
    sub: 'Someone must be buried twice.',
    prompt: 'Nessa rings the bell',
    condition: (state) => (
      state.stats.deaths > 0 &&
      !state.flags.funeralDone &&
      villagerAlive(state, 'nessa')
    )
  },
  {
    id: 'audit',
    chapter: 3,
    location: 'gate',
    title: 'The auditor is waiting',
    sub: 'He has brought a list of names that should not exist.',
    prompt: 'Meet Auditor Crane',
    condition: (state) => !state.flags.auditDone && villagerAlive(state, 'sable')
  },
  {
    id: 'perrin',
    chapter: 3,
    markerId: 'perrin',
    title: 'Perrin Ash has come home',
    sub: 'Nel\'s father wants to take her to the city.',
    prompt: 'Speak to Perrin',
    condition: (state) => (
      !state.flags.perrinDone &&
      villagerAlive(state, 'perrin') &&
      state.flags.nelStatus === 'home'
    )
  },
  {
    id: 'charter',
    chapter: 3,
    location: 'charter',
    title: 'The Charter House is open',
    sub: 'Mother Ottil has found the first page.',
    prompt: 'Enter the Charter House',
    condition: (state) => (
      !state.flags.charterDone &&
      villagerAlive(state, 'ottil')
    )
  },
  {
    id: 'orin',
    chapter: 4,
    markerId: 'orin',
    title: 'The last keeper is awake',
    sub: 'He remembers the Collector\'s first name.',
    prompt: 'Speak to Orin',
    condition: (state) => (
      !state.flags.orinDone &&
      villagerAlive(state, 'orin')
    )
  },
  {
    id: 'ferry',
    chapter: 4,
    markerId: 'joss',
    title: 'Joss is waiting at the dock',
    sub: 'The ferry is not on the city\'s ledger.',
    prompt: 'Speak to Joss',
    condition: (state) => (
      !state.flags.ferryDone &&
      villagerAlive(state, 'joss')
    )
  },
  {
    id: 'nomination',
    chapter: 4,
    location: 'gate',
    title: 'The village has chosen',
    sub: 'They want to send Nel to the city.',
    prompt: 'Hear the council',
    condition: (state) => (
      quotaLeft(state) <= 0 &&
      !state.flags.nominationDone
    )
  },
  {
    id: 'parley',
    chapter: 5,
    location: 'charter',
    title: 'The council will negotiate',
    sub: 'Auditor Crane has returned with a writ.',
    prompt: 'Meet the council',
    condition: (state) => !state.flags.parleyDone
  }
];

export function getActiveEvents(state) {
  if (!state) return [];
  return STORY_EVENTS.filter((event) => {
    const chapterOpen = event.id === 'nomination'
      ? state.chapter === event.chapter
      : state.chapter >= event.chapter;
    return chapterOpen && event.condition(state);
  });
}

export function eventForVillager(state, villagerId) {
  return getActiveEvents(state).find((event) => event.markerId === villagerId) || null;
}

export function eventForLocation(state, kind) {
  return getActiveEvents(state).find((event) => event.location === kind) || null;
}

export function firstActiveEvent(state) {
  return getActiveEvents(state)[0] || null;
}
