import type { RecipeIngredient } from '@/types/game';
import { recipeById } from '@/data/recipes';
import { ingredientById } from '@/data/ingredients';
import { findRecipeForIngredients, normalizeIngredients } from '@/game/sushi-making/match';

const ink = '#393A36';

const Face = ({ x, y, scale = 0.5 }: { x: number; y: number; scale?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <circle cx="-5" cy="-1" r="1.8" fill={ink} />
    <circle cx="5" cy="-1" r="1.8" fill={ink} />
    <path d="M-3 4q3 3 6 0" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
    <ellipse cx="-10" cy="4" rx="3" ry="1.7" fill="#EF9D91" opacity=".45" />
    <ellipse cx="10" cy="4" rx="3" ry="1.7" fill="#EF9D91" opacity=".45" />
  </g>
);

const Plate = () => (
  <>
    <ellipse cx="62" cy="67" rx="48" ry="9" fill="#80614E" opacity=".13" />
    <ellipse cx="62" cy="64" rx="49" ry="13" fill="#FFFDF7" stroke="rgba(57,58,54,.16)" />
    <ellipse cx="62" cy="63" rx="38" ry="8" fill="#F7F1E5" opacity=".7" />
  </>
);

const paletteFor = (ingredients: RecipeIngredient[]) => {
  const colors = ingredients
    .map((item) => ingredientById(item.id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const rice = colors.find((item) => item.category === 'rice')?.color ?? '#FFFDF7';
  const accents = colors
    .filter((item) => !['rice', 'other', 'premium'].includes(item.category) || item.premium)
    .map((item) => item.color);
  return {
    rice,
    nori: colors.some((item) => item.id === 'nori'),
    fillings: accents.length > 0 ? accents : ['#EF9D91', '#A7B99A'],
  };
};

const Maki = ({ x, color, rice, face = false }: { x: number; color: string; rice: string; face?: boolean }) => (
  <g>
    <circle cx={x} cy="49" r="17" fill="#393A36" />
    <circle cx={x} cy="49" r="13" fill={rice} />
    <circle cx={x} cy="49" r="7" fill={color} />
    {face ? <Face x={x} y={47} scale={0.56} /> : null}
  </g>
);

const Nigiri = ({ x, color, rice, nori = false }: { x: number; color: string; rice: string; nori?: boolean }) => (
  <g>
    <ellipse cx={x} cy="57" rx="21" ry="8" fill={rice} stroke="rgba(57,58,54,.18)" />
    <path d={`M${x - 23} 49c0-9 9-15 23-15s23 6 23 15c-6 8-40 8-46 0z`} fill={color} stroke="rgba(57,58,54,.2)" />
    <path d={`M${x - 19} 45c8-4 30-4 38 0`} fill="none" stroke="#FFFDF7" strokeWidth="2" opacity=".35" />
    {nori ? <rect x={x - 7} y="39" width="14" height="19" rx="2" fill="#393A36" opacity=".92" /> : null}
    <Face x={x} y={49} scale={0.55} />
  </g>
);

const Gunkan = ({ x, color, rice }: { x: number; color: string; rice: string }) => (
  <g>
    <ellipse cx={x} cy="58" rx="19" ry="7" fill="#393A36" />
    <ellipse cx={x} cy="50" rx="16" ry="11" fill={rice} stroke="rgba(57,58,54,.2)" />
    <path d={`M${x - 17} 48c0-9 34-9 34 0v10c-8 5-26 5-34 0z`} fill="#393A36" opacity=".92" />
    <g fill={color}>
      <circle cx={x - 8} cy="43" r="3" />
      <circle cx={x + 1} cy="41" r="3.2" />
      <circle cx={x + 9} cy="44" r="2.8" />
      <circle cx={x - 3} cy="47" r="2.4" />
      <circle cx={x + 7} cy="48" r="2.4" />
    </g>
    <Face x={x} y={51} scale={0.42} />
  </g>
);

const Onigiri = ({ x, color, rice }: { x: number; color: string; rice: string }) => (
  <g>
    <path d={`M${x} 24  ${x + 26} 62  ${x - 26} 62z`} fill={rice} stroke="rgba(57,58,54,.2)" />
    <rect x={x - 12} y="46" width="24" height="18" fill={color} rx="2" />
    <Face x={x} y={44} scale={0.55} />
  </g>
);

const Piece = ({ kind, x, color, rice, nori }: { kind: string; x: number; color: string; rice: string; nori?: boolean }) => {
  if (kind === 'maki' || kind === 'roll') return <Maki x={x} color={color} rice={rice} face />;
  if (kind === 'gunkan') return <Gunkan x={x} color={color} rice={rice} />;
  if (kind === 'onigiri') return <Onigiri x={x} color={color} rice={rice} />;
  return <Nigiri x={x} color={color} rice={rice} nori={nori} />;
};

interface SushiArtProps {
  recipeId?: string;
  ingredients?: RecipeIngredient[];
  size?: number;
  className?: string;
  animate?: boolean;
}

export const SushiArt = ({ recipeId, ingredients = [], size = 140, className = '', animate = false }: SushiArtProps) => {
  const recipe = recipeId ? recipeById(recipeId) : undefined;
  const normalized = normalizeIngredients(ingredients);
  const matched = recipe ?? (normalized.length > 0 ? findRecipeForIngredients(normalized) : undefined);
  if (!recipe && normalized.length === 0) {
    return (
      <svg viewBox="0 0 124 82" width={size} height={(size * 82) / 124} className={className} aria-hidden="true">
        <Plate />
        <circle cx="62" cy="62" r="2.5" fill="#A7B99A" opacity=".5" />
        <circle cx="74" cy="59" r="1.8" fill="#EBC6CB" opacity=".7" />
        <circle cx="52" cy="58" r="1.5" fill="#F4C36B" opacity=".7" />
      </svg>
    );
  }
  const palette = paletteFor(matched?.ingredients ?? normalized);
  const category = matched?.category ?? (palette.nori ? 'roll' : 'nigiri');
  const color = palette.fillings[0] ?? '#EF9D91';
  const second = palette.fillings[1] ?? '#A7B99A';
  return (
    <svg
      viewBox="0 0 124 82"
      width={size}
      height={(size * 82) / 124}
      className={`${animate ? 'sushi-float' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <Plate />
      {category === 'bowl' ? (
        <g>
          <path d="M30 34h64l-8 29c-13 5-35 5-48 0z" fill="#80614E" />
          <ellipse cx="62" cy="34" rx="32" ry="10" fill="#FFFDF7" />
          <g>
            <circle cx="48" cy="32" r="6" fill={color} />
            <circle cx="66" cy="30" r="6" fill={second} />
            <circle cx="78" cy="35" r="5" fill="#F4C36B" />
            <circle cx="56" cy="38" r="4" fill="#A7B99A" />
            <circle cx="70" cy="39" r="3" fill="#EF9D91" />
          </g>
          <Face x={62} y={34} scale={0.62} />
        </g>
      ) : category === 'onigiri' ? (
        <Onigiri x={62} color="#393A36" rice={palette.rice} />
      ) : category === 'gunkan' ? (
        <Gunkan x={62} color={color} rice={palette.rice} />
      ) : category === 'maki' ? (
        <g>
          <Maki x={32} color={second} rice={palette.rice} />
          <Maki x={62} color={color} rice={palette.rice} face />
          <Maki x={92} color={second} rice={palette.rice} />
        </g>
      ) : category === 'roll' ? (
        <g>
          <Maki x={30} color={second} rice={palette.rice} />
          <Maki x={58} color={color} rice={palette.rice} face />
          <Maki x={86} color={second} rice={palette.rice} />
          <circle cx="104" cy="37" r="3" fill="#F4C36B" opacity=".8" />
        </g>
      ) : category === 'nigiri' ? (
        <Nigiri x={62} color={color} rice={palette.rice} nori={palette.nori} />
      ) : (
        <g>
          <Nigiri x={46} color={color} rice={palette.rice} nori={palette.nori} />
          <Maki x={80} color={second} rice={palette.rice} face />
          <g fill="#F4C36B" opacity=".9">
            <circle cx="98" cy="35" r="2.4" />
            <circle cx="104" cy="41" r="1.7" />
          </g>
        </g>
      )}
      {animate ? (
        <g className="sushi-steam" stroke="#80614E" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".3">
          <path d="M52 24c-3-3-3-6 0-9" />
          <path d="M62 21c-3-3-3-6 0-9" />
          <path d="M72 24c-3-3-3-6 0-9" />
        </g>
      ) : null}
    </svg>
  );
};
