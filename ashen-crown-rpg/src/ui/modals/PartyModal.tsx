import { useGameStore } from '@/core/gameStore';
import { companionById } from '@/data/companions';
import { classById } from '@/data/classes';
import { subclassById } from '@/data/subclasses';
import { questById } from '@/data/quests';
import { companionTalkIds } from '@/data/dialogues';
import { maxHp, maxResource } from '@/systems/character';
import { Portrait } from '@/ui/Portrait';
import { ModalShell } from './ModalShell';
import { cx, percent, shortName } from '@/utils';

const approvalLabel = (approval: number): string => {
  if (approval >= 60) return 'Devoted';
  if (approval >= 30) return 'Friendly';
  if (approval >= 10) return 'Warm';
  if (approval > -10) return 'Neutral';
  if (approval > -35) return 'Wary';
  return 'Hostile';
};

export function PartyModal() {
  const game = useGameStore((state) => state.game);
  const closeModal = useGameStore((state) => state.closeModal);
  const toggleParty = useGameStore((state) => state.toggleParty);
  const talkToCompanion = useGameStore((state) => state.talkToCompanion);
  const openModal = useGameStore((state) => state.openModal);
  const setSelectedCharacter = useGameStore((state) => state.setSelectedCharacter);
  if (!game) return null;

  const player = game.characters[game.playerId];
  const recruited = Object.values(game.characters)
    .filter((character) => character.recruited && !character.isPlayer)
    .sort((a, b) => (game.party.includes(a.id) ? -1 : 0) - (game.party.includes(b.id) ? -1 : 0));
  const active = game.party.map((id) => game.characters[id]).filter(Boolean);

  return (
    <ModalShell
      title="The Company"
      kicker="Those Who Walk With You"
      onClose={closeModal}
      size="xl"
      footer={
        <div className="party-footer">
          <span>{active.length} / 4 active</span>
          <span className="muted">Companions in reserve can be swapped freely outside combat.</span>
        </div>
      }
    >
      <div className="party-roster-head">
        <div className="active-party-strip">
          {[0, 1, 2, 3].map((index) => {
            const member = active[index];
            return (
              <div key={index} className={cx('active-slot', !member && 'is-empty')}>
                {member ? (
                  <>
                    <Portrait appearance={member.portrait} size="xs" />
                    <span>{shortName(member.name)}</span>
                  </>
                ) : (
                  <span>Open</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="muted small">
          Approval is not affection. It is the distance between what they expected of you and what you did.
        </p>
      </div>

      <div className="roster-grid">
        <article className="roster-card roster-player">
          <Portrait appearance={player.portrait} size="md" />
          <div className="roster-info">
            <div className="roster-tags">
              <span className="tag tag-gold">Protagonist</span>
              {player.subclass && (
                <span className="tag tag-muted">{subclassById[player.subclass]?.name ?? player.subclass}</span>
              )}
            </div>
            <h3>{player.name}</h3>
            <p>{classById[player.classId]?.name ?? player.classId} · Level {player.level}</p>
            <div className="roster-bars">
              <span>HP {player.hp}/{maxHp(player)}</span>
              <span>Resource {player.resource}/{maxResource(player)}</span>
              <span>Gold {player.gold ?? 0}</span>
            </div>
            <button
              className="btn btn-small btn-outline"
              onClick={() => {
                setSelectedCharacter(player.id);
                openModal('character', player.id);
              }}
            >
              View sheet
            </button>
          </div>
        </article>

        {recruited.map((companion) => {
          const def = companion.companionId ? companionById[companion.companionId] : null;
          const quest = def ? questById[def.questId] : null;
          const questState = def ? game.quests[def.questId] : null;
          const inParty = game.party.includes(companion.id);
          const approvalPercent = (companion.approval + 100) / 2;
          return (
            <article key={companion.id} className={cx('roster-card', inParty && 'is-active-party')}>
              <Portrait appearance={companion.portrait} size="md" />
              <div className="roster-info">
                <div className="roster-tags">
                  <span className={cx('tag', inParty ? 'tag-success' : 'tag-muted')}>
                    {inParty ? 'Active' : 'Reserve'}
                  </span>
                  {def && <span className="tag tag-muted">{def.title}</span>}
                  {companion.subclass && (
                    <span className="tag tag-muted">{subclassById[companion.subclass]?.name ?? companion.subclass}</span>
                  )}
                </div>
                <h3>{companion.name}</h3>
                <p>{classById[companion.classId]?.name ?? companion.classId} · Level {companion.level}</p>
                <div className="roster-bars">
                  <span>HP {companion.hp}/{maxHp(companion)}</span>
                  <span>Resource {companion.resource}/{maxResource(companion)}</span>
                </div>
                <div className="approval-row">
                  <span>Approval</span>
                  <div className="approval-meter">
                    <span style={{ width: `${percent(approvalPercent, 100)}%` }} />
                  </div>
                  <small>{approvalLabel(companion.approval)}</small>
                </div>
                {quest && (
                  <div className="companion-quest">
                    <span className={cx('quest-dot', questState?.status === 'completed' && 'is-complete')} />
                    <span>{quest.title}</span>
                    <small>{questState?.status === 'completed' ? 'Complete' : questState ? 'In progress' : 'Not begun'}</small>
                  </div>
                )}
                <div className="roster-actions">
                  <button
                    className="btn btn-small btn-outline"
                    onClick={() => {
                      setSelectedCharacter(companion.id);
                      openModal('character', companion.id);
                    }}
                  >
                    Sheet
                  </button>
                  <button
                    className="btn btn-small btn-outline"
                    onClick={() => toggleParty(companion.id)}
                    disabled={!inParty && game.party.length >= 4}
                  >
                    {inParty ? 'Reserve' : 'Add'}
                  </button>
                  {companionTalkIds[companion.id] && (
                    <button className="btn btn-small btn-primary" onClick={() => talkToCompanion(companion.id)}>
                      Talk
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!recruited.length && (
        <p className="muted empty-note">
          You walk alone. Kaelen waits in the Fallen Bastion; others are scattered across Greymoor and the woods.
        </p>
      )}
    </ModalShell>
  );
}
