extends Control

const DAY_NAMES := {
	1: "The Crack",
	2: "The Debt",
	3: "The Bellows",
	4: "Saint Orra",
	5: "The Quiet",
	6: "The Watch",
	7: "The Offer",
	8: "The Spire",
	9: "The Quiet",
}

func _ready() -> void:
	Ui.add_backdrop(self, Palette.BRASS)
	var margin := Ui.screen_margin(self, 26, 18)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 14)
	margin.add_child(outer)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 10)
	outer.add_child(header)
	var title_box := VBoxContainer.new()
	title_box.add_theme_constant_override("separation", 2)
	title_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title_box)
	title_box.add_child(Ui.overline("AUREL · THE BELL MAP"))
	title_box.add_child(Ui.heading("Day %d of Nine" % RunState.day))
	header.add_child(Ui.label("THE CITY IS WAITING", 9, Palette.MUTED))

	outer.add_child(Ui.rule())
	var intro := Ui.label("Nine days. Three phases each. The Bell keeps what you choose to remember.", 14, Palette.PAPER_DIM, true)
	outer.add_child(intro)

	if RunState.day_complete:
		outer.add_child(_completion_panel(RunState.day))
	elif RunState.day > RunState.LAST_AUTHORED_DAY and RunState.is_phase_completed(RunState.day - 1, "night"):
		outer.add_child(_completion_panel(RunState.day - 1))

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	outer.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 12)
	scroll.add_child(list)

	for day_number in range(1, 10):
		list.add_child(_day_block(day_number))

	var footer := HBoxContainer.new()
	footer.add_theme_constant_override("separation", 8)
	outer.add_child(footer)
	var title_button := Ui.button("Title", 48)
	title_button.custom_minimum_size = Vector2(88, 48)
	title_button.autowrap_mode = TextServer.AUTOWRAP_OFF
	title_button.add_theme_color_override("font_color", Palette.MUTED)
	title_button.pressed.connect(_on_title)
	footer.add_child(title_button)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(spacer)
	footer.add_child(Ui.label("Inheritances: %d / 6 equipped" % RunState.equipped.size(), 11, Palette.MUTED))

func _day_block(day_number: int) -> VBoxContainer:
	var block := VBoxContainer.new()
	block.add_theme_constant_override("separation", 6)

	var current := day_number == RunState.day
	var finished_day := RunState.is_phase_completed(day_number, "night")
	var has_content := day_number <= RunState.LAST_AUTHORED_DAY
	var unlocked := current or finished_day
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 9)
	block.add_child(header)

	var ring := PanelContainer.new()
	ring.custom_minimum_size = Vector2(34, 34)
	var ring_style := Ui.panel_style(Palette.BG, Palette.BRASS if current else Palette.LINE)
	ring_style.set_corner_radius_all(17)
	ring_style.content_margin_left = 0
	ring_style.content_margin_right = 0
	ring_style.content_margin_top = 4
	ring_style.content_margin_bottom = 4
	ring.add_theme_stylebox_override("panel", ring_style)
	header.add_child(ring)
	var number := Ui.label(str(day_number), 15, Palette.BELL if current else Palette.MUTED)
	number.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ring.add_child(number)

	var name_box := VBoxContainer.new()
	name_box.add_theme_constant_override("separation", 0)
	name_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(name_box)
	name_box.add_child(Ui.label(String(DAY_NAMES.get(day_number, "Unknown")), 16, Palette.PAPER if unlocked else Palette.MUTED))
	var state_text := "COMPLETE" if RunState.is_phase_completed(day_number, "night") else ("CURRENT" if current else "LOCKED")
	name_box.add_child(Ui.label("Day %d · %s" % [day_number, state_text], 10, Palette.BRASS if current else Palette.MUTED))

	if has_content and (current or finished_day):
		for phase in RunState.PHASES:
			block.add_child(_phase_button(day_number, phase))
	elif RunState.is_day_unlocked(day_number):
		var open_label := Ui.label("  Not in this build yet.", 12, Palette.MUTED)
		block.add_child(open_label)
	else:
		var locked_label := Ui.label("  Finish the previous day to open this ring.", 12, Palette.MUTED)
		block.add_child(locked_label)

	block.add_child(Ui.rule(Palette.LINE))
	return block

func _phase_button(day_number: int, phase: String) -> Button:
	var completed := RunState.is_phase_completed(day_number, phase)
	var unlocked := day_number == RunState.day and RunState.is_phase_unlocked(phase)
	var marker := "✓" if completed else ("▶" if unlocked else "—")
	var suffix := "complete" if completed else ("tap to enter" if unlocked else "locked")
	var text := "%s  %s\n     %s · %s" % [
		marker,
		RunState.phase_title_for(day_number, phase).to_upper(),
		RunState.phase_type_for(day_number, phase),
		suffix,
	]
	var button := Ui.card_button(text, 66)
	button.add_theme_font_size_override("font_size", 13)
	button.disabled = not unlocked or completed
	if completed:
		button.add_theme_color_override("font_color", Palette.MUTED)
	elif unlocked:
		button.add_theme_color_override("font_color", Palette.BELL if RunState.next_phase() == phase else Palette.PAPER)
		button.pressed.connect(_on_phase_pressed.bind(phase))
	return button

func _completion_panel(p_day: int) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", Ui.panel_style(Palette.BG_RAISED, Palette.BELL))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	panel.add_child(box)
	box.add_child(Ui.overline("DAY %d COMPLETE" % p_day))
	box.add_child(Ui.label("The Bell has not rung. What you kept is still yours.", 13, Palette.PAPER, true))
	box.add_child(Ui.label("This build ends after Day %d. Day %d is not authored yet." % [RunState.LAST_AUTHORED_DAY, RunState.LAST_AUTHORED_DAY + 1], 11, Palette.MUTED, true))
	var reset := Ui.button("Begin a new cycle", 48)
	reset.add_theme_color_override("font_color", Palette.MUTED)
	reset.pressed.connect(_on_new_cycle)
	box.add_child(reset)
	return panel

func _on_phase_pressed(phase: String) -> void:
	RunState.pending_phase = phase
	RunState.current_screen = "story"
	RunState.save()
	get_tree().change_scene_to_file("res://src/screens/story_view.tscn")

func _on_new_cycle() -> void:
	RunState.new_cycle()
	BattleStore.delete()
	get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _on_title() -> void:
	get_tree().change_scene_to_file("res://src/screens/title.tscn")
