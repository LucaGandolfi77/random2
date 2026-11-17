/* Pure Machine Hunt simulation. No DOM, no Canvas, no timers.
 * The renderer and the browser loop call stepHunt(); tests call it directly.
 * Structured visual events go into hunt.fx; the string events returned by
 * stepHunt() stay stable for audio and tests.
 */
import {
  SAVE_KEY, ARENA, WAVES_PER_HUNT, UPGRADES, PLOTS, COMPANIONS, ENEMIES,
  MODIFIERS, BASE, MISSIONS, DAILY, VILLAGE_ITEMS, VILLAGERS, BOUNTIES, GRID,
  BIOMES, HAZARDS, BOSS_TYPES, MODES, CAMPAIGN_HUNTS,
  SKILLS, MATERIALS, GEAR, QUESTS, XP, STORY, SEASONS, JOBS, ACHIEVEMENTS, SEASON,
} from "./data.js";
import { bossPhaseFor, tickBossCommands, BOSS_SCRIPTS } from "./bosses.js";
import {
  createCombatState, selectWeapon, stepStamina, attackProfile, resolveDamage,
  applyStatus, tickStatuses, statusSlow, isStunned,
} from "./combat.js";

/* -------------------------------------------------------------- rng/save */

export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultSave() {
  return {
    version: 8,
    tutorialSeen: false,
    meta: {
      seasonWeek: 1, seasonXp: 0, prestige: 0, achievements: {}, notified: false,
    },
    villageJobs: { aloy: "hunter", varl: "guard", teersa: "crafter" },
    production: { lastTick: 0, scrap: 0, bricks: 0, cores: 0 },
    story: { chapter: 0, choices: {}, bonuses: {} },
    season: { date: null, key: null },
    campaign: { progress: 0, cleared: [] },
    player: { level: 1, xp: 0, points: 0 },
    materials: { scrap: 0, bricks: 0, parts: 0 },
    skills: { combat: 0, survival: 0, crafting: 0 },
    gear: { weapon: null, armour: null, trinket: null },
    inventory: [],
    companionLevels: { bruiser: 0, mender: 0, gunner: 0 },
    party: [null, null],
    quests: {},
    cores: 0,
    bestScore: 0,
    huntLevel: 1,
    upgrades: { bow: 0, quiver: 0, armour: 0, boots: 0 },
    plots: { workshop: false, garden: false, banner: false, lookout: false },
    companions: { bruiser: false, mender: false, gunner: false },
    activeCompanion: null,
    totalHunts: 0,
    totalKills: 0,
    daily: { date: null, best: 0, streak: 0, lastPlayed: null, wins: 0 },
    stats: {
      shots: 0, hits: 0, bestCombo: 0, playtime: 0,
      flawless: 0, companionWins: 0, dailyWins: 0,
      crafted: 0, campaignCleared: 0, duoHunts: 0, bossKills: 0,
    },
    missions: {},
    ghost: { score: 0, samples: [] },
    game: { scheme: "drag", aimAssist: true, sensitivity: 1, palette: "default", lang: "en" },
    village: { placements: [], glyph: 0 },
    bounty: { date: null, key: null, progress: 0, done: false, claimed: false },
    villagerMet: {},
  };
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const levelOf = (obj, key) => clamp(Number(obj?.[key]) || 0, 0, UPGRADES[key].costs.length);

const count = (value, max = 9999999) => clamp(Math.floor(Number(value) || 0), 0, max);
const dateText = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export function sanitizeSave(raw) {
  const out = defaultSave();
  if (!raw || typeof raw !== "object") return out;
  out.version = 6;
  out.tutorialSeen = raw.tutorialSeen === true;

  const pl = raw.player || {};
  const level = clamp(count(pl.level, 99) || 1, 1, 99);
  out.player = {
    level,
    xp: count(pl.xp, 9999999),
    points: count(pl.points, 999),
  };
  const mat = raw.materials || {};
  out.materials = {
    scrap: count(mat.scrap), bricks: count(mat.bricks), parts: count(mat.parts, 9999),
  };
  for (const key of Object.keys(SKILLS)) {
    out.skills[key] = clamp(count(raw.skills?.[key], SKILLS[key].max), 0, SKILLS[key].max);
  }
  for (const slot of ["weapon", "armour", "trinket"]) {
    const id = raw.gear?.[slot];
    out.gear[slot] = GEAR[id] && GEAR[id].slot === slot ? id : null;
  }
  out.inventory = Array.isArray(raw.inventory)
    ? raw.inventory.filter((id) => GEAR[id]).slice(0, 40) : [];
  for (const key of Object.keys(COMPANIONS)) {
    out.companionLevels[key] = clamp(count(raw.companionLevels?.[key], 3), 0, 3);
  }
  const party = Array.isArray(raw.party) ? raw.party : [];
  out.party = [0, 1].map((slot) => {
    const key = party[slot];
    return COMPANIONS[key] && raw.companions?.[key] === true ? key : null;
  });
  if (out.party[0] && out.party[1] && out.party[0] === out.party[1]) out.party[1] = null;
  for (const key of Object.keys(QUESTS)) out.quests[key] = raw.quests?.[key] === true;
  out.campaign = {
    progress: clamp(count(raw.campaign?.progress, CAMPAIGN_HUNTS.length), 0, CAMPAIGN_HUNTS.length),
    cleared: Array.isArray(raw.campaign?.cleared)
      ? raw.campaign.cleared.filter((i) => Number.isInteger(i) && i >= 0 && i < CAMPAIGN_HUNTS.length)
      : [],
  };
  out.version = 7;
  for (const key of Object.keys(VILLAGERS)) {
    const job = raw.villageJobs?.[key];
    out.villageJobs[key] = JOBS[job] ? job : defaultSave().villageJobs[key];
  }
  const prod = raw.production || {};
  out.production = {
    lastTick: count(prod.lastTick, Number.MAX_SAFE_INTEGER),
    scrap: count(prod.scrap), bricks: count(prod.bricks), cores: count(prod.cores),
  };
  const story = raw.story || {};
  out.story = {
    chapter: clamp(count(story.chapter, STORY.length), 0, STORY.length),
    choices: story.choices && typeof story.choices === "object" ? { ...story.choices } : {},
    bonuses: story.bonuses && typeof story.bonuses === "object" ? { ...story.bonuses } : {},
  };
  const season = raw.season || {};
  out.season = { date: dateText(season.date), key: SEASONS[season.key] ? season.key : null };

  out.cores = count(raw.cores);
  out.bestScore = count(raw.bestScore);
  out.huntLevel = clamp(count(raw.huntLevel, 999) || 1, 1, 999);
  for (const key of Object.keys(UPGRADES)) out.upgrades[key] = levelOf(raw.upgrades, key);
  for (const key of Object.keys(PLOTS)) out.plots[key] = raw.plots?.[key] === true;
  for (const key of Object.keys(COMPANIONS)) out.companions[key] = raw.companions?.[key] === true;
  out.activeCompanion = COMPANIONS[raw.activeCompanion] && out.companions[raw.activeCompanion]
    ? raw.activeCompanion : null;
  if (out.party[0]) out.activeCompanion = out.party[0];
  else if (out.activeCompanion) out.party[0] = out.activeCompanion;
  out.totalHunts = count(raw.totalHunts);
  out.totalKills = count(raw.totalKills);

  out.version = 8;
  const meta = raw.meta || {};
  out.meta = {
    seasonWeek: clamp(count(meta.seasonWeek, SEASON.weeks) || 1, 1, SEASON.weeks),
    seasonXp: count(meta.seasonXp),
    prestige: count(meta.prestige, 999),
    notified: meta.notified === true,
    achievements: {},
  };
  for (const key of Object.keys(ACHIEVEMENTS)) out.meta.achievements[key] = meta.achievements?.[key] === true;

  const d = raw.daily || {};
  out.daily = {
    date: dateText(d.date), best: count(d.best), streak: count(d.streak, 9999),
    lastPlayed: dateText(d.lastPlayed), wins: count(d.wins),
  };
  const s = raw.stats || {};
  out.stats = {
    shots: count(s.shots), hits: count(s.hits), bestCombo: count(s.bestCombo),
    playtime: count(s.playtime), flawless: count(s.flawless),
    companionWins: count(s.companionWins), dailyWins: count(s.dailyWins),
    crafted: count(s.crafted), campaignCleared: count(s.campaignCleared),
    duoHunts: count(s.duoHunts), bossKills: count(s.bossKills),
  };
  for (const key of Object.keys(MISSIONS)) out.missions[key] = raw.missions?.[key] === true;

  const g = raw.ghost || {};
  out.ghost = {
    score: count(g.score),
    samples: Array.isArray(g.samples)
      ? g.samples.slice(-400).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({ x: count(p.x, ARENA.width), y: count(p.y, ARENA.height) }))
      : [],
  };

  const game = raw.game || {};
  out.game = {
    scheme: ["drag", "stick", "onehand"].includes(game.scheme) ? game.scheme : "drag",
    aimAssist: game.aimAssist !== false,
    sensitivity: clamp(Number(game.sensitivity) || 1, 0.6, 1.6),
    palette: ["default", "colorblind", "contrast"].includes(game.palette) ? game.palette : "default",
    lang: game.lang === "it" ? "it" : "en",
  };

  /* v4: migrate the old fixed plot flags onto the draggable village grid. */
  const v = raw.village || {};
  const placements = [];
  if (Array.isArray(v.placements)) {
    const used = new Set();
    for (const p of v.placements) {
      if (!p || !VILLAGE_ITEMS[p.key]) continue;
      const cell = clamp(Math.floor(Number(p.cell)), 0, GRID.cols * GRID.rows - 1);
      if (used.has(cell)) continue;
      used.add(cell);
      placements.push({ key: p.key, cell });
    }
  } else {
    let cell = 0;
    for (const key of Object.keys(PLOTS)) {
      if (out.plots[key]) placements.push({ key, cell: cell++ });
    }
  }
  out.village = { placements, glyph: clamp(count(v.glyph), 0, 4) };

  const b = raw.bounty || {};
  out.bounty = {
    date: dateText(b.date),
    key: BOUNTIES[b.key] ? b.key : null,
    progress: count(b.progress, 999),
    done: b.done === true,
    claimed: b.claimed === true,
  };
  for (const key of Object.keys(VILLAGERS)) out.villagerMet[key] = raw.villagerMet?.[key] === true;
  return out;
}

