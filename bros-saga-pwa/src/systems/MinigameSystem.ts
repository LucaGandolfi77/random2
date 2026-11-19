import { MINIGAME_BY_ID } from '../data/minigames';
import type { MinigameDef, MinigameId, MinigameView } from '../game/types';

export interface MinigameReward { coins: number; bp: number; badge?: string; item?: string; won: boolean }

export class MinigameSystem {
  def: MinigameDef | null = null;
  phase: 'ready' | 'play' | 'result' = 'ready';
  time = 0;
  score = 0;
  target = 6;
  cursor = 0;
  cursorDir = 1;
  zone = 0.5;
  hits = 0;
  missed = 0;
  message = '';
  rewardCoins = 0;
  rewardBp = 0;
  private speed = 1;
  private lastA = true;

  constructor(private onEnd: (reward: MinigameReward) => void) {}

  start(id: MinigameId) {
    this.def = MINIGAME_BY_ID[id];
    this.phase = 'play';
    this.time = this.def.seconds;
    this.score = 0;
    this.target = id === 'hammertoss' ? 8 : id === 'cardmatch' ? 6 : 7;
    this.cursor = 0;
    this.cursorDir = 1;
    this.zone = 0.5;
    this.hits = 0;
    this.missed = 0;
    this.message = this.def.instruction;
    this.speed = id === 'hammertoss' ? 1.8 : id === 'jumprope' ? 1.35 : 1;
    this.lastA = true;
  }

  cancel() { this.phase = 'ready'; this.def = null; }

  press(useA = true): boolean {
    if (this.phase !== 'play' || !this.def) return false;
    const wantA = this.def.id !== 'jumprope' || this.lastA === false;
    const alternated = this.def.id !== 'jumprope' || useA === wantA;
    const good = alternated && Math.abs(this.cursor - this.zone) < (this.def.id === 'hammertoss' ? 0.12 : 0.16);
    if (this.def.id === 'jumprope') this.lastA = useA;
    if (good) {
      this.score++;
      this.hits++;
      this.message = 'NICE!';
      this.zone = 0.22 + Math.random() * 0.56;
    } else {
      this.missed++;
      this.message = alternated ? 'Miss!' : 'Alternate A and B!';
    }
    if (this.score >= this.target) this.finish(true);
    return good;
  }

  update(dt: number) {
    if (this.phase !== 'play') return;
    this.time = Math.max(0, this.time - dt);
    this.cursor += this.cursorDir * dt * this.speed;
    if (this.cursor >= 1) { this.cursor = 1; this.cursorDir = -1; }
    if (this.cursor <= 0) { this.cursor = 0; this.cursorDir = 1; }
    if (this.time <= 0) this.finish(this.score >= this.target);
  }

  private finish(won: boolean) {
    this.phase = 'result';
    const r = this.def!.reward;
    const ratio = won ? 1 : Math.max(0.2, this.score / this.target);
    this.rewardCoins = Math.round(r.coins * ratio);
    this.rewardBp = won ? r.bp : 0;
    this.message = won ? 'MINI-GAME CLEAR!' : 'Time is up!';
    this.onEnd({
      coins: this.rewardCoins,
      bp: this.rewardBp,
      badge: won ? r.badge : undefined,
      item: won ? r.item : undefined,
      won
    });
  }

  get view(): MinigameView {
    return {
      id: this.def?.id ?? 'coinrush',
      phase: this.phase,
      time: this.time,
      score: this.score,
      target: this.target,
      cursor: this.cursor,
      hits: this.hits,
      missed: this.missed,
      message: this.message,
      rewardCoins: this.rewardCoins,
      rewardBp: this.rewardBp
    };
  }
}
