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
	_assert(RunState.day_complete, "night completes Day 1")
	_assert(RunState.next_phase() == "", "no phases remain in Day 1")
	_assert(RunState.equipped.size() == 3, "three memories are equipped")
	_finish()

func _drive_story(story: Node) -> bool:
	var steps := 0
	while story._mode != "ended" and steps < 40:
		steps += 1
		if story._mode == "choices":
			story.service.choose(0)
		else:
			story.service.advance()
		await get_tree().process_frame
	_assert(story._mode == "ended", "the story reaches its closing card")
	return story._mode == "ended"

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
