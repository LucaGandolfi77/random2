import { generateAll } from '../art.js';
import { initAudio } from '../audio.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateAll(this);

    this.input.once('pointerdown', () => initAudio());

    const boot = document.getElementById('boot');
    if (boot) {
      boot.classList.add('hidden');
      window.setTimeout(() => boot.remove(), 600);
    }

    this.scene.start('Title');
  }
}
