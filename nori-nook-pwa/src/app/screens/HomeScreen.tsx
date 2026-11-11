import { useMemo, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Modal, Pill, ProgressBar, SectionHead } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { RestaurantScene } from '@/components/art/RestaurantScene';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { restaurantTier } from '@/game/restaurant/decor';
import { getActiveEvents, eventDaysRemaining } from '@/game/events/events';
import { createDailySpecial } from '@/game/events/daily';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { nextStoryOrder, totalStoryProgress } from '@/game/story/story';
import { GAME_MODES } from '@/data/modes';
import { dateKey, weekdayLabel } from '@/utils/dates';
import { formatNumber, plural } from '@/utils/format';
import { missionProgressLabel } from '@/game/missions/missions';

const tutorialSteps: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'lantern',
    title: 'Welcome to your little nook',
    text: 'A tiny sushi counter, one warm lantern and a whole street to win over. Haru is already waiting.',
  },
  {
    icon: 'rice',
    title: 'Cook with your hands',
    text: 'Pick ingredients, play quick cooking mini-games, plate the dish and serve. Every plate earns coins and friendship.',
  },
  {
    icon: 'plant',
    title: 'Make it yours',
    text: 'Decorate the room, upgrade the kitchen, discover recipes and join seasonal events. Everything saves automatically and works offline.',
  },
];

const eventIcon = (icon: string): IconName => {
  const map: Record<string, IconName> = {
    sakura: 'leaf',
    sun: 'sun',
    maple: 'leaf',
    snow: 'snow',
    tuna: 'fish',
    rainbow: 'rainbow',
    moon: 'moon',
    chef: 'chef',
    cat: 'cat',
    bento: 'bento',
    question: 'info',
    trophy: 'trophy',
    fair: 'shop',
  };
  return map[icon] ?? 'sparkle';
};

const Tutorial = ({ onClose }: { onClose: () => void }) => {
  const completeTutorial = useGameStore((state) => state.completeTutorial);
  const skipTutorial = useGameStore((state) => state.skipTutorial);
  const startStorySession = useGameStore((state) => state.startStorySession);
  const save = useGameStore((state) => state.save);
  const [step, setStep] = useState(0);
  const current = tutorialSteps[step];
  const isLast = step === tutorialSteps.length - 1;

  const finish = () => {
    completeTutorial();
    onClose();
    const next = nextStoryOrder(save);
    if (next && startStorySession(next.order.id)) {
      navigate('/kitchen');
    } else {
      navigate('/story');
    }
  };

  return (
    <Modal
      open
      onClose={() => {
        skipTutorial();
        onClose();
      }}
      title={undefined}
      size="sm"
      footer={
        <div className="modal__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              skipTutorial();
              onClose();
            }}
          >
            Skip tutorial
          </Button>
          {step > 0 ? (
            <Button variant="soft" size="sm" onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            iconRight="arrowRight"
            onClick={() => {
              if (isLast) finish();
              else setStep((value) => value + 1);
            }}
          >
            {isLast ? "Let's cook" : 'Next'}
          </Button>
        </div>
      }
    >
      <div className="tutorial-steps">
        <div className="tutorial-step">
          <span className="tutorial-step__icon">
            <Icon name={current?.icon ?? 'sparkle'} size={20} />
          </span>
          <div>
            <h3>{current?.title}</h3>
            <p>{current?.text}</p>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          {tutorialSteps.map((item, index) => (
            <span
              key={item.title}
              style={{
                width: index === step ? 16 : 6,
                height: 6,
                borderRadius: 99,
                background: index === step ? 'var(--matcha-deep)' : '#ddd3c4',
                transition: 'width .2s ease',
              }}
            />
          ))}
        </div>
        <p className="muted small" style={{ textAlign: 'center' }}>
          No timers in the story. Take your time. This tutorial can be replayed in Settings.
        </p>
      </div>
    </Modal>
  );
};

