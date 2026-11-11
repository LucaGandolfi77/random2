import type { SfxName } from '../data/types';
import { playNoise, playTone } from './Synth';

interface ActiveNode {
  stop: (time?: number) => void;
  onended: ((event: Event) => void) | null;
}

export class SfxPlayer {
  private readonly context: AudioContext;
  private readonly destination: AudioNode;
  private readonly noise: AudioBuffer;
  private readonly active = new Set<AudioScheduledSourceNode>();

  constructor(context: AudioContext, destination: AudioNode, noise: AudioBuffer) {
    this.context = context;
    this.destination = destination;
    this.noise = noise;
  }

  play(name: SfxName, gain: number, when = this.context.currentTime): void {
    const g = Math.max(0, gain);
    if (g <= 0.0001) return;
    const time = Math.max(when, this.context.currentTime);

    switch (name) {
      case 'footstep': {
        const sourceA = playTone(this.context, this.destination, {
          time,
          frequency: 72 + Math.random() * 10,
          duration: 0.07,
          gain: 0.03 * g,
          type: 'sine',
          attack: 0.004,
          release: 0.03,
          pan: (Math.random() - 0.5) * 0.4,
        });
        const sourceB = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.07,
          gain: 0.018 * g,
          filter: 'lowpass',
          frequency: 460,
          q: 0.7,
          pan: (Math.random() - 0.5) * 0.4,
        });
        this.track(sourceA);
        this.track(sourceB);
        break;
      }
      case 'knock': {
        const sourceA = playTone(this.context, this.destination, {
          time,
          frequency: 128,
          duration: 0.08,
          gain: 0.06 * g,
          type: 'sine',
          attack: 0.003,
          release: 0.05,
        });
        const sourceB = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.055,
          gain: 0.04 * g,
          filter: 'bandpass',
          frequency: 680,
          q: 3,
        });
        this.track(sourceA);
        this.track(sourceB);
        break;
      }
      case 'shutter':
      case 'shutter_metal': {
        const sourceA = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: name === 'shutter' ? 0.28 : 0.15,
          gain: 0.055 * g,
          filter: 'bandpass',
          frequency: name === 'shutter' ? 1800 : 3200,
          q: 2.2,
        });
        const sourceB = playTone(this.context, this.destination, {
          time: time + 0.01,
          frequency: name === 'shutter' ? 190 : 380,
          duration: 0.12,
          gain: 0.02 * g,
          type: 'triangle',
          attack: 0.004,
          release: 0.1,
        });
        this.track(sourceA);
        this.track(sourceB);
        break;
      }
      case 'flash': {
        const sourceA = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.04,
          gain: 0.05 * g,
          filter: 'highpass',
          frequency: 2600,
          q: 0.8,
        });
        const sourceB = playTone(this.context, this.destination, {
          time,
          frequency: 2600,
          duration: 0.09,
          gain: 0.018 * g,
          type: 'sine',
          attack: 0.002,
          release: 0.06,
        });
        this.track(sourceA);
        this.track(sourceB);
        break;
      }
      case 'bell': {
        for (const [index, frequency] of [1760, 2637].entries()) {
          const source = playTone(this.context, this.destination, {
            time: time + index * 0.015,
            frequency,
            duration: 0.55,
            gain: 0.028 * g,
            type: 'sine',
            attack: 0.003,
            release: 0.7,
          });
          this.track(source);
        }
        break;
      }
      case 'bark': {
        const source = this.bark(time, g);
        this.track(source);
        break;
      }
      case 'bleat': {
        const source = this.bleat(time, g);
        this.track(source);
        break;
      }
      case 'clapper': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.05,
          gain: 0.09 * g,
          filter: 'bandpass',
          frequency: 1400,
          q: 5,
        });
        this.track(source);
        break;
      }
      case 'tripod': {
        const sourceA = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.08,
          gain: 0.04 * g,
          filter: 'bandpass',
          frequency: 2400,
          q: 4,
        });
        const sourceB = playTone(this.context, this.destination, {
          time,
          frequency: 780,
          duration: 0.12,
          gain: 0.014 * g,
          type: 'triangle',
          attack: 0.002,
          release: 0.1,
        });
        this.track(sourceA);
        this.track(sourceB);
        break;
      }
      case 'sign_off': {
        const click = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.04,
          gain: 0.05 * g,
          filter: 'highpass',
          frequency: 1200,
          q: 0.6,
        });
        const buzz = this.sweep(time, 118, 48, 0.28, 0.03 * g, 'sawtooth');
        this.track(click);
        this.track(buzz);
        break;
      }
      case 'sign_buzz': {
        const source = playTone(this.context, this.destination, {
          time,
          frequency: 96,
          duration: 0.22,
          gain: 0.018 * g,
          type: 'sawtooth',
          attack: 0.01,
          release: 0.1,
        });
        this.track(source);
        break;
      }
      case 'crowd_murmur': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 2.2,
          gain: 0.024 * g,
          filter: 'bandpass',
          frequency: 520,
          q: 0.8,
          playbackRate: 0.8,
        });
        this.track(source);
        break;
      }
      case 'camera_motor': {
        const source = this.sweep(time, 80, 92, 0.38, 0.012 * g, 'sawtooth');
        this.track(source);
        break;
      }
      case 'whoosh': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.6,
          gain: 0.04 * g,
          filter: 'bandpass',
          frequency: 900,
          q: 1.1,
          playbackRate: 0.9,
        });
        this.track(source);
        break;
      }
      case 'cycle_freewheel': {
        for (let index = 0; index < 8; index += 1) {
          const source = playNoise(this.context, this.destination, this.noise, {
            time: time + index * 0.024,
            duration: 0.012,
            gain: 0.012 * g,
            filter: 'highpass',
            frequency: 2800,
            q: 1,
          });
          this.track(source);
        }
        break;
      }
      case 'sheep_step': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.05,
          gain: 0.014 * g,
          filter: 'lowpass',
          frequency: 360,
          q: 0.8,
        });
        this.track(source);
        break;
      }
      case 'wind_gust': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 2.3,
          gain: 0.028 * g,
          filter: 'bandpass',
          frequency: 420,
          q: 0.5,
          playbackRate: 0.8,
        });
        this.track(source);
        break;
      }
      case 'breath': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.55,
          gain: 0.014 * g,
          filter: 'bandpass',
          frequency: 750,
          q: 0.9,
        });
        this.track(source);
        break;
      }
      case 'sigh': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.7,
          gain: 0.016 * g,
          filter: 'lowpass',
          frequency: 900,
          q: 0.6,
          playbackRate: 0.7,
        });
        this.track(source);
        break;
      }
      case 'applause': {
        for (let index = 0; index < 18; index += 1) {
          const source = playNoise(this.context, this.destination, this.noise, {
            time: time + Math.random() * 1.3,
            duration: 0.03,
            gain: 0.008 * g,
            filter: 'bandpass',
            frequency: 1200 + Math.random() * 1200,
            q: 2,
            pan: (Math.random() - 0.5) * 0.8,
          });
          this.track(source);
        }
        break;
      }
      default:
        break;
    }
  }

  stopAll(): void {
    for (const source of this.active) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.active.clear();
  }

  private track(source: AudioScheduledSourceNode): void {
    this.active.add(source);
    source.addEventListener('ended', () => {
      this.active.delete(source);
    });
  }

  private sweep(
    time: number,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    gainValue: number,
    type: OscillatorType,
  ): OscillatorNode {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      time + duration,
    );
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
    return oscillator;
  }

  private bark(time: number, gainValue: number): OscillatorNode {
    const oscillator = this.context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(240, time);
    oscillator.frequency.exponentialRampToValueAtTime(115, time + 0.12);
    oscillator.frequency.setValueAtTime(220, time + 0.16);
    oscillator.frequency.exponentialRampToValueAtTime(105, time + 0.28);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.value = 1.4;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.05 * gainValue, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    gain.gain.exponentialRampToValueAtTime(0.04 * gainValue, time + 0.17);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.32);
    return oscillator;
  }

  private bleat(time: number, gainValue: number): OscillatorNode {
    const oscillator = this.context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(210, time);
    oscillator.frequency.linearRampToValueAtTime(175, time + 0.42);

    const vibrato = this.context.createOscillator();
    vibrato.frequency.value = 7.5;
    const vibratoGain = this.context.createGain();
    vibratoGain.gain.value = 14;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(oscillator.frequency);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 780;
    filter.Q.value = 1.5;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.03 * gainValue, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.destination);
    oscillator.start(time);
    vibrato.start(time);
    oscillator.stop(time + 0.58);
    vibrato.stop(time + 0.58);
    return oscillator;
  }
}
