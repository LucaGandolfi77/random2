import { useGameStore } from '@/core/gameStore';
import { abilityById } from '@/data/abilities';
import { classById } from '@/data/classes';
import { subclassById, subclassesForClass } from '@/data/subclasses';
import { maxHp, maxResource, armorClass, attackBonus, initiativeBonus } from '@/systems/character';
import { ModalShell } from './ModalShell';
import { Portrait } from '@/ui/Portrait';
import { cx } from '@/utils';

export function SubclassModal() {
  const game = useGameStore((state) => state.game);
  const selectedCharacterId = useGameStore((state) => state.selectedCharacterId);
  const closeModal = useGameStore((state) => state.closeModal);
  const chooseSubclass = useGameStore((state) => state.chooseSubclass);
  if (!game) return null;

  const character = game.characters[selectedCharacterId ?? game.playerId] ?? game.characters[game.playerId];
  if (!character) return null;
  const options = subclassesForClass(character.classId);
  const chosen = character.subclass ? subclassById[character.subclass] : null;
  const levelLocked = character.level < 3;

  return (
    <ModalShell
      title={chosen ? chosen.name : 'Choose a Specialization'}
      kicker={chosen ? `${character.name} · ${chosen.epithet}` : `${character.name} · Level 3 Choice`}
      onClose={closeModal}
      size="lg"
      footer={
        <div className="subclass-footer">
          <span>{classById[character.classId]?.name} · Level {character.level}</span>
          <span className="muted">
            {chosen ? 'This path is set.' : levelLocked ? 'Specializations unlock at level 3.' : 'This choice is permanent.'}
          </span>
        </div>
      }
    >
      <div className="subclass-layout">
        <aside className="subclass-character">
          <Portrait appearance={character.portrait} size="md" />
          <strong>{character.name}</strong>
          <span>{classById[character.classId]?.name}</span>
          <div className="subclass-vitals">
            <span>HP {character.hp}/{maxHp(character)}</span>
            <span>Res {character.resource}/{maxResource(character)}</span>
            <span>AC {armorClass(character)}</span>
            <span>ATK +{attackBonus(character)}</span>
            <span>INIT +{initiativeBonus(character)}</span>
          </div>
        </aside>

        <div className="subclass-options">
          {options.map((option) => {
            const ability = abilityById[option.abilityId];
            const isChosen = chosen?.id === option.id;
            return (
              <article key={option.id} className={cx('subclass-card', isChosen && 'is-chosen')}>
                <div className="subclass-card-head">
                  <div>
                    <span className="tag tag-muted">{option.epithet}</span>
                    <h3>{option.name}</h3>
                  </div>
                  <span className="subclass-ability-icon">{ability?.icon ?? '✦'}</span>
                </div>
                <p>{option.description}</p>
                <div className="subclass-trait">
                  <span className="field-label">Path trait</span>
                  <p>{option.trait}</p>
                </div>
                <div className="subclass-bonuses">
                  {option.bonuses.hp ? <span>+{option.bonuses.hp} max HP</span> : null}
                  {option.bonuses.ac ? <span>+{option.bonuses.ac} AC</span> : null}
                  {option.bonuses.attack ? <span>+{option.bonuses.attack} attack</span> : null}
                  {option.bonuses.resource ? <span>+{option.bonuses.resource} resource</span> : null}
                  {option.bonuses.initiative ? <span>+{option.bonuses.initiative} initiative</span> : null}
                </div>
                {ability && (
                  <div className="subclass-ability">
                    <span className="ability-icon">{ability.icon}</span>
                    <div>
                      <strong>{ability.name}</strong>
                      <p>{ability.description}</p>
                      <span className="muted small">
                        {ability.apCost} AP · {ability.resourceCost} resource
                        {ability.range ? ` · range ${ability.range}` : ''}
                        {ability.cooldown ? ` · cooldown ${ability.cooldown}` : ''}
                      </span>
                    </div>
                  </div>
                )}
                {chosen ? (
                  <span className={cx('tag', isChosen ? 'tag-success' : 'tag-muted')}>
                    {isChosen ? 'Current specialization' : 'Not chosen'}
                  </span>
                ) : (
                  <button
                    className="btn btn-small btn-primary"
                    disabled={levelLocked}
                    onClick={() => chooseSubclass(character.id, option.id)}
                  >
                    {levelLocked ? 'Requires level 3' : 'Choose this path'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
