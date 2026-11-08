import { MISSION_BY_ID } from '../data/missions';
import { getFighter } from '../data/fighters';
import type { MatchSummary, Profile } from '../utils/storage';
import { levelProgress } from '../utils/storage';
import { formatNumber, NeonButton, ProgressBar } from './ui';

export interface ResultsScreenProps {
  summary: MatchSummary;
  profile: Profile;
  earnedXp: number;
  earnedCredits: number;
  completedMissions: string[];
  onRematch: () => void;
  onCharacterSelect: () => void;
  onMenu: () => void;
}

export function ResultsScreen({
  summary,
  profile,
  earnedXp,
  earnedCredits,
  completedMissions,
  onRematch,
  onCharacterSelect,
  onMenu
}: ResultsScreenProps) {
  const player = getFighter(summary.playerFighter);
  const opponent = getFighter(summary.opponentFighter);
  const progress = levelProgress(profile.xp);
  const accent = summary.won ? '#00ff9d' : '#ff2e63';

  return (
    <div className={`screen results-screen ${summary.won ? 'is-win' : 'is-loss'}`}>
      <div
        className="results-hero"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accent}55, transparent 55%), linear-gradient(180deg, #0a0612, #07030d)`
        }}
      >
        <span className="eyebrow">{summary.won ? 'MATCH COMPLETATO' : 'MATCH ARCHIVIATO'}</span>
        <h1 style={{ color: accent }}>{summary.won ? 'VITTORIA' : 'SCONFITTA'}</h1>
        <p>
          {summary.won
            ? `${player.name} ha appena reso ${opponent.name} un contenuto secondario.`
            : `${opponent.name} ha pubblicato la tua sconfitta. Ha già 40k like.`}
        </p>
        <div className="results-versus">
          <div style={{ color: player.palette.accent }}>
            <strong>{player.name}</strong>
            <span>{player.victoryTitle}</span>
          </div>
          <span className="results-versus__x">VS</span>
          <div style={{ color: opponent.palette.accent }}>
            <strong>{opponent.name}</strong>
            <span>{opponent.victoryTitle}</span>
          </div>
        </div>
      </div>

      <div className="results-body">
        <div className="results-stats">
          <Stat label="DANNO INFLITTO" value={formatNumber(summary.damageDealt)} />
          <Stat label="COMBO MASSIMA" value={`${summary.maxCombo}`} />
          <Stat label="COLPI" value={`${summary.hits}`} />
          <Stat label="SUPER" value={`${summary.superUses}`} />
          <Stat label="FINISHER" value={`${summary.finishers}`} />
          <Stat label="PERFECT" value={`${summary.perfectRounds}`} />
          <Stat label="ROUND" value={`${summary.roundsWon} - ${summary.roundsLost}`} />
          <Stat label="TEMPO" value={`${summary.matchTime}s`} />
        </div>

        <div className="results-rewards">
          <span className="eyebrow">RICONOSCIMENTI</span>
          <div className="reward-row">
            <span>XP</span>
            <strong>+{formatNumber(earnedXp)}</strong>
          </div>
          <div className="reward-row">
            <span>CREDITI</span>
            <strong>+{formatNumber(earnedCredits)}</strong>
          </div>
          <div className="results-level">
            <div>
              <span>LIVELLO {progress.level}</span>
              <small>
                {progress.current} / {progress.needed} XP
              </small>
            </div>
            <ProgressBar value={progress.current} max={progress.needed} color={accent} />
          </div>
        </div>

        <div className="results-missions">
          <span className="eyebrow">MISSIONI</span>
          {completedMissions.length === 0 ? (
            <p>Nessuna missione completata. L'algoritmo ha registrato la tua presenza, non il tuo impegno.</p>
          ) : (
            <ul>
              {completedMissions.map((id) => (
                <li key={id}>
                  <span>✓</span>
                  {MISSION_BY_ID[id]?.name ?? id}
                  <strong>+{MISSION_BY_ID[id]?.credits ?? 0}</strong>
                </li>
              ))}
            </ul>
          )}
          {summary.mode === 'training' && (
            <p className="results-note">Modalità allenamento: niente XP, niente classifica, solo crescita interiore.</p>
          )}
        </div>
      </div>

      <div className="results-actions">
        <NeonButton onClick={onRematch}>RIVINCITA</NeonButton>
        <NeonButton variant="ghost" onClick={onCharacterSelect}>
          CAMBIA FIGHTER
        </NeonButton>
        <NeonButton variant="ghost" onClick={onMenu}>
          MENU
        </NeonButton>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
