# NINTH DAY
## Game Design Document

**Version:** 0.1 — Pre-production  
**Date:** 26 October 2026  
**Owner:** Solo developer + AI agents  
**Platform:** Android first, iOS global; PC/console considered post-launch  
**Engine:** Godot 4.x, Mobile renderer, typed GDScript  
**Business model:** Free-to-play; complete story free; cosmetics only  
**Document status:** Direction approved, ready for prototype

---

## 0. Document control

| Item | Detail |
|---|---|
| One-line pitch | A dark, elegant time-loop JRPG about the only person who remembers a city’s last nine days. |
| Player fantasy | “I am the one who remembers, and I will use the city’s own past against it.” |
| Genre | Turn-based JRPG / narrative RPG / time-loop mystery |
| Session length | 15–25 minutes per phase |
| Main story | 5–6 hours first completion; 8–10 hours for the true ending |
| Tone | Melancholy, intimate, quietly eerie, dryly funny; never gratuitous |
| Audience | Narrative RPG players 18–40, mobile commuters, time-loop fiction fans |
| Comparable works | *Chrono Trigger*, *Persona*, *Outer Wilds*, *Hades*, *Groundhog Day*, *The Sexy Brutale* |
| Anti-comparables | Gacha RPGs, idle RPGs, open-world checklist games, grimdark gore |

**Related documents:** `TECH_SPEC.md`, Canon Bible, Art Bible, Audio Bible, Production Plan.

---

## 1. Executive summary

**NINTH DAY** is a portrait-mode, one-thumb turn-based JRPG set in Aurel, a city caught in the last nine days before the Quiet. You are Cael, the last Bellkeeper: the only person who wakes up again and remembers. Each 15–25 minute phase, you explore, talk, fight, and anchor a memory. At every Bell Rest you choose one **Inheritance** — a skill, a stat, or a bond — that survives the reset. At the end of Day 9, the Bell stops, the city forgets, and time folds back to Day 1.

The hook is that **the theme, the combat, and the mobile format are the same idea**: loops.

Combat is built around the **Echo Track**, a visible record of the last three actions in battle. Once per fight, you may replay any action on that track for free — your own, or the enemy’s. Bosses can steal your track and use it against you. Replaying builds **Resonance**; three stacks trigger a **Chord**, a party-wide ultimate. Every fight is a small, readable puzzle that fits on one screen and one thumb.

The story is authored, not procedural. The loop is a structure for revisiting a city with new knowledge: a locked door seen on Day 6 can be opened on Day 2; a baker who does not remember her husband can be taught to remember him through a recipe; a child’s drawing can reveal a route that does not exist yet. The game is dark but not cruel. Its central question is not “Can you save the city?” but “What is worth remembering, and what is mercy?”

The business model is deliberately ethical: the complete story is free. There are no ads, no energy timers, no gacha, and no pay-to-win. Revenue comes from cosmetic self-expression — outfits, bell skins, ink styles, journal themes, Echo effects, Loop Card frames — and an optional Patron’s Archive bundle containing the soundtrack, art book, and developer commentary. The promise is the marketing: **no paywalls, no timers, just the loop.**

**Scope at launch:** 4 districts, 27 phase nodes, 4 recruitable companions, 6 bosses plus a final encounter, 12 enemy types, 3 endings, 35,000–45,000 words, 5–6 hours of main story. Solo-built with AI agents and a small bench of commissioned artists, a composer, and localizers. Target: 15 months plus buffer, Android soft launch first.

---

## 2. Vision, pillars, and anti-pillars

### 2.1 Experience statement

The player should feel like a lamplighter walking through a city at dusk: everyone is going home, the streets are beautiful, and something is deeply wrong. They should feel the thrill of recognition — “I know what happens next, and this time I can change it” — followed by the ache of consequences that cannot be undone. Combat should feel like conducting a small orchestra of remembered violence. The UI should feel like brass and paper. The music should feel like a lullaby with one wrong note.

### 2.2 Design pillars

1. **Memory is the only stat.** Levels reset. Knowledge, relationships, and Inheritances persist. The player’s real progression is what they understand about Aurel and its people.
2. **Everything is a loop.** The narrative structure, the Echo Track, the Bell Map, the daily schedules, the music, and the session format all rhyme.
3. **One thumb, one screen, one clear choice.** Portrait play. Large targets. No hidden math. A battle should be readable in three seconds.
4. **The city notices.** NPC schedules, dialogue, prices, doors, and enemy patrols change by day and phase. Revisiting is never a copy-paste.
5. **Ethical free-to-play.** The story is complete and free. Cosmetics are direct, visible, and never gate progress.

### 2.3 Anti-pillars

- No open world. Four dense districts beat a continent of empty space.
- No random loot, crafting trees, or inventory management. Builds come from Inheritances.
- No gacha, loot boxes, energy, ads, battle passes, or limited-time story.
- No mandatory multiplayer, guilds, or live-service pressure.
- No permadeath of story content. A wipe rewinds the battle, not the relationship.
- No grimdark misery. The tone is elegant, not exhaustingly bleak.
- No fake choices. A choice must change a scene, a relationship, a route, or an ending.

### 2.4 Emotional targets

The game should move through four emotional registers:

- **Dread:** the ninth day approaches; the Bell is cracking; the city is too quiet.
- **Tenderness:** small rituals — baking bread, winding a watch, drawing a bird — hold the world together.
- **Recognition:** the pleasure of returning with knowledge and being right.
- **Defiance:** the choice to remember even when forgetting would be kinder.

### 2.5 Inspirations and what to borrow

| Work | Borrow | Do not borrow |
|---|---|---|
| *Chrono Trigger* | Party chemistry, readable turn-based combat, tight pacing | Length, silent-protagonist blankness, grind |
| *Persona* | Daily structure, social bonds, style, music | Calendar bloat, school setting, 100-hour scope |
| *Outer Wilds* | Knowledge as progression, a handcrafted loop | 3D navigation, fragile physics, no combat |
| *Hades* | Repeatable runs, narrative reacting to repetition | Roguelike randomness, action combat |
| *Groundhog Day* | Warmth, humor, moral growth through repetition | Passive protagonist, romantic comedy resolution |
| *The Sexy Brutale* | Time-loop mystery, elegant diorama spaces | Puzzle-adventure density, fixed camera confusion |

### 2.6 Target audience and positioning

**Primary:** players who love narrative JRPGs but no longer have 80 hours; commuters who want a complete, intelligent mobile game; fans of time-loop fiction and dark cozy aesthetics.

**Secondary:** players who enjoy tactical puzzles; accessibility-first players; fans of atmospheric indie RPGs; viewers who watch narrative games on YouTube/TikTok.

**Positioning:** “A complete time-loop JRPG in your pocket. No paywalls. No energy. Just the loop.” The store page should lead with the Echo Track, the portrait combat, and the ethical model.

---

## 3. World and fiction

### 3.1 The high concept

Aurel is a city built around the **Bell of Aurel**, a bronze bell the size of a cathedral. The Bell does not just mark time; it holds the city’s memory. For three hundred years, the Bellkeepers rang it at dawn and dusk, and the city remembered itself. Then the Bell cracked. Now Aurel is caught in the last nine days before the **Quiet** — the moment the Bell stops and the city forgets.

Most people do not know they are looping. They feel déjà vu, find the same letter unopened, burn the same bread, miss the same train. A few feel the loop as a splinter under the skin. Only a **Bellkeeper** remembers everything. You are Cael, the last apprentice of Wren, the Bellkeeper who vanished on the first Day 9. You wake each cycle with a cracked hand bell, a journal that writes itself, and the knowledge that no one will believe you.

### 3.2 The rules of the loop

1. **The cycle is nine days.** It begins at dawn on Day 1 and ends when the Bell stops on Day 9. Then it resets.
2. **Cael remembers everything.** Companions remember only what has been **anchored** — a taste, a song, a drawing, an object, a promise. Anchoring is the core narrative act.
3. **Knowledge persists.** You can revisit any unlocked day and phase through the **Bell Map**. A door you saw on Day 6 can be opened on Day 2 if you know it exists.
4. **Changes persist only if anchored.** A saved life, a repaired machine, a repaired relationship — if it is not anchored, the reset erases it. Anchoring costs something: time, a memory, or a piece of Cael.
5. **The Quiet is not death.** It is the cessation of remembrance. People become hollow: calm, polite, repeating routines, no longer able to recognize the people they loved. The city becomes a beautiful museum of itself.
6. **The Bell can be rung, broken, or become.** The three endings follow from those verbs.

