import { RESOURCE_KEYS, RESOURCE_META } from '../game/content';
import {
  getDayPhase,
  getFurnaceCapacity,
  getFurnaceHeatRatio,
} from '../game/engine';
import { formatClock, formatNumber, formatTemperature } from '../game/format';
import { useGameStore } from '../store/gameStore';
import { BlizzardBanner } from './BlizzardBanner';
import { Icon, ResourceIcon } from './Icons';

export function Hud() {
  const game = useGameStore((state) => state.game);
  const settings = useGameStore((state) => state.settings);
  const setSound = useGameStore((state) => state.setSound);
  const openSettings = useGameStore((state) => state.openSettings);

  const healthy = game.survivors.filter((survivor) => !survivor.sick).length;
  const sick = game.survivors.length - healthy;
  const phase = getDayPhase(game.clock);
  const heatRatio = getFurnaceHeatRatio(game);
  const capacity = getFurnaceCapacity(game);

  return (
    <header className="hud">
      <div className="hud-brand-row">
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
        <div className="flex items-center gap-1.5">
          <div className="outside-pill" title="Ambient temperature">
            <Icon name="snow" size={12} />
            <span>{formatTemperature(game.weather.ambient)}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSound(!settings.sound)}
            aria-label={settings.sound ? 'Mute sound' : 'Enable sound'}
            title={settings.sound ? 'Mute sound' : 'Enable sound'}
          >
            <Icon name={settings.sound ? 'volume' : 'mute'} size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={openSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <Icon name="settings" size={16} />
          </button>
        </div>
      </div>

      <div className="resource-grid" aria-label="Resources">
        {RESOURCE_KEYS.map((key) => (
          <div
            className={`resource-chip resource-${key}`}
            key={key}
            title={`${RESOURCE_META[key].name} — ${RESOURCE_META[key].description}`}
          >
            <span className="resource-icon">
              <ResourceIcon resource={key} size={15} />
            </span>
            <span className="min-w-0">
              <span className="resource-label">{RESOURCE_META[key].short}</span>
              <strong className="resource-value">{formatNumber(game.resources[key])}</strong>
            </span>
          </div>
        ))}
      </div>

      <div className="hud-status-row">
        <div className="temp-block" aria-label={`City temperature ${formatTemperature(game.furnace.temperature)}`}>
          <div className="flex items-start gap-1">
            <span className="temp-value">{formatTemperature(game.furnace.temperature)}</span>
            <Icon name="thermometer" size={14} className="mt-1.5 text-ember-400/80" />
          </div>
          <span className="temp-caption">CITY · {game.weather.phase === 'blizzard' ? 'WHITEOUT' : phase === 'sleep' ? 'NIGHT' : 'SHELTERED'}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-frost-400/70">
              Furnace heat
            </span>
            <span className="font-mono text-[10px] text-ember-200">
              {Math.round(game.furnace.heat)}/{Math.round(capacity)}
            </span>
          </div>
          <div
            className="heat-track"
            role="progressbar"
            aria-label="Furnace heat"
            aria-valuemin={0}
            aria-valuemax={Math.round(capacity)}
            aria-valuenow={Math.round(game.furnace.heat)}
          >
            <span
              className={`heat-fill ${game.furnace.mode === 'overdrive' ? 'is-overdrive' : ''} ${heatRatio < 0.25 ? 'is-low' : ''}`}
              style={{ width: `${heatRatio * 100}%` }}
            />
          </div>
          <div className="hud-meta-row">
            <span className="hud-clock">
              <Icon name={phase === 'sleep' ? 'moon' : 'clock'} size={10} />
              <span className="font-mono">D{game.day} {formatClock(game.clock)}</span>
              <em>{phase}</em>
            </span>
            <span
              className="hud-pop"
              title={`${healthy} healthy, ${sick} sick`}
              aria-label={`${healthy} healthy and ${sick} sick survivors`}
            >
              <Icon name="people" size={11} />
              <b>{healthy}</b>
              <span className="pop-word">healthy</span>
              <span className="pop-mini">H</span>
              <i>·</i>
              <b className={sick > 0 ? 'is-sick' : ''}>{sick}</b>
              <span className="pop-word">sick</span>
              <span className="pop-mini">S</span>
            </span>
          </div>
        </div>
      </div>

      <BlizzardBanner />
    </header>
  );
}
