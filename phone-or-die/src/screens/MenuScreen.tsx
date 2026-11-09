import { useEffect, useState } from 'react';
import { useGameStore } from '@/core/gameStore';
import type { Difficulty } from '@/core/types';
import { credits } from '@/data/chapters';
import { formatDate, formatPlayTime, cx } from '@/utils';
import { SaveList } from '@/ui/SaveList';
import { ModalShell } from '@/ui/ModalShell';
import { SettingsForm } from '@/ui/SettingsForm';
import { GameGuide } from '@/ui/GameGuide';

type Panel = 'main' | 'difficulty' | 'load' | 'settings' | 'help' | 'credits';

const DIFFICULTIES: { id: Difficulty; title: string; tag: string; text: string }[] = [
  {
    id: 'story',
    title: 'Story',
    tag: 'Breathe',
    text: 'Shadows move slower and calls hold longer. Fewer steps before you need help, but the road still remembers everything.'
  },
  {
    id: 'normal',
    title: 'Normal',
    tag: 'Keep talking',
    text: 'Every step feeds them. Call often, use the streetlights, and make the battery last. The intended, demanding experience.'
  },
  {
    id: 'nightmare',
    title: 'Nightmare',
    tag: 'No signal',
    text: 'Every step is a risk. Missed calls bring them closer. The lights fail sooner. A dead battery is a death sentence.'
  }
];

