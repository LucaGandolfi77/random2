import './styles/main.css';
import { FilmController } from './scene/FilmController';

document.documentElement.classList.add('js');

window.addEventListener('error', (event) => {
  console.error('[LA CORONA E LA TESTA]', event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[LA CORONA E LA TESTA] Promise non gestita', event.reason);
});

try {
  const film = new FilmController();
  void film;
} catch (error) {
  console.error('[LA CORONA E LA TESTA] Avvio fallito', error);
  const loading = document.querySelector('#loading') as HTMLElement | null;
  const status = document.querySelector('#loading-status') as HTMLElement | null;
  if (loading) loading.classList.remove('is-done');
  if (status) {
    status.textContent =
      'La proiezione non può iniziare. WebGL non è disponibile o il browser non supporta le funzionalità richieste.';
  }
}
