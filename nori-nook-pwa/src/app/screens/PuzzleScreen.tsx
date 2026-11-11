import { useMemo, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Modal, Pill, ProgressBar, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { SushiBuilder } from '@/components/game/SushiBuilder';
import { PUZZLE_LEVELS } from '@/data/puzzles';
import { constraintLabel } from '@/game/puzzles/puzzles';
import type { PuzzleCompletion } from '@/app/store';
import type { RecipeIngredient } from '@/types/game';

export const PuzzleScreen = () => {
  const save = useGameStore((state) => state.save);
  const completePuzzleLevel = useGameStore((state) => state.completePuzzleLevel);
  const [selected, setSelected] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<PuzzleCompletion | null>(null);

  const solved = Object.values(save.modes.puzzles).filter((entry) => entry.stars > 0).length;
  const totalStars = Object.values(save.modes.puzzles).reduce((sum, entry) => sum + entry.stars, 0);
  const level = selected ? PUZZLE_LEVELS.find((item) => item.id === selected) : undefined;
  const exactRecipeId = level?.constraints.find((constraint) => constraint.kind === 'exact_recipe')?.recipeId;
  const nextLevel = level ? PUZZLE_LEVELS.find((item) => item.number === level.number + 1) : undefined;

  const openLevel = (id: string) => {
    setSelected(id);
    setIngredients([]);
    setAttempts(0);
    setResult(null);
  };

  const isUnlocked = (number: number): boolean => {
    if (number === 1) return true;
    const previous = save.modes.puzzles[`puzzle_${String(number - 1).padStart(2, '0')}`];
    return Boolean(previous && previous.stars > 0);
  };

  if (level) {
    const best = save.modes.puzzles[level.id];
    return (
      <div className="screen">
        <div className="page-head">
          <button type="button" className="page-back" aria-label="Back to puzzle levels" onClick={() => setSelected(null)}>
            <Icon name="back" size={18} />
          </button>
          <div className="page-head__copy">
            <span className="eyebrow">Puzzle {level.number} · difficulty {level.difficulty}</span>
            <h1>{level.title}</h1>
            <p>{level.description}</p>
          </div>
          <div className="page-head__action">
            {best ? <Pill tone="gold" icon="star">Best {best.stars}★</Pill> : null}
            <Pill tone="gold" icon="coin">{level.rewardCoins}</Pill>
          </div>
        </div>

        <Card variant="soft">
          <SectionHead title="Puzzle rules" subtitle="Every rule must be true when you plate up" icon="puzzle" />
          <div className="constraint-list">
            {level.constraints.map((constraint, index) => (
              <div key={`${constraint.kind}-${index}`} className="constraint-row">
                <span>{index + 1}</span>
                <strong>{constraintLabel(constraint)}</strong>
              </div>
            ))}
            <div className="constraint-row">
              <span>✓</span>
              <strong>Only use ingredients from this puzzle pantry</strong>
            </div>
          </div>
          <div className="tag-row" style={{ marginTop: 8 }}>
            <Pill tone="matcha" icon="rice">{level.allowedIngredients.length} pantry ingredients</Pill>
            <Pill tone="sakura" icon="target">Attempts {attempts}</Pill>
            {best ? <Pill tone="gold" icon="star">{best.stars} stars earned</Pill> : null}
          </div>
          {level.number === 1 ? <p className="muted tiny" style={{ marginTop: 8 }}>Tip: this first puzzle shows the exact recipe as a guide. Later levels ask for rules, values and ingredient combinations.</p> : null}
        </Card>

        <SushiBuilder
          save={save}
          ingredients={ingredients}
          onChange={setIngredients}
          free
          allowedIds={level.allowedIngredients}
          orderRecipeId={exactRecipeId}
          title={`Puzzle ${level.number} board`}
          actionLabel="Check the plate"
          onAction={() => {
            const nextAttempt = attempts + 1;
            setAttempts(nextAttempt);
            const outcome = completePuzzleLevel(level.id, ingredients, nextAttempt);
            setResult(outcome);
          }}
          extra={
            <div className="constraint-mini">
              {level.constraints.map((constraint, index) => (
                <span key={`${constraint.kind}-${index}`}><Icon name="check" size={10} /> {constraintLabel(constraint)}</span>
              ))}
            </div>
          }
        />

        <Modal
          open={Boolean(result)}
          onClose={() => setResult(null)}
          title={result?.ok ? 'Plate accepted!' : result?.locked ? 'Not yet unlocked' : 'Not quite there yet'}
          size="sm"
          footer={
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setResult(null)}>
                {result?.ok ? 'Stay here' : 'Try again'}
              </Button>
              {result?.ok && nextLevel && isUnlocked(nextLevel.number) ? (
                <Button variant="primary" iconRight="arrowRight" onClick={() => openLevel(nextLevel.id)}>
                  Next puzzle
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setResult(null)}>
                  {result?.ok ? 'Celebrate' : 'Adjust the plate'}
                </Button>
              )}
            </div>
          }
        >
          {result?.evaluation ? (
            <div className="puzzle-result">
              <div className="puzzle-stars">
                {[1, 2, 3].map((star) => (
                  <Icon
                    key={star}
                    name="star"
                    size={star === 2 ? 40 : 30}
                    className={star <= (result.evaluation?.stars ?? 0) ? 'is-filled-star' : 'is-empty-star'}
                  />
                ))}
              </div>
              <p className="display-title" style={{ fontSize: 38 }}>{result.evaluation.score}</p>
              <p className="muted small">
                {result.evaluation.passed
                  ? `A ${result.evaluation.stars}-star solution. ${result.coins ? `+${result.coins} coins.` : ''}`
                  : 'The plate does not satisfy every rule yet.'}
              </p>
              {result.evaluation.unmet.length > 0 ? (
                <div className="unmet-list">
                  {result.evaluation.unmet.map((item) => (
                    <span key={item}><Icon name="close" size={11} /> {item}</span>
                  ))}
                </div>
              ) : null}
              {result.evaluation.passed ? (
                <p className="muted tiny">
                  {result.evaluation.exactSolution && attempts === 1
                    ? 'Exact solution on the first try. Chef-level precision.'
                    : 'Fewer ingredients and a first-try solution earn more stars.'}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="muted small">{result?.locked ? 'Finish the previous puzzle first.' : 'Try another arrangement.'}</p>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">50 little ingredient riddles</span>
          <h1>Sushi Puzzle</h1>
          <p>Read the rules, build the plate. Every level has a solvable little answer.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="gold" icon="star">{totalStars} stars</Pill>
          <Pill tone="matcha" icon="check">{solved}/50</Pill>
        </div>
      </div>

      <Card>
        <div className="row row--between">
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>Puzzle shelf</h3>
            <p className="muted small">Stars are saved. A puzzle unlocks when the previous one has at least one star.</p>
          </div>
          <span className="display-title" style={{ fontSize: 28, color: 'var(--matcha-deep)' }}>{Math.round((totalStars / 150) * 100)}%</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <ProgressBar value={totalStars} max={150} tone="gold" showValue />
        </div>
      </Card>

      <div className="puzzle-groups">
        {[1, 2, 3, 4, 5].map((difficulty) => {
          const levels = PUZZLE_LEVELS.filter((item) => item.difficulty === difficulty);
          return (
            <div key={difficulty}>
              <SectionHead title={`Difficulty ${'★'.repeat(difficulty)}`} subtitle={`${levels.length} levels`} icon="puzzle" />
              <div className="puzzle-grid">
                {levels.map((item) => {
                  const unlocked = isUnlocked(item.number);
                  const best = save.modes.puzzles[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`puzzle-tile ${unlocked ? '' : 'is-locked'} ${best ? 'is-solved' : ''}`.trim()}
                      disabled={!unlocked}
                      onClick={() => openLevel(item.id)}
                    >
                      <span>
                        {unlocked ? item.number : <Icon name="lock" size={14} />}
                      </span>
                      <strong>{unlocked ? item.title : 'Locked'}</strong>
                      <div className="puzzle-stars-line">
                        {[1, 2, 3].map((star) => (
                          <Icon
                            key={star}
                            name="star"
                            size={11}
                            className={star <= (best?.stars ?? 0) ? 'is-filled-star' : 'is-empty-star'}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Card variant="soft">
        <div className="row">
          <Icon name="info" size={18} />
          <p className="muted small">
            Puzzle mode uses an unlimited pantry within each level’s allowed list. No mini-games, no timer, no ingredient
            cost. Use the constraints as your recipe.
          </p>
        </div>
      </Card>

      <div className="row" style={{ justifyContent: 'center' }}>
        <Button variant="ghost" size="sm" icon="home" onClick={() => navigate('/')}>Back home</Button>
      </div>
    </div>
  );
};

