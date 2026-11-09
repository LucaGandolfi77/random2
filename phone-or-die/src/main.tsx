import ReactDOM from 'react-dom/client';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useGameStore } from './core/gameStore';
import './styles/index.css';

if (import.meta.env.DEV) {
  (window as unknown as { __PHONE_OR_DIE_STORE__?: typeof useGameStore }).__PHONE_OR_DIE_STORE__ = useGameStore;
}

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
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
