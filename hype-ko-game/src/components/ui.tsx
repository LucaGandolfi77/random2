import type { ReactNode } from 'react';
import type { FighterDefinition } from '../data/fighters';

export function NeonButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button'
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'gold';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className={`neon-button neon-button--${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
    </button>
  );
}

export function BackButton({ onClick, label = 'Indietro' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="back-button" onClick={onClick}>
      ← {label}
    </button>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="section-title">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

export function StatBar({
  label,
  value,
  max = 5,
  color = '#ff2e63'
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="stat-bar">
      <span className="stat-bar__label">{label}</span>
      <div className="stat-bar__track">
        <div className="stat-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="stat-bar__value">{value.toFixed(0)}</span>
    </div>
  );
}

export function FighterCard({
  fighter,
  selected,
  onClick,
  badge,
  compact = false
}: {
  fighter: FighterDefinition;
  selected: boolean;
  onClick: () => void;
  badge?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`fighter-card ${selected ? 'is-selected' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={onClick}
      style={{
        '--card-primary': fighter.palette.primary,
        '--card-secondary': fighter.palette.secondary,
        '--card-accent': fighter.palette.accent,
        '--card-aura': fighter.palette.aura
      } as React.CSSProperties}
    >
      <div className="fighter-card__art">
        <span className="fighter-card__initial">{fighter.name.charAt(0)}</span>
        <span className="fighter-card__glow" />
        {badge && <span className="fighter-card__badge">{badge}</span>}
      </div>
      <div className="fighter-card__body">
        <span className="fighter-card__name">{fighter.name}</span>
        <span className="fighter-card__archetype">{fighter.archetype}</span>
        {!compact && (
          <div className="fighter-card__stats">
            <span>POW {fighter.stats.power}</span>
            <span>SPD {fighter.stats.speed}</span>
            <span>RNG {fighter.stats.range}</span>
          </div>
        )}
      </div>
    </button>
  );
}

export function ProgressBar({
  value,
  max,
  color = '#ffd166',
  label
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="progress">
      {label && (
        <div className="progress__labels">
          <span>{label}</span>
          <span>
            {Math.min(value, max)} / {max}
          </span>
        </div>
      )}
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('it-IT').format(Math.round(value));
}

export function ModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    quick: 'COMBATTIMENTO RAPIDO',
    training: 'ALLENAMENTO',
    tournament: 'TORNEO DELLE VIRALITÀ',
    team: 'BATTAGLIA A SQUADRE',
    rumble: 'ROYAL RUMBLE',
    online: 'ONLINE',
    ranked: 'RANKED'
  };
  return labels[mode] ?? mode.toUpperCase();
}
