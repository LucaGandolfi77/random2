import type { RandomEvent } from './types';

export const EVENTS: RandomEvent[] = [
  {
    id: 'window', title: 'THE WINDOW', minChapter: 1, weight: 12,
    text: 'A tall silhouette is standing outside the living room window. It does not move. Close the curtains, turn off the light, or call someone.',
    threat: 7, flag: 'event_window'
  },
  {
    id: 'unknown_call', title: 'UNKNOWN CALL', minChapter: 2, weight: 11,
    text: 'An unknown number is calling you. The display shows no name. The line is strangely quiet.',
    threat: 3, flag: 'event_unknown_call'
  },
  {
    id: 'power_outage', title: 'POWER OUTAGE', minChapter: 3, weight: 9,
    text: 'Every light in the house dies at once. Somewhere in the dark, your flashlight is still on the kitchen counter.',
    threat: 9, flag: 'event_blackout'
  },
  {
    id: 'missed_call', title: 'MISSED CALL', minChapter: 3, weight: 9,
    text: 'A missed call from a contact who stopped answering hours ago. There is no voicemail. Just three seconds of breathing.',
    threat: 4, reveal: 'missed_breathing', flag: 'event_missed'
  },
  {
    id: 'silent_room', title: 'THE SILENT ROOM', minChapter: 2, weight: 10,
    text: 'All ambient sound stops. No traffic. No wind. No hum from the fridge. Something is very close.',
    threat: 11, flag: 'event_silence'
  },
  {
    id: 'wrong_number', title: 'THE WRONG NUMBER', minChapter: 3, weight: 8,
    text: 'Someone answers your call and says your full name in your mother\'s voice. But your mother is on the other line.',
    threat: 8, reveal: 'mimic_reveal', flag: 'event_wrong_number'
  },
  {
    id: 'footsteps', title: 'THE FOOTSTEPS', minChapter: 2, weight: 11,
    text: 'Slow footsteps cross the room above you. Then the room below you. Then the hallway outside your door.',
    threat: 8, flag: 'event_footsteps'
  },
  {
    id: 'last_message', title: 'THE LAST MESSAGE', minChapter: 4, weight: 7,
    text: 'A new message: "I can see you holding the phone." It is from your own number.',
    threat: 10, reveal: 'shadow_names', flag: 'event_last_message'
  }
];

/** pick a random eligible event, weighted */
export function pickEvent(chapter: number, done: string[], rand: () => number = Math.random): RandomEvent | null {
  const pool = EVENTS.filter((e) => e.minChapter <= chapter && !done.includes(e.id));
  if (!pool.length) return null;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = rand() * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return pool[pool.length - 1];
}
