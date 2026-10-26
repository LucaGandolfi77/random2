extends Control

## Greybox portrait battle view for the Echo Track prototype.
## All rules live in BattleSim; this script only renders and forwards commands.

const BG := Color("0b0a0e")
const PAPER := Color("e8dcc7")
const BRASS := Color("c9a46b")
const EMBER := Color("d96b4a")
const HUSH := Color("8da7c9")
const BELL := Color("e9c46a")
const MUTED := Color("8a8175")
const DANGER := Color("c05a5a")

var sim: BattleSim
var _selected_target_id: StringName = &""
var _pending_kind: String = ""
var _pending_id: StringName = &""
var _pending_index: int = -1
var _resumed: bool = false
var _persist: bool = true
var _encounter: StringName = &"full"

var _round_label: Label
var _context_label: Label
var _enemy_box: VBoxContainer
var _echo_box: HBoxContainer
var _echo_status_label: Label
var _resonance_label: Label
var _chord_button: Button
var _party_box: VBoxContainer
var _actor_label: Label
var _action_grid: GridContainer
var _preview_box: VBoxContainer
var _preview_label: Label
var _confirm_button: Button
var _cancel_button: Button
var _enemy_button: Button
var _result_label: Label
var _restart_button: Button
var _result_button: Button
var _log: RichTextLabel

func _ready() -> void:
	_persist = OS.get_cmdline_user_args().is_empty()
	sim = BattleSim.new()
	if _persist:
		_resumed = BattleStore.load_into(sim)
	if not _resumed:
		_encounter = &"full"
		if RunState.pending_phase != "":
			_encounter = RunState.encounter_for_phase(RunState.pending_phase)
		sim.start(424242, _encounter)
		sim.apply_modifiers(RunState.battle_modifiers())
	else:
		_encounter = sim.encounter_id
	_build_ui()
	_refresh()

func _build_ui() -> void:
	var background := ColorRect.new()
	background.color = BG
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(margin)
	Ui.apply_safe_area(margin, 14, 14, 12, 12)

	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 7)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_child(root)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 8)
	root.add_child(header)
	header.add_child(_label("NINTH DAY", 20, BRASS))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(spacer)
	_round_label = _label("Round 1", 13, MUTED)
	header.add_child(_round_label)

	if RunState.pending_phase != "":
		_context_label = _label("DAY %d · %s" % [RunState.day, RunState.pending_phase.to_upper()], 10, BRASS)
		root.add_child(_context_label)

	root.add_child(_separator())
	root.add_child(_section_label("ENEMIES · tap to target"))
	_enemy_box = VBoxContainer.new()
	_enemy_box.add_theme_constant_override("separation", 4)
	root.add_child(_enemy_box)

	root.add_child(_section_label("ECHO TRACK · replay one action per battle"))
	_echo_box = HBoxContainer.new()
	_echo_box.add_theme_constant_override("separation", 6)
	root.add_child(_echo_box)
	_echo_status_label = _label("", 12, MUTED)
	root.add_child(_echo_status_label)

	var resonance_row := HBoxContainer.new()
	resonance_row.add_theme_constant_override("separation", 8)
	root.add_child(resonance_row)
	_resonance_label = _label("Resonance 0/3", 13, BELL)
	resonance_row.add_child(_resonance_label)
	var resonance_spacer := Control.new()
	resonance_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	resonance_row.add_child(resonance_spacer)
	_chord_button = Button.new()
	_chord_button.text = "Chord: The Ninth Toll"
	_chord_button.custom_minimum_size = Vector2(180, 40)
	_chord_button.pressed.connect(_on_chord_pressed)
	resonance_row.add_child(_chord_button)

	root.add_child(_section_label("PARTY"))
	_party_box = VBoxContainer.new()
	_party_box.add_theme_constant_override("separation", 2)
	root.add_child(_party_box)

	root.add_child(_separator())
	_actor_label = _label("Cael's turn", 15, PAPER)
	root.add_child(_actor_label)
	_action_grid = GridContainer.new()
	_action_grid.columns = 2
	_action_grid.add_theme_constant_override("h_separation", 6)
	_action_grid.add_theme_constant_override("v_separation", 6)
	root.add_child(_action_grid)

	_preview_box = VBoxContainer.new()
	_preview_box.add_theme_constant_override("separation", 4)
	_preview_box.visible = false
	root.add_child(_preview_box)
	_preview_label = _label("", 12, PAPER)
	_preview_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_preview_box.add_child(_preview_label)
	var preview_buttons := HBoxContainer.new()
	preview_buttons.add_theme_constant_override("separation", 6)
	_preview_box.add_child(preview_buttons)
	_confirm_button = Button.new()
	_confirm_button.text = "Confirm"
	_confirm_button.custom_minimum_size = Vector2(0, 50)
	_confirm_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_confirm_button.pressed.connect(_on_confirm_pressed)
	preview_buttons.add_child(_confirm_button)
	_cancel_button = Button.new()
	_cancel_button.text = "Cancel"
	_cancel_button.custom_minimum_size = Vector2(0, 50)
	_cancel_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_cancel_button.pressed.connect(_on_cancel_pressed)
	preview_buttons.add_child(_cancel_button)

	_enemy_button = Button.new()
	_enemy_button.text = "Resolve enemy turn"
	_enemy_button.custom_minimum_size = Vector2(0, 52)
	_enemy_button.visible = false
	_enemy_button.pressed.connect(_on_enemy_turn_pressed)
	root.add_child(_enemy_button)

	_result_label = _label("", 20, BELL)
	_result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result_label.visible = false
	root.add_child(_result_label)
	_restart_button = Button.new()
	_restart_button.text = "Restart battle"
	_restart_button.custom_minimum_size = Vector2(0, 50)
	_restart_button.visible = false
	_restart_button.pressed.connect(_on_restart_pressed)
	root.add_child(_restart_button)

	_result_button = Button.new()
	_result_button.text = "Continue"
	_result_button.custom_minimum_size = Vector2(0, 50)
	_result_button.visible = false
	_result_button.pressed.connect(_on_result_pressed)
	root.add_child(_result_button)

	root.add_child(_separator())
	root.add_child(_section_label("LOG"))
	_log = RichTextLabel.new()
	_log.bbcode_enabled = false
	_log.scroll_following = true
	_log.custom_minimum_size = Vector2(0, 150)
	_log.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_log.add_theme_font_size_override("normal_font_size", 12)
	root.add_child(_log)

	var footer := _label("Greybox prototype · autosave · Echo once per battle", 10, MUTED)
	root.add_child(footer)

