interface CrownSigilProps {
  className?: string;
  glow?: boolean;
}

export function CrownSigil({ className, glow }: CrownSigilProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 260 220"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id="crown-metal" x1="40" y1="34" x2="216" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e6cf9b" />
          <stop offset="0.36" stopColor="#b08c52" />
          <stop offset="0.68" stopColor="#6f5734" />
          <stop offset="1" stopColor="#cdb27b" />
        </linearGradient>
        <linearGradient id="crown-dark" x1="84" y1="90" x2="176" y2="178" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b6a3e" />
          <stop offset="1" stopColor="#3d2e1e" />
        </linearGradient>
        <radialGradient id="crown-halo" cx="50%" cy="48%" r="50%">
          <stop stopColor="#d8b46a" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="#9b7b45" stopOpacity="0.12" />
          <stop offset="1" stopColor="#9b7b45" stopOpacity="0" />
        </radialGradient>
        <filter id="crown-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <circle cx="130" cy="108" r="104" fill="url(#crown-halo)" />
      {glow && (
        <g filter="url(#crown-blur)" opacity="0.55">
          <path d="M46 132l16-80 43 48 25-70 25 70 43-48 16 80z" fill="#b78d4e" />
        </g>
      )}

      <g stroke="url(#crown-metal)" strokeLinejoin="round">
        <path
          d="M43 137l14-92 45 57 28-79 27 79 45-57 15 92c-22 17-48 26-87 26s-65-9-87-26z"
          fill="url(#crown-dark)"
          strokeWidth="2.5"
        />
        <path
          d="M58 128l10-62 36 47 26-64 25 64 37-47 10 62"
          fill="none"
          strokeWidth="1.4"
          opacity="0.9"
        />
        <path
          d="M62 142c21 12 44 18 68 18s47-6 68-18"
          fill="none"
          strokeWidth="1.5"
          opacity="0.75"
        />
        <path d="M47 126l-10-74 40 52M213 126l10-74-40 52" strokeWidth="2.2" fill="none" />
        <path d="M87 102l-7-35 26 23M173 102l7-35-26 23" strokeWidth="1.2" opacity="0.55" fill="none" />
      </g>

      <g>
        <path d="M88 142l8-26 15 12 19-27 19 27 15-12 8 26z" fill="#171318" stroke="#b08c52" strokeWidth="1.4" />
        <circle cx="130" cy="139" r="6.5" fill="#d9bd7d" />
        <circle cx="130" cy="139" r="2.6" fill="#fff2c7" />
        <circle cx="96" cy="143" r="3" fill="#a9834b" />
        <circle cx="164" cy="143" r="3" fill="#a9834b" />
      </g>

      <g stroke="#d2b273" strokeWidth="1" opacity="0.5">
        <path d="M36 154c15 17 41 29 70 33M224 154c-15 17-41 29-70 33" fill="none" />
      </g>
      <g fill="#d8b46a" opacity="0.55">
        <circle cx="62" cy="175" r="1.6" />
        <circle cx="201" cy="169" r="1.2" />
        <circle cx="116" cy="194" r="1.4" />
        <circle cx="158" cy="190" r="1" />
      </g>
    </svg>
  );
}

export function Eightsigil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="29" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
      <path d="M40 11v58M11 40h58" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
      <path d="M40 20l7 13h13l-10 10 4 14-14-8-14 8 4-14-10-10h13z" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