/* ----------------------------------------------------------- village/bounty */

export function hasPlot(save, key) {
  return save.village?.placements?.some((p) => p.key === key) || false;
}

export function dailyBountyKey(date = new Date()) {
  const keys = Object.keys(BOUNTIES);
  return keys[dailySeed(date) % keys.length];
}

export function refreshBounty(save, date = new Date()) {
  const today = dateKey(date);
  if (save.bounty.date === today && save.bounty.key) return save;
  return sanitizeSave({
    ...save,
    bounty: { date: today, key: dailyBountyKey(date), progress: 0, done: false, claimed: false },
  });
}

function bountyProgress(hunt, save) {
  const key = save.bounty.key;
  if (!key || !BOUNTIES[key]) return 0;
  const def = BOUNTIES[key];
  if (def.stat === "scout") return hunt.enemyKills.scout || 0;
  if (def.stat === "waves") return hunt.phase === "won" ? 3 : hunt.wave - 1;
  if (def.stat === "flawless") return hunt.phase === "won" && hunt.damageTaken === 0 ? 1 : 0;
  if (def.stat === "companion") return hunt.phase === "won" && hunt.companion.type ? 1 : 0;
  if (def.stat === "cores") return hunt.coresEarned;
  return 0;
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return raw ? sanitizeSave(JSON.parse(raw)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function persistSave(save, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(sanitizeSave(save)));
  } catch {
    /* private mode: progress survives in memory for this session */
  }
}

/* ----------------------------------------------------------------- stats */

function gearBonus(save, field) {
  let total = 0;
  for (const id of Object.values(save.gear || {})) {
    if (id && GEAR[id]) total += GEAR[id][field] || 0;
  }
  return total;
}

export function statsFromSave(save) {
  const u = save.upgrades;
  const skills = save.skills || { combat: 0, survival: 0, crafting: 0 };
  const bonus = {};
  for (const p of save.village?.placements || []) {
    const item = VILLAGE_ITEMS[p.key];
    if (!item) continue;
    for (const [field, value] of Object.entries(item)) {
      if (typeof value === "number" && field !== "cost") {
        bonus[field] = (bonus[field] || 0) + value;
      }
    }
  }
  for (const [field, value] of Object.entries(save.story?.bonuses || {})) {
    if (typeof value === "number") bonus[field] = (bonus[field] || 0) + value;
  }
  const season = SEASONS[save.season?.key];
  for (const [field, value] of Object.entries(season?.effect || {})) {
    if (typeof value === "number") bonus[field] = (bonus[field] || 0) + value;
  }
  const party = (save.party || []).filter(Boolean);
  const synergy = party.length >= 2 ? 1.1 : 1;
  const base = BASE.damage + u.bow + gearBonus(save, "damage");
  return {
    maxHp: BASE.maxHp + u.armour + skills.survival + gearBonus(save, "maxHp") + (bonus.maxHp || 0),
    speed: BASE.speed + u.boots * 22,
    damage: base * (1 + (bonus.damage || 0)) * (1 + skills.combat * 0.06),
    fireInterval: Math.max(0.28, BASE.fireInterval - u.quiver * 0.085),
    chargedMultiplier: BASE.chargedMultiplier + u.quiver * 0.3 + gearBonus(save, "charged"),
    telegraph: BASE.telegraph + (bonus.telegraph || 0),
    coreBonus: (bonus.coreBonus || 0) + (bonus.coreMult ? 2 : 0),
    coreMult: 1 + (bonus.coreMult || 0),
    scrapBonus: bonus.scrapBonus || 0,
    brickBonus: bonus.brickBonus || 0,
    compPower: (1 + (bonus.compPower || 0)) * synergy,
    scoreBonus: 1 + (bonus.scoreBonus || 0),
    materialBonus: 1 + skills.crafting * 0.1 + (bonus.materialBonus || 0),
    xpBonus: 1 + (bonus.xpBonus || 0),
    defense: bonus.defense || 0,
    companion: party[0] || save.activeCompanion || null,
    party,
  };
}

/* ----------------------------------------------------------- living world */

export function dailyEvent(date = new Date()) {
  const index = dailySeed(date) % SEASONS.length;
  return { key: index, ...SEASONS[index] };
}

export function refreshSeason(save, date = new Date()) {
  const today = dateKey(date);
  if (save.season.date === today && save.season.key !== null) return save;
  const event = dailyEvent(date);
  return sanitizeSave({ ...save, season: { date: today, key: event.key } });
}

export function assignJob(save, villager, job) {
  if (!VILLAGERS[villager] || !JOBS[job]) return save;
  return sanitizeSave({ ...save, villageJobs: { ...save.villageJobs, [villager]: job } });
}

export function collectProduction(save, now = Date.now()) {
  const last = save.production.lastTick || now;
  const hours = Math.max(0, Math.min(8, (now - last) / 3600000));
  const rates = { scrap: 0, bricks: 0, cores: 0 };
  for (const [villager, job] of Object.entries(save.villageJobs || {})) {
    const def = JOBS[job];
    if (def) rates[def.produces] += def.rate;
  }
  const mult = statsFromSave(save).materialBonus || 1;
  const gained = {
    scrap: Math.floor(rates.scrap * hours * 6 * mult),
    bricks: Math.floor(rates.bricks * hours * 6 * mult),
    cores: Math.floor(rates.cores * hours * 6 * mult),
  };
  return {
    save: sanitizeSave({
      ...save,
      production: { lastTick: now, scrap: 0, bricks: 0, cores: 0 },
      cores: save.cores + gained.cores,
      materials: {
        scrap: save.materials.scrap + gained.scrap,
        bricks: save.materials.bricks + gained.bricks,
        parts: save.materials.parts,
      },
    }),
    gained,
    hours,
  };
}

export function storyChapterForHunt(index) {
  return Math.min(STORY.length - 1, Math.floor(index / 2));
}

