import * as THREE from 'three'
import type { FilmChapter } from '../film/types'
import {
  addBox,
  addContactLights,
  addCylinder,
  addPlane,
  addSphere,
  makeBed,
  makeCandle,
  makeCandlestick,
  makeCar,
  makeChair,
  makeDust,
  makeFlame,
  makeRoom,
  makeStreet,
  makeWindow,
} from './core'
import { createCharacter } from './characters'
import { actor, addDust, chapterScene, handcuffs, key, phase, roomLights, sign, specs, theme, track } from './scene-utils'
import type { ChapterScene } from './types'

export function buildBarricade(chapter: FilmChapter): ChapterScene {
  const group = new THREE.Group()
  const street = makeStreet(30, 9, { night: true, lamps: true, road: 0x211f1e, sidewalk: 0x3d3831, building: [0x453e37, 0x4e463d] })
  group.add(street.group)
  makeCar(group, -1.8, -4.3, 0.12, 0x40515a, true)
  addBox(group, 5.8, 1.1, 1.7, 0.9, 0.55, -4.1, 0x4a3b2c)
  addBox(group, 3.2, 0.9, 1.1, 2.8, 0.45, -4.4, 0x3f3429)
  addBox(group, 2.3, 0.7, 0.8, -3.5, 0.35, -4.2, 0x3c3026)
  for (let i = 0; i < 8; i += 1) {
    addBox(group, 0.65, 0.18, 0.5, -3.2 + i * 0.9, 0.11, -2.8 + (i % 2) * 0.5, 0x524636, { rotation: [0, i * 0.3, 0] })
  }
  addBox(group, 1.7, 0.9, 0.8, 3.8, 0.45, -1.2, 0x2f4035)
  addBox(group, 1.5, 0.08, 0.8, 3.8, 0.92, -1.2, 0x1d2920)
  const fireA = makeFlame(group, -2.6, 0.8, -3.8, 2.1)
  const fireB = makeFlame(group, 2.5, 0.6, -3.6, 1.5)
  const fireLightA = new THREE.PointLight(0xff8a3d, 12, 10, 1.8)
  fireLightA.position.set(-2.6, 1.4, -3.7)
  const fireLightB = new THREE.PointLight(0xff8a3d, 8, 8, 1.8)
  fireLightB.position.set(2.5, 1.1, -3.5)
  group.add(fireLightA, fireLightB)
  const policeA = new THREE.PointLight(0x3d7dff, 0, 18, 1.5)
  policeA.position.set(-3.5, 2.2, -15)
  const policeB = new THREE.PointLight(0xe13932, 0, 18, 1.5)
  policeB.position.set(3.5, 2.2, -15)
  group.add(policeA, policeB)
  addBox(group, 1.8, 0.9, 0.7, 2.6, 0.4, -9, 0x1d2b36)
  addBox(group, 1.7, 0.6, 0.6, 3.3, 0.3, -10, 0x1d2b36)
  addBox(group, 0.2, 2.6, 0.2, -3.8, 1.3, -1.6, 0x3c3125)
  sign(group, '2000', 0.6, 1.35, -4.76, 1.2, 0.34, 0, '#c9b27e', '#322a20')
  addContactLights(group, {
    sky: 0x1c2631,
    ground: 0x120f0d,
    hemi: 0.4,
    key: 0x7f9bb5,
    keyIntensity: 0.65,
    keyPosition: [-5, 8, 4],
    fill: 0xd67c42,
    fillIntensity: 6,
  })
  const enjolras = actor(group, specs.enjolras, 0.2, -3.3, Math.PI + 0.1, 0.45)
  const marius = actor(group, specs.marius, 1.7, -1.4, 2.9)
  const valjean = actor(group, specs.valjeanOld, -1.5, 0.8, 0.4)
  const javert = actor(group, specs.javert, -3.1, -1.4, 0.6)
  const studentA = actor(group, specs.student, 2.7, -0.2, -0.4)
  const studentB = actor(group, { ...specs.student, coat: 0x4a4038 }, -2.5, 1.4, 0.9)
  const policeA1 = actor(group, specs.guard, 3.8, -11, Math.PI, 0)
  const policeA2 = actor(group, specs.guard, 5.2, -11.4, Math.PI, 0)
  return chapterScene(chapter, () => [
    phase(
      0,
      chapter.duration,
      group,
      theme(0x0f1216, 0x161b20, 8, 30, 1.04),
      [
        { t: 0, pos: [0, 1.55, 5.2], look: [0, 1.35, -2.4], fov: 50 },
        { t: 25, pos: [1.2, 1.35, 4.2], look: [0.2, 1.2, -3.4], fov: 45 },
        { t: 50, pos: [-1.2, 1.45, 3.3], look: [-2.7, 1.1, -1.1], fov: 42 },
        { t: 75, pos: [1.5, 1.6, 4.5], look: [0.4, 1.3, -2.5], fov: 46 },
        { t: 100, pos: [0.2, 2.2, 5.8], look: [0, 1.2, -4], fov: 49 },
      ],
      [
        track(enjolras, [key(0, 0.2, -3.3, { rot: 3.24, y: 0.45 }), key(22, 0.2, -3.3, { rot: 3.24, y: 0.45, gesture: 'point' }), key(100, 0.2, -3.3, { rot: 3.24, y: 0.45 })]),
        track(marius, [key(0, 1.7, -1.4, { rot: 2.9 }), key(80, 1.3, -0.8, { rot: 2.7 }), key(100, 1.4, -0.2, { rot: 2.5, tilt: 0.22 })]),
        track(valjean, [key(0, -1.5, 0.8, { rot: 0.4 }), key(45, -1.7, 0.6, { rot: 0.3 }), key(64, -2.6, -0.7, { rot: 0.6, gesture: 'hold' }), key(82, -2.8, -0.9, { rot: 0.4 }), key(100, -2, 1.2, { rot: 2.8 })]),
        track(javert, [key(0, -3.1, -1.4, { rot: 0.6, gesture: 'bound' }), key(62, -3.1, -1.4, { rot: 0.6, gesture: 'bound' }), key(84, -3.1, -1.4, { rot: 0.6, hidden: true })]),
        track(studentA, [key(0, 2.7, -0.2, { rot: -0.4 }), key(60, 2.5, 0.2, { rot: -0.3 })]),
        track(studentB, [key(0, -2.5, 1.4, { rot: 0.9 })]),
        track(policeA1, [key(0, 3.8, -11, { rot: Math.PI })]),
        track(policeA2, [key(0, 5.2, -11.4, { rot: Math.PI })]),
      ],
      (t) => {
        fireA.update(t)
        fireB.update(t)
        const phase = (Math.sin(t * 3.2) + 1) / 2
        policeA.intensity = phase * 11
        policeB.intensity = (1 - phase) * 11
        fireLightA.intensity = 11 + Math.sin(t * 9.1) * 2.2
        fireLightB.intensity = 7 + Math.sin(t * 7.3 + 1) * 1.5
      },
    ),
  ])
}

