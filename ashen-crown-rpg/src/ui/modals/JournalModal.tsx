import { useState } from 'react';
import { useGameStore } from '@/core/gameStore';
import { questById } from '@/data/quests';
import { ModalShell } from './ModalShell';
import { cx } from '@/utils';

type Tab = 'active' | 'completed' | 'failed';

export function JournalModal() {
  const [tab, setTab] = useState<Tab>('active');
  const game = useGameStore((state) => state.game);
  const closeModal = useGameStore((state) => state.closeModal);
  if (!game) return null;

  const quests = Object.entries(game.quests)
    .map(([id, state]) => ({ id, state, def: questById[id] }))
    .filter((entry) => Boolean(entry.def));
  const active = quests
    .filter((entry) => entry.state.status === 'active')
    .sort((a, b) => {
      const weight = (type: string) => (type === 'main' ? 0 : type === 'companion' ? 1 : type === 'side' ? 2 : 3);
      return weight(a.def.type) - weight(b.def.type) || a.def.act - b.def.act;
    });
  const completed = quests.filter((entry) => entry.state.status === 'completed');
  const failed = quests.filter((entry) => entry.state.status === 'failed');
  const visible = tab === 'active' ? active : tab === 'completed' ? completed : failed;
  const hiddenCount = Object.keys(questById).length - quests.filter((entry) => entry.state.status !== 'hidden').length;

  return (
    <ModalShell
      title="Journal"
      kicker="What You Remember"
      onClose={closeModal}
      size="lg"
      footer={
        <div className="journal-footer">
          <span>{active.length} active</span>
          <span>{completed.length} completed</span>
          <span>{failed.length} failed</span>
          <span className="muted">{hiddenCount} pages not yet written</span>
        </div>
      }
    >
      <div className="journal-tabs">
        {(['active', 'completed', 'failed'] as Tab[]).map((entry) => (
          <button key={entry} className={cx('pill', tab === entry && 'is-selected')} onClick={() => setTab(entry)}>
            {entry}
            <span className="pill-count">
              {entry === 'active' ? active.length : entry === 'completed' ? completed.length : failed.length}
            </span>
          </button>
        ))}
      </div>

      <div className="journal-list">
        {visible.map(({ id, state, def }) => {
          const stage = def.stages[Math.min(state.stage, def.stages.length - 1)];
          const progress = def.stages.length > 1 ? (state.stage / (def.stages.length - 1)) * 100 : 100;
          return (
            <article key={id} className={cx('journal-card', `quest-${def.type}`, `quest-${state.status}`)}>
              <div className="journal-card-head">
                <div>
                  <span className={cx('tag', `tag-${def.type}`)}>{def.type}</span>
                  <span className="tag tag-muted">Act {def.act}</span>
                  {state.status === 'completed' && <span className="tag tag-success">Complete</span>}
                  {state.status === 'failed' && <span className="tag tag-danger">Failed</span>}
                </div>
                <span className="journal-progress-label">
                  {Math.min(state.stage + 1, def.stages.length)} / {def.stages.length}
                </span>
              </div>
              <h3>{def.title}</h3>
              <p className="journal-description">{def.description}</p>
              <div className="progress-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="journal-stage">
                <h4>{stage?.title}</h4>
                <p>{stage?.description}</p>
                {stage?.objectives && (
                  <ul className="objective-list">
                    {stage.objectives.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>
                )}
              </div>
              {state.status === 'completed' && (def.rewardXp || def.rewardGold || def.rewardItems) && (
                <div className="journal-rewards">
                  <span className="journal-rewards-label">Rewards</span>
                  {def.rewardXp ? <span>{def.rewardXp} XP</span> : null}
                  {def.rewardGold ? <span>{def.rewardGold} gold</span> : null}
                  {def.rewardItems?.map((item) => <span key={item}>{item.replace(/_/g, ' ')}</span>)}
                </div>
              )}
              {def.consequences && <p className="journal-consequence">{def.consequences}</p>}
            </article>
          );
        })}
        {!visible.length && (
          <div className="journal-empty">
            <span className="detail-sigil">❧</span>
            <p>
              {tab === 'active'
                ? 'No active threads. Choose a direction and the world will answer.'
                : tab === 'completed'
                  ? 'No completed quests yet. The book is patient.'
                  : 'No failures recorded. That may change.'}
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
