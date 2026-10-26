extends Control

const BOND_IDS: Array[String] = ["mara", "iven", "wren", "oria", "toma", "vey"]

func _ready() -> void:
	Ui.add_backdrop(self, _ending_tint())
	var margin := Ui.screen_margin(self, 28, 22)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 12)
	margin.add_child(outer)

	var data := _ending_data()
	outer.add_child(Ui.overline("AUREL · THE NINTH DAY"))
	var title := Ui.label(String(data["title"]), 34, Palette.BRASS)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	outer.add_child(title)
	outer.add_child(Ui.label(String(data["subtitle"]), 12, Palette.MUTED))
	outer.add_child(Ui.rule())

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	outer.add_child(scroll)
	var body_box := VBoxContainer.new()
	body_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_box.add_theme_constant_override("separation", 14)
	scroll.add_child(body_box)

	var body_panel := PanelContainer.new()
	body_panel.add_theme_stylebox_override("panel", Ui.panel_style(Palette.PANEL, Palette.LINE))
	body_box.add_child(body_panel)
	var body := Ui.label(String(data["body"]), 16, Palette.PAPER, true)
	body_panel.add_child(body)

	var summary := Ui.label(_summary_text(), 13, Palette.PAPER_DIM, true)
	body_box.add_child(summary)
	var bonds := Ui.label(_bonds_text(), 13, Palette.MUTED, true)
	body_box.add_child(bonds)
	if bool(data.get("true", false)):
		var true_label := Ui.label("TRUE ENDING · ALL SIX BONDS AT RANK 3 · THE HIDDEN BELL", 11, Palette.BELL, true)
		body_box.add_child(true_label)

	var new_cycle := Ui.button("BEGIN A NEW CYCLE", 54, Palette.BELL)
	new_cycle.add_theme_font_size_override("font_size", 16)
	new_cycle.pressed.connect(_on_new_cycle)
	outer.add_child(new_cycle)
	var title_button := Ui.button("Return to title", 46)
	title_button.add_theme_color_override("font_color", Palette.MUTED)
	title_button.pressed.connect(_on_title)
	outer.add_child(title_button)

func _ending_data() -> Dictionary:
	var ring: bool = bool(RunState.get_flag("ending_ring", false))
	var break_bell: bool = bool(RunState.get_flag("ending_break", false))
	var become: bool = bool(RunState.get_flag("ending_become", false))
	var hidden_bell: bool = bool(RunState.get_flag("has_hidden_bell", false))
	if break_bell and hidden_bell and _all_bonds_maxed():
		return {
			"title": "THE NINTH DAY",
			"subtitle": "TRUE ENDING",
			"true": true,
			"body": "Cael breaks the Bell, and the hidden bell answers.\n\nEvery loop pours back into Aurel at once: the burned mornings, the unpaid debts, the names in the garden, the friends who were hollowed and the friends who came back. The city remembers all of it.\n\nThen the memories settle. People keep what they can carry and let the rest go. The Bell is quiet. Time moves forward.\n\nOn the ninth day, Aurel is allowed to be ordinary.",
		}
	if become:
		return {
			"title": "BECOME THE BELL",
			"subtitle": "ENDING · THE WITNESS",
			"true": false,
			"body": "Cael steps into the Bell. The dark accepts them the way a held breath accepts the next one.\n\nAurel remembers everything now: every loop, every version of every person, every morning Cael refused to let go. The city is held together by a Bellkeeper who is no longer a person.\n\nWren still counts on the roof. Mara still listens for a voice in the brass. The city survives, and Cael is the thing that holds it.",
		}
	if break_bell:
		return {
			"title": "BREAK THE BELL",
			"subtitle": "ENDING · THE OPEN ROAD",
			"true": false,
			"body": "The Bell breaks. Time moves forward.\n\nThe Quiet takes much of Aurel's memory with it. People wake in a city they only half know. Some names are gone. Some doors lead nowhere. The past is a wound the city will have to grow around.\n\nBut the morning after is real. No one knows what tomorrow will bring. For the first time in a long time, that is not a threat.",
		}
	if ring:
		return {
			"title": "RING THE BELL",
			"subtitle": "ENDING · THE NEXT KEEPER",
			"true": false,
			"body": "Cael rings the Bell. Aurel survives.\n\nThe crack closes. The city forgets the ninth day, and the eight before it, and the Bellkeeper who carried them. Cael becomes the next keeper of the loop, standing where the first Bellkeeper stood.\n\nThe Bell is whole. The city is safe. Somewhere below, a new morning begins, and no one remembers that it has happened before.",
		}
	return {
		"title": "THE BELL WAITS",
		"subtitle": "UNRESOLVED",
		"true": false,
		"body": "The ninth day ends without an answer. The Bell waits for the next loop, and the next keeper, and the choice that has not been made.",
	}

func _all_bonds_maxed() -> bool:
	for bond_id in BOND_IDS:
		if RunState.bond_rank(bond_id) < 3:
			return false
	return true

func _summary_text() -> String:
	return "Cycle: Day %d · %d phases completed · %d memories kept · %d equipped" % [
		RunState.day,
		RunState.completed.size(),
		RunState.inheritances.size(),
		RunState.equipped.size(),
	]

func _bonds_text() -> String:
	var parts: Array[String] = []
	for bond_id in BOND_IDS:
		parts.append("%s %d" % [bond_id.capitalize(), RunState.bond_rank(bond_id)])
	return "Bonds · " + " · ".join(parts)

func _ending_tint() -> Color:
	if RunState.get_flag("ending_break", false) and RunState.get_flag("has_hidden_bell", false) and _all_bonds_maxed():
		return Palette.BELL
	if RunState.get_flag("ending_become", false):
		return Palette.HUSH
	if RunState.get_flag("ending_break", false):
		return Palette.EMBER
	return Palette.BRASS

func _on_new_cycle() -> void:
	RunState.new_cycle()
	BattleStore.delete()
	get_tree().change_scene_to_file("res://src/screens/bell_map.tscn")

func _on_title() -> void:
	get_tree().change_scene_to_file("res://src/screens/title.tscn")