### 3.3 The Bell, the Ember, and the Quiet

- **The Bell** is an ancient machine of memory. Its tones are **Bell** (order, light, revelation), **Ember** (heat, change, desire), and **Hush** (stillness, cold, forgetting). The three tones are the combat triangle.
- **The Ember** is memory made visible: gold leaf in the air, ink that refuses to dry, a warmth in the chest when someone remembers. It is beautiful and dangerous. Too much Ember and a person becomes a ghost of their own past.
- **The Quiet** is the absence of resonance. It is not evil. It is what happens when a city decides to stop hurting. The Choir worships it; the Watch fears it; the Lamplighters resist it.

### 3.4 The city of Aurel

Aurel is a vertical city of brass, brick, and rain, built around the Spire. Four districts are playable at launch; the Spire is the final dungeon.

| District | Identity | Mood | Key characters | Day-state changes |
|---|---|---|---|---|
| **Ember Row** | Market, bakeries, tenements, ash rain | Warm, crowded, fragile | Mara Voss, Elias, the market choir | Stalls close; Watch checkpoints tighten; ash falls heavier |
| **The Bellows** | Foundries, clockworks, the Bell’s counterweights | Industrial, vertical, deafening | Iven Sorn, Lise, the Ashwright | Steam vents open; automation patrols increase; a furnace goes cold |
| **Saint Orra** | Cathedral, choir school, memory gardens | Beautiful, quiet, eerie | Sister Oria, Cantor Vey | Choir processions; candles gutter; the gardens bloom in reverse |
| **The Quiet** | Unmade district at the city’s edge | Monochrome, impossible, tender | Toma, Wren’s house, the Hollow | Rooms appear and disappear; drawings become doors; silence has weight |

### 3.5 Factions

- **The Watch** — civil order. Led by Captain Sera Vane. They believe the Bell must be rung on schedule, whatever the cost. They are not villains; they are afraid.
- **The Hollow Choir** — those who chose to forget. Led by Cantor Vey. They believe memory is a wound and the Quiet is mercy. They sing the Bell to sleep.
- **The Lamplighters** — memory-keepers. Scattered, superstitious, practical. Mara is one. They anchor memories in lamps, recipes, songs, and tattoos.
- **The Bellkeepers** — Cael and Wren. Extinct, or nearly. Their job was to listen, not to rule.
- **The Clockwork Saint** — the Bell’s automaton guardian. It has rung the Bell for centuries. It has decided that an eternal reset is the only way to preserve Aurel. It is the penultimate boss and the story’s tragic engine.

### 3.6 History

Three hundred years ago, Aurel was a mining town on the edge of a dead sea. The first Bellkeeper rang a bronze bell to call the workers home during a storm; the bell held their memories and the town survived. The Bell was cast larger, then larger. The city grew around it. The Bellkeepers became a guild, then a bureaucracy, then a superstition. Fifty years ago, a previous cycle ended badly: the Bell cracked, the city forgot, and the Watch covered it up. The current crack is older than anyone admits. Wren discovered the truth and tried to save one person instead of the city. That choice is the origin of the current loop — and the mirror Cael must face.

### 3.7 Tone bible

- **Prose:** concrete, sensory, restrained. Short sentences in tension; longer sentences in tenderness. Avoid purple abstraction. A bell is a bell, not a “sonorous emblem of temporal anxiety.”
- **Dialogue:** people talk past each other. They interrupt, mishear, change the subject. Humor is dry and human, never quippy. No modern slang unless a character would use it.
- **Violence:** stylized and consequential. Ink, sparks, breath. No gore. A defeat is a bell tone and a held hand, not a corpse.
- **Horror:** the uncanny of ordinary things — a teacup that refills itself, a street that repeats, a child who draws you before you arrive. No jump scares.
- **Hope:** earned, small, specific. A recipe remembered. A name spoken. A door left open.
- **Content warnings:** grief, memory loss, self-erasure, mild body horror (hollowing), depictions of panic, mentions of off-screen death. No sexual violence, no animal cruelty, no gore.

---

## 4. Cast

### 4.1 Cael, the Bellkeeper (player character)

**Age:** 19. **Role:** flexible leader. **Weapon:** cracked hand bell and a short iron rod. **Voice:** mostly silent; the player chooses short, deliberate lines (usually two or three options). Cael is named by default but can be renamed; there is no voice-over, so text replacement is safe.

Cael was Wren’s apprentice. They remember the first Day 9 — the Bell stopping, the city going quiet, Wren walking into the Spire and not coming back. They woke on Day 1 with the hand bell and a journal in Wren’s handwriting. The journal fills itself as Cael learns. Cael’s defining trait is **attention**: they notice the thing everyone else is too busy to see.

**Customization:** outfit layers (coat, inner layer, accessory, bell skin), three “Reasons” chosen at the start — **Remember**, **Atone**, or **Escape**. The Reason colors dialogue options and unlocks one exclusive Inheritance branch; it does not lock endings. Cosmetic outfits are visible in portraits, battle, and Loop Cards.

**Combat identity:** Cael is the Echo specialist. Their unique passive, **Listen**, reveals the next two enemy intents at the start of battle. Their Chord, **Toll**, deals Bell damage and extends Resonance by one turn. The player chooses Cael’s two active skills at each Bell Rest, making them the build-flex slot.

### 4.2 Mara Voss

**Age:** 34. **Role:** Guardian. **Weapon:** iron peel. **Voice:** warm, blunt, superstitious; talks with her hands; uses food as metaphor and memory.

Mara runs a bakery in Ember Row and is a Lamplighter by inheritance. She remembers through taste. Her husband **Elias** was taken by the Quiet on Day 3 of the first cycle; in the current loop she does not remember him, only a feeling that the kitchen is too large. If Cael anchors a memory — a recipe, a song, the smell of burnt sugar — Mara begins to remember, and the bakery changes.

**Echo passive — Second Helping:** the first time Mara replays an ally’s action each battle, it triggers twice at 60% power.  
**Arc:** grief versus the mercy of forgetting. Her bond determines whether she chooses to remember Elias, let him go, or turn him into a Lamplighter memory.  
**Combat kit:** taunt, shields, Ember cleaves, a team-wide “Sunday Breakfast” heal that costs her own HP.

### 4.3 Iven Sorn

**Age:** 41. **Role:** Controller. **Weapon:** clockwork arbalest. **Voice:** precise, anxious, proud; corrects people mid-sentence; apologizes with objects rather than words.

Iven was a Watch engineer until his daughter **Lise** was hollowed in an industrial accident the Watch covered up. He keeps rebuilding her music box; it never plays the same tune twice. He remembers through patterns and believes the loop can be solved like a mechanism. He is usually wrong, and it costs him.

**Echo passive — Ratchet:** Iven’s Echo Track holds four actions instead of three. His replays can reach further back, at the cost of a longer cooldown.  
**Arc:** control versus acceptance. His bond determines whether he rebuilds Lise, lets her rest, or turns her music box into a weapon against the Bell.  
**Combat kit:** slow, silence, turn-order manipulation, precision damage, a “Reset the Day” once-per-battle rewind of the last enemy action.

### 4.4 Sister Oria

**Age:** 28. **Role:** Mender. **Weapon:** bell staff. **Voice:** dry, devout, fierce; quotes scripture and then argues with it; laughs rarely and suddenly.

Oria was a bell-runner in Saint Orra until she heard the Choir sing the Bell to sleep and realized she agreed with them. She stayed to keep the memory gardens alive. She remembers through song. Her faith is not naive; it is a daily, exhausted choice.

**Echo passive — Refrain:** when Oria replays a healing or support action, the lowest-HP ally also receives 30% of the effect.  
**Arc:** faith versus doubt. Her bond determines whether she becomes the next Cantor, breaks the Choir, or founds something new.  
**Combat kit:** heals, cleanses, Bell wards, a “Requiem” that turns a fallen ally’s last action into a free Echo.

