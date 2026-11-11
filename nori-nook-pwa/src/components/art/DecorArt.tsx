import type { Decoration } from '@/types/game';

const outline = 'rgba(57,58,54,.25)';
const wood = '#C9A97A';

const artFor = (decoration: Decoration) => {
  const c = decoration.color;
  const a = decoration.accent;
  switch (decoration.art) {
    case 'table_wood':
    case 'table_window':
      return (
        <g>
          <ellipse cx="50" cy="83" rx="38" ry="6" fill="#80614E" opacity=".14" />
          <rect x="10" y="44" width="80" height="15" rx="6" fill={c} stroke={outline} />
          <rect x="16" y="59" width="7" height="25" rx="2" fill={a} />
          <rect x="77" y="59" width="7" height="25" rx="2" fill={a} />
          <path d="M22 49h56" stroke="#FFFDF7" strokeWidth="2" opacity=".45" />
          <ellipse cx="36" cy="44" rx="10" ry="3" fill="#FFFDF7" opacity=".8" />
        </g>
      );
    case 'chair_tatami':
    case 'chair_stool':
      return (
        <g>
          <ellipse cx="50" cy="86" rx="23" ry="5" fill="#80614E" opacity=".13" />
          <rect x="31" y="50" width="38" height="22" rx="10" fill={c} stroke={outline} />
          <rect x="35" y="72" width="5" height="15" rx="2" fill={a} />
          <rect x="60" y="72" width="5" height="15" rx="2" fill={a} />
          <path d="M38 59h24" stroke={a} strokeWidth="2" opacity=".5" />
        </g>
      );
    case 'counter_wood':
      return (
        <g>
          <ellipse cx="50" cy="85" rx="45" ry="6" fill="#80614E" opacity=".14" />
          <rect x="4" y="40" width="92" height="18" rx="7" fill={c} stroke={outline} />
          <rect x="8" y="58" width="84" height="24" fill={a} opacity=".8" />
          <path d="M16 64h68M16 72h68" stroke="#FFFDF7" strokeWidth="2" opacity=".3" />
          <ellipse cx="33" cy="39" rx="10" ry="3" fill="#FFFDF7" opacity=".75" />
          <ellipse cx="60" cy="39" rx="10" ry="3" fill="#FFFDF7" opacity=".75" />
        </g>
      );
    case 'lamp_paper':
    case 'lamp_moon':
    case 'lantern_red':
    case 'lantern_night':
      return (
        <g>
          <path d="M50 8v14" stroke="#80614E" strokeWidth="2" />
          <rect x="43" y="18" width="14" height="5" rx="2" fill={a} />
          <path d="M28 25c0-6 10-10 22-10s22 4 22 10v35c0 7-10 11-22 11s-22-4-22-11z" fill={c} stroke={outline} />
          <path d="M50 21v48M32 37h36M32 51h36" stroke={a} strokeWidth="1.4" opacity=".45" />
          <circle cx="50" cy="44" r="14" fill={a} opacity=".16" />
          <rect x="43" y="70" width="14" height="4" rx="2" fill={a} />
        </g>
      );
    case 'plant_bamboo':
    case 'plant_sakura':
    case 'plant_pine':
      return (
        <g>
          <ellipse cx="50" cy="88" rx="24" ry="5" fill="#80614E" opacity=".14" />
          <path d="M34 84c-1-10 3-20 7-30l9 1c-2 12-2 21 0 29z" fill="#8FBF8F" stroke={outline} />
          <path d="M54 84c1-11 4-19 8-26l8 2c-3 9-4 16-3 24z" fill="#A7B99A" stroke={outline} />
          <path d="M44 84c0-14 1-25 5-35l7 1c-2 13-1 24 1 34z" fill={a} opacity=".85" />
          {decoration.art === 'plant_sakura' ? (
            <g fill={c}>
              <circle cx="35" cy="34" r="8" />
              <circle cx="48" cy="23" r="10" />
              <circle cx="62" cy="31" r="9" />
              <circle cx="54" cy="41" r="7" />
            </g>
          ) : decoration.art === 'plant_pine' ? (
            <g fill={c}>
              <ellipse cx="42" cy="28" rx="18" ry="9" />
              <ellipse cx="58" cy="38" rx="16" ry="8" />
              <ellipse cx="48" cy="47" rx="13" ry="7" />
            </g>
          ) : (
            <g fill={c}>
              <ellipse cx="36" cy="38" rx="12" ry="5" transform="rotate(-25 36 38)" />
              <ellipse cx="58" cy="28" rx="13" ry="5" transform="rotate(25 58 28)" />
              <ellipse cx="59" cy="47" rx="12" ry="5" transform="rotate(-10 59 47)" />
            </g>
          )}
          <path d="M42 84h18l4 8H38z" fill={wood} stroke={outline} />
        </g>
      );
    case 'art_wave':
      return (
        <g>
          <rect x="12" y="16" width="76" height="68" rx="5" fill={c} stroke={a} strokeWidth="3" />
          <path d="M20 64c10-16 18-16 27 0s17 16 28 0" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round" />
          <path d="M20 51c10-13 18-13 27 0s17 13 28 0" fill="none" stroke={a} strokeWidth="2" strokeLinecap="round" opacity=".6" />
          <circle cx="70" cy="30" r="6" fill="#EF9D91" opacity=".8" />
        </g>
      );
    case 'art_scroll':
      return (
        <g>
          <rect x="25" y="6" width="50" height="88" rx="3" fill="#F7F1E5" stroke={outline} />
          <rect x="20" y="4" width="60" height="7" rx="3" fill={a} />
          <rect x="20" y="89" width="60" height="7" rx="3" fill={a} />
          <path d="M35 25c12 10 18 22 14 38M58 22c-6 16-3 30 4 42M35 74c12-9 22-8 30 0" fill="none" stroke={a} strokeWidth="2.5" opacity=".7" />
          <circle cx="58" cy="34" r="5" fill="#EF9D91" opacity=".7" />
        </g>
      );
    case 'menu':
      return (
        <g>
          <rect x="18" y="10" width="64" height="76" rx="5" fill={c} stroke={outline} />
          <rect x="23" y="15" width="54" height="66" rx="3" fill="#3F403B" />
          <path d="M31 28h36M31 38h26M31 48h33M31 58h20M31 68h30" stroke={a} strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <path d="M54 22c4-4 8-2 8 2s-8 6-8 6-8-2-8-6 4-6 8-2z" fill="#F4C36B" />
        </g>
      );
    case 'noren':
    case 'noren_sakura':
      return (
        <g>
          <rect x="8" y="18" width="84" height="7" rx="3.5" fill="#80614E" />
          <path d="M12 25h22v47c0 6-6 8-11 5l-6-4c-3-1-5-4-5-8z" fill={c} />
          <path d="M40 25h22v53c-4 3-12 3-17 0-3-2-5-5-5-9z" fill={c} opacity=".95" />
          <path d="M68 25h20v47c0 6-5 8-10 5l-5-4c-3-1-5-4-5-8z" fill={c} />
          <path d="M45 45c4 5 10 5 14 0M45 54c4 5 10 5 14 0" fill="none" stroke={a} strokeWidth="2" opacity=".7" />
          {decoration.art === 'noren_sakura' ? (
            <g fill="#FFFDF7" opacity=".8">
              <circle cx="26" cy="48" r="3" />
              <circle cx="77" cy="42" r="3" />
              <circle cx="88" cy="57" r="2" />
            </g>
          ) : null}
        </g>
      );
    case 'shelf_jars':
    case 'shelf_books':
      return (
        <g>
          <ellipse cx="50" cy="90" rx="30" ry="4" fill="#80614E" opacity=".12" />
          <rect x="15" y="15" width="70" height="72" rx="4" fill={wood} stroke={outline} />
          <rect x="20" y="21" width="60" height="18" fill="#FFFDF7" />
          <rect x="20" y="45" width="60" height="18" fill="#FFFDF7" />
          <rect x="20" y="69" width="60" height="12" fill="#FFFDF7" />
          {decoration.art === 'shelf_jars' ? (
            <g>
              <rect x="25" y="25" width="10" height="13" rx="3" fill={a} />
              <rect x="41" y="23" width="12" height="15" rx="4" fill="#A7B99A" />
              <rect x="58" y="26" width="10" height="12" rx="3" fill="#EF9D91" />
              <rect x="26" y="49" width="13" height="13" rx="4" fill="#F4C3A5" />
              <rect x="44" y="47" width="10" height="15" rx="3" fill="#607B62" />
              <rect x="59" y="50" width="14" height="12" rx="3" fill="#EBC6CB" />
            </g>
          ) : (
            <g>
              <rect x="23" y="24" width="6" height="14" fill="#EF9D91" />
              <rect x="30" y="22" width="5" height="16" fill="#607B62" />
              <rect x="36" y="25" width="7" height="13" fill="#F4C36B" />
              <rect x="46" y="23" width="6" height="15" fill="#A7B99A" />
              <rect x="54" y="25" width="8" height="13" fill="#80614E" />
              <rect x="65" y="22" width="5" height="16" fill="#EBC6CB" />
              <rect x="24" y="50" width="7" height="13" fill="#F4C36B" />
              <rect x="33" y="47" width="6" height="16" fill="#EF9D91" />
              <rect x="41" y="50" width="8" height="13" fill="#607B62" />
              <rect x="52" y="49" width="5" height="14" fill="#A7B99A" />
              <rect x="60" y="47" width="7" height="16" fill="#80614E" />
            </g>
          )}
        </g>
      );
    case 'aquarium':
    case 'aquarium_big':
      return (
        <g>
          <ellipse cx="50" cy="87" rx="34" ry="5" fill="#80614E" opacity=".13" />
          <rect x="12" y="24" width="76" height="58" rx="8" fill={c} stroke={outline} />
          <rect x="17" y="29" width="66" height="48" rx="5" fill="#86B8C9" opacity=".65" />
          <path d="M20 54c6-8 11-8 17 0s11 8 17 0 11-8 17 0 8 6 12 2" fill="none" stroke="#FFFDF7" strokeWidth="2" opacity=".5" />
          <path d="M37 48c8-5 16-2 16 6l7-4v10l-7-4c-2 8-11 10-16 4-3-3-3-9 0-12z" fill="#F4C3A5" />
          <circle cx="44" cy="51" r="1.6" fill="#393A36" />
          <circle cx="64" cy="59" r="4" fill="#EF9D91" opacity=".8" />
          <path d="M31 76c2-8 5-12 10-16M59 76c-1-6-4-10-7-13" fill="none" stroke="#607B62" strokeWidth="2" />
          <rect x="20" y="70" width="60" height="5" rx="2.5" fill={a} opacity=".8" />
        </g>
      );
    case 'tatami':
      return (
        <g>
          <rect x="7" y="55" width="86" height="32" rx="7" fill={c} stroke={outline} />
          <path d="M10 64h80M10 78h80M33 56v30M66 56v30" stroke={a} strokeWidth="1.3" opacity=".55" />
          <path d="M7 55h86" stroke="#FFFDF7" strokeWidth="2" opacity=".3" />
        </g>
      );
    case 'sofa':
      return (
        <g>
          <ellipse cx="50" cy="86" rx="40" ry="5" fill="#80614E" opacity=".13" />
          <rect x="8" y="36" width="84" height="38" rx="12" fill={c} stroke={outline} />
          <rect x="13" y="47" width="22" height="22" rx="7" fill={a} opacity=".45" />
          <rect x="38" y="47" width="24" height="22" rx="7" fill={a} opacity=".3" />
          <rect x="65" y="47" width="22" height="22" rx="7" fill={a} opacity=".45" />
          <rect x="13" y="69" width="7" height="17" rx="2" fill={a} />
          <rect x="80" y="69" width="7" height="17" rx="2" fill={a} />
          <path d="M18 38c0-9 7-14 16-14s16 5 16 14" fill={c} opacity=".7" />
        </g>
      );
    case 'window_round':
    case 'window_shoji':
      return (
        <g>
          <rect x="16" y="12" width="68" height="76" rx="6" fill={c} stroke={outline} />
          {decoration.art === 'window_round' ? (
            <>
              <circle cx="50" cy="48" r="25" fill="#A7C7D9" opacity=".7" />
              <circle cx="50" cy="48" r="25" fill="none" stroke="#FFFDF7" strokeWidth="4" />
              <path d="M25 48h50M50 23v50" stroke="#FFFDF7" strokeWidth="2" />
            </>
          ) : (
            <>
              <rect x="22" y="18" width="56" height="64" fill="#DCE6EA" />
              <path d="M50 18v64M22 50h56M22 34h56M22 66h56" stroke="#C9A97A" strokeWidth="3" />
              <path d="M28 74c10-8 15-8 22-2M60 30c5-4 10-4 14 0" fill="none" stroke="#FFFDF7" strokeWidth="2" opacity=".8" />
            </>
          )}
        </g>
      );
    case 'sign_cat':
      return (
        <g>
          <rect x="16" y="18" width="68" height="62" rx="8" fill="#FFFDF7" stroke={outline} />
          <path d="M34 36 31 23l10 7h18l10-7-3 13v20c0 9-7 14-16 14s-16-5-16-14z" fill={c} stroke={outline} />
          <circle cx="43" cy="47" r="2" fill="#393A36" />
          <circle cx="57" cy="47" r="2" fill="#393A36" />
          <path d="M47 54q3 2 6 0" fill="none" stroke="#393A36" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="39" cy="52" rx="3" ry="1.4" fill="#EF9D91" opacity=".6" />
          <ellipse cx="61" cy="52" rx="3" ry="1.4" fill="#EF9D91" opacity=".6" />
          <path d="M62 62q8-4 10 3" fill="none" stroke={a} strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="28" r="3" fill="#F4C36B" />
        </g>
      );
    case 'sign_open':
      return (
        <g>
          <rect x="12" y="34" width="76" height="34" rx="8" fill={c} stroke={outline} />
          <text x="50" y="56" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="16" fill={a} letterSpacing="2">OPEN</text>
          <circle cx="24" cy="41" r="2" fill={a} opacity=".6" />
          <circle cx="76" cy="61" r="2" fill={a} opacity=".6" />
        </g>
      );
    case 'cushion':
      return (
        <g>
          <ellipse cx="50" cy="78" rx="31" ry="7" fill="#80614E" opacity=".13" />
          <rect x="18" y="44" width="64" height="30" rx="15" fill={c} stroke={outline} />
          <path d="M30 59h40" stroke={a} strokeWidth="2" opacity=".5" />
          <circle cx="36" cy="52" r="2.5" fill={a} opacity=".5" />
          <circle cx="64" cy="52" r="2.5" fill={a} opacity=".5" />
        </g>
      );
    case 'vase_flower':
    case 'vase_autumn':
      return (
        <g>
          <ellipse cx="50" cy="86" rx="22" ry="5" fill="#80614E" opacity=".13" />
          <path d="M36 62c0-10 28-10 28 0l-4 22H40z" fill={c} stroke={outline} />
          <path d="M50 62V25M50 42c-10-3-14-9-14-15M50 37c9-3 13-9 13-15" fill="none" stroke={a} strokeWidth="2.5" strokeLinecap="round" />
          {decoration.art === 'vase_flower' ? (
            <g fill="#EBC6CB">
              <circle cx="35" cy="24" r="5" />
              <circle cx="63" cy="20" r="5" />
              <circle cx="50" cy="20" r="4" />
              <circle cx="43" cy="33" r="4" />
            </g>
          ) : (
            <g fill={a}>
              <path d="M35 24c-6-5-11-3-11 2 0 4 6 7 12 5z" />
              <path d="M63 20c6-5 11-2 10 3-1 4-7 5-12 3z" />
              <path d="M50 19c-4-7 1-11 5-9 4 2 3 8-1 10z" />
              <path d="M43 33c-6-4-10-1-9 3 1 3 6 4 10 2z" />
            </g>
          )}
        </g>
      );
    case 'poster_tokyo':
    case 'poster_winter':
      return (
        <g>
          <rect x="24" y="10" width="52" height="76" rx="3" fill={c} stroke={outline} />
          {decoration.art === 'poster_tokyo' ? (
            <>
              <path d="M28 66h44M34 66V43h30v23M42 66V53h7v13M55 66V53h7v13" fill="none" stroke={a} strokeWidth="2" />
              <circle cx="50" cy="28" r="9" fill="#F4C36B" />
              <path d="M30 72h40" stroke="#EF9D91" strokeWidth="3" />
            </>
          ) : (
            <>
              <path d="M24 64c10-10 20-12 30-4 8-7 16-6 22 1v25H24z" fill="#FFFDF7" opacity=".85" />
              <path d="M28 40h44M32 32h8M48 26h5M58 36h7" stroke="#FFFDF7" strokeWidth="3" strokeLinecap="round" opacity=".7" />
              <circle cx="66" cy="24" r="6" fill="#F4C36B" />
            </>
          )}
        </g>
      );
    default:
      return <circle cx="50" cy="50" r="30" fill={c} stroke={outline} />;
  }
};

export const DecorArt = ({ decoration, size = 80 }: { decoration: Decoration; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    {artFor(decoration)}
  </svg>
);
