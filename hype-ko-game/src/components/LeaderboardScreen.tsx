import { useEffect, useState } from 'react';
import { loadLeaderboard, type LeaderboardEntry } from '../utils/storage';
import { formatNumber, SectionTitle } from './ui';

export interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [tab, setTab] = useState<'local' | 'online'>('local');
  const [local] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [online, setOnline] = useState<LeaderboardEntry[] | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== 'online' || online !== null) return;
    let cancelled = false;
    fetch('/api/leaderboard')
      .then((response) => {
        if (!response.ok) throw new Error('server offline');
        return response.json() as Promise<{ entries: LeaderboardEntry[] }>;
      })
      .then((data) => {
        if (!cancelled) setOnline(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setOnlineError('Server online non raggiungibile. La classifica locale resta valida.');
      });
    return () => {
      cancelled = true;
    };
  }, [tab, online]);

  const entries = tab === 'local' ? local : (online ?? []);

  return (
    <div className="screen leaderboard-screen">
      <div className="screen__topbar">
        <button type="button" className="back-button" onClick={onBack}>
          ← Indietro
        </button>
        <div className="screen__mode">CLASSIFICA</div>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${tab === 'local' ? 'is-active' : ''}`}
            onClick={() => setTab('local')}
          >
            LOCALE
          </button>
          <button
            type="button"
            className={`chip ${tab === 'online' ? 'is-active' : ''}`}
            onClick={() => setTab('online')}
          >
            ONLINE
          </button>
        </div>
      </div>

      <SectionTitle
        eyebrow="HALL OF VIRALITY"
        title="CLASSIFICA"
        subtitle="Numeri che non significano niente ma fanno sentire meglio qualcuno."
      />

      {tab === 'online' && online === null && !onlineError && <p className="leaderboard-message">Caricamento…</p>}
      {tab === 'online' && onlineError && <p className="leaderboard-message">{onlineError}</p>}

      {entries.length === 0 ? (
        <div className="leaderboard-empty">
          <span>∅</span>
          <h3>NESSUN RECORD</h3>
          <p>{tab === 'local' ? 'Gioca un match per entrare nella classifica locale.' : 'Nessun dato dal server.'}</p>
        </div>
      ) : (
        <div className="leaderboard-table">
          <div className="leaderboard-row leaderboard-row--head">
            <span>#</span>
            <span>NOME</span>
            <span>SCORE</span>
            <span>WINS</span>
            <span>DATA</span>
          </div>
          {entries.map((entry, index) => (
            <div key={`${entry.name}-${entry.date}-${index}`} className={`leaderboard-row rank-${index + 1}`}>
              <span className="leaderboard-rank">{index + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
              <span>{formatNumber(entry.score)}</span>
              <span>{entry.wins}</span>
              <span>{new Date(entry.date).toLocaleDateString('it-IT')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
