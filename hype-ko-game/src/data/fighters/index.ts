import { fighter808Nero } from './808nero';
import { fighterAceTurbo } from './aceturbo';
import { fighterCommentina } from './commentina';
import { fighterCuoreStorto } from './cuorestorto';
import { fighterFashionError } from './fashionerror';
import { fighterGlitchetta } from './glitchetta';
import { fighterHoneyBadge } from './honeybadge';
import { fighterIlCoro } from './ilcoro';
import { fighterMrTrailer } from './mrtrailer';
import { fighterNocturna } from './nocturna';
import { fighterNpc404 } from './npc404';
import { fighterReinaRitmo } from './reinari';
import { fighterTastieraNera } from './tastieranera';
import { fighterTheBrand } from './thebrand';
import { fighterVelvetVera } from './velvetvera';
import { fighterZiaLive } from './zialive';
import type { FighterDefinition } from './types';

export const FIGHTERS: FighterDefinition[] = [
  fighter808Nero,
  fighterTastieraNera,
  fighterVelvetVera,
  fighterCuoreStorto,
  fighterCommentina,
  fighterZiaLive,
  fighterIlCoro,
  fighterFashionError,
  fighterReinaRitmo,
  fighterGlitchetta,
  fighterHoneyBadge,
  fighterNocturna,
  fighterMrTrailer,
  fighterTheBrand,
  fighterAceTurbo,
  fighterNpc404
];

export const FIGHTER_BY_ID: Record<string, FighterDefinition> = Object.fromEntries(
  FIGHTERS.map((fighter) => [fighter.id, fighter])
);

export function getFighter(id: string): FighterDefinition {
  return FIGHTER_BY_ID[id] ?? FIGHTERS[0];
}

export function getRandomFighter(exclude?: string): FighterDefinition {
  const pool = exclude ? FIGHTERS.filter((f) => f.id !== exclude) : FIGHTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export type { FighterDefinition } from './types';
