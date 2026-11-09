import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { RoadScene } from './RoadScene';

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
      backgroundColor: '#050506',
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
        activePointers: 2,
        touch: { capture: true }
      },
      scene: [BootScene, RoadScene]
    });
    gameRef.current = game;
    const onVisibility = () => {
      if (document.hidden) game.loop.sleep();
      else game.loop.wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="game-canvas" aria-label="Emma's road home" />;
}
