import type { SVGProps } from 'react';

export type IconName =
  | 'wood'
  | 'coal'
  | 'rawMeat'
  | 'meals'
  | 'iron'
  | 'furnace'
  | 'lumber'
  | 'mine'
  | 'hunter'
  | 'cook'
  | 'shelter'
  | 'clinic'
  | 'seam'
  | 'city'
  | 'survivors'
  | 'heroes'
  | 'tech'
  | 'snow'
  | 'wind'
  | 'thermometer'
  | 'people'
  | 'health'
  | 'hunger'
  | 'warmth'
  | 'happiness'
  | 'settings'
  | 'volume'
  | 'mute'
  | 'close'
  | 'plus'
  | 'minus'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'flame'
  | 'shield'
  | 'sword'
  | 'bow'
  | 'heal'
  | 'lock'
  | 'spark'
  | 'clock'
  | 'speed'
  | 'book'
  | 'download'
  | 'upload'
  | 'reset'
  | 'check'
  | 'alert'
  | 'wifiOff'
  | 'install'
  | 'sun'
  | 'moon';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function Icon({ name, size = 20, strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...strokeProps}
      strokeWidth={strokeWidth}
      {...rest}
    >
      {renderPaths(name)}
    </svg>
  );
}

function renderPaths(name: IconName) {
  switch (name) {
    case 'wood':
      return (
        <>
          <path d="M5.5 7.5h10.8a3.2 3.2 0 0 1 0 6.4H5.5a3.2 3.2 0 0 1 0-6.4Z" />
          <path d="M5.5 13.9h9.2a3 3 0 0 1 0 6H5.5a3 3 0 0 1 0-6Z" />
          <circle cx="8" cy="10.7" r="1.2" />
          <circle cx="7.5" cy="16.9" r="1.1" />
        </>
      );
    case 'coal':
      return (
        <>
          <path d="m6.2 9.3 4.1-4 6.6 1.4 2.5 5.2-2.9 6.3-7.5-.7-3.7-2.5Z" />
          <path d="m9.4 8.2 2.2 3.4 4.8-4.6M11.6 11.6l-2.9 5" />
        </>
      );
    case 'rawMeat':
      return (
        <>
          <path d="M15.8 4.8c2.4 1.3 2.8 4 1.5 6.2-1 1.7-2.9 2.5-4.7 2.2l-3.6 3.6c-.8.8-2 .8-2.8 0s-.8-2 0-2.8l3.7-3.8c-.4-1.8.5-3.7 2.2-4.7 1.2-.7 2.5-.9 3.7-.7Z" />
          <path d="M7.6 15.1c1.1.9 1.4 2.4.8 3.5" />
        </>
      );
    case 'meals':
      return (
        <>
          <path d="M4.5 11.2h15c0 4.2-3.4 7.5-7.5 7.5s-7.5-3.3-7.5-7.5Z" />
          <path d="M8.5 8.5c-1-1.2-1-2.4 0-3.5M12 8.5c-1-1.2-1-2.4 0-3.5M15.5 8.5c-1-1.2-1-2.4 0-3.5M3.5 20.5h17" />
        </>
      );
    case 'iron':
      return (
        <>
          <path d="m4 15.2 3.7-6.3h8.6L20 15.2 17.4 19H6.6Z" />
          <path d="M8.3 15.2h7.4" />
        </>
      );
    case 'furnace':
      return (
        <>
          <path d="M5 20V9.5L12 4l7 5.5V20Z" />
          <path d="M8.5 20v-6.5h7V20" />
          <path d="M12 16.2c-1.4-1.3-1.6-2.6-.7-4 .2.8.7 1.2 1.2 1.6.2-.9.8-1.6 1.5-2 .1 1.8-.6 3.2-2 4.4Z" />
        </>
      );
    case 'lumber':
      return (
        <>
          <path d="M5 19 15 9" />
          <path d="m13.5 5.5 5 5-2.1 2.1-5-5Z" />
          <path d="M5 19c-1.2-1-1.2-2.2 0-3 1.2.8 1.2 2 0 3Z" />
          <path d="M8 14.8 9.2 16" />
        </>
      );
    case 'mine':
      return (
        <>
          <path d="M4 18h16M6.5 18V9.5L10 5l3.5 4.5V18" />
          <path d="m10 9.5 3.5 4.5M16 18v-5.5l2-1.5 2 1.5V18" />
          <path d="M9 5h2" />
        </>
      );
    case 'hunter':
      return (
        <>
          <path d="M5 19c6.5-1.2 9.5-5.2 10.5-12" />
          <path d="M5 19 8 16M15.5 7c-3.2 2.7-4.4 5.9-4.5 9.5" />
          <path d="m14 4 1 3 3 1" />
        </>
      );
    case 'cook':
      return (
        <>
          <path d="M5 10h14v2.5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6Z" />
          <path d="M4 10h16M9 6.5c-.8-1-.8-2 0-3M13 6.5c-.8-1-.8-2 0-3M9.5 21h5" />
        </>
      );
    case 'shelter':
      return (
        <>
          <path d="m3.5 10.5 8.5-7 8.5 7" />
          <path d="M5.5 9v11h13V9M9.5 20v-6h5v6" />
          <path d="M4 20h16" />
        </>
      );
    case 'clinic':
      return (
        <>
          <path d="M4 20V7l8-3 8 3v13Z" />
          <path d="M12 8.5v7M8.5 12h7" />
        </>
      );
    case 'seam':
      return (
        <>
          <path d="m4 20 8.5-9.5L18 14l2-4-6.5-5-5 5L4 20Z" />
          <path d="m8 15 2.7 2.8M12 6l2.2 2.4" />
        </>
      );
    case 'city':
      return (
        <>
          <path d="M3.5 20V9l5-2.5V20M8.5 20V4l6 3v13M14.5 20v-8l6 2.5V20M2 20h20" />
          <path d="M5.5 11.5h1M5.5 14.5h1M11 9h1M11 12h1M17.5 15.5h1" />
        </>
      );
    case 'survivors':
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20c.4-3.7 2.3-5.8 5.5-5.8s5.1 2.1 5.5 5.8" />
          <circle cx="17" cy="9.5" r="2.2" />
          <path d="M15.8 14.8c2.8-.2 4.3 1.6 4.7 4.7" />
        </>
      );
    case 'heroes':
      return (
        <>
          <path d="m5 4 3.5 3.5L12 4l3.5 3.5L19 4l-1 6.5c-.5 5-2.8 8-6 10.5-3.2-2.5-5.5-5.5-6-10.5Z" />
          <path d="M9.5 11.5 12 14l2.5-2.5" />
        </>
      );
    case 'tech':
      return (
        <>
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="17" r="2" />
          <circle cx="19" cy="17" r="2" />
          <path d="m10.8 6.8-4.6 8.4M13.2 6.8l4.6 8.4M7 17h10" />
        </>
      );
    case 'snow':
      return (
        <>
          <path d="M12 2v20M4 7l16 10M20 7 4 17" />
          <path d="m9 4 3 2 3-2M9 20l3-2 3 2M4.5 10.3 8 10l1.5-3.2M19.5 13.7 16 14l-1.5 3.2M4.5 13.7 8 14l1.5 3.2M19.5 10.3 16 10l-1.5-3.2" />
        </>
      );
    case 'wind':
      return (
        <>
          <path d="M3 8h11.5a3 3 0 1 0-3-3" />
          <path d="M3 12h15.5a3 3 0 1 1-3 3" />
          <path d="M4.5 16h6" />
        </>
      );
    case 'thermometer':
      return (
        <>
          <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z" />
          <path d="M12 11v7" />
        </>
      );
    case 'people':
      return (
        <>
          <circle cx="12" cy="7" r="3" />
          <path d="M5.5 21c.5-5 2.8-7.5 6.5-7.5s6 2.5 6.5 7.5" />
        </>
      );
    case 'health':
      return (
        <>
          <path d="M12 20c-4.8-3.2-8-6.5-8-10.3A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8 3.3c0 3.8-3.2 7.1-8 10.3Z" />
          <path d="M7 12h3l1.2-2 1.7 4 1.2-2H17" />
        </>
      );
    case 'hunger':
      return (
        <>
          <path d="M8 3v7M11 3v7M8 7h3M9.5 10v11" />
          <path d="M16 3c-1.5 2.4-2 4.3-2 6.5 0 1.8.8 2.8 2 3.2V21M16 3c1.4 2.4 2 4.3 2 6.5 0 1.8-.8 2.8-2 3.2" />
        </>
      );
    case 'warmth':
      return (
        <>
          <path d="M12 3c2.1 3.2 4.8 5 4.8 9A4.8 4.8 0 0 1 7.2 12c0-2 1-3.3 2.3-4.7.2 1.6.7 2.5 1.4 3.1.6-2.2.8-4.5 1.1-7.4Z" />
        </>
      );
    case 'happiness':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 10h.01M15.5 10h.01M8.5 14c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" />
        </>
      );
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      );
    case 'volume':
      return (
        <>
          <path d="M5 9h3l4-4v14l-4-4H5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
        </>
      );
    case 'mute':
      return (
        <>
          <path d="M5 9h3l4-4v14l-4-4H5Z" />
          <path d="m16 9 5 6M21 9l-5 6" />
        </>
      );
    case 'close':
      return <path d="m6 6 12 12M18 6 6 18" />;
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'minus':
      return <path d="M5 12h14" />;
    case 'chevronRight':
      return <path d="m9 5 7 7-7 7" />;
    case 'chevronLeft':
      return <path d="m15 5-7 7 7 7" />;
    case 'chevronDown':
      return <path d="m5 9 7 7 7-7" />;
    case 'flame':
      return (
        <>
          <path d="M12 21c-3.9 0-6.5-2.4-6.5-5.8 0-2.6 1.5-4.8 3.4-6.6.1 1.7.7 2.8 1.8 3.6.3-3.6 1.4-6.1 3.8-8.7.3 3.4 1.3 5.2 2.5 6.8 1 1.3 1.5 2.8 1.5 4.9C18.5 18.6 15.9 21 12 21Z" />
        </>
      );
    case 'shield':
      return (
        <>
          <path d="M12 3 20 6v5.5c0 4.8-3.2 8-8 9.5-4.8-1.5-8-4.7-8-9.5V6Z" />
          <path d="M8.5 12.2 11 14.5l4.6-5" />
        </>
      );
    case 'sword':
      return (
        <>
          <path d="m14 4 6-1-1 6-8 8-4-4Z" />
          <path d="m5 14 5 5M4 20l3-3M9 15l-4 4" />
        </>
      );
    case 'bow':
      return (
        <>
          <path d="M6 4c5 1 8 4 9 9M6 4c1 5 4 8 9 9M15 13l4 4M17 19l2-2" />
          <path d="M5 5c6.5 5 10 10 12 15" />
        </>
      );
    case 'heal':
      return (
        <>
          <path d="M12 21c-4.7-3-8-6.3-8-10.1A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8 3.5c0 3.8-3.3 7.1-8 10.1Z" />
          <path d="M12 9.5v5M9.5 12h5" />
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
        </>
      );
    case 'spark':
      return (
        <>
          <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5Z" />
          <path d="m18.5 16 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7Z" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.2 2" />
        </>
      );
    case 'speed':
      return (
        <>
          <path d="M4.6 17a8.5 8.5 0 1 1 14.8 0" />
          <path d="m12 13 4-4M7.5 17h9" />
        </>
      );
    case 'book':
      return (
        <>
          <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22.5Z" />
          <path d="M4 5.5v17M8 6h8M8 9.5h6" />
        </>
      );
    case 'download':
      return (
        <>
          <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" />
        </>
      );
    case 'upload':
      return (
        <>
          <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16" />
        </>
      );
    case 'reset':
      return (
        <>
          <path d="M4.5 9A8.5 8.5 0 1 1 4 14" />
          <path d="M4.5 4v5h5" />
        </>
      );
    case 'check':
      return <path d="m5 12.5 4.5 4.5L19 6.5" />;
    case 'alert':
      return (
        <>
          <path d="M12 3 22 20H2Z" />
          <path d="M12 9v5M12 17h.01" />
        </>
      );
    case 'wifiOff':
      return (
        <>
          <path d="M3 9a15 15 0 0 1 18 0M6.5 12.5a10 10 0 0 1 11 0M10 16a4.5 4.5 0 0 1 4 0" />
          <path d="M12 20h.01M4 4l16 16" />
        </>
      );
    case 'install':
      return (
        <>
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M10 18.5h4M12 7v7M9.5 11.5 12 14l2.5-2.5" />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
        </>
      );
    case 'moon':
      return <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.7 8.7 0 1 0 20 15.2Z" />;
    default:
      return null;
  }
}

export function ResourceIcon({ resource, size = 16 }: { resource: string; size?: number }) {
  const map: Record<string, IconName> = {
    wood: 'wood',
    coal: 'coal',
    rawMeat: 'rawMeat',
    meals: 'meals',
    iron: 'iron',
  };
  return <Icon name={map[resource] ?? 'wood'} size={size} />;
}
