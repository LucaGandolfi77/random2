import { useEffect, useMemo, useRef, useState } from 'react';
import type { Customer, Recipe } from '@/types/game';
import type { MiniGameProps } from '../types';
import { scoreDeliveryPack, scoreQuickService } from '../scoring';
import { CUSTOMERS } from '@/data/customers';
import { RECIPES } from '@/data/recipes';
import { SushiArt } from '@/components/art/SushiArt';
import { IngredientArt } from '@/components/art/IngredientArt';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { Icon } from '@/components/ui/Icon';
import { audio } from '@/audio/engine';

interface QuickRound {
  recipe: Recipe;
  customer: Customer;
  options: Recipe[];
}

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
};

const buildRounds = (): QuickRound[] => {
  const pool = RECIPES.filter((recipe) => recipe.difficulty <= 4);
  return Array.from({ length: 5 }).map(() => {
    const recipe = pool[Math.floor(Math.random() * pool.length)] ?? RECIPES[0]!;
    const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)] ?? CUSTOMERS[0]!;
    const others = shuffle(pool.filter((item) => item.id !== recipe.id)).slice(0, 2);
    return { recipe, customer, options: shuffle([recipe, ...others]) };
  });
};

export const QuickServiceGame = ({ relax, onFinish }: MiniGameProps) => {
  const rounds = useMemo(buildRounds, []);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const correct = useRef(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(performance.now());
  const finished = useRef(false);
  const current = rounds[round];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((performance.now() - start.current) / 1000);
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const seconds = (performance.now() - start.current) / 1000;
    onFinish(scoreQuickService({ correct: correct.current, total: rounds.length, seconds, limit: relax ? 999 : 30 }));
  };

  const choose = (optionId: string) => {
    if (selected || !current) return;
    const isCorrect = optionId === current.recipe.id;
    setSelected(optionId);
    if (isCorrect) {
      correct.current += 1;
      setCorrectCount(correct.current);
      void audio.playSfx('perfect');
    } else {
      void audio.playSfx('error');
    }
    window.setTimeout(() => {
      setSelected(null);
      if (round + 1 >= rounds.length) finish();
      else setRound((value) => value + 1);
    }, 420);
  };

  if (!current) return null;

  return (
    <div className="mg-game mg-quick">
      <div className="mg-quick-progress">
        {rounds.map((item, index) => (
          <span key={item.recipe.id} className={index < round ? 'is-done' : index === round ? 'is-current' : ''} />
        ))}
        <em>{elapsed.toFixed(1)}s</em>
      </div>
      <div className="mg-quick-customer">
        <div className="mg-quick-portrait">
          <CustomerPortrait customer={current.customer} size={76} mood="neutral" />
        </div>
        <div className="mg-speech">
          <span className="eyebrow">{current.customer.name}</span>
          <p>“{current.customer.greeting}”</p>
          <strong>One {current.recipe.name}, please!</strong>
        </div>
      </div>
      <div className="mg-quick-options">
        {current.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`mg-quick-option ${selected === option.id ? (option.id === current.recipe.id ? 'is-correct' : 'is-wrong') : ''}`.trim()}
            onClick={() => choose(option.id)}
            disabled={Boolean(selected)}
          >
            <SushiArt recipeId={option.id} size={88} />
            <span>{option.name}</span>
          </button>
        ))}
      </div>
      <div className="mg-meter">
        <span className="mg-meter__label">Correct dishes</span>
        <div className="mg-bar">
          <span style={{ width: `${(correctCount / rounds.length) * 100}%` }} />
        </div>
        <span className="mg-meter__value">{correctCount}/{rounds.length}</span>
      </div>
      <p className="mg-hint">Match each order to the right plate. Speed is a bonus, accuracy is the meal.</p>
    </div>
  );
};

interface BentoItem {
  id: string;
  name: string;
  w: number;
  h: number;
  recipeId?: string;
  ingredientId?: string;
  icon?: 'bento';
}

const items: BentoItem[] = [
  { id: 'onigiri', name: 'Onigiri', w: 1, h: 1, recipeId: 'onigiri' },
  { id: 'salmon_roll', name: 'Salmon roll', w: 2, h: 1, recipeId: 'salmon_avocado_roll' },
  { id: 'tamago', name: 'Tamago', w: 1, h: 1, recipeId: 'tamago_nigiri' },
  { id: 'soy', name: 'Soy sauce', w: 1, h: 1, ingredientId: 'soy_sauce' },
  { id: 'chopsticks', name: 'Chopsticks', w: 1, h: 2, icon: 'bento' },
];

interface Placement {
  itemId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DeliveryPackGame = ({ onFinish }: MiniGameProps) => {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rotated, setRotated] = useState(false);
  const [message, setMessage] = useState('Pick an item, then tap the bento.');
  const finished = useRef(false);

  const placedIds = new Set(placements.map((item) => item.itemId));
  const tray = items.filter((item) => !placedIds.has(item.id));
  const selectedItem = items.find((item) => item.id === selected);

