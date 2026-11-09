import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeGlow();
    this.makeDot();
    this.makeNoise();
    this.scene.start('Road');
  }

  private makeGlow(): void {
    if (this.textures.exists('glow')) return;
    const texture = this.textures.createCanvas('glow', 160, 160);
    if (!texture) return;
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(80, 80, 0, 80, 80, 80);
    gradient.addColorStop(0, 'rgba(255,236,198,0.9)');
    gradient.addColorStop(0.28, 'rgba(255,205,139,0.35)');
    gradient.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 160, 160);
    texture.refresh();
  }

  private makeDot(): void {
    if (this.textures.exists('mote')) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(3, 3, 2.4);
    g.generateTexture('mote', 6, 6);
    g.destroy();
  }

  private makeNoise(): void {
    if (this.textures.exists('grain')) return;
    const texture = this.textures.createCanvas('grain', 128, 128);
    if (!texture) return;
    const ctx = texture.getContext();
    for (let index = 0; index < 2100; index++) {
      const shade = 100 + Math.random() * 140;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.09})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
    }
    texture.refresh();
  }
}
