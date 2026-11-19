export interface QuestDef {
  id: string;
  areaId: string;
  npc: string;
  title: string;
  intro: string;
  objective: string;
  targetKind: 'enemy' | 'item';
  target: string;
  needed: number;
  reward: { coins: number; badge?: string; item?: string };
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q_sand', areaId: 'dune', npc: 'OLD MINER', title: 'A BITE IN THE SAND',
    intro: 'Something down here has been eating my tools. Bring me three sandworm shells.',
    objective: 'Defeat 3 SANDWORM enemies', targetKind: 'enemy', target: 'sandworm', needed: 3,
    reward: { coins: 20, item: 'mushroom' }
  },
  {
    id: 'q_ice', areaId: 'frost', npc: 'PEAK SCOUT', title: 'WARM BOOTS',
    intro: 'My boots froze solid. Knock two icelings around and I will hand over my spare badge.',
    objective: 'Defeat 2 ICELING enemies', targetKind: 'enemy', target: 'iceling', needed: 2,
    reward: { coins: 24, badge: 'guard_charm' }
  },
  {
    id: 'q_gear', areaId: 'clockworks', npc: 'CLOCKMAKER', title: 'MISSING COGS',
    intro: 'The wards are falling apart. Bring me four cogs from the local guards.',
    objective: 'Defeat 4 CRYSTAL BUG enemies', targetKind: 'enemy', target: 'crystalbug', needed: 4,
    reward: { coins: 30, badge: 'speed_boots' }
  },
  {
    id: 'q_light', areaId: 'sunken', npc: 'LAMPKEEPER', title: 'LIGHT THE ROAD',
    intro: 'The drowned road needs a light. Bring two tide wraith lanterns.',
    objective: 'Defeat 2 TIDE WRAITH enemies', targetKind: 'enemy', target: 'tidewraith', needed: 2,
    reward: { coins: 28, item: 'oneup' }
  },
  {
    id: 'q_storm', areaId: 'stormpeak', npc: 'STORM WATCHER', title: 'QUIET SKY',
    intro: 'Three void moths are nesting in the peak. Clear them out.',
    objective: 'Defeat 3 VOID MOTH enemies', targetKind: 'enemy', target: 'voidmoth', needed: 3,
    reward: { coins: 35, badge: 'timing_core' }
  },
  {
    id: 'q_final', areaId: 'nightgate', npc: 'THE LAST FRIEND', title: 'ONE MORE LETTER',
    intro: 'You have come this far. The Emperor is waiting. Take my luck with you.',
    objective: 'Defeat the NIGHT EMPEROR', targetKind: 'enemy', target: 'nightemperor', needed: 1,
    reward: { coins: 60, badge: 'master_core' }
  }
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q])) as Record<string, QuestDef>;
