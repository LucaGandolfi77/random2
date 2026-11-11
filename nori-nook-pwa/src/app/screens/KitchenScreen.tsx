import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { usePrefs } from '@/app/prefs';
import { Button, Card, ConfirmDialog, Modal, Pill, ProgressBar } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { SushiBuilder } from '@/components/game/SushiBuilder';
import { PlateBoard } from '@/components/game/PlateBoard';
import { ResultModal } from '@/components/game/ResultModal';
import { MiniGameHost } from '@/game/mini-games/MiniGameHost';
import { MINI_GAMES, miniGameById } from '@/data/miniGames';
import { recipeById } from '@/data/recipes';
import { makeDish } from '@/game/sushi-making/match';
import { ingredientById } from '@/data/ingredients';
import { customerById } from '@/data/customers';
import { CHEF_BY_ID } from '@/data/chefs';
import { createDailySpecial } from '@/game/events/daily';
import { miniGameAssistBonus } from '@/game/mini-games/scoring';
import { dateKey } from '@/utils/dates';
import { formatTime } from '@/utils/format';
import type { Dish, MiniGameId, RecipeIngredient } from '@/types/game';

type Phase = 'brief' | 'minigames' | 'assemble' | 'plate';

const modeBackPath = (mode: string | undefined): string => {
  switch (mode) {
    case 'story':
      return '/story';
    case 'daily':
      return '/events';
    case 'chef':
      return '/chef';
    case 'rush':
      return '/rush';
    case 'endless':
      return '/endless';
    case 'delivery':
      return '/delivery';
    default:
      return '/';
  }
};

const modeLabel = (mode: string | undefined, zen: boolean): string => {
  if (zen) return 'Zen kitchen';
  switch (mode) {
    case 'story':
      return 'Story order';
    case 'daily':
      return 'Daily special';
    case 'chef':
      return 'Chef challenge';
    case 'rush':
      return 'Lunch rush';
    case 'endless':
      return 'Endless service';
    case 'delivery':
      return 'Delivery dash';
    default:
      return 'Kitchen';
  }
};

