import * as THREE from 'three'
import { CHAPTERS, getChapterAt } from '../film/timeline'
import type { SubtitleCue } from '../film/types'
import { speakerToActorKey } from '../film/speakers'
import { animateCharacter } from './characters'
import { buildFilmScenes } from './scenes'
import type { ActorKey, ActorTrack, CameraKey, ChapterScene, Phase } from './types'
import type { Vec3 } from './core'

export type Quality = 'high' | 'low'

interface SampledActor {
  x: number
  z: number
  y: number
  rot: number
  hidden: boolean
  gesture: NonNullable<ActorKey['gesture']>
  seated: boolean
  tilt: number
  lookX: number
}

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

function sampleActor(track: ActorTrack, t: number): SampledActor {
  const keys = track.keys
  if (keys.length === 0) {
    return { x: 0, z: 0, y: 0, rot: 0, hidden: true, gesture: 'none', seated: false, tilt: 0, lookX: 0 }
  }
  let before = keys[0]
  let after = keys[0]
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].t <= t) {
      before = keys[i]
      after = keys[i]
    } else {
      after = keys[i]
      break
    }
  }
  if (before === after) {
    return {
      x: before.x,
      z: before.z,
      y: before.y ?? 0,
      rot: before.rot ?? 0,
      hidden: before.hidden ?? false,
      gesture: before.gesture ?? 'none',
      seated: before.seated ?? false,
      tilt: before.tilt ?? 0,
      lookX: before.lookX ?? 0,
    }
  }
  const span = Math.max(0.001, after.t - before.t)
  let ratio = (t - before.t) / span
  ratio = smoothstep(ratio)
  const x = before.x + (after.x - before.x) * ratio
  const z = before.z + (after.z - before.z) * ratio
  const y = (before.y ?? 0) + ((after.y ?? 0) - (before.y ?? 0)) * ratio
  const rot = (before.rot ?? 0) + ((after.rot ?? 0) - (before.rot ?? 0)) * ratio
  return {
    x,
    z,
    y,
    rot,
    hidden: (t < before.t ? before.hidden : before.hidden) ?? false,
    gesture: before.gesture ?? 'none',
    seated: before.seated ?? false,
    tilt: (before.tilt ?? 0) + ((after.tilt ?? 0) - (before.tilt ?? 0)) * ratio,
    lookX: (before.lookX ?? 0) + ((after.lookX ?? 0) - (before.lookX ?? 0)) * ratio,
  }
}

