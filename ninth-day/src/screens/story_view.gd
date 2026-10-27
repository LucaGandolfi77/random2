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
var _skip_button: Button
var _choice_box: VBoxContainer
var _map_button: Button
var _seen_at_start: Dictionary = {}
var _skipping: bool = false

func _ready() -> void:
	_seen_at_start = RunState.seen_lines.duplicate()
	var side_id := RunState.pending_story
	if side_id != "":
		phase = "side"
		story_id = side_id
	else:
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
	_phase_label = Ui.overline(_header_overline())
	header_box.add_child(_phase_label)
	_title_label = Ui.heading("The Crack")
	header_box.add_child(_title_label)
	if RunState.cycle_number > 1:
		header_box.add_child(Ui.label("ECHO · YOU HAVE BEEN HERE BEFORE", 9, Palette.BELL))
	_skip_button = Ui.button("Skip read", 48)
	_skip_button.custom_minimum_size = Vector2(92, 48)
	_skip_button.autowrap_mode = TextServer.AUTOWRAP_OFF
	_skip_button.add_theme_font_size_override("font_size", 11)
	_skip_button.add_theme_color_override("font_color", Palette.MUTED)
	_skip_button.disabled = _seen_at_start.is_empty()
	_skip_button.pressed.connect(_on_skip_pressed)
	header.add_child(_skip_button)
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
	if not _skipping and _skip_button != null:
		_skip_button.disabled = _seen_at_start.is_empty()

func _on_choices_ready(prompt: String, choices: Array) -> void:
	_mode = "choices"
	_reset_skip_button()
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
	_reset_skip_button()
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

func _on_skip_pressed() -> void:
	if _mode != "line" or _seen_at_start.is_empty():
		return
	_skipping = true
	_skip_button.text = "SKIPPING…"
	_skip_button.disabled = true
	call_deferred("_skip_seen_lines")

## Skips only lines that were already seen before this scene started. New
## Echo lines, choices, and the closing card always stop the skip.
func _skip_seen_lines() -> void:
	if not _skipping:
		return
	var guard := 0
	while _mode == "line" and guard < 300:
		var line_id := String(_current_line.get("id", ""))
		if line_id == "" or not _seen_at_start.has(line_id):
			break
		guard += 1
		service.advance()
	_reset_skip_button()

func _reset_skip_button() -> void:
	_skipping = false
	if _skip_button == null:
		return
	_skip_button.text = "Skip read"
	_skip_button.disabled = _seen_at_start.is_empty() or _mode != "line"

func _leave_story() -> void:
	if RunState.pending_thread != "":
		_leave_side_thread()
		return
	if RunState.day == 9 and phase == "night":
		RunState.complete_phase("night")
		RunState.cycle_complete = true
		RunState.current_screen = "ending"
		RunState.save()
		get_tree().change_scene_to_file("res://src/screens/ending_view.tscn")
		return
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

func _leave_side_thread() -> void:
	var thread_id := RunState.pending_thread
	var data := RunState.side_thread_data(thread_id)
	var encounter := String(data.get("battle", ""))
	if encounter != "":
		RunState.pending_encounter = encounter
		RunState.current_screen = "side_battle"
		RunState.save()
		BattleStore.delete()
		get_tree().change_scene_to_file("res://src/battle/battle_view.tscn")
	else:
		RunState.complete_side_thread(thread_id)
		get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _header_overline() -> String:
	if phase == "side":
		return "AUREL · CYCLE %d · A QUIET THREAD" % RunState.cycle_number
	return "DAY %d · %s" % [RunState.day, phase.to_upper()]

