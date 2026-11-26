import { AREAS, CAMPAIGN_LEVELS, LEVELS_PER_AREA } from "./config.js";
import { makeLevel } from "./levels.js";

const BOSS_NAMES = [
  "Capomastro", "Guardiano delle Piattaforme", "Eclisse", "Fonditore", "Nucleo Prismatico",
  "Specchio Vivente", "Marea Cinetico", "Fucina dei Colori", "Cuore del Buio", "Singolarità"
];

export const BOSS_LEVELS = BOSS_NAMES.map((name, area) => ({
  id: `boss-${area + 1}`,
  name,
  area,
  requirement: { type: "area", value: area },
  reward: 20 + area * 5
}));

export function makeBossLevel(index) {
  const definition = BOSS_LEVELS[index];
  if (!definition) return null;
  const level = structuredClone(makeLevel(definition.area, LEVELS_PER_AREA - 1));
  level.id = definition.id;
  level.kind = "boss";
  level.name = definition.name;
  level.bossIndex = index;
  level.number = CAMPAIGN_LEVELS + SPECIAL_LEVEL_COUNT + index + 1;
  level.rewardGears = definition.reward;
  level.requirement = definition.requirement;
  level.abilityBonus = 1;
  level.moveLimit = Math.round(level.par * 1.8);
  level.boss = {
    name: definition.name,
    area: definition.area,
    attackInterval: Math.max(4.5, 8 - definition.area * 0.3),
    phase: 1,
    attacks: 0
  };
  return level;
}

const SPECIAL_LEVEL_COUNT = 10;

export function totalLevelCount() {
  return CAMPAIGN_LEVELS + SPECIAL_LEVEL_COUNT + BOSS_LEVELS.length;
}

export function isAreaComplete(progress, area) {
  const areaId = AREAS[area]?.id;
  if (!areaId) return false;
  for (let stage = 1; stage <= LEVELS_PER_AREA; stage++) {
    if (!progress.stars?.[`${areaId}-${stage}`]) return false;
  }
  return true;
}