export const HomeScreen = () => {
  const save = useGameStore((state) => state.save);
  const startStorySession = useGameStore((state) => state.startStorySession);
  const startDailySession = useGameStore((state) => state.startDailySession);
  const claimDailyMission = useGameStore((state) => state.claimDailyMission);
  const [tutorialOpen, setTutorialOpen] = useState(() => !save.tutorial.completed);

  const tier = restaurantTier(save);
  const story = nextStoryOrder(save);
  const storyProgress = totalStoryProgress(save);
  const daily = useMemo(() => createDailySpecial(dateKey()), []);
  const dailyCustomer = customerById(daily.customerId);
  const dailyRecipe = recipeById(daily.recipeId);
  const dailyDone = save.daily.completed && save.daily.dateKey === dateKey();
  const activeEvents = getActiveEvents();
  const activeEvent = activeEvents[0];
  const activeEventDays = activeEvent ? eventDaysRemaining(activeEvent) : 0;
  const missions = save.missions.missions;
  const missionsDone = missions.filter((mission) => (save.missions.progress[mission.id] ?? 0) >= mission.target).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const play = () => {
    if (story && startStorySession(story.order.id)) {
      navigate('/kitchen');
    } else {
      navigate('/story');
    }
  };

  return (
    <div className="screen">
      <div className="home-greeting">
        <div>
          <p>
            {weekdayLabel()} · {tier.name}
          </p>
          <h2>
            {greeting}, Little Chef.
            {story ? ' One little plate and the street gets warmer.' : ' The street already knows your name.'}
          </h2>
        </div>
        <Pill tone="matcha" icon="star">
          {storyProgress.done}/{storyProgress.total}
        </Pill>
      </div>

      <section className="home-hero" aria-label="Your restaurant">
        <RestaurantScene tier={tier} decorations={save.restaurant.decorations} compact />
        <div className="hero-petals" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="home-hero__overlay">
          <div className="home-hero__copy">
            <span className="eyebrow">Little sushi, big dreams</span>
            <h1 className="home-hero__title">Nori Nook</h1>
            <span className="home-hero__sub">
              {story ? `Next: ${story.order.objective}` : 'Your little restaurant is blooming'}
            </span>
          </div>
          <div className="home-hero__actions">
            <button type="button" className="home-hero__play" onClick={play}>
              <span>
                <Icon name="play" size={14} />
              </span>
              <span>{story ? 'Play' : 'Story map'}</span>
            </button>
          </div>
        </div>
      </section>

      <Card className="daily-card">
        <div className="daily-card__portrait">
          <CustomerPortrait customer={dailyCustomer} size={58} mood="happy" />
        </div>
        <div className="daily-card__copy">
          <div className="row row--between">
            <span className="eyebrow">Daily Special · {daily.targetGrade}</span>
            {dailyDone ? <Pill tone="matcha" icon="check">Done</Pill> : <Pill tone="gold" icon="pearl">+{daily.rewardPearls}</Pill>}
          </div>
          <h3>{dailyRecipe?.name ?? 'Today’s little plate'}</h3>
          <p>{daily.objective}</p>
          <div className="daily-card__meta">
            <Pill icon="coin">{daily.rewardCoins}</Pill>
            <Pill tone="sakura" icon="star">{save.daily.streak} day streak</Pill>
          </div>
        </div>
        <div>
          {dailyDone ? (
            <span className="daily-card__done">
              <Icon name="check" size={15} /> Tomorrow
            </span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              icon="play"
              onClick={() => {
                if (startDailySession()) navigate('/kitchen');
              }}
            >
              Cook
            </Button>
          )}
        </div>
      </Card>

      {activeEvent ? (
        <button
          type="button"
          className="event-banner"
          style={
            {
              '--event-color': activeEvent.color,
              '--event-ink': activeEvent.accent,
            } as React.CSSProperties
          }
          onClick={() => navigate('/events')}
        >
          <span className="event-banner__icon">
            <Icon name={eventIcon(activeEvent.icon)} size={21} />
          </span>
          <span className="event-banner__copy">
            <strong>{activeEvent.name}</strong>
            <span>
              {activeEventDays} {plural(activeEventDays, 'day')} left · event missions & rewards
            </span>
          </span>
          <Icon name="arrowRight" size={18} />
        </button>
      ) : null}

      <div className="quick-grid">
        <button type="button" className="quick-tile" onClick={() => navigate('/restaurant')}>
          <span className="quick-tile__icon">
            <Icon name="restaurant" size={18} />
          </span>
          Nook
        </button>
        <button type="button" className="quick-tile" onClick={() => navigate('/recipes')}>
          <span className="quick-tile__icon">
            <Icon name="recipe" size={18} />
          </span>
          Recipes
        </button>
        <button type="button" className="quick-tile" onClick={() => navigate('/shop')}>
          <span className="quick-tile__icon">
            <Icon name="shop" size={18} />
          </span>
          Shop
        </button>
        <button type="button" className="quick-tile" onClick={() => navigate('/events')}>
          <span className="quick-tile__icon">
            <Icon name="calendar" size={18} />
          </span>
          Events
        </button>
      </div>

      <Card>
        <SectionHead
          title="Today’s little missions"
          subtitle={`${missionsDone} of ${missions.length} complete`}
          icon="target"
          action={
            <button type="button" className="text-btn" onClick={() => navigate('/events')}>
              All missions <Icon name="arrowRight" size={12} />
            </button>
          }
        />
        <div className="mission-list" style={{ marginTop: 12 }}>
          {missions.map((mission) => {
            const progress = save.missions.progress[mission.id] ?? 0;
            const claimed = save.missions.claimed.includes(mission.id);
            const ready = progress >= mission.target;
            return (
              <div key={mission.id} className="mission-row">
                <span className="mission-row__icon" style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 10, background: '#f3ede2', color: 'var(--soy)', flex: '0 0 auto' }}>
                  <Icon name="target" size={16} />
                </span>
                <div className="mission-row__body">
                  <div className="mission-row__title">
                    <strong>{mission.title}</strong>
                    <span>{missionProgressLabel(mission, save.missions.progress)}</span>
                  </div>
                  <ProgressBar value={progress} max={mission.target} tone={ready ? 'gold' : 'matcha'} />
                </div>
                <Button
                  size="sm"
                  variant={ready && !claimed ? 'gold' : 'ghost'}
                  disabled={!ready || claimed}
                  onClick={() => claimDailyMission(mission.id)}
                >
                  {claimed ? 'Claimed' : ready ? 'Claim' : `+${mission.rewardCoins}`}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionHead title="Ways to play" subtitle="Every mode is a real little game" icon="sparkles" />
      <div className="mode-grid">
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className="mode-tile"
            style={
              {
                '--tile-bg': mode.bg,
                '--tile-ink': mode.color,
              } as React.CSSProperties
            }
            onClick={() => navigate(mode.path)}
          >
            <span className="mode-tile__icon">
              <Icon name={mode.icon} size={18} />
            </span>
            <span className="mode-tile__copy">
              <strong>{mode.short}</strong>
              <span>{mode.description}</span>
              {mode.id === 'daily' && !dailyDone ? <em className="mode-tile__badge">Today’s special is ready</em> : null}
              {mode.id === 'story' && story ? <em className="mode-tile__badge">Continue the journey</em> : null}
            </span>
          </button>
        ))}
      </div>

      <div className="home-footer">
        <Icon name="leaf" size={13} />
        <span>
          {formatNumber(save.player.coins)} coins · {save.discoveredRecipes.length} recipes discovered · Save is local &
          automatic
        </span>
      </div>

      {tutorialOpen && !save.tutorial.completed ? <Tutorial onClose={() => setTutorialOpen(false)} /> : null}
    </div>
  );
};
