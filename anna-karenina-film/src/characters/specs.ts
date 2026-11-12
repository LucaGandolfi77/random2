import type { CharacterId } from '../data/types';

export interface CharacterSpec {
  character: CharacterId;
  label: string;
  body: 'female' | 'male' | 'broad' | 'child' | 'silhouette';
  outfit: 'gown' | 'uniform' | 'frock' | 'country' | 'nightshirt' | 'society';
  hairStyle: 'chignon' | 'short' | 'curls' | 'beard' | 'cap' | 'none';
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  dress: string;
  dressShade: string;
  trim: string;
  accent: string;
  eye: string;
  lips: string;
  features: {
    glasses?: boolean;
    cameo?: boolean;
    epaulettes?: boolean;
    fur?: boolean;
    beard?: boolean;
    cap?: boolean;
    sash?: boolean;
    medals?: boolean;
    nightdress?: boolean;
    looseHair?: boolean;
  };
}

const ANNA: CharacterSpec = {
  character: 'anna',
  label: 'Anna',
  body: 'female',
  outfit: 'gown',
  hairStyle: 'chignon',
  skin: '#e7d1c0',
  skinShade: '#c3a38f',
  hair: '#5b2b24',
  hairShade: '#32130f',
  dress: '#6b1c29',
  dressShade: '#3b0b13',
  trim: '#c8a15b',
  accent: '#a93646',
  eye: '#2c1b1a',
  lips: '#93414d',
  features: { cameo: true }
};

const VRONSKY: CharacterSpec = {
  character: 'vronsky',
  label: 'Vronskij',
  body: 'male',
  outfit: 'uniform',
  hairStyle: 'short',
  skin: '#e2c7b3',
  skinShade: '#bd9982',
  hair: '#c7a366',
  hairShade: '#8a6638',
  dress: '#e9e3d6',
  dressShade: '#b6b7b4',
  trim: '#b58c4f',
  accent: '#2d4e73',
  eye: '#3b4b58',
  lips: '#9c6d61',
  features: { epaulettes: true, sash: true, medals: true }
};

const KARENIN: CharacterSpec = {
  character: 'karenin',
  label: 'Karenin',
  body: 'male',
  outfit: 'frock',
  hairStyle: 'short',
  skin: '#d8c2b1',
  skinShade: '#b39784',
  hair: '#8a8b86',
  hairShade: '#5e605d',
  dress: '#202721',
  dressShade: '#101512',
  trim: '#5f6c5f',
  accent: '#3d4c40',
  eye: '#434a45',
  lips: '#8a6b62',
  features: { glasses: true }
};

const KITTY: CharacterSpec = {
  character: 'kitty',
  label: 'Kitty',
  body: 'female',
  outfit: 'gown',
  hairStyle: 'curls',
  skin: '#efd8ca',
  skinShade: '#ceb09f',
  hair: '#d6b77a',
  hairShade: '#a7834b',
  dress: '#b9d2e1',
  dressShade: '#87a7bb',
  trim: '#e9e3d4',
  accent: '#d5a2aa',
  eye: '#476174',
  lips: '#b65f6b',
  features: {}
};

const LEVIN: CharacterSpec = {
  character: 'levin',
  label: 'Levin',
  body: 'broad',
  outfit: 'country',
  hairStyle: 'beard',
  skin: '#d8bca4',
  skinShade: '#b6967d',
  hair: '#694932',
  hairShade: '#3c291a',
  dress: '#4a3d2b',
  dressShade: '#292319',
  trim: '#8a7250',
  accent: '#68764a',
  eye: '#4b3a2a',
  lips: '#906a5a',
  features: { beard: true }
};

const SERYOZHA: CharacterSpec = {
  character: 'seryozha',
  label: 'Seryozha',
  body: 'child',
  outfit: 'nightshirt',
  hairStyle: 'short',
  skin: '#ecd3c1',
  skinShade: '#c9aa95',
  hair: '#5a3629',
  hairShade: '#341f18',
  dress: '#e4ded2',
  dressShade: '#c0b7a8',
  trim: '#d6cdbd',
  accent: '#b9aa94',
  eye: '#3b2a22',
  lips: '#a96e64',
  features: { nightdress: true }
};

const STATIONMASTER: CharacterSpec = {
  character: 'stationmaster',
  label: 'Capostazione',
  body: 'male',
  outfit: 'frock',
  hairStyle: 'cap',
  hair: '#8d857a',
  hairShade: '#5f5a52',
  skin: '#c8ac95',
  skinShade: '#a48670',
  dress: '#363c41',
  dressShade: '#1f2428',
  trim: '#8a6c3e',
  accent: '#a8afb3',
  eye: '#3e3b36',
  lips: '#886457',
  features: { cap: true, beard: true }
};

