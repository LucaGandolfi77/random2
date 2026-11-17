/* Spin Rush: a 60-second score chase with an escalating multiplier. */
import { RUSH } from '../config.js';
import { creditWin } from '../state.js';

export const id = 'rush';
export const name = 'Spin Rush';
export const icon = '⚡';
export const desc = 'Sixty seconds. Turbo spins. A multiplier that climbs every ten seconds.';
export const rules = `
  <p class="sub">Spins run automatically at turbo speed. Every 10 seconds the score
  multiplier increases. Your score is the sum of all wins × the multiplier at the
  time. Chase your personal best — no credits are wagered.</p>`;
export const wager = false;
export const chain = true;
export const limit = null;
export const duration = RUSH.duration;

export function canEnter() { return { ok: true }; }

export function start(state) {
  return {
    startedAt: 0,
    elapsed: 0,
    score: 0,
    spins: 0,
    best: state.modes.rush.best || 0,
    multiplier: 1,
    done: false,
  };
}

export function onSpin(state, session, info) {
  if (!session) return null;
  session.spins++;
  session.score += info.gross * session.multiplier;
  return { status: `RUSH · ${session.score.toLocaleString()} PTS · ×${session.multiplier}` };
}

export function onTick(state, session, elapsed) {
  session.elapsed = elapsed;
  const step = Math.min(Math.floor(elapsed / RUSH.step), RUSH.multipliers.length - 1);
  session.multiplier = RUSH.multipliers[step];
  const left = Math.max(0, Math.ceil(RUSH.duration - elapsed));
  session.done = elapsed >= RUSH.duration;
  return {
    status: `RUSH ${left}s · ×${session.multiplier} · ${session.score.toLocaleString()} PTS`,
    done: session.done,
  };
}

export function finish(state, session) {
  const score = Math.floor(session.score);
  const best = Math.max(score, state.modes.rush.best || 0);
  const reward = Math.max(50, Math.floor(score * RUSH.rewardPerPoint));
  creditWin(state, reward);
  state.modes.rush.best = best;
  state.modes.rush.runs++;
  state.modes.rush.last = score;
  state.stats.rushes++;
  if (score >= 5000 && !state.trophies.includes('rush')) state.trophies.push('rush');
  return {
    title: 'Spin Rush Complete',
    html: `<div class="big-prize">${score.toLocaleString()}</div>
      <p>${session.spins} spins · reward <b>${reward.toLocaleString()}</b> credits.</p>
      <p class="sub">Personal best: <b>${best.toLocaleString()}</b>. ${score >= best ? 'New record! 🎉' : ''}</p>
      <button class="btn primary wide" data-action="close">Collect</button>`,
  };
}
