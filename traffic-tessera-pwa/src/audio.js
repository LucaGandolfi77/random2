export function createAudio(settings) {
  let context = null;
  let enabled = settings.sound !== false;

  function unlock() {
    if (!enabled) return;
    try {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === "suspended") context.resume();
    } catch {}
  }

  function tone(frequency, duration, type, gain, delay = 0) {
    if (!enabled || !context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain || 0.03, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(name) {
    unlock();
    if (name === "move") tone(260, 0.06, "triangle", 0.018);
    else if (name === "exit") {
      tone(440, 0.1, "triangle", 0.035);
      tone(660, 0.16, "sine", 0.025, 0.06);
    } else if (name === "blocked") tone(120, 0.08, "sawtooth", 0.015);
    else if (name === "undo") tone(220, 0.08, "triangle", 0.02);
    else if (name === "tow") {
      tone(300, 0.12, "square", 0.02);
      tone(520, 0.14, "triangle", 0.025, 0.05);
    } else if (name === "shuffle") {
      tone(280, 0.08, "sine", 0.02);
      tone(420, 0.1, "sine", 0.02, 0.05);
    } else if (name === "win") {
      tone(523, 0.16, "triangle", 0.04);
      tone(659, 0.16, "triangle", 0.04, 0.1);
      tone(784, 0.24, "triangle", 0.04, 0.2);
    } else tone(400, 0.04, "sine", 0.018);
  }

  return {
    play,
    unlock,
    setEnabled(value) { enabled = value !== false; if (enabled) unlock(); },
    isEnabled() { return enabled; }
  };
}
