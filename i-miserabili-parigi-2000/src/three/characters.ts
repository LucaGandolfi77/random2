import * as THREE from 'three'
import { addBox, addCylinder, addShadow, addSphere, material } from './core'

export interface CharacterSpec {
  key: string
  skin?: number
  hair?: number
  coat?: number
  shirt?: number
  pants?: number
  dress?: number
  accent?: number
  scale?: number
  old?: boolean
  longHair?: boolean
  hat?: 'none' | 'cap' | 'bonnet' | 'police' | 'top'
  robe?: boolean
  uniform?: boolean
  apron?: string
  child?: boolean
}

export interface Character {
  key: string
  spec: CharacterSpec
  group: THREE.Group
  body: THREE.Group
  head: THREE.Group
  mouth: THREE.Mesh
  leftArm: THREE.Group
  rightArm: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
  shadow: THREE.Mesh
  baseRotation: number
  walkingAmount: number
  speaking: boolean
  seated: boolean
  yOffset: number
}

export type Gesture = 'none' | 'point' | 'pray' | 'reach' | 'bound' | 'hold' | 'wave' | 'read'

export const CHARACTER_SPECS: Record<string, CharacterSpec> = {
  valjean: {
    key: 'valjean',
    skin: 0xc79772,
    hair: 0x2c2927,
    coat: 0x2d3741,
    shirt: 0x8f8a7c,
    pants: 0x252a2e,
    accent: 0x6f6250,
  },
  valjeanOld: {
    key: 'valjean',
    skin: 0xc4a186,
    hair: 0xb7b2a8,
    coat: 0x30343a,
    shirt: 0x9b978d,
    pants: 0x24272b,
    accent: 0x625b50,
    old: true,
  },
  myriel: {
    key: 'myriel',
    skin: 0xd0ad91,
    hair: 0xd8d2c6,
    coat: 0x43394f,
    shirt: 0xd8d0bc,
    pants: 0x2b2730,
    robe: true,
    old: true,
  },
  fantine: {
    key: 'fantine',
    skin: 0xd8ad91,
    hair: 0xb58a59,
    coat: 0x6b4b45,
    dress: 0x765d50,
    accent: 0x9d7b66,
    longHair: true,
  },
  cosetteChild: {
    key: 'cosette',
    skin: 0xddbaa2,
    hair: 0x684532,
    coat: 0x554a3e,
    dress: 0x6f5b49,
    accent: 0x8a7965,
    child: true,
    scale: 0.72,
  },
  cosette: {
    key: 'cosette',
    skin: 0xe0bda5,
    hair: 0x5b3b2b,
    coat: 0x3f594e,
    dress: 0x4c6a5b,
    accent: 0xbaa17c,
    longHair: true,
  },
  javert: {
    key: 'javert',
    skin: 0xb28a74,
    hair: 0x282624,
    coat: 0x202b35,
    shirt: 0x949b99,
    pants: 0x1c252c,
    accent: 0x59666d,
    uniform: true,
    hat: 'police',
  },
  thenardier: {
    key: 'thenardier',
    skin: 0xb28c73,
    hair: 0x372b25,
    coat: 0x514333,
    shirt: 0x887762,
    pants: 0x332b25,
    accent: 0x8a3f35,
    hat: 'cap',
  },
  madame: {
    key: 'madame',
    skin: 0xc79b81,
    hair: 0x45352f,
    coat: 0x5a3935,
    dress: 0x6b4640,
    accent: 0x9a6d59,
    apron: '0x8c8272',
    longHair: true,
  },
  marius: {
    key: 'marius',
    skin: 0xd0a285,
    hair: 0x3e3029,
    coat: 0x3d4854,
    shirt: 0xb8b09d,
    pants: 0x292d34,
    accent: 0x8a6a50,
  },
  enjolras: {
    key: 'enjolras',
    skin: 0xd0a78d,
    hair: 0xa88a61,
    coat: 0x3d3b42,
    shirt: 0xc5b9a5,
    pants: 0x2a2b2f,
    accent: 0x8d3b36,
  },
  guard: {
    key: 'guard',
    skin: 0xb88f76,
    hair: 0x292725,
    coat: 0x263a43,
    shirt: 0x7f8e91,
    pants: 0x1e2c32,
    accent: 0x6c7a7c,
    uniform: true,
    hat: 'cap',
  },
  judge: {
    key: 'judge',
    skin: 0xc5a188,
    hair: 0x9e9a90,
    coat: 0x17171a,
    shirt: 0xd7d0bf,
    pants: 0x111214,
    robe: true,
    old: true,
  },
  accused: {
    key: 'accused',
    skin: 0xb48c72,
    hair: 0x5d5145,
    coat: 0x5d5a50,
    shirt: 0x8c8474,
    pants: 0x3b3934,
    accent: 0x6f6a5d,
    hat: 'cap',
  },
  sister: {
    key: 'sister',
    skin: 0xd1ac94,
    hair: 0x5a514c,
    coat: 0x2d3135,
    dress: 0x35393c,
    accent: 0xd3c8b2,
    longHair: true,
  },
  innkeeper: {
    key: 'innkeeper',
    skin: 0xb68b72,
    hair: 0x3d3029,
    coat: 0x51453a,
    shirt: 0x9d8e78,
    pants: 0x332d28,
    accent: 0x6e5444,
    apron: '0x6f6251',
  },
  citizen: {
    key: 'citizen',
    skin: 0xc59a80,
    hair: 0x4b3b31,
    coat: 0x4e5150,
    shirt: 0x9b9484,
    pants: 0x302f2e,
    accent: 0x6b5d4d,
  },
  child: {
    key: 'child',
    skin: 0xd4aa8e,
    hair: 0x4d352a,
    coat: 0x454d47,
    shirt: 0x9e9787,
    pants: 0x2c302f,
    accent: 0x6f6658,
    child: true,
    scale: 0.68,
  },
  foreman: {
    key: 'foreman',
    skin: 0xbd9379,
    hair: 0x40342d,
    coat: 0x49443b,
    shirt: 0x978b76,
    pants: 0x32312d,
    accent: 0x605449,
    apron: '0x5d5346',
  },
  worker: {
    key: 'worker',
    skin: 0xbb9279,
    hair: 0x44352d,
    coat: 0x4d4f4a,
    shirt: 0x968a78,
    pants: 0x343431,
    accent: 0x6d5f4d,
    apron: '0x655a4a',
  },
  student: {
    key: 'student',
    skin: 0xc69c81,
    hair: 0x40332b,
    coat: 0x3f4650,
    shirt: 0xb0a693,
    pants: 0x2a2d31,
    accent: 0x7b5c4b,
  },
  nurse: {
    key: 'nurse',
    skin: 0xcba58a,
    hair: 0x5c5149,
    coat: 0xc8c4b8,
    dress: 0xbdb9ad,
    accent: 0x8b908e,
    apron: '0xded9cb',
    longHair: true,
  },
}

