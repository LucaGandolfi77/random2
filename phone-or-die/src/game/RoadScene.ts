import Phaser from 'phaser';
import { useGameStore } from '@/core/gameStore';
import type { GameState } from '@/core/types';
import {
  cityRows,
  CITY_HEIGHT,
  CITY_WIDTH,
  TILE,
  horizontalRoads,
  verticalRoads,
  interactables,
  lamps,
  shadowSpots,
  streetProps,
  isWalkableTile,
  homeGlow
} from '@/data/road';
import { stageForThreat } from '@/systems/threat';
import { gameBus, type StickVector } from './bus';

const ASPHALT = 0x15181c;
const ASPHALT_LIGHT = 0x1c2025;
const SIDEWALK = 0x2d2b30;
const SIDEWALK_LIGHT = 0x37353a;
const BUILDING = 0x161517;
const BUILDING_LIGHT = 0x211f23;
const PARK = 0x19261d;
const PARK_LIGHT = 0x213224;

interface ShadowEntry {
  container: Phaser.GameObjects.Container;
  stage: number;
}

interface LampEntry {
  glow: Phaser.GameObjects.Image;
  pole: Phaser.GameObjects.Graphics;
}

const isAsphaltCell = (x: number, y: number): boolean => {
  const h = horizontalRoads.find((road) => y >= road.y && y < road.y + road.h);
  const v = verticalRoads.find((road) => x >= road.x && x < road.x + road.w);
  return Boolean(
    (h && y > h.y && y < h.y + h.h - 1) || (v && x > v.x && x < v.x + v.w - 1)
  );
};

