import * as THREE from 'three'
import type { FilmChapter } from '../film/types'
import {
  addBox,
  addContactLights,
  addCylinder,
  addPlane,
  addSphere,
  makeBed,
  makeCRT,
  makeCandle,
  makeRoom,
  makeSnow,
  makeStreet,
  makeTree,
  makeWindow,
} from './core'
import { actor, addDust, chapterScene, doll, key, phase, roomLights, sign, specs, theme, track, tricolor } from './scene-utils'
import type { ChapterScene } from './types'

export function buildChampmathieu(chapter: FilmChapter): ChapterScene {
  const group = new THREE.Group()
  group.add(makeRoom(16, 14, 6.4, 0x5a4635, 0x30231b))
  addBox(group, 8.2, 0.8, 3.2, 0, 0.4, -4.8, 0x4b3524)
  addBox(group, 7, 1.25, 2.4, 0, 1.35, -5.3, 0x392819)
  addBox(group, 4.2, 0.48, 0.6, 0, 2.9, -6.3, 0x2a1d14)
  addBox(group, 2, 1.1, 0.8, 0, 1.05, -1.2, 0x4e3826)
  addBox(group, 1.9, 0.15, 0.72, 0, 1.64, -1.2, 0x2d2117)
  addBox(group, 0.12, 0.95, 0.42, -0.88, 2.18, -1.2, 0x1f1812)
  addBox(group, 0.12, 0.95, 0.42, 0.88, 2.18, -1.2, 0x1f1812)
  for (let row = 0; row < 3; row += 1) {
    for (let bench = 0; bench < 2; bench += 1) {
      addBox(group, 2, 0.12, 0.55, -2.6 + bench * 5.2, 0.4 + row * 0.65, 0.8 + row * 1.1, 0x3e2c1f)
      addBox(group, 1.8, 0.48, 0.12, -2.6 + bench * 5.2, 0.67 + row * 0.65, 0.52 + row * 1.1, 0x33251b)
    }
  }
  tricolor(group, -5.6, 3.25, -6.8, 0.9)
  makeWindow(group, 4.8, 4.1, -6.85, 0, 1.6, 1.2, 0x9eabb0, 0.28)
  sign(group, 'TRIBUNAL', 0, 5.6, -6.92, 2.4, 0.45, 0, '#d6c7a6', '#33251b')
  addDust(group, 110, 10, 4.8)
  addContactLights(group, {
    sky: 0x81786b,
    ground: 0x2e2118,
    hemi: 0.9,
    key: 0xe0c18a,
    keyIntensity: 1.8,
    keyPosition: [3, 6, 5],
    fill: 0x7c8884,
    fillIntensity: 6.5,
  })
  const judge = actor(group, specs.judge, 0.2, -5.65, 0.05, 1.55)
  const accused = actor(group, specs.accused, -1.4, -1.3, 0.25)
  const valjean = actor(group, specs.valjeanOld, 4.7, 2.3, -0.8)
  const guardA = actor(group, specs.guard, -2.9, -0.9, 0.45)
  const guardB = actor(group, specs.guard, 2.8, 3.9, -0.1)
  const crowdA = actor(group, { ...specs.citizen, key: 'crowd' }, -4.2, 1.8, 0.7)
  const crowdB = actor(group, specs.citizen, 3.9, 0.8, -0.5)
  return chapterScene(chapter, () => [
    phase(
      0,
      chapter.duration,
      group,
      theme(0x251b13, 0x2f2117, 6, 26, 1.05),
      [
        { t: 0, pos: [0, 2.4, 7.0], look: [0, 1.5, -3], fov: 50 },
        { t: 22, pos: [2.4, 1.9, 4.6], look: [-1.2, 1.3, -1.8], fov: 44 },
        { t: 48, pos: [2.5, 1.82, 4.2], look: [1.2, 1.3, 0.1], fov: 45 },
        { t: 68, pos: [1.3, 1.62, 3.2], look: [0, 1.32, -0.3], fov: 42 },
        { t: 90, pos: [0.4, 2.0, 4.9], look: [0, 1.45, -2.4], fov: 48 },
      ],
      [
        track(judge, [key(0, 0.2, -5.65, { rot: 0.05, gesture: 'read', y: 1.55 }), key(40, 0.1, -5.6, { rot: 0.1, y: 1.55 }), key(90, 0.2, -5.65, { rot: 0.05, gesture: 'read', y: 1.55 })]),
        track(accused, [key(0, -1.4, -1.3, { rot: 0.25 }), key(30, -1.35, -1.25, { rot: 0.3 }), key(90, -1.4, -1.3, { rot: 0.25 })]),
        track(valjean, [
          key(0, 4.7, 2.3, { rot: -0.8 }),
          key(46, 4.2, 1.9, { rot: -0.75 }),
          key(58, 2.4, 0.7, { rot: -0.5, gesture: 'point' }),
          key(70, 0.3, -0.1, { rot: 0.05, gesture: 'hold' }),
          key(90, 0.2, 0, { rot: 0.05, gesture: 'hold' }),
        ]),
        track(guardA, [key(0, -2.9, -0.9, { rot: 0.45 })]),
        track(guardB, [key(0, 2.8, 3.9, { rot: -0.1 })]),
        track(crowdA, [key(0, -4.2, 1.8, { rot: 0.7 }), key(45, -4.1, 1.7, { rot: 0.7, gesture: 'point' }), key(90, -4.2, 1.8, { rot: 0.7 })]),
        track(crowdB, [key(0, 3.9, 0.8, { rot: -0.5 })]),
      ],
    ),
  ])
}

