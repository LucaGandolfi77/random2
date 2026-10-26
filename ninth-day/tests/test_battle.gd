extends SceneTree

## Headless test runner for the deterministic battle prototype.
## Run: godot --headless --path . -s tests/test_battle.gd

var passed: int = 0
var failed: int = 0

func _initialize() -> void:
	print("NINTH DAY — battle prototype tests")
	print("----------------------------------")
	_test_initial_state()
	_test_damage_and_mark()
	_test_echo_replay_once()
	_test_tone_resonance()
	_test_chord()
	_test_victory()
	_test_defeat()
	_test_guard_math()
	_test_preview()
	_test_preview_replay()
	_test_track_capacity_and_steal()
	_test_intents()
	_test_save_resume()
	_test_store()
	_test_encounters()
	_test_modifiers()
	_test_inheritances()
	_test_determinism()
	print("----------------------------------")
	print("%d passed, %d failed" % [passed, failed])
	quit(0 if failed == 0 else 1)

func _new_sim(seed_value: int = 1234) -> BattleSim:
	var sim := BattleSim.new()
	sim.start(seed_value)
	return sim

func _find_actor(sim: BattleSim, actor_id: StringName) -> BattleActor:
	for actor in sim.party:
		if actor.id == actor_id:
			return actor
	for actor in sim.enemies:
		if actor.id == actor_id:
			return actor
	return null

func _test_initial_state() -> void:
	var sim := _new_sim()
	_assert(sim.party.size() == 3, "party has three actors")
	_assert(sim.enemies.size() == 2, "encounter has two enemies")
	_assert(sim.is_player_turn(), "battle starts on the party turn")
	_assert(sim.current_actor() != null, "there is a current actor")
	_assert(sim.current_actor().id == &"iven", "Iven acts first by speed")
	_assert(sim.echo_track.capacity == 4, "Iven's presence gives the track four slots")
	_assert(sim.player_echo_available, "player Echo starts available")
	_assert(sim.resonance == 0, "resonance starts at zero")

func _test_damage_and_mark() -> void:
	var sim := _new_sim()
	var ashwright := _find_actor(sim, &"ashwright")
	var before := ashwright.hp
	var events := sim.use_action(&"ratchet_shot", &"ashwright")
	_assert(ashwright.hp < before, "Ratchet Shot deals damage")
	_assert(events.size() > 0, "an action produces events")
	_assert(sim.echo_track.size() == 1, "the action is recorded in the Echo Track")
	_assert(sim.echo_track.get_record(0).action_id == &"ratchet_shot", "the recorded action is correct")
	_assert(ashwright.has_status(&"marked"), "Ratchet Shot applies Marked")
	_assert(sim.current_actor().id == &"cael", "turn advances to the next party member")

func _test_echo_replay_once() -> void:
	var sim := _new_sim()
	sim.use_action(&"ratchet_shot", &"ashwright")
	var ashwright := _find_actor(sim, &"ashwright")
	var before := ashwright.hp
	var events := sim.replay(0, &"ashwright")
	_assert(not sim.player_echo_available, "replay consumes the party's Echo")
	_assert(ashwright.hp < before, "replay deals damage")
	_assert(events.size() > 0, "replay produces events")
	var second := sim.replay(0, &"ashwright")
	_assert(second.size() == 1, "a second replay is refused")
	_assert(second[0].contains("already used"), "the refusal explains the Echo is spent")

func _test_tone_resonance() -> void:
	var sim := _new_sim()
	sim.use_action(&"strike", &"hollow_choir")
	_assert(sim.resonance == 0, "a counter-tone hit does not build resonance")
	sim.use_action(&"cinder_lance", &"ashwright")
	_assert(sim.resonance == 1, "matching the enemy tone builds resonance")
	_assert(sim.echo_track.size() == 2, "both actions are recorded")

