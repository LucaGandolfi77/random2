/*
 * DOTTOR GELO — pure simulation.
 *
 * No DOM, no Three.js, no timers: everything takes a state and a timestamp.
 * That is what lets the Node tests play the economy honestly instead of
 * testing a stubbed-out toy.
 */
import {
  AREAS,
  AREA_BY_ID,
  AREA_STAGE_LEVELS,
  BLUEPRINT_BY_ID,
  CAMPAIGN,
  CAMPAIGN_BY_ID,
  CHASSIS,
  CORES,
  CYBORG_BLUEPRINTS,
  ENDINGS,
  LEVEL_MAX,
  MEMORY_BY_ID,
  NAME_A,
  NAME_B,
  OFFLINE_BASE_HOURS,
  ROSTER_MAX,
  SAVE_VERSION,
  STORY,
  TRAITS,
  TRAINING_PROGRAMS,
} from './data.js';

export { SAVE_VERSION };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = (n, d = 0) => {
  const p = 10 ** d;
  return Math.round(n * p) / p;
};
const uidNum = (state) => {
  state.seq = (state.seq || 0) + 1;
  return state.seq;
};
const nowMs = () => Date.now();

export function areaStage(level) {
  let stage = 1;
  for (let i = 0; i < AREA_STAGE_LEVELS.length; i++) {
    if (level >= AREA_STAGE_LEVELS[i]) stage = i + 1;
  }
  return stage;
}

export function areaStageName(level) {
  return ['Fondamenta', 'Macchina', 'Produzione', 'Potenza', 'Apice'][areaStage(level) - 1];
}

export function areaLevel(state, id) {
  return state.areas?.[id]?.level || 0;
}

export function isAreaUnlocked(state, id) {
  return Boolean(state.areas?.[id]?.unlocked);
}

export function areaDef(id) {
  return AREA_BY_ID[id];
}

export function areaPowerUse(state, id) {
  const def = AREA_BY_ID[id];
  const a = state.areas?.[id];
  if (!def || !a || !a.unlocked || a.level < 1) return 0;
  if (def.special === 'power') return 0;
  const raw = def.powerUse + def.powerGrowth * (a.level - 1) - (a.level >= 10 ? 1 : 0);
  return Math.max(0.5, round(raw, 1));
}

export function reactorOutput(state) {
  const def = AREA_BY_ID.reactor;
  const a = state.areas.reactor;
  if (!a || !a.unlocked) return 0;
  return round(def.baseRate + def.rateGrowth * (a.level - 1), 1);
}

export function powerStats(state) {
  const output = reactorOutput(state);
  let demand = 0;
  for (const def of AREAS) {
    const a = state.areas[def.id];
    if (!a || !a.unlocked) continue;
    if (!a.active && def.special !== 'power') continue;
    demand += areaPowerUse(state, def.id);
  }
  demand = round(demand, 1);
  const efficiency = demand <= 0 ? 1 : clamp(output / demand, 0.35, 1);
  return {
    output,
    demand,
    efficiency: round(efficiency, 3),
    overload: output < demand,
    ratio: demand <= 0 ? 1 : round(output / demand, 2),
  };
}

