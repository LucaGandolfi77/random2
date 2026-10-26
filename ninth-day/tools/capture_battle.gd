extends Control

## Development helper: renders the greybox battle and writes a PNG.
## Run with a display (or xvfb-run):
##   godot --path ninth-day res://tools/capture_battle.tscn

const OUTPUT := "/tmp/opencode/ninth-day-battle.png"

func _ready() -> void:
	BattleStore.delete()
	RunState.new_cycle()
	var args := OS.get_cmdline_user_args()
	if "--tutorial" in args:
		RunState.pending_phase = "morning"
		RunState.save()
	elif "--hound" in args:
		RunState.day = 2
		RunState.pending_phase = "afternoon"
		RunState.save()
	elif "--bellows" in args:
		RunState.day = 3
		RunState.pending_phase = "afternoon"
		RunState.save()
	var battle := preload("res://src/battle/battle_view.tscn").instantiate()
	add_child(battle)
	battle.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	if "--preview" in args:
		battle.sim.use_action(&"ratchet_shot", &"ashwright")
		battle._on_action_pressed(&"cinder_lance")
	elif "--mid" in args:
		battle.sim.use_action(&"ratchet_shot", &"ashwright")
		battle.sim.replay(0, &"ashwright")
		battle.sim.use_action(&"iron_cleave", &"ashwright")
		battle._refresh()
	await get_tree().create_timer(0.5).timeout
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var error := image.save_png(OUTPUT)
	if error == OK:
		print("Saved ", OUTPUT)
	else:
		printerr("Failed to save screenshot: ", error)
	get_tree().quit(0 if error == OK else 1)