func _refresh() -> void:
	# Keep a valid target selected before rebuilding the enemy list.
	var living := sim.living_enemies()
	if living.is_empty():
		_selected_target_id = &""
	elif _find_enemy(_selected_target_id) == null or not _find_enemy(_selected_target_id).is_alive():
		_selected_target_id = living[0].id

	_round_label.text = "Round %d · %s" % [sim.round_number, _phase_text()]
	if sim.is_finished():
		_actor_label.text = "The Bell is quiet."
	else:
		var actor := sim.current_actor()
		if actor == null:
			_actor_label.text = "..."
		elif actor.side == BattleTypes.Side.PLAYER:
			_actor_label.text = "%s's turn · %s" % [actor.display_name, BattleTypes.tone_name(actor.tone)]
		else:
			_actor_label.text = "Enemy turn · %s" % actor.display_name

	_rebuild_enemies()
	_rebuild_echo()
	_rebuild_party()
	_rebuild_actions()
	_rebuild_preview()
	_update_log()

	_resonance_label.text = "Resonance %d/3%s" % [sim.resonance, " · CHORD READY" if sim.chord_ready else ""]
	_resonance_label.add_theme_color_override("font_color", BELL if sim.chord_ready else MUTED)
	_chord_button.disabled = not sim.chord_ready or not sim.is_player_turn()
	_chord_button.visible = sim.chord_ready and not sim.is_finished()

	_enemy_button.visible = sim.is_enemy_turn()
	_result_label.visible = sim.is_finished()
	_result_button.visible = sim.is_finished()
	_restart_button.visible = sim.phase == "defeat"
	if sim.phase == "victory":
		if sim.encounter_id == &"clockwork_saint":
			_result_label.text = "THE SAINT WITHDRAWS."
		else:
			_result_label.text = "VICTORY — the song breaks."
		_result_label.add_theme_color_override("font_color", BELL)
		_result_button.text = "BELL REST  ›"
	elif sim.phase == "defeat":
		_result_label.text = "DEFEAT — the Bell catches you."
		_result_label.add_theme_color_override("font_color", DANGER)
		_result_button.text = "RETURN TO THE BELL MAP"

	if _persist:
		if sim.is_finished():
			BattleStore.delete()
			RunState.current_screen = "bell_rest" if sim.phase == "victory" else "map"
			RunState.save()
		elif sim.is_player_turn():
			BattleStore.save(sim)

