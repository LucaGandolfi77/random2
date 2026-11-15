import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Icon, type IconName } from './Icons';
import type { Toast, ToastKind } from '../store/gameStore';

const ICONS: Record<ToastKind, IconName> = {
  info: 'spark',
  success: 'check',
  warn: 'alert',
  danger: 'alert',
};

export function Toasts() {
  const toasts = useGameStore((state) => state.toasts);
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useGameStore((state) => state.dismissToast);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), 4600);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <button type="button" className={`toast toast-${toast.kind}`} onClick={() => dismiss(toast.id)}>
      <span className="toast-icon">
        <Icon name={ICONS[toast.kind]} size={13} />
      </span>
      <span>{toast.text}</span>
    </button>
  );
}
