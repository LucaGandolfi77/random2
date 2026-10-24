export const CONSENT_LABEL = {
  willing: 'Willing',
  unaware: 'Does not know',
  refuses: 'Refuses',
  protected: 'Protected'
};

export const CONSENT_NOTE = {
  willing: 'They have already agreed.',
  unaware: 'They do not know they are pledged.',
  refuses: 'They refuse. You can still take it.',
  protected: 'The ledger stays shut.'
};

export const VILLAGERS = [
  {
    id: 'maren',
    name: 'Maren Holt',
    age: 62,
    years: 4,
    role: 'Baker',
    consent: 'willing',
    trust: 2,
    seed: 11,
    hair: 'bun',
    tone: 0,
    epitaph: 'She fed the village before she fed herself.',
    favor: {
      id: 'bread',
      name: 'Fresh Bread',
      effect: 'heal',
      power: 25,
      text: 'She wrapped it while it was still warm.'
    }
  },
  {
    id: 'ivo',
    name: 'Ivo Pike',
    age: 19,
    years: 50,
    role: 'Ferry boy',
    consent: 'unaware',
    trust: 1,
    seed: 23,
    hair: 'mess',
    tone: 1,
    epitaph: 'He never knew what his mornings were worth.',
    favor: {
      id: 'whistle',
      name: 'Ferry Whistle',
      effect: 'skip',
      power: 1,
      text: 'A long note across the water. The hollows pause.'
    }
  },
  {
    id: 'wick',
    name: 'Old Wick',
    age: 80,
    years: 1,
    role: 'Well-keeper',
    consent: 'willing',
    trust: 2,
    seed: 37,
    hair: 'bald',
    tone: 2,
    epitaph: 'He gave the last year twice.',
    favor: {
      id: 'water',
      name: 'Well Water',
      effect: 'heal',
      power: 15,
      text: 'Cold and honest. It tastes of stone.'
    }
  },
  {
    id: 'sable',
    name: 'Sable Vey',
    age: 30,
    years: 22,
    role: 'Collector\'s clerk',
    consent: 'refuses',
    trust: 0,
    seed: 41,
    hair: 'short',
    tone: 3,
    epitaph: 'She kept the books and never her own name.',
    favor: {
      id: 'paper',
      name: 'Stamped Paper',
      effect: 'skip',
      power: 1,
      text: 'A form in triplicate. Even the hollows must comply.'
    }
  },
  {
    id: 'mayor',
    name: 'Alderman Rusk',
    age: 58,
    years: 2,
    role: 'Mayor',
    consent: 'willing',
    trust: 1,
    seed: 53,
    hair: 'slick',
    tone: 4,
    epitaph: 'He signed first and paid last.',
    favor: {
      id: 'key',
      name: 'Ledger Key',
      effect: 'flee',
      power: 1,
      text: 'The gate opens. The ledger follows anyway.'
    }
  },
  {
    id: 'nessa',
    name: 'Nessa Ward',
    age: 44,
    years: 18,
    role: 'Chapel sister',
    consent: 'willing',
    trust: 2,
    seed: 67,
    hair: 'veil',
    tone: 5,
    epitaph: 'She counted the dead as her own.',
    favor: {
      id: 'vigil',
      name: 'A Vigil',
      effect: 'heal',
      power: 45,
      text: 'She says every name she knows. You stand up straighter.'
    }
  },
  {
    id: 'tomas',
    name: 'Tomas Reed',
    age: 27,
    years: 12,
    role: 'Gate guard',
    consent: 'unaware',
    trust: 1,
    seed: 71,
    hair: 'helmet',
    tone: 1,
    epitaph: 'He guarded a gate that had already sold him.',
    favor: {
      id: 'gatekey',
      name: 'Gate Key',
      effect: 'flee',
      power: 1,
      text: 'The gate opens. You leave. The ledger is patient.'
    }
  },
  {
    id: 'lira',
    name: 'Lira Mott',
    age: 35,
    years: 8,
    role: 'Seamstress',
    consent: 'refuses',
    trust: 1,
    seed: 83,
    hair: 'braid',
    tone: 3,
    epitaph: 'She sewed the shroud and wore it.',
    favor: {
      id: 'coat',
      name: 'Warm Coat',
      effect: 'healMax',
      power: 10,
      text: 'Sewn for someone else. It fits you anyway.'
    }
  },
  {
    id: 'nel',
    name: 'Nel Ash',
    age: 9,
    years: 60,
    role: 'Child',
    consent: 'protected',
    trust: 2,
    seed: 97,
    hair: 'ribbon',
    tone: 0,
    epitaph: 'The ledger never learned her name.',
    favor: {
      id: 'ribbon',
      name: 'A Ribbon',
      effect: 'years',
      power: 5,
      text: 'She ties it on your wrist. You feel a year come back.'
    }
  },
  {
    id: 'perrin',
    name: 'Perrin Ash',
    age: 38,
    years: 20,
    role: 'Dockhand',
    consent: 'unaware',
    trust: 1,
    seed: 113,
    hair: 'mess',
    tone: 2,
    epitaph: 'He sold his years for a boat and stayed on the dock.',
    favor: {
      id: 'token',
      name: 'Ferry Token',
      effect: 'flee',
      power: 1,
      text: 'A brass token for a crossing the city does not know about.'
    }
  },
  {
    id: 'joss',
    name: 'Joss Vey',
    age: 24,
    years: 14,
    role: 'Ferryman',
    consent: 'unaware',
    trust: 1,
    seed: 127,
    hair: 'short',
    tone: 3,
    epitaph: 'He took the river because the road was owned.',
    favor: {
      id: 'blackferry',
      name: 'Black Ferry',
      effect: 'flee',
      power: 1,
      text: 'The river opens. The boat does not ask who paid.'
    }
  },
  {
    id: 'ottil',
    name: 'Mother Ottil',
    age: 71,
    years: 6,
    role: 'Archivist',
    consent: 'willing',
    trust: 2,
    seed: 139,
    hair: 'bun',
    tone: 4,
    epitaph: 'She kept the first page and the last word.',
    favor: {
      id: 'firstpage',
      name: 'The First Page',
      effect: 'skip',
      power: 1,
      text: 'A clause older than the gate. The hollows hesitate to read it.'
    }
  },
  {
    id: 'orin',
    name: 'Orin Vale',
    age: 84,
    years: 1,
    role: 'Last keeper',
    consent: 'willing',
    trust: 2,
    seed: 151,
    hair: 'bald',
    tone: 5,
    epitaph: 'He counted eighty years and gave the last one away.',
    favor: {
      id: 'ring',
      name: 'Keeper\'s Ring',
      effect: 'healMax',
      power: 10,
      text: 'A plain ring, warm from a hand that has stopped counting.'
    }
  }
];

export const SPECIAL_SPEAKERS = {
  narrator: '',
  you: 'Wren',
  sable: 'Sable Vey',
  collector: 'The Collector',
  crane: 'Auditor Crane',
  contract: 'The Contract',
  ledger: 'The Ledger'
};

export function speakerName(who) {
  if (SPECIAL_SPEAKERS[who] !== undefined) return SPECIAL_SPEAKERS[who];
  const villager = VILLAGERS.find((v) => v.id === who);
  return villager ? villager.name : who;
}

export function villagerById(id) {
  return VILLAGERS.find((v) => v.id === id) || null;
}