func _rebuild_enemies() -> void:
	_clear(_enemy_box)
	for enemy in sim.enemies:
		var b := Button.new()
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(0, 50)
		b.autowrap_mode = TextServer.AUTOWRAP_OFF
		b.clip_text = true
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var marker := "▶ " if _selected_target_id == enemy.id else "   "
		var status := (" · " + enemy.status_text()) if not enemy.statuses.is_empty() else ""
		var boss := " · BOSS" if enemy.is_boss else ""
		var intent := ""
		if enemy.intent_action != &"":
			var intent_action := _find_action_for(enemy, enemy.intent_action)
			if intent_action != null:
				intent = "\n    ↳ %s" % intent_action.display_name
				var intent_target := _display_name_for(enemy.intent_target)
				if intent_target != "":
					intent += " → %s" % intent_target
		if enemy.is_alive():
			b.text = "%s%s — %d/%d — %s%s%s%s" % [marker, enemy.display_name, enemy.hp, enemy.max_hp, BattleTypes.tone_name(enemy.tone), boss, status, intent]
			b.custom_minimum_size = Vector2(0, 62 if intent != "" else 50)
			b.add_theme_color_override("font_color", _tone_color(enemy.tone))
			b.pressed.connect(_on_target_pressed.bind(enemy.id))
		else:
			b.text = "   %s — fallen" % enemy.display_name
			b.disabled = true
			b.add_theme_color_override("font_color", MUTED)
		_enemy_box.add_child(b)

func _rebuild_echo() -> void:
	_clear(_echo_box)
	var capacity := sim.echo_track.capacity if sim.echo_track != null else 3
	for i in capacity:
		var record: ActionRecord = sim.echo_track.get_record(i)
		var b := Button.new()
		b.custom_minimum_size = Vector2(0, 54)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		if record == null:
			b.text = "empty"
			b.disabled = true
			b.add_theme_color_override("font_color", MUTED)
		else:
			b.text = record.label()
			b.tooltip_text = "Replay this action for 0 Resolve. Once per battle."
			var can := sim.player_echo_available and record.can_replay() and sim.is_player_turn()
			b.disabled = not can
			b.add_theme_color_override("font_color", _tone_color(record.tone))
			if can:
				b.pressed.connect(_on_echo_pressed.bind(i))
		_echo_box.add_child(b)
	_echo_status_label.text = "Echo %s · %s" % [
		"READY" if sim.player_echo_available else "USED",
		"tap a card to replay it" if sim.player_echo_available else "the Bell has already answered once",
	]

func _rebuild_party() -> void:
	_clear(_party_box)
	for actor in sim.party:
		var text := "%s  %d/%d HP  ·  %d/%d Res  ·  %s" % [
			actor.display_name, actor.hp, actor.max_hp, actor.resolve, actor.max_resolve,
			BattleTypes.tone_name(actor.tone),
		]
		if not actor.statuses.is_empty():
			text += "  ·  " + actor.status_text()
		if actor.guarding:
			text += "  ·  guarding"
		var l := _label(text, 12, PAPER if actor.is_alive() else MUTED)
		_party_box.add_child(l)

func _rebuild_actions() -> void:
	_clear(_action_grid)
	if sim.is_finished():
		_action_grid.add_child(_label("The loop is waiting.", 13, MUTED))
		return
	if not sim.is_player_turn():
		_action_grid.add_child(_label("Enemy actions resolve below.", 13, MUTED))
		return
	var actor := sim.current_actor()
	if actor == null:
		return
	for action in actor.actions:
		var b := Button.new()
		b.text = action.label()
		b.tooltip_text = action.description
		b.custom_minimum_size = Vector2(0, 54)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.disabled = actor.resolve < action.cost
		b.pressed.connect(_on_action_pressed.bind(action.id))
		_action_grid.add_child(b)
	var guard := Button.new()
	guard.text = "Guard · +1 Resolve · -50% damage"
	guard.custom_minimum_size = Vector2(0, 54)
	guard.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	guard.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	guard.pressed.connect(_on_guard_pressed)
	_action_grid.add_child(guard)

func _rebuild_preview() -> void:
	_preview_box.visible = false
	if _pending_kind == "":
		return
	if not sim.is_player_turn():
		_clear_pending()
		return
	var preview := _pending_preview()
	if preview.is_empty():
		_clear_pending()
		return
	var tone_name := BattleTypes.tone_name(int(preview.get("tone", BattleTypes.Tone.BELL)))
	var lines: Array[String] = []
	lines.append("%s · %s" % [tone_name, String(preview.get("label", "Action"))])
	for row in preview.get("targets", []):
		var bits: Array[String] = []
		var damage := int(row.get("damage", 0))
		var heal := int(row.get("heal", 0))
		if damage > 0:
			bits.append("%d damage" % damage)
			if bool(row.get("counter", false)):
				bits.append("counter +25%")
			if bool(row.get("marked", false)):
				bits.append("marked +20%")
			if bool(row.get("lethal", false)):
				bits.append("LETHAL")
			bits.append("HP %d → %d" % [int(row.get("hp", 0)), int(row.get("hp_after", 0))])
		if heal > 0:
			bits.append("heal %d" % heal)
		if bits.is_empty():
			bits.append("no direct effect")
		lines.append("%s: %s" % [String(row.get("name", "?")), ", ".join(bits)])
	var status_id := String(preview.get("status_id", ""))
	if status_id != "":
		lines.append("Applies %s for %d round(s)." % [status_id.capitalize(), int(preview.get("status_duration", 0))])
	var cost := int(preview.get("cost", 0))
	if cost > 0:
		lines.append("Costs %d Resolve." % cost)
	var resonance_note := String(preview.get("resonance_note", ""))
	if resonance_note != "":
		lines.append(resonance_note + ".")
	if not bool(preview.get("allowed", false)):
		lines.append("⚠ " + String(preview.get("reason", "Cannot use this.")))
	_preview_label.text = "\n".join(lines)
	_preview_label.add_theme_color_override("font_color", DANGER if not bool(preview.get("allowed", false)) else PAPER)
	_confirm_button.disabled = not bool(preview.get("allowed", false))
	_preview_box.visible = true

