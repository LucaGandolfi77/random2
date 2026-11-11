import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Modal, Pill, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { IngredientArt } from '@/components/art/IngredientArt';
import { SushiArt } from '@/components/art/SushiArt';
import {
  MERGE_BOARD_SIZE,
  allowedMergeTargets,
  createMergeGame,
  mergeTiles,
  type MergeGameState,
} from '@/game/merge/merge';
import { MERGE_RULES, getMergeItem } from '@/data/merge';
import { createRng } from '@/utils/rng';
import { audio } from '@/audio/engine';

const MergeTileArt = ({ itemId }: { itemId: string }) => {
  const item = getMergeItem(itemId);
  if (!item) return null;
  if (item.ingredientId) return <IngredientArt id={item.ingredientId} size={44} animate={false} />;
  if (item.recipeId && ['salmon_nigiri', 'tuna_nigiri', 'ebi_nigiri', 'cucumber_maki', 'tuna_maki', 'salmon_avocado_roll', 'california_roll'].includes(item.recipeId)) {
    return <SushiArt recipeId={item.recipeId} size={64} />;
  }
  const icon = item.id === 'golden_sushi' ? 'crown' : item.id === 'rainbow_sushi' ? 'rainbow' : item.id === 'giant_sushi' ? 'trophy' : item.id === 'premium_pair' ? 'sparkle' : 'sparkle';
  return (
    <span className={`merge-special merge-special--${item.id}`}>
      <span className="merge-special__halo" />
      <Icon name={icon} size={26} />
    </span>
  );
};

