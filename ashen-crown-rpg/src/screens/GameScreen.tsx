import { useEffect, useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore, isInteractableVisible, mapForGame } from '@/core/gameStore';
import { mapById } from '@/data/maps';
import { dialogueById } from '@/data/dialogues';
import { questById } from '@/data/quests';
import { currentUnit } from '@/systems/combat';
import { maxHp, maxResource } from '@/systems/character';
import { GameCanvas } from '@/game/GameCanvas';
import { gameBus } from '@/game/bus';
import { Portrait } from '@/ui/Portrait';
import { DialoguePanel } from '@/ui/DialoguePanel';
import { CheckOverlay, Toasts } from '@/ui/Feedback';
import { CombatUI, CombatResultOverlay } from '@/ui/CombatUI';
import { ModalHost } from '@/ui/modals/ModalHost';
import { Eightsigil } from '@/ui/CrownSigil';
import { cx, percent, shortName } from '@/utils';

function TopBar() {
  const game = useGameStore((state) => state.game);
  const combat = useGameStore((state) => state.combat);
  const openModal = useGameStore((state) => state.openModal);
  if (!game) return null;
  const map = mapById[game.world.locationId] ?? mapForGame(game);
  const player = game.characters[game.playerId];
  const gold = player?.gold ?? 0;
  const specializationAvailable = Boolean(player && player.level >= 3 && !player.subclass);
  const buttons = [
    { id: 'journal', glyph: '❧', label: 'Journal', key: 'J' },
    { id: 'inventory', glyph: '▤', label: 'Inventory', key: 'I' },
    { id: 'character', glyph: '◈', label: 'Character', key: 'C' },
    { id: 'party', glyph: '♟', label: 'Party', key: 'P' },
    { id: 'map', glyph: '⌖', label: 'Map', key: 'M' },
    { id: 'settings', glyph: '◌', label: 'Settings', key: 'Esc' }
  ] as const;

  return (
    <header className={cx('hud', combat && 'hud-combat')}>
      <div className="hud-location">
        <Eightsigil className="hud-sigil" />
        <div>
          <span className="hud-region">{map.region}</span>
          <h1>{map.name}</h1>
        </div>
      </div>
      <div className="hud-chapter">
        <span className="hud-chapter-label">Chapter One</span>
        <span className="hud-chapter-name">The Crown of Cinders</span>
        {game.world.flags.mark_awake ? <span className="hud-mark">The mark is awake</span> : null}
      </div>
      <div className="hud-right">
        <span className="hud-gold" title="Gold">◉ {gold}</span>
        <div className="hud-buttons">
          {buttons.map((button) => (
            <button
              key={button.id}
              className="hud-button"
              title={`${button.label} (${button.key})`}
              aria-label={button.label}
              onClick={() => openModal(button.id)}
              disabled={Boolean(combat) && button.id !== 'settings'}
            >
              <span className="hud-button-glyph">
                {button.glyph}
                {button.id === 'character' && specializationAvailable && <i className="hud-alert">!</i>}
              </span>
              <span className="hud-button-label">{button.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function QuestTracker() {
  const game = useGameStore((state) => state.game);
  const openModal = useGameStore((state) => state.openModal);
  if (!game) return null;
  const active = Object.entries(game.quests)
    .map(([id, state]) => ({ id, state, def: questById[id] }))
    .filter((entry) => entry.state.status === 'active' && entry.def);
  if (!active.length) {
    return (
      <button className="quest-tracker is-empty" onClick={() => openModal('journal')}>
        <span className="quest-tracker-kicker">The road is open</span>
        <span className="quest-tracker-title">Speak to someone. Find a thread.</span>
      </button>
    );
  }
  active.sort((a, b) => {
    const weight = (type: string) => (type === 'main' ? 0 : type === 'companion' ? 1 : type === 'side' ? 2 : 3);
    return weight(a.def.type) - weight(b.def.type) || a.def.act - b.def.act;
  });
  const quest = active[0];
  const stage = quest.def.stages[Math.min(quest.state.stage, quest.def.stages.length - 1)];
  return (
    <button className="quest-tracker" onClick={() => openModal('journal')}>
      <span className="quest-tracker-kicker">
        {quest.def.type === 'main' ? 'Main thread' : quest.def.type === 'companion' ? 'Companion' : 'Side thread'} · Act{' '}
        {quest.def.act}
      </span>
      <span className="quest-tracker-title">{quest.def.title}</span>
      <span className="quest-tracker-stage">{stage?.title}</span>
      {stage?.objectives?.slice(0, 2).map((objective) => (
        <span key={objective} className="quest-objective">
          <i />
          {objective}
        </span>
      ))}
      <span className="quest-tracker-more">
        {active.length > 1 ? `+${active.length - 1} more active` : 'Open journal'} →
      </span>
    </button>
  );
}

function PartyDock() {
  const game = useGameStore((state) => state.game);
  const combat = useGameStore((state) => state.combat);
  const openModal = useGameStore((state) => state.openModal);
  if (!game) return null;
  const party = game.party.map((id) => game.characters[id]).filter(Boolean);
  const current = combat ? currentUnit(combat) : null;
  return (
    <div className={cx('party-dock', combat && 'party-dock-combat')}>
      {party.map((member) => (
        <button
          key={member.id}
          className={cx('party-dock-member', current?.charId === member.id && 'is-current', member.hp <= 0 && 'is-down')}
          onClick={() => openModal('character', member.id)}
          title={`${member.name} · ${member.classId}`}
        >
          <Portrait appearance={member.portrait} size="xs" />
          <span className="party-dock-info">
            <span className="party-dock-name">{shortName(member.name)}</span>
            <span className="party-dock-bars">
              <span className="party-dock-hp">
                <span style={{ width: `${percent(member.hp, maxHp(member))}%` }} />
              </span>
              <span className="party-dock-res">
                {member.resource}/{maxResource(member)}
              </span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ExploreToolbar() {
  const searchArea = useGameStore((state) => state.searchArea);
  const rest = useGameStore((state) => state.rest);
  const openModal = useGameStore((state) => state.openModal);
  const game = useGameStore((state) => state.game);
  const location = game?.world.locationId;
  const map = location ? mapById[location] : null;
  const nearby = useMemo(() => {
    if (!game) return 0;
    const currentMap = mapForGame(game);
    return currentMap.interactables.filter(
      (def) =>
        isInteractableVisible(game, def) &&
        Math.max(Math.abs(def.x - game.world.x), Math.abs(def.y - game.world.y)) <= 3
    ).length;
  }, [game]);

  const actions = [
    { label: 'Search', glyph: '⌕', key: 'F', onClick: searchArea, hint: nearby ? `${nearby} nearby` : 'look around' },
    { label: 'Rest', glyph: '♨', key: 'R', onClick: rest, hint: 'restore party' },
    { label: 'Journal', glyph: '❧', key: 'J', onClick: () => openModal('journal'), hint: 'quests' },
    { label: 'Inventory', glyph: '▤', key: 'I', onClick: () => openModal('inventory'), hint: 'equipment' },
    { label: 'Map', glyph: '⌖', key: 'M', onClick: () => openModal('map'), hint: map?.travelNode ? 'travel' : 'local' }
  ];

  return (
    <div className="explore-toolbar-wrap">
      <p className="explore-hint">
        <span className="explore-hint-marker">◈</span> Click the ground to walk · Click a glowing marker to interact
      </p>
      <nav className="explore-toolbar" aria-label="Exploration actions">
        {actions.map((action) => (
          <button key={action.label} className="explore-action" onClick={action.onClick} title={`${action.label} (${action.key})`}>
            <span className="explore-action-glyph">{action.glyph}</span>
            <span className="explore-action-label">{action.label}</span>
            <span className="explore-action-hint">{action.hint}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      gameBus.emit('stick', { x: 0, y: 0 });
    };
  }, []);

  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (target.left + target.width / 2);
    const dy = event.clientY - (target.top + target.height / 2);
    const distance = Math.hypot(dx, dy);
    const radius = target.width / 2 - 8;
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    gameBus.emit('stick', { x: x / radius, y: y / radius });
  };

  const reset = () => {
    setActive(false);
    setKnob({ x: 0, y: 0 });
    gameBus.emit('stick', { x: 0, y: 0 });
  };

  return (
    <div
      className={cx('joystick', active && 'is-active')}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setActive(true);
        update(event);
      }}
      onPointerMove={(event) => {
        if (active) update(event);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onPointerLeave={(event) => {
        if (active && event.buttons === 0) reset();
      }}
      aria-label="Movement joystick"
    >
      <span className="joystick-ring" />
      <span className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

function MobileControls() {
  const game = useGameStore((state) => state.game);
  const combat = useGameStore((state) => state.combat);
  const dialogue = useGameStore((state) => state.dialogue);
  const modal = useGameStore((state) => state.modal);
  const interact = useGameStore((state) => state.interact);
  const searchArea = useGameStore((state) => state.searchArea);
  const rest = useGameStore((state) => state.rest);
  const notify = useGameStore((state) => state.notify);
  const openModal = useGameStore((state) => state.openModal);

  const nearest = useMemo(() => {
    if (!game) return null;
    const currentMap = mapForGame(game);
    return (
      currentMap.interactables
        .filter((def) => isInteractableVisible(game, def))
        .filter(
          (def) =>
            Math.max(Math.abs(def.x - game.world.x), Math.abs(def.y - game.world.y)) <= 2
        )
        .sort(
          (a, b) =>
            Math.max(Math.abs(a.x - game.world.x), Math.abs(a.y - game.world.y)) -
            Math.max(Math.abs(b.x - game.world.x), Math.abs(b.y - game.world.y))
        )[0] ?? null
    );
  }, [game]);

  if (!game || dialogue || modal) return null;

  if (combat) {
    return (
      <div className="mobile-controls mobile-controls-combat">
        <button className="mobile-round-btn" onClick={() => openModal('settings')} aria-label="Settings">◌</button>
      </div>
    );
  }

  return (
    <div className="mobile-controls">
      <Joystick />
      <div className="mobile-actions">
        <button
          className="mobile-round-btn"
          onClick={() => {
            if (nearest) interact(nearest.id);
            else notify('Nothing within reach. Tap a glowing marker or use Search.', 'info');
          }}
          aria-label={nearest ? `Interact with ${nearest.label}` : 'Interact'}
        >
          <span>◈</span>
          <small>{nearest ? nearest.label.split(' ').slice(0, 2).join(' ') : 'Interact'}</small>
        </button>
        <button className="mobile-round-btn" onClick={searchArea} aria-label="Search area">
          <span>⌕</span>
          <small>Search</small>
        </button>
        <button className="mobile-round-btn" onClick={rest} aria-label="Rest with the party">
          <span>♨</span>
          <small>Rest</small>
        </button>
      </div>
    </div>
  );
}

export function GameScreen() {
  const game = useGameStore((state) => state.game);
  const combat = useGameStore((state) => state.combat);
  const combatResult = useGameStore((state) => state.combatResult);
  const modal = useGameStore((state) => state.modal);

  useEffect(() => {
    if (!game) return;
    const timer = window.setInterval(() => {
      const state = useGameStore.getState();
      if (!state.game || state.screen !== 'game') return;
      useGameStore.setState({
        game: { ...state.game, playTime: state.game.playTime + 15, updatedAt: Date.now() }
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [Boolean(game)]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const store = useGameStore.getState();
      const key = event.key.toLowerCase();

      if (event.key === 'Escape') {
        if (store.checkResult) {
          store.dismissCheck();
          return;
        }
        if (store.modal) {
          store.closeModal();
          return;
        }
        if (store.dialogue) {
          store.closeDialogue();
          return;
        }
        if (store.combat) {
          store.selectCombatAbility(null);
          store.selectCombatAction(null);
          return;
        }
        store.openModal('settings');
        return;
      }

      if (store.modal) return;

      if (store.combat && !store.combatResult) {
        if (event.code === 'Space') {
          event.preventDefault();
          store.combatEndTurn();
          return;
        }
        if (/^[1-6]$/.test(event.key)) {
          const unit = currentUnit(store.combat);
          if (unit?.side === 'party') {
            const abilityId = unit.abilities[Number(event.key) - 1];
            if (abilityId) store.selectCombatAbility(abilityId);
          }
          return;
        }
      }

      if (store.dialogue) {
        if (event.key === 'Enter' || event.key === ' ') {
          const def = dialogueById[store.dialogue.id];
          const node = def?.nodes[store.dialogue.nodeId];
          if (node && !node.choices?.length) {
            event.preventDefault();
            store.advanceDialogue();
          }
        }
        return;
      }

      if (store.combat) return;

      switch (key) {
        case 'i':
          store.openModal('inventory');
          break;
        case 'j':
          store.openModal('journal');
          break;
        case 'c':
          store.openModal('character');
          break;
        case 'p':
          store.openModal('party');
          break;
        case 'm':
          store.openModal('map');
          break;
        case 'f':
          store.searchArea();
          break;
        case 'r':
          store.rest();
          break;
        case 'h':
          store.openModal('help');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!game) return null;

  return (
    <main className={cx('game-screen', combat && 'in-combat', combatResult && 'has-result', modal && 'has-modal')}>
      <GameCanvas />
      <div className="game-vignette" aria-hidden="true" />
      <div className="game-grain" aria-hidden="true" />
      <TopBar />
      {!combat && <QuestTracker />}
      {!combat && <PartyDock />}
      {combat ? <CombatUI /> : <ExploreToolbar />}
      {combat && <PartyDock />}
      {!combat && (
        <div className="explore-corner">
          {mapById[game.world.locationId]?.region ?? 'Elarion'} · Elarion
        </div>
      )}
      <DialoguePanel />
      <ModalHost />
      <CombatResultOverlay />
      <MobileControls />
      <Toasts />
      <CheckOverlay />
    </main>
  );
}
