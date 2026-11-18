import type { Chapter } from './types';

export const CHAPTERS: Chapter[] = [
  {
    id: 1, title: 'THE FIRST CALL', hour: 22,
    objective: 'Explore the house. Open your phone and find someone to talk to.',
    intro: 'A message appears on your phone: "They only come when you are alone." Then something moves outside the living room window.',
    threatRate: 0.13
  },
  {
    id: 2, title: 'SOMETHING IS WATCHING', hour: 23,
    objective: 'Keep the line open. Silhouettes are gathering outside the windows.',
    intro: 'A shape slides past the glass. It stops. It knows you are looking.',
    threatRate: 0.16
  },
  {
    id: 3, title: 'NOBODY BELIEVES YOU', hour: 0,
    objective: 'Some contacts will not answer. Find out why your family is involved.',
    intro: 'Your calls go straight to voicemail. An unknown number lights up your screen.',
    threatRate: 0.19
  },
  {
    id: 4, title: 'THEY ARE INSIDE', hour: 2,
    objective: 'Secure the doors. The Shadows are in the house now.',
    intro: 'A door opens somewhere down the hallway. You are sure you locked it.',
    threatRate: 0.24
  },
  {
    id: 5, title: 'THE LAST CONNECTION', hour: 4,
    objective: 'Your battery is dying. Decide what you believe and who you trust.',
    intro: 'The screen flickers. One bar. Outside, something whispers your name.',
    threatRate: 0.28
  },
  {
    id: 6, title: 'ONE LAST CALL', hour: 5.5,
    objective: 'Hold on until 6:00 AM. Choose your final connection.',
    intro: 'The hallway is black. Footsteps are close. There is time for one more call.',
    threatRate: 0.34
  }
];

export const NIGHT_START = 22;
export const NIGHT_END = 24 + 6;
export const NIGHT_REAL_SECONDS = 25 * 60;

/** Chapter hours after midnight are stored as 0..6 but compared on a 22..30 night clock. */
export function nightHour(hour: number): number {
  return hour < 12 ? hour + 24 : hour;
}
