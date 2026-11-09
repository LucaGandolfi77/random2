import { useGameStore } from '@/core/gameStore';
import { cx } from '@/utils';

const ICONS: Record<string, string> = {
  info: '·',
  warning: '!',
  danger: '×',
  success: '✓',
  phone: '▰',
  story: '◇'
};

export function Toasts() {
  const toasts = useGameStore((state) => state.toasts);
  const dismiss = useGameStore((state) => state.dismissToast);

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          className={cx('toast', `toast-${toast.kind}`)}
          onClick={() => dismiss(toast.id)}
        >
          <span className="toast-icon">{ICONS[toast.kind] ?? '·'}</span>
          <span className="toast-text">{toast.text}</span>
        </button>
      ))}
    </div>
  );
}
