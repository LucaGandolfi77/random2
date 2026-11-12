import type { SubtitleCue } from '../film/types'

interface ChapterMusic {
  root: number
  pattern: number[]
  filter: number
  q: number
  air: number
  rumble: number
}

const CHAPTER_MUSIC: Record<string, ChapterMusic> = {
  ouverture: { root: 110, pattern: [0, 7, 10, 12, 3, 10], filter: 820, q: 0.8, air: 0.08, rumble: 0.02 },
  release: { root: 98, pattern: [0, 3, 7, 12, 10, 7], filter: 640, q: 1, air: 0.045, rumble: 0.035 },
  doors: { root: 87.31, pattern: [0, 3, 5, 7, 10, 7], filter: 560, q: 1.3, air: 0.075, rumble: 0.025 },
  bishop: { root: 130.81, pattern: [0, 4, 7, 11, 14, 7], filter: 1200, q: 0.65, air: 0.018, rumble: 0.012 },
  madeleine: { root: 146.83, pattern: [0, 5, 7, 12, 9, 5], filter: 920, q: 0.8, air: 0.02, rumble: 0.018 },
  fantine: { root: 116.54, pattern: [0, 3, 7, 10, 7, 3], filter: 720, q: 0.9, air: 0.06, rumble: 0.018 },
  champmathieu: { root: 92.5, pattern: [0, 1, 5, 7, 1, 0], filter: 500, q: 1.2, air: 0.012, rumble: 0.02 },
  'fantine-death': { root: 87.31, pattern: [0, 3, 7, 10, 14, 10], filter: 680, q: 0.8, air: 0.02, rumble: 0.012 },
  montfermeil: { root: 130.81, pattern: [0, 7, 12, 15, 12, 7], filter: 1450, q: 0.7, air: 0.055, rumble: 0.012 },
  paris: { root: 146.83, pattern: [0, 4, 7, 11, 9, 7], filter: 1600, q: 0.65, air: 0.015, rumble: 0.01 },
  barricade: { root: 98, pattern: [0, 3, 5, 7, 10, 5], filter: 480, q: 1.1, air: 0.04, rumble: 0.03 },
  sewers: { root: 73.42, pattern: [0, 1, 7, 8, 3, 1], filter: 340, q: 1.4, air: 0.035, rumble: 0.04 },
  candlesticks: { root: 130.81, pattern: [0, 4, 7, 12, 16, 12], filter: 1700, q: 0.6, air: 0.008, rumble: 0.006 },
}

const SPEAKER_PITCH: Record<string, number> = {
  Narratore: 0.92,
  Valjean: 0.94,
  Myriel: 0.88,
  Fantine: 1.08,
  Cosette: 1.12,
  Javert: 0.86,
  Marius: 1,
  Enjolras: 0.98,
  Thénardier: 1.04,
  'Madame Thénardier': 1.02,
}

