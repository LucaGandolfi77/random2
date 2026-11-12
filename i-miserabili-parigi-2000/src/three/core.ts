import * as THREE from 'three'

export type Vec3 = [number, number, number]

export interface Theme {
  background: number
  fog: number
  fogNear: number
  fogFar: number
  exposure?: number
}

interface MeshOptions {
  roughness?: number
  metalness?: number
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  basic?: boolean
  side?: THREE.Side
  flatShading?: boolean
  depthWrite?: boolean
  rotation?: Vec3
}

const shadowTexture = (() => {
  let texture: THREE.Texture | null = null
  return () => {
    if (texture) return texture
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.48)')
      gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.2)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 128, 128)
    }
    texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }
})()

export function material(color: THREE.ColorRepresentation, options: MeshOptions = {}): THREE.Material {
  if (options.basic) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: options.transparent,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      depthWrite: options.depthWrite ?? true,
    })
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.02,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    flatShading: options.flatShading ?? false,
    depthWrite: options.depthWrite ?? true,
  })
}

export function applyOptions(mesh: THREE.Mesh, options: MeshOptions = {}): THREE.Mesh {
  if (options.rotation) {
    mesh.rotation.set(...options.rotation)
  }
  return mesh
}

export function addBox(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  color: THREE.ColorRepresentation,
  options: MeshOptions = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, options))
  mesh.position.set(x, y, z)
  applyOptions(mesh, options)
  parent.add(mesh)
  return mesh
}

export function addPlane(
  parent: THREE.Object3D,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  color: THREE.ColorRepresentation,
  options: MeshOptions = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material(color, { side: THREE.DoubleSide, ...options }))
  mesh.position.set(x, y, z)
  applyOptions(mesh, options)
  parent.add(mesh)
  return mesh
}

export function addCylinder(
  parent: THREE.Object3D,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  x: number,
  y: number,
  z: number,
  color: THREE.ColorRepresentation,
  options: MeshOptions & { radialSegments?: number } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.radialSegments ?? 10),
    material(color, options),
  )
  mesh.position.set(x, y, z)
  applyOptions(mesh, options)
  parent.add(mesh)
  return mesh
}

export function addSphere(
  parent: THREE.Object3D,
  radius: number,
  x: number,
  y: number,
  z: number,
  color: THREE.ColorRepresentation,
  options: MeshOptions & { widthSegments?: number; heightSegments?: number } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, options.widthSegments ?? 18, options.heightSegments ?? 12),
    material(color, options),
  )
  mesh.position.set(x, y, z)
  applyOptions(mesh, options)
  parent.add(mesh)
  return mesh
}

export function addShadow(parent: THREE.Object3D, x: number, z: number, size = 1.15): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.86,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, 0.012, z)
  parent.add(mesh)
  return mesh
}

