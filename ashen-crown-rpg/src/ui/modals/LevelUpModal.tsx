import { useGameStore } from '@/core/gameStore';
import { classById } from '@/data/classes';
import { ModalShell } from './ModalShell';

export function LevelUpModal() {
  const notes = useGameStore((state) => state.levelUpNotes);
  const game = useGameStore((state) => state.game);
  const closeModal = useGameStore((state) => state.closeModal);
  const openModal = useGameStore((state) => state.openModal);
  const player = game?.characters[game.playerId];

  return (
    <ModalShell title="The Road Hardens You" kicker="Level Up" onClose={closeModal} size="sm">
      <div className="levelup-panel">
        <div className="levelup-sigil">✦</div>
        <p className="levelup-lead">
          The world has asked more of you, and you have answered. Your place in the story grows heavier.
        </p>
        <div className="levelup-notes">
          {notes.length ? notes.map((note) => <p key={note}>{note}</p>) : <p>The party grows stronger.</p>}
        </div>
        {player && (
          <div className="levelup-stats">
            <div><span>Level</span><strong>{player.level}</strong></div>
            <div><span>Class</span><strong>{classById[player.classId]?.name ?? player.classId}</strong></div>
            <div><span>Abilities</span><strong>{player.abilities.length}</strong></div>
            <div><span>Proficiency</span><strong>+{2 + Math.floor((player.level - 1) / 4)}</strong></div>
          </div>
        )}
        <p className="muted small">
          New abilities appear automatically in your character sheet and combat bar. Attribute increases are applied at
          levels 4, 6, and 8.
        </p>
        {player && player.level >= 3 && !player.subclass && (
          <button className="btn btn-primary" onClick={() => openModal('subclass', player.id)}>
            Choose your specialization ✦
          </button>
        )}
        <button className={player && player.level >= 3 && !player.subclass ? 'btn btn-outline' : 'btn btn-primary'} onClick={closeModal}>
          Continue
        </button>
      </div>
    </ModalShell>
  );
}