export function buildFantineDeath(chapter: FilmChapter): ChapterScene {
  const group = new THREE.Group()
  group.add(makeRoom(8.6, 7.4, 3.9, 0x66716d, 0x3f4642))
  makeWindow(group, -2.2, 2.45, -3.6, 0, 1.4, 1.1, 0x274454, 0.26)
  makeBed(group, 0, -1.35, 0, 0x6a6154)
  const candle = makeCandle(group, 1.2, 0.7, -2.1, 0.2, 0.9)
  const candleLight = new THREE.PointLight(0xffb35e, 3.8, 5, 1.8)
  candleLight.position.set(1.2, 0.95, -1.9)
  group.add(candleLight)
  addDust(group, 30, 4, 2.6)
  addContactLights(group, {
    sky: 0x7d8c93,
    ground: 0x2c302d,
    hemi: 0.6,
    key: 0x9cafba,
    keyIntensity: 0.7,
    keyPosition: [2, 5, 3],
    fill: 0x9b7f62,
    fillIntensity: 3.2,
  })
  const fantine = actor(group, specs.fantine, 0, -2.05, 0, 0.02)
  const valjean = actor(group, specs.valjeanOld, 1.6, 0.5, -0.7)
  const nurse = actor(group, specs.nurse, -2.1, -0.5, 0.45)
  const javert = actor(group, specs.javert, 3.4, 1.2, -2.65)
  void candle
  return chapterScene(chapter, () => [
    phase(
      0,
      chapter.duration,
      group,
      theme(0x283238, 0x333e43, 5, 18, 1.04),
      [
        { t: 0, pos: [2.6, 1.55, 4], look: [0, 1.15, -1.4], fov: 47 },
        { t: 25, pos: [1.8, 1.4, 3], look: [0, 1.1, -1.4], fov: 43 },
        { t: 44, pos: [1.1, 1.3, 2.4], look: [0, 1.06, -1.5], fov: 40 },
        { t: 60, pos: [0.9, 1.45, 2.8], look: [0.2, 1.18, -1.6], fov: 42 },
      ],
      [
        track(fantine, [key(0, 0, -2.05, { rot: 0.02, seated: true, y: 0.02 }), key(27, 0, -2.06, { rot: 0.02, seated: true, y: 0.02, gesture: 'hold' }), key(55, 0, -2.1, { rot: 0.06, seated: true, y: 0.02 })]),
        track(valjean, [key(0, 1.6, 0.5, { rot: -0.7 }), key(18, 1, -0.4, { rot: -0.45, gesture: 'hold' }), key(38, 0.7, -0.8, { rot: -0.3, gesture: 'pray' }), key(60, 0.65, -0.8, { rot: -0.3 })]),
        track(nurse, [key(0, -2.1, -0.5, { rot: 0.45 })]),
        track(javert, [key(0, 3.4, 1.2, { rot: -2.65, hidden: true }), key(46, 3.3, 1.1, { rot: -2.65, hidden: false })]),
      ],
      (t) => {
        candleLight.intensity = 3.7 + Math.sin(t * 8.1) * 0.6
      },
    ),
  ])
}