### 4.5 Toma

**Age:** 12. **Role:** Seer. **Weapon:** chalk. **Voice:** eerie, kind, hungry; says exactly what they mean; draws while talking; asks questions adults avoid.

Toma lives in the Quiet, in a house that may be Wren’s. They draw tomorrow. Sometimes tomorrow draws back. They remember through pictures: a bird, a door, a hand. They are not a chosen one; they are a child who has been alone too long and is trying very hard to be helpful.

**Echo passive — Trace:** Toma sees enemy intent one turn earlier. When Toma replays an enemy action, the enemy’s weakness is revealed for the rest of the battle.  
**Arc:** innocence versus the Quiet. Their bond determines whether they stay a child, become a Bellkeeper, or choose to be forgotten so the city can move on.  
**Combat kit:** debuffs, intel, summons chalk familiars, a “Blueprint” that copies an enemy’s next action.

### 4.6 Antagonists and pivotal NPCs

- **Wren, the Hollow Bellkeeper.** Cael’s predecessor. Chose to forget after failing to save someone. Appears as a mentor, a ghost, and finally the face of the Quiet. The mirror Cael must not become.
- **Cantor Vey.** Leader of the Hollow Choir. Kind, patient, genuinely convinced that memory is suffering. Offers the player a real choice: forget one companion and save the city, or refuse and carry the cost.
- **Captain Sera Vane.** Watch commander. Order above all. Can become an ally, an obstacle, or the person who rings the Bell on Day 9. Her arc is about the difference between protecting people and controlling them.
- **Elias Voss.** Mara’s husband. Hollowed. A gentle man who repeats the same joke. His presence is the game’s most intimate horror.
- **Lise Sorn.** Iven’s daughter. Hollowed. Her music box is a collectible, a key, and a weapon.
- **The Clockwork Saint.** The Bell’s guardian. Speaks in bell tones and fragmented liturgy. Believes eternal reset is preservation. Penultimate boss.
- **The Quiet.** The final encounter. It takes the shape of Wren, then the party, then Cael. It does not hate you. It asks you to stop.

### 4.7 Relationship arcs

Six bonds, each with three beats across the nine days. A bond rank unlocks dialogue, a shortcut, an Inheritance card, and a Day 9 scene. No romance is mandatory; two optional slow-burn routes (Mara or Oria) are available if the player pursues them, but the bonds are written to stand alone. Bond progress is visible in the Journal as a small brass meter, not a number.

| Bond | Beat 1 | Beat 2 | Beat 3 |
|---|---|---|---|
| Mara | Share a recipe | Remember Elias | Choose what to keep |
| Iven | Repair the music box | Confront the Watch | Let Lise rest |
| Oria | Argue about the Choir | Sing the old bell down | Choose a new faith |
| Toma | Draw a door | Meet Wren’s echo | Choose a childhood |
| Sera | Save a Watch officer | Expose the cover-up | Decide who rings the Bell |
| Vey | Listen to the Choir | Visit the Quiet | Offer or refuse mercy |

---

## 5. Core loop and structure

### 5.1 The session loop

A session is one **phase** of one day: Morning, Afternoon, or Night. 15–25 minutes.

1. **Open the Journal.** A one-screen recap: where you are, what you know, who is waiting. If returning after a break, a two-line “previously.”
2. **Choose a phase on the Bell Map.** Unlocked days and phases are brass cards. Optional phases glow faintly. The game always tells you what kind of scene it is (story, battle, bond, mystery) without spoiling.
3. **Play the phase.** Explore an illustrated district, talk, investigate, and fight. Most phases contain one battle and one meaningful choice.
4. **Bell Rest.** At the end of the phase, choose one **Inheritance** from three cards. Save. The Journal writes a line.
5. **Optional hook.** A short tease of what changed, or a “next thread” prompt. No streak pressure. Close the app whenever.

A full **cycle** is nine days, 27 phases. The first completion takes about 18 mandatory phases; the rest are optional or alternate. After Day 9, the Quiet resets the cycle, levels reset, and Inheritances and anchored bonds persist.

### 5.2 The Bell Map

The Bell Map is the hub. It shows nine days as vertical brass rings, each with three phase nodes. Completed nodes are stamped; new nodes are lit; locked nodes are dark. Tapping a node shows a short card: location, characters present, and whether it is story-critical, optional, or a replay.

**Replay rules:** any unlocked node can be revisited. Revisited story scenes offer “Echo” dialogue — new lines based on what you know now — and a skip option for prose already read. Revisited battles scale to the current phase and offer a “Remnant” modifier for extra challenge. The game never forces a full replay of a solved puzzle.

**Unlocking:** Day 1 is open. Each day unlocks the next when its critical node is completed. Some phases unlock only through bonds or knowledge flags (e.g., Day 6 Night requires either Sera’s trust or Vey’s invitation).

### 5.3 Bell Rest and Inheritances

At the end of every phase, the Bell rings once and the player chooses one of three Inheritance cards:

- **Skill** — a new active or passive ability.
- **Stat** — HP, Resolve, speed, tone potency, or Echo capacity.
- **Bond** — a relationship rank, a shortcut, or a scene key.

The player has **six active Inheritance slots**. Cards not equipped go to the Archive and can be swapped at any Bell Rest. This keeps the build readable on a phone and makes each choice matter without overwhelming the player. There are 40–50 Inheritance cards; a single cycle offers about 27 choices, so no two runs are identical.

Inheritance cards are diegetic: each is a memory Cael keeps. Their art is a small ink sketch on a card. The card’s name is what Cael remembers: “The Smell of Burnt Sugar,” “Iven’s Steady Hand,” “The Bell That Rings Backwards.”

### 5.4 Progression

- **Levels:** characters auto-level at phase milestones. No XP grinding. Levels reset at the Quiet.
- **Power:** comes from Inheritances, party composition, and knowledge. A player who understands a boss can beat it two levels under.
- **Memories:** narrative keys, not equipment. They unlock doors, dialogue, and scenes.
- **No inventory:** consumables are limited to three “Remedies” per phase, replenished at Bell Rest. No hoarding, no crafting.
- **Difficulty:** Story, Standard, Bellkeeper. Story reduces enemy damage and enables full auto-battle. Bellkeeper adds enemy intent complexity; it never adds timed inputs — instead, enemies gain one extra Echo and bosses use their steal earlier. All difficulties can be changed mid-game.

### 5.5 Day-by-day beat sheet

| Day | Title | Critical beats | Boss / set piece |
|---|---|---|---|
| **1** | The Crack | Cael wakes in the Spire; the Bell cracks at noon; meets Mara; first Echo battle; first reset | **The Hollow Choir** (tutorial) |
| **2** | The Debt | Ember Row market; Elias is missing; Iven introduced; Watch checkpoint; anchor a memory | **Watch Hound** (elite) |
| **3** | The Bellows | Descend into the foundry; the counterweights fail; Iven joins; the Choir’s offer | **The Ashwright** |
| **4** | Saint Orra | Oria introduced; the memory gardens; the Choir’s song; the first Wren sighting | **The Clockwork Saint** (scripted retreat) |
| **5** | The Quiet | Toma found; Wren’s house; the truth of the first crack; Toma joins | **The Hollow Bellkeeper** |
| **6** | The Watch | Sera’s coup; districts lock down; choose an alliance; a companion may be hollowed | **The Iron Choir** or **Sera Vane** |
| **7** | The Offer | Vey’s sanctuary; the Quiet’s mercy; a day without combat if the player chooses | **The Saint of Ash** (optional) |
| **8** | The Spire | Ascend the Bell tower; the Clockwork Saint; sacrifice a district’s memory | **The Clockwork Saint** |
| **9** | The Quiet | The Bell stops; the final encounter; three endings | **The Quiet** |

### 5.6 The three endings

