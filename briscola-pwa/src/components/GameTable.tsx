import type { ReactNode } from 'react';
import { cardStrength, otherSeat, type Card, type Phase, type PublicGameState, type Seat, type TrickView } from '@/game/engine';
import { cx } from '@/utils';
import { PlayingCard } from './PlayingCard';

interface GameTableProps {
  viewerSeat: Seat;
  hostName: string;
  guestName: string;
  hand: Card[];
  handCounts: Record<Seat, number>;
  table: Partial<Record<Seat, Card>>;
  trump: Card | null;
  deckCount: number;
  scores: Record<Seat, number>;
  turn: Seat;
  phase: Phase;
  winner: Seat | null;
  lastTrick: TrickView | null;
  log: string[];
  onPlay?: (cardId: string) => void;
  busy?: boolean;
  onLeave?: () => void;
  onRematch?: () => void;
  rematchLabel?: string;
  modeLabel: string;
  children?: ReactNode;
}

const SUIT_ORDER: Record<Card['suit'], number> = {
  denari: 0,
  coppe: 1,
  spade: 2,
  bastoni: 3
};

const nameOf = (seat: Seat, hostName: string, guestName: string): string =>
  seat === 'host' ? hostName : guestName;

const sortHand = (cards: Card[]): Card[] =>
  [...cards].sort(
    (a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || cardStrength(b.rank) - cardStrength(a.rank)
  );

export function GameTable({
  viewerSeat,
  hostName,
  guestName,
  hand,
  handCounts,
  table,
  trump,
  deckCount,
  scores,
  turn,
  phase,
  winner,
  lastTrick,
  log,
  onPlay,
  busy,
  onLeave,
  onRematch,
  rematchLabel = 'Rivincita',
  modeLabel,
  children
}: GameTableProps) {
  const opponentSeat = otherSeat(viewerSeat);
  const opponentName = nameOf(opponentSeat, hostName, guestName);
  const viewerName = nameOf(viewerSeat, hostName, guestName);
  const yourTurn = phase === 'playing' && turn === viewerSeat;
  const opponentCard = table[opponentSeat];
  const viewerCard = table[viewerSeat];
  const sortedHand = sortHand(hand);
  const trickPoints = (lastTrick?.points ?? 0);
  const winnerName = winner ? nameOf(winner, hostName, guestName) : null;

  return (
    <div className="game-shell">
      <div className="game-scroller">
        <div className="table-frame">
          <div className="table-rail" />
          <div className="table-felt">
            <div className="table-head">
              <span className="round-chip">{modeLabel}</span>
              <span className={cx('turn-chip', yourTurn && 'is-mine', phase === 'finished' && 'is-done')}>
                {phase === 'finished'
                  ? 'Partita conclusa'
                  : yourTurn
                    ? 'Tocca a te'
                    : `Tocca a ${nameOf(turn, hostName, guestName)}`}
              </span>
            </div>

            <div className="score-strip">
              <div className={cx('score-side', viewerSeat === 'host' && 'is-you')}>
                <span>{viewerName}</span>
                <strong>{scores[viewerSeat]}</strong>
              </div>
              <span className="score-divider">·</span>
              <div className={cx('score-side', opponentSeat === 'host' && 'is-you')}>
                <span>{opponentName}</span>
                <strong>{scores[opponentSeat]}</strong>
              </div>
            </div>

            <section className="opponent-area" aria-label="Mano avversario">
              <div className="player-line">
                <span className="player-dot" />
                <strong>{opponentName}</strong>
                <small>{handCounts[opponentSeat]} {handCounts[opponentSeat] === 1 ? 'carta' : 'carte'}</small>
              </div>
              <div className="opponent-hand">
                {Array.from({ length: handCounts[opponentSeat] ?? 0 }, (_, index) => (
                  <PlayingCard key={index} hidden small />
                ))}
              </div>
            </section>

            <section className="trick-area">
              <div className="trick-side opponent">
                {opponentCard ? (
                  <PlayingCard card={opponentCard} small={false} />
                ) : (
                  <div className="empty-slot"><span>attesa</span></div>
                )}
              </div>

              <div className="table-center">
                <div className="briscola-widget">
                  <span className="eyebrow">Briscola</span>
                  <div className={cx('trump-card', trump && 'is-set')}>
                    {trump ? <PlayingCard card={trump} small /> : <PlayingCard hidden small />}
                  </div>
                  <small>{deckCount} carte nel mazzo</small>
                </div>
                {lastTrick && (
                  <div className="last-trick" title="Ultima presa">
                    <span>Ultima presa</span>
                    <div className="last-trick-cards">
                      <PlayingCard card={lastTrick.host} small />
                      <PlayingCard card={lastTrick.guest} small />
                    </div>
                    <small>
                      {nameOf(lastTrick.winner, hostName, guestName)} · +{trickPoints}
                    </small>
                  </div>
                )}
              </div>

              <div className="trick-side self">
                {viewerCard ? (
                  <PlayingCard card={viewerCard} small={false} />
                ) : (
                  <div className="empty-slot"><span>a terra</span></div>
                )}
              </div>
            </section>

            <section className="player-area" aria-label="La tua mano">
              <div className="player-line">
                <span className="player-dot is-you" />
                <strong>{viewerName}</strong>
                <small>{hand.length} {hand.length === 1 ? 'carta' : 'carte'}</small>
              </div>
              <div className="hand-row">
                {sortedHand.map((card) => (
                  <PlayingCard
                    key={card.id}
                    card={card}
                    selected={false}
                    disabled={!yourTurn || busy}
                    onClick={yourTurn && !busy ? () => onPlay?.(card.id) : undefined}
                  />
                ))}
                {!hand.length && <p className="muted">Nessuna carta in mano.</p>}
              </div>
              {yourTurn && !viewerCard && (
                <p className="turn-hint">Scegli una carta da giocare.</p>
              )}
            </section>
          </div>
        </div>

        <aside className="table-aside">
          <div className="aside-card">
            <div className="aside-title">
              <span>Partita</span>
              <button type="button" className="text-link" onClick={onLeave}>Esci</button>
            </div>
            <div className="aside-stat">
              <span>Punti tuoi</span>
              <strong>{scores[viewerSeat]}</strong>
            </div>
            <div className="aside-stat">
              <span>Punti avversario</span>
              <strong>{scores[opponentSeat]}</strong>
            </div>
            <div className="aside-stat">
              <span>Mazzo</span>
              <strong>{deckCount}</strong>
            </div>
            <div className="aside-stat">
              <span>Punti ultima presa</span>
              <strong>{lastTrick ? lastTrick.points : 0}</strong>
            </div>
          </div>

          {children}

          <div className="aside-card log-card">
            <div className="aside-title"><span>Cronaca</span></div>
            <ol className="game-log">
              {[...log].slice(-8).reverse().map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {phase === 'finished' && (
        <div className="result-layer">
          <section className="result-card">
            <p className="eyebrow">Briscola · fine partita</p>
            <h2>
              {winner
                ? winner === viewerSeat
                  ? 'Hai vinto.'
                  : `Ha vinto ${winnerName}.`
                : 'Pareggio.'}
            </h2>
            <div className="result-score">
              <div><span>{viewerName}</span><strong>{scores[viewerSeat]}</strong></div>
              <i>—</i>
              <div><span>{opponentName}</span><strong>{scores[opponentSeat]}</strong></div>
            </div>
            <p>
              {winner === viewerSeat
                ? 'La Briscola era dalla tua parte. Ancora una mano?'
                : winner
                  ? 'La prossima volta conterai meglio le carte.'
                  : 'Nessuno cede. La rivincita è obbligatoria.'}
            </p>
            <div className="result-actions">
              {onRematch && <button type="button" className="btn primary" onClick={onRematch}>{rematchLabel}</button>}
              {onLeave && <button type="button" className="btn" onClick={onLeave}>Torna alla home</button>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export type PublicTableView = PublicGameState;
