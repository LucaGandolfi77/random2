import { buffSpecial, dashSpecial, superMelee } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterFashionError = defineFighter({
  id: 'fashionerror',
  name: 'FASHION ERROR',
  subtitle: 'The Runway Killer',
  archetype: 'Rushdown / mobility',
  edition: 'italian',
  bio: 'La sua sfilata è un crimine contro il buon gusto e contro i tempi di recupero. La borsa è blindata. Tu no.',
  stats: { power: 2, speed: 5, range: 3, technique: 4, defense: 2 },
  height: 1.03,
  weight: 0.9,
  appearance: {
    skin: '#e2b79c',
    hairColor: '#111111',
    hairStyle: 'mohawk',
    outfitStyle: 'armor',
    primary: '#111111',
    secondary: '#f5f5f5',
    accent: '#ff2e63',
    shoes: '#ff2e63',
    aura: '#ff2e63',
    accessories: ['sunglasses', 'bag', 'boots', 'gloves'],
    height: 1.03,
    build: 0.88,
    headScale: 0.94,
    face: 'fierce',
    eyeColor: '#111111',
    lipColor: '#ff2e63',
    pattern: 'checker'
  },
  ai: { aggression: 0.82, defense: 0.35, combo: 0.78, special: 0.65 },
  rivalries: ['mrtrailer'],
  quotes: {
    intro: 'Questa passerella non perdona. Io sì.',
    victory: 'Il tuo outfit era già una sconfitta.',
    defeat: 'Brutto. Ma almeno hai fatto parlare.'
  },
  victoryTitle: 'PRIMA FILA',
  musicMotif: 'fashion',
  special1: dashSpecial('catwalk_kick', 'Catwalk Kick', 3.4, {
    damage: 80,
    startup: 9,
    vfx: 'catwalk',
    sfx: 'kickHeavy'
  }),
  special2: buffSpecial(
    'borsa_blindata',
    'Borsa Blindata',
    { damage: 1.18, defense: 0.72, armor: true, duration: 300 },
    { vfx: 'briefcase' }
  ),
  superMove: superMelee('fashion_week', 'FASHION WEEK', 224, {
    vfx: 'runway',
    active: 16,
    hitbox: { x: 0.2, y: 0.5, w: 1.8, h: 1.5 }
  }),
  finisherName: 'Fashion Week',
  hypeName: 'BACKSTAGE PASS'
});
