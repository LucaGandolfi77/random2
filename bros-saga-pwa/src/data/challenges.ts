export interface ChallengeMode {
  id: string;
  name: string;
  description: string;
  enemyHp: number;
  enemyAttack: number;
  noItems: boolean;
  timer: number;
  scoreMultiplier: number;
}

export const CHALLENGE_MODES: ChallengeMode[] = [
  { id: 'normal', name: 'NORMAL', description: 'The intended adventure.', enemyHp: 1, enemyAttack: 1, noItems: false, timer: 0, scoreMultiplier: 1 },
  { id: 'hard', name: 'HARD', description: 'Enemies have 40% more HP and hit harder.', enemyHp: 1.4, enemyAttack: 1.25, noItems: false, timer: 0, scoreMultiplier: 1.5 },
  { id: 'ironman', name: 'IRON MAN', description: 'No items at all. One mistake can end the run.', enemyHp: 1.1, enemyAttack: 1.15, noItems: true, timer: 0, scoreMultiplier: 2 },
  { id: 'timer', name: 'TIMER ATTACK', description: 'Eight minutes to clear the route.', enemyHp: 1, enemyAttack: 1, noItems: false, timer: 480, scoreMultiplier: 1.8 }
];

export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGE_MODES.map((m) => [m.id, m])) as Record<string, ChallengeMode>;
