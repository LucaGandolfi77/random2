import Phaser from 'phaser';
import type { Appearance, GameState, InteractableDef, MapDefinition } from '@/core/types';
import { useGameStore, isHiddenGlimmer, isInteractableVisible } from '@/core/gameStore';
import { mapById } from '@/data/maps';
import { companionById } from '@/data/companions';
import { gameBus, type StickVector } from './bus';
import {
  HALF_H,
  HALF_W,
  isWalkable,
  kindColor,
  kindGlyph,
  project,
  tileColor,
  tileAt,
  unproject
} from './iso';

interface MarkerEntry {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  def: InteractableDef;
  baseY: number;
  glimmer: boolean;
}

interface FigureParts {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
}

const shade = (color: number, amount: number): number => {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (color & 0xff) + amount));
  return (r << 16) | (g << 8) | b;
};

const colorFromHex = (hex: string, fallback = 0x6d6457): number => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(value) ? value : fallback;
};

export class ExplorationScene extends Phaser.Scene {
  private map!: MapDefinition;
  private mapId = '';
  private originX = 0;
  private originY = 0;
  private worldWidth = 0;
  private worldHeight = 0;
  private player: Phaser.GameObjects.Container | null = null;
  private playerBody: Phaser.GameObjects.Container | null = null;
  private followers: Phaser.GameObjects.Container[] = [];
  private markerEntries = new Map<string, MarkerEntry>();
  private path: { x: number; y: number }[] = [];
  private moving = false;
  private joystick: StickVector = { x: 0, y: 0 };
  private nextStepAt = 0;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private unsubscribe: (() => void) | null = null;
  private offStick: (() => void) | null = null;
  private markerPointerHandled = false;
  private pendingInteract: string | null = null;
  private weather: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private targetMarkerTile: { x: number; y: number } | null = null;

  constructor() {
    super('Exploration');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a090b');
    this.input.mouse?.disableContextMenu();
    this.keys = this.input.keyboard
      ? {
          up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
          down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
          left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
          right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
          w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        }
      : {};

    this.buildWorld();
    this.unsubscribe = useGameStore.subscribe((state, previous) => this.syncStore(state, previous));
    this.offStick = gameBus.on<StickVector>('stick', (vector) => {
      this.joystick = vector ?? { x: 0, y: 0 };
    });

    this.input.on('pointerdown', this.handlePointer, this);
    this.input.on('wheel', this.handleWheel, this);
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.cameras.main.fadeIn(420, 8, 7, 9);
  }

  private buildWorld(): void {
    const state = useGameStore.getState();
    const game = state.game;
    if (!game) return;
    this.mapId = game.world.locationId;
    this.map = mapById[this.mapId] ?? mapById.fallen_bastion;

    this.tweens.killAll();
    this.children.removeAll(true);
    this.markerEntries.clear();
    this.followers = [];
    this.weather = [];
    this.path = [];
    this.moving = false;
    this.pendingInteract = null;
    this.player = null;
    this.playerBody = null;

    const maxX = (this.map.width - 1) * HALF_W;
    const maxY = (this.map.height - 1) * HALF_H;
    this.originX = maxY + 92;
    this.originY = 92;
    this.worldWidth = maxX * 2 + 184;
    this.worldHeight = maxY * 2 + 184;

    const g = this.add.graphics({ x: 0, y: 0 });
    g.setDepth(0);

    for (let y = 0; y < this.map.height; y++) {
      const row = this.map.rows[y] ?? '';
      for (let x = 0; x < this.map.width; x++) {
        const ch = row[x] ?? '#';
        const { x: px, y: py } = project(x, y, this.originX, this.originY);
        const base = tileColor(ch, x, y, this.map.ambience);
        const diamond = this.diamond(px, py);

        g.fillStyle(base, 1);
        g.fillPoints(diamond, true);

        if (ch === '~') {
          g.fillStyle(0x3d7d84, 0.22);
          g.fillPoints(this.diamond(px, py - 2, 0.8), true);
          if ((x * 5 + y * 3) % 7 === 0) {
            g.lineStyle(1, 0x7db4b6, 0.25);
            g.lineBetween(px - 12, py, px + 4, py - 2);
          }
        } else if (ch === 'f') {
          g.fillStyle(0x351f19, 0.8);
          g.fillPoints(diamond, true);
          g.fillStyle(0xd6743c, 0.28);
          g.fillPoints(this.diamond(px, py - 1, 0.7), true);
        } else if (ch === ',' || ch === ';') {
          const tuft = ((x * 13 + y * 17) % 5) / 10 + 0.08;
          g.lineStyle(1, shade(base, 20), tuft);
          g.lineBetween(px - 5, py + 1, px - 7, py - 4);
          g.lineBetween(px + 2, py + 2, px + 4, py - 3);
          if ((x + y) % 4 === 0) {
            g.lineBetween(px + 9, py - 2, px + 10, py - 6);
          }
        } else if (ch === '^') {
          g.fillStyle(shade(base, -18), 0.8);
          g.fillCircle(px - 7, py + 1, 3);
          g.fillCircle(px + 6, py, 4);
          g.fillCircle(px + 1, py - 4, 3);
        }

        g.lineStyle(1, 0x0b0a0b, 0.18);
        g.strokePoints(diamond, true, true);
      }
    }

    // Wall blocks and tall terrain get their own depth-sorted shapes.
    for (let y = 0; y < this.map.height; y++) {
      const row = this.map.rows[y] ?? '';
      for (let x = 0; x < this.map.width; x++) {
        const ch = row[x] ?? '#';
        if (ch === '#') this.drawWall(x, y);
        else if (ch === 'T') this.addProp('tree', x, y);
        else if (ch === '^') this.addProp('rubble', x, y);
        else if (ch === 'o') this.addProp('barrel', x, y);
        else if (ch === 'f') this.addFirelight(x, y);
      }
    }

    for (const prop of this.map.props ?? []) this.addProp(prop.kind, prop.x, prop.y);

    this.addMarkers(game);
    this.addPlayer(game);
    this.addWeather();
    this.updateCamera();
    this.syncMarkers(game);
  }

