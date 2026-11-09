import { useEffect } from 'react';
import { useGameStore } from '@/core/gameStore';
import { cx, formatDate, formatPlayTime } from '@/utils';

interface SaveListProps {
  mode: 'save' | 'load';
  onDone?: () => void;
  compact?: boolean;
}

const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
const slotLabel = (slot: string) => (slot === 'auto' ? 'Autosave' : slot.replace('slot', 'Chronicle '));

export function SaveList({ mode, onDone, compact }: SaveListProps) {
  const saves = useGameStore((state) => state.saves);
  const loading = useGameStore((state) => state.savesLoading);
  const game = useGameStore((state) => state.game);
  const refreshSaves = useGameStore((state) => state.refreshSaves);
  const loadFromSlot = useGameStore((state) => state.loadFromSlot);
  const saveToSlot = useGameStore((state) => state.saveToSlot);
  const deleteSlot = useGameStore((state) => state.deleteSlot);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  const handleLoad = async (slot: string) => {
    await loadFromSlot(slot);
    onDone?.();
  };

  return (
    <div className={cx('save-list', compact && 'save-list-compact')}>
      {loading && <div className="save-loading">Reading the chronicles…</div>}
      {SLOTS.map((slot) => {
        const save = saves.find((entry) => entry.slot === slot);
        return (
          <article key={slot} className={cx('save-card', !save && 'save-card-empty', save?.auto && 'save-card-auto')}>
            <div className="save-card-head">
              <span className="save-slot">{slotLabel(slot)}</span>
              {save?.auto && <span className="tag tag-muted">Auto</span>}
            </div>
            {save ? (
              <>
                <div className="save-name">{save.name}</div>
                <div className="save-meta">
                  <span>Level {save.level}</span>
                  <span>{save.location}</span>
                  <span>{formatPlayTime(save.playTime)}</span>
                </div>
                <div className="save-date">{formatDate(save.timestamp)}</div>
                <div className="save-actions">
                  {mode === 'save' && (
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => {
                        void saveToSlot(slot).then(() => onDone?.());
                      }}
                      disabled={!game}
                    >
                      Overwrite
                    </button>
                  )}
                  {mode === 'load' && (
                    <button className="btn btn-small btn-primary" onClick={() => void handleLoad(slot)}>
                      Load
                    </button>
                  )}
                  <button
                    className="btn btn-small btn-ghost"
                    onClick={() => {
                      if (window.confirm(`Delete ${slotLabel(slot)}? This cannot be undone.`)) {
                        void deleteSlot(slot);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="save-empty-title">An unwritten page</div>
                <div className="save-empty-text">No chronicle has been recorded here.</div>
                {mode === 'save' && (
                  <button
                    className="btn btn-small btn-outline"
                    disabled={!game}
                    onClick={() => {
                      void saveToSlot(slot).then(() => onDone?.());
                    }}
                  >
                    Write here
                  </button>
                )}
              </>
            )}
          </article>
        );
      })}
      {mode === 'save' && !game && (
        <p className="muted small">Begin a chronicle before saving.</p>
      )}
      {mode === 'load' && !saves.length && !loading && (
        <p className="muted small">No saves found. Start a new chronicle from the main menu.</p>
      )}
    </div>
  );
}
