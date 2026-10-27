extends Control

## The Journal is Cael's record of the loop: a recap of the last phase,
## bond ranks, carried memories, and the lore that has been unlocked.

var tab: String = "recap"

var _body_box: VBoxContainer
var _tab_buttons: Dictionary = {}

func _ready() -> void:
	Ui.add_backdrop(self, Palette.BRASS)
	var margin := Ui.screen_margin(self, 26, 20)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 10)
	margin.add_child(outer)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 10)
	outer.add_child(header)
	var title_box := VBoxContainer.new()
	title_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_box.add_theme_constant_override("separation", 1)
	header.add_child(title_box)
	title_box.add_child(Ui.overline("AUREL · CYCLE %d · DAY %d" % [RunState.cycle_number, RunState.day]))
	title_box.add_child(Ui.heading("The Journal"))
	var close := Ui.button("Back", 48)
	close.custom_minimum_size = Vector2(78, 48)
	close.autowrap_mode = TextServer.AUTOWRAP_OFF
	close.add_theme_color_override("font_color", Palette.MUTED)
	close.pressed.connect(_on_close_pressed)
	header.add_child(close)

	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 6)
	outer.add_child(tabs)
	for tab_id in ["recap", "bonds", "memories", "lore"]:
		var button := Ui.button(tab_id.to_upper(), 42)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size", 11)
		button.pressed.connect(_on_tab_pressed.bind(tab_id))
		tabs.add_child(button)
		_tab_buttons[tab_id] = button

	outer.add_child(Ui.rule())

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	outer.add_child(scroll)
	_body_box = VBoxContainer.new()
	_body_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body_box.add_theme_constant_override("separation", 12)
	scroll.add_child(_body_box)

	_rebuild()

func _on_tab_pressed(tab_id: String) -> void:
	tab = tab_id
	_rebuild()

func _rebuild() -> void:
	for child in _body_box.get_children():
		_body_box.remove_child(child)
		child.queue_free()
	for tab_id in _tab_buttons.keys():
		var button: Button = _tab_buttons[tab_id]
		button.add_theme_color_override("font_color", Palette.BELL if tab_id == tab else Palette.MUTED)
	match tab:
		"bonds":
			_build_bonds()
		"memories":
			_build_memories()
		"lore":
			_build_lore()
		_:
			_build_recap()

func _build_recap() -> void:
	_body_box.add_child(Ui.overline("PREVIOUSLY"))
	var entry := JournalDB.last_entry()
	if entry.is_empty():
		_body_box.add_child(Ui.label("Nothing has been written yet. The first page is waiting.", 14, Palette.PAPER_DIM, true))
	else:
		var panel := PanelContainer.new()
		panel.add_theme_stylebox_override("panel", Ui.panel_style(Palette.PANEL, Palette.LINE))
		_body_box.add_child(panel)
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 6)
		panel.add_child(box)
		box.add_child(Ui.label("DAY %d · %s" % [int(entry.get("day", 1)), String(entry.get("title", "Aurel")).to_upper()], 11, Palette.BRASS))
		box.add_child(Ui.label(String(entry.get("line", "")), 16, Palette.PAPER, true))
		var detail := String(entry.get("detail", ""))
		if detail != "":
			box.add_child(Ui.label(detail, 13, Palette.PAPER_DIM, true))

	_body_box.add_child(Ui.rule())
	var next_phase := RunState.next_phase()
	if next_phase != "":
		_body_box.add_child(Ui.label("NEXT · Day %d · %s" % [RunState.day, RunState.phase_title(next_phase)], 13, Palette.BELL, true))
	else:
		_body_box.add_child(Ui.label("NEXT · the Bell is waiting.", 13, Palette.MUTED, true))

	var available: Array[String] = []
	for thread_id in RunState.side_thread_ids():
		if RunState.side_thread_available(thread_id):
			available.append(String(RunState.side_thread_data(thread_id).get("name", thread_id)))
	if not available.is_empty():
		_body_box.add_child(Ui.label("OPTIONAL · " + " · ".join(available), 12, Palette.PAPER_DIM, true))

	var threads_done := 0
	for thread_id in RunState.side_thread_ids():
		if RunState.is_side_thread_complete(thread_id):
			threads_done += 1
	_body_box.add_child(Ui.label("Cycle %d · %d phases written · %d optional scene%s · %d memories · %d lore entries" % [
		RunState.cycle_number,
		RunState.completed.size(),
		threads_done,
		"" if threads_done == 1 else "s",
		RunState.inheritances.size(),
		JournalDB.glossary().size(),
	], 12, Palette.PAPER_DIM, true))

	if RunState.true_ending_ready():
		_body_box.add_child(Ui.label("The hidden bell is with you. All six bonds are held. The true ending is open.", 12, Palette.BELL, true))
	elif RunState.true_ending_seen:
		_body_box.add_child(Ui.label("The true ending has been found. The city remembers.", 12, Palette.BELL, true))

