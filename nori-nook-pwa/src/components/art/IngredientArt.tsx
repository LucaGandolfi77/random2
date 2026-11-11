import type { Ingredient } from '@/types/game';
import { ingredientById } from '@/data/ingredients';
import { hashString } from '@/utils/rng';

type Mood = 'happy' | 'sleepy' | 'angry' | 'shy';

const ink = '#393A36';
const outline = 'rgba(57,58,54,.42)';

const Face = ({
  x,
  y,
  scale = 1,
  mood = 'happy',
  color = ink,
}: {
  x: number;
  y: number;
  scale?: number;
  mood?: Mood;
  color?: string;
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {mood === 'sleepy' ? (
      <path d="M-9-2q3 3 6 0M2-2q3 3 6 0" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    ) : (
      <>
        <circle cx="-5" cy="-1" r="1.8" fill={color} />
        <circle cx="5" cy="-1" r="1.8" fill={color} />
        {mood === 'angry' ? (
          <>
            <path d="M-9-5 2-2M9-5 6-2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </>
        ) : null}
      </>
    )}
    {mood === 'angry' ? (
      <path d="M-3 6q3-2 6 0" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    ) : mood === 'sleepy' ? (
      <path d="M-2 5h4" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    ) : (
      <path d="M-3 4q3 3 6 0" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    )}
    <ellipse cx="-10" cy="4" rx="3" ry="1.8" fill="#EF9D91" opacity=".4" />
    <ellipse cx="10" cy="4" rx="3" ry="1.8" fill="#EF9D91" opacity=".4" />
  </g>
);

const Shadow = () => <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#80614E" opacity=".13" />;

const art = (ingredient: Ingredient) => {
  const c = ingredient.color;
  const a = ingredient.accent;
  switch (ingredient.art) {
    case 'rice':
      return (
        <>
          <Shadow />
          <ellipse cx="24" cy="43" rx="8" ry="12" transform="rotate(-24 24 43)" fill={c} stroke={outline} />
          <ellipse cx="42" cy="42" rx="8" ry="12" transform="rotate(22 42 42)" fill={c} stroke={outline} />
          <ellipse cx="32" cy="35" rx="12" ry="17" transform="rotate(-3 32 35)" fill={c} stroke={outline} />
          <Face x={32} y={34} scale={1.05} />
        </>
      );
    case 'fish':
      return (
        <>
          <Shadow />
          <path d="M10 37c8-13 28-17 40-7l7-6v18l-8-4c-12 11-31 11-39-1z" fill={c} stroke={outline} />
          <path d="M15 38c8-4 16-5 24-3" fill="none" stroke={a} strokeWidth="2" opacity=".65" />
          <Face x={30} y={34} scale={1.02} />
        </>
      );
    case 'shrimp':
      return (
        <>
          <Shadow />
          <path d="M18 48c-10-11-7-26 8-33 13-5 25 2 23 13-1 8-11 11-18 14-5 2-7 7-13 6z" fill={c} stroke={outline} />
          <path d="M25 22c7-3 14-2 19 2M22 30c6-2 13-2 18 2M22 38c5-1 10 0 14 3" fill="none" stroke={a} strokeWidth="1.5" opacity=".65" />
          <Face x={40} y={25} scale={.85} />
        </>
      );
    case 'eel':
      return (
        <>
          <Shadow />
          <path d="M9 45c10 3 15-12 25-12s14 9 22 3c3-2 4-6 3-9 7 6 5 15-2 19-9 5-15-4-23-1-9 4-13 12-24 10-4-1-5-6-1-10z" fill={c} stroke={outline} />
          <path d="M14 43c9-1 12-10 21-10 7 0 12 6 19 2" fill="none" stroke={a} strokeWidth="2.4" opacity=".5" />
          <Face x={50} y={33} scale={.75} color="#FFFDF7" />
        </>
      );
    case 'crab':
      return (
        <>
          <Shadow />
          <path d="M14 36c2-9 10-14 18-14s17 5 18 14c1 7-4 11-18 11S13 43 14 36z" fill={c} stroke={outline} />
          <path d="M13 31c-6-6-9-1-7 4 2 4 5 4 7 1M51 31c6-6 9-1 7 4-2 4-5 4-7 1" fill={a} stroke={outline} />
          <path d="M17 45c-5 2-6 5-5 8M47 45c5 2 6 5 5 8" fill="none" stroke={outline} strokeWidth="2" />
          <Face x={32} y={35} scale={1.05} />
        </>
      );
    case 'scallop':
      return (
        <>
          <Shadow />
          <path d="M13 45c0-17 8-28 19-28s19 11 19 28c0 4-9 6-19 6s-19-2-19-6z" fill={c} stroke={outline} />
          <path d="M22 23c-3 7-3 14 0 21M32 18v28M42 23c3 7 3 14 0 21" fill="none" stroke={a} strokeWidth="1.2" opacity=".6" />
          <circle cx="32" cy="35" r="10" fill="#FFFDF7" stroke={outline} />
          <Face x={32} y={34} scale={.85} />
        </>
      );
    case 'octopus':
      return (
        <>
          <Shadow />
          <path d="M18 34c0-10 6-18 14-18s14 8 14 18c0 8-6 12-14 12s-14-4-14-12z" fill={c} stroke={outline} />
          <path d="M22 44c-3 5-7 6-10 5M28 46c-2 5-5 7-8 8M36 46c2 5 5 7 8 8M42 44c3 5 7 6 10 5" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />
          <Face x={32} y={33} scale={1.05} />
        </>
      );
    case 'avocado':
      return (
        <>
          <Shadow />
          <path d="M32 9c10 0 18 12 18 24 0 13-8 20-18 20s-18-7-18-20C14 21 22 9 32 9z" fill={a} stroke={outline} />
          <path d="M32 18c7 0 12 8 12 17 0 9-5 14-12 14s-12-5-12-14c0-9 5-17 12-17z" fill={c} />
          <circle cx="32" cy="37" r="9" fill="#B98F66" stroke={outline} />
          <Face x={32} y={36} scale={.85} />
        </>
      );
    case 'cucumber':
      return (
        <>
          <Shadow />
          <circle cx="32" cy="32" r="20" fill={c} stroke={outline} />
          <circle cx="32" cy="32" r="14" fill="#EFF7E8" stroke={outline} />
          <g fill={a} opacity=".8">
            <ellipse cx="27" cy="27" rx="1.4" ry="2.2" />
            <ellipse cx="38" cy="28" rx="1.4" ry="2.2" />
            <ellipse cx="29" cy="39" rx="1.4" ry="2.2" />
            <ellipse cx="38" cy="38" rx="1.4" ry="2.2" />
          </g>
          <Face x={32} y={32} scale={.85} />
        </>
      );
    case 'carrot':
      return (
        <>
          <Shadow />
          <path d="M32 18 46 49c1 3-2 5-5 4L18 38z" fill={c} stroke={outline} />
          <path d="M31 20c-4-6-10-7-15-6 3 5 7 8 12 8M32 18c2-7 7-11 13-11-1 6-5 10-10 12" fill={a} />
          <Face x={31} y={32} scale={.8} />
        </>
      );
    case 'mango':
      return (
        <>
          <Shadow />
          <path d="M32 14c13 0 22 10 19 22-3 12-13 18-24 15C15 47 9 37 13 27c3-8 9-13 19-13z" fill={c} stroke={outline} />
          <path d="M42 16c2-5 7-8 11-7-1 5-5 9-10 9" fill={a} />
          <Face x={32} y={33} />
        </>
      );
    case 'daikon':
      return (
        <>
          <Shadow />
          <path d="M24 20c8-6 17-3 19 6 3 13-4 29-12 30-8 0-13-19-9-28 0-3 1-6 2-8z" fill={c} stroke={outline} />
          <path d="M30 18c-3-6-8-9-13-9 1 5 5 9 10 10M33 17c0-7 4-12 9-13 1 6-2 11-7 13" fill={a} />
          <Face x={33} y={32} scale={.82} />
        </>
      );
    case 'asparagus':
      return (
        <>
          <Shadow />
          <path d="M22 52 19 25c-1-6 4-8 7-3l6 29z" fill={c} stroke={outline} />
          <path d="M33 52l-3-31c-1-7 5-9 8-3l5 33z" fill={a} stroke={outline} />
          <path d="M45 52 44 23c0-6 6-7 8-1l2 29z" fill={c} stroke={outline} />
          <Face x={36} y={33} scale={.8} />
        </>
      );
    case 'nori':
      return (
        <>
          <Shadow />
          <path d="M12 18c8-3 13 2 20 0s13-2 20 1v31c-8-3-13 1-20 1s-13-3-20 0z" fill={c} stroke={outline} />
          <path d="M18 23c4 5 2 13 6 18M46 22c-4 5-1 13-5 20" fill="none" stroke={a} strokeWidth="1.4" opacity=".6" />
          <Face x={32} y={35} scale={1} mood="sleepy" color="#FFFDF7" />
        </>
      );
    case 'sesame':
      return (
        <>
          <Shadow />
          <g fill={c} stroke={outline}>
            <ellipse cx="20" cy="35" rx="4" ry="6" transform="rotate(-35 20 35)" />
            <ellipse cx="30" cy="25" rx="4" ry="6" transform="rotate(25 30 25)" />
            <ellipse cx="43" cy="30" rx="4" ry="6" transform="rotate(-15 43 30)" />
            <ellipse cx="26" cy="45" rx="4" ry="6" transform="rotate(20 26 45)" />
            <ellipse cx="43" cy="44" rx="4" ry="6" transform="rotate(-30 43 44)" />
          </g>
          <Face x={34} y={35} scale={.62} />
        </>
      );
    case 'roe':
      return (
        <>
          <Shadow />
          <path d="M12 24h40v27c-12 5-28 5-40 0z" fill="#393A36" stroke={outline} />
          {[
            [22, 30], [32, 27], [42, 30], [18, 40], [28, 37], [38, 36], [47, 39], [24, 47], [34, 45], [43, 48],
          ].map(([cx = 0, cy = 0], index) => (
            <circle key={index} cx={cx} cy={cy} r={index % 3 === 0 ? 3.5 : 2.7} fill={index === 5 ? a : c} stroke={outline} strokeWidth=".8" />
          ))}
          <Face x={32} y={51} scale={.55} />
        </>
      );
    case 'cheese':
      return (
        <>
          <Shadow />
          <path d="M15 44 30 18c2-3 5-3 8-1l13 18c2 2 1 5-2 5l-29 7c-4 1-6-1-5-3z" fill={c} stroke={outline} />
          <circle cx="30" cy="31" r="3" fill={a} opacity=".75" />
          <circle cx="41" cy="36" r="2" fill={a} opacity=".75" />
          <Face x={35} y={37} scale={.78} />
        </>
      );
    case 'tamago':
      return (
        <>
          <Shadow />
          <path d="M17 25c10-4 22-4 32 0v21c-10 4-22 4-32 0z" fill={c} stroke={outline} />
          <path d="M18 33c10-3 20-3 30 0" fill="none" stroke={a} strokeWidth="1.2" opacity=".7" />
          <rect x="38" y="23" width="9" height="27" rx="2" fill="#393A36" opacity=".9" />
          <Face x={28} y={34} scale={.85} />
        </>
      );
    case 'wasabi':
      return (
        <>
          <Shadow />
          <path d="M18 48c-5-8-1-18 8-22 11-5 22 2 22 13 0 8-7 12-15 12-6 0-12-1-15-3z" fill={a} stroke={outline} />
          <path d="M22 29c3-8 11-11 18-8" fill="none" stroke={c} strokeWidth="2" opacity=".7" />
          <Face x={34} y={36} scale={.95} mood="angry" />
        </>
      );
    case 'ginger':
      return (
        <>
          <Shadow />
          <path d="M17 44c-6-7 0-14 7-12 1-7 9-9 13-4 7-3 13 3 10 9 5 5 1 12-6 12z" fill={c} stroke={outline} />
          <path d="M24 31c5 1 8 4 9 9M38 29c3 3 4 7 3 11M29 48c0-4 1-7 3-10" fill="none" stroke={a} strokeWidth="1.3" opacity=".7" />
        </>
      );
    case 'bottle':
      return (
        <>
          <Shadow />
          <path d="M26 17h12v7c5 2 7 5 7 10v17c0 3-2 5-5 5H24c-3 0-5-2-5-5V34c0-5 2-8 7-10z" fill={c} stroke={outline} />
          <rect x="29" y="9" width="6" height="9" rx="1.5" fill={a} stroke={outline} />
          <rect x="22" y="35" width="20" height="15" rx="2" fill={a} opacity=".85" />
          <Face x={32} y={42} scale={.62} color={ingredient.id === 'soy_sauce' ? '#FFFDF7' : '#393A36'} />
        </>
      );
    case 'mayo':
      return (
        <>
          <Shadow />
          <path d="M24 21c0-5 3-8 8-8s8 3 8 8v25c0 4-3 7-8 7s-8-3-8-7z" fill={c} stroke={outline} />
          <path d="M30 13 32 7l2 6" fill={a} stroke={outline} />
          <path d="M25 33c5-2 9-2 14 0v13c-5 2-9 2-14 0z" fill={a} opacity=".8" />
          <Face x={32} y={38} scale={.6} />
        </>
      );
    case 'wagyu':
      return (
        <>
          <Shadow />
          <path d="M13 38c0-10 7-17 17-17 5-5 15-3 17 4 7 2 8 10 3 15-3 10-15 12-23 7-8 4-14-1-14-9z" fill={c} stroke={outline} />
          <path d="M17 38c5-2 8-6 10-11M31 25c-1 6 1 10 5 13M39 46c2-5 5-8 10-9" fill="none" stroke="#FFFDF7" strokeWidth="2" opacity=".75" />
          <Face x={31} y={38} scale={.83} />
        </>
      );
    case 'truffle':
      return (
        <>
          <Shadow />
          <path d="M17 40c-4-8 1-16 9-18 2-7 12-9 17-3 7-2 12 4 10 10 3 6-1 13-8 14-4 6-14 5-17 1-5 3-9 1-11-4z" fill={c} stroke={outline} />
          <circle cx="27" cy="30" r="2" fill={a} opacity=".7" />
          <circle cx="40" cy="37" r="2.4" fill={a} opacity=".7" />
          <circle cx="33" cy="27" r="1.4" fill={a} opacity=".7" />
          <Face x={33} y={38} scale={.8} />
        </>
      );
    case 'uni':
      return (
        <>
          <Shadow />
          <path d="M14 44c-2-10 3-17 9-20 2 5 5 7 9 7s7-2 9-7c7 3 11 10 9 20-9 6-27 6-36 0z" fill="#C9A97A" stroke={outline} />
          <path d="M23 37c0-5 3-8 8-8 1 3 2 4 3 4s3-1 4-4c5 0 7 4 6 9-7 4-14 4-21-1z" fill={c} stroke={outline} />
          <Face x={32} y={37} scale={.75} />
        </>
      );
    case 'leaf':
      return (
        <>
          <Shadow />
          <path d="M32 52C18 42 18 22 34 10c5 4 8 9 8 14 4 2 7 6 8 11-4 1-7 3-9 6-1 4-4 8-9 11z" fill={c} stroke={outline} />
          <path d="M32 46c0-13 2-23 8-31M32 32c-4-2-7-4-9-7" fill="none" stroke={a} strokeWidth="1.4" opacity=".7" />
        </>
      );
    default:
      return <circle cx="32" cy="32" r="18" fill={c} stroke={outline} />;
  }
};

interface IngredientArtProps {
  id: string;
  size?: number;
  className?: string;
  animate?: boolean;
}

export const IngredientArt = ({ id, size = 64, className = '', animate = true }: IngredientArtProps) => {
  const ingredient = ingredientById(id);
  if (!ingredient) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="18" fill="#F0E6D5" stroke={outline} />
        <Face x={32} y={32} />
      </svg>
    );
  }
  const delay = (hashString(ingredient.id) % 1000) / 1000;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`${animate ? 'ingredient-bob' : ''} ${className}`.trim()}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
      aria-hidden="true"
    >
      {art(ingredient)}
    </svg>
  );
};
