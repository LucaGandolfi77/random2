export type HairStyle =
  | 'short'
  | 'buzz'
  | 'long'
  | 'ponytail'
  | 'curly'
  | 'mohawk'
  | 'braids'
  | 'bun'
  | 'wavy'
  | 'helmet'
  | 'cowboy'
  | 'crown'
  | 'hood'
  | 'none';

export type OutfitStyle =
  | 'jacket'
  | 'hoodie'
  | 'dress'
  | 'suit'
  | 'apron'
  | 'jersey'
  | 'gown'
  | 'coat'
  | 'tracksuit'
  | 'armor'
  | 'tee'
  | 'corset'
  | 'robe';

export type Accessory =
  | 'headphones'
  | 'sunglasses'
  | 'chain'
  | 'mic'
  | 'scarf'
  | 'cape'
  | 'gloves'
  | 'boots'
  | 'bag'
  | 'helmet'
  | 'cap'
  | 'mask'
  | 'visor'
  | 'crown'
  | 'wings'
  | 'tail'
  | 'guitar'
  | 'ladle'
  | 'flag'
  | 'camera'
  | 'stopwatch'
  | 'ringLight'
  | 'phone'
  | 'cowboyHat'
  | 'tiara'
  | 'halo'
  | 'horns'
  | 'earpiece'
  | 'choker'
  | 'armband'
  | 'sash'
  | 'checkerFlag';

export type FaceStyle =
  | 'cool'
  | 'sweet'
  | 'fierce'
  | 'sad'
  | 'smug'
  | 'kind'
  | 'wild'
  | 'glam'
  | 'dark'
  | 'robot'
  | 'neutral'
  | 'goofy';

export type PatternStyle = 'solid' | 'stripes' | 'glow' | 'glitter' | 'camo' | 'checker' | 'stars';

export interface Appearance {
  skin: string;
  hairColor: string;
  hairStyle: HairStyle;
  outfitStyle: OutfitStyle;
  primary: string;
  secondary: string;
  accent: string;
  shoes: string;
  aura: string;
  accessories: Accessory[];
  height: number;
  build: number;
  headScale: number;
  face: FaceStyle;
  eyeColor?: string;
  lipColor?: string;
  pattern?: PatternStyle;
}

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  aura: string;
}