const SOCIETY: CharacterSpec = {
  character: 'society',
  label: 'Società',
  body: 'silhouette',
  outfit: 'society',
  hairStyle: 'none',
  skin: '#202228',
  skinShade: '#0c0e12',
  hair: '#15171c',
  hairShade: '#080a0d',
  dress: '#1c1e24',
  dressShade: '#0a0c10',
  trim: '#7b684a',
  accent: '#907348',
  eye: '#101217',
  lips: '#1b1d22',
  features: {}
};

const BASE: Record<CharacterId, CharacterSpec> = {
  anna: ANNA,
  vronsky: VRONSKY,
  karenin: KARENIN,
  kitty: KITTY,
  levin: LEVIN,
  seryozha: SERYOZHA,
  stationmaster: STATIONMASTER,
  society: SOCIETY
};

const VARIANTS: Partial<Record<CharacterId, Record<string, Partial<CharacterSpec>>>> = {
  anna: {
    gown: {},
    winter: {
      dress: '#253141',
      dressShade: '#111925',
      trim: '#a8b4be',
      accent: '#5f7388',
      features: { cameo: true, fur: true }
    },
    travel: {
      dress: '#3b3e44',
      dressShade: '#202228',
      trim: '#8d7b62',
      accent: '#6a5a49',
      features: { cameo: true, fur: false }
    },
    night: {
      dress: '#d9cfc1',
      dressShade: '#b3a595',
      trim: '#c8b7a0',
      accent: '#b68b7b',
      features: { cameo: false, nightdress: true, looseHair: true }
    },
    wedding: {
      dress: '#e9e2d3',
      dressShade: '#c6bba6',
      trim: '#c8a15b',
      accent: '#d7c7a8',
      features: { cameo: true }
    },
    landing: {
      dress: '#6b1c29',
      dressShade: '#350910',
      trim: '#c8a15b',
      accent: '#a93646',
      features: { cameo: true, fur: true }
    }
  },
  vronsky: {
    uniform: {},
    civilian: {
      outfit: 'frock',
      dress: '#252b34',
      dressShade: '#12161d',
      trim: '#7d6b53',
      accent: '#3d4b5c',
      features: { medals: false, epaulettes: false, sash: false }
    },
    riding: {
      outfit: 'uniform',
      dress: '#e5dfd2',
      dressShade: '#b0b1ad',
      trim: '#b58b4c',
      accent: '#2d4e73',
      features: { epaulettes: true, sash: true, medals: true }
    }
  },
  karenin: {
    frock: {},
    overcoat: {
      dress: '#1c201e',
      dressShade: '#0d100e',
      trim: '#4a534a'
    }
  },
  kitty: {
    ball: {},
    country: {
      dress: '#d9d2b8',
      dressShade: '#aaa283',
      trim: '#f0e8cf',
      accent: '#8a9a68',
      outfit: 'country'
    },
    winter: {
      dress: '#6e7e8c',
      dressShade: '#445260',
      trim: '#d6d7cf',
      accent: '#8ca0ae',
      features: { fur: true }
    }
  },
  levin: {
    country: {},
    formal: {
      outfit: 'frock',
      dress: '#2c332d',
      dressShade: '#161b17',
      trim: '#6f6a54',
      accent: '#4c5a3d'
    }
  },
  seryozha: {
    night: {},
    day: {
      dress: '#d7c8b2',
      dressShade: '#b3a48e',
      trim: '#c7b89f',
      accent: '#8d7b61',
      features: { nightdress: false }
    }
  },
  stationmaster: {
    winter: {}
  },
  society: {
    a: {},
    b: {
      dress: '#24262c',
      dressShade: '#0e1014',
      trim: '#6d5d43'
    },
    c: {
      dress: '#292a2f',
      dressShade: '#101216',
      trim: '#88714e'
    }
  }
};

export function getCharacterSpec(character: CharacterId, variant?: string): CharacterSpec {
  const base = BASE[character];
  const overrides = variant ? VARIANTS[character]?.[variant] : undefined;
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    features: { ...base.features, ...(overrides.features ?? {}) }
  };
}

export const CHARACTER_IDS: CharacterId[] = [
  'anna',
  'vronsky',
  'karenin',
  'kitty',
  'levin',
  'seryozha',
  'stationmaster',
  'society'
];

export const ALL_SPECS = CHARACTER_IDS.map((id) => BASE[id]);
