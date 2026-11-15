import { RESOURCE_KEYS } from '../game/content';
import { formatDuration, formatNumber } from '../game/format';
import type { ResourceKey } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { Modal } from './Common';
import { Icon, ResourceIcon } from './Icons';

export function OfflineReport() {
  const open = useGameStore((state) => state.offlineOpen);
  const report = useGameStore((state) => state.offlineReport);
  const dismiss = useGameStore((state) => state.dismissOfflineReport);
  if (!report) return null;

  const gained = RESOURCE_KEYS.filter((key) => report.gained[key] > 0.01);
  const consumed = RESOURCE_KEYS.filter((key) => report.consumed[key] > 0.01);

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="While you were gone"
      subtitle={`The hearth kept its own watch for ${formatDuration(report.seconds)}.`}
      variant="center"
      footer={
        <button type="button" className="primary-button w-full justify-center" onClick={dismiss}>
          Return to the fire <Icon name="flame" size={15} />
        </button>
      }
    >
      <div className="offline-hero">
        <div className="offline-moon">
          <Icon name="moon" size={22} />
        </div>
        <div>
          <span className="eyebrow">AWAY FOR</span>
          <strong>
            {formatDuration(report.creditedSeconds)}
            {report.capped && <small> (8 h cap)</small>}
          </strong>
          <p>{report.capped ? 'The hearth ran through the full offline window.' : 'The settlement kept working at reduced efficiency.'}</p>
        </div>
      </div>

      <div className="offline-section">
        <div className="flex items-center justify-between gap-2">
          <h3>Stores recovered</h3>
          <span className="text-[10px] text-frost-400/55">65% efficiency</span>
        </div>
        {gained.length === 0 ? (
          <p className="empty-line">No resources were produced. The work posts may have been empty.</p>
        ) : (
          <div className="offline-gain-grid">
            {gained.map((key) => (
              <div className="offline-gain" key={key}>
                <span className={`cost-icon cost-${key}`}>
                  <ResourceIcon resource={key} size={15} />
                </span>
                <strong>+{formatNumber(report.gained[key])}</strong>
                <small>{labelFor(key)}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      {consumed.length > 0 && (
        <div className="offline-section">
          <h3>Consumed</h3>
          <div className="compact-table">
            {consumed.map((key) => (
              <div key={key}>
                <span className="inline-flex items-center gap-1.5">
                  <ResourceIcon resource={key} size={12} /> {labelFor(key)}
                </span>
                <strong className="text-red-300/85">−{formatNumber(report.consumed[key])}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="offline-section">
        <h3>What happened</h3>
        <div className="offline-events">
          <OfflineStat icon="clock" label="Days passed" value={String(report.days)} />
          <OfflineStat icon="wind" label="Whiteouts" value={String(report.blizzards)} />
          <OfflineStat icon="meals" label="Fed at meals" value={String(report.mealsServed)} />
          <OfflineStat icon="people" label="New survivors" value={String(report.newSurvivors)} />
          <OfflineStat
            icon="heal"
            label="Newly sick"
            value={String(report.survivorsSick)}
            alert={report.survivorsSick > 0}
          />
          <OfflineStat icon="health" label="Deaths" value={String(report.survivorsLost)} />
        </div>
        {report.mealsMissed > 0 && (
          <p className="offline-warning">
            <Icon name="alert" size={13} /> {report.mealsMissed} survivor
            {report.mealsMissed === 1 ? '' : 's'} missed the meal call. Nobody froze to death while
            the app was closed.
          </p>
        )}
      </div>

      <p className="offline-safe-note">
        <Icon name="shield" size={13} /> Offline safety: survivors can fall sick, but never freeze to
        death while the app is closed.
      </p>
    </Modal>
  );
}

function OfflineStat({
  icon,
  label,
  value,
  alert = false,
}: {
  icon: 'clock' | 'wind' | 'meals' | 'people' | 'heal' | 'health';
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className={`offline-stat ${alert ? 'is-alert' : ''}`}>
      <Icon name={icon} size={14} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function labelFor(key: ResourceKey): string {
  if (key === 'rawMeat') return 'Raw Meat';
  if (key === 'meals') return 'Meals';
  return key[0].toUpperCase() + key.slice(1);
}
