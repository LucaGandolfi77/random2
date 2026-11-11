import type { StageSpec } from '../data/types';

export const STAGING: Record<string, StageSpec> = {
  a1_prison: {
    actors: [
      { id: 'etienne', mark: [0, 2.8], facing: 0, pose: 'idle' },
      { id: 'guard', mark: [-1.8, 1.3], facing: 0.4, pose: 'idle' }
    ]
  },
  a2_bakery: {
    actors: [
      { id: 'etienne', mark: [0, 1.35], facing: Math.PI, pose: 'idle' },
      { id: 'baker', mark: [0, -1.05], facing: 0, pose: 'idle' }
    ]
  },
  a2_office: {
    actors: [
      { id: 'etienne', mark: [0, 1.5], facing: Math.PI, pose: 'idle' },
      { id: 'clerk', mark: [0, -1.1], facing: 0, pose: 'idle' }
    ]
  },
  a2_belleville: {
    actors: [
      { id: 'etienne', mark: [0, 5], facing: Math.PI, pose: 'idle' },
      { id: 'passerby', mark: [-3, -4.5], facing: 0.7, pose: 'idle' }
    ]
  },
  a3_gare: {
    actors: [
      { id: 'etienne', mark: [2.6, 1.6], facing: -2.12, pose: 'idle' },
      { id: 'mina', mark: [-0.55, 0], facing: 0, pose: 'sit' }
    ]
  },
  a4_phone: {
    actors: [
      { id: 'etienne', mark: [-1.1, 0], facing: Math.PI / 2, pose: 'idle' },
      { id: 'mina', mark: [0.9, 0], facing: -Math.PI / 2, pose: 'idle' }
    ]
  },
  a4_confrontation: {
    actors: [
      { id: 'etienne', mark: [-0.9, 4], facing: Math.PI, pose: 'idle' },
      { id: 'mina', mark: [-0.5, 4.6], facing: Math.PI, pose: 'idle' },
      { id: 'renaud', mark: [4.6, -2], facing: -Math.PI / 2, pose: 'idle' }
    ]
  },
  a4_metro: {
    actors: [
      { id: 'etienne', mark: [0.6, 0], facing: 0, pose: 'idle' },
      { id: 'mina', mark: [-0.6, 0.2], facing: 0, pose: 'idle' }
    ]
  },
  a5_corridor: {
    actors: [
      { id: 'etienne', mark: [0.7, -2], facing: Math.PI, pose: 'idle' },
      { id: 'mina', mark: [0, -1.8], facing: Math.PI, pose: 'idle' },
      { id: 'nurse', mark: [-1.2, -6], facing: 0, pose: 'idle' }
    ]
  },
  a5_room: {
    actors: [
      { id: 'etienne', mark: [1.95, 2.75], facing: -2.3, pose: 'idle' },
      { id: 'mina', mark: [-0.4, 2.4], facing: Math.PI, pose: 'idle' },
      { id: 'aicha', mark: [-0.7, 0.6], facing: 0, pose: 'sit' },
      { id: 'renaud', mark: [2.35, 3.35], facing: -2.0, pose: 'idle', hideUntilEvent: 'a5_renaud_arrives' }
    ]
  },
  a6_laundrette: {
    actors: [
      { id: 'etienne', mark: [-0.6, 0], facing: 0, pose: 'sit' },
      { id: 'rose', mark: [2.8, -0.4], facing: -1.9, pose: 'idle' }
    ]
  },
  a6_dawn: {
    actors: [
      { id: 'etienne', mark: [0.4, 2], facing: Math.PI, pose: 'idle' }
    ]
  }
};
