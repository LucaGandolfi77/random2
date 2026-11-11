import type { CompiledFilm, LineCue } from '../data/types';
import { SPEAKER_LABELS } from '../screenplay/speakers';

export const MAX_LINE_CHARS = 46;

export function findActiveLine(film: CompiledFilm, t: number): LineCue | null {
  const lines = film.lines;
  let lo = 0;
  let hi = lines.length - 1;
  let candidate: LineCue | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const line = lines[mid];
    if (line.start <= t) {
      candidate = line;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (candidate && t < candidate.end) return candidate;
  return null;
}

export function wrapSubtitle(text: string, maxChars = MAX_LINE_CHARS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return [];
  if (clean.length <= maxChars) return [clean];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxChars));
      current = word.slice(maxChars);
    }
  }
  if (current.length > 0) lines.push(current);

  if (lines.length <= 2) return lines;

  const merged: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const a = lines[i];
    const b = lines[i + 1];
    if (b && `${a} ${b}`.length <= maxChars + 8) {
      merged.push(`${a} ${b}`);
    } else {
      merged.push(a);
      if (b) merged.push(b);
    }
  }
  if (merged.length <= 2) return merged;

  const total = merged.join(' ');
  const cut = findSplit(clean, Math.ceil(total.length / 2), maxChars);
  return [clean.slice(0, cut).trim(), clean.slice(cut).trim()].filter((l) => l.length > 0);
}

function findSplit(text: string, preferred: number, maxChars: number): number {
  const min = Math.max(0, text.length - maxChars - 1);
  let best = preferred;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== ' ') continue;
    if (i < min) continue;
    const before = i;
    const after = text.length - i - 1;
    if (before > maxChars || after > maxChars) continue;
    const distance = Math.abs(i - preferred);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

export function srtTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(r, 3)}`;
}

function pad(value: number, width: number): string {
  return value.toString().padStart(width, '0');
}

export function buildSrt(film: CompiledFilm, withSpeakers = false): string {
  const blocks = film.lines.map((line, index) => {
    const text = wrapSubtitle(line.text).join('\n');
    const body = withSpeakers ? `${SPEAKER_LABELS[line.speaker] ?? line.speaker}: ${text}` : text;
    return `${index + 1}\n${srtTimestamp(line.start)} --> ${srtTimestamp(line.end)}\n${body}\n`;
  });
  return blocks.join('\n');
}