func _test_chord() -> void:
	var sim := _new_sim()
	sim.resonance = 3
	sim.chord_ready = true
	var ashwright := _find_actor(sim, &"ashwright")
	var before := ashwright.hp
	sim.use_chord()
	_assert(sim.resonance == 0, "Chord consumes resonance")
	_assert(not sim.chord_ready, "Chord is no longer ready")
	_assert(ashwright.hp < before, "Chord damages the enemy")

func _test_victory() -> void:
	var sim := _new_sim()
	_find_actor(sim, &"ashwright").hp = 1
	_find_actor(sim, &"hollow_choir").hp = 1
	sim.use_action(&"strike", &"ashwright")
	sim.use_action(&"strike", &"hollow_choir")
	_assert(sim.phase == "victory", "killing both enemies ends in victory")
	_assert(sim.is_finished(), "victory is a finished state")

func _test_defeat() -> void:
	var sim := _new_sim()
	for actor in sim.party:
		actor.hp = 0
	sim._check_end()
	_assert(sim.phase == "defeat", "an empty party ends in defeat")
	_assert(sim.is_finished(), "defeat is a finished state")

func _test_guard_math() -> void:
	var sim := _new_sim()
	var normal := sim._calculate_damage(20, 15, 10, 100, 100, 100)
	var guarded := sim._calculate_damage(20, 15, 10, 100, 50, 100)
	_assert(normal > 0, "damage is positive")
	_assert(guarded < normal, "guarding reduces damage")
	_assert(guarded >= 1, "guarding never reduces damage below one")

func _test_preview() -> void:
	var sim := _new_sim()
	var ashwright := _find_actor(sim, &"ashwright")
	var before := ashwright.hp
	var preview := sim.preview_action(&"ratchet_shot", &"ashwright")
	_assert(bool(preview["allowed"]), "a valid action can be previewed")
	_assert(preview["targets"].size() == 1, "the preview lists one target")
	_assert(int(preview["targets"][0]["damage"]) > 0, "the preview shows damage")
	_assert(int(preview["targets"][0]["hp"]) == before, "the preview shows current HP")
	_assert(ashwright.hp == before, "previewing does not change state")
	_assert(sim.echo_track.size() == 0, "previewing does not record an action")
	_assert(int(preview["cost"]) == 1, "the preview shows the Resolve cost")

	sim.current_actor().resolve = 0
	var denied := sim.preview_action(&"ratchet_shot", &"ashwright")
	_assert(not bool(denied["allowed"]), "an unaffordable action is refused in preview")
	_assert(String(denied["reason"]).contains("Resolve"), "the refusal explains the cost")

func _test_preview_replay() -> void:
	var sim := _new_sim()
	sim.use_action(&"ratchet_shot", &"ashwright")
	var record := sim.echo_track.get_record(0)
	var before := _find_actor(sim, &"ashwright").hp
	var preview := sim.preview_replay(0, &"ashwright")
	_assert(bool(preview["allowed"]), "a valid Echo can be previewed")
	_assert(bool(preview["is_echo"]), "the preview marks the action as an Echo")
	_assert(int(preview["targets"][0]["damage"]) > 0, "the Echo preview shows damage")
	_assert(sim.player_echo_available, "previewing does not spend the Echo")
	_assert(_find_actor(sim, &"ashwright").hp == before, "previewing an Echo does not change state")
	sim.player_echo_available = false
	var denied := sim.preview_replay(0, &"ashwright")
	_assert(not bool(denied["allowed"]), "a spent Echo cannot be replayed")
	_assert(String(denied["reason"]).contains("spent"), "the refusal explains the spent Echo")
	_assert(record != null, "the record remains after previewing")


func _test_track_capacity_and_steal() -> void:
	var sim := _new_sim()
	sim.use_action(&"ratchet_shot", &"ashwright")
	var ashwright := _find_actor(sim, &"ashwright")
	ashwright.hp = 60
	var stolen := sim._steal_player_record()
	_assert(stolen != null, "a boss can steal a player record")
	_assert(stolen.locked, "a stolen record is locked")
	_assert(not stolen.can_replay(), "a stolen record cannot be replayed")