export function applyStoryChoice(save, chapter, choiceIndex) {
  if (chapter < 0 || chapter >= STORY.length) return save;
  if (save.story.choices[chapter] !== undefined) return save;
  const choice = STORY[chapter].choices[choiceIndex];
  if (!choice) return save;
  const bonuses = { ...save.story.bonuses };
  const materials = { ...save.materials };
  let cores = save.cores;
  for (const [key, value] of Object.entries(choice.bonus || {})) {
    if (key === "cores") cores += value;
    else if (MATERIALS.includes(key)) materials[key] += value;
    else bonuses[key] = (bonuses[key] || 0) + value;
  }
  return sanitizeSave({
    ...save,
    cores,
    materials,
    story: {
      chapter: Math.max(save.story.chapter, chapter + 1),
      choices: { ...save.story.choices, [chapter]: choiceIndex },
      bonuses,
    },
  });
}

/* ------------------------------------------------------------ progression */

export function xpForLevel(level) {
  return 20 + (level - 1) * 18 + (level - 1) * (level - 1) * 4;
}

export function addXp(save, amount) {
  let level = save.player.level;
  let xp = save.player.xp + Math.max(0, Math.round(amount));
  let points = save.player.points;
  let levels = 0;
  while (xp >= xpForLevel(level) && level < 99) {
    xp -= xpForLevel(level);
    level += 1;
    points += 1;
    levels += 1;
  }
  return {
    save: sanitizeSave({ ...save, player: { level, xp, points } }),
    levels,
  };
}

export function buySkill(save, branch) {
  const def = SKILLS[branch];
  if (!def || save.player.points <= 0) return save;
  const current = save.skills[branch];
  if (current >= def.max) return save;
  if (branch !== "combat" && current >= save.skills.combat && current >= 2) return save;
  return sanitizeSave({
    ...save,
    player: { ...save.player, points: save.player.points - 1 },
    skills: { ...save.skills, [branch]: current + 1 },
  });
}

export function canCraft(save, id) {
  const def = GEAR[id];
  if (!def || save.inventory.includes(id)) return false;
  for (const [mat, cost] of Object.entries(def.cost)) {
    if ((save.materials[mat] || 0) < cost) return false;
  }
  return true;
}

export function craftGear(save, id) {
  const def = GEAR[id];
  if (!def || save.inventory.includes(id) || !canCraft(save, id)) return save;
  const materials = { ...save.materials };
  for (const [mat, cost] of Object.entries(def.cost)) materials[mat] -= cost;
  const inventory = [...save.inventory, id];
  const gear = { ...save.gear, [def.slot]: save.gear[def.slot] || id };
  const crafted = sanitizeSave({
    ...save,
    materials,
    inventory,
    gear,
    stats: { ...save.stats, crafted: (save.stats.crafted || 0) + 1 },
  });
  return crafted;
}

export function equipGear(save, id) {
  const def = GEAR[id];
  if (!def || !save.inventory.includes(id)) return save;
  return sanitizeSave({ ...save, gear: { ...save.gear, [def.slot]: id } });
}

export function companionUpgradeCost(key, level = 0) {
  if (!COMPANIONS[key]) return null;
  return { scrap: 12 + level * 10, parts: level };
}

export function upgradeCompanionLevel(save, key) {
  if (!COMPANIONS[key]) return save;
  const level = save.companionLevels[key];
  if (level >= 3) return save;
  const cost = companionUpgradeCost(key, level);
  for (const [mat, amount] of Object.entries(cost)) {
    if ((save.materials[mat] || 0) < amount) return save;
  }
  const materials = { ...save.materials };
  for (const [mat, amount] of Object.entries(cost)) materials[mat] -= amount;
  return sanitizeSave({
    ...save,
    materials,
    companionLevels: { ...save.companionLevels, [key]: level + 1 },
  });
}

export function setParty(save, slot, key) {
  if (slot !== 0 && slot !== 1) return save;
  if (key !== null && (!COMPANIONS[key] || !save.companions[key])) return save;
  const party = [...(save.party || [null, null])];
  if (key && party[1 - slot] === key) party[1 - slot] = null;
  party[slot] = key;
  return sanitizeSave({ ...save, party, activeCompanion: party[0] || null });
}

export function applyQuests(save) {
  const claimed = [];
  let next = save;
  for (const [id, quest] of Object.entries(QUESTS)) {
    if (next.quests[id]) continue;
    const value = id === "campaign" ? next.campaign.cleared.length
      : id === "firstCraft" ? next.inventory.length
      : next.stats[quest.stat] || (quest.stat === "totalKills" ? next.totalKills : 0);
    if (value >= quest.target) {
      let updated = { ...next, quests: { ...next.quests, [id]: true } };
      updated = addXp(updated, quest.reward.xp || 0).save;
      const materials = { ...updated.materials };
      for (const [mat, amount] of Object.entries(quest.reward)) {
        if (mat !== "xp") materials[mat] = (materials[mat] || 0) + amount;
      }
      next = sanitizeSave({ ...updated, materials });
      claimed.push({ label: quest.label, reward: quest.reward });
    }
  }
  return { save: next, claimed };
}

/* --------------------------------------------------------------- economy */

export function upgradeCost(save, key) {
  if (!UPGRADES[key]) return null;
  const level = save.upgrades[key];
  return level >= UPGRADES[key].costs.length ? null : UPGRADES[key].costs[level];
}

export function buyUpgrade(save, key) {
  const cost = upgradeCost(save, key);
  if (cost === null || save.cores < cost) return save;
  return {
    ...save,
    cores: save.cores - cost,
    upgrades: { ...save.upgrades, [key]: save.upgrades[key] + 1 },
  };
}

export function firstFreeCell(save) {
  const used = new Set((save.village?.placements || []).map((p) => p.cell));
  for (let i = 0; i < GRID.cols * GRID.rows; i++) if (!used.has(i)) return i;
  return -1;
}

export function placeVillage(save, key, cell = firstFreeCell(save)) {
  if (!VILLAGE_ITEMS[key] || cell < 0 || cell >= GRID.cols * GRID.rows) return save;
  if (hasPlot(save, key)) return save;
  const others = (save.village?.placements || []).filter((p) => p.cell !== cell);
  return sanitizeSave({
    ...save,
    plots: { ...save.plots, [key]: true },
    village: { ...save.village, placements: [...others, { key, cell }] },
  });
}

export function moveVillage(save, key, cell) {
  if (!hasPlot(save, key) || cell < 0 || cell >= GRID.cols * GRID.rows) return save;
  const placements = (save.village?.placements || []).filter((p) => p.key !== key);
  if (placements.some((p) => p.cell === cell)) return save;
  return sanitizeSave({
    ...save,
    village: { ...save.village, placements: [...placements, { key, cell }] },
  });
}

export function buildPlot(save, key) {
  if (!VILLAGE_ITEMS[key] || hasPlot(save, key) || save.cores < VILLAGE_ITEMS[key].cost) return save;
  const cell = firstFreeCell(save);
  if (cell < 0) return save;
  const placed = placeVillage(save, key, cell);
  return { ...placed, cores: save.cores - VILLAGE_ITEMS[key].cost };
}

export function unlockCompanion(save, key) {
  if (!COMPANIONS[key] || save.companions[key] || save.cores < COMPANIONS[key].cost) return save;
  const next = {
    ...save,
    cores: save.cores - COMPANIONS[key].cost,
    companions: { ...save.companions, [key]: true },
  };
  return next.activeCompanion ? next : { ...next, activeCompanion: key };
}

export function selectCompanion(save, key) {
  if (key !== null && (!COMPANIONS[key] || !save.companions[key])) return save;
  return { ...save, activeCompanion: key };
}

/* ------------------------------------------------------------------ hunt */

let nextId = 1;

function fx(hunt, kind, extra = {}) {
  hunt.fx.push({ kind, ...extra });
}

function chooseModifier(level, rng) {
  const keys = Object.keys(MODIFIERS).filter((key) => level >= MODIFIERS[key].minLevel);
  if (!keys.length || rng() > 0.55) return null;
  return keys[Math.floor(rng() * keys.length)];
}

export function chooseBiome(level, rng) {
  const keys = Object.keys(BIOMES);
  if (level <= 1) return "jungle";
  return keys[Math.floor(rng() * keys.length)];
}