  private diamond(cx: number, cy: number, scale = 1): Phaser.Geom.Point[] {
    const w = HALF_W * scale;
    const h = HALF_H * scale;
    return [
      new Phaser.Geom.Point(cx, cy - h),
      new Phaser.Geom.Point(cx + w, cy),
      new Phaser.Geom.Point(cx, cy + h),
      new Phaser.Geom.Point(cx - w, cy)
    ];
  }

  private drawWall(x: number, y: number): void {
    const { x: px, y: py } = project(x, y, this.originX, this.originY);
    const base = tileColor('#', x, y, this.map.ambience);
    const height = 30;
    const g = this.add.graphics();
    const topY = py - height;
    const top = this.diamond(px, topY).map((p) => new Phaser.Geom.Point(p.x, p.y));
    const left = [
      new Phaser.Geom.Point(px - HALF_W, topY),
      new Phaser.Geom.Point(px, topY + HALF_H),
      new Phaser.Geom.Point(px, topY + HALF_H + height),
      new Phaser.Geom.Point(px - HALF_W, topY + height)
    ];
    const right = [
      new Phaser.Geom.Point(px, topY + HALF_H),
      new Phaser.Geom.Point(px + HALF_W, topY),
      new Phaser.Geom.Point(px + HALF_W, topY + height),
      new Phaser.Geom.Point(px, topY + HALF_H + height)
    ];
    g.fillStyle(shade(base, -32), 1);
    g.fillPoints(left, true);
    g.fillStyle(shade(base, -48), 1);
    g.fillPoints(right, true);
    g.fillStyle(base, 1);
    g.fillPoints(top, true);
    g.lineStyle(1, shade(base, -22), 0.5);
    g.strokePoints(top, true, true);
    // weathered blocks
    g.lineStyle(1, 0x121012, 0.28);
    for (let i = 1; i < 3; i++) {
      g.lineBetween(px - HALF_W + i * 11, topY + 8 + i * 5, px - 2, topY + HALF_H + 6 + i * 5);
    }
    g.setDepth(90 + (x + y) * 10);
  }

