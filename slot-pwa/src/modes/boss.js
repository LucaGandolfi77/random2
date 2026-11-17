/* Boss Battle — every win damages a machine-themed boss until it falls. */
import { panel, finishRun, fmt, progressBar } from './helpers.js';

const BOSSES = {
  'lucky-seven': { name: 'THE HOUSE', hp: 6000 },
  'retro-777':   { name: 'MR. SEVEN', hp: 8000 },
  pharaoh:       { name: 'THE PHARAOH', hp: 12000 },
  nebula:        { name: 'VOID TITAN', hp: 15000 },
  'sugar-rush':  { name: 'SUGAR QUEEN', hp: 16000 },
  vault:         { name: 'THE VAULT', hp: 14000 },
  atlantis:      { name: 'DEEP LEVIATHAN', hp: 18000 },
  samurai:       { name: 'IRON SHOGUN', hp: 22000 },
};

export const id = 'boss';
export const name = 'Boss Battle';
export const icon = '👾';
export const desc = 'Fight a machine boss. Every win deals damage.';
export const rules = `
  <p class="sub">Your winnings become damage. Features land critical hits for
  2× damage. Defeat the boss before your credits run out to claim the bounty.</p>`;
export const wager = true;
export const chain = false;
export const limit = null;
export const duration = null;

export function canEnter() { return { ok: true }; }

export function start(state, machine) {
  const def = BOSSES[machine.id] || { name: 'THE MACHINE', hp: 8000 };
  return {
    boss: def.name,
    hp: def.hp,
    maxHp: def.hp,
    damage: 0,
    crits: 0,
    done: false,
  };
}

export function onSpin(state, session, info) {
  const crit = (info.result.jackpotTriggers || []).length > 0;
  const dmg = Math.round(info.gross * (crit ? 2 : 1));
  session.hp = Math.max(0, session.hp - dmg);
  session.damage += dmg;
  if (crit) session.crits++;
  session.done = session.hp <= 0;
  return {
    status: session.done
      ? `${session.boss} DEFEATED!`
      : `${session.boss} · ${fmt(session.hp)}/${fmt(session.maxHp)} HP · ${crit ? 'CRITICAL!' : `HIT ${fmt(dmg)}`}`,
    done: session.done,
  };
}

export function onTick() { return null; }

export function finish(state, session) {
  if (session.hp > 0) {
    return panel('Boss Escapes', fmt(session.damage) + ' DMG', [
      `You dealt <b>${fmt(session.damage)}</b> damage but ${session.boss} survived.`,
    ]);
  }
  const bonus = Math.floor(session.maxHp / 4);
  const reward = finishRun(state, 'boss', 'boss', session.damage, 0.3, bonus);
  return panel('Boss Defeated!', 'VICTORY', [
    `${session.boss} falls after <b>${fmt(session.damage)}</b> damage (${session.crits} criticals).`,
    `Bounty: <b>${fmt(reward)}</b> credits`,
  ], progressBar(session.damage, session.maxHp));
}
