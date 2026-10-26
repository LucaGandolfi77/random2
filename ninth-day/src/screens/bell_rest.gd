extends Control

var phase: String = "morning"
var _selected_id: String = ""
var _card_box: VBoxContainer
var _confirm_button: Button
var _detail_label: Label

func _ready() -> void:
	phase = RunState.pending_phase if RunState.pending_phase != "" else "morning"
	Ui.add_backdrop(self, Palette.BELL)
	var margin := Ui.screen_margin(self, 26, 20)
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 10)
	margin.add_child(root)

	root.add_child(Ui.overline("DAY %d · %s" % [RunState.day, phase.to_upper()]))
	root.add_child(Ui.heading("Bell Rest"))
	root.add_child(Ui.label("The Bell rings once. Choose one memory to carry into the next loop.", 14, Palette.PAPER_DIM, true))
	root.add_child(Ui.rule())

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	root.add_child(scroll)
	_card_box = VBoxContainer.new()
	_card_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_card_box.add_theme_constant_override("separation", 8)
	scroll.add_child(_card_box)

	_detail_label = Ui.label("Choose a memory to see what it changes.", 13, Palette.MUTED, true)
	_detail_label.custom_minimum_size = Vector2(0, 38)
	root.add_child(_detail_label)

	_confirm_button = Ui.button("TAKE THIS MEMORY", 54, Palette.BELL)
	_confirm_button.disabled = true
	_confirm_button.pressed.connect(_on_confirm)
	root.add_child(_confirm_button)

	var skip := Ui.button("Leave without taking a memory", 48)
	skip.add_theme_color_override("font_color", Palette.MUTED)
	skip.pressed.connect(_on_skip)
	root.add_child(skip)

	_rebuild_cards()

func _rebuild_cards() -> void:
	for child in _card_box.get_children():
		_card_box.remove_child(child)
		child.queue_free()
	var offers := InheritanceDB.offers(phase, RunState.day)
	if offers.is_empty():
		_card_box.add_child(Ui.label("The Bell offers nothing tonight.", 14, Palette.MUTED))
		_confirm_button.text = "CONTINUE"
		_confirm_button.disabled = false
		return
	for card_id in offers:
		var card := InheritanceDB.card(card_id)
		var selected := card_id == _selected_id
		var text := "%s%s\n%s\n\n%s\n\n%s" % [
			"◆  " if selected else "·  ",
			String(card.get("name", card_id)),
			String(card.get("type", "Memory")).to_upper(),
			String(card.get("description", "")),
			String(card.get("effect", "")),
		]
		var button := Ui.card_button(text, 132)
		button.add_theme_font_size_override("font_size", 13)
		button.add_theme_color_override("font_color", Palette.BELL if selected else Palette.PAPER)
		if selected:
			var style := Ui.panel_style(Palette.BG_RAISED, Palette.BELL)
			style.set_corner_radius_all(4)
			button.add_theme_stylebox_override("normal", style)
		button.pressed.connect(_on_card_selected.bind(card_id))
		_card_box.add_child(button)

func _on_card_selected(card_id: String) -> void:
	_selected_id = card_id
	var card := InheritanceDB.card(card_id)
	_detail_label.text = "%s · %s\n%s" % [
		String(card.get("type", "Memory")).to_upper(),
		String(card.get("name", card_id)),
		String(card.get("effect", "")),
	]
	_detail_label.add_theme_color_override("font_color", Palette.PAPER)
	_confirm_button.disabled = false
	_rebuild_cards()

func _on_confirm() -> void:
	if _selected_id != "":
		RunState.add_inheritance(_selected_id)
	_finish_phase()

func _on_skip() -> void:
	_finish_phase()

func _finish_phase() -> void:
	RunState.complete_phase(phase)
	if phase == "night":
		RunState.advance_day()
	else:
		RunState.pending_phase = ""
		RunState.current_screen = "map"
		RunState.save()
	get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")
