import type { GameModeId } from '../game/combat/types';
import type { AIDifficulty } from '../game/ai';

export interface CharacterSelection {
  playerFighters: string[];
  opponentFighters: string[];
}

export interface MatchSetup {
  mode: GameModeId;
  playerFighter: string;
  opponentFighter: string;
  playerTeam?: string[];
  opponentTeam?: string[];
  rumbleFighters?: string[];
  stageId: string;
  roundsToWin: number;
  roundTime: number;
  difficulty: AIDifficulty;
  localVersus?: boolean;
}

export type Screen =
  | 'menu'
  | 'select'
  | 'stage'
  | 'loading'
  | 'match'
  | 'results'
  | 'tournament'
  | 'missions'
  | 'settings'
  | 'profile'
  | 'leaderboard'
  | 'online'
  | 'credits';

export interface MatchOptions {
  stageId: string;
  roundsToWin: number;
  roundTime: number;
  difficulty: AIDifficulty;
  localVersus: boolean;
}
