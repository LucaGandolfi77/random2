import type { SfxName } from '../data/types';
import { playNoise, playTone } from './Synth';

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
        const thud = playTone(this.context, this.destination, {
          time,
          frequency: 76 + Math.random() * 8,
          duration: 0.08,
          gain: 0.03 * g,
          type: 'sine',
          attack: 0.004,
          release: 0.04,
          pan: (Math.random() - 0.5) * 0.35,
        });
        const scuff = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.07,
          gain: 0.018 * g,
          filter: 'lowpass',
          frequency: 520,
          q: 0.7,
          pan: (Math.random() - 0.5) * 0.35,
        });
        this.track(thud);
        this.track(scuff);
        break;
      }
      case 'chain': {
        for (let index = 0; index < 6; index += 1) {
          const source = playTone(this.context, this.destination, {
            time: time + index * 0.035,
            frequency: 1800 + Math.random() * 1400,
            duration: 0.08,
            gain: 0.016 * g,
            type: 'triangle',
            attack: 0.002,
            release: 0.12,
            pan: (Math.random() - 0.5) * 0.5,
          });
          this.track(source);
        }
        break;
      }
      case 'gate': {
        const creak = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.75,
          gain: 0.04 * g,
          filter: 'bandpass',
          frequency: 320,
          q: 4,
          playbackRate: 0.6,
        });
        const thud = playTone(this.context, this.destination, {
          time: time + 0.55,
          frequency: 62,
          duration: 0.35,
          gain: 0.06 * g,
          type: 'sine',
          attack: 0.005,
          release: 0.4,
        });
        this.track(creak);
        this.track(thud);
        break;
      }
      case 'fire': {
        for (let index = 0; index < 6; index += 1) {
          const source = playNoise(this.context, this.destination, this.noise, {
            time: time + Math.random() * 1.4,
            duration: 0.08 + Math.random() * 0.12,
            gain: 0.012 * g,
            filter: 'highpass',
            frequency: 1400 + Math.random() * 1600,
            q: 0.7,
            pan: (Math.random() - 0.5) * 0.6,
          });
          this.track(source);
        }
        const hum = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 2.2,
          gain: 0.008 * g,
          filter: 'lowpass',
          frequency: 420,
          q: 0.6,
        });
        this.track(hum);
        break;
      }
      case 'rain': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 2.8,
          gain: 0.025 * g,
          filter: 'highpass',
          frequency: 1500,
          q: 0.45,
          playbackRate: 0.9,
        });
        this.track(source);
        break;
      }
      case 'thunder': {
        const rumble = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 1.8,
          gain: 0.04 * g,
          filter: 'lowpass',
          frequency: 160,
          q: 0.8,
          playbackRate: 0.55,
        });
        const crack = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.18,
          gain: 0.025 * g,
          filter: 'bandpass',
          frequency: 900,
          q: 0.7,
        });
        this.track(rumble);
        this.track(crack);
        break;
      }
      case 'horn': {
        const source = playTone(this.context, this.destination, {
          time,
          frequency: 138,
          duration: 0.7,
          gain: 0.028 * g,
          type: 'sawtooth',
          attack: 0.06,
          release: 0.7,
        });
        const second = playTone(this.context, this.destination, {
          time,
          frequency: 207,
          duration: 0.6,
          gain: 0.012 * g,
          type: 'triangle',
          attack: 0.08,
          release: 0.6,
        });
        this.track(source);
        this.track(second);
        break;
      }
      case 'horse': {
        for (let index = 0; index < 4; index += 1) {
          const source = playNoise(this.context, this.destination, this.noise, {
            time: time + index * 0.13,
            duration: 0.05,
            gain: 0.03 * g,
            filter: 'lowpass',
            frequency: 300,
            q: 0.9,
            pan: -0.25,
          });
          this.track(source);
        }
        break;
      }
      case 'axe': {
        const sweep = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.22,
          gain: 0.06 * g,
          filter: 'bandpass',
          frequency: 2200,
          q: 1.6,
          playbackRate: 1.4,
        });
        const hit = playTone(this.context, this.destination, {
          time: time + 0.16,
          frequency: 64,
          duration: 0.4,
          gain: 0.085 * g,
          type: 'sine',
          attack: 0.003,
          release: 0.5,
        });
        this.track(sweep);
        this.track(hit);
        break;
      }
      case 'body_fall': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.28,
          gain: 0.055 * g,
          filter: 'lowpass',
          frequency: 220,
          q: 0.8,
        });
        const thud = playTone(this.context, this.destination, {
          time,
          frequency: 54,
          duration: 0.35,
          gain: 0.06 * g,
          type: 'sine',
          attack: 0.004,
          release: 0.4,
        });
        this.track(source);
        this.track(thud);
        break;
      }
      case 'water_cross': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 1.1,
          gain: 0.035 * g,
          filter: 'bandpass',
          frequency: 620,
          q: 0.7,
          playbackRate: 0.9,
        });
        this.track(source);
        break;
      }
      case 'bell_church': {
        for (const [frequency, offset] of [
          [220, 0],
          [330, 0.02],
          [550, 0.04],
          [880, 0.06],
        ] as const) {
          const source = playTone(this.context, this.destination, {
            time: time + offset,
            frequency,
            duration: 1.4,
            gain: 0.018 * g,
            type: 'sine',
            attack: 0.005,
            release: 2.2,
          });
          this.track(source);
        }
        break;
      }
      case 'hammer_stone': {
        const noise = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.06,
          gain: 0.045 * g,
          filter: 'bandpass',
          frequency: 2600,
          q: 2.2,
        });
        const tone = playTone(this.context, this.destination, {
          time,
          frequency: 420,
          duration: 0.12,
          gain: 0.018 * g,
          type: 'triangle',
          attack: 0.002,
          release: 0.14,
        });
        this.track(noise);
        this.track(tone);
        break;
      }
      case 'chisel': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.035,
          gain: 0.03 * g,
          filter: 'highpass',
          frequency: 3200,
          q: 1.4,
        });
        this.track(source);
        break;
      }
      case 'crowd_prayer': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 2.4,
          gain: 0.022 * g,
          filter: 'bandpass',
          frequency: 480,
          q: 0.8,
          playbackRate: 0.75,
        });
        this.track(source);
        break;
      }
      case 'dog_growl': {
        const source = playTone(this.context, this.destination, {
          time,
          frequency: 88,
          duration: 0.45,
          gain: 0.04 * g,
          type: 'sawtooth',
          attack: 0.03,
          release: 0.4,
        });
        this.track(source);
        break;
      }
      case 'dog_calm': {
        const source = playTone(this.context, this.destination, {
          time,
          frequency: 260,
          duration: 0.35,
          gain: 0.014 * g,
          type: 'sine',
          attack: 0.04,
          release: 0.35,
        });
        this.track(source);
        break;
      }
      case 'raven': {
        const source = playTone(this.context, this.destination, {
          time,
          frequency: 520,
          duration: 0.18,
          gain: 0.03 * g,
          type: 'sawtooth',
          attack: 0.005,
          release: 0.2,
        });
        const second = playTone(this.context, this.destination, {
          time: time + 0.22,
          frequency: 430,
          duration: 0.2,
          gain: 0.022 * g,
          type: 'sawtooth',
          attack: 0.005,
          release: 0.22,
        });
        this.track(source);
        this.track(second);
        break;
      }
      case 'wind_gust': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 2.2,
          gain: 0.03 * g,
          filter: 'bandpass',
          frequency: 430,
          q: 0.5,
          playbackRate: 0.75,
        });
        this.track(source);
        break;
      }
      case 'breath': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.6,
          gain: 0.016 * g,
          filter: 'bandpass',
          frequency: 720,
          q: 0.9,
        });
        this.track(source);
        break;
      }
      case 'sigh': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.8,
          gain: 0.017 * g,
          filter: 'lowpass',
          frequency: 880,
          q: 0.6,
          playbackRate: 0.7,
        });
        this.track(source);
        break;
      }
      case 'whoosh': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.55,
          gain: 0.035 * g,
          filter: 'bandpass',
          frequency: 850,
          q: 1.1,
          playbackRate: 0.9,
        });
        this.track(source);
        break;
      }
      case 'crown_set': {
        for (const frequency of [1046, 1568, 2093]) {
          const source = playTone(this.context, this.destination, {
            time,
            frequency,
            duration: 0.35,
            gain: 0.014 * g,
            type: 'sine',
            attack: 0.003,
            release: 0.5,
          });
          this.track(source);
        }
        break;
      }
      case 'cloth': {
        const source = playNoise(this.context, this.destination, this.noise, {
          time,
          duration: 0.45,
          gain: 0.022 * g,
          filter: 'bandpass',
          frequency: 1200,
          q: 0.6,
          playbackRate: 1.1,
        });
        this.track(source);
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
}
