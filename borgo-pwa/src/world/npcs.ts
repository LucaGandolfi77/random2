import * as THREE from 'three';
import type { NpcId, NpcSpec } from '../data/types';
import { animateIdle, createBlobShadow, createPerson } from './person';

export type IndicatorKind = 'none' | 'quest' | 'ready';

export interface NpcActor {
  id: NpcId;
  name: string;
  x: number;
  z: number;
  group: THREE.Group;
  indicator: THREE.Sprite;
  setIndicator(kind: IndicatorKind): void;
  update(dt: number, time: number, player: THREE.Vector3): void;
}

const NAMES: Record<NpcId, string> = {
  ada: 'Ada',
  elio: 'Elio',
  marta: 'Marta',
  nino: 'Nino',
  beppe: 'Beppe',
  lidia: 'Lidia',
  sara: 'Sara'
};

const textures = new Map<IndicatorKind, THREE.CanvasTexture>();

function indicatorTexture(kind: IndicatorKind): THREE.CanvasTexture | null {
  if (kind === 'none') return null;
  const cached = textures.get(kind);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gold = kind === 'quest';
  ctx.beginPath();
  ctx.arc(64, 64, 46, 0, Math.PI * 2);
  ctx.fillStyle = gold ? '#d9a441' : '#f5ecd9';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#2b241c';
  ctx.stroke();

  ctx.fillStyle = '#2b241c';
  ctx.font = '700 68px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gold ? '!' : '?', 64, 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textures.set(kind, texture);
  return texture;
}

export function createNpcActor(spec: NpcSpec): NpcActor {
  const rig = createPerson(spec.id);  const group = rig.group;
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.facing;

  const shadow = createBlobShadow(1);
  shadow.position.y = 0.02;
  group.add(shadow);

  const material = new THREE.SpriteMaterial({
    map: indicatorTexture('quest') ?? undefined,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });
  const indicator = new THREE.Sprite(material);
  indicator.scale.set(0.55, 0.55, 1);
  indicator.position.set(0, 2.36, 0);
  indicator.visible = false;
  group.add(indicator);

  let targetFacing = spec.facing;
  let currentFacing = spec.facing;

  return {
    id: spec.id,
    name: NAMES[spec.id],
    x: spec.x,
    z: spec.z,
    group,
    indicator,
    setIndicator(kind: IndicatorKind): void {
      if (kind === 'none') {
        indicator.visible = false;
        return;
      }
      const texture = indicatorTexture(kind);
      if (!texture) {
        indicator.visible = false;
        return;
      }
      material.map = texture;
      material.needsUpdate = true;
      indicator.visible = true;
    },
    update(dt: number, time: number, player: THREE.Vector3): void {
      animateIdle(rig, time);
      const dx = player.x - spec.x;
      const dz = player.z - spec.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 6.5) {
        targetFacing = Math.atan2(dx, dz);
      } else {
        targetFacing = spec.facing;
      }
      let delta = targetFacing - currentFacing;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      currentFacing += delta * Math.min(1, dt * 3.2);
      group.rotation.y = currentFacing;

      indicator.position.y = 2.36 + Math.sin(time * 2.1) * 0.055;
      if (indicator.visible) {
        const pulse = 1 + Math.sin(time * 2.4) * 0.06;
        indicator.scale.set(0.55 * pulse, 0.55 * pulse, 1);
      }
    }
  };
}

export function npcName(id: NpcId): string {
  return NAMES[id];
}