export function createCharacter(spec: CharacterSpec): Character {
  const group = new THREE.Group()
  group.scale.setScalar(spec.scale ?? 1)
  const body = new THREE.Group()
  group.add(body)

  const skin = material(spec.skin ?? 0xc99c80, { roughness: 0.82 })
  const hair = material(spec.hair ?? 0x332a24, { roughness: 0.94, flatShading: true })
  const coat = material(spec.coat ?? 0x3d4348, { roughness: 0.88 })
  const shirt = material(spec.shirt ?? 0x9f9684, { roughness: 0.9 })
  const pants = material(spec.pants ?? 0x292c2e, { roughness: 0.92 })
  const accent = material(spec.accent ?? 0x6a5b4b, { roughness: 0.76 })

  const leftLeg = new THREE.Group()
  leftLeg.position.set(-0.105, 0.82, 0)
  const leftLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.085, 0.72, 7), pants)
  leftLegMesh.position.y = -0.36
  leftLeg.add(leftLegMesh)
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.28), material(0x171719, { roughness: 0.72 }))
  leftBoot.position.set(0, -0.76, 0.055)
  leftLeg.add(leftBoot)
  body.add(leftLeg)

  const rightLeg = new THREE.Group()
  rightLeg.position.set(0.105, 0.82, 0)
  const rightLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.085, 0.72, 7), pants)
  rightLegMesh.position.y = -0.36
  rightLeg.add(rightLegMesh)
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.28), material(0x171719, { roughness: 0.72 }))
  rightBoot.position.set(0, -0.76, 0.055)
  rightLeg.add(rightBoot)
  body.add(rightLeg)

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.64, 8), coat)
  torso.position.y = 1.13
  torso.scale.z = 0.72
  body.add(torso)

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.35, 0.12), shirt)
  chest.position.set(0, 1.28, 0.17)
  body.add(chest)

  if (spec.apron) {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.58, 0.04), material(Number(spec.apron), { roughness: 0.96 }))
    apron.position.set(0, 0.86, 0.245)
    body.add(apron)
  }

  if (spec.robe) {
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.48, 1.15, 8), coat)
    robe.position.y = 0.67
    robe.scale.z = 0.74
    body.add(robe)
    leftLeg.visible = false
    rightLeg.visible = false
  }

  if (spec.dress) {
    const dressMaterial = material(spec.dress, { roughness: 0.9 })
    const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.45, 0.95, 8), dressMaterial)
    dress.position.y = 0.73
    dress.scale.z = 0.76
    body.add(dress)
    leftLeg.visible = false
    rightLeg.visible = false
  }

  if (spec.uniform) {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.34), material(0x15191c, { roughness: 0.56 }))
    belt.position.y = 0.91
    body.add(belt)
    for (let i = 0; i < 4; i += 1) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), material(0xc3a35f, { metalness: 0.6, roughness: 0.35 }))
      button.position.set(0, 1.03 + i * 0.075, 0.186)
      body.add(button)
    }
  }

  const leftArm = new THREE.Group()
  leftArm.position.set(-0.285, 1.34, 0)
  const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.54, 7), coat)
  leftArmMesh.position.y = -0.27
  leftArm.add(leftArmMesh)
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 9, 7), skin)
  leftHand.position.y = -0.56
  leftArm.add(leftHand)
  body.add(leftArm)

  const rightArm = new THREE.Group()
  rightArm.position.set(0.285, 1.34, 0)
  const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.54, 7), coat)
  rightArmMesh.position.y = -0.27
  rightArm.add(rightArmMesh)
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 9, 7), skin)
  rightHand.position.y = -0.56
  rightArm.add(rightHand)
  body.add(rightArm)

  const head = new THREE.Group()
  head.position.set(0, 1.61, 0)
  body.add(head)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.072, 0.12, 8), skin)
  neck.position.y = -0.13
  head.add(neck)

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12), skin)
  skull.scale.set(0.92, 1.04, 0.94)
  head.add(skull)

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.172, 14, 10), hair)
  hairCap.scale.set(0.96, 0.76, 0.98)
  hairCap.position.y = 0.065
  head.add(hairCap)

  if (spec.longHair) {
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.25, 4, 7), hair)
      lock.position.set(side * 0.13, -0.07, -0.02)
      lock.rotation.z = side * 0.12
      head.add(lock)
    }
    const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.1), hair)
    backHair.position.set(0, -0.1, -0.11)
    head.add(backHair)
  }

  const browMaterial = material(spec.hair ?? 0x332a24, { roughness: 0.9 })
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.014, 0.012), browMaterial)
    brow.position.set(side * 0.058, 0.035, 0.155)
    brow.rotation.z = side * 0.06
    head.add(brow)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), material(0x1b1a18, { roughness: 0.35 }))
    eye.position.set(side * 0.058, 0.008, 0.158)
    head.add(eye)
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.075, 6), skin)
  nose.rotation.x = Math.PI / 2
  nose.position.set(0, -0.028, 0.17)
  head.add(nose)

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.011, 0.008),
    material(spec.longHair ? 0x6c3e38 : 0x513a32, { roughness: 0.6 }),
  )
  mouth.position.set(0, -0.085, 0.156)
  head.add(mouth)

  if (spec.hat === 'cap') {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.085, 12), material(0x292a28, { roughness: 0.8 }))
    cap.position.y = 0.18
    head.add(cap)
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.025, 0.16), material(0x1d1e1d, { roughness: 0.8 }))
    brim.position.set(0, 0.14, 0.14)
    head.add(brim)
  } else if (spec.hat === 'bonnet') {
    const bonnet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), material(0x8b7d69, { roughness: 0.94 }))
    bonnet.scale.set(1, 0.75, 1)
    bonnet.position.y = 0.1
    head.add(bonnet)
  } else if (spec.hat === 'police') {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 12), material(0x1b2730, { roughness: 0.7 }))
    cap.position.y = 0.19
    head.add(cap)
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.03, 0.18), material(0x13181c, { roughness: 0.7 }))
    brim.position.set(0, 0.14, 0.14)
    head.add(brim)
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.015), material(0xbfa04d, { metalness: 0.65, roughness: 0.32 }))
    badge.position.set(0, 0.19, 0.19)
    head.add(badge)
  } else if (spec.hat === 'top') {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.36, 12), material(0x18191b, { roughness: 0.8 }))
    top.position.y = 0.28
    head.add(top)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 16), material(0x151618, { roughness: 0.8 }))
    brim.position.y = 0.12
    head.add(brim)
  }

  if (spec.old) {
    for (const side of [-1, 1]) {
      const wrinkle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.008), material(0x8d6b57, { roughness: 0.9 }))
      wrinkle.position.set(side * 0.055, -0.018, 0.157)
      head.add(wrinkle)
    }
  }

  const shadow = addShadow(group, 0, 0, spec.child ? 0.9 : 1.25)
  shadow.position.y = 0.018

  const character: Character = {
    key: spec.key,
    spec,
    group,
    body,
    head,
    mouth,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shadow,
    baseRotation: 0,
    walkingAmount: 0,
    speaking: false,
    seated: false,
    yOffset: 0,
  }
  group.userData.character = character
  return character
}

