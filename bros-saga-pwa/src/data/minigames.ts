import type { MinigameDef, MinigameId } from '../game/types';

export const MINIGAMES: MinigameDef[] = [
  {
    id: 'coinrush', name: 'COIN RUSH', description: 'Grab as many coins as you can before the clock runs out.',
    instruction: 'Move with the D-pad, press A to grab a coin when the cursor is on it.',
    seconds: 25, reward: { coins: 8, bp: 1, item: 'mushroom' }
  },
  {
    id: 'hammertoss', name: 'HAMMER TOSS', description: 'Hit moving targets with perfectly timed swings.',
    instruction: 'Press A inside the yellow window. Every hit scores; misses cost time.',
    seconds: 25, reward: { coins: 10, bp: 1, badge: 'timing_core' }
  },
  {
    id: 'jumprope', name: 'JUMP ROPE', description: 'Keep the rhythm with both brothers.',
    instruction: 'Alternate A and B each time the rope reaches the brothers.',
    seconds: 30, reward: { coins: 9, bp: 2, item: 'pepper' }
  },
  {
    id: 'recipedash', name: 'RECIPE DASH', description: 'Collect ingredients before the dish burns.',
    instruction: 'Press A on each ingredient in order. Finish three recipes.',
    seconds: 35, reward: { coins: 12, bp: 1, item: 'oneup' }
  },
  {
    id: 'cardmatch', name: 'CARD MATCH', description: 'Find matching power cards.',
    instruction: 'Press A on two cards per turn. A match scores points.',
    seconds: 40, reward: { coins: 15, bp: 2, badge: 'power_badge' }
  }
];

export const MINIGAME_BY_ID = Object.fromEntries(MINIGAMES.map((m) => [m.id, m])) as Record<MinigameId, MinigameDef>;
