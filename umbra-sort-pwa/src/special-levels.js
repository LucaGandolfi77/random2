import { CAMPAIGN_LEVELS } from "./config.js";
import { makeLevel } from "./levels.js";

export const SPECIAL_LEVELS = [
  { id: "special-1", name: "Tre stelle o niente", area: 0, stage: 14, modifier: "tight", requirement: { type: "stars", value: 30 }, reward: 15 },
  { id: "special-2", name: "Senza ritorno", area: 1, stage: 16, modifier: "noUndo", requirement: { type: "gears", value: 15 }, reward: 18 },
  { id: "special-3", name: "Notte permanente", area: 2, stage: 17, modifier: "night", requirement: { type: "stars", value: 60 }, reward: 20 },
  { id: "special-4", name: "Tempesta di produzione", area: 6, stage: 12, modifier: "storm", requirement: { type: "gears", value: 30 }, reward: 22 },
  { id: "special-5", name: "Ascensori impazziti", area: 5, stage: 15, modifier: "lifts", requirement: { type: "area", value: 1 }, reward: 22 },
  { id: "special-6", name: "Prisma puro", area: 7, stage: 16, modifier: "prism", requirement: { type: "stars", value: 120 }, reward: 25 },
  { id: "special-7", name: "Griglia compatta", area: 9, stage: 18, modifier: "compact", requirement: { type: "gears", value: 50 }, reward: 25 },
  { id: "special-8", name: "Specchio rotto", area: 5, stage: 19, modifier: "mirror", requirement: { type: "daily", value: 3 }, reward: 28 },
  { id: "special-9", name: "Catena perfetta", area: 8, stage: 19, modifier: "chain", requirement: { type: "boss", value: 3 }, reward: 30 },
  { id: "special-10", name: "Singolarità", area: 9, stage: 19, modifier: "singularity", requirement: { type: "stars", value: 240 }, reward: 40 }
];

export function makeSpecialLevel(index) {
  const definition = SPECIAL_LEVELS[index];
  if (!definition) return null;
  const level = structuredClone(makeLevel(definition.area, definition.stage));
  level.id = definition.id;
  level.kind = "special";
  level.name = definition.name;
  level.specialIndex = index;
  level.number = CAMPAIGN_LEVELS + index + 1;
  level.modifier = definition.modifier;
  level.rewardGears = definition.reward;
  level.requirement = definition.requirement;

  if (definition.modifier === "tight") level.moveLimit = Math.max(8, Math.round(level.par * 0.9));
  if (definition.modifier === "noUndo") level.undoDisabled = true;
  if (definition.modifier === "night") {
    level.blackouts.forEach((zone) => { zone.period *= 0.7; zone.offDuration *= 1.4; });
    level.moveLimit = Math.round(level.par * 1.4);
  }
  if (definition.modifier === "storm") {
    level.generators.forEach((generator) => { generator.interval *= 0.55; generator.timer *= 0.5; });
    level.moveLimit = Math.round(level.par * 1.3);
  }
  if (definition.modifier === "lifts" || definition.modifier === "mirror") {
    level.elevators.forEach((lift) => { lift.period *= definition.modifier === "mirror" ? 0.4 : 0.5; lift.timer *= 0.35; });
    level.moveLimit = Math.round(level.par * 1.35);
  }
  if (definition.modifier === "prism") {
    level.moveLimit = Math.round(level.par * 1.25);
    level.abilityBonus = 1;
  }
  if (definition.modifier === "compact" || definition.modifier === "singularity") {
    level.moveLimit = Math.round(level.par * 1.15);
    level.generators.forEach((generator) => { generator.interval *= 0.8; });
    level.elevators.forEach((lift) => { lift.period *= 0.8; });
    level.blackouts.forEach((zone) => { zone.period *= 0.8; });
  }
  if (definition.modifier === "chain") {
    level.moveLimit = Math.round(level.par * 1.2);
    level.comboOnly = true;
  }
  return level;
}
