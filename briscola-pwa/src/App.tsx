import { useCallback, useEffect, useRef, useState } from 'react';
import { HomeScreen } from '@/screens/HomeScreen';
import { LocalGameScreen } from '@/screens/LocalGameScreen';
import { OnlineRoomScreen } from '@/screens/OnlineRoomScreen';
import { RulesContent } from '@/components/RulesContent';
import {
  createRoom,
  ensureUser,
  joinRoom,
  leaveRoom as leaveOnlineRoom,
  loadRoom,
  onlineConfigured,
  playOnlineCard,
  startRoom,
  subscribeToRoom,
  type OnlineRoomSnapshot
} from '@/online/supabase';
import { formatCode, friendlyOnlineError, readNickname, saveNickname } from '@/utils';

type Screen = 'home' | 'local' | 'online';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ROOM_KEY = 'briscola-online-room';

const storedRoom = (): string | null => {
  try {
    return sessionStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
};

const rememberRoom = (roomId: string | null): void => {
  try {
    if (roomId) sessionStorage.setItem(ROOM_KEY, roomId);
    else sessionStorage.removeItem(ROOM_KEY);
  } catch {
    // Non-blocking.
  }
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [nickname, setNicknameState] = useState(readNickname);
  const [snapshot, setSnapshot] = useState<OnlineRoomSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState('Pronto');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(onlineConfigured && storedRoom()));
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const refreshLock = useRef(false);

  const setNickname = (value: string) => {
    setNicknameState(value);
    saveNickname(value);
  };

  const refreshOnline = useCallback(async (showErrors = true) => {
    if (!snapshot || refreshLock.current) return;
    refreshLock.current = true;
    try {
      const fresh = await loadRoom(snapshot.room.id);
      setSnapshot(fresh);
      setStatus('Sincronizzato');
      if (showErrors) setError(null);
    } catch (caught) {
      if (showErrors) setError(friendlyOnlineError(caught, 'Impossibile aggiornare la stanza.'));
      setStatus('Riconnessione…');
    } finally {
      refreshLock.current = false;
    }
  }, [snapshot]);

  useEffect(() => {
    if (!onlineConfigured) {
      setRestoring(false);
      return;
    }
    const roomId = storedRoom();
    if (!roomId) {
      setRestoring(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await ensureUser();
        const fresh = await loadRoom(roomId);
        if (cancelled) return;
        setSnapshot(fresh);
        setScreen('online');
        setStatus('Sincronizzato');
      } catch {
        rememberRoom(null);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen !== 'online' || !snapshot) return;
    const unsubscribe = subscribeToRoom(snapshot.room.id, () => {
      void refreshOnline();
    });
    // Realtime should be enough, but a slow poll keeps the room usable on
    // flaky mobile networks and on projects where the realtime publication is
    // misconfigured. It is turn-based, so a few seconds of latency is harmless.
    const poll = window.setInterval(() => {
      void refreshOnline(false);
    }, 7000);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [screen, snapshot?.room.id, refreshOnline]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  const startCpu = () => {
    saveNickname(nickname);
    setError(null);
    setScreen('local');
  };

  const handleCreate = async () => {
    if (!onlineConfigured) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const fresh = await createRoom(nickname);
      setSnapshot(fresh);
      rememberRoom(fresh.room.id);
      setScreen('online');
      setStatus('Stanza creata');
    } catch (caught) {
      setError(friendlyOnlineError(caught, 'Impossibile creare la stanza.'));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (code: string) => {
    if (!onlineConfigured) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const fresh = await joinRoom(formatCode(code), nickname);
      setSnapshot(fresh);
      rememberRoom(fresh.room.id);
      setScreen('online');
      setStatus('Entrato nella stanza');
    } catch (caught) {
      setError(friendlyOnlineError(caught, 'Impossibile entrare nella stanza.'));
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    try {
      const fresh = await startRoom(snapshot.room.id);
      setSnapshot(fresh);
      setStatus('Partita iniziata');
    } catch (caught) {
      setError(friendlyOnlineError(caught, 'Impossibile iniziare la partita.'));
    } finally {
      setBusy(false);
    }
  };

  const handlePlay = async (cardId: string) => {
    if (!snapshot || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fresh = await playOnlineCard(snapshot.room.id, cardId);
      setSnapshot(fresh);
      setStatus('Mossa inviata');
    } catch (caught) {
      setError(friendlyOnlineError(caught, 'Mossa non riuscita.'));
      await refreshOnline();
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    const current = snapshot;
    setSnapshot(null);
    rememberRoom(null);
    setScreen('home');
    setStatus('Pronto');
    setError(null);
    setBusy(false);
    if (current) {
      try {
        await leaveOnlineRoom(current.room.id);
      } catch {
        // Leaving the page is more important than a stale cleanup.
      }
    }
  };

  if (restoring) {
    return (
      <main className="boot-screen">
        <div className="boot-mark">B</div>
        <p className="eyebrow">Briscola online</p>
        <h1>Rientro nella stanza…</h1>
        <div className="boot-bar"><i /></div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <HomeScreen
          nickname={nickname}
          onNickname={setNickname}
          onlineConfigured={onlineConfigured}
          busy={busy}
          error={error}
          notice={notice}
          installAvailable={Boolean(installPrompt)}
          onInstall={() => void install()}
          onCpu={startCpu}
          onCreateRoom={() => void handleCreate()}
          onJoinRoom={(code) => void handleJoin(code)}
          onRules={() => setRulesOpen(true)}
        />
      )}

      {screen === 'local' && (
        <LocalGameScreen playerName={nickname.trim() || 'Ospite'} onHome={() => setScreen('home')} />
      )}

      {screen === 'online' && snapshot && (
        <OnlineRoomScreen
          snapshot={snapshot}
          busy={busy}
          error={error}
          status={status}
          onStart={() => void handleStart()}
          onPlay={(cardId) => void handlePlay(cardId)}
          onLeave={() => void handleLeave()}
          onRefresh={() => void refreshOnline()}
        />
      )}

      {screen === 'online' && !snapshot && (
        <main className="boot-screen">
          <p className="eyebrow">Briscola online</p>
          <h1>Stanza non disponibile</h1>
          <p>{error ?? 'La stanza è stata chiusa o non è più accessibile.'}</p>
          <button type="button" className="btn primary" onClick={() => void handleLeave()}>
            Torna alla home
          </button>
        </main>
      )}

      {rulesOpen && (
        <div className="modal-layer" role="presentation" onClick={() => setRulesOpen(false)}>
          <section
            className="rules-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Regole della Briscola"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <p className="eyebrow">Quaranta carte, centoventi punti</p>
                <h2>Come si gioca</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setRulesOpen(false)} aria-label="Chiudi">
                ×
              </button>
            </div>
            <RulesContent />
            <button type="button" className="btn primary wide" onClick={() => setRulesOpen(false)}>
              Ho capito
            </button>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
