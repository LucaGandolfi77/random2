/* Cascade Challenge — score only from tumbling cascades. */
import { panel, finishRun, fmt } from './helpers.js';

export const id = 'cascade';
export const name = 'Cascade Challenge';
export const icon = '🔗';
export const desc = 'Ten spins. Chain tumbles for escalating points.';
export const rules = `
  <p class="sub">Every tumble multiplies its win. This mode scores your best
  cascade length and the wins it produced — long chains are everything.</p>`;
export const wager = true;
export const chain = false;
export const limit = 10;
export const duration = null;

export function canEnter() { return { ok: true }; }

export function start() {
  return { spinsLeft: limit, score: 0, best: 0, chains: 0, done: false };
}

export function onSpin(state, session, info) {
  const steps = info.result.bestCascade || 0;
  if (steps > 0) {
    session.chains++;
    session.best = Math.max(session.best, steps);
    session.score += Math.round(info.gross * steps);
  }
  session.spinsLeft--;
  session.done = session.spinsLeft <= 0;
  return {
    status: steps > 1
      ? `CASCADE ×${steps} · ${fmt(session.score)} PTS · ${session.spinsLeft} LEFT`
      : `CHAIN BUILDING · ${fmt(session.score)} PTS · ${session.spinsLeft} LEFT`,
    done: session.done,
  };
}

export function onTick() { return null; }

export function finish(state, session) {
  if (!session.chains) return panel('Cascade Challenge', 'NO CHAINS', ['Land a winning spin to start a tumble.']);
  const reward = finishRun(state, 'cascade', 'cascade', session.score, 1, session.best * 100);
  return panel('Cascade Challenge', `×${session.best}`, [
    `${session.chains} cascading spins · <b>${fmt(session.score)}</b> points`,
    `Reward: <b>${fmt(reward)}</b> credits`,
  ]);
}
