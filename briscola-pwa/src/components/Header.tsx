import type { ReactNode } from 'react';
import { cx } from '@/utils';

interface HeaderProps {
  compact?: boolean;
  onHome?: () => void;
  right?: ReactNode;
  status?: string;
}

export function Header({ compact, onHome, right, status }: HeaderProps) {
  return (
    <header className={cx('topbar', compact && 'is-compact')}>
      <button type="button" className="brand" onClick={onHome} aria-label="Torna alla home">
        <span className="brand-mark">B</span>
        <span className="brand-copy">
          <strong>BRISCOLA</strong>
          <small>sfida a 1 contro 1</small>
        </span>
      </button>
      <div className="topbar-right">
        {status && <span className="connection-label">{status}</span>}
        {right}
      </div>
    </header>
  );
}
