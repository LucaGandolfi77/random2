# 04 — Audio Bible

## Direction

**Synth noir.** Upright bass, brushed snare, muted trumpet, tape hiss, clock ticks. Small, smoky, precise.

## Why synth-first

- Tiny bundle; no licensed samples.
- Adaptive layers can react to suspicion, alarms, and the final choreography.
- Fits the PWA ethos: instant load, offline, no streaming.

## Music

- **Menu:** slow bass loop, tape hiss, occasional brushed snare.
- **Exploration:** bass + clock ticks + sparse keys.
- **Tension:** add snare, low drone, muted trumpet.
- **Alarm:** detuned brass, klaxon, rising noise.
- **Success:** major chord sting, tape stop, paper stamp.
- **Finale:** layers enter as each echo executes its part; crescendo on the gem.

Tempo: 70–90 BPM. Loops must be seamless. Use a lookahead scheduler or WebAudio loop points; do not sync music to Phaser’s frame clock.

## SFX

Footstep, dash, interact, plate press/release, door open/close, lever, camera sweep, laser hum, gem grab, whistle, guard alert, guard confused, alarm, rewind, ghost appear, UI click, rank stamp, purchase success.

## Rewind

The signature sound: tape-stop pitch bend, reverse cymbal, VHS whirr, low whoosh. 0.8–1.2s. Must feel satisfying on its own.

## Haptics

- Tick on interact.
- Thud on rewind.
- Pulse when a guard is close.
- Success pattern on rank.
- Android only; optional and toggleable.

## Mix

- Dialogue: none.
- Music: -18 LUFS under SFX; duck on rewind/alarm.
- SFX: clear, short, no clipping.
- Mobile speaker test: the rewind and plate clicks must read on a phone speaker.
- Silent switch: test iOS; provide a mute toggle and visual cues.

## Implementation

- WebAudio synth engine: oscillators, noise buffers, filters, envelopes.
- Optional small sample pack for brushed snare/tape hiss; clear commercial license.
- Adaptive music via layered gain nodes; no crossfade gaps.
- Audio unlock on first gesture; suspend on visibility change.

## AI policy

AI may sketch patches, generate SFX variations, and draft music ideas. Final music and mix are human-made or commissioned. Record tool, license, and edits in `art/ASSET_LEDGER.md`.
