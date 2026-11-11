export interface RestaurantTier {
  level: number;
  name: string;
  reputation: number;
  description: string;
  accent: string;
  wall: string;
  floor: string;
  seats: number;
  glow: number;
}

export const RESTAURANT_TIERS: RestaurantTier[] = [
  {
    level: 1,
    name: 'Tiny Sushi Corner',
    reputation: 0,
    description: 'A warm little counter and one very brave lantern.',
    accent: '#A7B99A',
    wall: '#F7F1E5',
    floor: '#C9A97A',
    seats: 2,
    glow: 0.25,
  },
  {
    level: 2,
    name: 'Little Sushi House',
    reputation: 25,
    description: 'Two tables, a proper noren and a plant that has opinions.',
    accent: '#607B62',
    wall: '#F4EDDF',
    floor: '#C9A97A',
    seats: 4,
    glow: 0.4,
  },
  {
    level: 3,
    name: 'Sakura Sushi Cafe',
    reputation: 60,
    description: 'Petals on the windowsill and regulars who know your name.',
    accent: '#EBC6CB',
    wall: '#FBF3E8',
    floor: '#C9A97A',
    seats: 6,
    glow: 0.52,
  },
  {
    level: 4,
    name: 'Premium Sushi Atelier',
    reputation: 110,
    description: 'Warm wood, quiet light and plates worth photographing.',
    accent: '#EF9D91',
    wall: '#F3E9D9',
    floor: '#B98F66',
    seats: 8,
    glow: 0.65,
  },
  {
    level: 5,
    name: 'Nori Nook Grand Restaurant',
    reputation: 170,
    description: 'The little corner the whole street talks about.',
    accent: '#F4C36B',
    wall: '#F7F1E5',
    floor: '#A97B54',
    seats: 10,
    glow: 0.82,
  },
];

export const tierForReputation = (reputation: number): RestaurantTier => {
  for (let index = RESTAURANT_TIERS.length - 1; index >= 0; index -= 1) {
    const tier = RESTAURANT_TIERS[index];
    if (tier && reputation >= tier.reputation) return tier;
  }
  return RESTAURANT_TIERS[0]!;
};
