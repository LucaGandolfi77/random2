extends Control

func _ready() -> void:
	Ui.add_backdrop(self, Palette.BELL)
	var margin := Ui.screen_margin(self, 44, 30)
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 12)
	root.alignment = BoxContainer.ALIGNMENT_CENTER
	margin.add_child(root)

	root.add_child(Ui.overline("AUREL · THE LAST BELLKEEPER"))
	var title := Ui.label("NINTH\nDAY", 58, Palette.BRASS)
	title.add_theme_constant_override("line_spacing", -8)
	root.add_child(title)

	var rule_row := HBoxContainer.new()
	rule_row.add_theme_constant_override("separation", 12)
	root.add_child(rule_row)
	var short_rule := Ui.rule(Palette.BRASS_DARK)
	short_rule.custom_minimum_size = Vector2(72, 1)
	rule_row.add_child(short_rule)
	rule_row.add_child(Ui.label("A time-loop JRPG", 12, Palette.MUTED))

	var subtitle := Ui.body("The Bell will ring at noon.\nThe city will forget. You will not.")
	subtitle.add_theme_font_size_override("font_size", 17)
	subtitle.add_theme_color_override("font_color", Palette.PAPER_DIM)
	root.add_child(subtitle)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 44)
	root.add_child(spacer)

	if RunState.has_run():
		var next_phase := RunState.next_phase()
		var status := "Day %d" % RunState.day
		if RunState.day_complete:
			status += " · complete"
		elif RunState.current_screen == "bell_rest" and RunState.pending_phase != "":
			status += " · Bell Rest · " + RunState.pending_phase.capitalize()
		elif next_phase != "":
			status += " · " + RunState.phase_title(next_phase)
		else:
			status += " · the Bell is waiting"
		var continue_button := Ui.button("CONTINUE\n" + status, 76, Palette.BELL)
		continue_button.add_theme_font_size_override("font_size", 16)
		continue_button.pressed.connect(_on_continue)
		root.add_child(continue_button)

		var new_button := Ui.button("Begin a new cycle", 48)
		new_button.add_theme_color_override("font_color", Palette.MUTED)
		new_button.pressed.connect(_on_new_cycle)
		root.add_child(new_button)
	else:
		var begin := Ui.button("Begin the loop", 64, Palette.BELL)
		begin.add_theme_font_size_override("font_size", 17)
		begin.pressed.connect(_on_begin)
		root.add_child(begin)

	var bottom_spacer := Control.new()
	bottom_spacer.custom_minimum_size = Vector2(0, 28)
	root.add_child(bottom_spacer)
	root.add_child(Ui.rule())
	root.add_child(Ui.label("No ads. No energy. One complete story.", 11, Palette.MUTED))

func _on_begin() -> void:
	RunState.new_cycle()
	BattleStore.delete()
	get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _on_continue() -> void:
	if RunState.current_screen == "bell_rest" and RunState.pending_phase != "":
		get_tree().change_scene_to_file("res://src/screens/bell_rest.tscn")
	elif BattleStore.has_save():
		get_tree().change_scene_to_file("res://src/battle/battle_view.tscn")
	else:
		get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _on_new_cycle() -> void:
	RunState.new_cycle()
	BattleStore.delete()
	get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")