export class RoadScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerGlow!: Phaser.GameObjects.Image;
  private flashlightGlow!: Phaser.GameObjects.Image;
  private homeGlowSprite!: Phaser.GameObjects.Image;
  private stalker!: Phaser.GameObjects.Container;
  private shieldAura!: Phaser.GameObjects.Image;
  private darkness!: Phaser.GameObjects.Rectangle;
  private shadows: ShadowEntry[] = [];
  private markers = new Map<string, Phaser.GameObjects.Container>();
  private lamps: LampEntry[] = [];
  private unsubscribe: (() => void) | null = null;
  private offStick: (() => void) | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private joystick: StickVector = { x: 0, y: 0 };
  private nextMoveAt = 0;
  private lastPlayer = { x: 10, y: 28 };
  private lastDirection = { x: 0, y: 1 };
  private shadowCloseness = 0;
  private shadowStage = 0;
  private lastStage = 0;
  private flickerTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Road');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#050506');
    this.input.mouse?.disableContextMenu();
    const current = useGameStore.getState().game;
    if (!current) {
      this.scene.start('Boot');
      return;
    }
    this.drawWorld(current);
    this.createPlayer(current);
    this.createShadows();
    this.createStalker();
    this.createMarkers(current);
    this.createWeather();
    this.setupCamera();

    this.keys = this.input.keyboard
      ? {
          w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
          down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
          left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
          right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
        }
      : {};

    this.unsubscribe = useGameStore.subscribe((state) => {
      if (state.game) this.syncState(state.game);
    });
    this.offStick = gameBus.on<StickVector>('stick', (vector) => {
      this.joystick = vector ?? { x: 0, y: 0 };
    });

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.syncState(current);
    this.cameras.main.fadeIn(500, 4, 4, 5);
    this.tweens.add({
      targets: this.playerGlow,
      alpha: { from: 0.18, to: 0.32 },
      scale: { from: 0.78, to: 1.12 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.flickerTimer = this.time.addEvent({
      delay: 4800,
      loop: true,
      callback: () => this.flickerLamps()
    });
  }

  private drawWorld(game: GameState): void {
    const ground = this.add.graphics().setDepth(0);

    for (let y = 0; y < CITY_HEIGHT; y++) {
      for (let x = 0; x < CITY_WIDTH; x++) {
        const ch = cityRows[y][x];
        const px = x * TILE;
        const py = y * TILE;
        const noise = (Math.sin(x * 12.17 + y * 5.31) + 1) * 3;

        if (ch === '#') {
          ground.fillStyle(this.shade(BUILDING, noise * 0.4), 1);
          ground.fillRect(px, py, TILE, TILE);
          ground.lineStyle(1, 0x090a0b, 0.7);
          ground.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
          const landmark =
            (x >= 8 && x <= 12 && y >= 24 && y <= 27) ||
            (x >= 35 && x <= 39 && y >= 0 && y <= 3);
          if (landmark) {
            ground.fillStyle(this.shade(BUILDING_LIGHT, noise), 1);
            ground.fillRect(px, py, TILE, TILE);
          } else {
            ground.fillStyle(BUILDING_LIGHT, 0.35);
            ground.fillRect(px + 4, py + 4, TILE - 8, TILE - 10);
          }
          const windowSeed = (x * 31 + y * 17) % 13;
          if (windowSeed === 0 || windowSeed === 3 || windowSeed === 5 || windowSeed === 9) {
            const lit = (x * 7 + y * 11) % 3 !== 0;
            ground.fillStyle(lit ? 0xd6a15e : 0x20282a, lit ? 0.4 : 0.55);
            ground.fillRect(px + 10, py + 11, TILE - 20, 13);
            ground.lineStyle(1, 0x0a0b0c, 0.8);
            ground.strokeRect(px + 10, py + 11, TILE - 20, 13);
            ground.lineBetween(px + TILE / 2, py + 11, px + TILE / 2, py + 24);
          }
        } else if (ch === 'D') {
          ground.fillStyle(0x2c211a, 1);
          ground.fillRect(px, py, TILE, TILE);
          ground.fillStyle(0x171b1a, 1);
          ground.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
          ground.fillStyle(0x6f7f76, 0.3);
          ground.fillRect(px + 8, py + 8, TILE - 16, 3);
          ground.fillStyle(0xb08a55, 0.7);
          ground.fillCircle(px + TILE - 12, py + TILE / 2, 2);
        } else if (ch === 'H') {
          ground.fillStyle(0x2b1e17, 1);
          ground.fillRect(px, py, TILE, TILE);
          ground.fillStyle(0x1a1614, 1);
          ground.fillRect(px + 4, py + 3, TILE - 8, TILE - 6);
          ground.fillStyle(0x724733, 1);
          ground.fillRect(px + 7, py + 6, TILE - 14, TILE - 9);
          ground.fillStyle(0xd2a361, 0.28);
          ground.fillRect(px + 10, py + 9, TILE - 20, 4);
          ground.fillStyle(0xd8b16e, 0.8);
          ground.fillCircle(px + TILE / 2, py + TILE - 13, 2.2);
        } else if (ch === 'p' || ch === 'x') {
          ground.fillStyle(this.shade(PARK, noise), 1);
          ground.fillRect(px, py, TILE, TILE);
          if ((x * 5 + y * 7) % 4 === 0) {
            ground.lineStyle(1, PARK_LIGHT, 0.7);
            ground.lineBetween(px + 8, py + 28, px + 13, py + 23);
            ground.lineBetween(px + 18, py + 31, px + 22, py + 26);
          }
          ground.lineStyle(1, 0x0e1712, 0.5);
          ground.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        } else if (ch === 'a') {
          ground.fillStyle(0x0d0f11, 1);
          ground.fillRect(px, py, TILE, TILE);
          ground.fillStyle(0x191a1d, 0.7);
          ground.fillRect(px + 6, py + 8, TILE - 12, 2);
          ground.fillStyle(0x32302e, 0.5);
          ground.fillRect(px + 4, py + 30, TILE - 8, 3);
        } else if (ch === 's' || ch === 'o') {
          const surface = ch === 'o' && isAsphaltCell(x, y) ? '.' : 's';
          if (surface === '.') {
            this.drawAsphalt(ground, px, py, noise);
          } else {
            ground.fillStyle(this.shade(SIDEWALK, noise), 1);
            ground.fillRect(px, py, TILE, TILE);
            ground.lineStyle(1, 0x1a191c, 0.65);
            ground.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
            ground.lineStyle(1, SIDEWALK_LIGHT, 0.22);
            ground.lineBetween(px + 2, py + 8, px + TILE - 2, py + 8);
          }
        } else {
          this.drawAsphalt(ground, px, py, noise);
          if (ch === 'c') {
            ground.fillStyle(0xc5bda9, 0.3);
            for (let offset = 6; offset < TILE; offset += 12) {
              ground.fillRect(px + offset, py + 4, 5, TILE - 8);
            }
          }
        }
      }
    }

    this.drawRoadMarkings();
    this.drawStreetDetails();
    this.drawProps();
    this.drawSigns();

    for (const lamp of lamps) {
      const px = lamp.x * TILE + TILE / 2;
      const py = lamp.y * TILE + TILE / 2;
      const pole = this.add.graphics().setDepth(45);
      pole.lineStyle(3, 0x181b1d, 1);
      pole.lineBetween(px, py + 12, px, py - 18);
      pole.fillStyle(0x202426, 1);
      pole.fillCircle(px, py - 19, 5);
      pole.fillStyle(0xffd493, 0.85);
      pole.fillCircle(px, py - 19, 2);
      const glow = this.add
        .image(px, py - 15, 'glow')
        .setTint(lamp.color)
        .setAlpha(0.46)
        .setScale(lamp.radius / 68)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(40);
      this.lamps.push({ glow, pole });
      if (!game.powerOn) glow.setVisible(false);
    }

    this.homeGlowSprite = this.add
      .image(homeGlow.x * TILE + TILE / 2, homeGlow.y * TILE + TILE / 2, 'glow')
      .setTint(0xffc07b)
      .setScale(1.6)
      .setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(41);
    this.tweens.add({
      targets: this.homeGlowSprite,
      alpha: { from: 0.12, to: 0.32 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private drawAsphalt(g: Phaser.GameObjects.Graphics, px: number, py: number, noise: number): void {
    g.fillStyle(this.shade(ASPHALT, noise * 0.7), 1);
    g.fillRect(px, py, TILE, TILE);
    g.fillStyle(ASPHALT_LIGHT, 0.18);
    g.fillRect(px + 2, py + 3, TILE - 8, 1);
    if ((px / TILE + py / TILE) % 7 === 0) {
      g.lineStyle(1, 0x24262a, 0.35);
      g.lineBetween(px + 9, py + 31, px + 17, py + 24);
    }
  }

  private drawRoadMarkings(): void {
    const marks = this.add.graphics().setDepth(24);
    marks.lineStyle(2, 0xc2b27d, 0.18);
    for (const road of horizontalRoads) {
      const centerY = (road.y + 1.5) * TILE;
      for (let x = 2; x < CITY_WIDTH - 2; x += 3) {
        marks.lineBetween(x * TILE, centerY, (x + 1.2) * TILE, centerY);
      }
    }
    for (const road of verticalRoads) {
      const centerX = (road.x + 1.5) * TILE;
      for (let y = 2; y < CITY_HEIGHT - 2; y += 3) {
        marks.lineBetween(centerX, y * TILE, centerX, (y + 1.2) * TILE);
      }
    }

    // Crosswalks at the main intersections.
    for (const h of horizontalRoads) {
      for (const v of verticalRoads) {
        const x = (v.x + 1.5) * TILE;
        const y = h.y * TILE - 2;
        marks.fillStyle(0xbeb7a5, 0.22);
        for (let stripe = -TILE; stripe <= TILE; stripe += 11) {
          marks.fillRect(x + stripe, y - 5, 5, 10);
          marks.fillRect(x + stripe, y + TILE * 3, 5, 10);
        }
      }
    }
  }

  private drawStreetDetails(): void {
    const details = this.add.graphics().setDepth(30);
    // Curbs around sidewalks.
    for (let y = 0; y < CITY_HEIGHT; y++) {
      for (let x = 0; x < CITY_WIDTH; x++) {
        const ch = cityRows[y][x];
        if (ch !== 's') continue;
        const px = x * TILE;
        const py = y * TILE;
        const above = cityRows[y - 1]?.[x];
        const below = cityRows[y + 1]?.[x];
        const left = cityRows[y]?.[x - 1];
        const right = cityRows[y]?.[x + 1];
        details.lineStyle(2, 0x0b0c0d, 0.65);
        if (above === '.' || above === 'o') details.lineBetween(px, py + 1, px + TILE, py + 1);
        if (below === '.' || below === 'o') details.lineBetween(px, py + TILE - 1, px + TILE, py + TILE - 1);
        if (left === '.' || left === 'o') details.lineBetween(px + 1, py, px + 1, py + TILE);
        if (right === '.' || right === 'o') details.lineBetween(px + TILE - 1, py, px + TILE - 1, py + TILE);
      }
    }

    // Puddles and drain grates.
    details.fillStyle(0x2c3b40, 0.32);
    details.fillEllipse(17 * TILE + 22, 29 * TILE + 25, 34, 10);
    details.fillEllipse(35 * TILE + 18, 22 * TILE + 20, 26, 8);
    details.fillEllipse(8 * TILE + 23, 13 * TILE + 30, 22, 7);
    details.lineStyle(1, 0x4f5554, 0.35);
    details.strokeEllipse(17 * TILE + 22, 29 * TILE + 25, 34, 10);
    details.strokeEllipse(35 * TILE + 18, 22 * TILE + 20, 26, 8);
    details.strokeEllipse(8 * TILE + 23, 13 * TILE + 30, 22, 7);
  }

  private drawProps(): void {
    for (const prop of streetProps) {
      const px = prop.x * TILE;
      const py = prop.y * TILE;
      if (prop.type === 'car') {
        const g = this.add.graphics().setDepth(70 + prop.y);
        g.fillStyle(0x050607, 0.45);
        g.fillEllipse(px + TILE / 2, py + TILE - 5, TILE - 3, 8);
        g.fillStyle(prop.color, 1);
        g.fillRoundedRect(px + 3, py + 8, TILE - 6, TILE - 15, 7);
        g.fillStyle(this.shade(prop.color, 20), 0.65);
        g.fillRoundedRect(px + 8, py + 11, TILE - 16, 11, 4);
        g.fillStyle(0x101619, 0.9);
        g.fillRoundedRect(px + 9, py + 13, TILE - 18, 8, 3);
        g.fillStyle(0x0a0b0c, 1);
        g.fillCircle(px + 9, py + TILE - 10, 4);
        g.fillCircle(px + TILE - 9, py + TILE - 10, 4);
        g.fillStyle(0x8e2f2b, 0.65);
        g.fillRect(px + 4, py + 14, 3, 5);
        g.fillStyle(0xcaa36b, 0.35);
        g.fillRect(px + TILE - 7, py + 14, 3, 5);
      } else if (prop.type === 'bench') {
        const g = this.add.graphics().setDepth(70 + prop.y);
        g.fillStyle(0x070708, 0.4);
        g.fillEllipse(px + TILE / 2, py + TILE - 5, TILE - 7, 7);
        g.lineStyle(2, 0x17191a, 1);
        g.lineBetween(px + 8, py + 17, px + 8, py + TILE - 7);
        g.lineBetween(px + TILE - 8, py + 17, px + TILE - 8, py + TILE - 7);
        g.fillStyle(prop.color, 1);
        g.fillRoundedRect(px + 4, py + 12, TILE - 8, 10, 2);
        g.fillRoundedRect(px + 4, py + 24, TILE - 8, 8, 2);
        g.lineStyle(1, 0x6e5940, 0.6);
        g.lineBetween(px + 6, py + 16, px + TILE - 6, py + 16);
      } else if (prop.type === 'dumpster') {
        const g = this.add.graphics().setDepth(70 + prop.y);
        g.fillStyle(0x040506, 0.5);
        g.fillEllipse(px + TILE / 2, py + TILE - 4, TILE - 3, 8);
        g.fillStyle(prop.color, 1);
        g.fillRoundedRect(px + 3, py + 9, TILE - 6, TILE - 15, 3);
        g.fillStyle(0x1b2421, 1);
        g.fillRect(px + 7, py + 13, TILE - 14, 8);
        g.lineStyle(1, 0x4b5b54, 0.4);
        g.strokeRect(px + 3, py + 9, TILE - 6, TILE - 15);
      } else if (prop.type === 'phone') {
        const g = this.add.graphics().setDepth(70 + prop.y);
        g.fillStyle(0x050607, 0.45);
        g.fillEllipse(px + TILE / 2, py + TILE - 5, TILE - 5, 7);
        g.fillStyle(prop.color, 1);
        g.fillRoundedRect(px + 9, py + 2, TILE - 18, TILE - 8, 4);
        g.fillStyle(0x0e1516, 1);
        g.fillRoundedRect(px + 12, py + 6, TILE - 24, TILE - 20, 2);
        g.fillStyle(0x9bc2bd, 0.25);
        g.fillRect(px + 14, py + 8, TILE - 28, 3);
        g.fillStyle(0xb5aca0, 0.45);
        g.fillRect(px + 19, py + 13, 6, 8);
      } else if (prop.type === 'bin') {
        const g = this.add.graphics().setDepth(70 + prop.y);
        g.fillStyle(prop.color, 1);
        g.fillRoundedRect(px + 12, py + 12, TILE - 24, TILE - 18, 3);
        g.fillStyle(0x151918, 1);
        g.fillRect(px + 15, py + 8, TILE - 30, 5);
      } else if (prop.type === 'hydrant') {
        const g = this.add.graphics().setDepth(70 + prop.y);
        g.fillStyle(prop.color, 1);
        g.fillRoundedRect(px + 18, py + 16, 9, 14, 3);
        g.fillStyle(this.shade(prop.color, 25), 0.8);
        g.fillCircle(px + 22, py + 18, 3);
      } else if (prop.type === 'tree') {
        const g = this.add.graphics().setDepth(80 + prop.y);
        g.fillStyle(0x060707, 0.4);
        g.fillEllipse(px + TILE / 2, py + TILE - 6, TILE - 8, 10);
        g.fillStyle(0x17100e, 1);
        g.fillRect(px + TILE / 2 - 2, py + 18, 4, TILE - 23);
        g.fillStyle(0x12241a, 1);
        g.fillCircle(px + TILE / 2, py + 14, 18);
        g.fillStyle(0x1b3121, 0.8);
        g.fillCircle(px + TILE / 2 - 8, py + 12, 10);
        g.fillCircle(px + TILE / 2 + 7, py + 17, 12);
        g.fillStyle(0x2b3a2c, 0.3);
        g.fillCircle(px + TILE / 2 + 4, py + 7, 7);
      }
    }
  }

  private drawSigns(): void {
    const makeSign = (x: number, y: number, text: string, color: string) => {
      const label = this.add
        .text(x * TILE + TILE / 2, y * TILE + TILE / 2, text, {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '10px',
          color,
          align: 'center',
          letterSpacing: 1.5
        })
        .setOrigin(0.5)
        .setAlpha(0.8)
        .setDepth(66);
      label.setShadow(0, 0, color, 5, true, true);
    };
    makeSign(10, 26, 'NIGHT OWL COPY', '#e0b87a');
    makeSign(37, 2, 'MERCER HOUSE', '#c9a679');
    makeSign(26, 12, 'LANTERN AVE', '#7c9ba1');
    makeSign(25, 22, 'NIGHT BUS', '#d0a36a');
    makeSign(19, 8, 'OLD QUARTER', '#9a7e64');
    makeSign(25, 16, 'MERCER PARK', '#718b78');
  }

  private createPlayer(game: GameState): void {
    const pos = { x: game.player.x * TILE + TILE / 2, y: game.player.y * TILE + TILE / 2 };
    this.playerGlow = this.add
      .image(pos.x, pos.y, 'glow')
      .setTint(0xffc27c)
      .setScale(0.7)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(7000);
    this.flashlightGlow = this.add
      .image(pos.x, pos.y, 'glow')
      .setTint(0xffe1a6)
      .setScale(1.45)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(10002);
    this.shieldAura = this.add
      .image(pos.x, pos.y, 'glow')
      .setTint(0x79b7ac)
      .setScale(1.05)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(7001);

    const container = this.add.container(pos.x, pos.y).setDepth(10000);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x050506, 0.55);
    shadow.fillEllipse(0, 16, 29, 10);
    const body = this.add.graphics();
    body.fillStyle(0x242a2b, 1);
    body.fillTriangle(-11, -13, 11, -13, 15, 17);
    body.fillStyle(0x344348, 1);
    body.fillTriangle(-7, -13, 4, -13, 0, 16);
    body.fillStyle(0x9d4c44, 0.75);
    body.fillRect(-7, -18, 14, 4);
    body.fillStyle(0xd1a584, 1);
    body.fillCircle(0, -28, 8);
    body.fillStyle(0x4d2b26, 1);
    body.fillEllipse(0, -33, 17, 11);
    body.fillEllipse(-7, -28, 4, 14);
    body.fillEllipse(7, -28, 4, 14);
    body.fillStyle(0x1a1718, 1);
    body.fillCircle(-3, -27, 1);
    body.fillCircle(3, -27, 1);
    body.fillStyle(0x0c0f10, 1);
    body.fillRoundedRect(8, -12, 5, 9, 1);
    body.fillStyle(0x7fb8ad, 0.85);
    body.fillRect(9, -11, 3, 5);
    container.add([shadow, body]);
    this.player = container;
    this.lastPlayer = { x: game.player.x, y: game.player.y };
    this.tweens.add({
      targets: body,
      y: { from: 0, to: -2 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.updateFlashlight(game);
  }

  private createShadows(): void {
    for (const spot of shadowSpots) {
      const px = spot.x * TILE + TILE / 2;
      const py = spot.y * TILE + TILE / 2;
      const container = this.add.container(px, py).setDepth(8000);
      const glow = this.add
        .image(0, -27, 'glow')
        .setTint(0xa82e29)
        .setScale(0.25)
        .setAlpha(0.12)
        .setBlendMode(Phaser.BlendModes.ADD);
      const g = this.add.graphics();
      g.fillStyle(0x050506, 0.6);
      g.fillEllipse(0, 18, 28, 9);
      g.fillStyle(0x070708, 0.98);
      g.fillTriangle(-12, 17, 12, 17, 6, -33);
      g.fillTriangle(-12, 17, -6, -33, 0, -41);
      g.fillStyle(0x0a0a0b, 1);
      g.fillEllipse(0, -34, 16, 20);
      g.fillStyle(0xd5574c, 0.75);
      g.fillCircle(-4, -35, 1.5);
      g.fillCircle(4, -35, 1.5);
      container.add([glow, g]);
      container.setAlpha(0);
      container.setVisible(false);
      this.tweens.add({
        targets: container,
        x: { from: px - 5, to: px + 5 },
        duration: 3400 + (spot.stage * 500 + spot.x * 30),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.shadows.push({ container, stage: spot.stage });
    }
  }

  private createStalker(): void {
    const container = this.add.container(this.player.x, this.player.y + 180).setDepth(9998);
    const glow = this.add
      .image(0, -28, 'glow')
      .setTint(0x9d211e)
      .setScale(0.28)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics();
    g.fillStyle(0x050506, 0.6);
    g.fillEllipse(0, 20, 34, 11);
    g.fillStyle(0x030304, 0.99);
    g.fillTriangle(-15, 20, 15, 20, 8, -40);
    g.fillTriangle(-15, 20, -8, -40, 0, -51);
    g.fillStyle(0x050506, 1);
    g.fillEllipse(0, -42, 19, 24);
    g.fillStyle(0xd95449, 0.85);
    g.fillCircle(-5, -43, 1.8);
    g.fillCircle(5, -43, 1.8);
    container.add([glow, g]);
    container.setAlpha(0);
    container.setVisible(false);
    this.stalker = container;
  }

  private createMarkers(game: GameState): void {
    for (const item of interactables) {
      const px = item.x * TILE + TILE / 2;
      const py = item.y * TILE + TILE / 2;
      const container = this.add.container(px, py - 27).setDepth(9200);
      const glow = this.add
        .image(0, 0, 'glow')
        .setTint(item.kind === 'home' ? 0xe8c98b : 0xe2b56e)
        .setScale(item.kind === 'home' ? 0.35 : 0.23)
        .setAlpha(item.kind === 'home' ? 0.34 : 0.25)
        .setBlendMode(Phaser.BlendModes.ADD);
      const dot = this.add.graphics();
      dot.fillStyle(0x0b090a, 0.78);
      dot.fillCircle(0, 0, item.kind === 'home' ? 10 : 8);
      dot.lineStyle(1, item.kind === 'home' ? 0xf0d49b : 0xd6ad70, 0.8);
      dot.strokeCircle(0, 0, item.kind === 'home' ? 9 : 7);
      dot.fillStyle(0xf0d49b, 0.92);
      dot.fillCircle(0, 0, item.kind === 'home' ? 3 : 2.2);
      container.add([glow, dot]);
      container.setSize(28, 28);
      container.setInteractive(new Phaser.Geom.Circle(0, 0, 17), Phaser.Geom.Circle.Contains);
      container.on('pointerover', () => {
        glow.setAlpha(0.65);
        this.input.setDefaultCursor('pointer');
      });
      container.on('pointerout', () => {
        glow.setAlpha(0.25);
        this.input.setDefaultCursor('default');
      });
      container.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        useGameStore.getState().interact(item.id);
      });
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.12, to: 0.38 },
        scale: { from: item.kind === 'home' ? 0.3 : 0.18, to: item.kind === 'home' ? 0.46 : 0.3 },
        duration: 1700 + ((item.x * 30 + item.y * 20) % 500),
        yoyo: true,
        repeat: -1
      });
      this.markers.set(item.id, container);
    }
    this.updateMarkers(game);
  }

  private createWeather(): void {
    const dust = this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: this.scale.width },
      y: { min: 0, max: this.scale.height },
      lifespan: { min: 5000, max: 10000 },
      speedX: { min: -9, max: 9 },
      speedY: { min: -10, max: 5 },
      scale: { start: 0.32, end: 0.04 },
      alpha: { start: 0.2, end: 0 },
      tint: [0xb8c8c9, 0x817d72],
      frequency: 700,
      quantity: 1
    });
    dust.setScrollFactor(0).setDepth(11000);

    this.darkness = this.add
      .rectangle(0, 0, CITY_WIDTH * TILE, CITY_HEIGHT * TILE, 0x030304, 0.28)
      .setOrigin(0, 0)
      .setDepth(9000);
    this.darkness.setVisible(false);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, CITY_WIDTH * TILE, CITY_HEIGHT * TILE);
    camera.startFollow(this.player, true, 0.12, 0.12);
    camera.setRoundPixels(true);
    this.handleResize();
  }

  private handleResize(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const compact = width < 900;
    const zoom = compact
      ? Phaser.Math.Clamp(width / 560, 0.66, 0.92)
      : Phaser.Math.Clamp(Math.min(width / 1500, height / 1050), 0.74, 1.12);
    this.cameras.main.setZoom(zoom);
  }

  private syncState(game: GameState): void {
    if (!this.player || !this.cameras?.main) return;
    if (game.player.x !== this.lastPlayer.x || game.player.y !== this.lastPlayer.y) {
      this.lastPlayer = { x: game.player.x, y: game.player.y };
      const px = game.player.x * TILE + TILE / 2;
      const py = game.player.y * TILE + TILE / 2;
      this.tweens.add({
        targets: [this.player, this.playerGlow, this.flashlightGlow],
        x: px,
        y: py,
        duration: 135,
        ease: 'Sine.easeInOut'
      });
      this.player.setDepth(10000 + game.player.y);
    }
    this.updateShadows(game);
    this.updateMarkers(game);
    this.updateFlashlight(game);
    this.shadowCloseness = game.threat / 100;
    this.shadowStage = stageForThreat(game.threat);
    if (this.shadowStage > this.lastStage && this.shadowStage >= 2) {
      this.cameras.main?.shake(160, 0.0018 + this.shadowStage * 0.0011);
      window.dispatchEvent(new CustomEvent('pod-sfx', { detail: 'danger' }));
    }
    this.lastStage = this.shadowStage;
    const hasCover = game.shieldSteps > 0 || game.shieldSeconds > 0;
    this.shieldAura.setAlpha(hasCover ? (game.shieldSteps > 0 ? 0.18 : 0.08) : 0);
    this.lamps.forEach((lamp) => {
      lamp.glow.setVisible(game.powerOn);
      lamp.pole.setVisible(true);
    });
    this.darkness.setVisible(!game.powerOn);
    this.darkness.setFillStyle(0x030304, game.powerOn ? 0.2 : 0.58);
    this.homeGlowSprite?.setVisible(game.nightMinute >= 440 || game.chapter >= 5);
  }

  private updateFlashlight(game: GameState): void {
    if (!this.flashlightGlow) return;
    this.flashlightGlow.setAlpha(game.flashlightOn ? 0.5 : 0);
    this.flashlightGlow.setPosition(
      game.player.x * TILE + TILE / 2,
      game.player.y * TILE + TILE / 2
    );
  }

  private updateMarkers(game: GameState): void {
    for (const item of interactables) {
      const marker = this.markers.get(item.id);
      if (!marker) continue;
      const used = game.usedInteractions.includes(item.id);
      const maxed = item.maxUses ? (game.interactionUses[item.id] ?? 0) >= item.maxUses : false;
      const requires = item.requiresFlag ? Boolean(game.flags[item.requiresFlag]) : true;
      marker.setVisible(!used && !maxed && requires);
    }
  }

  private updateShadows(game: GameState): void {
    const stage =
      game.threat >= 100 ? 4 : game.threat >= 60 ? 3 : game.threat >= 40 ? 2 : game.threat >= 20 ? 1 : 0;
    for (const shadow of this.shadows) {
      const visible = stage >= shadow.stage && stage > 0;
      if (visible && !shadow.container.visible) {
        shadow.container.setVisible(true);
        this.tweens.add({ targets: shadow.container, alpha: 0.86, duration: 1300 });
      } else if (!visible && shadow.container.visible) {
        this.tweens.add({
          targets: shadow.container,
          alpha: 0,
          duration: 800,
          onComplete: () => shadow.container.setVisible(false)
        });
      }
    }
  }

  private flickerLamps(): void {
    const game = useGameStore.getState().game;
    if (!game?.powerOn || !this.lamps.length) return;
    const lamp = this.lamps[Math.floor(Math.random() * this.lamps.length)];
    lamp.glow.setAlpha(0.08);
    const storeGame = useGameStore.getState().game;
    if (storeGame && storeGame.threat >= 55 && Math.random() < 0.3) {
      window.dispatchEvent(new CustomEvent('pod-sfx', { detail: 'whisper' }));
    }
    this.time.delayedCall(120 + Math.random() * 180, () => {
      if (this.lamps.includes(lamp) && useGameStore.getState().game?.powerOn) lamp.glow.setAlpha(0.46);
    });
  }

  private canMove(): boolean {
    const state = useGameStore.getState();
    return Boolean(
      state.screen === 'game' &&
        state.game &&
        !state.phoneOpen &&
        !state.activeCall &&
        !state.pendingEventId &&
        !state.finalOpen &&
        !state.modal
    );
  }

  private movementDirection(): { dx: number; dy: number } | null {
    if (Math.abs(this.joystick.x) > 0.28 || Math.abs(this.joystick.y) > 0.28) {
      if (Math.abs(this.joystick.x) > Math.abs(this.joystick.y)) {
        return { dx: this.joystick.x > 0 ? 1 : -1, dy: 0 };
      }
      return { dx: 0, dy: this.joystick.y > 0 ? 1 : -1 };
    }
    if (this.keys.left?.isDown || this.keys.a?.isDown) return { dx: -1, dy: 0 };
    if (this.keys.right?.isDown || this.keys.d?.isDown) return { dx: 1, dy: 0 };
    if (this.keys.up?.isDown || this.keys.w?.isDown) return { dx: 0, dy: -1 };
    if (this.keys.down?.isDown || this.keys.s?.isDown) return { dx: 0, dy: 1 };
    return null;
  }

  update(time: number): void {
    if (!this.player) return;
    this.updateStalker();
    if (!this.canMove()) return;
    if (time < this.nextMoveAt) return;
    const direction = this.movementDirection();
    if (!direction) return;
    const game = useGameStore.getState().game;
    if (!game) return;
    const nx = game.player.x + direction.dx;
    const ny = game.player.y + direction.dy;
    if (!isWalkableTile(nx, ny)) return;
    this.lastDirection = { x: direction.dx, y: direction.dy };
    this.nextMoveAt = time + 145;
    useGameStore.getState().movePlayer(nx, ny);
    if (Math.random() < 0.18) window.dispatchEvent(new CustomEvent('pod-sfx', { detail: 'step' }));
  }

  private updateStalker(): void {
    const game = useGameStore.getState().game;
    if (!game || !this.stalker) return;
    const active = this.shadowStage > 0;
    if (!active) {
      this.stalker.setVisible(false);
      this.shieldAura.setAlpha(0);
      return;
    }
    const playerX = this.player.x;
    const playerY = this.player.y;
    this.shieldAura.setPosition(playerX, playerY);
    const distance = 92 + (1 - this.shadowCloseness) * 190;
    const targetX = playerX - this.lastDirection.x * distance + this.lastDirection.y * 14;
    const targetY = playerY - this.lastDirection.y * distance + this.lastDirection.x * 14;
    this.stalker.setVisible(true);
    this.stalker.x = Phaser.Math.Linear(this.stalker.x, targetX, 0.08);
    this.stalker.y = Phaser.Math.Linear(this.stalker.y, targetY, 0.08);
    this.stalker.setAlpha(0.2 + this.shadowCloseness * 0.68);
    this.stalker.setScale(0.9 + this.shadowCloseness * 0.35);
    this.stalker.setDepth(9998);
    const hasCover = game.shieldSteps > 0 || game.shieldSeconds > 0;
    this.shieldAura.setAlpha(hasCover ? (game.shieldSteps > 0 ? 0.18 : 0.08) : 0);
  }

  private shade(color: number, amount: number): number {
    const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amount));
    const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (color & 0xff) + amount));
    return (r << 16) | (g << 8) | b;
  }

  private handleShutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.offStick?.();
    this.offStick = null;
    this.scale.off('resize', this.handleResize, this);
    this.flickerTimer?.remove();
    this.flickerTimer = null;
    this.tweens.killAll();
    this.shadows = [];
    this.markers.clear();
    this.lamps = [];
    this.lastStage = 0;
  }
}
