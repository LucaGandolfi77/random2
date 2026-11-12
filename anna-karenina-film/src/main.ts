import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import './styles/base.css';
import './styles/landing.css';
import './styles/player.css';
import './styles/end.css';
import { App } from './app/App';

const root = document.getElementById('app');
if (!root) throw new Error('Elemento #app non trovato');
new App(root);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const scope = import.meta.env.BASE_URL;
    navigator.serviceWorker
      .register(`${scope}sw.js`, { scope })
      .then((registration) => {
        (window as unknown as { __NEVE_SW_REG__?: ServiceWorkerRegistration }).__NEVE_SW_REG__ = registration;
        if (registration.waiting) {
          window.dispatchEvent(new Event('sw-update'));
        }
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new Event('sw-update'));
            }
          });
        });
      })
      .catch(() => {
        // The film remains usable online; offline support is progressive.
      });
  });
}
