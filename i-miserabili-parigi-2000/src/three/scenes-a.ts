import * as THREE from 'three'
import type { FilmChapter } from '../film/types'
import {
  addBox,
  addContactLights,
  addCylinder,
  addPlane,
  addSphere,
  makeBed,
  makeBus,
  makeCandle,
  makeCandlestick,
  makeCar,
  makeChair,
  makeDust,
  makeFlame,
  makePayphone,
  makeRain,
  makeRoom,
  makeStreet,
  makeTable,
  makeWindow,
} from './core'
import { actor, addDust, chapterScene, debris, key, phase, puddle, roomLights, sign, silver, specs, theme, track, tricolor } from './scene-utils'
import type { ChapterScene } from './types'

export function buildOuverture(chapter: FilmChapter): ChapterScene {
  const group = new THREE.Group()
  const rain = makeRain(650, 70, 22)
  group.add(rain.group)
  const colors = [0x18212b, 0x1b242c, 0x202a31, 0x171e25, 0x23282c]
  for (let i = 0; i < 34; i += 1) {
    const w = 3 + Math.random() * 7
    const h = 3 + Math.random() * 10
    const d = 3 + Math.random() * 7
    const x = (Math.random() - 0.5) * 58
    const z = -8 - Math.random() * 38
    addBox(group, w, h, d, x, h / 2 - 1.5, z, colors[i % colors.length], { roughness: 0.97 })
    for (let j = 0; j < 4; j += 1) {
      if (Math.random() < 0.42) continue
      addPlane(
        group,
        0.3 + Math.random() * 0.2,
        0.24 + Math.random() * 0.1,
        x + (Math.random() - 0.5) * w * 0.6,
        1 + Math.random() * (h - 2),
        z + d / 2 + 0.02,
        Math.random() < 0.65 ? 0xd8aa64 : 0x608294,
        { basic: true, transparent: true, opacity: 0.7, depthWrite: false },
      )
    }
  }
  const tower = new THREE.Group()
  tower.position.set(9, -1, -27)
  tower.scale.setScalar(0.9)
  for (const [x, z] of [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]]) {
    addBox(tower, 0.48, 8.8, 0.48, x, 4.4, z, 0x272b2d, { metalness: 0.3, roughness: 0.7 })
  }
  for (const y of [3.1, 6.3, 8.9]) addBox(tower, 6.4, 0.34, 6.4, 0, y, 0, 0x272b2d, { metalness: 0.3 })
  addBox(tower, 3.8, 0.34, 3.8, 0, 7.5, 0, 0x272b2d)
  addCylinder(tower, 0.08, 0.14, 3.2, 0, 10.7, 0, 0x272b2d, { metalness: 0.35 })
  addSphere(tower, 0.13, 0, 12.4, 0, 0xf3d18b, { basic: true })
  group.add(tower)
  addSphere(group, 1.4, -13, 11, -32, 0xdfe3dc, { basic: true, opacity: 0.8, transparent: true })
  addContactLights(group, {
    sky: 0x1b2a45,
    ground: 0x090b0e,
    hemi: 0.55,
    key: 0x94b4d9,
    keyIntensity: 0.55,
    keyPosition: [-9, 12, 2],
    fill: 0xe0ad68,
    fillIntensity: 8,
    fillPosition: [9, 6, -8],
  })
  return chapterScene(chapter, () => [
    phase(
      0,
      chapter.duration,
      group,
      theme(0x07101a, 0x0a111a, 18, 60, 1.02),
      [
        { t: 0, pos: [0, 10, 19], look: [0, 3.5, -12], fov: 50 },
        { t: 15, pos: [4.5, 7.2, 12], look: [1, 3, -17], fov: 47 },
        { t: 30, pos: [1.5, 5.2, 8], look: [0, 2.8, -19], fov: 44 },
      ],
      [],
      (t) => rain.update(t),
    ),
  ])
}

