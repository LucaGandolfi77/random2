import { useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Pill, ProgressBar, SectionHead } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { NEIGHBORHOODS } from '@/data/story';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { totalStoryProgress, neighborhoodProgress, neighborhoodUnlocked, storyOrderAccessible } from '@/game/story/story';
import { decorationById } from '@/data/decorations';
import { plural } from '@/utils/format';

const hoodIcon = (atmosphere: string): IconName => {
  const map: Record<string, IconName> = {
    little_lane: 'lantern',
    sakura_street: 'leaf',
    market_district: 'bento',
    riverside: 'tea',
    night_market: 'moon',
    old_kyoto: 'lantern',
    harbor_town: 'fish',
    golden_food_street: 'crown',
  };
  return map[atmosphere] ?? 'story';
};

export const StoryScreen = () => {
  const save = useGameStore((state) => state.save);
  const startStorySession = useGameStore((state) => state.startStorySession);
  const progress = totalStoryProgress(save);
  const nextHood = NEIGHBORHOODS.find((hood) => !save.story.completedNeighborhoods.includes(hood.id));
  const [openHood, setOpenHood] = useState<string | undefined>(nextHood?.id ?? NEIGHBORHOODS[0]?.id);

  return (
    <div className="screen">
      <div className="story-hero" style={{ '--hood-color': '#607B62', '--hood-accent': '#A7B99A', '--hood-ink': '#FFFDF7' } as React.CSSProperties}>
        <div className="story-hero__copy">
          <span className="eyebrow">The Little Sushi Journey</span>
          <h1>One street,<br />one little nook.</h1>
          <p>Serve the neighborhood, follow the lanterns and make the Golden Food Street whisper your name.</p>
          <div className="story-progress">
            <span>
              {progress.done} / {progress.total} orders
            </span>
            <span className="story-progress__bar">
              <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </span>
          </div>
        </div>
        <svg className="story-hero__art" viewBox="0 0 180 150" aria-hidden="true">
          <circle cx="135" cy="42" r="24" fill="#F4C36B" opacity=".85" />
          <path d="M20 128c22-24 38-24 58-4 18-18 36-20 54-2 10-12 20-16 34-12v40H20z" fill="#F7F1E5" opacity=".2" />
          <path d="M38 128V82l18-13 18 13v46M85 128V63l22-16 22 16v65" fill="#FFFDF7" opacity=".85" />
          <rect x="49" y="98" width="10" height="16" rx="2" fill="#80614E" />
          <rect x="98" y="80" width="12" height="18" rx="2" fill="#80614E" />
          <path d="M0 128h180" stroke="#FFFDF7" strokeWidth="3" opacity=".4" />
          <circle cx="70" cy="60" r="5" fill="#EF9D91" opacity=".7" />
          <circle cx="118" cy="42" r="3" fill="#EF9D91" opacity=".7" />
          <circle cx="151" cy="92" r="4" fill="#EBC6CB" opacity=".7" />
        </svg>
      </div>

      <SectionHead title="Neighborhoods" subtitle="Finish the previous street to open the next" icon="map" />

      <div className="neighborhood-list">
        {NEIGHBORHOODS.map((hood, index) => {
          const unlocked = neighborhoodUnlocked(save, hood);
          const done = neighborhoodProgress(save, hood);
          const total = hood.orders.length;
          const complete = save.story.completedNeighborhoods.includes(hood.id);
          const isOpen = openHood === hood.id;
          return (
            <Card key={hood.id} className={`hood-card ${unlocked ? '' : 'is-locked'}`.trim()} style={{ padding: 0 }}>
              <button
                type="button"
                className="hood-card__top"
                onClick={() => setOpenHood(isOpen ? undefined : hood.id)}
                aria-expanded={isOpen}
              >
                <span
                  className="hood-card__badge"
                  style={{ '--hood-color': hood.color, '--hood-accent': hood.accent } as React.CSSProperties}
                >
                  <Icon name={unlocked ? hoodIcon(hood.atmosphere) : 'lock'} size={21} />
                </span>
                <span className="hood-card__copy">
                  <span className="eyebrow">Chapter {index + 1}</span>
                  <strong>{hood.name}</strong>
                  <span>{unlocked ? hood.subtitle : 'Finish the previous neighborhood first'}</span>
                </span>
                <span className="hood-card__progress">
                  {complete ? (
                    <Pill tone="matcha" icon="check">Complete</Pill>
                  ) : (
                    <span>{done}/{total}</span>
                  )}
                  <Icon name={isOpen ? 'back' : 'arrowRight'} size={15} style={{ transform: isOpen ? 'rotate(90deg)' : undefined }} />
                </span>
              </button>

              {isOpen && unlocked ? (
                <>
                  <div style={{ padding: '0 13px 10px' }}>
                    <p className="muted small">{hood.description}</p>
                    <div className="tag-row" style={{ marginTop: 7 }}>
                      {hood.orders
                        .map((order) => customerById(order.customerId)?.name)
                        .filter((name, itemIndex, list): name is string => Boolean(name) && list.indexOf(name) === itemIndex)
                        .map((name) => (
                          <Pill key={name} tone="sakura" icon="users">{name}</Pill>
                        ))}
                    </div>
                  </div>
                  <div className="hood-orders">
                    {hood.orders.map((order) => {
                      const customer = customerById(order.customerId);
                      const recipe = recipeById(order.recipeId);
                      const orderDone = save.story.completedOrders.includes(order.id);
                      const accessible = storyOrderAccessible(save, order);
                      return (
                        <div key={order.id} className={`story-order ${orderDone ? 'is-done' : ''}`.trim()}>
                          <span className="story-order__portrait">
                            {customer ? <CustomerPortrait customer={customer} size={40} mood={orderDone ? 'happy' : 'neutral'} /> : null}
                          </span>
                          <div className="story-order__copy">
                            <strong>{orderDone ? 'Served with love' : order.objective}</strong>
                            <span>
                              {customer?.name} · {recipe?.name}
                            </span>
                            <span className="story-order__reward">
                              <span><Icon name="coin" size={10} /> {order.rewardCoins} · XP {order.rewardXp}</span>
                            </span>
                          </div>
                          {orderDone ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (startStorySession(order.id)) navigate('/kitchen');
                              }}
                            >
                              Replay
                            </Button>
                          ) : accessible ? (
                            <Button
                              size="sm"
                              variant="primary"
                              icon="play"
                              onClick={() => {
                                if (startStorySession(order.id)) navigate('/kitchen');
                              }}
                            >
                              Cook
                            </Button>
                          ) : (
                            <span className="hud-offline" title="Finish the previous order first">
                              <Icon name="lock" size={15} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="story-reward-list">
                    <span className="eyebrow" style={{ width: '100%' }}>Chapter rewards</span>
                    {hood.rewardRecipeIds.map((id) => (
                      <Pill key={id} tone="gold" icon="recipe">{recipeById(id)?.name ?? id}</Pill>
                    ))}
                    {hood.rewardDecorationIds.map((id) => (
                      <Pill key={id} tone="sakura" icon="plant">{decorationById(id)?.name ?? id}</Pill>
                    ))}
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </div>

      {progress.done >= progress.total ? (
        <Card variant="gold" className="screen--center" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Icon name="crown" size={38} />
          <h2 style={{ marginTop: 8 }}>The whole street knows your name</h2>
          <p className="muted small">
            You finished the story. Keep cooking, discover recipes, decorate the nook and chase perfect plates.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <Button variant="gold" icon="crown" onClick={() => navigate('/restaurant')}>
              Visit your nook
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="soft">
          <div className="row">
            <Icon name="info" size={18} />
            <p className="muted small">
              Story orders are relaxed: no fail timers, no lost progress. Complete {plural(progress.total - progress.done, 'order')} to finish the journey.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
