import { useGameStore } from '@/core/gameStore';
import { abilityById } from '@/data/abilities';
import { ancestryById } from '@/data/ancestries';
import { backgroundById, classById } from '@/data/classes';
import { SKILL_ATTRIBUTE } from '@/systems/checks';
import {
  armorClass,
  attackBonus,
  effectiveAttributes,
  initiativeBonus,
  maxHp,
  maxResource,
  proficiencyBonus,
  subclassFor,
  weaponDamage,
  xpToNext
} from '@/systems/character';
import { companionById } from '@/data/companions';
import { questById } from '@/data/quests';
import { itemById } from '@/data/items';
import { Portrait } from '@/ui/Portrait';
import { ModalShell } from './ModalShell';
import { signed } from '@/utils';
import type { AttributeKey } from '@/core/types';

const ATTRS: AttributeKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ATTR_LABEL: Record<AttributeKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
};

export function CharacterModal() {
  const game = useGameStore((state) => state.game);
  const selectedCharacterId = useGameStore((state) => state.selectedCharacterId);
  const setSelectedCharacter = useGameStore((state) => state.setSelectedCharacter);
  const closeModal = useGameStore((state) => state.closeModal);
  const openModal = useGameStore((state) => state.openModal);
  if (!game) return null;

  const character = game.characters[selectedCharacterId ?? game.playerId] ?? game.characters[game.playerId];
  if (!character) return null;

  const attrs = effectiveAttributes(character);
  const next = xpToNext(character.xp, character.level);
  const companion = character.companionId ? companionById[character.companionId] : null;
  const quest = companion ? questById[companion.questId] : null;
  const questState = companion ? game.quests[companion.questId] : null;
  const party = game.party.map((id) => game.characters[id]).filter(Boolean);
  const subclass = subclassFor(character);

  return (
    <ModalShell title="Character Sheet" kicker="The Shape of a Soul" onClose={closeModal} size="xl">
      <div className="sheet-layout">
        <aside className="sheet-portrait">
          <div className="sheet-portrait-frame">
            <Portrait appearance={character.portrait} size="hero" />
          </div>
          <h2>{character.name}</h2>
          <p className="sheet-class">
            Level {character.level} {classById[character.classId]?.name ?? character.classId}
          </p>
          <p className="sheet-origin">
            {ancestryById[character.ancestry]?.name ?? character.ancestry} · {backgroundById[character.background]?.name ?? character.background}
          </p>
          <div className="sheet-subclass">
            {subclass ? (
              <>
                <span className="tag tag-gold">{subclass.name}</span>
                <p>{subclass.epithet}</p>
                <small>{subclass.trait}</small>
              </>
            ) : character.level >= 3 ? (
              <>
                <span className="tag tag-muted">Specialization available</span>
                <button
                  className="btn btn-small btn-primary"
                  onClick={() => openModal('subclass', character.id)}
                >
                  Choose a specialization
                </button>
              </>
            ) : (
              <small className="muted">Specialization unlocks at level 3.</small>
            )}
          </div>
          {companion && (
            <div className="sheet-companion">
              <span className="tag tag-gold">{companion.title}</span>
              <p>{companion.personality}</p>
              {quest && (
                <div className="sheet-quest">
                  <strong>{quest.title}</strong>
                  <span>{questState?.status === 'completed' ? 'Complete' : 'In progress'}</span>
                </div>
              )}
            </div>
          )}
          <div className="sheet-xp">
            <div>
              <span>Experience</span>
              <strong>{character.xp}</strong>
            </div>
            {next !== null ? <small>{next} to level {character.level + 1}</small> : <small>Level 8 — the road’s end.</small>}
          </div>
          {party.length > 1 && (
            <div className="sheet-switcher">
              {party.map((member) => (
                <button
                  key={member.id}
                  className={member.id === character.id ? 'is-active' : ''}
                  onClick={() => setSelectedCharacter(member.id)}
                  title={member.name}
                >
                  <Portrait appearance={member.portrait} size="xs" />
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="sheet-main">
          <section className="sheet-section">
            <h3>Vitals</h3>
            <div className="stat-grid">
              <div><span>Health</span><strong>{character.hp} / {maxHp(character)}</strong></div>
              <div><span>Resource</span><strong>{character.resource} / {maxResource(character)}</strong></div>
              <div><span>Armor Class</span><strong>{armorClass(character)}</strong></div>
              <div><span>Attack</span><strong>{signed(attackBonus(character))}</strong></div>
              <div><span>Initiative</span><strong>{signed(initiativeBonus(character))}</strong></div>
              <div><span>Weapon</span><strong>{weaponDamage(character)}</strong></div>
            </div>
          </section>

          <section className="sheet-section">
            <h3>Attributes</h3>
            <div className="sheet-attributes">
              {ATTRS.map((key) => {
                const mod = Math.floor((attrs[key] - 10) / 2);
                return (
                  <div key={key} className="sheet-attribute">
                    <span>{ATTR_LABEL[key]}</span>
                    <strong>{attrs[key]}</strong>
                    <small className={mod >= 0 ? 'is-positive' : 'is-negative'}>{signed(mod)}</small>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="sheet-section">
            <h3>Proficiencies</h3>
            <div className="skill-grid">
              {Object.entries(SKILL_ATTRIBUTE).map(([skill, attr]) => {
                const proficient = character.proficiencies.includes(skill);
                const bonus = Math.floor((attrs[attr] - 10) / 2) + proficiencyBonus(character, skill);
                return (
                  <div key={skill} className={proficient ? 'is-proficient' : ''}>
                    <span className="skill-dot" />
                    <span>{skill}</span>
                    <strong>{signed(bonus)}</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="sheet-section">
            <h3>Equipment</h3>
            <div className="sheet-equipment">
              {Object.entries(character.equipment).map(([slot, itemId]) => (
                <div key={slot}>
                  <span>{slot}</span>
                  <strong>{itemId ? itemById[itemId]?.name ?? itemId.replace(/_/g, ' ') : 'empty'}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="sheet-section">
            <h3>Abilities</h3>
            <div className="sheet-abilities">
              {character.abilities.map((id) => {
                const ability = abilityById[id];
                if (!ability) return null;
                return (
                  <article key={id} className="sheet-ability">
                    <span className="ability-icon">{ability.icon}</span>
                    <div>
                      <div className="ability-head">
                        <strong>{ability.name}</strong>
                        <span className="ability-costs">
                          {ability.apCost} AP {ability.resourceCost ? `· ${ability.resourceCost} res` : ''}
                        </span>
                      </div>
                      <p>{ability.description}</p>
                      <div className="ability-tags">
                        {ability.damageType && <span className="tag tag-muted">{ability.damageType}</span>}
                        {ability.dice && <span className="tag tag-muted">{ability.dice}</span>}
                        {ability.range > 0 && <span className="tag tag-muted">range {ability.range}</span>}
                        {ability.cooldown ? <span className="tag tag-muted">cooldown {ability.cooldown}</span> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </ModalShell>
  );
}
