import raw from '../data/film.json'
import type { FilmChapter, FilmData, SubtitleCue } from './types'

const data = raw as unknown as FilmData

export const FILM = data.film
export const CHAPTERS = data.chapters
export const CUES = data.cues
export const DURATION = data.film.duration

const chapterById = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter]))

export function clampTime(time: number): number {
  if (!Number.isFinite(time)) return 0
  return Math.max(0, Math.min(DURATION, time))
}

export function getChapterIndexAt(time: number): number {
  const t = clampTime(time)
  for (let index = CHAPTERS.length - 1; index >= 0; index -= 1) {
    if (t >= CHAPTERS[index].start) return index
  }
  return 0
}

export function getChapterAt(time: number): FilmChapter {
  return CHAPTERS[getChapterIndexAt(time)]
}

export function getChapterById(id: string): FilmChapter | undefined {
  return chapterById.get(id)
}

export function getChapterLocalTime(chapter: FilmChapter, time: number): number {
  return Math.max(0, Math.min(chapter.duration, clampTime(time) - chapter.start))
}

export function getActiveCue(time: number): SubtitleCue | null {
  const t = clampTime(time)
  let low = 0
  let high = CUES.length - 1
  let found = -1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (CUES[middle].start <= t) {
      found = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  if (found < 0) return null
  const cue = CUES[found]
  return t < cue.end ? cue : null
}

export function getCuesForChapter(chapterId: string): SubtitleCue[] {
  return CUES.filter((cue) => cue.chapterId === chapterId)
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function getProgress(time: number): number {
  return DURATION <= 0 ? 0 : clampTime(time) / DURATION
}

export function getChapterProgress(chapter: FilmChapter, time: number): number {
  return chapter.duration <= 0 ? 0 : getChapterLocalTime(chapter, time) / chapter.duration
}
