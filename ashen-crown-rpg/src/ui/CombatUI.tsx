import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/core/gameStore';
import { abilityById } from '@/data/abilities';
import { classById } from '@/data/classes';
import { itemById } from '@/data/items';
import { statusById } from '@/data/statuses';
import { encounterById } from '@/data/encounters';
import { abilityUsable, currentUnit } from '@/systems/combat';
import { Portrait } from '@/ui/Portrait';
import { cx, percent, shortName } from '@/utils';


function InitiativeRail() {
  const combat = useGameStore((state) => state.combat);
  if (!combat) return null;
  const current = currentUnit(combat);
  const units = combat.order
    .map((id) => combat.units.find((unit) => unit.id === id))
    .filter(Boolean)
    .filter((unit) => !unit!.downed || unit!.side === 'party');

  return (
    <div className="initiative-rail" aria-label="Initiative order">
      {units.map((unit) => {
        if (!unit) return null;
        const isCurrent = current?.id === unit.id;
        return (
          <div
            key={unit.id}
            className={cx(
              'initiative-chip',
              unit.side === 'enemy' && 'is-enemy',
              isCurrent && 'is-current',
              unit.downed && 'is-downed'
            )}
          >
            <span className="initiative-icon">{unit.icon || (unit.side === 'party' ? '◆' : '☠')}</span>
            <div className="initiative-info">
              <span>{shortName(unit.name)}</span>
              <div className="initiative-bar">
                <span style={{ width: `${percent(unit.hp, unit.maxHp)}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CombatLog() {
  const combat = useGameStore((state) => state.combat);
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 700);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && open) ref.current.scrollTop = ref.current.scrollHeight;
  }, [combat?.log.length, open]);
  if (!combat) return null;
  return (
    <aside className={cx('combat-log-panel', !open && 'is-collapsed')}>
      <button className="combat-log-head" onClick={() => setOpen((value) => !value)}>
        <span>Chronicle of Battle</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="combat-log" ref={ref}>
          {combat.log.slice(-70).map((entry) => (
            <p key={entry.id} className={cx('log-line', `log-${entry.kind}`)}>
              {entry.text}
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}

function AbilityBar() {
  const combat = useGameStore((state) => state.combat);
  const game = useGameStore((state) => state.game);
  const selectAbility = useGameStore((state) => state.selectCombatAbility);
  const selectAction = useGameStore((state) => state.selectCombatAction);
  const runAction = useGameStore((state) => state.combatAction);
  const consumeItem = useGameStore((state) => state.combatConsumeItem);
  const endTurn = useGameStore((state) => state.combatEndTurn);
  const [showItems, setShowItems] = useState(false);
  if (!combat || !game) return null;
  const unit = currentUnit(combat);
  const isParty = unit?.side === 'party';
  const abilities = isParty
    ? unit.abilities.map((id) => abilityById[id]).filter(Boolean)
    : [];
  const consumables = game.inventory
    .map((stack) => ({ ...stack, item: itemById[stack.itemId] }))
    .filter((entry) => entry.item && ['potion', 'scroll'].includes(entry.item.category));
  const selected = combat.selectedAbility ? abilityById[combat.selectedAbility] : null;
  const selectedAction = combat.selectedAction ?? null;
  const character = unit?.charId ? game.characters[unit.charId] : null;
  const canAct = Boolean(isParty && !combat.waitingForAi && combat.phase === 'active');
  const hasAp = (unit?.ap ?? 0) >= 1;

  return (
    <div className="combat-toolbar-wrap">
      <div className="combat-hint-row">
        {combat.waitingForAi ? (
          <span className="combat-hint is-thinking">The enemy is deciding…</span>
        ) : selected ? (
          <span className="combat-hint">
            <strong>{selected.name}</strong> — choose a target{selected.radius ? ' (area)' : ''}.{' '}
            <button className="text-btn tiny" onClick={() => selectAbility(null)}>cancel</button>
          </span>
        ) : selectedAction ? (
          <span className="combat-hint">
            <strong>{selectedAction === 'shove' ? 'Shove' : 'Help'}</strong> — choose an adjacent{' '}
            {selectedAction === 'shove' ? 'enemy' : 'ally'}.{' '}
            <button className="text-btn tiny" onClick={() => selectAction(null)}>cancel</button>
          </span>
        ) : (
          <span className="combat-hint">Click a reachable tile to move, or an enemy to attack.</span>
        )}
      </div>
      <div className="combat-toolbar">
        <div className="combat-unit-card">
          {character ? (
            <>
              <Portrait appearance={character.portrait} size="xs" />
              <div>
                <strong>{unit!.name}</strong>
                <span>Level {character.level} {classById[character.classId]?.name ?? character.classId}</span>
                <div className="combat-bars">
                  <div className="combat-bar">
                    <span style={{ width: `${percent(unit!.hp, unit!.maxHp)}%` }} />
                  </div>
                  <small>{Math.max(0, Math.round(unit!.hp))}/{unit!.maxHp}</small>
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="combat-enemy-icon">{unit?.icon ?? '☠'}</span>
              <div>
                <strong>{unit?.name ?? 'Enemy'}</strong>
                <span>{unit?.role ?? 'enemy'} · AC {unit?.ac ?? '?'}</span>
              </div>
            </>
          )}
        </div>

        <div className="combat-actions">
          <div className="ap-row">
            <span className="ap-label">AP</span>
            {Array.from({ length: unit?.maxAp ?? 3 }, (_, index) => (
              <span key={index} className={cx('ap-pip', index < (unit?.ap ?? 0) && 'is-filled')} />
            ))}
            <span className="resource-chip" title={`${character ? 'Class resource' : 'Enemy resource'}`}>
              {unit?.resource ?? 0}/{unit?.maxResource ?? 0} {unit?.side === 'party' ? 'resource' : ''}
            </span>
            <span className="movement-chip">{unit?.movement ?? 0} move</span>
          </div>

          {isParty ? (
            <>
            <div className="combat-action-row">
              <span className="action-row-label">Actions</span>
              <button
                className="combat-action-button"
                disabled={!canAct || !hasAp}
                onClick={() => runAction('dash')}
                title="Spend 1 AP to gain movement equal to your speed."
              >
                <span>⇢</span> Dash <small>1 AP</small>
              </button>
              <button
                className="combat-action-button"
                disabled={!canAct || !hasAp}
                onClick={() => runAction('disengage')}
                title="Spend 1 AP. Your movement will not provoke opportunity attacks this turn."
              >
                <span>↯</span> Disengage <small>1 AP</small>
              </button>
              <button
                className={cx('combat-action-button', selectedAction === 'shove' && 'is-active')}
                disabled={!canAct || !hasAp}
                onClick={() => selectAction(selectedAction === 'shove' ? null : 'shove')}
                title="Spend 1 AP. Contested shove: push an adjacent enemy one tile or Stun them against an obstacle."
              >
                <span>⇧</span> Shove <small>1 AP</small>
              </button>
              <button
                className={cx('combat-action-button', selectedAction === 'help' && 'is-active')}
                disabled={!canAct || !hasAp}
                onClick={() => selectAction(selectedAction === 'help' ? null : 'help')}
                title="Spend 1 AP. Grant Blessed to an adjacent ally, or stabilise a downed one."
              >
                <span>✚</span> Help <small>1 AP</small>
              </button>
            </div>

            <div className="ability-row">
              <button
                className={cx('ability-button ability-basic', !combat.selectedAbility && !selectedAction && 'is-active')}
                onClick={() => {
                  selectAbility(null);
                  selectAction(null);
                }}
                title="Basic attack: click an enemy"
              >
                <span className="ability-icon">⚔</span>
                <span className="ability-name">Attack</span>
                <span className="ability-cost">1 AP</span>
              </button>
              {abilities.map((ability, index) => {
                const usable = unit ? abilityUsable(combat, unit, ability.id) : false;
                return (
                  <button
                    key={ability.id}
                    className={cx(
                      'ability-button',
                      combat.selectedAbility === ability.id && 'is-active',
                      !usable && 'is-disabled'
                    )}
                    disabled={!usable || !isParty}
                    onClick={() => selectAbility(combat.selectedAbility === ability.id ? null : ability.id)}
                    title={`${ability.description}\n${ability.apCost} AP · ${ability.resourceCost} resource · range ${ability.range}`}
                  >
                    <span className="ability-icon">{ability.icon}</span>
                    <span className="ability-name">{ability.name}</span>
                    <span className="ability-cost">
                      {ability.apCost} AP{ability.resourceCost ? ` · ${ability.resourceCost}` : ''}
                    </span>
                    <span className="ability-key">{index + 1}</span>
                  </button>
                );
              })}
              <button className="ability-button ability-items" onClick={() => setShowItems((value) => !value)}>
                <span className="ability-icon">⚗</span>
                <span className="ability-name">Items</span>
                <span className="ability-cost">{consumables.length}</span>
              </button>
            </div>
            {showItems && (
              <div className="combat-items-popover">
                {consumables.map(({ item, quantity }) => (
                  <button
                    key={item.id}
                    className="combat-item"
                    onClick={() => {
                      consumeItem(item.id);
                      setShowItems(false);
                    }}
                    disabled={combat.waitingForAi || combat.phase !== 'active'}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    <small>×{quantity}</small>
                  </button>
                ))}
                {!consumables.length && <span className="muted small">No consumables.</span>}
              </div>
            )}
            {selected && (
              <div className="selected-ability-info">
                <span className="ability-icon">{selected.icon}</span>
                <div>
                  <strong>{selected.name}</strong>
                  <p>{selected.description}</p>
                  <span className="muted small">
                    {selected.target} · {selected.apCost} AP · {selected.resourceCost} resource
                    {selected.dice ? ` · ${selected.dice}` : ''}
                    {selected.damageType ? ` ${selected.damageType}` : ''}
                    {selected.status ? ` · ${statusById[selected.status]?.name ?? selected.status}` : ''}
                  </span>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="enemy-turn-panel">
              <span className="enemy-turn-mark">◌</span>
              <span>The enemy is taking their turn.</span>
            </div>
          )}
        </div>

        <button className="end-turn-button" onClick={endTurn} disabled={!isParty || combat.waitingForAi}>
          <span>End Turn</span>
          <small>Space</small>
        </button>
      </div>
    </div>
  );
}

export function CombatUI() {
  const combat = useGameStore((state) => state.combat);
  const game = useGameStore((state) => state.game);
  if (!combat || !game) return null;
  const current = currentUnit(combat);
  const round = combat.round;
  const objective = encounterById[combat.encounterId]?.objective ?? combat.objective;

  return (
    <>
      <div className="combat-top">
        <div className="combat-turn-banner">
          <span className="combat-round">Round {round}</span>
          <span className="combat-turn-name">
            {combat.phase === 'active' ? (current?.side === 'party' ? current.name : current?.name ?? '…') : 'Battle ended'}
          </span>
          {current?.bossPhase && <span className="tag tag-danger">Phase {current.bossPhase}</span>}
        </div>
        <InitiativeRail />
        <div className="combat-objective">
          <span className="section-kicker">Objective</span>
          <p>{objective}</p>
        </div>
      </div>
      <CombatLog />
      <AbilityBar />
      {combat.units.some((unit) => unit.side === 'party' && unit.downed) && (
        <div className="downed-warning">
          An ally is down. A cleric's Call Back the Lost can revive them; otherwise rest or heal afterward.
        </div>
      )}
    </>
  );
}

export function CombatResultOverlay() {
  const combat = useGameStore((state) => state.combat);
  const result = useGameStore((state) => state.combatResult);
  const closeCombat = useGameStore((state) => state.closeCombat);
  const retry = useGameStore((state) => state.retryFromAutosave);
  const goToMenu = useGameStore((state) => state.goToMenu);
  const openModal = useGameStore((state) => state.openModal);
  const game = useGameStore((state) => state.game);
  const items = useMemo(
    () => (result?.items ?? []).map((itemId) => itemById[itemId]?.name ?? itemId),
    [result?.items]
  );
  if (!combat || !result) return null;
  const victory = result.victory;
  const player = game?.characters[game.playerId];

  return (
    <div className={cx('combat-result-layer', victory ? 'is-victory' : 'is-defeat')}>
      <section className="combat-result">
        <div className="combat-result-ornament">
          <span />
          <span className="combat-result-sigil">{victory ? '✦' : '☠'}</span>
          <span />
        </div>
        <p className="section-kicker">{victory ? 'Battle Won' : 'The Party Has Fallen'}</p>
        <h1>{victory ? result.encounterName : 'A Page Torn Out'}</h1>
        {victory ? (
          <>
            {result.victoryText && <p className="combat-result-text">{result.victoryText}</p>}
            <div className="result-rewards">
              <div><span>Experience</span><strong>{result.xp}</strong></div>
              <div><span>Gold</span><strong>{result.gold}</strong></div>
              <div><span>Party</span><strong>{combat.units.filter((unit) => unit.side === 'party' && !unit.downed).length} standing</strong></div>
            </div>
            {items.length > 0 && (
              <div className="result-items">
                {items.map((name) => <span key={name} className="tag tag-gold">{name}</span>)}
              </div>
            )}
            {result.notes.length > 0 && (
              <ul className="result-notes">
                {result.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            )}
            {result.levelUps.length > 0 && (
              <div className="result-levels">
                {result.levelUps.map((note) => <span key={note}>{note}</span>)}
              </div>
            )}
            <button className="btn btn-primary" onClick={closeCombat}>
              Continue the Chronicle ✦
            </button>
          </>
        ) : (
          <>
            <p className="combat-result-text">
              The mark on your soul flickers, but does not go out. The last autosave is waiting at the edge of the page.
            </p>
            <div className="result-rewards defeat-stats">
              <div><span>Name</span><strong>{player?.name ?? 'The Unwritten'}</strong></div>
              <div><span>Level</span><strong>{player?.level ?? 1}</strong></div>
              <div><span>Encounter</span><strong>{result.encounterName}</strong></div>
            </div>
            <div className="combat-result-actions">
              <button className="btn btn-primary" onClick={() => void retry()}>
                Return to the Last Autosave
              </button>
              <button className="btn btn-outline" onClick={() => openModal('load')}>
                Load a Chronicle
              </button>
              <button className="btn btn-ghost" onClick={goToMenu}>
                Main Menu
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
