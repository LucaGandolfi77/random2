import { LowPolyCharacter } from './LowPolyCharacter';
import type { HumanoidOptions } from './LowPolyCharacter';

export const SHEPHERD_OPTIONS: HumanoidOptions = {
  id: 'shepherd',
  variant: 'shepherd',
  height: 1.72,
  headScale: 1.02,
  bodyWidth: 1.08,
  skin: 0xb78a66,
  hair: 0x9b9488,
  top: 0x5a5043,
  shirt: 0x5d5346,
  pants: 0x3a3229,
  shoes: 0x241e19,
  accent: 0x463b2e,
  coat: 'cloak',
  hat: 'brim',
  hairStyle: 'long',
  beard: true,
  handProp: 'staff',
  seed: 71,
};

export function createShepherd(): LowPolyCharacter {
  return new LowPolyCharacter(SHEPHERD_OPTIONS);
}
