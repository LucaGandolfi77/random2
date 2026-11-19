import { AREAS } from './areas';
import { BADGES } from './badges';
import { ENEMIES } from './enemies';
import { MINIGAMES } from './minigames';

export interface CollectionCategory {
  id: string;
  name: string;
  entries: string[];
}

export const COLLECTIONS: CollectionCategory[] = [
  { id: 'enemies', name: 'ENEMY ENCYCLOPEDIA', entries: ENEMIES.map((e) => e.id) },
  { id: 'areas', name: 'PLACES SEEN', entries: AREAS.map((a) => a.id) },
  { id: 'badges', name: 'BADGE CABINET', entries: BADGES.map((b) => b.id) },
  { id: 'minigames', name: 'MINIGAME MEDALS', entries: MINIGAMES.map((m) => m.id) }
];

export function totalCollectibles(): number {
  return COLLECTIONS.reduce((n, c) => n + c.entries.length, 0);
}
