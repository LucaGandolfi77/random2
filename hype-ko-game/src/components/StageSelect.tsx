import { useState } from 'react';
import { STAGES, getRandomStage, type StageDefinition } from '../data/stages';
import type { GameModeId } from '../game/combat/types';
import type { CharacterSelection, MatchOptions } from '../app/types';
import type { AIDifficulty } from '../game/ai';
import { BackButton, ModeLabel, NeonButton, SectionTitle } from './ui';

const DIFFICULTIES: { id: AIDifficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'FACILE', hint: 'La CPU ti lascia respirare.' },
  { id: 'normal', label: 'NORMALE', hint: 'La CPU sa cosa stai per fare.' },
  { id: 'hard', label: 'DIFFICILE', hint: 'La CPU ha già montato la clip.' },
  { id: 'expert', label: 'ESPERTO', hint: 'La CPU è il tuo nuovo manager.' }
];

export interface StageSelectProps {
  mode: GameModeId;
  selection: CharacterSelection;
  onBack: () => void;
  onConfirm: (options: MatchOptions) => void;
}

export function StageSelect({ mode, selection, onBack, onConfirm }: StageSelectProps) {
  const [stageId, setStageId] = useState(() => getRandomStage().id);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [roundsToWin, setRoundsToWin] = useState(2);
  const [roundTime, setRoundTime] = useState(99);
  const [localVersus, setLocalVersus] = useState(false);

  const stage = STAGES.find((item) => item.id === stageId) ?? STAGES[0];
  const allowLocal = mode === 'quick';
  const showDifficulty = !(allowLocal && localVersus);

  const start = () => {
    onConfirm({ stageId, roundsToWin, roundTime, difficulty, localVersus: allowLocal && localVersus });
  };

  return (
    <div className="screen stage-select">
      <div className="screen__topbar">
        <BackButton onClick={onBack} />
        <div className="screen__mode">{ModeLabel(mode)}</div>
        <div className="screen__roster-mini">
          {[...selection.playerFighters, ...selection.opponentFighters].map((id, index) => (
            <span key={`${id}-${index}`}>{id.toUpperCase()}</span>
          ))}
        </div>
      </div>

      <SectionTitle
        eyebrow="LOCATION SCOUTING"
        title="SCEGLI L'ARENA"
        subtitle="Otto luoghi che non dovrebbero esistere. Scegli quello con il wifi migliore."
      />

      <div className="stage-layout">
        <div className="stage-grid">
          {STAGES.map((item) => (
            <StageCard
              key={item.id}
              stage={item}
              selected={item.id === stage.id}
              onClick={() => setStageId(item.id)}
            />
          ))}
        </div>

        <aside className="stage-options">
          <div
            className="stage-options__hero"
            style={{
              background: `linear-gradient(140deg, ${stage.palette.skyTop}, ${stage.palette.skyBottom} 60%, ${stage.palette.floor})`
            }}
          >
            <div className="stage-options__hero-glow" style={{ background: stage.palette.neonA }} />
            <span className="eyebrow">{stage.subtitle}</span>
            <h2>{stage.name}</h2>
            <p>{stage.description}</p>
          </div>

          <div className="option-group">
            <span className="option-label">DIFFICOLTÀ CPU</span>
            <div className="chip-row">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip ${difficulty === item.id ? 'is-active' : ''}`}
                  onClick={() => setDifficulty(item.id)}
                  disabled={!showDifficulty}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {showDifficulty && (
              <span className="option-hint">{DIFFICULTIES.find((item) => item.id === difficulty)?.hint}</span>
            )}
          </div>

          <div className="option-group">
            <span className="option-label">FORMATO</span>
            <div className="chip-row">
              {[2, 3].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${roundsToWin === value ? 'is-active' : ''}`}
                  onClick={() => setRoundsToWin(value)}
                >
                  AL MEGLIO DI {value * 2 - 1}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <span className="option-label">TEMPO ROUND</span>
            <div className="chip-row">
              {[60, 99].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${roundTime === value ? 'is-active' : ''}`}
                  onClick={() => setRoundTime(value)}
                >
                  {value} SECONDI
                </button>
              ))}
            </div>
          </div>

          {allowLocal && (
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={localVersus}
                onChange={(event) => setLocalVersus(event.target.checked)}
              />
              <span>2 giocatori locali</span>
              <small>P2 usa le frecce + Numpad 1-9</small>
            </label>
          )}

          <div className="stage-options__actions">
            <NeonButton
              variant="ghost"
              onClick={() => setStageId(getRandomStage().id)}
            >
              ARENA CASUALE
            </NeonButton>
            <NeonButton onClick={start}>COMBATTI</NeonButton>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StageCard({
  stage,
  selected,
  onClick
}: {
  stage: StageDefinition;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`stage-card ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      style={{
        '--stage-a': stage.palette.skyTop,
        '--stage-b': stage.palette.skyBottom,
        '--stage-floor': stage.palette.floor,
        '--stage-neon': stage.palette.neonA,
        '--stage-neon-b': stage.palette.neonB
      } as React.CSSProperties}
    >
      <div className="stage-card__art">
        <div className="stage-card__sky" />
        <div className="stage-card__sun" />
        <div className="stage-card__skyline" />
        <div className="stage-card__floor" />
        <div className="stage-card__crowd" />
      </div>
      <div className="stage-card__body">
        <span className="stage-card__time">{stage.timeOfDay.toUpperCase()}</span>
        <strong>{stage.name}</strong>
        <span>{stage.subtitle}</span>
      </div>
    </button>
  );
}
