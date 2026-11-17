/* Weekly seeded tournament: 10 spins, deterministic rivals, prize ladder. */
import { TOURNAMENT, weekKey, todayKey } from '../config.js';
import { dailySeed, mulberry32 } from '../rng.js';
import { creditWin } from '../state.js';

export const id = 'tournament';
export const name = 'Tournament';
export const icon = '🏆';
export const desc = 'Ten spins against the same rivals as everyone else this week.';
export const rules = `
  <p class="sub">Every player gets the same rival scores for the week. Play 10 spins
  on any unlocked machine; your score is the sum of your wins. Finish in the top 3
  to earn the <b>Champion</b> trophy.</p>
  <p class="sub">One run per machine per week. Spins cost credits; free spins apply.</p>`;
export const wager = true;
export const chain = true;
export const limit = TOURNAMENT.spins;
export const duration = null;

function buildRivals(week, machineId) {
  const r = mulberry32(dailySeed(week, machineId));
  return Array.from({ length: TOURNAMENT.rivals }, (_, i) => ({
    name: ['NEONFOX', 'REELKING', 'CHERRY7', 'MEGASPIN', 'LUCKYDUCK', 'JOKER', 'VIOLET', 'GOLDRUSH'][i],
    score: Math.round((700 + r() * 5200) / 10) * 10,
  })).sort((a, b) => b.score - a.score);
}

export function canEnter(state, machine, ctx) {
  const wk = weekKey();
  const key = `${wk}:${machine.id}`;
  if (state.modes.tournament.results[key]) {
    return { ok: false, reason: 'Already played this tournament this week.' };
  }
  return { ok: true };
}

export function start(state, machine) {
  const wk = weekKey();
  return {
    week: wk,
    machineId: machine.id,
    spinsLeft: TOURNAMENT.spins,
    score: 0,
    rivals: buildRivals(wk, machine.id),
    done: false,
  };
}

export function onSpin(state, session, info) {
  if (!session || !session.rivals) return null;
  session.score += info.gross;
  session.spinsLeft--;
  const rank = 1 + session.rivals.filter((r) => r.score > session.score).length;
  session.done = session.spinsLeft <= 0;
  return {
    status: `${session.spinsLeft} SPINS LEFT · ${session.score.toLocaleString()} PTS · RANK #${rank}`,
    done: session.done,
  };
}

export function onTick() { return null; }

export function finish(state, session, ctx) {
  const wk = session.week;
  const key = `${wk}:${session.machineId}`;
  if (state.modes.tournament.results[key]) return null;
  const rank = 1 + session.rivals.filter((r) => r.score > session.score).length;
  const reward = TOURNAMENT.prizeLadder[Math.min(rank, TOURNAMENT.prizeLadder.length) - 1];
  creditWin(state, reward);
  state.modes.tournament.results[key] = { rank, score: session.score, reward, date: todayKey() };
  state.stats.tournaments++;
  const top3 = rank <= 3;
  if (top3 && !state.trophies.includes('tourney')) state.trophies.push('tourney');
  const rows = [
    { name: 'YOU', score: session.score, you: true },
    ...session.rivals,
  ].sort((a, b) => b.score - a.score);
  const board = rows.map((r, i) =>
    `<div class="leader-row ${r.you ? 'you' : ''}"><span>#${i + 1}</span><b>${r.name}</b><span>${r.score.toLocaleString()}</span></div>`).join('');
  return {
    title: `Tournament · #${rank}`,
    html: `<div class="big-prize">#${rank}</div><p>You scored <b>${session.score.toLocaleString()}</b> points and won <b>${reward.toLocaleString()}</b> credits.</p>
      ${top3 ? '<p class="gold">🏆 Champion trophy unlocked!</p>' : ''}
      <h3>Final leaderboard</h3><div class="leaderboard">${board}</div>
      <button class="btn primary wide" data-action="close">Collect</button>`,
  };
}
