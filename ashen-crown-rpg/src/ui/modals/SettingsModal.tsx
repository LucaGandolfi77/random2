import { useGameStore } from '@/core/gameStore';
import { ModalShell } from './ModalShell';
import { SettingsFields } from '@/ui/settings/SettingsFields';

export function SettingsModal() {
  const closeModal = useGameStore((state) => state.closeModal);
  const openModal = useGameStore((state) => state.openModal);
  const goToMenu = useGameStore((state) => state.goToMenu);
  const game = useGameStore((state) => state.game);
  const autosave = useGameStore((state) => state.autosave);

  return (
    <ModalShell title="Settings" kicker="The Shape of the Experience" onClose={closeModal} size="md">
      <SettingsFields />
      <div className="settings-actions">
        <button className="btn btn-outline" onClick={() => openModal('save')}>
          Save chronicle
        </button>
        <button className="btn btn-outline" onClick={() => openModal('load')}>
          Load chronicle
        </button>
        <button
          className="btn btn-outline"
          onClick={() => {
            autosave();
          }}
          disabled={!game}
        >
          Quick autosave
        </button>
        <button className="btn btn-outline" onClick={() => openModal('help')}>
          How to play
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm('Return to the main menu? Unsaved progress since the last autosave will be lost.')) {
              goToMenu();
            }
          }}
        >
          Return to main menu
        </button>
      </div>
      <div className="settings-meta">
        <span>Ashen Crown v0.1.0</span>
        <span>Chapter One · The Crown of Cinders</span>
        <span>Local saves · Offline-ready</span>
      </div>
    </ModalShell>
  );
}
