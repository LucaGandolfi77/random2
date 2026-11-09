import type { ReactNode } from 'react';
import { cx } from '@/utils';

interface ModalShellProps {
  title: string;
  kicker?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ModalShell({ title, kicker, onClose, children, footer, size = 'md', className }: ModalShellProps) {
  return (
    <div className="modal-backdrop" onPointerDown={onClose} role="presentation">
      <section
        className={cx('modal-shell', `modal-${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            {kicker && <p className="eyebrow">{kicker}</p>}
            <h2>{title}</h2>
          </div>
          {onClose && (
            <button className="icon-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}
