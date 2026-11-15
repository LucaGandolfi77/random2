import { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Icon } from './Icons';
import { Modal } from './Common';

export function SettingsSheet() {
  const open = useGameStore((state) => state.settingsOpen);
  const close = useGameStore((state) => state.closeSettings);
  const settings = useGameStore((state) => state.settings);
  const setSound = useGameStore((state) => state.setSound);
  const openOnboarding = useGameStore((state) => state.openOnboarding);
  const exportText = useGameStore((state) => state.exportText);
  const importText = useGameStore((state) => state.importText);
  const resetGame = useGameStore((state) => state.resetGame);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !isStandalone;

  const download = () => {
    const blob = new Blob([exportText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `last-ember-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      importText(text);
    } catch {
      // The store reports a readable error toast.
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetGame();
    setConfirmReset(false);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirmReset(false);
        close();
      }}
      title="Settings"
      subtitle="Last Ember stays on this device. No account, no tracker, no server."
      variant="sheet"
    >
      <div className="settings-group">
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-icon"><Icon name="volume" size={16} /></span>
            <span>
              <b>Sound</b>
              <small>Wind, fire and interface cues</small>
            </span>
          </div>
          <button
            type="button"
            className={`switch-button ${settings.sound ? 'is-on' : ''}`}
            role="switch"
            aria-checked={settings.sound}
            aria-label="Sound effects"
            onClick={() => setSound(!settings.sound)}
          >
            <span />
          </button>
        </div>

        <button type="button" className="settings-row is-button" onClick={openOnboarding}>
          <div className="settings-label">
            <span className="settings-icon"><Icon name="book" size={16} /></span>
            <span>
              <b>Field manual</b>
              <small>Read the three rules of the settlement again</small>
            </span>
          </div>
          <Icon name="chevronRight" size={15} className="text-frost-400/60" />
        </button>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Settlement record</div>
        <div className="settings-action-grid">
          <button type="button" className="settings-action" onClick={download}>
            <Icon name="download" size={17} />
            <span>
              <b>Export save</b>
              <small>Download a JSON backup</small>
            </span>
          </button>
          <button type="button" className="settings-action" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={17} />
            <span>
              <b>Import save</b>
              <small>Restore a previous settlement</small>
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Import settlement save"
            className="sr-only"
            onChange={(event) => void handleImport(event.target.files?.[0])}
          />
        </div>
        <button
          type="button"
          className={`settings-danger ${confirmReset ? 'is-confirmed' : ''}`}
          onClick={handleReset}
        >
          <Icon name={confirmReset ? 'alert' : 'reset'} size={16} />
          <span>
            <b>{confirmReset ? 'Tap again to burn it all down' : 'Reset settlement'}</b>
            <small>{confirmReset ? 'This cannot be undone.' : 'Delete this save and begin again'}</small>
          </span>
        </button>
        {confirmReset && (
          <button type="button" className="text-button mt-2" onClick={() => setConfirmReset(false)}>
            Keep my settlement
          </button>
        )}
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Install</div>
        <div className="install-note">
          <Icon name="install" size={18} />
          <p>
            {isStandalone
              ? 'This settlement is already installed. It works offline from the home screen.'
              : isIOS
                ? 'On iPhone or iPad: tap Share, then Add to Home Screen. The game will work offline after the first load.'
                : 'Use your browser menu or address-bar install control to add Last Ember to your home screen. It works offline after the first load.'}
          </p>
        </div>
      </div>

      <div className="about-block">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="flame" size={15} strokeWidth={2} />
            <Icon name="snow" size={10} strokeWidth={1.5} />
          </span>
          <span className="brand-name">
            <span>LAST EMBER</span>
            <small>WHITEOUT SURVIVAL</small>
          </span>
        </div>
        <p>
          An original, offline-first settlement survival game inspired by Whiteout Survival. Every
          building, snowflake and crackle is drawn or synthesized in the browser.
        </p>
        <span className="version-stamp">BUILD 1.0 · CANVAS 2D · WEB AUDIO</span>
      </div>
    </Modal>
  );
}
