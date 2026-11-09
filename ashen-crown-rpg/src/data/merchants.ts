export interface MerchantDef {
  id: string;
  name: string;
  greeting: string;
  stock: { itemId: string; quantity: number }[];
}

export const merchants: MerchantDef[] = [
  {
    id: 'bree',
    name: 'Bree’s Provisions',
    greeting: 'Everything has a price. Some things have two.',
    stock: [
      { itemId: 'healing_potion', quantity: 6 },
      { itemId: 'greater_healing', quantity: 2 },
      { itemId: 'focus_tonic', quantity: 4 },
      { itemId: 'antidote', quantity: 3 },
      { itemId: 'fire_flask', quantity: 3 },
      { itemId: 'iron_helm', quantity: 1 },
      { itemId: 'leather_armor', quantity: 1 },
      { itemId: 'chain_mail', quantity: 1 },
      { itemId: 'ashwood_bow', quantity: 1 },
      { itemId: 'oak_staff', quantity: 1 },
      { itemId: 'covenant_shield', quantity: 1 },
      { itemId: 'pilgrim_beads', quantity: 1 },
      { itemId: 'tidal_ring', quantity: 1 },
      { itemId: 'scroll_revive', quantity: 1 },
      { itemId: 'repair_kit', quantity: 3 }
    ]
  }
];

export const merchantById = Object.fromEntries(merchants.map((m) => [m.id, m]));
