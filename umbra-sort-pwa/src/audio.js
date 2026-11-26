export function createAudio(settings) {
  let context = null;
  let enabled = settings.sound !== false;

  function unlock() {
    if (!enabled) return;
    try {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === "suspended") context.resume();
    } catch { /* audio is optional */ }
  }

  function tone(freq, duration, type, gain, delay) {
    if (!enabled || !context) return;
    const start = context.currentTime + (delay || 0);
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(freq, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain || 0.05, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(name) {
    unlock();
    if (name === "move") tone(260, 0.035, "sine", 0.018);
    else if (name === "capture") {
      tone(520, 0.08, "triangle", 0.05);
      tone(780, 0.1, "sine", 0.035, 0.04);
    } else if (name === "prism") {
      tone(330, 0.12, "sine", 0.04);
      tone(660, 0.16, "triangle", 0.04, 0.06);
    } else if (name === "blackout") tone(90, 0.25, "sawtooth", 0.025);
    else if (name === "power") tone(420, 0.12, "sine", 0.03);
    else if (name === "lift") tone(150, 0.09, "triangle", 0.025);
    else if (name === "spawn") tone(340, 0.06, "square", 0.018);
    else if (name === "win") {
      tone(523, 0.18, "triangle", 0.05);
      tone(659, 0.18, "triangle", 0.05, 0.12);
      tone(784, 0.28, "triangle", 0.05, 0.24);
    } else if (name === "ability") {
      tone(330, 0.1, "sine", 0.035);
      tone(660, 0.16, "triangle", 0.035, 0.05);
    } else if (name === "boss") {
      tone(110, 0.22, "sawtooth", 0.025);
      tone(82, 0.3, "sawtooth", 0.025, 0.15);
    } else if (name === "lose") {
      tone(220, 0.2, "sawtooth", 0.03);
      tone(150, 0.3, "sawtooth", 0.03, 0.16);
    } else tone(440, 0.04, "sine", 0.02);
  }

  return {
    play,
    unlock,
    setEnabled(value) { enabled = value !== false; if (enabled) unlock(); },
    isEnabled() { return enabled; }
  };
}