  const dims = (item: BentoItem) => (rotated && item.w !== item.h ? { w: item.h, h: item.w } : { w: item.w, h: item.h });

  const canPlace = (x: number, y: number, w: number, h: number): boolean => {
    if (x < 0 || y < 0 || x + w > 3 || y + h > 3) return false;
    for (const placed of placements) {
      if (x < placed.x + placed.w && x + w > placed.x && y < placed.y + placed.h && y + h > placed.y) return false;
    }
    return true;
  };

  const handleCell = (x: number, y: number) => {
    const existing = placements.find((placed) => x >= placed.x && x < placed.x + placed.w && y >= placed.y && y < placed.y + placed.h);
    if (existing) {
      setPlacements((current) => current.filter((item) => item !== existing));
      setMessage('That compartment is free again.');
      return;
    }
    if (!selectedItem) {
      setMessage('Pick an item from the tray first.');
      return;
    }
    const { w, h } = dims(selectedItem);
    if (!canPlace(x, y, w, h)) {
      setMessage('It does not fit there. Try another spot or rotate it.');
      void audio.playSfx('error');
      return;
    }
    setPlacements((current) => [...current, { itemId: selectedItem.id, x, y, w, h }]);
    setSelected(null);
    setRotated(false);
    setMessage('Snug and tidy.');
    void audio.playSfx('drop');
  };

  const close = () => {
    if (finished.current) return;
    finished.current = true;
    const covered = placements.reduce((sum, item) => sum + item.w * item.h, 0);
    const unplaced = items.length - placements.length;
    onFinish(
      scoreDeliveryPack({
        coverage: covered / 9,
        overlap: 0,
        misplaced: unplaced / items.length,
      }),
    );
  };

  return (
    <div className="mg-game mg-bento-game">
      <div className="mg-bento-layout">
        <div className="mg-bento">
          <div className="mg-bento-grid">
            {Array.from({ length: 9 }).map((_, index) => {
              const x = index % 3;
              const y = Math.floor(index / 3);
              return (
                <button
                  key={index}
                  type="button"
                  className="mg-bento-cell"
                  onClick={() => handleCell(x, y)}
                  aria-label={`Bento cell ${index + 1}`}
                />
              );
            })}
          </div>
          {placements.map((placed) => {
            const item = items.find((entry) => entry.id === placed.itemId);
            return (
              <div
                key={placed.itemId}
                className="mg-bento-packed"
                style={{
                  left: `${(placed.x / 3) * 100}%`,
                  top: `${(placed.y / 3) * 100}%`,
                  width: `${(placed.w / 3) * 100}%`,
                  height: `${(placed.h / 3) * 100}%`,
                }}
              >
                {item?.recipeId ? (
                  <SushiArt recipeId={item.recipeId} size={placed.w > 1 ? 88 : 56} />
                ) : item?.ingredientId ? (
                  <IngredientArt id={item.ingredientId} size={40} animate={false} />
                ) : (
                  <Icon name="bento" size={26} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mg-bento-tray">
          <span className="eyebrow">Tray</span>
          {tray.length === 0 ? (
            <p className="muted tiny">All packed. Lovely.</p>
          ) : (
            tray.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mg-bento-item ${selected === item.id ? 'is-selected' : ''}`.trim()}
                onClick={() => {
                  setSelected(item.id);
                  setRotated(false);
                  setMessage(`${item.name} selected. Tap a cell.`);
                }}
              >
                {item.recipeId ? (
                  <SushiArt recipeId={item.recipeId} size={52} />
                ) : item.ingredientId ? (
                  <IngredientArt id={item.ingredientId} size={34} animate={false} />
                ) : (
                  <Icon name="bento" size={22} />
                )}
                <span>{item.name}</span>
                <small>{item.w}×{item.h}</small>
              </button>
            ))
          )}
          {selectedItem && selectedItem.w !== selectedItem.h ? (
            <button
              type="button"
              className="btn btn--soft btn--sm"
              onClick={() => setRotated((value) => !value)}
            >
              Rotate
            </button>
          ) : null}
        </div>
      </div>
      <div className="row row--between" style={{ width: '100%' }}>
        <div>
          <span className="eyebrow">Bento packing</span>
          <p className="muted small">{message}</p>
        </div>
        <ButtonRow
          onClear={() => {
            setPlacements([]);
            setSelected(null);
            setRotated(false);
            setMessage('Bento reset. Take your time.');
          }}
          onClose={close}
        />
      </div>
      <p className="mg-hint">Fit every item into the box. Tapping a packed compartment puts that item back on the tray.</p>
    </div>
  );
};

const ButtonRow = ({ onClear, onClose }: { onClear: () => void; onClose: () => void }) => (
  <div className="row">
    <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
      Clear
    </button>
    <button type="button" className="btn btn--primary btn--sm" onClick={onClose}>
      Close bento
    </button>
  </div>
);

