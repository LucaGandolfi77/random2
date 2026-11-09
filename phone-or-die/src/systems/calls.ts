import type { CallDef, ContactDef, ContactState, Difficulty, GameState } from '@/core/types';
import { clamp } from '@/core/rng';
import { callById, callsForContact } from '@/data/calls';

export const contactIsInWindow = (contact: ContactDef, nightMinute: number): boolean =>
  contact.windows.some((window) => nightMinute >= window.from && nightMinute <= window.to);

export const contactStatus = (
  contact: ContactDef,
  state: ContactState,
  game: GameState
): { key: 'likely' | 'uncertain' | 'asleep' | 'recent' | 'locked'; label: string } => {
  if (contact.unknown && !state.unlocked) return { key: 'locked', label: 'No signal' };
  if (!contactIsInWindow(contact, game.nightMinute)) return { key: 'asleep', label: 'Likely asleep' };
  if (state.lastCallNight !== null && game.nightMinute - state.lastCallNight < 8) {
    return { key: 'recent', label: 'Line busy' };
  }
  if (answerChance(contact, state, game.difficulty, game.nightMinute) >= 0.7) {
    return { key: 'likely', label: 'Likely to answer' };
  }
  return { key: 'uncertain', label: 'May answer' };
};

export const answerChance = (
  contact: ContactDef,
  state: ContactState,
  difficulty: Difficulty,
  nightMinute: number
): number => {
  if (contact.unknown) return state.unlocked ? 1 : 0;
  let chance = contact.baseAnswerChance;
  if (!contactIsInWindow(contact, nightMinute)) chance -= 0.32;
  if (difficulty === 'story') chance += 0.07;
  if (difficulty === 'normal') chance -= 0.02;
  if (difficulty === 'nightmare') chance -= 0.12;
  chance += Math.min(0.06, state.trust * 0.009);
  chance -= Math.min(0.18, state.callCount * 0.035);
  if (state.lastCallNight !== null && nightMinute - state.lastCallNight < 8) chance -= 0.22;
  return clamp(chance, 0.06, 0.98);
};

export const availableCallsFor = (contactId: string, game: GameState): CallDef[] => {
  const state = game.contacts[contactId as keyof typeof game.contacts];
  if (!state) return [];
  return callsForContact(contactId)
    .filter((call) => game.chapter >= call.minChapter && game.chapter <= call.maxChapter)
    .filter((call) => !call.once || !state.completedCalls.includes(call.id))
    .filter((call) => !call.requiresFlag || Boolean(game.flags[call.requiresFlag]))
    .filter((call) => !call.forbidsFlag || !game.flags[call.forbidsFlag])
    .sort((a, b) => a.minChapter - b.minChapter);
};

export const preferredCallFor = (contactId: string, game: GameState): CallDef | null =>
  availableCallsFor(contactId, game)[0] ?? null;

export interface ProtectionResult {
  threatRelief: number;
  shieldSeconds: number;
  shieldSteps: number;
  fatigue: number;
}

export const protectionFromCall = (
  contact: ContactDef,
  state: ContactState,
  game: GameState
): ProtectionResult => {
  const fatigueByUse = Math.max(0.32, 1 - state.answered * 0.07);
  const recentPenalty =
    state.lastCallNight !== null && game.nightMinute - state.lastCallNight < 12 ? 0.55 : 1;
  const fatigue = fatigueByUse * recentPenalty;
  return {
    threatRelief: Math.round(contact.threatRelief * fatigue * 1.35),
    shieldSeconds: Math.round(contact.protectionSeconds * fatigue * 0.85),
    shieldSteps: Math.round(contact.protectionSeconds * fatigue * 0.34),
    fatigue
  };
};

export const callLengthMinutes = (contact: ContactDef, state: ContactState): number =>
  Math.round(2 + contact.callCost * 0.35 + (state.callCount === 0 ? 1 : 0));

export const callSignalQuality = (game: GameState): number => {
  const stage = game.threat >= 80 ? 0 : game.threat >= 60 ? 1 : game.threat >= 40 ? 2 : 3;
  const difficultyBonus = game.difficulty === 'nightmare' ? -1 : game.difficulty === 'story' ? 1 : 0;
  return clamp(stage + difficultyBonus, 0, 3);
};

export const makeContactState = (trust: number, unlocked: boolean): ContactState => ({
  trust,
  answered: 0,
  missed: 0,
  lastCallNight: null,
  callCount: 0,
  voicemails: [],
  revealed: [],
  completedCalls: [],
  lied: false,
  unlocked
});

export const callsById = callById;