function generateHazards(biome, rng) {
  const types = BIOMES[biome]?.hazards || [];
  const count = 3 + Math.floor(rng() * 3);
  const out = [];
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(rng() * types.length)];
    out.push({
      type,
      x: 70 + rng() * (ARENA.width - 140),
      y: 120 + rng() * (ARENA.height - 240),
      radius: type === "lava" ? 52 : type === "spikes" ? 46 : 64,
      phase: rng() * 3,
      timer: 0,
      active: false,
      hitCd: 0,
    });
  }
  return out;
}

export function spawnEnemy(hunt, type, rng) {
  const def = ENEMIES[type];
  const level = hunt.level;
  const mod = hunt.modifier ? MODIFIERS[hunt.modifier] : null;
  const hp = Math.round((def.hp + Math.floor((level - 1) * (type === "boss" ? 12 : 2))) *
    (mod?.hp || 1));
  const edge = Math.floor(rng() * 4);
  const margin = 50;
  let x, y;
  if (edge === 0) { x = rng() * ARENA.width; y = margin; }
  else if (edge === 1) { x = ARENA.width - margin; y = rng() * ARENA.height; }
  else if (edge === 2) { x = rng() * ARENA.width; y = ARENA.height - margin; }
  else { x = margin; y = rng() * ARENA.height; }
  const enemy = {
    id: nextId++, type, x, y, hp, maxHp: hp, boss: !!def.boss, bossType: type,
    timers: {}, chargeTime: 0, chargeVx: 0, chargeVy: 0,
    radius: def.radius,
    speed: (def.speed + (level - 1) * 2) * (mod?.speed || 1),
    damage: def.damage, cores: def.cores, score: def.score,
    attackCd: 0.6 + rng() * 0.6, windup: 0, attackKind: "melee",
    hitFlash: 0, angle: 0,
    volleyCd: 2.2, shotCd: 1.4 + rng(),
    burrowCd: 3 + rng() * 2, burrowTime: 0, burrowed: false,
    phase: 1, summoned: false, shockCd: 2.8,
    statuses: {},
    resistances: def.resistances || {},
  };
  hunt.enemies.push(enemy);
  return enemy;
}

function spawnWave(hunt, rng) {
  const wave = hunt.wave;
  const level = hunt.level;
  const extra = hunt.modifier && MODIFIERS[hunt.modifier].count
    ? MODIFIERS[hunt.modifier].count : 0;
  const roster = [];
  if (wave === 1) {
    roster.push("scout", "scout", "scout", "scout");
    if (level >= 2) roster.push("stalker");
    if (level >= 3) roster.push("lancer");
    if (level >= 5) roster.push("burrower");
    if (level >= 7) roster.push("flyer");
  } else if (wave === 2) {
    roster.push("scout", "scout", "scout", "grazer", "grazer");
    if (level >= 2) roster.push("lancer");
    if (level >= 3) roster.push("stalker", "stalker");
    if (level >= 4) roster.push("bulwark");
    if (level >= 6) roster.push("charger");
  } else {
    roster.push("scout", "scout", "scout", "grazer", "grazer", "grazer");
    if (level >= 2) roster.push("lancer");
    if (level >= 3) roster.push("burrower");
    if (level >= 4) roster.push("bulwark", "stalker");
    if (level >= 5) roster.push("flyer");
    if (level >= 6) roster.push("charger");
  }
  for (let i = 0; i < extra; i++) roster.push("scout");
  roster.forEach((type) => spawnEnemy(hunt, type, rng));
}

function spawnBoss(hunt, rng) {
  const types = BOSS_TYPES;
  const index = Math.min(types.length - 1, Math.floor((hunt.level - 1) / 3));
  spawnEnemy(hunt, types[index], rng);
  spawnEnemy(hunt, "scout", rng);
  spawnEnemy(hunt, levelGuard(hunt) ? "lancer" : "scout", rng);
  hunt.bossType = types[index];
  hunt.bossLabel = ENEMIES[types[index]].label;
}

function levelGuard(hunt) { return hunt.level >= 3; }

/* ------------------------------------------------------------------ daily */

export function dateKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isPreviousDay(previous, today) {
  if (!dateText(previous) || !dateText(today)) return false;
  const a = new Date(`${previous}T12:00:00`);
  const b = new Date(`${today}T12:00:00`);
  return Math.round((b - a) / 86400000) === 1;
}

export function dailySeed(date = new Date()) {
  const key = dateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  return y * 10000 + m * 100 + d;
}

export function dailyLevel(date = new Date()) {
  const day = Math.floor(new Date(date).getTime() / 86400000);
  return DAILY.baseLevel + (((day % DAILY.levelSpan) + DAILY.levelSpan) % DAILY.levelSpan);
}

/* --------------------------------------------------------------- missions */

export function applyMissions(save) {
  const claimed = [];
  let next = save;
  for (const [id, mission] of Object.entries(MISSIONS)) {
    if (next.missions[id]) continue;
    const value = mission.stat === "totalKills" ? next.totalKills : next.stats[mission.stat] || 0;
    if (value >= mission.target) {
      next = sanitizeSave({
        ...next,
        cores: next.cores + mission.reward,
        missions: { ...next.missions, [id]: true },
      });
      claimed.push({ label: mission.label, reward: mission.reward });
    }
  }
  return { save: next, claimed };
}

export function createHunt(save, seed = 12345, opts = {}) {
  const mode = MODES[opts.mode] ? opts.mode : opts.daily ? "daily" : "campaign";
  const daily = mode === "daily";
  const campaignIndex = clamp(save.campaign?.progress || 0, 0, CAMPAIGN_HUNTS.length - 1);
  const campaign = CAMPAIGN_HUNTS[campaignIndex];
  const level = daily ? dailyLevel(opts.date)
    : mode === "campaign" ? (opts.campaignLevel || campaign?.level || save.huntLevel)
    : mode === "bossrush" ? Math.max(4, save.huntLevel)
    : mode === "endless" ? Math.max(2, save.huntLevel)
    : save.huntLevel;
  const stats = statsFromSave(save);
  const rng = makeRng(daily ? dailySeed(opts.date) : seed);
  const modifier = chooseModifier(level, rng);
  const forced = opts.biome && BIOMES[opts.biome] ? opts.biome
    : mode === "campaign" ? campaign?.biome : null;
  const biome = forced || chooseBiome(level, rng);
  const hunt = {
    level,
    mode,
    daily,
    campaignIndex,
    bossRushIndex: 0,
    biome,
    hazards: generateHazards(biome, rng),
    seed: daily ? dailySeed(opts.date) : seed,
    sampleClock: 0,
    samples: [],
    ghost: save.ghost?.samples || [],
    shots: 0,
    hits: 0,
    damageTaken: 0,
    aimAssist: opts.aimAssist !== false,
    enemyKills: {},
    wave: 1,
    phase: "wave",
    modifier,
    time: 0,
    rng,
    stats,
    combat: createCombatState(),
    fx: [],
    player: {
      x: ARENA.width / 2, y: ARENA.height / 2,
      hp: stats.maxHp, maxHp: stats.maxHp,
      invuln: 0, fireCd: 0, charge: 0, radius: 16, angle: 0,
    },
    companion: {
      type: stats.companion,
      x: ARENA.width / 2 - 40, y: ARENA.height / 2 + 34,
      cooldown: 1.2, healCd: 6,
    },
    companions: (stats.party || []).filter(Boolean).map((type, i) => ({
      type,
      x: ARENA.width / 2 - 40 - i * 44, y: ARENA.height / 2 + 34 + i * 26,
      cooldown: 1.2, healCd: 6,
      level: save.companionLevels?.[type] || 0,
    })),
    enemies: [],
    projectiles: [],
    cores: [],
    score: 0,
    kills: 0,
    coresEarned: 0,
    combo: 0,
    banner: 0,
    bossHp: null,
    bossMaxHp: null,
    bossPhase: 0,
  };
  if (hunt.companions.length) hunt.companion = hunt.companions[0];

  if (mode === "bossrush") {
    spawnBoss(hunt, rng);
    hunt.bossRushIndex = 1;
    hunt.phase = "boss";
  } else spawnWave(hunt, rng);
  return hunt;
}

function nearestEnemy(hunt, x, y, maxDist = Infinity) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const enemy of hunt.enemies) {
    if (enemy.hp <= 0 || enemy.burrowed) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = enemy; }
  }
  return best;
}

