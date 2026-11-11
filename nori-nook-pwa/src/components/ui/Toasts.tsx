import { useEffect } from 'react';
import { useGameStore } from '@/app/store';
import { Icon, type IconName } from './Icon';
import type { ToastMessage } from '@/types/game';

const ToastItem = ({ toast }: { toast: ToastMessage }) => {
  const remove = useGameStore((state) => state.removeToast);
  useEffect(() => {
    const timer = window.setTimeout(() => remove(toast.id), 4000);
    return () => window.clearTimeout(timer);
  }, [toast.id, remove]);
  return (
    <div className={`toast toast--${toast.tone}`} role="status">
      <span className="toast__icon">
        <Icon name={(toast.icon as IconName) ?? 'sparkle'} size={18} />
      </span>
      <div className="toast__copy">
        <strong>{toast.title}</strong>
        {toast.message ? <span>{toast.message}</span> : null}
      </div>
      <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => remove(toast.id)}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
};

export const Toasts = () => {
  const toasts = useGameStore((state) => state.toasts);
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.slice(-2).map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