export function buildSewers(chapter: FilmChapter): ChapterScene {
  const sewer = new THREE.Group()
  addBox(sewer, 9.5, 0.2, 32, 0, -0.08, -3, 0x1d241f, { roughness: 1 })
  addPlane(sewer, 7.4, 30, 0, 0.02, -3, 0x243a32, {
    transparent: true,
    opacity: 0.48,
    metalness: 0.1,
    roughness: 0.25,
    rotation: [-Math.PI / 2, 0, 0],
  })
  for (let z = 8; z >= -18; z -= 4) {
    addBox(sewer, 0.7, 4.6, 0.7, -4.2, 2.1, z, 0x343b32, { roughness: 0.95 })
    addBox(sewer, 0.7, 4.6, 0.7, 4.2, 2.1, z, 0x343b32, { roughness: 0.95 })
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(4.05, 0.32, 6, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x3c4438, roughness: 0.95 }),
    )
    arch.position.set(0, 2.1, z)
    sewer.add(arch)
  }
  addCylinder(sewer, 0.14, 0.14, 28, -3.55, 2.8, -4, 0x4a4e45, { rotation: [Math.PI / 2, 0, 0], metalness: 0.35 })
  addCylinder(sewer, 0.1, 0.1, 28, 3.5, 3.2, -4, 0x454a42, { rotation: [Math.PI / 2, 0, 0], metalness: 0.35 })
  for (let i = 0; i < 5; i += 1) {
    const lamp = addSphere(sewer, 0.14, i % 2 === 0 ? -3.8 : 3.8, 2.5, 5 - i * 5, 0x8fc49b, { basic: true })
    lamp.scale.set(0.7, 0.7, 0.7)
    const light = new THREE.PointLight(0x79bd8f, 2.6, 8, 1.7)
    light.position.copy(lamp.position)
    sewer.add(light)
  }
  addDust(sewer, 90, 7, 3.2)
  addContactLights(sewer, {
    sky: 0x263a34,
    ground: 0x0c100d,
    hemi: 0.5,
    key: 0x6fae8d,
    keyIntensity: 0.9,
    keyPosition: [0, 6, 2],
    fill: 0x2e5648,
    fillIntensity: 3.2,
  })
  const valjean = actor(sewer, specs.valjean, 0, 4.8, Math.PI, 0.02)
  const carried = createCharacter(specs.marius)
  carried.group.position.set(0, 1.15, -0.25)
  carried.group.rotation.set(-1.2, Math.PI, 0)
  carried.shadow.visible = false
  valjean.group.add(carried.group)
  const thenardier = actor(sewer, specs.thenardier, 2.9, -2.4, -1.3)

  const bridge = new THREE.Group()
  addBox(bridge, 13, 0.42, 10, 0, -0.21, 0, 0x46443e, { roughness: 0.95 })
  addPlane(bridge, 80, 80, 0, -2.2, -12, 0x172a34, {
    transparent: true,
    opacity: 0.82,
    rotation: [-Math.PI / 2, 0, 0],
  })
  for (let i = 0; i < 9; i += 1) {
    addBox(bridge, 0.12, 1.2, 0.12, -5.4 + i * 1.35, 0.75, -4.6, 0x242725, { metalness: 0.3 })
  }
  addBox(bridge, 12, 0.12, 0.12, 0, 1.4, -4.6, 0x242725, { metalness: 0.3 })
  addBox(bridge, 12, 0.1, 0.1, 0, 0.9, -4.6, 0x242725, { metalness: 0.3 })
  for (let i = 0; i < 18; i += 1) {
    const height = 2 + Math.random() * 5
    addBox(bridge, 1.2 + Math.random() * 2.2, height, 1.2, (Math.random() - 0.5) * 34, height / 2 - 2, -24, 0x11191e, { roughness: 1 })
  }
  for (let i = 0; i < 28; i += 1) {
    addPlane(bridge, 0.16, 0.22, (Math.random() - 0.5) * 30, 0.4 + Math.random() * 3.5, -23.3, i % 3 === 0 ? 0xf2c57d : 0x7fa3b5, {
      basic: true,
      opacity: 0.55,
      transparent: true,
      depthWrite: false,
    })
  }
  addBox(bridge, 0.06, 2.8, 0.06, 4.4, 1.4, 0.3, 0x2f3331, { metalness: 0.4 })
  const bridgeLamp = addSphere(bridge, 0.12, 4.4, 2.9, 0.3, 0xffcf86, { basic: true })
  const bridgeLight = new THREE.PointLight(0xffc276, 10, 12, 1.8)
  bridgeLight.position.copy(bridgeLamp.position)
  bridge.add(bridgeLight)
  const bridgeLamp2 = addSphere(bridge, 0.12, -4.3, 2.9, 0.4, 0xffcf86, { basic: true })
  const bridgeLight2 = new THREE.PointLight(0xffc276, 5, 9, 1.8)
  bridgeLight2.position.copy(bridgeLamp2.position)
  bridge.add(bridgeLight2)
  addContactLights(bridge, {
    sky: 0x243344,
    ground: 0x0d1114,
    hemi: 0.9,
    key: 0x819dba,
    keyIntensity: 1.25,
    keyPosition: [-4, 8, 5],
    fill: 0xd7a15f,
    fillIntensity: 6,
  })
  const bridgeValjean = actor(bridge, specs.valjeanOld, -1.9, 1.4, 0.4)
  const bridgeJavert = actor(bridge, specs.javert, 0.3, -1.8, 2.9)
  const cuffs = handcuffs(bridge, 0.1, 0.12, -2.2)
  cuffs.visible = false
  return chapterScene(chapter, () => [
    phase(
      0,
      70,
      sewer,
      theme(0x111b18, 0x17241e, 7, 28, 1.02),
      [
        { t: 0, pos: [2, 1.7, 6.5], look: [0, 1.2, 0], fov: 48 },
        { t: 20, pos: [1.5, 1.4, 3.2], look: [0, 1.2, -1], fov: 44 },
        { t: 45, pos: [-1.5, 1.5, 2.4], look: [0, 1.15, -2], fov: 43 },
        { t: 70, pos: [0, 2, 4.4], look: [0, 1.2, -6], fov: 47 },
      ],
      [
        track(valjean, [key(0, 0, 4.8, { rot: Math.PI }), key(20, 0, 1.6, { rot: Math.PI, gesture: 'hold' }), key(45, 0.2, -2.2, { rot: Math.PI }), key(70, 0.4, -5.2, { rot: Math.PI })]),
        track(thenardier, [key(0, 2.9, -2.4, { rot: -1.3, hidden: true }), key(34, 2.7, -2.2, { rot: -1.2, hidden: false }), key(56, 2.5, -2.5, { rot: -1.1, hidden: false })]),
      ],
      (t) => {
        if (t > 34 && t < 56) cuffs.visible = false
      },
    ),
    phase(
      70,
      105,
      bridge,
      theme(0x16202a, 0x1e2c37, 11, 40, 1.03),
      [
        { t: 0, pos: [0.6, 1.7, 4.6], look: [-0.7, 1.2, -2.0], fov: 46 },
        { t: 20, pos: [1.5, 1.6, 3.9], look: [-0.4, 1.2, -2.2], fov: 44 },
        { t: 35, pos: [1.0, 1.9, 4.3], look: [-0.3, 1.2, -3.0], fov: 46 },
      ],
      [
        track(bridgeValjean, [key(0, -1.9, 1.4, { rot: 0.4 }), key(20, -1.8, 1.3, { rot: 0.3 }), key(35, -2.5, 2.8, { rot: 2.8 })]),
        track(bridgeJavert, [key(0, 0.3, -1.8, { rot: 2.9 }), key(18, 0.2, -2.8, { rot: 3.1 }), key(30, 0.2, -3.2, { rot: 3.1 }), key(33, 0.2, -3.2, { rot: 3.1, hidden: true })]),
      ],
      (t) => {
        cuffs.visible = t > 27
      },
    ),
  ])
}

