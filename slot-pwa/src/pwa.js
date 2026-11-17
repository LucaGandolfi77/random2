/* Install prompt, service-worker lifecycle, updates and offline badge. */

export function setupPWA(ui) {
  let deferred = null;
  const banner = document.getElementById('install-banner');
  const installBtn = document.getElementById('install-btn');
  const laterBtn = document.getElementById('install-later');
  const offline = document.getElementById('offline-badge');

  const setOffline = () => offline && offline.classList.toggle('hidden', navigator.onLine !== false);
  window.addEventListener('online', setOffline);
  window.addEventListener('offline', setOffline);
  setOffline();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (banner) banner.classList.remove('hidden');
  });
  installBtn?.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    banner?.classList.add('hidden');
    deferred = null;
  });
  laterBtn?.addEventListener('click', () => {
    banner?.classList.add('hidden');
    try { localStorage.setItem('slot-install-dismissed', 'true'); } catch (e) {}
  });
  try {
    if (localStorage.getItem('slot-install-dismissed') === 'true') banner?.classList.add('hidden');
  } catch (e) {}

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./service-worker.js');
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              ui?.toast('Update available — tap to reload', 'update');
              document.getElementById('update-btn')?.classList.remove('hidden');
            }
          });
        });
        if (reg.waiting && navigator.serviceWorker.controller) {
          document.getElementById('update-btn')?.classList.remove('hidden');
        }
      } catch (err) {
        console.warn('SW registration failed', err);
      }
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'UPDATE_READY') window.location.reload();
      });
    });

    document.getElementById('update-btn')?.addEventListener('click', () => {
      const reg = navigator.serviceWorker.controller || null;
      navigator.serviceWorker.getRegistration().then((r) => {
        (r?.waiting || reg)?.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      });
    });
  }
}

/* Tell the shared R2 helper this game was played (stats for the hub). */
export function markPlayed(R2) {
  try {
    R2?.markPlayed?.('slot-pwa/');
    R2?.trackPlaytime?.('slot-pwa/');
    R2?.installHint?.();
  } catch (e) {}
}
