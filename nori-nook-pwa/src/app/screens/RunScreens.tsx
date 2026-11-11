import { useEffect, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, ConfirmDialog, Pill, ProgressBar, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { SushiArt } from '@/components/art/SushiArt';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { getUpgradeEffect } from '@/game/ingredient-system/stock';
import { formatTime } from '@/utils/format';
import type { Order } from '@/types/game';
import type { DeliveryRun, EndlessRun, RushRun, RunState } from '@/app/store';

const useNow = (active: boolean): number => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
};

const ModeMismatch = ({ run }: { run: RunState }) => {
  const clearRun = useGameStore((state) => state.clearRun);
  const path = run.mode === 'rush' ? '/rush' : run.mode === 'endless' ? '/endless' : '/delivery';
  return (
    <div className="screen">
      <Card variant="soft" className="screen--center" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Icon name="info" size={30} />
        <h2>A different run is in progress</h2>
        <p className="muted small">Finish or end your {run.mode} run before starting another one.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Button variant="primary" size="sm" icon="play" onClick={() => navigate(path)}>Resume run</Button>
          <Button variant="ghost" size="sm" onClick={() => clearRun()}>End run</Button>
        </div>
      </Card>
    </div>
  );
};

const Leaderboard = ({ entries }: { entries: { score: number; date: number; detail: string }[] }) => (
  <div className="leaderboard">
    {entries.length === 0 ? (
      <p className="muted small">No scores yet. The first little record is waiting.</p>
    ) : (
      entries.slice(0, 5).map((entry, index) => (
        <div key={`${entry.date}-${index}`} className="leaderboard__row">
          <span className={`leaderboard__rank rank-${index + 1}`}>{index + 1}</span>
          <div>
            <strong>{entry.score}</strong>
            <span>{entry.detail}</span>
          </div>
          <time>{new Date(entry.date).toLocaleDateString()}</time>
        </div>
      ))
    )}
  </div>
);

