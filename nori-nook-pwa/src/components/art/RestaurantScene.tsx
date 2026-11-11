import type { PointerEvent } from 'react';
import type { PlacedDecoration } from '@/types/game';
import type { RestaurantTier } from '@/data/restaurantTiers';
import { decorationById } from '@/data/decorations';
import { DecorArt } from './DecorArt';

interface RestaurantSceneProps {
  tier: RestaurantTier;
  decorations?: PlacedDecoration[];
  interactive?: boolean;
  selectedUid?: string | null;
  onItemPointerDown?: (uid: string, event: PointerEvent<HTMLDivElement>) => void;
  compact?: boolean;
  className?: string;
}

export const RestaurantScene = ({
  tier,
  decorations = [],
  interactive = false,
  selectedUid,
  onItemPointerDown,
  compact = false,
  className = '',
}: RestaurantSceneProps) => {
  const sorted = [...decorations].sort((a, b) => a.y - b.y);
  return (
    <div
      className={`restaurant-scene tier-${tier.level} ${compact ? 'is-compact' : ''} ${interactive ? 'is-editable' : ''} ${className}`.trim()}
      style={
        {
          '--room-wall': tier.wall,
          '--room-floor': tier.floor,
          '--room-accent': tier.accent,
          '--room-glow': tier.glow,
        } as React.CSSProperties
      }
      aria-label={`${tier.name} interior`}
    >
      <div className="room-glow" />
      <svg className="room-backdrop" viewBox="0 0 400 250" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="400" height="166" fill="var(--room-wall)" />
        <rect x="0" y="150" width="400" height="100" fill="var(--room-floor)" />
        <path d="M0 150h400" stroke="#80614E" strokeWidth="3" opacity=".25" />
        <path d="M0 174h400M0 200h400M0 230h400" stroke="#80614E" strokeWidth="1.5" opacity=".12" />
        <path d="M40 150 0 250M120 150l-30 100M280 150l30 100M360 150l40 100" stroke="#80614E" strokeWidth="1" opacity=".1" />

        <g>
          <rect x="248" y="38" width="112" height="82" rx="5" fill="#F7F1E5" stroke="#80614E" strokeWidth="3" />
          <rect x="255" y="45" width="98" height="68" fill="#A7C7D9" />
          <circle cx="330" cy="62" r="11" fill="#FFFDF7" opacity=".8" />
          <path d="M255 96c18-13 28-8 38 0s18 8 28-4 18-7 32 2v19h-98z" fill="#A7B99A" opacity=".8" />
          <path d="M255 108c18-10 28-4 39 2s20 2 30-3 19-2 29 4v2h-98z" fill="#607B62" opacity=".5" />
          <path d="M255 45v68M304 45v68" stroke="#FFFDF7" strokeWidth="3" opacity=".7" />
        </g>

        <g opacity=".95">
          <rect x="34" y="26" width="118" height="8" rx="4" fill="#80614E" />
          <path d="M40 34h28v47c0 7-5 10-10 7l-9-5c-5-2-9-6-9-11z" fill="#607B62" />
          <path d="M72 34h26v52c-5 4-13 4-18 0-5-3-8-8-8-14z" fill="#607B62" opacity=".93" />
          <path d="M102 34h38v45c0 7-5 10-11 7l-12-6c-7-3-15-6-15-12z" fill="#607B62" />
          <path d="M85 55c5 5 11 5 16 0M85 65c4 4 8 4 12 0" fill="none" stroke="#FFFDF7" strokeWidth="2" opacity=".65" />
        </g>

        <g>
          <path d="M190 26v18" stroke="#80614E" strokeWidth="2" />
          <path d="M172 44c-6-1-10 4-7 10 3 5 9 7 25 7s22-2 25-7c3-6-1-11-7-10-8-7-28-7-36 0z" fill="#F4C36B" opacity=".9" />
          <circle cx="190" cy="52" r="20" fill="#F4C36B" opacity=".18" />
        </g>

        <g>
          <path d="M210 150h-42l-18 50h76z" fill="#C9A97A" />
          <path d="M194 170h32l16 36h-64z" fill="#E3C89E" opacity=".75" />
          <ellipse cx="230" cy="150" rx="12" ry="4" fill="#FFFDF7" opacity=".8" />
          <ellipse cx="256" cy="150" rx="10" ry="3.5" fill="#FFFDF7" opacity=".65" />
        </g>

        <g>
          <ellipse cx="86" cy="205" rx="42" ry="7" fill="#80614E" opacity=".14" />
          <rect x="54" y="180" width="64" height="12" rx="5" fill="#C9A97A" />
          <rect x="58" y="192" width="5" height="18" rx="2" fill="#80614E" />
          <rect x="109" y="192" width="5" height="18" rx="2" fill="#80614E" />
          <ellipse cx="75" cy="180" rx="10" ry="3" fill="#FFFDF7" />
        </g>

        {tier.level >= 2 ? (
          <g>
            <path d="M320 132c0-16 12-26 26-26s26 10 26 26z" fill="#EBC6CB" opacity=".8" />
            <rect x="344" y="132" width="4" height="14" fill="#80614E" opacity=".5" />
          </g>
        ) : null}

        {tier.level >= 3 ? (
          <g>
            <ellipse cx="172" cy="198" rx="30" ry="6" fill="#80614E" opacity=".12" />
            <rect x="154" y="176" width="35" height="10" rx="4" fill="#C9A97A" />
            <rect x="157" y="186" width="4" height="15" rx="2" fill="#80614E" />
            <rect x="182" y="186" width="4" height="15" rx="2" fill="#80614E" />
          </g>
        ) : null}

        {tier.level >= 4 ? (
          <g>
            <rect x="272" y="118" width="54" height="6" rx="3" fill="#80614E" />
            <rect x="276" y="124" width="46" height="22" rx="2" fill="#C9A97A" />
            <rect x="281" y="120" width="7" height="18" rx="2" fill="#EF9D91" />
            <rect x="291" y="119" width="6" height="19" rx="2" fill="#607B62" />
            <rect x="300" y="121" width="8" height="17" rx="2" fill="#F4C36B" />
            <rect x="311" y="120" width="5" height="18" rx="2" fill="#A7B99A" />
          </g>
        ) : null}

        <g>
          <path d="M28 176c0-4 4-7 9-7s9 3 9 7v18H28z" fill="#607B62" opacity=".8" />
          <path d="M35 170c-2-7 1-12 6-15M43 170c2-6 5-9 9-10" fill="none" stroke="#607B62" strokeWidth="3" strokeLinecap="round" />
        </g>

        <g fill="#80614E" opacity=".22">
          <path d="M0 0h400v5H0z" />
          <rect x="0" y="0" width="4" height="150" />
          <rect x="396" y="0" width="4" height="150" />
        </g>
      </svg>

      <div className="room-sign">
        <span>の</span>
        <strong>NORI NOOK</strong>
      </div>

      {tier.level >= 3 ? (
        <div className="room-petals" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}

      <div className="room-customers" aria-hidden="true">
        {tier.level >= 2 ? (
          <>
            <span className="tiny-guest guest-a">
              <i />
            </span>
            <span className="tiny-guest guest-b">
              <i />
            </span>
          </>
        ) : null}
      </div>

      <div className="room-decorations">
        {sorted.map((placed) => {
          const item = decorationById(placed.decorationId);
          if (!item) return null;
          return (
            <div
              key={placed.uid}
              className={`placed-decoration ${selectedUid === placed.uid ? 'is-selected' : ''} ${interactive ? 'is-draggable' : ''}`.trim()}
              style={{
                left: `${placed.x}%`,
                top: `${placed.y}%`,
                width: `${item.width}%`,
                transform: `translate(-50%, -78%) scaleX(${placed.flip ? -1 : 1})`,
                zIndex: Math.round(placed.y),
              }}
              onPointerDown={
                interactive && onItemPointerDown
                  ? (event) => onItemPointerDown(placed.uid, event)
                  : undefined
              }
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${item.name}. Drag to move.` : undefined}
            >
              <DecorArt decoration={item} size={140} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
