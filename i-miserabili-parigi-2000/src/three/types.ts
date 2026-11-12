import type * as THREE from 'three'
import type { Character, Gesture } from './characters'
import type { Theme, Vec3 } from './core'

export interface CameraKey {
  t: number
  pos: Vec3
  look: Vec3
  fov?: number
}

export interface ActorKey {
  t: number
  x: number
  z: number
  rot?: number
  y?: number
  hidden?: boolean
  gesture?: Gesture
  seated?: boolean
  tilt?: number
  lookX?: number
}

export interface ActorTrack {
  character: Character
  keys: ActorKey[]
}

export interface Phase {
  start: number
  end: number
  group: THREE.Group
  theme: Theme
  camera: CameraKey[]
  tracks: ActorTrack[]
  update?: (time: number) => void
}

export interface ChapterScene {
  id: string
  title: string
  phases: Phase[]
}
