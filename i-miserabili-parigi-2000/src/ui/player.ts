import { CUES, DURATION, formatTime } from '../film/timeline'
import type { FilmChapter, SubtitleCue } from '../film/types'
import { downloadSrt } from './srt'

export type Quality = 'high' | 'low'

export interface PlayerCallbacks {
  onStart: (voice: boolean) => void | Promise<void>
  onPlayToggle: () => void
  onRestart: () => void
  onReplay: () => void
  onSeek: (time: number) => void
  onChapter: (id: string) => void
  onSubtitles: (enabled: boolean) => void
  onVoice: (enabled: boolean) => void
  onMute: (muted: boolean) => void
  onSpeed: (speed: number) => void
  onQuality: (quality: Quality) => void
  onFullscreen: () => void
  onCredits: () => void
  onCreditsClose: () => void
}

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Elemento #${id} non trovato`)
  return node as T
}

export class PlayerUI {
  private readonly callbacks: PlayerCallbacks
  private readonly startScreen = element<HTMLElement>('start-screen')
  private readonly startButton = element<HTMLButtonElement>('start-button')
  private readonly startVoice = element<HTMLInputElement>('start-voice')
  private readonly loading = element<HTMLElement>('loading')
  private readonly loadingBar = element<HTMLElement>('loading-bar')
  private readonly errorScreen = element<HTMLElement>('error-screen')
  private readonly errorMessage = element<HTMLElement>('error-message')
  private readonly controls = element<HTMLElement>('controls')
  private readonly playButton = element<HTMLButtonElement>('play-button')
  private readonly playLabel = element<HTMLElement>('play-label')
  private readonly restartButton = element<HTMLButtonElement>('restart-button')
  private readonly currentTime = element<HTMLElement>('current-time')
  private readonly totalTime = element<HTMLElement>('total-time')
  private readonly seek = element<HTMLInputElement>('seek')
  private readonly chapterSelect = element<HTMLSelectElement>('chapter-select')
  private readonly subtitlesButton = element<HTMLButtonElement>('subtitles-button')
  private readonly voiceButton = element<HTMLButtonElement>('voice-button')
  private readonly muteButton = element<HTMLButtonElement>('mute-button')
  private readonly speedSelect = element<HTMLSelectElement>('speed-select')
  private readonly qualitySelect = element<HTMLSelectElement>('quality-select')
  private readonly infoButton = element<HTMLButtonElement>('info-button')
  private readonly infoPanel = element<HTMLElement>('info-panel')
  private readonly infoClose = element<HTMLButtonElement>('info-close')
  private readonly fullscreenButton = element<HTMLButtonElement>('fullscreen-button')
  private readonly downloadButton = element<HTMLButtonElement>('download-srt')
  private readonly creditsButton = element<HTMLButtonElement>('credits-button')
  private readonly chapterCard = element<HTMLElement>('chapter-card')
  private readonly chapterKicker = element<HTMLElement>('chapter-card-kicker')
  private readonly chapterTitle = element<HTMLElement>('chapter-card-title')
  private readonly chapterSubtitle = element<HTMLElement>('chapter-card-subtitle')
  private readonly quoteCard = element<HTMLElement>('quote-card')
  private readonly quoteOriginal = element<HTMLElement>('quote-original')
  private readonly quoteTranslation = element<HTMLElement>('quote-translation')
  private readonly subtitles = element<HTMLElement>('subtitles')
  private readonly credits = element<HTMLElement>('credits')
  private readonly replayButton = element<HTMLButtonElement>('replay-button')
  private readonly creditsClose = element<HTMLButtonElement>('credits-close')
  private readonly speedNote = element<HTMLElement>('speed-note')

  private subtitlesEnabled = true
  private voiceEnabled = false
  private muted = false
  private speed = 1
  private quality: Quality = 'high'
  private playing = false
  private dragging = false
  private hideTimer = 0
  private chapterTimer = 0
  private started = false
  private activeCueId = ''
  private activeQuoteId = ''

  constructor(callbacks: PlayerCallbacks) {
    this.callbacks = callbacks
    this.attach()
    this.totalTime.textContent = formatTime(DURATION)
    this.seek.max = String(DURATION)
    this.setSubtitles(true)
    this.setPlaying(false)
    this.setVoiceAvailable(false)
  }

