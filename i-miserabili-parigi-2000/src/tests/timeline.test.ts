import { describe, expect, it } from 'vitest'
import {
  CHAPTERS,
  CUES,
  DURATION,
  FILM,
  clampTime,
  formatTime,
  formatTimecode,
  getActiveCue,
  getChapterAt,
  getChapterIndexAt,
  getCuesForChapter,
} from '../film/timeline'
import { stageBuilderIds } from '../three/scenes'

describe('timeline del film', () => {
  it('dura esattamente 22 minuti', () => {
    expect(DURATION).toBe(1320)
    expect(formatTime(DURATION)).toBe('22:00')
    expect(formatTimecode(DURATION)).toBe('00:22:00')
  })

  it('ha 13 capitoli contigui', () => {
    expect(CHAPTERS).toHaveLength(13)
    expect(CHAPTERS[0].start).toBe(0)
    expect(CHAPTERS.at(-1)?.end).toBe(DURATION)
    for (let i = 1; i < CHAPTERS.length; i += 1) {
      expect(CHAPTERS[i].start).toBeCloseTo(CHAPTERS[i - 1].end, 6)
    }
  })

  it('copre tutti i 22 episodi', () => {
    const episodes = new Set(CHAPTERS.flatMap((chapter) => chapter.episodes))
    expect(episodes.size).toBe(22)
    for (let episode = 1; episode <= 22; episode += 1) {
      expect(episodes.has(episode)).toBe(true)
    }
    expect(FILM.episodeCount).toBe(22)
  })

  it('individua il capitolo e il cue corretti', () => {
    expect(getChapterAt(0).id).toBe('ouverture')
    expect(getChapterAt(31).id).toBe('release')
    expect(getChapterIndexAt(1319)).toBe(12)
    const cue = CUES.find((candidate) => candidate.id === 'cue-002')
    expect(cue).toBeDefined()
    if (!cue) return
    expect(getActiveCue((cue.start + cue.end) / 2)?.id).toBe(cue.id)
    expect(getActiveCue(cue.end + 0.5)?.id).not.toBe(cue.id)
  })

  it('clampa i tempi fuori intervallo', () => {
    expect(clampTime(-10)).toBe(0)
    expect(clampTime(9999)).toBe(DURATION)
    expect(clampTime(Number.NaN)).toBe(0)
  })

  it('assegna cue a ogni capitolo', () => {
    for (const chapter of CHAPTERS) {
      expect(getCuesForChapter(chapter.id).length).toBeGreaterThan(0)
    }
  })

  it('ha un regista 3D per ogni capitolo', () => {
    const ids = stageBuilderIds()
    expect(ids).toHaveLength(CHAPTERS.length)
    for (const chapter of CHAPTERS) expect(ids).toContain(chapter.id)
  })
})
