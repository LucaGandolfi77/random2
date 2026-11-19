export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  key: string;
  goal: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_first', name: 'FIRST STEPS', description: 'Win your first battle.', key: 'wins', goal: 1 },
  { id: 'a_ten', name: 'OLD HANDS', description: 'Win 10 battles.', key: 'wins', goal: 10 },
  { id: 'a_fifty', name: 'VETERANS', description: 'Win 50 battles.', key: 'wins', goal: 50 },
  { id: 'a_boss', name: 'GIANT SLAYERS', description: 'Defeat your first boss.', key: 'bosses', goal: 1 },
  { id: 'a_allboss', name: 'THE WHOLE ROUTE', description: 'Defeat all 10 bosses.', key: 'bosses', goal: 10 },
  { id: 'a_mini', name: 'ARCADE REGULARS', description: 'Clear 5 minigames.', key: 'minigames', goal: 5 },
  { id: 'a_badge', name: 'COLLECTOR', description: 'Own 8 badges.', key: 'badges', goal: 8 },
  { id: 'a_quest', name: 'HELPFUL BROTHERS', description: 'Complete 3 side quests.', key: 'quests', goal: 3 },
  { id: 'a_endless', name: 'NEVER STOP', description: 'Reach floor 10 of the endless dungeon.', key: 'endless', goal: 10 },
  { id: 'a_daily', name: 'DAILY DEVOTION', description: 'Complete 7 daily challenges.', key: 'dailies', goal: 7 },
  { id: 'a_ng', name: 'ONE MORE TIME', description: 'Start New Game+.', key: 'ngplus', goal: 1 }
];