function fireProjectile(hunt, x, y, angle, damage, speed, friendly, radius = 5, pierce = 0, charged = false, options = {}) {
  hunt.projectiles.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, radius, friendly, pierce, charged, life: options.trap ? 9 : 2.2,
    homing: !!friendly && !!hunt.aimAssist && !options.trap,
    status: options.status || null,
    aoe: options.aoe || 0,
    trap: !!options.trap,
    mode: options.mode || "basic",
    weapon: options.weapon || "bow",
    triggerCd: 0,
  });
}

export function damageEnemy(hunt, id, amount, statusKey = null) {
  const enemy = hunt.enemies.find((e) => e.id === id && e.hp > 0);
  if (!enemy) return false;
  const resolved = resolveDamage(amount, enemy, statusKey);
  enemy.hp -= resolved.damage;
  enemy.hitFlash = 0.12;
  if (statusKey && applyStatus(enemy, statusKey, 1.4)) {
    fx(hunt, "status", { x: enemy.x, y: enemy.y, status: statusKey });
  }
  fx(hunt, "hit", { x: enemy.x, y: enemy.y, amount: resolved.damage });
  if (enemy.hp <= 0) {
    hunt.kills += 1;
    hunt.combo += 1;
    hunt.enemyKills[enemy.type] = (hunt.enemyKills[enemy.type] || 0) + 1;
    const gained = enemy.score + (hunt.combo - 1) * 2;
    hunt.score += gained;
    fx(hunt, "kill", { x: enemy.x, y: enemy.y, score: gained });
    for (let i = 0; i < Math.max(1, Math.round(enemy.cores / 2)); i++) {
      hunt.cores.push({
        x: enemy.x + (hunt.rng() - 0.5) * 24,
        y: enemy.y + (hunt.rng() - 0.5) * 24,
        value: 1, life: 9,
      });
    }
    return true;
  }
  return false;
}

function hurtPlayer(hunt, amount) {
  const p = hunt.player;
  if (p.invuln > 0) return false;
  p.hp -= amount;
  p.invuln = 0.9;
  hunt.damageTaken += amount;
  hunt.combo = 0;
  fx(hunt, "playerHit", { x: p.x, y: p.y, amount });
  return true;
}

function updateCompanion(hunt, dt, events) {
  const p = hunt.player;
  const power = hunt.stats.compPower;
  const list = hunt.companions?.length
    ? hunt.companions : (hunt.companion?.type ? [hunt.companion] : []);
  list.forEach((c, index) => {
    if (!c.type) return;
    const levelBonus = 1 + (c.level || 0) * 0.2;
    c.x += (p.x - 44 - index * 40 - c.x) * Math.min(1, dt * 4);
    c.y += (p.y + 30 + index * 24 - c.y) * Math.min(1, dt * 4);
    if (c.type === "bruiser") {
      c.cooldown -= dt;
      if (c.cooldown <= 0) {
        c.cooldown = 1.4;
        for (const e of hunt.enemies) {
          if (e.hp > 0 && !e.burrowed && Math.hypot(e.x - c.x, e.y - c.y) < 78) {
            damageEnemy(hunt, e.id, 2 * power * levelBonus);
            events.push("companionHit");
          }
        }
      }
    } else if (c.type === "mender") {
      c.healCd -= dt;
      if (c.healCd <= 0) {
        c.healCd = 6;
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + Math.ceil(power * levelBonus));
          fx(hunt, "heal", { x: p.x, y: p.y });
          events.push("heal");
        }
      }
    } else if (c.type === "gunner") {
      c.cooldown -= dt;
      if (c.cooldown <= 0) {
        const target = nearestEnemy(hunt, c.x, c.y, 420);
        if (target) {
          c.cooldown = 1.1;
          const angle = Math.atan2(target.y - c.y, target.x - c.x);
          fireProjectile(hunt, c.x, c.y, angle, 1.6 * power * levelBonus, 460, true, 4);
          events.push("companionShot");
        }
      }
    }
  });
}

function executeBossCommand(hunt, e, command, events) {
  const p = hunt.player;
  if (command.kind === "volley") {
    for (let i = 0; i < command.count; i++) {
      const a = e.angle + (i - (command.count - 1) / 2) * command.spread;
      fireProjectile(hunt, e.x, e.y, a, command.damage, command.speed, false, 7);
    }
    events.push("bossVolley");
  } else if (command.kind === "shockwave") {
    for (let i = 0; i < command.count; i++) {
      const a = (i / command.count) * Math.PI * 2;
      fireProjectile(hunt, e.x, e.y, a, command.damage, command.speed, false, 6);
    }
    fx(hunt, "shockwave", { x: e.x, y: e.y, radius: command.radius });
    events.push("bossShockwave");
  } else if (command.kind === "summon") {
    for (let i = 0; i < command.count; i++) spawnEnemy(hunt, command.type, hunt.rng);
    events.push("bossSummon");
  } else if (command.kind === "charge") {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    e.chargeVx = Math.cos(a) * command.speed;
    e.chargeVy = Math.sin(a) * command.speed;
    e.chargeTime = 0.75;
    e.chargeDamage = command.damage;
    fx(hunt, "boss", { x: e.x, y: e.y });
    events.push("bossCharge");
  } else if (command.kind === "spikes") {
    for (let i = 0; i < command.count; i++) {
      const a = (i / command.count) * Math.PI * 2;
      fireProjectile(hunt, e.x, e.y, a, command.damage, 200, false, 5);
    }
    fx(hunt, "shockwave", { x: e.x, y: e.y, radius: command.radius });
    events.push("bossSpikes");
  } else if (command.kind === "beam") {
    for (let i = 0; i < command.length; i++) {
      const dx = Math.cos(e.angle) * i * command.spacing;
      const dy = Math.sin(e.angle) * i * command.spacing;
      fireProjectile(hunt, e.x + dx, e.y + dy, e.angle, command.damage, command.speed, false, 6);
    }
    fx(hunt, "shockwave", { x: e.x, y: e.y, radius: 120 });
    events.push("bossBeam");
  }
}

function updateBoss(hunt, e, dt, events) {
  const ratio = e.hp / e.maxHp;
  const phase = bossPhaseFor(e.bossType, ratio);
  if (phase !== e.phase) {
    const config = bossPhaseConfigFor(e.bossType, phase);
    e.phase = phase;
    hunt.bossPhase = phase;
    fx(hunt, "phase", { x: e.x, y: e.y, phase });
    events.push("bossPhase");
    if (config.summon && !e.summoned) {
      e.summoned = true;
      for (let i = 0; i < config.summon; i++) spawnEnemy(hunt, "scout", hunt.rng);
      events.push("bossSummon");
    }
  }
  const commands = tickBossCommands(e.bossType, e, ratio, dt);
  commands.forEach((command) => executeBossCommand(hunt, e, command, events));
  if (bossPhaseConfigFor(e.bossType, phase).enrage) e.speed += dt * 2;
}

function bossPhaseConfigFor(type, phase) {
  const script = BOSS_SCRIPTS[type] || BOSS_SCRIPTS.boss;
  return script.phases[Math.max(0, Math.min(script.phases.length - 1, phase - 1))];
}

