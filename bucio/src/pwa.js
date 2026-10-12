/**
 * PWA: registrazione del service worker, prompt d'installazione, stato
 * offline e Wake Lock (lo schermo non si deve spegnere mentre si gioca).
 */
import { registerSW } from 'virtual:pwa-register';

export function initPwa({ onInstallAvailable, onInstalled, onOffline, onToast }) {
  /* ------------------------------------------------------ service worker */
  if ('serviceWorker' in navigator) {
    window.__bucioUpdate = registerSW({
      immediate: true,
      onNeedRefresh() {
        onToast?.('Aggiornamento pronto: ricarica la pagina 🕳️');
      },
      onOfflineReady() {
        onToast?.('Pronto offline: si gioca anche senza rete');
      },
      onRegisterError(err) {
        console.warn('[bucio] service worker non registrato:', err);
      },
    });
  }

  /* ------------------------------------------------------------ install */
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

  const isIos = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !('standalone' in navigator);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  onInstallAvailable?.(!standalone && (deferred !== null || !isIos()));

  /* ------------------------------------------------------------ offline */
  const syncOffline = () => onOffline?.(!navigator.onLine);
  window.addEventListener('online', syncOffline);
  window.addEventListener('offline', syncOffline);
  syncOffline();

  return {
    async promptInstall() {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      return outcome === 'accepted';
    },
    needsIosHint: !standalone && isIos(),
  };
}

/* -------------------------------------------------------------- wake lock */

export function createWakeLock() {
  let lock = null;
  const request = async () => {
    if (!('wakeLock' in navigator) || lock) return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {
      /* alcuni browser lo negano: pazienza */
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