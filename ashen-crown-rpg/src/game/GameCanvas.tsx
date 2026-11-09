import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useGameStore } from '@/core/gameStore';
import { BootScene } from './BootScene';
import { ExplorationScene } from './ExplorationScene';
import { CombatScene } from './CombatScene';

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: host.clientWidth || window.innerWidth,
      height: host.clientHeight || window.innerHeight,
      backgroundColor: '#0a090b',
      banner: false,
      audio: { noAudio: true },
      render: {
        antialias: true,
        roundPixels: false,
        powerPreference: 'high-performance'
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      input: {
        activePointers: 3,
        touch: { capture: true }
      },
      scene: [BootScene, ExplorationScene, CombatScene]
    });
    gameRef.current = game;

    let ready = false;
    const applyMode = () => {
      if (!ready) return;
      const state = useGameStore.getState();
      if (state.screen !== 'game') return;
      const wanted = state.combat ? 'Combat' : 'Exploration';
      const other = wanted === 'Combat' ? 'Exploration' : 'Combat';
      if (game.scene.isActive(other)) game.scene.stop(other);
      if (!game.scene.isActive(wanted) && !game.scene.isPaused(wanted)) {
        game.scene.start(wanted);
      }
    };

    game.events.once(Phaser.Core.Events.READY, () => {
      ready = true;
      game.scene.stop('Boot');
      applyMode();
    });

    const unsubscribe = useGameStore.subscribe((state, previous) => {
      const before = Boolean(previous.combat);
      const after = Boolean(state.combat);
      if (before !== after) applyMode();
      if (state.screen !== 'game' && ready && game.scene.isActive('Exploration')) game.scene.stop('Exploration');
    });

    const onVisibility = () => {
      if (document.hidden) {
        game.loop.sleep();
      } else {
        game.loop.wake();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="game-canvas" aria-label="Ashen Crown game world" />;
}
