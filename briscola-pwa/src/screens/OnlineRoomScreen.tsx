import { useState } from 'react';
import { GameTable } from '@/components/GameTable';
import { Header } from '@/components/Header';
import type { OnlineRoomSnapshot } from '@/online/supabase';
import { seatForUser } from '@/online/supabase';
import { cx, shareText } from '@/utils';

interface OnlineRoomScreenProps {
  snapshot: OnlineRoomSnapshot;
  busy: boolean;
  error: string | null;
  status: string;
  onStart: () => void;
  onPlay: (cardId: string) => void;
  onLeave: () => void;
  onRefresh: () => void;
}

export function OnlineRoomScreen({
  snapshot,
  busy,
  error,
  status,
  onStart,
  onPlay,
  onLeave,
  onRefresh
}: OnlineRoomScreenProps) {
  const { room, hand, userId } = snapshot;
  const viewerSeat = seatForUser(room, userId);
  const opponentName = viewerSeat === 'host' ? room.guest_name : room.host_name;
  const [copied, setCopied] = useState(false);
  const publicState = room.public_state;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareText(room.code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (room.status === 'waiting') {
    return (
      <main className="online-screen lobby-screen">
        <Header
          compact
          onHome={onLeave}
          status={`Stanza ${room.code}`}
          right={<button type="button" className="btn ghost small" onClick={onLeave}>Esci</button>}
        />
        <div className="lobby-wrap">
          <section className="lobby-card">
            <p className="eyebrow">Stanza online</p>
            <h1>Codice d’invito</h1>
            <button type="button" className={cx('room-code', copied && 'is-copied')} onClick={copyCode}>
              <span>{room.code}</span>
              <small>{copied ? 'copiato' : 'tocca per copiare'}</small>
            </button>
            <div className="lobby-players">
              <div className="lobby-player">
                <span className="seat-label">Ospite</span>
                <strong>{room.host_name}</strong>
                <small>pronto</small>
              </div>
              <div className={cx('lobby-player', !room.guest_name && 'is-empty')}>
                <span className="seat-label">Avversario</span>
                <strong>{room.guest_name ?? 'In attesa…'}</strong>
                <small>{room.guest_name ? 'collegato' : 'condividi il codice'}</small>
              </div>
            </div>
            {viewerSeat === 'host' ? (
              <button
                type="button"
                className="btn primary wide"
                disabled={!room.guest_name || busy}
                onClick={onStart}
              >
                {busy ? 'Distribuisco…' : room.guest_name ? 'Inizia la partita' : 'Attendi un avversario'}
              </button>
            ) : (
              <p className="lobby-wait">In attesa che chi ha creato la stanza inizi la partita…</p>
            )}
            <div className="lobby-actions">
              <button type="button" className="btn" onClick={copyCode}>
                {copied ? 'Link copiato' : 'Copia invito'}
              </button>
              <button type="button" className="btn ghost" onClick={onRefresh}>Aggiorna</button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="lobby-note">
              Il codice scade quando la stanza viene chiusa. Le carte vengono distribuite dal server.
            </p>
          </section>
          <aside className="lobby-aside">
            <div className="server-status"><i /> {status}</div>
            <h2>Come funziona</h2>
            <ol>
              <li>Condividi il codice con chi vuoi sfidare.</li>
              <li>Quando entra, chi ha creato la stanza avvia la partita.</li>
              <li>Ogni giocatore vede solo la propria mano.</li>
              <li>Se qualcuno esce, l’altro vince la partita.</li>
            </ol>
            <p className="muted small">Nessun account richiesto: Supabase crea una sessione anonima sul dispositivo.</p>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="play-screen online-play">
      <Header
        compact
        onHome={onLeave}
        status={`Online · ${room.code}`}
        right={<button type="button" className="btn ghost small" onClick={onLeave}>Esci</button>}
      />
      <GameTable
        viewerSeat={viewerSeat}
        hostName={room.host_name}
        guestName={room.guest_name ?? 'Avversario'}
        hand={hand}
        handCounts={publicState.handCounts ?? { host: 0, guest: 0 }}
        table={publicState.table ?? {}}
        trump={publicState.trump}
        deckCount={publicState.deckCount}
        scores={publicState.scores}
        turn={publicState.turn}
        phase={publicState.phase}
        winner={publicState.winner}
        lastTrick={publicState.lastTrick}
        log={publicState.log ?? []}
        onPlay={onPlay}
        busy={busy}
        onLeave={onLeave}
        modeLabel={`Stanza ${room.code}`}
      >
        <div className="aside-card online-aside">
          <div className="aside-title"><span>Connessione</span></div>
          <div className="server-status"><i /> {status}</div>
          <p>{publicState.message || 'La partita è sincronizzata in tempo reale.'}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="btn ghost small" onClick={onRefresh}>Ricarica stato</button>
        </div>
      </GameTable>
    </main>
  );
}
