import { useState } from 'react';
import { MISSIONS } from '../data/missions';
import { levelProgress, type Profile } from '../utils/storage';
import { formatNumber, NeonButton, ProgressBar, SectionTitle } from './ui';

export interface ProfileScreenProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
  onBack: () => void;
  onReset: () => void;
  onTournament: () => void;
}

export function ProfileScreen({ profile, onChange, onBack, onReset, onTournament }: ProfileScreenProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const progress = levelProgress(profile.xp);
  const winRate = profile.matches > 0 ? Math.round((profile.wins / profile.matches) * 100) : 0;
  const completedMissions = MISSIONS.filter((mission) => (profile.missions[mission.id] ?? 0) >= mission.target).length;
  const totalMissions = MISSIONS.length;

  const setName = (name: string) => {
    onChange({ ...profile, name: name.slice(0, 18).toUpperCase() });
  };

  return (
    <div className="screen profile-screen">
      <div className="screen__topbar">
        <button type="button" className="back-button" onClick={onBack}>
          ← Indietro
        </button>
        <div className="screen__mode">PROFILO</div>
        <span className="screen__micro">dati locali</span>
      </div>

      <SectionTitle
        eyebrow="IDENTITÀ DIGITALE"
        title={profile.name}
        subtitle="Il tuo personaggio è te. Le statistiche sono la prova."
      />

      <div className="profile-layout">
        <div className="profile-main">
          <div className="profile-identity">
            <div className="profile-identity__avatar">{profile.name.charAt(0)}</div>
            <div className="profile-identity__fields">
              <label>
                NOME DA COMBATTIMENTO
                <input value={profile.name} onChange={(event) => setName(event.target.value)} maxLength={18} />
              </label>
              <div className="profile-identity__level">
                <span>LIVELLO {progress.level}</span>
                <ProgressBar value={progress.current} max={progress.needed} />
                <small>
                  {progress.current} / {progress.needed} XP
                </small>
              </div>
            </div>
            <div className="profile-identity__credits">
              <span>CREDITI</span>
              <strong>{formatNumber(profile.credits)}</strong>
            </div>
          </div>

          <div className="profile-stats-grid">
            <Stat label="MATCH" value={formatNumber(profile.matches)} />
            <Stat label="VITTORIE" value={formatNumber(profile.wins)} accent="#00ff9d" />
            <Stat label="SCONFITTE" value={formatNumber(profile.losses)} accent="#ff2e63" />
            <Stat label="WIN RATE" value={`${winRate}%`} />
            <Stat label="STREAK" value={formatNumber(profile.streak)} />
            <Stat label="RECORD STREAK" value={formatNumber(profile.bestStreak)} />
            <Stat label="COMBO MASSIMA" value={formatNumber(profile.maxCombo)} />
            <Stat label="DANNO TOTALE" value={formatNumber(profile.totalDamage)} />
            <Stat label="COLPI" value={formatNumber(profile.totalHits)} />
            <Stat label="SUPER" value={formatNumber(profile.superUses)} />
            <Stat label="FINISHER" value={formatNumber(profile.finishers)} />
            <Stat label="PERFECT" value={formatNumber(profile.perfectRounds)} />
          </div>

          <div className="profile-bars">
            <ProgressBar
              value={completedMissions}
              max={totalMissions}
              label={`MISSIONI: ${completedMissions}/${totalMissions}`}
              color="#ffd166"
            />
            <div className="profile-last-played">
              Ultimo accesso:{' '}
              {profile.lastPlayed ? new Date(profile.lastPlayed).toLocaleString('it-IT') : 'mai'}
            </div>
          </div>
        </div>

        <aside className="profile-side">
          <div className="side-card">
            <span className="eyebrow">TORNEO</span>
            {profile.tournament ? (
              <>
                <p>
                  {profile.tournament.champion
                    ? 'Hai vinto il Torneo delle Virilità. Il trofeo è un PNG.'
                    : profile.tournament.eliminated
                      ? 'Sei stato eliminato. Il bracket non ha pietà.'
                      : `Round ${profile.tournament.round + 1} in corso.`}
                </p>
                <button type="button" className="text-link" onClick={onTournament}>
                  APRI IL TORNEO →
                </button>
              </>
            ) : (
              <>
                <p>Nessun torneo attivo. Il mondo aspetta un campione.</p>
                <button type="button" className="text-link" onClick={onTournament}>
                  CREA UN TORNEO →
                </button>
              </>
            )}
          </div>

          <div className="side-card">
            <span className="eyebrow">DATI</span>
            <p className="profile-data-note">
              Profilo, impostazioni e classifica sono salvati nel localStorage di questo browser. Nessun account,
              nessun cloud, nessuna scusa.
            </p>
            {!confirmReset ? (
              <NeonButton variant="danger" onClick={() => setConfirmReset(true)}>
                AZZERA PROFILO
              </NeonButton>
            ) : (
              <div className="confirm-block">
                <p>Azzerare tutto? Livello, crediti, missioni e torneo. Irreversibile.</p>
                <div className="confirm-block__actions">
                  <NeonButton
                    variant="danger"
                    onClick={() => {
                      onReset();
                      setConfirmReset(false);
                    }}
                  >
                    SÌ, AZZERA
                  </NeonButton>
                  <NeonButton variant="ghost" onClick={() => setConfirmReset(false)}>
                    ANNULLA
                  </NeonButton>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="profile-stat">
      <span>{label}</span>
      <strong style={accent ? { color: accent } : undefined}>{value}</strong>
    </div>
  );
}
