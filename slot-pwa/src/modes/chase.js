/* Jackpot Chase — fill a personal meter within 15 spins. */
import { panel, finishRun, fmt, progressBar } from './helpers.js';

const TARGET = 6000;

export const id = 'chase';
export const name = 'Jackpot Chase';
export const icon = '🪙';
export const desc = 'Fifteen spins to fill the personal jackpot meter.';
export const rules = `
  <p class="sub">Each wager adds to the meter and every win adds more. Fill it
  before your 15 spins run out for the full payout — partial fills still pay.</p>`;
export const wager = true;
export const chain = false;
export const limit = 15;
export const duration = null;

export function canEnter() { return { ok: true }; }

export function start() {
  return { meter: 0, target: TARGET, spinsLeft: limit, filled: false, done: false };
}

export function onSpin(state, session, info) {
  session.meter += info.cost * 0.5 + info.gross;
  session.spinsLeft--;
  session.filled = session.meter >= session.target;
  session.done = session.spinsLeft <= 0 || session.filled;
  return {
    status: session.filled
      ? `JACKPOT! ${fmt(session.meter)} / ${fmt(session.target)}`
      : `CHASE · ${fmt(session.meter)} / ${fmt(session.target)} · ${session.spinsLeft} LEFT`,
    done: session.done,
  };
}

export function onTick() { return null; }

export function finish(state, session) {
  const pct = Math.min(1, session.meter / session.target);
  const reward = finishRun(state, 'chase', 'chase', session.meter, 0.5, session.filled ? 2000 : 0);
  return panel(session.filled ? 'Jackpot Cracked!' : 'Chase Complete',
    session.filled ? 'JACKPOT' : `${Math.round(pct * 100)}%`, [
      `Meter: <b>${fmt(session.meter)} / ${fmt(session.target)}</b>`,
      `Payout: <b>${fmt(reward)}</b> credits`,
    ], progressBar(session.meter, session.target));
}
