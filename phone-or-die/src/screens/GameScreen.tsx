import { useEffect } from 'react';
import { useGameStore } from '@/core/gameStore';
import { GameCanvas } from '@/game/GameCanvas';
import { HUD, MobileControls } from '@/ui/HUD';
import { PhoneUI } from '@/ui/PhoneUI';
import { EventModal } from '@/ui/EventModal';
import { FinalChoiceModal } from '@/ui/FinalChoiceModal';
import { GameModals } from '@/ui/GameModals';
import { nearestInteractable, HOME_CLUES_REQUIRED } from '@/data/road';
import { stageInfo } from '@/systems/threat';
import { cx, isInputElement } from '@/utils';

export function GameScreen() {
  const game = useGameStore((state) => state.game);
  const phoneOpen = useGameStore((state) => state.phoneOpen);
  const activeCall = useGameStore((state) => state.activeCall);
  const pendingEvent = useGameStore((state) => state.pendingEventId);
  const finalOpen = useGameStore((state) => state.finalOpen);
  const modal = useGameStore((state) => state.modal);
  const showTimers = useGameStore((state) => state.settings.showTimers);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(event.target)) return;
      const state = useGameStore.getState();
      if (!state.game || state.screen !== 'game') return;

      if (event.key === 'Tab') {
        event.preventDefault();
        if (!state.modal && !state.pendingEventId && !state.finalOpen) {
          if (!state.activeCall) {
            if (state.phoneOpen) state.closePhone();
            else state.openPhone();
          }
        }
        return;
      }

      if (event.key === 'Escape') {
        if (state.phoneOpen) {
          if (!state.activeCall) state.closePhone();
          return;
        }
        if (state.modal) {
          state.closeModal();
          return;
        }
        if (state.pendingEventId || state.finalOpen) return;
        state.openModal('pause');
        return;
      }

      if (state.phoneOpen || state.modal || state.pendingEventId || state.finalOpen) return;

      if (event.key.toLowerCase() === 'e' || event.code === 'Space') {
        event.preventDefault();
        state.interactNearest();
        return;
      }
      if (event.key.toLowerCase() === 'f') {
        state.toggleFlashlight();
        return;
      }
      if (event.key.toLowerCase() === 'h') {
        state.openModal('help');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!game) return null;
  const stage = stageInfo(game.threat);
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
  const warning = game.threat >= 80;

  return (
    <main
      className={cx(
        'game-screen',
        `threat-stage-${stage.stage}`,
        phoneOpen && 'phone-is-open',
        game.battery <= 20 && 'battery-low',
        !game.powerOn && 'power-is-out',
        game.flashlightOn && 'flashlight-on',
        game.finalPhase && 'final-phase',
        warning && 'threat-critical'
      )}
    >
      <GameCanvas />
      <div className="street-vignette" aria-hidden="true" />
      <div className="street-grain" aria-hidden="true" />
      <div className="street-rain" aria-hidden="true" />
      <div className="threat-pulse" aria-hidden="true" />
      <div className="shadow-tendrils" aria-hidden="true" />
      <div className="phone-light-wash" aria-hidden="true" />
      <div className="final-phase-banner">{game.finalPhase ? 'THE LAST HOUR' : ''}</div>

      <HUD
        game={game}
        phoneOpen={phoneOpen}
        showTimers={showTimers}
        onPhone={() => {
          if (phoneOpen) {
            if (!activeCall) useGameStore.getState().closePhone();
          } else {
            useGameStore.getState().openPhone();
          }
        }}
        onPause={() => useGameStore.getState().openModal('pause')}
        onFlashlight={() => useGameStore.getState().toggleFlashlight()}
      />

      {!phoneOpen && !pendingEvent && !finalOpen && !modal && (
        <MobileControls
          game={game}
          onInteract={() => useGameStore.getState().interactNearest()}
          onPhone={() => useGameStore.getState().openPhone()}
          onFlashlight={() => useGameStore.getState().toggleFlashlight()}
          onPause={() => useGameStore.getState().openModal('pause')}
        />
      )}

      {nearby && nearbyUsable && !phoneOpen && !pendingEvent && !finalOpen && !modal && (
        <button className="world-interaction" onClick={() => useGameStore.getState().interact(nearby.id)}>
          <span className="world-interaction-key">E</span>
          <span>
            <strong>{nearby.label}</strong>
            <small>{nearbyPrompt}</small>
          </span>
          <span className="world-interaction-arrow">→</span>
        </button>
      )}

      {phoneOpen && <PhoneUI />}
      {pendingEvent && <EventModal />}
      {finalOpen && <FinalChoiceModal />}
      <GameModals />
    </main>
  );
}
