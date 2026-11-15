import {
  getFurnaceCoalPerSecond,
  getSecondsUntilBlizzard,
} from '../game/engine';
import { formatCountdown, formatRate } from '../game/format';
import { useGameStore } from '../store/gameStore';
import { Icon } from './Icons';

export function BlizzardBanner() {
  const game = useGameStore((state) => state.game);
  const setFurnaceMode = useGameStore((state) => state.setFurnaceMode);
  const phase = game.weather.phase;
  const isOverdrive = game.furnace.mode === 'overdrive';
  const coalRate = getFurnaceCoalPerSecond(game);
  const remaining = phase === 'blizzard' ? game.weather.remaining : getSecondsUntilBlizzard(game);
  const fuelLow = coalRate > 0 && game.resources.coal < coalRate * 10;

  const toneClass =
    phase === 'blizzard' ? 'weather-strip is-blizzard' : phase === 'warning' ? 'weather-strip is-warning' : 'weather-strip';

  return (
    <div className={toneClass}>
      <div className="weather-icon-wrap" aria-hidden="true">
        <Icon name={phase === 'blizzard' ? 'wind' : phase === 'warning' ? 'alert' : 'snow'} size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="weather-title">
          {phase === 'blizzard'
            ? 'WHITEOUT'
            : phase === 'warning'
              ? 'BLIZZARD INCOMING'
              : 'NEXT WHITEOUT'}
        </div>
        <div className="weather-sub">
          <span className="font-mono tabular-nums">{formatCountdown(remaining)}</span>
          <span className="opacity-50">·</span>
          <span>
            {phase === 'blizzard'
              ? 'until the wind drops'
              : phase === 'warning'
                ? 'until whiteout'
                : 'until whiteout'}
          </span>
          {fuelLow && (
            <>
              <span className="opacity-50">·</span>
              <span className="text-ember-200">low coal</span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className={`overdrive-button ${isOverdrive ? 'is-on' : ''}`}
        aria-pressed={isOverdrive}
        onClick={() => setFurnaceMode(isOverdrive ? 'normal' : 'overdrive')}
        title="Overdrive burns more coal for much more heat."
      >
        <Icon name="flame" size={14} />
        <span>{isOverdrive ? 'OVERDRIVE' : 'OVERDRIVE'}</span>
        <small>{isOverdrive ? formatRate(coalRate) : '2× coal'}</small>
      </button>
    </div>
  );
}