export function makeTextPanel(
  text: string,
  width: number,
  height: number,
  options: {
    color?: string
    background?: string
    border?: string
    font?: string
    transparent?: boolean
    uppercase?: boolean
  } = {},
): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = Math.max(180, Math.round((768 * height) / width))
  const context = canvas.getContext('2d')
  if (context) {
    if (!options.transparent) {
      context.fillStyle = options.background ?? '#1a1712'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    if (options.border) {
      context.strokeStyle = options.border
      context.lineWidth = 10
      context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14)
    }
    context.fillStyle = options.color ?? '#e8dcc4'
    context.font = options.font ?? `600 ${Math.round(canvas.height * 0.38)}px Georgia, serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const label = options.uppercase ? text.toUpperCase() : text
    context.fillText(label, canvas.width / 2, canvas.height / 2 + 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
  )
  return mesh
}

export function makeWindow(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  width: number,
  height: number,
  color = 0xf4c880,
  brightness = 0.95,
): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  group.rotation.y = rotationY
  addPlane(group, width, height, 0, 0, 0, color, {
    basic: true,
    transparent: true,
    opacity: brightness,
    depthWrite: false,
  })
  addBox(group, width + 0.16, 0.08, 0.08, 0, height / 2 + 0.04, 0, 0x171411)
  addBox(group, width + 0.16, 0.08, 0.08, 0, -height / 2 - 0.04, 0, 0x171411)
  addBox(group, 0.08, height, 0.08, -width / 2 - 0.04, 0, 0, 0x171411)
  addBox(group, 0.08, height, 0.08, width / 2 + 0.04, 0, 0, 0x171411)
  addBox(group, 0.035, height, 0.045, 0, 0, 0.01, 0x171411)
  addBox(group, width, 0.035, 0.045, 0, 0, 0.01, 0x171411)
  parent.add(group)
  return group
}

export function makeStreetLamp(parent: THREE.Object3D, x: number, z: number, height = 4.2): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  addCylinder(group, 0.055, 0.09, height, 0, height / 2, 0, 0x242320, { metalness: 0.35, roughness: 0.5 })
  addCylinder(group, 0.62, 0.4, 0.16, 0, height - 0.02, 0, 0x1c1b18, { metalness: 0.3 })
  const bulb = addSphere(group, 0.13, 0, height - 0.12, 0, 0xffd38a, {
    basic: true,
    transparent: true,
    opacity: 0.95,
  })
  bulb.scale.y = 0.7
  const light = new THREE.PointLight(0xffc87a, 7, 9, 1.8)
  light.position.set(0, height - 0.2, 0)
  group.add(light)
  parent.add(group)
  return group
}

export function addContactLights(group: THREE.Object3D, options: {
  sky?: number
  ground?: number
  hemi?: number
  key?: number
  keyIntensity?: number
  keyPosition?: Vec3
  fill?: number
  fillIntensity?: number
  fillPosition?: Vec3
} = {}): void {
  group.add(new THREE.HemisphereLight(options.sky ?? 0x9fb4cb, options.ground ?? 0x2b2118, options.hemi ?? 0.7))
  const key = new THREE.DirectionalLight(options.key ?? 0xffdfb0, options.keyIntensity ?? 1.5)
  key.position.set(...(options.keyPosition ?? [4, 7, 6]))
  group.add(key)
  const fill = new THREE.PointLight(options.fill ?? 0x7fa7d8, options.fillIntensity ?? 5, 18, 1.8)
  fill.position.set(...(options.fillPosition ?? [-4, 3, 3]))
  group.add(fill)
  const frontFill = new THREE.PointLight(0xffe2b8, 2.1, 17, 2)
  frontFill.position.set(0, 3.1, 4.3)
  group.add(frontFill)
}

export function makeRain(count: number, area: number, height = 9, color = 0xbdd5e8): { group: THREE.Group; update: (time: number) => void } {
  const positions = new Float32Array(count * 6)
  const seeds: Array<[number, number, number, number]> = []
  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() - 0.5) * area
    const z = (Math.random() - 0.5) * area
    const y = Math.random() * height
    const speed = 8 + Math.random() * 8
    seeds.push([x, z, y, speed])
    positions[i * 6] = x
    positions[i * 6 + 1] = y
    positions[i * 6 + 2] = z
    positions[i * 6 + 3] = x + 0.02
    positions[i * 6 + 4] = y + 0.4
    positions[i * 6 + 5] = z
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  })
  const group = new THREE.Group()
  group.add(new THREE.LineSegments(geometry, material))
  return {
    group,
    update(time: number) {
      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < seeds.length; i += 1) {
        const [x, z, baseY, speed] = seeds[i]
        let y = baseY - ((time * speed) % height)
        if (y < 0) y += height
        attribute.setXYZ(i * 2, x, y, z)
        attribute.setXYZ(i * 2 + 1, x + 0.02, y + 0.4, z)
      }
      attribute.needsUpdate = true
    },
  }
}

export function makeSnow(count: number, area: number, height = 8): { group: THREE.Group; update: (time: number) => void } {
  const positions = new Float32Array(count * 3)
  const seeds: Array<[number, number, number, number]> = []
  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() - 0.5) * area
    const z = (Math.random() - 0.5) * area
    const y = Math.random() * height
    const speed = 0.25 + Math.random() * 0.55
    seeds.push([x, z, y, speed])
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xe9f1f2,
      size: 0.075,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
  )
  const group = new THREE.Group()
  group.add(points)
  return {
    group,
    update(time: number) {
      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < seeds.length; i += 1) {
        const [x, z, baseY, speed] = seeds[i]
        let y = baseY - ((time * speed) % height)
        if (y < 0) y += height
        attribute.setXYZ(i, x + Math.sin(time * 0.3 + i) * 0.18, y, z + Math.cos(time * 0.2 + i) * 0.12)
      }
      attribute.needsUpdate = true
    },
  }
}

export function makeDust(count: number, area: number, height = 4): { group: THREE.Group; update: (time: number) => void } {
  const positions = new Float32Array(count * 3)
  const seeds: Array<[number, number, number]> = []
  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() - 0.5) * area
    const z = (Math.random() - 0.5) * area
    const y = Math.random() * height
    seeds.push([x, y, z])
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const group = new THREE.Group()
  group.add(
    new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xf4e5c4,
        size: 0.025,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    ),
  )
  return {
    group,
    update(time: number) {
      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < seeds.length; i += 1) {
        const [x, y, z] = seeds[i]
        attribute.setXYZ(i, x + Math.sin(time * 0.08 + i) * 0.15, (y + time * 0.035) % height, z + Math.cos(time * 0.06 + i) * 0.12)
      }
      attribute.needsUpdate = true
    },
  }
}

export function makeFlame(parent: THREE.Object3D, x: number, y: number, z: number, scale = 1): { light: THREE.PointLight; update: (time: number) => void } {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  const outer = addSphere(group, 0.065 * scale, 0, 0.08 * scale, 0, 0xffb34f, {
    basic: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  })
  outer.scale.set(0.72, 1.65, 0.72)
  const inner = addSphere(group, 0.028 * scale, 0, 0.09 * scale, 0, 0xfff2b0, {
    basic: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  })
  inner.scale.set(0.7, 1.4, 0.7)
  const light = new THREE.PointLight(0xffb45a, 3.2 * scale, 4.5, 1.8)
  light.position.set(0, 0.1, 0)
  group.add(light)
  parent.add(group)
  return {
    light,
    update(time: number) {
      const flicker = Math.sin(time * 8.7) * 0.15 + Math.sin(time * 13.1) * 0.08
      outer.scale.set(0.72 + flicker * 0.2, 1.65 + flicker * 0.5, 0.72)
      inner.scale.set(0.7 - flicker * 0.1, 1.4 + flicker * 0.35, 0.7)
      light.intensity = 3.2 * scale + flicker * 1.6 * scale
    },
  }
}

export function makeCandlestick(parent: THREE.Object3D, x: number, y: number, z: number, height = 0.7, scale = 1): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  addCylinder(group, 0.12 * scale, 0.17 * scale, 0.055 * scale, 0, 0.027, 0, 0xb99754, { metalness: 0.72, roughness: 0.28 })
  addCylinder(group, 0.035 * scale, 0.055 * scale, height, 0, height / 2, 0, 0xc7a563, { metalness: 0.65, roughness: 0.3 })
  addCylinder(group, 0.08 * scale, 0.03 * scale, 0.04 * scale, 0, height - 0.01, 0, 0xc7a563, { metalness: 0.65 })
  addCylinder(group, 0.035 * scale, 0.035 * scale, 0.26 * scale, 0, height + 0.12 * scale, 0, 0xd9c9a4, { roughness: 0.85 })
  makeFlame(group, 0, height + 0.26 * scale, 0, 0.85 * scale)
  parent.add(group)
  return group
}

export function makeCandle(parent: THREE.Object3D, x: number, y: number, z: number, height = 0.22, scale = 1): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  addCylinder(group, 0.035 * scale, 0.04 * scale, height, 0, height / 2, 0, 0xe3d6b5, { roughness: 0.9 })
  makeFlame(group, 0, height + 0.03, 0, 0.8 * scale)
  parent.add(group)
  return group
}

export function makeTree(parent: THREE.Object3D, x: number, z: number, height = 5, color = 0x273126): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  addCylinder(group, 0.13, 0.24, height * 0.68, 0, height * 0.34, 0, 0x2d2019, { roughness: 0.95 })
  const crownMaterial = material(color, { roughness: 1, flatShading: true })
  for (let i = 0; i < 6; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1 + (i % 3) * 0.35, 2.2, 7), crownMaterial)
    cone.position.set((Math.sin(i * 2.2) * 0.6), height * (0.55 + i * 0.08), Math.cos(i * 1.7) * 0.45)
    cone.rotation.y = i * 0.4
    group.add(cone)
  }
  parent.add(group)
  return group
}

export function makeCar(parent: THREE.Object3D, x: number, z: number, rotation = 0, color = 0x4b5963, flipped = false): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, flipped ? 0.65 : 0, z)
  group.rotation.set(flipped ? Math.PI * 0.48 : 0, rotation, flipped ? 0.15 : 0)
  addBox(group, 1.75, 0.52, 3.6, 0, 0.54, 0, color, { roughness: 0.45, metalness: 0.25 })
  addBox(group, 1.5, 0.5, 1.8, 0, 0.98, -0.2, color, { roughness: 0.4, metalness: 0.25 })
  addBox(group, 1.35, 0.34, 1.5, 0, 1.04, -0.24, 0x182328, { roughness: 0.2, metalness: 0.1 })
  for (const [wheelX, wheelZ] of [
    [-0.82, 1.1],
    [0.82, 1.1],
    [-0.82, -1.1],
    [0.82, -1.1],
  ]) {
    const wheel = addCylinder(group, 0.18, 0.18, 0.16, wheelX, 0.24, wheelZ, 0x121212, {
      rotation: [0, 0, Math.PI / 2],
      roughness: 0.9,
      radialSegments: 12,
    })
    wheel.rotation.z = Math.PI / 2
  }
  addBox(group, 0.36, 0.14, 0.04, -0.55, 0.58, 1.82, 0xfff0c2, { basic: true })
  addBox(group, 0.36, 0.14, 0.04, 0.55, 0.58, 1.82, 0xfff0c2, { basic: true })
  addBox(group, 0.32, 0.14, 0.04, -0.55, 0.58, -1.82, 0xc43424, { basic: true })
  addBox(group, 0.32, 0.14, 0.04, 0.55, 0.58, -1.82, 0xc43424, { basic: true })
  parent.add(group)
  return group
}

export function makeBus(parent: THREE.Object3D, x: number, z: number, rotation = 0): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotation
  addBox(group, 2.5, 2.8, 8.5, 0, 1.55, 0, 0xbcb9ad, { roughness: 0.62, metalness: 0.08 })
  addBox(group, 2.3, 0.85, 7.8, 0, 2.1, 0, 0x243238, { roughness: 0.2, metalness: 0.08 })
  addBox(group, 2.28, 1.0, 0.02, 0, 1.38, 4.25, 0x263b4c, { roughness: 0.2 })
  addBox(group, 2.1, 0.2, 7.90, 0, 0.85, 0, 0x8d3c31, { roughness: 0.52 })
  for (const wheelZ of [-2.8, 2.8]) {
    for (const wheelX of [-1.22, 1.22]) {
      addCylinder(group, 0.34, 0.34, 0.18, wheelX, 0.34, wheelZ, 0x111111, {
        rotation: [0, 0, Math.PI / 2],
        radialSegments: 14,
        roughness: 0.9,
      })
    }
  }
  addBox(group, 0.8, 0.35, 0.04, -0.65, 1.55, -4.27, 0xb44939, { basic: true })
  addBox(group, 0.8, 0.35, 0.04, 0.65, 1.55, -4.27, 0xb44939, { basic: true })
  parent.add(group)
  return group
}

export function makePayphone(parent: THREE.Object3D, x: number, z: number, rotation = 0): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotation
  addBox(group, 0.82, 1.9, 0.5, 0, 0.95, 0, 0x4f5c58, { roughness: 0.55, metalness: 0.2 })
  addBox(group, 0.58, 0.92, 0.06, 0, 1.28, 0.27, 0xd3dfd6, { roughness: 0.35, metalness: 0.15 })
  addBox(group, 0.46, 0.4, 0.02, 0, 1.38, 0.31, 0x1d2624, { basic: true })
  addBox(group, 0.18, 0.42, 0.08, 0.31, 1.18, 0.32, 0x222222, { roughness: 0.4 })
  addBox(group, 0.22, 0.07, 0.22, 0.08, 0.75, 0.18, 0x151515, { rotation: [0.2, 0, 0] })
  addBox(group, 0.08, 0.32, 0.08, 0, 2.14, 0, 0x2e3735, { metalness: 0.3 })
  parent.add(group)
  return group
}

export function makeCRT(parent: THREE.Object3D, x: number, y: number, z: number, rotation = 0, scale = 1): { group: THREE.Group; update: (time: number) => void } {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  group.rotation.y = rotation
  group.scale.setScalar(scale)
  addBox(group, 1.2, 0.9, 0.7, 0, 0.45, 0, 0x242421, { roughness: 0.62 })
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 180
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.94, 0.66),
    new THREE.MeshBasicMaterial({ map: texture }),
  )
  screen.position.set(0, 0.5, 0.36)
  group.add(screen)
  const light = new THREE.PointLight(0x76a8c8, 1.4, 3.2, 2)
  light.position.set(0, 0.6, 0.6)
  group.add(light)
  parent.add(group)
  return {
    group,
    update(time: number) {
      if (!context) return
      context.fillStyle = '#18242a'
      context.fillRect(0, 0, 256, 180)
      context.fillStyle = 'rgba(109, 156, 177, 0.28)'
      context.fillRect(12, 14, 232, 24)
      context.fillStyle = '#d5d1bf'
      context.font = 'bold 18px Georgia'
      context.fillText('PARIGI OGGI', 18, 34)
      context.fillStyle = '#b7b19f'
      for (let i = 0; i < 5; i += 1) {
        const width = 78 + ((Math.sin(time * 0.4 + i) + 1) * 62)
        context.fillRect(18, 60 + i * 20, width, 7)
      }
      context.fillStyle = '#a44a3e'
      context.fillRect(12, 150, 232, 18)
      texture.needsUpdate = true
      light.intensity = 1.2 + Math.sin(time * 4.1) * 0.18
    },
  }
}

export function makeRoom(
  width: number,
  depth: number,
  height: number,
  wallColor: THREE.ColorRepresentation,
  floorColor: THREE.ColorRepresentation,
  options: { ceiling?: boolean; backWindow?: boolean } = {},
): THREE.Group {
  const group = new THREE.Group()
  addBox(group, width, 0.12, depth, 0, -0.06, 0, floorColor, { roughness: 0.94 })
  addBox(group, width, height, 0.25, 0, height / 2, -depth / 2, wallColor, { roughness: 0.96 })
  addBox(group, 0.25, height, depth, -width / 2, height / 2, 0, wallColor, { roughness: 0.96 })
  addBox(group, 0.25, height, depth, width / 2, height / 2, 0, wallColor, { roughness: 0.96 })
  if (options.ceiling) {
    addBox(group, width, 0.18, depth, 0, height, 0, 0x17130f, { roughness: 1 })
  }
  addBox(group, width - 0.1, 0.12, 0.14, 0, 0.06, -depth / 2 + 0.2, 0x25201a, { roughness: 0.8 })
  addBox(group, 0.14, 0.12, depth - 0.1, -width / 2 + 0.2, 0.06, 0, 0x25201a, { roughness: 0.8 })
  addBox(group, 0.14, 0.12, depth - 0.1, width / 2 - 0.2, 0.06, 0, 0x25201a, { roughness: 0.8 })
  if (options.backWindow) {
    makeWindow(group, 0, height * 0.58, -depth / 2 + 0.14, 0, 2.1, 1.8, 0xf4c77a, 0.72)
  }
  return group
}

export function makeFacade(
  parent: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  height: number,
  color: THREE.ColorRepresentation,
  facing: 1 | -1,
  rows = 4,
  cols = 3,
  litRatio = 0.42,
): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  addBox(group, width, height, width * 0.45, 0, height / 2, 0, color, { roughness: 0.93 })
  addBox(group, width + 0.15, 0.16, width * 0.47, 0, height + 0.08, 0, 0x1b1815, { roughness: 0.9 })
  const windowWidth = width / (cols * 1.8)
  const windowHeight = height / (rows * 2.35)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (Math.random() > 0.75) continue
      const localX = (col - (cols - 1) / 2) * (width / cols)
      const localY = 0.9 + row * (height / rows)
      makeWindow(
        group,
        localX,
        localY,
        facing * (width * 0.225 + 0.02),
        facing === 1 ? Math.PI : 0,
        windowWidth,
        windowHeight,
        Math.random() < litRatio ? 0xf3c57a : 0x28343a,
        Math.random() < litRatio ? 0.82 : 0.38,
      )
    }
  }
  addBox(group, width * 0.38, 1.4, 0.08, 0, 0.7, facing * (width * 0.225 + 0.04), 0x2c261e, { roughness: 0.8 })
  parent.add(group)
  return group
}

export function makeStreet(
  length: number,
  width: number,
  options: {
    road?: number
    sidewalk?: number
    building?: [number, number]
    night?: boolean
    lamps?: boolean
  } = {},
): { group: THREE.Group; lampLights: THREE.PointLight[] } {
  const group = new THREE.Group()
  const roadColor = options.road ?? 0x24282b
  const sidewalkColor = options.sidewalk ?? 0x4d4a43
  addBox(group, width, 0.12, length, 0, -0.06, 0, roadColor, { roughness: 0.98 })
  addBox(group, 1.8, 0.18, length, -width / 2 - 0.9, 0.03, 0, sidewalkColor, { roughness: 0.95 })
  addBox(group, 1.8, 0.18, length, width / 2 + 0.9, 0.03, 0, sidewalkColor, { roughness: 0.95 })
  addBox(group, 0.12, 0.13, length, 0, 0.01, 0, 0xd4c9a7, { basic: true, opacity: 0.42, transparent: true })
  for (const side of [-1, 1] as const) {
    let z = -length / 2 + 2
    let index = 0
    while (z < length / 2) {
      const buildingWidth = 4.3 + ((index * 7) % 4) * 0.55
      const height = 8 + ((index * 3) % 5)
      const palette = [
        options.building?.[0] ?? 0x4f4941,
        options.building?.[1] ?? 0x5d564b,
        0x3f3b37,
        0x62594d,
      ]
      makeFacade(
        group,
        side * (width / 2 + 2.5),
        z,
        buildingWidth,
        height,
        palette[index % palette.length],
        side === -1 ? 1 : -1,
        4,
        3,
        options.night ? 0.3 : 0.5,
      )
      z += buildingWidth + 0.6
      index += 1
    }
  }
  const lampLights: THREE.PointLight[] = []
  if (options.lamps) {
    for (let z = -length / 2 + 4; z < length / 2; z += 8) {
      for (const side of [-1, 1] as const) {
        const lamp = makeStreetLamp(group, side * (width / 2 + 0.25), z, 4.2)
        for (const child of lamp.children) {
          if (child instanceof THREE.PointLight) lampLights.push(child)
        }
      }
    }
  }
  const skyline = new THREE.Group()
  for (let i = 0; i < 24; i += 1) {
    const silhouetteHeight = 2.5 + Math.random() * 6
    addBox(
      skyline,
      1.3 + Math.random() * 2.2,
      silhouetteHeight,
      1.2,
      (Math.random() - 0.5) * 34,
      silhouetteHeight / 2,
      -length / 2 - 5 - Math.random() * 5,
      0x14181c,
      { roughness: 1 },
    )
  }
  group.add(skyline)
  return { group, lampLights }
}

export function makeTable(parent: THREE.Object3D, x: number, z: number, w = 2.4, d = 1.1, height = 0.78, color = 0x4b3424): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  addBox(group, w, 0.1, d, 0, height, 0, color, { roughness: 0.66 })
  for (const [legX, legZ] of [
    [-w / 2 + 0.16, -d / 2 + 0.16],
    [w / 2 - 0.16, -d / 2 + 0.16],
    [-w / 2 + 0.16, d / 2 - 0.16],
    [w / 2 - 0.16, d / 2 - 0.16],
  ]) {
    addBox(group, 0.1, height, 0.1, legX, height / 2, legZ, color, { roughness: 0.72 })
  }
  parent.add(group)
  return group
}

export function makeChair(parent: THREE.Object3D, x: number, z: number, rotation = 0, color = 0x4a3324): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotation
  addBox(group, 0.62, 0.09, 0.6, 0, 0.48, 0, color, { roughness: 0.72 })
  addBox(group, 0.62, 0.75, 0.08, 0, 0.84, -0.27, color, { roughness: 0.72 })
  for (const [legX, legZ] of [
    [-0.24, -0.22],
    [0.24, -0.22],
    [-0.24, 0.22],
    [0.24, 0.22],
  ]) {
    addBox(group, 0.07, 0.48, 0.07, legX, 0.24, legZ, color, { roughness: 0.8 })
  }
  parent.add(group)
  return group
}

export function makeBed(parent: THREE.Object3D, x: number, z: number, rotation = 0, color = 0x4d3a2b): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotation
  addBox(group, 1.45, 0.36, 2.25, 0, 0.34, 0, color, { roughness: 0.8 })
  addBox(group, 1.32, 0.18, 2.05, 0, 0.58, 0, 0xd7cfb9, { roughness: 0.95 })
  addBox(group, 1.2, 0.24, 1.5, 0, 0.69, 0.25, 0x8b8170, { roughness: 0.96 })
  addBox(group, 0.9, 0.16, 0.44, 0, 0.73, -0.65, 0xe2d9c3, { roughness: 0.95 })
  addBox(group, 1.4, 0.9, 0.13, 0, 0.75, -1.1, color, { roughness: 0.8 })
  addBox(group, 1.4, 0.65, 0.12, 0, 0.76, 1.12, color, { roughness: 0.8 })
  parent.add(group)
  return group
}
