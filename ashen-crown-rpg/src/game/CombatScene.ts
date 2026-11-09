import Phaser from 'phaser';
import type { CombatState, CombatUnit, MapTile } from '@/core/types';
import { useGameStore } from '@/core/gameStore';
import { encounterById } from '@/data/encounters';
import { abilityById } from '@/data/abilities';
import { statusById } from '@/data/statuses';
import { reachableTiles } from '@/systems/combat';
import {
  HALF_H,
  HALF_W,
  kindGlyph,
  project,
  tileColor,
  unproject
} from './iso';

interface UnitEntry {
  container: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Graphics;
  statusText: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  lastHp: number;
  tileX: number;
  tileY: number;
}

const shade = (color: number, amount: number): number => {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (color & 0xff) + amount));
  return (r << 16) | (g << 8) | b;
};

const colorFromHex = (hex: string, fallback = 0x8d7b63): number => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(value) ? value : fallback;
};

const damageColor = (type?: string): number => {
  switch (type) {
    case 'fire':
      return 0xf07a45;
    case 'cold':
      return 0x8ecbd7;
    case 'lightning':
      return 0xf0d878;
    case 'shadow':
      return 0xa17ac4;
    case 'holy':
      return 0xf4e1a1;
    case 'nature':
      return 0x8fbf78;
    case 'psychic':
      return 0xc78ac9;
    default:
      return 0xe7d2b0;
  }
};