  private attach(): void {
    this.startButton.addEventListener('click', () => {
      if (this.started) return
      this.started = true
      this.startVoice.disabled = true
      this.startButton.disabled = true
      this.startScreen.classList.add('is-leaving')
      this.showLoading(true)
      void this.callbacks.onStart(this.startVoice.checked)
    })
    this.playButton.addEventListener('click', () => this.callbacks.onPlayToggle())
    this.restartButton.addEventListener('click', () => this.callbacks.onRestart())
    this.replayButton.addEventListener('click', () => this.callbacks.onReplay())
    this.seek.addEventListener('pointerdown', () => {
      this.dragging = true
    })
    this.seek.addEventListener('pointerup', () => {
      this.dragging = false
    })
    this.seek.addEventListener('input', () => {
      const time = Number(this.seek.value)
      this.currentTime.textContent = formatTime(time)
      this.seek.style.setProperty('--seek-progress', `${(time / DURATION) * 100}%`)
      this.callbacks.onSeek(time)
    })
    this.chapterSelect.addEventListener('change', () => {
      this.callbacks.onChapter(this.chapterSelect.value)
      this.chapterSelect.blur()
    })
    this.subtitlesButton.addEventListener('click', () => {
      this.setSubtitles(!this.subtitlesEnabled)
      this.callbacks.onSubtitles(this.subtitlesEnabled)
    })
    this.voiceButton.addEventListener('click', () => {
      if (this.voiceButton.disabled) return
      this.voiceEnabled = !this.voiceEnabled
      this.setVoice(this.voiceEnabled)
      this.callbacks.onVoice(this.voiceEnabled)
    })
    this.muteButton.addEventListener('click', () => {
      this.muted = !this.muted
      this.setMuted(this.muted)
      this.callbacks.onMute(this.muted)
    })
    this.speedSelect.addEventListener('change', () => {
      this.speed = Number(this.speedSelect.value) || 1
      this.speedNote.hidden = this.speed === 1
      this.callbacks.onSpeed(this.speed)
    })
    this.qualitySelect.addEventListener('change', () => {
      this.quality = this.qualitySelect.value === 'low' ? 'low' : 'high'
      this.callbacks.onQuality(this.quality)
    })
    this.infoButton.addEventListener('click', () => this.toggleInfo())
    this.infoClose.addEventListener('click', () => this.hideInfo())
    this.creditsButton.addEventListener('click', () => {
      this.hideInfo()
      this.callbacks.onCredits()
    })
    this.creditsClose.addEventListener('click', () => this.callbacks.onCreditsClose())
    this.downloadButton.addEventListener('click', () => downloadSrt(CUES))
    this.fullscreenButton.addEventListener('click', () => this.callbacks.onFullscreen())
    window.addEventListener('keydown', (event) => this.onKeyDown(event))
    window.addEventListener('pointermove', () => this.wakeControls())
    window.addEventListener('touchstart', () => this.wakeControls(), { passive: true })
    this.controls.addEventListener('pointerenter', () => this.wakeControls())
  }

