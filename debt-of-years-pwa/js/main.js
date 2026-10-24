import BootScene from './scenes/boot.js';
import TitleScene from './scenes/title.js';
import HubScene from './scenes/hub.js';
import BattleScene from './scenes/battle.js';
import EndingScene from './scenes/ending.js';
import GalleryScene from './scenes/gallery.js';

const config = {
  type: Phaser.AUTO,
  width: 720,
  height: 1280,
  parent: 'game',
  backgroundColor: '#14110e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    roundPixels: false
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  input: {
    activePointers: 3
  },
  scene: [BootScene, TitleScene, HubScene, BattleScene, EndingScene, GalleryScene]
};

const game = new Phaser.Game(config);
window.__debtGame = game;

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  });
}
