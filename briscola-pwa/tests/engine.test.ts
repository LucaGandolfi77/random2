import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  beats,
  cardPoints,
  cardStrength,
  createDeck,
  newGame,
  playCard,
  publicState,
  sanitizeName,
  totalCapturedPoints,
  type BriscolaState,
  type Card,
  type Seat
} from '@/game/engine';
import { chooseCpuCard } from '@/game/cpu';

const seeded = (seed: number) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const card = (suit: Card['suit'], rank: Card['rank']): Card => ({
  id: `${suit}-${rank}`,
  suit,
  rank
});

const emptyState = (): BriscolaState => ({
  phase: 'playing',
  deck: [],
  hands: { host: [], guest: [] },
  table: {},
  trump: card('denari', 2),
  turn: 'host',
  leader: 'host',
  captured: { host: [], guest: [] },
  scores: { host: 0, guest: 0 },
  round: 1,
  winner: null,
  lastTrick: null,
  log: [],
  startedAt: 0
});

describe('Briscola engine', () => {
  it('builds a unique forty-card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(40);
    expect(new Set(deck.map((entry) => entry.id)).size).toBe(40);
    expect(deck.filter((entry) => entry.suit === 'denari')).toHaveLength(10);
  });

  it('values and orders cards correctly', () => {
    expect(cardPoints(card('denari', 1))).toBe(11);
    expect(cardPoints(card('coppe', 3))).toBe(10);
    expect(cardPoints(card('spade', 10))).toBe(4);
    expect(cardPoints(card('bastoni', 9))).toBe(3);
    expect(cardPoints(card('denari', 8))).toBe(2);
    expect(cardPoints(card('denari', 2))).toBe(0);
    expect(cardStrength(1)).toBeGreaterThan(cardStrength(3));
    expect(cardStrength(3)).toBeGreaterThan(cardStrength(10));
    expect(cardStrength(10)).toBeGreaterThan(cardStrength(2));
    expect(createDeck().reduce((total, entry) => total + cardPoints(entry), 0)).toBe(120);
  });

  it('deals three cards each, leaves the trump in the deck and chooses a starter', () => {
    const state = newGame('A', 'B', seeded(42));
    expect(state.hands.host).toHaveLength(3);
    expect(state.hands.guest).toHaveLength(3);
    expect(state.deck).toHaveLength(34);
    expect(state.trump?.id).toBe(state.deck[0].id);
    expect(state.turn).toBe(state.leader);
    expect(state.phase).toBe('playing');
  });

  it('resolves suits, trumps and equal-suit strength', () => {
    expect(beats(card('coppe', 1), card('coppe', 3), 'denari')).toBe(true);
    expect(beats(card('coppe', 3), card('coppe', 1), 'denari')).toBe(false);
    expect(beats(card('denari', 2), card('coppe', 1), 'denari')).toBe(true);
    expect(beats(card('spade', 1), card('denari', 2), 'denari')).toBe(false);
    expect(beats(card('spade', 1), card('coppe', 1), 'denari')).toBe(false);
  });

  it('rejects invalid turns, cards and double plays', () => {
    const state = newGame('A', 'B', seeded(7));
    const wrongSeat: Seat = state.turn === 'host' ? 'guest' : 'host';
    expect(playCard(state, wrongSeat, state.hands[wrongSeat][0].id).ok).toBe(false);
    expect(playCard(state, state.turn, 'not-a-card').ok).toBe(false);
    const first = playCard(state, state.turn, state.hands[state.turn][0].id);
    expect(first.ok).toBe(true);
    expect(first.state.table[state.turn]).toBeTruthy();
    const replay = playCard(first.state, state.turn, first.state.hands[state.turn][0]?.id ?? 'none');
    expect(replay.ok).toBe(false);
  });

  it('awards the trick, draws in winner-first order and moves the lead', () => {
    const state = newGame('A', 'B', seeded(99));
    const firstSeat = state.turn;
    const firstCard = state.hands[firstSeat][0];
    const afterFirst = playCard(state, firstSeat, firstCard.id);
    expect(afterFirst.ok).toBe(true);
    expect(afterFirst.state.deck).toHaveLength(34);
    const secondSeat: Seat = firstSeat === 'host' ? 'guest' : 'host';
    const secondCard = afterFirst.state.hands[secondSeat][0];
    const result = playCard(afterFirst.state, secondSeat, secondCard.id);
    expect(result.ok).toBe(true);
    expect(result.state.deck).toHaveLength(32);
    expect(result.state.hands.host).toHaveLength(3);
    expect(result.state.hands.guest).toHaveLength(3);
    expect(result.state.lastTrick?.points).toBeGreaterThanOrEqual(0);
    expect(result.state.scores.host + result.state.scores.guest).toBe(result.state.lastTrick?.points);
    expect(result.state.turn).toBe(result.state.leader);
  });

  it('plays complete games with the CPU and conserves all 120 points', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = seeded(seed);
      let state = newGame('A', 'B', rng);
      let guard = 0;
      while (state.phase === 'playing' && guard++ < 100) {
        const seat = state.turn;
        const selected = chooseCpuCard(state, seat);
        expect(state.hands[seat].some((entry) => entry.id === selected.id)).toBe(true);
        const result = playCard(state, seat, selected.id, 'A', 'B');
        expect(result.ok).toBe(true);
        state = result.state;
      }
      expect(state.phase).toBe('finished');
      expect(state.deck).toHaveLength(0);
      expect(state.hands.host).toHaveLength(0);
      expect(state.hands.guest).toHaveLength(0);
      expect(totalCapturedPoints(state)).toBe(120);
      expect(state.scores.host + state.scores.guest).toBe(120);
      if (state.scores.host !== state.scores.guest) {
        expect(state.winner).toBe(state.scores.host > state.scores.guest ? 'host' : 'guest');
      }
    }
  });

  it('does not expose deck or hands in the public state', () => {
    const state = newGame('A', 'B', seeded(3));
    const pub = publicState(state, 'A', 'B');
    expect('deck' in pub).toBe(false);
    expect('hands' in pub).toBe(false);
    expect(pub.handCounts).toEqual({ host: 3, guest: 3 });
    expect(pub.trump).toEqual(state.trump);
    expect(pub.deckCount).toBe(34);
  });

  it('sanitizes player names for the room', () => {
    expect(sanitizeName('  <Emma>  ')).toBe('Emma');
    expect(sanitizeName('Giocatore 12345678901234567890')).toHaveLength(18);
    expect(sanitizeName('')).toBe('Giocatore');
  });

  it('keeps the deployable Supabase engine identical to the client engine', () => {
    const source = fs.readFileSync(path.resolve('src/game/engine.ts'), 'utf8');
    const deployed = fs.readFileSync(
      path.resolve('supabase/functions/briscola/engine.ts'),
      'utf8'
    );
    expect(deployed).toBe(source);
  });
});
