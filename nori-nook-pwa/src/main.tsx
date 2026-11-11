import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito/index.css';
import '@fontsource/zen-maru-gothic/latin-400.css';
import '@fontsource/zen-maru-gothic/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/screens.css';
import './styles/games.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(<App />);
