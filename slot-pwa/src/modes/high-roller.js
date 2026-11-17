/* High Roller — VIP 5+ table with forced max bet and prestige rewards. */
import { panel, finishRun, fmt } from './helpers.js';

export const id = 'high-roller';
export const name = 'High Roller';
export const icon = '💎';
export const desc = 'VIP 5+ table. Max bet only, prestige on every win.';
export const rules = `
  <p class="sub">The bet is forced to the maximum for this machine. Every win
  earns prestige, and features earn double. A VIP 5+ table with the biggest
  swings in the arcade.</p>`;
export const wager = true;
export const chain = false;
export const limit = 10;
export const duration = null;
export const minVip = 5;

export function canEnter(state, machine, ctx) {
  const vip = ctx?.vip || 1;
  return vip >= minVip
    ? { ok: true }
    : { ok: false, reason: `Reach VIP ${minVip} to enter the High Roller table.` };
}

export function start(state, machine) {
  return {
    spinsLeft: limit,
    bet: machine.betSteps.at(-1),
    prestige: 0,
    features: 0,
    done: false,
  };
}

export function onSpin(state, session, info) {
  const crit = (info.result.jackpotTriggers || []).length > 0;
  const pts = Math.round(info.gross / 10) + (crit ? 100 : 0);
  session.prestige += pts;
  if (crit) session.features++;
  session.spinsLeft--;
  session.done = session.spinsLeft <= 0;
  return {
    status: `${crit ? 'FEATURE ×2 · ' : ''}${fmt(session.prestige)} PRESTIGE · ${session.spinsLeft} LEFT`,
    done: session.done,
  };
}

export function onTick() { return null; }

export function finish(state, session) {
  const reward = finishRun(state, 'highRoller', 'high-roller', session.prestige, 5, session.features * 250);
  return panel('High Roller', fmt(session.prestige), [
    `${session.features} features · <b>${fmt(session.prestige)}</b> prestige`,
    `Table payout: <b>${fmt(reward)}</b> credits`,
  ]);
}
