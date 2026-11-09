import { useGameStore, isInteractableVisible } from '@/core/gameStore';
import { mapById, travelNodes } from '@/data/maps';
import { tileColor, kindColor } from '@/game/iso';
import { ModalShell } from './ModalShell';
import { cx } from '@/utils';

const cssColor = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export function MapModal() {
  const game = useGameStore((state) => state.game);
  const closeModal = useGameStore((state) => state.closeModal);
  const travelTo = useGameStore((state) => state.travelTo);
  if (!game) return null;

  const map = mapById[game.world.locationId] ?? mapById.fallen_bastion;
  const visibleMarkers = map.interactables.filter((def) => isInteractableVisible(game, def));

  return (
    <ModalShell
      title="Map of Elarion"
      kicker={map.region}
      onClose={closeModal}
      size="xl"
      footer={
        <div className="map-footer">
          <span>Current: {map.name}</span>
          <span className="muted">Travel to any discovered region from here.</span>
        </div>
      }
    >
      <div className="map-layout">
        <div className="map-local">
          <div className="map-local-head">
            <div>
              <h3>{map.name}</h3>
              <p>{map.region}</p>
            </div>
            <span className="tag tag-muted">{map.ambience}</span>
          </div>
          <div
            className="mini-map"
            style={{ gridTemplateColumns: `repeat(${map.width}, 1fr)` }}
            aria-label={`Local map of ${map.name}`}
          >
            {map.rows.flatMap((row, y) =>
              Array.from(row).map((char, x) => (
                <span
                  key={`${x}-${y}`}
                  className="mini-map-cell"
                  style={{ background: cssColor(tileColor(char, x, y, map.ambience)) }}
                />
              ))
            )}
            {visibleMarkers.map((def) => (
              <span
                key={def.id}
                className={cx('mini-map-marker', def.kind === 'enemy' && 'is-enemy', def.kind === 'exit' && 'is-exit')}
                style={{
                  left: `${((def.x + 0.5) / map.width) * 100}%`,
                  top: `${((def.y + 0.5) / map.height) * 100}%`,
                  background: cssColor(kindColor[def.kind] ?? 0xd8b46f)
                }}
                title={def.label}
              />
            ))}
            <span
              className="mini-map-player"
              style={{
                left: `${((game.world.x + 0.5) / map.width) * 100}%`,
                top: `${((game.world.y + 0.5) / map.height) * 100}%`
              }}
              title="You"
            />
          </div>
          <div className="map-legend">
            <span><i className="legend-dot legend-player" /> You</span>
            <span><i className="legend-dot legend-npc" /> Person</span>
            <span><i className="legend-dot legend-exit" /> Passage</span>
            <span><i className="legend-dot legend-danger" /> Danger</span>
          </div>
          <div className="map-coords">
            Position {game.world.x}, {game.world.y} · {map.width} × {map.height}
          </div>
        </div>

        <aside className="map-travel">
          <h3>Known Regions</h3>
          <p className="muted small">The Crown’s roads are old. Some remember you.</p>
          <div className="travel-list">
            {travelNodes.map((node) => {
              const discovered = game.world.discovered.includes(node.id) || Boolean(game.world.flags[node.flag]);
              const current = node.id === game.world.locationId;
              const destination = mapById[node.id];
              return (
                <article key={node.id} className={cx('travel-card', current && 'is-current', !discovered && 'is-unknown')}>
                  <div>
                    <h4>{discovered ? node.name : 'Unknown region'}</h4>
                    <p>{discovered ? node.description : 'A place not yet written on your map.'}</p>
                    {discovered && destination && (
                      <span className="travel-meta">
                        {destination.weather && destination.weather !== 'none' ? destination.weather : 'still air'} ·{' '}
                        {destination.interactables.filter((entry) => entry.kind === 'enemy').length} threats
                      </span>
                    )}
                  </div>
                  {current ? (
                    <span className="tag tag-gold">Here</span>
                  ) : discovered ? (
                    <button className="btn btn-small btn-primary" onClick={() => travelTo(node.id)}>
                      Travel
                    </button>
                  ) : (
                    <span className="tag tag-muted">Sealed</span>
                  )}
                </article>
              );
            })}
          </div>
          <div className="map-note">
            <span className="detail-sigil">✧</span>
            <p>Fast travel is only possible to regions you have already reached. Interiors must be left on foot.</p>
          </div>
        </aside>
      </div>
    </ModalShell>
  );
}
