import { ABILITIES, PIECES } from "./config.js";
import { BOSS_LEVELS, isAreaComplete } from "./boss-levels.js";
import { SPECIAL_LEVELS } from "./special-levels.js";

export function totalStars(progress) {
  return Object.values(progress.stars || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function dailyWins(progress) {
  return Object.values(progress.daily || {}).filter((entry) => (Number(entry?.stars) || 0) > 0).length;
}

function requirementMet(progress, requirement) {
  if (!requirement) return true;
  if (requirement.type === "stars") return totalStars(progress) >= requirement.value;
  if (requirement.type === "gears") return (Number(progress.gears) || 0) >= requirement.value;
  if (requirement.type === "area") return isAreaComplete(progress, requirement.value);
  if (requirement.type === "daily") return dailyWins(progress) >= requirement.value;
  if (requirement.type === "boss") {
    const completed = BOSS_LEVELS.filter((_, index) => progress.stars?.[`boss-${index + 1}`]).length;
    return completed >= requirement.value;
  }
  return false;
}

export function requirementLabel(requirement) {
  if (!requirement) return "";
  if (requirement.type === "stars") return `${requirement.value} stelle`;
  if (requirement.type === "gears") return `${requirement.value} ingranaggi`;
  if (requirement.type === "area") return `Completa l'area ${requirement.value + 1}`;
  if (requirement.type === "daily") return `${requirement.value} sfide giornaliere`;
  if (requirement.type === "boss") return `Sconfiggi ${requirement.value} boss`;
  return "Requisito speciale";
}

export function specialUnlockState(progress, index) {
  const definition = SPECIAL_LEVELS[index];
  return {
    unlocked: requirementMet(progress, definition?.requirement),
    label: requirementLabel(definition?.requirement)
  };
}

export function bossUnlockState(progress, index) {
  const definition = BOSS_LEVELS[index];
  return {
    unlocked: requirementMet(progress, definition?.requirement),
    label: requirementLabel(definition?.requirement)
  };
}

export function unlockPiece(progress, pieceId) {
  const piece = PIECES.find((candidate) => candidate.id === pieceId);
  if (!piece || progress.pieces?.includes(pieceId)) return { ok: false, reason: "owned" };
  if ((Number(progress.gears) || 0) < piece.cost) return { ok: false, reason: "gears" };
  progress.gears -= piece.cost;
  progress.pieces = [...(progress.pieces || []), pieceId];
  progress.equippedPiece = progress.equippedPiece || pieceId;
  return { ok: true, piece };
}

export function equipPiece(progress, pieceId) {
  if (pieceId && !progress.pieces?.includes(pieceId)) return false;
  progress.equippedPiece = pieceId || null;
  return true;
}

export function equippedPerk(progress) {
  return PIECES.find((piece) => piece.id === progress.equippedPiece) || PIECES[0];
}

export function gearMultiplier(progress) {
  return progress.equippedPiece === "tessera" ? 1.1 : 1;
}

export function abilityLevel(progress, abilityId) {
  return Math.max(0, Math.min(3, Number(progress.abilities?.[abilityId]) || 0));
}

export function upgradeAbilityCost(progress, abilityId) {
  const level = abilityLevel(progress, abilityId);
  return [20, 45, 80][level - 1] ?? 0;
}

export function upgradeAbility(progress, abilityId) {
  if (!ABILITIES[abilityId]) return { ok: false, reason: "ability" };
  const level = abilityLevel(progress, abilityId);
  if (level >= 3) return { ok: false, reason: "max" };
  const cost = upgradeAbilityCost(progress, abilityId);
  if ((Number(progress.gears) || 0) < cost) return { ok: false, reason: "gears" };
  progress.gears -= cost;
  progress.abilities = progress.abilities || {};
  progress.abilities[abilityId] = level + 1;
  return { ok: true, level: level + 1, cost };
}
