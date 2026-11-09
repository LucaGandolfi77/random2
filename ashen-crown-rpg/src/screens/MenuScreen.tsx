import { useEffect, useState } from 'react';
import { useGameStore } from '@/core/gameStore';
import { CrownSigil, Eightsigil } from '@/ui/CrownSigil';
import { SaveList } from '@/ui/SaveList';
import { SettingsFields } from '@/ui/settings/SettingsFields';
import { HelpContent } from '@/ui/HelpContent';
import { cx, formatPlayTime } from '@/utils';

type Panel = 'main' | 'saves' | 'settings' | 'help';

export function MenuScreen() {
  const [panel, setPanel] = useState<Panel>('main');
  const [leaving, setLeaving] = useState(false);
  const screen = useGameStore((state) => state.screen);
  const setScreen = useGameStore((state) => state.setScreen);
  const saves = useGameStore((state) => state.saves);
  const refreshSaves = useGameStore((state) => state.refreshSaves);
  const loadFromSlot = useGameStore((state) => state.loadFromSlot);
  const notify = useGameStore((state) => state.notify);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  const latestSave = [...saves].sort((a, b) => b.timestamp - a.timestamp)[0];
  const hasSave = Boolean(latestSave);

  const begin = (target: 'creation') => {
    setLeaving(true);
    window.setTimeout(() => {
      setScreen(target);
      setLeaving(false);
    }, 220);
  };

  const continueGame = async () => {
    if (!latestSave) return;
    await loadFromSlot(latestSave.slot);
  };

  return (
    <main className={cx('menu-screen', leaving && 'menu-leaving')}>
      <div className="menu-atmosphere" aria-hidden="true">
        <div className="menu-sky" />
        <div className="menu-citadel">
          <svg viewBox="0 0 900 300" preserveAspectRatio="xMidYMax slice">
            <defs>
              <linearGradient id="citadel-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2b252a" />
                <stop offset="100%" stopColor="#09080a" />
              </linearGradient>
            </defs>
            <path d="M0 300V224h44v-18h34v-42h20v-30h24v-64l10-28 10 28v64h20v36h18v52h30v-26h32v-80h22v-46h22v46h24v80h40v-38h52v38h30v-96h18v-34h22v-68l9-24 9 24v68h22v34h18v96h26v-50h38v50h30v-58h44v58h28v-26h50v26h30v-44h34v44h48v76H0z" fill="url(#citadel-fade)" />
            <g fill="#d3aa64" opacity="0.4">
              <rect x="137" y="150" width="4" height="9" />
              <rect x="432" y="86" width="4" height="9" />
              <rect x="673" y="130" width="4" height="9" />
              <rect x="814" y="184" width="4" height="9" />
            </g>
            <g stroke="#09080a" strokeWidth="2" opacity="0.6">
              <path d="M0 262h900M0 282h900" />
            </g>
          </svg>
        </div>
        <div className="menu-fog menu-fog-a" />
        <div className="menu-fog menu-fog-b" />
        <div className="ember-field">
          {Array.from({ length: 26 }, (_, index) => (
            <span
              key={index}
              className="ember"
              style={{
                left: `${(index * 37) % 100}%`,
                animationDelay: `${(index * 0.73) % 9}s`,
                animationDuration: `${8 + (index % 7)}s`,
                width: `${1 + (index % 3)}px`,
                height: `${1 + (index % 3)}px`
              }}
            />
          ))}
        </div>
      </div>

      <header className="menu-header">
        <div className="menu-mark">
          <Eightsigil className="menu-eightsigil" />
          <span>Elarion · Ninth Age</span>
        </div>
        <div className="menu-header-right">
          <span className="menu-version">Chapter One</span>
          <button className="icon-btn" aria-label="Help" onClick={() => setPanel('help')}>
            ?
          </button>
        </div>
      </header>

      <section className="menu-hero">
        <div className="menu-hero-art">
          <CrownSigil className="menu-crown" glow />
          <div className="menu-title-block">
            <p className="menu-kicker">An original dark fantasy CRPG</p>
            <h1 className="menu-title">
              <span>Ashen</span>
              <span>Crown</span>
            </h1>
            <p className="menu-subtitle">A Tale of Elarion</p>
            <p className="menu-tagline">
              The Covenant is breaking. The Crown is waking. Every name you save will be a choice you cannot take back.
            </p>
          </div>
        </div>

        <div className="menu-panel-wrap">
          {panel === 'main' && (
            <div className="menu-panel">
              <div className="panel-ornament">
                <span />
                <Eightsigil className="panel-sigil" />
                <span />
              </div>
              <button className="menu-action menu-action-primary" onClick={() => begin('creation')}>
                <span className="menu-action-glyph">✦</span>
                <span>
                  <strong>New Chronicle</strong>
                  <small>Forge a soul and enter the Ashen Marches</small>
                </span>
              </button>
              <button className="menu-action" disabled={!hasSave} onClick={() => void continueGame()}>
                <span className="menu-action-glyph">▸</span>
                <span>
                  <strong>Continue</strong>
                  <small>
                    {latestSave
                      ? `${latestSave.name} · Level ${latestSave.level} · ${formatPlayTime(latestSave.playTime)}`
                      : 'No chronicle has been written yet'}
                  </small>
                </span>
              </button>
              <div className="menu-action-row">
                <button className="menu-action menu-action-small" onClick={() => setPanel('saves')}>
                  <span className="menu-action-glyph">▤</span>
                  <span>
                    <strong>Chronicles</strong>
                    <small>{saves.length ? `${saves.length} recorded` : 'Empty pages'}</small>
                  </span>
                </button>
                <button className="menu-action menu-action-small" onClick={() => setPanel('settings')}>
                  <span className="menu-action-glyph">◌</span>
                  <span>
                    <strong>Settings</strong>
                    <small>Sound &amp; comfort</small>
                  </span>
                </button>
              </div>
              <button className="menu-action menu-action-quiet" onClick={() => setPanel('help')}>
                <span className="menu-action-glyph">?</span>
                <span>
                  <strong>How to Play</strong>
                  <small>Controls, checks, and combat</small>
                </span>
              </button>
              <p className="menu-warning">
                Contains violence, grief, and themes of erasure. Autosaves before every battle.
              </p>
            </div>
          )}

          {panel === 'saves' && (
            <div className="menu-panel menu-panel-wide">
              <div className="menu-panel-head">
                <button className="text-btn" onClick={() => setPanel('main')}>
                  ← Back
                </button>
                <h2>Chronicles</h2>
              </div>
              <SaveList mode="load" onDone={() => setPanel('main')} compact />
            </div>
          )}

          {panel === 'settings' && (
            <div className="menu-panel">
              <div className="menu-panel-head">
                <button className="text-btn" onClick={() => setPanel('main')}>
                  ← Back
                </button>
                <h2>Settings</h2>
              </div>
              <SettingsFields />
            </div>
          )}

          {panel === 'help' && (
            <div className="menu-panel menu-panel-wide menu-help-panel">
              <div className="menu-panel-head">
                <button className="text-btn" onClick={() => setPanel('main')}>
                  ← Back
                </button>
                <h2>How to Play</h2>
              </div>
              <HelpContent />
            </div>
          )}
        </div>
      </section>

      <footer className="menu-footer">
        <span>Chapter One · The Crown of Cinders</span>
        <span className="menu-footer-quote">“Kneeling is how it finds you.”</span>
        <span className="menu-footer-meta">
          {screen === 'menu' ? 'Offline-ready · No account' : ''} <span className="dot-sep">·</span> v0.1.0
        </span>
      </footer>

      {!hasSave && (
        <button
          className="menu-whisper"
          onClick={() => notify('Start a New Chronicle to write the first page.', 'quest')}
        >
          <span className="whisper-line" />
          The book is open.
          <span className="whisper-line" />
        </button>
      )}
    </main>
  );
}
