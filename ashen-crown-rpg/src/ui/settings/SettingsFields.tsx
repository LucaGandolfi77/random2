import { useGameStore } from '@/core/gameStore';

export function SettingsFields() {
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  return (
    <div className="settings-fields">
      <div className="settings-group">
        <div className="settings-group-title">Sound</div>
        <label className="range-row">
          <span>Music</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(event) => updateSettings({ musicVolume: Number(event.target.value) })}
          />
          <span className="range-value">{Math.round(settings.musicVolume * 100)}%</span>
        </label>
        <label className="range-row">
          <span>Effects</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.sfxVolume}
            onChange={(event) => updateSettings({ sfxVolume: Number(event.target.value) })}
          />
          <span className="range-value">{Math.round(settings.sfxVolume * 100)}%</span>
        </label>
        <label className="toggle-row">
          <span>Mute all sound</span>
          <input
            type="checkbox"
            checked={settings.muted}
            onChange={(event) => updateSettings({ muted: event.target.checked })}
          />
        </label>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Comfort</div>
        <label className="range-row">
          <span>Text size</span>
          <input
            type="range"
            min={0.9}
            max={1.25}
            step={0.05}
            value={settings.textScale}
            onChange={(event) => updateSettings({ textScale: Number(event.target.value) })}
          />
          <span className="range-value">{Math.round(settings.textScale * 100)}%</span>
        </label>
        <label className="toggle-row">
          <span>Reduce motion</span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => updateSettings({ reducedMotion: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span>Low particle effects</span>
          <input
            type="checkbox"
            checked={settings.lowEffects}
            onChange={(event) => updateSettings({ lowEffects: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span>Show dice roll details</span>
          <input
            type="checkbox"
            checked={settings.showRolls}
            onChange={(event) => updateSettings({ showRolls: event.target.checked })}
          />
        </label>
      </div>
    </div>
  );
}
