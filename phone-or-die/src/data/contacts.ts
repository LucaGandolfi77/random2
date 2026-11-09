import type { ContactDef } from '@/core/types';

export const contacts: ContactDef[] = [
  {
    id: 'sophie',
    name: 'Sophie Hale',
    shortName: 'Sophie',
    relationship: 'Best friend',
    description:
      'Emma’s oldest friend and the only person who still calls her at odd hours just to hear her voice. Sophie works nights at a crisis line, so she is used to keeping frightened people talking.',
    personality: 'Warm, sharp-tongued, relentlessly practical about feelings.',
    portrait: {
      seed: 101,
      skin: '#d6b08e',
      hair: '#5a2f27',
      hairStyle: 2,
      eyes: '#5f7c68',
      outfit: '#42354a',
      accent: '#d09b78',
      background: '#1a1520'
    },
    color: '#d9a978',
    windows: [{ from: 0, to: 480 }],
    baseAnswerChance: 0.92,
    callCost: 4,
    threatRelief: 16,
    protectionSeconds: 65,
    trustStart: 7,
    special: 'Calms Emma quickly and holds the dark street back.',
    secret: 'She has been receiving the same anonymous message for three nights.'
  },
  {
    id: 'mom',
    name: 'Elaine Mercer',
    shortName: 'Mom',
    relationship: 'Mother',
    description:
      'Protective, stubborn, and convinced she can solve any crisis by driving over with soup. She has been asking Emma to come home for months.',
    personality: 'Loving, anxious, quick to take control.',
    portrait: {
      seed: 102,
      skin: '#c99e7a',
      hair: '#6f5a4b',
      hairStyle: 4,
      eyes: '#6e5b45',
      outfit: '#4c403b',
      accent: '#b48c65',
      background: '#1d1714'
    },
    color: '#c89b77',
    windows: [
      { from: 0, to: 110 },
      { from: 285, to: 480 }
    ],
    baseAnswerChance: 0.78,
    callCost: 5,
    threatRelief: 22,
    protectionSeconds: 78,
    trustStart: 8,
    special: 'Strong emotional protection, but she becomes harder to reach after midnight.',
    secret: 'She knows the house. She lived in it before Emma was born.'
  },
  {
    id: 'dad',
    name: 'Robert Mercer',
    shortName: 'Dad',
    relationship: 'Father',
    description:
      'A retired electrician who expresses affection through instructions, flashlights, and checking the breaker box twice. He does not believe in ghosts. He does believe in locking doors.',
    personality: 'Practical, dry, quietly protective.',
    portrait: {
      seed: 103,
      skin: '#b98f70',
      hair: '#8a8378',
      hairStyle: 0,
      eyes: '#59605c',
      outfit: '#3e4a46',
      accent: '#8ca19b',
      background: '#11191a'
    },
    color: '#8ba7a0',
    windows: [
      { from: 0, to: 100 },
      { from: 250, to: 480 }
    ],
    baseAnswerChance: 0.76,
    callCost: 4,
    threatRelief: 18,
    protectionSeconds: 58,
    trustStart: 6,
    special: 'Reveals how to keep the streetlights on and use the flashlight.',
    secret: 'He hides a set of old house keys in the garden shed.'
  },
  {
    id: 'daniel',
    name: 'Daniel Reyes',
    shortName: 'Daniel',
    relationship: 'Boyfriend',
    description:
      'Emma’s boyfriend of two years. He was supposed to walk her home tonight and did not. His messages stopped around sunset. He sounds farther away each time he answers.',
    personality: 'Gentle, evasive, frightened of being known.',
    portrait: {
      seed: 104,
      skin: '#b07f5e',
      hair: '#2d211d',
      hairStyle: 3,
      eyes: '#71603f',
      outfit: '#332f3e',
      accent: '#916f52',
      background: '#14131b'
    },
    color: '#a17f63',
    windows: [
      { from: 0, to: 150 },
      { from: 260, to: 420 }
    ],
    baseAnswerChance: 0.7,
    callCost: 5,
    threatRelief: 20,
    protectionSeconds: 60,
    trustStart: 6,
    special: 'Unlocks a private story event and a crucial truth about the road home.',
    secret: 'He has been inside the house tonight. He cannot explain how.'
  },
  {
    id: 'alex',
    name: 'Alex Chen',
    shortName: 'Alex',
    relationship: 'Childhood friend',
    description:
      'Alex collects local legends the way other people collect receipts. They know every story about the old roads around Mercer Park, including the one Emma’s family never told her.',
    personality: 'Curious, irreverent, unexpectedly brave.',
    portrait: {
      seed: 105,
      skin: '#d3ac87',
      hair: '#201a1d',
      hairStyle: 4,
      eyes: '#374a48',
      outfit: '#3d4034',
      accent: '#a0a16e',
      background: '#171813'
    },
    color: '#ada16b',
    windows: [{ from: 50, to: 330 }],
    baseAnswerChance: 0.67,
    callCost: 4,
    threatRelief: 15,
    protectionSeconds: 55,
    trustStart: 5,
    special: 'Reveals the Quiet’s rules and the dark shortcuts to avoid.',
    secret: 'They have seen the creatures before. They drew one as a child.'
  },
  {
    id: 'jessica',
    name: 'Jessica Mercer',
    shortName: 'Jessica',
    relationship: 'Older sister',
    description:
      'Emma’s older sister left home at nineteen and never explained why. She answers with long silences and facts she should not know about tonight.',
    personality: 'Guarded, matter-of-fact, carrying an old grief.',
    portrait: {
      seed: 106,
      skin: '#c49878',
      hair: '#3f2b26',
      hairStyle: 1,
      eyes: '#7b6a52',
      outfit: '#4c3a3b',
      accent: '#a9746a',
      background: '#1b1416'
    },
    color: '#ba7d70',
    windows: [{ from: 120, to: 390 }],
    baseAnswerChance: 0.72,
    callCost: 4,
    threatRelief: 18,
    protectionSeconds: 62,
    trustStart: 4,
    special: 'Family secrets about the old line. Unlocks a secret ending path.',
    secret: 'She remembers a night in this house that Emma does not.'
  },
  {
    id: 'mike',
    name: 'Mike Boyd',
    shortName: 'Mike',
    relationship: 'Neighbor',
    description:
      'Mike lives across the road, owns too many flashlights, and is always awake when he should not be. He is not brave, but he is useful.',
    personality: 'Blunt, nervous, loyal once convinced.',
    portrait: {
      seed: 107,
      skin: '#b88a68',
      hair: '#4b3b30',
      hairStyle: 0,
      eyes: '#5d5f4c',
      outfit: '#3d4a52',
      accent: '#7b939d',
      background: '#10171b'
    },
    color: '#7c9ba1',
    windows: [
      { from: 0, to: 80 },
      { from: 300, to: 480 }
    ],
    baseAnswerChance: 0.62,
    callCost: 4,
    threatRelief: 24,
    protectionSeconds: 72,
    trustStart: 4,
    special: 'Can turn on his porch lights and provide physical help on the road.',
    secret: 'He saw Emma’s father leaving the house at midnight. Or thinks he did.'
  },
  {
    id: 'priya',
    name: 'Priya Nair',
    shortName: 'Priya',
    relationship: 'Coworker',
    description:
      'Priya writes true-crime research for a living and has a memory for patterns. She answers Emma’s call because she was already awake, mapping the same anonymous message against old disappearances.',
    personality: 'Analytical, candid, steady under pressure.',
    portrait: {
      seed: 108,
      skin: '#a97a57',
      hair: '#1b1719',
      hairStyle: 3,
      eyes: '#4c5c45',
      outfit: '#403249',
      accent: '#9f7da6',
      background: '#19131d'
    },
    color: '#a584ad',
    windows: [{ from: 90, to: 450 }],
    baseAnswerChance: 0.74,
    callCost: 4,
    threatRelief: 19,
    protectionSeconds: 66,
    trustStart: 4,
    special: 'Connects scattered clues and explains the pattern behind the route.',
    secret: 'She has found six identical disappearances linked to night roads and old telephone lines.'
  },
  {
    id: 'unknown',
    name: 'UNKNOWN NUMBER',
    shortName: 'Unknown',
    relationship: 'Unknown caller',
    description:
      'No profile picture. No area code. It does not show up in Emma’s contacts. When it rings, the room goes quiet before she answers.',
    personality: 'Calm. Patient. Certain.',
    portrait: {
      seed: 109,
      skin: '#cfd2d5',
      hair: '#d9dadb',
      hairStyle: 5,
      eyes: '#d8b45d',
      outfit: '#161417',
      accent: '#b3443c',
      background: '#080909'
    },
    color: '#b04a42',
    windows: [{ from: 0, to: 480 }],
    baseAnswerChance: 1,
    callCost: 2,
    threatRelief: 30,
    protectionSeconds: 95,
    trustStart: 0,
    special: 'Massive relief, unpredictable consequences, and the secret ending path.',
    secret: 'It knows the exact time Emma will die.',
    unknown: true
  }
];

export const contactById = Object.fromEntries(contacts.map((contact) => [contact.id, contact]));

export const emmaPortrait: import('@/core/types').PortraitSpec = {
  seed: 100,
  skin: '#d3ad8d',
  hair: '#4d2b26',
  hairStyle: 2,
  eyes: '#63785f',
  outfit: '#3e4a3d',
  accent: '#b68b5f',
  background: '#161315'
};

export const narratorPortrait: import('@/core/types').PortraitSpec = {
  seed: 0,
  skin: '#b9ab95',
  hair: '#211d1d',
  hairStyle: 5,
  eyes: '#c8b276',
  outfit: '#1a181a',
  accent: '#a47648',
  background: '#080809'
};

export const portraitFor = (key: string | undefined): import('@/core/types').PortraitSpec => {
  if (!key || key === 'narrator') return narratorPortrait;
  if (key === 'emma') return emmaPortrait;
  if (key === 'unknown') return contactById.unknown.portrait;
  return contactById[key as keyof typeof contactById]?.portrait ?? narratorPortrait;
};
