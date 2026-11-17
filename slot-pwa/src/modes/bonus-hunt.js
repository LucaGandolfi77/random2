/* Bonus Hunt — points come only from spins that trigger a bonus feature. */
import { panel, finishRun, fmt } from './helpers.js';

export const id = 'bonus-hunt';
export const name = 'Bonus Hunt';
export const icon = '🎁';
export const desc = 'Twelve spins. Only bonus-triggering wins score.';
export const rules = `
  <p class="sub">Land scatters, clover lines or Hold & Win coins. Every feature
  you trigger turns that spin's win into points. The more bonuses, the bigger
  the final payout.</p>`;
export const wager = true;
export const chain = false;
export const limit = 12;
export const duration = null;

export function canEnter() { return { ok: true }; }

export function start(state) {
  return { spinsLeft: limit, score: 0, bonuses: 0, lastBonus: 0, done: false };
}

export function onSpin(state, session, info) {
  const triggers = info.result.jackpotTriggers || [];
  const hit = triggers.length > 0;
  if (hit) {
    session.bonuses++;
    session.lastBonus = info.gross;
    session.score += info.gross;
  }
  session.spinsLeft--;
  session.done = session.spinsLeft <= 0;
  return {
    status: hit
      ? `BONUS! +${fmt(info.gross)} · ${session.bonuses} HITS · ${session.spinsLeft} LEFT`
      : `HUNTING BONUS · ${session.bonuses} HITS · ${session.spinsLeft} LEFT`,
    done: session.done,
  };
}

export function onTick() { return null; }

export function finish(state, session) {
  if (!session.bonuses) return panel('Bonus Hunt', 'NO BONUSES', ['Scatters and clover lines trigger features.']);
  const reward = finishRun(state, 'bonusHunt', 'bonus-hunt', session.score, 1.2, session.bonuses * 200);
  return panel('Bonus Hunt Complete', `${session.bonuses} BONUSES`, [
    `Bonus points: <b>${fmt(session.score)}</b>`,
    `Final payout: <b>${fmt(reward)}</b> credits`,
  ]);
}
