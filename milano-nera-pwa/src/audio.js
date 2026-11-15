export function createAudio() {
  let ctx = null;
  let master = null;
  let sfx = null;
  let music = null;
  let noiseBuffer = null;
  let musicTimer = null;
  let step = 0;
  let theme = 'casa';
  let settings = { sound: true, music: true, masterVolume: 0.82, musicVolume: 0.78, sfxVolume: 0.86 };

  const BASS = {
    casa: [55, 0, 65.41, 0, 73.42, 55, 82.41, 0, 55, 0, 65.41, 0, 49, 55, 61.74, 0],
    torre: [49, 0, 58.27, 61.74, 0, 73.42, 0, 65.41, 49, 0, 58.27, 0, 65.41, 73.42, 0, 0],
    metro: [43.65, 0, 51.91, 43.65, 0, 58.27, 0, 51.91, 43.65, 0, 51.91, 58.27, 0, 65.41, 58.27, 0],
    parco: [55, 0, 55, 65.41, 0, 73.42, 0, 65.41, 55, 0, 55, 61.74, 0, 49, 55, 0],
    darsena: [41.2, 0, 55, 0, 61.74, 41.2, 49, 0, 41.2, 0, 55, 61.74, 0, 49, 55, 0]
  };

  function readSettings() {
    try {
      const live = globalThis.R2?.getSettings?.();
      if (live) settings = { ...settings, ...live };
    } catch {}
    return settings;
  }

  function ensure() {
    readSettings();
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.72 * (settings.masterVolume ?? 0.82);
        master.connect(ctx.destination);
        sfx = ctx.createGain();
        sfx.gain.value = 0.85 * (settings.sfxVolume ?? 0.86);
        sfx.connect(master);
        music = ctx.createGain();
        music.gain.value = 0.3 * (settings.musicVolume ?? 0.78);
        music.connect(master);
      } catch {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function getNoise(context) {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.floor(context.sampleRate * 0.4);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
    return buffer;
  }

  function tone({ freq = 440, endFreq = freq, type = 'sine', duration = 0.1, gain = 0.05, delay = 0, bus = sfx }) {
    if (!ctx || !bus) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(24, freq), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, endFreq), t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp);
    amp.connect(bus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.04);
  }

  function noise({ duration = 0.1, gain = 0.05, frequency = 900, q = 0.8, delay = 0, bus = sfx }) {
    if (!ctx || !sfx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, t0);
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(bus);
    src.start(t0);
    src.stop(t0 + duration + 0.04);
  }

  function play(name, data = {}) {
    if (!readSettings().sound) return;
    if (!ensure()) return;
    switch (name) {
      case 'pistol':
        noise({ duration: 0.11, gain: 0.11, frequency: 1300, q: 0.7 });
        tone({ freq: 170, endFreq: 55, type: 'square', duration: 0.11, gain: 0.08 });
        break;
      case 'smg':
        noise({ duration: 0.055, gain: 0.06, frequency: 1800, q: 0.8 });
        tone({ freq: 130, endFreq: 62, type: 'square', duration: 0.05, gain: 0.035 });
        break;
      case 'revolver':
        noise({ duration: 0.2, gain: 0.16, frequency: 900, q: 0.45 });
        tone({ freq: 110, endFreq: 32, type: 'sawtooth', duration: 0.25, gain: 0.14 });
        break;
      case 'shotgun':
        noise({ duration: 0.28, gain: 0.19, frequency: 700, q: 0.35 });
        tone({ freq: 92, endFreq: 28, type: 'sawtooth', duration: 0.32, gain: 0.15 });
        break;
      case 'enemyShoot':
        noise({ duration: 0.08, gain: 0.045, frequency: 1500, q: 0.8 });
        break;
      case 'hit':
        tone({ freq: 760, endFreq: 360, type: 'triangle', duration: 0.06, gain: 0.04 });
        break;
      case 'kill':
        noise({ duration: 0.12, gain: 0.05, frequency: 300, q: 0.7 });
        tone({ freq: 180, endFreq: 80, type: 'sawtooth', duration: 0.14, gain: 0.035 });
        break;
      case 'hurt':
        tone({ freq: 90, endFreq: 45, type: 'sawtooth', duration: 0.28, gain: 0.1 });
        noise({ duration: 0.18, gain: 0.07, frequency: 260, q: 0.5 });
        break;
      case 'reload':
        tone({ freq: 1120, endFreq: 720, type: 'square', duration: 0.04, gain: 0.024 });
        tone({ freq: 620, endFreq: 420, type: 'square', duration: 0.05, gain: 0.02, delay: 0.17 });
        break;
      case 'empty':
        tone({ freq: 240, endFreq: 220, type: 'square', duration: 0.04, gain: 0.025 });
        break;
      case 'pickup':
        tone({ freq: 660, endFreq: 990, type: 'triangle', duration: 0.12, gain: 0.06 });
        tone({ freq: 990, endFreq: 1320, type: 'sine', duration: 0.16, gain: 0.035, delay: 0.06 });
        break;
      case 'takedown':
        noise({ duration: 0.18, gain: 0.08, frequency: 190, q: 0.6 });
        tone({ freq: 150, endFreq: 52, type: 'triangle', duration: 0.25, gain: 0.05 });
        break;
      case 'ricochet':
        tone({ freq: 2100, endFreq: 500, type: 'triangle', duration: 0.16, gain: 0.055 });
        noise({ duration: 0.05, gain: 0.02, frequency: 4000 });
        break;
      case 'impact':
        noise({ duration: 0.07, gain: 0.035, frequency: 600, q: 1.2 });
        break;
      case 'explosion':
        noise({ duration: 0.4, gain: 0.14, frequency: 220, q: 0.4 });
        tone({ freq: 80, endFreq: 28, type: 'sawtooth', duration: 0.5, gain: 0.11 });
        break;
      case 'vault':
        noise({ duration: 0.1, gain: 0.03, frequency: 420 });
        break;
      case 'roll':
        noise({ duration: 0.12, gain: 0.025, frequency: 360 });
        break;
      case 'objective':
        tone({ freq: 330, endFreq: 440, type: 'sine', duration: 0.25, gain: 0.06 });
        tone({ freq: 440, endFreq: 660, type: 'sine', duration: 0.35, gain: 0.04, delay: 0.12 });
        break;
      case 'alert':
        tone({ freq: 180, endFreq: 240, type: 'square', duration: 0.2, gain: 0.03 });
        break;
      case 'boss':
        tone({ freq: 62, endFreq: 34, type: 'sawtooth', duration: 0.9, gain: 0.1 });
        noise({ duration: 0.7, gain: 0.04, frequency: 100 });
        break;
      case 'bossDown':
        tone({ freq: 220, endFreq: 55, type: 'sawtooth', duration: 1.1, gain: 0.09 });
        noise({ duration: 0.6, gain: 0.04, frequency: 160 });
        break;
      case 'chapter':
        [261.63, 329.63, 392, 523.25].forEach((freq, index) => {
          tone({ freq, endFreq: freq, type: 'sine', duration: 0.4, gain: 0.05, delay: index * 0.11 });
        });
        break;
      case 'death':
        tone({ freq: 180, endFreq: 32, type: 'sawtooth', duration: 1.3, gain: 0.11 });
        break;
      case 'chase':
        tone({ freq: 92, endFreq: 80, type: 'sawtooth', duration: 0.2, gain: 0.04 });
        break;
      case 'crash':
        noise({ duration: 0.3, gain: 0.12, frequency: 500, q: 0.5 });
        tone({ freq: 70, endFreq: 30, type: 'square', duration: 0.3, gain: 0.09 });
        break;
      case 'ui':
        tone({ freq: 540, endFreq: 620, type: 'triangle', duration: 0.05, gain: 0.025 });
        break;
      default:
        break;
    }
  }

  function tickMusic() {
    if (!ctx || !music || !readSettings().music) return;
    const pattern = BASS[theme] || BASS.casa;
    const index = step % pattern.length;
    const note = pattern[index];
    if (note) {
      tone({ freq: note, endFreq: note, type: 'sawtooth', duration: 0.24, gain: 0.06, bus: music });
      tone({ freq: note * 2, endFreq: note * 2, type: 'triangle', duration: 0.12, gain: 0.022, bus: music });
    }
    if (index % 4 === 0) {
      tone({ freq: 54, endFreq: 42, type: 'sine', duration: 0.18, gain: 0.09, bus: music });
    }
    if (index % 8 === 4) {
      noise({ duration: 0.06, gain: 0.035, frequency: 2200, q: 0.7, bus: music });
    }
    if (index === 6 || index === 14) {
      noise({ duration: 0.09, gain: 0.028, frequency: 4200, q: 1.2, bus: music });
    }
    if (index === 8) {
      tone({ freq: 220, endFreq: 220, type: 'sine', duration: 0.4, gain: 0.025, bus: music });
    }
    step++;
  }

  function startMusic(nextTheme = 'casa') {
    if (!ensure()) return;
    theme = nextTheme;
    if (musicTimer) return;
    step = 0;
    tickMusic();
    musicTimer = setInterval(tickMusic, 170);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function setSettings(next) {
    settings = { ...settings, ...(next || {}) };
    if (master) master.gain.value = 0.72 * (settings.masterVolume ?? 0.82);
    if (sfx) sfx.gain.value = 0.85 * (settings.sfxVolume ?? 0.86);
    if (music) music.gain.value = 0.3 * (settings.musicVolume ?? 0.78);
    if (!settings.music) stopMusic();
  }

  return { play, startMusic, stopMusic, setSettings, unlock: ensure };
}
