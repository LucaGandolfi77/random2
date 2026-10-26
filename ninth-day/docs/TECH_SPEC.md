# NINTH DAY
## Technical Specification

**Version:** 0.1 — Pre-production  
**Date:** 26 October 2026  
**Owner:** Solo developer + AI agents  
**Companion document:** `GDD.md`  
**Engine:** Godot 4.x stable, Mobile renderer, typed GDScript  
**Primary target:** Android 8.0+ (API 26+), portrait, 1080 × 1920 design resolution  
**Secondary target:** iOS 14+  
**Backend:** Supabase (auth, cloud save, entitlements, remote config)  
**Business model:** Free-to-play; complete story free; cosmetic IAP only

---

## 0. Document control

| Item | Detail |
|---|---|
| Purpose | Define how NINTH DAY is built, tested, shipped, and operated. |
| Audience | The solo developer, AI coding agents, contractors, and future collaborators. |
| Scope | Client architecture, battle simulation, narrative, save system, mobile integrations, backend, build pipeline, QA, AI workflow. |
| Out of scope | Final art direction, marketing copy, detailed narrative canon (see GDD and Canon Bible). |
| Change rule | Any change to the battle simulation, save schema, or IAP entitlement model requires an ADR and a test update. |

---

## 1. Technical vision and constraints

### 1.1 Goals

1. **Offline-first.** The complete story and combat work with no network. Network features (cloud save, shop, analytics) degrade gracefully.
2. **Deterministic combat.** The same state plus the same commands produces the same result. This enables mid-battle save/resume, tests, balance simulation, and AI-assisted debugging.
3. **Instant resume.** A cold start reaches the title in under 1.5 seconds; “Continue” reaches the last scene in under 3 seconds. A killed app resumes exactly.
4. **One-thumb 60 fps.** Stable 60 fps on a mid-range Android device; no battery furnace during a 25-minute session.
5. **Content-driven.** Designers and agents add characters, skills, enemies, phases, and dialogue through validated data, not new code.
6. **Small team maintainability.** Typed GDScript, small scenes, clear boundaries, automated tests, and no clever architecture that only the author understands.
7. **Ethical monetization.** No ads, no gacha, no energy. Purchases are entitlements checked server-side, with an offline cache.

### 1.2 Non-goals

- Real-time or asynchronous multiplayer.
- 3D rendering, open world, procedural terrain.
- Live-service server authority over combat.
- User-generated content, modding, or a level editor at launch.
- Cross-platform competitive leaderboards.
- Voice-over.

### 1.3 Constraints

- **Solo developer + AI agents.** The architecture must be easy to explain, test, and review. Prefer boring, explicit code.
- **Android first.** Android is the soft-launch platform; iOS follows. Avoid iOS-only APIs in shared code.
- **Godot 4.x.** Pin the exact stable minor version. Upgrade only at milestone boundaries, with a regression pass.
- **No custom engine work.** Use Godot’s built-in systems; wrap platform APIs behind interfaces.
- **Budget.** No expensive middleware. Ink, GUT, and open-source plugins preferred.

### 1.4 Quality attributes

| Attribute | Target | Measurement |
|---|---|---|
| Crash-free sessions | ≥ 99.5% | Sentry / Play Console |
| Cold start to title | < 1.5 s | Instrumented on mid-range Android |
| Continue to playable | < 3 s | Instrumented |
| Frame rate | 60 fps | Godot profiler, device tests |
| Memory | < 250 MB | Android profiler |
| Initial download | < 150 MB | AAB size |
| Save corruption | 0 known cases | Migration and power-loss tests |
| Battle determinism | 100% golden tests | CI |
| Accessibility | WCAG-inspired pass | Manual audit |

---

## 2. Platform and engine

### 2.1 Engine version

- Use the latest **stable Godot 4.x** at project start; pin the exact version in `project.godot`, CI, and the team’s setup docs.
- Renderer: **Mobile** (`rendering/renderer/rendering_method = "mobile"`). Forward+ is not needed for a 2D portrait game and costs battery.
- Language: **typed GDScript** for gameplay and UI. C# only if a platform plugin requires it; avoid mixing.
- 2D only. No 3D nodes except a `SubViewport` for share cards.
- Required Godot features: `AudioStreamInteractive` (4.3+), `TTS`, `Input.vibrate_handheld`, `DisplayServer.get_display_safe_area`, `FileAccess` atomic writes, `ResourceLoader.load_threaded_request`.

### 2.2 Device targets

| Tier | Example | Target |
|---|---|---|
| Minimum | Android 8.0, 3 GB RAM, 720 × 1280, Mali-G52 / Adreno 610 | 30–60 fps, low-FX mode |
| Recommended | Android 12+, 6 GB RAM, 1080 × 2400, Adreno 730 / Mali-G78 | 60 fps, full FX |
| iOS minimum | iPhone 8 / iOS 14 | 60 fps, low-FX fallback |
| Tablet | 4:3 and 16:10 | Safe-area layout, centered content |

Test on at least one low-end physical Android device from day one. The emulator lies about performance and touch latency.

### 2.3 Screen and orientation

- Portrait only. `display/window/handheld/orientation = "portrait"`.
- Design resolution 1080 × 1920. Stretch mode `canvas_items`, aspect `expand`.
- Safe area: `DisplayServer.get_display_safe_area()` returns a `Rect2i` in screen coordinates. Convert to viewport coordinates and apply margins to a root `MarginContainer`. Never hardcode notch insets.
- Gesture navigation: keep the bottom 24 dp clear of critical buttons; Android’s gesture bar overlays the app.
- Test aspect ratios: 20:9, 19.5:9, 16:9, 4:3 tablet. The game must remain playable, not merely visible.

### 2.4 Third-party dependencies

| Dependency | Purpose | License / risk |
|---|---|---|
| **inkgd** | Ink narrative runtime | MIT; mature; pin commit/tag |
| **GUT** | GDScript unit testing | MIT; mature |
| **Godot Google Play Billing** | Android IAP | Official/community plugin; wrap it |
| **StoreKit plugin** | iOS IAP | Community plugin; wrap it |
| **Local notifications plugin** | Android/iOS notifications | Community; wrap it |
| **Share plugin** | Share Loop Cards | Community; fallback to save-to-gallery |
| **sentry-godot** | Crash reporting | MIT; verify mobile support |
| **Supabase REST** | Auth, save, entitlements | No official Godot SDK; use `HTTPRequest` + JWT |

**Rule:** every platform plugin sits behind a single autoload interface (`PlatformIAP`, `PlatformNotifications`, `PlatformShare`, `PlatformHaptics`). The game calls the interface, never the plugin directly. If a plugin breaks, replace it without touching gameplay code.

### 2.5 Project settings baseline

```ini
[application]
config/name="Ninth Day"
config/version="0.1.0"
run/main_scene="res://core/boot.tscn"
config/features=PackedStringArray("4.x", "Mobile")

[display]
window/size/viewport_width=1080
window/size/viewport_height=1920
window/stretch/mode="canvas_items"
window/stretch/aspect="expand"
window/handheld/orientation="portrait"

[rendering]
renderer/rendering_method="mobile"
renderer/rendering_method.mobile="mobile"
textures/default_filters/use_nearest_mipmap_filter=false
environment/defaults/default_clear_color=Color(0.04, 0.04, 0.05, 1)

[audio]
buses/default_bus_layout="res://audio/default_bus_layout.tres"

[input_devices]
pointing/emulate_touch_from_mouse=true
```

Add a `BuildInfo` autoload that exposes version, build number, platform, and commit hash from generated files. Never hardcode version strings in UI.

---

## 3. Architecture overview

