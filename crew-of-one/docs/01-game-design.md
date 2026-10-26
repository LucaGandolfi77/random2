# 01 — Game Design

## Genre

Top-down, one-screen stealth puzzle with a record/replay time-loop mechanic.

## Session shape

- Vault attempt: 5–10 minutes.
- Loop: 30 seconds (45 for the finale).
- Campaign: 15 vaults, 3 free + 12 paid.
- Daily heist: one curated vault + modifier per UTC day.

## Core loop

1. **Enter.** The vault is frozen in its initial state. 30 seconds on the clock.
2. **Rewind.** Tap the rewind button, or let the timer run out. Your run becomes an echo. The world resets.
3. **Rehearse.** The echo replays your movement and interactions. You play alongside it.
4. **Repeat.** Add up to N echoes. The final loop is the heist: all past selves execute their parts while you do the one thing only the present you can do.
5. **Escape.** Reach the exit with the gem. Rank by echoes, alarms, and time.

## Verbs

- **Move:** drag anywhere to spawn a floating joystick. Analog movement.
- **Interact:** tap a highlighted object. Context-sensitive.
- **Dash:** quick flick/double-tap. Makes noise.
- **Rewind:** hold the tape-reel button 0.25s. Ends the loop and turns the run into an echo.

## Rules

### Echoes

- Replay transforms and events, not physics.
- Not solid to the player; the player can walk through them.
- Can press plates, hold doors, pull levers, whistle, and carry the gem (late game).
- Guards see echoes and investigate/follow them, but echoes never trigger the alarm.
- A tape has a length. When it ends, the echo fades and releases anything it held.
- Undo the last echo or reset the heist at any time.

### Guards

- Patrol fixed routes; pause, look, move.
- Vision cone with line-of-sight occlusion.
- If the guard sees the player for ~1.5s, suspicion fills; at full, alarm and lockdown.
- If the guard sees an echo, he investigates or follows it.
- Noise (dash, whistle, doors, plates) pulls the guard toward the source.
- Guards cannot catch echoes. They can only be distracted by them.
- A guard who reaches an echo pauses, shows “?”, then returns to patrol.

### Vault

- Plates hold doors open while pressed; some latch.
- Levers toggle cameras and lasers; echoes can hold levers.
- Cameras sweep; lasers cycle; some doors are one-way.
- The vault door needs two plates plus a lever.
- The gem is unique. First grab wins. An echo can carry it if its tape is long enough. If the tape ends first, the gem drops where the echo vanished.
- The alarm is a fail state. Failure is information; rewind and try again.

### Clock

- 30 seconds per loop; 45 for the finale.
- The timer is the heist window, not a punishment.
- Pause stops the clock, ghosts, and guards.
- Auto-rewind at 0:00.

## Scoring

Each vault has a par (designed minimum echoes).

- **S:** par, no alarms, under target time.
- **A:** par or par+1, no alarms.
- **B:** par+2.
- **C:** more.

The leaderboard ranks by fewest echoes, then fewest alarms, then fastest time.

## Campaign

15 vaults:

| # | Vault | Mechanic | Par |
|---|---|---|---|
| 1 | The Gallery | Plate holds door | 1 |
| 2 | The Night Watch | Guard vision + echo decoy | 1 |
| 3 | Two Hands | Two plates | 2 |
| 4 | The Whistle | Noise lures guards | 2 |
| 5 | The Archive | Camera + lever | 2 |
| 6 | Red Lines | Lasers + dash | 2 |
| 7 | The Long Way | One-way door | 2 |
| 8 | The Handoff | Echo carries gem | 3 |
| 9 | Double Watch | Two guards | 3 |
| 10 | The Vault Door | Two plates + lever | 3 |
| 11 | The Power Cut | Lights out, vision shrinks | 3 |
| 12 | The Relay | Sequenced levers | 4 |
| 13 | The Safe Room | One-way vent | 3 |
| 14 | The False Gem | Decoy triggers alarm | 4 |
| 15 | After You | Finale, all mechanics | 5 |

## Modes

- **Campaign:** 15 handcrafted vaults.
- **Daily Heist:** curated vault + modifier, free forever, leaderboard.
- **Challenge modifiers:** no dash, one echo, faster guards, invisible cones, shorter loop.
- **Ghost of the Day:** watch the top verified run.

## Monetization boundaries

Never sell extra echoes, easier puzzles, leaderboard advantages, or hints that solve the puzzle. Paid content is chapters, the bundle, cosmetics, and the supporter pack.

## Accessibility

Reduced motion, colorblind-safe symbols, left/right-handed layout, tap-to-move alternative, assist mode (slower guards, longer loop), large text, pause anywhere, no timed text.
