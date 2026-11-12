import * as THREE from 'three'
import type { FilmChapter } from '../film/types'
import { CHARACTER_SPECS, makeActor, type Character, type CharacterSpec } from './characters'
import {
  addBox,
  addContactLights,
  addCylinder,
  addPlane,
  addSphere,
  makeChair,
  makeDust,
  makeTable,
  makeTextPanel,
  makeTree,
  type Theme,
} from './core'
import type { ActorKey, ActorTrack, CameraKey, ChapterScene, Phase } from './types'

export const key = (t: number, x: number, z: number, extra: Omit<ActorKey, 't' | 'x' | 'z'> = {}): ActorKey => ({
  t,
  x,
  z,
  ...extra,
})

export const track = (character: Character, keys: ActorKey[]): ActorTrack => ({ character, keys })

export const theme = (background: number, fog: number, fogNear: number, fogFar: number, exposure = 1.05): Theme => ({
  background,
  fog,
  fogNear,
  fogFar,
  exposure,
})

export function phase(
  start: number,
  end: number,
  group: THREE.Group,
  phaseTheme: Theme,
  camera: CameraKey[],
  tracks: ActorTrack[],
  update?: (time: number) => void,
): Phase {
  return { start, end, group, theme: phaseTheme, camera, tracks, update }
}

export function actor(parent: THREE.Object3D, spec: CharacterSpec, x: number, z: number, rotation = 0, y = 0): Character {
  return makeActor(parent, spec, x, z, rotation, y)
}

export function scene(id: string, title: string, phases: Phase[]): ChapterScene {
  return { id, title, phases }
}

export function furnishing(parent: THREE.Object3D): void {
  makeTable(parent, 0, -1.4, 2.7, 1.1)
  makeChair(parent, -1.2, 0.1, Math.PI)
  makeChair(parent, 1.2, 0.1, Math.PI)
}

export function sign(
  parent: THREE.Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  rotationY = 0,
  color = '#d8c9a9',
  background = '#201c17',
): THREE.Mesh {
  const mesh = makeTextPanel(text, width, height, {
    color,
    background,
    border: '#8d7857',
    font: '600 72px Georgia, serif',
  })
  mesh.position.set(x, y, z)
  mesh.rotation.y = rotationY
  parent.add(mesh)
  return mesh
}

export function tricolor(parent: THREE.Object3D, x: number, y: number, z: number, scale = 1): void {
  const width = 0.4 * scale
  addBox(parent, width, 0.86 * scale, 0.025, x - width, y, z, 0x173c78, { roughness: 0.9 })
  addBox(parent, width, 0.86 * scale, 0.025, x, y, z, 0xd6d2c5, { roughness: 0.9 })
  addBox(parent, width, 0.86 * scale, 0.025, x + width, y, z, 0x9b2d2b, { roughness: 0.9 })
}

export function puddle(parent: THREE.Object3D, x: number, z: number, w = 2.4, d = 1.2): void {
  const mesh = addPlane(parent, w, d, x, 0.018, z, 0x66869a, {
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  })
  mesh.rotation.x = -Math.PI / 2
}

export function debris(parent: THREE.Object3D, count: number, area: number): void {
  for (let i = 0; i < count; i += 1) {
    const size = 0.05 + Math.random() * 0.17
    addBox(parent, size, size * 0.25, size * 0.7, (Math.random() - 0.5) * area, 0.02, (Math.random() - 0.5) * area, 0x292823, {
      roughness: 0.95,
      rotation: [0, Math.random() * Math.PI, 0],
    })
  }
}

export function silver(parent: THREE.Object3D, x: number, y: number, z: number): void {
  const metal = { metalness: 0.76, roughness: 0.3 }
  addCylinder(parent, 0.12, 0.12, 0.012, x, y, z, 0xc7c3b6, metal)
  addCylinder(parent, 0.08, 0.08, 0.02, x + 0.35, y, z + 0.06, 0xc7c3b6, metal)
  addBox(parent, 0.28, 0.05, 0.2, x - 0.35, y + 0.02, z + 0.04, 0xc7c3b6, metal)
}

export function doll(parent: THREE.Object3D): THREE.Group {
  const group = new THREE.Group()
  addBox(group, 0.2, 0.3, 0.11, 0, 0, 0, 0x874d43, { roughness: 0.95 })
  addSphere(group, 0.1, 0, 0.25, 0, 0xe0b9a0, { roughness: 0.82 })
  addSphere(group, 0.085, 0, 0.3, -0.04, 0x4a2c23, { roughness: 0.95 })
  parent.add(group)
  return group
}

export function handcuffs(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  for (const offset of [-0.08, 0.08]) {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.018, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x9ea5a4, roughness: 0.34, metalness: 0.8 }),
    )
    torus.position.x = offset
    torus.rotation.x = Math.PI / 2
    group.add(torus)
  }
  parent.add(group)
  return group
}

export function forest(parent: THREE.Object3D, count: number, seed = 0): void {
  for (let i = 0; i < count; i += 1) {
    const x = -14 + ((i * 5.3 + seed) % 28)
    const z = -4 - ((i * 7.7 + seed) % 20)
    makeTree(parent, x, z, 3.2 + ((i * 3 + seed) % 4), 0x2a372d)
  }
}

export function roomLights(parent: THREE.Object3D, warm = 0xe0b272, cold = 0x6f7b8c): void {
  addContactLights(parent, {
    sky: 0x6f7a86,
    ground: 0x30251b,
    hemi: 0.55,
    key: warm,
    keyIntensity: 1.3,
    keyPosition: [-2, 5, 4],
    fill: cold,
    fillIntensity: 4,
    fillPosition: [3.5, 2.8, -3],
  })
}

export function addDust(parent: THREE.Object3D, count = 70, area = 8, height = 4): void {
  const dust = makeDust(count, area, height)
  parent.add(dust.group)
}

export function chapterScene(chapter: FilmChapter, builder: (chapter: FilmChapter) => Phase[]): ChapterScene {
  return scene(chapter.id, chapter.title, builder(chapter))
}

export const specs = CHARACTER_SPECS
