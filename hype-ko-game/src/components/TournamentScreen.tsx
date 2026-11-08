import { getFighter } from '../data/fighters';
import { getRandomStage } from '../data/stages';
import { playerTournamentMatch, type TournamentMatch } from '../game/modes/tournament';
import type { AIDifficulty } from '../game/ai';
import type { MatchSetup } from '../app/types';
import type { Profile } from '../utils/storage';
import { NeonButton, SectionTitle } from './ui';

export interface TournamentScreenProps {
  profile: Profile;
  onBack: () => void;
  onCreate: () => void;
  onStartMatch: (setup: MatchSetup) => void;
}

const ROUND_NAMES = ['QUARTI', 'SEMIFINALI', 'FINALE'];

export function TournamentScreen({ profile, onBack, onCreate, onStartMatch }: TournamentScreenProps) {
  const state = profile.tournament;

  const start = () => {
    if (!state) return;
    const match = playerTournamentMatch(state);
    if (!match) return;
    const opponent = match.a === state.playerFighter ? match.b : match.a;
    onStartMatch({
      mode: 'tournament',
      playerFighter: state.playerFighter,
      opponentFighter: opponent,
      stageId: getRandomStage().id,
      roundsToWin: 2,
      roundTime: 99,
      difficulty: state.difficulty as AIDifficulty,
      localVersus: false
    });
  };

  return (
    <div className="screen tournament-screen">
      <div className="screen__topbar">
        <button type="button" className="back-button" onClick={onBack}>
          ← Indietro
        </button>
        <div className="screen__mode">TORNEO DELLE VIRALITÀ</div>
        <span className="screen__micro">8 fighter · eliminazione diretta</span>
      </div>

      {!state && (
        <>
          <SectionTitle
            eyebrow="IL BRACKET TI ASPETTA"
            title="CREA IL TUO TORNEO"
            subtitle="Otto combattenti. Tre round. Un solo vincitore con diritto di monetizzazione."
          />
          <div className="tournament-intro">
            <div className="tournament-trophy">🏆</div>
            <h2>IL TORNEO DELLE VIRALITÀ</h2>
            <p>
              Scegli il tuo fighter. Il bracket viene generato casualmente. Ogni match è al meglio dei tre round.
              Se perdi, sei fuori. Se vinci, il mondo ti deve attenzione.
            </p>
            <NeonButton onClick={onCreate}>SCEGLI IL FIGHTER</NeonButton>
          </div>
        </>
      )}

      {state && (
        <div className="tournament-layout">
          <div className="tournament-hero">
            <div
              className="tournament-hero__art"
              style={{
                background: `radial-gradient(circle at 50% 20%, ${
                  getFighter(state.playerFighter).palette.aura
                }55, transparent 60%), linear-gradient(150deg, ${
                  getFighter(state.playerFighter).palette.primary
                }, #07030d)`
              }}
            >
              <span>{getFighter(state.playerFighter).name.charAt(0)}</span>
              <div>
                <small>IL TUO FIGHTER</small>
                <h2>{getFighter(state.playerFighter).name}</h2>
                <p>{getFighter(state.playerFighter).subtitle}</p>
              </div>
            </div>

            {state.champion ? (
              <div className="tournament-status is-champion">
                <span className="eyebrow">CAMPIONE</span>
                <h3>HAI VINTO IL TORNEO</h3>
                <p>Il trofeo è tuo. È un PNG con risoluzione 512x512. Ne valeva la pena.</p>
                <NeonButton onClick={onCreate}>NUOVO TORNEO</NeonButton>
              </div>
            ) : state.eliminated ? (
              <div className="tournament-status is-eliminated">
                <span className="eyebrow">ELIMINATO</span>
                <h3>IL BRACKET NON PERDONA</h3>
                <p>Sei uscito dal torneo. Puoi sempre dire che era un periodo sperimentale.</p>
                <NeonButton onClick={onCreate}>RIPROVA</NeonButton>
              </div>
            ) : (
              <div className="tournament-status">
                <span className="eyebrow">PROSSIMO MATCH</span>
                {(() => {
                  const match = playerTournamentMatch(state);
                  if (!match) return <p>Nessun match disponibile.</p>;
                  const opponent = match.a === state.playerFighter ? match.b : match.a;
                  return (
                    <>
                      <h3>
                        {state.playerFighter ? getFighter(state.playerFighter).name : '—'} vs{' '}
                        {getFighter(opponent).name}
                      </h3>
                      <p>
                        {ROUND_NAMES[state.round] ?? `ROUND ${state.round + 1}`} · Difficoltà{' '}
                        {state.difficulty.toUpperCase()}
                      </p>
                      <NeonButton onClick={start}>COMBATTI</NeonButton>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="bracket">
            {ROUND_NAMES.map((roundName, roundIndex) => {
              const matches: TournamentMatch[] = state.bracket[roundIndex] ?? [];
              const count = 4 >> roundIndex;
              return (
                <div key={roundName} className={`bracket-round ${state.round === roundIndex ? 'is-active' : ''}`}>
                  <h3>
                    {roundName}
                    {state.round === roundIndex && !state.eliminated && !state.champion && (
                      <span className="bracket-round__live">LIVE</span>
                    )}
                  </h3>
                  <div className="bracket-round__matches">
                    {Array.from({ length: count }, (_, matchIndex) => {
                      const match = matches[matchIndex];
                      if (!match) {
                        return (
                          <div key={matchIndex} className="bracket-match is-empty">
                            <span>TBD</span>
                            <span>TBD</span>
                          </div>
                        );
                      }
                      const involvesPlayer =
                        match.a === state.playerFighter || match.b === state.playerFighter;
                      return (
                        <div
                          key={matchIndex}
                          className={`bracket-match ${involvesPlayer ? 'is-player' : ''} ${
                            match.winner ? 'is-decided' : ''
                          }`}
                        >
                          <BracketSlot fighterId={match.a} winner={match.winner} />
                          <BracketSlot fighterId={match.b} winner={match.winner} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketSlot({ fighterId, winner }: { fighterId: string; winner?: string }) {
  const fighter = getFighter(fighterId);
  return (
    <div className={`bracket-slot ${winner === fighterId ? 'is-winner' : ''}`}>
      <span className="bracket-slot__dot" style={{ background: fighter.palette.accent }} />
      <span>{fighter.name}</span>
      {winner === fighterId && <strong>✓</strong>}
    </div>
  );
}
