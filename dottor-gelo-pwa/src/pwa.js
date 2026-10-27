import { registerSW } from 'virtual:pwa-register';

export function initPwa({ onInstallAvailable, onInstalled, onOffline, onToast } = {}) {
  if ('serviceWorker' in navigator) {
    window.__geloUpdate = registerSW({
      immediate: true,
      onNeedRefresh() {
        onToast?.('Aggiornamento pronto: ricarica per vedere il nuovo laboratorio.');
      },
      onOfflineReady() {
        // The offline state is already visible in the UI; a toast here would
        // land on top of the resource HUD every time the cache is filled.
      },
      onRegisterError(err) {
        console.warn('[dottor gelo] service worker non registrato:', err);
      },
    });
  }

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    onInstallAvailable?.(true);
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    onInstalled?.();
  });

  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  onInstallAvailable?.(!standalone && !deferred);

  const sync = () => onOffline?.(!navigator.onLine);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();

  return {
    async promptInstall() {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      return outcome === 'accepted';
    },
    isStandalone: standalone,
  };
}

export function createWakeLock() {
  let lock = null;
  const request = async () => {
    if (!('wakeLock' in navigator) || lock) return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {
      /* denied by the browser */
    }
  };
  const release = async () => {
    try {
      await lock?.release();
    } catch {
      /* noop */
    }
    lock = null;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') request();
  });
  return { request, release };
}