export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private music: GainNode | null = null
  private padA: OscillatorNode | null = null
  private padB: OscillatorNode | null = null
  private noise: AudioBufferSourceNode | null = null
  private noiseFilter: BiquadFilterNode | null = null
  private rumble: OscillatorNode | null = null
  private rumbleGain: GainNode | null = null
  private phraseTimer: number | null = null
  private chapterId = 'ouverture'
  private muted = false
  private paused = true
  private voiceEnabled = false
  private started = false
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private lastSpeechId = ''
  readonly speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window

  get isStarted(): boolean {
    return this.started
  }

  async init(): Promise<void> {
    if (this.started) {
      if (this.context?.state === 'suspended') await this.context.resume()
      return
    }
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    this.context = context
    const master = context.createGain()
    master.gain.value = 0.42
    master.connect(context.destination)
    this.master = master

    const music = context.createGain()
    music.gain.value = 1
    music.connect(master)
    this.music = music

    const padFilter = context.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 900
    padFilter.Q.value = 0.7
    padFilter.connect(music)
    const padGain = context.createGain()
    padGain.gain.value = 0.035
    padGain.connect(padFilter)

    const padA = context.createOscillator()
    padA.type = 'sine'
    padA.frequency.value = 110
    padA.connect(padGain)
    const padB = context.createOscillator()
    padB.type = 'triangle'
    padB.frequency.value = 164.81
    const padBGain = context.createGain()
    padBGain.gain.value = 0.45
    padB.connect(padBGain).connect(padGain)
    padA.start()
    padB.start()
    this.padA = padA
    this.padB = padB

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const channel = noiseBuffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < channel.length; i += 1) {
      const white = Math.random() * 2 - 1
      last = last * 0.97 + white * 0.03
      channel[i] = last
    }
    const noise = context.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true
    const noiseFilter = context.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 700
    noiseFilter.Q.value = 0.8
    const noiseGain = context.createGain()
    noiseGain.gain.value = 0.18
    noise.connect(noiseFilter).connect(noiseGain).connect(master)
    noise.start()
    this.noise = noise
    this.noiseFilter = noiseFilter

    const rumble = context.createOscillator()
    rumble.type = 'sine'
    rumble.frequency.value = 48
    const rumbleGain = context.createGain()
    rumbleGain.gain.value = 0.02
    rumble.connect(rumbleGain).connect(master)
    rumble.start()
    this.rumble = rumble
    this.rumbleGain = rumbleGain

    this.started = true
    this.applyChapter()
    this.startPhraseTimer()
    if (this.context.state === 'suspended') await this.context.resume()
  }

  setChapter(chapterId: string): void {
    this.chapterId = chapterId
    this.applyChapter()
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    if (!this.context || !this.master) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.linearRampToValueAtTime(paused ? 0.0001 : this.muted ? 0.0001 : 0.42, now + 0.35)
    if (paused) {
      this.stopPhraseTimer()
      this.cancelVoice()
      if (this.context.state === 'running') void this.context.suspend()
    } else {
      if (this.context.state === 'suspended') void this.context.resume()
      this.startPhraseTimer()
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (!this.context || !this.master) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.42, now + 0.25)
    if (muted) this.cancelVoice()
  }

  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled && this.speechAvailable
    if (!this.voiceEnabled) this.cancelVoice()
  }

  getVoiceEnabled(): boolean {
    return this.voiceEnabled
  }

  onCue(cue: SubtitleCue | null): void {
    if (!cue || !this.voiceEnabled || !this.speechAvailable || this.paused || this.muted) return
    if (cue.id === this.lastSpeechId) return
    this.lastSpeechId = cue.id
    const text = cue.translation ?? cue.text
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = cue.kind === 'quote' ? 0.84 : cue.speaker === 'Narratore' ? 0.91 : 1.01
    utterance.pitch = SPEAKER_PITCH[cue.speaker] ?? 0.96
    utterance.volume = 0.9
    const voices = window.speechSynthesis.getVoices()
    const italian = voices.find((voice) => voice.lang.toLowerCase().startsWith('it'))
    if (italian) utterance.voice = italian
    if (this.music && this.context) {
      const now = this.context.currentTime
      this.music.gain.cancelScheduledValues(now)
      this.music.gain.linearRampToValueAtTime(0.2, now + 0.2)
    }
    utterance.onend = () => {
      this.currentUtterance = null
      if (this.context && this.music) {
        const now = this.context.currentTime
        this.music.gain.cancelScheduledValues(now)
        this.music.gain.linearRampToValueAtTime(1, now + 0.8)
      }
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    this.currentUtterance = utterance
  }

  cancelVoice(): void {
    this.lastSpeechId = ''
    this.currentUtterance = null
    if (this.speechAvailable) window.speechSynthesis.cancel()
    if (this.music && this.context) {
      const now = this.context.currentTime
      this.music.gain.cancelScheduledValues(now)
      this.music.gain.linearRampToValueAtTime(1, now + 0.4)
    }
  }

  setSpeed(speed: number): void {
    if (!this.context) return
    const rate = Math.max(0.5, Math.min(2, speed))
    if (this.rumble) this.rumble.frequency.setTargetAtTime(48 * rate, this.context.currentTime, 0.2)
  }

  private applyChapter(): void {
    if (!this.context) return
    const music = CHAPTER_MUSIC[this.chapterId] ?? CHAPTER_MUSIC.ouverture
    const now = this.context.currentTime
    if (this.padA) this.padA.frequency.setTargetAtTime(music.root, now, 0.9)
    if (this.padB) this.padB.frequency.setTargetAtTime(music.root * Math.pow(2, 7 / 12), now, 0.9)
    if (this.noiseFilter) {
      this.noiseFilter.frequency.setTargetAtTime(music.filter, now, 0.8)
      this.noiseFilter.Q.setTargetAtTime(music.q, now, 0.8)
    }
    if (this.rumbleGain) this.rumbleGain.gain.setTargetAtTime(music.rumble, now, 0.8)
  }

  private startPhraseTimer(): void {
    if (this.phraseTimer !== null || !this.context) return
    this.phraseTimer = window.setInterval(() => this.playPhrase(), 5200)
  }

  private stopPhraseTimer(): void {
    if (this.phraseTimer === null) return
    window.clearInterval(this.phraseTimer)
    this.phraseTimer = null
  }

  private playPhrase(): void {
    if (!this.context || !this.music || this.paused || this.muted) return
    const music = CHAPTER_MUSIC[this.chapterId] ?? CHAPTER_MUSIC.ouverture
    const context = this.context
    const start = context.currentTime + 0.05
    const count = this.chapterId === 'barricade' ? 5 : 4
    for (let i = 0; i < count; i += 1) {
      const semitone = music.pattern[(i + Math.floor(start / 5.2)) % music.pattern.length]
      const frequency = music.root * 2 * Math.pow(2, semitone / 12)
      const noteStart = start + i * 0.58
      const duration = i === count - 1 ? 2.2 : 1.4
      const velocity = (i === 0 ? 0.09 : 0.055) * (this.chapterId === 'candlesticks' ? 1.15 : 1)
      const oscillator = context.createOscillator()
      oscillator.type = i % 2 === 0 ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.exponentialRampToValueAtTime(velocity, noteStart + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration)
      oscillator.connect(gain).connect(this.music)
      oscillator.start(noteStart)
      oscillator.stop(noteStart + duration + 0.05)
    }
  }
}
