import { useGameStore } from '@/core/gameStore';

export function SettingsForm() {
  const settings = useGameStore((state) => state.settings);
  const update = useGameStore((state) => state.updateSettings);

  return (
    <div className="settings-form">
      <div className="settings-group">
        <h3>Audio</h3>
        <label className="range-row">
          <span>Music</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(event) => update({ musicVolume: Number(event.target.value) })}
          />
          <em>{Math.round(settings.musicVolume * 100)}%</em>
        </label>
        <label className="range-row">
          <span>Sound effects</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.sfxVolume}
            onChange={(event) => update({ sfxVolume: Number(event.target.value) })}
          />
          <em>{Math.round(settings.sfxVolume * 100)}%</em>
        </label>
        <label className="toggle-row">
          <span>Mute everything</span>
          <input
            type="checkbox"
            checked={settings.muted}
            onChange={(event) => update({ muted: event.target.checked })}
          />
        </label>
      </div>

      <div className="settings-group">
        <h3>Display</h3>
        <label className="range-row">
          <span>Text size</span>
          <input
            type="range"
            min={0.9}
            max={1.3}
            step={0.05}
            value={settings.textSize}
            onChange={(event) => update({ textSize: Number(event.target.value) })}
          />
          <em>{Math.round(settings.textSize * 100)}%</em>
        </label>
        <label className="range-row">
          <span>Brightness</span>
          <input
            type="range"
            min={0.65}
            max={1.3}
            step={0.05}
            value={settings.brightness}
            onChange={(event) => update({ brightness: Number(event.target.value) })}
          />
          <em>{Math.round(settings.brightness * 100)}%</em>
        </label>
        <label className="toggle-row">
          <span>Reduced motion</span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => update({ reducedMotion: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span>High contrast</span>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(event) => update({ highContrast: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span>Show phone timers</span>
          <input
            type="checkbox"
            checked={settings.showTimers}
            onChange={(event) => update({ showTimers: event.target.checked })}
          />
        </label>
      </div>
    </div>
  );
}