1. **Ring the Bell.** Cael rings the cracked Bell and becomes the next Bellkeeper. The city survives, but the loop continues. Bittersweet; the cost is Cael’s freedom and the city’s chance to grow.
2. **Break the Bell.** Cael breaks the Bell. Time moves forward. The Quiet takes much of the city’s memory; people live in the present, wounded but free. The cost is the past.
3. **Become the Bell.** Cael merges with the Bell. The city remembers everything — every loop, every version of every person. Cael is gone, but becomes the thing that holds Aurel together. Transcendent and lonely.

**True ending — “The Ninth Day.”** Requires all six bonds at rank 3 and Wren’s hidden bell. Cael breaks the Bell and returns the memories to the people, letting them choose what to keep. It is the hardest ending to earn and the only one where the city is allowed to be ordinary.

---

## 6. Combat

### 6.1 Overview

Combat is classic turn-based, three active party members, portrait screen, no timed inputs. A normal battle lasts 2–4 minutes; a boss 5–8 minutes. The design goal is **readable tactical texture**, not spreadsheet complexity. Every number the player needs is on screen, and every enemy action is telegraphed.

**Party roles:** Cael (flex/Echo), Mara (Guardian), Iven (Controller), Oria (Mender), Toma (Seer). The player chooses two companions for most phases; story scenes sometimes fix the party. A party of three keeps the UI legible and the art budget sane.

### 6.2 The three tones

| Tone | Fantasy | Status | Strong against | Weak against |
|---|---|---|---|---|
| **Bell** | Order, light, revelation | Marked: target takes +20% from the next ally action | Hush | Ember |
| **Ember** | Heat, change, desire | Burning: damage over time; reduces healing | Bell | Hush |
| **Hush** | Stillness, cold, forgetting | Silenced: no skills for 1 turn; Slowed: -25% speed | Ember | Bell |

The triangle is Bell → Hush → Ember → Bell. Matching the enemy’s tone does not deal bonus damage; it builds **Resonance** (see 6.4). Using the counter-tone deals +25% damage and applies the status. This gives players two valid approaches: hit the weakness, or match the tone and build toward a Chord.

### 6.3 The Echo Track

The Echo Track is a three-slot (four for Iven) visible record of the last actions in battle. Each slot shows the actor’s portrait, the action icon, its tone, and whether it is echoable.

**Once per battle**, the player may replay any action on the track for **zero Resolve cost**. The replay is a new action: it uses the current actor’s stats, the current target’s defenses, and a fresh RNG roll, but the original action’s base power, tone, and effects. If the original target is dead or gone, the replay retargets according to the action’s rules (nearest enemy, lowest ally, self). Actions tagged **Unechoable** — usually boss ultimates and scripted moves — cannot be replayed.

**Enemy Echo:** each enemy side also gets one replay per battle. Regular enemies use it when the player repeats a pattern; bosses use it as a phase transition. Bosses can **steal** one of the player’s track slots at 50% HP, replacing it with a locked enemy action. The steal is unechoable; the stolen card is visible, and the player must play around it.

**Resonance and Chords:** every replay adds +1 Resonance, and matching the enemy’s tone with a skill also adds +1 (once per action). At 3 Resonance, the party may trigger a **Chord**, a party-wide ultimate chosen by party composition. A Chord consumes all Resonance. Example Chords:

- **The Long Table** (Mara + Oria): full-party heal, cleanse, and a shield.
- **The Ratchet** (Iven + Toma): rewinds the turn order and exposes all enemy weaknesses.
- **The Ninth Toll** (Cael + any): massive Bell damage; executes enemies below 15% HP.

**Why it works on mobile:** the track is three cards. The player taps a card, sees a preview (“Replay Hush: silence the Ashwright for 1 turn”), and confirms. No nested menus, no hidden cooldowns. The decision is legible in a screenshot.

### 6.4 Turn flow

1. **Battle start:** intents revealed (Cael’s Listen shows two; Toma’s Trace shows one extra turn ahead). Turn order appears as a vertical timeline.
2. **Player turn:** choose Attack, Skill, Echo, Guard, Item, or Swap (one swap per battle). Skills show tone, cost, and predicted damage.
3. **Resolution:** validate → pay cost → roll → apply damage/status → trigger passives → check deaths → advance timeline. Animations are cosmetic and never affect state.
4. **Enemy turn:** the telegraphed intent resolves. Enemies may use their Echo. Bosses may steal.
5. **End of round:** statuses tick. Resonance persists until spent or the battle ends; it is a goal, not a timer.
6. **Victory:** rewards are fixed per encounter (no random loot): Inheritances are chosen at Bell Rest; battles award “Echoes” that unlock Archive pages and cosmetics. Defeat rewinds to the start of the battle with the same party and knowledge; no story loss.

### 6.5 Actions, resources, and numbers

- **HP:** 80–240 by phase. **Resolve:** 3–6 pips; skills cost 1–3. Basic attack restores 1 Resolve. Guard restores 1 Resolve and reduces damage by 50%.
- **Damage formula:** integer math for determinism. `damage = max(1, floor(power * (atk + 10) / (def + 10) * tone_mod * guard_mod * variance))`, where variance is 90–110% from a seeded RNG. Crits are +50% and only from specific skills; no random crits on basic attacks.
- **Statuses:** Marked (+20% next ally hit), Burning (5% max HP per turn, healing -30%), Silenced (no skills, 1 turn), Slowed (-25% speed, 2 turns), Shielded (absorbs X), Regenerating (heals X per turn). Stacking rules: same status refreshes duration, does not stack unless tagged.
- **Resolve:** the only spendable combat resource. No MP potions. Items are limited “Remedies” (3 per phase) and heal/cleanse.
- **Telegraphs:** every enemy action shows an icon, target, and tone. Unechoable actions are marked with a bell-slash icon. Bosses show phase hints (“It is listening”) rather than exact numbers.

### 6.6 Enemy and boss design

Enemies are designed around a **verb** and a **tone**, not a species. Twelve base types, each with 2–3 variants:

- **Hollow Choir** (Hush): silences, stacks Slowed, punishes repeated actions.
- **Watch Hound** (Bell): marks, chases, gains speed each turn.
- **Ashwright** (Ember): burns, creates forge hazards, explodes on death.
- **Clockwork Automaton** (Bell): shields, counters, repairs.
- **Memory Leech** (Hush): steals buffs, copies the last player action.
- **Lamplighter Wisp** (Ember): heals allies, flees when cornered.
- **Quiet Child** (Hush): immune to physical, vulnerable to Bell.
- **Iron Chorister** (Bell): buffs allies, sings a countdown.
- **Soot Crow** (Ember): fast, blinds, targets the lowest HP.
- **Bell Warden** (Bell): taunts, reflects magic, breaks guard.
- **Hollowed Citizen** (none): does not attack; blocking it costs a turn; harming it has narrative consequences.
- **The Unmade** (variable): copies the party’s composition; appears in the Quiet.

**Bosses** are puzzles with phases:

- **The Hollow Choir** (Day 1): tutorial boss. Teaches Echo by using a big Hush attack the player can replay.
- **The Ashwright** (Day 3): forge hazards; the player must use Echo to reverse a furnace vent.
- **The Clockwork Saint** (Day 4, scripted retreat): invulnerable until the party uses a Chord; teaches Resonance.
- **The Hollow Bellkeeper** (Day 5): mirrors Cael’s party; steals the Echo Track.
- **The Iron Choir / Sera Vane** (Day 6): two variants based on alliance; one is a chase, one is a duel.
- **The Saint of Ash** (Day 7, optional): a superboss for players who refuse the Choir’s mercy.
- **The Clockwork Saint** (Day 8): three phases; the arena rotates; the player must sacrifice a district memory to break its shield.
- **The Quiet** (Day 9): final; takes the shape of the party; uses the player’s own Echo Track against them.

### 6.7 Sample battle transcript

**Encounter:** The Ashwright, Day 3. Party: Cael, Mara, Iven. Turn order: Iven → Ashwright → Cael → Mara.

