import { describe, expect, it } from 'vitest'
import { CUES } from '../film/timeline'
import { cueToSrtBlock, cuesToSrt, formatSrtTime } from '../ui/srt'

describe('esportazione SRT', () => {
  it('formatta i tempi SRT', () => {
    expect(formatSrtTime(0)).toBe('00:00:00,000')
    expect(formatSrtTime(65.5)).toBe('00:01:05,500')
    expect(formatSrtTime(1320)).toBe('00:22:00,000')
  })

  it('include originale e traduzione per le citazioni', () => {
    const quote = CUES.find((cue) => cue.id === 'cue-003')
    expect(quote).toBeDefined()
    if (!quote) return
    const block = cueToSrtBlock(quote)
    expect(block).toContain('-->')
    expect(block).toContain(quote.text)
    expect(block).toContain(quote.translation ?? '')
  })

  it('esporta tutti i cue con numerazione progressiva', () => {
    const srt = cuesToSrt(CUES)
    expect(srt.startsWith('1\n')).toBe(true)
    expect(srt).toContain(`\n${CUES.length}\n`)
    expect(srt.trim().endsWith('-->') ).toBe(false)
  })
})
