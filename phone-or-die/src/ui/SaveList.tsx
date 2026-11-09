import { useEffect } from 'react';
import { useGameStore } from '@/core/gameStore';
import { formatDate, formatPlayTime, formatSaveLabel, cx } from '@/utils';

interface SaveListProps {
  mode: 'save' | 'load';
  onDone?: () => void;
  compact?: boolean;
}

const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];

export function SaveList({ mode, onDone, compact }: SaveListProps) {
  const saves = useGameStore((state) => state.saves);
  const loading = useGameStore((state) => state.savesLoading);
  const game = useGameStore((state) => state.game);
  const refresh = useGameStore((state) => state.refreshSaves);
  const saveToSlot = useGameStore((state) => state.saveToSlot);
  const loadFromSlot = useGameStore((state) => state.loadFromSlot);
  const deleteSlot = useGameStore((state) => state.deleteSlot);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLoad = async (slot: string) => {
    await loadFromSlot(slot);
    onDone?.();
  };

  return (
    <div className={cx('save-list', compact && 'is-compact')}>
      {loading && <p className="save-loading">Reading the night…</p>}
      {SLOTS.map((slot) => {
        const save = saves.find((entry) => entry.slot === slot);
        return (
          <article key={slot} className={cx('save-card', !save && 'is-empty', save?.auto && 'is-auto')}>
            <div className="save-card-head">
              <span className="save-slot">{formatSaveLabel(slot)}</span>
              {save?.auto && <span className="pill-tag">Auto</span>}
            </div>
            {save ? (
              <>
                <div className="save-time">{save.timeLabel}</div>
                <div className="save-chapter">Chapter {save.chapter + 1}</div>
                <div className="save-meta">
                  <span>{save.difficulty}</span>
                  <span>Threat {save.threat}%</span>
                  <span>Battery {save.battery}%</span>
                </div>
                <div className="save-date">
                  {formatDate(save.savedAt)} · {formatPlayTime(save.playTime)}
                </div>
                <div className="save-actions">
                  {mode === 'save' && (
                    <button
                      className="phone-action small"
                      disabled={!game}
                      onClick={() => void saveToSlot(slot).then(() => onDone?.())}
                    >
                      Overwrite
                    </button>
                  )}
                  {mode === 'load' && (
                    <button className="phone-action small light" onClick={() => void handleLoad(slot)}>
                      Load
                    </button>
                  )}
                  <button
                    className="phone-action small ghost"
                    onClick={() => {
                      if (window.confirm(`Delete ${formatSaveLabel(slot)}?`)) void deleteSlot(slot);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="save-empty">An unwritten night</div>
                {mode === 'save' && (
                  <button
                    className="phone-action small"
                    disabled={!game}
                    onClick={() => void saveToSlot(slot).then(() => onDone?.())}
                  >
                    Save here
                  </button>
                )}
              </>
            )}
          </article>
        );
      })}
      {mode === 'load' && !saves.length && !loading && (
        <p className="save-hint">No saved nights yet. Begin a new game from the menu.</p>
      )}
    </div>
  );
}
