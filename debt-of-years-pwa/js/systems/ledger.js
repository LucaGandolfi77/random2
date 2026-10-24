import { livingVillagers, quotaRemaining } from './state.js';

function entry(state, data) {
  const record = {
    day: state.day,
    chapter: state.chapter,
    ...data
  };
  state.ledger.push(record);
  return record;
}

export function getVillager(state, id) {
  return state.villagers.find((v) => v.id === id) || null;
}

export function drawYears(state, targetId, years, context, opts = {}) {
  if (years <= 0) return { ok: false, reason: 'nothing to take' };

  if (targetId === 'hero') {
    if (state.hero.years < years) return { ok: false, reason: 'not enough years' };
    state.hero.years -= years;
    state.flags.selfDrawn += years;
    state.flags.totalDrawn += years;
    state.hero.maxHp = Math.min(60, 20 + state.hero.years);
    if (state.hero.hp > state.hero.maxHp) state.hero.hp = state.hero.maxHp;

    entry(state, {
      villagerId: 'hero',
      name: 'Wren (yourself)',
      years,
      context,
      witnessed: true,
      self: true
    });

    return {
      ok: true,
      self: true,
      died: state.hero.years <= 0,
      forgotten: false,
      deadly: state.hero.years <= 0
    };
  }

  const villager = getVillager(state, targetId);
  if (!villager) return { ok: false, reason: 'unknown name' };
  if (!villager.alive) return { ok: false, reason: 'already gone' };
  if (villager.consent === 'protected') return { ok: false, reason: 'protected' };
  if (villager.years < years) return { ok: false, reason: 'not enough years' };

  const secret = !!opts.secret;
  const witnessed = opts.witnessed !== false && !secret;

  villager.years -= years;
  villager.drawn += years;
  state.flags.totalDrawn += years;
  if (secret) state.flags.secretDrawn += years;
  if (villager.consent === 'unaware') state.stats.unawareDraws += years;
  if (!secret && villager.consent === 'refuses') state.stats.forcedDraws += years;

  if (!secret && witnessed && opts.attributed !== false) {
    if (villager.consent === 'unaware') villager.trust = Math.max(0, villager.trust - 1);
    if (villager.consent === 'refuses') villager.trust = Math.max(0, villager.trust - 2);
  }

  entry(state, {
    villagerId: villager.id,
    name: villager.name,
    years,
    context,
    witnessed,
    secret,
    self: false
  });

  let died = false;
  let forgotten = false;
  if (villager.years <= 0) {
    villager.years = 0;
    villager.alive = false;
    villager.diedDay = state.day;
    died = true;
    state.stats.deaths += 1;

    villager.remembered = witnessed || (villager.spoken && villager.trust >= 2);
    if (!villager.remembered) {
      villager.forgotten = true;
      state.stats.forgotten += 1;
      forgotten = true;
    }
  }

  return { ok: true, died, forgotten, self: false, deadly: died };
}

export function settleQuota(state, allocations, opts = {}) {
  const quiet = !!opts.quiet;
  let total = 0;
  const results = [];

  for (const [id, years] of Object.entries(allocations)) {
    if (!years || years <= 0) continue;
    const result = drawYears(state, id, years, 'the quota', { witnessed: !quiet, secret: quiet });
    if (result.ok) {
      total += years;
      results.push({ id, years, ...result });
    }
  }

  state.quota.paid += total;
  return { total, results };
}

export function settleAuto(state, opts = {}) {
  const quiet = !!opts.quiet;
  let remaining = quotaRemaining(state);
  const allocations = {};

  const candidates = livingVillagers(state)
    .filter((v) => v.consent !== 'protected')
    .sort((a, b) => a.years - b.years);

  for (const villager of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(villager.years, remaining);
    if (take > 0) {
      allocations[villager.id] = take;
      remaining -= take;
    }
  }

  if (remaining > 0 && state.hero.years > 0) {
    const take = Math.min(state.hero.years, remaining);
    allocations.hero = take;
    remaining -= take;
  }

  const result = settleQuota(state, allocations, { quiet });
  return { ...result, allocations, shortfall: remaining };
}

export function restoreForgotten(state) {
  let restored = 0;
  for (const villager of state.villagers) {
    if (!villager.alive && villager.forgotten) {
      villager.forgotten = false;
      villager.remembered = true;
      restored += 1;
    }
  }
  state.stats.forgotten = Math.max(0, state.stats.forgotten - restored);
  return restored;
}

export function useFavor(state, villagerId) {
  const villager = getVillager(state, villagerId);
  if (!villager || !villager.alive || villager.favorUsed) return { ok: false };
  if (villager.consent === 'protected' && villager.favor.effect !== 'years') {
    // Nel's ribbon is a gift, not a ledger entry.
  }
  villager.favorUsed = true;
  state.stats.favorsUsed += 1;
  return { ok: true, favor: villager.favor, villager };
}

export function healHero(state, amount) {
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + amount);
  return state.hero.hp;
}

export function hurtHero(state, amount) {
  state.hero.hp = Math.max(0, state.hero.hp - amount);
  return state.hero.hp;
}

export function grantHeroYears(state, amount) {
  state.hero.years = Math.min(state.hero.maxYears, state.hero.years + amount);
  state.hero.maxHp = Math.max(state.hero.maxHp, Math.min(60, 20 + state.hero.years));
  return state.hero.years;
}

export function ledgerTotals(state) {
  const byVillager = {};
  for (const record of state.ledger) {
    if (record.self) continue;
    byVillager[record.villagerId] = (byVillager[record.villagerId] || 0) + record.years;
  }
  return {
    totalDrawn: state.flags.totalDrawn,
    selfDrawn: state.flags.selfDrawn,
    secretDrawn: state.flags.secretDrawn,
    deaths: state.stats.deaths,
    forgotten: state.stats.forgotten,
    byVillager
  };
}