export const MergeScreen = () => {
  const save = useGameStore((state) => state.save);
  const recordMergeScore = useGameStore((state) => state.recordMergeScore);
  const rng = useRef(createRng(Date.now()));
  const [game, setGame] = useState<MergeGameState>(() => createMergeGame(rng.current));
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState('Tap two compatible pieces to merge them.');
  const [guideOpen, setGuideOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const recorded = useRef(false);
  const best = save.modes.merge[0]?.score ?? 0;

  useEffect(() => {
    if (game.gameOver && !recorded.current) {
      recorded.current = true;
      recordMergeScore(game.score);
      setEnded(true);
    }
  }, [game.gameOver, game.score, recordMergeScore]);

  const restart = () => {
    setGame(createMergeGame(rng.current));
    setSelected(null);
    setMessage('A fresh board. Tap two compatible pieces.');
    setEnded(false);
    recorded.current = false;
  };

  const attemptMerge = (from: number, to: number) => {
    const outcome = mergeTiles(game, from, to, rng.current);
    if (!outcome.ok) {
      setSelected(to);
      setMessage('Those two do not merge. Try another compatible piece.');
      void audio.playSfx('error');
      return;
    }
    setGame(outcome.state);
    setSelected(null);
    setMessage(`Merged into ${getMergeItem(outcome.result ?? '')?.name ?? 'something lovely'} · +${outcome.gained} pts`);
    void audio.playSfx(outcome.result === 'golden_sushi' ? 'discovery' : 'roll');
  };

  const handleCell = (index: number) => {
    const item = game.cells[index];
    if (!item) {
      setMessage('That little compartment is empty.');
      return;
    }
    if (selected === null) {
      setSelected(index);
      setMessage('Choose a matching piece to merge.');
      void audio.playSfx('pickup');
      return;
    }
    if (selected === index) {
      setSelected(null);
      setMessage('Selection cleared.');
      return;
    }
    attemptMerge(selected, index);
  };

  const finish = () => {
    if (recorded.current) return;
    recorded.current = true;
    recordMergeScore(game.score);
    setEnded(true);
  };

  const targets = selected !== null ? new Set(allowedMergeTargets(game.cells, selected)) : new Set<number>();

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Combine, chain, dream</span>
          <h1>Sushi Merge</h1>
          <p>One tap selects. A second tap combines. Tiny sushi miracles follow.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="gold" icon="trophy">{best} best</Pill>
          <Pill tone="matcha" icon="star">{game.score}</Pill>
        </div>
      </div>

      <div className="merge-topbar">
        <div className="merge-stat"><span>Score</span><strong>{game.score}</strong></div>
        <div className="merge-stat"><span>Combo</span><strong>x{game.combo}</strong></div>
        <div className="merge-stat"><span>Moves</span><strong>{game.moves}</strong></div>
        <Button size="sm" variant="ghost" icon="book" onClick={() => setGuideOpen(true)}>Merge guide</Button>
      </div>

      <div className="merge-board-shell">
        <div className="merge-board" role="grid" aria-label="Sushi merge board">
          {Array.from({ length: MERGE_BOARD_SIZE }).map((_, index) => {
            const cell = game.cells[index];
            const isSelected = selected === index;
            const isTarget = targets.has(index);
            return (
              <button
                key={index}
                type="button"
                role="gridcell"
                className={`merge-cell ${cell ? 'has-item' : ''} ${isSelected ? 'is-selected' : ''} ${isTarget ? 'is-target' : ''}`.trim()}
                onClick={() => handleCell(index)}
                draggable={Boolean(cell) && !ended}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', String(index));
                  setSelected(index);
                }}
                onDragOver={(event) => {
                  if (cell) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData('text/plain'));
                  if (Number.isInteger(from) && from !== index) attemptMerge(from, index);
                }}
                disabled={ended}
                aria-label={cell ? getMergeItem(cell)?.name : 'Empty compartment'}
              >
                {cell ? <MergeTileArt itemId={cell} /> : <span className="merge-cell__empty" />}
                {isTarget ? <span className="merge-cell__sparkle"><Icon name="sparkles" size={11} /></span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <p className="merge-message">
        <Icon name={selected !== null ? 'target' : 'info'} size={14} /> {message}
      </p>

      <div className="row row--between">
        <div className="row">
          <Pill tone={game.combo > 0 ? 'gold' : 'default'} icon="flame">Combo x{game.combo}</Pill>
          <Pill tone="matcha" icon="merge">{game.cells.filter(Boolean).length}/{MERGE_BOARD_SIZE} tiles</Pill>
        </div>
        <div className="row">
          <Button size="sm" variant="ghost" icon="refresh" onClick={restart}>Restart</Button>
          <Button size="sm" variant="soft" icon="trophy" onClick={finish}>Finish run</Button>
        </div>
      </div>

      <div className="merge-chains">
        <SectionHead title="Known little chains" subtitle="Everything follows a clear rule" icon="merge" />
        <div className="merge-rule-row">
          {MERGE_RULES.slice(0, 8).map((rule) => (
            <span key={`${rule.a}-${rule.b}`} className="merge-rule-chip">
              <em>{getMergeItem(rule.a)?.name}</em>
              <Icon name="plus" size={10} />
              <em>{getMergeItem(rule.b)?.name}</em>
              <Icon name="arrowRight" size={10} />
              <strong>{getMergeItem(rule.result)?.name}</strong>
            </span>
          ))}
        </div>
      </div>

      <SectionHead title="Local leaderboard" subtitle="Your best merge evenings" icon="trophy" />
      <div className="leaderboard">
        {save.modes.merge.length === 0 ? (
          <p className="muted small">No scores yet. The first chain is always the coziest.</p>
        ) : (
          save.modes.merge.slice(0, 5).map((entry, index) => (
            <div key={`${entry.date}-${index}`} className="leaderboard__row">
              <span className={`leaderboard__rank rank-${index + 1}`}>{index + 1}</span>
              <div><strong>{entry.score}</strong><span>{entry.detail}</span></div>
              <time>{new Date(entry.date).toLocaleDateString()}</time>
            </div>
          ))
        )}
      </div>

      <Modal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Merge guide"
        size="md"
      >
        <p className="modal-copy">Sushi Merge is rule-based. Tap two ingredients or sushi that appear together below.</p>
        <div className="merge-guide">
          {MERGE_RULES.map((rule) => (
            <div key={`${rule.a}-${rule.b}-guide`} className="merge-guide__row">
              <span><MergeTileArt itemId={rule.a} /> <em>{getMergeItem(rule.a)?.name}</em></span>
              <Icon name="plus" size={13} />
              <span><MergeTileArt itemId={rule.b} /> <em>{getMergeItem(rule.b)?.name}</em></span>
              <Icon name="arrowRight" size={13} />
              <span><MergeTileArt itemId={rule.result} /> <strong>{getMergeItem(rule.result)?.name}</strong></span>
              <Pill tone="gold">+{rule.points}</Pill>
            </div>
          ))}
        </div>
        <p className="muted tiny">
          A successful merge spawns one new ingredient. The game ends when the board is full and no merge is possible.
        </p>
      </Modal>

      <Modal
        open={ended}
        onClose={() => restart()}
        title="A lovely little chain"
        size="sm"
        footer={
          <div className="modal__actions">
            <Button variant="ghost" onClick={() => navigate('/')}>Home</Button>
            <Button variant="primary" icon="refresh" onClick={restart}>Play again</Button>
          </div>
        }
      >
        <div className="screen--center" style={{ textAlign: 'center', alignItems: 'center' }}>
          <Icon name="trophy" size={42} />
          <p className="display-title" style={{ fontSize: 44 }}>{game.score}</p>
          <p className="muted small">{game.moves} merges · best combo x{game.combo} · {game.score > best ? 'A new personal best!' : `Best ${best}`}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Pill tone="gold" icon="trophy">Saved locally</Pill>
            <Pill tone="matcha" icon="check">Run complete</Pill>
          </div>
        </div>
      </Modal>

      <div className="row" style={{ justifyContent: 'center' }}>
        <Button variant="ghost" size="sm" icon="info" onClick={() => navigate('/')}>
          The merge board stays warm while you are away
        </Button>
      </div>
    </div>
  );
};

