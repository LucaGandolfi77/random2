import { CONFIG } from '../game/GameConfig';
import type { GameState } from '../game/GameState';

export type ThreatLevel = 'SAFE' | 'WATCHED' | 'APPROACHING' | 'INSIDE' | 'CRITICAL' | 'CAPTURE';

export function threatLevel(value: number): ThreatLevel {
  if (value >= 100) return 'CAPTURE';
  if (value >= 80) return 'CRITICAL';
  if (value >= 60) return 'INSIDE';
  if (value >= 40) return 'APPROACHING';
  if (value >= 20) return 'WATCHED';
  return 'SAFE';
}

export const THREAT_TEXT: Record<ThreatLevel, string> = {
  SAFE: 'The house is quiet. For now.',
  WATCHED: 'Something is watching from outside.',
  APPROACHING: 'It is getting closer. Keep talking.',
  INSIDE: 'They are in the house. Lock the doors.',
  CRITICAL: 'It knows where you are. Do NOT hang up.',
  CAPTURE: 'It found you.'
};

export const THREAT_WARNINGS: Record<ThreatLevel, string> = {
  SAFE: '',
  WATCHED: 'A silhouette moves past the window.',
  APPROACHING: 'Scratching at the glass. Somewhere in the house, a door creaks.',
  INSIDE: 'They are inside. Secure the doors and keep the line open.',
  CRITICAL: 'Footsteps right behind you. Talk. Now.',
  CAPTURE: 'A hand closes over your mouth.'
};

export class ThreatSystem {
  lastLevel: ThreatLevel = 'SAFE';

  update(dt: number, state: GameState, connected: boolean, proximity = 0): ThreatLevel | null {
    if (state.phase !== 'playing') return null;
    if (state.shieldSec > 0) state.shieldSec = Math.max(0, state.shieldSec - dt);

    const protected_ = connected || state.shieldSec > 0;
    let rate = state.chapterData.threatRate * state.difficultyFactor.threat;
    if (protected_) rate *= connected ? 0.12 : 0.32;
    if (state.hasFlag('watcher_knowledge') && protected_) rate *= 0.85;
    rate += proximity * 0.28;

    state.threat = Math.min(CONFIG.threatMax, Math.max(0, state.threat + rate * dt));
    const level = threatLevel(state.threat);
    const changed = level !== this.lastLevel;
    this.lastLevel = level;
    return changed ? level : null;
  }

  change(state: GameState, delta: number) {
    state.threat = Math.min(CONFIG.threatMax, Math.max(0, state.threat + delta));
  }

  shield(state: GameState, seconds: number) {
    state.shieldSec = Math.max(state.shieldSec, Math.min(seconds, 90));
  }
}
