import { useId } from 'react';
import type { PortraitSpec } from '@/core/types';
import { cx } from '@/utils';

const shade = (hex: string, amount: number): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const value = Number.parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, ((value >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (value & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

interface PortraitProps {
  portrait: PortraitSpec;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  dim?: boolean;
}

export function Portrait({ portrait, size = 'md', className, label, dim }: PortraitProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = `bg${uid}`;
  const face = `face${uid}`;
  const glow = `glow${uid}`;
  const skinDark = shade(portrait.skin, -38);
  const skinLight = shade(portrait.skin, 22);
  const hairDark = shade(portrait.hair, -32);
  const hairLight = shade(portrait.hair, 26);
  const outfit = portrait.outfit;
  const accent = portrait.accent;
  const iris = portrait.eyes;

  const hair = (() => {
    switch (portrait.hairStyle % 6) {
      case 1:
        return (
          <g>
            <path d="M76 120c2-35 20-54 51-54 33 0 52 21 54 57-14-15-32-22-53-21-23 1-38 7-52 18z" fill={portrait.hair} />
            <path d="M80 111c10-20 27-33 48-36 18 3 34 12 44 27-15-8-32-10-47-6-16 4-30 9-45 15z" fill={hairLight} opacity=".35" />
            <circle cx="169" cy="78" r="14" fill={portrait.hair} />
            <circle cx="169" cy="78" r="8" fill={hairDark} opacity=".5" />
          </g>
        );
      case 2:
        return (
          <g>
            <path d="M65 132c-8 27-7 51-1 76l22-7 3-66zM175 132c8 27 7 51 1 76l-22-7-3-66z" fill={portrait.hair} />
            <path d="M76 120c1-36 20-57 54-57 35 0 53 21 55 58-14-15-31-23-55-23-24 0-41 8-54 22z" fill={portrait.hair} />
            <path d="M81 112c10-18 27-31 48-34 18 3 34 11 44 25-15-9-33-11-48-7-15 4-29 9-44 16z" fill={hairLight} opacity=".4" />
            <path d="M71 147c-3 21-2 39 2 54M169 147c3 21 2 39-2 54" stroke={hairDark} strokeWidth="3" fill="none" opacity=".6" />
          </g>
        );
      case 3:
        return (
          <g>
            <path d="M77 119c3-35 21-55 52-56 33 0 52 20 54 57-10-15-27-24-54-24-25 0-40 8-52 23z" fill={portrait.hair} />
            <path d="M82 111c10-19 26-31 47-35 18 3 34 11 45 25-17-9-33-11-49-7-15 4-29 9-43 17z" fill={hairLight} opacity=".35" />
            <path d="M87 128c-8 26-7 52 1 70M171 128c8 26 7 52-1 70" stroke={portrait.hair} strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M87 148c-2 17-1 30 2 41M171 148c2 17 1 30-2 41" stroke={hairDark} strokeWidth="3" strokeDasharray="3 6" opacity=".6" />
          </g>
        );
      case 4:
        return (
          <g>
            <path d="M73 120c-1-30 11-52 33-61 8 4 15 3 23-1 8 5 15 5 23 1 13 8 21 22 23 40-10-12-23-19-37-22-4 8-10 13-18 15-4-10-12-17-23-20-6 11-14 20-24 26z" fill={portrait.hair} />
            <path d="M81 100c10-19 27-30 48-32 19 2 34 11 44 26-16-9-33-10-50-6-16 5-30 12-42 21z" fill={hairLight} opacity=".35" />
            <path d="M78 66l-10-15M92 58l-4-18M148 56l7-18M166 65l14-11M179 86l17-5" stroke={portrait.hair} strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      case 5:
        return (
          <g>
            <path d="M77 166c-7-58 14-99 54-102 42-2 68 40 63 102" fill="none" stroke={outfit} strokeWidth="26" strokeLinecap="round" />
            <path d="M77 166c-7-58 14-99 54-102 42-2 68 40 63 102" fill="none" stroke={accent} strokeWidth="1.5" opacity=".3" />
            <path d="M58 184c12 25 30 40 53 42-9-18-13-40-12-65-18 3-31 11-41 23zM182 184c-12 25-30 40-53 42 9-18 13-40 12-65 18 3 31 11 41 23z" fill={shade(outfit, -10)} />
            <path d="M79 116c10-26 28-43 53-45 27 2 44 16 55 39-19-15-37-20-55-18-19 2-36 10-53 24z" fill={shade(outfit, 4)} opacity=".75" />
          </g>
        );
      default:
        return (
          <g>
            <path d="M76 120c2-36 21-56 54-56 35 0 54 21 54 58-14-15-31-23-54-23-24 0-41 8-54 21z" fill={portrait.hair} />
            <path d="M81 111c11-18 28-30 49-34 18 3 33 11 43 26-15-9-32-11-47-7-16 4-30 9-45 15z" fill={hairLight} opacity=".38" />
            <path d="M80 125c-1 17 1 29 5 38M169 125c1 17-1 29-5 38" stroke={hairDark} strokeWidth="4" strokeLinecap="round" opacity=".8" />
          </g>
        );
    }
  })();

  return (
    <div className={cx('portrait', `portrait-${size}`, dim && 'portrait-dim', className)} role={label ? 'img' : undefined} aria-label={label}>
      <svg viewBox="0 0 240 280" className="portrait-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={bg} cx="50%" cy="28%" r="83%">
            <stop offset="0%" stopColor={shade(portrait.background, 28)} />
            <stop offset="55%" stopColor={portrait.background} />
            <stop offset="100%" stopColor="#050506" />
          </radialGradient>
          <radialGradient id={face} cx="44%" cy="32%" r="70%">
            <stop offset="0%" stopColor={skinLight} />
            <stop offset="64%" stopColor={portrait.skin} />
            <stop offset="100%" stopColor={skinDark} />
          </radialGradient>
          <radialGradient id={glow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity=".35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`cloth${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shade(outfit, 18)} />
            <stop offset="100%" stopColor={shade(outfit, -16)} />
          </linearGradient>
        </defs>
        <rect width="240" height="280" fill={`url(#${bg})`} />
        <circle cx="120" cy="124" r="104" fill={`url(#${glow})`} />
        <path d="M0 236c46-25 86-36 120-36s76 11 120 36v44H0z" fill="#070708" opacity=".72" />
        <path d="M13 280c7-55 40-83 84-93l23-3 24 3c44 10 77 38 83 93z" fill={`url(#cloth${uid})`} />
        <path d="M96 202l24 28 25-28 10 8-14 50H100l-15-50z" fill={shade(outfit, -26)} />
        <path d="M96 202c7 11 15 18 24 24 9-6 17-13 24-24" fill="none" stroke={accent} strokeWidth="2" opacity=".55" />
        <path d="M47 280c11-31 26-51 48-63M193 280c-11-31-26-51-48-63" stroke={shade(outfit, 26)} strokeOpacity=".25" strokeWidth="2" fill="none" />
        <path d="M101 185c0 19-2 31-7 41 8 8 17 12 26 12s19-4 26-12c-6-10-8-23-7-41z" fill={skinDark} />
        <path d="M104 189c4 12 10 18 17 20 8-2 14-8 17-20z" fill={shade(portrait.skin, -55)} opacity=".55" />
        <path d="M80 124c0-34 17-54 41-54 27 0 44 21 43 56 0 33-18 57-43 60-25-2-41-28-41-62z" fill={`url(#${face})`} />
        <path d="M82 131c-6 0-10-7-9-16 1-9 6-13 11-12zM164 131c6 0 10-7 9-16-1-9-6-13-11-12z" fill={skinDark} />
        <path d="M85 119c7-29 22-42 44-42 23 0 36 16 39 42-12-14-26-20-43-20-17 0-29 7-40 20z" fill={portrait.skin} opacity=".28" />
        <path d="M94 151c9-5 17-5 26-2M126 149c9-4 17-3 25 1" stroke={hairDark} strokeWidth="3.6" strokeLinecap="round" opacity=".8" />
        <path d="M105 148c5 2 10 2 15 0" stroke={shade(portrait.skin, -55)} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".65" />
        <ellipse cx="106" cy="156" rx="8.4" ry="5" fill="#ece1cf" />
        <ellipse cx="136" cy="156" rx="8.4" ry="5" fill="#ece1cf" />
        <circle cx="106.5" cy="156" r="4" fill={iris} />
        <circle cx="135.5" cy="156" r="4" fill={iris} />
        <circle cx="107" cy="156.5" r="1.8" fill="#0d0b0c" />
        <circle cx="135" cy="156.5" r="1.8" fill="#0d0b0c" />
        <circle cx="104.8" cy="154.4" r="1" fill="#fff" opacity=".75" />
        <circle cx="133.4" cy="154.4" r="1" fill="#fff" opacity=".75" />
        <path d="M98 146c4-4 10-4 14-1.5M130 145c5-3 11-2 15 1.5" stroke={hairDark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M120 158c-2 8-4 12-6 14 4 3 8 3 11 1" fill="none" stroke={shade(portrait.skin, -48)} strokeWidth="2" strokeLinecap="round" />
        <path d="M109 183c8 3 16 3 24-1-4 8-18 9-24 1z" fill={shade(portrait.skin, -34)} />
        <path d="M113 183c5 2 10 2 16 0" stroke={shade(portrait.skin, -66)} strokeWidth="1.4" fill="none" />
        <path d="M98 194c15 7 30 8 46 0" stroke={shade(portrait.skin, -44)} strokeWidth="1.8" fill="none" opacity=".5" />
        {hair}
        <path d="M82 128c1-33 17-54 41-55 1 3 1 6 1 9-17 3-30 19-34 46z" fill="#fff" opacity=".07" />
        <path d="M163 126c0-18-5-33-15-42 10 4 17 16 18 33z" fill={accent} opacity=".14" />
        <rect width="240" height="280" fill="none" stroke={accent} strokeOpacity=".13" />
        <path d="M0 76h240M0 141h240M0 205h240" stroke="#fff" strokeOpacity=".018" strokeWidth="1" />
      </svg>
      <span className="portrait-grain" aria-hidden="true" />
    </div>
  );
}
