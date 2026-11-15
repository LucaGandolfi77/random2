import { useEffect, useRef, type ReactNode } from 'react';
import { RESOURCE_KEYS, RESOURCE_META } from '../game/content';
import { cn, formatNumber } from '../game/format';
import type { ResourceKey, Resources } from '../game/types';
import { Icon, ResourceIcon } from './Icons';

export function Meter({
  label,
  value,
  max = 100,
  tone = 'ice',
  inverse = false,
  showValue = true,
  className,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: 'ice' | 'ember' | 'health' | 'warmth' | 'hunger' | 'happiness';
  inverse?: boolean;
  showValue?: boolean;
  className?: string;
}) {
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className={cn('meter', className)}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.13em] text-frost-400/70">
        <span>{label}</span>
        {showValue && (
          <span className={cn('font-mono text-[10px]', inverse ? 'text-ember-300' : 'text-frost-200')}>
            {Math.round(value)}
          </span>
        )}
      </div>
      <div className="meter-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
        <span
          className={cn('meter-fill', `tone-${tone}`, inverse && 'inverse')}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function ResourceCost({
  cost,
  resources,
  compact = false,
}: {
  cost: Partial<Resources>;
  resources?: Resources;
  compact?: boolean;
}) {
  const entries = RESOURCE_KEYS.filter((key) => (cost[key] ?? 0) > 0);
  if (entries.length === 0) return null;
  return (
    <span className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1', compact ? 'text-[10px]' : 'text-xs')}>
      {entries.map((key) => {
        const missing = resources ? resources[key] + 1e-9 < (cost[key] ?? 0) : false;
        return (
          <span
            key={key}
            className={cn(
              'inline-flex items-center gap-1 font-mono tabular-nums',
              missing ? 'text-red-300' : 'text-frost-200/85',
            )}
            title={`${RESOURCE_META[key].name}: ${cost[key]}`}
          >
            <span className={cn('cost-icon', `cost-${key}`)}>
              <ResourceIcon resource={key} size={compact ? 12 : 14} />
            </span>
            {formatNumber(cost[key] ?? 0)}
          </span>
        );
      })}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  aside,
}: {
  eyebrow?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-ember-400/80">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-[21px] leading-tight text-frost-50">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={cn('stat-pill', tone)}>
      <span className="stat-pill-icon">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[9px] uppercase tracking-[0.16em] text-frost-400/70">{label}</span>
        <strong className="truncate font-mono text-xs font-semibold text-frost-100">{value}</strong>
      </span>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'ember';
}) {
  return <span className={cn('badge', `badge-${tone}`)}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'center',
  dismissible = true,
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'center' | 'sheet' | 'full';
  dismissible?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div
      className={cn('modal-layer', `modal-${variant}`)}
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={cn('modal-panel', `modal-panel-${variant}`)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-grabber" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] leading-tight text-frost-50">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-relaxed text-frost-300/70">{subtitle}</p>}
          </div>
          {onClose && dismissible && (
            <button type="button" className="icon-button shrink-0" onClick={onClose} aria-label="Close">
              <Icon name="close" size={17} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  icon,
  active = false,
  disabled = false,
  className,
}: {
  label: string;
  onClick?: () => void;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn('icon-button', active && 'is-active', className)}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  );
}

export function ResourceInline({ resource, amount }: { resource: ResourceKey; amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-frost-200">
      <ResourceIcon resource={resource} size={13} />
      {formatNumber(amount)}
    </span>
  );
}