func _test_intents() -> void:
	var sim := _new_sim(321)
	var choir := _find_actor(sim, &"hollow_choir")
	var ashwright := _find_actor(sim, &"ashwright")
	_assert(choir.intent_action != &"", "enemy intents exist during the party turn")
	_assert(ashwright.intent_action != &"", "every enemy telegraphs an intent")
	var choir_intent := choir.intent_action
	sim.use_action(&"ratchet_shot", &"ashwright")
	_assert(choir.intent_action == choir_intent, "the intent does not change while the party acts")
	while sim.is_player_turn():
		sim.use_guard()
	_assert(sim.is_enemy_turn(), "the party turn hands over to the enemy")
	_assert(choir.intent_action == choir_intent, "the displayed intent is the one that resolves")
	var actor := sim.current_actor()
	var acting_id := actor.id
	sim.enemy_act()
	_assert(_find_actor(sim, acting_id).intent_action == &"", "an intent is cleared after it resolves")

func _test_save_resume() -> void:
	var sim := _new_sim(909)
	sim.use_action(&"ratchet_shot", &"ashwright")
	sim.use_action(&"cinder_lance", &"ashwright")
	sim.replay(0, &"ashwright")
	var data = JSON.parse_string(JSON.stringify(sim.to_save()))
	_assert(data is Dictionary, "a save survives JSON round-trip")
	var restored := BattleSim.new()
	_assert(restored.load_save(data), "a save can be restored")
	_assert(JSON.stringify(restored.snapshot()) == JSON.stringify(sim.snapshot()), "restoring reproduces the battle state")
	_assert(restored.rng.state == sim.rng.state, "restoring preserves the RNG state")
	_assert(_find_actor(restored, &"ashwright").has_status(&"burning"), "restoring preserves statuses")
	_assert(not restored.player_echo_available, "restoring preserves a spent Echo")
	_assert(restored.echo_track.get_record(0).locked == sim.echo_track.get_record(0).locked, "restoring preserves Echo locks")
	sim.enemy_act()
	restored.enemy_act()
	_assert(JSON.stringify(restored.snapshot()) == JSON.stringify(sim.snapshot()), "a restored battle continues in lockstep")
	_assert(JSON.stringify(restored.log_lines) == JSON.stringify(sim.log_lines), "a restored battle keeps its log")

	sim.echo_track.get_record(0).locked = true
	var data2 = JSON.parse_string(JSON.stringify(sim.to_save()))
	var restored2 := BattleSim.new()
	restored2.load_save(data2)
	_assert(restored2.echo_track.get_record(0).locked, "a stolen card stays locked after loading")
	_assert(not restored2.echo_track.get_record(0).can_replay(), "a stolen card cannot be replayed after loading")
	_assert(not BattleSim.new().load_save({}), "an empty save is rejected")

func _test_store() -> void:
	var path := "user://test_battle_save.json"
	BattleStore.delete(path)
	_assert(not BattleStore.has_save(path), "the test store starts clean")
	var sim := _new_sim(5150)
	sim.use_action(&"ratchet_shot", &"ashwright")
	_assert(BattleStore.save(sim, path) == OK, "the store writes a save")
	_assert(BattleStore.has_save(path), "the store reports the save")
	var restored := BattleSim.new()
	_assert(BattleStore.load_into(restored, path), "the store loads a save")
	_assert(JSON.stringify(restored.snapshot()) == JSON.stringify(sim.snapshot()), "the store round-trips the battle")
	BattleStore.delete(path)
	_assert(not BattleStore.has_save(path), "the store deletes a save")