export function buildRelease(chapter: FilmChapter): ChapterScene {
  const prison = new THREE.Group()
  prison.add(makeRoom(9.5, 8.2, 4.2, 0x4b4e4b, 0x252724, { ceiling: true }))
  for (let i = 0; i < 12; i += 1) {
    addCylinder(prison, 0.035, 0.035, 3.2, -3.3 + i * 0.6, 1.6, -2.65, 0x303634, { metalness: 0.45, roughness: 0.5 })
  }
  addBox(prison, 7.2, 0.16, 0.24, 0, 3.22, -2.65, 0x262b2a, { metalness: 0.5 })
  addBox(prison, 2.4, 0.2, 0.75, -2.3, 0.55, -1.2, 0x36352f, { roughness: 0.9 })
  makeWindow(prison, 2.8, 3.05, -4, 0, 1.2, 0.56, 0x8aa3af, 0.33)
  sign(prison, 'MAISON D’ARRÊT', 0, 3.62, -3.95, 2.5, 0.28, 0, '#9da49f', '#1f2422')
  const dust = makeDust(70, 7, 3.2)
  prison.add(dust.group)
  const flame = makeFlame(prison, -3.7, 2.7, -3.4, 0.55)
  addContactLights(prison, {
    sky: 0x7e929e,
    ground: 0x191b19,
    hemi: 0.95,
    key: 0xb7cad4,
    keyIntensity: 1.85,
    keyPosition: [2, 5, 4],
    fill: 0x849795,
    fillIntensity: 7,
  })
  const valjean = actor(prison, specs.valjean, 0, 0.2, -0.15)
  const guard = actor(prison, specs.guard, 1.4, -1.4, 0.45)
  addBox(guard.rightArm, 0.18, 0.26, 0.015, 0, -0.6, 0.08, 0xe2d6ad, { roughness: 0.94, rotation: [0, 0, 0.16] })

  const road = new THREE.Group()
  addBox(road, 46, 0.1, 46, 0, -0.05, 6, 0x5a5c4d, { roughness: 1 })
  addBox(road, 5.4, 0.12, 46, 0, 0.02, 4, 0x2d3031, { roughness: 0.96 })
  addBox(road, 0.09, 0.11, 42, 0, 0.08, 3, 0xd5c59b, { basic: true, opacity: 0.38, transparent: true })
  addBox(road, 12, 3.1, 0.4, 0, 1.55, -4.7, 0x5e615c, { roughness: 0.94 })
  addBox(road, 7.5, 2.4, 0.34, 0, 1.2, -4.48, 0x454944, { roughness: 0.92 })
  addBox(road, 5.7, 0.26, 0.53, 0, 2.5, -4.32, 0x303634, { metalness: 0.4 })
  for (let i = 0; i < 18; i += 1) {
    addBox(road, 0.3, 0.8 + (i % 3) * 0.4, 0.3, -18 + i * 2.2, 0.4, -9 - (i % 3) * 2.2, 0x2f3d30, { roughness: 1 })
  }
  addCylinder(road, 0.06, 0.07, 2.8, 6.2, 1.4, -0.5, 0x444846, { metalness: 0.4 })
  sign(road, 'BUS 12', 6.2, 2.8, -0.48, 0.8, 0.42, Math.PI / 2, '#d9d2bc', '#27302f')
  addContactLights(road, {
    sky: 0xaab5b0,
    ground: 0x394039,
    hemi: 0.85,
    key: 0xd6c49c,
    keyIntensity: 1,
    keyPosition: [7, 9, 7],
    fill: 0x8f9fa0,
    fillIntensity: 4,
  })
  const rain = makeRain(170, 34, 11)
  road.add(rain.group)
  const freed = actor(road, specs.valjean, 0, 3.8, Math.PI)
  addBox(freed.rightArm, 0.36, 0.42, 0.22, 0, -0.68, 0.03, 0x5d5244, { roughness: 0.95 })
  const guard2 = actor(road, specs.guard, 1.2, 2.2, 0.1)
  return chapterScene(chapter, () => [
    phase(
      0,
      44,
      prison,
      theme(0x151b1c, 0x1b2222, 7, 24, 1.04),
      [
        { t: 0, pos: [1.15, 1.5, 3.65], look: [0.35, 1.3, -0.55], fov: 46 },
        { t: 18, pos: [1.6, 1.45, 3.15], look: [0.5, 1.27, -0.7], fov: 43 },
        { t: 44, pos: [1.35, 1.5, 3.45], look: [0.25, 1.28, -0.7], fov: 45 },
      ],
      [
        track(valjean, [key(0, 0, 0.4, { rot: -0.25 }), key(15, 0, 0.3, { rot: -0.2 }), key(44, 0, 0.2, { rot: -0.1 })]),
        track(guard, [
          key(0, 1.4, -1.4, { rot: 0.5 }),
          key(15, 1.2, -1.1, { rot: 0.42, gesture: 'read' }),
          key(26, 0.9, -0.75, { rot: 0.35, gesture: 'point' }),
          key(44, 1.35, -1.3, { rot: 0.45 }),
        ]),
      ],
      (t) => {
        dust.update(t)
        flame.update(t)
      },
    ),
    phase(
      44,
      90,
      road,
      theme(0x808b89, 0x8d9995, 12, 48, 1),
      [
        { t: 0, pos: [3.8, 2.2, 7.8], look: [0, 1.2, -0.4], fov: 50 },
        { t: 22, pos: [4.2, 2.0, 5.2], look: [0, 1.2, -1.0], fov: 47 },
        { t: 46, pos: [4.7, 2.25, 5.3], look: [0, 1.2, -1.8], fov: 49 },
      ],
      [
        track(freed, [key(0, 0, 4.8, { rot: Math.PI }), key(30, -0.1, 2, { rot: Math.PI }), key(46, -0.2, -0.5, { rot: Math.PI })]),
        track(guard2, [key(0, 1.2, 2.2, { rot: 0.1 }), key(18, 1.1, 2.15, { rot: 0.1, gesture: 'wave' }), key(46, 1.3, 2.35, { rot: 0.2 })]),
      ],
      (t) => rain.update(t),
    ),
  ])
}

