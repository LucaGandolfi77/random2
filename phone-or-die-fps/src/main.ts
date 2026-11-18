import './styles.css';
import { Game } from './game/Game';

const app = document.getElementById('app') as HTMLElement;
const scene = document.getElementById('scene') as HTMLElement;

try {
  const game = new Game(app, scene);
  // Small public hook for automated smoke tests and debugging.
  (window as unknown as { __POD_GAME__?: Game }).__POD_GAME__ = game;
} catch (error) {
  console.error('[PHONE OR DIE] failed to start', error);
  app.innerHTML = `<div class="screen"><div class="panel"><h1>UNABLE TO START</h1>
    <p class="lead">This game needs a browser with WebGL 2 and JavaScript enabled.</p>
    <p class="muted small">${String(error)}</p></div></div>`;
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('[PHONE OR DIE] offline cache unavailable', err));
  });
}
