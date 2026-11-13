export const SUITS = ['denari', 'coppe', 'spade', 'bastoni'] as const;
export type Suit = (typeof SUITS)[number];
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Seat = 'host' | 'guest';
export type Phase = 'waiting' | 'playing' | 'finished';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface TrickView {
  host: Card;
  guest: Card;
  winner: Seat;
  points: number;
}

export interface BriscolaState {
  phase: Phase;
  deck: Card[];
  hands: Record<Seat, Card[]>;
  table: Partial<Record<Seat, Card>>;
  trump: Card | null;
  turn: Seat;
  leader: Seat;
  captured: Record<Seat, Card[]>;
  scores: Record<Seat, number>;
  round: number;
  winner: Seat | null;
  lastTrick: TrickView | null;
  log: string[];
  startedAt: number;
}

export interface PublicGameState {
  phase: Phase;
  deckCount: number;
  handCounts: Record<Seat, number>;
  table: Partial<Record<Seat, Card>>;
  trump: Card | null;
  turn: Seat;
  leader: Seat;
  scores: Record<Seat, number>;
  capturedCounts: Record<Seat, number>;
  round: number;
  winner: Seat | null;
  lastTrick: TrickView | null;
  log: string[];
  hostName: string;
  guestName: string;
  updatedAt: number;
  message?: string;
}

export type Rng = () => number;

export const RANK_NAMES: Record<Rank, string> = {
  1: 'Asso',
  2: 'Due',
  3: 'Tre',
  4: 'Quattro',
  5: 'Cinque',
  6: 'Sei',
  7: 'Sette',
  8: 'Fante',
  9: 'Cavallo',
  10: 'Re'
};

export const SUIT_NAMES: Record<Suit, string> = {
  denari: 'Denari',
  coppe: 'Coppe',
  spade: 'Spade',
  bastoni: 'Bastoni'
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  denari: '♦',
  coppe: '♥',
  spade: '♠',
  bastoni: '♣'
};

export const STRENGTH_ORDER: Rank[] = [1, 3, 10, 9, 8, 7, 6, 5, 4, 2];
export const CARD_POINTS: Record<Rank, number> = {
  1: 11,
  2: 0,
  3: 10,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 2,
  9: 3,
  10: 4
};

export const otherSeat = (seat: Seat): Seat => (seat === 'host' ? 'guest' : 'host');

export const cardName = (card: Card): string =>
  `${RANK_NAMES[card.rank]} di ${SUIT_NAMES[card.suit]}`;

export const cardStrength = (rank: Rank): number => STRENGTH_ORDER.length - STRENGTH_ORDER.indexOf(rank);

export const cardPoints = (card: Card): number => CARD_POINTS[card.rank];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1 as Rank; rank <= 10; rank = (rank + 1) as Rank) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
};

export const shuffle = (cards: Card[], rng: Rng = Math.random): Card[] => {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const sanitizeName = (value: string): string => {
  const clean = value.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, ' ');
  return clean.slice(0, 18) || 'Giocatore';
};

const initialHands = (deck: Card[]): Record<Seat, Card[]> => ({
  host: [deck.pop()!, deck.pop()!, deck.pop()!],
  guest: [deck.pop()!, deck.pop()!, deck.pop()!]
});

export const newGame = (
  hostName = 'Ospite',
  guestName = 'Avversario',
  rng: Rng = Math.random
): BriscolaState => {
  const deck = shuffle(createDeck(), rng);
  const hands = initialHands(deck);
  const starter: Seat = rng() < 0.5 ? 'host' : 'guest';
  const trump = deck[0];
  return {
    phase: 'playing',
    deck,
    hands,
    table: {},
    trump,
    turn: starter,
    leader: starter,
    captured: { host: [], guest: [] },
    scores: { host: 0, guest: 0 },
    round: 1,
    winner: null,
    lastTrick: null,
    log: [
      `${hostName} sfida ${guestName}.`,
      `Briscola: ${trump ? cardName(trump) : '—'}. Inizia ${starter === 'host' ? hostName : guestName}.`
    ],
    startedAt: Date.now()
  };
};

export const beats = (challenger: Card, current: Card, trumpSuit: Suit | null): boolean => {
  if (challenger.suit === current.suit) {
    return cardStrength(challenger.rank) > cardStrength(current.rank);
  }
  if (challenger.suit === trumpSuit && current.suit !== trumpSuit) return true;
  if (current.suit === trumpSuit && challenger.suit !== trumpSuit) return false;
  return false;
};