func _test_encounters() -> void:
	var tutorial := _new_sim()
	tutorial.start(1, &"tutorial")
	_assert(tutorial.enemies.size() == 1, "the tutorial encounter has one enemy")
	_assert(tutorial.enemies[0].id == &"hollow_choir", "the tutorial enemy is the Hollow Choir")
	_assert(tutorial.enemies[0].max_hp == 60, "the tutorial enemy is tuned down")
	var boss := _new_sim()
	boss.start(1, &"ashwright")
	_assert(boss.enemies.size() == 1, "the Ashwright encounter has one enemy")
	_assert(boss.enemies[0].is_boss, "the Ashwright encounter contains a boss")
	var hound := _new_sim()
	hound.start(1, &"watch_hound")
	_assert(hound.enemies.size() == 1, "the Watch Hound encounter has one enemy")
	_assert(hound.enemies[0].id == &"watch_hound", "the Watch Hound is the enemy")
	_assert(hound.enemies[0].speed == 14, "the Watch Hound is fast")
	var bellows := _new_sim()
	bellows.start(1, &"bellows")
	_assert(bellows.enemies.size() == 2, "the Bellows encounter has two enemies")
	_assert(bellows.enemies[0].is_boss, "the Ashwright leads the Bellows encounter")
	_assert(bellows.enemies[0].max_hp == 170, "the Ashwright is reforged for Day 3")
	var saint := _new_sim()
	saint.start(1, &"clockwork_saint")
	_assert(saint.enemies.size() == 1, "the Clockwork Saint fights alone")
	_assert(saint.enemies[0].max_hp == 200, "the Clockwork Saint is a boss")
	saint.enemies[0].hp = 81
	_assert(not saint._check_end(), "the Clockwork Saint holds above its retreat threshold")
	saint.enemies[0].hp = 80
	_assert(saint._check_end(), "the Clockwork Saint retreats at 40 percent")
	_assert(saint.phase == "victory", "the retreat counts as a victory")
	var saved = JSON.parse_string(JSON.stringify(tutorial.to_save()))
	var loaded := BattleSim.new()
	loaded.load_save(saved)
	_assert(loaded.encounter_id == &"tutorial", "the encounter survives a save")

func _test_modifiers() -> void:
	var sim := _new_sim()
	var cael := _find_actor(sim, &"cael")
	var before_hp := cael.max_hp
	var before_attack := cael.attack
	var before_resolve := cael.max_resolve
	sim.apply_modifiers({"max_hp": 10, "attack": 1, "defense": 3, "speed": 1, "max_resolve": 1})
	_assert(cael.max_hp == before_hp + 10, "an inheritance can raise max HP")
	_assert(cael.hp == before_hp + 10, "raising max HP also raises current HP")
	_assert(cael.attack == before_attack + 1, "an inheritance can raise attack")
	_assert(cael.max_resolve == before_resolve + 1, "an inheritance can raise max Resolve")
	_assert(cael.resolve == before_resolve + 1, "raising max Resolve also raises current Resolve")

func _test_inheritances() -> void:
	var offers := InheritanceDB.offers("morning")
	_assert(offers.size() == 3, "Bell Rest offers three memories")
	var card := InheritanceDB.card(offers[0])
	_assert(not card.is_empty(), "an offered card has data")
	_assert(String(card.get("name", "")) != "", "a card has a name")
	var modifiers := InheritanceDB.modifiers([offers[0]])
	_assert(not modifiers.is_empty(), "a card contributes modifiers")

func _test_determinism() -> void:
	var a := _new_sim(777)
	var b := _new_sim(777)
	_run_scripted_round(a)
	_run_scripted_round(b)
	_assert(JSON.stringify(a.snapshot()) == JSON.stringify(b.snapshot()), "same seed and commands produce the same state")

func _run_scripted_round(sim: BattleSim) -> void:
	sim.use_action(&"ratchet_shot", &"ashwright")
	sim.use_action(&"cinder_lance", &"ashwright")
	sim.use_action(&"iron_cleave", &"ashwright")
	var safety := 0
	while sim.is_enemy_turn() and safety < 10:
		sim.enemy_act()
		safety += 1

func _assert(condition: bool, message: String) -> void:
	if condition:
		passed += 1
		print("  ok  " + message)
	else:
		failed += 1
		printerr("FAIL  " + message)
