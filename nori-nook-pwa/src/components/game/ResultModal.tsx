import { Modal, Button, Pill } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { SushiArt } from '@/components/art/SushiArt';
import type { ServiceResultView } from '@/app/store';
import { gradeColor, gradeFeedback } from '@/game/sushi-making/grading';

const moodFor = (name: string): 'happy' | 'neutral' | 'perfect' | 'sad' => {
  if (name === 'Masterpiece' || name === 'Perfect') return 'perfect';
  if (name === 'Delicious') return 'happy';
  if (name === 'Good') return 'neutral';
  return 'sad';
};

const primaryLabel = (result: ServiceResultView): string => {
  if (result.kind === 'free') return 'Keep cooking';
  switch (result.mode) {
    case 'story':
      return 'Back to the journey';
    case 'daily':
      return 'Back to events';
    case 'chef':
      return 'Back to the chefs';
    case 'rush':
      return 'Back to the rush';
    case 'endless':
      return 'Back to endless service';
    case 'delivery':
      return 'Back to deliveries';
    default:
      return 'Continue';
  }
};

export const ResultModal = ({
  result,
  onDone,
}: {
  result: ServiceResultView;
  onDone: () => void;
}) => {
  const customer = result.customer;
  const reaction = customer
    ? result.grade.name === 'Masterpiece' || result.grade.name === 'Perfect'
      ? customer.perfect
      : result.grade.name === 'Good' || result.grade.name === 'Delicious'
        ? customer.happy
        : customer.neutral
    : null;
  return (
    <Modal
      open
      onClose={onDone}
      title={result.kind === 'free' ? 'A little creation' : 'Plated & served'}
      size="md"
      footer={
        <div className="modal__actions">
          <Button variant="primary" iconRight="arrowRight" onClick={onDone}>
            {primaryLabel(result)}
          </Button>
        </div>
      }
    >
      <div className="result-modal" style={{ '--grade-color': gradeColor(result.grade.name) } as React.CSSProperties}>
        <div className="result-hero">
          <div className="result-hero__dish">
            <SushiArt
              recipeId={result.dish.recipeId}
              ingredients={result.dish.ingredients}
              size={180}
              animate
            />
          </div>
          {customer ? (
            <div className="result-hero__customer">
              <CustomerPortrait customer={customer} size={70} mood={moodFor(result.grade.name)} />
              <div>
                <span className="eyebrow">Little review</span>
                <p>{reaction}</p>
              </div>
            </div>
          ) : (
            <div className="result-hero__customer">
              <span className="result-hero__icon"><Icon name="leaf" size={22} /></span>
              <div>
                <span className="eyebrow">Free kitchen</span>
                <p>{gradeFeedback[result.grade.name]}</p>
              </div>
            </div>
          )}
        </div>

        <div className="result-grade">
          <div>
            <span className="eyebrow">Dish</span>
            <h3>{result.dish.name}</h3>
            {result.customerName ? <p className="muted tiny">for {result.customerName}</p> : null}
          </div>
          <div className="result-grade__badge">
            <span>{result.grade.total}</span>
            <strong>{result.grade.name}</strong>
          </div>
        </div>

        <div className="result-scores">
          <Score label="Presentation" value={result.grade.presentation} />
          <Score label="Ingredient match" value={result.grade.match} />
          <Score label="Freshness" value={result.grade.freshness} />
          <Score label="Technique" value={result.grade.technique} />
          <Score label="Order accuracy" value={result.grade.accuracy} />
        </div>

        <div className="result-rewards">
          {result.coins > 0 ? <Pill tone="gold" icon="coin">+{result.coins} coins</Pill> : null}
          {result.pearls > 0 ? <Pill tone="sakura" icon="pearl">+{result.pearls} pearls</Pill> : null}
          {result.xp > 0 ? <Pill tone="matcha" icon="star">+{result.xp} XP</Pill> : null}
          {result.dailyCompleted ? <Pill tone="gold" icon="calendar">Daily complete</Pill> : null}
          {result.chefCleared ? <Pill tone="gold" icon="trophy">Chef challenge cleared</Pill> : null}
        </div>

        {result.notices.length > 0 ? (
          <div className="result-notices">
            {result.notices.map((notice) => (
              <div key={notice.id} className={`result-notice result-notice--${notice.kind}`}>
                <span>
                  <Icon name={(notice.art as IconName) ?? 'sparkle'} size={18} />
                </span>
                <div>
                  <strong>{notice.title}</strong>
                  <p>{notice.description}</p>
                </div>
                {notice.coins || notice.pearls ? (
                  <div className="result-notice__rewards">
                    {notice.coins ? <small>+{notice.coins} <Icon name="coin" size={10} /></small> : null}
                    {notice.pearls ? <small>+{notice.pearls} <Icon name="pearl" size={10} /></small> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <p className="result-feedback">
          <Icon name="sparkle" size={13} /> {gradeFeedback[result.grade.name]}
        </p>
      </div>
    </Modal>
  );
};

const Score = ({ label, value }: { label: string; value: number }) => (
  <div className="result-score">
    <div className="row row--between">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    <div className="progress progress--matcha">
      <span style={{ width: `${value}%` }} />
    </div>
  </div>
);
