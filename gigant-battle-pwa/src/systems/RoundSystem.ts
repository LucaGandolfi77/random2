import { ROUND_SECONDS } from '../game/constants';
import type { Fighter } from '../entities/Fighter';

export type RoundPhase = 'intro' | 'fight' | 'ko' | 'matchEnd';
export type Team = 'player' | 'enemy';

export interface RoundEvent {
  banner?: string;
  sound?: string;
  type?: 'fight' | 'ko' | 'roundEnd' | 'matchEnd';
  winner?: Team;
}

export class RoundSystem {
  round = 1;
  wins: [number, number] = [0, 0];
  timer = ROUND_SECONDS;
  phase: RoundPhase = 'intro';
  phaseTime = 0;
  lastWinner: Team | null = null;
  matchWinner: Team | null = null;
  private announced = false;

  reset() {
    this.round = 1;
    this.wins = [0, 0];
    this.timer = ROUND_SECONDS;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.lastWinner = null;
    this.matchWinner = null;
    this.announced = false;
  }

  private startRound(): RoundEvent {
    this.timer = ROUND_SECONDS;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.announced = false;
    return { banner: `ROUND ${this.round}`, sound: 'round' };
  }

  update(dt: number, player: Fighter, enemy: Fighter): RoundEvent | null {
    this.phaseTime += dt;
    if (this.phase === 'intro') {
      if (this.phaseTime > 0.5 && !this.announced) {
        this.announced = true;
        return { banner: 'FIGHT!', sound: 'fight', type: 'fight' };
      }
      if (this.phaseTime > 1.25) { this.phase = 'fight'; this.phaseTime = 0; }
      return null;
    }
    if (this.phase === 'fight') {
      this.timer = Math.max(0, this.timer - dt);
      if (!player.alive || !enemy.alive || this.timer <= 0) {
        let winner: Team;
        if (player.alive && !enemy.alive) winner = 'player';
        else if (!player.alive && enemy.alive) winner = 'enemy';
        else if (!player.alive && !enemy.alive) winner = 'enemy';
        else winner = player.hp >= enemy.hp ? 'player' : 'enemy';
        this.lastWinner = winner;
        this.wins[winner === 'player' ? 0 : 1]++;
        this.phase = 'ko';
        this.phaseTime = 0;
        return { banner: this.timer <= 0 ? 'TIME UP' : 'K.O.', sound: 'ko', type: 'ko', winner };
      }
      return null;
    }
    if (this.phase === 'ko') {
      if (this.phaseTime > 2.3) {
        if (this.wins[0] >= 2 || this.wins[1] >= 2) {
          this.matchWinner = this.wins[0] >= 2 ? 'player' : 'enemy';
          this.phase = 'matchEnd';
          this.phaseTime = 0;
          return { banner: this.matchWinner === 'player' ? 'YOU WIN!' : 'YOU LOSE', sound: this.matchWinner === 'player' ? 'win' : 'lose', type: 'matchEnd', winner: this.matchWinner };
        }
        this.round++;
        return this.startRound();
      }
      return null;
    }
    return null;
  }

  get fighting() { return this.phase === 'fight'; }
}
