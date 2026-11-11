import type { Neighborhood, SaveGame, StoryOrder } from '@/types/game';
import { NEIGHBORHOODS } from '@/data/story';

export const neighborhoodUnlocked = (save: SaveGame, neighborhood: Neighborhood): boolean => {
  if (!neighborhood.unlockAfter) return true;
  return save.story.completedNeighborhoods.includes(neighborhood.unlockAfter);
};

export const storyOrderAccessible = (save: SaveGame, order: StoryOrder): boolean => {
  const neighborhood = NEIGHBORHOODS.find((entry) => entry.orders.some((item) => item.id === order.id));
  if (!neighborhood) return false;
  if (!neighborhoodUnlocked(save, neighborhood)) return false;
  if (save.story.completedOrders.includes(order.id)) return true;
  const index = neighborhood.orders.findIndex((item) => item.id === order.id);
  if (index <= 0) return true;
  const previous = neighborhood.orders[index - 1];
  return previous ? save.story.completedOrders.includes(previous.id) : true;
};

export const neighborhoodProgress = (save: SaveGame, neighborhood: Neighborhood): number =>
  neighborhood.orders.filter((order) => save.story.completedOrders.includes(order.id)).length;

export const currentNeighborhood = (save: SaveGame): Neighborhood | undefined =>
  NEIGHBORHOODS.find((neighborhood) => !save.story.completedNeighborhoods.includes(neighborhood.id));

export const nextStoryOrder = (save: SaveGame): { neighborhood: Neighborhood; order: StoryOrder } | undefined => {
  for (const neighborhood of NEIGHBORHOODS) {
    if (!neighborhoodUnlocked(save, neighborhood)) continue;
    for (const order of neighborhood.orders) {
      if (save.story.completedOrders.includes(order.id)) continue;
      if (storyOrderAccessible(save, order)) return { neighborhood, order };
    }
  }
  return undefined;
};

export const totalStoryProgress = (save: SaveGame): { done: number; total: number } => {
  const total = NEIGHBORHOODS.reduce((sum, neighborhood) => sum + neighborhood.orders.length, 0);
  return { done: save.story.completedOrders.length, total };
};