const drawOne = (state: BriscolaState): Card | null => {
  if (state.deck.length === 0) return null;
  return state.deck.pop() ?? null;
};

const resolveTrick = (state: BriscolaState, hostName: string, guestName: string): void => {
  const hostCard = state.table.host!;
  const guestCard = state.table.guest!;
  const leader = state.leader;
  const follower = otherSeat(leader);
  const leaderCard = leader === 'host' ? hostCard : guestCard;
  const followerCard = follower === 'host' ? hostCard : guestCard;
  const followerWins = beats(followerCard, leaderCard, state.trump?.suit ?? null);
  const winner = followerWins ? follower : leader;
  const points = cardPoints(hostCard) + cardPoints(guestCard);
  state.scores[winner] += points;
  state.captured[winner].push(hostCard, guestCard);
  state.lastTrick = { host: hostCard, guest: guestCard, winner, points };
  state.round += 1;
  state.table = {};
  const winnerName = winner === 'host' ? hostName : guestName;
  state.log.push(
    `${winnerName} vince la presa (${points} ${points === 1 ? 'punto' : 'punti'}).`
  );

  const first = drawOne(state);
  if (first) state.hands[winner].push(first);
  const second = drawOne(state);
  if (second) state.hands[otherSeat(winner)].push(second);

  if (state.hands.host.length === 0 && state.hands.guest.length === 0 && state.deck.length === 0) {
    state.phase = 'finished';
    if (state.scores.host === state.scores.guest) {
      state.winner = null;
      state.log.push('Partita terminata: pareggio.');
    } else {
      state.winner = state.scores.host > state.scores.guest ? 'host' : 'guest';
      state.log.push(
        `Partita terminata: vince ${state.winner === 'host' ? hostName : guestName} ${Math.max(
          state.scores.host,
          state.scores.guest
        )} a ${Math.min(state.scores.host, state.scores.guest)}.`
      );
    }
  } else {
    state.turn = winner;
    state.leader = winner;
  }
};

export interface PlayResult {
  ok: boolean;
  state: BriscolaState;
  error?: string;
}

export const playCard = (
  input: BriscolaState,
  seat: Seat,
  cardId: string,
  hostName = 'Ospite',
  guestName = 'Avversario'
): PlayResult => {
  if (input.phase !== 'playing') {
    return { ok: false, state: input, error: 'La partita non è in corso.' };
  }
  if (input.turn !== seat) {
    return { ok: false, state: input, error: 'Non è il tuo turno.' };
  }
  if (input.table[seat]) {
    return { ok: false, state: input, error: 'Hai già giocato in questa presa.' };
  }
  const card = input.hands[seat].find((entry) => entry.id === cardId);
  if (!card) {
    return { ok: false, state: input, error: 'Carta non presente nella mano.' };
  }

  const state: BriscolaState = {
    ...input,
    deck: [...input.deck],
    hands: { host: [...input.hands.host], guest: [...input.hands.guest] },
    table: { ...input.table },
    captured: { host: [...input.captured.host], guest: [...input.captured.guest] },
    scores: { ...input.scores },
    log: [...input.log]
  };

  state.hands[seat] = state.hands[seat].filter((entry) => entry.id !== cardId);
  state.table[seat] = card;
  state.log.push(
    `${seat === 'host' ? hostName : guestName} gioca ${cardName(card)}.`
  );

  if (state.table.host && state.table.guest) {
    resolveTrick(state, hostName, guestName);
  } else {
    state.turn = otherSeat(seat);
  }

  return { ok: true, state };
};

export const publicState = (
  state: BriscolaState,
  hostName: string,
  guestName: string,
  message?: string
): PublicGameState => ({
  phase: state.phase,
  deckCount: state.deck.length,
  handCounts: { host: state.hands.host.length, guest: state.hands.guest.length },
  table: state.table,
  trump: state.trump,
  turn: state.turn,
  leader: state.leader,
  scores: state.scores,
  capturedCounts: {
    host: state.captured.host.length,
    guest: state.captured.guest.length
  },
  round: state.round,
  winner: state.winner,
  lastTrick: state.lastTrick,
  log: state.log.slice(-12),
  hostName,
  guestName,
  updatedAt: Date.now(),
  message
});

export const totalCapturedPoints = (state: BriscolaState): number =>
  state.captured.host.reduce((total, card) => total + cardPoints(card), 0) +
  state.captured.guest.reduce((total, card) => total + cardPoints(card), 0);

export const handPoints = (cards: Card[]): number =>
  cards.reduce((total, card) => total + cardPoints(card), 0);
