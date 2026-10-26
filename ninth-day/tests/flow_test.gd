extends Node

## End-to-end harness. Added to /root by flow_bootstrap so it survives
## scene changes. Run: godot --headless --path ninth-day res://tests/flow_bootstrap.tscn

var passed: int = 0
var failed: int = 0

func _ready() -> void:
	call_deferred("_run")

func _run() -> void:
	print("NINTH DAY — flow test")
	print("----------------------------------")
	RunState.new_cycle()
	BattleStore.delete()
	get_tree().change_scene_to_file("res://src/screens/title.tscn")
	if not await _wait_for_scene("Title"):
		return _finish()

	var title := get_tree().current_scene
	title._on_begin()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.next_phase() == "morning", "a new cycle starts at Day 1 Morning")

	var map := get_tree().current_scene
	map._on_phase_pressed("morning")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	_assert(RunState.pending_phase == "morning", "the map hands the phase to the story")

	var story := get_tree().current_scene
	_assert(story.service.story_title() == "The Crack", "the story opens on the right scene")
	if not await _wait_for_story_ready(story):
		return _finish()
	_assert(String(story.service.current_line().get("id", "")) == "d1m_001", "Ink returns the first line")
	_assert(String(story.service.current_line().get("speaker", "")) == "Narration", "Ink tags parse the speaker")
	_assert(String(story.service.current_line().get("bg", "")) == "spire", "Ink tags parse the background")
	var steps := 0
	while story._mode != "ended" and steps < 40:
		steps += 1
		if story._mode == "choices":
			story.service.choose(0)
		else:
			story.service.advance()
		await get_tree().process_frame
	_assert(story._mode == "ended", "the story reaches its closing card")
	_assert(bool(RunState.get_flag("mara_trust")), "the story choice is recorded")

	story._on_continue_pressed()
	if not await _wait_for_scene("BattleView"):
		return _finish()
	var battle := get_tree().current_scene
	_assert(battle.sim.encounter_id == &"tutorial", "morning starts the Hollow Choir tutorial")
	_assert(battle.sim.enemies.size() == 1, "the tutorial has a single enemy")
	_assert(battle.sim.party[0].max_hp >= 90, "the battle party is initialized")

	battle.sim.enemies[0].hp = 1
	battle.sim.use_action(&"strike", battle.sim.enemies[0].id)
	battle._refresh()
	_assert(battle.sim.phase == "victory", "winning the tutorial reaches victory")
	_assert(not BattleStore.has_save(), "finishing a battle clears its autosave")

	battle._on_result_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	var rest := get_tree().current_scene
	var offer := InheritanceDB.offers("morning")[0]
	rest._on_card_selected(offer)
	_assert(not rest._confirm_button.disabled, "selecting a memory enables the confirm button")
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()

	_assert(RunState.is_phase_completed(1, "morning"), "Bell Rest completes the morning phase")
	_assert(RunState.is_phase_unlocked("afternoon"), "completing morning unlocks afternoon")
	_assert(RunState.next_phase() == "afternoon", "the map now points at afternoon")
	_assert(RunState.has_inheritance(offer), "the chosen memory enters the archive")
	_assert(RunState.equipped.size() == 1, "the first memory is equipped automatically")
	_assert(FileAccess.file_exists(RunState.SAVE_PATH), "the run state is persisted")

	# Afternoon: story, the Ashwright, and the inheritance bonus in battle.
	map = get_tree().current_scene
	map._on_phase_pressed("afternoon")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "Ember Row", "afternoon opens on Ember Row")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BattleView"):
		return _finish()
	battle = get_tree().current_scene
	_assert(battle.sim.encounter_id == &"ashwright", "afternoon starts the Ashwright fight")
	_assert(battle.sim.party[0].max_hp == 100, "the morning memory is applied to the next battle")
	battle.sim.enemies[0].hp = 1
	battle.sim.use_action(&"strike", battle.sim.enemies[0].id)
	battle._refresh()
	_assert(battle.sim.phase == "victory", "the Ashwright fight can be won")
	battle._on_result_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("afternoon")[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(1, "afternoon"), "the afternoon is complete")
	_assert(RunState.is_phase_unlocked("night"), "completing afternoon unlocks night")
	_assert(RunState.next_phase() == "night", "the map now points at night")

	# Night: a choice-only phase that still ends at the Bell.
	map = get_tree().current_scene
	map._on_phase_pressed("night")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "What the Bell Keeps", "night opens on the Spire")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("night")[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(1, "night"), "night completes Day 1")
	_assert(RunState.day == 2, "completing Day 1 advances to Day 2")
	_assert(RunState.next_phase() == "morning", "Day 2 starts at morning")
	_assert(RunState.equipped.size() == 3, "three memories are equipped")

	# Day 2 morning: a choice-only phase.
	map = get_tree().current_scene
	map._on_phase_pressed("morning")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Checkpoint", "Day 2 opens at the Watch checkpoint")
	if not await _drive_story(story):
		return _finish()
	_assert(bool(RunState.get_flag("watch_bluff")), "the Day 2 choice is recorded")
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("morning", 2)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(2, "morning"), "Day 2 morning is complete")
	_assert(RunState.is_phase_unlocked("afternoon"), "Day 2 afternoon unlocks")

	# Day 2 afternoon: the Watch Hound.
	map = get_tree().current_scene
	map._on_phase_pressed("afternoon")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Watch Hound", "Day 2 afternoon names the Hound")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BattleView"):
		return _finish()
	battle = get_tree().current_scene
	_assert(battle.sim.encounter_id == &"watch_hound", "Day 2 afternoon starts the Watch Hound fight")
	_assert(battle.sim.enemies.size() == 1, "the Hound fights alone")
	battle.sim.enemies[0].hp = 1
	battle.sim.use_action(&"strike", battle.sim.enemies[0].id)
	battle._refresh()
	_assert(battle.sim.phase == "victory", "the Watch Hound can be defeated")
	battle._on_result_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("afternoon", 2)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("night"), "Day 2 night unlocks")

	# Day 2 night: the debt is settled and Day 3 is revealed as out of scope.
	map = get_tree().current_scene
	map._on_phase_pressed("night")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "A Debt Paid", "Day 2 night closes the debt")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("night", 2)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(2, "night"), "Day 2 night is complete")
	_assert(RunState.day == 3, "the cycle advances to Day 3")
	_assert(RunState.next_phase() == "morning", "Day 3 starts at morning")

	# Day 3 morning: the descent.
	map = get_tree().current_scene
	map._on_phase_pressed("morning")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "Descent", "Day 3 opens below the foundry")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("morning", 3)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("afternoon"), "Day 3 afternoon unlocks")

	# Day 3 afternoon: the Ashwright reforged, with the Choir.
	map = get_tree().current_scene
	map._on_phase_pressed("afternoon")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Counterweights", "Day 3 afternoon names the counterweights")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BattleView"):
		return _finish()
	battle = get_tree().current_scene
	_assert(battle.sim.encounter_id == &"bellows", "Day 3 starts the Bellows fight")
	_assert(battle.sim.enemies.size() == 2, "the Bellows fight is a duo")
	for enemy in battle.sim.enemies:
		enemy.hp = 1
	battle.sim.use_action(&"strike", battle.sim.enemies[0].id)
	battle.sim.use_action(&"strike", battle.sim.enemies[1].id)
	battle._refresh()
	_assert(battle.sim.phase == "victory", "the Bellows can be cleared")
	battle._on_result_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("afternoon", 3)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("night"), "Day 3 night unlocks")

	# Day 3 night: the Choir's offer ends the authored slice.
	map = get_tree().current_scene
	map._on_phase_pressed("night")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Choir's Offer", "Day 3 night names the Choir's offer")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("night", 3)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(3, "night"), "Day 3 night is complete")
	_assert(RunState.day == 4, "the cycle advances to Day 4")
	_assert(RunState.next_phase() == "morning", "Day 4 starts at morning")

	# Day 4 morning: the memory gardens.
	map = get_tree().current_scene
	map._on_phase_pressed("morning")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "Saint Orra", "Day 4 opens in the memory gardens")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("morning", 4)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("afternoon"), "Day 4 afternoon unlocks")

	# Day 4 afternoon: the Clockwork Saint retreats instead of dying.
	map = get_tree().current_scene
	map._on_phase_pressed("afternoon")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Clockwork Saint", "Day 4 afternoon names the Saint")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BattleView"):
		return _finish()
	battle = get_tree().current_scene
	_assert(battle.sim.encounter_id == &"clockwork_saint", "Day 4 starts the Clockwork Saint")
	battle.sim.enemies[0].hp = 81
	battle.sim.use_action(&"strike", battle.sim.enemies[0].id)
	battle._refresh()
	_assert(battle.sim.phase == "victory", "the Saint retreats rather than dying")
	_assert(battle._result_label.text.contains("WITHDRAWS"), "the retreat has its own result card")
	battle._on_result_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("afternoon", 4)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("night"), "Day 4 night unlocks")

	# Day 4 night: Wren on the roof ends the authored slice.
	map = get_tree().current_scene
	map._on_phase_pressed("night")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The First Wren", "Day 4 night introduces Wren")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("night", 4)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(4, "night"), "Day 4 night is complete")
	_assert(RunState.day == 5, "the cycle advances to Day 5")
	_assert(RunState.next_phase() == "morning", "Day 5 starts at morning")

	# Day 5 morning: Wren's house and the first crack.
	map = get_tree().current_scene
	map._on_phase_pressed("morning")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "Wren's House", "Day 5 opens at Wren's house")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("morning", 5)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("afternoon"), "Day 5 afternoon unlocks")

	# Day 5 afternoon: the Hollow Bellkeeper mirrors the party.
	map = get_tree().current_scene
	map._on_phase_pressed("afternoon")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Hollow Bellkeeper", "Day 5 afternoon names the Hollow Bellkeeper")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BattleView"):
		return _finish()
	battle = get_tree().current_scene
	_assert(battle.sim.encounter_id == &"hollow_bellkeeper", "Day 5 starts the Hollow Bellkeeper")
	battle.sim.enemies[0].hp = 1
	battle.sim.use_action(&"strike", battle.sim.enemies[0].id)
	battle._refresh()
	_assert(battle.sim.phase == "victory", "the Hollow Bellkeeper can be defeated")
	battle._on_result_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("afternoon", 5)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("night"), "Day 5 night unlocks")

	# Day 5 night: the truth of the first crack.
	map = get_tree().current_scene
	map._on_phase_pressed("night")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The First Crack", "Day 5 night reveals the first crack")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("night", 5)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(5, "night"), "Day 5 night is complete")
	_assert(RunState.day == 6, "the cycle advances to Day 6")
	_assert(RunState.next_phase() == "morning", "Day 6 starts at morning")

	# Day 6 morning: choose the Watch alliance, which selects the Iron Choir.
	map = get_tree().current_scene
	map._on_phase_pressed("morning")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Coup", "Day 6 opens with Sera's coup")
	if not await _drive_story(story):
		return _finish()
	_assert(bool(RunState.get_flag("allied_watch")), "the Watch alliance is recorded")
	_assert(RunState.encounter_for_phase("afternoon") == &"iron_choir", "the Watch alliance faces the Iron Choir")
	RunState.set_flag("allied_rebels", true)
	_assert(RunState.encounter_for_phase("afternoon") == &"sera_vane", "the rebel alliance faces Sera Vane")
	RunState.flags.erase("allied_rebels")
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("morning", 6)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("afternoon"), "Day 6 afternoon unlocks")

	# Day 6 afternoon: the alliance commits us to the Iron Choir.
	map = get_tree().current_scene
	map._on_phase_pressed("afternoon")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Watch Closes", "Day 6 afternoon closes the gates")
	if not await _drive_story(story):
		return _finish()
	story._on_continue_pressed()
	if not await _wait_for_scene("BattleView"):
		return _finish()
	battle = get_tree().current_scene
	_assert(battle.sim.encounter_id == &"iron_choir", "the Watch alliance starts the Iron Choir fight")
	battle.sim.enemies[0].hp = 1
	battle.sim.use_action(&"strike", battle.sim.enemies[0].id)
	battle._refresh()
	_assert(battle.sim.phase == "victory", "the Iron Choir can be broken")
	battle._on_result_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("afternoon", 6)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_unlocked("night"), "Day 6 night unlocks")

	# Day 6 night: reach one friend before the Bell rings.
	map = get_tree().current_scene
	map._on_phase_pressed("night")
	if not await _wait_for_scene("StoryView"):
		return _finish()
	story = get_tree().current_scene
	_assert(story.service.story_title() == "The Hollowed", "Day 6 night names the Hollowed")
	if not await _drive_story(story):
		return _finish()
	_assert(bool(RunState.get_flag("saved_mara")), "the night choice saves Mara")
	story._on_continue_pressed()
	if not await _wait_for_scene("BellRest"):
		return _finish()
	rest = get_tree().current_scene
	offer = InheritanceDB.offers("night", 6)[0]
	rest._on_card_selected(offer)
	rest._on_confirm()
	if not await _wait_for_scene("BellMap"):
		return _finish()
	_assert(RunState.is_phase_completed(6, "night"), "Day 6 night is complete")
	_assert(RunState.day == 7, "the cycle advances to Day 7")
	_assert(RunState.next_phase() == "", "Day 7 has no authored phases yet")
	_assert(RunState.inheritances.size() >= 18, "eighteen memories are archived")
	_assert(RunState.equipped.size() == 6, "the loadout caps at six memories")
	_finish()