func _on_map_pressed() -> void:
	RunState.clear_pending_story()
	RunState.current_screen = "map"
	RunState.save()
	get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _closing_text() -> String:
	if phase == "side":
		return String(RunState.side_thread_data(RunState.pending_thread).get("closing", "The thread closes. Something small has changed."))
	if RunState.day == 9:
		match phase:
			"morning":
				return "The ninth morning is ending. Below you, Aurel is waiting to find out what it becomes."
			"afternoon":
				return "The Quiet is not a monster. It is a woman who wanted one more day. The Bell is open."
			"night":
				return "The Bell is broken or ringing or gone. Either way, the loop is over."
			_:
				return "The Bell waits."
	if RunState.day == 8:
		return "The Bell chamber is open. The ninth day begins with whatever you choose here."
	if RunState.day == 7:
		return "Vey closes the inner door. Whatever you chose, the sanctuary remembers it."
	if RunState.day == 6:
		return "The street is quiet in the wrong way. One of your friends is still standing at the edge of it."
	if RunState.day == 5:
		match phase:
			"morning":
				return "The Hollow Bellkeeper is already at the door. It has your face."
			"afternoon":
				return "The papers settle. The first Bellkeeper is still alive, and she is the Quiet."
			"night":
				return "The truth is out. What you keep now will survive the reset."
			_:
				return "The Bell waits."
	if RunState.day == 4:
		match phase:
			"morning":
				return "The garden closes around you. At the chapel root, something brass has begun to wake."
			"afternoon":
				return "The Saint's bell heart rings once. The garden holds its breath."
			"night":
				return "Wren is still counting on the roof. What you keep now will survive the reset."
			_:
				return "The Bell waits."
	if RunState.day == 3:
		match phase:
			"morning":
				return "The counterweight hall opens below you. The Ashwright is already waiting."
			"afternoon":
				return "The chains give. The hall begins to fall. There is still a way through."
			"night":
				return "The Choir's offer hangs in the air. What you keep now will survive the reset."
			_:
				return "The Bell waits."
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
	if phase == "side":
		var encounter := String(RunState.side_thread_data(RunState.pending_thread).get("battle", ""))
		return "FACE THE ECHO  ›" if encounter != "" else "RETURN TO THE BELL MAP  ›"
	if RunState.day == 9 and phase == "night":
		return "END THE CYCLE  ›"
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
		"side":
			return Palette.BRASS
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
		"Wren":
			return Palette.BRASS
		"Toma":
			return Palette.PAPER
		"Sera":
			return Palette.EMBER
		"Vey":
			return Palette.HUSH
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
		"Wren":
			return "W"
		"Toma":
			return "T"
		"Sera":
			return "S"
		"Vey":
			return "V"
		_:
			return "◉"

func _background_caption(bg_id: String) -> String:
	var phase_caption := "QUIET THREAD" if phase == "side" else phase.to_upper()
	match bg_id:
		"spire":
			return "THE SPIRE · " + phase_caption
		"ember_row":
			return "EMBER ROW · " + phase_caption
		"checkpoint":
			return "THE WATCH CHECKPOINT · " + phase_caption
		"foundry":
			return "THE FOUNDRY"
		"bellows":
			return "THE BELLOWS"
		"garden":
			return "THE MEMORY GARDENS"
		"clockwork":
			return "THE CLOCKWORK SAINT"
		"roof":
			return "THE SPIRE ROOF · NIGHT"
		"wren_house":
			return "WREN'S HOUSE"
		"quiet":
			return "THE QUIET"
		"sanctuary":
			return "VEY'S SANCTUARY"
		"ash":
			return "THE ASH FIELD"
		"spire_ascent":
			return "THE SPIRE · ASCENT"
		"spire_night":
			return "THE SPIRE · NIGHT"
		_:
			return "AUREL"

func _default_bg() -> String:
	if phase == "side":
		return String(RunState.side_thread_data(RunState.pending_thread).get("bg", "spire"))
	if RunState.day == 9:
		match phase:
			"morning":
				return "spire_ascent"
			"afternoon":
				return "quiet"
			"night":
				return "spire_night"
	if RunState.day == 8:
		match phase:
			"morning":
				return "spire_ascent"
			"afternoon":
				return "clockwork"
			"night":
				return "spire_night"
	if RunState.day == 7:
		match phase:
			"morning":
				return "sanctuary"
			"afternoon":
				return "ash"
			"night":
				return "quiet"
	if RunState.day == 6:
		match phase:
			"morning":
				return "checkpoint"
			"afternoon":
				return "ember_row"
			"night":
				return "quiet"
	if RunState.day == 5:
		match phase:
			"night":
				return "quiet"
			_:
				return "wren_house"
	if RunState.day == 4:
		match phase:
			"morning":
				return "garden"
			"afternoon":
				return "clockwork"
			"night":
				return "roof"
	if RunState.day == 3 and phase == "morning":
		return "bellows"
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
