import { useMemo, useState } from 'react';
import { useGameStore } from '@/app/store';
import { Button, Card, Pill, ProgressBar, Segmented } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IngredientArt } from '@/components/art/IngredientArt';
import { DecorArt } from '@/components/art/DecorArt';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { INGREDIENTS } from '@/data/ingredients';
import { UPGRADES } from '@/data/upgrades';
import { DECORATIONS, DECORATION_STYLES } from '@/data/decorations';
import { STAFF } from '@/data/staff';
import {
  canBuyIngredient,
  inventoryCapacity,
  shopPrice,
  usedInventorySlots,
} from '@/game/ingredient-system/stock';
import { availableDecorationCount, ownedDecorationCount } from '@/game/restaurant/decor';
import { formatNumber } from '@/utils/format';

type ShopTab = 'ingredients' | 'upgrades' | 'decorations' | 'staff';
type IngredientFilter = 'all' | 'rice' | 'fish' | 'vegetable' | 'other' | 'premium';
type DecorFilter = 'all' | (typeof DECORATION_STYLES)[number]['id'];

export const ShopScreen = () => {
  const save = useGameStore((state) => state.save);
  const buyIngredientAction = useGameStore((state) => state.buyIngredientAction);
  const buyUpgradeAction = useGameStore((state) => state.buyUpgradeAction);
  const buyDecorationAction = useGameStore((state) => state.buyDecorationAction);
  const hireStaffAction = useGameStore((state) => state.hireStaffAction);
  const pushToast = useGameStore((state) => state.pushToast);
  const [tab, setTab] = useState<ShopTab>('ingredients');
  const [ingredientFilter, setIngredientFilter] = useState<IngredientFilter>('all');
  const [decorFilter, setDecorFilter] = useState<DecorFilter>('all');

  const ingredients = useMemo(
    () =>
      INGREDIENTS.filter((ingredient) => ingredientFilter === 'all' || ingredient.category === ingredientFilter),
    [ingredientFilter],
  );
  const decorations = useMemo(
    () => DECORATIONS.filter((item) => decorFilter === 'all' || item.style === decorFilter),
    [decorFilter],
  );

  const buyIngredient = (id: string, quantity: number) => {
    const result = buyIngredientAction(id, quantity);
    if (!result.ok) {
      pushToast({ title: 'Could not restock', message: result.reason ?? 'Try again in a moment.', tone: 'pink', icon: 'warning' });
    }
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Little street shop</span>
          <h1>Nook Supplies</h1>
          <p>Ingredients, kitchen upgrades, decorations and friendly faces.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="gold" icon="coin">{formatNumber(save.player.coins)}</Pill>
          <Pill tone="sakura" icon="pearl">{formatNumber(save.player.pearls)}</Pill>
        </div>
      </div>

      <Segmented
        ariaLabel="Shop categories"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'ingredients', label: 'Pantry', icon: 'fish' },
          { id: 'upgrades', label: 'Upgrades', icon: 'edit' },
          { id: 'decorations', label: 'Decor', icon: 'plant' },
          { id: 'staff', label: 'Staff', icon: 'users' },
        ]}
      />

      {tab === 'ingredients' ? (
        <>
          <Card className="restaurant-sheet">
            <div className="row row--between">
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Kitchen pantry</h3>
                <p className="muted small">
                  {usedInventorySlots(save)} / {inventoryCapacity(save)} storage stacks · freshness never drops while you are away.
                </p>
              </div>
              <Icon name="rice" size={28} />
            </div>
            <ProgressBar
              value={usedInventorySlots(save)}
              max={inventoryCapacity(save)}
              tone="matcha"
              label="Storage"
              showValue
            />
          </Card>
          <Segmented
            ariaLabel="Ingredient categories"
            value={ingredientFilter}
            onChange={setIngredientFilter}
            options={[
              { id: 'all', label: 'All' },
              { id: 'rice', label: 'Rice' },
              { id: 'fish', label: 'Fish' },
              { id: 'vegetable', label: 'Veg' },
              { id: 'other', label: 'Pantry' },
              { id: 'premium', label: 'Premium' },
            ]}
          />
          <div className="shop-list">
            {ingredients.map((ingredient) => {
              const stock = save.inventory[ingredient.id];
              const locked = ingredient.unlockLevel > save.player.level && !save.bonusIngredients.includes(ingredient.id);
              const price = shopPrice(save, ingredient);
              const canBuy = canBuyIngredient(save, ingredient.id, 1);
              return (
                <div key={ingredient.id} className="shop-item">
                  <div className="shop-item__art">
                    <IngredientArt id={ingredient.id} size={48} animate={false} />
                  </div>
                  <div className="shop-item__copy">
                    <div className="row">
                      <strong>{ingredient.name}</strong>
                      {ingredient.premium ? <Pill tone="gold" icon="sparkle">Premium</Pill> : null}
                      {ingredient.seasonal ? <Pill tone="sakura">{ingredient.seasonal}</Pill> : null}
                    </div>
                    <p>{ingredient.description}</p>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="price"><Icon name="coin" size={13} /> {price}</span>
                      <span className="muted tiny">
                        Stock {stock?.quantity ?? 0}
                        {ingredient.perishable ? ` · fresh ${Math.round(stock?.freshness ?? 100)}%` : ''}
                      </span>
                      {locked ? <Pill tone="danger" icon="lock">Level {ingredient.unlockLevel}</Pill> : null}
                    </div>
                  </div>
                  <div className="shop-item__actions">
                    {locked ? (
                      <span className="tiny muted">Locked</span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="soft"
                          disabled={!canBuy.ok}
                          onClick={() => buyIngredient(ingredient.id, 1)}
                        >
                          +1
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!canBuyIngredient(save, ingredient.id, 5).ok}
                          onClick={() => buyIngredient(ingredient.id, 5)}
                        >
                          +5
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === 'upgrades' ? (
        <div className="shop-list">
          {UPGRADES.map((upgrade) => {
            const level = save.restaurant.upgrades[upgrade.id] ?? 0;
            const maxed = level >= upgrade.maxLevel;
            const cost = maxed ? null : upgrade.costs[level];
            const disabled = maxed || cost === undefined || cost === null || save.player.coins < cost;
            return (
              <Card key={upgrade.id} className="upgrade-card">
                <div className="upgrade-card__head">
                  <span className="upgrade-card__icon">
                    <Icon name={levelIcon(upgrade.effect)} size={22} />
                  </span>
                  <div className="upgrade-card__copy">
                    <div className="row" style={{ flexWrap: 'wrap' }}>
                      <h3>{upgrade.name}</h3>
                      <Pill tone={maxed ? 'gold' : 'matcha'}>Lv {level}/{upgrade.maxLevel}</Pill>
                    </div>
                    <p>{upgrade.description}</p>
                    <span className="tiny muted">{upgrade.effectLabel}</span>
                  </div>
                </div>
                <div className="upgrade-card__levels">
                  {Array.from({ length: upgrade.maxLevel }).map((_, index) => (
                    <span key={index} className={index < level ? 'is-filled' : ''} />
                  ))}
                </div>
                <div className="row row--between" style={{ marginTop: 9 }}>
                  <span className="price">
                    {maxed ? 'Fully upgraded' : <><Icon name="coin" size={14} /> {cost}</>}
                  </span>
                  <Button
                    size="sm"
                    variant={maxed ? 'ghost' : 'primary'}
                    disabled={disabled}
                    onClick={() => {
                      const result = buyUpgradeAction(upgrade.id);
                      if (!result.ok) {
                        pushToast({
                          title: 'Could not upgrade',
                          message: result.reason ?? 'Try again.',
                          tone: 'pink',
                          icon: 'warning',
                        });
                      }
                    }}
                  >
                    {maxed ? 'Complete' : 'Upgrade'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === 'decorations' ? (
        <>
          <div className="style-chips">
            {DECORATION_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                className={`style-chip ${decorFilter === style.id ? 'is-active' : ''}`.trim()}
                onClick={() => setDecorFilter(style.id)}
              >
                <span style={{ background: style.color }} />
                {style.name}
              </button>
            ))}
            <button
              type="button"
              className={`style-chip ${decorFilter === 'all' ? 'is-active' : ''}`.trim()}
              onClick={() => setDecorFilter('all')}
            >
              All styles
            </button>
          </div>
          <div className="decor-shop-grid">
            {decorations.map((decoration) => {
              const owned = ownedDecorationCount(save, decoration.id);
              const available = availableDecorationCount(save, decoration.id);
              const locked = decoration.unlockLevel > save.player.level;
              const disabled = locked || save.player.coins < decoration.price;
              return (
                <div key={decoration.id} className="decor-shop-card">
                  <div className="decor-shop-card__art">
                    <DecorArt decoration={decoration} size={74} />
                    {owned > 0 ? <span className="decor-owned">×{owned}{available > 0 ? ` · ${available} free` : ''}</span> : null}
                  </div>
                  <div className="decor-shop-card__copy">
                    <strong>{decoration.name}</strong>
                    <span>{decoration.description}</span>
                    <div className="tag-row">
                      <Pill tone="matcha">+{decoration.ambiance} ambiance</Pill>
                      <Pill>{decoration.style}</Pill>
                    </div>
                  </div>
                  <div className="row row--between">
                    <span className="price"><Icon name="coin" size={13} /> {decoration.price}</span>
                    <Button
                      size="sm"
                      variant={owned > 0 ? 'soft' : 'primary'}
                      disabled={disabled}
                      onClick={() => {
                        const result = buyDecorationAction(decoration.id);
                        if (!result.ok) {
                          pushToast({
                            title: 'Could not buy decoration',
                            message: result.reason ?? 'Try again.',
                            tone: 'pink',
                            icon: 'warning',
                          });
                        }
                      }}
                    >
                      {locked ? `Level ${decoration.unlockLevel}` : 'Buy'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === 'staff' ? (
        <>
          <Card variant="soft">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Icon name="friends" size={20} />
              <p className="muted small">
                Staff members help with real little bonuses, but the kitchen stays yours. You can hire each person once with
                coins and pearls.
              </p>
            </div>
          </Card>
          <div className="shop-list">
            {STAFF.map((member) => {
              const hired = save.staff.hired.includes(member.id);
              const disabled = hired || save.player.coins < member.cost || save.player.pearls < member.pearlCost;
              return (
                <Card key={member.id} className="staff-card">
                  <div className="staff-card__portrait">
                    <CustomerPortrait config={member.portrait} size={74} mood="happy" />
                  </div>
                  <div className="staff-card__copy">
                    <div className="row" style={{ flexWrap: 'wrap' }}>
                      <h3>{member.name}</h3>
                      <Pill tone="matcha">{member.role}</Pill>
                      {hired ? <Pill tone="gold" icon="check">On the team</Pill> : null}
                    </div>
                    <p>{member.bio}</p>
                    <span className="staff-effect"><Icon name="sparkle" size={12} /> {member.effectLabel}</span>
                    <p className="muted tiny">“{member.line}”</p>
                  </div>
                  <div className="staff-card__actions">
                    <span className="price"><Icon name="coin" size={13} /> {member.cost}</span>
                    <span className="price"><Icon name="pearl" size={13} /> {member.pearlCost}</span>
                    <Button
                      size="sm"
                      variant={hired ? 'ghost' : 'secondary'}
                      disabled={disabled}
                      onClick={() => {
                        const result = hireStaffAction(member.id);
                        if (!result.ok) {
                          pushToast({
                            title: 'Could not hire',
                            message: result.reason ?? 'Try again.',
                            tone: 'pink',
                            icon: 'warning',
                          });
                        }
                      }}
                    >
                      {hired ? 'Hired' : 'Hire'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
};

const levelIcon = (effect: string): IconName => {
  switch (effect) {
    case 'mini_game_bonus':
      return 'rice';
    case 'slice_bonus':
      return 'fish';
    case 'freshness_protection':
      return 'leaf';
    case 'inventory_capacity':
      return 'shop';
    case 'ambiance':
      return 'plant';
    case 'rush_seconds':
      return 'clock';
    case 'rush_slots':
      return 'restaurant';
    case 'patience_bonus':
      return 'users';
    case 'delivery_bonus':
      return 'bento';
    default:
      return 'sparkle';
  }
};

