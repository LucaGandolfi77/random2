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
		"complete":
			for phase in RunState.PHASES:
				RunState.completed[RunState.phase_key(1, phase)] = true
			RunState.day_complete = true
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
		"choices":
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/story_view.tscn").instantiate()
		"rest":
			RunState.pending_phase = "morning"
			scene = load("res://src/screens/bell_rest.tscn").instantiate()
		_:
			scene = load("res://src/screens/title.tscn").instantiate()

	add_child(scene)
	scene.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	if screen == "choices":
		await get_tree().process_frame
		for i in 8:
			scene.service.advance()
	if screen == "rest":
		await get_tree().process_frame
		scene._on_card_selected("burnt_sugar")

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