const Results = ({ run, onAgain, onBack }: { run: RunState; onAgain: () => void; onBack: () => void }) => {
  const save = useGameStore((state) => state.save);
  const entries = save.modes[run.mode];
  const detail =
    run.mode === 'rush'
      ? `${run.served} served · best combo x${run.combo}`
      : run.mode === 'endless'
        ? `${run.served} orders served`
        : `${run.deliveries} bento delivered`;
  return (
    <div className="screen">
      <Card className="run-results">
        <div className="run-results__badge"><Icon name="trophy" size={34} /></div>
        <span className="eyebrow">Run complete</span>
        <h1>{run.score}</h1>
        <p className="muted small">{detail}</p>
        <div className="run-stats">
          {run.mode === 'rush' ? (
            <>
              <RunStat label="Served" value={run.served} />
              <RunStat label="Best combo" value={`x${run.combo}`} />
              <RunStat label="Score" value={run.score} />
            </>
          ) : run.mode === 'endless' ? (
            <>
              <RunStat label="Served" value={run.served} />
              <RunStat label="Hearts" value={run.hearts} />
              <RunStat label="Score" value={run.score} />
            </>
          ) : (
            <>
              <RunStat label="Deliveries" value={run.deliveries} />
              <RunStat label="Score" value={run.score} />
              <RunStat label="Time" value={formatTime(run.durationMs / 1000)} />
            </>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Button variant="ghost" onClick={onBack}>Back home</Button>
          <Button variant="primary" icon="refresh" onClick={onAgain}>Play again</Button>
        </div>
      </Card>
      <Card>
        <SectionHead title="Local leaderboard" subtitle="Your best little runs, saved on this device" icon="trophy" />
        <Leaderboard entries={entries} />
      </Card>
    </div>
  );
};

const RunStat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="stat-box">
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
);

const OrderMini = ({ order }: { order: Order }) => {
  const customer = customerById(order.customerId);
  const recipe = recipeById(order.recipeId);
  return (
    <div className="rush-order">
      <span className="rush-order__portrait">
        {customer ? <CustomerPortrait customer={customer} size={45} mood="neutral" /> : null}
      </span>
      <div className="rush-order__copy">
        <strong>{recipe?.name}</strong>
        <span>{customer?.name} · {customer?.title}</span>
        <div className="tag-row">
          {customer?.allergies.map((id) => (
            <Pill key={id} tone="danger" icon="warning">{id.replace(/_/g, ' ')}</Pill>
          ))}
        </div>
      </div>
      <SushiArt recipeId={recipe?.id} size={76} />
    </div>
  );
};

export const RushScreen = () => {
  const save = useGameStore((state) => state.save);
  const run = useGameStore((state) => state.run);
  const session = useGameStore((state) => state.session);
  const startRun = useGameStore((state) => state.startRun);
  const startRunOrder = useGameStore((state) => state.startRunOrder);
  const endRun = useGameStore((state) => state.endRun);
  const clearRun = useGameStore((state) => state.clearRun);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const now = useNow(Boolean(run && !run.finished));
  const rush = run?.mode === 'rush' ? (run as RushRun) : null;
  const remaining = rush && !rush.finished ? Math.max(0, Math.ceil((rush.startedAt + rush.durationMs - now) / 1000)) : 0;

  useEffect(() => {
    if (rush && !rush.finished && remaining <= 0 && !session) endRun();
  }, [rush, remaining, session, endRun]);

  if (run && run.mode !== 'rush') return <ModeMismatch run={run} />;
  if (!rush) {
    const slots = 2 + getUpgradeEffect(save, 'rush_slots');
    const duration = 75 + getUpgradeEffect(save, 'rush_seconds');
    return (
      <div className="screen">
        <div className="page-head">
          <div className="page-head__copy">
            <span className="eyebrow">A busy little hour</span>
            <h1>Lunch Rush</h1>
            <p>Warm rice, a full counter and a combo that feels lovely.</p>
          </div>
          <div className="page-head__action"><Pill tone="gold" icon="trophy">{save.modes.rush[0]?.score ?? 0} best</Pill></div>
        </div>
        <Card className="run-intro run-intro--rush">
          <div className="run-intro__art">
            <Icon name="clock" size={54} />
            <span className="run-intro__ring" />
          </div>
          <h2>Keep the counter happy.</h2>
          <p className="muted">
            Choose orders from the queue, cook guided dishes and serve before the lunch bell rings. Every served plate
            raises your combo and the reward multiplier.
          </p>
          <div className="run-rules">
            <div><Icon name="clock" size={16} /><span>{formatTime(duration)} on the clock</span></div>
            <div><Icon name="restaurant" size={16} /><span>{slots} orders waiting at a time</span></div>
            <div><Icon name="star" size={16} /><span>Combo raises coins, not difficulty</span></div>
            <div><Icon name="heart" size={16} /><span>Ending early is always okay</span></div>
          </div>
          <Button variant="primary" size="lg" icon="play" onClick={() => startRun('rush')}>Start Lunch Rush</Button>
          <p className="muted tiny">Timer is optional pressure; the mini-games remain short and forgiving. You can end at any time.</p>
        </Card>
        <Card>
          <SectionHead title="Local leaderboard" subtitle="Your best lunch hours" icon="trophy" />
          <Leaderboard entries={save.modes.rush} />
        </Card>
      </div>
    );
  }

  if (rush.finished) {
    return (
      <Results
        run={rush}
        onAgain={() => startRun('rush')}
        onBack={() => {
          clearRun();
          navigate('/');
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="run-topbar">
        <div>
          <span className="eyebrow">Lunch Rush</span>
          <h1>{formatTime(remaining)}</h1>
        </div>
        <div className="row">
          <Pill tone="gold" icon="coin">{rush.score} pts</Pill>
          <Pill tone="sakura" icon="flame">x{rush.combo}</Pill>
          <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(true)}>End</Button>
        </div>
      </div>
      <Card className="run-meter-card">
        <ProgressBar value={Math.max(0, 100 - (remaining / (rush.durationMs / 1000)) * 100)} max={100} tone="salmon" label="Lunch bell" showValue />
        <div className="row row--between">
          <span className="muted small">{rush.served} served · {rush.queue.length} waiting</span>
          {session ? <Button size="sm" variant="gold" icon="play" onClick={() => navigate('/kitchen')}>Resume cooking</Button> : null}
        </div>
      </Card>
      <SectionHead title="Orders on the counter" subtitle="Pick one, cook it, come back for more" icon="restaurant" />
      <div className="rush-orders">
        {rush.queue.map((order) => (
          <Card key={order.id} className="rush-order-card">
            <OrderMini order={order} />
            <Button
              size="sm"
              variant="primary"
              icon="play"
              disabled={Boolean(session)}
              onClick={() => {
                if (session) {
                  navigate('/kitchen');
                  return;
                }
                if (startRunOrder(order.id)) navigate('/kitchen');
              }}
            >
              Cook
            </Button>
          </Card>
        ))}
      </div>
      <p className="muted tiny" style={{ textAlign: 'center' }}>
        Combo adds to the next dish’s coin reward. Starting a dish does not pause the lunch clock.
      </p>
      <ConfirmDialog
        open={confirmEnd}
        title="Ring the lunch bell early?"
        message="The run will end and your score will be saved to the local leaderboard."
        confirmLabel="End run"
        cancelLabel="Keep serving"
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          endRun();
        }}
      />
    </div>
  );
};

export const EndlessScreen = () => {
  const save = useGameStore((state) => state.save);
  const run = useGameStore((state) => state.run);
  const session = useGameStore((state) => state.session);
  const startRun = useGameStore((state) => state.startRun);
  const startRunOrder = useGameStore((state) => state.startRunOrder);
  const endRun = useGameStore((state) => state.endRun);
  const clearRun = useGameStore((state) => state.clearRun);

  if (run && run.mode !== 'endless') return <ModeMismatch run={run} />;
  const endless = run?.mode === 'endless' ? (run as EndlessRun) : null;

  if (!endless) {
    return (
      <div className="screen">
        <div className="page-head">
          <div className="page-head__copy">
            <span className="eyebrow">The counter never closes</span>
            <h1>Endless Restaurant</h1>
            <p>One warm plate at a time. How long can the lantern stay bright?</p>
          </div>
          <div className="page-head__action"><Pill tone="gold" icon="trophy">{save.modes.endless[0]?.score ?? 0} best</Pill></div>
        </div>
        <Card className="run-intro run-intro--endless">
          <div className="run-intro__art"><Icon name="infinity" size={58} /><span className="run-intro__ring" /></div>
          <h2>Serve until the last heart.</h2>
          <p className="muted">
            Every customer brings a new order. A Normal grade costs one heart. Good, Delicious, Perfect and Masterpiece
            keep the evening glowing. Three hearts (plus comfort upgrades) is all you need.
          </p>
          <div className="run-rules">
            <div><Icon name="heart" size={16} /><span>Start with 3 hearts, +1 for extra comfort</span></div>
            <div><Icon name="star" size={16} /><span>Score grows with every served plate</span></div>
            <div><Icon name="users" size={16} /><span>Recipes get more elaborate as you go</span></div>
            <div><Icon name="clock" size={16} /><span>No global timer. You can rest between plates.</span></div>
          </div>
          <Button variant="primary" size="lg" icon="play" onClick={() => startRun('endless')}>Open the counter</Button>
        </Card>
        <Card>
          <SectionHead title="Local leaderboard" subtitle="The longest little evenings" icon="trophy" />
          <Leaderboard entries={save.modes.endless} />
        </Card>
      </div>
    );
  }

  if (endless.finished) {
    return (
      <Results
        run={endless}
        onAgain={() => startRun('endless')}
        onBack={() => {
          clearRun();
          navigate('/');
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="run-topbar">
        <div>
          <span className="eyebrow">Endless service</span>
          <h1>{endless.score} pts</h1>
        </div>
        <div className="row">
          <Pill tone="sakura" icon="heart">{endless.hearts} hearts</Pill>
          <Pill tone="matcha" icon="users">{endless.served} served</Pill>
        </div>
      </div>
      <Card className="run-meter-card">
        <div className="endless-hearts">
          {Array.from({ length: Math.max(3, endless.hearts) }).map((_, index) => (
            <Icon key={index} name="heart" size={22} className={index < endless.hearts ? 'is-filled-heart' : 'is-empty-heart'} />
          ))}
        </div>
        <p className="muted small">Normal grades cost a heart. Everything else feeds the lantern.</p>
        {session ? (
          <Button variant="gold" icon="play" onClick={() => navigate('/kitchen')}>Resume cooking</Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon="play"
            onClick={() => {
              if (startRunOrder()) navigate('/kitchen');
            }}
          >
            Take the next order
          </Button>
        )}
      </Card>
      <Card variant="soft">
        <div className="row row--between">
          <div>
            <strong style={{ fontSize: 13 }}>Next plate multiplier</strong>
            <p className="muted small">The reward grows with every order served.</p>
          </div>
          <Pill tone="gold" icon="coin">x{(1 + endless.served * 0.04).toFixed(2)}</Pill>
        </div>
      </Card>
      <Card>
        <SectionHead title="Local leaderboard" subtitle="Your best endless evenings" icon="trophy" />
        <Leaderboard entries={save.modes.endless} />
      </Card>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Button variant="ghost" size="sm" onClick={endRun}>End the evening</Button>
      </div>
    </div>
  );
};

export const DeliveryScreen = () => {
  const save = useGameStore((state) => state.save);
  const run = useGameStore((state) => state.run);
  const session = useGameStore((state) => state.session);
  const startRun = useGameStore((state) => state.startRun);
  const startRunOrder = useGameStore((state) => state.startRunOrder);
  const endRun = useGameStore((state) => state.endRun);
  const clearRun = useGameStore((state) => state.clearRun);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const now = useNow(Boolean(run && !run.finished));
  const delivery = run?.mode === 'delivery' ? (run as DeliveryRun) : null;
  const remaining = delivery && !delivery.finished ? Math.max(0, Math.ceil((delivery.startedAt + delivery.durationMs - now) / 1000)) : 0;

  useEffect(() => {
    if (delivery && !delivery.finished && remaining <= 0 && !session) endRun();
  }, [delivery, remaining, session, endRun]);

  if (run && run.mode !== 'delivery') return <ModeMismatch run={run} />;
  if (!delivery) {
    return (
      <div className="screen">
        <div className="page-head">
          <div className="page-head__copy">
            <span className="eyebrow">Bento, ribbons, tiny sauces</span>
            <h1>Delivery Dash</h1>
            <p>Three tidy bento boxes, one friendly harbor deadline.</p>
          </div>
          <div className="page-head__action"><Pill tone="gold" icon="trophy">{save.modes.delivery[0]?.score ?? 0} best</Pill></div>
        </div>
        <Card className="run-intro run-intro--delivery">
          <div className="run-intro__art"><Icon name="bento" size={56} /><span className="run-intro__ring" /></div>
          <h2>Pack it snug. Deliver it warm.</h2>
          <p className="muted">
            Cook each order, play the Delivery Pack mini-game and close the box with everything in its place. Sloppy
            packing is not a failure, just a little less lovely.
          </p>
          <div className="run-rules">
            <div><Icon name="bento" size={16} /><span>3 deliveries per run</span></div>
            <div><Icon name="clock" size={16} /><span>2:30 on the friendly harbor clock</span></div>
            <div><Icon name="target" size={16} /><span>Packing adds a separate score bonus</span></div>
            <div><Icon name="shop" size={16} /><span>The Bento Station upgrade improves the score</span></div>
          </div>
          <Button variant="primary" size="lg" icon="play" onClick={() => startRun('delivery')}>Start delivering</Button>
        </Card>
        <Card>
          <SectionHead title="Local leaderboard" subtitle="Your best harbor afternoons" icon="trophy" />
          <Leaderboard entries={save.modes.delivery} />
        </Card>
      </div>
    );
  }

  if (delivery.finished) {
    return (
      <Results
        run={delivery}
        onAgain={() => startRun('delivery')}
        onBack={() => {
          clearRun();
          navigate('/');
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="run-topbar">
        <div>
          <span className="eyebrow">Delivery Dash</span>
          <h1>{formatTime(remaining)}</h1>
        </div>
        <div className="row">
          <Pill tone="gold" icon="star">{delivery.score} pts</Pill>
          <Pill tone="matcha" icon="bento">{delivery.deliveries}/3</Pill>
          <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(true)}>End</Button>
        </div>
      </div>
      <Card className="run-meter-card">
        <ProgressBar value={delivery.deliveries} max={3} tone="gold" label="Deliveries packed" showValue />
        <p className="muted small">The timer keeps going while you cook, just like the real harbor lunch rush.</p>
        {session ? (
          <Button variant="gold" icon="play" onClick={() => navigate('/kitchen')}>Resume delivery</Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon="bento"
            onClick={() => {
              if (startRunOrder()) navigate('/kitchen');
            }}
          >
            Prepare next delivery
          </Button>
        )}
      </Card>
      <Card variant="soft">
        <div className="row row--between">
          <div>
            <strong style={{ fontSize: 13 }}>Bento station bonus</strong>
            <p className="muted small">Upgrade the takeaway station in the shop for extra delivery score.</p>
          </div>
          <Pill tone="gold" icon="shop">+{getUpgradeEffect(save, 'delivery_bonus')}</Pill>
        </div>
      </Card>
      <Card>
        <SectionHead title="Local leaderboard" subtitle="Your best packed afternoons" icon="trophy" />
        <Leaderboard entries={save.modes.delivery} />
      </Card>
      <ConfirmDialog
        open={confirmEnd}
        title="End the delivery run?"
        message="The remaining bento will be returned to the shelf. Your score is saved to the local leaderboard."
        confirmLabel="End run"
        cancelLabel="Keep delivering"
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          endRun();
        }}
      />
    </div>
  );
};

