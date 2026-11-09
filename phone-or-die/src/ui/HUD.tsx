import { useEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GameState } from '@/core/types';
import { chapterObjective, homeBlockDistance } from '@/core/gameStore';
import { gameBus, type StickVector } from '@/game/bus';
import { chapterById } from '@/data/chapters';
import { nearestInteractable, interactables, zoneName, isLitAt, distanceToHome, HOME_DOOR, HOME_CLUES_REQUIRED } from '@/data/road';
import { formatNightTime, timeUntilDawn } from '@/systems/clock';
import { criticalThreat, shadowStepsBehind, stageInfo } from '@/systems/threat';
import { cx } from '@/utils';

export function ThreatMeter({ game, compact = false, showTimers = true }: { game: GameState; compact?: boolean; showTimers?: boolean }) {
  const info = stageInfo(game.threat);
  const stepsBehind = shadowStepsBehind(game);
  const callNow = stepsBehind <= 18 || game.threat >= 75;
  const cover =
    game.shieldSteps > 0
      ? `${game.shieldSteps} steps of cover`
      : game.shieldSeconds > 0
        ? showTimers
          ? `Line held ${Math.ceil(game.shieldSeconds)}s`
          : 'Line held'
        : 'No one on the line';
  return (
    <div className={cx('threat-meter', `stage-${info.stage}`, criticalThreat(game.threat) && 'is-critical', compact && 'is-compact')}>
      <div className="threat-labels">
        <span className="eyebrow">Shadows behind you</span>
        <span className="threat-stage">{info.label}</span>
      </div>
      <div className="threat-track" aria-label={`Shadows an estimated ${stepsBehind} steps behind`}>
        <span className="threat-fill" style={{ width: `${game.threat}%` }} />
        <span className="threat-marker" style={{ left: `${game.threat}%` }} />
      </div>
      <div className="threat-meta">
        <span>~{stepsBehind} steps behind</span>
        <span>{cover}</span>
      </div>
      {callNow && <span className="call-now">CALL SOMEONE</span>}
    </div>
  );
}

