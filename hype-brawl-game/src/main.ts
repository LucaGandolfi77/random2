import './ui/styles.css';
import { App } from './app/App';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Missing #app root element');
}

const app = new App(container);
app.start();

(globalThis as typeof globalThis & { __HYPE__?: App }).__HYPE__ = app;
