import './styles.css';
import { Game } from './game/Game';

const app = document.getElementById('app') as HTMLElement;
const canvas = document.getElementById('game') as HTMLCanvasElement;

try {
  const game = new Game(app, canvas);
  (window as unknown as { __GBP_GAME__?: Game }).__GBP_GAME__ = game;
} catch (error) {
  console.error('[GIGANT BATTLE] failed to start', error);
  app.innerHTML = `<div class="screen"><div class="panel"><h1>UNABLE TO START</h1>
    <p class="lead">A browser with Canvas 2D and JavaScript is required.</p>
    <p class="small muted">${String(error)}</p></div></div>`;
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline cache unavailable */ });
  });
}