- **Turn 1:** Iven uses *Ratchet Shot* (Bell, 18 damage, Marks the Ashwright). Track: [Ratchet Shot].
- **Enemy:** Ashwright uses *Furnace Breath* (Ember, 22 damage to Mara, applies Burning). Track: [Ratchet Shot, Furnace Breath].
- **Turn 2:** Cael uses *Hush Step* (Hush, 12 damage, Slows). Track: [Ratchet Shot, Furnace Breath, Hush Step].
- **Enemy:** Ashwright uses *Vent* (Ember, creates a hazard). Track: [Furnace Breath, Hush Step, Vent].
- **Turn 3:** Mara guards, healing 1 Resolve. The Ashwright is about to use *Overheat* (unblockable, 40 damage to all). The player taps **Echo**, selects **Vent** from the track, and replays it. Because Vent is echoable, the party redirects the furnace pressure: the Ashwright’s *Overheat* is cancelled, and the hazard turns on the boss for 30 damage. Resonance reaches 1.
- **Turn 4:** The Echo charge is spent. Cael casts *Cinder Lance* and Mara uses an Ember cleave, matching the Ashwright’s tone and raising Resonance to 3. The party spends the Chord to finish the boss. The fight ends with the Ashwright kneeling, not exploding.

The lesson: the Echo Track is not a free extra turn; it is a **rules hack**. The player wins by understanding what the enemy just did.

### 6.8 Failure, difficulty, and accessibility

A party wipe triggers **The Bell Catches You**: a short, elegant transition, then the battle restarts from the top with the same party and full HP. There is no loss of story progress, no penalty currency, no “game over” screen. The player can lower difficulty at any time.

- **Story:** enemy damage -30%, auto-battle available, no enemy Echo steals, full intents shown.
- **Standard:** as designed.
- **Bellkeeper:** enemy damage +15%, bosses steal earlier, optional encounters gain modifiers. No timed inputs; difficulty is tactical, not reflex-based.
- **Auto-battle:** unlocked after the first three battles. The player sets a tactic (Balanced, Aggressive, Defensive, Echo Priority) and can intervene at any turn. Auto-battle never uses Echo or Chords automatically unless the player enables it.
- **Accessibility:** all combat is turn-based; no quick-time events; text scaling; colorblind-safe tone icons (shape + color); reduced motion; captions for sound cues; screen-reader read-aloud for menus and dialogue via platform TTS.

---

## 7. Content plan and level design

### 7.1 Content matrix

| Content | Launch target | Notes |
|---|---|---|
| Districts | 4 | Ember Row, The Bellows, Saint Orra, The Quiet |
| Phase nodes | 27 | 18 critical, 9 optional/alternate |
| Main story | 5–6 hours | First completion |
| True ending | 8–10 hours | Requires bonds and replays |
| Party members | Cael + 4 | 3 active |
| Major NPCs | 10 | 6 bonds, 4 supporting |
| Bosses | 6 critical + 1 optional + final | 2 variants of the Day 6 encounter |
| Enemy types | 12 | 2–3 variants each |
| Authored encounters | 60–70 | No random encounters |
| Words | 35,000–45,000 | English launch |
| Endings | 3 + true variant | Day 9 |
| Cosmetics | ~26 items | Launch catalog |

### 7.2 District and level design

No tilemaps. Each district is an **illustrated diorama**: a painted background with 4–8 interactive hotspots, 2–4 NPCs, and a short “descent” into a dungeon room. This is cheaper than a walkable tile world, reads beautifully on a phone, and keeps the art consistent.

- **Ember Row:** bakery, market stalls, tenement stair, Watch checkpoint, ash-covered square. Two dungeon descents: the ovens below the bakery, the Watch cellar.
- **The Bellows:** foundry floor, clockwork bridge, counterweight shaft, Iven’s workshop. One descent: the counterweight shaft (3 rooms).
- **Saint Orra:** cathedral nave, choir school, memory garden, bell-runner’s cloister. One descent: the undercroft (3 rooms).
- **The Quiet:** Wren’s house, a street that repeats, a drawing that becomes a door, the unmade square. One descent: the house’s impossible rooms.
- **The Spire:** final dungeon; 4 ascent stages, each a boss or a choice.

Each dungeon room has one puzzle, one battle, or one scene — never all three. Puzzles are environmental and language-light: ring a bell in the right order, fold a drawing, align a clock, choose which memory to burn. No sliding-block puzzles.

### 7.3 Quest design

No fetch quests. Every optional scene does at least one of the following:

- Raises a bond.
- Anchors a memory that changes Day 9.
- Unlocks a shortcut or an alternate phase.
- Reveals a piece of the Bell’s history.
- Adds a card to the Inheritance pool.

**Side stories:** 12 “Small Mysteries,” each 5–10 minutes. Examples: a baker who keeps burning the same loaf; a watch that runs backward; a child’s drawing of a door that is not there; a Watch officer who has arrested the same man nine times. Each has a small, human resolution and a cosmetic or Inheritance reward.

### 7.4 Replay design

Revisiting is the heart of the game, so it must be cheap and rewarding:

- **Echo dialogue:** new lines appear based on flags; old prose is skippable with a single tap.
- **Shortcuts:** anchored memories open doors, alleys, and conversations, reducing traversal.
- **Remnant battles:** optional modifiers (e.g., “No Echo,” “Enemy Echo twice”) for players who want challenge and Archive pages.
- **Day-state changes:** NPC schedules, market prices, patrol routes, and ambient dialogue change by day and phase. A revisited phase is never identical.
- **No forced repetition:** the critical path can be completed in one cycle. Replays are for the true ending, bonds, and mastery.

### 7.5 Cut list (scope guard)

If the schedule slips, cut in this order:

1. Optional superboss and two Remnant modifiers.
2. Two Small Mysteries and their rewards.
3. One cosmetic category (Echo VFX) at launch; add post-launch.
4. One alternate Day 6 variant; keep the alliance choice but converge earlier.
5. The romance routes; keep the bonds platonic.
6. The animated Chord cut-ins; replace with static cards.

Never cut: the Echo Track, the three endings, the six bonds, the Day 9 finale, save/resume, or accessibility.

---

## 8. User experience and interface

### 8.1 Platform and format

- **Orientation:** portrait only. Design resolution 1080 × 1920, stretch mode `canvas_items`, aspect `expand` to fill tall screens. Safe-area aware for notches, punch-holes, and gesture bars.
- **Input:** one thumb. All actions are taps; no swipes required, no timed gestures, no gyro. Controller and mouse are supported for accessibility and future PC.
- **Session:** 15–25 minutes. The game autosaves at every scene boundary and at the start of every combat turn. Killing the app mid-battle resumes at the turn start.
- **Offline:** the entire story and combat are playable offline. Cloud save, shop, and analytics are optional online layers.

### 8.2 Screen map

| Screen | Purpose | Key interactions |
|---|---|---|
| **Title** | Continue, New Cycle, Archive, Settings | One large Continue card; “The city is waiting” |
| **Bell Map** | Day/phase hub | Tap a brass day ring, then a phase card |
| **District** | Illustrated exploration | Tap hotspots, NPCs, exits; journal button |
| **Dialogue** | Story and choices | Tap to advance; 2–3 large choice buttons; log, auto, skip |
| **Battle** | Turn-based combat | Attack, Skill, Echo, Guard, Item, Swap; timeline; Echo Track |
| **Bell Rest** | Inheritance choice | Three cards; preview; confirm |
| **Journal** | Recap, bonds, memories, glossary | Tabs; search; “what changed” |
| **Party** | Build and skills | Drag Inheritances into six slots; inspect |
| **Archive** | Cosmetics and collection | Try on, purchase, equip, restore |
| **Loop Card** | Shareable postcard | Choose frame, portrait, line; save/share |
| **Settings** | Audio, text, accessibility, privacy | Sliders, toggles, language |

### 8.3 Dialogue UX

Dialogue is the main “gameplay” between battles. It must feel like reading a beautiful book, not tapping through a visual novel.

- **Layout:** character portrait on the left or right, text panel at the bottom 30% of the screen, speaker name in small caps, a thin brass rule. The background remains visible and slightly dimmed.
- **Text:** 20–24 px at 1080 width, 1.4 line height, serif for dialogue, sans for UI. Max 3–4 lines per page. No walls of text.
- **Choices:** 2–3 large buttons, each a short sentence. A small icon indicates tone (remember, atone, escape) but never a “correct” answer.
- **Controls:** tap anywhere to advance; a small “log” icon; auto-play; skip-read only for already seen lines; a “recap” button if the player has been away.
- **Portraits:** 3/4 bust, four expressions (neutral, warm, cold, wounded), layered outfit. A subtle bob and blink; no full-body animation.
- **Accessibility:** TTS read-aloud, text scale 80–140%, dyslexia-friendly font option, high contrast, reduced motion.

