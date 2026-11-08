import { useEffect, useRef, useState } from 'react';
import { FIGHTERS, getFighter } from '../data/fighters';
import { OnlineClient } from '../network/onlineClient';
import type { MatchSetup } from '../app/types';
import type { Profile } from '../utils/storage';
import { FighterCard, NeonButton, SectionTitle } from './ui';

export interface OnlineScreenProps {
  profile: Profile;
  client: OnlineClient;
  onBack: () => void;
  onStartMatch: (setup: MatchSetup, client: OnlineClient) => void;
}

export function OnlineScreen({ profile, client, onBack, onStartMatch }: OnlineScreenProps) {
  const [, setVersion] = useState(0);
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState(profile.name);
  const [fighter, setFighter] = useState(FIGHTERS[0].id);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);
  const onStartRef = useRef(onStartMatch);

  useEffect(() => {
    onStartRef.current = onStartMatch;
  }, [onStartMatch]);

  useEffect(() => {
    const unsubscribe = client.subscribe(() => setVersion((value) => value + 1));
    return unsubscribe;
  }, [client]);

  const room = client.room;
  const me = room ? room.players[room.you] : null;
  const rival = room ? room.players.find((player) => player.slot !== room.you) : null;

  useEffect(() => {
    if (!room || room.status !== 'playing') {
      startedRef.current = false;
      return;
    }
    if (startedRef.current || !client.snapshot) return;
    startedRef.current = true;
    const first = room.players.find((player) => player.slot === 0);
    const second = room.players.find((player) => player.slot === 1);
    if (!first || !second) return;
    onStartRef.current(
      {
        mode: 'online',
        playerFighter: first.fighter,
        opponentFighter: second.fighter,
        stageId: room.stageId,
        roundsToWin: 2,
        roundTime: 99,
        difficulty: 'normal',
        localVersus: false
      },
      client
    );
  }, [room, client, client.snapshot]);

  const connect = async () => {
    if (client.status === 'connected') return true;
    setBusy(true);
    try {
      await client.connect();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createRoom = async () => {
    if (!(await connect())) return;
    client.createRoom(name, fighter);
  };

  const joinRoom = async () => {
    if (!(await connect())) return;
    if (code.trim().length < 4) return;
    client.joinRoom(code, name, fighter);
  };

  const leaveRoom = () => {
    client.leave();
    startedRef.current = false;
    setCode('');
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const back = () => {
    if (room) leaveRoom();
    client.dispose();
    onBack();
  };

  return (
    <div className="screen online-screen">
      <div className="screen__topbar">
        <button type="button" className="back-button" onClick={back}>
          ← Indietro
        </button>
        <div className="screen__mode">ONLINE</div>
        <span className="screen__micro">
          {client.status === 'connected' ? 'server connesso' : 'server non connesso'}
        </span>
      </div>

      <SectionTitle
        eyebrow="MULTIPLAYER"
        title="SFIDA IL MONDO"
        subtitle="Il mondo, per ora, è chiunque abbia aperto questa pagina sullo stesso wifi."
      />

      {!room && (
        <div className="online-lobby">
          <div className="online-lobby__form">
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${tab === 'create' ? 'is-active' : ''}`}
                onClick={() => setTab('create')}
              >
                CREA STANZA
              </button>
              <button
                type="button"
                className={`chip ${tab === 'join' ? 'is-active' : ''}`}
                onClick={() => setTab('join')}
              >
                ENTRA CON CODICE
              </button>
            </div>

            <label className="online-field">
              <span>NOME DA COMBATTIMENTO</span>
              <input value={name} onChange={(event) => setName(event.target.value.toUpperCase())} maxLength={16} />
            </label>

            {tab === 'join' && (
              <label className="online-field">
                <span>CODICE STANZA</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 4))}
                  placeholder="ABCD"
                  maxLength={4}
                />
              </label>
            )}

            <div className="online-actions">
              {tab === 'create' ? (
                <NeonButton onClick={createRoom} disabled={busy}>
                  {busy ? 'CONNESSIONE…' : 'CREA STANZA'}
                </NeonButton>
              ) : (
                <NeonButton onClick={joinRoom} disabled={busy || code.trim().length < 4}>
                  {busy ? 'CONNESSIONE…' : 'ENTRA'}
                </NeonButton>
              )}
            </div>

            {client.error && <p className="online-error">{client.error}</p>}
            {client.status === 'connecting' && <p className="online-hint">Connessione al server…</p>}
            {client.status === 'closed' && !client.error && (
              <p className="online-hint">Server disconnesso. Riprova creando o entrando in una stanza.</p>
            )}
            <p className="online-hint">
              Avvia il server con <code>npm run dev</code> o <code>npm start</code>. Il client usa WebSocket su porta
              8787.
            </p>
          </div>

          <div className="online-roster">
            <span className="option-label">SCEGLI IL FIGHTER</span>
            <div className="online-roster__grid">
              {FIGHTERS.map((item) => (
                <FighterCard
                  key={item.id}
                  fighter={item}
                  selected={fighter === item.id}
                  onClick={() => setFighter(item.id)}
                  compact
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {room && (
        <div className="online-room">
          <div className="online-room__header">
            <span className="eyebrow">CODICE STANZA</span>
            <div className="online-code">
              <strong>{room.code}</strong>
              <button type="button" onClick={copyCode}>
                {copied ? 'COPIATO' : 'COPIA'}
              </button>
            </div>
            <p>Condividi il codice. Chi lo usa entra. Chi non lo usa guarda.</p>
          </div>

          <div className="online-players">
            {[0, 1].map((slot) => {
              const player = room.players.find((item) => item.slot === slot);
              if (!player) {
                return (
                  <div key={slot} className="online-player is-empty">
                    <span className="online-player__slot">P{slot + 1}</span>
                    <div>
                      <strong>IN ATTESA</strong>
                      <span>Nessun avversario</span>
                    </div>
                  </div>
                );
              }
              const fighterDef = getFighter(player.fighter);
              return (
                <div
                  key={slot}
                  className={`online-player ${player.slot === room.you ? 'is-you' : ''} ${
                    player.ready ? 'is-ready' : ''
                  }`}
                  style={{ '--player-accent': fighterDef.palette.accent } as React.CSSProperties}
                >
                  <span className="online-player__slot">P{slot + 1}</span>
                  <div>
                    <strong>{player.name}</strong>
                    <span>
                      {fighterDef.name}
                      {player.slot === room.you ? ' · TU' : ''}
                    </span>
                  </div>
                  <span className="online-player__ready">{player.ready ? 'PRONTO' : 'NON PRONTO'}</span>
                </div>
              );
            })}
          </div>

          <div className="online-room__status">
            {room.status === 'lobby' && (
              <>
                <p>{me?.ready ? 'In attesa che l’avversario confermi.' : 'Quando sei pronto, premi PRONTO.'}</p>
                <div className="online-room__actions">
                  <NeonButton onClick={() => client.setReady(!me?.ready)}>
                    {me?.ready ? 'ANNULLA PRONTEZZA' : 'PRONTO'}
                  </NeonButton>
                  <NeonButton variant="ghost" onClick={leaveRoom}>
                    LASCIA STANZA
                  </NeonButton>
                </div>
              </>
            )}

            {room.status === 'playing' && (
              <p className="online-hint">Match in corso. Ingresso nell’arena…</p>
            )}

            {room.status === 'ended' && client.end && (
              <>
                <p>
                  {client.end.summary.won ? 'Hai vinto il match online.' : 'Hai perso il match online.'} Rivincita?
                </p>
                <div className="online-room__actions">
                  <NeonButton
                    onClick={() => client.requestRematch()}
                    disabled={room.rematchVotes.includes(room.you)}
                  >
                    {room.rematchVotes.includes(room.you) ? 'IN ATTESA…' : 'RIVINCITA'}
                  </NeonButton>
                  <NeonButton variant="ghost" onClick={leaveRoom}>
                    LASCIA STANZA
                  </NeonButton>
                </div>
                {room.rematchVotes.length > 0 && (
                  <p className="online-hint">
                    Voti rivincita: {room.rematchVotes.length}/{room.players.length}
                  </p>
                )}
              </>
            )}
          </div>

          {rival && <p className="online-rival">Avversario: {getFighter(rival.fighter).name}</p>}
          {client.notice && <p className="online-hint">{client.notice}</p>}
          {client.error && <p className="online-error">{client.error}</p>}
        </div>
      )}
    </div>
  );
}
