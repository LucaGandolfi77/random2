import { MISSIONS } from '../data/missions';
import type { Profile } from '../utils/storage';
import { formatNumber, ProgressBar, SectionTitle } from './ui';

export interface MissionsScreenProps {
  profile: Profile;
  onBack: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  matches: 'PARTITE',
  wins: 'VITTORIE',
  combo: 'COMBO',
  supers: 'SUPER',
  finishers: 'FINISHER',
  damage: 'DANNO',
  streak: 'STREAK',
  perfect: 'PERFECT',
  teamWin: 'SQUADRA',
  rumbleWin: 'RUMBLE'
};

export function MissionsScreen({ profile, onBack }: MissionsScreenProps) {
  const completed = MISSIONS.filter((mission) => (profile.missions[mission.id] ?? 0) >= mission.target).length;
  const totalReward = MISSIONS.reduce(
    (sum, mission) => {
      const done = (profile.missions[mission.id] ?? 0) >= mission.target;
      return {
        xp: sum.xp + (done ? 0 : mission.xp),
        credits: sum.credits + (done ? 0 : mission.credits)
      };
    },
    { xp: 0, credits: 0 }
  );

  return (
    <div className="screen missions-screen">
      <div className="screen__topbar">
        <button type="button" className="back-button" onClick={onBack}>
          ← Indietro
        </button>
        <div className="screen__mode">MISSIONI</div>
        <span className="screen__micro">
          {completed}/{MISSIONS.length} completate
        </span>
      </div>

      <SectionTitle
        eyebrow="OBIETTIVI"
        title="MISSIONI"
        subtitle="Piccoli compiti per farti sentire produttivo mentre distruggi la tua giornata."
      />

      <div className="missions-summary">
        <ProgressBar value={completed} max={MISSIONS.length} label="COMPLETAMENTO" />
        <div className="missions-summary__rewards">
          <span>RICOMPENSE RIMANENTI</span>
          <strong>{formatNumber(totalReward.xp)} XP</strong>
          <strong>{formatNumber(totalReward.credits)} CR</strong>
        </div>
      </div>

      <div className="missions-grid">
        {MISSIONS.map((mission) => {
          const progress = Math.min(mission.target, profile.missions[mission.id] ?? 0);
          const done = progress >= mission.target;
          return (
            <article key={mission.id} className={`mission-card ${done ? 'is-done' : ''}`}>
              <div className="mission-card__head">
                <span className="mission-card__icon">{done ? '✓' : mission.icon}</span>
                <div>
                  <h3>{mission.name}</h3>
                  <span className="mission-card__type">{TYPE_LABEL[mission.type] ?? mission.type}</span>
                </div>
                <div className="mission-card__reward">
                  <span>+{mission.xp} XP</span>
                  <span>+{mission.credits} CR</span>
                </div>
              </div>
              <p>{mission.description}</p>
              <ProgressBar
                value={progress}
                max={mission.target}
                label={`${progress} / ${mission.target}`}
                color={done ? '#00ff9d' : '#ff2e63'}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
