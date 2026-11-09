import type { CSSProperties } from 'react';
import { useGameStore } from '@/core/gameStore';
import { contacts } from '@/data/contacts';
import { endings, endingById } from '@/data/endings';
import { finalChoiceById } from '@/data/final';
import { formatNightTime } from '@/systems/clock';
import { Portrait } from '@/ui/Portrait';
import { formatPlayTime, cx } from '@/utils';

export function EndingScreen() {
  const game = useGameStore((state) => state.game);
  const goToMenu = useGameStore((state) => state.goToMenu);
  const newGameAgain = useGameStore((state) => state.newGameAgain);

  if (!game) {
    return (
      <main className="ending-screen">
        <button className="menu-button primary" onClick={goToMenu}>Return to the menu</button>
      </main>
    );
  }

  const endingId = game.endingId && endingById[game.endingId] ? game.endingId : 'true_survival';
  const ending = endingById[endingId] ?? endings[0];
  const endingIndex = endings.findIndex((entry) => entry.id === endingId);
  const answeredContacts = contacts.filter((contact) => game.contacts[contact.id].answered > 0);
  const finalChoice = game.finalChoice ? finalChoiceById[game.finalChoice] : null;

  return (
    <main
      className={cx('ending-screen', `ending-${endingId}`)}
      style={{ '--ending-color': ending.color } as CSSProperties}
    >
      <div className="ending-art" aria-hidden="true">
        <div className="ending-dawn" />
        <div className="ending-house">
          <div className="ending-house-window" />
          <div className="ending-house-silhouette" />
        </div>
        <div className="ending-light" />
      </div>
      <header className="ending-header">
        <span className="intro-brand">PHONE OR DIE</span>
        <span className="eyebrow">Dawn · 6:00 AM</span>
      </header>

      <article className="ending-content">
        <p className="eyebrow">Ending {endingIndex + 1} of {endings.length}</p>
        <h1 className="ending-title">{ending.title}</h1>
        <p className="ending-subtitle">{ending.subtitle}</p>
        <div className="ending-rule"><span /><i>☎</i><span /></div>
        <p className="ending-text">{ending.text}</p>
        <p className="ending-epilogue">{ending.epilogue}</p>

        <div className="ending-stats">
          <div><span>Dawn</span><strong>{formatNightTime(game.nightMinute)}</strong></div>
          <div><span>Calls answered</span><strong>{game.stats.callsAnswered}</strong></div>
          <div><span>Calls missed</span><strong>{game.stats.callsMissed}</strong></div>
          <div><span>Clues</span><strong>{game.stats.cluesFound}</strong></div>
          <div><span>Warned</span><strong>{game.stats.contactsWarned} / 9</strong></div>
          <div><span>Time</span><strong>{formatPlayTime(game.playTime)}</strong></div>
        </div>

        <section className="ending-contacts">
          <h2>The Voices</h2>
          <div className="ending-contact-grid">
            {answeredContacts.map((contact) => {
              const state = game.contacts[contact.id];
              return (
                <div key={contact.id} className="ending-contact">
                  <Portrait portrait={contact.portrait} size="xs" />
                  <div>
                    <strong>{contact.shortName}</strong>
                    <span>{state.trust}/10 trust · {state.answered} call{state.answered === 1 ? '' : 's'}</span>
                  </div>
                  <span className={cx('ending-label', state.trust >= 6 && 'is-strong')}>
                    {state.trust >= 6 ? 'Held' : 'Answered'}
                  </span>
                </div>
              );
            })}
            {!answeredContacts.length && <p className="muted">No one answered. The line was all you had.</p>}
          </div>
        </section>

        {finalChoice && (
          <p className="ending-final-choice">
            Your final choice: <strong>{finalChoice.title}</strong>
          </p>
        )}
        <p className="ending-hint">{ending.hint}</p>

        <div className="ending-actions">
          <button className="menu-button primary" onClick={goToMenu}>
            <span className="menu-button-index">01</span>
            <span><strong>Return to the Menu</strong><small>Keep the morning</small></span>
            <span className="menu-button-arrow">→</span>
          </button>
          <button className="menu-button" onClick={newGameAgain}>
            <span className="menu-button-index">02</span>
            <span><strong>Another Night</strong><small>Begin again</small></span>
            <span className="menu-button-arrow">→</span>
          </button>
        </div>
      </article>
    </main>
  );
}
