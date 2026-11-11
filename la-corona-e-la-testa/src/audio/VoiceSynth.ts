import type { SpeakerId } from '../data/types';

interface VoicePreset {
  rate: number;
  pitch: number;
  volume: number;
}

const PRESETS: Record<SpeakerId, VoicePreset> = {
  DONNINO: { rate: 0.92, pitch: 0.96, volume: 0.95 },
  MASSIMIANO: { rate: 0.78, pitch: 0.58, volume: 0.95 },
  CRISTIANO: { rate: 0.86, pitch: 0.82, volume: 0.9 },
  OSTE: { rate: 0.9, pitch: 0.72, volume: 0.9 },
  CENTURIONE: { rate: 0.88, pitch: 0.62, volume: 0.95 },
  SOLDATO: { rate: 1.0, pitch: 0.76, volume: 0.9 },
  CARNEFICE: { rate: 0.76, pitch: 0.5, volume: 0.95 },
  CONTADINO: { rate: 0.84, pitch: 0.68, volume: 0.9 },
  BAMBINO: { rate: 1.12, pitch: 1.42, volume: 0.9 },
  VEDOVA: { rate: 0.8, pitch: 1.14, volume: 0.9 },
  MAESTRO: { rate: 0.82, pitch: 0.66, volume: 0.95 },
  APPRENDISTA: { rate: 1.04, pitch: 1.08, volume: 0.9 },
  PELLEGRINO: { rate: 0.86, pitch: 0.86, volume: 0.9 },
  CORTIGIANO: { rate: 1.01, pitch: 0.98, volume: 0.9 },
  GUARDIA: { rate: 0.95, pitch: 0.7, volume: 0.95 },
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
