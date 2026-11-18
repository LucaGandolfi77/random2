import type { FighterDef } from '../data/fighters';
import type { FighterState } from '../game/types';

/** Generates crisp 24x32 pixel sprites at runtime; no external art assets. */
export class SpriteFactory {
  private cache = new Map<string, HTMLCanvasElement>();

  get(def: FighterDef, state: FighterState, frame: number, facing: number): HTMLCanvasElement {
    const key = `${def.id}:${state}:${frame % 4}:${facing > 0 ? 1 : 0}`;
    let c = this.cache.get(key);
    if (!c) {
      c = this.make(def, state, frame % 4, facing);
      this.cache.set(key, c);
    }
    return c;
  }

  clear() { this.cache.clear(); }

  private make(def: FighterDef, state: FighterState, frame: number, facing: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 24; c.height = 32;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const col = def.colors;
    const bob = state === 'idle' ? (frame % 2) : 0;
    const run = state === 'run' ? frame % 4 : 0;
    const attack = state === 'attack';
    const hurt = state === 'hurt';
    const block = state === 'block';
    const ko = state === 'ko';
    const jump = state === 'jump' || state === 'fall';
    const dodge = state === 'dodge';
    const ox = facing > 0 ? 0 : 24;

    const rect = (x: number, y: number, w: number, h: number, color: string) => {
      g.fillStyle = color;
      g.fillRect(ox + (facing > 0 ? x : -x - w), y, w, h);
    };

    if (ko) {
      g.save();
      g.translate(12, 24);
      g.rotate(facing > 0 ? -1.2 : 1.2);
      g.translate(-12, -24);
      // draw lying body in a simplified pose
      rect(4, 19, 16, 5, col.body);
      rect(2, 19, 5, 5, col.skin);
      rect(18, 20, 5, 4, col.legs);
      g.restore();
      return c;
    }

    // legs
    const legSwing = run === 1 || run === 3 ? 2 : run === 2 ? -1 : 0;
    if (jump) {
      rect(8, 23, 4, 6, col.legs);
      rect(13, 23, 4, 5, col.legs);
    } else if (dodge) {
      rect(6, 25, 5, 4, col.legs);
      rect(14, 25, 5, 4, col.legs);
    } else {
      rect(8 + legSwing, 23, 4, 8 - Math.abs(legSwing), col.legs);
      rect(13 - legSwing, 23, 4, 8 - Math.abs(legSwing), col.legs);
      rect(8 + legSwing, 29, 5, 2, '#1a1a24');
      rect(13 - legSwing, 29, 5, 2, '#1a1a24');
    }

    // torso
    const ty = 12 + bob - (jump ? 1 : 0);
    rect(7, ty, 11, 11, col.body);
    rect(7, ty + 8, 11, 3, col.accent);
    rect(10, ty, 2, 11, col.trim);
    if (block) rect(5, ty + 2, 14, 8, col.legs);

    // arms / attack pose
    if (attack) {
      const ext = frame === 1 || frame === 2 ? 9 : 5;
      rect(17, ty + 2, ext, 4, col.skin);
      rect(17 + ext - 2, ty + 1, 4, 5, col.accent);
      rect(4, ty + 3, 5, 4, col.body);
    } else if (block) {
      rect(4, ty + 1, 6, 8, col.skin);
      rect(15, ty + 1, 6, 8, col.skin);
    } else {
      const swing = run === 1 ? -2 : run === 3 ? 2 : 0;
      rect(4, ty + 3 + swing, 4, 7, col.skin);
      rect(17, ty + 3 - swing, 4, 7, col.skin);
    }

    // head
    const hy = 4 + bob - (jump ? 1 : 0);
    rect(8, hy, 9, 8, col.skin);
    rect(8, hy, 9, 3, col.hair);
    rect(13, hy + 4, 2, 2, '#101018');
    rect(10, hy + 4, 2, 1, '#101018');
    if (hurt) rect(10, hy + 6, 5, 1, '#7a2230');

    // signature accessories
    switch (def.id) {
      case 'rubber':
        rect(6, hy - 2, 13, 2, '#e8c449');
        rect(8, hy - 4, 9, 3, '#d9a832');
        rect(10, hy + 7, 5, 1, '#b03a34');
        break;
      case 'blade':
        rect(19, ty + 1, 2, 13, '#e8eef5');
        rect(18, ty + 12, 4, 2, '#9fb0c4');
        rect(7, hy, 9, 2, '#183b28');
        break;
      case 'storm':
        rect(7, hy + 2, 11, 2, '#2b3f78');
        rect(14, hy + 2, 3, 2, '#8fd8ff');
        rect(8, hy - 2, 9, 2, '#c9472a');
        break;
      case 'iron':
        rect(7, hy - 1, 11, 2, '#d8d8d0');
        rect(13, hy + 5, 3, 3, '#d8342f');
        break;
      case 'tiny':
        rect(6, hy - 2, 2, 4, '#a4562b');
        rect(17, hy - 2, 2, 4, '#a4562b');
        rect(9, hy + 1, 7, 5, '#f5f0d0');
        break;
      case 'cyborg':
        rect(4, ty + 3, 5, 7, '#9aa5ad');
        rect(7, hy + 2, 11, 2, '#f4c542');
        break;
      case 'bone':
        rect(8, hy + 6, 9, 1, '#dfe4ef');
        rect(9, hy + 5, 2, 1, '#8b4fd8');
        rect(14, hy + 5, 2, 1, '#8b4fd8');
        break;
      case 'hunter':
        rect(6, hy - 2, 13, 3, '#e8e8e8');
        rect(4, ty + 1, 4, 12, '#2c6e78');
        break;
      case 'specter':
        rect(7, hy + 5, 11, 2, '#b8c8ff');
        rect(19, ty, 2, 15, '#b8c8ff');
        rect(4, ty + 4, 3, 10, 'rgba(184,200,255,.5)');
        break;
      case 'desert':
        rect(5, hy - 1, 15, 3, '#f6df9e');
        rect(10, hy - 4, 5, 4, '#c98a3e');
        rect(18, ty + 1, 3, 11, '#f6df9e');
        break;
      case 'guns':
        rect(6, hy - 1, 13, 2, '#3d4a63');
        rect(17, ty + 3, 7, 3, '#f0c542');
        rect(4, ty + 3, 7, 3, '#f0c542');
        break;
      case 'giant':
        rect(4, ty - 2, 17, 5, '#ffa63a');
        rect(19, ty + 2, 6, 8, '#7a5c44');
        rect(4, ty + 2, 6, 8, '#7a5c44');
        break;
      case 'moon':
        rect(8, hy - 3, 9, 3, '#e9e2ff');
        rect(6, hy, 2, 6, '#7a6bbf');
        rect(17, hy, 2, 6, '#7a6bbf');
        break;
      case 'venom':
        rect(6, hy - 3, 4, 4, '#8ce06a');
        rect(15, hy - 3, 4, 4, '#8ce06a');
        rect(19, ty + 3, 6, 2, '#8ce06a');
        break;
      case 'berserker':
        rect(6, hy - 2, 13, 3, '#c94f2e');
        rect(4, ty + 2, 4, 12, '#2a6f8a');
        rect(19, ty + 4, 5, 3, '#7fe4ff');
        break;
      case 'gold':
        rect(6, hy - 3, 13, 4, '#f4c542');
        rect(9, hy - 6, 7, 4, '#fff2a8');
        rect(7, ty + 9, 11, 2, '#fff2a8');
        break;
    }
    return c;
  }
}

export const spriteFactory = new SpriteFactory();
