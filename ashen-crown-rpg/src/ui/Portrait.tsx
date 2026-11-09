import { useId } from 'react';
import type { Appearance } from '@/core/types';
import { cx } from '@/utils';

interface PortraitProps {
  appearance: Appearance;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  name?: string;
  dim?: boolean;
}

const shade = (hex: string, amount: number): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

export function Portrait({ appearance, size = 'md', className, name, dim }: PortraitProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = `bg${uid}`;
  const face = `face${uid}`;
  const glow = `glow${uid}`;
  const skinDark = shade(appearance.skin, -34);
  const skinLight = shade(appearance.skin, 22);
  const hairDark = shade(appearance.hair, -28);
  const hairLight = shade(appearance.hair, 26);
  const outfitDark = shade(appearance.outfit, -20);
  const outfitLight = shade(appearance.outfit, 18);
  const accent = appearance.accent;
  const eyeGlow = appearance.marking === 'crown' ? '#ffd680' : appearance.eyes;

  const hair = (() => {
    switch (appearance.hairStyle % 6) {
      case 1:
        return (
          <g>
            <path d="M76 118c2-36 22-55 54-55 35 0 52 22 52 58-7-13-13-22-26-27-13 11-39 17-67 10-2 8-8 10-13 14z" fill={appearance.hair} />
            <path d="M76 118c8-25 27-43 53-49 21 4 39 15 49 35-11-9-28-14-46-8-21 6-40 15-56 22z" fill={hairLight} opacity=".45" />
            <circle cx="165" cy="75" r="17" fill={appearance.hair} />
            <circle cx="165" cy="75" r="11" fill={hairDark} opacity=".55" />
          </g>
        );
      case 2:
        return (
          <g>
            <path d="M66 128c-9 26-9 54-3 80l24-7 3-74z" fill={appearance.hair} />
            <path d="M174 128c9 26 9 54 3 80l-24-7-3-74z" fill={appearance.hair} />
            <path d="M76 120c1-37 21-59 55-59 36 0 55 22 57 60-12-15-31-24-57-25-26 1-43 8-55 24z" fill={appearance.hair} />
            <path d="M80 113c9-19 27-34 49-38 22 3 39 12 51 31-18-12-37-15-56-10-16 4-31 9-44 17z" fill={hairLight} opacity=".45" />
            <path d="M72 144c-3 24-2 44 3 60M168 144c3 24 2 44-3 60" stroke={hairDark} strokeWidth="3" fill="none" opacity=".6" />
          </g>
        );
      case 3:
        return (
          <g>
            <path d="M76 118c3-36 23-56 56-56 34 0 53 21 54 58-10-17-26-26-55-27-25 1-40 10-55 25z" fill={appearance.hair} />
            <path d="M80 110c8-22 25-38 49-42 20 3 38 12 50 30-20-11-39-12-58-6-15 4-28 11-41 18z" fill={hairLight} opacity=".4" />
            <path d="M88 128c-9 24-8 52 1 72M170 128c9 24 8 52-1 72" stroke={appearance.hair} strokeWidth="12" strokeLinecap="round" fill="none" />
            <path d="M88 140l-4 34M170 140l4 34" stroke={hairDark} strokeWidth="3" strokeDasharray="3 7" opacity=".7" />
            <circle cx="88" cy="203" r="6" fill={accent} />
            <circle cx="170" cy="203" r="6" fill={accent} />
          </g>
        );
      case 4:
        return (
          <g>
            <path d="M74 122c-1-32 12-54 34-62 8 4 16 4 24 0 8 5 15 6 23 2 12 9 19 23 21 39-10-11-23-18-37-20-3 8-9 13-17 15-4-10-12-17-23-20-5 11-14 20-25 25z" fill={appearance.hair} />
            <path d="M82 98c10-20 29-31 51-31 20 1 34 9 45 25-16-9-33-10-51-5-17 5-32 13-45 22z" fill={hairLight} opacity=".4" />
            <path d="M78 64l-10-16M93 57l-3-19M149 54l8-18M167 64l14-13M181 84l18-4" stroke={appearance.hair} strokeWidth="5" strokeLinecap="round" />
            <path d="M76 126c-2 19 1 32 6 43M166 126c2 19-1 32-6 43" stroke={appearance.hair} strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
        );
      case 5:
        return (
          <g>
            <path d="M78 160c-6-58 16-96 55-99 41-1 66 37 61 99" fill="none" stroke={outfitDark} strokeWidth="30" strokeLinecap="round" />
            <path d="M78 160c-6-58 16-96 55-99 41-1 66 37 61 99" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity=".35" />
            <path d="M61 181c12 26 30 41 52 42-9-18-13-41-12-66-18 2-31 10-40 24z" fill={outfitDark} />
            <path d="M180 181c-12 26-30 41-52 42 9-18 13-41 12-66 18 2 31 10 40 24z" fill={outfitDark} />
            <path d="M76 118c8-27 27-46 55-49 27 1 46 15 58 42-19-16-38-23-57-21-19 1-38 11-56 28z" fill={appearance.outfit} opacity=".8" />
            <path d="M80 133c-2 16 1 29 6 39M172 133c2 16-1 29-6 39" stroke={accent} strokeWidth="1.5" opacity=".45" fill="none" />
          </g>
        );
      default:
        return (
          <g>
            <path d="M76 120c1-37 21-59 55-59 36 0 55 22 57 60-12-15-31-24-57-25-26 1-43 8-55 24z" fill={appearance.hair} />
            <path d="M80 113c9-19 27-34 49-38 22 3 39 12 51 31-18-12-37-15-56-10-16 4-31 9-44 17z" fill={hairLight} opacity=".45" />
            <path d="M82 119c-1 17 1 27 5 35M168 119c2 16 1 27-3 35" stroke={hairDark} strokeWidth="5" strokeLinecap="round" />
          </g>
        );
    }
  })();

  return (
    <div className={cx('portrait', `portrait-${size}`, dim && 'is-dim', className)} aria-hidden={!name} role={name ? 'img' : undefined} aria-label={name}>
      <svg viewBox="0 0 240 300" className="portrait-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={bg} cx="50%" cy="32%" r="82%">
            <stop offset="0%" stopColor={shade(appearance.accent, 18)} stopOpacity=".55" />
            <stop offset="42%" stopColor={shade(appearance.outfit, 6)} stopOpacity=".7" />
            <stop offset="100%" stopColor="#0b090b" />
          </radialGradient>
          <radialGradient id={face} cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor={skinLight} />
            <stop offset="62%" stopColor={appearance.skin} />
            <stop offset="100%" stopColor={skinDark} />
          </radialGradient>
          <radialGradient id={glow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity=".45" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`cloth${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={outfitLight} />
            <stop offset="100%" stopColor={outfitDark} />
          </linearGradient>
        </defs>

        <rect width="240" height="300" fill={`url(#${bg})`} />
        <circle cx="120" cy="132" r="108" fill={`url(#${glow})`} />
        <path d="M0 250c43-26 82-36 120-36s78 10 120 36v50H0z" fill="#08070a" opacity=".7" />

        {/* Shoulders and collar */}
        <path d="M16 300c5-55 38-83 82-94l22-4 24 4c44 11 76 39 81 94z" fill={`url(#cloth${uid})`} />
        <path d="M16 300c5-55 38-83 82-94l22-4 24 4c44 11 76 39 81 94z" fill="none" stroke={accent} strokeOpacity=".42" strokeWidth="1.5" />
        <path d="M94 206l26 31 27-31 12 8-17 56H99l-16-56z" fill={shade(appearance.outfit, -36)} />
        <path d="M96 206c7 12 15 20 24 27 9-7 17-15 24-27" fill="none" stroke={accent} strokeWidth="2" opacity=".6" />
        <path d="M51 300c11-34 26-54 47-66M189 300c-11-34-26-54-47-66" fill="none" stroke={outfitLight} strokeOpacity=".35" strokeWidth="3" />
        <path d="M54 262c-8 1-14-4-18-13M186 262c8 1 14-4 18-13" fill="none" stroke={accent} strokeWidth="2" opacity=".5" />

        {/* Neck */}
        <path d="M101 190c1 20-1 33-6 43 8 9 17 13 26 13s19-4 25-13c-6-10-8-24-7-43z" fill={skinDark} />
        <path d="M104 193c4 12 10 18 18 20 8-2 15-8 18-20z" fill={shade(appearance.skin, -55)} opacity=".55" />

        {/* Head */}
        <path d="M79 126c0-34 17-55 42-55 27 0 45 21 44 57 0 34-18 59-44 62-26-2-42-29-42-64z" fill={`url(#${face})`} />
        <path d="M80 133c-6 0-10-7-9-16 1-9 6-14 11-12z" fill={skinDark} />
        <path d="M164 133c6 0 10-7 9-16-1-9-6-14-11-12z" fill={skinDark} />
        <path d="M84 121c7-30 22-44 45-43 24 0 37 17 40 43-12-14-26-21-45-21-17 0-30 7-40 21z" fill={appearance.skin} opacity=".35" />
        <path d="M92 154c9-5 18-6 27-2M125 152c9-4 18-3 26 2" stroke={hairDark} strokeWidth="4" strokeLinecap="round" opacity=".75" />
        <path d="M104 150c5 2 10 2 15 0" stroke={shade(appearance.skin, -62)} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".7" />
        <ellipse cx="105" cy="156" rx="8.5" ry="5.2" fill="#f4ead6" />
        <ellipse cx="136" cy="156" rx="8.5" ry="5.2" fill="#f4ead6" />
        <circle cx="106" cy="156" r="4.2" fill={eyeGlow} />
        <circle cx="135" cy="156" r="4.2" fill={eyeGlow} />
        <circle cx="106.5" cy="156" r="1.9" fill="#100d10" />
        <circle cx="134.5" cy="156" r="1.9" fill="#100d10" />
        <circle cx="104.5" cy="154.5" r="1.1" fill="#fff" opacity=".8" />
        <circle cx="132.5" cy="154.5" r="1.1" fill="#fff" opacity=".8" />
        <path d="M97 146c4-4 10-4 14-1M129 145c5-3 11-2 15 2" stroke={hairDark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M120 158c-2 8-4 12-6 15 4 3 7 3 11 1" fill="none" stroke={shade(appearance.skin, -48)} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M108 183c8 4 17 4 25 0-4 9-19 10-25 0z" fill={shade(appearance.skin, -36)} />
        <path d="M112 184c5 2 11 2 17 0" stroke={shade(appearance.skin, -70)} strokeWidth="1.6" fill="none" />
        <path d="M97 196c15 8 31 9 47 1" stroke={shade(appearance.skin, -45)} strokeWidth="2" fill="none" opacity=".5" />

        {hair}

        {/* Markings */}
        {appearance.marking === 'scar' && (
          <path d="M145 127l-14 45M143 138l-10-3M136 154l-9-2M130 167l-8-2" stroke={shade(appearance.skin, -65)} strokeWidth="2.4" strokeLinecap="round" opacity=".8" />
        )}
        {appearance.marking === 'ritual' && (
          <g stroke={appearance.accent} strokeWidth="2" fill="none" opacity=".9">
            <path d="M107 172c4 4 9 5 14 4M96 165c2 4 4 8 5 13M147 160c-3 6-4 12-3 18" />
            <circle cx="121" cy="166" r="2.4" fill={appearance.accent} stroke="none" />
          </g>
        )}
        {appearance.marking === 'crown' && (
          <g>
            <path d="M94 118l9-14 8 8 9-14 9 14 8-8 9 14-6 5H100z" fill={accent} stroke={shade(accent, 40)} strokeWidth="1.5" />
            <circle cx="120" cy="112" r="2.6" fill="#fff4c8" />
            <path d="M103 124c10 4 24 4 34 0" stroke="#fff2c0" strokeWidth="1.4" opacity=".7" />
            <circle cx="106" cy="161" r="1.5" fill={accent} />
            <circle cx="137" cy="161" r="1.5" fill={accent} />
          </g>
        )}

        {/* Rim light */}
        <path d="M80 128c1-34 18-56 42-57 1 3 2 7 2 11-18 3-31 19-35 46z" fill="#fff" opacity=".08" />
        <path d="M163 126c0-20-6-36-17-45 12 3 19 16 20 36z" fill={accent} opacity=".18" />
      </svg>
      {name && <span className="portrait-name">{name}</span>}
    </div>
  );
}
