import type { Card } from '@/game/engine';
import { RANK_NAMES, SUIT_SYMBOLS } from '@/game/engine';
import { cx } from '@/utils';

interface PlayingCardProps {
  card?: Card;
  hidden?: boolean;
  small?: boolean;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
  label?: string;
}

const rankLabel = (card: Card): string => {
  if (card.rank === 1) return 'A';
  if (card.rank === 8) return 'F';
  if (card.rank === 9) return 'C';
  if (card.rank === 10) return 'R';
  return String(card.rank);
};

export function PlayingCard({
  card,
  hidden,
  small,
  disabled,
  selected,
  className,
  onClick,
  label
}: PlayingCardProps) {
  if (hidden || !card) {
    return (
      <div className={cx('playing-card card-back', small && 'is-small', className)} aria-hidden="true">
        <span className="back-frame">
          <span className="back-diamond" />
          <span className="back-letter">B</span>
        </span>
      </div>
    );
  }

  const red = card.suit === 'coppe' || card.suit === 'denari';
  const symbol = SUIT_SYMBOLS[card.suit];
  const content = (
    <>
      <span className="card-corner top">
        <b>{rankLabel(card)}</b>
        <i>{symbol}</i>
      </span>
      <span className="card-center-suit">{symbol}</span>
      <span className="card-center-name">{RANK_NAMES[card.rank]}</span>
      <span className="card-corner bottom">
        <b>{rankLabel(card)}</b>
        <i>{symbol}</i>
      </span>
      <span className="card-edge" />
    </>
  );

  const classes = cx(
    'playing-card',
    red ? 'is-red' : 'is-black',
    small && 'is-small',
    selected && 'is-selected',
    disabled && 'is-disabled',
    onClick && 'is-playable',
    className
  );
  const accessibleLabel = label ?? `${RANK_NAMES[card.rank]} di ${card.suit}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        aria-label={accessibleLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={classes} role="img" aria-label={accessibleLabel}>
      {content}
    </div>
  );
}
