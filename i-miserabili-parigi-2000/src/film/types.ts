export type CueKind = 'narration' | 'dialogue' | 'quote'

export interface FilmChapter {
  id: string
  title: string
  subtitle: string
  duration: number
  start: number
  end: number
  episodes: number[]
  scene: string
}

export interface SubtitleCue {
  id: string
  chapterId: string
  chapterTitle: string
  scene: string
  start: number
  end: number
  localStart: number
  localEnd: number
  speaker: string
  text: string
  kind: CueKind
  translation?: string
  attribution?: string
}

export interface FilmMeta {
  title: string
  subtitle: string
  language: string
  duration: number
  chapterCount: number
  episodeCount: number
  quotes: number
  generatedAt: string
}

export interface FilmData {
  film: FilmMeta
  chapters: FilmChapter[]
  cues: SubtitleCue[]
}
