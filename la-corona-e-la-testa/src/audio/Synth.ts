import { mulberry32 } from '../utils/math';

export function createNoiseBuffer(
  context: AudioContext,
  duration = 2,
  seed = 1,
): AudioBuffer {
  const length = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  const random = mulberry32(seed);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      data[index] = channel === 0 ? white : last;
    }
  }

  return buffer;
}

export function createReverbImpulse(
  context: AudioContext,
  duration = 3.4,
  decay = 2.6,
  seed = 7,
): AudioBuffer {
  const length = Math.floor(context.sampleRate * duration);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  const random = mulberry32(seed);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const t = index / length;
      data[index] = (random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }

  return impulse;
}

export function createArchitecture(context: AudioContext, seed = 3): {
  master: GainNode;
  compressor: DynamicsCompressorNode;
  music: GainNode;
  ambience: GainNode;
  sfx: GainNode;
  reverb: ConvolverNode;
  reverbGain: GainNode;
} {
  const master = context.createGain();
  master.gain.value = 0.8;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.4;

  const music = context.createGain();
  music.gain.value = 0.34;
  const ambience = context.createGain();
  ambience.gain.value = 0.5;
  const sfx = context.createGain();
  sfx.gain.value = 0.75;

  const reverb = context.createConvolver();
  reverb.buffer = createReverbImpulse(context, 3.6, 2.7, seed);
  const reverbGain = context.createGain();
  reverbGain.gain.value = 0.28;

  music.connect(master);
  music.connect(reverb);
  reverb.connect(reverbGain);
  reverbGain.connect(master);

  ambience.connect(master);
  sfx.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  return { master, compressor, music, ambience, sfx, reverb, reverbGain };
}

export function playTone(
  context: AudioContext,
  destination: AudioNode,
  options: {
    time: number;
    frequency: number;
    duration: number;
    gain?: number;
    type?: OscillatorType;
    attack?: number;
    release?: number;
    detune?: number;
    pan?: number;
  },
): OscillatorNode {
  const oscillator = context.createOscillator();
  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.setValueAtTime(options.frequency, options.time);
  if (options.detune) oscillator.detune.setValueAtTime(options.detune, options.time);

  const gain = context.createGain();
  const peak = options.gain ?? 0.05;
  const attack = options.attack ?? 0.02;
  const release = options.release ?? Math.max(0.1, options.duration * 0.6);
  gain.gain.setValueAtTime(0.0001, options.time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), options.time + attack);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    options.time + Math.max(attack + 0.02, options.duration + release),
  );

  let node: AudioNode = gain;
  if (options.pan !== undefined && typeof context.createStereoPanner === 'function') {
    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(options.pan, options.time);
    gain.connect(panner);
    node = panner;
  }

  oscillator.connect(gain);
  node.connect(destination);
  oscillator.start(options.time);
  oscillator.stop(options.time + options.duration + release + 0.05);
  return oscillator;
}

export function playNoise(
  context: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  options: {
    time: number;
    duration: number;
    gain?: number;
    filter?: 'lowpass' | 'highpass' | 'bandpass';
    frequency?: number;
    q?: number;
    pan?: number;
    playbackRate?: number;
  },
): AudioBufferSourceNode {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = options.playbackRate ?? 1;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = options.filter ?? 'bandpass';
  filter.frequency.setValueAtTime(options.frequency ?? 800, options.time);
  filter.Q.value = options.q ?? 1;

  const gain = context.createGain();
  const peak = options.gain ?? 0.03;
  gain.gain.setValueAtTime(0.0001, options.time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), options.time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, options.time + options.duration);

  let node: AudioNode = gain;
  if (options.pan !== undefined && typeof context.createStereoPanner === 'function') {
    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(options.pan, options.time);
    gain.connect(panner);
    node = panner;
  }

  source.connect(filter);
  filter.connect(gain);
  node.connect(destination);
  source.start(options.time);
  source.stop(options.time + options.duration + 0.05);
  return source;
}

export function makeDistortionCurve(amount = 12): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const degrees = Math.PI / 180;
  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1;
    curve[index] = Math.tanh(amount * x * degrees) / Math.tanh(amount * degrees);
  }
  return curve;
}