export function buildDoors(chapter: FilmChapter): ChapterScene {
  const group = new THREE.Group()
  const street = makeStreet(40, 10.5, { night: true, lamps: true, road: 0x232a2e, sidewalk: 0x403e3a, building: [0x47453f, 0x555047] })
  group.add(street.group)
  const rain = makeRain(850, 42, 12)
  group.add(rain.group)
  makeBus(group, 4.9, -10, Math.PI)
  makePayphone(group, 4.2, -1.8, -Math.PI / 2)
  sign(group, 'CHAMBRES', -4.46, 2.75, -1.2, 1.6, 0.52, Math.PI / 2)
  addBox(group, 1.1, 2.2, 0.16, -4.8, 1.1, -1.2, 0x171b1c)
  puddle(group, 0.5, 2.2, 3.5, 1.3)
  debris(group, 24, 8)
  addContactLights(group, {
    sky: 0x192433,
    ground: 0x0d0e0d,
    hemi: 0.92,
    key: 0x91b1c8,
    keyIntensity: 1.1,
    keyPosition: [-3, 9, 3],
    fill: 0xe0a35e,
    fillIntensity: 9.5,
    fillPosition: [2, 3, -4],
  })
  const valjean = actor(group, specs.valjean, 0, 3.5, Math.PI)
  const innkeeper = actor(group, specs.innkeeper, -3.7, -1.3, 1.1)
  const citizen = actor(group, specs.citizen, 2.1, 1.1, 2.7)
  const child = actor(group, specs.child, 1.6, 3.4, 2.9)
  return chapterScene(chapter, () => [
    phase(
      0,
      chapter.duration,
      group,
      theme(0x0b131c, 0x111a22, 10, 35, 1.03),
      [
        { t: 0, pos: [2.8, 1.8, 7.4], look: [-1.2, 1.2, -1.0], fov: 50 },
        { t: 18, pos: [1.8, 1.65, 5.6], look: [-1.4, 1.2, -1.4], fov: 46 },
        { t: 42, pos: [-1.5, 1.65, 5.0], look: [1.0, 1.16, -1.4], fov: 44 },
        { t: 80, pos: [2.7, 2.0, 7.2], look: [0.3, 1.4, -8.5], fov: 49 },
      ],
      [
        track(valjean, [
          key(0, 0, 2.35, { rot: Math.PI }),
          key(28, -0.8, 0.2, { rot: Math.PI - 0.4 }),
          key(52, 0.6, 1.8, { rot: Math.PI + 0.2 }),
          key(80, 1.7, 4.2, { rot: Math.PI }),
        ]),
        track(innkeeper, [key(0, -3.7, -1.3, { rot: 1.1 }), key(24, -3.6, -1.25, { rot: 1.15, gesture: 'point' }), key(80, -3.8, -1.4, { rot: 1.1 })]),
        track(citizen, [key(0, 2.0, 0.7, { rot: 2.7 }), key(26, 2.4, 1.0, { rot: 3.4 }), key(60, 2.3, 1.2, { rot: 3.5 })]),
        track(child, [key(0, 1.4, 0.7, { rot: 2.9 }), key(38, 1.4, 0.6, { rot: 3.05 }), key(55, 1.9, 1.2, { rot: 2.7 })]),
      ],
      (t) => rain.update(t),
    ),
  ])
}

