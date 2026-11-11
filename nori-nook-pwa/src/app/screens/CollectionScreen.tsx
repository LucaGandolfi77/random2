import { useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Modal, Pill, ProgressBar, Segmented, SectionHead } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IngredientArt } from '@/components/art/IngredientArt';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { SushiArt } from '@/components/art/SushiArt';
import { DecorArt } from '@/components/art/DecorArt';
import { INGREDIENTS } from '@/data/ingredients';
import { CUSTOMERS, customerById } from '@/data/customers';
import { RECIPES } from '@/data/recipes';
import { DECORATIONS } from '@/data/decorations';
import { ACHIEVEMENTS } from '@/data/achievements';
import { ingredientById } from '@/data/ingredients';
import { achievementProgress, achievementValue } from '@/game/progression/achievements';
import { friendshipLevel } from '@/game/economy/rewards';
import { formatNumber } from '@/utils/format';

type Tab = 'recipes' | 'ingredients' | 'customers' | 'decor' | 'trophies';

export const CollectionScreen = () => {
  const save = useGameStore((state) => state.save);
  const [tab, setTab] = useState<Tab>('recipes');
  const [storyCustomer, setStoryCustomer] = useState<string | null>(null);
  const met = new Set(Object.keys(save.customers));
  for (const customer of CUSTOMERS) {
    if (save.customers[customer.id]?.visits) met.add(customer.id);
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Little treasures</span>
          <h1>Collection</h1>
          <p>Every ingredient, recipe, neighbor and tiny trophy.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="gold" icon="star">
            {Object.keys(save.achievements).length}/{ACHIEVEMENTS.length}
          </Pill>
        </div>
      </div>

      <Segmented
        ariaLabel="Collection categories"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'recipes', label: 'Recipes', icon: 'recipe' },
          { id: 'ingredients', label: 'Pantry', icon: 'rice' },
          { id: 'customers', label: 'Faces', icon: 'users' },
          { id: 'decor', label: 'Decor', icon: 'plant' },
          { id: 'trophies', label: 'Trophies', icon: 'trophy' },
        ]}
      />

      {tab === 'recipes' ? (
        <>
          <Card className="restaurant-sheet">
            <div className="row row--between">
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>The recipe shelf</h3>
                <p className="muted small">Unknown pages wait as silhouettes.</p>
              </div>
              <Button size="sm" variant="soft" icon="recipe" onClick={() => navigate('/recipes')}>
                Open book
              </Button>
            </div>
            <ProgressBar value={save.discoveredRecipes.length} max={RECIPES.length} tone="matcha" showValue />
          </Card>
          <div className="grid grid--2">
            {RECIPES.map((recipe) => {
              const known = save.discoveredRecipes.includes(recipe.id);
              return (
                <Card key={recipe.id} variant={known ? 'soft' : 'default'} style={{ padding: 8 }}>
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 80, borderRadius: 12, background: known ? '#f6efe4' : '#f3eee4' }}>
                    <SushiArt
                      recipeId={known ? recipe.id : undefined}
                      ingredients={known ? recipe.ingredients : []}
                      size={112}
                    />
                  </div>
                  <div className="row" style={{ marginTop: 6, justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 10.5 }}>{known ? recipe.name : 'Unknown'}</strong>
                    {known ? <Pill tone="matcha" icon="check">Found</Pill> : <Pill tone="danger" icon="lock">—</Pill>}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === 'ingredients' ? (
        <div className="collection-ingredients">
          {INGREDIENTS.map((ingredient) => {
            const unlocked = ingredient.unlockLevel <= save.player.level || save.bonusIngredients.includes(ingredient.id);
            const stock = save.inventory[ingredient.id]?.quantity ?? 0;
            return (
              <div key={ingredient.id} className={`collection-ingredient ${unlocked ? '' : 'is-locked'}`.trim()}>
                <IngredientArt id={ingredient.id} size={46} animate={false} />
                <div>
                  <strong>{unlocked ? ingredient.name : '???'}</strong>
                  <span>
                    {unlocked
                      ? `${stock} in pantry · ${ingredient.category}`
                      : `Unlock at level ${ingredient.unlockLevel}`}
                  </span>
                </div>
                {unlocked ? <Pill tone={stock > 0 ? 'matcha' : 'default'}>{stock}</Pill> : <Icon name="lock" size={14} />}
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'customers' ? (
        <div className="customer-collection">
          {CUSTOMERS.map((customer) => {
            const record = save.customers[customer.id];
            const known = met.has(customer.id) || Boolean(record?.visits);
            const friendship = friendshipLevel(record?.friendship ?? 0, record?.visits ?? 0);
            return (
              <Card key={customer.id} className={`customer-card ${known ? '' : 'is-locked'}`.trim()}>
                <div className="customer-card__portrait">
                  <CustomerPortrait customer={customer} size={76} mood={known ? 'happy' : 'neutral'} />
                  {!known ? <span className="customer-card__veil"><Icon name="lock" size={17} /></span> : null}
                </div>
                <div className="customer-card__copy">
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <h3>{known ? customer.name : 'A new neighbor'}</h3>
                    {customer.vip ? <Pill tone="gold" icon="crown">VIP</Pill> : null}
                    {customer.mystery ? <Pill tone="matcha" icon="eye">Mystery</Pill> : null}
                  </div>
                  <p>{known ? customer.title : 'Serve them once and their page will fill in.'}</p>
                  {known ? (
                    <>
                      <div className="tag-row">
                        {customer.preferences.slice(0, 3).map((id) => (
                          <Pill key={id} tone="matcha" icon="heart">{ingredientById(id)?.name ?? id}</Pill>
                        ))}
                        {customer.allergies.length > 0 ? (
                          <Pill tone="danger" icon="warning">Allergy: {customer.allergies.map((id) => ingredientById(id)?.name ?? id).join(', ')}</Pill>
                        ) : null}
                      </div>
                      <div className="row" style={{ marginTop: 6, gap: 6, flexWrap: 'wrap' }}>
                        <span className="tiny muted">Friendship</span>
                        <div className="friendship-dots">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <span key={index} className={index < friendship ? 'is-filled' : ''} />
                          ))}
                        </div>
                        <span className="tiny muted">{record?.visits ?? 0} visits</span>
                        <Button size="sm" variant="ghost" onClick={() => setStoryCustomer(customer.id)}>
                          Read story
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="muted tiny">Somewhere on the street, a customer is waiting for their first little plate.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === 'decor' ? (
        <>
          <Card variant="soft">
            <div className="row">
              <Icon name="plant" size={18} />
              <p className="muted small">
                {save.ownedDecorations.length} pieces owned · {save.restaurant.decorations.length} placed. Buy more in the shop.
              </p>
              <Button size="sm" variant="ghost" icon="shop" onClick={() => navigate('/shop')}>Shop</Button>
            </div>
          </Card>
          <div className="collection-decor">
            {DECORATIONS.map((decoration) => {
              const owned = save.ownedDecorations.filter((id) => id === decoration.id).length;
              const unlocked = decoration.unlockLevel <= save.player.level;
              return (
                <div key={decoration.id} className={`collection-decor__item ${owned > 0 ? '' : 'is-missing'}`.trim()}>
                  <DecorArt decoration={decoration} size={64} />
                  <strong>{unlocked ? decoration.name : '???'}</strong>
                  <span>{owned > 0 ? `×${owned}` : unlocked ? 'not owned' : `Lv ${decoration.unlockLevel}`}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === 'trophies' ? (
        <div className="shop-list">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = Boolean(save.achievements[achievement.id]);
            const value = achievementValue(save, achievement);
            return (
              <Card key={achievement.id} className={`achievement-card ${unlocked ? 'is-unlocked' : ''}`.trim()}>
                <span className="achievement-card__icon">
                  <Icon name={achievement.icon as IconName} size={22} />
                </span>
                <div className="achievement-card__copy">
                  <div className="row row--between">
                    <strong>{achievement.name}</strong>
                    <span className="tiny muted">{Math.min(value, achievement.target)}/{achievement.target}</span>
                  </div>
                  <p>{achievement.description}</p>
                  <ProgressBar value={achievementProgress(save, achievement) * 100} max={100} tone={unlocked ? 'gold' : 'matcha'} />
                  <div className="row" style={{ gap: 6 }}>
                    <Pill tone="gold" icon="coin">{achievement.rewardCoins}</Pill>
                    <Pill tone="sakura" icon="pearl">{achievement.rewardPearls}</Pill>
                    {unlocked ? <Pill tone="matcha" icon="check">Unlocked</Pill> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={Boolean(storyCustomer)}
        onClose={() => setStoryCustomer(null)}
        title={`A little page about ${storyCustomer ? customerById(storyCustomer)?.name ?? 'a neighbor' : ''}`}
        size="md"
      >
        {storyCustomer ? (
          <CustomerStory customerId={storyCustomer} save={save} />
        ) : null}
      </Modal>

      <Card variant="soft">
        <SectionHead
          title="Your little statistics"
          subtitle="A few numbers from the nook"
          icon="sparkle"
          action={<Pill tone="matcha">{formatNumber(save.stats.sushiMade)} sushi</Pill>}
        />
        <div className="stats-grid">
          <Stat label="Served" value={save.stats.customersServed} />
          <Stat label="Perfect" value={save.stats.perfects} />
          <Stat label="Masterpieces" value={save.stats.masterpieces} />
          <Stat label="Friends" value={CUSTOMERS.filter((customer) => (save.customers[customer.id]?.visits ?? 0) > 0).length} />
        </div>
      </Card>
    </div>
  );
};

const CustomerStory = ({ customerId, save }: { customerId: string; save: ReturnType<typeof useGameStore.getState>['save'] }) => {
  const customer = CUSTOMERS.find((item) => item.id === customerId);
  if (!customer) return null;
  const record = save.customers[customer.id];
  const level = friendshipLevel(record?.friendship ?? 0, record?.visits ?? 0);
  return (
    <div className="recipe-detail">
      <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <div className="customer-card__portrait">
          <CustomerPortrait customer={customer} size={82} mood="happy" />
        </div>
        <div style={{ flex: 1 }}>
          <span className="eyebrow">{customer.personality}</span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{customer.name}</h3>
          <p className="muted small">{customer.title}</p>
          <p className="muted small" style={{ marginTop: 4 }}>“{customer.greeting}”</p>
        </div>
      </div>
      <div className="tag-row">
        {customer.preferences.slice(0, 3).map((id) => (
          <Pill key={id} tone="matcha" icon="heart">{ingredientById(id)?.name ?? id}</Pill>
        ))}
        {customer.allergies.map((id) => (
          <Pill key={id} tone="danger" icon="warning">Allergy: {ingredientById(id)?.name ?? id}</Pill>
        ))}
      </div>
      <div className="col">
        <span className="eyebrow">Little friendship notes</span>
        {customer.friendship.map((line, index) => (
          <div key={line} className="recipe-step" style={{ opacity: index + 2 <= level ? 1 : 0.4 }}>
            <Icon name={index + 2 <= level ? 'heart' : 'lock'} size={13} />
            <span>{index + 2 <= level ? line : `Friendship level ${index + 2} unlocks this note.`}</span>
          </div>
        ))}
      </div>
      <p className="muted tiny">
        {record?.visits ?? 0} visits · friendship level {level}/5
        {customer.friendshipGift ? ` · gift at level 5: ${customer.friendshipGift.replace(/_/g, ' ')}` : ''}
      </p>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="stat-box">
    <strong>{formatNumber(value)}</strong>
    <span>{label}</span>
  </div>
);

