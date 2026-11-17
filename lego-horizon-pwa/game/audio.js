/* Sound, music and haptics. Reuses the repo's shared arcade library. */
let ctx = null;

function beep(freq, duration, type = "sine", gainValue = 0.12) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    osc.start();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio is optional */ }
}

export function createAudio() {
  const R2 = window.R2;
  const settings = () => R2?.getSettings?.() || { sound: true, music: true, haptics: true };
  const sfx = R2?.makeSound
    ? R2.makeSound({
        shoot: [420, 0.05, "triangle"],
        charged: [700, 0.16, "sawtooth"],
        enemyHit: [220, 0.06, "square"],
        kill: [330, 0.12, "triangle"],
        core: [880, 0.08, "sine"],
        heal: [520, 0.16, "sine"],
        hurt: [130, 0.2, "sawtooth"],
        wave: [560, 0.22, "triangle"],
        boss: [200, 0.35, "sawtooth"],
        bossPhase: [150, 0.45, "sawtooth"],
        shockwave: [90, 0.35, "square"],
        shield: [740, 0.07, "square"],
        burrow: [180, 0.2, "triangle"],
        win: [720, 0.4, "triangle"],
        lose: [180, 0.5, "sawtooth"],
        click: [640, 0.05, "sine"],
      })
    : null;

  let musicTimer = 0;
  let step = 0;
  let intensity = 1;
  let noteIndex = 0;
  const NOTES = [196, 247, 294, 330, 294, 247, 220, 247];

  function play(name) {
    if (!settings().sound) return;
    if (sfx && typeof sfx[name] === "function") sfx[name]();
    else beep(440, 0.08);
  }

  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (!settings().music || !settings().sound) return;
      beep(NOTES[noteIndex % NOTES.length], 0.16, "triangle", 0.035 * intensity);
      if (step % 4 === 0) beep(NOTES[noteIndex % NOTES.length] / 2, 0.3, "sine", 0.03);
      step += 1;
      noteIndex += intensity > 1 ? 2 : 1;
    }, 320 / intensity);
  }

  function setIntensity(level) {
    intensity = level >= 3 ? 1.6 : level === 2 ? 1.25 : 1;
  }

  function stopMusic() {
    if (!musicTimer) return;
    clearInterval(musicTimer);
    musicTimer = 0;
  }

  function buzz(pattern) {
    if (!settings().haptics) return;
    try { R2?.buzz ? R2.buzz(pattern) : navigator.vibrate?.(pattern); } catch { /* optional */ }
  }

  function suspend() {
    stopMusic();
    try { ctx?.suspend?.(); } catch { /* optional */ }
  }
  function resume() {
    try { ctx?.resume?.(); } catch { /* optional */ }
  }

  return {
    play, buzz, startMusic, stopMusic, suspend, resume, setIntensity,
    toggle(key) {
      const current = settings();
      R2?.setSettings?.({ [key]: !current[key] });
      return settings();
    },
  };
}
