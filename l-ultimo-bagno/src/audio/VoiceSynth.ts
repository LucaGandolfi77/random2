import type { SpeakerId } from '../data/types';

interface VoicePreset {
  rate: number;
  pitch: number;
  volume: number;
}

const PRESETS: Record<SpeakerId, VoicePreset> = {
  ARTURO: { rate: 1.03, pitch: 0.92, volume: 0.95 },
  GINO: { rate: 0.78, pitch: 0.68, volume: 0.9 },
  BARISTA: { rate: 0.9, pitch: 0.54, volume: 0.95 },
  ISTRUTTRICE: { rate: 0.82, pitch: 1.32, volume: 0.9 },
  PASTORE: { rate: 0.72, pitch: 0.58, volume: 0.95 },
  FOTOGRAFO: { rate: 1.14, pitch: 1.08, volume: 0.9 },
  CICLISTA: { rate: 1.02, pitch: 1.0, volume: 0.9 },
  REGISTA: { rate: 1.12, pitch: 0.88, volume: 0.95 },
};

export class VoiceSynth {
  private enabled = true;
  private volume = 0.8;
  private muted = false;
  private current: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private available = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.refresh();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.refresh());
      window.setTimeout(() => this.refresh(), 500);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.cancel();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancel();
  }

  get isAvailable(): boolean {
    return this.available;
  }

  get status(): string {
    if (!this.available) {
      return 'Sintesi vocale non disponibile: i sottotitoli restano attivi.';
    }
    if (!this.enabled) return 'Voci disattivate.';
    return this.selectedVoice
      ? `Voce: ${this.selectedVoice.name}`
      : 'Voce italiana di sistema.';
  }

  speak(text: string, speaker: SpeakerId): void {
    if (!this.enabled || this.muted || !this.available || typeof window === 'undefined') {
      return;
    }
    if (!('speechSynthesis' in window)) return;
    this.cancel();

    const preset = PRESETS[speaker];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = preset.rate;
    utterance.pitch = preset.pitch;
    utterance.volume = Math.min(1, preset.volume * this.volume);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;

    utterance.onend = () => {
      if (this.current === utterance) this.current = null;
    };
    utterance.onerror = () => {
      if (this.current === utterance) this.current = null;
    };

    this.current = utterance;
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      this.current = null;
    }
  }

  cancel(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Speech synthesis can throw in some embedded browsers.
    }
    this.current = null;
  }

  private refresh(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.available = false;
      return;
    }

    const voices = window.speechSynthesis.getVoices() ?? [];
    this.voices = voices;
    this.available = voices.length > 0;

    const italian = voices.filter((voice) => voice.lang.toLowerCase().startsWith('it'));
    if (italian.length) {
      this.selectedVoice =
        italian.find((voice) => voice.localService) ?? italian[0] ?? null;
    } else {
      this.selectedVoice = null;
    }
  }
}
