import { DogActor } from './Extras';
import { LowPolyCharacter } from './LowPolyCharacter';
import type { HumanoidOptions } from './LowPolyCharacter';

const base = (options: HumanoidOptions): LowPolyCharacter => new LowPolyCharacter(options);

export class CharacterFactory {
  static donnino(): LowPolyCharacter {
    return base({
      id: 'donnino',
      variant: 'donnino',
      height: 1.88,
      headScale: 0.98,
      bodyWidth: 0.94,
      skin: 0xc99a78,
      hair: 0x2f2620,
      top: 0xe6dac1,
      shirt: 0xf0e7d4,
      pants: 0x8f7c60,
      shoes: 0x3d3027,
      accent: 0x6b2730,
      coat: 'toga',
      handProp: 'crown',
      hairStyle: 'short',
      beard: false,
      seed: 7,
    });
  }

  static massimiano(): LowPolyCharacter {
    return base({
      id: 'massimiano',
      variant: 'massimiano',
      height: 1.92,
      headScale: 1.02,
      bodyWidth: 1.1,
      skin: 0xcaa080,
      hair: 0x40342b,
      top: 0x5c2330,
      shirt: 0xd9c9a8,
      pants: 0x3c2b28,
      shoes: 0x2a1e19,
      accent: 0xc99a3f,
      coat: 'toga',
      hat: 'laurel',
      hairStyle: 'short',
      beard: true,
      seed: 11,
    });
  }

  static cristiano(): LowPolyCharacter {
    return base({
      id: 'cristiano',
      variant: 'cristiano',
      height: 1.74,
      headScale: 0.98,
      bodyWidth: 0.86,
      slim: true,
      skin: 0xb98c68,
      hair: 0x3a2f26,
      top: 0x998a6b,
      shirt: 0xb8a98a,
      pants: 0x5a5040,
      shoes: 0x312820,
      accent: 0x6b5b45,
      coat: 'long',
      hairStyle: 'long',
      beard: true,
      seed: 17,
    });
  }

  static oste(): LowPolyCharacter {
    return base({
      id: 'oste',
      variant: 'oste',
      height: 1.71,
      headScale: 0.97,
      bodyWidth: 0.9,
      skin: 0xc39a74,
      hair: 0x3d332a,
      top: 0x5b5143,
      shirt: 0x8d816b,
      pants: 0x4a4236,
      shoes: 0x2c251e,
      accent: 0x3a2f26,
      coat: 'cloak',
      hat: 'hood',
      hairStyle: 'short',
      beard: true,
      seed: 23,
    });
  }

  static centurione(): LowPolyCharacter {
    return base({
      id: 'centurione',
      variant: 'centurione',
      height: 1.9,
      headScale: 0.97,
      bodyWidth: 0.94,
      skin: 0xbe8e6b,
      hair: 0x3a2f26,
      top: 0x8b8f8c,
      shirt: 0x6f7472,
      pants: 0x4a3a2c,
      shoes: 0x2a211a,
      accent: 0x7c2f2a,
      coat: 'armor',
      hat: 'helmet',
      hairStyle: 'short',
      beard: true,
      seed: 29,
    });
  }

  static soldato(): LowPolyCharacter {
    return base({
      id: 'soldato',
      variant: 'soldato',
      height: 1.82,
      headScale: 0.96,
      bodyWidth: 0.9,
      skin: 0xc09270,
      hair: 0x3c3128,
      top: 0x7f8580,
      shirt: 0x686d68,
      pants: 0x43372b,
      shoes: 0x29211b,
      accent: 0x6f2a26,
      coat: 'armor',
      hat: 'helmet',
      hairStyle: 'short',
      seed: 31,
    });
  }

  static guardia(index: number): LowPolyCharacter {
    return base({
      id: `guardia${index}`,
      variant: 'guardia',
      height: 1.8 + index * 0.02,
      headScale: 0.96,
      bodyWidth: 0.92,
      skin: index === 1 ? 0xbb8c69 : 0xc89a76,
      hair: index === 1 ? 0x342a22 : 0x44382d,
      top: 0x7d817d,
      shirt: 0x656a65,
      pants: 0x41352a,
      shoes: 0x282019,
      accent: 0x6c2b27,
      coat: 'armor',
      hat: 'helmet',
      hairStyle: 'short',
      seed: 37 + index,
    });
  }

