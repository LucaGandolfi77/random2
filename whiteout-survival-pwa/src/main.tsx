import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App, { AppErrorBoundary } from './App';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker
      .register(`${base}service-worker.js`, { scope: base })
      .catch((error) => {
        console.warn('Service worker registration failed', error);
      });
  });
}
