import { buffSpecial, dashSpecial, superMelee } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterAceTurbo = defineFighter({
  id: 'aceturbo',
  name: 'ACE TURBO',
  subtitle: 'The Speed Demon',
  archetype: 'Rushdown / speed',
  edition: 'international',
  bio: 'Ha battuto il record del giro più veloce e quello del pit stop più drammatico. Il suo carburante è l’attenzione. Il suo freno è un’opinione.',
  stats: { power: 3, speed: 5, range: 2, technique: 3, defense: 4 },
  height: 1.0,
  weight: 0.95,
  appearance: {
    skin: '#c48b63',
    hairColor: '#151515',
    hairStyle: 'helmet',
    outfitStyle: 'tracksuit',
    primary: '#e63946',
    secondary: '#f5f5f5',
    accent: '#ffd166',
    shoes: '#151515',
    aura: '#e63946',
    accessories: ['helmet', 'visor', 'stopwatch', 'checkerFlag'],
    height: 1.0,
    build: 0.93,
    headScale: 0.96,
    face: 'cool',
    eyeColor: '#ffd166',
    pattern: 'checker'
  },
  ai: { aggression: 0.84, defense: 0.4, combo: 0.72, special: 0.6 },
  rivalries: ['808nero'],
  quotes: {
    intro: 'Il semaforo è verde. Tu sei ancora in pit lane.',
    victory: 'Bandiera a scacchi. Grazie per la scia.',
    defeat: 'Problema di assetto. E di orgoglio.'
  },
  victoryTitle: 'PODIO',
  musicMotif: 'racing',
  special1: dashSpecial('slipstream', 'Slipstream', 4.0, {
    damage: 76,
    startup: 8,
    vfx: 'slipstream',
    sfx: 'dash'
  }),
  special2: buffSpecial(
    'pit_stop',
    'Pit Stop',
    { damage: 1.12, speed: 1.22, heal: 130, duration: 260 },
    { vfx: 'pitStop' }
  ),
  superMove: superMelee('bandiera_scacchi', 'BANDIERA A SCACCHI', 222, {
    vfx: 'checkerFlag',
    active: 15,
    hitbox: { x: 0.2, y: 0.5, w: 1.8, h: 1.5 }
  }),
  finisherName: 'Bandiera a Scacchi',
  hypeName: 'REDLINE BREAKER'
});