export function buildMontfermeil(chapter: FilmChapter): ChapterScene {
  const inn = new THREE.Group()
  addBox(inn, 40, 0.18, 38, 0, -0.06, 0, 0xd7d9d0, { roughness: 1 })
  addBox(inn, 8, 5.6, 4.5, 2.8, 2.8, -6.5, 0x5a4a39)
  addBox(inn, 8.4, 0.4, 4.9, 2.8, 5.7, -6.5, 0x33281e)
  addBox(inn, 2.1, 2.5, 0.35, 1.9, 1.25, -4.17, 0x30251b)
  addBox(inn, 1.3, 1.65, 0.1, 1.9, 1.4, -3.96, 0xc28a4f, { basic: true, opacity: 0.68, transparent: true })
  for (let i = 0; i < 4; i += 1) makeWindow(inn, 3.3 + i * 1.25, 3.2, -4.17, 0, 0.75, 0.9, 0xf0b96b, 0.75)
  sign(inn, 'AU SARGENT DE WATERLOO', 2.8, 4.9, -4.08, 4, 0.55, 0, '#d8c8a5', '#2e241a')
  sign(inn, 'CHAMBRES · SOUPE · VIN', 2.8, 4.25, -4.04, 3.2, 0.3, 0, '#b8a77f', '#34291e')
  for (let i = 0; i < 12; i += 1) {
    addSphere(inn, 0.04, -1.4 + i * 0.48, 5.2 + Math.sin(i) * 0.15, -3.98, i % 3 === 0 ? 0xf3be65 : 0xd6e0da, { basic: true })
  }
  for (let i = 0; i < 16; i += 1) makeTree(inn, -18 + i * 2.2, -10 - (i % 5) * 2.5, 4 + (i % 4), 0x26352d)
  const snow = makeSnow(850, 35, 14)
  inn.add(snow.group)
  addBox(inn, 1, 0.9, 0.4, 0.6, 0.45, 2.5, 0x4b4d46)
  addCylinder(inn, 0.18, 0.22, 0.35, 1.4, 0.2, 2.8, 0x6e6b60, { metalness: 0.3 })
  addContactLights(inn, {
    sky: 0x253247,
    ground: 0x101318,
    hemi: 0.62,
    key: 0x93aec6,
    keyIntensity: 0.68,
    keyPosition: [-4, 8, 5],
    fill: 0xe0a361,
    fillIntensity: 6,
  })
  const cosette = actor(inn, specs.cosetteChild, -1.9, 1.4, 0.5)
  const madame = actor(inn, specs.madame, 3, 0.2, 2.9)
  const thenardier = actor(inn, specs.thenardier, 4.1, -0.8, 2.8)
  const valjean = actor(inn, specs.valjean, 0.4, 4.8, Math.PI)

  const forest = new THREE.Group()
  addBox(forest, 34, 0.18, 40, 0, -0.06, 0, 0xd5d8d0, { roughness: 1 })
  addBox(forest, 3.3, 0.09, 38, 0, 0.03, -2, 0xbec3bc)
  for (let i = 0; i < 24; i += 1) makeTree(forest, -13 + (i % 12) * 2.2, -6 - Math.floor(i / 12) * 8, 3.8 + (i % 5), 0x26342c)
  const forestSnow = makeSnow(500, 30, 12)
  forest.add(forestSnow.group)
  const lantern = new THREE.PointLight(0xffb56c, 4.2, 9, 1.8)
  lantern.position.set(0.6, 1.9, 2.4)
  forest.add(lantern)
  addSphere(forest, 1, -8, 8, -18, 0xe6e9dd, { basic: true, opacity: 0.72, transparent: true })
  addContactLights(forest, {
    sky: 0x263752,
    ground: 0x11151b,
    hemi: 0.72,
    key: 0x9bb8d3,
    keyIntensity: 0.7,
    keyPosition: [-3, 8, 5],
    fill: 0xd69a5e,
    fillIntensity: 3.6,
  })
  const walkValjean = actor(forest, specs.valjean, 0, 4.2, Math.PI)
  const walkCosette = actor(forest, { ...specs.cosetteChild, scale: 0.75 }, 0.8, 3.8, Math.PI)
  const heldDoll = doll(walkCosette.rightArm)
  heldDoll.position.set(0, -0.62, 0.07)
  heldDoll.scale.setScalar(0.65)
  return chapterScene(chapter, () => [
    phase(
      0,
      95,
      inn,
      theme(0x151d2a, 0x1b2533, 11, 38, 1.06),
      [
        { t: 0, pos: [0, 1.8, 7.5], look: [0.5, 1.25, -1.8], fov: 50 },
        { t: 30, pos: [2, 1.55, 4.7], look: [-0.2, 1.1, 0.1], fov: 45 },
        { t: 58, pos: [3.1, 1.55, 4.2], look: [1.6, 1.12, -0.4], fov: 44 },
        { t: 95, pos: [0.2, 1.8, 5.2], look: [0.4, 1.2, -1.2], fov: 46 },
      ],
      [
        track(cosette, [key(0, -1.9, 1.4, { rot: 0.5 }), key(24, -1.4, 2.2, { rot: 0.1 }), key(60, -1, 1.6, { rot: 0.2 }), key(95, -0.5, 0.8, { rot: 0.1 })]),
        track(madame, [key(0, 3, 0.2, { rot: 2.9 }), key(22, 2.6, 0.4, { rot: 2.95, gesture: 'point' }), key(95, 2.7, 0.1, { rot: 2.75 })]),
        track(thenardier, [key(0, 4.1, -0.8, { rot: 2.8 }), key(68, 2.1, 0.4, { rot: 2.4, gesture: 'point' }), key(95, 2.2, 0.5, { rot: 2.4 })]),
        track(valjean, [key(0, 0.4, 4.8, { rot: Math.PI }), key(38, 0.2, 3.2, { rot: Math.PI }), key(56, -0.3, 1.2, { rot: 2.79 }), key(80, 1.5, 0.3, { rot: 2.34, gesture: 'hold' }), key(95, 1, 1.1, { rot: 2.64 })]),
      ],
      (t) => snow.update(t),
    ),
    phase(
      95,
      120,
      forest,
      theme(0x1a2738, 0x26364b, 9, 30, 1.05),
      [
        { t: 0, pos: [3.8, 2.4, 8.6], look: [0.3, 1.1, -0.8], fov: 50 },
        { t: 12, pos: [3.0, 1.8, 5.4], look: [0.3, 1.1, -1.2], fov: 46 },
        { t: 25, pos: [2.8, 2.0, 4.6], look: [0.2, 1.2, -2.5], fov: 48 },
      ],
      [
        track(walkValjean, [key(0, 0, 4.2, { rot: Math.PI }), key(25, -0.2, -1, { rot: Math.PI + 0.08 })]),
        track(walkCosette, [key(0, 0.8, 3.8, { rot: Math.PI }), key(25, 0.55, -1.5, { rot: Math.PI + 0.08 })]),
      ],
      (t) => forestSnow.update(t),
    ),
  ])
}