### 8.4 Battle UX

- **Top 40%:** enemies as ink silhouettes on a painted stage, with intent icons and HP bars.
- **Middle 15%:** turn timeline (vertical) and the Echo Track (three cards).
- **Bottom 45%:** party portraits with HP/Resolve, and a 2 × 3 action grid. Attack, Skill, Echo, Guard, Item, Swap. Buttons are at least 48 dp; the most common actions are closest to the thumb.
- **Echo flow:** tap Echo → the track expands → tap a card → preview panel shows effect, targets, and “free” → confirm. Two taps maximum.
- **Feedback:** damage numbers, tone-colored impact, haptic tap, bell sound. A “battle log” button for players who want the math.
- **No hidden information:** enemy intents are always visible; un-echoable actions are marked; status icons have shapes as well as colors.

### 8.5 Onboarding

The first three minutes teach: tap to move, tap to talk, tap to attack, and tap Echo. No modal tutorials after the first battle. The first battle is designed so the player can win by replaying the boss’s own Hush attack; the game points at the Echo button once, then never again. A “How to Play” card lives in Settings.

### 8.6 Notifications and sharing

- **Notifications:** opt-in only. The player chooses a time. One gentle message per day at most: “Day 4 is waiting. Mara has been baking since dawn.” No streak shaming, no “your energy is full,” no fake urgency.
- **Loop Card:** a 1080 × 1350 shareable postcard with the party, day, a journal line, and a cosmetic frame. Spoiler-safe by default: no ending art, no hidden character. Share via platform sheet or save to photos.
- **Journal export:** a text summary of the player’s cycle for personal keepsakes; no automatic posting.

### 8.7 Save and resume

- Autosave at every scene boundary and turn start; manual save at Bell Rest.
- One main slot plus two rotating backups. Cloud save optional.
- On resume: a 2-second “Previously” card with the last journal line and a portrait. “Continue” is the largest button on the title screen.
- No loading screen longer than 3 seconds; district assets stream in behind the UI.

---

## 9. Art direction

### 9.1 Visual identity

**Ink and ember.** The world looks like a hand-painted book plate: warm black ink, paper grain, brass linework, gold-leaf highlights, and one living color per day. It is elegant, melancholy, and legible on a small screen. The UI is a brass instrument: thin rules, bell curves, engraved labels, card stock.

- **Day palette:** Day 1 amber and ink; Day 2 rust; Day 3 brass; Day 4 orris blue; Day 5 bone; Day 6 iron; Day 7 violet; Day 8 gold; Day 9 monochrome with a single Ember-red accent.
- **Lighting:** soft, directional, painterly. No neon, no high-fantasy saturation.
- **Texture:** paper grain, ink bleed, subtle vignette. A full-screen shader unifies the art; a low-FX toggle removes grain and reduces bloom.
- **Typography:** Cormorant Garamond (dialogue) and Inter (UI) for Latin; Noto Serif/Sans fallbacks for localization. Both OFL. No custom display font at launch; the logo is hand-lettered.

### 9.2 Character art

- 9 major characters × 4 expressions = 36 portrait illustrations.
- 3/4 bust, ink wash and color, gold-leaf accent, transparent background.
- Layered PSDs: body, coat, inner layer, hair, accessory, expression. Cosmetics swap coat/inner/accessory; palette variants are shader or texture swaps.
- 2-frame blink and a subtle idle bob; no lip-sync. Cut-ins for Chords only (5 illustrations).
- Enemies: 12 base ink silhouettes with one luminous feature; variants are palette and prop swaps. No full animation; hit flashes, squash, and particles.

### 9.3 Backgrounds and UI

- 12 district states (4 districts × 3 day states) + 6 battle stages + 4 Spire stages = 22 painted backgrounds. Each has 2–3 parallax layers and a color script.
- Modular props (stalls, lamps, carts, bells) allow day-state variation without new paintings.
- UI: one Theme resource, 9-slice brass frames, paper texture, icon set of 40 glyphs. Cosmetics reskin the frame, ink color, and background paper, not the layout.
- Battle stages are theatrical: a painted backdrop, a floor plane, and a vignette. Enemies are silhouettes; the party is portraits at the bottom. No 3D.

### 9.4 Art production pipeline

1. **Concept:** AI-assisted mood boards and thumbnails, human-selected.
2. **Line and color:** commissioned artist; human final art. AI is not used for final character portraits or key art without disclosure and human cleanup.
3. **Layering:** PSD with named layers; export PNGs at 2× target resolution; atlas per character.
4. **Import:** Godot import presets, compression (ASTC/ETC2), max texture 2048, mipmaps off for UI.
5. **Review:** silhouette test at 30% zoom, phone screenshot test, colorblind check.

**Budget:** 36 portraits, 22 backgrounds, 12 enemy illustrations, 40 icons, 6 UI frames, key art, Loop Card template. Commission 2–3 artists; expect 3–5 months of part-time work. This is the largest cash cost after music.

### 9.5 Marketing art

- Key art: Cael on a rooftop, the Bell cracked behind them, the city in ash and gold.
- 6 store screenshots: Bell Map, dialogue, Echo Track, Chord, Loop Card, Day 9.
- 15-second vertical trailer: “The city has nine days. You have done this before.”
- Loop Card template is the primary organic asset.

---

## 10. Audio direction

### 10.1 Music

One leitmotif — **Aurel’s Theme** — appears in every track and degrades a little each day. The palette is cello, glass harmonica, low choir, prepared piano, and bell. No bombastic orchestra; intimacy over scale.

- **Structure:** 5 exploration tracks (Ember Row, The Bellows, Saint Orra, The Quiet, The Spire), battle, boss, Chord, title, and three ending cues. Each exploration track has 3 layers via `AudioStreamInteractive`: base, tension, and memory.
- **Adaptive logic:** exploration layers add when a bond is high or a mystery is near; battle layers add at low HP or when Resonance is high; Day 9 filters the entire score through a narrow, detuned mix.
- **Silence is an instrument.** The Quiet uses almost no music: room tone, breath, a single bell.

### 10.2 Sound design

- **Bell:** the signature sound. A real bronze bell recorded close and far; used for UI confirms, memory proximity, and the final note. Never shrill on phone speakers.
- **UI:** paper, brass, soft clicks. No synthetic “game” beeps.
- **Combat:** ink slashes, breath, clockwork, choir swells. Impacts are short and punchy, not explosive.
- **Ambience:** ash rain, market murmur, furnace hum, cathedral reverb, the Quiet’s negative space.
- **Voice:** no full voice-over. Nonverbal breaths, hums, and a single bell-toned “voice” for the Bell itself, rendered as text with a sub-bass pulse. Localization stays affordable.

### 10.3 Implementation and budget

- Godot `AudioStreamInteractive` for layered music; `AudioStreamPlayer` pools for SFX; a limiter on the Master bus; -16 LUFS integrated, -1 dBTP.
- Haptics sync to the bell and Chord; can be disabled.
- Commission 10–12 pieces / 25–30 stems from one composer; license buyout for worldwide, perpetual, mobile/PC/console. Budget $6k–$12k. SFX from a licensed library plus custom bell recordings.

---

## 11. Narrative design and writing

### 11.1 Structure

The story is authored in **Ink** (see Tech Spec). One Ink file per phase, with knots for scenes and tags for speaker, portrait, expression, music, SFX, conditions, and line ID. The narrative state is a set of flags (`met_mara`, `elias_anchored`, `bond_mara_2`, `knows_wren_truth`) plus relationship ranks. Choices set flags and can gate scenes, shortcuts, and endings.

**Branching budget:** 35,000–45,000 words. Three endings, six bonds, two major alliance variants on Day 6, and a hidden true-ending path. No infinite branching; most choices change scenes, lines, and access, not the entire plot.

### 11.2 Choice philosophy

