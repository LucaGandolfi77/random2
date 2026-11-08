import { FIGHTERS } from '../data/fighters';
import type { Profile } from '../utils/storage';
import { levelProgress } from '../utils/storage';
import type { Screen } from '../app/types';
import { formatNumber, ProgressBar } from './ui';

interface MenuItem {
  id: Screen | 'quick' | 'training' | 'tournament' | 'team' | 'rumble';
  label: string;
  description: string;
  tag?: string;
  accent?: string;
}

const MENU: MenuItem[] = [
  {
    id: 'quick',
    label: 'COMBATTIMENTO RAPIDO',
    description: 'Uno contro uno. Nessuna scusa. Solo clip.',
    tag: '1P / 2P',
    accent: '#ff2e63'
  },
  {
    id: 'training',
    label: 'ALLENAMENTO',
    description: 'Il dummy non giudica. Il dummy non perdona.',
    accent: '#08d9d6'
  },
  {
    id: 'tournament',
    label: 'TORNEO DELLE VIRALITÀ',
    description: 'Otto combattenti, un solo algoritmo vincitore.',
    tag: 'BRACKET',
    accent: '#ffd166'
  },
  {
    id: 'team',
    label: 'BATTAGLIA A SQUADRE',
    description: 'Due contro due. Il tuo partner è sempre in ritardo.',
    tag: '2V2',
    accent: '#b14cff'
  },
  {
    id: 'rumble',
    label: 'ROYAL RUMBLE',
    description: 'Quattro fighter, una sola visualizzazione.',
    tag: '4P',
    accent: '#ff7b00'
  },
  {
    id: 'online',
    label: 'ONLINE',
    description: 'Sfida il mondo. O almeno il server locale.',
    tag: 'RANKED',
    accent: '#00ff9d'
  }
];

const SECONDARY: { id: Screen; label: string }[] = [
  { id: 'missions', label: 'MISSIONI' },
  { id: 'profile', label: 'PROFILO' },
  { id: 'leaderboard', label: 'CLASSIFICA' },
  { id: 'settings', label: 'IMPOSTAZIONI' },
  { id: 'credits', label: 'CREDITI' }
];

export interface MainMenuProps {
  profile: Profile;
  onNavigate: (screen: Screen) => void;
}

export function MainMenu({ profile, onNavigate }: MainMenuProps) {
  const level = levelProgress(profile.xp).level;
  const progress = levelProgress(profile.xp);
  const winRate = profile.matches > 0 ? Math.round((profile.wins / profile.matches) * 100) : 0;

  return (
    <div className="screen main-menu">
      <div className="main-menu__bg" aria-hidden="true">
        <div className="main-menu__orb main-menu__orb--a" />
        <div className="main-menu__orb main-menu__orb--b" />
        <div className="main-menu__orb main-menu__orb--c" />
        <div className="main-menu__grid" />
      </div>

      <header className="main-menu__header">
        <div className="brand">
          <span className="brand__kicker">THE LAST VIRALITY</span>
          <h1 className="brand__title">
            HYPE<span>K.O.</span>
          </h1>
          <p className="brand__sub">Il fighting game che scade mentre lo giochi.</p>
        </div>
        <div className="profile-chip" onClick={() => onNavigate('profile')} role="button" tabIndex={0}>
          <div className="profile-chip__avatar">{profile.name.charAt(0)}</div>
          <div className="profile-chip__info">
            <strong>{profile.name}</strong>
            <span>
              LV {level} · {formatNumber(profile.credits)} crediti
            </span>
            <div className="profile-chip__xp">
              <div style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
            </div>
          </div>
        </div>
      </header>

      <main className="main-menu__body">
        <div className="main-menu__modes">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className="mode-button"
              style={{ '--mode-accent': item.accent ?? '#ff2e63' } as React.CSSProperties}
              onClick={() => onNavigate(item.id as Screen)}
            >
              <span className="mode-button__index">{String(MENU.indexOf(item) + 1).padStart(2, '0')}</span>
              <span className="mode-button__text">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              {item.tag && <span className="mode-button__tag">{item.tag}</span>}
              <span className="mode-button__arrow">→</span>
            </button>
          ))}
        </div>

        <aside className="main-menu__side">
          <div className="side-card side-card--profile">
            <span className="eyebrow">CARRIERA</span>
            <div className="side-card__stats">
              <div>
                <strong>{profile.matches}</strong>
                <span>MATCH</span>
              </div>
              <div>
                <strong>{winRate}%</strong>
                <span>WIN RATE</span>
              </div>
              <div>
                <strong>{profile.streak}</strong>
                <span>STREAK</span>
              </div>
            </div>
            <ProgressBar value={Math.round(progress.ratio * 100)} max={100} label={`LIVELLO ${level}`} />
            <p className="side-card__hint">
              {profile.matches === 0
                ? 'Nessun match. Il mondo non sa ancora chi sei.'
                : profile.streak >= 3
                  ? 'Sei in serie. Qualcuno ti sta unfollowando per invidia.'
                  : 'La classifica non si scala da sola.'}
            </p>
            <button type="button" className="text-link" onClick={() => onNavigate('profile')}>
              APRI IL PROFILO →
            </button>
          </div>

          <div className="side-card side-card--roster">
            <span className="eyebrow">ROSTER</span>
            <div className="roster-ticker">
              {FIGHTERS.map((fighter) => (
                <span key={fighter.id} style={{ color: fighter.palette.accent }}>
                  {fighter.name}
                </span>
              ))}
            </div>
            <span className="side-card__micro">16 fighter · 8 arene · 1 algoritmo</span>
          </div>

          <div className="side-card side-card--missions">
            <span className="eyebrow">PROSSIMA MISSIONE</span>
            {Object.keys(profile.missions).length === 0 ? (
              <p>Le missioni ti aspettano. Sono facili. Mentire.</p>
            ) : (
              <p>{Object.keys(profile.missions).length} missioni iniziate. Vai a finirle.</p>
            )}
            <button type="button" className="text-link" onClick={() => onNavigate('missions')}>
              VEDI MISSIONI →
            </button>
          </div>
        </aside>
      </main>

      <footer className="main-menu__footer">
        <div className="main-menu__secondary">
          {SECONDARY.map((item) => (
            <button key={item.id} type="button" onClick={() => onNavigate(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <span className="main-menu__legal">
          HYPE K.O. v1.0 — personaggi, arene e brand sono fittizi. Ogni somiglianza è una strategia di marketing.
        </span>
      </footer>
    </div>
  );
}