  static carnefice(): LowPolyCharacter {
    return base({
      id: 'carnefice',
      variant: 'carnefice',
      height: 1.98,
      headScale: 1.04,
      bodyWidth: 1.14,
      skin: 0xb0805f,
      hair: 0x2a201a,
      top: 0x3d2f26,
      shirt: 0x6a5a48,
      pants: 0x2b2420,
      shoes: 0x211a16,
      accent: 0x8a3a2c,
      coat: 'apron',
      hat: 'hood',
      hairStyle: 'short',
      beard: true,
      handProp: 'axe',
      longArms: true,
      seed: 41,
    });
  }

  static contadino(): LowPolyCharacter {
    return base({
      id: 'contadino',
      variant: 'contadino',
      height: 1.73,
      headScale: 0.98,
      bodyWidth: 0.88,
      skin: 0xb98964,
      hair: 0x4a3b2e,
      top: 0x8b7a5b,
      shirt: 0xb39c76,
      pants: 0x6a5a43,
      shoes: 0x322920,
      accent: 0x5a4a36,
      coat: 'vest',
      hat: 'straw',
      hairStyle: 'short',
      beard: true,
      seed: 43,
    });
  }

  static bambino(): LowPolyCharacter {
    return base({
      id: 'bambino',
      variant: 'bambino',
      height: 1.16,
      headScale: 1.16,
      bodyWidth: 0.74,
      slim: true,
      skin: 0xd2a47d,
      hair: 0x3b2d23,
      top: 0x9b8b6d,
      shirt: 0xbcaa8a,
      pants: 0x6e5d45,
      shoes: 0x372b22,
      accent: 0x6b5a45,
      coat: 'jacket',
      hairStyle: 'short',
      seed: 47,
    });
  }

  static vedova(): LowPolyCharacter {
    return base({
      id: 'vedova',
      variant: 'vedova',
      height: 1.63,
      headScale: 0.96,
      bodyWidth: 0.8,
      slim: true,
      skin: 0xc79a78,
      hair: 0x54463a,
      top: 0x3c3630,
      shirt: 0x5a534a,
      pants: 0x2f2a26,
      shoes: 0x24201c,
      accent: 0x4a4239,
      coat: 'dress',
      hat: 'veil',
      hairStyle: 'bun',
      seed: 53,
    });
  }

  static maestro(): LowPolyCharacter {
    return base({
      id: 'maestro',
      variant: 'maestro',
      height: 1.76,
      headScale: 1.01,
      bodyWidth: 0.96,
      skin: 0xc79a72,
      hair: 0x4a4038,
      top: 0x6e5b46,
      shirt: 0xa08c6f,
      pants: 0x4c4034,
      shoes: 0x2b221c,
      accent: 0x8b6f46,
      coat: 'apron',
      hat: 'beret',
      hairStyle: 'short',
      beard: true,
      handProp: 'hammer',
      seed: 59,
    });
  }

  static apprendista(): LowPolyCharacter {
    return base({
      id: 'apprendista',
      variant: 'apprendista',
      height: 1.68,
      headScale: 0.98,
      bodyWidth: 0.82,
      slim: true,
      skin: 0xd0a680,
      hair: 0x3a2d24,
      top: 0x7f7055,
      shirt: 0xa89572,
      pants: 0x5b4c3a,
      shoes: 0x30261e,
      accent: 0x5f513d,
      coat: 'jacket',
      hat: 'cap',
      hairStyle: 'short',
      seed: 61,
    });
  }

  static pellegrino(): LowPolyCharacter {
    return base({
      id: 'pellegrino',
      variant: 'pellegrino',
      height: 1.78,
      headScale: 0.99,
      bodyWidth: 0.88,
      skin: 0xc2926d,
      hair: 0x4a3d32,
      top: 0x5a5a45,
      shirt: 0x9b8f75,
      pants: 0x4a4236,
      shoes: 0x2c251f,
      accent: 0x6b5e48,
      coat: 'cloak',
      hat: 'brim',
      hairStyle: 'short',
      beard: true,
      handProp: 'staff',
      seed: 67,
    });
  }

  static cortigiano(): LowPolyCharacter {
    return base({
      id: 'cortigiano',
      variant: 'cortigiano',
      height: 1.8,
      headScale: 0.97,
      bodyWidth: 0.9,
      skin: 0xc59a74,
      hair: 0x382e26,
      top: 0x4f4a3d,
      shirt: 0x8f8268,
      pants: 0x3f372e,
      shoes: 0x2a231d,
      accent: 0x7a5a32,
      coat: 'toga',
      hairStyle: 'short',
      seed: 71,
    });
  }

  static cane(): DogActor {
    return new DogActor('cane');
  }
}
