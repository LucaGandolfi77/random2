import { LowPolyCharacter } from './LowPolyCharacter';
import type { HumanoidOptions } from './LowPolyCharacter';

export const ARTURO_OPTIONS: HumanoidOptions = {
  id: 'arturo',
  variant: 'arturo',
  height: 1.78,
  headScale: 1.13,
  bodyWidth: 0.98,
  skin: 0xd3a17c,
  hair: 0x2b2420,
  top: 0x6c5541,
  shirt: 0xe8dfcd,
  pants: 0x2b2d35,
  shoes: 0x141414,
  accent: 0x7b312b,
  coat: 'jacket',
  tie: true,
  hat: 'none',
  hairStyle: 'short',
  seed: 11,
};

export function createArturo(): LowPolyCharacter {
  return new LowPolyCharacter(ARTURO_OPTIONS);
}
