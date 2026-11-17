/* Sound + light ambient music, layered on the shared R2 audio engine. */

export class Audio {
  constructor(R2) {
    this.R2 = R2;
    this.musicTimer = null;
    this.step = 0;
    this.sfx = R2 && R2.makeSound ? R2.makeSound({
      spin: [180, 0.12, 'triangle'],
      tick: [320, 0.04, 'square'],
      win: [880, 0.22, 'sawtooth'],
      bigwin: [1100, 0.4, 'square'],
      jackpot: [1320, 0.5, 'square'],
      free: [660, 0.25, 'triangle'],
      click: [440, 0.06, 'square'],
      lose: [110, 0.18, 'sine'],
      bonus: [520, 0.3, 'triangle'],
      hold: [740, 0.1, 'square'],
      coin: [980, 0.12, 'triangle'],
      lobby: [330, 0.1, 'sine'],
    }) : null;
  }

  play(name) {
    if (this.sfx && this.sfx[name]) this.sfx[name]();
  }

  note(freq, dur = 0.18, type = 'triangle') {
    if (this.R2 && this.R2.play) this.R2.play(freq, dur, type);
  }

  arpeggio(freqs, gap = 120, type = 'square') {
    freqs.forEach((f, i) => setTimeout(() => this.note(f, 0.22, type), i * gap));
  }

  jackpot() {
    this.play('jackpot');
    this.arpeggio([523, 659, 784, 1047, 1319], 110);
  }

  startMusic() {
    if (this.musicTimer) return;
    const notes = [220, 277, 330, 415, 330, 277, 247, 330];
    this.musicTimer = setInterval(() => {
      const s = this.R2 && this.R2.getSettings ? this.R2.getSettings() : { music: true };
      if (!s.music) return;
      this.note(notes[this.step % notes.length], 0.16, 'sine');
      if (this.step % 4 === 0) this.note(notes[this.step % notes.length] / 2, 0.3, 'triangle');
      this.step++;
    }, 420);
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
