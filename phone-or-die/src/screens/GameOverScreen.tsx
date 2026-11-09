import { useEffect, useState } from 'react';
import { useGameStore } from '@/core/gameStore';
import { formatNightTime } from '@/systems/clock';
import { formatPlayTime } from '@/utils';
import { SaveList } from '@/ui/SaveList';
import { ModalShell } from '@/ui/ModalShell';

export function GameOverScreen() {
  const game = useGameStore((state) => state.game);
  const saves = useGameStore((state) => state.saves);
  const refreshSaves = useGameStore((state) => state.refreshSaves);
  const newGameAgain = useGameStore((state) => state.newGameAgain);
  const loadFromSlot = useGameStore((state) => state.loadFromSlot);
  const goToMenu = useGameStore((state) => state.goToMenu);
  const [showLoad, setShowLoad] = useState(false);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  if (!game) return null;
  const latest = [...saves].sort((a, b) => b.savedAt - a.savedAt)[0];

  return (
    <main className="gameover-screen">
      <div className="gameover-glow" />
      <div className="gameover-hands" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="gameover-vignette" />
      <section className="gameover-card">
        <p className="eyebrow">The line goes dead</p>
        <h1>GAME OVER</h1>
        <h2>They found you.</h2>
        <p className="gameover-text">
          The road reaches you before the porch does. Your phone slips out of your hand and keeps glowing on the wet pavement,
          still connected to a voice that is already forgetting your name.
        </p>
        <div className="gameover-stats">
          <div><span>Time</span><strong>{formatNightTime(game.nightMinute)}</strong></div>
          <div><span>Chapter</span><strong>{game.chapter + 1} / 6</strong></div>
          <div><span>Calls made</span><strong>{game.stats.callsMade}</strong></div>
          <div><span>Clues found</span><strong>{game.stats.cluesFound}</strong></div>
          <div><span>Play time</span><strong>{formatPlayTime(game.playTime)}</strong></div>
        </div>
        <p className="gameover-warning">Do not answer the last call. You were not ready for the road.</p>
        <div className="gameover-actions">
          <button className="menu-button primary" onClick={newGameAgain}>
            <span className="menu-button-index">01</span>
            <span><strong>Try Again</strong><small>Wake up at the copy shop</small></span>
            <span className="menu-button-arrow">→</span>
          </button>
          {latest && (
            <button className="menu-button" onClick={() => void loadFromSlot(latest.slot)}>
              <span className="menu-button-index">02</span>
              <span><strong>Load Night</strong><small>{latest.timeLabel} · Chapter {latest.chapter + 1}</small></span>
              <span className="menu-button-arrow">→</span>
            </button>
          )}
          <button className="menu-button quiet" onClick={() => setShowLoad(true)}>
            <span className="menu-button-index">03</span>
            <span><strong>Choose Save</strong><small>Open the archive</small></span>
          </button>
          <button className="menu-button quiet" onClick={goToMenu}>
            <span className="menu-button-index">04</span>
            <span><strong>Main Menu</strong><small>Walk away</small></span>
          </button>
        </div>
      </section>
      {showLoad && (
        <ModalShell title="Load Night" kicker="The archive" onClose={() => setShowLoad(false)} size="lg">
          <SaveList mode="load" onDone={() => setShowLoad(false)} />
        </ModalShell>
      )}
    </main>
  );
}
