import { useMemo, useState } from 'react';
import { FIGHTERS } from '../data/fighters';
import type { FighterDefinition } from '../data/fighters/types';
import type { GameModeId } from '../game/combat/types';
import type { CharacterSelection } from '../app/types';
import { BackButton, FighterCard, ModeLabel, NeonButton, SectionTitle, StatBar } from './ui';

interface SelectStep {
  label: string;
  side: 'player' | 'opponent';
  team: number;
}

function stepsForMode(mode: GameModeId): SelectStep[] {
  if (mode === 'team') {
    return [
      { label: 'P1', side: 'player', team: 0 },
      { label: 'P2', side: 'player', team: 0 },
      { label: 'CPU 1', side: 'opponent', team: 1 },
      { label: 'CPU 2', side: 'opponent', team: 1 }
    ];
  }
  if (mode === 'rumble' || mode === 'tournament') {
    return [{ label: 'P1', side: 'player', team: 0 }];
  }
  return [
    { label: 'P1', side: 'player', team: 0 },
    { label: 'CPU', side: 'opponent', team: 1 }
  ];
}

function pickOpponents(exclude: string[], count: number): string[] {
  const pool = FIGHTERS.map((fighter) => fighter.id).filter((id) => !exclude.includes(id));
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export interface CharacterSelectProps {
  mode: GameModeId;
  onBack: () => void;
  onConfirm: (selection: CharacterSelection) => void;
}

export function CharacterSelect({ mode, onBack, onConfirm }: CharacterSelectProps) {
  const steps = useMemo(() => stepsForMode(mode), [mode]);
  const [stepIndex, setStepIndex] = useState(0);
  const [picks, setPicks] = useState<(string | null)[]>(() => steps.map(() => null));
  const step = steps[stepIndex];
  const currentId = picks[stepIndex];
  const current = currentId ? FIGHTERS.find((fighter) => fighter.id === currentId) ?? null : null;
  const disallowDuplicates = mode === 'team' || mode === 'rumble';

  const choose = (fighter: FighterDefinition) => {
    const usedElsewhere = picks.some((id, index) => id === fighter.id && index !== stepIndex);
    if (usedElsewhere && disallowDuplicates) return;
    setPicks((previous) => previous.map((id, index) => (index === stepIndex ? fighter.id : id)));
  };

  const randomPick = () => {
    const used = disallowDuplicates ? picks.filter((id): id is string => id !== null) : [];
    const pool = FIGHTERS.filter((fighter) => !used.includes(fighter.id));
    if (pool.length === 0) return;
    choose(pool[Math.floor(Math.random() * pool.length)]);
  };

  const finish = (finalPicks: (string | null)[]) => {
    const playerFighters = finalPicks
      .filter((_, index) => steps[index].side === 'player')
      .filter((id): id is string => id !== null);
    const opponentPicks = finalPicks
      .filter((_, index) => steps[index].side === 'opponent')
      .filter((id): id is string => id !== null);
    if (mode === 'rumble') {
      const opponents = pickOpponents(playerFighters, 3);
      onConfirm({ playerFighters, opponentFighters: opponents });
      return;
    }
    if (mode === 'tournament') {
      onConfirm({ playerFighters, opponentFighters: [] });
      return;
    }
    onConfirm({ playerFighters, opponentFighters: opponentPicks });
  };

  const next = () => {
    if (!currentId) return;
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    finish(picks);
  };

  const back = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
    else onBack();
  };

  const complete = picks.every((id) => id !== null);

  return (
    <div className="screen character-select">
      <div className="screen__topbar">
        <BackButton onClick={back} />
        <div className="select-steps">
          {steps.map((item, index) => (
            <span
              key={`${item.label}-${index}`}
              className={`select-step ${index === stepIndex ? 'is-active' : ''} ${picks[index] ? 'is-done' : ''}`}
            >
              <span>{item.label}</span>
              <strong>{picks[index] ? FIGHTERS.find((fighter) => fighter.id === picks[index])?.name : '—'}</strong>
            </span>
          ))}
        </div>
        <div className="screen__mode">{ModeLabel(mode)}</div>
      </div>

      <SectionTitle
        eyebrow={step.side === 'player' ? 'LA TUA CARRIERA' : 'IL TUO AVVERSARIO'}
        title={step.side === 'player' ? 'SCEGLI CHI SEI' : 'SCEGLI CHI TI DISTRUGGERÀ'}
        subtitle="Sedici caratteri, un solo obiettivo: restare online."
      />

      <div className="select-layout">
        <div className="select-grid">
          {FIGHTERS.map((fighter) => {
            const pickedIndex = picks.indexOf(fighter.id);
            const pickedStep = pickedIndex >= 0 ? steps[pickedIndex] : null;
            const locked = disallowDuplicates && pickedIndex >= 0 && pickedIndex !== stepIndex;
            return (
              <div key={fighter.id} className={locked ? 'select-grid__locked' : ''}>
                <FighterCard
                  fighter={fighter}
                  selected={fighter.id === currentId}
                  badge={pickedIndex >= 0 && pickedIndex !== stepIndex ? pickedStep?.label : undefined}
                  onClick={() => choose(fighter)}
                />
              </div>
            );
          })}
        </div>

        <aside className="select-preview">
          {current ? (
            <>
              <div
                className="select-preview__hero"
                style={{
                  background: `radial-gradient(circle at 50% 20%, ${current.palette.aura}66, transparent 55%), linear-gradient(160deg, ${current.palette.primary}, #07030d)`
                }}
              >
                <span className="select-preview__initial">{current.name.charAt(0)}</span>
                <div className="select-preview__hero-text">
                  <span className="eyebrow">{current.subtitle}</span>
                  <h2>{current.name}</h2>
                  <span className="select-preview__archetype">{current.archetype}</span>
                </div>
              </div>
              <p className="select-preview__bio">{current.bio}</p>
              <div className="select-preview__stats">
                <StatBar label="POTENZA" value={current.stats.power} color={current.palette.accent} />
                <StatBar label="VELOCITÀ" value={current.stats.speed} color={current.palette.accent} />
                <StatBar label="PORTATA" value={current.stats.range} color={current.palette.accent} />
                <StatBar label="TECNICA" value={current.stats.technique} color={current.palette.accent} />
                <StatBar label="DIFESA" value={current.stats.defense} color={current.palette.accent} />
              </div>
              <div className="select-preview__moves">
                <div>
                  <span>SPECIAL 1</span>
                  <strong>{current.moves[current.specials.s1]?.name}</strong>
                </div>
                <div>
                  <span>SPECIAL 2</span>
                  <strong>{current.moves[current.specials.s2]?.name}</strong>
                </div>
                <div>
                  <span>SUPER</span>
                  <strong>{current.moves[current.superMove]?.name}</strong>
                </div>
                <div>
                  <span>FINISHER</span>
                  <strong>{current.moves[current.finisher]?.name}</strong>
                </div>
              </div>
              <blockquote className="select-preview__quote">“{current.quotes.intro}”</blockquote>
            </>
          ) : (
            <div className="select-preview__empty">
              <span className="select-preview__empty-mark">?</span>
              <p>Seleziona un combattente per vedere statistiche, mosse e frase di presentazione.</p>
            </div>
          )}

          <div className="select-actions">
            <NeonButton variant="ghost" onClick={randomPick}>
              CASUALE
            </NeonButton>
            <NeonButton onClick={next} disabled={!currentId}>
              {stepIndex < steps.length - 1 ? 'AVANTI' : complete ? 'CONFERMA' : 'AVANTI'}
            </NeonButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