function updateEnemies(hunt, dt, events) {
  const p = hunt.player;
  const c = hunt.companion;
  for (const e of hunt.enemies) {
    if (e.hp <= 0) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.attackCd = Math.max(0, e.attackCd - dt);
    for (const effect of tickStatuses(e, dt)) {
      if (effect.type === "statusTick") damageEnemy(hunt, e.id, effect.amount);
      else if (effect.type === "statusEnd") events.push("statusEnd");
    }
    if (e.hp <= 0) continue;
    const speed = e.speed * statusSlow(e) * hazardSlow(hunt, e.x, e.y);
    const stunned = isStunned(e);

    if (e.type === "burrower") {
      if (e.burrowed) {
        e.burrowTime -= dt;
        if (e.burrowTime <= 0) {
          e.burrowed = false;
          const a = hunt.rng() * Math.PI * 2;
          e.x = clamp(p.x + Math.cos(a) * 130, e.radius, ARENA.width - e.radius);
          e.y = clamp(p.y + Math.sin(a) * 130, e.radius, ARENA.height - e.radius);
          e.burrowCd = 5 + hunt.rng() * 2;
          fx(hunt, "emerge", { x: e.x, y: e.y });
          events.push("burrowerEmerge");
        }
        continue;
      }
      e.burrowCd -= dt;
      if (e.burrowCd <= 0) {
        e.burrowed = true;
        e.burrowTime = 1.5;
        fx(hunt, "burrow", { x: e.x, y: e.y });
        events.push("burrowerBurrow");
        continue;
      }
    }

    /* Charges (bosses and chargers) override normal steering. */
    if (e.chargeTime > 0) {
      e.chargeTime -= dt;
      e.x += e.chargeVx * dt;
      e.y += e.chargeVy * dt;
      if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius + 6) {
        if (hurtPlayer(hunt, e.chargeDamage || e.damage)) events.push("playerHit");
        e.chargeTime = 0;
      }
      e.x = clamp(e.x, e.radius, ARENA.width - e.radius);
      e.y = clamp(e.y, e.radius, ARENA.height - e.radius);
      if (e.boss) {
        hunt.bossHp = e.hp;
        hunt.bossMaxHp = e.maxHp;
      }
      continue;
    }

    let target = p;
    if (e.type === "stalker") {
      const pack = hunt.enemies.filter((o) => o.type === "stalker" && o.id !== e.id && o.hp > 0 &&
        Math.hypot(o.x - e.x, o.y - e.y) < 130).length;
      e.packBonus = 1 + Math.min(0.6, pack * 0.15);
    } else e.packBonus = 1;
    const hasBruiser = (hunt.companions || [hunt.companion]).some((b) => b?.type === "bruiser");
    if (hasBruiser) {
      const dc = Math.hypot(c.x - e.x, c.y - e.y);
      const dp = Math.hypot(p.x - e.x, p.y - e.y);
      if (dc < 230 && dc < dp) target = c;
    }
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.angle = Math.atan2(dy, dx);
    const reach = e.radius + target.radius + 10;
    const desired = e.type === "lancer" ? 260 : reach * 0.8;

    if (stunned) {
      /* status stun interrupts attacks and movement for its duration */
    } else if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        if (e.attackKind === "shot") {
          fireProjectile(hunt, e.x, e.y, e.angle, e.damage, 280, false, 6);
          events.push("lancerShot");
        } else if (dist < reach + 14 && target === p) {
          if (hurtPlayer(hunt, e.damage)) events.push("playerHit");
        }
        e.attackCd = e.type === "boss" ? 2.2 : e.type === "grazer" ? 1.8 : 1.2;
      }
    } else if (e.type === "lancer" && dist < 420 && e.attackCd <= 0) {
      e.attackKind = "shot";
      e.windup = hunt.stats.telegraph + 0.15;
    } else if (dist < reach && e.attackCd <= 0) {
      e.attackKind = "melee";
      e.windup = hunt.stats.telegraph + (e.type === "boss" ? 0.2 : 0);
    } else if (e.type === "charger" && dist > 150 && dist < 360 && e.attackCd <= 0) {
      const a = Math.atan2(dy, dx);
      e.chargeVx = Math.cos(a) * 380;
      e.chargeVy = Math.sin(a) * 380;
      e.chargeTime = 0.55;
      e.chargeDamage = e.damage;
      e.attackCd = 3;
      fx(hunt, "boss", { x: e.x, y: e.y });
      events.push("chargerDash");
    } else if (dist > desired) {
      const move = speed * (e.packBonus || 1);
      e.x += (dx / dist) * move * dt;
      e.y += (dy / dist) * move * dt;
      if (e.type === "flyer") {
        e.x += (-dy / dist) * Math.sin(hunt.time * 5 + e.id) * 26 * dt;
        e.y += (dx / dist) * Math.sin(hunt.time * 5 + e.id) * 26 * dt;
      }
    } else if (e.type === "lancer" && dist < desired * 0.7) {
      e.x -= (dx / dist) * speed * dt;
      e.y -= (dy / dist) * speed * dt;
    }

    if (e.type === "boss") updateBoss(hunt, e, dt, events);
    e.x = clamp(e.x, e.radius, ARENA.width - e.radius);
    e.y = clamp(e.y, e.radius, ARENA.height - e.radius);
    if (e.type === "boss") {
      hunt.bossHp = e.hp;
      hunt.bossMaxHp = e.maxHp;
    }
  }
}

function hitEnemy(hunt, b, e, events) {
  let damage = b.damage;
  if (e.type === "bulwark" && !b.charged && b.mode !== "ultimate") {
    const incoming = Math.atan2(b.vy || 1, b.vx);
    const front = e.angle + Math.PI;
    const diff = Math.abs(Math.atan2(Math.sin(incoming - front), Math.cos(incoming - front)));
    if (diff < Math.PI / 3) {
      damage *= 0.2;
      fx(hunt, "shield", { x: b.x, y: b.y });
      events.push("shieldBlock");
    }
  }
  damageEnemy(hunt, e.id, damage, b.status);
  hunt.hits += 1;
  events.push("enemyHit");

  if (b.status === "shock") {
    const chained = hunt.enemies.filter((other) =>
      other.id !== e.id && other.hp > 0 && !other.burrowed &&
      Math.hypot(other.x - e.x, other.y - e.y) < 110
    ).slice(0, 2);
    chained.forEach((other) => {
      damageEnemy(hunt, other.id, damage * 0.35);
      fx(hunt, "status", { x: other.x, y: other.y, status: "shock" });
    });
  }
}

function explode(hunt, b, events) {
  fx(hunt, "shockwave", { x: b.x, y: b.y, radius: b.aoe });
  events.push("explosion");
  hunt.enemies.forEach((e) => {
    if (e.hp > 0 && !e.burrowed && Math.hypot(e.x - b.x, e.y - b.y) < b.aoe + e.radius) {
      hitEnemy(hunt, b, e, events);
    }
  });
}

