import type { CSSProperties } from 'react';

export type IconName =
  | 'home'
  | 'story'
  | 'restaurant'
  | 'recipe'
  | 'collection'
  | 'more'
  | 'play'
  | 'coin'
  | 'pearl'
  | 'star'
  | 'heart'
  | 'settings'
  | 'calendar'
  | 'shop'
  | 'back'
  | 'close'
  | 'check'
  | 'lock'
  | 'camera'
  | 'install'
  | 'sound'
  | 'music'
  | 'mute'
  | 'plus'
  | 'minus'
  | 'arrowRight'
  | 'puzzle'
  | 'merge'
  | 'trophy'
  | 'sparkle'
  | 'rice'
  | 'fish'
  | 'plant'
  | 'friends'
  | 'clock'
  | 'flame'
  | 'users'
  | 'gift'
  | 'map'
  | 'lantern'
  | 'sun'
  | 'moon'
  | 'snow'
  | 'leaf'
  | 'crown'
  | 'book'
  | 'chef'
  | 'cat'
  | 'bento'
  | 'tea'
  | 'infinity'
  | 'download'
  | 'upload'
  | 'refresh'
  | 'trash'
  | 'info'
  | 'warning'
  | 'wifi'
  | 'wifiOff'
  | 'save'
  | 'edit'
  | 'drag'
  | 'shuffle'
  | 'eye'
  | 'steam'
  | 'nigiri'
  | 'sushi'
  | 'rainbow'
  | 'mergeTile'
  | 'target'
  | 'sparkles';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
  style?: CSSProperties;
  title?: string;
}