- **No fake choices.** If a choice matters, it changes a scene, a relationship, a route, or an ending. If it does not matter, it is flavor text, not a button.
- **No morality meter.** The game does not tell the player whether remembering is good. It shows the cost.
- **Short-term versus long-term.** The Choir’s offers are genuinely tempting: forget a companion and save a district; accept a power and lose a memory. The player should feel the trade.
- **No punishment for curiosity.** Optional scenes never lock the critical path; they add context and leverage.
- **Replay-aware writing.** Characters acknowledge what the player knows. “You’ve asked me that before” is a line, not a bug.

### 11.3 Voice and prose rules

- Write for the ear. Read every line aloud.
- Prefer concrete nouns and active verbs. Cut adjectives that do not do work.
- Each character has a distinct rhythm: Mara speaks in short declaratives; Iven in clauses; Oria in scripture and rebuttal; Toma in images and questions; Vey in gentle plural.
- Humor is dry, situational, and human. Never ironic distance from the story’s pain.
- Avoid exposition dumps. The world is revealed through objects, routines, and arguments.
- Keep line lengths under 90 characters for mobile readability.

### 11.4 Localization readiness

- English at launch. Japanese, French, Spanish, German, Portuguese-BR, Korean, and Simplified Chinese in Year 1 if metrics support.
- Every line has a stable ID tag. No string concatenation. No gendered player references in the main text; Cael is “you” or “the Bellkeeper.”
- UI strings in CSV; fonts with CJK fallback; text expansion 30%; pseudo-localization test in CI.
- Cultural review for food, religious imagery, and names. “Saint Orra” and “the Choir” are fictional; avoid real-world liturgical quotes.

### 11.5 Content warnings and tone safety

The game deals with grief, memory loss, self-erasure, and panic. It does not depict sexual violence, animal cruelty, or gore. A content warning appears at first launch; a “soften flashes” option controls the Bell’s strobe effects. The Choir’s philosophy is presented seriously, not as a strawman; the game does not endorse self-erasure, but it lets the player understand why someone would choose it.

---

## 12. Monetization

### 12.1 Principles

1. The complete story is free. No chapter locks, no energy, no ads, no gacha, no battle pass.
2. Cosmetics are visible, direct, and permanent. No loot boxes, no premium currency, no artificial scarcity.
3. Nothing sold affects combat, progression, story, or endings.
4. All prices are shown in local currency; purchases restore across devices; family sharing is supported.
5. About 30% of cosmetics are earnable through play so free players have a meaningful Archive.

### 12.2 Launch catalog

| Category | Items | Price | Production notes |
|---|---|---|---|
| Outfits | 6 outfits, each with 3 colorways | $3.99 each | Layered portrait pieces; palette swaps |
| Bell skins | 4 | $1.99 | 2D prop + shader; visible in battle/UI |
| Ink styles | 4 full-game palettes/filters | $2.99 | One shader parameter set each |
| Journal themes | 4 | $1.99 | Paper, ink color, marginalia |
| Echo VFX | 4 | $1.99 | Replay trails, Chord bursts |
| Loop Card frames | 4 | $1.99 | 9-slice frames; shareable |
| “The Last Lamplighter” bundle | 1 outfit + bell + frame | $9.99 | 35% saving |
| Patron’s Archive | Soundtrack, art book, commentary, supporter title | $14.99 | High-margin, ethical whale capture |

**Earned cosmetics:** 8 items via Archive Pages — complete Day 3, complete a bond, finish the true ending, complete a Remnant battle, etc. Earned and paid items are visually distinct but equally polished; no “free tier” ugliness.

### 12.3 Revenue assumptions

A free narrative JRPG with no viral loop needs reach. The model is honest about this:

- 250,000 installs × 2.5% conversion × $7 average revenue per paying user ≈ **$43,750**.
- 500,000 installs × 3% × $8 ≈ **$120,000**.
- The Patron’s Archive and bundles push the average upward; the cosplay/share loop pushes installs.

These numbers do not fund a full-time 15-month production on their own. They can fund a solo developer in a low-cost region, or supplement a premium Plan B. Marketing is therefore a first-class discipline, not an afterthought.

### 12.4 Plan B: premium complete edition

If, after eight weeks of soft launch, conversion is below 1% and installs are below 50,000, switch to a **$6.99 Complete Edition** with the same content and cosmetic DLC. The free version becomes a 45-minute prologue. Announce the change transparently; honor all existing purchases and free players. This is a business decision made before launch, not a panic move.

### 12.5 Store and platform compliance

- Google Play: Data safety form, families policy (not primarily child-directed), billing library, obfuscated account ID, server-side purchase verification.
- Apple: App Store privacy manifest, no ATT prompt (no ads/tracking), restore purchases, account deletion, review notes explaining the free story.
- Ratings: likely 12+/Teen for grief, mild horror, and fantasy violence. No gambling imagery.
- Refunds and parental controls: platform-standard; no dark patterns.

---

## 13. Live operations and community

### 13.1 Launch plan

1. **Prototype** (months 1–2): paper Echo test, greybox battle, 10 playtesters.
2. **Vertical slice** (months 3–4): Day 1 loop, 30 external playtesters, TestFlight/Internal testing.
3. **Alpha** (months 5–8): Days 1–5, full UI, save/resume, cosmetics sandbox.
4. **Beta** (months 9–12): content complete, accessibility, localization prep, store assets.
5. **Android soft launch** (month 13–14): Canada, Philippines, Australia; 5% → 20% → 100% rollout.
6. **Global launch** (month 15): Android + iOS; PC/console later if the game finds an audience.

### 13.2 Year-one content

Solo capacity is finite. Promise less, deliver well:

- **“The Hollow Cycle”** (free): New Game+, new Inheritances, boss remixes, a hidden scene with Wren.
- **“The Lamplighter’s Tale”** (free): a 45-minute Mara side story set before Day 1.
- **“Archive Edition”** (free update + cosmetic pack): photo mode, new Loop Card frames, soundtrack player.
- **Seasonal sales** at anniversary and major holidays; no limited-time story.

### 13.3 Community and marketing

- **Devlog:** weekly short video or post. The hook is the craft, not the hype: “I’m building a time-loop JRPG where the combat is a loop.”
- **Loop Cards:** the primary shareable artifact. Every completed day offers a card; the frame is cosmetic.
- **Press kit:** one-page fact sheet, key art, 6 screenshots, 15-second vertical trailer, 60-second trailer, developer bio, contact.
- **Creators:** send early keys to narrative-game streamers and JRPG YouTubers. Offer a spoiler-safe “Day 1” build.
- **Festivals:** submit the vertical slice to indie showcases; a browser demo (Godot web export) is a bonus, but mobile is the product.
- **Discord:** small, moderated, playtest cohorts. No hype cycles, no roadmap promises you cannot keep.

### 13.4 Analytics and KPIs

**Events:** app_start, consent, tutorial_step, phase_start/end, battle_start/end, echo_used, echo_replay_id, wipe, inheritance_pick, bond_rank, shop_view, purchase_start/success/fail, restore, crash, performance_sample.

**Funnels:** install → tutorial complete → Day 1 complete → Day 3 → Day 9 → true ending; shop view → purchase; Loop Card share → install (attribution if available).

**Targets:** D1 35%, D7 12%, D30 6%, tutorial completion 80%, main story completion 30%, cosmetic conversion 2%+, crash-free 99.5%, cold start <2s, 60 fps on mid-range Android.

**Privacy:** analytics opt-in, no PII, no ad ID, no cross-app tracking, data deletion in Settings, GDPR/CCPA compliant. PostHog for product analytics, Sentry for crashes, Supabase for backend.

---

## 14. Accessibility and inclusion

Accessibility is a design constraint from day one, not a patch.