export const KitchenScreen = () => {
  const save = useGameStore((state) => state.save);
  const session = useGameStore((state) => state.session);
  const run = useGameStore((state) => state.run);
  const lastResult = useGameStore((state) => state.lastResult);
  const recordMiniGame = useGameStore((state) => state.recordMiniGame);
  const recordPracticeMiniGame = useGameStore((state) => state.recordPracticeMiniGame);
  const abandonSession = useGameStore((state) => state.abandonSession);
  const serveDish = useGameStore((state) => state.serveDish);
  const buyIngredientAction = useGameStore((state) => state.buyIngredientAction);
  const pushToast = useGameStore((state) => state.pushToast);
  const clearLastResult = useGameStore((state) => state.clearLastResult);
  const startChefSession = useGameStore((state) => state.startChefSession);
  const noTimer = usePrefs((state) => state.noTimer);

  const [phase, setPhase] = useState<Phase>('brief');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [activeMini, setActiveMini] = useState<MiniGameId | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceGame, setPracticeGame] = useState<MiniGameId | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [plateBusy, setPlateBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!session) return;
    setPhase(session.order ? 'brief' : 'assemble');
    setIngredients([]);
    setActiveMini(null);
    setPracticeGame(null);
  }, [session?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!lastResult) return;
    setPlateBusy(false);
  }, [lastResult]);

  const order = session?.order;
  const recipe = order ? recipeById(order.recipeId) : undefined;
  const customer = order ? customerById(order.customerId) : undefined;
  const challenge = session?.chefId ? CHEF_BY_ID.get(session.chefId) : undefined;
  const zen = session?.mode === 'zen';
  const dailySpecial = useMemo(() => createDailySpecial(dateKey()), []);
  const completedGames = session?.completedMiniGames ?? [];
  const allMiniDone = (session?.miniGames.length ?? 0) === 0 || (session?.miniGames ?? []).every((id) => completedGames.some((result) => result.gameId === id));
  const miniProgress = session?.miniGames.length ? completedGames.length / session.miniGames.length : 1;
  const challengeRemaining = challenge ? challenge.timeLimit - Math.floor((now - (session?.startedAt ?? now)) / 1000) : null;
  const challengeExpired = Boolean(challenge) && !noTimer && (challengeRemaining ?? 0) <= 0;
  const runRemaining =
    run && (run.mode === 'rush' || run.mode === 'delivery')
      ? Math.max(0, Math.ceil((run.startedAt + run.durationMs - now) / 1000))
      : null;

  const finishResult = () => {
    const mode = lastResult?.mode;
    const free = lastResult?.kind === 'free';
    clearLastResult();
    if (free) {
      setIngredients([]);
      setPhase('assemble');
      return;
    }
    navigate(modeBackPath(mode));
  };

  const leaveKitchen = () => {
    const mode = session?.mode;
    abandonSession();
    navigate(modeBackPath(mode));
  };

  const handleMiniComplete = (score: number) => {
    if (!activeMini) return;
    recordMiniGame({ gameId: activeMini, score });
    setActiveMini(null);
  };

  const skipRemaining = () => {
    if (!session) return;
    session.miniGames.forEach((gameId) => {
      if (!completedGames.some((result) => result.gameId === gameId)) {
        recordMiniGame({ gameId, score: 55 });
      }
    });
  };

  const handleBuy = (ingredientId: string) => {
    const result = buyIngredientAction(ingredientId, 1);
    if (!result.ok) {
      pushToast({
        title: 'Could not restock',
        message: result.reason ?? 'The shop is taking a tiny break.',
        tone: 'pink',
        icon: 'warning',
      });
    }
  };

  const serve = (dish: Dish, score: number) => {
    if (challengeExpired) {
      pushToast({ title: 'Time is up', message: 'The challenge timer has ended. Try again or leave the kitchen.', tone: 'pink', icon: 'clock' });
      return;
    }
    if (customer) {
      const allergens = dish.ingredients
        .map((item) => item.id)
        .filter((id) => customer.allergies.includes(id));
      if (allergens.length > 0) {
        pushToast({
          title: 'Allergy warning',
          message: `${customer.name} must avoid this ingredient. Please rebuild the plate.`,
          tone: 'pink',
          icon: 'warning',
        });
        setPhase('assemble');
        return;
      }
    }
    setPlateBusy(true);
    const result = serveDish(dish, score);
    if (!result.ok) {
      setPlateBusy(false);
      pushToast({
        title: 'The plate could not be served',
        message: result.error ?? 'Please check the ingredients and try again.',
        tone: 'pink',
        icon: 'warning',
      });
    }
  };

  if (!session && !lastResult) {
    return (
      <div className="screen screen--center kitchen-empty">
        <div className="empty-state">
          <span className="empty-state__icon"><Icon name="rice" size={30} /></span>
          <h2>The kitchen is quiet</h2>
          <p>Choose an order from the story, a mode or the Zen kitchen to start cooking.</p>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" icon="story" onClick={() => navigate('/story')}>Story orders</Button>
            <Button variant="soft" icon="leaf" onClick={() => navigate('/zen')}>Zen kitchen</Button>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex = zen ? 0 : phase === 'brief' ? 0 : phase === 'minigames' ? 1 : phase === 'assemble' ? 2 : 3;
  const steps = zen ? ['Free pantry', 'Assemble', 'Plate'] : ['Brief', 'Prep mini-games', 'Assemble', 'Plate'];

  return (
    <div className="screen kitchen-screen">
      <div className="kitchen-topbar">
        <button type="button" className="text-btn" onClick={() => setLeaveOpen(true)}>
          <Icon name="back" size={15} /> Leave kitchen
        </button>
        <div className="row">
          <span className="pill pill--matcha">{modeLabel(session?.mode, zen)}</span>
          {runRemaining !== null ? <span className={`pill ${runRemaining < 15 ? 'pill--danger' : 'pill--gold'}`}><Icon name="clock" size={12} /> {formatTime(runRemaining)}</span> : null}
          {challengeRemaining !== null && !noTimer ? (
            <span className={`pill ${challengeExpired ? 'pill--danger' : 'pill--gold'}`}>
              <Icon name="clock" size={12} /> {challengeExpired ? 'Time up' : formatTime(challengeRemaining)}
            </span>
          ) : null}
          {run?.mode === 'endless' ? <span className="pill pill--sakura"><Icon name="heart" size={12} /> {run.hearts}</span> : null}
        </div>
      </div>

      <div className="kitchen-steps">
        {steps.map((step, index) => (
          <div key={step} className={`kitchen-step ${index === stepIndex ? 'is-current' : index < stepIndex ? 'is-done' : ''}`.trim()}>
            <span>{index < stepIndex ? <Icon name="check" size={11} /> : index + 1}</span>
            <em>{step}</em>
          </div>
        ))}
      </div>

      {challengeExpired ? (
        <Card variant="sakura" className="challenge-expired">
          <div className="row">
            <Icon name="clock" size={24} />
            <div style={{ flex: 1 }}>
              <strong>The challenge timer has ended</strong>
              <p className="muted small">You can try the same chef again. Relaxed mini-game settings do not stop challenge timers.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon="refresh"
              onClick={() => {
                if (challenge && startChefSession(challenge.id)) setPhase('brief');
              }}
            >
              Try again
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'brief' && session ? (
        <BriefPanel
          session={session}
          recipeName={recipe?.name}
          customerName={customer?.name}
          customer={customer}
          dailySpecial={dailySpecial}
          challenge={challenge}
          onStart={() => setPhase(session.miniGames.length > 0 ? 'minigames' : 'assemble')}
        />
      ) : null}

      {phase === 'minigames' && session ? (
        <Card className="kitchen-panel">
          <div className="kitchen-panel__head">
            <div>
              <span className="eyebrow">Preparation</span>
              <h2>Kitchen mini-games</h2>
              <p className="muted small">Short, cozy steps that shape the technique of your dish.</p>
            </div>
            <Pill tone={allMiniDone ? 'matcha' : 'gold'} icon={allMiniDone ? 'check' : 'clock'}>
              {completedGames.length}/{session.miniGames.length}
            </Pill>
          </div>
          <ProgressBar value={miniProgress * 100} max={100} tone="matcha" />
          <div className="mini-list">
            {session.miniGames.map((gameId) => {
              const meta = miniGameById(gameId);
              const result = [...completedGames].reverse().find((item) => item.gameId === gameId);
              return (
                <div key={gameId} className={`mini-list__row ${result ? 'is-done' : ''}`.trim()}>
                  <span className="mini-list__icon"><Icon name={iconForGame(gameId)} size={18} /></span>
                  <div className="mini-list__copy">
                    <strong>{meta?.name}</strong>
                    <p>{meta?.short}</p>
                  </div>
                  {result ? <Pill tone={result.score >= 85 ? 'gold' : 'matcha'}>{result.score}</Pill> : null}
                  <Button
                    size="sm"
                    variant={result ? 'ghost' : 'primary'}
                    icon={result ? 'refresh' : 'play'}
                    onClick={() => setActiveMini(gameId)}
                  >
                    {result ? 'Retry' : 'Play'}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="kitchen-panel__actions">
            <Button variant="ghost" size="sm" onClick={skipRemaining} disabled={allMiniDone}>
              Skip remaining with Good
            </Button>
            <Button
              variant="primary"
              iconRight="arrowRight"
              disabled={!allMiniDone}
              onClick={() => setPhase('assemble')}
            >
              {allMiniDone ? 'Go to assembly' : 'Finish the mini-games'}
            </Button>
          </div>
          <p className="muted tiny">
            Technique is the average of these scores. You can retry any mini-game. Relaxed mode is {noTimer ? 'on' : 'off'} in Settings.
          </p>
        </Card>
      ) : null}

      {phase === 'assemble' && session ? (
        <>
          <AssembleHeader
            session={session}
            recipeName={recipe?.name}
            customer={customer}
            challenge={challenge}
            zen={zen}
            onPractice={() => setPracticeOpen(true)}
          />
          <SushiBuilder
            save={save}
            ingredients={ingredients}
            onChange={setIngredients}
            free={session.free}
            orderRecipeId={recipe?.id}
            actionLabel={zen ? 'Plate this creation' : 'Plate this dish'}
            onAction={(dish) => {
              if (challengeExpired) return;
              if (zen) {
                setPhase('plate');
              } else {
                setPhase('plate');
              }
            }}
            onBuy={session.free ? undefined : handleBuy}
            actionDisabled={challengeExpired}
            extra={
              customer && customer.allergies.length > 0 ? (
                <p className="builder-warning">
                  <Icon name="warning" size={13} /> {customer.name} must avoid{' '}
                  {customer.allergies.map((id) => ingredientById(id)?.name ?? saveInventoryName(id)).join(', ')}.
                </p>
              ) : null
            }
            title={zen ? 'Zen assembly board' : 'Assembly board'}
          />
        </>
      ) : null}

      {phase === 'plate' && session ? (
        <Card className="kitchen-panel">
          <div className="kitchen-panel__head">
            <div>
              <span className="eyebrow">Final touch</span>
              <h2>Plate the dish</h2>
              <p className="muted small">Balance the pieces, add a little garnish, and serve when it feels right.</p>
            </div>
            <Icon name="camera" size={22} />
          </div>
          {ingredients.length > 0 ? (
            <PlateBoard
              dish={makeDish(ingredients)}
              onServe={(score) => serve(makeDish(ingredients), score)}
              onBack={() => setPhase('assemble')}
              busy={plateBusy || challengeExpired}
            />
          ) : (
            <div className="empty-state">
              <p>Add ingredients before plating.</p>
              <Button size="sm" variant="soft" onClick={() => setPhase('assemble')}>Back to assembly</Button>
            </div>
          )}
        </Card>
      ) : null}

      {zen && phase === 'assemble' ? (
        <Card variant="soft" className="restaurant-sheet">
          <div className="row row--between">
            <div>
              <strong style={{ fontSize: 13 }}>Practice a mini-game</strong>
              <p className="muted small">No order, no pressure. Practice any kitchen skill.</p>
            </div>
            <Button size="sm" variant="soft" icon="target" onClick={() => setPracticeOpen(true)}>
              Practice
            </Button>
          </div>
        </Card>
      ) : null}

      {activeMini ? (
        <MiniGameHost
          key={`${session?.id}-${activeMini}`}
          gameId={activeMini}
          bonus={miniGameAssistBonus(save, activeMini)}
          difficulty={recipe?.difficulty ?? 2}
          onComplete={handleMiniComplete}
          onClose={() => setActiveMini(null)}
        />
      ) : null}

      {practiceGame ? (
        <MiniGameHost
          key={`practice-${practiceGame}`}
          gameId={practiceGame}
          bonus={miniGameAssistBonus(save, practiceGame)}
          difficulty={2}
          onComplete={(score) => {
            recordPracticeMiniGame({ gameId: practiceGame, score });
            setPracticeGame(null);
          }}
          onClose={() => setPracticeGame(null)}
        />
      ) : null}

      <Modal open={practiceOpen} onClose={() => setPracticeOpen(false)} title="Mini-game practice" size="md">
        <p className="modal-copy">Try any kitchen skill. Practice counts in your stats and daily missions, but not in the current dish.</p>
        <div className="practice-grid">
          {MINI_GAMES.map((game) => (
            <button
              key={game.id}
              type="button"
              className="practice-tile"
              onClick={() => {
                setPracticeOpen(false);
                setPracticeGame(game.id);
              }}
            >
              <span style={{ background: `${game.color}33`, color: 'var(--charcoal)' }}>
                <Icon name={iconForGame(game.id)} size={18} />
              </span>
              <strong>{game.name}</strong>
              <small>{game.short}</small>
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={leaveOpen}
        title="Leave the kitchen?"
        message="The current order will be set aside. You can come back and choose it again from its mode."
        confirmLabel="Leave"
        cancelLabel="Keep cooking"
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false);
          leaveKitchen();
        }}
      />

      {lastResult ? <ResultModal result={lastResult} onDone={finishResult} /> : null}
    </div>
  );
};

const iconForGame = (id: MiniGameId) => {
  switch (id) {
    case 'perfect_rice':
    case 'rice_cooker':
    case 'fan_rice':
      return 'rice' as const;
    case 'perfect_slice':
      return 'fish' as const;
    case 'nori_wrap':
      return 'leaf' as const;
    case 'roll_master':
      return 'sushi' as const;
    case 'nigiri_master':
      return 'nigiri' as const;
    case 'wasabi_balance':
      return 'sparkle' as const;
    case 'plate_art':
      return 'camera' as const;
    case 'quick_service':
      return 'users' as const;
    case 'tea_master':
      return 'tea' as const;
    case 'delivery_pack':
      return 'bento' as const;
    default:
      return 'target' as const;
  }
};

const saveInventoryName = (id: string): string => ingredientById(id)?.name ?? id.replace(/_/g, ' ');

const BriefPanel = ({
  session,
  recipeName,
  customerName,
  customer,
  dailySpecial,
  challenge,
  onStart,
}: {
  session: NonNullable<ReturnType<typeof useGameStore.getState>['session']>;
  recipeName?: string;
  customerName?: string;
  customer?: ReturnType<typeof customerById>;
  dailySpecial: ReturnType<typeof createDailySpecial>;
  challenge: ReturnType<typeof CHEF_BY_ID.get>;
  onStart: () => void;
}) => {
  const recipe = recipeById(session.order?.recipeId ?? '');
  return (
    <Card className="kitchen-panel order-brief">
      <div className="order-brief__head">
        <div className="order-brief__portrait">
          {customer ? <CustomerPortrait customer={customer} size={82} mood="happy" /> : <Icon name="users" size={32} />}
        </div>
        <div className="order-brief__copy">
          <span className="eyebrow">Order from {customerName}</span>
          <h2>{recipeName}</h2>
          <p>“{session.order?.note ?? customer?.greeting}”</p>
          <div className="tag-row">
            {session.free ? <Pill tone="matcha" icon="leaf">Pantry provided</Pill> : <Pill tone="gold" icon="shop">Use your pantry</Pill>}
            {customer?.allergies.map((id) => (
              <Pill key={id} tone="danger" icon="warning">Avoid {ingredientById(id)?.name ?? saveInventoryName(id)}</Pill>
            ))}
            {session.mode === 'daily' ? <Pill tone="gold" icon="target">Target {dailySpecial.targetGrade}+</Pill> : null}
            {challenge ? <Pill tone="sakura" icon="clock">{challenge.timeLimit}s</Pill> : null}
            {challenge ? <Pill tone="sakura" icon="rice">Max {challenge.maxIngredients} ingredients</Pill> : null}
          </div>
        </div>
      </div>
      {challenge ? (
        <div className="brief-note">
          <Icon name="chef" size={15} />
          <span>
            <strong>{challenge.name}:</strong> {challenge.description}
          </span>
        </div>
      ) : null}
      {recipe ? (
        <div className="brief-recipe">
          <div className="row row--between">
            <span className="eyebrow">Recipe reference</span>
            <span className="tiny muted">Difficulty {'★'.repeat(recipe.difficulty)}</span>
          </div>
          <div className="recipe-detail__ingredients" style={{ marginTop: 6 }}>
            {recipe.ingredients.map((item) => (
              <span key={item.id} className="recipe-ingredient">
                {ingredientById(item.id)?.name ?? saveInventoryName(item.id)} ×{item.qty}
              </span>
            ))}
          </div>
          <div className="tag-row" style={{ marginTop: 7 }}>
            {recipe.requiredMiniGames.map((id) => (
              <Pill key={id} tone="matcha" icon={iconForGame(id)}>{miniGameById(id)?.name}</Pill>
            ))}
          </div>
        </div>
      ) : null}
      <Button variant="primary" size="lg" icon="play" iconRight="arrowRight" onClick={onStart}>
        {session.miniGames.length > 0 ? `Start cooking · ${session.miniGames.length} mini-games` : 'Start cooking'}
      </Button>
      <p className="muted tiny">
        No fail timer in this mode. Ingredients are fresh for the whole session; allergens are always highlighted.
      </p>
    </Card>
  );
};

const AssembleHeader = ({
  session,
  recipeName,
  customer,
  challenge,
  zen,
  onPractice,
}: {
  session: NonNullable<ReturnType<typeof useGameStore.getState>['session']>;
  recipeName?: string;
  customer?: ReturnType<typeof customerById>;
  challenge: ReturnType<typeof CHEF_BY_ID.get>;
  zen: boolean;
  onPractice: () => void;
}) => {
  const { completedMiniGames } = session;
  const technique = completedMiniGames.length
    ? Math.round(completedMiniGames.reduce((sum, item) => sum + item.score, 0) / completedMiniGames.length)
    : 72;
  return (
    <Card className="kitchen-context">
      <div className="row row--between">
        <div className="row">
          <Icon name={zen ? 'leaf' : 'restaurant'} size={18} />
          <div>
            <strong style={{ fontSize: 12 }}>{zen ? 'Zen pantry' : recipeName}</strong>
            <p className="muted tiny">
              {zen ? 'Everything is allowed. Discover something lovely.' : customer ? `Cooking for ${customer.name}` : 'Assembly time'}
            </p>
          </div>
        </div>
        <div className="row">
          {session.completedMiniGames.length > 0 ? (
            <Pill tone={technique >= 85 ? 'gold' : 'matcha'} icon="star">Technique {technique}</Pill>
          ) : null}
          {challenge ? <Pill tone="sakura" icon="target">{challenge.minGrade}+</Pill> : null}
          {zen ? <Button size="sm" variant="ghost" icon="target" onClick={onPractice}>Practice</Button> : null}
        </div>
      </div>
      {challenge?.forbiddenTags.length ? (
        <p className="builder-warning">
          <Icon name="warning" size={13} /> Challenge rule: no{' '}
          {challenge.forbiddenTags.join(', ')} ingredients.
        </p>
      ) : null}
    </Card>
  );
};

