import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Dish, RecipeIngredient, SaveGame } from '@/types/game';
import { INGREDIENTS, ingredientById } from '@/data/ingredients';
import { recipeById } from '@/data/recipes';
import { availableIngredients, shopPrice } from '@/game/ingredient-system/stock';
import { findRecipeForIngredients, makeDish, totalIngredientCount } from '@/game/sushi-making/match';
import { IngredientArt } from '@/components/art/IngredientArt';
import { SushiArt } from '@/components/art/SushiArt';
import { Button } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { audio } from '@/audio/engine';
import { clamp } from '@/utils/math';

interface SushiBuilderProps {
  save: SaveGame;
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  free: boolean;
  orderRecipeId?: string;
  allowedIds?: string[];
  actionLabel: string;
  onAction: (dish: Dish) => void;
  onBuy?: (ingredientId: string) => void;
  actionDisabled?: boolean;
  extra?: React.ReactNode;
  title?: string;
}

type Filter = 'all' | 'rice' | 'fish' | 'vegetable' | 'other';

interface DragState {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'rice', label: 'Rice' },
  { id: 'fish', label: 'Fish' },
  { id: 'vegetable', label: 'Veg' },
  { id: 'other', label: 'Pantry' },
];

export const SushiBuilder = ({
  save,
  ingredients,
  onChange,
  free,
  orderRecipeId,
  allowedIds,
  actionLabel,
  onAction,
  onBuy,
  actionDisabled,
  extra,
  title,
}: SushiBuilderProps) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [drag, setDrag] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const suppressUntil = useRef(0);
  const orderRecipe = orderRecipeId ? recipeById(orderRecipeId) : undefined;
  const dish = useMemo(() => makeDish(ingredients), [ingredients]);
  const matchedRecipe = useMemo(() => findRecipeForIngredients(ingredients), [ingredients]);
  const allowed = useMemo(() => (allowedIds ? new Set(allowedIds) : null), [allowedIds]);

  const ids = useMemo(() => {
    const unlocked = availableIngredients(save).map((item) => item.id);
    const required = orderRecipe?.ingredients.map((item) => item.id) ?? [];
    const all = new Set([...unlocked, ...(free ? required : [])]);
    return [...all].filter((id) => !allowed || allowed.has(id));
  }, [save, orderRecipe, free, allowed]);

  const trayIngredients = useMemo(
    () =>
      INGREDIENTS.filter((ingredient) => ids.includes(ingredient.id)).filter(
        (ingredient) => filter === 'all' || ingredient.category === filter,
      ),
    [ids, filter],
  );

  const total = totalIngredientCount(ingredients);
  const addIngredient = (id: string) => {
    if (total >= 8) return;
    const existing = ingredients.find((item) => item.id === id);
    const next = existing
      ? ingredients.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item))
      : [...ingredients, { id, qty: 1 }];
    onChange(next);
    void audio.playSfx('pickup');
  };

  const removeIngredient = (id: string) => {
    const existing = ingredients.find((item) => item.id === id);
    if (!existing) return;
    const next =
      existing.qty > 1
        ? ingredients.map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        : ingredients.filter((item) => item.id !== id);
    onChange(next);
    void audio.playSfx('drop');
  };

  useEffect(() => {
    if (!drag) return;
    const move = (event: globalThis.PointerEvent) => {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setDrag((current) =>
        current
          ? {
              ...current,
              x: event.clientX,
              y: event.clientY,
              moved: current.moved || Math.hypot(dx, dy) > 7,
            }
          : current,
      );
    };
    const up = (event: globalThis.PointerEvent) => {
      const current = drag;
      setDrag(null);
      const rect = boardRef.current?.getBoundingClientRect();
      const overBoard =
        rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (current.moved) {
        suppressUntil.current = Date.now() + 450;
        if (overBoard) addIngredient(current.id);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, ingredients, total]);

  const used = new Map<string, number>();
  ingredients.forEach((item) => used.set(item.id, (used.get(item.id) ?? 0) + item.qty));
  const missing = orderRecipe?.ingredients.filter((required) => (used.get(required.id) ?? 0) < required.qty) ?? [];
  const exact = orderRecipe ? ingredientKey(ingredients) === ingredientKey(orderRecipe.ingredients) : Boolean(matchedRecipe);
  const extraIngredients = orderRecipe
    ? ingredients.filter((item) => !orderRecipe.ingredients.some((required) => required.id === item.id))
    : [];

  return (
    <div className="sushi-builder">
      <div className="builder-preview-card">
        <div className="builder-preview">
          <SushiArt recipeId={dish.recipeId} ingredients={ingredients} size={230} animate={ingredients.length > 0} />
          <div className="builder-preview__name">
            <span className="eyebrow">{ingredients.length === 0 ? 'An empty little plate' : dish.custom ? 'Freeform creation' : 'Recipe matched'}</span>
            <h2>{dish.name}</h2>
            {orderRecipe ? (
              <span className={`builder-match ${exact ? 'is-match' : 'is-off'}`}>
                <Icon name={exact ? 'check' : 'info'} size={12} />
                {exact ? 'Matches the order' : 'This will be served as a freeform dish'}
              </span>
            ) : null}
            {ingredients.length > 0 ? (
              <span className={`builder-match ${exact ? 'is-match' : 'is-off'}`}>
                <Icon name={exact ? 'sparkle' : 'info'} size={12} />
                {exact ? 'Something lovely is taking shape' : 'A brave little experiment'}
              </span>
            ) : null}
          </div>
          <div className="builder-preview__count">
            <Icon name="rice" size={15} />
            {total}/8
          </div>
        </div>
        {orderRecipe ? (
          <div className="recipe-requirement">
            <span className="eyebrow">Recipe card</span>
            <div className="recipe-detail__ingredients" style={{ marginTop: 5 }}>
              {orderRecipe.ingredients.map((required) => {
                const current = used.get(required.id) ?? 0;
                const done = current >= required.qty;
                return (
                  <span key={required.id} className={`recipe-ingredient ${done ? 'is-done' : ''}`.trim()}>
                    <IngredientArt id={required.id} size={20} animate={false} />
                    {ingredientById(required.id)?.name ?? required.id}
                    <strong>{Math.min(current, required.qty)}/{required.qty}</strong>
                  </span>
                );
              })}
            </div>
            {missing.length > 0 ? (
              <p className="builder-warning">
                <Icon name="info" size={13} /> Still missing {missing.map((item) => ingredientById(item.id)?.name).join(', ')}.
              </p>
            ) : extraIngredients.length > 0 ? (
              <p className="builder-warning">
                <Icon name="warning" size={13} /> Extra ingredients will make this a freeform dish.
              </p>
            ) : null}
          </div>
        ) : null}
        {extra}
      </div>

      <div className="builder-board-wrap">
        <div ref={boardRef} className={`assembly-board ${ingredients.length > 0 ? 'has-items' : ''}`.trim()} aria-label="Sushi assembly board">
          <div className="assembly-board__label">
            <Icon name="sushi" size={15} />
            <span>{title ?? 'Assembly board'}</span>
            {ingredients.length > 0 ? (
              <button type="button" className="text-btn" onClick={() => onChange([])}>
                Clear
              </button>
            ) : null}
          </div>
          {ingredients.length === 0 ? (
            <div className="assembly-empty">
              <Icon name="drag" size={24} />
              <p>Drag an ingredient here, or tap one below.</p>
            </div>
          ) : (
            <div className="assembly-items">
              {ingredients.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="assembly-item"
                  onClick={() => removeIngredient(item.id)}
                  aria-label={`Remove one ${ingredientById(item.id)?.name ?? item.id}`}
                >
                  <IngredientArt id={item.id} size={38} animate={false} />
                  <span>{ingredientById(item.id)?.name ?? item.id}</span>
                  {item.qty > 1 ? <b>×{item.qty}</b> : null}
                  <Icon name="minus" size={12} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="builder-action">
        {orderRecipe?.requiredMiniGames ? (
          <span className="muted tiny">
            Technique comes from the mini-games. Presentation from plating.
          </span>
        ) : (
          <span className="muted tiny">Freeform dishes can reveal new recipes.</span>
        )}
        <Button
          variant="primary"
          size="lg"
          iconRight="arrowRight"
          disabled={Boolean(actionDisabled) || ingredients.length === 0}
          onClick={() => onAction(dish)}
        >
          {actionLabel}
        </Button>
      </div>

      <div className="builder-tray">
        <div className="builder-tray__head">
          <span className="eyebrow">{free ? 'Open pantry · unlimited for this mode' : 'Your pantry'}</span>
          <span className="tiny muted">{free ? 'No ingredients consumed' : 'Bought with coins'}</span>
        </div>
        <div className="builder-filters">
          {filters.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={filter === entry.id ? 'is-active' : ''}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="ingredient-tray">
          {trayIngredients.map((ingredient) => {
            const stock = save.inventory[ingredient.id]?.quantity ?? 0;
            const usedCount = used.get(ingredient.id) ?? 0;
            const canAdd = free || stock > usedCount;
            const locked = ingredient.unlockLevel > save.player.level && !save.bonusIngredients.includes(ingredient.id);
            return (
              <div key={ingredient.id} className={`ingredient-card ${canAdd ? '' : 'is-empty'}`.trim()}>
                <button
                  type="button"
                  className="ingredient-card__main"
                  disabled={!canAdd}
                  aria-label={`Add ${ingredient.name}`}
                  onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                    if (!canAdd) return;
                    setDrag({
                      id: ingredient.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      x: event.clientX,
                      y: event.clientY,
                      moved: false,
                    });
                  }}
                  onClick={() => {
                    if (Date.now() < suppressUntil.current) return;
                    if (canAdd) addIngredient(ingredient.id);
                    setDrag(null);
                  }}
                >
                  <IngredientArt id={ingredient.id} size={48} animate={false} />
                  <span>{ingredient.name}</span>
                  <small>{free ? '∞' : `${stock - usedCount} left`}</small>
                </button>
                {!free && !canAdd && !locked && onBuy ? (
                  <button
                    type="button"
                    className="ingredient-buy"
                    onClick={() => onBuy(ingredient.id)}
                  >
                    Buy {shopPrice(save, ingredient)}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {drag ? (
        <div
          className={`drag-ghost ${drag.moved ? 'is-moving' : ''}`.trim()}
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          <IngredientArt id={drag.id} size={58} animate={false} />
        </div>
      ) : null}
    </div>
  );
};

const ingredientKey = (ingredients: RecipeIngredient[]): string =>
  [...ingredients]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => `${item.id}:${item.qty}`)
    .join('|');

