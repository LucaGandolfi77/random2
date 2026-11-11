import { useRef, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { usePrefs } from '@/app/prefs';
import { Button, Card, ConfirmDialog, Pill, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { InstallButton } from '@/pwa/PwaBanners';
import { exportSaveString } from '@/storage/db';

const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
  <button type="button" className={`toggle ${on ? 'is-on' : ''}`.trim()} aria-pressed={on} aria-label={label} onClick={onClick} />
);

export const SettingsScreen = () => {
  const prefs = usePrefs();
  const save = useGameStore((state) => state.save);
  const importGame = useGameStore((state) => state.importGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const replayTutorial = useGameStore((state) => state.replayTutorial);
  const persistNow = useGameStore((state) => state.persistNow);
  const pushToast = useGameStore((state) => state.pushToast);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadBackup = () => {
    const text = exportSaveString(save);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nori-nook-save-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    pushToast({ title: 'Backup ready', message: 'Your little save is downloading.', tone: 'cozy', icon: 'download' });
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      await importGame(text);
      await persistNow();
      navigate('/');
    } catch (error) {
      pushToast({
        title: 'Could not restore backup',
        message: error instanceof Error ? error.message : 'The file does not look like a Nori Nook save.',
        tone: 'pink',
        icon: 'warning',
      });
    }
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Preferences</span>
          <h1>Settings</h1>
          <p>Sound, comfort, saves and installation.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="matcha" icon="save">Local save</Pill>
        </div>
      </div>

      <SectionHead title="Sound" subtitle="Music and effects are generated in your browser" icon="music" />
      <div className="settings-group">
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Music</strong>
            <span>Cozy, generative lo-fi loops</span>
          </div>
          <Toggle on={prefs.musicEnabled} label="Toggle music" onClick={() => prefs.setMusicEnabled(!prefs.musicEnabled)} />
        </div>
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Music volume</strong>
            <span>{Math.round(prefs.musicVolume * 100)}%</span>
          </div>
          <div className="slider-row" style={{ width: 150 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.musicVolume}
              aria-label="Music volume"
              onChange={(event) => prefs.setMusicVolume(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Sound effects</strong>
            <span>Knives, rice, coins and little chimes</span>
          </div>
          <Toggle on={prefs.sfxEnabled} label="Toggle sound effects" onClick={() => prefs.setSfxEnabled(!prefs.sfxEnabled)} />
        </div>
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Effects volume</strong>
            <span>{Math.round(prefs.sfxVolume * 100)}%</span>
          </div>
          <div className="slider-row" style={{ width: 150 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.sfxVolume}
              aria-label="Effects volume"
              onChange={(event) => prefs.setSfxVolume(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Master volume</strong>
            <span>{Math.round(prefs.masterVolume * 100)}%</span>
          </div>
          <div className="slider-row" style={{ width: 150 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.masterVolume}
              aria-label="Master volume"
              onChange={(event) => prefs.setMasterVolume(Number(event.target.value))}
            />
          </div>
        </div>
      </div>

      <SectionHead title="Comfort & accessibility" subtitle="Cook at your own pace" icon="heart" />
      <div className="settings-group">
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Reduce motion</strong>
            <span>Shorten decorative animations and particles</span>
          </div>
          <Toggle on={prefs.reducedMotion} label="Reduce motion" onClick={() => prefs.setReducedMotion(!prefs.reducedMotion)} />
        </div>
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Relaxed mini-games</strong>
            <span>Remove timing pressure and widen precision windows</span>
          </div>
          <Toggle on={prefs.noTimer} label="Relaxed mini-games" onClick={() => prefs.setNoTimer(!prefs.noTimer)} />
        </div>
        <div className="setting-row">
          <div className="setting-row__copy">
            <strong>Haptics</strong>
            <span>Gentle vibration on supported devices</span>
          </div>
          <Toggle on={prefs.haptics} label="Haptics" onClick={() => prefs.setHaptics(!prefs.haptics)} />
        </div>
      </div>

      <SectionHead title="Install & offline" subtitle="A little app for your home screen" icon="install" />
      <Card className="restaurant-sheet">
        <div className="row row--between">
          <div>
            <strong style={{ fontSize: 13 }}>Nori Nook PWA</strong>
            <p className="muted small">After the first load, the whole game works without a connection.</p>
          </div>
          <Pill tone="matcha" icon="wifi">Offline ready</Pill>
        </div>
        <InstallButton />
      </Card>

      <SectionHead title="Your save" subtitle="Stored locally in IndexedDB" icon="save" />
      <Card className="restaurant-sheet">
        <div className="row row--between">
          <div>
            <strong style={{ fontSize: 13 }}>Local save</strong>
            <p className="muted small">
              Autosave is always on. Export a JSON backup before changing devices. Cloud sync is a future optional adapter
              and is not required to play.
            </p>
          </div>
          <Pill tone="gold" icon="save">v{save.version}</Pill>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button size="sm" variant="soft" icon="download" onClick={downloadBackup}>
            Export backup
          </Button>
          <Button size="sm" variant="ghost" icon="upload" onClick={() => fileRef.current?.click()}>
            Import backup
          </Button>
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => void persistNow()}>
            Save now
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
        <p className="muted tiny">
          Save schema v{save.version} · created {new Date(save.createdAt).toLocaleDateString()} · exported files are validated
          before import.
        </p>
      </Card>

      <SectionHead title="Help & about" subtitle="Tutorials and the little details" icon="info" />
      <div className="settings-group">
        <button
          type="button"
          className="setting-row"
          style={{ border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
          onClick={() => {
            replayTutorial();
            navigate('/');
          }}
        >
          <span className="tutorial-step__icon"><Icon name="info" size={18} /></span>
          <span className="setting-row__copy">
            <strong>Replay tutorial</strong>
            <span>Three gentle steps, skippable at any time</span>
          </span>
          <Icon name="arrowRight" size={16} />
        </button>
        <div className="setting-row">
          <span className="tutorial-step__icon"><Icon name="leaf" size={18} /></span>
          <div className="setting-row__copy">
            <strong>Controls</strong>
            <span>Tap or drag ingredients, swipe in mini-games, use keyboard for menus. Every control also works with touch.</span>
          </div>
        </div>
        <div className="setting-row">
          <span className="tutorial-step__icon"><Icon name="heart" size={18} /></span>
          <div className="setting-row__copy">
            <strong>Nori Nook v1.0</strong>
            <span>Made as a cozy offline game. No ads, no purchases, no energy systems.</span>
          </div>
        </div>
      </div>

      <SectionHead title="Reset" subtitle="Start a fresh little nook" icon="warning" />
      <Card variant="soft">
        <div className="row row--between">
          <p className="muted small settings-danger">
            This permanently deletes your local progress, gallery and achievements. Export a backup first.
          </p>
          <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirmReset(true)}>
            Reset
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Start a new little nook?"
        message="All recipes, coins, decorations and photos in this browser will be deleted. This cannot be undone."
        confirmLabel="Reset everything"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void resetGame().then(() => navigate('/'));
        }}
      />
    </div>
  );
};
