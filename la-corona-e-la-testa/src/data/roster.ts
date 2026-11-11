import type { EnvironmentKind } from './types';

export const ENVIRONMENT_ROSTER: Record<EnvironmentKind, readonly string[]> = {
  court: ['donnino', 'massimiano', 'cristiano', 'cortigiano', 'guardia1', 'guardia2'],
  crossroads: ['donnino', 'oste', 'centurione', 'soldato'],
  viaEmilia: ['donnino', 'contadino', 'bambino', 'soldato', 'cane'],
  stirone: ['donnino', 'centurione', 'soldato', 'carnefice'],
  stironeDawn: ['donnino', 'vedova'],
  fidenza: ['maestro', 'apprendista', 'pellegrino', 'bambino'],
};

export const ENVIRONMENT_LABELS: Record<EnvironmentKind, string> = {
  court: 'La corte',
  crossroads: 'Le vie consolari',
  viaEmilia: 'La Via Emilia',
  stirone: 'Lo Stirone',
  stironeDawn: "L'alba sullo Stirone",
  fidenza: 'La città',
};

export const DEFAULT_AMBIENCE: Record<EnvironmentKind, string> = {
  court: 'court',
  crossroads: 'crossroadsNight',
  viaEmilia: 'viaDay',
  stirone: 'riverDusk',
  stironeDawn: 'riverDawn',
  fidenza: 'borgo',
};

export const FOOTSTEP_CHARACTERS = new Set([
  'donnino',
  'massimiano',
  'cristiano',
  'cortigiano',
  'guardia1',
  'guardia2',
  'oste',
  'centurione',
  'soldato',
  'contadino',
  'bambino',
  'vedova',
  'maestro',
  'apprendista',
  'pellegrino',
]);
