extends Control

## Development helper: captures the non-battle screens for visual checks.
##   godot --path ninth-day res://tools/capture_screen.tscn -- --screen=map

const OUTPUT_DIR := "/tmp/opencode"

func _ready() -> void:
	var screen := "title"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--screen="):
			screen = arg.split("=", true, 1)[1]
	RunState.new_cycle()
	BattleStore.delete()

	var scene: Node = null
	match screen:
		"title":
			scene = load("res://src/screens/title.tscn").instantiate()
		"map":
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"map_day2":
			_complete_day(1)
			RunState.day = 2
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"map_day3":
			_complete_day(1)
			_complete_day(2)
			RunState.day = 3
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"map_day4":
			_complete_day(1)
			_complete_day(2)
			_complete_day(3)
			RunState.day = 4
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"map_day5":
			_complete_day(1)
			_complete_day(2)
			_complete_day(3)
			_complete_day(4)
			RunState.day = 5
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"map_day6":
			_complete_day(1)
			_complete_day(2)
			_complete_day(3)
			_complete_day(4)
			_complete_day(5)
			RunState.day = 6
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"complete_day2":
			_complete_day(1)
			_complete_day(2)
			RunState.day = 3
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"complete_day3":
			_complete_day(1)
			_complete_day(2)
			_complete_day(3)
			RunState.day = 4
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"complete_day4":
			_complete_day(1)
			_complete_day(2)
			_complete_day(3)
			_complete_day(4)
			RunState.day = 5
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"complete_day5":
			_complete_day(1)
			_complete_day(2)
			_complete_day(3)
			_complete_day(4)
			_complete_day(5)
			RunState.day = 6
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"complete_day6":
			_complete_day(1)
			_complete_day(2)
			_complete_day(3)
			_complete_day(4)
			_complete_day(5)
			_complete_day(6)
			RunState.day = 7
			RunState.save()
			scene = load("res://src/screens/bell_map.tscn").instantiate()
		"story":
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"story_afternoon":
			RunState.pending_phase = "afternoon"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"story_night":
			RunState.pending_phase = "night"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"story_day2":
			RunState.day = 2
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"choices":
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"choices_day2":
			RunState.day = 2
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"story_day3":
			RunState.day = 3
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"choices_day3":
			RunState.day = 3
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"story_day4":
			RunState.day = 4
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"choices_day4":
			RunState.day = 4
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"story_day5":
			RunState.day = 5
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"choices_day5":
			RunState.day = 5
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"story_day6":
			RunState.day = 6
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"choices_day6":
			RunState.day = 6
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"rest":
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/bell_rest.tscn").instantiate()
		"rest_day2":
			RunState.day = 2
			RunState.pending_phase = "afternoon"
			scene = load("res://src/screens/bell_rest.tscn").instantiate()
		"rest_day3":
			RunState.day = 3
			RunState.pending_phase = "afternoon"
			scene = load("res://src/screens/bell_rest.tscn").instantiate()
		"rest_day4":
			RunState.day = 4
			RunState.pending_phase = "afternoon"
			scene = load("res://src/screens/bell_rest.tscn").instantiate()
		"rest_day5":
			RunState.day = 5
			RunState.pending_phase = "afternoon"
			scene = load("res://src/screens/bell_rest.tscn").instantiate()
		"rest_day6":
			RunState.day = 6
			RunState.pending_phase = "afternoon"
			scene = load("res://src/screens/bell_rest.tscn").instantiate()
		_:
			scene = load("res://src/screens/title.tscn").instantiate()

	add_child(scene)
	scene.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	if screen in ["story", "story_afternoon", "story_night", "story_day2", "choices", "choices_day2", "story_day3", "choices_day3", "story_day4", "choices_day4", "story_day5", "choices_day5", "story_day6", "choices_day6"]:
		for i in 60:
			await get_tree().process_frame
			if not scene.service.current_line().is_empty():
				break
	if screen in ["choices", "choices_day2", "choices_day3", "choices_day4", "choices_day5", "choices_day6"]:
		var steps := 0
		while scene._mode != "choices" and steps < 60:
			steps += 1
			scene.service.advance()
			await get_tree().process_frame
	if screen in ["rest", "rest_day2", "rest_day3", "rest_day4", "rest_day5", "rest_day6"]:
		await get_tree().process_frame
		var offers := InheritanceDB.offers(scene.phase, RunState.day)
		if not offers.is_empty():
			scene._on_card_selected(offers[0])

	await get_tree().create_timer(0.4).timeout
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var path := "%s/ninth-day-%s.png" % [OUTPUT_DIR, screen]
	var error := image.save_png(path)
	if error == OK:
		print("Saved ", path)
	else:
		printerr("Failed to save screenshot: ", error)
	get_tree().quit(0 if error == OK else 1)

func _complete_day(p_day: int) -> void:
	for phase in RunState.PHASES:
		RunState.completed[RunState.phase_key(p_day, phase)] = true
