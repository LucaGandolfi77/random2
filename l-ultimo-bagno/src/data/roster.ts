import type { EnvironmentKind } from './types';

const sheep = Array.from({ length: 17 }, (_, index) => `sheep${index + 1}`);

export const ENVIRONMENT_ROSTER: Record<EnvironmentKind, readonly string[]> = {
  piazza: ['arturo', 'gino'],
  alley: [
    'arturo',
    'gino',
    'bride',
    'groom',
    'photographer',
    'cyclist',
    'dogman',
    'dog',
  ],
  park: ['arturo', 'gino', 'instructor', 'yogi1', 'yogi2', 'yogi3'],
  road: ['arturo', 'gino', 'astronomer1', 'astronomer2'],
  countryside: ['arturo', 'gino', 'shepherd', ...sheep],
  hill: ['arturo', 'gino', 'director', 'cameraman', 'boom', 'pa'],
  hillDawn: ['arturo', 'gino'],
};

export const ENVIRONMENT_LABELS: Record<EnvironmentKind, string> = {
  piazza: 'La piazza',
  alley: 'I vicoli',
  park: 'Il parco',
  road: 'La strada provinciale',
  countryside: 'La campagna',
  hill: 'La collina',
  hillDawn: "L'alba",
};

export const DEFAULT_AMBIENCE: Record<EnvironmentKind, string> = {
  piazza: 'cityNight',
  alley: 'alleyNight',
  park: 'parkNight',
  road: 'roadNight',
  countryside: 'countryNight',
  hill: 'hillNight',
  hillDawn: 'hillDawn',
};