export function memoryEffects(state) {
  const out = {
    prod: 0,
    power: 0,
    offline: 0,
    train: 0,
    cells: 0,
    affection: 0,
    garden: 0,
    fragments: 0,
    auto: false,
    startScrap: 0,
    startCircuits: 0,
  };
  for (const id of Object.keys(state.prestige?.nodes || {})) {
    if (!state.prestige.nodes[id]) continue;
    const node = MEMORY_BY_ID[id];
    if (!node) continue;
    for (const [k, v] of Object.entries(node.effect)) {
      if (k === 'auto') out.auto = true;
      else out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

function activeLevel(state, id) {
  const a = state.areas?.[id];
  return a?.unlocked && a.active ? a.level || 0 : 0;
}

export function bonuses(state) {
  const mem = memoryEffects(state);
  const gardenLevel = activeLevel(state, 'garden');
  const infirmaryLevel = activeLevel(state, 'infirmary');
  const arenaLevel = activeLevel(state, 'arena');
  const hqLevel = activeLevel(state, 'hq');
  const memoryLevel = activeLevel(state, 'memory');
  const trainingLevel = activeLevel(state, 'training');
  const prestige = state.prestige?.count || 0;
  return {
    ...mem,
    gardenLevel,
    infirmaryLevel,
    arenaLevel,
    hqLevel,
    memoryLevel,
    trainingLevel,
    prestige,
    production: 1 + mem.prod + gardenLevel * 0.03 * (1 + mem.garden) + prestige * 0.02,
    power: 1 + mem.power + infirmaryLevel * 0.02 + prestige * 0.02,
    offlineHours: OFFLINE_BASE_HOURS + Math.max(0, hqLevel - 1) * 0.5 + mem.offline,
    trainSpeed: 1 + Math.max(0, trainingLevel - 1) * 0.1 + mem.train,
    cellMult: 1 + mem.cells + memoryLevel * 0.05,
    arenaReward: 1 + Math.max(0, arenaLevel - 1) * 0.08,
    fragmentMult: 1 + mem.fragments + memoryLevel * 0.05,
    affectionRate:
      0.55 +
      gardenLevel * 0.08 +
      infirmaryLevel * 0.12 +
      (state.prestige?.count || 0) * 0.05,
    ecoDuration: 45,
  };
}

export function areaOutputPerSecond(state, id) {
  const def = AREA_BY_ID[id];
  const a = state.areas[id];
  if (!def || !a || !a.unlocked || a.level < 1 || !a.active || !def.resource || def.resource === 'power') return 0;
  const base = def.baseRate + def.rateGrowth * (a.level - 1);
  const stageBonus = 1 + (a.level >= 5 ? 0.25 : 0) + (a.level >= 15 ? 0.5 : 0);
  const b = bonuses(state);
  const sup = a.supervisor ? state.cyborgs.find((c) => c.id === a.supervisor) : null;
  const supBonus = sup ? supervisorBonus(state, sup, id) : 0;
  const eff = powerStats(state).efficiency;
  let mult = 1 + supBonus;
  if (id === 'garden') mult *= 1 + b.gardenLevel * 0.03;
  if (id === 'incubator') mult *= b.cellMult;
  return Math.max(0, base * stageBonus * b.production * mult * eff);
}

export function productionRates(state) {
  return {
    scrap: areaOutputPerSecond(state, 'foundry'),
    circuits: areaOutputPerSecond(state, 'circuits'),
    cells: areaOutputPerSecond(state, 'incubator'),
  };
}

export function supervisorBonus(state, cyborg, areaId) {
  if (!cyborg) return 0;
  const def = AREA_BY_ID[areaId];
  const affinity = cyborg.affinity === areaId ? 0.08 : 0;
  const loyalty = (cyborg.affection || 0) / 100 * 0.12;
  return round(0.08 + cyborg.level * 0.012 + loyalty + affinity + Math.max(0, (cyborg.rank || 1) - 1) * 0.02, 3);
}

export function cyborgStats(state, cyborg) {
  const lvl = Math.max(0, (cyborg.level || 1) - 1);
  const trait = TRAITS.find((t) => t.id === cyborg.trait);
  const rank = Math.max(0, (cyborg.rank || 1) - 1) * 2;
  const bonus = cyborg.bonus || { str: 0, prec: 0, synth: 0, loyal: 0 };
  const out = {};
  for (const key of ['str', 'prec', 'synth', 'loyal']) {
    let v = (cyborg.base[key] || 0) + (cyborg.growth[key] || 0) * lvl + (bonus[key] || 0) + rank;
    if (trait?.mod?.[key]) v *= trait.mod[key];
    out[key] = Math.max(1, Math.round(v));
  }
  return out;
}

export function cyborgPower(state, cyborg) {
  if (!cyborg) return 0;
  const s = cyborgStats(state, cyborg);
  const b = bonuses(state);
  const trait = TRAITS.find((t) => t.id === cyborg.trait);
  let mult = 1 + (cyborg.affection || 0) / 250 + (cyborg.memoryWiped ? 0.15 : 0);
  if (cyborg.memoryWiped && trait?.wipedPower) mult += trait.wipedPower;
  if ((cyborg.affection || 0) >= 100) mult += 0.1;
  return Math.round((s.str * 2.2 + s.prec * 1.6 + s.synth * 1.4 + s.loyal * 0.8) * mult * b.power);
}

export function squadPower(state) {
  const ids = (state.squad || []).slice(0, 3);
  const squad = ids.map((id) => state.cyborgs.find((c) => c.id === id)).filter(Boolean);
  return squad.reduce((sum, c) => sum + cyborgPower(state, c), 0);
}

export function squadMembers(state) {
  const ids = (state.squad || []).slice(0, 3);
  return ids.map((id) => state.cyborgs.find((c) => c.id === id)).filter(Boolean);
}

export function xpNeed(level) {
  return 30 + level * 16;
}

export function trainingSlots(state) {
  return bonuses(state).trainingLevel ? 1 + Math.floor((bonuses(state).trainingLevel - 1) / 3) : 0;
}

export function trainingDuration(state, cyborg, program) {
  const base = 24 + (cyborg.level || 1) * 1.8;
  return Math.max(8, base / bonuses(state).trainSpeed);
}

export function startTraining(state, cyborgId, programId, now = nowMs()) {
  const cyborg = state.cyborgs.find((c) => c.id === cyborgId);
  const program = TRAINING_PROGRAMS.find((p) => p.id === programId);
  if (!cyborg || !program) return { ok: false, reason: 'Unità o programma inesistente.' };
  if (cyborg.level >= 30) return { ok: false, reason: 'Questa unità ha già raggiunto il livello 30.' };
  if (!bonuses(state).trainingLevel) return { ok: false, reason: 'La Sala Addestramento non è attiva.' };
  if (state.training.length >= trainingSlots(state)) return { ok: false, reason: 'Tutte le postazioni sono occupate.' };
  if (state.training.some((t) => t.cyborgId === cyborgId)) return { ok: false, reason: 'Questa unità è già in addestramento.' };
  if (state.expedition?.squad?.includes(cyborgId)) return { ok: false, reason: 'L’unità è in spedizione.' };
  const duration = trainingDuration(state, cyborg, program);
  state.training.push({
    cyborgId,
    program: programId,
    startedAt: now,
    endsAt: now + duration * 1000,
    duration,
  });
  return { ok: true, duration };
}

export function cancelTraining(state, index) {
  if (index >= 0 && index < state.training.length) state.training.splice(index, 1);
}

export function grantXp(state, cyborg, amount, statKey = null) {
  const events = [];
  cyborg.xp = (cyborg.xp || 0) + amount;
  if (statKey) {
    cyborg.bonus = cyborg.bonus || { str: 0, prec: 0, synth: 0, loyal: 0 };
    cyborg.bonus[statKey] = (cyborg.bonus[statKey] || 0) + 0.45;
  }
  let guard = 0;
  while (cyborg.level < 30 && cyborg.xp >= xpNeed(cyborg.level) && guard++ < 20) {
    cyborg.xp -= xpNeed(cyborg.level);
    cyborg.level++;
    events.push({ type: 'levelup', cyborgId: cyborg.id, level: cyborg.level });
  }
  if (cyborg.level >= 30) cyborg.xp = 0;
  return events;
}

export function trainingReady(state, now = nowMs()) {
  return state.training
    .filter((t) => now >= t.endsAt)
    .map((t) => ({ ...t, cyborg: state.cyborgs.find((c) => c.id === t.cyborgId) }))
    .filter((t) => t.cyborg);
}

export function collectTraining(state, now = nowMs()) {
  const events = [];
  for (let i = state.training.length - 1; i >= 0; i--) {
    const t = state.training[i];
    if (now < t.endsAt) continue;
    const cyborg = state.cyborgs.find((c) => c.id === t.cyborgId);
    if (!cyborg) {
      state.training.splice(i, 1);
      continue;
    }
    const program = TRAINING_PROGRAMS.find((p) => p.id === t.program);
    const xp = 20 + cyborg.level * 5;
    const up = grantXp(state, cyborg, xp, program?.stat);
    cyborg.affection = clamp((cyborg.affection || 0) + 2, 0, 100);
    events.push({
      type: 'training',
      cyborgId: cyborg.id,
      name: cyborg.name,
      program: program?.name || '',
      xp,
      levels: up,
    });
    state.training.splice(i, 1);
  }
  return events;
}

export function rankUpCost(cyborg) {
  const rank = cyborg.rank || 1;
  return { cells: 8 * rank, circuits: 12 * rank };
}

export function canRankUp(state, cyborg) {
  if (!cyborg || (cyborg.rank || 1) >= 5) return false;
  if ((cyborg.level || 1) < (cyborg.rank || 1) * 5) return false;
  const cost = rankUpCost(cyborg);
  return state.resources.cells >= cost.cells && state.resources.circuits >= cost.circuits;
}

export function rankUp(state, cyborgId) {
  const cyborg = state.cyborgs.find((c) => c.id === cyborgId);
  if (!cyborg) return { ok: false, reason: 'Unità inesistente.' };
  if ((cyborg.rank || 1) >= 5) return { ok: false, reason: 'Rango massimo raggiunto.' };
  if ((cyborg.level || 1) < (cyborg.rank || 1) * 5) return { ok: false, reason: `Serve il livello ${cyborg.rank * 5}.` };
  const cost = rankUpCost(cyborg);
  if (!canPay(state, cost)) return { ok: false, reason: 'Risorse insufficienti.' };
  pay(state, cost);
  cyborg.rank = (cyborg.rank || 1) + 1;
  cyborg.bonus = cyborg.bonus || { str: 0, prec: 0, synth: 0, loyal: 0 };
  for (const k of ['str', 'prec', 'synth', 'loyal']) cyborg.bonus[k] = (cyborg.bonus[k] || 0) + 2;
  cyborg.affection = clamp((cyborg.affection || 0) + 5, 0, 100);
  return { ok: true, rank: cyborg.rank };
}

export function wipeMemory(state, cyborgId) {
  const cyborg = state.cyborgs.find((c) => c.id === cyborgId);
  if (!cyborg) return { ok: false, reason: 'Unità inesistente.' };
  if (!state.story.seen.includes('ch5')) return { ok: false, reason: 'Il Protocollo Silenzio non è ancora disponibile.' };
  if (cyborg.memoryWiped) return { ok: false, reason: 'La memoria è già stata cancellata.' };
  cyborg.memoryWiped = true;
  cyborg.affection = 0;
  state.story.flags.memoryWipes = (state.story.flags.memoryWipes || 0) + 1;
  state.stats.wipes = (state.stats.wipes || 0) + 1;
  return { ok: true };
}

export function setSupervisor(state, cyborgId, areaId) {
  const cyborg = state.cyborgs.find((c) => c.id === cyborgId);
  if (!cyborg) return { ok: false, reason: 'Unità inesistente.' };
  if (!areaId) {
    for (const id of Object.keys(state.areas)) {
      if (state.areas[id].supervisor === cyborgId) state.areas[id].supervisor = null;
    }
    cyborg.area = null;
    return { ok: true };
  }
  const area = state.areas[areaId];
  if (!area || !area.unlocked) return { ok: false, reason: 'La stanza non è attiva.' };
  for (const id of Object.keys(state.areas)) {
    if (state.areas[id].supervisor === cyborgId) state.areas[id].supervisor = null;
  }
  if (area.supervisor) {
    const old = state.cyborgs.find((c) => c.id === area.supervisor);
    if (old) old.area = null;
  }
  area.supervisor = cyborgId;
  cyborg.area = areaId;
  return { ok: true };
}

export function toggleArea(state, areaId) {
  const a = state.areas[areaId];
  if (!a || !a.unlocked || areaId === 'reactor') return { ok: false };
  a.active = !a.active;
  return { ok: true, active: a.active };
}

export function canPay(state, cost) {
  return (
    state.resources.scrap >= (cost.scrap || 0) &&
    state.resources.circuits >= (cost.circuits || 0) &&
    state.resources.cells >= (cost.cells || 0) &&
    state.resources.fragments >= (cost.fragments || 0)
  );
}

export function pay(state, cost) {
  state.resources.scrap -= cost.scrap || 0;
  state.resources.circuits -= cost.circuits || 0;
  state.resources.cells -= cost.cells || 0;
  state.resources.fragments -= cost.fragments || 0;
}

export function gain(state, cost) {
  state.resources.scrap += cost.scrap || 0;
  state.resources.circuits += cost.circuits || 0;
  state.resources.cells += cost.cells || 0;
  state.resources.fragments += cost.fragments || 0;
  state.run.scrap += cost.scrap || 0;
  state.run.circuits += cost.circuits || 0;
  state.run.cells += cost.cells || 0;
  state.stats.scrapEarned += cost.scrap || 0;
  state.stats.circuitsEarned += cost.circuits || 0;
  state.stats.cellsEarned += cost.cells || 0;
}

export function buildCost(state, id) {
  const def = AREA_BY_ID[id];
  const a = state.areas[id];
  if (!def || !a) return { scrap: 0, circuits: 0 };
  if (!a.unlocked) return { ...def.buildCost };
  return { scrap: 0, circuits: 0 };
}

export function upgradeCost(state, id) {
  const def = AREA_BY_ID[id];
  const a = state.areas[id];
  if (!def || !a || !a.unlocked || a.level >= LEVEL_MAX) return { scrap: 0, circuits: 0 };
  const exp = Math.max(0, a.level - 1);
  return {
    scrap: Math.ceil(def.baseCost.scrap * def.growth ** exp),
    circuits: Math.ceil(def.baseCost.circuits * def.growth ** exp),
  };
}

export function unlockRequirement(state, id) {
  const def = AREA_BY_ID[id];
  if (!def?.unlock) return null;
  const a = state.areas[def.unlock.area];
  if (a && a.level >= def.unlock.level) return null;
  return { area: def.unlock.area, level: def.unlock.level };
}

export function unlockArea(state, id) {
  const def = AREA_BY_ID[id];
  const a = state.areas[id];
  if (!def || !a) return { ok: false, reason: 'Stanza inesistente.' };
  if (a.unlocked) return { ok: false, reason: 'La stanza è già aperta.' };
  const req = unlockRequirement(state, id);
  if (req) {
    return {
      ok: false,
      reason: `Serve ${AREA_BY_ID[req.area].name} al livello ${req.level}.`,
    };
  }
  if (!canPay(state, def.buildCost)) return { ok: false, reason: 'Risorse insufficienti.' };
  pay(state, def.buildCost);
  a.unlocked = true;
  a.level = 1;
  a.active = true;
  return { ok: true, level: 1 };
}

export function upgradeArea(state, id) {
  const def = AREA_BY_ID[id];
  const a = state.areas[id];
  if (!def || !a) return { ok: false, reason: 'Stanza inesistente.' };
  if (!a.unlocked) return { ok: false, reason: 'Prima devi aprire la stanza.' };
  if (a.level >= LEVEL_MAX) return { ok: false, reason: 'Livello massimo raggiunto.' };
  const cost = upgradeCost(state, id);
  if (!canPay(state, cost)) return { ok: false, reason: 'Risorse insufficienti.' };
  pay(state, cost);
  a.level++;
  return { ok: true, level: a.level };
}

export function availableBlueprints(state) {
  return CYBORG_BLUEPRINTS.filter((bp) => {
    if (bp.auto) return false;
    if (state.cyborgs.some((c) => c.blueprintId === bp.id)) return false;
    return unlockMet(state, bp.unlock);
  });
}

export function unlockMet(state, unlock) {
  if (!unlock) return true;
  if (unlock.type === 'start') return true;
  if (unlock.type === 'area') return areaLevel(state, unlock.area) >= unlock.level;
  if (unlock.type === 'story') return state.story.seen.includes(unlock.chapter);
  return false;
}

export function blueprintCost(state, bp) {
  return { scrap: 90, circuits: 12, cells: 5 + Math.max(0, bp ? 1 : 0) };
}

export function proceduralCost(chassis, core) {
  return {
    scrap: (chassis?.cost.scrap || 0) + 20,
    circuits: (chassis?.cost.circuits || 0) + (core?.cost.circuits || 0),
    cells: (chassis?.cost.cells || 0) + (core?.cost.cells || 0),
  };
}

export function canCreate(state, spec) {
  if (state.cyborgs.length >= ROSTER_MAX) return { ok: false, reason: 'Il roster è pieno. Archivia o ricicla un’unità.' };
  if (state.incubation) return { ok: false, reason: 'L’Incubatrice è già occupata.' };
  if (!areaLevel(state, 'incubator')) return { ok: false, reason: 'L’Incubatrice non è costruita.' };
  if (spec.kind === 'blueprint') {
    const bp = BLUEPRINT_BY_ID[spec.blueprintId];
    if (!bp) return { ok: false, reason: 'Progetto inesistente.' };
    if (bp.auto) return { ok: false, reason: 'Questo cyborg arriva con la storia.' };
    if (!unlockMet(state, bp.unlock)) return { ok: false, reason: 'Progetto non ancora sbloccato.' };
    if (state.cyborgs.some((c) => c.blueprintId === bp.id)) return { ok: false, reason: 'Hai già costruito questa unità.' };
    const cost = blueprintCost(state, bp);
    if (!canPay(state, cost)) return { ok: false, reason: 'Risorse insufficienti.' };
    return { ok: true, cost };
  }
  const chassis = CHASSIS.find((c) => c.id === spec.chassisId);
  const core = CORES.find((c) => c.id === spec.coreId);
  if (!chassis || !core) return { ok: false, reason: 'Telaio o nucleo inesistente.' };
  const cost = proceduralCost(chassis, core);
  if (!canPay(state, cost)) return { ok: false, reason: 'Risorse insufficienti.' };
  return { ok: true, cost };
}

export function startIncubation(state, spec, now = nowMs()) {
  const check = canCreate(state, spec);
  if (!check.ok) return check;
  pay(state, check.cost);
  const speed = 1 + areaLevel(state, 'incubator') * 0.08;
  const duration = Math.max(5, (spec.kind === 'blueprint' ? 22 : 16) / speed);
  state.incubation = {
    ...spec,
    startedAt: now,
    endsAt: now + duration * 1000,
    duration,
    cost: check.cost,
  };
  return { ok: true, duration };
}

export function makeProceduralSpec() {
  const chassis = CHASSIS[Math.floor(Math.random() * CHASSIS.length)];
  const core = CORES[Math.floor(Math.random() * CORES.length)];
  const name = NAME_A[Math.floor(Math.random() * NAME_A.length)] + NAME_B[Math.floor(Math.random() * NAME_B.length)];
  return { kind: 'procedural', chassisId: chassis.id, coreId: core.id, name };
}

function newCyborg(state, spec) {
  const id = `c${uidNum(state)}`;
  let bp;
  let base;
  let growth;
  let body;
  let accent;
  let glow;
  let role;
  let affinity;
  let tier;
  let serial;
  let name;
  let trait;
  let story = false;
  if (spec.kind === 'blueprint') {
    bp = BLUEPRINT_BY_ID[spec.blueprintId];
    base = { ...bp.base };
    growth = { ...bp.growth };
    body = bp.body;
    accent = bp.accent;
    glow = bp.glow;
    role = bp.role;
    affinity = bp.affinity;
    tier = bp.tier;
    serial = bp.serial;
    name = bp.name;
    trait = bp.trait;
    story = true;
  } else {
    const chassis = CHASSIS.find((c) => c.id === spec.chassisId) || CHASSIS[0];
    const core = CORES.find((c) => c.id === spec.coreId) || CORES[0];
    base = { ...chassis.base };
    for (const [k, v] of Object.entries(core.add)) base[k] += v;
    growth = { str: 1.15, prec: 1.0, synth: 1.05, loyal: 0.9 };
    body = ['#6c7b82', '#6d5a4c', '#59677a'][Math.floor(Math.random() * 3)];
    accent = ['#84e6d8', '#a8c7ff', '#e0a6ff'][Math.floor(Math.random() * 3)];
    glow = '#e9ffff';
    role = 'Prototipo';
    affinity = ['foundry', 'circuits', 'incubator', 'training'][Math.floor(Math.random() * 4)];
    tier = 'Prototipo';
    serial = `P-${String(state.stats.creations + 1).padStart(2, '0')}`;
    name = spec.name || makeProceduralSpec().name;
    trait = TRAITS[Math.floor(Math.random() * TRAITS.length)].id;
  }
  const traitDef = TRAITS.find((t) => t.id === trait);
  const affection = 50 + (traitDef?.affection || 0) + bonuses(state).affection;
  return {
    id,
    blueprintId: bp?.id || null,
    kind: spec.kind,
    name,
    serial,
    tier,
    role,
    affinity,
    body,
    accent,
    glow,
    trait,
    base,
    growth,
    bonus: { str: 0, prec: 0, synth: 0, loyal: 0 },
    level: 1,
    xp: 0,
    rank: 1,
    affection: clamp(affection, 0, 100),
    area: null,
    memoryWiped: false,
    story,
    createdAt: nowMs(),
  };
}

export function grantStoryCyborg(state, id) {
  if (state.cyborgs.some((c) => c.blueprintId === id)) return null;
  // Story units are allowed to overflow the player roster by three: a full
  // roster must never be able to lock the emotional ending out of the game.
  if (state.cyborgs.length >= ROSTER_MAX + 3) return null;
  const bp = BLUEPRINT_BY_ID[id];
  if (!bp) return null;
  const cyb = newCyborg(state, { kind: 'blueprint', blueprintId: id });
  cyb.story = true;
  state.cyborgs.push(cyb);
  if (state.squad.length < 3) state.squad.push(cyb.id);
  state.stats.creations++;
  return cyb;
}

export function collectIncubation(state, now = nowMs()) {
  if (!state.incubation || now < state.incubation.endsAt) return null;
  const spec = state.incubation;
  state.incubation = null;
  if (spec.kind === 'blueprint' && state.cyborgs.some((c) => c.blueprintId === spec.blueprintId)) {
    return { type: 'incubation', ok: false, reason: 'Unità già presente.' };
  }
  if (state.cyborgs.length >= ROSTER_MAX) {
    return { type: 'incubation', ok: false, reason: 'Roster pieno.' };
  }
  const cyb = newCyborg(state, spec);
  state.cyborgs.push(cyb);
  if (state.squad.length < 3) state.squad.push(cyb.id);
  state.stats.creations++;
  return { type: 'incubation', ok: true, cyborg: cyb };
}

export function setSquad(state, ids) {
  const valid = ids.filter((id, i, arr) => arr.indexOf(id) === i && state.cyborgs.some((c) => c.id === id)).slice(0, 3);
  state.squad = valid.length ? valid : state.cyborgs.slice(0, 3).map((c) => c.id);
}

export function campaignNodeUnlocked(state, nodeId) {
  const idx = CAMPAIGN.findIndex((n) => n.id === nodeId);
  if (idx < 0) return false;
  return idx === 0 || state.campaign.wins >= idx;
}

export function campaignPower(state) {
  return squadPower(state);
}

export function battleResult(state, nodeId, boost = false, now = nowMs()) {
  const node = CAMPAIGN_BY_ID[nodeId];
  if (!node) return { ok: false, reason: 'Collaudo inesistente.' };
  if (!state.areas.arena?.unlocked) return { ok: false, reason: 'L’Arena di Collaudo non è ancora costruita.' };
  if (!state.areas.arena.active) return { ok: false, reason: 'L’Arena di Collaudo è in standby.' };
  if (!campaignNodeUnlocked(state, nodeId)) return { ok: false, reason: 'Collaudo non ancora disponibile.' };
  const squad = squadMembers(state);
  if (!squad.length) return { ok: false, reason: 'Nessun cyborg in squadra.' };
  const b = bonuses(state);
  const rawPower = squadPower(state);
  const power = Math.round(rawPower * (boost ? 1.2 : 1));
  const win = power >= node.power;
  const first = !state.campaign.cleared.includes(nodeId);
  state.stats.battles++;
  state.stats.maxPower = Math.max(state.stats.maxPower || 0, power);
  let rewards = { scrap: 0, circuits: 0, cells: 0 };
  if (win) {
    const mult = (first ? 1 : 0.35) * b.arenaReward;
    rewards = {
      scrap: Math.round(node.scrap * mult),
      circuits: Math.round(node.circuits * mult),
      cells: Math.round(node.cells * mult),
    };
    gain(state, rewards);
    if (first) {
      state.campaign.cleared.push(nodeId);
      state.campaign.wins = state.campaign.cleared.length;
      state.stats.wins = state.campaign.wins;
    }
  }
  return {
    ok: true,
    win,
    first,
    boost,
    power,
    rawPower,
    node,
    rewards,
    squad,
    at: now,
  };
}

export const EXPEDITIONS = [
  { id: 'short', minutes: 15, name: 'Turno breve', threshold: 120, scrap: 220, circuits: 18, cells: 1 },
  { id: 'medium', minutes: 60, name: 'Turno lungo', threshold: 420, scrap: 850, circuits: 55, cells: 4 },
  { id: 'long', minutes: 240, name: 'Notte intera', threshold: 1200, scrap: 2600, circuits: 150, cells: 10 },
];

export function startExpedition(state, id, now = nowMs()) {
  const def = EXPEDITIONS.find((e) => e.id === id);
  if (!def) return { ok: false, reason: 'Spedizione inesistente.' };
  if (!state.areas.arena?.unlocked) return { ok: false, reason: 'L’Arena di Collaudo non è ancora costruita.' };
  if (!state.areas.arena.active) return { ok: false, reason: 'L’Arena di Collaudo è in standby.' };
  if (state.expedition) return { ok: false, reason: 'Una spedizione è già in corso.' };
  const squad = squadMembers(state);
  if (!squad.length) return { ok: false, reason: 'Nessun cyborg in squadra.' };
  const power = Math.round(squadPower(state));
  state.expedition = {
    id,
    startedAt: now,
    endsAt: now + def.minutes * 60 * 1000,
    duration: def.minutes * 60,
    power,
    threshold: def.threshold,
    squad: squad.map((c) => c.id),
    def,
  };
  return { ok: true, def, power };
}

export function collectExpedition(state, now = nowMs()) {
  if (!state.expedition || now < state.expedition.endsAt) return null;
  const exp = state.expedition;
  state.expedition = null;
  const win = exp.power >= exp.threshold;
  const mult = win ? 1 : 0.3;
  const rewards = {
    scrap: Math.round(exp.def.scrap * mult),
    circuits: Math.round(exp.def.circuits * mult),
    cells: Math.round(exp.def.cells * mult),
  };
  gain(state, rewards);
  for (const id of exp.squad) {
    const c = state.cyborgs.find((x) => x.id === id);
    if (c) c.affection = clamp(c.affection + (win ? 4 : 1), 0, 100);
  }
  return { type: 'expedition', win, rewards, def: exp.def, power: exp.power };
}

export function collectEco(state, now = nowMs()) {
  if (!state.eco.activeUntil || now > state.eco.activeUntil || !state.eco.areaId) return { ok: false };
  const rates = productionRates(state);
  const rewards = {
    scrap: Math.round(rates.scrap * 60),
    circuits: Math.round(rates.circuits * 60),
    cells: Math.round(rates.cells * 60),
  };
  gain(state, rewards);
  state.eco.activeUntil = 0;
  state.eco.areaId = null;
  state.eco.collected = (state.eco.collected || 0) + 1;
  state.eco.nextAt = now + (95 + Math.random() * 75) * 1000;
  return { ok: true, rewards };
}

export function ecoAt(state, now = nowMs()) {
  return state.eco.activeUntil && now <= state.eco.activeUntil ? state.eco.areaId : null;
}

export function checkStory(state) {
  if (state.story.pending) return STORY.find((s) => s.id === state.story.pending) || null;
  const next = STORY[state.story.next];
  if (!next) return null;
  const t = next.trigger;
  let met = false;
  if (t.type === 'start') met = true;
  else if (t.type === 'area') met = areaLevel(state, t.area) >= t.level;
  else if (t.type === 'wins') met = state.campaign.wins >= t.count;
  else if (t.type === 'cyborgLevel') met = state.cyborgs.some((c) => c.level >= t.level);
  else if (t.type === 'ending') met = Boolean(state.story.ending);
  if (!met) return null;
  state.story.pending = next.id;
  return next;
}

export function storyOptionAvailable(state, option) {
  if (!option.requires) return true;
  if (option.requires === 'sedici') return state.cyborgs.some((c) => c.blueprintId === 'sedici');
  if (option.requires === 'prestige1') return (state.prestige.count || 0) >= 1;
  return true;
}

export function completeStory(state, chapterId, choiceId = null) {
  const chapter = STORY.find((s) => s.id === chapterId);
  if (!chapter) return { ok: false, reason: 'Capitolo inesistente.' };
  let chosen = null;
  if (chapter.choice) {
    chosen = chapter.choice.options.find((o) => o.id === choiceId) || null;
    if (!chosen) return { ok: false, reason: 'Scelta non valida.' };
    if (!storyOptionAvailable(state, chosen)) return { ok: false, reason: 'Scelta non disponibile.' };
    if (chosen.flag) state.story.flags[chosen.flag] = chosen.value;
    if (chosen.ending) state.story.ending = chosen.ending;
  }
  if (!state.story.seen.includes(chapterId)) state.story.seen.push(chapterId);
  state.story.pending = null;
  state.story.next = Math.max(state.story.next, STORY.findIndex((s) => s.id === chapterId) + 1);
  for (const id of chapter.grant || []) grantStoryCyborg(state, id);
  if (chapterId === 'ch12') state.story.epilogueSeen = true;
  return { ok: true, chapter, chosen, ending: state.story.ending ? ENDINGS[state.story.ending] : null };
}

export function endingFor(state) {
  return state.story.ending ? ENDINGS[state.story.ending] : null;
}

export function prestigeGain(state) {
  const b = bonuses(state);
  const base =
    state.run.scrap / 9000 +
    state.run.circuits / 1600 +
    state.run.cells * 2 +
    (state.campaign.wins || 0) * 2.5 +
    state.story.seen.length * 2 +
    (state.prestige.count || 0) * 3;
  return Math.max(1, Math.floor(base * b.fragmentMult));
}

export function canPrestige(state) {
  return state.story.seen.includes('ch10') || state.stats.scrapEarned >= 30000;
}

export function prestige(state) {
  if (!canPrestige(state)) return { ok: false, reason: 'La Sala Memoria non ha ancora abbastanza ricordi.' };
  const gainAmt = prestigeGain(state);
  state.resources.fragments += gainAmt;
  state.prestige.count = (state.prestige.count || 0) + 1;
  state.stats.prestiges = (state.prestige.count || 0);
  state.run = { scrap: 0, circuits: 0, cells: 0 };
  resetRun(state);
  return { ok: true, gain: gainAmt, count: state.prestige.count };
}

export function resetRun(state) {
  const mem = memoryEffects(state);
  const startScrap = 120 + (mem.startScrap || 0);
  const startCircuits = 24 + (mem.startCircuits || 0);
  state.resources.scrap = startScrap;
  state.resources.circuits = startCircuits;
  state.resources.cells = 0;
  for (const def of AREAS) {
    const initial = Boolean(def.initial);
    state.areas[def.id] = {
      unlocked: initial,
      level: initial ? 1 : 0,
      active: initial,
      supervisor: null,
    };
  }
  state.training = [];
  state.incubation = null;
  state.expedition = null;
  state.eco = { nextAt: nowMs() + 90000, activeUntil: 0, areaId: null, collected: state.eco?.collected || 0 };
  for (const c of state.cyborgs) {
    c.level = 1;
    c.xp = 0;
    c.rank = 1;
    c.affection = clamp(50 + (mem.affection || 0), 0, 100);
    c.area = null;
    c.bonus = { str: 0, prec: 0, synth: 0, loyal: 0 };
  }
  state.squad = state.cyborgs.slice(0, 3).map((c) => c.id);
  state.story.pending = null;
  state.campaign.selected = state.campaign.selected || 'n1';
  state.uiSelected = null;
  state.boostArmed = false;
  state.boostCooldownUntil = 0;
}

export function buyMemoryNode(state, id) {
  const node = MEMORY_BY_ID[id];
  if (!node) return { ok: false, reason: 'Ricordo inesistente.' };
  if (state.prestige.nodes[id]) return { ok: false, reason: 'Ricordo già acquistato.' };
  if (state.resources.fragments < node.cost) return { ok: false, reason: 'Frammenti insufficienti.' };
  state.resources.fragments -= node.cost;
  state.prestige.nodes[id] = true;
  return { ok: true, node };
}

export function tick(state, now = nowMs(), dt = 0) {
  const events = [];
  const seconds = clamp(dt, 0, 5);
  state.stats.playSeconds = (state.stats.playSeconds || 0) + seconds;
  const rates = productionRates(state);
  if (seconds > 0) {
    gain(state, {
      scrap: rates.scrap * seconds,
      circuits: rates.circuits * seconds,
      cells: rates.cells * seconds,
    });
    const b = bonuses(state);
    for (const c of state.cyborgs) {
      let rate = b.affectionRate;
      if (c.area) rate *= 1.2;
      if (c.affinity === c.area) rate *= 1.2;
      c.affection = clamp((c.affection || 0) + (rate / 60) * seconds, 0, 100);
    }
    if (state.eco.activeUntil && now > state.eco.activeUntil) {
      state.eco.activeUntil = 0;
      state.eco.areaId = null;
      state.eco.nextAt = now + (95 + Math.random() * 75) * 1000;
    }
    if (!state.eco.activeUntil && now >= state.eco.nextAt) {
      const candidates = AREAS.filter((a) => a.resource && a.resource !== 'power' && isAreaUnlocked(state, a.id));
      if (candidates.length) {
        const a = candidates[Math.floor(Math.random() * candidates.length)];
        state.eco.areaId = a.id;
        state.eco.activeUntil = now + bonuses(state).ecoDuration * 1000;
        events.push({ type: 'eco', areaId: a.id });
      } else {
        state.eco.nextAt = now + 30000;
      }
    }
  }
  const training = collectTraining(state, now);
  for (const e of training) events.push(e);
  const inc = collectIncubation(state, now);
  if (inc) events.push(inc);
  const exp = collectExpedition(state, now);
  if (exp) events.push(exp);
  const story = checkStory(state);
  if (story) events.push({ type: 'story', chapter: story });
  return events;
}

export function offlineAdvance(state, now = nowMs()) {
  const last = state.lastSeen || now;
  const elapsed = Math.max(0, (now - last) / 1000);
  if (elapsed < 5) {
    state.lastSeen = now;
    return null;
  }
  const b = bonuses(state);
  const cap = b.offlineHours * 3600;
  const used = Math.min(elapsed, cap);
  const efficiency = b.auto ? 1 : 0.5;
  const rates = productionRates(state);
  const rewards = {
    scrap: rates.scrap * used * efficiency,
    circuits: rates.circuits * used * efficiency,
    cells: rates.cells * used * efficiency,
  };
  gain(state, rewards);
  state.stats.offlineEarned = (state.stats.offlineEarned || 0) + rewards.scrap;
  const training = collectTraining(state, now);
  const inc = collectIncubation(state, now);
  const exp = collectExpedition(state, now);
  const capped = elapsed > cap;
  state.lastSeen = now;
  return {
    elapsed,
    used,
    capped,
    efficiency,
    rewards,
    training,
    incubation: inc,
    expedition: exp,
  };
}

export function createInitialState(now = nowMs()) {
  const state = {
    v: SAVE_VERSION,
    seq: 1,
    createdAt: now,
    lastSeen: now,
    resources: { scrap: 120, circuits: 24, cells: 0, fragments: 0 },
    areas: {},
    cyborgs: [],
    squad: [],
    training: [],
    incubation: null,
    expedition: null,
    campaign: { wins: 0, cleared: [], selected: 'n1' },
    boostArmed: false,
    boostCooldownUntil: 0,
    story: {
      next: 0,
      seen: [],
      pending: null,
      flags: {},
      ending: null,
      epilogueSeen: false,
    },
    prestige: { count: 0, nodes: {} },
    eco: { nextAt: now + 90000, activeUntil: 0, areaId: null, collected: 0 },
    stats: {
      scrapEarned: 0,
      circuitsEarned: 0,
      cellsEarned: 0,
      battles: 0,
      wins: 0,
      playSeconds: 0,
      maxPower: 0,
      creations: 0,
      wipes: 0,
      prestiges: 0,
      offlineEarned: 0,
    },
    run: { scrap: 0, circuits: 0, cells: 0 },
    settings: {
      sound: true,
      music: true,
      haptics: true,
      reducedMotion: false,
      quality: 'auto',
    },
    tutorial: { step: 0, done: false },
    log: [],
  };
  for (const def of AREAS) {
    const initial = Boolean(def.initial);
    state.areas[def.id] = {
      unlocked: initial,
      level: initial ? 1 : 0,
      active: initial,
      supervisor: null,
    };
  }
  const starter = newCyborg(state, { kind: 'blueprint', blueprintId: 'cenere' });
  state.cyborgs.push(starter);
  state.squad = [starter.id];
  state.stats.creations = 1;
  return state;
}

export function sanitizeState(raw, now = nowMs()) {
  const base = createInitialState(now);
  if (!raw || typeof raw !== 'object') return base;
  const state = base;
  state.v = SAVE_VERSION;
  state.seq = Math.max(1, Math.floor(Number(raw.seq) || 1));
  state.createdAt = Number(raw.createdAt) || now;
  state.lastSeen = Number(raw.lastSeen) || now;
  state.resources = {
    scrap: Math.max(0, Number(raw.resources?.scrap) || 0),
    circuits: Math.max(0, Number(raw.resources?.circuits) || 0),
    cells: Math.max(0, Number(raw.resources?.cells) || 0),
    fragments: Math.max(0, Number(raw.resources?.fragments) || 0),
  };
  state.areas = {};
  for (const def of AREAS) {
    const a = raw.areas?.[def.id] || {};
    const initial = Boolean(def.initial);
    const unlocked = typeof a.unlocked === 'boolean' ? a.unlocked : initial;
    state.areas[def.id] = {
      unlocked,
      level: unlocked ? clamp(Math.floor(Number(a.level) || 1), 1, LEVEL_MAX) : 0,
      active: unlocked ? a.active !== false : false,
      supervisor: typeof a.supervisor === 'string' ? a.supervisor : null,
    };
  }
  if (!state.areas.reactor.unlocked) state.areas.reactor = { ...base.areas.reactor, level: 1, unlocked: true, active: true };
  if (!state.areas.foundry.unlocked) state.areas.foundry = { ...base.areas.foundry, level: 1, unlocked: true, active: true };
  state.cyborgs = [];
  if (Array.isArray(raw.cyborgs)) {
    for (const c of raw.cyborgs.slice(0, ROSTER_MAX + 3)) {
      const bp = c.blueprintId ? BLUEPRINT_BY_ID[c.blueprintId] : null;
      if (!bp && !c.base) continue;
      const trait = TRAITS.some((t) => t.id === c.trait) ? c.trait : 'resiliente';
      state.cyborgs.push({
        id: String(c.id || `c${state.seq++}`),
        blueprintId: c.blueprintId || null,
        kind: c.kind || 'blueprint',
        name: String(c.name || bp?.name || 'Prototipo'),
        serial: String(c.serial || bp?.serial || 'P-??'),
        tier: String(c.tier || bp?.tier || 'Prototipo'),
        role: String(c.role || bp?.role || 'Prototipo'),
        affinity: AREA_BY_ID[c.affinity] ? c.affinity : (bp?.affinity || 'foundry'),
        body: String(c.body || bp?.body || '#6c7b82'),
        accent: String(c.accent || bp?.accent || '#84e6d8'),
        glow: String(c.glow || bp?.glow || '#e9ffff'),
        trait,
        base: c.base || { ...(bp?.base || { str: 6, prec: 6, synth: 6, loyal: 6 }) },
        growth: c.growth || { ...(bp?.growth || { str: 1, prec: 1, synth: 1, loyal: 1 }) },
        bonus: {
          str: Number(c.bonus?.str) || 0,
          prec: Number(c.bonus?.prec) || 0,
          synth: Number(c.bonus?.synth) || 0,
          loyal: Number(c.bonus?.loyal) || 0,
        },
        level: clamp(Math.floor(Number(c.level) || 1), 1, 30),
        xp: Math.max(0, Number(c.xp) || 0),
        rank: clamp(Math.floor(Number(c.rank) || 1), 1, 5),
        affection: clamp(Number(c.affection) || 0, 0, 100),
        area: typeof c.area === 'string' && state.areas[c.area]?.unlocked ? c.area : null,
        memoryWiped: Boolean(c.memoryWiped),
        story: Boolean(c.story),
        createdAt: Number(c.createdAt) || now,
      });
    }
  }
  if (!state.cyborgs.length) {
    const starter = newCyborg(state, { kind: 'blueprint', blueprintId: 'cenere' });
    state.cyborgs.push(starter);
  }
  for (const c of state.cyborgs) {
    const n = Number(String(c.id).replace(/^c/, ''));
    if (Number.isFinite(n)) state.seq = Math.max(state.seq, n);
  }
  state.squad = Array.isArray(raw.squad)
    ? raw.squad.filter((id) => state.cyborgs.some((c) => c.id === id)).slice(0, 3)
    : [];
  if (!state.squad.length) state.squad = state.cyborgs.slice(0, 3).map((c) => c.id);
  state.training = Array.isArray(raw.training)
    ? raw.training.filter((t) => state.cyborgs.some((c) => c.id === t.cyborgId)).slice(0, 5)
    : [];
  state.incubation = raw.incubation && typeof raw.incubation === 'object' ? raw.incubation : null;
  state.expedition = raw.expedition && typeof raw.expedition === 'object' ? raw.expedition : null;
  state.campaign = {
    wins: Math.max(0, Math.floor(Number(raw.campaign?.wins) || 0)),
    cleared: Array.isArray(raw.campaign?.cleared) ? raw.campaign.cleared.filter((id) => CAMPAIGN_BY_ID[id]) : [],
    selected: CAMPAIGN_BY_ID[raw.campaign?.selected] ? raw.campaign.selected : 'n1',
  };
  state.boostArmed = Boolean(raw.boostArmed);
  state.boostCooldownUntil = Math.max(0, Number(raw.boostCooldownUntil) || 0);
  state.story = {
    next: clamp(Math.floor(Number(raw.story?.next) || 0), 0, STORY.length),
    seen: Array.isArray(raw.story?.seen) ? raw.story.seen.filter((id) => STORY.some((s) => s.id === id)) : [],
    pending: raw.story?.pending && STORY.some((s) => s.id === raw.story.pending) ? raw.story.pending : null,
    flags: raw.story?.flags && typeof raw.story.flags === 'object' ? raw.story.flags : {},
    ending: ENDINGS[raw.story?.ending] ? raw.story.ending : null,
    epilogueSeen: Boolean(raw.story?.epilogueSeen),
  };
  state.prestige = {
    count: Math.max(0, Math.floor(Number(raw.prestige?.count) || 0)),
    nodes: raw.prestige?.nodes && typeof raw.prestige.nodes === 'object' ? raw.prestige.nodes : {},
  };
  state.eco = {
    nextAt: Number(raw.eco?.nextAt) || now + 90000,
    activeUntil: Number(raw.eco?.activeUntil) || 0,
    areaId: AREA_BY_ID[raw.eco?.areaId] ? raw.eco.areaId : null,
    collected: Math.max(0, Math.floor(Number(raw.eco?.collected) || 0)),
  };
  state.stats = { ...base.stats };
  for (const k of Object.keys(state.stats)) state.stats[k] = Math.max(0, Number(raw.stats?.[k]) || 0);
  state.run = {
    scrap: Math.max(0, Number(raw.run?.scrap) || 0),
    circuits: Math.max(0, Number(raw.run?.circuits) || 0),
    cells: Math.max(0, Number(raw.run?.cells) || 0),
  };
  state.settings = { ...base.settings, ...(raw.settings || {}) };
  state.tutorial = { ...base.tutorial, ...(raw.tutorial || {}) };
  state.log = Array.isArray(raw.log) ? raw.log.slice(0, 20) : [];
  for (const id of Object.keys(state.areas)) {
    const a = state.areas[id];
    if (!a.supervisor) continue;
    if (!a.unlocked || !state.cyborgs.some((c) => c.id === a.supervisor)) a.supervisor = null;
  }
  for (const c of state.cyborgs) {
    if (c.area && (!state.areas[c.area]?.unlocked || state.areas[c.area].supervisor !== c.id)) c.area = null;
  }
  return state;
}

export function encodeState(state) {
  state.lastSeen = nowMs();
  return JSON.parse(JSON.stringify(state));
}
