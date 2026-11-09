import { useGameStore } from '@/core/gameStore';
import { finalChoices } from '@/data/final';
import { contacts } from '@/data/contacts';
import { formatNightTime } from '@/systems/clock';
import { cx } from '@/utils';

export function FinalChoiceModal() {
  const open = useGameStore((state) => state.finalOpen);
  const game = useGameStore((state) => state.game);
  const choose = useGameStore((state) => state.chooseFinal);
  if (!open || !game || game.finalPhase) return null;
  const trusted = contacts.filter((contact) => game.contacts[contact.id].trust >= 6).length;

  return (
    <div className="final-layer">
      <section className="final-card">
        <p className="eyebrow">5:30 AM · The last call</p>
        <h1>Choose how the night ends.</h1>
        <p className="final-lead">
          The street is quiet in the way a held breath is quiet. The porch light is on. You have until 6:00 AM.
          Whatever you choose now, the next half hour will decide who remembers you.
        </p>
        <div className="final-stats">
          <span>{formatNightTime(game.nightMinute)}</span>
          <span>{Math.round(game.threat)}% threat</span>
          <span>{game.clues.length} clues</span>
          <span>{trusted} trusted voices</span>
          <span>{Math.round(game.battery)}% battery</span>
        </div>
        <div className="final-options">
          {finalChoices.map((choice) => {
            const lockedByFlag = choice.requiresFlag && !game.flags[choice.requiresFlag];
            const lockedByClues = choice.requiresClues && game.clues.length < choice.requiresClues;
            const locked = Boolean(lockedByFlag || lockedByClues);
            return (
              <button
                key={choice.id}
                className={cx('final-option', choice.id === 'accept' && 'secret', locked && 'locked')}
                disabled={Boolean(locked)}
                onClick={() => choose(choice.id)}
              >
                <span className="final-option-id">{choice.id === 'accept' ? '??' : String(finalChoices.indexOf(choice) + 1).padStart(2, '0')}</span>
                <span className="final-option-main">
                  <strong>{choice.title}</strong>
                  <p>{choice.description}</p>
                  <small>{locked ? (lockedByFlag ? 'The number is not in your contacts.' : `Requires ${choice.requiresClues} clues.`) : choice.risk}</small>
                </span>
                <span className="final-option-arrow">→</span>
              </button>
            );
          })}
        </div>
        <p className="final-footnote">This choice cannot be undone. The final phase is a survival challenge.</p>
      </section>
    </div>
  );
}
