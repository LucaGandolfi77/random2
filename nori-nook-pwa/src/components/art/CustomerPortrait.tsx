import type { Customer, PortraitConfig } from '@/types/game';

type Mood = 'neutral' | 'happy' | 'perfect' | 'sad';

const Hair = ({ config, mood }: { config: PortraitConfig; mood: Mood }) => {
  const { hair, hairStyle } = config;
  if (hairStyle === 'hat') {
    return (
      <>
        <path d="M25 37c0-12 11-20 25-20s25 8 25 20z" fill={hair} />
        <rect x="21" y="35" width="58" height="7" rx="3.5" fill={hair} opacity=".9" />
      </>
    );
  }
  if (hairStyle === 'cap') {
    return (
      <>
        <path d="M26 38c0-12 10-20 24-20s24 8 24 20z" fill={hair} />
        <path d="M22 38h44c6 0 9 5 3 7H28c-7 0-9-7-6-7z" fill={hair} opacity=".92" />
        <circle cx="50" cy="17" r="3" fill="#FFFDF7" opacity=".7" />
      </>
    );
  }
  if (hairStyle === 'bun') {
    return (
      <>
        <circle cx="50" cy="14" r="11" fill={hair} />
        <path d="M26 41c0-15 10-25 24-25s24 10 24 25c-5-8-12-12-24-12s-19 4-24 12z" fill={hair} />
      </>
    );
  }
  if (hairStyle === 'elder') {
    return (
      <>
        <circle cx="50" cy="17" r="8" fill={hair} opacity=".9" />
        <path d="M27 41c0-14 10-24 23-24s23 10 23 24c-5-5-12-8-23-8s-18 3-23 8z" fill={hair} />
        <path d="M29 39c-4 10-3 18 1 23M71 39c4 10 3 18-1 23" fill="none" stroke={hair} strokeWidth="5" strokeLinecap="round" opacity=".7" />
      </>
    );
  }
  if (hairStyle === 'child') {
    return (
      <>
        <path d="M27 41c0-14 10-23 23-23s23 9 23 23c-5-6-12-9-23-9s-18 3-23 9z" fill={hair} />
        <path d="M40 17c-2-6 1-10 5-12M52 15c1-5 4-8 8-8M63 18c4-4 8-4 11-2" fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round" />
      </>
    );
  }
  if (hairStyle === 'long') {
    return (
      <>
        <path d="M26 42c0-15 10-25 24-25s24 10 24 25v26c-5 2-9-2-10-8V41c-4-5-9-7-14-7s-10 2-14 7v19c-1 6-5 10-10 8z" fill={hair} />
        <path d="M34 23c5-5 27-5 32 0" fill="none" stroke="#FFFDF7" strokeWidth="1.4" opacity=".18" />
      </>
    );
  }
  if (hairStyle === 'short') {
    return (
      <>
        <path d="M27 40c-2-14 9-24 23-24s25 10 23 24c-3-6-8-9-13-9-2 4-6 5-10 5s-8-1-10-5c-5 0-10 3-13 9z" fill={hair} />
        {mood === 'sad' ? <path d="M34 30c3-5 8-7 12-6" fill="none" stroke={hair} strokeWidth="3" strokeLinecap="round" opacity=".5" /> : null}
      </>
    );
  }
  return (
    <>
      <path d="M26 42c0-15 10-25 24-25s24 10 24 25c-4-8-12-12-24-12s-20 4-24 12z" fill={hair} />
      <path d="M29 40c-3 8-2 15 2 19M71 40c3 8 2 15-2 19" fill="none" stroke={hair} strokeWidth="6" strokeLinecap="round" opacity=".85" />
    </>
  );
};

