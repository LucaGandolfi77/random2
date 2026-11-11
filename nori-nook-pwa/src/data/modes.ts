import type { IconName } from '@/components/ui/Icon';

export interface GameModeMeta {
  id: string;
  name: string;
  short: string;
  description: string;
  icon: IconName;
  path: string;
  color: string;
  bg: string;
}

export const GAME_MODES: GameModeMeta[] = [
  {
    id: 'story',
    name: 'The Little Sushi Journey',
    short: 'Story',
    description: 'Serve the neighborhood, one little plate at a time.',
    icon: 'story',
    path: '/story',
    color: '#607B62',
    bg: '#edf1e8',
  },
  {
    id: 'zen',
    name: 'Zen Kitchen',
    short: 'Zen',
    description: 'No timers. Just rice, fish and a quiet kitchen.',
    icon: 'leaf',
    path: '/zen',
    color: '#7f916f',
    bg: '#f0f3ea',
  },
  {
    id: 'rush',
    name: 'Lunch Rush',
    short: 'Rush',
    description: 'A busy lunch hour, a warm counter and a happy combo.',
    icon: 'clock',
    path: '/rush',
    color: '#B9715F',
    bg: '#fae9e1',
  },
  {
    id: 'puzzle',
    name: 'Sushi Puzzle',
    short: 'Puzzle',
    description: '50 little ingredient riddles with stars to earn.',
    icon: 'puzzle',
    path: '/puzzle',
    color: '#8a7157',
    bg: '#f5ecdf',
  },
  {
    id: 'merge',
    name: 'Sushi Merge',
    short: 'Merge',
    description: 'Combine ingredients into tiny sushi miracles.',
    icon: 'merge',
    path: '/merge',
    color: '#6c7e86',
    bg: '#eaf2f4',
  },
  {
    id: 'daily',
    name: 'Daily Special',
    short: 'Daily',
    description: 'One fresh challenge every day, the same for everyone.',
    icon: 'calendar',
    path: '/daily',
    color: '#997a6a',
    bg: '#f9ebe2',
  },
  {
    id: 'delivery',
    name: 'Delivery Dash',
    short: 'Delivery',
    description: 'Pack beautiful bento boxes and hurry kindly.',
    icon: 'bento',
    path: '/delivery',
    color: '#8b725a',
    bg: '#f7eee0',
  },
  {
    id: 'chef',
    name: 'Sushi Chef Challenge',
    short: 'Chef',
    description: 'Face five rival chefs and their very particular rules.',
    icon: 'chef',
    path: '/chef',
    color: '#7f5e61',
    bg: '#f8e8e9',
  },
  {
    id: 'studio',
    name: 'Creative Studio',
    short: 'Studio',
    description: 'Arrange a plate, choose a background, take a photo.',
    icon: 'camera',
    path: '/studio',
    color: '#8b6c80',
    bg: '#f7ebf1',
  },
  {
    id: 'endless',
    name: 'Endless Restaurant',
    short: 'Endless',
    description: 'Keep the counter warm and chase your best score.',
    icon: 'infinity',
    path: '/endless',
    color: '#5f756e',
    bg: '#e9f0ed',
  },
];
