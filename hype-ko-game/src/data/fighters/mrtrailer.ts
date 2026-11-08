import { explosionSpecial, superMelee } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterMrTrailer = defineFighter({
  id: 'mrtrailer',
  name: 'MR. TRAILER',
  subtitle: 'The Action Hero',
  archetype: 'Balanced / explosives',
  edition: 'international',
  bio: 'Nel trailer sopravvive a tutto. Nel gioco ha già firmato tre sequel e un’assicurazione sulla sconfitta.',
  stats: { power: 4, speed: 3, range: 4, technique: 3, defense: 3 },
  height: 1.05,
  weight: 1.1,
  appearance: {
    skin: '#c98f68',
    hairColor: '#2a1d16',
    hairStyle: 'short',
    outfitStyle: 'coat',
    primary: '#3a231c',
    secondary: '#d9d2c3',
    accent: '#ff7b00',
    shoes: '#1d1512',
    aura: '#ff7b00',
    accessories: ['sunglasses', 'gloves', 'camera', 'chain'],
    height: 1.05,
    build: 1.1,
    headScale: 0.97,
    face: 'cool',
    eyeColor: '#2a1d16',
    pattern: 'camo'
  },
  ai: { aggression: 0.7, defense: 0.55, combo: 0.6, special: 0.65 },
  rivalries: ['fashionerror'],
  quotes: {
    intro: 'Nella scena dopo il combattimento, esplode tutto.',
    victory: 'Taglia. Stampa. Sequel.',
    defeat: 'Questa la teniamo nel blooper. Fa ridere.'
  },
  victoryTitle: 'OSCAR DEL TRAILER',
  musicMotif: 'action',
  special1: explosionSpecial('prop_punch', 'Prop Punch', 82, 2.2, 16, true, {
    vfx: 'propBoom'
  }),
  special2: explosionSpecial('explosion_behind', 'Explosion Behind', 92, 2.4, 30, true, {
    vfx: 'delayedBoom'
  }),
  superMove: superMelee('blooper_oscar', 'BLOOPER DA OSCAR', 236, {
    vfx: 'blooper',
    active: 18,
    hitbox: { x: 0.2, y: 0.5, w: 1.9, h: 1.6 }
  }),
  finisherName: 'Blooper da Oscar',
  hypeName: 'TAKE BREAKER'
});