function updateProjectiles(hunt, dt, events) {
  const p = hunt.player;
  for (let i = hunt.projectiles.length - 1; i >= 0; i--) {
    const b = hunt.projectiles[i];
    b.triggerCd = Math.max(0, (b.triggerCd || 0) - dt);
    if (b.homing) {
      const target = nearestEnemy(hunt, b.x, b.y, 220);
      if (target) {
        const desired = Math.atan2(target.y - b.y, target.x - b.x);
        const current = Math.atan2(b.vy, b.vx);
        const delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
        const angle = current + clamp(delta, -2.4 * dt, 2.4 * dt);
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let gone = b.life <= 0 || b.x < -30 || b.y < -30 ||
      b.x > ARENA.width + 30 || b.y > ARENA.height + 30;
    if (!gone && b.friendly) {
      if (b.trap) {
        if (b.triggerCd <= 0) {
          const target = hunt.enemies.find((e) =>
            e.hp > 0 && !e.burrowed && Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius
          );
          if (target) {
            hitEnemy(hunt, b, target, events);
            b.triggerCd = 0.7;
            if (b.pierce > 0) b.pierce -= 1;
            else gone = true;
          }
        }
      } else {
        for (const e of hunt.enemies) {
          if (e.hp <= 0 || e.burrowed) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
            if (b.aoe) explode(hunt, b, events);
            else hitEnemy(hunt, b, e, events);
            if (b.pierce > 0) b.pierce -= 1;
            else gone = true;
            break;
          }
        }
      }
    } else if (!gone && Math.hypot(p.x - b.x, p.y - b.y) < p.radius + b.radius) {
      if (hurtPlayer(hunt, b.damage)) events.push("playerHit");
      gone = true;
    }
    if (gone) hunt.projectiles.splice(i, 1);
  }
}

function inHazard(hazard, x, y) {
  return Math.hypot(x - hazard.x, y - hazard.y) < hazard.radius;
}

function updateHazards(hunt, dt, events) {
  let onIce = false;
  for (const hazard of hunt.hazards || []) {
    const def = HAZARDS[hazard.type] || {};
    hazard.hitCd = Math.max(0, hazard.hitCd - dt);
    if (hazard.type === "quicksand") {
      hazard.active = true;
    } else if (hazard.type === "ice") {
      hazard.active = true;
      if (inHazard(hazard, hunt.player.x, hunt.player.y)) onIce = true;
    } else {
      const period = (def.telegraph || 1) + (def.active || 1) + 1.2;
      hazard.timer = (hazard.timer + dt) % period;
      hazard.active = hazard.timer > (def.telegraph || 1) &&
        hazard.timer < (def.telegraph || 1) + (def.active || 1);
      if (hazard.active && hazard.hitCd <= 0) {
        const targets = [hunt.player, ...hunt.enemies];
        for (const target of targets) {
          if (target.hp <= 0) continue;
          if (inHazard(hazard, target.x, target.y)) {
            if (target === hunt.player) {
              if (hurtPlayer(hunt, def.damage || 1)) events.push("hazardHit");
            } else damageEnemy(hunt, target.id, def.damage || 1);
            hazard.hitCd = 0.7;
          }
        }
      }
    }
  }
  return onIce;
}

function hazardSlow(hunt, x, y) {
  let slow = 1;
  for (const hazard of hunt.hazards || []) {
    if (hazard.type === "quicksand" && inHazard(hazard, x, y)) {
      slow = Math.min(slow, HAZARDS.quicksand.slow);
    }
  }
  return slow;
}

function updateCores(hunt, dt, events) {
  const p = hunt.player;
  for (let i = hunt.cores.length - 1; i >= 0; i--) {
    const core = hunt.cores[i];
    core.life -= dt;
    if (Math.hypot(p.x - core.x, p.y - core.y) < p.radius + 16) {
      hunt.coresEarned += core.value;
      hunt.score += 5;
      fx(hunt, "core", { x: core.x, y: core.y });
      events.push("core");
      hunt.cores.splice(i, 1);
    } else if (core.life <= 0) {
      hunt.cores.splice(i, 1);
    }
  }
}

function advanceWave(hunt, events) {
  if (hunt.phase === "won" || hunt.phase === "lost") return;
  if (hunt.enemies.some((e) => e.hp > 0)) return;

  if (hunt.mode === "bossrush") {
    if (hunt.bossRushIndex >= 3) {
      hunt.phase = "won";
      hunt.banner = 2;
      fx(hunt, "wave", { x: ARENA.width / 2, y: ARENA.height / 2 });
      events.push("won");
    } else {
      hunt.bossRushIndex += 1;
      hunt.phase = "boss";
      hunt.banner = 2;
      spawnBoss(hunt, hunt.rng);
      fx(hunt, "boss", { x: ARENA.width / 2, y: ARENA.height / 2 });
      events.push("boss");
    }
    return;
  }

  if (hunt.mode === "endless") {
    hunt.wave += 1;
    hunt.banner = 1.6;
    if (hunt.wave % 5 === 0) {
      hunt.phase = "boss";
      spawnBoss(hunt, hunt.rng);
      fx(hunt, "boss", { x: ARENA.width / 2, y: ARENA.height / 2 });
      events.push("boss");
    } else {
      hunt.phase = "wave";
      spawnWave(hunt, hunt.rng);
      fx(hunt, "wave", { x: ARENA.width / 2, y: ARENA.height / 2 });
      events.push("wave");
    }
    return;
  }

  if (hunt.phase === "boss") {
    hunt.phase = "won";
    hunt.banner = 2;
    fx(hunt, "wave", { x: ARENA.width / 2, y: ARENA.height / 2 });
    events.push("won");
    return;
  }
  if (hunt.wave < WAVES_PER_HUNT) {
    hunt.wave += 1;
    hunt.banner = 1.6;
    spawnWave(hunt, hunt.rng);
    fx(hunt, "wave", { x: ARENA.width / 2, y: ARENA.height / 2 });
    events.push("wave");
  } else {
    hunt.phase = "boss";
    hunt.banner = 2;
    spawnBoss(hunt, hunt.rng);
    fx(hunt, "boss", { x: ARENA.width / 2, y: ARENA.height / 2 });
    events.push("boss");
  }
}

export function stepHunt(hunt, input = {}, dt = 1 / 60) {
  const events = [];
  if (hunt.phase === "won" || hunt.phase === "lost") return events;
  const p = hunt.player;
  hunt.time += dt;
  hunt.sampleClock += dt;
  if (hunt.sampleClock >= 0.12) {
    hunt.sampleClock = 0;
    hunt.samples.push({ x: Math.round(p.x), y: Math.round(p.y) });
    if (hunt.samples.length > 400) hunt.samples.shift();
  }
  hunt.banner = Math.max(0, hunt.banner - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.fireCd = Math.max(0, p.fireCd - dt);

  const combat = hunt.combat;
  if (input.weapon && selectWeapon(combat, input.weapon)) {
    events.push("weapon");
    fx(hunt, "charged", { x: p.x, y: p.y });
  }
  for (const effect of stepStamina(combat, input, dt)) {
    events.push(effect.type);
    if (effect.type === "dodge") fx(hunt, "charged", { x: p.x, y: p.y });
  }
  if (combat.invulnBonus > 0) p.invuln = Math.max(p.invuln, combat.invulnBonus);

  const onIce = updateHazards(hunt, dt, events);
  const dx = clamp(Number(input.dx) || 0, -1, 1);
  const dy = clamp(Number(input.dy) || 0, -1, 1);
  const len = Math.hypot(dx, dy) || 1;
  const terrain = hazardSlow(hunt, p.x, p.y) * (onIce ? 0.55 : 1);
  const moveSpeed = hunt.stats.speed * (combat.dodgeTime > 0 ? 2.3 : 1) * terrain;
  p.x = clamp(p.x + (dx / len) * moveSpeed * dt, p.radius, ARENA.width - p.radius);
  p.y = clamp(p.y + (dy / len) * moveSpeed * dt, p.radius, ARENA.height - p.radius);

  if (typeof input.charge === "number") p.charge = clamp(input.charge, 0, 1);

  const profile = attackProfile(combat, hunt.stats, "basic");
  const target = nearestEnemy(hunt, p.x, p.y);
  if (target) {
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    p.angle = angle;
    if (p.fireCd <= 0) {
      p.fireCd = profile.interval;
      fireProjectile(hunt, p.x, p.y, angle, profile.damage, profile.speed, true,
        profile.radius, profile.pierce, false,
        { status: profile.status, aoe: profile.aoe, trap: profile.trap, mode: "basic", weapon: profile.key });
      hunt.shots += 1;
      events.push("shoot");
    }
  }

  function fireSpecial(mode, charge = 1) {
    const special = attackProfile(combat, hunt.stats, mode);
    const angle = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
    const scale = mode === "charged" ? 0.6 + 0.4 * charge : 1;
    fireProjectile(hunt, p.x, p.y, angle, special.damage * scale, special.speed, true,
      special.radius, special.pierce, true,
      { status: special.status, aoe: special.aoe, trap: special.trap, mode, weapon: special.key });
    hunt.shots += 1;
    fx(hunt, "charged", { x: p.x, y: p.y });
    p.charge = 0;
    events.push(mode === "ultimate" ? "ultimate" : "charged");
  }

  if (typeof input.chargedShot === "number") {
    fireSpecial("charged", clamp(input.chargedShot, 0, 1));
  } else if (input.ultimate && combat.stamina >= 40) {
    fireSpecial("ultimate");
  }

  updateCompanion(hunt, dt, events);
  updateEnemies(hunt, dt, events);
  updateProjectiles(hunt, dt, events);
  updateCores(hunt, dt, events);
  advanceWave(hunt, events);

  if (p.hp <= 0 && hunt.phase !== "won") {
    p.hp = 0;
    hunt.phase = "lost";
    events.push("lost");
  }
  return events;
}

/* ------------------------------------------------------------- meta / share */

export function applyAchievements(save) {
  const claimed = [];
  let next = save;
  const values = {
    totalHunts: next.totalHunts,
    totalKills: next.totalKills,
    flawless: next.stats.flawless,
    bossKills: next.stats.bossKills,
    crafted: next.stats.crafted,
    dailyStreak: next.daily.streak,
    campaignCleared: next.campaign.cleared.length,
  };
  for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
    if (next.meta.achievements[id]) continue;
    if ((values[def.check] || 0) >= def.target) {
      next = sanitizeSave({
        ...next,
        meta: { ...next.meta, achievements: { ...next.meta.achievements, [id]: true } },
      });
      claimed.push(def.label);
    }
  }
  return { save: next, claimed };
}

export function awardSeasonXp(save, amount) {
  let week = save.meta.seasonWeek;
  let xp = save.meta.seasonXp + Math.max(0, Math.round(amount));
  const unlocked = [];
  while (week <= SEASON.weeks && xp >= SEASON.perWeek) {
    xp -= SEASON.perWeek;
    const reward = SEASON.rewards.find((r) => r.week === week);
    week += 1;
    if (reward) unlocked.push({ week: reward.week, reward: reward.reward });
  }
  const meta = { ...save.meta, seasonWeek: Math.min(SEASON.weeks, week), seasonXp: xp };
  let next = { ...save, meta };
  for (const entry of unlocked) {
    const materials = { ...next.materials };
    let cores = next.cores;
    let prestige = next.meta.prestige;
    for (const [key, value] of Object.entries(entry.reward)) {
      if (key === "cores") cores += value;
      else if (key === "prestige") prestige += value;
      else if (MATERIALS.includes(key)) materials[key] += value;
    }
    next = { ...next, cores, materials, meta: { ...next.meta, prestige } };
  }
  return { save: sanitizeSave(next), unlocked };
}

export function prestigeSeason(save) {
  if (save.meta.seasonWeek < SEASON.weeks) return save;
  return sanitizeSave({
    ...save,
    meta: {
      ...save.meta,
      seasonWeek: 1,
      seasonXp: 0,
      prestige: save.meta.prestige + 1,
    },
  });
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeChallenge(hunt) {
  return toBase64(JSON.stringify({
    s: hunt.seed, m: hunt.mode, b: hunt.biome, l: hunt.level, v: 1,
  }));
}

export function decodeChallenge(code) {
  try {
    const data = JSON.parse(fromBase64(String(code).trim()));
    if (!data || data.v !== 1 || !MODES[data.m] || !BIOMES[data.b]) return null;
    return { seed: data.s >>> 0, mode: data.m, biome: data.b, level: clamp(data.l || 1, 1, 99) };
  } catch {
    return null;
  }
}

export function exportSave(save) {
  return toBase64(JSON.stringify(sanitizeSave(save)));
}

export function importSave(code) {
  try {
    const data = JSON.parse(fromBase64(String(code).trim()));
    if (!data || typeof data !== "object" || data.version !== 8) return null;
    return sanitizeSave(data);
  } catch {
    return null;
  }
}

export function finishHunt(hunt, save, now = new Date()) {
  const won = hunt.phase === "won";
  const seasonCores = SEASONS[save.season?.key]?.effect?.cores || 0;
  const bonus = won ? hunt.stats.coreBonus + save.huntLevel * 2 + seasonCores : 0;
  const earned = won
    ? Math.round(hunt.coresEarned * (hunt.stats.coreMult || 1)) + bonus
    : Math.floor(hunt.coresEarned / 2);
  const today = dateKey(now);
  const flawless = won && hunt.damageTaken === 0 ? 1 : 0;
  const companionWin = won && hunt.companion.type ? 1 : 0;
  const dailyWin = won && hunt.daily ? 1 : 0;

  let daily = { ...save.daily };
  if (hunt.daily) {
    const sameDay = daily.date === today;
    const streak = !won ? 0
      : sameDay ? daily.streak
      : isPreviousDay(daily.lastPlayed, today) ? daily.streak + 1 : 1;
    daily = {
      date: today,
      best: won ? (sameDay ? Math.max(daily.best, hunt.score) : hunt.score) : daily.best,
      streak,
      lastPlayed: today,
      wins: daily.wins + (won ? 1 : 0),
    };
  }

  const finalScore = Math.round(hunt.score * (hunt.stats.scoreBonus || 1));
  const bossKills = BOSS_TYPES.reduce((n, key) => n + (hunt.enemyKills?.[key] || 0), 0);
  const materialBonus = hunt.stats.materialBonus || 1;
  const seasonEffect = SEASONS[save.season?.key]?.effect || {};
  const scrapGain = Math.round((hunt.kills * 2 + bossKills * 8 + (hunt.stats.scrapBonus || 0)) * materialBonus + (seasonEffect.scrap || 0));
  const brickGain = won ? Math.round((4 + (hunt.stats.brickBonus || 0)) * materialBonus + (seasonEffect.bricks || 0)) : 0;
  const partGain = bossKills > 0 ? Math.max(1, Math.round(bossKills * materialBonus)) : 0;
  const xpGain = Math.round(
    (hunt.kills * XP.kill + (won ? XP.win : 0) + (hunt.daily ? XP.daily : 0) + bossKills * 8) *
    (hunt.stats.xpBonus || 1)
  );
  const endless = hunt.mode === "endless";
  const clearedCampaign = hunt.mode === "campaign" && won;
  let campaign = { ...save.campaign };
  if (clearedCampaign && !campaign.cleared.includes(hunt.campaignIndex)) {
    campaign.cleared = [...campaign.cleared, hunt.campaignIndex].sort((a, b) => a - b);
    campaign.progress = Math.min(CAMPAIGN_HUNTS.length, Math.max(campaign.progress, hunt.campaignIndex + 1));
  }
  const refreshed = refreshSeason(refreshBounty({ ...save, campaign }, now), now);
  const progress = Math.max(refreshed.bounty.progress, bountyProgress(hunt, refreshed));
  const bountyDef = BOUNTIES[refreshed.bounty.key];
  const bountyDone = !!bountyDef && progress >= bountyDef.target;
  const bountyReward = bountyDone && !refreshed.bounty.claimed ? bountyDef.reward : 0;
  const bounty = {
    date: refreshed.bounty.date,
    key: refreshed.bounty.key,
    progress,
    done: bountyDone,
    claimed: bountyDone,
  };

  const base = sanitizeSave({
    ...refreshed,
    cores: refreshed.cores + earned + bountyReward,
    bestScore: Math.max(refreshed.bestScore, finalScore),
    huntLevel: clearedCampaign ? refreshed.huntLevel + 1 : refreshed.huntLevel,
    totalHunts: refreshed.totalHunts + 1,
    totalKills: refreshed.totalKills + hunt.kills,
    daily,
    bounty,
    materials: {
      scrap: refreshed.materials.scrap + scrapGain,
      bricks: refreshed.materials.bricks + brickGain,
      parts: refreshed.materials.parts + partGain,
    },
    stats: {
      ...refreshed.stats,
      shots: refreshed.stats.shots + hunt.shots,
      hits: refreshed.stats.hits + hunt.hits,
      bestCombo: Math.max(refreshed.stats.bestCombo, hunt.combo),
      playtime: refreshed.stats.playtime + Math.round(hunt.time),
      flawless: refreshed.stats.flawless + flawless,
      companionWins: refreshed.stats.companionWins + companionWin,
      dailyWins: refreshed.stats.dailyWins + dailyWin,
      duoHunts: refreshed.stats.duoHunts + (hunt.companions?.length >= 2 ? 1 : 0),
      bossKills: refreshed.stats.bossKills + bossKills,
      campaignCleared: refreshed.stats.campaignCleared + (clearedCampaign ? 1 : 0),
    },
    ghost: won && finalScore > (refreshed.ghost?.score || 0)
      ? { score: finalScore, samples: hunt.samples.slice(-400) }
      : refreshed.ghost,
  });
  const leveled = addXp(base, xpGain);
  const quested = applyQuests(leveled.save);
  const achievementSave = applyAchievements(quested.save);
  const seasonSave = awardSeasonXp(achievementSave.save, Math.round(xpGain / 2));
  const next = seasonSave.save;
  return {
    save: next,
    result: {
      won, earned, bonus, score: finalScore, kills: hunt.kills,
      xp: xpGain, levels: leveled.levels,
      materials: { scrap: scrapGain, bricks: brickGain, parts: partGain },
      quests: quested.claimed,
      achievements: achievementSave.claimed,
      season: seasonSave.unlocked,
      accuracy: hunt.shots ? hunt.hits / hunt.shots : 0,
      mode: hunt.mode,
      campaign: clearedCampaign ? hunt.campaignIndex : null,
      daily: hunt.daily ? daily : null,
      bounty: bountyDone && !refreshed.bounty.claimed
        ? { label: bountyDef.label, reward: bountyReward } : null,
    },
  };
}
