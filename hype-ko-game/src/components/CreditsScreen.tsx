import { BackButton, SectionTitle } from './ui';

export interface CreditsScreenProps {
  onBack: () => void;
}

export function CreditsScreen({ onBack }: CreditsScreenProps) {
  return (
    <div className="screen credits-screen">
      <div className="screen__topbar">
        <BackButton onClick={onBack} />
        <div className="screen__mode">CREDITI</div>
        <span className="screen__micro">v1.0</span>
      </div>

      <SectionTitle
        eyebrow="CHI HA FATTO COSA"
        title="CREDITI"
        subtitle="Un fighting game nato da un prompt, tre caffè e una connessione instabile."
      />

      <div className="credits-layout">
        <section className="credits-card">
          <h3>HYPE K.O. — THE LAST VIRALITY</h3>
          <p>
            Direzione creativa, game design e sviluppo: il team invisibile che vive dentro questo repository.
            Personaggi, arene e brand sono fittizi. Ogni somiglianza con persone reali è una strategia di marketing.
          </p>
          <p>
            Motore 3D: Babylon.js. Interfaccia: React. Audio: Web Audio API e sintesi procedurale. Annunciatore:
            SpeechSynthesis del browser, che pronuncia “K.O.” meglio di noi.
          </p>
        </section>

        <section className="credits-card">
          <h3>ROSTER</h3>
          <p>
            808 NERO · TASTIERA NERA · VELVET VERA · CUORE STORTO · COMMENTINA · ZIA LIVE · IL CORO · FASHION ERROR ·
            REINA RITMO · GLITCHETTA · HONEY BADGE · NOCTURNA · MR TRAILER · THE BRAND · ACE TURBO · NPC 404
          </p>
          <h3>ARENE</h3>
          <p>
            THE LAST FESTIVAL · METRO 0317 · CLUB VERTICALE · STADIO DEI COMMENTI · STUDIO 9B · MALL OF TOMORROW · NEON
            RODEO · PIT LANE
          </p>
        </section>

        <section className="credits-card">
          <h3>LICENZE E ASSET</h3>
          <p>
            Nessun asset proprietario esterno. Personaggi, materiali, texture e animazioni sono generati proceduralmente
            nel codice. Font: Bebas Neue e Rajdhani, distribuiti con SIL Open Font License tramite Fontsource.
            Babylon.js è distribuito con Apache License 2.0. React con MIT License.
          </p>
          <p>
            Il gioco non raccoglie dati personali, non usa cookie di profilazione e non invia nulla a servizi esterni.
            Il multiplayer usa un server WebSocket locale o quello che avvii tu.
          </p>
        </section>

        <section className="credits-card credits-card--special">
          <h3>RINGRAZIAMENTI</h3>
          <p>
            A chi ha cliccato “play” senza leggere i requisiti. A chi ha perso contro la CPU in modalità esperto e ha
            dato la colpa all'input lag. A chi ha detto “facciamo un fighting game” e poi è sparito. Questo è per voi.
          </p>
          <span className="credits-signature">— IL TEAM DI HYPE K.O.</span>
        </section>
      </div>
    </div>
  );
}
