import type { Caption } from '../data/types';

export function formatSrtTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    secs,
  ).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export interface SrtOptions {
  includeSpeaker?: boolean;
}

export function captionsToSrt(captions: Caption[], options: SrtOptions = {}): string {
  const includeSpeaker = options.includeSpeaker ?? true;

  return `${captions
    .map((caption, index) => {
      const text = includeSpeaker ? `${caption.speaker}: ${caption.text}` : caption.text;
      return `${index + 1}\n${formatSrtTime(caption.start)} --> ${formatSrtTime(caption.end)}\n${text}\n`;
    })
    .join('\n')}\n`;
}
