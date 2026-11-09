import { useEffect } from 'react';
import { useGameStore } from '@/core/gameStore';
import { cx, signed } from '@/utils';

const TOAST_ICON: Record<string, string> = {
  info: '❧',
  success: '✦',
  warning: '△',
  danger: '✕',
  quest: '◈'
};

export function Toasts() {
  const toasts = useGameStore((state) => state.toasts);
  const dismiss = useGameStore((state) => state.dismissToast);

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} className={cx('toast', `toast-${toast.kind}`)} onClick={() => dismiss(toast.id)}>
          <span className="toast-icon">{TOAST_ICON[toast.kind] ?? '❧'}</span>
          <span>{toast.text}</span>
        </button>
      ))}
    </div>
  );
}

export function CheckOverlay() {
  const check = useGameStore((state) => state.checkResult);
  const dismiss = useGameStore((state) => state.dismissCheck);
  const showRolls = useGameStore((state) => state.settings.showRolls);

  useEffect(() => {
    if (!check) return;
    const timer = window.setTimeout(dismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [check, dismiss]);

  if (!check) return null;

  return (
    <div className="check-layer" onClick={dismiss} role="presentation">
      <div
        className={cx('check-card', check.success ? 'is-success' : 'is-failure', check.critical && 'is-critical')}
        role="status"
      >
        <p className="check-kicker">{check.label}</p>
        <div className="check-die-wrap">
          <div className="check-die">
            <span>{check.die}</span>
          </div>
          <span className="check-d20">d20</span>
        </div>
        <h2>{check.success ? 'Success' : 'Failure'}</h2>
        <p className="check-total">
          {showRolls ? (
            <>
              {check.die} {signed(check.modifier)} {check.proficiency ? `+ ${check.proficiency}` : ''} ={' '}
              <strong>{check.total}</strong>
            </>
          ) : (
            <>Total <strong>{check.total}</strong></>
          )}
          <span className="check-vs"> vs DC {check.dc}</span>
        </p>
        {check.critical === 'success' && <p className="check-crit">A natural 20. The world makes room for you.</p>}
        {check.critical === 'failure' && <p className="check-crit">A natural 1. The world does not.</p>}
        <p className="check-flavor">
          {check.success ? 'The door opens. Something on the other side has been waiting.' : 'The moment closes, but the story does not.'}
        </p>
      </div>
    </div>
  );
}