function sampleCamera(keys: CameraKey[], t: number, duration: number): { pos: THREE.Vector3; look: THREE.Vector3; fov: number } {
  if (keys.length === 0) {
    return { pos: new THREE.Vector3(0, 1.6, 5), look: new THREE.Vector3(0, 1.2, 0), fov: 46 }
  }
  const sorted = [...keys].sort((a, b) => a.t - b.t)
  const time = Math.max(0, Math.min(duration, t))
  let before = sorted[0]
  let after = sorted[sorted.length - 1]
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].t <= time) {
      before = sorted[i]
      after = sorted[i]
      if (i + 1 < sorted.length) after = sorted[i + 1]
      else after = sorted[i]
    } else {
      break
    }
  }
  let ratio = 1
  if (before !== after) {
    ratio = smoothstep((time - before.t) / Math.max(0.001, after.t - before.t))
  }
  const pos = new THREE.Vector3(
    before.pos[0] + (after.pos[0] - before.pos[0]) * ratio,
    before.pos[1] + (after.pos[1] - before.pos[1]) * ratio,
    before.pos[2] + (after.pos[2] - before.pos[2]) * ratio,
  )
  const look = new THREE.Vector3(
    before.look[0] + (after.look[0] - before.look[0]) * ratio,
    before.look[1] + (after.look[1] - before.look[1]) * ratio,
    before.look[2] + (after.look[2] - before.look[2]) * ratio,
  )
  const fov = (before.fov ?? 48) + ((after.fov ?? before.fov ?? 48) - (before.fov ?? 48)) * ratio
  return { pos, look, fov }
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  private readonly scenes = new Map<string, ChapterScene>()
  private currentChapterId = ''
  private currentPhase: Phase | null = null
  private quality: Quality = 'high'
  private lastSize = { width: 1, height: 1 }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.05, 160)
    this.camera.position.set(0, 1.7, 6)
    this.resize()
    const filmScenes = buildFilmScenes()
    for (const chapter of CHAPTERS) {
      const chapterScene = filmScenes.find((candidate) => candidate.id === chapter.id)
      if (!chapterScene) continue
      for (const phase of chapterScene.phases) {
        phase.group.visible = false
        this.scene.add(phase.group)
      }
      this.scenes.set(chapter.id, chapterScene)
    }
    this.setChapter(CHAPTERS[0].id)
  }

  setQuality(quality: Quality): void {
    this.quality = quality
    const ratio = quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.8)
    this.renderer.setPixelRatio(ratio)
    this.resize()
  }

  private setChapter(id: string): void {
    this.currentChapterId = id
    this.currentPhase = null
    for (const chapterScene of this.scenes.values()) {
      for (const phase of chapterScene.phases) phase.group.visible = false
    }
  }

  update(time: number, cue: SubtitleCue | null): void {
    const chapter = getChapterAt(time)
    if (chapter.id !== this.currentChapterId) {
      this.setChapter(chapter.id)
    }
    const chapterScene = this.scenes.get(chapter.id)
    if (!chapterScene) return
    const local = Math.max(0, Math.min(chapter.duration, time - chapter.start))
    let activePhase = chapterScene.phases[chapterScene.phases.length - 1]
    for (const candidate of chapterScene.phases) {
      if (local >= candidate.start && local < candidate.end) {
        activePhase = candidate
        break
      }
    }
    if (activePhase !== this.currentPhase) {
      for (const phase of chapterScene.phases) phase.group.visible = false
      activePhase.group.visible = true
      this.currentPhase = activePhase
      this.scene.background = new THREE.Color(activePhase.theme.background)
      this.scene.fog = new THREE.Fog(activePhase.theme.fog, activePhase.theme.fogNear, activePhase.theme.fogFar)
      this.renderer.toneMappingExposure = activePhase.theme.exposure ?? 1.05
    }
    this.perform(activePhase, local - activePhase.start, activePhase.end - activePhase.start, speakerToActorKey(cue?.speaker), time)
    const cameraFrame = sampleCamera(activePhase.camera, local - activePhase.start, activePhase.end - activePhase.start)
    const shake = 0.012 + (this.quality === 'low' ? 0.006 : 0)
    this.camera.position.copy(cameraFrame.pos)
    this.camera.position.x += Math.sin(time * 0.73) * shake
    this.camera.position.y += Math.sin(time * 0.91 + 1.2) * shake * 0.55
    this.camera.lookAt(cameraFrame.look)
    this.camera.fov = cameraFrame.fov
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }

  private perform(phase: Phase, t: number, duration: number, speakerKey: string | null, time: number): void {
    if (phase.update) phase.update(t)
    for (const track of phase.tracks) {
      const character = track.character
      const state = sampleActor(track, Math.min(t, duration))
      const ahead = sampleActor(track, Math.min(duration, t + 0.12))
      character.group.visible = !state.hidden
      if (state.hidden) continue
      character.group.position.set(state.x, state.y, state.z)
      character.group.rotation.set(0, state.rot, 0)
      character.baseRotation = state.rot
      const walking = !state.seated && Math.hypot(ahead.x - state.x, ahead.z - state.z) > 0.018
      animateCharacter(character, time, {
        speaking: speakerKey !== null && character.key === speakerKey,
        walking,
        gesture: state.gesture,
        seated: state.seated,
        tilt: state.tilt,
        lookX: state.lookX,
      })
    }
  }

  resize(): void {
    const width = Math.max(1, window.innerWidth)
    const height = Math.max(1, window.innerHeight)
    this.lastSize = { width, height }
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  get size(): { width: number; height: number } {
    return this.lastSize
  }
}

export function lookAtVector(x: number, y: number, z: number): Vec3 {
  return [x, y, z]
}