- **Visual:** text scale 80–140%, high-contrast mode, colorblind-safe tone icons (shape + color), reduced motion, “soften flashes,” dyslexia-friendly font option, TTS read-aloud for dialogue and menus.
- **Motor:** all taps, no timed inputs, no swipes required, large touch targets, one-hand layout, auto-battle, adjustable battle speed.
- **Cognitive:** recaps, journal, objective hints, “what changed” summaries, skippable read text, no penalty for returning after a break.
- **Audio:** captions for sound cues, visual telegraphs for all enemy actions, mono audio option, independent music/SFX sliders.
- **Difficulty:** Story mode, adjustable enemy damage, no enemy Echo steals, full intents, infinite retries.
- **Representation:** diverse body types, ages, and skin tones; no gendered player pronouns; optional romance; characters with disabilities are competent, not tragic props.
- **Content warnings:** grief, memory loss, self-erasure, panic, mild horror. Do not add a toggle that sanitizes grief; provide a clear warning and a skip option for optional scenes.

---

## 15. Production plan

### 15.1 Team and roles

**You:** creative director, game designer, writer/editor, producer, lead programmer, final QA.  
**AI agents:** narrative drafting, content compilation, systems programming, UI scaffolding, test writing, localization prep, build engineering, balance simulation.  
**Contractors:** 2D character artist (36 portraits), background artist (22 paintings), composer (10–12 tracks), SFX editor, localizers, key art illustrator.

### 15.2 15-month roadmap

| Phase | Months | Deliverable | Gate |
|---|---|---|---|
| **0. Proof** | 1–2 | Paper Echo prototype; greybox battle; 10 playtests | 8/10 players ask “what if I replay that?” |
| **1. Vertical slice** | 3–4 | Day 1, one district, 2 party members, 1 boss, 25 min; save/resume; Android build | 30 external playtesters; D1 intent >40% |
| **2. Systems complete** | 5–7 | Full UI kit, Ink integration, Inheritances, cosmetics sandbox, backend | Crash-free 99%; cold start <2s |
| **3. Act One** | 8–9 | Days 1–3, two districts, 3 party members, 2 bosses | Content lock for Act One |
| **4. Act Two** | 10–11 | Days 4–6, third district, 2 bosses, alliance branch | Full-game playthrough #1 |
| **5. Act Three + beta** | 12–13 | Days 7–9, final boss, endings, accessibility, store assets | Content complete; 80% tutorial completion |
| **6. Soft launch** | 14 | Android soft launch in 3 markets | D1 35%, conversion 2% |
| **7. Global** | 15 | Android + iOS global | Crash-free 99.5%; store approval |

**Buffer:** 3 months. Assume slippage. Cut from the cut list before extending.

### 15.3 Budget estimate (excluding living costs)

| Item | Low | High |
|---|---|---|
| Character portraits (36) | $4,000 | $9,000 |
| Backgrounds (22) | $3,000 | $7,000 |
| Enemy/UI/key art | $2,000 | $4,000 |
| Music (10–12 tracks) | $6,000 | $12,000 |
| SFX and bell recordings | $500 | $1,500 |
| Localization (Year 1, 4 languages) | $3,000 | $8,000 |
| Tools, fonts, licenses | $500 | $1,500 |
| Marketing, trailer, store assets | $3,000 | $10,000 |
| Contingency 15% | $3,000 | $7,000 |
| **Total** | **$25,000** | **$60,000** |

This is a realistic indie budget for a solo developer with AI leverage. If you cannot fund it, reduce art scope: 3 districts, 6 characters, 12 portraits, 12 backgrounds; the game still works.

### 15.4 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep | High | High | Cut list; 18 critical nodes; no new mechanics after alpha |
| Echo system is not fun | Medium | Fatal | Paper prototype first; kill/pivot before writing story |
| Art cost overruns | Medium | High | Limited palette, layered portraits, modular backgrounds |
| Free-to-play revenue insufficient | High | High | Plan B premium; Patron’s Archive; marketing discipline |
| Mobile discoverability | High | High | Loop Cards, devlogs, creators, soft launch, store featuring pitch |
| AI-generated content quality/consistency | Medium | Medium | Human editing, canon bible, validators, no final AI art |
| Godot mobile plugin friction | Medium | Medium | Pin versions; wrap platform APIs; test early |
| Burnout | High | High | 5-day weeks; monthly break; scope guard; playtest energy |
| Narrative branch complexity | Medium | Medium | Ink graph validation; flag audit; limit major branches |
| Save corruption | Low | High | Atomic writes, backups, cloud sync, migration tests |

### 15.5 Definition of done

A feature is done when: it is implemented, tested (unit + integration), localized-ready, accessible, performant on a low-end Android, documented in the canon/tech docs, and playable without developer explanation. A phase is done when: it has a beginning, a meaningful choice, an end, a Bell Rest, an autosave, and a journal line.

---

## 16. Appendices

### 16.1 Sample Day 1 loop (25 minutes)

1. **Cold open (2 min):** Cael wakes in the Spire. The hand bell is cracked. The journal writes: “Day 1. The Bell will crack at noon. Do not be near it.” No tutorial pop-up; tap to look, tap to leave.
2. **Ember Row (6 min):** Market noise. Mara argues with a supplier. A Choir procession passes. Cael can ask three questions; one reveals the Bell’s crack, one reveals Elias’s absence, one reveals the Watch checkpoint.
3. **First battle (4 min):** A Hollow Choir acolyte silences a stallkeeper. Echo tutorial: the enemy uses Hush; the game highlights Echo; the player replays Hush to silence the enemy. Victory. Mara notices Cael’s bell.
4. **Choice (3 min):** The Watch is closing the district. Mara asks Cael to help carry bread to the tenements or to follow the Choir. Choosing Mara anchors “the smell of burnt sugar”; choosing the Choir reveals a shortcut.
5. **The crack (5 min):** Noon. The Bell cracks. The sky goes gold, then grey. Cael runs toward the Spire; the screen whites out.
6. **Bell Rest (3 min):** Cael wakes on Day 1. Choose one Inheritance: *Cinder Lance* (Ember attack), *Steady Hands* (+10 HP), or *Mara’s Trust* (bond rank 1). The Journal writes: “She will not remember me. I will remember her.”
7. **Hook (2 min):** The Bell Map opens. Day 1 Night is available; Day 2 is locked. “The city is waiting.”

### 16.2 Inheritance examples

| Name | Type | Effect |
|---|---|---|
| Cinder Lance | Skill | Ember attack, 1 Resolve, 18 power, applies Burning |
| Hush Step | Skill | Hush attack, 1 Resolve, 12 power, applies Slowed |
| The Long Table | Chord | Party heal + cleanse + shield |
| Mara’s Trust | Bond | Rank 1; unlocks a shortcut and a Day 3 scene |
| Steady Hands | Stat | +10 HP, +1 Resolve |
| Listen Twice | Passive | Cael sees one extra enemy intent |
| Wren’s Margin | Passive | Echo Track holds one extra action once per battle |
| The Ninth Toll | Skill | Bell damage; executes below 15% HP; 3 Resolve |
| Burnt Sugar | Bond | Mara remembers Elias; unlocks the true-ending flag |
| A Door, Drawn | Bond | Toma opens a shortcut in the Quiet |

### 16.3 Glossary

- **Aurel:** the city; also the Bell’s name.
- **Bell Rest:** the end-of-phase save and Inheritance choice.
- **Bellkeeper:** a person who remembers the loop.
- **Chord:** a party ultimate triggered by 3 Resonance.
- **Cycle:** nine days; the loop.
- **Echo Track:** the last three (or four) actions in battle.
- **Ember:** memory made visible; also the heat tone.
- **Hollow:** a person who has lost their memory to the Quiet.
- **Hush:** the stillness tone; also the Choir’s philosophy.
- **Inheritance:** a skill, stat, or bond that survives the reset.
- **The Quiet:** the end of the cycle; the erasure of memory.
- **Resonance:** the resource built by replaying actions; 3 triggers a Chord.
- **Tone:** Bell, Ember, or Hush; the combat triangle.

### 16.4 Open questions

1. Does the player rename Cael, or is the name fixed for narrative clarity?
2. Is the true ending gated by all six bonds, or by three of six plus Wren’s bell?
3. How much of Day 7 can be non-combat before pacing sags?
4. Do we need a “skip battle” option in Story mode, or is auto-battle enough?
5. Is the Patron’s Archive ready at launch, or a month-two update?
6. Do we localize Japanese at launch or Year 1?

---

*End of Game Design Document. The technical implementation is specified in `TECH_SPEC.md`.*

