import type { SubtitleCue } from '../data/types';
import { assetUrl } from '../data/media';

export interface VoiceManifest {
  language: string;
  lines: Record<string, string>;
}

export type VoiceAttach = (audio: HTMLAudioElement) => void;

/**
 * Optional recorded voice track. The distributed film ships with an empty
 * manifest and uses written dialogue/subtitles. Add MP3 files and update
 * public/assets/audio/voices/manifest.json to activate it.
 */
export class VoiceManager {
  private manifest: VoiceManifest = { language: 'it', lines: {} };
  private active: HTMLAudioElement | null = null;
  private activeId: string | null = null;
  private enabled = true;
  private loaded = false;

  constructor(private readonly attach?: VoiceAttach) {}

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const response = await fetch(assetUrl('assets/audio/voices/manifest.json'), { cache: 'no-cache' });
      if (!response.ok) return;
      const data = (await response.json()) as Partial<VoiceManifest>;
      if (data && typeof data.lines === 'object' && data.lines) {
        this.manifest = {
          language: typeof data.language === 'string' ? data.language : 'it',
          lines: data.lines
        };
      }
    } catch {
      // Voice track is optional: the subtitled film remains complete.
    }
  }

  get available(): boolean {
    return Object.keys(this.manifest.lines).length > 0;
  }

  get language(): string {
    return this.manifest.language;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  update(cue: SubtitleCue | null, playing: boolean): void {
    if (!this.available || !this.enabled) return;
    if (!cue || !playing) {
      this.pause();
      return;
    }
    if (cue.id !== this.activeId) {
      this.stop();
      const file = this.manifest.lines[cue.id];
      if (!file) {
        this.activeId = cue.id;
        return;
      }
      const audio = new Audio(assetUrl(file));
      audio.preload = 'auto';
      audio.setAttribute('playsinline', '');
      this.attach?.(audio);
      this.active = audio;
      this.activeId = cue.id;
      void audio.play().catch(() => {
        // If the browser blocks the element, the subtitle still carries the line.
      });
      return;
    }
    if (this.active && this.active.paused) {
      void this.active.play().catch(() => undefined);
    }
  }

  pause(): void {
    this.active?.pause();
  }

  stop(): void {
    if (this.active) {
      this.active.pause();
      try {
        this.active.currentTime = 0;
      } catch {
        // Ignore.
      }
      this.active = null;
    }
    this.activeId = null;
  }

  destroy(): void {
    this.stop();
  }
}
