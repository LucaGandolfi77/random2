import type { SubtitleCue } from '../film/types'

export function formatSrtTime(seconds: number): string {
  const safe = Math.max(0, seconds)
  const milliseconds = Math.round(safe * 1000)
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const secs = Math.floor((milliseconds % 60_000) / 1000)
  const rest = milliseconds % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(rest).padStart(3, '0')}`
}

export function cueToSrtBlock(cue: SubtitleCue): string {
  const text = cue.translation ? `${cue.text}\n${cue.translation}` : cue.text
  return `${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${text}`
}

export function cuesToSrt(cues: SubtitleCue[]): string {
  return `${cues
    .map((cue, index) => `${index + 1}\n${cueToSrtBlock(cue)}`)
    .join('\n\n')}\n`
}

export function downloadSrt(cues: SubtitleCue[], filename = 'i-miserabili-parigi-2000.srt'): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([cuesToSrt(cues)], { type: 'application/x-subrip;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