func _pending_preview() -> Dictionary:
	if _pending_kind == "action":
		return sim.preview_action(_pending_id, _selected_target_id)
	if _pending_kind == "echo":
		return sim.preview_replay(_pending_index, _selected_target_id)
	return {}

func _clear_pending() -> void:
	_pending_kind = ""
	_pending_id = &""
	_pending_index = -1

func _update_log() -> void:
	var start := maxi(0, sim.log_lines.size() - 14)
	var recent: Array[String] = []
	for i in range(start, sim.log_lines.size()):
		recent.append(sim.log_lines[i])
	_log.text = "\n".join(recent)

func _phase_text() -> String:
	match sim.phase:
		"player":
			return "party turn"
		"enemy":
			return "enemy turn"
		"victory":
			return "victory"
		"defeat":
			return "defeat"
		_:
			return sim.phase

func _on_target_pressed(target_id: StringName) -> void:
	_selected_target_id = target_id
	_refresh()

func _on_action_pressed(action_id: StringName) -> void:
	_pending_kind = "action"
	_pending_id = action_id
	_pending_index = -1
	_refresh()

func _on_echo_pressed(index: int) -> void:
	_pending_kind = "echo"
	_pending_id = &""
	_pending_index = index
	_refresh()

func _on_confirm_pressed() -> void:
	if _pending_kind == "action":
		sim.use_action(_pending_id, _selected_target_id)
	elif _pending_kind == "echo":
		sim.replay(_pending_index, _selected_target_id)
	_clear_pending()
	_refresh()

func _on_cancel_pressed() -> void:
	_clear_pending()
	_refresh()

func _on_guard_pressed() -> void:
	_clear_pending()
	sim.use_guard()
	_refresh()

func _on_chord_pressed() -> void:
	_clear_pending()
	sim.use_chord()
	_refresh()

func _on_enemy_turn_pressed() -> void:
	_clear_pending()
	var safety := 0
	while sim.is_enemy_turn() and safety < 10:
		sim.enemy_act()
		safety += 1
	_refresh()

func _on_restart_pressed() -> void:
	if _persist:
		BattleStore.delete()
	sim = BattleSim.new()
	sim.start(424242, _encounter)
	sim.apply_modifiers(RunState.battle_modifiers())
	_selected_target_id = &""
	_clear_pending()
	_refresh()

func _on_result_pressed() -> void:
	if sim.phase == "victory":
		RunState.save()
		get_tree().change_scene_to_file("res://src/screens/bell_rest.tscn")
	else:
		get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _find_enemy(enemy_id: StringName) -> BattleActor:
	for enemy in sim.enemies:
		if enemy.id == enemy_id:
			return enemy
	return null

func _find_action_for(actor: BattleActor, action_id: StringName) -> BattleAction:
	for action in actor.actions:
		if action.id == action_id:
			return action
	return null

func _display_name_for(actor_id: StringName) -> String:
	var actor := _find_enemy(actor_id)
	if actor == null:
		for member in sim.party:
			if member.id == actor_id:
				actor = member
				break
	return actor.display_name if actor != null else ""

func _tone_color(tone: int) -> Color:
	match tone:
		BattleTypes.Tone.BELL:
			return BELL
		BattleTypes.Tone.EMBER:
			return EMBER
		BattleTypes.Tone.HUSH:
			return HUSH
		_:
			return PAPER

func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_OFF
	return l

func _section_label(text: String) -> Label:
	var l := _label(text, 11, BRASS)
	l.add_theme_constant_override("outline_size", 0)
	return l

func _separator() -> HSeparator:
	var s := HSeparator.new()
	s.add_theme_constant_override("separation", 2)
	return s

func _clear(container: Node) -> void:
	for child in container.get_children():
		container.remove_child(child)
		child.queue_free()