export function buildParis(chapter: FilmChapter): ChapterScene {
  const garden = new THREE.Group()
  addBox(garden, 40, 0.12, 40, 0, -0.07, 0, 0x4e5544, { roughness: 1 })
  addBox(garden, 3.4, 0.08, 30, 0, 0.02, -2, 0x9d927a, { roughness: 0.98 })
  for (let i = 0; i < 14; i += 1) makeTree(garden, -12 + i * 1.9, -7 - (i % 4) * 2, 4 + (i % 3), 0x31402f)
  addBox(garden, 2.1, 0.14, 0.6, -1.4, 0.5, -1.2, 0x4a3a29)
  addBox(garden, 2.1, 0.5, 0.14, -1.4, 0.76, -1.47, 0x4a3a29)
  addCylinder(garden, 0.55, 0.7, 0.7, 5.5, 0.35, -5, 0x6f7468)
  addSphere(garden, 0.7, 5.5, 0.8, -5, 0x5b6d6b, { transparent: true, opacity: 0.6 })
  addContactLights(garden, {
    sky: 0x92a9b4,
    ground: 0x39412f,
    hemi: 0.8,
    key: 0xf0d29c,
    keyIntensity: 1.2,
    keyPosition: [5, 7, 4],
    fill: 0x8fa8ad,
    fillIntensity: 3.6,
  })
  const cosette = actor(garden, specs.cosette, -1.6, -1.2, 0, 0)
  const marius = actor(garden, specs.marius, 2.2, 2.1, Math.PI)
  const valjean = actor(garden, specs.valjeanOld, 4.8, 0.5, -0.7)

  const cafe = new THREE.Group()
  cafe.add(makeRoom(12, 9, 4.2, 0x4a3d32, 0x2e241c))
  makeWindow(cafe, -3.2, 2.4, -4.3, 0, 2.3, 1.6, 0xc6b58f, 0.36)
  const tv = makeCRT(cafe, 3.4, 2.2, -4.1, -0.2, 1)
  addBox(cafe, 4.2, 0.9, 1.2, -1.4, 0.55, -2.1, 0x3f2c20)
  for (let i = 0; i < 3; i += 1) {
    addBox(cafe, 1.2, 0.08, 0.8, -2.6 + i * 1.2, 0.75, -2.1, 0x7f6345)
    addBox(cafe, 1.2, 0.55, 0.1, -2.6 + i * 1.2, 0.72, -2.55, 0x3a2a20)
  }
  addDust(cafe, 45, 6, 3)
  addContactLights(cafe, {
    sky: 0x5b4d40,
    ground: 0x261b14,
    hemi: 0.45,
    key: 0xe0b171,
    keyIntensity: 1.25,
    keyPosition: [2, 4, 3],
    fill: 0x586e75,
    fillIntensity: 3,
  })
  const cafeMarius = actor(cafe, specs.marius, -0.2, -0.8, 0.4)
  const enjolras = actor(cafe, specs.enjolras, -2.3, -0.2, 0.7)
  const studentA = actor(cafe, specs.student, 1.6, -0.4, -0.5)
  const studentB = actor(cafe, specs.student, 2.5, 0.6, -0.4)
  return chapterScene(chapter, () => [
    phase(
      0,
      60,
      garden,
      theme(0x7f8f88, 0x92a09a, 14, 45, 1.03),
      [
        { t: 0, pos: [0, 1.7, 6.1], look: [0, 1.2, -1.2], fov: 49 },
        { t: 30, pos: [1.8, 1.5, 4], look: [-0.5, 1.2, 0], fov: 44 },
        { t: 60, pos: [2.5, 1.5, 4.5], look: [0, 1.2, -0.5], fov: 46 },
      ],
      [
        track(cosette, [key(0, -1.6, -1.2, { rot: 0, seated: true }), key(35, -1.35, -1.1, { rot: 0.3, seated: true, gesture: 'hold' }), key(60, -1.3, -1, { rot: 0.25, seated: true })]),
        track(marius, [key(0, 2.2, 2.1, { rot: Math.PI }), key(34, 1.1, 0.5, { rot: 2.5 }), key(50, 0.1, -0.5, { rot: 2.4, gesture: 'hold' }), key(60, 0.2, -0.6, { rot: 2.3 })]),
        track(valjean, [key(0, 4.8, 0.5, { rot: -0.7 }), key(30, 4.3, 0.2, { rot: -0.55 }), key(60, 4.2, 0.3, { rot: -0.5 })]),
      ],
    ),
    phase(
      60,
      90,
      cafe,
      theme(0x2b2019, 0x35271e, 5, 19, 1.05),
      [
        { t: 0, pos: [2.2, 1.55, 4.4], look: [-1.0, 1.2, -1.2], fov: 45 },
        { t: 15, pos: [1.8, 1.4, 3.6], look: [-0.6, 1.15, -1.4], fov: 42 },
        { t: 30, pos: [2.4, 1.5, 4.0], look: [0.2, 1.2, -2.2], fov: 45 },
      ],
      [
        track(cafeMarius, [key(0, -0.2, -0.8, { rot: 0.4 }), key(30, 0, -0.6, { rot: 0.2 })]),
        track(enjolras, [key(0, -2.3, -0.2, { rot: 0.7 }), key(8, -2.1, -0.3, { rot: 0.5, gesture: 'point' }), key(30, -2, -0.2, { rot: 0.6 })]),
        track(studentA, [key(0, 1.6, -0.4, { rot: -0.5 })]),
        track(studentB, [key(0, 2.5, 0.6, { rot: -0.4 })]),
      ],
      (t) => tv.update(t),
    ),
  ])
}
