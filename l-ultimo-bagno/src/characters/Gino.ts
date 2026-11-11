import { LowPolyCharacter } from './LowPolyCharacter';
import type { HumanoidOptions } from './LowPolyCharacter';

export const GINO_OPTIONS: HumanoidOptions = {
  id: 'gino',
  variant: 'gino',
  height: 1.98,
  headScale: 0.92,
  bodyWidth: 0.8,
  slim: true,
  skin: 0xc89771,
  hair: 0x4d443a,
  top: 0x5d6064,
  shirt: 0xd8d0c0,
  pants: 0x57432f,
  shoes: 0x211b16,
  accent: 0x35383c,
  coat: 'long',
  tie: false,
  hat: 'brim',
  hairStyle: 'short',
  wideShoes: true,
  longArms: true,
  seed: 23,
};

export function createGino(): LowPolyCharacter {
  return new LowPolyCharacter(GINO_OPTIONS);
}
