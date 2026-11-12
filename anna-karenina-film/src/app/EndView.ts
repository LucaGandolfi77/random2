import { icon } from './icons';

export interface EndProps {
  onReplay: () => void;
  onHome: () => void;
}

export class EndView {
  readonly element: HTMLDivElement;

  constructor(props: EndProps) {
    this.element = document.createElement('div');
    this.element.className = 'screen end-screen';
    this.element.innerHTML = `
      <div class="end-grain"></div>
      <div class="end-content">
        <p class="end-kicker">Fine</p>
        <h2 class="end-title">NEVE<br/><em>E</em> FERRO</h2>
        <p class="end-dedication">A chi cerca una voce propria.</p>
        <div class="end-rule"></div>
        <div class="end-credits">
          <div class="end-credit-block">
            <span class="end-credit-label">Un film originale</span>
            <span>Liberamente ispirato ad <cite>Anna Karenina</cite> di Lev Tolstoj</span>
          </div>
          <div class="end-credit-block">
            <span class="end-credit-label">Sceneggiatura, regia, animazione, musica</span>
            <span>Realizzate per questo progetto</span>
          </div>
          <div class="end-credit-block">
            <span class="end-credit-label">Immagine</span>
            <span>Personaggi, ambienti e luci in grafica vettoriale originale</span>
          </div>
          <div class="end-credit-block">
            <span class="end-credit-label">Suono</span>
            <span>Partitura e sound design sintetizzati in Web Audio</span>
          </div>
          <div class="end-credit-block">
            <span class="end-credit-label">Tecnologia</span>
            <span>TypeScript · Vite · SVG · Canvas · Web Audio · PWA</span>
          </div>
          <div class="end-credit-block">
            <span class="end-credit-label">Tipografia</span>
            <span>Cormorant Garamond e Inter · SIL Open Font License</span>
          </div>
        </div>
        <div class="end-rule"></div>
        <p class="end-thanks">Grazie per aver visto <strong>NEVE E FERRO</strong>.</p>
        <div class="end-actions">
          <button class="btn btn-primary" data-action="replay">RIVEDI IL FILM ${icon('restart')}</button>
          <button class="btn btn-ghost" data-action="home">TORNA AL TITOLO</button>
        </div>
        <p class="end-note">Nessuna immagine, voce o musica proviene da adattamenti esistenti.<br/>Il film non mostra la morte di Anna: sceglie di raccontarne l'assenza.</p>
      </div>
    `;
    this.element.querySelector('[data-action="replay"]')?.addEventListener('click', () => props.onReplay());
    this.element.querySelector('[data-action="home"]')?.addEventListener('click', () => props.onHome());
  }


  destroy(): void {}
}