const path = (name: IconName) => {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6.5 10.5V20h11v-9.5" />
          <path d="M10 20v-5h4v5" />
        </>
      );
    case 'story':
      return (
        <>
          <path d="M4 5.5c2.6-1 5.3-.9 8 .5 2.7-1.4 5.4-1.5 8-.5v13c-2.6-1-5.3-.9-8 .5-2.7-1.4-5.4-1.5-8-.5z" />
          <path d="M12 6v13" />
        </>
      );
    case 'restaurant':
      return (
        <>
          <path d="M4 10h16" />
          <path d="M6 10V20h12V10" />
          <path d="M8 10V7.5A2.5 2.5 0 0 1 10.5 5h3A2.5 2.5 0 0 1 16 7.5V10" />
          <path d="M9 16h6" />
        </>
      );
    case 'recipe':
    case 'book':
      return (
        <>
          <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
          <path d="M8 20a3 3 0 0 1 0-6h10" />
          <path d="M9 8h5" />
        </>
      );
    case 'collection':
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      );
    case 'more':
      return (
        <>
          <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </>
      );
    case 'play':
      return <path d="M8 5.5 19 12 8 18.5z" fill="currentColor" stroke="none" />;
    case 'coin':
      return (
        <>
          <circle cx="12" cy="12" r="8" fill="currentColor" opacity=".2" stroke="none" />
          <circle cx="12" cy="12" r="7" />
          <path d="M12 8.5v7M9.8 10.2h3.6a1.6 1.6 0 0 1 0 3.2h-2.8a1.6 1.6 0 0 0 0 3.2h3.6" />
        </>
      );
    case 'pearl':
      return (
        <>
          <path d="M12 4c4 0 7 3 7 6.8 0 4.2-3.4 9.2-7 9.2s-7-5-7-9.2C5 7 8 4 12 4z" />
          <path d="M9 9.5c.6-1.2 1.7-1.9 3-2" />
        </>
      );
    case 'star':
      return <path d="m12 3.5 2.7 5.4 6 .9-4.3 4.2 1 5.9-5.4-2.8-5.4 2.8 1-5.9L3.3 9.8l6-.9z" />;
    case 'heart':
      return <path d="M12 20s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.7 12 20 12 20z" />;
    case 'settings':
      return (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="9" cy="7" r="2" fill="#F7F1E5" />
          <circle cx="15" cy="12" r="2" fill="#F7F1E5" />
          <circle cx="8" cy="17" r="2" fill="#F7F1E5" />
        </>
      );
    case 'calendar':
      return (
        <>
          <rect x="4" y="5.5" width="16" height="15" rx="2" />
          <path d="M8 3.5v4M16 3.5v4M4 10h16" />
          <path d="M8 14h2M14 14h2M8 17.5h2" />
        </>
      );
    case 'shop':
      return (
        <>
          <path d="M4 9h16l-1.2 11H5.2z" />
          <path d="M8 9V7a4 4 0 0 1 8 0v2" />
          <path d="M9 13h6" />
        </>
      );
    case 'back':
      return <path d="M15 5 8 12l7 7" />;
    case 'close':
      return <path d="M6 6l12 12M18 6 6 18" />;
    case 'check':
      return <path d="m5 12.5 4.3 4.3L19 6.5" />;
    case 'lock':
      return (
        <>
          <rect x="5.5" y="10" width="13" height="10" rx="2.5" />
          <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
        </>
      );
    case 'camera':
      return (
        <>
          <path d="M4 8h3l1.4-2h7.2L17 8h3v11H4z" />
          <circle cx="12" cy="13" r="3.3" />
        </>
      );
    case 'install':
      return (
        <>
          <path d="M12 4v11M8 11l4 4 4-4" />
          <path d="M5 19h14" />
        </>
      );
    case 'sound':
      return (
        <>
          <path d="M4 10h4l5-4v12l-5-4H4z" />
          <path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a8 8 0 0 1 0 10" />
        </>
      );
    case 'music':
      return (
        <>
          <path d="M9 17.5V6l9-2v11.5" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="15.5" cy="16" r="2.5" />
        </>
      );
    case 'mute':
      return (
        <>
          <path d="M4 10h4l5-4v12l-5-4H4z" />
          <path d="m16 9 5 6M21 9l-5 6" />
        </>
      );
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'minus':
      return <path d="M5 12h14" />;
    case 'arrowRight':
      return <path d="M5 12h14M13 6l6 6-6 6" />;
    case 'puzzle':
      return (
        <path d="M9 4h4a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2V6a2 2 0 0 1 2-2z" />
      );
    case 'merge':
    case 'mergeTile':
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" />
          <path d="M13 7.5h3.5V4M11 16.5H7.5V20" />
        </>
      );
    case 'trophy':
      return (
        <>
          <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
          <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" />
          <path d="M12 13v4M8 20h8M9.5 20c0-2 1-3 2.5-3s2.5 1 2.5 3" />
        </>
      );
    case 'sparkle':
    case 'sparkles':
      return (
        <>
          <path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7z" />
          <path d="M19 15c.3 1.7 1.1 2.5 2.8 2.8-1.7.3-2.5 1.1-2.8 2.8-.3-1.7-1.1-2.5-2.8-2.8 1.7-.3 2.5-1.1 2.8-2.8z" />
        </>
      );
    case 'rice':
      return (
        <>
          <path d="M6 17c0-4 2.4-7 6-7s6 3 6 7c0 2.2-2.7 3.5-6 3.5S6 19.2 6 17z" />
          <path d="M9.5 13c.4-2 1.3-3.5 2.5-4.5M14.5 13c-.3-1.6-1-2.8-2-3.7" />
        </>
      );
    case 'plant':
      return (
        <>
          <path d="M5 20h14M7 20c0-4 2-7 5-8M17 20c0-5-2-8-5-9" />
          <path d="M12 12C8 12 5 9 5 5c4 0 7 3 7 7zM12 12c4 0 7-3 7-7-4 0-7 3-7 7z" />
          <path d="M12 12v8" />
        </>
      );
    case 'friends':
      return (
        <>
          <path d="M9.5 12.5c-3-2-5-4.2-5-7A2.8 2.8 0 0 1 9.5 4c1 0 1.9.5 2.5 1.3A3 3 0 0 1 21 5.5c0 2.8-2 5-5 7L12 16z" />
          <path d="M5 16c0 2 1.5 4 4.5 4M19 16c0 2-1.5 4-4.5 4" />
        </>
      );
    case 'fish':
      return (
        <>
          <path d="M4 12c3-4 7-5 11-3l4-3v12l-4-3c-4 2-8 1-11-3z" />
          <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3.5 2" />
        </>
      );
    case 'flame':
      return <path d="M12 3c2 4 5 4.5 5 8a5 5 0 0 1-10 0c0-2.2 1.5-3.5 2.5-5 .3 1.5 1.2 2.2 2 2.5C11 6.5 11.5 4.8 12 3z" />;
    case 'users':
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M15.5 14.3c2.7-.4 5 1.5 5 4.7" />
        </>
      );
    case 'gift':
      return (
        <>
          <rect x="4" y="9" width="16" height="11" rx="2" />
          <path d="M3 9h18M12 9v11" />
          <path d="M12 9C9 9 7.5 8 7.5 6.5S9 4 10.3 5.2C11.5 6.4 12 9 12 9zM12 9c3 0 4.5-1 4.5-2.5S15 4 13.7 5.2C12.5 6.4 12 9 12 9z" />
        </>
      );
    case 'map':
      return (
        <>
          <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
          <path d="M9 4v14M15 6v14" />
        </>
      );
    case 'lantern':
      return (
        <>
          <path d="M9 3h6M10 6h4M7 9c0-2 2.2-3 5-3s5 1 5 3v6c0 2-2.2 3-5 3s-5-1-5-3z" />
          <path d="M12 6v12M9 21h6M10 18v3M14 18v3" />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5 7 7M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5" />
        </>
      );
    case 'moon':
      return <path d="M19 15.5A7.5 7.5 0 0 1 8.5 5a8 8 0 1 0 10.5 10.5z" />;
    case 'snow':
      return <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 5l3 2 3-2M9 19l3-2 3 2" />;
    case 'leaf':
      return <path d="M20 4C10 4 4 8 4 15c0 3 2 5 5 5 7 0 11-6 11-16zM4 20c3-5 7-8 11-10" />;
    case 'crown':
      return <path d="m3 7 4.5 4L12 5l4.5 6L21 7l-2 11H5zM5 21h14" />;
    case 'chef':
      return (
        <>
          <path d="M7 11a3.5 3.5 0 1 1 2-6.3 4 4 0 0 1 6 0A3.5 3.5 0 1 1 17 11" />
          <path d="M7 11h10v6H7zM7 17h10v3H7z" />
        </>
      );
    case 'cat':
      return (
        <>
          <path d="M5 10 4 4l5 3h6l5-3-1 6v5a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" />
          <path d="M9 12h.01M15 12h.01M10 16c1.2 1 2.8 1 4 0" />
        </>
      );
    case 'bento':
      return (
        <>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 12h18M11 6v13M16 6v13" />
          <circle cx="7" cy="9" r="1.4" />
        </>
      );
    case 'tea':
      return (
        <>
          <path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
          <path d="M16 9h2a2 2 0 0 1 0 4h-2M7 4c0 1-1 1.5-1 2.5M11 4c0 1-1 1.5-1 2.5" />
        </>
      );
    case 'infinity':
      return <path d="M8 8c-3 0-5 1.8-5 4s2 4 5 4c4 0 4-8 8-8 3 0 5 1.8 5 4s-2 4-5 4c-4 0-4-8-8-8z" />;
    case 'download':
      return (
        <>
          <path d="M12 3v12M7 10l5 5 5-5" />
          <path d="M5 20h14" />
        </>
      );
    case 'upload':
      return (
        <>
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M5 20h14" />
        </>
      );
    case 'refresh':
      return (
        <>
          <path d="M20 12a8 8 0 1 1-2.3-5.7" />
          <path d="M20 4v5h-5" />
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />
          <path d="M10 11v5M14 11v5" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 11v5M12 8h.01" />
        </>
      );
    case 'warning':
      return (
        <>
          <path d="M12 4 21 20H3z" />
          <path d="M12 9v4M12 16h.01" />
        </>
      );
    case 'wifi':
      return (
        <>
          <path d="M3 9a14 14 0 0 1 18 0M6 12.5a9 9 0 0 1 12 0M9 16a4 4 0 0 1 6 0" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case 'wifiOff':
      return (
        <>
          <path d="M3 9a14 14 0 0 1 6-3.3M15 6.2A14 14 0 0 1 21 9M6 12.5a9 9 0 0 1 3-1.8M15 11a9 9 0 0 1 3 1.5M9 16a4 4 0 0 1 6 0" />
          <path d="m3 3 18 18" />
        </>
      );
    case 'save':
      return (
        <>
          <path d="M4 4h13l3 3v13H4z" />
          <path d="M8 4v6h7V4M8 20v-6h8v6" />
        </>
      );
    case 'edit':
      return (
        <>
          <path d="M4 20h4L20 8l-4-4L4 16z" />
          <path d="m14 6 4 4" />
        </>
      );
    case 'drag':
      return (
        <>
          <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case 'shuffle':
      return (
        <>
          <path d="M4 6h3c4 0 6 12 10 12h3M18 4l3 2-3 2M4 18h3c1.5 0 2.8-1.7 4-4M18 20l3-2-3-2" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case 'steam':
      return <path d="M8 20c-2-2-2-4 0-6M12 20c-2-2-2-5 0-7M16 20c-2-2-2-4 0-6M9 9c-1-1-1-2 0-3M13 8c-1-1-1-2 0-3" />;
    case 'nigiri':
      return (
        <>
          <ellipse cx="12" cy="15" rx="7" ry="4" />
          <path d="M5 13c0-2 2-4 7-4s7 2 7 4c-1 2-3 3-7 3s-6-1-7-3z" />
          <path d="M9 14h6" />
        </>
      );
    case 'sushi':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
        </>
      );
    case 'rainbow':
      return <path d="M3 17a9 9 0 0 1 18 0M6 17a6 6 0 0 1 12 0M9 17a3 3 0 0 1 6 0" />;
    case 'target':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
};

export const Icon = ({ name, size = 22, className, strokeWidth = 1.9, style, title }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
  >
    {title ? <title>{title}</title> : null}
    {path(name)}
  </svg>
);