func _build_bonds() -> void:
	_body_box.add_child(Ui.label("Bonds survive the Bell. Rank 3 is the deepest a bond can be carried.", 13, Palette.PAPER_DIM, true))
	for bond_id in RunState.BOND_IDS:
		var rank := RunState.bond_rank(bond_id)
		var pips: Array[String] = []
		for i in RunState.BOND_MAX:
			pips.append("●" if i < rank else "○")
		var thread := "%s quiet thread" % bond_id.capitalize()
		if bond_id in RunState.SIDE_THREADS and RunState.is_side_thread_complete(bond_id):
			thread = "Quiet thread kept · " + String(RunState.side_thread_data(bond_id).get("name", ""))
		else:
			thread = "Quiet thread not yet taken"
		var row := PanelContainer.new()
		row.add_theme_stylebox_override("panel", Ui.panel_style(Palette.PANEL, Palette.LINE))
		_body_box.add_child(row)
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 3)
		row.add_child(box)
		box.add_child(Ui.label("%s   %s" % [bond_id.to_upper(), " ".join(pips)], 16, Palette.BRASS))
		box.add_child(Ui.label(thread, 11, Palette.MUTED))
	if RunState.all_bonds_maxed():
		_body_box.add_child(Ui.label("All six bonds are at rank 3.", 12, Palette.BELL, true))

func _build_memories() -> void:
	_body_box.add_child(Ui.label("%d memories kept · %d equipped of 6 slots." % [RunState.inheritances.size(), RunState.equipped.size()], 13, Palette.PAPER_DIM, true))
	if RunState.inheritances.is_empty():
		_body_box.add_child(Ui.label("The archive is empty. Bell Rest will offer the first memory.", 14, Palette.MUTED, true))
		return
	for card_id in RunState.inheritances:
		var card := InheritanceDB.card(card_id)
		if card.is_empty():
			continue
		var equipped := card_id in RunState.equipped
		var panel := PanelContainer.new()
		panel.add_theme_stylebox_override("panel", Ui.panel_style(Palette.BG_RAISED if equipped else Palette.PANEL, Palette.BELL if equipped else Palette.LINE))
		_body_box.add_child(panel)
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 4)
		panel.add_child(box)
		box.add_child(Ui.label(("◆  " if equipped else "·  ") + String(card.get("name", card_id)), 15, Palette.BELL if equipped else Palette.PAPER))
		box.add_child(Ui.label(String(card.get("type", "Memory")).to_upper() + " · " + String(card.get("effect", "")), 11, Palette.BRASS))
		box.add_child(Ui.label(String(card.get("description", "")), 12, Palette.PAPER_DIM, true))

func _build_lore() -> void:
	var entries := JournalDB.glossary()
	_body_box.add_child(Ui.label("%d of %d entries recovered." % [entries.size(), JournalDB.glossary_total()], 13, Palette.PAPER_DIM, true))
	for entry in entries:
		var panel := PanelContainer.new()
		panel.add_theme_stylebox_override("panel", Ui.panel_style(Palette.PANEL, Palette.LINE))
		_body_box.add_child(panel)
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 4)
		panel.add_child(box)
		box.add_child(Ui.label(String(entry.get("title", "Untitled")).to_upper(), 12, Palette.BRASS))
		box.add_child(Ui.label(String(entry.get("body", "")), 13, Palette.PAPER_DIM, true))
	var locked := JournalDB.glossary_total() - entries.size()
	if locked > 0:
		_body_box.add_child(Ui.label("%d entries remain unwritten. Keep choosing what to remember." % locked, 11, Palette.MUTED, true))

func _on_close_pressed() -> void:
	var target := RunState.journal_return
	RunState.current_screen = target
	RunState.save()
	if target == "title":
		get_tree().change_scene_to_file("res://src/screens/title.tscn")
	else:
		get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")
