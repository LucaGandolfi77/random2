import ReactDOM from 'react-dom/client';
import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useGameStore } from './core/gameStore';
import './styles/index.css';

// Development-only inspection hook for smoke tests and debugging. It is omitted
// from production builds by Vite's import.meta.env replacement.
if (import.meta.env.DEV) {
  (window as unknown as { __ASHEN_STORE__?: typeof useGameStore }).__ASHEN_STORE__ = useGameStore;
}

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      window.setInterval(() => {
        void registration.update();
      }, 60 * 60 * 1000);
    }
  }
});

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}
