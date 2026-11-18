export type ContactId = 'sophie' | 'mom' | 'dad' | 'daniel' | 'alex' | 'jessica' | 'mike' | 'unknown';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Quality = 'low' | 'medium' | 'high';

export interface Contact {
  id: ContactId;
  name: string;
  role: string;
  number: string;
  initials: string;
  tint: string;
  startNode: string;
  /** seconds before this contact can be called again */
  cooldownSec: number;
  /** short description shown in the contacts screen */
  benefit: string;
  /** earliest chapter in which the contact can be reached */
  fromChapter: number;
  /** chapter after which the contact stops answering (0 = never) */
  untilChapter: number;
}

export interface DialogueEffects {
  threat?: number;
  shieldSec?: number;
  relationship?: number;
  battery?: number;
  flags?: string[];
  reveal?: string;
  unlock?: ContactId;
  end?: boolean;
  event?: string;
}

export interface DialogueChoice {
  text: string;
  next?: string | null;
  effects?: DialogueEffects;
}

export interface DialogueNode {
  speaker: string;
  line: string;
  choices: DialogueChoice[];
  /** seconds the player has to answer before timeoutChoice is picked */
  timeout?: number;
  timeoutChoice?: number;
}

export interface Chapter {
  id: number;
  title: string;
  hour: number;
  objective: string;
  intro: string;
  threatRate: number;
}

export interface RandomEvent {
  id: string;
  title: string;
  text: string;
  minChapter: number;
  weight: number;
  threat?: number;
  reveal?: string;
  flag?: string;
}

export interface Ending {
  id: string;
  title: string;
  text: string;
}
