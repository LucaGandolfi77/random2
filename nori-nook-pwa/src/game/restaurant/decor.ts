import type { Decoration, PlacedDecoration, SaveGame } from '@/types/game';
import { decorationById, DECORATIONS } from '@/data/decorations';
import { UPGRADES, upgradeById } from '@/data/upgrades';
import { STAFF, staffById } from '@/data/staff';
import { spendCoins } from '@/game/economy/rewards';
import { makeId } from '@/utils/id';
import { clamp } from '@/utils/math';
import { tierForReputation } from '@/data/restaurantTiers';

export const ownedDecorationCount = (save: SaveGame, decorationId: string): number =>
  save.ownedDecorations.filter((id) => id === decorationId).length;

export const placedDecorationCount = (save: SaveGame, decorationId: string): number =>
  save.restaurant.decorations.filter((item) => item.decorationId === decorationId).length;

export const availableDecorationCount = (save: SaveGame, decorationId: string): number =>
  Math.max(0, ownedDecorationCount(save, decorationId) - placedDecorationCount(save, decorationId));

export const canBuyDecoration = (
  save: SaveGame,
  decoration: Decoration,
): { ok: boolean; reason?: string } => {
  if (decoration.unlockLevel > save.player.level) return { ok: false, reason: 'Unlock at a higher level' };
  if (save.player.coins < decoration.price) return { ok: false, reason: 'Not enough coins' };
  return { ok: true };
};

export const buyDecoration = (save: SaveGame, decorationId: string): { ok: boolean; reason?: string } => {
  const decoration = decorationById(decorationId);
  if (!decoration) return { ok: false, reason: 'Unknown decoration' };
  const check = canBuyDecoration(save, decoration);
  if (!check.ok) return check;
  if (!spendCoins(save, decoration.price)) return { ok: false, reason: 'Not enough coins' };
  save.ownedDecorations.push(decorationId);
  return { ok: true };
};

export const placeDecoration = (
  save: SaveGame,
  decorationId: string,
  x: number,
  y: number,
  uid?: string,
): { ok: boolean; reason?: string; placed?: PlacedDecoration } => {
  const decoration = decorationById(decorationId);
  if (!decoration) return { ok: false, reason: 'Unknown decoration' };
  if (!uid && availableDecorationCount(save, decorationId) <= 0) {
    return { ok: false, reason: 'No spare copy in storage' };
  }
  const position = {
    x: clamp(x, 4, 96),
    y: clamp(y, 6, 94),
  };
  if (uid) {
    const existing = save.restaurant.decorations.find((item) => item.uid === uid);
    if (!existing) return { ok: false, reason: 'Decoration not found' };
    existing.x = position.x;
    existing.y = position.y;
    return { ok: true, placed: existing };
  }
  const placed: PlacedDecoration = {
    uid: makeId('decor'),
    decorationId,
    x: position.x,
    y: position.y,
    flip: false,
  };
  save.restaurant.decorations.push(placed);
  save.stats.decorationsPlaced += 1;
  return { ok: true, placed };
};

export const removeDecoration = (save: SaveGame, uid: string): boolean => {
  const index = save.restaurant.decorations.findIndex((item) => item.uid === uid);
  if (index < 0) return false;
  save.restaurant.decorations.splice(index, 1);
  return true;
};

export const flipDecoration = (save: SaveGame, uid: string): boolean => {
  const item = save.restaurant.decorations.find((entry) => entry.uid === uid);
  if (!item) return false;
  item.flip = !item.flip;
  return true;
};

export const decorationAmbiance = (save: SaveGame): number => {
  const placed = save.restaurant.decorations.reduce((sum, item) => {
    return sum + (decorationById(item.decorationId)?.ambiance ?? 0);
  }, 0);
  const worktop = UPGRADES.find((upgrade) => upgrade.id === 'worktop');
  const upgradeBonus = worktop
    ? (save.restaurant.upgrades[worktop.id] ?? 0) * worktop.effectPerLevel
    : 0;
  const uniqueStyles = new Set(
    save.restaurant.decorations
      .map((item) => decorationById(item.decorationId)?.style)
      .filter((style): style is NonNullable<typeof style> => Boolean(style)),
  );
  const styleBonus = uniqueStyles.size >= 4 ? 4 : 0;
  return Math.round(placed + upgradeBonus + styleBonus);
};

export const restaurantTier = (save: SaveGame) => tierForReputation(save.player.reputation);

export const buyUpgrade = (save: SaveGame, upgradeId: string): { ok: boolean; reason?: string; level?: number } => {
  const upgrade = upgradeById(upgradeId);
  if (!upgrade) return { ok: false, reason: 'Unknown upgrade' };
  const current = save.restaurant.upgrades[upgradeId] ?? 0;
  if (current >= upgrade.maxLevel) return { ok: false, reason: 'Already max level' };
  const cost = upgrade.costs[current];
  if (cost === undefined) return { ok: false, reason: 'Upgrade unavailable' };
  if (!spendCoins(save, cost)) return { ok: false, reason: 'Not enough coins' };
  save.restaurant.upgrades[upgradeId] = current + 1;
  return { ok: true, level: current + 1 };
};

export const hireStaff = (save: SaveGame, staffId: string): { ok: boolean; reason?: string } => {
  const member = staffById(staffId);
  if (!member) return { ok: false, reason: 'Unknown staff' };
  if (save.staff.hired.includes(staffId)) return { ok: false, reason: 'Already part of the nook' };
  if (save.player.coins < member.cost || save.player.pearls < member.pearlCost) {
    return { ok: false, reason: 'Not enough coins or pearls' };
  }
  save.player.coins -= member.cost;
  save.player.pearls -= member.pearlCost;
  save.stats.coinsSpent += member.cost;
  save.staff.hired.push(staffId);
  return { ok: true };
};

export const staffEffect = (save: SaveGame, effect: (typeof STAFF)[number]['effect']): number =>
  STAFF.filter((member) => member.effect === effect && save.staff.hired.includes(member.id)).reduce(
    (sum, member) => sum + member.effectPerLevel,
    0,
  );

export const unlockedDecorations = (save: SaveGame): Decoration[] =>
  DECORATIONS.filter((decoration) => decoration.unlockLevel <= save.player.level);

export const decorationByIdSafe = decorationById;