function MenuAtmosphere() {
  return (
    <div className="menu-atmosphere" aria-hidden="true">
      <div className="menu-sky" />
      <div className="menu-house">
        <svg viewBox="0 0 1000 430" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="house-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#171417" />
              <stop offset="100%" stopColor="#070708" />
            </linearGradient>
            <radialGradient id="window-warm" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#dc9f5b" stopOpacity="0.62" />
              <stop offset="100%" stopColor="#5c3220" stopOpacity="0.05" />
            </radialGradient>
          </defs>
          <path d="M0 430V365l120-20 70-160 65 24 80-130 95 80 70-100 85 140 80-60 80 120 95-30 160 30v171z" fill="url(#house-dark)" />
          <path d="M250 300h500V180l-150-90-150 70-100-60-100 80z" fill="#0b0a0c" stroke="#282226" strokeWidth="1.5" />
          <rect x="310" y="195" width="72" height="88" fill="#121013" stroke="#2e2629" />
          <rect x="412" y="170" width="98" height="130" fill="#0c0b0d" stroke="#2e2629" />
          <rect x="548" y="205" width="82" height="94" fill="#121013" stroke="#2e2629" />
          <rect x="325" y="215" width="42" height="48" fill="#a36d3f" opacity="0.18" />
          <rect x="443" y="200" width="38" height="54" fill="#d09b62" opacity="0.27" />
          <rect x="564" y="228" width="48" height="43" fill="#b57d4a" opacity="0.14" />
          <circle cx="612" cy="264" r="34" fill="url(#window-warm)" />
          <path d="M700 430l-20-170h20l15 80 30-90h18l-10 120 45-40 12 12-50 88z" fill="#060607" />
          <g fill="#0a090b">
            <path d="M165 395l8-95 10 1 4 94z" />
            <path d="M865 390l10-125 9 1 4 124z" />
          </g>
          <circle cx="238" cy="182" r="2" fill="#dca363" opacity="0.7" />
          <circle cx="804" cy="270" r="1.5" fill="#dca363" opacity="0.5" />
        </svg>
      </div>
      <div className="menu-rain" />
      <div className="menu-glow" />
      <div className="menu-embers">
        {Array.from({ length: 18 }, (_, index) => (
          <i
            key={index}
            style={{
              left: `${(index * 43) % 100}%`,
              animationDelay: `${(index * 0.87) % 8}s`,
              animationDuration: `${9 + (index % 6)}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function MenuScreen() {
  const [panel, setPanel] = useState<Panel>('main');
  const [leaving, setLeaving] = useState(false);
  const saves = useGameStore((state) => state.saves);
  const refreshSaves = useGameStore((state) => state.refreshSaves);
  const loadFromSlot = useGameStore((state) => state.loadFromSlot);
  const newGame = useGameStore((state) => state.newGame);
  const latest = [...saves].sort((a, b) => b.savedAt - a.savedAt)[0];

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  const begin = (difficulty: Difficulty) => {
    setLeaving(true);
    window.setTimeout(() => {
      newGame(difficulty);
      setLeaving(false);
    }, 240);
  };

  return (
    <main className={cx('menu-screen', leaving && 'is-leaving')}>
      <MenuAtmosphere />
      <header className="menu-header">
        <div className="menu-brand">
          <span className="brand-mark">◉</span>
          <span>PHONE OR DIE</span>
        </div>
        <div className="menu-header-right">
          <span className="menu-category">A psychological horror</span>
          <button className="icon-button" onClick={() => setPanel('credits')} aria-label="Credits">
            i
          </button>
        </div>
      </header>

      <section className="menu-content">
        <div className="menu-copy">
          <p className="eyebrow">Do not hang up</p>
          <h1 className="menu-title">
            <span>PHONE</span>
            <span className="title-or">OR</span>
            <span className="title-die">DIE</span>
          </h1>
          <p className="menu-tagline">
            A young woman. An empty road. Something behind her that only moves when the line goes quiet.
          </p>
          <p className="menu-premise">
            Every step brings them closer. Get home before 6:00 AM.
          </p>
          <div className="menu-warning">
            <span>CONTENT NOTE</span> Psychological horror, isolation, disappearance, and implied violence.
            Headphones recommended.
          </div>
        </div>

        <div className="menu-panel-wrap">
          {panel === 'main' && (
            <div className="menu-panel">
              <div className="menu-panel-top">
                <span className="menu-panel-line" />
                <span className="menu-panel-sigil">☎</span>
                <span className="menu-panel-line" />
              </div>
              <button className="menu-button primary" onClick={() => setPanel('difficulty')}>
                <span className="menu-button-index">01</span>
                <span>
                  <strong>New Night</strong>
                  <small>Start a new story</small>
                </span>
                <span className="menu-button-arrow">→</span>
              </button>
              <button
                className="menu-button"
                disabled={!latest}
                onClick={() => {
                  if (latest) void loadFromSlot(latest.slot);
                }}
              >
                <span className="menu-button-index">02</span>
                <span>
                  <strong>Continue</strong>
                  <small>{latest ? `${latest.timeLabel} · Chapter ${latest.chapter + 1}` : 'No saved night'}</small>
                </span>
                <span className="menu-button-arrow">→</span>
              </button>
              <button className="menu-button" onClick={() => setPanel('load')}>
                <span className="menu-button-index">03</span>
                <span>
                  <strong>Load Night</strong>
                  <small>{saves.length ? `${saves.length} save${saves.length === 1 ? '' : 's'}` : 'Empty archive'}</small>
                </span>
                <span className="menu-button-arrow">→</span>
              </button>
              <button className="menu-button quiet" onClick={() => setPanel('settings')}>
                <span className="menu-button-index">04</span>
                <span>
                  <strong>Settings</strong>
                  <small>Audio, display, accessibility</small>
                </span>
              </button>
              <button className="menu-button quiet" onClick={() => setPanel('help')}>
                <span className="menu-button-index">05</span>
                <span>
                  <strong>How to Play</strong>
                  <small>Controls and survival rules</small>
                </span>
              </button>
              <button className="menu-button quiet" onClick={() => setPanel('credits')}>
                <span className="menu-button-index">06</span>
                <span>
                  <strong>Credits</strong>
                  <small>Who kept the line open</small>
                </span>
              </button>
              {latest && (
                <div className="menu-last-save">
                  Last call · {formatDate(latest.savedAt)} · {formatPlayTime(latest.playTime)}
                </div>
              )}
            </div>
          )}

          {panel === 'difficulty' && (
            <div className="menu-panel difficulty-panel">
              <div className="menu-panel-head">
                <button className="text-button" onClick={() => setPanel('main')}>
                  ← Back
                </button>
                <span className="eyebrow">Choose how the night treats you</span>
              </div>
              <h2>Answering the Call</h2>
              <p className="difficulty-lead">Difficulty changes more than numbers. The road listens differently.</p>
              <div className="difficulty-list">
                {DIFFICULTIES.map((entry) => (
                  <button key={entry.id} className="difficulty-card" onClick={() => begin(entry.id)}>
                    <span className="difficulty-tag">{entry.tag}</span>
                    <strong>{entry.title}</strong>
                    <p>{entry.text}</p>
                    <span className="difficulty-cta">Begin →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {panel === 'load' && (
            <div className="menu-panel wide">
              <div className="menu-panel-head">
                <button className="text-button" onClick={() => setPanel('main')}>
                  ← Back
                </button>
                <span className="eyebrow">Saved nights</span>
              </div>
              <SaveList mode="load" compact onDone={() => setPanel('main')} />
            </div>
          )}

          {panel === 'settings' && (
            <div className="menu-panel wide">
              <div className="menu-panel-head">
                <button className="text-button" onClick={() => setPanel('main')}>
                  ← Back
                </button>
                <span className="eyebrow">Settings</span>
              </div>
              <SettingsForm />
            </div>
          )}
        </div>
      </section>

      <footer className="menu-footer">
        <span>Original psychological horror · One road · One night</span>
        <span className="menu-footer-center">A game about what answers when you walk home alone.</span>
        <span>v1.0 · Offline-ready</span>
      </footer>

      {panel === 'help' && (
        <ModalShell title="How to Play" kicker="The road does not explain itself" onClose={() => setPanel('main')} size="lg">
          <GameGuide />
        </ModalShell>
      )}

      {panel === 'credits' && (
        <ModalShell title="Credits" kicker="Who kept the line open" onClose={() => setPanel('main')} size="sm">
          <div className="credits-list">
            {credits.map((entry) => (
              <div key={entry.role}>
                <span>{entry.role}</span>
                <strong>{entry.name}</strong>
              </div>
            ))}
          </div>
          <p className="credits-note">All art, dialogue, sound, and systems are original to this game.</p>
        </ModalShell>
      )}
    </main>
  );
}