export function buildBishop(chapter: FilmChapter): ChapterScene {
  const interior = new THREE.Group()
  interior.add(makeRoom(13, 11, 5, 0x6a5846, 0x3c2c21))
  addBox(interior, 3.8, 2.7, 0.42, -4.45, 1.35, -2.1, 0x3b2f26)
  addBox(interior, 2.4, 1.35, 0.5, -4.45, 0.7, -2.02, 0x1c1714)
  const fire = makeFlame(interior, -4.45, 0.3, -1.85, 1.7)
  const fireLight = new THREE.PointLight(0xff974d, 14, 12, 1.8)
  fireLight.position.set(-4.4, 1.25, -1.7)
  interior.add(fireLight)
  makeTable(interior, 0, -1.4)
  makeChair(interior, -1.2, 0.1, Math.PI)
  makeChair(interior, 1.2, 0.1, Math.PI)
  silver(interior, 0.15, 0.88, -1.33)
  makeCandlestick(interior, -0.7, 0.84, -1.55, 0.72, 0.9)
  makeCandlestick(interior, 1.05, 0.84, -1.27, 0.62, 0.82)
  makeBed(interior, -4.9, 1.4, Math.PI / 2)
  makeWindow(interior, 2.9, 3, -5.35, 0, 1.8, 1.85, 0x283b52, 0.42)
  sign(interior, 'DIGNITÉ', 3.7, 2.2, -4.97, 1.1, 0.3, 0, '#b9a887', '#35271d')
  addDust(interior, 100, 9, 4.2)
  roomLights(interior)
  const myriel = actor(interior, specs.myriel, -1.1, -0.55, 0.38)
  const valjean = actor(interior, specs.valjean, 4.8, 4.5, -2.3)
  const sister = actor(interior, specs.sister, -3.55, -0.9, 0.52)
  const guardA = actor(interior, specs.guard, 3.7, 0.9, -2.45)
  const guardB = actor(interior, specs.guard, 4.1, 0.2, -2.7)

  const road = new THREE.Group()
  addBox(road, 34, 0.1, 40, 0, -0.05, -4, 0x5e5949, { roughness: 1 })
  addBox(road, 3.8, 0.08, 38, 0, 0.02, -2, 0x746a52, { roughness: 0.96 })
  for (let i = 0; i < 12; i += 1) {
    addCylinder(road, 0.14, 0.24, 3.8, -11 + i * 2, 1.9, -8 - (i % 4) * 2, 0x303528, { roughness: 1 })
    addSphere(road, 1.2, -11 + i * 2, 4.1, -8 - (i % 4) * 2, 0x29372a, { roughness: 1 })
  }
  addSphere(road, 1.8, 9.5, 5.2, -20, 0xffdc9a, { basic: true, opacity: 0.8, transparent: true })
  addSphere(road, 3.4, 3.8, 3.4, -6, 0xffc878, { basic: true, opacity: 0.1, transparent: true, depthWrite: false })
  addContactLights(road, {
    sky: 0xd9c39a,
    ground: 0x4c4a37,
    hemi: 0.9,
    key: 0xffd394,
    keyIntensity: 1.4,
    keyPosition: [8, 7, 5],
    fill: 0x9ba7a7,
    fillIntensity: 3.5,
  })
  const dawn = actor(road, specs.valjean, -0.2, 2.8, Math.PI)
  addBox(dawn.rightArm, 0.38, 0.46, 0.24, 0, -0.68, 0.02, 0x5b5040)
  const gervais = actor(road, { ...specs.child, key: 'gervais', coat: 0x5b4b3a }, 2.4, -2.2, 2.4)
  addCylinder(road, 0.065, 0.065, 0.012, 1, 0.07, 1.2, 0xc1a05d, { metalness: 0.7, rotation: [0, 0, Math.PI / 2] })
  return chapterScene(chapter, () => [
    phase(
      0,
      132,
      interior,
      theme(0x24180f, 0x2c1d12, 5, 25, 1.12),
      [
        { t: 0, pos: [0.5, 1.7, 7], look: [0, 1.3, -1.4], fov: 50 },
        { t: 24, pos: [2.2, 1.55, 5.1], look: [0, 1.35, -1.2], fov: 46 },
        { t: 72, pos: [-2.1, 1.55, 4.2], look: [-4, 1.25, -1.4], fov: 45 },
        { t: 98, pos: [3, 1.62, 4.9], look: [0, 1.3, -0.4], fov: 48 },
        { t: 132, pos: [4.1, 1.8, 5.9], look: [2.4, 1.25, 1.7], fov: 47 },
      ],
      [
        track(myriel, [key(0, -1.1, -0.55, { rot: 0.38 }), key(32, -1.25, -0.7, { rot: 0.45, gesture: 'hold' }), key(96, -1.15, -0.55, { rot: 0.38, gesture: 'pray' }), key(132, -1.05, -0.4, { rot: 0.3, gesture: 'pray' })]),
        track(valjean, [
          key(0, 4.8, 4.7, { rot: -2.3 }),
          key(12, 2.6, 2, { rot: -2.1 }),
          key(24, 1.2, -0.4, { rot: -0.35 }),
          key(35, 1.35, -1, { rot: -0.2, seated: true }),
          key(70, 1.35, -1, { rot: -0.2, seated: true }),
          key(84, -4.6, -1.7, { rot: 1.4 }),
          key(94, 0.8, 0.6, { rot: 0.1 }),
          key(132, 4.7, 4.4, { rot: -2.2 }),
        ]),
        track(sister, [key(0, -3.55, -0.9, { rot: 0.52 }), key(22, -3.2, -0.8, { rot: 0.48, gesture: 'hold' }), key(132, -3.4, -0.8, { rot: 0.45 })]),
        track(guardA, [key(0, 3.7, 0.9, { rot: -2.45, hidden: true }), key(96, 3.7, 0.9, { rot: -2.45, hidden: false }), key(132, 3.9, 1.3, { rot: -2.5, hidden: false })]),
        track(guardB, [key(0, 4.1, 0.2, { rot: -2.7, hidden: true }), key(96, 4.1, 0.2, { rot: -2.7, hidden: false }), key(132, 4.2, 1.9, { rot: -2.6, hidden: false })]),
      ],
      (t) => {
        fire.update(t)
        fireLight.intensity = 13 + Math.sin(t * 7.2) * 2 + Math.sin(t * 13.7) * 1.2
      },
    ),
    phase(
      132,
      190,
      road,
      theme(0xa1957d, 0xb3a98f, 13, 45, 1.02),
      [
        { t: 0, pos: [4.2, 2.0, 6.0], look: [0, 1.2, 0.2], fov: 48 },
        { t: 20, pos: [2.6, 1.55, 3.8], look: [0.6, 1.15, 0.7], fov: 44 },
        { t: 40, pos: [2.4, 1.8, 3.9], look: [0.4, 1.4, 0.8], fov: 46 },
        { t: 58, pos: [2.8, 2.1, 4.4], look: [0.3, 1.9, 0.6], fov: 48 },
      ],
      [
        track(dawn, [
          key(0, -0.2, 2.8, { rot: Math.PI }),
          key(18, 0.7, 1.4, { rot: Math.PI - 0.5 }),
          key(28, 0.8, 1.1, { rot: Math.PI - 0.2, gesture: 'reach' }),
          key(40, 0.1, 0.6, { rot: 0.1, seated: true }),
          key(58, 0, 0.2, { rot: 0.1, lookX: -0.25 }),
        ]),
        track(gervais, [key(0, 2.4, -2.2, { rot: 2.4 }), key(24, 2, -0.8, { rot: 2.8 }), key(34, 2.8, -2.8, { rot: 2.3 }), key(42, 5.5, -5.5, { hidden: true })]),
      ],
    ),
  ])
}

