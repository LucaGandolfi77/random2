/* Progression and egg helpers. Pure, no DOM. */

export function isLegendary(p) {
  return !!(p && (p.legendary || p.mythical));
}

export function eggTier(km) {
  if (km >= 10) return 10;
  if (km >= 5) return 5;
  return 2;
}

/*
 * Rarity pools: legendary/mythical species never hatch. 2 km is the common
 * pool, 10 km is the rare pool. The caller supplies the dex and the predicate
 * so the function stays independent from config.js.
 */
export function eggPool(pokedex, km, isLegendaryFn = isLegendary) {
  const tier = eggTier(km);
  const base = pokedex.filter((p) => p && p.weight > 0 && !isLegendaryFn(p));
  if (!base.length) return [];
  let pool;
  if (tier === 2) pool = base.filter((p) => p.difficulty <= 5);
  else if (tier === 5) pool = base.filter((p) => p.difficulty >= 4 && p.difficulty <= 8);
  else pool = base.filter((p) => p.difficulty >= 7);
  return pool.length ? pool : base;
}

export function pickEggSpecies(pokedex, km, { isLegendaryFn = isLegendary, rng = Math.random } = {}) {
  const pool = eggPool(pokedex, km, isLegendaryFn);
  if (!pool.length) return null;
  const weights = pool.map((p) => Math.max(0.05, p.weight || 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function levelForXp(xp, levels) {
  let level = 1;
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 40);
}

export function xpProgress(xp, levels) {
  const level = levelForXp(xp, levels);
  const prev = levels[level - 1] != null ? levels[level - 1] : 0;
  const next = levels[level] != null ? levels[level] : prev + 1;
  const span = Math.max(1, next - prev);
  return {
    level,
    prev,
    next,
    pct: Math.max(0, Math.min(1, (xp - prev) / span)),
  };
}