### 3.1 Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation: scenes, UI screens, animations, audio cues    │
├─────────────────────────────────────────────────────────────┤
│ Application: Game, SceneRouter, SaveService, AudioService,  │
│              ShopService, SettingsService, Telemetry          │
├─────────────────────────────────────────────────────────────┤
│ Domain: BattleSim, Progression, NarrativeState, EchoRules   │
├─────────────────────────────────────────────────────────────┤
│ Data: ContentDB, Resources, Ink stories, SaveGame, schemas  │
├─────────────────────────────────────────────────────────────┤
│ Platform: Android/iOS plugins, Supabase REST, filesystem    │
└─────────────────────────────────────────────────────────────┘
```

**Dependency rule:** presentation depends on application; application depends on domain and data; domain depends only on data primitives; platform is called through interfaces. The domain never imports a scene, a node, or a plugin.

### 3.2 Autoloads

| Autoload | Responsibility | Must not |
|---|---|---|
| `Game` | Global game state, current cycle, current phase, pause state | Contain battle math or UI |
| `SceneRouter` | Scene transitions, loading screen, back stack | Own game data |
| `SaveService` | Read/write/migrate saves, autosave, backups | Know about UI |
| `ContentDB` | Load and validate Resources, resolve IDs | Mutate definitions at runtime |
| `AudioService` | Music layers, SFX pool, ducking, volume | Know about story |
| `SettingsService` | Audio, text, accessibility, privacy settings | Store gameplay state |
| `ShopService` | Cosmetic catalog, entitlements, restore, purchase flow | Grant gameplay power |
| `PlatformIAP` | Native billing wrapper | Contain catalog logic |
| `PlatformNotifications` | Local notification schedule | Send marketing |
| `PlatformShare` | Share/save Loop Card | Render the card |
| `PlatformHaptics` | Vibration patterns and settings | Bypass the player’s toggle |
| `Telemetry` | Consent, event queue, flush | Send PII |
| `BuildInfo` | Version, platform, commit | Change at runtime |

Autoloads are registered in a fixed order. Each exposes signals and typed methods; no autoload reaches into another’s private fields.

### 3.3 Scene flow

```
Boot
  → Title
    → Continue → Bell Map → Phase
    → New Cycle → Intro → Bell Map
    → Archive / Settings
Phase
  → District (explore/dialogue)
  → Battle (if encounter)
  → Bell Rest (Inheritance)
  → Journal line
  → Bell Map