export function buildMadeleine(chapter: FilmChapter): ChapterScene {
  const factory = new THREE.Group()
  factory.add(makeRoom(18, 14, 6.2, 0x4f4b43, 0x2e2d28, { ceiling: true }))
  for (let i = 0; i < 4; i += 1) makeWindow(factory, -6.5 + i * 4.3, 4, -6.9, 0, 2.3, 1.65, 0x9fb3b8, 0.45)
  for (let i = 0; i < 4; i += 1) {
    addBox(factory, 2.5, 1.1, 1.7, -6 + i * 3.8, 0.55, -1.8, 0x4a4d46, { metalness: 0.2 })
    addCylinder(factory, 0.55, 0.55, 0.3, -6 + i * 3.8, 1.28, -1.8, 0x272a28, { metalness: 0.6, rotation: [Math.PI / 2, 0, 0] })
  }
  for (let i = 0; i < 5; i += 1) {
    addCylinder(factory, 0.1, 0.1, 4.8, -8.2 + i * 4.1, 2.4, -3.2, 0x272b29)
    addSphere(factory, 0.22, -8.2 + i * 4.1, 4.5, -3.2, 0xd7b46f, { basic: true })
  }
  makeTable(factory, -2.5, 1.2, 2.8, 1.1, 0.8, 0x3e3327)
  addDust(factory, 150, 12, 5)
  addContactLights(factory, {
    sky: 0x7f929d,
    ground: 0x23241f,
    hemi: 0.65,
    key: 0xc5d0cf,
    keyIntensity: 1.3,
    keyPosition: [-1, 8, 4],
    fill: 0xb6975d,
    fillIntensity: 5,
  })
  const madeleine = actor(factory, specs.valjeanOld, 0, 1, 0.15)
  const foreman = actor(factory, specs.foreman, -2.6, 2, 2.95)
  const workerA = actor(factory, specs.worker, -5.8, 0.8, 0.5)
  const workerB = actor(factory, specs.worker, 3.1, 1.8, -0.3)
  const javert = actor(factory, specs.javert, 4.3, 2.5, 3.45)

  const office = new THREE.Group()
  office.add(makeRoom(10.5, 9, 4.4, 0x3f4a43, 0x2b241c))
  makeWindow(office, -2.8, 2.8, -4.3, 0, 2.2, 1.8, 0xb8c6c6, 0.43)
  makeTable(office, 0.3, -1.2, 3.1, 1.2, 0.82, 0x4b3625)
  addBox(office, 2.2, 2.3, 0.3, 4.5, 1.15, -1.6, 0x2b241d)
  tricolor(office, -3.4, 2.9, -4.16, 0.8)
  addDust(office, 50, 7, 3.4)
  addContactLights(office, {
    sky: 0x8e9b98,
    ground: 0x30231a,
    hemi: 0.86,
    key: 0xe3c58f,
    keyIntensity: 1.7,
    keyPosition: [-3, 5, 4],
    fill: 0x76888b,
    fillIntensity: 6,
  })
  const mayor = actor(office, specs.valjeanOld, 0.3, -2.6, 0.05)
  const inspector = actor(office, specs.javert, 2.6, 1.4, -2.4)
  return chapterScene(chapter, () => [
    phase(
      0,
      55,
      factory,
      theme(0x252624, 0x30322e, 9, 32, 1.03),
      [
        { t: 0, pos: [0, 1.85, 8.2], look: [0, 1.3, -1.7], fov: 50 },
        { t: 22, pos: [2.5, 1.65, 5.3], look: [0, 1.2, -1], fov: 45 },
        { t: 55, pos: [2.6, 1.8, 5.6], look: [1.5, 1.15, 0.4], fov: 47 },
      ],
      [
        track(madeleine, [key(0, 0, 1, { rot: 0.15 }), key(18, -0.3, 0.8, { rot: 0.3 }), key(55, 0.2, 0.6, { rot: 0 })]),
        track(foreman, [key(0, -2.6, 2, { rot: 2.95 }), key(16, -2.2, 1.6, { rot: 2.8, gesture: 'point' }), key(55, -2.5, 1.8, { rot: 2.9 })]),
        track(workerA, [key(0, -5.8, 0.8, { rot: 0.5 }), key(55, -5.6, 0.6, { rot: 0.4 })]),
        track(workerB, [key(0, 3.1, 1.8, { rot: -0.3 }), key(55, 3.2, 1.5, { rot: -0.2 })]),
        track(javert, [key(0, 4.3, 2.5, { rot: 3.45 }), key(38, 1.6, 0.8, { rot: 3, gesture: 'point' }), key(55, 1.7, 0.7, { rot: 3 })]),
      ],
    ),
    phase(
      55,
      105,
      office,
      theme(0x2a231b, 0x342b20, 6, 23, 1.06),
      [
        { t: 0, pos: [4.3, 1.7, 2.4], look: [0.2, 1.2, -1.5], fov: 47 },
        { t: 18, pos: [4.1, 1.62, 1.8], look: [0.2, 1.15, -1.6], fov: 44 },
        { t: 50, pos: [4.3, 1.7, 2.1], look: [0.6, 1.1, -1.1], fov: 46 },
      ],
      [
        track(mayor, [key(0, 0.3, -2.6, { rot: 0.05 }), key(14, 0.3, -2.5, { rot: 0.12, gesture: 'read' }), key(50, 0.35, -2.55, { rot: 0.05 })]),
        track(inspector, [key(0, 2.6, 1.4, { rot: 2.25 }), key(24, 1.5, 0.5, { rot: 2.35 }), key(50, 1.3, 0.4, { rot: 2.35, gesture: 'point' })]),
      ],
    ),
  ])
}