  private onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
    const key = event.key.toLowerCase()
    if (key === ' ' || key === 'k') {
      event.preventDefault()
      this.callbacks.onPlayToggle()
    } else if (key === 'arrowleft') {
      event.preventDefault()
      this.callbacks.onSeek(Math.max(0, Number(this.seek.value) - 10))
    } else if (key === 'arrowright') {
      event.preventDefault()
      this.callbacks.onSeek(Math.min(DURATION, Number(this.seek.value) + 10))
    } else if (key === 'r') {
      this.callbacks.onRestart()
    } else if (key === 's') {
      this.setSubtitles(!this.subtitlesEnabled)
      this.callbacks.onSubtitles(this.subtitlesEnabled)
    } else if (key === 'v') {
      if (!this.voiceButton.disabled) {
        this.voiceEnabled = !this.voiceEnabled
        this.setVoice(this.voiceEnabled)
        this.callbacks.onVoice(this.voiceEnabled)
      }
    } else if (key === 'm') {
      this.muted = !this.muted
      this.setMuted(this.muted)
      this.callbacks.onMute(this.muted)
    } else if (key === 'f') {
      this.callbacks.onFullscreen()
    } else if (key === 'i') {
      this.toggleInfo()
    } else if (key === 'escape') {
      this.hideInfo()
    }
    this.wakeControls()
  }

  setChapters(chapters: FilmChapter[]): void {
    this.chapterSelect.innerHTML = ''
    chapters.forEach((chapter, index) => {
      const option = document.createElement('option')
      option.value = chapter.id
      option.textContent = `${String(index + 1).padStart(2, '0')} · ${chapter.title}`
      this.chapterSelect.append(option)
    })
  }

  setVoiceAvailable(available: boolean): void {
    this.voiceButton.disabled = !available
    this.startVoice.disabled = !available
    this.voiceButton.title = available ? 'Attiva o disattiva le voci sintetiche' : 'Sintesi vocale non disponibile'
    if (!available) {
      this.voiceEnabled = false
      this.setVoice(false)
    }
  }

  showLoading(active: boolean, progress = 0.2): void {
    this.loading.hidden = !active
    this.loadingBar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`
    if (!active) this.loading.hidden = true
  }

  hideStart(): void {
    this.startScreen.hidden = true
    this.startScreen.classList.remove('is-leaving')
    this.controls.hidden = false
    this.wakeControls()
  }

  showError(message: string): void {
    this.loading.hidden = true
    this.startScreen.hidden = true
    this.controls.hidden = true
    this.errorMessage.textContent = message
    this.errorScreen.hidden = false
  }

  setPlaying(playing: boolean): void {
    this.playing = playing
    this.playLabel.textContent = playing ? 'Pausa' : 'Play'
    this.playButton.setAttribute('aria-label', playing ? 'Pausa' : 'Play')
    if (playing) this.scheduleHide()
    else this.wakeControls()
  }

  setTime(time: number): void {
    if (!this.dragging) this.seek.value = String(time)
    this.currentTime.textContent = formatTime(time)
    this.seek.style.setProperty('--seek-progress', `${(time / DURATION) * 100}%`)
  }

  setChapter(chapter: FilmChapter, index: number): void {
    this.chapterSelect.value = chapter.id
    this.chapterKicker.textContent = `Capitolo ${String(index + 1).padStart(2, '0')}`
    this.chapterTitle.textContent = chapter.title
    this.chapterSubtitle.textContent = chapter.subtitle
    this.chapterCard.classList.add('is-visible')
    window.clearTimeout(this.chapterTimer)
    this.chapterTimer = window.setTimeout(() => this.chapterCard.classList.remove('is-visible'), 3600)
  }

  setCue(cue: SubtitleCue | null): void {
    if (cue?.kind === 'quote') {
      const quoteId = cue.id
      if (quoteId !== this.activeQuoteId) {
        this.activeQuoteId = quoteId
        this.quoteOriginal.textContent = cue.text
        this.quoteTranslation.textContent = cue.translation ?? ''
        this.quoteCard.hidden = false
      }
      this.subtitles.textContent = ''
      this.subtitles.hidden = true
      this.activeCueId = cue.id
      return
    }
    if (this.activeQuoteId) {
      this.activeQuoteId = ''
      this.quoteCard.hidden = true
    }
    if (!cue) {
      this.activeCueId = ''
      this.subtitles.textContent = ''
      this.subtitles.hidden = true
      return
    }
    if (cue.id !== this.activeCueId) {
      this.activeCueId = cue.id
      this.subtitles.textContent = cue.text
      this.subtitles.classList.toggle('is-long', cue.text.length > 112)
    }
    this.subtitles.hidden = !this.subtitlesEnabled
  }

  setSubtitles(enabled: boolean): void {
    this.subtitlesEnabled = enabled
    this.subtitlesButton.classList.toggle('is-active', enabled)
    this.subtitlesButton.setAttribute('aria-pressed', String(enabled))
    if (!enabled) this.subtitles.hidden = true
    else if (this.activeCueId) this.subtitles.hidden = false
  }

  setVoice(enabled: boolean): void {
    this.voiceEnabled = enabled
    this.voiceButton.classList.toggle('is-active', enabled)
    this.voiceButton.setAttribute('aria-pressed', String(enabled))
    this.voiceButton.textContent = enabled ? 'Voci on' : 'Voci'
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.muteButton.classList.toggle('is-active', muted)
    this.muteButton.setAttribute('aria-pressed', String(muted))
    this.muteButton.textContent = muted ? 'Muto' : 'Audio'
  }

  showCredits(): void {
    this.chapterCard.classList.remove('is-visible')
    this.credits.hidden = false
    this.credits.classList.add('is-visible')
    this.controls.classList.add('is-dimmed')
  }

  hideCredits(): void {
    this.credits.classList.remove('is-visible')
    this.credits.hidden = true
    this.controls.classList.remove('is-dimmed')
  }

  isCreditsOpen(): boolean {
    return !this.credits.hidden
  }

  toggleInfo(): void {
    this.infoPanel.hidden = !this.infoPanel.hidden
  }

  hideInfo(): void {
    this.infoPanel.hidden = true
  }

  private wakeControls(): void {
    this.controls.classList.remove('is-hidden')
    if (this.infoPanel.hidden) this.scheduleHide()
  }

  private scheduleHide(): void {
    window.clearTimeout(this.hideTimer)
    if (!this.playing || this.infoPanel.hidden === false) return
    this.hideTimer = window.setTimeout(() => this.controls.classList.add('is-hidden'), 3400)
  }

  getSpeed(): number {
    return this.speed
  }

  getQuality(): Quality {
    return this.quality
  }
}
