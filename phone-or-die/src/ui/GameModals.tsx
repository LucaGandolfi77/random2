import { useGameStore } from '@/core/gameStore';
import { credits } from '@/data/chapters';
import { formatNightTime } from '@/systems/clock';
import { ModalShell } from '@/ui/ModalShell';
import { GameGuide } from '@/ui/GameGuide';
import { SettingsForm } from '@/ui/SettingsForm';
import { SaveList } from '@/ui/SaveList';

export function GameModals() {
  const modal = useGameStore((state) => state.modal);
  const game = useGameStore((state) => state.game);
  const close = useGameStore((state) => state.closeModal);
  const openModal = useGameStore((state) => state.openModal);
  const goToMenu = useGameStore((state) => state.goToMenu);
  const autosave = useGameStore((state) => state.autosave);
  if (!modal || !game) return null;

  if (modal === 'pause') {
    return (
      <ModalShell title="Paused" kicker={formatNightTime(game.nightMinute)} onClose={close} size="sm">
        <div className="pause-panel">
          <button className="menu-button primary" onClick={close}>
            <span className="menu-button-index">01</span>
            <span><strong>Resume</strong><small>The line is still open</small></span>
          </button>
          <button className="menu-button" onClick={() => openModal('settings')}>
            <span className="menu-button-index">02</span>
            <span><strong>Settings</strong><small>Audio and accessibility</small></span>
          </button>
          <button className="menu-button" onClick={() => openModal('saves')}>
            <span className="menu-button-index">03</span>
            <span><strong>Save Night</strong><small>Write this moment down</small></span>
          </button>
          <button className="menu-button" onClick={() => openModal('load')}>
            <span className="menu-button-index">04</span>
            <span><strong>Load Night</strong><small>Return to an earlier page</small></span>
          </button>
          <button className="menu-button" onClick={() => openModal('help')}>
            <span className="menu-button-index">05</span>
            <span><strong>How to Play</strong><small>Controls and survival rules</small></span>
          </button>
          <button
            className="menu-button quiet"
            onClick={() => {
              if (window.confirm('Return to the main menu? Unsaved progress may be lost.')) {
                autosave();
                goToMenu();
              }
            }}
          >
            <span className="menu-button-index">06</span>
            <span><strong>Main Menu</strong><small>Abandon the night</small></span>
          </button>
        </div>
        <p className="pause-note">The road is paused while this menu is open. It does not forget.</p>
      </ModalShell>
    );
  }

  if (modal === 'settings') {
    return (
      <ModalShell title="Settings" kicker="Audio and accessibility" onClose={close} size="md">
        <SettingsForm />
        <div className="modal-actions">
          <button className="phone-action" onClick={close}>Done</button>
        </div>
      </ModalShell>
    );
  }

  if (modal === 'saves') {
    return (
      <ModalShell title="Save Night" kicker="Choose a page" onClose={close} size="lg">
        <SaveList mode="save" onDone={close} />
      </ModalShell>
    );
  }

  if (modal === 'load') {
    return (
      <ModalShell title="Load Night" kicker="Previously, in the dark" onClose={close} size="lg">
        <SaveList mode="load" onDone={close} />
      </ModalShell>
    );
  }

  if (modal === 'help') {
    return (
      <ModalShell title="How to Play" kicker="The road does not explain itself" onClose={close} size="lg">
        <GameGuide />
      </ModalShell>
    );
  }

  if (modal === 'credits') {
    return (
      <ModalShell title="Credits" kicker="Who kept the line open" onClose={close} size="sm">
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
    );
  }

  return null;
}
