import './styles.css'
import { AudioEngine } from './audio/engine'
import {
  CHAPTERS,
  CUES,
  DURATION,
  clampTime,
  getActiveCue,
  getChapterAt,
  getChapterIndexAt,
} from './film/timeline'
import { Stage, type Quality } from './three/stage'
import { PlayerUI } from './ui/player'

const canvas = document.getElementById('stage') as HTMLCanvasElement | null
if (!canvas) throw new Error('Canvas non trovato')

const audio = new AudioEngine()
let stage: Stage | null = null
let started = false
let playing = false
let time = 0
let speed = 1
let lastFrame = performance.now()
let lastUiTime = 0
let lastCueId = ''
let lastChapterId = ''
let creditsOpen = false

const ui = new PlayerUI({
  onStart: async (voice) => {
    if (started) return
    try {
      ui.showLoading(true, 0.18)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 40))
      await audio.init()
      ui.setVoiceAvailable(audio.speechAvailable)
      audio.setVoiceEnabled(voice && audio.speechAvailable)
      ui.showLoading(true, 0.56)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 40))
      stage = new Stage(canvas)
      ui.showLoading(true, 0.94)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 80))
      ui.showLoading(false)
      ui.hideStart()
      started = true
      audio.setPaused(false)
      audio.setChapter(getChapterAt(0).id)
      playing = true
      ui.setPlaying(true)
      ui.setCue(null)
      updateScene(0, true)
      lastFrame = performance.now()
      requestAnimationFrame(loop)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto durante l’avvio.'
      ui.showError(`Il browser non riesce ad avviare la scena tridimensionale. ${message}`)
    }
  },
  onPlayToggle: () => {
    if (!started) return
    if (creditsOpen) {
      closeCreditsAndPlay()
      return
    }
    if (time >= DURATION - 0.02) {
      restartFilm()
      return
    }
    playing = !playing
    ui.setPlaying(playing)
    audio.setPaused(!playing)
    workAfterPlayState()
  },
  onRestart: () => restartFilm(),
  onReplay: () => restartFilm(),
  onSeek: (value) => {
    if (!started) return
    time = clampTime(value)
    lastCueId = ''
    lastChapterId = ''
    audio.cancelVoice()
    ui.setTime(time)
    updateScene(time, true)
    const chapter = getChapterAt(time)
    audio.setChapter(chapter.id)
    audio.setPaused(!playing)
    if (time >= DURATION - 0.02) openCredits()
  },
  onChapter: (id) => {
    const chapter = CHAPTERS.find((candidate) => candidate.id === id)
    if (!chapter) return
    time = chapter.start
    lastCueId = ''
    lastChapterId = ''
    audio.cancelVoice()
    ui.setTime(time)
    updateScene(time, true)
    audio.setChapter(chapter.id)
    audio.setPaused(!playing)
  },
  onSubtitles: () => {},
  onVoice: (enabled) => audio.setVoiceEnabled(enabled),
  onMute: (muted) => audio.setMuted(muted),
  onSpeed: (value) => {
    speed = value
    audio.setSpeed(value)
  },
  onQuality: (quality: Quality) => stage?.setQuality(quality),
  onFullscreen: () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    }
  },
  onCredits: () => openCredits(),
  onCreditsClose: () => {
    ui.hideCredits()
    creditsOpen = false
    playing = false
    ui.setPlaying(false)
    audio.setPaused(true)
  },
})

ui.setChapters(CHAPTERS)
ui.setVoiceAvailable(audio.speechAvailable)
ui.setTime(0)

function updateScene(value: number, force = false): void {
  if (!stage) return
  const chapter = getChapterAt(value)
  const chapterIndex = getChapterIndexAt(value)
  const cue = getActiveCue(value)
  stage.update(value, cue)
  if (force || chapter.id !== lastChapterId) {
    lastChapterId = chapter.id
    ui.setChapter(chapter, chapterIndex)
    audio.setChapter(chapter.id)
  }
  if (force || (cue?.id ?? '') !== lastCueId) {
    lastCueId = cue?.id ?? ''
    ui.setCue(cue)
    audio.onCue(cue)
  }
}

function loop(now: number): void {
  const delta = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000))
  lastFrame = now
  if (started && playing && !creditsOpen) {
    time = Math.min(DURATION, time + delta * speed)
    if (time >= DURATION) {
      time = DURATION
      playing = false
      ui.setPlaying(false)
      audio.setPaused(true)
      openCredits()
    }
  }
  if (started && stage) {
    updateScene(time)
    if (now - lastUiTime > 90) {
      lastUiTime = now
      ui.setTime(time)
    }
  }
  requestAnimationFrame(loop)
}

function restartFilm(): void {
  if (!started) return
  ui.hideCredits()
  creditsOpen = false
  time = 0
  lastCueId = ''
  lastChapterId = ''
  playing = true
  speed = 1
  ui.setTime(0)
  ui.setPlaying(true)
  audio.cancelVoice()
  audio.setChapter(CHAPTERS[0].id)
  audio.setPaused(false)
  updateScene(0, true)
}

function openCredits(): void {
  if (creditsOpen) return
  creditsOpen = true
  playing = false
  ui.setPlaying(false)
  audio.setPaused(true)
  ui.setCue(null)
  ui.showCredits()
}

function closeCreditsAndPlay(): void {
  ui.hideCredits()
  creditsOpen = false
  if (time >= DURATION - 0.02) {
    restartFilm()
    return
  }
  playing = true
  ui.setPlaying(true)
  audio.setPaused(false)
}

function workAfterPlayState(): void {
  if (playing) {
    audio.setChapter(getChapterAt(time).id)
    const cue = getActiveCue(time)
    if (cue && cue.id !== lastCueId) {
      lastCueId = cue.id
      ui.setCue(cue)
      audio.onCue(cue)
    }
  }
}

window.addEventListener('resize', () => stage?.resize())
document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing && started) {
    playing = false
    ui.setPlaying(false)
    audio.setPaused(true)
  }
})

declare global {
  interface Window {
    __MISERABLES__?: {
      getTime: () => number
      seek: (value: number) => void
      play: () => void
      pause: () => void
      isReady: () => boolean
      chapters: typeof CHAPTERS
      cues: typeof CUES
    }
  }
}

window.__MISERABLES__ = {
  getTime: () => time,
  seek: (value: number) => {
    time = clampTime(value)
    lastCueId = ''
    lastChapterId = ''
    ui.setTime(time)
    updateScene(time, true)
    if (time >= DURATION - 0.02) openCredits()
  },
  play: () => {
    if (!started) return
    playing = true
    ui.setPlaying(true)
    audio.setPaused(false)
  },
  pause: () => {
    playing = false
    ui.setPlaying(false)
    audio.setPaused(true)
  },
  isReady: () => Boolean(stage),
  chapters: CHAPTERS,
  cues: CUES,
}