export function buildFantine(chapter: FilmChapter): ChapterScene {
  const street = new THREE.Group()
  const set = makeStreet(36, 10, { night: true, lamps: true, road: 0x272d30, sidewalk: 0x44413c, building: [0x4a4740, 0x514a40] })
  street.add(set.group)
  addBox(street, 6, 4.5, 0.5, -4.8, 2.25, -4.2, 0x3b3f3c)
  sign(street, 'USINE', -4.8, 3.35, -4, 2, 0.4, 0, '#c8c1aa', '#2a2c29')
  makePayphone(street, 4.3, -2.4, -Math.PI / 2)
  makeCar(street, 4.5, 4.2, 0.1, 0x43545a)
  puddle(street, -1.1, 2, 3.2, 1.2)
  const rain = makeRain(800, 38, 11)
  street.add(rain.group)
  addContactLights(street, {
    sky: 0x19252f,
    ground: 0x10110f,
    hemi: 0.62,
    key: 0x8aa9bd,
    keyIntensity: 0.8,
    keyPosition: [-2, 8, 4],
    fill: 0xd89755,
    fillIntensity: 6,
  })
  const fantine = actor(street, specs.fantine, -2.2, 0.9, 0.1)
  const foreman = actor(street, specs.foreman, -3.6, -1.2, 0.5)
  const worker = actor(street, specs.worker, -4.4, 1.8, 0.4)
  const javert = actor(street, specs.javert, 2.1, 1.1, 2.85)
  const madeleine = actor(street, specs.valjeanOld, 4.3, 2, -0.5)

  const hospital = new THREE.Group()
  hospital.add(makeRoom(8.8, 7.5, 3.9, 0x9aa49d, 0x525955))
  makeWindow(hospital, -2.5, 2.5, -3.65, 0, 1.5, 1.2, 0x8eaab7, 0.36)
  makeBed(hospital, 0, -1.35, 0, 0x766b5a)
  addCylinder(hospital, 0.035, 0.035, 2.4, 2.2, 1.25, -1.3, 0x9da4a0, { metalness: 0.4 })
  makeCandle(hospital, 1.4, 0.7, -2.2, 0.18, 0.8)
  addDust(hospital, 35, 5, 2.8)
  addContactLights(hospital, {
    sky: 0xa8b0ae,
    ground: 0x4c4e48,
    hemi: 0.82,
    key: 0xd8d1b8,
    keyIntensity: 0.9,
    keyPosition: [2, 5, 3],
    fill: 0x7d969e,
    fillIntensity: 3.2,
  })
  const dying = actor(hospital, specs.fantine, 0, -2.05, 0, 0.02)
  const valjean = actor(hospital, specs.valjeanOld, 1.7, 0.3, -0.65)
  const nurse = actor(hospital, specs.nurse, -2.2, -0.6, 0.5)
  return chapterScene(chapter, () => [
    phase(
      0,
      120,
      street,
      theme(0x111922, 0x17212a, 9, 34, 1.04),
      [
        { t: 0, pos: [0, 1.7, 7.2], look: [0, 1.2, -2], fov: 50 },
        { t: 28, pos: [1.5, 1.55, 4.6], look: [-1.2, 1.15, -0.4], fov: 45 },
        { t: 60, pos: [1, 1.38, 3.4], look: [-1.3, 1.1, 0.3], fov: 41 },
        { t: 120, pos: [2.6, 1.7, 5.1], look: [0, 1.15, -0.8], fov: 48 },
      ],
      [
        track(fantine, [key(0, -2.2, 0.9, { rot: 0.1 }), key(36, -2.2, -0.4, { rot: 0.2 }), key(72, -1.25, 0.25, { rot: 0.1, seated: true }), key(118, -2.2, 1.2, { rot: -0.2 })]),
        track(foreman, [key(0, -3.6, -1.2, { rot: 0.5 }), key(20, -2.9, -0.8, { rot: 0.55, gesture: 'point' }), key(118, -3.7, -1.3, { rot: 0.5 })]),
        track(worker, [key(0, -4.4, 1.8, { rot: 0.3 }), key(118, -4.2, 1.5, { rot: 0.4 })]),
        track(javert, [key(0, 2.1, 1.1, { rot: 2.85, hidden: true }), key(64, 1.8, 1, { rot: 2.85, hidden: false }), key(72, 0.5, 0.5, { rot: 2.5, gesture: 'point' }), key(118, 2, 1.3, { rot: 2.9 })]),
        track(madeleine, [key(0, 4.3, 2, { rot: -0.5, hidden: true }), key(86, 4.3, 2, { rot: -0.5, hidden: false }), key(94, 1.1, 0.7, { rot: -0.9, gesture: 'hold' }), key(118, 0.4, 0.4, { rot: -0.8 })]),
      ],
      (t) => rain.update(t),
    ),
    phase(
      120,
      150,
      hospital,
      theme(0x747c77, 0x8a918a, 7, 22, 1.04),
      [
        { t: 0, pos: [2.9, 1.6, 3.9], look: [0, 1.15, -1.4], fov: 46 },
        { t: 15, pos: [2.2, 1.45, 3], look: [0, 1.1, -1.4], fov: 43 },
        { t: 30, pos: [1.6, 1.35, 2.6], look: [0.1, 1.08, -1.5], fov: 40 },
      ],
      [
        track(dying, [key(0, 0, -2.05, { rot: 0, seated: true, y: 0.02 }), key(30, 0, -2.08, { rot: 0.02, seated: true, y: 0.02, gesture: 'hold' })]),
        track(valjean, [key(0, 1.7, 0.3, { rot: -0.65 }), key(14, 1.1, -0.4, { rot: -0.45, gesture: 'hold' }), key(30, 0.8, -0.7, { rot: -0.3, gesture: 'pray' })]),
        track(nurse, [key(0, -2.2, -0.6, { rot: 0.5 }), key(30, -2, -0.7, { rot: 0.45 })]),
      ],
    ),
  ])
}
