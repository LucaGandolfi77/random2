/* Mystery Roulette — a random unlocked machine and a random rule modifier. */
import { panel, finishRun, fmt } from './helpers.js';

const MODIFIERS = [
  { id: 'double', name: 'DOUBLE WINS', mult: 2, free: 0, icon: '2️⃣' },
  { id: 'triple', name: 'TRIPLE WINS', mult: 3, free: 0, icon: '3️⃣' },
  { id: 'wild', name: 'EXTRA WILDS', mult: 1.5, free: 0, icon: '🃏' },
  { id: 'free', name: 'FREE SPIN GIFT', mult: 1, free: 5, icon: '🎁' },
  { id: 'lucky', name: 'LUCKY STREAK', mult: 2.5, free: 2, icon: '🍀' },
];

export const id = 'roulette';
export const name = 'Mystery Roulette';
export const icon = '🎲';
export const desc = 'Spin the wheel for a random machine and a random boost.';
export const rules = `
  <p class="sub">The wheel picks one of your unlocked machines and a modifier:
  doubled wins, extra wilds, free spins and more. Ten spins, one surprise run.</p>`;
export const wager = true;
export const chain = false;
export const limit = 10;
export const duration = null;

export function canEnter(state, machine, ctx) {
  const open = ctx?.machines || [];
  return open.length ? { ok: true } : { ok: false, reason: 'No machines unlocked.' };
}

export function start(state, machine, ctx) {
  const open = (ctx?.machines || [machine]).filter((m) => (ctx?.vip || 1) >= (m.unlockLevel || 1));
  const pool = open.length ? open : [machine];
  const pick = pool[Math.floor(Math.random() * pool.length) % pool.length];
  const mod = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length) % MODIFIERS.length];
  return {
    machineId: pick.id,
    machineName: pick.name,
    modifier: mod,
    spinsLeft: limit,
    score: 0,
    lastWin: 0,
    done: false,
  };
}

export function onSpin(state, session, info) {
  const gained = Math.round(info.gross * session.modifier.mult);
  session.lastWin = gained;
  session.score += gained;
  session.spinsLeft--;
  if (session.modifier.free && session.spinsLeft === limit - 1) {
    state.freeSpins += session.modifier.free;
  }
  session.done = session.spinsLeft <= 0;
  return {
    status: `${session.modifier.icon} ${session.modifier.name} · +${fmt(gained)} · ${session.spinsLeft} LEFT`,
    done: session.done,
  };
}

export function onTick() { return null; }

export function finish(state, session) {
  const reward = finishRun(state, 'roulette', 'roulette', session.score, 0.8);
  return panel('Mystery Roulette', fmt(session.score), [
    `${session.machineName} + <b>${session.modifier.name}</b>`,
    `Reward: <b>${fmt(reward)}</b> credits`,
  ]);
}
