# NINTH DAY

A dark, elegant time-loop JRPG built for one thumb.

This repository contains a **playable nine-day cycle** in Godot 4, plus the full design and technical documents. It is portrait-first and Android-first.

## Play the cycle

Requires **Godot 4.7.x** (tested with 4.7.2 stable).

```bash
# From the repository root
godot --path ninth-day
```

Or open `ninth-day/project.godot` in the Godot editor and press **F5**.

The game runs:

**Title → Bell Map → Day 1 Morning (story + Hollow Choir tutorial) → Bell Rest → Afternoon (story + Ashwright) → Bell Rest → Night (story + choice) → Bell Rest → Day 2**

**Day 2: Morning (Watch checkpoint) → Bell Rest → Afternoon (story + Watch Hound) → Bell Rest → Night (story + choice) → Bell Rest → Day 3**

**Day 3: Morning (Descent) → Bell Rest → Afternoon (story + Ashwright/Choir duo) → Bell Rest → Night (the Choir's offer) → Bell Rest → Day 4**

**Day 4: Morning (Saint Orra) → Bell Rest → Afternoon (Clockwork Saint retreat battle) → Bell Rest → Night (the first Wren) → Bell Rest → Day 5**

**Day 5: Morning (Wren's house) → Bell Rest → Afternoon (Hollow Bellkeeper mirror fight) → Bell Rest → Night (the first crack) → Bell Rest → Day 6**

**Day 6: Morning (Sera's coup) → Bell Rest → Afternoon (Iron Choir or Sera Vane, depending on your alliance) → Bell Rest → Night (the Hollowed) → Bell Rest → Day 7**

**Day 7: Morning (Vey's sanctuary) → Bell Rest → Afternoon (accept mercy for a no-combat route, or fight the Saint of Ash) → Bell Rest → Night (what mercy costs) → Bell Rest → Day 8**

**Day 8: Morning (the Ascent) → Bell Rest → Afternoon (the Unbound Saint's phase change) → Bell Rest → Night (the ninth day) → Bell Rest → Day 9**

**Day 9: Morning (the last morning / hidden bell) → Bell Rest → Afternoon (the Quiet, final boss) → Bell Rest → Night (the ending) → Ending screen**

- The story is authored in **Ink** and runs on the vendored **inkgd** runtime.
- Branching choices set flags and raise bonds.
- Each battle is a full Echo Track encounter with previews and a confirm step.
- Bell Rest offers three Inheritance cards per phase and equips the one you take.
- Progress, choices, and equipped memories autosave and resume.
- **Quiet threads** add six optional bond scenes, two elite battles, and six more Inheritances. They unlock the day after their anchor day and persist across loops.
- **The Journal** records a line for every phase and quiet thread, tracks bond ranks, lists carried memories, and unlocks lore entries as Cael learns the city's history. It is reachable from the title and the Bell Map.
- **Skip-read** fast-forwards only prose already seen before the current scene, stopping for new Echo lines, choices, and closing cards.
- **Cycles carry forward.** Starting the next cycle keeps bonds, memories, the loadout, quiet threads, and seen lines. Day choices and ending postures reset. **Start fresh** wipes everything.
- **Echo dialogue** adds second-loop variants to Day 1 and the Day 9 ending, plus an Echo banner in later cycles.
- The Bell Map shows bond ranks, thread status, and the true-ending conditions; the title shows a **Previously** recap.

### Endings

Day 9 resolves the posture chosen on Day 8:

- **Ring the Bell** — the city survives and forgets.
- **Break the Bell** — time moves forward, at a cost.
- **Become the Bell** — Cael holds Aurel together.
- **The Ninth Day (true ending)** — break the Bell, carry the hidden bell, and reach rank 3 with all six bonds. The ending screen tracks whether it has been found.

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

## Authoring Ink

Day 1 through Day 9 live in [`content/ink/`](content/ink), and the optional quiet threads live in [`content/ink/side_threads.ink`](content/ink/side_threads.ink). Lines carry presentation tags:

```ink
The Bell is cracking. # id:d1m_005 # speaker:Mara # bg:spire
* [Take her hand.] # flag:mara_trust # bond:mara:1
```

- `id` marks a line as seen for future skip-read support.
- `speaker`, `bg`, `portrait`, and `expression` drive presentation.
- `flag` and `bond` are mirrored into `RunState` when the choice is taken.

Compile the source to the JSON consumed by inkgd:

```bash
INKLECATE_BIN=/path/to/inklecate ./ninth-day/tools/compile_ink.sh
```

All compiled `.ink.json` files are checked in, so players never need inklecate. The runtime adapter is [`src/narrative/story_service.gd`](src/narrative/story_service.gd); inkgd is vendored at [`addons/inkgd`](addons/inkgd) from the `godot4` branch, commit `fea9098`.

## Run the tests

```bash
./ninth-day/tools/run_tests.sh

# Or point at a specific Godot binary:
GODOT_BIN=/path/to/godot ./ninth-day/tools/run_tests.sh
```

Two suites run headlessly:

1. **Battle suite** — deterministic simulation, Echo rules, tones, Resonance, Chord, encounters, previews, save/restore, and inheritances.
2. **Flow suite** — boots the real screens and drives the entire `title → map → Ink story → battle → Bell Rest → quiet thread → Journal → ending → next cycle` loop across all twenty-seven main phases, six optional threads, and four endings, including tag parsing, choice flags, day advancement, scripted retreats, the Day 6 alliance-dependent boss, the Day 7 no-combat mercy route, both boss phase changes, cycle carryover, Echo dialogue, skip-read, Journal unlocks, and the true-ending resolver.

## Controls

- **Tap an enemy** to select the target.
- **Tap an action** to preview its damage, healing, tone bonus, status, and cost.
- **Confirm** to commit. **Cancel** returns to the action list.
- **Tap an Echo card** to preview a replay, then confirm. The party gets one Echo per battle.
- **Guard** restores 1 Resolve and halves incoming damage until the end of the round.
- **Chord: The Ninth Toll** unlocks at 3 Resonance and consumes it.
- **Resolve enemy turn** resolves the enemy phase. Enemy intents are visible on their rows.
- On victory, **Bell Rest** appears. On defeat, restart or return to the map.

## What the game demonstrates

1. **The Echo Track is readable.** The last three/four actions are cards. Replaying uses the current actor, current target, and recorded effect — it is a rules hack, not a frozen turn.
2. **Enemies answer in kind.** Enemies can Echo your actions, and the Ashwright steals and locks one of your cards at half HP.
3. **Tone matching builds Resonance.** Hitting the counter-tone deals +25%; matching the tone builds +1 Resonance.
4. **Commitment matters.** Every action has a preview and a confirm step, including Echo replays.
5. **The loop remembers.** Choices, bonds, completed phases, and Inheritances persist across app restarts.
6. **The loop changes.** Later cycles carry bonds and memories forward, replay key scenes with Echo narration, and make the true ending reachable.
7. **Combat is deterministic.** Integer math and a serialized RNG state mean the same seed and commands produce the same result.

## Project layout

```
ninth-day/
  project.godot
  addons/
    inkgd/                       # vendored Ink runtime (MIT)
  content/
    ink/day_01.ink               # Day 1 story source
    ink/day_01.ink.json          # compiled Ink consumed at runtime
    ink/day_02.ink               # Day 2 story source
    ink/day_02.ink.json          # compiled Ink consumed at runtime
    ink/day_03.ink               # Day 3 story source
    ink/day_03.ink.json          # compiled Ink consumed at runtime
    ink/day_04.ink               # Day 4 story source
    ink/day_04.ink.json          # compiled Ink consumed at runtime
    ink/day_05.ink               # Day 5 story source
    ink/day_05.ink.json          # compiled Ink consumed at runtime
    ink/day_06.ink               # Day 6 story source
    ink/day_06.ink.json          # compiled Ink consumed at runtime
    ink/day_07.ink               # Day 7 story source
    ink/day_07.ink.json          # compiled Ink consumed at runtime
    ink/day_08.ink               # Day 8 story source
    ink/day_08.ink.json          # compiled Ink consumed at runtime
    ink/day_09.ink               # Day 9 story source
    ink/day_09.ink.json          # compiled Ink consumed at runtime
    ink/side_threads.ink         # six optional quiet-thread scenes
    ink/side_threads.ink.json    # compiled optional scenes
    inheritances.json            # Bell Rest cards and modifiers
    journal.json                 # recap lines, thread entries, and lore
  docs/
    GDD.md
    TECH_SPEC.md
    MOBILE_CHECKLIST.md
  src/
    core/run_state.gd            # meta save: day, phases, flags, bonds, cards
    narrative/story_service.gd   # InkPlayer adapter and tag/flag bridge
    progression/inheritance_db.gd
    progression/journal_db.gd    # recap, thread, and lore content
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
      journal_view.gd/.tscn
      bell_rest.gd/.tscn
      ending_view.gd/.tscn
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
    compile_ink.sh
    export_android.sh
    make_icons.gd
    capture_battle.gd/.tscn      # screenshot helper
    capture_screen.gd/.tscn
```

## Save files

Runtime saves are stored in Godot's `user://` directory:

- `ninth_day_run.json` — cycle state: cycle number, day, completed phases, flags, bonds, quiet threads, Inheritances, seen lines.
- `ninth_day_battle.json` — in-progress battle, including RNG state and Echo locks.

The battle autosaves at each player decision. Finishing a battle deletes its save. The title screen's **Continue** resumes an in-progress battle first, then a quiet thread, then the Bell Map.

## Design rules enforced in code

- The battle domain (`BattleSim`) has no nodes, no scene tree, and no frame-dependent logic.
- Damage is integer math (basis points) so results do not drift across devices.
- Every action is recorded, including enemy actions, unless tagged unechoable.
- A replay uses current stats and current target, never a frozen snapshot.
- A stolen card is visible and locked.
- A party wipe rewinds the battle; there is no story loss.
- The meta layer never resolves combat; it only supplies encounters and modifiers.

## Known limitations

- The nine-day main story and six quiet threads are complete; the remaining optional phases and knowledge-gated Bell Map variants from the GDD are not authored.
- The Journal is a one-screen recap, not yet a searchable archive with per-line history.
- Echo dialogue currently covers Day 1 and the Day 9 ending only.
- Ink state is not saved mid-scene; quitting during a story phase returns to the Bell Map (quiet threads likewise restart).
- Art is typographic greybox: no portraits, backgrounds, music, SFX, or haptics yet.
- The turn model is party-phase then enemy-phase, not the final speed timeline.
- Statuses are minimal: Burning, Marked, Slowed. Slowed is displayed but does not yet alter order.
- The debug APK is built and signature-verified, but has not yet been run on physical Android hardware.
- No iOS export preset or store integrations yet.
- No cosmetics shop, cloud save, analytics, or localization pipeline yet.

## Next

1. Add the remaining optional phases and knowledge-gated Bell Map variants.
2. Add party swap, items, and the speed timeline.
3. Persist mid-scene Ink state and add per-line journal history/search.
4. Extend Echo variants to more scenes and add replay modifiers.
5. Art pass: portraits, paper/brass UI, tone VFX, sound, haptics.
6. Run the debug APK on physical Android hardware and complete the safe-area/touch audit.
7. iOS export and store integrations.
8. Cosmetic archive and the free-story monetization boundary.

## Third-party notices

- **inkgd** — MIT, © 2018–2023 Paul Joannon, © 2019–2023 Frédéric Maquin. Vendored from the `godot4` branch at commit `fea9098`.
- **Ink** — MIT, © inkle Ltd. Day 1 through Day 9 and the quiet threads are compiled with `inklecate`.

Add a project license before distributing builds.
