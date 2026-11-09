import { useGameStore } from '@/core/gameStore';
import { eventById } from '@/data/events';
import { stageInfo } from '@/systems/threat';
import { formatNightTime } from '@/systems/clock';
import { cx } from '@/utils';

export function EventModal() {
  const pendingId = useGameStore((state) => state.pendingEventId);
  const game = useGameStore((state) => state.game);
  const choose = useGameStore((state) => state.chooseEventChoice);
  if (!pendingId || !game) return null;
  const event = eventById[pendingId];
  if (!event) return null;
  const stage = stageInfo(game.threat);

  return (
    <div className={cx('event-layer', event.incoming && 'is-incoming')}>
      <section className="event-card">
        <div className="event-top">
          <span className="event-kicker">{event.incoming ? '◉ Incoming call' : event.kicker}</span>
          <span className="event-time">{formatNightTime(game.nightMinute)}</span>
        </div>
        <h2>{event.title}</h2>
        {event.incoming && <div className="event-ring"><span /></div>}
        <p className="event-text">{event.text}</p>
        <div className="event-choices">
          {event.choices.map((choice) => (
            <button key={choice.id} className="event-choice" onClick={() => choose(choice.id)}>
              <span className="event-choice-dot" />
              <span>
                <strong>{choice.label}</strong>
                {choice.description && <small>{choice.description}</small>}
              </span>
            </button>
          ))}
        </div>
        <div className="event-footer">
          <span>{stage.label} · {Math.round(game.threat)}%</span>
          <span>Battery {Math.round(game.battery)}%</span>
        </div>
      </section>
    </div>
  );
}
