import { useMemo } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Pill, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { SushiArt } from '@/components/art/SushiArt';
import { createDailySpecial } from '@/game/events/daily';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { miniGameById } from '@/data/miniGames';
import { dateKey, weekdayLabel } from '@/utils/dates';
import { usePrefs } from '@/app/prefs';

export const DailyScreen = () => {
  const save = useGameStore((state) => state.save);
  const startDailySession = useGameStore((state) => state.startDailySession);
  const noTimer = usePrefs((state) => state.noTimer);
  const today = dateKey();
  const special = useMemo(() => createDailySpecial(today), [today]);
  const customer = customerById(special.customerId);
  const recipe = recipeById(special.recipeId);
  const game = miniGameById(special.miniGameId);
  const done = save.daily.completed && save.daily.dateKey === today;

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">{weekdayLabel()} · {today}</span>
          <h1>Daily Special</h1>
          <p>One little challenge, the same for every Nori Nook in the world.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="sakura" icon="flame">{save.daily.streak} day streak</Pill>
        </div>
      </div>

      <Card className="daily-special-hero">
        <div className="daily-special-hero__top">
          <div className="daily-special-hero__portrait">
            <CustomerPortrait customer={customer} size={98} mood={done ? 'perfect' : 'happy'} />
          </div>
          <div>
            <span className="eyebrow">Featured dish</span>
            <h2>{recipe?.name}</h2>
            <p className="muted small">{special.objective}</p>
            <div className="tag-row" style={{ marginTop: 7 }}>
              <Pill tone="gold" icon="coin">{special.rewardCoins}</Pill>
              <Pill tone="sakura" icon="pearl">{special.rewardPearls}</Pill>
              <Pill tone="matcha" icon="target">{special.targetGrade}+</Pill>
            </div>
          </div>
        </div>
        <div className="daily-special-hero__dish">
          <SushiArt recipeId={recipe?.id} ingredients={recipe?.ingredients} size={250} animate />
        </div>
        <div className="daily-special-hero__meta">
          <div className="row">
            <span className="pill pill--matcha" style={{ padding: '7px 11px' }}>
              <Icon name="target" size={14} /> Featured mini-game
            </span>
            <strong style={{ fontSize: 12 }}>{game?.name}</strong>
          </div>
          <span className="muted tiny">{game?.short}</span>
        </div>
        {done ? (
          <div className="daily-done">
            <Icon name="check" size={24} />
            <div>
              <strong>Today’s special is complete</strong>
              <p>Your streak is safe. A fresh challenge arrives tomorrow.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>Event center</Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon="play"
            onClick={() => {
              if (startDailySession()) navigate('/kitchen');
            }}
          >
            Cook the Daily Special
          </Button>
        )}
      </Card>

      <Card>
        <SectionHead title="How the daily works" subtitle="Deterministic, offline and kind" icon="calendar" />
        <div className="daily-rules">
          <div>
            <span><Icon name="check" size={14} /></span>
            <p>The recipe, customer, mini-game and target are generated from today’s date. Everyone sees the same special.</p>
          </div>
          <div>
            <span><Icon name="leaf" size={14} /></span>
            <p>The daily pantry provides the ingredients for free. You only need to cook and reach the target grade.</p>
          </div>
          <div>
            <span><Icon name="flame" size={14} /></span>
            <p>Complete consecutive days to grow the streak. No reward is lost if you take a day off.</p>
          </div>
          <div>
            <span><Icon name="wifi" size={14} /></span>
            <p>Everything is local. The special still works offline and does not need an account.</p>
          </div>
        </div>
        {noTimer ? (
          <p className="muted tiny" style={{ marginTop: 8 }}>
            Relaxed mini-games are enabled. The Daily Special mini-game has no timing pressure.
          </p>
        ) : null}
      </Card>

      <Card variant="soft" className="screen--center" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Icon name="sparkle" size={26} />
        <h3 style={{ marginTop: 5 }}>{recipe?.name} for {customer?.name}</h3>
        <p className="muted small">{recipe?.description}</p>
        <div className="tag-row" style={{ justifyContent: 'center' }}>
          <Button size="sm" variant="ghost" icon="recipe" onClick={() => navigate('/recipes')}>
            View recipe book
          </Button>
          <Button size="sm" variant="ghost" icon="target" onClick={() => navigate('/events')}>
            Weekly missions
          </Button>
        </div>
      </Card>
    </div>
  );
};
