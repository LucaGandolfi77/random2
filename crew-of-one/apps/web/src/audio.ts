// Placeholder synth sketches until the human-composed SFX pass.
// These are intentionally simple WebAudio tones, not final audio assets.

const MUTE_KEY = 'crew-of-one:muted';

type AudioContextCtor = typeof AudioContext;

const getContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  const candidate =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return candidate ?? null;
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export class PrototypeAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    const context = this.ensureContext();
    if (context && context.state === 'suspended') {
      void context.resume();
    }
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // Mute is still applied in memory.
    }
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.context.currentTime, 0.01);
    }
    return this.muted;
  }

  rewind(): void {
    this.sweep(760, 240, 0.22, 'sawtooth', 0.05);
    this.haptic(12);
  }

  undo(): void {
    this.sweep(460, 320, 0.1, 'sine', 0.04);
  }

  reset(): void {
    this.sweep(300, 520, 0.14, 'triangle', 0.04);
  }

  plate(): void {
    this.blip(520, 0.06, 'square', 0.035);
    this.blip(780, 0.07, 'square', 0.03, 0.05);
    this.haptic(8);
  }

  lever(): void {
    this.sweep(260, 420, 0.12, 'square', 0.035);
    this.haptic(8);
  }

  door(): void {
    this.sweep(140, 90, 0.16, 'triangle', 0.045);
  }

  gem(): void {
    this.blip(880, 0.08, 'triangle', 0.04);
    this.blip(1320, 0.1, 'triangle', 0.03, 0.07);
    this.haptic(10);
  }

  dash(): void {
    this.sweep(900, 420, 0.1, 'sawtooth', 0.035);
  }

  alarm(): void {
    this.blip(220, 0.1, 'square', 0.05);
    this.blip(180, 0.12, 'square', 0.05, 0.12);
    this.blip(220, 0.14, 'square', 0.05, 0.26);
    this.haptic([38, 34, 38]);
  }

  win(): void {
    [523, 659, 784, 1046].forEach((frequency, index) => {
      this.blip(frequency, 0.12, 'triangle', 0.04, index * 0.09);
    });
    this.haptic([18, 30, 18, 30, 26]);
  }

  preview(): void {
    this.sweep(440, 660, 0.12, 'sine', 0.03);
  }

  previewStop(): void {
    this.sweep(660, 440, 0.1, 'sine', 0.03);
  }

  tick(): void {
    this.blip(1200, 0.03, 'square', 0.012);
  }

  private haptic(pattern: number | number[]): void {
    if (prefersReducedMotion()) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Haptics are optional.
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (this.context) return this.context;
    const Ctor = getContextCtor();
    if (!Ctor) return null;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
    return this.context;
  }

  private blip(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    const context = this.ensureContext();
    if (!context || !this.master) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private sweep(
    from: number,
    to: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    const context = this.ensureContext();
    if (!context || !this.master) return;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}
