import { VILLAGERS } from '../data/villagers.js';
import {
  CHAPTER_QUOTAS,
  CHAPTER_NAMES,
  ROMAN
} from '../data/chapters.js';

export { CHAPTER_QUOTAS, CHAPTER_NAMES, ROMAN };

export function createInitialState(opts = {}) {
  const ngPlus = !!opts.ngPlus;
  const quotaBonus = ngPlus ? 4 : 0;
  return {
    version: 2,
    chapter: 1,
    day: 1,
    ngPlus,
    ngPlusLevel: opts.ngPlusLevel || (ngPlus ? 1 : 0),
    carriedChoice: opts.carriedChoice || null,
    quotaBonus,
    hero: {
      name: 'Wren',
      hp: 60,
      maxHp: 60,
      years: 40,
      maxYears: 40
    },
    quota: {
      owed: CHAPTER_QUOTAS[1] + quotaBonus,
      paid: 0
    },
    villagers: VILLAGERS.map((v) => ({
      ...v,
      maxYears: v.years,
      alive: true,
      spoken: false,
      drawn: 0,
      remembered: true,
      forgotten: false,
      favorUsed: false,
      secretRevealed: false,
      diedDay: null
    })),
    ledger: [],
    flags: {
      openingSeen: false,
      sableOfferSeen: false,
      exposed: false,
      sableWarned: false,
      quietNames: false,
      funeralDone: false,
      defaulted: false,
      offeredSelf: false,
      brokeContract: false,
      encounters: 0,
      totalDrawn: 0,
      selfDrawn: 0,
      secretDrawn: 0,
      auditDone: false,
      auditOutcome: null,
      perrinDone: false,
      perrinOutcome: null,
      nelStatus: 'home',
      charterDone: false,
      charterKnown: false,
      orinDone: false,
      orinTestified: false,
      ferryDone: false,
      ferryReady: false,
      secondChairOffered: false,
      nominationDone: false,
      nominationOutcome: null,
      finale: null,
      finalChoice: null,
      parleyDone: false,
      parleyOutcome: null,
      renewed: false,
      charterBurned: false,
      escaped: false,
      cityExposed: false,
      secondChair: false
    },
    stats: {
      battlesWon: 0,
      battlesFought: 0,
      deaths: 0,
      forgotten: 0,
      unawareDraws: 0,
      forcedDraws: 0,
      favorsUsed: 0
    },
    endingId: null
  };
}

export function chapterName(chapter) {
  return CHAPTER_NAMES[chapter] || 'The Renewal';
}

export function livingVillagers(state) {
  return state.villagers.filter((v) => v.alive);
}

export function deadVillagers(state) {
  return state.villagers.filter((v) => !v.alive);
}

export function quotaRemaining(state) {
  return Math.max(0, state.quota.owed - state.quota.paid);
}
