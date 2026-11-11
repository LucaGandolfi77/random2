import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { audio, type SfxName } from '@/audio/engine';

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'gold' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  sound?: SfxName | null;
  children?: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  iconRight,
  sound = 'tap',
  children,
  className = '',
  onClick,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${className}`.trim()}
    onClick={(event) => {
      if (sound) void audio.playSfx(sound);
      onClick?.(event);
    }}
    {...rest}
  >
    {icon ? <Icon name={icon} size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} /> : null}
    {children ? <span>{children}</span> : null}
    {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
  </button>
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: number;
  variant?: 'plain' | 'soft';
  sound?: SfxName | null;
}

export const IconButton = ({
  icon,
  label,
  size = 20,
  variant = 'plain',
  sound = 'tap',
  className = '',
  onClick,
  ...rest
}: IconButtonProps) => (
  <button
    type="button"
    className={`icon-btn icon-btn--${variant} ${className}`.trim()}
    aria-label={label}
    title={label}
    onClick={(event) => {
      if (sound) void audio.playSfx(sound);
      onClick?.(event);
    }}
    {...rest}
  >
    <Icon name={icon} size={size} />
  </button>
);

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'soft' | 'matcha' | 'sakura' | 'gold';
  onClick?: () => void;
  style?: CSSProperties;
  as?: 'div' | 'section' | 'article';
}

export const Card = ({ children, className = '', variant = 'default', onClick, style, as = 'div' }: CardProps) => {
  const Tag = as;
  return (
    <Tag
      className={`card card--${variant} ${onClick ? 'card--tappable' : ''} ${className}`.trim()}
      onClick={onClick}
      style={style}
    >
      {children}
    </Tag>
  );
};

export const Pill = ({
  children,
  tone = 'default',
  icon,
  className = '',
}: {
  children: ReactNode;
  tone?: 'default' | 'matcha' | 'sakura' | 'gold' | 'sky' | 'danger';
  icon?: IconName;
  className?: string;
}) => (
  <span className={`pill pill--${tone} ${className}`.trim()}>
    {icon ? <Icon name={icon} size={14} /> : null}
    {children}
  </span>
);

export const ProgressBar = ({
  value,
  max = 100,
  tone = 'matcha',
  label,
  showValue = false,
  className = '',
}: {
  value: number;
  max?: number;
  tone?: 'matcha' | 'salmon' | 'gold' | 'sky' | 'charcoal';
  label?: string;
  showValue?: boolean;
  className?: string;
}) => {
  const ratio = Math.max(0, Math.min(1, max <= 0 ? 0 : value / max));
  return (
    <div className={`progress-wrap ${className}`.trim()}>
      {label || showValue ? (
        <div className="progress-meta">
          {label ? <span>{label}</span> : null}
          {showValue ? <span>{Math.round(ratio * 100)}%</span> : null}
        </div>
      ) : null}
      <div className={`progress progress--${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <span style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
};

export const SectionHead = ({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: IconName;
}) => (
  <div className="section-head">
    <div className="section-head__title">
      {icon ? (
        <span className="section-head__icon">
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
    {action ? <div className="section-head__action">{action}</div> : null}
  </div>
);

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: T; label: string; icon?: IconName }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) => (
  <div className="segmented" role="tablist" aria-label={ariaLabel}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        role="tab"
        aria-selected={value === option.id}
        className={value === option.id ? 'is-active' : ''}
        onClick={() => {
          void audio.playSfx('tap');
          onChange(option.id);
        }}
      >
        {option.icon ? <Icon name={option.icon} size={15} /> : null}
        {option.label}
      </button>
    ))}
  </div>
);

export const EmptyState = ({
  icon = 'sparkle',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}) => (
  <div className="empty-state">
    <span className="empty-state__icon">
      <Icon name={icon} size={30} />
    </span>
    <h3>{title}</h3>
    <p>{message}</p>
    {action}
  </div>
);

export const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissable = true,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissable?: boolean;
  className?: string;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissable) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;
  return createPortal(
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && dismissable) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal modal--${size} ${className}`.trim()}
      >
        {title ? (
          <div className="modal__head">
            <h2>{title}</h2>
            {dismissable ? <IconButton icon="close" label="Close" onClick={onClose} size={18} /> : null}
          </div>
        ) : dismissable ? (
          <div className="modal__head modal__head--bare">
            <IconButton icon="close" label="Close" onClick={onClose} size={18} />
          </div>
        ) : null}
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
};

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Yes, please',
  cancelLabel = 'Not now',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <div className="modal__actions">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    }
  >
    <p className="modal-copy">{message}</p>
  </Modal>
);

export const Divider = ({ label }: { label?: string }) => (
  <div className="divider" role="separator">
    <span />
    {label ? <em>{label}</em> : null}
    <span />
  </div>
);
