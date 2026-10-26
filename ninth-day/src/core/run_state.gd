extends Node

## RunState is the single source of truth for the meta layer: day, phase,
## flags, bonds, and the memories Cael keeps between loops.
## The battle simulation never reads this directly; the screen layer passes
## the small number of values the simulation needs.

const SAVE_PATH := "user://ninth_day_run.json"
const PHASES: Array[String] = ["morning", "afternoon", "night"]
const LAST_AUTHORED_DAY := 7
const DAY_PHASES := {
	1: {
		"morning": {"title": "Morning · The Crack", "type": "story · battle · inheritance", "encounter": "tutorial"},
		"afternoon": {"title": "Afternoon · Ember Row", "type": "story · battle · inheritance", "encounter": "ashwright"},
		"night": {"title": "Night · The Spire", "type": "story · choice", "encounter": ""},
	},
	2: {
		"morning": {"title": "Morning · The Checkpoint", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Watch Hound", "type": "story · battle · inheritance", "encounter": "watch_hound"},
		"night": {"title": "Night · A Debt Paid", "type": "story · choice", "encounter": ""},
	},
	3: {
		"morning": {"title": "Morning · Descent", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Counterweights", "type": "story · battle · inheritance", "encounter": "bellows"},
		"night": {"title": "Night · The Choir's Offer", "type": "story · choice", "encounter": ""},
	},
	4: {
		"morning": {"title": "Morning · Saint Orra", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Clockwork Saint", "type": "story · battle · inheritance", "encounter": "clockwork_saint"},
		"night": {"title": "Night · The First Wren", "type": "story · choice", "encounter": ""},
	},
	5: {
		"morning": {"title": "Morning · Wren's House", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Hollow Bellkeeper", "type": "story · battle · inheritance", "encounter": "hollow_bellkeeper"},
		"night": {"title": "Night · The First Crack", "type": "story · choice", "encounter": ""},
	},
	6: {
		"morning": {"title": "Morning · The Coup", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Watch Closes", "type": "story · battle · inheritance", "encounter": "iron_choir"},
		"night": {"title": "Night · The Hollowed", "type": "story · choice", "encounter": ""},
	},
	7: {
		"morning": {"title": "Morning · Vey's Sanctuary", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Offer", "type": "story · optional battle · inheritance", "encounter": "saint_of_ash"},
		"night": {"title": "Night · What Mercy Costs", "type": "story · choice", "encounter": ""},
	},
}

var day: int = 1
var completed: Dictionary = {}
var flags: Dictionary = {}
var seen_lines: Dictionary = {}
var bonds: Dictionary = {}
var inheritances: Array[String] = []
var equipped: Array[String] = []
var pending_phase: String = ""
var current_screen: String = "title"
var day_complete: bool = false

func _ready() -> void:
	load_run()

func has_run() -> bool:
	return FileAccess.file_exists(SAVE_PATH)

func new_cycle() -> void:
	day = 1
	completed.clear()
	flags.clear()
	seen_lines.clear()
	bonds.clear()
	inheritances.clear()
	equipped.clear()
	pending_phase = ""
	current_screen = "title"
	day_complete = false
	save()

func load_run() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return false
	var text := file.get_as_text()
	file.close()
	var data = JSON.parse_string(text)
	if not data is Dictionary:
		return false
	from_dict(data)
	return true

func save() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(to_dict()))
	file.close()

func to_dict() -> Dictionary:
	return {
		"version": 1,
		"day": day,
		"completed": completed.duplicate(),
		"flags": flags.duplicate(),
		"seen_lines": seen_lines.duplicate(),
		"bonds": bonds.duplicate(),
		"inheritances": inheritances.duplicate(),
		"equipped": equipped.duplicate(),
		"pending_phase": pending_phase,
		"current_screen": current_screen,
		"day_complete": day_complete,
	}

func from_dict(data: Dictionary) -> void:
	day = int(data.get("day", 1))
	completed = _string_key_dict(data.get("completed", {}))
	flags = _string_key_dict(data.get("flags", {}))
	seen_lines = _string_key_dict(data.get("seen_lines", {}))
	bonds = _string_key_dict(data.get("bonds", {}))
	inheritances = _string_array(data.get("inheritances", []))
	equipped = _string_array(data.get("equipped", []))
	pending_phase = String(data.get("pending_phase", ""))
	current_screen = String(data.get("current_screen", "title"))
	day_complete = bool(data.get("day_complete", false))

func phase_key(p_day: int, phase: String) -> String:
	return "%d:%s" % [p_day, phase]

func is_phase_completed(p_day: int, phase: String) -> bool:
	return bool(completed.get(phase_key(p_day, phase), false))

func complete_phase(phase: String) -> void:
	completed[phase_key(day, phase)] = true
	if phase == "night":
		day_complete = true
	save()

func advance_day() -> void:
	pending_phase = ""
	current_screen = "map"
	if day < 9:
		day += 1
		day_complete = false
	else:
		day_complete = true
	save()

func is_phase_unlocked(phase: String) -> bool:
	match phase:
		"morning":
			return true
		"afternoon":
			return is_phase_completed(day, "morning")
		"night":
			return is_phase_completed(day, "afternoon")
		_:
			return false

func is_day_unlocked(p_day: int) -> bool:
	if p_day <= 1:
		return true
	return is_phase_completed(p_day - 1, "night")

func next_phase() -> String:
	if not DAY_PHASES.has(day):
		return ""
	for phase in PHASES:
		if not is_phase_completed(day, phase) and is_phase_unlocked(phase):
			return phase
	return ""

func phase_title(phase: String) -> String:
	return phase_title_for(day, phase)

func phase_title_for(p_day: int, phase: String) -> String:
	var data: Dictionary = DAY_PHASES.get(p_day, {}).get(phase, {})
	return String(data.get("title", phase.capitalize()))

func phase_type(phase: String) -> String:
	return phase_type_for(day, phase)

func phase_type_for(p_day: int, phase: String) -> String:
	var data: Dictionary = DAY_PHASES.get(p_day, {}).get(phase, {})
	return String(data.get("type", "story"))

func encounter_for_phase(phase: String) -> StringName:
	if day == 6 and phase == "afternoon":
		return &"sera_vane" if bool(get_flag("allied_rebels", false)) else &"iron_choir"
	if day == 7 and phase == "afternoon":
		return &"" if bool(get_flag("accepted_mercy", false)) else &"saint_of_ash"
	return StringName(phase_data(day, phase).get("encounter", ""))

func phase_data(p_day: int, phase: String) -> Dictionary:
	return DAY_PHASES.get(p_day, {}).get(phase, {})

func set_flag(flag_id: String, value: Variant = true) -> void:
	flags[flag_id] = value
	save()

func get_flag(flag_id: String, fallback: Variant = false) -> Variant:
	return flags.get(flag_id, fallback)

func mark_seen(line_id: String) -> void:
	seen_lines[line_id] = true

func add_bond(bond_id: String, amount: int = 1) -> void:
	bonds[bond_id] = int(bonds.get(bond_id, 0)) + amount
	save()

func bond_rank(bond_id: String) -> int:
	return int(bonds.get(bond_id, 0))

func add_inheritance(inheritance_id: String) -> void:
	if inheritance_id == "":
		return
	if not inheritance_id in inheritances:
		inheritances.append(inheritance_id)
	if equipped.size() < 6 and not inheritance_id in equipped:
		equipped.append(inheritance_id)
	save()

func has_inheritance(inheritance_id: String) -> bool:
	return inheritance_id in inheritances

func battle_modifiers() -> Dictionary:
	return InheritanceDB.modifiers(equipped)

func _string_key_dict(value: Variant) -> Dictionary:
	var out: Dictionary = {}
	if value is Dictionary:
		for key in value.keys():
			out[String(key)] = value[key]
	return out

func _string_array(value: Variant) -> Array[String]:
	var out: Array[String] = []
	if value is Array:
		for item in value:
			out.append(String(item))
	return out
