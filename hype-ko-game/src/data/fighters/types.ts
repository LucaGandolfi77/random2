import type { CombatFighterDefinition } from '../../game/combat/types';
import type { Appearance, Palette } from '../../game/fighters/appearance';

export interface FighterDefinition extends CombatFighterDefinition {
  archetype: string;
  edition: 'italian' | 'international';
  bio: string;
  appearance: Appearance;
  palette: Palette;
  ai: {
    aggression: number;
    defense: number;
    combo: number;
    special: number;
  };
  rivalries: string[];
  quotes: {
    intro: string;
    victory: string;
    defeat: string;
  };
  victoryTitle: string;
  musicMotif: string;
}
