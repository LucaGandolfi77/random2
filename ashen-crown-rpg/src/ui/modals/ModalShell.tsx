import type { ReactNode } from 'react';
import { cx } from '@/utils';

interface ModalShellProps {
  title: string;
  kicker?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  footer?: ReactNode;
}

export function ModalShell({ title, kicker, onClose, children, size = 'md', className, footer }: ModalShellProps) {
  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className={cx('modal-shell', `modal-${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            {kicker && <p className="section-kicker">{kicker}</p>}
            <h2>{title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}