  private addProp(kind: string, x: number, y: number): void {
    const { x: px, y: py } = project(x, y, this.originX, this.originY);
    const container = this.add.container(px, py - 2);
    const g = this.add.graphics();
    container.add(g);
    container.setDepth(100 + (x + y) * 10);
    const seed = Math.abs(x * 31 + y * 17);
    const tint = tileColor(';', x, y, this.map.ambience);

    switch (kind) {
      case 'tree': {
        const trunk = 0x4a3526;
        const leaf = shade(0x2f4a31, (seed % 18) - 9);
        g.fillStyle(trunk, 1);
        g.fillRect(-3, -18, 6, 20);
        g.fillStyle(shade(leaf, -16), 0.9);
        g.fillEllipse(0, -34, 44, 34);
        g.fillStyle(leaf, 1);
        g.fillEllipse(-9, -42, 27, 24);
        g.fillEllipse(9, -38, 30, 25);
        g.fillStyle(shade(leaf, 16), 0.55);
        g.fillEllipse(-4, -47, 18, 13);
        if (this.map.ambience === 'forest') {
          g.lineStyle(1, 0x9bb083, 0.25);
          g.lineBetween(-12, -34, -19, -24);
          g.lineBetween(13, -31, 21, -21);
        }
        this.tweens.add({
          targets: container,
          angle: { from: -0.7, to: 0.7 },
          duration: 3200 + (seed % 7) * 260,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
      }
      case 'rubble':
        g.fillStyle(tint, 0.5);
        g.fillEllipse(0, 2, 40, 15);
        g.fillStyle(0x5a534a, 1);
        g.fillRect(-14, -7, 12, 9);
        g.fillRect(2, -10, 10, 12);
        g.fillStyle(0x6c6154, 1);
        g.fillRect(-5, -4, 7, 7);
        g.lineStyle(1, 0x2b2623, 0.5);
        g.strokeRect(-14, -7, 12, 9);
        g.strokeRect(2, -10, 10, 12);
        break;
      case 'barrel':
        g.fillStyle(0x352a21, 0.4);
        g.fillEllipse(0, 2, 24, 9);
        g.fillStyle(0x5d4330, 1);
        g.fillRoundedRect(-8, -18, 16, 20, 5);
        g.lineStyle(2, 0x2f2319, 0.9);
        g.lineBetween(-8, -11, 8, -11);
        g.lineBetween(-8, -3, 8, -3);
        g.fillStyle(0x7b5b3d, 1);
        g.fillEllipse(0, -18, 16, 6);
        break;
      case 'ruin':
        g.fillStyle(0x3d3834, 0.5);
        g.fillEllipse(0, 3, 38, 13);
        g.fillStyle(0x5a534a, 1);
        g.fillRect(-12, -28, 24, 30);
        g.fillStyle(0x665e53, 1);
        g.fillTriangle(-12, -28, 12, -28, -5, -40);
        g.lineStyle(2, 0x342f2b, 0.7);
        g.lineBetween(-4, -24, -2, -8);
        g.lineBetween(3, -18, 6, -4);
        g.fillStyle(0x2f3c2e, 0.8);
        g.fillCircle(-9, -26, 4);
        g.fillCircle(8, -30, 3);
        break;
      case 'house':
      case 'manor':
      case 'chapel': {
        const scale = kind === 'manor' ? 1.25 : kind === 'chapel' ? 1.12 : 1;
        g.fillStyle(0x2a2423, 0.45);
        g.fillEllipse(0, 4, 64 * scale, 20 * scale);
        g.fillStyle(kind === 'chapel' ? 0x514b43 : 0x4a3c31, 1);
        g.fillRect(-26 * scale, -34 * scale, 52 * scale, 36 * scale);
        g.fillStyle(0x322b27, 1);
        g.fillTriangle(-29 * scale, -34 * scale, 29 * scale, -34 * scale, 0, -54 * scale);
        g.fillStyle(kind === 'chapel' ? 0x676056 : 0x6a5138, 1);
        g.fillTriangle(-29 * scale, -34 * scale, 0, -54 * scale, 0, -36 * scale);
        g.fillStyle(0x463a2d, 1);
        g.fillTriangle(0, -36 * scale, 29 * scale, -34 * scale, 0, -54 * scale);
        g.fillStyle(0xe5b96f, 0.75);
        g.fillRect(-15 * scale, -24 * scale, 7 * scale, 8 * scale);
        g.fillRect(8 * scale, -24 * scale, 7 * scale, 8 * scale);
        g.fillStyle(0x2b211c, 1);
        g.fillRoundedRect(-5 * scale, -17 * scale, 10 * scale, 19 * scale, 3);
        if (kind === 'chapel') {
          g.fillStyle(0xbda46e, 0.9);
          g.fillCircle(0, -58 * scale, 3);
          g.lineStyle(2, 0xbda46e, 0.7);
          g.lineBetween(0, -68 * scale, 0, -62 * scale);
          g.lineBetween(-4 * scale, -65 * scale, 4 * scale, -65 * scale);
        }
        break;
      }
      case 'well':
        g.fillStyle(0x33302c, 0.45);
        g.fillEllipse(0, 3, 30, 11);
        g.fillStyle(0x5c574e, 1);
        g.fillEllipse(0, -4, 30, 14);
        g.fillStyle(0x171f22, 1);
        g.fillEllipse(0, -4, 19, 8);
        g.lineStyle(2, 0x76664f, 1);
        g.lineBetween(-12, -6, -9, -25);
        g.lineBetween(12, -6, 9, -25);
        g.lineBetween(-10, -25, 10, -25);
        break;
      case 'stall':
        g.fillStyle(0x382c22, 0.5);
        g.fillEllipse(0, 4, 48, 16);
        g.fillStyle(0x5b4630, 1);
        g.fillRect(-21, -22, 42, 24);
        g.fillStyle(0x7d3530, 1);
        g.fillTriangle(-24, -22, 24, -22, 0, -36);
        g.fillStyle(0xc4a36a, 0.8);
        for (let i = -18; i < 18; i += 12) g.fillRect(i, -22, 5, 4);
        g.fillStyle(0xd8b16b, 1);
        g.fillCircle(-9, -10, 4);
        g.fillCircle(3, -8, 3);
        break;
      case 'lamp':
        g.fillStyle(0x2f2a24, 1);
        g.fillRect(-2, -34, 4, 36);
        g.fillStyle(0xf0c47a, 1);
        g.fillCircle(0, -36, 6);
        {
          const glow = this.add.image(0, -36, 'glow').setTint(0xffc16b).setAlpha(0.28).setScale(0.55).setBlendMode(Phaser.BlendModes.ADD);
          container.add(glow);
        }
        this.tweens.add({ targets: container, alpha: { from: 0.92, to: 1 }, duration: 1800, yoyo: true, repeat: -1 });
        break;
      case 'brazier':
      case 'hearth':
        g.fillStyle(0x2d2925, 1);
        g.fillRect(-3, -18, 6, 18);
        g.fillStyle(0x5c5145, 1);
        g.fillEllipse(0, -20, 22, 8);
        g.fillStyle(0x241f1c, 1);
        g.fillEllipse(0, -22, 16, 5);
        g.fillStyle(0xe17a3e, 0.95);
        g.fillTriangle(-6, -23, 0, -40, 5, -23);
        g.fillStyle(0xf4c66c, 0.9);
        g.fillTriangle(-2, -23, 1, -33, 3, -23);
        {
          const glow = this.add.image(0, -28, 'glow').setTint(0xff9b56).setAlpha(0.34).setScale(0.9).setBlendMode(Phaser.BlendModes.ADD);
          container.add(glow);
          this.tweens.add({ targets: glow, alpha: { from: 0.22, to: 0.46 }, scale: { from: 0.8, to: 1.05 }, duration: 700, yoyo: true, repeat: -1 });
        }
        break;
      case 'statue':
        g.fillStyle(0x32302b, 0.4);
        g.fillEllipse(0, 3, 28, 10);
        g.fillStyle(0x4b4a42, 1);
        g.fillRect(-11, -8, 22, 11);
        g.fillStyle(0x5f5c51, 1);
        g.fillRect(-7, -34, 14, 27);
        g.fillCircle(0, -38, 7);
        g.fillStyle(0x3c3b35, 1);
        g.fillTriangle(-7, -18, 7, -18, 0, -10);
        g.lineStyle(1, 0x292824, 0.7);
        g.lineBetween(-3, -38, 0, -35);
        break;
      case 'throne':
        g.fillStyle(0x2a2528, 0.5);
        g.fillEllipse(0, 4, 42, 15);
        g.fillStyle(0x3b3034, 1);
        g.fillRect(-16, -10, 32, 14);
        g.fillTriangle(-19, -10, -10, -46, 0, -10);
        g.fillTriangle(19, -10, 10, -46, 0, -10);
        g.fillStyle(0x5e4548, 1);
        g.fillTriangle(-14, -12, 0, -42, 14, -12);
        g.fillStyle(0xb78355, 0.9);
        g.fillRect(-2, -26, 4, 12);
        break;
      case 'desk':
        g.fillStyle(0x3b2c21, 1);
        g.fillRect(-16, -12, 32, 9);
        g.fillRect(-14, -3, 4, 10);
        g.fillRect(10, -3, 4, 10);
        g.fillStyle(0xcbbd94, 0.85);
        g.fillRect(-7, -10, 12, 3);
        g.fillRect(-3, -14, 8, 3);
        break;
      case 'shelf':
        g.fillStyle(0x3b2c21, 1);
        g.fillRect(-18, -32, 36, 36);
        g.fillStyle(0x5a4530, 1);
        for (let i = 0; i < 3; i++) g.fillRect(-16, -28 + i * 10, 32, 2);
        g.fillStyle(0x9a7550, 0.8);
        g.fillRect(-14, -25, 4, 6);
        g.fillRect(-7, -25, 5, 6);
        g.fillRect(3, -15, 4, 6);
        g.fillRect(9, -5, 5, 5);
        break;
      case 'counter':
        g.fillStyle(0x4d3928, 1);
        g.fillRect(-24, -18, 48, 16);
        g.fillStyle(0x6f5135, 1);
        g.fillRect(-26, -20, 52, 5);
        g.fillStyle(0xb08a52, 0.7);
        g.fillRect(-10, -30, 20, 4);
        break;
      case 'crate':
        g.fillStyle(0x4e3a27, 1);
        g.fillRect(-10, -16, 20, 18);
        g.lineStyle(1, 0x2d241c, 1);
        g.strokeRect(-10, -16, 20, 18);
        g.lineBetween(-10, -16, 10, 2);
        break;
      case 'table':
        g.fillStyle(0x463628, 1);
        g.fillEllipse(0, -6, 36, 16);
        g.fillRect(-3, -2, 6, 10);
        g.fillStyle(0xd0b57d, 0.5);
        g.fillCircle(-8, -9, 3);
        g.fillCircle(7, -7, 3);
        break;
      case 'pew':
        g.fillStyle(0x3a2d23, 1);
        g.fillRect(-20, -10, 40, 6);
        g.fillRect(-18, -4, 4, 8);
        g.fillRect(14, -4, 4, 8);
        break;
      case 'altar':
        g.fillStyle(0x3b3731, 0.5);
        g.fillEllipse(0, 3, 42, 13);
        g.fillStyle(0x5c5a50, 1);
        g.fillRect(-18, -10, 36, 13);
        g.fillStyle(0x726f61, 1);
        g.fillRect(-14, -18, 28, 8);
        g.fillStyle(0xd3bb7a, 0.9);
        g.fillCircle(0, -21, 4);
        {
          const glow = this.add.image(0, -21, 'glow').setTint(0xd9c58c).setAlpha(0.25).setScale(0.7).setBlendMode(Phaser.BlendModes.ADD);
          container.add(glow);
        }
        break;
      case 'root':
        g.lineStyle(7, 0x473528, 1);
        g.beginPath();
        g.moveTo(-22, 0);
        g.lineTo(-12, -6);
        g.lineTo(-2, -3);
        g.lineTo(10, -10);
        g.lineTo(22, -5);
        g.strokePath();
        g.lineStyle(4, 0x5a4634, 1);
        g.beginPath();
        g.moveTo(-14, 0);
        g.lineTo(-7, -10);
        g.strokePath();
        break;
      case 'stone':
        g.fillStyle(0x37382f, 0.5);
        g.fillEllipse(0, 2, 32, 11);
        g.fillStyle(0x6a6959, 1);
        g.fillEllipse(-6, -8, 20, 18);
        g.fillStyle(0x817d68, 0.6);
        g.fillEllipse(-9, -12, 10, 7);
        g.lineStyle(1, 0x9dbb8a, 0.5);
        g.lineBetween(-2, -18, 0, -25);
        g.lineBetween(4, -15, 6, -22);
        break;
      case 'arch':
        g.fillStyle(0x4c4b41, 1);
        g.fillRect(-24, -34, 9, 36);
        g.fillRect(15, -34, 9, 36);
        g.fillStyle(0x5d5c50, 1);
        g.fillRect(-28, -38, 56, 7);
        g.fillStyle(0x2a2d26, 0.8);
        g.fillRect(-15, -31, 30, 24);
        break;
      case 'antler':
        g.fillStyle(0x2d281f, 1);
        g.fillRect(-3, -44, 6, 46);
        g.lineStyle(4, 0x3a3225, 1);
        g.lineBetween(0, -36, -17, -54);
        g.lineBetween(0, -28, 18, -46);
        g.lineBetween(-17, -54, -26, -60);
        g.lineBetween(18, -46, 27, -54);
        g.fillStyle(0x9a794b, 0.8);
        g.fillCircle(0, -11, 6);
        break;
      case 'log':
        g.fillStyle(0x4f3a27, 1);
        g.fillRoundedRect(-25, -9, 50, 12, 6);
        g.fillStyle(0x765636, 1);
        g.fillCircle(24, -3, 6);
        g.fillStyle(0x3a2b1e, 1);
        g.fillCircle(24, -3, 3);
        g.lineStyle(1, 0x34261a, 0.7);
        g.lineBetween(-18, -5, 10, -5);
        break;
      case 'mushroom':
        g.fillStyle(0x776a83, 1);
        g.fillRect(-2, -10, 4, 12);
        g.fillStyle(0x9a84b4, 1);
        g.fillEllipse(0, -12, 16, 8);
        g.fillStyle(0xd2b9e5, 0.7);
        g.fillCircle(-4, -14, 1.5);
        g.fillCircle(4, -12, 1.2);
        break;
      default:
        g.fillStyle(tint, 0.7);
        g.fillEllipse(0, 0, 26, 12);
    }
  }

  private addFirelight(x: number, y: number): void {
    const { x: px, y: py } = project(x, y, this.originX, this.originY);
    const glow = this.add.image(px, py - 8, 'glow').setTint(0xff8b4a).setAlpha(0.3).setScale(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(300 + (x + y) * 10);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.18, to: 0.38 },
      scale: { from: 0.75, to: 1.02 },
      duration: 620 + (x % 5) * 90,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private addMarkers(game: GameState): void {
    for (const def of this.map.interactables) {
      const { x: px, y: py } = project(def.x, def.y, this.originX, this.originY);
      const container = this.add.container(px, py - 34);
      const color = kindColor[def.kind] ?? 0xd2b06b;
      const glow = this.add.image(0, 0, 'glow').setTint(color).setAlpha(0.22).setScale(0.42).setBlendMode(Phaser.BlendModes.ADD);
      const ring = this.add.graphics();
      ring.fillStyle(0x100e10, 0.72);
      ring.fillCircle(0, 0, 12);
      ring.lineStyle(1.5, color, 0.95);
      ring.strokeCircle(0, 0, 11);
      ring.lineStyle(1, color, 0.32);
      ring.strokeCircle(0, 0, 16);
      const glyph = this.add
        .text(0, 0, kindGlyph[def.kind] ?? '◆', {
          fontFamily: 'serif',
          fontSize: '14px',
          color: `#${color.toString(16).padStart(6, '0')}`
        })
        .setOrigin(0.5);
      const label = this.add
        .text(0, -23, def.label, {
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: '12px',
          color: '#f0e4c9',
          backgroundColor: 'rgba(10,8,10,0.82)',
          padding: { left: 6, right: 6, top: 3, bottom: 3 }
        })
        .setOrigin(0.5, 1)
        .setAlpha(0)
        .setDepth(1);
      container.add([glow, ring, glyph, label]);
      container.setDepth(3200 + (def.x + def.y) * 4);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-24, -30, 48, 48),
        Phaser.Geom.Rectangle.Contains
      );
      container.on('pointerover', () => {
        label.setAlpha(1);
        this.tweens.add({ targets: container, scale: 1.12, duration: 120 });
        this.input.setDefaultCursor('pointer');
      });
      container.on('pointerout', () => {
        label.setAlpha(0);
        this.tweens.add({ targets: container, scale: 1, duration: 120 });
        this.input.setDefaultCursor('default');
      });
      container.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.markerPointerHandled = true;
        this.approachInteractable(def);
      });

      this.tweens.add({
        targets: [glow],
        alpha: { from: 0.13, to: 0.4 },
        scale: { from: 0.34, to: 0.52 },
        duration: 1250 + ((def.x * 13 + def.y * 7) % 600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.markerEntries.set(def.id, {
        container,
        label,
        def,
        baseY: py - 34,
        glimmer: Boolean(def.hidden)
      });
    }
    this.syncMarkers(game);
  }

  private addPlayer(game: GameState): void {
    const character = game.characters[game.playerId];
    if (!character) return;
    const { x, y } = game.world;
    const pos = project(x, y, this.originX, this.originY);
    const figure = this.createFigure(character.portrait, true, character.classId);
    figure.container.setPosition(pos.x, pos.y);
    figure.container.setDepth(2000 + (x + y) * 10);
    figure.container.setScale(1.18);
    this.player = figure.container;
    this.playerBody = figure.body;

    const ring = this.add.graphics();
    ring.lineStyle(2, 0xd8b46f, 0.75);
    ring.strokeEllipse(0, 0, 34, 17);
    ring.lineStyle(1, 0xffe1a3, 0.28);
    ring.strokeEllipse(0, 0, 42, 21);
    figure.container.addAt(ring, 0);
    this.tweens.add({ targets: ring, alpha: { from: 0.35, to: 0.9 }, duration: 1600, yoyo: true, repeat: -1 });

    // A small clasp of companions who walk behind the player.
    const party = game.party.filter((id) => id !== game.playerId).slice(0, 3);
    const offsets = [
      { x: -1, y: 1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 }
    ];
    party.forEach((id, index) => {
      const companion = game.characters[id];
      if (!companion) return;
      const spot = offsets[index];
      const bx = this.canStand(x + spot.x, y + spot.y) ? x + spot.x : x;
      const by = this.canStand(x + spot.x, y + spot.y) ? y + spot.y : y;
      const follower = this.createFigure(companion.portrait, false, companion.classId).container;
      const fp = project(bx, by, this.originX, this.originY);
      follower.setPosition(fp.x + (index - 1) * 7, fp.y);
      follower.setDepth(1990 + (bx + by) * 10);
      follower.setScale(1.06);
      this.followers.push(follower);
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private createFigure(appearance: Appearance, isPlayer: boolean, classId?: string): FigureParts {
    const container = this.add.container(0, 0);
    const body = this.add.container(0, 0);
    container.add(body);
    const g = this.add.graphics();
    body.add(g);
    const skin = colorFromHex(appearance.skin, 0xb98f76);
    const hair = colorFromHex(appearance.hair, 0x3a2922);
    const outfit = colorFromHex(appearance.outfit, 0x3f3a36);
    const accent = colorFromHex(appearance.accent, 0xb08b51);

    g.fillStyle(0x080708, 0.42);
    g.fillEllipse(0, 3, 27, 11);
    g.fillStyle(accent, isPlayer ? 0.28 : 0.18);
    g.fillEllipse(0, 2, 34, 14);

    // cloak
    g.fillStyle(outfit, 1);
    g.fillTriangle(-10, -24, 10, -24, 0, 0);
    g.fillStyle(shade(outfit, 12), 1);
    g.fillTriangle(-7, -24, 0, -24, -1, -5);
    g.lineStyle(1, accent, 0.58);
    g.lineBetween(-8, -21, 0, -1);
    g.lineBetween(8, -21, 0, -1);

    // arms
    g.fillStyle(shade(outfit, -14), 1);
    g.fillRoundedRect(-12, -21, 4, 12, 2);
    g.fillRoundedRect(8, -21, 4, 12, 2);
    g.fillStyle(skin, 1);
    g.fillCircle(-10, -9, 2.2);
    g.fillCircle(10, -9, 2.2);

    // head
    g.fillStyle(skin, 1);
    g.fillCircle(0, -29, 7.2);
    g.fillStyle(hair, 1);
    g.fillEllipse(0, -33, 14, 9);
    if (appearance.hairStyle % 3 === 1) {
      g.fillCircle(0, -38, 4);
    } else if (appearance.hairStyle % 3 === 2) {
      g.fillEllipse(-7, -29, 4, 12);
      g.fillEllipse(7, -29, 4, 12);
    }
    g.fillStyle(accent, 0.95);
    g.fillCircle(0, -29, 1.1);
    g.fillCircle(-2.5, -30, 0.7);
    g.fillCircle(2.5, -30, 0.7);

    // weapon or focus
    if (classId === 'warrior' || classId === 'cleric') {
      g.lineStyle(2, 0xb8b1a1, 1);
      g.lineBetween(13, -27, 16, -2);
      g.lineStyle(3, accent, 0.8);
      g.lineBetween(11, -20, 15, -20);
    } else if (classId === 'rogue') {
      g.lineStyle(2, 0xcbd0cd, 0.9);
      g.lineBetween(13, -16, 17, -4);
    } else if (classId === 'ranger') {
      g.lineStyle(1.5, 0x8a6b43, 1);
      g.beginPath();
      g.arc(14, -16, 10, -1.1, 1.1);
      g.strokePath();
    } else {
      g.lineStyle(2, 0x80634a, 1);
      g.lineBetween(13, -28, 15, 0);
      g.fillStyle(accent, 0.8);
      g.fillCircle(13, -31, 3);
    }

    this.tweens.add({
      targets: body,
      y: { from: 0, to: -3 },
      duration: isPlayer ? 1500 : 1750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return { container, body };
  }

  private addWeather(): void {
    const weather = this.map.weather ?? 'none';
    if (weather === 'none') return;
    const width = this.scale.width;
    const height = this.scale.height;

    if (weather === 'ash') {
      const emitter = this.add.particles(0, 0, 'dot', {
        x: { min: -100, max: width + 100 },
        y: -30,
        lifespan: { min: 4500, max: 9000 },
        speedX: { min: -12, max: 18 },
        speedY: { min: 18, max: 42 },
        scale: { start: 0.55, end: 0.12 },
        alpha: { start: 0.42, end: 0 },
        tint: [0x8d8175, 0x5e564f, 0xb1a18b],
        frequency: 90,
        quantity: 1,
        blendMode: Phaser.BlendModes.NORMAL
      });
      emitter.setScrollFactor(0).setDepth(7000);
      this.weather.push(emitter);
    } else if (weather === 'rain') {
      const emitter = this.add.particles(0, 0, 'rain', {
        x: { min: -100, max: width + 100 },
        y: -60,
        lifespan: 1600,
        speedX: { min: -80, max: -30 },
        speedY: { min: 480, max: 660 },
        scale: { start: 0.8, end: 0.6 },
        alpha: { start: 0.34, end: 0.05 },
        tint: 0xaebfc6,
        frequency: 34,
        quantity: 2,
        rotate: 12
      });
      emitter.setScrollFactor(0).setDepth(7000);
      this.weather.push(emitter);
    } else if (weather === 'fireflies') {
      const emitter = this.add.particles(0, 0, 'glow', {
        x: { min: 0, max: width },
        y: { min: height * 0.3, max: height },
        lifespan: { min: 5000, max: 9000 },
        speedX: { min: -12, max: 12 },
        speedY: { min: -16, max: -3 },
        scale: { start: 0.07, end: 0.02 },
        alpha: { start: 0.7, end: 0 },
        tint: [0xd6c775, 0x91c98c, 0xe6d99a],
        frequency: 260,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD
      });
      emitter.setScrollFactor(0).setDepth(7000);
      this.weather.push(emitter);
    } else if (weather === 'dust') {
      const emitter = this.add.particles(0, 0, 'dot', {
        x: { min: -50, max: width + 50 },
        y: { min: 0, max: height },
        lifespan: { min: 5000, max: 10000 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -10, max: 4 },
        scale: { start: 0.32, end: 0.05 },
        alpha: { start: 0.26, end: 0 },
        tint: 0xb7a98d,
        frequency: 170
      });
      emitter.setScrollFactor(0).setDepth(7000);
      this.weather.push(emitter);
    }
  }

  private syncMarkers(game: GameState): void {
    for (const [id, entry] of this.markerEntries) {
      const { def } = entry;
      const normal = isInteractableVisible(game, def);
      const glimmer = !normal && Boolean(def.hidden && isHiddenGlimmer(game, def, game.world.x, game.world.y));
      const visible = normal || glimmer;
      entry.container.setVisible(visible);
      entry.glimmer = Boolean(glimmer);
      if (visible) {
        entry.container.setAlpha(glimmer ? 0.45 : 1);
        entry.container.setScale(glimmer ? 0.86 : 1);
        if (glimmer) {
          entry.label.setText('?');
          entry.label.setAlpha(0.7);
        } else if (entry.label.text === '?') {
          entry.label.setText(def.label);
          entry.label.setAlpha(0);
        }
        entry.container.setDepth(3200 + (def.x + def.y) * 4);
      }
    }
  }

  private syncStore(state: ReturnType<typeof useGameStore.getState>, previous: ReturnType<typeof useGameStore.getState>): void {
    const game = state.game;
    if (!game) return;
    const locationChanged = previous.game?.world.locationId !== game.world.locationId;
    if (locationChanged || this.mapId !== game.world.locationId || !this.player) {
      this.buildWorld();
      this.cameras.main.fadeIn(320, 8, 7, 9);
      return;
    }

    this.syncMarkers(game);

    if (!this.moving) {
      const pos = project(game.world.x, game.world.y, this.originX, this.originY);
      this.player.setPosition(pos.x, pos.y);
      this.player.setDepth(2000 + (game.world.x + game.world.y) * 10);
      this.updateFollowers(game);
    } else if (state.dialogue || state.modal || state.combat || game.world.locationId !== this.mapId) {
      this.stopWalk();
    }
  }

  private updateFollowers(game: GameState): void {
    const party = game.party.filter((id) => id !== game.playerId).slice(0, 3);
    const offsets = [
      { x: -1, y: 1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 }
    ];
    this.followers.forEach((follower, index) => {
      const id = party[index];
      const character = id ? game.characters[id] : null;
      if (!character) {
        follower.setVisible(false);
        return;
      }
      follower.setVisible(true);
      const spot = offsets[index];
      const bx = this.canStand(game.world.x + spot.x, game.world.y + spot.y)
        ? game.world.x + spot.x
        : game.world.x;
      const by = this.canStand(game.world.x + spot.x, game.world.y + spot.y)
        ? game.world.y + spot.y
        : game.world.y;
      const pos = project(bx, by, this.originX, this.originY);
      follower.setDepth(1990 + (bx + by) * 10);
      this.tweens.add({
        targets: follower,
        x: pos.x + (index - 1) * 7,
        y: pos.y + index * 2,
        duration: 230,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private canStand(x: number, y: number): boolean {
    if (!this.map) return false;
    const ch = tileAt(this.map.rows, x, y);
    return isWalkable(ch);
  }

  private approachInteractable(def: InteractableDef): void {
    if (!this.canControl()) return;
    const state = useGameStore.getState();
    const game = state.game;
    if (!game) return;
    const distance = Math.max(Math.abs(def.x - game.world.x), Math.abs(def.y - game.world.y));
    if (distance <= 1) {
      this.pendingInteract = null;
      state.interact(def.id);
      return;
    }
    const candidates: { x: number; y: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = def.x + dx;
        const y = def.y + dy;
        if (this.canStand(x, y)) candidates.push({ x, y });
      }
    }
    candidates.sort(
      (a, b) =>
        Math.max(Math.abs(a.x - game.world.x), Math.abs(a.y - game.world.y)) -
        Math.max(Math.abs(b.x - game.world.x), Math.abs(b.y - game.world.y))
    );
    for (const candidate of candidates) {
      const path = this.findPath(game.world.x, game.world.y, candidate.x, candidate.y);
      if (path.length) {
        this.pendingInteract = def.id;
        this.walkPath(path);
        return;
      }
    }
    state.notify('You cannot find a way to that place from here.', 'warning');
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.markerPointerHandled) {
      this.markerPointerHandled = false;
      return;
    }
    if (!this.canControl()) return;
    const tile = unproject(pointer.worldX, pointer.worldY, this.originX, this.originY);
    if (!this.canStand(tile.x, tile.y)) return;
    const state = useGameStore.getState();
    const game = state.game;
    if (!game) return;
    if (tile.x === game.world.x && tile.y === game.world.y) return;
    const path = this.findPath(game.world.x, game.world.y, tile.x, tile.y);
    if (path.length) {
      this.pendingInteract = null;
      this.walkPath(path);
    }
  }

  private handleWheel(pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number): void {
    if (!this.canControl()) return;
    const camera = this.cameras.main;
    camera.zoom = Phaser.Math.Clamp(camera.zoom - dy * 0.0008, this.minZoom(), 1.35);
    void pointer;
  }

  private canControl(): boolean {
    const state = useGameStore.getState();
    return Boolean(
      state.game &&
        state.screen === 'game' &&
        !state.combat &&
        !state.dialogue &&
        !state.modal
    );
  }

  private findPath(sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
    const key = (x: number, y: number) => `${x},${y}`;
    const queue: { x: number; y: number }[] = [{ x: sx, y: sy }];
    const previous = new Map<string, string | null>();
    previous.set(key(sx, sy), null);
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    let found = false;
    while (queue.length) {
      const current = queue.shift()!;
      if (current.x === tx && current.y === ty) {
        found = true;
        break;
      }
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const k = key(nx, ny);
        if (previous.has(k)) continue;
        if (!this.canStand(nx, ny)) continue;
        previous.set(k, key(current.x, current.y));
        queue.push({ x: nx, y: ny });
      }
    }
    if (!found) return [];
    const path: { x: number; y: number }[] = [];
    let cursor: string | null = key(tx, ty);
    let guard = 0;
    while (cursor && guard < 90) {
      const [x, y] = cursor.split(',').map(Number);
      path.unshift({ x, y });
      cursor = previous.get(cursor) ?? null;
      guard++;
    }
    path.shift();
    return path;
  }

  private walkPath(path: { x: number; y: number }[]): void {
    if (!this.player) return;
    this.tweens.killTweensOf(this.player);
    this.path = path;
    this.moving = true;
    this.stepWalk();
  }

  private stepWalk(): void {
    if (!this.player || !this.moving) return;
    const next = this.path.shift();
    if (!next) {
      this.moving = false;
      const game = useGameStore.getState().game;
      if (game && this.player) {
        const pos = project(game.world.x, game.world.y, this.originX, this.originY);
        this.player.setPosition(pos.x, pos.y);
        this.updateFollowers(game);
      }
      if (this.pendingInteract) {
        const target = this.pendingInteract;
        this.pendingInteract = null;
        useGameStore.getState().interact(target);
      }
      return;
    }
    const pos = project(next.x, next.y, this.originX, this.originY);
    this.player.setDepth(2000 + (next.x + next.y) * 10);
    this.tweens.add({
      targets: this.player,
      x: pos.x,
      y: pos.y,
      duration: 128,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!this.moving) return;
        useGameStore.getState().setPlayerPosition(next.x, next.y);
        const game = useGameStore.getState().game;
        if (game) this.updateFollowers(game);
        const state = useGameStore.getState();
        if (state.combat || state.dialogue || state.modal) {
          this.moving = false;
          this.path = [];
          return;
        }
        this.stepWalk();
      }
    });
  }

  private stopWalk(): void {
    this.moving = false;
    this.path = [];
    this.pendingInteract = null;
    if (this.player) this.tweens.killTweensOf(this.player);
  }

  private minZoom(): number {
    const width = this.scale.width;
    return width < 700 ? 1.0 : 0.72;
  }

  private desiredZoom(): number {
    const width = this.scale.width;
    const height = this.scale.height;
    if (width < 700) {
      // Portrait screens trade horizontal breadth for readable tiles and a
      // vertically filled scene. The camera follows the player.
      const portraitFit = (height - 70) / Math.max(320, this.worldHeight * 0.9);
      return Phaser.Math.Clamp(portraitFit, 1.0, 1.8);
    }
    const fitX = (width - 60) / Math.max(700, this.worldWidth * 0.72);
    const fitY = (height - 80) / Math.max(560, this.worldHeight * 0.72);
    const fit = Math.min(fitX, fitY);
    const maxZoom = this.worldWidth < 1000 ? 1.65 : 1.12;
    return Phaser.Math.Clamp(fit, this.minZoom(), maxZoom);
  }

  private updateCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(-160, -140, this.worldWidth + 320, this.worldHeight + 300);
    camera.setZoom(this.desiredZoom());
    if (this.player) camera.centerOn(this.player.x, this.player.y);
  }

  private handleResize(): void {
    this.cameras.main.setZoom(this.desiredZoom());
    for (const weather of this.weather) {
      // Weather emitters are screen-space; nothing to do but keep depth stable.
      weather.setDepth(7000);
    }
  }

  private directionStep(vx: number, vy: number): { x: number; y: number } | null {
    if (Math.abs(vx) < 0.25 && Math.abs(vy) < 0.25) return null;
    if (Math.abs(vx) > Math.abs(vy)) {
      return vx > 0 ? { x: 1, y: -1 } : { x: -1, y: 1 };
    }
    return vy > 0 ? { x: 1, y: 1 } : { x: -1, y: -1 };
  }

  private trySingleStep(dx: number, dy: number): void {
    if (!this.canControl() || this.moving) return;
    const game = useGameStore.getState().game;
    if (!game) return;
    const nx = game.world.x + dx;
    const ny = game.world.y + dy;
    if (!this.canStand(nx, ny)) return;
    this.walkPath([{ x: nx, y: ny }]);
  }

  update(time: number): void {
    if (!this.player || !this.canControl()) return;
    if (time < this.nextStepAt || this.moving) return;
    const keyboardDir =
      this.keys.up?.isDown || this.keys.w?.isDown
        ? { x: -1, y: -1 }
        : this.keys.down?.isDown || this.keys.s?.isDown
          ? { x: 1, y: 1 }
          : this.keys.left?.isDown || this.keys.a?.isDown
            ? { x: -1, y: 1 }
            : this.keys.right?.isDown || this.keys.d?.isDown
              ? { x: 1, y: -1 }
              : null;
    const direction = keyboardDir ?? this.directionStep(this.joystick.x, this.joystick.y);
    if (!direction) return;
    this.nextStepAt = time + 175;
    this.trySingleStep(direction.x, direction.y);
  }

  private handleShutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.offStick?.();
    this.offStick = null;
    this.scale.off('resize', this.handleResize, this);
    this.input.off('pointerdown', this.handlePointer, this);
    this.input.off('wheel', this.handleWheel, this);
    this.stopWalk();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.weather = [];
    this.markerEntries.clear();
    this.player = null;
    this.playerBody = null;
    this.followers = [];
  }
}
