import { useEffect, useRef, useState } from 'react';
import { GameTable } from '@/components/GameTable';
import { Header } from '@/components/Header';
import { chooseCpuCard } from '@/game/cpu';
import { newGame, playCard, type BriscolaState } from '@/game/engine';
import { cx } from '@/utils';

interface LocalGameScreenProps {
  playerName: string;
  onHome: () => void;
}

export function LocalGameScreen({ playerName, onHome }: LocalGameScreenProps) {
  const [state, setState] = useState<BriscolaState>(() => newGame(playerName, 'CPU'));
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== 'guest') return;
    setThinking(true);
    timer.current = window.setTimeout(() => {
      setState((current) => {
        if (current.phase !== 'playing' || current.turn !== 'guest') return current;
        const card = chooseCpuCard(current, 'guest');
        const result = playCard(current, 'guest', card.id, playerName, 'CPU');
        return result.ok ? result.state : current;
      });
      setThinking(false);
    }, 680);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
    };
  }, [state.turn, state.phase, state.table.host, playerName]);

  const play = (cardId: string) => {
    if (state.turn !== 'host' || state.phase !== 'playing') return;
    setState((current) => {
      const result = playCard(current, 'host', cardId, playerName, 'CPU');
      return result.ok ? result.state : current;
    });
  };

  const rematch = () => {
    setState(newGame(playerName, 'CPU'));
    setThinking(false);
  };

  return (
    <main className={cx('play-screen', thinking && 'cpu-thinking')}>
      <Header
        compact
        onHome={onHome}
        status="Partita locale"
        right={<button type="button" className="btn ghost small" onClick={onHome}>Home</button>}
      />
      <GameTable
        viewerSeat="host"
        hostName={playerName}
        guestName="CPU"
        hand={state.hands.host}
        handCounts={{ host: state.hands.host.length, guest: state.hands.guest.length }}
        table={state.table}
        trump={state.trump}
        deckCount={state.deck.length}
        scores={state.scores}
        turn={state.turn}
        phase={state.phase}
        winner={state.winner}
        lastTrick={state.lastTrick}
        log={state.log}
        onPlay={play}
        busy={thinking}
        onLeave={onHome}
        onRematch={rematch}
        modeLabel="Contro la CPU"
      >
        <div className="aside-card cpu-card-aside">
          <div className="aside-title"><span>Avversario</span></div>
          <div className="cpu-face">♠</div>
          <p>La CPU gioca una carta ogni volta che tocca a lei. Nessuna fretta: la partita è locale.</p>
          <span className="aside-note">Modalità offline</span>
        </div>
      </GameTable>
    </main>
  );
}
