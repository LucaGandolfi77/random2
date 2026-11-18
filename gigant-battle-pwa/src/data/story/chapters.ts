export interface StoryChapter {
  id: number;
  title: string;
  subtitle: string;
  stageId: string;
  fighterId: string;
  enemyType: string;
  intro: string;
  win: string;
  lose: string;
  reward?: string;
  morale?: number;
}

/** Ten-chapter campaign. Dialogue nodes live in dialogue.ts. */
export const STORY_CHAPTERS: StoryChapter[] = [
  { id: 1, title: 'THE FIRST PORT', subtitle: 'A message before dawn', stageId: 'shore', fighterId: 'blade', enemyType: 'grunt', intro: 'c1_intro', win: 'c1_win', lose: 'c1_lose' },
  { id: 2, title: 'THE IRON GATE', subtitle: 'Below the surface', stageId: 'prison', fighterId: 'giant', enemyType: 'brute', intro: 'c2_intro', win: 'c2_win', lose: 'c2_lose', reward: 'desert', morale: 1 },
  { id: 3, title: 'A FRIEND IN THE DARK', subtitle: 'The market after closing', stageId: 'market', fighterId: 'specter', enemyType: 'trickster', intro: 'c3_intro', win: 'c3_win', lose: 'c3_lose', reward: 'specter', morale: 2 },
  { id: 4, title: 'THE GUNMERCHANT', subtitle: 'A deal gone wrong', stageId: 'dock', fighterId: 'guns', enemyType: 'sentinel', intro: 'c4_intro', win: 'c4_win', lose: 'c4_lose', reward: 'guns', morale: 1 },
  { id: 5, title: 'FORGE OF VENGEANCE', subtitle: 'Where the old swords are made', stageId: 'forge', fighterId: 'iron', enemyType: 'brute', intro: 'c5_intro', win: 'c5_win', lose: 'c5_lose', reward: 'giant', morale: 2 },
  { id: 6, title: 'SKYWARD', subtitle: 'The fortress above the clouds', stageId: 'sky', fighterId: 'moon', enemyType: 'trickster', intro: 'c6_intro', win: 'c6_win', lose: 'c6_lose', reward: 'moon', morale: 1 },
  { id: 7, title: 'THE FROZEN WHARF', subtitle: 'The sea holds its breath', stageId: 'frozen', fighterId: 'berserker', enemyType: 'sentinel', intro: 'c7_intro', win: 'c7_win', lose: 'c7_lose', reward: 'berserker', morale: 2 },
  { id: 8, title: 'RUINS OF 1998', subtitle: 'The truth under the stones', stageId: 'ruins', fighterId: 'venom', enemyType: 'trickster', intro: 'c8_intro', win: 'c8_win', lose: 'c8_lose', reward: 'venom', morale: 2 },
  { id: 9, title: 'THE GOLDEN CAPTAIN', subtitle: 'A legend steps into the arena', stageId: 'dock', fighterId: 'gold', enemyType: 'boss', intro: 'c9_intro', win: 'c9_win', lose: 'c9_lose', reward: 'gold', morale: 3 },
  { id: 10, title: 'LAST CALL AT DAWN', subtitle: 'Every voice on the line', stageId: 'shore', fighterId: 'hunter', enemyType: 'boss', intro: 'c10_intro', win: 'c10_win', lose: 'c10_lose', morale: 3 }
];

export const CHAPTER_COUNT = STORY_CHAPTERS.length;
