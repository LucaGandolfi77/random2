import Phaser from 'phaser';

/**
 * Generates the few procedural textures shared by the world and combat scenes.
 * Everything is drawn at runtime — the game ships with no external art.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeDot();
    this.makeGlow();
    this.makeRain();
    this.makeSpark();
    this.makeNoise();
  }

  private makeDot(): void {
    if (this.textures.exists('dot')) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 4);
    g.generateTexture('dot', 12, 12);
    g.destroy();
  }

  private makeSpark(): void {
    if (this.textures.exists('spark')) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(4, 0, 8, 8, 0, 8);
    g.generateTexture('spark', 8, 8);
    g.destroy();
  }

  private makeRain(): void {
    if (this.textures.exists('rain')) return;
    const g = this.add.graphics();
    g.lineStyle(1, 0xffffff, 0.7);
    g.lineBetween(5, 0, 3, 18);
    g.generateTexture('rain', 8, 20);
    g.destroy();
  }

  private makeGlow(): void {
    if (this.textures.exists('glow')) return;
    const texture = this.textures.createCanvas('glow', 128, 128);
    if (!texture) return;
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    texture.refresh();
  }

  private makeNoise(): void {
    if (this.textures.exists('noise')) return;
    const texture = this.textures.createCanvas('noise', 96, 96);
    if (!texture) return;
    const ctx = texture.getContext();
    for (let i = 0; i < 2400; i++) {
      const shade = 120 + Math.random() * 110;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.03 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * 96, Math.random() * 96, 1, 1);
    }
    texture.refresh();
  }
}