export function buildCandlesticks(chapter: FilmChapter): ChapterScene {
  const group = new THREE.Group()
  group.add(makeRoom(10, 9, 4.2, 0x6b5545, 0x3f2e22))
  makeWindow(group, 1.7, 2.6, -4.35, 0, 2.7, 2.1, 0xf4d391, 0.9)
  makeBed(group, -2.8, -1.7, Math.PI / 2, 0x4c3829)
  makeChair(group, -1, 1.1, Math.PI + 0.15, 0x473224)
  addBox(group, 1.4, 0.7, 0.6, 0.1, 0.36, -2.6, 0x4a3424)
  makeCandlestick(group, -0.25, 0.76, -2.5, 0.75, 0.9)
  makeCandlestick(group, 0.45, 0.76, -2.55, 0.65, 0.82)
  makeCandle(group, -1.6, 0.65, -2.9, 0.2, 0.8)
  addBox(group, 1.5, 2.2, 0.4, 4.7, 1.1, -3.8, 0x3b2c20)
  addDust(group, 45, 5, 3)
  roomLights(group, 0xf4bd78, 0x71818b)
  const dawnGlow = new THREE.PointLight(0xffd99a, 9, 12, 1.6)
  dawnGlow.position.set(1.7, 2.2, -2)
  group.add(dawnGlow)
  const valjean = actor(group, specs.valjeanOld, -2.5, -1.55, 0.25, 0.28)
  const cosette = actor(group, specs.cosette, -0.9, 0.5, 2.75)
  const marius = actor(group, specs.marius, 1.2, 0.8, 2.9)
  return chapterScene(chapter, () => [
    phase(
      0,
      chapter.duration,
      group,
      theme(0x3d2b1f, 0x4e3927, 6, 22, 1.12),
      [
        { t: 0, pos: [-2.6, 1.75, 5.0], look: [-0.3, 1.25, -1.4], fov: 48 },
        { t: 35, pos: [-2.2, 1.55, 3.8], look: [-0.3, 1.18, -1.5], fov: 44 },
        { t: 65, pos: [-2.0, 1.45, 3.3], look: [-0.3, 1.1, -1.6], fov: 42 },
        { t: 105, pos: [-1.6, 2.1, 3.9], look: [0, 1.6, -2.4], fov: 46 },
      ],
      [
        track(valjean, [key(0, -2.5, -1.55, { rot: 0.25, y: 0.28, seated: true }), key(55, -2.4, -1.45, { rot: 0.3, y: 0.28, seated: true, gesture: 'reach' }), key(88, -2.5, -1.5, { rot: 0.25, y: 0.28, seated: true })]),
        track(cosette, [key(0, -0.9, 0.5, { rot: -2.45, seated: true }), key(50, -0.8, 0.45, { rot: -2.55, seated: true, gesture: 'hold' }), key(105, -0.7, 0.4, { rot: -2.6, seated: true })]),
        track(marius, [key(0, 1.2, 0.8, { rot: -2.1 }), key(55, 1.1, 0.7, { rot: -2.15, gesture: 'hold' }), key(105, 1.1, 0.65, { rot: -2.2 })]),
      ],
      (t) => {
        dawnGlow.intensity = 8 + Math.min(7, t * 0.08)
      },
    ),
  ])
}
