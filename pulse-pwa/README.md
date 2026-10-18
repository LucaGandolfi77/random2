# PULSE

**Play it:** <https://lucagandolfi77.github.io/random2/pulse-pwa/>

A four-lane rhythm game with no music files. A single 32-bit seed decides the key,
the tempo, the chord progression, the drum pattern and the melody; the note chart is
then read back out of the melody, so the notes you are pressing always land on the
tune you are hearing.

Press **D F J K**. Nothing is downloaded, ever.

## Playing

| | |
|---|---|
| `D` `F` `J` `K` | lanes 1&#8202;–&#8202;4 |
| `Esc` | pause / resume |
| `R` | restart from the top |

The seed box on the menu takes any integer. `#seed=20261018` in the URL opens that
exact track, so a link reproduces a song byte for byte. **Daily** jumps to today's
seed, **Random** rolls a new one.

Three difficulties, each a different filter over the same melody:

| | notes | windows (perfect / great / good) | min gap |
|---|---|---|---|
| Easy | every 4th melody note, no accents | 50 / 100 / 150 ms | 155 ms |
| Normal | every 2nd, plus section-boundary accents | 45 / 90 / 130 ms | 135 ms |
| Hard | every melody note, plus kick and snare accents | 35 / 70 / 105 ms | 120 ms |

`min gap` is always wider than the *good* window, so a single keypress can never be
ambiguous about which note it is meant for. On Easy there are no hold notes.

Missing notes cost you the Flow gauge and the grade. They never end the run — the
track always plays to the end and you always get a result.

## How a track is built

```
seed ──► mulberry32 ──► tempo, key, mode, progression, drum pattern,
                         rhythmic vocabulary, motif bank
     ──► sections   intro · A · B · break · A2 · C · outro  (88 bars)
     ──► melody     one 2-bar motif per section, repeated, with
                    mutations on alternate bars
     ──► chart      melody notes become taps, sustained notes become holds,
                    kick and snare become accents
     ──► audio      every event rendered offline, 12 s at a time
```

Two decisions do most of the work:

**The melody is a motif, not a random walk.** Each section draws a fixed rhythm from
a pool of eight motifs and pitches it onto the current chord's triad. Alternate bars
get a mutation — drop the last note, shift a note by an eighth, drop a passing tone.
That repetition is what makes it read as music rather than as noise.

**The chart is derived, not authored.** Because `chart.js` reads the same event list
`audio.js` renders, a note can never disagree with the sound. Lanes come from the
scale degree (`degree mod 4`), so consecutive scale steps and octave jumps always
land on different fingers.

### Synths

Six voices, all built from oscillators and filters — no samples:

| voice | shape |
|---|---|
| kick | sine with a 155 → 44 Hz pitch envelope, plus a 12 ms noise click |
| snare | band-passed noise at 1750 Hz over a triangle body |
| hat / openhat | high-passed noise at 8.2 / 6.2 kHz, 45 / 190 ms |
| bass | saw + sub-sine through a resonant low-pass that opens and closes |
| pad | three detuned saws and a triangle, slow attack, 1.5 kHz low-pass |
| lead | three detuned oscillators with shared vibrato, envelope-swept low-pass |

A dotted-eighth delay (`0.75 × beat`, 34 % feedback, low-passed at 2.6 kHz) sits on a
send from the lead bus. The master bus is a soft compressor.

## Rendering

Rendering is **progressive**, not blocking. The track is rendered into twelve-second
chunks with `OfflineAudioContext`; playback starts as soon as the first chunk lands
and each later chunk is scheduled the moment it finishes, roughly fifteen times faster
than it is consumed. A 2:49 track is playable in about 450 ms and fully rendered
within the first ten seconds of play.

## Files

```
pulse-pwa/
├── index.html              shell, SEO, JSON-LD
├── styles.css
├── manifest.json
├── service-worker.js       CACHE_NAME "pulse-v1", per-asset .catch()
├── sim.test.mjs            19 tests, Node, DOM-free
├── smoke.mjs               36 checks in real Chromium (skips if absent)
├── og-cover.png
├── icons/
├── tools/make-icons.py     regenerates every icon and the cover, stdlib only
└── src/
    ├── song.js             seed -> {bpm, key, sections, events[]}   pure
    ├── chart.js            song -> notes[] per difficulty          pure
    ├── audio.js            offline render, chunk scheduling, voices
    ├── game.js             state machine, input, judgement, renderer
    └── main.js             menus, catalogue, results, storage
```

`song.js` and `chart.js` are DOM-free and deterministic, which is what makes the
generator testable outside a browser.

## Tests

```bash
node pulse-pwa/sim.test.mjs     # 19 checks over 500 seeds
node pulse-pwa/smoke.mjs        # 36 checks in Chromium
python3 pulse-pwa/tools/make-icons.py   # regenerates icons/
```

`sim.test.mjs` asserts the things that would silently ruin a track: the same seed
always yields the same song, every event lands on a sixteenth-note of the grid, every
pitched note stays in the key, the intro really is sparse, most bars of a section
repeat the same phrase length, and for all 500 seeds every difficulty respects its
minimum gap, keeps a note out of the same lane twice inside 1.6 gaps, and lands in a
playable 0.4&#8211;4.2 notes-per-second band. One seed is fingerprinted by hash so any
unintended change to the generator shows up as a failing test.

`smoke.mjs` covers what the unit tests cannot: that the page boots, that the daily
seed prefills, that a hash seed is honoured, that the audio context reaches `running`,
that the song clock advances and freezes on pause, that notes are painted, and that an
auto-played run reaches the results screen with a grade, a catalogue entry and a
`R2.stats` run recorded. It also asserts the accessibility floor — every button
labelled, the playfield described, a live region present, `lang` set — and boots the
page a second time under `prefers-reduced-motion: reduce` to make sure nothing
depends on animation.

## Data

Two localStorage keys, both scoped to this game:

- `pulse-tracks` — per seed: play count, best score, best accuracy, best grade, and
  the last eight results.
- `pulse-daily` — the current daily streak and the best one.

Runs also go to `R2.stats.run` under the slug `pulse`, with accuracy, grade, combo and
the four judgement counts in `meta`, so the arcade-wide dashboard charts them.

## Licence

MIT, same as the rest of the arcade.