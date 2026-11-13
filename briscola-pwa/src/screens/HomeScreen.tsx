import { useState } from 'react';
import { Header } from '@/components/Header';
import { formatCode } from '@/utils';

interface HomeScreenProps {
  nickname: string;
  onNickname: (value: string) => void;
  onlineConfigured: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  installAvailable: boolean;
  onInstall: () => void;
  onCpu: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onRules: () => void;
}

export function HomeScreen({
  nickname,
  onNickname,
  onlineConfigured,
  busy,
  error,
  notice,
  installAvailable,
  onInstall,
  onCpu,
  onCreateRoom,
  onJoinRoom,
  onRules
}: HomeScreenProps) {
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  return (
    <main className="home-screen">
      <Header
        right={
          installAvailable ? (
            <button type="button" className="btn ghost small" onClick={onInstall}>
              Installa app
            </button>
          ) : undefined
        }
      />

      <div className="home-grid">
        <section className="home-hero">
          <p className="eyebrow">La sfida italiana · 40 carte · 120 punti</p>
          <h1>
            <span>BRIS</span>
            <span>COLA</span>
          </h1>
          <p className="hero-tagline">
            Una stanza, un codice, due giocatori. La Briscola di sempre, con le carte gestite dal server.
          </p>
          <div className="hero-badges">
            <span className="badge">2 giocatori</span>
            <span className="badge">PWA</span>
            <span className="badge">online</span>
            <span className="badge">offline vs CPU</span>
          </div>
          <div className="hero-table" aria-hidden="true">
            <div className="hero-card back one" />
            <div className="hero-card back two" />
            <div className="hero-card face three">
              <span>A</span>
              <b>♦</b>
            </div>
            <div className="hero-card face four">
              <span>3</span>
              <b>♥</b>
            </div>
            <div className="hero-felt" />
            <p>“Chi prende, pesca.”</p>
          </div>
          <button type="button" className="text-link hero-rules" onClick={onRules}>
            Regole in trenta secondi →
          </button>
        </section>

        <section className="home-panel">
          <div className="panel-heading">
            <span className="eyebrow">Tavolo</span>
            <h2>Siediti a giocare</h2>
          </div>

          <label className="field">
            <span>Il tuo nome</span>
            <input
              value={nickname}
              onChange={(event) => onNickname(event.target.value)}
              maxLength={18}
              autoComplete="nickname"
              placeholder="Ospite"
            />
          </label>

          <button type="button" className="mode-card cpu-card" onClick={onCpu} disabled={busy}>
            <span className="mode-icon">♠</span>
            <span className="mode-copy">
              <strong>Gioca contro la CPU</strong>
              <small>Partita locale, anche senza connessione</small>
            </span>
            <span className="mode-arrow">→</span>
          </button>

          <div className="panel-divider"><span>online</span></div>

          {onlineConfigured ? (
            <div className="online-panel">
              <div className="server-status"><i /> server Supabase configurato</div>
              <div className="segmented">
                <button type="button" className={tab === 'create' ? 'is-active' : ''} onClick={() => setTab('create')}>
                  Crea stanza
                </button>
                <button type="button" className={tab === 'join' ? 'is-active' : ''} onClick={() => setTab('join')}>
                  Entra
                </button>
              </div>
              {tab === 'create' ? (
                <div className="join-row">
                  <button type="button" className="btn primary" onClick={onCreateRoom} disabled={busy}>
                    {busy ? 'Creo…' : 'Crea una stanza'}
                  </button>
                  <p className="field-hint">Riceverai un codice da condividere con l’avversario.</p>
                </div>
              ) : (
                <form
                  className="join-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (code.length === 5) onJoinRoom(code);
                  }}
                >
                  <label className="code-input">
                    <span>Codice stanza</span>
                    <input
                      value={code}
                      onChange={(event) => setCode(formatCode(event.target.value))}
                      maxLength={5}
                      placeholder="7K4PX"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={busy || code.length !== 5}>
                    {busy ? 'Entro…' : 'Entra nella stanza'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="setup-note">
              <strong>Online non ancora configurato</strong>
              <p>
                Questa build funziona in locale. Per attivare le stanze online crea un progetto Supabase,
                applica la migrazione e imposta <code>VITE_SUPABASE_URL</code> e
                {' '}<code>VITE_SUPABASE_ANON_KEY</code>.
              </p>
              <a className="text-link" href="https://github.com/LucaGandolfi77/random2/blob/main/briscola-pwa/docs/SUPABASE_GUIDE.md" target="_blank" rel="noreferrer">
                Istruzioni nel README →
              </a>
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
        </section>
      </div>

      <footer className="home-footer">
        <span>Briscola 1v1 · originale, senza asset esterni</span>
        <span>PWA installabile · gioco locale offline</span>
      </footer>
    </main>
  );
}