export class CombatScene extends Phaser.Scene {
  private encounterId = '';
  private originX = 0;
  private originY = 0;
  private contentMinX = 0;
  private contentMaxX = 0;
  private contentMinY = 0;
  private contentMaxY = 0;
  private floor: Phaser.GameObjects.Graphics | null = null;
  private highlights: Phaser.GameObjects.Graphics | null = null;
  private units = new Map<string, UnitEntry>();
  private hovered: { x: number; y: number } | null = null;
  private unsubscribe: (() => void) | null = null;
  private surfaceSignature = '';
  private fx: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Combat');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b090b');
    this.input.mouse?.disableContextMenu();
    this.unsubscribe = useGameStore.subscribe((state) => {
      if (state.combat) this.syncCombat(state.combat);
    });
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('gameout', this.clearHover, this);
    this.input.on('wheel', this.handleWheel, this);
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    const combat = useGameStore.getState().combat;
    if (combat) this.build(combat);
    this.cameras.main.fadeIn(360, 8, 6, 8);
  }

  private build(state: CombatState): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.units.clear();
    this.fx = [];
    this.encounterId = state.encounterId;

    const width = state.tiles[0]?.length ?? 14;
    const height = state.tiles.length ?? 10;
    const maxX = (width - 1) * HALF_W;
    const maxY = (height - 1) * HALF_H;
    this.originX = maxY + 118;
    this.originY = 118;
    const topLeft = project(0, 0, this.originX, this.originY);
    const topRight = project(width - 1, 0, this.originX, this.originY);
    const bottomLeft = project(0, height - 1, this.originX, this.originY);
    const bottomRight = project(width - 1, height - 1, this.originX, this.originY);
    this.contentMinX = bottomLeft.x - 40;
    this.contentMaxX = topRight.x + 40;
    this.contentMinY = topLeft.y - 50;
    this.contentMaxY = bottomRight.y + 30;
    const contentCenterX = (this.contentMinX + this.contentMaxX) / 2;
    const contentCenterY = (this.contentMinY + this.contentMaxY) / 2;

    const encounter = encounterById[state.encounterId];
    const theme = encounter?.mapTheme ?? 'bastion';
    this.cameras.main.setBackgroundColor(theme === 'forest' ? '#0b0e0b' : theme === 'village' ? '#0c0b0a' : '#0b090b');

    const mist = this.add
      .image(contentCenterX, contentCenterY, 'glow')
      .setTint(theme === 'forest' ? 0x5f7b57 : theme === 'temple' ? 0x567c78 : theme === 'village' ? 0x7d6a4d : 0x765148)
      .setAlpha(0.13)
      .setScale(11)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-10);
    this.fx.push(mist);

    this.floor = this.add.graphics().setDepth(0);
    this.highlights = this.add.graphics().setDepth(50);
    this.drawGrid(state);

    this.cameras.main.setBounds(
      this.contentMinX - 300,
      this.contentMinY - 300,
      this.contentMaxX - this.contentMinX + 600,
      this.contentMaxY - this.contentMinY + 600
    );
    this.fitCamera();

    for (const unit of state.units) this.ensureUnit(unit, state);
    this.drawHighlights(state);
    this.maybeWeather(theme);
  }

  private drawGrid(state: CombatState): void {
    const g = this.floor;
    if (!g) return;
    g.clear();
    this.children.getAll().forEach((child) => {
      if (child.getData?.('combat-prop')) child.destroy();
    });
    const encounter = encounterById[state.encounterId];
    const theme = encounter?.mapTheme ?? 'bastion';
    const width = state.tiles[0]?.length ?? 14;
    const height = state.tiles.length ?? 10;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.tiles[y][x];
        const { x: px, y: py } = project(x, y, this.originX, this.originY);
        const diamond = this.tileDiamond(px, py);
        const char = this.charForTile(tile);
        const base = tileColor(char, x, y, theme);
        g.fillStyle(base, 1);
        g.fillPoints(diamond, true);

        if (tile.surface === 'water') {
          g.fillStyle(0x39737c, 0.28);
          g.fillPoints(this.tileDiamond(px, py - 1, 0.9), true);
          g.lineStyle(1, 0x80b6b8, 0.2);
          g.lineBetween(px - 12, py, px + 8, py - 3);
        } else if (tile.surface === 'fire') {
          g.fillStyle(0x9c3d25, 0.32);
          g.fillPoints(this.tileDiamond(px, py - 1, 0.86), true);
        } else if (tile.surface === 'oil') {
          g.fillStyle(0x3f3426, 0.5);
          g.fillPoints(this.tileDiamond(px, py - 1, 0.82), true);
        } else if (tile.surface === 'ice') {
          g.fillStyle(0x8ecbd4, 0.2);
          g.fillPoints(this.tileDiamond(px, py - 1, 0.85), true);
        } else if (tile.surface === 'ash') {
          g.fillStyle(0x6b4840, 0.22);
          g.fillPoints(this.tileDiamond(px, py - 1, 0.88), true);
        }

        g.lineStyle(1, 0x0a090a, 0.34);
        g.strokePoints(diamond, true, true);

        if (tile.blocked) {
          if (tile.prop === 'tree') {
            this.drawTree(px, py, x, y, theme);
          } else if (tile.prop === 'rubble') {
            this.drawRubble(px, py, x, y);
          } else if (tile.barrel) {
            this.drawBarrel(px, py, x, y);
          } else {
            this.drawWall(px, py, x, y, base);
          }
        } else if (tile.barrel) {
          this.drawBarrel(px, py, x, y);
        }

        if (tile.surface === 'fire') {
          const glow = this.add
            .image(px, py - 6, 'glow')
            .setTint(0xff8e4b)
            .setAlpha(0.22)
            .setScale(0.55)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(30);
          glow.setData('combat-prop', true);
          this.tweens.add({
            targets: glow,
            alpha: { from: 0.14, to: 0.36 },
            scale: { from: 0.45, to: 0.68 },
            duration: 650 + (x % 4) * 80,
            yoyo: true,
            repeat: -1
          });
        }
      }
    }
    this.surfaceSignature = state.tiles.map((row) => row.map((tile) => tile.surface ?? 'n').join('')).join('|');
  }

  private tileDiamond(cx: number, cy: number, scale = 1): Phaser.Geom.Point[] {
    const w = HALF_W * scale;
    const h = HALF_H * scale;
    return [
      new Phaser.Geom.Point(cx, cy - h),
      new Phaser.Geom.Point(cx + w, cy),
      new Phaser.Geom.Point(cx, cy + h),
      new Phaser.Geom.Point(cx - w, cy)
    ];
  }

  private charForTile(tile: MapTile): string {
    if (tile.ground === 'grass') return ',';
    if (tile.ground === 'water') return '~';
    if (tile.ground === 'ice') return 'i';
    if (tile.ground === 'fire') return 'f';
    if (tile.ground === 'ash') return 'a';
    if (tile.ground === 'basalt') return 'b';
    return '.';
  }

  private drawWall(px: number, py: number, x: number, y: number, base: number): void {
    const height = 26;
    const topY = py - height;
    const g = this.add.graphics().setDepth(80 + (x + y) * 10);
    const top = this.tileDiamond(px, topY);
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
    g.fillStyle(shade(base, -38), 1);
    g.fillPoints(left, true);
    g.fillStyle(shade(base, -54), 1);
    g.fillPoints(right, true);
    g.fillStyle(shade(base, 6), 1);
    g.fillPoints(top, true);
    g.lineStyle(1, shade(base, -26), 0.7);
    g.strokePoints(top, true, true);
    g.setData('combat-prop', true);
  }

  private drawTree(px: number, py: number, x: number, y: number, theme: string): void {
    const g = this.add.graphics().setDepth(80 + (x + y) * 10);
    const leaf = theme === 'forest' ? 0x2f4830 : 0x3d4533;
    g.fillStyle(0x433124, 1);
    g.fillRect(px - 3, py - 20, 6, 22);
    g.fillStyle(shade(leaf, -18), 1);
    g.fillEllipse(px, py - 37, 46, 34);
    g.fillStyle(leaf, 1);
    g.fillEllipse(px - 8, py - 44, 28, 25);
    g.fillEllipse(px + 9, py - 41, 31, 24);
    g.fillStyle(shade(leaf, 18), 0.6);
    g.fillEllipse(px - 4, py - 50, 17, 12);
    g.setData('combat-prop', true);
  }

  private drawRubble(px: number, py: number, x: number, y: number): void {
    const g = this.add.graphics().setDepth(80 + (x + y) * 10);
    g.fillStyle(0x433e39, 1);
    g.fillCircle(px - 8, py - 4, 6);
    g.fillCircle(px + 4, py - 7, 8);
    g.fillCircle(px + 11, py - 1, 4);
    g.fillStyle(0x5b554c, 1);
    g.fillRect(px - 10, py - 12, 8, 7);
    g.setData('combat-prop', true);
  }

  private drawBarrel(px: number, py: number, x: number, y: number): void {
    const g = this.add.graphics().setDepth(80 + (x + y) * 10);
    g.fillStyle(0x3a2a1f, 0.4);
    g.fillEllipse(px, py + 2, 22, 9);
    g.fillStyle(0x5d4330, 1);
    g.fillRoundedRect(px - 8, py - 18, 16, 21, 5);
    g.lineStyle(2, 0x2d2118, 0.9);
    g.lineBetween(px - 8, py - 11, px + 8, py - 11);
    g.lineBetween(px - 8, py - 4, px + 8, py - 4);
    g.setData('combat-prop', true);
  }

  private ensureUnit(unit: CombatUnit, state: CombatState): UnitEntry {
    let entry = this.units.get(unit.id);
    const pos = project(unit.x, unit.y, this.originX, this.originY);
    if (!entry) {
      const container = this.add.container(pos.x, pos.y);
      if (this.scale.width < 700) container.setScale(1.18);
      const ring = this.add.graphics();
      const token = this.add.graphics();
      const bar = this.add.graphics();
      const statusText = this.add
        .text(0, -57, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#e9dcc2' })
        .setOrigin(0.5);
      const initialName = unit.name.length > 18 ? `${unit.name.slice(0, 17)}…` : unit.name;
      const nameText = this.add
        .text(0, 20, unit.side === 'enemy' ? `${initialName} · AC ${unit.ac}` : initialName, {
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: '10px',
          color: unit.side === 'party' ? '#e9d6ac' : '#d9a39a',
          backgroundColor: 'rgba(8,7,9,0.72)',
          padding: { left: 4, right: 4, top: 1, bottom: 1 }
        })
        .setOrigin(0.5, 0);
      container.add([ring, token, bar, statusText, nameText]);
      this.drawToken(token, unit);
      this.drawUnitRing(ring, unit);
      entry = {
        container,
        bar,
        statusText,
        ring,
        nameText,
        lastHp: unit.hp,
        tileX: unit.x,
        tileY: unit.y
      };
      this.units.set(unit.id, entry);

      // A brief materialize flourish for units arriving mid-fight.
      container.setAlpha(0);
      this.tweens.add({ targets: container, alpha: 1, duration: 260 });
    }

    if (entry.tileX !== unit.x || entry.tileY !== unit.y) {
      entry.tileX = unit.x;
      entry.tileY = unit.y;
      this.tweens.add({
        targets: entry.container,
        x: pos.x,
        y: pos.y,
        duration: 260,
        ease: 'Sine.easeInOut'
      });
    }
    entry.container.setPosition(entry.container.x, entry.container.y);
    entry.container.setDepth(1000 + (unit.x + unit.y) * 10);
    entry.container.setAlpha(unit.downed ? 0.48 : 1);
    this.drawHp(entry, unit);
    const statuses = unit.statuses
      .slice(0, 5)
      .map((status) => statusById[status.id]?.icon ?? '•')
      .join('');
    entry.statusText.setText(statuses);
    entry.nameText.setColor(unit.side === 'party' ? '#e9d6ac' : '#d9a39a');
    const displayName = unit.name.length > 18 ? `${unit.name.slice(0, 17)}…` : unit.name;
    entry.nameText.setText(unit.side === 'enemy' ? `${displayName} · AC ${unit.ac}` : displayName);
    entry.ring.setVisible(state.phase === 'active' && this.currentUnitId(state) === unit.id);
    if (entry.lastHp > unit.hp) {
      const amount = Math.round(entry.lastHp - unit.hp);
      this.popNumber(unit, `-${amount}`, 0xe57c6d);
      this.burst(unit, state.lastDamage?.type);
      if (amount >= 12) this.cameras.main.shake(140, 0.0035);
    } else if (unit.hp > entry.lastHp) {
      const amount = Math.round(unit.hp - entry.lastHp);
      this.popNumber(unit, `+${amount}`, 0x9bce8c);
      this.burst(unit, 'holy');
    }
    entry.lastHp = unit.hp;
    return entry;
  }

  private drawToken(g: Phaser.GameObjects.Graphics, unit: CombatUnit): void {
    g.clear();
    const boss = unit.role === 'boss' || unit.role === 'elite';
    const r = boss ? 20 : 15;
    const color = colorFromHex(unit.color, unit.side === 'party' ? 0xd4b273 : 0xb86256);
    g.fillStyle(0x070608, 0.55);
    g.fillEllipse(0, 4, r * 2.1, r * 0.85);
    g.fillStyle(unit.side === 'party' ? 0x1c1a16 : 0x1c1414, 0.95);
    g.fillCircle(0, 0, r + 3);
    g.lineStyle(2, unit.side === 'party' ? 0xe2c07c : 0xd27564, 0.85);
    g.strokeCircle(0, 0, r + 3);
    g.fillStyle(shade(color, -38), 1);
    g.fillCircle(0, 0, r);
    g.fillStyle(color, 1);
    g.fillCircle(0, -2, r - 3);
    g.fillStyle(unit.side === 'party' ? 0xd9b98a : 0x241a1a, 1);
    g.fillCircle(0, -4, r * 0.42);
    g.lineStyle(2, unit.side === 'party' ? 0xf6e2b8 : 0xff8b6f, 0.9);
    g.lineBetween(-r * 0.3, -4, -r * 0.1, -4);
    g.lineBetween(r * 0.1, -4, r * 0.3, -4);
    if (boss) {
      g.fillStyle(0xcaa45c, 0.95);
      g.fillTriangle(-13, -18, 0, -30, 13, -18);
      g.fillTriangle(-6, -21, 0, -34, 6, -21);
    }
    if (unit.side === 'enemy') {
      g.fillStyle(0x0d0a0b, 0.7);
      g.fillTriangle(-r * 0.75, -r * 0.5, 0, -r * 1.5, r * 0.75, -r * 0.5);
    }
  }

  private drawUnitRing(g: Phaser.GameObjects.Graphics, unit: CombatUnit): void {
    g.clear();
    const color = unit.side === 'party' ? 0xf0d08a : 0xd47664;
    g.lineStyle(2, color, 0.9);
    g.strokeEllipse(0, 2, 52, 24);
    g.lineStyle(1, color, 0.28);
    g.strokeEllipse(0, 2, 62, 30);
    this.tweens.add({ targets: g, alpha: { from: 0.45, to: 1 }, duration: 1000, yoyo: true, repeat: -1 });
  }

  private drawHp(entry: UnitEntry, unit: CombatUnit): void {
    const g = entry.bar;
    g.clear();
    const width = 42;
    const ratio = Math.max(0, Math.min(1, unit.hp / Math.max(1, unit.maxHp)));
    g.fillStyle(0x090809, 0.88);
    g.fillRoundedRect(-width / 2 - 1, -47, width + 2, 6, 2);
    g.fillStyle(unit.side === 'party' ? 0x8aa777 : 0xa9544a, 1);
    g.fillRoundedRect(-width / 2, -46, width * ratio, 4, 1);
    g.lineStyle(1, 0x2a2422, 0.8);
    g.strokeRoundedRect(-width / 2 - 1, -47, width + 2, 6, 2);
  }

  private currentUnitId(state: CombatState): string | null {
    return state.order[state.turnIndex] ?? null;
  }

  private syncCombat(state: CombatState): void {
    if (this.encounterId !== state.encounterId || !this.floor) {
      this.build(state);
      return;
    }
    const signature = state.tiles.map((row) => row.map((tile) => tile.surface ?? 'n').join('')).join('|');
    if (signature !== this.surfaceSignature) {
      this.drawGrid(state);
      if (this.highlights) this.highlights.setDepth(50);
    }
    for (const unit of state.units) this.ensureUnit(unit, state);
    for (const [id, entry] of this.units) {
      if (!state.units.some((unit) => unit.id === id)) {
        entry.container.destroy();
        this.units.delete(id);
      }
    }
    this.drawHighlights(state);
    if (state.phase !== 'active') {
      this.cameras.main.flash(180, 20, 16, 12, true);
    }
  }

  private drawHighlights(state: CombatState): void {
    const g = this.highlights;
    if (!g) return;
    g.clear();
    const current = state.units.find((unit) => unit.id === this.currentUnitId(state));
    if (!current || current.side !== 'party' || state.phase !== 'active') return;

    const ability = state.selectedAbility ? abilityById[state.selectedAbility] : null;
    const action = state.selectedAction;

    if (action) {
      for (let y = 0; y < state.tiles.length; y++) {
        for (let x = 0; x < state.tiles[0].length; x++) {
          if (Math.max(Math.abs(x - current.x), Math.abs(y - current.y)) > 1) continue;
          if (x === current.x && y === current.y) continue;
          const { x: px, y: py } = project(x, y, this.originX, this.originY);
          g.fillStyle(action === 'help' ? 0x87b7a3 : 0xd59461, 0.22);
          g.fillPoints(this.tileDiamond(px, py, 0.92), true);
          g.lineStyle(1, action === 'help' ? 0xa8d5bb : 0xd9a778, 0.5);
          g.strokePoints(this.tileDiamond(px, py, 0.92), true, true);
        }
      }
      const pos = project(current.x, current.y, this.originX, this.originY);
      g.lineStyle(2, 0xf0c27f, 0.8);
      g.strokePoints(this.tileDiamond(pos.x, pos.y, 0.92), true, true);
    } else if (!ability) {
      const reachable = reachableTiles(state, current);
      for (const tile of reachable.values()) {
        if (tile.x === current.x && tile.y === current.y) continue;
        const { x: px, y: py } = project(tile.x, tile.y, this.originX, this.originY);
        g.fillStyle(0x7fbfb0, 0.23 + (tile.cost === 1 ? 0.03 : 0));
        g.fillPoints(this.tileDiamond(px, py, 0.94), true);
        g.lineStyle(1, 0x9bd3c3, 0.46);
        g.strokePoints(this.tileDiamond(px, py, 0.94), true, true);
      }
      const currentPos = project(current.x, current.y, this.originX, this.originY);
      g.lineStyle(2, 0xeed18c, 0.8);
      g.strokePoints(this.tileDiamond(currentPos.x, currentPos.y, 0.92), true, true);
    } else {
      const range = ability.range;
      for (let y = 0; y < state.tiles.length; y++) {
        for (let x = 0; x < state.tiles[0].length; x++) {
          if (Math.max(Math.abs(x - current.x), Math.abs(y - current.y)) > range) continue;
          if (ability.target === 'self' && (x !== current.x || y !== current.y)) continue;
          const { x: px, y: py } = project(x, y, this.originX, this.originY);
          g.fillStyle(0xd59461, 0.2);
          g.fillPoints(this.tileDiamond(px, py, 0.92), true);
          g.lineStyle(1, 0xd9a778, 0.44);
          g.strokePoints(this.tileDiamond(px, py, 0.92), true, true);
        }
      }
      const pos = project(current.x, current.y, this.originX, this.originY);
      g.lineStyle(2, 0xf0c27f, 0.8);
      g.strokePoints(this.tileDiamond(pos.x, pos.y, 0.92), true, true);
    }

    if (this.hovered) {
      const { x: px, y: py } = project(this.hovered.x, this.hovered.y, this.originX, this.originY);
      g.lineStyle(2, 0xf5e4bc, 0.9);
      g.strokePoints(this.tileDiamond(px, py, 0.97), true, true);
      if (ability?.radius) {
        const radius = ability.radius;
        for (let y = Math.max(0, this.hovered.y - radius); y <= Math.min(state.tiles.length - 1, this.hovered.y + radius); y++) {
          for (let x = Math.max(0, this.hovered.x - radius); x <= Math.min(state.tiles[0].length - 1, this.hovered.x + radius); x++) {
            if (Math.max(Math.abs(x - this.hovered.x), Math.abs(y - this.hovered.y)) > radius) continue;
            const p = project(x, y, this.originX, this.originY);
            g.fillStyle(0xd97a55, 0.13);
            g.fillPoints(this.tileDiamond(p.x, p.y, 0.9), true);
            g.lineStyle(1, 0xe29a72, 0.35);
            g.strokePoints(this.tileDiamond(p.x, p.y, 0.9), true, true);
          }
        }
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const state = useGameStore.getState().combat;
    if (!state || state.phase !== 'active') return;
    const tile = unproject(pointer.worldX, pointer.worldY, this.originX, this.originY);
    if (tile.x < 0 || tile.y < 0 || tile.y >= state.tiles.length || tile.x >= state.tiles[0].length) {
      this.clearHover();
      return;
    }
    if (!this.hovered || this.hovered.x !== tile.x || this.hovered.y !== tile.y) {
      this.hovered = { x: tile.x, y: tile.y };
      this.drawHighlights(state);
    }
  }

  private clearHover(): void {
    this.hovered = null;
    const state = useGameStore.getState().combat;
    if (state) this.drawHighlights(state);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const store = useGameStore.getState();
    const state = store.combat;
    if (!state || state.phase !== 'active' || state.waitingForAi) return;
    const current = state.units.find((unit) => unit.id === this.currentUnitId(state));
    if (!current || current.side !== 'party') return;
    const tile = unproject(pointer.worldX, pointer.worldY, this.originX, this.originY);
    if (tile.x < 0 || tile.y < 0 || tile.y >= state.tiles.length || tile.x >= state.tiles[0].length) return;
    const target = state.units.find((unit) => !unit.downed && unit.x === tile.x && unit.y === tile.y);
    const ability = state.selectedAbility ? abilityById[state.selectedAbility] : null;

    if (state.selectedAction) {
      store.combatAction(state.selectedAction, tile.x, tile.y);
      return;
    }

    if (ability) {
      if (ability.target === 'self') {
        store.combatUseAbility(ability.id, current.x, current.y);
      } else {
        store.combatUseAbility(ability.id, tile.x, tile.y);
      }
      return;
    }
    if (target && target.side === 'enemy') {
      store.combatAttack(tile.x, tile.y);
      return;
    }
    if ((tile.x !== current.x || tile.y !== current.y) && !target) {
      store.combatMove(tile.x, tile.y);
    }
  }

  private handleWheel(pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number): void {
    void pointer;
    this.cameras.main.zoom = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.001, 0.45, 2.4);
  }

  private popNumber(unit: CombatUnit, text: string, color: number): void {
    const pos = project(unit.x, unit.y, this.originX, this.originY);
    const label = this.add
      .text(pos.x, pos.y - 60, text, {
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: '18px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#0a090a',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(4000);
    this.tweens.add({
      targets: label,
      y: label.y - 28,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  private burst(unit: CombatUnit, type?: string): void {
    const pos = project(unit.x, unit.y, this.originX, this.originY);
    const tint = damageColor(type);
    const image = this.add
      .image(pos.x, pos.y - 18, 'glow')
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.25)
      .setAlpha(0.8)
      .setDepth(3900);
    this.tweens.add({
      targets: image,
      scale: 0.95,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => image.destroy()
    });
    for (let i = 0; i < 6; i++) {
      const shard = this.add
        .image(pos.x, pos.y - 20, 'dot')
        .setTint(tint)
        .setDepth(3901)
        .setScale(0.5 + Math.random() * 0.6);
      this.tweens.add({
        targets: shard,
        x: pos.x + (Math.random() - 0.5) * 70,
        y: pos.y - 20 - Math.random() * 40,
        alpha: 0,
        duration: 380 + Math.random() * 220,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy()
      });
    }
  }

  private maybeWeather(theme: string): void {
    if (theme === 'forest') {
      const emitter = this.add.particles(0, 0, 'glow', {
        x: { min: 0, max: this.scale.width },
        y: { min: this.scale.height * 0.2, max: this.scale.height },
        lifespan: { min: 4000, max: 8000 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -12, max: -2 },
        scale: { start: 0.06, end: 0.02 },
        alpha: { start: 0.55, end: 0 },
        tint: [0xd3c47a, 0x85bb83],
        frequency: 400,
        blendMode: Phaser.BlendModes.ADD
      });
      emitter.setScrollFactor(0).setDepth(7000);
      this.fx.push(emitter);
    } else if (theme === 'bastion' || theme === 'citadel') {
      const emitter = this.add.particles(0, 0, 'dot', {
        x: { min: 0, max: this.scale.width },
        y: -20,
        lifespan: 6000,
        speedX: { min: -16, max: 16 },
        speedY: { min: 16, max: 38 },
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 0.3, end: 0 },
        tint: [0x8d7969, 0x5f5147],
        frequency: 150
      });
      emitter.setScrollFactor(0).setDepth(7000);
      this.fx.push(emitter);
    }
  }

  private fitCamera(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const contentW = Math.max(1, this.contentMaxX - this.contentMinX);
    const contentH = Math.max(1, this.contentMaxY - this.contentMinY);
    let zoom: number;
    if (width < 700) {
      // Portrait screens cannot fit the full diamond. Zoom in so tiles remain
      // finger-sized, and keep the content centre in view.
      zoom = Phaser.Math.Clamp(width / 400, 0.78, 1.05);
    } else if (height < 620) {
      zoom = Phaser.Math.Clamp((height - 220) / contentH, 0.5, 0.95);
    } else {
      const availableW = Math.max(240, width - 120);
      const availableH = Math.max(220, height - 330);
      zoom = Math.min(availableW / contentW, availableH / contentH);
      zoom = Phaser.Math.Clamp(zoom, 0.7, 2.3);
    }
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(
      (this.contentMinX + this.contentMaxX) / 2,
      (this.contentMinY + this.contentMaxY) / 2
    );
  }

  private handleResize(): void {
    this.fitCamera();
  }

  private handleShutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('gameout', this.clearHover, this);
    this.input.off('wheel', this.handleWheel, this);
    this.scale.off('resize', this.handleResize, this);
    this.tweens.killAll();
    this.units.clear();
    this.fx = [];
    this.floor = null;
    this.highlights = null;
    this.hovered = null;
  }
}
