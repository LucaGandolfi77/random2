extends Control

var service: StoryService
var phase: String = "morning"
var story_id: String = ""
var _mode: String = "line"
var _current_line: Dictionary = {}

var _phase_label: Label
var _title_label: Label
var _stage_art: StageArt
var _stage_label: Label
var _stage_caption: Label
var _speaker_label: Label
var _dialogue_label: Label
var _prompt_label: Label
var _continue_button: Button
var _choice_box: VBoxContainer
var _map_button: Button

func _ready() -> void:
	phase = RunState.pending_phase if RunState.pending_phase != "" else "morning"
	story_id = "day_%02d_%s" % [RunState.day, phase]
	Ui.add_backdrop(self, _phase_tint())
	var margin := Ui.screen_margin(self, 26, 22)
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 10)
	margin.add_child(root)

	var header := HBoxContainer.new()
	root.add_child(header)
	var header_box := VBoxContainer.new()
	header_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_box.add_theme_constant_override("separation", 2)
	header.add_child(header_box)
	_phase_label = Ui.overline("DAY %d · %s" % [RunState.day, phase.to_upper()])
	header_box.add_child(_phase_label)
	_title_label = Ui.heading("The Crack")
	header_box.add_child(_title_label)
	_map_button = Ui.button("Map", 48)
	_map_button.add_theme_color_override("font_color", Palette.MUTED)
	_map_button.custom_minimum_size = Vector2(80, 48)
	_map_button.autowrap_mode = TextServer.AUTOWRAP_OFF
	_map_button.pressed.connect(_on_map_pressed)
	header.add_child(_map_button)

	root.add_child(Ui.rule())

	var stage := Control.new()
	stage.custom_minimum_size = Vector2(0, 244)
	root.add_child(stage)
	_stage_art = StageArt.new()
	_stage_art.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	stage.add_child(_stage_art)
	var stage_box := VBoxContainer.new()
	stage_box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	stage_box.alignment = BoxContainer.ALIGNMENT_CENTER
	stage_box.add_theme_constant_override("separation", 6)
	stage.add_child(stage_box)
	_stage_label = Ui.label("·", 68, Palette.BRASS)
	_stage_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stage_box.add_child(_stage_label)
	_stage_caption = Ui.label("THE SPIRE", 10, Palette.MUTED)
	_stage_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stage_box.add_child(_stage_caption)

	var dialogue_panel := PanelContainer.new()
	dialogue_panel.custom_minimum_size = Vector2(0, 190)
	dialogue_panel.add_theme_stylebox_override("panel", Ui.panel_style(Palette.PANEL, Palette.LINE))
	root.add_child(dialogue_panel)
	var dialogue_box := VBoxContainer.new()
	dialogue_box.add_theme_constant_override("separation", 8)
	dialogue_panel.add_child(dialogue_box)
	_speaker_label = Ui.label("NARRATION", 11, Palette.BRASS)
	dialogue_box.add_child(_speaker_label)
	_dialogue_label = Ui.label("", 18, Palette.PAPER, true)
	_dialogue_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	dialogue_box.add_child(_dialogue_label)
	_prompt_label = Ui.label("", 14, Palette.PAPER_DIM, true)
	_prompt_label.visible = false
	dialogue_box.add_child(_prompt_label)

	_choice_box = VBoxContainer.new()
	_choice_box.add_theme_constant_override("separation", 7)
	root.add_child(_choice_box)

	var flex := Control.new()
	flex.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(flex)

	_continue_button = Ui.button("CONTINUE  ›", 54, Palette.BELL)
	_continue_button.pressed.connect(_on_continue_pressed)
	root.add_child(_continue_button)

	service = StoryService.new()
	service.state = RunState
	add_child(service)
	service.line_ready.connect(_on_line_ready)
	service.choices_ready.connect(_on_choices_ready)
	service.story_ended.connect(_on_story_ended)
	if not service.start(story_id):
		_on_map_pressed()
		return
	_title_label.text = service.story_title()

func _on_line_ready(line: Dictionary) -> void:
	_current_line = line
	_mode = "line"
	_clear_choices()
	_prompt_label.visible = false
	_continue_button.visible = true
	_continue_button.text = "CONTINUE  ›"
	var speaker := String(line.get("speaker", "Narration"))
	_speaker_label.text = speaker.to_upper()
	_speaker_label.add_theme_color_override("font_color", _speaker_color(speaker))
	_stage_label.text = _speaker_glyph(speaker)
	_stage_label.add_theme_color_override("font_color", _speaker_color(speaker))
	_stage_label.visible = speaker != "Narration"
	_stage_caption.text = _background_caption(String(line.get("bg", "")))
	_stage_art.set_mode(String(line.get("bg", "")))
	_dialogue_label.text = String(line.get("text", ""))
	_dialogue_label.add_theme_color_override("font_color", Palette.PAPER_DIM if speaker == "Narration" else Palette.PAPER)