func _drive_story(story: Node) -> bool:
	if not await _wait_for_story_ready(story):
		return false
	var steps := 0
	while story._mode != "ended" and steps < 60:
		steps += 1
		if story._mode == "choices":
			story.service.choose(0)
		else:
			story.service.advance()
		await get_tree().process_frame
	_assert(story._mode == "ended", "the story reaches its closing card")
	return story._mode == "ended"

func _wait_for_story_ready(story: Node) -> bool:
	for i in 60:
		await get_tree().process_frame
		var line: Dictionary = story.service.current_line()
		if not line.is_empty():
			return true
	_assert(false, "timed out waiting for Ink to return a line")
	return false

func _wait_for_scene(scene_name: String) -> bool:
	for i in 120:
		await get_tree().process_frame
		var scene := get_tree().current_scene
		if scene != null and scene.name == scene_name:
			return true
	_assert(false, "timed out waiting for scene: " + scene_name)
	return false

func _assert(condition: bool, message: String) -> void:
	if condition:
		passed += 1
		print("  ok  " + message)
	else:
		failed += 1
		printerr("FAIL  " + message)

func _finish() -> void:
	print("----------------------------------")
	print("%d passed, %d failed" % [passed, failed])
	get_tree().quit(0 if failed == 0 else 1)