const Accessory = ({ config }: { config: PortraitConfig }) => {
  const { accessory } = config;
  if (accessory === 'headband') {
    return <rect x="27" y="31" width="46" height="6" rx="3" fill="#EF9D91" />;
  }
  if (accessory === 'glasses') {
    return (
      <g fill="none" stroke="#80614E" strokeWidth="1.6">
        <circle cx="42" cy="50" r="8" />
        <circle cx="58" cy="50" r="8" />
        <path d="M50 50h0M34 49l-6-2M66 49l6-2" />
      </g>
    );
  }
  if (accessory === 'flower') {
    return (
      <g transform="translate(70 29)">
        <circle cx="0" cy="-5" r="4" fill="#EBC6CB" />
        <circle cx="5" cy="0" r="4" fill="#EBC6CB" />
        <circle cx="0" cy="5" r="4" fill="#EF9D91" />
        <circle cx="-5" cy="0" r="4" fill="#EBC6CB" />
        <circle cx="0" cy="0" r="3" fill="#F4C36B" />
      </g>
    );
  }
  if (accessory === 'cap') {
    return <rect x="26" y="30" width="48" height="5" rx="2.5" fill="#EF9D91" opacity=".85" />;
  }
  if (accessory === 'scarf') {
    return (
      <>
        <path d="M32 72c6 4 30 4 36 0l3 8c-9 5-33 5-42 0z" fill="#EF9D91" />
        <path d="M60 77c4 2 7 7 7 12l-8-2c-1-4-1-7 1-10z" fill="#EF9D91" opacity=".8" />
      </>
    );
  }
  if (accessory === 'ribbon') {
    return (
      <g transform="translate(72 30)">
        <path d="M0 0c-8-6-12-1-8 4 3 3 6 1 8-2 2 3 5 5 8 2 4-5 0-10-8-4z" fill="#EF9D91" />
        <circle cx="0" cy="1" r="2" fill="#EBC6CB" />
      </g>
    );
  }
  if (accessory === 'net') {
    return <path d="M30 27c8-6 32-6 40 0l-4 5c-10-4-22-4-32 0z" fill="#FFFDF7" opacity=".55" stroke="#80614E" strokeWidth="1" />;
  }
  return null;
};

const makeMood = (mood: Mood, eyeStyle: PortraitConfig['eye']) => {
  if (eyeStyle === 'closed' || mood === 'happy' || mood === 'perfect') {
    return (
      <>
        <path d="M38 49q4 4 8 0M54 49q4 4 8 0" fill="none" stroke="#393A36" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }
  if (eyeStyle === 'sharp') {
    return (
      <>
        <path d="M38 44l7 2M62 44l-7 2" fill="none" stroke="#393A36" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="42" cy="50" r="2" fill="#393A36" />
        <circle cx="58" cy="50" r="2" fill="#393A36" />
      </>
    );
  }
  return (
    <>
      <circle cx="42" cy="49" r="2.3" fill="#393A36" />
      <circle cx="58" cy="49" r="2.3" fill="#393A36" />
      <circle cx="42.8" cy="48.2" r=".7" fill="#FFFDF7" />
      <circle cx="58.8" cy="48.2" r=".7" fill="#FFFDF7" />
    </>
  );
};

const Mouth = ({ mood }: { mood: Mood }) => {
  if (mood === 'perfect') {
    return <path d="M45 59q5 7 10 0q-5 2-10 0z" fill="#D96A6A" stroke="#393A36" strokeWidth="1.2" />;
  }
  if (mood === 'happy') return <path d="M45 58q5 4 10 0" fill="none" stroke="#393A36" strokeWidth="2" strokeLinecap="round" />;
  if (mood === 'sad') return <path d="M45 62q5-4 10 0" fill="none" stroke="#393A36" strokeWidth="2" strokeLinecap="round" />;
  return <path d="M46 59h8" fill="none" stroke="#393A36" strokeWidth="2" strokeLinecap="round" />;
};

interface CustomerPortraitProps {
  customer?: Customer;
  config?: PortraitConfig;
  size?: number;
  mood?: Mood;
  className?: string;
}

export const CustomerPortrait = ({
  customer,
  config,
  size = 84,
  mood = 'neutral',
  className = '',
}: CustomerPortraitProps) => {
  const portrait = config ?? customer?.portrait;
  if (!portrait) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={customer ? `Portrait of ${customer.name}` : 'Chef portrait'}
    >
      <circle cx="50" cy="50" r="49" fill="#F7F1E5" />
      <circle cx="50" cy="50" r="43" fill={portrait.outfit} opacity=".22" />
      <path d="M25 100c0-19 11-29 25-29s25 10 25 29z" fill={portrait.outfit} />
      <path d="M43 59h14v10c0 4-3 7-7 7s-7-3-7-7z" fill={portrait.skin} />
      <ellipse cx="50" cy="46" rx="23" ry="25" fill={portrait.skin} />
      <Hair config={portrait} mood={mood} />
      {makeMood(mood, portrait.eye)}
      <Mouth mood={mood} />
      <Accessory config={portrait} />
      <ellipse cx="30" cy="56" rx="4" ry="2" fill="#EF9D91" opacity=".35" />
      <ellipse cx="70" cy="56" rx="4" ry="2" fill="#EF9D91" opacity=".35" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#FFFDF7" strokeWidth="2" opacity=".8" />
    </svg>
  );
};