```

`SceneRouter` uses `ResourceLoader.load_threaded_request` for district and battle scenes, shows a minimal transition, and frees the previous scene after the new one is ready. The back button (Android) pops the UI stack; at the Bell Map it opens “Exit?”; during battle it opens “Pause?”.

### 3.4 Event bus

Use a small `GameEvents` autoload for cross-cutting signals only:

```gdscript
signal phase_started(phase_id: StringName)
signal phase_completed(phase_id: StringName)
signal battle_started(encounter_id: StringName)
signal battle_ended(result: BattleResult)
signal inheritance_chosen(card_id: StringName)
signal bond_rank_changed(bond_id: StringName, rank: int)
signal memory_anchored(memory_id: StringName)
signal purchase_completed(product_id: StringName)
```

Do not use the event bus for local UI flow. Local signals stay local. This keeps debugging sane.

### 3.5 Dependency injection

No DI framework. Pass dependencies explicitly to domain objects:

```gdscript
var sim := BattleSim.new(content_db, rng)
var view := BattleView.new(sim, audio_service, haptics)
```

For tests, construct `BattleSim` with a fake `ContentDB` or a test fixture. The domain must be constructible without a `SceneTree`.

---

## 4. Repository structure

```
ninth-day/
  project.godot
  export_presets.cfg
  AGENTS.md
  README.md
  docs/
    canon/                 # tone bible, characters, timeline, terminology
    adr/                   # architecture decision records
    schemas/               # JSON schemas for content and save
    art/                   # art bible, palette, naming
    audio/                 # audio bible, stem map
  src/
    core/
      boot.tscn
      game.gd
      scene_router.gd
      save_service.gd
      content_db.gd
      settings_service.gd
      build_info.gd
    battle/
      battle_sim.gd        # pure domain
      battle_state.gd
      battle_actor.gd
      battle_action.gd
      echo_track.gd
      battle_ai.gd
      battle_view.tscn
      battle_view.gd
      battle_ui.tscn
      battle_ui.gd
    narrative/
      ink_service.gd
      narrative_state.gd
      dialogue_view.tscn
      dialogue_view.gd
      conditions.gd
    world/
      bell_map.tscn
      bell_map.gd
      district_view.tscn
      district_view.gd
      hotspot.gd
      journal.tscn
    ui/
      theme/
      screens/
      widgets/
      safe_area.gd
    shop/
      shop_service.gd
      cosmetic_def.gd
      cosmetic_applier.gd
    platform/
      platform_iap.gd
      platform_notifications.gd
      platform_share.gd
      platform_haptics.gd
    audio/
      audio_service.gd
      default_bus_layout.tres
  content/
    characters/*.tres
    skills/*.tres
    enemies/*.tres
    encounters/*.tres
    inheritances/*.tres
    cosmetics/*.tres
    phases/*.tres
    ink/*.ink
    localization/*.csv
  assets/
    art/
      portraits/
      backgrounds/
      enemies/
      ui/
      vfx/
    audio/
      music/
      sfx/
    fonts/
  tests/
    unit/
    integration/
    golden/
    fixtures/
  tools/
    validate_content.gd
    extract_ink_ids.gd
    build_loop_card.gd
    simulate_balance.gd
  .github/workflows/
```

### 4.1 Naming conventions

- Files: `snake_case.gd`, `snake_case.tscn`, `snake_case.tres`.
- Nodes: `PascalCase` (`BattleView`, `EchoTrackPanel`).
- Signals: past tense (`battle_ended`, `inheritance_chosen`).
- Constants: `SCREAMING_SNAKE_CASE`.
- Private fields: leading underscore (`_sim`).
- Content IDs: `snake_case`, stable, human-readable (`day_03_ashwright`). Never renumber or rename after launch; add aliases instead.
- No spaces in paths. No non-ASCII filenames.

### 4.2 Scene rules

- One root script per scene. Child nodes communicate via signals or typed references.
- No business logic in `_process` unless it is animation. Combat is event-driven.
- UI scenes are `Control`-based; world scenes are `Node2D`/`Control` hybrids with a fixed camera.
- Max 200 nodes in a battle scene. If it grows, extract widgets.
- Use `@onready` for child references; avoid `get_node("../../..")`.
- Mark exported references with `@export var` and validate in `_ready()`.

---

## 5. Data model and save system

### 5.1 Content definitions

All static content is a Godot `Resource` with a stable ID, validated at import and in CI.

```gdscript
extends Resource
class_name SkillDef
@export var id: StringName
@export var display_name_key: StringName
@export var description_key: StringName
@export var tone: Tone
@export var power: int
@export var resolve_cost: int
@export var target_rule: TargetRule
@export var status_effects: Array[StatusDef]
@export var echoable: bool = true
@export var vfx_id: StringName
```

```gdscript
extends Resource
class_name EnemyDef
@export var id: StringName
@export var display_name_key: StringName
@export var max_hp: int
@export var attack: int
@export var defense: int
@export var speed: int
@export var tone: Tone
@export var skills: Array[StringName]
@export var ai_profile: StringName
@export var echoable_actions: Array[StringName]
@export var loot_echoes: int
```

`ContentDB` loads all `.tres` files under `content/`, indexes them by ID, and fails loudly on duplicates, missing references, or invalid localization keys.

### 5.2 Save game schema

One main slot plus two rotating backups. Save at every scene boundary and at the start of every battle turn. JSON for portability and debuggability; checksum for corruption detection, not DRM.

```json
{
  "save_version": 1,
  "created_at": "2026-10-26T12:00:00Z",
  "updated_at": "2026-10-26T12:34:56Z",
  "checksum": "sha256:...",
  "meta": {
    "cycle": 2,
    "day": 5,
    "phase": "night",
    "phase_id": "day_05_quiet_house",
    "play_time_seconds": 8432,
    "reason": "remember"
  },
  "settings": {
    "music": 0.8,
    "sfx": 0.9,
    "text_scale": 1.0,
    "reduced_motion": false,
    "high_contrast": false,
    "language": "en"
  },
  "progression": {
    "level": 7,
    "inheritances_owned": ["cinder_lance", "steady_hands", "mara_trust"],
    "inheritances_equipped": ["cinder_lance", "steady_hands", "mara_trust", null, null, null],
    "archive_pages": 12,
    "bonds": {"mara": 2, "iven": 1, "oria": 0, "toma": 1, "sera": 1, "vey": 0}
  },
  "narrative": {
    "flags": ["met_mara", "elias_anchored", "knows_wren_truth"],
    "seen_lines": ["day1_intro_001", "day1_intro_002"],
    "current_knot": "day_05_quiet_house.night"
  },
  "battle": {
    "encounter_id": "day_05_hollow_bellkeeper",
    "turn": 4,
    "seed": 183746,
    "rng_state": 9918273,
    "party": [],
    "enemies": [],
    "echo_track": [],
    "resonance": 1,
    "chord_ready": false,
    "log": []
  },
  "entitlements": {
    "owned_products": ["outfit_lamplighter", "bell_verdigris"],
    "last_verified_at": "2026-10-25T09:00:00Z"
  },
  "analytics": {
    "consent": true,
    "anonymous_id": "uuid"
  }
}
```

**Rules:**

- `save_version` is an integer. Every schema change increments it and adds a migration in `SaveMigrations`.
- `checksum` is SHA-256 of the canonical JSON without the checksum field. A mismatch loads the newest valid backup and informs the player, never silently resets.
- Battle snapshots are written at turn start only. On load, restore the snapshot and replay the current turn’s UI state; animations are cosmetic.
- `seen_lines` is capped at 20,000 IDs; prune oldest. It powers skip-read.
- `entitlements` is a cache. The shop re-verifies online; offline use is honored for 7 days, then cosmetics remain visible but purchase restore is prompted.

### 5.3 Atomic writes and backups

```gdscript
func write_save(path: String, data: Dictionary) -> Error:
    var tmp := path + ".tmp"
    var f := FileAccess.open(tmp, FileAccess.WRITE)
    if f == null:
        return FileAccess.get_open_error()
    f.store_string(JSON.stringify(data, "\t"))
    f.flush()
    f.close()
    # Rotate backups before replacing.
    _rotate_backups(path)
    return DirAccess.rename_absolute(tmp, path)
```

- Write to `user://saves/slot_0.json`.
- Keep `slot_0.bak1.json` and `slot_0.bak2.json`.
- On startup, validate the main save; if invalid, try backups in order.
- Log corruption events to Sentry with no personal data.
- Never save during a scene transition or while an animation owns state.

### 5.4 Cloud save

- Optional Supabase account. Anonymous auth by default; link email for cross-device.
- Upload after every Bell Rest and on app pause, debounced to 30 seconds.
- Conflict resolution: compare `updated_at` and `play_time_seconds`; show the player both summaries and let them choose. Never silently overwrite.
- Cloud payload is the same JSON, compressed with gzip, stored as `jsonb` or `text`. RLS restricts to the owner.
- Offline queue: up to 5 pending uploads; retry with exponential backoff on next launch.

---

## 6. Battle simulation and Echo Track

### 6.1 Design goals

- Pure domain: no nodes, no signals to the scene tree, no timers.
- Deterministic: integer math, seeded RNG, stable iteration order.
- Serializable: full state can be captured at turn start.
- Testable: a battle can run headless in milliseconds.
- Readable: the view renders events; it never decides outcomes.

### 6.2 Core types

```gdscript
extends RefCounted
class_name BattleState
var encounter_id: StringName
var turn: int
var round: int
var seed: int
var rng_state: int
var party: Array[BattleActor]
var enemies: Array[BattleActor]
var echo_track: EchoTrack
var resonance: int
var chord_ready: bool
var pending_commands: Array[BattleAction]
var log: Array[Dictionary]
```

```gdscript
extends RefCounted
class_name BattleActor
var actor_id: StringName
var side: Side
var def: CharacterDef
var hp: int
var max_hp: int
var resolve: int
var max_resolve: int
var attack: int
var defense: int
var speed: int
var statuses: Array[StatusInstance]
var cooldowns: Dictionary
var ai_profile: StringName
var echo_available: bool
```

```gdscript
extends RefCounted
class_name ActionRecord
var actor_id: StringName
var action_id: StringName
var target_ids: Array[StringName]
var tone: Tone
var base_power: int
var turn: int
var echoable: bool
var tags: Array[StringName]
```

```gdscript
extends RefCounted
class_name EchoTrack
var capacity: int = 3
var records: Array[ActionRecord] = []
func push(record: ActionRecord) -> void
func get_record(index: int) -> ActionRecord
func replace(index: int, record: ActionRecord) -> void
func clear() -> void
```

### 6.3 Resolution pipeline

`BattleSim.resolve(action: BattleAction) -> Array[BattleEvent]`

1. **Validate:** actor alive, turn correct, cost affordable, target legal, action not silenced.
2. **Pay:** deduct Resolve/HP/items; consume Echo charge if replaying.
3. **Roll:** seeded RNG for variance; no random crits on basic attacks.
4. **Apply:** damage, heal, status, shield, buff, summon.
5. **Trigger:** passives, on-hit effects, death effects, Resonance gain.
6. **Tick:** status durations and damage-over-time at the correct phase.
7. **Advance:** remove dead actors, check victory/defeat, advance the turn queue.
8. **Emit:** return typed `BattleEvent` objects for the view, log, and analytics.

Commands are resolved one at a time. The view plays events in order. If the app is killed mid-animation, the next load restores the state at the start of the turn; the animation is replayed or skipped.

### 6.4 Turn order

- Sort by `speed` descending, then `actor_id` for stability.
- Insert effects (Iven’s Ratchet) modify the queue explicitly, not by re-sorting mid-round.
- The timeline UI shows the next 6 actors.
- Ties are resolved by a stable actor index, never by dictionary iteration.

### 6.5 Echo rules (authoritative)

1. The track holds the last 3 actions (4 for Iven). It records **all** actions, including enemy actions, unless the action is tagged `unechoable`.
2. The player may replay one record per battle. The replay costs 0 Resolve, consumes the player’s Echo charge, and adds +1 Resonance.
3. Each enemy side may replay one record per battle. Bosses may replay once per phase instead.
4. A replay is a **new action**:
   - Uses the current actor’s stats and the current target’s defenses.
   - Uses the record’s base power, tone, and effects.
   - Rerolls variance with the current RNG state.
   - Retargets if the original target is invalid: nearest enemy for attacks, lowest-HP ally for heals, self for self-buffs.
   - Cannot replay a record tagged `unechoable`.
5. Bosses may **steal** one player record at a phase threshold. The stolen record is replaced by a locked enemy action. The player cannot replay the stolen record until it is replaced naturally or the boss is defeated.
6. Matching the enemy’s tone with a skill deals neutral damage and grants +1 Resonance (once per action). Replays grant +1 Resonance as well.
7. Resonance reaches 3 → Chord available. Chord consumes all Resonance. Chord actions are never echoable.
8. Echo replays do not trigger “on skill use” passives unless the passive explicitly says “on action.” This prevents infinite loops.

### 6.6 Damage and status math

Integer math only:

```gdscript
func calculate_damage(power: int, atk: int, def: int, tone_bp: int, guard_bp: int, variance_bp: int) -> int:
    var base := power * (atk + 10) / max(1, def + 10)
    var dmg := base * tone_bp / 100 * guard_bp / 100 * variance_bp / 100
    return max(1, dmg)
```

- All values are integers. `tone_bp` is 125 for the counter-tone, 100 for neutral or matching; `guard_bp` is 50 when guarding, 100 otherwise; `variance_bp` is 90–110 from the seeded RNG. Basis points avoid floating-point drift across devices.
- Matching the enemy’s tone grants +1 Resonance instead of bonus damage.
- Damage caps at 50% of a target’s max HP for non-boss enemies, 35% for bosses, unless the action is tagged `execute`.
- Statuses: same ID refreshes duration; different IDs stack if tagged `stackable`; max 5 statuses per actor.
- Status tick order: shield decay → damage over time → heal over time → duration decrement → expire.

### 6.7 AI

- **Intent telegraph:** every enemy action is chosen at the start of the round and shown. The AI does not change its mind unless a redraw effect occurs.
- **Utility scoring:** `score = expected_damage * target_value + status_value + echo_value - risk`. Profiles weight these terms.
- **Profiles:** `bruiser`, `controller`, `support`, `assassin`, `boss_phases`.
- **Boss phases:** a list of phase definitions with HP thresholds, new skills, and scripted events. The phase transition is deterministic.
- **No cheating:** the AI uses the same rules and the same RNG. It may have better information (e.g., it knows the player’s HP), but it cannot ignore costs or cooldowns.

### 6.8 Battle events

```gdscript
extends RefCounted
class_name BattleEvent
enum Type { DAMAGE, HEAL, STATUS_APPLIED, STATUS_EXPIRED, ECHO_RECORDED, ECHO_REPLAYED, ECHO_STOLEN, RESONANCE_CHANGED, CHORD_READY, ACTOR_DIED, PHASE_CHANGED, BATTLE_ENDED }
var type: Type
var actor_id: StringName
var target_id: StringName
var amount: int
var status_id: StringName
var payload: Dictionary
```

The view consumes events; analytics logs a reduced set; the battle log stores the full list for debugging and share cards.

### 6.9 Determinism and tests

- All iteration over actors uses arrays sorted by `actor_id`.
- All RNG goes through `BattleSim.rng`, seeded and saved.
- No `Time.get_ticks_msec()` in domain logic.
- Golden tests: fixture state + command list → expected event log hash.
- Fuzz tests: random legal commands for 10,000 turns; no crashes, no negative HP, no invalid states.
- Balance simulation: headless battles with scripted policies; report win rates, average turns, Echo usage.

---

## 7. Narrative system

### 7.1 Ink integration

Use **inkgd** to run Ink stories. Ink handles branching, choices, variables, and flow; the game handles presentation. One `.ink` file per phase keeps compile times and merge conflicts low.

```
content/ink/
  day_01_morning.ink
  day_01_afternoon.ink
  day_01_night.ink
  ...
  shared/
    characters.ink
    barks.ink
    endings.ink
```

**Rules:**

- Every line ends with tags: `# id:day_01_morning_001 # speaker:mara # portrait:mara # expression:warm`.
- Optional tags: `# music:ember_row_base # sfx:bell_soft # bg:ember_row_morning # condition:elias_anchored`.
- Choices use `* [Choice text]` with a stable choice ID tag.
- No raw text concatenation. Localization keys map to line IDs.
- No game logic in Ink beyond flags and simple conditions. Combat, inventory, and purchases stay in GDScript.

### 7.2 Dialogue service API

```gdscript
extends Node
class_name InkService

signal line_ready(line: DialogueLine)
signal choices_ready(choices: Array[DialogueChoice])
signal story_ended()

func start(knot: StringName) -> void
func advance() -> void
func choose(index: int) -> void
func get_state() -> Dictionary
func restore_state(state: Dictionary) -> void
```

```gdscript
extends RefCounted
class_name DialogueLine
var id: StringName
var speaker_id: StringName
var text: String
var portrait_id: StringName
var expression: StringName
var music: StringName
var sfx: StringName
var background: StringName
var conditions: Array[StringName]
```

The `DialogueView` renders lines and choices. It never parses Ink tags directly; `InkService` does.

### 7.3 Narrative state

Keep a single `NarrativeState` resource:

```gdscript
extends Resource
class_name NarrativeState
@export var flags: Dictionary = {}          # StringName -> bool/int/String
@export var seen_lines: Dictionary = {}     # line_id -> true
@export var bonds: Dictionary = {}          # bond_id -> rank
@export var current_knot: StringName
@export var current_phase: StringName
```

- Flags are set through `NarrativeState.set_flag(id, value)`.
- Conditions are evaluated in GDScript, not Ink, when they affect game state (e.g., whether a door is open).
- Ink variables mirror only local scene flow; sync them to `NarrativeState` at scene end.
- A flag audit tool lists unused flags, flags set but never read, and flags read but never set.

### 7.4 Localization pipeline

1. Writers write Ink in English with stable line ID tags.
2. `tools/extract_ink_ids.gd` scans Ink files, verifies unique IDs, and emits `content/localization/strings.csv`.
3. Translators translate the CSV. Never edit Ink text directly in a translated build.
4. At runtime, `InkService` receives the English line, looks up the ID in `TranslationServer`, and returns the localized string. If missing, fall back to English and log once.
5. Pseudo-localization (`[!! ... !!]`, +30% length) runs in CI to catch overflow.
6. Font fallback: Noto Sans/Serif for CJK; test line breaking for Japanese and Korean.
7. UI strings use `tr()` with keys; no concatenation; pluralization via Godot’s translation context.

**Launch:** English only. **Year 1:** Japanese, French, Spanish, German, Portuguese-BR, Korean, Simplified Chinese if metrics support. Do not promise languages before the pipeline is tested.

### 7.5 Content validation

`tools/validate_content.gd` runs in CI and checks:

- Unique IDs across skills, enemies, encounters, phases, cosmetics, and line tags.
- Every referenced skill/enemy/phase/portrait exists.
- Every localization key exists in the CSV.
- Every Ink file compiles and every knot is reachable from a phase.
- No line exceeds 180 characters (soft warning) or 240 (error).
- No orphan choices, no flags read but never set, no duplicate line IDs.
- Every battle encounter has a victory and defeat path.
- Every phase has a Bell Rest and an autosave hook.

Failures block the build. Agents must run this before proposing a merge.

---

## 8. UI and UX implementation

### 8.1 UI architecture

- `UIRoot` (CanvasLayer) owns a `ScreenStack`. Screens are `Control` scenes with `show_screen()`, `hide_screen()`, and `on_back()`.
- `SceneRouter` handles full-screen transitions; `UIRoot` handles overlays (dialogue, pause, confirmations).
- The battle UI is a separate scene loaded by `SceneRouter`; it receives a `BattleSim` instance.
- The UI never mutates domain state directly. It sends commands to the sim and renders events.

### 8.2 Safe area

```gdscript
func apply_safe_area(root: Control) -> void:
    var safe := DisplayServer.get_display_safe_area()
    var win := DisplayServer.window_get_size()
    var scale := Vector2(root.size.x / float(win.x), root.size.y / float(win.y))
    var left := int(safe.position.x * scale.x)
    var top := int(safe.position.y * scale.y)
    var right := int((win.x - safe.end.x) * scale.x)
    var bottom := int((win.y - safe.end.y) * scale.y)
    root.add_theme_constant_override("margin_left", left)
    root.add_theme_constant_override("margin_top", top)
    root.add_theme_constant_override("margin_right", right)
    root.add_theme_constant_override("margin_bottom", bottom)
```

Apply to a root `MarginContainer` on every screen. Test on a notched device and a gesture-nav device.

### 8.3 Theme and typography

- One `Theme` resource with color tokens: `ink`, `paper`, `brass`, `ember`, `hush`, `bell`, `danger`, `muted`.
- Fonts: Cormorant Garamond (dialogue), Inter (UI), Noto fallbacks. Use `FontVariation` for weights; avoid many font files.
- Minimum body size 20 px at 1080 width; minimum touch target 48 dp; button spacing 12 dp.
- Text scale: a settings multiplier applied to the theme’s font sizes and line spacing. Test 80%, 100%, 120%, 140%.
- High contrast: swap palette tokens and increase outline width; do not recolor art.
- Reduced motion: disable screen shake, parallax, and long transitions; keep essential feedback.

### 8.4 Battle UI layout

```
┌──────────────────────────────────────┐
│ Enemy stage (40%)                    │
│  intent icons, HP bars, statuses     │
├──────────────────────────────────────┤
│ Turn timeline (8%)                   │
│  next 6 actors, vertical             │
├──────────────────────────────────────┤
│ Echo Track (12%)                     │
│  [card] [card] [card]  [Echo]        │
├──────────────────────────────────────┤
│ Party + actions (40%)                │
│  portraits, HP/Resolve, 2×3 grid     │
└──────────────────────────────────────┘
```

- The Echo button is always in the same place. When a replay is available, it pulses once, not forever.
- The action grid: Attack, Skill, Echo / Guard, Item, Swap. The most common actions are bottom-right for right-handed reach; a left-handed layout mirrors the grid in Settings.
- The skill list is a bottom sheet with 3–5 skills; each row shows tone, cost, power, and target rule. No nested submenus.
- No long-press on mobile. Tap a target to see the preview; tap again to confirm, or show the preview inline when a skill is selected. Keep it to two taps.

### 8.5 Performance rules for UI

- No `_process` on every button. Use signals and `Tween`.
- Avoid `RichTextLabel` for long dialogue; use `Label` with `autowrap_mode = TextServer.AUTOWRAP_WORD_SMART`. Use RichText only for inline emphasis.
- Reuse damage-number and status-icon pools.
- One full-screen shader pass maximum. UI shaders are cheap; disable on low-FX.
- Texture atlases for icons and frames; no per-icon materials.
- Test with the profiler open on a low-end device, not just the editor.

### 8.6 Share card rendering

1. Instantiate `LoopCardView` in a `SubViewport` at 1080 × 1350.
2. Render background, portraits, day, journal line, and frame.
3. Wait two frames for layout and texture load.
4. `get_texture().get_image().save_png("user://loop_card.png")`.
5. Call `PlatformShare.share_image(path, text)`; fallback to a share sheet with the file path or save-to-gallery.
6. No personal data, no spoilers beyond the chosen day, no automatic posting.

### 8.7 Notifications

- Local notifications only. Schedule at a player-chosen time, at most one per day.
- Content: “Day 4 is waiting. Mara has been baking since dawn.” No streak shaming, no “energy full,” no fake events.
- Permission is requested after the first Bell Rest, with a clear explanation. Denial is respected.
- Cancel all notifications when the game is opened; reschedule on exit if enabled.
- Android 13+ notification permission; iOS authorization request. Test time zones and daylight saving.

---

## 9. Rendering, performance, and memory

### 9.1 Renderer and assets

- Mobile renderer, 2D. No 3D, no SDFGI, no volumetric fog.
- Texture compression: ASTC 4×4/6×6 for Android and iOS where supported; ETC2 fallback for older Android. UI textures uncompressed or lossless; art textures compressed.
- Max texture size 2048; portraits 1024 × 1536; backgrounds 2048 × 2048 or tiled.
- Atlases per character and per UI category. Avoid runtime atlas creation.
- Mipmaps for backgrounds; off for UI and portraits (unless scaled down).
- Fonts: dynamic `FontFile` with `FontVariation`; CJK fonts subset per language; test memory.

### 9.2 Shaders

- One full-screen post-process: paper grain, vignette, palette quantization, subtle ink bleed. Parameters exposed in a `LookProfile` resource per day.
- Low-FX mode: disable grain, bloom, and screen-space distortion; keep palette and vignette.
- No per-pixel noise loops on low-end; use a tiled noise texture.
- Test shader compile times on Android; precompile in a loading scene if needed.
- Cosmetics “ink styles” swap `LookProfile` parameters, not shader code.

### 9.3 Frame budget

| System | Budget |
|---|---|
| UI layout + input | 4 ms |
| Battle view + VFX | 6 ms |
| World/background | 3 ms |
| Audio | 2 ms |
| Headroom | 1.6 ms |

- Target 60 fps; allow 30 fps on minimum devices with low-FX.
- Use `VisibleOnScreenNotifier2D` to pause off-screen animations.
- Cap particles: 64 per burst, 128 on screen; use GPUParticles2D for ash/rain, CPU for hit sparks.
- Pool damage numbers, status icons, and echo trails.

### 9.4 Memory and loading

- Budget: < 250 MB resident; < 150 MB initial download.
- Load districts and battle stages with `ResourceLoader.load_threaded_request`; show a minimal transition.
- Free the previous district after the new one is ready; keep only common UI and audio.
- Stream music (OGG); preload short SFX; unload unused music banks.
- Use `PackedScene` references for common UI; avoid `preload` of every district at boot.
- Monitor with Android Studio Memory Profiler and Godot’s profiler; test a 30-minute session for leaks.

### 9.5 Battery and thermals

- Cap to 60 fps; pause rendering when the app is backgrounded.
- No network polling; analytics batches every 60 seconds or on background.
- No continuous shader animation when idle; the Bell pulse is a tween, not a per-frame shader.
- Test a 25-minute session on a mid-range device; battery drop should be comparable to a video stream, not a 3D game.

---

## 10. Audio implementation

- Buses: Master → Music, SFX, UI, Voice (nonverbal), Ambience. Limiter on Master.
- Music: `AudioStreamInteractive` with 3 layers per exploration track. Transitions on phase, battle, low HP, Resonance, and Day 9.
- SFX: `AudioStreamPlayer` pool of 16; steal the oldest. No more than 8 simultaneous impact sounds.
- Ducking: music -6 dB during dialogue; UI sounds -3 dB under voice; restore over 0.3 s.
- Loudness: -16 LUFS integrated, -1 dBTP; test on phone speakers and earbuds.
- Haptics: short light pulse on tap, medium on hit, bell pattern on memory. Sync to the bell SFX; allow disable.
- No voice-over. The Bell’s “voice” is a sub-bass pulse plus text.
- Audio settings persist in `SettingsService`; apply before the first scene to avoid a loud burst.

---

## 11. Platform integration

### 11.1 Android

- Package ID: `com.<studio>.ninthday` (finalize before first upload; it cannot change).
- Minimum SDK 26 (Android 8.0); target the Play Store’s current required SDK at each release.
- ABI: arm64-v8a only for launch; add armeabi-v7a only if analytics show a meaningful low-end audience.
- Permissions: `INTERNET` (shop/cloud/analytics), `BILLING`, `POST_NOTIFICATIONS` (Android 13+), `VIBRATE`. No location, camera, contacts, or ad ID.
- Back button: pop UI stack; at Bell Map, open exit confirmation; during battle, open pause. Never close the app without confirmation.
- Share: Android `Intent.ACTION_SEND` with the PNG; use a `FileProvider` if required by the plugin.
- Notifications: exact alarms are not needed; use inexact scheduling. Respect Do Not Disturb.
- Billing: Godot Google Play Billing plugin; acknowledge purchases within 3 days; handle pending transactions and restore.
- Build: AAB, keystore stored in GitHub Secrets and an offline backup. Never commit the keystore.

### 11.2 iOS

- Bundle ID matches the Android package where possible.
- Minimum iOS 14; arm64 only.
- StoreKit plugin; handle deferred transactions, restore, and promotional purchases (if enabled later).
- Privacy manifest: declare collected data (none for ads; analytics only with consent), required reason APIs, and tracking domains (none).
- No ATT prompt because there is no tracking. Do not include ad SDKs.
- Safe areas and home indicator: keep bottom actions above the indicator.
- Share: `UIActivityViewController`.
- Build on a macOS CI runner or Codemagic; keep signing certificates and provisioning profiles in secure storage.

### 11.3 In-app purchases

**Catalog:** products are defined in `content/cosmetics/*.tres` and mirrored in the store consoles. The client never trusts local prices; it displays store-provided localized prices when available.

**Entitlement model:**

```gdscript
extends Resource
class_name Entitlement
@export var product_id: StringName
@export var cosmetic_ids: Array[StringName]
@export var granted_at: String
@export var source: StringName  # "purchase", "earned", "patron"
```

**Purchase flow:**

1. Player taps Buy → `ShopService` calls `PlatformIAP.purchase(product_id)`.
2. Native store returns a receipt / purchase token.
3. Client sends the receipt to a Supabase Edge Function.
4. Edge Function verifies with Google Play Developer API or Apple App Store Server API.
5. On success, Edge Function writes the entitlement row (idempotent on transaction ID) and returns the entitlement set.
6. Client caches entitlements, applies cosmetics, and emits `purchase_completed`.
7. On failure, show a clear message and a Restore button. Never grant on client trust alone.

**Restore:** queries the store for owned products, re-verifies, and merges. Available in the Archive and Settings.

**Offline:** cached entitlements are honored for 7 days. After that, cosmetics remain equipped, but the shop shows “Connect to restore purchases.” No gameplay is affected.

**Refunds/chargebacks:** the Edge Function receives store notifications (Google RTDN / Apple App Store Server Notifications) and revokes entitlements if required. Keep an audit log.

### 11.4 Cloud save and auth

- Supabase anonymous auth on first launch (no email required). Optional email link for cross-device.
- Tables:
  - `profiles` (id, created_at, last_seen, locale, consent)
  - `saves` (id, user_id, slot, payload, version, play_time, updated_at)
  - `entitlements` (id, user_id, product_id, transaction_id, source, granted_at)
  - `remote_config` (key, value, updated_at)
  - `purchases_audit` (id, user_id, product_id, platform, transaction_id, status, created_at)
- RLS: users can read/write only their own rows. Entitlements are written only by the Edge Function (service role).
- Rate limits: 10 save uploads/minute, 30 auth requests/minute, 60 config reads/minute.
- Data deletion: Settings → Delete Account → Edge Function deletes profile, saves, entitlements, and analytics identifier; keeps anonymized purchase audit if legally required.

### 11.5 Remote config

- Keys: `shop_enabled`, `cloud_save_enabled`, `maintenance_message`, `min_client_version`, `cosmetic_catalog_version`, `event_banner`.
- Defaults are compiled into the client, so a backend outage never blocks play.
- Fetch on launch and every 6 hours in the background; cache in `user://remote_config.json`.
- Kill switches: disable shop, disable cloud save, force update (only for critical security issues).

### 11.6 Haptics and accessibility platform APIs

- `Input.vibrate_handheld(duration_ms)` for short pulses; sequence patterns with small delays.
- Respect the system haptics setting and an in-game toggle.
- TTS: use Godot’s `TTS` singleton for dialogue read-aloud; list voices, let the player choose speed. TTS is a fallback, not a replacement for good writing.
- Screen reader: expose button labels and focus order; test with TalkBack and VoiceOver on the main flows.

---

## 12. Analytics, crash reporting, and privacy

### 12.1 Event schema

Events are JSON objects with a fixed envelope:

```json
{
  "event": "echo_replayed",
  "timestamp": "2026-10-26T12:34:56Z",
  "anonymous_id": "uuid",
  "session_id": "uuid",
  "app_version": "0.1.0",
  "platform": "android",
  "props": {
    "encounter_id": "day_03_ashwright",
    "action_id": "vent",
    "source": "enemy",
    "turn": 3,
    "resonance": 1
  }
}
```

**Core events:** app_start, consent_changed, tutorial_step, phase_start, phase_complete, battle_start, battle_end, echo_replayed, echo_stolen, wipe, inheritance_pick, bond_rank, memory_anchored, shop_view, purchase_start, purchase_success, purchase_fail, restore, loop_card_share, settings_changed, crash, performance_sample.

No PII, no free-text input, no ad ID, no precise location. The anonymous ID is a random UUID stored locally; deleting the account deletes it.

### 12.2 Consent

- First launch: a short, plain-language consent screen for analytics and crash reporting. Gameplay is fully available if declined.
- Separate toggles for analytics and crash reporting.
- Privacy policy and terms links. No pre-checked boxes.
- Region-aware: GDPR/CCPA/COPPA. The game is not directed to children under 13; age gate if required by store rating.
- Data deletion in Settings; confirmation; completes within 30 days.

### 12.3 Crash reporting

- Sentry Godot SDK; capture exceptions, scene, phase, app version, device model, OS, memory, and a breadcrumb of the last 20 game events (no dialogue text).
- Upload symbols for Android and iOS builds.
- Alert on crash-free sessions < 99.5%; triage within 48 hours.
- No screenshots, no save contents, no personal data.

### 12.4 Performance telemetry

- Sample cold start, scene load, battle turn time, and average fps once per session.
- Sample 1 in 10 sessions to reduce volume.
- Use percentiles (p50, p95) rather than averages.
- Correlate with device tier; do not collect unique device identifiers.

---

## 13. Build, CI/CD, and release

### 13.1 Branches and versioning

- `main`: always shippable; protected.
- `develop`: integration; short-lived feature branches.
- `feature/<id>-<slug>`, `fix/<id>-<slug>`, `content/<id>-<slug>`.
- Semantic version `MAJOR.MINOR.PATCH`; Android `versionCode` monotonically increasing; iOS `CFBundleVersion` matches.
- Tag releases `v0.1.0`; generate a changelog from commit messages.
- Trunk-based with small PRs; no long-lived art branches.

### 13.2 CI pipeline

```yaml
name: build
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Godot tests
        uses: ./.github/actions/godot-test
        with:
          godot-version: "4.x"
      - name: Lint
        run: gdtoolkit parse src/ && gdtoolkit lint src/
      - name: Validate content
        run: godot --headless --script tools/validate_content.gd
      - name: Compile Ink
        run: godot --headless --script tools/compile_ink.gd
  export-android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Export AAB
        uses: ./.github/actions/godot-export-android
        with:
          keystore: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
      - uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: build/android/*.aab
  export-ios:
    needs: test
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Export iOS
        uses: ./.github/actions/godot-export-ios
      - uses: actions/upload-artifact@v4
        with:
          name: ios-ipa
          path: build/ios/*.ipa
```

Use a pinned `godot-ci` Docker image or a custom action; cache the `.godot` import folder; fail on warnings in GDScript. Upload debug symbols to Sentry. Never print secrets.

### 13.3 Environments

| Environment | Backend | Purpose |
|---|---|---|
| `dev` | Supabase dev project | Local and branch builds |
| `staging` | Supabase staging | Internal testing, IAP sandbox |
| `prod` | Supabase prod | Soft launch and global |

Remote config and feature flags are per environment. The client selects the environment at build time via an export feature; never at runtime from user input.

### 13.4 Release process

1. Freeze `main`; run the full test suite and a manual smoke test on 3 devices.
2. Bump version, generate store notes, update screenshots if needed.
3. Build signed AAB/IPA; upload to Play Internal / TestFlight.
4. Run the release checklist: IAP sandbox, restore, cloud save, notifications, share, offline, low storage, time zone, locale, accessibility.
5. Soft launch at 5% → 20% → 100%; monitor crash-free, ANR, D1, purchase failures.
6. Global launch; monitor for 72 hours; hotfix via remote config first, store update second.
7. Post-mortem within one week.

### 13.5 Store assets and compliance

- Screenshots: 6 per platform, portrait, first three show the Echo Track, the cast, and the Loop Card.
- Privacy policy URL, support URL, marketing URL.
- Data safety form and privacy manifest match the actual SDKs.
- Content rating questionnaire: fantasy violence, mild horror, grief themes, no gambling.
- IAP disclosure: “Cosmetics only. The complete story is free.”
- Review notes: explain that the game is free with cosmetic IAP and that no account is required to play.

---

## 14. Testing and QA

### 14.1 Test pyramid

| Level | Tool | Scope |
|---|---|---|
| Unit | GUT | Battle math, Echo rules, save migrations, conditions, shop entitlements |
| Integration | GUT + scene fixtures | Scene flow, dialogue, save/load mid-battle, purchase restore |
| Golden | Custom headless runner | Battle transcripts and event-log hashes |
| Content | `validate_content.gd` | IDs, references, localization, Ink reachability |
| Device | Manual + Firebase Test Lab | Touch, safe areas, interruptions, performance |
| Accessibility | Manual + TTS | Text scale, contrast, focus order, captions |
| Localization | Pseudo-localization + native review | Overflow, fonts, line breaks |

### 14.2 Critical test cases

- Save at every phase boundary; kill the app; resume exactly.
- Save mid-battle at turn start; kill the app; resume with identical state.
- Replay an enemy action that kills the original actor; retarget correctly.
- Replay a healing action at full HP; no overheal, no error.
- Boss steals the Echo Track at 50% HP; the stolen card is visible and unusable.
- Chord triggers at 3 Resonance; consumes Resonance; cannot be replayed.
- Inheritance equip/unequip at Bell Rest; stats update correctly; no duplicates.
- Bond rank up unlocks the correct scene and card.
- Purchase sandbox: success, cancel, pending, restore, refund, offline.
- Cloud save conflict: choose local vs cloud; no data loss.
- Notification permission denied; no crash; no repeated prompt.
- Low storage: save fails gracefully; player is warned.
- Time zone change and DST; notification schedule remains sane.
- Language change; fonts render; no missing glyphs.
- TalkBack/VoiceOver: main flow is navigable; buttons have labels.

### 14.3 Device matrix

| Device | Why |
|---|---|
| Low-end Android (3 GB, 720p) | Performance floor |
| Mid-range Android (6 GB, 1080p) | Primary target |
| High-end Android (12 GB, 1440p) | Full FX |
| Android tablet | Safe area, aspect ratio |
| iPhone SE (small screen) | Text and touch targets |
| iPhone 14/15 | Notch and performance |
| iPad | Layout, split view not supported |

Use Firebase Test Lab for a broad Android sweep; BrowserStack or a small device lab for iOS. No physical SIM testing is needed, but test a phone call interruption during battle.

### 14.4 QA cadence

- **Daily:** CI tests, content validation, one device smoke test.
- **Weekly:** full playthrough of the current act; bug triage; performance sample.
- **Per milestone:** 30 external playtesters, accessibility audit, localization pseudo-pass, store build.
- **Before launch:** 72-hour soak test, purchase/restore matrix, offline matrix, crash-free monitoring.

### 14.5 Bug severity

| Severity | Definition | Response |
|---|---|---|
| S0 | Data loss, crash on launch, purchase failure | Hotfix immediately |
| S1 | Progression blocker, battle softlock | Fix within 24 hours |
| S2 | Major visual/audio bug, accessibility blocker | Fix before next release |
| S3 | Minor visual/UX issue | Backlog |
| S4 | Polish/nice-to-have | Post-launch |

---

## 15. AI-agent development workflow

### 15.1 Principles

1. **You are the showrunner.** Agents propose; you decide. Design, tone, balance, art direction, and every merge remain human.
2. **Small diffs, clear ownership.** One agent, one branch, one feature, one set of allowed paths. No agent edits shared scenes or autoloads without explicit approval.
3. **Tests before trust.** Every behavior change includes a test. Every content change passes the validator.
4. **Canon is code.** The tone bible, character voices, timeline, and rules live in `docs/canon/` and are loaded into every narrative agent’s context.
5. **No silent scope expansion.** Agents implement the task card; they do not add mechanics, rename IDs, or “improve” the design unasked.

### 15.2 Repository contract: `AGENTS.md`

`AGENTS.md` is the first file every agent reads. It contains:

- Project summary and current milestone.
- Architecture map and dependency rules.
- Commands: run tests, lint, validate content, export Android.
- Code style: typed GDScript, naming, signals, no `get_node("../../..")`.
- File ownership: which paths an agent may edit for the current task.
- Definition of done and review checklist.
- “Never touch” list: `project.godot`, export presets, keystore, production backend secrets, `main` branch.
- Links to canon, schemas, ADRs, and the current task board.

### 15.3 Agent roles

| Agent | Owns | Allowed paths | Must not |
|---|---|---|---|
| **Narrative drafter** | Scene drafts, barks, bond beats | `content/ink/`, `docs/canon/drafts/` | Change flags without approval; write final canon |
| **Content compiler** | `.tres` definitions, encounter data, localization CSV | `content/`, `content/localization/` | Change schemas; invent IDs |
| **Systems programmer** | Battle sim, save, progression | `src/battle/`, `src/core/`, `tests/unit/` | Touch UI scenes; change public APIs without ADR |
| **UI implementer** | Screens, widgets, theme | `src/ui/`, `src/world/`, `src/battle/*_view.*` | Change domain logic; add new fonts |
| **Test writer** | Unit, integration, golden tests | `tests/` | Change production code |
| **Build engineer** | CI, export presets, tooling | `.github/`, `tools/`, `export_presets.cfg` | Touch gameplay code; print secrets |
| **Localization prep** | String extraction, pseudo-locale, font checks | `content/localization/`, `tools/` | Translate final copy without review |
| **Balance simulator** | Headless battle runs, reports | `tools/simulate_balance.gd`, `tests/golden/` | Change balance values directly |

### 15.4 Task card template

```md
# Task: <short title>
## Goal
<one paragraph, player-visible outcome>
## Context
- Milestone:
- Related GDD section:
- Canon references:
- Existing code:
## Allowed paths
- src/...
- content/...
## Acceptance criteria
- [ ] Behavior:
- [ ] Tests:
- [ ] Content validation:
- [ ] Accessibility:
- [ ] Performance:
## Out of scope
- ...
## Verification commands
- godot --headless --script tools/validate_content.gd
- godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gexit
## Notes for the agent
- Do not rename IDs.
- Do not edit shared scenes.
```

### 15.5 Validation gates

Every agent change must pass, in order:

1. `gdtoolkit parse` and `gdtoolkit lint` (no new warnings).
2. GUT unit tests (all green).
3. Content validator (IDs, references, localization keys, Ink compile).
4. Golden battle tests (event-log hashes unchanged unless intentionally updated).
5. Android debug export smoke test (boot to title, load a save, enter battle).
6. Human review of the diff, with a focus on design intent and edge cases.

If a gate fails, the agent fixes it or stops and reports. It does not disable the test.

### 15.6 Parallelization

- Use git worktrees for independent tasks. One worktree per agent, one branch.
- Never run two agents on the same file or scene.
- Shared interfaces (autoloads, `BattleSim` public methods, save schema) are changed only by a human-coordinated task.
- Integrate daily. Long-lived agent branches rot.
- Keep a “merge queue”: one agent’s change lands at a time; run the full suite after each merge.

### 15.7 Review checklist

- Does it match the GDD and canon?
- Is the code typed and readable?
- Are edge cases handled (dead targets, empty party, offline, no consent)?
- Are strings localized and IDs stable?
- Is the UI accessible (touch target, contrast, text scale)?
- Is the performance cost acceptable on a low-end device?
- Are tests meaningful, not just coverage theater?
- Is there any secret, PII, or license issue?
- Does it add scope? If yes, stop.

### 15.8 AI art, audio, and writing policy

- **Concept art:** AI-assisted mood boards and thumbnails are allowed. Final character portraits, key art, and store art are human-made or human-painted over AI drafts, with disclosure where required.
- **Writing:** AI drafts are allowed. Final prose is human-edited for voice, continuity, and sensitivity. Agents must cite the canon and never invent new lore without a flag.
- **Music:** commissioned from a human composer; AI-generated music is not used at launch.
- **Voice:** no voice-over; no AI voice cloning.
- **Licensing:** every font, texture, sound, and plugin has a recorded license in `docs/licenses.md`. No “borrowed” assets.

### 15.9 Security for agents

- No production secrets in prompts, repos, or logs. Use placeholder env vars.
- No running untrusted code from an agent without review.
- Pin dependencies; review every new addon.
- Agents must not access the production Supabase project, store consoles, or signing keys.
- Rotate keys if a secret is exposed. Assume prompts may be logged.

### 15.10 Human cadence

- **Monday:** choose 3 tasks (one systems, one content, one polish); write task cards.
- **Tuesday–Thursday:** build, review, integrate; agents run in parallel on independent paths.
- **Friday:** play the build, run a device smoke test, write a devlog, cut scope.
- **Sunday:** rest. Burnout is the biggest solo risk.

---

## 16. Milestones and acceptance criteria

### M0 — Proof (weeks 1–6)

**Deliverable:** paper Echo prototype + Godot greybox battle with 3 enemies and 1 boss.

- [ ] Echo Track records, replays, and steals correctly.
- [ ] Deterministic battle sim with golden tests.
- [ ] Portrait battle UI readable at 720 × 1280.
- [ ] 60 fps on a low-end Android device.
- [ ] 8/10 playtesters ask “what if I replay that?”
- **Gate:** if the Echo loop is not fun, stop and redesign before writing story.

### M1 — Vertical slice (months 2–4)

**Deliverable:** Day 1 loop, one district, 2 party members, 1 boss, 25 minutes, save/resume, Android build.

- [ ] Ink dialogue with portraits, choices, and line IDs.
- [ ] Bell Map, Bell Rest, Inheritance choice, Journal.
- [ ] Autosave and mid-battle resume.
- [ ] Touch targets and safe areas pass on 3 devices.
- [ ] Crash-free 99% in internal testing.
- [ ] 30 external playtesters; tutorial completion > 80%.
- **Gate:** green-light production or cut scope.

### M2 — Systems complete (months 5–7)

**Deliverable:** full UI kit, all core systems, cosmetics sandbox, backend, localization pipeline.

- [ ] Battle sim content-complete (12 enemy types, 6 bosses).
- [ ] Inheritances, bonds, flags, endings stubbed.
- [ ] Shop sandbox with fake entitlements; restore flow.
- [ ] Cloud save with conflict resolution.
- [ ] Content validator and Ink ID extractor in CI.
- [ ] Cold start < 2 s on mid-range Android.
- **Gate:** no new mechanics after this point.

### M3 — Alpha / Act One (months 8–9)

**Deliverable:** Days 1–3, two districts, 3 party members, 2 bosses.

- [ ] Full playthrough of Act One without developer intervention.
- [ ] All Act One content localized-ready.
- [ ] Accessibility pass on Act One.
- [ ] Performance stable on minimum device.
- **Gate:** external playtest NPS > 30; no S0/S1 bugs.

### M4 — Beta / content complete (months 10–13)

**Deliverable:** Days 1–9, all endings, final boss, cosmetics, store builds.

- [ ] Content complete; all critical paths tested.
- [ ] 3 endings + true ending reachable.
- [ ] IAP sandbox success/cancel/pending/restore/refund.
- [ ] Cloud save, notifications, share, TTS.
- [ ] Accessibility audit passed.
- [ ] Store assets and privacy forms ready.
- **Gate:** crash-free 99.5%; tutorial 80%; completion 30% in beta cohort.

### M5 — Soft launch (month 14)

**Deliverable:** Android soft launch in 3 markets.

- [ ] 5% → 20% → 100% rollout.
- [ ] D1 35%, D7 12%, conversion 2%+.
- [ ] No S0/S1 bugs in 72-hour soak.
- **Gate:** global launch or Plan B premium pivot.

### M6 — Global launch (month 15)

**Deliverable:** Android + iOS worldwide.

- [ ] Store featuring pitch submitted.
- [ ] Launch trailer, press kit, creator keys.
- [ ] 72-hour live monitoring and hotfix plan.
- **Gate:** stable, profitable enough to continue, or pivot.

---

## 17. Technical risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Determinism bug in battle sim | Medium | High | Pure domain, integer math, golden tests, fuzz |
| Save corruption | Low | High | Atomic writes, backups, migrations, cloud |
| Godot mobile plugin breaks | Medium | High | Wrap plugins, pin versions, test early, fallback |
| iOS build/signing friction | Medium | Medium | macOS CI from M1, not at the end |
| IAP receipt validation complexity | Medium | High | Server-side edge functions, sandbox matrix, idempotency |
| Low-end performance | High | Medium | Low-FX mode, device tests from week 1, frame budget |
| Ink localization fragility | Medium | Medium | Stable line IDs, extractor, pseudo-locale, validator |
| Cloud save conflicts | Medium | Medium | Manual choice, never silent overwrite, backups |
| Backend outage | Medium | Low | Offline-first, compiled defaults, queue |
| AI agent code quality | High | Medium | Small diffs, tests, review, allowed paths |
| Scope creep | High | High | Cut list, milestone gates, no new mechanics after M2 |
| Store rejection | Low | High | Compliance review, privacy manifest, review notes |
| Free-to-play revenue shortfall | High | High | Plan B premium, Patron’s Archive, marketing |
| Burnout | High | High | 5-day weeks, monthly break, cut list |

---

## 18. Appendices

### 18.1 Analytics event list

| Event | Props | When |
|---|---|---|
| `app_start` | version, platform, cold_start_ms | Launch |
| `consent_changed` | analytics, crash | Settings/first run |
| `tutorial_step` | step_id, completed | Onboarding |
| `phase_start` | phase_id, day, cycle | Enter phase |
| `phase_complete` | phase_id, duration_s, battle_count | Bell Rest |
| `battle_start` | encounter_id, party_ids, difficulty | Battle start |
| `battle_end` | encounter_id, result, turns, duration_s, echo_used, echo_source | Battle end |
| `echo_replayed` | encounter_id, action_id, source, turn, resonance | Replay |
| `echo_stolen` | encounter_id, action_id, turn | Boss steal |
| `wipe` | encounter_id, turn, party_ids | Defeat |
| `inheritance_pick` | card_id, type, phase_id | Bell Rest |
| `bond_rank` | bond_id, rank, phase_id | Rank up |
| `memory_anchored` | memory_id, phase_id | Anchor |
| `shop_view` | source | Archive |
| `purchase_start` | product_id, price | Buy tap |
| `purchase_success` | product_id, price, platform | Verified |
| `purchase_fail` | product_id, reason | Failure |
| `restore` | result, count | Restore |
| `loop_card_share` | day, frame_id, method | Share |
| `settings_changed` | key, value | Settings |
| `performance_sample` | cold_start_ms, avg_fps, p95_turn_ms, memory_mb | Once/session |

### 18.2 Content validator checks

```
[ ] Unique IDs: skills, enemies, encounters, inheritances, cosmetics, phases, line tags
[ ] All references resolve (skill, enemy, portrait, background, music, sfx)
[ ] Every localization key exists; no empty translations
[ ] Every Ink file compiles; every knot reachable
[ ] Every phase has a Bell Rest and autosave
[ ] Every encounter has victory/defeat handling
[ ] Every ending has a reachable flag path
[ ] No line > 240 chars; warn > 180
[ ] No duplicate line IDs; no unused flags
[ ] No missing portraits/expressions for speakers
[ ] Cosmetics have price, category, entitlement ID, preview image
[ ] Shop products match store console IDs
```

### 18.3 Tooling

| Tool | Purpose |
|---|---|
| Godot 4.x | Engine |
| inkgd | Ink runtime |
| GUT | Unit/integration tests |
| gdtoolkit | Parser/linter/formatter |
| Sentry Godot | Crash reporting |
| PostHog | Product analytics |
| Supabase | Auth, cloud save, entitlements, remote config |
| GitHub Actions | CI |
| fastlane | Store upload (optional) |
| Firebase Test Lab | Android device sweep |
| Aseprite / Krita / Inkscape | Art production |
| Audacity / Reaper | Audio editing |
| Ink CLI | Story compile/validation |

### 18.4 Glossary

- **AAB:** Android App Bundle.
- **ADR:** Architecture Decision Record.
- **Chord:** party ultimate triggered by Resonance.
- **Echo Track:** the last 3–4 actions in battle.
- **Entitlement:** a verified right to a cosmetic.
- **GUT:** Godot Unit Test framework.
- **Ink:** narrative scripting language by inkle.
- **RLS:** Row Level Security in Supabase.
- **Resonance:** resource built by replays.
- **Tone:** Bell, Ember, or Hush.
- **TTFD:** time to first decision (onboarding metric).

### 18.5 Open technical questions

1. Do we use Godot’s `TTS` for all dialogue, or only on request? TTS quality varies by device.
2. Can the share plugin reliably save to Photos on iOS without extra permissions? Test early; fallback to share sheet.
3. Do we need a server-side “receipt-less” restore for users who switch platforms? Plan: store entitlements by account, not platform.
4. Is Supabase’s free tier sufficient for soft launch? Estimate: 10k MAU, 1 save/phase, 5 MB/user; likely yes, but budget for Pro.
5. Do we need a web demo for festivals? Godot web export is possible, but the shop and cloud must be stripped. Decide at M4.
6. How do we handle time-zone changes for notifications? Reschedule on app open; use local time, not UTC.
7. Do we localize at launch or Year 1? English launch, Year 1 localization if metrics support. Japanese is the first priority for JRPG audience.
8. Is the Patron’s Archive a single product or a bundle of three? Single product simplifies store compliance and refunds.

---

*End of Technical Specification. The design intent and content plan are in `GDD.md`.*

