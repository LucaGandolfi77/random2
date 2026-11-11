import { useMemo } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, EmptyState, Pill, ProgressBar, SectionHead, Segmented } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { activeEventState, getUpcomingEvents } from '@/game/events/events';
import { createDailySpecial } from '@/game/events/daily';
import { generateWeeklyMissions, missionProgressLabel } from '@/game/missions/missions';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { decorationById } from '@/data/decorations';
import { dateKey } from '@/utils/dates';
import { plural } from '@/utils/format';
import { useState } from 'react';

const eventIcon = (icon: string): IconName => {
  const map: Record<string, IconName> = {
    sakura: 'leaf', sun: 'sun', maple: 'leaf', snow: 'snow', tuna: 'fish', rainbow: 'rainbow',
    moon: 'moon', chef: 'chef', cat: 'cat', bento: 'bento', question: 'info', trophy: 'trophy', fair: 'shop',
  };
  return map[icon] ?? 'sparkle';
};

export const EventsScreen = () => {
  const save = useGameStore((state) => state.save);
  const claimEventMission = useGameStore((state) => state.claimEventMission);
  const claimEventFinal = useGameStore((state) => state.claimEventFinal);
  const claimWeeklyMission = useGameStore((state) => state.claimWeeklyMission);
  const claimDailyMission = useGameStore((state) => state.claimDailyMission);
  const startDailySession = useGameStore((state) => state.startDailySession);
  const [tab, setTab] = useState<'events' | 'weekly' | 'daily'>('events');
  const now = new Date();
  const today = dateKey(now);
  const active = useMemo(() => activeEventState(save, now), [save, now]);
  const upcoming = useMemo(() => getUpcomingEvents(now, 4), [now]);
  const special = useMemo(() => createDailySpecial(today), [today]);
  const dailyCustomer = customerById(special.customerId);
  const dailyRecipe = recipeById(special.recipeId);
  const dailyDone = save.daily.completed && save.daily.dateKey === today;
  const weeklyMissions = useMemo(
    () => generateWeeklyMissions(save.weekly.weekKey, save.player.level),
    [save.weekly.weekKey, save.player.level],
  );
  const weeklyDone = weeklyMissions.filter((mission) => (save.weekly.progress[mission.id] ?? 0) >= mission.target).length;

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">The neighborhood calendar</span>
          <h1>Events & Missions</h1>
          <p>Seasonal little festivals, weekly rituals and a fresh daily plate.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="sakura" icon="flame">{save.daily.streak} streak</Pill>
        </div>
      </div>

      <Segmented
        ariaLabel="Event sections"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'events', label: 'Festivals', icon: 'calendar' },
          { id: 'weekly', label: 'Weekly', icon: 'target' },
          { id: 'daily', label: 'Daily', icon: 'sun' },
        ]}
      />

      {tab === 'events' ? (
        <>
          {active.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="The street is resting"
              message="A seasonal festival will be back soon. Meanwhile, the weekly missions are ready."
            />
          ) : (
            active.map(({ event, missions, daysRemaining, finalClaimed, allClaimed }) => {
              const entry = save.events[event.id];
              const claimedCount = missions.filter((item) => item.claimed).length;
              const progressRatio = missions.length > 0 ? claimedCount / missions.length : 0;
              return (
                <Card key={event.id} className="event-card">
                  <div
                    className="event-card__banner"
                    style={{ background: event.color, color: event.accent }}
                  >
                    <span className="event-card__icon">
                      <Icon name={eventIcon(event.icon)} size={26} />
                    </span>
                    <div>
                      <span className="eyebrow" style={{ color: 'inherit', opacity: 0.7 }}>
                        {event.type} · {daysRemaining} {plural(daysRemaining, 'day')} left
                      </span>
                      <h2>{event.name}</h2>
                      <p>{event.description}</p>
                    </div>
                  </div>
                  <div className="event-card__missions">
                    <ProgressBar value={claimedCount} max={missions.length} tone="gold" label={`${claimedCount}/${missions.length} missions claimed`} />
                    {missions.map(({ mission, progress, complete, claimed }) => {
                      const ready = complete && !claimed;
                      return (
                        <div key={mission.id} className="mission-row">
                          <span className="mission-row__icon" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 10, background: '#f3ede2', flex: '0 0 auto' }}>
                            <Icon name="target" size={15} />
                          </span>
                          <div className="mission-row__body">
                            <div className="mission-row__title">
                              <strong>{mission.title}</strong>
                              <span>{Math.min(progress, mission.target)}/{mission.target}</span>
                            </div>
                            <p className="muted tiny">{mission.description}</p>
                            <ProgressBar value={progress} max={mission.target} tone={complete ? 'gold' : 'matcha'} />
                          </div>
                          <Button
                            size="sm"
                            variant={ready ? 'gold' : 'ghost'}
                            disabled={!ready}
                            onClick={() => claimEventMission(event.id, mission.id)}
                          >
                            {claimed ? 'Claimed' : ready ? 'Claim' : `+${mission.rewardCoins}`}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="event-reward-box">
                    <div>
                      <span className="eyebrow">Complete all missions</span>
                      <div className="tag-row" style={{ marginTop: 5 }}>
                        <Pill tone="gold" icon="coin">{event.rewardCoins}</Pill>
                        <Pill tone="sakura" icon="pearl">{event.rewardPearls}</Pill>
                        {event.decorationIds.map((id) => (
                          <Pill key={id} tone="sakura" icon="plant">{decorationById(id)?.name ?? id}</Pill>
                        ))}
                        {event.recipeIds.map((id) => (
                          <Pill key={id} tone="matcha" icon="recipe">{recipeById(id)?.name ?? id}</Pill>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={allClaimed ? 'gold' : 'ghost'}
                      disabled={!allClaimed || finalClaimed}
                      icon={finalClaimed ? 'check' : 'gift'}
                      onClick={() => claimEventFinal(event.id)}
                    >
                      {finalClaimed ? 'Collected' : 'Final reward'}
                    </Button>
                  </div>
                  {allClaimed ? null : (
                    <p className="muted tiny" style={{ padding: '0 14px 12px' }}>
                      {progressRatio > 0 ? 'Almost there. The street is watching with tiny encouraging flags.' : 'Complete any event mission to begin collecting rewards.'}
                    </p>
                  )}
                </Card>
              );
            })
          )}

          <SectionHead title="Coming soon" subtitle="The calendar always has another little reason to cook" icon="calendar" />
          <div className="upcoming-list">
            {upcoming.map(({ event, days }) => (
              <div key={event.id} className="upcoming-event">
                <span className="upcoming-event__icon" style={{ background: event.color, color: event.accent }}>
                  <Icon name={eventIcon(event.icon)} size={18} />
                </span>
                <div>
                  <strong>{event.name}</strong>
                  <span>{event.description}</span>
                </div>
                <Pill tone="matcha">in {days}d</Pill>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === 'weekly' ? (
        <>
          <Card variant="soft">
            <div className="row row--between">
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>Week {save.weekly.weekKey}</h3>
                <p className="muted small">A few gentle goals that reset on Monday.</p>
              </div>
              <Pill tone="matcha" icon="target">{weeklyDone}/{weeklyMissions.length}</Pill>
            </div>
          </Card>
          <div className="shop-list">
            {weeklyMissions.map((mission) => {
              const progress = save.weekly.progress[mission.id] ?? 0;
              const claimed = save.weekly.claimed.includes(mission.id);
              const ready = progress >= mission.target;
              return (
                <Card key={mission.id} className="mission-card">
                  <div className="row row--between">
                    <div className="row">
                      <span className="tutorial-step__icon"><Icon name="target" size={18} /></span>
                      <div>
                        <strong style={{ fontSize: 12 }}>{mission.title}</strong>
                        <p className="muted tiny">{mission.description}</p>
                      </div>
                    </div>
                    <Pill tone={ready ? 'gold' : 'matcha'}>{missionProgressLabel(mission, save.weekly.progress)}</Pill>
                  </div>
                  <ProgressBar value={progress} max={mission.target} tone={ready ? 'gold' : 'matcha'} />
                  <div className="row row--between">
                    <div className="row">
                      <Pill tone="gold" icon="coin">{mission.rewardCoins}</Pill>
                      <Pill tone="sakura" icon="pearl">{mission.rewardPearls}</Pill>
                    </div>
                    <Button size="sm" variant={ready && !claimed ? 'gold' : 'ghost'} disabled={!ready || claimed} onClick={() => claimWeeklyMission(mission.id)}>
                      {claimed ? 'Claimed' : ready ? 'Claim' : 'In progress'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <Card>
            <SectionHead title="Daily missions" subtitle="A tiny checklist for today" icon="sun" />
            <div className="mission-list" style={{ marginTop: 10 }}>
              {save.missions.missions.map((mission) => {
                const progress = save.missions.progress[mission.id] ?? 0;
                const claimed = save.missions.claimed.includes(mission.id);
                const ready = progress >= mission.target;
                return (
                  <div key={mission.id} className="mission-row">
                    <div className="mission-row__body">
                      <div className="mission-row__title"><strong>{mission.title}</strong><span>{missionProgressLabel(mission, save.missions.progress)}</span></div>
                      <ProgressBar value={progress} max={mission.target} tone={ready ? 'gold' : 'matcha'} />
                    </div>
                    <Button size="sm" variant={ready && !claimed ? 'gold' : 'ghost'} disabled={!ready || claimed} onClick={() => claimDailyMission(mission.id)}>
                      {claimed ? 'Claimed' : ready ? 'Claim' : `+${mission.rewardCoins}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

      {tab === 'daily' ? (
        <>
          <Card className="daily-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <div className="daily-card__portrait">
                <CustomerPortrait customer={dailyCustomer} size={58} mood="happy" />
              </div>
              <div className="daily-card__copy">
                <span className="eyebrow">Daily Special · {today}</span>
                <h3>{dailyRecipe?.name}</h3>
                <p>
                  For {dailyCustomer?.name}. Reach at least {special.targetGrade} with the featured mini-game{' '}
                  {special.miniGameId.replace(/_/g, ' ')}.
                </p>
              </div>
            </div>
            <div className="tag-row">
              <Pill tone="gold" icon="coin">{special.rewardCoins}</Pill>
              <Pill tone="sakura" icon="pearl">{special.rewardPearls}</Pill>
              <Pill tone="matcha" icon="star">{save.daily.streak} day streak</Pill>
            </div>
            {dailyDone ? (
              <Button variant="soft" icon="check" disabled>
                Complete for today
              </Button>
            ) : (
              <Button
                variant="primary"
                icon="play"
                onClick={() => {
                  if (startDailySession()) navigate('/kitchen');
                }}
              >
                Cook today’s special
              </Button>
            )}
            <p className="muted tiny">
              The Daily Special is deterministic for the date and works offline. Complete it on consecutive days to grow
              the streak.
            </p>
          </Card>
          <Card variant="soft">
            <div className="row">
              <Icon name="info" size={18} />
              <p className="muted small">
                You can practice the featured mini-game in Zen Kitchen before starting the special. No ingredients are
                consumed in the daily pantry.
              </p>
            </div>
          </Card>
        </>
      ) : null}

      <div className="home-footer">
        <Icon name="calendar" size={13} />
        <span>Seasonal windows continue every year. Your progress and claimed rewards are saved locally.</span>
      </div>
    </div>
  );
};
