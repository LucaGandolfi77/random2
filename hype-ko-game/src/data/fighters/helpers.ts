import {
  createBaseMoves,
  finisherMove,
  makeHypeBreaker
} from '../../game/combat/moves';
import type { FighterStats, MoveDef } from '../../game/combat/types';
import type { Appearance, Palette } from '../../game/fighters/appearance';
import type { FighterDefinition } from './types';

export interface FighterConfig {
  id: string;
  name: string;
  subtitle: string;
  archetype: string;
  edition: 'italian' | 'international';
  bio: string;
  stats: FighterStats;
  height: number;
  weight: number;
  appearance: Appearance;
  palette?: Partial<Palette>;
  ai?: Partial<FighterDefinition['ai']>;
  rivalries?: string[];
  quotes: FighterDefinition['quotes'];
  victoryTitle: string;
  musicMotif: string;
  special1: MoveDef;
  special2: MoveDef;
  superMove: MoveDef;
  finisherName: string;
  hypeName?: string;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function defineFighter(config: FighterConfig): FighterDefinition {
  const base = createBaseMoves(config.stats);
  const hype = makeHypeBreaker(config.hypeName ?? `${config.name.toUpperCase()} BREAKER`);
  const finisher = finisherMove(slug(config.finisherName), config.finisherName);
  const moves: Record<string, MoveDef> = {
    ...base,
    [config.special1.id]: config.special1,
    [config.special2.id]: config.special2,
    [config.superMove.id]: config.superMove,
    [hype.id]: hype,
    [finisher.id]: finisher
  };
  const palette: Palette = {
    primary: config.appearance.primary,
    secondary: config.appearance.secondary,
    accent: config.appearance.accent,
    aura: config.appearance.aura,
    ...config.palette
  };
  return {
    id: config.id,
    name: config.name,
    subtitle: config.subtitle,
    archetype: config.archetype,
    edition: config.edition,
    bio: config.bio,
    stats: config.stats,
    height: config.height,
    weight: config.weight,
    appearance: config.appearance,
    palette,
    moves,
    specials: { s1: config.special1.id, s2: config.special2.id },
    superMove: config.superMove.id,
    finisher: finisher.id,
    hypeBreaker: hype.id,
    ai: {
      aggression: config.ai?.aggression ?? 0.6,
      defense: config.ai?.defense ?? 0.55,
      combo: config.ai?.combo ?? 0.55,
      special: config.ai?.special ?? 0.5
    },
    rivalries: config.rivalries ?? [],
    quotes: config.quotes,
    victoryTitle: config.victoryTitle,
    musicMotif: config.musicMotif
  };
}