func _on_choices_ready(prompt: String, choices: Array) -> void:
	_mode = "choices"
	_continue_button.visible = false
	_clear_choices()
	_prompt_label.text = prompt
	_prompt_label.visible = prompt != ""
	for i in choices.size():
		var choice: Dictionary = choices[i]
		var button := Ui.button(String(choice.get("text", "...")), 50)
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.pressed.connect(_on_choice_pressed.bind(i))
		_choice_box.add_child(button)

func _on_story_ended(_story_id: String) -> void:
	_mode = "ended"
	_clear_choices()
	_prompt_label.visible = false
	_speaker_label.text = "THE BELL WAITS"
	_speaker_label.add_theme_color_override("font_color", Palette.BELL)
	_stage_label.text = "○"
	_stage_label.visible = false
	_stage_label.add_theme_color_override("font_color", Palette.BELL)
	_stage_caption.text = _background_caption("")
	_stage_art.set_mode(_default_bg())
	_dialogue_label.text = _closing_text()
	_dialogue_label.add_theme_color_override("font_color", Palette.PAPER)
	_continue_button.visible = true
	_continue_button.text = _closing_button_text()

func _on_continue_pressed() -> void:
	match _mode:
		"line":
			service.advance()
		"ended":
			_leave_story()

func _on_choice_pressed(index: int) -> void:
	_clear_choices()
	_prompt_label.visible = false
	_mode = "line"
	service.choose(index)

func _leave_story() -> void:
	var encounter := RunState.encounter_for_phase(phase)
	if phase == "night" or encounter == &"":
		RunState.current_screen = "bell_rest"
		RunState.save()
		get_tree().change_scene_to_file("res://src/screens/bell_rest.tscn")
	else:
		RunState.current_screen = "battle"
		RunState.save()
		BattleStore.delete()
		get_tree().change_scene_to_file("res://src/battle/battle_view.tscn")

func _on_map_pressed() -> void:
	RunState.current_screen = "map"
	RunState.save()
	get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _closing_text() -> String:
	if RunState.day == 2:
		match phase:
			"morning":
				return "The Watch checkpoint opens its gate. Somewhere behind the barrier, a Hound has your scent."
			"afternoon":
				return "The Hound corners you in the ash. There is no way past it but through."
			"night":
				return "Elias is alive. The Watch will want him back before dawn. What you keep now will survive the reset."
			_:
				return "The Bell waits."
	match phase:
		"morning":
			return "The Choir's note slides through the wall. Mara lifts her hammer. The first battle of the ninth day begins."
		"afternoon":
			return "The foundry door gives way. Heat, ash, and the slow ring of a hammer. The Ashwright is waiting."
		"night":
			return "The day is over. The Bell has not rung yet. What you keep now will survive the reset."
		_:
			return "The Bell waits."

func _closing_button_text() -> String:
	if phase == "night" or RunState.encounter_for_phase(phase) == &"":
		return "BELL REST  ›"
	return "ENTER BATTLE  ›"

func _phase_tint() -> Color:
	match phase:
		"morning":
			return Palette.BELL
		"afternoon":
			return Palette.EMBER
		"night":
			return Palette.HUSH
		_:
			return Palette.BRASS

func _speaker_color(speaker: String) -> Color:
	match speaker:
		"Cael":
			return Palette.BELL
		"Mara":
			return Palette.EMBER
		"Iven":
			return Palette.HUSH
		"Oria":
			return Palette.PAPER
		_:
			return Palette.BRASS

func _speaker_glyph(speaker: String) -> String:
	match speaker:
		"Cael":
			return "C"
		"Mara":
			return "M"
		"Iven":
			return "I"
		"Oria":
			return "O"
		_:
			return "◉"

func _background_caption(bg_id: String) -> String:
	match bg_id:
		"spire":
			return "THE SPIRE · " + phase.to_upper()
		"ember_row":
			return "EMBER ROW · " + phase.to_upper()
		"checkpoint":
			return "THE WATCH CHECKPOINT · " + phase.to_upper()
		"foundry":
			return "THE FOUNDRY"
		"spire_night":
			return "THE SPIRE · NIGHT"
		_:
			return "AUREL"

func _default_bg() -> String:
	match phase:
		"afternoon":
			return "ember_row"
		"night":
			return "spire_night"
		_:
			return "spire"

func _clear_choices() -> void:
	for child in _choice_box.get_children():
		_choice_box.remove_child(child)
		child.queue_free()
