import { describe, expect, it } from 'vitest'
import { CHAPTERS, CUES } from '../film/timeline'
import { speakerToActorKey } from '../film/speakers'

const QUOTES = [
  "Il n'y a ni mauvaises herbes ni mauvais hommes. Il n'y a que de mauvais cultivateurs.",
  "Cette porte ne demande pas à celui qui entre s'il a un nom, mais s'il a une douleur.",
  "N'oubliez pas, n'oubliez jamais que vous m'avez promis d'employer cet argent à devenir honnête homme.",
  "Jean Valjean, mon frère, vous n'appartenez plus au mal, mais au bien.",
  'La misère offre, la société accepte.',
  "Tant qu'il y aura sur la terre ignorance et misère, des livres de la nature de celui-ci pourront ne pas être inutiles.",
]

describe('sottotitoli', () => {
  it('contiene le sei citazioni esatte di Hugo', () => {
    const quotes = CUES.filter((cue) => cue.kind === 'quote')
    expect(quotes).toHaveLength(6)
    for (const quote of quotes) {
      expect(QUOTES).toContain(quote.text)
      expect(quote.translation?.length).toBeGreaterThan(10)
      expect(quote.attribution).toContain('Victor Hugo')
    }
  })

  it('non sovrappone i cue e li tiene dentro i capitoli', () => {
    const chapters = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter]))
    for (let i = 0; i < CUES.length; i += 1) {
      const cue = CUES[i]
      expect(cue.end).toBeGreaterThan(cue.start)
      const chapter = chapters.get(cue.chapterId)
      expect(chapter).toBeDefined()
      if (!chapter) continue
      expect(cue.start).toBeGreaterThanOrEqual(chapter.start)
      expect(cue.end).toBeLessThanOrEqual(chapter.end)
      if (i > 0) expect(cue.start).toBeGreaterThanOrEqual(CUES[i - 1].end - 0.001)
    }
  })

  it('non contiene anacronismi lessicali', () => {
    const forbidden = ['euro', 'smartphone', 'social network', 'contactless', 'tiktok', 'instagram']
    for (const cue of CUES) {
      const text = `${cue.text} ${cue.translation ?? ''}`.toLowerCase()
      for (const word of forbidden) expect(text).not.toContain(word)
    }
  })

  it('mappa i parlanti sui personaggi 3D', () => {
    expect(speakerToActorKey('Valjean')).toBe('valjean')
    expect(speakerToActorKey('Madeleine')).toBe('valjean')
    expect(speakerToActorKey('Javert')).toBe('javert')
    expect(speakerToActorKey('Victor Hugo')).toBeNull()
    expect(speakerToActorKey('Narratore')).toBeNull()
  })

  it('usa testi adatti a un massimo di due righe', () => {
    for (const cue of CUES) {
      expect(cue.text.split('\n')).toHaveLength(1)
      expect(cue.text.length).toBeLessThanOrEqual(170)
      if (cue.translation) expect(cue.translation.length).toBeLessThanOrEqual(190)
    }
  })
})
