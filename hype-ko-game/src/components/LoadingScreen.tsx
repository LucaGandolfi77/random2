import { getFighter } from '../data/fighters';
import { getStage } from '../data/stages';
import { getRivalry } from '../data/rivalries';
import type { MatchSetup } from '../app/types';
import { ModeLabel, NeonButton } from './ui';

export interface LoadingScreenProps {
  setup: MatchSetup;
  onReady: () => void;
}

export function LoadingScreen({ setup, onReady }: LoadingScreenProps) {
  const stage = getStage(setup.stageId);
  const player = getFighter(setup.playerFighter);
  const opponent = getFighter(setup.opponentFighter);
  const rivalry = getRivalry(setup.playerFighter, setup.opponentFighter);
  const lines = rivalry?.lines ?? [
    { speaker: 'a' as const, text: player.quotes.intro },
    { speaker: 'b' as const, text: opponent.quotes.intro }
  ];

  return (
    <div
      className="screen loading-screen"
      style={{
        background: `radial-gradient(circle at 50% 20%, ${stage.palette.neonA}33, transparent 55%), linear-gradient(180deg, ${stage.palette.skyTop}, #07030d)`
      }}
    >
      <div className="loading-mode">{ModeLabel(setup.mode)}</div>
      <div className="loading-arena">
        <span>{stage.name}</span>
        <small>{stage.subtitle}</small>
      </div>

      <div className="loading-fighters">
        <div className="loading-fighter" style={{ color: player.palette.accent }}>
          <span className="loading-fighter__tag">P1</span>
          <h2>{player.name}</h2>
          <p>{player.subtitle}</p>
        </div>
        <div className="loading-vs">
          <span>VS</span>
        </div>
        <div className="loading-fighter loading-fighter--right" style={{ color: opponent.palette.accent }}>
          <span className="loading-fighter__tag">CPU</span>
          <h2>{opponent.name}</h2>
          <p>{opponent.subtitle}</p>
        </div>
      </div>

      {rivalry && (
        <div className="loading-rivalry">
          <span className="eyebrow">RIVALITÀ: {rivalry.title}</span>
          {lines.slice(0, 2).map((line, index) => {
            const speaker = line.speaker === 'a' ? player : opponent;
            return (
              <p key={index}>
                <strong style={{ color: speaker.palette.accent }}>{speaker.name}:</strong> “{line.text}”
              </p>
            );
          })}
        </div>
      )}

      <div className="loading-bar">
        <span />
      </div>
      <NeonButton variant="ghost" onClick={onReady}>
        SALTA INTRO
      </NeonButton>
    </div>
  );
}
