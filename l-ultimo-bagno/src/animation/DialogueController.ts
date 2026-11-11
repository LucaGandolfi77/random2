import type { CompiledDialogue } from '../data/types';
import type { AudioManager } from '../audio/AudioManager';

export class DialogueController {
  private readonly audio: AudioManager;
  private lastLineId: string | null = null;
  private voicesEnabled = true;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

  setVoicesEnabled(enabled: boolean): void {
    this.voicesEnabled = enabled;
    if (!enabled) this.audio.cancelVoice();
  }

  update(time: number, activeLine: CompiledDialogue | null, playing: boolean): void {
    if (!this.voicesEnabled) {
      this.lastLineId = activeLine?.id ?? null;
      return;
    }

    if (!playing) {
      return;
    }

    if (!activeLine) {
      this.lastLineId = null;
      return;
    }

    if (this.lastLineId !== activeLine.id) {
      this.lastLineId = activeLine.id;
      this.audio.speak(activeLine);
    }

    void time;
  }

  seek(): void {
    this.lastLineId = null;
    this.audio.cancelVoice();
  }
}