export function placeCharacter(character: Character, x: number, z: number, rotation = 0, y = 0): void {
  character.group.position.set(x, y, z)
  character.group.rotation.set(0, rotation, 0)
  character.baseRotation = rotation
  character.yOffset = y
}

export function animateCharacter(
  character: Character,
  time: number,
  options: {
    speaking?: boolean
    walking?: boolean
    gesture?: Gesture
    seated?: boolean
    lookX?: number
    lookY?: number
    breathing?: boolean
    tilt?: number
  } = {},
): void {
  const walking = options.walking ?? character.walkingAmount > 0.08
  const speaking = options.speaking ?? false
  const gesture = options.gesture ?? 'none'
  const seated = options.seated ?? character.seated
  const breath = options.breathing === false ? 0 : Math.sin(time * 1.55) * 0.008
  character.speaking = speaking
  character.seated = seated
  character.walkingAmount = walking ? 1 : 0

  character.group.rotation.y = character.baseRotation
  character.group.rotation.x = options.tilt ?? 0
  character.body.position.y = breath + (seated ? -0.11 : 0)
  character.head.rotation.x = -0.03 + Math.sin(time * 1.1) * 0.018
  character.head.rotation.y = (options.lookX ?? 0) + Math.sin(time * 0.37) * 0.025
  character.head.rotation.z = Math.sin(time * 0.29) * 0.012 + (seated ? 0.03 : 0)

  const swing = walking ? Math.sin(time * 8.6) : 0
  character.leftLeg.rotation.x = seated ? -1.25 : swing * 0.42
  character.rightLeg.rotation.x = seated ? -1.25 : -swing * 0.42
  character.leftLeg.rotation.z = seated ? -0.05 : 0
  character.rightLeg.rotation.z = seated ? 0.05 : 0

  let leftArmX = -swing * 0.42
  let rightArmX = swing * 0.42
  let leftArmZ = 0.05
  let rightArmZ = -0.05
  let leftArmY = 0
  let rightArmY = 0

  if (speaking) {
    const beat = Math.sin(time * 2.8)
    rightArmX = -0.62 + beat * 0.12
    rightArmZ = -0.18
    rightArmY = -0.2
    character.head.rotation.z += beat * 0.025
    character.mouth.scale.y = 1.4 + Math.abs(Math.sin(time * 10.2)) * 2.3
    character.mouth.scale.x = 1 + Math.abs(Math.sin(time * 7.1)) * 0.18
  } else {
    character.mouth.scale.set(1, 1, 1)
  }

  if (gesture === 'point') {
    rightArmX = -1.32
    rightArmZ = -0.05
    rightArmY = -0.35
  } else if (gesture === 'pray') {
    leftArmX = -1.1
    rightArmX = -1.1
    leftArmZ = 0.22
    rightArmZ = -0.22
    rightArmY = 0.22
    leftArmY = -0.22
  } else if (gesture === 'reach') {
    rightArmX = -1.22
    leftArmX = -1.02
    rightArmZ = -0.08
    leftArmZ = 0.08
  } else if (gesture === 'bound') {
    leftArmX = 0.25
    rightArmX = 0.25
    leftArmZ = 0.18
    rightArmZ = -0.18
    rightArmY = 0.28
    leftArmY = -0.28
  } else if (gesture === 'hold') {
    leftArmX = -0.72
    rightArmX = -0.72
    leftArmZ = 0.16
    rightArmZ = -0.16
  } else if (gesture === 'wave') {
    rightArmX = -2.25
    rightArmZ = -0.3
    rightArmY = -0.2
  } else if (gesture === 'read') {
    leftArmX = -0.78
    rightArmX = -0.78
    leftArmZ = 0.15
    rightArmZ = -0.15
    character.head.rotation.x = 0.16
  }

  if (walking) {
    leftArmX = -swing * 0.42
    rightArmX = swing * 0.42
  }

  character.leftArm.rotation.set(leftArmX, leftArmY, leftArmZ)
  character.rightArm.rotation.set(rightArmX, rightArmY, rightArmZ)
}

export function makeActor(
  parent: THREE.Object3D,
  spec: CharacterSpec,
  x: number,
  z: number,
  rotation = 0,
  y = 0,
): Character {
  const character = createCharacter(spec)
  placeCharacter(character, x, z, rotation, y)
  parent.add(character.group)
  return character
}

export function addHeldProp(character: Character, prop: THREE.Object3D, side: 'left' | 'right' = 'right'): void {
  const hand = side === 'left' ? character.leftArm : character.rightArm
  prop.position.set(0, -0.6, 0.05)
  hand.add(prop)
}
