import { createArturo } from './Arturo';
import { createGino } from './Gino';
import { createShepherd } from './Shepherd';
import { CyclistActor, DogActor, SheepActor } from './Extras';
import { LowPolyCharacter } from './LowPolyCharacter';
import type { HumanoidOptions } from './LowPolyCharacter';

const YOGI_PALETTES = [
  { top: 0x79856b, pants: 0x5c6654, skin: 0xcda07c, hair: 0x3a2f28 },
  { top: 0x8b7f6c, pants: 0x4d5156, skin: 0xd9ae8a, hair: 0x272320 },
  { top: 0x6f7b80, pants: 0x5a544c, skin: 0xbf8e69, hair: 0x4b4037 },
];

export class CharacterFactory {
  static arturo(): LowPolyCharacter {
    return createArturo();
  }

  static gino(): LowPolyCharacter {
    return createGino();
  }

  static instructor(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'instructor',
      variant: 'instructor',
      height: 1.72,
      headScale: 0.96,
      bodyWidth: 0.76,
      slim: true,
      skin: 0xcf9e78,
      hair: 0x2e2620,
      top: 0x718061,
      shirt: 0x8c9a7d,
      pants: 0x4d5a45,
      shoes: 0x2b2b27,
      accent: 0x465044,
      coat: 'jacket',
      hairStyle: 'bun',
      longArms: true,
      seed: 37,
    });
  }

  static yogi(index: number): LowPolyCharacter {
    const palette = YOGI_PALETTES[index % YOGI_PALETTES.length];
    return new LowPolyCharacter({
      id: `yogi${index + 1}`,
      variant: 'yogi',
      height: 1.62 + (index % 3) * 0.06,
      headScale: 0.94,
      bodyWidth: 0.72,
      slim: true,
      skin: palette.skin,
      hair: palette.hair,
      top: palette.top,
      shirt: 0xd8d0bf,
      pants: palette.pants,
      shoes: 0x2b2925,
      accent: palette.pants,
      coat: 'jacket',
      hairStyle: index === 1 ? 'bun' : 'short',
      seed: 41 + index * 7,
    });
  }

  static shepherd(): LowPolyCharacter {
    return createShepherd();
  }

  static bride(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'bride',
      variant: 'bride',
      height: 1.8,
      headScale: 0.95,
      bodyWidth: 0.72,
      slim: true,
      skin: 0xe0b28c,
      hair: 0x6b4b34,
      top: 0xf0e9dc,
      shirt: 0xf5efe4,
      pants: 0xe6ddcd,
      shoes: 0xd9cdb8,
      accent: 0xf5efe4,
      coat: 'dress',
      hairStyle: 'bun',
      hat: 'veil',
      seed: 53,
    });
  }

  static groom(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'groom',
      variant: 'groom',
      height: 1.86,
      headScale: 0.93,
      bodyWidth: 0.86,
      skin: 0xc79772,
      hair: 0x2b2722,
      top: 0x2d3038,
      shirt: 0xe7dfd0,
      pants: 0x272a31,
      shoes: 0x141414,
      accent: 0x6c3b35,
      coat: 'jacket',
      tie: true,
      hairStyle: 'short',
      seed: 59,
    });
  }

  static photographer(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'photographer',
      variant: 'photographer',
      height: 1.76,
      headScale: 0.98,
      bodyWidth: 0.9,
      skin: 0xc69570,
      hair: 0x312a24,
      top: 0x3c4148,
      shirt: 0xc4b9a4,
      pants: 0x2d3034,
      shoes: 0x181818,
      accent: 0x2e3237,
      coat: 'vest',
      hat: 'cap',
      hairStyle: 'short',
      handProp: 'camera',
      seed: 61,
    });
  }

  static dogman(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'dogman',
      variant: 'dogman',
      height: 1.8,
      headScale: 0.94,
      bodyWidth: 0.9,
      skin: 0xc09b7c,
      hair: 0x4a4239,
      top: 0x4a4b43,
      shirt: 0x9b9282,
      pants: 0x31322c,
      shoes: 0x22201c,
      accent: 0x3b3c36,
      coat: 'jacket',
      hat: 'cap',
      hairStyle: 'short',
      seed: 67,
    });
  }

  static astronomer(index: number): LowPolyCharacter {
    const warm = index === 0;
    return new LowPolyCharacter({
      id: `astronomer${index + 1}`,
      variant: 'astronomer',
      height: 1.68 + index * 0.06,
      headScale: 1.02,
      bodyWidth: 0.94,
      skin: warm ? 0xcfa47f : 0xb98e6d,
      hair: warm ? 0x54463a : 0x3c3833,
      top: warm ? 0x4a4438 : 0x33434d,
      shirt: 0xc9c0ae,
      pants: 0x2c3034,
      shoes: 0x1c1c1a,
      accent: 0x3a352d,
      coat: 'long',
      hat: index === 0 ? 'brim' : 'cap',
      hairStyle: 'short',
      seed: 73 + index,
    });
  }

  static director(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'director',
      variant: 'director',
      height: 1.72,
      headScale: 1.03,
      bodyWidth: 0.92,
      skin: 0xd0a17b,
      hair: 0x2d2722,
      top: 0x30333a,
      shirt: 0x5f6570,
      pants: 0x282a2f,
      shoes: 0x181818,
      accent: 0x20252b,
      coat: 'long',
      hat: 'beret',
      handProp: 'megaphone',
      hairStyle: 'short',
      seed: 83,
    });
  }

  static cameraman(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'cameraman',
      variant: 'cameraman',
      height: 1.8,
      headScale: 0.94,
      bodyWidth: 0.92,
      skin: 0xc79470,
      hair: 0x322b25,
      top: 0x353a40,
      shirt: 0xb7ac98,
      pants: 0x2b2e33,
      shoes: 0x1a1a1a,
      accent: 0x2e3237,
      coat: 'vest',
      hat: 'cap',
      handProp: 'film-camera',
      hairStyle: 'short',
      seed: 89,
    });
  }

  static boomOperator(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'boom',
      variant: 'boom',
      height: 1.9,
      headScale: 0.9,
      bodyWidth: 0.82,
      slim: true,
      skin: 0xb98c68,
      hair: 0x4a3d32,
      top: 0x3d4146,
      shirt: 0x8c8577,
      pants: 0x2f3235,
      shoes: 0x1c1c1b,
      accent: 0x33363a,
      coat: 'jacket',
      hat: 'cap',
      handProp: 'boom',
      hairStyle: 'short',
      longArms: true,
      seed: 97,
    });
  }

  static productionAssistant(): LowPolyCharacter {
    return new LowPolyCharacter({
      id: 'pa',
      variant: 'pa',
      height: 1.66,
      headScale: 0.97,
      bodyWidth: 0.76,
      slim: true,
      skin: 0xd0a37f,
      hair: 0x3c3129,
      top: 0x52626a,
      shirt: 0xd5cbb9,
      pants: 0x343a3e,
      shoes: 0x222220,
      accent: 0x2c3438,
      coat: 'jacket',
      hat: 'cap',
      handProp: 'bag',
      hairStyle: 'bun',
      seed: 101,
    });
  }

  static dog(): DogActor {
    return new DogActor('dog');
  }

  static cyclist(): CyclistActor {
    return new CyclistActor('cyclist');
  }

  static sheep(index: number): SheepActor {
    return new SheepActor(`sheep${index + 1}`, index);
  }
}
