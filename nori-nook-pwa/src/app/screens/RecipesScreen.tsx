import { useMemo, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, EmptyState, Modal, Pill, ProgressBar, SectionHead, Segmented } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { SushiArt } from '@/components/art/SushiArt';
import { IngredientArt } from '@/components/art/IngredientArt';
import { RECIPES, recipeById } from '@/data/recipes';
import { ingredientById } from '@/data/ingredients';
import { miniGameById } from '@/data/miniGames';
import { formatNumber } from '@/utils/format';

type Filter = 'all' | 'nigiri' | 'rolls' | 'bowls' | 'other';

const matchesFilter = (category: string, filter: Filter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'nigiri') return category === 'nigiri' || category === 'gunkan';
  if (filter === 'rolls') return category === 'roll' || category === 'maki';
  if (filter === 'bowls') return category === 'bowl';
  return category === 'onigiri' || category === 'special';
};

export const RecipesScreen = () => {
  const save = useGameStore((state) => state.save);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const discovered = save.discoveredRecipes;
  const unlockedRecipes = RECIPES.filter(
    (recipe) => recipe.unlockLevel <= save.player.level || save.bonusRecipes.includes(recipe.id),
  );
  const list = useMemo(
    () =>
      RECIPES.filter((recipe) => matchesFilter(recipe.category, filter)).sort((a, b) => {
        const aKnown = discovered.includes(a.id) ? 0 : 1;
        const bKnown = discovered.includes(b.id) ? 0 : 1;
        return aKnown - bKnown || a.unlockLevel - b.unlockLevel || a.name.localeCompare(b.name);
      }),
    [filter, discovered],
  );
  const selectedRecipe = selected ? recipeById(selected) : undefined;
  const selectedKnown = selectedRecipe ? discovered.includes(selectedRecipe.id) : false;
  const selectedUnlocked = selectedRecipe
    ? selectedRecipe.unlockLevel <= save.player.level || save.bonusRecipes.includes(selectedRecipe.id)
    : false;

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">The illustrated recipe book</span>
          <h1>Recipe Book</h1>
          <p>{discovered.length} of {RECIPES.length} little recipes discovered.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="matcha" icon="recipe">{unlockedRecipes.length} available</Pill>
        </div>
      </div>

      <Card>
        <div className="row row--between">
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>Discovery progress</h3>
            <p className="muted small">Cook a recipe for the first time to fill its page.</p>
          </div>
          <span className="display-title" style={{ fontSize: 30, color: 'var(--matcha-deep)' }}>
            {Math.round((discovered.length / RECIPES.length) * 100)}%
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <ProgressBar value={discovered.length} max={RECIPES.length} tone="matcha" />
        </div>
      </Card>

      <Segmented
        ariaLabel="Recipe categories"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All' },
          { id: 'nigiri', label: 'Nigiri' },
          { id: 'rolls', label: 'Rolls' },
          { id: 'bowls', label: 'Bowls' },
          { id: 'other', label: 'Other' },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState icon="recipe" title="No recipes in this shelf" message="Try another category." />
      ) : (
        <div className="recipe-grid">
          {list.map((recipe) => {
            const known = discovered.includes(recipe.id);
            const available = recipe.unlockLevel <= save.player.level || save.bonusRecipes.includes(recipe.id);
            return (
              <button
                key={recipe.id}
                type="button"
                className={`recipe-card ${known ? '' : 'is-locked'}`.trim()}
                onClick={() => setSelected(recipe.id)}
                aria-label={known ? recipe.name : 'Undiscovered recipe'}
              >
                <span className="recipe-card__art">
                  <SushiArt
                    recipeId={known ? recipe.id : undefined}
                    ingredients={known ? recipe.ingredients : []}
                    size={120}
                  />
                  {!known ? (
                    <span style={{ position: 'absolute', display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,253,247,.85)', color: 'var(--soy)' }}>
                      <Icon name="lock" size={16} />
                    </span>
                  ) : null}
                </span>
                <span className="recipe-card__name">{known ? recipe.name : 'Mystery recipe'}</span>
                <span className="recipe-card__meta">
                  <span>{known ? recipe.category : available ? 'Available' : `Level ${recipe.unlockLevel}`}</span>
                  <span>{'★'.repeat(recipe.difficulty)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="home-footer">
        <Icon name="info" size={13} />
        <span>New recipes can be discovered in story orders, Zen Kitchen or free experiments.</span>
      </div>

      <Modal
        open={Boolean(selectedRecipe)}
        onClose={() => setSelected(null)}
        title={selectedKnown ? selectedRecipe?.name : 'A mystery page'}
        size="md"
        footer={
          <div className="modal__actions">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button
              variant="primary"
              icon="leaf"
              onClick={() => {
                setSelected(null);
                navigate('/zen');
              }}
            >
              Practice in Zen
            </Button>
          </div>
        }
      >
        {selectedRecipe ? (
          <div className="recipe-detail">
            <div className="recipe-detail__hero">
              <SushiArt
                recipeId={selectedKnown ? selectedRecipe.id : undefined}
                ingredients={selectedKnown ? selectedRecipe.ingredients : []}
                size={250}
                animate
              />
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Pill tone="matcha" icon="recipe">{selectedRecipe.category}</Pill>
              <Pill tone="gold" icon="star">Difficulty {selectedRecipe.difficulty}</Pill>
              <Pill tone="sakura" icon="coin">{selectedRecipe.baseReward} base</Pill>
              {!selectedUnlocked ? <Pill tone="danger" icon="lock">Level {selectedRecipe.unlockLevel}</Pill> : null}
              {selectedKnown ? <Pill tone="matcha" icon="check">Discovered</Pill> : null}
            </div>
            <p className="modal-copy">
              {selectedKnown
                ? selectedRecipe.description
                : 'This page is still a silhouette. Experiment with ingredients or follow a story order to coax it into the book.'}
            </p>
            {selectedKnown ? (
              <>
                <div>
                  <span className="eyebrow">Ingredients</span>
                  <div className="recipe-detail__ingredients" style={{ marginTop: 6 }}>
                    {selectedRecipe.ingredients.map((item) => {
                      const ingredient = ingredientById(item.id);
                      return (
                        <span key={item.id} className="recipe-ingredient">
                          <IngredientArt id={item.id} size={20} animate={false} />
                          {ingredient?.name ?? item.id}
                          {item.qty > 1 ? ` ×${item.qty}` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="eyebrow">Preparation</span>
                  <div className="recipe-detail__steps" style={{ marginTop: 6 }}>
                    {selectedRecipe.requiredMiniGames.map((gameId, index) => {
                      const game = miniGameById(gameId);
                      return (
                        <div key={gameId} className="recipe-step">
                          <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 8, background: '#fffdf7', fontSize: 10 }}>
                            {index + 1}
                          </span>
                          <span style={{ flex: 1 }}>{game?.name ?? gameId}</span>
                          <span className="muted tiny">{game?.short}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {save.recipeDiscovery[selectedRecipe.id] ? (
                  <p className="muted tiny">
                    First discovered {new Date(save.recipeDiscovery[selectedRecipe.id] ?? 0).toLocaleDateString()}.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                <Icon name="info" size={16} />
                <p className="muted small">
                  The pantry is open in Zen Kitchen. Mix ingredients, keep notes, and the book will fill itself.
                </p>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted tiny" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <Icon name="coin" size={12} /> {formatNumber(save.player.coins)} coins
              </span>
              <span className="muted tiny">Save is automatic</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
