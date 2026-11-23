import './styles.css';
import { BorgoApp } from './app/app';

function showFailure(error: unknown): void {
  console.error('[BORGO]', error);
  const loading = document.getElementById('loading');
  if (!loading) return;
  loading.hidden = false;
  loading.classList.remove('is-out');
  const message = loading.querySelector('p');
  if (message) {
    message.textContent =
      'BORGO non riesce ad aprire la scena 3D. Serve un browser con WebGL 2 attivo.';
  }
  const mark = loading.querySelector('.loading-mark');
  if (mark) mark.textContent = 'BORGO';
}

function boot(): void {
  try {
    new BorgoApp();
  } catch (error) {
    showFailure(error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.warn('[BORGO] offline cache unavailable', error));
  });
}
