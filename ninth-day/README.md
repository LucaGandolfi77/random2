# NINTH DAY

A dark, elegant time-loop JRPG built for one thumb.

This repository contains a **playable Day 1 vertical slice** in Godot 4, plus the full design and technical documents. It is portrait-first and Android-first.

## Play the vertical slice

Requires **Godot 4.7.x** (tested with 4.7.2 stable).

```bash
# From the repository root
godot --path ninth-day
```

Or open `ninth-day/project.godot` in the Godot editor and press **F5**.

The slice runs:

**Title → Bell Map → Day 1 Morning (story + Hollow Choir tutorial) → Bell Rest → Afternoon (story + Ashwright) → Bell Rest → Night (story + choice) → Bell Rest → Day 1 complete**

- The story has branching choices that set flags and raise bonds.
- Each battle is a full Echo Track encounter with previews and a confirm step.
- Bell Rest offers three Inheritance cards per phase and equips the one you take.
- Progress, choices, and equipped memories autosave and resume.

## Build the Android debug APK

The project includes a checked-in Android export preset (`com.ninthday.game`, portrait, arm64, min SDK 24). It uses the prebuilt Android template, not a Gradle build, so no Gradle download is required.

```bash
ANDROID_HOME=/path/to/android-sdk \
JAVA_HOME=/path/to/jdk-17 \
GODOT_BIN=/path/to/godot \
./ninth-day/tools/export_android.sh

# Or pass an explicit output path:
./ninth-day/tools/export_android.sh /tmp/ninth-day-debug.apk
```

Requires Godot 4.7.x Android export templates, Android build-tools 35, and JDK 17. The script aligns and signs the debug APK and writes the `.idsig` alongside it.

The current debug build is **55 MB** because it includes both `arm64-v8a` and `x86_64` (for emulator testing). Package `com.ninthday.game`, version `0.1.0`, min SDK 24, target SDK 36. It has been exported and signature-verified. A release preset should ship `arm64-v8a` only. See [`docs/MOBILE_CHECKLIST.md`](docs/MOBILE_CHECKLIST.md).

## Run the tests

```bash
./ninth-day/tools/run_tests.sh

# Or point at a specific Godot binary:
GODOT_BIN=/path/to/godot ./ninth-day/tools/run_tests.sh
```

Two suites run headlessly:

1. **Battle suite** — deterministic simulation, Echo rules, tones, Resonance, Chord, encounters, previews, save/restore, narrative runner, inheritances.
2. **Flow suite** — boots the real screens and drives `title → map → story → battle → Bell Rest → map` across all three Day 1 phases.

## Controls

- **Tap an enemy** to select the target.
- **Tap an action** to preview its damage, healing, tone bonus, status, and cost.
- **Confirm** to commit. **Cancel** returns to the action list.
- **Tap an Echo card** to preview a replay, then confirm. The party gets one Echo per battle.
- **Guard** restores 1 Resolve and halves incoming damage until the end of the round.
- **Chord: The Ninth Toll** unlocks at 3 Resonance and consumes it.
- **Resolve enemy turn** resolves the enemy phase. Enemy intents are visible on their rows.
- On victory, **Bell Rest** appears. On defeat, restart or return to the map.

## What the slice demonstrates

1. **The Echo Track is readable.** The last three/four actions are cards. Replaying uses the current actor, current target, and recorded effect — it is a rules hack, not a frozen turn.
2. **Enemies answer in kind.** Enemies can Echo your actions, and the Ashwright steals and locks one of your cards at half HP.
3. **Tone matching builds Resonance.** Hitting the counter-tone deals +25%; matching the tone builds +1 Resonance.
4. **Commitment matters.** Every action has a preview and a confirm step, including Echo replays.
5. **The loop remembers.** Choices, bonds, completed phases, and Inheritances persist across app restarts.
6. **Combat is deterministic.** Integer math and a serialized RNG state mean the same seed and commands produce the same result.

## Project layout

```
ninth-day/
  project.godot
  content/
    stories/day_01.json          # Day 1 dialogue, choices, flags
    inheritances.json            # Bell Rest cards and modifiers
  docs/
    GDD.md
    TECH_SPEC.md
    MOBILE_CHECKLIST.md
  src/
    core/run_state.gd            # meta save: day, phases, flags, bonds, cards
    narrative/story_service.gd   # dialogue runner (InkService-shaped API)
    progression/inheritance_db.gd
    battle/
      battle_types.gd            # enums and tone rules
      battle_actor.gd            # actor state
      battle_action.gd           # action definition
      action_record.gd           # Echo Track record
      echo_track.gd              # ring buffer
      battle_sim.gd              # pure deterministic simulation
      battle_store.gd            # battle autosave
      battle_view.gd/.tscn       # portrait battle UI
    screens/
      title.gd/.tscn
      bell_map.gd/.tscn
      story_view.gd/.tscn
      bell_rest.gd/.tscn
    ui/
      palette.gd
      stage_art.gd
      ui.gd
  tests/
    test_battle.gd               # headless battle/domain assertions
    flow_bootstrap.gd/.tscn      # end-to-end harness bootstrap
    flow_test.gd                 # screen flow assertions
  tools/
    run_tests.sh
    fetch_godot.sh
    export_android.sh
    make_icons.gd
    capture_battle.gd/.tscn      # screenshot helper
    capture_screen.gd/.tscn
```

## Save files

Runtime saves are stored in Godot's `user://` directory:

- `ninth_day_run.json` — cycle state: day, completed phases, flags, bonds, Inheritances.
- `ninth_day_battle.json` — in-progress battle, including RNG state and Echo locks.

The battle autosaves at each player decision. Finishing a battle deletes its save. The title screen's **Continue** resumes an in-progress battle first, then the Bell Map.

## Design rules enforced in code

- The battle domain (`BattleSim`) has no nodes, no scene tree, and no frame-dependent logic.
- Damage is integer math (basis points) so results do not drift across devices.
- Every action is recorded, including enemy actions, unless tagged unechoable.
- A replay uses current stats and current target, never a frozen snapshot.
- A stolen card is visible and locked.
- A party wipe rewinds the battle; there is no story loss.
- The meta layer never resolves combat; it only supplies encounters and modifiers.

## Known limitations

- Day 2–9 content is not authored yet.
- The dialogue runner is a small, deterministic JSON-based stand-in for **inkgd**. Its API mirrors the planned `InkService`, so the swap is isolated to `story_service.gd` and `story_view.gd`.
- Art is typographic greybox: no portraits, backgrounds, music, SFX, or haptics yet.
- The turn model is party-phase then enemy-phase, not the final speed timeline.
- Statuses are minimal: Burning, Marked, Slowed. Slowed is displayed but does not yet alter order.
- The debug APK is built and signature-verified, but has not yet been run on physical Android hardware.
- No iOS export preset or store integrations yet.
- No cosmetics shop, cloud save, analytics, or localization pipeline yet.

## Next

1. Replace the dialogue stand-in with `inkgd` and port Day 1 to `.ink`.
2. Author Day 2 and the Bell Map's bond/knowledge unlocks.
3. Add party swap, items, and the speed timeline.
4. Art pass: portraits, paper/brass UI, tone VFX, sound, haptics.
5. Safe-area and touch-target audit on device.
6. Android debug export, then the iOS pass.
7. Cosmetic archive and the free-story monetization boundary.

## License

Add a project license before distributing builds.
