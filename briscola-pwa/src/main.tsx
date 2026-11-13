import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/index.css';

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