export function HUD({
  game,
  phoneOpen,
  showTimers,
  onPhone,
  onPause,
  onFlashlight
}: {
  game: GameState;
  phoneOpen: boolean;
  showTimers: boolean;
  onPhone: () => void;
  onPause: () => void;
  onFlashlight: () => void;
}) {
  const chapter = chapterById[game.chapter];
  const nearby = nearestInteractable(game.player.x, game.player.y);
  const nearbyUsable = nearby
    ? !game.usedInteractions.includes(nearby.id) &&
      !(nearby.maxUses && (game.interactionUses[nearby.id] ?? 0) >= nearby.maxUses) &&
      (!nearby.requiresFlag || Boolean(game.flags[nearby.requiresFlag]))
    : false;
  const nearbyPrompt =
    nearby?.kind === 'home'
      ? game.finalChoice
        ? 'The decision is made. Wait for dawn.'
        : game.clues.length < HOME_CLUES_REQUIRED
          ? `The house is waiting. ${HOME_CLUES_REQUIRED - game.clues.length} more piece${HOME_CLUES_REQUIRED - game.clues.length === 1 ? '' : 's'} of the road.`
          : 'The porch light is on. Make the last call.'
      : nearby?.prompt;
  const unread = game.deliveredMessages.filter((id) => !game.readMessages.includes(id)).length;
  const missed = game.callHistory.filter((entry) => entry.type === 'missed').length;
  const lowBattery = game.battery <= 20;
  const lit = isLitAt(game.player.x, game.player.y, game.powerOn);
  const blocks = homeBlockDistance(game);
  const dx = HOME_DOOR.x - game.player.x;
  const dy = HOME_DOOR.y - game.player.y;
  const bearing =
    Math.abs(dx) <= 2 && Math.abs(dy) <= 2
      ? ''
      : `${dy < 0 ? 'N' : dy > 0 ? 'S' : ''}${dx > 0 ? 'E' : dx < 0 ? 'W' : ''}`;
  const homeLabel =
    distanceToHome(game.player.x, game.player.y) <= 1
      ? 'The porch is here'
      : `Home · ${blocks} blocks${bearing ? ` ${bearing}` : ''}`;

  return (
    <>
      <header className={cx('hud', phoneOpen && 'is-muted')}>
        <div className="hud-left">
          <div className="hud-clock-block">
            <span className="hud-clock">{formatNightTime(game.nightMinute)}</span>
            <span className="hud-dawn">Dawn in {timeUntilDawn(game.nightMinute)}</span>
          </div>
          <div className="hud-chapter">
            <span className="eyebrow">{chapter?.subtitle}</span>
            <strong>{chapter?.title}</strong>
          </div>
        </div>

        <div className="hud-center">
          <ThreatMeter game={game} showTimers={showTimers} />
        </div>

        <div className="hud-right">
          <div className={cx('battery-chip', lowBattery && 'is-low')}>
            <span className="battery-icon"><i style={{ width: `${game.battery}%` }} /></span>
            <span>{Math.round(game.battery)}%</span>
          </div>
          {game.flashlightOwned && (
            <button
              className={cx('hud-icon-button', game.flashlightOn && 'is-active')}
              onClick={onFlashlight}
              title="Flashlight (F)"
            >
              ◍
            </button>
          )}
          <button className="hud-icon-button phone-icon" onClick={onPhone} title="Phone (Tab)">
            ▣
            {(unread > 0 || missed > 0) && <span className="hud-badge">{unread + missed}</span>}
          </button>
          <button className="hud-icon-button" onClick={onPause} title="Pause (Escape)">
            ❚❚
          </button>
        </div>
      </header>

      <div className="objective-card">
        <span className="eyebrow">Objective</span>
        <p>{game.flags.objective_override ?? chapterObjective(game)}</p>
        <span className="objective-home">{homeLabel}</span>
        <span className="objective-clues">
          {Math.min(game.clues.length, HOME_CLUES_REQUIRED)} / {HOME_CLUES_REQUIRED} road pieces
          {game.clues.length > HOME_CLUES_REQUIRED ? ` · ${game.clues.length} clues` : ''}
        </span>
      </div>

      <div className="room-indicator">
        <span className="eyebrow">{lit ? 'Under a streetlight' : game.powerOn ? 'Between lights' : 'Lights out'}</span>
        <strong>{zoneName(game.player.zone)}</strong>
        <span className="home-distance">{homeLabel}</span>
      </div>

      {nearby && nearbyUsable && (
        <div className="interaction-card">
          <span className="interaction-key">E</span>
          <div>
            <strong>{nearby.label}</strong>
            <span>{nearbyPrompt}</span>
          </div>
        </div>
      )}
      {!nearby && !phoneOpen && (
        <div className="control-hint">
          <span>WASD / arrows to move</span>
          <span>E to interact</span>
          <span>Tab for phone</span>
          <span>Esc to pause</span>
        </div>
      )}
    </>
  );
}

function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      gameBus.emit<StickVector>('stick', { x: 0, y: 0 });
    };
  }, []);

  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const radius = rect.width / 2 - 8;
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    gameBus.emit<StickVector>('stick', { x: x / radius, y: y / radius });
  };

  const reset = () => {
    setActive(false);
    setKnob({ x: 0, y: 0 });
    gameBus.emit<StickVector>('stick', { x: 0, y: 0 });
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
      aria-label="Movement joystick"
    >
      <span className="joystick-label">MOVE</span>
      <span className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

export function MobileControls({
  game,
  onInteract,
  onPhone,
  onFlashlight,
  onPause
}: {
  game: GameState;
  onInteract: () => void;
  onPhone: () => void;
  onFlashlight: () => void;
  onPause: () => void;
}) {
  const nearby = nearestInteractable(game.player.x, game.player.y);
  return (
    <div className="mobile-controls">
      <Joystick />
      <div className="mobile-actions">
        <button className="mobile-action" onClick={onFlashlight} disabled={!game.flashlightOwned}>
          <span>◍</span>
          <small>Light</small>
        </button>
        <button className="mobile-action" onClick={onPhone}>
          <span>▣</span>
          <small>Phone</small>
        </button>
        <button className="mobile-action primary" onClick={onInteract}>
          <span>E</span>
          <small>{nearby ? 'Use' : 'Search'}</small>
        </button>
        <button className="mobile-action" onClick={onPause}>
          <span>❚❚</span>
          <small>Pause</small>
        </button>
      </div>
    </div>
  );
}

export const hasNearbyInteraction = (game: GameState): boolean => {
  const item = nearestInteractable(game.player.x, game.player.y);
  return Boolean(
    item &&
      !game.usedInteractions.includes(item.id) &&
      !(item.maxUses && (game.interactionUses[item.id] ?? 0) >= item.maxUses) &&
      (!item.requiresFlag || Boolean(game.flags[item.requiresFlag]))
  );
};

export const interactableCount = interactables.length;
