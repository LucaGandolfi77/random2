import { FIGHTERS, getFighter } from '../../data/fighters';
import { createAI, type AIDifficulty } from '../ai';
import { MatchSim } from '../combat/simulation';
import type { MatchConfig } from '../combat/types';
import type { TournamentState } from '../../utils/storage';

export interface TournamentMatch {
  a: string;
  b: string;
  winner?: string;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateAIMatch(aId: string, bId: string, difficulty: AIDifficulty, seed: number): string {
  const a = getFighter(aId);
  const b = getFighter(bId);
  const config: MatchConfig = {
    mode: 'quick',
    stageId: 'the-last-festival',
    roundsToWin: 1,
    roundTime: 60,
    fighters: [a, b],
    teams: [[0], [1]],
    teamSize: 1,
    rumble: false
  };
  const sim = new MatchSim(config);
  const aiA = createAI(0, a.ai, difficulty, seed);
  const aiB = createAI(1, b.ai, difficulty, seed + 101);
  for (let frame = 0; frame < 7200; frame++) {
    sim.step([aiA.update(sim), aiB.update(sim)]);
    if (sim.phase === 'matchEnd') {
      return sim.matchWinner === 0 ? aId : bId;
    }
  }
  const aRatio = sim.fighters[0].health / sim.fighters[0].maxHealth;
  const bRatio = sim.fighters[1].health / sim.fighters[1].maxHealth;
  return aRatio >= bRatio ? aId : bId;
}

export function createTournament(
  playerFighter: string,
  difficulty: AIDifficulty = 'normal',
  seed = Date.now()
): TournamentState {
  const rng = seededRandom(seed);
  const pool = shuffle(
    FIGHTERS.map((fighter) => fighter.id).filter((id) => id !== playerFighter),
    rng
  ).slice(0, 7);
  const participants = shuffle([playerFighter, ...pool], rng);
  const firstRound: TournamentMatch[] = [];
  for (let i = 0; i < 8; i += 2) {
    firstRound.push({ a: participants[i], b: participants[i + 1] });
  }
  return {
    playerFighter,
    difficulty,
    round: 0,
    bracket: [firstRound],
    eliminated: false,
    champion: false
  };
}

export function playerTournamentMatch(state: TournamentState): TournamentMatch | undefined {
  return state.bracket[state.round]?.find(
    (match) => match.a === state.playerFighter || match.b === state.playerFighter
  );
}

export function advanceTournament(
  state: TournamentState,
  playerWon: boolean,
  seed = Date.now()
): TournamentState {
  if (state.eliminated || state.champion) return state;
  const rng = seededRandom(seed);
  const round = state.round;
  const matches = state.bracket[round]?.map((match) => ({ ...match }));
  if (!matches) return state;
  const playerMatch = matches.find(
    (match) => match.a === state.playerFighter || match.b === state.playerFighter
  );
  if (!playerMatch) return state;
  playerMatch.winner = playerWon
    ? state.playerFighter
    : playerMatch.a === state.playerFighter
      ? playerMatch.b
      : playerMatch.a;

  for (const match of matches) {
    if (match.winner) continue;
    match.winner = simulateAIMatch(match.a, match.b, state.difficulty as AIDifficulty, Math.floor(rng() * 1e9));
  }

  const nextState: TournamentState = {
    ...state,
    bracket: [...state.bracket.slice(0, round), matches]
  };

  if (!playerWon) {
    nextState.eliminated = true;
    return nextState;
  }
  if (round >= 2) {
    nextState.champion = true;
    return nextState;
  }

  const winners = matches.map((match) => match.winner!).filter(Boolean);
  const nextRound: TournamentMatch[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    nextRound.push({ a: winners[i], b: winners[i + 1] });
  }
  nextState.bracket.push(nextRound);
  nextState.round = round + 1;
  return nextState;
}

export function tournamentReward(round: number, champion: boolean): { xp: number; credits: number } {
  if (champion) return { xp: 1200, credits: 900 };
  return { xp: 180 + round * 120, credits: 120 + round * 80 };
}
