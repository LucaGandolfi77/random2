import {
  beats,
  cardPoints,
  cardStrength,
  type BriscolaState,
  type Card,
  type Seat
} from './engine';

const lowValue = (card: Card): number => cardPoints(card) * 10 + cardStrength(card.rank);

export const chooseCpuCard = (state: BriscolaState, seat: Seat): Card => {
  const hand = state.hands[seat];
  if (!hand.length) throw new Error('CPU hand is empty');
  const other = seat === 'host' ? 'guest' : 'host';
  const tableCard = state.table[other];

  if (!tableCard) {
    const nonTrump = hand.filter((card) => card.suit !== state.trump?.suit);
    return [...(nonTrump.length ? nonTrump : hand)].sort((a, b) => lowValue(a) - lowValue(b))[0];
  }

  const winning = hand.filter((card) => beats(card, tableCard, state.trump?.suit ?? null));
  const pointsOnTable = cardPoints(tableCard);
  if (winning.length) {
    const cheapestWinner = [...winning].sort((a, b) => lowValue(a) - lowValue(b))[0];
    if (pointsOnTable >= 8 || winning.length === 1) return cheapestWinner;
    const nonTrumpWinner = winning.filter((card) => card.suit !== state.trump?.suit);
    if (nonTrumpWinner.length) {
      return [...nonTrumpWinner].sort((a, b) => lowValue(a) - lowValue(b))[0];
    }
    return cheapestWinner;
  }

  const discards = hand.filter((card) => card.suit !== state.trump?.suit);
  return [...(discards.length ? discards : hand)].sort((a, b) => lowValue(a) - lowValue(b))[0];
};

export const simulateWithCpu = (initial: BriscolaState, cpuSeat: Seat = 'guest'): BriscolaState => {
  let state = initial;
  let guard = 0;
  while (state.phase === 'playing' && guard++ < 100) {
    const seat = state.turn;
    const card =
      seat === cpuSeat
        ? chooseCpuCard(state, seat)
        : state.hands[seat][Math.floor(Math.random() * state.hands[seat].length)];
    const result = playOne(state, seat, card);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  return state;
};

const playOne = (
  state: BriscolaState,
  seat: Seat,
  card: Card
): { ok: boolean; state: BriscolaState; error?: string } => {
  // Kept as a local wrapper so the pure engine remains independent of the CPU.
  return playCardRef(state, seat, card.id);
};

// Late-bound to avoid a circular value import at module initialization.
import { playCard as playCardRef } from './engine';
