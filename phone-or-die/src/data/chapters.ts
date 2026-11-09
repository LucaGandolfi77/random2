import type { ChapterDef } from '@/core/types';

export const chapters: ChapterDef[] = [
  {
    index: 0,
    startMinute: 0,
    timeLabel: '10:00 PM',
    title: 'After the Shift',
    subtitle: 'Chapter One',
    objective: 'Leave the shop behind. Find a street that will take you home.',
    quote: '“The last bus is always the one you hear leaving.”',
    color: '#c89a6a'
  },
  {
    index: 1,
    startMinute: 60,
    timeLabel: '11:00 PM',
    title: 'Lantern Avenue',
    subtitle: 'Chapter Two',
    objective: 'Stay under the streetlights. Keep a voice on the line.',
    quote: '“A lit street is only a promise. A voice is proof.”',
    color: '#a98b64'
  },
  {
    index: 2,
    startMinute: 120,
    timeLabel: '12:00 AM',
    title: 'Night Bus Row',
    subtitle: 'Chapter Three',
    objective: 'Follow the bus route toward the old quarter. The timetable is a lie.',
    quote: '“The bus that never comes is still a way of waiting.”',
    color: '#947d65'
  },
  {
    index: 3,
    startMinute: 240,
    timeLabel: '2:00 AM',
    title: 'The Cut',
    subtitle: 'Chapter Four',
    objective: 'Choose the lit avenue or the dark shortcut. Home is still blocks away.',
    quote: '“Every shortcut is a sentence the road finishes for you.”',
    color: '#9b5f54'
  },
  {
    index: 4,
    startMinute: 360,
    timeLabel: '4:00 AM',
    title: 'The Old Quarter',
    subtitle: 'Chapter Five',
    objective: 'The streets are repeating. Reach Home Lane before the last hour.',
    quote: '“If the road knows your name, do not give it the rest.”',
    color: '#835b59'
  },
  {
    index: 5,
    startMinute: 450,
    timeLabel: '5:30 AM',
    title: 'The Porch Light',
    subtitle: 'Chapter Six',
    objective: 'Get to the front door. Make the last call before 6:00 AM.',
    quote: '“Home is not a place until someone answers.”',
    color: '#d0a86e'
  }
];

export const chapterForNightMinute = (nightMinute: number): number => {
  let index = 0;
  for (const chapter of chapters) {
    if (nightMinute >= chapter.startMinute) index = chapter.index;
  }
  return index;
};

export const chapterById = Object.fromEntries(chapters.map((chapter) => [chapter.index, chapter]));

export const introSlides = [
  {
    kicker: '10:07 PM',
    title: 'The street is longer than it was this morning.',
    body: 'Emma locks the copy shop behind her and watches the last bus pull away without stopping. Her phone shows a message from a number with no area code: “They only come when you’re alone.” She starts walking. Home is thirty minutes away. It should be thirty minutes away.'
  },
  {
    kicker: '10:09 PM',
    title: 'Someone is walking a half-step behind her.',
    body: 'There is no one on the pavement when she turns. The streetlight above her shivers, and the footsteps stop when hers do. She calls Sophie. For as long as Sophie is speaking, the street stays where it should be.'
  },
  {
    kicker: '10:14 PM',
    title: 'Keep someone on the line until you get home.',
    body: 'The road is not empty. It is waiting. Every step brings the shadows closer; every voice on the phone pushes them back. Emma has until 6:00 AM to reach the porch — and to decide which voices she can trust before the last call.'
  }
];

export const credits = [
  { role: 'Story & Design', name: 'Original production' },
  { role: 'Engineering', name: 'TypeScript · Phaser · React' },
  { role: 'Art Direction', name: 'Procedural 2D illustration' },
  { role: 'Sound Design', name: 'Web Audio synthesis' },
  { role: 'Special Thanks', name: 'Everyone who answered the phone' }
];
